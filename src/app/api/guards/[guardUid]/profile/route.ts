import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import { getActivePlanFeatures } from '@/lib/subscriptions/planEnforcement';
import { UserRole, JobStatus, BidStatus } from '@/types/enums';
import User from '@/models/User.model';
import Job from '@/models/Job.model';
import Bid from '@/models/Bid.model';
import Review from '@/models/Review.model';
import type { IGuardPublicProfile } from '@/types/user.types';

/**
 * GET /api/guards/[guardUid]/profile
 * Boss only — returns a guard's full public profile.
 * Requires the boss's active plan to have fullGuardProfileAccess enabled.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guardUid: string }> }
) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, 'Unauthorized.', 401);
    }

    const { user } = authResult;
    if (user.role !== UserRole.BOSS) {
      return createApiResponse(false, null, 'Only Boss accounts can view guard profiles.', 403);
    }

    await connectDB();
    const { guardUid } = await params;

    // ── Check plan access ─────────────────────────────────────────────────────
    const planFeatures = await getActivePlanFeatures(user.uid);
    if (!planFeatures?.fullGuardProfileAccess) {
      return createApiResponse(
        false,
        null,
        'Full guard profile access is not included in your current plan. Upgrade to Professional or Enterprise to view full profiles.',
        403
      );
    }

    // ── Fetch guard user ────────────────────────────────────────────────────────
    const guard = await User.findOne({ uid: guardUid }).lean();
    if (!guard) {
      return createApiResponse(false, null, 'Guard not found.', 404);
    }

    if (guard.role !== UserRole.MATE) {
      return createApiResponse(false, null, 'User is not a guard.', 400);
    }

    // ── Fetch work history (completed jobs where guard had accepted bid) ─────────
    const acceptedBids = await Bid.find({
      guardUid,
      status: BidStatus.ACCEPTED,
    }).lean();

    const completedJobIds = acceptedBids.map((b) => b.jobId);
    const completedJobs = await Job.find({
      jobId: { $in: completedJobIds },
      status: JobStatus.COMPLETED,
    }).lean();

    // Fetch boss names for work history
    const bossUids = [...new Set(completedJobs.map((j) => j.postedBy))];
    const bosses = await User.find({ uid: { $in: bossUids } }).select('uid firstName lastName').lean();
    const bossMap = new Map(bosses.map((b) => [b.uid, `${b.firstName} ${b.lastName}`]));

    const workHistory = completedJobs.map((job) => ({
      jobId: job.jobId,
      jobTitle: job.title,
      completedAt: job.completedAt ? new Date(job.completedAt).toISOString() : '',
      bossName: bossMap.get(job.postedBy) || 'Unknown',
    }));

    // ── Fetch public reviews for this guard ─────────────────────────────────────
    const reviews = await Review.find({
      receiverId: guardUid,
      receiverRole: UserRole.MATE,
      isPublic: true,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const reviewItems = reviews.map((r) => ({
      rating: r.rating,
      comment: r.comment,
      reviewerName: r.reviewerName,
      jobName: r.jobName,
      createdAt: new Date(r.createdAt).toISOString(),
    }));

    // ── Build response ──────────────────────────────────────────────────────────
    const profile: IGuardPublicProfile = {
      uid: guard.uid,
      firstName: guard.firstName,
      lastName: guard.lastName,
      fullName: `${guard.firstName} ${guard.lastName}`,
      profilePhoto: guard.profilePhoto || null,
      bio: guard.bio || null,
      averageRating: guard.averageRating || 0,
      totalReviews: guard.totalReviews || 0,
      skills: guard.skills || [],
      languages: guard.languages || [],
      experience: guard.experience ?? null,
      hourlyRate: guard.hourlyRate ?? null,
      minimumHours: guard.minimumHours ?? null,

      totalJobsCompleted: guard.totalJobsCompleted || 0,
      totalEarnings: guard.totalEarnings || 0,
      completionRate: guard.completionRate || 0,
      onTimeRate: guard.onTimeRate || 0,
      reliabilityScore: guard.reliabilityScore || 0,

      licenseStatus: guard.licenseStatus || 'UNVERIFIED',
      idVerificationStatus: guard.idVerificationStatus || 'UNVERIFIED',
      backgroundCheckStatus: guard.backgroundCheckStatus || 'UNVERIFIED',
      firstAidCertificateStatus: guard.firstAidCertificateStatus || null,
      constructionWhiteCardStatus: guard.constructionWhiteCardStatus || null,
      workingWithChildrenCheckStatus: guard.workingWithChildrenCheckStatus || null,
      abnVerified: guard.abnVerified || false,

      workHistory,
      reviews: reviewItems,
    };

    return createApiResponse(true, profile, 'Guard profile fetched successfully.', 200);
  } catch (error: unknown) {
    console.error('GET /api/guards/[guardUid]/profile error:', error);
    return createApiResponse(false, null, 'Failed to fetch guard profile.', 500);
  }
}
