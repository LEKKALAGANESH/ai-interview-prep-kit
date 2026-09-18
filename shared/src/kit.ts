import { z } from "zod";
import { BatchKitInputSchema } from "./input.js";

export const RequirementSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  kind: z.enum(["technical", "behavioural", "domain"]),
  priority: z.enum(["must", "nice"]),
});

export const SourceSchema = z.object({
  company: z.string().min(1),
  company_url: z.string().url(),
  role: z.string().min(1),
  location: z.string(),
  jd_chars: z.number().int().nonnegative(),
  researched_at: z.string().min(1),
  pages_used: z.array(z.string().url()),
});

export const CompanyBriefSchema = z.object({
  summary: z.string(),
  what_they_do: z.string(),
  sources: z.array(z.string().url()),
});

export const RoleSchema = z.object({
  title: z.string().min(1),
  seniority: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.array(RequirementSchema),
});

export const QuestionSchema = z.object({
  id: z.string().min(1),
  requirement_ids: z.array(z.string()).min(1),
  category: z.enum(["technical", "behavioural", "system-design", "company-fit"]),
  prompt: z.string().min(1),
  answer_outline: z.string().min(1),
  difficulty: z.number().int().min(1).max(3),
});

export const FlashcardSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1),
  back: z.string().min(1),
  requirement_ids: z.array(z.string()),
});

export const ScheduleDaySchema = z.object({
  day: z.number().int().positive(),
  focus: z.string().min(1),
  question_ids: z.array(z.string()),
  minutes: z.number().int().nonnegative(),
});

export const ScheduleSchema = z.object({
  days_available: z.number().int().min(1).max(60),
  days: z.array(ScheduleDaySchema),
});

export const CoverageSchema = z.object({
  uncovered_requirement_ids: z.array(z.string()),
  passes: z.number().int().nonnegative(),
});

const uniqueIds = (ids: string[]) => new Set(ids).size === ids.length;

export const KitSchema = z.object({
  source: SourceSchema,
  company_brief: CompanyBriefSchema,
  role: RoleSchema,
  questions: z.array(QuestionSchema),
  flashcards: z.array(FlashcardSchema),
  schedule: ScheduleSchema,
  coverage: CoverageSchema,
}).superRefine((kit, ctx) => {
  const requirementIds = kit.role.requirements.map((requirement) => requirement.id);
  const questionIds = kit.questions.map((question) => question.id);
  const flashcardIds = kit.flashcards.map((flashcard) => flashcard.id);

  if (!uniqueIds(requirementIds)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["role", "requirements"],
      message: "Requirement IDs must be unique",
    });
  }

  if (!uniqueIds(questionIds)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["questions"],
      message: "Question IDs must be unique",
    });
  }

  if (!uniqueIds(flashcardIds)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["flashcards"],
      message: "Flashcard IDs must be unique",
    });
  }

  const requirementSet = new Set(requirementIds);
  const questionSet = new Set(questionIds);

  kit.questions.forEach((question, index) => {
    question.requirement_ids.forEach((requirementId, requirementIndex) => {
      if (!requirementSet.has(requirementId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["questions", index, "requirement_ids", requirementIndex],
          message: `Unknown requirement ID: ${requirementId}`,
        });
      }
    });
  });

  kit.flashcards.forEach((flashcard, index) => {
    flashcard.requirement_ids.forEach((requirementId, requirementIndex) => {
      if (!requirementSet.has(requirementId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["flashcards", index, "requirement_ids", requirementIndex],
          message: `Unknown requirement ID: ${requirementId}`,
        });
      }
    });
  });

  kit.schedule.days.forEach((day, dayIndex) => {
    day.question_ids.forEach((questionId, questionIndex) => {
      if (!questionSet.has(questionId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["schedule", "days", dayIndex, "question_ids", questionIndex],
          message: `Unknown question ID: ${questionId}`,
        });
      }
    });
  });

  kit.coverage.uncovered_requirement_ids.forEach((requirementId, index) => {
    if (!requirementSet.has(requirementId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["coverage", "uncovered_requirement_ids", index],
        message: `Unknown requirement ID: ${requirementId}`,
      });
    }
  });

  if (kit.schedule.days.length !== kit.schedule.days_available) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["schedule", "days"],
      message: "Schedule must contain exactly days_available days",
    });
  }

  const dayNumbers = kit.schedule.days.map((day) => day.day);
  const expectedDays = Array.from(
    { length: kit.schedule.days_available },
    (_, index) => index + 1,
  );

  if (
    dayNumbers.length !== expectedDays.length ||
    dayNumbers.some((day, index) => day !== expectedDays[index])
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["schedule", "days"],
      message: "Schedule day numbers must be exactly 1 through days_available in order",
    });
  }
});

export type Requirement = z.infer<typeof RequirementSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Flashcard = z.infer<typeof FlashcardSchema>;
export type CompanyBrief = z.infer<typeof CompanyBriefSchema>;
export type ScheduleDay = z.infer<typeof ScheduleDaySchema>;
export type Schedule = z.infer<typeof ScheduleSchema>;
export type Coverage = z.infer<typeof CoverageSchema>;
export type Kit = z.infer<typeof KitSchema>;

export const EvaluationCaseSchema = BatchKitInputSchema.element;
export const EvaluationInputSchema = BatchKitInputSchema;

export const EvaluationResultSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["ok", "failed"]),
  kit: KitSchema.nullable(),
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
  }).nullable(),
});

export const EvaluationOutputSchema = z.object({
  version: z.string().min(1),
  generated_at: z.string().min(1),
  kits: z.array(EvaluationResultSchema),
});

export type EvaluationCase = z.infer<typeof EvaluationCaseSchema>;
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;
export type EvaluationOutput = z.infer<typeof EvaluationOutputSchema>;
