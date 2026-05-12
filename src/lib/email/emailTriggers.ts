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
  amount: string,
  commissionOptions?: { commissionRate: number; offerName?: string; savedAmount?: number; currency?: string }
) => {
  let commissionSection = '';
  if (commissionOptions) {
    const { commissionRate, offerName, savedAmount, currency = '£' } = commissionOptions;
    commissionSection += `<p><strong>Commission rate:</strong> ${commissionRate}%`;
    if (offerName) {
      commissionSection += ` (Promotional rate — ${offerName})`;
    }
    commissionSection += `</p>`;
    if (savedAmount && savedAmount > 0) {
      commissionSection += `<p style="color: #059669; font-weight: bold;">You saved ${currency}${savedAmount.toFixed(2)} with our ${offerName} promotion!</p>`;
    }
  }

  await sendEmail({
    to,
    notificationType: NotificationEventType.ESCROW_FUNDED,
    variables: { bossName, jobTitle, amount, commissionSection, platformName: PLATFORM_NAME }
  });
};

export const sendPaymentReleasedGuard = async (
  to: string,
  guardName: string,
  jobTitle: string,
  amount: string,
  commissionOptions?: { commissionRate: number; offerName?: string; savedAmount?: number; currency?: string }
) => {
  let commissionSection = '';
  if (commissionOptions) {
    const { commissionRate, offerName, savedAmount, currency = '£' } = commissionOptions;
    commissionSection += `<p><strong>Commission rate:</strong> ${commissionRate}%`;
    if (offerName) {
      commissionSection += ` (Promotional rate — ${offerName})`;
    }
    commissionSection += `</p>`;
    if (savedAmount && savedAmount > 0) {
      commissionSection += `<p style="color: #059669; font-weight: bold;">You saved ${currency}${savedAmount.toFixed(2)} with our ${offerName} promotion!</p>`;
    }
  }

  const walletUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/mate/wallet`;
  await sendEmail({
    to,
    notificationType: NotificationEventType.PAYMENT_RELEASED,
    variables: { guardName, jobTitle, amount, commissionSection, walletUrl, platformName: PLATFORM_NAME }
  });
};

export const sendPaymentReleasedBoss = async (
  to: string,
  bossName: string,
  jobTitle: string,
  commissionOptions?: { commissionRate: number; offerName?: string; savedAmount?: number; currency?: string }
) => {
  let commissionSection = '';
  if (commissionOptions) {
    const { commissionRate, offerName, savedAmount, currency = '£' } = commissionOptions;
    commissionSection += `<p><strong>Commission rate:</strong> ${commissionRate}%`;
    if (offerName) {
      commissionSection += ` (Promotional rate — ${offerName})`;
    }
    commissionSection += `</p>`;
    if (savedAmount && savedAmount > 0) {
      commissionSection += `<p style="color: #059669; font-weight: bold;">You saved ${currency}${savedAmount.toFixed(2)} with our ${offerName} promotion!</p>`;
    }
  }

  await sendEmail({
    to,
    notificationType: NotificationEventType.PAYMENT_RELEASED_BOSS,
    variables: { bossName, jobTitle, commissionSection, platformName: PLATFORM_NAME }
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

// ─── Phase 8: Subscription & Offer Email Triggers ───────────────────────────

export const sendSubscriptionActivated = async (
  to: string,
  bossName: string,
  amount: number,
  currency: string,
  periodStart: string,
  periodEnd: string
) => {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/boss`;
  await sendEmail({
    to,
    notificationType: NotificationEventType.SUBSCRIPTION_ACTIVATED,
    variables: {
      bossName,
      amount: amount.toFixed(2),
      currency,
      periodStart,
      periodEnd,
      dashboardUrl,
    }
  });
};

export const sendSubscriptionExpiringSoon = async (
  to: string,
  bossName: string,
  daysRemaining: number,
  amount: number,
  currency: string,
  renewUrl: string
) => {
  await sendEmail({
    to,
    notificationType: NotificationEventType.SUBSCRIPTION_EXPIRING_SOON,
    variables: {
      bossName,
      daysRemaining: String(daysRemaining),
      amount: amount.toFixed(2),
      currency,
      renewUrl,
    }
  });
};

