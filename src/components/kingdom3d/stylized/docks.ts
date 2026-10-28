import * as THREE from 'three';
import type { Collider } from '../types';
import { BOARDING_SPOTS, TRAILHEAD, islandEdge, BASIN_LANDMARKS } from './basinLayout';
import { REGION_CONFIGS, WEST_LANDING } from '../regionConfigs';
import { getStyleMaterials, LanternBatch, buildRoofTier, scaledBox } from './architecture';
import { signboardTexture, seeded } from './textures';
import { makePickProxy } from '../picking';
import { openWater } from './waterLife';

/**
 * 渡口（乘船點）與塔樓登山口
 * - 渡口：岸邊的木棧橋＋小亭＋「乘船點」招牌；點了可以搭船自由遊湖（每船兩人、同時最多 25 艘）
 * - 登山口：西側田園山腳的石牌坊（從「聚雲塔登山渡口」上岸沿石板路走過去），點了直通塔樓山台的塔外空地；山上有「下山」石碑回到登山口
 */

export interface Dock {
  id: string;
  name: string;
  regionId: string;
  /** 岸上站的位置（下船回到這裡） */
  landX: number;
  landZ: number;
  landYaw: number;
  /** 船靠岸的位置（水面上） */
  waterX: number;
  waterZ: number;
  waterYaw: number;
}

const DEG = Math.PI / 180;

/** 從島中心往外，找到第一個夠寬的水面當船位 */
function findWater(regionId: string, deg: number): [number, number] {
  for (let d = 9; d < 40; d += 0.5) {
    const [x, z] = islandEdge(regionId, deg, d);
    if (openWater(x, z, 2.6)) return [x, z];
  }
  return islandEdge(regionId, deg, 16);
}

export const DOCKS: Dock[] = BOARDING_SPOTS.map((s) => {
  const [lx, lz] = s.fixed ? s.fixed.land : islandEdge(s.regionId, s.deg, -1.5);
  const [wx, wz] = s.fixed ? s.fixed.water : findWater(s.regionId, s.deg);
  const outYaw = Math.atan2(-(wx - lx), -(wz - lz)); // 面向水面
  return { id: s.id, name: s.name, regionId: s.regionId, landX: lx, landZ: lz, landYaw: outYaw, waterX: wx, waterZ: wz, waterYaw: outYaw };
});

export const findDock = (id: string) => DOCKS.find((d) => d.id === id) || null;

export function nearestDock(x: number, z: number) {
  let best = DOCKS[0];
  let bd = Infinity;
  for (const d of DOCKS) {
    const dd = Math.hypot(d.waterX - x, d.waterZ - z);
    if (dd < bd) {
      bd = dd;
      best = d;
    }
  }
  return best;
}

/** 登山口（島上）與山上塔外空地 */
export const TRAIL = (() => {
  // 西側田園山腳（WEST_LANDING.trail）：牌坊背對山、面向從渡口走過來的人；yaw 朝向山（下山回來時面向渡口）
  const [x, z] = WEST_LANDING.trail;
  const wp = BASIN_LANDMARKS.westPlateau;
  // 牌坊正面朝向渡口
  const fdx = WEST_LANDING.dockLand[0] - x;
  const fdz = WEST_LANDING.dockLand[1] - z;
  return {
    x,
    z,
    yaw: Math.atan2(-fdx, -fdz) - Math.PI,
    /** 山台頂（塔在 wp.x+2）：空地在塔的東側，面向塔 */
    topX: wp.x + 9.4,
    topZ: wp.z + 2.0,
    topY: 30,
    topYaw: Math.PI / 2,
    plateauX: wp.x,
    plateauZ: wp.z,
    plateauR: 11.2,
    pagodaX: wp.x + 2,
    pagodaZ: wp.z,
    /** 塔頂（第五層）樓板高度：從這裡眺望五島 */
    topFloorY: 30 + 1.2 + 3.6 + 0.55 + (2.6 + 0.55) * 3,
  };
})();

function sign(title: string, sub: string, w: number) {
  const tex = signboardTexture(title, sub);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.32), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.5, roughness: 0.5 }));
  m.userData.noMerge = true;
  return m;
}

