/**
 * 實境漫遊的環境音（全部用 Web Audio 即時合成，不用下載音檔）：
 * - 白天、黃昏天氣好：鳥鳴（偶爾幾聲啾啾）
 * - 夜晚天氣好：蟲鳴（蟋蟀一陣一陣），靠近水邊還有蛙鳴
 * - 下雨：細雨沙沙聲
 * - 水邊：輕輕的水波聲（離水越近越清楚）
 * - 風：一直有一點點，越高（登塔、山上）風越大
 * 跟背景音樂共用同一個聲音開關
 */

export interface AmbienceState {
  tod: 'day' | 'dusk' | 'night';
  weather: 'clear' | 'rain';
  /** 0..1：離水邊多近 */
  water: number;
  /** 玩家所在高度（公尺） */
  height: number;
  /** 室內（地下展廳、樓裡）時環境音變小 */
  indoor: boolean;
}

function noiseBuffer(ctx: AudioContext, seconds = 3) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  // 粉紅雜訊（比白雜訊柔和）
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
  }
  return buf;
}

class KingdomAmbience {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private water: GainNode | null = null;
  private wind: GainNode | null = null;
  private rain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private muted = false;
  private running = false;
  private state: AmbienceState = { tod: 'dusk', weather: 'clear', water: 0, height: 0, indoor: false };
  private nextBird = 0;
  private nextCricket = 0;
  private nextFrog = 0;
  private timer: number | null = null;
  private noise: AudioBuffer | null = null;
  private unlock: (() => void) | null = null;

  start() {
    if (this.running) return;
    this.running = true;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch {
      return;
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.0001;
    this.master.connect(ctx.destination);
    const noise = noiseBuffer(ctx);
    this.noise = noise;
    const loop = (filterType: BiquadFilterType, freq: number, q: number) => {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      src.playbackRate.value = 0.9 + Math.random() * 0.2;
      const f = ctx.createBiquadFilter();
      f.type = filterType;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(f).connect(g).connect(this.master!);
      src.start();
      return { g, f };
    };
    // 水波：低通、加上緩慢起伏
    const w = loop('lowpass', 520, 0.7);
    this.water = w.g;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.18;
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(w.f.frequency);
    lfo.start();
    // 風：帶通、頻率慢慢飄
    const wi = loop('bandpass', 380, 0.6);
    this.wind = wi.g;
    this.windFilter = wi.f;
    // 雨：高通的沙沙聲
    this.rain = loop('highpass', 1400, 0.4).g;

    this.unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    };
    window.addEventListener('pointerdown', this.unlock);
    window.addEventListener('keydown', this.unlock);
    window.addEventListener('touchstart', this.unlock);
    this.unlock();
    this.timer = window.setInterval(() => this.tick(), 250);
    this.applyMaster();
  }

  stop() {
    this.running = false;
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
    if (this.unlock) {
      window.removeEventListener('pointerdown', this.unlock);
      window.removeEventListener('keydown', this.unlock);
      window.removeEventListener('touchstart', this.unlock);
    }
    this.unlock = null;
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.master = this.water = this.wind = this.rain = null;
  }

