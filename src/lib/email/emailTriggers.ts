import { sendEmail } from './sendEmail';
import { NotificationEventType } from '@/types/email.types';

const PLATFORM_NAME = 'GuardMate';

export const sendGuardSignupAlert = async (adminEmail: string, guardName: string, guardEmail: string) => {
  await sendEmail({
    to: adminEmail,
    notificationType: NotificationEventType.NEW_GUARD_SIGNUP,
    variables: { firstName: guardName, email: guardEmail, dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/users` },
  });
};

export const sendBossSignupAlert = async (adminEmail: string, bossName: string, companyName: string, bossEmail: string) => {
  await sendEmail({
    to: adminEmail,
    notificationType: NotificationEventType.NEW_BOSS_SIGNUP,
    variables: { firstName: bossName, companyName, email: bossEmail, dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/users` },
  });
};

export const sendAccountApproved = async (userEmail: string, firstName: string, role: string) => {
  await sendEmail({
    to: userEmail,
    notificationType: NotificationEventType.ACCOUNT_APPROVED,
    variables: { firstName, role, dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard` },
  });
};

export const sendAccountRejected = async (userEmail: string, firstName: string, role: string, reason: string) => {
  await sendEmail({
    to: userEmail,
    notificationType: NotificationEventType.ACCOUNT_REJECTED,
    variables: { firstName, role, reason },
  });
};

export const sendAccountSuspended = async (userEmail: string, firstName: string, reason: string) => {
  await sendEmail({
    to: userEmail,
    notificationType: NotificationEventType.ACCOUNT_SUSPENDED,
    variables: { firstName, reason },
  });
};

export const sendAccountBanned = async (userEmail: string, firstName: string, reason: string) => {
  await sendEmail({
    to: userEmail,
    notificationType: NotificationEventType.ACCOUNT_BANNED,
    variables: { firstName, reason },
  });
};

export const sendLicenseApproved = async (userEmail: string, firstName: string, licenseNumber: string) => {
  await sendEmail({
    to: userEmail,
    notificationType: NotificationEventType.LICENSE_APPROVED,
    variables: { firstName, licenseNumber },
  });
};

export const sendLicenseRejected = async (userEmail: string, firstName: string, licenseNumber: string, reason: string) => {
  await sendEmail({
    to: userEmail,
    notificationType: NotificationEventType.LICENSE_REJECTED,
    variables: { firstName, licenseNumber, reason },
  });
};

export const sendBidReceived = async (bossEmail: string, bossName: string, guardName: string, jobName: string, bidAmount: number, jobId: string) => {
  await sendEmail({
    to: bossEmail,
    notificationType: NotificationEventType.BID_RECEIVED,
    variables: { bossName, guardName, jobName, amount: bidAmount, dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/jobs/${jobId}/bids` },
  });
};

export const sendBidAccepted = async (guardEmail: string, guardName: string, jobName: string, bossName: string, date: string, location: string, amount: number) => {
  await sendEmail({
    to: guardEmail,
    notificationType: NotificationEventType.BID_ACCEPTED,
    variables: { guardName, jobName, bossName, date, location, amount },
  });
};

export const sendBidRejected = async (guardEmail: string, guardName: string, jobName: string, bossName: string) => {
  await sendEmail({
    to: guardEmail,
    notificationType: NotificationEventType.BID_REJECTED,
    variables: { guardName, jobName, bossName },
  });
};

export const sendShiftReminder = async (guardEmail: string, guardName: string, bossEmail: string, bossName: string, jobName: string, date: string, time: string, location: string) => {
  await sendEmail({
    to: [guardEmail, bossEmail],
    notificationType: NotificationEventType.SHIFT_REMINDER,
    variables: { guardName, bossName, jobName, date, time, location },
  });
};

export const sendShiftCheckinAlert = async (bossEmail: string, bossName: string, guardName: string, location: string, time: string, jobName: string) => {
  await sendEmail({
    to: bossEmail,
    notificationType: NotificationEventType.SHIFT_CHECKIN_ALERT,
    variables: { bossName, guardName, location, time, jobName },
  });
};

export const sendShiftCheckoutAlert = async (bossEmail: string, bossName: string, guardName: string, location: string, time: string, jobName: string) => {
  await sendEmail({
    to: bossEmail,
    notificationType: NotificationEventType.SHIFT_CHECKOUT_ALERT,
    variables: { bossName, guardName, location, time, jobName },
  });
};

export const sendShiftApproved = async (guardEmail: string, guardName: string, jobName: string, amount: number) => {
  await sendEmail({
    to: guardEmail,
    notificationType: NotificationEventType.SHIFT_APPROVED,
    variables: { guardName, jobName, amount },
  });
};

export const sendPaymentSent = async (guardEmail: string, guardName: string, amount: number, jobName: string) => {
  await sendEmail({
    to: guardEmail,
    notificationType: NotificationEventType.PAYMENT_SENT,
    variables: { guardName, amount, jobName },
  });
};

