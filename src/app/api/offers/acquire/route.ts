import { NextRequest } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import Offer from "@/models/Offer.model";
import UserOffer from "@/models/UserOffer.model";
import User from "@/models/User.model";
import { OfferEligibility, UserRole, OfferType } from "@/types/enums";

/**
 * POST /api/offers/acquire
 * Authenticated Boss — manually acquires/clams an active subscription discount offer.
 * Validates eligibility before allowing acquisition.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) return createApiResponse(false, null, "Unauthorized.", 401);
    const { user } = authResult;

    if (user.role !== UserRole.BOSS) {
      return createApiResponse(false, null, "Offers are only available for Boss accounts.", 403);
    }

    const body = await request.json();
    const { offerId } = body;

    if (!offerId) {
      return createApiResponse(false, null, "offerId is required.", 400);
    }

    await connectDB();

    // Verify the offer exists and is active
    const offer = await Offer.findById(offerId).lean();
    if (!offer) {
      return createApiResponse(false, null, "Offer not found.", 404);
    }
    if (!offer.isActive) {
      return createApiResponse(false, null, "This offer is no longer active.", 400);
    }
    if (offer.offerType !== OfferType.SUBSCRIPTION_DISCOUNT) {
      return createApiResponse(false, null, "Invalid offer type.", 400);
    }
    const now = new Date();
    if (offer.startDate > now || offer.endDate < now) {
      return createApiResponse(false, null, "This offer has expired.", 400);
    }

    // Check if already acquired
    const existing = await UserOffer.findOne({ userUid: user.uid, offerId }).lean();
    if (existing) {
      return createApiResponse(false, null, "You have already acquired this offer.", 409);
    }

    // Validate eligibility rules
    if (offer.eligibility === OfferEligibility.NEW_USERS_ONLY) {
      const userDoc = await User.findOne({ uid: user.uid }).select("createdAt").lean();
      if (!userDoc || !userDoc.createdAt) {
        return createApiResponse(false, null, "Unable to verify account age.", 400);
      }
      const registeredAt = new Date(userDoc.createdAt as string);
      const thresholdMs = (offer.newUserDaysThreshold || 30) * 24 * 60 * 60 * 1000;
      const cutoff = new Date(Date.now() - thresholdMs);
      if (registeredAt < cutoff) {
        return createApiResponse(false, null, "This offer is only available to new users.", 403);
      }
    }

    // Create acquisition record
    const acquired = await UserOffer.create({
      userUid: user.uid,
      offerId,
      acquiredAt: new Date(),
    });

    return createApiResponse(true, acquired.toObject(), "Offer acquired successfully.", 201);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to acquire offer.";
    console.error("Acquire Offer Error:", error);
    return createApiResponse(false, null, errMsg, 500);
  }
}
