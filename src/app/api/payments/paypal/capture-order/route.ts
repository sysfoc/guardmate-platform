import { NextRequest, NextResponse } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import Job from "@/models/Job.model";
import Payment from "@/models/Payment.model";
import { UserRole, EscrowPaymentStatus, JobPaymentStatus } from "@/types/enums";
import { capturePayPalOrder } from "@/lib/payments/paypalClient";

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, "Unauthorized.", 401);
    }
    const { user } = authResult;
    if (user.role !== UserRole.BOSS) {
      return createApiResponse(false, null, "Only Boss accounts can capture payments.", 403);
    }

    const { orderId } = await request.json();
    if (!orderId) {
      return createApiResponse(false, null, "Order ID is required.", 400);
    }

    await connectDB();

    const payment = await Payment.findOne({ paypalOrderId: orderId, bossUid: user.uid });
    if (!payment) {
      return createApiResponse(false, null, "Payment not found.", 404);
    }

    if (payment.paymentStatus !== EscrowPaymentStatus.PENDING) {
      return createApiResponse(false, null, `Payment is already in status: ${payment.paymentStatus}`, 400);
    }

    // Capture the order
    const { captureId, status } = await capturePayPalOrder(orderId);

    if (status === 'COMPLETED') {
      payment.paymentStatus = EscrowPaymentStatus.HELD;
      payment.paypalCaptureId = captureId;
      payment.heldAt = new Date();
      await payment.save();

      // Update Job payment status
      await Job.findOneAndUpdate(
        { jobId: payment.jobId },
        { $set: { paymentStatus: JobPaymentStatus.HELD } }
      );

      // Notify Boss that funds are held
      console.log(`Payment HELD for job ${payment.jobId}`);

      return createApiResponse(true, { payment }, "Payment successfully held in escrow.", 200);
    } else {
      return createApiResponse(false, null, `PayPal capture status: ${status}`, 400);
    }

  } catch (error: any) {
    console.error("PayPal Capture Order Error:", error);
    return createApiResponse(false, null, error.message || "Failed to capture PayPal order.", 500);
  }
}
