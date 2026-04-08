import { NextRequest, NextResponse } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import Job from "@/models/Job.model";
import Bid from "@/models/Bid.model";
import Payment from "@/models/Payment.model";
import PlatformSettings from "@/models/PlatformSettings.model";
import { JobStatus, HiringStatus, UserRole, PaymentMethod, EscrowPaymentStatus } from "@/types/enums";
import { calculatePaymentBreakdown } from "@/lib/payments/stripeClient";
import { createPayPalOrder } from "@/lib/payments/paypalClient";

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, "Unauthorized.", 401);
    }
    const { user } = authResult;
    if (user.role !== UserRole.BOSS) {
      return createApiResponse(false, null, "Only Boss accounts can create payments.", 403);
    }

    const { jobId } = await request.json();
    if (!jobId) {
      return createApiResponse(false, null, "Job ID is required.", 400);
    }

    await connectDB();

    // 1. Validate Job
    const job = await Job.findOne({ jobId });
    if (!job) {
      return createApiResponse(false, null, "Job not found.", 404);
    }
    if (job.postedBy !== user.uid) {
      return createApiResponse(false, null, "You can only fund your own jobs.", 403);
    }
    if (job.hiringStatus !== HiringStatus.FULLY_HIRED || job.status !== JobStatus.FILLED) {
      return createApiResponse(false, null, "Job must be fully hired before funding escrow.", 400);
    }
    if (!job.acceptedGuards || job.acceptedGuards.length === 0) {
      return createApiResponse(false, null, "No guards accepted for this job.", 400);
    }

    const guard = job.acceptedGuards[0];

    // Get the accepted bid to calculate proper amount
    const bid = await Bid.findOne({ bidId: guard.bidId });
    if (!bid) {
      return createApiResponse(false, null, "Accepted bid not found.", 404);
    }

    // Use the bid's totalProposed as the base amount (what guard will be paid)
    const baseAmount = bid.totalProposed || bid.proposedRate;

    // 2. Check existing payments
    const existingPayment = await Payment.findOne({ jobId, bossUid: user.uid });
    if (existingPayment && ["HELD", "RELEASED", "REFUNDED"].includes(existingPayment.paymentStatus)) {
      return createApiResponse(false, null, `Payment is already in status: ${existingPayment.paymentStatus}`, 400);
    }

    // 3. Get Platform Settings
    const settings = await PlatformSettings.findOne().lean();
    if (!settings?.paypalEnabled) {
      return createApiResponse(false, null, "PayPal payments are not enabled on this platform.", 400);
    }

    const bossCommissionRate = settings.platformCommissionBoss || 0;
    const guardCommissionRate = settings.platformCommissionGuard || 0;
    const currency = settings.platformCurrency || "AUD";

    // 4. Calculate Amounts using the BID amount (not job budget)
    const breakdown = calculatePaymentBreakdown(baseAmount, bossCommissionRate, guardCommissionRate);

    // 5. Create/Update Payment Record
    let paymentDoc;
    if (existingPayment) {
      paymentDoc = existingPayment;
      paymentDoc.jobBudget = baseAmount;
      paymentDoc.bossCommissionRate = bossCommissionRate;
      paymentDoc.guardCommissionRate = guardCommissionRate;
      paymentDoc.bossCommissionAmount = breakdown.bossCommissionAmount;
      paymentDoc.guardCommissionAmount = breakdown.guardCommissionAmount;
      paymentDoc.totalChargedToBoss = breakdown.totalChargedToBoss;
      paymentDoc.guardPayout = breakdown.guardPayout;
      paymentDoc.platformRevenue = breakdown.platformRevenue;
      paymentDoc.currency = currency;
      paymentDoc.paymentMethod = PaymentMethod.PAYPAL;
      await paymentDoc.save();
    } else {
      paymentDoc = await Payment.create({
        jobId: job.jobId,
        bidId: guard.bidId,
        bossUid: user.uid,
        guardUid: guard.guardUid,
        jobTitle: job.title,
        jobBudget: baseAmount,
        bossCommissionRate,
        guardCommissionRate,
        bossCommissionAmount: breakdown.bossCommissionAmount,
        guardCommissionAmount: breakdown.guardCommissionAmount,
        totalChargedToBoss: breakdown.totalChargedToBoss,
        guardPayout: breakdown.guardPayout,
        platformRevenue: breakdown.platformRevenue,
        currency,
        paymentMethod: PaymentMethod.PAYPAL,
        paymentStatus: EscrowPaymentStatus.PENDING,
      });
    }

    // 6. Create PayPal Order
    const { orderId, approvalUrl } = await createPayPalOrder(
      paymentDoc.totalChargedToBoss,
      currency,
      `GuardMate Escrow - Job: ${job.title}`,
      paymentDoc._id.toString()
    );

    // 7. Update Payment with Order ID
    paymentDoc.paypalOrderId = orderId;
    await paymentDoc.save();

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        approvalUrl,
        breakdown,
        currency,
      },
      message: "PayPal Order created."
    });

  } catch (error: any) {
    console.error("PayPal Create Order Error:", error);
    return createApiResponse(false, null, error.message || "Failed to create PayPal order.", 500);
  }
}
