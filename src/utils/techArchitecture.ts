/**
 * 軟體提案的「技術架構」只顯示作者自己填寫的內容。
 * 過去自動補上的預設文字（不是作者填的）一律當作未填寫，不顯示。
 */
const AUTO_FILLED_DEFAULTS = new Set([
  'web 網頁應用程式',
  'web 网页应用程序',
  'react + typescript + tailwind css + gemini api',
]);

export function authorTechArchitecture(value?: string | null): string {
  const v = String(value || '').trim();
  if (!v) return '';
  if (AUTO_FILLED_DEFAULTS.has(v.toLowerCase())) return '';
  return v;
}
