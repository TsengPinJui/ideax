import React, { useEffect, useRef, useState } from 'react';

/**
 * 市場顧問「白喵」：在需要牠的地方出現的二次元插畫風白貓（SVG）。
 * - action：動作（見 BAIMIAO_ACTIONS）
 * - facing：-1 往左、0 面向使用者、1 往右（走路與「嗨」的方向）
 * - bubble：訊息框（任務狀態「白喵正在…」或閒聊、自我介紹）
 * 系統要求減少動態時動作幅度會變小，走來走去由外層決定是否停用。
 */
export type BaiMiaoAction =
  | 'idle' | 'walk' | 'hi' | 'hop' | 'binoculars' | 'mediate' | 'inspect' | 'doze' | 'sleep' | 'cheer';

export type BaiMiaoBubble = {
  text: string;
  /** 顯示「認識白喵」的捷徑（打開關於 IdeaX 的原創 IP 與 Agent 頁） */
  withIntroLink?: boolean;
  /** 正在執行任務：文字後面加上跳動的「…」 */
  busy?: boolean;
};

import type { BaiMiaoEngine as Engine } from './baimiaoEngine';

type Props = {
  action: BaiMiaoAction;
  facing?: number;
  size?: number;
  bubble?: BaiMiaoBubble | null;
  /** 訊息框出現在角色的哪一邊 */
  bubbleSide?: 'top' | 'left' | 'right';
  /** 訊息框在上方時的對齊（角色靠畫面邊緣時避免被切掉） */
  bubbleAlign?: 'center' | 'start' | 'end';
  className?: string;
  style?: React.CSSProperties;
  /** 點角色時（例如叫醒、打招呼） */
  onPokeCharacter?: () => void;
  ariaLabel?: string;
};

/** 打開「原創 IP 與 Agent」介紹頁 */
export function openAgentsIntro() {
  window.dispatchEvent(new CustomEvent('ideax_open_agents'));
}

export const BaiMiao: React.FC<Props> = ({
  action, facing = 0, size = 120, bubble, bubbleSide = 'top', bubbleAlign = 'center', className, style, onPokeCharacter, ariaLabel,
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const latest = useRef({ action, facing });
  latest.current = { action, facing };
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hostRef.current) return;
    let cancelled = false;
    import('./baimiaoEngine').then(({ createBaiMiao }) => {
      if (cancelled || !hostRef.current) return;
      engineRef.current = createBaiMiao(hostRef.current, { action: latest.current.action, facing: latest.current.facing });
      setReady(true);
    }).catch(() => {});
    return () => {
      cancelled = true;
      engineRef.current?.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { engineRef.current?.play(action); }, [action, ready]);
  useEffect(() => { engineRef.current?.setFacing(facing); }, [facing, ready]);
  // 換新的訊息時嘴巴動一下，像在說話
  useEffect(() => { if (bubble?.text) engineRef.current?.say(Math.min(2600, 600 + bubble.text.length * 60)); }, [bubble?.text, ready]);

  const bubblePos: React.CSSProperties =
    bubbleSide === 'left'
      ? { right: '100%', top: '18%', marginRight: 4 }
      : bubbleSide === 'right'
      ? { left: '100%', top: '18%', marginLeft: 4 }
      : bubbleAlign === 'start'
      ? { bottom: '92%', left: '8%' }
      : bubbleAlign === 'end'
      ? { bottom: '92%', right: '8%' }
      : { bottom: '92%', left: '50%', transform: 'translateX(-50%)' };

  return (
    <div className={className} style={{ position: 'relative', width: size, height: size, ...style }}>
      <div
        ref={hostRef}
        aria-label={ariaLabel || '白喵'}
        role="img"
        onClick={onPokeCharacter}
        style={{ width: '100%', height: '100%', cursor: onPokeCharacter ? 'pointer' : 'default', pointerEvents: onPokeCharacter ? 'auto' : 'none' }}
      />
      {bubble?.text && (
        <div
          role="status"
          aria-live="polite"
          className="absolute z-10 w-max max-w-[260px] rounded-2xl border border-amber-200 bg-white/95 px-3 py-2 text-[12px] leading-relaxed text-stone-800 shadow-md backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200"
          style={{ ...bubblePos, pointerEvents: 'auto' }}
        >
          <span>{bubble.text}</span>
          {bubble.busy && <span className="baimiao-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>}
          {bubble.withIntroLink && (
            <button
              type="button"
              onClick={openAgentsIntro}
              className="ml-1 inline-flex items-center gap-0.5 font-bold text-amber-700 underline decoration-amber-300 underline-offset-2 hover:text-amber-800 cursor-pointer"
            >
              認識白喵 →
            </button>
          )}
          <style>{`.baimiao-dots i{font-style:normal;display:inline-block;animation:bmDot 1.2s infinite}.baimiao-dots i:nth-child(2){animation-delay:.2s}.baimiao-dots i:nth-child(3){animation-delay:.4s}@keyframes bmDot{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-3px);opacity:1}}@media (prefers-reduced-motion: reduce){.baimiao-dots i{animation:none}}`}</style>
        </div>
      )}
    </div>
  );
};

export default BaiMiao;
