import dbConnect from '@/lib/mongodb';
import EmailSettings, { EmailSettingsDocument } from '@/models/EmailSettings.model';
import EmailTemplate, { EmailTemplateDocument } from '@/models/EmailTemplate.model';
import { createNodemailerClient } from './nodemailerClient';
import { NotificationEventType } from '@/types/email.types';

interface SendEmailOptions {
  to: string | string[];
  notificationType: NotificationEventType;
  variables: Record<string, string | number>;
}

export const sendEmail = async ({ to, notificationType, variables }: SendEmailOptions) => {
  try {
    await dbConnect();

    const settings = await EmailSettings.findOne().lean() as EmailSettingsDocument | null;

    if (!settings || !settings.isConfigured || !settings.gmailUser || !settings.gmailAppPassword) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ sendEmail skipped: Email system is not configured.');
      }
      return;
    }

    if (!settings.notifications || !settings.notifications[notificationType]) {
      if (process.env.NODE_ENV === 'development') {
        console.info(`ℹ️ sendEmail skipped: Notification type '${notificationType}' is disabled.`);
      }
      return;
    }

    const template = await EmailTemplate.findOne({ notificationType }).lean() as EmailTemplateDocument | null;

    if (!template || !template.isActive) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`⚠️ sendEmail skipped: Template for '${notificationType}' not found or inactive.`);
      }
      return;
    }

    let htmlBody = template.htmlBody;
    let textBody = template.textBody;
    let subject = template.subject;

    // Apply variables replacing {{variableName}}
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{(?:\\s+)?${key}(?:\\s+)?}}`, 'g');
      const valStr = String(value);
      htmlBody = htmlBody.replace(regex, valStr);
      textBody = textBody.replace(regex, valStr);
      subject = subject.replace(regex, valStr);
    }

    const transporter = createNodemailerClient(settings.gmailUser, settings.gmailAppPassword);

    const mailOptions = {
      from: `"${settings.fromName}" <${settings.fromEmail || settings.gmailUser}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      replyTo: settings.replyTo || undefined,
      subject,
      text: textBody,
      html: htmlBody,
    };

    await transporter.sendMail(mailOptions);

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Email sent successfully [${notificationType}] to: ${to}`);
    }

  } catch (error) {
    // We catch and log everywhere to never crash the main application
    console.error(`❌ Failed to send email [${notificationType}]:`, error);
  }
};
