import IORedis from "ioredis";

/**
 * BullMQ needs its own connection with maxRetriesPerRequest: null (it
 * manages retries itself via blocking commands) — reusing the general
 * lib/redis.ts client would fight BullMQ's own retry/backoff logic.
 */
export function createQueueConnection() {
  return new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });
}
