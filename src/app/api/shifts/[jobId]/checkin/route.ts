import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job.model';
import Bid from '@/models/Bid.model';
import User from '@/models/User.model';
import Shift from '@/models/Shift.model';
import PlatformSettings from '@/models/PlatformSettings.model';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import { UserRole, JobStatus, BidStatus } from '@/types/enums';
import { calculateDistance } from '@/lib/utils/haversine';
import { sendShiftCheckinAlert } from '@/lib/email/emailTriggers';
import type { ShiftScheduleDay, ShiftSlot } from '@/types/job.types';

/** Get today's date at midnight UTC for consistent daily shift lookups. */
function getTodayMidnightUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Get today's ISO date string (YYYY-MM-DD) */
function getTodayISO(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

/**
 * POST /api/shifts/[jobId]/checkin
 * Mate only — GPS-verified check-in with geofence validation.
 * Creates a new shift record for today (allows daily cycles for multi-day jobs).
 * Validates guard is assigned to a slot for today and is within 30-min check-in window.
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
      return createApiResponse(false, null, 'Only Mate accounts can check in.', 403);
    }

    const body = await request.json();
    const coordinates = body?.coordinates;
    // Client timezone offset in minutes (e.g. -300 for UTC+5, -600 for UTC+10)
    // Date.getTimezoneOffset() returns: UTC - local (in minutes)
    // So for UTC+5 it returns -300, for UTC+10 it returns -600
    const clientTimezoneOffset: number = typeof body?.timezoneOffset === 'number' ? body.timezoneOffset : 0;

    if (!coordinates || typeof coordinates.lat !== 'number' || typeof coordinates.lng !== 'number') {
      return createApiResponse(false, null, 'Valid GPS coordinates are required.', 400);
    }

    await connectDB();
    const { jobId } = await params;

    // Verify job exists and is IN_PROGRESS
    const job = await Job.findOne({ jobId }).lean();
    if (!job) {
      return createApiResponse(false, null, 'Job not found.', 404);
    }
    if (job.status !== JobStatus.IN_PROGRESS) {
      return createApiResponse(false, null, 'Job is not currently in progress.', 400);
    }

    // Verify guard has an ACCEPTED bid
    const acceptedBid = await Bid.findOne({
      jobId,
      guardUid: user.uid,
      status: BidStatus.ACCEPTED,
    }).lean();

    if (!acceptedBid) {
      return createApiResponse(false, null, 'You do not have an accepted bid on this job.', 403);
    }

    // Find guard's assigned slot for today
    // Use client timezone to determine "today" in guard's local time
    const nowUTC = new Date();
    const localNow = new Date(nowUTC.getTime() - clientTimezoneOffset * 60 * 1000);
    const todayISO = `${localNow.getUTCFullYear()}-${String(localNow.getUTCMonth() + 1).padStart(2, '0')}-${String(localNow.getUTCDate()).padStart(2, '0')}`;

    const schedule = job.shiftSchedule as ShiftScheduleDay[] | undefined;
    let assignedSlot: ShiftSlot | null = null;

    if (schedule && schedule.length > 0) {
      const todaySchedule = schedule.find((d) => d.date === todayISO);
      if (todaySchedule) {
        assignedSlot = todaySchedule.slots.find(
          (s: ShiftSlot) => s.assignedGuardUid === user.uid
        ) || null;
      }

      if (!assignedSlot) {
        return createApiResponse(false, null, 'No shift assigned for you today.', 400);
      }

      // Validate 30-min early check-in window
      // Shift times (e.g. "14:35") are in guard's local timezone
      // Convert slot start to UTC for comparison: UTC = local + offset
      const [sh, sm] = assignedSlot.startTime.split(':').map(Number);
      const slotStartLocalMs = Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate(), sh, sm);
      const slotStartUTC = new Date(slotStartLocalMs + clientTimezoneOffset * 60 * 1000);
      const earliestCheckin = new Date(slotStartUTC.getTime() - 30 * 60 * 1000);

      if (nowUTC < earliestCheckin) {
        const earliestLocal = new Date(earliestCheckin.getTime() - clientTimezoneOffset * 60 * 1000);
        const earliestStr = `${String(earliestLocal.getUTCHours()).padStart(2, '0')}:${String(earliestLocal.getUTCMinutes()).padStart(2, '0')}`;
        return createApiResponse(
          false,
          null,
          `Your shift starts at ${assignedSlot.startTime}. Check-in available from ${earliestStr}.`,
          400
        );
      }
    }

    // Check if already checked in TODAY (use local date for midnight)
    const todayMidnightLocal = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate()));
    const existingShift = await Shift.findOne({ jobId, guardUid: user.uid, shiftDate: todayMidnightLocal });
    if (existingShift?.checkInTime) {
      return createApiResponse(false, null, 'You have already checked in for today.', 400);
    }

    // Validate geofence
    if (!job.coordinates) {
      return createApiResponse(false, null, 'Job has no coordinates set. Contact the boss.', 400);
    }

    const settings = await PlatformSettings.findOne().lean();
    // Default to 1000, and if the DB has older settings (like 500), force it up to 1000.
    const radiusMeters = Math.max(settings?.checkInRadiusMeters ?? 1000, 1000);
    const distanceMiles = calculateDistance(
      coordinates.lat,
      coordinates.lng,
      (job.coordinates as { lat: number; lng: number }).lat,
      (job.coordinates as { lat: number; lng: number }).lng
    );
    const distanceMeters = Math.round(distanceMiles * 1609.34);

    if (distanceMeters > radiusMeters) {
      return createApiResponse(
        false,
        null,
        `You are too far from the job location. You must be within ${radiusMeters} meters to check in. Current distance: ${distanceMeters}m`,
        400
      );
    }

    // Create today's shift record (per guard per day)
    const shift = await Shift.findOneAndUpdate(
      { jobId, guardUid: user.uid, shiftDate: todayMidnightLocal },
      {
        $set: {
          guardUid: user.uid,
          bossUid: job.postedBy,
          jobTitle: job.title,
          jobLocation: job.location,
          jobCoordinates: job.coordinates,
          checkInTime: nowUTC,
          checkInCoordinates: coordinates,
          checkInDistance: distanceMeters,
          checkInVerified: true,
        },
        $setOnInsert: {
          jobId,
          shiftDate: todayMidnightLocal,
          locationHistory: [],
          isApprovedByBoss: false,
        },
      },
      { upsert: true, new: true }
    ).lean();

    // Send email notification to boss
    try {
      const boss = await User.findOne({ uid: job.postedBy }).lean();
      if (boss) {
        await sendShiftCheckinAlert(
          boss.email,
          boss.companyName || `${boss.firstName} ${boss.lastName}`,
          `${user.firstName} ${user.lastName}`,
          job.location,
          nowUTC.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          job.title
        );
      }
    } catch {
      // Email failures must not crash check-in
    }

    return createApiResponse(true, shift, 'Checked in successfully.', 200);
  } catch (error: unknown) {
    console.error('POST /api/shifts/[jobId]/checkin error:', error);
    return createApiResponse(false, null, 'Failed to check in.', 500);
  }
}
