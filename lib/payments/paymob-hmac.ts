import { createHmac, timingSafeEqual } from "crypto";

/**
 * Paymob's HMAC is NOT "hash the raw body" like Meta's — it concatenates
 * a specific, documented, ordered list of transaction fields as strings
 * and hashes with SHA-512 (not SHA-256). Every field below is required
 * and the order is fixed by Paymob; changing it silently breaks
 * verification with no error message.
 */
const HMAC_FIELD_ORDER = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
] as const;

function getPath(obj: any, path: string): unknown {
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

export function verifyPaymobHmac(transactionObj: unknown, receivedHmac: string | null): boolean {
  const secret = process.env.PAYMOB_HMAC_SECRET;
  if (!secret || !receivedHmac) return false;

  const concatenated = HMAC_FIELD_ORDER.map((field) => String(getPath(transactionObj, field) ?? "")).join("");

  const expected = createHmac("sha512", secret).update(concatenated, "utf8").digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(receivedHmac);
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
