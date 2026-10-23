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
import { createHash } from 'node:crypto';
import firebaseConfigJson from '../firebase-applet-config.json';
import { hasAdminCredentials, isVerifiedAdmin } from './competitionService';
import { SUBSCRIPTION_PLANS } from '../src/types';

export type PointsOp =
  | { op: 'spend'; amount: number; purpose: SpendPurpose; refId?: string; toUserId?: string; note?: string }
  | { op: 'escrow_hold'; amount: number; refId: string; note?: string }
  | { op: 'escrow_release'; amount: number; refId: string; mode: 'refund' | 'payout'; payerUserId?: string; toAnswerId?: string; note?: string }
  | { op: 'admin_adjust'; userId: string; delta: number; note?: string }
  | { op: 'subscribe'; tier: string; cycle?: string }
  | { op: 'payout_request'; amount: number; source?: 'tips' | 'earnings' | 'combined'; note?: string }
  | { op: 'unlock_answer'; answerId: string; useWithheldOffset?: boolean };

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
export async function findUserDocByAuth(auth: { uid: string; email?: string; emailVerified?: boolean }, injected?: { db: any }) {
  const { db } = injected || (await getAdminDb());
  const direct = await db.collection('users').doc(auth.uid).get();
  if (direct.exists) return direct.ref;
  const byAuth = await db.collection('users').where('authUid', '==', auth.uid).limit(1).get();
  if (!byAuth.empty) return byAuth.docs[0].ref;
  // 只有已驗證的 Email 才能用來對應會員資料（避免他人以未驗證的同名 Email 冒用）
  if (auth.email && auth.emailVerified) {
    const email = auth.email.toLowerCase();
    const byPrivate = await db.collection('user_private').where('email', '==', email).limit(1).get();
    if (!byPrivate.empty) return db.collection('users').doc(byPrivate.docs[0].id);
    const byEmail = await db.collection('users').where('email', '==', email).limit(1).get();
    if (!byEmail.empty) return byEmail.docs[0].ref;
  }
  return null;
}

export async function applyPointsOp(auth: { uid: string; email?: string; emailVerified?: boolean }, input: PointsOp) {
  const { db, FieldValue } = await getAdminDb();
  const isAdmin = await isVerifiedAdmin(auth.uid);
  return applyPointsOpWith({ db, FieldValue, isAdmin }, auth, input);
}

/** 新帳號註冊獎勵：只增加平台點 balance，與創星幣帳本分開。註冊贈送 100 點。 */
export async function grantSignupBonus(auth: { uid: string; email?: string; emailVerified?: boolean }) {
  const { db } = await getAdminDb();
  const userRef = await findUserDocByAuth(auth, { db });
  if (!userRef) throw new PointsError('找不到您的會員資料，請稍後重新整理', 404);

  const userSnap = await userRef.get();
  const createdAtMs = userSnap.createTime?.toMillis?.();
  // Firebase 帳號可能早已存在但尚未完成 IdeaX 註冊；以會員文件建立時間限定真正的新註冊，避免舊會員補領。
  if (!userSnap.exists || !createdAtMs || Date.now() - createdAtMs > 24 * 60 * 60 * 1000) {
    throw new PointsError('此註冊獎勵僅提供新註冊會員領取', 403);
  }

  const bonusId = createHash('sha256').update(`signup-platform-points:${userRef.id}`).digest('hex');
  const ledgerRef = db.collection('points_ledger').doc(`signup_bonus_${bonusId}`);
  return db.runTransaction(async (tx: any) => {
    const [freshUser, priorBonus] = await Promise.all([tx.get(userRef), tx.get(ledgerRef)]);
    if (!freshUser.exists) throw new PointsError('找不到您的會員資料', 404);
    const balance = Number(freshUser.get('balance')) || 0;
    if (priorBonus.exists) return { userId: userRef.id, balance, granted: false };
    const next = balance + 100;
    tx.update(userRef, { balance: next });
    tx.create(ledgerRef, {
      userId: userRef.id,
      op: 'earn',
      source: 'signup_bonus',
      delta: 100,
      balanceAfter: next,
      note: '新註冊平台點獎勵 100 點',
      createdAt: new Date().toISOString(),
    });
    return { userId: userRef.id, balance: next, granted: true };
  });
}

