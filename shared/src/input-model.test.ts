import test from "node:test";
import assert from "node:assert/strict";
import { normalizeKitInput, normalizeBatchInput } from "./input-model.js";
import { validateBatchKitInput, validateKitInput } from "./input.js";

test("normalizes a validated single input into the canonical model", () => {
  const input = validateKitInput({
    jd: "  Build React applications.  ",
    company_url: "https://example.com/careers#overview",
    days: 14,
  });

  assert.deepEqual(normalizeKitInput(input), {
    job_description: "Build React applications.",
    company_url: "https://example.com/careers",
    days_available: 14,
  });
});

test("normalizes batch cases using the same single-input model", () => {
  const input = validateBatchKitInput([
    {
      id: "  case-1 ",
      jd: "  Software Engineer ",
      company_url: "https://example.com/#jobs",
      days: 1,
    },
    {
      id: "case-2",
      jd: "Frontend Engineer",
      company_url: "https://example.org/careers",
      days: 60,
    },
  ]);

  assert.deepEqual(normalizeBatchInput(input), [
    {
      id: "case-1",
      input: {
        job_description: "Software Engineer",
        company_url: "https://example.com/",
        days_available: 1,
      },
    },
    {
      id: "case-2",
      input: {
        job_description: "Frontend Engineer",
        company_url: "https://example.org/careers",
        days_available: 60,
      },
    },
  ]);
});

test("normalization does not change validated day boundaries", () => {
  for (const days of [1, 60]) {
    const input = validateKitInput({
      jd: "Engineer",
      company_url: "https://example.com",
      days,
    });

    assert.equal(normalizeKitInput(input).days_available, days);
  }
});
