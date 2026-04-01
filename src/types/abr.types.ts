/**
 * abr.types.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * TypeScript types and enums for Australian Business Register (ABR) integration.
 */

/**
 * ABN verification status values returned from ABR API
 */
export enum ABNStatus {
  NOT_PROVIDED = 'NOT_PROVIDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  VERIFIED = 'VERIFIED',
  INVALID = 'INVALID',
  CANCELLED = 'CANCELLED',
}

/**
 * Australian states and territories for ABN operating state
 */
export enum AustralianState {
  VIC = 'VIC',
  NSW = 'NSW',
  QLD = 'QLD',
  WA = 'WA',
  SA = 'SA',
  TAS = 'TAS',
  ACT = 'ACT',
  NT = 'NT',
}

/**
 * Full names for Australian states/territories (for display)
 */
export const AustralianStateNames: Record<AustralianState, string> = {
  [AustralianState.VIC]: 'Victoria',
  [AustralianState.NSW]: 'New South Wales',
  [AustralianState.QLD]: 'Queensland',
  [AustralianState.WA]: 'Western Australia',
  [AustralianState.SA]: 'South Australia',
  [AustralianState.TAS]: 'Tasmania',
  [AustralianState.ACT]: 'Australian Capital Territory',
  [AustralianState.NT]: 'Northern Territory',
};

/**
 * Result from ABR API verification
 */
export interface ABRVerificationResult {
  isValid: boolean;
  isActive: boolean;
  businessName: string | null;
  gstRegistered: boolean | null;
  abnStatus: string | null;
  entityType: string | null;
  state: string | null;
  error?: string;
}

/**
 * ABN data stored on user profile
 */
export interface ABNData {
  abn: string | null;
  abnVerified: boolean;
  abnStatus: ABNStatus;
  abnBusinessName: string | null;
  abnGstRegistered: boolean | null;
  abnVerifiedAt: Date | null;
  abnState: AustralianState | null;
}

/**
 * Payload for ABN verification request
 */
export interface VerifyABNPayload {
  abn: string;
  abnState: AustralianState;
}
