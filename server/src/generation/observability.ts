export type GenerationStage = "extraction" | "research" | "planning" | "generation" | "repair" | "validation" | "persistence";

export type GenerationEvent = {
  stage: GenerationStage;
  status: "started" | "succeeded" | "failed";
  duration_ms?: number;
  provider?: string;
  model?: string;
  attempt?: number;
  error_code?: string;
};

export type GenerationObserver = (event: GenerationEvent) => void;

export function observeStage<T>(
  observer: GenerationObserver | undefined,
  stage: GenerationStage,
  operation: () => Promise<T>,
  metadata: Omit<GenerationEvent, "stage" | "status" | "duration_ms"> = {},
): Promise<T> {
  observer?.({ stage, status: "started", ...metadata });
  const started = Date.now();
  return operation().then(
    (value) => {
      observer?.({ stage, status: "succeeded", duration_ms: Date.now() - started, ...metadata });
      return value;
    },
    (error) => {
      observer?.({
        stage, status: "failed", duration_ms: Date.now() - started,
        error_code: error && typeof error === "object" && "code" in error ? String((error as {code?: unknown}).code) : "UNKNOWN",
        ...metadata,
      });
      throw error;
    },
  );
}
