import test from "node:test";
import assert from "node:assert/strict";
import { buildSchedule } from "./schedule.js";
import type { Question, Requirement } from "./kit.js";

const requirements: Requirement[] = [
  { id: "r1", text: "React", kind: "technical", priority: "must" },
  { id: "r2", text: "Communication", kind: "behavioural", priority: "nice" },
];

const questions: Question[] = [
  {
    id: "q2",
    requirement_ids: ["r2"],
    category: "behavioural",
    prompt: "Communication?",
    answer_outline: "Use STAR",
    difficulty: 3,
  },
  {
    id: "q1",
    requirement_ids: ["r1"],
    category: "technical",
    prompt: "React?",
    answer_outline: "Components",
    difficulty: 2,
  },
];

test("builds exactly the requested number of schedule days", () => {
  const schedule = buildSchedule(3, requirements, questions);

  assert.equal(schedule.length, 3);
  assert.deepEqual(schedule.map((day) => day.day), [1, 2, 3]);
});

test("prioritizes must-have requirements before nice-to-have requirements", () => {
  const schedule = buildSchedule(1, requirements, questions);

  assert.deepEqual(schedule[0].question_ids, ["q1", "q2"]);
});

test("schedule minutes are integer values", () => {
  const schedule = buildSchedule(2, requirements, questions);

  assert.ok(schedule.every((day) => Number.isInteger(day.minutes)));
  assert.ok(schedule.every((day) => day.minutes >= 0));
});

test("rejects days outside the 1 through 60 range", () => {
  for (const days of [0, -1, 1.5, 61]) {
    assert.throws(() => buildSchedule(days, requirements, questions));
  }
});

test("supports 1-day and 60-day schedules", () => {
  assert.equal(buildSchedule(1, requirements, questions).length, 1);
  assert.equal(buildSchedule(60, requirements, questions).length, 60);
});
