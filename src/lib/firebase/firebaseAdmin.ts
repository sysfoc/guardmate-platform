import * as admin from 'firebase-admin';

if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
  throw new Error('Firebase Admin Initialization Error: Missing environment variables FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY.');
}

const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

export const adminAuth = admin.auth();

/**
 * Safely verifies a Firebase ID token.
 * Returns decoded custom claims/profile data, or null on any validation error.
 */
export async function verifyFirebaseToken(token: string): Promise<admin.auth.DecodedIdToken | null> {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return null;
  }
}

/**
 * Safely fetches a Firebase UserRecord by UID.
 * Returns the UserRecord, or null on any error.
 */
export async function getUserByUid(uid: string): Promise<admin.auth.UserRecord | null> {
  try {
    const userRecord = await adminAuth.getUser(uid);
    return userRecord;
  } catch (error) {
    console.error('Error fetching Firebase User Record:', error);
    return null;
  }
}
