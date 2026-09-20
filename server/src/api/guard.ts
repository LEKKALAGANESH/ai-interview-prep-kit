const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Browsers always attach Origin to cross-site mutations, so a present-but-unlisted Origin is a CSRF attempt.
export function isCrossSiteMutation(method: string | undefined, origin: string | undefined, allowed: Set<string>): boolean {
  return !SAFE_METHODS.has(method ?? "GET") && Boolean(origin) && !allowed.has(origin as string);
}

const windows = new Map<string, { count: number; resetAt: number }>();

// ponytail: in-memory fixed window (one process, resets on restart); move to a shared store if scaled out.
export function rateLimited(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const entry = windows.get(key);
  if (!entry || entry.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    if (windows.size > 10_000) for (const [k, v] of windows) if (v.resetAt <= now) windows.delete(k);
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}
