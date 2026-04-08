import mongoose, { Document, Model, Schema } from 'mongoose';
import type { IGuardWallet } from '@/types/payment.types';

// ─────────────────────────────────────────────────────────────────────────────
// GuardWallet Model — Manages guard balances and payout methods
// Phase 6: Payments & Escrow System
// ─────────────────────────────────────────────────────────────────────────────

export type GuardWalletDocument = IGuardWallet & Document;

const GuardWalletSchema = new Schema<GuardWalletDocument>(
  {
    guardUid: { type: String, required: true, unique: true, index: true },

    // ─── Balances ───────────────────────────────────────────────────────────
    availableBalance: { type: Number, default: 0, min: 0 },
    pendingBalance:   { type: Number, default: 0, min: 0 },
    totalEarned:      { type: Number, default: 0, min: 0 },
    totalWithdrawn:   { type: Number, default: 0, min: 0 },

    // ─── Stripe Connect ─────────────────────────────────────────────────────
    // TODO: Future AES-256 encryption for stripeAccountId
    stripeAccountId:       { type: String, default: null },
    stripeAccountVerified: { type: Boolean, default: false },

    // ─── PayPal ─────────────────────────────────────────────────────────────
    paypalEmail:    { type: String, default: null },
    paypalVerified: { type: Boolean, default: false },

    currency:     { type: String, default: 'AUD' },
    lastPayoutAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

const GuardWallet: Model<GuardWalletDocument> =
  mongoose.models.GuardWallet || mongoose.model<GuardWalletDocument>('GuardWallet', GuardWalletSchema);

export default GuardWallet;
