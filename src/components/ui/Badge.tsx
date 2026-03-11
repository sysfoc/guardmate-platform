import * as React from 'react';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types/enums';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'boss' | 'mate' | 'admin';
  size?: 'sm' | 'md';
  dot?: boolean;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ 
  className, 
  variant = 'neutral', 
  size = 'md', 
  dot, 
  icon, 
  children, 
  ...props 
}) => {
  
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full border transition-colors';
  
  const variants = {
    success: 'bg-[var(--color-success-light)] text-[var(--color-success)] border-[var(--color-success)]/20',
    warning: 'bg-[var(--color-warning-light)] text-[var(--color-warning)] border-[var(--color-warning)]/20',
    danger: 'bg-[var(--color-danger-light)] text-[var(--color-danger)] border-[var(--color-danger)]/20',
    info: 'bg-[var(--color-info-light)] text-[var(--color-info)] border-[var(--color-info)]/20',
    neutral: 'bg-[var(--color-badge-bg)] text-[var(--color-badge-text)] border-[var(--color-badge-border)]',
    boss: 'bg-[var(--color-role-boss-light)] text-[var(--color-role-boss)] border-[var(--color-role-boss)]/20',
    mate: 'bg-[var(--color-role-mate-light)] text-[var(--color-role-mate)] border-[var(--color-role-mate)]/20',
    admin: 'bg-[var(--color-role-admin-light)] text-[var(--color-role-admin)] border-[var(--color-role-admin)]/20',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[0.7rem] gap-1',
    md: 'px-2.5 py-0.5 text-xs gap-1.5',
  };

  return (
    <div
      className={cn(baseStyles, variants[variant as keyof typeof variants] || variants.neutral, sizes[size], className)}
      {...props}
    >
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0" aria-hidden="true" />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </div>
  );
};

Badge.displayName = 'Badge';
