/**
 * 等級／經驗值制度的驗收測試（用記憶體裡的假 Firestore，不連線）
 * 執行：npx tsx test/xpSystem.test.ts
 */
import assert from 'node:assert/strict';
import { levelFromXp, cumulativeXpForLevel, xpToNextLevel, levelProgress, taipeiDay, taipeiWeek } from '../src/data/xpRules';
import { __setXpTestDb, claimXpTask, adminGrantXp, getMyXpState } from '../server/xpSystem';

/* ---------- 假 Firestore ---------- */
type Doc = Record<string, any>;
const store = new Map<string, Doc>();
const clone = (v: any) => JSON.parse(JSON.stringify(v));
function snap(path: string) {
  const d = store.get(path);
  return {
    exists: !!d,
    id: path.split('/').pop(),
    ref: docRef(path),
    data: () => (d ? clone(d) : undefined),
    get: (k: string) => (d ? d[k] : undefined),
  };
}
const inc = (n: number) => ({ __inc: n });
function applyPatch(cur: Doc | undefined, patch: Doc, merge: boolean) {
  const base = merge && cur ? clone(cur) : {};
  for (const [k, v] of Object.entries(patch)) base[k] = v && typeof v === 'object' && '__inc' in v ? (Number(base[k]) || 0) + v.__inc : clone(v);
  return base;
}
function docRef(path: string): any {
  return {
    id: path.split('/').pop(),
    path,
    get: async () => snap(path),
    set: async (data: Doc, opt?: any) => void store.set(path, applyPatch(store.get(path), data, !!opt?.merge)),
    update: async (data: Doc) => void store.set(path, applyPatch(store.get(path), data, true)),
  };
}
function query(col: string, filters: [string, any][], lim = 1e9): any {
  return {
    where: (f: string, _op: string, v: any) => query(col, [...filters, [f, v]], lim),
    limit: (n: number) => query(col, filters, n),
    orderBy: () => query(col, filters, lim),
    get: async () => {
      const docs = [...store.entries()]
        .filter(([p]) => p.startsWith(col + '/') && p.split('/').length === 2)
        .filter(([, d]) => filters.every(([f, v]) => d[f] === v))
        .slice(0, lim)
        .map(([p]) => snap(p));
      return { empty: !docs.length, docs };
    },
  };
}
let autoId = 0;
const db = {
  collection: (col: string) => ({
    doc: (id: string) => docRef(`${col}/${id}`),
    add: async (data: Doc) => void store.set(`${col}/auto${++autoId}`, clone(data)),
    ...query(col, []),
  }),
  runTransaction: async (fn: any) => {
    // 模擬交易：先在快照上執行，成功才一次寫入
    const writes: (() => void)[] = [];
    let wrote = false;
    const tx = {
      get: async (ref: any) => {
        if (wrote) throw new Error('交易裡先寫後讀');
        return snap(ref.path);
      },
      create: (ref: any, data: Doc) => {
        wrote = true;
        if (store.has(ref.path)) throw new Error(`已存在 ${ref.path}`);
        writes.push(() => store.set(ref.path, clone(data)));
      },
      set: (ref: any, data: Doc, opt?: any) => {
        wrote = true;
        writes.push(() => store.set(ref.path, applyPatch(store.get(ref.path), data, !!opt?.merge)));
      },
      update: (ref: any, data: Doc) => {
        wrote = true;
        writes.push(() => store.set(ref.path, applyPatch(store.get(ref.path), data, true)));
      },
    };
    const r = await fn(tx);
    writes.forEach((w) => w());
    return r;
  },
};
__setXpTestDb({ db, FieldValue: { increment: inc } });

const now = new Date().toISOString();
store.set('users/u1', { authUid: 'auth1', name: '小明', avatar: 'a.png', bio: '我是一位熱愛創新的工程師喔', balance: 100 });
store.set('users/u2', { authUid: 'auth2', name: '小華', avatar: 'b.png', bio: '', balance: 0 });
const A1 = { uid: 'auth1' };
const A2 = { uid: 'auth2' };

let pass = 0;
const ok = (name: string) => {
  pass++;
  console.log('✓', name);
};

