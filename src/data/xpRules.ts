/**
 * 等級、經驗值（XP）與升級點數獎勵的共用規則（前端顯示與伺服器判定用同一份）
 *
 * - XP 與升級門檻採原始制度的 10 倍：從 Lv.L 升到 Lv.L+1 需要 500 + 100 × (L − 1) XP
 * - 到達 Lv.N 的累積門檻：50 × (N − 1) × (N + 8)
 * - 升級點數獎勵另外管理（不乘以 10）：指定等級給「該級合計」點數，其餘每級 1 點
 * - 實際數值以伺服器上的設定（xp_config/main）為準，這裡是預設值；管理員調整後不需要改程式
 */

export const XP_TIMEZONE = 'Asia/Taipei';

/** 從目前等級 L 升到下一級所需的 XP */
export const xpToNextLevel = (level: number) => 500 + 100 * (Math.max(1, Math.floor(level)) - 1);

/** 到達 Lv.N 所需的累積 XP */
export const cumulativeXpForLevel = (level: number) => {
  const n = Math.max(1, Math.floor(level));
  return 50 * (n - 1) * (n + 8);
};

/** 依累積 XP 算出等級（以公式反推，不查表；maxLevel 以上不再升級，XP 仍照常累積） */
export function levelFromXp(totalXp: number, maxLevel = DEFAULT_MAX_LEVEL): number {
  const xp = Math.max(0, Math.floor(Number(totalXp) || 0));
  // 50(N−1)(N+8) ≤ xp → N² + 7N − 8 − xp/50 ≤ 0
  let n = Math.floor((-7 + Math.sqrt(49 + 4 * (8 + xp / 50))) / 2);
  n = Math.max(1, n);
  while (n > 1 && cumulativeXpForLevel(n) > xp) n--;
  while (cumulativeXpForLevel(n + 1) <= xp) n++;
  return Math.min(n, Math.max(1, maxLevel));
}

export interface LevelProgress {
  level: number;
  totalXp: number;
  /** 這一級已累積的 XP */
  currentLevelXp: number;
  /** 這一級升到下一級總共需要的 XP */
  levelSpan: number;
  /** 距離下一級還差多少 XP（已滿級時為 0） */
  toNext: number;
  /** 下一級的累積門檻 */
  nextLevelXp: number;
  /** 0..1 */
  progress: number;
  isMax: boolean;
}

export function levelProgress(totalXp: number, maxLevel = DEFAULT_MAX_LEVEL): LevelProgress {
  const xp = Math.max(0, Math.floor(Number(totalXp) || 0));
  const level = levelFromXp(xp, maxLevel);
  const isMax = level >= maxLevel;
  const base = cumulativeXpForLevel(level);
  const span = xpToNextLevel(level);
  const cur = xp - base;
  return {
    level,
    totalXp: xp,
    currentLevelXp: isMax ? Math.min(cur, span) : cur,
    levelSpan: span,
    toNext: isMax ? 0 : Math.max(0, base + span - xp),
    nextLevelXp: base + span,
    progress: isMax ? 1 : Math.min(1, Math.max(0, cur / span)),
    isMax,
  };
}

/* ---------------- 升級點數獎勵 ---------------- */

export const DEFAULT_MAX_LEVEL = 70;

/** 指定等級的「該級合計獎勵」（取代一般每級 1 點，不再另外加發） */
export const DEFAULT_LEVEL_REWARDS: Record<number, number> = {
  5: 30,
  10: 20,
  20: 30,
  30: 40,
  40: 50,
  50: 60,
  60: 70,
  70: 80,
};
export const DEFAULT_LEVEL_REWARD = 1;

export interface XpConfig {
  maxLevel: number;
  /** 指定等級的點數（該級合計） */
  levelRewards: Record<string, number>;
  /** 其他等級每級的點數 */
  defaultLevelReward: number;
  /** 升級獎勵發到哪一種點數：目前只有「一般平台點」（不可提現） */
  rewardPointType: 'platform';
  /** 各任務的 XP（管理員可調整） */
  taskXp: Record<string, number>;
  /** 重複型任務每日上限 */
  dailyCaps: Record<string, number>;
}

export const rewardForLevel = (level: number, cfg: Pick<XpConfig, 'levelRewards' | 'defaultLevelReward'>) => {
  const v = cfg.levelRewards[String(level)];
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : Math.max(0, Math.floor(cfg.defaultLevelReward));
};

/* ---------------- 任務 ---------------- */

export type XpTaskKind = 'once' | 'oncePerRef' | 'daily' | 'weekly' | 'event' | 'admin';

