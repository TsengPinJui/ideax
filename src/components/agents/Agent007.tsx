import React, { useEffect, useRef, useState } from 'react';

/**
 * AI CRM Agent「007」：人機族，集雷達、軍師、特助三件法寶於一身。
 * 說話方式保持機器人口吻（「嗶—」「指令確認」「切換待機模式」）。
 */
export type Bot007Mood = 'hello' | 'analyze' | 'think' | 'surprise' | 'happy' | 'run' | 'focus' | 'question';

const IMG: Record<Bot007Mood, string> = {
  hello: '/agents/007/hello.webp',
  analyze: '/agents/007/analyze.webp',
  think: '/agents/007/think.webp',
  surprise: '/agents/007/surprise.webp',
  happy: '/agents/007/happy.webp',
  run: '/agents/007/run.webp',
  focus: '/agents/007/focus.webp',
  question: '/agents/007/question.webp',
};

/** 頭像：表情跟著狀態變；雷達開著時外圈有掃描波 */
export const Agent007Avatar: React.FC<{ mood: Bot007Mood; scanning: boolean; className?: string }> = ({ mood, scanning, className = '' }) => (
  <div className={`relative shrink-0 ${className}`}>
    <div className="absolute inset-0 rounded-2xl bg-purple-500/20 blur-md" aria-hidden="true" />
    <div className="relative w-full h-full rounded-2xl bg-gradient-to-b from-purple-200/90 to-violet-100/80 border border-purple-300/60 overflow-hidden flex items-end justify-center">
      <img key={mood} src={IMG[mood]} alt="AI CRM Agent 007" className="w-[92%] h-[92%] object-contain animate-in fade-in zoom-in-95 duration-200" />
    </div>
    {/* 雷達指示燈：巡航中綠燈閃爍、待機灰燈 */}
    <span className="absolute -top-1 -right-1 flex w-3.5 h-3.5" title={scanning ? '雷達巡航中' : '雷達待機'}>
      {scanning && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />}
      <span className={`relative inline-flex w-3.5 h-3.5 rounded-full border-2 border-stone-900 ${scanning ? 'bg-emerald-400' : 'bg-stone-500'}`} />
    </span>
  </div>
);

/** 機器人對話列：像終端機一樣逐字打出來 */
export const Agent007Console: React.FC<{ text: string; nonce: number }> = ({ text, nonce }) => {
  const [shown, setShown] = useState('');
  const timer = useRef(0);
  useEffect(() => {
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setShown(text); return; }
    const chars = Array.from(text);
    let i = 0;
    setShown('');
    window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      i += 1;
      setShown(chars.slice(0, i).join(''));
      if (i >= chars.length) window.clearInterval(timer.current);
    }, 32);
    return () => window.clearInterval(timer.current);
  }, [text, nonce]);
  return (
    <div className="flex items-start gap-2 rounded-xl bg-black/30 border border-purple-400/30 px-3 py-2 font-mono text-[11px] sm:text-xs text-purple-100 leading-relaxed" role="status" aria-live="polite">
      <span className="text-purple-300 font-black shrink-0">007&gt;</span>
      <span className="min-w-0">
        {shown}
        <span className="inline-block w-1.5 h-3.5 align-[-2px] ml-0.5 bg-purple-300 animate-pulse" aria-hidden="true" />
      </span>
    </div>
  );
};

export type Bot007Tool = 'radar' | 'strategist' | 'assistant';
const TOOLS: Array<{ id: Bot007Tool; name: string; img: string; desc: string; line: string }> = [
  { id: 'radar', name: '雷達', img: '/agents/007/scene-radar.webp', desc: '案件巡航、掃描市場與潛在機會', line: '掃描半徑：全站案件' },
  { id: 'strategist', name: '軍師', img: '/agents/007/scene-strategist.webp', desc: '客群與成案意向分析、提供策略', line: '分析模組：成案意向' },
  { id: 'assistant', name: '特助', img: '/agents/007/scene-assistant.webp', desc: '任務管理、建議最佳跟進時機', line: '任務模組：排程跟進' },
];

/** 三件法寶：點一下切到對應的功能分頁 */
export const Agent007Toolkit: React.FC<{ onPick: (tool: Bot007Tool) => void }> = ({ onPick }) => (
  <div className="grid grid-cols-3 gap-2 sm:gap-3">
    {TOOLS.map((t) => (
      <button
        key={t.id}
        type="button"
        onClick={() => onPick(t.id)}
        className="group text-left rounded-2xl overflow-hidden bg-white border border-purple-200 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center sm:gap-3 sm:p-2"
      >
        <div className="aspect-square sm:w-20 sm:h-20 sm:aspect-auto shrink-0 overflow-hidden bg-purple-100 sm:rounded-xl">
          <img src={t.img} alt={`007 的法寶：${t.name}`} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
        <div className="p-2 sm:p-0 min-w-0">
          <div className="text-xs sm:text-sm font-black text-purple-950">{t.name}</div>
          <div className="hidden sm:block text-[11px] text-stone-600 mt-0.5 leading-snug">{t.desc}</div>
          <div className="mt-1 font-mono text-[9px] sm:text-[10px] text-purple-600 truncate">{t.line}</div>
        </div>
      </button>
    ))}
  </div>
);
