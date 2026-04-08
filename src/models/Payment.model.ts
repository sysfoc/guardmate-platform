import mongoose, { Document, Model, Schema } from 'mongoose';
import { PaymentMethod, EscrowPaymentStatus } from '@/types/enums';
import type { IPayment } from '@/types/payment.types';

// ─────────────────────────────────────────────────────────────────────────────
// Payment Model — Tracks escrow, commissions, and transaction lifecycle
// Phase 6: Payments & Escrow System
// ─────────────────────────────────────────────────────────────────────────────

export type PaymentDocument = IPayment & Document;

const PaymentSchema = new Schema<PaymentDocument>(
  {
    jobId:   { type: String, required: true, index: true },
    bidId:   { type: String, required: true },
    bossUid: { type: String, required: true, index: true },
    guardUid: { type: String, required: true, index: true },
    jobTitle: { type: String, required: true },

    // ─── Amounts ────────────────────────────────────────────────────────────
    jobBudget:             { type: Number, required: true },
    bossCommissionRate:    { type: Number, required: true },
    guardCommissionRate:   { type: Number, required: true },
    bossCommissionAmount:  { type: Number, required: true },
    guardCommissionAmount: { type: Number, required: true },
    totalChargedToBoss:    { type: Number, required: true },
    guardPayout:           { type: Number, required: true },
    platformRevenue:       { type: Number, required: true },
    currency:              { type: String, default: 'AUD' },

    // ─── Method & Status ────────────────────────────────────────────────────
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(EscrowPaymentStatus),
      default: EscrowPaymentStatus.PENDING,
      index: true,
    },

    // ─── Stripe-specific ────────────────────────────────────────────────────
    stripePaymentIntentId: { type: String, default: null },
    stripeTransferId:      { type: String, default: null },

    // ─── PayPal-specific ────────────────────────────────────────────────────
    paypalOrderId:   { type: String, default: null },
    paypalCaptureId: { type: String, default: null },

    // ─── Timestamps ─────────────────────────────────────────────────────────
    heldAt:       { type: Date, default: null },
    releasedAt:   { type: Date, default: null },
    refundedAt:   { type: Date, default: null },
    refundReason: { type: String, default: null },
    disputeId:    { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate payment per job per boss
PaymentSchema.index({ jobId: 1, bossUid: 1 }, { unique: true });

// Performance indexes for admin revenue queries
PaymentSchema.index({ paymentStatus: 1, createdAt: -1 });
PaymentSchema.index({ paymentMethod: 1, paymentStatus: 1 });

const Payment: Model<PaymentDocument> =
  mongoose.models.Payment || mongoose.model<PaymentDocument>('Payment', PaymentSchema);

export default Payment;
