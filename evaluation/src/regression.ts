import type { EvaluationOutput } from "@trao/interview-prep-shared/kit.js";

export type RegressionMetadata = {
  provider: string;
  model: string;
  prompt_versions: string[];
  generated_at: string;
};

export type RegressionRecord = RegressionMetadata & {
  output: EvaluationOutput;
};

export function compareRegressionRuns(previous: RegressionRecord, current: RegressionRecord) {
  const previousScore = previous.output.kits.filter((item) => item.status === "ok").length;
  const currentScore = current.output.kits.filter((item) => item.status === "ok").length;
  return {
    previous_successes: previousScore,
    current_successes: currentScore,
    delta_successes: currentScore - previousScore,
    provider_changed: previous.provider !== current.provider || previous.model !== current.model,
    prompt_versions_changed: JSON.stringify(previous.prompt_versions) !== JSON.stringify(current.prompt_versions),
  };
}

export function compareProviders(
  runs: RegressionRecord[],
): Array<{ provider: string; model: string; successes: number; cases: number }> {
  return runs.map((run) => ({
    provider: run.provider,
    model: run.model,
    successes: run.output.kits.filter((item) => item.status === "ok").length,
    cases: run.output.kits.length,
  }));
}
