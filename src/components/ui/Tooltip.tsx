'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 200,
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrows = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-[var(--color-bg-elevated)]',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[var(--color-bg-elevated)]',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-[var(--color-bg-elevated)]',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-[var(--color-bg-elevated)]',
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      
      {isVisible && (
        <div 
          className={cn(
            'absolute z-[var(--z-tooltip)] pointer-events-none transition-all duration-200 animate-in fade-in zoom-in-95',
            positions[position]
          )}
        >
          <div className="px-3 py-1.5 text-xs font-medium text-white bg-[var(--color-bg-elevated)] dark:text-[var(--color-text-primary)] rounded-md shadow-lg w-max max-w-xs text-center">
            {content}
            {/* Arrow */}
            <div className={cn(
              'absolute border-4 border-transparent',
              arrows[position]
            )} />
          </div>
        </div>
      )}
    </div>
  );
};

Tooltip.displayName = 'Tooltip';
