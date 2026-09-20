import { cleanHtml } from "./clean-html.js";
import { fetchPage, RetrievalError } from "./http-client.js";
import { rankLinks } from "./link-ranking.js";
import { loadRobots, type LoadedRobots } from "./robots.js";
import { createConfiguredInterviewResearchProvider } from "./brave-search.js";
import { researchPublicInterviews, type InterviewResearchProvider } from "./interview-research.js";
import { withRetry } from "./retry.js";
import { validateExternalUrl, type HostResolver } from "./url-validator.js";
import { buildRankedEvidencePacket, researchPagesToClaims, type EvidenceClaim } from "./evidence.js";

export type ResearchPage = {
  url: string;
  fetched_at: string;
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

export type ResearchOptions = {
  maxPages?: number;
  allowLocalhost?: boolean;
  fetchImpl?: typeof fetch;
  interviewResearchProvider?: InterviewResearchProvider;
  /** Pause between page fetches; raised to the site's Crawl-delay (capped). */
  requestDelayMs?: number;
  resolver?: HostResolver;
};

const DEFAULT_REQUEST_DELAY_MS = 500;
const MAX_CRAWL_DELAY_MS = 10_000;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function researchCompany(
  companyUrl: string,
  options: ResearchOptions = {},
): Promise<ResearchResult> {
  const maxPages = Math.max(1, options.maxPages ?? 6);
  const fetchImpl = options.fetchImpl ?? fetch;
  const root = validateExternalUrl(companyUrl, {
    allowLocalhost: options.allowLocalhost,
  });

  const robotsCache = new Map<string, Promise<LoadedRobots>>();
  const robotsFor = (url: URL | string): Promise<LoadedRobots> => {
    const href = typeof url === "string" ? url : url.href;
    const origin = new URL(href).origin;
    let loaded = robotsCache.get(origin);
    if (!loaded) {
      loaded = loadRobots(href, fetchImpl, { allowLocalhost: options.allowLocalhost, resolver: options.resolver });
      robotsCache.set(origin, loaded);
    }
    return loaded;
  };
  const robots = (await robotsFor(root)).check(root);

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
      note: "Public interview discussion research has not run yet.",
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
      if (result.pages.length + result.skipped.length > 0) {
        const { crawlDelaySec } = await robotsFor(current);
        await sleep(Math.max(options.requestDelayMs ?? DEFAULT_REQUEST_DELAY_MS, Math.min(crawlDelaySec * 1000, MAX_CRAWL_DELAY_MS)));
      }
      const page = await withRetry(
        () =>
          fetchPage(current, {
            fetchImpl,
            allowLocalhost: options.allowLocalhost,
            resolver: options.resolver,
            // Runs on every hop, so redirects to another origin are re-checked against that origin's robots.txt.
            guard: async (url) => {
              const policy = (await robotsFor(url)).check(url);
              if (!policy.allowed) throw new Error(`${policy.reason}: ${url.href}`);
            },
          }),
        { attempts: 3 },
      );

      const cleaned = cleanHtml(page.body);

      result.pages.push({
        url: page.url,
        fetched_at: new Date().toISOString(),
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
