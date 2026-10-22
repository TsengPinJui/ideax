/**
 * 匯職缺：職缺網址驗證
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
  { name: '518熊班', host: /(^|\.)518\.com\.tw$/i, detail: /^\/job-[\w-]+\.html/i, search: (kw) => `https://www.518.com.tw/job-index.html?ad=${kw}`, site: '518.com.tw' },
  { name: 'Meet.jobs', host: /(^|\.)meet\.jobs$/i, detail: /\/jobs\/\d+/i, site: 'meet.jobs' },
  { name: 'Glints', host: /(^|\.)glints\.com$/i, detail: /\/opportunities\/jobs\/[^/]+\/[\w-]{8,}/i, site: 'glints.com' },
  { name: '台灣就業通', host: /(^|\.)taiwanjobs\.gov\.tw$/i, detail: /job_detail|jobdetail|HIRE_ID=|hireid=/i, site: 'taiwanjobs.gov.tw' },
  { name: '事求人', host: /(^|\.)dgpa\.gov\.tw$/i, detail: /WANTF0000[2-9]|[?&](wid|work_id)=/i, site: 'web3.dgpa.gov.tw' },
  { name: 'Tasker出任務', host: /(^|\.)tasker\.com\.tw$/i, detail: /\/cases\/\d+/i, site: 'tasker.com.tw' },
  // 兼職／打工平台
  { name: '小雞上工', host: /(^|\.)chickpt\.com\.tw$/i, detail: /\/[\w-]*\d{3,}/, site: 'chickpt.com.tw' },
  { name: 'Worky', host: /(^|\.)worky\.com\.tw$/i, detail: /\/[\w-]*\d{3,}/, site: 'worky.com.tw' },
  // 國際／海外求職平台
  { name: 'Indeed', host: /(^|\.)indeed\.(com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/i, detail: /viewjob|\/rc\/clk|[?&]jk=|\/job\//i, search: (kw) => `https://www.indeed.com/jobs?q=${kw}`, site: 'indeed.com' },
  { name: 'Glassdoor', host: /(^|\.)glassdoor\./i, detail: /job-listing|\/job\/|jobListingId=/i, site: 'glassdoor.com' },
  { name: 'JobStreet', host: /(^|\.)jobstreet\./i, detail: /\/job\/\d+/i, site: 'jobstreet.com' },
  { name: 'JobsDB', host: /(^|\.)jobsdb\./i, detail: /\/job\/\d+/i, site: 'jobsdb.com' },
  { name: 'SEEK', host: /(^|\.)seek\.(com\.au|co\.nz)$/i, detail: /\/job\/\d+/i, site: 'seek.com.au' },
  { name: 'MyCareersFuture', host: /(^|\.)mycareersfuture\.gov\.sg$/i, detail: /\/job\//i, site: 'mycareersfuture.gov.sg' },
  // 日本、中國大陸、韓國、香港、歐美其他常見平台
  { name: 'doda', host: /(^|\.)doda\.jp$/i, detail: /JobSearchDetail|j_jid__\d+/i, site: 'doda.jp' },
  { name: 'Green', host: /(^|\.)green-japan\.com$/i, detail: /\/company\/\d+\/job\/\d+/i, site: 'green-japan.com' },
  { name: 'Daijob', host: /(^|\.)daijob\.com$/i, detail: /\/jobs\/detail\/\d+/i, site: 'daijob.com' },
  { name: 'リクナビNEXT', host: /(^|\.)next\.rikunabi\.com$/i, detail: /viewjob|\/company\/cmi\d+\/nx\d+/i, site: 'next.rikunabi.com' },
  { name: 'CTgoodjobs', host: /(^|\.)ctgoodjobs\.hk$/i, detail: /\/job\/[\w-]+\/\d+|\/jobs?\/.*\d{5,}/i, site: 'ctgoodjobs.hk' },
  { name: 'BOSS直聘', host: /(^|\.)zhipin\.com$/i, detail: /\/job_detail\//i, site: 'zhipin.com' },
  { name: '前程無憂', host: /(^|\.)51job\.com$/i, detail: /\/\d{6,}\.html/i, site: '51job.com' },
  { name: 'Saramin', host: /(^|\.)saramin\.co\.kr$/i, detail: /rec_idx=\d+/i, site: 'saramin.co.kr' },
  { name: 'JobKorea', host: /(^|\.)jobkorea\.co\.kr$/i, detail: /\/Recruit\/GI_Read\/\d+/i, site: 'jobkorea.co.kr' },
  { name: 'ZipRecruiter', host: /(^|\.)ziprecruiter\.com$/i, detail: /\/c\/[^/]+\/Job\/|\/jobs\/[\w-]+-[a-f0-9]{8}/i, site: 'ziprecruiter.com' },
  { name: 'Wellfound', host: /(^|\.)wellfound\.com$/i, detail: /\/jobs\/\d+/i, site: 'wellfound.com' },
  { name: 'StepStone', host: /(^|\.)stepstone\.(de|at|be|nl)$/i, detail: /stellenangebote--.*\d{6,}/i, site: 'stepstone.de' },
  { name: 'Reed', host: /(^|\.)reed\.co\.uk$/i, detail: /\/jobs\/[\w-]+\/\d+/i, site: 'reed.co.uk' },
  { name: 'Job Bank', host: /(^|\.)jobbank\.gc\.ca$/i, detail: /\/jobposting\/\d+/i, site: 'jobbank.gc.ca' },
  { name: 'Remote OK', host: /(^|\.)remoteok\.(com|io)$/i, detail: /\/remote-jobs\/[\w-]+-\d+/i, site: 'remoteok.com' },
  { name: 'We Work Remotely', host: /(^|\.)weworkremotely\.com$/i, detail: /\/remote-jobs\/[\w-]+/i, site: 'weworkremotely.com' },
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

/** 職稱整理：去掉括號、急徵等雜字與標點，轉小寫 */
function titleKey(t: string): string {
  return String(t || '')
    .replace(/[【\[(（].*?[】\])）]/g, '')
    .replace(/急徵|誠徵|徵才|招募中|高薪/g, '')
    .replace(/[\s\-_/|.,，、·•:：+＋&＆]/g, '')
    .toLowerCase();
}

