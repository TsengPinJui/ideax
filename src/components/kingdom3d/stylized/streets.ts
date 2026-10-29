import * as THREE from 'three';
import type { Collider, RegionId } from '../types';
import { localToWorldXZ, getGlobalWalkableZones, REGION_CONFIGS } from '../regionConfigs';
import { getStyleMaterials, scaledBox, buildRoofTier, mergeByMaterial, LanternBatch, RoofTheme } from './architecture';
import { makePickProxy } from '../picking';
import { awningTexture, shopInteriorTexture, signboardTexture, bannerTexture, ShopKind } from './textures';

/**
 * 主島商店街與創意島「薈萃廣場」市集：兩層樓的街屋店面、條紋布棚攤位、牌坊與顧店的掌櫃。
 * 店面只是街景（不能走進去），四周都有碰撞，玩家不會穿過去。
 */

export type StallContent =
  | 'new'
  | 'proposal'
  | 'game'
  | 'app'
  | 'hot'
  | 'tea_daily'
  | 'tea_life'
  | 'tea_work'
  | 'tea_idea'
  | 'tea_board'
  | 'craft_plumbing'
  | 'craft_interior'
  | 'craft_law'
  | 'craft_tax'
  | 'craft_mgmt'
  | 'craft_board';

export interface StreetProp {
  id: string;
  regionId: RegionId;
  kind: 'shop' | 'stall' | 'gate' | 'seat' | 'board';
  /** 白牆黛瓦（討論島的鋪子、茶莊） */
  style?: 'huizhou';
  /** 點了之後左側面板的說明 */
  note?: string;
  name: string;
  sub?: string;
  goods: ShopKind;
  /** 市集攤位或街區店鋪對應的討論／作品內容（點店鋪會在左側列出） */
  content?: StallContent;
  /** 空鋪（預留給合作夥伴）：不擺掌櫃與貨品，招牌寫「歡迎掌櫃進駐」 */
  vacant?: boolean;
  /** 已進駐的合作掌櫃（點了可前往體驗／遊玩，開新分頁到對方網站） */
  partner?: StallPartner;
  x: number;
  z: number;
  yaw: number;
  w: number;
  d: number;
}

/** 合作掌櫃（薈萃廣場攤位、貿易街店鋪進駐後填入） */
export interface StallPartner {
  name: string;
  sub?: string;
  kind: 'game' | 'proposal' | 'service';
  /** 點「前往體驗／遊玩」開啟的網址（新分頁） */
  url?: string;
  note?: string;
}

/**
 * 已進駐的掌櫃：key 是攤位／店鋪 id（例如 'region-creative-stall-0'、'region-home-shop-0'）。
 * 目前都還是空鋪，有合作夥伴進駐時在這裡加上即可。
 */
export const STALL_PARTNERS: Record<string, StallPartner> = {};

const TRADE_NOTE =
  '貿易街由一整排商鋪組成，預留給合作商進駐：未來可以用平台點數，在這裡直接兌換合作商的服務內容（尚未開放）。歡迎掌櫃進駐！';
const MARKET_NOTE =
  '薈萃廣場的攤位預留給合作夥伴（遊戲或提案）進駐：會在這裡刊登，並享有更客製化的攤位場景，點擊遊玩或體驗會直接連到掌櫃的網站。歡迎掌櫃進駐！';

const withPartner = (p: StreetProp, note: string): StreetProp => {
  const partner = STALL_PARTNERS[p.id];
  return partner
    ? { ...p, name: partner.name, sub: partner.sub || p.sub, partner, vacant: false, note: partner.note || note }
    : { ...p, vacant: true, note };
};

/** 讓本地 +Z（店面正面）朝向島中心 */
function faceCenter(x: number, z: number, cx: number, cz: number) {
  return Math.atan2(cx - x, cz - z);
}

function ringProps(
  regionId: RegionId,
  kind: 'shop' | 'stall',
  w: number,
  d: number,
  inset: number | ((rx: number, rz: number) => [number, number]),
  list: { deg: number; name: string; sub: string; goods: ShopKind; content?: StallContent }[]
): StreetProp[] {
  const r = REGION_CONFIGS[regionId];
  const [cx, cz] = r.center;
  const ell = getGlobalWalkableZones().find((zn) => zn.type === 'ellipse' && Math.abs(zn.cx - cx) < 0.5 && Math.abs(zn.cz - cz) < 0.5);
  const rx = ell && ell.type === 'ellipse' ? ell.rx : r.islandRadiusX;
  const rz = ell && ell.type === 'ellipse' ? ell.rz : r.islandRadiusZ;
  const [ax, az] = typeof inset === 'number' ? [rx - inset, rz - inset] : inset(rx, rz);
  return list.map((it, i) => {
    const a = (it.deg * Math.PI) / 180;
    const x = cx + Math.cos(a) * ax;
    const z = cz + Math.sin(a) * az;
    return { id: `${regionId}-${kind}-${i}`, regionId, kind, name: it.name, sub: it.sub, goods: it.goods, content: it.content, x, z, yaw: faceCenter(x, z, cx, cz), w, d };
  });
}

/**
 * 主島：貿易街＝西、東、北三段商鋪（避開四座拱橋）
 * 每間都預留給合作商：未來可用平台點數直接兌換合作商的服務（尚未開放），目前是空鋪「歡迎掌櫃進駐」
 */
const TRADE_NUMS = ['壹', '貳', '參', '肆', '伍', '陸', '柒', '捌', '玖', '拾', '拾壹'];
const HOME_SHOPS = ringProps(
  'region-home',
  'shop',
  6,
  4.4,
  3.0,
  // 180°（西）與 270°（北）留給渡口
  [163, 197, -17, 0, 17, 240, 255, 285, 300].map((deg, i) => ({
    deg,
    name: `貿易街・${TRADE_NUMS[i]}號鋪`,
    sub: '歡迎掌櫃進駐',
    goods: (['crafts', 'books', 'toys', 'lanterns', 'ink', 'sweets', 'general', 'tea', 'books'] as ShopKind[])[i],
  }))
).map((p) => withPartner(p, TRADE_NOTE));

/** 創意島北側：薈萃廣場市集（五個攤位＋牌坊）——預留給合作夥伴（遊戲或提案）進駐 */
const CREATIVE_STALLS = ringProps('region-creative', 'stall', 3.6, 2.4, (rx, rz) => [rx * 0.76, rz * 0.76], [
  { deg: -124, name: '一號攤', sub: '歡迎掌櫃進駐', goods: 'sweets' },
  { deg: -107, name: '二號攤', sub: '歡迎掌櫃進駐', goods: 'ink' },
  { deg: -90, name: '三號攤', sub: '歡迎掌櫃進駐', goods: 'toys' },
  { deg: -73, name: '四號攤', sub: '歡迎掌櫃進駐', goods: 'crafts' },
  { deg: -56, name: '五號攤', sub: '歡迎掌櫃進駐', goods: 'lanterns' },
]).map((p) => withPartner({ ...p, z: p.z - 4.5 }, MARKET_NOTE));

/** 主島北面：貿易街牌坊（原本的貿易街單棟拿掉，改成一整排商鋪） */
const TRADE_GATE: StreetProp = {
  id: 'region-home-gate',
  regionId: 'region-home',
  kind: 'gate',
  name: '貿易街',
  sub: '點數兌換・合作商鋪（籌備中）',
  goods: 'general',
  x: 0,
  z: -19.2,
  yaw: 0,
  w: 7.6,
  d: 1.2,
  note: TRADE_NOTE,
};

