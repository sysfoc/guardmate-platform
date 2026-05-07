// ─────────────────────────────────────────────────────────────────────────────
// GuardMate — Payment & Escrow API Client
// ─────────────────────────────────────────────────────────────────────────────

import { apiGet, apiPost } from '../apiClient';
import type { WithdrawalMethod } from '@/types/enums';
import type { IPayment } from '@/types/payment.types';

// ─── Boss - Payment History ─────────────────────────────────────────────────

export const getMyPayments = async () => {
  return apiGet<(IPayment & { jobStatus: string | null; guardName: string | null })[]>('/api/payments/my');
};

// ─── Boss - Escrow Funding ──────────────────────────────────────────────────

export const createStripeIntent = async (jobId: string) => {
  return apiPost<any>('/api/payments/stripe/create-intent', { jobId });
};

export const confirmStripePayment = async (paymentIntentId: string) => {
  return apiPost<any>('/api/payments/stripe/confirm', { paymentIntentId });
};

export const createPaypalOrder = async (jobId: string) => {
  return apiPost<any>('/api/payments/paypal/create-order', { jobId });
};

export const capturePaypalOrder = async (orderId: string) => {
  return apiPost<any>('/api/payments/paypal/capture-order', { orderId });
};

export const releasePaymentAdmin = async (jobId: string) => {
  return apiPost<any>(`/api/payments/release/${jobId}`, {});
};

// ─── Guard - Wallet & Earnings ──────────────────────────────────────────────

export const getWalletBalance = async () => {
  return apiGet<any>('/api/wallet/balance');
};

export const getWalletDetails = async () => {
  return apiGet<any>('/api/wallet/balance');
};

export const getEarnings = async (page = 1, limit = 10) => {
  return apiGet<any>(`/api/wallet/earnings?page=${page}&limit=${limit}`);
};

export const getWithdrawals = async (page = 1, limit = 10) => {
  return apiGet<any>(`/api/wallet/withdrawals?page=${page}&limit=${limit}`);
};

export const requestWithdrawal = async (amount: number, method: WithdrawalMethod) => {
  return apiPost<any>('/api/wallet/withdraw', { amount, method });
};

// ─── Guard - Gateway Setup ──────────────────────────────────────────────────



export const saveBankDetails = async (payload: { accountName: string; bsb: string; accountNumber: string }) => {
  return apiPost<any>('/api/wallet/bank-details', payload);
};
