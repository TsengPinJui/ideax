/**
 * 等級、經驗值（XP）與升級點數獎勵（伺服器端判定）
 *
 * 資料（全部只有服務帳戶能寫；Firestore 規則的萬用規則讓這些集合只有管理員能讀寫）：
 * - user_xp/{userId}            權威的等級與累積 XP：{ totalXp, level, rewardedLevel, daily: { day, counts }, updatedAt }
 * - xp_ledger/{eventId}         XP 流水（文件編號＝唯一事件 ID，重送同一事件不會重複發放）
 * - task_claims/{userId__taskId__period}  任務完成紀錄（一次性、每日、每週）
 * - level_rewards/{userId__L{n}} 升級獎勵流水（每個等級只會有一筆）
 * - weekly_visits/{userId__週}   每週探索挑戰：這一週走過哪些島
 * - xp_pairs/{提問者__回答者__月} 採納防刷：同一對帳號每月最多計 3 次
 * - xp_flags/{auto}             可疑行為紀錄（不發獎勵，留給管理員查）
 * - xp_config/main、xp_config_log/{auto}  可調整的設定與調整紀錄
 * users/{userId} 另外存一份 level、totalXp 給畫面顯示用（以 user_xp 為準）。
 *
 * 升級點數一律發到「一般平台點」（users.balance，不可提現），並在 points_ledger 留下 source=level_reward 的紀錄。
 */
import { getApps } from 'firebase-admin/app';
import { createHash } from 'node:crypto';
import firebaseConfigJson from '../firebase-applet-config.json';
import { hasAdminCredentials, isVerifiedAdmin } from './competitionService';
import { findUserDocByAuth, PointsError } from './pointsLedger';
import {
  DEFAULT_XP_CONFIG,
  XP_TASKS,
  XP_ISLANDS,
  XP_VENUES,
  XpConfig,
  levelFromXp,
  levelProgress,
  rewardForLevel,
  taipeiDay,
  taipeiWeek,
} from '../src/data/xpRules';

type AuthUser = { uid: string; email?: string; emailVerified?: boolean };

let cfgCache: { at: number; cfg: XpConfig } | null = null;

// 測試用：注入假的資料庫（只在測試腳本裡呼叫）
let testDb: { db: any; FieldValue: any } | null = null;
export function __setXpTestDb(v: { db: any; FieldValue: any } | null) {
  testDb = v;
  cfgCache = null;
}

async function getAdminDb() {
  if (testDb) return testDb;
  if (!hasAdminCredentials) throw new PointsError('伺服器尚未設定 FIREBASE_SERVICE_ACCOUNT', 503);
  const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
  const app = getApps()[0];
  const dbId = (firebaseConfigJson as any).firestoreDatabaseId;
  return { db: dbId ? getFirestore(app, dbId) : getFirestore(app), FieldValue };
}

const sha = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 40);
const nowIso = () => new Date().toISOString();

/* ---------------- 設定（快取 60 秒） ---------------- */


function mergeConfig(raw: any): XpConfig {
  const d = DEFAULT_XP_CONFIG;
  const num = (v: any, def: number, min = 0, max = 1e7) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n >= min && n <= max ? n : def;
  };
  const rewards: Record<string, number> = { ...d.levelRewards };
  if (raw?.levelRewards && typeof raw.levelRewards === 'object') {
    for (const [k, v] of Object.entries(raw.levelRewards)) {
      const lv = Math.floor(Number(k));
      if (lv >= 2 && lv <= 999) rewards[String(lv)] = num(v, 0, 0, 100000);
    }
  }
  const taskXp: Record<string, number> = { ...d.taskXp };
  if (raw?.taskXp && typeof raw.taskXp === 'object') {
    for (const t of XP_TASKS) if (raw.taskXp[t.id] !== undefined) taskXp[t.id] = num(raw.taskXp[t.id], d.taskXp[t.id], 0, 100000);
  }
  const dailyCaps: Record<string, number> = { ...d.dailyCaps };
  if (raw?.dailyCaps && typeof raw.dailyCaps === 'object') {
    for (const k of Object.keys(d.dailyCaps)) if (raw.dailyCaps[k] !== undefined) dailyCaps[k] = num(raw.dailyCaps[k], d.dailyCaps[k], 0, 1000);
  }
  return {
    maxLevel: num(raw?.maxLevel, d.maxLevel, 2, 999),
    levelRewards: rewards,
    defaultLevelReward: num(raw?.defaultLevelReward, d.defaultLevelReward, 0, 100000),
    rewardPointType: 'platform',
    taskXp,
    dailyCaps,
  };
}

