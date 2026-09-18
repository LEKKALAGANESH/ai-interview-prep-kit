import type { Question, Requirement } from "./kit.js";

export function findUncoveredRequirements(
  requirements: Requirement[],
  questions: Question[],
): Requirement[] {
  const covered = new Set<string>();

  for (const question of questions) {
    for (const id of question.requirement_ids) {
      covered.add(id);
    }
  }

  return requirements.filter((requirement) => !covered.has(requirement.id));
}

export function allMustHaveRequirementsCovered(
  requirements: Requirement[],
  questions: Question[],
): boolean {
  return findUncoveredRequirements(requirements, questions)
    .every((requirement) => requirement.priority !== "must");
}

export function findUncoveredMustHaveRequirements(
  requirements: Requirement[],
  questions: Question[],
): Requirement[] {
  return findUncoveredRequirements(requirements, questions)
    .filter((requirement) => requirement.priority === "must");
}
