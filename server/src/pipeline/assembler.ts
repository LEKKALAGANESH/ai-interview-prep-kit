import { KitSchema, type CompanyBrief, type Flashcard, type Kit, type Role } from "@trao/interview-prep-shared/kit.js";
import type { NormalizedKitInput } from "@trao/interview-prep-shared/input-model.js";
import { buildSchedule } from "@trao/interview-prep-shared/schedule.js";
import type { ResearchResult } from "../retrieval/research.js";
import { generateQuestionSetWithCoverage, type QuestionSetGenerationOptions } from "../generation/pipeline.js";

export type BuildKitOptions = QuestionSetGenerationOptions & {
  research: ResearchResult;
  company: string;
  role: Role;
  companyBrief: CompanyBrief;
  flashcards?: Flashcard[];
};

function buildFlashcards(questions: Kit["questions"]): Flashcard[] {
  return questions.map((question) => ({
    id: `fc_${question.id}`,
    front: question.prompt,
    back: question.answer_outline,
    requirement_ids: [...question.requirement_ids],
  }));
}

export class KitAssemblyError extends Error {
  constructor(public readonly code: "COVERAGE_NOT_SHIPPABLE" | "FINAL_KIT_INVALID", message: string) {
    super(message);
    this.name = "KitAssemblyError";
  }
}

export function assembleKit(input: NormalizedKitInput, context: Omit<BuildKitOptions, keyof QuestionSetGenerationOptions>, questions: Kit["questions"], coverage: Kit["coverage"]): Kit {
  const schedule = buildSchedule(input.days_available, context.role.requirements, questions);
  const kit = {
    source: {
      company: context.company,
      company_url: input.company_url,
      role: context.role.title,
      location: "",
      jd_chars: input.job_description.length,
      researched_at: new Date().toISOString(),
      pages_used: context.research.pages.map((page) => page.url),
    },
    company_brief: context.companyBrief,
    role: context.role,
    questions,
    flashcards: context.flashcards ?? buildFlashcards(questions),
    schedule: { days_available: input.days_available, days: schedule },
    coverage,
  };
  const parsed = KitSchema.safeParse(kit);
  if (!parsed.success) throw new KitAssemblyError("FINAL_KIT_INVALID", "Final kit failed schema validation");
  if (parsed.data.coverage.uncovered_requirement_ids.some((id) =>
    parsed.data.role.requirements.some((requirement) => requirement.id === id && requirement.priority === "must"),
  )) {
    throw new KitAssemblyError("COVERAGE_NOT_SHIPPABLE", "Final kit still has uncovered must-have requirements");
  }
  return parsed.data;
}

export async function buildValidatedKit(input: NormalizedKitInput, context: BuildKitOptions): Promise<Kit> {
  const generated = await generateQuestionSetWithCoverage(context.role.requirements, context);
  if (!generated.coverage.can_ship) {
    throw new KitAssemblyError("COVERAGE_NOT_SHIPPABLE", "Question generation did not cover all must-have requirements");
  }
  return assembleKit(input, context, generated.questions, generated.coverage);
}