export async function getXpConfig(): Promise<XpConfig> {
  if (cfgCache && Date.now() - cfgCache.at < 60_000) return cfgCache.cfg;
  try {
    const { db } = await getAdminDb();
    const snap = await db.collection('xp_config').doc('main').get();
    const cfg = mergeConfig(snap.exists ? snap.data() : null);
    cfgCache = { at: Date.now(), cfg };
    return cfg;
  } catch {
    return mergeConfig(null);
  }
}

/* ---------------- 核心：發放 XP（交易內，冪等） ---------------- */

interface GrantInput {
  userId: string;
  taskId: string;
  /** 任務週期（一次性任務空白、每日＝日期、每週＝週一日期、每個島／場館＝其 id） */
  period: string;
  xp: number;
  reason: string;
  refId?: string;
  /** 這筆算進每日上限的類別 */
  capKey?: string;
  cap?: number;
  /** 要不要寫一筆任務完成紀錄 */
  claimDoc?: boolean;
  by?: string;
}

export interface LevelUpReward {
  level: number;
  points: number;
}

export interface GrantResult {
  granted: boolean;
  reason?: string;
  xp: number;
  totalXp: number;
  level: number;
  levelUps: LevelUpReward[];
}

async function grantXp(input: GrantInput): Promise<GrantResult> {
  const { db } = await getAdminDb();
  const cfg = await getXpConfig();
  const eventId = sha(`${input.userId}|${input.taskId}|${input.period}|${input.refId || ''}`);
  const ledgerRef = db.collection('xp_ledger').doc(eventId);
  const xpRef = db.collection('user_xp').doc(input.userId);
  const userRef = db.collection('users').doc(input.userId);
  const claimRef = db.collection('task_claims').doc(`${input.userId}__${input.taskId}__${input.period || 'once'}`.slice(0, 600));
  const today = taipeiDay();

  return db.runTransaction(async (tx: any) => {
    const [prior, xpSnap, userSnap] = await Promise.all([tx.get(ledgerRef), tx.get(xpRef), tx.get(userRef)]);
    const cur = xpSnap.exists ? xpSnap.data() : {};
    const totalBefore = Math.max(0, Math.floor(Number(cur.totalXp) || 0));
    const levelBefore = levelFromXp(totalBefore, cfg.maxLevel);
    if (prior.exists) return { granted: false, reason: 'already', xp: 0, totalXp: totalBefore, level: levelBefore, levelUps: [] };
    if (!userSnap.exists) throw new PointsError('找不到會員資料', 404);
    const daily = cur.daily && cur.daily.day === today ? { day: today, counts: { ...(cur.daily.counts || {}) } } : { day: today, counts: {} as Record<string, number> };
    if (input.capKey && input.cap !== undefined && (daily.counts[input.capKey] || 0) >= input.cap) {
      return { granted: false, reason: 'cap', xp: 0, totalXp: totalBefore, level: levelBefore, levelUps: [] };
    }
    const xp = Math.max(0, Math.floor(input.xp));
    const totalAfter = totalBefore + xp;
    const levelAfter = levelFromXp(totalAfter, cfg.maxLevel);
    // 升級獎勵：從「已發到的等級」的下一級開始，逐級檢查（一次跨很多級也每級各發一次）
    const rewardedLevel = Math.max(1, Math.floor(Number(cur.rewardedLevel) || 1));
    const levels: number[] = [];
    for (let L = rewardedLevel + 1; L <= levelAfter; L++) levels.push(L);
    const rewardRefs = levels.map((L) => db.collection('level_rewards').doc(`${input.userId}__L${L}`));
    const rewardSnaps = rewardRefs.length ? await Promise.all(rewardRefs.map((r) => tx.get(r))) : [];

    // ── 以下開始寫入 ──
    const createdAt = nowIso();
    tx.create(ledgerRef, {
      eventId,
      userId: input.userId,
      taskId: input.taskId,
      period: input.period || null,
      refId: input.refId || null,
      delta: xp,
      reason: input.reason,
      totalAfter,
      levelAfter,
      by: input.by || 'system',
      createdAt,
    });
    if (input.claimDoc) {
      tx.set(claimRef, { userId: input.userId, taskId: input.taskId, period: input.period || 'once', status: 'claimed', xp, eventId, claimedAt: createdAt });
    }
    if (input.capKey) daily.counts[input.capKey] = (daily.counts[input.capKey] || 0) + 1;

    const levelUps: LevelUpReward[] = [];
    let balance = Number(userSnap.get('balance')) || 0;
    levels.forEach((L, i) => {
      if (rewardSnaps[i]?.exists) return;
      const points = rewardForLevel(L, cfg);
      levelUps.push({ level: L, points });
      tx.create(rewardRefs[i], {
        rewardId: `${input.userId}__L${L}`,
        userId: input.userId,
        level: L,
        points,
        rewardType: cfg.rewardPointType,
        status: 'granted',
        eventId,
        createdAt,
      });
      if (points > 0) {
        balance += points;
        tx.create(db.collection('points_ledger').doc(`level_reward_${sha(`${input.userId}|L${L}`)}`), {
          userId: input.userId,
          op: 'earn',
          source: 'level_reward',
          delta: points,
          balanceAfter: balance,
          level: L,
          note: `升級到 Lv.${L} 獎勵 ${points} 平台點`,
          createdAt,
        });
      }
    });
    const newRewarded = Math.max(rewardedLevel, levelAfter);
    tx.set(xpRef, { userId: input.userId, totalXp: totalAfter, level: levelAfter, rewardedLevel: newRewarded, daily, updatedAt: createdAt }, { merge: true });
    const userPatch: Record<string, any> = { level: levelAfter, totalXp: totalAfter, xpUpdatedAt: createdAt };
    if (levelUps.some((u) => u.points > 0)) userPatch.balance = balance;
    tx.update(userRef, userPatch);
    return { granted: true, xp, totalXp: totalAfter, level: levelAfter, levelUps };
  });
}

