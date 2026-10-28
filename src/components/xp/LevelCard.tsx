import React from 'react';
import { Sparkles, Gift } from 'lucide-react';
import type { XpLite } from '../../services/xpService';

/** 個人等級資訊：目前等級、累積 XP、距離下一級、進度條、下一級是否有額外點數 */
export default function LevelCard({ xp, compact = false, onOpen }: { xp: XpLite | null; compact?: boolean; onOpen?: () => void }) {
  if (!xp) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-4 text-[13px] text-stone-500">等級資料載入中…</div>
    );
  }
  const pct = Math.round(xp.progress * 100);
  return (
    <div
      className={`rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white p-4 ${onOpen ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onOpen}
      role={onOpen ? 'button' : undefined}
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0 w-14 h-14 rounded-2xl bg-amber-500 text-white flex flex-col items-center justify-center shadow-sm">
          <span className="text-[10px] font-semibold leading-none opacity-90">Lv.</span>
          <span className="text-xl font-black leading-tight">{xp.level}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-[15px] font-bold text-stone-900">等級 Lv.{xp.level}</div>
            <div className="text-[12px] text-stone-500 tabular-nums">累積 {xp.totalXp.toLocaleString()} XP</div>
          </div>
          <div className="mt-2 h-2.5 rounded-full bg-amber-100 overflow-hidden" aria-label={`升級進度 ${pct}%`}>
            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2 text-[12px] text-stone-600">
            {xp.isMax ? (
              <span>已達目前最高等級 Lv.{xp.maxLevel}</span>
            ) : (
              <span className="tabular-nums">
                {xp.currentLevelXp.toLocaleString()} / {xp.levelSpan.toLocaleString()} XP・再 {xp.toNext.toLocaleString()} XP 升到 Lv.{xp.nextLevel}
              </span>
            )}
            {!compact && <span className="tabular-nums text-stone-400">{pct}%</span>}
          </div>
        </div>
      </div>
      {!xp.isMax && (
        <div className={`mt-3 flex items-center gap-1.5 text-[12.5px] ${xp.nextLevelIsSpecial ? 'text-amber-700 font-semibold' : 'text-stone-500'}`}>
          {xp.nextLevelIsSpecial ? <Gift className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          升到 Lv.{xp.nextLevel} 可獲得 {xp.nextLevelReward} 平台點{xp.nextLevelIsSpecial ? '（等級獎勵）' : ''}
        </div>
      )}
    </div>
  );
}
