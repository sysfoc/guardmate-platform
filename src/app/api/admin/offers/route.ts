import { NextRequest } from "next/server";
import { verifyAndGetUser, createApiResponse } from "@/lib/serverAuth";
import connectDB from "@/lib/mongodb";
import Offer from "@/models/Offer.model";
import { UserRole, OfferType, DiscountType, OfferEligibility } from "@/types/enums";

/**
 * POST /api/admin/offers — Create a new offer (Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) return createApiResponse(false, null, "Unauthorized.", 401);
    const { user } = authResult;
    if (user.role !== UserRole.ADMIN) {
      return createApiResponse(false, null, "Admin only.", 403);
    }

    const body = await request.json();
    const { name, description, offerType, discountType, discountValue, eligibility, newUserDaysThreshold, startDate, endDate } = body;

    // Validation
    if (!name || !description || !offerType || !discountType || !startDate || !endDate) {
      return createApiResponse(false, null, "Name, description, offerType, discountType, startDate, and endDate are required.", 400);
    }
    if (!Object.values(OfferType).includes(offerType)) {
      return createApiResponse(false, null, `Invalid offerType. Must be one of: ${Object.values(OfferType).join(', ')}`, 400);
    }
    if (!Object.values(DiscountType).includes(discountType)) {
      return createApiResponse(false, null, `Invalid discountType. Must be one of: ${Object.values(DiscountType).join(', ')}`, 400);
    }
    if (discountType !== DiscountType.FULL_WAIVER && (discountValue === undefined || discountValue === null || discountValue <= 0)) {
      return createApiResponse(false, null, "discountValue is required and must be positive for non-waiver discounts.", 400);
    }
    if (new Date(endDate) <= new Date(startDate)) {
      return createApiResponse(false, null, "End date must be after start date.", 400);
    }

    await connectDB();

    const offer = await Offer.create({
      name: name.trim(),
      description: description.trim(),
      offerType,
      discountType,
      discountValue: discountType === DiscountType.FULL_WAIVER ? null : discountValue,
      eligibility: eligibility || OfferEligibility.ALL_USERS,
      newUserDaysThreshold: newUserDaysThreshold || 30,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: true,
      usageCount: 0,
      createdBy: user.uid,
    });

    return createApiResponse(true, offer.toObject(), "Offer created successfully.", 201);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to create offer.";
    console.error("Create Offer Error:", error);
    return createApiResponse(false, null, errMsg, 500);
  }
}

/**
 * GET /api/admin/offers — Paginated list of all offers (Admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) return createApiResponse(false, null, "Unauthorized.", 401);
    const { user } = authResult;
    if (user.role !== UserRole.ADMIN) {
      return createApiResponse(false, null, "Admin only.", 403);
    }

    await connectDB();

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;
    const isActive = url.searchParams.get("isActive");
    const offerType = url.searchParams.get("offerType");

    const query: Record<string, unknown> = {};
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      query.isActive = isActive === 'true';
    }
    if (offerType) query.offerType = offerType;

    const [offers, total] = await Promise.all([
      Offer.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Offer.countDocuments(query),
    ]);

    return createApiResponse(true, {
      data: offers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }, "Offers fetched.", 200);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to fetch offers.";
    console.error("Get Offers Error:", error);
    return createApiResponse(false, null, errMsg, 500);
  }
}
