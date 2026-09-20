export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Every call carries the session cookie; the API is cross-origin in dev and in deployment.
export const call = (path: string, init: RequestInit = {}) => fetch(API + path, { credentials: "include", ...init });

export function formatGenerationError(error: any) {
  const code = error?.code || "KIT_GENERATION_FAILED";
  const details = error?.details || {};
  if (code === "CONFIGURATION" && details?.status === 404) {
    const provider = details.provider || "Selected provider";
    const model = details.model ? " Model: " + details.model + "." : "";
    return provider + " could not find the configured endpoint or model (HTTP 404)." + model + " Check the provider model setting/API endpoint and try again.";
  }
  if (code === "CONFIGURATION" && (details?.status === 401 || details?.status === 403)) return "The selected AI provider rejected authentication. Check the API key configured on the backend.";
  if (code === "RATE_LIMITED") return "The selected AI provider is rate-limiting requests. Wait a moment or choose another configured provider.";
  if (code === "TRANSIENT") return "The selected AI provider is temporarily unavailable or timed out. Try again or choose another provider.";
  if (code === "LLM_NOT_CONFIGURED") return error?.message || "The selected AI provider is not configured on the backend. Add its API key/configuration before using it.";
  return error?.message || "Kit generation failed. Check the server terminal for the correlated backend error.";
}

// fetch() rejects with a bare TypeError ("Failed to fetch") when the API is down, blocked by CORS or offline.
export function friendlyError(err: unknown, fallback: string) {
  if (err instanceof TypeError) return "Can't reach the server. Check your connection or that the API is running, then try again.";
  if (err instanceof SyntaxError) return "The server sent an unexpected response. Please try again.";
  return err instanceof Error ? err.message : fallback;
}
