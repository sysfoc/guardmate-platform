import mongoose, { Document, Model, Schema } from 'mongoose';
import type { IShift } from '@/types/shift.types';

// ─── Document Type ────────────────────────────────────────────────────────────

export type ShiftDocument = IShift & Document;

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const CoordinatesSchema = new Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
}, { _id: false });

const LocationEntrySchema = new Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  timestamp: { type: Date, required: true },
}, { _id: false });

// ─── Schema ───────────────────────────────────────────────────────────────────

const ShiftSchema = new Schema<ShiftDocument>({
  jobId:     { type: String, required: true, index: true },
  shiftDate: { type: Date, required: true },
  guardUid:  { type: String, required: true, index: true },
  bossUid:   { type: String, required: true, index: true },

  jobTitle:       { type: String, required: true },
  jobLocation:    { type: String, required: true },
  jobCoordinates: { type: CoordinatesSchema, default: null },

  // Check-in
  checkInTime:        { type: Date, default: null },
  checkInCoordinates: { type: CoordinatesSchema, default: null },
  checkInDistance:     { type: Number, default: null },
  checkInVerified:    { type: Boolean, default: false },

  // Check-out
  checkOutTime:        { type: Date, default: null },
  checkOutCoordinates: { type: CoordinatesSchema, default: null },
  totalHoursWorked:    { type: Number, default: null },

  // Live Tracking
  locationHistory: {
    type: [LocationEntrySchema],
    default: [],
  },

  // Boss Approval
  isApprovedByBoss: { type: Boolean, default: false },
  approvedAt:       { type: Date, default: null },
  approvedBy:       { type: String, default: null },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Compound Indexes ─────────────────────────────────────────────────────────

// One shift per job per calendar day
ShiftSchema.index({ jobId: 1, shiftDate: 1 }, { unique: true });
ShiftSchema.index({ guardUid: 1, createdAt: -1 });
ShiftSchema.index({ bossUid: 1, createdAt: -1 });

// ─── HMR-safe Model ──────────────────────────────────────────────────────────

if (process.env.NODE_ENV !== 'production' && mongoose.models.Shift) {
  delete mongoose.models.Shift;
}

const Shift: Model<ShiftDocument> = mongoose.models.Shift || mongoose.model<ShiftDocument>('Shift', ShiftSchema);

export default Shift;
