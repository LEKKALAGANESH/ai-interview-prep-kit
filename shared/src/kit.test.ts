import test from "node:test";
import assert from "node:assert/strict";
import {
  KitSchema,
  EvaluationInputSchema,
  EvaluationOutputSchema,
} from "./kit.js";

const validKit = {
  source: {
    company: "Acme",
    company_url: "https://example.com",
    role: "Software Engineer",
    location: "Remote",
    jd_chars: 1200,
    researched_at: "2026-09-18T12:00:00.000Z",
    pages_used: ["https://example.com/careers"],
  },
  company_brief: {
    summary: "A concise company summary.",
    what_they_do: "Builds software.",
    sources: ["https://example.com/about"],
  },
  role: {
    title: "Software Engineer",
    seniority: "Entry-level",
    responsibilities: ["Build and test software"],
    requirements: [
      { id: "r1", text: "JavaScript experience", kind: "technical", priority: "must" },
      { id: "r2", text: "Communication skills", kind: "behavioural", priority: "nice" },
    ],
  },
  questions: [
    {
      id: "q1",
      requirement_ids: ["r1"],
      category: "technical",
      prompt: "Explain event-loop behaviour.",
      answer_outline: "Discuss the call stack and task queues.",
      difficulty: 2,
    },
  ],
  flashcards: [
    { id: "f1", front: "What is a closure?", back: "A function retaining lexical scope.", requirement_ids: ["r1"] },
  ],
  schedule: {
    days_available: 1,
    days: [{ day: 1, focus: "Core preparation", question_ids: ["q1"], minutes: 30 }],
  },
  coverage: {
    uncovered_requirement_ids: ["r2"],
    passes: 1,
  },
};

const expectInvalid = (mutate: (kit: any) => void) => {
  const kit = structuredClone(validKit);
  mutate(kit);
  assert.equal(KitSchema.safeParse(kit).success, false);
};

test("valid Appendix A kit parses", () => {
  assert.doesNotThrow(() => KitSchema.parse(validKit));
});

test("invalid difficulty is rejected with a useful path", () => {
  const kit = structuredClone(validKit);
  kit.questions[0].difficulty = 4;
  const result = KitSchema.safeParse(kit);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.deepEqual(result.error.issues[0].path, ["questions", 0, "difficulty"]);
  }
});

test("difficulty must be an integer from 1 through 3", () => {
  for (const value of [0, 3.5, 4, "2", null]) {
    expectInvalid((kit) => { kit.questions[0].difficulty = value; });
  }
});

test("non-integer schedule minutes are rejected with a useful path", () => {
  const kit = structuredClone(validKit);
  kit.schedule.days[0].minutes = 30.5;
  const result = KitSchema.safeParse(kit);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.deepEqual(result.error.issues[0].path, ["schedule", "days", 0, "minutes"]);
  }
});

test("schedule minutes must be a non-negative integer", () => {
  for (const value of [-1, 30.5, "30", null]) {
    expectInvalid((kit) => { kit.schedule.days[0].minutes = value; });
  }
});

test("invalid requirement kind is rejected with a useful path", () => {
  const kit = structuredClone(validKit);
  kit.role.requirements[0].kind = "soft-skill";
  const result = KitSchema.safeParse(kit);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.deepEqual(result.error.issues[0].path, ["role", "requirements", 0, "kind"]);
  }
});

test("requirement kind only accepts technical, behavioural, or domain", () => {
  for (const value of ["soft-skill", "soft_skill", "hr", "technical-behavioural", 1, null]) {
    expectInvalid((kit) => { kit.role.requirements[0].kind = value; });
  }
});

test("invalid question category is rejected with a useful path", () => {
  const kit = structuredClone(validKit);
  kit.questions[0].category = "hr";
  const result = KitSchema.safeParse(kit);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.deepEqual(result.error.issues[0].path, ["questions", 0, "category"]);
  }
});

test("question category only accepts the Appendix A categories", () => {
  for (const value of ["hr", "behavioral", "system_design", "company_fit", "coding", 1, null]) {
    expectInvalid((kit) => { kit.questions[0].category = value; });
  }
});

test("duplicate requirement IDs are rejected", () => {
  expectInvalid((kit) => {
    kit.role.requirements[1].id = "r1";
  });
});

test("duplicate question IDs are rejected", () => {
  expectInvalid((kit) => {
    kit.questions.push(structuredClone(kit.questions[0]));
  });
});

test("duplicate flashcard IDs are rejected", () => {
  expectInvalid((kit) => {
    kit.flashcards.push(structuredClone(kit.flashcards[0]));
  });
});

test("questions cannot reference unknown requirements", () => {
  expectInvalid((kit) => {
    kit.questions[0].requirement_ids = ["missing"];
  });
});

test("flashcards cannot reference unknown requirements", () => {
  expectInvalid((kit) => {
    kit.flashcards[0].requirement_ids = ["missing"];
  });
});

test("schedule cannot reference unknown questions", () => {
  expectInvalid((kit) => {
    kit.schedule.days[0].question_ids = ["missing"];
  });
});

test("coverage cannot reference unknown requirements", () => {
  expectInvalid((kit) => {
    kit.coverage.uncovered_requirement_ids = ["missing"];
  });
});

test("schedule must contain exactly days_available days", () => {
  expectInvalid((kit) => {
    kit.schedule.days = [];
  });
});

test("schedule day numbers must be exactly 1 through days_available", () => {
  expectInvalid((kit) => {
    kit.schedule.days[0].day = 2;
  });
});

test("Appendix B input accepts multiple cases", () => {
  assert.doesNotThrow(() =>
    EvaluationInputSchema.parse([
      { id: "a", jd: "Engineer", company_url: "https://example.com", days: 1 },
      { id: "b", jd: "Engineer", company_url: "https://example.org", days: 60 },
    ]),
  );
});

test("Appendix B output accepts success and failure cases", () => {
  const output = {
    version: "1.0",
    generated_at: "2026-09-18T12:00:00.000Z",
    kits: [
      { id: "a", status: "ok", kit: validKit, error: null },
      {
        id: "b",
        status: "failed",
        kit: null,
        error: { code: "RETRIEVAL_FAILED", message: "Company page unavailable" },
      },
    ],
  };
  assert.doesNotThrow(() => EvaluationOutputSchema.parse(output));
});
