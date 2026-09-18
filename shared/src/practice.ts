import type { Kit } from "./kit.js";

export const CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;
export type Confidence = typeof CONFIDENCE_LEVELS[number];

export type PracticeResult = {
  question_id: string;
  confidence: Confidence;
  practiced_at: string;
};

export type PracticeState = {
  current_index: number;
  results: PracticeResult[];
  completed: boolean;
};

export function buildPracticeQueue(kit: Kit, state?: PracticeState): string[] {
  const valid = new Set(kit.questions.map((q) => q.id));
  const prior = new Map((state?.results ?? []).map((r) => [r.question_id, r.confidence]));
  const scheduled = kit.schedule.days.flatMap((day) => day.question_ids).filter((id) => valid.has(id));
  const unique = [...new Set(scheduled)];
  return unique.sort((a, b) => {
    const rank = (id: string) => prior.get(id) === "low" ? 0 : prior.get(id) === "medium" ? 1 : 2;
    return rank(a) - rank(b) || unique.indexOf(a) - unique.indexOf(b);
  });
}

export function recordPractice(
  kit: Kit,
  state: PracticeState,
  questionId: string,
  confidence: Confidence,
  now = new Date().toISOString(),
): PracticeState {
  if (!kit.questions.some((q) => q.id === questionId)) throw new Error(`Unknown question: ${questionId}`);
  const results = state.results.filter((r) => r.question_id !== questionId);
  results.push({ question_id: questionId, confidence, practiced_at: now });
  const queue = buildPracticeQueue(kit, { ...state, results });
  const nextIndex = Math.min(state.current_index + 1, queue.length);
  return { current_index: nextIndex, results, completed: nextIndex >= queue.length };
}

export function practiceCoverage(kit: Kit, state: PracticeState): {
  practiced_question_ids: string[];
  covered_requirement_ids: string[];
  uncovered_requirement_ids: string[];
} {
  const practiced = new Set(state.results.map((r) => r.question_id));
  const covered = new Set(
    kit.questions.filter((q) => practiced.has(q.id)).flatMap((q) => q.requirement_ids),
  );
  return {
    practiced_question_ids: [...practiced],
    covered_requirement_ids: kit.role.requirements.filter((r) => covered.has(r.id)).map((r) => r.id),
    uncovered_requirement_ids: kit.role.requirements.filter((r) => !covered.has(r.id)).map((r) => r.id),
  };
}

export function startNextPracticeSession(state: PracticeState): PracticeState {
  return { ...structuredClone(state), current_index: 0, completed: false };
}
