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
import { getUsers, updateUserStatus, promoteToAdmin, bulkUpdateStatus } from '@/lib/api/admin.api';
import type { UserProfile, BossProfile } from '@/types/user.types';
import { UserRole, UserStatus } from '@/types/enums';
import {
  Search,
  Building2,
  Eye,
  CheckCircle2,
  XCircle,
  Ban,
  Crown,
  FileText,
  Filter,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatPhoneNumber } from '@/lib/utils/phone';

const ITEMS_PER_PAGE = 10;

// ─── License Badge ────────────────────────────────────────────────────────────

import { ExpiryBadge } from '@/components/ui/ExpiryBadge';

// ─── License Status Badge ─────────────────────────────────────────────────────

function CompanyLicenseStatusBadge({ status }: { status: string | undefined }) {
  if (!status) return <span className="text-xs text-[var(--color-text-muted)]">N/A</span>;
  const map: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; label: string }> = {
    VALID: { variant: 'success', label: 'Valid' },
    PENDING_REVIEW: { variant: 'warning', label: 'Pending' },
    EXPIRING_SOON: { variant: 'warning', label: 'Expiring' },
    EXPIRED: { variant: 'danger', label: 'Expired' },
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

function StatusBadge({ status }: { status: string }) {
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

function BossesPageInner() {
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

  // Modal State
  const [profileUid, setProfileUid] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ uid: string; name: string; action: 'reject' | 'suspend' } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [promoteConfirm, setPromoteConfirm] = useState<{ uid: string; name: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const updateUrl = useCallback(
    (params: Record<string, string>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, val]) => {
        if (val) newParams.set(key, val);
        else newParams.delete(key);
      });
      router.push(`/admin/bosses?${newParams.toString()}`);
    },
    [router, searchParams]
  );

  const fetchBosses = useCallback(async () => {
    setIsLoading(true);
    try {
      const resp = await getUsers({
        role: UserRole.BOSS,
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
      console.error('Fetch bosses failed:', err);
      toast.error('Failed to load boss list.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, currentStatus, currentSearch]);

  useEffect(() => {
    fetchBosses();
  }, [fetchBosses]);

  // ── Actions ───────────────────────────────────────────────
  const handleApprove = async (uid: string) => {
    try {
      setActionLoading(true);
      const resp = await updateUserStatus(uid, UserStatus.ACTIVE);
      if (resp.success) {
        toast.success('Boss approved successfully!');
        fetchBosses();
      }
    } catch {
      toast.error('Failed to approve boss.');
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
        toast.success(`Boss ${rejectModal.action === 'reject' ? 'rejected' : 'suspended'} successfully.`);
        setRejectModal(null);
        setRejectReason('');
        fetchBosses();
      }
    } catch {
      toast.error('Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePromote = async () => {
    if (!promoteConfirm) return;
    try {
      setActionLoading(true);
      const resp = await promoteToAdmin(promoteConfirm.uid);
      if (resp.success) {
        toast.success(`${promoteConfirm.name} promoted to Admin!`);
        setPromoteConfirm(null);
        fetchBosses();
      }
    } catch {
      toast.error('Promotion failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async (uid: string) => {
    try {
      setActionLoading(true);
      const resp = await updateUserStatus(uid, UserStatus.ACTIVE, 'Restored by admin');
      if (resp.success) {
        toast.success('Boss restored successfully!');
        fetchBosses();
      }
    } catch {
      toast.error('Failed to restore boss.');
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
        fetchBosses();
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
            <Building2 className="h-6 w-6 text-[var(--color-role-boss)]" />
            Boss Approvals
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Manage employer applications and company verifications. ({total} total)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search name, email, company..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-sm focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none transition-all text-[var(--color-input-text)] placeholder:text-[var(--color-input-placeholder)]"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)] pointer-events-none" />
            <select
              className="pl-10 pr-8 py-2.5 rounded-xl bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none text-[var(--color-input-text)]"
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
            <Building2 className="h-12 w-12 text-[var(--color-text-muted)] mx-auto mb-4" />
            <p className="text-[var(--color-text-secondary)] font-medium">No bosses found matching your criteria.</p>
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider w-[220px]">Boss</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider w-[180px] hidden lg:table-cell">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider w-[140px] hidden lg:table-cell">License</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider w-[100px] hidden lg:table-cell">Expires</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider w-[100px] hidden xl:table-cell">License Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider w-[80px]">Account</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider w-[160px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-table-border)]">
                {users.map((user) => {
                  const boss = user as BossProfile;
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
                        <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate block max-w-[160px]">
                          {boss.companyName || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-middle hidden lg:table-cell">
                        <span className="text-sm font-mono text-[var(--color-text-primary)] truncate block max-w-[120px]">
                          {boss.companyLicenseNumber || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-middle hidden lg:table-cell">
                        <ExpiryBadge expiry={boss.companyLicenseExpiry} />
                      </td>
                      <td className="px-4 py-4 align-middle hidden xl:table-cell">
                        <CompanyLicenseStatusBadge status={boss.companyLicenseStatus} />
                      </td>
                      <td className="px-4 py-4 align-middle">
                        <StatusBadge status={user.status} />
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
                          {(user.status === UserStatus.PENDING || user.status === UserStatus.ACTIVE) && (
                            <button
                              onClick={() => setPromoteConfirm({ uid: user.uid, name: user.fullName })}
                              title="Promote to Admin"
                              className="p-1.5 rounded-md hover:bg-[var(--color-role-admin-light)] text-[var(--color-text-muted)] hover:text-[var(--color-role-admin)] transition-colors"
                            >
                              <Crown className="h-4 w-4" />
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
        onStatusChanged={fetchBosses}
      />

      {/* Reject/Suspend Dialog */}
      <ConfirmDialog
        isOpen={!!rejectModal}
        onConfirm={handleRejectSubmit}
        onCancel={() => { setRejectModal(null); setRejectReason(''); }}
        title={rejectModal?.action === 'reject' ? 'Reject Boss' : 'Suspend Boss'}
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

      {/* Promote Confirmation */}
      <ConfirmDialog
        isOpen={!!promoteConfirm}
        onConfirm={handlePromote}
        onCancel={() => setPromoteConfirm(null)}
        title="Promote to Admin"
        message={`This will irreversibly promote "${promoteConfirm?.name}" to Admin role. They will gain admin privileges. This action cannot be undone.`}
        confirmLabel="Promote to Admin"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}

// ─── Page Export ───────────────────────────────────────────────────────────────

export default function AdminBossesPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-[var(--color-bg-subtle)] rounded-xl w-64" />
        <div className="h-96 bg-[var(--color-bg-subtle)] rounded-xl" />
      </div>
    }>
      <BossesPageInner />
    </Suspense>
  );
}
