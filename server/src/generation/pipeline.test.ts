import test from "node:test";
import assert from "node:assert/strict";
import {
  generateInitialQuestionSet,
  generateInitialQuestionSetWithCoverage,
  generateQuestionSetWithCoverage,
} from "./pipeline.js";
import type { LlmProvider } from "./provider.js";

test("generates each requirement through its appropriate category", async () => {
  const seen: string[] = [];
  const provider: LlmProvider = {
    async generate(request) {
      const match = request.userPrompt.match(/Question category: ([^\n]+)/);
      seen.push(match?.[1] ?? "");
      return { questions: [{ prompt: "Question", answer_outline: "Outline", difficulty: 2 }] };
    },
  };

  const questions = await generateInitialQuestionSet(
    [
      { id: "r1", text: "React", kind: "technical", priority: "must" },
      { id: "r2", text: "Mentoring", kind: "behavioural", priority: "must" },
      { id: "r3", text: "Distributed systems", kind: "domain", priority: "nice" },
    ],
    { provider },
  );

  assert.deepEqual(seen, ["technical", "behavioural", "system-design"]);
  assert.deepEqual(questions.map((q) => q.requirement_ids), [["r1"], ["r2"], ["r3"]]);
});

test("runs deterministic coverage immediately after initial generation", async () => {
  const result = await generateInitialQuestionSetWithCoverage(
    [{ id: "r1", text: "React", kind: "technical", priority: "must" }],
    { provider: { async generate() {
      return { questions: [{ prompt: "React?", answer_outline: "Components", difficulty: 2 }] };
    }}},
  );
  assert.deepEqual(result.coverage.covered_requirement_ids, ["r1"]);
  assert.equal(result.coverage.can_ship, true);
});

function providerThatOnlyAnswers(requirementText: string): LlmProvider {
  return {
    async generate(request) {
      const matches = request.userPrompt.match(/Requirement: ([^\n]+)/);
      const requirement = matches?.[1] ?? "";
      if (requirement !== requirementText) {
        return { questions: [] };
      }
      return {
        questions: [{
          prompt: `Question for ${requirement}`,
          answer_outline: `Outline for ${requirement}`,
          difficulty: 2,
        }],
      };
    },
  };
}

test("second pass generates only uncovered requirements and preserves first-pass questions", async () => {
  const calls: string[] = [];
  const provider: LlmProvider = {
    async generate(request) {
      const match = request.userPrompt.match(/Requirement: ([^\n]+)/);
      const requirement = match?.[1] ?? "";
      calls.push(requirement);
      if (requirement === "React") {
        return { questions: [{ prompt: "React first", answer_outline: "React outline", difficulty: 2 }] };
      }
      if (requirement === "SQL") {
        return { questions: [{ prompt: "SQL repair", answer_outline: "SQL outline", difficulty: 2 }] };
      }
      return { questions: [{ prompt: "Other", answer_outline: "Other outline", difficulty: 1 }] };
    },
  };

  const result = await generateQuestionSetWithCoverage(
    [
      { id: "r1", text: "React", kind: "technical", priority: "must" },
      { id: "r2", text: "SQL", kind: "technical", priority: "must" },
    ],
    { provider },
  );

  assert.deepEqual(calls, ["React", "SQL", "SQL"]);
  assert.equal(result.questions.length, 2);
  assert.equal(result.questions[0].prompt, "React first");
  assert.equal(result.questions[1].prompt, "SQL repair");
  assert.deepEqual(result.coverage.uncovered_requirement_ids, []);
  assert.equal(result.coverage.passes, 2);
  assert.equal(result.coverage.can_ship, true);
});

test("does not run a second pass when initial coverage is complete", async () => {
  let calls = 0;
  const provider: LlmProvider = {
    async generate() {
      calls += 1;
      return { questions: [{ prompt: "covered", answer_outline: "outline", difficulty: 2 }] };
    },
  };

  const result = await generateQuestionSetWithCoverage(
    [{ id: "r1", text: "React", kind: "technical", priority: "must" }],
    { provider },
  );

  assert.equal(calls, 1);
  assert.equal(result.coverage.passes, 1);
  assert.equal(result.maxPasses, 2);
});

test("second pass includes uncovered nice requirements as well as must requirements", async () => {
  const calls: string[] = [];
  const provider: LlmProvider = {
    async generate(request) {
      const match = request.userPrompt.match(/Requirement: ([^\n]+)/);
      calls.push(match?.[1] ?? "");
      return {
        questions: [{ prompt: "repair", answer_outline: "outline", difficulty: 2 }],
      };
    },
  };

  const result = await generateQuestionSetWithCoverage(
    [
      { id: "r1", text: "React", kind: "technical", priority: "must" },
      { id: "r2", text: "GraphQL", kind: "technical", priority: "nice" },
    ],
    { provider },
  );

  assert.deepEqual(calls, ["React", "GraphQL"]);
  assert.equal(result.coverage.can_ship, true);
  assert.deepEqual(result.coverage.uncovered_requirement_ids, []);
});

test("stops at the configured maximum pass and remains non-shippable when a must-have stays uncovered", async () => {
  let calls = 0;
  const provider: LlmProvider = {
    async generate() {
      calls += 1;
      return {
        questions: [{ prompt: `unrelated-${calls}`, answer_outline: "outline", difficulty: 2 }],
      };
    },
  };

  const result = await generateQuestionSetWithCoverage(
    [
      { id: "r1", text: "React", kind: "technical", priority: "must" },
      { id: "r2", text: "SQL", kind: "technical", priority: "must" },
    ],
    { provider, maxPasses: 2 },
  );

  assert.equal(calls, 4);
  assert.equal(result.coverage.passes, 2);
  assert.deepEqual(result.coverage.uncovered_must_requirement_ids, ["r1", "r2"]);
  assert.equal(result.coverage.can_ship, false);
});

test("normalizes a zero or fractional maxPasses to one pass", async () => {
  let calls = 0;
  const provider: LlmProvider = {
    async generate() {
      calls += 1;
      return { questions: [{ prompt: "q", answer_outline: "a", difficulty: 1 }] };
    },
  };

  const result = await generateQuestionSetWithCoverage(
    [{ id: "r1", text: "React", kind: "technical", priority: "must" }],
    { provider, maxPasses: 0.5 },
  );

  assert.equal(calls, 1);
  assert.equal(result.maxPasses, 1);
  assert.equal(result.coverage.passes, 1);
});

test("reuses the existing provider retry/error boundary during second-pass generation", async () => {
  let calls = 0;
  const provider: LlmProvider = {
    async generate() {
      calls += 1;
      if (calls === 2) {
        throw new Error("provider unavailable");
      }
      return { questions: [{ prompt: "covered", answer_outline: "outline", difficulty: 2 }] };
    },
  };

  await assert.rejects(
    generateQuestionSetWithCoverage(
      [
        { id: "r1", text: "React", kind: "technical", priority: "must" },
        { id: "r2", text: "SQL", kind: "technical", priority: "must" },
      ],
      { provider },
    ),
    /provider unavailable/,
  );
});
