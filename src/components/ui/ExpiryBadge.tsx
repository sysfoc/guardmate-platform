'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';

interface ExpiryBadgeProps {
  expiry: string | Date | null | undefined;
}

export function ExpiryBadge({ expiry }: ExpiryBadgeProps) {
  if (!expiry) return <span className="text-xs text-[var(--color-text-muted)]">N/A</span>;

  const expiryDate = new Date(expiry);
  if (isNaN(expiryDate.getTime())) {
    return <span className="text-xs text-[var(--color-text-muted)]">Invalid Date</span>;
  }

  const now = new Date();
  const daysUntil = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) {
    return <Badge variant="danger" size="sm" dot>Expired</Badge>;
  }
  if (daysUntil <= 30) {
    return <Badge variant="warning" size="sm" dot>Expiring ({daysUntil}d)</Badge>;
  }
  
  return <span className="text-xs text-[var(--color-text-primary)] font-medium">{expiryDate.toLocaleDateString()}</span>;
}
