import { evaluateFile } from "./evaluator.js";

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
