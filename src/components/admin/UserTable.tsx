'use client';

import React from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  MoreVertical, 
  ExternalLink, 
  ShieldCheck, 
  Ban, 
  UserX,
  CheckCircle2,
  Clock
} from 'lucide-react';
import type { UserProfile } from '@/types/user.types';
import { UserRole, UserStatus } from '@/types/enums';

interface UserTableProps {
  users: UserProfile[];
  onAction: (uid: string, action: string) => void;
  isLoading?: boolean;
}

export function UserTable({ users, onAction, isLoading }: UserTableProps) {
  if (isLoading) {
    return (
      <div className="w-full space-y-4 animate-pulse pt-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-slate-100 rounded-xl" />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 bg-[var(--color-bg-subtle)] rounded-2xl border-2 border-dashed border-[var(--color-surface-border)]">
        <p className="text-[var(--color-text-secondary)]">No users found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-separate border-spacing-y-2">
        <thead>
          <tr className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Role / Status</th>
            <th className="px-4 py-3">Joined</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user._id} className="group bg-white hover:bg-[var(--color-surface-hover)] transition-colors shadow-sm ring-1 ring-[var(--color-surface-border)] rounded-xl overflow-hidden">
              <td className="px-4 py-4 rounded-l-xl">
                <div className="flex items-center gap-3">
                  <Avatar src={user.profilePhoto ?? undefined} name={user.fullName} size="md" />
                  <div>
                    <p className="font-bold text-[var(--color-text-primary)] leading-tight">{user.fullName}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{user.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant={user.role === UserRole.MATE ? 'mate' : 'boss'} className="text-[10px] uppercase font-bold">
                      {user.role}
                    </Badge>
                    {user.status === UserStatus.ACTIVE && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                  </div>
                  <Badge 
                    variant={
                      user.status === UserStatus.ACTIVE ? 'success' : 
                      user.status === UserStatus.PENDING ? 'warning' : 'danger'
                    }
                    className="w-fit text-[9px] px-1.5"
                  >
                    {user.status}
                  </Badge>
                </div>
              </td>
              <td className="px-4 py-4">
                <p className="text-sm text-[var(--color-text-primary)]">{new Date(user.createdAt).toLocaleDateString()}</p>
                <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                  <Clock className="h-3 w-3" />
                  {new Date(user.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </td>
              <td className="px-4 py-4 text-right rounded-r-xl">
                <div className="flex items-center justify-end gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => onAction(user.uid, 'view')}
                    title="View Profile"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  
                  {user.status === UserStatus.PENDING && (
                    <Button 
                      size="sm" 
                      onClick={() => onAction(user.uid, 'approve')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Approve
                    </Button>
                  )}

                  <div className="relative group/menu">
                    <Button size="sm" variant="ghost">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                    {/* Simplified action menu simulation */}
                    <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-xl shadow-xl border border-[var(--color-surface-border)] overflow-hidden hidden group-hover/menu:block z-50">
                      <button onClick={() => onAction(user.uid, 'suspend')} className="w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--color-bg-subtle)] flex items-center gap-2 text-amber-600">
                        <UserX className="h-4 w-4" /> Suspend User
                      </button>
                      <button onClick={() => onAction(user.uid, 'ban')} className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600 font-bold">
                        <Ban className="h-4 w-4" /> Ban User
                      </button>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
