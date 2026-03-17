import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Review from '@/models/Review.model';

/**
 * GET /api/reviews/[uid]/stats
 * Returns overall rating stats for a user.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await dbConnect();
    const { uid } = await params;

    const stats = await Review.aggregate([
      { $match: { receiverId: uid, isPublic: true } },
      {
        $group: {
          _id: '$receiverId',
          averageRating: { $avg: '$rating' },
          totalReviews: { $count: {} },
          ratingCounts: {
            $push: '$rating',
          },
        },
      },
    ]);

    if (stats.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          averageRating: 0,
          totalReviews: 0,
          ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        },
      });
    }

    const s = stats[0];
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    s.ratingCounts.forEach((r: number) => {
      counts[r] = (counts[r] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      data: {
        averageRating: parseFloat(s.averageRating.toFixed(1)),
        totalReviews: s.totalReviews,
        ratingCounts: counts,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch review stats' },
      { status: 500 }
    );
  }
}
