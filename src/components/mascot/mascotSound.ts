/**
 * 小燈泡音效：全部用 Web Audio 即時合成（不需下載音檔），走燈泡的材質感：
 * - 說話：輕敲玻璃的「叮」（玻璃叮噹）
 * - 發亮：「喀」開關 → 燈絲暖起來「嗡～」→ 玻璃閃亮
 * - 驚嚇：觸電「滋啪」，燈光亂閃時零星「滋、滋」
 * - 撞擊：玻璃「哐當」，撞得越用力越大聲
 * 瀏覽器規定要使用者互動後才能出聲，第一次點擊網頁時解鎖。
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

/** 在使用者第一次互動時呼叫，讓之後的音效可以播放 */
export function unlockMascotAudio() {
  getCtx();
}

function ready(): AudioContext | null {
  const c = getCtx();
  return c && c.state === 'running' && !document.hidden ? c : null;
}

// ── 基本元件 ──
function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function tone(c: AudioContext, t: number, type: OscillatorType, f: number, peak: number, attack: number, decay: number, dest: AudioNode = c.destination) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  env(g, t, peak, attack, decay);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + attack + decay + 0.05);
}

let noiseBuf: AudioBuffer | null = null;
function noise(c: AudioContext, t: number, dur: number, freq: number, q: number, peak: number, type: BiquadFilterType = 'bandpass', dest: AudioNode = c.destination) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.5), c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  env(g, t, peak, 0.002, dur);
  s.connect(f).connect(g).connect(dest);
  s.start(t);
  s.stop(t + dur + 0.05);
}

/** 敲玻璃：基音＋玻璃特有的不和諧泛音（2.76 倍、5.4 倍），高泛音衰減較快 */
function glassTink(c: AudioContext, t: number, f: number, v: number) {
  tone(c, t, 'sine', f, 0.09 * v, 0.003, 0.17);
  tone(c, t, 'sine', f * 2.76, 0.032 * v, 0.002, 0.09);
  tone(c, t, 'sine', f * 5.4, 0.012 * v, 0.002, 0.05);
}

// ── 發亮：開燈 ──
let lastGlow = 0;
export function playGlowSound(volume = 1) {
  const now = performance.now();
  if (now - lastGlow < 700) return; // 連續亮起時不要一直響
  lastGlow = now;
  const c = ready();
  if (!c) return;
  try {
    const t = c.currentTime;
    noise(c, t, 0.012, 2600, 0.8, 0.22 * volume, 'highpass'); // 喀：開關
    noise(c, t + 0.018, 0.008, 1800, 1.2, 0.12 * volume);
    const lp = c.createBiquadFilter(); // 燈絲暖起來：嗡～
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(260, t + 0.03);
    lp.frequency.exponentialRampToValueAtTime(1700, t + 0.38);
    const s = c.createOscillator();
    s.type = 'sawtooth';
    s.frequency.value = 120;
    const sg = c.createGain();
    sg.gain.setValueAtTime(0.0001, t + 0.03);
    sg.gain.exponentialRampToValueAtTime(0.06 * volume, t + 0.2);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    s.connect(lp).connect(sg).connect(c.destination);
    s.start(t + 0.03);
    s.stop(t + 0.65);
    [1568, 2093].forEach((f, i) => glassTink(c, t + 0.26 + i * 0.07, f, volume * 1.4)); // 玻璃閃亮
    tone(c, t + 0.34, 'sine', 3136, 0.03 * volume, 0.004, 0.4);
  } catch {}
}

// ── 說話：玻璃叮噹，跟逐字出現的文字同步 ──
let babbleTimers: number[] = [];
export function stopBabble() {
  babbleTimers.forEach((t) => window.clearTimeout(t));
  babbleTimers = [];
}

/** 依文字與總時長安排說話音節（音高依文字決定，遇到標點停頓） */
export function playBabble(ms: number, text = '', volume = 1) {
  stopBabble();
  const c = getCtx();
  if (!c || c.state !== 'running' || ms <= 0) return;
  const chars = text ? Array.from(text) : Array.from({ length: Math.max(3, Math.round(ms / 85)) }, () => String.fromCharCode(0x4e00 + Math.floor(Math.random() * 2000)));
  const step = ms / Math.max(1, chars.length); // 每個字出現的時間點（和逐字出現同步）
  const every = Math.max(1, Math.ceil(80 / step)); // 字太快時隔幾個字才響一次（每聲至少間隔 80ms）
  chars.forEach((ch, i) => {
    if (i % every !== 0) return;
    if (/[\s，。、！？!?,.：:；;（）()「」『』…~～\-—]/.test(ch)) return; // 標點：停頓
    const code = ch.codePointAt(0) || 0;
    const freq = 1050 + (code % 13) * 45 + (i % 3) * 20; // 1050～1630Hz，依字變化
    const t = window.setTimeout(() => {
      const cc = ready();
      if (!cc) return;
      try { glassTink(cc, cc.currentTime + 0.001, freq, volume); } catch {}
    }, i * step);
    babbleTimers.push(t);
  });
}

