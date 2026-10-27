import * as THREE from 'three';
import type { Collider } from '../types';
import { localToWorldXZ } from '../regionConfigs';
import { getStyleMaterials, buildRoofTier, mergeByMaterial, LanternBatch, scaledBox } from './architecture';
import { signboardTexture, coupletTexture, scrollPaintingTexture } from './textures';
import { makePickProxy } from '../picking';
import { DOOR_COUPLETS } from '../couplets';
import { FLOOR_H } from './multiStory';
import { drawPainBoardTexture, deskPaperTexture, MAIN_BOARD, SIDE_BOARD, PainBoardLayout } from './painBoard';

/**
 * 創點樓＝客家圓形土樓（照 /island）：整棟就是一個環形建築。
 * - 外圈夯土牆，正面青石拱門樓；環形黛瓦大屋頂＋鎏金環脊
 * - 一樓、二樓、三樓都是環形迴廊，沿外牆內側掛滿懸賞牆，可以一路逛痛點；迴廊內側是面向中庭的欄杆
 * - 樓梯就在迴廊裡（沿弦方向的直跑樓梯）
 * - 中間是露天中庭：日常疑難的佈告欄、桌椅、創點舞台、提案台、佈告桌（刊登痛點）
 * 座標：本地 +Z 是大門方向；角度 θ 從 +Z 往 +X 量（x = r·sinθ，z = r·cosθ）。
 */
export const TULOU_RADIUS = 22;
export const RING = {
  R: 22,
  T: 0.9,
  RO: 21.1, // 迴廊外緣（外牆內面）
  RI: 16.5, // 迴廊內緣（欄杆）
  RC: 19.6, // 迴廊裡樓梯的中心半徑
  SPLIT: 18.6, // 樓板內外兩圈的分界（外圈在樓梯井處留洞）
  RIDGE: 19.3, // 屋脊半徑
  floors: 3,
  FH: FLOOR_H,
  gateW: 5.4,
};

export interface RingFlight {
  k: number;
  theta: number;
  c: THREE.Vector2; // 樓梯中心（本地 x,z）
  t: THREE.Vector2; // 沿樓梯往上的方向
  n: THREE.Vector2; // 往外（徑向）
  L: number;
  laneW: number;
}

/** 第 k 段樓梯（k 樓 → k+1 樓）擺在迴廊裡的角度：左後、右後交替 */
const FLIGHT_THETA = [(135 * Math.PI) / 180, (-135 * Math.PI) / 180];

export function ringFlights(): RingFlight[] {
  const L = 6.6;
  const laneW = 1.6;
  const rc = RING.RC;
  return Array.from({ length: RING.floors - 1 }, (_, k) => {
    const th = FLIGHT_THETA[k % FLIGHT_THETA.length];
    const n = new THREE.Vector2(Math.sin(th), Math.cos(th));
    const t = new THREE.Vector2(Math.cos(th), -Math.sin(th));
    return { k, theta: th, c: n.clone().multiplyScalar(rc), t, n, L, laneW };
  });
}

const at = (f: RingFlight, u: number, v: number) => new THREE.Vector2(f.c.x + f.t.x * u + f.n.x * v, f.c.y + f.t.y * u + f.n.y * v);
const frame = (f: RingFlight, x: number, z: number) => {
  const dx = x - f.c.x;
  const dz = z - f.c.y;
  return { u: dx * f.t.x + dz * f.t.y, v: dx * f.n.x + dz * f.n.y };
};

interface Placed {
  position: THREE.Vector3;
  facingYaw: number;
  id: string;
}
const toLocal = (b: Placed, x: number, z: number): [number, number] => {
  const rx = x - b.position.x;
  const rz = z - b.position.z;
  const c = Math.cos(b.facingYaw);
  const s = Math.sin(b.facingYaw);
  return [rx * c - rz * s, rx * s + rz * c];
};
const W = (b: Placed, lx: number, lz: number) => localToWorldXZ(b.position.x, b.position.z, b.facingYaw, lx, lz);

function segs(b: Placed, list: [number, number, number, number, number][], prefix: string): Collider[] {
  return list.map(([x1, z1, x2, z2, ht], i) => {
    const [ax, az] = W(b, x1, z1);
    const [bx, bz] = W(b, x2, z2);
    return { id: `${b.id}-${prefix}-${i}`, type: 'segment', x1: ax, z1: az, x2: bx, z2: bz, halfThickness: ht } as Collider;
  });
}

