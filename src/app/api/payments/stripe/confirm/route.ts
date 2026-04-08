import { NextRequest, NextResponse } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import Payment from "@/models/Payment.model";
import Job from "@/models/Job.model";
import { getStripeInstance } from "@/lib/payments/stripeClient";
import { EscrowPaymentStatus, JobPaymentStatus, UserRole } from "@/types/enums";

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, "Unauthorized.", 401);
    }
    const { user } = authResult;
    if (user.role !== UserRole.BOSS) {
      return createApiResponse(false, null, "Only Boss can confirm payments.", 403);
    }

    const { paymentIntentId } = await request.json();
    if (!paymentIntentId) {
      return createApiResponse(false, null, "Payment Intent ID is required.", 400);
    }

    await connectDB();

    // Find the payment record
    const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });
    if (!payment) {
      return createApiResponse(false, null, "Payment not found.", 404);
    }

    // Verify boss owns this payment
    if (payment.bossUid !== user.uid) {
      return createApiResponse(false, null, "Unauthorized.", 403);
    }

    // Check if already processed
    if (payment.paymentStatus === EscrowPaymentStatus.HELD) {
      return createApiResponse(true, { status: "HELD" }, "Payment already confirmed.", 200);
    }

    // Verify with Stripe
    const stripe = await getStripeInstance();
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (intent.status === "succeeded") {
      // Update payment status
      payment.paymentStatus = EscrowPaymentStatus.HELD;
      payment.heldAt = new Date();
      await payment.save();

      // Update Job payment status
      await Job.findOneAndUpdate(
        { jobId: payment.jobId },
        { $set: { paymentStatus: JobPaymentStatus.HELD } }
      );

      return createApiResponse(true, { 
        status: "HELD",
        jobId: payment.jobId 
      }, "Payment confirmed and held in escrow.", 200);
    } else if (intent.status === "processing") {
      return createApiResponse(false, { status: "PROCESSING" }, "Payment is still processing.", 400);
    } else {
      return createApiResponse(false, { status: intent.status }, `Payment status: ${intent.status}`, 400);
    }

  } catch (error: any) {
    console.error("Confirm Payment Error:", error);
    return createApiResponse(false, null, error.message || "Failed to confirm payment.", 500);
  }
}
