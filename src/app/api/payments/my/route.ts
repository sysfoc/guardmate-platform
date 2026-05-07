import { NextRequest } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import Payment from "@/models/Payment.model";
import Job from "@/models/Job.model";
import { UserRole } from "@/types/enums";

/**
 * GET /api/payments/my
 * Authenticated Boss — returns all payments made by the boss,
 * enriched with job status and guard name for clear history.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) return createApiResponse(false, null, "Unauthorized.", 401);
    const { user } = authResult;

    if (user.role !== UserRole.BOSS) {
      return createApiResponse(false, null, "Only Boss accounts can view payment history.", 403);
    }

    await connectDB();

    const payments = await Payment.find({ bossUid: user.uid })
      .sort({ createdAt: -1 })
      .lean();

    // Enrich with job status and guard name
    const jobIds = payments.map((p) => p.jobId);
    const jobs = await Job.find({ jobId: { $in: jobIds } })
      .select("jobId status title acceptedGuards")
      .lean();

    const enriched = payments.map((p) => {
      const job = jobs.find((j) => j.jobId === p.jobId);
      const acceptedGuard = job?.acceptedGuards?.[0];
      return {
        ...p,
        jobStatus: job?.status || null,
        jobTitle: job?.title || p.jobTitle,
        guardName: acceptedGuard?.guardName || null,
      };
    });

    return createApiResponse(true, enriched, "Payment history fetched.", 200);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to fetch payment history.";
    console.error("GET /api/payments/my error:", error);
    return createApiResponse(false, null, errMsg, 500);
  }
}
