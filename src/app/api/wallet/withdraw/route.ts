import { NextRequest, NextResponse } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";
import GuardWallet from "@/models/GuardWallet.model";
import Withdrawal from "@/models/Withdrawal.model";
import PlatformSettings from "@/models/PlatformSettings.model";
import { UserRole, WithdrawalMethod, WithdrawalStatus } from "@/types/enums";

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, "Unauthorized.", 401);
    }
    const { user } = authResult;
    if (user.role !== UserRole.MATE) {
      return createApiResponse(false, null, "Only Guards can withdraw funds.", 403);
    }

    const { amount, method } = await request.json();

    if (!amount || amount <= 0) {
      return createApiResponse(false, null, "Valid withdrawal amount is required.", 400);
    }
    if (method !== WithdrawalMethod.BANK_TRANSFER) {
      return createApiResponse(false, null, "Invalid withdrawal method. Only Bank Transfers are supported.", 400);
    }

    await connectDB();

    const settings = await PlatformSettings.findOne().lean();
    const minWithdrawal = settings?.minimumWithdrawalAmount || 50;

    if (amount < minWithdrawal) {
      return createApiResponse(false, null, `Minimum withdrawal amount is ${settings?.platformCurrency || 'AUD'} ${minWithdrawal}.`, 400);
    }

    const wallet = await GuardWallet.findOne({ guardUid: user.uid });
    if (!wallet) {
      return createApiResponse(false, null, "Wallet not found.", 404);
    }

    if (wallet.availableBalance < amount) {
      return createApiResponse(false, null, "Insufficient available balance.", 400);
    }

    if (!wallet.bankAccountNumber || !wallet.bankBSB || !wallet.bankAccountName) {
      return createApiResponse(false, null, "Bank details are not configured.", 400);
    }

    // ─── Deduct Balance & Create Withdrawal (atomic via transaction) ─────────
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Move funds from available to pending
      wallet.availableBalance -= amount;
      wallet.pendingBalance += amount;
      await wallet.save({ session });

      // Create withdrawal record
      const [withdrawal] = await Withdrawal.create([{
        guardUid: user.uid,
        amount,
        currency: wallet.currency,
        withdrawalMethod: method,
        status: WithdrawalStatus.PENDING,
        requiresManualProcessing: true,
        processedAt: null,
      }], { session });

      await session.commitTransaction();
      session.endSession();

      // ─── Send Admin Notification Email ───────────────────────────────────
      try {
        const { sendManualWithdrawalRequested } = await import('@/lib/email/emailTriggers');
        const User = (await import('@/models/User.model')).default;
        const admins = await User.find({ role: UserRole.ADMIN, 'emailSettings.financialAlerts': true }).lean();
        const guard = await User.findOne({ uid: user.uid }).lean();
        
        const maskedAccount = `***${wallet.bankAccountNumber!.slice(-3)}`;

        for (const admin of admins) {
          if (admin.email) {
            await sendManualWithdrawalRequested(
              admin.email,
              guard ? `${guard.firstName} ${guard.lastName}` : 'Guard',
              amount,
              wallet.bankAccountName!,
              wallet.bankBSB!,
              maskedAccount,
              withdrawal._id.toString()
            );
          }
        }
      } catch (e) {
        console.warn('Failed to send admin notification for manual withdrawal:', e);
      }

      // ─── Send Guard Confirmation Email ─────────────────────────────────────
      try {
        const { sendWithdrawalInitiated } = await import('@/lib/email/emailTriggers');
        const User = (await import('@/models/User.model')).default;
        const guard = await User.findOne({ uid: user.uid }).lean();
        if (guard?.email) {
          await sendWithdrawalInitiated(
            guard.email,
            guard.firstName,
            `${withdrawal.currency} ${amount.toFixed(2)}`,
            'Direct Bank Transfer'
          );
        }
      } catch (e) {
        console.warn('Failed to send guard withdrawal confirmation email:', e);
      }

      return createApiResponse(true, { withdrawal }, "Withdrawal processed successfully.", 200);

    } catch (txError: any) {
      await session.abortTransaction();
      session.endSession();
      throw txError;
    }

  } catch (error: any) {
    console.error("Withdraw Action Error:", error);
    return createApiResponse(false, null, error.message || "Failed to process withdrawal.", 500);
  }
}
