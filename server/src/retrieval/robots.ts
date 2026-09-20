import { assertPublicHost, validateExternalUrl, type HostResolver } from "./url-validator.js";

export type RobotsPolicy = {
  allowed: boolean;
  source: string;
  reason: string;
};

export type LoadedRobots = {
  crawlDelaySec: number;
  check(target: string | URL): RobotsPolicy;
};

type Rule = { allow: boolean; path: string };
type Group = { agents: string[]; rules: Rule[]; crawlDelay?: number };

const OUR_AGENT = "trao-ai-interview-prep-kit";
const MAX_ROBOTS_CHARS = 500_000;
const REDIRECT_STATUSES = [301, 302, 303, 307, 308];

function parseGroups(body: string): Group[] {
  const groups: Group[] = [];
  let current: Group | null = null;
  let collectingAgents = false;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.split("#", 1)[0].trim();
    const separator = line.indexOf(":");
    if (separator === -1) continue;

    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === "user-agent") {
      // Consecutive User-agent lines share one rule group.
      if (!collectingAgents || !current) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      collectingAgents = true;
      continue;
    }
    collectingAgents = false;
    if (!current) continue;
    if ((field === "allow" || field === "disallow") && value) {
      current.rules.push({ allow: field === "allow", path: value });
    } else if (field === "crawl-delay" && Number.isFinite(Number(value))) {
      current.crawlDelay = Number(value);
    }
  }
  return groups;
}

function ruleMatches(pathAndQuery: string, rule: string): boolean {
  const anchored = rule.endsWith("$");
  const pattern = (anchored ? rule.slice(0, -1) : rule)
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${pattern}${anchored ? "$" : ""}`).test(pathAndQuery);
}

function evaluate(groups: Group[], url: URL): boolean {
  // Longest matching rule wins; Allow wins a tie (RFC 9309).
  const target = `${url.pathname || "/"}${url.search}`;
  let best: Rule | null = null;
  for (const group of groups) {
    for (const rule of group.rules) {
      if (!ruleMatches(target, rule.path)) continue;
      if (!best || rule.path.length > best.path.length || (rule.path.length === best.path.length && rule.allow)) {
        best = rule;
      }
    }
  }
  return best ? best.allow : true;
}

function fixed(policy: RobotsPolicy): LoadedRobots {
  return { crawlDelaySec: 0, check: () => policy };
}

export async function loadRobots(
  target: string,
  fetchImpl: typeof fetch = fetch,
  options: { allowLocalhost?: boolean; resolver?: HostResolver } = {},
): Promise<LoadedRobots> {
  const url = validateExternalUrl(target, { allowLocalhost: options.allowLocalhost });
  const robotsUrl = new URL("/robots.txt", url);

  let response: Response | undefined;
  let currentUrl = robotsUrl.href;

  try {
    for (let redirect = 0; redirect <= 5; redirect += 1) {
      try {
        await assertPublicHost(new URL(currentUrl), options);
      } catch {
        return fixed({ allowed: false, source: currentUrl, reason: "robots.txt redirect destination is unsafe" });
      }

      response = await fetchImpl(currentUrl, {
        method: "GET",
        redirect: "manual",
        headers: {
          accept: "text/plain",
          "user-agent": "Trao-AI-Interview-Prep-Kit/1.0",
        },
      });

      if (!REDIRECT_STATUSES.includes(response.status)) break;

      const location = response.headers.get("location");
      if (!location) break;

      let next: URL;
      try {
        next = new URL(location, currentUrl);
        validateExternalUrl(next.href, { allowLocalhost: options.allowLocalhost });
      } catch {
        return fixed({ allowed: false, source: currentUrl, reason: "robots.txt redirect destination is unsafe" });
      }
      currentUrl = next.href;

      if (redirect === 5) {
        return fixed({ allowed: false, source: currentUrl, reason: "robots.txt redirect limit exceeded" });
      }
    }
  } catch {
    return fixed({ allowed: false, source: robotsUrl.href, reason: "robots.txt could not be retrieved" });
  }

  if (!response) {
    return fixed({ allowed: false, source: currentUrl, reason: "robots.txt could not be retrieved" });
  }
  if (response.status === 404) {
    return fixed({ allowed: true, source: robotsUrl.href, reason: "robots.txt not found" });
  }
  if (!response.ok) {
    return fixed({ allowed: false, source: robotsUrl.href, reason: `robots.txt returned HTTP ${response.status}` });
  }

  const groups = parseGroups((await response.text()).slice(0, MAX_ROBOTS_CHARS));
  const specific = groups.filter((group) => group.agents.includes(OUR_AGENT));
  const applicable = specific.length ? specific : groups.filter((group) => group.agents.includes("*"));

  if (!applicable.length) {
    return fixed({ allowed: true, source: robotsUrl.href, reason: "No applicable robots.txt rules" });
  }

  return {
    crawlDelaySec: Math.max(0, ...applicable.map((group) => group.crawlDelay ?? 0)),
    check(next) {
      const allowed = evaluate(applicable, typeof next === "string" ? new URL(next) : next);
      return {
        allowed,
        source: robotsUrl.href,
        reason: allowed ? "Allowed by robots.txt" : "Blocked by robots.txt",
      };
    },
  };
}

export async function checkRobots(
  target: string,
  fetchImpl: typeof fetch = fetch,
  options: { allowLocalhost?: boolean; resolver?: HostResolver } = {},
): Promise<RobotsPolicy> {
  return (await loadRobots(target, fetchImpl, options)).check(target);
}
