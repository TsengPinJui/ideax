import { REGION_CONFIGS, localToWorldXZ } from './regionConfigs';
import { saveKingdomResume } from './kingdomResume';
import { nearestReachable } from './nearestSpot';
import { TULOU_RADIUS } from './stylized/tulou';
import type { RegionId } from './types';

/**
 * 從 3D 地圖（/island 俯視圖）進入「實境漫遊」的對應位置
 * - 3D 地圖的島中心大約是 (±32, ±24)，實境漫遊是 (±68~72, ±48)：靠近某座島時以那座島為準換算，水上則整體放大
 * - 有對應的建築就站在建築門口、面向大門
 */

export const ISLAND_TO_REGION: Record<string, RegionId> = {
  home: 'region-home',
  pain: 'region-pain',
  discussion: 'region-discussion',
  creative: 'region-creative',
  career: 'region-career',
};

const MAP_CENTERS: Record<string, [number, number]> = {
  home: [0, -0.5],
  pain: [-32, -24.5],
  discussion: [32, -24.5],
  creative: [-32, 24],
  career: [32, 24],
};

/** 3D 地圖座標 → 實境漫遊座標 */
export function mapToWorld(mx: number, mz: number): [number, number] {
  let bestId = '';
  let bd = Infinity;
  for (const [id, [cx, cz]] of Object.entries(MAP_CENTERS)) {
    const d = Math.hypot(mx - cx, mz - cz);
    if (d < bd) {
      bd = d;
      bestId = id;
    }
  }
  if (bestId && bd < 17) {
    const [cx, cz] = MAP_CENTERS[bestId];
    const [wx, wz] = REGION_CONFIGS[ISLAND_TO_REGION[bestId]].center;
    return [wx + (mx - cx) * 2.1, wz + (mz - cz) * 2.0];
  }
  return [mx * 2.18, mz * 1.98];
}

/** 站在建築門口（面向大門） */
export function roamTargetForBuilding(buildingId: string | null | undefined): { x: number; z: number; yaw: number } | null {
  if (!buildingId) return null;
  for (const r of Object.values(REGION_CONFIGS)) {
    const b = r.buildings.find((x) => x.id === buildingId);
    if (!b) continue;
    const front = b.exterior === 'tulou' ? TULOU_RADIUS + 5 : b.exterior === 'board' ? 3 : b.depth / 2 + 3;
    const [x, z] = localToWorldXZ(b.position.x, b.position.z, b.facingYaw, 0, front);
    const p = nearestReachable(x, z);
    return { x: p.x, z: p.z, yaw: b.facingYaw };
  }
  return null;
}

/** 某座島的出生點 */
export function roamTargetForIsland(islandId: string | null | undefined): { x: number; z: number; yaw: number } {
  const rid = (islandId && ISLAND_TO_REGION[islandId]) || 'region-home';
  const sp = REGION_CONFIGS[rid].defaultSpawn;
  return { x: sp.position[0], z: sp.position[2], yaw: sp.yaw };
}

/** 換到實境漫遊，站在指定位置 */
export function enterRoamAt(t: { x: number; z: number; yaw: number }) {
  saveKingdomResume({ x: t.x, y: 0, z: t.z, yaw: t.yaw, pitch: 0, level: 0, towerId: null, timeOfDay: 'dusk' });
  window.dispatchEvent(new CustomEvent('ideax_open_kingdom3d', { detail: { from: 'island' } }));
}

/** 3D 地圖上任一點 → 實境漫遊最近可以站的地方 */
export function enterRoamAtMapPoint(mx: number, mz: number) {
  const [wx, wz] = mapToWorld(mx, mz);
  enterRoamAt(nearestReachable(wx, wz));
}
