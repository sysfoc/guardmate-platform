import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job.model';
import Bid from '@/models/Bid.model';
import User from '@/models/User.model';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import { UserRole, UserStatus, BidStatus, LicenseStatus, JobStatus } from '@/types/enums';
import { sendBidReceived } from '@/lib/email/emailTriggers';
import { checkDateOverlap } from '@/lib/jobs/overlapCheck';

/**
 * POST /api/jobs/[jobId]/bids
 * Mate only — submit a bid on a job.
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
      return createApiResponse(false, null, 'Only Mate accounts can submit bids.', 403);
    }

    if (user.status !== UserStatus.ACTIVE) {
      return createApiResponse(false, null, 'Your account must be ACTIVE to submit bids.', 403);
    }

    if (user.licenseStatus !== LicenseStatus.VALID) {
      return createApiResponse(false, null, 'Your SIA license must be VALID to submit bids.', 403);
    }

    await connectDB();
    const { jobId } = await params;

    // Check job exists and is OPEN
    const job = await Job.findOne({ jobId });
    if (!job) {
      return createApiResponse(false, null, 'Job not found.', 404);
    }

    if (job.status !== JobStatus.OPEN) {
      return createApiResponse(false, null, 'This job is no longer accepting bids.', 400);
    }

    // Check guard hasn't already bid
    const existingBid = await Bid.findOne({ jobId, guardUid: user.uid });
    if (existingBid) {
      return createApiResponse(false, null, 'You have already submitted a bid for this job.', 409);
    }

    // Check for shift overlaps with existing ACCEPTED bids
    const acceptedBids = await Bid.find({ guardUid: user.uid, status: BidStatus.ACCEPTED });
    if (acceptedBids.length > 0) {
      const acceptedJobIds = acceptedBids.map(b => b.jobId);
      const acceptedJobs = await Job.find({ jobId: { $in: acceptedJobIds } });
      
      for (const existingJob of acceptedJobs) {
        if (checkDateOverlap(
          new Date(job.startDate), 
          new Date(job.endDate), 
          new Date(existingJob.startDate), 
          new Date(existingJob.endDate)
        )) {
          const formattedDate = new Date(existingJob.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          return createApiResponse(
            false, 
            { conflictingJob: existingJob.title, conflictingDate: formattedDate }, 
            `You already have an accepted shift on ${formattedDate}. You cannot apply for jobs that overlap with your existing shifts.`, 
            400
          );
        }
      }
    }

    const body = await request.json();

    if (!body.proposedRate || !body.coverMessage || !body.availableFrom) {
      return createApiResponse(false, null, 'Missing required fields: proposedRate, coverMessage, availableFrom.', 400);
    }

    if (body.coverMessage.length > 1000) {
      return createApiResponse(false, null, 'Cover message must be 1000 characters or less.', 400);
    }

    const bid = await Bid.create({
      bidId: uuidv4(),
      jobId,
      jobTitle: job.title,
      bossUid: job.postedBy,
      guardUid: user.uid,
      guardName: `${user.firstName} ${user.lastName}`,
      guardPhoto: user.profilePhoto || null,
      guardRating: user.averageRating || 0,
      guardExperience: user.experience || 0,
      guardLicenseType: user.licenseType || null,
      status: BidStatus.PENDING,
      proposedRate: body.proposedRate,
      budgetType: body.budgetType || job.budgetType,
      totalProposed: body.totalProposed || body.proposedRate,
      coverMessage: body.coverMessage,
      availableFrom: new Date(body.availableFrom),
    });

    // Increment totalBids on the job
    await Job.updateOne({ jobId }, { $inc: { totalBids: 1 } });

    // Send email notification to boss
    try {
      const boss = await User.findOne({ uid: job.postedBy });
      if (boss?.email) {
        await sendBidReceived(
          boss.email,
          boss.firstName,
          `${user.firstName} ${user.lastName}`,
          job.title,
          body.proposedRate,
          jobId
        );
      }
    } catch (emailErr) {
      console.warn('Failed to send bid received email:', emailErr);
    }

    return createApiResponse(true, bid.toObject(), 'Bid submitted successfully.', 201);
  } catch (error: unknown) {
    console.error('POST /api/jobs/[jobId]/bids error:', error);
    return createApiResponse(false, null, 'Failed to submit bid.', 500);
  }
}

/**
 * GET /api/jobs/[jobId]/bids
 * Boss only — all bids for their job with guard profiles.
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
    if (user.role !== UserRole.BOSS) {
      return createApiResponse(false, null, 'Only Boss accounts can view job bids.', 403);
    }

    await connectDB();
    const { jobId } = await params;

    // Verify ownership
    const job = await Job.findOne({ jobId });
    if (!job) {
      return createApiResponse(false, null, 'Job not found.', 404);
    }

    if (job.postedBy !== user.uid) {
      return createApiResponse(false, null, 'You can only view bids on your own jobs.', 403);
    }

    const bids = await Bid.aggregate([
      { $match: { jobId } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'guardUid',
          foreignField: 'uid',
          as: 'guardDetails'
        }
      },
      {
        $unwind: {
          path: '$guardDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          guardSkills: '$guardDetails.skills',
          guardCertifications: '$guardDetails.certifications',
          guardReliabilityScore: '$guardDetails.reliabilityScore',
        }
      },
      {
        $project: {
          guardDetails: 0
        }
      }
    ]);

    return createApiResponse(true, { bids, job: job.toObject() }, 'Bids fetched successfully.', 200);
  } catch (error: unknown) {
    console.error('GET /api/jobs/[jobId]/bids error:', error);
    return createApiResponse(false, null, 'Failed to fetch bids.', 500);
  }
}
