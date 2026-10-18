/**
 * 伺服器點數帳本
 *
 * 點數（balance）、預扣（withheldPoints）、打賞應收（tipReceivablesPoints）等欄位，
 * 資料庫規則已禁止前端直接修改，一律透過這裡以服務帳戶在交易（transaction）中異動，
 * 並寫入 points_ledger 留下紀錄。
 *
 * 會員只能「花自己的點數」或「把自己預扣的點數退回／撥出」，無法憑空增加點數；
 * 增加點數只有管理員能做（儲值金流上線前暫停自助儲值）。
 */
import { getApps } from 'firebase-admin/app';
import firebaseConfigJson from '../firebase-applet-config.json';
import { hasAdminCredentials, isVerifiedAdmin } from './competitionService';

export type PointsOp =
  | { op: 'spend'; amount: number; purpose: SpendPurpose; refId?: string; toUserId?: string; note?: string }
  | { op: 'escrow_hold'; amount: number; refId: string; note?: string }
  | { op: 'escrow_release'; amount: number; refId: string; mode: 'refund' | 'payout'; payerUserId?: string; note?: string }
  | { op: 'admin_adjust'; userId: string; delta: number; note?: string };

export type SpendPurpose = 'tip' | 'unlock' | 'promote' | 'service' | 'chat_offer' | 'subscription' | 'withdraw';
const SPEND_PURPOSES: SpendPurpose[] = ['tip', 'unlock', 'promote', 'service', 'chat_offer', 'subscription', 'withdraw'];
const MAX_AMOUNT = 10_000_000;

export class PointsError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

async function getAdminDb() {
  if (!hasAdminCredentials) throw new PointsError('伺服器尚未設定 FIREBASE_SERVICE_ACCOUNT', 503);
  const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
  const app = getApps()[0];
  const dbId = (firebaseConfigJson as any).firestoreDatabaseId;
  return { db: dbId ? getFirestore(app, dbId) : getFirestore(app), FieldValue };
}

function cleanAmount(n: unknown): number {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v) || v <= 0 || v > MAX_AMOUNT) throw new PointsError('點數數額不正確');
  return v;
}

/** 依 Firebase 帳號找到對應的會員文件 */
export async function findUserDocByAuth(auth: { uid: string; email?: string }, injected?: { db: any }) {
  const { db } = injected || (await getAdminDb());
  const direct = await db.collection('users').doc(auth.uid).get();
  if (direct.exists) return direct.ref;
  const byAuth = await db.collection('users').where('authUid', '==', auth.uid).limit(1).get();
  if (!byAuth.empty) return byAuth.docs[0].ref;
  if (auth.email) {
    const byEmail = await db.collection('users').where('email', '==', auth.email.toLowerCase()).limit(1).get();
    if (!byEmail.empty) return byEmail.docs[0].ref;
  }
  return null;
}

export async function applyPointsOp(auth: { uid: string; email?: string }, input: PointsOp) {
  const { db, FieldValue } = await getAdminDb();
  const isAdmin = await isVerifiedAdmin(auth.uid);
  return applyPointsOpWith({ db, FieldValue, isAdmin }, auth, input);
}

