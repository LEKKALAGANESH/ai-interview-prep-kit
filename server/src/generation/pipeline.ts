import type { Question, Requirement } from "@trao/interview-prep-shared/kit.js";
import { checkCoverage, type CoverageResult } from "@trao/interview-prep-shared/coverage.js";
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

export async function generateInitialQuestionSet(
  requirements: Requirement[],
  options: InitialQuestionSetOptions = {},
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