/* ---------------- 有效性判定 ---------------- */

const plain = (s: any) =>
  String(s || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[#*_`>\-\[\]()!]/g, ' ')
    .replace(/\s+/g, '')
    .trim();

async function flag(userId: string, kind: string, detail: Record<string, any>) {
  try {
    const { db } = await getAdminDb();
    await db.collection('xp_flags').add({ userId, kind, ...detail, createdAt: nowIso() });
  } catch {
    // 記錄失敗不影響主流程
  }
}

const within = (iso: any, ms: number) => {
  const t = Date.parse(String(iso || ''));
  return Number.isFinite(t) && Date.now() - t < ms;
};

/* ---------------- 對外：領取任務 ---------------- */

export async function claimXpTask(auth: AuthUser, body: { taskId?: string; refId?: string }) {
  const { db } = await getAdminDb();
  const userRef = await findUserDocByAuth(auth, { db });
  if (!userRef) throw new PointsError('找不到您的會員資料，請稍後重新整理', 404);
  const userId = userRef.id;
  const cfg = await getXpConfig();
  const taskId = String(body.taskId || '');
  const refId = body.refId ? String(body.refId).slice(0, 200) : '';
  const xpOf = (id: string) => cfg.taskXp[id] ?? 0;
  const day = taipeiDay();
  const week = taipeiWeek();
  const results: GrantResult[] = [];
  const add = (r: GrantResult) => results.push(r);

  switch (taskId) {
    case 'profile': {
      const u = (await userRef.get()).data() || {};
      const missing: string[] = [];
      if (!String(u.name || '').trim() || /^(訪客|旅人|新會員)$/.test(String(u.name).trim())) missing.push('名稱');
      if (!String(u.avatar || '').trim()) missing.push('頭像');
      if (plain(u.bio).length < 10) missing.push('自我介紹（至少 10 字）');
      if (missing.length) throw new PointsError(`個人資料還差：${missing.join('、')}`, 400);
      add(await grantXp({ userId, taskId, period: 'once', xp: xpOf(taskId), reason: '完成個人資料設定', claimDoc: true }));
      break;
    }
    case 'world': {
      add(await grantXp({ userId, taskId, period: 'once', xp: xpOf(taskId), reason: '首次進入 3D 創點源世界', claimDoc: true }));
      add(await grantXp({ userId, taskId: 'daily_roam', period: day, xp: xpOf('daily_roam'), reason: '每日漫遊', claimDoc: true }));
      break;
    }
    case 'island': {
      if (!XP_ISLANDS[refId]) throw new PointsError('不認得的島嶼', 400);
      add(await grantXp({ userId, taskId, period: refId, xp: xpOf(taskId), reason: `首次探索${XP_ISLANDS[refId]}`, refId, claimDoc: true }));
      // 每週探索挑戰：同一週內走過全部五座島
      const wRef = db.collection('weekly_visits').doc(`${userId}__${week}`);
      const islands: string[] = await db.runTransaction(async (tx: any) => {
        const s = await tx.get(wRef);
        const list: string[] = s.exists ? s.get('islands') || [] : [];
        if (!list.includes(refId)) list.push(refId);
        tx.set(wRef, { userId, week, islands: list, updatedAt: nowIso() }, { merge: true });
        return list;
      });
      if (Object.keys(XP_ISLANDS).every((id) => islands.includes(id))) {
        add(await grantXp({ userId, taskId: 'weekly_explore', period: week, xp: xpOf('weekly_explore'), reason: '每週探索挑戰：一週走遍五座島', claimDoc: true }));
      }
      break;
    }
    case 'venue': {
      if (!XP_VENUES[refId]) throw new PointsError('不認得的場館', 400);
      add(await grantXp({ userId, taskId, period: refId, xp: xpOf(taskId), reason: `首次進入${XP_VENUES[refId]}`, refId, claimDoc: true }));
      break;
    }
    case 'daily_checkin':
    case 'daily_roam': {
      add(await grantXp({ userId, taskId, period: day, xp: xpOf(taskId), reason: taskId === 'daily_checkin' ? '每日簽到' : '每日漫遊', claimDoc: true }));
      break;
    }
    case 'question': {
      const q = await db.collection('questions').doc(refId).get();
      if (!q.exists) throw new PointsError('還找不到這則問題，請稍後再試', 409);
      const d = q.data() || {};
      const mine = d.authorAuthUid === auth.uid || d.authorId === userId;
      if (!mine) throw new PointsError('只能領取自己發表的問題', 403);
      if (d.isOfficial || d.status === 'delisted') throw new PointsError('這則問題不符合獎勵條件', 400);
      if (!within(d.createdAt, 3 * 24 * 3600 * 1000)) throw new PointsError('只有 3 天內發表的問題可以領取', 400);
      if (plain(d.title).length + plain(d.description).length < 20) throw new PointsError('問題內容太短（標題加內容至少 20 字）', 400);
      const r = await grantXp({ userId, taskId, period: 'q', refId, xp: xpOf(taskId), reason: '提出有效問題', capKey: 'question', cap: cfg.dailyCaps.question });
      if (r.reason === 'cap') await flag(userId, 'question_cap', { refId });
      add(r);
      if (r.granted) add(await grantXp({ userId, taskId: 'daily_post', period: day, xp: xpOf('daily_post'), reason: '每日發言', claimDoc: true }));
      break;
    }
    case 'answer': {
      const a = await db.collection('answers').doc(refId).get();
      if (!a.exists) throw new PointsError('還找不到這則回答，請稍後再試', 409);
      const d = a.data() || {};
      const mine = d.solverAuthUid === auth.uid || d.solverId === userId;
      if (!mine) throw new PointsError('只能領取自己的回答', 403);
      if (!within(d.createdAt, 3 * 24 * 3600 * 1000)) throw new PointsError('只有 3 天內的回答可以領取', 400);
      const q = d.questionId ? await db.collection('questions').doc(String(d.questionId)).get() : null;
      if (!q || !q.exists) throw new PointsError('找不到回答的問題', 400);
      const qd = q.data() || {};
      if (qd.authorAuthUid === auth.uid || qd.authorId === userId) {
        await flag(userId, 'self_answer', { refId, questionId: d.questionId });
        throw new PointsError('回答自己的問題不計經驗值', 400);
      }
      let text = plain(d.freePreview) + plain(d.fullContent);
      if (text.length < 30 && d.hasProtectedContent) {
        const sec = await db.collection('answer_secrets').doc(refId).get();
        if (sec.exists) text += plain(sec.get('fullContent'));
      }
      if (text.length < 30) throw new PointsError('回答內容太短（至少 30 字）', 400);
      // 同一題只計一次
      const r = await grantXp({ userId, taskId, period: `q:${d.questionId}`, refId: String(d.questionId), xp: xpOf(taskId), reason: '提供有效回答', capKey: 'answer', cap: cfg.dailyCaps.answer });
      if (r.reason === 'cap') await flag(userId, 'answer_cap', { refId });
      add(r);
      if (r.granted) add(await grantXp({ userId, taskId: 'daily_post', period: day, xp: xpOf('daily_post'), reason: '每日發言', claimDoc: true }));
      break;
    }
    case 'accepted': {
      // 回答者或提問者都可以觸發；XP 一律給回答者
      const a = await db.collection('answers').doc(refId).get();
      if (!a.exists) throw new PointsError('還找不到這則回答，請稍後再試', 409);
      const d = a.data() || {};
      if (d.isAccepted !== true) throw new PointsError('這則回答尚未被採納', 409);
      const q = d.questionId ? await db.collection('questions').doc(String(d.questionId)).get() : null;
      if (!q || !q.exists) throw new PointsError('找不到回答的問題', 400);
      const qd = q.data() || {};
      const solverId = String(d.solverId || '');
      const askerId = String(qd.authorId || '');
      const callerIsSolver = d.solverAuthUid === auth.uid || solverId === userId;
      const callerIsAsker = qd.authorAuthUid === auth.uid || askerId === userId;
      if (!callerIsSolver && !callerIsAsker) throw new PointsError('沒有權限', 403);
      if (!solverId || solverId === askerId || (d.solverAuthUid && d.solverAuthUid === qd.authorAuthUid)) {
        await flag(solverId || userId, 'self_accept', { refId });
        throw new PointsError('自問自答的採納不計經驗值', 400);
      }
      // 防互刷：同一對帳號每月最多計 3 次
      const month = day.slice(0, 7);
      const pairRef = db.collection('xp_pairs').doc(`${askerId}__${solverId}__${month}`);
      const pair = await pairRef.get();
      if ((Number(pair.get?.('count')) || 0) >= 3) {
        await flag(solverId, 'accept_pair_cap', { refId, askerId });
        add({ granted: false, reason: 'pair_cap', xp: 0, totalXp: 0, level: 1, levelUps: [] });
        break;
      }
      const r = await grantXp({ userId: solverId, taskId, period: 'a', refId, xp: xpOf(taskId), reason: '回答被提問者採納', capKey: 'accepted', cap: cfg.dailyCaps.accepted });
      if (r.granted) {
        const { FieldValue } = await getAdminDb();
        await pairRef.set({ askerId, solverId, month, count: FieldValue.increment(1), updatedAt: nowIso() }, { merge: true });
      }
      // 提問者觸發時，回傳給他的不是自己的進度
      add(callerIsSolver ? r : { ...r, levelUps: [], totalXp: 0, level: 0, reason: r.granted ? 'granted_to_solver' : r.reason });
      break;
    }
    default:
      throw new PointsError('不認得的任務', 400);
  }

  const granted = results.filter((r) => r.granted);
  const xp = granted.reduce((a, r) => a + r.xp, 0);
  const levelUps = results.flatMap((r) => r.levelUps);
  return { granted: granted.length > 0, xp, levelUps, results: results.map((r) => ({ granted: r.granted, reason: r.reason, xp: r.xp })), state: await getMyXpState(auth, { lite: true }) };
}

/* ---------------- 對外：查詢自己的等級、任務、紀錄 ---------------- */

export async function getMyXpState(auth: AuthUser, opts: { lite?: boolean } = {}) {
  const { db } = await getAdminDb();
  const userRef = await findUserDocByAuth(auth, { db });
  if (!userRef) throw new PointsError('找不到您的會員資料', 404);
  const userId = userRef.id;
  const cfg = await getXpConfig();
  const xpSnap = await db.collection('user_xp').doc(userId).get();
  const totalXp = xpSnap.exists ? Math.max(0, Math.floor(Number(xpSnap.get('totalXp')) || 0)) : 0;
  const prog = levelProgress(totalXp, cfg.maxLevel);
  const nextLevel = prog.isMax ? null : prog.level + 1;
  const base = {
    userId,
    ...prog,
    maxLevel: cfg.maxLevel,
    nextLevel,
    nextLevelReward: nextLevel ? rewardForLevel(nextLevel, cfg) : 0,
    nextLevelIsSpecial: nextLevel ? cfg.levelRewards[String(nextLevel)] !== undefined : false,
  };
  if (opts.lite) return base;
  const day = taipeiDay();
  const week = taipeiWeek();
  const [claimsSnap, ledgerSnap, rewardsSnap, weekSnap] = await Promise.all([
    db.collection('task_claims').where('userId', '==', userId).limit(400).get(),
    db.collection('xp_ledger').where('userId', '==', userId).limit(200).get(),
    db.collection('level_rewards').where('userId', '==', userId).limit(200).get(),
    db.collection('weekly_visits').doc(`${userId}__${week}`).get(),
  ]);
  const claims = claimsSnap.docs.map((d: any) => d.data());
  const has = (taskId: string, period: string) => claims.some((c: any) => c.taskId === taskId && c.period === period);
  const daily = xpSnap.exists && xpSnap.get('daily')?.day === day ? xpSnap.get('daily').counts || {} : {};
  const tasks = XP_TASKS.map((t) => {
    let status: 'done' | 'todo' | 'partial' = 'todo';
    let progress: string | undefined;
    if (t.kind === 'once') status = has(t.id, 'once') ? 'done' : 'todo';
    else if (t.kind === 'daily') status = has(t.id, day) ? 'done' : 'todo';
    else if (t.kind === 'weekly') {
      status = has(t.id, week) ? 'done' : 'todo';
      const n = weekSnap.exists ? (weekSnap.get('islands') || []).length : 0;
      progress = `${n}/5 座島`;
    } else if (t.kind === 'oncePerRef') {
      const list = t.id === 'island' ? XP_ISLANDS : XP_VENUES;
      const n = Object.keys(list).filter((id) => has(t.id, id)).length;
      status = n === Object.keys(list).length ? 'done' : n > 0 ? 'partial' : 'todo';
      progress = `${n}/${Object.keys(list).length}`;
    } else if (t.kind === 'event' && cfg.dailyCaps[t.id] !== undefined) {
      progress = `今日 ${daily[t.id] || 0}/${cfg.dailyCaps[t.id]}`;
    }
    return { ...t, xp: cfg.taskXp[t.id] ?? t.xp, status, progress };
  });
  const ledger = ledgerSnap.docs
    .map((d: any) => d.data())
    .sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 50)
    .map((e: any) => ({ taskId: e.taskId, delta: e.delta, reason: e.reason, createdAt: e.createdAt, levelAfter: e.levelAfter }));
  const rewards = rewardsSnap.docs
    .map((d: any) => d.data())
    .sort((a: any, b: any) => b.level - a.level)
    .map((r: any) => ({ level: r.level, points: r.points, status: r.status, createdAt: r.createdAt }));
  const preview = Array.from({ length: Math.min(cfg.maxLevel, 70) - 1 }, (_, i) => i + 2)
    .filter((L) => cfg.levelRewards[String(L)] !== undefined)
    .map((L) => ({ level: L, points: rewardForLevel(L, cfg), xp: 50 * (L - 1) * (L + 8) }));
  return {
    ...base,
    tasks,
    ledger,
    rewards,
    rewardPreview: { special: preview, defaultPoints: cfg.defaultLevelReward },
    resets: { daily: '每天 00:00（台北時間）', weekly: '每週一 00:00（台北時間）', today: day, week },
  };
}

/* ---------------- 管理員 ---------------- */

async function requireAdmin(auth: AuthUser) {
  if (!(await isVerifiedAdmin(auth.uid))) throw new PointsError('需要管理員權限', 403);
}

export async function adminGetXpConfig(auth: AuthUser) {
  await requireAdmin(auth);
  const { db } = await getAdminDb();
  const logs = await db.collection('xp_config_log').orderBy('createdAt', 'desc').limit(30).get();
  return { config: await getXpConfig(), logs: logs.docs.map((d: any) => d.data()) };
}

export async function adminSetXpConfig(auth: AuthUser, body: any) {
  await requireAdmin(auth);
  const { db } = await getAdminDb();
  const before = await getXpConfig();
  const next = mergeConfig({ ...before, ...(body?.config || {}) });
  await db.collection('xp_config').doc('main').set({ ...next, updatedAt: nowIso(), updatedBy: auth.uid });
  await db.collection('xp_config_log').add({ before, after: next, by: auth.uid, note: String(body?.note || '').slice(0, 300), createdAt: nowIso() });
  cfgCache = null;
  return { config: next };
}

export async function adminGetUserXp(auth: AuthUser, userId: string) {
  await requireAdmin(auth);
  const { db } = await getAdminDb();
  const cfg = await getXpConfig();
  const [xpSnap, ledger, rewards, flags] = await Promise.all([
    db.collection('user_xp').doc(userId).get(),
    db.collection('xp_ledger').where('userId', '==', userId).limit(300).get(),
    db.collection('level_rewards').where('userId', '==', userId).limit(200).get(),
    db.collection('xp_flags').where('userId', '==', userId).limit(100).get(),
  ]);
  const totalXp = xpSnap.exists ? Number(xpSnap.get('totalXp')) || 0 : 0;
  const sortDesc = (a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt));
  return {
    userId,
    ...levelProgress(totalXp, cfg.maxLevel),
    ledger: ledger.docs.map((d: any) => d.data()).sort(sortDesc),
    rewards: rewards.docs.map((d: any) => d.data()).sort((a: any, b: any) => a.level - b.level),
    flags: flags.docs.map((d: any) => d.data()).sort(sortDesc),
  };
}

