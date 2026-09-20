import type { CompanyBrief, Question, Requirement } from "@trao/interview-prep-shared/kit.js";
import type { ResearchResult } from "../retrieval/research.js";
import { createConfiguredLlmProvider, LlmProviderError, type LlmProvider } from "./provider.js";
import { buildCategoryBatchPrompt, buildQuestionGenerationPrompt } from "./prompts.js";
import { buildResearchEvidencePacket } from "../retrieval/research.js";
import { GeneratedCategoryBatchSchema, GeneratedQuestionBatchSchema } from "./schema.js";
import { observeStage, type GenerationObserver } from "./observability.js";

export type QuestionCategory = Question["category"];

export type QuestionGenerationContext = {
  requirement: Requirement;
  category: QuestionCategory;
  objective?: string;
  difficulty?: 1 | 2 | 3;
  companyBrief?: CompanyBrief;
  research?: ResearchResult;
};

export type GenerateQuestionOptions = {
  provider?: LlmProvider;
  fetchImpl?: typeof fetch;
  attempts?: number;
  retryDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  observer?: GenerationObserver;
};

export class QuestionGenerationError extends Error {
  constructor(
    public readonly code:
      | "PROVIDER_NOT_CONFIGURED"
      | "PROVIDER_FAILED"
      | "MODEL_OUTPUT_INVALID"
      | "NO_QUESTIONS_GENERATED",
    message: string,
  ) {
    super(message);
    this.name = "QuestionGenerationError";
  }
}


// Providers say how long to wait ("Please try again in 6.1s" / "in 250ms"); honour it, capped at 60s.
function retryHintMs(error: unknown): number {
  const text = error instanceof LlmProviderError ? `${error.details?.upstream_message ?? ""} ${error.message}` : "";
  const match = text.match(/try again in (\d+(?:\.\d+)?)\s*(ms|s|m)\b/i);
  if (!match) return 0;
  const unit = match[2].toLowerCase() === "ms" ? 1 : match[2].toLowerCase() === "m" ? 60_000 : 1000;
  return Math.min(60_000, Math.ceil(Number(match[1]) * unit) + 500);
}

async function callWithRetry(
  provider: LlmProvider,
  request: { systemInstruction: string; userPrompt: string },
  options: GenerateQuestionOptions,
): Promise<unknown> {
  // Free-tier 429/503 spikes last seconds, not milliseconds: 4 attempts waiting 2s, 4s, 8s.
  const attempts = Math.max(1, options.attempts ?? 4);
  const retryDelayMs = options.retryDelayMs ?? 2000;
  const sleep = options.sleep ?? ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await provider.generate(request);
    } catch (error) {
      lastError = error;
      const retryable =
        error instanceof LlmProviderError &&
        (error.code === "RATE_LIMITED" || error.code === "TRANSIENT");
      if (!retryable || attempt === attempts) throw error;
      await sleep(Math.max(retryDelayMs * 2 ** (attempt - 1), retryHintMs(error)));
    }
  }

  throw lastError;
}

export async function generateQuestionsForRequirement(
  context: QuestionGenerationContext,
  options: GenerateQuestionOptions = {},
): Promise<Question[]> {
  const provider = options.provider ?? createConfiguredLlmProvider(options.fetchImpl);
  if (!provider) {
    throw new QuestionGenerationError(
      "PROVIDER_NOT_CONFIGURED",
      "No LLM provider is configured",
    );
  }

  let raw: unknown;
  try {
    const prompt = buildQuestionGenerationPrompt({
      requirementId: context.requirement.id,
      requirementText: context.requirement.text,
      requirementKind: context.requirement.kind,
      requirementPriority: context.requirement.priority,
      category: context.category,
      objective: context.objective ?? `Assess practical understanding and application of: ${context.requirement.text}`,
      difficulty: context.difficulty ?? 2,
      companyBrief: context.companyBrief,
      evidencePacket: context.research ? buildResearchEvidencePacket(context.research, context.requirement.text) : "No supporting evidence available.",
    });
    raw = await observeStage(options.observer, "generation", () => callWithRetry(provider, prompt, options));
  } catch (error) {
    throw new QuestionGenerationError(
      "PROVIDER_FAILED",
      error instanceof Error ? error.message : "Question generation failed",
    );
  }

  const parsed = GeneratedQuestionBatchSchema.safeParse(raw);
  if (!parsed.success) {
    throw new QuestionGenerationError(
      "MODEL_OUTPUT_INVALID",
      "Question generation returned invalid structured data",
    );
  }

  const questions = parsed.data.questions.map((question, index) => ({
    id: `q_${context.requirement.id}_${context.category}_${index + 1}`,
    requirement_ids: [context.requirement.id],
    category: context.category,
    prompt: question.prompt,
    answer_outline: question.answer_outline,
    difficulty: question.difficulty,
  }));

  if (!questions.length) {
    throw new QuestionGenerationError(
      "NO_QUESTIONS_GENERATED",
      "Question generation returned no questions",
    );
  }

  return questions;
}

