import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Circle, CircleDot, Clock, Gift, History, RefreshCw } from 'lucide-react';
import LevelCard from './LevelCard';
import { fetchMyXp, reportXp, XpFull, XP_STATE_EVENT } from '../../services/xpService';

const GROUPS: { key: string; title: string }[] = [
  { key: 'start', title: '新手任務' },
  { key: 'daily', title: '每日任務' },
  { key: 'weekly', title: '每週挑戰' },
  { key: 'explore', title: '3D 創點源世界探索' },
  { key: 'contribute', title: '問答貢獻' },
];

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/** 等級與任務：個人等級、任務清單（狀態、重置時間）、等級獎勵預覽、經驗值紀錄與升級歷史 */
export default function LevelTasksPanel() {
  const [data, setData] = useState<XpFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    const d = (await fetchMyXp(true)) as XpFull | null;
    setData(d);
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
    const on = () => void load();
    window.addEventListener(XP_STATE_EVENT + '_refresh', on);
    return () => window.removeEventListener(XP_STATE_EVENT + '_refresh', on);
  }, [load]);

  const claim = async (taskId: string) => {
    setBusy(taskId);
    setMsg('');
    try {
      const res = await fetch('/api/xp/claim', {
        method: 'POST',
        headers: await (await import('../../services/authHeader')).getAuthHeaders(),
        body: JSON.stringify({ taskId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.success) setMsg(j.error || '領取失敗，請稍後再試');
      else {
        if (j.levelUps?.length || j.xp) window.dispatchEvent(new CustomEvent('ideax_xp_levelup', { detail: { levelUps: j.levelUps || [], xp: j.xp } }));
        if (!j.granted) setMsg('這項任務已經領取過了');
      }
    } catch {
      setMsg('目前無法連線，請稍後再試');
    }
    setBusy(null);
    void load();
  };

  if (loading && !data) return <div className="p-6 text-[13px] text-stone-500">等級資料載入中…</div>;
  if (!data) return <div className="p-6 text-[13px] text-stone-500">登入後就能查看等級與任務。</div>;

  const claimable = new Set(['profile', 'daily_checkin']);
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-stone-900">等級與任務</h2>
          <p className="text-[13px] text-stone-500 mt-0.5">完成任務、探索 3D 創點源世界、提出有效問題與回答都能累積經驗值；升級時依等級發放平台點。</p>
        </div>
        <button type="button" onClick={() => void load()} className="shrink-0 p-2 rounded-lg text-stone-500 hover:bg-stone-100" aria-label="重新整理">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <LevelCard xp={data} />
      {msg && <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[13px] text-amber-800">{msg}</div>}

      <div className="flex flex-wrap gap-3 text-[12px] text-stone-500">
        <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />每日任務重置：{data.resets.daily}</span>
        <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />每週挑戰重置：{data.resets.weekly}</span>
      </div>

      {GROUPS.map((g) => {
        const list = data.tasks.filter((t) => t.group === g.key);
        if (!list.length) return null;
        return (
          <section key={g.key} className="rounded-2xl border border-stone-200 bg-white">
            <div className="px-4 py-2.5 border-b border-stone-100 text-[13.5px] font-semibold text-stone-800">{g.title}</div>
            <ul className="divide-y divide-stone-100">
              {list.map((t) => (
                <li key={t.id} className="px-4 py-3 flex items-center gap-3">
                  {t.status === 'done' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : t.status === 'partial' ? (
                    <CircleDot className="w-5 h-5 text-amber-500 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-stone-300 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-medium text-stone-900">{t.title}</div>
                    <div className="text-[12px] text-stone-500">{t.desc}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[13px] font-semibold text-amber-700 tabular-nums">{t.kind === 'admin' ? '500–1,000' : `+${t.xp.toLocaleString()}`} XP</div>
                    <div className="text-[11.5px] text-stone-400 tabular-nums">
                      {t.status === 'done' ? (t.kind === 'daily' ? '今日已完成' : t.kind === 'weekly' ? '本週已完成' : '已領取') : t.progress || (t.kind === 'admin' ? '審核後發放' : '待完成')}
                    </div>
                    {claimable.has(t.id) && t.status !== 'done' && (
                      <button
                        type="button"
                        disabled={busy === t.id}
                        onClick={() => void claim(t.id)}
                        className="mt-1 px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[12px] font-semibold hover:bg-amber-600 disabled:opacity-60"
                      >
                        {busy === t.id ? '領取中…' : '領取'}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <section className="rounded-2xl border border-stone-200 bg-white">
        <div className="px-4 py-2.5 border-b border-stone-100 text-[13.5px] font-semibold text-stone-800 flex items-center gap-1.5">
          <Gift className="w-4 h-4 text-amber-500" />等級點數獎勵
        </div>
        <div className="p-4">
          <p className="text-[12.5px] text-stone-500 mb-3">每升一級獲得 {data.rewardPreview.defaultPoints} 平台點；下列等級改發該級合計獎勵（不另加 1 點）。獎勵發到一般平台點，不可提現。</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {data.rewardPreview.special.map((r) => {
              const got = data.rewards.some((x) => x.level === r.level);
              return (
                <div key={r.level} className={`rounded-xl border px-3 py-2 ${got ? 'border-emerald-200 bg-emerald-50' : data.level >= r.level ? 'border-stone-200' : 'border-amber-200 bg-amber-50/50'}`}>
                  <div className="text-[13px] font-bold text-stone-900">Lv.{r.level}</div>
                  <div className="text-[12.5px] text-amber-700 font-semibold">{r.points} 點</div>
                  <div className="text-[11px] text-stone-400 tabular-nums">累積 {r.xp.toLocaleString()} XP</div>
                  {got && <div className="text-[11px] text-emerald-600">已領取</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="rounded-2xl border border-stone-200 bg-white">
          <div className="px-4 py-2.5 border-b border-stone-100 text-[13.5px] font-semibold text-stone-800 flex items-center gap-1.5">
            <History className="w-4 h-4 text-stone-500" />經驗值紀錄
          </div>
          <ul className="divide-y divide-stone-100 max-h-80 overflow-y-auto">
            {data.ledger.length ? (
              data.ledger.map((e, i) => (
                <li key={i} className="px-4 py-2 flex items-center justify-between gap-2 text-[12.5px]">
                  <span className="text-stone-700 truncate">{e.reason}</span>
                  <span className="shrink-0 text-right">
                    <span className={`font-semibold tabular-nums ${e.delta >= 0 ? 'text-amber-700' : 'text-rose-600'}`}>{e.delta >= 0 ? '+' : ''}{e.delta} XP</span>
                    <span className="block text-[11px] text-stone-400">{fmtTime(e.createdAt)}</span>
                  </span>
                </li>
              ))
            ) : (
              <li className="px-4 py-6 text-center text-[12.5px] text-stone-400">還沒有經驗值紀錄</li>
            )}
          </ul>
        </section>
        <section className="rounded-2xl border border-stone-200 bg-white">
          <div className="px-4 py-2.5 border-b border-stone-100 text-[13.5px] font-semibold text-stone-800 flex items-center gap-1.5">
            <Gift className="w-4 h-4 text-stone-500" />升級歷史
          </div>
          <ul className="divide-y divide-stone-100 max-h-80 overflow-y-auto">
            {data.rewards.length ? (
              data.rewards.map((r) => (
                <li key={r.level} className="px-4 py-2 flex items-center justify-between gap-2 text-[12.5px]">
                  <span className="text-stone-700">升到 Lv.{r.level}</span>
                  <span className="shrink-0 text-right">
                    <span className="font-semibold text-amber-700 tabular-nums">+{r.points} 平台點</span>
                    <span className="block text-[11px] text-stone-400">{fmtTime(r.createdAt)}</span>
                  </span>
                </li>
              ))
            ) : (
              <li className="px-4 py-6 text-center text-[12.5px] text-stone-400">還沒有升級紀錄</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

/** 給其他畫面觸發重新整理 */
export const refreshLevelTasks = () => window.dispatchEvent(new Event(XP_STATE_EVENT + '_refresh'));
export { reportXp };
