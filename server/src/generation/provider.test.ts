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