export async function generateQuestionsByCategory(
  requirement: Requirement,
  category: QuestionCategory,
  options: GenerateQuestionOptions = {},
): Promise<Question[]> {
  return generateQuestionsForRequirement({ requirement, category }, options);
}

export type CategoryBatchItemInput = { requirement: Requirement; objective?: string; difficulty?: 1 | 2 | 3 };

// One provider call for all requirements of one category. Requirements the model skips simply get no
// questions, so the deterministic coverage check and repair pass handle them.
export async function generateQuestionsForCategoryBatch(
  items: CategoryBatchItemInput[],
  category: QuestionCategory,
  context: { companyBrief?: CompanyBrief; research?: ResearchResult } = {},
  options: GenerateQuestionOptions = {},
): Promise<Question[]> {
  const provider = options.provider ?? createConfiguredLlmProvider(options.fetchImpl);
  if (!provider) throw new QuestionGenerationError("PROVIDER_NOT_CONFIGURED", "No LLM provider is configured");

  let raw: unknown;
  try {
    const prompt = buildCategoryBatchPrompt({
      category,
      items: items.map(({ requirement, objective, difficulty }) => ({
        requirementId: requirement.id,
        text: requirement.text,
        kind: requirement.kind,
        priority: requirement.priority,
        objective: objective ?? `Assess practical understanding and application of: ${requirement.text}`,
        difficulty: difficulty ?? 2,
      })),
      companyBrief: context.companyBrief,
      evidencePacket: context.research
        ? buildResearchEvidencePacket(context.research, items.map((item) => item.requirement.text).join(" "))
        : "No supporting evidence available.",
    });
    raw = await observeStage(options.observer, "generation", () => callWithRetry(provider, prompt, options));
  } catch (error) {
    throw new QuestionGenerationError("PROVIDER_FAILED", error instanceof Error ? error.message : "Question generation failed");
  }

  let parsed = GeneratedCategoryBatchSchema.safeParse(raw);
  if (!parsed.success && items.length === 1) {
    // A single-requirement batch may come back in the flat {"questions":[...]} shape; the owner of that id is unambiguous.
    const flat = GeneratedQuestionBatchSchema.safeParse(raw);
    if (flat.success) parsed = GeneratedCategoryBatchSchema.safeParse({ items: [{ requirement_id: items[0].requirement.id, questions: flat.data.questions }] });
  }
  if (!parsed.success) {
    throw new QuestionGenerationError("MODEL_OUTPUT_INVALID", "Question generation returned invalid structured data");
  }

  const supplied = new Set(items.map((item) => item.requirement.id));
  const questions: Question[] = [];
  const perRequirement = new Map<string, number>(); // keeps ids unique if the model repeats a requirement_id
  for (const entry of parsed.data.items) {
    if (!supplied.has(entry.requirement_id)) continue;
    entry.questions.forEach((question) => questions.push({
      id: `q_${entry.requirement_id}_${category}_${perRequirement.set(entry.requirement_id, (perRequirement.get(entry.requirement_id) ?? 0) + 1).get(entry.requirement_id)}`,
      requirement_ids: [entry.requirement_id],
      category,
      prompt: question.prompt,
      answer_outline: question.answer_outline,
      difficulty: question.difficulty as 1 | 2 | 3,
    }));
  }
  if (!questions.length) throw new QuestionGenerationError("NO_QUESTIONS_GENERATED", "Question generation returned no questions");
  return questions;
}
