/**
 * 全網搜職：職缺網址驗證
 *
 * 問題：模型在 JSON 裡自己寫的 url 常常是編出來的（假 ID、別間公司的頁面），
 * 以前只要開頭是 http 就直接用；找不到時還會把「隨便一個搜尋來源」配給職缺，所以點進去常常是別的職缺。
 *
 * 做法：
 * 1. 候選網址只來自兩個地方：模型寫的網址、Google 搜尋真的引用過的來源（依 groundingSupports 對到這筆職缺）。
 * 2. Google 的轉址連結先解析成真正的網址。
 * 3. 打開頁面確認：頁面存在、沒有「已關閉／已下架」字樣、內容提到這家公司或這個職稱。
 * 4. 都確認不了：改給「搜尋這個職缺」的連結，並標示 urlKind = 'search'，前端顯示「搜尋」而不是「在招中」。
 */

export type JobUrlKind = 'direct' | 'search';

interface Platform {
  name: string;
  host: RegExp;
  detail: RegExp; // 職缺內頁的路徑格式
  search?: (kw: string) => string; // 確定可用的站內搜尋網址
  site: string; // 給 Google 站內搜尋用
}

const PLATFORMS: Platform[] = [
  { name: '104人力銀行', host: /(^|\.)104\.com\.tw$/i, detail: /^\/job\/[a-z0-9]{4,}/i, search: (kw) => `https://www.104.com.tw/jobs/search/?keyword=${kw}`, site: '104.com.tw' },
  { name: '1111人力銀行', host: /(^|\.)1111\.com\.tw$/i, detail: /^\/job\/\d{4,}/, search: (kw) => `https://www.1111.com.tw/search/job?ks=${kw}`, site: '1111.com.tw' },
  { name: 'Cake', host: /(^|\.)(cake\.me|cakeresume\.com)$/i, detail: /^\/companies\/[^/]+\/jobs\/[^/?#]+/i, search: (kw) => `https://www.cake.me/jobs/${kw}`, site: 'cake.me' },
  { name: 'Yourator', host: /(^|\.)yourator\.co$/i, detail: /^\/companies\/[^/]+\/jobs\/\d+/i, site: 'yourator.co' },
  { name: 'Yes123', host: /(^|\.)yes123\.com\.tw$/i, detail: /job_refer_comp_job_detail|[?&](p_id|job_id)=/i, site: 'yes123.com.tw' },
  { name: '518熊班', host: /(^|\.)518\.com\.tw$/i, detail: /^\/job-[\w-]+\.html/i, site: '518.com.tw' },
  // 兼職／打工平台
  { name: '小雞上工', host: /(^|\.)chickpt\.com\.tw$/i, detail: /\/[\w-]*\d{3,}/, site: 'chickpt.com.tw' },
  { name: 'Worky', host: /(^|\.)worky\.com\.tw$/i, detail: /\/[\w-]*\d{3,}/, site: 'worky.com.tw' },
  { name: 'LinkedIn', host: /(^|\.)linkedin\.com$/i, detail: /^\/jobs\/view\/[\w-]*\d+/i, search: (kw) => `https://www.linkedin.com/jobs/search/?keywords=${kw}`, site: 'linkedin.com' },
];

// 職缺清單、搜尋結果、首頁這類不是單一職缺的頁面
const LIST_PAGE = /\/(jobs\/search|search|joblist|job-index\.html|jobs\/?$)|[?&](keyword|ks|q|term|key_word)=/i;
// 企業官網的招募頁
const CAREER_PATH = /(career|careers|job|jobs|recruit|hiring|join|徵才|招募|人才)/i;

const CLOSED_PAGE = /(此職缺已(關閉|下架|停止)|職缺已(關閉|下架|結束|過期)|已停止(招募|徵才)|暫停(招募|徵才)|職缺不存在|找不到(此|該)?職缺|This job is no longer (available|accepting)|no longer accepting applications|job (has )?expired)/i;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';

function safeUrl(u: string): URL | null {
  try {
    const x = new URL(u);
    return x.protocol === 'http:' || x.protocol === 'https:' ? x : null;
  } catch {
    return null;
  }
}

export function platformOf(u: string): Platform | undefined {
  const x = safeUrl(u);
  return x ? PLATFORMS.find((p) => p.host.test(x.hostname)) : undefined;
}

const isGoogleRedirect = (u: string) => /vertexaisearch\.cloud\.google\.com\/grounding-api-redirect/i.test(u);

/** 看起來像單一職缺頁（不是清單、搜尋頁或首頁） */
export function looksLikeJobPage(u: string): boolean {
  const x = safeUrl(u);
  if (!x || isGoogleRedirect(u)) return false;
  if (/example\.(com|org)|placeholder|\.\.\.|xxx/i.test(u)) return false;
  const p = PLATFORMS.find((pl) => pl.host.test(x.hostname));
  if (p) return p.detail.test(x.pathname + x.search) && !LIST_PAGE.test(x.pathname + x.search);
  // 企業官網：路徑要像招募頁，且不能只是網站首頁
  return x.pathname.length > 1 && CAREER_PATH.test(decodeURIComponent(x.pathname)) && !LIST_PAGE.test(x.pathname + x.search);
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal, headers: { 'User-Agent': UA, 'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.6', ...(init.headers || {}) } });
  } finally {
    clearTimeout(t);
  }
}

