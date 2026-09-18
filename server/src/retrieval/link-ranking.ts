export type RankedLink = {
  url: string;
  score: number;
  reasons: string[];
};

const SIGNALS: Array<[RegExp, number, string]> = [
  [/hiring|interview|selection|candidate/i, 10, "hiring/interview signal"],
  [/career|careers|jobs|job-opening|vacanc/i, 9, "career/jobs signal"],
  [/about|company|mission|values|culture/i, 6, "company information signal"],
  [/engineering|technology|tech/i, 4, "engineering signal"],
];

export function rankLinks(
  links: string[],
  baseUrl: string,
): RankedLink[] {
  const base = new URL(baseUrl);
  const ranked: RankedLink[] = [];

  for (const rawLink of links) {
    let url: URL;

    try {
      url = new URL(rawLink, base);
    } catch {
      continue;
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") continue;
    if (url.origin !== base.origin) continue;

    url.hash = "";

    const haystack = `${url.pathname} ${url.search}`;
    let score = 0;
    const reasons: string[] = [];

    for (const [pattern, points, reason] of SIGNALS) {
      if (pattern.test(haystack)) {
        score += points;
        reasons.push(reason);
      }
    }

    if (url.pathname === "/") score -= 5;

    ranked.push({
      url: url.href,
      score,
      reasons,
    });
  }

  return ranked
    .filter((link) => link.score > 0)
    .sort((a, b) => b.score - a.score || a.url.localeCompare(b.url));
}
