import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

export interface PasswordStrengthProps {
  value: string;
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ value }) => {
  const getStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strength = getStrength(value);
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const colors = [
    'bg-[var(--color-danger)]',
    'var(--color-warning)', // Warning color variable name check
    'var(--color-info)',
    'var(--color-success)',
  ];

  // Re-mapping colors to specific Tailwind utility classes or custom arbitrary values
  const getSegmentColor = (index: number) => {
    if (index >= strength) return 'bg-[var(--color-border-default)]';
    if (strength === 1) return 'bg-[var(--color-danger)]';
    if (strength === 2) return 'bg-[var(--color-warning)]';
    if (strength === 3) return 'bg-[var(--color-info)]';
    if (strength === 4) return 'bg-[var(--color-success)]';
    return 'bg-[var(--color-border-default)]';
  };

  const criteria = [
    { label: 'At least 8 characters', met: value.length >= 8 },
    { label: 'At least one uppercase letter', met: /[A-Z]/.test(value) },
    { label: 'At least one number', met: /[0-9]/.test(value) },
    { label: 'At least one special character', met: /[^A-Za-z0-9]/.test(value) },
  ];

  return (
    <div className="flex flex-col gap-3 mt-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">
          Password Strength: <span className={cn(
            'font-bold capitalize',
            strength === 1 && 'text-[var(--color-danger)]',
            strength === 2 && 'text-[var(--color-warning)]',
            strength === 3 && 'text-[var(--color-info)]',
            strength === 4 && 'text-[var(--color-success)]',
            strength === 0 && 'text-[var(--color-text-muted)]'
          )}>{value ? labels[strength - 1] : 'None'}</span>
        </span>
      </div>

      <div className="flex gap-1.5 h-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn('flex-1 rounded-full transition-all duration-300', getSegmentColor(i))}
          />
        ))}
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4 mt-1">
        {criteria.map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-[11px]">
            {item.met ? (
              <Check className="h-3 w-3 text-[var(--color-success)]" />
            ) : (
              <div className="h-3 w-3 rounded-full border border-[var(--color-border-default)] flex items-center justify-center">
                <div className="h-1 w-1 rounded-full bg-[var(--color-text-disabled)]" />
              </div>
            )}
            <span className={cn(
              item.met ? 'text-[var(--color-text-primary)] font-medium' : 'text-[var(--color-text-muted)]'
            )}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

PasswordStrength.displayName = 'PasswordStrength';
