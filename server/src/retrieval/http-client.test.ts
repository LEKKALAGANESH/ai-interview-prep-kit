import test from "node:test";
import assert from "node:assert/strict";
import { fetchPage, RetrievalError } from "./http-client.js";

function mockFetch(response: Response): typeof fetch {
  return async () => response;
}

test("fetches an HTML page", async () => {
  const page = await fetchPage("https://example.com", {
    fetchImpl: mockFetch(
      new Response("<html><body>Hello</body></html>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    ),
  });

  assert.equal(page.status, 200);
  assert.equal(page.contentType, "text/html");
  assert.match(page.body, /Hello/);
});

test("rejects non-HTML content", async () => {
  await assert.rejects(
    fetchPage("https://example.com/data.json", {
      fetchImpl: mockFetch(
        new Response("{}", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    }),
    (error: unknown) =>
      error instanceof RetrievalError &&
      error.code === "CONTENT_TYPE_UNSUPPORTED",
  );
});

test("rejects non-success HTTP status", async () => {
  await assert.rejects(
    fetchPage("https://example.com/missing", {
      fetchImpl: mockFetch(new Response("Not found", { status: 404 })),
    }),
    (error: unknown) =>
      error instanceof RetrievalError &&
      error.code === "HTTP_ERROR",
  );
});

test("rejects responses above the byte limit", async () => {
  await assert.rejects(
    fetchPage("https://example.com", {
      maxBytes: 10,
      fetchImpl: mockFetch(
        new Response("<html>too large</html>", {
          status: 200,
          headers: { "content-type": "text/html", "content-length": "22" },
        }),
      ),
    }),
    (error: unknown) =>
      error instanceof RetrievalError &&
      error.code === "CONTENT_TOO_LARGE",
  );
});
