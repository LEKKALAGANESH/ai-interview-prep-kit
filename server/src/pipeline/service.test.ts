import test from "node:test";
import assert from "node:assert/strict";
import { generateAndPersistKit } from "./service.js";
import { buildKitId, InMemoryKitStore } from "../persistence/store.js";
import type { KitStore } from "../persistence/store.js";
import type { Role } from "@trao/interview-prep-shared/kit.js";

const role: Role = {
  title: "Frontend Engineer",
  seniority: "Junior",
  responsibilities: ["Build interfaces"],
  requirements: [
    { id: "r1", text: "React", kind: "technical", priority: "must" },
  ],
};

const research = {
  company_url: "https://example.com/",
  pages: [{ url: "https://example.com/", fetched_at: "2026-09-19T00:00:00.000Z", title: "Home", text: "Company", links: [] }],
  robots: { checked: true, allowed: true, source: "https://example.com/robots.txt", reason: "allowed" },
  skipped: [],
  public_interview_research: {
    attempted: false,
    found: false,
    results: [],
    note: "No provider configured",
  },
};

const baseInput = {
  job_description: "React frontend engineer",
  company_url: "https://example.com/",
  days_available: 2,
};

const baseOptions = {
  role,
  company: "Example",
  companyBrief: {
    summary: "Example",
    what_they_do: "Software",
    sources: ["https://example.com/"],
  },
  research,
};

test("generates, validates, and persists the complete kit", async () => {
  const store = new InMemoryKitStore();

  const result = await generateAndPersistKit(
    baseInput,
    {
      ...baseOptions,
      provider: {
        async generate() {
          return {
            questions: [{
              prompt: "How do you build a React component?",
              answer_outline: "Discuss composition.",
              difficulty: 3,
            }],
          };
        },
      },
    },
    store,
  );

  assert.ok(result.id);
  assert.equal(result.reused, false);
  assert.equal(result.kit.coverage.uncovered_requirement_ids.length, 0);
  assert.equal(result.kit.schedule.days.length, 2);

  const loaded = await store.getById(result.id);
  assert.deepEqual(loaded, result.kit);
});

test("does not regenerate an identical request", async () => {
  const store = new InMemoryKitStore();
  let providerCalls = 0;
  const options = {
    ...baseOptions,
    provider: {
      async generate() {
        providerCalls += 1;
        return {
          questions: [{
            prompt: "React question",
            answer_outline: "Outline",
            difficulty: 2,
          }],
        };
      },
    },
  };

  const first = await generateAndPersistKit(baseInput, options, store);
  const second = await generateAndPersistKit(baseInput, options, store);

  assert.equal(providerCalls, 1);
  assert.equal(first.id, second.id);
  assert.equal(second.reused, true);
  assert.deepEqual(second.kit, first.kit);
});

test("does not persist when coverage cannot ship", async () => {
  const store = new InMemoryKitStore();

  await assert.rejects(
    generateAndPersistKit(
      {
        job_description: "React frontend engineer",
        company_url: "https://example.com/",
        days_available: 1,
      },
      {
        ...baseOptions,
        role: {
          ...role,
          requirements: [
            ...role.requirements,
            { id: "r2", text: "SQL", kind: "technical", priority: "must" },
          ],
        },
        provider: {
          async generate(request) {
            if (request.userPrompt.includes("Requirement: SQL")) {
              throw new Error("SQL unavailable");
            }
            return {
              questions: [{
                prompt: "React question",
                answer_outline: "Outline",
                difficulty: 2,
              }],
            };
          },
        },
        maxPasses: 1,
      },
      store,
    ),
  );

  assert.equal(await store.getById(buildKitId({ job_description: "React frontend engineer", company_url: "https://example.com/", days_available: 1 })), null);
});

test("propagates persistence failures and never reports a successful save", async () => {
  const failingStore: KitStore = {
    async getById() {
      return null;
    },
    async withRequestLock(_id, operation) {
      return operation();
    },
    async update() { throw new Error("not expected"); },
    async delete() { return false; },
    async save() {
      throw new Error("database unavailable");
    },
    async getPractice() { return { current_index: 0, results: [], completed: false }; },
    async savePractice(_id, state) { return state; },
    async getPinnedQuestions() { return { question_ids: [], updated_at: new Date(0).toISOString() }; },
    async savePinnedQuestions(_id, state) { return state; },
    async getResearchProvenance() { return null; },
    async saveResearchProvenance(_id, state) { return state; }
  };

  await assert.rejects(
    generateAndPersistKit(
      baseInput,
      {
        ...baseOptions,
        provider: {
          async generate() {
            return {
              questions: [{
                prompt: "React question",
                answer_outline: "Outline",
                difficulty: 2,
              }],
            };
          },
        },
      },
      failingStore,
    ),
    /database unavailable/,
  );
});


test("coalesces concurrent identical requests into one generation", async () => {
  const store = new InMemoryKitStore();
  let providerCalls = 0;

  const options = {
    ...baseOptions,
    provider: {
      async generate() {
        providerCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
          questions: [{
            prompt: "React question",
            answer_outline: "Outline",
            difficulty: 2,
          }],
        };
      },
    },
  };

  const [first, second] = await Promise.all([
    generateAndPersistKit(baseInput, options, store),
    generateAndPersistKit(baseInput, options, store),
  ]);

  assert.equal(providerCalls, 1);
  assert.equal(first.id, second.id);
  assert.equal(first.reused, false);
  assert.equal(second.reused, true);
  assert.deepEqual(first.kit, second.kit);
});


test("supports the minimum one-day schedule", async () => {
  const store = new InMemoryKitStore();
  const result = await generateAndPersistKit(
    { ...baseInput, days_available: 1 },
    {
      ...baseOptions,
      provider: {
        async generate() {
          return {
            questions: [{
              prompt: "React question",
              answer_outline: "Outline",
              difficulty: 2,
            }],
          };
        },
      },
    },
    store,
  );

  assert.equal(result.kit.schedule.days_available, 1);
  assert.deepEqual(result.kit.schedule.days.map((day) => day.day), [1]);
  assert.deepEqual(result.kit.schedule.days[0].question_ids, ["q_r1_technical_1"]);
});

test("supports the maximum sixty-day schedule", async () => {
  const store = new InMemoryKitStore();
  const result = await generateAndPersistKit(
    { ...baseInput, days_available: 60 },
    {
      ...baseOptions,
      provider: {
        async generate() {
          return {
            questions: [{
              prompt: "React question",
              answer_outline: "Outline",
              difficulty: 2,
            }],
          };
        },
      },
    },
    store,
  );

  assert.equal(result.kit.schedule.days_available, 60);
  assert.equal(result.kit.schedule.days.length, 60);
  assert.deepEqual(
    result.kit.schedule.days.map((day) => day.day),
    Array.from({ length: 60 }, (_, index) => index + 1),
  );
  assert.equal(result.kit.schedule.days.reduce((sum, day) => sum + day.question_ids.length, 0), 1);
  assert.ok(result.kit.schedule.days.every((day) => Number.isInteger(day.minutes) && day.minutes >= 0));
});
