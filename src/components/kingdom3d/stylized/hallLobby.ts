import * as THREE from 'three';
import type { BuildingInteractable, Collider } from '../types';
import type { Question } from '../../../types';
import { makePickProxy } from '../picking';
import { localToWorldXZ } from '../regionConfigs';
import { hallOf, isFloorsHall } from './exhibitHall';

/**
 * 展覽館、電玩城的一樓大廳：
 * - 中央一座很寬的氣派大樓梯往下（走進樓梯口或點樓梯就下樓）
 * - 進門正對的牆：精選榜＋熱度榜作品的大螢幕輪播（圖片／封面／影片縮圖，畫面上寫名稱、類型、作者、簡述）
 * - 左牆：精選榜排名；右牆：熱度榜排名（和首頁同一份榜單）
 */

const KAI = '"DFKai-SB","BiauKai","Kaiti TC","STKaiti","KaiTi","LXGW WenKai TC","CWTeXKai","Noto Serif TC",serif';

/** 大樓梯井（建築本地座標）：x 寬、z 從靠門那端（zTop）往裡（zBot）下降 */
export function lobbyPit(b: Pick<BuildingInteractable, 'width' | 'depth'>) {
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
    // 榜別徽章
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
  // 輪播點
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

/** 左右牆的排行榜 */
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
    const title = ((q as any).appName || q.title || '（未命名）').trim();
    ctx.fillText(title, 128, y - 14, 740);
    ctx.fillStyle = '#d9c39a';
    ctx.font = `700 25px ${KAI}`;
    ctx.fillText(`${typeLabel(q, games)}・${q.authorName || '—'}`, 130, y + 24, 740);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function signTexture(text: string, sub: string) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 220;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#8e2420';
  ctx.fillRect(0, 0, 1024, 220);
  ctx.strokeStyle = '#f5ca5c';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 1008, 204);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fffbe0';
  ctx.font = `900 84px ${KAI}`;
  ctx.fillText(text, 512, 92);
  ctx.fillStyle = '#ffe596';
  ctx.font = `700 36px ${KAI}`;
  ctx.fillText(sub, 512, 176);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * 大廳裝置（建築本地座標，加在建築 root 底下）。
 * 回傳的 colliders 是世界座標（樓梯井兩側與後面的欄杆）
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

  // ---- 大樓梯井（地面以下的部分另外放一個群組：人在地下展廳時要藏起來）----
  const p = lobbyPit(b);
  const pw = p.x1 - p.x0;
  const len = p.zTop - p.zBot;
  const pit = new THREE.Group();
  pit.userData.lobbyPit = b.id;
  g.add(pit);
  const steps = 14;
  for (let i = 0; i < steps; i++) {
    const top = -((i + 1) / steps) * (p.depth - 0.4);
    const zz = p.zTop - ((i + 0.5) * len) / steps;
    add(new THREE.BoxGeometry(pw - 0.3, 0.24, len / steps + 0.02), mats.stone, 0, top - 0.12, zz, pit);
    // 階梯正中的紅毯
    add(new THREE.BoxGeometry(pw * 0.36, 0.02, len / steps + 0.03), mats.red, 0, top + 0.01, zz, pit);
  }
  // 井的兩側、後牆、底
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.3, p.depth, len + 0.3), mats.stone, sx * (pw / 2 + 0.15), -p.depth / 2, p.zTop - len / 2 - 0.15, pit);
  add(new THREE.BoxGeometry(pw + 0.6, p.depth, 0.3), mats.stone, 0, -p.depth / 2, p.zBot - 0.15, pit);
  add(new THREE.BoxGeometry(pw + 0.6, 0.2, 0.3), mats.stone, 0, -p.depth - 0.1, p.zTop + 0.15, pit);
  // 樓梯底端的拱門（通往地下展廳）
  const arch = add(new THREE.PlaneGeometry(pw * 0.55, 2.4), new THREE.MeshBasicMaterial({ color: 0x0c0705 }), 0, -p.depth + 1.25, p.zBot + 0.02, pit);
  arch.userData.noMerge = true;
  add(new THREE.BoxGeometry(pw * 0.55 + 0.5, 0.3, 0.2), mats.gold, 0, -p.depth + 2.6, p.zBot + 0.1, pit);
  // 井口邊緣石條與欄杆（兩側＋後面；靠門那端是樓梯口，不圍）
  for (const sx of [-1, 1]) {
    add(new THREE.BoxGeometry(0.5, 0.14, len + 0.5), mats.stone, sx * (pw / 2 + 0.2), 0.07, p.zTop - len / 2 - 0.2);
    add(new THREE.BoxGeometry(0.1, 0.1, len + 0.2), mats.red, sx * (pw / 2 + 0.2), 1.0, p.zTop - len / 2 - 0.1);
    for (let k = 0; k <= 6; k++) add(new THREE.BoxGeometry(0.12, 1.0, 0.12), mats.red, sx * (pw / 2 + 0.2), 0.5, p.zTop - (k / 6) * (len + 0.2));
    // 樓梯口兩側的大燈柱
    add(new THREE.CylinderGeometry(0.14, 0.18, 2.4, 10), mats.dark, sx * (pw / 2 + 0.2), 1.2, p.zTop + 0.05);
    const lamp = add(new THREE.SphereGeometry(0.3, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff8a3a }), sx * (pw / 2 + 0.2), 2.62, p.zTop + 0.05);
    lamp.scale.set(1, 1.25, 1);
    add(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 10), mats.gold, sx * (pw / 2 + 0.2), 2.98, p.zTop + 0.05);
    add(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 10), mats.gold, sx * (pw / 2 + 0.2), 2.26, p.zTop + 0.05);
    const [ax, az] = toW(sx * (pw / 2 + 0.2), p.zTop + 0.1);
    const [bx, bz] = toW(sx * (pw / 2 + 0.2), p.zBot - 0.2);
    colliders.push({ id: `${b.id}-pit-${sx}`, type: 'segment', x1: ax, z1: az, x2: bx, z2: bz, halfThickness: 0.2 });
  }
  add(new THREE.BoxGeometry(pw + 0.9, 0.14, 0.5), mats.stone, 0, 0.07, p.zBot - 0.2);
  add(new THREE.BoxGeometry(pw + 0.5, 0.1, 0.1), mats.red, 0, 1.0, p.zBot - 0.2);
  {
    const [ax, az] = toW(p.x0 - 0.2, p.zBot - 0.2);
    const [bx, bz] = toW(p.x1 + 0.2, p.zBot - 0.2);
    colliders.push({ id: `${b.id}-pit-back`, type: 'segment', x1: ax, z1: az, x2: bx, z2: bz, halfThickness: 0.2 });
  }
  // 樓梯井後緣的招牌（面向大門，在大螢幕下方，不擋視線）
  {
    const s = add(new THREE.PlaneGeometry(3.6, 3.6 * 0.215), new THREE.MeshBasicMaterial({ map: signTexture('↓ 地下展場', '每一層是一類展場・走下樓梯或點這裡') }), 0, 1.55, p.zBot - 0.28);
    s.userData.noMerge = true;
    for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.1, 1.9, 0.1), mats.dark, sx * 1.85, 0.95, p.zBot - 0.32);
  }
  // 點樓梯就下樓
  g.add(makePickProxy(pw, 1.6, len, 0, p.zTop - len / 2, 0, { kind: 'goFloor', buildingId: b.id, level: -1 }, -0.6));

  // ---- 進門正對的牆：大螢幕輪播 ----
  const sw = Math.min(14, b.width * 0.56);
  const sh = sw * 0.5;
  const sy = Math.max(3.6, Math.min(wallInner.h - sh / 2 - 1.0, 1.8 + sh / 2 + 0.9));
  const sz = wallInner.back + 0.04;
  add(new THREE.BoxGeometry(sw + 0.6, sh + 0.6, 0.12), mats.gold, 0, sy, sz - 0.02);
  add(new THREE.BoxGeometry(sw + 0.3, sh + 0.3, 0.14), mats.dark, 0, sy, sz);
  const img = add(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ color: 0x2a1a10 }), 0, sy, sz + 0.09);
  img.userData.lobbyScreenImage = { buildingId: b.id };
  const cap = add(new THREE.PlaneGeometry(sw, sw * (300 / 1280)), new THREE.MeshBasicMaterial({ map: drawScreenCaption(null, games, 0, 0, ''), transparent: true }), 0, sy - sh / 2 + (sw * (300 / 1280)) / 2, sz + 0.1);
  cap.userData.lobbyScreenCaption = { buildingId: b.id };
  g.add(makePickProxy(sw, sh, 0.4, 0, sz + 0.2, 0, { kind: 'lobbyScreen', buildingId: b.id }, sy - sh / 2));
  // 螢幕上方匾額
  {
    const s = add(new THREE.PlaneGeometry(sw * 0.5, sw * 0.5 * 0.215), new THREE.MeshBasicMaterial({ map: signTexture(games ? '遊戲精選・熱度' : '提案與軟體・精選熱度', '和首頁同一份榜單') }), 0, sy + sh / 2 + 0.75, sz + 0.06);
    s.userData.noMerge = true;
  }

  // ---- 左牆精選榜、右牆熱度榜 ----
  const bw = Math.min(b.depth * 0.42, 8);
  const bh = bw * (1100 / 900);
  const by = Math.max(2.0 + bh / 2, Math.min(wallInner.h - bh / 2 - 0.8, 1.6 + bh / 2));
  for (const [sx, which] of [[-1, 'featured'], [1, 'hot']] as [number, 'featured' | 'hot'][]) {
    const x = sx * (wallInner.side - 0.05);
    add(new THREE.BoxGeometry(0.12, bh + 0.4, bw + 0.4), mats.gold, x - sx * 0.02, by, -b.depth * 0.04);
    const m = add(
      new THREE.PlaneGeometry(bw, bh),
      new THREE.MeshBasicMaterial({ map: drawRankBoard(which === 'featured' ? '精選榜' : '熱度榜', 'TOP 10', [], games, which === 'featured' ? '#9a6a12' : '#8e2420') }),
      x - sx * 0.1,
      by,
      -b.depth * 0.04
    );
    m.rotation.y = -sx * (Math.PI / 2);
    m.userData.lobbyRank = { buildingId: b.id, which };
    g.add(makePickProxy(0.5, bh, bw, x - sx * 0.3, -b.depth * 0.04, 0, { kind: 'lobbyRank', buildingId: b.id, which }, by - bh / 2));
  }
  return { group: g, colliders };
}

export { isFloorsHall };
