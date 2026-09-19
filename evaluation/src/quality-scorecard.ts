import type { EvaluationOutput } from "@trao/interview-prep-shared/kit.js";

export type QualityScorecard = {
  total_cases: number;
  successful_cases: number;
  failed_cases: number;
  schema_valid_cases: number;
  must_have_coverage_cases: number;
  average_questions_per_success: number;
};

export function buildQualityScorecard(output: EvaluationOutput): QualityScorecard {
  const successful = output.kits.filter((item) => item.status === "ok" && item.kit);
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
  };
}
