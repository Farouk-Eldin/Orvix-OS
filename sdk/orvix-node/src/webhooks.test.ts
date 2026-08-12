// PROPOSAL — target path: sdk/orvix-node/src/webhooks.test.ts (new file)

import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifyWebhookSignature } from "./webhooks";

const SECRET = "test-secret-abc123";

function sign(body: string) {
  return createHmac("sha256", SECRET).update(body).digest("hex");
}

describe("verifyWebhookSignature", () => {
  it("accepts a correctly signed payload", () => {
    const body = JSON.stringify({ event: "BOOKING_CREATED", data: { bookingId: "b1" } });
    expect(verifyWebhookSignature(body, sign(body), SECRET)).toBe(true);
  });

  it("rejects a payload signed with the wrong secret", () => {
    const body = JSON.stringify({ event: "BOOKING_CREATED", data: { bookingId: "b1" } });
    const wrongSignature = createHmac("sha256", "different-secret").update(body).digest("hex");
    expect(verifyWebhookSignature(body, wrongSignature, SECRET)).toBe(false);
  });

  it("rejects when the body was tampered with after signing", () => {
    const originalBody = JSON.stringify({ event: "BOOKING_CREATED", data: { bookingId: "b1" } });
    const signature = sign(originalBody);
    const tamperedBody = JSON.stringify({ event: "BOOKING_CREATED", data: { bookingId: "b2" } });

    expect(verifyWebhookSignature(tamperedBody, signature, SECRET)).toBe(false);
  });

  it("rejects a missing signature header", () => {
    expect(verifyWebhookSignature("{}", null, SECRET)).toBe(false);
  });

  it("rejects a malformed (non-hex) signature without throwing", () => {
    expect(() => verifyWebhookSignature("{}", "not-valid-hex!!", SECRET)).not.toThrow();
    expect(verifyWebhookSignature("{}", "not-valid-hex!!", SECRET)).toBe(false);
  });
});
