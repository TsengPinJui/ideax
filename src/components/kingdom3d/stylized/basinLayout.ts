/**
 * 盆地地形配置：照 /island（創點島）的地圖構造放大 2.1 倍到 3D 五島。
 * - 32 座閉合環形山（北側飛瀑主峰、西側塔樓平頂山台、南側水道洞口）
 * - 島與山之間的田園陸地（北岸、西岸、東岸、南岸、東南山麓）
 * - 北／南中央水道的荷花
 * 陸地會自動讓開五座島與石拱橋，彼此之間留水道。
 */
import { REGION_CONFIGS, ALL_REGION_IDS, WORLD_BRIDGES, getGlobalWalkableZones } from '../regionConfigs';

export const BASIN_SCALE = 2.1;
const S = BASIN_SCALE;

export interface Peak {
  i: number;
  x: number;
  z: number;
  r: number;
  h: number;
  kind: 'peak' | 'northFalls' | 'westPlateau' | 'shoulder' | 'southCave';
}

export const MOUNTAIN_RING: Peak[] = (() => {
  const list: Peak[] = [];
  const n = 32;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const southCave = i === 7 || i === 8 || i === 9;
    const northFalls = i === 24;
    const westPlateau = i === 16;
    const shoulder = i === 15 || i === 17;
    const rb = westPlateau ? 69.5 : shoulder ? 73.5 : southCave ? 78.5 : northFalls ? 75.5 : 76.5 + Math.sin(i * 1.6) * 3.0;
    list.push({
      i,
      x: Math.cos(a) * rb * 1.08 * S,
      z: Math.sin(a) * rb * 0.94 * S,
      r: (northFalls ? 15.2 : southCave ? 13.5 : 14.2 + (i % 4) * 0.85) * S,
      h: (northFalls ? 40 : 26 + (i % 5) * 2.8) * S * 0.92,
      kind: northFalls ? 'northFalls' : westPlateau ? 'westPlateau' : shoulder ? 'shoulder' : southCave ? 'southCave' : 'peak',
    });
  }
  return list;
})();

export interface Landmass {
  cx: number;
  cz: number;
  rx: number;
  rz: number;
  seed: number;
  rot: number;
}

const RAW_LANDS: Landmass[] = [
  // 北岸
  { cx: -30.5, cz: -47.5, rx: 19.5, rz: 12.2, seed: 1.4, rot: 0.04 },
  { cx: 30.5, cz: -47.5, rx: 19.5, rz: 12.2, seed: 2.8, rot: -0.04 },
  // 西岸
  { cx: -48.5, cz: 0, rx: 17.5, rz: 11.5, seed: 4.1, rot: 0 },
  { cx: -50.5, cz: -15.5, rx: 19, rz: 13.5, seed: 4.3, rot: 0.06 },
  { cx: -50.5, cz: 15.5, rx: 19, rz: 13.5, seed: 4.7, rot: -0.06 },
  { cx: -55.5, cz: 0, rx: 14.5, rz: 32, seed: 9.7, rot: 0 },
  { cx: -47.5, cz: -34.5, rx: 16.5, rz: 12.5, seed: 10.3, rot: 0.12 },
  { cx: -47.5, cz: 34.5, rx: 16.5, rz: 12.5, seed: 11.1, rot: -0.12 },
  // 東岸
  { cx: 48.5, cz: -4.2, rx: 17.5, rz: 7.2, seed: 5.5, rot: -0.04 },
  { cx: 49.5, cz: -16.5, rx: 18.5, rz: 12.5, seed: 5.9, rot: -0.08 },
  { cx: 55.5, cz: -16.5, rx: 14.5, rz: 16.5, seed: 12.4, rot: 0.04 },
  { cx: 47.5, cz: -34.5, rx: 16.5, rz: 12.5, seed: 12.9, rot: -0.1 },
  // 南岸
  { cx: -30.5, cz: 47.5, rx: 19.5, rz: 12.2, seed: 6.9, rot: -0.04 },
  { cx: 30.5, cz: 47.5, rx: 19.5, rz: 12.2, seed: 8.3, rot: 0.04 },
  // 東南山麓
  { cx: 51.5, cz: 29.5, rx: 16.5, rz: 13.5, seed: 13.8, rot: -0.08 },
];

/** 島嶼（含草地外環與山崖）佔用的範圍，陸地要讓開 */
function islandObstacles() {
  const walk = getGlobalWalkableZones();
  return ALL_REGION_IDS.map((id) => {
    const r = REGION_CONFIGS[id];
    const e = walk.find((z) => z.type === 'ellipse' && Math.abs(z.cx - r.center[0]) < 0.5 && Math.abs(z.cz - r.center[1]) < 0.5);
    const rx = e && e.type === 'ellipse' ? e.rx : r.islandRadiusX;
    const rz = e && e.type === 'ellipse' ? e.rz : r.islandRadiusZ;
    // 草地外環 5 m＋山崖外擴 3.5 m＋水道 6 m
    return { cx: r.center[0], cz: r.center[1], rx: rx + 14.5, rz: rz + 14.5 };
  });
}

