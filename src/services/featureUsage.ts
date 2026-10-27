/**
 * 各大功能使用統計：同一位訪客同一天用同一個功能只回報一次（記在瀏覽器裡）。
 * 不送任何個人資料，只送功能代號。
 */
export type FeatureKey =
  | 'explore'
  | 'question'
  | 'innovation_proposal'
  | 'vibecoding'
  | 'games'
  | 'jobs'
  | 'painpoints'
  | 'create'
  | 'discussion'
  | 'solvers'
  | 'challenge'
  | 'membership'
  | 'my_projects'
  | 'agents'
  | 'mascot_chat'
  | 'customer_service';

const KEY = 'ideax_feature_usage_day_v1';

export function trackFeature(feature: FeatureKey) {
  try {
    const day = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
    let seen: { day: string; list: string[] } = { day, list: [] };
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (raw && raw.day === day && Array.isArray(raw.list)) seen = raw;
    } catch {}
    if (seen.list.includes(feature)) return;
    seen.list.push(feature);
    try { localStorage.setItem(KEY, JSON.stringify(seen)); } catch {}
    const body = JSON.stringify({ feature });
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/feature-usage', new Blob([body], { type: 'application/json' }));
      return;
    }
    void fetch('/api/feature-usage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  } catch {}
}

/** 網址 → 功能 */
export function featureFromPath(path: string, hasOpenQuestion: boolean): FeatureKey {
  if (hasOpenQuestion) return 'question';
  const p = (path || '/').toLowerCase();
  if (p.startsWith('/jobs')) return 'jobs';
  if (p.startsWith('/vibecoding')) return 'vibecoding';
  if (p.startsWith('/create-ideas') || p.startsWith('/createideas') || p.startsWith('/ideas/')) return 'innovation_proposal';
  if (p.startsWith('/painpoints')) return 'painpoints';
  if (p.startsWith('/create')) return 'create';
  if (p.startsWith('/l0-discussion')) return 'discussion';
  if (p.startsWith('/solvers')) return 'solvers';
  if (p.startsWith('/challenge')) return 'challenge';
  if (p.startsWith('/membership') || p.startsWith('/topup')) return 'membership';
  if (/^\/my[-_](projects|cases)/.test(p)) return 'my_projects';
  if (p.startsWith('/agents') || p.startsWith('/about')) return 'agents';
  return 'explore';
}
