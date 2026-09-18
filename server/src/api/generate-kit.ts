import { normalizeKitInput } from "@trao/interview-prep-shared/input-model.js";
import { KitInputSchema } from "@trao/interview-prep-shared/input.js";
import { generateAndPersistKit, type GenerateAndPersistKitOptions } from "../pipeline/service.js";
import type { KitStore } from "../persistence/store.js";

export type GenerateKitDependencies = {
  store: KitStore;
  buildOptions: (
    input: ReturnType<typeof normalizeKitInput>,
  ) => Promise<GenerateAndPersistKitOptions>;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type GenerateKitResponse =
  | { id: string; kit: Awaited<ReturnType<typeof generateAndPersistKit>>["kit"] }
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
    return jsonResponse(
      {
        error: {
          code: "INVALID_JSON",
          message: error instanceof Error ? error.message : "Invalid JSON body",
        },
      },
      400,
    );
  }

  const parsed = KitInputSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: parsed.error.flatten(),
        },
      },
      400,
    );
  }

  try {
    const input = normalizeKitInput(parsed.data);
    const options = await dependencies.buildOptions(input);
    const result = await generateAndPersistKit(input, options, dependencies.store);

    return jsonResponse({ id: result.id, kit: result.kit }, 201);
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "KIT_GENERATION_FAILED";

    const status = code === "COVERAGE_NOT_SHIPPABLE" ? 422 : 500;

    return jsonResponse(
      {
        error: {
          code,
          message: error instanceof Error ? error.message : "Kit generation failed",
        },
      },
      status,
    );
  }
}
