// ─────────────────────────────────────────────────────────────────────────────
// GuardMate — Subscription Type Definitions
// Phase 8: Commission, Subscription & Offers System
// ─────────────────────────────────────────────────────────────────────────────

import { SubscriptionStatus } from './enums';

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
}

export interface SubscriptionFilters {
  status?: SubscriptionStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}
