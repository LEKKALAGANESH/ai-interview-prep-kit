export type LlmGenerateRequest = {
  systemInstruction: string;
  userPrompt: string;
};

export interface LlmProvider {
  generate(request: LlmGenerateRequest): Promise<unknown>;
}

export type LlmProviderName = "gemini" | "openai" | "anthropic" | "groq" | "ollama";

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

export type LlmProviderErrorCode = "CONFIGURATION" | "RATE_LIMITED" | "TRANSIENT" | "INVALID_RESPONSE";

export class LlmProviderError extends Error {
  constructor(
    public readonly code: LlmProviderErrorCode,
    message: string,
    public readonly details?: { provider?: string; status?: number; endpoint?: string; model?: string; upstream_message?: string },
  ) {
    super(message);
    this.name = "LlmProviderError";
  }
}

const DEFAULT_LLM_TIMEOUT_MS = 60_000;

async function readJson(response: Response, provider: string): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    throw new LlmProviderError("INVALID_RESPONSE", `${provider} returned invalid JSON`);
  }
}

function extractUpstreamMessage(payload: Record<string, unknown>): string | undefined {
  const error = payload.error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && typeof (error as Record<string, unknown>).message === "string") return (error as Record<string, string>).message;
  return typeof payload.message === "string" ? payload.message : undefined;
}

function classifyHttp(status: number, provider: string, endpoint: string, model: string, upstreamMessage?: string): never {
  const suffix = upstreamMessage ? `: ${upstreamMessage}` : "";
  if (status === 401 || status === 403) throw new LlmProviderError("CONFIGURATION", `${provider} authentication/authorization failed (HTTP ${status})${suffix}`, {provider,status,endpoint,model,upstream_message:upstreamMessage});
  if (status === 404) throw new LlmProviderError("CONFIGURATION", `${provider} endpoint or model was not found (HTTP 404). Check the configured endpoint/model${suffix}`, {provider,status,endpoint,model,upstream_message:upstreamMessage});
  if (status === 429) throw new LlmProviderError("RATE_LIMITED", `${provider} rate limit reached${suffix}`, {provider,status,endpoint,model,upstream_message:upstreamMessage});
  if (status >= 500) throw new LlmProviderError("TRANSIENT", `${provider} returned HTTP ${status}${suffix}`, {provider,status,endpoint,model,upstream_message:upstreamMessage});
  throw new LlmProviderError("CONFIGURATION", `${provider} returned HTTP ${status}${suffix}`, {provider,status,endpoint,model,upstream_message:upstreamMessage});
}

async function requestJson(
  endpoint: string,
  init: RequestInit,
  provider: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
  model = "",
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetchImpl(endpoint, { ...init, signal: controller.signal });
  } catch (error) {
    throw new LlmProviderError(
      "TRANSIENT",
      error instanceof Error && error.name === "AbortError"
        ? `${provider} request timed out after ${timeoutMs}ms`
        : error instanceof Error ? error.message : `${provider} request failed`,
    );
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    let upstreamMessage: string | undefined;
    try { upstreamMessage = extractUpstreamMessage((await response.clone().json()) as Record<string, unknown>); } catch {}
    classifyHttp(response.status, provider, endpoint, model, upstreamMessage);
  }
  return readJson(response, provider);
}

function parseJsonText(text: string, provider: string): unknown {
  try {
    return JSON.parse(text.trim()) as unknown;
  } catch {
    throw new LlmProviderError("INVALID_RESPONSE", `${provider} returned non-JSON generated content`);
  }
}

export class GeminiProvider implements LlmProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model = "gemini-3.6-flash",
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs = DEFAULT_LLM_TIMEOUT_MS,
  ) {}

  async generate(request: LlmGenerateRequest): Promise<unknown> {
    if (!this.apiKey.trim()) throw new LlmProviderError("CONFIGURATION", "GEMINI_API_KEY is not configured");
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const payload = await requestJson(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: request.systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: request.userPrompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }, "Gemini", this.fetchImpl, this.timeoutMs, this.model);
    const response = payload as GeminiResponse;
    const text = response.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    if (!text) throw new LlmProviderError("INVALID_RESPONSE", "Gemini returned no generated content");
    return parseJsonText(text, "Gemini");
  }
}

class OpenAICompatibleProvider implements LlmProvider {
  constructor(
    private readonly name: string,
    private readonly endpoint: string,
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs = DEFAULT_LLM_TIMEOUT_MS,
  ) {}

