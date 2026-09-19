import type { Question, Requirement } from "@trao/interview-prep-shared/kit.js";

export type QuestionQuality = {
  valid: boolean;
  relevance: number;
  specificity: number;
  answer_usefulness: number;
  difficulty_fit: number;
  duplicate_of?: string;
  warnings: string[];
};

function tokens(value: string): Set<string> {
  return new Set(value.toLowerCase().split(/[^a-z0-9+#.-]+/).filter((x) => x.length > 2));
}

function overlap(a: string, b: string): number {
  const aa = tokens(a); const bb = tokens(b);
  if (!aa.size || !bb.size) return 0;
  let common = 0;
  for (const token of aa) if (bb.has(token)) common++;
  return common / Math.max(aa.size, bb.size);
}

export function assessQuestionQuality(
  question: Question,
  requirement: Requirement,
  existing: Question[] = [],
): QuestionQuality {
  const requirementOverlap = overlap(question.prompt, requirement.text);
  const specificity = /how|why|trade.?off|debug|design|example|scenario|implement|compare/i.test(question.prompt) ? 1 : 0.5;
  const answerUsefulness = question.answer_outline.trim().length >= 30 ? 1 : 0.5;
  const expected = /design|architecture|scale|distributed|security|debug|optimiz/i.test(requirement.text) ? 2 : 1;
  const difficultyFit = Math.abs(question.difficulty - expected) <= 1 ? 1 : 0;
  const duplicate = existing.find((item) => overlap(item.prompt, question.prompt) >= 0.8);
  const warnings: string[] = [];
  if (requirementOverlap < 0.08) warnings.push("weak requirement relevance");
  if (specificity < 1) warnings.push("low specificity");
  if (answerUsefulness < 1) warnings.push("short answer outline");
  if (duplicate) warnings.push("near-duplicate question");
  return {
    valid: requirementOverlap >= 0.08 && !duplicate,
    relevance: requirementOverlap,
    specificity,
    answer_usefulness: answerUsefulness,
    difficulty_fit: difficultyFit,
    duplicate_of: duplicate?.id,
    warnings,
  };
}

export function filterDuplicateQuestions(questions: Question[]): Question[] {
  const kept: Question[] = [];
  for (const question of questions) {
    if (!kept.some((item) => item.category === question.category && item.requirement_ids.join("|") === question.requirement_ids.join("|") && overlap(item.prompt, question.prompt) >= 0.8)) kept.push(question);
  }
  return kept;
}

export function validateQuestionSetQuality(
  questions: Question[],
  requirements: Requirement[],
): { valid: boolean; results: Array<QuestionQuality> } {
  const results = questions.map((question) => {
    const requirement = requirements.find((item) => question.requirement_ids.includes(item.id));
    return requirement ? assessQuestionQuality(question, requirement, questions.filter((item) => item.id !== question.id)) : {
      valid: false, relevance: 0, specificity: 0, answer_usefulness: 0, difficulty_fit: 0, warnings: ["unknown requirement"],
    };
  });
  return { valid: results.every((item) => item.valid), results };
}
