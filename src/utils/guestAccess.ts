/**
 * 訪客（未登入）列表瀏覽與預覽權限控管工具
 * - 前 16 則開放完整瀏覽
 * - 第 17～20 則（共 4 則）作為毛玻璃預覽（點擊僅顯示前兩張圖片預覽，其餘內容需登入）
 */

export const GUEST_VISIBLE_COUNT = 16;
export const GUEST_BLURRED_TEASER_COUNT = 4;

const guestFullVisibleIds = new Set<string>();
const guestPreviewOnlyIds = new Set<string>();

export function registerGuestListExposure(
  items: ReadonlyArray<{ id?: string } | null | undefined>
): void {
  if (!Array.isArray(items)) return;
  for (let i = 0; i < items.length; i++) {
    const id = items[i]?.id;
    if (!id) continue;
    if (i < GUEST_VISIBLE_COUNT) {
      guestFullVisibleIds.add(id);
      guestPreviewOnlyIds.delete(id);
    } else if (i < GUEST_VISIBLE_COUNT + GUEST_BLURRED_TEASER_COUNT) {
      if (!guestFullVisibleIds.has(id)) {
        guestPreviewOnlyIds.add(id);
      }
    }
  }
}

export function isGuestPreviewOnly(itemId?: string | null): boolean {
  if (!itemId) return false;
  if (guestFullVisibleIds.has(itemId)) return false;
  return guestPreviewOnlyIds.has(itemId);
}
