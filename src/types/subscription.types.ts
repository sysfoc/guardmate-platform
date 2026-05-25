// ─────────────────────────────────────────────────────────────────────────────
// GuardMate — Subscription Type Definitions
// Phase 8: Commission, Subscription & Offers System
// ─────────────────────────────────────────────────────────────────────────────

import { SubscriptionStatus, SubscriptionTier } from './enums';
import type { IActivePlanFeatures } from './subscriptionPlan.types';

export interface IBossSubscription {
  _id?: string;
  bossUid: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date | string | null;
  currentPeriodEnd: Date | string | null;
  amount: number | null;
  currency: string;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  stripePriceId: string | null;
  paypalSubscriptionId: string | null;
  paypalOrderId: string | null;
  cancelledAt: Date | string | null;
  lastPaymentAt: Date | string | null;
  lastPaymentAmount: number | null;
  failedPaymentAt: Date | string | null;
  failureReason: string | null;
  expirySentAt: Date | string | null;
  /** The offer (if any) that will be applied to the upcoming subscription payment */
  appliedOfferId: string | null;
  /** The subscription tier the boss is on (Starter/Professional/Enterprise). */
  planTier: SubscriptionTier | null;
  /** Tier to switch to at the next billing cycle (downgrade deferred). Null if none scheduled. */
  pendingDowngradeTier: SubscriptionTier | null;
  /** When the pending downgrade was scheduled. */
  pendingDowngradeAt: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ISubscriptionStatus {
  isSubscribed: boolean;
  status: string;
  expiresAt: Date | string | null;
  daysRemaining: number | null;
  amount: number;
  currency: string;
  /** Active plan tier, null if not subscribed or subscription not required. */
  planTier: SubscriptionTier | null;
  /** Full feature set for the active plan, null if no active plan. */
  planFeatures: IActivePlanFeatures | null;
  /** Tier scheduled to take effect at the next billing cycle (downgrade). Null if none. */
  pendingDowngradeTier: SubscriptionTier | null;
}

export interface SubscriptionFilters {
  status?: SubscriptionStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}
