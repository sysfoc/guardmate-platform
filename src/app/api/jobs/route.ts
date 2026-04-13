import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job.model';
import User from '@/models/User.model';
import PlatformSettings from '@/models/PlatformSettings.model';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import { JobStatus, UserRole, UserStatus, BudgetType, HiringStatus } from '@/types/enums';
import { processJobLifecycle } from '@/lib/jobs/jobLifecycle';
import { calculateDistance } from '@/lib/utils/haversine';
import {
  isOvernightShift,
  calculateShiftDuration,
  getActualEndDate,
  calculateTotalScheduledHours,
} from '@/lib/utils/shiftCalculations';
import type { ShiftScheduleDay } from '@/types/job.types';
import { processAutoReleases } from '@/lib/disputes/autoRelease';

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

    // Validate required fields (startTime/endTime no longer required — shiftSchedule is used)
    const requiredFields = ['title', 'description', 'jobType', 'location', 'locationCity',
      'startDate', 'endDate', 'budgetType', 'budgetAmount', 'applicationDeadline'];

    for (const field of requiredFields) {
      if (!body[field] && body[field] !== 0 && body[field] !== false) {
        return createApiResponse(false, null, `Missing required field: ${field}`, 400);
      }
    }

    if (body.description && body.description.length > 2000) {
      return createApiResponse(false, null, 'Description must be 2000 characters or less.', 400);
    }

    await connectDB();

    // ─── MINIMUM RATE ENFORCEMENT ───────────────────────────────────────────
    const platformSettings = await PlatformSettings.findOne().lean();
    const minimumRateEnforced = platformSettings?.minimumRateEnforced ?? false;
    const minimumHourlyRate = platformSettings?.minimumHourlyRate ?? null;
    const minimumFixedRate = platformSettings?.minimumFixedRate ?? null;
    const currency = platformSettings?.platformCurrency || 'AUD';

    if (minimumRateEnforced) {
      // Validate budget amount is provided
      if (!body.budgetAmount || body.budgetAmount <= 0) {
        return createApiResponse(false, null, 'Budget amount is required.', 400);
      }

      if (body.budgetType === BudgetType.HOURLY && minimumHourlyRate !== null) {
        if (body.budgetAmount < minimumHourlyRate) {
          return createApiResponse(
            false,
            null,
            `The minimum hourly rate on this platform is ${currency}${minimumHourlyRate.toFixed(2)}. Your posted rate of ${currency}${body.budgetAmount.toFixed(2)} is below the minimum. Please increase your rate.`,
            400
          );
        }
      }

      if (body.budgetType === BudgetType.FIXED && minimumFixedRate !== null) {
        if (body.budgetAmount < minimumFixedRate) {
          return createApiResponse(
            false,
            null,
            `The minimum fixed rate on this platform is ${currency}${minimumFixedRate.toFixed(2)}. Your posted amount of ${currency}${body.budgetAmount.toFixed(2)} is below the minimum. Please increase your budget.`,
            400
          );
        }
      }
    }
    // ─── END MINIMUM RATE ENFORCEMENT ─────────────────────────────────────────

    // Process shiftSchedule — enrich each slot with computed fields
    let shiftSchedule: ShiftScheduleDay[] = [];
    let totalScheduledHours = 0;
    let totalHours = 0;

    if (body.shiftSchedule && Array.isArray(body.shiftSchedule) && body.shiftSchedule.length > 0) {
      shiftSchedule = body.shiftSchedule.map((day: ShiftScheduleDay) => ({
        date: day.date,
        slots: day.slots.map((slot) => {
          const overnight = isOvernightShift(slot.startTime, slot.endTime);
          const duration = calculateShiftDuration(slot.startTime, slot.endTime);
          const endDate = getActualEndDate(day.date, slot.startTime, slot.endTime);
          return {
            slotNumber: slot.slotNumber,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isOvernight: overnight,
            actualEndDate: endDate,
            durationHours: duration,
            assignedGuardUid: null,
          };
        }),
      }));
      totalScheduledHours = calculateTotalScheduledHours(shiftSchedule);
      totalHours = totalScheduledHours;
    } else if (body.startTime && body.endTime) {
      // Backward compat: build schedule from legacy startTime/endTime
      const start = new Date(body.startDate);
      const end = new Date(body.endDate);
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const guardsNeeded = body.numberOfGuardsNeeded || 1;
      const overnight = isOvernightShift(body.startTime, body.endTime);
      const duration = calculateShiftDuration(body.startTime, body.endTime);

      const current = new Date(body.startDate);
      for (let i = 0; i < days; i++) {
        const dateStr = current.toISOString().split('T')[0];
        const slots = [];
        for (let g = 1; g <= guardsNeeded; g++) {
          slots.push({
            slotNumber: g,
            startTime: body.startTime,
            endTime: body.endTime,
            isOvernight: overnight,
            actualEndDate: getActualEndDate(dateStr, body.startTime, body.endTime),
            durationHours: duration,
            assignedGuardUid: null,
          });
        }
        shiftSchedule.push({ date: dateStr, slots });
        current.setDate(current.getDate() + 1);
      }
      totalScheduledHours = calculateTotalScheduledHours(shiftSchedule);
      totalHours = totalScheduledHours;
    }

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
      startTime: body.startTime || null,
      endTime: body.endTime || null,
      isFlexibleTime: body.isFlexibleTime || false,
      totalHours,
      shiftSchedule,
      totalScheduledHours,
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
      hiringStatus: HiringStatus.OPEN,
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
 * Backward-compat migration: synthesize shiftSchedule from legacy startTime/endTime for old jobs.
 */
