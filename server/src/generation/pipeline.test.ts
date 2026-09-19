import test from "node:test";
import assert from "node:assert/strict";
import {
  generateInitialQuestionSet,
  generateInitialQuestionSetWithCoverage,
  generateQuestionSetWithCoverage,
} from "./pipeline.js";
import type { LlmProvider } from "./provider.js";
import { QuestionGenerationError } from "./generator.js";
import { buildSchedule } from "@trao/interview-prep-shared/schedule.js";

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

test("second pass generates only uncovered requirements and preserves first-pass questions", async () => {
  const calls: string[] = [];
  let sqlAttempts = 0;
  const provider: LlmProvider = {
    async generate(request) {
      const match = request.userPrompt.match(/Requirement: ([^\n]+)/);
      const requirement = match?.[1] ?? "";
      calls.push(requirement);

      if (requirement === "SQL") {
        sqlAttempts += 1;
        if (sqlAttempts === 1) {
          throw new Error("invalid first-pass output");
        }
        return { questions: [{ prompt: "SQL repair", answer_outline: "SQL outline", difficulty: 2 }] };
      }

      return {
        questions: [{ prompt: "React first", answer_outline: "React outline", difficulty: 2 }],
      };
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
  assert.deepEqual(result.generation_errors, [{
    requirement_id: "r2",
    pass: 1,
    code: "PROVIDER_FAILED",
    message: "invalid first-pass output",
  }]);
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
  assert.deepEqual(result.generation_errors, []);
});

test("second pass includes uncovered nice requirements as well as must requirements", async () => {
  const calls: string[] = [];
  let graphQlAttempts = 0;
  const provider: LlmProvider = {
    async generate(request) {
      const match = request.userPrompt.match(/Requirement: ([^\n]+)/);
      const requirement = match?.[1] ?? "";
      calls.push(requirement);

      if (requirement === "GraphQL" && graphQlAttempts++ === 0) {
        throw new Error("invalid first-pass output");
      }

      return {
        questions: [{ prompt: "question", answer_outline: "outline", difficulty: 2 }],
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

  assert.deepEqual(calls, ["React", "GraphQL", "GraphQL"]);
  assert.equal(result.coverage.can_ship, true);
  assert.deepEqual(result.coverage.uncovered_requirement_ids, []);
  assert.deepEqual(result.coverage.uncovered_nice_requirement_ids, []);
});

test("stops at the configured maximum pass and remains non-shippable when a must-have stays uncovered", async () => {
  const calls: string[] = [];
  const provider: LlmProvider = {
    async generate(request) {
      const match = request.userPrompt.match(/Requirement: ([^\n]+)/);
      calls.push(match?.[1] ?? "");
      throw new Error("still invalid");
    },
  };

  const result = await generateQuestionSetWithCoverage(
    [
      { id: "r1", text: "React", kind: "technical", priority: "must" },
      { id: "r2", text: "SQL", kind: "technical", priority: "must" },
    ],
    { provider, maxPasses: 2 },
  );

  assert.deepEqual(calls, ["React", "SQL", "React", "SQL"]);
  assert.equal(result.coverage.passes, 2);
  assert.deepEqual(result.coverage.uncovered_must_requirement_ids, ["r1", "r2"]);
  assert.equal(result.coverage.can_ship, false);
  assert.equal(result.generation_errors.length, 4);
});

test("stops when a repair pass makes no progress", async () => {
  const provider: LlmProvider = {
    async generate(request) {
      const match = request.userPrompt.match(/Requirement: ([^\n]+)/);
      if (match?.[1] === "SQL") {
        throw new Error("no SQL output");
      }
      return { questions: [{ prompt: "React", answer_outline: "outline", difficulty: 2 }] };
    },
  };

  const result = await generateQuestionSetWithCoverage(
    [
      { id: "r1", text: "React", kind: "technical", priority: "must" },
      { id: "r2", text: "SQL", kind: "technical", priority: "must" },
    ],
    { provider, maxPasses: 3 },
  );

  assert.equal(result.coverage.passes, 2);
  assert.deepEqual(result.coverage.uncovered_must_requirement_ids, ["r2"]);
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
      if (calls === 2 || calls === 3) {
        throw new Error("provider unavailable");
      }
      return { questions: [{ prompt: "covered", answer_outline: "outline", difficulty: 2 }] };
    },
  };

  const result = await generateQuestionSetWithCoverage(
    [
      { id: "r1", text: "React", kind: "technical", priority: "must" },
      { id: "r2", text: "SQL", kind: "technical", priority: "must" },
    ],
    { provider },
  );

  assert.equal(calls, 3);
  assert.equal(result.coverage.can_ship, false);
  assert.deepEqual(result.coverage.uncovered_must_requirement_ids, ["r2"]);
  assert.equal(result.generation_errors[0].code, "PROVIDER_FAILED");
  assert.equal(result.generation_errors[0].pass, 1);
  assert.equal(result.generation_errors[1].code, "PROVIDER_FAILED");
  assert.equal(result.generation_errors[1].pass, 2);
});


test("Step 7 final questions feed Step 8 without changing question coverage", async () => {
  const requirements = [
    { id: "r1", text: "React", kind: "technical" as const, priority: "must" as const },
    { id: "r2", text: "Communication", kind: "behavioural" as const, priority: "nice" as const },
  ];

  const result = await generateQuestionSetWithCoverage(requirements, {
    provider: {
      async generate(request) {
        const match = request.userPrompt.match(/Requirement: ([^\n]+)/);
        const requirement = match?.[1] ?? "";
        return {
          questions: [{
            prompt: `Question for ${requirement}`,
            answer_outline: "outline",
            difficulty: requirement === "React" ? 3 : 1,
          }],
        };
      },
    },
  });

  assert.equal(result.coverage.can_ship, true);

  const schedule = buildSchedule(3, requirements, result.questions);
  const scheduledIds = schedule.flatMap((day) => day.question_ids);

  assert.deepEqual(scheduledIds, result.questions.map((question) => question.id));
  assert.deepEqual(schedule.map((day) => day.day), [1, 2, 3]);
  assert.ok(schedule.every((day) => Number.isInteger(day.minutes) && day.minutes >= 0));
});
