import { z } from "zod";

const HttpUrlSchema = z.string().trim().refine(
  (value) => {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  },
  { message: "company_url must be a valid HTTP or HTTPS URL" },
);

export const KitInputSchema = z.object({
  jd: z.string().trim().min(1, "Job description is required"),
  company_url: HttpUrlSchema,
  days: z.number().int().min(1).max(60),
  llm_provider: z.enum(["gemini","openai","anthropic","groq","ollama"]).optional(),
  llm_model: z.string().trim().min(1).max(200).optional(),
});

export const BatchKitInputSchema = z.array(
  z.object({
    id: z.string().trim().min(1),
    jd: z.string().trim().min(1, "Job description is required"),
    company_url: HttpUrlSchema,
    days: z.number().int().min(1).max(60),
  }),
).superRefine((cases, ctx) => {
  const seen = new Map<string, number>();

  cases.forEach((item, index) => {
    const previousIndex = seen.get(item.id);

    if (previousIndex !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, "id"],
        message: `Duplicate case id: ${item.id}`,
      });
      return;
    }

    seen.set(item.id, index);
  });
});

export type KitInput = z.infer<typeof KitInputSchema>;
export type BatchKitInput = z.infer<typeof BatchKitInputSchema>;

export function validateKitInput(input: unknown): KitInput {
  return KitInputSchema.parse(input);
}

export function validateBatchKitInput(input: unknown): BatchKitInput {
  return BatchKitInputSchema.parse(input);
}
