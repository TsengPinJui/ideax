import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { fetchMascotStats, MascotDayStats } from '../services/mascotApi';

const AGENT_LABELS: Record<string, string> = { cs: '客服特助', market_advisor: '市場顧問', aicrm: '業務顧問' };

/** 小燈泡轉介的功能（欄位名稱的「:」存成「__」） */
const NAV_LABELS: Record<string, string> = {
  job_explorer: '匯職缺',
  create: '發布創點子',
  explore: '首頁探索',
  solvers: '專家',
  headhunter: '獵頭',
  ai_crm: '007 AI CRM',
  membership: '會員方案',
  my_projects: '我的案件',
  customer_service: '客服（多慧）',
  ticket: '專人回報工單',
  dash__points_receivables: '點數與收款',
  dash__subscriptions: '訂閱管理',
  dash__profile: '個人資料',
  dash__real_name_auth: '實名認證',
  dash__expert_certification: '專家認證',
  dash__customer_service_report: '客服回報紀錄',
};

function pct(n: number, d: number) {
  return d > 0 ? `${((n / d) * 100).toFixed(1)}%` : '—';
}
function fmtDuration(ms: number) {
  if (!ms) return '—';
  const s = Math.round(ms / 1000);
  if (s >= 3600) return `${Math.floor(s / 3600)} 小時 ${Math.floor((s % 3600) / 60)} 分`;
  return s >= 60 ? `${Math.floor(s / 60)} 分 ${s % 60} 秒` : `${s} 秒`;
}

