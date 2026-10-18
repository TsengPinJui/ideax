/**
 * 替舊資料補上 Firebase 登入帳號 UID（與 scripts/backfill-auth-uids.mjs 相同邏輯）
 * 在伺服器上用服務帳戶執行，管理員可從後台一鍵執行，不必在自己的電腦跑指令。
 */
import { getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfigJson from '../firebase-applet-config.json';
import { hasAdminCredentials } from './competitionService';

export interface BackfillResult {
  applied: boolean;
  usersLinked: number;
  usersMissing: number;
  conversations: number;
  transactions: number;
  notifications: number;
}

export async function runAuthUidBackfill(apply: boolean): Promise<BackfillResult> {
  if (!hasAdminCredentials) {
    throw new Error('伺服器尚未設定 FIREBASE_SERVICE_ACCOUNT，無法執行');
  }
  // 需要時才載入（Firestore 管理端套件較大，且只有這個工具用到）
  const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
  const app = getApps()[0];
  const dbId = (firebaseConfigJson as any).firestoreDatabaseId;
  const db = dbId ? getFirestore(app, dbId) : getFirestore(app);
  const auth = getAuth(app);

  const result: BackfillResult = {
    applied: apply,
    usersLinked: 0,
    usersMissing: 0,
    conversations: 0,
    transactions: 0,
    notifications: 0,
  };

  // 1. users
  const appIdToUid = new Map<string, string>();
  const nameToUid = new Map<string, string>();
  const duplicateNames = new Set<string>();
  const usersSnap = await db.collection('users').get();
  for (const d of usersSnap.docs) {
    const u = d.data() as any;
    let uid: string | null = u.authUid || null;
    if (!uid) {
      try {
        uid = (await auth.getUser(d.id)).uid;
      } catch {}
    }
    let email: string | undefined = u.email;
    if (!uid && !email) {
      // Email 已搬到 user_private
      try {
        const p = await db.collection('user_private').doc(d.id).get();
        email = p.exists ? (p.data() as any)?.email : undefined;
      } catch {}
    }
    if (!uid && email) {
      try {
        uid = (await auth.getUserByEmail(String(email).trim().toLowerCase())).uid;
      } catch {}
    }
    if (!uid) {
      result.usersMissing++;
      continue;
    }
    appIdToUid.set(d.id, uid);
    if (u.name) {
      if (nameToUid.has(u.name) && nameToUid.get(u.name) !== uid) duplicateNames.add(u.name);
      nameToUid.set(u.name, uid);
    }
    if (u.authUid !== uid) {
      result.usersLinked++;
      if (apply) await d.ref.update({ authUid: uid });
    }
  }
  duplicateNames.forEach((n) => nameToUid.delete(n));
  const resolve = (id?: string) => (id ? appIdToUid.get(id) || null : null);

  // 2. conversations
  const convSnap = await db.collection('conversations').get();
  for (const d of convSnap.docs) {
    const c = d.data() as any;
    const ids = [...(c.participantIds || []), c.participantId].filter(Boolean);
    const uids = [...new Set(ids.map(resolve).filter(Boolean) as string[])];
    const existing = new Set<string>(c.participantAuthUids || []);
    const add = uids.filter((u) => !existing.has(u));
    if (add.length === 0) continue;
    result.conversations++;
    if (apply) await d.ref.update({ participantAuthUids: FieldValue.arrayUnion(...add) });
  }

  // 3. transactions
  const txSnap = await db.collection('transactions').get();
  for (const d of txSnap.docs) {
    const t = d.data() as any;
    const uids = new Set<string>(
      [t.fromUserId, t.toUserId, t.solverId, t.userId].map(resolve).filter(Boolean) as string[]
    );
    for (const name of [t.fromUserName, t.toUserName]) {
      if (name && nameToUid.has(name)) uids.add(nameToUid.get(name)!);
    }
    const existing = new Set<string>(t.partyAuthUids || []);
    const add = [...uids].filter((u) => !existing.has(u));
    if (add.length === 0) continue;
    result.transactions++;
    if (apply) await d.ref.update({ partyAuthUids: FieldValue.arrayUnion(...add) });
  }

  // 4. notifications
  const notifSnap = await db.collection('notifications').get();
  for (const d of notifSnap.docs) {
    const n = d.data() as any;
    if (!n.userId || n.userId === 'all' || n.userId === 'admin' || n.recipientAuthUid) continue;
    const uid = resolve(n.userId);
    if (!uid) continue;
    result.notifications++;
    if (apply) await d.ref.update({ recipientAuthUid: uid });
  }

  return result;
}
