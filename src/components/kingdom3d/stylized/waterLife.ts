import * as THREE from 'three';
import { getGlobalWalkableZones, WORLD_BRIDGES } from '../regionConfigs';
import { BASIN_LANDMARKS, FARMLANDS, LOTUS_PATCHES, MOUNTAIN_RING, THREE_POOLS } from './basinLayout';
import { makePickProxy } from '../picking';
import { REGION_CONFIGS } from '../regionConfigs';
import { STREET_PROPS } from './streets';
import { TULOU_RADIUS, RING } from './tulou';
import { glowTexture } from './textures';
import { animateModelMotion, loadModelInto } from '../modelAssets';

/** 判斷座標 (x, y, z) 是否在建築屋頂下方、室內、土樓迴廊或店鋪遮簷內（屋內不可淋雨） */
export function isUnderRoof(x: number, y: number, z: number): boolean {
  if (y < 0) return true;
  for (const r of Object.values(REGION_CONFIGS)) {
    for (const b of r.buildings) {
      const dx = x - b.position.x;
      const dz = z - b.position.z;
      if (b.exterior === 'tulou') {
        const dist = Math.hypot(dx, dz);
        // 土樓外牆與環形迴廊屋頂範圍（留中央露天天井，但中庭戲台與佈告欄也有屋頂）
        if (dist <= TULOU_RADIUS + 1.8 && dist >= RING.RI - 0.9 && y <= 14.5) return true;
        // 土樓內中庭後方戲台與兩座有頂佈告欄
        const c = Math.cos(-b.facingYaw);
        const s = Math.sin(-b.facingYaw);
        const lx = dx * c - dz * s;
        const lz = dx * s + dz * c;
        if (Math.abs(lx) <= 3.8 && Math.abs(lz + 11.2) <= 2.1 && y <= 4.5) return true;
        for (const side of [-1, 1]) {
          if (Math.hypot(lx - side * 9.9, lz - 5.4) <= 2.8 && y <= 3.8) return true;
        }
        continue;
      }
      const c = Math.cos(-b.facingYaw);
      const s = Math.sin(-b.facingYaw);
      const lx = dx * c - dz * s;
      const lz = dx * s + dz * c;
      const hw = b.width / 2 + 1.25;
      const hd = b.depth / 2 + 1.25;
      const roofH = b.height + (b.tiers || 1) * 2.2 + 0.8;
      if (Math.abs(lx) <= hw && Math.abs(lz) <= hd && y <= roofH) return true;
    }
    for (const p of STREET_PROPS[r.id] || []) {
      const dx = x - p.x;
      const dz = z - p.z;
      const c = Math.cos(-p.yaw);
      const s = Math.sin(-p.yaw);
      const lx = dx * c - dz * s;
      const lz = dx * s + dz * c;
      const pad = p.kind === 'shop' ? 0.95 : 0.6;
      const topY = p.kind === 'shop' ? 7.2 : 3.8;
      if (Math.abs(lx) <= p.w / 2 + pad && Math.abs(lz) <= p.d / 2 + pad && y <= topY) return true;
    }
  }
  // 湖心亭屋頂
  const pavilion = BASIN_LANDMARKS.lakePavilion;
  if (Math.hypot(x - pavilion.x, z - pavilion.z) <= 5.0 && y <= 7.2) return true;
  return false;
}

import type { TimeOfDay } from './environment';

/**
 * 水上與夜空的生活感（照 /island）：
 * - 天氣好的白天：烏篷漁船在水道上慢慢划；入夜換成掛滿宮燈的遊船（畫舫）
 * - 天氣好的晚上：水面零星漂著蓮花水燈，夜空有幾盞天燈冉冉升起
 * - 下雨：船都靠岸休息（不出現），也不放水燈、天燈，改成細雨
 */
export type WeatherType = 'clear' | 'rain';

const SEA_Y = -0.35;

export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ---------------- 哪裡是水面 ---------------- */

const ISLANDS = getGlobalWalkableZones()
  .filter((z) => z.type === 'ellipse')
  .map((z) => z as { cx: number; cz: number; rx: number; rz: number });

