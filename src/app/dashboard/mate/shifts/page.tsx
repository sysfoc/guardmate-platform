'use client';

import React, { useEffect, useState } from 'react';
import { useUser } from '@/context/UserContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { apiGet } from '@/lib/apiClient';
import type { IShift } from '@/types/shift.types';
import { Clock, CheckCircle2, Timer, AlertTriangle, Calendar, MapPin } from 'lucide-react';

export default function MateShiftsPage() {
  const { user, isLoading } = useUser();
  const [shifts, setShifts] = useState<IShift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const resp = await apiGet<IShift[]>('/api/shifts/my-shifts');
        if (resp.success && resp.data) setShifts(resp.data);
      } catch { /* silent */ }
      finally { setLoading(false); }
    };
    fetchShifts();
  }, []);

  if (isLoading) return <DashboardSkeleton />;
  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">My Shifts</h1>
        <p className="text-xs text-[var(--color-text-secondary)] font-medium mt-0.5">
          View your shift history and hours worked.
        </p>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : shifts.length === 0 ? (
        <Card className="p-10 text-center">
          <Clock className="h-10 w-10 text-[var(--color-text-muted)] mx-auto mb-3 opacity-40" />
          <p className="text-sm text-[var(--color-text-secondary)]">No shift history yet.</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Your past shifts will appear here once you check in to a job.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] uppercase text-[9px] font-bold tracking-widest">
              <tr>
                <th className="px-4 py-3">Job</th>
                <th className="px-4 py-3">Check-in</th>
                <th className="px-4 py-3">Check-out</th>
                <th className="px-4 py-3">Hours</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-default)]">
              {shifts.map((shift) => (
                <tr key={shift._id} className="hover:bg-[var(--color-bg-subtle)]/50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-xs font-bold text-[var(--color-text-primary)]">{shift.jobTitle}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1 mt-0.5">
                        <MapPin className="h-2.5 w-2.5" /> {shift.jobLocation}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium whitespace-nowrap">
                    {shift.checkInTime
                      ? new Date(shift.checkInTime).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium whitespace-nowrap">
                    {shift.checkOutTime
                      ? new Date(shift.checkOutTime).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs font-bold whitespace-nowrap">
                    {shift.totalHoursWorked !== null ? `${shift.totalHoursWorked.toFixed(2)} hrs` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {shift.isApprovedByBoss ? (
                      <Badge variant="success" className="text-[9px] h-5">
                        <CheckCircle2 className="h-3 w-3 mr-0.5" /> Approved
                      </Badge>
                    ) : shift.checkOutTime ? (
                      <Badge variant="warning" className="text-[9px] h-5">
                        <Timer className="h-3 w-3 mr-0.5" /> Pending Approval
                      </Badge>
                    ) : shift.checkInTime ? (
                      <Badge variant="info" className="text-[9px] h-5">
                        <Clock className="h-3 w-3 mr-0.5" /> In Progress
                      </Badge>
                    ) : (
                      <Badge variant="neutral" className="text-[9px] h-5">Not Started</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