const CREATIVE_GATE: StreetProp = (() => {
  const [cx, cz] = REGION_CONFIGS['region-creative'].center;
  return { id: 'region-creative-gate', regionId: 'region-creative', kind: 'gate', name: '薈萃廣場', sub: '市集・攤販・活動', goods: 'general', x: cx, z: cz - 19, yaw: 0, w: 7.6, d: 1.2 };
})();

/**
 * 討論島（三個分明的區塊構成一個整體街區）：
 * 1. 西區・茶藝街（x = 48..63，南北向真正的一條街，南端牌樓入口 x=55.8, z=-28，兩側茶莊、茶攤與露天茶座夾道相對）
 * 2. 東區・百工坊街（x = 80..97：左側白牆一排百工佈告欄〔水電、室內裝修、法律智財、會計稅務、企業管理、百業熱議〕，右側大熊匠鋪）
 * 3. 北區・藏書閣（x = 72, z = -65，坐鎮北端，地下室為大型分類書架圖書館）
 */
const DISC = (
  id: string,
  kind: StreetProp['kind'],
  name: string,
  sub: string,
  goods: ShopKind,
  x: number,
  z: number,
  yaw: number,
  content?: StallContent,
  note?: string,
  customW?: number,
  customD?: number
): StreetProp => ({
  id: `region-discussion-${id}`,
  regionId: 'region-discussion',
  kind,
  name,
  sub,
  goods,
  content,
  x,
  z,
  yaw,
  w: customW ?? (kind === 'gate' ? 7.4 : kind === 'seat' ? 2.5 : kind === 'board' ? 2.8 : kind === 'stall' ? 3.6 : 5.4),
  d: customD ?? (kind === 'gate' ? 1.2 : kind === 'seat' ? 2.5 : kind === 'board' ? 0.65 : kind === 'stall' ? 2.4 : 4.0),
  style: kind === 'shop' ? 'huizhou' : undefined,
  note,
});

const CRAFT_NOTE = '百工坊街：左手邊白牆上一排百工佈告欄，依水電、室內裝修、法律智財、會計稅務、企業管理分類張貼討論；右手邊是大熊匠鋪，牆上月洞門通往論道廣場。';
const CRAFT_BOARD_NOTE = '百工坊街左側白牆邊的佈告欄：張貼各分類最新與熱議討論，點擊即可直接閱讀或發起新討論。';
const TEA_NOTE = '茶藝街兩側茶莊與茶座林立，每個主題為一間茶館、每則討論為一張茶桌，店門亦輪播熱門茶話。';
const TEA_BOARD_NOTE = '茶藝街街道佈告欄：張貼日常交流、生活慢調、職場江湖與靈感悟道討論。';

const DISCUSSION_PROPS: StreetProp[] = [
  // ── 西區：茶藝街（南北向軸線石板長街 x = 55.8，北端由主建築「茶藝街主茶樓 (55.8,-60.2)」坐鎮，兩側茶莊、春毫茶攤與漫天彩燈）
  DISC('tea-gate', 'gate', '茶藝街', '日常・生活・職場・靈感', 'tea', 55.8, -28.0, 0, 'tea_daily', TEA_NOTE),
  // 西側北端：清茗茶莊（朝東 Math.PI / 2，避開西南側過橋上岸動線）
  DISC('tea-0', 'shop', '清茗茶莊', '日常交流茶館', 'tea', 49.4, -51.0, Math.PI / 2, 'tea_daily', TEA_NOTE),
  // 東側一排雙層黛瓦茶樓（朝西 -Math.PI / 2）
  DISC('tea-1', 'shop', '雅韻茶樓', '生活慢調茶館', 'tea', 62.2, -35.0, -Math.PI / 2, 'tea_life', TEA_NOTE),
  DISC('tea-2', 'shop', '龍井茶寮', '職場江湖茶館', 'tea', 62.2, -43.0, -Math.PI / 2, 'tea_work', TEA_NOTE),
  DISC('tea-3', 'shop', '茗香茶點', '靈感悟道茶館', 'sweets', 62.2, -51.0, -Math.PI / 2, 'tea_idea', TEA_NOTE),
  // 西側中段：春毫茶攤（與清茗茶莊同列茶藝街五大茶館／茶攤標籤）
  DISC('tea-stall-0', 'stall', '春毫茶攤', '新茶試飲・日常閒聊', 'tea', 49.4, -41.0, Math.PI / 2, 'tea_daily', TEA_NOTE),
  // 街心油紙傘露天茶座
  DISC('tea-seat-0', 'seat', '露天茶座', '茶藝街・品茗論道', 'tea', 55.8, -36.5, 0, 'tea_life', TEA_NOTE),
  DISC('tea-seat-1', 'seat', '露天茶座', '茶藝街・品茗論道', 'tea', 55.8, -44.5, 0, 'tea_idea', TEA_NOTE),
  DISC('tea-seat-2', 'seat', '露天茶座', '茶藝街・品茗論道', 'tea', 55.8, -52.5, 0, 'tea_work', TEA_NOTE),
  DISC('tea-board-0', 'board', '茶街討論欄・日常生活', '街道佈告欄・張貼日常與生活討論', 'tea', 52.2, -30.8, Math.PI / 2, 'tea_board', TEA_BOARD_NOTE, 2.7, 0.62),
  DISC('tea-board-1', 'board', '茶街討論欄・職場靈感', '街道佈告欄・張貼職場與靈感討論', 'tea', 59.4, -30.8, -Math.PI / 2, 'tea_work', TEA_BOARD_NOTE, 2.7, 0.62),

  // ── 東區：百工坊街（右手邊是大熊匠鋪〔建築 discussion-workshop〕，左手邊白牆上一排百工佈告欄，街心淨空）
  DISC('craft-gate', 'gate', '百工坊', '百工佈告欄・大熊匠鋪', 'general', 88.2, -28.0, 0, 'craft_board', CRAFT_NOTE),

  // ── 百工坊街左側白牆邊的佈告欄（原本立在鋪子之間會擋路，改成貼牆一排；面向街道）
  DISC('craft-board-0', 'board', '百工佈告欄・水電實務', '白牆佈告欄・張貼水電討論', 'general', 81.05, -33.5, Math.PI / 2, 'craft_plumbing', CRAFT_BOARD_NOTE, 2.75, 0.62),
  DISC('craft-board-1', 'board', '百工佈告欄・室內裝修', '白牆佈告欄・張貼裝修討論', 'crafts', 81.05, -36.7, Math.PI / 2, 'craft_interior', CRAFT_BOARD_NOTE, 2.75, 0.62),
  DISC('craft-board-2', 'board', '百工佈告欄・法律智財', '白牆佈告欄・張貼法務討論', 'books', 81.05, -39.9, Math.PI / 2, 'craft_law', CRAFT_BOARD_NOTE, 2.75, 0.62),
  DISC('craft-board-3', 'board', '百工佈告欄・會計稅務', '白牆佈告欄・張貼財稅討論', 'ink', 81.05, -43.1, Math.PI / 2, 'craft_tax', CRAFT_BOARD_NOTE, 2.75, 0.62),
  DISC('craft-board-4', 'board', '百工佈告欄・企業管理', '白牆佈告欄・張貼企管討論', 'lanterns', 81.05, -50.0, Math.PI / 2, 'craft_mgmt', CRAFT_BOARD_NOTE, 2.75, 0.62),
  DISC('craft-board-5', 'board', '百工佈告欄・百業熱議', '白牆佈告欄・張貼綜合討論', 'general', 81.05, -53.4, Math.PI / 2, 'craft_board', CRAFT_BOARD_NOTE, 2.75, 0.62),
];

