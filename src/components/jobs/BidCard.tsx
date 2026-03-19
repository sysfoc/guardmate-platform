'use client';

import React from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StarRating } from '@/components/ui/StarRating';
import { Card } from '@/components/ui/Card';
import { BidStatus } from '@/types/enums';
import type { IBid } from '@/types/job.types';
import {
  Clock, PoundSterling, Shield, Calendar,
  CheckCircle2, XCircle, MinusCircle, ChevronDown, ChevronUp, MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

const BID_STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'danger' | 'warning' | 'neutral'; icon: React.ReactNode }> = {
  [BidStatus.PENDING]: { label: 'Pending', variant: 'warning', icon: <Clock className="h-3 w-3" /> },
  [BidStatus.ACCEPTED]: { label: 'Accepted', variant: 'success', icon: <CheckCircle2 className="h-3 w-3" /> },
  [BidStatus.REJECTED]: { label: 'Rejected', variant: 'danger', icon: <XCircle className="h-3 w-3" /> },
  [BidStatus.WITHDRAWN]: { label: 'Withdrawn', variant: 'neutral', icon: <MinusCircle className="h-3 w-3" /> },
  [BidStatus.EXPIRED]: { label: 'Expired', variant: 'neutral', icon: <Clock className="h-3 w-3" /> },
};

interface BidCardProps {
  bid: IBid;
  showActions?: boolean;
  onAccept?: (bidId: string) => void;
  onReject?: (bidId: string) => void;
  onWithdraw?: (bidId: string) => void;
  onMessage?: (bidId: string, guardId: string) => void;
  isAccepting?: boolean;
  isRejecting?: boolean;
  isWithdrawing?: boolean;
  className?: string;
}

export function BidCard({
  bid,
  showActions = false,
  onAccept,
  onReject,
  onWithdraw,
  onMessage,
  isAccepting = false,
  isRejecting = false,
  isWithdrawing = false,
  className,
}: BidCardProps) {
  const [expanded, setExpanded] = React.useState(false);
  const statusConfig = BID_STATUS_CONFIG[bid.status] || BID_STATUS_CONFIG[BidStatus.PENDING];

  const isAccepted = bid.status === BidStatus.ACCEPTED;

  return (
    <Card className={cn(
      'p-4 transition-all duration-200',
      isAccepted && 'border-[var(--color-success)]/30 bg-[var(--color-success-light)]/30',
      className
    )}>
      <div className="flex items-start gap-3">
        {/* Guard Avatar */}
        <Avatar
          src={bid.guardPhoto ?? undefined}
          name={bid.guardName}
          size="md"
        />

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="font-bold text-sm text-[var(--color-text-primary)]">
                {bid.guardName}
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                <StarRating rating={bid.guardRating} size="sm" />
                {bid.guardLicenseType && (
                  <span className="text-[9px] font-bold text-[var(--color-text-tertiary)] flex items-center gap-0.5">
                    <Shield className="h-2.5 w-2.5" /> {bid.guardLicenseType}
                  </span>
                )}
                {bid.guardExperience > 0 && (
                  <span className="text-[9px] font-bold text-[var(--color-text-tertiary)]">
                    {bid.guardExperience}yr exp
                  </span>
                )}
              </div>
            </div>
            <Badge variant={statusConfig.variant} className="text-[9px] h-5 gap-0.5">
              {statusConfig.icon} {statusConfig.label}
            </Badge>
          </div>

          {/* Rate & Date */}
          <div className="flex items-center gap-4 mt-2 text-[10px] font-medium text-[var(--color-text-secondary)]">
            <span className="flex items-center gap-1">
              <PoundSterling className="h-3 w-3 text-[var(--color-text-muted)]" />
              <span className="font-bold text-[var(--color-text-primary)]">£{bid.proposedRate}</span>
              <span className="text-[var(--color-text-muted)]">/{bid.budgetType === 'HOURLY' ? 'hr' : 'fixed'}</span>
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-[var(--color-text-muted)]" />
              Available {new Date(bid.availableFrom).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
            <span className="text-[var(--color-text-muted)]">
              Bid: {new Date(bid.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>

          {/* Cover Message */}
          <div className="mt-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] font-bold text-[var(--color-primary)] hover:underline flex items-center gap-0.5"
            >
              {expanded ? 'Hide' : 'Show'} cover message
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {expanded && (
              <p className="mt-1.5 text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-subtle)] rounded-lg p-3 leading-relaxed">
                {bid.coverMessage}
              </p>
            )}
          </div>

          {/* Rejection Reason */}
          {bid.rejectionReason && bid.status === BidStatus.REJECTED && (
            <p className="mt-2 text-[10px] text-[var(--color-danger)] bg-[var(--color-danger-light)] rounded-lg px-3 py-2">
              <strong>Reason:</strong> {bid.rejectionReason}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {onMessage && isAccepted && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onMessage(bid.bidId, bid.guardUid)}
                className="text-[10px] h-7 px-3 font-bold border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5"
                leftIcon={<MessageSquare className="h-3 w-3" />}
              >
                Message Guard
              </Button>
            )}
            {showActions && bid.status === BidStatus.PENDING && (
              <>
                {onAccept && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => onAccept(bid.bidId)}
                  disabled={isAccepting}
                  className="bg-[var(--color-btn-success-bg)] hover:bg-[var(--color-btn-success-hover-bg)] text-[var(--color-btn-success-text)] text-[10px] h-7 px-3 font-bold"
                >
                  {isAccepting ? 'Accepting...' : 'Accept Bid'}
                </Button>
              )}
              {onReject && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => onReject(bid.bidId)}
                  disabled={isRejecting}
                  className="text-[10px] h-7 px-3 font-bold"
                >
                  {isRejecting ? 'Rejecting...' : 'Reject'}
                </Button>
              )}
              {onWithdraw && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onWithdraw(bid.bidId)}
                  disabled={isWithdrawing}
                  className="text-[10px] h-7 px-3 font-bold"
                >
                  {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
                </Button>
              )}
            </>
          )}
          </div>
        </div>
      </div>
    </Card>
  );
}
