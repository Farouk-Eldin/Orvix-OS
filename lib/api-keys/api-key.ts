// PROPOSAL — target path: lib/api-keys/api-key.ts (new file)

import { randomBytes, createHash } from "crypto";

import { prisma } from "@/lib/prisma";

const PREFIX = "ovx_live_";

function hash(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

// Returns the full key ONCE — the caller must show it to the person now
// and never again. Only keyPrefix + hashedKey get stored.
export function generateApiKey() {
  const secret = randomBytes(24).toString("base64url");
  const fullKey = `${PREFIX}${secret}`;
  return {
    fullKey,
    keyPrefix: fullKey.slice(0, PREFIX.length + 6), // "ovx_live_ab12cd" — enough to recognize, not enough to guess
    hashedKey: hash(fullKey),
  };
}

export interface VerifiedApiKey {
  workspaceId: string;
  permissions: string[];
  keyId: string;
}

// Used by public API routes instead of requireWorkspace() (that one is
// for the logged-in dashboard session; external callers send a key).
export async function verifyApiKey(rawKey: string | null): Promise<VerifiedApiKey | null> {
  if (!rawKey || !rawKey.startsWith(PREFIX)) return null;

  const record = await prisma.apiKey.findUnique({ where: { hashedKey: hash(rawKey) } });
  if (!record) return null;
  if (record.revokedAt) return null;
  if (record.expiresAt && record.expiresAt < new Date()) return null;

  // Best-effort — a failed write here should never block the actual request.
  prisma.apiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  return { workspaceId: record.workspaceId, permissions: record.permissions, keyId: record.id };
}