function insideEllipse(x: number, z: number, e: { cx: number; cz: number; rx: number; rz: number }) {
  const dx = (x - e.cx) / e.rx;
  const dz = (z - e.cz) / e.rz;
  return dx * dx + dz * dz < 1;
}

function distToSeg(px: number, pz: number, x1: number, z1: number, x2: number, z2: number) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / l2));
  return Math.hypot(px - (x1 + t * dx), pz - (z1 + t * dz));
}

export const FARMLANDS: Landmass[] = (() => {
  const obs = islandObstacles();
  const out: Landmass[] = [];
  for (const raw of RAW_LANDS) {
    let l = { ...raw, cx: raw.cx * S, cz: raw.cz * S, rx: raw.rx * S, rz: raw.rz * S };
    for (let k = 0; k < 60; k++) {
      let hit = false;
      for (let j = 0; j < 48 && !hit; j++) {
        const a = (j / 48) * Math.PI * 2;
        const c = Math.cos(l.rot);
        const sn = Math.sin(l.rot);
        const lx = Math.cos(a) * l.rx;
        const lz = Math.sin(a) * l.rz;
        const x = l.cx + lx * c - lz * sn;
        const z = l.cz + lx * sn + lz * c;
        if (obs.some((o) => insideEllipse(x, z, o))) hit = true;
        if (WORLD_BRIDGES.some((b) => distToSeg(x, z, b.x1, b.z1, b.x2, b.z2) < b.halfWidth + 8)) hit = true;
      }
      if (!hit) break;
      // 縮小一點、往外推一點
      const len = Math.hypot(l.cx, l.cz) || 1;
      l = { ...l, rx: l.rx * 0.95, rz: l.rz * 0.95, cx: l.cx + (l.cx / len) * 2.2, cz: l.cz + (l.cz / len) * 2.2 };
    }
    if (l.rx > 8 && l.rz > 6) out.push(l);
  }
  return out;
})();

export const LOTUS_PATCHES: [number, number, number][] = [
  [-7.5, -42, 6],
  [7.5, -42, 6],
  [-8.2, -35, 5],
  [8.2, -35, 5],
  [-7.8, 42, 5],
  [7.8, 42, 5],
].map(([x, z, r]) => [x * S, z * S, r * S] as [number, number, number]);

const peakByKind = (k: Peak['kind']) => MOUNTAIN_RING.find((p) => p.kind === k)!;

/** 北側飛瀑主峰、西側塔樓平頂山台、南側水道洞口、東面山壁瀑布（地圖也用） */
export const BASIN_LANDMARKS = {
  northFalls: (() => {
    const p = peakByKind('northFalls');
    return { x: p.x, z: p.z, r: p.r, faceZ: p.z + p.r * 0.92, name: '北山飛瀑' };
  })(),
  westPlateau: (() => {
    const p = peakByKind('westPlateau');
    return { x: p.x, z: p.z, r: p.r, name: '塔樓山台' };
  })(),
  southCave: (() => {
    const p = MOUNTAIN_RING.find((q) => q.i === 8)!;
    return { x: p.x, z: p.z, r: p.r, faceZ: p.z - p.r * 0.95, name: '南山洞口' };
  })(),
  eastFalls: (() => {
    const p = MOUNTAIN_RING.find((q) => q.i === 1)!;
    return { x: p.x, z: p.z, r: p.r, faceX: p.x - p.r * 0.92, name: '東山飛瀑' };
  })(),
  lakePavilion: { x: 0, z: 64, name: '湖心亭' },
};

/** 不規則的陸地輪廓（世界座標的點列） */
export function landOutline(l: Landmass, n = 48): [number, number][] {
  const pts: [number, number][] = [];
  const c = Math.cos(l.rot);
  const sn = Math.sin(l.rot);
  for (let j = 0; j < n; j++) {
    const a = (j / n) * Math.PI * 2;
    const k = 1 + 0.08 * Math.sin(3 * a + l.seed) + 0.05 * Math.sin(5 * a + l.seed * 2) + 0.03 * Math.sin(9 * a + l.seed * 3);
    const lx = Math.cos(a) * l.rx * k;
    const lz = Math.sin(a) * l.rz * k;
    pts.push([l.cx + lx * c - lz * sn, l.cz + lx * sn + lz * c]);
  }
  return pts;
}
