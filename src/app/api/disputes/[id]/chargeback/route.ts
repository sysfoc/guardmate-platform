import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import Dispute from '@/models/Dispute.model';
import User from '@/models/User.model';
import { UserRole } from '@/types/enums';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, 'Unauthorized.', 401);
    }
    const { user } = authResult;

    if (user.role !== UserRole.ADMIN) {
      return createApiResponse(false, null, 'Forbidden. Admin only.', 403);
    }

    const { chargebackId } = await request.json();

    await connectDB();

    const dispute = await Dispute.findById(params.id);
    if (!dispute) return createApiResponse(false, null, 'Dispute not found.', 404);

    dispute.chargebackRaised = true;
    if (chargebackId) {
      dispute.chargebackId = chargebackId;
    }

    await dispute.save();

    return createApiResponse(true, dispute.toObject(), 'Chargeback recorded successfully.', 200);
  } catch (error: any) {
    console.error('POST /api/disputes/[id]/chargeback error:', error);
    return createApiResponse(false, null, 'Failed to record chargeback.', 500);
  }
}