export function landAt(x: number, z: number) {
  const east = BASIN_LANDMARKS.eastFalls;
  if (Math.abs(z - east.caveZ) < 6.5 && x > 92 && x < east.faceX + 24.5) return false;
  // 島（含草地外環與山崖）
  for (const e of ISLANDS) {
    const dx = (x - e.cx) / (e.rx + 9);
    const dz = (z - e.cz) / (e.rz + 9);
    if (dx * dx + dz * dz < 1) return true;
  }
  // 田園陸地
  for (const l of FARMLANDS) {
    const c = Math.cos(-l.rot);
    const s = Math.sin(-l.rot);
    const rx = x - l.cx;
    const rz = z - l.cz;
    const lx = rx * c - rz * s;
    const lz = rx * s + rz * c;
    const dx = lx / (l.rx * 1.18);
    const dz = lz / (l.rz * 1.18);
    if (dx * dx + dz * dz < 1) return true;
  }
  // 環形山
  for (const p of MOUNTAIN_RING) if (Math.hypot(x - p.x, z - p.z) < p.r * 1.05) return true;
  // 盆地外
  if ((x / 150) ** 2 + (z / 128) ** 2 > 1) return true;
  // 湖心亭、荷花
  const pavilion = BASIN_LANDMARKS.lakePavilion;
  if (Math.hypot(x - pavilion.x, z - pavilion.z) < 11) return true;
  for (const [lx, lz, r] of LOTUS_PATCHES) if (Math.hypot(x - lx, z - lz) < r + 2) return true;
  // 石拱橋
  for (const b of WORLD_BRIDGES) {
    const dx = b.x2 - b.x1;
    const dz = b.z2 - b.z1;
    const l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - b.x1) * dx + (z - b.z1) * dz) / l2));
    if (Math.hypot(x - (b.x1 + t * dx), z - (b.z1 + t * dz)) < b.halfWidth + 3.5) return true;
  }
  return false;
}

/** 船可以划的地方：不是島、田園、山、湖心亭；荷花荷葉與拱橋底下都可以穿過去 */
/** 拱橋底下的水道（橋洞）：兩座橋墩之間，船可以從橋下穿過去 */
function underBridge(px: number, pz: number) {
  for (const b of WORLD_BRIDGES) {
    const dx = b.x2 - b.x1;
    const dz = b.z2 - b.z1;
    const L = Math.hypot(dx, dz) || 1;
    const t = ((px - b.x1) * dx + (pz - b.z1) * dz) / (L * L);
    if (t < 0.36 || t > 0.66) continue;
    const perp = Math.abs((px - b.x1) * dz - (pz - b.z1) * dx) / L;
    if (perp < b.halfWidth + 9) return true;
  }
  return false;
}

export function navigable(x: number, z: number, margin = 1.4) {
  const east = BASIN_LANDMARKS.eastFalls;
  // 東山水濂洞的水道從湖面穿過山壁；南、北傳送洞口也保留一段可接近水域。
  const caveChannel = (px: number, pz: number) => {
    if (Math.abs(pz - east.caveZ) < 6.2 && px > 92 && px < east.faceX + 24.5) return true;
    const north = BASIN_LANDMARKS.northFalls;
    const south = BASIN_LANDMARKS.southCave;
    if (Math.abs(px - north.x) < 5.8 && pz > north.faceZ - 5 && pz < north.faceZ + 10) return true;
    if (Math.abs(px - south.x) < 5.8 && pz > south.faceZ - 10 && pz < south.faceZ + 5) return true;
    return false;
  };
  const solid = (px: number, pz: number) => {
    if (underBridge(px, pz)) return false;
    if (caveChannel(px, pz)) return false;
    for (const e of ISLANDS) {
      const dx = (px - e.cx) / (e.rx + 9);
      const dz = (pz - e.cz) / (e.rz + 9);
      if (dx * dx + dz * dz < 1) return true;
    }
    for (const l of FARMLANDS) {
      const c = Math.cos(-l.rot);
      const s = Math.sin(-l.rot);
      const rx = px - l.cx;
      const rz = pz - l.cz;
      const lx = rx * c - rz * s;
      const lz = rx * s + rz * c;
      const dx = lx / (l.rx * 1.12);
      const dz = lz / (l.rz * 1.12);
      if (dx * dx + dz * dz < 1) return true;
    }
    for (const p of MOUNTAIN_RING) if (Math.hypot(px - p.x, pz - p.z) < p.r * 1.0) return true;
    if ((px / 150) ** 2 + (pz / 128) ** 2 > 1) return true;
    const pavilion = BASIN_LANDMARKS.lakePavilion;
    if (Math.hypot(px - pavilion.x, pz - pavilion.z) < 7.5) return true;
    for (const [tx, tz] of THREE_POOLS) if (Math.hypot(px - tx, pz - tz) < 1.6) return true;
    return false;
  };
  if (solid(x, z)) return false;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    if (solid(x + Math.cos(a) * margin, z + Math.sin(a) * margin)) return false;
  }
  return true;
}

