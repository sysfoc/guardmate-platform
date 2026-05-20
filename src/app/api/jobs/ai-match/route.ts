import { NextRequest } from 'next/server';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job.model';
import { UserRole } from '@/types/enums';

// ─── POST /api/jobs/ai-match ─────────────────────────────────────────────────
// Called by Mate users to get AI-ranked job matches.
// Proxies to the Python AI service, then hydrates full job documents.

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const auth = await verifyAndGetUser(request);
    if (!auth) {
      return createApiResponse(false, null, 'Unauthorized', 401);
    }

    const { user } = auth;

    // 2. Only Mates can use AI matching
    if (user.role !== UserRole.MATE) {
      return createApiResponse(false, null, 'Only guard mates can use AI matching.', 403);
    }

    // 3. Call Python AI service
    const pythonUrl = process.env.PYTHON_AI_URL;
    const pythonSecret = process.env.PYTHON_SECRET_KEY;

    if (!pythonUrl || !pythonSecret) {
      console.error('AI Match: PYTHON_AI_URL or PYTHON_SECRET_KEY not configured.');
      return createApiResponse(false, null, 'AI matching service is not configured.', 503);
    }

    let aiResponse: Response;
    try {
      aiResponse = await fetch(`${pythonUrl}/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': pythonSecret,
        },
        body: JSON.stringify({ guardUid: user.uid }),
      });
    } catch (fetchError) {
      console.error('AI Match: Failed to reach Python service:', fetchError);
      return createApiResponse(false, null, 'AI matching service is currently unavailable.', 503);
    }

    // 4. Handle Python service errors
    if (!aiResponse.ok) {
      const errorBody = await aiResponse.text();
      console.error(`AI Match: Python service returned ${aiResponse.status}:`, errorBody);

      if (aiResponse.status === 404) {
        return createApiResponse(false, null, 'Guard profile not found for AI matching.', 404);
      }
      if (aiResponse.status === 401) {
        console.error('AI Match: API key mismatch — check PYTHON_SECRET_KEY.');
        return createApiResponse(false, null, 'AI service authentication failed.', 500);
      }
      return createApiResponse(false, null, 'AI matching service error.', 502);
    }

    const aiData = await aiResponse.json();
    const matches: { jobId: string; score: number; breakdown: { skills: number; license: number; experience: number }; skillDetails: { matched: { jobSkill: string; matchedWith: string; similarity: number }[]; unmatched: { jobSkill: string; closest: string | null; similarity: number }[] } }[] = aiData.matches || [];

    // 5. If no matches, return early
    if (matches.length === 0) {
      return createApiResponse(true, { data: [], total: 0 }, 'No matching jobs found.', 200);
    }

    // 6. Fetch full job documents in one query
    await connectDB();
    const jobIds = matches.map((m) => m.jobId);
    const jobs = await Job.find({ jobId: { $in: jobIds } }).lean();

    // 7. Build lookup map and preserve AI ranking order
    const jobMap: Record<string, typeof jobs[number]> = {};
    for (const job of jobs) {
      jobMap[job.jobId] = job;
    }

    const rankedJobs = matches
      .filter((m) => jobMap[m.jobId])
      .map((m) => ({
        ...jobMap[m.jobId],
        matchScore: m.score,
        matchBreakdown: m.breakdown,
        matchSkillDetails: m.skillDetails,
      }));

    return createApiResponse(
      true,
      { data: rankedJobs, total: rankedJobs.length },
      'AI matched jobs fetched successfully.',
      200
    );
  } catch (error) {
    console.error('AI Match: Unexpected error:', error);
    return createApiResponse(false, null, 'Internal server error.', 500);
  }
}
