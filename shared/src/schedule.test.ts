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

test("places harder questions earlier within the same priority", () => {
  const schedule = buildSchedule(1, requirements, [
    { ...questions[0], difficulty: 1 },
    { ...questions[1], requirement_ids: ["r1"], difficulty: 3 },
  ]);
  assert.deepEqual(schedule[0].question_ids, ["q2", "q1"]);
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


test("generates deterministic requirement-based focus text", () => {
  const schedule = buildSchedule(1, requirements, questions);
  assert.equal(schedule[0].focus, "React, Communication");
});

test("does not duplicate or lose question IDs across the schedule", () => {
  const schedule = buildSchedule(2, requirements, [
    ...questions,
    { ...questions[0], id: "q3", difficulty: 1 },
  ]);
  const ids = schedule.flatMap((day) => day.question_ids);
  assert.deepEqual(ids, ["q2", "q1", "q3"]);
  assert.equal(new Set(ids).size, questions.length + 1);
});

test("supports more days than questions without duplicating assignments", () => {
  const schedule = buildSchedule(4, requirements, questions);
  assert.deepEqual(schedule.map((day) => day.question_ids), [["q2"], ["q1"], [], []]);
  assert.deepEqual(schedule.map((day) => day.minutes), [10, 10, 0, 0]);
  assert.ok(schedule.every((day) => Number.isInteger(day.minutes) && day.minutes >= 0));
});

test("supports an empty question set with valid days", () => {
  const schedule = buildSchedule(3, requirements, []);
  assert.equal(schedule.length, 3);
  assert.deepEqual(schedule.map((day) => day.day), [1, 2, 3]);
  assert.deepEqual(schedule.map((day) => day.question_ids), [[], [], []]);
  assert.deepEqual(schedule.map((day) => day.minutes), [0, 0, 0]);
  assert.ok(schedule.every((day) => day.focus === "Review fundamentals"));
});

test("preserves deterministic ordering for mixed priorities and difficulties", () => {
  const schedule = buildSchedule(1, requirements, [
    { ...questions[0], id: "q4", difficulty: 1 },
    { ...questions[0], id: "q5", difficulty: 3 },
    { ...questions[1], id: "q6", difficulty: 2 },
  ]);
  assert.deepEqual(schedule[0].question_ids, ["q5", "q4", "q6"]);
});

test("rejects non-integer and out-of-range day counts", () => {
  assert.throws(() => buildSchedule(0, requirements, questions), /1 and 60/);
  assert.throws(() => buildSchedule(60.1, requirements, questions), /1 and 60/);
  assert.throws(() => buildSchedule(61, requirements, questions), /1 and 60/);
});
