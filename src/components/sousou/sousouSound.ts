/**
 * 搜搜的音效：全部用 Web Audio 即時合成（不需要音檔）
 * - poof：筋斗雲冒出來的「噗」
 * - whoosh：起飛的「咻」
 * - wind：飛行中的風聲（持續，停止時淡出）
 * - found：找到職缺的叮叮叮
 * - land：降落的輕輕「咚」
 * 瀏覽器規定要使用者互動後才能出聲；搜尋是點按鈕或按 Enter 觸發的，所以可以播放。
 */
let ctx: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    return ctx.state === 'running' || ctx.state === 'suspended' ? ctx : null;
  } catch {
    return null;
  }
}

function noise(c: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 1, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function env(g: GainNode, t: number, peak: number, a: number, d: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

function tone(c: AudioContext, t: number, f: number, peak: number, a: number, d: number, type: OscillatorType = 'sine', fEnd?: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (fEnd) o.frequency.exponentialRampToValueAtTime(fEnd, t + a + d);
  env(g, t, peak, a, d);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + a + d + 0.05);
}

function burstNoise(c: AudioContext, t: number, dur: number, type: BiquadFilterType, f0: number, f1: number, peak: number, q = 0.8) {
  const s = c.createBufferSource();
  s.buffer = noise(c);
  const f = c.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = c.createGain();
  env(g, t, peak, Math.min(0.08, dur * 0.3), dur);
  s.connect(f).connect(g).connect(c.destination);
  s.start(t);
  s.stop(t + dur + 0.1);
}

export function sousouPoof(v = 1) {
  const c = getCtx(); if (!c) return;
  const t = c.currentTime;
  burstNoise(c, t, 0.35, 'lowpass', 1400, 300, 0.22 * v);
  tone(c, t, 150, 0.12 * v, 0.01, 0.25, 'sine', 70);
}

export function sousouWhoosh(v = 1) {
  const c = getCtx(); if (!c) return;
  const t = c.currentTime;
  burstNoise(c, t, 0.75, 'bandpass', 380, 2600, 0.18 * v, 1.2);
}

let windNodes: { src: AudioBufferSourceNode; gain: GainNode; lfo: OscillatorNode } | null = null;
export function sousouWindStart(v = 1) {
  const c = getCtx(); if (!c || windNodes) return;
  const t = c.currentTime;
  const src = c.createBufferSource(); src.buffer = noise(c); src.loop = true;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 0.9;
  const lfo = c.createOscillator(); lfo.frequency.value = 0.35;
  const depth = c.createGain(); depth.gain.value = 280;
  lfo.connect(depth).connect(bp.frequency);
  const gain = c.createGain(); gain.gain.setValueAtTime(0.0001, t); gain.gain.exponentialRampToValueAtTime(0.035 * v, t + 0.6);
  src.connect(bp).connect(gain).connect(c.destination);
  src.start(t); lfo.start(t);
  windNodes = { src, gain, lfo };
}
export function sousouWindStop() {
  const c = getCtx(); if (!c || !windNodes) return;
  const { src, gain, lfo } = windNodes; windNodes = null;
  const t = c.currentTime;
  try {
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    src.stop(t + 0.55); lfo.stop(t + 0.55);
  } catch {}
}

export function sousouFound(v = 1) {
  const c = getCtx(); if (!c) return;
  const t = c.currentTime;
  [1046.5, 1318.5, 1568, 2093].forEach((f, i) => {
    tone(c, t + i * 0.09, f, 0.07 * v, 0.004, 0.35);
    tone(c, t + i * 0.09, f * 2.76, 0.02 * v, 0.003, 0.15);
  });
}

export function sousouLand(v = 1) {
  const c = getCtx(); if (!c) return;
  const t = c.currentTime;
  tone(c, t, 110, 0.14 * v, 0.01, 0.2, 'sine', 60);
  burstNoise(c, t + 0.05, 0.3, 'lowpass', 900, 250, 0.12 * v);
}

export function playSousouSound(name: string, v = 1) {
  if (name === 'poof') sousouPoof(v);
  else if (name === 'whoosh') sousouWhoosh(v);
  else if (name === 'found') sousouFound(v);
  else if (name === 'land') sousouLand(v);
}
