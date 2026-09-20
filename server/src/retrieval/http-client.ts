import { assertPublicHost, validateExternalUrl, type HostResolver } from "./url-validator.js";

export type FetchPageOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  allowLocalhost?: boolean;
  fetchImpl?: typeof fetch;
  maxRedirects?: number;
  resolver?: HostResolver;
  /** Runs before every hop (including redirect targets); throw to abort, e.g. on robots.txt. */
  guard?: (url: URL) => Promise<void>;
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
      | "BLOCKED"
      | "NETWORK_ERROR"
      | "REDIRECT_LIMIT",
    message: string,
  ) {
    super(message);
    this.name = "RetrievalError";
  }
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = 1_000_000;
const DEFAULT_MAX_REDIRECTS = 5;
const ALLOWED_CONTENT_TYPES = ["text/html", "application/xhtml+xml"];
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

async function readBodyCapped(response: Response, maxBytes: number): Promise<string> {
  const tooLarge = () => new RetrievalError("CONTENT_TOO_LARGE", `Response exceeds the ${maxBytes}-byte limit`);
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) throw tooLarge();
    return text;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return text + decoder.decode();
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw tooLarge();
    }
    text += decoder.decode(value, { stream: true });
  }
}

async function checkHop(url: URL, options: FetchPageOptions): Promise<void> {
  try {
    await assertPublicHost(url, options);
  } catch (error) {
    throw new RetrievalError("INVALID_URL", error instanceof Error ? error.message : "Unsafe destination");
  }
  try {
    await options.guard?.(url);
  } catch (error) {
    throw new RetrievalError("BLOCKED", error instanceof Error ? error.message : "Blocked");
  }
}

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
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const fetchImpl = options.fetchImpl ?? fetch;

  for (let redirectCount = 0; ; redirectCount += 1) {
    await checkHop(url, options);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;

    try {
      response = await fetchImpl(url.href, {
        method: "GET",
        redirect: "manual",
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

    if (REDIRECT_STATUSES.has(response.status)) {
      const location = response.headers.get("location");

      if (!location) {
        throw new RetrievalError(
          "HTTP_ERROR",
          `HTTP ${response.status} redirect without a Location header`,
        );
      }

      if (redirectCount >= maxRedirects) {
        throw new RetrievalError(
          "REDIRECT_LIMIT",
          `Redirect limit of ${maxRedirects} exceeded`,
        );
      }

      try {
        url = validateExternalUrl(new URL(location, url).href, {
          allowLocalhost: options.allowLocalhost,
        });
      } catch (error) {
        throw new RetrievalError(
          "INVALID_URL",
          error instanceof Error
            ? `Unsafe redirect destination: ${error.message}`
            : "Unsafe redirect destination",
        );
      }

      continue;
    }

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

    const body = await readBodyCapped(response, maxBytes);

    return {
      url: response.url || url.href,
      status: response.status,
      contentType,
      body,
    };
  }
}
