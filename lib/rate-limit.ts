import { redis } from "@/lib/redis";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Fixed-window limiter keyed by an arbitrary identifier (IP, userId,
 * workspaceId...). Cheap and good enough for API/login/upload/AI-request
 * throttling — swap for a sliding-window/token-bucket algorithm later if
 * bursty traffic at window edges becomes a real problem.
 */
export async function rateLimit(
  identifier: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number }
): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }
    const ttl = await redis.ttl(key);

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt: Date.now() + Math.max(ttl, 0) * 1000,
    };
  } catch {
    // Redis unreachable — fail open so an infra hiccup doesn't take the
    // whole product down; SystemHealth surfaces the outage separately.
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowSeconds * 1000 };
  }
}

export const RATE_LIMITS = {
  api: { limit: 120, windowSeconds: 60 },
  login: { limit: 10, windowSeconds: 60 },
  upload: { limit: 20, windowSeconds: 60 * 10 },
  aiRequest: { limit: 30, windowSeconds: 60 },
} as const;
