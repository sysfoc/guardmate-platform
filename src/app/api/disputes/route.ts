import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import connectDB from '@/lib/mongodb';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import Dispute from '@/models/Dispute.model';
import Job from '@/models/Job.model';
import Payment from '@/models/Payment.model';
import Shift from '@/models/Shift.model';
import PlatformSettings from '@/models/PlatformSettings.model';
import { UserRole, DisputeStatus, JobPaymentStatus, EscrowPaymentStatus, UserStatus } from '@/types/enums';
import { sendDisputeRaised, sendDisputeRaisedAdmin } from '@/lib/email/emailTriggers';
import User from '@/models/User.model';
import { validateUploadedFiles } from '@/lib/utils/fileValidation';
import { checkRateLimit } from '@/lib/utils/rateLimit';

export const config = {
  api: {
    bodyParser: false, // We use formData()
  },
};

/**
 * POST /api/disputes
 * Raise a new dispute
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, 'Unauthorized.', 401);
    }
    const { user } = authResult;

    // Rate limiting: max 5 dispute attempts per 15 minutes per user
    if (!checkRateLimit(`dispute:${user.uid}`, 5, 15 * 60 * 1000)) {
      return createApiResponse(false, null, 'Too many dispute requests. Please wait before trying again.', 429);
    }

    const formData = await request.formData();
    const jobId = formData.get('jobId') as string;
    const reason = formData.get('reason') as string;
    const description = formData.get('description') as string;

    if (!jobId || !reason || !description || description.length < 50) {
      return createApiResponse(false, null, 'Invalid request data. Description requires minimum 50 characters.', 400);
    }

    await connectDB();

    const job = await Job.findOne({ jobId }).lean();
    if (!job) return createApiResponse(false, null, 'Job not found.', 404);

    if (job.paymentStatus !== JobPaymentStatus.HELD) {
      return createApiResponse(false, null, 'Dispute can only be raised while funds are held in escrow.', 400);
    }

    // Check participation
    let againstUid = '';
    let againstRole = '';
    const raisedByRole = user.role;

    // Find the shift associated with this guard if user is Guard, or find the shift belonging to the job if Boss
    const shiftQuery: any = { jobId };
    if (user.role === UserRole.MATE) {
      shiftQuery.guardUid = user.uid;
    } else if (user.role === UserRole.BOSS) {
      shiftQuery.bossUid = user.uid;
      // Note: for a multi-guard job, Boss needs to specify WHICH guard they are disputing.
      // But prompt says "only one active dispute per job per user". 
      // If the Boss is disputing, they'll pass the specific guardUid from the form or we infer it.
      // Actually, Boss raises against the Guard. If multi-guard, there are multiple shifts.
    }

    const guardUidParam = formData.get('guardUid') as string;
    if (guardUidParam) {
      shiftQuery.guardUid = guardUidParam;
    }

    const shift = await Shift.findOne(shiftQuery).sort({ createdAt: -1 }).lean();
    if (!shift) {
      return createApiResponse(false, null, 'No matching shift found to dispute.', 400);
    }

    if (user.role === UserRole.BOSS && shift.bossUid !== user.uid) {
      return createApiResponse(false, null, 'You are not the boss for this shift.', 403);
    }
    if (user.role === UserRole.MATE && shift.guardUid !== user.uid) {
      return createApiResponse(false, null, 'You are not the guard for this shift.', 403);
    }

    if (user.role === UserRole.BOSS) {
      againstUid = shift.guardUid;
      againstRole = UserRole.MATE;
    } else {
      againstUid = shift.bossUid;
      againstRole = UserRole.BOSS;
    }

    // Checking Window (48 hours)
    if (!shift.checkOutTime) {
      return createApiResponse(false, null, 'Cannot dispute a shift that has not checked out.', 400);
    }

    const settings = await PlatformSettings.findOne().lean();
    const disputeWindowHours = settings?.disputeWindowHours || 48;
    
    // Use Date directly — MongoDB stores dates as UTC Date objects.
    // Avoids timezone bugs from string round-tripping.
    const checkoutDate = new Date(shift.checkOutTime);
    const windowEnd = new Date(checkoutDate.getTime() + disputeWindowHours * 60 * 60 * 1000);

    if (new Date() > windowEnd) {
      return createApiResponse(false, null, `The dispute window for this job has closed. Payment was auto-released ${disputeWindowHours} hours after shift completion.`, 400);
    }

    // Check duplicate — include againstUid for multi-guard job support
    const activeDispute = await Dispute.findOne({ jobId, raisedByUid: user.uid, againstUid }).lean();
    if (activeDispute) {
      return createApiResponse(false, null, 'A dispute already exists for this job against this party.', 400);
    }

    // Get Payment
    // For single, it's just jobId. For multi-guard, it's jobId + bossUid + guardUid.
    const payment = await Payment.findOne({ 
      jobId, 
      bossUid: shift.bossUid, 
      guardUid: shift.guardUid 
    }).lean();

    if (!payment) {
      return createApiResponse(false, null, 'No escrow payment found for this shift.', 400);
    }

    // Handle File Uploads — with validation
    const evidenceFiles: Array<{ fileUrl: string, fileName: string, fileType: string, uploadedAt: Date }> = [];
    const files = formData.getAll('evidence').filter(f => f && typeof f !== 'string') as File[];
    
    // Validate files: count, MIME type, extension whitelist, and size limit
    const fileValidation = validateUploadedFiles(files, 5);
    if (!fileValidation.valid) {
      return createApiResponse(false, null, fileValidation.error!, 400);
    }

    if (files.length > 0) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'disputes');
      await mkdir(uploadDir, { recursive: true });

      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Use only the validated extension from the original filename
        const ext = path.extname(file.name).toLowerCase();
        const uniqueFileName = `${uuidv4()}${ext}`;
        const filePath = path.join(uploadDir, uniqueFileName);
        
        await writeFile(filePath, buffer);
        
        evidenceFiles.push({
          fileUrl: `/uploads/disputes/${uniqueFileName}`,
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          uploadedAt: new Date()
        });
      }
    }

    const disputeDeadline = new Date(new Date().getTime() + disputeWindowHours * 60 * 60 * 1000);

    const dispute = await Dispute.create({
      jobId,
      paymentId: payment._id.toString(),
      raisedByUid: user.uid,
      raisedByRole: user.role,
      againstUid,
      againstRole,
      jobTitle: job.title,
      bossUid: shift.bossUid,
      guardUid: shift.guardUid,
      reason,
      description,
      evidence: evidenceFiles,
      status: DisputeStatus.OPEN,
      disputeDeadline
    });

    // Update statuses
    await Payment.updateOne({ _id: payment._id }, { $set: { paymentStatus: EscrowPaymentStatus.DISPUTED, disputeId: dispute._id.toString() } });
    await Job.updateOne({ jobId }, { $set: { paymentStatus: JobPaymentStatus.DISPUTED } });

    // Notifications
    const againstUser = await User.findOne({ uid: againstUid }).lean();
    const raisedByUser = await User.findOne({ uid: user.uid }).lean();
    
    if (againstUser && raisedByUser) {
      await sendDisputeRaised(
        againstUser.email,
        `${againstUser.firstName} ${againstUser.lastName}`,
        `${raisedByUser.firstName} ${raisedByUser.lastName}`,
        raisedByRole,
        job.title,
        reason,
        description,
        dispute._id.toString()
      ).catch(console.error);

      // Notify sys admins
      const admins = await User.find({ role: UserRole.ADMIN, status: UserStatus.ACTIVE }).select('email').lean();
      for (const admin of admins) {
        await sendDisputeRaisedAdmin(
          admin.email,
          `${raisedByUser.firstName} ${raisedByUser.lastName}`,
          raisedByRole,
          `${againstUser.firstName} ${againstUser.lastName}`,
          job.title,
          reason,
          description,
          payment.jobBudget,
          payment.currency || 'AUD',
          dispute._id.toString()
        ).catch(console.error);
      }
    }

    return createApiResponse(true, dispute.toObject(), 'Dispute raised successfully.', 201);
  } catch (error: any) {
    console.error('POST /api/disputes error:', error);
    return createApiResponse(false, null, error.message || 'Failed to raise dispute.', 500);
  }
}

/**
 * GET /api/disputes
 * Get paginated disputes for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, 'Unauthorized.', 401);
    }
    const { user } = authResult;

    await connectDB();

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '10')));
    const skip = (page - 1) * limit;

    const status = url.searchParams.get('status');
    const query: any = {
      $or: [
        { bossUid: user.uid },
        { guardUid: user.uid }
      ]
    };

    if (status && status !== 'ALL') query.status = status;

    const [disputes, total] = await Promise.all([
      Dispute.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Dispute.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    return createApiResponse(true, {
      data: disputes,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    }, 'Disputes fetched successfully.', 200);

  } catch (error: any) {
    console.error('GET /api/disputes error:', error);
    return createApiResponse(false, null, 'Failed to fetch disputes.', 500);
  }
}
