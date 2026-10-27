import * as THREE from 'three';
import type { Question } from '../../../types';
import type { BuildingInteractable, Collider } from '../types';
import { isGameQuestion, getEffectiveTertiaryCategory } from '../../../utils/gameClassification';
import { makePickProxy } from '../picking';
import { mergeByMaterial } from './architecture';
import { FLOOR_H } from './multiStory';

/**
 * 展覽館、電玩城的「地下主展場」與藏書閣的「地下圖書館」：
 * - 展覽館／電玩城：依展區分成幾條走道，每個攤位擺一件平台上真實的作品
 * - 藏書閣：地下一樓是一座大型分類圖書館，四條走道對應四層分類（一層・資訊工程閣、二層・經世商道閣、三層・自然生命閣、四層・人文哲思閣），
 *   成排高聳古籍木書架陳列各類討論典籍，點擊書架即可閱覽該分類討論
 */

export const HALL = {
  /** 預設中心（各館可由 HALL_BUILDINGS 指定各自島嶼地底座標） */
  cx: -68,
  cz: 48,
  W: 44,
  D: 38,
  /** 地板高度：地下一樓 */
  Y: -FLOOR_H,
  /** 室內淨高（天花板在海面以下，不會被海面切到） */
  H: 3.95,
  booths: 8, // 每條走道每一側的攤位／書架數
};

export type HallKind = 'exhibit' | 'arcade' | 'library';

export interface HallZone {
  key: string;
  name: string;
  sub: string;
  color: number;
  match: (q: Question) => boolean;
}

const visible = (q: Question) => q.status !== 'delisted' && !(q as any).isDelisted;
const isAi = (q: Question) => q.subcategory === 'AI工具' || (Array.isArray((q as any).subcategories) && (q as any).subcategories.includes('AI工具'));
const genreIn = (list: string[]) => (q: Question) => {
  if (!isGameQuestion(q)) return false;
  try {
    return list.includes(getEffectiveTertiaryCategory(q));
  } catch {
    return false;
  }
};

const isDisc = (q: Question) => q.postType === 'chat_discussion' || (!q.postType && !isGameQuestion(q));
const discMatch = (re: RegExp, fallbackCat?: string) => (q: Question) => {
  if (!isDisc(q)) return false;
  const hay = `${q.title || ''} ${q.description || ''} ${q.category || ''} ${q.subcategory || ''} ${(q.tags || []).join(' ')}`;
  if (re.test(hay)) return true;
  return Boolean(fallbackCat && q.category === fallbackCat);
};

export const HALL_ZONES: Record<HallKind, HallZone[]> = {
  exhibit: [
    { key: 'ai', name: 'AI 工具展場', sub: '生成式 AI、智慧自動化與 AI 應用', color: 0x2f6bb3, match: (q) => q.postType === 'vibecoding_app' && !isGameQuestion(q) && isAi(q) },
    { key: 'app', name: '軟體應用展場', sub: '網站、App 與各類軟體作品', color: 0x2c8a62, match: (q) => q.postType === 'vibecoding_app' && !isGameQuestion(q) && !isAi(q) },
    { key: 'proposal', name: '創新提案展場', sub: '大家發表的創新提案', color: 0xb3261e, match: (q) => q.postType === 'innovation_proposal' },
  ],
  arcade: [
    { key: 'casual', name: '休閒同樂展區', sub: '休閒派對、親子兒童、甜蜜浪漫', color: 0xd9822b, match: genreIn(['休閒派對', '親子兒童', '甜蜜浪漫']) },
    { key: 'puzzle', name: '益智解謎展區', sub: '策略益智、卡牌桌遊、解謎劇情', color: 0x6b4a8a, match: genreIn(['策略益智', '卡牌桌遊', '解謎劇情']) },
    { key: 'action', name: '冒險競技展區', sub: '多人冒險、競技對戰', color: 0x2c6a62, match: genreIn(['多人冒險', '競技對戰']) },
    { key: 'sim', name: '模擬驚悚展區', sub: '模擬體驗、恐怖驚悚', color: 0x8e2420, match: genreIn(['模擬體驗', '恐怖驚悚']) },
  ],
  library: [
    {
      key: 'lib-1f',
      name: '一層・資訊工程閣',
      sub: '演算法、系統架構、軟體開發與 AI 典籍書架',
      color: 0x1e5670,
      match: discMatch(/資訊|工程|技術|演算法|AI|人工智慧|架構|計算|代碼|程式|前端|後端|全端|系統|軟體|網站|資料庫|雲端/i, '網站程式'),
    },
    {
      key: 'lib-2f',
      name: '二層・經世商道閣',
      sub: '經濟模型、商業經營、職場策略與產業典籍書架',
      color: 0x8c5319,
      match: discMatch(/商業|經濟|管理|金融|行銷|市場|策略|經營|創業|職場|工作|求職|職涯|產品|營運/i, '商業職場'),
    },
    {
      key: 'lib-3f',
      name: '三層・自然生命閣',
      sub: '生醫科學、自然物理、硬體感測與前瞻材料書架',
      color: 0x23694e,
      match: discMatch(/生醫|醫學|健康|自然|物理|化學|生命|科學|材料|硬體|物聯網|晶片|感測|綠能|環境/i, '專業問題'),
    },
    {
      key: 'lib-4f',
      name: '四層・人文哲思閣',
      sub: '哲學思辨、文史藝術、生活感悟與日常隨筆書架',
      color: 0x6b3a5b,
      match: (q) => isDisc(q),
    },
  ],
};

