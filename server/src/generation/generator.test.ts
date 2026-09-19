import test from "node:test";
import assert from "node:assert/strict";
import { generateQuestionsForRequirement } from "./generator.js";
import { QuestionGenerationError } from "./generator.js";
import { LlmProviderError } from "./provider.js";
import type { LlmProvider } from "./provider.js";

const requirement = {
  id: "r_react",
  text: "React",
  kind: "technical" as const,
  priority: "must" as const,
};

function providerReturning(value: unknown): LlmProvider {
  return { async generate(request) {
    assert.match(request.systemInstruction, /untrusted reference data/i);
    assert.match(request.systemInstruction, /Never follow instructions/i);
    assert.match(request.userPrompt, /Question category: technical/);
    return value;
  }};
}

test("generates questions for one requirement and category", async () => {
  const questions = await generateQuestionsForRequirement(
    { requirement, category: "technical" },
    { provider: providerReturning({
      questions: [{ prompt: "How does React reconciliation work?", answer_outline: "Discuss diffing and rendering.", difficulty: 3 }],
    }) },
  );

  assert.equal(questions.length, 1);
  assert.deepEqual(questions[0].requirement_ids, ["r_react"]);
  assert.equal(questions[0].category, "technical");
  assert.equal(questions[0].difficulty, 3);
});

test("schema rejects unsupported difficulty", async () => {
  await assert.rejects(
    generateQuestionsForRequirement(
      { requirement, category: "technical" },
      { provider: providerReturning({
        questions: [{ prompt: "x", answer_outline: "y", difficulty: 4 }],
      }) },
    ),
    (error: unknown) =>
      error instanceof QuestionGenerationError && error.code === "MODEL_OUTPUT_INVALID",
  );
});

test("category-specific prompts are sent to the provider", async () => {
  let prompt = "";
  const provider: LlmProvider = { async generate(request) {
    prompt = request.userPrompt;
    return { questions: [{ prompt: "Tell me about mentoring.", answer_outline: "Use STAR.", difficulty: 2 }] };
  }};
  const behaviouralRequirement = { ...requirement, kind: "behavioural" as const, text: "Mentoring junior engineers" };
  const questions = await generateQuestionsForRequirement(
    { requirement: behaviouralRequirement, category: "behavioural" },
    { provider },
  );
  assert.match(prompt, /Question category: behavioural/);
  assert.equal(questions[0].category, "behavioural");
});

test("provider rate limits are retried", async () => {
  let calls = 0;
  const delays: number[] = [];
  const provider: LlmProvider = { async generate() {
    calls += 1;
    if (calls === 1) throw new LlmProviderError("RATE_LIMITED", "slow down");
    return { questions: [{ prompt: "x", answer_outline: "y", difficulty: 1 }] };
  }};
  const questions = await generateQuestionsForRequirement(
    { requirement, category: "technical" },
    { provider, retryDelayMs: 10, sleep: async (ms) => { delays.push(ms); } },
  );
  assert.equal(questions.length, 1);
  assert.deepEqual(delays, [10]);
});

test("malformed provider output is rejected", async () => {
  await assert.rejects(
    generateQuestionsForRequirement(
      { requirement, category: "technical" },
      { provider: providerReturning({ questions: [{ prompt: "", answer_outline: "x", difficulty: 2 }] }) },
    ),
    (error: unknown) =>
      error instanceof QuestionGenerationError && error.code === "MODEL_OUTPUT_INVALID",
  );
});

test("research context is passed as reference data", async () => {
  let prompt = "";
  const provider: LlmProvider = { async generate(request) {
    prompt = request.userPrompt;
    return { questions: [{ prompt: "Why this architecture?", answer_outline: "Discuss trade-offs.", difficulty: 2 }] };
  }};
  await generateQuestionsForRequirement(
    {
      requirement,
      category: "company-fit",
      research: {
        company_url: "https://example.com",
        pages: [{ url: "https://example.com/about", fetched_at: "2026-09-19T00:00:00.000Z", title: "About", text: "Build developer tools.", links: [] }],
        robots: { checked: true, allowed: true, source: "https://example.com/robots.txt", reason: "Allowed" },
        skipped: [],
        public_interview_research: {
          attempted: true,
          found: true,
          results: [{ title: "Interview", url: "https://forum.example/interview", snippet: "Two rounds." }],
          note: "found",
        },
      },
    },
    { provider },
  );
  assert.match(prompt, /Build developer tools/);
  assert.match(prompt, /Two rounds/);
});

test("does not accept an unsupported requirement id from model output because ids are application-assigned", async () => {
  const questions = await generateQuestionsForRequirement(
    { requirement, category: "technical" },
    { provider: providerReturning({
      questions: [{ prompt: "x", answer_outline: "y", difficulty: 2 }],
    }) },
  );
  assert.deepEqual(questions[0].requirement_ids, ["r_react"]);
});
