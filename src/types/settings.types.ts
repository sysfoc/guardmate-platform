export interface IPlatformCountry {
  countryName: string;
  countryCode: string; // ISO 2-letter, e.g., "GB"
  dialCode: string; // e.g., "+44"
  flag: string; // Emoji
}

export interface IPlatformSettings {
  _id?: string;
  platformCountry: IPlatformCountry | null;
  checkInRadiusMeters: number;
  abrGuid: string | null;
  abrVerificationEnabled: boolean;
  platformCurrency: string;
  minimumHourlyRate: number | null;
  minimumFixedRate: number | null;
  minimumRateEnforced: boolean;
  minimumRateLastUpdatedAt: string | Date | null;
  minimumRateLastUpdatedBy: string | null;

  // ─── Phase 6: Commission Settings ────────────────────────────────────────
  platformCommissionBoss: number;   // % charged on top of job budget to boss
  platformCommissionGuard: number;  // % deducted from guard payout
  minimumWithdrawalAmount: number;

  // ─── Phase 6: Stripe Configuration ───────────────────────────────────────
  stripeEnabled: boolean;
  stripePublishableKey?: string;         // Safe for frontend
  stripeSecretKey?: string;              // TODO: Future AES-256 encryption — server-only
  stripeWebhookSecret?: string;          // TODO: Future AES-256 encryption — server-only
  stripeConnectEnabled: boolean;

  // ─── Phase 6: PayPal Configuration ───────────────────────────────────────
  paypalEnabled: boolean;
  paypalClientId?: string;               // Safe for frontend
  paypalClientSecret?: string;           // TODO: Future AES-256 encryption — server-only
  paypalWebhookId?: string;              // TODO: Future AES-256 encryption — server-only
  paypalMode: 'sandbox' | 'live';

  // ─── Phase 7: Dispute Settings ───────────────────────────────────────────
  disputeWindowHours: number;
  autoReleaseWindowHours: number;
  disputeDeadlineWarningHours: number;

  createdAt?: string | Date;
  updatedAt?: string | Date;
}