/** 每棟有地下主展場／地下圖書館的建築 */
export const HALL_BUILDINGS: Record<string, { kind: HallKind; title: string; lobby: string; cx: number; cz: number }> = {
  'creative-exhibition': { kind: 'exhibit', title: '展覽館・地下主展場', lobby: '一樓大廳', cx: -68, cz: 48 },
  'creative-arcade': { kind: 'arcade', title: '電玩城・地下主展場', lobby: '一樓大廳', cx: -68, cz: 48 },
  'discussion-library': { kind: 'library', title: '藏書閣・地下圖書館', lobby: '一樓大廳', cx: 72, cz: -48 },
};

export const hallOf = (buildingId: string | null | undefined) => (buildingId ? HALL_BUILDINGS[buildingId] || null : null);

const time = (q: Question) => Date.parse(q.createdAt) || 0;

/** 某個展區／書庫分類要擺的作品或討論（最新的在前） */
export function hallZoneItems(buildingId: string, zone: number, questions: Question[]): Question[] {
  const h = hallOf(buildingId);
  const z = h && HALL_ZONES[h.kind][zone];
  if (!z) return [];
  return questions.filter((q) => visible(q) && z.match(q)).sort((a, b) => time(b) - time(a));
}

/** 展區走道中心（世界座標 x） */
function aisleX(buildingId: string, zone: number) {
  const h = hallOf(buildingId);
  const kind = h ? h.kind : 'exhibit';
  const cx = h ? h.cx : HALL.cx;
  const n = HALL_ZONES[kind].length;
  return cx - HALL.W / 2 + ((zone + 0.5) * HALL.W) / n;
}

/** 走到某個展區／書架走道的入口（或剛下樓的位置）：位置與面向（yaw 0 面向 -Z＝往深處） */
export function hallArrival(buildingId: string, zone?: number) {
  const h = hallOf(buildingId);
  const zi = zone !== undefined && zone >= 0 ? zone : h ? Math.floor((HALL_ZONES[h.kind].length - 1) / 2) : 0;
  const x = h ? aisleX(buildingId, zi) : HALL.cx;
  const cz = h ? h.cz : HALL.cz;
  return { x, y: HALL.Y, z: cz + HALL.D / 2 - 4.3, yaw: 0 };
}

export function insideHall(x: number, z: number) {
  return Object.values(HALL_BUILDINGS).some((h) => Math.abs(x - h.cx) < HALL.W / 2 && Math.abs(z - h.cz) < HALL.D / 2);
}

/* ---------------- 攤位／書架典籍看板（畫在畫布上，使用標楷體／書法字體） ---------------- */

