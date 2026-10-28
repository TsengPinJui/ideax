import * as THREE from 'three';
import type { Collider } from '../types';
import { makePickProxy } from '../picking';
import { FARMLANDS, MOUNTAIN_RING, landOutline, THREE_POOLS } from './basinLayout';
import { faunaEnv } from './fauna';
import { WORLD_BRIDGES, bridgeRailRange } from '../regionConfigs';
import { mergeByMaterial } from './architecture';
import { seeded } from './textures';
import type { EggId } from '../eggs';

/**
 * 實境漫遊的彩蛋點（和 3D 地圖同一套詩句）：
 * - 新擺設：湖心亭北面的「三潭印月」三座石塔、河岸四株垂柳（加上園林兩株，湊齊一柳～四柳、五柳陶淵明、第六棵屈原）
 * - 既有物件的點擊範圍：石拱橋欄杆、田園、水車、群山（要在山台上才點得到）
 * maxDist：離太遠點不到（避免視角環顧時誤觸詩句）；minY：要站得夠高（山台、塔頂）才算
 */


export const eggPick = (egg: EggId, opts: { id?: string; maxDist?: number; minY?: number } = {}) => ({ kind: 'egg' as const, egg, ...opts });

type Rim = { cx: number; cz: number; rx: number; rz: number };

function nearCol(x: number, z: number, cols: Collider[], pad: number) {
  for (const c of cols) {
    if (c.type === 'cylinder') {
      if (Math.hypot(x - c.x, z - c.z) < c.radius + pad) return true;
    } else if (c.type === 'box') {
      if (Math.abs(x - c.x) < c.halfWidth + pad && Math.abs(z - c.z) < c.halfDepth + pad) return true;
    } else {
      const abx = c.x2 - c.x1;
      const abz = c.z2 - c.z1;
      const t = Math.max(0, Math.min(1, ((x - c.x1) * abx + (z - c.z1) * abz) / (abx * abx + abz * abz || 1)));
      if (Math.hypot(x - c.x1 - abx * t, z - c.z1 - abz * t) < c.halfThickness + pad) return true;
    }
  }
  return false;
}

/** 一株垂柳（和園林的柳樹同款） */
export function willowTree(rand: () => number, bark: THREE.Material, leaf: THREE.Material) {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, ry = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.castShadow = true;
    g.add(m);
    return m;
  };
  add(new THREE.CylinderGeometry(0.18, 0.3, 3.4, 8), bark, 0, 1.7, 0).rotation.z = 0.12;
  add(new THREE.SphereGeometry(1.5, 10, 8).scale(1.2, 0.55, 1.2), leaf, 0.2, 3.6, 0);
  for (let k = 0; k < 40; k++) {
    const a = (k / 40) * Math.PI * 2 + rand() * 0.2;
    const r = 0.8 + rand() * 1.1;
    const len = 1.6 + rand() * 1.4;
    add(new THREE.PlaneGeometry(0.08, len), leaf, 0.2 + Math.cos(a) * r, 3.5 - len / 2, Math.sin(a) * r, a);
  }
  return g;
}

/** 三潭印月的小石塔：細石座、蓮瓣托、開五個圓孔的球形塔身（夜裡透出燭光）、薄塔簷、葫蘆頂 */
function stonePagoda(stone: THREE.Material, glow: THREE.Material) {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, y: number) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y;
    m.castShadow = true;
    g.add(m);
    return m;
  };
  add(new THREE.CylinderGeometry(0.62, 0.72, 0.5, 8), stone, 0.05);
  add(new THREE.CylinderGeometry(0.22, 0.28, 0.75, 8), stone, 0.65);
  // 蓮瓣托
  add(new THREE.CylinderGeometry(0.5, 0.24, 0.22, 12), stone, 1.12);
  add(new THREE.SphereGeometry(0.46, 16, 12), stone, 1.62);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.12, 14), glow);
    hole.position.set(Math.cos(a) * 0.455, 1.64, Math.sin(a) * 0.455);
    hole.lookAt(Math.cos(a) * 3, 1.64, Math.sin(a) * 3);
    g.add(hole);
  }
  // 薄塔簷（微微上翹）
  add(new THREE.CylinderGeometry(0.18, 0.72, 0.18, 8), stone, 2.15);
  add(new THREE.CylinderGeometry(0.72, 0.68, 0.05, 8), stone, 2.05);
  // 葫蘆頂
  add(new THREE.SphereGeometry(0.17, 10, 8), stone, 2.38);
  add(new THREE.SphereGeometry(0.11, 10, 8), stone, 2.6);
  add(new THREE.ConeGeometry(0.05, 0.22, 6), stone, 2.78);
  return g;
}

