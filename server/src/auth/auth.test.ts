import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

process.env.SESSION_SECRET = "test-secret";

const { UserStore } = await import("./store.js");
const { authenticateRequest, hashPassword, sessionCookie, verifyPassword } = await import("./service.js");

async function withStore() {
  const dir = await mkdtemp(`${tmpdir()}/trao-auth-`);
  return { dir, store: new UserStore(`${dir}/users.json`) };
}

test("hashes passwords with a one-way scrypt hash", async () => {
  const { dir, store } = await withStore();
  try {
    const hash = await hashPassword("correct horse battery staple");
    assert.notEqual(hash, "correct horse battery staple");
    assert.match(hash, /^scrypt\$16384\$8\$1\$/);
    const user = await store.create("User@example.com", hash);
    assert.equal(user.email, "user@example.com");
    assert.equal(user.password_hash, hash);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("verifies correct passwords and rejects incorrect passwords", async () => {
  const hash = await hashPassword("correct horse battery staple");
  assert.equal(await verifyPassword("correct horse battery staple", hash), true);
  assert.equal(await verifyPassword("wrong password", hash), false);
});

test("session survives a new request and rejects a tampered or expired session", async () => {
  const { dir, store } = await withStore();
  try {
    const user = await store.create("user@example.com", await hashPassword("correct horse battery staple"));
    const cookie = sessionCookie(user, false).split(";")[0];
    const request = (value: string) => new Request("http://app.test/", { headers: { cookie: value } });
    assert.equal((await authenticateRequest(request(cookie), store))?.id, user.id);
    assert.equal(await authenticateRequest(request(`${cookie}x`), store), null);

    const realNow = Date.now;
    Date.now = () => realNow() + 8 * 24 * 60 * 60 * 1000;
    try {
      assert.equal(await authenticateRequest(request(cookie), store), null);
    } finally { Date.now = realNow; }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("session cookie is SameSite=None; Secure in production and Lax in dev", async () => {
  const user = { id: "usr_1", email: "a@b.co", password_hash: "x", created_at: "", updated_at: "" };
  assert.match(sessionCookie(user, true), /; Secure; SameSite=None$/);
  assert.match(sessionCookie(user, false), /; SameSite=Lax$/);
});
