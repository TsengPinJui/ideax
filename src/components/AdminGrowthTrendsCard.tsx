import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Users, Fingerprint } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isRealRegisteredUser } from '../data/mockData';
import { getCachedRealTrafficStats, type RealSiteTrafficStatsPayload } from './AdminSiteTrafficChart';

/**
 * 管理儀表板：註冊會員、不重複訪客的成長趨勢（UTC+8，以日為單位）
 *
 * 資料來源與推估方式（實際資料優先，沒有的才推估，推估的點用虛線、淡色標出）：
 * - 註冊會員：每位真實會員的註冊日期（registeredAt → createdAt → joinedDate），過去的資料可以完整重建。
 * - 每日不重複訪客：v2.2.21 起每天實際記錄；更早的日子只有瀏覽量，
 *   用「有記錄期間平均每位訪客幾次瀏覽」換算回去（推估）。
 * - 累計不重複訪客：v3.3.9 起每天記錄「第一次來的新訪客」；更早的日子，
 *   依每日訪客數按比例分攤目前的累計總數（推估），最後一天一定等於實際累計。
 */

type Point = { date: string; value: number; estimated: boolean };
type Range = 30 | 90 | 0;

const toUtc8DateKey = (raw: unknown): string | null => {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const slash = s.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})/);
  if (slash) return `${slash[1]}-${slash[2].padStart(2, '0')}-${slash[3].padStart(2, '0')}`;
  const t = Date.parse(s);
  if (!Number.isFinite(t)) return null;
  return new Date(t + 8 * 3600 * 1000).toISOString().slice(0, 10);
};

const todayKey = () => new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);

/** from～to 每一天（含頭尾） */
const daysBetween = (from: string, to: string): string[] => {
  const out: string[] = [];
  let t = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(t) || !Number.isFinite(end)) return out;
  for (let i = 0; t <= end && i < 3660; i++, t += 86400000) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
};

const sumOf = (m: Record<string, number>, keys: string[]) => keys.reduce((n, k) => n + (Number(m[k]) || 0), 0);

/** 疊圖：每日用長條（左軸）、累計用折線（右軸）；推估的部分淡色長條＋虛線 */
const ComboChart: React.FC<{ daily: Point[]; cumulative: Point[]; barColor: string; lineColor: string; dailyLabel: string; cumLabel: string }> = ({ daily, cumulative, barColor, lineColor, dailyLabel, cumLabel }) => {
  const [hover, setHover] = useState<number | null>(null);
  if (!daily.length) return <div className="h-40 flex items-center justify-center text-xs text-stone-400">還沒有資料</div>;
  const W = 640, H = 210, L = 38, R = 44, T = 14, B = 26;
  const pw = W - L - R, ph = H - T - B;
  const nice = (m: number) => { const v = Math.max(1, m); const p = Math.pow(10, Math.floor(Math.log10(v))); const f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
  const dMax = nice(Math.max(...daily.map((p) => p.value)));
  const cVals = cumulative.map((p) => p.value);
  const cMin0 = Math.min(...cVals), cMax0 = Math.max(...cVals);
  // 累計軸不一定從 0 開始，讓曲線的起伏看得出來
  const cMin = cMax0 - cMin0 < cMax0 * 0.15 ? Math.max(0, Math.floor(cMin0 - (cMax0 - cMin0 || cMax0 * 0.1))) : 0;
  const cMax = cMin + nice(cMax0 - cMin);
  const n = daily.length;
  const x = (i: number) => L + (n === 1 ? pw / 2 : (i / (n - 1)) * pw);
  const yD = (v: number) => T + ph - (v / dMax) * ph;
  const yC = (v: number) => T + ph - ((v - cMin) / Math.max(1, cMax - cMin)) * ph;
  const bw = Math.max(1.5, Math.min(18, (pw / n) * 0.65));
  const fr = [0, 0.5, 1];
  const labelEvery = Math.max(1, Math.ceil(n / 6));
  const firstReal = cumulative.findIndex((p) => !p.estimated);
  const linePart = (from: number, to: number) => cumulative.slice(from, to + 1).map((p, k) => `${k ? 'L' : 'M'}${x(from + k).toFixed(1)},${yC(p.value).toFixed(1)}`).join(' ');
  const i = hover !== null ? hover : n - 1;
  const d = daily[i], c = cumulative[i];

  return (
    <div>
      <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] text-stone-600 mb-1 min-h-4">
        <span>
          <span className="tabular-nums">{d.date}</span>：
          <span className="inline-block w-2 h-2 rounded-sm align-middle mr-0.5" style={{ background: barColor }} />{dailyLabel} <b className="text-stone-900">{d.value.toLocaleString()}</b>
          <span className="mx-1.5 text-stone-300">｜</span>
          <span className="inline-block w-3 h-0.5 align-middle mr-0.5" style={{ background: lineColor }} />{cumLabel} <b className="text-stone-900">{c.value.toLocaleString()}</b>
          {(d.estimated || c.estimated) && <span className="ml-1 text-amber-700">（含推估）</span>}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" onMouseLeave={() => setHover(null)} role="img" aria-label={`${dailyLabel}與${cumLabel}疊圖`}>
        {fr.map((f) => (
          <g key={f}>
            <line x1={L} x2={W - R} y1={T + ph - f * ph} y2={T + ph - f * ph} stroke="#e7e5e4" strokeDasharray={f ? '3 3' : undefined} />
            <text x={L - 6} y={T + ph - f * ph + 3} textAnchor="end" fontSize="10" fill={barColor}>{Math.round(dMax * f).toLocaleString()}</text>
            <text x={W - R + 6} y={T + ph - f * ph + 3} textAnchor="start" fontSize="10" fill={lineColor}>{Math.round(cMin + (cMax - cMin) * f).toLocaleString()}</text>
          </g>
        ))}
        {daily.map((p, k) => (
          <rect key={p.date} x={x(k) - bw / 2} y={yD(p.value)} width={bw} height={Math.max(0, T + ph - yD(p.value))} rx={Math.min(3, bw / 3)}
            fill={barColor} opacity={p.estimated ? 0.28 : hover === k ? 0.95 : 0.6} />
        ))}
        {firstReal !== 0 && <path d={linePart(0, firstReal < 0 ? n - 1 : firstReal)} fill="none" stroke={lineColor} strokeWidth="2" strokeDasharray="5 4" opacity="0.6" />}
        {firstReal >= 0 && <path d={linePart(firstReal, n - 1)} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinecap="round" />}
        <circle cx={x(i)} cy={yC(c.value)} r="3.5" fill="#fff" stroke={lineColor} strokeWidth="2" />
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={T + ph} stroke="#a8a29e" strokeDasharray="2 3" />}
        {daily.map((p, k) => (k % labelEvery === 0 || k === n - 1) && (
          <text key={`l-${p.date}`} x={x(k)} y={H - 8} textAnchor="middle" fontSize="10" fill="#a8a29e">{p.date.slice(5).replace('-', '/')}</text>
        ))}
        {daily.map((p, k) => (
          <rect key={`h-${p.date}`} x={x(k) - pw / n / 2} y={T} width={Math.max(2, pw / n)} height={ph} fill="transparent"
            onMouseEnter={() => setHover(k)} onTouchStart={() => setHover(k)} />
        ))}
      </svg>
      <div className="flex items-center gap-3 text-[11px] text-stone-500">
        <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: barColor, opacity: 0.6 }} />{dailyLabel}（左軸）</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3.5 h-0.5" style={{ background: lineColor }} />{cumLabel}（右軸）</span>
      </div>
    </div>
  );
};

