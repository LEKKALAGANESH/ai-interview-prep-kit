import { isCrossSiteMutation, rateLimited } from "./api/guard.js";
import { summarizeKits } from "./api/kit-list.js";
import { config as loadDotenv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { handleGenerateKit } from "./api/generate-kit.js";
import { handleBuilder } from "./api/builder.js";
import { handlePractice } from "./api/practice.js";
import { createGenerationJob, getGenerationJob } from "./api/generation-job.js";
import { handlePins } from "./api/pins.js";
import { handleProvenance } from "./api/provenance.js";
import { PROVIDER_ENV_KEY } from "./generation/provider.js";
import { createKitStore, UserScopedKitStore } from "./persistence/store.js";
import { handleAuth } from "./api/auth.js";
import { requireAuth } from "./auth/middleware.js";

// Load server environment files explicitly. Supports both server/.env.local and repo/.env.local.
// Paths are relative to this file, not the cwd: `npm run dev:server` runs inside server/, so cwd-relative
// lookups never found the repo-root .env that the README tells you to create.
const serverDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const dir of [serverDir, resolve(serverDir, "..")]) {
  loadDotenv({ path: resolve(dir, ".env.local") });
  loadDotenv({ path: resolve(dir, ".env") });
}

const port = Number(process.env.PORT || 4000);
const configuredProviders = (Object.entries(PROVIDER_ENV_KEY) as Array<[string, string | null]>)
  .filter(([, key]) => key === null || process.env[key]?.trim())
  .map(([name]) => name);
console.log(`LLM providers configured: ${configuredProviders.join(", ") || "none (set GROQ_API_KEY, GEMINI_API_KEY, ... in .env)"}`);
// Explicit CORS allowlist (never "*": requests carry credentials). Set CORS_ORIGIN to the deployed frontend URL(s), comma-separated.
const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  ...(process.env.CORS_ORIGIN ?? "").split(",").map((value) => value.trim()).filter(Boolean),
]);

async function readBody(request: import("node:http").IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1_000_000) { request.destroy(); throw new Error("Request body is too large"); }
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}
const store = createKitStore();

