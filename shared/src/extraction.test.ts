import test from "node:test";
import assert from "node:assert/strict";
import { RawRoleExtractionSchema, normalizeRequirementText, normalizeRequirements, normalizeRoleExtraction, validateRequirementEvidence } from "./extraction.js";

test("validates the raw extraction contract", () => {
  const parsed = RawRoleExtractionSchema.parse({ title: "Senior Backend Engineer", seniority: "Senior", responsibilities: ["Build APIs"], requirements: [{ text: "Python", kind: "technical", priority: "must" }] });
  assert.equal(parsed.requirements[0].priority, "must");
});

test("normalizes requirement whitespace and punctuation", () => {
  assert.equal(normalizeRequirementText("  Experience   with React.js.  "), "Experience with React.js");
});

test("deduplicates equivalent wording and preserves must priority", () => {
  const requirements = normalizeRequirements([{ text: "Experience with React", kind: "technical", priority: "nice" }, { text: "React", kind: "technical", priority: "must" }]);
  assert.equal(requirements.length, 1);
  assert.equal(requirements[0].priority, "must");
  assert.match(requirements[0].id, /^r_[a-f0-9]{10}$/);
});

test("stable IDs are independent of extraction ordering", () => {
  const a = normalizeRequirements([{ text: "Python", kind: "technical", priority: "must" }, { text: "SQL", kind: "technical", priority: "nice" }]);
  const b = normalizeRequirements([{ text: "SQL", kind: "technical", priority: "nice" }, { text: "Python", kind: "technical", priority: "must" }]);
  const idsA = new Map(a.map((x) => [x.text, x.id]));
  const idsB = new Map(b.map((x) => [x.text, x.id]));
  assert.deepEqual(idsA, idsB);
});

test("requires evidence for extracted requirements", () => {
  const evidence = validateRequirementEvidence("We require Python and strong communication skills.", [
    { text: "Python", kind: "technical", priority: "nice" },
    { text: "AWS", kind: "technical", priority: "must" },
  ]);
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].requirement.text, "Python");
});

test("detects must and nice priority signals from the JD", () => {
  const evidence = validateRequirementEvidence("Python is required. React is preferred.", [
    { text: "Python", kind: "technical", priority: "nice" },
    { text: "React", kind: "technical", priority: "must" },
  ]);
  assert.deepEqual(evidence.map((x) => x.prioritySignal), ["must", "nice"]);
});

test("normalizes role with JD evidence safeguards", () => {
  const role = normalizeRoleExtraction({ title: "Developer", seniority: "", responsibilities: [], requirements: [
    { text: "Python", kind: "technical", priority: "nice" },
    { text: "AWS", kind: "technical", priority: "must" },
  ] }, "Python required.");
  assert.equal(role.requirements.length, 1);
  assert.equal(role.requirements[0].priority, "must");
});

test("does not invent requirements for a thin extraction", () => {
  const role = normalizeRoleExtraction({ title: "Developer", seniority: "", responsibilities: [], requirements: [{ text: "Python experience preferred", kind: "technical", priority: "nice" }] });
  assert.equal(role.requirements.length, 1);
});