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
