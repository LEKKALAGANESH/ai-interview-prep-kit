import type { Question, Requirement } from "@trao/interview-prep-shared/kit.js";
import {
  checkCoverage,
  findUncoveredRequirements,
  type CoverageResult,
} from "@trao/interview-prep-shared/coverage.js";
import type { ResearchResult } from "../retrieval/research.js";
import { generateQuestionsForRequirement, type GenerateQuestionOptions } from "./generator.js";

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

export type CompleteQuestionSetWithCoverage = InitialQuestionSetWithCoverage & {
  maxPasses: number;
};

export type QuestionSetGenerationOptions = InitialQuestionSetOptions & {
  maxPasses?: number;
};

export async function generateQuestionSetWithCoverage(
  requirements: Requirement[],
  options: QuestionSetGenerationOptions = {},
): Promise<CompleteQuestionSetWithCoverage> {
  const maxPasses = Math.max(1, Math.trunc(options.maxPasses ?? 2));
  let questions = await generateInitialQuestionSet(requirements, options);
  let coverage = checkCoverage(requirements, questions, 1);

  if (coverage.can_ship || maxPasses === 1) {
    return { questions, coverage, maxPasses };
  }

  for (let pass = 2; pass <= maxPasses; pass += 1) {
    const missingRequirements = findUncoveredRequirements(requirements, questions);

    if (missingRequirements.length === 0) {
      coverage = checkCoverage(requirements, questions, pass);
      break;
    }

    const previousQuestionCount = questions.length;
    const repairQuestions = await generateQuestionsForRequirements(
      missingRequirements,
      options,
    );

    questions = [...questions, ...repairQuestions];
    coverage = checkCoverage(requirements, questions, pass);

    if (questions.length === previousQuestionCount) {
      break;
    }

    if (coverage.can_ship) {
      break;
    }
  }

  return { questions, coverage, maxPasses };
}