/** 首次發文獎勵：會員完成首篇發文（問題/痛點/提案等）再贈送 200 點，防重複發放。 */
export async function grantFirstPostBonus(auth: { uid: string; email?: string; emailVerified?: boolean }) {
  const { db } = await getAdminDb();
  const userRef = await findUserDocByAuth(auth, { db });
  if (!userRef) throw new PointsError('找不到您的會員資料，請稍後重新整理', 404);

  const bonusId = createHash('sha256').update(`first-post-bonus:${userRef.id}`).digest('hex');
  const ledgerRef = db.collection('points_ledger').doc(`first_post_bonus_${bonusId}`);
  return db.runTransaction(async (tx: any) => {
    const [freshUser, priorBonus] = await Promise.all([tx.get(userRef), tx.get(ledgerRef)]);
    if (!freshUser.exists) throw new PointsError('找不到您的會員資料', 404);
    const balance = Number(freshUser.get('balance')) || 0;
    if (priorBonus.exists || freshUser.get('hasReceivedFirstPostBonus')) {
      return { userId: userRef.id, balance, granted: false };
    }
    const next = balance + 200;
    tx.update(userRef, { balance: next, hasReceivedFirstPostBonus: true });
    tx.create(ledgerRef, {
      userId: userRef.id,
      op: 'earn',
      source: 'first_post_bonus',
      delta: 200,
      balanceAfter: next,
      note: '首次發文獎勵贈送 200 平台點',
      createdAt: new Date().toISOString(),
    });
    return { userId: userRef.id, balance: next, granted: true };
  });
}

/** 企劃書匯出專用扣點，requestId 作為冪等鍵；帳本只存扣點資訊，不存生成內容。 */
export async function spendProjectPlanExport(
  auth: { uid: string; email?: string; emailVerified?: boolean },
  input: { projectId: string; requestId: string }
) {
  const { db } = await getAdminDb();
  const userRef = await findUserDocByAuth(auth, { db });
  if (!userRef) throw new PointsError('找不到您的會員資料，請重新登入', 404);
  const key = createHash('sha256').update(`${userRef.id}:${input.projectId}:${input.requestId}`).digest('hex');
  const ledgerRef = db.collection('points_ledger').doc(`project_plan_${key}`);
  return db.runTransaction(async (tx: any) => {
    const [userSnap, prior] = await Promise.all([tx.get(userRef), tx.get(ledgerRef)]);
    if (!userSnap.exists) throw new PointsError('找不到您的會員資料', 404);
    if (prior.exists) throw new PointsError('這次匯出請求已處理，請重新操作', 409);
    const balance = Number(userSnap.get('balance')) || 0;
    if (balance < 50) throw new PointsError(`平台點不足（目前 ${balance} 點，匯出需 50 點）`, 402);
    const next = balance - 50;
    tx.update(userRef, { balance: next });
    tx.create(ledgerRef, {
      userId: userRef.id,
      op: 'spend',
      purpose: 'project_plan_export',
      projectId: input.projectId,
      requestId: input.requestId,
      delta: -50,
      balanceAfter: next,
      status: 'processing',
      createdAt: new Date().toISOString(),
    });
    return { userId: userRef.id, balance: next, ledgerId: ledgerRef.id };
  });
}

