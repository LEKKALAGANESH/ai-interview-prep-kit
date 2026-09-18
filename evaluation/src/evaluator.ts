import { readFile, writeFile } from "node:fs/promises";
import {
  EvaluationInputSchema,
  EvaluationOutputSchema,
  type EvaluationOutput,
  type EvaluationResult,
} from "@trao/interview-prep-shared/kit.js";
import { normalizeBatchInput } from "@trao/interview-prep-shared/input-model.js";
import { generateKitFromInput } from "@trao/interview-prep-server/pipeline/orchestrator.js";
import { createKitStore, type KitStore } from "@trao/interview-prep-server/persistence/store.js";

export type EvaluatorOptions = {
  store?: KitStore;
  generate?: typeof generateKitFromInput;
};

function errorResult(id: string, error: unknown): EvaluationResult {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "EVALUATION_FAILED")
      : "EVALUATION_FAILED";
  const message = error instanceof Error ? error.message : String(error);

  return {
    id,
    status: "failed",
    kit: null,
    error: { code, message },
  };
}

export async function evaluateCases(
  input: unknown,
  options: EvaluatorOptions = {},
): Promise<EvaluationOutput> {
  const cases = EvaluationInputSchema.parse(input);
  const normalized = normalizeBatchInput(cases);
  const store = options.store ?? createKitStore();
  const generate = options.generate ?? generateKitFromInput;
  const kits: EvaluationResult[] = [];

  for (const item of normalized) {
    try {
      const result = await generate(item.input, {
        store,
        allowLocalhost: true,
      });
      kits.push({
        id: item.id,
        status: "ok",
        kit: result.kit,
        error: null,
      });
    } catch (error) {
      kits.push(errorResult(item.id, error));
    }
  }

  return EvaluationOutputSchema.parse({
    version: "1.0",
    generated_at: new Date().toISOString(),
    kits,
  });
}

export async function evaluateFile(
  inputPath: string,
  outputPath: string,
  options: EvaluatorOptions = {},
): Promise<EvaluationOutput> {
  const raw = await readFile(inputPath, "utf8");
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Input file must contain valid JSON");
  }

  const output = await evaluateCases(parsed, options);
  await writeFile(outputPath, JSON.stringify(output, null, 2) + "\n", "utf8");
  return output;
}
