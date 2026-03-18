import { NextRequest } from 'next/server';
import { createApiResponse, verifyAndGetUser } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job.model';
import Bid from '@/models/Bid.model';
import Review from '@/models/Review.model';
import { JobStatus, BidStatus, UserRole } from '@/types/enums';
import type { PendingReview } from '@/types/review.types';

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(req);
    if (!authResult || !authResult.user) {
      return createApiResponse(false, null, 'Unauthorized', 401);
    }
    const userRole = authResult.user.role;
    const uid = authResult.user.uid;

    await connectDB();

    let completedJobs: any[] = [];
    const pendingReviews: PendingReview[] = [];

    // Boss vs Mate pending job resolution
    if (userRole === UserRole.BOSS) {
      completedJobs = await Job.find({ postedBy: uid, status: JobStatus.COMPLETED }).lean();
      
      if (completedJobs.length > 0) {
        // Find existing reviews submitted by this boss
        const reviewedByBoss = await Review.find({ reviewerId: uid, jobId: { $in: completedJobs.map(j => j.jobId) } }).select('jobId').lean();
        const reviewedJobIds = new Set(reviewedByBoss.map((r: any) => r.jobId));

        // Filter out already reviewed
        const jobsToReview = completedJobs.filter(j => !reviewedJobIds.has(j.jobId));
        
        // Populate receiver details from the ACCEPTED bid
        for (const job of jobsToReview) {
          const acceptedBid = await Bid.findOne({ jobId: job.jobId, status: BidStatus.ACCEPTED }).lean();
          if (acceptedBid) {
            pendingReviews.push({
              jobId: job.jobId,
              jobTitle: job.title,
              receiverUid: acceptedBid.guardUid,
              receiverName: acceptedBid.guardName,
              receiverRole: UserRole.MATE,
              receiverPhoto: acceptedBid.guardPhoto || null
            });
          }
        }
      }
    } else {
      // MATE role
      const acceptedBids = await Bid.find({ guardUid: uid, status: BidStatus.ACCEPTED }).lean();
      if (acceptedBids.length > 0) {
        const jobIds = acceptedBids.map((b: any) => b.jobId);
        completedJobs = await Job.find({ jobId: { $in: jobIds }, status: JobStatus.COMPLETED }).lean();
        
        if (completedJobs.length > 0) {
          const reviewedByMate = await Review.find({ reviewerId: uid, jobId: { $in: completedJobs.map(j => j.jobId) } }).select('jobId').lean();
          const reviewedJobIds = new Set(reviewedByMate.map((r: any) => r.jobId));
          
          const jobsToReview = completedJobs.filter(j => !reviewedJobIds.has(j.jobId));
          
          for (const job of jobsToReview) {
            pendingReviews.push({
              jobId: job.jobId,
              jobTitle: job.title,
              receiverUid: job.postedBy,
              receiverName: job.companyName,
              receiverRole: UserRole.BOSS,
              receiverPhoto: job.companyLogo || null
            });
          }
        }
      }
    }

    return createApiResponse(true, pendingReviews, 'Pending reviews fetched successfully', 200);
  } catch (error: any) {
    console.error('Error fetching pending reviews:', error);
    return createApiResponse(false, null, error.message || 'Server error', 500);
  }
}