// ─── Phase 7: Dispute System Emails ────────────────────────────────────────

export const sendDisputeRaised = async (againstEmail: string, againstName: string, raisedByName: string, raisedByRole: string, jobTitle: string, reason: string, description: string, disputeId: string) => {
  await sendEmail({
    to: againstEmail,
    notificationType: NotificationEventType.DISPUTE_RAISED,
    variables: { againstName, raisedByName, raisedByRole, jobTitle, reason, description, disputeId, dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/${raisedByRole === 'BOSS' ? 'mate' : 'boss'}/jobs` },
  });
};

export const sendDisputeRaisedAdmin = async (adminEmail: string, raisedByName: string, raisedByRole: string, againstName: string, jobTitle: string, reason: string, description: string, jobBudget: number, currency: string, disputeId: string) => {
  await sendEmail({
    to: adminEmail,
    notificationType: NotificationEventType.DISPUTE_RAISED_ADMIN,
    variables: { adminEmail, raisedByName, raisedByRole, againstName, jobTitle, reason, description, jobBudget, currency, disputeId, adminUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/disputes/${disputeId}` },
  });
};

export const sendDisputeResponseReceived = async (adminEmail: string, responderName: string, jobTitle: string, disputeId: string) => {
  await sendEmail({
    to: adminEmail,
    notificationType: NotificationEventType.DISPUTE_RESPONSE_RECEIVED,
    variables: { responderName, jobTitle, disputeId, adminUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/disputes/${disputeId}` },
  });
};

export const sendDisputeResponseNotification = async (raisedByEmail: string, raisedByName: string, responderName: string, jobTitle: string, disputeId: string) => {
  await sendEmail({
    to: raisedByEmail,
    notificationType: NotificationEventType.DISPUTE_RESPONSE_NOTIFICATION,
    variables: { raisedByName, responderName, jobTitle, disputeId },
  });
};

export const sendDisputeResolved = async (recipientEmail: string, recipientName: string, jobTitle: string, decision: string, amountReleased: number, amountRefunded: number, adminNotes: string, currency: string) => {
  await sendEmail({
    to: recipientEmail,
    notificationType: NotificationEventType.DISPUTE_RESOLVED,
    variables: { recipientName, jobTitle, decision, amountReleased, amountRefunded, adminNotes, currency },
  });
};

export const sendDisputeResolvedAdmin = async (adminEmail: string, jobTitle: string, decision: string, resolvedBy: string, disputeId: string) => {
  await sendEmail({
    to: adminEmail,
    notificationType: NotificationEventType.DISPUTE_RESOLVED_ADMIN,
    variables: { jobTitle, decision, resolvedBy, disputeId },
  });
};

export const sendShiftAutoApproved = async (bossEmail: string, bossName: string, guardEmail: string, guardName: string, jobTitle: string, amount: number, currency: string) => {
  await sendEmail({
    to: [bossEmail, guardEmail],
    notificationType: NotificationEventType.SHIFT_AUTO_APPROVED,
    variables: { bossName, guardName, jobTitle, amount, currency },
  });
};

export const sendDisputeDeadlineWarning = async (adminEmail: string, jobTitle: string, hoursLeft: number, disputeId: string) => {
  await sendEmail({
    to: adminEmail,
    notificationType: NotificationEventType.DISPUTE_DEADLINE_WARNING,
    variables: { jobTitle, hoursLeft, disputeId, adminUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/disputes/${disputeId}` },
  });
};

export const sendPasswordReset = async (userEmail: string, firstName: string, resetLink: string) => {
  await sendEmail({
    to: userEmail,
    notificationType: NotificationEventType.PASSWORD_RESET,
    variables: { firstName, dashboardUrl: resetLink },
  });
};

export const sendLicenseExpiry30Days = async (userEmail: string, firstName: string, licenseNumber: string, expiryDate: string, adminEmail: string) => {
  await sendEmail({
    to: [userEmail, adminEmail],
    notificationType: NotificationEventType.LICENSE_EXPIRY_30_DAYS,
    variables: { firstName, licenseNumber, expiryDate },
  });
};

export const sendJobCancelledByBoss = async (
  guardEmail: string,
  guardName: string,
  jobTitle: string,
  startDate: string,
  cancelReason: string
) => {
  await sendEmail({
    to: guardEmail,
    notificationType: NotificationEventType.JOB_CANCELLED_BY_BOSS,
    variables: {
      guardName,
      jobTitle,
      startDate,
      cancelReason,
      browseJobsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/mate/jobs`,
    },
  });
};

export const sendGuardWithdrewBid = async (
  bossEmail: string,
  bossName: string,
  guardName: string,
  jobTitle: string,
  startDate: string
) => {
  await sendEmail({
    to: bossEmail,
    notificationType: NotificationEventType.GUARD_WITHDREW_BID,
    variables: {
      bossName,
      guardName,
      jobTitle,
      startDate,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/boss/jobs`,
    },
  });
};

