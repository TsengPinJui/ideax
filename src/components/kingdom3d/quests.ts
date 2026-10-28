import { TRAIL } from './stylized/docks';

/**
 * 任務清單：
 * - 單人：收集彩蛋（和 3D 地圖共用收集冊）
 * - 雙人（要先和另一位旅人綁定羈絆）：一起遊船、一起登上聚雲塔、桃樹下同坐、在指定地點一起遊覽 5 分鐘
 * 進度存在這台裝置（localStorage）；兩個人各自的畫面都會判斷，條件一樣就會一起完成
 */

export type DuoQuestId = 'boat' | 'tower' | 'peach' | 'tour-home' | 'tour-plaza' | 'tour-garden' | 'tour-plateau' | 'tour-market';

export interface DuoQuest {
  id: DuoQuestId;
  title: string;
  hint: string;
  /** 一起遊覽的地點 */
  place?: { x: number; z: number; r: number; minY?: number };
}

export const TOUR_SECONDS = 300;

export const DUO_QUESTS: DuoQuest[] = [
  { id: 'boat', title: '羈絆一起遊湖', hint: '和羈絆夥伴搭乘同一艘船，持續遊湖 5 分鐘' },
  { id: 'tower', title: '一起登上聚雲塔', hint: '兩人一起站上聚雲塔塔頂眺望' },
  { id: 'peach', title: '桃樹下同坐', hint: '和羈絆夥伴一起坐在同一棵桃樹下（按 C 坐下），桃花就會落下來' },
  { id: 'tour-home', title: '一起遊覽主島中央廣場', hint: '兩人一起在主島中央廣場待滿 5 分鐘', place: { x: 0, z: 0, r: 17 } },
  { id: 'tour-plaza', title: '一起遊覽論道廣場', hint: '兩人一起在討論島藏書閣前的論道廣場待滿 5 分鐘', place: { x: 72, z: -47, r: 13 } },
  { id: 'tour-garden', title: '一起遊覽江南園林', hint: '兩人一起在徵才島院牆內的江南園林待滿 5 分鐘', place: { x: 82, z: 57, r: 13 } },
  { id: 'tour-market', title: '一起遊覽薈萃廣場', hint: '兩人一起在創意島的薈萃廣場待滿 5 分鐘', place: { x: -68, z: 48, r: 16 } },
  { id: 'tour-plateau', title: '一起遊覽聚雲塔山台', hint: '兩人一起在聚雲塔山台待滿 5 分鐘', place: { x: TRAIL.plateauX, z: TRAIL.plateauZ, r: 14, minY: 25 } },
];

const KEY = 'ideax_kingdom_quests_v1';

export interface QuestProgress {
  /** 完成的雙人任務：夥伴暱稱與日期 */
  done: Partial<Record<DuoQuestId, { with: string; at: string }>>;
  /** 一起遊覽累積秒數 */
  tour: Partial<Record<DuoQuestId, number>>;
}

export function loadQuests(): QuestProgress {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && typeof raw === 'object') return { done: raw.done || {}, tour: raw.tour || {} };
  } catch {
    // ignore
  }
  return { done: {}, tour: {} };
}

export function saveQuests(q: QuestProgress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(q));
  } catch {
    // ignore
  }
}

const today = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())}`;
};

/**
 * 每秒呼叫一次：依自己和夥伴的位置判斷雙人任務
 * 回傳這一次剛完成的任務（給畫面跳提示）
 */
export function stepQuests(
  q: QuestProgress,
  ctx: {
    dt: number;
    partnerName: string;
    me: { x: number; y: number; z: number };
    partner: { x: number; y: number; z: number } | null;
    onBoat: boolean;
    sameBoat?: boolean;
    onTowerTop: boolean;
    /** 兩人一起坐在同一棵桃樹下 */
    peachTogether?: boolean;
  }
): { changed: boolean; completed: DuoQuest[] } {
  const completed: DuoQuest[] = [];
  if (!ctx.partner) return { changed: false, completed };
  const { me, partner } = ctx;
  const d = Math.hypot(me.x - partner.x, me.z - partner.z);
  const dy = Math.abs(me.y - partner.y);
  let changed = false;
  const finish = (qq: DuoQuest) => {
    if (q.done[qq.id]) return;
    q.done[qq.id] = { with: ctx.partnerName, at: today() };
    completed.push(qq);
    changed = true;
  };
  for (const qq of DUO_QUESTS) {
    if (q.done[qq.id]) continue;
    if (qq.id === 'boat') {
      // 必須與羈絆夥伴在同一艘實際船位上連續遊湖五分鐘；中途分開就重新計時。
      if (ctx.sameBoat) {
        const s = (q.tour[qq.id] || 0) + ctx.dt;
        q.tour[qq.id] = Math.min(TOUR_SECONDS, s);
        changed = true;
        if (s >= TOUR_SECONDS) finish(qq);
      } else if (q.tour[qq.id]) {
        q.tour[qq.id] = 0;
        changed = true;
      }
    } else if (qq.id === 'peach') {
      if (ctx.peachTogether) finish(qq);
    } else if (qq.id === 'tower') {
      if (ctx.onTowerTop && d < 5 && partner.y > TRAIL.topFloorY - 2) finish(qq);
    } else if (qq.place) {
      const p = qq.place;
      const inMe = Math.hypot(me.x - p.x, me.z - p.z) < p.r && (!p.minY || me.y > p.minY);
      const inPa = Math.hypot(partner.x - p.x, partner.z - p.z) < p.r && (!p.minY || partner.y > p.minY);
      if (inMe && inPa && d < 18) {
        const s = (q.tour[qq.id] || 0) + ctx.dt;
        q.tour[qq.id] = Math.min(TOUR_SECONDS, s);
        changed = true;
        if (s >= TOUR_SECONDS) finish(qq);
      }
    }
  }
  return { changed, completed };
}
