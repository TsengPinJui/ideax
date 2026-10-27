import * as THREE from 'three';

/** 創點樓各樓層要展示的痛點分類 */
export const PAIN_FLOORS: { label: string; sub: string; categories?: string[] }[] = [
  { label: '一樓・懸賞牆', sub: '最新刊登的痛點' },
  { label: '二樓・創業與專業', sub: '創新創業、專業問題', categories: ['創新創業', '專業問題'] },
  { label: '三樓・學術與生活', sub: '學術探討、日常疑難、網站程式', categories: ['學術探討', '日常疑難', '網站程式'] },
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

/** 懸賞牆貼圖：木板上釘著一張張痛點紙條（最多 8 則） */
export function drawPainBoardTexture(level: number, cards: PainCard[], loading = false): THREE.CanvasTexture {
  const W = 1600;
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

  const list = cards.slice(0, 8);
  if (!list.length) {
    ctx.fillStyle = '#f1e2bf';
    ctx.font = `700 40px ${KAI}`;
    ctx.fillText(loading ? '懸賞紙條張貼中…' : '這層還沒有痛點，歡迎刊登第一則！', W / 2 + 70, H / 2);
  }
  const cols = 4;
  const cw = (W - 200) / cols;
  const ch = (H - 60) / 2;
  list.forEach((card, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 175 + col * cw;
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
