import test from "node:test";
import assert from "node:assert/strict";
import {
  RawRoleExtractionSchema,
  normalizeRequirementText,
  normalizeRequirements,
  normalizeRoleExtraction,
} from "./extraction.js";

test("validates the raw extraction contract", () => {
  const parsed = RawRoleExtractionSchema.parse({
    title: "Senior Backend Engineer",
    seniority: "Senior",
    responsibilities: ["Build APIs"],
    requirements: [
      { text: "Python", kind: "technical", priority: "must" },
    ],
  });

  assert.equal(parsed.requirements[0].priority, "must");
});

test("normalizes requirement whitespace and punctuation", () => {
  assert.equal(
    normalizeRequirementText("  Experience   with React.js.  "),
    "Experience with React.js",
  );
});

test("deduplicates equivalent requirement wording", () => {
  const requirements = normalizeRequirements([
    { text: "Experience with React", kind: "technical", priority: "nice" },
    { text: "React", kind: "technical", priority: "must" },
  ]);

  assert.equal(requirements.length, 1);
  assert.equal(requirements[0].text, "Experience with React");
  assert.equal(requirements[0].priority, "must");
  assert.equal(requirements[0].id, "r1");
});

test("assigns stable sequential requirement IDs", () => {
  const role = normalizeRoleExtraction({
    title: "Engineer",
    seniority: "",
    responsibilities: ["  Build systems  "],
    requirements: [
      { text: "Python", kind: "technical", priority: "must" },
      { text: "Communication", kind: "behavioural", priority: "nice" },
    ],
  });

  assert.deepEqual(role.requirements.map((item) => item.id), ["r1", "r2"]);
  assert.deepEqual(role.responsibilities, ["Build systems"]);
});

test("does not invent requirements for a thin extraction", () => {
  const role = normalizeRoleExtraction({
    title: "Developer",
    seniority: "",
    responsibilities: [],
    requirements: [
      { text: "Python experience preferred", kind: "technical", priority: "nice" },
    ],
  });

  assert.equal(role.requirements.length, 1);
  assert.equal(role.requirements[0].text, "Python experience preferred");
});
