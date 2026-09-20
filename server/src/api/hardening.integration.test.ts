import { test } from "node:test";
import assert from "node:assert/strict";
import { handleGenerateKit } from "./generate-kit.js";
import { InMemoryKitStore } from "../persistence/store.js";
import type { LlmProvider } from "../generation/provider.js";

function fakeFetch(): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/robots.txt")) {
      return new Response("User-agent: *\nAllow: /", {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    }
    return new Response(
      "<html><head><title>Example Co</title></head><body><h1>Example Co</h1><p>Builds developer tools.</p></body></html>",
      { status: 200, headers: { "content-type": "text/html" } },
    );
  }) as typeof fetch;
}

function fakeProvider(): LlmProvider {
  return {
    async generate(request) {
      if (request.userPrompt.includes("Job description:")) {
        return {
          title: "Software Engineer",
          seniority: "entry-level",
          responsibilities: ["Build software"],
          requirements: [
            { text: "Python", kind: "technical", priority: "must" },
          ],
        };
      }
      return {
        questions: [
          {
            prompt: "Explain how you would use Python to solve a production problem.",
            answer_outline: "Discuss decomposition, testing, observability, and trade-offs.",
            difficulty: 2,
          },
        ],
      };
    },
  };
}

function dependencies(store: InMemoryKitStore) {
  return {
    store,
    fetchImpl: fakeFetch(),
    llmProvider: fakeProvider(),
    research: {
      interviewResearchProvider: {
        async search() {
          return [];
        },
      },
    },
  };
}

test("API rejects malformed requests with structured errors", async () => {
  const response = await handleGenerateKit(
    new Request("http://localhost/api/kits", {
      method: "POST",
      body: JSON.stringify({ jd: "", company_url: "not-a-url", days: 0 }),
      headers: { "content-type": "application/json" },
    }),
    dependencies(new InMemoryKitStore()),
  );

  assert.equal(response.status, 400);
  const body = await response.json() as { error: { code: string; message: string } };
  assert.equal(body.error.code, "VALIDATION_ERROR");
  assert.equal(typeof body.error.message, "string");
});

test("API persists a validated kit and reloads the same state", async () => {
  const store = new InMemoryKitStore();
  const response = await handleGenerateKit(
    new Request("http://localhost/api/kits", {
      method: "POST",
      body: JSON.stringify({
        jd: "We need Python engineers.",
        company_url: "https://example.com",
        days: 1,
      }),
      headers: { "content-type": "application/json" },
    }),
    dependencies(store),
  );

  assert.equal(response.status, 201);
  const body = await response.json() as { id: string; kit: { schedule: { days_available: number } } };
  assert.equal(body.kit.schedule.days_available, 1);
  assert.ok(await store.getById(body.id));
});

test("concurrent identical requests return one persisted kit", async () => {
  const store = new InMemoryKitStore();
  const deps = dependencies(store);
  const request = () => handleGenerateKit(
    new Request("http://localhost/api/kits", {
      method: "POST",
      body: JSON.stringify({
        jd: "We need Python engineers.",
        company_url: "https://example.com",
        days: 1,
      }),
      headers: { "content-type": "application/json" },
    }),
    deps,
  );

  const [first, second] = await Promise.all([request(), request()]);
  assert.equal(first.status, 201);
  assert.equal(second.status, 200);
  assert.equal((await first.json()).id, (await second.json()).id);
});


test("API surfaces LLM provider failures without persisting a kit", async () => {
  const store = new InMemoryKitStore();
  const deps = dependencies(store);
  const failingProvider: LlmProvider = {
    async generate() { throw new Error("provider unavailable"); },
  };
  const response = await handleGenerateKit(
    new Request("http://localhost/api/kits", {
      method: "POST",
      body: JSON.stringify({ jd: "We need Python engineers.", company_url: "https://example.com", days: 1 }),
      headers: { "content-type": "application/json" },
    }),
    { ...deps, llmProvider: failingProvider },
  );
  assert.equal(response.status, 422);
  const body = await response.json() as { error: { code: string } };
  assert.equal(body.error.code, "EXTRACTION_FAILED");
  assert.equal(await store.getById("missing"), null);
});

test("API surfaces research timeouts as structured research failures", async () => {
  const store = new InMemoryKitStore();
  const deps = dependencies(store);
  const response = await handleGenerateKit(
    new Request("http://localhost/api/kits", {
      method: "POST",
      body: JSON.stringify({ jd: "We need Python engineers.", company_url: "https://timeout.test", days: 1 }),
      headers: { "content-type": "application/json" },
    }),
    {
      ...deps,
      fetchImpl: async (input) => String(input).endsWith("/robots.txt") ? new Response("", { status: 404 }) : new Response("upstream failure", { status: 503 }),
    },
  );
  assert.equal(response.status, 502);
  const body = await response.json() as { error: { code: string } };
  assert.equal(body.error.code, "COMPANY_UNREACHABLE");
});
