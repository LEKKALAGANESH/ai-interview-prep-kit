import test from "node:test";
import assert from "node:assert/strict";
import {
  findUncoveredRequirements,
  findUncoveredMustHaveRequirements,
  allMustHaveRequirementsCovered,
} from "./coverage.js";

const requirements = [
  { id: "r1", text: "React", kind: "technical" as const, priority: "must" as const },
  { id: "r2", text: "Communication", kind: "behavioural" as const, priority: "nice" as const },
];

const questions = [
  {
    id: "q1",
    requirement_ids: ["r1"],
    category: "technical" as const,
    prompt: "React?",
    answer_outline: "Components",
    difficulty: 1,
  },
];

test("finds uncovered requirements", () => {
  assert.deepEqual(
    findUncoveredRequirements(requirements, questions).map((r) => r.id),
    ["r2"],
  );
});

test("must-have coverage uses priority instead of legacy must field", () => {
  assert.equal(allMustHaveRequirementsCovered(requirements, questions), true);
});

test("reports uncovered must-have requirements separately", () => {
  const uncovered = findUncoveredMustHaveRequirements(
    requirements,
    [],
  );

  assert.deepEqual(uncovered.map((r) => r.id), ["r1"]);
  assert.equal(allMustHaveRequirementsCovered(requirements, []), false);
});
