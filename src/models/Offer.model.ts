import mongoose, { Document, Model, Schema } from 'mongoose';
import { OfferType, DiscountType, OfferEligibility } from '@/types/enums';
import type { IOffer } from '@/types/offer.types';

// ─────────────────────────────────────────────────────────────────────────────
// Offer Model — Tracks promotional offers and commission adjustments
// Phase 8: Commission, Subscription & Offers System
// ─────────────────────────────────────────────────────────────────────────────

export type OfferDocument = IOffer & Document;

const OfferSchema = new Schema<OfferDocument>(
  {
    name: {
      type: String,
      required: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },
    offerType: {
      type: String,
      enum: Object.values(OfferType),
      required: true,
    },
    discountType: {
      type: String,
      enum: Object.values(DiscountType),
      required: true,
    },
    discountValue: {
      type: Number,
      default: null,
    },
    eligibility: {
      type: String,
      enum: Object.values(OfferEligibility),
      default: OfferEligibility.ALL_USERS,
    },
    newUserDaysThreshold: {
      type: Number,
      default: 30,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Performance indexes
OfferSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

const Offer: Model<OfferDocument> =
  mongoose.models.Offer ||
  mongoose.model<OfferDocument>('Offer', OfferSchema);

export default Offer;
