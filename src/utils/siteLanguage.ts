/**
 * 網站語言（繁體／簡體）
 *
 * - 使用者在設定或頁尾手動選擇的語言優先，存在本機（ideax_site_lang）。
 * - 沒選過時，每次開網站都依所在地區決定預設：中國大陸、馬來西亞、新加坡 → 簡體；其他（台灣、香港、澳門等）→ 繁體。
 *   地區由伺服器 /api/geo（Vercel 依 IP 判斷國家）取得，取不到時改看時區與瀏覽器語言。
 * - 簡體版不另外維護一份文字：畫面上的繁體字由 OpenCC（台灣用詞 → 大陸用詞）即時轉換，
 *   轉換字典只在簡體使用者的瀏覽器才會下載。
 */

export type SiteLang = 'zh-TW' | 'zh-CN';

const CHOSEN_KEY = 'ideax_site_lang';
const AUTO_KEY = 'ideax_site_lang_auto';
const SESSION_CHECKED_KEY = 'ideax_site_lang_checked';
const SIMPLIFIED_COUNTRIES = ['CN', 'MY', 'SG'];
const SIMPLIFIED_TIMEZONES = ['Asia/Shanghai', 'Asia/Chongqing', 'Asia/Harbin', 'Asia/Urumqi', 'Asia/Kashgar', 'Asia/Kuala_Lumpur', 'Asia/Kuching', 'Asia/Singapore'];

const readLS = (k: string): string | null => {
  try { return localStorage.getItem(k); } catch { return null; }
};
const writeLS = (k: string, v: string) => {
  try { localStorage.setItem(k, v); } catch { /* 無痕模式等情況忽略 */ }
};
const isLang = (v: string | null): v is SiteLang => v === 'zh-TW' || v === 'zh-CN';

/** 目前生效的語言：手動選擇 > 先前依地區判斷的結果 > 繁體 */
export function getSiteLang(): SiteLang {
  const chosen = readLS(CHOSEN_KEY);
  if (isLang(chosen)) return chosen;
  const auto = readLS(AUTO_KEY);
  if (isLang(auto)) return auto;
  return 'zh-TW';
}

/** 使用者是否手動選過語言 */
export function hasChosenSiteLang(): boolean {
  return isLang(readLS(CHOSEN_KEY));
}

/** 手動切換語言：記住選擇並重新載入頁面套用 */
export function setSiteLang(lang: SiteLang) {
  writeLS(CHOSEN_KEY, lang);
  window.location.reload();
}

function langFromCountry(country: string | null | undefined): SiteLang | null {
  if (!country) return null;
  return SIMPLIFIED_COUNTRIES.includes(country.toUpperCase()) ? 'zh-CN' : 'zh-TW';
}

function langFromBrowser(): SiteLang {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (SIMPLIFIED_TIMEZONES.includes(tz)) return 'zh-CN';
  } catch { /* ignore */ }
  const langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || '']).map((l) => l.toLowerCase());
  const first = langs.find((l) => l.startsWith('zh')) || '';
  if (first.startsWith('zh-cn') || first.startsWith('zh-sg') || first.startsWith('zh-my') || first.startsWith('zh-hans')) return 'zh-CN';
  return 'zh-TW';
}

async function detectDefaultLang(): Promise<SiteLang> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch('/api/geo', { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const lang = langFromCountry(data?.country);
      if (lang) return lang;
    }
  } catch { /* 改用瀏覽器資訊判斷 */ }
  return langFromBrowser();
}

/** 啟動時呼叫：決定語言並在需要時開始簡體轉換。
 *  沒手動選過語言時，每次開網站（每個分頁工作階段）都重新依所在地區判斷，
 *  人在國外或換了網路就會跟著切換；手動選過的語言則一直沿用。 */
export async function initSiteLanguage() {
  let lang = getSiteLang();
  if (!hasChosenSiteLang()) {
    let checked = false;
    try { checked = sessionStorage.getItem(SESSION_CHECKED_KEY) === '1'; } catch { /* ignore */ }
    if (!checked) {
      lang = await detectDefaultLang();
      writeLS(AUTO_KEY, lang);
      try { sessionStorage.setItem(SESSION_CHECKED_KEY, '1'); } catch { /* ignore */ }
    }
  }
  document.documentElement.lang = lang;
  if (lang === 'zh-CN') {
    const { startSimplifiedConversion } = await import('./simplifiedConverter');
    await startSimplifiedConversion();
  }
}
