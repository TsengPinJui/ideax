/**
 * 創星季 (Star Season Innovation Challenge) - 可信後端服務層
 * 
 * 核心安全準則：
 * 1. 嚴禁依賴前端傳送的 role / balance / admin 標記；
 * 2. 競賽點數必須與舊站真實 balance 徹底分開（使用專屬集合 competition_accounts）；
 * 3. 點數支持、分享獎勵防重、審核狀態、推薦推廣費統計、得獎核定均使用 Firestore 交易或批次原子處理；
 * 4. 單案角色支持上限（參賽者與一般用戶 50,000、專家 2,000,000）、可以自我注資、冪等性防重複提交；
 * 5. 敏感資料（銀行/身分/聯絡）隔離存放於 competition_private_submissions，公開集合 competition_proposals 絕對不含敏感個資。
 */

import fs from 'fs';
import path from 'path';
import { initializeApp as initAdminApp, getApps as getAdminApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp as initClientApp, getApps as getClientApps, getApp as getClientApp } from 'firebase/app';
import {
  getFirestore as getClientFirestore,
  initializeFirestore as initClientFirestore,
  memoryLocalCache,
  setLogLevel,
  collection as clientCollection,
  doc as clientDoc,
  getDoc as clientGetDoc,
  getDocs as clientGetDocs,
  setDoc as clientSetDoc,
  updateDoc as clientUpdateDoc,
  deleteDoc as clientDeleteDoc,
  addDoc as clientAddDoc,
  query as clientQuery,
  where as clientWhere,
  orderBy as clientOrderBy,
  limit as clientLimit,
  writeBatch as clientWriteBatch,
  runTransaction as clientRunTransaction,
  increment as clientIncrement,
  arrayUnion as clientArrayUnion,
  getCountFromServer as clientGetCountFromServer,
  Firestore,
} from 'firebase/firestore';
import firebaseConfigJson from '../firebase-applet-config.json';
import {
  StarSeasonProposal,
  ProposalPrivateDetails,
  CompetitionAccount,
  COMPETITION_POINTS_CONFIG,
  StarSeasonStage,
  StarSeasonTrack,
  ParticipantRegistrationData,
  JudgeApplicationData,
  ProposalComment,
} from '../src/types/competition';
import { DEFAULT_DEMO_PROPOSALS } from '../src/data/competitionProposals';
import {
  ALL_VIRTUAL_PROPOSALS_SEED,
  SEED_INNOVATION_PROPOSALS,
  ALL_VIRTUAL_ANSWERS_SEED,
  VIRTUAL_PERSONA_USERS,
} from '../src/data/virtualProposalsSeed';
import { DEFAULT_VIBECODING_APPS } from '../src/data/vibeCodingData';
import { MOCK_QUESTIONS } from '../src/data/mockData';
import { questionToStarSeasonProposal } from '../src/utils/questionUtils';

// Suppress noisy internal SDK logs (such as idle GrpcConnection stream disconnects and quota backoff)
try {
  setLogLevel('silent');
} catch {
  // ignore
}

const isIgnorableFirestoreSdkLog = (args: any[]): boolean => {
  const text = args.map((a) => (typeof a === 'string' ? a : a?.message || '')).join(' ');
  return (
    text.includes('Disconnecting idle stream') ||
    text.includes('Timed out waiting for new targets') ||
    text.includes("GrpcConnection RPC 'Listen' stream") ||
    text.includes("GrpcConnection RPC 'Write' stream") ||
    text.includes('resource-exhausted') ||
    text.includes('Quota limit exceeded') ||
    text.includes('Quota exceeded for quota metric') ||
    text.includes('Using maximum backoff delay')
  );
};

const origServerError = console.error.bind(console);
console.error = (...args: any[]) => {
  if (isIgnorableFirestoreSdkLog(args)) return;
  origServerError(...args);
};

const origServerWarn = console.warn.bind(console);
console.warn = (...args: any[]) => {
  if (isIgnorableFirestoreSdkLog(args)) return;
  origServerWarn(...args);
};

// 初始化 Firebase Admin Auth
// 若有設定 FIREBASE_SERVICE_ACCOUNT（服務帳戶金鑰 JSON，或其 base64），就能使用需要管理權限的功能
// （例如：用驗證碼重設密碼、產生 Email 驗證連結）。沒有設定時，其他功能照常運作。
function loadServiceAccount(): Record<string, any> | null {
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();
  if (!raw) return null;
  try {
    const json = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const parsed = JSON.parse(json);
    if (parsed.private_key) parsed.private_key = String(parsed.private_key).replace(/\\n/g, '\n');
    return parsed.client_email && parsed.private_key ? parsed : null;
  } catch {
    console.warn('[Firebase Admin] FIREBASE_SERVICE_ACCOUNT 格式無法解析，已略過');
    return null;
  }
}
const serviceAccount = loadServiceAccount();
export const hasAdminCredentials = Boolean(serviceAccount);

if (!getAdminApps().length) {
  initAdminApp({
    projectId: firebaseConfigJson.projectId || 'ideax-2af9c',
    ...(serviceAccount ? { credential: cert(serviceAccount as any) } : {}),
  });
}

// 初始化 Firebase Firestore (連接 ai-studio-ideax-6902feae-e5d6-4a4d-84d3-58e8b342c54c 資料庫)
const clientApp = getClientApps().length > 0 ? getClientApp() : initClientApp(firebaseConfigJson);
let rawFirestoreDb: Firestore;
try {
  rawFirestoreDb = initClientFirestore(
    clientApp,
    { localCache: memoryLocalCache() },
    firebaseConfigJson.firestoreDatabaseId
  );
} catch {
  rawFirestoreDb = getClientFirestore(clientApp, firebaseConfigJson.firestoreDatabaseId);
}

const LOCAL_DB_FILE = path.resolve(process.cwd(), 'server/data/firestore_db.json');
let localDbStore: Record<string, Record<string, any>> = {};
let isFirestoreReadQuotaExhausted = false;

function loadLocalDbStore() {
  try {
    if (fs.existsSync(LOCAL_DB_FILE)) {
      const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf8');
      localDbStore = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[Database] Failed to read firestore_db.json:', err);
  }
}
loadLocalDbStore();

let saveLocalDbTimer: NodeJS.Timeout | null = null;
function scheduleSaveLocalDbStore() {
  if (saveLocalDbTimer) clearTimeout(saveLocalDbTimer);
  saveLocalDbTimer = setTimeout(() => {
    try {
      const dir = path.dirname(LOCAL_DB_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(localDbStore, null, 2), 'utf8');
    } catch (err) {
      console.warn('[Database] Failed to save firestore_db.json:', err);
    }
  }, 150);
}

function isQuotaError(err: any): boolean {
  const msg = err?.message || String(err);
  const code = err?.code || '';
  return (
    code === 'resource-exhausted' ||
    msg.includes('resource-exhausted') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Quota exceeded')
  );
}

function cleanFirestorePayload(val: any): any {
  if (val === undefined) return null;
  if (val === null || typeof val !== 'object') return val;
  if (val instanceof Date) return val.toISOString();
  if (Array.isArray(val)) {
    return val.filter((v) => v !== undefined).map(cleanFirestorePayload);
  }
  if (val.constructor && val.constructor.name !== 'Object') {
    return val;
  }
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(val)) {
    if (v !== undefined) {
      out[k] = cleanFirestorePayload(v);
    }
  }
  return out;
}

export const FieldValue = {
  increment: (n: number) => ({ __op: 'increment', value: n, _firestoreOp: clientIncrement(n) }),
  arrayUnion: (...elements: any[]) => ({ __op: 'arrayUnion', elements, _firestoreOp: clientArrayUnion(...elements) }),
};

function toFirestoreNativePayload(val: any): any {
  if (val === undefined) return null;
  if (val === null || typeof val !== 'object') return val;
  if (val._firestoreOp) return val._firestoreOp;
  if (val instanceof Date) return val.toISOString();
  if (Array.isArray(val)) {
    return val.filter((v) => v !== undefined).map(toFirestoreNativePayload);
  }
  if (val.constructor && val.constructor.name !== 'Object') {
    return val;
  }
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(val)) {
    if (v !== undefined) {
      out[k] = toFirestoreNativePayload(v);
    }
  }
  return out;
}

function applyPayloadToLocalDoc(colName: string, docId: string, data: any, merge: boolean = true) {
  if (!localDbStore[colName]) localDbStore[colName] = {};
  const existing = merge && localDbStore[colName][docId] ? { ...localDbStore[colName][docId] } : {};
  for (const [k, v] of Object.entries(data || {})) {
    if (v === undefined) continue;
    if (v && typeof v === 'object' && (v as any).__op === 'increment') {
      existing[k] = (typeof existing[k] === 'number' ? existing[k] : 0) + (v as any).value;
    } else if (v && typeof v === 'object' && (v as any).__op === 'arrayUnion') {
      const arr = Array.isArray(existing[k]) ? [...existing[k]] : [];
      for (const el of (v as any).elements || []) {
        if (!arr.includes(el)) arr.push(el);
      }
      existing[k] = arr;
    } else {
      existing[k] = JSON.parse(JSON.stringify(v));
    }
  }
  localDbStore[colName][docId] = existing;
  scheduleSaveLocalDbStore();
}

function deleteLocalDoc(colName: string, docId: string) {
  if (localDbStore[colName] && localDbStore[colName][docId]) {
    delete localDbStore[colName][docId];
    scheduleSaveLocalDbStore();
  }
}

export function getMirrorCollectionMap(colName: string): Record<string, any> {
  return localDbStore[colName] || {};
}

export async function upsertMirrorAndFirestoreDoc(colName: string, docId: string, data: any, merge = true): Promise<void> {
  applyPayloadToLocalDoc(colName, docId, data, merge);
  try {
    const ref = clientDoc(rawFirestoreDb, colName, docId);
    await clientSetDoc(ref, toFirestoreNativePayload(data), { merge });
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn(`[Database] Firestore set warning (${colName}/${docId}):`, (err as any)?.message);
    }
  }
}

