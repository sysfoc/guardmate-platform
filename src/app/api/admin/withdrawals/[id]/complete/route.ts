import { NextRequest } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";
import Withdrawal from "@/models/Withdrawal.model";
import GuardWallet from "@/models/GuardWallet.model";
import { UserRole, WithdrawalStatus, WithdrawalMethod } from "@/types/enums";

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/withdrawals/[id]/complete
// Admin only — Marks a manual BANK_TRANSFER withdrawal as COMPLETED after
// the admin has manually transferred the funds from their bank.
// ─────────────────────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const authResult = await verifyAndGetUser(request);
    if (!authResult) return createApiResponse(false, null, "Unauthorized.", 401);
    const { user } = authResult;
    if (user.role !== UserRole.ADMIN) {
      return createApiResponse(false, null, "Only Admin accounts.", 403);
    }

    if (!id) {
      return createApiResponse(false, null, "Withdrawal ID is required.", 400);
    }

    await connectDB();

    const withdrawal = await Withdrawal.findById(id);
    if (!withdrawal) {
      return createApiResponse(false, null, "Withdrawal not found.", 404);
    }

    if (withdrawal.status === WithdrawalStatus.COMPLETED) {
      return createApiResponse(false, null, "Withdrawal is already completed.", 400);
    }

    if (withdrawal.withdrawalMethod !== WithdrawalMethod.BANK_TRANSFER || !withdrawal.requiresManualProcessing) {
      return createApiResponse(false, null, "Only manual bank transfers can be completed via this endpoint.", 400);
    }

    const wallet = await GuardWallet.findOne({ guardUid: withdrawal.guardUid });
    if (!wallet) {
      return createApiResponse(false, null, "Guard wallet not found.", 404);
    }

    // ─── Complete Withdrawal (atomic via transaction) ─────────────────────────
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      withdrawal.status = WithdrawalStatus.COMPLETED;
      withdrawal.completedAt = new Date();
      withdrawal.processedAt = withdrawal.processedAt || new Date();
      await withdrawal.save({ session });

      wallet.pendingBalance -= withdrawal.amount;
      wallet.totalWithdrawn += withdrawal.amount;
      wallet.lastPayoutAt = new Date();
      await wallet.save({ session });

      await session.commitTransaction();
      session.endSession();

      // Send email to guard
      try {
        const { sendWithdrawalCompleted } = await import('@/lib/email/emailTriggers');
        const User = (await import('@/models/User.model')).default;
        const guard = await User.findOne({ uid: withdrawal.guardUid }).lean();
        
        if (guard?.email) {
          const maskedAccount = wallet.bankAccountNumber ? `***${wallet.bankAccountNumber.slice(-3)}` : 'Bank Transfer';
          await sendWithdrawalCompleted(
            guard.email,
            guard.firstName,
            `${withdrawal.currency} ${withdrawal.amount.toFixed(2)}`,
            maskedAccount
          );
        }
      } catch (e) {
        console.warn('Failed to send withdrawal completion email:', e);
      }

      return createApiResponse(true, { withdrawal }, "Withdrawal marked as completed.", 200);

    } catch (txError: any) {
      await session.abortTransaction();
      session.endSession();
      throw txError;
    }

  } catch (error: any) {
    console.error("Admin Complete Withdrawal Error:", error);
    return createApiResponse(false, null, error.message || "Failed to complete withdrawal.", 500);
  }
}
