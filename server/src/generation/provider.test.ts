import test from "node:test";
import assert from "node:assert/strict";
import { GeminiProvider, LlmProviderError } from "./provider.js";

test("maps Gemini JSON content into provider output", async () => {
  const provider = new GeminiProvider("key", "test-model", async (input, init) => {
    assert.match(String(input), /test-model:generateContent/);
    assert.equal((init?.headers as Record<string, string>)["content-type"], "application/json");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.generationConfig.responseMimeType, "application/json");
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: '{"questions":[]}' }] } }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  });

  assert.deepEqual(
    await provider.generate({ systemInstruction: "system", userPrompt: "user" }),
    { questions: [] },
  );
});

test("classifies Gemini rate limits", async () => {
  const provider = new GeminiProvider("key", "test-model", async () => new Response("busy", { status: 429 }));
  await assert.rejects(
    provider.generate({ systemInstruction: "s", userPrompt: "u" }),
    (error: unknown) => error instanceof LlmProviderError && error.code === "RATE_LIMITED",
  );
});

test("rejects malformed generated JSON", async () => {
  const provider = new GeminiProvider("key", "test-model", async () =>
    new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "not json" }] } }] }), { status: 200 }),
  );
  await assert.rejects(
    provider.generate({ systemInstruction: "s", userPrompt: "u" }),
    (error: unknown) => error instanceof LlmProviderError && error.code === "INVALID_RESPONSE",
  );
});

test("classifies transient server failures", async () => {
  const provider = new GeminiProvider("key", "test-model", async () => new Response("error", { status: 503 }));
  await assert.rejects(
    provider.generate({ systemInstruction: "s", userPrompt: "u" }),
    (error: unknown) => error instanceof LlmProviderError && error.code === "TRANSIENT",
  );
});

test("maps OpenAI-compatible responses into provider output", async () => {
  const { OpenAIProvider } = await import("./provider.js");
  const provider = new OpenAIProvider("OpenAI", "https://example.test/chat", "key", "test-model", async (input, init) => {
    assert.equal(String(input), "https://example.test/chat");
    assert.equal((init?.headers as Record<string,string>).authorization, "Bearer key");
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }), { status: 200 });
  });
  assert.deepEqual(await provider.generate({ systemInstruction: "s", userPrompt: "u" }), { ok: true });
});

test("maps Anthropic message content into provider output", async () => {
  const { AnthropicProvider } = await import("./provider.js");
  const provider = new AnthropicProvider("key", "claude-test", async (input, init) => {
    assert.equal(String(input), "https://api.anthropic.com/v1/messages");
    const headers = init?.headers as Record<string,string>;
    assert.equal(headers["x-api-key"], "key");
    return new Response(JSON.stringify({ content: [{ type: "text", text: '{"ok":true}' }] }), { status: 200 });
  });
  assert.deepEqual(await provider.generate({ systemInstruction: "s", userPrompt: "u" }), { ok: true });
});

test("maps Ollama chat responses into provider output", async () => {
  const { OllamaProvider } = await import("./provider.js");
  const provider = new OllamaProvider("http://ollama.test/api/chat", "llama-test", async (_input, init) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.stream, false);
    assert.equal(body.format, "json");
    return new Response(JSON.stringify({ message: { content: '{"ok":true}' } }), { status: 200 });
  });
  assert.deepEqual(await provider.generate({ systemInstruction: "s", userPrompt: "u" }), { ok: true });
});


test("falls back on bounded provider failures", async () => {
  const { FallbackLlmProvider } = await import("./provider.js");
  let fallbackObserved = false;
  const provider = new FallbackLlmProvider(
    { async generate() { throw new LlmProviderError("TRANSIENT", "primary unavailable"); } },
    { async generate() { return { ok: true }; } },
    () => { fallbackObserved = true; },
  );
  assert.deepEqual(await provider.generate({ systemInstruction: "s", userPrompt: "u" }), { ok: true });
  assert.equal(fallbackObserved, true);
});

test("does not fail over configuration errors", async () => {
  const { FallbackLlmProvider } = await import("./provider.js");
  const provider = new FallbackLlmProvider(
    { async generate() { throw new LlmProviderError("CONFIGURATION", "bad key"); } },
    { async generate() { return { ok: true }; } },
  );
  await assert.rejects(provider.generate({ systemInstruction: "s", userPrompt: "u" }), /bad key/);
});
