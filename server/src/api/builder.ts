import { KitSchema } from "@trao/interview-prep-shared/kit.js";
import { applyBuilderEdit, type BuilderEdit } from "@trao/interview-prep-shared/builder.js";
import type { KitStore } from "../persistence/store.js";

function json(body: unknown, status=200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

export async function handleBuilder(request: Request, store: KitStore, kitId: string): Promise<Response> {
  if (request.method === "GET") {
    const kit=await store.getById(kitId);
    return kit ? json({id:kitId,kit}) : json({error:{code:"NOT_FOUND",message:"Kit not found"}},404);
  }
  if (request.method !== "PATCH") return json({error:{code:"METHOD_NOT_ALLOWED",message:"Only GET and PATCH are supported"}},405);
  let raw: unknown;
  try { raw=await request.json(); } catch { return json({error:{code:"INVALID_JSON",message:"Request body must contain valid JSON"}},400); }
  const current=await store.getById(kitId);
  if (!current) return json({error:{code:"NOT_FOUND",message:"Kit not found"}},404);
  try {
    const edit=raw as BuilderEdit;
    const updated=applyBuilderEdit(current,edit);
    const validated=KitSchema.parse(updated);
    const saved=await store.withRequestLock(kitId,()=>store.update(kitId,validated));
    return json({id:kitId,kit:saved});
  } catch(error) {
    return json({error:{code:"BUILDER_EDIT_INVALID",message:error instanceof Error?error.message:"Builder edit failed"}},422);
  }
}
