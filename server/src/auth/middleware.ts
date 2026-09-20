import { authenticateRequest } from "./service.js";
import type { AuthUser } from "./store.js";

export async function requireAuth(request: Request): Promise<AuthUser | Response> {
  const user = await authenticateRequest(request);
  if (!user) return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }), {
    status: 401,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
  return user;
}
