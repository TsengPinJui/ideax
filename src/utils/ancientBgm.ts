// 江南古風背景雅樂合成引擎（古箏撥弦、竹笛悠揚、古琴低音與空靈泛音，五聲宮調式：宮商角徵羽）

class AncientJiangnanBgmEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying = false;
  private isMuted = false;
  private schedulerTimer: number | null = null;
  private stepIndex = 0;
  private unlockHandler: (() => void) | null = null;

  // D 宮五聲音階頻率表 (D, E, F#, A, B) 跨三個八度
  private readonly scaleFreqs = [
    146.83, // D3 (古琴低音)
    164.81, // E3
    185.00, // F#3
    220.00, // A3
    246.94, // B3
    293.66, // D4 (中音古箏)
    329.63, // E4
    369.99, // F#4
    440.00, // A4
    493.88, // B4
    587.33, // D5 (高音古箏 / 竹笛)
    659.25, // E5
    739.99, // F#5
    880.00, // A5
  ];

  // 古風旋律樂句（索引對應 scaleFreqs，-1 代表休止留白）
  private readonly melodyPattern = [
    9, 8, 7, 5, 7, 8, -1, 5,
    6, 7, 8, 9, 11, 9, 8, -1,
    10, 9, 8, 7, 5, 6, 7, -1,
    8, 7, 6, 5, 3, 5, 5, -1,
  ];

  // 古箏伴奏分解和弦琶音
  private readonly arpeggioPattern = [
    [0, 3, 5, 7, 8],
    [3, 5, 8, 9, 10],
    [1, 4, 6, 8, 9],
    [0, 3, 5, 8, 5],
  ];

  public start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.stepIndex = 0;

    this.initContext();
    this.setupAutoUnlock();

    if (this.schedulerTimer !== null) {
      window.clearInterval(this.schedulerTimer);
    }
    // 先輕撥一串迎賓古箏泛音
    this.triggerWelcomeGlissando();

    // 每 680ms 推進一拍（約 88 BPM 舒緩山水慢板）
    this.schedulerTimer = window.setInterval(() => {
      if (!this.isPlaying || this.isMuted) return;
      this.playStep();
    }, 680);
  }

  public stop() {
    this.isPlaying = false;
    if (this.schedulerTimer !== null) {
      window.clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    this.removeAutoUnlock();
    if (this.ctx && this.masterGain) {
      try {
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setTargetAtTime(0.0001, now, 0.25);
      } catch {
        // ignore
      }
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(muted ? 0.0001 : 0.24, now, 0.18);
    if (!muted && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0.0001 : 0.24;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private setupAutoUnlock() {
    this.removeAutoUnlock();
    const unlock = () => {
      if (!this.ctx) this.initContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          this.triggerWelcomeGlissando();
        }).catch(() => {});
      }
      if (this.ctx && this.ctx.state === 'running') {
        this.removeAutoUnlock();
      }
    };
    this.unlockHandler = unlock;
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  private removeAutoUnlock() {
    if (this.unlockHandler) {
      window.removeEventListener('pointerdown', this.unlockHandler);
      window.removeEventListener('keydown', this.unlockHandler);
      this.unlockHandler = null;
    }
  }

  // 入圖時輕柔古箏流水刮奏（五聲上行泛音）
  private triggerWelcomeGlissando() {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running' || this.isMuted) return;
    const indices = [5, 6, 7, 8, 9, 10, 11];
    indices.forEach((scaleIdx, i) => {
      const freq = this.scaleFreqs[scaleIdx];
      this.pluckGuzheng(freq, this.ctx!.currentTime + i * 0.09, 0.14, 2.2);
    });
  }

  private playStep() {
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
      return;
    }

    const now = this.ctx.currentTime;
    const step = this.stepIndex++;
    const barIdx = Math.floor(step / 8) % this.arpeggioPattern.length;
    const beatInBar = step % 8;

    // 1. 每小節首拍與第 4 拍：古琴渾厚低音與古箏琶音
    const chord = this.arpeggioPattern[barIdx];
    if (beatInBar === 0) {
      const bassFreq = this.scaleFreqs[chord[0]];
      this.pluckGuzheng(bassFreq, now, 0.22, 3.8);
      // 輕柔琶音滾拂
      chord.slice(1, 4).forEach((idx, i) => {
        this.pluckGuzheng(this.scaleFreqs[idx], now + (i + 1) * 0.11, 0.11, 2.4);
      });
    } else if (beatInBar === 4) {
      const midFreq = this.scaleFreqs[chord[1]];
      this.pluckGuzheng(midFreq, now, 0.15, 2.8);
    } else if (beatInBar % 2 === 1) {
      const pickIdx = chord[(beatInBar + barIdx) % chord.length];
      this.pluckGuzheng(this.scaleFreqs[pickIdx], now, 0.09, 1.9);
    }

    // 2. 主旋律：古箏揉弦與江南竹笛交替吟唱
    const melNoteIdx = this.melodyPattern[step % this.melodyPattern.length];
    if (melNoteIdx >= 0) {
      const melFreq = this.scaleFreqs[melNoteIdx];
      this.pluckGuzheng(melFreq, now + 0.02, 0.2, 2.6, true);

      // 長音處疊加溫潤竹笛氣音長韻
      if (beatInBar === 0 || beatInBar === 2 || beatInBar === 5) {
        this.playBambooFlute(melFreq, now + 0.05, 0.085, 1.35);
      }
    }

    // 3. 偶爾點綴空靈玉磬/泛音（營造雲霧山水仙境感）
    if (beatInBar === 6 && barIdx % 2 === 1) {
      const chimeFreq = this.scaleFreqs[10 + (barIdx % 3)];
      this.playJadeChime(chimeFreq, now + 0.15, 0.06);
    }
  }

  // 古箏撥弦音色合成（帶木質共鳴濾波與揉弦微顫音）
  private pluckGuzheng(
    freq: number,
    startTime: number,
    volume: number,
    duration: number,
    withVibrato = false,
  ) {
    if (!this.ctx || !this.masterGain) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(freq, startTime);
    osc2.frequency.setValueAtTime(freq * 2, startTime); // 二倍頻泛音增加絲竹清脆感

    if (withVibrato) {
      // 古箏經典「揉弦」微幅音高波動
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(4.8, startTime + 0.18);
      lfoGain.gain.setValueAtTime(0, startTime);
      lfoGain.gain.linearRampToValueAtTime(freq * 0.008, startTime + 0.35);
      lfoGain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfo.start(startTime);
      lfo.stop(startTime + duration);
    }

    // 撥弦瞬間明亮，隨後轉為溫潤木質共鳴
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 5.5, startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(280, freq * 1.35), startTime + duration * 0.75);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.016);
    gain.gain.exponentialRampToValueAtTime(volume * 0.32, startTime + 0.28);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    const harmonicGain = this.ctx.createGain();
    harmonicGain.gain.setValueAtTime(0.28, startTime);
    harmonicGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.35);

    osc1.connect(filter);
    osc2.connect(harmonicGain);
    harmonicGain.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
  }

  // 江南竹笛（Dizi）溫潤悠揚長音
  private playBambooFlute(freq: number, startTime: number, volume: number, duration: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    subOsc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);
    subOsc.frequency.setValueAtTime(freq, startTime);

    // 竹笛呼吸顫音
    const vibrato = this.ctx.createOscillator();
    const vibGain = this.ctx.createGain();
    vibrato.frequency.setValueAtTime(5.2, startTime);
    vibGain.gain.setValueAtTime(0, startTime);
    vibGain.gain.linearRampToValueAtTime(freq * 0.006, startTime + 0.3);
    vibrato.connect(vibGain);
    vibGain.connect(osc.frequency);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.4, startTime);
    filter.Q.value = 1.2;

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.22);
    gain.gain.setValueAtTime(volume * 0.85, startTime + duration * 0.65);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    subOsc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    vibrato.start(startTime);
    osc.start(startTime);
    subOsc.start(startTime);
    vibrato.stop(startTime + duration);
    osc.stop(startTime + duration);
    subOsc.stop(startTime + duration);
  }

  // 玉磬 / 古鐘空靈泛音
  private playJadeChime(freq: number, startTime: number, volume: number) {
    if (!this.ctx || !this.masterGain) return;
    const duration = 2.8;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }
}

export const ancientJiangnanBgm = new AncientJiangnanBgmEngine();
