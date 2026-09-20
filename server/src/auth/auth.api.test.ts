import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

const dir = await mkdtemp(`${tmpdir()}/trao-auth-api-`);
process.env.AUTH_STORE_FILE = `${dir}/users.json`;
process.env.SESSION_SECRET = "test-secret";

const { handleAuth } = await import("../api/auth.js");
const { requireAuth } = await import("./middleware.js");

function request(url: string, init: RequestInit = {}) {
  return new Request(`http://app.test${url}`, init);
}

test("registration, login, current session and logout work", async () => {
  try {
    const register = await handleAuth(request("/api/auth/register", {
      method: "POST",
      headers: {"content-type":"application/json"},
      body: JSON.stringify({email:"User@Example.com",password:"correct horse battery staple"}),
    }), "register");
    assert.equal(register.status, 201);
    const registerCookie = register.headers.get("set-cookie");
    assert.ok(registerCookie?.includes("HttpOnly"));
    assert.ok(registerCookie?.includes("Max-Age=604800"));

    const me = await handleAuth(request("/api/auth/me", {
      method: "GET",
      headers: {cookie: registerCookie!.split(";")[0]},
    }), "me");
    assert.equal(me.status, 200);
    assert.equal((await me.json()).user.email, "user@example.com");

    const login = await handleAuth(request("/api/auth/login", {
      method: "POST",
      headers: {"content-type":"application/json"},
      body: JSON.stringify({email:"user@example.com",password:"correct horse battery staple"}),
    }), "login");
    assert.equal(login.status, 200);
    const loginCookie = login.headers.get("set-cookie");
    assert.ok(loginCookie?.includes("HttpOnly"));

    const logout = await handleAuth(request("/api/auth/logout", {
      method: "POST",
      headers: {cookie: loginCookie!.split(";")[0]},
    }), "logout");
    assert.equal(logout.status, 200);
    assert.ok(logout.headers.get("set-cookie")?.includes("Max-Age=0"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("invalid credentials do not authenticate", async () => {
  const response = await handleAuth(request("/api/auth/login", {
    method: "POST",
    headers: {"content-type":"application/json"},
    body: JSON.stringify({email:"missing@example.com",password:"wrong-password"}),
  }), "login");
  assert.equal(response.status, 401);
});

test("protected middleware rejects missing sessions", async () => {
  const result = await requireAuth(request("/api/kits"));
  assert.ok(result instanceof Response);
  assert.equal(result.status, 401);
});
