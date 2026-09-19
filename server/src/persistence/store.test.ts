import test from "node:test";
import assert from "node:assert/strict";
import type { Kit } from "@trao/interview-prep-shared/kit.js";
import { buildKitId, InMemoryKitStore } from "./store.js";
import type { NormalizedKitInput } from "@trao/interview-prep-shared/input-model.js";

const input: NormalizedKitInput = {
  job_description: "React frontend engineer",
  company_url: "https://example.com/",
  days_available: 1,
};

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
  const id = buildKitId(input);
  const saved = await store.save(id, kit);
  saved.questions[0].prompt = "mutated";
  const loaded = await store.getById(id);
  assert.equal(loaded?.questions[0].prompt, "React?");
});

test("returns null for unknown kit IDs", async () => {
  const store = new InMemoryKitStore();
  assert.equal(await store.getById("missing"), null);
});

test("builds the same ID for the same normalized request", () => {
  assert.equal(buildKitId(input), buildKitId({ ...input }));
});

test("builds different IDs when the request changes", () => {
  assert.notEqual(
    buildKitId(input),
    buildKitId({ ...input, days_available: 2 }),
  );
  assert.notEqual(
    buildKitId(input),
    buildKitId({ ...input, job_description: "Python backend engineer" }),
  );
});


test("persists kits across store instances", async () => {
  const { mkdtemp, rm } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const directory = await mkdtemp(join(process.cwd(), "kit-store-test-"));
  const filePath = join(directory, "kits.json");

  try {
    const first = new (await import("./store.js")).JsonFileKitStore(filePath);
    const id = buildKitId(input);
    await first.save(id, kit);

    const second = new (await import("./store.js")).JsonFileKitStore(filePath);
    const loaded = await second.getById(id);
    assert.deepEqual(loaded, kit);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});


test("persists pinned question IDs independently from Appendix A kit shape", async () => {
  const { mkdtemp, rm } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const directory = await mkdtemp(join(process.cwd(), "kit-pin-test-"));
  const filePath = join(directory, "kits.json");
  try {
    const first = new (await import("./store.js")).JsonFileKitStore(filePath);
    const id = buildKitId(input);
    await first.savePinnedQuestions(id, { question_ids: ["q1"], updated_at: "2026-09-19T00:00:00.000Z" });
    const second = new (await import("./store.js")).JsonFileKitStore(filePath);
    assert.deepEqual(await second.getPinnedQuestions(id), { question_ids: ["q1"], updated_at: "2026-09-19T00:00:00.000Z" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
