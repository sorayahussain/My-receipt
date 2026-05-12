import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;

const hasConfig = !!firebaseConfig.apiKey;

try {
  if (hasConfig) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app, import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)');
    auth = getAuth(app);
  } else {
    console.warn("Firebase Configuration is incomplete. Ensure VITE_FIREBASE_* environment variables are set.");
    console.info("Go to the Settings menu (cog icon) -> Secrets to add your Firebase credentials.");
    console.info("Your Firebase project ID is: gen-lang-client-0628889583");
  }
} catch (error) {
  console.error("Failed to initialize Firebase:", error);
}

// Export as potentially undefined to allow components to handle missing state gracefully
export { app, db, auth };