export const sendSubscriptionLapsed = async (
  to: string,
  bossName: string,
  subscribeUrl: string
) => {
  await sendEmail({
    to,
    notificationType: NotificationEventType.SUBSCRIPTION_LAPSED,
    variables: {
      bossName,
      subscribeUrl,
    }
  });
};

export const sendSubscriptionCancelled = async (
  to: string,
  bossName: string,
  activeUntil: string
) => {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/boss`;
  await sendEmail({
    to,
    notificationType: NotificationEventType.SUBSCRIPTION_CANCELLED,
    variables: {
      bossName,
      activeUntil,
      dashboardUrl,
    }
  });
};

export const sendNewOfferAvailable = async (
  to: string,
  userName: string,
  offerName: string,
  offerDescription: string,
  startDate: string,
  endDate: string
) => {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;
  await sendEmail({
    to,
    notificationType: NotificationEventType.NEW_OFFER_AVAILABLE,
    variables: {
      userName,
      offerName,
      offerDescription,
      startDate,
      endDate,
      dashboardUrl,
    }
  });
};


export const sendSubscriptionPaymentFailed = async (
  to: string,
  bossName: string,
  amount: number,
  currency: string,
  failureReason: string,
  updateUrl: string
) => {
  await sendEmail({
    to,
    notificationType: NotificationEventType.SUBSCRIPTION_PAYMENT_FAILED,
    variables: {
      bossName,
      amount: amount.toFixed(2),
      currency,
      failureReason,
      updateUrl,
    }
  });
};

export const sendManualWithdrawalRequested = async (
  to: string,
  guardName: string,
  amount: number,
  accountName: string,
  bsb: string,
  accountNumber: string,
  withdrawalId: string
) => {
  const adminDashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/withdrawals`;
  await sendEmail({
    to,
    notificationType: NotificationEventType.MANUAL_WITHDRAWAL_REQUESTED,
    variables: {
      guardName,
      amount: amount.toFixed(2),
      accountName,
      bsb,
      accountNumber,
      withdrawalId,
      adminDashboardUrl,
    }
  });
};

// ─── Admin Authentication Emails (Direct SMTP — critical path) ────────────────

/**
 * Send a 6-digit OTP code for admin login verification.
 * Uses direct SMTP for reliability — admin login should never be blocked
 * by the template system being unconfigured.
 */