/** 某座島上的渡口與登山口 */
export function createDocks(regionId: string): { group: THREE.Group; colliders: Collider[] } | null {
  const list = DOCKS.filter((d) => d.regionId === regionId);
  const trail = TRAILHEAD.regionId === regionId;
  if (!list.length && !trail) return null;
  const sm = getStyleMaterials();
  const g = new THREE.Group();
  g.name = `docks_${regionId}`;
  const colliders: Collider[] = [];
  const lan = new LanternBatch();
  const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, ry = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  for (const d of list) {
    // 本地座標：+Z 指向水面
    const dg = new THREE.Group();
    dg.position.set(d.landX, d.regionId === 'west' ? WEST_LANDING.y - 0.15 : 0, d.landZ);
    dg.rotation.y = d.landYaw + Math.PI;
    g.add(dg);
    const len = Math.max(6, Math.hypot(d.waterX - d.landX, d.waterZ - d.landZ) + 1.5);
    // 木棧橋
    add(dg, new THREE.BoxGeometry(2.4, 0.16, len), sm.woodFloor, 0, 0.2, len / 2 + 0.6);
    for (let k = 0; k <= Math.floor(len / 2.2); k++) {
      for (const sx of [-1, 1]) add(dg, new THREE.CylinderGeometry(0.11, 0.13, 2.2, 8), sm.darkWood, sx * 1.1, -0.85, 1.4 + k * 2.2);
    }
    for (const sx of [-1, 1]) add(dg, new THREE.BoxGeometry(0.08, 0.08, len - 1.2), sm.redLacquer, sx * 1.15, 0.95, len / 2 + 1.2);
    for (const sx of [-1, 1]) for (let k = 0; k <= 3; k++) add(dg, new THREE.BoxGeometry(0.08, 0.8, 0.08), sm.redLacquer, sx * 1.15, 0.6, 1.2 + (k * (len - 1.2)) / 3);
    // 渡口小亭（岸上）
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(dg, new THREE.CylinderGeometry(0.13, 0.15, 2.7, 10), sm.redLacquer, sx * 1.3, 1.35, sz * 1.0);
    const roof = buildRoofTier(3.4, 2.8, { rise: 0.9, overhang: 0.5, curl: 0.35, theme: 'slate', ridge: true, lite: true, horns: false });
    roof.position.y = 2.7;
    dg.add(roof);
    add(dg, scaledBox(3.0, 0.15, 2.4, 1.5, 0.15, 1.5), sm.stoneLight, 0, 0.07, 0);
    const s1 = sign('乘船點', d.name.replace(/^.*島/, ''), 1.6);
    s1.position.set(0, 2.35, -1.08);
    s1.rotation.y = Math.PI; // 面向岸上走過來的人
    dg.add(s1);
    // 繫船柱與船槳
    add(dg, new THREE.CylinderGeometry(0.14, 0.16, 0.8, 10), sm.darkWood, 0.8, 0.6, len + 0.2);
    // 船槳靠在棧橋欄杆邊（不橫在走道上）
    add(dg, new THREE.BoxGeometry(0.08, 0.05, 2.2), sm.darkWood, -0.95, 0.33, 2.6);
    dg.updateMatrixWorld(true);
    for (const [sx, sz] of [[-1.3, 1.0], [1.3, 1.0]] as [number, number][]) {
      const v = new THREE.Vector3(sx, 2.2, sz).applyMatrix4(dg.matrixWorld);
      lan.addHanging(v.x, v.y, v.z, 0.6);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const v = new THREE.Vector3(sx * 1.3, 0, sz * 1.0).applyMatrix4(dg.matrixWorld);
      colliders.push({ id: `${d.id}-post-${sx}-${sz}`, type: 'cylinder', x: v.x, z: v.z, radius: 0.2 });
    }
    // 點小亭或棧橋就能搭船
    const pick = makePickProxy(3.2, 3.2, len + 3, 0, (len + 2) / 2 - 1.2, 0, { kind: 'dock', id: d.id });
    dg.add(pick);
  }
  if (trail) {
    const tg = new THREE.Group();
    tg.position.set(TRAIL.x, regionId === 'west' ? WEST_LANDING.y : 0, TRAIL.z);
    tg.rotation.y = TRAIL.yaw + Math.PI;
    g.add(tg);
    // 石牌坊＋「登山步道」匾＋往塔的指路石
    for (const sx of [-1, 1]) {
      add(tg, scaledBox(0.7, 3.4, 0.7, 1, 1.2, 1), sm.stone, sx * 1.6, 1.7, 0);
      const v = new THREE.Vector3(sx * 1.6, 0, 0).applyMatrix4((tg.updateMatrixWorld(true), tg.matrixWorld));
      colliders.push({ id: `trail-${sx}`, type: 'cylinder', x: v.x, z: v.z, radius: 0.45 });
    }
    add(tg, scaledBox(4.2, 0.45, 0.8, 1.5, 0.45, 1.5), sm.stoneLight, 0, 3.55, 0);
    const roof = buildRoofTier(4.6, 1.3, { rise: 0.55, overhang: 0.4, curl: 0.35, theme: 'slate', ridge: true, lite: true, horns: false });
    roof.position.y = 3.8;
    tg.add(roof);
    const s1 = sign('聚雲塔登山口', '點這裡直上聚雲塔山台', 2.6);
    s1.position.set(0, 2.75, -0.42);
    s1.rotation.y = Math.PI;
    tg.add(s1);
    const stele = add(tg, new THREE.BoxGeometry(0.9, 1.6, 0.25), sm.stone, 2.6, 0.8, 0.8);
    stele.rotation.y = -0.4;
    tg.add(makePickProxy(4.4, 4.2, 2.4, 0, 0.6, 0, { kind: 'trail', dir: 'up' }));
    if (regionId === 'west') {
      // 牌坊後面的山腳：一座石砌隧道口（登山步道從這裡鑽進山裡）
      const arch = add(tg, new THREE.TorusGeometry(2.4, 0.45, 8, 20, Math.PI), sm.stone, 0, 0.2, 2.6);
      arch.scale.set(1, 1.15, 1.6);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(2.4, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x0a0806 }));
      hole.position.set(0, 0.2, 2.9);
      hole.rotation.y = Math.PI;
      hole.scale.y = 1.15;
      tg.add(hole);
      for (const sx of [-1, 1]) add(tg, scaledBox(0.9, 0.6, 2.4, 1, 1, 1), sm.stone, sx * 2.4, 0.3, 2.6);
    }
  }
  if (regionId === 'west') {
    // 渡口到登山口的田間石板路（兩旁石燈）
    const W = WEST_LANDING;
    const [ax, az] = W.dockLand;
    const [bx, bz] = W.trail;
    const len = Math.hypot(bx - ax, bz - az);
    const yaw = Math.atan2(bx - ax, bz - az);
    const pg = new THREE.Group();
    g.add(pg);
    const n = Math.floor(len / 1.25);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const slab = add(pg, new THREE.BoxGeometry(W.halfWidth * 1.7, 0.12, 1.05), sm.stoneLight, ax + (bx - ax) * t, W.y + 0.04, az + (bz - az) * t, yaw);
      slab.receiveShadow = true;
    }
    for (let i = 1; i < 6; i++) {
      const t = i / 6;
      for (const sd of [-1, 1]) {
        const px = ax + (bx - ax) * t + Math.cos(yaw) * sd * (W.halfWidth + 0.6);
        const pz = az + (bz - az) * t - Math.sin(yaw) * sd * (W.halfWidth + 0.6);
        lan.addPost(px, W.y, pz, 1.6);
        colliders.push({ id: `west-path-lamp-${i}-${sd}`, type: 'cylinder', x: px, z: pz, radius: 0.28 });
      }
    }
  }
  g.add(lan.build());
  return { group: g, colliders };
}

