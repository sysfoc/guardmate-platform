// ─────────────────────────────────────────────────────────────────────────────
// Centralized Commission Calculator
// Phase 8: Commission, Subscription & Offers System
//
// This is the ONLY place commission is calculated in the entire codebase.
// All payment creation routes must call this function.
// ─────────────────────────────────────────────────────────────────────────────

import Offer from '@/models/Offer.model';
import User from '@/models/User.model';
import { OfferType, DiscountType, OfferEligibility } from '@/types/enums';
import type { IOffer, AppliedOffer } from '@/types/offer.types';
import type { IPlatformSettings } from '@/types/settings.types';

export interface CommissionInput {
  jobBudget: number;
  bossUid: string;
  guardUid: string;
  platformSettings: IPlatformSettings;
  /** Pass pre-fetched offers to avoid extra DB query, or null to auto-fetch */
  offers?: IOffer[] | null;
}

export interface CommissionResult {
  bossCommissionRate: number;
  guardCommissionRate: number;
  bossCommissionAmount: number;
  guardCommissionAmount: number;
  totalChargedToBoss: number;
  guardPayout: number;
  platformRevenue: number;
  appliedBossOffer: AppliedOffer | null;
  appliedGuardOffer: AppliedOffer | null;
}

/**
 * Boss offer types that reduce or waive the Boss commission.
 */
const BOSS_OFFER_TYPES: OfferType[] = [
  OfferType.BOSS_COMMISSION_REDUCTION,
  OfferType.BOSS_COMMISSION_WAIVER,
];

/**
 * Guard offer types that reduce or waive the Guard commission.
 */
const GUARD_OFFER_TYPES: OfferType[] = [
  OfferType.GUARD_COMMISSION_REDUCTION,
  OfferType.GUARD_COMMISSION_WAIVER,
];

/**
 * Calculate the effective commission rate after applying a discount.
 */
function applyDiscount(
  baseRate: number,
  discountType: DiscountType,
  discountValue: number | null
): number {
  switch (discountType) {
    case DiscountType.FULL_WAIVER:
      return 0;
    case DiscountType.PERCENTAGE_OFF:
      // e.g. base 10% with 50% off = 5%
      return Math.round(baseRate * (1 - (discountValue ?? 0) / 100) * 100) / 100;
    case DiscountType.FIXED_RATE:
      // Use discountValue directly as the new rate
      return Math.max(0, discountValue ?? baseRate);
    default:
      return baseRate;
  }
}

/**
 * Check if a user is eligible for an offer based on eligibility rules.
 */
async function checkEligibility(
  offer: IOffer,
  userUid: string
): Promise<boolean> {
  if (offer.eligibility === OfferEligibility.ALL_USERS) {
    return true;
  }

  if (offer.eligibility === OfferEligibility.NEW_USERS_ONLY) {
    const user = await User.findOne({ uid: userUid }).select('createdAt').lean();
    if (!user || !user.createdAt) return false;

    const registeredAt = new Date(user.createdAt as string);
    const thresholdMs = (offer.newUserDaysThreshold || 30) * 24 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - thresholdMs);

    return registeredAt >= cutoff;
  }

  return false;
}

/**
 * Find the best applicable offer for a user from a list of offers.
 * "Best" = the offer that results in the lowest commission rate.
 */
async function findBestOffer(
  offers: IOffer[],
  targetOfferTypes: OfferType[],
  baseRate: number,
  userUid: string
): Promise<{ offer: IOffer; appliedRate: number } | null> {
  const relevantOffers = offers.filter((o) =>
    targetOfferTypes.includes(o.offerType)
  );

  if (relevantOffers.length === 0) return null;

  let bestOffer: IOffer | null = null;
  let bestRate = baseRate;

  for (const offer of relevantOffers) {
    const eligible = await checkEligibility(offer, userUid);
    if (!eligible) continue;

    const appliedRate = applyDiscount(baseRate, offer.discountType, offer.discountValue);
    if (appliedRate < bestRate || bestOffer === null) {
      bestOffer = offer;
      bestRate = appliedRate;
    }
  }

  if (!bestOffer) return null;

  return { offer: bestOffer, appliedRate: bestRate };
}

