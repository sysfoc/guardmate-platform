'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { usePlatformContext } from '@/context/PlatformContext';
import { getJobs, getMyBids } from '@/lib/api/job.api';
import { checkDateOverlap } from '@/lib/jobs/overlapCheck';
import { JobCard } from '@/components/jobs/JobCard';
import { JobFilters } from '@/components/jobs/JobFilters';
import { MapDisplay } from '@/components/maps/MapDisplay';
import { Pagination } from '@/components/ui/Pagination';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { IJob, JobFilters as JobFiltersType, BidWithJob, MapMarker } from '@/types/job.types';
import type { MateProfile } from '@/types/user.types';
import { UserStatus, LicenseStatus, UserRole } from '@/types/enums';
import { calculateDistance } from '@/lib/utils/haversine';
import { Briefcase, Loader2, Search, X, Map as MapIcon, List, AlertCircle, Building2, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MateJobsPage() {
  const { user, isLoading: userLoading } = useUser();
  const { platformSettings } = usePlatformContext();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [jobs, setJobs] = useState<IJob[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [acceptedBids, setAcceptedBids] = useState<BidWithJob[]>([]);

  // Geolocation and map state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoRequested, setGeoRequested] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Read filters from URL
  const filtersFromUrl = (): JobFiltersType => ({
    search: searchParams.get('search') || undefined,
    locationCity: searchParams.get('locationCity') || undefined,
    budgetType: (searchParams.get('budgetType') as JobFiltersType['budgetType']) || undefined,
    budgetMin: searchParams.get('budgetMin') ? Number(searchParams.get('budgetMin')) : undefined,
    budgetMax: searchParams.get('budgetMax') ? Number(searchParams.get('budgetMax')) : undefined,
    startDate: searchParams.get('startDate') || undefined,
    requiredSkills: searchParams.get('requiredSkills') ? searchParams.get('requiredSkills')!.split(',') : undefined,
    sortBy: (searchParams.get('sortBy') as JobFiltersType['sortBy']) || 'newest',
    page: parseInt(searchParams.get('page') || '1'),
    limit: 12,
  });

  const [filters, setFilters] = useState<JobFiltersType>(filtersFromUrl());

  const profileDistanceInfo = useMemo(() => {
    const mate = user as MateProfile | null;
    if (!mate?.preferredWorkRadius) return null;
    const miles = Math.round(mate.preferredWorkRadius * 0.621371);
    return `Based on your profile preference (${miles} miles)`;
  }, [user]);

  // Load view mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('guardmate-jobs-view');
    if (saved === 'map' || saved === 'list') {
      setViewMode(saved);
    }
  }, []);

  const toggleViewMode = (mode: 'list' | 'map') => {
    setViewMode(mode);
    localStorage.setItem('guardmate-jobs-view', mode);
  };

  // Request Geolocation
  const requestLocation = useCallback(() => {
    setGeoRequested(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserLocation({ lat, lng });

          setFilters((prev) => {
            const next = { ...prev, userLat: lat, userLng: lng };
            const mate = user as MateProfile | null;
            if (mate?.preferredWorkRadius && prev.maxDistance === undefined) {
              const milesRadius = Math.round(mate.preferredWorkRadius * 0.621371);
              next.maxDistance = milesRadius;
            }
            return next;
          });
          toast.success("Location updated successfully");
        },
        (error) => {
          console.error('--- GEOLOCATION ERROR START ---');
          console.error('Full Error Object:', error);
          console.error('Error Code:', error.code);
          console.error('Error Message:', error.message);
          
          if (error.code === 1) { 
            console.error('Reason: PERMISSION_DENIED. The browser or OS blocked location access.');
          } else if (error.code === 2) {
            console.error('Reason: POSITION_UNAVAILABLE. The device has no GPS/location capability or network failed.');
          } else if (error.code === 3) {
            console.error('Reason: TIMEOUT. The GPS lock took longer than the 10000ms allowed.');
          } else {
            console.error('Reason: UNKNOWN_ERROR. An unknown error occurred.');
          }
          console.error('--- GEOLOCATION ERROR END ---');

          if (error.code === 3) { // TIMEOUT
            toast.error("Location request timed out. Please try again.");
          } else if (error.code === 1) { // PERMISSION_DENIED
            toast.error("Location access denied. Please allow it in your browser/OS settings.");
          } else if (error.code === 2) { // POSITION_UNAVAILABLE
            toast.error("Position unavailable. Your device cannot determine its location.");
          } else {
            toast.error("Could not get location. Ensure your device/browser supports it.");
          }
        },
        { timeout: 10000, maximumAge: 60000 }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
    }
  }, [user]);

  useEffect(() => {
    if (!geoRequested) {
      requestLocation();
    }
  }, [geoRequested, requestLocation]);

  const syncUrl = useCallback((f: JobFiltersType) => {
    const params = new URLSearchParams();
    Object.entries(f).forEach(([key, value]) => {
      // Don't sync userLat and userLng to URL for privacy
      if (key === 'userLat' || key === 'userLng') return;

      if (value !== undefined && value !== null && value !== '' && key !== 'limit') {
        if (Array.isArray(value) && value.length > 0) {
          params.set(key, value.join(','));
        } else if (!Array.isArray(value)) {
          params.set(key, String(value));
        }
      }
    });
    router.push(`/dashboard/mate/jobs?${params.toString()}`);
  }, [router]);

  const handleFiltersChange = useCallback((updates: Partial<JobFiltersType>) => {
    const newFilters = { ...filters, ...updates, page: updates.page ?? 1 };
    setFilters(newFilters);
    syncUrl(newFilters);
  }, [filters, syncUrl]);

  const handleReset = useCallback(() => {
    const def: JobFiltersType = { sortBy: 'newest', page: 1, limit: 12 };
    if (userLocation) {
      def.userLat = userLocation.lat;
      def.userLng = userLocation.lng;
    }
    setFilters(def);
    router.push('/dashboard/mate/jobs');
  }, [router, userLocation]);

  useEffect(() => {
    if (!user || !geoRequested) return;

    const fetchJobs = async () => {
      setLoading(true);
      try {
        const [jobsResp, bidsResp] = await Promise.all([
          getJobs({ ...filters, limit: viewMode === 'map' ? 100 : 12 }),
          getMyBids({ status: 'ACCEPTED', limit: 100 })
        ]);
        if (jobsResp.success && jobsResp.data) {
          setJobs(jobsResp.data.data);
          setTotal(jobsResp.data.total);
          setTotalPages(jobsResp.data.totalPages);
        }
        if (bidsResp.success && bidsResp.data) {
          setAcceptedBids(bidsResp.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch jobs or bids:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [user, filters, geoRequested, viewMode]);

  const processedJobs = useMemo(() => {
    if (!userLocation) return jobs;

    const withDist = jobs.map((job) => {
      let distance;
      if (job.coordinates) {
        distance = calculateDistance(userLocation.lat, userLocation.lng, job.coordinates.lat, job.coordinates.lng);
      }
      return { ...job, calculatedDistance: distance };
    });

    if (filters.sortBy === 'distance') {
      return withDist.sort((a, b) => {
        if (a.calculatedDistance === undefined && b.calculatedDistance === undefined) return 0;
        if (a.calculatedDistance === undefined) return 1;
        if (b.calculatedDistance === undefined) return -1;
        return a.calculatedDistance - b.calculatedDistance;
      });
    }

    return withDist;
  }, [jobs, userLocation, filters.sortBy]);

  const mapMarkers: MapMarker[] = useMemo(() => {
    return processedJobs
      .filter((j) => j.coordinates)
      .map((j) => ({
        lat: j.coordinates!.lat,
        lng: j.coordinates!.lng,
        title: j.title,
        jobId: j.jobId,
        budget: j.budgetAmount,
        budgetType: j.budgetType,
        status: j.status,
        isUrgent: j.isUrgent,
        onClick: () => {
          window.location.href = `/dashboard/mate/jobs/${j.jobId}`;
        }
      }));
  }, [processedJobs]);

  if (userLoading) return <DashboardSkeleton />;

  const isGuardReady = user?.status === UserStatus.ACTIVE && user?.role === UserRole.MATE && user.licenseStatus === LicenseStatus.VALID;

  const mateUser = user as MateProfile | null;
  const abrVerificationEnabled = platformSettings?.abrVerificationEnabled ?? false;
  const abnVerified = mateUser?.abnVerified ?? false;

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">Job Marketplace</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Find open security shifts available right now
            </p>
            {!isGuardReady && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-[var(--color-warning-light)] border border-[var(--color-warning)]/20 text-xs text-[var(--color-warning)] font-medium">
                ⚠️ Your account must be ACTIVE with a VALID license to apply for jobs.
              </div>
            )}

            {/* ABN Verification Banner */}
            {abrVerificationEnabled && !abnVerified && (
              <div className="mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-start gap-2">
                  <Lock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      Verify your ABN to propose your own rates. Without ABN, you can only apply at the posted rate.
                    </p>
                    <button
                      onClick={() => router.push('/dashboard/mate/profile')}
                      className="mt-1.5 text-[10px] font-bold text-[var(--color-primary)] hover:underline"
                    >
                      Verify ABN in Profile →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {abrVerificationEnabled && abnVerified && (
              <div className="mt-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    ABN Verified — You can propose custom rates when bidding
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 bg-[var(--color-surface)] p-1 rounded-xl border border-[var(--color-surface-border)] shrink-0">
            <button
              onClick={() => toggleViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'list'
                  ? 'bg-[var(--color-primary)] text-white shadow-md'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]'
                }`}
            >
              <List className="h-4 w-4" /> List
            </button>
            <button
              onClick={() => toggleViewMode('map')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'map'
                  ? 'bg-[var(--color-primary)] text-white shadow-md'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]'
                }`}
            >
              <MapIcon className="h-4 w-4" /> Map
            </button>
          </div>
        </div>

        {/* Global Search */}
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search by title, location, skill or keyword..."
            value={filters.search || ''}
            onChange={(e) => handleFiltersChange({ search: e.target.value })}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-[var(--color-surface-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] shadow-sm"
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <JobFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onReset={handleReset}
            className="w-full lg:w-72 shrink-0"
            geoAvailable={Boolean(userLocation)}
            distanceInfo={profileDistanceInfo || undefined}
          />

          <div className="flex-1 space-y-6">
            {!userLocation && viewMode === 'map' && (
              <div className="bg-[var(--color-warning-light)] border border-[var(--color-warning)]/30 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-[var(--color-warning)] shrink-0 mt-0.5" />
                <div className="text-sm text-[var(--color-text-primary)] font-medium">
                  We need your location to show the map and enable distance filtering. Please allow location access in your browser.
                </div>
              </div>
            )}

            {viewMode === 'map' && (
              <div className="bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-2xl overflow-hidden shadow-sm relative z-0">
                <MapDisplay
                  center={userLocation || { lat: 51.5074, lng: -0.1278 }}
                  zoom={userLocation ? 11 : 6}
                  height="500px"
                  interactive={true}
                  markers={mapMarkers}
                  showUserLocation={Boolean(userLocation)}
                  userLocation={userLocation || undefined}
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)]" />
                    Finding jobs...
                  </span>
                ) : (
                  `${total} job${total !== 1 ? 's' : ''} found`
                )}
              </h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
              </div>
            ) : processedJobs.length === 0 ? (
              <Card className="p-12 text-center">
                <Briefcase className="h-12 w-12 mx-auto text-[var(--color-text-muted)] mb-4" />
                <h3 className="font-bold text-sm text-[var(--color-text-primary)] mb-1">No jobs found</h3>
                <p className="text-xs text-[var(--color-text-tertiary)] mb-4">
                  Try adjusting your filters or check back later.
                </p>
                <Button variant="ghost" size="sm" onClick={handleReset} leftIcon={<X className="h-3 w-3" />} className="border border-[var(--color-surface-border)]">
                  Clear Filters
                </Button>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {processedJobs.map((job) => {
                    const overlapBid = acceptedBids.find(b =>
                      b.job && checkDateOverlap(new Date(job.startDate), new Date(job.endDate), new Date(b.job.startDate), new Date(b.job.endDate))
                    );
                    const overlapWarning = overlapBid ? `This job overlaps with your existing shift on ${new Date(overlapBid.job!.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : undefined;

                    return (
                      <JobCard
                        key={job.jobId}
                        job={job}
                        linkPrefix="/dashboard/mate/jobs"
                        overlapWarning={overlapWarning}
                        distance={(job as any).calculatedDistance}
                      />
                    );
                  })}
                </div>

                {viewMode === 'list' && (
                  <Pagination
                    currentPage={filters.page || 1}
                    totalPages={totalPages}
                    totalItems={total}
                    itemsPerPage={12}
                    showItemCount
                    onPageChange={(page) => handleFiltersChange({ page })}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
