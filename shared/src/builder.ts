import { KitSchema, type Kit, type Question } from "./kit.js";
import { checkCoverage } from "./coverage.js";
import { buildSchedule } from "./schedule.js";
import { questionMinutes } from "./schedule.js";

export type BuilderEdit =
  | { type: "edit_question"; question_id: string; prompt?: string; answer_outline?: string }
  | { type: "edit_flashcard"; flashcard_id: string; front?: string; back?: string; requirement_ids?: string[] }
  | { type: "edit_company_brief"; summary?: string; what_they_do?: string; sources?: string[] }
  | { type: "reorder_question"; question_id: string; from_day: number; to_day: number; to_index: number }
  | { type: "add_question"; question: Question; day: number; index?: number }
  | { type: "delete_question"; question_id: string }
  | { type: "pin_question"; question_id: string }
  | { type: "regenerate_schedule" };

function locate(kit: Kit, questionId: string): { day: number; index: number } {
  for (const day of kit.schedule.days) {
    const index = day.question_ids.indexOf(questionId);
    if (index >= 0) return { day: day.day, index };
  }
  throw new Error(`Question is not scheduled: ${questionId}`);
}

function withDerivedState(kit: Kit): Kit {
  const next = structuredClone(kit);
  const byId = new Map(next.questions.map((question) => [question.id, question]));
  for (const day of next.schedule.days) {
    day.minutes = day.question_ids.reduce((total, id) => total + questionMinutes(byId.get(id) ?? { difficulty: 1 }), 0);
  }
  const coverage = checkCoverage(next.role.requirements, next.questions, next.coverage.passes);
  next.coverage = { uncovered_requirement_ids: coverage.uncovered_requirement_ids, passes: coverage.passes };
  return KitSchema.parse(next);
}

export function applyBuilderEdit(kit: Kit, edit: BuilderEdit): Kit {
  const next = structuredClone(kit);
  if (edit.type === "edit_question") {
    const question = next.questions.find((item) => item.id === edit.question_id);
    if (!question) throw new Error(`Unknown question: ${edit.question_id}`);
    if (edit.prompt !== undefined) question.prompt = edit.prompt.trim();
    if (edit.answer_outline !== undefined) question.answer_outline = edit.answer_outline.trim();
    if (question.origin !== "manual") question.origin = "edited";
  } else if (edit.type === "edit_flashcard") {
    const flashcard = next.flashcards.find((item) => item.id === edit.flashcard_id);
    if (!flashcard) throw new Error(`Unknown flashcard: ${edit.flashcard_id}`);
    if (edit.front !== undefined) flashcard.front = edit.front.trim();
    if (edit.back !== undefined) flashcard.back = edit.back.trim();
    if (edit.requirement_ids !== undefined) flashcard.requirement_ids = [...edit.requirement_ids];
    if (flashcard.origin !== "manual") flashcard.origin = "edited";
  } else if (edit.type === "edit_company_brief") {
    if (edit.summary !== undefined) next.company_brief.summary = edit.summary.trim();
    if (edit.what_they_do !== undefined) next.company_brief.what_they_do = edit.what_they_do.trim();
    if (edit.sources !== undefined) next.company_brief.sources = edit.sources.map((source) => source.trim());
  } else if (edit.type === "add_question") {
    if (next.questions.some((item) => item.id === edit.question.id)) throw new Error(`Duplicate question: ${edit.question.id}`);
    if (!next.role.requirements.some((r) => edit.question.requirement_ids.includes(r.id))) throw new Error("Question must reference an existing requirement");
    const day = next.schedule.days.find((item) => item.day === edit.day);
    if (!day) throw new Error(`Unknown schedule day: ${edit.day}`);
    next.questions.push({ ...structuredClone(edit.question), origin: "manual" });
    const index = edit.index === undefined ? day.question_ids.length : Math.max(0, Math.min(edit.index, day.question_ids.length));
    day.question_ids.splice(index, 0, edit.question.id);
  } else if (edit.type === "delete_question") {
    const index = next.questions.findIndex((item) => item.id === edit.question_id);
    if (index < 0) throw new Error(`Unknown question: ${edit.question_id}`);
    next.questions.splice(index, 1);
    for (const day of next.schedule.days) day.question_ids = day.question_ids.filter((id) => id !== edit.question_id);
  } else if (edit.type === "pin_question") {
    const question = next.questions.find((item) => item.id === edit.question_id);
    if (!question) throw new Error(`Unknown question: ${edit.question_id}`);
    question.pinned = !question.pinned;
  } else if (edit.type === "regenerate_schedule") {
    // Pinned questions keep their day; everything else is re-allocated deterministically.
    const fresh = buildSchedule(next.schedule.days_available, next.role.requirements, next.questions.filter((q) => !q.pinned));
    for (const day of fresh) {
      const kept = next.schedule.days.find((old) => old.day === day.day)?.question_ids.filter((id) => next.questions.find((q) => q.id === id)?.pinned) ?? [];
      day.question_ids.unshift(...kept);
    }
    next.schedule.days = fresh;
  } else {
    const from = next.schedule.days.find((day) => day.day === edit.from_day);
    const to = next.schedule.days.find((day) => day.day === edit.to_day);
    if (!from || !to) throw new Error("Unknown schedule day");
    const index = from.question_ids.indexOf(edit.question_id);
    if (index < 0) throw new Error(`Question is not on source day: ${edit.question_id}`);
    from.question_ids.splice(index, 1);
    const targetIndex = Math.max(0, Math.min(edit.to_index, to.question_ids.length));
    to.question_ids.splice(targetIndex, 0, edit.question_id);
  }
  return withDerivedState(next);
}