function migrateOldJobSchedule(job: Record<string, unknown>): Record<string, unknown> {
  const schedule = job.shiftSchedule as ShiftScheduleDay[] | undefined;
  if (schedule && Array.isArray(schedule) && schedule.length > 0) return job;

  const startTime = job.startTime as string | undefined;
  const endTime = job.endTime as string | undefined;
  if (!startTime || !endTime) return job;

  const startDate = new Date(job.startDate as string);
  const endDate = new Date(job.endDate as string);
  const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const guardsNeeded = (job.numberOfGuardsNeeded as number) || 1;
  const overnight = isOvernightShift(startTime, endTime);
  const duration = calculateShiftDuration(startTime, endTime);

  const shiftSchedule: ShiftScheduleDay[] = [];
  const current = new Date(startDate);
  for (let i = 0; i < days; i++) {
    const dateStr = current.toISOString().split('T')[0];
    const slots = [];
    for (let g = 1; g <= guardsNeeded; g++) {
      slots.push({
        slotNumber: g,
        startTime,
        endTime,
        isOvernight: overnight,
        actualEndDate: getActualEndDate(dateStr, startTime, endTime),
        durationHours: duration,
        assignedGuardUid: null,
      });
    }
    shiftSchedule.push({ date: dateStr, slots });
    current.setDate(current.getDate() + 1);
  }

  return {
    ...job,
    shiftSchedule,
    totalScheduledHours: calculateTotalScheduledHours(shiftSchedule),
    hiringStatus: job.hiringStatus || HiringStatus.OPEN,
    acceptedGuards: job.acceptedGuards || [],
    isShiftAssigned: job.isShiftAssigned || false,
  };
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
    
    // Process Phase 7 auto-releases
    processAutoReleases().catch(() => {});

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
    const myBids = url.searchParams.get('myBids'); // e.g., 'ACCEPTED'

    // Distance filter params
    const userLatParam = url.searchParams.get('userLat');
    const userLngParam = url.searchParams.get('userLng');
    const maxDistanceParam = url.searchParams.get('maxDistance');

    const userLat = userLatParam ? parseFloat(userLatParam) : null;
    const userLng = userLngParam ? parseFloat(userLngParam) : null;
    const maxDistance = maxDistanceParam ? parseFloat(maxDistanceParam) : null;
    const hasDistanceFilter = userLat !== null && userLng !== null && maxDistance !== null &&
      !isNaN(userLat) && !isNaN(userLng) && !isNaN(maxDistance);

    // Build query
    const query: Record<string, unknown> = {};

    if (user.role === UserRole.MATE) {
      if (myBids) {
        // If filtering by myBids, they are fetching specific status (e.g. IN_PROGRESS)
        if (status) query.status = status;
        
        // Fetch valid bids for this mate
        const Bid = (await import('@/models/Bid.model')).default;
        const myBidsFilter: Record<string, string> = { guardUid: user.uid };
        if (myBids !== 'ALL') myBidsFilter.status = myBids;
        
        const bids = await Bid.find(myBidsFilter).select('jobId').lean() as { jobId: string }[];
        const jobIds = bids.map((b) => b.jobId);
        query.jobId = { $in: jobIds };

      } else {
        // By default, Mate only sees OPEN jobs for applying
        query.status = JobStatus.OPEN;
      }
    } else if (user.role === UserRole.BOSS) {
      query.postedBy = user.uid;
      if (status) query.status = status;
    } else {
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

    // When distance filtering, fetch more to account for post-filter reduction
    const fetchLimit = hasDistanceFilter ? limit * 5 : limit;
    const fetchSkip = hasDistanceFilter ? 0 : skip;

    const [allJobs, totalBeforeDistance] = await Promise.all([
      Job.find(query).sort(sortObj).skip(fetchSkip).limit(hasDistanceFilter ? 500 : fetchLimit).lean(),
      Job.countDocuments(query),
    ]);

    let filteredJobs = allJobs;
    let total = totalBeforeDistance;

    // Apply distance filter in-memory
    if (hasDistanceFilter) {
      filteredJobs = allJobs.filter((job) => {
        const coords = job.coordinates as { lat: number; lng: number } | null | undefined;
        // If a job doesn't have coordinates, it cannot be physically verified to be within the distance limit.
        if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
          return false;
        }
        const dist = calculateDistance(userLat!, userLng!, coords.lat, coords.lng);
        return dist <= maxDistance!;
      });
      total = filteredJobs.length;
      // Apply pagination after distance filter
      filteredJobs = filteredJobs.slice(skip, skip + limit);
    }

    const totalPages = Math.ceil(total / limit);

    return createApiResponse(true, {
      data: filteredJobs,
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