export function openWater(x: number, z: number, margin: number) {
  if (landAt(x, z)) return false;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    if (landAt(x + Math.cos(a) * margin, z + Math.sin(a) * margin)) return false;
  }
  return true;
}

/** 找幾段可以來回划船的直線水道（全程離岸至少 margin 公尺） */
export function findRoutes(count: number, rand: () => number) {
  const routes: { a: THREE.Vector2; b: THREE.Vector2 }[] = [];
  for (let tries = 0; tries < 4000 && routes.length < count; tries++) {
    const x = (rand() - 0.5) * 280;
    const z = (rand() - 0.5) * 240;
    if (!openWater(x, z, 3.4)) continue;
    const ang = rand() * Math.PI * 2;
    const len = 20 + rand() * 24;
    const bx = x + Math.cos(ang) * len;
    const bz = z + Math.sin(ang) * len;
    let ok = true;
    for (let s = 1; s <= 12 && ok; s++) {
      const t = s / 12;
      if (!openWater(x + (bx - x) * t, z + (bz - z) * t, 3.4)) ok = false;
    }
    if (!ok) continue;
    const mid = new THREE.Vector2((x + bx) / 2, (z + bz) / 2);
    if (routes.some((r) => r.a.clone().add(r.b).multiplyScalar(0.5).distanceTo(mid) < 34)) continue;
    routes.push({ a: new THREE.Vector2(x, z), b: new THREE.Vector2(bx, bz) });
  }
  return routes;
}

export function waterSpots(count: number, rand: () => number) {
  const out: THREE.Vector2[] = [];
  for (let tries = 0; tries < 2000 && out.length < count; tries++) {
    const x = (rand() - 0.5) * 280;
    const z = (rand() - 0.5) * 240;
    if (!openWater(x, z, 2.2)) continue;
    if (out.some((p) => p.distanceTo(new THREE.Vector2(x, z)) < 9)) continue;
    out.push(new THREE.Vector2(x, z));
  }
  return out;
}

/* ---------------- 船 ---------------- */

function hullGeometry(len: number, beam: number, depth: number) {
  const s = new THREE.Shape();
  const hl = len / 2;
  const hb = beam / 2;
  s.moveTo(0, -hl);
  s.quadraticCurveTo(hb * 1.05, -hl * 0.55, hb, 0);
  s.quadraticCurveTo(hb * 1.05, hl * 0.55, 0, hl);
  s.quadraticCurveTo(-hb * 1.05, hl * 0.55, -hb, 0);
  s.quadraticCurveTo(-hb * 1.05, -hl * 0.55, 0, -hl);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 2, curveSegments: 10 });
  g.rotateX(Math.PI / 2); // 擠出方向朝下
  g.translate(0, depth * 0.55, 0);
  return g;
}

export interface BoatMats {
  hull: THREE.MeshStandardMaterial;
  hullTrim: THREE.MeshStandardMaterial;
  canopy: THREE.MeshStandardMaterial;
  straw: THREE.MeshStandardMaterial;
  robe: THREE.MeshStandardMaterial;
  skin: THREE.MeshStandardMaterial;
  red: THREE.MeshStandardMaterial;
  roof: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  lantern: THREE.MeshBasicMaterial;
}

