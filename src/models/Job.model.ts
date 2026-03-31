import mongoose, { Document, Model, Schema } from 'mongoose';
import { JobStatus, JobType, BudgetType, HiringStatus } from '@/types/enums';
import type { IJob } from '@/types/job.types';

// ─── Document Type ────────────────────────────────────────────────────────────

export type JobDocument = IJob & Document;

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const CoordinatesSchema = new Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
}, { _id: false });

const ShiftSlotSchema = new Schema({
  slotNumber:       { type: Number, required: true },
  startTime:        { type: String, required: true },
  endTime:          { type: String, required: true },
  isOvernight:      { type: Boolean, default: false },
  actualEndDate:    { type: String, required: true },
  durationHours:    { type: Number, required: true },
  assignedGuardUid: { type: String, default: null },
}, { _id: false });

const ShiftScheduleDaySchema = new Schema({
  date:  { type: String, required: true },
  slots: { type: [ShiftSlotSchema], default: [] },
}, { _id: false });

const AcceptedGuardSchema = new Schema({
  guardUid:   { type: String, required: true },
  guardName:  { type: String, required: true },
  guardPhoto: { type: String, default: null },
  bidId:      { type: String, required: true },
  acceptedAt: { type: Date, required: true },
}, { _id: false });

// ─── Schema ───────────────────────────────────────────────────────────────────

const JobSchema = new Schema<JobDocument>({
  jobId:        { type: String, required: true, unique: true, index: true },
  postedBy:     { type: String, required: true, index: true },
  companyName:  { type: String, required: true },
  companyLogo:  { type: String, default: null },

  title:       { type: String, required: true, trim: true },
  description: { type: String, required: true, maxlength: 2000 },
  jobType:     { type: String, enum: Object.values(JobType), required: true },
  status:      { type: String, enum: Object.values(JobStatus), default: JobStatus.OPEN, index: true },

  // Location
  location:           { type: String, required: true },
  locationCity:       { type: String, required: true, index: true },
  locationState:      { type: String, default: '' },
  locationCountry:    { type: String, default: '' },
  locationPostalCode: { type: String, default: '' },
  coordinates:        { type: CoordinatesSchema, default: null },

  // Schedule
  startDate:      { type: Date, required: true, index: true },
  endDate:        { type: Date, required: true },
  startTime:      { type: String, default: null },
  endTime:        { type: String, default: null },
  isFlexibleTime: { type: Boolean, default: false },
  totalHours:     { type: Number, default: 0 },

  // Shift Schedule (multi-day system)
  shiftSchedule:      { type: [ShiftScheduleDaySchema], default: [] },
  totalScheduledHours: { type: Number, default: 0 },

  // Budget
  budgetType:   { type: String, enum: Object.values(BudgetType), required: true },
  budgetAmount: { type: Number, required: true },
  budgetMax:    { type: Number, default: null },

  // Requirements
  requiredSkills:        { type: [String], default: [], index: true },
  requiredLicenseType:   { type: String, default: null },
  requiresFirstAid:      { type: Boolean, default: false },
  requiresWhiteCard:     { type: Boolean, default: false },
  requiresChildrenCheck: { type: Boolean, default: false },
  minExperience:         { type: Number, default: 0 },
  preferredLanguages:    { type: [String], default: [] },

  // Staffing
  numberOfGuardsNeeded: { type: Number, default: 1 },
  applicationDeadline:  { type: Date, required: true },
  hiringStatus:         { type: String, enum: Object.values(HiringStatus), default: HiringStatus.OPEN },
  acceptedGuards:       { type: [AcceptedGuardSchema], default: [] },
  isShiftAssigned:      { type: Boolean, default: false },

  // Counters
  totalBids: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  viewedBy:  { type: [String], default: [] },

  // Flags
  isUrgent:   { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },

  // Cancellation / Completion
  cancelReason: { type: String, default: null },
  cancelledAt:  { type: Date, default: null },
  completedAt:  { type: Date, default: null },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Compound Indexes ─────────────────────────────────────────────────────────

JobSchema.index({ status: 1, applicationDeadline: 1 });
JobSchema.index({ postedBy: 1, status: 1 });
JobSchema.index({ locationCity: 1, status: 1 });

// ─── HMR-safe Model ──────────────────────────────────────────────────────────

if (process.env.NODE_ENV !== 'production' && mongoose.models.Job) {
  delete mongoose.models.Job;
}

const Job: Model<JobDocument> = mongoose.models.Job || mongoose.model<JobDocument>('Job', JobSchema);

export default Job;
