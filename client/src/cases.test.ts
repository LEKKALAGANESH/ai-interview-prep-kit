import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCases } from "../app/cases";

test("parses a JSON array and applies the default days", () => {
  const [a, b] = parseCases('[{"jd":"React dev","company_url":"https://a.com","days":3},{"jd":"Go dev","company_url":"https://b.com"}]', 7);
  assert.deepEqual([a.days, a.error, b.days, b.error], [3, undefined, 7, undefined]);
});

test("parses CSV with quoted commas, quotes and newlines", () => {
  const csv = 'jd,company_url,days\r\n"Senior, backend\nNode ""expert""",https://a.com,4\r\nGo dev,https://b.com,\r\n';
  const [a, b] = parseCases(csv, 5);
  assert.equal(a.jd, 'Senior, backend\nNode "expert"');
  assert.deepEqual([a.days, b.days, a.error, b.error], [4, 5, undefined, undefined]);
});

test("flags bad rows instead of throwing, and rejects unusable files", () => {
  const rows = parseCases('[{"jd":"","company_url":"https://a.com"},{"jd":"x","company_url":"ftp://a"},{"jd":"x","company_url":"https://a.com","days":99}]', 5);
  assert.equal(rows.every((r) => r.error), true);
  assert.throws(() => parseCases("", 5), /empty/);
  assert.throws(() => parseCases("a,b\n1,2", 5), /jd and company_url/);
  assert.throws(() => parseCases('{"jd":"x"}', 5), /array/);
});
