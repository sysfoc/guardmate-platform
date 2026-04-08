// ─────────────────────────────────────────────────────────────────────────────
// GuardMate — Central Enum Definitions
// Single source of truth for all enumerated values in the application.
// ─────────────────────────────────────────────────────────────────────────────

export enum UserRole {
  BOSS  = 'BOSS',
  MATE  = 'MATE',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  PENDING   = 'PENDING',
  ACTIVE    = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED    = 'BANNED',
}

export enum AuthProvider {
  EMAIL  = 'email',
  GOOGLE = 'google',
}

export enum VerificationStatus {
  UNVERIFIED     = 'UNVERIFIED',
  PENDING        = 'PENDING',
  VERIFIED       = 'VERIFIED',
  REJECTED       = 'REJECTED',
}

export enum LicenseStatus {
  VALID          = 'VALID',
  EXPIRING_SOON  = 'EXPIRING_SOON',
  EXPIRED        = 'EXPIRED',
  PENDING_REVIEW = 'PENDING_REVIEW',
}

export enum CertificateStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  VALID          = 'VALID',
  REJECTED       = 'REJECTED',
  EXPIRED        = 'EXPIRED',
}

export enum NotificationType {
  JOB_ALERT        = 'JOB_ALERT',
  BID_RECEIVED     = 'BID_RECEIVED',
  BID_ACCEPTED     = 'BID_ACCEPTED',
  BID_REJECTED     = 'BID_REJECTED',
  SHIFT_REMINDER   = 'SHIFT_REMINDER',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  DISPUTE_OPENED   = 'DISPUTE_OPENED',
  ACCOUNT_ACTION   = 'ACCOUNT_ACTION',
  LICENSE_EXPIRY   = 'LICENSE_EXPIRY',
  SYSTEM           = 'SYSTEM',
}

export enum JobType {
  ONE_TIME   = 'ONE_TIME',
  RECURRING  = 'RECURRING',
  CONTRACT   = 'CONTRACT',
}

export enum BudgetType {
  FIXED  = 'FIXED',
  HOURLY = 'HOURLY',
}

export enum JobStatus {
  DRAFT       = 'DRAFT',
  OPEN        = 'OPEN',
  FILLED      = 'FILLED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED   = 'COMPLETED',
  CANCELLED   = 'CANCELLED',
  EXPIRED     = 'EXPIRED',
}

export enum HiringStatus {
  OPEN         = 'OPEN',
  FULLY_HIRED  = 'FULLY_HIRED',
}

export enum BidStatus {
  PENDING   = 'PENDING',
  ACCEPTED  = 'ACCEPTED',
  REJECTED  = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
  EXPIRED   = 'EXPIRED',
}

export enum PaymentStatus {
  PENDING    = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED  = 'COMPLETED',
  FAILED     = 'FAILED',
  REFUNDED   = 'REFUNDED',
  DISPUTED   = 'DISPUTED',
}

export enum DisputeStatus {
  OPEN       = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED   = 'RESOLVED',
  CLOSED     = 'CLOSED',
}

export enum AdminLevel {
  SUPER   = 'SUPER',
  MANAGER = 'MANAGER',
  SUPPORT = 'SUPPORT',
}

export enum IncidentType {
  THEFT               = 'THEFT',
  ASSAULT             = 'ASSAULT',
  MEDICAL             = 'MEDICAL',
  TRESPASSING         = 'TRESPASSING',
  PROPERTY_DAMAGE     = 'PROPERTY_DAMAGE',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  OTHER               = 'OTHER',
}

export enum IncidentSeverity {
  LOW      = 'LOW',
  MEDIUM   = 'MEDIUM',
  HIGH     = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// ─── Phase 6: Payment & Escrow Enums ──────────────────────────────────────────

export enum PaymentMethod {
  STRIPE = 'STRIPE',
  PAYPAL = 'PAYPAL',
}

export enum EscrowPaymentStatus {
  PENDING  = 'PENDING',
  HELD     = 'HELD',
  RELEASED = 'RELEASED',
  REFUNDED = 'REFUNDED',
  DISPUTED = 'DISPUTED',
  FAILED   = 'FAILED',
}

export enum JobPaymentStatus {
  UNPAID   = 'UNPAID',
  HELD     = 'HELD',
  RELEASED = 'RELEASED',
  REFUNDED = 'REFUNDED',
}

export enum WithdrawalStatus {
  PENDING    = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED  = 'COMPLETED',
  FAILED     = 'FAILED',
}
