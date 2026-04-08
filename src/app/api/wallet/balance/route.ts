import { NextRequest, NextResponse } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import GuardWallet from "@/models/GuardWallet.model";
import { UserRole } from "@/types/enums";

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, "Unauthorized.", 401);
    }
    const { user } = authResult;
    if (user.role !== UserRole.MATE) {
      return createApiResponse(false, null, "Only Guards have wallets.", 403);
    }

    await connectDB();

    let wallet = await GuardWallet.findOne({ guardUid: user.uid }).lean();
    if (!wallet) {
      // Create empty wallet if first visit
      const newWallet = await GuardWallet.create({ guardUid: user.uid });
      wallet = newWallet.toObject();
    }

    // ─── Integrity Validation ──────────────────────────────────────────────
    // totalEarned should equal availableBalance + pendingBalance + totalWithdrawn
    // If there's a mismatch, flag it but still return the wallet data
    const expectedTotal = (wallet.availableBalance || 0) + (wallet.pendingBalance || 0) + (wallet.totalWithdrawn || 0);
    const actualTotal = wallet.totalEarned || 0;
    const integrityDrift = Math.abs(actualTotal - expectedTotal);

    if (integrityDrift > 0.01) {
      console.warn(
        `[WALLET INTEGRITY WARNING] Guard ${user.uid}: ` +
        `totalEarned=${actualTotal.toFixed(2)} != ` +
        `available(${(wallet.availableBalance || 0).toFixed(2)}) + ` +
        `pending(${(wallet.pendingBalance || 0).toFixed(2)}) + ` +
        `withdrawn(${(wallet.totalWithdrawn || 0).toFixed(2)}) = ${expectedTotal.toFixed(2)} ` +
        `(drift: ${integrityDrift.toFixed(2)})`
      );
    }

    return createApiResponse(true, {
      ...wallet,
      _integrityCheck: integrityDrift <= 0.01 ? 'OK' : 'DRIFT_DETECTED',
    }, "Wallet data retrieved.", 200);

  } catch (error: any) {
    console.error("Wallet Balance Error:", error);
    return createApiResponse(false, null, error.message || "Failed to retrieve wallet.", 500);
  }
}
