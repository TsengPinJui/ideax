import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
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

// Initialize Firestore
export const db = firebaseConfigJson.firestoreDatabaseId
  ? getFirestore(app, firebaseConfigJson.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

export default app;
