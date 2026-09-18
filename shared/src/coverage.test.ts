import test from "node:test";
import assert from "node:assert/strict";
import {
  checkCoverage,
  findUncoveredRequirements,
  findUncoveredMustHaveRequirements,
  allMustHaveRequirementsCovered,
} from "./coverage.js";

const requirements = [
  { id: "r1", text: "React", kind: "technical" as const, priority: "must" as const },
  { id: "r2", text: "Communication", kind: "behavioural" as const, priority: "nice" as const },
  { id: "r3", text: "SQL", kind: "technical" as const, priority: "must" as const },
];

const q = (id: string, requirement_ids: string[]) => ({
  id, requirement_ids, category: "technical" as const, prompt: id, answer_outline: "outline", difficulty: 2,
});

test("matches requirement IDs deterministically", () => {
  const result = checkCoverage(requirements, [q("q1", ["r1"]), q("q2", ["r1", "r3"])]);
  assert.deepEqual(result.covered_requirement_ids, ["r1", "r3"]);
  assert.deepEqual(result.uncovered_requirement_ids, ["r2"]);
});

test("detects uncovered must and nice requirements separately", () => {
  const result = checkCoverage(requirements, [q("q1", ["r1"])]);
  assert.deepEqual(result.uncovered_must_requirement_ids, ["r3"]);
  assert.deepEqual(result.uncovered_nice_requirement_ids, ["r2"]);
  assert.equal(result.can_ship, false);
});

test("invalid requirement references never count as coverage", () => {
  const result = checkCoverage(requirements, [q("q1", ["r_missing"])]);
  assert.deepEqual(result.covered_requirement_ids, []);
  assert.deepEqual(result.invalid_requirement_ids, ["r_missing"]);
  assert.equal(result.can_ship, false);
});

test("supports a question covering multiple requirements", () => {
  const result = checkCoverage(requirements, [q("q1", ["r1", "r3"])]);
  assert.deepEqual(result.covered_requirement_ids, ["r1", "r3"]);
});

test("handles empty questions and requirements", () => {
  const result = checkCoverage(requirements, []);
  assert.deepEqual(result.uncovered_requirement_ids, ["r1", "r2", "r3"]);
  assert.deepEqual(result.uncovered_must_requirement_ids, ["r1", "r3"]);
  assert.equal(result.can_ship, false);

  const empty = checkCoverage([], []);
  assert.deepEqual(empty.uncovered_requirement_ids, []);
  assert.equal(empty.can_ship, true);
});

test("preserves requirement order and deterministic invalid-id ordering", () => {
  const result = checkCoverage(requirements, [q("q1", ["z", "a"])]);
  assert.deepEqual(result.uncovered_requirement_ids, ["r1", "r2", "r3"]);
  assert.deepEqual(result.invalid_requirement_ids, ["a", "z"]);
});

test("legacy helpers use the deterministic coverage engine", () => {
  assert.deepEqual(findUncoveredRequirements(requirements, [q("q1", ["r1"])]).map(r => r.id), ["r2", "r3"]);
  assert.deepEqual(findUncoveredMustHaveRequirements(requirements, []).map(r => r.id), ["r1", "r3"]);
  assert.equal(allMustHaveRequirementsCovered(requirements, [q("q1", ["r1", "r3"])]), true);
});

test("passes is an integer in the coverage result", () => {
  assert.equal(checkCoverage(requirements, [q("q1", ["r1"])], 2.9).passes, 2);
});