// ── 驚嚇：觸電 ──
function buzz(c: AudioContext, t: number, dur: number, peak: number) {
  const o = c.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(110 + Math.random() * 40, t);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1800;
  bp.Q.value = 1.2;
  const g = c.createGain();
  env(g, t, peak, 0.004, dur);
  o.connect(bp).connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

let lastShock = 0;
/** 剛嚇到：一聲較大的「滋啪」 */
export function playShock(volume = 1) {
  const now = performance.now();
  if (now - lastShock < 1500) return;
  lastShock = now;
  const c = ready();
  if (!c) return;
  try {
    const t = c.currentTime;
    for (let i = 0; i < 6; i++) noise(c, t + i * 0.035 + Math.random() * 0.015, 0.018, 2600 + Math.random() * 1800, 1.4, (0.09 - i * 0.008) * volume);
    buzz(c, t, 0.26, 0.07 * volume);
    noise(c, t + 0.24, 0.03, 900, 0.7, 0.08 * volume); // 啪
  } catch {}
}

let lastZap = 0;
/** 驚嚇中燈光閃一下：零星「滋」 */
export function playZap(volume = 1) {
  const now = performance.now();
  if (now - lastZap < 180 || Math.random() > 0.45) return;
  lastZap = now;
  const c = ready();
  if (!c) return;
  try {
    const t = c.currentTime;
    noise(c, t, 0.02 + Math.random() * 0.02, 2800 + Math.random() * 1500, 1.3, 0.05 * volume);
    if (Math.random() < 0.4) buzz(c, t, 0.06, 0.03 * volume);
  } catch {}
}

// ── 撞擊：玻璃哐當 ──
let lastClank = 0;
/** speed：撞擊速度（px/s），越快越大聲 */
export function playClank(speed: number, volume = 1) {
  const now = performance.now();
  if (now - lastClank < 120) return;
  lastClank = now;
  const c = ready();
  if (!c) return;
  try {
    const k = Math.min(1, Math.max(0.25, (speed - 420) / 2200 + 0.25));
    const t = c.currentTime;
    const base = 520 + Math.random() * 120 - k * 80;
    noise(c, t, 0.03, 300, 0.7, 0.12 * k * volume, 'lowpass'); // 咚：撞到的悶聲
    [1, 2.32, 3.91, 5.4].forEach((m, i) => tone(c, t + 0.004 * i, 'sine', base * m, (0.11 - i * 0.022) * k * volume, 0.002, 0.35 - i * 0.07)); // 哐：玻璃共鳴
    tone(c, t + 0.06, 'sine', base * 2.76 * 1.5, 0.03 * k * volume, 0.002, 0.18); // 當：餘音
  } catch {}
}

// ── 驚嚇期間：持續的電流聲（燈絲嗡嗡＋不穩定抖動），不嚇了就停 ──
let currentStop: (() => void) | null = null;
let currentSafety = 0;
export function startCurrent(volume = 1) {
  if (currentStop) return;
  const c = ready();
  if (!c) return;
  try {
    const t = c.currentTime;
    const out = c.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.03 * volume, t + 0.08);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const a = c.createOscillator(); a.type = 'sawtooth'; a.frequency.value = 120; // 台灣市電 60Hz → 燈絲 120Hz
    const b = c.createOscillator(); b.type = 'square'; b.frequency.value = 240;
    const bg = c.createGain(); bg.gain.value = 0.35;
    // 不穩定的抖動：用低頻振盪器調整音量，聽起來像電流忽強忽弱
    const trem = c.createGain(); trem.gain.value = 1;
    const lfo = c.createOscillator(); lfo.type = 'triangle'; lfo.frequency.value = 9;
    const depth = c.createGain(); depth.gain.value = 0.45;
    lfo.connect(depth).connect(trem.gain);
    a.connect(lp); b.connect(bg).connect(lp); lp.connect(trem).connect(out).connect(c.destination);
    a.start(t); b.start(t); lfo.start(t);
    currentStop = () => {
      const n = c.currentTime;
      try {
        out.gain.cancelScheduledValues(n);
        out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), n);
        out.gain.exponentialRampToValueAtTime(0.0001, n + 0.15);
        [a, b, lfo].forEach((o) => o.stop(n + 0.2));
      } catch {}
    };
    window.clearTimeout(currentSafety);
    currentSafety = window.setTimeout(() => stopCurrent(), 10000); // 保險：最多響 10 秒
  } catch {}
}
export function stopCurrent() {
  window.clearTimeout(currentSafety);
  if (currentStop) { currentStop(); currentStop = null; }
}

