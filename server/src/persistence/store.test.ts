import test from "node:test";
import assert from "node:assert/strict";
import type { Kit } from "@trao/interview-prep-shared/kit.js";
import { InMemoryKitStore } from "./store.js";

const kit = {
  source: {
    company: "Example",
    company_url: "https://example.com/",
    role: "Frontend Engineer",
    location: "",
    jd_chars: 20,
    researched_at: "2026-01-01T00:00:00.000Z",
    pages_used: ["https://example.com/"],
  },
  company_brief: { summary: "Example", what_they_do: "Software", sources: ["https://example.com/"] },
  role: {
    title: "Frontend Engineer",
    seniority: "Junior",
    responsibilities: [],
    requirements: [{ id: "r1", text: "React", kind: "technical" as const, priority: "must" as const }],
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
  schedule: { days_available: 1, days: [{ day: 1, focus: "React", question_ids: ["q1"], minutes: 10 }] },
  coverage: { uncovered_requirement_ids: [], passes: 1 },
} satisfies Kit;

test("saves and retrieves a kit without exposing mutable store state", async () => {
  const store = new InMemoryKitStore();
  const saved = await store.save(kit);
  saved.questions[0].prompt = "mutated";
  const loaded = await store.getById("https://example.com/|Frontend Engineer|20");
  assert.equal(loaded?.questions[0].prompt, "React?");
});

test("returns null for unknown kit IDs", async () => {
  const store = new InMemoryKitStore();
  assert.equal(await store.getById("missing"), null);
});
