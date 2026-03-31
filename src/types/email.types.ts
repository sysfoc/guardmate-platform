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
  BID_REJECTED = 'bidRejected',
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
