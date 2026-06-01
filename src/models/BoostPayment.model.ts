import mongoose, { Document, Model, Schema } from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// BoostPayment Model — Tracks one-time Stripe payments for Guard profile boosts
// ─────────────────────────────────────────────────────────────────────────────

export type BoostPaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface IBoostPayment {
  _id?: string;
  guardUid: string;
  amount: number;
  currency: string;
  durationDays: number;
  boostedUntil: Date | null;
  status: BoostPaymentStatus;
  stripePaymentIntentId: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export type BoostPaymentDocument = IBoostPayment & Document;

const BoostPaymentSchema = new Schema<BoostPaymentDocument>(
  {
    guardUid:               { type: String, required: true, index: true },
    amount:                 { type: Number, required: true },
    currency:               { type: String, default: 'AUD' },
    durationDays:           { type: Number, required: true },
    boostedUntil:           { type: Date, default: null },
    status:                 { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED'], default: 'PENDING', index: true },
    stripePaymentIntentId:  { type: String, default: null },
  },
  { timestamps: true }
);

BoostPaymentSchema.index({ guardUid: 1, status: 1 });

if (process.env.NODE_ENV !== 'production' && mongoose.models.BoostPayment) {
  delete mongoose.models.BoostPayment;
}

const BoostPayment: Model<BoostPaymentDocument> =
  mongoose.models.BoostPayment ||
  mongoose.model<BoostPaymentDocument>('BoostPayment', BoostPaymentSchema);

export default BoostPayment;
