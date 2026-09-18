import test from "node:test";
import assert from "node:assert/strict";
import { researchCompany } from "./research.js";

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
