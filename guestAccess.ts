/**
 * 訪客（未登入）瀏覽規則
 * - 列表前 6 則：完整開放（卡片與內頁）
 * - 第 7～10 則：僅開放預覽（卡片照常顯示；內頁只顯示前兩張圖片，其餘內容需登入）
 * - 第 11 則之後：模糊遮罩，需登入才能查看
 */
export const GUEST_FULL_ACCESS_COUNT = 6;
export const GUEST_PREVIEW_COUNT = 4;
export const GUEST_VISIBLE_COUNT = GUEST_FULL_ACCESS_COUNT + GUEST_PREVIEW_COUNT;
/** 遮罩後方模糊示意的卡片數 */
export const GUEST_BLURRED_TEASER_COUNT = 3;

const FULL_KEY = 'ideax_guest_full_access_ids';
const PREVIEW_KEY = 'ideax_guest_preview_ids';

function readSet(key: string): Set<string> {
  try {
    const raw = sessionStorage.getItem(key);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeSet(key: string, set: Set<string>) {
  try {
    // 只保留最近的 300 筆，避免無限成長
    sessionStorage.setItem(key, JSON.stringify(Array.from(set).slice(-300)));
  } catch {
    /* 無法使用 sessionStorage 時略過，內頁將視為完整開放 */
  }
}

/** 把訪客在列表上看到的項目，依位置登記為「完整開放」或「僅預覽」 */
export function registerGuestListExposure(items: Array<{ id?: string } | null | undefined>) {
  if (typeof window === 'undefined') return;
  const full = readSet(FULL_KEY);
  const preview = readSet(PREVIEW_KEY);
  items.slice(0, GUEST_VISIBLE_COUNT).forEach((item, idx) => {
    if (!item?.id) return;
    if (idx < GUEST_FULL_ACCESS_COUNT) {
      full.add(item.id);
      preview.delete(item.id);
    } else if (!full.has(item.id)) {
      preview.add(item.id);
    }
  });
  writeSet(FULL_KEY, full);
  writeSet(PREVIEW_KEY, preview);
}

/** 訪客開啟此項目內頁時是否只能看預覽（直接透過分享連結進入的項目不受限） */
export function isGuestPreviewOnly(id?: string): boolean {
  if (!id || typeof window === 'undefined') return false;
  const full = readSet(FULL_KEY);
  if (full.has(id)) return false;
  return readSet(PREVIEW_KEY).has(id);
}
