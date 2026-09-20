import { authenticateRequest, clearSessionCookie, hashPassword, sessionCookie, verifyPassword } from "../auth/service.js";
import { publicUser, UserStore } from "../auth/store.js";

const users = new UserStore();

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

async function body(request: Request): Promise<{ email?: unknown; password?: unknown }> {
  const value: unknown = await request.json();
  if (!value || typeof value !== "object") throw new Error("INVALID_JSON");
  return value as { email?: unknown; password?: unknown };
}

function validateCredentials(input: { email?: unknown; password?: unknown }) {
  if (typeof input.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    throw new Error("INVALID_CREDENTIALS");
  }
  if (typeof input.password !== "string" || input.password.length < 8 || input.password.length > 128) {
    throw new Error("INVALID_CREDENTIALS");
  }
  return { email: input.email.trim().toLowerCase(), password: input.password };
}

export async function handleAuth(request: Request, action: "register" | "login" | "logout" | "me"): Promise<Response> {
  if (action === "me") {
    const user = await authenticateRequest(request, users);
    return user ? json({ user: publicUser(user) }) : json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, 401);
  }

  if (action === "logout") {
    if (request.method !== "POST") return json({ error: { code: "METHOD_NOT_ALLOWED", message: "Only POST is supported" } }, 405);
    return json({ ok: true }, 200, { "set-cookie": clearSessionCookie() });
  }

  if (request.method !== "POST") return json({ error: { code: "METHOD_NOT_ALLOWED", message: "Only POST is supported" } }, 405);

  let input: { email?: unknown; password?: unknown };
  try { input = await body(request); } catch { return json({ error: { code: "INVALID_JSON", message: "Request body must contain valid JSON" } }, 400); }

  let credentials: { email: string; password: string };
  try { credentials = validateCredentials(input); } catch {
    return json({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is invalid." } }, 400);
  }

  if (action === "register") {
    try {
      const user = await users.create(credentials.email, await hashPassword(credentials.password));
      return json({ user: publicUser(user) }, 201, { "set-cookie": sessionCookie(user) });
    } catch (error) {
      if (error instanceof Error && error.message === "EMAIL_ALREADY_REGISTERED") {
        return json({ error: { code: "EMAIL_ALREADY_REGISTERED", message: "Email or password is invalid." } }, 409);
      }
      if (error instanceof Error && error.message === "SESSION_SECRET_NOT_CONFIGURED") {
        return json({ error: { code: "AUTH_NOT_CONFIGURED", message: "Authentication is not configured on the server." } }, 503);
      }
      return json({ error: { code: "AUTH_REGISTRATION_FAILED", message: "Registration failed. Please try again." } }, 500);
    }
  }

  const user = await users.getByEmail(credentials.email);
  const valid = user ? await verifyPassword(credentials.password, user.password_hash) : false;
  if (!valid || !user) {
    return json({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is invalid." } }, 401);
  }

  try {
    return json({ user: publicUser(user) }, 200, { "set-cookie": sessionCookie(user) });
  } catch (error) {
    if (error instanceof Error && error.message === "SESSION_SECRET_NOT_CONFIGURED") {
      return json({ error: { code: "AUTH_NOT_CONFIGURED", message: "Authentication is not configured on the server." } }, 503);
    }
    return json({ error: { code: "AUTH_LOGIN_FAILED", message: "Login failed. Please try again." } }, 500);
  }
}
