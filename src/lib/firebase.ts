import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration - env vars with hardcoded fallback
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBhERgFkImW9ae_PetsYpCTU1YqGRwWV2k',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'le-meilleur-panier-2.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'le-meilleur-panier-2',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'le-meilleur-panier-2.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '473252858891',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:473252858891:web:e9efa6495437d880cc4b0e',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-XMZYZ7P946',
};

// Check if Firebase is properly configured
export function isFirebaseConfigured(): boolean {
  const { apiKey, projectId } = firebaseConfig;
  return !!(
    apiKey &&
    apiKey !== 'your_api_key' &&
    projectId &&
    projectId !== 'your_project_id'
  );
}

let app;
let db: ReturnType<typeof getFirestore> | null = null;

try {
  if (isFirebaseConfigured()) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
  }
} catch (error) {
  console.warn('Firebase initialization failed:', error);
}

export { db };
export default app;
