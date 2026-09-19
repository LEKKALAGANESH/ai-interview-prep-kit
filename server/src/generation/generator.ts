import type { CompanyBrief, Question, Requirement } from "@trao/interview-prep-shared/kit.js";
import type { ResearchResult } from "../retrieval/research.js";
import { createConfiguredLlmProvider, LlmProviderError, type LlmProvider } from "./provider.js";
import { buildQuestionGenerationPrompt } from "./prompts.js";
import { buildResearchEvidencePacket } from "../retrieval/research.js";
import { GeneratedQuestionBatchSchema } from "./schema.js";
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


async function callWithRetry(
  provider: LlmProvider,
  request: { systemInstruction: string; userPrompt: string },
  options: GenerateQuestionOptions,
): Promise<unknown> {
  const attempts = Math.max(1, options.attempts ?? 2);
  const retryDelayMs = options.retryDelayMs ?? 250;
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
      await sleep(retryDelayMs * 2 ** (attempt - 1));
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
      evidencePacket: context.research ? buildResearchEvidencePacket(context.research) : "No supporting evidence available.",
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
