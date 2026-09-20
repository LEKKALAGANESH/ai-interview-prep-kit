import test from "node:test";
import assert from "node:assert/strict";
import { isCrossSiteMutation, rateLimited } from "./guard.js";

const allowed = new Set(["https://app.example"]);

test("blocks mutations from unlisted origins, allows listed, absent and safe methods", () => {
  assert.equal(isCrossSiteMutation("POST", "https://evil.example", allowed), true);
  assert.equal(isCrossSiteMutation("DELETE", "https://evil.example", allowed), true);
  assert.equal(isCrossSiteMutation("POST", "https://app.example", allowed), false);
  assert.equal(isCrossSiteMutation("POST", undefined, allowed), false);
  assert.equal(isCrossSiteMutation("GET", "https://evil.example", allowed), false);
});

test("rate limiter allows max requests per window then blocks, and resets", () => {
  const t = 1_000_000;
  for (let i = 0; i < 3; i += 1) assert.equal(rateLimited("k1", 3, 1000, t), false);
  assert.equal(rateLimited("k1", 3, 1000, t), true);
  assert.equal(rateLimited("k2", 3, 1000, t), false);
  assert.equal(rateLimited("k1", 3, 1000, t + 1001), false);
});
