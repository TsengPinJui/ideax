const COMPANY_SUFFIX =
  /(股份有限公司|有限公司|有限責任公司|股份公司|台灣分公司|臺灣分公司|分公司|總公司|集團|公司|co\.?,?\s*ltd\.?|company|corporation|corp\.?|inc\.?|ltd\.?|llc|gmbh|limited|pte\.?|plc|k\.?k\.?|株式会社|（股）|\(股\))/gi;
const TITLE_NOISE =
  /(急徵|誠徵|徵才|熱烈招募|招募中|高薪|急|徵|【[^】]*】|\[[^\]]*\]|（[^）]*）|\([^)]*\))/g;

function base(s: string): string {
  return String(s || '')
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 65248))
    .replace(/　/g, ' ')
    .replace(/臺/g, '台')
    .toLowerCase();
}

export function normalizeCompany(name: string): string {
  return base(name)
    .replace(/[（(【\[][^）)】\]]*[）)】\]]/g, ' ')
    .replace(COMPANY_SUFFIX, '')
    .replace(/[\s\-_.,，、·•'"’()（）]/g, '');
}

export function companyAliases(name: string): string[] {
  const out = [normalizeCompany(name)];
  const inner = base(name).match(/[（(【\[]([^）)】\]]+)[）)】\]]/g) || [];
  for (const m of inner) {
    const v = normalizeCompany(m.slice(1, -1));
    if (v.length >= 2) out.push(v);
  }
  return out.filter((v, i, a) => v && a.indexOf(v) === i);
}

export function normalizeTitle(title: string): string {
  return base(title)
    .replace(TITLE_NOISE, '')
    .replace(/[\s\-_/|.,，、·•'"’:：+＋&＆]/g, '');
}

export function normalizeJobUrl(url: string): string {
  const raw = String(url || '').trim();
  if (!/^https?:\/\//i.test(raw)) return '';
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase().replace(/^(www|m|tw)\./, '');
    const path = u.pathname.replace(/\/+$/, '').toLowerCase();
    const keep = ['jk', 'jobid', 'job_id', 'currentjobid', 'id', 'jobno', 'job'];
    const params = [...u.searchParams.entries()]
      .filter(([k]) => keep.includes(k.toLowerCase()))
      .map(([k, v]) => `${k.toLowerCase()}=${v}`)
      .sort()
      .join('&');
    if (!path || path === '/' || (/\/(search|jobs?)$/i.test(path) && !params)) return '';
    return `${host}${path}${params ? `?${params}` : ''}`;
  } catch {
    return '';
  }
}

export function jobDedupeKeys(job: {
  title?: string;
  company?: string;
  url?: string;
}): string[] {
  const keys: string[] = [];
  const u = normalizeJobUrl(job.url || '');
  if (u) keys.push(`u:${u}`);
  const t = normalizeTitle(job.title || '');
  if (t) {
    for (const c of companyAliases(job.company || '')) {
      keys.push(`ct:${c}|${t}`);
    }
  }
  return keys;
}

export function seenJobBefore(
  seen: Set<string>,
  job: { title?: string; company?: string; url?: string }
): boolean {
  const keys = jobDedupeKeys(job);
  if (!keys.length) return false;
  let dup = keys.some((k) => seen.has(k));
  if (!dup) {
    const t = normalizeTitle(job.title || '');
    const cs = companyAliases(job.company || '');
    if (t && cs.length) {
      for (const k of seen) {
        if (!k.startsWith('ct:') || !k.endsWith(`|${t}`)) continue;
        const sc = k.slice(3, k.length - t.length - 1);
        if (
          sc.length >= 2 &&
          cs.some((c) => c.length >= 2 && (c.includes(sc) || sc.includes(c)))
        ) {
          dup = true;
          break;
        }
      }
    }
  }
  keys.forEach((k) => seen.add(k));
  return dup;
}
