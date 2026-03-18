import { NotificationEventType, IEmailTemplate } from '@/types/email.types';

const BASE_HTML = (title: string, content: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background-color: #0f172a; padding: 20px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px; color: #334155; line-height: 1.6; font-size: 16px; }
    .content h2 { color: #0f172a; margin-top: 0; }
    .footer { background-color: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0; }
    .btn { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>GuardMate</h1>
    </div>
    <div class="content">
      <h2>${title}</h2>
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} GuardMate. All rights reserved.</p>
      <p>This is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>
`;

export const defaultTemplates: Partial<Record<NotificationEventType, Omit<IEmailTemplate, '_id' | 'createdAt' | 'updatedAt'>>> = {
  [NotificationEventType.NEW_GUARD_SIGNUP]: {
    notificationType: NotificationEventType.NEW_GUARD_SIGNUP,
    subject: 'New Guard Registration: {{firstName}}',
    htmlBody: BASE_HTML('New Guard Signup', '<p>A new guard named <strong>{{firstName}}</strong> ({{email}}) has signed up.</p><p>Please log in to the admin dashboard to review their credentials.</p><a href="{{dashboardUrl}}" class="btn">View Dashboard</a>'),
    textBody: 'A new guard named {{firstName}} ({{email}}) has signed up. Please log in to review.',
    variables: ['firstName', 'email', 'dashboardUrl'],
    isActive: true,
  },
  [NotificationEventType.NEW_BOSS_SIGNUP]: {
    notificationType: NotificationEventType.NEW_BOSS_SIGNUP,
    subject: 'New Boss Registration: {{companyName}}',
    htmlBody: BASE_HTML('New Boss Signup', '<p>A new Boss from <strong>{{companyName}}</strong> ({{firstName}}) has signed up.</p><p>Please log in to the admin dashboard to review their account.</p><a href="{{dashboardUrl}}" class="btn">View Dashboard</a>'),
    textBody: 'A new Boss from {{companyName}} ({{firstName}}) has signed up. Please log in to review.',
    variables: ['firstName', 'companyName', 'dashboardUrl'],
    isActive: true,
  },
  [NotificationEventType.ACCOUNT_APPROVED]: {
    notificationType: NotificationEventType.ACCOUNT_APPROVED,
    subject: 'Your GuardMate Account is Approved!',
    htmlBody: BASE_HTML('Account Approved', '<p>Hi {{firstName}},</p><p>Great news! Your {{role}} account on GuardMate has been approved.</p><p>You can now log in and start using the platform.</p><a href="{{dashboardUrl}}" class="btn">Log In Now</a>'),
    textBody: 'Hi {{firstName}}, Your GuardMate account has been approved. You can now log in.',
    variables: ['firstName', 'role', 'dashboardUrl'],
    isActive: true,
  },
  [NotificationEventType.ACCOUNT_REJECTED]: {
    notificationType: NotificationEventType.ACCOUNT_REJECTED,
    subject: 'Update on Your GuardMate Account',
    htmlBody: BASE_HTML('Account Application Update', '<p>Hi {{firstName}},</p><p>Thank you for applying to join GuardMate as a {{role}}. Unfortunately, we are unable to approve your account at this time.</p><p><strong>Reason:</strong> {{reason}}</p>'),
    textBody: 'Hi {{firstName}}, Unfortunately, your application for a {{role}} account was rejected. Reason: {{reason}}',
    variables: ['firstName', 'role', 'reason'],
    isActive: true,
  },
  [NotificationEventType.ACCOUNT_SUSPENDED]: {
    notificationType: NotificationEventType.ACCOUNT_SUSPENDED,
    subject: 'Your GuardMate Account has been Suspended',
    htmlBody: BASE_HTML('Account Suspended', '<p>Hi {{firstName}},</p><p>Your GuardMate account has been temporarily suspended.</p><p><strong>Reason:</strong> {{reason}}</p><p>Please contact support for more information.</p>'),
    textBody: 'Hi {{firstName}}, Your GuardMate account has been suspended. Reason: {{reason}}',
    variables: ['firstName', 'reason'],
    isActive: true,
  },
  [NotificationEventType.ACCOUNT_BANNED]: {
    notificationType: NotificationEventType.ACCOUNT_BANNED,
    subject: 'Your GuardMate Account has been Banned',
    htmlBody: BASE_HTML('Account Banned', '<p>Hi {{firstName}},</p><p>Your GuardMate account has been permanently banned from the platform.</p><p><strong>Reason:</strong> {{reason}}</p>'),
    textBody: 'Hi {{firstName}}, Your GuardMate account has been banned. Reason: {{reason}}',
    variables: ['firstName', 'reason'],
    isActive: true,
  },
  [NotificationEventType.LICENSE_APPROVED]: {
    notificationType: NotificationEventType.LICENSE_APPROVED,
    subject: 'License Document Approved',
    htmlBody: BASE_HTML('License Approved', '<p>Hi {{firstName}},</p><p>Your license document ending in <strong>{{licenseNumber}}</strong> has been approved by our team.</p>'),
    textBody: 'Hi {{firstName}}, Your license document {{licenseNumber}} has been approved.',
    variables: ['firstName', 'licenseNumber'],
    isActive: true,
  },
  [NotificationEventType.LICENSE_REJECTED]: {
    notificationType: NotificationEventType.LICENSE_REJECTED,
    subject: 'License Document Rejected',
    htmlBody: BASE_HTML('License Rejected', '<p>Hi {{firstName}},</p><p>Unfortunately, your uploaded license document ending in <strong>{{licenseNumber}}</strong> was not accepted.</p><p><strong>Reason:</strong> {{reason}}</p>'),
    textBody: 'Hi {{firstName}}, Your license {{licenseNumber}} was rejected. Reason: {{reason}}',
    variables: ['firstName', 'licenseNumber', 'reason'],
    isActive: true,
  },
  [NotificationEventType.BID_RECEIVED]: {
    notificationType: NotificationEventType.BID_RECEIVED,
    subject: 'New Bid on {{jobName}}',
    htmlBody: BASE_HTML('New Bid Received', '<p>Hi {{bossName}},</p><p>You have received a new bid from <strong>{{guardName}}</strong> for your job <strong>{{jobName}}</strong>.</p><p>Bid Amount: ${{amount}}</p><a href="{{dashboardUrl}}" class="btn">View Bid</a>'),
    textBody: 'Hi {{bossName}}, You received a new bid of ${{amount}} from {{guardName}} for {{jobName}}.',
    variables: ['bossName', 'guardName', 'jobName', 'amount', 'dashboardUrl'],
    isActive: true,
  },
  [NotificationEventType.BID_ACCEPTED]: {
    notificationType: NotificationEventType.BID_ACCEPTED,
    subject: 'Bid Accepted: {{jobName}}',
    htmlBody: BASE_HTML('Your Bid Was Accepted!', '<p>Hi {{guardName}},</p><p>Congratulations! <strong>{{bossName}}</strong> has accepted your bid of ${{amount}} for the job <strong>{{jobName}}</strong>.</p><p><strong>Date:</strong> {{date}}<br/><strong>Location:</strong> {{location}}</p>'),
    textBody: 'Hi {{guardName}}, Your bid for {{jobName}} was accepted by {{bossName}} at ${{amount}}.',
    variables: ['guardName', 'bossName', 'jobName', 'amount', 'date', 'location'],
    isActive: true,
  },
  [NotificationEventType.BID_REJECTED]: {
    notificationType: NotificationEventType.BID_REJECTED,
    subject: 'Bid Rejected: {{jobName}}',
    htmlBody: BASE_HTML('Bid Update', '<p>Hi {{guardName}},</p><p>Unfortunately, your bid for the job <strong>{{jobName}}</strong> was not accepted by {{bossName}}.</p><p>Keep applying to other opportunities on GuardMate!</p>'),
    textBody: 'Hi {{guardName}}, Your bid for {{jobName}} was not accepted by {{bossName}}.',
    variables: ['guardName', 'bossName', 'jobName'],
    isActive: true,
  },
  [NotificationEventType.SHIFT_REMINDER]: {
    notificationType: NotificationEventType.SHIFT_REMINDER,
    subject: 'Reminder: Upcoming Shift for {{jobName}}',
    htmlBody: BASE_HTML('Upcoming Shift Reminder', '<p>This is a 24-hour reminder for the upcoming shift <strong>{{jobName}}</strong>.</p><p><strong>Date & Time:</strong> {{date}} at {{time}}<br/><strong>Location:</strong> {{location}}</p><p>Guard: {{guardName}}<br/>Boss: {{bossName}}</p>'),
    textBody: 'Reminder: upcoming shift {{jobName}} tomorrow at {{time}}, {{location}}. Guard: {{guardName}}, Boss: {{bossName}}',
    variables: ['guardName', 'bossName', 'jobName', 'date', 'time', 'location'],
    isActive: true,
  },
  [NotificationEventType.SHIFT_CHECKIN_ALERT]: {
    notificationType: NotificationEventType.SHIFT_CHECKIN_ALERT,
    subject: 'Guard Checked In: {{jobName}}',
    htmlBody: BASE_HTML('Shift Check-In', '<p>Hi {{bossName}},</p><p><strong>{{guardName}}</strong> has checked in for the shift <strong>{{jobName}}</strong> at {{time}}.</p><p><strong>Location:</strong> {{location}}</p>'),
    textBody: 'Hi {{bossName}}, {{guardName}} checked in for {{jobName}} at {{time}} from {{location}}.',
    variables: ['bossName', 'guardName', 'jobName', 'time', 'location'],
    isActive: true,
  },
  [NotificationEventType.SHIFT_CHECKOUT_ALERT]: {
    notificationType: NotificationEventType.SHIFT_CHECKOUT_ALERT,
    subject: 'Guard Checked Out: {{jobName}}',
    htmlBody: BASE_HTML('Shift Check-Out', '<p>Hi {{bossName}},</p><p><strong>{{guardName}}</strong> has checked out of the shift <strong>{{jobName}}</strong> at {{time}}.</p><p><strong>Location:</strong> {{location}}</p>'),
    textBody: 'Hi {{bossName}}, {{guardName}} checked out of {{jobName}} at {{time}} from {{location}}.',
    variables: ['bossName', 'guardName', 'jobName', 'time', 'location'],
    isActive: true,
  },
  [NotificationEventType.SHIFT_APPROVED]: {
    notificationType: NotificationEventType.SHIFT_APPROVED,
    subject: 'Shift Approved: {{jobName}}',
    htmlBody: BASE_HTML('Shift Approved', '<p>Hi {{guardName}},</p><p>Your completed shift for <strong>{{jobName}}</strong> has been approved.</p><p>Payment processing for ${{amount}} will begin shortly.</p>'),
    textBody: 'Hi {{guardName}}, Your shift for {{jobName}} was approved. Payment for ${{amount}} is processing.',
    variables: ['guardName', 'jobName', 'amount'],
    isActive: true,
  },
  [NotificationEventType.PAYMENT_SENT]: {
    notificationType: NotificationEventType.PAYMENT_SENT,
    subject: 'Payment Sent: {{jobName}}',
    htmlBody: BASE_HTML('Payment Processed', '<p>Hi {{guardName}},</p><p>Great news! A payment of <strong>${{amount}}</strong> for the job <strong>{{jobName}}</strong> has been sent to your account.</p>'),
    textBody: 'Hi {{guardName}}, Payment of ${{amount}} for {{jobName}} has been sent.',
    variables: ['guardName', 'jobName', 'amount'],
    isActive: true,
  },
  [NotificationEventType.DISPUTE_RAISED]: {
    notificationType: NotificationEventType.DISPUTE_RAISED,
    subject: 'Dispute Raised: {{jobName}}',
    htmlBody: BASE_HTML('New Dispute Raised', '<p>A dispute has been raised regarding the job <strong>{{jobName}}</strong>.</p><p><strong>Guard:</strong> {{guardName}}<br/><strong>Boss:</strong> {{bossName}}</p><p><strong>Reason:</strong> {{reason}}</p><p>Our admin team is reviewing this and will mediate shortly.</p>'),
    textBody: 'A dispute was raised for {{jobName}}. Reason: {{reason}}. Admin is reviewing.',
    variables: ['jobName', 'guardName', 'bossName', 'reason'],
    isActive: true,
  },
  [NotificationEventType.DISPUTE_RESOLVED]: {
    notificationType: NotificationEventType.DISPUTE_RESOLVED,
    subject: 'Dispute Resolved: {{jobName}}',
    htmlBody: BASE_HTML('Dispute Resolved', '<p>The dispute regarding the job <strong>{{jobName}}</strong> has been resolved by the admin team.</p><p><strong>Resolution:</strong> {{resolution}}</p><p>Guard: {{guardName}}<br/>Boss: {{bossName}}</p>'),
    textBody: 'Dispute for {{jobName}} resolved. Resolution: {{resolution}}',
    variables: ['jobName', 'guardName', 'bossName', 'resolution'],
    isActive: true,
  },
  [NotificationEventType.PASSWORD_RESET]: {
    notificationType: NotificationEventType.PASSWORD_RESET,
    subject: 'Password Reset Request',
    htmlBody: BASE_HTML('Reset Your Password', '<p>Hi {{firstName}},</p><p>We received a request to reset your password. Click the button below to choose a new password.</p><a href="{{dashboardUrl}}" class="btn">Reset Password</a><p>If you did not request this, please ignore this email.</p>'),
    textBody: 'Hi {{firstName}}, reset your password using this link: {{dashboardUrl}}',
    variables: ['firstName', 'dashboardUrl'],
    isActive: true,
  },
  [NotificationEventType.LICENSE_EXPIRY_30_DAYS]: {
    notificationType: NotificationEventType.LICENSE_EXPIRY_30_DAYS,
    subject: 'License Expiring Soon',
    htmlBody: BASE_HTML('License Expiry Notice', '<p>Hi {{firstName}},</p><p>This is a reminder that your license document (ending in {{licenseNumber}}) will expire on <strong>{{expiryDate}}</strong>.</p><p>Please upload a renewed license to avoid any service interruptions.</p>'),
    textBody: 'Hi {{firstName}}, Your license {{licenseNumber}} expires on {{expiryDate}}. Please renew it.',
    variables: ['firstName', 'licenseNumber', 'expiryDate'],
    isActive: true,
  },
  [NotificationEventType.JOB_CANCELLED_BY_BOSS]: {
    notificationType: NotificationEventType.JOB_CANCELLED_BY_BOSS,
    subject: 'Job Cancelled: {{jobTitle}}',
    htmlBody: BASE_HTML('Job Cancelled', '<p>Hi {{guardName}},</p><p>Unfortunately, the job <strong>{{jobTitle}}</strong> scheduled for <strong>{{startDate}}</strong> has been cancelled by the employer.</p><p><strong>Reason:</strong> {{cancelReason}}</p><p>We understand this may be inconvenient. Please browse other available opportunities on GuardMate.</p><a href="{{browseJobsUrl}}" class="btn">Browse Jobs</a>'),
    textBody: 'Hi {{guardName}}, Job "{{jobTitle}}" on {{startDate}} has been cancelled. Reason: {{cancelReason}}. Browse new jobs at {{browseJobsUrl}}',
    variables: ['guardName', 'jobTitle', 'startDate', 'cancelReason', 'browseJobsUrl'],
    isActive: true,
  },
  [NotificationEventType.GUARD_WITHDREW_BID]: {
    notificationType: NotificationEventType.GUARD_WITHDREW_BID,
    subject: 'Guard Withdrawal: {{jobTitle}}',
    htmlBody: BASE_HTML('Guard Withdrawn', '<p>Hi {{bossName}},</p><p>We regret to inform you that <strong>{{guardName}}</strong> has withdrawn from your job <strong>{{jobTitle}}</strong> scheduled for <strong>{{startDate}}</strong>.</p><p>Your job is now open again for new applications. You can review existing bids or wait for new ones.</p><a href="{{dashboardUrl}}" class="btn">View Your Jobs</a>'),
    textBody: 'Hi {{bossName}}, {{guardName}} has withdrawn from "{{jobTitle}}" on {{startDate}}. Your job is now open for new bids.',
    variables: ['bossName', 'guardName', 'jobTitle', 'startDate', 'dashboardUrl'],
    isActive: true,
  },
  [NotificationEventType.JOB_REOPENED_TO_BIDDERS]: {
    notificationType: NotificationEventType.JOB_REOPENED_TO_BIDDERS,
    subject: 'Good News — {{jobTitle}} is Open Again!',
    htmlBody: BASE_HTML('Position Reopened', '<p>Hi {{guardName}},</p><p>Good news — the position for <strong>{{jobTitle}}</strong> is open again. Your previous application has been reconsidered.</p><p>Log in to check your bid status and reapply.</p><a href="{{jobUrl}}" class="btn">View Job</a>'),
    textBody: 'Hi {{guardName}}, The position for "{{jobTitle}}" is open again. Your application has been reconsidered. Check your bid status at {{jobUrl}}',
    variables: ['guardName', 'jobTitle', 'jobUrl'],
    isActive: true,
  },
};
