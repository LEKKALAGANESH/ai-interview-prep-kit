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


test("allows localhost redirects only for explicitly local research", async () => {
  const result = await checkRobots("http://localhost:3000", async () =>
    new Response(null, { status: 302, headers: { location: "http://localhost:3000/robots.txt" } }),
  );
  assert.equal(result.allowed, false);
});
