import mongoose, { Document, Model, Schema } from 'mongoose';
import type { IUserOffer } from '@/types/offer.types';

// ─────────────────────────────────────────────────────────────────────────────
// UserOffer Model — Tracks which Boss users have manually acquired offers
// Phase 8: Commission, Subscription & Offers System
// ─────────────────────────────────────────────────────────────────────────────

export type UserOfferDocument = IUserOffer & Document;

const UserOfferSchema = new Schema<UserOfferDocument>(
  {
    userUid: {
      type: String,
      required: true,
      index: true,
    },
    offerId: {
      type: String,
      required: true,
      index: true,
    },
    acquiredAt: {
      type: Date,
      default: Date.now,
    },
    usedAt: {
      type: Date,
      default: null, // set when offer discount is applied to a subscription payment
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index: one user can only acquire the same offer once
UserOfferSchema.index({ userUid: 1, offerId: 1 }, { unique: true });

const UserOffer: Model<UserOfferDocument> =
  mongoose.models.UserOffer ||
  mongoose.model<UserOfferDocument>('UserOffer', UserOfferSchema);

export default UserOffer;
