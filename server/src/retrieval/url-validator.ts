export type UrlValidationOptions = {
  allowLocalhost?: boolean;
};

const PRIVATE_IPV4_RANGES = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
];

function isPrivateIpv4(hostname: string): boolean {
  return PRIVATE_IPV4_RANGES.some((pattern) => pattern.test(hostname));
}

function isPrivateHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");

  if (normalized === "localhost" || normalized.endsWith(".localhost")) {
    return true;
  }

  if (normalized === "::1" || normalized === "[::1]") {
    return true;
  }

  return isPrivateIpv4(normalized);
}

export function validateExternalUrl(
  value: string,
  options: UrlValidationOptions = {},
): URL {
  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Invalid URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are supported");
  }

  if (url.username || url.password) {
    throw new Error("URLs containing credentials are not allowed");
  }

  if (!options.allowLocalhost && isPrivateHostname(url.hostname)) {
    throw new Error("Private or loopback destinations are not allowed");
  }

  return url;
}
