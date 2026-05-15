'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Pagination } from '@/components/ui/Pagination';
import { UserProfileModal } from '@/components/admin/UserProfileModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getUsers, updateUserStatus, bulkUpdateStatus } from '@/lib/api/admin.api';
import type { UserProfile, MateProfile } from '@/types/user.types';
import { UserRole, UserStatus } from '@/types/enums';
import { ABNStatus } from '@/types/abr.types';
import { AustralianStateNames } from '@/types/abr.types';
import {
  Search,
  ShieldCheck,
  Eye,
  CheckCircle2,
  XCircle,
  Ban,

  FileText,
  Filter,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatPhoneNumber } from '@/lib/utils/phone';

const ITEMS_PER_PAGE = 10;

// ─── License Badge ────────────────────────────────────────────────────────────

import { ExpiryBadge } from '@/components/ui/ExpiryBadge';

// ─── License Status Badge ─────────────────────────────────────────────────────

function LicenseStatusBadge({ status }: { status: string | undefined }) {
  if (!status) return <span className="text-xs text-[var(--color-text-muted)]">—</span>;
  const map: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; label: string }> = {
    VALID: { variant: 'success', label: 'Valid' },
    PENDING_REVIEW: { variant: 'warning', label: 'Pending' },
    EXPIRING_SOON: { variant: 'warning', label: 'Expiring' },
    EXPIRED: { variant: 'danger', label: 'Expired' },
    REJECTED: { variant: 'danger', label: 'Rejected' },
  };
  const d = map[status] || { variant: 'neutral' as const, label: status };
  return <Badge variant={d.variant} size="sm">{d.label}</Badge>;
}

function VerificationBadge({ status }: { status: string | undefined }) {
  if (!status) return <span className="text-xs text-[var(--color-text-muted)]">—</span>;
  const map: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; label: string }> = {
    VERIFIED: { variant: 'success', label: 'Verified' },
    PENDING: { variant: 'warning', label: 'Pending' },
    UNVERIFIED: { variant: 'info', label: 'Unverified' },
    REJECTED: { variant: 'danger', label: 'Rejected' },
  };
  const d = map[status] || { variant: 'neutral' as const, label: status };
  return <Badge variant={d.variant} size="sm">{d.label}</Badge>;
}

// ─── Status Options ───────────────────────────────────────────────────────────

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'BANNED', label: 'Banned' },
];

// ─── Status Badge ─────────────────────────────────────────────────────────────

