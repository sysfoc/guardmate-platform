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
import type { UserProfile, MateProfile } from '@/types/user.types';
import { UserRole, UserStatus } from '@/types/enums';
import {
  Search,
  ShieldCheck,
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

const ITEMS_PER_PAGE = 10;

// ─── License Badge ────────────────────────────────────────────────────────────

function LicenseExpiryBadge({ expiry }: { expiry: string | null }) {
  if (!expiry) return <span className="text-xs text-[var(--color-text-muted)]">N/A</span>;

  const expiryDate = new Date(expiry);
  const now = new Date();
  const daysUntil = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) {
    return <Badge variant="danger" size="sm" dot>Expired</Badge>;
  }
  if (daysUntil <= 30) {
    return <Badge variant="warning" size="sm" dot>Expiring ({daysUntil}d)</Badge>;
  }
  return <span className="text-xs text-[var(--color-text-primary)]">{expiryDate.toLocaleDateString()}</span>;
}

// ─── License Status Badge ─────────────────────────────────────────────────────

function LicenseStatusBadge({ status }: { status: string | undefined }) {
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
  const [promoteConfirm, setPromoteConfirm] = useState<{ uid: string; name: string } | null>(null);
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

  const handlePromote = async () => {
    if (!promoteConfirm) return;
    try {
      setActionLoading(true);
      const resp = await promoteToAdmin(promoteConfirm.uid);
      if (resp.success) {
        toast.success(`${promoteConfirm.name} promoted to Admin!`);
        setPromoteConfirm(null);
        fetchGuards();
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
            <ShieldCheck className="h-12 w-12 text-[var(--color-text-muted)] mx-auto mb-4" />
            <p className="text-[var(--color-text-secondary)] font-medium">No guards found matching your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--color-table-header-bg)] border-b border-[var(--color-table-border)]">
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedUids.length === users.length && users.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded accent-[var(--color-primary)]"
                    />
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider hidden md:table-cell">Email</th>
                  <th className="px-4 py-3 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider hidden lg:table-cell">Phone</th>
                  <th className="px-4 py-3 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider hidden xl:table-cell">License #</th>
                  <th className="px-4 py-3 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider hidden xl:table-cell">Type</th>
                  <th className="px-4 py-3 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider hidden xl:table-cell">Expiry</th>
                  <th className="px-4 py-3 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider hidden 2xl:table-cell">Doc</th>
                  <th className="px-4 py-3 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider hidden xl:table-cell">License Status</th>
                  <th className="px-4 py-3 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider hidden 2xl:table-cell">Skills</th>
                  <th className="px-4 py-3 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider hidden md:table-cell">Registered</th>
                  <th className="px-4 py-3 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-table-border)]">
                {users.map((user) => {
                  const mate = user as MateProfile;
                  return (
                    <tr key={user._id} className="hover:bg-[var(--color-table-row-hover)] transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedUids.includes(user.uid)}
                          onChange={() => toggleSelect(user.uid)}
                          className="h-4 w-4 rounded accent-[var(--color-primary)]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={user.profilePhoto || undefined} name={user.fullName} size="sm" />
                          <span className="font-semibold text-sm text-[var(--color-text-primary)] truncate max-w-[120px]">
                            {user.fullName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)] hidden md:table-cell truncate max-w-[180px]">
                        {user.email}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)] hidden lg:table-cell">
                        {user.phone || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-primary)] font-mono hidden xl:table-cell">
                        {mate.licenseNumber || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)] hidden xl:table-cell">
                        {mate.licenseType || '—'}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <LicenseExpiryBadge expiry={mate.licenseExpiry} />
                      </td>
                      <td className="px-4 py-3 hidden 2xl:table-cell">
                        {mate.licenseDocument ? (
                          <a
                            href={mate.licenseDocument}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--color-link)] hover:text-[var(--color-link-hover)] inline-flex items-center gap-1 text-xs font-medium"
                          >
                            <FileText className="h-3.5 w-3.5" /> View
                          </a>
                        ) : (
                          <span className="text-xs text-[var(--color-text-muted)]">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <LicenseStatusBadge status={mate.licenseStatus} />
                      </td>
                      <td className="px-4 py-3 hidden 2xl:table-cell">
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {(mate.skills || []).slice(0, 2).map((s) => (
                            <span key={s} className="px-1.5 py-0.5 rounded-md bg-[var(--color-bg-subtle)] text-[10px] text-[var(--color-text-secondary)] border border-[var(--color-surface-border)]">
                              {s}
                            </span>
                          ))}
                          {(mate.skills?.length || 0) > 2 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-[var(--color-bg-subtle)] text-[10px] text-[var(--color-text-muted)] border border-[var(--color-surface-border)]">
                              +{(mate.skills?.length || 0) - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--color-text-muted)] hidden md:table-cell">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setProfileUid(user.uid)}
                            title="View Profile"
                            className="p-1.5 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {user.status === UserStatus.PENDING && (
                            <button
                              onClick={() => handleApprove(user.uid)}
                              title="Approve"
                              disabled={actionLoading}
                              className="p-1.5 rounded-lg hover:bg-[var(--color-success-light)] text-[var(--color-success)] transition-colors"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                          {user.status !== UserStatus.BANNED && (
                            <button
                              onClick={() => setRejectModal({ uid: user.uid, name: user.fullName, action: 'reject' })}
                              title="Reject / Ban"
                              className="p-1.5 rounded-lg hover:bg-[var(--color-danger-light)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                          {user.status !== UserStatus.SUSPENDED && user.status !== UserStatus.BANNED && (
                            <button
                              onClick={() => setRejectModal({ uid: user.uid, name: user.fullName, action: 'suspend' })}
                              title="Suspend"
                              className="p-1.5 rounded-lg hover:bg-[var(--color-warning-light)] text-[var(--color-text-muted)] hover:text-[var(--color-warning)] transition-colors"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}
                          {(user.status === UserStatus.SUSPENDED || user.status === UserStatus.BANNED) && (
                            <button
                              onClick={() => handleRestore(user.uid)}
                              title="Restore"
                              disabled={actionLoading}
                              className="p-1.5 rounded-lg hover:bg-[var(--color-success-light)] text-[var(--color-text-muted)] hover:text-[var(--color-success)] transition-colors"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          )}
                          {(user.status === UserStatus.PENDING || user.status === UserStatus.ACTIVE) && (
                            <button
                              onClick={() => setPromoteConfirm({ uid: user.uid, name: user.fullName })}
                              title="Promote to Admin"
                              className="p-1.5 rounded-lg hover:bg-[var(--color-role-admin-light)] text-[var(--color-text-muted)] hover:text-[var(--color-role-admin)] transition-colors"
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
