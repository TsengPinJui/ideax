import * as THREE from 'three';
import type { Collider } from '../types';
import { getStyleMaterials, buildRoofTier, mergeByMaterial, LanternBatch, scaledBox } from './architecture';
import { seeded } from './textures';
import { makePickProxy } from '../picking';
import { REGION_CONFIGS } from '../regionConfigs';

/**
 * 徵才島院牆內的江南園林：
 * - （照設計圖）庭園中央一大片水池：中軸石堤＋觀景平台、石拱橋通東小島、汀步上東岸；荷葉、錦鯉、池上薄霧
 * - 西南角飛簷小亭
 * - 太湖石假山、垂柳、沿牆竹林、青石步道
 * - 翰林院、求職廟前有燕子穿梭（堂前燕）
 * 院牆本身（粉牆黛瓦、月洞門）由院牆設定產生
 */

// 照設計圖重新規劃：建築往北、往西收，庭園中央一大片水池（中軸石堤＋觀景平台、石拱橋通小島、汀步上東岸）
const POND_PTS: [number, number][] = [
  [62.0, 52.6],
  [66.5, 50.4],
  [72.0, 49.8],
  [78.0, 50.2],
  [84.0, 51.0],
  [88.4, 53.6],
  [89.4, 57.6],
  [87.6, 61.4],
  [82.0, 63.2],
  [75.0, 63.6],
  [69.0, 63.4],
  [63.6, 62.0],
  [61.0, 58.8],
  [60.8, 55.4],
];
const POND = { x: 75, z: 57, rx: 13.5, rz: 6.5 };
// 中軸石堤（南月洞門 → 觀景平台 → 北岸，正對北月洞門）
const CAUSE = { x: 72, z0: 48.6, z1: 65.0, hw: 1.15 };
const PLAT = { x: 72, z: 57, hx: 2.3, hz: 2.3 };
// 石拱橋：平台東側 → 小島
const ISLE_A = { x: 80.8, z: 57.4, r: 2.2 };
const ISLE_B = { x: 66.2, z: 58.6, r: 1.6 };
const ARCH_BRIDGE = { x0: PLAT.x + PLAT.hx, x1: ISLE_A.x - ISLE_A.r + 0.2, z: 57.2, hw: 0.95 };
// 汀步：小島東側 → 東岸
const STONES = { x0: ISLE_A.x + ISLE_A.r - 0.2, x1: 89.8, z: 57.5, hw: 0.7 };
const PAVILION = { x: 57.2, z: 64.4 };
const ROCKERY = { x: 92.6, z: 61.0 };
const WILLOWS: [number, number][] = [
  [61.8, 65.6],
  [91.8, 65.0],
];

