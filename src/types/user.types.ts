// ─────────────────────────────────────────────────────────────────────────────
// GuardMate — User & Profile Types
// ─────────────────────────────────────────────────────────────────────────────

import {
  UserRole,
  UserStatus,
  AuthProvider,
  LicenseStatus,
  VerificationStatus,
  AdminLevel,
  CertificateStatus,
} from './enums';

export {
  UserRole,
  UserStatus,
  AuthProvider,
  LicenseStatus,
  VerificationStatus,
  AdminLevel,
  CertificateStatus,
};

// ─── Sub-models ───────────────────────────────────────────────────────────────

export interface LoginHistoryEntry {
  ip: string;
  device: string;
  userAgent: string;
  location: string | null;
  timestamp: string;
  success: boolean;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  jobAlerts: boolean;
  bidUpdates: boolean;
  paymentAlerts: boolean;
  systemAlerts: boolean;
}

export interface Certification {
  name: string;
  issuingBody: string;
  issueDate: string;
  expiryDate: string | null;
  documentUrl: string | null;
}

export interface AvailabilitySlot {
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek: number;
  /** 24-hour format: "HH:mm" */
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export type AdminPermission =
  | 'MANAGE_USERS'
  | 'MANAGE_JOBS'
  | 'MANAGE_PAYMENTS'
  | 'MANAGE_DISPUTES'
  | 'VIEW_ANALYTICS'
  | 'MANAGE_SETTINGS'
  | 'VERIFY_LICENSES'
  | 'MANAGE_ADMINS';

// ─── Base User ────────────────────────────────────────────────────────────────

export interface BaseUser {
  _id: string;
  /** Firebase UID */
  uid: string;
  email: string;
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
  phoneCountryCode: string | null;
  firstName: string;
  lastName: string;
  /** Computed/virtual field: `${firstName} ${lastName}` */
  fullName: string;
  role: UserRole;
  status: UserStatus;
  authProvider: AuthProvider;
  profilePhoto: string | null;
  bio: string | null;

  // ── Location ────────────────────────────────────────────────────────────────
  country: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  postalCode: string | null;
  timezone: string | null;

  // ── Security & Session Tracking ─────────────────────────────────────────────
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  lastLoginDevice: string | null;
  lastLoginUserAgent: string | null;
  registrationIp: string | null;
  registrationDevice: string | null;
  loginHistory: LoginHistoryEntry[];

  // ── Account Flags ───────────────────────────────────────────────────────────
  isTwoFactorEnabled: boolean;
  isProfileComplete: boolean;
  isOnboardingComplete: boolean;

  // ── Notification Preferences ─────────────────────────────────────────────────
  notificationPreferences: NotificationPreferences;

  // ── Timestamps ──────────────────────────────────────────────────────────────
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// ─── Boss Profile ─────────────────────────────────────────────────────────────

export interface BossProfile extends BaseUser {
  role: UserRole.BOSS;

  // ── Company Info ──────────────────────────────────────────────────────────
  companyName: string | null;
  companyRegistrationNumber: string | null;
  companyLicenseNumber: string | null;
  companyLicenseExpiry: string | null;
  companyLicenseDocument: string | null;
  companyLicenseStatus: LicenseStatus;
  companyAddress: string | null;
  companyCity: string | null;
  companyState: string | null;
  companyCountry: string | null;
  companyPostalCode: string | null;
  companyPhone: string | null;
  companyEmail: string | null;
  companyWebsite: string | null;
  companyLogo: string | null;
  companyDescription: string | null;
  industry: string | null;

  // ── Stats ─────────────────────────────────────────────────────────────────
  totalJobsPosted: number;
  activeJobsCount: number;
  completedJobsCount: number;
  cancelledJobsCount: number;
  totalSpent: number;
  averageRating: number;
  totalReviews: number;

  // ── Verification ──────────────────────────────────────────────────────────
  isCompanyVerified: boolean;
  companyVerifiedAt: string | null;
  verificationNotes: string | null;

  // ── Subscription ──────────────────────────────────────────────────────────
  subscriptionPlan: string | null;
  subscriptionExpiry: string | null;
}

// ─── Mate Profile ─────────────────────────────────────────────────────────────

export interface MateProfile extends BaseUser {
  role: UserRole.MATE;

  // ── Security License ──────────────────────────────────────────────────────
  licenseNumber: string | null;
  licenseType: string | null;
  licenseIssuingAuthority: string | null;
  licenseIssuedAt: string | null;
  licenseExpiry: string | null;
  licenseDocument: string | null;
  licenseStatus: LicenseStatus;
  licenseVerifiedAt: string | null;

  // ── ID Verification ───────────────────────────────────────────────────────
  /** e.g. 'passport', 'national_id', 'drivers_license' */
  idType: string | null;
  idNumber: string | null;
  idDocument: string | null;
  idExpiry: string | null;
  idVerificationStatus: VerificationStatus;
  idVerifiedAt: string | null;

