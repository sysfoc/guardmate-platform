import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from './Card';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: string | { value: string | number; isPositive?: boolean };
  trendDirection?: 'up' | 'down' | 'neutral';
  description?: string;
  variant?: 'blue' | 'emerald' | 'amber' | 'violet' | 'rose';
  className?: string;
}

const colorVariants = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    icon: 'text-blue-500',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    icon: 'text-emerald-500',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    icon: 'text-amber-500',
  },
  violet: {
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    icon: 'text-violet-500',
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    icon: 'text-rose-500',
  },
};

export function StatCard({
  icon,
  label,
  value,
  trend,
  trendDirection = 'neutral',
  description,
  variant = 'blue',
  className = '',
}: StatCardProps) {
  const colors = colorVariants[variant];

  const renderTrend = () => {
    if (!trend) return null;

    if (typeof trend === 'object') {
      const isUp = trend.isPositive;
      return (
        <div className={`flex items-center gap-0.5 text-[10px] font-bold ${
          isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
        }`}>
          {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {isUp ? '+' : ''}{trend.value}%
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-0.5 text-[10px] font-medium ${
        trendDirection === 'up' ? 'text-emerald-600 dark:text-emerald-400' :
        trendDirection === 'down' ? 'text-rose-600 dark:text-rose-400' :
        'text-[var(--color-text-tertiary)]'
      }`}>
        {trendDirection === 'up' && <TrendingUp className="h-3 w-3" />}
        {trendDirection === 'down' && <TrendingDown className="h-3 w-3" />}
        {trendDirection === 'neutral' && <Minus className="h-3 w-3" />}
        {trend}
      </div>
    );
  };

  return (
    <Card className={`hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 ${className}`}>
      <div className="flex items-start justify-between mb-2.5">
        <div className={`p-1.5 rounded-lg ${colors.bg}`}>
          {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, {
            className: `h-4 w-4 ${colors.icon}`,
          }) : icon}
        </div>
        {renderTrend()}
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-0.5">
        {label}
      </p>
      <h2 className="text-xl font-bold text-[var(--color-text-primary)] leading-tight">
        {value}
      </h2>
      {description && (
        <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1 leading-snug">
          {description}
        </p>
      )}
    </Card>
  );
}
