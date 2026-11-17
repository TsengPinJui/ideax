/**
 * 圖說顯示規則：用戶沒有自己寫圖說時，不顯示任何文字。
 * 過去上傳時系統會把檔名（如 IMG_6381）或預設字樣當成圖說存下，這些一律不顯示。
 */
const DEFAULT_CAPTIONS = new Set(['專案成果與架構圖']);
const FILENAME_LIKE = /^(img|dsc|dscn|pxl|mvimg|photo|image|screenshot|scaled|wp|fb_img|line_album|截圖|螢幕擷取畫面)[\s_\-]*[\w\-\s()]*$|\.(jpe?g|png|gif|webp|heic|heif|bmp)$|^[\w\-]*\d{4,}[\w\-]*$/i;

export function displayImageCaption(caption?: string | null): string {
  const c = String(caption || '').trim();
  if (!c || DEFAULT_CAPTIONS.has(c) || FILENAME_LIKE.test(c)) return '';
  return c;
}
