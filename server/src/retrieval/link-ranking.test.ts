import test from "node:test";
import assert from "node:assert/strict";
import { rankLinks } from "./link-ranking.js";

test("ranks relevant same-origin links by hiring signal", () => {
  const links = rankLinks([
    "/about",
    "/careers",
    "/interview-process",
    "https://other.example/jobs",
    "mailto:jobs@example.com",
  ], "https://example.com");

  assert.deepEqual(links.map((link) => link.url), [
    "https://example.com/interview-process",
    "https://example.com/careers",
    "https://example.com/about",
  ]);
});

test("normalizes fragments and ignores links without useful signals", () => {
  const links = rankLinks(["/engineering#team", "/contact"], "https://example.com");
  assert.equal(links[0].url, "https://example.com/engineering");
  assert.equal(links.some((link) => link.url.endsWith("/contact")), false);
});
