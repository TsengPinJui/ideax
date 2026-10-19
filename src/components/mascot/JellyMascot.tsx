import React, { useCallback, useEffect, useRef, useState } from 'react';
import './mascot.css';
import { createMascotEngine, type MascotEngine } from './mascotEngine';
import { MASCOT_CHEER_EVENT, MASCOT_NAV_TARGETS, MASCOT_NAVIGATE_EVENT, MASCOT_PREVIEW_EVENT, normalizeMascotConfig, type MascotConfig } from './mascotConfig';
import { playGlowSound, unlockMascotAudio } from './mascotSound';
import { askMascot, routeMascot, trackMascotEvent, type MascotAction, type MascotAgent } from '../../services/mascotApi';

const COLLAPSED_KEY = 'ideax_mascot_collapsed';
const LAST_VISIT_KEY = 'ideax_mascot_last_visit';
const IMPRESSION_KEY = 'ideax_mascot_impression';
const DAY_MS = 86400000;
const IDLE_SESSION_MS = 20000;

interface ChatMsg { id: number; who: 'me' | 'bot'; text: string; tag?: string; reveal?: number; actions?: MascotAction[] }

const readLS = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const writeLS = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };

/** 量測底部要避開的元素（手機底部導覽列），吉祥物站在它上面 */
function measureInsets(includeChat = true) {
  let bottom = 14;
  let right = 6;
  document.querySelectorAll<HTMLElement>('[data-ixm-avoid="bottom"]').forEach((node) => {
    const r = node.getBoundingClientRect();
    if (r.height > 0 && r.top < window.innerHeight && getComputedStyle(node).display !== 'none') bottom = Math.max(bottom, window.innerHeight - r.top + 10);
  });
  void includeChat;
  return { bottom, right };
}

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
const WIDE_MIN = 720; // 寬螢幕：從對話框左邊探頭；窄螢幕（手機）：從對話框頂部探頭

/** 抓住對話框邊框的手套（3D 畫布在對話框後面，所以手指用 2D 疊在邊框上） */
const GripGlove = ({ dir, left, top }: { dir: 'left' | 'top'; left: number; top: number }) => (
  <div className={`ixm-grip ixm-grip-${dir}`} style={{ left, top }} aria-hidden="true">
    <svg viewBox="0 0 30 44" width="30" height="44">
      {[8, 21, 34].map((y) => <ellipse key={y} cx="16" cy={y} rx="13" ry="6.2" fill="#fbfaf6" stroke="#bdb6a8" strokeWidth="1.6" />)}
    </svg>
  </div>
);

const Drop = ({ style }: { style: React.CSSProperties }) => (
  <svg viewBox="0 0 22 30" style={style}>
    <path d="M11 1 C 15 10 21 15 21 21 A 10 10 0 0 1 1 21 C 1 15 7 10 11 1 Z" fill="#8FD0FF" stroke="#4A9FD8" strokeWidth="1.5" />
    <ellipse cx="7.5" cy="19" rx="2.2" ry="3.4" fill="#fff" opacity=".8" />
  </svg>
);

