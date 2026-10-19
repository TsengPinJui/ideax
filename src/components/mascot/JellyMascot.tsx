import React, { useCallback, useEffect, useRef, useState } from 'react';
import './mascot.css';
import { createMascotEngine, type MascotEngine } from './mascotEngine';
import { MASCOT_CHEER_EVENT, MASCOT_PREVIEW_EVENT, normalizeMascotConfig, type MascotConfig } from './mascotConfig';
import { askMascot, trackMascotEvent, type MascotAgent } from '../../services/mascotApi';

const COLLAPSED_KEY = 'ideax_mascot_collapsed';
const LAST_VISIT_KEY = 'ideax_mascot_last_visit';
const IMPRESSION_KEY = 'ideax_mascot_impression';
const DAY_MS = 86400000;
const IDLE_SESSION_MS = 20000;

interface ChatMsg { id: number; who: 'me' | 'bot'; text: string; tag?: string }

const readLS = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const writeLS = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };

/** 量測底部要避開的元素（手機底部導覽列），吉祥物站在它上面 */
function measureInsets() {
  let bottom = 14;
  document.querySelectorAll<HTMLElement>('[data-ixm-avoid="bottom"]').forEach((node) => {
    const r = node.getBoundingClientRect();
    if (r.height > 0 && r.top < window.innerHeight && getComputedStyle(node).display !== 'none') bottom = Math.max(bottom, window.innerHeight - r.top + 10);
  });
  return { bottom, right: 6 };
}

const Drop = ({ style }: { style: React.CSSProperties }) => (
  <svg viewBox="0 0 22 30" style={style}>
    <path d="M11 1 C 15 10 21 15 21 21 A 10 10 0 0 1 1 21 C 1 15 7 10 11 1 Z" fill="#8FD0FF" stroke="#4A9FD8" strokeWidth="1.5" />
    <ellipse cx="7.5" cy="19" rx="2.2" ry="3.4" fill="#fff" opacity=".8" />
  </svg>
);

const JellyMascot: React.FC<{ config: MascotConfig; userId?: string }> = ({ config, userId }) => {
  const [collapsed, setCollapsed] = useState(() => readLS(COLLAPSED_KEY) === '1');
  const [chatOpen, setChatOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
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
        onEvent: (type) => { markActive(); trackMascotEvent(type); },
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

  // 登入成功：開心跳起來
  const prevUser = useRef(userId);
  useEffect(() => {
    const was = prevUser.current;
    prevUser.current = userId;
    if (userId && userId !== 'user-guest' && was !== userId && (!was || was === 'user-guest')) engineRef.current?.cheer('歡迎回來！');
  }, [userId]);

  useEffect(() => { if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight; }, [msgs, sending]);

  const openChat = () => {
    markActive();
    if (!configRef.current.chatEnabled) { engineRef.current?.cheer(); return; }
    setChatBottom(measureInsets().bottom + 4);
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
    if (!q || sending) return;
    markActive();
    setInput('');
    setMsgs((m) => [...m, { id: ++msgSeq.current, who: 'me', text: q }]);
    setSending(true);
    engineRef.current?.think(true);
    const res = await askMascot(q, convIds.current);
    setSending(false);
    engineRef.current?.think(false);
    if (res.ok) {
      if (res.conversationId) convIds.current[res.agent] = res.conversationId;
      setMsgs((m) => [...m, { id: ++msgSeq.current, who: 'bot', text: res.reply, tag: res.agentLabel }]);
      engineRef.current?.jump(0.6);
    } else {
      setMsgs((m) => [...m, { id: ++msgSeq.current, who: 'bot', text: res.error, tag: '小燈泡' }]);
    }
    markActive();
  };

  if (collapsed) {
    return (
      <button type="button" className="ixm-peek" style={{ bottom: measureInsets().bottom + 90 }} onClick={expand} aria-label="叫出燈泡吉祥物">
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
      {chatOpen && (
        <section className="ixm-chat" style={{ bottom: chatBottom }} aria-label="問問小燈泡">
          <header>
            <span>問問小燈泡<small>客服、市場、業務問題會交給對應的 AI 助理</small></span>
            <button type="button" onClick={() => { setChatOpen(false); markActive(); }} aria-label="關閉提問視窗">×</button>
          </header>
          <div ref={msgsRef} className="ixm-msgs" aria-live="polite">
            {msgs.map((m) => (
              <div key={m.id} className={`ixm-msg ${m.who}`}>
                {m.tag && <span className="ixm-tag">{m.tag}</span>}
                {m.text}
              </div>
            ))}
            {sending && <div className="ixm-typing">小燈泡思考中…</div>}
          </div>
          <form onSubmit={send}>
            <label htmlFor="ixm-input" className="ixm-sr">輸入問題</label>
            <input id="ixm-input" ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} maxLength={500} autoComplete="off" placeholder="例如：忘記密碼怎麼辦？" />
            <button type="submit" disabled={sending || !input.trim()}>送出</button>
          </form>
        </section>
      )}
    </>
  );
};

export default JellyMascot;
