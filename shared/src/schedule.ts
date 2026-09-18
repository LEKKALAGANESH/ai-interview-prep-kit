import type { Question, Requirement, ScheduleDay } from "./kit.js";

export function buildSchedule(
  days: number,
  requirements: Requirement[],
  questions: Question[],
): ScheduleDay[] {
  if (!Number.isInteger(days) || days < 1 || days > 60) {
    throw new Error("days must be an integer between 1 and 60");
  }

  const priority = new Map(
    requirements.map((requirement) => [
      requirement.id,
      requirement.priority === "must" ? 0 : 1,
    ]),
  );

  const ordered = [...questions].sort((a, b) => {
    const aPriority = Math.min(...a.requirement_ids.map((id) => priority.get(id) ?? 1));
    const bPriority = Math.min(...b.requirement_ids.map((id) => priority.get(id) ?? 1));

    return bPriority === aPriority
      ? b.difficulty - a.difficulty || a.id.localeCompare(b.id)
      : aPriority - bPriority;
  });

  const buckets: Question[][] = Array.from({ length: days }, () => []);

  ordered.forEach((question, index) => {
    buckets[index % days].push(question);
  });

  return buckets.map((bucket, index) => ({
    day: index + 1,
    focus: bucket.length ? "Targeted question review" : "Review fundamentals",
    question_ids: bucket.map((question) => question.id),
    minutes: bucket.length ? bucket.length * 10 : 0,
  }));
}
