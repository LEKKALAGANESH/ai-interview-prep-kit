import test from "node:test";
import assert from "node:assert/strict";
import { handleGenerateKit } from "./generate-kit.js";
import { InMemoryKitStore } from "../persistence/store.js";
import type { LlmProvider } from "../generation/provider.js";

const store = new InMemoryKitStore();

function provider(): LlmProvider {
  return {
    async generate(request) {
      if (request.userPrompt.includes("Job description:")) {
        return {
          title: "Frontend Engineer",
          seniority: "Junior",
          responsibilities: ["Build interfaces"],
          requirements: [{ text: "React", kind: "technical", priority: "must" }],
        };
      }
      return {
        questions: [{
          prompt: "How do you build a React component?",
          answer_outline: "Discuss composition.",
          difficulty: 2,
        }],
      };
    },
  };
}

function fetchImpl(): typeof fetch {
  return async (url) => {
    const target = String(url);
    if (target.endsWith("/robots.txt")) {
      return new Response("", { status: 404 });
    }
    return new Response(
      "<html><head><title>Example</title></head><body>Example software company.</body></html>",
      { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  };
}

function request(body: unknown, method = "POST"): Request {
  return new Request("https://app.test/api/kits", {
    method,
    headers: { "content-type": "application/json" },
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });
}

function dependencies() {
  return { store, llmProvider: provider(), fetchImpl: fetchImpl() };
}

test("returns a created kit for a valid raw-input request", async () => {
  const response = await handleGenerateKit(
    request({
      jd: "React frontend engineer",
      company_url: "https://example.com/",
      days: 1,
    }),
    dependencies(),
  );

  assert.equal(response.status, 201);
  const body = await response.json();
  assert.ok(body.id.startsWith("kit_"));
  assert.ok(body.kit.questions[0].id.startsWith("q_r_"));
  assert.equal(body.kit.schedule.days.length, 1);
});

test("reuses an identical raw-input request", async () => {
  const response = await handleGenerateKit(
    request({
      jd: "React frontend engineer",
      company_url: "https://example.com/",
      days: 1,
    }),
    dependencies(),
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.id.startsWith("kit_"));
});

test("returns structured validation errors", async () => {
  const response = await handleGenerateKit(
    request({ jd: "", company_url: "ftp://private.test", days: 0 }),
    dependencies(),
  );
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error.code, "VALIDATION_ERROR");
});

test("returns structured invalid JSON errors", async () => {
  const response = await handleGenerateKit(
    new Request("https://app.test/api/kits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not-json",
    }),
    dependencies(),
  );
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error.code, "INVALID_JSON");
});

test("rejects unsupported methods", async () => {
  const response = await handleGenerateKit(request(undefined, "GET"), dependencies());
  assert.equal(response.status, 405);
});

test("returns a structured error when the LLM is not configured", async () => {
  const response = await handleGenerateKit(
    request({ jd: "React frontend engineer", company_url: "https://other.test/", days: 1 }),
    { store, fetchImpl: fetchImpl() },
  );
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.error.code, "LLM_NOT_CONFIGURED");
});

test("not-configured error names the exact env var for the chosen provider", async () => {
  const saved = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  try {
    const response = await handleGenerateKit(
      request({ jd: "React frontend engineer", company_url: "https://other.test/", days: 1, llm_provider: "groq" }),
      { store, fetchImpl: fetchImpl() },
    );
    const body = await response.json();
    assert.equal(body.error.code, "LLM_NOT_CONFIGURED");
    assert.match(body.error.message, /GROQ_API_KEY/);
  } finally {
    if (saved !== undefined) process.env.GROQ_API_KEY = saved;
  }
});

test("returns COMPANY_UNREACHABLE when no usable company page is retrieved", async () => {
  const response = await handleGenerateKit(
    request({ jd: "React frontend engineer", company_url: "https://unavailable.test/", days: 1 }),
    {
      store,
      llmProvider: provider(),
      fetchImpl: async (url) => {
        if (String(url).endsWith("/robots.txt")) return new Response("", { status: 404 });
        return new Response("upstream failure", { status: 503 });
      },
    },
  );
  assert.equal(response.status, 502);
  const body = await response.json();
  assert.equal(body.error.code, "COMPANY_UNREACHABLE");
});

test("says so honestly when the company site only serves a JavaScript shell", async () => {
  const response = await handleGenerateKit(
    request({ jd: "React frontend engineer", company_url: "https://spa.test/", days: 1 }),
    {
      store: new InMemoryKitStore(),
      llmProvider: provider(),
      fetchImpl: async (url) =>
        String(url).endsWith("/robots.txt")
          ? new Response("", { status: 404 })
          : new Response("<html><body>Skip to content Loading...</body></html>", {
              status: 200,
              headers: { "content-type": "text/html; charset=utf-8" },
            }),
    },
  );
  assert.equal(response.status, 201);
  const { kit } = await response.json();
  assert.match(kit.company_brief.summary, /Little readable content/);
  assert.doesNotMatch(kit.company_brief.summary, /Loading/);
  assert.deepEqual(kit.company_brief.sources, []);
});
