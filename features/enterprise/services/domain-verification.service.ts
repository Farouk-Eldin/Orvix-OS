// PROPOSAL — target path: features/enterprise/services/domain-verification.service.ts (new file)

import { randomBytes } from "crypto";
import { resolveTxt } from "dns/promises";
import { prisma } from "@/lib/prisma";

function generateToken() {
  return `orvix-verify-${randomBytes(16).toString("hex")}`;
}

export const domainVerificationService = {
  async requestDomain(workspaceId: string, domain: string) {
    const existing = await prisma.customDomain.findUnique({ where: { domain } });
    if (existing && existing.workspaceId !== workspaceId) {
      throw new Error("الدومين ده مستخدم بالفعل من حساب تاني");
    }

    return prisma.customDomain.upsert({
      where: { workspaceId },
      create: { workspaceId, domain, verificationToken: generateToken() },
      update: { domain, status: "PENDING_DNS", verifiedAt: null, verificationToken: generateToken() },
    });
  },

  /**
   * A REAL DNS check — this actually queries public DNS via Node's
   * resolver, not a simulated success. It looks for a TXT record at
   * `_orvix-verify.{domain}` containing the stored token, which proves
   * the person controls the domain's DNS (only a domain owner can add
   * DNS records for it).
   *
   * What this does NOT do — and can't, from here — is the second half
   * of "custom domain" working end-to-end: actually attaching the
   * domain to this deployment and issuing an SSL certificate for it.
   * That's a call to whichever host this ships on (Vercel's Domains
   * API, Cloudflare, etc.) using real account credentials that don't
   * exist in this sandbox. Marked below so it's impossible to miss.
   */
  async checkVerification(workspaceId: string) {
    const record = await prisma.customDomain.findUnique({ where: { workspaceId } });
    if (!record) throw new Error("مفيش طلب دومين لهذا النشاط");

    let verified = false;
    try {
      const txtRecords = await resolveTxt(`_orvix-verify.${record.domain}`);
      verified = txtRecords.some((chunks) => chunks.join("").trim() === record.verificationToken);
    } catch {
      verified = false; // no TXT record found yet, or the domain doesn't resolve — not an error, just "not ready"
    }

    const updated = await prisma.customDomain.update({
      where: { workspaceId },
      data: {
        status: verified ? "VERIFIED" : "PENDING_DNS",
        verifiedAt: verified ? new Date() : null,
        lastCheckedAt: new Date(),
      },
    });

    if (verified) {
      // TODO(deploy-time): call the real hosting provider's domain API
      // here to actually attach `record.domain` to this project and
      // trigger SSL issuance. Needs real provider credentials —
      // intentionally not stubbed with a fake success, since a fake
      // success here would tell a business owner their domain is live
      // when it isn't.
      console.log(`[domains] ${record.domain} passed DNS verification — needs manual/provider-API domain attach`);
    }

    return updated;
  },
};
