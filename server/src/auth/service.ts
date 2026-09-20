import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { promisify } from "node:util";
import type { AuthUser } from "./store.js";
import { UserStore } from "./store.js";

const scrypt = promisify(scryptCallback) as (password: string, salt: Buffer, keylen: number, options: ScryptOptions) => Promise<Buffer>;
const SCRYPT_MAXMEM = 32 * 1024 * 1024;
const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function sessionTtlSeconds(): number {
  const configured = Number(process.env.SESSION_TTL_SECONDS || DEFAULT_SESSION_TTL_SECONDS);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : DEFAULT_SESSION_TTL_SECONDS;
}

// Read per call so auth fails closed (throws) instead of signing with an empty secret.
function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret || (process.env.NODE_ENV === "production" && secret.length < 32)) throw new Error("SESSION_SECRET_NOT_CONFIGURED");
  return secret;
}

function base64url(value: Buffer | string): string {
  return Buffer.from(value).toString("base64url");
}

function sign(value: string): string {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64, {
    N: 16384, r: 8, p: 1, maxmem: SCRYPT_MAXMEM,
  }));
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, n, r, p, saltText, hashText] = encoded.split("$");
  if (algorithm !== "scrypt" || !n || !r || !p || !saltText || !hashText) return false;
  try {
    const expected = Buffer.from(hashText, "base64url");
    const actual = (await scrypt(password, Buffer.from(saltText, "base64url"), expected.length, {
      N: Number(n), r: Number(r), p: Number(p), maxmem: SCRYPT_MAXMEM,
    }));
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function encodeSession(user: AuthUser): string {
  const now = Math.floor(Date.now() / 1000);
  const body = base64url(JSON.stringify({
    sub: user.id, email: user.email, iat: now, exp: now + sessionTtlSeconds(),
  }));
  return `${body}.${sign(body)}`;
}

function decodeSession(token: string): { sub: string; email: string; exp: number } | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  try {
    const expected = Buffer.from(sign(body));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
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

// Deployed frontend and API sit on different sites, so production needs SameSite=None (which requires Secure).
function cookieFlags(secure: boolean): string {
  return secure ? "; Secure; SameSite=None" : "; SameSite=Lax";
}

export function sessionCookie(user: AuthUser, secure = process.env.NODE_ENV === "production"): string {
  const token = encodeSession(user);
  return `trao_session=${token}; HttpOnly; Path=/; Max-Age=${sessionTtlSeconds()}${cookieFlags(secure)}`;
}

export function clearSessionCookie(secure = process.env.NODE_ENV === "production"): string {
  return `trao_session=; HttpOnly; Path=/; Max-Age=0${cookieFlags(secure)}`;
}

export async function authenticateRequest(request: Request, users = new UserStore()): Promise<AuthUser | null> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.split(";").map((item) => item.trim()).find((item) => item.startsWith("trao_session="));
  if (!match) return null;

  const session = decodeSession(match.slice("trao_session=".length));
  if (!session) return null;

  const user = await users.getById(session.sub);
  if (!user || user.email !== session.email) return null;
  return user;
}
