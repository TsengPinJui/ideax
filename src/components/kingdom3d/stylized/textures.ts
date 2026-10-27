import * as THREE from 'three';

/**
 * 東方奇幻風格的程序化貼圖（全部用 canvas 即時畫出，不需要下載圖檔）。
 * 同一種貼圖只畫一次並快取；重複使用時共用同一張圖。
 */

const cache = new Map<string, THREE.Texture>();

export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

function toTexture(c: HTMLCanvasElement, opts: { repeat?: boolean; srgb?: boolean } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat !== false) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  t.anisotropy = 4;
  return t;
}

function cached<T extends THREE.Texture>(key: string, make: () => T): T {
  const hit = cache.get(key);
  if (hit) return hit as T;
  const t = make();
  cache.set(key, t);
  return t;
}

const shade = (hex: string, amt: number) => {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
};

function speckle(ctx: CanvasRenderingContext2D, w: number, h: number, count: number, rand: () => number, alpha = 0.08) {
  for (let i = 0; i < count; i++) {
    const v = rand() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * rand()})`;
    const s = 1 + rand() * 2.5;
    ctx.fillRect(rand() * w, rand() * h, s, s);
  }
}

/** 街道石板（交錯排列的長方形石塊） */
export function pavingTexture() {
  return cached('paving', () => {
    const [c, ctx] = makeCanvas(512, 512);
    const rand = seeded(11);
    ctx.fillStyle = '#6f6458';
    ctx.fillRect(0, 0, 512, 512);
    const rowH = 64;
    const tones = ['#b9ab97', '#ad9f8a', '#c4b6a0', '#a8987f', '#bfae95', '#b3a28a'];
    for (let r = 0; r < 512 / rowH; r++) {
      let x = -rand() * 80;
      const y = r * rowH;
      while (x < 512) {
        const w = 70 + rand() * 80;
        const tone = tones[Math.floor(rand() * tones.length)];
        const g = ctx.createLinearGradient(x, y, x + w, y + rowH);
        g.addColorStop(0, shade(tone, 8));
        g.addColorStop(1, shade(tone, -10));
        ctx.fillStyle = g;
        const gap = 3;
        const draw = (ox: number) => {
          ctx.beginPath();
          ctx.roundRect(ox + gap, y + gap, w - gap * 2, rowH - gap * 2, 6);
          ctx.fill();
        };
        draw(x);
        if (x + w > 512) draw(x - 512);
        x += w;
      }
    }
    speckle(ctx, 512, 512, 2600, rand, 0.12);
    // 落花花瓣
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = `rgba(244,${150 + rand() * 40},${180 + rand() * 30},0.8)`;
      ctx.beginPath();
      ctx.ellipse(rand() * 512, rand() * 512, 3, 1.8, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    return toTexture(c);
  });
}

/** 廣場：同心圓石板 + 八方放射線（貼在圓盤上，UV 0~1） */
export function plazaTexture() {
  return cached('plaza', () => {
    const S = 1024;
    const [c, ctx] = makeCanvas(S, S);
    const rand = seeded(23);
    const cx = S / 2;
    ctx.fillStyle = '#7a6d5f';
    ctx.fillRect(0, 0, S, S);
    const rings = 9;
    for (let r = rings; r >= 1; r--) {
      const r0 = ((r - 1) / rings) * (S / 2);
      const r1 = (r / rings) * (S / 2);
      const n = Math.max(8, Math.round((2 * Math.PI * r1) / 70));
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2 + (r % 2) * (Math.PI / n);
        const a1 = ((i + 1) / n) * Math.PI * 2 + (r % 2) * (Math.PI / n);
        const tone = ['#c8b9a2', '#bcae98', '#d2c3ab', '#b4a48b'][Math.floor(rand() * 4)];
        ctx.fillStyle = tone;
        ctx.beginPath();
        ctx.arc(cx, cx, r1 - 3, a0 + 0.012, a1 - 0.012);
        ctx.arc(cx, cx, Math.max(0, r0 + 3), a1 - 0.012, a0 + 0.012, true);
        ctx.closePath();
        ctx.fill();
      }
    }
    // 中心八卦圓紋
    ctx.strokeStyle = 'rgba(122,92,48,0.55)';
    ctx.lineWidth = 10;
    for (const rr of [70, 120, 330]) {
      ctx.beginPath();
      ctx.arc(cx, cx, rr, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.lineWidth = 6;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 120, cx + Math.sin(a) * 120);
      ctx.lineTo(cx + Math.cos(a) * 330, cx + Math.sin(a) * 330);
      ctx.stroke();
    }
    speckle(ctx, S, S, 6000, rand, 0.1);
    return toTexture(c, { repeat: false });
  });
}

export function grassTexture() {
  return cached('grass', () => {
    const [c, ctx] = makeCanvas(256, 256);
    const rand = seeded(5);
    ctx.fillStyle = '#5f7f35';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
      const g = 100 + rand() * 70;
      ctx.fillStyle = `rgba(${60 + rand() * 50},${g},${30 + rand() * 30},0.55)`;
      ctx.fillRect(rand() * 256, rand() * 256, 1.5, 3 + rand() * 4);
    }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = rand() > 0.5 ? 'rgba(250,190,210,0.9)' : 'rgba(255,240,200,0.9)';
      ctx.beginPath();
      ctx.arc(rand() * 256, rand() * 256, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    return toTexture(c);
  });
}

export function rockTexture() {
  return cached('rock', () => {
    const [c, ctx] = makeCanvas(256, 256);
    const rand = seeded(9);
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#8a8478');
    g.addColorStop(1, '#5b564e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = `rgba(${40 + rand() * 40},${40 + rand() * 40},${36 + rand() * 30},0.35)`;
      ctx.beginPath();
      ctx.ellipse(rand() * 256, rand() * 256, 10 + rand() * 30, 4 + rand() * 10, rand() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(30,28,24,0.45)';
    for (let i = 0; i < 26; i++) {
      ctx.lineWidth = 1 + rand() * 1.5;
      ctx.beginPath();
      let x = rand() * 256;
      let y = rand() * 256;
      ctx.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        x += (rand() - 0.5) * 40;
        y += rand() * 30;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // 青苔
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(${80 + rand() * 30},${110 + rand() * 40},${50},0.35)`;
      ctx.beginPath();
      ctx.arc(rand() * 256, rand() * 90, 4 + rand() * 12, 0, Math.PI * 2);
      ctx.fill();
    }
    speckle(ctx, 256, 256, 1500, rand, 0.15);
    return toTexture(c);
  });
}

