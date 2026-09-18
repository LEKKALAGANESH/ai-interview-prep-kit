import test from "node:test";
import assert from "node:assert/strict";
import { BraveSearchProvider } from "./brave-search.js";

test("maps Brave search results into the internal research shape", async () => {
  const provider = new BraveSearchProvider("test-key", async (input, init) => {
    assert.match(String(input), /q=%22example\.com%22/);
    assert.equal((init?.headers as Record<string, string>)["x-subscription-token"], "test-key");
    return new Response(JSON.stringify({
      web: { results: [{ title: "Interview process", url: "https://example.com/post", description: "Candidate discussion" }] },
    }), { status: 200, headers: { "content-type": "application/json" } });
  });

  const results = await provider.search('"example.com" interview process');
  assert.deepEqual(results, [{
    title: "Interview process",
    url: "https://example.com/post",
    snippet: "Candidate discussion",
  }]);
});
