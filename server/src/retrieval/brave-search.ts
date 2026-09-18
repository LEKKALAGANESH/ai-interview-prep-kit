import type { InterviewResearchProvider, InterviewSearchResult } from "./interview-research.js";

type BraveSearchResponse = {
  web?: {
    results?: Array<{
      title?: string;
      url?: string;
      description?: string;
    }>;
  };
};

export class BraveSearchProvider implements InterviewResearchProvider {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

export function createConfiguredInterviewResearchProvider(
  fetchImpl: typeof fetch = fetch,
): BraveSearchProvider | undefined {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY?.trim();
  return apiKey ? new BraveSearchProvider(apiKey, fetchImpl) : undefined;
}
  async search(query: string): Promise<InterviewSearchResult[]> {
    if (!this.apiKey.trim()) throw new Error("Brave Search API key is missing");

    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", "10");

    const response = await this.fetchImpl(url.href, {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-subscription-token": this.apiKey,
        "user-agent": "Trao-AI-Interview-Prep-Kit/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Brave Search returned HTTP ${response.status}`);
    }

    const payload = (await response.json()) as BraveSearchResponse;

    return (payload.web?.results ?? [])
      .filter((item) => Boolean(item.title && item.url))
      .map((item) => ({
        title: item.title!,
        url: item.url!,
        snippet: item.description ?? "",
      }));
  }
}
