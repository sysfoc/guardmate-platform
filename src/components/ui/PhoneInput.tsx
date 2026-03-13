'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

import { countries, type Country } from '@/constants/countries';

export { type Country, countries };

export interface PhoneInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onCountryChange?: (country: Country) => void;
  defaultCountry?: string;
  lockedCountry?: Country | null;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  label,
  value,
  onChange,
  onCountryChange,
  defaultCountry = 'US',
  lockedCountry,
  error,
  disabled,
  required,
}) => {
  const [selectedCountry, setSelectedCountry] = React.useState<Country>(
    lockedCountry || countries.find((c) => c.code === defaultCountry) || countries[0]
  );
  
  // React to lock changes
  React.useEffect(() => {
    if (lockedCountry && lockedCountry.code !== selectedCountry.code) {
      setSelectedCountry(lockedCountry);
      onCountryChange?.(lockedCountry);
    }
  }, [lockedCountry, selectedCountry.code, onCountryChange]);

  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    onCountryChange?.(country);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    onChange(val);
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className={cn(
          'text-sm font-medium transition-colors',
          error ? 'text-[var(--color-danger)]' : 'text-[var(--color-input-label)]',
          disabled ? 'opacity-50' : ''
        )}>
          {label}
          {required && <span className="ml-1 text-[var(--color-danger)]">*</span>}
        </label>
      )}

      <div className="relative flex gap-2">
        {/* Country Selector */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            type="button"
            disabled={disabled || !!lockedCountry}
            onClick={() => !lockedCountry && setIsOpen(!isOpen)}
            className={cn(
              'flex items-center justify-between gap-1.5 h-11 px-3 border rounded-lg bg-[var(--color-input-bg)] text-[var(--color-text-primary)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed min-w-[5.5rem]',
              error ? 'border-[var(--color-danger)]' : 'border-[var(--color-input-border)]'
            )}
          >
            <span className="flex items-center gap-1.5">
              <span className="text-xl leading-none flex items-center justify-center -mt-1">{selectedCountry.flag}</span>
              <span className="text-sm font-medium leading-none">{selectedCountry.dialCode}</span>
            </span>
            {!lockedCountry && <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />}
          </button>

          {isOpen && !lockedCountry && (
            <div className="absolute left-0 top-full mt-1 w-64 max-h-64 overflow-y-auto z-[99999] bg-[var(--color-bg-elevated)] border border-[var(--color-border-default)] rounded-lg shadow-lg">
              {countries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountrySelect(country)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <span className="text-xl leading-none flex items-center justify-center -mt-0.5 w-6">{country.flag}</span>
                  <span className="flex-1 text-sm leading-none pt-0.5">{country.name}</span>
                  <span className="text-xs text-[var(--color-text-muted)] leading-none pt-0.5">{country.dialCode}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Number Input */}
        <div className="flex-1">
          <input
            type="tel"
            value={value}
            onChange={handleNumberChange}
            disabled={disabled}
            placeholder="000 000 0000"
            className={cn(
              'flex h-11 w-full rounded-lg border bg-[var(--color-input-bg)] px-4 py-2 text-base transition-all placeholder:text-[var(--color-input-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed',
              error ? 'border-[var(--color-danger)]' : 'border-[var(--color-input-border)]'
            )}
          />
        </div>
      </div>

      {error && (
        <p className="text-xs font-medium text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
};

PhoneInput.displayName = 'PhoneInput';