export function boatMats(): BoatMats {
  const std = (color: number, rough = 0.8, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });
  return {
    hull: std(0x5a3a22),
    hullTrim: std(0x3a2414),
    canopy: std(0x2a2622, 0.95),
    straw: std(0xc9a764, 0.95),
    robe: std(0x40566e),
    skin: std(0xf1c9a5, 0.7),
    red: std(0x9e2a22, 0.6),
    roof: std(0x2f3540, 0.7),
    gold: std(0xd8a945, 0.45, { metalness: 0.3 }),
    lantern: new THREE.MeshBasicMaterial({ color: 0xffa24a }),
  };
}

function addM(g: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = false;
  g.add(m);
  return m;
}

/** 船尾戴斗笠搖櫓划船的船夫（設定 keepOnModelSwap 以便與 GLB 船身共存） */
function addSternBoatman(g: THREE.Group, m: BoatMats, sternZ: number, deckY: number) {
  const man = new THREE.Group();
  man.position.set(0, deckY, sternZ);
  man.userData.keepOnModelSwap = true;
  man.userData.noMerge = true;

  // 下半身雙腿站立於船尾甲板
  for (const sx of [-0.08, 0.08]) {
    addM(man, new THREE.CylinderGeometry(0.055, 0.05, 0.42, 8), m.hullTrim, sx, 0.21, 0);
  }

  // 上半身與手臂（隨搖櫓微微前後俯仰）
  const torso = new THREE.Group();
  torso.position.set(0, 0.42, 0);
  man.add(torso);

  // 蓑衣／布衫軀幹
  addM(torso, new THREE.CylinderGeometry(0.15, 0.25, 0.56, 10), m.robe, 0, 0.26, 0);
  // 頭部
  addM(torso, new THREE.SphereGeometry(0.14, 12, 10), m.skin, 0, 0.66, 0);
  // 斗笠（竹編圓錐笠帽＋帽簷圈）
  addM(torso, new THREE.ConeGeometry(0.38, 0.2, 16), m.straw, 0, 0.8, 0);
  const brim = addM(torso, new THREE.TorusGeometry(0.37, 0.018, 6, 18), m.hullTrim, 0, 0.71, 0);
  brim.rotation.x = Math.PI / 2;

  // 雙手前伸握櫓
  for (const sx of [-1, 1]) {
    const arm = addM(torso, new THREE.CylinderGeometry(0.042, 0.038, 0.38, 8), m.robe, sx * 0.18, 0.36, 0.12);
    arm.rotation.x = 1.05;
    arm.rotation.z = sx * -0.25;
  }

  // 船尾長木櫓（斜伸入後方水中划水）
  const oarPivot = new THREE.Group();
  oarPivot.position.set(0.24, 0.52, 0.18);
  oarPivot.rotation.x = 0.92;
  man.add(oarPivot);
  addM(oarPivot, new THREE.CylinderGeometry(0.026, 0.024, 2.35, 8), m.hullTrim, 0, -0.35, 0);
  const blade = addM(oarPivot, new THREE.BoxGeometry(0.13, 0.68, 0.028), m.hull, 0, -1.35, 0);
  blade.rotation.y = 0.25;

  man.traverse((o) => {
    o.userData.keepOnModelSwap = true;
    o.userData.noMerge = true;
  });
  g.add(man);
  g.userData.oar = oarPivot;
  g.userData.boatmanTorso = torso;
}

/** 白天：烏篷漁船（直接載入貼皮 GLB 模型＋船尾戴斗笠船夫划船） */
export function fishingBoat(m: BoatMats) {
  const g = new THREE.Group();
  g.userData.noMerge = true;
  g.userData.modelAsset = 'openBoat';
  g.userData.modelSize = [2.35, 1.45, 4.4];
  g.userData.modelYaw = -Math.PI / 2;
  g.userData.lamps = [];
  addSternBoatman(g, m, 1.62, 0.28);
  void loadModelInto(g, 'openBoat');
  return g;
}

