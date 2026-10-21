import React, { useEffect, useMemo, useState } from 'react';
import { PieChart, Loader2, History } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getAuthHeaders } from '../services/authHeader';
import { getCachedRealTrafficStats } from './AdminSiteTrafficChart';

/**
 * 管理儀表板：各大功能使用比例
 * - 實際記錄（v3.4.0 起）：每位訪客每天用到某功能算 1 人次；比例＝人次 ÷ 同期間不重複訪客人次
 *   一位訪客會用好幾個功能，所以各功能比例加總會超過 100%
 * - 過去資料（反推）：開始記錄前沒有逐功能的數字，改用已經存在的資料估：
 *   各類內容的發布數量、小燈泡與客服的對話次數
 */

type Range = 7 | 30 | 90;
type UsageResp = { labels: Record<string, string>; days: Array<{ day: string; counts: Record<string, number> }>; total: Record<string, number> };

const POST_TYPE_LABEL: Record<string, string> = {
  pain_point: '痛點',
  innovation_proposal: '創點子提案',
  vibecoding_app: 'VibeCoding 作品',
  seek_solution: '提問（找解答）',
  chat_discussion: '討論',
};

const api = async (path: string) => {
  const headers = await getAuthHeaders();
  const r = await fetch(path, { headers });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j?.success === false) throw new Error(j?.error || `HTTP ${r.status}`);
  return j;
};

const Bar: React.FC<{ label: string; value: number; pct: number; max: number; color: string; suffix: string }> = ({ label, value, pct, max, color, suffix }) => (
  <div className="grid grid-cols-[6.5rem_1fr_7.5rem] sm:grid-cols-[8rem_1fr_8.5rem] items-center gap-2 text-[11px]">
    <span className="font-bold text-stone-700 truncate" title={label}>{label}</span>
    <span className="h-2.5 rounded-full bg-stone-100 overflow-hidden">
      <span className="block h-full rounded-full" style={{ width: `${max > 0 ? Math.max(2, (value / max) * 100) : 0}%`, background: color }} />
    </span>
    <span className="text-stone-600 tabular-nums text-right whitespace-nowrap">
      <b className="text-stone-900">{pct.toFixed(pct >= 10 ? 0 : 1)}%</b>
      <span className="text-stone-400">・{value.toLocaleString()} {suffix}</span>
    </span>
  </div>
);

