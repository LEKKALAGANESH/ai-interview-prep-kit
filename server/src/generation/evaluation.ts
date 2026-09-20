import type { Question, Requirement } from "@trao/interview-prep-shared/kit.js";
import { assessQuestionQuality } from "./quality.js";

export type SemanticJudge = {
  judge(input: {
    requirement: Requirement;
    question: Question;
    evidence: string;
  }): Promise<{
    relevance: number;
    specificity: number;
    groundedness: number;
    answer_usefulness: number;
    difficulty_fit: number;
    diversity: number;
    rationale: string;
  }>;
};

export type QuestionEvaluation = {
  deterministic: ReturnType<typeof assessQuestionQuality>;
  semantic?: Awaited<ReturnType<SemanticJudge["judge"]>>;
};

export async function evaluateQuestion(
  requirement: Requirement,
  question: Question,
  evidence: string,
  judge?: SemanticJudge,
): Promise<QuestionEvaluation> {
  const deterministic = assessQuestionQuality(question, requirement);
  const semantic = judge ? await judge.judge({ requirement, question, evidence }) : undefined;
  return { deterministic, semantic };
}
