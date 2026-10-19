import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { fetchMascotStats, MascotDayStats } from '../services/mascotApi';

const AGENT_LABELS: Record<string, string> = { cs: '客服特助', market_advisor: '市場顧問', aicrm: '業務顧問' };

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
    const t = { impression: 0, click: 0, open: 0, ask: 0, drag: 0, collapse: 0, session: 0, sad: 0, comfort: 0, unanswered: 0, chat_mascot: 0, chat_agent: 0, mascot_answered: 0, escalated: 0, interactionMs: 0, chatMascotMs: 0, chatAgentMs: 0, agents: {} as Record<string, number> };
    for (const r of rows || []) {
      for (const k of ['impression', 'click', 'open', 'ask', 'drag', 'collapse', 'session', 'sad', 'comfort', 'unanswered', 'chat_mascot', 'chat_agent', 'mascot_answered', 'escalated'] as const) t[k] += r.counts[k] || 0;
      t.interactionMs += r.interactionMs || 0;
      t.chatMascotMs += r.chatMascotMs || 0;
      t.chatAgentMs += r.chatAgentMs || 0;
      for (const [a, n] of Object.entries(r.agents || {})) t.agents[a] = (t.agents[a] || 0) + (n || 0);
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
            <p className="text-xs font-bold text-stone-600 mb-2">提問分流</p>
            <div className="space-y-1.5">
              {Object.keys(AGENT_LABELS).map((a) => {
                const n = total.agents[a] || 0;
                const w = total.ask ? Math.round((n / total.ask) * 100) : 0;
                return (
                  <div key={a} className="flex items-center gap-2 text-xs">
                    <span className="w-16 shrink-0 font-bold text-stone-700">{AGENT_LABELS[a]}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-stone-100 overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${w}%` }} />
                    </div>
                    <span className="w-20 text-right text-stone-600">{n} 題（{w}%）</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
