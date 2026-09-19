import { runProviderComparison } from "./provider-comparison-runner.js";

const inputPath = process.argv[2] ?? "golden-cases.json";
const outputDir = process.argv[3] ?? ".artifacts/providers";
const providers = (process.env.EVALUATION_PROVIDERS ?? "").split(",").map((item) => item.trim()).filter(Boolean);
if (providers.length < 2) throw new Error("Set EVALUATION_PROVIDERS to at least two configured provider names");
const runs = providers.map((provider) => ({
  provider,
  model: process.env[`${provider.toUpperCase()}_MODEL`] ?? process.env.LLM_MODEL ?? "default",
  inputPath,
  outputPath: `${outputDir}/${provider}-output.json`,
  metadataPath: `${outputDir}/${provider}-quality.json`,
}));
const records = await runProviderComparison(runs, Number(process.env.EVALUATION_CONCURRENCY ?? 2));
process.stdout.write(JSON.stringify(records.map(({ provider, model, scorecard }) => ({ provider, model, scorecard })), null, 2) + "\n");
