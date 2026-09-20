import { extractRole } from "../extraction/pipeline.js";
import { createLlmRoleExtractionProvider } from "../generation/llm-extraction.js";
import { createConfiguredLlmProvider } from "../generation/provider.js";
import { researchCompany, type ResearchOptions } from "../retrieval/research.js";
import { researchPagesToClaims } from "../retrieval/evidence.js";
import { validateExternalUrl } from "../retrieval/url-validator.js";
import type { NormalizedKitInput } from "@trao/interview-prep-shared/input-model.js";
import type { CompanyBrief } from "@trao/interview-prep-shared/kit.js";
import { generateAndPersistKit, type PersistedKitResult } from "./service.js";
import type { KitStore } from "../persistence/store.js";
import { observeStage, type GenerationObserver } from "../generation/observability.js";

export class ApplicationPipelineError extends Error {
  constructor(
    public readonly code:
      | "LLM_NOT_CONFIGURED"
      | "RESEARCH_FAILED"
      | "COMPANY_UNREACHABLE"
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

type ResearchResult = Awaited<ReturnType<typeof researchCompany>>;

const MIN_USABLE_PAGE_CHARS = 200;
const JS_SHELL_TEXT = /skip to content|loading\.{0,3}|enable javascript/gi;

// JS-rendered shells ("Skip to content Loading...") extract to almost nothing.
function usablePages(research: ResearchResult): ResearchResult["pages"] {
  return research.pages.filter(
    (page) => page.text.replace(JS_SHELL_TEXT, "").trim().length >= MIN_USABLE_PAGE_CHARS,
  );
}

// ponytail: extractive brief from the first readable page; add LLM synthesis if it reads poorly.
function buildCompanyBrief(pages: ResearchResult["pages"]): CompanyBrief {
  const page = pages[0];
  if (!page) {
    const note =
      "Little readable content was found on the company site (it may be rendered by JavaScript or have no public pages), so this brief is based on the job description only.";
    return { summary: note, what_they_do: note, sources: [] };
  }
  return {
    summary: page.text.slice(0, 500).trim(),
    what_they_do: page.text.slice(0, 1000).trim(),
    sources: pages.map((item) => item.url),
  };
}

export type ApplicationPipelineOptions = {
  store: KitStore;
  fetchImpl?: typeof fetch;
  research?: Omit<ResearchOptions, "fetchImpl">;
  llmProvider?: ReturnType<typeof createConfiguredLlmProvider>;
  allowLocalhost?: boolean;
  observer?: GenerationObserver;
};

export async function generateKitFromInput(
  input: NormalizedKitInput,
  options: ApplicationPipelineOptions,
): Promise<PersistedKitResult> {
  const provider =
    options.llmProvider ?? createConfiguredLlmProvider(options.fetchImpl, {
      provider: input.llm_provider,
      model: input.llm_model,
    });
  if (!provider) {
    throw new ApplicationPipelineError(
      "LLM_NOT_CONFIGURED",
      `${input.llm_provider ?? process.env.LLM_PROVIDER ?? "gemini"} provider is not configured`,
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
    research = await observeStage(options.observer, "research", () => researchCompany(companyUrl, {
      ...options.research,
      allowLocalhost: options.allowLocalhost,
      fetchImpl: options.fetchImpl,
    }));
  } catch (error) {
    throw new ApplicationPipelineError(
      "COMPANY_UNREACHABLE",
      error instanceof Error ? error.message : "Company research failed",
    );
  }

  if (research.robots.allowed && research.pages.length === 0) {
    throw new ApplicationPipelineError(
      "COMPANY_UNREACHABLE",
      "Company site unreachable: no page could be retrieved",
    );
  }

  let role;
  try {
    role = await observeStage(options.observer, "extraction", () => extractRole(input.job_description, {
      provider: createLlmRoleExtractionProvider(provider),
    }));
  } catch (error) {
    throw new ApplicationPipelineError(
      "EXTRACTION_FAILED",
      error instanceof Error ? error.message : "Job description extraction failed",
    );
  }

  const goodPages = usablePages(research);
  const result = await generateAndPersistKit(
    input,
    {
      company: companyNameFromUrl(companyUrl),
      role,
      companyBrief: buildCompanyBrief(goodPages),
      research: { ...research, pages: goodPages },
      provider,
      observer: options.observer,
    },
    options.store,
  );
  await observeStage(options.observer, "provenance", () =>
    options.store.saveResearchProvenance(result.id, {
      researched_at: new Date().toISOString(),
      claims: [
        ...researchPagesToClaims(research.pages),
        ...research.public_interview_research.results.map((item) => ({
          claim: item.title,
          source_url: item.url,
          source_type: "public-interview" as const,
          evidence: item.snippet,
          confidence_basis: "public discussion; not verified company policy or official process",
        })),
      ],
    }),
  );
  return result;
}
