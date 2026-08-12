// PROPOSAL — target path: sdk/orvix-node/src/webhooks.ts (new file)
//
// Verifies the exact scheme webhook-delivery.service.ts actually signs
// with: HMAC-SHA256 of the raw JSON body, using the subscription's
// secret, sent as the X-Orvix-Signature header. Matched against that
// file directly, not re-derived from the doc's spec.

import { createHmac, timingSafeEqual } from "crypto";

export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  // Constant-time comparison — a plain === here would leak timing
  // information an attacker could use to guess the signature byte by byte.
  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(signatureHeader, "hex");
  if (expectedBuf.length !== receivedBuf.length) return false;

  return timingSafeEqual(expectedBuf, receivedBuf);
}

// Usage notes (Express example, not runnable code — see below):
//
// 1. Register the route with a raw-text body parser, NOT express.json().
//    The signature is computed over the exact bytes sent, so the
//    handler needs the raw string body, not a parsed-then-re-stringified
//    object (different key order or whitespace would break verification
//    even for a genuine request).
//
// 2. Read the X-Orvix-Signature header and pass it, the raw body string,
//    and your webhook's stored secret into verifyWebhookSignature above.
//
// 3. Only after it returns true, JSON.parse the body and handle
//    { event, data }. Return 401 on failure, 200 once handled.
