import { DisputeReason, DisputeStatus, AdminDecision } from './enums';

export interface IDisputeEvidence {
  fileUrl: string;
  fileName: string;
  fileType: string;
  uploadedAt: Date;
}

export interface IDispute {
  _id?: string;
  jobId: string;
  paymentId: string;
  
  raisedByUid: string;
  raisedByRole: 'BOSS' | 'MATE';
  againstUid: string;
  againstRole: 'BOSS' | 'MATE';
  
  jobTitle: string;
  bossUid: string;
  guardUid: string;
  
  reason: DisputeReason;
  description: string;
  evidence: IDisputeEvidence[];
  
  status: DisputeStatus;
  
  adminDecision: AdminDecision | null;
  adminDecisionAmount: number | null;
  adminNotes: string | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  
  respondedByUid: string | null;
  respondedAt: Date | null;
  responseDescription: string | null;
  responseEvidence: IDisputeEvidence[];
  
  disputeDeadline: Date;
  autoReleaseDeadline: Date | null;
  autoReleaseTriggered: boolean;
  deadlineWarningSentAt: Date | null;
  
  chargebackRaised: boolean;
  chargebackId: string | null;
  
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CreateDisputePayload {
  jobId: string;
  reason: DisputeReason;
  description: string;
  evidence?: IDisputeEvidence[];
}

export interface RespondToDisputePayload {
  description: string;
  evidence?: IDisputeEvidence[];
}

export interface AdminResolveDisputePayload {
  decision: AdminDecision;
  adminNotes: string;
  adminDecisionAmount?: number;
}

export interface DisputeSummary {
  total: number;
  open: number;
  underReview: number;
  resolved: number;
  closed: number;
  averageResolutionHours: number;
}
