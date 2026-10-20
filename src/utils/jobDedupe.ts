/**
 * 匯職缺去重複：同一個職缺常常被不同平台或不同批次重複找到，寫法也不太一樣。
 * 一個職缺會產生幾把「比對鑰匙」（網址、公司＋職稱），任何一把對上就算重複。
 * 全部用程式整理比對，不呼叫 AI。
 */

const COMPANY_SUFFIX = /(股份有限公司|有限公司|有限責任公司|股份公司|台灣分公司|臺灣分公司|分公司|總公司|集團|公司|co\.?,?\s*ltd\.?|company|corporation|corp\.?|inc\.?|ltd\.?|llc|gmbh|limited|pte\.?|plc|k\.?k\.?|株式会社|（股）|\(股\))/gi;
const TITLE_NOISE = /(急徵|誠徵|徵才|熱烈招募|招募中|高薪|急|徵|【[^】]*】|\[[^\]]*\]|（[^）]*）|\([^)]*\))/g;

/** 全形轉半形、臺→台、轉小寫 */
function base(s: string): string {
  return String(s || '')
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/　/g, ' ')
    .replace(/臺/g, '台')
    .toLowerCase();
}

export function normalizeCompany(name: string): string {
  return base(name)
    .replace(/[（(【\[][^）)】\]]*[）)】\]]/g, ' ') // 括號裡的英文名、品牌名先拿掉
    .replace(COMPANY_SUFFIX, '')
    .replace(/[\s\-_.,，、·•'"’()（）]/g, '');
}

/** 另一種寫法的公司名（括號裡的品牌名，例如「統一超商（7-ELEVEN）」的 7-ELEVEN） */
function companyAliases(name: string): string[] {
  const out = [normalizeCompany(name)];
  const inner = base(name).match(/[（(【\[]([^）)】\]]+)[）)】\]]/g) || [];
  for (const m of inner) {
    const v = normalizeCompany(m.slice(1, -1));
    if (v.length >= 2) out.push(v);
  }
  return out.filter((v, i, a) => v && a.indexOf(v) === i);
}

export function normalizeTitle(title: string): string {
  return base(title).replace(TITLE_NOISE, '').replace(/[\s\-_/|.,，、·•'"’:：+＋&＆]/g, '');
}

/** 職缺網址整理成固定寫法：去掉追蹤參數，只留真正代表這筆職缺的參數 */
export function normalizeJobUrl(url: string): string {
  const raw = String(url || '').trim();
  if (!/^https?:\/\//i.test(raw)) return '';
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase().replace(/^(www|m|tw)\./, '');
    const path = u.pathname.replace(/\/+$/, '').toLowerCase();
    // 有些平台用參數表示是哪一筆職缺（例如 Indeed 的 jk、LinkedIn 的 currentJobId）
    const keep = ['jk', 'jobid', 'job_id', 'currentjobid', 'id', 'jobno', 'job'];
    const params = [...u.searchParams.entries()]
      .filter(([k]) => keep.includes(k.toLowerCase()))
      .map(([k, v]) => `${k.toLowerCase()}=${v}`)
      .sort()
      .join('&');
    // 只有網站首頁或搜尋頁的網址不能拿來判斷是不是同一筆
    if (!path || path === '/' || /\/(search|jobs?)$/i.test(path) && !params) return '';
    return `${host}${path}${params ? `?${params}` : ''}`;
  } catch {
    return '';
  }
}

/** 一筆職缺的所有比對鑰匙 */
export function jobDedupeKeys(job: { company?: string; title?: string; url?: string }): string[] {
  const keys: string[] = [];
  const u = normalizeJobUrl(job.url || '');
  if (u) keys.push(`u:${u}`);
  const t = normalizeTitle(job.title || '');
  if (t) for (const c of companyAliases(job.company || '')) keys.push(`ct:${c}|${t}`);
  return keys;
}

/** 已經看過了嗎？沒看過就記下來並回傳 false */
export function seenJobBefore(seen: Set<string>, job: { company?: string; title?: string; url?: string }): boolean {
  const keys = jobDedupeKeys(job);
  if (!keys.length) return false;
  let dup = keys.some((k) => seen.has(k));
  // 職稱一樣、公司名稱一個包含另一個（「台積電」vs「台積電新竹廠」、「7eleven統一超商」vs「統一超商」）也算同一筆
  if (!dup) {
    const t = normalizeTitle(job.title || '');
    const cs = companyAliases(job.company || '');
    if (t && cs.length) {
      for (const k of seen) {
        if (!k.startsWith('ct:') || !k.endsWith(`|${t}`)) continue;
        const sc = k.slice(3, k.length - t.length - 1);
        if (sc.length >= 2 && cs.some((c) => c.length >= 2 && (c.includes(sc) || sc.includes(c)))) { dup = true; break; }
      }
    }
  }
  keys.forEach((k) => seen.add(k)); // 補記另一種寫法，之後換寫法也認得出來
  return dup;
}
