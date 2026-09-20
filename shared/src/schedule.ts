import type { Question, Requirement, ScheduleDay } from "./kit.js";

const MINUTES_PER_QUESTION = 10;

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

  const buckets: Question[][] = Array.from({ length: days }, () => []);

  ordered.forEach((question, index) => {
    buckets[index % days].push(question);
  });

  return buckets.map((bucket, index) => ({
    day: index + 1,
    focus: questionFocus(bucket, requirementsById),
    question_ids: bucket.map((question) => question.id),
    minutes: bucket.length * MINUTES_PER_QUESTION,
  }));
}
