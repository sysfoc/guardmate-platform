import mongoose, { Document, Model, Schema } from 'mongoose';
import { IncidentType, IncidentSeverity } from '@/types/enums';
import type { IIncidentReport } from '@/types/shift.types';

// ─── Document Type ────────────────────────────────────────────────────────────

export type IncidentReportDocument = IIncidentReport & Document;

// ─── Schema ───────────────────────────────────────────────────────────────────

const IncidentReportSchema = new Schema<IncidentReportDocument>({
  jobId:     { type: String, required: true, index: true },
  shiftId:   { type: String, required: true },
  guardUid:  { type: String, required: true, index: true },
  guardName: { type: String, required: true },
  bossUid:   { type: String, required: true, index: true },
  jobTitle:  { type: String, required: true },

  incidentType: {
    type: String,
    enum: Object.values(IncidentType),
    required: true,
  },
  severity: {
    type: String,
    enum: Object.values(IncidentSeverity),
    required: true,
  },
  description: { type: String, required: true, maxlength: 2000 },
  location:    { type: String, default: null },

  document: { type: String, default: null },
  photos:   { type: [String], default: [] },

  isReviewedByBoss:  { type: Boolean, default: false },
  isReviewedByAdmin: { type: Boolean, default: false },
  bossReviewedAt:    { type: Date, default: null },
  adminReviewedAt:   { type: Date, default: null },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Compound Indexes ─────────────────────────────────────────────────────────

IncidentReportSchema.index({ jobId: 1, createdAt: -1 });
IncidentReportSchema.index({ guardUid: 1, createdAt: -1 });
IncidentReportSchema.index({ severity: 1 });

// ─── HMR-safe Model ──────────────────────────────────────────────────────────

if (process.env.NODE_ENV !== 'production' && mongoose.models.IncidentReport) {
  delete mongoose.models.IncidentReport;
}

const IncidentReport: Model<IncidentReportDocument> =
  mongoose.models.IncidentReport || mongoose.model<IncidentReportDocument>('IncidentReport', IncidentReportSchema);

export default IncidentReport;
