'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export function Dropdown({ trigger, children, align = 'right', className }: DropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useOnClickOutside(containerRef, () => setIsOpen(false));

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div 
          className={cn(
            "absolute z-50 mt-2 min-w-[12rem] overflow-hidden rounded-xl border border-[var(--color-border-primary)] bg-white dark:bg-slate-900 shadow-xl animate-in fade-in zoom-in-95 duration-100",
            align === 'right' ? 'right-0' : 'left-0',
            className
          )}
        >
          <div className="py-1" onClick={() => setIsOpen(false)}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'danger';
}

export function DropdownItem({ children, onClick, className, variant = 'default' }: DropdownItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center px-4 py-2 text-sm font-medium transition-colors",
        variant === 'default' 
          ? "text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]" 
          : "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DropdownDivider() {
  return <div className="my-1 border-t border-[var(--color-border-primary)]" />;
}
