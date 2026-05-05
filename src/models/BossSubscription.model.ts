import mongoose, { Document, Model, Schema } from 'mongoose';
import { SubscriptionStatus } from '@/types/enums';
import type { IBossSubscription } from '@/types/subscription.types';

// ─────────────────────────────────────────────────────────────────────────────
// BossSubscription Model — Tracks Boss monthly subscription lifecycle
// Phase 8: Commission, Subscription & Offers System
// ─────────────────────────────────────────────────────────────────────────────

export type BossSubscriptionDocument = IBossSubscription & Document;

const BossSubscriptionSchema = new Schema<BossSubscriptionDocument>(
  {
    bossUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(SubscriptionStatus),
      default: SubscriptionStatus.LAPSED,
      index: true,
    },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd:   { type: Date, default: null },
    amount:             { type: Number, default: null },
    currency:           { type: String, default: 'AUD' },

    // ─── Stripe ──────────────────────────────────────────────────────────────
    stripeSubscriptionId: { type: String, default: null },
    stripeCustomerId:     { type: String, default: null },
    stripePriceId:        { type: String, default: null },

    // ─── PayPal ──────────────────────────────────────────────────────────────
    paypalSubscriptionId: { type: String, default: null },
    paypalOrderId:        { type: String, default: null },

    // ─── Cancellation ────────────────────────────────────────────────
    cancelledAt:  { type: Date, default: null },

    // ─── Payment Tracking ────────────────────────────────────────────────────
    lastPaymentAt:     { type: Date, default: null },
    lastPaymentAmount: { type: Number, default: null },
    failedPaymentAt:   { type: Date, default: null },
    failureReason:     { type: String, default: null },

    // ─── Expiry Email Deduplication ──────────────────────────────────────────
    expirySentAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// Performance indexes
BossSubscriptionSchema.index({ bossUid: 1, status: 1 });

const BossSubscription: Model<BossSubscriptionDocument> =
  mongoose.models.BossSubscription ||
  mongoose.model<BossSubscriptionDocument>('BossSubscription', BossSubscriptionSchema);

export default BossSubscription;