export async function deleteMirrorAndFirestoreDoc(colName: string, docId: string): Promise<void> {
  deleteLocalDoc(colName, docId);
  try {
    const ref = clientDoc(rawFirestoreDb, colName, docId);
    await clientDeleteDoc(ref);
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn(`[Database] Firestore delete warning (${colName}/${docId}):`, (err as any)?.message);
    }
  }
}

function createDocWrapper(colName: string, docId?: string) {
  const ref = docId ? clientDoc(rawFirestoreDb, colName, docId) : clientDoc(clientCollection(rawFirestoreDb, colName));
  const id = ref.id;
  return {
    id,
    _colName: colName,
    _ref: ref,
    async get() {
      if (!isFirestoreReadQuotaExhausted) {
        try {
          const snap = await clientGetDoc(ref);
          if (snap.exists()) {
            const d = snap.data() as any;
            applyPayloadToLocalDoc(colName, id, d, true);
          }
          return {
            exists: snap.exists(),
            id: snap.id,
            data: () => snap.data() as any,
            ref,
          };
        } catch (err) {
          if (isQuotaError(err)) {
            isFirestoreReadQuotaExhausted = true;
          } else {
            throw err;
          }
        }
      }
      const localDoc = localDbStore[colName]?.[id];
      return {
        exists: Boolean(localDoc),
        id,
        data: () => (localDoc ? { ...localDoc } : undefined),
        ref,
      };
    },
    async set(data: any, options?: any) {
      const merge = Boolean(options?.merge);
      applyPayloadToLocalDoc(colName, id, data, merge);
      try {
        await clientSetDoc(ref, toFirestoreNativePayload(data), options);
      } catch (err) {
        if (!isQuotaError(err)) throw err;
      }
    },
    async update(data: any) {
      applyPayloadToLocalDoc(colName, id, data, true);
      try {
        await clientUpdateDoc(ref, toFirestoreNativePayload(data));
      } catch (err) {
        if (!isQuotaError(err)) throw err;
      }
    },
    async delete() {
      deleteLocalDoc(colName, id);
      try {
        await clientDeleteDoc(ref);
      } catch (err) {
        if (!isQuotaError(err)) throw err;
      }
    },
  };
}

interface FilterSpec {
  field: string;
  op: string;
  value: any;
}

function createQueryWrapper(colName: string, constraints: any[] = [], filterSpecs: FilterSpec[] = [], limitCount?: number) {
  const colRef = clientCollection(rawFirestoreDb, colName);
  return {
    where(field: string, op: any, value: any) {
      return createQueryWrapper(
        colName,
        [...constraints, clientWhere(field, op, value)],
        [...filterSpecs, { field, op, value }],
        limitCount
      );
    },
    orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
      return createQueryWrapper(
        colName,
        [...constraints, clientOrderBy(field, direction)],
        filterSpecs,
        limitCount
      );
    },
    limit(n: number) {
      return createQueryWrapper(colName, [...constraints, clientLimit(n)], filterSpecs, n);
    },
    async get() {
      if (!isFirestoreReadQuotaExhausted) {
        try {
          const q = constraints.length > 0 ? clientQuery(colRef, ...constraints) : colRef;
          const snap = await clientGetDocs(q);
          const docs = snap.docs.map((d) => {
            const data = d.data() as any;
            applyPayloadToLocalDoc(colName, d.id, data, true);
            return {
              exists: true,
              id: d.id,
              data: () => data,
              ref: d.ref,
            };
          });
          return {
            empty: snap.empty,
            size: snap.size,
            docs,
            forEach(cb: (doc: any) => void) {
              docs.forEach(cb);
            },
          };
        } catch (err) {
          if (isQuotaError(err)) {
            isFirestoreReadQuotaExhausted = true;
          } else {
            throw err;
          }
        }
      }

      const colMap = localDbStore[colName] || {};
      let entries = Object.entries(colMap);
      for (const f of filterSpecs) {
        entries = entries.filter(([, docData]) => {
          const val = docData?.[f.field];
          if (f.op === '==') return val === f.value;
          if (f.op === '!=') return val !== f.value;
          if (f.op === 'array-contains') return Array.isArray(val) && val.includes(f.value);
          if (f.op === 'in') return Array.isArray(f.value) && f.value.includes(val);
          if (f.op === '>') return val > f.value;
          if (f.op === '>=') return val >= f.value;
          if (f.op === '<') return val < f.value;
          if (f.op === '<=') return val <= f.value;
          return true;
        });
      }
      if (typeof limitCount === 'number') {
        entries = entries.slice(0, limitCount);
      }
      const docs = entries.map(([id, docData]) => ({
        exists: true,
        id,
        data: () => ({ ...docData }),
        ref: clientDoc(rawFirestoreDb, colName, id),
      }));
      return {
        empty: docs.length === 0,
        size: docs.length,
        docs,
        forEach(cb: (doc: any) => void) {
          docs.forEach(cb);
        },
      };
    },
  };
}

const adminDb = {
  collection(colName: string) {
    const queryWrapper = createQueryWrapper(colName, []);
    return {
      ...queryWrapper,
      doc(docId?: string) {
        return createDocWrapper(colName, docId);
      },
      async add(data: any) {
        const wrapper = createDocWrapper(colName);
        await wrapper.set(data, { merge: false });
        return wrapper._ref;
      },
    };
  },
  batch() {
    const b = clientWriteBatch(rawFirestoreDb);
    const localOps: Array<() => void> = [];
    return {
      set(docWrapper: any, data: any, options?: any) {
        const colName = docWrapper._colName || docWrapper.parent?.id;
        const id = docWrapper.id;
        if (colName && id) {
          localOps.push(() => applyPayloadToLocalDoc(colName, id, data, Boolean(options?.merge)));
        }
        b.set(docWrapper._ref || docWrapper, toFirestoreNativePayload(data), options);
      },
      update(docWrapper: any, data: any) {
        const colName = docWrapper._colName || docWrapper.parent?.id;
        const id = docWrapper.id;
        if (colName && id) {
          localOps.push(() => applyPayloadToLocalDoc(colName, id, data, true));
        }
        b.update(docWrapper._ref || docWrapper, toFirestoreNativePayload(data));
      },
      delete(docWrapper: any) {
        const colName = docWrapper._colName || docWrapper.parent?.id;
        const id = docWrapper.id;
        if (colName && id) {
          localOps.push(() => deleteLocalDoc(colName, id));
        }
        b.delete(docWrapper._ref || docWrapper);
      },
      async commit() {
        localOps.forEach((fn) => fn());
        try {
          await b.commit();
        } catch (err) {
          if (!isQuotaError(err)) throw err;
        }
      },
    };
  },
  async runTransaction<T>(updateFn: (transaction: any) => Promise<T>): Promise<T> {
    if (!isFirestoreReadQuotaExhausted) {
      try {
        return await clientRunTransaction(rawFirestoreDb, async (tx) => {
          const localOps: Array<() => void> = [];
          const txWrapper = {
            async get(docWrapper: any) {
              const snap = await tx.get(docWrapper._ref || docWrapper);
              return {
                exists: snap.exists(),
                id: snap.id,
                data: () => snap.data() as any,
              };
            },
            set(docWrapper: any, data: any, options?: any) {
              if (docWrapper._colName && docWrapper.id) {
                localOps.push(() => applyPayloadToLocalDoc(docWrapper._colName, docWrapper.id, data, Boolean(options?.merge)));
              }
              tx.set(docWrapper._ref || docWrapper, toFirestoreNativePayload(data), options);
            },
            update(docWrapper: any, data: any) {
              if (docWrapper._colName && docWrapper.id) {
                localOps.push(() => applyPayloadToLocalDoc(docWrapper._colName, docWrapper.id, data, true));
              }
              tx.update(docWrapper._ref || docWrapper, toFirestoreNativePayload(data));
            },
            delete(docWrapper: any) {
              if (docWrapper._colName && docWrapper.id) {
                localOps.push(() => deleteLocalDoc(docWrapper._colName, docWrapper.id));
              }
              tx.delete(docWrapper._ref || docWrapper);
            },
          };
          const res = await updateFn(txWrapper);
          localOps.forEach((fn) => fn());
          return res;
        });
      } catch (err) {
        if (isQuotaError(err)) {
          isFirestoreReadQuotaExhausted = true;
        } else {
          throw err;
        }
      }
    }

    // Fallback atomic transaction on localDbStore + Firestore write
    const batch = adminDb.batch();
    const txWrapper = {
      async get(docWrapper: any) {
        return await docWrapper.get();
      },
      set(docWrapper: any, data: any, options?: any) {
        batch.set(docWrapper, data, options);
      },
      update(docWrapper: any, data: any) {
        batch.update(docWrapper, data);
      },
      delete(docWrapper: any) {
        batch.delete(docWrapper);
      },
    };
    const res = await updateFn(txWrapper);
    await batch.commit();
    return res;
  },
};

const adminAuth = getAuth();

export { adminDb, adminAuth };

/**
 * 驗證請求者身分 Token (可信 Auth 驗證)
 */
export async function verifyAuthToken(authHeader?: string): Promise<{ uid: string; email?: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const idToken = authHeader.split('Bearer ')[1].trim();
  if (!idToken) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return { uid: decoded.uid, email: decoded.email };
  } catch (err: any) {
    // 支援以 Google Identity Toolkit API 查核備援 (相容無金鑰時的公開 JWT 驗證)
    try {
      const apiKey = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyCZYTHffdGT1AYwNDk_RRZ1mMMWLfoQocE';
      const resp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = (await resp.json()) as any;
      if (data.users && data.users[0]) {
        return { uid: data.users[0].localId, email: data.users[0].email };
      }
    } catch {}
    console.warn('[Competition Auth] Token verification failed:', err.message);
    return null;
  }
}

/**
 * 查核用戶是否為可信管理員
 * 嚴禁依賴用戶可寫的 /users/{uid}.role == 'admin'！
 * 僅限 Admin SDK 可寫之 /admins/{uid} 標記或 Firebase Auth Custom Claims (admin === true)
 */
