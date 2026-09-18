import { validateExternalUrl } from "./url-validator.js";

export type FetchPageOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  allowLocalhost?: boolean;
  fetchImpl?: typeof fetch;
};

export type FetchedPage = {
  url: string;
  status: number;
  contentType: string;
  body: string;
};

export class RetrievalError extends Error {
  constructor(
    public readonly code:
      | "INVALID_URL"
      | "TIMEOUT"
      | "HTTP_ERROR"
      | "CONTENT_TYPE_UNSUPPORTED"
      | "CONTENT_TOO_LARGE"
      | "NETWORK_ERROR",
    message: string,
  ) {
    super(message);
    this.name = "RetrievalError";
  }
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = 1_000_000;
const ALLOWED_CONTENT_TYPES = [
  "text/html",
  "application/xhtml+xml",
];

export async function fetchPage(
  value: string,
  options: FetchPageOptions = {},
): Promise<FetchedPage> {
  let url: URL;

  try {
    url = validateExternalUrl(value, {
      allowLocalhost: options.allowLocalhost,
    });
  } catch (error) {
    throw new RetrievalError(
      "INVALID_URL",
      error instanceof Error ? error.message : "Invalid URL",
    );
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;

  try {
    response = await fetchImpl(url.href, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "Trao-AI-Interview-Prep-Kit/1.0",
      },
    });
  } catch (error) {
    clearTimeout(timeout);

    if (error instanceof Error && error.name === "AbortError") {
      throw new RetrievalError("TIMEOUT", `Request timed out after ${timeoutMs}ms`);
    }

    throw new RetrievalError(
      "NETWORK_ERROR",
      error instanceof Error ? error.message : "Network request failed",
    );
  }

  clearTimeout(timeout);

  if (!response.ok) {
    throw new RetrievalError(
      "HTTP_ERROR",
      `HTTP ${response.status} while fetching ${url.href}`,
    );
  }

  const contentType = (response.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();

  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    throw new RetrievalError(
      "CONTENT_TYPE_UNSUPPORTED",
      `Unsupported content type: ${contentType || "unknown"}`,
    );
  }

  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RetrievalError(
      "CONTENT_TOO_LARGE",
      `Response exceeds the ${maxBytes}-byte limit`,
    );
  }

  const body = await response.text();

  if (new TextEncoder().encode(body).byteLength > maxBytes) {
    throw new RetrievalError(
      "CONTENT_TOO_LARGE",
      `Response exceeds the ${maxBytes}-byte limit`,
    );
  }

  return {
    url: response.url || url.href,
    status: response.status,
    contentType,
    body,
  };
}