/** 山上：塔外空地的「下山」石碑（點了回到登山口）與空地上的碰撞 */
export function createPlateauExtras(): { group: THREE.Group; colliders: Collider[] } {
  const sm = getStyleMaterials();
  const g = new THREE.Group();
  g.name = 'plateau_extras';
  const x = PLATEAU_STELE[0];
  const z = PLATEAU_STELE[1];
  const stele = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.8, 0.3), sm.stone);
  stele.position.set(x, TRAIL.topY + 0.9, z);
  stele.rotation.y = Math.PI / 2 - 0.5;
  g.add(stele);
  const s1 = sign('下山', '回到痛點島登山口', 1.4);
  s1.position.set(x, TRAIL.topY + 2.25, z);
  s1.rotation.y = Math.PI / 2 - 0.5;
  g.add(s1);
  g.add(makePickProxy(1.8, 2.8, 1.8, x, z, 0, { kind: 'trail', dir: 'down' }, TRAIL.topY));
  // 點塔：上到塔頂眺望（目前塔樓的功能只有這個）
  g.add(makePickProxy(11.4, 16, 11.4, TRAIL.pagodaX, TRAIL.pagodaZ, 0, { kind: 'trail', dir: 'top' }, TRAIL.topY));
  // 塔頂：「下塔」小牌（點了回到塔外空地）
  {
    // 牌子放在南北兩側面（不擋往東看五島的風景），而且放低一點
    for (const sd of [-1, 1]) {
      const sg = sign('下塔', '回到塔外空地', 0.9);
      sg.position.set(TRAIL.pagodaX - 0.4, TRAIL.topFloorY + 1.05, TRAIL.pagodaZ + sd * 1.6);
      sg.rotation.y = sd > 0 ? Math.PI : 0;
      g.add(sg);
      g.add(makePickProxy(1.1, 1.0, 0.4, TRAIL.pagodaX - 0.4, TRAIL.pagodaZ + sd * 1.6, 0, { kind: 'trail', dir: 'down-top' }, TRAIL.topFloorY + 0.6));
    }
    // 塔頂樓板
    const fl = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.08, 8), sm.woodFloor);
    fl.position.set(TRAIL.pagodaX, TRAIL.topFloorY + 0.04, TRAIL.pagodaZ);
    g.add(fl);
  }
  // 塔匾「聚雲塔」（一樓東面，朝向五島）
  {
    const plaque = sign('聚雲塔', '西側山台・五層塔', 2.8);
    plaque.position.set(TRAIL.pagodaX + 3.8, TRAIL.topY + 3.95, TRAIL.pagodaZ);
    plaque.rotation.y = Math.PI / 2;
    g.add(plaque);
  }
  // 山頂的低雲（觸手可及；點雲：坐看雲起時）
  {
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.9, emissive: new THREE.Color(0xdfe8f2), emissiveIntensity: 0.35, depthWrite: false });
    const rand = seeded(3131);
    const clouds: { m: THREE.Group; bx: number; bz: number; by: number; ph: number }[] = [];
    const ANG = [95, 140, 185, 228, 272, 318, 25];
    ANG.forEach((deg, i) => {
      const a = deg * DEG;
      const r = i === 6 ? 12.5 : 8.6 + rand() * 2.6;
      const cx = TRAIL.plateauX + Math.cos(a) * r;
      const cz = TRAIL.plateauZ + Math.sin(a) * r;
      const cy = TRAIL.topY + 0.5 + rand() * 1.0;
      const cg = new THREE.Group();
      const n = 5 + Math.floor(rand() * 3);
      for (let k = 0; k < n; k++) {
        const sz = 0.55 + rand() * 0.6;
        const puff = new THREE.Mesh(new THREE.SphereGeometry(sz, 12, 9), cloudMat);
        puff.position.set((rand() - 0.5) * 2.2, (rand() - 0.3) * 0.5, (rand() - 0.5) * 1.4);
        puff.scale.y = 0.7;
        puff.renderOrder = 2;
        cg.add(puff);
      }
      cg.position.set(cx, cy, cz);
      g.add(cg);
      clouds.push({ m: cg, bx: cx, bz: cz, by: cy, ph: rand() * 10 });
      // 跟著雲飄的點擊範圍
      cg.add(makePickProxy(2.8, 1.6, 2.0, 0, 0, 0, { kind: 'egg', egg: 'mist', maxDist: 30, minY: 20 }, -0.7));
    });
    g.userData.tick = (t: number) => {
      for (const c of clouds) {
        c.m.position.set(c.bx + Math.sin(t * 0.07 + c.ph) * 0.9, c.by + Math.sin(t * 0.35 + c.ph) * 0.15, c.bz + Math.cos(t * 0.05 + c.ph) * 0.7);
      }
    };
  }
  void REGION_CONFIGS;
  return { group: g, colliders: PLATEAU_COLLIDERS };
}

const PLATEAU_STELE: [number, number] = [TRAIL.plateauX + 6.5, TRAIL.plateauZ + 7.6];
/** 山台上的樹（和山台建模用同一組亂數） */
const PLATEAU_TREES: Collider[] = (() => {
  const rand = seeded(5);
  const out: Collider[] = [];
  for (let i = 0; i < 16; i++) {
    const a = rand() * Math.PI * 2;
    const r = 8 + rand() * 4;
    const sc = 1 + rand() * 0.5;
    out.push({ id: `plateau-tree-${i}`, type: 'cylinder', x: TRAIL.pagodaX + Math.cos(a) * r, z: TRAIL.pagodaZ + Math.sin(a) * r, radius: 0.35 * sc + 0.1 });
  }
  return out;
})();
/** 山台上的碰撞：塔基、下山石碑 */
export const PLATEAU_COLLIDERS: Collider[] = [
  { id: 'plateau-pagoda', type: 'box', x: TRAIL.pagodaX, z: TRAIL.pagodaZ, halfWidth: 5.9, halfDepth: 5.9 },
  { id: 'plateau-stele', type: 'cylinder', x: PLATEAU_STELE[0], z: PLATEAU_STELE[1], radius: 0.75 },
  ...PLATEAU_TREES,
];
