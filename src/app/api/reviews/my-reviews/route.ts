import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Review from '@/models/Review.model';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, 'Unauthorized.', 401);
    }

    const { user } = authResult;
    await connectDB();

    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'received'; // 'received' or 'given'
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.max(1, parseInt(url.searchParams.get('limit') || '10'));
    const skip = (page - 1) * limit;

    const query: any = { isPublic: true };
    if (type === 'given') {
      query.reviewerId = user.uid;
    } else {
      query.receiverId = user.uid;
    }

    const [reviews, total] = await Promise.all([
      Review.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Review.countDocuments(query),
    ]);

    const pages = Math.ceil(total / limit);
    let averageRating: number | undefined = undefined;

    if (type === 'received' && total > 0) {
      const stats = await Review.aggregate([
        { $match: { receiverId: user.uid, isPublic: true } },
        { $group: { _id: null, avg: { $avg: '$rating' } } }
      ]);
      if (stats.length > 0) {
        averageRating = Math.round(stats[0].avg * 10) / 10;
      }
    }

    return createApiResponse(true, {
      reviews,
      total,
      page,
      pages,
      averageRating
    }, 'Reviews fetched successfully.', 200);
  } catch (error) {
    console.error('GET /api/reviews/my-reviews error:', error);
    return createApiResponse(false, null, 'Failed to fetch reviews.', 500);
  }
}
