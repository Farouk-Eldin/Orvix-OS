import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

/**
 * AES-256-GCM. Every value is stored as `iv:authTag:ciphertext` (hex),
 * so callers never need to know the internals — just encrypt()/decrypt().
 *
 * SECURITY: this file is server-only. It must never be imported from a
 * "use client" component. Both env secrets below are read without the
 * NEXT_PUBLIC_ prefix on purpose — Next.js only inlines NEXT_PUBLIC_*
 * vars into the client bundle, so anything without that prefix simply
 * doesn't exist outside server code (route handlers, server actions,
 * server components, the queue worker).
 */

const ALGORITHM = "aes-256-gcm";

function deriveKey(secret: string): Buffer {
  // scrypt turns an arbitrary-length passphrase into a fixed 32-byte key.
  // The salt is fixed and app-specific (not secret) — the passphrase
  // itself is what must stay confidential, exactly like a password hash's
  // secret is the password, not the salt.
  return scryptSync(secret, "orvix-os-static-salt", 32);
}

function encryptWith(secret: string, plainText: string): string {
  if (!secret) {
    throw new Error("Encryption secret is missing — check your .env");
  }
  const key = deriveKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptWith(secret: string, payload: string): string {
  if (!secret) {
    throw new Error("Encryption secret is missing — check your .env");
  }
  const [ivHex, authTagHex, dataHex] = payload.split(":");
  if (!ivHex || !authTagHex || !dataHex) {
    throw new Error("Malformed encrypted payload");
  }
  const key = deriveKey(secret);
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/** AIProvider.apiKeyEncrypted — Gemini/Grok/future provider keys. */
export function encryptAiProviderKey(plainText: string): string {
  return encryptWith(requireEnv("AI_ENCRYPTION_SECRET"), plainText);
}
export function decryptAiProviderKey(payload: string): string {
  return decryptWith(requireEnv("AI_ENCRYPTION_SECRET"), payload);
}

/** WhatsAppAccount/FacebookPage/InstagramAccount access tokens + webhook secrets. */
export function encryptChannelSecret(plainText: string): string {
  return encryptWith(requireEnv("ENCRYPTION_SECRET"), plainText);
}
export function decryptChannelSecret(payload: string): string {
  return decryptWith(requireEnv("ENCRYPTION_SECRET"), payload);
}

/** OAuthConnection access/refresh tokens (Google Calendar and future providers). */
export function encryptOAuthToken(plainText: string): string {
  return encryptWith(requireEnv("ENCRYPTION_SECRET"), plainText);
}
export function decryptOAuthToken(payload: string): string {
  return decryptWith(requireEnv("ENCRYPTION_SECRET"), payload);
}

function requireEnv(name: "AI_ENCRYPTION_SECRET" | "ENCRYPTION_SECRET"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} غير موجود في .env — لازم تضيفه قبل ما تخزّن أي مفتاح حساس`);
  }
  return value;
}

/** Never send a real key back to the client — only enough to recognise it. */
export function maskSecret(plainText: string): string {
  if (plainText.length <= 8) return "••••••••";
  return `${plainText.slice(0, 4)}••••••••${plainText.slice(-4)}`;
}
