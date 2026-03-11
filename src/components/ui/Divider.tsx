import * as React from 'react';
import { cn } from '@/lib/utils';

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  label?: string;
  labelPosition?: 'left' | 'center' | 'right';
}

export const Divider: React.FC<DividerProps> = ({ 
  className, 
  orientation = 'horizontal', 
  label, 
  labelPosition = 'center',
  ...props 
}) => {
  if (orientation === 'vertical') {
    return (
      <div 
        className={cn('h-full w-px bg-[var(--color-border-default)]', className)} 
        {...props} 
      />
    );
  }

  return (
    <div className={cn('relative w-full py-4', className)} {...props}>
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-[var(--color-border-default)]"></div>
      </div>
      {label && (
        <div className={cn(
          'relative flex text-sm',
          labelPosition === 'left' ? 'justify-start pl-4' : 
          labelPosition === 'right' ? 'justify-end pr-4' : 
          'justify-center'
        )}>
          <span className="bg-[var(--color-bg-base)] px-2 text-[var(--color-text-muted)]">
            {label}
          </span>
        </div>
      )}
    </div>
  );
};

Divider.displayName = 'Divider';
