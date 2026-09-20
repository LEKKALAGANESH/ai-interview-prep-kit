import { z } from "zod";

export const GeneratedQuestionSchema = z.object({
  prompt: z.string().trim().min(1),
  answer_outline: z.string().trim().min(1),
  difficulty: z.number().int().min(1).max(3),
});

export const GeneratedQuestionBatchSchema = z.object({
  questions: z.array(GeneratedQuestionSchema).min(1),
});

// One call per category: an entry per supplied requirement id (empty/missing entries are repaired by the coverage pass).
export const GeneratedCategoryBatchSchema = z.object({
  items: z.array(z.object({
    requirement_id: z.string().trim().min(1),
    questions: z.array(GeneratedQuestionSchema),
  })).min(1),
});

export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;
export type GeneratedQuestionBatch = z.infer<typeof GeneratedQuestionBatchSchema>;
