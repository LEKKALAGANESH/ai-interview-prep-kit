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

test("rejects private, CGNAT, IPv4-mapped IPv6, ULA and numeric-form addresses", () => {
  for (const host of [
    "0.0.0.0", "100.64.0.1", "[::ffff:127.0.0.1]", "[::ffff:7f00:1]", "[fc00::1]", "[fd12::1]", "[fe80::1]",
    "2130706433", "0x7f000001", "017700000001", "127.1",
  ]) {
    assert.throws(() => validateExternalUrl(`http://${host}/`), /private|loopback/i, host);
  }
  assert.equal(validateExternalUrl("http://[2606:4700::1111]/").hostname, "[2606:4700::1111]");
});

test("localhost opt-in is ignored in production", () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    assert.throws(() => validateExternalUrl("http://localhost:3000", { allowLocalhost: true }));
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous;
  }
});

test("rejects hostnames that resolve to private addresses", async () => {
  const { assertPublicHost } = await import("./url-validator.js");
  await assert.rejects(assertPublicHost(new URL("http://evil.test/"), { resolver: async () => ["93.184.216.34", "10.0.0.5"] }), /private/i);
  await assertPublicHost(new URL("http://ok.test/"), { resolver: async () => ["93.184.216.34"] });
  await assertPublicHost(new URL("http://gone.test/"), { resolver: async () => { throw new Error("ENOTFOUND"); } });
});
