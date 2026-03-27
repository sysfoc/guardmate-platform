import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job.model';
import Bid from '@/models/Bid.model';
import Shift from '@/models/Shift.model';
import User from '@/models/User.model';
import IncidentReport from '@/models/IncidentReport.model';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import { UserRole, BidStatus } from '@/types/enums';
import { IncidentType, IncidentSeverity } from '@/types/enums';
import { sendIncidentReported } from '@/lib/email/emailTriggers';

/**
 * POST /api/shifts/[jobId]/incident
 * Mate only — submit an incident report.
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
      return createApiResponse(false, null, 'Only Mate accounts can submit incident reports.', 403);
    }

    const body = await request.json();
    const { incidentType, severity, description, location, document: docUrl, photos } = body;

    // Validate required fields
    if (!incidentType || !Object.values(IncidentType).includes(incidentType)) {
      return createApiResponse(false, null, 'Valid incident type is required.', 400);
    }
    if (!severity || !Object.values(IncidentSeverity).includes(severity)) {
      return createApiResponse(false, null, 'Valid severity level is required.', 400);
    }
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return createApiResponse(false, null, 'Description is required.', 400);
    }
    if (description.length > 2000) {
      return createApiResponse(false, null, 'Description must be 2000 characters or less.', 400);
    }

    await connectDB();
    const { jobId } = await params;

    // Verify guard has accepted bid on this job
    const acceptedBid = await Bid.findOne({
      jobId,
      guardUid: user.uid,
      status: BidStatus.ACCEPTED,
    }).lean();

    if (!acceptedBid) {
      return createApiResponse(false, null, 'You do not have an accepted bid on this job.', 403);
    }

    const job = await Job.findOne({ jobId }).lean();
    if (!job) {
      return createApiResponse(false, null, 'Job not found.', 404);
    }

    // Get or create shift reference
    const shift = await Shift.findOne({ jobId }).lean();
    const shiftId = shift?._id?.toString() ?? 'no-shift';

    const incident = await IncidentReport.create({
      jobId,
      shiftId,
      guardUid: user.uid,
      guardName: `${user.firstName} ${user.lastName}`,
      bossUid: job.postedBy,
      jobTitle: job.title,
      incidentType,
      severity,
      description: description.trim(),
      location: location?.trim() || null,
      document: docUrl || null,
      photos: Array.isArray(photos) ? photos : [],
    });

    // Send email to boss
    try {
      const boss = await User.findOne({ uid: job.postedBy }).lean();
      if (boss) {
        await sendIncidentReported(
          boss.email,
          boss.companyName || `${boss.firstName} ${boss.lastName}`,
          `${user.firstName} ${user.lastName}`,
          job.title,
          incidentType,
          severity,
          jobId
        );
      }
    } catch {
      // Email failures must not crash incident submission
    }

    return createApiResponse(true, incident.toObject(), 'Incident report submitted.', 201);
  } catch (error: unknown) {
    console.error('POST /api/shifts/[jobId]/incident error:', error);
    return createApiResponse(false, null, 'Failed to submit incident report.', 500);
  }
}

/**
 * GET /api/shifts/[jobId]/incident
 * Participant only — returns all incident reports for this job.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, 'Unauthorized.', 401);
    }

    const { user } = authResult;
    await connectDB();
    const { jobId } = await params;

    // Verify participant access
    const job = await Job.findOne({ jobId }).lean();
    if (!job) {
      return createApiResponse(false, null, 'Job not found.', 404);
    }

    const isBoss = user.role === UserRole.BOSS && job.postedBy === user.uid;
    const isGuard = user.role === UserRole.MATE && await Bid.exists({
      jobId,
      guardUid: user.uid,
      status: BidStatus.ACCEPTED,
    });

    if (!isBoss && !isGuard) {
      return createApiResponse(false, null, 'You are not a participant on this job.', 403);
    }

    const incidents = await IncidentReport.find({ jobId })
      .sort({ createdAt: -1 })
      .lean();

    return createApiResponse(true, incidents, 'Incident reports retrieved.', 200);
  } catch (error: unknown) {
    console.error('GET /api/shifts/[jobId]/incident error:', error);
    return createApiResponse(false, null, 'Failed to retrieve incident reports.', 500);
  }
}
