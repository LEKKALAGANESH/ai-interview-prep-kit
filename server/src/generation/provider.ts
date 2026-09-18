export type LlmGenerateRequest = {
  systemInstruction: string;
  userPrompt: string;
};

export interface LlmProvider {
  generate(request: LlmGenerateRequest): Promise<unknown>;
}

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

export class LlmProviderError extends Error {
  constructor(
    public readonly code: "CONFIGURATION" | "RATE_LIMITED" | "TRANSIENT" | "INVALID_RESPONSE",
    message: string,
  ) {
    super(message);
    this.name = "LlmProviderError";
  }
}

export class GeminiProvider implements LlmProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model = "gemini-2.5-flash",
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async generate(request: LlmGenerateRequest): Promise<unknown> {
    if (!this.apiKey.trim()) {
      throw new LlmProviderError("CONFIGURATION", "GEMINI_API_KEY is not configured");
    }

    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    let response: Response;
    try {
      response = await this.fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: request.systemInstruction }] },
          contents: [{ role: "user", parts: [{ text: request.userPrompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      });
    } catch (error) {
      throw new LlmProviderError(
        "TRANSIENT",
        error instanceof Error ? error.message : "Gemini request failed",
      );
    }

    if (response.status === 429) {
      throw new LlmProviderError("RATE_LIMITED", "Gemini rate limit reached");
    }

    if (response.status >= 500) {
      throw new LlmProviderError("TRANSIENT", `Gemini returned HTTP ${response.status}`);
    }

    if (!response.ok) {
      throw new LlmProviderError("CONFIGURATION", `Gemini returned HTTP ${response.status}`);
    }

    let payload: GeminiResponse;
    try {
      payload = (await response.json()) as GeminiResponse;
    } catch {
      throw new LlmProviderError("INVALID_RESPONSE", "Gemini returned invalid JSON");
    }

    const text = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!text) {
      throw new LlmProviderError("INVALID_RESPONSE", "Gemini returned no generated content");
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new LlmProviderError("INVALID_RESPONSE", "Gemini returned non-JSON generated content");
    }
  }
}

export function createConfiguredLlmProvider(
  fetchImpl: typeof fetch = fetch,
): GeminiProvider | undefined {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return undefined;

  return new GeminiProvider(
    apiKey,
    process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
    fetchImpl,
  );
}
