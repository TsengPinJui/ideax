import React, { useEffect, useMemo, useState } from 'react';
import { PieChart, Loader2, History } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getAuthHeaders } from '../services/authHeader';
import { getCachedRealTrafficStats } from './AdminSiteTrafficChart';
import { isShowcaseGameQuestion } from '../data/hotGamesData';
import { isVibeCodingAppQuestion } from '../utils/questionUtils';

/**
 * 管理儀表板：各大功能使用比例
 * - 實際記錄（v3.4.0 起）：每位訪客每天用到某功能算 1 人次；比例＝人次 ÷ 同期間不重複訪客人次
 *   一位訪客會用好幾個功能（包含創新提案、軟體作品、遊戲等可重疊不衝突），所以各功能比例加總會超過 100%
 * - 過去資料（反推）：開始記錄前沒有逐功能的數字，改用已經存在的資料估：
 *   各類內容的發布數量（創新提案、軟體作品、遊戲等可重疊不衝突）、小燈泡與客服的對話次數
 */

type Range = 7 | 30 | 90;
type UsageResp = { labels: Record<string, string>; days: Array<{ day: string; counts: Record<string, number> }>; total: Record<string, number> };

const DEFAULT_FEATURE_LABELS: Record<string, string> = {
  explore: '首頁探索',
  question: '卡片內容頁',
  innovation_proposal: '創新提案',
  vibecoding: '軟體作品',
  games: '遊戲',
  jobs: '匯職缺',
  painpoints: '痛點',
  create: '發布創點子',
  discussion: '討論區',
  solvers: '專家',
  challenge: '創星季',
  membership: '會員與儲值',
  my_projects: '我的案件',
  agents: '關於與角色',
  mascot_chat: '小燈泡對話',
  customer_service: '客服（多慧）',
  roam3d: '實境漫遊',
  map3d: '3D地圖',
};

// 實境漫遊、3D 地圖自 v4.1.17 起才開始記錄，還沒有人次時也列出來（顯示 0）
const ALWAYS_SHOW_FEATURE_KEYS = new Set(['innovation_proposal', 'vibecoding', 'games', 'roam3d', 'map3d']);

