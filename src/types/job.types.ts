// ─────────────────────────────────────────────────────────────────────────────
// GuardMate — Job & Bid Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

import { JobStatus, BidStatus, JobType, BudgetType } from './enums';
import type { Certification } from './user.types';

// ─── Coordinates ──────────────────────────────────────────────────────────────

export interface Coordinates {
  lat: number;
  lng: number;
}

/** Alias for Coordinates — explicit name for job context. */
export type JobCoordinates = Coordinates;

// ─── Location Search & Map Types ──────────────────────────────────────────────

export interface LocationSearchResult {
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  lat: number;
  lng: number;
}

export interface MapMarker {
  lat: number;
  lng: number;
  title: string;
  jobId: string;
  budget: number;
  budgetType: string;
  status: string;
  isUrgent: boolean;
  onClick: () => void;
}

// ─── Job Interface ────────────────────────────────────────────────────────────

export interface IJob {
  _id?: string;
  jobId: string;
  postedBy: string;
  companyName: string;
  companyLogo: string | null;

  title: string;
  description: string;
  jobType: JobType;
  status: JobStatus;

  // Location
  location: string;
  locationCity: string;
  locationState: string;
  locationCountry: string;
  locationPostalCode: string;
  coordinates: Coordinates | null;

  // Schedule
  startDate: string | Date;
  endDate: string | Date;
  startTime: string;
  endTime: string;
  isFlexibleTime: boolean;
  totalHours: number;

  // Budget
  budgetType: BudgetType;
  budgetAmount: number;
  budgetMax: number | null;

  // Requirements
  requiredSkills: string[];
  requiredLicenseType: string | null;
  requiresFirstAid: boolean;
  requiresWhiteCard: boolean;
  requiresChildrenCheck: boolean;
  minExperience: number;
  preferredLanguages: string[];

  // Staffing
  numberOfGuardsNeeded: number;
  applicationDeadline: string | Date;

  // Counters
  totalBids: number;
  viewCount: number;
  viewedBy?: string[];

  // Flags
  isUrgent: boolean;
  isFeatured: boolean;

  // Cancellation / Completion
  cancelReason: string | null;
  cancelledAt: string | Date | null;
  completedAt: string | Date | null;

  // Timestamps
  createdAt: string | Date;
  updatedAt: string | Date;
}

// ─── Bid Interface ────────────────────────────────────────────────────────────

export interface IBid {
  _id?: string;
  bidId: string;
  jobId: string;
  jobTitle: string;
  bossUid: string;
  guardUid: string;
  guardName: string;
  guardPhoto: string | null;
  guardRating: number;
  guardExperience: number;
  guardLicenseType: string | null;
  guardSkills?: string[];
  guardCertifications?: Certification[];
  guardReliabilityScore?: number;
  status: BidStatus;
  proposedRate: number;
  budgetType: BudgetType;
  totalProposed: number;
  coverMessage: string;
  availableFrom: string | Date;

  rejectionReason: string | null;
  acceptedAt: string | Date | null;
  rejectedAt: string | Date | null;
  withdrawnAt: string | Date | null;

  createdAt: string | Date;
  updatedAt: string | Date;
}

// ─── Filter Interfaces ───────────────────────────────────────────────────────

export interface JobFilters {
  status?: JobStatus;
  locationCity?: string;
  requiredSkills?: string[];
  budgetType?: BudgetType;
  budgetMin?: number;
  budgetMax?: number;
  startDate?: string;
  search?: string;
  sortBy?: 'newest' | 'budget_high' | 'budget_low' | 'deadline' | 'distance';
  page?: number;
  limit?: number;

  // Distance filtering
  userLat?: number;
  userLng?: number;
  maxDistance?: number;
}

export interface BidFilters {
  status?: BidStatus;
  page?: number;
  limit?: number;
}

// ─── Payloads ─────────────────────────────────────────────────────────────────

export interface CreateJobPayload {
  title: string;
  description: string;
  jobType: JobType;
  status?: JobStatus;

  location: string;
  locationCity: string;
  locationState: string;
  locationCountry: string;
  locationPostalCode: string;
  coordinates?: Coordinates | null;

  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isFlexibleTime: boolean;
  applicationDeadline: string;

  budgetType: BudgetType;
  budgetAmount: number;
  budgetMax?: number | null;

  requiredSkills: string[];
  requiredLicenseType?: string | null;
  requiresFirstAid: boolean;
  requiresWhiteCard: boolean;
  requiresChildrenCheck: boolean;
  minExperience: number;
  preferredLanguages: string[];

  numberOfGuardsNeeded: number;
  isUrgent: boolean;
}

export interface UpdateJobPayload extends Partial<CreateJobPayload> {
  isFeatured?: boolean;
}

export interface SubmitBidPayload {
  proposedRate: number;
  budgetType: BudgetType;
  totalProposed: number;
  coverMessage: string;
  availableFrom: string;
}

// ─── Joined Response Types ────────────────────────────────────────────────────

export interface JobWithBids extends IJob {
  bids?: IBid[];
}

export interface BidWithJob extends IBid {
  job?: IJob;
}
