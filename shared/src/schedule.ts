import type { Question, Requirement, ScheduleDay } from "./kit.js";

export function buildSchedule(
  days: number,
  requirements: Requirement[],
  questions: Question[],
): ScheduleDay[] {
  if (!Number.isInteger(days) || days < 1 || days > 60) {
    throw new Error("days must be an integer between 1 and 60");
  }

  const priority = new Map(requirements.map((r) => [r.id, r.must ? 0 : 1]));
  const ordered = [...questions].sort((a, b) => {
    const aPriority = Math.min(...a.requirement_ids.map((id) => priority.get(id) ?? 1));
    const bPriority = Math.min(...b.requirement_ids.map((id) => priority.get(id) ?? 1));
    return aPriority - bPriority || a.id.localeCompare(b.id);
  });

  const buckets: Question[][] = Array.from({ length: days }, () => []);
  ordered.forEach((question, index) => {
    buckets[index % days].push(question);
  });

  return buckets.map((bucket, index) => ({
    day: index + 1,
    focus: bucket.length ? "Targeted question review" : "Review fundamentals",
    question_ids: bucket.map((q) => q.id),
    duration_minutes: bucket.reduce((sum, q) => sum + q.duration_minutes, 0),
  }));
}