function pondShape(n = 72) {
  const c = new THREE.CatmullRomCurve3(
    POND_PTS.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    true,
    'centripetal'
  );
  return c.getPoints(n).slice(0, n).map((p) => [p.x, p.z] as [number, number]);
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

  // ── 水池：水面、池底、塘邊石 ──
  const outline = pondShape();
  const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
  const waterGeo = new THREE.ShapeGeometry(shape, 32).rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x35606a, roughness: 0.08, metalness: 0.35, transparent: true, opacity: 0.9 });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.y = 0.06;
  water.userData.noMerge = true;
  root.add(water);
  const bed = new THREE.Mesh(waterGeo.clone(), new THREE.MeshStandardMaterial({ color: 0x1f3a34, roughness: 1 }));
  bed.position.y = 0.03;
  bed.userData.noMerge = true;
  root.add(bed);
  const rimMat = stoneMat(0x9a958a);
  const onWalk = (x: number, z: number, pad = 0) =>
    (Math.abs(x - CAUSE.x) < CAUSE.hw + pad && z > CAUSE.z0 - 1 && z < CAUSE.z1 + 1) ||
    (x > STONES.x0 - 0.5 && x < STONES.x1 + 1 && Math.abs(z - STONES.z) < STONES.hw + pad);
  outline.forEach(([x, z], i) => {
    if (i % 2 || onWalk(x, z, 0.6)) return;
    const r = taihuStone(rand, 0.4 + rand() * 0.28, rimMat);
    r.position.set(x, 0.12, z);
    r.scale.y = 0.55;
    stat.add(r);
  });
  const seg = (id: string, x1: number, z1: number, x2: number, z2: number, th = 0.3) => colliders.push({ id, type: 'segment', x1, z1, x2, z2, halfThickness: th });
  // 塘邊碰撞：石堤、汀步上岸的地方留口
  for (let i = 0; i < outline.length; i++) {
    const [x1, z1] = outline[i];
    const [x2, z2] = outline[(i + 1) % outline.length];
    if (onWalk((x1 + x2) / 2, (z1 + z2) / 2, 0.15)) continue;
    seg(`garden-pond-${i}`, x1, z1, x2, z2, 0.32);
  }

  // ── 中軸石堤＋觀景平台（貼水面的石板路，兩緣一道暖光） ──
  const deckMat = stoneMat(0xd6d0c4);
  const warm = new THREE.MeshBasicMaterial({ color: 0xffdcaa });
  add(new THREE.BoxGeometry(CAUSE.hw * 2, 0.14, CAUSE.z1 - CAUSE.z0), deckMat, CAUSE.x, 0.07, (CAUSE.z0 + CAUSE.z1) / 2);
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.05, 0.03, CAUSE.z1 - CAUSE.z0), warm, CAUSE.x + sx * (CAUSE.hw - 0.04), 0.15, (CAUSE.z0 + CAUSE.z1) / 2);
  add(new THREE.BoxGeometry(PLAT.hx * 2, 0.16, PLAT.hz * 2), deckMat, PLAT.x, 0.08, PLAT.z);
  add(new THREE.BoxGeometry(PLAT.hx * 2 + 0.1, 0.03, 0.05), warm, PLAT.x, 0.17, PLAT.z - PLAT.hz);
  add(new THREE.BoxGeometry(PLAT.hx * 2 + 0.1, 0.03, 0.05), warm, PLAT.x, 0.17, PLAT.z + PLAT.hz);
  // 石堤兩側（平台以外）與平台四邊（石堤、拱橋留口）
  for (const sx of [-1, 1]) {
    const x = CAUSE.x + sx * (CAUSE.hw + 0.05);
    seg(`garden-cause-n-${sx}`, x, CAUSE.z0 + 0.6, x, PLAT.z - PLAT.hz, 0.12);
    seg(`garden-cause-s-${sx}`, x, PLAT.z + PLAT.hz, x, CAUSE.z1 - 0.6, 0.12);
    seg(`garden-plat-n-${sx}`, PLAT.x + sx * PLAT.hx, PLAT.z - PLAT.hz, PLAT.x + sx * (CAUSE.hw + 0.05), PLAT.z - PLAT.hz, 0.12);
    seg(`garden-plat-s-${sx}`, PLAT.x + sx * PLAT.hx, PLAT.z + PLAT.hz, PLAT.x + sx * (CAUSE.hw + 0.05), PLAT.z + PLAT.hz, 0.12);
  }
  seg('garden-plat-w', PLAT.x - PLAT.hx, PLAT.z - PLAT.hz, PLAT.x - PLAT.hx, PLAT.z + PLAT.hz, 0.12);
  seg('garden-plat-e1', PLAT.x + PLAT.hx, PLAT.z - PLAT.hz, PLAT.x + PLAT.hx, ARCH_BRIDGE.z - ARCH_BRIDGE.hw, 0.12);
  seg('garden-plat-e2', PLAT.x + PLAT.hx, ARCH_BRIDGE.z + ARCH_BRIDGE.hw, PLAT.x + PLAT.hx, PLAT.z + PLAT.hz, 0.12);
  // 石堤上的小方燈（不擋路）與兩端石燈
  {
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff4dc, emissive: 0xffd9a0, emissiveIntensity: 1.3, roughness: 0.5 });
    const frame = new THREE.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 0.5, metalness: 0.4 });
    for (let z = CAUSE.z0 + 1.2; z < CAUSE.z1 - 0.5; z += 2.6) {
      if (Math.abs(z - PLAT.z) < PLAT.hz + 0.3) continue;
      for (const sx of [-1, 1]) {
        add(new THREE.BoxGeometry(0.26, 0.42, 0.26), lampMat, CAUSE.x + sx * (CAUSE.hw - 0.15), 0.35, z);
        add(new THREE.BoxGeometry(0.32, 0.05, 0.32), frame, CAUSE.x + sx * (CAUSE.hw - 0.15), 0.58, z);
      }
    }
    for (const [x, z] of [
      [PLAT.x - PLAT.hx + 0.3, PLAT.z - PLAT.hz + 0.3],
      [PLAT.x - PLAT.hx + 0.3, PLAT.z + PLAT.hz - 0.3],
      [PLAT.x + PLAT.hx - 0.3, PLAT.z - PLAT.hz + 0.3],
      [PLAT.x + PLAT.hx - 0.3, PLAT.z + PLAT.hz - 0.3],
    ]) {
      lan.addPost(x, 0.16, z, 1.2);
      colliders.push({ id: `garden-plat-lamp-${x}-${z}`, type: 'cylinder', x, z, radius: 0.25 });
    }
    lan.addPost(CAUSE.x - 1.8, 0, CAUSE.z1 - 0.2, 2.0);
    lan.addPost(CAUSE.x + 1.8, 0, CAUSE.z1 - 0.2, 2.0);
    lan.addPost(CAUSE.x - 1.8, 0, CAUSE.z0 - 0.2, 2.0);
    lan.addPost(CAUSE.x + 1.8, 0, CAUSE.z0 - 0.2, 2.0);
    for (const [x, z] of [
      [CAUSE.x - 1.8, CAUSE.z1 - 0.2],
      [CAUSE.x + 1.8, CAUSE.z1 - 0.2],
      [CAUSE.x - 1.8, CAUSE.z0 - 0.2],
      [CAUSE.x + 1.8, CAUSE.z0 - 0.2],
    ])
      colliders.push({ id: `garden-cause-lamp-${x}-${z}`, type: 'cylinder', x, z, radius: 0.35 });
  }

  // ── 石拱橋（平台 → 小島） ──
  {
    const bx0 = ARCH_BRIDGE.x0;
    const bx1 = ARCH_BRIDGE.x1;
    const L = bx1 - bx0;
    const N = 10;
    const railMat = stoneMat(0xc8c0b0);
    for (let i = 0; i < N; i++) {
      const t0 = i / N;
      const t1 = (i + 1) / N;
      const tm = (t0 + t1) / 2;
      const y = Math.sin(tm * Math.PI) * 0.38;
      const pitch = Math.atan2((Math.sin(t1 * Math.PI) - Math.sin(t0 * Math.PI)) * 0.38, L / N);
      const dk = add(new THREE.BoxGeometry(L / N + 0.06, 0.18, ARCH_BRIDGE.hw * 2), deckMat, bx0 + tm * L, 0.1 + y, ARCH_BRIDGE.z);
      dk.rotation.z = pitch;
      for (const sz of [-1, 1]) {
        const rl = add(new THREE.BoxGeometry(L / N + 0.04, 0.42, 0.14), railMat, bx0 + tm * L, 0.42 + y, ARCH_BRIDGE.z + sz * (ARCH_BRIDGE.hw - 0.07));
        rl.rotation.z = pitch;
      }
    }
    // 拱圈
    const arc = add(new THREE.TorusGeometry(L / 2 - 0.2, 0.16, 6, 20, Math.PI), deckMat, (bx0 + bx1) / 2, -0.55, ARCH_BRIDGE.z);
    void arc;
    for (const sz of [-1, 1]) seg(`garden-arch-${sz}`, bx0, ARCH_BRIDGE.z + sz * ARCH_BRIDGE.hw, bx1, ARCH_BRIDGE.z + sz * ARCH_BRIDGE.hw, 0.12);
  }

  // ── 小島：太湖石、松樹（東島走得上去，西島只看不走） ──
  const pineBark = new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 1 });
  const pineLeaf = new THREE.MeshStandardMaterial({ color: 0x2f5530, roughness: 0.85 });
  const bonsai = (x: number, z: number, s: number) => {
    const pts = [new THREE.Vector3(x, 0.2, z), new THREE.Vector3(x + 0.35 * s, 1.1 * s, z + 0.1), new THREE.Vector3(x - 0.3 * s, 2.0 * s, z), new THREE.Vector3(x + 0.2 * s, 2.8 * s, z)];
    stat.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.14 * s, 6, false), pineBark));
    for (const [dx, y, rr] of [
      [0.9, 1.4, 0.95],
      [-0.9, 2.0, 0.9],
      [0.5, 2.6, 0.8],
      [-0.1, 3.1, 0.55],
    ] as [number, number, number][]) {
      const m = add(new THREE.SphereGeometry(rr * s, 9, 6), pineLeaf, x + (dx + (rand() - 0.5) * 0.2) * s, y * s, z + (rand() - 0.5) * 0.3);
      m.scale.set(1.45, 0.4, 1.1);
    }
  };
  const isleMat = new THREE.MeshStandardMaterial({ color: 0x5d7a45, roughness: 1 });
  for (const isle of [ISLE_A, ISLE_B]) {
    add(new THREE.CylinderGeometry(isle.r, isle.r + 0.3, 0.3, 24), stoneMat(0x8f8a80), isle.x, 0.1, isle.z);
    add(new THREE.CylinderGeometry(isle.r - 0.25, isle.r - 0.1, 0.1, 24), isleMat, isle.x, 0.3, isle.z);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + rand() * 0.4;
      if (isle === ISLE_A && (Math.abs(Math.cos(a)) > 0.85)) continue;
      const st = taihuStone(rand, 0.3 + rand() * 0.25, rimMat);
      st.position.set(isle.x + Math.cos(a) * (isle.r - 0.1), 0.25, isle.z + Math.sin(a) * (isle.r - 0.1));
      st.scale.y = 0.6;
      stat.add(st);
    }
  }
  bonsai(ISLE_A.x + 0.4, ISLE_A.z - 0.6, 1.0);
  colliders.push({ id: 'garden-isle-a-pine', type: 'cylinder', x: ISLE_A.x + 0.4, z: ISLE_A.z - 0.6, radius: 0.45 });
  bonsai(ISLE_B.x, ISLE_B.z, 0.85);
  {
    const big = taihuStone(rand, 0.8, stoneMat(0xa6a39a));
    big.position.set(ISLE_B.x - 0.6, 0.6, ISLE_B.z + 0.5);
    stat.add(big);
  }
  // 東島四周的碰撞（西接拱橋、東接汀步，兩邊留口）
  {
    const N = 20;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2;
      const a1 = ((i + 1) / N) * Math.PI * 2;
      const am = (a0 + a1) / 2;
      const mz = ISLE_A.z + Math.sin(am) * ISLE_A.r;
      if (Math.abs(Math.cos(am)) > 0.75 && Math.abs(mz - (Math.cos(am) < 0 ? ARCH_BRIDGE.z : STONES.z)) < 0.95) continue;
      seg(`garden-isle-${i}`, ISLE_A.x + Math.cos(a0) * ISLE_A.r, ISLE_A.z + Math.sin(a0) * ISLE_A.r, ISLE_A.x + Math.cos(a1) * ISLE_A.r, ISLE_A.z + Math.sin(a1) * ISLE_A.r, 0.15);
    }
  }
  // ── 汀步（小島 → 東岸） ──
  {
    const stepMat = stoneMat(0xbdb6a8);
    for (let x = STONES.x0 + 0.4; x < STONES.x1 - 0.2; x += 0.95) {
      const st = add(new THREE.CylinderGeometry(0.48 + rand() * 0.08, 0.55, 0.16, 9), stepMat, x, 0.1, STONES.z + (rand() - 0.5) * 0.18);
      st.scale.z = 0.85;
    }
    for (const sz of [-1, 1]) seg(`garden-stones-${sz}`, STONES.x0, STONES.z + sz * STONES.hw, STONES.x1 - 1.0, STONES.z + sz * STONES.hw, 0.1);
  }

  // ── 荷葉、荷花（水池東半邊，避開石堤、拱橋、小島、汀步） ──
  const padMat = new THREE.MeshStandardMaterial({ color: 0x3f8a3a, roughness: 0.75, side: THREE.DoubleSide });
  const padGeo = new THREE.CircleGeometry(0.45, 14, 0.25, Math.PI * 2 - 0.4).rotateX(-Math.PI / 2);
  const petalMat = new THREE.MeshStandardMaterial({ color: 0xf3a6c4, roughness: 0.6, emissive: 0x6a2a40, emissiveIntensity: 0.15 });
  const inPond = (x: number, z: number) => {
    let inside = false;
    for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
      const [xi, zi] = outline[i];
      const [xj, zj] = outline[j];
      if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    }
    return inside;
  };
  for (let k = 0; k < 70; k++) {
    const x = 61 + rand() * 28;
    const z = 50 + rand() * 13.5;
    if (!inPond(x, z) || onWalk(x, z, 0.9)) continue;
    if (Math.hypot(x - ISLE_A.x, z - ISLE_A.z) < ISLE_A.r + 0.8 || Math.hypot(x - ISLE_B.x, z - ISLE_B.z) < ISLE_B.r + 0.8) continue;
    if (x > ARCH_BRIDGE.x0 - 0.5 && x < ARCH_BRIDGE.x1 + 0.5 && Math.abs(z - ARCH_BRIDGE.z) < 1.6) continue;
    if (Math.abs(x - PLAT.x) < PLAT.hx + 0.8 && Math.abs(z - PLAT.z) < PLAT.hz + 0.8) continue;
    if (x < 74 && rand() < 0.6) continue;
    const s2 = 0.7 + rand() * 0.7;
    const pad = add(padGeo, padMat, x, 0.09 + rand() * 0.02, z, rand() * Math.PI * 2);
    pad.scale.setScalar(s2);
    if (k % 5 === 0) {
      add(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 5), padMat, x + 0.1, 0.32, z);
      for (let q = 0; q < 6; q++) {
        const pa = (q / 6) * Math.PI * 2;
        const petal = add(new THREE.ConeGeometry(0.07, 0.24, 5), petalMat, x + 0.1 + Math.cos(pa) * 0.07, 0.62, z + Math.sin(pa) * 0.07);
        petal.rotation.set(Math.sin(pa) * 0.5, 0, -Math.cos(pa) * 0.5);
      }
    }
  }

  // ── 錦鯉 ──
  const koiGroup = new THREE.Group();
  koiGroup.name = 'koi';
  root.add(koiGroup);
  const koiMats = [0xff6a1a, 0xffffff, 0xf2a03a, 0xe23b2a].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 }));
  const spotMat = new THREE.MeshStandardMaterial({ color: 0xff4a10, roughness: 0.4 });
  const koi: { g: THREE.Group; r: number; sp: number; ph: number; cx: number; cz: number }[] = [];
  const koiHomes: [number, number][] = [
    [66.0, 55.0],
    [78.5, 53.5],
    [84.5, 59.6],
    [68.5, 61.0],
  ];
  for (let i = 0; i < 12; i++) {
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
    // 彩蛋：錦鯉（屈原不是我殺的／你有粽子嗎?）
    g.add(makePickProxy(0.9, 0.5, 1.1, 0, 0, 0, { kind: 'egg', egg: 'koi', maxDist: 25 }, -0.1));
    koiGroup.add(g);
    const [hx, hz] = koiHomes[i % koiHomes.length];
    koi.push({ g, r: 0.9 + rand() * 1.6, sp: (0.18 + rand() * 0.22) * (i % 2 ? 1 : -1), ph: rand() * Math.PI * 2, cx: hx + (rand() - 0.5), cz: hz + (rand() - 0.5) });
  }

  // ── 池上薄霧（貼著水面慢慢飄） ──
  const mists: THREE.Sprite[] = [];
  {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d')!;
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,0.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 128, 128);
    const mat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0.35 });
    for (let k = 0; k < 7; k++) {
      const sp = new THREE.Sprite(mat);
      sp.scale.set(6 + rand() * 4, 1.4, 1);
      sp.position.set(64 + rand() * 22, 0.55, 52 + rand() * 10);
      sp.userData.base = sp.position.clone();
      sp.userData.ph = rand() * 6;
      root.add(sp);
      mists.push(sp);
    }
  }

  // ── 西南角飛簷小亭 ──
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
      add(new THREE.BoxGeometry(0.12, 0.5, 2.4), sm.redLacquer, sx * 1.6, 0.75, 0, 0, pg);
    }
    const roof = buildRoofTier(3.8, 3.2, { rise: 1.4, overhang: 0.9, curl: 0.75, theme: 'slate', ridge: true, finial: true, lite: true, horns: false });
    roof.position.y = 3.05;
    pg.add(roof);
    add(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 16), sm.darkWood, 0, 0.75, 0, 0, pg);
    add(new THREE.CylinderGeometry(0.1, 0.15, 0.4, 8), sm.darkWood, 0, 0.55, 0, 0, pg);
    lan.addHanging(PAVILION.x - 1.6, 2.7, PAVILION.z - 1.35, 0.6);
    lan.addHanging(PAVILION.x + 1.6, 2.7, PAVILION.z - 1.35, 0.6);
  }

  // ── 太湖石假山（東南角） ──
  {
    const rk = stoneMat(0xa6a39a);
    const rk2 = stoneMat(0x8d8a82);
    const stones: [number, number, number, number][] = [
      [0, 0, 0, 1.2],
      [0.8, 0.8, 0.4, 0.85],
      [-0.7, 0.7, -0.3, 0.8],
      [0.2, 1.7, 0.1, 0.7],
      [-0.3, 2.4, 0.2, 0.5],
    ];
    for (const [dx, dy, dz, sc] of stones) {
      const st = taihuStone(rand, sc, rand() > 0.5 ? rk : rk2);
      st.position.set(ROCKERY.x + dx, 0.4 + dy, ROCKERY.z + dz);
      stat.add(st);
    }
    colliders.push({ id: 'garden-rockery', type: 'cylinder', x: ROCKERY.x, z: ROCKERY.z, radius: 1.5 });
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
      add(new THREE.PlaneGeometry(0.08, len), willowMat, wx + 0.2 + Math.cos(a) * r, 3.5 - len / 2, wz + Math.sin(a) * r, a);
    }
    colliders.push({ id: `garden-willow-${wx}`, type: 'cylinder', x: wx, z: wz, radius: 0.45 });
    // 彩蛋：柳樹（一柳～四柳、五柳陶淵明、第六棵屈原）
    root.add(makePickProxy(2.6, 4.4, 2.6, wx, wz, 0, { kind: 'egg', egg: 'willow', id: `garden-${wx}`, maxDist: 30 }));
  }

  // ── 沿牆竹林 ──
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0x6f9a3a, roughness: 0.6 });
  const bambooLeaf = new THREE.MeshStandardMaterial({ color: 0x4f8a3a, roughness: 0.8, side: THREE.DoubleSide });
  const groves: [number, number, number, number][] = [
    [49.4, 58.5, 29.0, 31.4],
    [79.5, 94.6, 29.0, 31.4],
    [49.0, 51.6, 62.0, 66.6],
  ];
  for (const [x0, x1, z0, z1] of groves) {
    const area = (x1 - x0) * (z1 - z0);
    const n = Math.round(area * 0.9);
    for (let k = 0; k < n; k++) {
      const x = x0 + rand() * (x1 - x0);
      const z = z0 + rand() * (z1 - z0);
      const hh = 4 + rand() * 2.5;
      const stalk = add(new THREE.CylinderGeometry(0.05, 0.065, hh, 6), bambooMat, x, hh / 2, z);
      stalk.rotation.z = (rand() - 0.5) * 0.12;
      stalk.castShadow = false;
      for (let q = 0; q < 3; q++) {
        const leaf = add(new THREE.ConeGeometry(0.42, 1.0, 5), bambooLeaf, x + (rand() - 0.5) * 0.4, hh - 0.4 - q * 0.8, z + (rand() - 0.5) * 0.4);
        leaf.rotation.set((rand() - 0.5) * 0.8, rand() * 3, Math.PI + (rand() - 0.5) * 0.8);
        leaf.castShadow = false;
      }
    }
    colliders.push({ id: `garden-bamboo-${x0}-${z0}`, type: 'box', x: (x0 + x1) / 2, z: (z0 + z1) / 2, halfWidth: (x1 - x0) / 2, halfDepth: (z1 - z0) / 2 });
  }

  // ── 青石步道（各月洞門 → 池邊；兩旁小地燈） ──
  const flagMat = stoneMat(0x6a7078);
  const groundLamp = new THREE.MeshStandardMaterial({ color: 0xfff4dc, emissive: 0xffd9a0, emissiveIntensity: 1.2, roughness: 0.5 });
  const path = (pts: [number, number][], lamps = true) => {
    let acc = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, z1] = pts[i];
      const [x2, z2] = pts[i + 1];
      const len = Math.hypot(x2 - x1, z2 - z1);
      const n = Math.max(1, Math.round(len / 0.95));
      const ang = Math.atan2(x2 - x1, z2 - z1);
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        const fl = add(new THREE.BoxGeometry(1.0 + rand() * 0.2, 0.06, 0.62 + rand() * 0.15), flagMat, x1 + (x2 - x1) * t + (rand() - 0.5) * 0.12, 0.04, z1 + (z2 - z1) * t, ang + (rand() - 0.5) * 0.15);
        fl.castShadow = false;
        acc += len / n;
        if (lamps && acc > 3.6) {
          acc = 0;
          const side = k % 2 ? 1 : -1;
          const lx = x1 + (x2 - x1) * t + Math.cos(ang) * side * 0.95;
          const lz = z1 + (z2 - z1) * t - Math.sin(ang) * side * 0.95;
          add(new THREE.BoxGeometry(0.2, 0.3, 0.2), groundLamp, lx, 0.15, lz);
        }
      }
    }
  };
  path([
    [49.0, 35.5],
    [53.5, 40.0],
    [56.0, 46.6],
    [62.0, 47.6],
    [70.6, 48.2],
  ]);
  path([
    [72.0, 28.6],
    [72.6, 33.0],
    [73.6, 40.0],
    [72.6, 47.0],
  ]);
  // 東月洞門進來：求職廟門廊柱子在 z≈47.5，步道從柱子南側繞過
  path([
    [95.4, 48.0],
    [91.6, 49.2],
    [86.0, 49.4],
    [80.0, 49.0],
    [73.6, 48.4],
  ]);
  path([
    [84.0, 46.2],
    [84.0, 47.6],
  ], false);
  path([
    [89.6, 57.5],
    [90.4, 53.0],
    [89.4, 49.0],
  ]);
  path([
    [58.9, 56.0],
    [60.0, 52.0],
    [61.0, 49.0],
  ]);
  path([
    [59.6, 57.0],
    [59.4, 61.6],
    [58.0, 63.0],
  ]);
  path([
    [72.0, 65.2],
    [72.0, 67.6],
  ], false);
  path([
    [70.6, 65.2],
    [64.0, 65.6],
    [59.6, 64.6],
  ]);
  // ── 院牆上的藤蔓：從牆頭垂下來的爬牆虎（月洞門附近不長） ──
  {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 256;
    const x = c.getContext('2d')!;
    let q = 77;
    const r = () => ((q = (q * 9301 + 49297) % 233280) / 233280);
    for (let k = 0; k < 5; k++) {
      x.strokeStyle = 'rgba(70,90,40,0.9)';
      x.lineWidth = 2;
      x.beginPath();
      let vx = 20 + r() * 88;
      x.moveTo(vx, 0);
      for (let y = 0; y < 256; y += 16) {
        vx += (r() - 0.5) * 14;
        x.lineTo(vx, y);
      }
      x.stroke();
    }
    for (let k = 0; k < 150; k++) {
      const yy = Math.pow(r(), 1.6) * 250;
      const xx = 10 + r() * 108;
      const g2 = 60 + Math.round(r() * 60);
      x.fillStyle = `rgb(${40 + Math.round(r() * 30)},${g2 + 40},${30 + Math.round(r() * 20)})`;
      x.beginPath();
      x.ellipse(xx, yy, 5 + r() * 5, 3.5 + r() * 3, r() * 3, 0, Math.PI * 2);
      x.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const vineMat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85 });
    const clumpMat = new THREE.MeshStandardMaterial({ color: 0x4a7a34, roughness: 0.9 });
    const geo = new THREE.PlaneGeometry(1, 1).translate(0, -0.5, 0);
    const mats: THREE.Matrix4[] = [];
    const clumps: THREE.Matrix4[] = [];
    const walls = REGION_CONFIGS['region-career'].courtyardWalls || [];
    for (const wl of walls) {
      const dx = wl.x2 - wl.x1;
      const dz = wl.z2 - wl.z1;
      const L = Math.hypot(dx, dz);
      const ux = dx / L;
      const uz = dz / L;
      const nx = uz;
      const nz = -ux;
      const top = (wl.height || 3.2) - 0.12;
      for (let t = 0.8; t < L - 0.8; t += 1.15) {
        if (wl.hasMoonGate && Math.abs(t - L / 2) < (wl.gateWidth || 6) / 2 + 1.0) continue;
        if (rand() > 0.62) continue;
        const px = wl.x1 + ux * t;
        const pz = wl.z1 + uz * t;
        for (const sd of [-1, 1]) {
          if (rand() > 0.7) continue;
          const wv = 0.8 + rand() * 0.9;
          const hv = 1.0 + rand() * 1.7;
          const q4 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(nx * sd, nz * sd));
          mats.push(new THREE.Matrix4().compose(new THREE.Vector3(px + nx * sd * 0.27, top, pz + nz * sd * 0.27), q4, new THREE.Vector3(wv, hv, 1)));
        }
        const cq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 3);
        clumps.push(new THREE.Matrix4().compose(new THREE.Vector3(px, top + 0.32, pz), cq, new THREE.Vector3(0.55 + rand() * 0.4, 0.22 + rand() * 0.1, 0.45 + rand() * 0.3)));
      }
    }
    const im = new THREE.InstancedMesh(geo, vineMat, mats.length);
    mats.forEach((m, i) => im.setMatrixAt(i, m));
    im.name = 'career-vines';
    root.add(im);
    const ic = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), clumpMat, clumps.length);
    clumps.forEach((m, i) => ic.setMatrixAt(i, m));
    root.add(ic);
  }

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
    [64, 47.6],
    [84, 48.2],
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
    for (const m of mists) {
      const b0 = m.userData.base as THREE.Vector3;
      m.position.set(b0.x + Math.sin(t * 0.05 + m.userData.ph) * 2.2, b0.y + Math.sin(t * 0.3 + m.userData.ph) * 0.08, b0.z + Math.cos(t * 0.04 + m.userData.ph) * 1.2);
    }
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
