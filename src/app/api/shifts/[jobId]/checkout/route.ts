import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Shift from '@/models/Shift.model';
import User from '@/models/User.model';
import Job from '@/models/Job.model';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import { UserRole } from '@/types/enums';
import { sendShiftCheckoutAlert } from '@/lib/email/emailTriggers';

/** Get today's date at midnight UTC. */
function getTodayMidnightUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * POST /api/shifts/[jobId]/checkout
 * Mate only — check out from today's active shift.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, 'Unauthorized.', 401);
    }

    const { user } = authResult;
    if (user.role !== UserRole.MATE) {
      return createApiResponse(false, null, 'Only Mate accounts can check out.', 403);
    }

    const body = await request.json();
    const coordinates = body?.coordinates;

    if (!coordinates || typeof coordinates.lat !== 'number' || typeof coordinates.lng !== 'number') {
      return createApiResponse(false, null, 'Valid GPS coordinates are required.', 400);
    }

    await connectDB();
    const { jobId } = await params;

    // Find the currently active shift (checked in but not checked out)
    // We do NOT filter by shiftDate so night shifts spanning midnight UTC work seamlessly.
    const shift = await Shift.findOne({ 
      jobId, 
      guardUid: user.uid, 
      checkInTime: { $ne: null }, 
      checkOutTime: null 
    }).sort({ checkInTime: -1 });

    if (!shift) {
      return createApiResponse(false, null, 'No active shift found to check out of.', 404);
    }

    if (shift.checkOutTime) {
      return createApiResponse(false, null, 'You have already checked out today.', 400);
    }

    const now = new Date();
    const checkInDate = new Date(shift.checkInTime as string | Date);
    const hoursWorked = Math.round(((now.getTime() - checkInDate.getTime()) / (1000 * 60 * 60)) * 100) / 100;

    shift.checkOutTime = now;
    shift.checkOutCoordinates = coordinates;
    shift.totalHoursWorked = hoursWorked;
    await shift.save();

    const updatedShift = shift.toObject();

    // Send email to boss
    try {
      const job = await Job.findOne({ jobId }).lean();
      const boss = await User.findOne({ uid: shift.bossUid }).lean();
      if (boss && job) {
        await sendShiftCheckoutAlert(
          boss.email,
          boss.companyName || `${boss.firstName} ${boss.lastName}`,
          `${user.firstName} ${user.lastName}`,
          job.location,
          now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          job.title
        );
      }
    } catch {
      // Email failures must not crash checkout
    }

    return createApiResponse(true, updatedShift, 'Checked out successfully.', 200);
  } catch (error: unknown) {
    console.error('POST /api/shifts/[jobId]/checkout error:', error);
    return createApiResponse(false, null, 'Failed to check out.', 500);
  }
}
