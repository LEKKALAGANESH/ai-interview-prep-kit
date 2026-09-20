import type { Flashcard, Question, Requirement } from "@trao/interview-prep-shared/kit.js";
import { assessQuestionQuality, filterDuplicateQuestions } from "./quality.js";

export function repairQualityGate(
  questions: Question[],
  requirements: Requirement[],
): { accepted: Question[]; rejected: string[] } {
  const accepted: Question[] = [];
  const rejected: string[] = [];
  for (const question of filterDuplicateQuestions(questions)) {
    const requirement = requirements.find((item) => question.requirement_ids.includes(item.id));
    if (!requirement) { rejected.push(question.id); continue; }
    const result = assessQuestionQuality(question, requirement, accepted);
    if (result.valid) accepted.push(question);
    else rejected.push(question.id);
  }
  return { accepted, rejected };
}

export function validateFlashcards(
  flashcards: Flashcard[],
  questions: Question[],
): { valid: boolean; invalid_ids: string[] } {
  const byQuestion = new Map(questions.map((question) => [question.id, question]));
  const invalid_ids = flashcards.filter((card) => {
    const source = byQuestion.get(card.id.replace(/^fc_/, ""));
    return !source ||
      card.front !== source.prompt ||
      card.back !== source.answer_outline ||
      card.requirement_ids.join("|") !== source.requirement_ids.join("|");
  }).map((card) => card.id);
  return { valid: invalid_ids.length === 0, invalid_ids };
}
