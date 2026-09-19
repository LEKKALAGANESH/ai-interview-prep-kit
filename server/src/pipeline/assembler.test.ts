import test from "node:test";
import assert from "node:assert/strict";
import { assembleKit } from "./assembler.js";
import type { CompanyBrief, Requirement, Role } from "@trao/interview-prep-shared/kit.js";

const requirements: Requirement[] = [
  { id: "r1", text: "React", kind: "technical", priority: "must" },
  { id: "r2", text: "Communication", kind: "behavioural", priority: "nice" },
];

const role: Role = {
  title: "Frontend Engineer",
  seniority: "Junior",
  responsibilities: ["Build interfaces"],
  requirements,
};

const companyBrief: CompanyBrief = {
  summary: "A software company",
  what_they_do: "Build software",
  sources: ["https://example.com/about"],
};

const research = {
  company_url: "https://example.com/",
  pages: [{ url: "https://example.com/", title: "Home", text: "Company", links: [] }],
  robots: { checked: true, allowed: true, source: "https://example.com/robots.txt", reason: "allowed" },
  skipped: [],
  public_interview_research: {
    attempted: false,
    found: false,
    results: [],
    note: "No provider configured",
  },
};

const questions = [
  {
    id: "q_r1_technical_1",
    requirement_ids: ["r1"],
    category: "technical" as const,
    prompt: "How do you build a React component?",
    answer_outline: "Explain component composition.",
    difficulty: 3,
  },
  {
    id: "q_r2_behavioural_1",
    requirement_ids: ["r2"],
    category: "behavioural" as const,
    prompt: "Describe a communication challenge.",
    answer_outline: "Use STAR.",
    difficulty: 1,
  },
];

test("assembles a schema-valid kit from final questions and coverage", () => {
  const kit = assembleKit(
    {
      job_description: "React frontend engineer",
      company_url: "https://example.com/",
      days_available: 2,
    },
    { company: "Example", role, companyBrief, research },
    questions,
    {
      uncovered_requirement_ids: [],
      passes: 1,
    },
  );

  assert.equal(kit.source.jd_chars, "React frontend engineer".length);
  assert.equal(kit.schedule.days_available, 2);
  assert.equal(kit.flashcards.length, 2);
  assert.equal(kit.flashcards[0].front, questions[0].prompt);
  assert.deepEqual(kit.flashcards[0].requirement_ids, ["r1"]);
  assert.deepEqual(
    kit.schedule.days.flatMap((day) => day.question_ids),
    questions.map((question) => question.id),
  );
});

test("does not assemble a kit when a must-have requirement remains uncovered", () => {
  assert.throws(
    () =>
      assembleKit(
        {
          job_description: "React frontend engineer",
          company_url: "https://example.com/",
          days_available: 1,
        },
        { company: "Example", role, companyBrief, research },
        [questions[1]],
        {
          uncovered_requirement_ids: ["r1"],
          passes: 2,
        },
      ),
    /uncovered must-have requirements/,
  );
});

test("rejects invalid question requirement references before persistence", () => {
  assert.throws(
    () =>
      assembleKit(
        {
          job_description: "React frontend engineer",
          company_url: "https://example.com/",
          days_available: 1,
        },
        { company: "Example", role, companyBrief, research },
        [{
          ...questions[0],
          requirement_ids: ["missing"],
        }],
        {
          uncovered_requirement_ids: [],
          passes: 1,
        },
      ),
    /Final kit failed schema validation/,
  );
});
