import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore, Firestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfigJson from '../../firebase-applet-config.json';

export const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey || "AIzaSyCZYTHffdGT1AYwNDk_RRZ1mMMWLfoQocE",
  authDomain: firebaseConfigJson.authDomain || "ideax-2af9c.firebaseapp.com",
  projectId: firebaseConfigJson.projectId || "ideax-2af9c",
  storageBucket: firebaseConfigJson.storageBucket || "ideax-2af9c.firebasestorage.app",
  messagingSenderId: firebaseConfigJson.messagingSenderId || "901207969430",
  appId: firebaseConfigJson.appId || "1:901207969430:web:305bdbefe95bd920b17cb7",
  measurementId: firebaseConfigJson.measurementId || "G-RFFS9WG51K"
};

// Initialize Firebase App instance safely
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore safely with forced long-polling for iframe & preview environments
let firestoreDb: Firestore;

try {
  const dbId = firebaseConfigJson.firestoreDatabaseId || undefined;
  const settings = {
    experimentalForceLongPolling: true,
    ignoreUndefinedProperties: true,
  };
  
  if (dbId) {
    firestoreDb = initializeFirestore(app, settings, dbId);
  } else {
    firestoreDb = initializeFirestore(app, settings);
  }
} catch (e) {
  firestoreDb = firebaseConfigJson.firestoreDatabaseId
    ? getFirestore(app, firebaseConfigJson.firestoreDatabaseId)
    : getFirestore(app);
}

export const db = firestoreDb;

// Initialize Firebase Auth
export const auth = getAuth(app);

export default app;
