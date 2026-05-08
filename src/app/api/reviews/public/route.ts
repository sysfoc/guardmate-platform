import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Review from '@/models/Review.model';

/**
 * GET /api/reviews/public
 * Returns the most recent public reviews for the landing page.
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const url = new URL(req.url);
    let limit = parseInt(url.searchParams.get('limit') || '9', 10);
    if (Number.isNaN(limit)) limit = 9;
    limit = Math.min(limit, 20);

    const reviews = await Review.find({ isPublic: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: { reviews },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}