export const sendJobReopenedToBidders = async (
  guardEmail: string,
  guardName: string,
  jobTitle: string,
  jobId: string
) => {
  await sendEmail({
    to: guardEmail,
    notificationType: NotificationEventType.JOB_REOPENED_TO_BIDDERS,
    variables: {
      guardName,
      jobTitle,
      jobUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/mate/jobs/${jobId}`,
    },
  });
};

export const sendIncidentReported = async (
  bossEmail: string,
  bossName: string,
  guardName: string,
  jobTitle: string,
  incidentType: string,
  severity: string,
  jobId: string
) => {
  await sendEmail({
    to: bossEmail,
    notificationType: NotificationEventType.INCIDENT_REPORTED,
    variables: {
      bossName,
      guardName,
      jobTitle,
      incidentType,
      severity,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/boss/jobs/${jobId}`,
    },
  });
};

export const sendShiftAssigned = async (
  guardEmail: string,
  guardName: string,
  jobTitle: string,
  assignedSlots: { date: string; startTime: string; endTime: string; isOvernight: boolean }[]
) => {
  const scheduleHtml = assignedSlots.map((s) => {
    const d = new Date(s.date + 'T00:00:00');
    const dateStr = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    const overnight = s.isOvernight ? ' <span style="color:#d97706;font-weight:600;">(+1 day)</span>' : '';
    return `<li>${dateStr}: ${s.startTime} – ${s.endTime}${overnight}</li>`;
  }).join('');

  await sendEmail({
    to: guardEmail,
    notificationType: NotificationEventType.SHIFT_ASSIGNED,
    variables: {
      guardName,
      jobTitle,
      scheduleHtml,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/mate/shifts`,
    },
  });
};

/**
 * Send ABN verification success email to guard
 */
export const sendABNVerified = async (
  guardEmail: string,
  guardName: string,
  businessName: string | null
) => {
  await sendEmail({
    to: guardEmail,
    notificationType: NotificationEventType.ABN_VERIFIED,
    variables: {
      guardName,
      businessName: businessName || 'your business',
      profileUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/mate/profile`,
    },
  });
};

/**
 * Send ABN verification failure email to guard
 */
export const sendABNVerificationFailed = async (
  guardEmail: string,
  guardName: string,
  reason: string
) => {
  await sendEmail({
    to: guardEmail,
    notificationType: NotificationEventType.ABN_VERIFICATION_FAILED,
    variables: {
      guardName,
      reason,
      abrUrl: 'https://abr.business.gov.au',
      profileUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/mate/profile`,
    },
  });
};

// ─── Phase 6: Payments & Escrow Emails ───────────────────────────────

export const sendPaymentRequired = async (
  to: string,
  bossName: string,
  jobTitle: string
) => {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/boss/payments`;
  await sendEmail({
    to,
    notificationType: NotificationEventType.PAYMENT_REQUIRED,
    variables: { bossName, jobTitle, loginUrl, platformName: PLATFORM_NAME }
  });
};

export const sendEscrowFunded = async (
  to: string,
  bossName: string,
  jobTitle: string,
  amount: string
) => {
  await sendEmail({
    to,
    notificationType: NotificationEventType.ESCROW_FUNDED,
    variables: { bossName, jobTitle, amount, platformName: PLATFORM_NAME }
  });
};

export const sendPaymentReleasedGuard = async (
  to: string,
  guardName: string,
  jobTitle: string,
  amount: string
) => {
  const walletUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/mate/wallet`;
  await sendEmail({
    to,
    notificationType: NotificationEventType.PAYMENT_RELEASED,
    variables: { guardName, jobTitle, amount, walletUrl, platformName: PLATFORM_NAME }
  });
};

export const sendPaymentReleasedBoss = async (
  to: string,
  bossName: string,
  jobTitle: string
) => {
  await sendEmail({
    to,
    notificationType: NotificationEventType.PAYMENT_RELEASED_BOSS,
    variables: { bossName, jobTitle, platformName: PLATFORM_NAME }
  });
};

export const sendWithdrawalInitiated = async (
  to: string,
  guardName: string,
  amount: string,
  method: string
) => {
  await sendEmail({
    to,
    notificationType: NotificationEventType.WITHDRAWAL_INITIATED,
    variables: { guardName, amount, method, platformName: PLATFORM_NAME }
  });
};

export const sendWithdrawalCompleted = async (
  to: string,
  guardName: string,
  amount: string,
  method: string
) => {
  await sendEmail({
    to,
    notificationType: NotificationEventType.WITHDRAWAL_COMPLETED,
    variables: { guardName, amount, method, platformName: PLATFORM_NAME }
  });
};
