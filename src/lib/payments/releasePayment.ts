import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";
import Payment from "@/models/Payment.model";
import Job from "@/models/Job.model";
import GuardWallet from "@/models/GuardWallet.model";
import { EscrowPaymentStatus, JobPaymentStatus } from "@/types/enums";

/**
 * Releases escrowed funds for a specific job.
 * Called automatically when boss approves a shift, or manually by admin.
 *
 * Uses a MongoDB transaction to ensure atomicity — either all three
 * updates (payment, job, wallet) succeed, or none do.
 */
export async function releasePayment(jobId: string): Promise<{ success: boolean; message: string; payment?: any }> {
  await connectDB();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const job = await Job.findOne({ jobId }).session(session);
    if (!job) {
      await session.abortTransaction();
      session.endSession();
      return { success: false, message: "Job not found." };
    }

    const payment = await Payment.findOne({ jobId }).session(session);
    if (!payment) {
      await session.abortTransaction();
      session.endSession();
      return { success: false, message: "No payment record found for this job." };
    }

    if (payment.paymentStatus !== EscrowPaymentStatus.HELD) {
      await session.abortTransaction();
      session.endSession();
      return { success: false, message: `Payment cannot be released from status: ${payment.paymentStatus}` };
    }

    // 1. Find or create Guard Wallet
    let wallet = await GuardWallet.findOne({ guardUid: payment.guardUid }).session(session);
    if (!wallet) {
      [wallet] = await GuardWallet.create([{ guardUid: payment.guardUid }], { session });
    }

    // 2. Update Payment Status (prevent double release)
    payment.paymentStatus = EscrowPaymentStatus.RELEASED;
    payment.releasedAt = new Date();
    await payment.save({ session });

    // 3. Update Job Payment Status
    job.paymentStatus = JobPaymentStatus.RELEASED;
    await job.save({ session });

    // 4. Update Wallet Balances
    wallet.availableBalance += payment.guardPayout;
    wallet.totalEarned += payment.guardPayout;
    await wallet.save({ session });

    // All three writes succeeded — commit atomically
    await session.commitTransaction();
    session.endSession();

    return { success: true, message: "Funds successfully released to guard.", payment };
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error("Release Payment Error:", error);
    return { success: false, message: error.message || "Failed to release payment." };
  }
}
