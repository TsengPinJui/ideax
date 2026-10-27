import * as THREE from 'three';

/** 求職廟兩側的畫卷：顯示搜搜找到的職缺（只畫在自己的畫面上，別人看不到） */
export interface ScrollJob {
  title: string;
  company?: string;
  location?: string;
  salaryText?: string;
}

const SERIF = '"Noto Serif TC","Songti TC","PMingLiU",serif';
const KAI = '"LXGW WenKai TC","Noto Serif TC","PMingLiU",serif';

function clip(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  let t = text;
  while (t.length > 1 && ctx.measureText(t).width > maxW) t = t.slice(0, -1);
  return t === text ? t : t.slice(0, -1) + '…';
}

/** side：0 左卷、1 右卷；jobs 是這一卷要列的職缺（最多 5 筆） */
export function drawJobScrollTexture(side: number, jobs: ScrollJob[], status: 'idle' | 'loading' | 'done', brief?: string) {
  const W = 600;
  const H = 860;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  // 宣紙
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, '#e9dcbc');
  g.addColorStop(0.5, '#f5ecd4');
  g.addColorStop(1, '#e9dcbc');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // 綾邊
  ctx.fillStyle = '#2f5675';
  ctx.fillRect(0, 0, W, 70);
  ctx.fillRect(0, H - 50, W, 50);
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 6;
  ctx.strokeRect(24, 84, W - 48, H - 150);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f6d36b';
  ctx.font = `900 40px ${SERIF}`;
  ctx.fillText(side === 0 ? '搜搜尋職・上卷' : '搜搜尋職・下卷', W / 2, 36);
  ctx.fillStyle = '#3a2614';
  if (status !== 'done' || !jobs.length) {
    ctx.font = `700 40px ${KAI}`;
    const lines =
      status === 'loading'
        ? ['搜搜正在', '騰雲駕霧', '翻找職缺…']
        : status === 'done'
        ? ['這次沒有找到', '合適的職缺', '換個說法試試']
        : side === 0
        ? ['點一下搜搜', '用自己的話', '說想找的工作']
        : ['找到的職缺', '會寫在', '這兩卷上'];
    lines.forEach((ln, i) => ctx.fillText(ln, W / 2, H / 2 - 70 + i * 70));
  } else {
    if (brief && side === 0) {
      ctx.font = `600 22px ${KAI}`;
      ctx.fillStyle = '#7a5a36';
      ctx.fillText(clip(ctx, `條件：${brief}`, W - 90), W / 2, 112);
    }
    const top = 140;
    const rowH = (H - 150 - top) / 5;
    jobs.slice(0, 5).forEach((j, i) => {
      const y = top + i * rowH;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#9c2a22';
      ctx.beginPath();
      ctx.arc(56, y + 30, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2e1d10';
      ctx.font = `800 32px ${KAI}`;
      ctx.fillText(clip(ctx, j.title || '職缺', W - 130), 78, y + 30);
      ctx.font = `600 24px ${KAI}`;
      ctx.fillStyle = '#5a4128';
      ctx.fillText(clip(ctx, j.company || '', W - 130), 78, y + 70);
      ctx.fillStyle = '#7a5a36';
      ctx.fillText(clip(ctx, [j.location, j.salaryText].filter(Boolean).join('・'), W - 130), 78, y + 104);
      ctx.strokeStyle = 'rgba(122,90,54,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(48, y + rowH - 6);
      ctx.lineTo(W - 48, y + rowH - 6);
      ctx.stroke();
    });
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
