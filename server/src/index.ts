import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import { createServer } from "node:http";
import { handleGenerateKit } from "./api/generate-kit.js";
import { handleBuilder } from "./api/builder.js";
import { handlePractice } from "./api/practice.js";
import { createGenerationJob, getGenerationJob } from "./api/generation-job.js";
import { handlePins } from "./api/pins.js";
import { handleProvenance } from "./api/provenance.js";
import { handleSession } from "./api/session.js";
import { createKitStore } from "./persistence/store.js";

// Load server environment files explicitly. Supports both server/.env.local and repo/.env.local.
loadDotenv({ path: ".env.local" });
loadDotenv({ path: ".env" });
loadDotenv({ path: "server/.env.local" });
loadDotenv({ path: "server/.env" });

const port = Number(process.env.PORT || 4000);

async function readBody(request: import("node:http").IncomingMessage): Promise<string> { const chunks: Buffer[]=[]; for await (const chunk of request) chunks.push(Buffer.from(chunk)); const body=Buffer.concat(chunks).toString("utf8"); if(Buffer.byteLength(body)>1_000_000) throw new Error("Request body is too large"); return body; }
const store = createKitStore();

const server = createServer({ requestTimeout: 180_000, headersTimeout: 175_000 }, async (request, response) => {
  const origin = request.headers.origin;
  if (origin === "http://localhost:3000" || origin === "http://127.0.0.1:3000") {
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
  if (request.url === "/api/session") {
    const result = await handleSession(new Request(`http://localhost:${port}${request.url}`, { method: request.method, headers: request.headers as Record<string,string>, body: request.method === "GET" || request.method === "HEAD" ? undefined : await readBody(request) }));
    response.statusCode=result.status; result.headers.forEach((value,key)=>response.setHeader(key,value)); response.end(await result.text()); return;
  }

  const generationJobMatch = request.url?.match(/^\/api\/generation\/jobs(?:\/([^/?]+))?$/);
  if (generationJobMatch) {
    if (generationJobMatch[1] && request.method === "GET") {
      const result=getGenerationJob(decodeURIComponent(generationJobMatch[1]));
      response.statusCode=result.status; result.headers.forEach((value,key)=>response.setHeader(key,value)); response.end(await result.text()); return;
    }
    if (!generationJobMatch[1] && request.method === "POST") {
      const body=await readBody(request);
      const result=await createGenerationJob(new Request(`http://localhost:${port}${request.url}`,{method:"POST",headers:request.headers as Record<string,string>,body}),{store});
      response.statusCode=result.status; result.headers.forEach((value,key)=>response.setHeader(key,value)); response.end(await result.text()); return;
    }
  }

  const pinsMatch=request.url?.match(/^\/api\/kits\/([^/?]+)\/pins$/);
  if(pinsMatch){ const result=await handlePins(new Request(`http://localhost:${port}${request.url}`,{method:request.method,headers:request.headers as Record<string,string>,body:request.method==="GET"||request.method==="HEAD"?undefined:await readBody(request)}),store,decodeURIComponent(pinsMatch[1])); response.statusCode=result.status; result.headers.forEach((value,key)=>response.setHeader(key,value)); response.end(await result.text()); return; }

  const provenanceMatch=request.url?.match(/^\/api\/kits\/([^/?]+)\/provenance$/);
  if(provenanceMatch){ const result=await handleProvenance(new Request(`http://localhost:${port}${request.url}`,{method:request.method,headers:request.headers as Record<string,string>}),store,decodeURIComponent(provenanceMatch[1])); response.statusCode=result.status; result.headers.forEach((value,key)=>response.setHeader(key,value)); response.end(await result.text()); return; }

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
    try { const result=await handlePractice(webRequest,store,decodeURIComponent(practiceMatch[1])); response.statusCode=result.status; result.headers.forEach((value,key)=>response.setHeader(key,value)); response.end(await result.text()); } catch { response.statusCode=500; response.setHeader("content-type","application/json"); response.end(JSON.stringify({error:{code:"INTERNAL_ERROR",message:"Unexpected server error"}})); }
    return;
  }

  const builderMatch = request.url?.match(/^\/api\/kits\/([^/?]+)$/);
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
      const result = await handleBuilder(webRequest, store, decodeURIComponent(builderMatch[1]));
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
    const result = await handleGenerateKit(webRequest, { store });
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
