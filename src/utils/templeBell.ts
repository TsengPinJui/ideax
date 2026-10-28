/**
 * 寺廟銅鐘聲（Web Audio 合成，不用音檔）：
 * 低沉的基音＋幾個不成整數倍的泛音（銅鐘特有的「嗡～」），各自帶一點點走音產生拍頻，敲擊瞬間加一點噪音當「噹」
 * 給「夜半鐘聲到客船」彩蛋用：敲兩下，餘音慢慢散去
 */
let ctx: AudioContext | null = null;

function strike(ac: AudioContext, t0: number, gainScale = 1) {
  const master = ac.createGain();
  master.gain.value = 0.5 * gainScale;
  // 一點點殘響感：短延遲回授
  const delay = ac.createDelay(1);
  delay.delayTime.value = 0.23;
  const fb = ac.createGain();
  fb.gain.value = 0.28;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1800;
  master.connect(lp);
  lp.connect(ac.destination);
  lp.connect(delay);
  delay.connect(fb);
  fb.connect(delay);
  delay.connect(ac.destination);

  const base = 98; // 約 G2，低沉的大鐘
  const partials: [number, number, number][] = [
    // [頻率倍數, 音量, 衰減秒數]
    [0.5, 0.35, 7.5], // hum
    [1.0, 0.9, 6.5],
    [1.19, 0.35, 5.0],
    [1.5, 0.3, 4.2],
    [2.0, 0.42, 4.0],
    [2.74, 0.28, 3.0],
    [3.76, 0.18, 2.2],
    [5.4, 0.1, 1.4],
  ];
  for (const [ratio, vol, dec] of partials) {
    for (const detune of [-0.6, 0.6]) {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(base * ratio + detune * ratio * 0.5, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol * 0.5, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dec);
      o.connect(g);
      g.connect(master);
      o.start(t0);
      o.stop(t0 + dec + 0.1);
    }
  }
  // 撞木敲下去的「噹」：短促帶通噪音
  const len = Math.floor(ac.sampleRate * 0.08);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const n = ac.createBufferSource();
  n.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 900;
  bp.Q.value = 1.2;
  const ng = ac.createGain();
  ng.gain.value = 0.35;
  n.connect(bp);
  bp.connect(ng);
  ng.connect(master);
  n.start(t0);
}

/** 敲鐘（預設兩下） */
export function playTempleBell(times = 2) {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    if (!ctx || ctx.state === 'closed') ctx = new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime + 0.05;
    for (let k = 0; k < times; k++) strike(ctx, now + k * 2.6, k === 0 ? 1 : 0.8);
  } catch {
    // 瀏覽器不允許播放就算了
  }
}
