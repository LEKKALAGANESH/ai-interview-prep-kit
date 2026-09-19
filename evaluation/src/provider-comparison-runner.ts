import { evaluateFile } from "./evaluator.js";
import { compareProviders, type RegressionRecord } from "./regression.js";
import { buildQualityScorecard } from "./quality-scorecard.js";
import { writeFile } from "node:fs/promises";

export type ProviderRun = {
  provider: string;
  model: string;
  inputPath: string;
  outputPath: string;
  metadataPath: string;
};

export async function runProviderComparison(runs: ProviderRun[], concurrency = 2): Promise<Array<RegressionRecord & { scorecard: ReturnType<typeof buildQualityScorecard> }>> {
  const records: Array<RegressionRecord & { scorecard: ReturnType<typeof buildQualityScorecard> }> = [];
  for (const run of runs) {
    const output = await evaluateFile(run.inputPath, run.outputPath, { concurrency });
    const scorecard = buildQualityScorecard(output);
    const record = {
      provider: run.provider,
      model: run.model,
      prompt_versions: [],
      generated_at: output.generated_at,
      output,
      scorecard,
    };
    await writeFile(run.metadataPath, JSON.stringify(record, null, 2) + "\n", "utf8");
    records.push(record);
  }
  return records;
}

export function summarizeProviderComparison(records: RegressionRecord[]) {
  return compareProviders(records);
}
