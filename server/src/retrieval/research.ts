import { cleanHtml } from "./clean-html.js";
import { fetchPage, RetrievalError } from "./http-client.js";
import { rankLinks } from "./link-ranking.js";
import { checkRobots } from "./robots.js";
import { createConfiguredInterviewResearchProvider } from "./brave-search.js";
import { researchPublicInterviews, type InterviewResearchProvider } from "./interview-research.js";
import { withRetry } from "./retry.js";
import { validateExternalUrl } from "./url-validator.js";

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
    note: string;
  };
};

export type ResearchOptions = {
  maxPages?: number;
  allowLocalhost?: boolean;
  fetchImpl?: typeof fetch;
};

export async function researchCompany(
  companyUrl: string,
  options: ResearchOptions = {},
): Promise<ResearchResult> {
  const maxPages = Math.max(1, options.maxPages ?? 6);
  const fetchImpl = options.fetchImpl ?? fetch;
  const root = validateExternalUrl(companyUrl, {
    allowLocalhost: options.allowLocalhost,
  });

  const robots = await checkRobots(root.href, fetchImpl);

  const result: ResearchResult = {
    company_url: root.href,
    pages: [],
    robots: {
      checked: true,
      ...robots,
    },
    skipped: [],
    public_interview_research: {
      attempted: false,
      found: false,
      results: [],
      note: "Public interview discussion research is not yet connected to an external search provider.",
    },
  };

  const interviewProvider =
    options.interviewResearchProvider ?? createConfiguredInterviewResearchProvider(fetchImpl);
  const interviewResearch = await researchPublicInterviews(root.href, interviewProvider);
  result.public_interview_research = interviewResearch;

  if (!robots.allowed) {
    result.skipped.push({
      url: root.href,
      reason: robots.reason,
    });
    return result;
  }

  const visited = new Set<string>();
  const queue = [root.href];

  while (queue.length && result.pages.length < maxPages) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    try {
      const page = await withRetry(
        () =>
          fetchPage(current, {
            fetchImpl,
            allowLocalhost: options.allowLocalhost,
          }),
        { attempts: 3 },
      );

      const cleaned = cleanHtml(page.body);

      result.pages.push({
        url: page.url,
        title: cleaned.title,
        text: cleaned.text,
        links: cleaned.links,
      });

      const ranked = rankLinks(cleaned.links, page.url);

      for (const candidate of ranked) {
        if (!visited.has(candidate.url) && !queue.includes(candidate.url)) {
          queue.push(candidate.url);
        }
      }
    } catch (error) {
      result.skipped.push({
        url: current,
        reason:
          error instanceof RetrievalError || error instanceof Error
            ? error.message
            : "Unknown retrieval failure",
      });
    }
  }

  return result;
}
