import test from "node:test";
import assert from "node:assert/strict";
import { researchCompany, buildResearchEvidencePacket } from "./research.js";

function response(body: string, status = 200, contentType = "text/html") {
  return new Response(body, { status, headers: { "content-type": contentType } });
}

test("crawls ranked same-origin pages and records page failures", async () => {
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith("/robots.txt")) return new Response("User-agent: *\nAllow: /", { status: 200 });
    if (url.endsWith("/")) {
      return response('<title>Home</title><a href="/about">About</a><a href="/careers">Careers</a><a href="https://other.example/x">External</a>');
    }
    if (url.endsWith("/careers")) return response('<title>Careers</title>Hiring engineers');
    if (url.endsWith("/about")) return new Response("no", { status: 503, headers: { "content-type": "text/html" } });
    throw new Error("unexpected URL");
  };

  const result = await researchCompany("http://localhost:3000", {
    requestDelayMs: 0,
    allowLocalhost: true,
    fetchImpl,
    maxPages: 3,
    interviewResearchProvider: { async search() { return []; } },
  });

  assert.deepEqual(result.pages.map((page) => page.url), [
    "http://localhost:3000/",
    "http://localhost:3000/careers",
  ]);
  assert.ok(result.skipped.some((item) => item.url.endsWith("/about")));
  assert.equal(result.public_interview_research.attempted, true);
  assert.ok(calls.includes("http://localhost:3000/robots.txt"));
});

test("stops company crawling when robots.txt disallows the root", async () => {
  let pageCalls = 0;
  const result = await researchCompany("http://localhost:3000", {
    requestDelayMs: 0,
    allowLocalhost: true,
    fetchImpl: async (input) => {
      const url = String(input);
      if (url.endsWith("/robots.txt")) {
        return new Response("User-agent: *\nDisallow: /", { status: 200 });
      }
      pageCalls += 1;
      return response("<title>Home</title>ignored");
    },
  });

  assert.equal(pageCalls, 0);
  assert.equal(result.robots.allowed, false);
  assert.equal(result.pages.length, 0);
});


test("builds source-labeled evidence packets without treating public discussion as official fact", () => {
  const packet = buildResearchEvidencePacket({
    company_url: "https://example.com/",
    pages: [{ url: "https://example.com/about", fetched_at: "2026-09-19T00:00:00.000Z", title: "About", text: "Builds developer tools.", links: [] }],
    robots: { checked: true, allowed: true, source: "https://example.com/robots.txt", reason: "allowed" },
    skipped: [],
    public_interview_research: {
      attempted: true,
      found: true,
      results: [{ title: "Interview thread", url: "https://forum.example/thread", snippet: "Two rounds reported by a candidate." }],
      note: "found",
    },
  });
  assert.match(packet, /\[COMPANY_PRIMARY_1\]/);
  assert.match(packet, /https:\/\/example.com\/about/);
  assert.match(packet, /\[PUBLIC_INTERVIEW_1\]/);
  assert.match(packet, /not verified company policy/i);
});


test("records freshness timestamps for retrieved pages", async () => {
  const result = await researchCompany("https://example.com/", {
    requestDelayMs: 0,
    fetchImpl: async (input) => {
      if (String(input).endsWith("/robots.txt")) return new Response("", { status: 404 });
      return new Response("<html><title>Example</title><body>Evidence</body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    },
  });
  assert.equal(result.pages.length, 1);
  assert.match(result.pages[0].fetched_at, /^2026|^20/);
});


test("research evidence packet stays bounded under maximum claim volume", async () => {
  const claims = Array.from({ length: 100 }, (_, index) => ({
    claim: `Claim ${index}`,
    source_url: `https://example.com/page/${index}`,
    source_type: "company-primary" as const,
    evidence: "x".repeat(1800),
    confidence_basis: "company primary page",
  }));
  const { buildRankedEvidencePacket } = await import("./evidence.js");
  const packet = buildRankedEvidencePacket(claims, "Claim", 9000);
  assert.ok(packet.length <= 9000);
});
