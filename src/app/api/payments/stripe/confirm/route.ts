import { NextRequest, NextResponse } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import Payment from "@/models/Payment.model";
import BoostPayment from "@/models/BoostPayment.model";
import Job from "@/models/Job.model";
import User from "@/models/User.model";
import { getStripeInstance } from "@/lib/payments/stripeClient";
import { EscrowPaymentStatus, JobPaymentStatus, UserRole } from "@/types/enums";
import { notifyNearbyGuards } from "@/lib/jobs/urgentJobNotifier";

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, "Unauthorized.", 401);
    }
    const { user } = authResult;

    const { paymentIntentId } = await request.json();
    if (!paymentIntentId) {
      return createApiResponse(false, null, "Payment Intent ID is required.", 400);
    }

    await connectDB();

    // ── Try Escrow Payment first (BOSS) ──────────────────────────────────────
    const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });
    if (payment) {
      if (user.role !== UserRole.BOSS) {
        return createApiResponse(false, null, "Only Boss can confirm escrow payments.", 403);
      }
      if (payment.bossUid !== user.uid) {
        return createApiResponse(false, null, "Unauthorized.", 403);
      }
      if (payment.paymentStatus === EscrowPaymentStatus.HELD) {
        return createApiResponse(true, { status: "HELD" }, "Payment already confirmed.", 200);
      }

      const stripe = await getStripeInstance();
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (intent.status === "succeeded") {
        payment.paymentStatus = EscrowPaymentStatus.HELD;
        payment.heldAt = new Date();
        await payment.save();

        await Job.findOneAndUpdate(
          { jobId: payment.jobId },
          { $set: { paymentStatus: JobPaymentStatus.HELD } }
        );

        await User.findOneAndUpdate(
          { uid: payment.bossUid },
          { $inc: { totalSpent: payment.totalChargedToBoss } }
        );

        await notifyNearbyGuards(payment.jobId);

        return createApiResponse(true, {
          status: "HELD",
          jobId: payment.jobId
        }, "Payment confirmed and held in escrow.", 200);
      } else if (intent.status === "processing") {
        return createApiResponse(false, { status: "PROCESSING" }, "Payment is still processing.", 400);
      } else {
        return createApiResponse(false, { status: intent.status }, `Payment status: ${intent.status}`, 400);
      }
    }

    // ── Try Mate Boost Payment (MATE) ───────────────────────────────────────
    const boostPayment = await BoostPayment.findOne({ stripePaymentIntentId: paymentIntentId });
    if (boostPayment) {
      if (user.role !== UserRole.MATE) {
        return createApiResponse(false, null, "Only Mate accounts can confirm boost payments.", 403);
      }
      if (boostPayment.guardUid !== user.uid) {
        return createApiResponse(false, null, "Unauthorized.", 403);
      }
      if (boostPayment.status === 'COMPLETED') {
        return createApiResponse(true, { status: "COMPLETED" }, "Boost payment already confirmed.", 200);
      }

      const stripe = await getStripeInstance();
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (intent.status === "succeeded") {
        const boostedUntil = new Date();
        boostedUntil.setDate(boostedUntil.getDate() + boostPayment.durationDays);

        boostPayment.status = 'COMPLETED';
        boostPayment.boostedUntil = boostedUntil;
        await boostPayment.save();

        await User.findOneAndUpdate(
          { uid: boostPayment.guardUid },
          { $set: { isFeatured: true, featuredUntil: boostedUntil } }
        );

        return createApiResponse(true, {
          status: "COMPLETED",
          boostedUntil: boostedUntil.toISOString(),
        }, "Profile boost activated successfully.", 200);
      } else if (intent.status === "processing") {
        return createApiResponse(false, { status: "PROCESSING" }, "Payment is still processing.", 400);
      } else {
        return createApiResponse(false, { status: intent.status }, `Payment status: ${intent.status}`, 400);
      }
    }

    return createApiResponse(false, null, "Payment not found.", 404);

  } catch (error: any) {
    console.error("Confirm Payment Error:", error);
    return createApiResponse(false, null, error.message || "Failed to confirm payment.", 500);
  }
}
