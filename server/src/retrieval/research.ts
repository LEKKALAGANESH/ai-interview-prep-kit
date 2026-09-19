import { cleanHtml } from "./clean-html.js";
import { fetchPage, RetrievalError } from "./http-client.js";
import { rankLinks } from "./link-ranking.js";
import { checkRobots } from "./robots.js";
import { createConfiguredInterviewResearchProvider } from "./brave-search.js";
import { researchPublicInterviews, type InterviewResearchProvider } from "./interview-research.js";
import { withRetry } from "./retry.js";
import { validateExternalUrl } from "./url-validator.js";
import { buildRankedEvidencePacket, researchPagesToClaims, type EvidenceClaim } from "./evidence.js";

export type ResearchPage = {
  url: string;
  title: string;
  text: string;
  links: string[];
};

export type ResearchResult = {
  company_url: string;
  pages: ResearchPage[];
  robots: {
    checked: boolean;
    allowed: boolean;
    source: string;
    reason: string;
  };
  skipped: Array<{
    url: string;
    reason: string;
  }>;
  public_interview_research: {
    attempted: boolean;
    found: boolean;
    results: Array<{ title: string; url: string; snippet: string }>;
    note: string;
  };
};

export function buildResearchEvidencePacket(research: ResearchResult, query = ""): string {
  const claims: EvidenceClaim[] = [
    ...researchPagesToClaims(research.pages),
    ...research.public_interview_research.results.map((item) => ({
      claim: item.title,
      source_url: item.url,
      source_type: "public-interview" as const,
      evidence: item.snippet,
      confidence_basis: "public discussion; not verified company policy or official process",
    })),
  ];
  return buildRankedEvidencePacket(claims, query);
}
