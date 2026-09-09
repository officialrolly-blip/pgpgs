// Simple in-memory fixed-window rate limiter for the public API v1.
//
// Good enough for a single server instance. If the API is ever served from
// multiple instances (e.g. serverless functions), swap the store for a
// shared one (Redis / Upstash) behind the same checkRateLimit() signature.
//
// NOTE: buckets are keyed by caller-supplied strings (e.g. "v1-login:<ip>"),
// so different endpoints can use different limits without interference.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastPrunedAt = Date.now();

const PRUNE_INTERVAL_MS = 60_000;

function prune(now: number): void {
  if (now - lastPrunedAt < PRUNE_INTERVAL_MS) return;
  lastPrunedAt = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  prune(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

// Best-effort client IP extraction for rate-limit keys. Falls back to a
// constant so requests without an identifiable IP share one bucket (safe).
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}