/** 可注入資料庫的實作（方便測試） */
export async function applyPointsOpWith(
  deps: { db: any; FieldValue: any; isAdmin: boolean },
  auth: { uid: string; email?: string },
  input: PointsOp
) {
  const { db, FieldValue, isAdmin } = deps;

  if (input.op === 'admin_adjust') {
    if (!isAdmin) throw new PointsError('僅限管理員', 403);
    const delta = Math.trunc(Number(input.delta));
    if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > MAX_AMOUNT) throw new PointsError('調整數額不正確');
    const ref = db.collection('users').doc(String(input.userId || ''));
    return db.runTransaction(async (tx: any) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new PointsError('找不到會員', 404);
      const balance = Number(snap.get('balance')) || 0;
      const next = balance + delta;
      if (next < 0) throw new PointsError('調整後餘額不可為負數');
      tx.update(ref, { balance: next });
      tx.set(db.collection('points_ledger').doc(), {
        userId: ref.id,
        op: 'admin_adjust',
        delta,
        balanceAfter: next,
        byAuthUid: auth.uid,
        note: String(input.note || '').slice(0, 200),
        createdAt: new Date().toISOString(),
      });
      return { userId: ref.id, balance: next, withheldPoints: Number(snap.get('withheldPoints')) || 0 };
    });
  }

  const userRef = await findUserDocByAuth(auth, { db });
  if (!userRef) throw new PointsError('找不到您的會員資料，請重新登入', 404);

  if (input.op === 'spend') {
    const amount = cleanAmount(input.amount);
    if (!SPEND_PURPOSES.includes(input.purpose)) throw new PointsError('用途不正確');
    const toRef = input.toUserId && input.purpose === 'tip' ? db.collection('users').doc(String(input.toUserId)) : null;
    if (toRef && toRef.id === userRef.id) throw new PointsError('無法打賞給自己');
    return db.runTransaction(async (tx: any) => {
      const snap = await tx.get(userRef);
      const toSnap = toRef ? await tx.get(toRef) : null;
      const balance = Number(snap.get('balance')) || 0;
      if (balance < amount) throw new PointsError(`點數餘額不足（目前 ${balance} 點，需 ${amount} 點）`, 402);
      const next = balance - amount;
      tx.update(userRef, { balance: next });
      if (toRef && toSnap?.exists) {
        tx.update(toRef, {
          tipReceivablesPoints: FieldValue.increment(amount),
          thisWeekTipPoints: FieldValue.increment(amount),
        });
      }
      tx.set(db.collection('points_ledger').doc(), {
        userId: userRef.id,
        op: 'spend',
        purpose: input.purpose,
        delta: -amount,
        balanceAfter: next,
        refId: input.refId || null,
        toUserId: toRef?.id || null,
        note: String(input.note || '').slice(0, 200),
        createdAt: new Date().toISOString(),
      });
      return { userId: userRef.id, balance: next, withheldPoints: Number(snap.get('withheldPoints')) || 0 };
    });
  }

  if (input.op === 'escrow_hold') {
    const amount = cleanAmount(input.amount);
    const refId = String(input.refId || '').slice(0, 120);
    if (!refId) throw new PointsError('缺少預扣項目');
    const escrowRef = db.collection('points_escrow').doc(`${userRef.id}__${refId}`);
    return db.runTransaction(async (tx: any) => {
      const snap = await tx.get(userRef);
      const escrowSnap = await tx.get(escrowRef);
      const balance = Number(snap.get('balance')) || 0;
      if (balance < amount) throw new PointsError(`點數餘額不足（目前 ${balance} 點，需 ${amount} 點）`, 402);
      const next = balance - amount;
      const withheld = (Number(snap.get('withheldPoints')) || 0) + amount;
      tx.update(userRef, { balance: next, withheldPoints: withheld });
      const prevRemaining = escrowSnap.exists ? Number(escrowSnap.get('remaining')) || 0 : 0;
      tx.set(
        escrowRef,
        {
          payerId: userRef.id,
          refId,
          amount: (escrowSnap.exists ? Number(escrowSnap.get('amount')) || 0 : 0) + amount,
          remaining: prevRemaining + amount,
          status: 'held',
          updatedAt: new Date().toISOString(),
          ...(escrowSnap.exists ? {} : { createdAt: new Date().toISOString() }),
        },
        { merge: true }
      );
      tx.set(db.collection('points_ledger').doc(), {
        userId: userRef.id,
        op: 'escrow_hold',
        delta: -amount,
        balanceAfter: next,
        withheldAfter: withheld,
        refId,
        note: String(input.note || '').slice(0, 200),
        createdAt: new Date().toISOString(),
      });
      return { userId: userRef.id, balance: next, withheldPoints: withheld };
    });
  }

  if (input.op === 'escrow_release') {
    const amount = cleanAmount(input.amount);
    const refId = String(input.refId || '').slice(0, 120);
    if (!refId) throw new PointsError('缺少預扣項目');
    if (input.mode !== 'refund' && input.mode !== 'payout') throw new PointsError('釋放方式不正確');
    // 管理員可代為處理別人的預扣（例如刪除違規提問時退款）
    const payerRef = isAdmin && input.payerUserId ? db.collection('users').doc(String(input.payerUserId)) : userRef;
    const escrowRef = db.collection('points_escrow').doc(`${payerRef.id}__${refId}`);
    const questionRef = db.collection('questions').doc(refId);
    return db.runTransaction(async (tx: any) => {
      const snap = await tx.get(payerRef);
      if (!snap.exists) throw new PointsError('找不到付款會員', 404);
      const escrowSnap = await tx.get(escrowRef);
      let available: number;
      if (escrowSnap.exists) {
        available = Number(escrowSnap.get('remaining')) || 0;
      } else {
        // 帳本上線前的舊預扣：以提問的作者與預扣金額核對
        const qSnap = await tx.get(questionRef);
        const isAuthor = qSnap.exists && qSnap.get('authorId') === payerRef.id;
        if (!isAuthor && !isAdmin) throw new PointsError('找不到這筆預扣紀錄', 404);
        available = Math.min(
          Number(snap.get('withheldPoints')) || 0,
          qSnap.exists ? Number(qSnap.get('withheldBounty') ?? qSnap.get('bounty')) || 0 : 0
        );
      }
      if (amount > available) throw new PointsError(`可釋放的預扣只剩 ${available} 點`);
      const withheld = Math.max(0, (Number(snap.get('withheldPoints')) || 0) - amount);
      const balance = (Number(snap.get('balance')) || 0) + (input.mode === 'refund' ? amount : 0);
      tx.update(payerRef, { withheldPoints: withheld, balance });
      tx.set(
        escrowRef,
        {
          payerId: payerRef.id,
          refId,
          remaining: available - amount,
          status: available - amount <= 0 ? 'released' : 'held',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      tx.set(db.collection('points_ledger').doc(), {
        userId: payerRef.id,
        op: 'escrow_release',
        mode: input.mode,
        delta: input.mode === 'refund' ? amount : 0,
        balanceAfter: balance,
        withheldAfter: withheld,
        refId,
        byAuthUid: auth.uid,
        note: String(input.note || '').slice(0, 200),
        createdAt: new Date().toISOString(),
      });
      return { userId: payerRef.id, balance, withheldPoints: withheld };
    });
  }

  throw new PointsError('不支援的操作');
}