export function createEggProps(opts: { rims: Rim[]; avoid: Collider[]; avoidPts: [number, number][] }): { group: THREE.Group; colliders: Collider[]; glow: THREE.MeshStandardMaterial } {
  const root = new THREE.Group();
  root.name = 'egg_props';
  const colliders: Collider[] = [];
  const rand = seeded(5151);

  // ── 河岸垂柳（徵才島以外四島各一株；徵才島園林已有兩株） ──
  const bark = new THREE.MeshStandardMaterial({ color: 0x5a4330, roughness: 1 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x8dbb5a, roughness: 0.8, side: THREE.DoubleSide });
  opts.rims.forEach((isl, i) => {
    if (Math.abs(isl.cx - 72) < 1 && Math.abs(isl.cz - 48) < 1) return;
    for (let k = 0; k < 60; k++) {
      const a = rand() * Math.PI * 2;
      const x = isl.cx + Math.cos(a) * (isl.rx + 3.4);
      const z = isl.cz + Math.sin(a) * (isl.rz + 3.4);
      if (opts.avoidPts.some(([px, pz]) => Math.hypot(px - x, pz - z) < 7)) continue;
      if (nearCol(x, z, opts.avoid, 2.2) || nearCol(x, z, colliders, 3)) continue;
      const w = willowTree(rand, bark, leaf);
      w.position.set(x, -0.04, z);
      w.rotation.y = rand() * Math.PI * 2;
      mergeByMaterial(w);
      root.add(w);
      root.add(makePickProxy(2.6, 4.4, 2.6, x, z, 0, eggPick('willow', { id: `rim-${i}`, maxDist: 30 })));
      colliders.push({ id: `rim-willow-${i}`, type: 'cylinder', x, z, radius: 0.45 });
      break;
    }
  });

  // ── 三潭印月 ──
  const stone = new THREE.MeshStandardMaterial({ color: 0x6f6c63, roughness: 0.88 });
  const glow = new THREE.MeshStandardMaterial({ color: 0x1a140e, emissive: new THREE.Color(0xffb347), emissiveIntensity: 0.0, roughness: 0.6 });
  for (const [x, z] of THREE_POOLS) {
    const p = stonePagoda(stone, glow);
    p.position.set(x, -0.35, z);
    root.add(p);
    root.add(makePickProxy(1.8, 3.4, 1.8, x, z, 0, eggPick('threePools', { maxDist: 90 }), -0.6));
  }

  // ── 石拱橋欄杆（點欄杆：此處無斷橋…） ──
  for (const b of WORLD_BRIDGES) {
    const dx = b.x2 - b.x1;
    const dz = b.z2 - b.z1;
    const span = Math.hypot(dx, dz);
    const yaw = Math.atan2(dx, dz);
    const [ra, rb] = bridgeRailRange(b);
    const n = 8;
    for (let k = 0; k < n; k++) {
      const t = ra + ((rb - ra) * (k + 0.5)) / n;
      const y = Math.sin(t * Math.PI) * b.bridgeMaxHeight;
      const cx = b.x1 + dx * t;
      const cz = b.z1 + dz * t;
      for (const s of [-1, 1]) {
        const off = s * (b.halfWidth - 0.18);
        const x = cx + Math.cos(yaw) * off;
        const z = cz - Math.sin(yaw) * off;
        root.add(makePickProxy(0.4, 0.9, ((rb - ra) * span) / n + 0.1, x, z, yaw, eggPick('bridge', { maxDist: 26 }), y + 0.05));
      }
    }
  }

  // ── 田園（土地平曠…）與水車（龍骨水車） ──
  FARMLANDS.forEach((l, li) => {
    root.add(makePickProxy(l.rx * 1.5, 0.25, l.rz * 1.5, l.cx, l.cz, -l.rot, eggPick('farmland', { maxDist: 45 }), 0.45));
    if (li % 2 === 0) {
      // 和環境建模同一套算法找水車位置
      const outline = landOutline(l);
      const toC = Math.atan2(-l.cz, -l.cx);
      let best = outline[0];
      let bd = -Infinity;
      for (const pt of outline) {
        const d = Math.cos(Math.atan2(pt[1] - l.cz, pt[0] - l.cx) - toC);
        if (d > bd) {
          bd = d;
          best = pt;
        }
      }
      const wx = best[0] + Math.cos(toC) * 1.5;
      const wz = best[1] + Math.sin(toC) * 1.5;
      root.add(makePickProxy(1.4, 4.8, 4.8, wx, wz, -toC + Math.PI / 2, eggPick('waterwheel', { maxDist: 55 }), -1.0));
    }
  });

  // ── 群山（站在山台、塔頂才點得到：山不在高…） ──
  for (const p of MOUNTAIN_RING) {
    if (p.kind === 'westPlateau') continue;
    root.add(makePickProxy(p.r * 1.3, p.h * 0.7, p.r * 1.3, p.x, p.z, 0, eggPick('mountain', { maxDist: 80, minY: 20 })));
  }

  // 三潭石塔夜裡透出燭光
  root.userData.tick = () => {
    const v = faunaEnv.tod === 'night' ? 1.5 : faunaEnv.tod === 'dusk' ? 0.55 : 0;
    if (glow.emissiveIntensity !== v) glow.emissiveIntensity = v;
  };
  return { group: root, colliders, glow };
}
