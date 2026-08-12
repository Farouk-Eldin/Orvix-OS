import { createHmac, timingSafeEqual } from "crypto";

/**
 * Every Meta product (WhatsApp, Messenger, Instagram) signs webhook POST
 * bodies the same way: HMAC-SHA256 of the RAW request body using the
 * app secret, sent as `X-Hub-Signature-256: sha256=<hex>`. Must compare
 * with timingSafeEqual — a plain `===` leaks timing information that
 * makes the signature guessable byte-by-byte.
 */
export function verifyMetaSignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader) return false;

  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const expectedHeader = `sha256=${expected}`;

  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expectedHeader);
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

/** Handles the one-time GET handshake Meta sends when you register a webhook URL. */
export function handleVerificationHandshake(
  searchParams: URLSearchParams,
  verifyToken: string
): { challenge: string } | null {
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return { challenge };
  }
  return null;
}
