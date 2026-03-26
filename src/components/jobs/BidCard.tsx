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
  onSelectForCompare?: (bidId: string, checked: boolean) => void;
  isSelectedForCompare?: boolean;
  isCompareSelectable?: boolean;
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
  onSelectForCompare,
  isSelectedForCompare = false,
  isCompareSelectable = true,
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
      <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
        <div className="flex items-start gap-3 sm:gap-4 w-full sm:w-auto">
          {/* Comparison Checkbox */}
          {onSelectForCompare && (
            <div className="pt-2 shrink-0">
              <input 
                type="checkbox"
                checked={isSelectedForCompare}
                disabled={!isSelectedForCompare && !isCompareSelectable}
                onChange={(e) => onSelectForCompare(bid.bidId, e.target.checked)}
                className="h-4 w-4 sm:h-5 sm:w-5 rounded border-[var(--color-input-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Select for comparison"
              />
            </div>
          )}

          {/* Guard Avatar */}
          <Avatar
            src={bid.guardPhoto ?? undefined}
            name={bid.guardName}
            size="md"
            className="shrink-0"
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-sm sm:text-base text-[var(--color-text-primary)] truncate block max-w-full">
                {bid.guardName}
              </h4>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                <StarRating rating={bid.guardRating} size="sm" />
                {bid.guardLicenseType && (
                  <span className="text-[9px] sm:text-[10px] font-bold text-[var(--color-text-tertiary)] flex items-center gap-0.5 whitespace-nowrap">
                    <Shield className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> {bid.guardLicenseType}
                  </span>
                )}
                {bid.guardExperience > 0 && (
                  <span className="text-[9px] sm:text-[10px] font-bold text-[var(--color-text-tertiary)] whitespace-nowrap">
                    {bid.guardExperience}yr exp
                  </span>
                )}
              </div>
            </div>
            <Badge variant={statusConfig.variant} className="text-[9px] sm:text-[10px] h-5 sm:h-6 gap-0.5 shrink-0 whitespace-nowrap">
              {statusConfig.icon} {statusConfig.label}
            </Badge>
          </div>

          {/* Rate & Date */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-[10px] sm:text-xs font-medium text-[var(--color-text-secondary)]">
            <span className="flex items-center gap-1 whitespace-nowrap">
              <PoundSterling className="h-3 w-3 sm:h-4 sm:w-4 text-[var(--color-text-muted)]" />
              <span className="font-bold text-[var(--color-text-primary)]">£{bid.proposedRate}</span>
              <span className="text-[var(--color-text-muted)]">/{bid.budgetType === 'HOURLY' ? 'hr' : 'fixed'}</span>
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-[var(--color-text-muted)]" />
              Avail {new Date(bid.availableFrom).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
            <span className="text-[var(--color-text-muted)] whitespace-nowrap">
              Bid: {new Date(bid.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>

          {/* Cover Message */}
          <div className="mt-2.5 sm:mt-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] sm:text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1"
            >
              {expanded ? 'Hide cover message' : 'Show cover message'}
              {expanded ? <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" /> : <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />}
            </button>
            {expanded && (
              <p className="mt-2 text-xs sm:text-sm text-[var(--color-text-secondary)] bg-[var(--color-bg-subtle)] rounded-lg p-3 sm:p-4 leading-relaxed whitespace-pre-line">
                {bid.coverMessage}
              </p>
            )}
          </div>

          {/* Rejection Reason */}
          {bid.rejectionReason && bid.status === BidStatus.REJECTED && (
            <p className="mt-2.5 sm:mt-3 text-[10px] sm:text-xs text-[var(--color-danger)] bg-[var(--color-danger-light)] rounded-lg px-3 py-2.5">
              <strong>Reason:</strong> {bid.rejectionReason}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4 flex-wrap sm:flex-nowrap">
            {onMessage && isAccepted && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onMessage(bid.bidId, bid.guardUid)}
                className="w-full sm:w-auto text-[10px] sm:text-xs h-8 sm:h-9 px-3 sm:px-4 font-bold border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5"
                leftIcon={<MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />}
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
                  className="w-full sm:w-auto bg-[var(--color-btn-success-bg)] hover:bg-[var(--color-btn-success-hover-bg)] text-[var(--color-btn-success-text)] text-[10px] sm:text-xs h-8 sm:h-9 px-3 sm:px-4 font-bold"
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
                  className="w-full sm:w-auto text-[10px] sm:text-xs h-8 sm:h-9 px-3 sm:px-4 font-bold"
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
                  className="w-full sm:w-auto text-[10px] sm:text-xs h-8 sm:h-9 px-3 sm:px-4 font-bold"
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
