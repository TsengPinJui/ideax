import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BaiMiao, BaiMiaoAction, BaiMiaoBubble } from './BaiMiao';

/**
 * 首頁「主題專區」選單上方的白喵：
 * 在專區框的上緣開心地由左慢慢走到右，走到底轉身面向使用者，單腳站、揮手說「嗨！」，
 * 再走回去，到最左邊做反方向的動作。走了幾趟之後會側躺撐著頭打瞌睡，再久一點就躺平呼呼大睡。
 * 點牠：睡著時會醒來；醒著時會自我介紹（附角色介紹頁的捷徑）。
 */
/** 自我介紹分兩段說（不用訊息框，直接把字浮在白喵旁邊） */
export const BAIMIAO_INTRO_PARTS = [
  '哈基米！我是白喵，剛被 IdeaX 聘為市場顧問～',
  '我負責幫你分析報告、找專家、獵人頭、貼標籤 XD，喔對，偶爾還會被 call 去當和事佬喔～',
] as const;
export const BAIMIAO_INTRO = BAIMIAO_INTRO_PARTS.join('');
const INTRO_PART1_MS = 3200;
const INTRO_PART2_MS = 5200;

const WALK_SPEED = 34; // px/s，慢慢走
const LAPS_BEFORE_NAP = 2; // 來回走幾趟後開始打瞌睡
const DOZE_MS = 22000;
const SLEEP_MS = 45000;

type Phase = 'walk' | 'hi' | 'doze' | 'sleep' | 'cheer';

export const BaiMiaoZoneWalker: React.FC = () => {
  const boxRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 640 ? 64 : 92));
  const [phase, setPhase] = useState<Phase>('walk');
  const [dir, setDir] = useState<1 | -1>(1);
  const [bubble, setBubble] = useState<BaiMiaoBubble | null>(null);
  const [edge, setEdge] = useState<'start' | 'center' | 'end'>('start');
  const S = useRef({ x: 0, dir: 1 as 1 | -1, phase: 'walk' as Phase, greets: 0, timers: [] as number[] });
  const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const clearTimers = () => { S.current.timers.forEach((t) => window.clearTimeout(t)); S.current.timers = []; };
  const later = (fn: () => void, ms: number) => { S.current.timers.push(window.setTimeout(fn, ms)); };
  const go = (p: Phase) => { S.current.phase = p; setPhase(p); };
  const say = (text: string, extra?: Partial<BaiMiaoBubble>) => setBubble({ text, plain: true, ...extra });
  /** 兩段自我介紹，說完再呼叫 done */
  const sayIntro = (done: () => void) => {
    say(BAIMIAO_INTRO_PARTS[0]);
    later(() => { say(BAIMIAO_INTRO_PARTS[1], { withIntroLink: true }); later(done, INTRO_PART2_MS); }, INTRO_PART1_MS);
  };

  const startWalking = useCallback((d: 1 | -1) => {
    S.current.dir = d; setDir(d); go('walk');
  }, []);

  // 走到底：轉身打招呼（偶爾自我介紹），然後往回走；走滿幾趟就打瞌睡
  const arrive = useCallback(() => {
    const st = S.current;
    st.greets += 1;
    go('hi');
    const intro = st.greets % 3 === 2;
    const next = () => {
      setBubble(null);
      if (st.greets >= LAPS_BEFORE_NAP * 2) {
        st.greets = 0;
        go('doze');
        later(() => { go('sleep'); later(() => wake('嗨！睡飽了～'), SLEEP_MS); }, DOZE_MS);
      } else startWalking(st.dir === 1 ? -1 : 1);
    };
    if (intro) sayIntro(next);
    else { say('嗨！'); later(next, 2600); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startWalking]);

  const wake = (text: string) => {
    clearTimers();
    go('cheer');
    say(text);
    later(() => { setBubble(null); startWalking(S.current.dir === 1 ? -1 : 1); }, 2200);
  };

  // 點白喵：睡著就叫醒；醒著就自我介紹
  const poke = () => {
    const st = S.current;
    if (st.phase === 'doze' || st.phase === 'sleep') { wake('嗯…？嗨！'); return; }
    clearTimers();
    go('hi');
    sayIntro(() => { setBubble(null); startWalking(st.dir); });
  };

  // 走路位置（requestAnimationFrame）
  useEffect(() => {
    let raf = 0, last = performance.now();
    const onResize = () => setSize(window.innerWidth < 640 ? 64 : 92);
    window.addEventListener('resize', onResize);
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      const box = boxRef.current, cat = catRef.current; if (!box || !cat) return;
      const st = S.current;
      const maxX = Math.max(0, box.clientWidth - cat.offsetWidth);
      if (st.phase === 'walk' && !reduceMotion) {
        st.x += st.dir * WALK_SPEED * dt;
        if (st.dir === 1 && st.x >= maxX) { st.x = maxX; arrive(); }
        else if (st.dir === -1 && st.x <= 0) { st.x = 0; arrive(); }
      }
      st.x = Math.min(maxX, Math.max(0, st.x));
      cat.style.transform = `translate3d(${Math.round(st.x)}px,0,0)`;
      const e = st.x < 140 ? 'start' : st.x > maxX - 140 ? 'end' : 'center';
      setEdge((prev) => (prev === e ? prev : e));
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); clearTimers(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const action: BaiMiaoAction = reduceMotion && phase === 'walk' ? 'idle' : phase;
  return (
    <div ref={boxRef} aria-hidden={false} className="pointer-events-none absolute inset-x-2 sm:inset-x-4 bottom-full z-20" style={{ height: size, marginBottom: -Math.round(size * 0.03) }}>
      <div ref={catRef} className="absolute bottom-0 left-0 will-change-transform" style={{ width: size, height: size }}>
        <BaiMiao
          action={action}
          facing={phase === 'walk' ? dir : dir}
          size={size}
          bubble={bubble}
          bubbleAlign={edge}
          onPokeCharacter={poke}
          ariaLabel="市場顧問白喵（點我打招呼）"
        />
      </div>
    </div>
  );
};

export default BaiMiaoZoneWalker;
