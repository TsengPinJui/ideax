import React, { useEffect, useState } from 'react';
import { X, Sparkles, PartyPopper } from 'lucide-react';
import { XP_LEVELUP_EVENT, XpLevelUp } from '../../services/xpService';

interface Item {
  id: number;
  xp: number;
  levelUps: XpLevelUp[];
}

/** 獲得 XP／升級的提示：右下角小卡，不擋操作，幾秒後自動消失；一次升多級會列出每一級的獎勵 */
export default function XpToastLayer() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    let seq = 0;
    const on = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      const item: Item = { id: ++seq, xp: Number(d.xp) || 0, levelUps: Array.isArray(d.levelUps) ? d.levelUps : [] };
      if (!item.xp && !item.levelUps.length) return;
      setItems((prev) => [...prev.slice(-3), item]);
      window.setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== item.id)), item.levelUps.length ? 7000 : 3200);
    };
    window.addEventListener(XP_LEVELUP_EVENT, on);
    return () => window.removeEventListener(XP_LEVELUP_EVENT, on);
  }, []);
  if (!items.length) return null;
  return (
    <div className="fixed z-[90] right-3 bottom-24 sm:bottom-6 flex flex-col gap-2 items-end pointer-events-none" aria-live="polite">
      {items.map((it) => (
        <div key={it.id} className="pointer-events-auto rounded-2xl border border-amber-200 bg-white/95 backdrop-blur shadow-lg px-4 py-3 min-w-[220px] max-w-[300px] animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="flex items-start gap-2">
            {it.levelUps.length ? <PartyPopper className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" /> : <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              {it.levelUps.length ? (
                <>
                  <div className="text-[14px] font-bold text-stone-900">升級到 Lv.{it.levelUps[it.levelUps.length - 1].level}！</div>
                  <ul className="mt-1 space-y-0.5 text-[12.5px] text-stone-600">
                    {it.levelUps.map((u) => (
                      <li key={u.level} className="tabular-nums">
                        Lv.{u.level}：+{u.points} 平台點
                      </li>
                    ))}
                  </ul>
                  {it.xp > 0 && <div className="mt-1 text-[12px] text-amber-700 tabular-nums">本次 +{it.xp.toLocaleString()} XP</div>}
                </>
              ) : (
                <div className="text-[13.5px] font-semibold text-stone-800 tabular-nums">+{it.xp.toLocaleString()} XP</div>
              )}
            </div>
            <button type="button" className="text-stone-400 hover:text-stone-700" aria-label="關閉" onClick={() => setItems((prev) => prev.filter((x) => x.id !== it.id))}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
