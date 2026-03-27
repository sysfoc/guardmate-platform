import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import IncidentReport from '@/models/IncidentReport.model';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import { UserRole } from '@/types/enums';
import type { IncidentType, IncidentSeverity } from '@/types/enums';

/**
 * GET /api/admin/incidents
 * Admin only — paginated, filterable list of all incident reports.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, 'Unauthorized.', 401);
    }

    const { user } = authResult;
    if (user.role !== UserRole.ADMIN) {
      return createApiResponse(false, null, 'Admin access required.', 403);
    }

    await connectDB();

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
    const limit = 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: Record<string, unknown> = {};

    const severityParam = url.searchParams.get('severity');
    if (severityParam) {
      filter.severity = severityParam as IncidentSeverity;
    }

    const typeParam = url.searchParams.get('incidentType');
    if (typeParam) {
      filter.incidentType = typeParam as IncidentType;
    }

    const fromDate = url.searchParams.get('from');
    const toDate = url.searchParams.get('to');
    if (fromDate || toDate) {
      const dateFilter: Record<string, Date> = {};
      if (fromDate) dateFilter.$gte = new Date(fromDate);
      if (toDate) dateFilter.$lte = new Date(toDate);
      filter.createdAt = dateFilter;
    }

    const [incidents, total] = await Promise.all([
      IncidentReport.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      IncidentReport.countDocuments(filter),
    ]);

    return createApiResponse(
      true,
      { incidents, total, page, totalPages: Math.ceil(total / limit) },
      'Admin incident reports retrieved.',
      200
    );
  } catch (error: unknown) {
    console.error('GET /api/admin/incidents error:', error);
    return createApiResponse(false, null, 'Failed to retrieve incident reports.', 500);
  }
}

/**
 * PATCH /api/admin/incidents
 * Admin only — mark an incident as reviewed.
 */
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, 'Unauthorized.', 401);
    }

    const { user } = authResult;
    if (user.role !== UserRole.ADMIN) {
      return createApiResponse(false, null, 'Admin access required.', 403);
    }

    const body = await request.json();
    const { incidentId } = body;

    if (!incidentId || typeof incidentId !== 'string') {
      return createApiResponse(false, null, 'Incident ID is required.', 400);
    }

    await connectDB();

    const incident = await IncidentReport.findByIdAndUpdate(
      incidentId,
      {
        $set: {
          isReviewedByAdmin: true,
          adminReviewedAt: new Date(),
        },
      },
      { new: true }
    ).lean();

    if (!incident) {
      return createApiResponse(false, null, 'Incident report not found.', 404);
    }

    return createApiResponse(true, incident, 'Incident marked as reviewed.', 200);
  } catch (error: unknown) {
    console.error('PATCH /api/admin/incidents error:', error);
    return createApiResponse(false, null, 'Failed to update incident.', 500);
  }
}
