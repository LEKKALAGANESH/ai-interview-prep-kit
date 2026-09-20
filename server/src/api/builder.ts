import { KitSchema } from "@trao/interview-prep-shared/kit.js";
import { applyBuilderEdit, regenerateCategory, type BuilderEdit } from "@trao/interview-prep-shared/builder.js";
import type { Kit, Question } from "@trao/interview-prep-shared/kit.js";
import type { KitStore, ResearchProvenance } from "../persistence/store.js";
import { createConfiguredLlmProvider, type LlmProviderName } from "../generation/provider.js";
import { generateQuestionsForRequirement, type QuestionCategory } from "../generation/generator.js";
import { regenerateScopedQuestions } from "@trao/interview-prep-shared/builder.js";

function json(body: unknown, status=200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

const CATEGORIES: readonly QuestionCategory[] = ["technical", "behavioural", "system-design", "company-fit"];

function providerFrom(body: { provider?: unknown; model?: unknown }) {
  return createConfiguredLlmProvider(undefined, { provider: typeof body.provider === "string" ? body.provider as LlmProviderName : undefined, model: typeof body.model === "string" ? body.model : undefined });
}

// Rebuilt from persisted research evidence only; never invents facts when nothing was retrieved.
function briefFromProvenance(provenance: ResearchProvenance | null): Kit["company_brief"] {
  const claims = (provenance?.claims ?? []).filter((claim) => claim.source_type === "company-primary");
  if (!claims.length) {
    const note = "No usable company information was retrieved, so this brief is intentionally thin.";
    return { summary: note, what_they_do: note, sources: [] };
  }
  return {
    summary: claims[0].evidence.slice(0, 500),
    what_they_do: claims.map((claim) => claim.evidence).join(" ").slice(0, 1000),
    sources: [...new Set(claims.map((claim) => claim.source_url))],
  };
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
    if (raw && typeof raw === "object" && (raw as {type?:unknown}).type === "regenerate_question") {
      const questionId = (raw as {question_id?:unknown}).question_id;
      if (typeof questionId !== "string") return json({error:{code:"VALIDATION_ERROR",message:"question_id is required"}},400);
      const existing = current.questions.find((question) => question.id === questionId);
      if (!existing) return json({error:{code:"NOT_FOUND",message:"Question not found"}},404);
      const requirement = current.role.requirements.find((item) => existing.requirement_ids.includes(item.id));
      if (!requirement) return json({error:{code:"BUILDER_EDIT_INVALID",message:"Question has no valid requirement"}},422);
      const provider = providerFrom(raw as {provider?:unknown;model?:unknown});
      if (!provider) return json({error:{code:"LLM_NOT_CONFIGURED",message:"The selected regeneration provider is not configured"}},503);
      const provenance = await store.getResearchProvenance(kitId);
      const research = provenanceToResearch(current.source.company_url, provenance);
      const generated = await generateQuestionsForRequirement({
        requirement,
        category: existing.category,
        difficulty: existing.difficulty as 1|2|3,
        objective: "Regenerate this single question while preserving the requirement and category: " + requirement.text,
        companyBrief: current.company_brief,
        research,
      }, {provider});
      const replacement = {...generated[0], id: existing.id, requirement_ids:[...existing.requirement_ids], ...(existing.pinned ? {pinned:true} : {})};
      const updated = regenerateScopedQuestions(current,[questionId],[replacement]);
      const saved=await store.withRequestLock(kitId,()=>store.update(kitId,KitSchema.parse(updated)));
      return json({id:kitId,kit:saved});
    }
    const type=(raw as {type?:unknown} | null)?.type;
    if (type === "regenerate_category") {
      const body = raw as {category?:unknown;provider?:unknown;model?:unknown};
      const category = CATEGORIES.find((item) => item === body.category);
      if (!category) return json({error:{code:"VALIDATION_ERROR",message:"category must be one of "+CATEGORIES.join(", ")}},400);
      const provider = providerFrom(body);
      if (!provider) return json({error:{code:"LLM_NOT_CONFIGURED",message:"The selected regeneration provider is not configured"}},503);
      const research = provenanceToResearch(current.source.company_url, await store.getResearchProvenance(kitId));
      const generated: Question[] = [];
      const replaceable = current.questions.filter((q) => q.category === category && !q.pinned && (q.origin ?? "generated") === "generated");
      for (const requirement of current.role.requirements.filter((r) => replaceable.some((q) => q.requirement_ids.includes(r.id)))) {
        generated.push(...await generateQuestionsForRequirement({ requirement, category, companyBrief: current.company_brief, research }, {provider}));
      }
      const saved = await store.withRequestLock(kitId,()=>store.update(kitId,KitSchema.parse(regenerateCategory(current,category,generated))));
      return json({id:kitId,kit:saved});
    }
    if (type === "regenerate_brief") {
      const brief = briefFromProvenance(await store.getResearchProvenance(kitId));
      const saved = await store.withRequestLock(kitId,()=>store.update(kitId,KitSchema.parse(applyBuilderEdit(current,{type:"edit_company_brief",...brief}))));
      return json({id:kitId,kit:saved});
    }
    const edit=raw as BuilderEdit;
    const updated=applyBuilderEdit(current,edit);
    const validated=KitSchema.parse(updated);
    const saved=await store.withRequestLock(kitId,()=>store.update(kitId,validated));
    return json({id:kitId,kit:saved});
  } catch(error) {
    return json({error:{code:"BUILDER_EDIT_INVALID",message:error instanceof Error?error.message:"Builder edit failed"}},422);
  }
}


function provenanceToResearch(companyUrl:string, provenance:ResearchProvenance|null) {
  return {
    company_url: companyUrl,
    pages: (provenance?.claims ?? []).filter((claim)=>claim.source_type==="company-primary").map((claim)=>({
      url:claim.source_url, fetched_at:claim.freshness_at ?? provenance?.researched_at ?? new Date(0).toISOString(),
      title:claim.claim, text:claim.evidence, links:[]
    })),
    robots:{checked:true,allowed:true,source:"persisted provenance",reason:""},
    skipped:[],
    public_interview_research:{
      attempted:true,found:Boolean((provenance?.claims ?? []).some((claim)=>claim.source_type==="public-interview")),
      results:(provenance?.claims ?? []).filter((claim)=>claim.source_type==="public-interview").map((claim)=>({title:claim.claim,url:claim.source_url,snippet:claim.evidence})),
      note:"Persisted public discussion evidence; not verified company policy."
    }
  };
}