const server = createServer({ requestTimeout: 180_000, headersTimeout: 175_000 }, async (request, response) => {
  const origin = request.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    response.setHeader("access-control-allow-origin", origin);
    response.setHeader("vary", "Origin");
  }
  response.setHeader("access-control-allow-methods", "GET,POST,PATCH,DELETE,OPTIONS");
  response.setHeader("access-control-allow-credentials", "true");
  response.setHeader("access-control-allow-headers", "content-type");
  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.end();
    return;
  }
  if (isCrossSiteMutation(request.method, origin, allowedOrigins)) {
    response.statusCode = 403;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ error: { code: "FORBIDDEN_ORIGIN", message: "Origin not allowed" } }));
    return;
  }
  const clientIp = request.socket.remoteAddress ?? "unknown";
  const tooMany = (key: string, max: number, windowMs: number) => {
    if (!rateLimited(key, max, windowMs)) return false;
    response.statusCode = 429;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ error: { code: "RATE_LIMITED", message: "Too many requests. Please wait and try again." } }));
    return true;
  };
  const authMatch = request.url?.match(/^\/api\/auth\/(register|login|logout|me)$/);
  if (authMatch) {
    if ((authMatch[1] === "register" || authMatch[1] === "login") && tooMany(`auth:${clientIp}`, 10, 60_000)) return;
    const webRequest = new Request(`http://localhost:${port}${request.url}`, {
      method: request.method,
      headers: request.headers as Record<string, string>,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await readBody(request),
    });
    try {
      const result = await handleAuth(webRequest, authMatch[1] as "register" | "login" | "logout" | "me");
      response.statusCode = result.status;
      result.headers.forEach((value,key)=>response.setHeader(key,value));
      response.end(await result.text());
    } catch {
      response.statusCode=500;
      response.setHeader("content-type","application/json");
      response.end(JSON.stringify({error:{code:"INTERNAL_ERROR",message:"Unexpected authentication error"}}));
    }
    return;
  }

  let authenticatedUser: import("./auth/store.js").AuthUser | null = null;
  let scopedStore: UserScopedKitStore | null = null;
  if (request.url?.startsWith("/api/")) {
    const authRequest = new Request(`http://localhost:${port}${request.url}`, {
      method: request.method,
      headers: request.headers as Record<string,string>,
    });
    const auth = await requireAuth(authRequest);
    if (auth instanceof Response) {
      response.statusCode = auth.status;
      auth.headers.forEach((value,key)=>response.setHeader(key,value));
      response.end(await auth.text());
      return;
    }
    authenticatedUser = auth;
    if (request.method === "POST" && /^\/api\/(generation\/jobs|kits)$/.test(request.url ?? "") && tooMany(`gen:${auth.id}`, 20, 3_600_000)) return;
    scopedStore = new UserScopedKitStore(store, auth.id);
  }

  const generationJobMatch = request.url?.match(/^\/api\/generation\/jobs(?:\/([^/?]+))?$/);
  if (generationJobMatch) {
    if (generationJobMatch[1] && request.method === "GET") {
      const result=getGenerationJob(decodeURIComponent(generationJobMatch[1]), authenticatedUser!.id);
      response.statusCode=result.status; result.headers.forEach((value,key)=>response.setHeader(key,value)); response.end(await result.text()); return;
    }
    if (!generationJobMatch[1] && request.method === "POST") {
      const body=await readBody(request);
      const result=await createGenerationJob(new Request(`http://localhost:${port}${request.url}`,{method:"POST",headers:request.headers as Record<string,string>,body}),{store: scopedStore!}, authenticatedUser!.id);
      response.statusCode=result.status; result.headers.forEach((value,key)=>response.setHeader(key,value)); response.end(await result.text()); return;
    }
  }

  const pinsMatch=request.url?.match(/^\/api\/kits\/([^/?]+)\/pins$/);
  if(pinsMatch){ const result=await handlePins(new Request(`http://localhost:${port}${request.url}`,{method:request.method,headers:request.headers as Record<string,string>,body:request.method==="GET"||request.method==="HEAD"?undefined:await readBody(request)}),scopedStore!,decodeURIComponent(pinsMatch[1])); response.statusCode=result.status; result.headers.forEach((value,key)=>response.setHeader(key,value)); response.end(await result.text()); return; }

  const provenanceMatch=request.url?.match(/^\/api\/kits\/([^/?]+)\/provenance$/);
  if(provenanceMatch){ const result=await handleProvenance(new Request(`http://localhost:${port}${request.url}`,{method:request.method,headers:request.headers as Record<string,string>}),scopedStore!,decodeURIComponent(provenanceMatch[1])); response.statusCode=result.status; result.headers.forEach((value,key)=>response.setHeader(key,value)); response.end(await result.text()); return; }

  if (request.url === "/health") {
    response.statusCode = 200;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  const practiceMatch = request.url?.match(/^\/api\/kits\/([^/?]+)\/practice$/);
  if (practiceMatch) {
    let body = "";
    for await (const chunk of request) { body += Buffer.from(chunk).toString("utf8"); if (Buffer.byteLength(body) > 1_000_000) { response.statusCode=413; response.setHeader("content-type","application/json"); response.end(JSON.stringify({error:{code:"PAYLOAD_TOO_LARGE",message:"Request body is too large"}})); request.destroy(); return; } }
    const webRequest = new Request(`http://localhost:${port}${request.url}`, {method:request.method,headers:request.headers as Record<string,string>,body:request.method==="GET"||request.method==="HEAD"?undefined:body});
    try { const result=await handlePractice(webRequest,scopedStore!,decodeURIComponent(practiceMatch[1])); response.statusCode=result.status; result.headers.forEach((value,key)=>response.setHeader(key,value)); response.end(await result.text()); } catch { response.statusCode=500; response.setHeader("content-type","application/json"); response.end(JSON.stringify({error:{code:"INTERNAL_ERROR",message:"Unexpected server error"}})); }
    return;
  }

  const builderMatch = request.url?.match(/^\/api\/kits\/([^/?]+)$/);
  if (builderMatch && request.method === "DELETE") {
    try {
      const deleted = await scopedStore!.delete(decodeURIComponent(builderMatch[1]));
      if (!deleted) {
        response.statusCode = 404;
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({ error: { code: "NOT_FOUND", message: "Kit not found" } }));
        return;
      }
      response.statusCode = 204;
      response.end();
    } catch {
      response.statusCode = 500;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Unexpected server error" } }));
    }
    return;
  }
  if (builderMatch) {
    const bodyChunks: Buffer[] = [];
    for await (const chunk of request) {
      bodyChunks.push(Buffer.from(chunk));
      if (Buffer.concat(bodyChunks).length > 1_000_000) {
        response.statusCode = 413;
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({ error: { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large" } }));
        request.destroy();
        return;
      }
    }
    const body = Buffer.concat(bodyChunks).toString("utf8");
    const webRequest = new Request(`http://localhost:${port}${request.url}`, {
      method: request.method,
      headers: request.headers as Record<string, string>,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : body,
    });
    try {
      const result = await handleBuilder(webRequest, scopedStore!, decodeURIComponent(builderMatch[1]));
      response.statusCode = result.status;
      result.headers.forEach((value, key) => response.setHeader(key, value));
      response.end(await result.text());
    } catch {
      response.statusCode = 500;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Unexpected server error" } }));
    }
    return;
  }

  if (request.method === "GET" && request.url === "/api/kits") {
    response.statusCode = 200;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ kits: summarizeKits((await scopedStore!.listForUser?.()) ?? []) }));
    return;
  }

  if (request.url !== "/api/kits") {
    response.statusCode = 404;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ error: { code: "NOT_FOUND", message: "Route not found" } }));
    return;
  }

  const bodyChunks: Buffer[] = [];
  for await (const chunk of request) {
    bodyChunks.push(Buffer.from(chunk));
    if (Buffer.concat(bodyChunks).length > 1_000_000) {
      response.statusCode = 413;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ error: { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large" } }));
      request.destroy();
      return;
    }
  }

  const body = Buffer.concat(bodyChunks).toString("utf8");
  const webRequest = new Request(`http://localhost:${port}${request.url}`, {
    method: request.method,
    headers: request.headers as Record<string, string>,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : body,
  });

  try {
    const result = await handleGenerateKit(webRequest, { store: scopedStore! });
    response.statusCode = result.status;
    result.headers.forEach((value, key) => response.setHeader(key, value));
    response.end(await result.text());
  } catch {
    response.statusCode = 500;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({
      error: { code: "INTERNAL_ERROR", message: "Unexpected server error" },
    }));
  }
});

server.listen(port, () => {
  console.log(`AI Interview Prep Kit API listening on http://localhost:${port}`);
});
