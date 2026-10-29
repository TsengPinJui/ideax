import * as THREE from 'three';
import type { BuildingInteractable, Collider } from '../types';
import type { Question } from '../../../types';
import { makePickProxy } from '../picking';
import { localToWorldXZ } from '../regionConfigs';
import { hallOf, isFloorsHall } from './exhibitHall';

/**
 * 展覽館、電玩城的一樓大廳：
 * - 展覽館（creative-exhibition）：中央氣派大樓梯往下、正對面大螢幕輪播、左右牆精選榜與熱度榜
 * - 電玩城（creative-arcade）：依參考圖三「電玩城大廳」打造賽博霓虹圓形中庭大廳：
 *   1. 中央圓柱體全息螢幕（IDEAX ARCADE）：底部多層發光圓形基座、內置微縮全息賽博城市、外圍弧形曲面螢幕自動輪播「精選榜 ↔ 熱度榜」兩種排名
 *   2. 周圍環繞弧形霓虹大螢幕與下層電玩展示機台：顯示上榜遊戲封面、排名資訊與其他電玩內容（點擊可直接查看該遊戲或榜單）
 *   3. 左側霓虹弧形階梯通往二樓弧形玻璃看台，右側霓虹階梯通往地下 B1–B4 四層分類電玩展廳
 */

const KAI = '"DFKai-SB","BiauKai","Kaiti TC","STKaiti","KaiTi","LXGW WenKai TC","CWTeXKai","Noto Serif TC",serif';
const CYBER_FONT = '"Orbitron","Rajdhani","Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';

/** 大樓梯井（建築本地座標）：電玩城將下樓梯設於右側，讓正中央留給圓柱體全息主螢幕 */
export function lobbyPit(b: Pick<BuildingInteractable, 'width' | 'depth'> & { id?: string; exterior?: string }) {
  if (b.id === 'creative-arcade' || b.exterior === 'cyber') {
    return { x0: 4.1, x1: 8.1, zTop: 2.1, zBot: -4.1, depth: 3.6 };
  }
  const pw = Math.min(9, b.width * 0.36);
  const zTop = b.depth * 0.12;
  const len = b.depth * 0.42;
  return { x0: -pw / 2, x1: pw / 2, zTop, zBot: zTop - len, depth: 3.6 };
}

/** 樓梯井在世界座標的四邊形（島上的地面要挖洞） */
export function lobbyPitPolygon(b: BuildingInteractable, pad = 0.35): [number, number][] {
  const p = lobbyPit(b);
  const pts: [number, number][] = [
    [p.x0 - pad, p.zTop + 0.05],
    [p.x1 + pad, p.zTop + 0.05],
    [p.x1 + pad, p.zBot - pad],
    [p.x0 - pad, p.zBot - pad],
  ];
  return pts.map(([x, z]) => localToWorldXZ(b.position.x, b.position.z, b.facingYaw, x, z) as [number, number]);
}

/** 走到樓梯口（樓梯最上面幾階）就往下走 */
export function inLobbyStairTop(b: BuildingInteractable, lx: number, lz: number) {
  const p = lobbyPit(b);
  return lx > p.x0 + 0.3 && lx < p.x1 - 0.3 && lz < p.zTop + 0.2 && lz > p.zTop - 1.4;
}

const typeLabel = (q: Question, games: boolean) =>
  q.postType === 'innovation_proposal' ? '創新提案' : games ? (q.tertiaryCategory ? `遊戲・${q.tertiaryCategory}` : '遊戲') : '軟體作品';

