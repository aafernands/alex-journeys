import { Redis } from "@upstash/redis";

type Bucket = { count: number; resetAt: number };

export type RateLimitResult = {
  ok: boolean;
  retryAfterSec: number;
  configured: boolean;
  backend: "upstash" | "memory";
};

const buckets = new Map<string, Bucket>();

function sharedRedis(): Redis | null {
  if (
    !process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    !process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  ) {
    return null;
  }
  try {
    return Redis.fromEnv();
  } catch {
    return null;
  }
}
function localRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  for (const [bucketKey, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(bucketKey);
  }
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0, configured: true, backend: "memory" };
  }
  if (existing.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      configured: true,
      backend: "memory",
    };
  }
  existing.count += 1;
  return { ok: true, retryAfterSec: 0, configured: true, backend: "memory" };
}

/**
 * Shared fixed-window limiter for Vercel. Local memory is deliberately limited
 * to development; production fails closed when the shared store is unavailable.
 */
export async function rateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000,
): Promise<RateLimitResult> {
  const redis = sharedRedis();
  if (!redis) {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        retryAfterSec: Math.max(1, Math.ceil(windowMs / 1000)),
        configured: false,
        backend: "memory",
      };
    }
    return localRateLimit(key, limit, windowMs);
  }
  const redisKey = `fj:ratelimit:${key}`;
  try {
    const count = await redis.incr(redisKey);
    if (count === 1) await redis.pexpire(redisKey, windowMs);
    const ttlMs = await redis.pttl(redisKey);
    const retryAfterSec = Math.max(
      1,
      Math.ceil((ttlMs > 0 ? ttlMs : windowMs) / 1000),
    );
    return {
      ok: count <= limit,
      retryAfterSec: count <= limit ? 0 : retryAfterSec,
      configured: true,
      backend: "upstash",
    };
  } catch {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        retryAfterSec: Math.max(1, Math.ceil(windowMs / 1000)),
        configured: false,
        backend: "upstash",
      };
    }
    return localRateLimit(key, limit, windowMs);
  }
}
