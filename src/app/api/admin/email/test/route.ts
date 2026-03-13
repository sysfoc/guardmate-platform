import { NextRequest } from 'next/server';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import EmailSettings from '@/models/EmailSettings.model';
import { UserRole } from '@/types/enums';
import { createNodemailerClient } from '@/lib/email/nodemailerClient';

export async function POST(request: NextRequest) {
  const auth = await verifyAndGetUser(request);
  if (!auth || auth.user.role !== UserRole.ADMIN) {
    return createApiResponse(false, null, 'Unauthorized', 403);
  }

  try {
    await connectDB();
    const settings = await EmailSettings.findOne().lean();

    if (!settings || !settings.gmailUser || !settings.gmailAppPassword) {
      return createApiResponse(false, null, 'Email settings missing or incomplete. Please save configuration first.', 400);
    }

    const transporter = createNodemailerClient(settings.gmailUser, settings.gmailAppPassword);

    // Verify SMTP connection config
    await transporter.verify();

    // Send the test email
    await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail || settings.gmailUser}>`,
      to: settings.gmailUser,
      replyTo: settings.replyTo || undefined,
      subject: 'GuardMate SMTP Test',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
          <h2 style="color: #0f172a;">SMTP Configuration Successful</h2>
          <p>Your GuardMate email notifications are configured correctly.</p>
        </div>
      `,
    });

    return createApiResponse(true, null, 'Test email sent successfully.', 200);
  } catch (error: any) {
    console.error('Error sending test email:', error);
    return createApiResponse(false, null, error.message || 'Failed to send test email', 500);
  }
}
