import type { BatchKitInput, KitInput } from "./input.js";

export interface NormalizedKitInput {
  job_description: string;
  company_url: string;
  days_available: number;
}

export interface NormalizedBatchCase {
  id: string;
  input: NormalizedKitInput;
}

function normalizeUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  return url.href;
}

export function normalizeKitInput(input: KitInput): NormalizedKitInput {
  return {
    job_description: input.jd.trim(),
    company_url: normalizeUrl(input.company_url),
    days_available: input.days,
  };
}

export function normalizeBatchInput(
  input: BatchKitInput,
): NormalizedBatchCase[] {
  return input.map((item) => ({
    id: item.id.trim(),
    input: normalizeKitInput({
      jd: item.jd,
      company_url: item.company_url,
      days: item.days,
    }),
  }));
}