export const STREET_PROPS: Record<RegionId, StreetProp[]> = {
  'region-home': [...HOME_SHOPS, TRADE_GATE],
  'region-pain': [],
  'region-discussion': DISCUSSION_PROPS,
  'region-creative': [...CREATIVE_STALLS, CREATIVE_GATE],
  'region-career': [],
};

/** 地圖與島上裝飾要避開的範圍 */
export function streetAvoidAreas(regionId: RegionId) {
  return STREET_PROPS[regionId].map((p) => ({ x: p.x, z: p.z, r: Math.max(p.w, p.d) / 2 + 1.2 }));
}

/* ------------------------------------------------------------------ */

interface StreetMats {
  skin: THREE.MeshStandardMaterial;
  robes: THREE.MeshStandardMaterial[];
  hat: THREE.MeshStandardMaterial;
  fruits: THREE.MeshStandardMaterial[];
  shelves: Map<string, THREE.MeshStandardMaterial>;
  awnings: Map<string, THREE.MeshStandardMaterial>;
  signs: Map<string, THREE.MeshStandardMaterial>;
  banners: Map<string, THREE.MeshStandardMaterial>;
}

let streetMats: StreetMats | null = null;

function mats(): StreetMats {
  if (streetMats) return streetMats;
  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.02, ...p });
  streetMats = {
    skin: std({ color: 0xf1c9a5, roughness: 0.7 }),
    robes: [0x2f5675, 0x8e2420, 0x3f6b4a, 0x6b4a8a].map((c) => std({ color: c, roughness: 0.85 })),
    hat: std({ color: 0x241712, roughness: 0.7 }),
    fruits: [0xe8742a, 0xc62828, 0x7fae3a, 0xf2c94c].map((c) => std({ color: c, roughness: 0.5 })),
    shelves: new Map(),
    awnings: new Map(),
    signs: new Map(),
    banners: new Map(),
  };
  return streetMats;
}

function cachedMat(map: Map<string, THREE.MeshStandardMaterial>, key: string, make: () => THREE.MeshStandardMaterial) {
  let m = map.get(key);
  if (!m) {
    m = make();
    map.set(key, m);
  }
  return m;
}

export function disposeStreetMaterials() {
  if (!streetMats) return;
  const s = streetMats;
  [s.skin, s.hat, ...s.robes, ...s.fruits, ...s.shelves.values(), ...s.awnings.values(), ...s.signs.values(), ...s.banners.values()].forEach((m) => m.dispose());
  streetMats = null;
}

const AWNINGS: [string, string][] = [
  ['#b3261e', '#f1e2bf'],
  ['#2c6a62', '#f1e2bf'],
  ['#c9842a', '#f6e7c4'],
  ['#6b4a8a', '#f1e2bf'],
  ['#2f5675', '#f6e7c4'],
];

function add(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, ry = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function signMesh(title: string, sub: string | undefined, w: number, h: number) {
  const sm = getStyleMaterials();
  const signMat = cachedMat(mats().signs, `${title}|${sub || ''}`, () => {
    const tex = signboardTexture(title, sub);
    return new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.58, roughness: 0.45, metalness: 0.12 });
  });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), [sm.darkWood, sm.darkWood, sm.darkWood, sm.darkWood, signMat, sm.darkWood]);
  m.userData.noMerge = true;
  return m;
}

/** 顧店的掌櫃（簡單的長袍人偶，會輕輕擺動由外部控制，這裡只建模型） */
function addKeeper(parent: THREE.Object3D, x: number, y: number, z: number, seed: number) {
  const m = mats();
  const robe = m.robes[seed % m.robes.length];
  add(parent, new THREE.CylinderGeometry(0.2, 0.34, 1.1, 12), robe, x, y + 0.55, z);
  add(parent, new THREE.SphereGeometry(0.24, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), robe, x, y + 1.08, z);
  add(parent, new THREE.CylinderGeometry(0.07, 0.08, 0.12, 8), m.skin, x, y + 1.3, z);
  add(parent, new THREE.SphereGeometry(0.16, 14, 12), m.skin, x, y + 1.48, z);
  // 髮髻／帽
  if (seed % 2) add(parent, new THREE.CylinderGeometry(0.1, 0.17, 0.14, 12), m.hat, x, y + 1.62, z);
  else add(parent, new THREE.SphereGeometry(0.09, 10, 8), m.hat, x, y + 1.66, z - 0.04);
  // 兩隻手搭在櫃檯上
  for (const s of [-1, 1]) {
    const arm = add(parent, new THREE.CylinderGeometry(0.06, 0.07, 0.5, 8), robe, x + s * 0.27, y + 0.98, z + 0.16);
    arm.rotation.x = -0.7;
  }
}

function rectColliders(p: StreetProp, pad = 0): Collider[] {
  const hw = p.w / 2 + pad;
  const hd = p.d / 2 + pad;
  const corners: [number, number][] = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]];
  return corners.map(([lx, lz], i) => {
    const [x1, z1] = localToWorldXZ(p.x, p.z, p.yaw, lx, lz);
    const [nx, nz] = corners[(i + 1) % 4];
    const [x2, z2] = localToWorldXZ(p.x, p.z, p.yaw, nx, nz);
    return { id: `${p.id}-c${i}`, type: 'segment', x1, z1, x2, z2, halfThickness: 0.2 } as Collider;
  });
}

const KAI_FONT = '"DFKai-SB","BiauKai","Kaiti TC","STKaiti","KaiTi","LXGW WenKai TC","CWTeXKai","Noto Serif TC",serif';

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
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
    lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1) + '…';
  }
  return lines;
}

