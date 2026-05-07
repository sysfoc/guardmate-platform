// ─────────────────────────────────────────────────────────────────────────────
// Offer Client API
// Phase 8: Commission, Subscription & Offers System
// ─────────────────────────────────────────────────────────────────────────────

import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/apiClient';
import type { IOffer, IUserOffer, CreateOfferPayload, UpdateOfferPayload } from '@/types/offer.types';

export const offerApi = {
  /**
   * Get active subscription discount offers for the authenticated Boss.
   */
  async getActiveOffers(): Promise<IOffer[]> {
    const res = await apiGet<IOffer[]>('/api/offers/active');
    return res.data;
  },

  /**
   * Acquire/claim an active subscription discount offer (Boss only).
   */
  async acquireOffer(offerId: string): Promise<IUserOffer> {
    const res = await apiPost<IUserOffer>('/api/offers/acquire', { offerId });
    return res.data;
  },

  /**
   * Get all subscription discount offers acquired by the authenticated Boss.
   */
  async getMyOffers(): Promise<(IUserOffer & { offer: IOffer; isStillActive: boolean; isConsumed: boolean })[]> {
    const res = await apiGet<(IUserOffer & { offer: IOffer; isStillActive: boolean; isConsumed: boolean })[]>('/api/offers/my');
    return res.data;
  },

  /**
   * Admin: Get paginated list of all offers.
   */
  async getAdminOffers(params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    offerType?: string;
  }): Promise<{
    data: IOffer[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.isActive !== undefined) query.set('isActive', String(params.isActive));
    if (params?.offerType) query.set('offerType', params.offerType);

    const qs = query.toString();
    const res = await apiGet<{
      data: IOffer[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/api/admin/offers${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  /**
   * Admin: Create a new offer.
   */
  async createOffer(payload: CreateOfferPayload): Promise<IOffer> {
    const res = await apiPost<IOffer>('/api/admin/offers', payload);
    return res.data;
  },

  /**
   * Admin: Update an offer.
   */
  async updateOffer(id: string, payload: UpdateOfferPayload): Promise<IOffer> {
    const res = await apiPatch<IOffer>(`/api/admin/offers/${id}`, payload);
    return res.data;
  },

  /**
   * Admin: Delete an unused offer.
   */
  async deleteOffer(id: string): Promise<void> {
    await apiDelete(`/api/admin/offers/${id}`);
  },
};
