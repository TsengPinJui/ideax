import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Clock,
  Calendar,
  Activity,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Layers,
  ShieldCheck,
} from 'lucide-react';

export interface TrafficDataPoint {
  key: string;
  shortLabel: string;
  datePart: string;
  timePart: string;
  fullDateTimeLabel: string;
  periodViews: number;
  cumulativeViews: number;
  isCurrent: boolean;
  isFirstConfirmedPeriod?: boolean;
}

export const INITIAL_SITE_VISITS_BASE = 1700;

export interface RealSiteTrafficStatsPayload {
  baseVisits?: number;
  totalVisits: number;
  hourly: Record<string, number>;
  daily: Record<string, number>;
  firstRecordedAtUtc8: string;
  firstHourKey: string;
  firstDateKey: string;
  lastUpdatedUtc8: string;
  onlineUsersCount?: number;
  uniqueVisitorsTotal?: number;
  visitorsDaily?: Record<string, number>;
  visitorsHourly?: Record<string, number>;
  newVisitorsDaily?: Record<string, number>;
}

export const REAL_TRAFFIC_STORAGE_KEY = 'ideax_real_site_traffic_utc8_v3';

export function getUtc8Parts(timestampMs: number = Date.now()) {
  const utc8Ms = timestampMs + 8 * 60 * 60 * 1000;
  const d = new Date(utc8Ms);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hour = String(d.getUTCHours()).padStart(2, '0');
  const minute = String(d.getUTCMinutes()).padStart(2, '0');
  const second = String(d.getUTCSeconds()).padStart(2, '0');

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    dateKey: `${year}-${month}-${day}`,
    dateSlash: `${year}/${month}/${day}`,
    shortDateSlash: `${month}/${day}`,
    hourKey: `${year}-${month}-${day} ${hour}:00`,
    hourLabel: `${hour}:00`,
    fullDateTime: `${year}/${month}/${day} ${hour}:${minute}:${second} (UTC+8)`,
  };
}

export function getCachedRealTrafficStats(): RealSiteTrafficStatsPayload {
  try {
    const raw = localStorage.getItem(REAL_TRAFFIC_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const hourly = parsed.hourly && typeof parsed.hourly === 'object' ? parsed.hourly : {};
        const daily = parsed.daily && typeof parsed.daily === 'object' ? parsed.daily : {};
        const sortedHours = Object.keys(hourly).sort();
        const sortedDays = Object.keys(daily).sort();
        const sumDaily = Object.values(daily).reduce((acc: number, v: any) => acc + (Number(v) || 0), 0);
        const base = typeof parsed.baseVisits === 'number' ? parsed.baseVisits : INITIAL_SITE_VISITS_BASE;
        return {
          baseVisits: base,
          totalVisits: Math.max(base + sumDaily, Number(parsed.totalVisits) || base),
          uniqueVisitorsTotal: Number(parsed.uniqueVisitorsTotal) || 0,
          visitorsDaily: parsed.visitorsDaily && typeof parsed.visitorsDaily === 'object' ? parsed.visitorsDaily : {},
          visitorsHourly: parsed.visitorsHourly && typeof parsed.visitorsHourly === 'object' ? parsed.visitorsHourly : {},
          newVisitorsDaily: parsed.newVisitorsDaily && typeof parsed.newVisitorsDaily === 'object' ? parsed.newVisitorsDaily : {},
          hourly,
          daily,
          firstRecordedAtUtc8: parsed.firstRecordedAtUtc8 || '',
          firstHourKey: parsed.firstHourKey || sortedHours[0] || '',
          firstDateKey: parsed.firstDateKey || sortedDays[0] || '',
          lastUpdatedUtc8: parsed.lastUpdatedUtc8 || '',
          onlineUsersCount: Number(parsed.onlineUsersCount) || 1,
        };
      }
    }
  } catch {}
  return {
    baseVisits: INITIAL_SITE_VISITS_BASE,
    totalVisits: INITIAL_SITE_VISITS_BASE,
    hourly: {},
    daily: {},
    firstRecordedAtUtc8: '',
    firstHourKey: '',
    firstDateKey: '',
    lastUpdatedUtc8: '',
    onlineUsersCount: 1,
  };
}

export function saveCachedRealTrafficStats(stats: RealSiteTrafficStatsPayload) {
  try {
    localStorage.setItem(REAL_TRAFFIC_STORAGE_KEY, JSON.stringify(stats));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ideax_site_traffic_updated', { detail: stats }));
    }
  } catch {}
}

