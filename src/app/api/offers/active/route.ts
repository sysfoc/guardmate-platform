import { NextRequest } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import Offer from "@/models/Offer.model";
import { UserRole, OfferType } from "@/types/enums";

/**
 * GET /api/offers/active
 * Authenticated — returns active offers relevant to the user's role.
 * Boss sees Boss commission offers, Guard sees Guard commission offers.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) return createApiResponse(false, null, "Unauthorized.", 401);
    const { user } = authResult;

    await connectDB();

    const now = new Date();

    // Filter offers by role
    let relevantTypes: OfferType[];
    if (user.role === UserRole.BOSS) {
      relevantTypes = [
        OfferType.BOSS_COMMISSION_REDUCTION,
        OfferType.BOSS_COMMISSION_WAIVER,
        OfferType.SUBSCRIPTION_DISCOUNT,
        OfferType.SUBSCRIPTION_FREE_TRIAL,
      ];
    } else {
      relevantTypes = [
        OfferType.GUARD_COMMISSION_REDUCTION,
        OfferType.GUARD_COMMISSION_WAIVER,
      ];
    }

    const offers = await Offer.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
      offerType: { $in: relevantTypes },
    })
      .select('name description offerType discountType discountValue eligibility startDate endDate')
      .sort({ createdAt: -1 })
      .lean();

    return createApiResponse(true, offers, "Active offers fetched.", 200);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to fetch offers.";
    console.error("Active Offers Error:", error);
    return createApiResponse(false, null, errMsg, 500);
  }
}
