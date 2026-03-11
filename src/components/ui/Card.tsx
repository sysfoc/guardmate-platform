import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  padding = 'md',
  shadow = 'md',
  hover = false,
  header,
  footer,
  ...props
}) => {
  const paddings = {
    none: 'p-0',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
  };

  const shadows = {
    none: 'shadow-none',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  };

  return (
    <div
      className={cn(
        'rounded-xl border bg-[var(--color-card-bg)] border-[var(--color-card-border)] overflow-hidden transition-all duration-200',
        shadows[shadow],
        hover && 'hover:border-[var(--color-card-hover-border)] hover:shadow-lg translate-y-0 hover:-translate-y-1',
        className
      )}
      {...props}
    >
      {header && (
        <div className="px-5 py-3 border-b border-[var(--color-card-border)] bg-[var(--color-card-header-bg)]">
          {header}
        </div>
      )}
      
      <div className={cn(paddings[padding])}>
        {children}
      </div>

      {footer && (
        <div className="px-6 py-4 border-t border-[var(--color-card-border)] bg-[var(--color-card-header-bg)]">
          {footer}
        </div>
      )}
    </div>
  );
};

Card.displayName = 'Card';