/** 店鋪門前「熱門討論輪播」走馬燈看板貼圖（每隔數秒切換顯示該類店鋪的熱門討論） */
export function drawShopCarouselTexture(
  shopName: string,
  categorySub: string,
  item: { title?: string; authorName?: string; subcategory?: string; category?: string; views?: number; replies?: number } | null,
  slideIdx: number,
  totalSlides: number
): THREE.CanvasTexture {
  const W = 960;
  const H = 260;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  // 烏木朱漆邊框與宣紙底色
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#2d140c');
  bg.addColorStop(0.5, '#1e0c07');
  bg.addColorStop(1, '#2d140c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#f2c94c';
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, W - 12, H - 12);
  ctx.strokeStyle = 'rgba(242,201,76,0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, W - 32, H - 32);

  // 頂部朱紅鎏金標題橫條
  const hdr = ctx.createLinearGradient(20, 20, W - 20, 20);
  hdr.addColorStop(0, '#9c1f18');
  hdr.addColorStop(0.5, '#b82920');
  hdr.addColorStop(1, '#8a1913');
  ctx.fillStyle = hdr;
  ctx.fillRect(20, 20, W - 40, 54);
  ctx.strokeStyle = '#f6d36b';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, W - 40, 54);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = `900 30px ${KAI_FONT}`;
  ctx.fillStyle = '#fff8dc';
  ctx.fillText(`🔥 ${shopName}・熱門討論輪播`, 36, 48);

  // 右上輪播圓點與頁數
  const count = Math.max(1, Math.min(6, totalSlides));
  const cur = slideIdx % count;
  ctx.textAlign = 'right';
  ctx.font = `700 24px ${KAI_FONT}`;
  ctx.fillStyle = '#fde68a';
  const dots = Array.from({ length: count }, (_, i) => (i === cur ? '●' : '○')).join(' ');
  ctx.fillText(`${dots}  (${cur + 1}/${count})`, W - 34, 48);

  if (!item) {
    ctx.textAlign = 'center';
    ctx.font = `700 34px ${KAI_FONT}`;
    ctx.fillStyle = '#f6e7c4';
    ctx.fillText(`歡迎蒞臨${shopName}，點擊店鋪發起第一則「${categorySub}」討論！`, W / 2, 152);
  } else {
    // 熱門討論主標題（高對比描邊＋暖金書法字）
    ctx.textAlign = 'left';
    ctx.font = `900 36px ${KAI_FONT}`;
    const lines = wrapLines(ctx, item.title || '（未命名討論）', W - 80, 2);
    lines.forEach((ln, idx) => {
      const y = lines.length === 1 ? 132 : 114 + idx * 44;
      ctx.lineWidth = 7;
      ctx.strokeStyle = '#0d0401';
      ctx.strokeText(ln, 40, y);
      ctx.fillStyle = '#fff9de';
      ctx.fillText(ln, 40, y);
    });

    // 底部資訊列：分類標籤、作者、熱度與討論數
    const tag = item.subcategory || item.category || categorySub || '熱門討論';
    ctx.fillStyle = 'rgba(242,201,76,0.22)';
    ctx.fillRect(38, H - 58, 168, 34);
    ctx.strokeStyle = '#f2c94c';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(38, H - 58, 168, 34);
    ctx.textAlign = 'center';
    ctx.font = `800 22px ${KAI_FONT}`;
    ctx.fillStyle = '#fde047';
    ctx.fillText(tag.slice(0, 6), 122, H - 40);

    ctx.textAlign = 'left';
    ctx.font = `700 23px ${KAI_FONT}`;
    ctx.fillStyle = '#f3e2b8';
    if (item.authorName) ctx.fillText(`掌燈人：${item.authorName.slice(0, 10)}`, 224, H - 40);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`👁 熱度 ${item.views ?? 0}   💬 討論 ${item.replies ?? 0}   [點擊店鋪詳閱]`, W - 36, H - 40);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export interface StreetBoardCard {
  id: string;
  title: string;
  tag?: string;
  author?: string;
  meta?: string;
}

