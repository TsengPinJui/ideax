/**
 * 付費解答的完整內容：存放於 answer_secrets（前端無法直接讀取），由伺服器依權限提供。
 * 可取得的人：管理員、回答者本人、已解鎖（unlockedByUserIds，只有伺服器能寫）的會員；
 * 免費或討論類的解答不受限制。
 */
import { getApps } from 'firebase-admin/app';
import firebaseConfigJson from '../firebase-applet-config.json';
import { hasAdminCredentials, isVerifiedAdmin } from './competitionService';
import { findUserDocByAuth, memberIdsOf } from './pointsLedger';
import { isProtectedAnswer, splitAnswerForStorage } from '../src/utils/answerSecrets';

async function getDb() {
  if (!hasAdminCredentials) throw new Error('伺服器尚未設定 FIREBASE_SERVICE_ACCOUNT');
  const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
  const app = getApps()[0];
  const dbId = (firebaseConfigJson as any).firestoreDatabaseId;
  return { db: dbId ? getFirestore(app, dbId) : getFirestore(app), FieldValue };
}

export async function getEntitledAnswerContents(
  auth: { uid: string; email?: string; emailVerified?: boolean },
  answerIds: string[]
): Promise<Record<string, { fullContent?: string; attachments?: any[]; meetingDetails?: any }>> {
  const { db } = await getDb();
  const ids = Array.from(new Set((answerIds || []).map((x) => String(x || '')).filter((x) => x && !x.includes('/')))).slice(0, 60);
  if (ids.length === 0) return {};
  const isAdmin = await isVerifiedAdmin(auth.uid);
  const userRef = await findUserDocByAuth(auth, { db });
  const myIds = memberIdsOf(userRef, auth);
  const out: Record<string, any> = {};
  const answerSnaps = await db.getAll(...ids.map((id) => db.collection('answers').doc(id)));
  const allowedIds: string[] = [];
  for (const snap of answerSnaps) {
    if (!snap.exists) continue;
    const a = snap.data() || {};
    const unlocked: string[] = Array.isArray(a.unlockedByUserIds) ? a.unlockedByUserIds : [];
    const allowed =
      isAdmin ||
      !isProtectedAnswer(a) ||
      a.solverAuthUid === auth.uid ||
      myIds.includes(a.solverId) ||
      myIds.some((id) => unlocked.includes(id));
    if (!allowed) continue;
    allowedIds.push(snap.id);
    // 尚未搬移的舊資料：內容仍在公開文件裡
    if (a.fullContent || (Array.isArray(a.attachments) && a.attachments.some((x: any) => x?.url || x?.dataUrl))) {
      out[snap.id] = { fullContent: a.fullContent, attachments: a.attachments, meetingDetails: a.meetingDetails };
    }
  }
  if (allowedIds.length > 0) {
    const secretSnaps = await db.getAll(...allowedIds.map((id) => db.collection('answer_secrets').doc(id)));
    for (const s of secretSnaps) {
      if (!s.exists) continue;
      const d = s.data() || {};
      out[s.id] = { ...(out[s.id] || {}), fullContent: d.fullContent, attachments: d.attachments, meetingDetails: d.meetingDetails };
    }
  }
  return out;
}

/** 把舊解答的完整內容搬到 answer_secrets，並從公開文件移除（apply=false 只統計） */
export async function migrateAnswerSecrets(apply: boolean): Promise<{ scanned: number; toMigrate: number; migrated: number }> {
  const { db, FieldValue } = await getDb();
  const snap = await db.collection('answers').get();
  let toMigrate = 0;
  let migrated = 0;
  let batch = db.batch();
  let ops = 0;
  for (const d of snap.docs) {
    const a = d.data() || {};
    if (!isProtectedAnswer(a)) continue;
    const hasSecretInPublic =
      Boolean(a.fullContent) ||
      (Array.isArray(a.attachments) && a.attachments.some((x: any) => x?.url || x?.dataUrl)) ||
      Boolean(a.meetingDetails && (a.meetingDetails.availableTimeSlots || a.meetingDetails.meetingAgenda));
    if (!hasSecretInPublic) continue;
    toMigrate++;
    if (!apply) continue;
    const { publicAnswer, secret } = splitAnswerForStorage({ ...a, id: d.id });
    if (secret) {
      batch.set(
        db.collection('answer_secrets').doc(d.id),
        { ...JSON.parse(JSON.stringify(secret)), solverAuthUid: a.solverAuthUid || null, solverId: a.solverId || null, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      ops++;
    }
    const patch: Record<string, any> = { fullContent: FieldValue.delete(), hasProtectedContent: true };
    if ((publicAnswer as any).attachments) patch.attachments = JSON.parse(JSON.stringify((publicAnswer as any).attachments));
    if ((publicAnswer as any).meetingDetails) patch.meetingDetails = JSON.parse(JSON.stringify((publicAnswer as any).meetingDetails));
    batch.update(d.ref, patch);
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
