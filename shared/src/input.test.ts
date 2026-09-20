import test from "node:test";
import assert from "node:assert/strict";
import {
  KitInputSchema,
  BatchKitInputSchema,
  validateKitInput,
  validateBatchKitInput,
} from "./input.js";

test("valid single kit input parses", () => {
  const input = {
    jd: "Build React applications and write tests.",
    company_url: "https://example.com/careers",
    days: 14,
  };

  assert.deepEqual(validateKitInput(input), input);
});

test("JD is trimmed and required", () => {
  const result = KitInputSchema.safeParse({
    jd: "   ",
    company_url: "https://example.com",
    days: 7,
  });

  assert.equal(result.success, false);
});

test("company URL must be HTTP or HTTPS", () => {
  for (const company_url of [
    "ftp://example.com/careers",
    "javascript:alert(1)",
    "not-a-url",
  ]) {
    assert.equal(
      KitInputSchema.safeParse({
        jd: "Engineer",
        company_url,
        days: 7,
      }).success,
      false,
    );
  }
});

test("days must be an integer from 1 through 60", () => {
  for (const days of [0, -1, 1.5, 61, "7", null]) {
    assert.equal(
      KitInputSchema.safeParse({
        jd: "Engineer",
        company_url: "https://example.com",
        days,
      }).success,
      false,
    );
  }
});

test("1-day and 60-day inputs are accepted", () => {
  for (const days of [1, 60]) {
    assert.equal(
      KitInputSchema.safeParse({
        jd: "Engineer",
        company_url: "https://example.com",
        days,
      }).success,
      true,
    );
  }
});

test("batch input accepts multiple valid cases", () => {
  const input = [
    { id: "case-1", jd: "Engineer", company_url: "https://example.com", days: 1 },
    { id: "case-2", jd: "Engineer", company_url: "https://example.org", days: 60 },
  ];

  assert.deepEqual(validateBatchKitInput(input), input);
});

test("batch input rejects duplicate case IDs", () => {
  const result = BatchKitInputSchema.safeParse([
    { id: "case-1", jd: "Engineer", company_url: "https://example.com", days: 7 },
    { id: "case-1", jd: "Another Engineer", company_url: "https://example.org", days: 14 },
  ]);

  assert.equal(result.success, false);
});

test("batch input trims IDs and job descriptions", () => {
  const result = validateBatchKitInput([
    {
      id: "  case-1  ",
      jd: "  Engineer  ",
      company_url: "https://example.com",
      days: 7,
    },
  ]);

  assert.deepEqual(result[0], {
    id: "case-1",
    jd: "Engineer",
    company_url: "https://example.com",
    days: 7,
  });
});
