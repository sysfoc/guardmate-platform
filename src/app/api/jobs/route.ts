import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job.model';
import User from '@/models/User.model';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import { JobStatus, UserRole, UserStatus, BudgetType } from '@/types/enums';
import { processJobLifecycle } from '@/lib/jobs/jobLifecycle';

/**
 * POST /api/jobs
 * Boss only — create a new job posting.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, 'Unauthorized.', 401);
    }

    const { user } = authResult;

    if (user.role !== UserRole.BOSS) {
      return createApiResponse(false, null, 'Only Boss accounts can post jobs.', 403);
    }

    if (user.status !== UserStatus.ACTIVE) {
      return createApiResponse(false, null, 'Your account must be ACTIVE to post jobs.', 403);
    }

    if (!user.isCompanyVerified) {
      return createApiResponse(false, null, 'Your company must be verified to post jobs.', 403);
    }

    const body = await request.json();

    // Validate required fields
    const requiredFields = ['title', 'description', 'jobType', 'location', 'locationCity',
      'startDate', 'endDate', 'startTime', 'endTime', 'budgetType', 'budgetAmount', 'applicationDeadline'];

    for (const field of requiredFields) {
      if (!body[field] && body[field] !== 0 && body[field] !== false) {
        return createApiResponse(false, null, `Missing required field: ${field}`, 400);
      }
    }

    if (body.description && body.description.length > 2000) {
      return createApiResponse(false, null, 'Description must be 2000 characters or less.', 400);
    }

    // Calculate totalHours
    let totalHours = 0;
    if (body.startDate && body.endDate && body.startTime && body.endTime) {
      const start = new Date(body.startDate);
      const end = new Date(body.endDate);
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const [sh, sm] = body.startTime.split(':').map(Number);
      const [eh, em] = body.endTime.split(':').map(Number);
      const hoursPerDay = (eh + em / 60) - (sh + sm / 60);
      totalHours = Math.max(0, Math.round(days * hoursPerDay * 10) / 10);
    }

    await connectDB();

    const job = await Job.create({
      jobId: uuidv4(),
      postedBy: user.uid,
      companyName: user.companyName || 'Unknown Company',
      companyLogo: user.companyLogo || null,
      title: body.title,
      description: body.description,
      jobType: body.jobType,
      status: body.status === JobStatus.DRAFT ? JobStatus.DRAFT : JobStatus.OPEN,
      location: body.location,
      locationCity: body.locationCity,
      locationState: body.locationState || '',
      locationCountry: body.locationCountry || '',
      locationPostalCode: body.locationPostalCode || '',
      coordinates: body.coordinates || null,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      startTime: body.startTime,
      endTime: body.endTime,
      isFlexibleTime: body.isFlexibleTime || false,
      totalHours,
      budgetType: body.budgetType,
      budgetAmount: body.budgetAmount,
      budgetMax: body.budgetMax || null,
      requiredSkills: body.requiredSkills || [],
      requiredLicenseType: body.requiredLicenseType || null,
      requiresFirstAid: body.requiresFirstAid || false,
      requiresWhiteCard: body.requiresWhiteCard || false,
      requiresChildrenCheck: body.requiresChildrenCheck || false,
      minExperience: body.minExperience || 0,
      preferredLanguages: body.preferredLanguages || [],
      numberOfGuardsNeeded: body.numberOfGuardsNeeded || 1,
      applicationDeadline: new Date(body.applicationDeadline),
      isUrgent: body.isUrgent || false,
    });

    // Update boss stats
    await User.updateOne(
      { uid: user.uid },
      { $inc: { totalJobsPosted: 1, activeJobsCount: job.status === JobStatus.OPEN ? 1 : 0 } }
    );

    return createApiResponse(true, job.toObject(), 'Job created successfully.', 201);
  } catch (error: unknown) {
    console.error('POST /api/jobs error:', error);
    return createApiResponse(false, null, 'Failed to create job.', 500);
  }
}

/**
 * GET /api/jobs
 * Authenticated — paginated job listing with filters.
 * Runs expireJobs() first to clean up expired postings.
 * Mates see only OPEN jobs; Bosses see their own jobs with all statuses.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, 'Unauthorized.', 401);
    }

    const { user } = authResult;
    await connectDB();

    // Run lifecycle transitions silently (OPEN→EXPIRED, FILLED→IN_PROGRESS, etc.)
    processJobLifecycle().catch(() => {});

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '12')));
    const skip = (page - 1) * limit;

    const status = url.searchParams.get('status');
    const locationCity = url.searchParams.get('locationCity');
    const requiredSkills = url.searchParams.get('requiredSkills');
    const budgetType = url.searchParams.get('budgetType');
    const budgetMin = url.searchParams.get('budgetMin');
    const budgetMax = url.searchParams.get('budgetMax');
    const startDate = url.searchParams.get('startDate');
    const search = url.searchParams.get('search');
    const sortBy = url.searchParams.get('sortBy') || 'newest';

    // Build query
    const query: Record<string, unknown> = {};

    if (user.role === UserRole.MATE) {
      // Mates only see OPEN jobs
      query.status = JobStatus.OPEN;
    } else if (user.role === UserRole.BOSS) {
      // Bosses see their own jobs
      query.postedBy = user.uid;
      if (status) query.status = status;
    } else {
      // Admin or others — see everything
      if (status) query.status = status;
    }

    if (locationCity) {
      query.locationCity = { $regex: locationCity, $options: 'i' };
    }

    if (requiredSkills) {
      const skills = requiredSkills.split(',').map((s) => s.trim()).filter(Boolean);
      if (skills.length > 0) {
        query.requiredSkills = { $in: skills };
      }
    }

    if (budgetType) {
      query.budgetType = budgetType;
    }

    if (budgetMin || budgetMax) {
      const budgetQuery: Record<string, number> = {};
      if (budgetMin) budgetQuery.$gte = parseFloat(budgetMin);
      if (budgetMax) budgetQuery.$lte = parseFloat(budgetMax);
      query.budgetAmount = budgetQuery;
    }

    if (startDate) {
      query.startDate = { $gte: new Date(startDate) };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Sort
    let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
    switch (sortBy) {
      case 'budget_high':
        sortObj = { budgetAmount: -1 };
        break;
      case 'budget_low':
        sortObj = { budgetAmount: 1 };
        break;
      case 'deadline':
        sortObj = { applicationDeadline: 1 };
        break;
      default:
        sortObj = { createdAt: -1 };
    }

    const [jobs, total] = await Promise.all([
      Job.find(query).sort(sortObj).skip(skip).limit(limit).lean(),
      Job.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return createApiResponse(true, {
      data: jobs,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    }, 'Jobs fetched successfully.', 200);
  } catch (error: unknown) {
    console.error('GET /api/jobs error:', error);
    return createApiResponse(false, null, 'Failed to fetch jobs.', 500);
  }
}