export const AdminGrowthTrendsCard: React.FC = () => {
  const { availableUsers } = useApp();
  const [range, setRange] = useState<Range>(30);
  const [traffic, setTraffic] = useState<RealSiteTrafficStatsPayload>(() => getCachedRealTrafficStats());
  useEffect(() => {
    const on = () => setTraffic(getCachedRealTrafficStats());
    window.addEventListener('ideax_site_traffic_updated', on);
    return () => window.removeEventListener('ideax_site_traffic_updated', on);
  }, []);

  // ── 註冊會員：依註冊日期重建 ──
  const members = useMemo(() => {
    const real = (availableUsers || []).filter((u) => isRealRegisteredUser(u));
    const perDay: Record<string, number> = {};
    let undated = 0;
    for (const u of real) {
      const k = toUtc8DateKey((u as any).registeredAt) || toUtc8DateKey(u.createdAt) || toUtc8DateKey(u.joinedDate);
      if (k && k <= todayKey()) perDay[k] = (perDay[k] || 0) + 1; else undated++;
    }
    const keys = Object.keys(perDay).sort();
    return { perDay, undated, total: real.length, first: keys[0] || todayKey() };
  }, [availableUsers]);

  // ── 不重複訪客：實際記錄＋推估 ──
  const visitors = useMemo(() => {
    const views = traffic.daily || {};
    const vDaily = traffic.visitorsDaily || {};
    const newDaily = traffic.newVisitorsDaily || {};
    const vKeys = Object.keys(vDaily).filter((k) => vDaily[k] > 0).sort();
    const firstTracked = vKeys[0] || '';
    const allKeys = [...Object.keys(views), ...vKeys].sort();
    const first = allKeys[0] || todayKey();
    const days = daysBetween(first, todayKey());

    // 每位訪客平均幾次瀏覽（只看兩種都有記錄的日子）
    const both = vKeys.filter((k) => (views[k] || 0) > 0);
    const ratio = both.length ? sumOf(vDaily, both) / Math.max(1, sumOf(views, both)) : 0;
    const daily: Point[] = days.map((d) => {
      if (firstTracked && d >= firstTracked) return { date: d, value: Number(vDaily[d]) || 0, estimated: false };
      const est = ratio > 0 ? Math.round((Number(views[d]) || 0) * ratio) : 0;
      return { date: d, value: est, estimated: true };
    });

    // 累計：有「新訪客」記錄的日子用實際值，更早的依每日訪客數按比例分攤
    const total = Number(traffic.uniqueVisitorsTotal) || 0;
    const nKeys = Object.keys(newDaily).filter((k) => newDaily[k] > 0).sort();
    const firstNew = nKeys[0] || '';
    const recordedNew = sumOf(newDaily, nKeys);
    const before = daily.filter((p) => !firstNew || p.date < firstNew);
    const beforeSum = before.reduce((n, p) => n + p.value, 0);
    const share = beforeSum > 0 ? Math.max(0, total - recordedNew) / beforeSum : 0;
    const newPer = days.map((d, i) => (firstNew && d >= firstNew ? { v: Number(newDaily[d]) || 0, est: false } : { v: daily[i].value * share, est: true }));
    const base = Math.max(0, total - newPer.reduce((n, x) => n + x.v, 0));
    let acc = base;
    const cumulative: Point[] = days.map((d, i) => {
      acc += newPer[i].v;
      return { date: d, value: Math.round(acc), estimated: newPer[i].est };
    });
    if (cumulative.length) cumulative[cumulative.length - 1].value = Math.max(cumulative[cumulative.length - 1].value, total);
    return { daily, cumulative, total, firstTracked, firstNew, hasEstimate: daily.some((p) => p.estimated) || cumulative.some((p) => p.estimated) };
  }, [traffic]);

  const cut = (pts: Point[]) => (range ? pts.slice(-range) : pts);

  const memberDaily: Point[] = useMemo(() => {
    const days = daysBetween(members.first, todayKey());
    return days.map((d) => ({ date: d, value: members.perDay[d] || 0, estimated: false }));
  }, [members]);
  const memberCumulative: Point[] = useMemo(() => {
    let acc = members.undated; // 沒有註冊日期的會員算在最早
    return memberDaily.map((p) => ({ ...p, value: (acc += p.value) }));
  }, [memberDaily, members.undated]);

  const recent = (pts: Point[], n: number) => pts.slice(-n).reduce((s, p) => s + p.value, 0);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-4">
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0"><TrendingUp className="w-5 h-5" /></div>
          <div>
            <h4 className="font-semibold text-sm sm:text-base text-stone-900">成長趨勢</h4>
            <p className="text-xs text-stone-500 mt-0.5">註冊會員與不重複訪客，以日為單位（UTC+8）</p>
          </div>
        </div>
        <div className="inline-flex rounded-lg border border-stone-200 p-0.5 bg-stone-50 text-[11px] font-bold" role="radiogroup" aria-label="時間範圍">
          {([30, 90, 0] as Range[]).map((r) => (
            <button key={r} type="button" role="radio" aria-checked={range === r} onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded-md cursor-pointer ${range === r ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500'}`}>
              {r ? `近 ${r} 天` : '全部'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* 註冊會員 */}
        <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-900"><Users className="w-4 h-4 text-purple-600" />註冊會員</div>
          </div>
          <div className="flex gap-4 text-[11px] text-stone-600">
            <span>累計 <b className="text-stone-900 text-sm">{members.total.toLocaleString()}</b> 位</span>
            <span>近 7 天 +<b className="text-stone-900">{recent(memberDaily, 7)}</b></span>
            <span>近 30 天 +<b className="text-stone-900">{recent(memberDaily, 30)}</b></span>
          </div>
          <ComboChart daily={cut(memberDaily)} cumulative={cut(memberCumulative)} barColor="#a78bfa" lineColor="#6d28d9" dailyLabel="每日新註冊" cumLabel="累計會員" />
          <p className="text-[11px] text-stone-400">依每位會員的註冊日期重建，和「註冊會員」總數一致（不含測試帳號）{members.undated ? `；${members.undated} 位沒有註冊日期，算在最早一天` : ''}。</p>
        </div>

        {/* 不重複訪客 */}
        <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-900"><Fingerprint className="w-4 h-4 text-amber-600" />不重複訪客</div>
          </div>
          <div className="flex gap-4 text-[11px] text-stone-600">
            <span>累計 <b className="text-stone-900 text-sm">{visitors.total.toLocaleString()}</b> 位</span>
            <span>今日 <b className="text-stone-900">{(visitors.daily[visitors.daily.length - 1]?.value || 0).toLocaleString()}</b></span>
            <span>近 7 天平均 <b className="text-stone-900">{Math.round(recent(visitors.daily, 7) / 7).toLocaleString()}</b>／日</span>
          </div>
          <ComboChart daily={cut(visitors.daily)} cumulative={cut(visitors.cumulative)} barColor="#f59e0b" lineColor="#b45309" dailyLabel="每日訪客" cumLabel="累計訪客" />
          <p className="text-[11px] text-stone-400">
            {`每日訪客：${visitors.firstTracked ? `${visitors.firstTracked} 起為實際記錄` : '尚無實際記錄'}，更早由瀏覽量換算；累計訪客：${visitors.firstNew ? `${visitors.firstNew} 起為實際記錄` : '從 v3.3.9 起實際記錄'}，更早按比例推算。淡色長條、虛線＝推估。`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminGrowthTrendsCard;
