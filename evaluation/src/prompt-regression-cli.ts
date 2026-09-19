import { mkdir } from "node:fs/promises";
import { readFile, writeFile } from "node:fs/promises";
import { buildPromptRegressionSnapshot } from "./prompt-regression-runner.js";
import type { PromptRegressionFixture } from "./prompt-regression-runner.js";

const input = process.argv[2] ?? "prompt-fixtures.json";
const output = process.argv[3] ?? ".artifacts/prompt-regression.json";
await mkdir(new URL(".", `file://${process.cwd()}/`).pathname + output.split("/").slice(0,-1).join("/"), { recursive: true }).catch(() => undefined);
const fixtures = JSON.parse(await readFile(input, "utf8")) as PromptRegressionFixture[];
const snapshot = buildPromptRegressionSnapshot(fixtures);
await writeFile(output, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
process.stdout.write(`Prompt regression snapshot written: ${output} (${snapshot.length} fixtures)\n`);
