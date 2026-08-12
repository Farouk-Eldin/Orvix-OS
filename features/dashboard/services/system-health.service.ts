import { prisma } from "@/lib/prisma";
import { pingRedis } from "@/lib/redis";
import { supabase } from "@/lib/supabase";

export type HealthStatus = "ONLINE" | "DEGRADED" | "OFFLINE";

export interface ServiceHealth {
  service: string;
  status: HealthStatus;
  latencyMs: number | null;
  message: string | null;
}

async function checkDatabase(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { service: "DATABASE", status: "ONLINE", latencyMs: Date.now() - start, message: null };
  } catch (error) {
    return {
      service: "DATABASE",
      status: "OFFLINE",
      latencyMs: null,
      message: error instanceof Error ? error.message : "تعذر الاتصال بقاعدة البيانات",
    };
  }
}

async function checkRedis(): Promise<ServiceHealth> {
  const { ok, latencyMs } = await pingRedis();
  return {
    service: "REDIS",
    status: ok ? "ONLINE" : "OFFLINE",
    latencyMs,
    message: ok ? null : "تعذر الاتصال بـ Redis",
  };
}

async function checkQdrant(): Promise<ServiceHealth> {
  const url = process.env.QDRANT_URL;
  if (!url) {
    return { service: "QDRANT", status: "OFFLINE", latencyMs: null, message: "لم يتم الربط بعد" };
  }
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${url}/healthz`, {
      headers: process.env.QDRANT_API_KEY ? { "api-key": process.env.QDRANT_API_KEY } : {},
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return {
      service: "QDRANT",
      status: res.ok ? "ONLINE" : "DEGRADED",
      latencyMs: Date.now() - start,
      message: res.ok ? null : `استجاب بحالة ${res.status}`,
    };
  } catch (error) {
    return {
      service: "QDRANT",
      status: "OFFLINE",
      latencyMs: null,
      message: error instanceof Error ? error.message : "تعذر الوصول لـ Qdrant",
    };
  }
}

async function checkStorage(): Promise<ServiceHealth> {
  if (!supabase) {
    return { service: "STORAGE", status: "OFFLINE", latencyMs: null, message: "لم يتم الربط بعد" };
  }
  const start = Date.now();
  const { error } = await supabase.storage.listBuckets();
  return {
    service: "STORAGE",
    status: error ? "DEGRADED" : "ONLINE",
    latencyMs: Date.now() - start,
    message: error?.message ?? null,
  };
}

/** Uses the platform's own key as a canary — per-workspace BYOK keys (see
 *  AIProvider) are checked individually from the AI Provider settings page. */
async function checkGemini(): Promise<ServiceHealth> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return { service: "GEMINI", status: "OFFLINE", latencyMs: null, message: "لم يتم إضافة مفتاح API بعد" };
  }
  const { GeminiProvider } = await import("@/lib/ai/providers/gemini.provider");
  const health = await new GeminiProvider(key).checkHealth();
  return {
    service: "GEMINI",
    status: health.ok ? "ONLINE" : "DEGRADED",
    latencyMs: health.latencyMs,
    message: health.message,
  };
}

async function checkGrok(): Promise<ServiceHealth> {
  const key = process.env.GROK_API_KEY;
  if (!key) {
    return { service: "GROK", status: "OFFLINE", latencyMs: null, message: "لم يتم إضافة مفتاح API بعد" };
  }
  const { GrokProvider } = await import("@/lib/ai/providers/grok.provider");
  const health = await new GrokProvider(key).checkHealth();
  return {
    service: "GROK",
    status: health.ok ? "ONLINE" : "DEGRADED",
    latencyMs: health.latencyMs,
    message: health.message,
  };
}

export const systemHealthService = {
  async checkAll(): Promise<ServiceHealth[]> {
    const [database, redisCheck, qdrant, storage, gemini, grok] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkQdrant(),
      checkStorage(),
      checkGemini(),
      checkGrok(),
    ]);

    const results = [database, redisCheck, qdrant, storage, gemini, grok];

    // Persist so the Admin Panel (Phase 10) can chart history over time.
    await prisma.systemHealth
      .createMany({
        data: results.map((r) => ({
          service: r.service as never,
          status: r.status,
          responseTimeMs: r.latencyMs,
          message: r.message,
        })),
      })
      .catch(() => null);

    return results;
  },
};