/** 石砌（橋面、欄杆、台基） */
export function stoneBlockTexture() {
  return cached('stoneBlock', () => {
    const [c, ctx] = makeCanvas(256, 256);
    const rand = seeded(17);
    ctx.fillStyle = '#7c7368';
    ctx.fillRect(0, 0, 256, 256);
    const rowH = 32;
    for (let r = 0; r < 8; r++) {
      let x = r % 2 ? -32 : 0;
      while (x < 256) {
        const w = 56 + rand() * 30;
        const base = 175 + rand() * 25;
        ctx.fillStyle = `rgb(${base},${base - 8},${base - 20})`;
        ctx.fillRect(x + 2, r * rowH + 2, w - 4, rowH - 4);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(x + 2, r * rowH + 2, w - 4, 3);
        x += w;
      }
    }
    speckle(ctx, 256, 256, 1600, rand, 0.12);
    return toTexture(c);
  });
}

/** 石欄板（淺色石材＋內凹框＋簡單雲紋） */
export function balustradeTexture() {
  return cached('balustrade', () => {
    const [c, ctx] = makeCanvas(256, 128);
    const rand = seeded(29);
    ctx.fillStyle = '#d8d0c2';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#c5bcac';
    ctx.fillRect(18, 18, 220, 92);
    ctx.strokeStyle = 'rgba(90,80,66,0.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(18, 18, 220, 92);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(21, 21, 214, 86);
    ctx.strokeStyle = 'rgba(110,98,80,0.5)';
    ctx.lineWidth = 3;
    for (const x of [80, 176]) {
      ctx.beginPath();
      ctx.arc(x, 64, 16, Math.PI * 0.2, Math.PI * 1.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 14, 64, 8, Math.PI, Math.PI * 2.6);
      ctx.stroke();
    }
    speckle(ctx, 256, 128, 900, rand, 0.1);
    return toTexture(c);
  });
}

