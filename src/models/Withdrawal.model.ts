import mongoose, { Document, Model, Schema } from 'mongoose';
import { PaymentMethod, WithdrawalStatus } from '@/types/enums';
import type { IWithdrawal } from '@/types/payment.types';

// ─────────────────────────────────────────────────────────────────────────────
// Withdrawal Model — Tracks guard withdrawal requests
// Phase 6: Payments & Escrow System
// ─────────────────────────────────────────────────────────────────────────────

export type WithdrawalDocument = IWithdrawal & Document;

const WithdrawalSchema = new Schema<WithdrawalDocument>(
  {
    guardUid: { type: String, required: true, index: true },
    amount:   { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'AUD' },

    withdrawalMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(WithdrawalStatus),
      default: WithdrawalStatus.PROCESSING,
      index: true,
    },

    // ─── Payout IDs ─────────────────────────────────────────────────────────
    stripePayoutId: { type: String, default: null },
    paypalPayoutId: { type: String, default: null },
    failureReason:  { type: String, default: null },

    // ─── Timestamps ─────────────────────────────────────────────────────────
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// Performance index for guard withdrawal history
WithdrawalSchema.index({ guardUid: 1, createdAt: -1 });

const Withdrawal: Model<WithdrawalDocument> =
  mongoose.models.Withdrawal || mongoose.model<WithdrawalDocument>('Withdrawal', WithdrawalSchema);

export default Withdrawal;