  // ── Certificates & Licences ────────────────────────────────────────────────
  firstAidCertificate: string | null;
  firstAidCertificateExpiry: string | null;
  firstAidCertificateStatus: CertificateStatus | null;
  firstAidVerifiedAt: string | null;
  firstAidVerifiedBy: string | null;
  worksOnConstructionSite: boolean;
  constructionWhiteCard: string | null;
  constructionWhiteCardExpiry: string | null;
  constructionWhiteCardStatus: CertificateStatus | null;
  constructionWhiteCardVerifiedAt: string | null;
  worksWithChildren: boolean;
  workingWithChildrenCheck: string | null;
  workingWithChildrenCheckExpiry: string | null;
  workingWithChildrenCheckStatus: CertificateStatus | null;
  workingWithChildrenCheckVerifiedAt: string | null;

  // -- Background Check is moved to bottom to avoid duplication

  // ── Professional ──────────────────────────────────────────────────────────
  skills: string[];
  certifications: Certification[];
  hourlyRate: number | null;
  minimumHours: number | null;
  /** Years of experience */
  experience: number | null;
  languages: string[];

  // ── Availability ──────────────────────────────────────────────────────────
  isAvailable: boolean;
  availabilityCalendar: AvailabilitySlot[];
  /** Kilometers */
  preferredWorkRadius: number | null;
  preferredLocations: string[];

  // ── Stats ─────────────────────────────────────────────────────────────────
  totalJobsCompleted: number;
  totalJobsApplied: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
  completionRate: number;
  onTimeRate: number;

  // ── Boost / Feature ───────────────────────────────────────────────────────
  isFeatured: boolean;
  featuredUntil: string | null;

  // ── Background Check ──────────────────────────────────────────────────────
  backgroundCheckStatus: VerificationStatus;
  backgroundCheckDate: string | null;
  backgroundCheckDocument: string | null;
}

// ─── Admin Profile ────────────────────────────────────────────────────────────

export interface AdminProfile extends BaseUser {
  role: UserRole.ADMIN;
  adminLevel: AdminLevel;
  permissions: AdminPermission[];
  managedRegions: string[];
  assignedBy: string | null;
  lastActionAt: string | null;
}

// ─── Union Type ───────────────────────────────────────────────────────────────

export type UserProfile = BossProfile | MateProfile | AdminProfile;

// ─── Profile Update Payloads ──────────────────────────────────────────────────

export interface BaseProfileUpdatePayload {
  firstName?: string;
  lastName?: string;
  profilePhoto?: string | null;
  phone?: string | null;
  phoneCountryCode?: string | null;
  bio?: string | null;
  country?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  postalCode?: string | null;
  timezone?: string | null;
  notificationPreferences?: Partial<NotificationPreferences> | null;
  isOnboardingComplete?: boolean;
  isProfileComplete?: boolean;
}

export interface BossProfileUpdatePayload extends BaseProfileUpdatePayload {
  companyName?: string | null;
  companyRegistrationNumber?: string | null;
  companyLicenseNumber?: string | null;
  companyLicenseExpiry?: string | null;
  companyAddress?: string | null;
  companyCity?: string | null;
  companyState?: string | null;
  companyCountry?: string | null;
  companyPostalCode?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyWebsite?: string | null;
  companyDescription?: string | null;
  industry?: string | null;
  companyLicenseDocument?: string | null;
}

export interface MateProfileUpdatePayload extends BaseProfileUpdatePayload {
  skills?: string[] | null;
  hourlyRate?: number | null;
  minimumHours?: number | null;
  experience?: number | null;
  languages?: string[] | null;
  isAvailable?: boolean;
  preferredWorkRadius?: number | null;
  preferredLocations?: string[] | null;
  availabilityCalendar?: AvailabilitySlot[] | null;
  licenseNumber?: string | null;
  licenseType?: string | null;
  licenseIssuingAuthority?: string | null;
  licenseExpiry?: string | null;
  licenseDocument?: string | null;
  idType?: string | null;
  idNumber?: string | null;
  idDocument?: string | null;
  idExpiry?: string | null;
  certifications?: Certification[] | null;
  backgroundCheckDocument?: string | null;
  firstAidCertificate?: string | null;
  firstAidCertificateExpiry?: string | null;
  worksOnConstructionSite?: boolean;
  constructionWhiteCard?: string | null;
  constructionWhiteCardExpiry?: string | null;
  worksWithChildren?: boolean;
  workingWithChildrenCheck?: string | null;
  workingWithChildrenCheckExpiry?: string | null;
}

export type ProfileUpdatePayload = BossProfileUpdatePayload | MateProfileUpdatePayload;
