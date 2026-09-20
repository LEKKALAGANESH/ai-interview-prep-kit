import test from "node:test";
import assert from "node:assert/strict";
import { RetrievalError } from "./http-client.js";
import { withRetry } from "./retry.js";

test("retries transient retrieval errors with exponential backoff", async () => {
  let calls = 0;
  const delays: number[] = [];
  const value = await withRetry(async () => {
    calls += 1;
    if (calls < 3) throw new RetrievalError("HTTP_ERROR", "HTTP 503 Service Unavailable");
    return "ok";
  }, { baseDelayMs: 10, sleep: async (ms) => { delays.push(ms); } });

  assert.equal(value, "ok");
  assert.equal(calls, 3);
  assert.deepEqual(delays, [10, 20]);
});

test("does not retry non-transient retrieval errors", async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(async () => {
      calls += 1;
      throw new RetrievalError("CONTENT_TYPE_UNSUPPORTED", "Unsupported");
    }, { sleep: async () => {} }),
  );
  assert.equal(calls, 1);
});
