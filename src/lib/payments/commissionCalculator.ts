// ─────────────────────────────────────────────────────────────────────────────
// Centralized Commission Calculator
// Phase 8: Commission, Subscription & Offers System
//
// This is the ONLY place commission is calculated in the entire codebase.
// All payment creation routes must call this function.
// ─────────────────────────────────────────────────────────────────────────────

import { DiscountType } from '@/types/enums';
import type { IPlatformSettings } from '@/types/settings.types';

export interface CommissionInput {
  jobBudget: number;
  bossUid: string;
  guardUid: string;
  platformSettings: IPlatformSettings;
}

export interface CommissionResult {
  bossCommissionRate: number;
  guardCommissionRate: number;
  bossCommissionAmount: number;
  guardCommissionAmount: number;
  totalChargedToBoss: number;
  guardPayout: number;
  platformRevenue: number;
}

/**
 * Calculate the effective commission rate after applying a discount.
 * (Kept for potential future use, currently unused in job commission flow)
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
      return Math.round(baseRate * (1 - (discountValue ?? 0) / 100) * 100) / 100;
    case DiscountType.FIXED_RATE:
      return Math.max(0, discountValue ?? baseRate);
    default:
      return baseRate;
  }
}

/**
 * Round to 2 decimal places for currency precision.
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate complete commission breakdown.
 * Offers (subscription discounts) do NOT affect job commission.
 * Only raw platform commission rates apply to job payments.
 */
export async function calculateCommission(
  input: CommissionInput
): Promise<CommissionResult> {
  const { jobBudget, platformSettings } = input;

  const baseBossRate = platformSettings.platformCommissionBoss ?? 0;
  const baseGuardRate = platformSettings.platformCommissionGuard ?? 0;

  // Calculate amounts — no offer discounts on job commission
  const bossCommissionAmount = round2(jobBudget * (baseBossRate / 100));
  const guardCommissionAmount = round2(jobBudget * (baseGuardRate / 100));
  const totalChargedToBoss = round2(jobBudget + bossCommissionAmount);
  const guardPayout = round2(jobBudget - guardCommissionAmount);
  const platformRevenue = round2(bossCommissionAmount + guardCommissionAmount);

  return {
    bossCommissionRate: baseBossRate,
    guardCommissionRate: baseGuardRate,
    bossCommissionAmount,
    guardCommissionAmount,
    totalChargedToBoss,
    guardPayout,
    platformRevenue,
  };
}
