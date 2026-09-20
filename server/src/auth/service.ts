import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { AuthUser } from "./store.js";
import { UserStore } from "./store.js";

const scrypt = promisify(scryptCallback);
const SESSION_TTL_SECONDS = Number(process.env.SESSION_TTL_SECONDS || 60 * 60 * 24 * 7);
const SESSION_SECRET = process.env.SESSION_SECRET?.trim();

if (!SESSION_SECRET) {
  // Auth is intentionally fail-closed in production; development may set this in .env.local.
  console.warn("SESSION_SECRET is not configured; authentication will reject session creation.");
}

function base64url(value: Buffer | string): string {
  return Buffer.from(value).toString("base64url");
}

function sign(value: string): string {
  if (!SESSION_SECRET) throw new Error("SESSION_SECRET_NOT_CONFIGURED");
  return createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 32 * 1024 * 1024,
  })) as Buffer;
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, n, r, p, saltText, hashText] = encoded.split("$");
  if (algorithm !== "scrypt" || !n || !r || !p || !saltText || !hashText) return false;
  try {
    const expected = Buffer.from(hashText, "base64url");
    const actual = (await scrypt(password, Buffer.from(saltText, "base64url"), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 32 * 1024 * 1024,
    })) as Buffer;
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function encodeSession(user: AuthUser): string {
  const payload = JSON.stringify({
    sub: user.id,
    email: user.email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  });
  const body = base64url(payload);
  return `${body}.${sign(body)}`;
}

function decodeSession(token: string): { sub: string; email: string; exp: number } | null {
  const [body, signature] = token.split(".");
  if (!body || !signature || !SESSION_SECRET) return null;
  const expected = Buffer.from(sign(body));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      sub?: unknown; email?: unknown; exp?: unknown;
    };
    if (typeof parsed.sub !== "string" || typeof parsed.email !== "string" || typeof parsed.exp !== "number") return null;
    if (parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    return { sub: parsed.sub, email: parsed.email, exp: parsed.exp };
  } catch {
    return null;
  }
}

export function sessionCookie(user: AuthUser, secure = process.env.NODE_ENV === "production"): string {
  const token = encodeSession(user);
  const securePart = secure ? "; Secure" : "";
  return `trao_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${securePart}`;
}

export function clearSessionCookie(secure = process.env.NODE_ENV === "production"): string {
  const securePart = secure ? "; Secure" : "";
  return `trao_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${securePart}`;
}

export async function authenticateRequest(request: Request, users = new UserStore()): Promise<AuthUser | null> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.split(";").map((item) => item.trim()).find((item) => item.startsWith("trao_session="));
  if (!match) return null;

  const token = match.slice("trao_session=".length);
  const session = decodeSession(token);
  if (!session) return null;

  const user = await users.getById(session.sub);
  if (!user || user.email !== session.email) return null;
  return user;
}