const JellyMascot: React.FC<{ config: MascotConfig; userId?: string }> = ({ config, userId }) => {
  const [collapsed, setCollapsed] = useState(() => readLS(COLLAPSED_KEY) === '1');
  const [chatOpen, setChatOpen] = useState(false);
  const chatOpenRef = useRef(false);
  chatOpenRef.current = chatOpen;
  const [climbNonce, setClimbNonce] = useState(0);
  const [chatMaxH, setChatMaxH] = useState<string | undefined>(undefined);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');
  // 一次只能問一題：上一題回覆前鎖住（用 ref 擋住連按 Enter 的競態）
  const sendingRef = useRef(false);
  const waitTimer = useRef(0);
  const revealTimer = useRef(0);
  useEffect(() => () => { if (waitTimer.current) window.clearInterval(waitTimer.current); if (revealTimer.current) window.clearInterval(revealTimer.current); }, []);
  const [grips, setGrips] = useState<Array<{ dir: 'left' | 'top'; left: number; top: number }>>([]);
  const [liveText, setLiveText] = useState('');
  const chatRef = useRef<HTMLElement>(null);
  const stageSeq = useRef(0);
  const [chatBottom, setChatBottom] = useState(16);

  const rootRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const poolRef = useRef<HTMLDivElement>(null);
  const puddleRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const bubbleTextRef = useRef<HTMLSpanElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const raysRef = useRef<SVGSVGElement>(null);
  const alarmRef = useRef<HTMLDivElement>(null);
  const dropsRef = useRef<HTMLDivElement>(null);
  const msgsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const engineRef = useRef<MascotEngine | null>(null);
  const configRef = useRef(config);
  configRef.current = config;
  const convIds = useRef<Partial<Record<MascotAgent, string>>>({});
  const msgSeq = useRef(0);
  const enterOnMount = useRef(false);

  // 互動時長：第一次互動到最後一次互動（閒置 20 秒或離開頁面就結算一段）
  const session = useRef<{ start: number; last: number } | null>(null);
  const markActive = useCallback(() => {
    const now = Date.now();
    if (!session.current) session.current = { start: now, last: now };
    else session.current.last = now;
  }, []);
  const flushSession = useCallback(() => {
    const s = session.current;
    if (!s) return;
    session.current = null;
    trackMascotEvent('session', Math.max(1000, s.last - s.start + 1000));
  }, []);
  useEffect(() => {
    const t = window.setInterval(() => { if (session.current && Date.now() - session.current.last > IDLE_SESSION_MS) flushSession(); }, 5000);
    const onHide = () => flushSession();
    window.addEventListener('pagehide', onHide);
    return () => { window.clearInterval(t); window.removeEventListener('pagehide', onHide); flushSession(); };
  }, [flushSession]);

  // 建立 / 拆除 3D 引擎（收起時整個拆掉，釋放 GPU）
  useEffect(() => {
    if (collapsed) return;
    const els = [rootRef, shadowRef, bubbleRef, bubbleTextRef, glowRef, raysRef, alarmRef, puddleRef, dropsRef, poolRef].map((r) => r.current);
    if (els.some((e) => !e)) return;
    let engine: MascotEngine;
    try {
      engine = createMascotEngine({
        root: rootRef.current!, shadow: shadowRef.current!, bubble: bubbleRef.current!, bubbleText: bubbleTextRef.current!,
        glow: glowRef.current!, rays: raysRef.current!, alarm: alarmRef.current!, puddle: puddleRef.current!, drops: dropsRef.current!, pool: poolRef.current!,
        tuning: { k: configRef.current.firmness, damp: configRef.current.damping, amp: configRef.current.wobble },
        bubbleDefault: configRef.current.bubbleText,
        getInsets: measureInsets,
        onEvent: (type) => {
          markActive();
          // 從對話框上被拖下來摔暈：過一會兒自己再爬回對話框頂部
          if (type === 'glow') { if (configRef.current.soundEnabled) playGlowSound(); return; }
          if (type === 'dropped') { window.setTimeout(() => { if (chatOpenRef.current) setClimbNonce((n) => n + 1); }, 3400); return; }
          trackMascotEvent(type);
        },
      });
    } catch (err) {
      console.warn('[mascot] 3D 初始化失敗，略過顯示', err);
      return;
    }
    engineRef.current = engine;

    // 曝光：每個瀏覽分頁算一次
    try {
      if (!sessionStorage.getItem(IMPRESSION_KEY)) { sessionStorage.setItem(IMPRESSION_KEY, '1'); trackMascotEvent('impression'); }
    } catch { trackMascotEvent('impression'); }

    if (enterOnMount.current) {
      enterOnMount.current = false;
      engine.enterFrom();
      engine.say('我回來囉！', 1800);
    } else {
      // 多日沒來：傷心哭泣；否則揮手打招呼
      const prev = Number(readLS(LAST_VISIT_KEY) || 0);
      const days = prev ? (Date.now() - prev) / DAY_MS : 0;
      if (prev && days >= configRef.current.sadAfterDays) {
        engine.sad(configRef.current.sadText);
        trackMascotEvent('sad');
      } else {
        window.setTimeout(() => engineRef.current === engine && engine.wave(), 1400);
      }
    }
    writeLS(LAST_VISIT_KEY, String(Date.now()));

    const onPreview = (e: Event) => {
      const c = normalizeMascotConfig((e as CustomEvent).detail);
      engine.setTuning({ k: c.firmness, damp: c.damping, amp: c.wobble });
      engine.setBubbleDefault(c.bubbleText);
      if ((e as CustomEvent).detail?.__poke) engine.poke();
    };
    const onCheer = (e: Event) => engine.cheer((e as CustomEvent).detail?.text);
    window.addEventListener(MASCOT_PREVIEW_EVENT, onPreview);
    window.addEventListener(MASCOT_CHEER_EVENT, onCheer);
    return () => {
      window.removeEventListener(MASCOT_PREVIEW_EVENT, onPreview);
      window.removeEventListener(MASCOT_CHEER_EVENT, onCheer);
      engine.destroy();
      if (engineRef.current === engine) engineRef.current = null;
    };
  }, [collapsed, markActive]);

  // 管理員儲存新設定 → 即時套用
  useEffect(() => {
    engineRef.current?.setTuning({ k: config.firmness, damp: config.damping, amp: config.wobble });
    engineRef.current?.setBubbleDefault(config.bubbleText);
  }, [config.firmness, config.damping, config.wobble, config.bubbleText]);

  // 第一次點網頁時解鎖音效（瀏覽器規定）
  useEffect(() => {
    const unlock = () => unlockMascotAudio();
    window.addEventListener('pointerdown', unlock, { once: true, capture: true });
    window.addEventListener('keydown', unlock, { once: true, capture: true });
    return () => { window.removeEventListener('pointerdown', unlock, { capture: true }); window.removeEventListener('keydown', unlock, { capture: true }); };
  }, []);

  // 登入成功：開心跳起來
  const prevUser = useRef(userId);
  useEffect(() => {
    const was = prevUser.current;
    prevUser.current = userId;
    if (userId && userId !== 'user-guest' && was !== userId && (!was || was === 'user-guest')) engineRef.current?.cheer('歡迎回來！');
  }, [userId]);

  useEffect(() => { if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight; }, [msgs, sending]);

  // 對話框打開：小燈泡從對話框後面探頭、抓著邊框左右看，再把身體拉出來站到旁邊；關上就走回右下角
  useEffect(() => {
    const seq = ++stageSeq.current;
    const eng = engineRef.current;
    if (!chatOpen) { setGrips([]); eng?.drop(); return; } // 關閉對話框：在上面或爬到一半都會掉回地面
    let cancelled = false;
    let settled = false;
    let ro: ResizeObserver | null = null;
    const alive = () => !cancelled && stageSeq.current === seq && engineRef.current === eng && !!chatRef.current;
    const outside = () => {
      const r = chatRef.current!.getBoundingClientRect();
      const { w, h, foot } = eng!.size();
      const floorY = window.innerHeight - measureInsets(false).bottom;
      if (window.innerWidth >= WIDE_MIN) return { r, w, h, foot, floorY, wide: true, x: Math.max(w * 0.5, r.left - w * 0.42), y: floorY };
      return { r, w, h, foot, floorY, wide: false, x: Math.min(window.innerWidth - w * 0.5 - 4, r.right - w * 0.5 - 6), y: r.top + 2 };
    };
    // 對話框長高或視窗改變大小：站位跟著對話框頂部走
    const onResize = () => { if (settled && alive()) { const o = outside(); if (o.wide || o.r.top >= o.h * 0.95) eng!.stage({ x: o.x, y: o.y }); else eng!.stage({ x: o.x, y: o.r.top + o.h * o.foot + 6 }); } };
    window.addEventListener('resize', onResize);
    (async () => {
      await wait(60);
      if (!alive() || !eng) return;
      const o = outside();
      if (o.wide) {
        // 1. 整個藏在對話框後面 → 2. 先露出手抓住左邊框 → 3. 探頭左右看 → 4. 把身體拉出來
        eng.stage({ x: o.r.left + o.w * 0.62, y: o.floorY }, true);
        await wait(250); if (!alive()) return;
        const gy = o.floorY - o.h * o.foot + o.h * 0.4;
        setGrips([{ dir: 'left', left: o.r.left - 8, top: gy }, { dir: 'left', left: o.r.left - 8, top: gy + o.h * 0.2 }]);
        await wait(650); if (!alive()) return;
        eng.stage({ x: o.r.left + o.w * 0.16, y: o.floorY, lean: -0.45, look: 'around' });
        await wait(1300); if (!alive()) return;
        eng.stage({ x: o.x, y: o.y, lean: 0 });
        eng.pop(-3.2);
        await wait(260); if (!alive()) return;
        setGrips([]);
      } else {
        // 1. 藏在對話框後面 → 2. 兩隻手先搭上頂部邊框 → 3. 探頭張望 → 4. 撐上去站在對話框上
        if (o.r.top < o.h * 0.95) return; // 對話框上方空間不夠，就待在後面
        eng.stage({ x: o.x, y: o.y + o.h * o.foot + 6 }, true);
        await wait(250); if (!alive()) return;
        setGrips([{ dir: 'top', left: o.x - o.w * 0.34, top: o.r.top - 12 }, { dir: 'top', left: o.x + o.w * 0.08, top: o.r.top - 12 }]);
        await wait(650); if (!alive()) return;
        eng.stage({ x: o.x, y: o.y + o.h * 0.42, look: 'around' });
        await wait(1300); if (!alive()) return;
        eng.squash?.(0.16); // 用力撐之前先蹲一下
        await wait(140); if (!alive()) return;
        eng.stage({ x: o.x, y: o.y });
        eng.pop(1.6);
        await wait(320); if (!alive()) return;
        setGrips([]);
      }
      await wait(450); if (!alive()) return;
      settled = true;
      if (typeof ResizeObserver === 'function' && chatRef.current) { ro = new ResizeObserver(() => onResize()); ro.observe(chatRef.current); }
      eng.jump(0.5);
      eng.talk(1300); // 像在說開場白
    })();
    return () => { cancelled = true; ro?.disconnect(); window.removeEventListener('resize', onResize); };
  }, [chatOpen, climbNonce]);

  /** 功能捷徑：打開網站頁面（功能本身仍由使用者在網站介面操作）；手機上順便收起對話框，讓頁面露出來 */
  const goTo = (to: string) => {
    if (!MASCOT_NAV_TARGETS.has(to)) return;
    markActive();
    if (to === 'mailto') { window.location.href = 'mailto:support@ideax.tw'; return; }
    try { window.dispatchEvent(new CustomEvent(MASCOT_NAVIGATE_EVENT, { detail: { to } })); } catch {}
    if (window.innerWidth < WIDE_MIN) setChatOpen(false);
  };

  /** 助理回覆：文字逐字出現，同時小燈泡嘴巴一開一合 */
  const addBotReply = (text: string, tag?: string, actions?: MascotAction[]) => new Promise<void>((resolve) => {
    const id = ++msgSeq.current;
    const safeActions = (actions || []).filter((a) => a && typeof a.label === 'string' && MASCOT_NAV_TARGETS.has(a.to)).slice(0, 3);
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dur = reduce ? 0 : Math.min(4500, Math.max(700, text.length * 35));
    setLiveText('');
    if (!dur) { setMsgs((m) => [...m, { id, who: 'bot', text, tag, actions: safeActions }]); setLiveText(text); resolve(); return; }
    setMsgs((m) => [...m, { id, who: 'bot', text, tag, reveal: 0, actions: safeActions }]);
    engineRef.current?.talk(dur);
    const t0 = Date.now();
    if (revealTimer.current) window.clearInterval(revealTimer.current);
    revealTimer.current = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / dur);
      setMsgs((m) => m.map((x) => (x.id === id ? { ...x, reveal: p >= 1 ? undefined : Math.ceil(text.length * p) } : x)));
      if (p >= 1) { window.clearInterval(revealTimer.current); revealTimer.current = 0; setLiveText(text); resolve(); }
    }, 40);
  });

  const openChat = () => {
    markActive();
    if (!configRef.current.chatEnabled) { engineRef.current?.cheer(); return; }
    const cb = measureInsets(false).bottom + 4;
    setChatBottom(cb);
    // 手機：對話框上方保留小燈泡站的空間
    setChatMaxH(window.innerWidth < WIDE_MIN ? `calc(100vh - ${cb + 200}px)` : undefined);
    setChatOpen(true);
    trackMascotEvent('open');
    if (!msgs.length) setMsgs([{ id: ++msgSeq.current, who: 'bot', text: configRef.current.bubbleText, tag: '小燈泡' }]);
    window.setTimeout(() => inputRef.current?.focus(), 50);
  };

  const collapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    markActive();
    trackMascotEvent('collapse');
    setChatOpen(false);
    setCollapsed(true);
    writeLS(COLLAPSED_KEY, '1');
  };

  const expand = () => {
    trackMascotEvent('expand');
    enterOnMount.current = true;
    setCollapsed(false);
    writeLS(COLLAPSED_KEY, '0');
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || sendingRef.current) return;
    sendingRef.current = true;
    markActive();
    setInput('');
    setMsgs((m) => [...m, { id: ++msgSeq.current, who: 'me', text: q }]);
    setSending(true);
    engineRef.current?.think(true);
    try {
      setStatus('小燈泡正在判斷要找哪位助理…');
      const route = await routeMascot(q);
      if (route?.outOfScope) {
        // 三位助理都不負責的問題：不轉接、不隨意回答
        engineRef.current?.think(false);
        await addBotReply(route.reply, '小燈泡', route.actions);
        return;
      }
      // 依等待時間更新提示：0 秒轉接中 → 30 秒撰寫中 → 60 秒請再等等 → 3 分鐘小燈泡代答
      const label = route?.agentLabel || '助理';
      const t0 = Date.now();
      let shyShown = false;
      const offline = route?.available === false; // 這位助理沒設定：直接由小燈泡代答，不用等
      const tick = () => {
        const sec = (Date.now() - t0) / 1000;
        if (offline) { setStatus(`${label}暫時不在線，小燈泡代為回答…`); return; }
        if (sec >= 60 && !shyShown) { shyShown = true; engineRef.current?.embarrassed(); } // 等太久：不好意思
        setStatus(
          sec >= 180 ? '小燈泡正在代為回答…'
          : sec >= 60 ? `再給${label === '官方客服特助' ? '客服' : label}一點時間，超過三分鐘將由小燈泡代為回答...`
          : sec >= 30 ? `${label}已經收到你的問題，正在撰寫回覆...`
          : `小燈泡正在轉接${label}...`
        );
      };
      tick();
      waitTimer.current = window.setInterval(tick, 1000);
      const res = await askMascot(q, convIds.current, route?.agent);
      if (waitTimer.current) { window.clearInterval(waitTimer.current); waitTimer.current = 0; }
      setStatus('');
      engineRef.current?.think(false);
      if (res.ok) {
        if (res.agent && res.conversationId) convIds.current[res.agent] = res.conversationId;
        await addBotReply(res.reply, res.agentLabel || '小燈泡', res.actions);
        if (res.source === 'apology') engineRef.current?.embarrassed();
      } else {
        await addBotReply(res.error, '小燈泡');
        if (res.timedOut) engineRef.current?.embarrassed();
      }
    } finally {
      if (waitTimer.current) { window.clearInterval(waitTimer.current); waitTimer.current = 0; }
      sendingRef.current = false;
      setSending(false);
      setStatus('');
      engineRef.current?.think(false);
      markActive();
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  };

  if (collapsed) {
    return (
      <button type="button" className="ixm-peek" style={{ bottom: measureInsets(false).bottom + 90 }} onClick={expand} aria-label="叫出燈泡吉祥物">
        <svg width="22" height="30" viewBox="44 46 152 202" aria-hidden="true">
          <path d="M 88 184 C 80 167 54 152 54 118 A 66 66 0 0 1 186 118 C 186 152 160 167 152 184 Z" fill="#FFC21A" />
          <rect x="84" y="194" width="72" height="20" rx="10" fill="#2A2A2E" />
          <rect x="94" y="222" width="52" height="20" rx="10" fill="#2A2A2E" />
        </svg>
      </button>
    );
  }

  return (
    <>
      <div ref={poolRef} className="ixm-pool" aria-hidden="true" />
      <div ref={shadowRef} className="ixm-shadow" aria-hidden="true" />
      <div ref={puddleRef} className="ixm-puddle" aria-hidden="true" />
      <div
        ref={rootRef}
        className="ixm-root"
        role="button"
        tabIndex={0}
        aria-label="IdeaX 燈泡吉祥物，可拖曳或點一下互動"
        style={{ transform: 'translate(-400px, -400px)' }}
      >
        <div ref={glowRef} className="ixm-glow" aria-hidden="true" />
        {/* 只有燈泡本體可以點或拖，周圍透明的地方不擋住網頁內容 */}
        <div className="ixm-hit" aria-hidden="true" />
        <svg ref={raysRef} className="ixm-rays" viewBox="0 0 180 240" aria-hidden="true">
          <g stroke="#FFC21A" strokeWidth="6" strokeLinecap="round">
            <line x1="90" y1="4" x2="90" y2="22" /><line x1="34" y1="26" x2="46" y2="38" /><line x1="146" y1="26" x2="134" y2="38" />
            <line x1="10" y1="80" x2="26" y2="82" /><line x1="170" y1="80" x2="154" y2="82" />
          </g>
        </svg>
        <div ref={dropsRef} className="ixm-drops" aria-hidden="true">
          <Drop style={{ left: 22, top: 30 }} />
          <Drop style={{ right: 18, top: 18 }} />
        </div>
        <div ref={alarmRef} className="ixm-alarm" aria-hidden="true">
          <span style={{ left: 18, top: 6, transform: 'rotate(-14deg)' }}>!</span>
          <span style={{ right: 6, top: 0, transform: 'rotate(12deg)' }}>!?</span>
        </div>
      </div>
      <div
        ref={bubbleRef}
        className="ixm-bubble"
        role="button"
        tabIndex={0}
        hidden={chatOpen}
        aria-label={config.chatEnabled ? '打開提問視窗' : '和燈泡吉祥物互動'}
        style={{ transform: 'translate(-400px, -400px)' }}
        onClick={openChat}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openChat(); } }}
      >
        <span ref={bubbleTextRef} className="ixm-bubble-text" aria-live="polite" />
        <button type="button" className="ixm-x" onClick={collapse} aria-label="收起吉祥物">×</button>
      </div>
      {grips.map((g, i) => <GripGlove key={`${g.dir}-${i}`} {...g} />)}
      {chatOpen && (
        <section ref={chatRef} className="ixm-chat" style={{ bottom: chatBottom, maxHeight: chatMaxH }} aria-label="問問小燈泡">
          <header>
            <span>問問小燈泡<small>客服、市場、業務問題會交給對應的 AI 助理</small></span>
            <button type="button" onClick={() => { setChatOpen(false); markActive(); }} aria-label="關閉提問視窗">×</button>
          </header>
          <div ref={msgsRef} className="ixm-msgs">
            {msgs.map((m) => (
              <div key={m.id} className={`ixm-msg ${m.who}`}>
                {m.tag && <span className="ixm-tag">{m.tag}</span>}
                {m.reveal === undefined ? m.text : m.text.slice(0, m.reveal)}
                {m.reveal === undefined && m.actions && m.actions.length > 0 && (
                  <span className="ixm-actions">
                    {m.actions.map((a) => (
                      <button key={a.to + a.label} type="button" className="ixm-action" onClick={() => goTo(a.to)}>{a.label} →</button>
                    ))}
                  </span>
                )}
              </div>
            ))}
            {sending && status && <div className="ixm-typing" role="status">{status}</div>}
            <div className="ixm-sr" aria-live="polite">{liveText}</div>
          </div>
          <form onSubmit={send}>
            <label htmlFor="ixm-input" className="ixm-sr">輸入問題</label>
            <input id="ixm-input" ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} maxLength={500} autoComplete="off" readOnly={sending} aria-busy={sending}
              placeholder={sending ? '小燈泡回覆中，請稍等…' : '例如：忘記密碼怎麼辦？'} />
            <button type="submit" disabled={sending || !input.trim()}>送出</button>
          </form>
        </section>
      )}
    </>
  );
};

export default JellyMascot;
