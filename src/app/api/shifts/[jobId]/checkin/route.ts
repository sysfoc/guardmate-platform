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

/** Get today's date at midnight UTC for consistent daily shift lookups. */
function getTodayMidnightUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * POST /api/shifts/[jobId]/checkin
 * Mate only — GPS-verified check-in with geofence validation.
 * Creates a new shift record for today (allows daily cycles for multi-day jobs).
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

    // Check if already checked in TODAY
    const today = getTodayMidnightUTC();
    const existingShift = await Shift.findOne({ jobId, shiftDate: today });
    if (existingShift?.checkInTime) {
      return createApiResponse(false, null, 'You have already checked in for today.', 400);
    }

    // Validate geofence
    if (!job.coordinates) {
      return createApiResponse(false, null, 'Job has no coordinates set. Contact the boss.', 400);
    }

    const settings = await PlatformSettings.findOne().lean();
    const radiusMeters = settings?.checkInRadiusMeters ?? 1000;
    // 1000 meters = 0.621371 miles, 500 kr dena previously 500 meters ka radius tha
    const distanceMiles = calculateDistance(
      coordinates.lat,
      coordinates.lng,
      job.coordinates.lat,
      job.coordinates.lng
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

    const now = new Date();

    // Create today's shift record (or update if partially exists)
    const shift = await Shift.findOneAndUpdate(
      { jobId, shiftDate: today },
      {
        $set: {
          guardUid: user.uid,
          bossUid: job.postedBy,
          jobTitle: job.title,
          jobLocation: job.location,
          jobCoordinates: job.coordinates,
          checkInTime: now,
          checkInCoordinates: coordinates,
          checkInDistance: distanceMeters,
          checkInVerified: true,
        },
        $setOnInsert: {
          jobId,
          shiftDate: today,
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
          now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
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
