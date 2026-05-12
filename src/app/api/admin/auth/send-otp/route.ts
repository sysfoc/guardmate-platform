import { NextRequest } from 'next/server';
import { createApiResponse } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User.model';
import AdminOtp from '@/models/AdminOtp.model';
import { UserRole } from '@/types/enums';
import crypto from 'crypto';

// ─── POST /api/admin/auth/send-otp ────────────────────────────────────────────
// Re-send OTP during admin login (rate-limited to 1 per 60 seconds)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return createApiResponse(false, null, 'Email is required.', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    await connectDB();

    // ── 1. Verify this email belongs to an admin ──────────────────────────────
    const user = await User.findOne({ email: normalizedEmail, role: UserRole.ADMIN });
    
    // SECURITY: Generic error for non-admin or non-existent users
    if (!user) {
      return createApiResponse(false, null, 'If this email is registered as an admin, a new code has been sent.', 200);
    }

    // ── 2. Rate limit: check for recently sent OTP (within 60 seconds) ────────
    const recentOtp = await AdminOtp.findOne({
      email: normalizedEmail,
      used: false,
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) },
    });

    if (recentOtp) {
      return createApiResponse(false, null, 'Please wait 60 seconds before requesting a new code.', 429);
    }

    // ── 3. Invalidate previous OTPs ───────────────────────────────────────────
    await AdminOtp.updateMany(
      { email: normalizedEmail, used: false },
      { $set: { used: true } }
    );

    // ── 4. Generate and store new OTP ─────────────────────────────────────────
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await AdminOtp.create({
      email: normalizedEmail,
      code: otpCode,
      expiresAt,
      attempts: 0,
      used: false,
    });

    // ── 5. Send OTP via email ─────────────────────────────────────────────────
    try {
      const { sendAdminOtp } = await import('@/lib/email/emailTriggers');
      await sendAdminOtp(normalizedEmail, otpCode);
    } catch (emailErr) {
      console.error('Failed to send OTP email:', emailErr);
      // Try direct SMTP fallback
      try {
        const dbConnect = (await import('@/lib/mongodb')).default;
        await dbConnect();
        const EmailSettings = (await import('@/models/EmailSettings.model')).default;
        const settings = await EmailSettings.findOne().lean();
        if (settings?.gmailUser && settings?.gmailAppPassword) {
          const { createNodemailerClient } = await import('@/lib/email/nodemailerClient');
          const transporter = createNodemailerClient(settings.gmailUser, settings.gmailAppPassword);
          await transporter.sendMail({
            from: `"GuardMate Admin" <${settings.gmailUser}>`,
            to: normalizedEmail,
            subject: `Your GuardMate Admin Login Code: ${otpCode}`,
            text: `Your one-time login code is: ${otpCode}\n\nThis code expires in 5 minutes.`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 12px;">
                <h2 style="color: #1e293b; margin-bottom: 8px;">Admin Login Verification</h2>
                <p style="color: #64748b; font-size: 14px;">Enter this code to complete your admin login:</p>
                <div style="background: #1e293b; color: #fff; font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; border-radius: 8px; margin: 24px 0;">
                  ${otpCode}
                </div>
                <p style="color: #94a3b8; font-size: 12px;">This code expires in 5 minutes. Do not share it.</p>
              </div>
            `,
          });
        }
      } catch (fallbackErr) {
        console.error('Direct SMTP fallback also failed:', fallbackErr);
      }
    }

    return createApiResponse(true, {
      otpSent: true,
      expiresIn: 300,
    }, 'A new verification code has been sent to your email.', 200);

  } catch (error: unknown) {
    console.error('POST /api/admin/auth/send-otp error:', error);
    return createApiResponse(false, null, 'Failed to send verification code.', 500);
  }
}