export function reorderQuestion(kit: Kit, questionId: string, day: number, toIndex: number): Kit {
  const current = locate(kit, questionId);
  return applyBuilderEdit(kit, { type: "reorder_question", question_id: questionId, from_day: current.day, to_day: day, to_index: toIndex });
}

export function regenerateScopedQuestions(
  kit: Kit,
  questionIds: string[],
  regenerated: Question[],
): Kit {
  const scope = new Set(questionIds);
  const next = structuredClone(kit);
  const replacement = new Map(regenerated.map((question) => [question.id, question]));
  for (const id of scope) {
    const index = next.questions.findIndex((question) => question.id === id);
    if (index < 0) throw new Error(`Unknown scoped question: ${id}`);
    if (!replacement.has(id)) throw new Error(`Missing regenerated question: ${id}`);
    next.questions[index] = structuredClone(replacement.get(id)!);
    const flashcard = next.flashcards.find((card) => card.id === `fc_${id}`);
    if (flashcard) {
      flashcard.front = next.questions[index].prompt;
      flashcard.back = next.questions[index].answer_outline;
      flashcard.requirement_ids = [...next.questions[index].requirement_ids];
    }
  }
  return KitSchema.parse(next);
}

/**
 * Replaces only generated, unpinned questions of one category. Edited, manual and
 * pinned questions survive; every other category and section is untouched.
 */
export function regenerateCategory(kit: Kit, category: Question["category"], generated: Question[]): Kit {
  const next = structuredClone(kit);
  const replaceable = (q: Question) => q.category === category && !q.pinned && (q.origin ?? "generated") === "generated";
  const removed = new Set(next.questions.filter(replaceable).map((q) => q.id));
  const keptIds = new Set(next.questions.filter((q) => !removed.has(q.id)).map((q) => q.id));
  const fresh = generated.filter((q) => q.category === category && !keptIds.has(q.id));
  next.questions = [...next.questions.filter((q) => !removed.has(q.id)), ...fresh];

  const freshIds = new Set(fresh.map((q) => q.id));
  for (const day of next.schedule.days) day.question_ids = day.question_ids.filter((id) => !removed.has(id) || freshIds.has(id));
  const scheduled = new Set(next.schedule.days.flatMap((day) => day.question_ids));
  const lastDay = next.schedule.days[next.schedule.days.length - 1];
  for (const q of fresh) if (!scheduled.has(q.id) && lastDay) lastDay.question_ids.push(q.id);

  for (const q of fresh) {
    const card = next.flashcards.find((item) => item.id === `fc_${q.id}`);
    if (card && (card.origin ?? "generated") === "generated" && !card.pinned) {
      card.front = q.prompt;
      card.back = q.answer_outline;
      card.requirement_ids = [...q.requirement_ids];
    }
  }
  return withDerivedState(next);
}
