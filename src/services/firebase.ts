import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfigJson from '../../firebase-applet-config.json';

export const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
  measurementId: firebaseConfigJson.measurementId || undefined,
};

// Initialize Firebase App instance safely
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore safely with direct long-polling for iframe, web & preview environments
let firestoreDb: Firestore;

try {
  const dbId = firebaseConfigJson.firestoreDatabaseId || undefined;
  firestoreDb = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    },
    dbId
  );
} catch {
  try {
    const dbId = firebaseConfigJson.firestoreDatabaseId || undefined;
    firestoreDb = initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
      },
      dbId
    );
  } catch {
    firestoreDb = firebaseConfigJson.firestoreDatabaseId
      ? getFirestore(app, firebaseConfigJson.firestoreDatabaseId)
      : getFirestore(app);
  }
}

export const db = firestoreDb;

// Initialize Firebase Auth
export const auth = getAuth(app);
auth.languageCode = 'zh-TW'; // 啟用台灣繁體中文簡訊與驗證範本

// Initialize Firebase Storage
import { getStorage } from 'firebase/storage';
export const storage = getStorage(app);

export default app;
