import type { RawRoleExtraction } from "@trao/interview-prep-shared/extraction.js";

export type ExtractionRequest = {
  jobDescription: string;
};

export interface RoleExtractionProvider {
  extractRole(request: ExtractionRequest): Promise<RawRoleExtraction>;
}
