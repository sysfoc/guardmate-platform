'use client';

import React, { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { JobFilters as JobFiltersType } from '@/types/job.types';

interface JobFiltersProps {
  filters: JobFiltersType;
  onFiltersChange: (filters: Partial<JobFiltersType>) => void;
  onReset: () => void;
  className?: string;
  geoAvailable?: boolean;
  distanceInfo?: string;
  onRetryGeo?: () => void;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'distance', label: 'Distance (Closest)' },
  { value: 'budget_high', label: 'Budget: High to Low' },
  { value: 'budget_low', label: 'Budget: Low to High' },
  { value: 'deadline', label: 'Deadline Soonest' },
];

const BUDGET_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'FIXED', label: 'Fixed Price' },
  { value: 'HOURLY', label: 'Hourly Rate' },
];

const SKILLS_OPTIONS = [
  'CCTV Monitoring', 'Access Control', 'Crowd Management', 'Patrol',
  'Event Security', 'Loss Prevention', 'Fire Safety', 'First Aid',
  'Close Protection', 'K9 Handling', 'Reception Security', 'Corporate Security',
];

export function JobFilters({ filters, onFiltersChange, onReset, className, geoAvailable = false, distanceInfo, onRetryGeo }: JobFiltersProps) {
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(filters.requiredSkills || []);

  const handleSkillToggle = (skill: string) => {
    const updated = selectedSkills.includes(skill)
      ? selectedSkills.filter((s) => s !== skill)
      : [...selectedSkills, skill];
    setSelectedSkills(updated);
    onFiltersChange({ requiredSkills: updated });
  };

  const hasActiveFilters = Boolean(
    filters.search || filters.locationCity || filters.budgetType ||
    filters.budgetMin || filters.budgetMax || filters.startDate ||
    filters.maxDistance ||
    (filters.requiredSkills && filters.requiredSkills.length > 0)
  );

  const filterContent = (
    <div className="space-y-5">
      {/* Search */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1.5 block">
          Search
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Job title or keyword..."
            value={filters.search || ''}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] placeholder:text-[var(--color-input-placeholder)] focus:border-[var(--color-input-border-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--color-input-border-focus)] transition-colors"
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1.5 block">
          City
        </label>
        <input
          type="text"
          placeholder="e.g. London, Manchester..."
          value={filters.locationCity || ''}
          onChange={(e) => onFiltersChange({ locationCity: e.target.value })}
          className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] placeholder:text-[var(--color-input-placeholder)] focus:border-[var(--color-input-border-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--color-input-border-focus)] transition-colors"
        />
      </div>

      {/* Distance */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
            Max Distance (miles)
          </label>
          {!geoAvailable && onRetryGeo && (
            <button 
              onClick={onRetryGeo}
              className="text-[9px] text-[var(--color-primary)] font-bold hover:underline"
            >
              Retry Location
            </button>
          )}
        </div>
        <div className="relative">
          <input
            type="number"
            min={1}
            disabled={!geoAvailable}
            value={filters.maxDistance || ''}
            onChange={(e) => onFiltersChange({ maxDistance: e.target.value ? Number(e.target.value) : undefined })}
            placeholder={geoAvailable ? "e.g. 50" : "Enable location to use"}
            title={!geoAvailable ? "Enable location access to use distance filtering" : undefined}
            className={`w-full px-3 py-2 text-xs rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] placeholder:text-[var(--color-input-placeholder)] focus:border-[var(--color-input-border-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--color-input-border-focus)] transition-colors ${!geoAvailable ? 'opacity-50 cursor-not-allowed bg-[var(--color-bg-subtle)]' : ''}`}
          />
        </div>
        {geoAvailable && distanceInfo && (
          <p className="text-[9px] text-[var(--color-primary)] mt-1.5 font-medium">{distanceInfo}</p>
        )}
      </div>

      {/* Budget Type */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1.5 block">
          Budget Type
        </label>
        <select
          value={filters.budgetType || ''}
          onChange={(e) => onFiltersChange({ budgetType: e.target.value as JobFiltersType['budgetType'] })}
          className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] focus:border-[var(--color-input-border-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--color-input-border-focus)] transition-colors"
        >
          {BUDGET_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Budget Range */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1.5 block">
          Budget Range (£)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.budgetMin || ''}
            onChange={(e) => onFiltersChange({ budgetMin: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] placeholder:text-[var(--color-input-placeholder)] focus:border-[var(--color-input-border-focus)] focus:outline-none transition-colors"
          />
          <span className="text-[var(--color-text-muted)] text-xs">–</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.budgetMax || ''}
            onChange={(e) => onFiltersChange({ budgetMax: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] placeholder:text-[var(--color-input-placeholder)] focus:border-[var(--color-input-border-focus)] focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Start Date */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1.5 block">
          Start Date (From)
        </label>
        <input
          type="date"
          value={filters.startDate || ''}
          onChange={(e) => onFiltersChange({ startDate: e.target.value })}
          className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] focus:border-[var(--color-input-border-focus)] focus:outline-none transition-colors"
        />
      </div>

      {/* Skills */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1.5 block">
          Skills
        </label>
        <div className="flex flex-wrap gap-1.5">
          {SKILLS_OPTIONS.map((skill) => (
            <button
              key={skill}
              onClick={() => handleSkillToggle(skill)}
              className={`text-[9px] font-bold px-2 py-1 rounded-full border transition-colors ${
                selectedSkills.includes(skill)
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border-[var(--color-surface-border)] hover:border-[var(--color-primary)]'
              }`}
            >
              {skill}
            </button>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1.5 block">
          Sort By
        </label>
        <select
          value={filters.sortBy || 'newest'}
          onChange={(e) => onFiltersChange({ sortBy: e.target.value as JobFiltersType['sortBy'] })}
          className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] focus:border-[var(--color-input-border-focus)] focus:outline-none transition-colors"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Reset */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-[10px] font-bold text-[var(--color-danger)]"
          onClick={() => {
            setSelectedSkills([]);
            onReset();
          }}
          leftIcon={<X className="h-3 w-3" />}
        >
          Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`hidden lg:block ${className || ''}`}>
        <div className="sticky top-20">
          <div className="bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-[var(--color-text-primary)]">Filters</h3>
              <SlidersHorizontal className="h-4 w-4 text-[var(--color-text-muted)]" />
            </div>
            {filterContent}
          </div>
        </div>
      </div>

      {/* Mobile Filter Toggle */}
      <div className="lg:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          leftIcon={<SlidersHorizontal className="h-4 w-4" />}
          className="border border-[var(--color-surface-border)]"
        >
          Filters {hasActiveFilters && <span className="ml-1 w-4 h-4 rounded-full bg-[var(--color-primary)] text-white text-[9px] flex items-center justify-center">!</span>}
        </Button>

        {showMobileFilters && (
          <div className="mt-3 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-xl p-5">
            {filterContent}
          </div>
        )}
      </div>
    </>
  );
}
