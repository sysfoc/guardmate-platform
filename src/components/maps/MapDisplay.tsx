'use client';

import dynamic from 'next/dynamic';
import type { MapMarker } from '@/types/job.types';

const MapDisplayInner = dynamic(() => import('./MapDisplayInner'), {
  ssr: false,
  loading: () => (
    <div
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-subtle)', borderRadius: '12px' }}
      className="animate-pulse"
    >
      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 700 }}>Loading map…</span>
    </div>
  ),
});

interface MapDisplayProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  showUserLocation?: boolean;
  userLocation?: { lat: number; lng: number };
  height?: string;
  interactive?: boolean;
  radiusMeters?: number | null;
  /** Path coordinates for guard movement trail */
  path?: { lat: number; lng: number }[];
  /** Live guard position marker */
  liveMarker?: { lat: number; lng: number; label?: string } | null;
  /** Job site location marker */
  jobMarker?: { lat: number; lng: number; label?: string } | null;
}

export function MapDisplay({
  center,
  zoom = 13,
  markers = [],
  showUserLocation = false,
  userLocation,
  height = '400px',
  interactive = true,
  radiusMeters,
  path,
  liveMarker,
  jobMarker,
}: MapDisplayProps) {
  return (
    <div style={{ height }}>
      <MapDisplayInner
        center={center}
        zoom={zoom}
        markers={markers}
        showUserLocation={showUserLocation}
        userLocation={userLocation}
        height={height}
        interactive={interactive}
        radiusMeters={radiusMeters}
        path={path}
        liveMarker={liveMarker}
        jobMarker={jobMarker}
      />
    </div>
  );
}
