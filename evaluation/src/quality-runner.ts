import { readFile, writeFile } from "node:fs/promises";
import { evaluateFile } from "./evaluator.js";
import { buildQualityScorecard } from "./quality-scorecard.js";
import type { RegressionRecord } from "./regression.js";

export type QualityRunOptions = {
  inputPath: string;
  outputPath: string;
  metadataPath: string;
  provider: string;
  model: string;
  promptVersions: string[];
  concurrency?: number;
};

export async function runQualityEvaluation(options: QualityRunOptions): Promise<RegressionRecord> {
  const output = await evaluateFile(options.inputPath, options.outputPath, {
    concurrency: options.concurrency ?? 2,
  });
  const scorecard = buildQualityScorecard(output);
  const record: RegressionRecord = {
    provider: options.provider,
    model: options.model,
    prompt_versions: options.promptVersions,
    generated_at: output.generated_at,
    output,
  };
  await writeFile(
    options.metadataPath,
    JSON.stringify({ ...record, scorecard }, null, 2) + "\n",
    "utf8",
  );
  return record;
}

export async function readRegressionRecord(path: string): Promise<RegressionRecord> {
  return JSON.parse(await readFile(path, "utf8")) as RegressionRecord;
}