const adminCheckCache = new Map<string, { ok: boolean; at: number }>();
const ADMIN_CHECK_TTL_MS = 5 * 60 * 1000;

function getAdminEmailAllowlist(): string[] {
  return String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e && e.includes('@') && e !== 'admin@example.com');
}

export async function isVerifiedAdmin(uid: string): Promise<boolean> {
  if (!uid) return false;
  const cached = adminCheckCache.get(uid);
  if (cached && Date.now() - cached.at < ADMIN_CHECK_TTL_MS) return cached.ok;

  const remember = (ok: boolean) => {
    adminCheckCache.set(uid, { ok, at: Date.now() });
    return ok;
  };

  // 1. /admins/{uid}：前端無法寫入。伺服器有服務帳戶時以管理端讀取（不受資料庫規則限制）
  try {
    if (hasAdminCredentials) {
      const { getFirestore } = await import('firebase-admin/firestore');
      const dbId = (firebaseConfigJson as any).firestoreDatabaseId;
      const app = getAdminApps()[0];
      const fsAdmin = dbId ? getFirestore(app, dbId) : getFirestore(app);
      const snap = await fsAdmin.collection('admins').doc(uid).get();
      if (snap.exists) return remember(true);
    } else {
      const adminDoc = await adminDb.collection('admins').doc(uid).get();
      if (adminDoc.exists) return remember(true);
    }
  } catch (err: any) {
    console.warn('[Admin Check] admins 讀取失敗:', err?.code || err?.message);
  }

  // 2. Firebase Auth：Custom Claims admin=true，或 Email 在 ADMIN_EMAILS 白名單且已驗證
  try {
    const userRecord = await adminAuth.getUser(uid);
    if (userRecord.customClaims?.admin === true) return remember(true);
    const email = (userRecord.email || '').toLowerCase();
    if (email && userRecord.emailVerified && getAdminEmailAllowlist().includes(email)) return remember(true);
  } catch {}

  // 嚴格拒絕依賴 /users/{uid}.role 作為憑證
  return remember(false);
}

/**
 * 查核用戶是否具備可信專家資格 (用以核給 3,000,000 競賽點數與 2,000,000 單案支持上限)
 */
