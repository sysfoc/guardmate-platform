import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Shift from '@/models/Shift.model';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import { UserRole } from '@/types/enums';

/** Get today's date at midnight UTC. */
function getTodayMidnightUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * POST /api/shifts/[jobId]/location
 * Mate only — push live GPS coordinates to today's active shift.
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
      return createApiResponse(false, null, 'Only guards can push location updates.', 403);
    }

    const body = await request.json();
    const { coordinates, timestamp } = body;

    if (!coordinates || typeof coordinates.lat !== 'number' || typeof coordinates.lng !== 'number') {
      return createApiResponse(false, null, 'Valid coordinates are required.', 400);
    }

    await connectDB();
    const { jobId } = await params;
    
    // Update the currently active shift (checked in but not checked out)
    // We do NOT filter by shiftDate to support night shifts spanning midnight UTC.
    const shift = await Shift.findOneAndUpdate(
      { jobId, guardUid: user.uid, checkInTime: { $ne: null }, checkOutTime: null },
      {
        $push: {
          locationHistory: {
            lat: coordinates.lat,
            lng: coordinates.lng,
            timestamp: timestamp || new Date().toISOString(),
          },
        },
      },
      { new: true }
    ).lean();

    if (!shift) {
      // It's possible the guard hasn't checked in today yet, or already checked out.
      return createApiResponse(false, null, 'No active shift found for today to update location.', 404);
    }

    return createApiResponse(true, { lat: coordinates.lat, lng: coordinates.lng }, 'Location updated.', 200);
  } catch (error: unknown) {
    console.error('POST /api/shifts/[jobId]/location error:', error);
    return createApiResponse(false, null, 'Failed to update location.', 500);
  }
}
