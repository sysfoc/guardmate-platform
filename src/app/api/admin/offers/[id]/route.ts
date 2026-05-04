import { NextRequest } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import Offer from "@/models/Offer.model";
import { UserRole, DiscountType } from "@/types/enums";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/offers/[id] — Update an offer (Admin only)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) return createApiResponse(false, null, "Unauthorized.", 401);
    const { user } = authResult;
    if (user.role !== UserRole.ADMIN) {
      return createApiResponse(false, null, "Admin only.", 403);
    }

    const { id } = await params;
    await connectDB();

    const offer = await Offer.findById(id);
    if (!offer) {
      return createApiResponse(false, null, "Offer not found.", 404);
    }

    const body = await request.json();

    // If offer has been used, only allow toggling isActive
    if (offer.usageCount > 0) {
      if (body.isActive !== undefined) {
        offer.isActive = body.isActive;
        await offer.save();
        return createApiResponse(true, offer.toObject(), "Offer status updated.", 200);
      }
      return createApiResponse(false, null, "Cannot edit an offer that has been used. You can only toggle its active status.", 400);
    }

    // Full edit allowed for unused offers
    if (body.name) offer.name = body.name.trim();
    if (body.description) offer.description = body.description.trim();
    if (body.offerType) offer.offerType = body.offerType;
    if (body.discountType) offer.discountType = body.discountType;
    if (body.discountValue !== undefined) {
      offer.discountValue = body.discountType === DiscountType.FULL_WAIVER ? null : body.discountValue;
    }
    if (body.eligibility) offer.eligibility = body.eligibility;
    if (body.newUserDaysThreshold !== undefined) offer.newUserDaysThreshold = body.newUserDaysThreshold;
    if (body.startDate) offer.startDate = new Date(body.startDate);
    if (body.endDate) offer.endDate = new Date(body.endDate);
    if (body.isActive !== undefined) offer.isActive = body.isActive;

    await offer.save();

    return createApiResponse(true, offer.toObject(), "Offer updated successfully.", 200);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to update offer.";
    console.error("Update Offer Error:", error);
    return createApiResponse(false, null, errMsg, 500);
  }
}

/**
 * DELETE /api/admin/offers/[id] — Delete an offer (Admin only, only if unused)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) return createApiResponse(false, null, "Unauthorized.", 401);
    const { user } = authResult;
    if (user.role !== UserRole.ADMIN) {
      return createApiResponse(false, null, "Admin only.", 403);
    }

    const { id } = await params;
    await connectDB();

    const offer = await Offer.findById(id);
    if (!offer) {
      return createApiResponse(false, null, "Offer not found.", 404);
    }

    if (offer.usageCount > 0) {
      return createApiResponse(false, null, "Cannot delete an offer that has been used. Deactivate it instead.", 400);
    }

    await Offer.findByIdAndDelete(id);

    return createApiResponse(true, null, "Offer deleted successfully.", 200);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to delete offer.";
    console.error("Delete Offer Error:", error);
    return createApiResponse(false, null, errMsg, 500);
  }
}