const KAI_FONT = '"DFKai-SB","BiauKai","Kaiti TC","STKaiti","KaiTi","LXGW WenKai TC","CWTeXKai","Noto Serif TC",serif';
const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const out: string[] = [];
  let line = '';
  for (const ch of Array.from(text)) {
    if (ctx.measureText(line + ch).width > maxW) {
      out.push(line);
      line = ch;
      if (out.length === maxLines) break;
    } else line += ch;
  }
  if (out.length < maxLines && line) out.push(line);
  if (out.length === maxLines && out.join('').length < text.length) out[maxLines - 1] = out[maxLines - 1].slice(0, -1) + '…';
  return out;
}

export function drawBoothTexture(zoneName: string, color: number, q: Question | null, more = 0) {
  const isLib = zoneName.includes('層・');
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 384;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = isLib ? '#f4e8ca' : '#f6ecd6';
  ctx.fillRect(0, 0, 512, 384);
  ctx.fillStyle = hex(color);
  ctx.fillRect(0, 0, 512, 62);
  ctx.strokeStyle = 'rgba(120,80,30,0.65)';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 506, 378);
  ctx.fillStyle = '#fff9de';
  ctx.font = `900 30px ${KAI_FONT}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(zoneName, 22, 32);
  ctx.textBaseline = 'alphabetic';
  if (!q) {
    ctx.fillStyle = '#755a38';
    ctx.textAlign = 'center';
    ctx.font = `900 38px ${KAI_FONT}`;
    ctx.fillText(isLib ? '待藏典籍書架' : '空攤位', 256, 190);
    ctx.font = `700 26px ${KAI_FONT}`;
    ctx.fillText(isLib ? '歡迎發起此分類討論' : '歡迎上架作品', 256, 236);
  } else {
    const badge = isLib
      ? '典藏討論'
      : q.postType === 'innovation_proposal'
      ? '創新提案'
      : isGameQuestion(q)
      ? '遊戲作品'
      : isAi(q)
      ? 'AI 工具'
      : '軟體作品';
    ctx.font = `700 22px ${KAI_FONT}`;
    const bw = ctx.measureText(badge).width + 24;
    ctx.fillStyle = 'rgba(179,38,30,0.92)';
    ctx.beginPath();
    ctx.roundRect(22, 82, bw, 34, 8);
    ctx.fill();
    ctx.fillStyle = '#fff6d6';
    ctx.fillText(badge, 34, 107);
    ctx.fillStyle = '#24140a';
    ctx.font = `900 35px ${KAI_FONT}`;
    const title = ((q as any).appName || q.title || '（未命名）').trim();
    wrapLines(ctx, title, 468, 2).forEach((l, i) => ctx.fillText(l, 22, 166 + i * 46));
    ctx.fillStyle = '#4e3a25';
    ctx.font = `700 23px ${KAI_FONT}`;
    const desc = String(q.description || '').replace(/[#*_>`\[\]()]/g, '').replace(/\s+/g, ' ').trim();
    wrapLines(ctx, desc, 468, 2).forEach((l, i) => ctx.fillText(l, 22, 268 + i * 32));
    ctx.fillStyle = '#7c5d30';
    ctx.font = `700 22px ${KAI_FONT}`;
    const views = q.viewsCount ?? q.views ?? 0;
    ctx.fillText(`${q.authorName || ''}${views ? `　閱覽 ${views}` : ''}`.trim(), 22, 360);
    if (more > 0) {
      ctx.textAlign = 'right';
      ctx.fillStyle = hex(color);
      ctx.fillText(`還有 ${more} ${isLib ? '冊' : '件'} →`, 490, 360);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function drawZoneSignTexture(name: string, count: number, color: number) {
  const isLib = name.includes('層・');
  const c = document.createElement('canvas');
  c.width = 768;
  c.height = 144;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = hex(color);
  ctx.fillRect(0, 0, 768, 144);
  ctx.strokeStyle = '#f5ca5c';
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 756, 132);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 54px ${KAI_FONT}`;
  ctx.strokeStyle = '#0d0401';
  ctx.lineWidth = 8;
  ctx.strokeText(name, 384, 58);
  ctx.fillStyle = '#fffbe0';
  ctx.fillText(name, 384, 58);
  ctx.font = `700 28px ${KAI_FONT}`;
  ctx.fillStyle = '#ffe89e';
  ctx.fillText(
    count > 0
      ? `典藏 ${count} ${isLib ? '冊討論' : '件作品'}`
      : isLib
      ? '書架開放中・歡迎發起討論'
      : '尚無作品・歡迎上架',
    384,
    114
  );
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function plainSign(text: string, sub: string, w = 1024, h = 192, bg = '#220e06') {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#f5ca5c';
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, w - 12, h - 12);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.round(h * 0.36)}px ${KAI_FONT}`;
  const ty = sub ? h * 0.4 : h / 2;
  ctx.strokeStyle = '#090301';
  ctx.lineWidth = 8;
  ctx.strokeText(text, w / 2, ty);
  ctx.fillStyle = '#fffbe0';
  ctx.fillText(text, w / 2, ty);
  if (sub) {
    ctx.font = `700 ${Math.round(h * 0.18)}px ${KAI_FONT}`;
    ctx.fillStyle = '#ffe596';
    ctx.fillText(sub, w / 2, h * 0.78);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function tileTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      const v = 150 + ((i + j) % 2) * 14 + Math.floor(Math.random() * 8);
      ctx.fillStyle = `rgb(${v},${v - 12},${v - 30})`;
      ctx.fillRect(i * 64, j * 64, 64, 64);
    }
  ctx.strokeStyle = 'rgba(80,60,40,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 64, 0);
    ctx.lineTo(i * 64, 256);
    ctx.moveTo(0, i * 64);
    ctx.lineTo(256, i * 64);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(HALL.W / 4, HALL.D / 4);
  return t;
}

