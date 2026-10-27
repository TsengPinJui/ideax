import * as THREE from 'three';

/**
 * 創點樓各樓層要展示的痛點分類（由下往上：地下一樓、一樓、二樓、三樓）。
 * 陣列索引就是樓層編號；地面層（大門那層）是 PAIN_BASEMENTS。
 */
export const PAIN_BASEMENTS = 0;
// 痛點不再有「創新創業」分類；以前分在創新創業的痛點，和新的一樣歸到二樓專業問題
export const PAIN_FLOORS: { label: string; short: string; sub: string; categories?: string[] }[] = [
  { label: '一樓・日常疑難', short: '1F', sub: '中庭佈告欄與一樓迴廊：生活中的大小麻煩', categories: ['日常疑難'] },
  { label: '二樓・專業問題', short: '2F', sub: '二樓迴廊：各行各業的專業難題', categories: ['專業問題', '創新創業'] },
  { label: '三樓・學術探討', short: '3F', sub: '三樓迴廊：研究、理論與學術問題', categories: ['學術探討'] },
];

export interface PainCard {
  id: string;
  title: string;
  category?: string;
  bounty?: number;
}

const SERIF = '"Noto Serif TC","Songti TC","PMingLiU",serif';
const KAI = '"LXGW WenKai TC","Noto Serif TC","PMingLiU",serif';

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const lines: string[] = [];
  let cur = '';
  for (const ch of Array.from(text)) {
    if (ctx.measureText(cur + ch).width > maxW) {
      lines.push(cur);
      cur = ch;
      if (lines.length === maxLines) break;
    } else cur += ch;
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  if (lines.length === maxLines && Array.from(text).length > lines.join('').length) {
    lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1) + '…';
  }
  return lines;
}

/** 一面懸賞牆的版型：主牆（後牆，左側直書樓層名，4×2）與側牆、前牆的小牆（2×2） */
export interface PainBoardLayout {
  cols: number;
  rows: number;
  /** 左側是否畫直書樓層名 */
  label: boolean;
}
export const MAIN_BOARD: PainBoardLayout = { cols: 4, rows: 2, label: true };
export const SIDE_BOARD: PainBoardLayout = { cols: 2, rows: 2, label: false };

/** 懸賞牆貼圖：木板上釘著一張張痛點紙條 */
export function drawPainBoardTexture(level: number, cards: PainCard[], loading = false, layout: PainBoardLayout = MAIN_BOARD): THREE.CanvasTexture {
  const W = layout.label ? 1600 : 880;
  const H = 440;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#5a321c');
  g.addColorStop(1, '#3a1f10');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  for (let y = 18; y < H; y += 36) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.strokeStyle = '#d4a637';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, W - 16, H - 16);
  // 左側直書樓層名
  const floor = PAIN_FLOORS[level] || PAIN_FLOORS[0];
  if (layout.label) {
  ctx.fillStyle = '#9c2a22';
  ctx.fillRect(26, 26, 120, H - 52);
  ctx.strokeStyle = '#e0b14a';
  ctx.lineWidth = 3;
  ctx.strokeRect(34, 34, 104, H - 68);
  ctx.fillStyle = '#f6d36b';
  ctx.font = `900 46px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const title = floor.label.replace('・', '');
  const chars = Array.from(title).slice(0, 7);
  const step = (H - 100) / chars.length;
  chars.forEach((ch, i) => ctx.fillText(ch, 86, 70 + step * (i + 0.5) - 20));
  }

  ctx.textBaseline = 'middle';
  const left = layout.label ? 175 : 30;
  const cols = layout.cols;
  const list = cards.slice(0, cols * layout.rows);
  if (!list.length) {
    ctx.fillStyle = '#f1e2bf';
    ctx.font = `700 ${layout.label ? 40 : 34}px ${KAI}`;
    ctx.textAlign = 'center';
    ctx.fillText(
      loading ? '懸賞紙條張貼中…' : layout.label ? '這層還沒有痛點，歡迎刊登第一則！' : '還有空位，等你來刊登',
      (left + W - 25) / 2,
      H / 2
    );
  }
  const cw = (W - left - 25) / cols;
  const ch = (H - 60) / layout.rows;
  list.forEach((card, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = left + col * cw;
    const y = 30 + row * ch;
    ctx.save();
    ctx.translate(x + cw / 2, y + ch / 2);
    ctx.rotate(((i * 37) % 7 - 3) * 0.006);
    ctx.fillStyle = '#f3e6c4';
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 8;
    ctx.fillRect(-cw / 2 + 12, -ch / 2 + 10, cw - 24, ch - 20);
    ctx.shadowBlur = 0;
    // 圖釘
    ctx.fillStyle = '#b3261e';
    ctx.beginPath();
    ctx.arc(0, -ch / 2 + 22, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#2e1d10';
    ctx.font = `700 30px ${KAI}`;
    const lines = wrap(ctx, card.title || '（未命名痛點）', cw - 60, 3);
    lines.forEach((ln, k) => ctx.fillText(ln, -cw / 2 + 30, -ch / 2 + 62 + k * 38));
    ctx.font = `600 22px ${KAI}`;
    ctx.fillStyle = '#7a5a36';
    ctx.fillText(card.category || '痛點', -cw / 2 + 30, ch / 2 - 30);
    if (card.bounty && card.bounty > 0) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#9c2a22';
      ctx.font = `800 24px ${SERIF}`;
      ctx.fillText(`懸賞 ${card.bounty.toLocaleString()}`, cw / 2 - 28, ch / 2 - 30);
    }
    ctx.restore();
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

let paperTex: THREE.CanvasTexture | null = null;
/** 書桌上的稿紙：抬頭「痛點稿」＋幾行手寫字跡 */
export function deskPaperTexture() {
  if (paperTex) return paperTex;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 352;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f4ead2';
  ctx.fillRect(0, 0, 512, 352);
  ctx.strokeStyle = 'rgba(156,42,34,0.55)';
  ctx.lineWidth = 2;
  for (let x = 60; x < 500; x += 44) {
    ctx.beginPath();
    ctx.moveTo(x, 30);
    ctx.lineTo(x, 330);
    ctx.stroke();
  }
  ctx.strokeRect(14, 14, 484, 324);
  ctx.fillStyle = '#9c2a22';
  ctx.font = `900 40px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ['痛', '點', '稿'].forEach((ch, i) => ctx.fillText(ch, 470 - 2, 70 + i * 48));
  ctx.fillStyle = 'rgba(30,20,12,0.75)';
  ctx.font = `600 28px ${KAI}`;
  const lines = ['遇到什麼麻煩', '想要怎樣解決', '願意懸賞多少'];
  lines.forEach((ln, i) => {
    const x = 410 - i * 88;
    Array.from(ln).forEach((ch, k) => ctx.fillText(ch, x, 60 + k * 40));
  });
  paperTex = new THREE.CanvasTexture(c);
  paperTex.colorSpace = THREE.SRGBColorSpace;
  paperTex.anisotropy = 4;
  return paperTex;
}