/** 管理員：吉祥物互動統計（曝光、點擊率、互動時長、提問與分流） */
export const AdminMascotStatsCard: React.FC = () => {
  const [days, setDays] = useState(7);
  const [rows, setRows] = useState<MascotDayStats[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setRows(null);
    setError(false);
    fetchMascotStats(days).then((r) => {
      if (!alive) return;
      if (r) setRows(r);
      else setError(true);
    });
    return () => {
      alive = false;
    };
  }, [days]);

  const total = useMemo(() => {
    const t = { impression: 0, click: 0, open: 0, ask: 0, drag: 0, collapse: 0, session: 0, sad: 0, comfort: 0, unanswered: 0, chat_mascot: 0, chat_agent: 0, mascot_answered: 0, escalated: 0, interactionMs: 0, chatMascotMs: 0, chatAgentMs: 0, agents: {} as Record<string, number>, navs: {} as Record<string, number>, navOffers: {} as Record<string, number> };
    for (const r of rows || []) {
      for (const k of ['impression', 'click', 'open', 'ask', 'drag', 'collapse', 'session', 'sad', 'comfort', 'unanswered', 'chat_mascot', 'chat_agent', 'mascot_answered', 'escalated'] as const) t[k] += r.counts[k] || 0;
      t.interactionMs += r.interactionMs || 0;
      t.chatMascotMs += r.chatMascotMs || 0;
      t.chatAgentMs += r.chatAgentMs || 0;
      for (const [a, n] of Object.entries(r.agents || {})) t.agents[a] = (t.agents[a] || 0) + (n || 0);
      for (const [a, n] of Object.entries(r.navs || {})) t.navs[a] = (t.navs[a] || 0) + (Number(n) || 0);
      for (const [a, n] of Object.entries(r.navOffers || {})) t.navOffers[a] = (t.navOffers[a] || 0) + (Number(n) || 0);
    }
    return t;
  }, [rows]);

  const t_chatMascot = total.chatMascotMs;
  const t_chatAgent = total.chatAgentMs;
  const tiles = [
    { label: '曝光次數', value: total.impression.toLocaleString() },
    { label: '點擊率', value: pct(total.click, total.impression), sub: `${total.click.toLocaleString()} 次點擊` },
    { label: '開啟對話率', value: pct(total.open, total.impression), sub: `${total.open.toLocaleString()} 次開啟` },
    { label: '提問數', value: total.ask.toLocaleString(), sub: `每次開啟 ${total.open ? (total.ask / total.open).toFixed(1) : '—'} 題` },
    { label: '無法回答', value: total.unanswered.toLocaleString(), sub: `占提問 ${pct(total.unanswered, total.ask)}` },
    { label: '跟小燈泡聊天', value: fmtDuration(t_chatMascot), sub: `平均每段 ${fmtDuration(total.chat_mascot ? total.chatMascotMs / total.chat_mascot : 0)}・小燈泡自己回答 ${total.mascot_answered.toLocaleString()} 題` },
    { label: '跟 AI 客服對話', value: fmtDuration(t_chatAgent), sub: `平均每段 ${fmtDuration(total.chat_agent ? total.chatAgentMs / total.chat_agent : 0)}・轉接 ${total.escalated.toLocaleString()} 次` },
    { label: '平均互動時長', value: fmtDuration(total.session ? total.interactionMs / total.session : 0), sub: `${total.session.toLocaleString()} 段互動` },
    { label: '收起次數', value: total.collapse.toLocaleString(), sub: `拖曳 ${total.drag.toLocaleString()} 次` },
    { label: '回訪安慰率', value: pct(total.comfort, total.sad), sub: `想你 ${total.sad.toLocaleString()} 次・被安慰 ${total.comfort.toLocaleString()} 次` },
  ];

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-black text-stone-900">首頁小燈泡互動統計</h3>
        </div>
        <div className="flex gap-1.5" role="group" aria-label="統計區間">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              aria-pressed={days === d}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${days === d ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}
            >
              近 {d} 天
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-xs font-bold text-rose-700">讀取失敗：請確認以管理員帳號登入。</p>}
      {!rows && !error && <p className="text-xs text-stone-500">讀取中…</p>}
      {rows && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {tiles.map((t) => (
              <div key={t.label} className="rounded-xl bg-stone-50 border border-stone-200 p-3">
                <p className="text-[11px] font-bold text-stone-500">{t.label}</p>
                <p className="text-lg font-black text-stone-900 mt-0.5">{t.value}</p>
                {t.sub && <p className="text-[11px] text-stone-500 mt-0.5">{t.sub}</p>}
              </div>
            ))}
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-2 flex-wrap mb-2">
              <p className="text-xs font-bold text-stone-600">小燈泡轉介的功能</p>
              <p className="text-[10px] text-stone-400">比例＝佔全部轉介點擊；「建議」＝回答裡出現這個功能按鈕的次數</p>
            </div>
            {(() => {
              const keys = Array.from(new Set([...Object.keys(total.navs), ...Object.keys(total.navOffers)])).filter((k) => k in NAV_LABELS);
              const clicks = keys.reduce((n, k) => n + (total.navs[k] || 0), 0);
              if (!keys.length) return <p className="text-[11px] text-stone-500">v3.4.1 起開始記錄；小燈泡在回答裡建議功能、使用者點下去之後就會出現。</p>;
              const rowsN = keys
                .map((k) => ({ k, n: total.navs[k] || 0, offer: total.navOffers[k] || 0 }))
                .sort((x, y) => y.n - x.n || y.offer - x.offer);
              return (
                <div className="space-y-1.5">
                  {rowsN.map(({ k, n, offer }) => {
                    const w = clicks ? Math.round((n / clicks) * 100) : 0;
                    return (
                      <div key={k} className="grid grid-cols-[6.5rem_1fr_8.5rem] sm:grid-cols-[7.5rem_1fr_10rem] items-center gap-2 text-xs">
                        <span className="font-bold text-stone-700 truncate" title={NAV_LABELS[k]}>{NAV_LABELS[k]}</span>
                        <div className="h-2.5 rounded-full bg-stone-100 overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${w}%` }} />
                        </div>
                        <span className="text-right text-stone-600 tabular-nums whitespace-nowrap">
                          {n} 次（{w}%）<span className="text-stone-400">・建議 {offer}</span>
                        </span>
                      </div>
                    );
                  })}
                  <p className="text-[11px] text-stone-500 pt-0.5">共轉介 {clicks} 次；建議後被點的比例 {pct(clicks, rowsN.reduce((n, r) => n + r.offer, 0))}</p>
                </div>
              );
            })()}
            <p className="text-[10px] text-stone-400 mt-2">
              提問交給：{Object.keys(AGENT_LABELS).map((a) => `${AGENT_LABELS[a]} ${total.agents[a] || 0} 題`).join('、')}
            </p>
          </div>
        </>
      )}
    </div>
  );
};
