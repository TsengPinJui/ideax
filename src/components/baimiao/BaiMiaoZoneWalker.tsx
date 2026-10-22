import React, { useEffect, useRef, useState } from 'react';
import { BaiMiao, BaiMiaoAction, BaiMiaoBubble } from './BaiMiao';

/**
 * 首頁「主題專區」選單上方的白喵小遊樂場：
 * - 白喵在專區框上緣來回走、打招呼、打瞌睡（點牠會醒來或自我介紹）
 * - 左端有垃圾桶，裡面躲著一隻老鼠；框上放著一條魚、一顆毛線球
 * - 魚和毛線球可以拖曳丟出去（老鼠不能）：
 *   · 丟魚 → 白喵追魚、抓到就吃；魚丟進垃圾桶 → 白喵跳進垃圾桶，過一陣子才出來
 *   · 毛線球 → 白喵不時過去玩；投進垃圾桶會自動回到原位，白喵稱讚
 *   · 打到白喵 → 生氣
 *   · 任何東西進了垃圾桶 → 老鼠逃出來往右跑，白喵追（在垃圾桶裡也會跳出來追），老鼠跑到邊緣掉下去消失，下次又會出現
 */
export const BAIMIAO_INTRO_PARTS = [
  '哈基米！我是白喵，剛被 IdeaX 聘為市場顧問～',
  '我負責幫你分析報告、找專家、獵人頭、貼標籤 XD，喔對，偶爾還會被 call 去當和事佬喔～',
] as const;
export const BAIMIAO_INTRO = BAIMIAO_INTRO_PARTS.join('');
const INTRO_PART1_MS = 3200;
const INTRO_PART2_MS = 5200;

const WALK_SPEED = 34; // px/s，慢慢走
const LAPS_BEFORE_NAP = 2;
const DOZE_MS = 22000;
const SLEEP_MS = 45000;
const IN_TRASH_MS = 5500;

const LINE_ANGRY = '是誰！是哪個奴才吵本喵睡美容覺？';
const LINE_MOUSE = '有老鼠！別跑！';
const LINE_LOST = '可惡，又讓牠溜了…';
const LINE_EAT = '是魚！好香～本喵開動了';
const LINE_FISH_TRASH = '魚！本喵來了～';
const LINE_FULL = '呼～吃飽了';
const LINE_BALL_GOAL = '好球！投得漂亮～本喵給你按個讚！';
const LINE_PLAY = '毛線球！喵～';

type Phase = 'walk' | 'hi' | 'doze' | 'sleep' | 'cheer' | 'chase' | 'angry' | 'eat' | 'play' | 'jumpIn' | 'inTrash' | 'jumpOut' | 'lost';
type Purpose = 'fish' | 'mouse' | 'ball' | 'trash';
type ItemKind = 'fish' | 'ball';
type Item = {
  kind: ItemKind; homeFrac: number;
  x: number; h: number; vx: number; vy: number; rot: number; pop: number;
  state: 'rest' | 'drag' | 'fly' | 'trash' | 'eaten';
  thrown: boolean; displaced: boolean; placed: boolean;
  samples: Array<{ t: number; x: number; h: number }>; grabDx: number; grabDh: number; moved: boolean;
};
type Mouse = { state: 'hidden' | 'run' | 'fall'; x: number; h: number; vy: number; rot: number; op: number; t: number; jumping: boolean; readyAt: number; nextPeekAt: number; peekUntil: number };

const G = 1500; // 重力 px/s²
const mkItem = (kind: ItemKind, homeFrac: number): Item => ({
  kind, homeFrac, x: 0, h: 0, vx: 0, vy: 0, rot: 0, pop: 1, state: 'rest', thrown: false, displaced: false, placed: false,
  samples: [], grabDx: 0, grabDh: 0, moved: false,
});

