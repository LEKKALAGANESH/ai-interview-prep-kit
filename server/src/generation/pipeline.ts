import type { Question, Requirement } from "@trao/interview-prep-shared/kit.js";
import {
  checkCoverage,
  findUncoveredRequirements,
  type CoverageResult,
} from "@trao/interview-prep-shared/coverage.js";
import type { ResearchResult } from "../retrieval/research.js";
import {
  generateQuestionsForRequirement,
  QuestionGenerationError,
  type GenerateQuestionOptions,
} from "./generator.js";

export type InitialQuestionSetOptions = GenerateQuestionOptions & {
  companyBrief?: {
    summary: string;
    what_they_do: string;
    sources: string[];
  };
  research?: ResearchResult;
};

function categoryForRequirement(requirement: Requirement): Question["category"] {
  if (requirement.kind === "behavioural") return "behavioural";
  if (requirement.kind === "domain") return "system-design";
  return "technical";
}

async function generateQuestionsForRequirements(
  requirements: Requirement[],
  options: InitialQuestionSetOptions,
): Promise<Question[]> {
  const questions: Question[] = [];

  for (const requirement of requirements) {
    const category = categoryForRequirement(requirement);
    questions.push(
      ...(await generateQuestionsForRequirement(
        {
          requirement,
          category,
          companyBrief: options.companyBrief,
          research: options.research,
        },
        options,
      )),
    );
  }

  return questions;
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

async function generateBestEffortPass(
  requirements: Requirement[],
  options: InitialQuestionSetOptions,
  pass: number,
  generationErrors: QuestionGenerationAttemptError[],
): Promise<Question[]> {
  const questions: Question[] = [];

  for (const requirement of requirements) {
    try {
      questions.push(
        ...(await generateQuestionsForRequirements([requirement], options)),
      );
    } catch (error) {
      generationErrors.push({
        requirement_id: requirement.id,
        pass,
        code: error instanceof QuestionGenerationError ? error.code : "UNKNOWN",
        message: error instanceof Error ? error.message : "Question generation failed",
      });
    }
  }

  return questions;
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

  if (coverage.can_ship || maxPasses === 1) {
    return { questions, coverage, maxPasses, generation_errors: generationErrors };
  }

  for (let pass = 2; pass <= maxPasses; pass += 1) {
    const missingRequirements = findUncoveredRequirements(requirements, questions);

    if (missingRequirements.length === 0) {
      coverage = checkCoverage(requirements, questions, pass);
      break;
    }

    const previousQuestionCount = questions.length;
    const repairQuestions = await generateBestEffortPass(
      missingRequirements,
      options,
      pass,
      generationErrors,
    );

    questions = [...questions, ...repairQuestions];
    coverage = checkCoverage(requirements, questions, pass);

    if (questions.length === previousQuestionCount || coverage.can_ship) {
      break;
    }
  }

  return { questions, coverage, maxPasses, generation_errors: generationErrors };
}
