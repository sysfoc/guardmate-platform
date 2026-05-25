/**
 * Seed Script: Admin User
 * ─────────────────────────────────────────────────────────────────────────────
 * Inserts the GuardMate super-admin user into a fresh database.
 * Safe to run multiple times — uses upsert on uid.
 *
 * Usage:
 *   npm run seed:admin
 */

import mongoose from 'mongoose';
// @ts-ignore
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌  MONGODB_URI is not set in .env.local');
  process.exit(1);
}

const adminDoc = {
  _id: new mongoose.Types.ObjectId('6a0420a55915d1a18a183f1f'),
  uid: 'WKXkR0Ad12gwipNa6VMuEwkYHAI3',
  email: 'rehan048686@gmail.com',
  emailVerified: true,
  phone: null,
  phoneVerified: false,
  phoneCountryCode: null,
  firstName: 'Rehan',
  lastName: 'Ahmad',
  role: 'ADMIN',
  status: 'ACTIVE',
  authProvider: 'email',
  profilePhoto: null,
  bio: null,
  country: null,
  city: null,
  state: null,
  address: null,
  postalCode: null,
  timezone: null,
  lastLoginAt: new Date('2026-05-18T08:49:19.531Z'),
  lastLoginIp: '182.190.178.21',
  lastLoginDevice: 'Desktop',
  lastLoginUserAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
  registrationIp: null,
  registrationDevice: null,
  loginHistory: [
    { ip: '127.0.0.1', device: 'seed-script', userAgent: 'GuardMate-Seed/1.0', location: null, timestamp: new Date('2026-05-13T06:56:37.114Z'), success: true },
    { ip: '::1', device: 'Desktop', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', location: null, timestamp: new Date('2026-05-13T06:57:34.324Z'), success: false },
    { ip: '::1', device: 'Desktop', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', location: null, timestamp: new Date('2026-05-13T07:00:23.527Z'), success: true },
    { ip: '182.190.178.21', device: 'Desktop', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', location: null, timestamp: new Date('2026-05-14T09:28:20.642Z'), success: false },
    { ip: '182.190.178.21', device: 'Desktop', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', location: null, timestamp: new Date('2026-05-14T09:28:40.254Z'), success: true },
    { ip: '182.190.178.21', device: 'Desktop', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', location: null, timestamp: new Date('2026-05-18T08:49:18.378Z'), success: true },
    { ip: '182.190.178.21', device: 'Desktop', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', location: null, timestamp: new Date('2026-05-18T08:49:19.531Z'), success: true },
  ],
  isTwoFactorEnabled: false,
  isProfileComplete: true,
  isOnboardingComplete: true,
  deletedAt: null,
  companyName: null,
  companyRegistrationNumber: null,
  companyLicenseNumber: null,
  companyLicenseExpiry: null,
  companyLicenseDocument: null,
  companyLicenseStatus: 'PENDING_REVIEW',
  companyAddress: null,
  companyCity: null,
  companyState: null,
  companyCountry: null,
  companyPostalCode: null,
  companyPhone: null,
  companyEmail: null,
  companyWebsite: null,
  companyLogo: null,
  companyDescription: null,
  industry: null,
  totalJobsPosted: 0,
  activeJobsCount: 0,
  completedJobsCount: 0,
  cancelledJobsCount: 0,
  cancellationStrikes: 0,
  totalSpent: 0,
  averageRating: 0,
  totalReviews: 0,
  isCompanyVerified: false,
  companyVerifiedAt: null,
  verificationNotes: null,
  subscriptionPlan: null,
  subscriptionExpiry: null,
  licenseNumber: null,
  licenseType: null,
  licenseIssuingAuthority: null,
  licenseIssuedAt: null,
  licenseExpiry: null,
  licenseDocument: null,
  licenseStatus: 'PENDING_REVIEW',
  licenseVerifiedAt: null,
  idType: null,
  idNumber: null,
  idDocument: null,
  idExpiry: null,
  idVerificationStatus: 'UNVERIFIED',
  idVerifiedAt: null,
  skills: [],
  hourlyRate: null,
  minimumHours: null,
  experience: null,
  languages: [],
  isAvailable: false,
  preferredWorkRadius: null,
  preferredLocations: [],
  totalJobsCompleted: 0,
  totalJobsApplied: 0,
  totalEarnings: 0,
  completionRate: 0,
  onTimeRate: 0,
  isFeatured: false,
  featuredUntil: null,
  reliabilityScore: 100,
  backgroundCheckStatus: 'UNVERIFIED',
  backgroundCheckDate: null,
  firstAidCertificate: null,
  firstAidCertificateExpiry: null,
  firstAidCertificateStatus: null,
  firstAidVerifiedAt: null,
  firstAidVerifiedBy: null,
  worksOnConstructionSite: false,
  constructionWhiteCard: null,
  constructionWhiteCardExpiry: null,
  constructionWhiteCardStatus: null,
  constructionWhiteCardVerifiedAt: null,
  worksWithChildren: false,
  workingWithChildrenCheck: null,
  workingWithChildrenCheckExpiry: null,
  workingWithChildrenCheckStatus: null,
  workingWithChildrenCheckVerifiedAt: null,
  abn: null,
  abnVerified: false,
  abnStatus: 'NOT_PROVIDED',
  abnBusinessName: null,
  abnGstRegistered: null,
  abnVerifiedAt: null,
  abnState: null,
  victorianBusinessLicence: null,
  victorianBusinessLicenceStatus: null,
  victorianBusinessLicenceExpiry: null,
  victorianBusinessLicenceVerifiedAt: null,
  adminLevel: 'SUPER',
  permissions: [
    'MANAGE_USERS',
    'VIEW_ANALYTICS',
    'VERIFY_LICENSES',
    'MANAGE_ADMINS',
    'MANAGE_SETTINGS',
    'MANAGE_DISPUTES',
    'MANAGE_OFFERS',
  ],
  managedRegions: [],
  assignedBy: null,
  lastActionAt: null,
  notificationPreferences: {
    email: true,
    push: true,
    sms: false,
    jobAlerts: true,
    bidUpdates: true,
    paymentAlerts: true,
    systemAlerts: true,
  },
  certifications: [],
  availabilityCalendar: [],
  createdAt: new Date('2026-05-13T06:56:37.139Z'),
  updatedAt: new Date('2026-05-18T08:49:19.531Z'),
  __v: 0,
};

async function main() {
  console.log('🔌  Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI as string);
  console.log('✅  Connected.\n');

  const db = mongoose.connection.db!;
  const users = db.collection('users');

  const result = await users.updateOne(
    { uid: adminDoc.uid },
    { $set: adminDoc },
    { upsert: true }
  );

  if (result.upsertedCount > 0) {
    console.log('✅  Admin user inserted successfully.');
  } else if (result.modifiedCount > 0) {
    console.log('🔄  Admin user already existed — document updated.');
  } else {
    console.log('ℹ️   Admin user already up to date, no changes made.');
  }

  await mongoose.disconnect();
  console.log('\n🔌  Disconnected. Done.');
}

main().catch((err) => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});