/** 沒屋頂的小舟（直接載入 open-boat.glb 貼皮模型，船尾戴斗笠船夫搖櫓＋夜間小燈） */
export function sampanBoat(m: BoatMats) {
  const g = new THREE.Group();
  g.userData.noMerge = true;
  g.userData.modelAsset = 'openBoat';
  g.userData.modelSize = [2.35, 1.45, 4.4];
  g.userData.modelYaw = -Math.PI / 2;
  addSternBoatman(g, m, 1.62, 0.28);
  const lamp = addM(g, new THREE.SphereGeometry(0.11, 10, 8), m.lantern, -0.22, 1.05, 1.95);
  lamp.userData.keepOnModelSwap = true;
  lamp.userData.noMerge = true;
  g.userData.lamps = [lamp];
  void loadModelInto(g, 'openBoat');
  return g;
}

/** 五艘裡面有一艘是有屋頂的畫舫，其餘是沒屋頂的小舟 */
export const boatHasRoof = (index: number) => index % 5 === 4;

/** 有屋頂的畫舫遊船（直接載入 roofed-boat.glb 貼皮模型，船尾戴斗笠船夫搖櫓＋四角夜間宮燈） */
export function pleasureBoat(m: BoatMats) {
  const g = new THREE.Group();
  g.userData.noMerge = true;
  g.userData.modelAsset = 'roofedBoat';
  g.userData.modelSize = [2.65, 2.4, 4.8];
  g.userData.modelYaw = -Math.PI / 2;
  addSternBoatman(g, m, 1.82, 0.32);
  const lamps: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const lamp = addM(g, new THREE.CylinderGeometry(0.1, 0.1, 0.22, 8), m.lantern, sx * 0.82, 1.55, sz * 1.15);
      lamp.userData.keepOnModelSwap = true;
      lamp.userData.noMerge = true;
      lamps.push(lamp);
    }
  }
  g.userData.lamps = lamps;
  void loadModelInto(g, 'roofedBoat');
  return g;
}

/* ---------------- 水燈與天燈 ---------------- */

function waterLantern(petal: THREE.Material, core: THREE.Material, glow: THREE.SpriteMaterial) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.3, 0.12, 8), new THREE.MeshStandardMaterial({ color: 0x3f6b3a, roughness: 0.9 }));
  base.position.y = 0.04;
  g.add(base);
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 5), petal);
    const a = (i / 8) * Math.PI * 2;
    p.position.set(Math.cos(a) * 0.24, 0.24, Math.sin(a) * 0.24);
    p.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
    g.add(p);
  }
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 8), core);
  c.position.y = 0.26;
  g.add(c);
  const s = new THREE.Sprite(glow);
  s.scale.setScalar(1.4);
  s.position.y = 0.35;
  g.add(s);
  return g;
}

function skyLantern(body: THREE.Material, glow: THREE.SpriteMaterial) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.36, 1.05, 10, 1, true), body);
  g.add(m);
  const top = new THREE.Mesh(new THREE.CircleGeometry(0.5, 10).rotateX(-Math.PI / 2), body);
  top.position.y = 0.525;
  g.add(top);
  const s = new THREE.Sprite(glow);
  s.scale.setScalar(3.2);
  g.add(s);
  return g;
}

interface Boat {
  group: THREE.Group;
  day: THREE.Group;
  night: THREE.Group;
  a: THREE.Vector2;
  b: THREE.Vector2;
  t: number;
  dir: number;
  speed: number;
  phase: number;
}

interface SkyLantern {
  g: THREE.Group;
  x: number;
  z: number;
  y: number;
  speed: number;
  phase: number;
}

export class WaterLife {
  readonly root = new THREE.Group();
  private boats: Boat[] = [];
  private waterLanterns = new THREE.Group();
  private skyLanterns: SkyLantern[] = [];
  private skyGroup = new THREE.Group();
  private skyGlow: THREE.SpriteMaterial;
  private rain: THREE.LineSegments;
  private rainSpeed: Float32Array;
  private tod: TimeOfDay = 'dusk';
  private weather: WeatherType = 'clear';
  private rand = seeded(20261028);
  private time = 0;

