import { normalizeKitInput } from "@trao/interview-prep-shared/input-model.js";
import { KitInputSchema } from "@trao/interview-prep-shared/input.js";
import { generateKitFromInput, type ApplicationPipelineOptions } from "../pipeline/orchestrator.js";

export type GenerateKitDependencies = ApplicationPipelineOptions;

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type GenerateKitResponse =
  | { id: string; kit: Awaited<ReturnType<typeof generateKitFromInput>>["kit"] }
  | ApiError;

function jsonResponse(body: GenerateKitResponse, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new Error("Request body must contain valid JSON");
  }
}

export async function handleGenerateKit(
  request: Request,
  dependencies: GenerateKitDependencies,
): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse(
      { error: { code: "METHOD_NOT_ALLOWED", message: "Only POST is supported" } },
      405,
    );
  }

  let raw: unknown;
  try {
    raw = await readJson(request);
  } catch (error) {
    return jsonResponse({
      error: {
        code: "INVALID_JSON",
        message: error instanceof Error ? error.message : "Invalid JSON body",
      },
    }, 400);
  }

  const parsed = KitInputSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: parsed.error.flatten(),
      },
    }, 400);
  }

  try {
    const input = normalizeKitInput(parsed.data);
    const result = await generateKitFromInput(input, dependencies);
    return jsonResponse({ id: result.id, kit: result.kit }, result.reused ? 200 : 201);
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "KIT_GENERATION_FAILED";
    const status =
      code === "COVERAGE_NOT_SHIPPABLE" ? 422 :
      code === "LLM_NOT_CONFIGURED" ? 503 :
      code === "RESEARCH_FAILED" ? 502 :
      code === "EXTRACTION_FAILED" ? 422 : 500;

    return jsonResponse({
      error: {
        code,
        message: error instanceof Error ? error.message : "Kit generation failed",
      },
    }, status);
  }
}
