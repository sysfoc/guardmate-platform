import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import Dispute from '@/models/Dispute.model';
import User from '@/models/User.model';
import Job from '@/models/Job.model';
import Shift from '@/models/Shift.model';
import Payment from '@/models/Payment.model';
import { UserRole } from '@/types/enums';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, 'Unauthorized.', 401);
    }
    const { user } = authResult;

    await connectDB();

    const dispute = await Dispute.findById(params.id).lean();
    if (!dispute) {
      return createApiResponse(false, null, 'Dispute not found.', 404);
    }

    // Auth verify
    if (user.role !== UserRole.ADMIN && dispute.bossUid !== user.uid && dispute.guardUid !== user.uid) {
      return createApiResponse(false, null, 'Unauthorized to view this dispute.', 403);
    }

    // Populate extra details
    const [job, payment, boss, guard, shift] = await Promise.all([
      Job.findOne({ jobId: dispute.jobId }).lean(),
      Payment.findById(dispute.paymentId).lean(),
      User.findOne({ uid: dispute.bossUid }).lean(),
      User.findOne({ uid: dispute.guardUid }).lean(),
      Shift.findOne({ jobId: dispute.jobId, bossUid: dispute.bossUid, guardUid: dispute.guardUid }).sort({ createdAt: -1 }).lean()
    ]);

    const populatedDispute = {
      ...dispute,
      job,
      payment,
      shift,
      boss: boss ? { 
        firstName: boss.firstName, 
        lastName: boss.lastName, 
        email: boss.email, 
        role: boss.role,
        profilePhoto: boss.profilePhoto
      } : null,
      guard: guard ? { 
        uid: guard.uid,
        name: `${guard.firstName} ${guard.lastName}`,
        role: guard.role,
        profilePhoto: guard.profilePhoto
      } : null,
    };

    return createApiResponse(true, populatedDispute, 'Dispute fetched successfully.', 200);
  } catch (error: any) {
    console.error('GET /api/disputes/[id] error:', error);
    return createApiResponse(false, null, 'Failed to fetch dispute.', 500);
  }
}