/** 大螢幕：下方的文字帶（名稱、類型、作者、簡述＋輪播點） */
export function drawScreenCaption(q: Question | null, games: boolean, idx: number, total: number, badge: string) {
  const c = document.createElement('canvas');
  c.width = 1280;
  c.height = 300;
  const ctx = c.getContext('2d')!;
  const grd = ctx.createLinearGradient(0, 0, 0, 300);
  grd.addColorStop(0, 'rgba(10,6,3,0.0)');
  grd.addColorStop(0.28, 'rgba(10,6,3,0.78)');
  grd.addColorStop(1, 'rgba(10,6,3,0.92)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 1280, 300);
  ctx.textBaseline = 'alphabetic';
  if (!q) {
    ctx.fillStyle = '#ffe9b0';
    ctx.font = `900 54px ${KAI}`;
    ctx.fillText('榜單作品輪播', 48, 190);
  } else {
    ctx.font = `900 30px ${KAI}`;
    const bw = ctx.measureText(badge).width + 34;
    ctx.fillStyle = badge.includes('熱度') ? '#b3261e' : '#c28a1c';
    ctx.beginPath();
    ctx.roundRect(48, 84, bw, 46, 10);
    ctx.fill();
    ctx.fillStyle = '#fff6dc';
    ctx.fillText(badge, 65, 118);
    const title = ((q as any).appName || q.title || '（未命名）').trim();
    ctx.fillStyle = '#fffbe9';
    ctx.font = `900 60px ${KAI}`;
    ctx.fillText(title, 48 + bw + 22, 126, 1180 - bw - 22);
    ctx.fillStyle = '#ffd98a';
    ctx.font = `700 32px ${KAI}`;
    ctx.fillText(`${typeLabel(q, games)}　作者：${q.authorName || '—'}`, 50, 180, 1180);
    ctx.fillStyle = '#efe2c6';
    ctx.font = `700 30px ${KAI}`;
    const desc = String(q.description || '').replace(/[#*_>`\[\]()]/g, '').replace(/\s+/g, ' ').trim();
    let line = '';
    let y = 228;
    let lines = 0;
    for (const ch of Array.from(desc)) {
      if (ctx.measureText(line + ch).width > 1180) {
        ctx.fillText(line, 50, y);
        y += 40;
        line = ch;
        if (++lines === 2) {
          line = '';
          break;
        }
      } else line += ch;
    }
    if (line && lines < 2) ctx.fillText(line, 50, y);
  }
  const n = Math.min(total, 20);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i === idx % Math.max(1, n) ? '#ffcf6a' : 'rgba(255,240,200,0.35)';
    ctx.beginPath();
    ctx.arc(1280 / 2 - (n - 1) * 13 + i * 26, 284, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 左右牆的傳統排行榜（展覽館使用） */
export function drawRankBoard(title: string, sub: string, list: Question[], games: boolean, accent: string) {
  const c = document.createElement('canvas');
  c.width = 900;
  c.height = 1100;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#241208';
  ctx.fillRect(0, 0, 900, 1100);
  ctx.strokeStyle = '#e2b85a';
  ctx.lineWidth = 12;
  ctx.strokeRect(8, 8, 884, 1084);
  ctx.fillStyle = accent;
  ctx.fillRect(20, 20, 860, 130);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff6dc';
  ctx.font = `900 76px ${KAI}`;
  ctx.fillText(title, 450, 74);
  ctx.font = `700 30px ${KAI}`;
  ctx.fillStyle = '#ffe6a8';
  ctx.fillText(sub, 450, 128);
  ctx.textAlign = 'left';
  if (!list.length) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#d9c39a';
    ctx.font = `700 40px ${KAI}`;
    ctx.fillText('榜單整理中', 450, 560);
  }
  list.slice(0, 10).forEach((q, i) => {
    const y = 210 + i * 88;
    ctx.fillStyle = i < 3 ? ['#e8b73a', '#c9ced6', '#c98a52'][i] : 'rgba(255,240,200,0.18)';
    ctx.beginPath();
    ctx.arc(76, y, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = i < 3 ? '#2a1606' : '#f6e7c4';
    ctx.font = `900 36px ${KAI}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), 76, y + 2);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff6dc';
    ctx.font = `900 38px ${KAI}`;
    const itemTitle = ((q as any).appName || q.title || '（未命名）').trim();
    ctx.fillText(itemTitle, 128, y - 14, 740);
    ctx.fillStyle = '#d9c39a';
    ctx.font = `700 25px ${KAI}`;
    ctx.fillText(`${typeLabel(q, games)}・${q.authorName || '—'}`, 130, y + 24, 740);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/**
 * 電玩城中央圓柱體全息螢幕專用：賽博霓虹雙榜輪播貼圖（精選榜 ↔ 熱度榜）
 * 呼應參考圖三中央圓柱體內的圓環雷達 HUD、霓虹青／洋紅光環與遊戲排名列表
 */
export function drawCyberRankBoard(which: 'featured' | 'hot', list: Question[]) {
  const W = 1024;
  const H = 1024;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  const isHot = which === 'hot';
  const primary = isHot ? '#ff2bd6' : '#00f0ff';
  const secondary = isHot ? '#00f0ff' : '#a855f7';

  // 半透明深海藍賽博底色与科技網格
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, 'rgba(4, 18, 38, 0.92)');
  bg.addColorStop(0.5, 'rgba(6, 26, 54, 0.88)');
  bg.addColorStop(1, 'rgba(4, 16, 34, 0.94)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(0, 240, 255, 0.14)';
  ctx.lineWidth = 1.5;
  for (let x = 0; x <= W; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // 背景大型全息圓環雷達 HUD（重現參考圖三中央圓柱內的霓虹圓形全息儀表）
  ctx.save();
  ctx.translate(W / 2, H / 2 + 40);
  for (const [r, col, lw, dash] of [
    [410, primary, 4, [24, 14]],
    [350, secondary, 3, [12, 18]],
    [280, 'rgba(0,240,255,0.25)', 2, []],
  ] as [number, string, number, number[]][]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();

  // 上下霓虹雙光條邊框
  ctx.strokeStyle = primary;
  ctx.lineWidth = 8;
  ctx.strokeRect(14, 14, W - 28, H - 28);
  ctx.strokeStyle = secondary;
  ctx.lineWidth = 3;
  ctx.strokeRect(26, 26, W - 52, H - 52);

  // 頂部賽博標題艙（顯示兩種排名輪播狀態）
  const hdr = ctx.createLinearGradient(40, 36, W - 40, 36);
  hdr.addColorStop(0, isHot ? 'rgba(255,43,214,0.28)' : 'rgba(0,240,255,0.28)');
  hdr.addColorStop(0.5, isHot ? 'rgba(168,85,247,0.48)' : 'rgba(0,180,255,0.48)');
  hdr.addColorStop(1, isHot ? 'rgba(255,43,214,0.28)' : 'rgba(0,240,255,0.28)');
  ctx.fillStyle = hdr;
  ctx.fillRect(40, 38, W - 80, 134);
  ctx.strokeStyle = primary;
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 38, W - 80, 134);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 24px ${CYBER_FONT}`;
  ctx.fillStyle = '#7dd3fc';
  ctx.fillText('IDEAX ARCADE // CENTRAL HOLOGRAM CAROUSEL', W / 2, 66);

  ctx.font = `900 58px ${CYBER_FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = primary;
  ctx.shadowBlur = 16;
  ctx.fillText(isHot ? '🔥 電玩熱度榜 TOP 8' : '👑 電玩精選榜 TOP 8', W / 2, 118);
  ctx.shadowBlur = 0;

  // 輪播切換指示膠囊（顯示精選榜 / 熱度榜正在輪播）
  ctx.font = `800 20px ${CYBER_FONT}`;
  ctx.fillStyle = isHot ? 'rgba(0,240,255,0.65)' : '#00f0ff';
  ctx.fillText('● 精選榜 FEATURED', W / 2 - 140, 156);
  ctx.fillStyle = isHot ? '#ff5ef7' : 'rgba(255,94,247,0.65)';
  ctx.fillText('● 熱度榜 HOT RANKING', W / 2 + 130, 156);

  if (!list.length) {
    ctx.fillStyle = '#a5f3fc';
    ctx.font = `800 42px ${CYBER_FONT}`;
    ctx.fillText('LOADING ARCADE RANKINGS...', W / 2, H / 2 + 40);
  } else {
    list.slice(0, 8).forEach((q, i) => {
      const y = 216 + i * 94;
      const top3 = i < 3;
      ctx.fillStyle = top3 ? 'rgba(0, 240, 255, 0.16)' : 'rgba(15, 35, 68, 0.72)';
      ctx.fillRect(48, y - 36, W - 96, 78);
      ctx.strokeStyle = top3 ? primary : 'rgba(0, 240, 255, 0.35)';
      ctx.lineWidth = top3 ? 3 : 1.5;
      ctx.strokeRect(48, y - 36, W - 96, 78);

      // 排名徽章
      const badgeCol = i === 0 ? '#facc15' : i === 1 ? '#38bdf8' : i === 2 ? '#f472b6' : '#0ea5e9';
      ctx.fillStyle = badgeCol;
      ctx.beginPath();
      ctx.arc(96, y + 2, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#041226';
      ctx.font = `900 30px ${CYBER_FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), 96, y + 4);

      // 遊戲名稱與分類／作者
      ctx.textAlign = 'left';
      const title = ((q as any).appName || q.title || '（未命名遊戲）').trim();
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 34px ${CYBER_FONT}`;
      ctx.fillText(title, 144, y - 8, 640);

      const cat = q.tertiaryCategory ? `🎮 ${q.tertiaryCategory}` : '🎮 電玩作品';
      const views = (q as any).viewsCount ?? (q as any).views ?? 0;
      const likes = ((q as any).likesCount ?? q.likes ?? 0) + (q.meTooCount || 0);
      ctx.fillStyle = '#67e8f9';
      ctx.font = `700 22px ${CYBER_FONT}`;
      ctx.fillText(`${cat}  |  BY ${q.authorName || 'PLAYER'}`, 144, y + 24, 560);

      ctx.textAlign = 'right';
      ctx.fillStyle = isHot ? '#ff7af6' : '#fde047';
      ctx.font = `800 24px ${CYBER_FONT}`;
      ctx.fillText(`🔥 ${views}   ♥ ${likes}`, W - 72, y + 6);
    });
  }

  // 底部提示列
  ctx.textAlign = 'center';
  ctx.fillStyle = '#a5f3fc';
  ctx.font = `700 22px ${CYBER_FONT}`;
  ctx.fillText('▶ 點擊中央圓柱體螢幕可展開完整電玩榜單 ◀', W / 2, H - 38);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/**
 * 電玩城周圍弧形螢幕貼圖：顯示上榜遊戲封面、排行名次、或賽博星軌電玩內容
 */
export function drawArcadeWallScreenTexture(
  slot: number,
  q: Question | null,
  rankBadge: string,
  coverImg?: HTMLImageElement | HTMLCanvasElement | ImageBitmap | null
) {
  const W = 800;
  const H = 500;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  const isPurple = slot % 2 === 1;
  const neon = isPurple ? '#d946ef' : '#00f0ff';
  const subNeon = isPurple ? '#00f0ff' : '#a855f7';

  // 深色科幻背景
  const grd = ctx.createRadialGradient(W * 0.68, H * 0.44, 20, W * 0.5, H * 0.5, W * 0.75);
  grd.addColorStop(0, isPurple ? '#2e1065' : '#083344');
  grd.addColorStop(0.6, '#09152b');
  grd.addColorStop(1, '#030814');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  // 若有上榜遊戲封面圖則繪製於右側視窗，否則繪製參考圖三的星軌原子圈／賽博幾何遊戲畫面
  if (coverImg) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(360, 68, 404, 310, 14);
    ctx.clip();
    try {
      ctx.drawImage(coverImg as CanvasImageSource, 360, 68, 404, 310);
    } catch {
      // ignore draw error
    }
    ctx.restore();
    ctx.strokeStyle = neon;
    ctx.lineWidth = 3;
    ctx.strokeRect(360, 68, 404, 310);
  } else {
    // 繪製參考圖三周圍螢幕標誌性的賽博星軌／原子環／合成波地平線電玩視覺
    ctx.save();
    ctx.translate(565, 224);
    for (let k = 0; k < 3; k++) {
      ctx.save();
      ctx.rotate((k * Math.PI) / 3 + slot * 0.4);
      ctx.strokeStyle = k === 0 ? neon : subNeon;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 145, 54, 0, 0, Math.PI * 2);
      ctx.stroke();
      const ang = slot * 1.3 + k * 2.1;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * 145, Math.sin(ang) * 54, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    const coreGrd = ctx.createRadialGradient(0, 0, 4, 0, 0, 44);
    coreGrd.addColorStop(0, '#ffffff');
    coreGrd.addColorStop(0.4, neon);
    coreGrd.addColorStop(1, 'rgba(0,240,255,0)');
    ctx.fillStyle = coreGrd;
    ctx.beginPath();
    ctx.arc(0, 0, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 頂部霓虹資訊欄
  ctx.fillStyle = 'rgba(4, 15, 32, 0.85)';
  ctx.fillRect(20, 18, W - 40, 40);
  ctx.strokeStyle = neon;
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 18, W - 40, 40);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = `900 20px ${CYBER_FONT}`;
  ctx.fillStyle = neon;
  ctx.fillText(`ARCADE DECK // 0${slot + 1}   [${rankBadge}]`, 36, 39);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#a5f3fc';
  ctx.fillText('LIVE GAME FEED ●', W - 34, 39);

  // 左側遊戲資訊區
  if (q) {
    const title = ((q as any).appName || q.title || '（未命名遊戲）').trim();
    ctx.fillStyle = neon;
    ctx.font = `900 24px ${CYBER_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(rankBadge, 36, 98);

    ctx.fillStyle = '#ffffff';
    ctx.font = `900 38px ${CYBER_FONT}`;
    const chars = Array.from(title);
    let line1 = '';
    let line2 = '';
    for (const ch of chars) {
      if (ctx.measureText(line1 + ch).width <= 300) line1 += ch;
      else if (ctx.measureText(line2 + ch).width <= 290) line2 += ch;
    }
    ctx.fillText(line1, 36, 150);
    if (line2) ctx.fillText(line2, 36, 196);

    const cat = q.tertiaryCategory ? `類型：${q.tertiaryCategory}` : '類型：獨立電玩';
    ctx.fillStyle = '#67e8f9';
    ctx.font = `700 23px ${CYBER_FONT}`;
    ctx.fillText(cat, 36, 252);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(`創作者：${q.authorName || '—'}`, 36, 288);

    const desc = String(q.description || '').replace(/[#*_>`\[\]()]/g, '').replace(/\s+/g, ' ').trim();
    ctx.fillStyle = '#94a3b8';
    ctx.font = `600 20px ${CYBER_FONT}`;
    ctx.fillText(desc.slice(0, 16) || '點擊螢幕立即開啟作品詳情與試玩', 36, 336, 305);
    if (desc.length > 16) ctx.fillText(desc.slice(16, 32) + '…', 36, 364, 305);
  } else {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 40px ${CYBER_FONT}`;
    ctx.fillText('IDEAX ARCADE', 36, 155);
    ctx.fillStyle = neon;
    ctx.font = `800 26px ${CYBER_FONT}`;
    ctx.fillText('跨維度電玩競技場', 36, 205);
    ctx.fillStyle = '#94a3b8';
    ctx.font = `600 21px ${CYBER_FONT}`;
    ctx.fillText('探索 B1–B4 分類電玩展廳', 36, 265);
  }

  // 底部霓虹狀態帶
  ctx.fillStyle = 'rgba(6, 22, 46, 0.9)';
  ctx.fillRect(20, H - 76, W - 40, 54);
  ctx.strokeStyle = subNeon;
  ctx.lineWidth = 2;
  ctx.strokeRect(20, H - 76, W - 40, 54);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fde047';
  ctx.font = `800 22px ${CYBER_FONT}`;
  const views = q ? ((q as any).viewsCount ?? (q as any).views ?? 0) : 128 + slot * 37;
  const likes = q ? (((q as any).likesCount ?? q.likes ?? 0) + (q.meTooCount || 0)) : 42 + slot * 11;
  ctx.fillText(`⚡ 熱度 ${views}   ♥ 推薦 ${likes}`, 38, H - 48);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#00f0ff';
  ctx.fillText('[ 點擊螢幕查看作品 ▶ ]', W - 36, H - 48);

  // 外框霓虹光暈線
  ctx.strokeStyle = neon;
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, W - 12, H - 12);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** 電玩城中央圓柱頂部「IDEAX ARCADE」環形發光字帶貼圖 */
function arcadeCylinderHeaderTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 160;
  const g = c.getContext('2d')!;
  g.fillStyle = '#05152b';
  g.fillRect(0, 0, 1024, 160);
  g.strokeStyle = '#00f0ff';
  g.lineWidth = 8;
  g.strokeRect(0, 6, 1024, 148);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `900 66px ${CYBER_FONT}`;
  g.fillStyle = '#e0faff';
  g.shadowColor = '#00f0ff';
  g.shadowBlur = 18;
  g.fillText('IDEAX ARCADE   •   電玩城大廳   •   IDEAX ARCADE', 512, 82);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 電玩城中央圓柱底部「數據流與音頻頻譜」環形貼圖 */
function arcadeTickerBandTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 160;
  const g = c.getContext('2d')!;
  g.fillStyle = '#040d1e';
  g.fillRect(0, 0, 1024, 160);
  for (let x = 12; x < 1024; x += 20) {
    const h = 24 + ((x * 37) % 96);
    g.fillStyle = (x / 20) % 3 === 0 ? '#ff2bd6' : '#00f0ff';
    g.fillRect(x, 140 - h, 12, h);
  }
  g.strokeStyle = '#00f0ff';
  g.lineWidth = 5;
  g.strokeRect(0, 4, 1024, 152);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function signTexture(text: string, sub: string, cyber = false) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 220;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = cyber ? '#061a36' : '#8e2420';
  ctx.fillRect(0, 0, 1024, 220);
  ctx.strokeStyle = cyber ? '#00f0ff' : '#f5ca5c';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 1008, 204);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = cyber ? '#e0faff' : '#fffbe0';
  ctx.font = `900 80px ${cyber ? CYBER_FONT : KAI}`;
  ctx.fillText(text, 512, 92);
  ctx.fillStyle = cyber ? '#67e8f9' : '#ffe596';
  ctx.font = `700 34px ${cyber ? CYBER_FONT : KAI}`;
  ctx.fillText(sub, 512, 174);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * 大廳裝置（建築本地座標，加在建築 root 底下）。
 * 回傳的 colliders 是世界座標（樓梯井兩側與後面的欄杆、以及電玩城中央圓柱基座）
 */
export function createHallLobby(
  b: BuildingInteractable,
  mats: { stone: THREE.Material; red: THREE.Material; gold: THREE.Material; dark: THREE.Material; floor: THREE.Material },
  wallInner: { back: number; side: number; h: number }
): { group: THREE.Group; colliders: Collider[] } {
  const h = hallOf(b.id);
  const games = h?.showcase === 'games';
  const g = new THREE.Group();
  g.name = `lobby_${b.id}`;
  const colliders: Collider[] = [];
  const toW = (x: number, z: number) => localToWorldXZ(b.position.x, b.position.z, b.facingYaw, x, z);
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = g) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.userData.noMerge = true;
    parent.add(m);
    return m;
  };

  // ---- 1. 下樓梯井（通往 B1–B4 展廳；電玩城位於右側 x=4.1..8.1，展覽館位於正中央）----
  const p = lobbyPit(b);
  const pw = p.x1 - p.x0;
  const pcx = (p.x0 + p.x1) / 2;
  const len = p.zTop - p.zBot;
  const pit = new THREE.Group();
  pit.userData.lobbyPit = b.id;
  g.add(pit);

  const stairStepMat = games
    ? new THREE.MeshStandardMaterial({ color: 0x0b192e, roughness: 0.35, metalness: 0.65 })
    : mats.stone;
  const stairStripMat = games
    ? new THREE.MeshBasicMaterial({ color: 0x00f0ff })
    : mats.red;
  const railMat = games
    ? new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: new THREE.Color(0x00c8ff), emissiveIntensity: 0.85, roughness: 0.25 })
    : mats.red;

  const steps = 14;
  for (let i = 0; i < steps; i++) {
    const top = -((i + 1) / steps) * (p.depth - 0.4);
    const zz = p.zTop - ((i + 0.5) * len) / steps;
    add(new THREE.BoxGeometry(pw - 0.3, 0.24, len / steps + 0.02), stairStepMat, pcx, top - 0.12, zz, pit);
    add(new THREE.BoxGeometry(pw * (games ? 0.72 : 0.36), 0.025, len / steps + 0.03), stairStripMat, pcx, top + 0.01, zz, pit);
  }
  for (const sx of [-1, 1]) {
    add(new THREE.BoxGeometry(0.3, p.depth, len + 0.3), stairStepMat, pcx + sx * (pw / 2 + 0.15), -p.depth / 2, p.zTop - len / 2 - 0.15, pit);
  }
  add(new THREE.BoxGeometry(pw + 0.6, p.depth, 0.3), stairStepMat, pcx, -p.depth / 2, p.zBot - 0.15, pit);
  add(new THREE.BoxGeometry(pw + 0.6, 0.2, 0.3), stairStepMat, pcx, -p.depth - 0.1, p.zTop + 0.15, pit);

  const arch = add(new THREE.PlaneGeometry(pw * 0.55, 2.4), new THREE.MeshBasicMaterial({ color: games ? 0x040d1f : 0x0c0705 }), pcx, -p.depth + 1.25, p.zBot + 0.02, pit);
  arch.userData.noMerge = true;
  add(new THREE.BoxGeometry(pw * 0.55 + 0.5, 0.3, 0.2), games ? railMat : mats.gold, pcx, -p.depth + 2.6, p.zBot + 0.1, pit);

  for (const sx of [-1, 1]) {
    const rx = pcx + sx * (pw / 2 + 0.2);
    add(new THREE.BoxGeometry(0.45, 0.14, len + 0.5), stairStepMat, rx, 0.07, p.zTop - len / 2 - 0.2);
    add(new THREE.BoxGeometry(0.1, 0.1, len + 0.2), railMat, rx, 1.0, p.zTop - len / 2 - 0.1);
    for (let k = 0; k <= 6; k++) {
      add(new THREE.BoxGeometry(0.1, 1.0, 0.1), railMat, rx, 0.5, p.zTop - (k / 6) * (len + 0.2));
    }
    add(new THREE.CylinderGeometry(0.12, 0.16, 2.3, 10), mats.dark, rx, 1.15, p.zTop + 0.05);
    const lamp = add(new THREE.SphereGeometry(0.26, 14, 10), new THREE.MeshBasicMaterial({ color: games ? 0x00f0ff : 0xff8a3a }), rx, 2.5, p.zTop + 0.05);
    lamp.scale.set(1, 1.2, 1);
    const [ax, az] = toW(rx, p.zTop + 0.1);
    const [bx, bz] = toW(rx, p.zBot - 0.2);
    colliders.push({ id: `${b.id}-pit-${sx}`, type: 'segment', x1: ax, z1: az, x2: bx, z2: bz, halfThickness: 0.2 });
  }
  add(new THREE.BoxGeometry(pw + 0.8, 0.14, 0.45), stairStepMat, pcx, 0.07, p.zBot - 0.2);
  add(new THREE.BoxGeometry(pw + 0.5, 0.1, 0.1), railMat, pcx, 1.0, p.zBot - 0.2);
  {
    const [ax, az] = toW(p.x0 - 0.2, p.zBot - 0.2);
    const [bx, bz] = toW(p.x1 + 0.2, p.zBot - 0.2);
    colliders.push({ id: `${b.id}-pit-back`, type: 'segment', x1: ax, z1: az, x2: bx, z2: bz, halfThickness: 0.2 });
  }
  // 樓梯井後緣的招牌
  {
    const signW = games ? 3.2 : 3.6;
    const s = add(
      new THREE.PlaneGeometry(signW, signW * 0.22),
      new THREE.MeshBasicMaterial({
        map: signTexture(games ? '↓ B1–B4 電玩展廳' : '↓ 地下展場', games ? '走下霓虹階梯或點此進入各層遊戲區' : '每一層是一類展場・走下樓梯或點這裡', games),
      }),
      pcx,
      1.55,
      p.zBot - 0.28
    );
    s.userData.noMerge = true;
    for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.08, 1.85, 0.08), mats.dark, pcx + sx * (signW * 0.48), 0.92, p.zBot - 0.32);
  }
  g.add(makePickProxy(pw, 1.6, len, pcx, p.zTop - len / 2, 0, { kind: 'goFloor', buildingId: b.id, level: -1 }, -0.6));

  // =========================================================================
  // 電玩城大廳（creative-arcade）：依參考圖三打造「中央圓柱體雙榜輪播螢幕＋周圍環繞遊戲螢幕＋霓虹圓形中庭」
  // =========================================================================
  if (games) {
    const cyberFloorMat = new THREE.MeshStandardMaterial({ color: 0x061022, roughness: 0.22, metalness: 0.78 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x0d1b33, roughness: 0.35, metalness: 0.72 });
    const neonCyan = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const neonMagenta = new THREE.MeshBasicMaterial({ color: 0xff2bd6 });
    const neonPurple = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
    const holoGlass = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: new THREE.Color(0x00a8ff),
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.28,
      roughness: 0.15,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });
    const balconyGlass = new THREE.MeshStandardMaterial({
      color: 0x00d8ff,
      emissive: new THREE.Color(0x0077cc),
      emissiveIntensity: 0.38,
      transparent: true,
      opacity: 0.36,
      roughness: 0.2,
      side: THREE.DoubleSide,
    });

    const centerZ = -0.6;
    const cylR = 2.15;

    // 1. 地面與天花板同心霓虹光環（重現參考圖三深色反光地面與天花板藍色光環）
    add(new THREE.CylinderGeometry(8.8, 8.8, 0.03, 40), cyberFloorMat, 0, 0.015, centerZ);
    for (const [r, mat] of [
      [2.85, neonCyan],
      [4.25, neonMagenta],
      [6.1, neonCyan],
      [8.2, neonPurple],
    ] as [number, THREE.Material][]) {
      add(new THREE.TorusGeometry(r, 0.045, 8, 48).rotateX(Math.PI / 2), mat, 0, 0.035, centerZ);
    }
    // 天花板大型圓環燈帶
    const ceilY = wallInner.h - 0.18;
    add(new THREE.CylinderGeometry(9.2, 9.2, 0.12, 36), darkMetal, 0, ceilY + 0.08, centerZ);
    for (const [r, mat] of [
      [2.45, neonCyan],
      [4.6, neonCyan],
      [7.2, neonMagenta],
      [8.9, neonCyan],
    ] as [number, THREE.Material][]) {
      add(new THREE.TorusGeometry(r, 0.07, 8, 48).rotateX(Math.PI / 2), mat, 0, ceilY - 0.02, centerZ);
    }

    // 2. 二樓弧形霓虹玻璃看台與左側發光旋轉階梯（重現參考圖三左側弧形發光樓梯與二樓看台）
    const mezzY = 4.15;
    const mezzRing = new THREE.RingGeometry(6.2, 9.2, 40, 1, Math.PI * 0.18, Math.PI * 1.64);
    mezzRing.rotateX(-Math.PI / 2);
    add(mezzRing, darkMetal, 0, mezzY, centerZ);
    const railArc = new THREE.CylinderGeometry(6.2, 6.2, 0.95, 40, 1, true, Math.PI * 0.18, Math.PI * 1.64);
    add(railArc, balconyGlass, 0, mezzY + 0.5, centerZ);
    const railTop = new THREE.TorusGeometry(6.2, 0.055, 8, 48, Math.PI * 1.64);
    railTop.rotateX(Math.PI / 2);
    railTop.rotateZ(Math.PI * 0.18);
    add(railTop, neonCyan, 0, mezzY + 0.98, centerZ);
    const railBot = new THREE.TorusGeometry(6.2, 0.055, 8, 48, Math.PI * 1.64);
    railBot.rotateX(Math.PI / 2);
    railBot.rotateZ(Math.PI * 0.18);
    add(railBot, neonCyan, 0, mezzY + 0.02, centerZ);

    // 左側弧形霓虹階梯（視覺裝飾，沿左弧爬升至二樓看台）
    const curveSteps = 14;
    for (let s = 0; s < curveSteps; s++) {
      const t = s / (curveSteps - 1);
      const ang = Math.PI * 0.72 + t * Math.PI * 0.48;
      const sr = 7.45;
      const sx = Math.cos(ang) * sr;
      const sz = centerZ + Math.sin(ang) * sr;
      const sy = 0.25 + t * (mezzY - 0.35);
      const stepBox = add(new THREE.BoxGeometry(1.35, 0.12, 0.52), darkMetal, sx, sy, sz);
      stepBox.rotation.y = -ang + Math.PI / 2;
      const stepEdge = add(new THREE.BoxGeometry(1.38, 0.04, 0.54), neonCyan, sx, sy + 0.07, sz);
      stepEdge.rotation.y = -ang + Math.PI / 2;
    }

    // 3. 中央圓柱體全息主螢幕（兩種排名輪播顯示在中央圓柱體螢幕）
    // 底部三階發光圓形基座
    add(new THREE.CylinderGeometry(2.65, 2.82, 0.28, 36), darkMetal, 0, 0.14, centerZ);
    add(new THREE.TorusGeometry(2.74, 0.05, 8, 40).rotateX(Math.PI / 2), neonCyan, 0, 0.28, centerZ);
    add(new THREE.CylinderGeometry(2.35, 2.52, 0.42, 36), darkMetal, 0, 0.49, centerZ);
    add(new THREE.TorusGeometry(2.42, 0.045, 8, 40).rotateX(Math.PI / 2), neonMagenta, 0, 0.7, centerZ);
    add(new THREE.CylinderGeometry(2.18, 2.26, 0.38, 36), darkMetal, 0, 0.89, centerZ);
    add(new THREE.TorusGeometry(2.22, 0.05, 8, 40).rotateX(Math.PI / 2), neonCyan, 0, 1.08, centerZ);

    // 基座上方環形音頻頻譜／數據流光帶
    const tickerMat = new THREE.MeshBasicMaterial({ map: arcadeTickerBandTexture() });
    add(new THREE.CylinderGeometry(2.2, 2.2, 0.56, 36, 1, true), tickerMat, 0, 1.38, centerZ);
    add(new THREE.TorusGeometry(2.22, 0.045, 8, 40).rotateX(Math.PI / 2), neonCyan, 0, 1.68, centerZ);

    // 圓柱體內部微縮全息賽博城市與動態光環
    const holoCore = new THREE.Group();
    holoCore.position.set(0, 1.75, centerZ);
    holoCore.userData.noMerge = true;
    g.add(holoCore);
    const cityOffsets: [number, number, number, number][] = [
      [0, 0, 0.45, 1.85],
      [-0.65, 0.42, 0.32, 1.25],
      [0.68, -0.38, 0.34, 1.4],
      [-0.48, -0.58, 0.28, 1.05],
      [0.52, 0.56, 0.3, 1.15],
      [0, 0.78, 0.24, 0.88],
    ];
    for (const [cx, cz, cw, ch] of cityOffsets) {
      add(new THREE.BoxGeometry(cw, ch, cw), holoGlass, cx, ch / 2, cz, holoCore);
      add(new THREE.BoxGeometry(cw + 0.04, 0.05, cw + 0.04), neonCyan, cx, ch, cz, holoCore);
    }
    const orbitRing1 = add(new THREE.TorusGeometry(1.42, 0.03, 8, 36), neonCyan, 0, 2.15, 0, holoCore);
    const orbitRing2 = add(new THREE.TorusGeometry(1.18, 0.025, 8, 36), neonMagenta, 0, 2.15, 0, holoCore);
    orbitRing1.rotation.x = Math.PI / 3;
    orbitRing2.rotation.y = Math.PI / 4;
    holoCore.userData.tick = (t: number) => {
      holoCore.rotation.y = t * 0.35;
      orbitRing1.rotation.z = t * 0.8;
      orbitRing2.rotation.x = t * 0.65;
    };

    // 貫穿至天花板的半透明全息光柱與頂部「IDEAX ARCADE」發光冠環
    const cylH = ceilY - 1.68;
    add(new THREE.CylinderGeometry(cylR, cylR, cylH, 36, 1, true), holoGlass, 0, 1.68 + cylH / 2, centerZ);
    const hdrMat = new THREE.MeshBasicMaterial({ map: arcadeCylinderHeaderTexture(), side: THREE.DoubleSide });
    add(new THREE.CylinderGeometry(cylR + 0.08, cylR + 0.08, 0.72, 36, 1, true), hdrMat, 0, ceilY - 0.62, centerZ);
    add(new THREE.TorusGeometry(cylR + 0.1, 0.05, 8, 40).rotateX(Math.PI / 2), neonCyan, 0, ceilY - 0.25, centerZ);
    add(new THREE.TorusGeometry(cylR + 0.1, 0.05, 8, 40).rotateX(Math.PI / 2), neonCyan, 0, ceilY - 0.98, centerZ);

    // 中央圓柱體曲面排行榜螢幕（前後雙弧面，同步輪播「精選榜 ↔ 熱度榜」兩種排名）
    const rankArcSpan = Math.PI * 0.78;
    for (const [idx, startAng] of [
      [0, -rankArcSpan / 2],
      [1, Math.PI - rankArcSpan / 2],
    ] as [number, number][]) {
      const initWhich: 'featured' | 'hot' = idx === 0 ? 'featured' : 'hot';
      const arcGeo = new THREE.CylinderGeometry(cylR + 0.06, cylR + 0.06, 3.65, 36, 1, true, startAng, rankArcSpan);
      const arcMat = new THREE.MeshBasicMaterial({
        map: drawCyberRankBoard(initWhich, []),
        transparent: true,
        side: THREE.DoubleSide,
      });
      const arcMesh = add(arcGeo, arcMat, 0, 3.82, centerZ);
      arcMesh.userData.lobbyRank = {
        buildingId: b.id,
        which: initWhich,
        carousel: true,
        phaseOffset: idx,
      };
    }
    add(new THREE.TorusGeometry(cylR + 0.08, 0.04, 8, 40).rotateX(Math.PI / 2), neonMagenta, 0, 5.66, centerZ);
    add(new THREE.TorusGeometry(cylR + 0.08, 0.04, 8, 40).rotateX(Math.PI / 2), neonCyan, 0, 1.98, centerZ);

    // 點擊中央圓柱體螢幕 → 開啟目前輪播顯示的排行榜
    g.add(makePickProxy(cylR * 2.1, 5.2, cylR * 2.1, 0, centerZ, 0, { kind: 'lobbyRank', buildingId: b.id, which: 'featured' }, 0.8));
    {
      const [wx, wz] = toW(0, centerZ);
      colliders.push({ id: `${b.id}-center-cylinder`, type: 'cylinder', x: wx, z: wz, radius: 2.55 });
    }

    // 4. 周圍螢幕（顯示上榜遊戲封面、排行名次或其他電玩內容）
    // 包含上層環繞大螢幕（6 面）與一樓左／後側電玩展示機台螢幕（2 座），共 8 面互動螢幕
    const wallSlots: {
      slot: number;
      x: number;
      y: number;
      z: number;
      ry: number;
      w: number;
      h: number;
      isConsole?: boolean;
    }[] = [
      // 後牆中央主巨幕（同時掛載 lobbyScreenImage 支援大圖與周圍上榜顯示）
      { slot: 0, x: 0, y: 4.85, z: wallInner.back + 0.22, ry: 0, w: 6.4, h: 3.5 },
      // 左後斜角霓虹螢幕
      { slot: 1, x: -6.4, y: 4.85, z: wallInner.back + 1.85, ry: Math.PI * 0.22, w: 4.4, h: 2.65 },
      // 右後斜角霓虹螢幕
      { slot: 2, x: 6.4, y: 4.85, z: wallInner.back + 1.85, ry: -Math.PI * 0.22, w: 4.4, h: 2.65 },
      // 左側牆中段大螢幕
      { slot: 3, x: -wallInner.side + 0.22, y: 4.85, z: -0.4, ry: Math.PI / 2, w: 4.8, h: 2.85 },
      // 右側牆中段大螢幕
      { slot: 4, x: wallInner.side - 0.22, y: 4.85, z: -0.4, ry: -Math.PI / 2, w: 4.8, h: 2.85 },
      // 左側牆前段螢幕
      { slot: 5, x: -wallInner.side + 0.22, y: 4.85, z: 4.2, ry: Math.PI / 2, w: 4.2, h: 2.55 },
      // 一樓左側弧形電玩展示座台螢幕（呼應參考圖三周圍一樓發光遊戲展示屏）
      { slot: 6, x: -5.4, y: 1.95, z: -2.6, ry: Math.PI * 0.32, w: 3.2, h: 2.0, isConsole: true },
      { slot: 7, x: -5.4, y: 1.95, z: 2.2, ry: Math.PI * 0.65, w: 3.2, h: 2.0, isConsole: true },
    ];

    for (const ws of wallSlots) {
      const frameHolder = new THREE.Group();
      frameHolder.position.set(ws.x, ws.y, ws.z);
      frameHolder.rotation.y = ws.ry;
      frameHolder.userData.noMerge = true;
      g.add(frameHolder);

      const borderMat = ws.slot % 2 === 1 ? neonMagenta : neonCyan;
      add(new THREE.BoxGeometry(ws.w + 0.28, ws.h + 0.28, 0.1), borderMat, 0, 0, -0.04, frameHolder);
      add(new THREE.BoxGeometry(ws.w + 0.14, ws.h + 0.14, 0.12), darkMetal, 0, 0, 0, frameHolder);

      const screenMesh = add(
        new THREE.PlaneGeometry(ws.w, ws.h),
        new THREE.MeshBasicMaterial({
          map: drawArcadeWallScreenTexture(ws.slot, null, `TOP #${ws.slot + 1}`, null),
        }),
        0,
        0,
        0.08,
        frameHolder
      );
      screenMesh.userData.arcadeWallScreen = { buildingId: b.id, slot: ws.slot };

      if (ws.isConsole) {
        add(new THREE.BoxGeometry(ws.w * 0.82, 1.05, 0.65), darkMetal, 0, -ws.h / 2 - 0.48, -0.1, frameHolder);
        add(new THREE.BoxGeometry(ws.w * 0.86, 0.06, 0.72), borderMat, 0, -ws.h / 2 - 0.02, -0.1, frameHolder);
      }

      g.add(
        makePickProxy(
          ws.w + 0.3,
          ws.h + 0.3,
          0.6,
          ws.x,
          ws.z,
          ws.ry,
          { kind: 'lobbyScreen', buildingId: b.id, slot: ws.slot } as any,
          ws.y - ws.h / 2
        )
      );
    }

    return { group: g, colliders };
  }

  // =========================================================================
  // 展覽館大廳（creative-exhibition）：保留進門正對面大螢幕輪播＋左右牆精選榜與熱度榜
  // =========================================================================
  const sw = Math.min(14, b.width * 0.56);
  const sh = sw * 0.5;
  const sy = Math.max(3.6, Math.min(wallInner.h - sh / 2 - 1.0, 1.8 + sh / 2 + 0.9));
  const sz = wallInner.back + 0.04;
  add(new THREE.BoxGeometry(sw + 0.6, sh + 0.6, 0.12), mats.gold, 0, sy, sz - 0.02);
  add(new THREE.BoxGeometry(sw + 0.3, sh + 0.3, 0.14), mats.dark, 0, sy, sz);
  const img = add(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ color: 0x2a1a10 }), 0, sy, sz + 0.09);
  img.userData.lobbyScreenImage = { buildingId: b.id };
  const cap = add(
    new THREE.PlaneGeometry(sw, sw * (300 / 1280)),
    new THREE.MeshBasicMaterial({ map: drawScreenCaption(null, games, 0, 0, ''), transparent: true }),
    0,
    sy - sh / 2 + (sw * (300 / 1280)) / 2,
    sz + 0.1
  );
  cap.userData.lobbyScreenCaption = { buildingId: b.id };
  g.add(makePickProxy(sw, sh, 0.4, 0, sz + 0.2, 0, { kind: 'lobbyScreen', buildingId: b.id }, sy - sh / 2));
  {
    const s = add(
      new THREE.PlaneGeometry(sw * 0.5, sw * 0.5 * 0.215),
      new THREE.MeshBasicMaterial({ map: signTexture('提案與軟體・精選熱度', '和首頁同一份榜單') }),
      0,
      sy + sh / 2 + 0.75,
      sz + 0.06
    );
    s.userData.noMerge = true;
  }

  // ---- 左牆精選榜、右牆熱度榜 ----
  const isExh = b.exterior === 'exhibition';
  const maxBh = Math.max(4.8, wallInner.h - (isExh ? 2.2 : 1.5));
  const rawBw = Math.min(b.depth * (isExh ? 0.34 : 0.42), 8);
  const bh = Math.min(rawBw * (1100 / 900), maxBh);
  const bw = bh * (900 / 1100);
  const by = 1.15 + bh / 2;
  const rankZ = isExh ? -b.depth * 0.18 : -b.depth * 0.04;
  for (const [sx, which] of [
    [-1, 'featured'],
    [1, 'hot'],
  ] as [number, 'featured' | 'hot'][]) {
    const x = sx * (wallInner.side - 0.08);
    add(new THREE.BoxGeometry(0.12, bh + 0.36, bw + 0.36), mats.gold, x - sx * 0.04, by, rankZ);
    const m = add(
      new THREE.PlaneGeometry(bw, bh),
      new THREE.MeshBasicMaterial({
        map: drawRankBoard(which === 'featured' ? '精選榜' : '熱度榜', 'TOP 10', [], games, which === 'featured' ? '#9a6a12' : '#8e2420'),
      }),
      x - sx * 0.14,
      by,
      rankZ
    );
    m.rotation.y = -sx * (Math.PI / 2);
    m.userData.lobbyRank = { buildingId: b.id, which };
    g.add(makePickProxy(0.5, bh, bw, x - sx * 0.32, rankZ, 0, { kind: 'lobbyRank', buildingId: b.id, which }, by - bh / 2));
  }
  return { group: g, colliders };
}

export { isFloorsHall };