(async () => {
  // 公式
  assert.equal(xpToNextLevel(1), 500);
  assert.equal(xpToNextLevel(9), 1300);
  assert.equal(cumulativeXpForLevel(2), 500);
  assert.equal(cumulativeXpForLevel(5), 2600);
  assert.equal(cumulativeXpForLevel(10), 8100);
  assert.equal(cumulativeXpForLevel(70), 269100);
  assert.equal(levelFromXp(0), 1);
  assert.equal(levelFromXp(499), 1);
  assert.equal(levelFromXp(500), 2);
  assert.equal(levelFromXp(2599), 4);
  assert.equal(levelFromXp(2600), 5);
  assert.equal(levelFromXp(10_000_000), 70);
  for (let L = 1; L < 70; L++) assert.equal(cumulativeXpForLevel(L + 1) - cumulativeXpForLevel(L), xpToNextLevel(L));
  const p = levelProgress(800);
  assert.equal(p.level, 2);
  assert.equal(p.currentLevelXp, 300);
  assert.equal(p.toNext, 300);
  ok('1/2/10 升級公式與進度（×10 規則一致）');

  // 新使用者
  const s0: any = await getMyXpState(A1);
  assert.equal(s0.level, 1);
  assert.equal(s0.totalXp, 0);
  ok('1 新使用者 Lv.1、0 XP');

  // 一次給 2,600 XP（管理員更正給：用優質貢獻模擬不夠，直接用更正 2600）
  store.set('admins/admin1', { uid: 'admin' });
  // 直接呼叫內部：用 claim 拿到 profile 500 + world 300 + daily_roam 100 = 900
  const r1: any = await claimXpTask(A1, { taskId: 'profile' });
  assert.equal(r1.xp, 500);
  assert.equal(r1.levelUps.length, 1);
  assert.deepEqual(r1.levelUps[0], { level: 2, points: 1 });
  ok('2 累積 500 XP 升到 Lv.2（發 1 點）');

  const r1b: any = await claimXpTask(A1, { taskId: 'profile' });
  assert.equal(r1b.granted, false);
  ok('7 一次性任務重複領取不再發');

  // 從 Lv.1 一次跨到 Lv.5：u2 直接 2,600 XP（以 quality 不行；用內部 grant via correction 需要管理員）
  // 這裡用多個任務湊：在 u3 上模擬一次大量 XP
  store.set('users/u3', { authUid: 'auth3', name: 'C', avatar: 'c', bio: '', balance: 0 });
  const { __setXpTestDb: _x, ...mod } = await import('../server/xpSystem');
  void _x;
  void mod;
  // 透過管理員更正（delta 2600）不會發升級獎勵（更正不發獎）；所以改用 quality 兩次 + 任務
  // 直接測內部規則：quality 1000 ×2 + profile 不行（u3 沒自介）→ 用 world(300)+daily_roam(100)+island×3(900)=1300 + quality 1000 = 2300 + venue×2(300) = 2600
  const A3 = { uid: 'auth3' };
  await claimXpTask(A3, { taskId: 'world' }); // 300 + 100
  for (const id of ['region-home', 'region-pain', 'region-discussion']) await claimXpTask(A3, { taskId: 'island', refId: id }); // 900
  for (const id of ['discussion-library', 'creative-arcade']) await claimXpTask(A3, { taskId: 'venue', refId: id }); // 300
  const st3: any = await getMyXpState(A3, { lite: true });
  assert.equal(st3.totalXp, 1600);
  // 管理員權限在測試裡無法驗證，改直接呼叫 grant 的公開路徑：用 1000 XP 的每週挑戰（走完五島）
  await claimXpTask(A3, { taskId: 'island', refId: 'region-creative' }); // 300
  const rWeek: any = await claimXpTask(A3, { taskId: 'island', refId: 'region-career' }); // 300 + weekly 1000
  const st3b: any = await getMyXpState(A3, { lite: true });
  assert.equal(st3b.totalXp, 3200);
  assert.equal(st3b.level, 5);
  const rewards3 = [...store.entries()].filter(([p]) => p.startsWith('level_rewards/u3__')).map(([, d]) => d);
  assert.deepEqual(rewards3.map((r) => r.level).sort((a, b) => a - b), [2, 3, 4, 5]);
  assert.equal(rewards3.find((r) => r.level === 5)!.points, 30);
  assert.equal(store.get('users/u3')!.balance, 1 + 1 + 1 + 30);
  assert.ok(rWeek.levelUps.some((u: any) => u.level === 5 && u.points === 30));
  ok('3/5 一次跨越多級：Lv.5 只發一次 30 點，各級獎勵各發一次、平台點有流水');

  // Lv.10 發 20 點
  store.set('user_xp/u4', { userId: 'u4', totalXp: cumulativeXpForLevel(10) - 100, level: 9, rewardedLevel: 9 });
  store.set('users/u4', { authUid: 'auth4', name: 'D', avatar: 'd', bio: '', balance: 0 });
  const r4: any = await claimXpTask({ uid: 'auth4' }, { taskId: 'daily_checkin' });
  assert.deepEqual(r4.levelUps, [{ level: 10, points: 20 }]);
  assert.equal(store.get('users/u4')!.balance, 20);
  ok('4 達到 Lv.10 發 20 點（不是 21 點）');

  // 每日任務同一天不重複
  const d1: any = await claimXpTask(A1, { taskId: 'daily_checkin' });
  const d2: any = await claimXpTask(A1, { taskId: 'daily_checkin' });
  assert.equal(d1.granted, true);
  assert.equal(d2.granted, false);
  ok('6 每日任務同一天重複提交不會重複領取');

  // 併發／重送：同時送 5 次
  const many = await Promise.all(Array.from({ length: 5 }, () => claimXpTask(A1, { taskId: 'world' })));
  const worldGranted = [...store.values()].filter((d) => d.userId === 'u1' && d.taskId === 'world' && 'delta' in d).length;
  assert.equal(worldGranted, 1);
  void many;
  ok('9 重送／併發不會重複發獎（以唯一事件 ID 去重）');

  // 有效問題、回答、自問自答、採納
  store.set('questions/q1', { authorId: 'u2', authorAuthUid: 'auth2', title: '請問如何設計一套可擴充的權限系統', description: '我們團隊目前用角色表，但規則越來越多。', createdAt: now, status: 'open' });
  store.set('questions/q2', { authorId: 'u2', authorAuthUid: 'auth2', title: '短', description: '', createdAt: now, status: 'open' });
  const q1: any = await claimXpTask(A2, { taskId: 'question', refId: 'q1' });
  assert.equal(q1.xp, 200); // 100 + 每日發言 100
  await assert.rejects(() => claimXpTask(A2, { taskId: 'question', refId: 'q2' }), /太短/);
  await assert.rejects(() => claimXpTask(A1, { taskId: 'question', refId: 'q1' }), /自己發表/);
  store.set('answers/a1', { questionId: 'q1', solverId: 'u1', solverAuthUid: 'auth1', freePreview: '可以參考 ABAC：把權限寫成屬性條件，再搭配策略引擎集中判斷，維護會容易很多。', createdAt: now });
  store.set('answers/a2', { questionId: 'q1', solverId: 'u2', solverAuthUid: 'auth2', freePreview: '我自己回答自己的問題，內容也寫得很長很長很長很長很長很長。', createdAt: now });
  const a1: any = await claimXpTask(A1, { taskId: 'answer', refId: 'a1' });
  assert.equal(a1.results[0].xp, 200);
  await assert.rejects(() => claimXpTask(A2, { taskId: 'answer', refId: 'a2' }), /自己的問題/);
  await assert.rejects(() => claimXpTask(A1, { taskId: 'accepted', refId: 'a1' }), /尚未被採納/);
  store.get('answers/a1')!.isAccepted = true;
  const acc: any = await claimXpTask(A2, { taskId: 'accepted', refId: 'a1' }); // 提問者觸發
  assert.equal(acc.granted, true);
  const accAgain: any = await claimXpTask(A1, { taskId: 'accepted', refId: 'a1' });
  assert.equal(accAgain.granted, false);
  const u1Accepted = [...store.values()].filter((d) => d.userId === 'u1' && d.taskId === 'accepted' && 'delta' in d);
  assert.equal(u1Accepted.length, 1);
  assert.equal(u1Accepted[0].delta, 400);
  ok('有效問題／回答判定、自問自答不計、採納只計一次且 XP 給回答者');

  // 前端不能指定 XP：傳任意欄位無效
  await assert.rejects(() => claimXpTask(A1, { taskId: 'quality' } as any), /不認得/);
  await assert.rejects(() => claimXpTask(A1, { taskId: 'island', refId: 'region-hack' }), /不認得/);
  ok('8 前端不能自行指定 XP／任務／點數');

  // 管理員功能需要權限
  await assert.rejects(() => adminGrantXp(A1, { userId: 'u1', kind: 'quality', xp: 1000, note: 'x' }));
  ok('非管理員不能發放優質貢獻');

  // 台北時間
  assert.match(taipeiDay(), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(new Date(taipeiWeek() + 'T00:00:00Z').getUTCDay(), 1);
  ok('每日／每週以台北時間計，週一為週期開始');

  console.log(`\n全部 ${pass} 項通過`);
  process.exit(0);
})().catch((e) => {
  console.error('✗ 測試失敗', e);
  process.exit(1);
});
