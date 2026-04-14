'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapMarker } from '@/types/job.types';
import { calculateDistance } from '@/lib/utils/haversine';

// ─── Fix Leaflet default icon in Next.js ────────────────────────────────────
/* eslint-disable @typescript-eslint/no-explicit-any */
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: '/leaflet/marker-icon.png',
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

// ─── Status → colour mapping ────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  OPEN: '#3b82f6',
  FILLED: '#f59e0b',
  IN_PROGRESS: '#22c55e',
};

function getMarkerColor(status: string, isUrgent: boolean): string {
  if (isUrgent) return '#ef4444';
  return STATUS_COLORS[status] || '#3b82f6';
}

function createMarkerIcon(status: string, isUrgent: boolean): L.DivIcon {
  const color = getMarkerColor(status, isUrgent);
  const pulse = status === 'IN_PROGRESS' && !isUrgent
    ? 'animation:guardmate-pulse 1.5s infinite;'
    : '';

  return L.divIcon({
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;">
        <svg width="28" height="28" viewBox="0 0 28 28" style="${pulse}">
          <circle cx="14" cy="14" r="10" fill="${color}" stroke="white" stroke-width="3" opacity="0.9"/>
          ${isUrgent ? '<text x="14" y="18" text-anchor="middle" fill="white" font-size="14" font-weight="bold">!</text>' : ''}
        </svg>
      </div>`,
    className: 'guardmate-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

// ─── Inner component props ──────────────────────────────────────────────────
interface MapDisplayInnerProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  showUserLocation?: boolean;
  userLocation?: { lat: number; lng: number };
  height?: string;
  interactive?: boolean;
  radiusMeters?: number | null;
}

// ─── Inner map component (client-only) ──────────────────────────────────────
export default function MapDisplayInner({
  center,
  zoom = 13,
  markers = [],
  showUserLocation = false,
  userLocation,
  height = '400px',
  interactive = true,
  radiusMeters,
}: MapDisplayInnerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const radiusLayerRef = useRef<L.LayerGroup | null>(null);

  // Inject pulse CSS once
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const id = 'guardmate-pulse-css';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = `
        @keyframes guardmate-pulse {
          0% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.15); opacity: 0.7; }
          100% { transform: scale(1); opacity: 0.9; }
        }
        .guardmate-marker { background: transparent !important; border: none !important; }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: interactive,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    if (!interactive) {
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
    }

    markersLayerRef.current = L.layerGroup().addTo(map);
    radiusLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Force a resize after initial render
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      radiusLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update center
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([center.lat, center.lng], zoom);
    }
  }, [center.lat, center.lng, zoom]);

  // Update markers
  useEffect(() => {
    if (!markersLayerRef.current || !mapRef.current) return;
    markersLayerRef.current.clearLayers();
    
    if (radiusLayerRef.current) {
      radiusLayerRef.current.clearLayers();
    }

    // Job markers
    markers.forEach((m) => {
      const icon = createMarkerIcon(m.status, m.isUrgent);
      const marker = L.marker([m.lat, m.lng], { icon });

      const budgetStr = m.budgetType === 'HOURLY' ? `£${m.budget}/hr` : `£${m.budget}`;
      let distStr = '';
      if (showUserLocation && userLocation) {
        const dist = calculateDistance(userLocation.lat, userLocation.lng, m.lat, m.lng);
        distStr = `<div style="font-size:11px;color:var(--color-text-tertiary);margin-top:2px;">${dist} miles away</div>`;
      }

      marker.bindPopup(`
        <div style="min-width:180px;font-family:inherit;">
          <div style="font-weight:800;font-size:13px;color:var(--color-text-primary);margin-bottom:4px;">${m.title}</div>
          <div style="font-size:12px;font-weight:700;color:var(--color-primary);margin-bottom:2px;">${budgetStr}</div>
          ${distStr}
          <button
            onclick="window.__guardmate_job_click__('${m.jobId}')"
            style="margin-top:8px;width:100%;padding:6px 0;border:none;border-radius:6px;background:var(--color-primary);color:white;font-weight:700;font-size:11px;cursor:pointer;"
          >View Job</button>
        </div>
      `);

      marker.addTo(markersLayerRef.current!);
    });

    // User location marker
    if (showUserLocation && userLocation) {
      const userIcon = L.divIcon({
        html: `
          <div style="position:relative;display:flex;align-items:center;justify-content:center;">
            <svg width="20" height="20" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="7" fill="#3b82f6" stroke="white" stroke-width="3"/>
            </svg>
            <div style="position:absolute;width:24px;height:24px;border-radius:50%;background:rgba(59,130,246,0.2);animation:guardmate-pulse 2s infinite;"></div>
          </div>`,
        className: 'guardmate-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .bindTooltip('You are here', { permanent: false })
        .addTo(markersLayerRef.current);
    }

    // Draw Check-in Radius Circle if provided (draw around center)
    if (radiusMeters && radiusMeters > 0 && radiusLayerRef.current && mapRef.current) {
      L.circle([center.lat, center.lng], {
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '5, 5',
      }).addTo(radiusLayerRef.current);
      
      // Auto-fit bounds if radius is large
      if (radiusMeters > 500) {
        const bounds = L.latLng([center.lat, center.lng]).toBounds(radiusMeters);
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [markers, showUserLocation, userLocation, radiusMeters, center.lat, center.lng]);

  // Register global click handler for popups
  useEffect(() => {
    const handler = (jobId: string) => {
      const marker = markers.find((m) => m.jobId === jobId);
      if (marker) marker.onClick();
    };
    (window as unknown as Record<string, unknown>).__guardmate_job_click__ = handler;
    return () => {
      delete (window as unknown as Record<string, unknown>).__guardmate_job_click__;
    };
  }, [markers]);

  return (
    <div
      ref={mapContainerRef}
      style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden' }}
    />
  );
}
