/**
 * 3D 實境漫遊左側欄內嵌網站：
 * - 看詳細內容或使用網站功能（找專家、求職、徵才、發布、瀏覽…）→ 在實境漫遊的左側欄直接顯示該頁（同網站、保留登入）
 * - 玩遊戲、體驗外部網站或連結 → 另開新分頁（和實境漫遊互不影響）
 */
export const KINGDOM_PANEL_EVENT = 'ideax_kingdom_panel';

export interface KingdomPanelDetail {
  url: string;
  title: string;
}

/** 站內網址加上 panel=kingdom（內嵌時不顯示頁尾、底部導覽、吉祥物等浮動元件） */
export function kingdomPanelUrl(path: string) {
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}panel=kingdom`;
}

/** 在實境漫遊左側欄打開網站的某一頁 */
export function openInKingdomPanel(path: string, title: string) {
  window.dispatchEvent(new CustomEvent<KingdomPanelDetail>(KINGDOM_PANEL_EVENT, { detail: { url: path, title } }));
}
