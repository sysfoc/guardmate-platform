import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Shift from '@/models/Shift.model';
import Bid from '@/models/Bid.model';
import Job from '@/models/Job.model';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import { BidStatus, UserRole } from '@/types/enums';

/** Get today's date at midnight UTC. */
function getTodayMidnightUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * GET /api/shifts/[jobId]
 * Authenticated participant only — returns today's shift + all shifts + total hours.
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

    // Fetch all shifts for this job, sorted by date ascending
    const allShifts = await Shift.find({ jobId }).sort({ shiftDate: 1 }).lean();
    
    // Calculate total hours across all days
    const totalHoursAllDays = allShifts.reduce((sum, s) => sum + (s.totalHoursWorked || 0), 0);
    
    // Find today's specific shift record
    const today = getTodayMidnightUTC();
    const todayShift = allShifts.find(s => 
      new Date(s.shiftDate as Date).getTime() === today.getTime()
    ) || null;

    return createApiResponse(true, {
      todayShift,
      allShifts,
      totalHoursAllDays: Math.round(totalHoursAllDays * 100) / 100
    }, 'Shift data retrieved.', 200);
  } catch (error: unknown) {
    console.error('GET /api/shifts/[jobId] error:', error);
    return createApiResponse(false, null, 'Failed to retrieve shift data.', 500);
  }
}