  constructor() {
    this.root.name = 'water_life';
    const m = boatMats();
    const routes = findRoutes(5, this.rand);
    routes.forEach((r, i) => {
      const group = new THREE.Group();
      // 五艘裡一艘是有屋頂的畫舫，其餘是沒屋頂的小舟（白天、晚上都一樣）
      const model = boatHasRoof(i) ? pleasureBoat(m) : sampanBoat(m);
      const day = model;
      const night = model;
      group.add(model);
      // 彩蛋：白天「見漁人…」、夜裡遊船「夜半鐘聲到客船」
      group.add(makePickProxy(1.8, 1.8, 4.6, 0, 0, 0, { kind: 'egg', egg: 'boat', maxDist: 70 }, -0.3));
      this.boats.push({ group, day, night, a: r.a, b: r.b, t: this.rand(), dir: i % 2 ? 1 : -1, speed: 0.9 + this.rand() * 0.5, phase: this.rand() * 6 });
      this.root.add(group);
    });

    // 水燈
    const petal = new THREE.MeshStandardMaterial({ color: 0xf6a5c0, roughness: 0.7, emissive: new THREE.Color(0xff7aa8), emissiveIntensity: 0.55 });
    const core = new THREE.MeshBasicMaterial({ color: 0xffd27a });
    const wGlow = new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffb35c, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
    for (const p of waterSpots(26, this.rand)) {
      const l = waterLantern(petal, core, wGlow);
      l.position.set(p.x, SEA_Y, p.y);
      l.rotation.y = this.rand() * Math.PI;
      l.userData.phase = this.rand() * 6;
      this.waterLanterns.add(l);
    }
    this.root.add(this.waterLanterns);

    // 天燈：遍佈全境天空（高空自然漂浮、錯落升空，避免聚集在局部區塊）
    const body = new THREE.MeshBasicMaterial({ color: 0xffa040, side: THREE.DoubleSide, transparent: true, opacity: 0.95, fog: false });
    this.skyGlow = new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff9a3c, transparent: true, opacity: 0.65, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const SKY_LANTERN_COUNT = 28;
    for (let i = 0; i < SKY_LANTERN_COUNT; i++) {
      const g = skyLantern(body, this.skyGlow);
      const scale = 1.25 + (i % 4) * 0.18;
      g.scale.setScalar(scale);
      // 初始均勻錯開於 12m ~ 85m 的天際各個高度
      const startY = 12 + (i / SKY_LANTERN_COUNT) * 72 + this.rand() * 6;
      const s = this.spawnSky(g, startY);
      this.skyLanterns.push(s);
      this.skyGroup.add(g);
    }
    this.root.add(this.skyGroup);

    // 細雨：玩家周圍落下的雨絲
    const n = 1400;
    const pos = new Float32Array(n * 6);
    this.rainSpeed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (this.rand() - 0.5) * 60;
      const y = this.rand() * 26;
      const z = (this.rand() - 0.5) * 60;
      pos.set([x, y, z, x + 0.05, y - 0.7, z], i * 6);
      this.rainSpeed[i] = 16 + this.rand() * 8;
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xaab8c8, transparent: true, opacity: 0.38, depthWrite: false }));
    this.rain.frustumCulled = false;
    this.root.add(this.rain);
    this.apply();
  }

  private spawnSky(g: THREE.Group, y: number): SkyLantern {
    // 均勻分佈於全島五島與大湖的開闊天際（範圍寬達 340m x 320m）
    const x = (this.rand() - 0.5) * 340;
    const z = (this.rand() - 0.5) * 310;
    return { g, x, z, y, speed: 0.65 + this.rand() * 0.45, phase: this.rand() * Math.PI * 2 };
  }

  setTimeOfDay(t: TimeOfDay) {
    this.tod = t;
    this.apply();
  }

  setWeather(w: WeatherType) {
    this.weather = w;
    this.apply();
  }

  get currentWeather() {
    return this.weather;
  }

  private apply() {
    const clear = this.weather === 'clear';
    const night = this.tod === 'night';
    for (const b of this.boats) {
      b.group.visible = clear;
      b.day.visible = true;
      b.night.visible = true;
    }
    this.waterLanterns.visible = clear && night;
    this.skyGroup.visible = clear && (night || this.tod === 'dusk');
    this.rain.visible = !clear;
  }

  update(dt: number, cam: THREE.Vector3) {
    this.time += dt;
    const t = this.time;
    if (this.weather === 'clear') {
      for (const b of this.boats) {
        const len = b.a.distanceTo(b.b) || 1;
        b.t += (b.dir * b.speed * dt) / len;
        if (b.t > 1) {
          b.t = 1;
          b.dir = -1;
        } else if (b.t < 0) {
          b.t = 0;
          b.dir = 1;
        }
        // 兩端慢慢迴轉
        const x = b.a.x + (b.b.x - b.a.x) * b.t;
        const z = b.a.y + (b.b.y - b.a.y) * b.t;
        b.group.position.set(x, SEA_Y + 0.05 + Math.sin(t * 1.3 + b.phase) * 0.05, z);
        const heading = Math.atan2(-(b.b.x - b.a.x) * b.dir, -(b.b.y - b.a.y) * b.dir);
        let dy = heading - b.group.rotation.y;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        b.group.rotation.y += dy * Math.min(1, dt * 0.8);
        b.group.rotation.z = Math.sin(t * 0.9 + b.phase) * 0.025;
        animateModelMotion(b.day, t + b.phase, b.speed, 'boat');
      }
      if (this.tod === 'night') {
        for (const l of this.waterLanterns.children) {
          const ph = l.userData.phase as number;
          l.position.y = SEA_Y + Math.sin(t * 0.8 + ph) * 0.04;
          l.rotation.y += dt * 0.05;
        }
      }
      if (this.tod === 'night' || this.tod === 'dusk') {
        for (const s of this.skyLanterns) {
          s.y += s.speed * dt;
          if (s.y > 96) {
            Object.assign(s, this.spawnSky(s.g, 10 + this.rand() * 12));
          }
          s.g.position.set(
            s.x + Math.sin(t * 0.15 + s.phase) * 5.5,
            s.y,
            s.z + Math.cos(t * 0.12 + s.phase) * 5.5
          );
          s.g.rotation.y = t * 0.08 + s.phase;
          s.g.rotation.z = Math.sin(t * 0.6 + s.phase) * 0.05;
        }
        this.skyGlow.opacity = 0.55 + Math.sin(t * 2.3) * 0.08;
      }
    }
    // 在地下室時不下雨
    this.rain.visible = this.weather === 'rain' && cam.y > -1.5;
    if (this.rain.visible) {
      // 雨絲跟著玩家，但遇到建築屋頂、室內、迴廊與店鋪遮簷即刻遮擋，屋內絕不下雨
      const pos = this.rain.geometry.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let i = 0; i < this.rainSpeed.length; i++) {
        const o = i * 6;
        let x = arr[o];
        let y = arr[o + 1] - this.rainSpeed[i] * dt;
        let z = arr[o + 2];
        if (y < cam.y - 4 || isUnderRoof(x, y - 0.7, z)) {
          y = cam.y + 18 + Math.random() * 6;
          x = cam.x + (Math.random() - 0.5) * 60;
          z = cam.z + (Math.random() - 0.5) * 60;
        }
        if (x - cam.x > 30) x -= 60;
        else if (x - cam.x < -30) x += 60;
        if (z - cam.z > 30) z -= 60;
        else if (z - cam.z < -30) z += 60;
        const sheltered = isUnderRoof(x, y, z) || isUnderRoof(x, y - 0.7, z);
        arr[o] = x;
        arr[o + 1] = y;
        arr[o + 2] = z;
        arr[o + 3] = sheltered ? x : x + 0.05;
        arr[o + 4] = sheltered ? y : y - 0.7;
        arr[o + 5] = z;
      }
      pos.needsUpdate = true;
    }
  }
}
