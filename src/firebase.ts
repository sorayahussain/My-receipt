import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const getEnv = (key: string, fallback: string) => {
  const value = import.meta.env[key];
  if (!value || value.includes("YOUR_") || value === "") return fallback;
  return value;
};

const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY", "AIzaSyD1mZOqkB8vhh_Mat_xz8CJ3tByA1nExB4"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN", "gen-lang-client-0628889583.firebaseapp.com"),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID", "gen-lang-client-0628889583"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET", "gen-lang-client-0628889583.firebasestorage.app"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "141638499711"),
  appId: getEnv("VITE_FIREBASE_APP_ID", "1:141638499711:web:1058e08783f26cb214ee4a"),
  measurementId: getEnv("VITE_FIREBASE_MEASUREMENT_ID", "")
};

console.log("Firebase Init - Project ID:", firebaseConfig.projectId);
console.log(`Firebase Init - API Key (masked): ${firebaseConfig.apiKey.substring(0, 6)}...${firebaseConfig.apiKey.substring(firebaseConfig.apiKey.length - 4)}`);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, getEnv("VITE_FIREBASE_DATABASE_ID", "ai-studio-244b6cde-c019-4e43-9abc-018e262dbc1e"));
const auth = getAuth(app);

// Export stable references
export { app, db, auth };