/**
 * Round to 2 decimal places for currency precision.
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate complete commission breakdown with offer support.
 *
 * This function:
 * 1. Fetches active offers (or uses provided ones)
 * 2. Finds the best Boss offer and Guard offer
 * 3. Applies discounts to base commission rates
 * 4. Calculates all financial amounts
 * 5. Increments usageCount on applied offers
 * 6. Returns complete breakdown
 */
export async function calculateCommission(
  input: CommissionInput
): Promise<CommissionResult> {
  const { jobBudget, bossUid, guardUid, platformSettings } = input;

  const baseBossRate = platformSettings.platformCommissionBoss ?? 0;
  const baseGuardRate = platformSettings.platformCommissionGuard ?? 0;

  // Fetch active offers if not provided
  let activeOffers: IOffer[];
  if (input.offers !== undefined && input.offers !== null) {
    activeOffers = input.offers;
  } else {
    const now = new Date();
    activeOffers = await Offer.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).lean() as IOffer[];
  }

  // Find best Boss offer
  let finalBossRate = baseBossRate;
  let appliedBossOffer: AppliedOffer | null = null;

  const bestBoss = await findBestOffer(activeOffers, BOSS_OFFER_TYPES, baseBossRate, bossUid);
  if (bestBoss) {
    finalBossRate = bestBoss.appliedRate;
    appliedBossOffer = {
      offerId: String(bestBoss.offer._id),
      offerName: bestBoss.offer.name,
      originalRate: baseBossRate,
      appliedRate: bestBoss.appliedRate,
      savings: round2(jobBudget * (baseBossRate - bestBoss.appliedRate) / 100),
    };
  }

  // Find best Guard offer
  let finalGuardRate = baseGuardRate;
  let appliedGuardOffer: AppliedOffer | null = null;

  const bestGuard = await findBestOffer(activeOffers, GUARD_OFFER_TYPES, baseGuardRate, guardUid);
  if (bestGuard) {
    finalGuardRate = bestGuard.appliedRate;
    appliedGuardOffer = {
      offerId: String(bestGuard.offer._id),
      offerName: bestGuard.offer.name,
      originalRate: baseGuardRate,
      appliedRate: bestGuard.appliedRate,
      savings: round2(jobBudget * (baseGuardRate - bestGuard.appliedRate) / 100),
    };
  }

  // Calculate amounts
  const bossCommissionAmount = round2(jobBudget * (finalBossRate / 100));
  const guardCommissionAmount = round2(jobBudget * (finalGuardRate / 100));
  const totalChargedToBoss = round2(jobBudget + bossCommissionAmount);
  const guardPayout = round2(jobBudget - guardCommissionAmount);
  const platformRevenue = round2(bossCommissionAmount + guardCommissionAmount);

  // Increment usage counts on applied offers (non-blocking)
  const offerUpdates: Promise<unknown>[] = [];
  if (appliedBossOffer) {
    offerUpdates.push(
      Offer.updateOne({ _id: appliedBossOffer.offerId }, { $inc: { usageCount: 1 } })
    );
  }
  if (appliedGuardOffer) {
    offerUpdates.push(
      Offer.updateOne({ _id: appliedGuardOffer.offerId }, { $inc: { usageCount: 1 } })
    );
  }
  if (offerUpdates.length > 0) {
    await Promise.all(offerUpdates);
  }

  return {
    bossCommissionRate: finalBossRate,
    guardCommissionRate: finalGuardRate,
    bossCommissionAmount,
    guardCommissionAmount,
    totalChargedToBoss,
    guardPayout,
    platformRevenue,
    appliedBossOffer,
    appliedGuardOffer,
  };
}
