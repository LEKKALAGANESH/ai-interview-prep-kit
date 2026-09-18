import { validateExternalUrl } from "./url-validator.js";

export type RobotsPolicy = {
  allowed: boolean;
  source: string;
  reason: string;
};

function parseRules(body: string): { userAgent: string; disallow: string[] }[] {
  const groups: { userAgent: string; disallow: string[] }[] = [];
  let current: { userAgent: string; disallow: string[] } | null = null;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.split("#", 1)[0].trim();
    if (!line) continue;

    const separator = line.indexOf(":");
    if (separator === -1) continue;

    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === "user-agent") {
      current = { userAgent: value.toLowerCase(), disallow: [] };
      groups.push(current);
    } else if (field === "disallow" && current && value) {
      current.disallow.push(value);
    }
  }

  return groups;
}

function pathMatches(pathname: string, rule: string): boolean {
  if (rule === "/") return true;
  if (rule.endsWith("$")) return pathname === rule.slice(0, -1);
  return pathname.startsWith(rule);
}

export async function checkRobots(
  target: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RobotsPolicy> {
  const url = validateExternalUrl(target, { allowLocalhost: true });
  const robotsUrl = new URL("/robots.txt", url);

  let response: Response;

  try {
    response = await fetchImpl(robotsUrl.href, {
      method: "GET",
      redirect: "follow",
      headers: {
        accept: "text/plain",
        "user-agent": "Trao-AI-Interview-Prep-Kit/1.0",
      },
    });
  } catch {
    return {
      allowed: false,
      source: robotsUrl.href,
      reason: "robots.txt could not be retrieved",
    };
  }

  if (response.status === 404) {
    return {
      allowed: true,
      source: robotsUrl.href,
      reason: "robots.txt not found",
    };
  }

  if (!response.ok) {
    return {
      allowed: false,
      source: robotsUrl.href,
      reason: `robots.txt returned HTTP ${response.status}`,
    };
  }

  const rules = parseRules(await response.text());
  const applicable = rules.filter(
    (group) => group.userAgent === "*" || group.userAgent === "trao-ai-interview-prep-kit",
  );

  if (!applicable.length) {
    return {
      allowed: true,
      source: robotsUrl.href,
      reason: "No applicable robots.txt rules",
    };
  }

  const path = url.pathname || "/";
  const disallowed = applicable.some((group) =>
    group.disallow.some((rule) => pathMatches(path, rule)),
  );

  return {
    allowed: !disallowed,
    source: robotsUrl.href,
    reason: disallowed ? "Blocked by robots.txt" : "Allowed by robots.txt",
  };
}
