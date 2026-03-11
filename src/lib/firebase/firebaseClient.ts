import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  getIdToken,
  Auth,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if all required config values are present
const configValues = Object.values(firebaseConfig);
if (configValues.some((v) => !v)) {
  const missingKeys = Object.keys(firebaseConfig).filter(
    (key) => !firebaseConfig[key as keyof typeof firebaseConfig]
  );
  throw new Error(
    `Firebase Initialization Error: Missing environment variables: ${missingKeys.join(
      ', '
    )}.`
  );
}

// Initialize Firebase App securely in Next.js environment
const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
const auth: Auth = getAuth(app);

// Configure Google Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Gets the current user's ID token.
 * Does not force a refresh, returns cached token if still valid.
 * @returns A promise that resolves to the ID token string, or null if unauthenticated.
 */
export async function getFirebaseIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return getIdToken(user, false);
}

/**
 * Force refreshes and gets the current user's ID token.
 * Useful after custom claims update or role change.
 * @returns A promise that resolves to the fresh ID token string, or null if unauthenticated.
 */
export async function refreshFirebaseIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return getIdToken(user, true);
}

export { app, auth, googleProvider };
