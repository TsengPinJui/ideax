import React, { useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { playSousouSound, sousouWhoosh, sousouWindStart, sousouWindStop } from './sousouSound';

/**
 * 全網搜職的探索者「搜搜」
 * - 平常停在畫面左下角
 * - 開始搜尋：筋斗雲冒出來、跳上去起飛，單手搭在額頭眺望，在畫面上飛來飛去（有風聲）
 * - 搜尋結束：飛回左下角；有找到職缺就舉棒歡呼，沒找到就抓抓頭，再降落
 * 不能點、不擋操作（pointer-events: none），螢幕閱讀器忽略。
 */
type Props = { searching: boolean; resultCount: number };

type Engine = {
  play: (name: string, loop?: boolean) => void;
  setHeading: (h: number) => void;
  destroy: () => void;
};

function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

const sizeFor = () => (window.innerWidth < 640 ? 118 : 168);

export const SousouFlyer: React.FC<Props> = ({ searching, resultCount }) => {
  const { mascotConfig } = useApp();
  const soundOn = mascotConfig?.soundEnabled !== false;
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const state = useRef({
    mode: 'parked' as 'parked' | 'flying' | 'returning',
    x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, retarget: 0, size: 168, lastHeading: 0,
    resultCount: 0, timers: [] as number[], launched: false,
  });
  state.current.resultCount = resultCount;
  const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const sound = (name: string) => { if (soundRef.current) playSousouSound(name); };
  const later = (fn: () => void, ms: number) => { state.current.timers.push(window.setTimeout(fn, ms)); };

  // 左下角停靠點（避開手機版底部選單）
  const dock = () => {
    const s = state.current.size;
    let bottom = 10;
    const nav = document.querySelector('[data-ixm-avoid="bottom"]') as HTMLElement | null;
    if (nav && nav.offsetParent !== null) bottom += nav.getBoundingClientRect().height;
    return { x: 6, y: window.innerHeight - s - bottom };
  };

  // 載入 3D 角色
  useEffect(() => {
    if (!supportsWebGL() || !canvasRef.current) return;
    let cancelled = false;
    state.current.size = sizeFor();
    const d = dock(); state.current.x = d.x; state.current.y = d.y;
    import('./sousouEngine').then(({ createSousou }) => {
      if (cancelled || !canvasRef.current) return;
      engineRef.current = createSousou(canvasRef.current, {
        action: 'parked',
        onSound: (n: string) => sound(n),
      });
    }).catch(() => {});
    return () => {
      cancelled = true;
      state.current.timers.forEach((t) => window.clearTimeout(t));
      sousouWindStop();
      engineRef.current?.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 位置：停靠時貼著左下角；飛行時在畫面上隨機航點之間飛
  useEffect(() => {
    let raf = 0, last = performance.now();
    const pickTarget = () => {
      const S = state.current, s = S.size, W = window.innerWidth, H = window.innerHeight;
      S.tx = 8 + Math.random() * Math.max(10, W - s - 16);
      S.ty = 80 + Math.random() * Math.max(10, H - s - 120);
      S.retarget = 2.2 + Math.random() * 1.8;
    };
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.25, (now - last) / 1000); last = now;
      const S = state.current, el = wrapRef.current;
      if (!el) return;
      S.size = sizeFor();
      const d = dock();
      if (S.mode === 'parked' || reduceMotion) { S.tx = d.x; S.ty = d.y; }
      else if (S.mode === 'returning') { S.tx = d.x; S.ty = d.y; }
      else if ((S.retarget -= dt) <= 0 || Math.hypot(S.tx - S.x, S.ty - S.y) < 40) pickTarget();
      // 彈簧追目標，速度上限讓飛行平順
      // 飛回停靠點用接近臨界阻尼，才不會在角落附近繞圈
      const k = S.mode === 'parked' ? 14 : S.mode === 'returning' ? 7 : 2.4;
      const damp = S.mode === 'parked' ? 8 : S.mode === 'returning' ? 5.2 : 1.9;
      // 低幀率時拆成小步計算，飛行速度才不會跟著變慢
      const max = S.mode === 'returning' ? 760 : 520;
      for (let rest = dt; rest > 1e-4; rest -= 1 / 60) {
        const h = Math.min(rest, 1 / 60);
        S.vx += ((S.tx - S.x) * k - S.vx * damp) * h;
        S.vy += ((S.ty - S.y) * k - S.vy * damp) * h;
        const sp = Math.hypot(S.vx, S.vy);
        if (sp > max) { S.vx *= max / sp; S.vy *= max / sp; }
        S.x += S.vx * h; S.y += S.vy * h;
      }
      el.style.width = el.style.height = `${S.size}px`;
      el.style.transform = `translate3d(${Math.round(S.x)}px, ${Math.round(S.y)}px, 0)`;
      // 轉身方向與轉彎時的「咻」
      const heading = Math.max(-1, Math.min(1, S.vx / 320));
      engineRef.current?.setHeading(S.mode === 'parked' ? 0 : heading);
      if (S.mode === 'flying' && Math.sign(heading) !== Math.sign(S.lastHeading) && Math.abs(heading) > 0.5) {
        if (soundRef.current) sousouWhoosh(0.5);
        S.lastHeading = heading;
      }
      // 飛回停靠點了
      if (S.mode === 'returning' && Math.hypot(d.x - S.x, d.y - S.y) < 14) {
        S.mode = 'parked';
        if (soundRef.current) sousouWindStop();
        const found = S.resultCount > 0;
        engineRef.current?.play(found ? 'found' : 'sorry');
        later(() => engineRef.current?.play('land'), found ? 2600 : 2200);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 開始／結束搜尋
  useEffect(() => {
    const S = state.current;
    S.timers.forEach((t) => window.clearTimeout(t)); S.timers = [];
    if (searching) {
      S.launched = true;
      engineRef.current?.play('takeoff');
      later(() => {
        if (!reduceMotion) { S.mode = 'flying'; S.retarget = 0; }
        if (soundRef.current) sousouWindStart();
      }, 700);
    } else if (S.mode === 'flying') {
      S.mode = 'returning';
    } else if (S.launched && S.mode === 'parked') {
      // 搜尋很快就結束（還沒真的飛出去）：直接在原地慶祝或抓頭再降落
      if (soundRef.current) sousouWindStop();
      const found = S.resultCount > 0;
      engineRef.current?.play(found ? 'found' : 'sorry');
      later(() => engineRef.current?.play('land'), found ? 2600 : 2200);
    }
    if (!searching) S.launched = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searching]);

  // 沒有 WebGL 就不顯示
  if (typeof window !== 'undefined' && !supportsWebGL()) return null;

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      style={{ position: 'fixed', left: 0, top: 0, width: 168, height: 168, zIndex: 45, pointerEvents: 'none', willChange: 'transform', transform: 'translate3d(-400px,-400px,0)' }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
};

export default SousouFlyer;
