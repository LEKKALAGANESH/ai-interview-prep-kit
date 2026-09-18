import { KitSchema, type Kit, type Question } from "./kit.js";

export type BuilderEdit =
  | { type: "edit_question"; question_id: string; prompt?: string; answer_outline?: string }
  | { type: "reorder_question"; question_id: string; from_day: number; to_day: number; to_index: number }
  | { type: "add_question"; question: Question; day: number; index?: number }
  | { type: "delete_question"; question_id: string };

function locate(kit: Kit, questionId: string): { day: number; index: number } {
  for (const day of kit.schedule.days) {
    const index = day.question_ids.indexOf(questionId);
    if (index >= 0) return { day: day.day, index };
  }
  throw new Error(`Question is not scheduled: ${questionId}`);
}

function withMinutes(kit: Kit): Kit {
  const next = structuredClone(kit);
  for (const day of next.schedule.days) day.minutes = day.question_ids.length * 10;
  return KitSchema.parse(next);
}

export function applyBuilderEdit(kit: Kit, edit: BuilderEdit): Kit {
  const next = structuredClone(kit);
  if (edit.type === "edit_question") {
    const question = next.questions.find((item) => item.id === edit.question_id);
    if (!question) throw new Error(`Unknown question: ${edit.question_id}`);
    if (edit.prompt !== undefined) question.prompt = edit.prompt.trim();
    if (edit.answer_outline !== undefined) question.answer_outline = edit.answer_outline.trim();
  } else if (edit.type === "add_question") {
    if (next.questions.some((item) => item.id === edit.question.id)) throw new Error(`Duplicate question: ${edit.question.id}`);
    if (!next.role.requirements.some((r) => edit.question.requirement_ids.includes(r.id))) throw new Error("Question must reference an existing requirement");
    const day = next.schedule.days.find((item) => item.day === edit.day);
    if (!day) throw new Error(`Unknown schedule day: ${edit.day}`);
    next.questions.push(structuredClone(edit.question));
    const index = edit.index === undefined ? day.question_ids.length : Math.max(0, Math.min(edit.index, day.question_ids.length));
    day.question_ids.splice(index, 0, edit.question.id);
  } else if (edit.type === "delete_question") {
    const index = next.questions.findIndex((item) => item.id === edit.question_id);
    if (index < 0) throw new Error(`Unknown question: ${edit.question_id}`);
    next.questions.splice(index, 1);
    for (const day of next.schedule.days) day.question_ids = day.question_ids.filter((id) => id !== edit.question_id);
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
  return withMinutes(next);
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
  }
  return KitSchema.parse(next);
}
