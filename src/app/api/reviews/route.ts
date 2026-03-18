import { NextRequest } from 'next/server';
import { createApiResponse, verifyAndGetUser } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job.model';
import Bid from '@/models/Bid.model';
import Review from '@/models/Review.model';
import User from '@/models/User.model';
import { JobStatus, BidStatus, UserRole } from '@/types/enums';
import type { SubmitReviewPayload } from '@/types/review.types';

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(req);
    if (!authResult || !authResult.user) {
      return createApiResponse(false, null, 'Unauthorized', 401);
    }
    const reviewerId = authResult.user.uid;
    const reviewerRole = authResult.user.role as UserRole;
    const reviewerName = authResult.user.role === UserRole.BOSS ? (authResult.user as any).companyName : `${authResult.user.firstName} ${authResult.user.lastName}`;
    const reviewerPhoto = authResult.user.profilePhoto || (authResult.user as any).companyLogo || null;

    const body: SubmitReviewPayload = await req.json();
    const { jobId, rating, comment } = body;

    // Validations
    if (!jobId || !rating || !comment) {
      return createApiResponse(false, null, 'jobId, rating, and comment are required', 400);
    }
    if (rating < 1 || rating > 5) {
      return createApiResponse(false, null, 'Rating must be between 1 and 5', 400);
    }
    if (comment.trim().length === 0 || comment.length > 500) {
      return createApiResponse(false, null, 'Comment must be between 1 and 500 characters', 400);
    }

    await connectDB();

    const job = await Job.findOne({ jobId });
    if (!job) {
      return createApiResponse(false, null, 'Job not found', 404);
    }
    if (job.status !== JobStatus.COMPLETED) {
      return createApiResponse(false, null, 'Only COMPLETED jobs can be reviewed', 400);
    }

    // Uniqueness check
    const existingReview = await Review.findOne({ reviewerId, jobId });
    if (existingReview) {
      return createApiResponse(false, null, 'You have already reviewed this job', 400);
    }

    let receiverId = '';
    let receiverRole = UserRole.MATE;

    const acceptedBid = await Bid.findOne({ jobId, status: BidStatus.ACCEPTED });

    if (reviewerRole === UserRole.BOSS) {
      if (job.postedBy !== reviewerId) {
        return createApiResponse(false, null, 'You are not the creator of this job', 403);
      }
      if (!acceptedBid) {
        return createApiResponse(false, null, 'No accepted guard found for this job', 400);
      }
      receiverId = acceptedBid.guardUid;
      receiverRole = UserRole.MATE;
    } else {
      if (!acceptedBid || acceptedBid.guardUid !== reviewerId) {
        return createApiResponse(false, null, 'You were not the hired guard for this job', 403);
      }
      receiverId = job.postedBy;
      receiverRole = UserRole.BOSS;
    }

    // Create review
    const newReview = await Review.create({
      reviewerId,
      reviewerName,
      reviewerPhoto,
      reviewerRole,
      receiverId,
      receiverRole,
      jobId,
      jobName: job.title,
      rating,
      comment: comment.trim(),
      isPublic: true
    });

    // Update receiver's average rating atomically
    const allReceiverReviews = await Review.find({ receiverId });
    const totalReviews = allReceiverReviews.length;
    const averageRating = totalReviews > 0 ? (allReceiverReviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews) : 0;

    await User.findOneAndUpdate(
      { uid: receiverId },
      { $set: { averageRating, totalReviews } }
    );

    return createApiResponse(true, newReview, 'Review submitted successfully', 201);
  } catch (error: any) {
    console.error('Error submitting review:', error);
    // Handle Mongo duplicate key error just in case
    if (error.code === 11000) {
      return createApiResponse(false, null, 'You have already reviewed this job', 400);
    }
    return createApiResponse(false, null, error.message || 'Server error', 500);
  }
}
