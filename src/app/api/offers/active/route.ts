import { NextRequest } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import Offer from "@/models/Offer.model";
import UserOffer from "@/models/UserOffer.model";
import { UserRole, OfferType } from "@/types/enums";

/**
 * GET /api/offers/active
 * Authenticated — returns active subscription discount offers for Boss only.
 * Guards do not see offers (offers are subscription-only).
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) return createApiResponse(false, null, "Unauthorized.", 401);
    const { user } = authResult;

    await connectDB();

    const now = new Date();

    // Only Boss can see offers (subscription discounts only)
    if (user.role !== UserRole.BOSS) {
      return createApiResponse(true, [], "Offers not available for this role.", 200);
    }

    const offers = await Offer.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
      offerType: OfferType.SUBSCRIPTION_DISCOUNT,
    })
      .select('name description offerType discountType discountValue eligibility newUserDaysThreshold startDate endDate')
      .sort({ createdAt: -1 })
      .lean();

    // Check which offers this user has already acquired and which are consumed
    const acquiredRecords = await UserOffer.find({ userUid: user.uid }).lean();
    const acquiredMap = new Map(acquiredRecords.map((r) => [String(r.offerId), r.usedAt ? true : false]));

    const enriched = offers.map((o) => {
      const offerId = String(o._id);
      const isAcquired = acquiredMap.has(offerId);
      const isConsumed = isAcquired && acquiredMap.get(offerId) === true;
      return {
        ...o,
        isAcquired,
        isConsumed,
      };
    });

    return createApiResponse(true, enriched, "Active offers fetched.", 200);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to fetch offers.";
    console.error("Active Offers Error:", error);
    return createApiResponse(false, null, errMsg, 500);
  }
}
