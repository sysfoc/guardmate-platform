import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from './firebase/firebaseAdmin';
import connectDB from './mongodb';
import User from '@/models/User.model';
import type { UserDocument } from '@/models/User.model';
import type { ApiResponse } from '@/types/api.types';
import * as admin from 'firebase-admin';

export function getIdTokenFromHeader(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return 'unknown';
}

export function getDeviceInfo(request: NextRequest): { device: string; userAgent: string; browser: string } {
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // Basic naive parsing for common devices
  let device = 'Desktop';
  if (/Mobile|Android|iP(hone|od|ad)/i.test(userAgent)) {
    device = 'Mobile';
  } else if (/Tablet/i.test(userAgent)) {
    device = 'Tablet';
  }

  // Basic naive parsing for browser
  let browser = 'Unknown Browser';
  if (/Chrome/i.test(userAgent) && !/Edg/i.test(userAgent)) browser = 'Chrome';
  else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) browser = 'Safari';
  else if (/Firefox/i.test(userAgent)) browser = 'Firefox';
  else if (/Edg/i.test(userAgent)) browser = 'Edge';
  
  return { device, userAgent, browser };
}

/**
 * Standardized API Response Builder ensuring strictly typed responses.
 */
export function createApiResponse<T>(
  success: boolean,
  data: T,
  message: string,
  statusCode: number,
  errors?: { code: string; message: string; field?: string }[]
): NextResponse {
  const payload: ApiResponse<T> = {
    success,
    data,
    message,
    statusCode,
    ...(errors && { errors })
  };
  return NextResponse.json(payload, { status: statusCode });
}

/**
 * Validates a Firebase Token from the request header and strictly queries
 * MongoDB to retrieve the associated User Document.
 */
export async function verifyAndGetUser(
  request: NextRequest
): Promise<{ decodedToken: admin.auth.DecodedIdToken; user: UserDocument } | null> {
  const token = getIdTokenFromHeader(request);
  if (!token) return null;

  const decodedToken = await verifyFirebaseToken(token);
  if (!decodedToken) return null;

  await connectDB();
  const user = await User.findOne({ uid: decodedToken.uid });
  
  if (!user) return null;

  return { decodedToken, user };
}
