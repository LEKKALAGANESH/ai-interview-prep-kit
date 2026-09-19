import { buildQuestionGenerationPrompt, PROMPT_VERSIONS } from "@trao/interview-prep-server/generation/prompts.js";
import { compareRegressionRuns, type RegressionRecord } from "./regression.js";

export type PromptRegressionFixture = {
  requirementId: string;
  requirementText: string;
  requirementKind: "technical" | "behavioural" | "domain";
  requirementPriority: "must" | "nice";
  category: "technical" | "behavioural" | "system-design" | "company-fit";
  objective: string;
  difficulty: 1 | 2 | 3;
};

export function buildPromptRegressionSnapshot(fixtures: PromptRegressionFixture[]) {
  return fixtures.map((fixture) => {
    const prompt = buildQuestionGenerationPrompt(fixture);
    return {
      requirement_id: fixture.requirementId,
      prompt_version: PROMPT_VERSIONS.questionGeneration,
      system_instruction: prompt.systemInstruction,
      user_prompt: prompt.userPrompt,
    };
  });
}

export function comparePromptRegressionRuns(previous: RegressionRecord, current: RegressionRecord) {
  return {
    ...compareRegressionRuns(previous, current),
    prompt_versions_changed: JSON.stringify(previous.prompt_versions) !== JSON.stringify(current.prompt_versions),
  };
}
