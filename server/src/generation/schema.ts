import { z } from "zod";

export const GeneratedQuestionSchema = z.object({
  prompt: z.string().trim().min(1),
  answer_outline: z.string().trim().min(1),
  difficulty: z.number().int().min(1).max(3),
});

export const GeneratedQuestionBatchSchema = z.object({
  questions: z.array(GeneratedQuestionSchema).min(1),
});

export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;
export type GeneratedQuestionBatch = z.infer<typeof GeneratedQuestionBatchSchema>;
