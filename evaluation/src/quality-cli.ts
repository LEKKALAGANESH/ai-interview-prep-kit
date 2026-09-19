import { runQualityEvaluation } from "./quality-runner.js";

const inputPath = process.argv[2] ?? "golden-cases.json";
const outputPath = process.argv[3] ?? ".artifacts/golden-output.json";
const metadataPath = process.argv[4] ?? ".artifacts/golden-quality.json";
const provider = process.env.LLM_PROVIDER?.trim() || "gemini";
const model = process.env.LLM_MODEL?.trim() || process.env.GEMINI_MODEL?.trim() || "default";

const result = await runQualityEvaluation({
  inputPath,
  outputPath,
  metadataPath,
  provider,
  model,
  promptVersions: ["role-extraction:v1", "question-generation:v1"],
  concurrency: Number(process.env.EVALUATION_CONCURRENCY ?? 2),
});
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
