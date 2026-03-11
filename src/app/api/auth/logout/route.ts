import { NextRequest } from 'next/server';
import { createApiResponse } from '@/lib/serverAuth';

export async function POST(request: NextRequest) {
  try {
    // Optional server side hook behavior during app logout
    const response = createApiResponse(true, null, 'Logged out successfully', 200);
    response.cookies.delete('__role');
    return response;
  } catch (error: any) {
    console.error('Logout API Error:', error);
    return createApiResponse(false, null, 'An internal server error occurred during logout.', 500);
  }
}
