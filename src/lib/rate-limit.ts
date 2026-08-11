import { headers } from "next/headers";
import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = { allowed: boolean; retryAfterSeconds?: number };

// Shared store (Upstash Redis) when configured — required for correct limits
// across multiple serverless instances. Falls back to a per-instance in-memory
// window when the env vars are absent (fine for single-instance / local dev).
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? Redis.fromEnv() : null;
const limiters = new Map<string, Ratelimit>();

function limiterFor(limit: number, windowMs: number): Ratelimit {
  const cacheKey = `${limit}:${windowMs}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.fixedWindow(limit, `${windowMs} ms` as Duration),
      prefix: "rl",
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

function inMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  if (Math.random() < 0.01) {
    for (const [k, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(k);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { allowed: true };
}

/**
 * Fixed-window rate limiter. Uses Upstash Redis when UPSTASH_REDIS_REST_URL /
 * _TOKEN are set (shared across instances); otherwise an in-memory window.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  if (redis) {
    try {
      const result = await limiterFor(limit, windowMs).limit(key);
      if (result.success) return { allowed: true };
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)) };
    } catch {
      // Redis unreachable — degrade to in-memory rather than failing open/closed unpredictably.
    }
  }
  return inMemory(key, limit, windowMs);
}

/** Client IP from the reverse proxy's forwarded headers — set by nginx/Vercel/etc. in production. */
export async function getClientIp() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}
