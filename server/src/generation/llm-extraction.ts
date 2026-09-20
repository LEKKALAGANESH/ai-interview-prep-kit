import type { RoleExtractionProvider } from "../extraction/types.js";
import { RawRoleExtractionSchema } from "@trao/interview-prep-shared/extraction.js";
import type { LlmProvider } from "./provider.js";
import { buildRoleExtractionPrompt } from "./prompts.js";

export function createLlmRoleExtractionProvider(
  provider: LlmProvider,
): RoleExtractionProvider {
  return {
    async extractRole({ jobDescription }) {
      const response = await provider.generate(buildRoleExtractionPrompt({ jobDescription }));

      return RawRoleExtractionSchema.parse(response);
    },
  };
}
