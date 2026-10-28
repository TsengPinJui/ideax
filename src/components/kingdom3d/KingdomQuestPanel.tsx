import React, { useEffect, useRef } from 'react';
import { ScrollText, X, CheckCircle2, Circle, Link2, BookOpen, HeartHandshake } from 'lucide-react';
import { DUO_QUESTS, QuestProgress, TOUR_SECONDS } from './quests';
import type { BondState } from './bonds';
import { TOTAL_ISLAND_EASTER_EGGS } from '../island/easterEggBook';
import './kingdomUi.css';

/**
 * 右側的任務清單：
 * - 單人任務：收集彩蛋
 * - 雙人任務：先和另一位旅人綁定羈絆，再一起遊船、登上聚雲塔、在指定地點一起遊覽 5 分鐘
 */

export const KingdomQuestButton: React.FC<{ onToggle: () => void; open: boolean; alert: boolean; doneCount: number }> = ({ onToggle, open, alert, doneCount }) => (
  <button
    type="button"
    onClick={onToggle}
    data-on={open}
    data-ui-panel="true"
    className="kx-root kx-round relative h-7 sm:h-8 px-2 gap-1 text-[11px] sm:text-[12px] font-bold"
    style={{ width: 'auto', borderRadius: 999 }}
    title="任務清單：收集彩蛋、和羈絆夥伴一起完成雙人任務"
    aria-label="任務清單"
    aria-expanded={open}
  >
    <ScrollText className="w-3.5 h-3.5" />
    <span>任務</span>
    <span className="tabular-nums opacity-80">
      {doneCount}/{DUO_QUESTS.length + 1}
    </span>
    {alert && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full" style={{ background: '#ef4444', boxShadow: '0 0 0 2px rgba(20,10,5,0.8)' }} />}
  </button>
);

export const KingdomQuestPanel: React.FC<{
  open: boolean;
  onClose: () => void;
  eggCount: number;
  onOpenEggBook: () => void;
  quests: QuestProgress;
  bond: BondState;
  onAccept: (key: string) => void;
  onDecline: (key: string) => void;
  onRelease: () => void;
  partnerOnline: boolean;
  multiplayerOnline: boolean;
}> = ({ open, onClose, eggCount, onOpenEggBook, quests, bond, onAccept, onDecline, onRelease, partnerOnline, multiplayerOnline }) => {
  const boxRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      const t = e.target as HTMLElement;
      if (boxRef.current && !boxRef.current.contains(t) && !t.closest?.('[aria-label="任務清單"]')) onClose();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
    };
  }, [open, onClose]);
  if (!open) return null;
  const eggDone = eggCount >= TOTAL_ISLAND_EASTER_EGGS;
  return (
    <div
      ref={boxRef}
      className="kx-root kx-panel pointer-events-auto flex flex-col"
      data-ui-panel="true"
      style={{ position: 'fixed', right: 'max(0.5rem, env(safe-area-inset-right))', top: 'max(13.5rem, calc(env(safe-area-inset-top) + 13rem))', width: 'min(19rem, 86vw)', maxHeight: 'calc(100vh - 15rem)', zIndex: 40 }}
    >
      <div className="flex items-center justify-between px-3 pt-2.5 pb-2" style={{ borderBottom: '1px solid rgba(226,184,90,0.25)' }}>
        <div className="kx-serif text-[15px] font-black tracking-wider flex items-center gap-1.5" style={{ color: '#f6e7c4' }}>
          <ScrollText className="w-4 h-4" /> 任務清單
        </div>
        <button type="button" onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 cursor-pointer" aria-label="關閉任務清單" style={{ color: '#f6e7c4' }}>
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="overflow-y-auto px-3 py-2.5 space-y-3 text-[12.5px]" style={{ color: '#f6e7c4' }}>
        {/* 單人任務 */}
        <section>
          <div className="text-[11px] font-bold mb-1.5" style={{ color: '#e2b85a' }}>單人任務</div>
          <button type="button" onClick={onOpenEggBook} className="w-full text-left rounded-lg px-2.5 py-2 cursor-pointer" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(226,184,90,0.25)' }}>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-bold">
                {eggDone ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <BookOpen className="w-4 h-4" />}
                收集彩蛋
              </span>
              <span className="tabular-nums text-[11.5px] opacity-85">
                {eggCount}/{TOTAL_ISLAND_EASTER_EGGS}
              </span>
            </div>
            <div className="h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <div className="h-full rounded-full" style={{ width: `${(eggCount / TOTAL_ISLAND_EASTER_EGGS) * 100}%`, background: '#e2b85a' }} />
            </div>
            <div className="text-[11px] mt-1 opacity-75">點島上的物件、動物、村民與角色觸發隱藏詩句（和 3D 地圖共用收集冊）</div>
          </button>
        </section>

        {/* 羈絆 */}
        <section>
          <div className="text-[11px] font-bold mb-1.5 flex items-center gap-1" style={{ color: '#e2b85a' }}>
            <Link2 className="w-3.5 h-3.5" /> 羈絆
          </div>
          {!multiplayerOnline ? (
            <p className="text-[11.5px] opacity-80">多人連線中斷，暫時無法綁定羈絆。</p>
          ) : bond.partner ? (
            <div className="rounded-lg px-2.5 py-2" style={{ background: 'rgba(242,198,106,0.12)', border: '1px solid rgba(242,198,106,0.45)' }}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-bold">
                  <HeartHandshake className="w-4 h-4" style={{ color: '#ffd27a' }} />
                  {bond.partner.name}
                </span>
                <span className="text-[11px] opacity-80">{partnerOnline ? '在線上・羈絆線相連' : '目前不在線上'}</span>
              </div>
              <button type="button" onClick={onRelease} className="kx-btn-ghost mt-2 w-full px-2 py-1 text-[11.5px] cursor-pointer">
                解除羈絆
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {bond.incoming.map((e) => (
                <div key={e.key} className="rounded-lg px-2.5 py-2" style={{ background: 'rgba(179,38,30,0.18)', border: '1px solid rgba(242,198,106,0.4)' }}>
                  <div className="font-bold">{e.n} 邀請你綁定羈絆</div>
                  <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                    <button type="button" onClick={() => onAccept(e.key)} className="kx-btn-primary px-2 py-1 text-[12px] cursor-pointer">
                      接受
                    </button>
                    <button type="button" onClick={() => onDecline(e.key)} className="kx-btn-ghost px-2 py-1 text-[12px] cursor-pointer">
                      婉拒
                    </button>
                  </div>
                </div>
              ))}
              {bond.outgoing ? (
                <div className="rounded-lg px-2.5 py-2 text-[11.5px]" style={{ background: 'rgba(0,0,0,0.25)', border: '1px dashed rgba(226,184,90,0.35)' }}>
                  已送出邀請，等對方接受…
                  <button type="button" onClick={onRelease} className="kx-btn-ghost mt-1.5 w-full px-2 py-1 text-[11.5px] cursor-pointer">
                    取消邀請
                  </button>
                </div>
              ) : (
                !bond.incoming.length && <p className="text-[11.5px] opacity-80">點畫面上其他旅人，就能邀請對方綁定羈絆；對方接受後，兩人之間會出現一條發光的羈絆線。</p>
              )}
            </div>
          )}
        </section>

        {/* 雙人任務 */}
        <section>
          <div className="text-[11px] font-bold mb-1.5" style={{ color: '#e2b85a' }}>雙人任務（和羈絆夥伴一起）</div>
          <div className="space-y-1.5">
            {DUO_QUESTS.map((q) => {
              const d = quests.done[q.id];
              const sec = quests.tour[q.id] || 0;
              return (
                <div key={q.id} className="rounded-lg px-2.5 py-2" style={{ background: d ? 'rgba(16,120,80,0.18)' : 'rgba(0,0,0,0.25)', border: `1px solid ${d ? 'rgba(52,211,153,0.45)' : 'rgba(226,184,90,0.22)'}` }}>
                  <div className="flex items-center gap-1.5 font-bold">
                    {d ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <Circle className="w-4 h-4 opacity-60 shrink-0" />}
                    <span>{q.title}</span>
                  </div>
                  <div className="text-[11px] mt-0.5 opacity-75">{d ? `已和 ${d.with} 完成・${d.at}` : q.hint}</div>
                  {q.place && !d && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
                        <div className="h-full rounded-full" style={{ width: `${(sec / TOUR_SECONDS) * 100}%`, background: '#e2b85a' }} />
                      </div>
                      <span className="tabular-nums text-[10.5px] opacity-80">
                        {Math.floor(sec / 60)}:{String(Math.floor(sec % 60)).padStart(2, '0')} / 5:00
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

/** 有人邀請綁定羈絆時，畫面上方的提示 */
export const BondInviteBanner: React.FC<{ name: string; onAccept: () => void; onDecline: () => void; replacing?: string }> = ({ name, onAccept, onDecline, replacing }) => (
  <div className="kx-root kx-egg-toast pointer-events-auto" data-ui-panel="true" style={{ position: 'fixed', left: '50%', bottom: 'max(7.5rem, calc(env(safe-area-inset-bottom) + 7rem))', width: 'min(88vw, 24rem)', zIndex: 61, transform: 'translateX(-50%)' }}>
    <div className="kx-panel px-4 py-3">
      <div className="kx-serif font-bold text-[15px] flex items-center gap-1.5" style={{ color: '#f6e7c4' }}>
        <Link2 className="w-4 h-4" style={{ color: '#ffd27a' }} />
        {name} 邀請你綁定羈絆
      </div>
      {replacing && <div className="text-[11.5px] mt-0.5" style={{ color: '#f6c9a0' }}>接受後會解除和 {replacing} 的羈絆</div>}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <button type="button" onClick={onAccept} className="kx-btn-primary px-3 py-1.5 text-[13px] cursor-pointer">
          接受
        </button>
        <button type="button" onClick={onDecline} className="kx-btn-ghost px-3 py-1.5 text-[13px] cursor-pointer">
          婉拒
        </button>
      </div>
    </div>
  </div>
);