const redirectCache = new Map<string, Promise<string>>();
/** Google 搜尋來源的轉址連結 → 真正的網址（解析不了就回傳空字串） */
export function resolveRedirect(url: string): Promise<string> {
  if (!isGoogleRedirect(url)) return Promise.resolve(url);
  if (!redirectCache.has(url)) {
    redirectCache.set(
      url,
      (async () => {
        try {
          let cur = url;
          for (let hop = 0; hop < 3 && isGoogleRedirect(cur); hop++) {
            const r = await fetchWithTimeout(cur, { method: 'GET', redirect: 'manual' }, 3500);
            const loc = r.headers.get('location');
            if (!loc) return '';
            cur = new URL(loc, cur).toString();
          }
          return isGoogleRedirect(cur) ? '' : cur;
        } catch {
          return '';
        }
      })()
    );
    if (redirectCache.size > 500) redirectCache.delete(redirectCache.keys().next().value as string);
  }
  return redirectCache.get(url)!;
}

/** 公司名稱去掉「股份有限公司」等字尾，方便比對 */
function companyCore(c: string): string {
  return c
    .replace(/[（(].*?[)）]/g, '')
    .replace(/(股份)?有限公司|分公司|總公司|集團|企業社|工作室|co\.?,?\s*ltd\.?|inc\.?|corp\.?|limited|taiwan|台灣/gi, '')
    .replace(/\s+/g, '')
    .trim();
}
function titleCore(t: string): string {
  return t.replace(/[【\[(（].*?[】\])）]/g, '').replace(/\s+/g, '').slice(0, 8);
}

export type PageCheck = 'ok' | 'closed' | 'mismatch' | 'dead' | 'unknown';

const pageCache = new Map<string, Promise<PageCheck>>();
/** 打開職缺頁確認：存在、沒下架、內容提到這家公司或這個職稱 */
export function checkJobPage(url: string, title: string, company: string): Promise<PageCheck> {
  const key = `${url}|${title}|${company}`;
  if (!pageCache.has(key)) {
    pageCache.set(
      key,
      (async (): Promise<PageCheck> => {
        try {
          const r = await fetchWithTimeout(url, { method: 'GET', redirect: 'follow' }, 5000);
          if (r.status === 404 || r.status === 410) return 'dead';
          if (!r.ok) return 'unknown'; // 403、429 等：網站擋機器人，無法判斷
          const html = (await r.text()).slice(0, 400_000);
          const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/\s+/g, '');
          if (CLOSED_PAGE.test(text)) return 'closed';
          const c = companyCore(company), t = titleCore(title);
          if ((c.length >= 2 && text.includes(c)) || (t.length >= 2 && text.includes(t))) return 'ok';
          // 單頁式網站可能還沒渲染內容，只看得到 <title>，判斷不了
          return text.length < 3000 ? 'unknown' : 'mismatch';
        } catch {
          return 'unknown';
        }
      })()
    );
    if (pageCache.size > 1000) pageCache.delete(pageCache.keys().next().value as string);
  }
  return pageCache.get(key)!;
}

/** 搜尋這個職缺的連結：有確定可用的站內搜尋就用站內，否則用 Google 限定該網站搜尋 */
export function searchUrlFor(title: string, company: string, platformName?: string): string {
  const kw = encodeURIComponent(`${company} ${title}`.trim());
  const p = PLATFORMS.find((pl) => pl.name === platformName || (platformName && platformName.includes(pl.name.replace('人力銀行', ''))));
  if (p?.search) return p.search(kw);
  if (p) return `https://www.google.com/search?q=${kw}+site%3A${p.site}`;
  return `https://www.google.com/search?q=${kw}+%E8%81%B7%E7%BC%BA`;
}

export interface GroundingInfo {
  chunks: Array<{ title: string; uri: string }>;
  supports: Array<{ text: string; chunkIndices: number[] }>;
}