export function recordUtc8SiteVisitBucket(): RealSiteTrafficStatsPayload {
  const current = getCachedRealTrafficStats();
  const nowParts = getUtc8Parts(Date.now());
  const hourly = { ...current.hourly };
  const daily = { ...current.daily };

  hourly[nowParts.hourKey] = (hourly[nowParts.hourKey] || 0) + 1;
  daily[nowParts.dateKey] = (daily[nowParts.dateKey] || 0) + 1;

  const sortedHours = Object.keys(hourly).sort();
  const sortedDays = Object.keys(daily).sort();
  const sumDaily = Object.values(daily).reduce((acc, v) => acc + v, 0);
  const base = typeof current.baseVisits === 'number' ? current.baseVisits : INITIAL_SITE_VISITS_BASE;
  const totalVisits = base + sumDaily;

  const updated: RealSiteTrafficStatsPayload = {
    ...current,
    baseVisits: base,
    totalVisits,
    hourly,
    daily,
    firstRecordedAtUtc8: current.firstRecordedAtUtc8 || nowParts.fullDateTime,
    firstHourKey: sortedHours[0] || nowParts.hourKey,
    firstDateKey: sortedDays[0] || nowParts.dateKey,
    lastUpdatedUtc8: nowParts.fullDateTime,
    onlineUsersCount: current.onlineUsersCount || 1,
  };
  saveCachedRealTrafficStats(updated);
  return updated;
}

interface AdminSiteTrafficChartProps {
  totalViewsCount: number;
  onlineUsersCount?: number;
}

