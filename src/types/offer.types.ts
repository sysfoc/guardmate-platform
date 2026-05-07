// ─────────────────────────────────────────────────────────────────────────────
// GuardMate — Offer & Promotion Type Definitions
// Phase 8: Commission, Subscription & Offers System
// ─────────────────────────────────────────────────────────────────────────────

import { OfferType, DiscountType, OfferEligibility } from './enums';

export interface IOffer {
  _id?: string;
  name: string;
  description: string;
  offerType: OfferType;
  discountType: DiscountType;
  discountValue: number | null;
  eligibility: OfferEligibility;
  newUserDaysThreshold: number;
  startDate: Date | string;
  endDate: Date | string;
  isActive: boolean;
  usageCount: number;
  createdBy: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  /** Set by GET /api/offers/active to indicate if the current user already acquired this offer */
  isAcquired?: boolean;
  /** Set by GET /api/offers/active to indicate if the acquired offer has already been consumed (used for a payment) */
  isConsumed?: boolean;
}

export interface CreateOfferPayload {
  name: string;
  description: string;
  offerType: OfferType;
  discountType: DiscountType;
  discountValue?: number | null;
  eligibility?: OfferEligibility;
  newUserDaysThreshold?: number;
  startDate: string;
  endDate: string;
}

export interface UpdateOfferPayload {
  name?: string;
  description?: string;
  offerType?: OfferType;
  discountType?: DiscountType;
  discountValue?: number | null;
  eligibility?: OfferEligibility;
  newUserDaysThreshold?: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface AppliedOffer {
  offerId: string;
  offerName: string;
  originalRate: number;
  appliedRate: number;
  savings: number;
}

export interface IUserOffer {
  _id?: string;
  userUid: string;
  offerId: string;
  acquiredAt: Date | string;
  usedAt?: Date | string | null; // set when discount is applied to a subscription payment
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface OfferFilters {
  isActive?: boolean;
  offerType?: OfferType;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}
