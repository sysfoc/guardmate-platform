import { NextRequest } from 'next/server';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User.model';
import AdminInvite from '@/models/AdminInvite.model';
import { UserRole, AdminLevel } from '@/types/enums';
import crypto from 'crypto';

// ─── POST /api/admin/auth/invite ──────────────────────────────────────────────
// SUPER admins can invite new admins via email

export async function POST(request: NextRequest) {
  const auth = await verifyAndGetUser(request);
  if (!auth || auth.user.role !== UserRole.ADMIN) {
    return createApiResponse(false, null, 'Unauthorized — Admin access required.', 403);
  }

  // Only SUPER admins can invite
  if (auth.user.adminLevel !== AdminLevel.SUPER) {
    return createApiResponse(false, null, 'Only Super Admins can invite new administrators.', 403);
  }

  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !email.trim()) {
      return createApiResponse(false, null, 'Email address is required.', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return createApiResponse(false, null, 'Please provide a valid email address.', 400);
    }

    await connectDB();

    // ── 1. Check if this email is already an admin ────────────────────────────
    const existingAdmin = await User.findOne({
      email: normalizedEmail,
      role: UserRole.ADMIN,
    });

    if (existingAdmin) {
      return createApiResponse(false, null, 'This email is already registered as an admin.', 409);
    }

    // ── 2. Check for existing unused invite ───────────────────────────────────
    const existingInvite = await AdminInvite.findOne({
      email: normalizedEmail,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (existingInvite) {
      return createApiResponse(false, null, 'An active invitation already exists for this email. It expires in ' +
        Math.ceil((existingInvite.expiresAt.getTime() - Date.now()) / (60 * 60 * 1000)) + ' hours.', 409);
    }

    // ── 3. Generate invite token ──────────────────────────────────────────────
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await AdminInvite.create({
      email: normalizedEmail,
      invitedBy: auth.user.uid,
      invitedByName: `${auth.user.firstName} ${auth.user.lastName}`,
      token,
      expiresAt,
      used: false,
    });

    // ── 4. Send invite email ──────────────────────────────────────────────────
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/register?token=${token}`;

    try {
      const { sendAdminInvite } = await import('@/lib/email/emailTriggers');
      await sendAdminInvite(
        normalizedEmail,
        `${auth.user.firstName} ${auth.user.lastName}`,
        inviteUrl
      );
    } catch (emailErr) {
      console.error('Failed to send invite via template, trying direct SMTP:', emailErr);
      // Direct SMTP fallback
      try {
        const EmailSettings = (await import('@/models/EmailSettings.model')).default;
        const settings = await EmailSettings.findOne().lean();
        if (settings?.gmailUser && settings?.gmailAppPassword) {
          const { createNodemailerClient } = await import('@/lib/email/nodemailerClient');
          const transporter = createNodemailerClient(settings.gmailUser, settings.gmailAppPassword);
          await transporter.sendMail({
            from: `"GuardMate" <${settings.gmailUser}>`,
            to: normalizedEmail,
            subject: 'You\'ve been invited to join GuardMate as an Admin',
            text: `${auth.user.firstName} ${auth.user.lastName} has invited you to join GuardMate as an administrator.\n\nClick the link below to create your admin account:\n${inviteUrl}\n\nThis invitation expires in 24 hours.`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px; background: #f8fafc; border-radius: 12px;">
                <div style="text-align: center; margin-bottom: 32px;">
                  <div style="display: inline-block; background: #6366f1; color: white; font-weight: bold; font-size: 18px; width: 40px; height: 40px; line-height: 40px; border-radius: 10px;">G</div>
                  <h1 style="color: #1e293b; font-size: 24px; margin: 16px 0 4px;">Admin Invitation</h1>
                </div>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                  <strong>${auth.user.firstName} ${auth.user.lastName}</strong> has invited you to join the GuardMate platform as an administrator.
                </p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${inviteUrl}" style="display: inline-block; background: #6366f1; color: white; font-weight: bold; font-size: 15px; padding: 14px 32px; border-radius: 8px; text-decoration: none;">
                    Accept Invitation
                  </a>
                </div>
                <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                  This invitation expires in 24 hours. If you didn't expect this, please ignore this email.
                </p>
              </div>
            `,
          });
        }
      } catch (fallbackErr) {
        console.error('Direct SMTP fallback also failed:', fallbackErr);
      }
    }

    // ── 5. Log admin activity ─────────────────────────────────────────────────
    try {
      const AdminActivity = (await import('@/models/AdminActivity.model')).default;
      const { AdminActionType } = await import('@/types/admin.types');
      const { getClientIp, getDeviceInfo } = await import('@/lib/serverAuth');
      
      await AdminActivity.create({
        adminUid: auth.user.uid,
        adminName: `${auth.user.firstName} ${auth.user.lastName}`,
        actionType: AdminActionType.ADMIN_INVITE,
        targetType: 'USER',
        targetId: normalizedEmail,
        targetName: normalizedEmail,
        details: `Invited ${normalizedEmail} to become an admin`,
        ipAddress: getClientIp(request),
        userAgent: getDeviceInfo(request).userAgent,
      });
    } catch (logErr) {
      // Non-fatal
      console.warn('Failed to log admin invite activity:', logErr);
    }

    return createApiResponse(true, {
      email: normalizedEmail,
      expiresAt,
    }, `Invitation sent to ${normalizedEmail}.`, 201);

  } catch (error: unknown) {
    console.error('POST /api/admin/auth/invite error:', error);
    return createApiResponse(false, null, 'Failed to send invitation.', 500);
  }
}
