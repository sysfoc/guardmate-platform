// ─────────────────────────────────────────────────────────────────────────────
// GuardMate — Firebase Types
// ─────────────────────────────────────────────────────────────────────────────

// ─── Firebase Auth Result ─────────────────────────────────────────────────────

/**
 * Subset of the Firebase User object we care about in the app.
 * Avoids importing firebase directly in contexts that only need shape info.
 */
export interface FirebaseUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  providerData: FirebaseUserProvider[];
  metadata: {
    creationTime: string | undefined;
    lastSignInTime: string | undefined;
  };
}

export interface FirebaseUserProvider {
  providerId: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface FirebaseAuthResult {
  user: FirebaseUser;
  idToken: string;
}

// ─── Firebase Error Codes ─────────────────────────────────────────────────────

export enum FirebaseErrorCode {
  // Auth — Email/Password
  EMAIL_ALREADY_IN_USE    = 'auth/email-already-in-use',
  INVALID_EMAIL           = 'auth/invalid-email',
  WEAK_PASSWORD           = 'auth/weak-password',
  USER_NOT_FOUND          = 'auth/user-not-found',
  WRONG_PASSWORD          = 'auth/wrong-password',
  USER_DISABLED           = 'auth/user-disabled',

  // Auth — Google / OAuth
  POPUP_CLOSED_BY_USER    = 'auth/popup-closed-by-user',
  POPUP_BLOCKED           = 'auth/popup-blocked',
  ACCOUNT_EXISTS_DIFFERENT_CREDENTIAL = 'auth/account-exists-with-different-credential',
  CREDENTIAL_ALREADY_IN_USE = 'auth/credential-already-in-use',

  // Auth — Session / Token
  INVALID_CREDENTIAL      = 'auth/invalid-credential',
  TOKEN_EXPIRED           = 'auth/id-token-expired',
  TOKEN_REVOKED           = 'auth/id-token-revoked',
  INVALID_USER_TOKEN      = 'auth/invalid-user-token',
  USER_TOKEN_EXPIRED      = 'auth/user-token-expired',
  REQUIRES_RECENT_LOGIN   = 'auth/requires-recent-login',

  // Auth — Rate & Network
  TOO_MANY_REQUESTS       = 'auth/too-many-requests',
  NETWORK_REQUEST_FAILED  = 'auth/network-request-failed',
  OPERATION_NOT_ALLOWED   = 'auth/operation-not-allowed',
  INTERNAL_ERROR          = 'auth/internal-error',

  // Auth — Phone
  INVALID_PHONE_NUMBER    = 'auth/invalid-phone-number',
  QUOTA_EXCEEDED          = 'auth/quota-exceeded',
  INVALID_VERIFICATION_CODE = 'auth/invalid-verification-code',
  INVALID_VERIFICATION_ID = 'auth/invalid-verification-id',
  SESSION_EXPIRED         = 'auth/session-expired',

  // Firestore
  PERMISSION_DENIED       = 'permission-denied',
  NOT_FOUND               = 'not-found',
  ALREADY_EXISTS          = 'already-exists',
  UNAVAILABLE             = 'unavailable',
}

// ─── Firebase Error Helper Type ───────────────────────────────────────────────

export interface FirebaseError {
  code: FirebaseErrorCode | string;
  message: string;
  name: 'FirebaseError';
}
