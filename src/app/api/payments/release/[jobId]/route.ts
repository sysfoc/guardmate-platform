import { NextRequest, NextResponse } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import { releasePayment } from "@/lib/payments/releasePayment";
import { UserRole } from "@/types/enums";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, "Unauthorized.", 401);
    }
    const { user } = authResult;
    
    // Only Admin can manually hit this endpoint. Boss triggers it via shift approval.
    if (user.role !== UserRole.ADMIN) {
      return createApiResponse(false, null, "Only Admin accounts can manually release payments.", 403);
    }

    const { jobId } = await params;

    const result = await releasePayment(jobId);

    if (result.success) {
      return createApiResponse(true, { payment: result.payment }, result.message, 200);
    } else {
      return createApiResponse(false, null, result.message, 400);
    }

  } catch (error: any) {
    console.error("Manual Release Payment Error:", error);
    return createApiResponse(false, null, error.message || "Failed to manually release payment.", 500);
  }
}