/** 室內木地板 */
export function woodFloorTexture() {
  return cached('woodFloor', () => {
    const [c, ctx] = makeCanvas(256, 256);
    const rand = seeded(31);
    const plank = 32;
    for (let i = 0; i < 256 / plank; i++) {
      const base = ['#8a5a34', '#7e5230', '#93623a', '#76492a'][Math.floor(rand() * 4)];
      ctx.fillStyle = base;
      ctx.fillRect(0, i * plank, 256, plank);
      ctx.strokeStyle = 'rgba(40,20,8,0.25)';
      for (let k = 0; k < 6; k++) {
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        const y = i * plank + 4 + rand() * (plank - 8);
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(80, y + rand() * 4 - 2, 170, y + rand() * 4 - 2, 256, y);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(30,14,4,0.6)';
      ctx.fillRect(0, i * plank, 256, 2);
      ctx.fillRect(((i * 97) % 256) | 0, i * plank, 2, plank);
    }
    return toTexture(c);
  });
}

/**
 * 建築立面（一開間）：上方彩繪樑枋、中段格柵窗（紙窗）、下段木板裙牆。
 * emissive=true 時只畫出紙窗發光的區域（夜晚窗戶透光用）。
 */
export function facadeTexture(emissive = false, variant = 0) {
  return cached(`facade_${variant}_${emissive ? 'e' : 'c'}`, () => {
    const W = 256;
    const H = 512;
    const [c, ctx] = makeCanvas(W, H);
    const beam = ['#8b1e1e', '#7a2a1c', '#1f4f4a'][variant % 3];
    const wood = ['#5e301b', '#4f2a18', '#563020'][variant % 3];
    const top = 70;
    const winTop = 96;
    const winBot = 316;
    if (emissive) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
    } else {
      // 樑枋彩繪
      ctx.fillStyle = beam;
      ctx.fillRect(0, 0, W, top);
      ctx.fillStyle = '#d4a637';
      ctx.fillRect(0, 6, W, 4);
      ctx.fillRect(0, top - 10, W, 4);
      ctx.fillStyle = '#2f6f68';
      for (let x = 14; x < W; x += 58) {
        ctx.beginPath();
        ctx.ellipse(x + 15, top / 2, 22, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e9c46a';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.fillStyle = wood;
      ctx.fillRect(0, top, W, H - top);
    }
    // 紙窗
    const paper = emissive ? '#ffb45a' : '#f1d9a8';
    ctx.fillStyle = paper;
    ctx.fillRect(18, winTop, W - 36, winBot - winTop);
    if (!emissive) {
      const g = ctx.createLinearGradient(0, winTop, 0, winBot);
      g.addColorStop(0, 'rgba(255,240,200,0.0)');
      g.addColorStop(1, 'rgba(160,110,50,0.25)');
      ctx.fillStyle = g;
      ctx.fillRect(18, winTop, W - 36, winBot - winTop);
    }
    // 格柵
    ctx.strokeStyle = emissive ? '#000' : '#3d2213';
    ctx.lineWidth = 5;
    for (let x = 18; x <= W - 18; x += 22) {
      ctx.beginPath();
      ctx.moveTo(x, winTop);
      ctx.lineTo(x, winBot);
      ctx.stroke();
    }
    for (let y = winTop; y <= winBot; y += 22) {
      ctx.beginPath();
      ctx.moveTo(18, y);
      ctx.lineTo(W - 18, y);
      ctx.stroke();
    }
    ctx.lineWidth = 12;
    ctx.strokeRect(18, winTop, W - 36, winBot - winTop);
    if (!emissive) {
      // 裙板
      ctx.strokeStyle = 'rgba(20,8,2,0.6)';
      ctx.lineWidth = 6;
      ctx.strokeRect(22, winBot + 26, W - 44, H - winBot - 50);
      ctx.strokeStyle = 'rgba(212,166,55,0.45)';
      ctx.lineWidth = 2;
      ctx.strokeRect(36, winBot + 40, W - 72, H - winBot - 78);
      // 兩側柱
      ctx.fillStyle = '#9c2a22';
      ctx.fillRect(0, top, 10, H - top);
      ctx.fillRect(W - 10, top, 10, H - top);
    }
    return toTexture(c, { srgb: !emissive });
  });
}

/** 屋瓦（筒瓦一排排） */
export function roofTileTexture(theme: 'slate' | 'teal' | 'gold' | 'red' = 'slate') {
  return cached(`roof_${theme}`, () => {
    const [c, ctx] = makeCanvas(256, 256);
    const base = { slate: '#3c4757', teal: '#2c5a50', gold: '#b48a2c', red: '#7c2e25' }[theme];
    ctx.fillStyle = shade(base, -25);
    ctx.fillRect(0, 0, 256, 256);
    const cols = 12;
    const cw = 256 / cols;
    for (let i = 0; i < cols; i++) {
      const g = ctx.createLinearGradient(i * cw, 0, (i + 1) * cw, 0);
      g.addColorStop(0, shade(base, -30));
      g.addColorStop(0.45, shade(base, 28));
      g.addColorStop(1, shade(base, -34));
      ctx.fillStyle = g;
      ctx.fillRect(i * cw + 1, 0, cw - 2, 256);
    }
    for (let y = 0; y < 256; y += 32) {
      const g = ctx.createLinearGradient(0, y, 0, y + 10);
      g.addColorStop(0, 'rgba(0,0,0,0.45)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, y, 256, 10);
    }
    return toTexture(c);
  });
}

/** 室內藻井天花 */
export function ceilingTexture() {
  return cached('ceiling', () => {
    const [c, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#4a2716';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const x = i * 64 + 6;
        const y = j * 64 + 6;
        ctx.fillStyle = '#1f4f4a';
        ctx.fillRect(x, y, 52, 52);
        ctx.fillStyle = '#c9a33a';
        ctx.beginPath();
        ctx.arc(x + 26, y + 26, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8b1e1e';
        ctx.beginPath();
        ctx.arc(x + 26, y + 26, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return toTexture(c);
  });
}

const SERIF = '"Noto Serif TC","Songti TC","STSong","PMingLiU","MingLiU",serif';

/** 木製牌匾（深色漆木＋金框＋金字） */
export function signboardTexture(title: string, subtitle?: string) {
  return cached(`sign_${title}_${subtitle || ''}`, () => {
    const [c, ctx] = makeCanvas(768, 256);
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#4a2412');
    g.addColorStop(1, '#2b130a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 768, 256);
    ctx.strokeStyle = '#d4a637';
    ctx.lineWidth = 10;
    ctx.strokeRect(14, 14, 740, 228);
    ctx.lineWidth = 3;
    ctx.strokeRect(30, 30, 708, 196);
    ctx.fillStyle = '#f2c94c';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const size = Math.min(104, Math.floor(640 / Math.max(2, title.length)));
    ctx.font = `900 ${size}px ${SERIF}`;
    ctx.fillText(title, 384, subtitle ? 112 : 128);
    if (subtitle) {
      ctx.font = `700 34px ${SERIF}`;
      ctx.fillStyle = '#e9d8a6';
      ctx.fillText(subtitle, 384, 196);
    }
    return toTexture(c, { repeat: false });
  });
}

/** 門聯：紅底金字直書（七言） */
export function coupletTexture(text: string) {
  return cached(`couplet_${text}`, () => {
    const chars = Array.from(text).slice(0, 9);
    const W = 160;
    const H = 120 * chars.length + 60;
    const [c, ctx] = makeCanvas(W, H);
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, '#8e1d17');
    g.addColorStop(0.5, '#b3261e');
    g.addColorStop(1, '#8e1d17');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#e0b14a';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, W - 16, H - 16);
    speckle(ctx, W, H, 600, seeded(text.length * 13 + 7), 0.07);
    ctx.fillStyle = '#f6d36b';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 96px ${SERIF}`;
    chars.forEach((ch, i) => ctx.fillText(ch, W / 2, 30 + 120 * (i + 0.5)));
    return toTexture(c, { repeat: false });
  });
}

/** 直式紅布旗幟 */
export function bannerTexture(text: string) {
  return cached(`banner_${text}`, () => {
    const [c, ctx] = makeCanvas(128, 512);
    ctx.fillStyle = '#a3241f';
    ctx.fillRect(0, 0, 128, 512);
    ctx.fillStyle = '#7d1a16';
    ctx.fillRect(0, 0, 128, 40);
    ctx.strokeStyle = '#e0b14a';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 50, 108, 430);
    ctx.fillStyle = '#f6d36b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const chars = Array.from(text).slice(0, 4);
    const step = 400 / Math.max(chars.length, 1);
    ctx.font = `900 ${Math.min(78, step * 0.82)}px ${SERIF}`;
    chars.forEach((ch, i) => ctx.fillText(ch, 64, 70 + step * (i + 0.5)));
    // 下緣流蘇
    for (let x = 6; x < 128; x += 12) {
      ctx.fillStyle = '#e0b14a';
      ctx.fillRect(x, 486, 4, 26);
    }
    return toTexture(c, { repeat: false });
  });
}

/** 柔光（燈籠光暈、水霧） */
export function glowTexture() {
  return cached('glow', () => {
    const [c, ctx] = makeCanvas(128, 128);
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.12)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return toTexture(c, { repeat: false, srgb: false });
  });
}

export function cloudTexture() {
  return cached('cloud', () => {
    const [c, ctx] = makeCanvas(256, 128);
    const rand = seeded(41);
    for (let i = 0; i < 26; i++) {
      const x = 40 + rand() * 176;
      const y = 50 + rand() * 40;
      const r = 18 + rand() * 30;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.75)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    return toTexture(c, { repeat: false });
  });
}

/** 瀑布水流（往下捲動） */
export function waterfallTexture() {
  return cached('waterfall', () => {
    const [c, ctx] = makeCanvas(128, 256);
    const rand = seeded(55);
    ctx.fillStyle = 'rgba(190,225,240,0.55)';
    ctx.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 180; i++) {
      const x = rand() * 128;
      const len = 30 + rand() * 120;
      const y = rand() * 256;
      ctx.strokeStyle = `rgba(255,255,255,${0.25 + rand() * 0.6})`;
      ctx.lineWidth = 1 + rand() * 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand() - 0.5) * 3, y + len);
      ctx.stroke();
      if (y + len > 256) {
        ctx.beginPath();
        ctx.moveTo(x, y - 256);
        ctx.lineTo(x, y + len - 256);
        ctx.stroke();
      }
    }
    return toTexture(c, { srgb: true });
  });
}

/** 荷葉 */
export function lotusPadTexture() {
  return cached('lotusPad', () => {
    const [c, ctx] = makeCanvas(128, 128);
    ctx.fillStyle = '#4f8a3c';
    ctx.beginPath();
    ctx.moveTo(64, 64);
    ctx.arc(64, 64, 60, 0.15, Math.PI * 2 - 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(190,220,140,0.6)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const a = 0.3 + (i / 12) * (Math.PI * 2 - 0.6);
      ctx.beginPath();
      ctx.moveTo(64, 64);
      ctx.lineTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56);
      ctx.stroke();
    }
    return toTexture(c, { repeat: false });
  });
}

/** 室內掛畫（水墨山水） */
export function scrollPaintingTexture(seed = 1) {
  return cached(`scroll_${seed}`, () => {
    const [c, ctx] = makeCanvas(128, 320);
    const rand = seeded(seed * 13 + 7);
    ctx.fillStyle = '#7a4a26';
    ctx.fillRect(0, 0, 128, 320);
    ctx.fillStyle = '#efe4c8';
    ctx.fillRect(10, 24, 108, 272);
    for (let layer = 0; layer < 3; layer++) {
      ctx.fillStyle = `rgba(40,50,48,${0.25 + layer * 0.2})`;
      ctx.beginPath();
      const base = 120 + layer * 55;
      ctx.moveTo(10, 296);
      let x = 10;
      while (x < 118) {
        const peak = base - rand() * 70;
        ctx.quadraticCurveTo(x + 12, peak, x + 24 + rand() * 10, base + rand() * 20);
        x += 26;
      }
      ctx.lineTo(118, 296);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#b3261e';
    ctx.fillRect(88, 40, 16, 16);
    return toTexture(c, { repeat: false });
  });
}

export function moonTexture() {
  return cached('moon', () => {
    const [c, ctx] = makeCanvas(256, 256);
    const g = ctx.createRadialGradient(128, 128, 30, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,250,230,1)');
    g.addColorStop(0.33, 'rgba(255,248,225,1)');
    g.addColorStop(0.36, 'rgba(220,230,255,0.45)');
    g.addColorStop(1, 'rgba(160,180,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = 'rgba(200,195,180,0.35)';
    for (const [x, y, r] of [[110, 110, 10], [145, 130, 7], [120, 150, 6]]) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    return toTexture(c, { repeat: false });
  });
}

export function petalTexture() {
  return cached('petal', () => {
    const [c, ctx] = makeCanvas(32, 32);
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.beginPath();
    ctx.ellipse(16, 16, 12, 7, 0.5, 0, Math.PI * 2);
    ctx.fill();
    return toTexture(c, { repeat: false, srgb: false });
  });
}

/** 用同一張畫布的明暗當高度，做出凹凸（石縫、瓦溝、木紋會有立體感） */
export function bumpOf(key: string, color: THREE.Texture) {
  return cached(`bump_${key}`, () => {
    const t = new THREE.CanvasTexture(color.image as HTMLCanvasElement);
    t.colorSpace = THREE.NoColorSpace;
    t.wrapS = color.wrapS;
    t.wrapT = color.wrapT;
    t.anisotropy = color.anisotropy;
    return t;
  });
}

/** 屋簷瓦當（一排圓形瓦頭） */
export function eaveTileTexture() {
  return cached('eaveTile', () => {
    const [c, ctx] = makeCanvas(64, 32);
    ctx.fillStyle = '#2a3038';
    ctx.fillRect(0, 0, 64, 32);
    for (const x of [16, 48]) {
      ctx.fillStyle = '#56606c';
      ctx.beginPath();
      ctx.arc(x, 16, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c9a33a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, 16, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    return toTexture(c);
  });
}

/** 朱漆大門（金色門釘） */
export function doorTexture() {
  return cached('door', () => {
    const [c, ctx] = makeCanvas(128, 256);
    ctx.fillStyle = '#8e1f17';
    ctx.fillRect(0, 0, 128, 256);
    ctx.strokeStyle = '#4a120c';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 116, 244);
    for (let r = 0; r < 7; r++) {
      for (let k = 0; k < 4; k++) {
        const x = 26 + k * 25;
        const y = 34 + r * 30;
        const g = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 7);
        g.addColorStop(0, '#fff2b0');
        g.addColorStop(1, '#a87a1c');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#c9a33a';
    ctx.beginPath();
    ctx.arc(110, 130, 9, 0, Math.PI * 2);
    ctx.fill();
    return toTexture(c, { repeat: false });
  });
}

/** 草叢（透明底的草葉） */
export function grassTuftTexture() {
  return cached('grassTuft', () => {
    const [c, ctx] = makeCanvas(128, 128);
    const rand = seeded(71);
    for (let i = 0; i < 46; i++) {
      const x = 10 + rand() * 108;
      const h = 50 + rand() * 70;
      const bend = (rand() - 0.5) * 30;
      ctx.strokeStyle = `rgb(${70 + rand() * 50},${120 + rand() * 60},${40 + rand() * 30})`;
      ctx.lineWidth = 2 + rand() * 2.5;
      ctx.beginPath();
      ctx.moveTo(x, 128);
      ctx.quadraticCurveTo(x + bend * 0.3, 128 - h * 0.6, x + bend, 128 - h);
      ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = ['#f7c6d8', '#fff1c4', '#e9a3c4', '#ffffff'][i % 4];
      ctx.beginPath();
      ctx.arc(14 + rand() * 100, 30 + rand() * 50, 4 + rand() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    return toTexture(c, { repeat: false });
  });
}

/** 岸邊浪花（由內往外漸淡） */
export function foamTexture() {
  return cached('foam', () => {
    const [c, ctx] = makeCanvas(256, 64);
    const rand = seeded(83);
    const g = ctx.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 64);
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.3 + rand() * 0.5})`;
      ctx.beginPath();
      ctx.ellipse(rand() * 256, 8 + rand() * 50, 4 + rand() * 10, 2 + rand() * 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    return toTexture(c, { srgb: false });
  });
}

/** 田園：田埂分隔的稻田、水田、油菜花田、茶園 */
export function farmlandTexture() {
  return cached('farmland', () => {
    const S = 512;
    const [c, ctx] = makeCanvas(S, S);
    const rand = seeded(101);
    ctx.fillStyle = '#8a7350';
    ctx.fillRect(0, 0, S, S);
    const cols = [0, 150, 290, 400, 512];
    const rows = [0, 120, 260, 380, 512];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const x0 = cols[i] + 5;
        const y0 = rows[j] + 5;
        const w = cols[i + 1] - cols[i] - 10;
        const h = rows[j + 1] - rows[j] - 10;
        const kind = Math.floor(rand() * 5);
        if (kind === 0 || kind === 1) {
          // 稻田（一行行秧苗）
          ctx.fillStyle = kind === 0 ? '#6f9a3c' : '#86ad45';
          ctx.fillRect(x0, y0, w, h);
          ctx.strokeStyle = 'rgba(40,80,20,0.35)';
          ctx.lineWidth = 3;
          for (let y = y0 + 6; y < y0 + h; y += 9) {
            ctx.beginPath();
            ctx.moveTo(x0, y);
            ctx.lineTo(x0 + w, y);
            ctx.stroke();
          }
        } else if (kind === 2) {
          // 水田（映著天光）
          const g = ctx.createLinearGradient(x0, y0, x0 + w, y0 + h);
          g.addColorStop(0, '#9fc3c9');
          g.addColorStop(1, '#6f9aa3');
          ctx.fillStyle = g;
          ctx.fillRect(x0, y0, w, h);
          ctx.fillStyle = 'rgba(90,140,50,0.8)';
          for (let y = y0 + 8; y < y0 + h - 4; y += 12) for (let x = x0 + 6; x < x0 + w - 4; x += 12) ctx.fillRect(x, y, 3, 4);
        } else if (kind === 3) {
          // 油菜花田
          ctx.fillStyle = '#e9cf4a';
          ctx.fillRect(x0, y0, w, h);
          for (let k = 0; k < 220; k++) {
            ctx.fillStyle = rand() > 0.5 ? 'rgba(255,240,140,0.9)' : 'rgba(150,170,60,0.6)';
            ctx.fillRect(x0 + rand() * w, y0 + rand() * h, 3, 3);
          }
        } else {
          // 茶園（一條條深綠茶樹）
          ctx.fillStyle = '#7a8f4a';
          ctx.fillRect(x0, y0, w, h);
          ctx.strokeStyle = '#3f6a2c';
          ctx.lineWidth = 8;
          for (let x = x0 + 8; x < x0 + w; x += 16) {
            ctx.beginPath();
            ctx.moveTo(x, y0);
            ctx.lineTo(x, y0 + h);
            ctx.stroke();
          }
        }
      }
    }
    speckle(ctx, S, S, 2500, rand, 0.08);
    return toTexture(c);
  });
}

/** 市集攤位的條紋布棚（下緣有波浪布邊） */
export function awningTexture(a: string, b: string) {
  return cached(`awning_${a}_${b}`, () => {
    const [c, ctx] = makeCanvas(256, 256);
    const n = 8;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? b : a;
      ctx.fillRect((i * 256) / n, 0, 256 / n + 1, 256);
    }
    // 布紋陰影
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(0,0,0,0.18)');
    g.addColorStop(0.6, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    speckle(ctx, 256, 256, 900, seeded(a.length * 31 + b.length), 0.06);
    // 金色滾邊
    ctx.fillStyle = '#d9b04a';
    ctx.fillRect(0, 236, 256, 8);
    return toTexture(c, { repeat: false });
  });
}

export type ShopKind = 'tea' | 'books' | 'crafts' | 'lanterns' | 'sweets' | 'ink' | 'general' | 'toys';

/** 店舖裡的貨架（櫃檯後方的牆面）：茶罐、書冊、燈籠、糕點…依店種畫不同的貨 */
export function shopInteriorTexture(kind: ShopKind) {
  return cached(`shopIn_${kind}`, () => {
    const W = 512;
    const H = 320;
    const [c, ctx] = makeCanvas(W, H);
    const rand = seeded(kind.length * 977 + kind.charCodeAt(0));
    ctx.fillStyle = '#3a2213';
    ctx.fillRect(0, 0, W, H);
    // 木格貨架
    const rows = 3;
    const cols = 4;
    const cw = W / cols;
    const rh = H / rows;
    for (let r = 0; r < rows; r++) {
      for (let k = 0; k < cols; k++) {
        const x = k * cw;
        const y = r * rh;
        const g = ctx.createLinearGradient(0, y, 0, y + rh);
        g.addColorStop(0, '#2a170c');
        g.addColorStop(1, '#4b2c17');
        ctx.fillStyle = g;
        ctx.fillRect(x + 8, y + 8, cw - 16, rh - 16);
        const baseY = y + rh - 14;
        const palette: Record<ShopKind, string[]> = {
          tea: ['#3f6b4a', '#7a3b22', '#c9a227', '#2f5675'],
          books: ['#8e2420', '#2f5675', '#3f6b4a', '#c9a227', '#6b4a2a'],
          crafts: ['#b5651d', '#c9a227', '#2c6a62', '#9c2a22'],
          lanterns: ['#c62828', '#e2b85a', '#c62828'],
          sweets: ['#f2a6c2', '#f6d36b', '#e8e0cf', '#c9844a'],
          ink: ['#1d1d1d', '#8e2420', '#e8e0cf', '#2f5675'],
          general: ['#b5651d', '#3f6b4a', '#c9a227', '#8e2420', '#2f5675'],
          toys: ['#e05a3a', '#3f8fd0', '#f2c94c', '#5fae5a'],
        };
        const cols2 = palette[kind];
        let px = x + 16;
        while (px < x + cw - 24) {
          const col = cols2[Math.floor(rand() * cols2.length)];
          ctx.fillStyle = col;
          if (kind === 'books' || kind === 'ink') {
            const bw = 8 + rand() * 9;
            const bh = rh * (0.45 + rand() * 0.3);
            ctx.fillRect(px, baseY - bh, bw, bh);
            ctx.fillStyle = 'rgba(255,230,160,0.5)';
            ctx.fillRect(px + 2, baseY - bh + 6, bw - 4, 3);
            px += bw + 2;
          } else if (kind === 'lanterns') {
            const rr = 14 + rand() * 6;
            ctx.beginPath();
            ctx.ellipse(px + rr, baseY - rr * 1.3, rr, rr * 1.25, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#e2b85a';
            ctx.fillRect(px + rr * 0.5, baseY - rr * 2.6, rr, 4);
            ctx.fillRect(px + rr * 0.5, baseY - 4, rr, 4);
            px += rr * 2 + 6;
          } else if (kind === 'sweets') {
            const rr = 8 + rand() * 5;
            for (let q = 0; q < 3; q++) {
              ctx.beginPath();
              ctx.arc(px + rr, baseY - rr - q * rr * 1.2, rr, 0, Math.PI * 2);
              ctx.fillStyle = cols2[Math.floor(rand() * cols2.length)];
              ctx.fill();
            }
            px += rr * 2 + 6;
          } else {
            // 罐子、木盒、陶瓶
            const jw = 16 + rand() * 14;
            const jh = rh * (0.3 + rand() * 0.35);
            ctx.beginPath();
            ctx.moveTo(px, baseY);
            ctx.lineTo(px + jw, baseY);
            ctx.lineTo(px + jw * 0.92, baseY - jh);
            ctx.lineTo(px + jw * 0.08, baseY - jh);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'rgba(255,240,200,0.25)';
            ctx.fillRect(px + jw * 0.2, baseY - jh * 0.8, 3, jh * 0.6);
            ctx.fillStyle = '#e8d9b5';
            ctx.fillRect(px + jw * 0.25, baseY - jh * 0.6, jw * 0.5, jh * 0.28);
            px += jw + 5;
          }
        }
        // 層板
        ctx.fillStyle = '#6b3f22';
        ctx.fillRect(x + 4, baseY, cw - 8, 8);
      }
    }
    // 直柱
    ctx.fillStyle = '#5a321c';
    for (let k = 0; k <= cols; k++) ctx.fillRect(k * cw - 5, 0, 10, H);
    // 暖光
    const lg = ctx.createRadialGradient(W / 2, H * 0.35, 20, W / 2, H * 0.35, W * 0.7);
    lg.addColorStop(0, 'rgba(255,190,90,0.22)');
    lg.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, W, H);
    return toTexture(c, { repeat: false });
  });
}

/** 依顯示卡能力提高貼圖的斜角清晰度 */
export function setTextureAnisotropy(n: number) {
  for (const t of cache.values()) {
    if (t.anisotropy !== n) {
      t.anisotropy = n;
      t.needsUpdate = true;
    }
  }
}

export function disposeTextureCache() {
  for (const t of cache.values()) t.dispose();
  cache.clear();
}
