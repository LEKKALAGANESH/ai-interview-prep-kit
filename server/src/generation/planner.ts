import type { Question, Requirement, Role } from "@trao/interview-prep-shared/kit.js";

export type QuestionPlan = {
  id: string;
  requirement_id: string;
  category: Question["category"];
  difficulty: 1 | 2 | 3;
  objective: string;
};

function categoryForRequirement(requirement: Requirement, role?: Role): Question["category"] {
  if (requirement.kind === "behavioural") return "behavioural";
  if (requirement.kind === "domain") return "system-design";
  const roleText = role ? `${role.title} ${role.seniority}`.toLowerCase() : "";
  if (/lead|senior|staff|architect/.test(roleText) && /system|design|architecture/.test(requirement.text.toLowerCase())) {
    return "system-design";
  }
  return "technical";
}

function difficultyForRequirement(requirement: Requirement, role?: Role): 1 | 2 | 3 {
  const text = requirement.text.toLowerCase();
  const senior = role ? /senior|staff|lead|architect/.test(`${role.title} ${role.seniority}`.toLowerCase()) : false;
  if (senior && /architecture|system design|scale|distributed|lead/.test(text)) return 3;
  if (/design|debug|optimiz|trade.?off|performance|security/.test(text)) return 2;
  return requirement.priority === "must" ? 2 : 1;
}

function objectiveForRequirement(requirement: Requirement, category: Question["category"]): string {
  if (category === "behavioural") return `Assess evidence of experience and decision-making related to: ${requirement.text}`;
  if (category === "system-design") return `Assess the candidate's ability to reason about design, trade-offs, and failure modes related to: ${requirement.text}`;
  if (category === "company-fit") return `Assess how the candidate would apply ${requirement.text} in the role context without inventing company-specific facts.`;
  return `Assess practical understanding and application of: ${requirement.text}`;
}

export function buildQuestionPlan(requirements: Requirement[], role?: Role): QuestionPlan[] {
  return requirements.map((requirement) => {
    const category = categoryForRequirement(requirement, role);
    return {
      id: `plan_${requirement.id}_${category}`,
      requirement_id: requirement.id,
      category,
      difficulty: difficultyForRequirement(requirement, role),
      objective: objectiveForRequirement(requirement, category),
    };
  });
}
