import type { Question, Requirement, ScheduleDay } from "./kit.js";

// Integer minutes by difficulty 1-3: 10/15/20.
export function questionMinutes(question: Pick<Question, "difficulty">): number {
  return 5 + 5 * question.difficulty;
}

function questionPriority(
  question: Question,
  priorityByRequirement: Map<string, number>,
): number {
  return Math.min(
    ...question.requirement_ids.map((id) => priorityByRequirement.get(id) ?? 1),
  );
}

function questionFocus(
  questions: Question[],
  requirementsById: Map<string, Requirement>,
): string {
  const topics = questions
    .flatMap((question) =>
      question.requirement_ids
        .map((id) => requirementsById.get(id)?.text)
        .filter((text): text is string => Boolean(text)),
    )
    .filter((text, index, values) => values.indexOf(text) === index)
    .slice(0, 3);

  return topics.length ? topics.join(", ") : "Review fundamentals";
}

export function buildSchedule(
  days: number,
  requirements: Requirement[],
  questions: Question[],
): ScheduleDay[] {
  if (!Number.isInteger(days) || days < 1 || days > 60) {
    throw new Error("days must be an integer between 1 and 60");
  }

  const priorityByRequirement = new Map(
    requirements.map((requirement) => [
      requirement.id,
      requirement.priority === "must" ? 0 : 1,
    ]),
  );
  const requirementsById = new Map(
    requirements.map((requirement) => [requirement.id, requirement]),
  );

  const ordered = [...questions].sort((a, b) => {
    const aPriority = questionPriority(a, priorityByRequirement);
    const bPriority = questionPriority(b, priorityByRequirement);

    return (
      aPriority - bPriority ||
      b.difficulty - a.difficulty ||
      a.id.localeCompare(b.id)
    );
  });

  // Contiguous chunks keep the hardest, must-have material on the earliest days.
  const base = Math.floor(ordered.length / days);
  const extra = ordered.length % days;
  let start = 0;
  const buckets = Array.from({ length: days }, (_, index) => {
    const size = base + (index < extra ? 1 : 0);
    const bucket = ordered.slice(start, start + size);
    start += size;
    return bucket;
  });

  return buckets.map((bucket, index) => ({
    day: index + 1,
    focus: questionFocus(bucket, requirementsById),
    question_ids: bucket.map((question) => question.id),
    minutes: bucket.reduce((total, question) => total + questionMinutes(question), 0),
  }));
}
