import test from "node:test";
import assert from "node:assert/strict";
import { handleGenerateKit } from "./generate-kit.js";
import type { KitStore } from "../persistence/store.js";

const validKit = {
  source: {
    company: "Example",
    company_url: "https://example.com/",
    role: "Frontend Engineer",
    location: "",
    jd_chars: 23,
    researched_at: "2026-01-01T00:00:00.000Z",
    pages_used: ["https://example.com/"],
  },
  company_brief: {
    summary: "Example",
    what_they_do: "Software",
    sources: ["https://example.com/"],
  },
  role: {
    title: "Frontend Engineer",
    seniority: "Junior",
    responsibilities: [],
    requirements: [
      { id: "r1", text: "React", kind: "technical" as const, priority: "must" as const },
    ],
  },
  questions: [{
    id: "q1",
    requirement_ids: ["r1"],
    category: "technical" as const,
    prompt: "React?",
    answer_outline: "Components",
    difficulty: 2,
  }],
  flashcards: [],
  schedule: {
    days_available: 1,
    days: [{ day: 1, focus: "React", question_ids: ["q1"], minutes: 10 }],
  },
  coverage: { uncovered_requirement_ids: [], passes: 1 },
};

const store: KitStore = {
  async save(kit) { return kit; },
  async getById() { return null; },
};

function dependencies() {
  return {
    store,
    async buildOptions() {
      return {
        company: "Example",
        role: validKit.role,
        companyBrief: validKit.company_brief,
        research: {
          company_url: "https://example.com/",
          pages: [{ url: "https://example.com/", title: "Home", text: "Example", links: [] }],
          robots: { checked: true, allowed: true, source: "https://example.com/robots.txt", reason: "allowed" },
          skipped: [],
          public_interview_research: {
            attempted: false,
            found: false,
            results: [],
            note: "No provider configured",
          },
        },
        provider: {
          async generate() {
            return {
              questions: [{
                prompt: "React?",
                answer_outline: "Components",
                difficulty: 2,
              }],
            };
          },
        },
      };
    },
  };
}

test("returns a created kit for a valid POST request", async () => {
  const response = await handleGenerateKit(
    new Request("https://app.test/api/kits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jd: "React frontend engineer",
        company_url: "https://example.com/",
        days: 1,
      }),
    }),
    dependencies(),
  );

  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.id, "https://example.com/|Frontend Engineer|23");
  assert.equal(body.kit.questions[0].id, "q_r1_technical_1");
});

test("returns structured validation errors", async () => {
  const response = await handleGenerateKit(
    new Request("https://app.test/api/kits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jd: "", company_url: "ftp://private.test", days: 0 }),
    }),
    dependencies(),
  );

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error.code, "VALIDATION_ERROR");
  assert.ok(body.error.details);
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
  const response = await handleGenerateKit(
    new Request("https://app.test/api/kits", { method: "GET" }),
    dependencies(),
  );

  assert.equal(response.status, 405);
  const body = await response.json();
  assert.equal(body.error.code, "METHOD_NOT_ALLOWED");
});

test("maps an unshippable coverage result to a structured 422 response", async () => {
  const response = await handleGenerateKit(
    new Request("https://app.test/api/kits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jd: "React frontend engineer",
        company_url: "https://example.com/",
        days: 1,
      }),
    }),
    {
      ...dependencies(),
      async buildOptions() {
        return {
          company: "Example",
          role: {
            ...validKit.role,
            requirements: [
              ...validKit.role.requirements,
              { id: "r2", text: "SQL", kind: "technical" as const, priority: "must" as const },
            ],
          },
          companyBrief: validKit.company_brief,
          research: {
            company_url: "https://example.com/",
            pages: [],
            robots: { checked: true, allowed: true, source: "https://example.com/robots.txt", reason: "allowed" },
            skipped: [],
            public_interview_research: { attempted: false, found: false, results: [], note: "No provider" },
          },
          provider: {
            async generate(request) {
              if (request.userPrompt.includes("Requirement: SQL")) throw new Error("SQL unavailable");
              return { questions: [{ prompt: "React?", answer_outline: "Components", difficulty: 2 }] };
            },
          },
          maxPasses: 1,
        };
      },
    },
  );

  assert.equal(response.status, 422);
  const body = await response.json();
  assert.equal(body.error.code, "COVERAGE_NOT_SHIPPABLE");
});
