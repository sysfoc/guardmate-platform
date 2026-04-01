import mongoose, { Document, Model, Schema } from 'mongoose';
import { BidStatus, BudgetType } from '@/types/enums';
import type { IBid } from '@/types/job.types';

// ─── Document Type ────────────────────────────────────────────────────────────

export type BidDocument = IBid & Document;

// ─── Schema ───────────────────────────────────────────────────────────────────

const BidSchema = new Schema<BidDocument>({
  bidId:    { type: String, required: true, unique: true, index: true },
  jobId:    { type: String, required: true, index: true },
  jobTitle: { type: String, required: true },
  bossUid:  { type: String, required: true, index: true },

  guardUid:         { type: String, required: true, index: true },
  guardName:        { type: String, required: true },
  guardPhoto:       { type: String, default: null },
  guardRating:      { type: Number, default: 0 },
  guardExperience:  { type: Number, default: 0 },
  guardLicenseType: { type: String, default: null },
  guardABNVerified:   { type: Boolean, default: false },

  status:        { type: String, enum: Object.values(BidStatus), default: BidStatus.PENDING, index: true },
  proposedRate:  { type: Number, required: true },
  budgetType:    { type: String, enum: Object.values(BudgetType), required: true },
  totalProposed: { type: Number, required: true },
  coverMessage:  { type: String, required: true, maxlength: 1000 },
  availableFrom: { type: Date, required: true },

  rejectionReason: { type: String, default: null },
  acceptedAt:      { type: Date, default: null },
  rejectedAt:      { type: Date, default: null },
  withdrawnAt:     { type: Date, default: null },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Compound Indexes ─────────────────────────────────────────────────────────

BidSchema.index({ jobId: 1, guardUid: 1 }, { unique: true });
BidSchema.index({ guardUid: 1, status: 1 });
BidSchema.index({ bossUid: 1, status: 1 });

// ─── HMR-safe Model ──────────────────────────────────────────────────────────

if (process.env.NODE_ENV !== 'production' && mongoose.models.Bid) {
  delete mongoose.models.Bid;
}

const Bid: Model<BidDocument> = mongoose.models.Bid || mongoose.model<BidDocument>('Bid', BidSchema);

export default Bid;
