export enum NotificationEventType {
  NEW_GUARD_SIGNUP = 'newGuardSignup',
  NEW_BOSS_SIGNUP = 'newBossSignup',
  ACCOUNT_APPROVED = 'accountApproved',
  ACCOUNT_REJECTED = 'accountRejected',
  ACCOUNT_SUSPENDED = 'accountSuspended',
  ACCOUNT_BANNED = 'accountBanned',
  LICENSE_APPROVED = 'licenseApproved',
  LICENSE_REJECTED = 'licenseRejected',
  BID_RECEIVED = 'bidReceived',
  BID_ACCEPTED = 'bidAccepted',
  BID_REJECTED = 'BID_REJECTED',
  BID_WITHDRAWN = 'BID_WITHDRAWN',

  // ─── Phase 6: Payment & Escrow ──────────────────────────────────────────
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',     // Boss needs to fund escrow
  ESCROW_FUNDED = 'ESCROW_FUNDED',           // Boss funded escrow
  PAYMENT_RELEASED = 'PAYMENT_RELEASED',     // Guard received payment
  PAYMENT_RELEASED_BOSS = 'PAYMENT_RELEASED_BOSS', // Boss notified of release
  WITHDRAWAL_INITIATED = 'WITHDRAWAL_INITIATED',
  WITHDRAWAL_COMPLETED = 'WITHDRAWAL_COMPLETED',
  WITHDRAWAL_FAILED = 'WITHDRAWAL_FAILED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  DISPUTE_RAISED_ADMIN = 'DISPUTE_RAISED_ADMIN',

  // System
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  SHIFT_REMINDER = 'shiftReminder',
  SHIFT_CHECKIN_ALERT = 'shiftCheckinAlert',
  SHIFT_CHECKOUT_ALERT = 'shiftCheckoutAlert',
  SHIFT_APPROVED = 'shiftApproved',
  PAYMENT_SENT = 'paymentSent',
  DISPUTE_RAISED = 'disputeRaised',
  DISPUTE_RESOLVED = 'disputeResolved',
  PASSWORD_RESET = 'passwordReset',
  LICENSE_EXPIRY_30_DAYS = 'licenseExpiry30Days',
  JOB_CANCELLED_BY_BOSS = 'jobCancelledByBoss',
  GUARD_WITHDREW_BID = 'guardWithdrewBid',
  JOB_REOPENED_TO_BIDDERS = 'jobReopened',
  INCIDENT_REPORTED = 'incidentReported',
  SHIFT_ASSIGNED = 'shiftAssigned',
  ABN_VERIFIED = 'abnVerified',
  ABN_VERIFICATION_FAILED = 'abnVerificationFailed',

  // ─── Phase 7: Disputes ────────────────────────────────────────────────
  DISPUTE_RESPONSE_RECEIVED = 'disputeResponseReceived',
  DISPUTE_RESPONSE_NOTIFICATION = 'disputeResponseNotification',
  DISPUTE_RESOLVED_ADMIN = 'disputeResolvedAdmin',
  SHIFT_AUTO_APPROVED = 'shiftAutoApproved',
  DISPUTE_DEADLINE_WARNING = 'disputeDeadlineWarning',
}

export interface IEmailSettings {
  _id?: string;
  gmailUser: string;
  gmailAppPassword?: string; // Optional because frontend won't receive it when fetching
  fromName: string;
  fromEmail: string;
  replyTo: string;
  isConfigured: boolean;
  notifications: Record<NotificationEventType, boolean>;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IEmailTemplate {
  _id?: string;
  notificationType: NotificationEventType;
  subject: string;
  htmlBody: string;
  textBody: string;
  variables: string[];
  isActive: boolean;
  lastEditedBy?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
