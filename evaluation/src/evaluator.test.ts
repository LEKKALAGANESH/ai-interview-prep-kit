import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateCases } from "./evaluator.js";
import type { EvaluationCase } from "@trao/interview-prep-shared/kit.js";
import { InMemoryKitStore } from "@trao/interview-prep-server/persistence/store.js";

const base: EvaluationCase = {
  id: "case-1",
  jd: "Build React applications",
  company_url: "https://example.com/",
  days: 2,
};

function fakeKit(days: number) {
  return {
    source: {
      company: "Example",
      company_url: "https://example.com/",
      role: "Engineer",
      location: "",
      jd_chars: 22,
      researched_at: new Date().toISOString(),
      pages_used: ["https://example.com/"],
    },
    company_brief: { summary: "Example", what_they_do: "Example", sources: ["https://example.com/"] },
    role: {
      title: "Engineer",
      seniority: "junior",
      responsibilities: [],
      requirements: [{ id: "r_1", text: "React", kind: "technical", priority: "must" }],
    },
    questions: [{
      id: "q_1",
      requirement_ids: ["r_1"],
      category: "technical",
      prompt: "React?",
      answer_outline: "Discuss React.",
      difficulty: 1,
    }],
    flashcards: [],
    schedule: {
      days_available: days,
      days: Array.from({ length: days }, (_, index) => ({
        day: index + 1,
        focus: "React",
        question_ids: index === 0 ? ["q_1"] : [],
        minutes: index === 0 ? 10 : 0,
      })),
    },
    coverage: { uncovered_requirement_ids: [], passes: 1 },
  };
}

test("evaluates every case and preserves requested days", async () => {
  const calls: string[] = [];
  const output = await evaluateCases([base, { ...base, id: "case-2", days: 1 }], {
    store: new InMemoryKitStore(),
    generate: async (input) => {
      calls.push(input.job_description);
      return { id: `kit-${input.days_available}`, kit: fakeKit(input.days_available) as any, reused: false };
    },
  });

  assert.deepEqual(calls, ["Build React applications", "Build React applications"]);
  assert.equal(output.kits.length, 2);
  assert.equal(output.kits[0].status, "ok");
  assert.equal(output.kits[0].kit?.schedule.days_available, 2);
  assert.equal(output.kits[1].kit?.schedule.days_available, 1);
});

test("continues after an individual case failure", async () => {
  const second = { ...base, id: "case-2", jd: "Build Node.js services" };
  const output = await evaluateCases([base, second], {
    store: new InMemoryKitStore(),
    generate: async (input) => {
      if (input.job_description === base.jd) {
        throw Object.assign(new Error("temporary failure"), { code: "TRANSIENT" });
      }
      return { id: "kit-2", kit: fakeKit(input.days_available) as any, reused: false };
    },
  });

  assert.equal(output.kits.length, 2);
  assert.equal(output.kits[0].status, "failed");
  assert.equal(output.kits[0].error?.code, "TRANSIENT");
  assert.equal(output.kits[1].status, "ok");
});

test("rejects duplicate case IDs before processing", async () => {
  await assert.rejects(
    evaluateCases([base, base]),
    /Duplicate case id/,
  );
});