export interface XpTaskDef {
  id: string;
  title: string;
  desc: string;
  xp: number;
  kind: XpTaskKind;
  /** 在任務頁顯示的群組 */
  group: 'start' | 'explore' | 'daily' | 'weekly' | 'contribute';
}

export const XP_TASKS: XpTaskDef[] = [
  { id: 'profile', title: '完成個人資料設定', desc: '填好名稱、頭像與至少 10 個字的自我介紹', xp: 500, kind: 'once', group: 'start' },
  { id: 'world', title: '首次進入 3D 創點源世界', desc: '從首頁進入實境漫遊或 3D 地圖', xp: 300, kind: 'once', group: 'start' },
  { id: 'island', title: '首次探索每座島嶼', desc: '走上主島、痛點島、討論島、創意島、徵才島（每座一次）', xp: 300, kind: 'oncePerRef', group: 'explore' },
  { id: 'venue', title: '首次進入每個場館', desc: '走進藏書閣、展覽館、電玩城、翰林院、求職廟等場館（每館一次）', xp: 150, kind: 'oncePerRef', group: 'explore' },
  { id: 'daily_checkin', title: '每日簽到', desc: '每天登入 IdeaX', xp: 100, kind: 'daily', group: 'daily' },
  { id: 'daily_roam', title: '每日漫遊', desc: '每天進入 3D 創點源世界逛一逛', xp: 100, kind: 'daily', group: 'daily' },
  { id: 'daily_post', title: '每日發言', desc: '每天發表一則有效的提問或回答', xp: 100, kind: 'daily', group: 'daily' },
  { id: 'weekly_explore', title: '每週探索挑戰', desc: '同一週內走過全部五座島嶼', xp: 1000, kind: 'weekly', group: 'weekly' },
  { id: 'question', title: '提出有效問題', desc: '標題加內容至少 20 字；每日最多計 5 則', xp: 100, kind: 'event', group: 'contribute' },
  { id: 'answer', title: '提供有效回答', desc: '回答別人的問題、至少 30 字；同一題只計一次，每日最多 10 則', xp: 200, kind: 'event', group: 'contribute' },
  { id: 'accepted', title: '回答被提問者採納', desc: '每筆回答一次（不含自問自答）', xp: 400, kind: 'event', group: 'contribute' },
  { id: 'quality', title: '優質專業貢獻', desc: '經平台審核的優質內容，獎勵 500–1,000 XP', xp: 500, kind: 'admin', group: 'contribute' },
];

export const DEFAULT_DAILY_CAPS: Record<string, number> = { question: 5, answer: 10, accepted: 5 };

export const DEFAULT_XP_CONFIG: XpConfig = {
  maxLevel: DEFAULT_MAX_LEVEL,
  levelRewards: Object.fromEntries(Object.entries(DEFAULT_LEVEL_REWARDS).map(([k, v]) => [k, v])),
  defaultLevelReward: DEFAULT_LEVEL_REWARD,
  rewardPointType: 'platform',
  taskXp: Object.fromEntries(XP_TASKS.map((t) => [t.id, t.xp])),
  dailyCaps: { ...DEFAULT_DAILY_CAPS },
};

/** 3D 世界：五座島（regionId） */
export const XP_ISLANDS: Record<string, string> = {
  'region-home': '主島',
  'region-pain': '痛點島',
  'region-discussion': '討論島',
  'region-creative': '創意島',
  'region-career': '徵才島',
};

/** 3D 世界：場館（建築 id）。只有在這份名單裡的才會給「首次進入場館」XP */
export const XP_VENUES: Record<string, string> = {
  'discussion-library': '藏書閣',
  'discussion-street': '茶藝街主茶樓',
  'discussion-workshop': '大熊匠鋪',
  'creative-exhibition': '展覽館',
  'creative-arcade': '電玩城',
  'career-academy': '翰林院',
  'career-temple': '求職廟',
  'hanlin-headhunter': '人才獵頭／媒合專家',
  'pain-innovation-tower': '創點樓',
  'plateau-pagoda': '聚雲塔',
};

/** 台北時間的日期字串 YYYY-MM-DD */
export function taipeiDay(d = new Date()): string {
  return d.toLocaleDateString('en-CA', { timeZone: XP_TIMEZONE });
}

/** 台北時間的週期：以週一為一週的開始，回傳那個週一的日期 */
export function taipeiWeek(d = new Date()): string {
  const day = taipeiDay(d);
  const [y, m, dd] = day.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, dd));
  const dow = (utc.getUTCDay() + 6) % 7; // 週一 = 0
  utc.setUTCDate(utc.getUTCDate() - dow);
  return utc.toISOString().slice(0, 10);
}
