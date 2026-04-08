// ─────────────────────────────────────────────────────────────────────────────
// GuardMate — Payment, Wallet & Withdrawal Type Definitions
// Phase 6: Payments & Escrow System
// ─────────────────────────────────────────────────────────────────────────────

import { PaymentMethod, EscrowPaymentStatus, WithdrawalStatus } from './enums';

// ─── Payment Interface ────────────────────────────────────────────────────────

export interface IPayment {
  _id?: string;
  jobId: string;
  bidId: string;
  bossUid: string;
  guardUid: string;
  jobTitle: string;

  // Amounts
  jobBudget: number;
  bossCommissionRate: number;
  guardCommissionRate: number;
  bossCommissionAmount: number;
  guardCommissionAmount: number;
  totalChargedToBoss: number;
  guardPayout: number;
  platformRevenue: number;
  currency: string;

  // Method & Status
  paymentMethod: PaymentMethod;
  paymentStatus: EscrowPaymentStatus;

  // Stripe-specific
  stripePaymentIntentId: string | null;
  stripeTransferId: string | null;

  // PayPal-specific
  paypalOrderId: string | null;
  paypalCaptureId: string | null;

  // Timestamps
  heldAt: string | Date | null;
  releasedAt: string | Date | null;
  refundedAt: string | Date | null;
  refundReason: string | null;
  disputeId: string | null;

  createdAt: string | Date;
  updatedAt: string | Date;
}

// ─── Guard Wallet Interface ──────────────────────────────────────────────────

export interface IGuardWallet {
  _id?: string;
  guardUid: string;
  availableBalance: number;
  pendingBalance: number;
  totalEarned: number;
  totalWithdrawn: number;

  // Stripe Connect
  stripeAccountId: string | null;
  stripeAccountVerified: boolean;

  // PayPal
  paypalEmail: string | null;
  paypalVerified: boolean;

  currency: string;
  lastPayoutAt: string | Date | null;

  createdAt: string | Date;
  updatedAt: string | Date;
}

// ─── Withdrawal Interface ────────────────────────────────────────────────────

export interface IWithdrawal {
  _id?: string;
  guardUid: string;
  amount: number;
  currency: string;
  withdrawalMethod: PaymentMethod;
  status: WithdrawalStatus;

  stripePayoutId: string | null;
  paypalPayoutId: string | null;
  failureReason: string | null;

  requestedAt: string | Date;
  processedAt: string | Date | null;
  completedAt: string | Date | null;

  createdAt: string | Date;
  updatedAt: string | Date;
}

// ─── Summary Interfaces ──────────────────────────────────────────────────────

export interface PaymentSummary {
  totalTransactions: number;
  totalRevenue: number;
  totalEscrowHeld: number;
  totalReleased: number;
  totalFailed: number;
}

export interface EarningsSummary {
  availableBalance: number;
  pendingBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  recentPayments: IPayment[];
}

export interface SpendingSummary {
  totalSpent: number;
  activeEscrow: number;
  platformFeesPaid: number;
  recentPayments: IPayment[];
}

export interface AdminRevenueSummary {
  totalPlatformRevenue: number;
  thisMonthRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
  totalActiveEscrow: number;
  bossCommissionRevenue: number;
  guardCommissionRevenue: number;
}

// ─── Payload Interfaces ──────────────────────────────────────────────────────

export interface CreatePaymentPayload {
  jobId: string;
}

export interface WithdrawalRequestPayload {
  amount: number;
  method: PaymentMethod;
}

// ─── Filter Interfaces ───────────────────────────────────────────────────────

export interface PaymentFilters {
  status?: EscrowPaymentStatus;
  method?: PaymentMethod;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface AdminRevenueFilters {
  dateFrom?: string;
  dateTo?: string;
  paymentMethod?: PaymentMethod;
  status?: EscrowPaymentStatus;
  page?: number;
  limit?: number;
}
