import type { EvaluationOutput } from "@trao/interview-prep-shared/kit.js";
import { assessQuestionQuality } from "@trao/interview-prep-server/generation/quality.js";

export type QualityScorecard = {
  total_cases: number;
  successful_cases: number;
  failed_cases: number;
  schema_valid_cases: number;
  must_have_coverage_cases: number;
  average_questions_per_success: number;
  average_relevance: number;
  average_specificity: number;
  average_answer_usefulness: number;
  average_difficulty_fit: number;
};

export function buildQualityScorecard(output: EvaluationOutput): QualityScorecard {
  const successful = output.kits.filter((item) => item.status === "ok" && item.kit);
  const quality = successful.flatMap((item) => item.kit?.questions.flatMap((question) => {
    const requirement = item.kit?.role.requirements.find((r) => question.requirement_ids.includes(r.id));
    return requirement ? [assessQuestionQuality(question, requirement, item.kit?.questions.filter((q) => q.id !== question.id))] : [];
  }) ?? []);
  const average = (key: "relevance" | "specificity" | "answer_usefulness" | "difficulty_fit") => quality.length ? quality.reduce((sum, item) => sum + item[key], 0) / quality.length : 0;
  const average_questions_per_success = successful.length
    ? successful.reduce((sum, item) => sum + (item.kit?.questions.length ?? 0), 0) / successful.length
    : 0;
  return {
    total_cases: output.kits.length,
    successful_cases: successful.length,
    failed_cases: output.kits.length - successful.length,
    schema_valid_cases: successful.length,
    must_have_coverage_cases: successful.filter((item) => !(item.kit?.coverage.uncovered_requirement_ids ?? []).some(
      (id) => item.kit?.role.requirements.some((r) => r.id === id && r.priority === "must"),
    )).length,
    average_questions_per_success,
    average_relevance: average("relevance"),
    average_specificity: average("specificity"),
    average_answer_usefulness: average("answer_usefulness"),
    average_difficulty_fit: average("difficulty_fit"),
  };
}
