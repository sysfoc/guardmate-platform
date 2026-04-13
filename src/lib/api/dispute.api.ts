import { apiGet } from '@/lib/apiClient';
import type { ApiResponse } from '@/types/api.types';
import type { 
  IDispute, 
  CreateDisputePayload, 
  RespondToDisputePayload 
} from '@/types/dispute.types';

/**
 * createDispute
 * Boss or Mate can raise a dispute against a shift
 * This uses FormData to support file uploads.
 */
export async function createDispute(payload: CreateDisputePayload, files: File[]): Promise<IDispute> {
  const formData = new FormData();
  formData.append('jobId', payload.jobId);
  formData.append('reason', payload.reason);
  formData.append('description', payload.description);
  
  if (files && files.length > 0) {
    files.forEach(file => {
      formData.append('evidence', file);
    });
  }

  // We bypass apiClient for FormData due to Content-Type headers
  const token = localStorage.getItem('token');
  const response = await fetch('/api/disputes', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  const parsed = await response.json();
  if (!parsed.success) {
    throw new Error(parsed.message || 'Failed to create dispute');
  }

  return parsed.data;
}

/**
 * respondToDispute
 * The challenged party responds to a dispute
 */
export async function respondToDispute(disputeId: string, payload: RespondToDisputePayload, files: File[]): Promise<IDispute> {
  const formData = new FormData();
  formData.append('description', payload.description);
  
  if (files && files.length > 0) {
    files.forEach(file => {
      formData.append('evidence', file);
    });
  }

  const token = localStorage.getItem('token');
  const response = await fetch(`/api/disputes/${disputeId}/respond`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  const parsed = await response.json();
  if (!parsed.success) {
    throw new Error(parsed.message || 'Failed to respond to dispute');
  }

  return parsed.data;
}

/**
 * getMyDisputes
 * Fetch disputes for the current user (Boss or Guard)
 */
export async function getMyDisputes(filters: {
  page?: number;
  limit?: number;
  status?: string;
} = {}): Promise<ApiResponse<{
  data: IDispute[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>> {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.append(key, String(value));
  });
  return await apiGet(`/api/disputes?${query.toString()}`);
}

/**
 * getDisputeById
 * Get full dispute details
 */
export async function getDisputeById(id: string): Promise<ApiResponse<any>> {
  return await apiGet(`/api/disputes/${id}`);
}
