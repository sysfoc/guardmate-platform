import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendEmailVerification as firebaseSendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  User,
  UserCredential,
  Unsubscribe,
} from 'firebase/auth';
import { auth, googleProvider } from './firebaseClient';

export interface FirebaseAuthResult {
  user: User | null;
  error: string | null;
}

/**
 * Helper to convert Firebase Error Codes into friendly user messages.
 */
export function getFirebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'The email address is not valid.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
      return 'No user found with this email.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address.';
    case 'auth/weak-password':
      return 'The password is too weak. Please use a stronger password.';
    case 'auth/operation-not-allowed':
      return 'Operation not allowed. Please contact support.';
    case 'auth/popup-closed-by-user':
      return 'The login popup was closed before completing.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    default:
      return 'An unexpected error occurred during authentication. Please try again.';
  }
}

export async function signInWithGoogle(): Promise<FirebaseAuthResult> {
  try {
    const userCredential: UserCredential = await signInWithPopup(
      auth,
      googleProvider
    );
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    console.error('Sign In with Google Error:', error);
    return { user: null, error: getFirebaseErrorMessage(error.code) };
  }
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<FirebaseAuthResult> {
  try {
    const userCredential: UserCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    console.error('Sign In with Email Error:', error);
    return { user: null, error: getFirebaseErrorMessage(error.code) };
  }
}

export async function registerWithEmail(
  email: string,
  password: string
): Promise<FirebaseAuthResult> {
  try {
    const userCredential: UserCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    console.error('Register with Email Error:', error);
    return { user: null, error: getFirebaseErrorMessage(error.code) };
  }
}

export async function sendEmailVerification(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('No user is currently signed in.');
  try {
    await firebaseSendEmailVerification(user);
  } catch (error: any) {
    console.error('Send Email Verification Error:', error);
    throw new Error(getFirebaseErrorMessage(error.code));
  }
}

export async function sendPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error('Send Password Reset Error:', error);
    throw new Error(getFirebaseErrorMessage(error.code));
  }
}

export async function reloadCurrentUser(): Promise<void> {
  const user = auth.currentUser;
  if (user) {
    await user.reload();
  }
}

export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error('Sign Out Error:', error);
    throw new Error(getFirebaseErrorMessage(error.code));
  }
}

export function getCurrentFirebaseUser(): User | null {
  return auth.currentUser;
}

export function isEmailVerified(): boolean {
  return auth.currentUser?.emailVerified ?? false;
}

export function onAuthChange(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}
