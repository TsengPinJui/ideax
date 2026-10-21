import React, { useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { playSousouSound, sousouWindStop, sousouAha } from './sousouSound';
import { supportsWebGL } from '../../utils/webglSupport';

/**
 * 匯職缺的探索者「搜搜」
 * - 平常停在畫面左下角
 * - 開始搜尋：筋斗雲冒出來、跳上去起飛，單手搭在額頭眺望，在畫面上飛來飛去（有風聲）
 * - 起飛：「咻」一下衝出去，身後拖著一道風尾
 * - 搜尋結束：有找到職缺就喊「啊哈！」，再「咻」地瞬移回左下角（帶風尾）歡呼；沒找到就慢慢飛回來抓抓頭，再降落
 * 不能點、不擋操作（pointer-events: none），螢幕閱讀器忽略。
 */
type Props = { searching: boolean; resultCount: number };

type Engine = {
  play: (name: string, loop?: boolean) => void;
  setHeading: (h: number) => void;
  destroy: () => void;
};


const sizeFor = () => (window.innerWidth < 640 ? 138 : 196);

export const SousouFlyer: React.FC<Props> = ({ searching, resultCount }) => {
  const { mascotConfig } = useApp();
  const soundOn = mascotConfig?.soundEnabled !== false;
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const state = useRef({
    mode: 'parked' as 'parked' | 'flying' | 'returning' | 'hover' | 'dashing',
    dash: null as null | { x0: number; y0: number; x1: number; y1: number; t: number; dur: number; toDock: boolean; done: () => void },
    trail: [] as { x: number; y: number; t: number }[],
    x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, retarget: 0, size: 196, lastHeading: 0,
    resultCount: 0, timers: [] as number[], launched: false,
  });
  state.current.resultCount = resultCount;
  const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ahaAt = useRef(0);
  // 剛喊完「啊哈！」時不再疊上叮叮聲，聽起來比較乾淨
  // 角色音效只在重要提示時出聲：搜搜只在「找到職缺」時出聲（起飛、風聲、瞬移等過場音效不播）
  const lastFound = useRef(0);
  const sound = (name: string) => {
    if (!soundRef.current || name !== 'found') return;
    if (Date.now() - ahaAt.current < 1500 || Date.now() - lastFound.current < 8000) return;
    lastFound.current = Date.now();
    playSousouSound(name);
  };
  const aha = () => { ahaAt.current = Date.now(); if (soundRef.current) sousouAha(); };
  const later = (fn: () => void, ms: number) => { state.current.timers.push(window.setTimeout(fn, ms)); };

  // 「咻」一下衝到目標點（toDock：目標是停靠點，途中跟著停靠點更新）
  const dashTo = (x1: number, y1: number, toDock: boolean, done: () => void) => {
    const S = state.current;
    S.dash = { x0: S.x, y0: S.y, x1, y1, t: 0, dur: 0.34, toDock, done };
    S.trail.push({ x: S.x + S.size / 2, y: S.y + S.size * 0.66, t: performance.now() });
    S.mode = 'dashing';
    // 瞬移不出聲（過場）
  };

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
    const LIFE = 900;
    const drawTrail = (now: number) => {
      const cv = trailRef.current; if (!cv) return;
      const S = state.current;
      const dpr = Math.min(2, window.devicePixelRatio || 1), W = window.innerWidth, H = window.innerHeight;
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      const g = cv.getContext('2d'); if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      while (S.trail.length && now - S.trail[0].t > LIFE) S.trail.shift();
      const pts = S.trail; if (pts.length < 2) return;
      const sc = S.size / 168;
      g.lineCap = 'butt'; // 分段畫，圓頭會在交疊處形成一顆顆珠子
      // 三條平行的風線＋外層光暈，越舊越淡越細；尾端加幾個小漩渦
      for (const [off, w, color] of [[0, 30, '120,160,250'], [-16, 6, '47,95,220'], [0, 8, '210,226,255'], [16, 6, '47,95,220']] as const) {
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          const age = (now - b.t) / LIFE, along = i / pts.length;
          const alpha = Math.max(0, (1 - age) * along) * (w > 20 ? 0.4 : 0.95);
          if (alpha <= 0.01) continue;
          const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
          const o = off * sc * (0.5 + along * 0.5);
          g.strokeStyle = `rgba(${color},${alpha})`; g.lineWidth = Math.max(1, w * sc * (0.3 + along * 0.7));
          g.beginPath(); g.moveTo(a.x + nx * o, a.y + ny * o); g.lineTo(b.x + nx * o, b.y + ny * o); g.stroke();
        }
      }
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(47,95,220,0.8)'; g.lineWidth = 3.5 * sc;
      for (let i = 6; i < pts.length - 4; i += 14) {
        const p = pts[i], age = (now - p.t) / LIFE; if (age > 0.85) continue;
        g.globalAlpha = 1 - age; g.beginPath(); g.arc(p.x, p.y, 9 * sc * (1 + age), 0, Math.PI * 1.5); g.stroke();
      }
      g.globalAlpha = 1;
    };
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.25, (now - last) / 1000); last = now;
      const S = state.current, el = wrapRef.current;
      if (!el) return;
      S.size = sizeFor();
      const d = dock();
      const wasDashing = S.mode === 'dashing';
      if (S.mode === 'dashing' && S.dash) {
        // 衝刺：前段加速、後段急煞，一下子就到
        const D = S.dash;
        if (D.toDock) { D.x1 = d.x; D.y1 = d.y; }
        D.t += dt;
        const p = Math.min(1, D.t / D.dur), e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        const px = S.x, py = S.y;
        S.x = D.x0 + (D.x1 - D.x0) * e; S.y = D.y0 + (D.y1 - D.y0) * e - Math.sin(p * Math.PI) * 40;
        S.vx = (S.x - px) / Math.max(dt, 1e-3); S.vy = (S.y - py) / Math.max(dt, 1e-3);
        if (p >= 1) { S.dash = null; S.vx = 0; S.vy = 0; D.done(); }
      } else if (S.mode === 'parked' || reduceMotion) { S.tx = d.x; S.ty = d.y; }
      else if (S.mode === 'returning') { S.tx = d.x; S.ty = d.y; }
      else if (S.mode === 'hover') { S.tx = S.x; S.ty = S.y; }
      else if ((S.retarget -= dt) <= 0 || Math.hypot(S.tx - S.x, S.ty - S.y) < 40) pickTarget();
      // 彈簧追目標，速度上限讓飛行平順
      // 飛回停靠點用接近臨界阻尼，才不會在角落附近繞圈
      const k = S.mode === 'parked' ? 14 : S.mode === 'returning' ? 7 : 2.4;
      const damp = S.mode === 'parked' ? 8 : S.mode === 'returning' ? 5.2 : 1.9;
      // 低幀率時拆成小步計算，飛行速度才不會跟著變慢
      const max = S.mode === 'returning' ? 760 : 520;
      for (let rest = S.mode === 'dashing' ? 0 : dt; rest > 1e-4; rest -= 1 / 60) {
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
      // 風尾：衝刺時沿路記錄位置（低幀率時補點，線才會連續）
      const cxp = S.x + S.size / 2, cyp = S.y + S.size * 0.66;
      if (wasDashing) {
        const lastP = S.trail[S.trail.length - 1];
        if (lastP) {
          const n = Math.min(40, Math.floor(Math.hypot(cxp - lastP.x, cyp - lastP.y) / 10));
          for (let i = 1; i < n; i++) S.trail.push({ x: lastP.x + ((cxp - lastP.x) * i) / n, y: lastP.y + ((cyp - lastP.y) * i) / n, t: now });
        }
        S.trail.push({ x: cxp, y: cyp, t: now });
      }
      drawTrail(now);
      engineRef.current?.setHeading(S.mode === 'parked' ? 0 : heading);
      if (S.mode === 'flying' && Math.sign(heading) !== Math.sign(S.lastHeading) && Math.abs(heading) > 0.5) {
        // 起飛不出聲（過場）
        S.lastHeading = heading;
      }
      // 飛回停靠點了
      if (S.mode === 'returning' && Math.hypot(d.x - S.x, d.y - S.y) < 14) {
        S.mode = 'parked';
        if (soundRef.current) sousouWindStop();
        const found = S.resultCount > 0;
        engineRef.current?.play(found ? 'found' : 'sorry');
        later(() => engineRef.current?.play('land'), found ? 2600 : 3600);
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
        // 飛行風聲不播（過場）
        if (reduceMotion) return;
        // 起飛：「咻」一下衝到畫面上方，接著開始巡航
        const W = window.innerWidth, H = window.innerHeight;
        const x1 = Math.min(W - S.size - 8, S.x + W * (0.25 + Math.random() * 0.2)), y1 = Math.max(80, H * (0.2 + Math.random() * 0.15));
        dashTo(x1, y1, false, () => { S.mode = 'flying'; S.retarget = 0; });
      }, 700);
    } else if ((S.mode === 'flying' || S.mode === 'dashing') && S.resultCount > 0) {
      // 找到了：先停一下喊「啊哈！」，再「咻」地瞬移回原位
      const goHome = () => {
        S.mode = 'hover';
        aha();
        engineRef.current?.play('found');
        later(() => dashTo(dock().x, dock().y, true, () => {
          S.mode = 'parked';
          if (soundRef.current) sousouWindStop();
          later(() => engineRef.current?.play('land'), 1800);
        }), 750);
      };
      if (S.mode === 'dashing' && S.dash) { const prev = S.dash.done; S.dash.done = () => { prev(); goHome(); }; }
      else goHome();
    } else if (S.mode === 'flying' || S.mode === 'dashing') {
      if (S.mode === 'dashing' && S.dash) S.dash.done = () => { S.mode = 'returning'; };
      else S.mode = 'returning';
    } else if (S.launched && S.mode === 'parked') {
      // 搜尋很快就結束（還沒真的飛出去）：直接在原地慶祝或抓頭再降落
      if (soundRef.current) sousouWindStop();
      const found = S.resultCount > 0;
      if (found) aha();
      engineRef.current?.play(found ? 'found' : 'sorry');
      later(() => engineRef.current?.play('land'), found ? 2600 : 3600);
    }
    if (!searching) S.launched = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searching]);

  // 沒有 WebGL 就不顯示
  if (typeof window !== 'undefined' && !supportsWebGL()) return null;

  return (
    <>
    <canvas
      ref={trailRef}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', zIndex: 44, pointerEvents: 'none' }}
    />
    <div
      ref={wrapRef}
      aria-hidden="true"
      style={{ position: 'fixed', left: 0, top: 0, width: 168, height: 168, zIndex: 45, pointerEvents: 'none', willChange: 'transform', transform: 'translate3d(-400px,-400px,0)' }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
    </>
  );
};

export default SousouFlyer;
