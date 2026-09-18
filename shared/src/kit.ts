import { z } from "zod";

export const RequirementSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  must: z.boolean(),
  evidence: z.string().min(1),
});

export const QuestionSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1),
  requirement_ids: z.array(z.string()).min(1),
  duration_minutes: z.number().int().positive(),
  origin: z.enum(["generated", "user_added"]).default("generated"),
  is_edited: z.boolean().default(false),
  is_pinned: z.boolean().default(false),
});

export const FlashcardSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1),
  back: z.string().min(1),
  requirement_ids: z.array(z.string()).default([]),
  origin: z.enum(["generated", "user_added"]).default("generated"),
  is_edited: z.boolean().default(false),
  is_pinned: z.boolean().default(false),
});

export const CompanyBriefSchema = z.object({
  summary: z.string(),
  products_services: z.array(z.string()),
  culture_values: z.array(z.string()),
  hiring_process: z.array(z.string()),
  sources: z.array(z.string().url()),
});

export const ScheduleDaySchema = z.object({
  day: z.number().int().positive(),
  focus: z.string().min(1),
  question_ids: z.array(z.string()),
  duration_minutes: z.number().int().positive(),
});

export const KitSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  role: z.string().min(1),
  requirements: z.array(RequirementSchema),
  company_brief: CompanyBriefSchema,
  question_bank: z.record(z.array(QuestionSchema)),
  flashcards: z.array(FlashcardSchema),
  schedule: z.array(ScheduleDaySchema),
});

export type Requirement = z.infer<typeof RequirementSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Flashcard = z.infer<typeof FlashcardSchema>;
export type CompanyBrief = z.infer<typeof CompanyBriefSchema>;
export type ScheduleDay = z.infer<typeof ScheduleDaySchema>;
export type Kit = z.infer<typeof KitSchema>;

export const EvaluationCaseSchema = z.object({
  id: z.string().min(1),
  jd: z.string().min(1),
  company_url: z.string().url(),
  days: z.number().int().min(1).max(60),
});

export const EvaluationInputSchema = z.array(EvaluationCaseSchema);