/** Gemini 失敗時退還企劃書匯出點數；同一筆扣款只會退還一次。 */
export async function refundProjectPlanExport(ledgerId: string) {
  const { db } = await getAdminDb();
  const ledgerRef = db.collection('points_ledger').doc(ledgerId);
  return db.runTransaction(async (tx: any) => {
    const ledgerSnap = await tx.get(ledgerRef);
    if (!ledgerSnap.exists) throw new PointsError('找不到匯出扣點紀錄', 404);
    const ledger = ledgerSnap.data() || {};
    if (ledger.status === 'refunded') return { refunded: false, balance: Number(ledger.refundBalanceAfter) || 0 };
    if (ledger.status !== 'processing') throw new PointsError('匯出扣點紀錄狀態不正確', 409);
    const userRef = db.collection('users').doc(String(ledger.userId || ''));
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new PointsError('找不到會員資料，無法退還點數', 404);
    const next = (Number(userSnap.get('balance')) || 0) + 50;
    tx.update(userRef, { balance: next });
    tx.update(ledgerRef, { status: 'refunded', refundedAt: new Date().toISOString(), refundBalanceAfter: next });
    const refundRef = db.collection('points_ledger').doc();
    tx.create(refundRef, {
      userId: userRef.id,
      op: 'earn',
      source: 'project_plan_export_refund',
      refId: ledgerRef.id,
      delta: 50,
      balanceAfter: next,
      note: '企劃書生成失敗退還平台點',
      createdAt: new Date().toISOString(),
    });
    return { refunded: true, balance: next };
  });
}

export async function completeProjectPlanExport(ledgerId: string): Promise<void> {
  const { db } = await getAdminDb();
  await db.collection('points_ledger').doc(ledgerId).update({ status: 'completed', completedAt: new Date().toISOString() });
}

