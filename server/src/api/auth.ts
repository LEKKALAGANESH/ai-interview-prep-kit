import { authenticateRequest, clearSessionCookie, hashPassword, sessionCookie, verifyPassword } from "../auth/service.js";
import { getUserStore, publicUser } from "../auth/store.js";

type Credentials = { email?: unknown; password?: unknown };

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

function errorResponse(code: string, message: string, status: number): Response {
  return json({ error: { code, message } }, status);
}

function notConfigured(): Response {
  return errorResponse("AUTH_NOT_CONFIGURED", "Authentication is not configured on the server.", 503);
}

async function readCredentials(request: Request): Promise<Credentials> {
  const value: unknown = await request.json();
  if (!value || typeof value !== "object") throw new Error("INVALID_JSON");
  return value as Credentials;
}

function validateCredentials(input: Credentials): { email: string; password: string } {
  if (typeof input.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    throw new Error("INVALID_CREDENTIALS");
  }
  if (typeof input.password !== "string" || input.password.length < 8 || input.password.length > 128) {
    throw new Error("INVALID_CREDENTIALS");
  }
  return { email: input.email.trim().toLowerCase(), password: input.password };
}

export async function handleAuth(request: Request, action: "register" | "login" | "logout" | "me"): Promise<Response> {
  const users = getUserStore();
  if (action === "me") {
    const user = await authenticateRequest(request, users);
    return user ? json({ user: publicUser(user) }) : errorResponse("UNAUTHORIZED", "Authentication required", 401);
  }

  if (request.method !== "POST") return errorResponse("METHOD_NOT_ALLOWED", "Only POST is supported", 405);

  if (action === "logout") return json({ ok: true }, 200, { "set-cookie": clearSessionCookie() });

  let raw: Credentials;
  try {
    raw = await readCredentials(request);
  } catch {
    return errorResponse("INVALID_JSON", "Request body must contain valid JSON", 400);
  }

  let credentials: { email: string; password: string };
  try {
    credentials = validateCredentials(raw);
  } catch {
    return errorResponse("INVALID_CREDENTIALS", "Email or password is invalid.", 400);
  }

  if (action === "register") {
    try {
      const user = await users.create(credentials.email, await hashPassword(credentials.password));
      return json({ user: publicUser(user) }, 201, { "set-cookie": sessionCookie(user) });
    } catch (error) {
      if (error instanceof Error && error.message === "EMAIL_ALREADY_REGISTERED") {
        return errorResponse("EMAIL_ALREADY_REGISTERED", "Email or password is invalid.", 409);
      }
      if (error instanceof Error && error.message === "SESSION_SECRET_NOT_CONFIGURED") return notConfigured();
      return errorResponse("AUTH_REGISTRATION_FAILED", "Registration failed. Please try again.", 500);
    }
  }

  const user = await users.getByEmail(credentials.email);
  const valid = user ? await verifyPassword(credentials.password, user.password_hash) : false;
  if (!valid || !user) return errorResponse("INVALID_CREDENTIALS", "Email or password is invalid.", 401);

  try {
    return json({ user: publicUser(user) }, 200, { "set-cookie": sessionCookie(user) });
  } catch (error) {
    if (error instanceof Error && error.message === "SESSION_SECRET_NOT_CONFIGURED") return notConfigured();
    return errorResponse("AUTH_LOGIN_FAILED", "Login failed. Please try again.", 500);
  }
}
