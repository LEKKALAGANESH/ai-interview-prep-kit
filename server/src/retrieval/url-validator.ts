import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type UrlValidationOptions = {
  allowLocalhost?: boolean;
};

export type HostResolver = (hostname: string) => Promise<string[]>;

function isPrivateIpv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224 // multicast + reserved
  );
}

function isPrivateIpv6(ip: string): boolean {
  const value = ip.toLowerCase();
  if (value === "::" || value === "::1") return true;
  const mapped = value.match(/^::ffff:(?:(\d+\.\d+\.\d+\.\d+)|([0-9a-f]{1,4}):([0-9a-f]{1,4}))$/);
  if (mapped) {
    if (mapped[1]) return isPrivateIpv4(mapped[1]);
    const high = parseInt(mapped[2], 16);
    const low = parseInt(mapped[3], 16);
    return isPrivateIpv4(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
  }
  const first = parseInt(value.split(":")[0] || "0", 16);
  return (first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80 || (first & 0xff00) === 0xff00; // ULA, link-local, multicast
}

export function isPrivateAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPrivateIpv4(ip);
  if (family === 6) return isPrivateIpv6(ip);
  return false;
}

function isPrivateHostname(hostname: string): boolean {
  // URL() already normalises decimal/hex/octal IPv4 forms to dotted quads.
  const normalized = hostname.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
  if (normalized === "localhost" || normalized.endsWith(".localhost")) return true;
  return isPrivateAddress(normalized);
}

// Localhost is a dev/batch convenience: it can never be enabled in production.
function localhostAllowed(options: UrlValidationOptions): boolean {
  return Boolean(options.allowLocalhost) && process.env.NODE_ENV !== "production";
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

  if (!localhostAllowed(options) && isPrivateHostname(url.hostname)) {
    throw new Error("Private or loopback destinations are not allowed");
  }

  return url;
}

const resolveAll: HostResolver = async (hostname) =>
  (await lookup(hostname, { all: true })).map((entry) => entry.address);

/**
 * Rejects hostnames that resolve to private addresses (DNS-to-internal names).
 * A name that does not resolve is left to the fetch itself to fail.
 * ponytail: resolve-then-connect leaves a rebinding window; pin the resolved IP in a custom agent if that matters.
 */
export async function assertPublicHost(
  url: URL,
  options: UrlValidationOptions & { resolver?: HostResolver } = {},
): Promise<void> {
  if (localhostAllowed(options) || isIP(url.hostname.replace(/^\[|\]$/g, ""))) return;
  let addresses: string[];
  try {
    addresses = await (options.resolver ?? resolveAll)(url.hostname);
  } catch {
    return;
  }
  if (addresses.some(isPrivateAddress)) {
    throw new Error("Hostname resolves to a private or loopback address");
  }
}