/* ---------------- 地下主展場／藏書閣地下圖書館 ---------------- */

const lit = (color: number, glow = 0.32) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, emissive: new THREE.Color(color), emissiveIntensity: glow });

function box(parent: THREE.Object3D, w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}

export function createExhibitHall(b: BuildingInteractable): THREE.Group | null {
  const h = hallOf(b.id);
  if (!h) return null;
  const isLib = h.kind === 'library';
  const zones = HALL_ZONES[h.kind];
  const root = new THREE.Group();
  root.name = `hall_${b.id}`;
  root.visible = false;
  root.userData.hallId = b.id;
  const stat = new THREE.Group();
  root.add(stat);
  const { W, D, Y, H } = HALL;
  const cx = h.cx;
  const cz = h.cz;
  const colliders: Collider[] = [];
  const seg = (id: string, x1: number, z1: number, x2: number, z2: number, t = 0.3) => colliders.push({ id: `${b.id}-hall-${id}`, type: 'segment', x1, z1, x2, z2, halfThickness: t });

  const wallMat = lit(h.kind === 'arcade' ? 0x3a3150 : isLib ? 0xefe3c8 : 0xe8dcc2, 0.28);
  const trimMat = lit(isLib ? 0x432614 : 0x5a3a22, 0.25);
  const shelfWoodMat = lit(0x63391d, 0.26);
  const ceilMat = lit(h.kind === 'arcade' ? 0x241f33 : 0x4a3424, 0.3);
  const goldMat = lit(0xd8a945, 0.4);
  const counterMat = lit(0x9e2a22, 0.3);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffc46b });
  const bookMats = [
    lit(0x1f4e68, 0.28),
    lit(0x882921, 0.28),
    lit(0x2d5e45, 0.28),
    lit(0xb58536, 0.32),
    lit(0x523961, 0.28),
    lit(0xd8c398, 0.32),
  ];

  // 地板（磨石地磚）、天花板、四面牆
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: tileTexture(), roughness: 0.6, emissive: new THREE.Color(0x2a2016), emissiveIntensity: 0.6 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, Y + 0.01, cz);
  floor.userData.noMerge = true;
  root.add(floor);
  const ceil = box(stat, W, 0.2, D, ceilMat, cx, Y + H + 0.1, cz);
  ceil.userData.noMerge = true;
  box(stat, W + 0.6, H, 0.3, wallMat, cx, Y + H / 2, cz - D / 2 - 0.15);
  box(stat, W + 0.6, H, 0.3, wallMat, cx, Y + H / 2, cz + D / 2 + 0.15);
  box(stat, 0.3, H, D, wallMat, cx - W / 2 - 0.15, Y + H / 2, cz);
  box(stat, 0.3, H, D, wallMat, cx + W / 2 + 0.15, Y + H / 2, cz);
  // 牆腳與樑
  for (const s of [-1, 1]) {
    box(stat, W, 0.3, 0.1, trimMat, cx, Y + 0.15, cz + s * (D / 2 - 0.02));
    box(stat, 0.1, 0.3, D, trimMat, cx + s * (W / 2 - 0.02), Y + 0.15, cz);
  }
  for (let i = 1; i < 6; i++) box(stat, W, 0.32, 0.36, trimMat, cx, Y + H - 0.16, cz - D / 2 + (i * D) / 6);
  seg('n', cx - W / 2, cz - D / 2, cx + W / 2, cz - D / 2);
  seg('s', cx - W / 2, cz + D / 2, cx + W / 2, cz + D / 2);
  seg('w', cx - W / 2, cz - D / 2, cx - W / 2, cz + D / 2);
  seg('e', cx + W / 2, cz - D / 2, cx + W / 2, cz + D / 2);

  // 北牆大匾額
  {
    const subText = isLib
      ? '四大樓層分類書庫・成排古籍書架分門別類・點書架即可研讀討論'
      : '一個攤位一件真實作品・點攤位就能看';
    const m = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 1.75), new THREE.MeshBasicMaterial({ map: plainSign(h.title, subText) }));
    m.position.set(cx, Y + 2.7, cz - D / 2 + 0.02);
    m.userData.noMerge = true;
    root.add(m);
  }

  // 圖書館四周牆壁：沿東西兩側牆面增設整排頂天立地藏書壁櫃，營造宏偉地下書庫感
  if (isLib) {
    for (const side of [-1, 1]) {
      const wx = cx + side * (W / 2 - 0.32);
      for (let k = 0; k < 7; k++) {
        const wz = cz - D / 2 + 4.2 + k * 4.4;
        box(stat, 0.42, 3.35, 3.6, trimMat, wx, Y + 1.68, wz);
        for (let lv = 0; lv < 5; lv++) {
          const sy = Y + 0.35 + lv * 0.64;
          box(stat, 0.46, 0.06, 3.5, shelfWoodMat, wx, sy, wz);
          for (let bIdx = 0; bIdx < 5; bIdx++) {
            const bz = wz - 1.3 + bIdx * 0.65;
            box(stat, 0.32, 0.46, 0.42, bookMats[(k + lv + bIdx) % bookMats.length], wx - side * 0.06, sy + 0.26, bz);
          }
        }
      }
    }
  }

  // 南側：回一樓的大樓梯（往上走進牆裡）
  const stairW = 4.2;
  const stairZ1 = cz + D / 2;
  const stepMat = lit(0x8a7a66, 0.3);
  for (let i = 0; i < 9; i++) {
    const sh = (i + 1) * 0.42;
    box(stat, stairW, sh, 0.34, stepMat, cx, Y + sh / 2, stairZ1 - 3.1 + i * 0.34);
  }
  for (const s of [-1, 1]) box(stat, 0.22, 2.2, 3.2, trimMat, cx + s * (stairW / 2 + 0.11), Y + 1.1, stairZ1 - 1.6);
  {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.9), new THREE.MeshBasicMaterial({ map: plainSign('↑ 上樓・回一樓大廳', '', 1024, 200, '#8e2420') }));
    m.position.set(cx, Y + H - 0.75, stairZ1 - 3.4);
    m.userData.noMerge = true;
    root.add(m);
  }
  colliders.push({ id: `${b.id}-hall-stair`, type: 'box', x: cx, z: stairZ1 - 1.55, halfWidth: stairW / 2 + 0.25, halfDepth: 1.6 });
  root.add(makePickProxy(stairW + 0.6, 3.2, 3.4, cx, stairZ1 - 1.6, 0, { kind: 'goFloor', buildingId: b.id, level: 0 }, Y));

  // 展區／分類書架走道：每條走道兩側攤位或高聳木書架
  const n = zones.length;
  const zoneW = W / n;
  const rowOff = zoneW / 2 - 1.55;
  const z0 = cz - D / 2 + 3.2;
  const pitch = 3.45;
  zones.forEach((zone, zi) => {
    const ax = aisleX(b.id, zi);
    const zMat = lit(zone.color, 0.35);
    // 走道地毯
    const rug = box(stat, 2.6, 0.02, D - 9, zMat, ax, Y + 0.02, cz - 2.5);
    rug.userData.noMerge = true;
    // 走道入口的展區／樓層分類招牌（掛在天花板下，數量會跟著更新）
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.98), new THREE.MeshBasicMaterial({ map: drawZoneSignTexture(zone.name, 0, zone.color) }));
    sign.position.set(ax, Y + H - 0.72, cz + D / 2 - 8.6);
    sign.userData.noMerge = true;
    sign.userData.hallSign = { buildingId: b.id, zone: zi };
    root.add(sign);
    for (const s of [-1, 1]) box(stat, 0.05, 0.3, 0.05, goldMat, ax + s * 2.4, Y + H - 0.1, cz + D / 2 - 8.6);
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < HALL.booths; i++) {
        // 順序：從走道入口（南側）往裡，左右交錯擺
        const idx = (HALL.booths - 1 - i) * 2 + (side < 0 ? 0 : 1);
        const bx = ax + side * rowOff;
        const bz = z0 + i * pitch;
        const g = new THREE.Group();
        g.position.set(bx, Y, bz);
        g.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; // 面向走道

        if (isLib) {
          // 藏書閣地下圖書館：每座為高聳五層古典木製大書架，上下層擺滿古籍書冊與卷軸，中層鑲嵌書法典籍牌
          box(g, 3.05, 3.35, 0.16, trimMat, 0, 1.68, -0.45); // 書架背板
          for (const sx of [-1, 1]) {
            box(g, 0.16, 3.4, 0.86, trimMat, sx * 1.48, 1.7, -0.1); // 左右書架立柱
          }
          // 書架頂部雕花橫楣與分類色帶
          box(g, 3.22, 0.18, 0.96, zMat, 0, 3.42, -0.08);
          box(g, 3.26, 0.08, 1.0, goldMat, 0, 3.3, -0.08);
          // 五層橫隔板
          for (const sy of [0.18, 0.78, 1.38, 2.58, 3.12]) {
            box(g, 2.96, 0.07, 0.82, shelfWoodMat, 0, sy, -0.1);
          }
          // 底層與頂層擺放成排古籍書冊（立放與疊放交錯）
          for (let k = 0; k < 7; k++) {
            const bookX = -1.18 + k * 0.39;
            const bm1 = bookMats[(zi + i + k) % bookMats.length];
            const bm2 = bookMats[(zi + i + k + 2) % bookMats.length];
            // 第一層（下層）書冊
            box(g, 0.28, 0.48, 0.56, bm1, bookX, 0.46, -0.1);
            // 第二層書冊
            box(g, 0.3, 0.46, 0.54, bm2, bookX, 1.05, -0.1);
            // 頂層書冊
            box(g, 0.28, 0.42, 0.54, bm1, bookX, 2.83, -0.1);
          }
          // 書架前方矮閱覽案几
          box(g, 2.2, 0.68, 0.46, shelfWoodMat, 0, 0.34, 0.42);
          box(g, 2.3, 0.05, 0.52, goldMat, 0, 0.7, 0.42);
          // 書架暖光小宮燈
          const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), lampMat);
          lamp.position.set(0, 3.18, 0.38);
          g.add(lamp);
          // 中央鑲嵌典籍討論看板
          const card = new THREE.Mesh(new THREE.PlaneGeometry(2.55, 1.15), new THREE.MeshBasicMaterial({ map: drawBoothTexture(zone.name, zone.color, null) }));
          card.position.set(0, 1.98, -0.35);
          card.userData.noMerge = true;
          card.userData.hallBooth = { buildingId: b.id, zone: zi, index: idx };
          card.userData.pick = { kind: 'booth', buildingId: b.id, zone: zi, index: idx };
          g.add(card);
        } else {
          // 展覽館／電玩城：背板、攤位頂棚、櫃台
          box(g, 3.0, 2.7, 0.14, trimMat, 0, 1.35, -0.55);
          box(g, 3.2, 0.14, 1.5, zMat, 0, 2.78, -0.05);
          box(g, 3.2, 0.32, 0.06, goldMat, 0, 2.62, 0.7);
          box(g, 2.6, 0.92, 0.7, counterMat, 0, 0.46, 0.38);
          box(g, 2.7, 0.06, 0.78, goldMat, 0, 0.95, 0.38);
          for (const sx of [-1, 1]) box(g, 0.1, 2.7, 0.1, trimMat, sx * 1.52, 1.35, 0.62);
          const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), lampMat);
          lamp.position.set(0, 2.5, 0.4);
          g.add(lamp);
          const card = new THREE.Mesh(new THREE.PlaneGeometry(2.55, 1.9), new THREE.MeshBasicMaterial({ map: drawBoothTexture(zone.name, zone.color, null) }));
          card.position.set(0, 1.85, -0.47);
          card.userData.noMerge = true;
          card.userData.hallBooth = { buildingId: b.id, zone: zi, index: idx };
          card.userData.pick = { kind: 'booth', buildingId: b.id, zone: zi, index: idx };
          g.add(card);
        }

        stat.add(g);
        colliders.push({ id: `${b.id}-hall-booth-${zi}-${idx}`, type: 'box', x: bx + side * 0.05, z: bz, halfWidth: 0.85, halfDepth: 1.62 });
        // 點整座書架或櫃台都算點選該格
        root.add(makePickProxy(1.6, 3.2, 3.2, bx + side * 0.05, bz, 0, { kind: 'booth', buildingId: b.id, zone: zi, index: idx }, Y));
      }
    }
    // 走道上方的燈籠
    for (let k = 0; k < 5; k++) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.5, 12), new THREE.MeshBasicMaterial({ color: k % 2 ? 0xff9a4a : 0xffc46b }));
      l.position.set(ax, Y + H - 0.75, z0 + 1.5 + k * 6);
      stat.add(l);
    }
  });
  stat.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = false;
      m.receiveShadow = false;
    }
  });
  floor.receiveShadow = false;
  mergeByMaterial(stat, false);
  root.userData.hallColliders = colliders;
  return root;
}

