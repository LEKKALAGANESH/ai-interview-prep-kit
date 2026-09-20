export type InterviewSearchResult = {
  title: string;
  url: string;
  snippet: string;
};

export interface InterviewResearchProvider {
  search(query: string): Promise<InterviewSearchResult[]>;
}

export type PublicInterviewResearch = {
  attempted: boolean;
  found: boolean;
  results: InterviewSearchResult[];
  note: string;
};

export async function researchPublicInterviews(
  companyUrl: string,
  provider?: InterviewResearchProvider,
): Promise<PublicInterviewResearch> {
  if (!provider) {
    return {
      attempted: false,
      found: false,
      results: [],
      note: "Search not attempted: BRAVE_SEARCH_API_KEY not set.",
    };
  }

  const hostname = new URL(companyUrl).hostname.replace(/^www\./, "");
  const queries = [
    `"${hostname}" interview process`,
    `"${hostname}" interview questions`,
  ];

  const results: InterviewSearchResult[] = [];
  const seen = new Set<string>();

  try {
    for (const query of queries) {
      const matches = await provider.search(query);
      for (const match of matches) {
        if (!match.url || seen.has(match.url)) continue;
        seen.add(match.url);
        results.push(match);
      }
    }

    return {
      attempted: true,
      found: results.length > 0,
      results,
      note: results.length
        ? "Public interview discussion search completed."
        : "No public interview discussion was found for the configured queries.",
    };
  } catch {
    return {
      attempted: true,
      found: false,
      results: [],
      note: "Public interview discussion search failed.",
    };
  }
}
