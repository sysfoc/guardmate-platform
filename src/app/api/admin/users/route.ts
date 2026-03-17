import { NextRequest } from 'next/server';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User.model';
import { UserRole } from '@/types/enums';

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await verifyAndGetUser(request);
  if (!auth || auth.user.role !== UserRole.ADMIN) {
    return createApiResponse(false, null, 'Unauthorized — Admin access required.', 403);
  }

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const country = searchParams.get('country') || undefined;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (role) filter.role = { $regex: new RegExp(`^${role}$`, 'i') };
    if (status) filter.status = status;
    if (country) filter.country = { $regex: country, $options: 'i' };

    // Date range filter
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        dateFilter.$lte = to;
      }
      filter.createdAt = dateFilter;
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { licenseNumber: searchRegex },
        { companyName: searchRegex },
        { companyLicenseNumber: searchRegex },
      ];
    }

    // Build sort — map friendly names to DB fields
    const sortFieldMap: Record<string, string> = {
      name: 'firstName',
      role: 'role',
      status: 'status',
      createdAt: 'createdAt',
      email: 'email',
    };
    const sortField = sortFieldMap[sortBy] || 'createdAt';

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    const serialized = users.map((u) => ({
      ...u,
      _id: String(u._id),
      fullName: `${u.firstName} ${u.lastName}`,
      createdAt: u.createdAt ? new Date(u.createdAt as string).toISOString() : '',
      updatedAt: u.updatedAt ? new Date(u.updatedAt as string).toISOString() : '',
    }));

    return createApiResponse(
      true,
      {
        users: serialized,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      'Users fetched successfully.',
      200
    );
  } catch (error: unknown) {
    console.error('GET /api/admin/users error:', error);
    return createApiResponse(false, null, 'Failed to fetch users.', 500);
  }
}
