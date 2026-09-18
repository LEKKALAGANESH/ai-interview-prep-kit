import { extractRole } from "../extraction/pipeline.js";
import { createLlmRoleExtractionProvider } from "../generation/llm-extraction.js";
import { createConfiguredLlmProvider } from "../generation/provider.js";
import { researchCompany, type ResearchOptions } from "../retrieval/research.js";
import { validateExternalUrl } from "../retrieval/url-validator.js";
import type { NormalizedKitInput } from "@trao/interview-prep-shared/input-model.js";
import type { CompanyBrief } from "@trao/interview-prep-shared/kit.js";
import { generateAndPersistKit, type PersistedKitResult } from "./service.js";
import type { KitStore } from "../persistence/store.js";

export class ApplicationPipelineError extends Error {
  constructor(
    public readonly code:
      | "LLM_NOT_CONFIGURED"
      | "RESEARCH_FAILED"
      | "EXTRACTION_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "ApplicationPipelineError";
  }
}

function companyNameFromUrl(companyUrl: string): string {
  const hostname = new URL(companyUrl).hostname.replace(/^www\./i, "");
  const label = hostname.split(".")[0] || "Company";
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function buildCompanyBrief(
  research: Awaited<ReturnType<typeof researchCompany>>,
): CompanyBrief {
  const page = research.pages[0];
  const summary =
    page?.text.slice(0, 500).trim() ||
    "No company summary was available from the researched pages.";
  return {
    summary,
    what_they_do:
      page?.text.slice(0, 1000).trim() ||
      "No company description was available from the researched pages.",
    sources: research.pages.map((item) => item.url),
  };
}

export type ApplicationPipelineOptions = {
  store: KitStore;
  fetchImpl?: typeof fetch;
  research?: Omit<ResearchOptions, "fetchImpl">;
  llmProvider?: ReturnType<typeof createConfiguredLlmProvider>;
  allowLocalhost?: boolean;
};

export async function generateKitFromInput(
  input: NormalizedKitInput,
  options: ApplicationPipelineOptions,
): Promise<PersistedKitResult> {
  const provider =
    options.llmProvider ?? createConfiguredLlmProvider(options.fetchImpl);
  if (!provider) {
    throw new ApplicationPipelineError(
      "LLM_NOT_CONFIGURED",
      "GEMINI_API_KEY is not configured",
    );
  }

  let companyUrl: string;
  try {
    companyUrl = validateExternalUrl(input.company_url, {
      allowLocalhost: options.allowLocalhost,
    }).href;
  } catch (error) {
    throw new ApplicationPipelineError(
      "RESEARCH_FAILED",
      error instanceof Error ? error.message : "Company URL validation failed",
    );
  }

  let research: Awaited<ReturnType<typeof researchCompany>>;
  try {
    research = await researchCompany(companyUrl, {
      ...options.research,
      allowLocalhost: options.allowLocalhost,
      fetchImpl: options.fetchImpl,
    });
  } catch (error) {
    throw new ApplicationPipelineError(
      "RESEARCH_FAILED",
      error instanceof Error ? error.message : "Company research failed",
    );
  }

  if (research.robots.allowed && research.pages.length === 0) {
    throw new ApplicationPipelineError(
      "RESEARCH_FAILED",
      "Company URL could not be retrieved; no usable company page was found",
    );
  }

  let role;
  try {
    role = await extractRole(input.job_description, {
      provider: createLlmRoleExtractionProvider(provider),
    });
  } catch (error) {
    throw new ApplicationPipelineError(
      "EXTRACTION_FAILED",
      error instanceof Error ? error.message : "Job description extraction failed",
    );
  }

  return generateAndPersistKit(
    input,
    {
      company: companyNameFromUrl(companyUrl),
      role,
      companyBrief: buildCompanyBrief(research),
      research,
      provider,
    },
    options.store,
  );
}