/** 街道旁兩排佈告欄貼圖：木板上張貼著各種討論紙條 */
export function drawStreetDiscussionBoardTexture(boardTitle: string, cards: StreetBoardCard[]): THREE.CanvasTexture {
  const W = 960;
  const H = 540;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#542e19');
  g.addColorStop(1, '#361c0e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 2;
  for (let y = 24; y < H; y += 38) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#d4a637';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, W - 16, H - 16);

  // 頂部標題橫欄
  ctx.fillStyle = '#8f231b';
  ctx.fillRect(24, 22, W - 48, 60);
  ctx.strokeStyle = '#f2c94c';
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 22, W - 48, 60);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = `900 32px ${KAI_FONT}`;
  ctx.fillStyle = '#fff6d1';
  ctx.fillText(`📜 ${boardTitle}（點擊佈告欄查看／張貼討論）`, W / 2, 53);

  const list = cards.slice(0, 4);
  if (!list.length) {
    ctx.fillStyle = '#f6e7c4';
    ctx.font = `700 34px ${KAI_FONT}`;
    ctx.fillText('此佈告欄尚待張貼新話題，點擊即可發起討論！', W / 2, H / 2 + 24);
  } else {
    const cols = 2;
    const rows = 2;
    const padX = 28;
    const topY = 96;
    const cw = (W - padX * 2) / cols;
    const ch = (H - topY - 22) / rows;

    list.forEach((card, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = padX + col * cw;
      const y = topY + row * ch;
      ctx.save();
      ctx.translate(x + cw / 2, y + ch / 2);
      ctx.rotate(((i * 29) % 5 - 2) * 0.005);

      ctx.fillStyle = '#f7ebd2';
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 8;
      ctx.fillRect(-cw / 2 + 12, -ch / 2 + 8, cw - 24, ch - 16);
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#c49a52';
      ctx.lineWidth = 2;
      ctx.strokeRect(-cw / 2 + 18, -ch / 2 + 14, cw - 36, ch - 28);

      // 朱砂圖釘
      ctx.fillStyle = '#b3261e';
      ctx.beginPath();
      ctx.arc(0, -ch / 2 + 22, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#241409';
      ctx.font = `900 27px ${KAI_FONT}`;
      const lines = wrapLines(ctx, card.title || '（未命名討論）', cw - 64, 2);
      lines.forEach((ln, k) => ctx.fillText(ln, -cw / 2 + 30, -ch / 2 + 58 + k * 36));

      ctx.font = `700 20px ${KAI_FONT}`;
      ctx.fillStyle = '#8f231b';
      ctx.fillText(`【${(card.tag || '討論').slice(0, 6)}】${(card.author || '').slice(0, 8)}`, -cw / 2 + 28, ch / 2 - 28);

      if (card.meta) {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#6b4423';
        ctx.font = `700 20px ${KAI_FONT}`;
        ctx.fillText(card.meta, cw / 2 - 28, ch / 2 - 28);
      }
      ctx.restore();
    });
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** 兩層樓的街屋店面：一樓開敞的櫃檯與貨架，二樓木構立面，腰簷＋歇山小屋頂 */
function buildShop(p: StreetProp, root: THREE.Group, lanterns: LanternBatch, toWorld: (o: THREE.Object3D, x: number, y: number, z: number) => THREE.Vector3): Collider[] {
  const sm = getStyleMaterials();
  const m = mats();
  const g = new THREE.Group();
  g.position.set(p.x, 0, p.z);
  g.rotation.y = p.yaw;
  root.add(g);
  g.updateMatrixWorld(true);
  const { w, d } = p;
  const hv = hash(p.id);
  const H1 = 3.0;
  const H2 = 2.3;
  const pl = 0.3;
  const themes: RoofTheme[] = ['slate', 'teal', 'red', 'slate'];
  const theme = p.style === 'huizhou' ? 'slate' : themes[hv % themes.length];
  const facade = p.style === 'huizhou' ? creamMat() : sm.facades[hv % sm.facades.length];

  add(g, scaledBox(w + 0.3, pl, d + 0.3, 2, pl, 2), sm.stone, 0, pl / 2, 0);
  add(g, scaledBox(w - 0.5, 0.05, d - 0.5, 2.5, 0.05, 2.5), sm.woodFloor, 0, pl + 0.025, 0);
  // 後牆、側牆、二樓正面
  add(g, scaledBox(w, H1 + H2, 0.3, 3.2, H1 + H2, 3.2), facade, 0, pl + (H1 + H2) / 2, -d / 2 + 0.15);
  for (const s of [-1, 1]) add(g, scaledBox(0.3, H1 + H2, d, 3.2, H1 + H2, 3.2), facade, s * (w / 2 - 0.15), pl + (H1 + H2) / 2, 0);
  add(g, scaledBox(w, H2, 0.3, 3.2, H2 * 1.4, 3.2), facade, 0, pl + H1 + H2 / 2, d / 2 - 0.15);
  // 樓板樑、紅柱、一樓天花
  add(g, scaledBox(w + 0.2, 0.32, 0.42, 3, 0.32, 3), sm.redLacquer, 0, pl + H1, d / 2 - 0.1);
  for (const s of [-1, 1]) add(g, new THREE.CylinderGeometry(0.17, 0.19, H1 + H2, 10), sm.redLacquer, s * (w / 2 - 0.05), pl + (H1 + H2) / 2, d / 2 - 0.02);
  add(g, new THREE.BoxGeometry(w - 0.6, 0.12, d - 0.6), sm.darkWood, 0, pl + H1 - 0.08, 0);
  // 貨架牆
  const shelf = cachedMat(m.shelves, p.goods, () => new THREE.MeshStandardMaterial({ map: shopInteriorTexture(p.goods), roughness: 0.8, emissive: 0xffffff, emissiveMap: shopInteriorTexture(p.goods), emissiveIntensity: 0.18 }));
  add(g, new THREE.PlaneGeometry(w - 0.75, H1 - 0.45), shelf, 0, pl + (H1 - 0.45) / 2 + 0.12, -d / 2 + 0.32);
  // 櫃檯
  add(g, new THREE.BoxGeometry(w - 1.3, 1.0, 0.6), sm.darkWood, 0, pl + 0.5, d / 2 - 0.6);
  add(g, new THREE.BoxGeometry(w - 1.1, 0.08, 0.76), sm.redLacquer, 0, pl + 1.04, d / 2 - 0.6);
  if (p.vacant) {
    // 空鋪：櫃檯上立「歡迎掌櫃進駐」小牌
    const tag = signMesh('歡迎掌櫃進駐', '招商中', 1.6, 0.52);
    tag.position.set(0, pl + 1.4, d / 2 - 0.58);
    g.add(tag);
  } else {
    // 櫃檯上的貨：陶罐、木盒
    for (let k = 0; k < 4; k++) {
      const x = -w / 2 + 1.2 + (k * (w - 2.4)) / 3;
      if (k % 2) add(g, new THREE.CylinderGeometry(0.13, 0.17, 0.32, 10), sm.pot, x, pl + 1.24, d / 2 - 0.62);
      else add(g, new THREE.BoxGeometry(0.34, 0.2, 0.26), sm.gold, x, pl + 1.18, d / 2 - 0.6);
    }
    addKeeper(g, (hv % 3) - 1, pl, d / 2 - 1.35, hv);
  }
  // 腰簷（一、二樓之間的披簷）
  const eave = new THREE.BoxGeometry(w + 1.0, 0.14, 1.35).rotateX(0.36);
  add(g, eave, sm.roofs[theme], 0, pl + H1 + 0.32, d / 2 + 0.5);
  add(g, new THREE.BoxGeometry(w + 1.0, 0.16, 0.16), sm.ridges[theme], 0, pl + H1 + 0.08, d / 2 + 1.12);

  // 茶藝街雙層茶樓特色（呼應參考圖四：二樓外挑雕花木欄杆＋一樓門前延伸彩色條紋遮陽布篷＋簷下排燈）
  if (p.regionId === 'region-discussion') {
    const [ca, cb] = AWNINGS[hv % AWNINGS.length];
    const awnMat = cachedMat(m.awnings, `shop_${ca}${cb}`, () => new THREE.MeshStandardMaterial({ map: awningTexture(ca, cb), roughness: 0.88, side: THREE.DoubleSide }));
    const awnGeo = new THREE.PlaneGeometry(w + 0.4, 1.45).rotateX(-Math.PI / 2 + 0.32);
    add(g, awnGeo, awnMat, 0, pl + H1 - 0.28, d / 2 + 0.72);
    add(g, new THREE.PlaneGeometry(w + 0.4, 0.28), awnMat, 0, pl + H1 - 0.56, d / 2 + 1.38);
    // 二樓外挑木欄杆
    add(g, new THREE.BoxGeometry(w + 0.2, 0.08, 0.08), sm.darkWood, 0, pl + H1 + 0.92, d / 2 + 0.38);
    for (let rx = -w / 2 + 0.25; rx <= w / 2 - 0.25; rx += 0.45) {
      add(g, new THREE.BoxGeometry(0.06, 0.58, 0.06), sm.darkWood, rx, pl + H1 + 0.62, d / 2 + 0.38);
    }
    for (const lx of [-w * 0.22, w * 0.22]) {
      const v = toWorld(g, lx, pl + H1 - 0.55, d / 2 + 0.92);
      lanterns.addHanging(v.x, v.y, v.z, 0.68);
    }
  }

  // 討論島各分類店鋪：一樓門前懸掛「熱門討論輪播」走馬燈看板
  if (p.regionId === 'region-discussion' && p.content) {
    const cw = Math.min(w - 0.9, 3.6);
    const ch = 0.96;
    const cy = pl + 2.38;
    const cz = d / 2 + 0.44;
    add(g, new THREE.BoxGeometry(cw + 0.14, ch + 0.12, 0.09), sm.darkWood, 0, cy, cz - 0.05);
    add(g, new THREE.BoxGeometry(cw + 0.2, 0.06, 0.13), sm.gold, 0, cy + ch / 2 + 0.05, cz - 0.05);
    const catLabel = (p.sub || '').replace(/^.*・/, '') || p.name;
    const initTex = drawShopCarouselTexture(p.name, catLabel, null, 0, 1);
    const cMat = new THREE.MeshStandardMaterial({
      map: initTex,
      emissive: 0xffffff,
      emissiveMap: initTex,
      emissiveIntensity: 0.56,
      roughness: 0.42,
      metalness: 0.08,
    });
    const cMesh = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch), cMat);
    cMesh.position.set(0, cy, cz + 0.01);
    cMesh.userData.noMerge = true;
    cMesh.userData.shopCarousel = {
      propId: p.id,
      shopName: p.name,
      categorySub: catLabel,
      content: p.content,
    };
    g.add(cMesh);
  }

  // 招牌（二樓立面）與門口直旗
  const sign = signMesh(p.name, p.sub, Math.min(w - 1.3, 3.8), 1.05);
  sign.position.set(0, pl + H1 + H2 * 0.55, d / 2 + 0.03);
  g.add(sign);
  const banTxt = p.name.replace(/[^\p{Script=Han}]/gu, '').slice(0, 4);
  const banMat = cachedMat(m.banners, banTxt, () => {
    const tex = bannerTexture(banTxt);
    return new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.52, roughness: 0.85 });
  });
  const side = hv % 2 ? 1 : -1;
  // 直旗正反兩面各一片，從哪一側看字都是正的
  for (const face of [1, -1]) {
    const ban = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.8), banMat);
    ban.position.set(side * (w / 2 + 0.05) + face * 0.012, pl + H1 - 1.05, d / 2 + 0.55);
    ban.rotation.y = face * (Math.PI / 2);
    ban.userData.noMerge = true;
    g.add(ban);
  }
  add(g, new THREE.CylinderGeometry(0.03, 0.03, 0.75, 5).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), sm.darkWood, side * (w / 2 + 0.05), pl + H1 - 0.12, d / 2 + 0.55);
  // 屋頂
  const roof = buildRoofTier(w, d, { rise: 1.45, overhang: 0.55, curl: 0.2, theme, ridge: true, lite: true, horns: false });
  roof.position.y = pl + H1 + H2 + 0.05;
  g.add(roof);
  // 門口兩盞燈籠、兩只大陶缸
  for (const s of [-1, 1]) {
    const v = toWorld(g, s * (w / 2 - 0.55), pl + H1 - 0.55, d / 2 + 0.85);
    lanterns.addHanging(v.x, v.y, v.z, 0.75);
  }
  const extra: Collider[] = [];
  for (const s of [-1, 1]) {
    const lx = s * (w / 2 - 0.45);
    const lz = d / 2 + 0.45;
    add(g, new THREE.CylinderGeometry(0.3, 0.22, 0.6, 12), sm.pot, lx, 0.3, lz);
    add(g, new THREE.TorusGeometry(0.28, 0.04, 6, 14).rotateX(Math.PI / 2), sm.gold, lx, 0.58, lz);
    const [wx, wz] = localToWorldXZ(p.x, p.z, p.yaw, lx, lz);
    extra.push({ id: `${p.id}-jar${s}`, type: 'cylinder', x: wx, z: wz, radius: 0.35 } as Collider);
  }
  return [...rectColliders(p, 0.1), ...extra];
}