/** 從 Gemini 回應取出搜尋來源與「哪段文字引用了哪些來源」 */
export function groundingFrom(response: any): GroundingInfo {
  const gm = response?.candidates?.[0]?.groundingMetadata || {};
  const chunks = Array.isArray(gm.groundingChunks)
    ? gm.groundingChunks.map((c: any) => ({ title: String(c?.web?.title || ''), uri: String(c?.web?.uri || '') }))
    : [];
  const supports = Array.isArray(gm.groundingSupports)
    ? gm.groundingSupports.map((s: any) => ({
        text: String(s?.segment?.text || ''),
        chunkIndices: Array.isArray(s?.groundingChunkIndices) ? s.groundingChunkIndices.filter((n: any) => Number.isInteger(n)) : [],
      }))
    : [];
  return { chunks, supports };
}

/** 依引用段落，找出跟這筆職缺有關的搜尋來源 */
function groundedCandidatesFor(title: string, company: string, g: GroundingInfo): string[] {
  const c = companyCore(company), t = titleCore(title);
  const idx = new Set<number>();
  for (const s of g.supports) {
    const seg = s.text.replace(/\s+/g, '');
    if ((c.length >= 2 && seg.includes(c)) || (t.length >= 2 && seg.includes(t))) s.chunkIndices.forEach((i) => idx.add(i));
  }
  return Array.from(idx)
    .map((i) => g.chunks[i]?.uri)
    .filter((u): u is string => Boolean(u));
}

export interface VerifiedUrl {
  url: string;
  urlKind: JobUrlKind;
  verified: boolean; // 實際打開頁面確認過
  platform?: string;
  drop?: boolean; // 確認已下架或頁面不存在：這筆職缺不要顯示
}

/** 決定一筆職缺要連到哪裡 */
export async function verifyJobUrl(
  job: { title: string; company: string; url?: string; sourcePlatform?: string },
  g: GroundingInfo | GroundingInfo[] | null
): Promise<VerifiedUrl> {
  const title = String(job.title || '').trim();
  const company = String(job.company || '').trim();
  const modelUrl = String(job.url || '').trim();
  const infos = !g ? [] : Array.isArray(g) ? g : [g];
  const grounded = infos.flatMap((gi) => groundedCandidatesFor(title, company, gi));

  // 模型寫的網址如果是 Google 轉址，一定是從搜尋結果複製來的，也算有根據
  const rawCandidates = [...grounded.map((u) => ({ u, grounded: true })), ...(modelUrl ? [{ u: modelUrl, grounded: isGoogleRedirect(modelUrl) }] : [])];
  const seen = new Set<string>();
  const candidates: Array<{ u: string; grounded: boolean }> = [];
  for (const c of rawCandidates.slice(0, 5)) {
    const real = await resolveRedirect(c.u);
    if (!real || seen.has(real) || !looksLikeJobPage(real)) continue;
    seen.add(real);
    candidates.push({ u: real, grounded: c.grounded });
  }

  let sawDeadOrClosed = false;
  let fallbackGrounded: string | null = null;
  const checks = await Promise.all(candidates.slice(0, 3).map(async (c) => ({ ...c, r: await checkJobPage(c.u, title, company) })));
  for (const c of checks) {
    if (c.r === 'ok') return { url: c.u, urlKind: 'direct', verified: true, platform: platformOf(c.u)?.name };
    if (c.r === 'dead' || c.r === 'closed') sawDeadOrClosed = true;
    // 網站擋機器人看不到內容：只有 Google 真的搜到的頁面才採用
    if (c.r === 'unknown' && c.grounded && !fallbackGrounded) fallbackGrounded = c.u;
  }
  if (fallbackGrounded) return { url: fallbackGrounded, urlKind: 'direct', verified: false, platform: platformOf(fallbackGrounded)?.name };

  const platformName = candidates[0] ? platformOf(candidates[0].u)?.name : undefined;
  return {
    url: searchUrlFor(title, company, platformName || job.sourcePlatform),
    urlKind: 'search',
    verified: false,
    platform: platformName,
    // 找到的頁面都寫著已關閉／已下架：這筆職缺不顯示（頁面不存在的只改成搜尋連結，可能只是網址寫錯）
    drop: sawDeadOrClosed && checks.length > 0 && checks.every((c) => c.r === 'closed'),
  };
}

/** 一次驗證多筆（限制同時連線數與總時間；逾時的改給搜尋連結） */
export async function verifyJobUrls<T extends { title: string; company: string; url?: string; sourcePlatform?: string }>(
  jobs: T[],
  g: GroundingInfo | GroundingInfo[] | null,
  budgetMs = 9000,
  concurrency = 6
): Promise<VerifiedUrl[]> {
  const out: VerifiedUrl[] = jobs.map((j) => ({ url: searchUrlFor(j.title, j.company, j.sourcePlatform), urlKind: 'search', verified: false }));
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const i = next++;
      out[i] = await verifyJobUrl(jobs[i], g);
    }
  };
  const all = Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));
  await Promise.race([all, new Promise((r) => setTimeout(r, budgetMs))]);
  return [...out];
}