// ── 波浪舞：配合舞步的輕快小曲 ──
// 一拍 300ms（和舞步同一個節拍）。波浪從左手傳到右手時旋律往上爬，傳回來時往下走；
// 旋律用玻璃叮噹的音色，底下有輕輕的大鼓、低音和沙沙的小鈸，最後一拍收在一個亮晶晶的和弦。
let danceOut: GainNode | null = null;
let danceTimer: number | null = null;

export function stopDanceMusic() {
  danceUntil = 0;
  if (danceTimer) { window.clearTimeout(danceTimer); danceTimer = null; }
  const g = danceOut;
  danceOut = null;
  if (!g || !ctx) return;
  try {
    const t = ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(0, t + 0.12);
    window.setTimeout(() => { try { g.disconnect(); } catch {} }, 200);
  } catch {}
}

let danceUntil = 0; // 跳舞期間不另外播「開心」音效，避免和音樂疊在一起

export function playDanceMusic(ms: number, beatMs = 300, volume = 1) {
  stopDanceMusic();
  const c = getCtx();
  if (!c || ms <= 0 || document.hidden) return;
  danceUntil = performance.now() + ms;
  // 音訊還在暫停（剛點下去、手機切回來）：等它恢復再開始，不要直接沒聲音
  if (c.state !== 'running') {
    void c.resume().then(() => { if (performance.now() < danceUntil - 300) startDance(c, danceUntil - performance.now(), beatMs, volume); }).catch(() => {});
    return;
  }
  startDance(c, ms, beatMs, volume);
}

function startDance(c: AudioContext, ms: number, beatMs: number, volume: number) {
  try {
    const out = c.createGain();
    out.gain.value = volume;
    out.connect(c.destination);
    danceOut = out;
    const B = beatMs / 1000;
    const t0 = c.currentTime + 0.04;
    const beats = Math.max(4, Math.floor(ms / beatMs));
    // C 大調五聲音階：上行（波浪傳過去）、下行（傳回來）
    const UP = [523.25, 587.33, 659.25, 783.99];
    const DOWN = [880, 783.99, 659.25, 587.33];
    const BASS = [130.81, 110, 87.31, 98]; // C、A、F、G，每 8 拍換一次
    for (let i = 0; i < beats - 1; i++) {
      const t = t0 + i * B;
      const phrase = Math.floor(i / 4) % 2 === 0 ? UP : DOWN;
      const f = phrase[i % 4];
      // 旋律：玻璃叮噹
      tone(c, t, 'sine', f, 0.075, 0.004, 0.22, out);
      tone(c, t, 'sine', f * 2.76, 0.022, 0.002, 0.1, out);
      // 拍子：每兩拍一下大鼓＋低音，反拍沙沙小鈸
      if (i % 2 === 0) {
        const k = c.createOscillator(); const kg = c.createGain();
        k.type = 'sine'; k.frequency.setValueAtTime(150, t); k.frequency.exponentialRampToValueAtTime(48, t + 0.16);
        env(kg, t, 0.2, 0.003, 0.2);
        k.connect(kg).connect(out); k.start(t); k.stop(t + 0.25);
        tone(c, t, 'triangle', BASS[Math.floor(i / 8) % 4], 0.07, 0.01, B * 1.6, out);
      }
      noise(c, t + B / 2, 0.04, 8000, 0.8, 0.018, 'highpass', out);
    }
    // 收尾：亮晶晶的 C 和弦
    const end = t0 + (beats - 1) * B;
    [1046.5, 1318.5, 1568, 2093].forEach((f, i) => tone(c, end + i * 0.035, 'sine', f, 0.05, 0.004, 0.55, out));
    danceTimer = window.setTimeout(() => {
      danceTimer = null;
      if (danceOut === out) { danceOut = null; try { out.disconnect(); } catch {} }
    }, ms + 900);
  } catch {}
}

// ── 開心：玻璃風鈴「叮叮叮↑」 ──
let happyAt = -Infinity;
/** 小燈泡開心亮起來：三個往上爬的玻璃叮噹，最後一顆亮晶晶（跳舞中不播；2.5 秒內不重複） */
export function playHappySound(volume = 1) {
  const now = performance.now();
  if (now < danceUntil || now - happyAt < 2500) return;
  const c = getCtx();
  if (!c || document.hidden) return;
  happyAt = now;
  const go = () => {
    try {
      const t = c.currentTime + 0.01;
      [1046.5, 1318.5, 1568].forEach((f, i) => glassTink(c, t + i * 0.085, f, volume * 1.05));
      tone(c, t + 0.26, 'sine', 2093, 0.05 * volume, 0.004, 0.45);
      tone(c, t + 0.26, 'sine', 3136, 0.018 * volume, 0.003, 0.3);
    } catch {}
  };
  if (c.state === 'running') go(); else void c.resume().then(go).catch(() => {});
}