// ── 小道具插圖 ──
const INK = '#4a3a30';
const TrashSvg = () => (
  <svg viewBox="0 0 56 60" width="100%" height="100%" aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
    <path d="M8 14 L48 14 L44 58 L12 58 Z" fill="#a8b0bb" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
    <path d="M19 22 L20 51 M28 22 L28 51 M37 22 L36 51" stroke="#7b8490" strokeWidth="2.2" strokeLinecap="round" />
    <rect x="3" y="8" width="50" height="8" rx="3.5" fill="#d6dbe1" stroke={INK} strokeWidth="2.4" />
  </svg>
);
const FishSvg = () => (
  <svg viewBox="0 -9 40 40" width="100%" height="100%" aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
    <path d="M4 20 C 10 9 24 8 32 20 C 24 32 10 31 4 20 Z" fill="#7cc2ef" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
    <path d="M31 20 L39 12 L38 28 Z" fill="#5aa9dc" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
    <path d="M14 14 q 4 6 0 12" stroke="#4f95c4" strokeWidth="1.6" fill="none" />
    <circle cx="10" cy="18" r="2" fill={INK} />
  </svg>
);
const BallSvg = () => (
  <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
    <circle cx="20" cy="20" r="17" fill="#f59aa5" stroke={INK} strokeWidth="2.2" />
    <path d="M6 14 C 16 18 26 12 34 16 M5 23 C 15 28 27 21 35 25 M14 5 C 18 14 13 26 17 36 M24 4 C 28 16 23 27 27 36" stroke="#e06a7d" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <path d="M34 26 q 6 4 3 10" stroke="#e06a7d" strokeWidth="1.8" fill="none" strokeLinecap="round" />
  </svg>
);
const MouseSvg = () => (
  <svg viewBox="0 0 44 30" width="100%" height="100%" aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
    <path d="M6 22 C -2 22 -2 12 4 10" stroke={INK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
    <ellipse cx="20" cy="20" rx="14" ry="9" fill="#b7b2ad" stroke={INK} strokeWidth="2" />
    <circle cx="30" cy="10" r="5" fill="#f6b8c1" stroke={INK} strokeWidth="1.8" />
    <ellipse cx="34" cy="17" rx="8" ry="6.5" fill="#c4bfba" stroke={INK} strokeWidth="2" />
    <circle cx="36" cy="15" r="1.5" fill={INK} />
    <circle cx="42" cy="18" r="1.6" fill="#f08795" />
    <path d="M14 28 v2 M24 28 v2" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const BaiMiaoZoneWalker: React.FC = () => {
  const boxRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<HTMLDivElement>(null);
  const itemRefs = { fish: useRef<HTMLDivElement>(null), ball: useRef<HTMLDivElement>(null) };
  const [size, setSize] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 640 ? 64 : 92));
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const [phase, setPhase] = useState<Phase>('walk');
  const [dir, setDir] = useState<1 | -1>(1);
  const [bubble, setBubble] = useState<BaiMiaoBubble | null>(null);
  const [edge, setEdge] = useState<'start' | 'center' | 'end'>('start');
  const now0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const S = useRef({
    x: -1, y: 0, op: 1, dir: 1 as 1 | -1, phase: 'walk' as Phase, purpose: null as Purpose | null, greets: 0,
    timers: [] as number[], misc: [] as number[], bubbleTimer: 0,
    jump: null as null | { t: number; dur: number; x0: number; x1: number; kind: 'in' | 'out'; done: () => void },
    fishInTrash: false, nextPlayAt: now0 + 30000, wobble: 0, W: 0,
    items: { fish: mkItem('fish', 0.4), ball: mkItem('ball', 0.66) } as Record<ItemKind, Item>,
    mouse: { state: 'hidden', x: 0, h: 0, vy: 0, rot: 0, op: 0, t: 0, jumping: false, readyAt: 0, nextPeekAt: now0 + 6000, peekUntil: 0 } as Mouse,
  });
  const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── 狀態工具 ──
  const st = () => S.current;
  const geo = () => {
    const sz = sizeRef.current;
    const W = st().W || boxRef.current?.clientWidth || 300;
    const TW = Math.round(sz * 0.56), TH = Math.round(sz * 0.6), r = Math.round(sz * 0.2);
    const catMin = TW + 6, catMax = Math.max(TW + 6, W - sz);
    return { sz, W, TW, TH, r, catMin, catMax, run: sz * 1.9, mouseSpeed: sz * 2.5, mw: Math.round(sz * 0.42) };
  };
  const clearTimers = () => { st().timers.forEach((t) => window.clearTimeout(t)); st().timers = []; };
  const later = (fn: () => void, ms: number) => { st().timers.push(window.setTimeout(fn, ms)); };
  const soon = (fn: () => void, ms: number) => { st().misc.push(window.setTimeout(fn, ms)); }; // 不會被打斷的計時
  const go = (p: Phase) => { st().phase = p; setPhase(p); };
  const face = (d: 1 | -1) => { if (st().dir !== d) { st().dir = d; setDir(d); } };
  const say = (text: string, ms = 0, extra?: Partial<BaiMiaoBubble>) => {
    window.clearTimeout(st().bubbleTimer);
    setBubble({ text, plain: true, ...extra });
    if (ms) st().bubbleTimer = window.setTimeout(() => setBubble(null), ms);
  };
  const interrupt = () => { clearTimers(); st().jump = null; st().purpose = null; };
  const busyPhases: Phase[] = ['angry', 'jumpIn', 'inTrash', 'jumpOut'];
  const catVisible = () => !['inTrash', 'jumpIn', 'jumpOut'].includes(st().phase);

  const respawn = (it: Item) => {
    const { W, r, TW } = geo();
    it.x = Math.max(TW + r + 4, Math.min(W - r, W * it.homeFrac));
    it.h = 0; it.vx = 0; it.vy = 0; it.rot = 0; it.pop = 0; it.state = 'rest'; it.thrown = false; it.displaced = false;
  };

  const chase = (p: Purpose) => { clearTimers(); st().jump = null; st().purpose = p; go('chase'); };

  /** 做完一件事：依優先順序決定接下來做什麼 */
  const resume = () => {
    interrupt();
    const s = st();
    if (s.mouse.state === 'run') return chase('mouse');
    if (s.fishInTrash) { say(LINE_FISH_TRASH, 1400); return chase('trash'); }
    if (s.items.fish.displaced && s.items.fish.state !== 'trash' && s.items.fish.state !== 'eaten') return chase('fish');
    setBubble(null);
    go('walk');
  };

  // ── 原本的巡邏、打招呼、打瞌睡 ──
  const sayIntro = (done: () => void) => {
    say(BAIMIAO_INTRO_PARTS[0]);
    later(() => { say(BAIMIAO_INTRO_PARTS[1], 0, { withIntroLink: true }); later(done, INTRO_PART2_MS); }, INTRO_PART1_MS);
  };
  const startWalking = (d: 1 | -1) => { face(d); go('walk'); };
  const wake = (text: string) => {
    clearTimers();
    go('cheer');
    say(text, 2200);
    later(() => startWalking(st().dir === 1 ? -1 : 1), 2200);
  };
  const arrive = () => {
    const s = st();
    s.greets += 1;
    go('hi');
    const next = () => {
      setBubble(null);
      if (s.greets >= LAPS_BEFORE_NAP * 2) {
        s.greets = 0;
        go('doze');
        later(() => { go('sleep'); later(() => wake('嗨！睡飽了～'), SLEEP_MS); }, DOZE_MS);
      } else startWalking(s.dir === 1 ? -1 : 1);
    };
    // 依使用者需求：巡邏到達端點時只簡單打招呼，自我介紹改為只有使用者點擊時才會觸發
    say('嗨！');
    later(next, 2400);
  };
  const poke = () => {
    const s = st();
    if (!['walk', 'hi', 'doze', 'sleep', 'cheer'].includes(s.phase)) return;
    clearTimers();
    if (s.phase === 'doze' || s.phase === 'sleep') {
      go('cheer');
      say('嗯…？醒來了～');
      later(() => {
        go('hi');
        sayIntro(() => { setBubble(null); startWalking(s.dir === 1 ? -1 : 1); });
      }, 1200);
      return;
    }
    go('hi');
    sayIntro(() => { setBubble(null); startWalking(s.dir); });
  };

  // ── 互動反應 ──
  const angry = () => {
    interrupt();
    go('angry');
    say(LINE_ANGRY, 3000);
    later(resume, 3000);
  };
  const lost = () => {
    interrupt();
    go('lost');
    say(LINE_LOST, 1900);
    later(resume, 1900);
  };
  const eat = () => {
    const fish = st().items.fish;
    interrupt();
    go('eat');
    say(LINE_EAT, 1800);
    fish.state = 'eaten';
    later(() => { respawn(fish); resume(); }, 1800);
  };
  const play = () => {
    interrupt();
    go('play');
    say(LINE_PLAY, 1500);
    later(() => {
      const { sz } = geo();
      const b = st().items.ball;
      if (b.state === 'rest') {
        b.vx = (Math.random() < 0.5 ? -1 : 1) * sz * (3 + Math.random() * 2);
        b.vy = sz * 4; b.state = 'fly'; b.thrown = false; b.displaced = true;
      }
      st().nextPlayAt = performance.now() + 30000 + Math.random() * 25000;
      resume();
    }, 1700);
  };
  const jump = (kind: 'in' | 'out', done: () => void) => {
    const { sz, TW, catMin } = geo();
    clearTimers();
    const inside = TW / 2 - sz / 2;
    st().jump = { t: 0, dur: kind === 'in' ? 0.6 : 0.55, x0: kind === 'in' ? st().x : inside, x1: kind === 'in' ? inside : catMin, kind, done };
    face(kind === 'in' ? -1 : 1);
    go(kind === 'in' ? 'jumpIn' : 'jumpOut');
  };
  const jumpIn = () => {
    jump('in', () => {
      const s = st();
      s.wobble = 0.5;
      s.fishInTrash = false;
      if (s.mouse.state === 'run') return jumpOutTo(() => { chase('mouse'); say(LINE_MOUSE, 1600); });
      go('inTrash');
      later(() => jumpOutTo(() => {
        respawn(s.items.fish);
        go('cheer');
        say(LINE_FULL, 1800);
        later(resume, 1600);
      }), IN_TRASH_MS);
    });
  };
  const jumpOutTo = (after: () => void) => {
    st().wobble = 0.5;
    jump('out', () => { st().x = geo().catMin; st().y = 0; st().op = 1; after(); });
  };

  /** 老鼠從垃圾桶逃出來 */
  const mouseOut = () => {
    const s = st(), m = s.mouse;
    const { TW, TH, sz } = geo();
    if (m.state !== 'hidden' || performance.now() < m.readyAt) return;
    m.state = 'run'; m.x = TW * 0.5; m.h = TH * 0.75; m.vy = sz * 5.5; m.jumping = true; m.rot = 0; m.op = 1; m.t = 0; m.peekUntil = 0;
    s.wobble = 0.5;
    if (s.phase === 'inTrash') { interrupt(); jumpOutTo(() => { chase('mouse'); say(LINE_MOUSE, 1600); }); }
    else if (s.phase === 'jumpIn' || s.phase === 'jumpOut' || s.phase === 'angry') { /* 動作做完會自己去追 */ }
    else { interrupt(); chase('mouse'); say(LINE_MOUSE, 1600); }
  };

  const enterTrash = (it: Item) => {
    const s = st();
    it.state = 'trash'; it.thrown = false; it.vx = 0; it.vy = 0;
    s.wobble = 0.5;
    if (it.kind === 'fish') {
      s.fishInTrash = true; it.displaced = false;
      soon(mouseOut, 450);
      const p = s.phase;
      if (!busyPhases.includes(p) && s.mouse.state !== 'run' && !(p === 'chase' && s.purpose === 'mouse')) {
        interrupt(); say(LINE_FISH_TRASH, 1400); chase('trash');
      }
    } else {
      soon(() => respawn(it), 900);
      if (s.phase !== 'angry') {
        say(LINE_BALL_GOAL, 2200);
        if (['walk', 'hi', 'doze', 'sleep', 'lost', 'cheer'].includes(s.phase)) { interrupt(); go('cheer'); later(resume, 1500); }
      }
      soon(mouseOut, 1500);
    }
  };

  const hitCat = (it: Item) => {
    const { sz } = geo();
    const c = st().x + sz / 2;
    it.vx = (it.x < c ? -1 : 1) * Math.max(60, Math.abs(it.vx) * 0.35);
    it.vy = 180; it.thrown = false;
    angry();
  };

  // ── 拖曳與丟出 ──
  const local = (e: React.PointerEvent) => {
    const rect = boxRef.current!.getBoundingClientRect();
    const { r } = geo();
    return { x: e.clientX - rect.left, h: rect.bottom - e.clientY - r };
  };
  const onDown = (kind: ItemKind) => (e: React.PointerEvent<HTMLDivElement>) => {
    const it = st().items[kind];
    if (it.state === 'trash' || it.state === 'eaten') return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = local(e);
    it.state = 'drag'; it.grabDx = it.x - p.x; it.grabDh = it.h - p.h; it.moved = false; it.vx = 0; it.vy = 0;
    it.samples = [{ t: performance.now(), x: it.x, h: it.h }];
  };
  const onMove = (kind: ItemKind) => (e: React.PointerEvent<HTMLDivElement>) => {
    const it = st().items[kind];
    if (it.state !== 'drag') return;
    const { W, r } = geo();
    const p = local(e);
    const nx = Math.max(r, Math.min(W - r, p.x + it.grabDx)), nh = Math.max(0, p.h + it.grabDh);
    if (Math.abs(nx - it.x) + Math.abs(nh - it.h) > 2) it.moved = true;
    it.x = nx; it.h = nh;
    const t = performance.now();
    it.samples.push({ t, x: nx, h: nh });
    while (it.samples.length > 2 && t - it.samples[0].t > 90) it.samples.shift();
  };
  const onUp = (kind: ItemKind) => (e: React.PointerEvent<HTMLDivElement>) => {
    const s = st(), it = s.items[kind];
    if (it.state !== 'drag') return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    const { sz, TW, TH } = geo();
    if (!it.moved) { it.vy = sz * 3; it.vx = 0; it.state = 'fly'; it.thrown = false; return; } // 點一下：小跳
    const a = it.samples[0], b = it.samples[it.samples.length - 1];
    const dt = Math.max(0.016, (b.t - a.t) / 1000);
    const lim = sz * 22;
    it.vx = Math.max(-lim, Math.min(lim, (b.x - a.x) / dt));
    it.vy = Math.max(-lim, Math.min(lim, (b.h - a.h) / dt));
    it.state = 'fly'; it.thrown = true; it.displaced = true;
    if (it.x < TW && it.h < TH) { enterTrash(it); return; }
    if (kind === 'fish' && !busyPhases.includes(s.phase) && s.mouse.state !== 'run') chase('fish');
  };

  // ── 每一幀：白喵、道具、老鼠 ──
  useEffect(() => {
    let raf = 0, last = performance.now();
    const onResize = () => setSize(window.innerWidth < 640 ? 64 : 92);
    window.addEventListener('resize', onResize);
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const box = boxRef.current, cat = catRef.current;
      if (!box || !cat) return;
      const s = S.current;
      s.W = box.clientWidth;
      const { sz, W, TW, TH, r, catMin, catMax, run, mouseSpeed, mw } = geo();
      if (s.x < 0) s.x = catMin;
      for (const it of Object.values(s.items)) if (!it.placed && W > 0) { respawn(it); it.pop = 1; it.placed = true; }

      // 白喵移動
      if (s.phase === 'walk' && !reduceMotion) {
        s.x += s.dir * WALK_SPEED * dt;
        if (s.dir === 1 && s.x >= catMax) { s.x = catMax; arrive(); }
        else if (s.dir === -1 && s.x <= catMin) { s.x = catMin; arrive(); }
        // 不時過去玩毛線球
        if (now > s.nextPlayAt && s.items.ball.state === 'rest') { s.nextPlayAt = now + 40000; chase('ball'); }
      } else if (s.phase === 'chase') {
        const it = s.purpose === 'fish' ? s.items.fish : s.purpose === 'ball' ? s.items.ball : null;
        const tx = s.purpose === 'mouse' ? s.mouse.x : s.purpose === 'trash' ? TW / 2 : it ? it.x : s.x + sz / 2;
        const want = Math.max(catMin, Math.min(catMax, tx - sz / 2));
        const d = want - s.x;
        if (Math.abs(d) > 3) { s.x += Math.sign(d) * Math.min(Math.abs(d), run * dt); face(d > 0 ? 1 : -1); }
        else if (s.purpose === 'trash') jumpIn();
        else if (s.purpose === 'fish' && it && it.state === 'rest') eat();
        else if (s.purpose === 'ball' && it && it.state === 'rest') play();
        else if (s.purpose === 'fish' && it && (it.state === 'trash' || it.state === 'eaten')) resume();
      }
      if (s.jump) {
        const j = s.jump;
        j.t += dt;
        const k = Math.min(1, j.t / j.dur);
        s.x = j.x0 + (j.x1 - j.x0) * k;
        const arc = -Math.sin(Math.PI * k) * sz * 0.55;
        if (j.kind === 'in') {
          s.y = arc + (k > 0.6 ? ((k - 0.6) / 0.4) * sz * 0.6 : 0);
          s.op = k > 0.72 ? Math.max(0, 1 - (k - 0.72) / 0.28) : 1;
        } else {
          s.y = arc + (k < 0.4 ? (1 - k / 0.4) * sz * 0.6 : 0);
          s.op = k < 0.25 ? k / 0.25 : 1;
        }
        if (k >= 1) { s.jump = null; s.y = 0; s.op = j.kind === 'in' ? 0 : 1; j.done(); }
      }
      if (s.phase === 'inTrash') { s.op = 0; s.x = TW / 2 - sz / 2; }
      if (!s.jump && s.phase !== 'inTrash') { s.y = 0; s.op = 1; if (s.phase !== 'jumpIn' && s.phase !== 'jumpOut') s.x = Math.min(catMax, Math.max(catMin, s.x)); }
      cat.style.transform = `translate3d(${Math.round(s.x)}px,${Math.round(s.y)}px,0)`;
      cat.style.opacity = String(s.op);
      const e = s.x < 140 ? 'start' : s.x > catMax - 140 ? 'end' : 'center';
      setEdge((prev) => (prev === e ? prev : e));

      // 道具
      const catC = s.x + sz / 2;
      for (const it of Object.values(s.items)) {
        if (it.state === 'fly') {
          const prevH = it.h;
          it.vy -= G * dt; it.h += it.vy * dt; it.x += it.vx * dt;
          it.rot += it.kind === 'ball' ? (it.vx * dt / r) * 57.3 : it.vx * dt * 1.6;
          if (it.x > W - r) { it.x = W - r; it.vx = -Math.abs(it.vx) * 0.5; }
          if (it.x < r) { it.x = r; it.vx = Math.abs(it.vx) * 0.5; }
          // 垃圾桶：從上方掉進桶口算投進；從側面撞到就彈開
          if (it.x - r * 0.6 < TW && it.h < TH) {
            if (prevH >= TH && it.x > TW * 0.1 && it.x < TW * 0.9) { enterTrash(it); continue; }
            if (prevH >= TH) { it.h = TH; it.vy = Math.abs(it.vy) * 0.3; it.vx = Math.abs(it.vx) * 0.4 + 60; }
            else { it.x = TW + r * 0.6; it.vx = Math.abs(it.vx) * 0.4; }
          }
          if (it.h <= 0) {
            it.h = 0;
            if (it.vy < -120) { it.vy = -it.vy * 0.35; it.vx *= 0.75; }
            else {
              it.vy = 0;
              it.vx *= Math.max(0, 1 - (it.kind === 'ball' ? 1.6 : 4) * dt);
              if (Math.abs(it.vx) < 10) { it.vx = 0; it.state = 'rest'; it.thrown = false; }
            }
          }
          if (it.thrown && catVisible() && Math.abs(it.x - catC) < sz * 0.3 + r && it.h < sz * 0.8) hitCat(it);
        } else if (it.state === 'rest' && it.kind === 'fish') {
          it.rot += (0 - it.rot) * Math.min(1, dt * 8);
        }
        if (it.pop < 1) it.pop = Math.min(1, it.pop + dt * 3.5);
        const el = itemRefs[it.kind].current;
        if (el) {
          const hidden = it.state === 'trash' || it.state === 'eaten';
          el.style.opacity = hidden ? '0' : '1';
          el.style.pointerEvents = hidden ? 'none' : 'auto';
          el.style.transform = `translate3d(${Math.round(it.x - r)}px,${Math.round(-it.h)}px,0) rotate(${it.rot.toFixed(1)}deg) scale(${(0.4 + 0.6 * it.pop).toFixed(3)})`;
        }
      }

      // 老鼠
      const m = s.mouse, mEl = mouseRef.current;
      if (m.state === 'run') {
        if (m.jumping) { m.vy -= G * dt; m.h += m.vy * dt; if (m.h <= 0) { m.h = 0; m.jumping = false; m.vy = 0; } }
        m.x += mouseSpeed * dt;
        // 白喵擋在前面就跳過去
        if (!m.jumping && catVisible() && catC > m.x && catC - m.x < sz * 0.75) { m.jumping = true; m.vy = sz * 7; }
        if (m.x > W + mw * 0.2) {
          m.state = 'fall'; m.vy = 0; m.t = 0;
          if (s.phase === 'chase' && s.purpose === 'mouse') lost();
        }
      } else if (m.state === 'fall') {
        m.t += dt; m.vy -= G * dt; m.h += m.vy * dt; m.rot += 540 * dt; m.op = Math.max(0, 1 - m.t / 0.9);
        if (m.t > 0.9) { m.state = 'hidden'; m.readyAt = now + 1200; m.rot = 0; m.nextPeekAt = now + 8000; }
      } else {
        // 躲在垃圾桶：偶爾探頭
        if (now > m.nextPeekAt && !s.fishInTrash && s.phase !== 'inTrash') { m.peekUntil = now + 1700; m.nextPeekAt = now + 9000 + Math.random() * 9000; }
        const peeking = now < m.peekUntil;
        const k = peeking ? Math.sin(Math.min(1, (m.peekUntil - now) / 1700) * Math.PI) : 0;
        m.x = TW * 0.5; m.h = TH - mw * 0.62 + k * mw * 0.42; m.op = peeking ? 1 : 0; m.rot = 0;
      }
      if (mEl) {
        mEl.style.opacity = String(m.op);
        mEl.style.transform = `translate3d(${Math.round(m.x - mw / 2)}px,${Math.round(-m.h)}px,0) rotate(${m.rot.toFixed(1)}deg)`;
        mEl.style.zIndex = m.state === 'hidden' ? '15' : '25';
      }

      // 垃圾桶晃動
      if (trashRef.current) {
        s.wobble = Math.max(0, s.wobble - dt);
        trashRef.current.style.transform = s.wobble > 0 ? `rotate(${(Math.sin(now / 28) * 7 * (s.wobble / 0.5)).toFixed(2)}deg)` : '';
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      clearTimers();
      S.current.misc.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(S.current.bubbleTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ACTION_OF: Record<Phase, BaiMiaoAction> = {
    walk: reduceMotion ? 'idle' : 'walk', hi: 'hi', doze: 'doze', sleep: 'sleep', cheer: 'cheer', chase: 'run', angry: 'angry',
    eat: 'cheer', play: 'play', jumpIn: 'hop', inTrash: 'idle', jumpOut: 'hop', lost: 'idle',
  };
  const { TW, TH, r, mw } = (() => {
    const sz = size;
    return { TW: Math.round(sz * 0.56), TH: Math.round(sz * 0.6), r: Math.round(sz * 0.2), mw: Math.round(sz * 0.42) };
  })();
  const itemBase: React.CSSProperties = {
    position: 'absolute', left: 0, bottom: 0, width: r * 2, height: r * 2, zIndex: 30, touchAction: 'none',
    cursor: 'grab', willChange: 'transform', pointerEvents: 'auto',
  };

  return (
    <div ref={boxRef} className="pointer-events-none absolute inset-x-2 sm:inset-x-4 bottom-full z-20 select-none" style={{ height: size, marginBottom: -Math.round(size * 0.03) }}>
      <div ref={catRef} className="absolute bottom-0 left-0 will-change-transform" style={{ width: size, height: size, zIndex: 10 }}>
        <BaiMiao
          action={ACTION_OF[phase]}
          facing={dir}
          size={size}
          bubble={phase === 'inTrash' ? null : bubble}
          bubbleAlign={edge}
          onPokeCharacter={poke}
          ariaLabel="市場顧問白喵（點我自我介紹）"
        />
      </div>
      {/* 老鼠（躲在垃圾桶裡，不能拖） */}
      <div ref={mouseRef} aria-hidden="true" className="absolute bottom-0 left-0" style={{ width: mw, height: Math.round(mw * 0.68), opacity: 0, zIndex: 15, pointerEvents: 'none' }}>
        <MouseSvg />
      </div>
      {/* 垃圾桶 */}
      <div ref={trashRef} aria-hidden="true" className="absolute bottom-0 left-0" style={{ width: TW, height: TH, zIndex: 20, transformOrigin: '50% 100%' }}>
        <TrashSvg />
      </div>
      {/* 可以丟的魚與毛線球 */}
      <div
        ref={itemRefs.fish}
        role="button"
        aria-label="魚（可以拖曳丟出去）"
        title="拖曳丟出去"
        style={itemBase}
        onPointerDown={onDown('fish')}
        onPointerMove={onMove('fish')}
        onPointerUp={onUp('fish')}
        onPointerCancel={onUp('fish')}
      >
        <FishSvg />
      </div>
      <div
        ref={itemRefs.ball}
        role="button"
        aria-label="毛線球（可以拖曳丟出去）"
        title="拖曳丟出去"
        style={itemBase}
        onPointerDown={onDown('ball')}
        onPointerMove={onMove('ball')}
        onPointerUp={onUp('ball')}
        onPointerCancel={onUp('ball')}
      >
        <BallSvg />
      </div>
    </div>
  );
};

export default BaiMiaoZoneWalker;
