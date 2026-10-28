import { getGlobalWalkableZones } from './regionConfigs';

/**
 * 地圖上點任意一處 → 實境漫遊裡最近可以站的地方
 * - 在島上（含欄杆外草地）或石拱橋上：就是那裡
 * - 點到水上、田園、山上：找最近的島緣或橋面（水邊）
 * 可走範圍要和實境漫遊的物理一致：島的可走橢圓再往外 5.6 m（草地外環）
 */
export const RIM_EXTRA = 5.6;

export function nearestReachable(x: number, z: number): { x: number; z: number; yaw: number } {
  const zones = getGlobalWalkableZones();
  let best = { x: 0, z: 4, d: Infinity, cx: 0, cz: 0 };
  for (const zn of zones) {
    if (zn.type === 'ellipse') {
      const rx = zn.rx + RIM_EXTRA - 0.8;
      const rz = zn.rz + RIM_EXTRA - 0.8;
      const dx = (x - zn.cx) / rx;
      const dz = (z - zn.cz) / rz;
      if (dx * dx + dz * dz <= 1) return { x, z, yaw: Math.atan2(-(zn.cx - x), -(zn.cz - z)) };
      // 橢圓邊上找最近的點（取樣）
      for (let i = 0; i < 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        const px = zn.cx + Math.cos(a) * rx;
        const pz = zn.cz + Math.sin(a) * rz;
        const d = Math.hypot(px - x, pz - z);
        if (d < best.d) best = { x: px, z: pz, d, cx: zn.cx, cz: zn.cz };
      }
    } else if (zn.type === 'corridor') {
      const abx = zn.x2 - zn.x1;
      const abz = zn.z2 - zn.z1;
      const l2 = abx * abx + abz * abz || 1;
      const t = Math.max(0, Math.min(1, ((x - zn.x1) * abx + (z - zn.z1) * abz) / l2));
      const px = zn.x1 + abx * t;
      const pz = zn.z1 + abz * t;
      const d = Math.hypot(px - x, pz - z);
      if (d <= zn.halfWidth * 0.6) return { x, z, yaw: Math.atan2(-abx, -abz) };
      if (d < best.d) best = { x: px, z: pz, d, cx: px - abz, cz: pz + abx };
    } else if (zn.type === 'rect') {
      const px = Math.max(zn.minX + 0.5, Math.min(zn.maxX - 0.5, x));
      const pz = Math.max(zn.minZ + 0.5, Math.min(zn.maxZ - 0.5, z));
      const d = Math.hypot(px - x, pz - z);
      if (d === 0) return { x, z, yaw: 0 };
      if (d < best.d) best = { x: px, z: pz, d, cx: (zn.minX + zn.maxX) / 2, cz: (zn.minZ + zn.maxZ) / 2 };
    }
  }
  // 站在水邊，面向點的方向（看向水面／點到的地方）
  return { x: best.x, z: best.z, yaw: Math.atan2(-(x - best.x), -(z - best.z)) };
}