/** 可注入資料庫的實作（方便測試） */
export async function applyPointsOpWith(
  deps: { db: any; FieldValue: any; isAdmin: boolean },
  auth: { uid: string; email?: string; emailVerified?: boolean },
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
    const creditsPayee = input.purpose === 'tip' || input.purpose === 'chat_offer';
    const toRef = input.toUserId && creditsPayee ? db.collection('users').doc(String(input.toUserId)) : null;
    if (toRef && toRef.id === userRef.id) throw new PointsError('無法打賞給自己');
    return db.runTransaction(async (tx: any) => {
      const snap = await tx.get(userRef);
      const toSnap = toRef ? await tx.get(toRef) : null;
      const balance = Number(snap.get('balance')) || 0;
      if (balance < amount) throw new PointsError(`點數餘額不足（目前 ${balance} 點，需 ${amount} 點）`, 402);
      const next = balance - amount;
      tx.update(userRef, { balance: next });
      if (toRef && toSnap?.exists) {
        if (input.purpose === 'tip') {
          tx.update(toRef, {
            tipReceivablesPoints: FieldValue.increment(amount),
            thisWeekTipPoints: FieldValue.increment(amount),
          });
        } else {
          // 聊天室方案付款：計入對方的方案收入（撥款時依其會員方案扣服務費）
          tx.update(toRef, { bountyReceivablesPoints: FieldValue.increment(amount) });
        }
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

  if (input.op === 'unlock_answer') {
    return unlockAnswerTx(db, userRef, auth, input);
  }

  if (input.op === 'payout_request') {
    // 收入申請撥款：扣減可撥款點數（打賞／方案與懸賞收入），依會員方案計算服務費，由管理員匯款後結案
    const amount = cleanAmount(input.amount);
    if (amount < 100) throw new PointsError('單次撥款申請最低 100 點');
    const source = input.source === 'earnings' || input.source === 'combined' ? input.source : 'tips';
    const feeRateOf = await loadFeeRateResolver(db);
    return db.runTransaction(async (tx: any) => {
      const snap = await tx.get(userRef);
      const tips = Number(snap.get('tipReceivablesPoints')) || 0;
      const earnings = Number(snap.get('bountyReceivablesPoints')) || 0;
      let fromEarnings = 0;
      let fromTips = 0;
      if (source === 'tips') fromTips = amount;
      else if (source === 'earnings') fromEarnings = amount;
      else {
        fromEarnings = Math.min(earnings, amount);
        fromTips = amount - fromEarnings;
      }
      if (fromTips > tips || fromEarnings > earnings) {
        throw new PointsError(`可撥款點數不足（打賞 ${tips} 點、方案與懸賞收入 ${earnings} 點）`, 402);
      }
      const nextTips = tips - fromTips;
      const nextEarnings = earnings - fromEarnings;
      const feeRate = feeRateOf(String(snap.get('subscriptionTier') || 'free'));
      const fee = feeRate > 0 ? Math.round(amount * feeRate) : 0;
      const bonus = feeRate < 0 ? Math.round(amount * Math.abs(feeRate)) : 0;
      const net = amount - fee + bonus;
      tx.update(userRef, { tipReceivablesPoints: nextTips, bountyReceivablesPoints: nextEarnings });
      const now = new Date().toISOString();
      tx.set(db.collection('payout_requests').doc(), {
        userId: userRef.id,
        byAuthUid: auth.uid,
        amount,
        fromTips,
        fromEarnings,
        feeRate,
        fee,
        bonus,
        netAmount: net,
        status: 'pending',
        note: String(input.note || '').slice(0, 300),
        createdAt: now,
      });
      tx.set(db.collection('points_ledger').doc(), {
        userId: userRef.id,
        op: 'payout_request',
        delta: 0,
        receivableDelta: -amount,
        tipsAfter: nextTips,
        earningsAfter: nextEarnings,
        netAmount: net,
        note: String(input.note || '').slice(0, 200),
        createdAt: now,
      });
      return {
        userId: userRef.id,
        balance: Number(snap.get('balance')) || 0,
        withheldPoints: Number(snap.get('withheldPoints')) || 0,
        tipReceivablesPoints: nextTips,
        bountyReceivablesPoints: nextEarnings,
        netAmount: net,
      };
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
    // 撥付給解答者：確認解答屬於這筆預扣（同一題，或該解答的階段預扣），並找到解答者的會員資料
    let payeeRef: any = null;
    if (input.mode === 'payout' && input.toAnswerId) {
      const ansId = String(input.toAnswerId).slice(0, 160);
      const aSnap = await db.collection('answers').doc(ansId).get();
      if (!aSnap.exists) throw new PointsError('找不到要撥付的解答', 404);
      const ans = aSnap.data() || {};
      if (ans.questionId !== refId && !refId.startsWith(`${ansId}#`)) throw new PointsError('解答與預扣項目不符');
      payeeRef = await findSolverUserRef(db, ans);
      if (!payeeRef) throw new PointsError('找不到解答者的會員資料', 404);
      if (payeeRef.id === payerRef.id) throw new PointsError('不能撥付給自己');
    }
    return db.runTransaction(async (tx: any) => {
      const snap = await tx.get(payerRef);
      if (!snap.exists) throw new PointsError('找不到付款會員', 404);
      const payeeSnap = payeeRef ? await tx.get(payeeRef) : null;
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
      if (payeeRef && payeeSnap?.exists) {
        const earned = (Number(payeeSnap.get('bountyReceivablesPoints')) || 0) + amount;
        tx.update(payeeRef, { bountyReceivablesPoints: earned });
        tx.set(db.collection('points_ledger').doc(), {
          userId: payeeRef.id,
          op: 'earn',
          source: refId.includes('#phase') ? 'phase' : 'bounty',
          receivableDelta: amount,
          receivableAfter: earned,
          refId,
          fromUserId: payerRef.id,
          createdAt: new Date().toISOString(),
        });
      }
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
      return { userId: payerRef.id, balance, withheldPoints: withheld, paidToUserId: payeeRef?.id || null };
    });
  }

  if (input.op === 'subscribe') {
    const plan = (SUBSCRIPTION_PLANS as any)[String(input.tier)];
    if (!plan || input.tier === 'free') throw new PointsError('無效的方案');
    const cycle = plan.billingCycles.find((c: any) => c.cycle === input.cycle) || plan.billingCycles[0];
    const price = Math.max(0, Math.floor(Number(cycle.price) || 0));
    const months = Math.max(1, Number(cycle.durationMonths) || 1);
    return db.runTransaction(async (tx: any) => {
      const snap = await tx.get(userRef);
      const currentTier = snap.get('subscriptionTier') || 'free';
      const expiresAt = Date.parse(snap.get('subscriptionExpiresAt') || '') || 0;
      if (currentTier !== 'free' && expiresAt > Date.now()) {
        throw new PointsError('目前方案尚未到期，變更方案將於下個期間生效');
      }
      const balance = Number(snap.get('balance')) || 0;
      if (balance < price) throw new PointsError(`點數餘額不足（目前 ${balance} 點，需 ${price} 點）`, 402);
      const next = balance - price;
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + months);
      const expiryStr = expiry.toISOString().split('T')[0];
      tx.update(userRef, {
        balance: next,
        subscriptionTier: input.tier,
        subscriptionExpiresAt: expiryStr,
        nextSubscriptionTier: FieldValue.delete(),
        nextSubscriptionCycle: FieldValue.delete(),
        nextSubscriptionEffectiveAt: FieldValue.delete(),
      });
      tx.set(db.collection('points_ledger').doc(), {
        userId: userRef.id,
        op: 'subscribe',
        tier: input.tier,
        cycle: cycle.cycle,
        delta: -price,
        balanceAfter: next,
        createdAt: new Date().toISOString(),
      });
      return { userId: userRef.id, balance: next, withheldPoints: Number(snap.get('withheldPoints')) || 0, subscriptionTier: input.tier, subscriptionExpiresAt: expiryStr };
    });
  }

  throw new PointsError('不支援的操作');
}

/**
 * 每日方案到期處理（由伺服器定時呼叫）：
 * 到期時若有預約的下期方案就扣點續訂，否則（或點數不足）轉為一般會員。
 */
export async function processSubscriptionExpiry(): Promise<{ renewed: number; downgraded: number }> {
  const { db, FieldValue } = await getAdminDb();
  const today = new Date().toISOString().split('T')[0];
  const snap = await db.collection('users').where('subscriptionExpiresAt', '<', today).limit(200).get();
  let renewed = 0;
  let downgraded = 0;
  for (const d of snap.docs) {
    const u = d.data() as any;
    if (!u.subscriptionTier || u.subscriptionTier === 'free') continue;
    await db.runTransaction(async (tx: any) => {
      const fresh = await tx.get(d.ref);
      const data = fresh.data() || {};
      const target = data.nextSubscriptionTier || null;
      const plan = target && target !== 'free' ? (SUBSCRIPTION_PLANS as any)[target] : null;
      const cycle = plan ? plan.billingCycles.find((c: any) => c.cycle === data.nextSubscriptionCycle) || plan.billingCycles[0] : null;
      const price = cycle ? Math.max(0, Math.floor(Number(cycle.price) || 0)) : 0;
      const balance = Number(data.balance) || 0;
      const clearNext = {
        nextSubscriptionTier: FieldValue.delete(),
        nextSubscriptionCycle: FieldValue.delete(),
        nextSubscriptionEffectiveAt: FieldValue.delete(),
      };
      if (plan && balance >= price) {
        const expiry = new Date();
        expiry.setMonth(expiry.getMonth() + Math.max(1, Number(cycle.durationMonths) || 1));
        tx.update(d.ref, { balance: balance - price, subscriptionTier: target, subscriptionExpiresAt: expiry.toISOString().split('T')[0], ...clearNext });
        tx.set(db.collection('points_ledger').doc(), {
          userId: d.id, op: 'subscribe_renew', tier: target, delta: -price, balanceAfter: balance - price, createdAt: new Date().toISOString(),
        });
        renewed++;
      } else {
        tx.update(d.ref, { subscriptionTier: 'free', ...clearNext });
        downgraded++;
      }
    });
  }
  return { renewed, downgraded };
}


/** 全站是否為正式收費模式（platform_settings/global；非創星季、非免費、非測試） */
export async function isPaidPlatformMode(db: any): Promise<boolean> {
  try {
    const snap = await db.collection('platform_settings').doc('global').get();
    if (!snap.exists) return false;
    const d = snap.data() || {};
    return d.isRaceMode === false && d.isNoPaymentMode !== true && d.isDemoMode !== true;
  } catch {
    return false;
  }
}

/** 會員在 unlockedByUserIds 裡可能出現的身分編號 */
export function memberIdsOf(userRef: any, auth: { uid: string }): string[] {
  return Array.from(new Set([userRef?.id, auth.uid].filter(Boolean)));
}

/**
 * 解鎖付費解答：正式模式下由伺服器扣點（提問者可用懸賞預扣折抵），其他模式免費；
 * 成功後把會員加入 unlockedByUserIds（只有伺服器能寫），之後才能取得完整內容。
 * 已解鎖過不會重複扣點。
 */
async function unlockAnswerTx(db: any, userRef: any, auth: { uid: string }, input: { answerId: string; useWithheldOffset?: boolean }) {
  const answerId = String(input.answerId || '').slice(0, 160);
  if (!answerId || answerId.includes('/')) throw new PointsError('缺少解答編號');
  const paidMode = await isPaidPlatformMode(db);
  const answerRef = db.collection('answers').doc(answerId);
  return db.runTransaction(async (tx: any) => {
    const aSnap = await tx.get(answerRef);
    if (!aSnap.exists) throw new PointsError('找不到這則解答', 404);
    const ans = aSnap.data() || {};
    const userSnap = await tx.get(userRef);
    const balance0 = Number(userSnap.get('balance')) || 0;
    const withheld0 = Number(userSnap.get('withheldPoints')) || 0;
    const ids = memberIdsOf(userRef, auth);
    const already: string[] = Array.isArray(ans.unlockedByUserIds) ? ans.unlockedByUserIds : [];
    const isSolver = ans.solverAuthUid === auth.uid || ids.includes(ans.solverId);
    const done = { userId: userRef.id, balance: balance0, withheldPoints: withheld0, unlocked: true };
    if (isSolver || ids.some((id) => already.includes(id))) return done;
    const solverRef = paidMode ? await findSolverUserRef(db, ans, tx) : null;
    const solverSnap = solverRef ? await tx.get(solverRef) : null;

    const price = Math.max(0, Math.floor(Number(ans.price) || 0));
    let pay = 0;
    let offset = 0;
    let questionRef: any = null;
    let qSnap: any = null;
    let escrowRef: any = null;
    let escrowAvailable = 0;
    if (paidMode && ans.isPaid !== false && ans.type !== 'discussion' && price > 0) {
      if (input.useWithheldOffset !== false && ans.questionId) {
        questionRef = db.collection('questions').doc(String(ans.questionId));
        qSnap = await tx.get(questionRef);
        const q = qSnap.exists ? qSnap.data() || {} : {};
        const isAuthor = q.authorAuthUid === auth.uid || ids.includes(q.authorId);
        if (isAuthor) {
          escrowRef = db.collection('points_escrow').doc(`${userRef.id}__${ans.questionId}`);
          const escrowSnap = await tx.get(escrowRef);
          const qWithheld = Number(q.withheldBounty ?? q.bounty) || 0;
          escrowAvailable = escrowSnap.exists ? Number(escrowSnap.get('remaining')) || 0 : Math.min(qWithheld, withheld0);
          offset = Math.min(price, qWithheld, withheld0, escrowAvailable);
        }
      }
      pay = price - offset;
      if (balance0 < pay) throw new PointsError(`點數餘額不足（目前 ${balance0} 點，需 ${pay} 點）`, 402);
    }
    const balance = balance0 - pay;
    const withheld = withheld0 - offset;
    const now = new Date().toISOString();
    if (pay > 0 || offset > 0) tx.update(userRef, { balance, withheldPoints: withheld });
    if (offset > 0 && questionRef && qSnap?.exists) {
      const q = qSnap.data() || {};
      tx.update(questionRef, { withheldBounty: Math.max(0, (Number(q.withheldBounty ?? q.bounty) || 0) - offset) });
      tx.set(
        escrowRef,
        {
          payerId: userRef.id,
          refId: ans.questionId,
          remaining: escrowAvailable - offset,
          status: escrowAvailable - offset <= 0 ? 'released' : 'held',
          updatedAt: now,
        },
        { merge: true }
      );
    }
    tx.update(answerRef, { unlockedByUserIds: Array.from(new Set([...already, userRef.id])) });
    // 解鎖收入計入解答者（含提問者以懸賞折抵的部分）
    const earned = pay + offset;
    if (earned > 0 && solverRef && solverSnap?.exists && solverRef.id !== userRef.id) {
      const after = (Number(solverSnap.get('bountyReceivablesPoints')) || 0) + earned;
      tx.update(solverRef, { bountyReceivablesPoints: after });
      tx.set(db.collection('points_ledger').doc(), {
        userId: solverRef.id,
        op: 'earn',
        source: 'unlock',
        receivableDelta: earned,
        receivableAfter: after,
        refId: answerId,
        fromUserId: userRef.id,
        createdAt: now,
      });
    }
    tx.set(db.collection('points_ledger').doc(), {
      userId: userRef.id,
      op: 'unlock_answer',
      refId: answerId,
      paidMode,
      price,
      delta: -pay,
      withheldDelta: -offset,
      balanceAfter: balance,
      withheldAfter: withheld,
      createdAt: now,
    });
    return { userId: userRef.id, balance, withheldPoints: withheld, unlocked: true };
  });
}


/** 解答者的會員資料：answers.solverId 對應的會員文件，或以 solverAuthUid 查找 */
async function findSolverUserRef(db: any, ans: any, tx?: any): Promise<any> {
  const getDoc = (ref: any) => (tx ? tx.get(ref) : ref.get());
  if (ans?.solverId && !String(ans.solverId).includes('/')) {
    const ref = db.collection('users').doc(String(ans.solverId));
    const snap = await getDoc(ref);
    if (snap.exists) return ref;
  }
  if (ans?.solverAuthUid) {
    const direct = db.collection('users').doc(String(ans.solverAuthUid));
    const snap = await getDoc(direct);
    if (snap.exists) return direct;
    const q = await db.collection('users').where('authUid', '==', String(ans.solverAuthUid)).limit(1).get();
    if (!q.empty) return q.docs[0].ref;
  }
  return null;
}

/** 依會員方案取得撥款服務費率（管理員自訂方案優先，否則用預設方案） */
async function loadFeeRateResolver(db: any): Promise<(tier: string) => number> {
  let custom: any = null;
  try {
    const g = await db.collection('platform_settings').doc('global').get();
    custom = g.exists ? (g.data() || {}).plans : null;
  } catch {}
  return (tier: string) => {
    const fromCustom = custom && !Array.isArray(custom) ? custom[tier]?.platformFeeRate : Array.isArray(custom) ? custom.find((p: any) => p?.id === tier)?.platformFeeRate : undefined;
    const base = (SUBSCRIPTION_PLANS as any)[tier]?.platformFeeRate ?? (SUBSCRIPTION_PLANS as any).free.platformFeeRate;
    const r = typeof fromCustom === 'number' ? fromCustom : base;
    return Math.max(-0.2, Math.min(0.5, Number(r) || 0));
  };
}