/** 外牆一圈（一樓留大門） */
function wallRing(b: Placed, withGate: boolean): Collider[] {
  const N = 72;
  const rc = RING.R - RING.T / 2;
  const gap = RING.gateW / 2 / RING.R;
  const list: [number, number, number, number, number][] = [];
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2;
    const a1 = ((i + 1) / N) * Math.PI * 2;
    const md = Math.atan2(Math.sin((a0 + a1) / 2), Math.cos((a0 + a1) / 2));
    if (withGate && Math.abs(md) < gap + Math.PI / N) continue;
    list.push([Math.sin(a0) * rc, Math.cos(a0) * rc, Math.sin(a1) * rc, Math.cos(a1) * rc, RING.T / 2 + 0.05]);
  }
  return segs(b, list, withGate ? 'wall-g' : 'wall');
}

/** 樓上與迴廊的碰撞：level 0＝一樓（只有往上的樓梯扶手；外牆、柱子等另外由 createRingTower 提供） */
export function ringLevelColliders(b: Placed, level: number): Collider[] {
  const out: Collider[] = [];
  const fl = ringFlights();
  if (level > 0) {
    out.push(...wallRing(b, false));
    // 內緣欄杆一圈
    const N = 60;
    const list: [number, number, number, number, number][] = [];
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2;
      const a1 = ((i + 1) / N) * Math.PI * 2;
      list.push([Math.sin(a0) * RING.RI, Math.cos(a0) * RING.RI, Math.sin(a1) * RING.RI, Math.cos(a1) * RING.RI, 0.12]);
    }
    out.push(...segs(b, list, `rail-${level}`));
    // 下面上來的樓梯井：內側＋下端封住，上端開放（走進去就下樓）
    const f = fl[level - 1];
    const h = f.laneW / 2;
    const p1 = at(f, -f.L / 2, -h);
    const p2 = at(f, f.L / 2, -h);
    const p3 = at(f, -f.L / 2, h);
    out.push(...segs(b, [[p1.x, p1.y, p2.x, p2.y, 0.12], [p1.x, p1.y, p3.x, p3.y, 0.12]], `hole-${level}`));
  }
  const up = fl[level];
  if (up) {
    const h = up.laneW / 2;
    const a = at(up, -up.L / 2 + 0.9, -h);
    const bb = at(up, up.L / 2, -h);
    const c = at(up, up.L / 2, h);
    out.push(...segs(b, [[a.x, a.y, bb.x, bb.y, 0.12], [bb.x, bb.y, c.x, c.y, 0.12]], `up-${level}`));
  }
  return out;
}

/** 走到樓梯口：回傳要沿著走的路徑與目標樓層 */
export function ringStair(b: Placed, level: number, x: number, z: number, from: THREE.Vector3): { pts: THREE.Vector3[]; toLevel: number } | null {
  const fl = ringFlights();
  const [lx, lz] = toLocal(b, x, z);
  const fh = RING.FH;
  const P = (f: RingFlight, u: number, y: number) => {
    const p = at(f, u, 0);
    const [wx, wz] = W(b, p.x, p.y);
    return new THREE.Vector3(wx, y, wz);
  };
  const up = fl[level];
  if (up) {
    const { u, v } = frame(up, lx, lz);
    if (Math.abs(v) <= up.laneW / 2 && u >= -up.L / 2 - 0.6 && u <= -up.L / 2 + 0.5) {
      return { pts: [from.clone(), P(up, -up.L / 2 + 0.2, level * fh), P(up, up.L / 2, (level + 1) * fh), P(up, up.L / 2 + 1.0, (level + 1) * fh)], toLevel: level + 1 };
    }
  }
  if (level > 0) {
    const f = fl[level - 1];
    const { u, v } = frame(f, lx, lz);
    if (Math.abs(v) <= f.laneW / 2 && u >= f.L / 2 - 1.0 && u <= f.L / 2 + 0.2) {
      return { pts: [from.clone(), P(f, f.L / 2, level * fh), P(f, -f.L / 2, (level - 1) * fh), P(f, -f.L / 2 - 1.2, (level - 1) * fh)], toLevel: level - 1 };
    }
  }
  return null;
}

/** 是否在土樓範圍內（外牆以內） */
export function insideRing(b: Placed, x: number, z: number) {
  const [lx, lz] = toLocal(b, x, z);
  return Math.hypot(lx, lz) < RING.R;
}

