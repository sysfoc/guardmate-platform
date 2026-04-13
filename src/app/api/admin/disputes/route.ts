import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import Dispute from '@/models/Dispute.model';
import Job from '@/models/Job.model';
import User from '@/models/User.model';
import Payment from '@/models/Payment.model';
import { UserRole } from '@/types/enums';
import { checkDisputeDeadlines } from '@/lib/disputes/disputeDeadlineChecker';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, 'Unauthorized.', 401);
    }
    const { user } = authResult;

    if (user.role !== UserRole.ADMIN) {
      return createApiResponse(false, null, 'Forbidden. Admin only.', 403);
    }

    // Trigger cron-like deadline checker
    checkDisputeDeadlines().catch(() => {});

    await connectDB();

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const status = url.searchParams.get('status');
    const reason = url.searchParams.get('reason');
    const search = url.searchParams.get('search');
    
    const query: any = {};
    if (status && status !== 'ALL') query.status = status;
    if (reason && reason !== 'ALL') query.reason = reason;

    if (search) {
      query.jobTitle = { $regex: search, $options: 'i' };
    }

    const [disputes, total] = await Promise.all([
      Dispute.find(query).sort({ status: 1, createdAt: 1 }).skip(skip).limit(limit).lean(),
      Dispute.countDocuments(query)
    ]);

    const populatedDisputes = await Promise.all(disputes.map(async (d: any) => {
      const boss = await User.findOne({ uid: d.bossUid }).select('firstName lastName').lean();
      const guard = await User.findOne({ uid: d.guardUid }).select('firstName lastName').lean();
      const payment = await Payment.findById(d.paymentId).select('jobBudget currency').lean();

      return {
        ...d,
        bossName: boss ? `${boss.firstName} ${boss.lastName}` : 'Unknown',
        guardName: guard ? `${guard.firstName} ${guard.lastName}` : 'Unknown',
        escrowAmount: payment?.jobBudget || 0,
        currency: payment?.currency || 'AUD'
      };
    }));

    // Sorting by urgency explicitly. OPEN comes first, then UNDER_REVIEW, etc.
    const statusOrder: Record<string, number> = {
      'OPEN': 0,
      'UNDER_REVIEW': 1,
      'RESOLVED': 2,
      'CLOSED': 3
    };

    populatedDisputes.sort((a, b) => {
      const aOrder = statusOrder[a.status] ?? 9;
      const bOrder = statusOrder[b.status] ?? 9;
      if (aOrder !== bOrder) return aOrder - bOrder;
      
      // If OPEN, sort by approaching deadline
      if (a.status === 'OPEN') {
        const aTime = new Date(a.disputeDeadline).getTime();
        const bTime = new Date(b.disputeDeadline).getTime();
        return aTime - bTime; // sooner deadline first
      }
      
      // Otherwise newest response first
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    const totalPages = Math.ceil(total / limit);

    return createApiResponse(true, {
      data: populatedDisputes,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    }, 'Admin disputes fetched successfully.', 200);

  } catch (error: any) {
    console.error('GET /api/admin/disputes error:', error);
    return createApiResponse(false, null, 'Failed to fetch admin disputes.', 500);
  }
}
