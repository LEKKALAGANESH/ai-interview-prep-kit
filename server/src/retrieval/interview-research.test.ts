import test from "node:test";
import assert from "node:assert/strict";
import { researchPublicInterviews } from "./interview-research.js";

test("searches public interview discussions with two company queries", async () => {
  const queries: string[] = [];
  const result = await researchPublicInterviews("https://example.com", {
    async search(query) {
      queries.push(query);
      return query.includes("process")
        ? [{ title: "Process", url: "https://forum.example/process", snippet: "discussion" }]
        : [{ title: "Questions", url: "https://forum.example/questions", snippet: "questions" }];
    },
  });

  assert.equal(result.attempted, true);
  assert.equal(result.found, true);
  assert.equal(result.results.length, 2);
  assert.equal(queries.length, 2);
});

test("deduplicates public research results", async () => {
  const result = await researchPublicInterviews("https://example.com", {
    async search() {
      return [{ title: "Same", url: "https://forum.example/same", snippet: "x" }];
    },
  });
  assert.equal(result.results.length, 1);
});

test("reports provider failures without breaking company retrieval", async () => {
  const result = await researchPublicInterviews("https://example.com", {
    async search() { throw new Error("rate limited"); },
  });
  assert.equal(result.attempted, true);
  assert.equal(result.found, false);
  assert.match(result.note, /failed/i);
});

test("reports search as not attempted, naming the missing key", async () => {
  const { researchPublicInterviews } = await import("./interview-research.js");
  const result = await researchPublicInterviews("https://example.com");
  assert.equal(result.attempted, false);
  assert.match(result.note, /BRAVE_SEARCH_API_KEY/);
});