let earthMat: THREE.MeshStandardMaterial | null = null;
function earth() {
  if (!earthMat) earthMat = new THREE.MeshStandardMaterial({ color: 0xd2b184, roughness: 0.97, side: THREE.DoubleSide });
  return earthMat;
}

function arcWall(r: number, y0: number, h: number, t0: number, t1: number, seg: number) {
  const g = new THREE.CylinderGeometry(r, r, h, seg, 1, true, t0, t1 - t0);
  g.translate(0, y0 + h / 2, 0);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const arcLen = r * (t1 - t0);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * arcLen) / 2.4, (uv.getY(i) * h) / 2.4);
  return g;
}

/** 平放的環形板（θ 範圍 t0..t1；本地極座標） */
function annulus(r0: number, r1: number, t0: number, t1: number, seg: number, faceUp = true) {
  const g = new THREE.RingGeometry(r0, r1, seg, 1, t0 - Math.PI / 2, t1 - t0);
  g.rotateX(faceUp ? -Math.PI / 2 : Math.PI / 2);
  if (!faceUp) g.scale(1, 1, -1);
  const p = g.attributes.position as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 2.5, p.getZ(i) / 2.5);
  g.computeVertexNormals();
  return g;
}

interface RingTowerInput extends Placed {
  name: string;
  doorWidth?: number;
}

