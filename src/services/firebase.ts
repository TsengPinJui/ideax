import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  setLogLevel,
  Firestore
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfigJson from '../../firebase-applet-config.json';

// Suppress noisy internal SDK backoff logs when free-tier daily write quota is reached
try {
  setLogLevel('silent');
} catch {
  // ignore
}

if (typeof window !== 'undefined') {
  const markQuotaExhausted = () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('ideax_firestore_quota_exhausted_date', today);
      window.dispatchEvent(new CustomEvent('ideax_firestore_quota_exhausted'));
    } catch {
      // ignore
    }
  };

  const isFirestoreQuotaLog = (args: any[]): boolean => {
    const text = args.map((a) => (typeof a === 'string' ? a : a?.message || '')).join(' ');
    return (
      text.includes('resource-exhausted') ||
      text.includes('Quota limit exceeded') ||
      text.includes('Quota exceeded for quota metric') ||
      text.includes('Using maximum backoff delay')
    );
  };

  const isFirestoreIdleStreamLog = (args: any[]): boolean => {
    const text = args.map((a) => (typeof a === 'string' ? a : a?.message || '')).join(' ');
    return (
      text.includes('Disconnecting idle stream') ||
      text.includes('Timed out waiting for new targets') ||
      text.includes("GrpcConnection RPC 'Listen' stream") ||
      text.includes("GrpcConnection RPC 'Write' stream")
    );
  };

  const origError = console.error.bind(console);
  console.error = (...args: any[]) => {
    if (isFirestoreQuotaLog(args)) {
      markQuotaExhausted();
      return;
    }
    if (isFirestoreIdleStreamLog(args)) {
      return;
    }
    origError(...args);
  };

  const origWarn = console.warn.bind(console);
  console.warn = (...args: any[]) => {
    if (isFirestoreQuotaLog(args)) {
      markQuotaExhausted();
      return;
    }
    if (isFirestoreIdleStreamLog(args)) {
      return;
    }
    origWarn(...args);
  };
}

function resolveAuthDomain(): string {
  const configured = String((import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || '').trim();
  if (configured && typeof window !== 'undefined') {
    const host = window.location.hostname;
    // 只有在正式網域上使用自己的網域；AI Studio 預覽、本機開發仍用 Firebase 預設網域
    if (host === configured || host === `www.${configured}` || configured === `www.${host}`) return host;
  }
  return firebaseConfigJson.authDomain;
}

export const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  // 手機瀏覽器會隔離不同網域的資料，社群登入改走自己的網域（/__/auth 由 Vercel 轉送到 Firebase）。
  // 需先在 Facebook／Google 後台加入 https://<網域>/__/auth/handler，再於 Vercel 設定 VITE_FIREBASE_AUTH_DOMAIN。
  authDomain: resolveAuthDomain(),
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
  measurementId: firebaseConfigJson.measurementId || undefined,
};

// Initialize Firebase App instance safely
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore safely with memoryLocalCache so exhausted write quotas do not get stuck retrying in IndexedDB
let firestoreDb: Firestore;

try {
  const dbId = firebaseConfigJson.firestoreDatabaseId || undefined;
  firestoreDb = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
      localCache: memoryLocalCache(),
    },
    dbId
  );
} catch {
  firestoreDb = firebaseConfigJson.firestoreDatabaseId
    ? getFirestore(app, firebaseConfigJson.firestoreDatabaseId)
    : getFirestore(app);
}

export const db = firestoreDb;

// Initialize Firebase Auth
export const auth = getAuth(app);
auth.languageCode = 'zh-TW'; // 啟用台灣繁體中文簡訊與驗證範本

// Initialize Firebase Storage
import { getStorage } from 'firebase/storage';
export const storage = getStorage(app);

export default app;
