import { NextRequest, NextResponse } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";
import GuardWallet from "@/models/GuardWallet.model";
import Withdrawal from "@/models/Withdrawal.model";
import PlatformSettings from "@/models/PlatformSettings.model";
import { UserRole, PaymentMethod, WithdrawalStatus } from "@/types/enums";
import { getStripeInstance } from "@/lib/payments/stripeClient";
import { createPayPalPayout } from "@/lib/payments/paypalClient";

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
    if (![PaymentMethod.STRIPE, PaymentMethod.PAYPAL].includes(method)) {
      return createApiResponse(false, null, "Invalid withdrawal method.", 400);
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

    // Validate Account Readiness
    if (method === PaymentMethod.STRIPE) {
      if (!wallet.stripeAccountVerified || !wallet.stripeAccountId) {
        return createApiResponse(false, null, "Stripe Connect account is not fully verified.", 400);
      }
    } else if (method === PaymentMethod.PAYPAL) {
      if (!wallet.paypalEmail) {
        return createApiResponse(false, null, "PayPal email is not configured.", 400);
      }
    }

    // ─── Deduct Balance & Create Withdrawal (atomic via transaction) ─────────
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Move funds from available to pending
      wallet.availableBalance -= amount;
      wallet.pendingBalance += amount;
      await wallet.save({ session });

      // Create withdrawal record in PROCESSING state
      const [withdrawal] = await Withdrawal.create([{
        guardUid: user.uid,
        amount,
        currency: wallet.currency,
        withdrawalMethod: method,
        status: WithdrawalStatus.PROCESSING,
        processedAt: new Date(),
      }], { session });

      await session.commitTransaction();
      session.endSession();

      // ─── Process Payment Gateway Payout ───────────────────────────────────
      try {
        if (method === PaymentMethod.STRIPE) {
          const stripe = await getStripeInstance();
          const transfer = await stripe.transfers.create({
            amount: Math.round(amount * 100),
            currency: wallet.currency.toLowerCase(),
            destination: wallet.stripeAccountId!,
            metadata: {
              withdrawalId: withdrawal._id.toString(),
              guardUid: user.uid,
            }
          });

          // Stripe Connect transfers are immediate to connected account
          withdrawal.stripePayoutId = transfer.id;
          withdrawal.status = WithdrawalStatus.COMPLETED;
          withdrawal.completedAt = new Date();
          await withdrawal.save();

          // Finalize wallet — move from pending to withdrawn
          wallet.pendingBalance -= amount;
          wallet.totalWithdrawn += amount;
          wallet.lastPayoutAt = new Date();
          await wallet.save();
        }
        else if (method === PaymentMethod.PAYPAL) {
          const payout = await createPayPalPayout(
            wallet.paypalEmail!,
            amount,
            wallet.currency,
            withdrawal._id.toString(),
            "GuardMate Wallet Withdrawal"
          );

          // PayPal payouts are async — stay in PROCESSING until webhook confirms
          withdrawal.paypalPayoutId = payout.payoutBatchId;
          // Do NOT mark as COMPLETED here. The PayPal webhook will finalize.
          await withdrawal.save();
        }

        return createApiResponse(true, { withdrawal }, "Withdrawal processed successfully.", 200);

      } catch (payoutError: any) {
        console.error("Payout Gateway Error:", payoutError);

        // Revert balances
        wallet.availableBalance += amount;
        wallet.pendingBalance -= amount;
        await wallet.save();

        // Mark withdrawal as failed
        withdrawal.status = WithdrawalStatus.FAILED;
        withdrawal.failureReason = payoutError.message || "Gateway processing error";
        await withdrawal.save();

        return createApiResponse(false, null, `Withdrawal failed: ${withdrawal.failureReason}`, 500);
      }

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
