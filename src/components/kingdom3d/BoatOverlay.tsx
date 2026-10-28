import React, { useEffect, useRef, useState } from 'react';
import { Sailboat, X, Users, Clock } from 'lucide-react';
import { BoatingService, BoatSlot, MAX_BOATS, OFFER_SECONDS } from './boating';
import { findDock } from './stylized/docks';
import './kingdomUi.css';

/**
 * 遊湖乘船的畫面：
 * - 點渡口：顯示湖上船數，可以「乘船」、上別人還有空位的船、或船滿時「排隊」
 * - 排隊中：上方顯示第幾位；輪到時跳出「有空船了」，10 秒內選「乘船」或「再等等」
 * - 乘船中：說明怎麼划船＋「下船」
 */
export const BoatOverlay: React.FC<{
  tick: number;
  dockId: string | null;
  riding: null | { role: 'owner' | 'passenger'; owner?: string };
  service: BoatingService;
  onClose: () => void;
  onBoard: (dockId: string, join?: BoatSlot | null) => void;
  onQueue: (dockId: string) => void;
  onAcceptOffer: () => void;
  onLater: (timedOut: boolean) => void;
  onLeaveQueue: () => void;
  onLeaveBoat: () => void;
}> = ({ tick, dockId, riding, service, onClose, onBoard, onQueue, onAcceptOffer, onLater, onLeaveQueue, onLeaveBoat }) => {
  void tick;
  const [offerLeft, setOfferLeft] = useState<number | null>(null);
  const offerTimer = useRef<number | null>(null);
  const hasOffer = !riding && service.isQueued && service.hasOffer;

  // 輪到自己：10 秒倒數，沒回應就讓給下一位
  useEffect(() => {
    if (!hasOffer) {
      if (offerTimer.current) window.clearInterval(offerTimer.current);
      offerTimer.current = null;
      setOfferLeft(null);
      return;
    }
    if (offerTimer.current) return;
    const deadline = Date.now() + OFFER_SECONDS * 1000;
    setOfferLeft(OFFER_SECONDS);
    try {
      navigator.vibrate?.(120);
    } catch {
      // ignore
    }
    offerTimer.current = window.setInterval(() => {
      const left = Math.ceil((deadline - Date.now()) / 1000);
      if (left <= 0) {
        if (offerTimer.current) window.clearInterval(offerTimer.current);
        offerTimer.current = null;
        setOfferLeft(null);
        onLater(true);
      } else setOfferLeft(left);
    }, 250);
  }, [hasOffer, onLater]);
  useEffect(
    () => () => {
      if (offerTimer.current) window.clearInterval(offerTimer.current);
    },
    []
  );

  const dock = dockId ? findDock(dockId) : null;
  const active = service.active;
  const free = Math.max(0, MAX_BOATS - active);
  const queueLen = service.queue.length;
  const joinable = dock ? service.joinableAt(dock.id) : null;
  // 有人在排隊時，空船先讓給排隊的人
  const canBoat = !service.online || free > queueLen;

  return (
    <>
      {/* 渡口面板 */}
      {dock && !riding && (
        <div data-ui-panel="true" className="kx-root absolute left-1/2 -translate-x-1/2 bottom-36 sm:bottom-24 z-30 pointer-events-auto w-[min(92vw,22rem)]">
          <div className="kx-panel kx-corners p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Sailboat className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <h3 className="kx-title text-[17px] leading-tight">{dock.name}</h3>
                <p className="kx-sub text-[12.5px] mt-0.5">
                  {service.online ? `湖上 ${active}/${MAX_BOATS} 艘船・每艘可坐兩人` : '單機遊湖（多人連線未開通時只看得到自己的船）'}
                </p>
              </div>
              <button type="button" onClick={onClose} className="kx-round w-8 h-8 shrink-0" aria-label="關閉">
                <X className="w-4 h-4" />
              </button>
            </div>
            {service.isQueued ? (
              <p className="kx-sub text-[13px]">你已經在排隊了：第 {service.myQueueRank + 1} 位。</p>
            ) : (
              <div className="space-y-2">
                {joinable && (
                  <button type="button" onClick={() => onBoard(dock.id, joinable)} className="kx-btn-ghost w-full px-3 py-2 text-[13.5px] flex items-center justify-center gap-1.5 cursor-pointer">
                    <Users className="w-4 h-4" /> 上「{joinable.on}」的船（還有一個位子）
                  </button>
                )}
                {canBoat ? (
                  <button type="button" onClick={() => onBoard(dock.id, null)} className="kx-btn-primary w-full px-3 py-2.5 text-[14px] flex items-center justify-center gap-1.5 cursor-pointer">
                    <Sailboat className="w-4 h-4" /> 乘船遊湖
                  </button>
                ) : (
                  <button type="button" onClick={() => onQueue(dock.id)} className="kx-btn-primary w-full px-3 py-2.5 text-[14px] flex items-center justify-center gap-1.5 cursor-pointer">
                    <Clock className="w-4 h-4" /> 船都出航了，排隊等船（目前 {queueLen} 人）
                  </button>
                )}
                <p className="kx-sub text-[12px] leading-relaxed">上船後用 WASD／方向鍵（手機用搖桿）划船，滑鼠或右半邊畫面轉頭看風景；荷葉荷花擋不住船，拱橋底下也划得過去。</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 排隊中 */}
      {!riding && service.isQueued && !hasOffer && (
        <div data-ui-panel="true" className="kx-root absolute left-1/2 -translate-x-1/2 top-16 sm:top-5 z-30 pointer-events-auto">
          <div className="kx-panel flex items-center gap-2 px-3 py-1.5 rounded-full text-[12.5px]">
            <Clock className="w-4 h-4 text-amber-300" />
            <span>排隊等船：第 {service.myQueueRank + 1} 位（有空船時會通知你）</span>
            <button type="button" onClick={onLeaveQueue} className="kx-btn-ghost px-2 py-0.5 text-[12px] cursor-pointer">
              離開隊伍
            </button>
          </div>
        </div>
      )}

      {/* 輪到你了 */}
      {hasOffer && offerLeft !== null && (
        <div data-ui-panel="true" className="kx-root absolute inset-0 z-40 flex items-center justify-center pointer-events-auto bg-black/35">
          <div className="kx-panel kx-corners p-5 w-[min(90vw,20rem)] text-center space-y-3">
            <Sailboat className="w-8 h-8 mx-auto text-amber-300" />
            <h3 className="kx-title text-[19px]">有空船了！</h3>
            <p className="kx-sub text-[13px]">{offerLeft} 秒內選一個，沒回應就先讓給下一位。</p>
            <div className="flex gap-2 justify-center">
              <button type="button" onClick={onAcceptOffer} className="kx-btn-primary px-5 py-2 text-[14px] cursor-pointer">
                乘船
              </button>
              <button type="button" onClick={() => onLater(false)} className="kx-btn-ghost px-4 py-2 text-[14px] cursor-pointer">
                再等等
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 乘船中 */}
      {riding && (
        <div data-ui-panel="true" className="kx-root absolute left-1/2 -translate-x-1/2 top-16 sm:top-5 z-30 pointer-events-auto">
          <div className="kx-panel flex items-center gap-2 px-3 py-1.5 rounded-full text-[12.5px]">
            <Sailboat className="w-4 h-4 text-amber-300" />
            <span>{riding.role === 'owner' ? '遊湖中・WASD／搖桿划船' : `搭「${riding.owner || '船主'}」的船遊湖`}</span>
            <button type="button" onClick={onLeaveBoat} className="kx-btn-primary px-2.5 py-0.5 text-[12px] cursor-pointer">
              下船
            </button>
          </div>
        </div>
      )}
    </>
  );
};
