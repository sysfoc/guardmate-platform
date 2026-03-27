'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getShift, approveShift, getIncidentReports } from '@/lib/api/shift.api';
import { getSocket, disconnectSocket } from '@/lib/socket/socketClient';
import type { IShift, IIncidentReport, Coordinates } from '@/types/shift.types';
import { ShiftStatus } from '@/types/shift.types';
import {
  CheckCircle2, Clock, MapPin, Timer, User, Navigation,
  AlertTriangle, Shield, Loader2, Eye, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ShiftMonitoringPanelProps {
  jobId: string;
  jobTitle: string;
  jobCoordinates: Coordinates | null;
}

const SEVERITY_COLORS: Record<string, string> = {
  LOW: 'bg-[var(--color-success-light)] text-[var(--color-success)]',
  MEDIUM: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
  HIGH: 'bg-[var(--color-danger-light)] text-[var(--color-danger)]',
  CRITICAL: 'bg-red-950/20 text-red-400',
};

function getShiftStatus(shift: IShift | null): ShiftStatus {
  if (!shift || !shift.checkInTime) return ShiftStatus.NOT_STARTED;
  if (shift.isApprovedByBoss) return ShiftStatus.APPROVED;
  if (shift.checkOutTime) return ShiftStatus.CHECKED_OUT;
  return ShiftStatus.CHECKED_IN;
}

export default function ShiftMonitoringPanel({ jobId, jobTitle, jobCoordinates }: ShiftMonitoringPanelProps) {
  const [todayShift, setTodayShift] = useState<IShift | null>(null);
  const [allShifts, setAllShifts] = useState<IShift[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  
  const [incidents, setIncidents] = useState<IIncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [guardLocation, setGuardLocation] = useState<{ lat: number; lng: number; timestamp: string } | null>(null);

  // Status is now based on today's shift (or the overall state if no shifts exist)
  const status = getShiftStatus(todayShift);

  // Fetch shift data and incidents
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [shiftResp, incidentResp] = await Promise.all([
          getShift(jobId),
          getIncidentReports(jobId),
        ]);
        if (shiftResp.success && shiftResp.data) {
          setTodayShift(shiftResp.data.todayShift);
          setAllShifts(shiftResp.data.allShifts);
          setTotalHours(shiftResp.data.totalHoursAllDays);
        }
        if (incidentResp.success && incidentResp.data) setIncidents(incidentResp.data);
      } catch { /* silent */ }
      finally { setLoading(false); }
    };
    fetchData();
  }, [jobId]);

  // Socket.io for live guard location
  useEffect(() => {
    if (status !== ShiftStatus.CHECKED_IN) return;

    let mounted = true;

    const connectSocket = async () => {
      try {
        const socket = await getSocket();
        socket.emit('join-shift-room', jobId);

        socket.on('guard-location-update', (data: { lat: number; lng: number; timestamp: string; jobId: string }) => {
          if (mounted && data.jobId === jobId) {
            setGuardLocation({ lat: data.lat, lng: data.lng, timestamp: data.timestamp });
          }
        });
      } catch { /* socket not critical */ }
    };

    connectSocket();

    return () => {
      mounted = false;
      const cleanup = async () => {
        try {
          const socket = await getSocket();
          socket.emit('leave-shift-room', jobId);
          socket.off('guard-location-update');
        } catch { /* silent */ }
      };
      cleanup();
    };
  }, [status, jobId]);

  const handleApprove = async (shiftId?: string) => {
    const isBulk = !shiftId;
    if (isBulk && !confirm('Approve ALL pending shifts and complete job? This action cannot be undone.')) return;
    if (!isBulk && !confirm('Approve this specific shift day? The job will only complete once ALL days are approved.')) return;

    setApprovingId(shiftId || 'bulk');
    try {
      const resp = await approveShift(jobId, shiftId ? { shiftId } : undefined);
      if (resp.success) {
        toast.success(`Successfully approved ${resp.data?.approvedCount} shift(s)!`);
        // Refresh data
        const getResp = await getShift(jobId);
        if (getResp.success && getResp.data) {
          setTodayShift(getResp.data.todayShift);
          setAllShifts(getResp.data.allShifts);
        }
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message ?? 'Failed to approve shift.');
    } finally {
      setApprovingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="p-5 animate-pulse">
        <div className="h-4 w-48 bg-[var(--color-bg-subtle)] rounded mb-3" />
        <div className="h-20 w-full bg-[var(--color-bg-subtle)] rounded" />
      </Card>
    );
  }

  if (allShifts.length === 0) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-3 text-[var(--color-text-secondary)]">
          <Clock className="h-5 w-5 text-[var(--color-text-muted)]" />
          <div>
            <p className="text-sm font-bold">No Shifts Logged Yet</p>
            <p className="text-xs text-[var(--color-text-muted)]">The guard has not checked in for the first time.</p>
          </div>
        </div>
      </Card>
    );
  }

  const unapprovedShifts = allShifts.filter(s => s.checkOutTime && !s.isApprovedByBoss);

  return (
    <Card className="p-0 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--color-border-default)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            status === ShiftStatus.CHECKED_IN
              ? 'bg-emerald-500/10 text-emerald-500'
              : status === ShiftStatus.CHECKED_OUT
              ? 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'
              : status === ShiftStatus.APPROVED
              ? 'bg-[var(--color-success-light)] text-[var(--color-success)]'
              : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]'
          }`}>
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Shift Monitoring</h3>
            <p className="text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider">
              {status === ShiftStatus.CHECKED_IN && 'Guard On Duty — Live Tracking'}
              {status === ShiftStatus.CHECKED_OUT && 'Shift Complete — Approval Required'}
              {status === ShiftStatus.APPROVED && 'Shift Approved'}
              {status === ShiftStatus.NOT_STARTED && 'Awaiting Check-in'}
            </p>
          </div>
        </div>
        <Badge
          variant={
            status === ShiftStatus.CHECKED_IN ? 'success' :
            status === ShiftStatus.CHECKED_OUT ? 'warning' :
            status === ShiftStatus.APPROVED ? 'success' : 'neutral'
          }
          className="text-[9px]"
        >
          {status === ShiftStatus.CHECKED_IN && '● LIVE'}
          {status === ShiftStatus.CHECKED_OUT && 'REVIEW'}
          {status === ShiftStatus.APPROVED && 'APPROVED'}
          {status === ShiftStatus.NOT_STARTED && 'WAITING'}
        </Badge>
      </div>

      <div className="p-5 space-y-4">
        {/* Today's Shift Quick View */}
        {todayShift ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[var(--color-bg-subtle)] p-3 border border-[var(--color-border-default)] rounded-lg">
            <div>
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">Today Check-in</p>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">
                {todayShift.checkInTime
                  ? new Date(todayShift.checkInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">Today Check-out</p>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">
                {todayShift.checkOutTime
                  ? new Date(todayShift.checkOutTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">Today Hours</p>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">
                {todayShift.totalHoursWorked !== null ? `${todayShift.totalHoursWorked.toFixed(2)} hrs` : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">Check-in Dist</p>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">
                {todayShift.checkInDistance !== null ? `${todayShift.checkInDistance}m` : '—'}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-[var(--color-bg-subtle)] rounded-lg text-sm font-medium text-[var(--color-text-muted)] border border-[var(--color-border-default)] text-center">
            No active shift record for today.
          </div>
        )}

        {/* Live Guard Location */}
        {status === ShiftStatus.CHECKED_IN && guardLocation && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <Navigation className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              Guard location: {guardLocation.lat.toFixed(5)}, {guardLocation.lng.toFixed(5)}
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">
              {new Date(guardLocation.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        )}

        {/* Shift History & Approvals */}
        <div className="border-t border-[var(--color-border-default)] pt-4 mt-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-[var(--color-text-primary)]">All Shift Days ({allShifts.length})</h4>
            <span className="text-xs font-black bg-[var(--color-bg-subtle)] px-2 py-1 rounded-md border border-[var(--color-border-primary)]">Total: {totalHours.toFixed(2)} hrs</span>
          </div>
          
          <div className="space-y-2 mb-4">
            {allShifts.map((s, idx) => (
              <div key={s._id} className="p-3 bg-[var(--color-bg-primary)] rounded-lg flex items-center justify-between border border-[var(--color-border-default)] hover:border-[var(--color-primary)]/30 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm">Day {idx + 1}</span>
                    <span className="text-xs text-[var(--color-text-secondary)]">• {new Date(s.shiftDate as string).toLocaleDateString('en-GB')}</span>
                    {s.isApprovedByBoss && <Badge variant="success" className="text-[8px] h-4 py-0">APPROVED</Badge>}
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {s.checkInTime ? new Date(s.checkInTime as string).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '--:--'} 
                    {' - '} 
                    {s.checkOutTime ? new Date(s.checkOutTime as string).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'In Progress'} 
                    {' '}• <span className="font-bold">{s.totalHoursWorked?.toFixed(2) || '0.00'} hrs</span>
                  </p>
                </div>
                
                {s.checkOutTime && !s.isApprovedByBoss && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    disabled={approvingId !== null}
                    onClick={() => handleApprove(s._id)}
                    className="text-xs h-8 border-[var(--color-success)] text-[var(--color-success)] hover:bg-[var(--color-success-light)]"
                  >
                    {approvingId === s._id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Approve'}
                  </Button>
                )}
              </div>
            ))}
          </div>

          {unapprovedShifts.length > 0 && (
            <Button
              onClick={() => handleApprove()}
              disabled={approvingId !== null}
              className="w-full bg-[var(--color-btn-success-bg)] hover:bg-[var(--color-btn-success-hover-bg)] text-[var(--color-btn-success-text)] font-bold h-12 text-sm"
            >
              {approvingId === 'bulk' ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Approving All...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" /> Approve All {unapprovedShifts.length} Pending Shifts</>
              )}
            </Button>
          )}
        </div>

        {/* Incident Reports */}
        {incidents.length > 0 && (
          <div className="border-t border-[var(--color-border-default)] pt-4">
            <h4 className="text-xs font-bold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-[var(--color-warning)]" />
              Incident Reports ({incidents.length})
            </h4>
            <div className="space-y-2">
              {incidents.map((incident) => (
                <div key={incident._id} className="p-3 rounded-lg bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)]">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[9px] ${SEVERITY_COLORS[incident.severity] ?? ''}`}>
                        {incident.severity}
                      </Badge>
                      <span className="text-[10px] font-bold text-[var(--color-text-secondary)]">
                        {incident.incidentType.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                      {incident.createdAt ? new Date(incident.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">{incident.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
