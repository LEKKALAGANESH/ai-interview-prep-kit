import { config as loadDotenv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateFile } from "./evaluator.js";

// Same env files as the server, resolved from this file so the command works from any directory.
const evaluationDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const dir of [evaluationDir, resolve(evaluationDir, "..")]) {
  loadDotenv({ path: resolve(dir, ".env.local") });
  loadDotenv({ path: resolve(dir, ".env") });
}

function usage(): never {
  throw new Error(
    "Usage: npm run evaluate -- --input <cases.json> --output <kits.json>",
  );
}

function readFlag(args: string[], name: string): string {
  const index = args.indexOf(name);
  if (index < 0 || !args[index + 1]) usage();
  return args[index + 1];
}

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write("Usage: npm run evaluate -- --input <cases.json> --output <kits.json>\n");
  process.exit(0);
}

try {
  const inputPath = readFlag(args, "--input");
  const outputPath = readFlag(args, "--output");
  await evaluateFile(inputPath, outputPath);
  process.stdout.write(`Evaluation complete: ${outputPath}\n`);
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
