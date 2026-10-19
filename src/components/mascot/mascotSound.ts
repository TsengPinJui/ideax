/**
 * 小燈泡發亮音效：用 Web Audio 即時合成（不需下載音檔）
 * 「開燈」的上滑音 + 叮鈴閃亮琶音。瀏覽器規定要使用者互動後才能出聲，第一次點擊網頁時解鎖。
 */
let ctx: AudioContext | null = null;
let last = 0;

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

export function playGlowSound(volume = 0.16) {
  const nowMs = performance.now();
  if (nowMs - last < 700) return; // 連續亮起時不要一直響
  last = nowMs;
  const c = getCtx();
  if (!c || c.state !== 'running') return;
  try {
    const t = c.currentTime;
    const master = c.createGain();
    master.gain.value = volume;
    master.connect(c.destination);

    // 開燈：柔和的上滑音
    const hum = c.createOscillator();
    hum.type = 'sine';
    hum.frequency.setValueAtTime(260, t);
    hum.frequency.exponentialRampToValueAtTime(920, t + 0.16);
    const hg = c.createGain();
    hg.gain.setValueAtTime(0.0001, t);
    hg.gain.exponentialRampToValueAtTime(0.32, t + 0.04);
    hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    hum.connect(hg).connect(master);
    hum.start(t);
    hum.stop(t + 0.28);

    // 發亮：叮鈴閃亮的琶音（C6 E6 G6 C7）
    [1046.5, 1318.5, 1568, 2093].forEach((f, i) => {
      const o = c.createOscillator();
      o.type = i % 2 ? 'triangle' : 'sine';
      o.frequency.value = f;
      const g = c.createGain();
      const st = t + 0.09 + i * 0.055;
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.26 - i * 0.03, st + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.55);
      o.connect(g).connect(master);
      o.start(st);
      o.stop(st + 0.6);
    });
  } catch {}
}

/**
 * 說話音效：類似「嘰哩咕嚕」的短促音節，跟逐字出現的文字同步。
 * 音高依文字決定（同一句話每次聽起來一樣），遇到標點停頓。
 */
let babbleTimers: number[] = [];

export function stopBabble() {
  babbleTimers.forEach((t) => window.clearTimeout(t));
  babbleTimers = [];
}

function blip(c: AudioContext, at: number, freq: number, volume: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(freq, at);
  o.frequency.exponentialRampToValueAtTime(freq * 1.18, at + 0.05);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(volume, at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
  o.connect(g).connect(c.destination);
  o.start(at);
  o.stop(at + 0.08);
}

/** 依文字與總時長安排說話音節（text 可省略，省略時用隨機音高講 ms 毫秒） */
export function playBabble(ms: number, text = '', volume = 0.07) {
  stopBabble();
  const c = getCtx();
  if (!c || c.state !== 'running' || ms <= 0) return;
  const chars = text ? Array.from(text) : Array.from({ length: Math.max(3, Math.round(ms / 85)) }, () => String.fromCharCode(0x4e00 + Math.floor(Math.random() * 2000)));
  const step = ms / Math.max(1, chars.length); // 每個字出現的時間點（和逐字出現同步）
  const every = Math.max(1, Math.ceil(80 / step)); // 字太快時隔幾個字才響一次（每聲至少間隔 80ms），不要像機關槍
  chars.forEach((ch, i) => {
    if (i % every !== 0) return;
    if (/[\s，。、！？!?,.：:；;（）()「」『』…~～\-—]/.test(ch)) return; // 標點：停頓
    const code = ch.codePointAt(0) || 0;
    const freq = 380 + (code % 13) * 28 + (i % 3) * 12; // 380～740Hz，依字變化
    const t = window.setTimeout(() => {
      if (document.hidden) return;
      try { blip(c, c.currentTime + 0.001, freq, volume); } catch {}
    }, i * step);
    babbleTimers.push(t);
  });
}
