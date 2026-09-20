import type { Question, Requirement } from "@trao/interview-prep-shared/kit.js";
import {
  checkCoverage,
  findUncoveredRequirements,
  type CoverageResult,
} from "@trao/interview-prep-shared/coverage.js";
import type { ResearchResult } from "../retrieval/research.js";
import {
  generateQuestionsForCategoryBatch,
  generateQuestionsForRequirement,
  QuestionGenerationError,
  type GenerateQuestionOptions,
} from "./generator.js";
import { buildQuestionPlan, type QuestionPlan } from "./planner.js";
import { filterDuplicateQuestions } from "./quality.js";
import type { Role } from "@trao/interview-prep-shared/kit.js";
import { observeStage } from "./observability.js";

export type InitialQuestionSetOptions = GenerateQuestionOptions & {
  companyBrief?: {
    summary: string;
    what_they_do: string;
    sources: string[];
  };
  research?: ResearchResult;
  role?: Role;
};

async function generateQuestionsForPlans(
  plans: QuestionPlan[],
  requirements: Requirement[],
  options: InitialQuestionSetOptions,
): Promise<Question[]> {
  const questions: Question[] = [];
  const byId = new Map(requirements.map((item) => [item.id, item]));
  for (const plan of plans) {
    const requirement = byId.get(plan.requirement_id);
    if (!requirement) continue;
    questions.push(
      ...(await generateQuestionsForRequirement(
        {
          requirement,
          category: plan.category,
          objective: plan.objective,
          difficulty: plan.difficulty,
          companyBrief: options.companyBrief,
          research: options.research,
        },
        options,
      )),
    );
  }
  return filterDuplicateQuestions(questions);
}

async function generateQuestionsForRequirements(
  requirements: Requirement[],
  options: InitialQuestionSetOptions,
): Promise<Question[]> {
  const plans = await observeStage(options.observer, "planning", async () => buildQuestionPlan(requirements, options.role));
  return generateQuestionsForPlans(plans, requirements, options);
}

export async function generateInitialQuestionSet(
  requirements: Requirement[],
  options: InitialQuestionSetOptions = {},
): Promise<Question[]> {
  return generateQuestionsForRequirements(requirements, options);
}

export type InitialQuestionSetWithCoverage = {
  questions: Question[];
  coverage: CoverageResult;
};

export async function generateInitialQuestionSetWithCoverage(
  requirements: Requirement[],
  options: InitialQuestionSetOptions = {},
): Promise<InitialQuestionSetWithCoverage> {
  const questions = await generateInitialQuestionSet(requirements, options);
  return {
    questions,
    coverage: checkCoverage(requirements, questions, 1),
  };
}

export type QuestionGenerationAttemptError = {
  requirement_id: string;
  pass: number;
  code: string;
  message: string;
};

export type CompleteQuestionSetWithCoverage = InitialQuestionSetWithCoverage & {
  maxPasses: number;
  generation_errors: QuestionGenerationAttemptError[];
};

export type QuestionSetGenerationOptions = InitialQuestionSetOptions & {
  maxPasses?: number;
};

// Free-tier providers (e.g. Groq) limit tokens per minute; parallel calls trip that and drop requirements. Override with LLM_CONCURRENCY.
const QUESTION_CONCURRENCY = Math.max(1, Number(process.env.LLM_CONCURRENCY) || 2);

async function generateBestEffortPass(
  requirements: Requirement[],
  options: InitialQuestionSetOptions,
  pass: number,
  generationErrors: QuestionGenerationAttemptError[],
): Promise<Question[]> {
  // One provider call per question category (not per requirement): fewer calls and smaller total prompts on free tiers.
  const plans = await observeStage(options.observer, "planning", async () => buildQuestionPlan(requirements, options.role));
  const byId = new Map(requirements.map((item) => [item.id, item]));
  const groups = new Map<QuestionPlan["category"], QuestionPlan[]>();
  for (const plan of plans) groups.set(plan.category, [...(groups.get(plan.category) ?? []), plan]);
  const batches = [...groups.entries()];

  // Bounded concurrency; results are stored by index so output order stays deterministic.
  const results = new Array<Question[]>(batches.length).fill([]);
  const errors = new Array<QuestionGenerationAttemptError[]>(batches.length).fill([]);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < batches.length) {
      const index = cursor++;
      const [category, categoryPlans] = batches[index];
      try {
        results[index] = await generateQuestionsForCategoryBatch(
          categoryPlans.flatMap((plan) => {
            const requirement = byId.get(plan.requirement_id);
            return requirement ? [{ requirement, objective: plan.objective, difficulty: plan.difficulty }] : [];
          }),
          category,
          { companyBrief: options.companyBrief, research: options.research },
          options,
        );
      } catch (error) {
        errors[index] = categoryPlans.map((plan) => ({
          requirement_id: plan.requirement_id,
          pass,
          code: error instanceof QuestionGenerationError ? error.code : "UNKNOWN",
          message: error instanceof Error ? error.message : "Question generation failed",
        }));
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(QUESTION_CONCURRENCY, batches.length) }, worker));
  generationErrors.push(...errors.flat());
  return filterDuplicateQuestions(results.flat());
}

export async function generateQuestionSetWithCoverage(
  requirements: Requirement[],
  options: QuestionSetGenerationOptions = {},
): Promise<CompleteQuestionSetWithCoverage> {
  const maxPasses = Math.max(1, Math.trunc(options.maxPasses ?? 2));
  const generationErrors: QuestionGenerationAttemptError[] = [];

  let questions = await generateBestEffortPass(
    requirements,
    options,
    1,
    generationErrors,
  );
  let coverage = checkCoverage(requirements, questions, 1);

  if (findUncoveredRequirements(requirements, questions).length === 0 || maxPasses === 1) {
    return { questions, coverage, maxPasses, generation_errors: generationErrors };
  }

  for (let pass = 2; pass <= maxPasses; pass += 1) {
    const missingRequirements = findUncoveredRequirements(requirements, questions);

    if (missingRequirements.length === 0) {
      coverage = checkCoverage(requirements, questions, pass);
      break;
    }

    const previousQuestionCount = questions.length;
    const repairQuestions = await observeStage(options.observer, "repair", () => generateBestEffortPass(
      missingRequirements,
      options,
      pass,
      generationErrors,
    ), { attempt: pass });

    questions = [...questions, ...repairQuestions];
    coverage = checkCoverage(requirements, questions, pass);

    if (questions.length === previousQuestionCount || findUncoveredRequirements(requirements, questions).length === 0) {
      break;
    }
  }

  return { questions, coverage, maxPasses, generation_errors: generationErrors };
}
