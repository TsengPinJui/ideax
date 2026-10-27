import * as THREE from 'three';
import type { Collider, RegionId } from '../types';
import { localToWorldXZ, getGlobalWalkableZones, REGION_CONFIGS } from '../regionConfigs';
import { getStyleMaterials, scaledBox, buildRoofTier, mergeByMaterial, LanternBatch, RoofTheme } from './architecture';
import { makePickProxy } from '../picking';
import { awningTexture, shopInteriorTexture, signboardTexture, bannerTexture, ShopKind } from './textures';

/**
 * 主島商店街與創意島「創意集」市集：兩層樓的街屋店面、條紋布棚攤位、牌坊與顧店的掌櫃。
 * 店面只是街景（不能走進去），四周都有碰撞，玩家不會穿過去。
 */

export type StallContent = 'new' | 'proposal' | 'game' | 'app' | 'hot';

export interface StreetProp {
  id: string;
  regionId: RegionId;
  kind: 'shop' | 'stall' | 'gate' | 'seat';
  /** 白牆黛瓦（討論島的鋪子、茶莊） */
  style?: 'huizhou';
  /** 點了之後左側面板的說明 */
  note?: string;
  name: string;
  sub?: string;
  goods: ShopKind;
  /** 市集攤位擺的真實內容（點攤位會在左側列出） */
  content?: StallContent;
  x: number;
  z: number;
  yaw: number;
  w: number;
  d: number;
}

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

/** 主島：西、東、北三段商店街（避開四座拱橋與三棟主建築） */
const HOME_SHOPS = ringProps('region-home', 'shop', 6, 4.4, 3.0, [
  { deg: 163, name: '創意坊', sub: '文創小物', goods: 'crafts' },
  { deg: 180, name: '點子茶舖', sub: '茶飲・茶點', goods: 'tea' },
  { deg: 197, name: '靈感書肆', sub: '書冊・筆記', goods: 'books' },
  { deg: -17, name: '匠心工坊', sub: '手作・木藝', goods: 'toys' },
  { deg: 0, name: '燈籠鋪', sub: '花燈・紙燈', goods: 'lanterns' },
  { deg: 17, name: '墨香文房', sub: '筆墨紙硯', goods: 'ink' },
  // 北面讓開貿易街（0, -19.5，寬 13.5）與探索看板、島覽地圖兩棟
  { deg: 240, name: '甜點心鋪', sub: '糕餅・糖果', goods: 'sweets' },
  { deg: 300, name: '巧手雜貨', sub: '日用百貨', goods: 'general' },
]);

/** 創意島北側：創意集市集（五個攤位＋牌坊） */
const CREATIVE_STALLS = ringProps('region-creative', 'stall', 3.6, 2.4, (rx, rz) => [rx * 0.76, rz * 0.76], [
  { deg: -124, name: '新品攤', sub: '最新上架的作品與提案', goods: 'sweets', content: 'new' },
  { deg: -107, name: '提案攤', sub: '創新提案', goods: 'ink', content: 'proposal' },
  { deg: -90, name: '遊戲攤', sub: '遊戲作品', goods: 'toys', content: 'game' },
  { deg: -73, name: '軟體攤', sub: '軟體應用與 AI 工具', goods: 'crafts', content: 'app' },
  { deg: -56, name: '人氣攤', sub: '瀏覽最多的作品與提案', goods: 'lanterns', content: 'hot' },
]);

const CREATIVE_GATE: StreetProp = (() => {
  const [cx, cz] = REGION_CONFIGS['region-creative'].center;
  return { id: 'region-creative-gate', regionId: 'region-creative', kind: 'gate', name: '創意集', sub: '市集・攤販・活動', goods: 'general', x: cx, z: cz - 14.5, yaw: 0, w: 7.6, d: 1.2 };
})();