export const sendAdminOtp = async (email: string, code: string) => {
  try {
    const dbConnect = (await import('@/lib/mongodb')).default;
    await dbConnect();
    const EmailSettingsModel = (await import('@/models/EmailSettings.model')).default;
    const settings = await EmailSettingsModel.findOne().lean() as any;

    if (!settings?.gmailUser || !settings?.gmailAppPassword) {
      console.warn('⚠️ sendAdminOtp skipped: SMTP not configured.');
      return;
    }

    const { createNodemailerClient } = await import('./nodemailerClient');
    const transporter = createNodemailerClient(settings.gmailUser, settings.gmailAppPassword);

    await transporter.sendMail({
      from: `"${settings.fromName || 'GuardMate'}" <${settings.fromEmail || settings.gmailUser}>`,
      to: email,
      subject: `Admin Login Code: ${code}`,
      text: `Your GuardMate admin login verification code is: ${code}\n\nThis code expires in 5 minutes. Do not share it with anyone.\n\nIf you did not request this, please ignore this email.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e1b4b, #312e81); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
            <div style="display: inline-block; background: rgba(255,255,255,0.15); padding: 10px; border-radius: 12px; margin-bottom: 16px;">
              <span style="color: white; font-size: 24px; font-weight: bold;">🔐</span>
            </div>
            <h1 style="color: white; font-size: 22px; margin: 0;">Admin Login Verification</h1>
            <p style="color: rgba(255,255,255,0.7); font-size: 14px; margin-top: 8px;">Enter this code to complete your sign-in</p>
          </div>
          <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none;">
            <div style="background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <p style="color: #64748b; font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Your verification code</p>
              <p style="color: #1e293b; font-size: 36px; font-weight: 800; letter-spacing: 10px; margin: 0; font-family: 'Courier New', monospace;">${code}</p>
            </div>
            <p style="color: #94a3b8; font-size: 13px; text-align: center; margin: 0;">
              ⏱ This code expires in <strong>5 minutes</strong>
            </p>
          </div>
          <div style="background: #f8fafc; padding: 20px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none; text-align: center;">
            <p style="color: #94a3b8; font-size: 11px; margin: 0;">If you didn't request this code, you can safely ignore this email.</p>
            <p style="color: #cbd5e1; font-size: 11px; margin: 8px 0 0;">© ${new Date().getFullYear()} GuardMate</p>
          </div>
        </div>
      `,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Admin OTP sent to: ${email}`);
    }
  } catch (error) {
    console.error('❌ Failed to send admin OTP email:', error);
    throw error; // Re-throw so the caller can handle fallback
  }
};

/**
 * Send an admin invitation email with a registration link.
 */
export const sendAdminInvite = async (email: string, invitedByName: string, inviteUrl: string) => {
  try {
    const dbConnect = (await import('@/lib/mongodb')).default;
    await dbConnect();
    const EmailSettingsModel = (await import('@/models/EmailSettings.model')).default;
    const settings = await EmailSettingsModel.findOne().lean() as any;

    if (!settings?.gmailUser || !settings?.gmailAppPassword) {
      console.warn('⚠️ sendAdminInvite skipped: SMTP not configured.');
      return;
    }

    const { createNodemailerClient } = await import('./nodemailerClient');
    const transporter = createNodemailerClient(settings.gmailUser, settings.gmailAppPassword);

    await transporter.sendMail({
      from: `"${settings.fromName || 'GuardMate'}" <${settings.fromEmail || settings.gmailUser}>`,
      to: email,
      subject: `You're invited to join GuardMate as an Admin`,
      text: `${invitedByName} has invited you to join GuardMate as an administrator.\n\nClick the link below to create your admin account:\n${inviteUrl}\n\nThis invitation expires in 24 hours.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e1b4b, #312e81); padding: 40px 32px; border-radius: 16px 16px 0 0; text-align: center;">
            <div style="display: inline-block; background: rgba(255,255,255,0.15); padding: 12px; border-radius: 14px; margin-bottom: 20px;">
              <span style="color: white; font-size: 28px; font-weight: bold;">G</span>
            </div>
            <h1 style="color: white; font-size: 24px; margin: 0;">You're Invited</h1>
            <p style="color: rgba(255,255,255,0.7); font-size: 15px; margin-top: 8px;">Join the GuardMate admin team</p>
          </div>
          <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none;">
            <p style="color: #334155; font-size: 15px; line-height: 1.7; margin-top: 0;">
              <strong>${invitedByName}</strong> has invited you to join the GuardMate platform as an administrator.
            </p>
            <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
              As an admin, you'll be able to manage users, oversee jobs, handle disputes, and configure platform settings.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; font-weight: 700; font-size: 15px; padding: 14px 40px; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                Accept Invitation →
              </a>
            </div>
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin-top: 24px;">
              <p style="color: #92400e; font-size: 13px; margin: 0; font-weight: 500;">⏱ This invitation expires in 24 hours</p>
            </div>
          </div>
          <div style="background: #f8fafc; padding: 20px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none; text-align: center;">
            <p style="color: #94a3b8; font-size: 11px; margin: 0;">If you didn't expect this invitation, you can safely ignore this email.</p>
            <p style="color: #cbd5e1; font-size: 11px; margin: 8px 0 0;">© ${new Date().getFullYear()} GuardMate</p>
          </div>
        </div>
      `,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Admin invite email sent to: ${email}`);
    }
  } catch (error) {
    console.error('❌ Failed to send admin invite email:', error);
    throw error;
  }
};
