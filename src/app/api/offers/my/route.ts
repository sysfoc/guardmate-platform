import { NextRequest } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import Offer from "@/models/Offer.model";
import UserOffer from "@/models/UserOffer.model";
import { UserRole, OfferType } from "@/types/enums";

/**
 * GET /api/offers/my
 * Authenticated Boss — returns all subscription discount offers the Boss has acquired,
 * enriched with full offer details and filtered to only currently active ones.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) return createApiResponse(false, null, "Unauthorized.", 401);
    const { user } = authResult;

    if (user.role !== UserRole.BOSS) {
      return createApiResponse(true, [], "Offers not available for this role.", 200);
    }

    await connectDB();

    const now = new Date();

    // Find all acquisitions for this user, then join with Offer details
    const acquiredRecords = await UserOffer.find({ userUid: user.uid })
      .sort({ acquiredAt: -1 })
      .lean();

    if (acquiredRecords.length === 0) {
      return createApiResponse(true, [], "No acquired offers.", 200);
    }

    const offerIds = acquiredRecords.map((r) => r.offerId);

    const offers = await Offer.find({
      _id: { $in: offerIds },
      offerType: OfferType.SUBSCRIPTION_DISCOUNT,
    })
      .select("name description offerType discountType discountValue eligibility startDate endDate isActive")
      .lean();

    // Merge acquisition metadata with offer details and mark active/consumed status
    const enriched = acquiredRecords
      .map((record) => {
        const offer = offers.find((o) => String(o._id) === record.offerId);
        if (!offer) return null;
        const isStillActive =
          offer.isActive && offer.startDate <= now && offer.endDate >= now;
        const isConsumed = !!record.usedAt;
        return {
          ...record,
          offer: {
            ...offer,
            _id: String(offer._id),
          },
          isStillActive,
          isConsumed,
        };
      })
      .filter(Boolean);

    return createApiResponse(true, enriched, "Acquired offers fetched.", 200);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to fetch acquired offers.";
    console.error("My Offers Error:", error);
    return createApiResponse(false, null, errMsg, 500);
  }
}
