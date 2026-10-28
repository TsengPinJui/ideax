import { getAuthHeaders } from './authHeader';
import { auth } from './firebase';

/**
 * 等級與經驗值（前端）：只告訴伺服器「完成了哪個任務」，XP、等級、點數一律由伺服器判定
 * - 升級時發出 ideax_xp_levelup 事件（給畫面跳升級提示）
 * - 每次狀態更新發出 ideax_xp_state 事件
 */

export const XP_LEVELUP_EVENT = 'ideax_xp_levelup';
export const XP_STATE_EVENT = 'ideax_xp_state';

export interface XpLite {
  userId: string;
  level: number;
  totalXp: number;
  currentLevelXp: number;
  levelSpan: number;
  toNext: number;
  nextLevelXp: number;
  progress: number;
  isMax: boolean;
  maxLevel: number;
  nextLevel: number | null;
  nextLevelReward: number;
  nextLevelIsSpecial: boolean;
}

export interface XpTaskView {
  id: string;
  title: string;
  desc: string;
  xp: number;
  kind: string;
  group: string;
  status: 'done' | 'todo' | 'partial';
  progress?: string;
}

export interface XpFull extends XpLite {
  tasks: XpTaskView[];
  ledger: { taskId: string; delta: number; reason: string; createdAt: string; levelAfter: number }[];
  rewards: { level: number; points: number; status: string; createdAt: string }[];
  rewardPreview: { special: { level: number; points: number; xp: number }[]; defaultPoints: number };
  resets: { daily: string; weekly: string; today: string; week: string };
}

export interface XpLevelUp {
  level: number;
  points: number;
}

const emit = (name: string, detail: any) => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(name, { detail }));
};

export async function fetchMyXp(full = true): Promise<XpFull | XpLite | null> {
  try {
    const res = await fetch(`/api/xp/me${full ? '' : '?lite=1'}`, { headers: await getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) return null;
    emit(XP_STATE_EVENT, data);
    return data;
  } catch {
    return null;
  }
}

const sent = new Set<string>();

/**
 * 回報完成任務。同一個任務＋目標在這個分頁只送一次；
 * 伺服器回 409（資料還沒同步上去）時會自動稍後重試，重試不會重複發獎（伺服器以事件 ID 去重）。
 */
export async function reportXp(taskId: string, refId = '', opts: { retries?: number } = {}) {
  // 沒登入就不送（訪客不累積經驗值）
  if (!auth.currentUser) return null;
  const key = `${taskId}|${refId}`;
  if (sent.has(key)) return null;
  sent.add(key);
  const retries = opts.retries ?? 4;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch('/api/xp/claim', { method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify({ taskId, refId }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        if (data.state) emit(XP_STATE_EVENT, data.state);
        if (Array.isArray(data.levelUps) && data.levelUps.length) emit(XP_LEVELUP_EVENT, { levelUps: data.levelUps as XpLevelUp[], xp: data.xp, state: data.state });
        else if (data.xp > 0) emit(XP_LEVELUP_EVENT, { levelUps: [], xp: data.xp, state: data.state });
        return data;
      }
      // 409：還找不到剛發表的內容（同步中），稍後重試；其他錯誤就不再重試
      if (res.status !== 409 && res.status < 500) {
        if (res.status === 401) sent.delete(key);
        return null;
      }
    } catch {
      // 網路問題：稍後重試
    }
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  sent.delete(key);
  return null;
}