export const AdminFeatureUsageCard: React.FC = () => {
  const { questions } = useApp();
  const [range, setRange] = useState<Range>(30);
  const [usage, setUsage] = useState<UsageResp | null>(null);
  const [mascot, setMascot] = useState<{ open: number; ask: number; agent: number; days: number } | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api(`/api/admin/feature-usage?days=${range}`)
      .then((j) => { if (alive) { setUsage(j); setErr(''); } })
      .catch((e) => { if (alive) setErr(e?.message || '讀取失敗'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [range]);

  useEffect(() => {
    api('/api/admin/mascot-stats?days=90')
      .then((j) => {
        const days = Array.isArray(j?.days) ? j.days : [];
        const sum = (k: string) => days.reduce((n: number, d: any) => n + (Number(d?.counts?.[k]) || 0), 0);
        setMascot({ open: sum('open'), ask: sum('ask'), agent: sum('chat_agent'), days: days.filter((d: any) => Object.keys(d?.counts || {}).length).length });
      })
      .catch(() => setMascot(null));
  }, []);

  // ── 實際記錄：各功能人次、佔不重複訪客比例 ──
  const tracked = useMemo(() => {
    if (!usage) return null;
    const sums: Record<string, number> = {};
    const activeDays: string[] = [];
    for (const d of usage.days) {
      const any = Object.values(d.counts || {}).some((v) => Number(v) > 0);
      if (any) activeDays.push(d.day);
      for (const [k, v] of Object.entries(d.counts || {})) sums[k] = (sums[k] || 0) + (Number(v) || 0);
    }
    const vd = getCachedRealTrafficStats().visitorsDaily || {};
    const visitorDays = activeDays.reduce((n, d) => n + (Number(vd[d]) || 0), 0);
    const rows = Object.entries(usage.labels)
      .map(([k, label]) => ({ key: k, label, value: sums[k] || 0 }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);
    const base = Math.max(visitorDays, rows[0]?.value || 0, 1);
    const since = usage.days.find((d) => Object.keys(d.counts || {}).length)?.day || '';
    return { rows, base, visitorDays, since, activeDays: activeDays.length };
  }, [usage]);

  // ── 過去資料（反推）：各類內容發布數 ──
  const content = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of questions || []) {
      if ((q as any).isSimulated || (q as any).simulatedBatchId) continue;
      const t = q.postType || 'seek_solution';
      if (!(t in POST_TYPE_LABEL)) continue;
      counts[t] = (counts[t] || 0) + 1;
    }
    const rows = Object.entries(counts).map(([k, v]) => ({ key: k, label: POST_TYPE_LABEL[k], value: v })).sort((a, b) => b.value - a.value);
    const total = rows.reduce((n, r) => n + r.value, 0);
    return { rows, total };
  }, [questions]);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-4">
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0"><PieChart className="w-5 h-5" /></div>
          <div>
            <h4 className="font-black text-sm sm:text-base text-stone-900">各大功能使用比例</h4>
            <p className="text-xs text-stone-500 mt-0.5">每位訪客每天用到某功能算 1 人次；比例＝佔同期間不重複訪客的幾成</p>
          </div>
        </div>
        <div className="inline-flex rounded-lg border border-stone-200 p-0.5 bg-stone-50 text-[11px] font-bold" role="radiogroup" aria-label="時間範圍">
          {([7, 30, 90] as Range[]).map((r) => (
            <button key={r} type="button" role="radio" aria-checked={range === r} onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded-md cursor-pointer ${range === r ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500'}`}>
              近 {r} 天
            </button>
          ))}
        </div>
      </div>

      {/* 實際記錄 */}
      <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-3 space-y-2">
        {err ? (
          <p className="text-xs text-rose-700">讀取失敗：{err}</p>
        ) : !tracked ? (
          <p className="text-xs text-stone-400 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" />讀取中…</p>
        ) : tracked.rows.length === 0 ? (
          <p className="text-xs text-stone-500">v3.4.0 起開始記錄，目前還沒有資料；有訪客使用後就會出現。</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] text-stone-500">
              <span>有記錄的 {tracked.activeDays} 天內，不重複訪客共 <b className="text-stone-800">{tracked.visitorDays.toLocaleString()}</b> 人次{loading ? '・更新中…' : ''}</span>
              {tracked.since && <span>{tracked.since} 起實際記錄</span>}
            </div>
            <div className="space-y-1.5">
              {tracked.rows.map((r) => (
                <Bar key={r.key} label={r.label} value={r.value} pct={(r.value / tracked.base) * 100} max={tracked.rows[0].value} color="#0284c7" suffix="人次" />
              ))}
            </div>
            <p className="text-[10px] text-stone-400">一位訪客常會用好幾個功能，所以各功能比例加總會超過 100%。</p>
          </>
        )}
      </div>

      {/* 過去資料（反推） */}
      <div className="rounded-xl border border-dashed border-stone-300 p-3 space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-black text-stone-800"><History className="w-4 h-4 text-stone-500" />開始記錄前：用現有資料反推</div>
        {content.total > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] text-stone-500">各類內容發布數（共 {content.total.toLocaleString()} 篇，不含模擬內容）</div>
            {content.rows.map((r) => (
              <Bar key={r.key} label={r.label} value={r.value} pct={(r.value / content.total) * 100} max={content.rows[0].value} color="#a8a29e" suffix="篇" />
            ))}
          </div>
        )}
        {mascot && (mascot.open + mascot.ask + mascot.agent) > 0 && (
          <div className="text-[11px] text-stone-600 flex flex-wrap gap-x-4 gap-y-1">
            <span>近 90 天小燈泡：開啟對話 <b className="text-stone-900">{mascot.open.toLocaleString()}</b> 次、提問 <b className="text-stone-900">{mascot.ask.toLocaleString()}</b> 次</span>
            <span>和 AI 客服對話 <b className="text-stone-900">{mascot.agent.toLocaleString()}</b> 次</span>
          </div>
        )}
        <p className="text-[10px] text-stone-400">
          開始記錄前沒有逐功能的瀏覽數字，這裡用已經存在的資料估：發布數代表「發布類功能」用得多寡；匯職缺、展場等瀏覽型功能的過去數字可以到 Google Analytics 的「網頁和畫面」報表看。
        </p>
      </div>
    </div>
  );
};

export default AdminFeatureUsageCard;
