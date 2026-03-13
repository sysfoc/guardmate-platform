import { sendEmail } from './sendEmail';
import { NotificationEventType } from '@/types/email.types';

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

export const sendDisputeRaised = async (guardEmail: string, guardName: string, bossEmail: string, bossName: string, adminEmail: string, jobName: string, reason: string) => {
  await sendEmail({
    to: [guardEmail, bossEmail, adminEmail],
    notificationType: NotificationEventType.DISPUTE_RAISED,
    variables: { guardName, bossName, jobName, reason },
  });
};

export const sendDisputeResolved = async (guardEmail: string, guardName: string, bossEmail: string, bossName: string, jobName: string, resolution: string) => {
  await sendEmail({
    to: [guardEmail, bossEmail],
    notificationType: NotificationEventType.DISPUTE_RESOLVED,
    variables: { guardName, bossName, jobName, resolution },
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
