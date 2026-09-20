import {
  RawRoleExtractionSchema,
  normalizeRoleExtraction,
} from "@trao/interview-prep-shared/extraction.js";
import type { Role } from "@trao/interview-prep-shared/kit.js";
import type { RoleExtractionProvider } from "./types.js";

export class ExtractionError extends Error {
  constructor(public readonly code: "EMPTY_JOB_DESCRIPTION" | "MODEL_OUTPUT_INVALID" | "MODEL_EXTRACTION_FAILED", message: string) {
    super(message); this.name = "ExtractionError";
  }
}

export type ExtractRoleOptions = {
  provider: RoleExtractionProvider;
  maxJobDescriptionChars?: number;
  attempts?: number;
  retryDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

async function runWithRetry(provider: RoleExtractionProvider, jd: string, attempts: number, retryDelayMs: number, sleep: (ms: number) => Promise<void>): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try { return await provider.extractRole({ jobDescription: jd }); }
    catch (error) { lastError = error; if (attempt < attempts) await sleep(retryDelayMs * 2 ** (attempt - 1)); }
  }
  throw lastError;
}

export async function extractRole(jobDescription: string, options: ExtractRoleOptions): Promise<Role> {
  const jd = jobDescription.trim();
  if (!jd) throw new ExtractionError("EMPTY_JOB_DESCRIPTION", "Job description is required");
  const maxChars = options.maxJobDescriptionChars ?? 50_000;
  if (jd.length > maxChars) throw new ExtractionError("MODEL_EXTRACTION_FAILED", `Job description exceeds the ${maxChars}-character extraction limit`);
  const attempts = options.attempts ?? 2;
  const retryDelayMs = options.retryDelayMs ?? 250;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let raw: unknown;
  try { raw = await runWithRetry(options.provider, jd, attempts, retryDelayMs, sleep); }
  catch (error) { throw new ExtractionError("MODEL_EXTRACTION_FAILED", error instanceof Error ? error.message : "Role extraction failed"); }
  const parsed = RawRoleExtractionSchema.safeParse(raw);
  if (!parsed.success) throw new ExtractionError("MODEL_OUTPUT_INVALID", "Role extraction provider returned invalid structured data");
  return normalizeRoleExtraction(parsed.data, jd);
}