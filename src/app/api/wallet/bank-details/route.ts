import { NextRequest } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import GuardWallet from "@/models/GuardWallet.model";
import { UserRole } from "@/types/enums";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/wallet/bank-details
// Guard only — Saves direct bank transfer details (BSB, Account Name, Account Number)
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) return createApiResponse(false, null, "Unauthorized.", 401);
    const { user } = authResult;
    if (user.role !== UserRole.MATE) {
      return createApiResponse(false, null, "Only Guard accounts can update bank details.", 403);
    }

    const body = await request.json();
    const { accountName, bsb, accountNumber } = body;

    if (!accountName || !accountName.trim()) {
      return createApiResponse(false, null, "Account Name is required.", 400);
    }

    if (!bsb || !/^\d{6}$/.test(bsb.replace(/\D/g, ''))) {
      return createApiResponse(false, null, "BSB must be exactly 6 digits.", 400);
    }

    if (!accountNumber || !/^\d{6,10}$/.test(accountNumber.replace(/\D/g, ''))) {
      return createApiResponse(false, null, "Account Number must be between 6 and 10 digits.", 400);
    }

    await connectDB();

    let wallet = await GuardWallet.findOne({ guardUid: user.uid });
    if (!wallet) {
      wallet = await GuardWallet.create({
        guardUid: user.uid,
        currency: 'AUD',
        availableBalance: 0,
        pendingBalance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
      });
    }

    const cleanBsb = bsb.replace(/\D/g, '');
    const cleanAccount = accountNumber.replace(/\D/g, '');

    wallet.bankAccountName = accountName.trim();
    wallet.bankBSB = cleanBsb;
    wallet.bankAccountNumber = cleanAccount;
    wallet.bankAccountSavedAt = new Date();

    await wallet.save();

    // Mask the account number for security in response
    const maskedAccount = `***${cleanAccount.slice(-3)}`;

    return createApiResponse(true, {
      accountName: wallet.bankAccountName,
      bsb: wallet.bankBSB,
      accountNumber: maskedAccount,
      savedAt: wallet.bankAccountSavedAt,
    }, "Bank details saved successfully.", 200);

  } catch (error: any) {
    console.error("Bank Details Save Error:", error);
    return createApiResponse(false, null, error.message || "Failed to save bank details.", 500);
  }
}