/** 管理員發放優質貢獻（500–1,000 XP），或以更正紀錄調整（不刪除原紀錄） */
export async function adminGrantXp(auth: AuthUser, body: any) {
  await requireAdmin(auth);
  const userId = String(body?.userId || '').trim();
  if (!userId) throw new PointsError('請填會員 ID', 400);
  const kind = body?.kind === 'correction' ? 'correction' : 'quality';
  const note = String(body?.note || '').trim().slice(0, 300);
  if (!note) throw new PointsError('請填寫原因', 400);
  const refId = String(body?.refId || '').trim().slice(0, 200) || `manual-${Date.now()}`;
  if (kind === 'quality') {
    const xp = Math.floor(Number(body?.xp));
    if (!(xp >= 500 && xp <= 1000)) throw new PointsError('優質貢獻獎勵需介於 500–1,000 XP', 400);
    return grantXp({ userId, taskId: 'quality', period: 'quality', refId, xp, reason: `優質專業貢獻：${note}`, by: auth.uid });
  }
  // 更正：寫一筆負的 XP 流水（不刪除原紀錄；已發的升級獎勵不收回、等級依新 XP 重算）
  const delta = Math.floor(Number(body?.xp));
  if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 100000) throw new PointsError('更正數值不正確', 400);
  const { db } = await getAdminDb();
  const cfg = await getXpConfig();
  const eventId = sha(`${userId}|correction|${refId}`);
  return db.runTransaction(async (tx: any) => {
    const ledgerRef = db.collection('xp_ledger').doc(eventId);
    const xpRef = db.collection('user_xp').doc(userId);
    const userRef = db.collection('users').doc(userId);
    const [prior, xpSnap, userSnap] = await Promise.all([tx.get(ledgerRef), tx.get(xpRef), tx.get(userRef)]);
    if (prior.exists) throw new PointsError('這筆更正已經處理過', 409);
    if (!userSnap.exists) throw new PointsError('找不到會員', 404);
    const total = Math.max(0, (Number(xpSnap.exists ? xpSnap.get('totalXp') : 0) || 0) + delta);
    const level = levelFromXp(total, cfg.maxLevel);
    const createdAt = nowIso();
    tx.create(ledgerRef, { eventId, userId, taskId: 'correction', refId, delta, reason: `更正：${note}`, totalAfter: total, levelAfter: level, by: auth.uid, createdAt });
    tx.set(xpRef, { userId, totalXp: total, level, updatedAt: createdAt }, { merge: true });
    tx.update(userRef, { level, totalXp: total, xpUpdatedAt: createdAt });
    return { granted: true, xp: delta, totalXp: total, level, levelUps: [] };
  });
}

/** 公開的獎勵設定（給任務頁顯示） */
export async function publicXpConfig() {
  const cfg = await getXpConfig();
  return { maxLevel: cfg.maxLevel, levelRewards: cfg.levelRewards, defaultLevelReward: cfg.defaultLevelReward, taskXp: cfg.taskXp, dailyCaps: cfg.dailyCaps };
}