  async generate(request: LlmGenerateRequest): Promise<unknown> {
    if (!this.apiKey.trim()) throw new LlmProviderError("CONFIGURATION", `${this.name} API key is not configured`);
    const payload = await requestJson(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: request.systemInstruction },
          { role: "user", content: request.userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    }, this.name, this.fetchImpl, this.timeoutMs, this.model);
    const choices = Array.isArray(payload.choices) ? payload.choices as Array<Record<string, unknown>> : [];
    const message = choices[0]?.message as Record<string, unknown> | undefined;
    const text = typeof message?.content === "string" ? message.content : "";
    if (!text) throw new LlmProviderError("INVALID_RESPONSE", `${this.name} returned no generated content`);
    return parseJsonText(text, this.name);
  }
}

export class OpenAIProvider extends OpenAICompatibleProvider {}
export class GroqProvider extends OpenAICompatibleProvider {}

export class OllamaProvider implements LlmProvider {
  constructor(
    private readonly endpoint = "http://127.0.0.1:11434/api/chat",
    private readonly model = "llama3.1:8b",
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs = DEFAULT_LLM_TIMEOUT_MS,
  ) {}

  async generate(request: LlmGenerateRequest): Promise<unknown> {
    const payload = await requestJson(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        format: "json",
        messages: [
          { role: "system", content: request.systemInstruction },
          { role: "user", content: request.userPrompt },
        ],
      }),
    }, "Ollama", this.fetchImpl, this.timeoutMs, this.model);
    const message = payload.message as Record<string, unknown> | undefined;
    const text = typeof message?.content === "string" ? message.content : "";
    if (!text) throw new LlmProviderError("INVALID_RESPONSE", "Ollama returned no generated content");
    return parseJsonText(text, "Ollama");
  }
}

export class AnthropicProvider implements LlmProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model = "claude-sonnet-4-5",
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs = DEFAULT_LLM_TIMEOUT_MS,
  ) {}

  async generate(request: LlmGenerateRequest): Promise<unknown> {
    if (!this.apiKey.trim()) throw new LlmProviderError("CONFIGURATION", "ANTHROPIC_API_KEY is not configured");
    const payload = await requestJson("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        system: request.systemInstruction,
        messages: [{ role: "user", content: request.userPrompt }],
      }),
    }, "Anthropic", this.fetchImpl, this.timeoutMs, this.model);
    const content = Array.isArray(payload.content) ? payload.content as Array<Record<string, unknown>> : [];
    const text = typeof content[0]?.text === "string" ? content[0].text : "";
    if (!text) throw new LlmProviderError("INVALID_RESPONSE", "Anthropic returned no generated content");
    return parseJsonText(text, "Anthropic");
  }
}

export type ConfiguredProviderOptions = {
  provider?: LlmProviderName;
  model?: string;
};

export function createConfiguredLlmProvider(
  fetchImpl: typeof fetch = fetch,
  options: ConfiguredProviderOptions = {},
): LlmProvider | undefined {
  const provider = options.provider ?? (process.env.LLM_PROVIDER?.trim() as LlmProviderName | undefined) ?? "gemini";
  const model = options.model?.trim() || process.env.LLM_MODEL?.trim();

  switch (provider) {
    case "gemini": {
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (!apiKey) return undefined;
      return new GeminiProvider(apiKey, model || process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash", fetchImpl);
    }
    case "openai": {
      const apiKey = process.env.OPENAI_API_KEY?.trim();
      if (!apiKey) return undefined;
      return new OpenAIProvider("OpenAI", "https://api.openai.com/v1/chat/completions", apiKey, model || "gpt-5.5");
    }
    case "anthropic": {
      const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
      if (!apiKey) return undefined;
      return new AnthropicProvider(apiKey, model || "claude-sonnet-5", fetchImpl);
    }
    case "groq": {
      const apiKey = process.env.GROQ_API_KEY?.trim();
      if (!apiKey) return undefined;
      return new GroqProvider("Groq", "https://api.groq.com/openai/v1/chat/completions", apiKey, model || "openai/gpt-oss-120b", fetchImpl);
    }
    case "ollama":
      return new OllamaProvider(process.env.OLLAMA_BASE_URL?.trim() ? `${process.env.OLLAMA_BASE_URL.replace(/\/$/, "")}/api/chat` : "http://127.0.0.1:11434/api/chat", model || process.env.OLLAMA_MODEL?.trim() || "llama3.1:8b", fetchImpl);
    default:
      return undefined;
  }
}


export class FallbackLlmProvider implements LlmProvider {
  constructor(
    private readonly primary: LlmProvider,
    private readonly fallback: LlmProvider,
    private readonly onFallback?: (error: unknown) => void,
  ) {}

  async generate(request: LlmGenerateRequest): Promise<unknown> {
    try {
      return await this.primary.generate(request);
    } catch (error) {
      const retryable = error instanceof LlmProviderError &&
        (error.code === "RATE_LIMITED" || error.code === "TRANSIENT" || error.code === "INVALID_RESPONSE");
      if (!retryable) throw error;
      this.onFallback?.(error);
      return this.fallback.generate(request);
    }
  }
}