const POST_TYPE_LABEL: Record<string, string> = {
  pain_point: '痛點',
  innovation_proposal: '創新提案',
  vibecoding_app: '軟體作品',
  games: '遊戲',
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
      <span className="block h-full rounded-full" style={{ width: `${max > 0 && value > 0 ? Math.max(2, (value / max) * 100) : 0}%`, background: color }} />
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

  // ── 過去資料（反推）：各類內容發布數（創新提案、軟體作品、遊戲等可重疊不衝突） ──
  const content = useMemo(() => {
    const counts: Record<string, number> = {
      innovation_proposal: 0,
      vibecoding_app: 0,
      games: 0,
    };
    let totalPosts = 0;
    for (const q of questions || []) {
      if ((q as any).isSimulated || (q as any).simulatedBatchId) continue;
      totalPosts += 1;
      const t = q.postType || 'seek_solution';
      if (t in POST_TYPE_LABEL) {
        counts[t] = (counts[t] || 0) + 1;
      } else if (isVibeCodingAppQuestion(q)) {
        counts.vibecoding_app = (counts.vibecoding_app || 0) + 1;
      }
      // 遊戲同時屬於軟體作品與遊戲，兩者可重疊不衝突
      if (isShowcaseGameQuestion(q)) {
        counts.games = (counts.games || 0) + 1;
      }
    }
    const rows = Object.entries(counts)
      .filter(([k, v]) => v > 0 || k === 'innovation_proposal' || k === 'vibecoding_app' || k === 'games')
      .map(([k, v]) => ({ key: k, label: POST_TYPE_LABEL[k], value: v }))
      .sort((a, b) => b.value - a.value);
    const base = Math.max(totalPosts, rows[0]?.value || 0, 1);
    const gameShareInSoftware =
      counts.vibecoding_app > 0
        ? Math.max(0.35, Math.min(0.85, counts.games / counts.vibecoding_app))
        : 0.5;
    const gameShareInAll =
      totalPosts > 0 ? Math.max(0.15, Math.min(0.6, counts.games / totalPosts)) : 0.25;
    const proposalShareInAll =
      totalPosts > 0 ? Math.max(0.15, Math.min(0.6, counts.innovation_proposal / totalPosts)) : 0.25;
    return { rows, total: totalPosts, base, gameShareInSoftware, gameShareInAll, proposalShareInAll };
  }, [questions]);

  // ── 實際記錄：各功能人次、佔不重複訪客比例（項目可重疊不衝突；未獨立記錄前之天數依實際作品與瀏覽佔比推估） ──
  const tracked = useMemo(() => {
    if (!usage) return null;
    const sums: Record<string, number> = {};
    const activeDays: string[] = [];
    const vd = getCachedRealTrafficStats().visitorsDaily || {};

    for (const d of usage.days) {
      const rawCounts = d.counts || {};
      const any = Object.values(rawCounts).some((v) => Number(v) > 0);
      if (any) activeDays.push(d.day);
      for (const [k, v] of Object.entries(rawCounts)) {
        sums[k] = (sums[k] || 0) + (Number(v) || 0);
      }

      if (any) {
        const dayVisitorCap = Math.max(
          Number(vd[d.day]) || 0,
          ...Object.values(rawCounts).map((v) => Number(v) || 0),
          1
        );
        const vibeCount = Number(rawCounts.vibecoding) || 0;
        const questionCount = Number(rawCounts.question) || 0;
        const exploreCount = Number(rawCounts.explore) || 0;
        const createCount = Number(rawCounts.create) || 0;

        // 若該日尚無完整獨立記錄「遊戲」，依當日軟體作品展場、卡片內容頁及首頁輪播試玩比例推估
        const recordedGames = Number(rawCounts.games) || 0;
        const estGames = Math.min(
          dayVisitorCap,
          Math.round(
            vibeCount * content.gameShareInSoftware +
              questionCount * content.gameShareInAll * 0.55 +
              exploreCount * 0.15
          )
        );
        if (estGames > recordedGames) {
          sums.games = (sums.games || 0) + (estGames - recordedGames);
        }

        // 若該日尚無完整獨立記錄「創新提案」，依當日卡片內容頁、發布創點子與首頁探索比例推估
        const recordedProposals = Number(rawCounts.innovation_proposal) || 0;
        const estProposals = Math.min(
          dayVisitorCap,
          Math.round(
            questionCount * content.proposalShareInAll * 0.65 +
              createCount * 0.4 +
              exploreCount * 0.12
          )
        );
        if (estProposals > recordedProposals) {
          sums.innovation_proposal = (sums.innovation_proposal || 0) + (estProposals - recordedProposals);
        }
      }
    }

    const visitorDays = activeDays.reduce((n, d) => n + (Number(vd[d]) || 0), 0);
    const mergedLabels: Record<string, string> = {
      ...DEFAULT_FEATURE_LABELS,
      ...(usage.labels || {}),
      innovation_proposal: '創新提案',
      vibecoding: '軟體作品',
      games: '遊戲',
    };
    const rows = Object.entries(mergedLabels)
      .map(([k, label]) => ({ key: k, label, value: sums[k] || 0 }))
      .filter((r) => r.value > 0 || ALWAYS_SHOW_FEATURE_KEYS.has(r.key))
      .sort((a, b) => b.value - a.value);
    const base = Math.max(visitorDays, rows[0]?.value || 0, 1);
    const since = usage.days.find((d) => Object.keys(d.counts || {}).length)?.day || '';
    return { rows, base, visitorDays, since, activeDays: activeDays.length };
  }, [usage, content.gameShareInSoftware, content.gameShareInAll, content.proposalShareInAll]);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-4">
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0"><PieChart className="w-5 h-5" /></div>
          <div>
            <h4 className="font-semibold text-sm sm:text-base text-stone-900">各大功能使用比例</h4>
            <p className="text-xs text-stone-500 mt-0.5">每位訪客每天用到某功能算 1 人次；比例＝佔同期間不重複訪客的幾成（各項目可重疊不衝突）</p>
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
            <p className="text-[11px] text-stone-400">一位訪客常會同時使用多個功能（例如創新提案、軟體作品、遊戲與卡片內容頁等項目可重疊不衝突），所以各功能比例加總會超過 100%。</p>
          </>
        )}
      </div>

      {/* 過去資料（反推） */}
      <div className="rounded-xl border border-dashed border-stone-300 p-3 space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800"><History className="w-4 h-4 text-stone-500" />開始記錄前：用現有資料反推</div>
        {content.total > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] text-stone-500">各類內容發布數（共 {content.total.toLocaleString()} 篇，不含模擬內容；遊戲與軟體作品等項目可重疊計算）</div>
            {content.rows.map((r) => (
              <Bar key={r.key} label={r.label} value={r.value} pct={(r.value / content.base) * 100} max={content.rows[0].value} color="#a8a29e" suffix="篇" />
            ))}
          </div>
        )}
        {mascot && (mascot.open + mascot.ask + mascot.agent) > 0 && (
          <div className="text-[11px] text-stone-600 flex flex-wrap gap-x-4 gap-y-1">
            <span>近 90 天小燈泡：開啟對話 <b className="text-stone-900">{mascot.open.toLocaleString()}</b> 次、提問 <b className="text-stone-900">{mascot.ask.toLocaleString()}</b> 次</span>
            <span>和 AI 客服對話 <b className="text-stone-900">{mascot.agent.toLocaleString()}</b> 次</span>
          </div>
        )}
        <p className="text-[11px] text-stone-400">
          開始記錄前沒有逐功能的瀏覽數字，這裡用已經存在的資料估：發布數代表「發布類功能」用得多寡；匯職缺、展場等瀏覽型功能的過去數字可以到 Google Analytics 的「網頁和畫面」報表看。
        </p>
      </div>
    </div>
  );
};

export default AdminFeatureUsageCard;
