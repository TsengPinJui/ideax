/**
 * 會員私密資料（Email、電話、銀行帳戶、問卷）相關的伺服器功能：
 * - 舊資料搬移：從公開的 users 搬到 user_private
 * - 帳號名稱／手機號碼＋密碼登入：伺服器查 Email、驗證密碼，回傳一次性登入憑證
 */
import { getApps } from 'firebase-admin/app';
import firebaseConfigJson from '../firebase-applet-config.json';
import { adminAuth, hasAdminCredentials } from './competitionService';
import { PRIVATE_PROFILE_FIELDS, normalizePhone, pickPrivateProfile } from '../src/utils/privateProfile';

async function getDb() {
  if (!hasAdminCredentials) throw new Error('伺服器尚未設定 FIREBASE_SERVICE_ACCOUNT');
  const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
  const app = getApps()[0];
  const dbId = (firebaseConfigJson as any).firestoreDatabaseId;
  return { db: dbId ? getFirestore(app, dbId) : getFirestore(app), FieldValue };
}

export async function migratePrivateProfiles(apply: boolean): Promise<{ scanned: number; toMigrate: number; migrated: number }> {
  const { db, FieldValue } = await getDb();
  const snap = await db.collection('users').get();
  let toMigrate = 0;
  let migrated = 0;
  let batch = db.batch();
  let ops = 0;
  for (const d of snap.docs) {
    const u = d.data() || {};
    const priv = pickPrivateProfile(u);
    const hasPublicPrivate = PRIVATE_PROFILE_FIELDS.some((k) => u[k] !== undefined);
    if (!hasPublicPrivate) continue;
    toMigrate++;
    if (!apply) continue;
    if (Object.keys(priv).length > 0) {
      batch.set(
        db.collection('user_private').doc(d.id),
        {
          ...JSON.parse(JSON.stringify(priv)),
          ...(priv.email ? { email: String(priv.email).trim().toLowerCase() } : {}),
          ...(normalizePhone(priv.phone) ? { phoneNormalized: normalizePhone(priv.phone) } : {}),
          ...(u.authUid ? { authUid: u.authUid } : {}),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      ops++;
    }
    const del: Record<string, any> = {};
    for (const k of PRIVATE_PROFILE_FIELDS) if (u[k] !== undefined) del[k] = FieldValue.delete();
    batch.update(d.ref, del);
    ops++;
    migrated++;
    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();
  return { scanned: snap.size, toMigrate, migrated };
}

export class LoginError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

const GENERIC_LOGIN_ERROR = '帳號或密碼不正確，請重新確認後再試！';

/** 帳號名稱／手機號碼／會員編號 → 會員編號與 Email */
async function resolveLoginIdentity(identifier: string): Promise<{ userId: string; email: string } | null> {
  const { db } = await getDb();
  const id = identifier.trim();
  if (!id || id.length > 120 || id.includes('/')) return null;
  let userId: string | null = null;
  if (id.includes('@')) {
    const p = await db.collection('user_private').where('email', '==', id.toLowerCase()).limit(1).get();
    if (!p.empty) userId = p.docs[0].id;
    return { userId: userId || '', email: id.toLowerCase() };
  }
  const byUsername = await db.collection('users').where('username', '==', id).limit(1).get();
  if (!byUsername.empty) userId = byUsername.docs[0].id;
  if (!userId) {
    const cleanPhone = id.replace(/[\s-]/g, '');
    if (/^\+?\d{8,15}$/.test(cleanPhone)) {
      const lookups: Array<[string, string]> = [['phoneNormalized', cleanPhone], ['phone', cleanPhone], ['phone', id]];
      for (const [field, candidate] of lookups) {
        const byPhone = await db.collection('user_private').where(field, '==', candidate).limit(1).get();
        if (!byPhone.empty) {
          userId = byPhone.docs[0].id;
          break;
        }
      }
    }
  }
  if (!userId) {
    const direct = await db.collection('users').doc(id).get();
    if (direct.exists) userId = direct.id;
  }
  if (!userId) return null;
  const priv = await db.collection('user_private').doc(userId).get();
  let email: string | undefined = priv.exists ? (priv.data() as any)?.email : undefined;
  if (!email) {
    const pub = await db.collection('users').doc(userId).get();
    email = pub.exists ? (pub.data() as any)?.email : undefined; // 尚未搬移的舊資料
  }
  if (!email) return null;
  return { userId, email: String(email).trim().toLowerCase() };
}

export async function passwordLogin(identifier: string, password: string): Promise<{ customToken: string; userId: string }> {
  if (typeof identifier !== 'string' || typeof password !== 'string' || !password || password.length > 128) {
    throw new LoginError(GENERIC_LOGIN_ERROR);
  }
  const identity = await resolveLoginIdentity(identifier);
  if (!identity) throw new LoginError(GENERIC_LOGIN_ERROR);
  const apiKey = process.env.VITE_FIREBASE_API_KEY || (firebaseConfigJson as any).apiKey;
  const resp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: identity.email, password, returnSecureToken: false }),
  });
  const data: any = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.localId) {
    const msg = String(data?.error?.message || '');
    if (msg.includes('TOO_MANY_ATTEMPTS')) throw new LoginError('嘗試次數過多，請稍後再試或使用「忘記密碼」。', 429);
    if (msg.includes('USER_DISABLED')) throw new LoginError('此帳號已停用，如有疑問請聯繫客服。', 403);
    throw new LoginError(GENERIC_LOGIN_ERROR);
  }
  const customToken = await adminAuth.createCustomToken(data.localId);
  return { customToken, userId: identity.userId };
}