export function createRingTower(b: RingTowerInput): THREE.Group {
  const mats = getStyleMaterials();
  const { R, T, RO, RI, FH } = RING;
  const H = RING.floors * FH;
  const gateW = RING.gateW;
  const gateH = 4.0;
  const gap = gateW / 2 / R;
  const root = new THREE.Group();
  root.position.copy(b.position);
  root.rotation.y = b.facingYaw;
  root.name = `tulou_${b.id}`;
  const body = new THREE.Group();
  root.add(body);
  const inner = new THREE.Group();
  root.add(inner);
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, ry = 0, parent: THREE.Object3D = body) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    parent.add(m);
    return m;
  };
  const lanterns = new LanternBatch();
  const fl = ringFlights();
  const t0 = gap;
  const t1 = Math.PI * 2 - gap;

  // ── 外牆：石砌台基、護裙、夯土牆（裡外兩面）、門洞上方、腰線、每層小窗
  add(arcWall(R + 0.55, 0, 0.5, t0 - 0.02, t1 + 0.02, 96), mats.stone);
  add(arcWall(R + 0.04, 0, 1.6, t0, t1, 96), mats.stone);
  add(arcWall(R, 1.6, H - 1.6, t0, t1, 96), earth());
  add(arcWall(RO, 0, H, t0, t1, 96), earth());
  add(arcWall(R, gateH, H - gateH, -gap, gap, 8), earth());
  add(arcWall(RO, gateH, H - gateH, -gap, gap, 8), earth());
  for (const s of [-1, 1]) {
    const th = s * gap;
    add(new THREE.BoxGeometry(0.12, gateH, T), mats.stone, Math.sin(th) * (R - T / 2), gateH / 2, Math.cos(th) * (R - T / 2), th + Math.PI / 2);
  }
  add(new THREE.BoxGeometry(gateW, 0.2, T), mats.stone, 0, gateH, R - T / 2);
  for (let k = 1; k < RING.floors; k++) add(arcWall(R + 0.06, k * FH - 0.1, 0.18, t0, t1, 96), mats.darkWood);
  const winGeo = new THREE.BoxGeometry(0.7, 0.9, 0.14);
  const frameGeo = new THREE.BoxGeometry(0.86, 1.06, 0.1);
  const nWin = 32;
  for (let i = 0; i < nWin; i++) {
    const th = (i / nWin) * Math.PI * 2 + Math.PI / nWin;
    for (let k = 0; k < RING.floors; k++) {
      if (k === 0 && Math.cos(th) > 0.9) continue;
      const wy = k * FH + 2.4;
      add(frameGeo, mats.darkWood, Math.sin(th) * (R + 0.04), wy, Math.cos(th) * (R + 0.04), th);
      add(winGeo, mats.lampPaper, Math.sin(th) * (R + 0.08), wy, Math.cos(th) * (R + 0.08), th);
    }
  }

  // ── 樓板（二樓、三樓）：內圈整環＋外圈在樓梯井處留洞；底面當下一層的天花
  const holeHalf = (f: RingFlight) => (f.L / 2 + 0.3) / RING.RC;
  for (let k = 1; k < RING.floors; k++) {
    const y = k * FH;
    const f = fl[k - 1];
    add(annulus(RI - 0.25, RING.SPLIT, 0, Math.PI * 2, 96), mats.woodFloor, 0, y, 0);
    add(annulus(RI - 0.25, RING.SPLIT, 0, Math.PI * 2, 96, false), mats.darkWood, 0, y - 0.25, 0);
    const a0 = f.theta + holeHalf(f);
    const a1 = f.theta - holeHalf(f) + Math.PI * 2;
    add(annulus(RING.SPLIT, RO, a0, a1, 84), mats.woodFloor, 0, y, 0);
    add(annulus(RING.SPLIT, RO, a0, a1, 84, false), mats.darkWood, 0, y - 0.25, 0);
    add(arcWall(RI - 0.25, y - 0.25, 0.25, 0, Math.PI * 2, 96), mats.redLacquer);
    // 迴廊欄杆（朝中庭）
    add(arcWall(RI - 0.02, y, 0.9, 0, Math.PI * 2, 96), mats.balustrade);
    add(new THREE.TorusGeometry(RI, 0.06, 6, 96).rotateX(Math.PI / 2), mats.redLacquer, 0, y + 0.95, 0);
    // 樓梯井欄杆（內側＋下端）
    const h = f.laneW / 2;
    const pa = at(f, -f.L / 2, -h);
    const pb = at(f, f.L / 2, -h);
    const pc = at(f, -f.L / 2, h);
    for (const [p, q] of [[pa, pb], [pa, pc]] as [THREE.Vector2, THREE.Vector2][]) {
      const len = p.distanceTo(q);
      const mid = p.clone().add(q).multiplyScalar(0.5);
      const ang = Math.atan2(q.x - p.x, q.y - p.y);
      add(new THREE.BoxGeometry(0.1, 0.1, len), mats.redLacquer, mid.x, y + 0.95, mid.y, ang);
      const np = Math.max(2, Math.round(len / 1.1));
      for (let i = 0; i <= np; i++) add(new THREE.BoxGeometry(0.08, 0.95, 0.08), mats.redLacquer, p.x + ((q.x - p.x) * i) / np, y + 0.475, p.y + ((q.y - p.y) * i) / np);
    }
  }
  // 一樓迴廊地面（石板）與中庭邊的石緣
  add(annulus(RI - 0.25, RO, 0, Math.PI * 2, 96), mats.stoneLight, 0, 0.03, 0);
  add(arcWall(RI - 0.25, 0, 0.12, 0, Math.PI * 2, 96), mats.stone);

  // ── 迴廊內緣的紅柱（落地到屋頂），每層掛燈籠
  const nPost = 32;
  for (let i = 0; i < nPost; i++) {
    const th = (i / nPost) * Math.PI * 2 + Math.PI / nPost;
    add(new THREE.CylinderGeometry(0.17, 0.19, H, 10), mats.redLacquer, Math.sin(th) * (RI - 0.1), H / 2, Math.cos(th) * (RI - 0.1));
    for (let k = 0; k < RING.floors; k++) {
      const lt = th + Math.PI / nPost;
      lanterns.addHanging(Math.sin(lt) * (RI - 0.35), k * FH + FH - 0.7, Math.cos(lt) * (RI - 0.35), 0.7);
      if (i % 2 === 0) lanterns.addHanging(Math.sin(lt) * RING.RIDGE, k * FH + FH - 0.6, Math.cos(lt) * RING.RIDGE, 0.6);
    }
  }

  // ── 樓梯（迴廊裡沿弦方向，每段 12 階）＋扶手
  for (const f of fl) {
    const yBase = f.k * FH;
    const n = 12;
    const ang = Math.atan2(f.t.x, f.t.y);
    for (let i = 0; i < n; i++) {
      const top = ((i + 1) * FH) / n;
      const p = at(f, -f.L / 2 + ((i + 0.5) * f.L) / n, 0);
      add(scaledBox(f.laneW, top, f.L / n + 0.02, 1.5, 1.5, 1.5), mats.woodFloor, p.x, yBase + top / 2, p.y, ang);
    }
    const railMid = at(f, 0, -f.laneW / 2);
    const railLen = Math.hypot(f.L, FH);
    const rail = add(new THREE.BoxGeometry(0.1, 0.1, railLen), mats.redLacquer, railMid.x, yBase + FH / 2 + 0.95, railMid.y, ang);
    rail.rotation.order = 'YXZ';
    rail.rotation.x = -Math.atan2(FH, f.L);
    for (let q = 0; q <= 4; q++) {
      const pp = at(f, -f.L / 2 + 0.9 + ((f.L - 0.9) * q) / 4, -f.laneW / 2);
      add(new THREE.BoxGeometry(0.08, 0.95, 0.08), mats.redLacquer, pp.x, yBase + (FH * (0.9 + ((f.L - 0.9) * q) / 4)) / f.L + 0.475, pp.y);
    }
  }

  // ── 環形黛瓦大屋頂（外簷 → 屋脊 → 內簷伸到中庭上方）
  const prof = [
    new THREE.Vector2(R + 1.9, H - 0.25),
    new THREE.Vector2(R + 0.9, H + 0.55),
    new THREE.Vector2(RING.RIDGE, H + 2.6),
    new THREE.Vector2(RI + 0.6, H + 1.1),
    new THREE.Vector2(RI - 1.2, H + 0.35),
  ];
  const roofGeo = new THREE.LatheGeometry(prof, 96);
  {
    const uv = roofGeo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * Math.PI * 2 * RING.RIDGE) / 1.5, (uv.getY(i) * 10) / 1.5);
  }
  const roof = add(roofGeo, mats.roofs.slate);
  roof.castShadow = true;
  add(roofGeo.clone(), mats.roofUnder, 0, -0.12, 0);
  add(new THREE.TorusGeometry(RING.RIDGE, 0.22, 8, 128).rotateX(Math.PI / 2), mats.gold, 0, H + 2.65, 0);
  for (let i = 0; i < 44; i++) {
    const th = (i / 44) * Math.PI * 2;
    for (const [ra, ya, rb, yb] of [[RING.RIDGE, H + 2.6, R + 1.85, H - 0.2], [RING.RIDGE, H + 2.6, RI - 1.15, H + 0.38]] as [number, number, number, number][]) {
      const a = new THREE.Vector3(Math.sin(th) * ra, ya, Math.cos(th) * ra);
      const c = new THREE.Vector3(Math.sin(th) * rb, yb, Math.cos(th) * rb);
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, a.distanceTo(c)), mats.ridges.slate);
      rib.position.copy(a).add(c).multiplyScalar(0.5);
      rib.position.y += 0.08;
      rib.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), c.clone().sub(a).normalize());
      body.add(rib);
    }
  }

  // ── 正面青石拱門樓
  const fz = R + 0.25;
  for (const s of [-1, 1]) {
    add(scaledBox(0.9, gateH + 1.3, 0.7, 1.2, 1.2, 1.2), mats.stoneLight, s * (gateW / 2 + 0.45), (gateH + 1.3) / 2, fz);
    const drum = add(new THREE.CylinderGeometry(0.55, 0.55, 0.32, 18), mats.sculpt, s * (gateW / 2 + 0.45), 1.05, fz + 0.7);
    drum.rotation.z = Math.PI / 2;
    add(new THREE.BoxGeometry(0.5, 0.5, 0.9), mats.sculpt, s * (gateW / 2 + 0.45), 0.25, fz + 0.7);
  }
  add(scaledBox(gateW + 1.8, 0.5, 0.75, 1.5, 0.5, 1.5), mats.stoneLight, 0, gateH + 0.25, fz);
  const signMat = new THREE.MeshStandardMaterial({ map: signboardTexture(b.name, '痛點懸賞・土樓'), roughness: 0.55, metalness: 0.1 });
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.15, 0.16), [mats.darkWood, mats.darkWood, mats.darkWood, mats.darkWood, signMat, mats.darkWood]);
  plaque.position.set(0, gateH + 1.15, fz + 0.32);
  plaque.userData.noMerge = true;
  root.add(plaque);
  const roof1 = buildRoofTier(gateW + 2.6, 1.8, { rise: 0.85, overhang: 0.8, curl: 0.5, theme: 'slate', ridge: true, lite: true });
  roof1.position.set(0, gateH + 1.85, fz);
  body.add(roof1);
  add(new THREE.BoxGeometry(gateW + 0.6, 0.85, 1.0), earth(), 0, gateH + 2.45, fz - 0.1);
  const roof2 = buildRoofTier(gateW + 0.8, 1.3, { rise: 0.7, overhang: 0.65, curl: 0.45, theme: 'slate', ridge: true, lite: true });
  roof2.position.set(0, gateH + 2.9, fz - 0.1);
  body.add(roof2);
  const couplet = DOOR_COUPLETS[b.id];
  if (couplet) {
    for (const s of [1, -1]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 3.2), new THREE.MeshStandardMaterial({ map: coupletTexture(s > 0 ? couplet[0] : couplet[1]), roughness: 0.85 }));
      m.position.set(s * (gateW / 2 + 0.45), 2.45, fz + 0.36);
      m.userData.noMerge = true;
      root.add(m);
    }
  }
  for (const s of [-1, 1]) lanterns.addHanging(s * (gateW / 2 + 1.5), gateH - 0.2, fz + 1.0, 1.1);
  for (let k = 0; k < 3; k++) add(scaledBox(gateW + 2.6 - k * 0.4, 0.16, 0.6, 1.5, 0.16, 1.5), mats.stoneLight, 0, 0.08, fz + 1.6 + k * 0.55);

  // ── 懸賞牆：各層迴廊沿外牆內側一面接一面（每面 4 則）；一樓另有中庭的兩面大佈告欄
  const offsets = [0, 0, 0];
  const boardMat = (level: number, layout: PainBoardLayout) => new THREE.MeshStandardMaterial({ map: drawPainBoardTexture(level, [], true, layout), roughness: 0.75 });
  const pushBoard = (mesh: THREE.Mesh, level: number, layout: PainBoardLayout) => {
    const count = layout.cols * layout.rows;
    mesh.userData.noMerge = true;
    mesh.userData.painBoard = { level, buildingId: b.id, offset: offsets[level], count, layout };
    offsets[level] += count;
    inner.add(mesh);
  };
  // 中庭佈告欄（日常疑難）：木架＋小屋頂
  for (const s of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(s * 9.9, 0, 5.4);
    g.rotation.y = -s * 0.75;
    inner.add(g);
    const bw = 4.6;
    for (const px of [-bw / 2 - 0.1, bw / 2 + 0.1]) add(new THREE.CylinderGeometry(0.1, 0.12, 3.1, 8), mats.darkWood, px, 1.55, 0, 0, g);
    const pr = buildRoofTier(bw + 0.6, 0.7, { rise: 0.35, overhang: 0.35, curl: 0.25, theme: 'slate', ridge: true, lite: true });
    pr.position.y = 3.05;
    g.add(pr);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(bw, bw * 0.275), boardMat(0, MAIN_BOARD));
    m.position.set(0, 1.85, 0.02);
    g.add(m);
    add(new THREE.BoxGeometry(bw + 0.2, bw * 0.275 + 0.2, 0.08), mats.darkWood, 0, 1.85, -0.04, 0, g);
    g.updateMatrixWorld(true);
    m.userData.noMerge = true;
    m.userData.painBoard = { level: 0, buildingId: b.id, offset: offsets[0], count: 8, layout: MAIN_BOARD };
    offsets[0] += 8;
  }
  // 迴廊牆面
  const nb = 22;
  for (let k = 0; k < RING.floors; k++) {
    for (let i = 0; i < nb; i++) {
      const th = (i / nb) * Math.PI * 2;
      const d0 = Math.atan2(Math.sin(th), Math.cos(th));
      if (k === 0 && Math.abs(d0) < 0.5) continue; // 大門
      const near = fl.some((f) => (f.k === k || f.k === k - 1) && Math.abs(Math.atan2(Math.sin(th - f.theta), Math.cos(th - f.theta))) < 0.42);
      if (near) continue;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.7), boardMat(k, SIDE_BOARD));
      m.position.set(Math.sin(th) * (RO - 0.06), k * FH + 1.85, Math.cos(th) * (RO - 0.06));
      m.rotation.y = th + Math.PI;
      pushBoard(m, k, SIDE_BOARD);
    }
  }

  // ── 中庭：創點舞台（後方，面向大門）
  const colliders: Collider[] = [];
  const rect = (id: string, cx0: number, cz0: number, hw: number, hd: number, yaw = 0) => {
    const c = Math.cos(yaw);
    const s2 = Math.sin(yaw);
    const corners = ([[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]] as [number, number][]).map(([x, z]) => [cx0 + x * c + z * s2, cz0 - x * s2 + z * c] as [number, number]);
    colliders.push(...segs(b, corners.map((p, i) => [p[0], p[1], corners[(i + 1) % 4][0], corners[(i + 1) % 4][1], 0.15]), id));
  };
  {
    const sg = new THREE.Group();
    sg.position.set(0, 0, -11.2);
    body.add(sg);
    const sw = 6.4;
    const sd = 3.0;
    const sh = 0.85;
    const a2 = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => add(geo, mat, x, y, z, 0, sg);
    a2(scaledBox(sw, sh, sd, 1.5, sh, 1.5), mats.stone, 0, sh / 2, 0);
    a2(scaledBox(sw - 0.2, 0.08, sd - 0.2, 2, 0.08, 2), mats.woodFloor, 0, sh + 0.04, 0);
    a2(new THREE.BoxGeometry(sw - 0.6, 0.05, sd * 0.6), mats.rug, 0, sh + 0.1, 0.1);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) a2(new THREE.CylinderGeometry(0.15, 0.17, 2.6, 10), mats.redLacquer, sx * (sw / 2 - 0.2), sh + 1.3, sz * (sd / 2 - 0.2));
    a2(new THREE.BoxGeometry(sw + 0.2, 0.3, 0.3), mats.redLacquer, 0, sh + 2.6, sd / 2 - 0.2);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(sw - 0.6, 2.3), new THREE.MeshStandardMaterial({ map: scrollPaintingTexture(5), roughness: 0.9 }));
    back.position.set(0, sh + 1.3, -sd / 2 + 0.15);
    back.userData.noMerge = true;
    sg.add(back);
    a2(new THREE.BoxGeometry(sw - 0.4, 2.5, 0.12), mats.darkWood, 0, sh + 1.3, -sd / 2 + 0.06);
    const smat = new THREE.MeshStandardMaterial({ map: signboardTexture('創點舞台', '提案發表・創星季'), roughness: 0.55 });
    const splaque = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.62, 0.1), [mats.darkWood, mats.darkWood, mats.darkWood, mats.darkWood, smat, mats.darkWood]);
    splaque.position.set(0, sh + 2.95, sd / 2 - 0.15);
    splaque.userData.noMerge = true;
    sg.add(splaque);
    const sroof = buildRoofTier(sw, sd, { rise: 0.6, overhang: 0.45, curl: 0.3, theme: 'red', ridge: true, lite: true });
    sroof.position.y = sh + 2.75;
    sg.add(sroof);
    for (let k = 0; k < 3; k++) a2(scaledBox(2.2, 0.28, 0.4, 1, 0.28, 1), mats.stoneLight, 0, sh - 0.14 - k * 0.28, sd / 2 + 0.2 + k * 0.4);
    for (const sx of [-1, 1]) lanterns.addHanging(sx * (sw / 2 - 0.3), sh + 2.35, -11.2 + sd / 2 - 0.2, 0.7);
    rect('stage', 0, -11.2, sw / 2, sd / 2);
    root.add(makePickProxy(sw + 0.4, 4.2, sd + 0.6, 0, -11.2, 0, { kind: 'feature', id: 'stage' }));
  }
  // ── 中庭：提案台（左前）、佈告桌（右前，刊登痛點）
  const desk = (cx0: number, cz0: number, yaw: number, title: string, sub: string) => {
    const g = new THREE.Group();
    g.position.set(cx0, 0, cz0);
    g.rotation.y = yaw;
    body.add(g);
    const a2 = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => add(geo, mat, x, y, z, 0, g);
    a2(new THREE.BoxGeometry(2.6, 0.1, 1.1), mats.redLacquer, 0, 0.82, 0);
    a2(new THREE.BoxGeometry(2.66, 0.04, 1.16), mats.gold, 0, 0.77, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) a2(new THREE.BoxGeometry(0.1, 0.78, 0.1), mats.darkWood, sx * 1.15, 0.39, sz * 0.45);
    for (const [x, z] of [[-0.75, 0.05], [0.05, -0.1]] as [number, number][]) {
      const roll = a2(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 10), mats.plaster, x, 0.94, z);
      roll.rotation.z = Math.PI / 2;
    }
    a2(new THREE.BoxGeometry(0.3, 0.05, 0.22), mats.ridges.slate, 0.9, 0.9, -0.25);
    a2(new THREE.CylinderGeometry(0.09, 0.08, 0.24, 10), mats.pot, -1.0, 0.99, -0.3);
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.55).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: deskPaperTexture(), roughness: 0.9 }));
    paper.position.set(0.55, 0.875, 0.12);
    paper.userData.noMerge = true;
    g.add(paper);
    const tmat = new THREE.MeshStandardMaterial({ map: signboardTexture(title, sub), roughness: 0.55 });
    const tp = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 0.06), [mats.darkWood, mats.darkWood, mats.darkWood, mats.darkWood, tmat, mats.darkWood]);
    tp.position.set(0, 1.12, -0.45);
    tp.rotation.x = -0.2;
    tp.userData.noMerge = true;
    g.add(tp);
    for (const sx of [-0.7, 0.7]) a2(new THREE.CylinderGeometry(0.24, 0.2, 0.46, 12), mats.redLacquer, sx, 0.23, 0.95);
    rect(`desk-${title}`, cx0, cz0, 1.4, 0.65, yaw);
  };
  desk(-8.4, -4.0, 0.55, '提案台', '把點子寫成提案');
  root.add(makePickProxy(3.0, 1.8, 2.0, -8.4, -4.0, 0.55, { kind: 'feature', id: 'proposal' }));
  desk(8.4, -4.0, -0.55, '佈告桌', '在這裡刊登痛點');
  root.add(makePickProxy(3.0, 1.8, 2.0, 8.4, -4.0, -0.55, { kind: 'desk', buildingId: b.id }));

  // ── 中庭：圓桌與石凳
  for (const [tx, tz] of [[-4.5, 2.4], [4.5, 2.4], [-4.0, 9.3], [4.0, 9.3], [-9.5, -0.2], [9.5, -0.2]] as [number, number][]) {
    add(new THREE.CylinderGeometry(0.7, 0.75, 0.08, 18), mats.darkWood, tx, 0.76, tz);
    add(new THREE.CylinderGeometry(0.12, 0.2, 0.74, 10), mats.darkWood, tx, 0.37, tz);
    add(new THREE.SphereGeometry(0.13, 12, 10), mats.pot, tx, 0.9, tz);
    for (let q = 0; q < 4; q++) {
      const a = (q / 4) * Math.PI * 2 + Math.PI / 4;
      add(new THREE.CylinderGeometry(0.22, 0.26, 0.46, 12), mats.stoneLight, tx + Math.cos(a) * 1.1, 0.23, tz + Math.sin(a) * 1.1);
    }
    const [wx, wz] = W(b, tx, tz);
    colliders.push({ id: `${b.id}-table-${tx}-${tz}`, type: 'cylinder', x: wx, z: wz, radius: 1.25 } as Collider);
  }
  // 中庭佈告欄的碰撞
  for (const s of [-1, 1]) rect(`cboard-${s}`, s * 9.9, 5.4, 2.4, 0.2, -s * 0.75);
  // 中庭中央的石燈與花台
  lanterns.addPost(0, 0, 3.3, 2.4);
  {
    const [wx, wz] = W(b, 0, 3.3);
    colliders.push({ id: `${b.id}-courtlamp`, type: 'cylinder', x: wx, z: wz, radius: 0.45 } as Collider);
  }

  mergeByMaterial(body);
  mergeByMaterial(inner, false);
  root.add(lanterns.build());

  // 一樓的碰撞：外牆（留大門）、迴廊內緣柱子、門樓、往二樓的樓梯扶手、中庭設施
  colliders.push(...wallRing(b, true));
  for (let i = 0; i < nPost; i++) {
    const th = (i / nPost) * Math.PI * 2 + Math.PI / nPost;
    const [wx, wz] = W(b, Math.sin(th) * (RI - 0.1), Math.cos(th) * (RI - 0.1));
    colliders.push({ id: `${b.id}-post-${i}`, type: 'cylinder', x: wx, z: wz, radius: 0.2 } as Collider);
  }
  for (const s of [-1, 1]) {
    const [x1, z1] = W(b, s * (gateW / 2 + 0.15), RO);
    const [x2, z2] = W(b, s * (gateW / 2 + 0.9), fz);
    colliders.push({ id: `${b.id}-gatejamb-${s}`, type: 'segment', x1, z1, x2, z2, halfThickness: 0.35 } as Collider);
    const [dx, dz] = W(b, s * (gateW / 2 + 0.45), fz + 0.7);
    colliders.push({ id: `${b.id}-drum-${s}`, type: 'cylinder', x: dx, z: dz, radius: 0.5 } as Collider);
  }
  colliders.push(...ringLevelColliders(b, 0));
  root.userData.colliders = colliders;
  root.userData.interior = inner;
  // 點外牆打開創點樓介紹（在土樓裡面時看不到這個框的背面，不會擋到點牆上的痛點）
  root.add(makePickProxy(R * 2 + 1, H + 3, R * 2 + 1, 0, 0, 0, { kind: 'building', id: b.id }));
  return root;
}
