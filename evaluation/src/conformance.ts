import { KitSchema, EvaluationOutputSchema } from "@trao/interview-prep-shared/kit.js";

export function auditKit(value: unknown) { const parsed = KitSchema.safeParse(value); return { valid: parsed.success, issues: parsed.success ? [] : parsed.error.issues }; }
export function auditEvaluation(value: unknown) { const parsed = EvaluationOutputSchema.safeParse(value); return { valid: parsed.success, issues: parsed.success ? [] : parsed.error.issues }; }
