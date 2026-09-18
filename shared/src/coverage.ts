import type { Coverage, Question, Requirement } from "./kit.js";

export type CoverageResult = Coverage & {
  covered_requirement_ids: string[];
  uncovered_must_requirement_ids: string[];
  uncovered_nice_requirement_ids: string[];
  invalid_requirement_ids: string[];
  can_ship: boolean;
};

export function checkCoverage(
  requirements: Requirement[],
  questions: Question[],
  passes = 1,
): CoverageResult {
  const requirementIds = new Set(requirements.map((requirement) => requirement.id));
  const covered = new Set<string>();
  const invalid = new Set<string>();

  for (const question of questions) {
    for (const requirementId of question.requirement_ids) {
      if (requirementIds.has(requirementId)) {
        covered.add(requirementId);
      } else {
        invalid.add(requirementId);
      }
    }
  }

  const uncovered = requirements.filter((requirement) => !covered.has(requirement.id));
  const uncoveredMust = uncovered
    .filter((requirement) => requirement.priority === "must")
    .map((requirement) => requirement.id);
  const uncoveredNice = uncovered
    .filter((requirement) => requirement.priority === "nice")
    .map((requirement) => requirement.id);

  return {
    uncovered_requirement_ids: uncovered.map((requirement) => requirement.id),
    uncovered_must_requirement_ids: uncoveredMust,
    uncovered_nice_requirement_ids: uncoveredNice,
    covered_requirement_ids: requirements
      .filter((requirement) => covered.has(requirement.id))
      .map((requirement) => requirement.id),
    invalid_requirement_ids: [...invalid].sort(),
    passes: Math.max(0, Math.trunc(passes)),
    can_ship: uncoveredMust.length === 0 && invalid.size === 0,
  };
}

export function findUncoveredRequirements(
  requirements: Requirement[],
  questions: Question[],
): Requirement[] {
  return requirements.filter(
    (requirement) => !checkCoverage(requirements, questions).covered_requirement_ids.includes(requirement.id),
  );
}

export function allMustHaveRequirementsCovered(
  requirements: Requirement[],
  questions: Question[],
): boolean {
  return checkCoverage(requirements, questions).uncovered_must_requirement_ids.length === 0;
}

export function findUncoveredMustHaveRequirements(
  requirements: Requirement[],
  questions: Question[],
): Requirement[] {
  const result = checkCoverage(requirements, questions);
  const ids = new Set(result.uncovered_must_requirement_ids);
  return requirements.filter((requirement) => ids.has(requirement.id));
}
