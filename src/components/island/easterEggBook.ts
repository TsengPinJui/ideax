/**
 * 彩蛋收集冊（3D 地圖與實境漫遊共用同一本）
 * - 存在這台裝置的瀏覽器（localStorage），首次觸發依發現順序刊登在收集冊格子，記下解鎖日期
 * - 任一邊收集到，另一邊打開時就看得到（同頁面以事件同步，跨分頁以 storage 事件同步）
 */

export const EASTER_EGG_STORAGE_KEY = 'ideax_island_easter_egg_book_v1';
export const EASTER_EGG_EVENT = 'ideax_easter_egg_book_changed';
export const TOTAL_ISLAND_EASTER_EGGS = 38;

export interface EasterEggRecord {
  verse: string;
  unlockedAt: string;
}

const strip = (v: string) => (v || '').trim().replace(/^[「『]+|[」』]+$/g, '').trim();

export function loadEasterEggBook(): EasterEggRecord[] {
  try {
    const raw = localStorage.getItem(EASTER_EGG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.verse === 'string' && typeof item.unlockedAt === 'string')
      .map((item) => ({ verse: item.verse, unlockedAt: String(item.unlockedAt).split(' ')[0] }));
  } catch {
    return [];
  }
}

/**
 * 觸發一則彩蛋：第一次觸發就收進收集冊
 * 回傳 null 表示詩句是空的；added=false 表示早就收集過
 */
export function addEasterEgg(rawVerse: string): { added: boolean; slotIndex: number; verse: string; unlockedAt: string; list: EasterEggRecord[] } | null {
  const normalized = strip(rawVerse);
  if (!normalized) return null;
  const verse = `「${normalized}」`;
  const list = loadEasterEggBook();
  const idx = list.findIndex((item) => strip(item.verse) === normalized);
  if (idx >= 0) return { added: false, slotIndex: idx + 1, verse: list[idx].verse, unlockedAt: list[idx].unlockedAt, list };
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const unlockedAt = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())}`;
  const next = [...list, { verse, unlockedAt }];
  try {
    localStorage.setItem(EASTER_EGG_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 無痕模式等存不了：本次仍顯示
  }
  try {
    window.dispatchEvent(new CustomEvent(EASTER_EGG_EVENT, { detail: { list: next } }));
  } catch {
    // ignore
  }
  return { added: true, slotIndex: next.length, verse, unlockedAt, list: next };
}

/** 收集冊有變動（同頁或其他分頁）時通知 */
export function onEasterEggBookChange(cb: (list: EasterEggRecord[]) => void): () => void {
  const onLocal = () => cb(loadEasterEggBook());
  const onStorage = (e: StorageEvent) => {
    if (e.key === EASTER_EGG_STORAGE_KEY) cb(loadEasterEggBook());
  };
  window.addEventListener(EASTER_EGG_EVENT, onLocal);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EASTER_EGG_EVENT, onLocal);
    window.removeEventListener('storage', onStorage);
  };
}

/** 主廣場的大燈泡：小燈泡、大燈泡各算一格；3D 地圖只有一座燈泡，點了先給還沒收集的那一格 */
export const XIAODENGPAO_VERSE = '「找到了小燈泡！當燈泡亮起，就是又有好點子了！」';
export const BIG_BULB_VERSE = '「大燈泡亮起來了！滿城的好點子都被照亮了！」';
export function nextBulbVerse(): string {
  const have = new Set(loadEasterEggBook().map((r) => strip(r.verse)));
  if (!have.has(strip(XIAODENGPAO_VERSE))) return XIAODENGPAO_VERSE;
  if (!have.has(strip(BIG_BULB_VERSE))) return BIG_BULB_VERSE;
  return XIAODENGPAO_VERSE;
}
