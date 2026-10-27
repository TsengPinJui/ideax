import type { TimeOfDay } from './stylized/environment';

/**
 * 從 3D 世界點進痛點詳情、刊登頁或其他功能後，回來時接著站在原本的位置與樓層。
 * 只存在這個分頁（sessionStorage），20 分鐘內有效；回到 3D 套用後就清掉，主動按「離開」時也會清掉。
 */
export interface KingdomResume {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  level: number;
  towerId: string | null;
  timeOfDay: TimeOfDay;
  savedAt: number;
}

const KEY = 'ideax_kingdom_resume_v1';
const MAX_AGE_MS = 20 * 60 * 1000;

export function saveKingdomResume(r: Omit<KingdomResume, 'savedAt'>) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...r, savedAt: Date.now() }));
  } catch {
    // 無痕模式等無法存時，就照舊從出生點開始
  }
}

export function clearKingdomResume() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function peekKingdomResume(): KingdomResume | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as KingdomResume;
    const nums = [r.x, r.y, r.z, r.yaw, r.pitch, r.level];
    if (nums.some((n) => typeof n !== 'number' || !Number.isFinite(n))) return null;
    if (!r.savedAt || Date.now() - r.savedAt > MAX_AGE_MS) return null;
    if (!['day', 'dusk', 'night'].includes(r.timeOfDay)) r.timeOfDay = 'dusk';
    return r;
  } catch {
    return null;
  }
}
