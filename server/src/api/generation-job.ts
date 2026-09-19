import { randomUUID } from "node:crypto";
import { KitInputSchema } from "@trao/interview-prep-shared/input.js";
import { normalizeKitInput } from "@trao/interview-prep-shared/input-model.js";
import { generateKitFromInput, type ApplicationPipelineOptions } from "../pipeline/orchestrator.js";
import type { GenerationEvent, GenerationStage } from "../generation/observability.js";

type JobStage = GenerationStage | "queued" | "complete" | "failed";
export type GenerationJob = {
  id: string;
  status: "queued" | "running" | "complete" | "failed";
  stage: JobStage;
  label: string;
  events: GenerationEvent[];
  result?: { id: string; kit: Awaited<ReturnType<typeof generateKitFromInput>>["kit"] };
  error?: { code: string; message: string };
  created_at: string;
  updated_at: string;
};

const jobs = new Map<string, GenerationJob>();
const labels: Record<string, string> = {
  queued: "Queued",
  research: "Researching company",
  extraction: "Extracting requirements",
  planning: "Planning question coverage",
  generation: "Generating interview questions",
  repair: "Checking coverage & repairing gaps",
  validation: "Validating the final kit",
  persistence: "Saving your kit",
  provenance: "Recording research provenance",
  complete: "Kit ready",
  failed: "Generation failed",
};

export async function createGenerationJob(
  request: Request,
  dependencies: ApplicationPipelineOptions,
): Promise<Response> {
  let raw: unknown;
  try { raw = await request.json(); }
  catch { return json({ error: { code: "INVALID_JSON", message: "Request body must contain valid JSON" } }, 400); }

  const parsed = KitInputSchema.safeParse(raw);
  if (!parsed.success) return json({ error: { code: "VALIDATION_ERROR", message: "Request validation failed", details: parsed.error.flatten() } }, 400);

  const input = normalizeKitInput(parsed.data);
  const id = `job_${randomUUID()}`;
  const now = new Date().toISOString();
  const job: GenerationJob = { id, status: "queued", stage: "queued", label: labels.queued, events: [], created_at: now, updated_at: now };
  jobs.set(id, job);

  void (async () => {
    job.status = "running";
    job.stage = "queued";
    job.label = labels.queued;
    job.updated_at = new Date().toISOString();
    try {
      const result = await generateKitFromInput(input, {
        ...dependencies,
        observer: (event) => {
          job.events.push(event);
          if (event.status === "started") {
            job.stage = event.stage;
            job.label = labels[event.stage] ?? event.stage;
          }
          job.updated_at = new Date().toISOString();
          dependencies.observer?.(event);
        },
      });
      job.status = "complete";
      job.stage = "complete";
      job.label = labels.complete;
      job.result = { id: result.id, kit: result.kit };
      job.updated_at = new Date().toISOString();
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code) : "KIT_GENERATION_FAILED";
      job.status = "failed";
      job.stage = "failed";
      job.label = labels.failed;
      job.error = { code, message: error instanceof Error ? error.message : "Kit generation failed" };
      job.updated_at = new Date().toISOString();
    }
  })();

  return json({ id, status: job.status, stage: job.stage, label: job.label }, 202);
}

export function getGenerationJob(id: string): Response {
  const job = jobs.get(id);
  if (!job) return json({ error: { code: "NOT_FOUND", message: "Generation job not found" } }, 404);
  return json(job);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}
