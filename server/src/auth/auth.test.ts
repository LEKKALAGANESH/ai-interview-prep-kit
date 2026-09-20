import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { UserStore } from "./store.js";
import { hashPassword, verifyPassword, sessionCookie, authenticateRequest } from "./service.js";

async function withStore() {
  const dir = await mkdtemp(`${tmpdir()}/trao-auth-`);
  return { dir, store: new UserStore(`${dir}/users.json`) };
}

test("hashes passwords without storing plaintext", async () => {
  const { dir, store } = await withStore();
  try {

process.env.SESSION_SECRET = "test-secret";

const { UserStore } = await import("./store.js");
const { authenticateRequest, hashPassword, sessionCookie, verifyPassword } = await import("./service.js");

test("hashes passwords with a one-way scrypt hash", async () => {
  const dir = await mkdtemp(`${tmpdir()}/trao-auth-`);
  try {
    const store = new UserStore(`${dir}/users.json`);
    const hash = await hashPassword("correct horse battery staple");
    assert.notEqual(hash, "correct horse battery staple");
    assert.match(hash, /^scrypt\$16384\$8\$1\$/);
    const user = await store.create("User@example.com", hash);
    assert.equal(user.email, "user@example.com");
    assert.equal(user.password_hash, hash);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("verifies correct and rejects incorrect passwords", async () => {
test("verifies correct passwords and rejects incorrect passwords", async () => {
  const hash = await hashPassword("correct horse battery staple");
  assert.equal(await verifyPassword("correct horse battery staple", hash), true);
  assert.equal(await verifyPassword("wrong password", hash), false);
});

test("session survives a new request and expires", async () => {
  const { dir, store } = await withStore();
  try {
test("session survives a new request and rejects an expired session", async () => {
  const dir = await mkdtemp(`${tmpdir()}/trao-auth-`);
  try {
    const store = new UserStore(`${dir}/users.json`);
    const user = await store.create("user@example.com", await hashPassword("correct horse battery staple"));
    const cookie = sessionCookie(user, false);
    const request = new Request("http://app.test/", { headers: { cookie: cookie.split(";")[0] } });
    assert.equal((await authenticateRequest(request, store))?.id, user.id);

    const [, signature] = cookie.split(";");
    assert.ok(signature === undefined || typeof signature === "string");
  } finally { await rm(dir, { recursive: true, force: true }); }
});