/** 討論島：工作坊前的百工坊（四間工匠鋪＋牌坊）、茶藝街（三間茶莊＋牌樓＋露天茶座） */
const DISC = (id: string, kind: StreetProp['kind'], name: string, sub: string, goods: ShopKind, x: number, z: number, yaw: number, note?: string): StreetProp => ({
  id: `region-discussion-${id}`,
  regionId: 'region-discussion',
  kind,
  name,
  sub,
  goods,
  x,
  z,
  yaw,
  w: kind === 'gate' ? 7.6 : kind === 'seat' ? 2.6 : 6,
  d: kind === 'gate' ? 1.2 : kind === 'seat' ? 2.6 : 4.4,
  style: kind === 'shop' ? 'huizhou' : undefined,
  note,
});
const CRAFT_NOTE = '百工坊的工匠鋪是街景；要討論軟體架構、AI、軟硬整合與全端開發，請進中間的「工作坊」。';
const TEA_NOTE = '茶藝街的茶莊是街景；要聊天交流，請進中間的「茶藝街」茶館，每個討論就是一張茶桌。';
const DISCUSSION_PROPS: StreetProp[] = [
  DISC('craft-0', 'shop', '鐵匠鋪', '百工坊', 'general', 86, -56, 0, CRAFT_NOTE),
  DISC('craft-1', 'shop', '木匠鋪', '百工坊', 'toys', 86, -34, Math.PI, CRAFT_NOTE),
  DISC('craft-2', 'shop', '機關巧藝鋪', '百工坊', 'crafts', 93.5, -62, -Math.PI / 2, CRAFT_NOTE),
  DISC('craft-3', 'shop', '金工鍛造鋪', '百工坊', 'lanterns', 92.5, -30.5, -Math.PI / 2, CRAFT_NOTE),
  DISC('craft-gate', 'gate', '百工坊', '軟體・AI・軟硬整合・全端', 'general', 79, -45, -Math.PI / 2, CRAFT_NOTE),
  DISC('tea-0', 'shop', '清茗茶莊', '茶藝街', 'tea', 58, -56, 0, TEA_NOTE),
  DISC('tea-1', 'shop', '雅韻茶樓', '茶藝街', 'tea', 58, -34, Math.PI, TEA_NOTE),
  DISC('tea-2', 'shop', '茗香茶點', '茶藝街', 'sweets', 50.5, -62, Math.PI / 2, TEA_NOTE),
  DISC('tea-gate', 'gate', '茶藝街', '日常・生活・職場・靈感', 'tea', 65, -45, Math.PI / 2, TEA_NOTE),
  DISC('tea-seat-0', 'seat', '露天茶座', '茶藝街', 'tea', 62.2, -40.6, 0, TEA_NOTE),
  DISC('tea-seat-1', 'seat', '露天茶座', '茶藝街', 'tea', 62.2, -49.4, 0, TEA_NOTE),
];

export const STREET_PROPS: Record<RegionId, StreetProp[]> = {
  'region-home': HOME_SHOPS,
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
  const signMat = cachedMat(mats().signs, `${title}|${sub || ''}`, () => new THREE.MeshStandardMaterial({ map: signboardTexture(title, sub), roughness: 0.55, metalness: 0.1 }));
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
  // 櫃檯上的貨：陶罐、木盒
  for (let k = 0; k < 4; k++) {
    const x = -w / 2 + 1.2 + (k * (w - 2.4)) / 3;
    if (k % 2) add(g, new THREE.CylinderGeometry(0.13, 0.17, 0.32, 10), sm.pot, x, pl + 1.24, d / 2 - 0.62);
    else add(g, new THREE.BoxGeometry(0.34, 0.2, 0.26), sm.gold, x, pl + 1.18, d / 2 - 0.6);
  }
  addKeeper(g, (hv % 3) - 1, pl, d / 2 - 1.35, hv);
  // 腰簷（一、二樓之間的披簷）
  const eave = new THREE.BoxGeometry(w + 1.0, 0.14, 1.35).rotateX(0.36);
  add(g, eave, sm.roofs[theme], 0, pl + H1 + 0.32, d / 2 + 0.5);
  add(g, new THREE.BoxGeometry(w + 1.0, 0.16, 0.16), sm.ridges[theme], 0, pl + H1 + 0.08, d / 2 + 1.12);
  // 招牌（二樓立面）與門口直旗
  const sign = signMesh(p.name, p.sub, Math.min(w - 1.3, 3.8), 1.05);
  sign.position.set(0, pl + H1 + H2 * 0.55, d / 2 + 0.03);
  g.add(sign);
  const banTxt = p.name.replace(/[^\p{Script=Han}]/gu, '').slice(0, 4);
  const banMat = cachedMat(m.banners, banTxt, () => new THREE.MeshStandardMaterial({ map: bannerTexture(banTxt), roughness: 0.9 }));
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
  // 櫃檯上的貨（依攤種）
  for (let k = 0; k < 7; k++) {
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
  addKeeper(g, ((hv % 3) - 1) * 0.6, 0, -0.15, hv);
  // 布棚前緣上方的招牌
  const sign = signMesh(p.name, undefined, 1.8, 0.6);
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

/** 某座島的街景（店面、攤位、牌坊）；userData.colliders 放碰撞 */
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
    else colliders.push(...buildGate(p, root, lanterns, toWorld));
  }
  mergeByMaterial(root);
  root.add(lanterns.build());
  // 點擊範圍（合併之後才加，才不會被併進街景網格）
  for (const p of list) {
    const h = p.kind === 'shop' ? 6.6 : p.kind === 'stall' || p.kind === 'seat' ? 3 : 6;
    root.add(makePickProxy(p.w + 0.4, h, p.kind === 'gate' ? 1.6 : p.d + 1.2, p.x, p.z, p.yaw, { kind: 'street', id: p.id }));
  }
  root.userData.colliders = colliders;
  return root;
}
