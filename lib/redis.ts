import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

/**
 * Lazy-connects so importing this module never throws just because
 * REDIS_URL isn't set yet in an environment that hasn't reached this
 * phase's setup. Callers should still handle connection errors.
 */
export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export async function pingRedis(): Promise<{ ok: boolean; latencyMs: number | null }> {
  const start = Date.now();
  try {
    if (redis.status !== "ready" && redis.status !== "connecting") {
      await redis.connect();
    }
    await redis.ping();
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: null };
  }
}
