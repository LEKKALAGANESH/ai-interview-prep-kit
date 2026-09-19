import test from "node:test";
import assert from "node:assert/strict";
import { validateExternalUrl } from "./url-validator.js";

test("accepts HTTP and HTTPS URLs", () => {
  assert.equal(validateExternalUrl("https://example.com").protocol, "https:");
  assert.equal(validateExternalUrl("http://example.com/careers").protocol, "http:");
});

test("rejects malformed and unsupported URLs", () => {
  for (const value of ["not-a-url", "ftp://example.com", "javascript:alert(1)"]) {
    assert.throws(() => validateExternalUrl(value));
  }
});

test("rejects URLs containing credentials", () => {
  assert.throws(() => validateExternalUrl("https://user:pass@example.com"));
});

test("rejects common private and loopback IPv4 destinations", () => {
  for (const host of ["127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.1.1", "169.254.1.1"]) {
    assert.throws(() => validateExternalUrl(`http://${host}`));
  }
});

test("rejects localhost by default", () => {
  assert.throws(() => validateExternalUrl("http://localhost:3000"));
});

test("allows localhost explicitly for local evaluator cases", () => {
  assert.equal(
    validateExternalUrl("http://localhost:3000/company", { allowLocalhost: true }).hostname,
    "localhost",
  );
});


test("rejects credential-bearing URLs", () => {
  assert.throws(() => validateExternalUrl("https://user:pass@example.com"), /credentials/i);
});

test("rejects IPv6 loopback", () => {
  assert.throws(() => validateExternalUrl("http://[::1]:8080"), /private|loopback/i);
});

test("rejects cloud metadata address", () => {
  assert.throws(() => validateExternalUrl("http://169.254.169.254/latest/meta-data/"), /private|loopback/i);
});

test("allows localhost only when explicitly enabled", () => {
  assert.throws(() => validateExternalUrl("http://localhost:4000"));
  assert.equal(validateExternalUrl("http://localhost:4000", { allowLocalhost: true }).hostname, "localhost");
});