let cream: THREE.MeshStandardMaterial | null = null;
function creamMat() {
  if (!cream) cream = new THREE.MeshStandardMaterial({ color: 0xf3ead6, roughness: 0.9 });
  return cream;
}

/** 街道旁兩排木製飛簷佈告欄（正反兩面張貼各種討論） */
function buildBoard(
  p: StreetProp,
  root: THREE.Group,
  lanterns: LanternBatch,
  toWorld: (o: THREE.Object3D, x: number, y: number, z: number) => THREE.Vector3
): Collider[] {
  const sm = getStyleMaterials();
  const g = new THREE.Group();
  g.position.set(p.x, 0, p.z);
  g.rotation.y = p.yaw;
  root.add(g);
  g.updateMatrixWorld(true);

  const w = p.w;
  const postX = w / 2 - 0.2;
  for (const s of [-1, 1]) {
    add(g, scaledBox(0.42, 0.34, 0.48, 1, 0.34, 1), sm.stone, s * postX, 0.17, 0);
    add(g, new THREE.CylinderGeometry(0.11, 0.12, 2.75, 10), sm.redLacquer, s * postX, 1.52, 0);
    const v = toWorld(g, s * (postX + 0.18), 2.48, 0.22);
    lanterns.addHanging(v.x, v.y, v.z, 0.52);
  }

  // 木板框體與上下橫樑
  const boardW = w - 0.42;
  const boardH = 1.48;
  const boardY = 1.62;
  add(g, new THREE.BoxGeometry(boardW + 0.12, boardH + 0.12, 0.11), sm.darkWood, 0, boardY, 0);
  add(g, new THREE.BoxGeometry(w - 0.16, 0.12, 0.2), sm.gold, 0, boardY + boardH / 2 + 0.08, 0);
  add(g, new THREE.BoxGeometry(w - 0.16, 0.1, 0.18), sm.darkWood, 0, boardY - boardH / 2 - 0.07, 0);

  // 正反兩面討論榜貼圖（正面與背面皆可觀看與點選）
  const hv = hash(p.id);
  for (const [face, zOff, ry, offIdx] of [
    [1, 0.064, 0, (hv % 3) * 2],
    [-1, -0.064, Math.PI, (hv % 3) * 2 + 2],
  ] as [number, number, number, number][]) {
    const tex = drawStreetDiscussionBoardTexture(p.name, []);
    const bMat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: 0.46,
      roughness: 0.55,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(boardW, boardH), bMat);
    plane.position.set(0, boardY, zOff);
    plane.rotation.y = ry;
    plane.userData.noMerge = true;
    plane.userData.discBoard = {
      propId: p.id,
      title: p.name,
      content: p.content || 'craft_board',
      offset: offIdx,
      face,
    };
    g.add(plane);
  }

  // 飛簷瓦頂
  const roof = buildRoofTier(w + 0.35, 0.85, {
    rise: 0.48,
    overhang: 0.32,
    curl: 0.22,
    theme: 'slate',
    ridge: true,
    lite: true,
    horns: false,
  });
  roof.position.y = 2.86;
  g.add(roof);

  return rectColliders(p, 0.08);
}

/** 露天茶座：圓桌、兩張石凳、藍或黃的油紙傘 */
function buildSeat(p: StreetProp, root: THREE.Group): Collider[] {
  const sm = getStyleMaterials();
  const m = mats();
  const g = new THREE.Group();
  g.position.set(p.x, 0, p.z);
  root.add(g);
  const blue = p.id.endsWith('0');
  const umb = cachedMat(m.awnings, blue ? 'umbBlue' : 'umbGold', () => new THREE.MeshStandardMaterial({ color: blue ? 0x2f6bb3 : 0xe2b030, roughness: 0.8, side: THREE.DoubleSide }));
  add(g, new THREE.CylinderGeometry(0.62, 0.62, 0.08, 18), sm.darkWood, 0, 0.76, 0);
  add(g, new THREE.CylinderGeometry(0.1, 0.16, 0.74, 8), sm.darkWood, 0, 0.37, 0);
  for (const s of [-1, 1]) add(g, new THREE.CylinderGeometry(0.24, 0.28, 0.46, 12), sm.stoneLight, s * 1.0, 0.23, 0);
  // 茶壺、茶杯
  add(g, new THREE.SphereGeometry(0.13, 12, 10), sm.pot, 0, 0.92, 0);
  for (const s of [-1, 1]) add(g, new THREE.CylinderGeometry(0.05, 0.04, 0.07, 10), sm.plaster, s * 0.3, 0.84, 0.12);
  add(g, new THREE.CylinderGeometry(0.035, 0.035, 2.5, 6), sm.darkWood, 0, 1.25, 0);
  add(g, new THREE.ConeGeometry(1.45, 0.55, 16, 1, true), umb, 0, 2.55, 0);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const rib = add(g, new THREE.CylinderGeometry(0.015, 0.015, 1.5, 4), sm.darkWood, Math.cos(a) * 0.72, 2.5, Math.sin(a) * 0.72);
    rib.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2);
  }
  return [{ id: `${p.id}-table`, type: 'cylinder', x: p.x, z: p.z, radius: 1.3 } as Collider];
}

