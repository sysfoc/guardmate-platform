'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { LocationSearchResult } from '@/types/job.types';
import { MapPin, Loader2, Search } from 'lucide-react';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    postcode?: string;
    suburb?: string;
    county?: string;
  };
}

interface LocationSearchProps {
  onLocationSelect: (result: LocationSearchResult) => void;
  placeholder?: string;
  defaultValue?: string;
  error?: string;
  label?: string;
}

export function LocationSearch({
  onLocationSelect,
  placeholder = 'Search for an address...',
  defaultValue = '',
  error,
  label,
}: LocationSearchProps) {
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchNominatim = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&limit=5`,
        { headers: { 'User-Agent': 'GuardMate-Platform' } },
      );
      const data: NominatimResult[] = await resp.json();
      setResults(data);
      setIsOpen(data.length > 0);
      setHighlightIdx(-1);
    } catch {
      setResults([]);
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.trim().length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      searchNominatim(val);
    }, 500);
  };

  const handleSelect = (result: NominatimResult) => {
    const addr = result.address;
    const street = [addr.house_number, addr.road].filter(Boolean).join(' ');
    const city = addr.city || addr.town || addr.village || '';

    setQuery(result.display_name);
    setIsOpen(false);
    setResults([]);

    onLocationSelect({
      address: street || result.display_name.split(',')[0],
      city,
      state: addr.state || addr.county || '',
      country: addr.country || '',
      postalCode: addr.postcode || '',
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault();
      handleSelect(results[highlightIdx]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const getCity = (result: NominatimResult): string => {
    return result.address.city || result.address.town || result.address.village || '';
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="text-[11px] font-bold text-[var(--color-input-label)] mb-1.5 block">
          {label}
        </label>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)]" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder={placeholder}
          className={`w-full pl-9 pr-10 py-2.5 text-sm rounded-lg border bg-[var(--color-input-bg)] text-[var(--color-input-text)] placeholder:text-[var(--color-input-placeholder)] focus:outline-none focus:ring-1 transition-colors ${
            error
              ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]'
              : 'border-[var(--color-input-border)] focus:border-[var(--color-input-border-focus)] focus:ring-[var(--color-input-border-focus)]'
          }`}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[var(--color-primary)]" />
        )}
      </div>

      {error && (
        <p className="text-[10px] text-[var(--color-danger)] mt-1">{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg shadow-lg overflow-hidden">
          {results.length === 0 && !loading ? (
            <div className="px-4 py-3 text-xs text-[var(--color-text-muted)] text-center">
              No results found
            </div>
          ) : (
            results.map((result, idx) => (
              <button
                key={result.place_id}
                type="button"
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setHighlightIdx(idx)}
                className={`w-full text-left px-4 py-2.5 flex items-start gap-2.5 transition-colors ${
                  idx === highlightIdx
                    ? 'bg-[var(--color-primary-light)] dark:bg-[var(--color-primary)]/10'
                    : 'hover:bg-[var(--color-bg-subtle)]'
                }`}
              >
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[var(--color-primary)]" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">
                    {result.display_name.split(',').slice(0, 3).join(',')}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-tertiary)] truncate">
                    {[getCity(result), result.address.country].filter(Boolean).join(', ')}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
