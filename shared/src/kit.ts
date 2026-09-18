import { z } from "zod";

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
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
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

export const KitSchema = z.object({
  source: SourceSchema,
  company_brief: CompanyBriefSchema,
  role: RoleSchema,
  questions: z.array(QuestionSchema),
  flashcards: z.array(FlashcardSchema),
  schedule: ScheduleSchema,
  coverage: CoverageSchema,
});

export type Requirement = z.infer<typeof RequirementSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Flashcard = z.infer<typeof FlashcardSchema>;
export type CompanyBrief = z.infer<typeof CompanyBriefSchema>;
export type ScheduleDay = z.infer<typeof ScheduleDaySchema>;
export type Schedule = z.infer<typeof ScheduleSchema>;
export type Coverage = z.infer<typeof CoverageSchema>;
export type Kit = z.infer<typeof KitSchema>;

export const EvaluationCaseSchema = z.object({
  id: z.string().min(1),
  jd: z.string().min(1),
  company_url: z.string().url(),
  days: z.number().int().min(1).max(60),
});

export const EvaluationInputSchema = z.array(EvaluationCaseSchema);

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
