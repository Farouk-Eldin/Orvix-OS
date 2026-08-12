import { referralRepository } from "@/lib/repositories/referral.repository";
import { withdrawalRepository } from "@/lib/repositories/withdrawal.repository";
import { platformSettingsService } from "@/features/admin/services/platform-settings.service";

export const affiliateBalanceService = {
  async getBalance(marketerId: string) {
    const [marketer, paidOrApproved, settings] = await Promise.all([
      referralRepository.findMarketerWithStats(marketerId),
      withdrawalRepository.sumPaidOrApproved(marketerId),
      platformSettingsService.getAffiliateSettings(),
    ]);
    if (!marketer) return null;

    const convertedCount = marketer.referrals.filter((r) => r.convertedAt).length;
    const earned = convertedCount * settings.commissionPerConversionEgp;
    const withdrawn = Number(paidOrApproved._sum.amount ?? 0);

    return {
      marketer: { id: marketer.id, name: marketer.name, email: marketer.email },
      convertedCount,
      commissionPerConversionEgp: settings.commissionPerConversionEgp,
      totalEarned: earned,
      totalWithdrawn: withdrawn,
      availableBalance: Math.max(0, earned - withdrawn),
      referrals: marketer.referrals,
    };
  },
};
