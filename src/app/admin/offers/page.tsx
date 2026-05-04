'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Toggle } from '@/components/ui/Toggle';
import { Tag, Plus, Pencil, Trash2, AlertTriangle, Search, Filter, X } from 'lucide-react';
import { offerApi } from '@/lib/api/offer.api';
import { OfferType, DiscountType, OfferEligibility } from '@/types/enums';
import type { IOffer, CreateOfferPayload, UpdateOfferPayload } from '@/types/offer.types';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OFFER_TYPE_LABELS: Record<string, string> = {
  [OfferType.BOSS_COMMISSION_REDUCTION]: 'Boss Commission Reduction',
  [OfferType.GUARD_COMMISSION_REDUCTION]: 'Guard Commission Reduction',
  [OfferType.BOSS_COMMISSION_WAIVER]: 'Boss Commission Waiver',
  [OfferType.GUARD_COMMISSION_WAIVER]: 'Guard Commission Waiver',
  [OfferType.SUBSCRIPTION_DISCOUNT]: 'Subscription Discount',
  [OfferType.SUBSCRIPTION_FREE_TRIAL]: 'Subscription Free Trial',
};

const DISCOUNT_TYPE_LABELS: Record<string, string> = {
  [DiscountType.PERCENTAGE_OFF]: '% Off',
  [DiscountType.FIXED_RATE]: 'Fixed Rate',
  [DiscountType.FULL_WAIVER]: 'Full Waiver',
};

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isOfferActive(offer: IOffer): boolean {
  if (!offer.isActive) return false;
  const now = new Date();
  return new Date(offer.startDate) <= now && new Date(offer.endDate) >= now;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<IOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterActive, setFilterActive] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<IOffer | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOfferType, setFormOfferType] = useState<OfferType>(OfferType.BOSS_COMMISSION_REDUCTION);
  const [formDiscountType, setFormDiscountType] = useState<DiscountType>(DiscountType.PERCENTAGE_OFF);
  const [formDiscountValue, setFormDiscountValue] = useState<number | ''>('');
  const [formEligibility, setFormEligibility] = useState<OfferEligibility>(OfferEligibility.ALL_USERS);
  const [formNewUserDays, setFormNewUserDays] = useState(30);
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');

  const loadOffers = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = { page, limit: 20 };
      if (filterActive !== '') params.isActive = filterActive === 'true';
      if (filterType) params.offerType = filterType;
      const res = await offerApi.getAdminOffers(params as Parameters<typeof offerApi.getAdminOffers>[0]);
      setOffers(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  }, [page, filterActive, filterType]);

  useEffect(() => { loadOffers(); }, [loadOffers]);

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormOfferType(OfferType.BOSS_COMMISSION_REDUCTION);
    setFormDiscountType(DiscountType.PERCENTAGE_OFF);
    setFormDiscountValue('');
    setFormEligibility(OfferEligibility.ALL_USERS);
    setFormNewUserDays(30);
    setFormStartDate('');
    setFormEndDate('');
  };

  const openCreateModal = () => {
    setEditingOffer(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (offer: IOffer) => {
    setEditingOffer(offer);
    setFormName(offer.name);
    setFormDescription(offer.description);
    setFormOfferType(offer.offerType);
    setFormDiscountType(offer.discountType);
    setFormDiscountValue(offer.discountValue ?? '');
    setFormEligibility(offer.eligibility);
    setFormNewUserDays(offer.newUserDaysThreshold);
    setFormStartDate(new Date(offer.startDate).toISOString().split('T')[0]);
    setFormEndDate(new Date(offer.endDate).toISOString().split('T')[0]);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formName || !formDescription || !formStartDate || !formEndDate) {
      toast.error('Please fill in all required fields.');
      return;
    }
    try {
      setSaving(true);
      if (editingOffer) {
        const payload: UpdateOfferPayload = {
          name: formName,
          description: formDescription,
          offerType: formOfferType,
          discountType: formDiscountType,
          discountValue: formDiscountType === DiscountType.FULL_WAIVER ? null : Number(formDiscountValue) || null,
          eligibility: formEligibility,
          newUserDaysThreshold: formNewUserDays,
          startDate: formStartDate,
          endDate: formEndDate,
        };
        await offerApi.updateOffer(editingOffer._id!, payload);
        toast.success('Offer updated.');
      } else {
        const payload: CreateOfferPayload = {
          name: formName,
          description: formDescription,
          offerType: formOfferType,
          discountType: formDiscountType,
          discountValue: formDiscountType === DiscountType.FULL_WAIVER ? null : Number(formDiscountValue) || null,
          eligibility: formEligibility,
          newUserDaysThreshold: formNewUserDays,
          startDate: formStartDate,
          endDate: formEndDate,
        };
        await offerApi.createOffer(payload);
        toast.success('Offer created.');
      }
      setShowModal(false);
      loadOffers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save offer');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (offer: IOffer) => {
    try {
      await offerApi.updateOffer(offer._id!, { isActive: !offer.isActive });
      toast.success(offer.isActive ? 'Offer deactivated.' : 'Offer activated.');
      loadOffers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to toggle offer');
    }
  };

  const handleDelete = async (offer: IOffer) => {
    if (!confirm(`Delete "${offer.name}"? This cannot be undone.`)) return;
    try {
      await offerApi.deleteOffer(offer._id!);
      toast.success('Offer deleted.');
      loadOffers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete offer');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] flex items-center gap-2">
            <Tag className="h-6 w-6 text-[var(--color-primary)]" />
            Offers & Promotions
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Create and manage commission discounts and promotional offers. {total} offer{total !== 1 ? 's' : ''} total.
          </p>
        </div>
        <Button onClick={openCreateModal} leftIcon={<Plus className="h-4 w-4" />}>
          Create Offer
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-tertiary)]">
            <Filter className="h-4 w-4" />
            Filters:
          </div>
          <select
            value={filterActive}
            onChange={(e) => { setFilterActive(e.target.value); setPage(1); }}
            className="h-9 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 text-sm focus:ring-2 focus:ring-[var(--color-focus-ring)] focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            className="h-9 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 text-sm focus:ring-2 focus:ring-[var(--color-focus-ring)] focus:outline-none"
          >
            <option value="">All Types</option>
            {Object.entries(OFFER_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          {(filterActive || filterType) && (
            <button
              onClick={() => { setFilterActive(''); setFilterType(''); setPage(1); }}
              className="text-xs text-[var(--color-danger)] hover:underline flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
      </Card>

      {/* Offers Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)] uppercase text-[10px] font-bold tracking-widest">
              <tr>
                <th className="px-5 py-3">Offer</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Discount</th>
                <th className="px-5 py-3">Eligibility</th>
                <th className="px-5 py-3">Period</th>
                <th className="px-5 py-3 text-center">Uses</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-primary)]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-[var(--color-text-muted)]">
                    <div className="h-4 w-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading offers...
                  </td>
                </tr>
              ) : offers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-[var(--color-text-muted)]">
                    No offers found. Create your first offer to start!
                  </td>
                </tr>
              ) : (
                offers.map((offer) => (
                  <tr key={offer._id} className="hover:bg-[var(--color-bg-secondary)]/50 transition-colors">
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-sm font-bold text-[var(--color-text-primary)]">{offer.name}</p>
                        <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5 line-clamp-1">{offer.description}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant="info" className="text-[9px] whitespace-nowrap">
                        {OFFER_TYPE_LABELS[offer.offerType] || offer.offerType}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-[var(--color-text-primary)]">
                      {offer.discountType === DiscountType.FULL_WAIVER
                        ? 'Full Waiver'
                        : offer.discountType === DiscountType.PERCENTAGE_OFF
                          ? `${offer.discountValue}% off`
                          : `Fixed ${offer.discountValue}%`}
                    </td>
                    <td className="px-5 py-3 text-xs text-[var(--color-text-secondary)]">
                      {offer.eligibility === OfferEligibility.NEW_USERS_ONLY
                        ? `New users (${offer.newUserDaysThreshold}d)`
                        : 'All users'}
                    </td>
                    <td className="px-5 py-3 text-xs text-[var(--color-text-secondary)] whitespace-nowrap">
                      {formatDate(offer.startDate)} – {formatDate(offer.endDate)}
                    </td>
                    <td className="px-5 py-3 text-center text-sm font-bold text-[var(--color-text-primary)]">
                      {offer.usageCount}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Badge variant={isOfferActive(offer) ? 'success' : 'neutral'} className="text-[9px]">
                        {isOfferActive(offer) ? 'ACTIVE' : offer.isActive ? 'SCHEDULED' : 'INACTIVE'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Toggle
                          checked={offer.isActive}
                          onCheckedChange={() => handleToggleActive(offer)}
                        />
                        <button
                          onClick={() => openEditModal(offer)}
                          className="p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors text-[var(--color-text-secondary)]"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {offer.usageCount === 0 && (
                          <button
                            onClick={() => handleDelete(offer)}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-[var(--color-danger)]"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]/30">
            <p className="text-xs text-[var(--color-text-tertiary)]">
              Page {page} of {totalPages} ({total} total)
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl border border-[var(--color-border-primary)] w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                {editingOffer ? 'Edit Offer' : 'Create New Offer'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-[var(--color-bg-tertiary)] rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            {editingOffer && editingOffer.usageCount > 0 && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-md mb-4 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  This offer has been used {editingOffer.usageCount} time(s). Only the active toggle can be changed.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)] mb-1 block">Name *</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  disabled={editingOffer !== null && editingOffer.usageCount > 0}
                  className="w-full h-10 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 text-sm focus:ring-2 focus:ring-[var(--color-focus-ring)] focus:outline-none disabled:opacity-50"
                  placeholder="e.g. Launch Week Boss Discount"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)] mb-1 block">Description *</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  disabled={editingOffer !== null && editingOffer.usageCount > 0}
                  rows={2}
                  className="w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-focus-ring)] focus:outline-none disabled:opacity-50 resize-none"
                  placeholder="Brief description of the offer..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[var(--color-text-primary)] mb-1 block">Offer Type *</label>
                  <select
                    value={formOfferType}
                    onChange={(e) => setFormOfferType(e.target.value as OfferType)}
                    disabled={editingOffer !== null && editingOffer.usageCount > 0}
                    className="w-full h-10 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 text-sm focus:ring-2 focus:ring-[var(--color-focus-ring)] focus:outline-none disabled:opacity-50"
                  >
                    {Object.entries(OFFER_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--color-text-primary)] mb-1 block">Discount Type *</label>
                  <select
                    value={formDiscountType}
                    onChange={(e) => setFormDiscountType(e.target.value as DiscountType)}
                    disabled={editingOffer !== null && editingOffer.usageCount > 0}
                    className="w-full h-10 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 text-sm focus:ring-2 focus:ring-[var(--color-focus-ring)] focus:outline-none disabled:opacity-50"
                  >
                    {Object.entries(DISCOUNT_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              {formDiscountType !== DiscountType.FULL_WAIVER && (
                <div>
                  <label className="text-sm font-medium text-[var(--color-text-primary)] mb-1 block">
                    Discount Value {formDiscountType === DiscountType.PERCENTAGE_OFF ? '(%)' : '(rate)'}
                  </label>
                  <input
                    type="number"
                    value={formDiscountValue}
                    onChange={(e) => setFormDiscountValue(e.target.value ? Number(e.target.value) : '')}
                    disabled={editingOffer !== null && editingOffer.usageCount > 0}
                    min={0}
                    className="w-full h-10 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 text-sm focus:ring-2 focus:ring-[var(--color-focus-ring)] focus:outline-none disabled:opacity-50"
                    placeholder="e.g. 50"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[var(--color-text-primary)] mb-1 block">Eligibility</label>
                  <select
                    value={formEligibility}
                    onChange={(e) => setFormEligibility(e.target.value as OfferEligibility)}
                    disabled={editingOffer !== null && editingOffer.usageCount > 0}
                    className="w-full h-10 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 text-sm focus:ring-2 focus:ring-[var(--color-focus-ring)] focus:outline-none disabled:opacity-50"
                  >
                    <option value={OfferEligibility.ALL_USERS}>All Users</option>
                    <option value={OfferEligibility.NEW_USERS_ONLY}>New Users Only</option>
                  </select>
                </div>
                {formEligibility === OfferEligibility.NEW_USERS_ONLY && (
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-primary)] mb-1 block">New User Threshold (days)</label>
                    <input
                      type="number"
                      value={formNewUserDays}
                      onChange={(e) => setFormNewUserDays(Number(e.target.value) || 30)}
                      disabled={editingOffer !== null && editingOffer.usageCount > 0}
                      min={1}
                      className="w-full h-10 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 text-sm focus:ring-2 focus:ring-[var(--color-focus-ring)] focus:outline-none disabled:opacity-50"
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[var(--color-text-primary)] mb-1 block">Start Date *</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    disabled={editingOffer !== null && editingOffer.usageCount > 0}
                    className="w-full h-10 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 text-sm focus:ring-2 focus:ring-[var(--color-focus-ring)] focus:outline-none disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--color-text-primary)] mb-1 block">End Date *</label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    disabled={editingOffer !== null && editingOffer.usageCount > 0}
                    className="w-full h-10 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 text-sm focus:ring-2 focus:ring-[var(--color-focus-ring)] focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--color-border-primary)]">
              <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving...' : editingOffer ? 'Update Offer' : 'Create Offer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
