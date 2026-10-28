import * as THREE from 'three';
import type { Collider } from '../types';
import { getStyleMaterials, buildRoofTier, mergeByMaterial, LanternBatch, scaledBox } from './architecture';
import { seeded } from './textures';
import { makePickProxy } from '../picking';

/**
 * 徵才島院牆內的江南園林：
 * - 東南的綠塘：荷葉荷花、錦鯉悠游、九曲石橋；北岸一座飛簷小亭
 * - 太湖石假山、垂柳、沿牆竹林、青石步道
 * - 翰林院、求職廟前有燕子穿梭（堂前燕）
 * 院牆本身（粉牆黛瓦、月洞門）由院牆設定產生
 */

const POND = { x: 85, z: 59, rx: 7.5, rz: 5.2 };
const BRIDGE: [number, number][] = [
  [76.4, 60.0],
  [80.4, 57.9],
  [84.4, 60.5],
  [88.4, 58.3],
  [93.2, 59.5],
];
// 小亭靠東，讓出求職廟正前方的視野
const PAVILION = { x: 91.2, z: 52.6 };
// 假山離南牆留一條走得過去的小徑
const ROCKERY = { x: 78.6, z: 63.6 };
const WILLOWS: [number, number][] = [
  [92.3, 64.6],
  [75.6, 54.2],
];

function pondShape(n = 48) {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + 0.07 * Math.sin(3 * a + 0.6) + 0.04 * Math.sin(5 * a + 1.3);
    pts.push([POND.x + Math.cos(a) * POND.rx * k, POND.z + Math.sin(a) * POND.rz * k]);
  }
  return pts;
}

function stoneMat(color: number) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true });
}

/** 太湖石：用平滑的起伏扭曲球體（同一位置的頂點一起動，不會裂開或長刺），疊成假山 */
function taihuStone(rand: () => number, s: number, mat: THREE.Material) {
  const g = new THREE.SphereGeometry(s, 9, 7);
  const p = g.attributes.position as THREE.BufferAttribute;
  const f1 = 1.5 + rand() * 2;
  const f2 = 1.5 + rand() * 2;
  const ph = rand() * 6;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const n = 1 + 0.22 * Math.sin((x / s) * f1 + ph) * Math.cos((z / s) * f2 - ph) + 0.12 * Math.sin((y / s) * 3.1 + ph * 0.7);
    p.setXYZ(i, x * n, y * n * 1.25, z * n * 0.9);
  }
  g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}