/**
 * 一樓大廳的「下樓口」：取代原本的寶珠台，圍欄＋往下的階梯＋招牌，點了就下到地下主展場／地下圖書館
 */
export function createHallStairEntrance(b: BuildingInteractable, deskZ: number): THREE.Group {
  const h = hallOf(b.id);
  const isLib = h?.kind === 'library';
  const g = new THREE.Group();
  const dark = new THREE.MeshBasicMaterial({ color: 0x120c08 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x8a7a66, roughness: 0.9 });
  const rail = new THREE.MeshStandardMaterial({ color: 0x9e2a22, roughness: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd8a945, roughness: 0.45, metalness: 0.3 });
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5).rotateX(-Math.PI / 2), dark);
  hole.position.set(0, 0.06, deskZ);
  g.add(hole);
  // 看起來往下的階梯（一階比一階暗）
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8a7a66).multiplyScalar(0.8 - i * 0.18) }));
    s.position.set(0, 0.07, deskZ + 0.55 - i * 0.32);
    g.add(s);
  }
  // 三面圍欄（面向大門那側開口）
  const add = (w: number, h0: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
    const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h0, d), m);
    mm.position.set(x, y, z);
    g.add(mm);
  };
  add(1.8, 0.12, 1.8, stone, 0, 0.0, deskZ);
  add(1.8, 0.08, 0.08, rail, 0, 0.9, deskZ - 0.86);
  for (const sx of [-1, 1]) {
    add(0.08, 0.08, 1.75, rail, sx * 0.86, 0.9, deskZ);
    for (const sz of [-1, 0, 1]) add(0.08, 0.9, 0.08, rail, sx * 0.86, 0.45, deskZ + sz * 0.84);
  }
  // 招牌
  const tex = plainSign(
    isLib ? '地下圖書館 ↓' : '地下主展場 ↓',
    isLib ? '點這裡下樓・四層分類書架' : '點這裡下樓',
    768,
    220,
    isLib ? '#17493d' : '#8e2420'
  );
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.6), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  sign.position.set(0, 2.15, deskZ - 0.86);
  g.add(sign);
  for (const sx of [-1, 1]) add(0.07, 2.4, 0.07, gold, sx * 0.86, 1.2, deskZ - 0.86);
  g.traverse((o) => (o.userData.noMerge = true));
  g.add(makePickProxy(2.0, 2.6, 2.0, 0, deskZ, 0, { kind: 'goFloor', buildingId: b.id, level: -1 }));
  return g;
}

