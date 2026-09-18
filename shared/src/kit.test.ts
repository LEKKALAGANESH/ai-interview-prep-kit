import test from "node:test";
import assert from "node:assert/strict";
import {
  KitSchema,
  EvaluationInputSchema,
  EvaluationOutputSchema,
} from "./kit.js";

const validKit = {
  source: {
    company: "Acme",
    company_url: "https://example.com",
    role: "Software Engineer",
    location: "Remote",
    jd_chars: 1200,
    researched_at: "2026-09-18T12:00:00.000Z",
    pages_used: ["https://example.com/careers"],
  },
  company_brief: {
    summary: "A concise company summary.",
    what_they_do: "Builds software.",
    sources: ["https://example.com/about"],
  },
  role: {
    title: "Software Engineer",
    seniority: "Entry-level",
    responsibilities: ["Build and test software"],
    requirements: [
      { id: "r1", text: "JavaScript experience", kind: "technical", priority: "must" },
      { id: "r2", text: "Communication skills", kind: "behavioural", priority: "nice" },
    ],
  },
  questions: [
    {
      id: "q1",
      requirement_ids: ["r1"],
      category: "technical",
      prompt: "Explain event-loop behaviour.",
      answer_outline: "Discuss the call stack and task queues.",
      difficulty: 2,
    },
  ],
  flashcards: [
    { id: "f1", front: "What is a closure?", back: "A function retaining lexical scope.", requirement_ids: ["r1"] },
  ],
  schedule: {
    days_available: 1,
    days: [{ day: 1, focus: "Core preparation", question_ids: ["q1"], minutes: 30 }],
  },
  coverage: {
    uncovered_requirement_ids: ["r2"],
    passes: 1,
  },
};

test("valid Appendix A kit parses", () => {
  assert.doesNotThrow(() => KitSchema.parse(validKit));
});

test("invalid question difficulty is rejected", () => {
  const kit = structuredClone(validKit);
  kit.questions[0].difficulty = 4;
  assert.throws(() => KitSchema.parse(kit));
});

test("non-integer schedule minutes are rejected", () => {
  const kit = structuredClone(validKit);
  kit.schedule.days[0].minutes = 30.5;
  assert.throws(() => KitSchema.parse(kit));
});

test("invalid requirement kind is rejected", () => {
  const kit = structuredClone(validKit);
  kit.role.requirements[0].kind = "soft-skill";
  assert.throws(() => KitSchema.parse(kit));
});

test("invalid question category is rejected", () => {
  const kit = structuredClone(validKit);
  kit.questions[0].category = "hr";
  assert.throws(() => KitSchema.parse(kit));
});

test("Appendix B input accepts multiple cases", () => {
  assert.doesNotThrow(() =>
    EvaluationInputSchema.parse([
      { id: "a", jd: "Engineer", company_url: "https://example.com", days: 1 },
      { id: "b", jd: "Engineer", company_url: "https://example.org", days: 60 },
    ]),
  );
});

test("Appendix B output accepts success and failure cases", () => {
  const output = {
    version: "1.0",
    generated_at: "2026-09-18T12:00:00.000Z",
    kits: [
      { id: "a", status: "ok", kit: validKit, error: null },
      {
        id: "b",
        status: "failed",
        kit: null,
        error: { code: "RETRIEVAL_FAILED", message: "Company page unavailable" },
      },
    ],
  };
  assert.doesNotThrow(() => EvaluationOutputSchema.parse(output));
});