export const AdminSiteTrafficChart: React.FC<AdminSiteTrafficChartProps> = ({
  totalViewsCount,
  onlineUsersCount = 1,
}) => {
  const [granularity, setGranularity] = useState<'hourly' | 'daily'>('hourly');
  const [dailyRange, setDailyRange] = useState<7 | 14 | 30>(14);
  const [isOverlayMode, setIsOverlayMode] = useState<boolean>(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showDataTable, setShowDataTable] = useState<boolean>(false);
  const [currentUtc8Str, setCurrentUtc8Str] = useState<string>(() => getUtc8Parts(Date.now()).fullDateTime);
  const [trafficStats, setTrafficStats] = useState<RealSiteTrafficStatsPayload>(() => getCachedRealTrafficStats());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchLatestRealTraffic = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/competition/site-traffic');
      if (res.ok) {
        const json = await res.json();
        if (json?.success && json.stats) {
          saveCachedRealTrafficStats(json.stats);
          setTrafficStats(json.stats);
        }
      }
    } catch {} finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLatestRealTraffic();
    const handleTrafficUpdate = (e: Event) => {
      const customEvt = e as CustomEvent<RealSiteTrafficStatsPayload>;
      setTrafficStats(customEvt.detail || getCachedRealTrafficStats());
    };
    window.addEventListener('ideax_site_traffic_updated', handleTrafficUpdate);
    return () => window.removeEventListener('ideax_site_traffic_updated', handleTrafficUpdate);
  }, [fetchLatestRealTraffic]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentUtc8Str(getUtc8Parts(Date.now()).fullDateTime);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { hourlyPoints, dailyPoints, confirmedFirstHourKey, confirmedFirstDateKey } = useMemo(() => {
    const nowMs = Date.now();
    const nowParts = getUtc8Parts(nowMs);
    const hourMs = 60 * 60 * 1000;
    const dayMs = 24 * hourMs;

    const hourlyMap = trafficStats.hourly || {};
    const dailyMap = trafficStats.daily || {};

    const nonZeroHourKeys = Object.keys(hourlyMap).filter((k) => (hourlyMap[k] || 0) > 0).sort();
    const nonZeroDayKeys = Object.keys(dailyMap).filter((k) => (dailyMap[k] || 0) > 0).sort();

    const firstHKey = trafficStats.firstHourKey || nonZeroHourKeys[0] || nowParts.hourKey;
    const firstDKey = trafficStats.firstDateKey || nonZeroDayKeys[0] || nowParts.dateKey;
    const baseVisits = trafficStats.baseVisits ?? INITIAL_SITE_VISITS_BASE;
    const effectiveTotal = Math.max(baseVisits, trafficStats.totalVisits || 0, totalViewsCount || 0);

    const rawHourly: Omit<TrafficDataPoint, 'cumulativeViews'>[] = [];
    for (let i = 23; i >= 0; i--) {
      const p = getUtc8Parts(nowMs - i * hourMs);
      if (p.hourKey < firstHKey) continue;
      rawHourly.push({
        key: p.hourKey,
        shortLabel: `${p.shortDateSlash} ${p.hourLabel}`,
        datePart: p.dateSlash,
        timePart: p.hourLabel,
        fullDateTimeLabel: `${p.dateSlash} ${p.hourLabel} (UTC+8)`,
        periodViews: Math.max(0, hourlyMap[p.hourKey] ?? 0),
        isCurrent: i === 0,
        isFirstConfirmedPeriod: p.hourKey === firstHKey,
      });
    }

    const firstVisibleHourKey = rawHourly[0]?.key || nowParts.hourKey;
    let priorHourlySum = 0;
    for (const [k, v] of Object.entries(hourlyMap)) {
      if (k < firstVisibleHourKey && v > 0) priorHourlySum += v;
    }

    const hourlyFinal: TrafficDataPoint[] = [];
    let runningCumH = baseVisits + priorHourlySum;
    for (let i = 0; i < rawHourly.length; i++) {
      runningCumH += rawHourly[i].periodViews;
      hourlyFinal.push({
        ...rawHourly[i],
        cumulativeViews: i === rawHourly.length - 1 ? Math.max(runningCumH, effectiveTotal) : runningCumH,
      });
    }

    const rawDaily: Omit<TrafficDataPoint, 'cumulativeViews'>[] = [];
    for (let d = dailyRange - 1; d >= 0; d--) {
      const p = getUtc8Parts(nowMs - d * dayMs);
      if (p.dateKey < firstDKey) continue;
      rawDaily.push({
        key: p.dateKey,
        shortLabel: p.shortDateSlash,
        datePart: p.dateSlash,
        timePart: d === 0 ? `截至 ${p.hour}:${p.minute}` : '00:00~23:59',
        fullDateTimeLabel: d === 0 ? `${p.dateSlash} 00:00~${p.hour}:${p.minute} (UTC+8)` : `${p.dateSlash} 全日 (UTC+8)`,
        periodViews: Math.max(0, dailyMap[p.dateKey] ?? 0),
        isCurrent: d === 0,
        isFirstConfirmedPeriod: p.dateKey === firstDKey,
      });
    }

    const firstVisibleDateKey = rawDaily[0]?.key || nowParts.dateKey;
    let priorDailySum = 0;
    for (const [k, v] of Object.entries(dailyMap)) {
      if (k < firstVisibleDateKey && v > 0) priorDailySum += v;
    }

    const dailyFinal: TrafficDataPoint[] = [];
    let runningCumD = baseVisits + priorDailySum;
    for (let i = 0; i < rawDaily.length; i++) {
      runningCumD += rawDaily[i].periodViews;
      dailyFinal.push({
        ...rawDaily[i],
        cumulativeViews: i === rawDaily.length - 1 ? Math.max(runningCumD, effectiveTotal) : runningCumD,
      });
    }

    return {
      hourlyPoints: hourlyFinal,
      dailyPoints: dailyFinal,
      confirmedFirstHourKey: firstHKey,
      confirmedFirstDateKey: firstDKey,
    };
  }, [trafficStats, totalViewsCount, dailyRange]);

  const activePoints = granularity === 'hourly' ? hourlyPoints : dailyPoints;

  const summaryStats = useMemo(() => {
    const baseVisits = trafficStats.baseVisits ?? INITIAL_SITE_VISITS_BASE;
    const effectiveTotal = Math.max(baseVisits, trafficStats.totalVisits || 0, totalViewsCount || 0);
    if (activePoints.length === 0) {
      return { periodTotal: 0, periodAvg: 0, peakPoint: null, latestPoint: null, endCumulative: effectiveTotal };
    }
    const periodTotal = activePoints.reduce((acc, p) => acc + p.periodViews, 0);
    const periodAvg = Math.round((periodTotal / activePoints.length) * 10) / 10;
    const peakPoint = activePoints.reduce((b, c) => (c.periodViews > b.periodViews ? c : b), activePoints[0]);
    const latestPoint = activePoints[activePoints.length - 1];
    return {
      periodTotal,
      periodAvg,
      peakPoint,
      latestPoint,
      endCumulative: Math.max(latestPoint.cumulativeViews, effectiveTotal),
    };
  }, [activePoints, trafficStats.totalVisits, totalViewsCount]);

  const renderSingleLineChart = (
    points: TrafficDataPoint[],
    metric: 'periodViews' | 'cumulativeViews',
    title: string,
    subtitle: string,
    colorHex: string,
    gradientId: string,
    badgeText: string,
    badgeClass: string
  ) => {
    const width = 760, height = 240, padLeft = 56, padRight = 32, padTop = 34, padBottom = 56;
    const plotW = width - padLeft - padRight, plotH = height - padTop - padBottom;
    const values = points.map((p) => p[metric]);
    const rawMin = values.length > 0 ? Math.min(...values) : 0;
    const rawMax = values.length > 0 ? Math.max(...values) : 0;
    const minVal = metric === 'periodViews' || points.length <= 1 ? 0 : Math.max(0, Math.floor(rawMin - (rawMax - rawMin) * 0.15));
    const maxVal = Math.max(minVal + 4, Math.ceil(rawMax * 1.25));
    const valSpan = Math.max(1, maxVal - minVal);

    const getX = (idx: number) => (points.length <= 1 ? padLeft + plotW / 2 : padLeft + (idx / (points.length - 1)) * plotW);
    const getY = (val: number) => padTop + plotH - ((val - minVal) / valSpan) * plotH;
    const coords = points.map((p, i) => ({ x: getX(i), y: getY(p[metric]), val: p[metric], point: p, index: i }));

    const isSingle = coords.length === 1;
    const segL = padLeft + plotW * 0.22, segR = padLeft + plotW * 0.78;
    const linePath = isSingle
      ? `M ${segL.toFixed(1)} ${coords[0].y.toFixed(1)} L ${segR.toFixed(1)} ${coords[0].y.toFixed(1)}`
      : coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
    const areaPath = isSingle
      ? `${linePath} L ${segR.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${segL.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
      : coords.length > 1
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
      : '';

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(minVal + valSpan * t));
    const labelStep = points.length > 16 ? 3 : points.length > 10 ? 2 : 1;
    const activeHover = hoveredIndex !== null && coords[hoveredIndex] ? coords[hoveredIndex] : coords[coords.length - 1];

    return (
      <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-50/70 border border-stone-200/90 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h5 className="font-semibold text-xs sm:text-sm text-stone-900">{title}</h5>
              <span className={`text-[11px] tabular-nums font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>{badgeText}</span>
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">{subtitle}</p>
          </div>
          {activeHover && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white border border-stone-200 shadow-2xs text-[11px]">
              <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="tabular-nums font-bold text-stone-700">{activeHover.point.fullDateTimeLabel}</span>
              <span className="text-stone-300">|</span>
              <span className="font-semibold tabular-nums" style={{ color: colorHex }}>{activeHover.val.toLocaleString()} 次</span>
            </div>
          )}
        </div>

        <div className="relative w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[520px] h-auto select-none overflow-visible" onMouseLeave={() => setHoveredIndex(null)}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colorHex} stopOpacity="0.28" />
                <stop offset="100%" stopColor={colorHex} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {yTicks.map((tickVal, idx) => {
              const y = getY(tickVal);
              return (
                <g key={idx}>
                  <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#e7e5e4" strokeDasharray={idx === 0 ? undefined : '3 3'} strokeWidth="1" />
                  <text x={padLeft - 8} y={y + 3.5} textAnchor="end" className="fill-stone-400 tabular-nums text-[11px]">{tickVal.toLocaleString()}</text>
                </g>
              );
            })}
            {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
            {linePath && <path d={linePath} fill="none" stroke={colorHex} strokeWidth="2.5" strokeDasharray={isSingle ? '6 4' : undefined} strokeLinecap="round" />}
            {coords.map((c, idx) => {
              const isHovered = hoveredIndex === idx;
              const isLast = idx === coords.length - 1;
              const showTick = idx % labelStep === 0 || isLast;
              const showVal = isHovered || isLast || isSingle || idx % (labelStep * 2) === 0;
              return (
                <g key={c.point.key} className="cursor-pointer" onMouseEnter={() => setHoveredIndex(idx)} onClick={() => setHoveredIndex(idx)}>
                  <rect x={c.x - plotW / Math.max(points.length * 2, 4)} y={padTop} width={plotW / Math.max(points.length, 2)} height={plotH + padBottom} fill="transparent" />
                  {isSingle && <circle cx={c.x} cy={c.y} r={10} fill={colorHex} fillOpacity="0.16" />}
                  <circle cx={c.x} cy={c.y} r={isHovered || isSingle ? 5.5 : isLast ? 4.5 : 3} fill={isHovered || isLast ? colorHex : '#ffffff'} stroke={colorHex} strokeWidth="2" />
                  {showVal && (
                    <text x={c.x} y={c.y - 10} textAnchor="middle" className="tabular-nums text-[11px] font-semibold fill-stone-900">
                      {c.val.toLocaleString()} 次
                    </text>
                  )}
                  {showTick && (
                    <g transform={`translate(${c.x}, ${padTop + plotH + 14})`}>
                      <text x={0} y={0} textAnchor="middle" className="tabular-nums text-[10.5px] font-semibold fill-stone-800">
                        {granularity === 'hourly' ? c.point.shortLabel.split(' ')[0] : c.point.shortLabel}
                      </text>
                      <text x={0} y={12} textAnchor="middle" className="tabular-nums text-[10.5px] font-bold fill-amber-700">
                        {granularity === 'hourly' ? c.point.timePart : c.point.datePart.slice(0, 4)}
                      </text>
                      {c.point.isFirstConfirmedPeriod && (
                        <text x={0} y={24} textAnchor="middle" className="font-sans font-bold text-[8.5px] fill-emerald-700">[首期起算]</text>
                      )}
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  const renderCombinedChart = (points: TrafficDataPoint[]) => {
    const width = 760, height = 275, padLeft = 56, padRight = 62, padTop = 36, padBottom = 60;
    const plotW = width - padLeft - padRight, plotH = height - padTop - padBottom;
    const periodVals = points.map((p) => p.periodViews);
    const cumVals = points.map((p) => p.cumulativeViews);

    const pMin = 0;
    const maxPeriod = periodVals.length > 0 ? Math.max(...periodVals) : 0;
    const pMax = Math.max(4, Math.ceil(maxPeriod * 1.55));
    const pSpan = Math.max(1, pMax - pMin);

    const rawCMin = cumVals.length > 0 ? Math.min(...cumVals) : 0;
    const rawCMax = cumVals.length > 0 ? Math.max(...cumVals) : 0;
    const cMin = points.length <= 1 ? 0 : Math.max(0, Math.floor(rawCMin - (rawCMax - rawCMin) * 0.2));
    const cMax = Math.max(cMin + 4, Math.ceil(rawCMax * 1.18));
    const cSpan = Math.max(1, cMax - cMin);

    const getX = (idx: number) => (points.length <= 1 ? padLeft + plotW / 2 : padLeft + (idx / (points.length - 1)) * plotW);
    const getPeriodY = (val: number) => padTop + plotH - ((val - pMin) / pSpan) * plotH;
    const getCumY = (val: number) => padTop + plotH - ((val - cMin) / cSpan) * plotH;

    const isSingle = points.length === 1;
    const segL = padLeft + plotW * 0.22, segR = padLeft + plotW * 0.78;

    const periodPath = isSingle
      ? `M ${segL.toFixed(1)} ${getPeriodY(points[0].periodViews).toFixed(1)} L ${segR.toFixed(1)} ${getPeriodY(points[0].periodViews).toFixed(1)}`
      : points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getPeriodY(p.periodViews).toFixed(1)}`).join(' ');

    const cumPath = isSingle
      ? `M ${segL.toFixed(1)} ${getCumY(points[0].cumulativeViews).toFixed(1)} L ${segR.toFixed(1)} ${getCumY(points[0].cumulativeViews).toFixed(1)}`
      : points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getCumY(p.cumulativeViews).toFixed(1)}`).join(' ');

    const periodArea = isSingle
      ? `${periodPath} L ${segR.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${segL.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
      : points.length > 1
      ? `${periodPath} L ${getX(points.length - 1).toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${getX(0).toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
      : '';

    const cumArea = isSingle
      ? `${cumPath} L ${segR.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${segL.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
      : points.length > 1
      ? `${cumPath} L ${getX(points.length - 1).toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${getX(0).toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
      : '';

    const labelStep = points.length > 16 ? 3 : points.length > 10 ? 2 : 1;
    const activePoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : points[points.length - 1];

    return (
      <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-50/70 border border-stone-200/90 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-stone-200">
              <span className="w-3 h-1.5 rounded-full bg-amber-500 inline-block" />
              單位時間量：{granularity === 'hourly' ? '每小時瀏覽量 (左軸)' : '每日瀏覽量 (左軸)'}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-lg border border-stone-200">
              <span className="w-3 h-1.5 rounded-full bg-purple-600 inline-block" />
              總量：網站累計總瀏覽量 (右軸)
            </span>
          </div>
          {activePoint && (
            <div className="flex items-center gap-2 flex-wrap px-2.5 py-1.5 rounded-xl bg-white border border-stone-200 shadow-2xs text-[11px]">
              <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="tabular-nums font-bold text-stone-700">{activePoint.fullDateTimeLabel}</span>
              <span className="text-stone-300">|</span>
              <span className="tabular-nums font-semibold text-amber-700">單位時間：+{activePoint.periodViews.toLocaleString()} 次</span>
              <span className="text-stone-300">|</span>
              <span className="tabular-nums font-semibold text-purple-700">累計總量：{activePoint.cumulativeViews.toLocaleString()} 次</span>
            </div>
          )}
        </div>

        <div className="relative w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[540px] h-auto select-none overflow-visible" onMouseLeave={() => setHoveredIndex(null)}>
            <defs>
              <linearGradient id="combinedPeriodGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d97706" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="combinedCumGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.01" />
              </linearGradient>
            </defs>
            <text x={padLeft - 6} y={16} textAnchor="end" className="fill-amber-700 font-sans font-bold text-[10.5px]">單位時間 (次)</text>
            <text x={width - padRight + 6} y={16} textAnchor="start" className="fill-purple-700 font-sans font-bold text-[10.5px]">累計總量 (次)</text>
            {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => {
              const y = padTop + plotH - t * plotH;
              const leftVal = Math.round(pMin + pSpan * t);
              const rightVal = Math.round(cMin + cSpan * t);
              return (
                <g key={idx}>
                  <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#e7e5e4" strokeDasharray={idx === 0 ? undefined : '3 3'} strokeWidth="1" />
                  <text x={padLeft - 8} y={y + 3.5} textAnchor="end" className="fill-amber-700 tabular-nums text-[11px]">{leftVal.toLocaleString()}</text>
                  <text x={width - padRight + 8} y={y + 3.5} textAnchor="start" className="fill-purple-700 tabular-nums text-[11px]">{rightVal.toLocaleString()}</text>
                </g>
              );
            })}
            {cumArea && <path d={cumArea} fill="url(#combinedCumGrad)" />}
            {periodArea && <path d={periodArea} fill="url(#combinedPeriodGrad)" />}
            <path d={cumPath} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeDasharray={isSingle ? '6 4' : undefined} strokeLinecap="round" />
            <path d={periodPath} fill="none" stroke="#d97706" strokeWidth="2.5" strokeDasharray={isSingle ? '6 4' : undefined} strokeLinecap="round" />
            {points.map((p, idx) => {
              const x = getX(idx);
              const py = getPeriodY(p.periodViews);
              const cy = getCumY(p.cumulativeViews);
              const isHovered = hoveredIndex === idx;
              const isLast = idx === points.length - 1;
              const showTick = idx % labelStep === 0 || isLast;
              const showVal = isHovered || isLast || isSingle || idx % (labelStep * 2) === 0;
              return (
                <g key={p.key} className="cursor-pointer" onMouseEnter={() => setHoveredIndex(idx)} onClick={() => setHoveredIndex(idx)}>
                  {isHovered && <line x1={x} y1={padTop} x2={x} y2={padTop + plotH} stroke="#78716c" strokeWidth="1" strokeDasharray="3 3" />}
                  <rect x={x - plotW / Math.max(points.length * 2, 4)} y={padTop} width={plotW / Math.max(points.length, 2)} height={plotH + padBottom} fill="transparent" />
                  {isSingle && (
                    <>
                      <circle cx={x} cy={cy} r={10} fill="#7c3aed" fillOpacity="0.15" />
                      <circle cx={x} cy={py} r={10} fill="#d97706" fillOpacity="0.15" />
                    </>
                  )}
                  <circle cx={x} cy={cy} r={isHovered || isLast || isSingle ? 5 : 3.5} fill={isHovered || isLast || isSingle ? '#7c3aed' : '#ffffff'} stroke="#7c3aed" strokeWidth="2" />
                  <circle cx={x} cy={py} r={isHovered || isLast || isSingle ? 5 : 3.5} fill={isHovered || isLast || isSingle ? '#d97706' : '#ffffff'} stroke="#d97706" strokeWidth="2" />
                  {showVal && (
                    <>
                      <text x={x} y={Math.min(cy, py) - 10} textAnchor="middle" className="tabular-nums font-semibold text-[10.5px] fill-purple-800">
                        總量 {p.cumulativeViews.toLocaleString()}
                      </text>
                      <text x={x} y={Math.max(py, cy) + 15} textAnchor="middle" className="tabular-nums font-semibold text-[10.5px] fill-amber-800">
                        +{p.periodViews.toLocaleString()}
                      </text>
                    </>
                  )}
                  {showTick && (
                    <g transform={`translate(${x}, ${padTop + plotH + 14})`}>
                      <text x={0} y={0} textAnchor="middle" className="tabular-nums text-[10.5px] font-semibold fill-stone-800">
                        {granularity === 'hourly' ? p.shortLabel.split(' ')[0] : p.shortLabel}
                      </text>
                      <text x={0} y={12} textAnchor="middle" className="tabular-nums text-[10.5px] font-bold fill-amber-700">
                        {granularity === 'hourly' ? p.timePart : p.datePart.slice(0, 4)}
                      </text>
                      {p.isFirstConfirmedPeriod && (
                        <text x={0} y={24} textAnchor="middle" className="font-sans font-bold text-[8.5px] fill-emerald-700">[首期起算]</text>
                      )}
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  const firstPeriodDisplay =
    granularity === 'hourly'
      ? `${confirmedFirstHourKey.replace(/-/g, '/')} (UTC+8)`
      : `${confirmedFirstDateKey.replace(/-/g, '/')} (UTC+8)`;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-4">
      {/* 指標摘要：瀏覽量與不重複訪客數分開呈現 */}
      {(() => {
        const todayKey = getUtc8Parts(Date.now()).dateKey;
        const tiles = [
          { label: '累計瀏覽量', value: (trafficStats.totalVisits || 0).toLocaleString(), hint: '每次開啟網站算一次' },
          { label: '今日瀏覽量', value: (trafficStats.daily?.[todayKey] || 0).toLocaleString(), hint: '台灣時間今日' },
          { label: '累計不重複訪客', value: (trafficStats.uniqueVisitorsTotal || 0).toLocaleString(), hint: '不重複裝置，自 v2.2.21 起算' },
          { label: '今日不重複訪客', value: (trafficStats.visitorsDaily?.[todayKey] || 0).toLocaleString(), hint: '同一裝置當日只算一次' },
          { label: '即時在線', value: `${trafficStats.onlineUsersCount || onlineUsersCount}`, hint: '最近 75 秒內在線' },
        ];
        return (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {tiles.map((t) => (
              <div key={t.label} className="rounded-xl border border-stone-200 bg-stone-50/70 px-3 py-2.5">
                <p className="text-[11px] font-bold text-stone-500">{t.label}</p>
                <p className="text-lg font-semibold text-stone-900 tabular-nums leading-tight mt-0.5">{t.value}</p>
                <p className="text-[11px] text-stone-400 mt-0.5">{t.hint}</p>
              </div>
            ))}
          </div>
        );
      })()}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-stone-100 pb-3.5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-amber-700" />
            </div>
            <h4 className="font-semibold text-sm sm:text-base text-stone-900">
              網站總瀏覽量 ＆ 每日／每時瀏覽量趨勢折線圖
            </h4>
            <span className="text-[11px] tabular-nums font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-stone-200">
              台灣標準時間 UTC+8
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-stone-200">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              100% 真實數據（無回填模擬）
            </span>
          </div>
          <p className="text-[11px] text-stone-500 mt-1 flex items-center gap-1.5 flex-wrap">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>目前基準時間：</span>
            <strong className="tabular-nums text-stone-800">{currentUtc8Str}</strong>
            <span className="text-stone-300">•</span>
            <span>即時在線：{trafficStats.onlineUsersCount || onlineUsersCount} 位</span>
            <span className="text-stone-300">•</span>
            <span className="text-emerald-700 font-semibold">
              起算期：{firstPeriodDisplay}（未有過去歷史資料之時段不計入）
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            role="switch"
            aria-checked={isOverlayMode}
            onClick={() => setIsOverlayMode((prev) => !prev)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none ${
              isOverlayMode
                ? 'bg-stone-50 border-stone-200 text-purple-950 shadow-2xs'
                : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200/70'
            }`}
          >
            <Layers className={`w-3.5 h-3.5 ${isOverlayMode ? 'text-purple-700' : 'text-stone-500'}`} />
            <span>總量 ＆ 單位時間量疊圖</span>
            <span className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${isOverlayMode ? 'bg-purple-600' : 'bg-stone-300'}`}>
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform ${isOverlayMode ? 'translate-x-4.5' : 'translate-x-1'}`} />
            </span>
          </button>

          <div className="inline-flex rounded-xl bg-stone-100 p-1 border border-stone-200">
            <button
              type="button"
              onClick={() => { setGranularity('hourly'); setHoveredIndex(null); }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${granularity === 'hourly' ? 'bg-amber-500 text-stone-950 shadow-2xs' : 'text-stone-600 hover:text-stone-900'}`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>每時瀏覽量</span>
            </button>
            <button
              type="button"
              onClick={() => { setGranularity('daily'); setHoveredIndex(null); }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${granularity === 'daily' ? 'bg-amber-500 text-stone-950 shadow-2xs' : 'text-stone-600 hover:text-stone-900'}`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>每日瀏覽量</span>
            </button>
          </div>

          {granularity === 'daily' && (
            <div className="inline-flex rounded-xl bg-stone-100 p-1 border border-stone-200">
              {([7, 14, 30] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => { setDailyRange(days); setHoveredIndex(null); }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${dailyRange === days ? 'bg-white text-stone-900 shadow-2xs border border-stone-200/80' : 'text-stone-500 hover:text-stone-800'}`}
                >
                  近 {days} 天
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={fetchLatestRealTraffic}
            disabled={isRefreshing}
            className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 border border-stone-200 transition-colors cursor-pointer disabled:opacity-50"
            title="立即從雲端同步最新真實流量 (UTC+8)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
          <span className="text-[11px] font-bold text-purple-800 block">網站累計總瀏覽量</span>
          <span className="text-lg sm:text-xl font-semibold text-purple-950 tabular-nums mt-0.5 block">
            {(summaryStats.endCumulative || 1700).toLocaleString()} <span className="text-xs font-bold">次</span>
          </span>
          <span className="text-[11px] text-purple-700 tabular-nums block mt-0.5 truncate">
            網站起始日2026/09/22
          </span>
        </div>
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
          <span className="text-[11px] font-bold text-amber-800 block">
            已記錄區間總計 ({activePoints.length} {granularity === 'hourly' ? '小時' : '日'})
          </span>
          <span className="text-lg sm:text-xl font-semibold text-amber-950 tabular-nums mt-0.5 block">
            {summaryStats.periodTotal.toLocaleString()} <span className="text-xs font-bold">次</span>
          </span>
          <span className="text-[11px] text-amber-700 tabular-nums block mt-0.5 truncate">
            平均每{granularity === 'hourly' ? '小時' : '日'} {summaryStats.periodAvg.toLocaleString()} 次
          </span>
        </div>
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
          <span className="text-[11px] font-bold text-emerald-800 block">
            {granularity === 'hourly' ? '當前小時真實瀏覽 (+8)' : '今日真實累計瀏覽 (+8)'}
          </span>
          <span className="text-lg sm:text-xl font-semibold text-emerald-950 tabular-nums mt-0.5 block">
            {(summaryStats.latestPoint?.periodViews || 0).toLocaleString()} <span className="text-xs font-bold">次</span>
          </span>
          <span className="text-[11px] text-emerald-700 tabular-nums block mt-0.5 truncate">{summaryStats.latestPoint?.shortLabel} (UTC+8)</span>
        </div>
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
          <span className="text-[11px] font-bold text-stone-600 block">最高峰時段 (+8)</span>
          <span className="text-lg sm:text-xl font-semibold text-stone-900 tabular-nums mt-0.5 block">
            {(summaryStats.peakPoint?.periodViews || 0).toLocaleString()} <span className="text-xs font-bold">次</span>
          </span>
          <span className="text-[11px] text-stone-500 tabular-nums block mt-0.5 truncate">{summaryStats.peakPoint?.fullDateTimeLabel || '-'}</span>
        </div>
      </div>

      {isOverlayMode ? (
        renderCombinedChart(activePoints)
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {renderSingleLineChart(
            activePoints,
            'periodViews',
            granularity === 'hourly' ? '每小時網站真實瀏覽量折線圖（UTC+8）' : '每日網站真實瀏覽量折線圖（UTC+8）',
            `僅顯示自確定有資料之當期（${firstPeriodDisplay}）起的真實流量，未有歷史資料之過去時段不計入`,
            '#d97706',
            'trafficPeriodGrad',
            granularity === 'hourly' ? '每時真實流量 (UTC+8)' : '每日真實流量 (UTC+8)',
            'bg-amber-100 text-amber-900 border-stone-200'
          )}
          {renderSingleLineChart(
            activePoints,
            'cumulativeViews',
            '網站總瀏覽量累計成長折線圖（UTC+8 時間軸）',
            `自確定有資料之首期（${firstPeriodDisplay}）開始逐期真實累加之總瀏覽量曲線`,
            '#7c3aed',
            'trafficCumulativeGrad',
            '累計總瀏覽量 (UTC+8)',
            'bg-purple-100 text-purple-900 border-stone-200'
          )}
        </div>
      )}

      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowDataTable((prev) => !prev)}
          className="w-full py-2 px-3 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-xs font-bold text-stone-700 flex items-center justify-between transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-amber-600" />
            <span>查看已記錄之真實流量明細表（共 {activePoints.length} 期，自 {firstPeriodDisplay} 起算）</span>
          </span>
          {showDataTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showDataTable && (
          <div className="mt-2.5 max-h-64 overflow-y-auto rounded-xl border border-stone-200 bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-stone-100 text-stone-600 sticky top-0 z-10 border-b border-stone-200">
                <tr>
                  <th className="py-2 px-3 font-semibold">日期時間 (UTC+8)</th>
                  <th className="py-2 px-3 font-semibold text-right">{granularity === 'hourly' ? '當小時真實瀏覽量' : '當日真實瀏覽量'}</th>
                  <th className="py-2 px-3 font-semibold text-right">累計網站總瀏覽量</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 tabular-nums">
                {[...activePoints].reverse().map((pt) => (
                  <tr key={pt.key} className={pt.isCurrent ? 'bg-stone-50 font-bold text-stone-950' : 'hover:bg-stone-50 text-stone-700'}>
                    <td className="py-2 px-3 flex items-center gap-1.5 flex-wrap">
                      <span>{pt.fullDateTimeLabel}</span>
                      {pt.isCurrent && <span className="text-[11px] px-1.5 py-0.2 rounded bg-amber-200 text-amber-950 font-sans font-semibold">目前時段</span>}
                      {pt.isFirstConfirmedPeriod && <span className="text-[11px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 border border-stone-200 font-sans font-semibold">首期資料起算點</span>}
                    </td>
                    <td className="py-2 px-3 text-right text-amber-700 font-bold">+{pt.periodViews.toLocaleString()} 次</td>
                    <td className="py-2 px-3 text-right text-purple-800 font-semibold">{pt.cumulativeViews.toLocaleString()} 次</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