/** 市集攤位：條紋布棚、櫃檯、後方貨架、吊牌與攤主 */
function buildStall(p: StreetProp, root: THREE.Group, lanterns: LanternBatch, toWorld: (o: THREE.Object3D, x: number, y: number, z: number) => THREE.Vector3): Collider[] {
  const sm = getStyleMaterials();
  const m = mats();
  const g = new THREE.Group();
  g.position.set(p.x, 0, p.z);
  g.rotation.y = p.yaw;
  root.add(g);
  g.updateMatrixWorld(true);
  const { w, d } = p;
  const hv = hash(p.id);
  const [ca, cb] = AWNINGS[hv % AWNINGS.length];
  const awn = cachedMat(m.awnings, `${ca}${cb}`, () => new THREE.MeshStandardMaterial({ map: awningTexture(ca, cb), roughness: 0.9, side: THREE.DoubleSide }));

  // 柱子（前低後高，布棚往前斜）
  for (const [sx, sz, h] of [[-1, 1, 2.45], [1, 1, 2.45], [-1, -1, 2.85], [1, -1, 2.85]] as [number, number, number][]) {
    add(g, new THREE.CylinderGeometry(0.07, 0.09, h, 8), sm.darkWood, sx * (w / 2 - 0.1), h / 2, sz * (d / 2 - 0.1));
  }
  // 布棚＋前緣垂布
  const roofLen = Math.hypot(d + 0.9, 0.5);
  const awning = new THREE.PlaneGeometry(w + 0.6, roofLen).rotateX(-Math.PI / 2).rotateX(Math.atan2(0.5, d + 0.9));
  add(g, awning, awn, 0, 2.66, 0.25);
  add(g, new THREE.PlaneGeometry(w + 0.6, 0.38), awn, 0, 2.24, d / 2 + 0.7);
  // 櫃檯（前面掛同色布）
  add(g, new THREE.BoxGeometry(w - 0.3, 0.85, 0.7), sm.darkWood, 0, 0.425, d / 2 - 0.45);
  add(g, new THREE.PlaneGeometry(w - 0.35, 0.62), awn, 0, 0.46, d / 2 - 0.09);
  add(g, new THREE.BoxGeometry(w - 0.2, 0.06, 0.82), sm.redLacquer, 0, 0.88, d / 2 - 0.45);
  // 櫃檯上的貨（依攤種）；空攤只立「歡迎掌櫃進駐」小牌
  if (p.vacant) {
    const tag = signMesh('歡迎掌櫃進駐', '招商中', 1.5, 0.5);
    tag.position.set(0, 1.2, d / 2 - 0.42);
    g.add(tag);
  }
  for (let k = 0; k < (p.vacant ? 0 : 7); k++) {
    const x = -w / 2 + 0.45 + (k * (w - 0.9)) / 6;
    const z = d / 2 - 0.45 + ((k % 2) - 0.5) * 0.22;
    if (p.goods === 'sweets' || p.goods === 'crafts') add(g, new THREE.SphereGeometry(0.1, 10, 8), m.fruits[(hv + k) % m.fruits.length], x, 0.99, z);
    else if (p.goods === 'lanterns') add(g, new THREE.SphereGeometry(0.12, 10, 8).scale(1, 1.2, 1), sm.lanternBody, x, 1.03, z);
    else if (p.goods === 'toys') add(g, new THREE.BoxGeometry(0.16, 0.16, 0.16), m.fruits[(hv + k) % m.fruits.length], x, 0.99, z, k * 0.4);
    else add(g, new THREE.BoxGeometry(0.22, 0.03, 0.3), k % 2 ? sm.plaster : sm.gold, x, 0.93, z, k * 0.2);
  }
  // 後方貨架
  const shelf = cachedMat(m.shelves, p.goods, () => new THREE.MeshStandardMaterial({ map: shopInteriorTexture(p.goods), roughness: 0.8, emissive: 0xffffff, emissiveMap: shopInteriorTexture(p.goods), emissiveIntensity: 0.18 }));
  add(g, new THREE.BoxGeometry(w - 0.3, 1.7, 0.12), sm.darkWood, 0, 0.85, -d / 2 + 0.1);
  add(g, new THREE.PlaneGeometry(w - 0.45, 1.5), shelf, 0, 0.88, -d / 2 + 0.17);
  if (!p.vacant) addKeeper(g, ((hv % 3) - 1) * 0.6, 0, -0.15, hv);
  // 布棚前緣上方的招牌
  const sign = signMesh(p.name, p.vacant ? '歡迎掌櫃進駐' : p.sub, 2.0, 0.66);
  sign.position.set(0, 2.72, d / 2 + 0.66);
  g.add(sign);
  const v = toWorld(g, (hv % 2 ? 1 : -1) * (w / 2 + 0.05), 1.95, d / 2 + 0.55);
  lanterns.addHanging(v.x, v.y, v.z, 0.6);
  return rectColliders(p, 0.15);
}

/** 牌坊：兩根紅柱、雙樑、匾額與小屋頂 */
function buildGate(p: StreetProp, root: THREE.Group, lanterns: LanternBatch, toWorld: (o: THREE.Object3D, x: number, y: number, z: number) => THREE.Vector3): Collider[] {
  const sm = getStyleMaterials();
  const g = new THREE.Group();
  g.position.set(p.x, 0, p.z);
  g.rotation.y = p.yaw;
  root.add(g);
  g.updateMatrixWorld(true);
  const half = p.w / 2 - 0.4;
  const cols: Collider[] = [];
  for (const s of [-1, 1]) {
    add(g, scaledBox(0.95, 0.6, 0.95, 1, 0.6, 1), sm.stone, s * half, 0.3, 0);
    add(g, new THREE.CylinderGeometry(0.3, 0.33, 4.9, 12), sm.redLacquer, s * half, 0.6 + 2.45, 0);
    add(g, new THREE.TorusGeometry(0.34, 0.05, 6, 16).rotateX(Math.PI / 2), sm.gold, s * half, 0.62, 0);
    const [wx, wz] = localToWorldXZ(p.x, p.z, p.yaw, s * half, 0);
    cols.push({ id: `${p.id}-pillar${s}`, type: 'cylinder', x: wx, z: wz, radius: 0.55 } as Collider);
    const v = toWorld(g, s * (half - 1.4), 3.55, 0.25);
    lanterns.addHanging(v.x, v.y, v.z, 0.9);
  }
  add(g, scaledBox(p.w + 0.3, 0.38, 0.5, 3, 0.38, 3), sm.redLacquer, 0, 4.15, 0);
  add(g, scaledBox(p.w + 0.6, 0.32, 0.46, 3, 0.32, 3), sm.redLacquer, 0, 5.2, 0);
  add(g, new THREE.BoxGeometry(p.w + 0.3, 0.07, 0.54), sm.gold, 0, 4.36, 0);
  const sign = signMesh(p.name, p.sub, 3.3, 1.05);
  sign.position.set(0, 4.75 - 0.06, 0.08);
  sign.scale.set(1, 0.82, 1);
  g.add(sign);
  const back = signMesh(p.name, p.sub, 3.3, 1.05);
  back.position.set(0, 4.69, -0.08);
  back.scale.set(1, 0.82, 1);
  back.rotation.y = Math.PI;
  g.add(back);
  const roof = buildRoofTier(p.w + 0.4, 1.0, { rise: 0.75, overhang: 0.6, curl: 0.4, theme: 'red', ridge: true, lite: true, horns: false });
  roof.position.y = 5.38;
  g.add(roof);
  return cols;
}

