import mongoose, { Document, Model, Schema } from 'mongoose';
import {
  UserRole,
  UserStatus,
  AuthProvider,
  LicenseStatus,
  VerificationStatus,
  AdminLevel,
  BaseUser,
  BossProfile,
  MateProfile,
  AdminProfile
} from '@/types/user.types';

// Export an all-encompassing union interface for Mongoose interactions
export type IUser = BaseUser & 
  Partial<Omit<BossProfile, keyof BaseUser>> & 
  Partial<Omit<MateProfile, keyof BaseUser>> & 
  Partial<Omit<AdminProfile, keyof BaseUser>>;
  
export type UserDocument = IUser & Document;

const NotificationPreferencesSchema = new Schema({
  email: { type: Boolean, default: true },
  push: { type: Boolean, default: true },
  sms: { type: Boolean, default: false },
  jobAlerts: { type: Boolean, default: true },
  bidUpdates: { type: Boolean, default: true },
  paymentAlerts: { type: Boolean, default: true },
  systemAlerts: { type: Boolean, default: true },
}, { _id: false });

const LoginHistorySchema = new Schema({
  ip: { type: String },
  device: { type: String },
  userAgent: { type: String },
  location: { type: String, default: null },
  timestamp: { type: Date, default: Date.now },
  success: { type: Boolean, required: true },
}, { _id: false });

const CertificationSchema = new Schema({
  name: { type: String, required: true },
  issuingBody: { type: String, required: true },
  issueDate: { type: String, required: true },
  expiryDate: { type: String, default: null },
  documentUrl: { type: String, default: null },
}, { _id: false });

const AvailabilitySlotSchema = new Schema({
  dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  isAvailable: { type: Boolean, default: true },
}, { _id: false });

const UserSchema = new Schema<UserDocument>({
  // ── Identity ─────────────────────────────────────────────────────────────
  uid: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  emailVerified: { type: Boolean, default: false },
  phone: { type: String, default: null, sparse: true },
  phoneVerified: { type: Boolean, default: false },
  phoneCountryCode: { type: String, default: null },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  role: { type: String, enum: Object.values(UserRole), required: true, index: true },
  status: { type: String, enum: Object.values(UserStatus), default: UserStatus.PENDING, index: true },
  authProvider: { type: String, enum: Object.values(AuthProvider), required: true },
  profilePhoto: { type: String, default: null },
  bio: { type: String, default: null, maxlength: 1000 },

  // ── Location ─────────────────────────────────────────────────────────────
  country: { type: String, default: null },
  city: { type: String, default: null },
  state: { type: String, default: null },
  timezone: { type: String, default: null },

  // ── Security Tracking ────────────────────────────────────────────────────
  lastLoginAt: { type: Date, default: null },
  lastLoginIp: { type: String, default: null },
  lastLoginDevice: { type: String, default: null },
  lastLoginUserAgent: { type: String, default: null },
  registrationIp: { type: String, default: null },
  registrationDevice: { type: String, default: null },
  loginHistory: [LoginHistorySchema],

  // ── Account Flags ────────────────────────────────────────────────────────
  isTwoFactorEnabled: { type: Boolean, default: false },
  isProfileComplete: { type: Boolean, default: false },
  isOnboardingComplete: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },

  // ── Notification Preferences ──────────────────────────────────────────────
  notificationPreferences: { type: NotificationPreferencesSchema, default: () => ({}) },

  // ── Boss Fields (Optional) ────────────────────────────────────────────────
  companyName: { type: String, default: null },
  companyRegistrationNumber: { type: String, default: null },
  companyLicenseNumber: { type: String, default: null },
  companyLicenseExpiry: { type: Date, default: null },
  companyLicenseDocument: { type: String, default: null },
  companyLicenseStatus: { type: String, enum: Object.values(LicenseStatus), default: LicenseStatus.PENDING_REVIEW },
  companyAddress: { type: String, default: null },
  companyCity: { type: String, default: null },
  companyState: { type: String, default: null },
  companyCountry: { type: String, default: null },
  companyPostalCode: { type: String, default: null },
  companyPhone: { type: String, default: null },
  companyEmail: { type: String, default: null },
  companyWebsite: { type: String, default: null },
  companyLogo: { type: String, default: null },
  companyDescription: { type: String, default: null },
  industry: { type: String, default: null },
  totalJobsPosted: { type: Number, default: 0 },
  activeJobsCount: { type: Number, default: 0 },
  completedJobsCount: { type: Number, default: 0 },
  cancelledJobsCount: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  isCompanyVerified: { type: Boolean, default: false },
  companyVerifiedAt: { type: Date, default: null },
  verificationNotes: { type: String, default: null },
  subscriptionPlan: { type: String, default: null },
  subscriptionExpiry: { type: Date, default: null },

  // ── Mate Fields (Optional) ────────────────────────────────────────────────
  licenseNumber: { type: String, default: null },
  licenseType: { type: String, default: null },
  licenseIssuingAuthority: { type: String, default: null },
  licenseIssuedAt: { type: Date, default: null },
  licenseExpiry: { type: Date, default: null },
  licenseDocument: { type: String, default: null },
  licenseStatus: { type: String, enum: Object.values(LicenseStatus), default: LicenseStatus.PENDING_REVIEW },
  licenseVerifiedAt: { type: Date, default: null },
  idType: { type: String, default: null },
  idNumber: { type: String, default: null },
  idDocument: { type: String, default: null },
  idVerificationStatus: { type: String, enum: Object.values(VerificationStatus), default: VerificationStatus.UNVERIFIED },
  idVerifiedAt: { type: Date, default: null },
  skills: [{ type: String }],
  certifications: { type: [CertificationSchema], default: [] },
  hourlyRate: { type: Number, default: null },
  minimumHours: { type: Number, default: null },
  experience: { type: Number, default: null },
  languages: [{ type: String }],
  isAvailable: { type: Boolean, default: false },
  availabilityCalendar: { type: [AvailabilitySlotSchema], default: [] },
  preferredWorkRadius: { type: Number, default: null },
  preferredLocations: [{ type: String }],
  totalJobsCompleted: { type: Number, default: 0 },
  totalJobsApplied: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  completionRate: { type: Number, default: 0 },
  onTimeRate: { type: Number, default: 0 },
  isFeatured: { type: Boolean, default: false },
  featuredUntil: { type: Date, default: null },
  backgroundCheckStatus: { type: String, enum: Object.values(VerificationStatus), default: VerificationStatus.UNVERIFIED },
  backgroundCheckDate: { type: Date, default: null },

  // ── Admin Fields (Optional) ───────────────────────────────────────────────
  adminLevel: { type: String, enum: Object.values(AdminLevel), default: null },
  permissions: [{ type: String }],
  managedRegions: [{ type: String }],
  assignedBy: { type: String, default: null },
  lastActionAt: { type: Date, default: null },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ── Virtuals ─────────────────────────────────────────────────────────────
UserSchema.virtual('fullName').get(function (this: UserDocument) {
  return `${this.firstName} ${this.lastName}`;
});

// ── Indexes ──────────────────────────────────────────────────────────────
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ licenseExpiry: 1 });
UserSchema.index({ companyLicenseExpiry: 1 });
UserSchema.index({ isFeatured: 1, role: 1 });

// Caching to prevent recompilation issues in Next.js development
const User: Model<UserDocument> = mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema);

export default User;
