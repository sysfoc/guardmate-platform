import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job.model';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import { JobStatus, UserRole } from '@/types/enums';
import { processJobLifecycle } from '@/lib/jobs/jobLifecycle';
import {
  isOvernightShift,
  calculateShiftDuration,
  getActualEndDate,
  calculateTotalScheduledHours,
} from '@/lib/utils/shiftCalculations';
import type { ShiftScheduleDay } from '@/types/job.types';

/**
 * GET /api/jobs/[jobId]
 * Single job detail — increment viewCount.
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

    // Run lifecycle transitions silently in background
    processJobLifecycle().catch(() => {});

    const { jobId } = await params;

    // Only increment viewCount if this user hasn't viewed before
    const existing = await Job.findOne({ jobId }).lean();
    if (!existing) {
      return createApiResponse(false, null, 'Job not found.', 404);
    }

    const alreadyViewed = (existing.viewedBy || []).includes(user.uid);

    const job = alreadyViewed
      ? existing
      : await Job.findOneAndUpdate(
          { jobId },
          { $inc: { viewCount: 1 }, $addToSet: { viewedBy: user.uid } },
          { new: true }
        ).lean();

    return createApiResponse(true, job, 'Job fetched successfully.', 200);
  } catch (error: unknown) {
    console.error('GET /api/jobs/[jobId] error:', error);
    return createApiResponse(false, null, 'Failed to fetch job.', 500);
  }
}

/**
 * PATCH /api/jobs/[jobId]
 * Boss only — update job (only if status is DRAFT or OPEN).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, 'Unauthorized.', 401);
    }

    const { user } = authResult;
    if (user.role !== UserRole.BOSS) {
      return createApiResponse(false, null, 'Only Boss accounts can update jobs.', 403);
    }

    await connectDB();
    const { jobId } = await params;

    const job = await Job.findOne({ jobId });
    if (!job) {
      return createApiResponse(false, null, 'Job not found.', 404);
    }

    if (job.postedBy !== user.uid) {
      return createApiResponse(false, null, 'You can only update your own jobs.', 403);
    }

    if (job.status !== JobStatus.DRAFT && job.status !== JobStatus.OPEN) {
      return createApiResponse(false, null, `Cannot update a job with status ${job.status}.`, 400);
    }

    const body = await request.json();

    // Recalculate schedule if shiftSchedule changed
    if (body.shiftSchedule && Array.isArray(body.shiftSchedule)) {
      body.shiftSchedule = body.shiftSchedule.map((day: ShiftScheduleDay) => ({
        date: day.date,
        slots: day.slots.map((slot) => {
          const overnight = isOvernightShift(slot.startTime, slot.endTime);
          const duration = calculateShiftDuration(slot.startTime, slot.endTime);
          const endDate = getActualEndDate(day.date, slot.startTime, slot.endTime);
          return {
            slotNumber: slot.slotNumber,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isOvernight: overnight,
            actualEndDate: endDate,
            durationHours: duration,
            assignedGuardUid: slot.assignedGuardUid || null,
          };
        }),
      }));
      body.totalScheduledHours = calculateTotalScheduledHours(body.shiftSchedule);
      body.totalHours = body.totalScheduledHours;
    } else if (body.startDate || body.endDate || body.startTime || body.endTime) {
      // Legacy fallback recalculation
      const sTime = body.startTime || job.startTime;
      const eTime = body.endTime || job.endTime;
      if (sTime && eTime) {
        const sDate = new Date(body.startDate || job.startDate);
        const eDate = new Date(body.endDate || job.endDate);
        const days = Math.max(1, Math.ceil((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        const duration = calculateShiftDuration(sTime, eTime);
        body.totalHours = Math.round(days * duration * 10) / 10;
      }
    }

    // Prevent status change via this route (only DRAFT ↔ OPEN allowed)
    if (body.status && body.status !== JobStatus.DRAFT && body.status !== JobStatus.OPEN) {
      delete body.status;
    }

    const updatedJob = await Job.findOneAndUpdate(
      { jobId },
      { $set: body },
      { new: true }
    ).lean();

    return createApiResponse(true, updatedJob, 'Job updated successfully.', 200);
  } catch (error: unknown) {
    console.error('PATCH /api/jobs/[jobId] error:', error);
    return createApiResponse(false, null, 'Failed to update job.', 500);
  }
}

/**
 * DELETE /api/jobs/[jobId]
 * Boss only — soft delete by setting status to CANCELLED.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, 'Unauthorized.', 401);
    }

    const { user } = authResult;
    if (user.role !== UserRole.BOSS) {
      return createApiResponse(false, null, 'Only Boss accounts can cancel jobs.', 403);
    }

    await connectDB();
    const { jobId } = await params;

    const job = await Job.findOne({ jobId });
    if (!job) {
      return createApiResponse(false, null, 'Job not found.', 404);
    }

    if (job.postedBy !== user.uid) {
      return createApiResponse(false, null, 'You can only cancel your own jobs.', 403);
    }

    if (job.status === JobStatus.CANCELLED) {
      return createApiResponse(false, null, 'Job is already cancelled.', 400);
    }

    let cancelReason = 'Cancelled by employer';
    try {
      const body = await request.json();
      if (body.cancelReason) cancelReason = body.cancelReason;
    } catch {
      // No body provided — use default reason
    }

    const wasOpen = job.status === JobStatus.OPEN;

    const updatedJob = await Job.findOneAndUpdate(
      { jobId },
      {
        $set: {
          status: JobStatus.CANCELLED,
          cancelReason,
          cancelledAt: new Date(),
        },
      },
      { new: true }
    ).lean();

    // Update boss stats
    if (wasOpen) {
      await (await import('@/models/User.model')).default.updateOne(
        { uid: user.uid },
        { $inc: { activeJobsCount: -1, cancelledJobsCount: 1 } }
      );
    }

    return createApiResponse(true, updatedJob, 'Job cancelled successfully.', 200);
  } catch (error: unknown) {
    console.error('DELETE /api/jobs/[jobId] error:', error);
    return createApiResponse(false, null, 'Failed to cancel job.', 500);
  }
}
