'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Timer } from 'lucide-react';

interface CountdownTimerProps {
  targetDate: string | Date;
  label?: string;
  className?: string;
  variant?: 'default' | 'compact';
}

function getTimeDiff(target: Date): { days: number; hours: number; minutes: number; isPast: boolean } {
  const now = new Date();
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, isPast: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes, isPast: false };
}

export function CountdownTimer({ targetDate, label, className = '', variant = 'default' }: CountdownTimerProps) {
  const [timeDiff, setTimeDiff] = useState(() => getTimeDiff(new Date(targetDate)));

  useEffect(() => {
    const target = new Date(targetDate);
    setTimeDiff(getTimeDiff(target));

    const interval = setInterval(() => {
      setTimeDiff(getTimeDiff(target));
    }, 60_000); // Update every minute

    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeDiff.isPast) {
    return null;
  }

  const text = timeDiff.days > 0
    ? `${timeDiff.days}d ${timeDiff.hours}h`
    : `${timeDiff.hours}h ${timeDiff.minutes}m`;

  const isUrgent = timeDiff.days === 0 && timeDiff.hours < 12;

  if (variant === 'compact') {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
          isUrgent
            ? 'bg-[var(--color-danger-light)] text-[var(--color-danger)]'
            : 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'
        } ${className}`}
      >
        <Timer className="h-2.5 w-2.5" />
        {text}
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-[10px] font-bold ${
        isUrgent
          ? 'text-[var(--color-danger)]'
          : 'text-[var(--color-warning)]'
      } ${className}`}
    >
      <Clock className={`h-3 w-3 ${isUrgent ? 'animate-pulse' : ''}`} />
      {label && <span className="text-[var(--color-text-muted)]">{label}</span>}
      <span>{text}</span>
    </div>
  );
}