function ABNStatusBadge({ status, abn, state }: { status: string | undefined | null; abn?: string | null; state?: string | null }) {
  if (!status || status === ABNStatus.NOT_PROVIDED) return <span className="text-xs text-[var(--color-text-muted)]">—</span>;

  const isVerified = status === ABNStatus.VERIFIED;
  const isPending = status === ABNStatus.PENDING_VERIFICATION;

  return (
    <div className="flex flex-col gap-0.5">
      <Badge
        variant={isVerified ? 'success' : isPending ? 'warning' : 'neutral'}
        size="sm"
        className="text-[9px]"
      >
        {isVerified ? 'Verified' : status.replace(/_/g, ' ')}
      </Badge>
      {abn && (
        <span className="text-[9px] font-mono text-[var(--color-text-muted)]">
          {abn.slice(0, 2)} {abn.slice(2, 5)} {abn.slice(5, 8)} {abn.slice(8)}
        </span>
      )}
      {state && (
        <span className="text-[9px] text-[var(--color-text-muted)]">
          {AustralianStateNames[state as keyof typeof AustralianStateNames] || state}
        </span>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: string | undefined }) {
  if (!status) return <span className="text-xs text-[var(--color-text-muted)]">—</span>;
  const map: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; label: string }> = {
    ACTIVE: { variant: 'success', label: 'Active' },
    PENDING: { variant: 'warning', label: 'Pending' },
    SUSPENDED: { variant: 'info', label: 'Suspended' },
    BANNED: { variant: 'danger', label: 'Banned' },
  };
  const display = map[status] || { variant: 'neutral' as const, label: status };
  return <Badge variant={display.variant} size="sm">{display.label}</Badge>;
}

// ─── Inner Component ──────────────────────────────────────────────────────────

function GuardsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const currentStatus = searchParams.get('status') || '';
  const currentSearch = searchParams.get('search') || '';

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUids, setSelectedUids] = useState<string[]>([]);

  // Modal state
  const [profileUid, setProfileUid] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ uid: string; name: string; action: 'reject' | 'suspend' } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [actionLoading, setActionLoading] = useState(false);

  const updateUrl = useCallback(
    (params: Record<string, string>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, val]) => {
        if (val) newParams.set(key, val);
        else newParams.delete(key);
      });
      router.push(`/admin/guards?${newParams.toString()}`);
    },
    [router, searchParams]
  );

  const fetchGuards = useCallback(async () => {
    setIsLoading(true);
    try {
      const resp = await getUsers({
        role: UserRole.MATE,
        status: currentStatus || undefined,
        search: currentSearch || undefined,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      });
      if (resp.success) {
        setUsers(resp.data.users);
        setTotalPages(resp.data.totalPages);
        setTotal(resp.data.total);
      }
    } catch (err) {
      console.error('Fetch guards failed:', err);
      toast.error('Failed to load guard list.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, currentStatus, currentSearch]);

  useEffect(() => {
    fetchGuards();
  }, [fetchGuards]);

  // ── Actions ───────────────────────────────────────────────
  const handleApprove = async (uid: string) => {
    try {
      setActionLoading(true);
      const resp = await updateUserStatus(uid, UserStatus.ACTIVE);
      if (resp.success) {
        toast.success('Guard approved successfully!');
        fetchGuards();
      }
    } catch {
      toast.error('Failed to approve guard.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectModal || !rejectReason.trim()) {
      toast.error('Please provide a reason.');
      return;
    }
    try {
      setActionLoading(true);
      const status = rejectModal.action === 'reject' ? UserStatus.BANNED : UserStatus.SUSPENDED;
      const resp = await updateUserStatus(rejectModal.uid, status, rejectReason);
      if (resp.success) {
        toast.success(`Guard ${rejectModal.action === 'reject' ? 'rejected' : 'suspended'} successfully.`);
        setRejectModal(null);
        setRejectReason('');
        fetchGuards();
      }
    } catch {
      toast.error('Action failed.');
    } finally {
      setActionLoading(false);
    }
  };



  const handleRestore = async (uid: string) => {
    try {
      setActionLoading(true);
      const resp = await updateUserStatus(uid, UserStatus.ACTIVE, 'Restored by admin');
      if (resp.success) {
        toast.success('Guard restored successfully!');
        fetchGuards();
      }
    } catch {
      toast.error('Failed to restore guard.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkAction = async (status: string) => {
    if (selectedUids.length === 0) {
      toast.error('No users selected.');
      return;
    }
    try {
      setActionLoading(true);
      const resp = await bulkUpdateStatus(selectedUids, status);
      if (resp.success) {
        toast.success(`${resp.data.updated} users updated.`);
        setSelectedUids([]);
        fetchGuards();
      }
    } catch {
      toast.error('Bulk action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelect = (uid: string) => {
    setSelectedUids((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUids.length === users.length) {
      setSelectedUids([]);
    } else {
      setSelectedUids(users.map((u) => u.uid));
    }
  };

  // ── Search debounce ───────────────────────────────────────
  const [searchInput, setSearchInput] = useState(currentSearch);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchInput !== currentSearch) {
        updateUrl({ search: searchInput, page: '1' });
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-[var(--color-role-mate)]" />
            Guard Approvals
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Review and verify Mate user applications. ({total} total)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search name, email, license..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-sm focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none transition-all text-[var(--color-input-text)] placeholder:text-[var(--color-input-placeholder)]"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)] pointer-events-none" />
            <select
              className="pl-9 pr-7 py-2 rounded-xl bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none text-[var(--color-input-text)]"
              value={currentStatus}
              onChange={(e) => updateUrl({ status: e.target.value, page: '1' })}
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Bulk Actions ─────────────────────────────────────── */}
      {selectedUids.length > 0 && (
        <Card className="p-4 flex flex-wrap items-center justify-between gap-3 bg-[var(--color-primary-light)] border-[var(--color-primary)]/20">
          <span className="text-sm font-semibold text-[var(--color-primary)]">
            {selectedUids.length} user(s) selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => handleBulkAction(UserStatus.ACTIVE)}
              disabled={actionLoading}
              className="bg-[var(--color-btn-success-bg)] hover:bg-[var(--color-btn-success-hover-bg)] text-[var(--color-btn-success-text)]"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" /> Bulk Approve
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleBulkAction(UserStatus.BANNED)}
              disabled={actionLoading}
            >
              <XCircle className="h-4 w-4 mr-1" /> Bulk Reject
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedUids([])}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* ── Table ────────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-[var(--color-bg-subtle)] rounded-xl" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <ShieldCheck className="h-12 w-12 text-[var(--color-text-muted)] mx-auto mb-4" />
            <p className="text-[var(--color-text-secondary)] font-medium">No guards found matching your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[var(--color-table-header-bg)] border-b border-[var(--color-table-border)]">
                  <th className="px-4 py-3 text-left w-12">
                    <input
                      type="checkbox"
                      checked={selectedUids.length === users.length && users.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded accent-[var(--color-primary)]"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider w-[220px]">Guard</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider w-[140px] hidden lg:table-cell">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider w-[140px] hidden lg:table-cell">License</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider w-[100px] hidden lg:table-cell">Expires</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider w-[100px] hidden xl:table-cell">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider w-[80px]">Account</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider w-[70px] hidden xl:table-cell">Strikes</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider w-[160px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-table-border)]">
                {users.map((user) => {
                  const mate = user as MateProfile;
                  return (
                    <tr key={user._id} className="hover:bg-[var(--color-table-row-hover)] transition-colors">
                      <td className="px-4 py-4 align-middle">
                        <input
                          type="checkbox"
                          checked={selectedUids.includes(user.uid)}
                          onChange={() => toggleSelect(user.uid)}
                          className="h-4 w-4 rounded accent-[var(--color-primary)]"
                        />
                      </td>
                      <td className="px-4 py-4 align-middle">
                        <div className="flex items-center gap-3">
                          <Avatar src={user.profilePhoto || undefined} name={user.fullName} size="md" />
                          <div className="flex flex-col">
                            <span className="font-medium text-sm text-[var(--color-text-primary)] leading-tight">
                              {user.fullName}
                            </span>
                            <span className="text-xs text-[var(--color-text-muted)] leading-tight">
                              {user.email}
                            </span>
                            <span className="text-xs text-[var(--color-text-secondary)] leading-tight">
                              {formatPhoneNumber(user.phone, user.phoneCountryCode)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-middle hidden lg:table-cell">
                        <span className="text-sm text-[var(--color-text-primary)] truncate block max-w-[140px]">
                          {[(user.city || user.state), user.country].filter(Boolean).join(', ') || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-middle hidden lg:table-cell">
                        <span className="text-sm font-mono text-[var(--color-text-primary)] truncate block max-w-[140px]">
                          {mate.licenseNumber || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-middle hidden lg:table-cell">
                        <ExpiryBadge expiry={mate.licenseExpiry} />
                      </td>
                      <td className="px-4 py-4 align-middle hidden xl:table-cell">
                        <LicenseStatusBadge status={mate.licenseStatus} />
                      </td>
                      <td className="px-4 py-4 align-middle">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="px-4 py-4 align-middle hidden xl:table-cell">
                        {(mate.cancellationStrikes || 0) > 0 ? (
                          <Badge variant={(mate.cancellationStrikes || 0) >= 3 ? 'danger' : 'warning'} size="sm" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {mate.cancellationStrikes}
                          </Badge>
                        ) : (
                          <span className="text-sm text-[var(--color-text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 align-middle">
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            onClick={() => setProfileUid(user.uid)}
                            title="View Profile"
                            className="p-1.5 rounded-md hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {user.status === UserStatus.PENDING && (
                            <button
                              onClick={() => handleApprove(user.uid)}
                              title="Approve"
                              disabled={actionLoading}
                              className="p-1.5 rounded-md hover:bg-[var(--color-success-light)] text-[var(--color-success)] transition-colors"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                          {user.status !== UserStatus.BANNED && (
                            <button
                              onClick={() => setRejectModal({ uid: user.uid, name: user.fullName, action: 'reject' })}
                              title="Reject / Ban"
                              className="p-1.5 rounded-md hover:bg-[var(--color-danger-light)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                          {user.status !== UserStatus.SUSPENDED && user.status !== UserStatus.BANNED && (
                            <button
                              onClick={() => setRejectModal({ uid: user.uid, name: user.fullName, action: 'suspend' })}
                              title="Suspend"
                              className="p-1.5 rounded-md hover:bg-[var(--color-warning-light)] text-[var(--color-text-muted)] hover:text-[var(--color-warning)] transition-colors"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}
                          {(user.status === UserStatus.SUSPENDED || user.status === UserStatus.BANNED) && (
                            <button
                              onClick={() => handleRestore(user.uid)}
                              title="Restore"
                              disabled={actionLoading}
                              className="p-1.5 rounded-md hover:bg-[var(--color-success-light)] text-[var(--color-text-muted)] hover:text-[var(--color-success)] transition-colors"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(p) => updateUrl({ page: String(p) })}
        totalItems={total}
        itemsPerPage={ITEMS_PER_PAGE}
        showItemCount
      />

      {/* Profile Modal */}
      <UserProfileModal
        uid={profileUid}
        isOpen={!!profileUid}
        onClose={() => setProfileUid(null)}
        onStatusChanged={fetchGuards}
      />

      {/* Reject/Suspend Dialog */}
      <ConfirmDialog
        isOpen={!!rejectModal}
        onConfirm={handleRejectSubmit}
        onCancel={() => { setRejectModal(null); setRejectReason(''); }}
        title={rejectModal?.action === 'reject' ? 'Reject Guard' : 'Suspend Guard'}
        confirmLabel={rejectModal?.action === 'reject' ? 'Reject' : 'Suspend'}
        cancelLabel="Cancel"
        variant="danger"
        message={
          <div className="space-y-3 text-left">
            <p className="text-sm text-[var(--color-text-secondary)]">
              {rejectModal?.action === 'reject'
                ? `Rejecting "${rejectModal?.name}" will set their status to BANNED.`
                : `Suspending "${rejectModal?.name}" will temporarily disable their account.`}
            </p>
            <div>
              <label className="text-sm font-medium text-[var(--color-input-label)] block mb-1.5">
                Reason <span className="text-[var(--color-danger)]">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Provide a reason for this action..."
                className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] text-sm focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none resize-none placeholder:text-[var(--color-input-placeholder)]"
              />
            </div>
          </div>
        }
      />


    </div>
  );
}

// ─── Page Export ───────────────────────────────────────────────────────────────

export default function AdminGuardsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-[var(--color-bg-subtle)] rounded-xl w-64" />
        <div className="h-96 bg-[var(--color-bg-subtle)] rounded-xl" />
      </div>
    }>
      <GuardsPageInner />
    </Suspense>
  );
}
