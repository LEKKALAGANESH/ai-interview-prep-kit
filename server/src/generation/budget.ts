export type PromptBudgetOptions = { maxChars?: number };

export function limitEvidence(text: string, maxChars = 9000): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(0, maxChars - 80)) + "\n[TRUNCATED: lower-ranked evidence omitted]";
}

export function batchItems<T>(items: T[], batchSize = 4): T[][] {
  const size = Math.max(1, Math.trunc(batchSize));
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}
