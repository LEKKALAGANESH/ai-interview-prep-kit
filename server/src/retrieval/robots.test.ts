import test from "node:test";
import assert from "node:assert/strict";
import { checkRobots } from "./robots.js";

test("allows a missing robots.txt", async () => {
  const result = await checkRobots("https://example.com", async () => new Response("missing", { status: 404 }));
  assert.equal(result.allowed, true);
});

test("blocks paths disallowed for the application user agent", async () => {
  const result = await checkRobots("https://example.com/private/page", async () =>
    new Response("User-agent: *\nDisallow: /private", { status: 200 }),
  );
  assert.equal(result.allowed, false);
});

test("allows paths outside disallowed prefixes", async () => {
  const result = await checkRobots("https://example.com/careers", async () =>
    new Response("User-agent: *\nDisallow: /private", { status: 200 }),
  );
  assert.equal(result.allowed, true);
});

test("rejects unsafe robots redirects", async () => {
  const result = await checkRobots("https://example.com", async () =>
    new Response(null, { status: 302, headers: { location: "http://127.0.0.1:8080/robots.txt" } }),
  );
  assert.equal(result.allowed, false);
  assert.match(result.reason, /unsafe/i);
});

test("rejects redirect loops beyond the configured limit", async () => {
  const result = await checkRobots("https://example.com", async (input) =>
    new Response(null, { status: 302, headers: { location: String(input) } }),
  );
  assert.equal(result.allowed, false);
  assert.match(result.reason, /limit/i);
});


test("rejects localhost redirects for public research", async () => {
  const result = await checkRobots("https://example.com", async () =>
    new Response(null, { status: 302, headers: { location: "http://localhost:3000/robots.txt" } }),
  );
  assert.equal(result.allowed, false);
  assert.match(result.reason, /unsafe/i);
});

const robots = (body: string) => async () => new Response(body, { status: 200 });

test("Allow overrides a shorter Disallow (longest match wins)", async () => {
  const body = "User-agent: *\nDisallow: /careers\nAllow: /careers/open";
  assert.equal((await checkRobots("https://example.com/careers/open/1", robots(body))).allowed, true);
  assert.equal((await checkRobots("https://example.com/careers/private", robots(body))).allowed, false);
});

test("supports * and $ wildcards", async () => {
  const body = "User-agent: *\nDisallow: /*.pdf$\nDisallow: /a/*/secret";
  assert.equal((await checkRobots("https://example.com/x/y.pdf", robots(body))).allowed, false);
  assert.equal((await checkRobots("https://example.com/x/y.pdf?x=1", robots(body))).allowed, true);
  assert.equal((await checkRobots("https://example.com/a/b/secret", robots(body))).allowed, false);
});

test("a multi-line User-agent group applies to every listed agent", async () => {
  const body = "User-agent: googlebot\nUser-agent: trao-ai-interview-prep-kit\nDisallow: /jobs\n\nUser-agent: *\nDisallow:";
  assert.equal((await checkRobots("https://example.com/jobs", robots(body))).allowed, false);
});

test("the specific agent group beats the * group", async () => {
  const body = "User-agent: *\nDisallow: /\n\nUser-agent: trao-ai-interview-prep-kit\nAllow: /";
  assert.equal((await checkRobots("https://example.com/careers", robots(body))).allowed, true);
});

test("loadRobots exposes Crawl-delay and checks each URL separately", async () => {
  const { loadRobots } = await import("./robots.js");
  const loaded = await loadRobots("https://example.com", robots("User-agent: *\nCrawl-delay: 3\nDisallow: /private"));
  assert.equal(loaded.crawlDelaySec, 3);
  assert.equal(loaded.check("https://example.com/careers").allowed, true);
  assert.equal(loaded.check("https://example.com/private/x").allowed, false);
});
