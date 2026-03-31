import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job.model';
import User from '@/models/User.model';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import { UserRole, JobStatus, HiringStatus } from '@/types/enums';
import { doSlotsOverlap } from '@/lib/utils/shiftCalculations';
import { sendShiftAssigned } from '@/lib/email/emailTriggers';
import type { IJob, ShiftScheduleDay, ShiftSlot, AcceptedGuard, ShiftAssignment } from '@/types/job.types';

/**
 * PATCH /api/jobs/[jobId]/assign-shifts
 * Boss only — assign guards to specific shift slots after all guards hired.
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
      return createApiResponse(false, null, 'Only Boss accounts can assign shifts.', 403);
    }

    await connectDB();
    const { jobId } = await params;

    const job = (await Job.findOne({ jobId }).lean()) as IJob | null;
    if (!job) {
      return createApiResponse(false, null, 'Job not found.', 404);
    }

    if (job.postedBy !== user.uid) {
      return createApiResponse(false, null, 'You can only manage your own jobs.', 403);
    }

    if (job.hiringStatus !== HiringStatus.FULLY_HIRED || job.status !== JobStatus.FILLED) {
      return createApiResponse(false, null, 'Shifts can only be assigned when all guards are hired.', 400);
    }



    const body = await request.json();
    const assignments: ShiftAssignment[] = body.assignments;

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return createApiResponse(false, null, 'No assignments provided.', 400);
    }

    const acceptedGuardUids = (job.acceptedGuards as AcceptedGuard[]).map((g) => g.guardUid);

    // Validate all assignments
    for (const assignment of assignments) {
      if (!acceptedGuardUids.includes(assignment.guardUid)) {
        return createApiResponse(false, null, `Guard ${assignment.guardUid} is not in the accepted guards list.`, 400);
      }
    }

    // Check for same-day overlaps for same guard
    const guardDaySlots: Record<string, { startTime: string; endTime: string }[]> = {};
    const schedule = job.shiftSchedule as ShiftScheduleDay[];

    for (const assignment of assignments) {
      const day = schedule.find((d) => d.date === assignment.date);
      if (!day) {
        return createApiResponse(false, null, `Date ${assignment.date} not found in schedule.`, 400);
      }
      const slot = day.slots.find((s: ShiftSlot) => s.slotNumber === assignment.slotNumber);
      if (!slot) {
        return createApiResponse(false, null, `Slot ${assignment.slotNumber} not found on ${assignment.date}.`, 400);
      }

      const key = `${assignment.guardUid}_${assignment.date}`;
      if (!guardDaySlots[key]) guardDaySlots[key] = [];

      // Check overlap with existing assignments for this guard on this day
      for (const existing of guardDaySlots[key]) {
        if (doSlotsOverlap(slot.startTime, slot.endTime, existing.startTime, existing.endTime)) {
          return createApiResponse(
            false,
            null,
            `Guard ${assignment.guardUid} has overlapping shifts on ${assignment.date}: ${slot.startTime}-${slot.endTime} conflicts with ${existing.startTime}-${existing.endTime}.`,
            400
          );
        }
      }
      guardDaySlots[key].push({ startTime: slot.startTime, endTime: slot.endTime });
    }

    // Apply assignments to the schedule
    const updatedSchedule = schedule.map((day) => ({
      ...day,
      slots: (day.slots as ShiftSlot[]).map((slot) => {
        const assignment = assignments.find(
          (a: ShiftAssignment) => a.date === day.date && a.slotNumber === slot.slotNumber
        );
        return {
          ...slot,
          assignedGuardUid: assignment ? assignment.guardUid : slot.assignedGuardUid,
        };
      }),
    }));

    // Check if all slots are assigned
    const allAssigned = updatedSchedule.every((day) =>
      day.slots.every((slot: ShiftSlot) => slot.assignedGuardUid !== null)
    );

    await Job.updateOne(
      { jobId },
      {
        $set: {
          shiftSchedule: updatedSchedule,
          isShiftAssigned: allAssigned,
        },
      }
    );

    // Send email to each assigned guard with their specific slots
    if (allAssigned) {
      const guardSlotsMap: Record<string, { date: string; startTime: string; endTime: string; isOvernight: boolean }[]> = {};

      for (const day of updatedSchedule) {
        for (const slot of day.slots) {
          if (slot.assignedGuardUid) {
            if (!guardSlotsMap[slot.assignedGuardUid]) guardSlotsMap[slot.assignedGuardUid] = [];
            guardSlotsMap[slot.assignedGuardUid].push({
              date: day.date,
              startTime: slot.startTime,
              endTime: slot.endTime,
              isOvernight: slot.isOvernight,
            });
          }
        }
      }

      for (const [guardUid, slots] of Object.entries(guardSlotsMap)) {
        try {
          const guard = await User.findOne({ uid: guardUid }).lean();
          if (guard?.email) {
            const accepted = (job.acceptedGuards as AcceptedGuard[]).find((g) => g.guardUid === guardUid);
            await sendShiftAssigned(
              guard.email,
              accepted?.guardName || guard.firstName || 'Guard',
              job.title,
              slots
            );
          }
        } catch (emailErr) {
          console.warn(`Failed to send shift assigned email to ${guardUid}:`, emailErr);
        }
      }
    }

    const updatedJob = await Job.findOne({ jobId }).lean();

    return createApiResponse(
      true,
      updatedJob,
      allAssigned ? 'All shifts assigned successfully!' : 'Shift assignments updated.',
      200
    );
  } catch (error: unknown) {
    console.error('PATCH /api/jobs/[jobId]/assign-shifts error:', error);
    return createApiResponse(false, null, 'Failed to assign shifts.', 500);
  }
}
