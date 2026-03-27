'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { checkIn, checkOut, getShift, updateLocation } from '@/lib/api/shift.api';
import { getSocket } from '@/lib/socket/socketClient';
import IncidentReportModal from '@/components/shifts/IncidentReportModal';
import type { IShift, Coordinates } from '@/types/shift.types';
import { ShiftStatus } from '@/types/shift.types';
import { calculateDistance } from '@/lib/utils/haversine';
import {
  MapPin, Clock, CheckCircle2, LogIn, LogOut,
  AlertTriangle, Timer, Navigation, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ActiveShiftCardProps {
  jobId: string;
  jobTitle: string;
  companyName: string;
  jobCoordinates: Coordinates | null;
  jobLocation: string;
}

function getShiftStatus(shift: IShift | null): ShiftStatus {
  if (!shift || !shift.checkInTime) return ShiftStatus.NOT_STARTED;
  if (shift.isApprovedByBoss) return ShiftStatus.APPROVED;
  if (shift.checkOutTime) return ShiftStatus.CHECKED_OUT;
  return ShiftStatus.CHECKED_IN;
}

export default function ActiveShiftCard({
  jobId, jobTitle, companyName, jobCoordinates, jobLocation
}: ActiveShiftCardProps) {
  const [todayShift, setTodayShift] = useState<IShift | null>(null);
  const [allShifts, setAllShifts] = useState<IShift[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState('00:00:00');
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const status = getShiftStatus(todayShift);
  const shiftDayNumber = allShifts.length + (todayShift ? 0 : 1);

  // Fetch shift data
  useEffect(() => {
    const fetchShift = async () => {
      try {
        const resp = await getShift(jobId);
        if (resp.success && resp.data) {
          setTodayShift(resp.data.todayShift);
          setAllShifts(resp.data.allShifts);
          setTotalHours(resp.data.totalHoursAllDays);
        }
      } catch { /* no shift yet */ }
      finally { setLoading(false); }
    };
    fetchShift();
  }, [jobId]);

  // Get current position helper
  const getCurrentPosition = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            reject(new Error('Location permission denied. Please enable GPS in your browser settings.'));
            break;
          case err.POSITION_UNAVAILABLE:
            reject(new Error('Location information unavailable. Please try again.'));
            break;
          case err.TIMEOUT:
            reject(new Error('Location request timed out. Please try again.'));
            break;
          default:
            reject(new Error('Failed to get your location.'));
        }
      }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    });
  }, []);

  // Distance updater (every 30s)
  useEffect(() => {
    if (!jobCoordinates) return;

    const updateDistance = async () => {
      try {
        const pos = await getCurrentPosition();
        const miles = calculateDistance(
          pos.coords.latitude, pos.coords.longitude,
          jobCoordinates.lat, jobCoordinates.lng
        );
        setCurrentDistance(Math.round(miles * 1609.34));
        setGeoError(null);
      } catch (err: unknown) {
        const error = err as { message?: string };
        setGeoError(error.message ?? 'Location unavailable');
      }
    };

    updateDistance();
    const interval = setInterval(updateDistance, 30000);
    return () => clearInterval(interval);
  }, [jobCoordinates, getCurrentPosition]);

  // Elapsed time counter
  useEffect(() => {
    if (status !== ShiftStatus.CHECKED_IN || !todayShift?.checkInTime) return;

    const calcElapsed = () => {
      const diff = Date.now() - new Date(todayShift.checkInTime as string).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };

    calcElapsed();
    const interval = setInterval(calcElapsed, 1000);
    return () => clearInterval(interval);
  }, [status, todayShift?.checkInTime]);

  // Live location broadcasts (every 30s when checked in)
  useEffect(() => {
    if (status !== ShiftStatus.CHECKED_IN) return;

    const broadcastLocation = async () => {
      try {
        const pos = await getCurrentPosition();
        const resp = await updateLocation(jobId, {
          coordinates: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          timestamp: new Date().toISOString(),
        });

        // Also emit via Socket.io for real-time boss view
        if (resp.success && resp.data) {
          try {
            const socket = await getSocket();
            socket.emit('guard-location-update', resp.data);
          } catch { /* socket not critical */ }
        }
      } catch { /* silent */ }
    };

    const interval = setInterval(broadcastLocation, 30000);
    return () => clearInterval(interval);
  }, [status, jobId, getCurrentPosition]);

  // Check-in handler
  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const pos = await getCurrentPosition();
      const resp = await checkIn(jobId, {
        coordinates: { lat: pos.coords.latitude, lng: pos.coords.longitude },
      });
      if (resp.success && resp.data) {
        setTodayShift(resp.data as IShift);
        toast.success('Checked in successfully!');
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message ?? 'Failed to check in.');
    } finally {
      setActionLoading(false);
    }
  };

  // Check-out handler
  const handleCheckOut = async () => {
    if (!confirm('Are you sure you want to check out? This action cannot be undone.')) return;

    setActionLoading(true);
    try {
      const pos = await getCurrentPosition();
      const resp = await checkOut(jobId, {
        coordinates: { lat: pos.coords.latitude, lng: pos.coords.longitude },
      });
      if (resp.success && resp.data) {
        setTodayShift(resp.data as IShift);
        setTotalHours(prev => prev + (resp.data as IShift).totalHoursWorked!);
        toast.success('Checked out successfully!');
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message ?? 'Failed to check out.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-5 animate-pulse">
        <div className="h-4 w-40 bg-[var(--color-bg-subtle)] rounded mb-3" />
        <div className="h-8 w-full bg-[var(--color-bg-subtle)] rounded" />
      </Card>
    );
  }

  return (
    <>
      <Card className="p-0 overflow-hidden border-2 border-[var(--color-primary)]/30 shadow-lg shadow-[var(--color-primary)]/5">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Active Shift • Day {todayShift ? allShifts.findIndex(s => s._id === todayShift._id) + 1 : shiftDayNumber}</p>
              <h3 className="text-base font-black mt-0.5">{jobTitle}</h3>
              <p className="text-xs text-white/80 mt-0.5">{companyName}</p>
            </div>
            <Badge className="bg-white/20 text-white border-white/30 text-[10px] font-bold">
              {status === ShiftStatus.NOT_STARTED && 'Pending Check-in'}
              {status === ShiftStatus.CHECKED_IN && 'On Duty'}
              {status === ShiftStatus.CHECKED_OUT && 'Awaiting Approval'}
              {status === ShiftStatus.APPROVED && 'Approved'}
            </Badge>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Location Info */}
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
            <MapPin className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
            <span>{jobLocation}</span>
          </div>

          {/* Distance Indicator */}
          {currentDistance !== null && status === ShiftStatus.NOT_STARTED && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${
              currentDistance <= 500
                ? 'bg-[var(--color-success-light)] text-[var(--color-success)]'
                : 'bg-[var(--color-danger-light)] text-[var(--color-danger)]'
            }`}>
              <Navigation className="h-3.5 w-3.5" />
              You are currently {currentDistance}m from the job site
            </div>
          )}

          {geoError && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-warning-light)] text-[var(--color-warning)] text-xs font-bold">
              <AlertTriangle className="h-3.5 w-3.5" />
              {geoError}
            </div>
          )}

          {/* Checked In Status */}
          {status === ShiftStatus.CHECKED_IN && todayShift && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-[var(--color-success)]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="font-bold">Checked in at {new Date(todayShift.checkInTime as string).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {todayShift.checkInDistance !== null && (
                  <span className="text-[var(--color-text-muted)]">({todayShift.checkInDistance}m from site)</span>
                )}
              </div>
              {/* Elapsed Timer */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)]">
                <Timer className="h-5 w-5 text-[var(--color-primary)]" />
                <span className="text-2xl font-black font-mono text-[var(--color-text-primary)] tracking-wider">{elapsed}</span>
                <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase ml-1">Elapsed</span>
              </div>
            </div>
          )}

          {/* Checked Out Status */}
          {status === ShiftStatus.CHECKED_OUT && todayShift && (
            <div className="p-4 rounded-lg bg-[var(--color-warning-light)] border border-[var(--color-warning)]/20">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-[var(--color-warning)]" />
                <span className="text-sm font-bold text-[var(--color-text-primary)]">Shift Complete — Awaiting Boss Approval</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                <div>
                  <span className="text-[var(--color-text-muted)]">Check-in</span>
                  <p className="font-bold">{new Date(todayShift.checkInTime as string).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)]">Check-out</span>
                  <p className="font-bold">{new Date(todayShift.checkOutTime as string).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-[var(--color-text-muted)]">Total Hours Worked</span>
                  <p className="font-black text-lg">{todayShift.totalHoursWorked?.toFixed(2)} hrs</p>
                </div>
              </div>
            </div>
          )}

          {/* Approved Status */}
          {status === ShiftStatus.APPROVED && todayShift && (
            <div className="p-4 rounded-lg bg-[var(--color-success-light)] border border-[var(--color-success)]/20">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" />
                <span className="text-sm font-bold text-[var(--color-success)]">Shift Approved</span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                {todayShift.totalHoursWorked?.toFixed(2)} hours worked • Approved {todayShift.approvedAt ? new Date(todayShift.approvedAt as string).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            {status === ShiftStatus.NOT_STARTED && (
              <Button
                onClick={handleCheckIn}
                disabled={actionLoading}
                className="flex-1 bg-[var(--color-btn-success-bg)] hover:bg-[var(--color-btn-success-hover-bg)] text-[var(--color-btn-success-text)] font-bold h-12 text-sm"
              >
                {actionLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Getting Location...</>
                ) : (
                  <><LogIn className="h-4 w-4 mr-2" /> Check In</>
                )}
              </Button>
            )}

            {status === ShiftStatus.CHECKED_IN && (
              <>
                <Button
                  onClick={handleCheckOut}
                  disabled={actionLoading}
                  className="flex-1 bg-[var(--color-btn-danger-bg)] hover:bg-[var(--color-btn-danger-hover-bg)] text-[var(--color-btn-danger-text)] font-bold h-12 text-sm"
                >
                  {actionLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</>
                  ) : (
                    <><LogOut className="h-4 w-4 mr-2" /> Check Out</>
                  )}
                </Button>
                <Button
                  onClick={() => setShowIncidentModal(true)}
                  variant="outline"
                  className="h-12 px-4 font-bold text-sm border-[var(--color-warning)] text-[var(--color-warning)] hover:bg-[var(--color-warning-light)]"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Report Incident
                </Button>
              </>
            )}
          </div>

          {/* Shift History Accordion */}
          {allShifts.length > 0 && (
            <div className="mt-6 pt-4 border-t border-[var(--color-border-primary)]">
              <h4 className="text-sm font-bold mb-3">Previous Days ({allShifts.length})</h4>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                {allShifts.map((s, idx) => (
                  <div key={s._id} className="p-3 bg-[var(--color-bg-secondary)] rounded-lg text-xs flex justify-between items-center border border-[var(--color-border-primary)]">
                    <div>
                      <span className="font-bold block mb-1">Day {idx + 1} • {new Date(s.shiftDate as string).toLocaleDateString('en-GB')}</span>
                      <span className="text-[var(--color-text-muted)]">
                        {s.checkInTime ? new Date(s.checkInTime as string).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '--:--'} 
                        {' - '} 
                        {s.checkOutTime ? new Date(s.checkOutTime as string).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-sm block">{s.totalHoursWorked?.toFixed(2) || '0.00'}h</span>
                      {s.isApprovedByBoss ? (
                        <span className="text-[var(--color-success)] font-bold">Approved</span>
                      ) : s.checkOutTime ? (
                        <span className="text-[var(--color-warning)] font-bold">Pending</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-[var(--color-border-primary)]">
                <span className="text-sm font-bold text-[var(--color-text-secondary)]">Total Logged Hours</span>
                <span className="text-lg font-black">{totalHours.toFixed(2)} hrs</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {showIncidentModal && (
        <IncidentReportModal
          jobId={jobId}
          onSuccess={() => {}}
          onClose={() => setShowIncidentModal(false)}
        />
      )}
    </>
  );
}
