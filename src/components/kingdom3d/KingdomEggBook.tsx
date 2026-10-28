import React from 'react';
import { BookOpen, X, CheckCircle2, Clock } from 'lucide-react';
import { TOTAL_ISLAND_EASTER_EGGS, EasterEggRecord } from '../island/easterEggBook';
import './kingdomUi.css';

/**
 * 實境漫遊的彩蛋收集冊（和 3D 地圖同一本）：
 * - 小地圖下方的小鍵（顯示已收集幾格）
 * - 觸發彩蛋時畫面上方的詩句卷軸（新收入時寫「收入第 N 格」）
 * - 收集冊彈窗：40 格，依發現順序
 */

export const KingdomEggButton: React.FC<{ count: number; onOpen: () => void; flash?: boolean }> = ({ count, onOpen, flash }) => (
  <button
    type="button"
    onClick={onOpen}
    className="kx-root kx-round h-7 sm:h-8 px-2 gap-1 text-[11px] sm:text-[12px] font-bold"
    data-on={flash}
    title="彩蛋收集冊（和 3D 地圖共用）：點島上的物件、動物、角色，就有機會觸發隱藏詩句"
    aria-label={`彩蛋收集冊，已收集 ${count} 格，共 ${TOTAL_ISLAND_EASTER_EGGS} 格`}
    data-ui-panel="true"
    style={{ width: 'auto', borderRadius: 999 }}
  >
    <BookOpen className="w-3.5 h-3.5" />
    <span className="tabular-nums">
      {count}/{TOTAL_ISLAND_EASTER_EGGS}
    </span>
  </button>
);

export const KingdomEggToast: React.FC<{ toast: { verse: string; slotIndex: number; added: boolean; key: number; header?: string } | null }> = ({ toast }) => {
  if (!toast) return null;
  return (
    <div
      key={toast.key}
      className="kx-root kx-egg-toast pointer-events-none"
      style={{ position: 'fixed', left: '50%', top: 'max(4.75rem, calc(env(safe-area-inset-top) + 4.25rem))', width: 'min(88vw, 34rem)', zIndex: 60, transform: 'translateX(-50%)' }}
    >
      <div className="kx-panel px-4 py-3 text-center" style={{ background: 'linear-gradient(180deg, rgba(253,246,227,0.97), rgba(240,226,190,0.97))', color: '#3b2314', borderColor: 'rgba(139,90,43,0.7)' }}>
        <div className="text-[11.5px] font-bold" style={{ color: toast.added ? '#b3261e' : '#7a5532' }}>
          {toast.header ?? (toast.added ? `✦ 新彩蛋收入收集冊第 ${String(toast.slotIndex).padStart(2, '0')} 格` : `第 ${String(toast.slotIndex).padStart(2, '0')} 格・已收集`)}
        </div>
        <div className="kx-serif text-[15px] sm:text-[17px] font-bold leading-relaxed mt-1">{toast.verse}</div>
      </div>
    </div>
  );
};

export const KingdomEggBookModal: React.FC<{ open: boolean; onClose: () => void; list: EasterEggRecord[] }> = ({ open, onClose, list }) => {
  if (!open) return null;
  return (
    <div className="kx-root fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/55 backdrop-blur-sm pointer-events-auto" onClick={onClose} data-ui-panel="true">
      <div className="kx-parchment relative w-full max-w-4xl rounded-2xl p-3 sm:p-5 max-h-[88vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-1 pb-3">
          <div>
            <h3 className="kx-serif text-xl sm:text-2xl font-black tracking-wider" style={{ color: '#5a2a14' }}>
              彩蛋收集冊
            </h3>
            <p className="text-[12.5px]" style={{ color: '#6b5236' }}>
              點島上的物件、動物、村民或角色就能觸發詩句；首次觸發依發現順序刊登。和 3D 地圖共用同一本，兩邊收集的都算。
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="rounded-full px-3 py-1 text-[12.5px] font-bold" style={{ background: 'rgba(179,38,30,0.12)', color: '#8e1f17', border: '1px solid rgba(179,38,30,0.35)' }}>
              已收集 {list.length} / {TOTAL_ISLAND_EASTER_EGGS}
            </span>
            <button type="button" onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/10 cursor-pointer" aria-label="關閉彩蛋收集冊" style={{ color: '#5a2a14' }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pr-1">
          {Array.from({ length: TOTAL_ISLAND_EASTER_EGGS }).map((_, idx) => {
            const r = list[idx];
            const n = String(idx + 1).padStart(2, '0');
            return (
              <div
                key={n}
                className="rounded-xl px-3 py-2.5"
                style={{
                  background: r ? 'rgba(255,250,236,0.9)' : 'rgba(90,60,30,0.07)',
                  border: `1px ${r ? 'solid' : 'dashed'} ${r ? 'rgba(179,38,30,0.35)' : 'rgba(107,82,54,0.35)'}`,
                }}
              >
                <div className="flex items-center justify-between text-[11px] font-bold" style={{ color: '#7a5532' }}>
                  <span>第 {n} 格</span>
                  {r ? (
                    <span className="flex items-center gap-1" style={{ color: '#15803d' }}>
                      <CheckCircle2 className="w-3 h-3" />
                      已解鎖
                    </span>
                  ) : (
                    <span>尚未觸發</span>
                  )}
                </div>
                {r ? (
                  <>
                    <div className="kx-serif text-[14px] font-bold leading-relaxed mt-1" style={{ color: '#3b2314' }}>
                      {r.verse}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] mt-1" style={{ color: '#8a7058' }}>
                      <Clock className="w-3 h-3" />
                      {r.unlockedAt}
                    </div>
                  </>
                ) : (
                  <div className="text-[12px] mt-1" style={{ color: '#8a7058' }}>
                    ？ 尋訪五島各處物件與時辰奇景以解鎖此格
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
