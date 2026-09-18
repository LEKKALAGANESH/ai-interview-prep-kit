import { createServer } from "node:http";
import { handleGenerateKit } from "./api/generate-kit.js";
import { handleBuilder } from "./api/builder.js";
import { handlePractice } from "./api/practice.js";
import { createKitStore } from "./persistence/store.js";

const port = Number(process.env.PORT || 4000);
const store = createKitStore();

const server = createServer(async (request, response) => {
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
