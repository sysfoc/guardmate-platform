import mongoose, { Document, Model, Schema } from 'mongoose';
import { DisputeReason, DisputeStatus, AdminDecision } from '@/types/enums';
import type { IDispute } from '@/types/dispute.types';

export type DisputeDocument = IDispute & Document;

const EvidenceSchema = new Schema({
  fileUrl:    { type: String, required: true },
  fileName:   { type: String, required: true },
  fileType:   { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const DisputeSchema = new Schema<DisputeDocument>(
  {
    jobId:        { type: String, required: true, index: true },
    paymentId:    { type: String, required: true },
    
    raisedByUid:  { type: String, required: true, index: true },
    raisedByRole: { type: String, enum: ['BOSS', 'MATE'], required: true },
    
    againstUid:   { type: String, required: true, index: true },
    againstRole:  { type: String, enum: ['BOSS', 'MATE'], required: true },
    
    jobTitle:     { type: String, required: true },
    bossUid:      { type: String, required: true },
    guardUid:     { type: String, required: true },
    
    reason: { 
      type: String, 
      enum: Object.values(DisputeReason), 
      required: true 
    },
    description: { 
      type: String, 
      required: true, 
      minlength: 50, 
      maxlength: 2000 
    },
    evidence: {
      type: [EvidenceSchema],
      default: [],
      validate: [
        (val: any[]) => val.length <= 5, 
        'evidence cannot exceed 5 files'
      ]
    },
    
    status: {
      type: String,
      enum: Object.values(DisputeStatus),
      default: DisputeStatus.OPEN,
      index: true
    },
    
    adminDecision:       { type: String, enum: [...Object.values(AdminDecision), null], default: null },
    adminDecisionAmount: { type: Number, default: null },
    adminNotes:          { type: String, default: null },
    resolvedBy:          { type: String, default: null },
    resolvedAt:          { type: Date, default: null },
    
    respondedByUid:      { type: String, default: null },
    respondedAt:         { type: Date, default: null },
    responseDescription: { type: String, default: null },
    responseEvidence: {
      type: [EvidenceSchema],
      default: [],
      validate: [
        (val: any[]) => val.length <= 5, 
        'responseEvidence cannot exceed 5 files'
      ]
    },
    
    disputeDeadline:       { type: Date, required: true },
    autoReleaseDeadline:   { type: Date, default: null },
    autoReleaseTriggered:  { type: Boolean, default: false },
    deadlineWarningSentAt: { type: Date, default: null },
    
    chargebackRaised: { type: Boolean, default: false },
    chargebackId:     { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate dispute per job per user per target — supports multi-guard jobs
DisputeSchema.index({ jobId: 1, raisedByUid: 1, againstUid: 1 }, { unique: true });

// Optimize query for active disputes 
DisputeSchema.index({ status: 1, disputeDeadline: 1 });

const Dispute: Model<DisputeDocument> = mongoose.models.Dispute || mongoose.model<DisputeDocument>('Dispute', DisputeSchema);

export default Dispute;