/**
 * 茶藝街節慶氛圍（呼應參考圖四「茶藝街參考」）：
 * - 街道青石板鋪面（x = 55.8, z = -28 .. -58）
 * - 橫跨東西兩側茶樓二樓屋簷的 7 道弧形燈籠長串（懸掛金黃書法長燈籠、朱紅、翠綠、天藍等多彩節慶宮燈）
 * - 茶藝街上空冉冉升起的暖光祈福天燈群（隨時間緩緩上下浮動）
 */
function buildTeaStreetAtmosphere(root: THREE.Group, lanterns: LanternBatch) {
  const sm = getStyleMaterials();
  const streetX = 55.8;
  // 青石板長街中央鋪面與邊石
  const road = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.06, 31.5), sm.stoneLight ?? sm.stone);
  road.position.set(streetX, 0.03, -43.8);
  road.receiveShadow = true;
  root.add(road);

  const ropeMat = new THREE.MeshBasicMaterial({ color: 0x2b190e });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x241409, roughness: 0.7 });
  const colorMats = [
    new THREE.MeshStandardMaterial({ color: 0xffd86b, emissive: new THREE.Color(0xffa826), emissiveIntensity: 1.25, roughness: 0.35 }), // 金黃長燈
    new THREE.MeshStandardMaterial({ color: 0xff5a36, emissive: new THREE.Color(0xe62e00), emissiveIntensity: 1.15, roughness: 0.38 }), // 朱紅燈籠
    new THREE.MeshStandardMaterial({ color: 0x38d399, emissive: new THREE.Color(0x10b981), emissiveIntensity: 1.05, roughness: 0.38 }), // 翠玉綠燈籠
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: new THREE.Color(0x0284c7), emissiveIntensity: 1.05, roughness: 0.38 }), // 晴空藍燈籠
    new THREE.MeshStandardMaterial({ color: 0xf472b6, emissive: new THREE.Color(0xdb2777), emissiveIntensity: 1.05, roughness: 0.38 }), // 桃粉燈籠
  ];

  const zRows = [-31.5, -35.2, -39.0, -43.0, -47.0, -51.0, -55.2];
  const xSpan = 10.6; // 從西排茶樓簷口 (50.5) 跨至東排茶樓簷口 (61.1)
  zRows.forEach((zRow, ri) => {
    const nSegs = 8;
    for (let i = 0; i < nSegs; i++) {
      const u0 = i / nSegs;
      const u1 = (i + 1) / nSegs;
      const x0 = streetX - xSpan / 2 + u0 * xSpan;
      const x1 = streetX - xSpan / 2 + u1 * xSpan;
      const sag0 = Math.sin(u0 * Math.PI) * 0.85;
      const sag1 = Math.sin(u1 * Math.PI) * 0.85;
      const y0 = 6.15 - sag0;
      const y1 = 6.15 - sag1;
      const len = Math.hypot(x1 - x0, y1 - y0);
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, len, 5), ropeMat);
      seg.position.set((x0 + x1) / 2, (y0 + y1) / 2, zRow);
      seg.rotation.z = Math.atan2(y1 - y0, x1 - x0) - Math.PI / 2;
      root.add(seg);
    }
    // 每條燈繩懸掛 7 盞多彩宮燈與長筒燈籠
    for (let k = 1; k <= 7; k++) {
      const u = k / 8;
      const lx = streetX - xSpan / 2 + u * xSpan;
      const ly = 6.15 - Math.sin(u * Math.PI) * 0.85 - 0.32;
      const kind = (ri + k) % colorMats.length;
      const cMat = colorMats[kind];
      const isTall = (ri + k) % 2 === 0;
      const bodyGeo = isTall
        ? new THREE.CylinderGeometry(0.2, 0.2, 0.56, 12)
        : new THREE.SphereGeometry(0.24, 12, 10).scale(1, 0.88, 1);
      const body = new THREE.Mesh(bodyGeo, cMat);
      body.position.set(lx, ly, zRow);
      root.add(body);
      const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 8), capMat);
      topCap.position.set(lx, ly + (isTall ? 0.3 : 0.22), zRow);
      root.add(topCap);
      const botCap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 8), capMat);
      botCap.position.set(lx, ly - (isTall ? 0.3 : 0.22), zRow);
      root.add(botCap);
    }
  });

  // 上空漂浮的祈福天燈群（呼應參考圖四茶藝街夜空漫天升起的天燈）
  const skyGroup = new THREE.Group();
  skyGroup.name = 'tea_street_sky_lanterns';
  skyGroup.userData.noMerge = true;
  root.add(skyGroup);
  const skyMat = new THREE.MeshStandardMaterial({
    color: 0xffe49e,
    emissive: new THREE.Color(0xff9d2e),
    emissiveIntensity: 1.35,
    roughness: 0.35,
  });
  const skyItems: { mesh: THREE.Mesh; baseY: number; phase: number }[] = [];
  for (let i = 0; i < 24; i++) {
    const sx = streetX + (((i * 37) % 100) / 100 - 0.5) * 14.5;
    const sz = -29.0 - ((i * 53) % 32);
    const sy = 8.2 + ((i * 29) % 11) * 0.95;
    const scale = 0.75 + (i % 4) * 0.14;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.15 * scale, 0.48 * scale, 10), skyMat);
    m.position.set(sx, sy, sz);
    m.userData.noMerge = true;
    skyGroup.add(m);
    skyItems.push({ mesh: m, baseY: sy, phase: i * 0.85 });
  }
  skyGroup.userData.tick = (t: number) => {
    for (const it of skyItems) {
      it.mesh.position.y = it.baseY + Math.sin(t * 0.9 + it.phase) * 0.28;
    }
  };
  void lanterns;
}

/** 某座島的街景（店面、攤位、牌坊、街道佈告欄）；userData.colliders 放碰撞 */
export function createStreetProps(regionId: RegionId): THREE.Group | null {
  const list = STREET_PROPS[regionId];
  if (!list || !list.length) return null;
  const root = new THREE.Group();
  root.name = `street_${regionId}`;
  const lanterns = new LanternBatch();
  const tmp = new THREE.Vector3();
  const toWorld = (o: THREE.Object3D, x: number, y: number, z: number) => o.localToWorld(tmp.set(x, y, z)).clone();
  const colliders: Collider[] = [];
  for (const p of list) {
    if (p.kind === 'shop') colliders.push(...buildShop(p, root, lanterns, toWorld));
    else if (p.kind === 'stall') colliders.push(...buildStall(p, root, lanterns, toWorld));
    else if (p.kind === 'seat') colliders.push(...buildSeat(p, root));
    else if (p.kind === 'board') colliders.push(...buildBoard(p, root, lanterns, toWorld));
    else colliders.push(...buildGate(p, root, lanterns, toWorld));
  }
  if (regionId === 'region-discussion') {
    buildTeaStreetAtmosphere(root, lanterns);
  }
  mergeByMaterial(root);
  root.add(lanterns.build());
  // 點擊範圍（合併之後才加，才不會被併進街景網格）
  for (const p of list) {
    const h = p.kind === 'shop' ? 6.6 : p.kind === 'stall' || p.kind === 'seat' || p.kind === 'board' ? 3.2 : 6;
    root.add(makePickProxy(p.w + 0.4, h, p.kind === 'gate' ? 1.6 : p.d + 1.2, p.x, p.z, p.yaw, { kind: 'street', id: p.id }));
  }
  root.userData.colliders = colliders;
  return root;
}