/** 頁面內容是不是這筆職缺：公司和職稱都要對上（只知道其中一個時，就看那一個） */
export function pageMatchesJob(pageText: string, title: string, company: string): boolean {
  const text = pageText.toLowerCase();
  const c = companyCore(company).toLowerCase();
  const t = titleKey(title);
  const companyOk = c.length >= 2 && text.includes(c);
  let titleOk = false;
  if (t.length >= 2) {
    if (text.includes(t.slice(0, 12))) titleOk = true;
    else if (t.length >= 4) {
      // 職稱寫法略有不同（例如「資深前端工程師」vs「前端工程師（React）」）：看兩字片段對上多少
      const grams = new Set<string>();
      for (let i = 0; i < t.length - 1; i++) grams.add(t.slice(i, i + 2));
      let hit = 0;
      grams.forEach((g) => { if (text.includes(g)) hit++; });
      titleOk = hit / grams.size >= 0.75;
    }
  }
  if (c.length >= 2 && t.length >= 2) return companyOk && titleOk;
  return c.length >= 2 ? companyOk : titleOk;
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
          // 公司和職稱都要在頁面上對得到，才算是這筆職缺（只對到公司的，可能是同公司的其他職缺）
          if (pageMatchesJob(text, title, company)) return 'ok';
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

/** 搜尋用的公司簡稱：「特力集團_特力股份有限公司」→「特力」 */
export function shortCompany(company: string): string {
  const parts = String(company || '').split(/[_／/|｜]/).map((x) => x.trim()).filter(Boolean);
  const pick = parts.length ? parts[parts.length - 1] : String(company || '');
  const core = companyCore(pick).replace(/集團$/, '');
  return core || companyCore(String(company || ''));
}

/** 搜尋用的職稱主體：「電商平台 react 前端工程師」→「前端工程師」 */
export function shortTitle(title: string): string {
  const t = String(title || '')
    .replace(/[【\[(（].*?[】\])）]/g, ' ')
    .replace(/急徵|誠徵|徵才|招募中|高薪/g, ' ')
    .replace(/\s*[-－–]\s*[^-－–]{1,10}$/, '') // 「門市人員-台北信義」後面的地點拿掉
    .trim();
  const m = t.match(/([\u4e00-\u9fa5]{0,6}(?:工程師|設計師|分析師|架構師|研究員|專員|經理|副理|主任|助理|秘書|人員|店員|店長|主管|企劃|業務|顧問|客服|講師|老師|教師|護理師|藥師|技師|技術員|作業員|司機|廚師|師傅|會計|出納|行政|編輯|記者|工讀生|夥伴|實習生))\s*$/);
  if (m) return m[1];
  const en = t.match(/([A-Za-z][A-Za-z ]{0,30}(?:Engineer|Developer|Designer|Manager|Analyst|Specialist|Assistant|Intern))\s*$/i);
  if (en) return en[1].trim();
  return t.split(/\s+/).slice(-2).join(' ').slice(0, 20);
}

/** 搜尋這個職缺的連結：有確定可用的站內搜尋就用站內，否則用 Google 限定該網站搜尋
 *  關鍵字只用「公司簡稱＋職稱主體」，太長的全名加完整職稱常常一筆都搜不到 */
export function searchUrlFor(title: string, company: string, platformName?: string): string {
  const kw = encodeURIComponent(`${shortCompany(company)} ${shortTitle(title)}`.trim());
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
  const listPages: string[] = []; // 引用來源是職缺清單或搜尋結果頁：之後從裡面找這筆職缺的內頁
  for (const c of rawCandidates.slice(0, 6)) {
    const real = await resolveRedirect(c.u);
    if (!real || seen.has(real)) continue;
    seen.add(real);
    if (looksLikeJobPage(real)) candidates.push({ u: real, grounded: c.grounded });
    else if (platformOf(real) && listPages.length < 2) listPages.push(real);
  }

  let sawDeadOrClosed = false;
  let fallbackGrounded: string | null = null;
  const checks = await Promise.all(
    candidates.slice(0, 3).map(async (c) => {
      // 104：頁面是前端渲染，關閉後標題還是寫著職稱和公司，只能相信 104 自己的職缺資料
      if (/104\.com\.tw\/job\//i.test(c.u)) {
        const r104 = await check104Job(c.u, title, company);
        return { ...c, r: (r104 || 'unknown') as PageCheck };
      }
      let r = await checkJobPage(c.u, title, company);
      if (r === 'unknown' || r === 'mismatch') {
        const special = await checkLinkedInJob(c.u, title, company);
        if (special) r = special;
      }
      return { ...c, r };
    })
  );
  for (const c of checks) {
    if (c.r === 'ok') return { url: cleanJobUrl(c.u), urlKind: 'direct', verified: true, platform: platformOf(c.u)?.name };
    if (c.r === 'dead' || c.r === 'closed') sawDeadOrClosed = true;
  }
  // 網站擋機器人、看不到內容的頁面：沒辦法確認是不是這筆職缺，不直接給（之前會給，常常連到別的職缺）
  void fallbackGrounded;

  const platformName = candidates[0] ? platformOf(candidates[0].u)?.name : listPages[0] ? platformOf(listPages[0])?.name : undefined;
  const found = await findJobPageViaListings(title, company, listPages, platformName || job.sourcePlatform);
  if (found) return { url: found, urlKind: 'direct', verified: true, platform: platformOf(found)?.name };

  return {
    url: searchUrlFor(title, company, platformName || job.sourcePlatform),
    urlKind: 'search',
    verified: false,
    platform: platformName,
    // 找到的頁面都寫著已關閉／已下架：這筆職缺不顯示（頁面不存在的只改成搜尋連結，可能只是網址寫錯）
    drop: sawDeadOrClosed && checks.length > 0 && checks.every((c) => c.r === 'closed'),
  };
}

// ───────────── 找職缺內頁：從清單頁、平台搜尋結果裡找 ─────────────

function decodeEntities(t: string): string {
  return t.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\\u002F/gi, '/').replace(/\\\//g, '/');
}

/** 在一段 HTML（或頁面裡的 JSON 資料）中，找職稱／公司名稱附近的職缺內頁連結 */
export function pickJobLinkFromHtml(html: string, baseUrl: string, title: string, company: string): string | null {
  const text = decodeEntities(html);
  const c = companyCore(company), t = titleCore(title);
  if (c.length < 2 && t.length < 2) return null;
  let best: { url: string; score: number } | null = null;
  const urlRe = /(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s"'<>\\]*)?|\/[a-z0-9_-]+\/[^\s"'<>\\]{3,}/gi;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = urlRe.exec(text)) && n++ < 4000) {
    let u = m[0];
    try {
      u = new URL(u.startsWith('//') ? `https:${u}` : u, baseUrl).toString();
    } catch {
      continue;
    }
    if (!looksLikeJobPage(u)) continue;
    // 連結附近有沒有出現職稱、公司名稱；越近分數越高（同一頁有很多職缺時才不會配錯）
    const near = (needle: string) => {
      if (needle.length < 2) return 0;
      const from = Math.max(0, m!.index - 600), win = text.slice(from, m!.index + 600);
      let best = -1, i = win.indexOf(needle);
      while (i !== -1) { const dist = Math.abs(from + i - m!.index); if (best < 0 || dist < best) best = dist; i = win.indexOf(needle, i + 1); }
      return best < 0 ? 0 : 2 + (600 - best) / 600;
    };
    const nt = near(t), nc = near(c);
    // 職稱和公司都要出現在連結附近（只知道其中一個時看那一個），不然常會挑到同公司的其他職缺
    const both = t.length >= 2 && c.length >= 2;
    if (both ? !(nt > 0 && nc > 0) : nt + nc <= 0) continue;
    const score = nt + nc;
    let clean = u.split('#')[0];
    if (/104\.com\.tw\/job\//i.test(clean)) clean = clean.split('?')[0];
    if (score >= 2 && (!best || score > best.score)) best = { url: clean, score };
  }
  return best ? best.url : null;
}

/** 104 職缺：用 104 自己的職缺資料確認職稱與公司（104 頁面是前端渲染，抓 HTML 看不到內容） */
async function check104Job(url: string, title: string, company: string): Promise<PageCheck | null> {
  const m = url.match(/104\.com\.tw\/job\/([a-z0-9]+)/i);
  if (!m) return null;
  try {
    const r = await fetchWithTimeout(`https://www.104.com.tw/job/ajax/content/${m[1]}`, { headers: { Referer: `https://www.104.com.tw/job/${m[1]}`, Accept: 'application/json' } }, 5000);
    if (r.status === 404) return 'dead';
    if (!r.ok) return null;
    const j: any = await r.json().catch(() => null);
    const h = j?.data?.header;
    if (!h) return j?.error ? 'dead' : null;
    // 104 用 switch: "off" 表示職缺已關閉（之前誤判成找「關閉」字樣，關閉的職缺會被當成還在招）
    const sw = String(j?.data?.switch ?? '').toLowerCase();
    if (h.isClosed || sw === 'off' || /關閉|下架/.test(sw)) return 'closed';
    const closeDate = Date.parse(String(j?.data?.closeDate || '').replace(/\//g, '-'));
    if (Number.isFinite(closeDate) && closeDate < Date.now()) return 'closed';
    // 刊登／更新日期超過 60 天：多半是很久沒維護的舊職缺，不當作在招
    const appear = Date.parse(String(h.appearDate || '').replace(/\//g, '-'));
    if (Number.isFinite(appear) && Date.now() - appear > 60 * 86400000) return 'closed';
    const name = String(h.jobName || ''), cust = String(h.custName || '');
    return pageMatchesJob(`${cust} ${name}`.replace(/\s+/g, ''), title, company) ? 'ok' : 'mismatch';
  } catch {
    return null;
  }
}

/** LinkedIn 職缺：用公開（不用登入）的職缺內容確認職稱與公司 */
async function checkLinkedInJob(url: string, title: string, company: string): Promise<PageCheck | null> {
  const m = url.match(/linkedin\.com\/jobs\/view\/(?:[\w-]*-)?(\d{6,})/i);
  if (!m) return null;
  try {
    const r = await fetchWithTimeout(`https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${m[1]}`, { headers: { Accept: 'text/html' } }, 5000);
    if (r.status === 404 || r.status === 410) return 'dead';
    if (!r.ok) return null;
    const text = (await r.text()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, '');
    if (/Nolongeracceptingapplications|此職缺已不再接受應徵/i.test(text)) return 'closed';
    return pageMatchesJob(text, title, company) ? 'ok' : 'mismatch';
  } catch {
    return null;
  }
}

/** 把 LinkedIn 職缺網址整理成標準格式（去掉追蹤參數） */
function cleanJobUrl(u: string): string {
  const li = u.match(/^(https?:\/\/[^/]*linkedin\.com\/jobs\/view\/(?:[\w-]*-)?\d{6,})/i);
  if (li) return li[1];
  if (/104\.com\.tw\/job\//i.test(u)) return u.split('?')[0].split('#')[0];
  return u.split('#')[0];
}

/** 104 搜尋：用 104 的搜尋資料找到公司＋職稱相符的職缺內頁 */
async function find104Job(title: string, company: string): Promise<string | null> {
  const kw = encodeURIComponent(`${company} ${title}`.trim());
  const c = companyCore(company), t = titleCore(title);
  const endpoints = [
    `https://www.104.com.tw/jobs/search/api/jobs?keyword=${kw}&page=1&pagesize=20&order=15`,
    `https://www.104.com.tw/jobs/search/list?ro=0&keyword=${kw}&order=15&page=1`,
  ];
  for (const ep of endpoints) {
    try {
      const r = await fetchWithTimeout(ep, { headers: { Referer: 'https://www.104.com.tw/jobs/search/', Accept: 'application/json' } }, 5000);
      if (!r.ok) continue;
      const j: any = await r.json().catch(() => null);
      const list: any[] = Array.isArray(j?.data) ? j.data : Array.isArray(j?.data?.list) ? j.data.list : [];
      for (const it of list) {
        if (String(it.switch ?? 'on').toLowerCase() === 'off') continue;
        const name = String(it.jobName || '').replace(/\s+/g, ''), cust = String(it.custName || '').replace(/\s+/g, '');
        const link = String(it?.link?.job || it.jobLink || '');
        if (!link) continue;
        if ((c.length >= 2 && cust.includes(c)) && (t.length < 2 || name.includes(t) || t.includes(name.slice(0, 4)))) {
          const u = new URL(link.startsWith('//') ? `https:${link}` : link, 'https://www.104.com.tw').toString();
          return u.split('?')[0];
        }
      }
    } catch {}
  }
  return null;
}

/** 從清單頁／平台搜尋結果找這筆職缺的內頁 */
async function findJobPageViaListings(title: string, company: string, listPages: string[], platformName?: string): Promise<string | null> {
  const pages = [...listPages];
  const pl = PLATFORMS.find((p) => p.name === platformName || (platformName && platformName.includes(p.name.replace('人力銀行', ''))));
  const kw = encodeURIComponent(`${company} ${title}`.trim());
  if (pl?.name === 'LinkedIn') pages.push(`https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${kw}&start=0`);
  else if (pl?.search) pages.push(pl.search(kw));
  // 只有確定是 104 的職缺才去 104 找（之前來源不明也去 104 找，結果幾乎都變成 104）
  if (pl?.name === '104人力銀行') {
    const u = await find104Job(title, company);
    if (u) return u;
  }
  for (const page of pages.slice(0, 3)) {
    try {
      const r = await fetchWithTimeout(page, { method: 'GET', redirect: 'follow' }, 6000);
      if (!r.ok) continue;
      const html = (await r.text()).slice(0, 1_500_000);
      const u = pickJobLinkFromHtml(html, page, title, company);
      if (u) return cleanJobUrl(u);
    } catch {}
  }
  return null;
}

/** 一次驗證多筆（限制同時連線數與總時間；逾時的改給搜尋連結） */
export async function verifyJobUrls<T extends { title: string; company: string; url?: string; sourcePlatform?: string }>(
  jobs: T[],
  g: GroundingInfo | GroundingInfo[] | null,
  budgetMs = 12000,
  concurrency = 8
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

/**
 * 連結檢查（給管理員或使用者回報問題時用）：一步步列出這個職缺網址的檢查結果，
 * 方便知道「為什麼給了這個連結」。只接受已知求職平台的網址，不回傳頁面內容。
 */
export async function diagnoseJobUrl(url: string, title: string, company: string) {
  const u = safeUrl(url);
  const platform = platformOf(url);
  if (!u || !platform) return { ok: false, error: '只能檢查已知求職平台的職缺網址' };
  const out: Record<string, any> = { ok: true, url, platform: platform.name, looksLikeJobPage: looksLikeJobPage(url) };
  try {
    const r = await fetchWithTimeout(url, { method: 'GET', redirect: 'follow' }, 6000);
    const html = r.ok ? (await r.text()).slice(0, 400_000) : '';
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/\s+/g, '');
    out.page = { status: r.status, finalUrl: r.url, textLength: text.length, closedWords: CLOSED_PAGE.test(text), matchesJob: pageMatchesJob(text, title, company) };
  } catch (e: any) {
    out.page = { error: String(e?.message || e).slice(0, 120) };
  }
  const m104 = url.match(/104\.com\.tw\/job\/([a-z0-9]+)/i);
  if (m104) {
    try {
      const r = await fetchWithTimeout(`https://www.104.com.tw/job/ajax/content/${m104[1]}`, { headers: { Referer: `https://www.104.com.tw/job/${m104[1]}`, Accept: 'application/json' } }, 6000);
      const j: any = r.ok ? await r.json().catch(() => null) : null;
      const h = j?.data?.header || {};
      out.api104 = {
        status: r.status,
        topKeys: j ? Object.keys(j) : [],
        dataKeys: j?.data ? Object.keys(j.data) : [],
        headerKeys: Object.keys(h),
        jobName: h.jobName, custName: h.custName, isClosed: h.isClosed, appearDate: h.appearDate,
        switch: j?.data?.switch, error: j?.error,
      };
    } catch (e: any) {
      out.api104 = { error: String(e?.message || e).slice(0, 120) };
    }
  }
  out.final = await verifyJobUrl({ title, company, url, sourcePlatform: platform.name }, null);
  return out;
}