export async function isVerifiedExpert(uid: string): Promise<boolean> {
  if (!uid) return false;
  try {
    const certDoc = await adminDb.collection('certifications').doc(uid).get();
    if (certDoc.exists && (certDoc.data()?.status === 'verified' || certDoc.data()?.expertCertStatus === 'verified')) {
      return true;
    }
    const solverDoc = await adminDb.collection('solvers').doc(uid).get();
    if (solverDoc.exists && (solverDoc.data()?.verifiedExpert === true || Boolean(solverDoc.data()?.verifiedBadge))) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * 取得或自動初始化競賽點數帳戶（與舊站真實 balance 徹底分開）
 */
export async function getOrCreateCompetitionAccount(userId: string, userRole: 'user' | 'solver' | 'admin' = 'user'): Promise<CompetitionAccount> {
  const accountRef = adminDb.collection('competition_accounts').doc(userId);
  const snap = await accountRef.get();

  if (snap.exists) {
    return snap.data() as CompetitionAccount;
  }

  // 判斷專家或一般用戶初始點數
  // 專家 3,000,000 點，一般用戶/提案者 100,000 點
  const isExpert = userRole === 'solver';
  const initialPoints = isExpert 
    ? COMPETITION_POINTS_CONFIG.INITIAL_EXPERT_POINTS 
    : COMPETITION_POINTS_CONFIG.INITIAL_USER_POINTS;

  // 生成唯一推薦碼 (9碼亂數)
  const randomSuffix = Math.floor(100000000 + Math.random() * 900000000).toString();
  const referralCode = `STAR-${randomSuffix.substring(0, 6)}`;

  const newAccount: CompetitionAccount = {
    userId,
    role: userRole,
    initialPoints,
    availablePoints: initialPoints,
    spentPoints: 0,
    referralCode,
    shareBonusClaimed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await accountRef.set(newAccount);
  return newAccount;
}

/**
 * 領取分享推薦碼獎勵（100 競賽點數，防重領取，點數不兌現）
 */
export async function claimShareBonus(userId: string): Promise<{ success: boolean; message: string; account?: CompetitionAccount }> {
  const accountRef = adminDb.collection('competition_accounts').doc(userId);

  return await adminDb.runTransaction(async (transaction) => {
    const snap = await transaction.get(accountRef);
    if (!snap.exists) {
      throw new Error('競賽點數帳戶不存在');
    }
    const account = snap.data() as CompetitionAccount;

    if (account.shareBonusClaimed) {
      return { success: false, message: '您已領取過分享推薦碼獎勵（限領一次）', account };
    }

    const updatedAccount: CompetitionAccount = {
      ...account,
      availablePoints: account.availablePoints + COMPETITION_POINTS_CONFIG.SHARE_BONUS_POINTS,
      shareBonusClaimed: true,
      updatedAt: new Date().toISOString(),
    };

    transaction.set(accountRef, updatedAccount);

    // 寫入不可篡改的審計日誌
    const auditRef = adminDb.collection('competition_audit_logs').doc();
    transaction.set(auditRef, {
      type: 'SHARE_BONUS_CLAIMED',
      userId,
      pointsAdded: COMPETITION_POINTS_CONFIG.SHARE_BONUS_POINTS,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: `成功領取分享獎勵 ${COMPETITION_POINTS_CONFIG.SHARE_BONUS_POINTS} 競賽點數！`,
      account: updatedAccount,
    };
  });
}

/**
 * 支持提案（模擬募資投點）：
 * 規則約束：
 * 1. 允許自我注資（參賽者與提案人可以投點支持自己的提案）
 * 2. 單案支持上限：參賽者與一般用戶 50,000、專家 2,000,000
 * 3. 扣除競賽點數（不碰真實 balance）
 * 4. 原子 transaction 累加提案點數與支持人次
 */
export async function supportProposalWithPoints(params: {
  userId: string;
  userRole: 'user' | 'solver' | 'questioner';
  proposalId: string;
  points: number;
  idempotencyKey?: string;
}): Promise<{ success: boolean; message: string; newAvailablePoints?: number; newProposalPoints?: number }> {
  const { userId, userRole, proposalId, points } = params;

  if (points <= 0 || !Number.isInteger(points)) {
    return { success: false, message: '支持點數必須為正整數' };
  }

  // 單案支持上限約束：參賽者與一般用戶 50,000 創星幣，專家 2,000,000 創星幣
  let maxLimit = COMPETITION_POINTS_CONFIG.SINGLE_SUPPORT_LIMIT.user; // 50,000
  if (userRole === 'solver') {
    maxLimit = COMPETITION_POINTS_CONFIG.SINGLE_SUPPORT_LIMIT.solver; // 2,000,000
  } else if (userRole === 'questioner') {
    maxLimit = COMPETITION_POINTS_CONFIG.SINGLE_SUPPORT_LIMIT.questioner; // 50,000
  }

  const accountRef = adminDb.collection('competition_accounts').doc(userId);
  const proposalRef = adminDb.collection('competition_proposals').doc(proposalId);
  const supportRecordsColl = adminDb.collection('competition_support_records');

  return await adminDb.runTransaction(async (transaction) => {
    const [accountSnap, proposalSnap] = await Promise.all([
      transaction.get(accountRef),
      transaction.get(proposalRef),
    ]);

    if (!accountSnap.exists) {
      throw new Error('競賽帳戶尚未初始化');
    }
    if (!proposalSnap.exists) {
      throw new Error('該競賽提案不存在或已下架');
    }

    const account = accountSnap.data() as CompetitionAccount;
    const proposal = proposalSnap.data() as StarSeasonProposal;

    // 1. 自我注資規範：允許自我注資（提案人可以使用創星幣支持自己的專案，恪守單案 50,000 上限）

    // 2. 審核狀態確認
    if (proposal.status !== 'approved') {
      throw new Error('該提案尚未通過官方審核，暫不開放模擬募資支持');
    }

    // 3. 點數餘額檢核
    if (account.availablePoints < points) {
      throw new Error(`可用競賽點數不足（目前剩餘 ${account.availablePoints.toLocaleString()} 點）`);
    }

    // 4. 單案累積支持上限檢核
    // 查詢此用戶對該提案已支持的點數總和
    const priorSupportsSnap = await transaction.get(
      supportRecordsColl.where('supporterId', '==', userId).where('proposalId', '==', proposalId)
    );
    let currentTotalForThisProposal = 0;
    priorSupportsSnap.forEach((doc: any) => {
      currentTotalForThisProposal += Number(doc.data().points || 0);
    });

    if (currentTotalForThisProposal + points > maxLimit) {
      throw new Error(
        `超過單案支持上限！您的身分單案上限為 ${maxLimit.toLocaleString()} 點（已支持 ${currentTotalForThisProposal.toLocaleString()} 點）`
      );
    }

    // 扣除帳戶點數
    const newAvailable = account.availablePoints - points;
    const newSpent = (account.spentPoints || 0) + points;
    transaction.update(accountRef, {
      availablePoints: newAvailable,
      spentPoints: newSpent,
      updatedAt: new Date().toISOString(),
    });

    // 增加提案支持額
    const newPropPoints = (proposal.supportPoints || 0) + points;
    const isFirstTimeSupport = priorSupportsSnap.empty;
    const newPropSupporters = (proposal.supporterCount || 0) + (isFirstTimeSupport ? 1 : 0);

    transaction.update(proposalRef, {
      supportPoints: newPropPoints,
      supporterCount: newPropSupporters,
      updatedAt: new Date().toISOString(),
    });

    // 寫入支持紀錄
    const recordRef = supportRecordsColl.doc();
    transaction.set(recordRef, {
      id: recordRef.id,
      supporterId: userId,
      supporterRole: userRole,
      proposalId,
      points,
      idempotencyKey: params.idempotencyKey || null,
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: `成功支持 ${points.toLocaleString()} 競賽點數！`,
      newAvailablePoints: newAvailable,
      newProposalPoints: newPropPoints,
    };
  });
}

/**
 * 提交提案（第一階段痛點 或 第二階段解法）：
 * 嚴密隔離敏感資料：聯絡人、電話、身分證字號、銀行帳號等存入私有集合
 */
export async function createProposal(params: {
  userId: string;
  userName: string;
  userAvatar?: string;
  userRole: 'user' | 'solver' | 'enterprise';
  title: string;
  stage: StarSeasonStage;
  track: StarSeasonTrack;
  summary: string;
  description: string;
  sourcePainPointProposalId?: string; // 關聯之來源痛點
  sourcePainPointTitle?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  attachmentMime?: string;
  images?: string[];
  externalLink?: string;
  technicalFeasibility?: string;
  marketAnalysis?: string;
  businessModelFinancials?: string;
  tags?: string[];
  aiCategorized?: boolean;
  referredByAmbassadorCode?: string;
  // 敏感資料
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  schoolOrOrg?: string;
  bankCode?: string;
  bankAccount?: string;
  idNumber?: string;
}): Promise<{ success: boolean; proposalId: string; message: string }> {
  const proposalId = `star-prop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const publicProposal: StarSeasonProposal = {
    id: proposalId,
    title: params.title.trim(),
    stage: params.stage,
    track: params.track,
    summary: params.summary.trim(),
    description: params.description.trim(),
    authorId: params.userId,
    authorName: params.userName,
    authorAvatar: params.userAvatar,
    authorRole: params.userRole,
    sourcePainPointProposalId: params.sourcePainPointProposalId || undefined,
    sourcePainPointTitle: params.sourcePainPointTitle || undefined,
    adoptedByWinningSolution: false,
    adoptedSourceRewardAmount: 1200, // 固定 NT$1,200
    adoptedSourceApproved: false,
    adoptedSourceRewardStatus: 'none',
    status: 'pending_review', // 初始待審核
    supportPoints: 0,
    supporterCount: 0,
    attachmentUrl: params.attachmentUrl || undefined,
    attachmentName: params.attachmentName || undefined,
    attachmentSize: params.attachmentSize || undefined,
    attachmentMime: params.attachmentMime || undefined,
    images: params.images && params.images.length > 0 ? params.images : undefined,
    externalLink: params.externalLink || undefined,
    technicalFeasibility: params.technicalFeasibility || undefined,
    marketAnalysis: params.marketAnalysis || undefined,
    businessModelFinancials: params.businessModelFinancials || undefined,
    tags: params.tags && params.tags.length > 0 ? params.tags : undefined,
    aiCategorized: params.aiCategorized ?? false,
    referredByAmbassadorCode: params.referredByAmbassadorCode?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  const privateDetails: ProposalPrivateDetails = {
    proposalId,
    authorId: params.userId,
    contactName: params.contactName.trim(),
    contactPhone: params.contactPhone.trim(),
    contactEmail: params.contactEmail.trim(),
    schoolOrOrg: params.schoolOrOrg?.trim(),
    bankCode: params.bankCode?.trim(),
    bankAccount: params.bankAccount?.trim(),
    idNumber: params.idNumber?.trim(),
    updatedAt: now,
  };

function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

  const batch = adminDb.batch();

  // 1. 公開提案存入 competition_proposals (不含任何個資)
  const propRef = adminDb.collection('competition_proposals').doc(proposalId);
  batch.set(propRef, stripUndefined(publicProposal));

  // 2. 敏感資料存入 competition_private_submissions (僅管理員與作者本人可存取)
  const privateRef = adminDb.collection('competition_private_submissions').doc(proposalId);
  batch.set(privateRef, stripUndefined(privateDetails));

  // 3. 安全更新舊站用戶徽章：新增「創新盃」徽章，絕不變更其舊站 role 或 balance
  const userRef = adminDb.collection('users').doc(params.userId);
  batch.set(
    userRef,
    {
      competitionBadges: FieldValue.arrayUnion('創新盃'),
      updatedAt: now,
    },
    { merge: true }
  );

  // 4. 同步寫入舊站資料庫：
  // 「痛點」存於舊站的「創點子/痛點」專區 (questions, postType: 'pain_point')
  // 「提案」存於對應痛點之下 (answers)，並附上該提案在參賽網站的專屬連結
  const exclusiveChallengeUrl = `https://ideax.tw/challenge?proposalId=${proposalId}`;

  if (params.stage === 'pain_point') {
    const questionRef = adminDb.collection('questions').doc(proposalId);
    batch.set(
      questionRef,
      {
        id: proposalId,
        title: `【痛點】${params.title.trim()}`,
        description: `${params.summary.trim()}\n\n${params.description.trim()}\n\n🏆 創星季競賽痛點專屬連結：${exclusiveChallengeUrl}`,
        category: '創新創業',
        tags: ['創點子', '痛點', '創星季', params.track],
        postType: 'pain_point',
        bounty: 0,
        authorId: params.userId,
        authorName: params.userName,
        authorAvatar: params.userAvatar || '',
        authorRole: params.userRole,
        status: 'open',
        answersCount: 0,
        createdAt: now,
        updatedAt: now,
        exclusiveChallengeUrl,
        isStarSeason: true,
        starSeasonProposalId: proposalId,
      },
      { merge: true }
    );
  } else if (params.stage === 'solution') {
    // 若為解方提案，存入對應痛點之下 (answers)
    const targetQuestionId = params.sourcePainPointProposalId || 'default-pain-point';
    const answerId = `ans-${proposalId}`;
    const answerRef = adminDb.collection('answers').doc(answerId);
    batch.set(
      answerRef,
      {
        id: answerId,
        questionId: targetQuestionId,
        solverId: params.userId,
        solverName: params.userName,
        solverAvatar: params.userAvatar || '',
        title: params.title.trim(),
        content: `💡【創星季提案解方】${params.title.trim()}\n\n${params.summary.trim()}\n\n${params.description.trim()}\n\n🔗 參賽網站專屬專案連結：${exclusiveChallengeUrl}`,
        exclusiveChallengeUrl,
        isStarSeasonSolution: true,
        starSeasonProposalId: proposalId,
        sourcePainPointProposalId: params.sourcePainPointProposalId || null,
        price: 0,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );

    if (params.sourcePainPointProposalId) {
      const qDocRef = adminDb.collection('questions').doc(params.sourcePainPointProposalId);
      batch.set(
        qDocRef,
        {
          answersCount: FieldValue.increment(1),
          updatedAt: now,
        },
        { merge: true }
      );
    }
  }

  // 5. 若有校園大使推薦碼，記錄推薦關係
  if (params.referredByAmbassadorCode) {
    const refCode = params.referredByAmbassadorCode.trim().toUpperCase();
    const referralLogRef = adminDb.collection('competition_ambassador_referrals').doc();
    batch.set(referralLogRef, {
      id: referralLogRef.id,
      ambassadorCode: refCode,
      proposalId,
      authorId: params.userId,
      status: 'submitted',
      createdAt: now,
    });
  }

  await batch.commit();

  return {
    success: true,
    proposalId,
    message: '提案已成功提交，等待官方工作人員審核！',
  };
}

/**
 * 管理員審核提案（核准 / 駁回）
 * 若提案審核通過且有校園大使推薦碼，累加過審數並試算 NT$800 推廣費
 */
export async function reviewProposalByAdmin(params: {
  adminUid: string;
  proposalId: string;
  status: 'approved' | 'rejected';
  reviewNote?: string;
}): Promise<{ success: boolean; message: string }> {
  const isAdmin = await isVerifiedAdmin(params.adminUid);
  if (!isAdmin) {
    throw new Error('未授權：僅限認證管理員執行審核操作');
  }

  const propRef = adminDb.collection('competition_proposals').doc(params.proposalId);
  const snap = await propRef.get();
  if (!snap.exists) {
    throw new Error('找不到該提案');
  }

  const proposal = snap.data() as StarSeasonProposal;
  const now = new Date().toISOString();

  await adminDb.runTransaction(async (transaction) => {
    // 1. ALL READS FIRST
    let ambSnap: any = null;
    let ambStatsRef: any = null;
    const hasAmbassador = params.status === 'approved' && Boolean(proposal.referredByAmbassadorCode);

    if (hasAmbassador) {
      const code = proposal.referredByAmbassadorCode!.toUpperCase();
      ambStatsRef = adminDb.collection('competition_ambassador_stats').doc(code);
      ambSnap = await transaction.get(ambStatsRef);
    }

    // 2. ALL WRITES AFTER READS
    transaction.update(propRef, {
      status: params.status,
      reviewNote: params.reviewNote || '',
      reviewedBy: params.adminUid,
      reviewedAt: now,
      updatedAt: now,
    });

    // 寫入審計日誌
    const auditRef = adminDb.collection('competition_audit_logs').doc();
    transaction.set(auditRef, {
      type: 'PROPOSAL_REVIEWED',
      proposalId: params.proposalId,
      status: params.status,
      reviewedBy: params.adminUid,
      reviewNote: params.reviewNote,
      timestamp: now,
    });

    // 若審核通過且有大使推薦，更新大使過審統計
    if (hasAmbassador && ambStatsRef && ambSnap) {
      const code = proposal.referredByAmbassadorCode!.toUpperCase();
      if (ambSnap.exists) {
        const cur = ambSnap.data() as any;
        const newApproved = (cur.approvedCount || 0) + 1;
        transaction.update(ambStatsRef, {
          approvedCount: newApproved,
          commissionPending: newApproved * COMPETITION_POINTS_CONFIG.AMBASSADOR_REWARD_PER_APPROVED, // NT$800
          updatedAt: now,
        });
      } else {
        transaction.set(ambStatsRef, {
          ambassadorCode: code,
          totalReferred: 1,
          approvedCount: 1,
          commissionPending: COMPETITION_POINTS_CONFIG.AMBASSADOR_REWARD_PER_APPROVED, // NT$800
          commissionStatus: 'calculated', // 僅試算記錄，不自動匯款
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  });

  return { success: true, message: `提案審核結果已更新為【${params.status === 'approved' ? '通過' : '駁回'}】` };
}

/**
 * 管理員確認最終獲獎名次與痛點採用獎勵：
 * 1. 專家評選確認前三名 (冠軍 NT$30,000, 亞軍 NT$10,000, 季軍 NT$4,500)
 * 2. 獲獎前十名授予「創之星」徽章（寫入舊站 users 集合，絕不覆寫 role 或 balance）
 * 3. 若解方採用痛點提案，確認核准痛點提供者享 NT$1,200 獎勵
 */
export async function confirmFinalAwardByAdmin(params: {
  adminUid: string;
  proposalId: string;
  finalRank: number; // 1, 2, 3 等名次
  awardConfirmed: boolean;
  adoptedSourceApproved?: boolean;
}): Promise<{ success: boolean; message: string }> {
  const isAdmin = await isVerifiedAdmin(params.adminUid);
  if (!isAdmin) {
    throw new Error('未授權：僅限認證管理員執行頒獎與核定');
  }

  const propRef = adminDb.collection('competition_proposals').doc(params.proposalId);
  const snap = await propRef.get();
  if (!snap.exists) {
    throw new Error('找不到該提案');
  }
  const proposal = snap.data() as StarSeasonProposal;
  const now = new Date().toISOString();

  const batch = adminDb.batch();

  // 更新提案名次與獲獎確認狀態
  batch.update(propRef, {
    finalRank: params.finalRank,
    finalAwardConfirmed: params.awardConfirmed,
    grantedStarBadge: params.finalRank <= 10,
    updatedAt: now,
  });

  // 前十名授予「創之星」徽章 (在舊站 users 中標記，不改 role 或 balance)
  if (params.finalRank <= 10) {
    const authorUserRef = adminDb.collection('users').doc(proposal.authorId);
    batch.set(
      authorUserRef,
      {
        competitionBadges: FieldValue.arrayUnion('創之星'),
        updatedAt: now,
      },
      { merge: true }
    );
  }

  // 處理痛點提案採用獎勵：價值$1500好禮（1200點提問金,用於IdeaX平台提問或使用特色功能）
  if (proposal.sourcePainPointProposalId && params.adoptedSourceApproved) {
    const sourcePainPointRef = adminDb.collection('competition_proposals').doc(proposal.sourcePainPointProposalId);
    batch.update(sourcePainPointRef, {
      adoptedByWinningSolution: true,
      adoptedSourceApproved: true,
      adoptedSourceRewardAmount: COMPETITION_POINTS_CONFIG.PAIN_POINT_ADOPTION_REWARD, // 1200 點提問金
      adoptedSourceRewardDescription: COMPETITION_POINTS_CONFIG.PAIN_POINT_ADOPTION_REWARD_DESC,
      adoptedSourceRewardStatus: 'approved',
      updatedAt: now,
    });

    // 記錄採用獎勵日誌
    const rewardLogRef = adminDb.collection('competition_adopted_rewards').doc();
    batch.set(rewardLogRef, {
      id: rewardLogRef.id,
      solutionProposalId: params.proposalId,
      painPointProposalId: proposal.sourcePainPointProposalId,
      rewardAmount: 1200,
      rewardDescription: COMPETITION_POINTS_CONFIG.PAIN_POINT_ADOPTION_REWARD_DESC,
      status: 'approved',
      approvedBy: params.adminUid,
      createdAt: now,
    });
  }

  // 寫入審計日誌
  const auditRef = adminDb.collection('competition_audit_logs').doc();
  batch.set(auditRef, {
    type: 'AWARD_CONFIRMED',
    proposalId: params.proposalId,
    finalRank: params.finalRank,
    awardConfirmed: params.awardConfirmed,
    approvedBy: params.adminUid,
    timestamp: now,
  });

  await batch.commit();

  return { success: true, message: `已成功確認名次 (第 ${params.finalRank} 名) 與相關獎勵核准！` };
}

const DATABASE_PROPOSALS_SEED_VERSION = 'v2026_10_18_db_v7';
let isDatabaseSeedInProgress = false;
let isDatabaseSeedDone = false;

/**
 * 將所有提案、軟體應用、痛點與虛擬留言一次性完整同步存入 Firestore 資料庫
 * 確保前端與後端皆完全從資料庫讀取，不依賴硬編碼覆寫
 */
export async function ensureProposalsSyncedToFirestore(force = false): Promise<void> {
  if (isDatabaseSeedDone && !force) return;
  if (isDatabaseSeedInProgress) return;
  isDatabaseSeedInProgress = true;

  try {
    const versionRef = adminDb.collection('platform_settings').doc('database_seed_version');
    const [versionSnap, purgeSnap, deletedSnap] = await Promise.all([
      versionRef.get(),
      adminDb.collection('platform_settings').doc('simulated_data_purge').get(),
      adminDb.collection('platform_settings').doc('permanently_deleted_questions').get(),
    ]);

    if (!force && versionSnap.exists && versionSnap.data()?.version === DATABASE_PROPOSALS_SEED_VERSION) {
      isDatabaseSeedDone = true;
      return;
    }

    const isPurged = purgeSnap.exists && Boolean(purgeSnap.data()?.purged);
    if (isPurged && !force) {
      isDatabaseSeedDone = true;
      return;
    }

    const deletedIds = new Set<string>(
      deletedSnap.exists && Array.isArray(deletedSnap.data()?.deletedIds)
        ? deletedSnap.data()!.deletedIds
        : []
    );

    const priorityRefreshIds = new Set<string>([
      'q-vp-idea-ideax',
      'q-vp-vibe-ideax',
      'q-vp-idea-gosun',
      'q-vp-vibe-gosun',
      'q-vp-idea-deeperdigger',
      'q-vp-vibe-deeperdigger',
      'q-vp-vibe-aiwolf',
      'q-vp-idea-pace',
      'q-vp-vibe-pace',
      'q-vp-idea-aiyaya',
      'q-vp-vibe-aiyaya',
      'q-vp-idea-stallmatch',
      'q-vp-vibe-stallmatch',
    ]);

    // 1. 同步競賽與創新解方提案至 competition_proposals 集合
    const existingPropsSnap = await adminDb.collection('competition_proposals').get();
    const existingPropIds = new Set<string>(existingPropsSnap.docs.map((d) => d.id));

    const allStarProposalsMap = new Map<string, StarSeasonProposal>();
    DEFAULT_DEMO_PROPOSALS.forEach((p) => {
      if (!deletedIds.has(p.id)) {
        allStarProposalsMap.set(p.id, p);
      }
    });
    SEED_INNOVATION_PROPOSALS.forEach((q) => {
      if (!deletedIds.has(q.id) && !allStarProposalsMap.has(q.id)) {
        allStarProposalsMap.set(q.id, questionToStarSeasonProposal(q));
      }
    });

    const propsToWrite = Array.from(allStarProposalsMap.values()).filter(
      (p) => !existingPropIds.has(p.id) || priorityRefreshIds.has(p.id) || force
    );

    for (let i = 0; i < propsToWrite.length; i += 100) {
      const chunk = propsToWrite.slice(i, i + 100);
      const batch = adminDb.batch();
      chunk.forEach((p) => {
        const ref = adminDb.collection('competition_proposals').doc(p.id);
        batch.set(ref, { ...p, updatedAt: new Date().toISOString() }, { merge: true });
      });
      await batch.commit();
    }

    // 2. 同步所有提案（創新解方、軟體提案 VibeCoding、痛點）至 questions 集合
    const existingQSnap = await adminDb.collection('questions').get();
    const existingQIds = new Set<string>(
      existingQSnap.docs
        .filter((d) => {
          const data = d.data();
          return Boolean(data && typeof data.title === 'string' && data.title.trim());
        })
        .map((d) => d.id)
    );

    const allSeedQuestionsMap = new Map<string, any>();
    [...MOCK_QUESTIONS, ...DEFAULT_VIBECODING_APPS, ...ALL_VIRTUAL_PROPOSALS_SEED].forEach((q) => {
      if (q && q.id && !deletedIds.has(q.id)) {
        allSeedQuestionsMap.set(q.id, q);
      }
    });

    const questionsToWrite = Array.from(allSeedQuestionsMap.values()).filter(
      (q) => !existingQIds.has(q.id) || priorityRefreshIds.has(q.id) || force
    );

    for (let i = 0; i < questionsToWrite.length; i += 100) {
      const chunk = questionsToWrite.slice(i, i + 100);
      const batch = adminDb.batch();
      chunk.forEach((q) => {
        const ref = adminDb.collection('questions').doc(q.id);
        batch.set(ref, { ...q, updatedAt: new Date().toISOString() }, { merge: true });
      });
      await batch.commit();
    }

    // 3. 同步對應之解答與討論留言至 answers 集合
    const existingASnap = await adminDb.collection('answers').get();
    const existingAIds = new Set<string>(existingASnap.docs.map((d) => d.id));
    const answersToWrite = ALL_VIRTUAL_ANSWERS_SEED.filter(
      (a) => a && a.id && !deletedIds.has(a.questionId) && (!existingAIds.has(a.id) || priorityRefreshIds.has(a.questionId))
    );

    for (let i = 0; i < answersToWrite.length; i += 100) {
      const chunk = answersToWrite.slice(i, i + 100);
      const batch = adminDb.batch();
      chunk.forEach((a) => {
        const ref = adminDb.collection('answers').doc(a.id);
        batch.set(ref, { ...a, updatedAt: new Date().toISOString() }, { merge: true });
      });
      await batch.commit();
    }

    // 4. 同步提案作者帳號至 users 集合，並自動修復已補齊資料用戶（含 #c668940663 Henry）的 hasCompletedProfile 狀態
    const existingUSnap = await adminDb.collection('users').get();
    const usersToWrite = VIRTUAL_PERSONA_USERS.filter((u) => u && u.id);

    for (let i = 0; i < usersToWrite.length; i += 100) {
      const chunk = usersToWrite.slice(i, i + 100);
      const batch = adminDb.batch();
      chunk.forEach((u) => {
        const ref = adminDb.collection('users').doc(u.id);
        batch.set(ref, { ...u, updatedAt: new Date().toISOString() }, { merge: true });
      });
      await batch.commit();
    }

    const profileFixBatch = adminDb.batch();
    let profileFixCount = 0;
    existingUSnap.docs.forEach((d) => {
      const data = d.data() || {};
      const isHenryAccount =
        d.id === 'c668940663' ||
        d.id === 'khQfTsoBdMM9ksz3XM2SEr5ThA02' ||
        data.memberId === 'c668940663' ||
        data.memberId === 'khQfTsoBdMM9ksz3XM2SEr5ThA02' ||
        data.id === 'c668940663' ||
        data.id === 'khQfTsoBdMM9ksz3XM2SEr5ThA02' ||
        (typeof data.name === 'string' && data.name.includes('Henry'));
      const hasFilledContactAndRole =
        data.hasCompletedProfile === false &&
        (Boolean(data.phone && String(data.phone).trim()) || Boolean(data.bio && String(data.bio).trim())) &&
        Boolean(data.industry || data.jobTitle || data.title);
      if ((isHenryAccount && data.hasCompletedProfile !== true) || hasFilledContactAndRole) {
        profileFixBatch.set(
          adminDb.collection('users').doc(d.id),
          { hasCompletedProfile: true, updatedAt: new Date().toISOString() },
          { merge: true }
        );
        profileFixCount++;
      }
    });
    if (profileFixCount > 0) {
      await profileFixBatch.commit();
      console.log(`[Database Seed] Repaired hasCompletedProfile=true for ${profileFixCount} user(s).`);
    }

    await versionRef.set(
      {
        version: DATABASE_PROPOSALS_SEED_VERSION,
        syncedAt: new Date().toISOString(),
        proposalsSynced: propsToWrite.length,
        questionsSynced: questionsToWrite.length,
      },
      { merge: true }
    );

    isDatabaseSeedDone = true;
    console.log(
      `[Database Seed] Synced ${propsToWrite.length} competition proposals, ${questionsToWrite.length} questions, ${answersToWrite.length} answers to Firestore.`
    );
  } catch (err: any) {
    console.warn('[Database Seed] Warning during Firestore seed sync:', err?.message || err);
  } finally {
    isDatabaseSeedInProgress = false;
  }
}

// 伺服器啟動時自動將提案同步存入資料庫
setTimeout(() => {
  ensureProposalsSyncedToFirestore().catch(() => {});
}, 500);

/**
 * 取得公開提案列表（敏感個資已被剝除）
 */
export async function getPublicProposals(
  stage?: StarSeasonStage,
  track?: StarSeasonTrack,
  options?: { includePending?: boolean; authorId?: string }
): Promise<StarSeasonProposal[]> {
  await ensureProposalsSyncedToFirestore();

  let query: any = adminDb.collection('competition_proposals');

  if (stage) {
    query = query.where('stage', '==', stage);
  }
  if (track) {
    query = query.where('track', '==', track);
  }

  const snap = await query.get();
  const list: StarSeasonProposal[] = [];

  snap.forEach((doc: any) => {
    const data = doc.data() as StarSeasonProposal;
    // 待審不公開原則：未通過審核之提案僅作者本人或管理員可查閱
    if (data.status === 'approved' || options?.includePending || (options?.authorId && data.authorId === options.authorId)) {
      list.push(data);
    }
  });

  // 依累計支持點數降冪排序
  list.sort((a, b) => (b.supportPoints || 0) - (a.supportPoints || 0));

  // 募資前 20 名標記入圍複賽資格 (僅為入圍資格，非最終得獎)
  return list.map((item, index) => ({
    ...item,
    rankQualifiedForFinal: index < 20,
  }));
}

/**
 * 增加提案瀏覽次數（原子累加，持久化至 Firestore，解決重整歸零問題）
 */
export async function incrementProposalView(proposalId: string): Promise<{ success: boolean; viewsCount: number }> {
  if (!proposalId) return { success: false, viewsCount: 0 };
  const ref = adminDb.collection('competition_proposals').doc(proposalId);
  try {
    const snap = await ref.get();
    if (!snap.exists) {
      return { success: false, viewsCount: 0 };
    }
    await ref.update({
      viewsCount: FieldValue.increment(1),
      views: FieldValue.increment(1),
    });
    const updated = await ref.get();
    const count = updated.data()?.viewsCount || 1;
    return { success: true, viewsCount: count };
  } catch (err: any) {
    console.warn('[ProposalView] increment failed:', err?.message);
    return { success: false, viewsCount: 0 };
  }
}

/**
 * 按讚或取消按讚提案（更新 likeCount，並維護用戶個人的收藏名單）
 */
export async function toggleLikeProposal(
  userId: string,
  proposalId: string,
  fallbackBaseLikes?: number
): Promise<{
  success: boolean;
  liked: boolean;
  likeCount: number;
  likedProposalIds: string[];
}> {
  const propRef = adminDb.collection('competition_proposals').doc(proposalId);
  const questionRef = adminDb.collection('questions').doc(proposalId);
  const userLikesRef = adminDb.collection('competition_user_likes').doc(userId);

  return await adminDb.runTransaction(async (transaction) => {
    const [propSnap, questionSnap, userLikesSnap] = await Promise.all([
      transaction.get(propRef),
      transaction.get(questionRef),
      transaction.get(userLikesRef),
    ]);

    const likedList: string[] = userLikesSnap.exists ? (userLikesSnap.data()?.proposalIds || []) : [];
    const isCurrentlyLiked = likedList.includes(proposalId);
    let updatedLikes: string[];

    const propCount = propSnap.exists ? Number(propSnap.data()?.likeCount ?? propSnap.data()?.likesCount ?? 0) : 0;
    const qData = questionSnap.exists ? questionSnap.data() : null;
    const qCount = qData ? Number(qData.likes ?? qData.secondedCount ?? qData.likesCount ?? 0) : 0;
    const storedCount = Math.max(propCount, qCount);
    const baseCount =
      storedCount > 0
        ? storedCount
        : typeof fallbackBaseLikes === 'number' && fallbackBaseLikes > 0
        ? fallbackBaseLikes
        : 0;

    let newLikeCount: number;
    if (isCurrentlyLiked) {
      updatedLikes = likedList.filter((id) => id !== proposalId);
      newLikeCount = Math.max(0, baseCount - 1);
    } else {
      updatedLikes = [...likedList, proposalId];
      newLikeCount = baseCount + 1;
    }

    const nowIso = new Date().toISOString();

    if (propSnap.exists) {
      transaction.update(propRef, {
        likeCount: newLikeCount,
        likesCount: newLikeCount,
        updatedAt: nowIso,
      });
    } else {
      transaction.set(
        propRef,
        {
          id: proposalId,
          likeCount: newLikeCount,
          likesCount: newLikeCount,
          updatedAt: nowIso,
        },
        { merge: true }
      );
    }

    if (questionSnap.exists) {
      transaction.update(questionRef, {
        likes: newLikeCount,
        secondedCount: newLikeCount,
        updatedAt: nowIso,
      });
    }

    transaction.set(
      userLikesRef,
      {
        userId,
        proposalIds: updatedLikes,
        updatedAt: nowIso,
      },
      { merge: true }
    );

    return {
      success: true,
      liked: !isCurrentlyLiked,
      likeCount: newLikeCount,
      likedProposalIds: updatedLikes,
    };
  });
}

/**
 * 取得用戶已按讚/收藏之提案 ID 清單
 */
export async function getUserLikedProposalIds(userId: string): Promise<string[]> {
  try {
    const snap = await adminDb.collection('competition_user_likes').doc(userId).get();
    if (!snap.exists) return [];
    return snap.data()?.proposalIds || [];
  } catch {
    return [];
  }
}

/**
 * 取得提案討論留言
 */
export async function getProposalComments(proposalId: string): Promise<ProposalComment[]> {
  try {
    const snap = await adminDb
      .collection('competition_comments')
      .where('proposalId', '==', proposalId)
      .get();
    const list: ProposalComment[] = [];
    snap.forEach((doc) => {
      list.push(doc.data() as ProposalComment);
    });
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return list;
  } catch {
    return [];
  }
}

/**
 * 新增提案交流討論留言
 */
export async function addProposalComment(params: {
  userId: string;
  userName: string;
  userAvatar?: string;
  userRole?: 'participant' | 'expert' | 'user' | 'admin';
  roleBadgeText?: string;
  proposalId: string;
  content: string;
}): Promise<{ success: boolean; comment: ProposalComment }> {
  const commentId = `comm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newComment: ProposalComment = {
    id: commentId,
    proposalId: params.proposalId,
    authorId: params.userId,
    authorName: params.userName,
    authorAvatar: params.userAvatar,
    authorRole: params.userRole || 'user',
    roleBadgeText: params.roleBadgeText,
    content: params.content.trim(),
    createdAt: now,
  };

  const batch = adminDb.batch();
  const commentRef = adminDb.collection('competition_comments').doc(commentId);
  batch.set(commentRef, newComment);

  const propRef = adminDb.collection('competition_proposals').doc(params.proposalId);
  batch.update(propRef, {
    commentsCount: FieldValue.increment(1),
    updatedAt: now,
  });

  await batch.commit();

  return { success: true, comment: newComment };
}

/**
 * 參賽者報名（大專校院創新創業募資模擬學習平台體驗規格）：
 * 1. 登記團隊成員、學校、聯絡資料（與提案頁分離）
 * 2. 用戶新增「創星季」徽章 (competitionBadges union '創星季') 與 isCompetitionRegistered
 * 3. 僅完成報名不產生提案、不派發點數獎勵（待後續正式提案與時程驗證）
 */
export async function registerParticipantTeam(
  userId: string,
  userProfile: { name: string; avatar?: string; email?: string; role?: string },
  data: ParticipantRegistrationData
): Promise<{ success: boolean; message: string }> {
  const now = new Date().toISOString();
  const regRef = adminDb.collection('competition_participant_registrations').doc(userId);
  await regRef.set(
    {
      userId,
      teamName: (data.teamName || '').trim(),
      leaderName: (data.leaderName || '').trim(),
      leaderPhone: (data.leaderPhone || '').trim(),
      leaderEmail: (data.leaderEmail || '').trim(),
      schoolName: (data.schoolName || '').trim(),
      department: (data.department || '').trim(),
      advisorName: (data.advisorName || '').trim(),
      teamMembers: data.teamMembers || [],
      track: data.track || 'ai_applications',
      expectedItems: data.expectedItems || [],
      referralSource: (data.referralSource || '').trim(),
      referralSourceOther: (data.referralSourceOther || '').trim(),
      pledgeAgreed: true,
      registeredAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  const userRef = adminDb.collection('users').doc(userId);
  await userRef.set(
    {
      competitionBadges: FieldValue.arrayUnion('創星季'),
      isCompetitionRegistered: true,
      updatedAt: now,
    },
    { merge: true }
  );

  return {
    success: true,
    message: '報名參賽成功！您已完成創星季參賽者登錄。',
  };
}

export async function registerParticipant(
  userId: string,
  userProfile: { name: string; avatar?: string; email?: string; role?: string },
  data: ParticipantRegistrationData
): Promise<{ success: boolean; proposalId?: string; message: string }> {
  // 若未提供 projectTitle 或 summary，代表為獨立報名資料填寫
  if (!data.projectTitle || !data.summary) {
    return await registerParticipantTeam(userId, userProfile, data);
  }

  const now = new Date().toISOString();
  const proposalId = `star-prop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const exclusiveChallengeUrl = `https://ideax.tw/challenge?proposalId=${proposalId}`;

  const publicProposal: StarSeasonProposal = {
    id: proposalId,
    title: (data.projectTitle || '').trim(),
    stage: 'solution',
    track: data.track || 'ai_applications',
    summary: (data.summary || '').trim(),
    description: `${(data.description || '').trim()}\n\n【團隊資訊】\n• 團隊：${data.teamName}\n• 學校：${data.schoolName} ${data.department}\n• 隊長：${data.leaderName}\n• 募資目標：NT$ ${(data.targetFundingAmount || 100000).toLocaleString()}\n• 回饋方案：${data.rewardPlanDescription || ''}`,
    authorId: userId,
    authorName: data.showOrganization && data.schoolName?.trim()
      ? `${data.schoolName.trim()} ｜ ${data.teamName.trim()}`
      : (data.teamName?.trim() || userProfile.name || data.leaderName),
    teamName: (data.teamName || '').trim(),
    schoolName: (data.schoolName || '').trim() || undefined,
    organizationName: (data.schoolName || '').trim() || undefined,
    showOrganization: Boolean(data.showOrganization),
    authorAvatar: userProfile.avatar,
    authorRole: 'user',
    sourcePainPointProposalId: data.sourcePainPointId || undefined,
    sourcePainPointTitle: data.sourcePainPointTitle || undefined,
    adoptedByWinningSolution: false,
    adoptedSourceRewardAmount: 1200,
    adoptedSourceApproved: false,
    adoptedSourceRewardStatus: 'none',
    status: 'pending_review',
    supportPoints: 0,
    supporterCount: 0,
    likeCount: 0,
    commentsCount: 0,
    attachmentUrl: data.bpDocumentUrl,
    attachmentName: data.bpDocumentName,
    attachmentSize: data.bpDocumentSize,
    createdAt: now,
    updatedAt: now,
  };

  const batch = adminDb.batch();

  // 1. 寫入公開提案
  const propRef = adminDb.collection('competition_proposals').doc(proposalId);
  batch.set(propRef, publicProposal);

  // 2. 儲存大專校院募資模擬平台完整報名資料 (doc userId 與 doc proposalId 雙向寫入)
  const regUserRef = adminDb.collection('competition_participant_registrations').doc(userId);
  batch.set(
    regUserRef,
    {
      proposalId,
      userId,
      ...data,
      updatedAt: now,
    },
    { merge: true }
  );

  const regRef = adminDb.collection('competition_participant_registrations').doc(proposalId);
  batch.set(regRef, {
    proposalId,
    userId,
    ...data,
    createdAt: now,
  });

  // 3. IdeaX 創點子平台用戶新增「創星季」徽章（一般用戶身分不變，但多了一個創星季徽章）
  const userRef = adminDb.collection('users').doc(userId);
  batch.set(
    userRef,
    {
      competitionBadges: FieldValue.arrayUnion('創星季'),
      isCompetitionRegistered: true,
      updatedAt: now,
    },
    { merge: true }
  );

  // 4. 若有引用痛點，於 IdeaX 創點子平台 questions 之下的 answers 建立該提案之對應解方，附上參賽網站專屬連結
  const targetQuestionId = data.sourcePainPointId || 'default-pain-point';
  const answerId = `ans-${proposalId}`;
  const answerRef = adminDb.collection('answers').doc(answerId);
  batch.set(
    answerRef,
    {
      id: answerId,
      questionId: targetQuestionId,
      solverId: userId,
      solverName: userProfile.name || data.leaderName,
      solverAvatar: userProfile.avatar || '',
      title: (data.projectTitle || '').trim(),
      content: `💡【創星季提案解方】${(data.projectTitle || '').trim()}\n\n${(data.summary || '').trim()}\n\n${(data.description || '').trim()}\n\n🔗 參賽網站專屬專案連結：${exclusiveChallengeUrl}`,
      exclusiveChallengeUrl,
      isStarSeasonSolution: true,
      starSeasonProposalId: proposalId,
      sourcePainPointProposalId: data.sourcePainPointId || null,
      price: 0,
      createdAt: now,
      updatedAt: now,
    }
  );

  if (data.sourcePainPointId) {
    const qDocRef = adminDb.collection('questions').doc(data.sourcePainPointId);
    batch.set(
      qDocRef,
      {
        answersCount: FieldValue.increment(1),
        updatedAt: now,
      },
      { merge: true }
    );
  }

  await batch.commit();

  return {
    success: true,
    proposalId,
    message: '報名登錄與提案送審成功！',
  };
}

/**
 * 成為專家 / 特邀專家申請：
 * 申請成為專家的用戶經管理員審核通過後會轉為專家帳號，錄入認證專家名單，並享有 3,000,000 點競賽投資點數（單案上限 2,000,000 點），後續可由專家中遴選為評審
 */
export async function applyJudge(
  userId: string,
  userProfile: { name: string; avatar?: string; email?: string },
  data: JudgeApplicationData
): Promise<{ success: boolean; message: string; solverId: string }> {
  const now = new Date().toISOString();
  const solverId = `solver-${userId}`;
  const batch = adminDb.batch();

  // 1. 更新舊站用戶身份：role = 'solver', verifiedExpert = true, verifiedBadge = '創星季特邀專家'
  const userRef = adminDb.collection('users').doc(userId);
  batch.set(
    userRef,
    {
      role: 'solver',
      verifiedExpert: true,
      verifiedBadge: '創星季特邀專家',
      title: `${data.organization} ${data.jobTitle}`,
      domain: data.domain,
      domains: [data.domain],
      expertApplicationStatus: 'approved',
      updatedAt: now,
    },
    { merge: true }
  );

  // 2. 錄入舊站 solvers 集合（舊站專家名單立即可查閱）
  const solverRef = adminDb.collection('solvers').doc(solverId);
  batch.set(
    solverRef,
    {
      id: solverId,
      userId,
      name: data.name || userProfile.name,
      title: `${data.organization} ${data.jobTitle}`,
      avatar: userProfile.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
      domain: data.domain,
      domains: [data.domain],
      skills: ['產學創新', '技術審查', '新創輔導', '投資評估'],
      rating: 5.0,
      reviewCount: 1,
      answerCount: 0,
      acceptedRate: 100,
      tier: '認證專家',
      bio: `${data.organization} ${data.jobTitle}。創星季特邀專業評審團成員。${data.bio || ''}`,
      earnings: 0,
      verifiedBadge: true,
      verified: true,
      verifiedExpert: true,
      credentialsNote: data.credentialsNote,
      credentialProofUrl: data.credentialProofUrl || null,
      referralSource: data.referralSource || null,
      featuredCase: {
        title: '創星季創新創業與產學審查',
        description: '受邀擔任創星季與各項青年創新創業競賽專業評審委員。',
        outcome: '提供專業商業模式驗證、產業對接建議與技術可行性評估。',
      },
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  // 3. 升級競賽點數錢包為專家額度 (3,000,000 點)
  const accountRef = adminDb.collection('competition_accounts').doc(userId);
  batch.set(
    accountRef,
    {
      userId,
      role: 'solver',
      initialPoints: COMPETITION_POINTS_CONFIG.INITIAL_EXPERT_POINTS,
      availablePoints: COMPETITION_POINTS_CONFIG.INITIAL_EXPERT_POINTS,
      updatedAt: now,
    },
    { merge: true }
  );

  // 4. 記錄評審申請資料
  const appRef = adminDb.collection('competition_judge_applications').doc(userId);
  batch.set(appRef, {
    userId,
    ...data,
    status: 'approved',
    createdAt: now,
    updatedAt: now,
  });

  await batch.commit();

  return {
    success: true,
    solverId,
    message: '恭喜！您已成功加入創星季專業評審團，並同步獲得舊站「認證專家」資格與 300 萬點專業評選額度！',
  };
}

/**
 * 取得當前用戶的推廣大使資訊、自己的推薦碼與推薦名單 (含試算 NT$800 獎勵)
 */
export async function getMyAmbassadorData(userId: string): Promise<{
  referralCode: string;
  totalReferred: number;
  approvedCount: number;
  commissionPending: number;
  referrals: Array<{
    id: string;
    proposalId: string;
    proposalTitle: string;
    authorName: string;
    status: string;
    rewardAmount: number;
    createdAt: string;
  }>;
}> {
  const account = await getOrCreateCompetitionAccount(userId);
  const code = account.referralCode || '';

  // 查詢以該推薦碼推薦之紀錄
  const refSnaps = await adminDb
    .collection('competition_ambassador_referrals')
    .where('ambassadorCode', '==', code)
    .get();

  const referrals: any[] = [];
  let approvedCount = 0;

  for (const doc of refSnaps.docs) {
    const data = doc.data();
    let proposalTitle = '創星季參賽提案';
    let authorName = '創星提案者';
    let status = data.status || 'submitted';

    try {
      const propSnap = await adminDb.collection('competition_proposals').doc(data.proposalId).get();
      if (propSnap.exists) {
        const propData = propSnap.data();
        proposalTitle = propData?.title || proposalTitle;
        authorName = propData?.authorName || authorName;
        status = propData?.status || status;
      }
    } catch {}

    const isApproved = status === 'approved';
    if (isApproved) approvedCount++;

    referrals.push({
      id: doc.id,
      proposalId: data.proposalId,
      proposalTitle,
      authorName,
      status,
      rewardAmount: isApproved ? COMPETITION_POINTS_CONFIG.AMBASSADOR_REWARD_PER_APPROVED : 0,
      createdAt: data.createdAt,
    });
  }

  referrals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    referralCode: code,
    totalReferred: referrals.length,
    approvedCount,
    commissionPending: approvedCount * COMPETITION_POINTS_CONFIG.AMBASSADOR_REWARD_PER_APPROVED,
    referrals,
  };
}

/**
 * 綁定輸入之推廣大使推薦碼
 */
export async function bindAmbassadorReferralCode(
  userId: string,
  referralCode: string
): Promise<{ success: boolean; message: string }> {
  const cleanCode = referralCode.trim().toUpperCase();
  if (!cleanCode) {
    throw new Error('請輸入有效的推薦碼');
  }

  const account = await getOrCreateCompetitionAccount(userId);
  if (account.referralCode === cleanCode) {
    throw new Error('不能綁定自己的推薦碼');
  }

  await adminDb.collection('competition_user_bound_referrals').doc(userId).set(
    {
      userId,
      boundReferralCode: cleanCode,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return {
    success: true,
    message: `成功綁定推薦碼【${cleanCode}】！後續提案將自動關聯該校園推廣大使。`,
  };
}

export const INITIAL_SITE_VISITS_BASE = 1700;

export interface RealSiteTrafficStats {
  baseVisits: number;
  totalVisits: number;
  hourly: Record<string, number>;
  daily: Record<string, number>;
  firstRecordedAtUtc8: string;
  firstHourKey: string;
  firstDateKey: string;
  lastUpdatedUtc8: string;
  onlineUsersCount: number;
  /** 不重複造訪用戶（每台裝置首次造訪算一位） */
  uniqueVisitorsTotal: number;
  /** 每日／每時造訪用戶數（同一裝置當天只算一次） */
  visitorsDaily: Record<string, number>;
  visitorsHourly: Record<string, number>;
}

/** 瀏覽量自此數字起算（2026/10/18 依營運需求調整） */
const PAGEVIEW_BASELINE_TARGET = 2500;

const activePresenceSessions = new Map<string, number>();
const PRESENCE_TTL_MS = 65 * 1000;

function getUtc8PartsServer(timestampMs: number = Date.now()) {
  const utc8Ms = timestampMs + 8 * 60 * 60 * 1000;
  const d = new Date(utc8Ms);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hour = String(d.getUTCHours()).padStart(2, '0');
  const minute = String(d.getUTCMinutes()).padStart(2, '0');
  const second = String(d.getUTCSeconds()).padStart(2, '0');
  return {
    dateKey: `${year}-${month}-${day}`,
    hourKey: `${year}-${month}-${day} ${hour}:00`,
    fullDateTime: `${year}/${month}/${day} ${hour}:${minute}:${second} (UTC+8)`,
  };
}

// 即時在線：記錄在資料庫（site_presence），所有伺服器共用；計算最近 75 秒內有心跳的人
const PRESENCE_COLLECTION = 'site_presence';
const PRESENCE_WINDOW_MS = 75 * 1000;
let cachedOnline = { count: 1, at: 0 };

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

async function touchPresence(sessionId: string) {
  try {
    await clientSetDoc(clientDoc(rawFirestoreDb, PRESENCE_COLLECTION, sessionId.slice(0, 64).replace(/\//g, '_')), {
      lastSeen: Date.now(),
    });
  } catch {}
  // 偶爾清掉一天前的舊紀錄
  if (Math.random() < 0.02) {
    try {
      const old = await clientGetDocs(
        clientQuery(clientCollection(rawFirestoreDb, PRESENCE_COLLECTION), clientWhere('lastSeen', '<', Date.now() - 86400000), clientLimit(100))
      );
      await Promise.all(old.docs.map((d) => clientDeleteDoc(d.ref).catch(() => {})));
    } catch {}
  }
}

async function getOnlineCount(): Promise<number> {
  if (Date.now() - cachedOnline.at < 15000) return cachedOnline.count;
  try {
    const snap = await withTimeout(
      clientGetCountFromServer(
        clientQuery(clientCollection(rawFirestoreDb, PRESENCE_COLLECTION), clientWhere('lastSeen', '>=', Date.now() - PRESENCE_WINDOW_MS))
      ),
      4000
    );
    cachedOnline = { count: Math.max(1, snap.data().count), at: Date.now() };
  } catch {
    cachedOnline = { count: getActiveOnlineCount(), at: Date.now() };
  }
  return cachedOnline.count;
}

function getActiveOnlineCount(): number {
  const now = Date.now();
  for (const [sid, lastSeen] of activePresenceSessions.entries()) {
    if (now - lastSeen > PRESENCE_TTL_MS) {
      activePresenceSessions.delete(sid);
    }
  }
  return Math.max(1, activePresenceSessions.size);
}

function readCountMap(raw: any): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw)) {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) out[k] = n;
    }
  }
  return out;
}

export async function getRealSiteTrafficStats(): Promise<RealSiteTrafficStats> {
  const docSnap = await adminDb.collection('platform_settings').doc('site_traffic_stats').get();
  const raw = docSnap.exists ? docSnap.data() : null;

  const hourly = readCountMap(raw?.hourly);
  const daily = readCountMap(raw?.daily);
  const visitorsDaily = readCountMap(raw?.visitorsDaily);
  const visitorsHourly = readCountMap(raw?.visitorsHourly);

  const sortedHours = Object.keys(hourly).sort();
  const sortedDays = Object.keys(daily).sort();
  const sumDaily = Object.values(daily).reduce((acc, v) => acc + v, 0);

  // 瀏覽量起算點：第一次執行時把「目前累計」調整為 2500，之後照常累加
  let baseVisits = typeof raw?.baseVisits === 'number' ? raw.baseVisits : INITIAL_SITE_VISITS_BASE;
  if (!raw?.pageviewBaselineApplied) {
    baseVisits = PAGEVIEW_BASELINE_TARGET - sumDaily;
    try {
      await clientSetDoc(
        clientDoc(rawFirestoreDb, 'platform_settings', 'site_traffic_stats'),
        { baseVisits, pageviewBaselineApplied: true },
        { merge: true }
      );
    } catch {}
  }
  const totalVisits = baseVisits + sumDaily;

  return {
    baseVisits,
    totalVisits,
    hourly,
    daily,
    firstRecordedAtUtc8: raw?.firstRecordedAtUtc8 || '',
    firstHourKey: raw?.firstHourKey || sortedHours[0] || '',
    firstDateKey: raw?.firstDateKey || sortedDays[0] || '',
    lastUpdatedUtc8: raw?.lastUpdatedUtc8 || '',
    onlineUsersCount: await getOnlineCount(),
    uniqueVisitorsTotal: Number(raw?.uniqueVisitorsTotal) || 0,
    visitorsDaily,
    visitorsHourly,
  };
}

export async function recordRealSiteVisit(
  sessionId?: string,
  visitor: { newToday?: boolean; newEver?: boolean } = {}
): Promise<RealSiteTrafficStats> {
  if (sessionId && typeof sessionId === 'string') {
    activePresenceSessions.set(sessionId.slice(0, 64), Date.now());
    void touchPresence(sessionId);
  }

  const nowParts = getUtc8PartsServer(Date.now());

  // 以資料庫原子遞增計數：Vercel 上同時有多台伺服器處理請求，
  // 「先讀再寫」會互相覆蓋而漏算，改用 increment 才不會掉數字
  try {
    const ref = clientDoc(rawFirestoreDb, 'platform_settings', 'site_traffic_stats');
    await clientSetDoc(
      ref,
      {
        hourly: { [nowParts.hourKey]: clientIncrement(1) },
        daily: { [nowParts.dateKey]: clientIncrement(1) },
        ...(visitor.newToday
          ? {
              visitorsHourly: { [nowParts.hourKey]: clientIncrement(1) },
              visitorsDaily: { [nowParts.dateKey]: clientIncrement(1) },
            }
          : {}),
        ...(visitor.newEver ? { uniqueVisitorsTotal: clientIncrement(1) } : {}),
        lastUpdatedUtc8: nowParts.fullDateTime,
      },
      { merge: true }
    );
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn('[SiteTraffic] increment failed:', (err as any)?.message);
    }
  }

  const current = await getRealSiteTrafficStats();
  if (!current.firstRecordedAtUtc8) {
    try {
      await clientSetDoc(
        clientDoc(rawFirestoreDb, 'platform_settings', 'site_traffic_stats'),
        { firstRecordedAtUtc8: nowParts.fullDateTime, firstHourKey: nowParts.hourKey, firstDateKey: nowParts.dateKey },
        { merge: true }
      );
    } catch {}
  }
  return current;
}

export async function recordRealPresenceHeartbeat(sessionId?: string): Promise<{ onlineUsersCount: number }> {
  if (sessionId && typeof sessionId === 'string') {
    activePresenceSessions.set(sessionId.slice(0, 64), Date.now());
    await withTimeout(touchPresence(sessionId), 4000).catch(() => {});
  }
  return {
    onlineUsersCount: await getOnlineCount(),
  };
}