  /** 腳步聲：石板清脆、草地沙沙、木板悶悶的 */
  step(surface: 'stone' | 'grass' | 'wood', run: boolean) {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noise || this.muted || ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.005;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.5;
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    const vol = (run ? 1.3 : 1) * (surface === 'grass' ? 0.16 : surface === 'wood' ? 0.22 : 0.2);
    if (surface === 'stone') {
      f.type = 'bandpass';
      f.frequency.value = 1500 + Math.random() * 500;
      f.Q.value = 1.2;
    } else if (surface === 'grass') {
      f.type = 'highpass';
      f.frequency.value = 2400 + Math.random() * 800;
    } else {
      f.type = 'bandpass';
      f.frequency.value = 420 + Math.random() * 120;
      f.Q.value = 2.5;
    }
    const dur = surface === 'grass' ? 0.12 : 0.07;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 2, dur + 0.02);
  }

  setMuted(m: boolean) {
    this.muted = m;
    this.applyMaster();
  }

  update(s: AmbienceState) {
    this.state = s;
  }

  private applyMaster() {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.muted || document.hidden ? 0 : 0.9, now, 0.4);
  }

  private tick() {
    const ctx = this.ctx;
    if (!ctx || !this.master || ctx.state !== 'running') return;
    if (document.hidden) {
      this.applyMaster();
      return;
    }
    const s = this.state;
    const now = ctx.currentTime;
    const indoor = s.indoor ? 0.25 : 1;
    const rain = s.weather === 'rain';
    const set = (g: GainNode | null, v: number, tc = 0.8) => g && g.gain.setTargetAtTime(v, now, tc);
    set(this.water, s.water * 0.5 * indoor);
    const high = Math.min(1, Math.max(0, (s.height - 4) / 30));
    set(this.wind, (0.05 + high * 0.35 + (rain ? 0.1 : 0)) * indoor, 1.5);
    if (this.windFilter) this.windFilter.frequency.setTargetAtTime(300 + Math.sin(now * 0.13) * 120 + high * 200, now, 2);
    set(this.rain, rain ? 0.55 * (s.indoor ? 0.35 : 1) : 0, 1.2);
    if (this.muted || s.indoor) return;
    // 鳥鳴（白天多、黃昏少）
    if (!rain && s.tod !== 'night' && now > this.nextBird) {
      this.bird(now);
      this.nextBird = now + (s.tod === 'day' ? 2 : 4.5) + Math.random() * (s.tod === 'day' ? 4 : 7);
    }
    // 蟲鳴、蛙鳴（夜）
    if (!rain && s.tod === 'night') {
      if (now > this.nextCricket) {
        this.cricket(now);
        this.nextCricket = now + 0.8 + Math.random() * 2.2;
      }
      if (s.water > 0.3 && now > this.nextFrog) {
        this.frog(now);
        this.nextFrog = now + 3 + Math.random() * 6;
      }
    }
  }

  private voice(type: OscillatorType, pan: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    const g = ctx.createGain();
    g.gain.value = 0;
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (p) {
      p.pan.value = pan;
      o.connect(g).connect(p).connect(this.master!);
    } else o.connect(g).connect(this.master!);
    return { o, g };
  }

  /** 一串啾啾（3～6 聲往上滑的短音） */
  private bird(t0: number) {
    const pan = Math.random() * 1.6 - 0.8;
    const base = 2600 + Math.random() * 1800;
    const n = 2 + Math.floor(Math.random() * 4);
    const vol = 0.02 + Math.random() * 0.025;
    for (let i = 0; i < n; i++) {
      const t = t0 + i * (0.11 + Math.random() * 0.06);
      const { o, g } = this.voice('sine', pan);
      const f = base * (1 + (Math.random() - 0.5) * 0.15);
      o.frequency.setValueAtTime(f * 0.8, t);
      o.frequency.exponentialRampToValueAtTime(f * 1.25, t + 0.06);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.09);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      o.start(t);
      o.stop(t + 0.12);
    }
  }

  /** 蟋蟀：高頻、幾個快速脈衝一組 */
  private cricket(t0: number) {
    const pan = Math.random() * 1.6 - 0.8;
    const f = 4200 + Math.random() * 600;
    const pulses = 3 + Math.floor(Math.random() * 3);
    const vol = 0.008 + Math.random() * 0.01;
    for (let i = 0; i < pulses; i++) {
      const t = t0 + i * 0.045;
      const { o, g } = this.voice('triangle', pan);
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      o.start(t);
      o.stop(t + 0.035);
    }
  }

  /** 蛙鳴：低沉的「呱呱」 */
  private frog(t0: number) {
    const pan = Math.random() * 1.4 - 0.7;
    const n = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) {
      const t = t0 + i * 0.22;
      const { o, g } = this.voice('square', pan);
      const lp = this.ctx!.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 700;
      o.disconnect();
      o.connect(lp).connect(g);
      o.frequency.setValueAtTime(190, t);
      o.frequency.exponentialRampToValueAtTime(120, t + 0.14);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.03, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.start(t);
      o.stop(t + 0.18);
    }
  }
}

export const kingdomAmbience = new KingdomAmbience();
