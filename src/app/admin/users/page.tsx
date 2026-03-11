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
import { getUsers, updateUserStatus, promoteToAdmin } from '@/lib/api/admin.api';
import type { UserProfile } from '@/types/user.types';
import { UserRole, UserStatus } from '@/types/enums';
import {
  Users,
  Search,
  Filter,
  Download,
  Eye,
  Ban,
  XCircle,
  Crown,
  MapPin,
  Calendar,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ITEMS_PER_PAGE = 10;

// ─── Status & Role Badges ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; label: string }> = {
    ACTIVE: { variant: 'success', label: 'Active' },
    PENDING: { variant: 'warning', label: 'Pending' },
    SUSPENDED: { variant: 'info', label: 'Suspended' },
    BANNED: { variant: 'danger', label: 'Banned' },
  };
  const d = map[status] || { variant: 'neutral' as const, label: status };
  return <Badge variant={d.variant} size="sm">{d.label}</Badge>;
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { variant: 'mate' | 'boss' | 'admin'; label: string }> = {
    MATE: { variant: 'mate', label: 'Guard' },
    BOSS: { variant: 'boss', label: 'Boss' },
    ADMIN: { variant: 'admin', label: 'Admin' },
  };
  const d = map[role] || { variant: 'mate' as const, label: role };
  return <Badge variant={d.variant} size="sm">{d.label}</Badge>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const roles = [
  { value: '', label: 'All Roles' },
  { value: 'MATE', label: 'Guards' },
  { value: 'BOSS', label: 'Bosses' },
  { value: 'ADMIN', label: 'Admins' },
];

const statuses = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'BANNED', label: 'Banned' },
];

// ─── Inner Component ──────────────────────────────────────────────────────────

function AllUsersPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';
  const role = searchParams.get('role') || '';
  const status = searchParams.get('status') || '';
  const country = searchParams.get('country') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Modals
  const [profileUid, setProfileUid] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ uid: string; name: string; action: 'reject' | 'suspend' } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [promoteConfirm, setPromoteConfirm] = useState<{ uid: string; name: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Input states for debouncing
  const [searchInput, setSearchInput] = useState(search);
  const [countryInput, setCountryInput] = useState(country);

  const updateUrl = useCallback((params: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, val]) => {
      if (val === null || val === '') newParams.delete(key);
      else newParams.set(key, val);
    });
    // Reset page to 1 if anything but page changes
    if (!params.hasOwnProperty('page') && searchParams.get('page') !== '1') {
      newParams.set('page', '1');
    }
    router.push(`/admin/users?${newParams.toString()}`);
  }, [router, searchParams]);

  const fetchUserList = useCallback(async () => {
    setIsLoading(true);
    try {
      const resp = await getUsers({
        search, role, status, country, dateFrom, dateTo, sortBy, sortOrder, page, limit: ITEMS_PER_PAGE,
      });
      if (resp.success) {
        setUsers(resp.data.users);
        setTotal(resp.data.total);
        setTotalPages(resp.data.totalPages);
      }
    } catch {
      toast.error('Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  }, [search, role, status, country, dateFrom, dateTo, sortBy, sortOrder, page]);

  useEffect(() => {
    fetchUserList();
  }, [fetchUserList]);

  // Debounced search & country
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search || countryInput !== country) {
        updateUrl({ search: searchInput, country: countryInput, page: '1' });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, countryInput]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleSort = (field: string) => {
    if (sortBy === field) {
      updateUrl({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' });
    } else {
      updateUrl({ sortBy: field, sortOrder: 'asc' });
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectDialog || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      const respStatus = rejectDialog.action === 'reject' ? UserStatus.BANNED : UserStatus.SUSPENDED;
      const resp = await updateUserStatus(rejectDialog.uid, respStatus, rejectReason);
      if (resp.success) {
        toast.success(`User ${rejectDialog.action === 'reject' ? 'banned' : 'suspended'}.`);
        setRejectDialog(null);
        setRejectReason('');
        fetchUserList();
      }
    } catch {
      toast.error('Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePromote = async () => {
    if (!promoteConfirm) return;
    setActionLoading(true);
    try {
      const resp = await promoteToAdmin(promoteConfirm.uid);
      if (resp.success) {
        toast.success(`Promoted ${promoteConfirm.name} to Admin!`);
        setPromoteConfirm(null);
        fetchUserList();
      }
    } catch {
      toast.error('Promotion failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      // Fetch up to 10k users for export matching current filters
      const resp = await getUsers({ search, role, status, country, dateFrom, dateTo, sortBy, sortOrder, page: 1, limit: 10000 });
      if (!resp.success) throw new Error('Failed to fetch export data');
      
      const data = resp.data.users;
      if (data.length === 0) {
        toast.error('No users to export.');
        return;
      }

      const headers = ['UID', 'First Name', 'Last Name', 'Email', 'Phone', 'Role', 'Status', 'Country', 'Registered'];
      const csvContent = [
        headers.join(','),
        ...data.map(u => [
          `"${u.uid}"`,
          `"${u.firstName}"`,
          `"${u.lastName}"`,
          `"${u.email}"`,
          `"${u.phone || ''}"`,
          `"${u.role}"`,
          `"${u.status}"`,
          `"${u.country || ''}"`,
          `"${new Date(u.createdAt).toISOString()}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `guardmate-users-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Export started!');
    } catch {
      toast.error('Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3 w-3 inline text-[var(--color-text-muted)] ml-1" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 inline text-[var(--color-primary)] ml-1" /> : <ArrowDown className="h-3 w-3 inline text-[var(--color-primary)] ml-1" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] flex items-center gap-2">
            <Users className="h-6 w-6 text-[var(--color-primary)]" />
            All Users
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Manage all platform participants across roles.
          </p>
        </div>

        <Button onClick={handleExportCSV} disabled={exporting || isLoading || users.length === 0} variant="outline" className="shrink-0 bg-white">
          <Download className="h-4 w-4 mr-2" />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-[var(--color-bg-subtle)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)] mt-0.5" />
          <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">Search</label>
          <input
            type="text"
            placeholder="Name, email, phone..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-[var(--color-input-border)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">Role</label>
            <select
              className="w-full px-3 py-2 rounded-lg bg-white border border-[var(--color-input-border)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              value={role}
              onChange={(e) => updateUrl({ role: e.target.value })}
            >
              {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">Status</label>
            <select
              className="w-full px-3 py-2 rounded-lg bg-white border border-[var(--color-input-border)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              value={status}
              onChange={(e) => updateUrl({ status: e.target.value })}
            >
              {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)] mt-0.5" />
          <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">Country</label>
          <input
            type="text"
            placeholder="Filter by country..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-[var(--color-input-border)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
            value={countryInput}
            onChange={(e) => setCountryInput(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">From</label>
            <input
              type="date"
              className="w-full px-3 py-2 rounded-lg bg-white border border-[var(--color-input-border)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              value={dateFrom}
              onChange={(e) => updateUrl({ dateFrom: e.target.value })}
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">To</label>
            <input
              type="date"
              className="w-full px-3 py-2 rounded-lg bg-white border border-[var(--color-input-border)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              value={dateTo}
              onChange={(e) => updateUrl({ dateTo: e.target.value })}
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-[var(--color-bg-subtle)] rounded-xl" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <Filter className="h-10 w-10 text-[var(--color-text-muted)] mx-auto mb-3" />
            <p className="text-[var(--color-text-secondary)] font-medium">No users found matching your filters.</p>
            {(search || role || status || country || dateFrom) && (
              <Button variant="ghost" className="mt-4" onClick={() => router.push('/admin/users')}>
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--color-table-header-bg)] border-b border-[var(--color-table-border)]">
                  <th className="px-4 py-3 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-surface-hover)] select-none"
                      onClick={() => handleSort('name')}>
                    User <SortIcon field="name" />
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider hidden sm:table-cell cursor-pointer hover:bg-[var(--color-surface-hover)] select-none"
                      onClick={() => handleSort('email')}>
                    Contact <SortIcon field="email" />
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider hidden lg:table-cell cursor-pointer hover:bg-[var(--color-surface-hover)] select-none"
                      onClick={() => handleSort('role')}>
                    Role <SortIcon field="role" />
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider hidden xl:table-cell">
                    Location
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-surface-hover)] select-none"
                      onClick={() => handleSort('status')}>
                    Status <SortIcon field="status" />
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider hidden md:table-cell cursor-pointer hover:bg-[var(--color-surface-hover)] select-none"
                      onClick={() => handleSort('createdAt')}>
                    Registered <SortIcon field="createdAt" />
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-table-border)]">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-[var(--color-table-row-hover)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={user.profilePhoto || undefined} name={user.fullName} size="sm" />
                        <div>
                          <p className="font-semibold text-sm text-[var(--color-text-primary)]">{user.fullName}</p>
                          <p className="text-xs text-[var(--color-text-muted)] sm:hidden">{user.email}</p>
                          <p className="text-xs text-[var(--color-text-muted)] lg:hidden mt-0.5">{user.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell max-w-[200px] truncate">
                      <p className="text-sm text-[var(--color-text-secondary)]">{user.email}</p>
                      {user.phone && <p className="text-xs text-[var(--color-text-muted)]">{user.phoneCountryCode} {user.phone}</p>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <p className="text-sm text-[var(--color-text-secondary)]">{(user.city || user.country) ? [user.city, user.country].filter(Boolean).join(', ') : '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)] hidden md:table-cell">
                      <div className="flex flex-col">
                        <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                        <span className="text-xs text-[var(--color-text-muted)]">{new Date(user.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
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
                        
                        {user.status !== UserStatus.SUSPENDED && user.status !== UserStatus.BANNED && user.role !== UserRole.ADMIN && (
                          <button
                            onClick={() => setRejectDialog({ uid: user.uid, name: user.fullName, action: 'suspend' })}
                            title="Suspend User"
                            className="p-1.5 rounded-lg hover:bg-[var(--color-warning-light)] text-[var(--color-text-muted)] hover:text-[var(--color-warning)] transition-colors"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                        {user.status !== UserStatus.BANNED && user.role !== UserRole.ADMIN && (
                          <button
                            onClick={() => setRejectDialog({ uid: user.uid, name: user.fullName, action: 'reject' })}
                            title="Ban User"
                            className="p-1.5 rounded-lg hover:bg-[var(--color-danger-light)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                        {user.role !== UserRole.ADMIN && (
                          <button
                            onClick={() => setPromoteConfirm({ uid: user.uid, name: user.fullName })}
                            title="Promote to Admin"
                            className="p-1.5 rounded-lg hover:bg-[var(--color-role-admin-light)] text-[var(--color-text-muted)] hover:text-[var(--color-role-admin)] transition-colors hidden md:block"
                          >
                            <Crown className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(p) => updateUrl({ page: String(p) })}
        totalItems={total}
        itemsPerPage={ITEMS_PER_PAGE}
        showItemCount
      />

      {/* Modals */}
      <UserProfileModal
        uid={profileUid}
        isOpen={!!profileUid}
        onClose={() => setProfileUid(null)}
        onStatusChanged={fetchUserList}
      />

      {/* Reject/Suspend Modal */}
      <ConfirmDialog
        isOpen={!!rejectDialog}
        onConfirm={handleRejectSubmit}
        onCancel={() => { setRejectDialog(null); setRejectReason(''); }}
        title={rejectDialog?.action === 'reject' ? 'Ban User' : 'Suspend User'}
        confirmLabel={rejectDialog?.action === 'reject' ? 'Ban User' : 'Suspend User'}
        cancelLabel="Cancel"
        variant="danger"
        message={
          <div className="space-y-3 text-left">
            <p className="text-sm text-[var(--color-text-secondary)]">
              {rejectDialog?.action === 'reject'
                ? `Banning "${rejectDialog?.name}" will prohibit them from accessing the platform.`
                : `Suspending "${rejectDialog?.name}" will temporarily disable their account.`}
            </p>
            <div>
              <label className="text-sm font-medium text-[var(--color-input-label)] block mb-1.5">
                Reason <span className="text-[var(--color-danger)]">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Provide a reason..."
                className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] text-sm focus:ring-2 focus:ring-[var(--color-focus-ring)] outline-none resize-none placeholder:text-[var(--color-input-placeholder)]"
              />
            </div>
          </div>
        }
      />

      {/* Promote Configuration */}
      <ConfirmDialog
        isOpen={!!promoteConfirm}
        onConfirm={handlePromote}
        onCancel={() => setPromoteConfirm(null)}
        title="Promote to Admin"
        message={`This will irreversibly promote "${promoteConfirm?.name}" to an Admin role. They will gain admin privileges. This action cannot be undone.`}
        confirmLabel="Promote to Admin"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-[var(--color-bg-subtle)] rounded-xl w-48" />
        <div className="h-24 bg-[var(--color-bg-subtle)] rounded-xl" />
        <div className="h-96 bg-[var(--color-bg-subtle)] rounded-xl" />
      </div>
    }>
      <AllUsersPageInner />
    </Suspense>
  );
}
