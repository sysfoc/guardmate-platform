import { NextRequest } from 'next/server';
import { createApiResponse, getClientIp, getDeviceInfo } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User.model';
import AdminOtp from '@/models/AdminOtp.model';
import { UserRole } from '@/types/enums';
import { adminAuth } from '@/lib/firebase/firebaseAdmin';
import crypto from 'crypto';

// ─── Helper: Send OTP via direct SMTP (bypasses template system for reliability) ──
async function sendOtpEmail(email: string, code: string) {
  try {
    const { sendAdminOtp } = await import('@/lib/email/emailTriggers');
    await sendAdminOtp(email, code);
  } catch (err) {
    // Fallback: send raw email via nodemailer if template system fails
    console.error('Admin OTP email via template failed, trying direct SMTP:', err);
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
          to: email,
          subject: `Your GuardMate Admin Login Code: ${code}`,
          text: `Your one-time login code is: ${code}\n\nThis code expires in 5 minutes. Do not share it with anyone.\n\nIf you did not request this, please ignore this email.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 12px;">
              <h2 style="color: #1e293b; margin-bottom: 8px;">Admin Login Verification</h2>
              <p style="color: #64748b; font-size: 14px;">Enter this code to complete your admin login:</p>
              <div style="background: #1e293b; color: #fff; font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; border-radius: 8px; margin: 24px 0;">
                ${code}
              </div>
              <p style="color: #94a3b8; font-size: 12px;">This code expires in 5 minutes. Do not share it.</p>
              <p style="color: #94a3b8; font-size: 12px;">If you did not request this, please ignore this email.</p>
            </div>
          `,
        });
      }
    } catch (fallbackErr) {
      console.error('Admin OTP direct SMTP also failed:', fallbackErr);
      throw new Error('Failed to send OTP email. Please check SMTP configuration.');
    }
  }
}

// ─── POST /api/admin/auth/login ───────────────────────────────────────────────
// Step 1 of admin login: validate credentials, send OTP to email
// Does NOT create a Firebase session — that happens after OTP verification

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return createApiResponse(false, null, 'Email and password are required.', 400);
    }

    await connectDB();

    // ── 1. Check if this email belongs to an ADMIN in MongoDB ─────────────────
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    // SECURITY: Use generic error for ALL failures — don't leak whether email exists or role
    const GENERIC_ERROR = 'Invalid credentials or insufficient permissions.';

    if (!user || user.role !== UserRole.ADMIN) {
      return createApiResponse(false, null, GENERIC_ERROR, 401);
    }

    // ── 2. Verify password via Firebase Admin SDK ─────────────────────────────
    // We use Firebase REST API to verify email+password server-side
    const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!FIREBASE_API_KEY) {
      console.error('NEXT_PUBLIC_FIREBASE_API_KEY not set');
      return createApiResponse(false, null, 'Server configuration error.', 500);
    }

    const firebaseResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
          returnSecureToken: true,
        }),
      }
    );

    if (!firebaseResponse.ok) {
      return createApiResponse(false, null, GENERIC_ERROR, 401);
    }

    // ── 3. Generate 6-digit OTP ───────────────────────────────────────────────
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Invalidate any existing OTPs for this email
    await AdminOtp.updateMany(
      { email: email.toLowerCase().trim(), used: false },
      { $set: { used: true } }
    );

    // Create new OTP
    await AdminOtp.create({
      email: email.toLowerCase().trim(),
      code: otpCode,
      expiresAt,
      attempts: 0,
      used: false,
    });

    // ── 4. Send OTP via email ─────────────────────────────────────────────────
    await sendOtpEmail(email.toLowerCase().trim(), otpCode);

    // ── 5. Log the login attempt ──────────────────────────────────────────────
    const ip = getClientIp(request);
    const { device, userAgent } = getDeviceInfo(request);

    // Update login history (but don't complete the login yet — OTP pending)
    await User.updateOne(
      { uid: user.uid },
      {
        $push: {
          loginHistory: {
            $each: [{
              ip,
              device,
              userAgent,
              timestamp: new Date(),
              success: false, // Will be updated to true after OTP verification
            }],
            $slice: -50, // Keep last 50 entries
          },
        },
      }
    );

    return createApiResponse(true, {
      otpSent: true,
      email: email.toLowerCase().trim(),
      expiresIn: 300, // 5 minutes in seconds
    }, 'Verification code sent to your email.', 200);

  } catch (error: unknown) {
    console.error('POST /api/admin/auth/login error:', error);
    return createApiResponse(false, null, 'An error occurred during login.', 500);
  }
}