export function createCareerGarden(): { group: THREE.Group; colliders: Collider[] } {
  const sm = getStyleMaterials();
  const rand = seeded(2026);
  const root = new THREE.Group();
  root.name = 'career_garden';
  const stat = new THREE.Group();
  root.add(stat);
  const colliders: Collider[] = [];
  const lan = new LanternBatch();
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, ry = 0, parent: THREE.Object3D = stat) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  // ── 綠塘：水面、塘邊石、荷葉荷花 ──
  const outline = pondShape();
  const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
  const waterGeo = new THREE.ShapeGeometry(shape, 24).rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x3f7a62, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.88 });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.y = 0.06;
  water.userData.noMerge = true;
  root.add(water);
  // 池底（深綠，透過水面看得到）
  const bed = new THREE.Mesh(waterGeo.clone(), new THREE.MeshStandardMaterial({ color: 0x23402f, roughness: 1 }));
  bed.position.y = 0.03;
  bed.userData.noMerge = true;
  root.add(bed);
  const rimMat = stoneMat(0x9a958a);
  outline.forEach(([x, z], i) => {
    if (i % 2) return;
    const r = taihuStone(rand, 0.38 + rand() * 0.25, rimMat);
    r.position.set(x, 0.12, z);
    r.scale.y = 0.55;
    stat.add(r);
  });
  // 塘邊碰撞（九曲橋兩端留口）
  const bridgeEnds = [BRIDGE[0], BRIDGE[BRIDGE.length - 1]];
  for (let i = 0; i < outline.length; i++) {
    const [x1, z1] = outline[i];
    const [x2, z2] = outline[(i + 1) % outline.length];
    const mx = (x1 + x2) / 2;
    const mz = (z1 + z2) / 2;
    if (bridgeEnds.some(([bx, bz]) => Math.hypot(bx - mx, bz - mz) < 1.4)) continue;
    // 橋身斜著跨過塘邊：和橋面重疊的那幾段塘邊也不擋
    const onLeg = (ax: number, az: number, bx: number, bz: number) => {
      const dx = bx - ax;
      const dz = bz - az;
      const t = Math.max(0, Math.min(1, ((mx - ax) * dx + (mz - az) * dz) / (dx * dx + dz * dz)));
      return Math.hypot(mx - (ax + dx * t), mz - (az + dz * t)) < 1.15;
    };
    const L = BRIDGE.length;
    if (onLeg(BRIDGE[0][0], BRIDGE[0][1], BRIDGE[1][0], BRIDGE[1][1]) || onLeg(BRIDGE[L - 2][0], BRIDGE[L - 2][1], BRIDGE[L - 1][0], BRIDGE[L - 1][1])) continue;
    colliders.push({ id: `garden-pond-${i}`, type: 'segment', x1, z1, x2, z2, halfThickness: 0.35 });
  }
  // 荷葉（綠塘荷葉）與荷花，集中在池的東半邊、避開九曲橋
  const padMat = new THREE.MeshStandardMaterial({ color: 0x3f8a3a, roughness: 0.75, side: THREE.DoubleSide });
  const padGeo = new THREE.CircleGeometry(0.45, 14, 0.25, Math.PI * 2 - 0.4).rotateX(-Math.PI / 2);
  const petalMat = new THREE.MeshStandardMaterial({ color: 0xf3a6c4, roughness: 0.6, emissive: 0x6a2a40, emissiveIntensity: 0.15 });
  for (let k = 0; k < 46; k++) {
    const a = rand() * Math.PI * 2;
    const rr = Math.sqrt(rand()) * 0.88;
    const x = POND.x + Math.cos(a) * POND.rx * rr;
    const z = POND.z + Math.sin(a) * POND.rz * rr;
    if (x < POND.x - 3) continue;
    const nearBridge = BRIDGE.some(([bx, bz], i) => {
      const n = BRIDGE[i + 1];
      if (!n) return false;
      const dx = n[0] - bx;
      const dz = n[1] - bz;
      const t = Math.max(0, Math.min(1, ((x - bx) * dx + (z - bz) * dz) / (dx * dx + dz * dz)));
      return Math.hypot(x - (bx + dx * t), z - (bz + dz * t)) < 1.3;
    });
    if (nearBridge) continue;
    const s = 0.7 + rand() * 0.7;
    const pad = add(padGeo, padMat, x, 0.09 + rand() * 0.02, z, rand() * Math.PI * 2);
    pad.scale.setScalar(s);
    if (k % 5 === 0) {
      add(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 5), padMat, x + 0.1, 0.32, z);
      for (let q = 0; q < 6; q++) {
        const pa = (q / 6) * Math.PI * 2;
        const petal = add(new THREE.ConeGeometry(0.07, 0.24, 5), petalMat, x + 0.1 + Math.cos(pa) * 0.07, 0.62, z + Math.sin(pa) * 0.07);
        petal.rotation.set(Math.sin(pa) * 0.5, 0, -Math.cos(pa) * 0.5);
      }
    }
  }

  // ── 錦鯉（在水面下繞圈游） ──
  const koiGroup = new THREE.Group();
  koiGroup.name = 'koi';
  root.add(koiGroup);
  const koiMats = [0xff6a1a, 0xffffff, 0xf2a03a, 0xe23b2a].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 }));
  const spotMat = new THREE.MeshStandardMaterial({ color: 0xff4a10, roughness: 0.4 });
  const koi: { g: THREE.Group; r: number; sp: number; ph: number; cx: number; cz: number }[] = [];
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8).scale(0.55, 0.4, 1.4), koiMats[i % koiMats.length]);
    g.add(body);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 6).rotateX(-Math.PI / 2), koiMats[i % koiMats.length]);
    tail.position.z = 0.3;
    tail.scale.x = 0.25;
    g.add(tail);
    if (i % 2) {
      const spot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), spotMat);
      spot.position.set(0, 0.04, -0.05);
      g.add(spot);
    }
    g.position.y = 0.0;
    // 彩蛋：錦鯉（屈原不是我殺的／你有粽子嗎?）
    g.add(makePickProxy(0.9, 0.5, 1.1, 0, 0, 0, { kind: 'egg', egg: 'koi', maxDist: 25 }, -0.1));
    koiGroup.add(g);
    koi.push({ g, r: 1.2 + rand() * 3.2, sp: (0.18 + rand() * 0.22) * (i % 2 ? 1 : -1), ph: rand() * Math.PI * 2, cx: POND.x - 2 + rand() * 4, cz: POND.z - 1 + rand() * 2 });
  }

  // ── 九曲石橋 ──
  // 欄杆碰撞：兩側各一條沿橋身轉折的折線（轉角用斜接，轉彎處不會被前一段的欄杆擋住）
  for (const side of [-1, 1]) {
    const pts: [number, number][] = [];
    for (let i = 0; i < BRIDGE.length; i++) {
      const perp = (a: [number, number], b: [number, number]): [number, number] => {
        const dx = b[0] - a[0];
        const dz = b[1] - a[1];
        const l = Math.hypot(dx, dz) || 1;
        return [dz / l, -dx / l];
      };
      const p0 = i > 0 ? perp(BRIDGE[i - 1], BRIDGE[i]) : null;
      const p1 = i < BRIDGE.length - 1 ? perp(BRIDGE[i], BRIDGE[i + 1]) : null;
      let nx: number;
      let nz: number;
      let k = 0.75;
      if (p0 && p1) {
        nx = p0[0] + p1[0];
        nz = p0[1] + p1[1];
        const l = Math.hypot(nx, nz) || 1;
        nx /= l;
        nz /= l;
        k = 0.75 / Math.max(0.35, nx * p0[0] + nz * p0[1]);
      } else {
        [nx, nz] = (p0 || p1)!;
      }
      pts.push([BRIDGE[i][0] + nx * k * side, BRIDGE[i][1] + nz * k * side]);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      colliders.push({ id: `garden-bridge-${i}-${side}`, type: 'segment', x1: pts[i][0], z1: pts[i][1], x2: pts[i + 1][0], z2: pts[i + 1][1], halfThickness: 0.1 });
    }
  }
  const deckMat = stoneMat(0xc9c2b3);
  const railMat = stoneMat(0xb8b0a0);
  for (let i = 0; i < BRIDGE.length - 1; i++) {
    const [x1, z1] = BRIDGE[i];
    const [x2, z2] = BRIDGE[i + 1];
    const len = Math.hypot(x2 - x1, z2 - z1);
    const ang = Math.atan2(x2 - x1, z2 - z1);
    add(new THREE.BoxGeometry(1.6, 0.18, len + 0.5), deckMat, (x1 + x2) / 2, 0.22, (z1 + z2) / 2, ang);
    for (const side of [-1, 1]) {
      const ox = Math.cos(ang) * 0.75 * side;
      const oz = -Math.sin(ang) * 0.75 * side;
      add(new THREE.BoxGeometry(0.09, 0.08, len + 0.1), railMat, (x1 + x2) / 2 + ox, 0.68, (z1 + z2) / 2 + oz, ang);
      for (let q = 0; q <= 3; q++) {
        const t = q / 3;
        add(new THREE.BoxGeometry(0.11, 0.42, 0.11), railMat, x1 + (x2 - x1) * t + ox, 0.5, z1 + (z2 - z1) * t + oz);
      }
    }
    // 橋墩
    add(new THREE.CylinderGeometry(0.25, 0.3, 0.3, 8), deckMat, x2, 0.1, z2);
  }

  // ── 北岸飛簷小亭 ──
  {
    const pg = new THREE.Group();
    pg.position.set(PAVILION.x, 0, PAVILION.z);
    stat.add(pg);
    add(scaledBox(4.2, 0.35, 3.6, 1.5, 0.35, 1.5), sm.stoneLight, 0, 0.17, 0, 0, pg);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        add(new THREE.CylinderGeometry(0.13, 0.15, 2.7, 10), sm.redLacquer, sx * 1.6, 1.7, sz * 1.35, 0, pg);
        colliders.push({ id: `garden-pav-${sx}-${sz}`, type: 'cylinder', x: PAVILION.x + sx * 1.6, z: PAVILION.z + sz * 1.35, radius: 0.22 });
      }
      // 美人靠
      add(new THREE.BoxGeometry(0.12, 0.5, 2.4), sm.redLacquer, sx * 1.6, 0.75, 0, 0, pg);
    }
    const roof = buildRoofTier(3.8, 3.2, { rise: 1.4, overhang: 0.9, curl: 0.75, theme: 'slate', ridge: true, finial: true, lite: true, horns: false });
    roof.position.y = 3.05;
    pg.add(roof);
    add(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 16), sm.darkWood, 0, 0.75, 0, 0, pg);
    add(new THREE.CylinderGeometry(0.1, 0.15, 0.4, 8), sm.darkWood, 0, 0.55, 0, 0, pg);
    lan.addHanging(PAVILION.x - 1.6, 2.7, PAVILION.z + 1.35, 0.6);
    lan.addHanging(PAVILION.x + 1.6, 2.7, PAVILION.z + 1.35, 0.6);
  }

  // ── 太湖石假山 ──
  {
    const rk = stoneMat(0xa6a39a);
    const rk2 = stoneMat(0x8d8a82);
    const stones: [number, number, number, number][] = [
      [0, 0, 0, 1.3],
      [0.9, 0.9, 0.4, 0.9],
      [-0.8, 0.7, -0.3, 0.85],
      [0.2, 1.8, 0.1, 0.75],
      [-0.4, 2.5, 0.2, 0.55],
      [1.4, 0.2, -0.6, 0.7],
      [-1.5, 0.1, 0.5, 0.6],
    ];
    for (const [dx, dy, dz, s] of stones) {
      const st = taihuStone(rand, s, rand() > 0.5 ? rk : rk2);
      st.position.set(ROCKERY.x + dx, 0.4 + dy, ROCKERY.z + dz);
      stat.add(st);
    }
    colliders.push({ id: 'garden-rockery', type: 'cylinder', x: ROCKERY.x, z: ROCKERY.z, radius: 1.7 });
  }

  // ── 垂柳 ──
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x5a4330, roughness: 1 });
  const willowMat = new THREE.MeshStandardMaterial({ color: 0x8dbb5a, roughness: 0.8, side: THREE.DoubleSide });
  for (const [wx, wz] of WILLOWS) {
    const trunk = add(new THREE.CylinderGeometry(0.18, 0.3, 3.4, 8), barkMat, wx, 1.7, wz);
    trunk.rotation.z = 0.12;
    add(new THREE.SphereGeometry(1.5, 10, 8).scale(1.2, 0.55, 1.2), willowMat, wx + 0.2, 3.6, wz);
    for (let k = 0; k < 48; k++) {
      const a = (k / 48) * Math.PI * 2 + rand() * 0.2;
      const r = 0.8 + rand() * 1.1;
      const len = 1.6 + rand() * 1.4;
      const strand = add(new THREE.PlaneGeometry(0.08, len), willowMat, wx + 0.2 + Math.cos(a) * r, 3.5 - len / 2, wz + Math.sin(a) * r, a);
      strand.userData.noMerge = false;
    }
    colliders.push({ id: `garden-willow-${wx}`, type: 'cylinder', x: wx, z: wz, radius: 0.45 });
    // 彩蛋：柳樹（一柳～四柳、五柳陶淵明、第六棵屈原）
    root.add(makePickProxy(2.6, 4.4, 2.6, wx, wz, 0, { kind: 'egg', egg: 'willow', id: `garden-${wx}`, maxDist: 30 }));
  }

  // ── 沿牆竹林 ──
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0x6f9a3a, roughness: 0.6 });
  const bambooLeaf = new THREE.MeshStandardMaterial({ color: 0x4f8a3a, roughness: 0.8, side: THREE.DoubleSide });
  const groves: [number, number, number, number][] = [
    // x0, x1, z0, z1
    [49.4, 58.5, 29.0, 31.4],
    [79.5, 94.6, 29.0, 31.4],
    [49.0, 51.6, 45.5, 66.6],
  ];
  for (const [x0, x1, z0, z1] of groves) {
    const area = (x1 - x0) * (z1 - z0);
    const n = Math.round(area * 0.9);
    for (let k = 0; k < n; k++) {
      const x = x0 + rand() * (x1 - x0);
      const z = z0 + rand() * (z1 - z0);
      const h = 4 + rand() * 2.5;
      const stalk = add(new THREE.CylinderGeometry(0.05, 0.065, h, 6), bambooMat, x, h / 2, z);
      stalk.rotation.z = (rand() - 0.5) * 0.12;
      stalk.castShadow = false;
      for (let q = 0; q < 3; q++) {
        const leaf = add(new THREE.ConeGeometry(0.42, 1.0, 5), bambooLeaf, x + (rand() - 0.5) * 0.4, h - 0.4 - q * 0.8, z + (rand() - 0.5) * 0.4);
        leaf.rotation.set((rand() - 0.5) * 0.8, rand() * 3, Math.PI + (rand() - 0.5) * 0.8);
        leaf.castShadow = false;
      }
    }
    // 竹林整塊當成不能走進去
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    colliders.push({ id: `garden-bamboo-${x0}-${z0}`, type: 'box', x: cx, z: cz, halfWidth: (x1 - x0) / 2, halfDepth: (z1 - z0) / 2 });
  }

  // ── 青石步道（南月洞門 → 九曲橋；小亭 → 中庭） ──
  const flagMat = stoneMat(0x5e6670);
  const path = (pts: [number, number][]) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, z1] = pts[i];
      const [x2, z2] = pts[i + 1];
      const len = Math.hypot(x2 - x1, z2 - z1);
      const n = Math.max(1, Math.round(len / 0.95));
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        const fl = add(new THREE.BoxGeometry(0.85 + rand() * 0.2, 0.06, 0.6 + rand() * 0.15), flagMat, x1 + (x2 - x1) * t + (rand() - 0.5) * 0.15, 0.04, z1 + (z2 - z1) * t, Math.atan2(x2 - x1, z2 - z1) + (rand() - 0.5) * 0.2);
        fl.castShadow = false;
      }
    }
  };
  path([
    [72, 66.8],
    [73.4, 64.2],
    [75.0, 61.6],
    [76.4, 60.0],
  ]);
  path([
    [93.2, 59.5],
    [94.3, 56.6],
    [93.6, 54.4],
  ]);
  path([
    [89.0, 52.2],
    [86.0, 50.6],
    [82.4, 50.2],
    [79.0, 49.8],
    [75.0, 49.0],
  ]);
  // 塘邊石燈
  lan.addPost(POND.x - 6.4, 0, POND.z - 4.2, 2.0);
  lan.addPost(POND.x + 7.2, 0, POND.z + 3.8, 2.0);
  colliders.push({ id: 'garden-lamp-1', type: 'cylinder', x: POND.x - 6.4, z: POND.z - 4.2, radius: 0.4 });
  colliders.push({ id: 'garden-lamp-2', type: 'cylinder', x: POND.x + 7.2, z: POND.z + 3.8, radius: 0.4 });

  // ── 堂前燕：翰林院、求職廟門前來回穿梭 ──
  const birdMat = new THREE.MeshStandardMaterial({ color: 0x1d2330, roughness: 0.6, side: THREE.DoubleSide });
  const bellyMat = new THREE.MeshStandardMaterial({ color: 0xe9e2d4, roughness: 0.6 });
  const birds: { g: THREE.Group; wl: THREE.Object3D; wr: THREE.Object3D; cx: number; cz: number; r: number; sp: number; ph: number; y: number }[] = [];
  const swallow = () => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6).scale(0.8, 0.7, 2.0), birdMat);
    g.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5).scale(0.8, 0.6, 1.6), bellyMat);
    belly.position.y = -0.03;
    g.add(belly);
    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.06, 0.42, 0, 0.1, 0.05, 0, 0.12], 3));
    wingGeo.computeVertexNormals();
    const wl = new THREE.Mesh(wingGeo, birdMat);
    const wr = new THREE.Mesh(wingGeo, birdMat);
    wr.scale.x = -1;
    g.add(wl, wr);
    // 剪刀尾
    const tail = new THREE.BufferGeometry();
    tail.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.14, 0.08, 0, 0.36, 0, 0, 0.2, 0, 0, 0.2, -0.08, 0, 0.36, 0, 0, 0.14], 3));
    tail.computeVertexNormals();
    g.add(new THREE.Mesh(tail, birdMat));
    g.scale.setScalar(1.4);
    return { g, wl, wr };
  };
  const nests: [number, number][] = [
    [60, 48.2],
    [84, 48.2],
    [60, 51.6],
  ];
  // 一處一隻就好（以前每處兩隻、共六隻，太多了）；只留翰林院、求職廟門前各一隻
  nests.slice(0, 2).forEach(([nx, nz], i) => {
    for (let k = 0; k < 1; k++) {
      const s = swallow();
      root.add(s.g);
      birds.push({ ...s, cx: nx, cz: nz, r: 3 + rand() * 2.5, sp: (1.1 + rand() * 0.5) * (k ? 1 : -1), ph: rand() * 6, y: 3.6 + rand() * 1.6 + i * 0.2 });
    }
  });

  root.userData.tick = (t: number) => {
    for (const k of koi) {
      const a = k.ph + t * k.sp;
      const x = k.cx + Math.cos(a) * k.r;
      const z = k.cz + Math.sin(a) * k.r * 0.6;
      k.g.position.set(x, 0.02, z);
      // 面向游動方向
      const dx = -Math.sin(a) * k.sp;
      const dz = Math.cos(a) * k.r * 0.6 * k.sp;
      k.g.rotation.y = Math.atan2(-dx, -dz);
    }
    for (const b of birds) {
      const a = b.ph + t * b.sp;
      const x = b.cx + Math.cos(a) * b.r;
      const z = b.cz + Math.sin(a * 1.3) * b.r * 0.45;
      const y = b.y + Math.sin(a * 2.1) * 0.6;
      const nx = b.cx + Math.cos(a + 0.05 * Math.sign(b.sp)) * b.r;
      const nz = b.cz + Math.sin((a + 0.05 * Math.sign(b.sp)) * 1.3) * b.r * 0.45;
      b.g.position.set(x, y, z);
      b.g.rotation.y = Math.atan2(-(nx - x), -(nz - z));
      const flap = Math.sin(t * 16 + b.ph) * 0.7;
      b.wl.rotation.z = flap;
      b.wr.rotation.z = -flap;
    }
  };

  mergeByMaterial(stat);
  root.add(lan.build());
  // 彩蛋：綠塘（切勿竭澤而漁！）
  root.add(makePickProxy(POND.rx * 1.8, 0.2, POND.rz * 1.8, POND.x, POND.z, 0, { kind: 'egg', egg: 'pond', maxDist: 25 }, -0.15));
  return { group: root, colliders };
}
