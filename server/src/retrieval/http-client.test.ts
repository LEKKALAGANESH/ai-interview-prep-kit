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

test("revalidates redirect destinations before following them", async () => {
  let calls = 0;

  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    return new Response(null, {
      status: 302,
      headers: { location: "http://127.0.0.1:8080/admin" },
    });
  };

  await assert.rejects(
    fetchPage("https://example.com", { fetchImpl }),
    (error: unknown) =>
      error instanceof RetrievalError &&
      error.code === "INVALID_URL" &&
      error.message.includes("Unsafe redirect destination"),
  );

  assert.equal(calls, 1);
});

test("enforces a maximum redirect count", async () => {
  const fetchImpl: typeof fetch = async (input) =>
    new Response(null, {
      status: 302,
      headers: { location: String(input) + "/next" },
    });

  await assert.rejects(
    fetchPage("https://example.com", {
      fetchImpl,
      maxRedirects: 2,
    }),
    (error: unknown) =>
      error instanceof RetrievalError &&
      error.code === "REDIRECT_LIMIT",
  );
});

test("aborts a streamed body that exceeds maxBytes without a content-length", async () => {
  const chunk = new TextEncoder().encode("x".repeat(400));
  let pulls = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) { pulls += 1; controller.enqueue(chunk); },
  });
  await assert.rejects(
    fetchPage("https://example.com", {
      maxBytes: 1000,
      fetchImpl: mockFetch(new Response(body, { status: 200, headers: { "content-type": "text/html" } })),
    }),
    (error: unknown) => error instanceof RetrievalError && error.code === "CONTENT_TOO_LARGE",
  );
  assert.ok(pulls < 10, "stream must stop being read once the limit is hit");
});

test("rejects a hostname that resolves to a private address before fetching", async () => {
  let fetched = false;
  await assert.rejects(
    fetchPage("https://internal.example.com", {
      resolver: async () => ["10.1.2.3"],
      fetchImpl: async () => { fetched = true; return new Response("", { status: 200 }); },
    }),
    (error: unknown) => error instanceof RetrievalError && error.code === "INVALID_URL",
  );
  assert.equal(fetched, false);
});

test("guard runs on redirect targets and can block them", async () => {
  const seen: string[] = [];
  await assert.rejects(
    fetchPage("https://a.example.com", {
      resolver: async () => ["93.184.216.34"],
      guard: async (url) => { seen.push(url.host); if (url.host === "b.example.com") throw new Error("nope"); },
      fetchImpl: async () => new Response(null, { status: 302, headers: { location: "https://b.example.com/x" } }),
    }),
    (error: unknown) => error instanceof RetrievalError && error.code === "BLOCKED",
  );
  assert.deepEqual(seen, ["a.example.com", "b.example.com"]);
});
