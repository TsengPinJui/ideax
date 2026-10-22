/**
 * 多慧、007、白喵的說話音效：全部用 Web Audio 即時合成（不需要音檔）。
 * 規則（全站角色一致）：只有「重要提示」「操作引導」或「回答使用者的問題」才出聲，閒聊不出聲。
 * 呼叫的地方自己判斷是不是重要的；這裡只負責發出聲音。
 * - 多慧（貓頭鷹）：柔和的「咕～咕」，說話時一句幾聲輕柔咕咕
 * - 007（機器人）：方波「嗶嗶」，雷達「叮～」回音、找到目標「嗶嗶嗶↑」
 * - 白喵（貓）：合成的「喵～」
 */
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

/** 第一次點網頁時呼叫（瀏覽器規定互動後才能出聲） */
export function unlockAgentVoices() {
  getCtx();
}

function ready(): AudioContext | null {
  const c = getCtx();
  return c && c.state === 'running' && !document.hidden ? c : null;
}

function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

/** 同一個角色短時間內不要一直響 */
const lastAt: Record<string, number> = {};
function throttle(key: string, ms: number): boolean {
  const now = performance.now();
  if (now - (lastAt[key] || 0) < ms) return false;
  lastAt[key] = now;
  return true;
}

/** 文字裡有幾個「音節」（標點不算），最多 n 個 */
function syllables(text: string, n: number): number[] {
  const out: number[] = [];
  for (const ch of Array.from(text)) {
    if (/[\s，。、！？!?,.：:；;（）()「」『』…~～\-—]/.test(ch)) continue;
    out.push(ch.codePointAt(0) || 0);
    if (out.length >= n) break;
  }
  return out;
}

// ── 多慧：貓頭鷹 ──
function hoo(c: AudioContext, t: number, f: number, dur: number, peak: number) {
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(f * 1.06, t);
  o.frequency.exponentialRampToValueAtTime(f, t + dur * 0.3);
  o.frequency.exponentialRampToValueAtTime(f * 0.88, t + dur);
  const vib = c.createOscillator(); vib.frequency.value = 5.5;
  const vd = c.createGain(); vd.gain.value = f * 0.012;
  vib.connect(vd).connect(o.frequency);
  // 加一點氣音，像羽毛般柔軟
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1300; lp.Q.value = 0.7;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + Math.min(0.06, dur * 0.35));
  g.gain.setValueAtTime(peak, t + dur * 0.55);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(lp).connect(g).connect(c.destination);
  o.start(t); vib.start(t);
  o.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
}

/** 多慧打招呼／提醒：「咕～咕」 */
export function duohuiHoot(v = 1) {
  if (!throttle('duohui', 1200)) return;
  const c = ready(); if (!c) return;
  try {
    const t = c.currentTime;
    hoo(c, t, 520, 0.22, 0.16 * v);
    hoo(c, t + 0.3, 430, 0.4, 0.18 * v);
  } catch {}
}

/** 多慧說話：每個字一聲輕柔的咕（最多 6 聲），音高依字變化 */
export function duohuiSpeak(text: string, v = 1) {
  if (!throttle('duohui', 1200)) return;
  const c = ready(); if (!c) return;
  try {
    const t = c.currentTime;
    syllables(text, 6).forEach((code, i) => {
      const f = 470 + (code % 7) * 22 - i * 6;
      hoo(c, t + i * 0.13, f, 0.11, 0.11 * v);
    });
  } catch {}
}

// ── 007：機器人 ──
const ROBOT_SCALE = [784, 880, 1047, 1175, 1319, 1568, 1760];
function bleep(c: AudioContext, t: number, f: number, dur: number, peak: number, fEnd?: number) {
  const o = c.createOscillator(); o.type = 'square';
  o.frequency.setValueAtTime(f, t);
  if (fEnd) o.frequency.exponentialRampToValueAtTime(fEnd, t + dur);
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2800;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
  g.gain.setValueAtTime(peak, t + dur * 0.8);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(lp).connect(g).connect(c.destination);
  o.start(t); o.stop(t + dur + 0.03);
}

/** 007 說話：一串方波嗶嗶（最多 8 聲），音高落在固定音階上，像電腦語音 */
export function robotSpeak(text: string, v = 1) {
  if (!throttle('007', 1000)) return;
  const c = ready(); if (!c) return;
  try {
    const t = c.currentTime;
    syllables(text, 8).forEach((code, i) => {
      const f = ROBOT_SCALE[code % ROBOT_SCALE.length];
      bleep(c, t + i * 0.075, f, 0.05, 0.045 * v);
    });
  } catch {}
}

/** 007 雷達掃描：「叮～」加一聲回音 */
export function robotPing(v = 1) {
  if (!throttle('007-ping', 1500)) return;
  const c = ready(); if (!c) return;
  try {
    const t = c.currentTime;
    for (const [dt, peak] of [[0, 0.12], [0.28, 0.04]] as const) {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(1480, t + dt);
      const g = c.createGain(); env(g, t + dt, peak * v, 0.004, 0.75);
      o.connect(g).connect(c.destination); o.start(t + dt); o.stop(t + dt + 0.8);
    }
  } catch {}
}

/** 007 發現目標：「嗶、嗶、嗶↑」 */
export function robotFound(v = 1) {
  if (!throttle('007', 1000)) return;
  const c = ready(); if (!c) return;
  try {
    const t = c.currentTime;
    bleep(c, t, 1047, 0.07, 0.05 * v);
    bleep(c, t + 0.1, 1319, 0.07, 0.05 * v);
    bleep(c, t + 0.2, 1568, 0.16, 0.055 * v, 2093);
  } catch {}
}

/** 007 啟動：由低到高的掃頻 */
export function robotBoot(v = 1) {
  if (!throttle('007', 1000)) return;
  const c = ready(); if (!c) return;
  try {
    const t = c.currentTime;
    bleep(c, t, 330, 0.22, 0.035 * v, 1320);
    bleep(c, t + 0.26, 1568, 0.06, 0.04 * v);
  } catch {}
}

// ── 白喵：貓 ──
/** 「喵～」：鋸齒波聲帶，音高先升後降，共振峰從「i」滑到「a」再到「u」 */
export function meow(v = 1) {
  if (!throttle('baimiao', 1500)) return;
  const c = ready(); if (!c) return;
  try {
    const t = c.currentTime;
    const dur = 0.5;
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(560, t);
    o.frequency.linearRampToValueAtTime(820, t + dur * 0.35);
    o.frequency.exponentialRampToValueAtTime(480, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32 * v, t + 0.04);
    g.gain.setValueAtTime(0.32 * v, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const out = c.createGain(); out.gain.value = 0.5;
    const formants: Array<[number, number, number, number]> = [
      // 起點 → 中段 → 結尾 頻率、Q
      [2600, 1300, 900, 9],
      [3300, 2300, 1500, 11],
    ];
    for (const [f0, f1, f2, q] of formants) {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q;
      bp.frequency.setValueAtTime(f0, t);
      bp.frequency.linearRampToValueAtTime(f1, t + dur * 0.45);
      bp.frequency.linearRampToValueAtTime(f2, t + dur);
      g.connect(bp).connect(out);
    }
    o.connect(g); out.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.05);
  } catch {}
}
