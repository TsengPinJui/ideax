import { BuildingInteractable, Collider } from '../types';
import { localToWorldXZ } from '../regionConfigs';

/**
 * 多樓層建築（例如創點樓）：樓梯位置、每層的牆與樓梯井碰撞、上下樓的觸發區。
 * 座標都是建築本地座標（+Z 是正門那一面），需要時再轉成世界座標。
 * 第 k 段樓梯（k 樓 → k+1 樓）沿左右側牆交替擺放：從靠門的一端（z0，低）往後牆（z1，高）爬升。
 */
export const FLOOR_H = 3.6;

export interface Flight {
  k: number;
  side: -1 | 1;
  lx: number;
  laneW: number;
  z0: number;
  z1: number;
}

export interface StoryLayout {
  floors: number;
  floorH: number;
  flights: Flight[];
  w: number;
  d: number;
}

export function getStoryLayout(b: Pick<BuildingInteractable, 'width' | 'depth'> & { floors?: number }): StoryLayout | null {
  const floors = b.floors || 1;
  if (floors < 2) return null;
  const w = b.width;
  const d = b.depth;
  const laneW = 2.0;
  const L = Math.min(6.6, d - 4.2);
  const z0 = d / 2 - 2.3;
  const z1 = z0 - L;
  const flights: Flight[] = [];
  for (let k = 0; k < floors - 1; k++) {
    const side: -1 | 1 = k % 2 === 0 ? -1 : 1;
    flights.push({ k, side, lx: side * (w / 2 - 0.45 - laneW / 2), laneW, z0, z1 });
  }
  return { floors, floorH: FLOOR_H, flights, w, d };
}

type Seg = [number, number, number, number];

/** 第 level 層的碰撞（本地座標線段） */
function levelSegments(lay: StoryLayout, level: number): Seg[] {
  const { w, d } = lay;
  const segs: Seg[] = [];
  if (level > 0) {
    // 樓上：四面牆完全封閉（沒有門）
    segs.push([-w / 2, -d / 2, w / 2, -d / 2], [-w / 2, d / 2, w / 2, d / 2], [-w / 2, -d / 2, -w / 2, d / 2], [w / 2, -d / 2, w / 2, d / 2]);
    // 下方上來的樓梯井：內側長邊＋靠門那端封住，靠後牆那端開放（走進去就下樓）
    const f = lay.flights[level - 1];
    const inner = f.lx - f.side * (f.laneW / 2);
    segs.push([inner, f.z1, inner, f.z0], [inner, f.z0, f.lx + f.side * (f.laneW / 2), f.z0]);
  }
  // 往上的樓梯：內側擋一道扶手，只能從靠門那端踏上去
  const up = lay.flights[level];
  if (up) {
    const inner = up.lx - up.side * (up.laneW / 2);
    segs.push([inner, up.z1, inner, up.z0 - 0.9], [inner, up.z1, up.lx + up.side * (up.laneW / 2), up.z1]);
  }
  return segs;
}

export function levelColliders(b: BuildingInteractable, lay: StoryLayout, level: number): Collider[] {
  const cx = b.position.x;
  const cz = b.position.z;
  return levelSegments(lay, level).map(([x1, z1, x2, z2], i) => {
    const [ax, az] = localToWorldXZ(cx, cz, b.facingYaw, x1, z1);
    const [bx, bz] = localToWorldXZ(cx, cz, b.facingYaw, x2, z2);
    return { id: `${b.id}-L${level}-${i}`, type: 'segment', x1: ax, z1: az, x2: bx, z2: bz, halfThickness: level > 0 && i < 4 ? 0.28 : 0.12 } as Collider;
  });
}

export function toLocal(b: BuildingInteractable, x: number, z: number): [number, number] {
  const relX = x - b.position.x;
  const relZ = z - b.position.z;
  const c = Math.cos(b.facingYaw);
  const s = Math.sin(b.facingYaw);
  return [relX * c - relZ * s, relX * s + relZ * c];
}

export function toWorld(b: BuildingInteractable, lx: number, lz: number): [number, number] {
  return localToWorldXZ(b.position.x, b.position.z, b.facingYaw, lx, lz);
}

const inLane = (f: Flight, lx: number) => Math.abs(lx - f.lx) <= f.laneW / 2;

/** 是否站在「往上」的觸發區（第 level 層樓梯靠門的一端） */
export function upTrigger(lay: StoryLayout, level: number, lx: number, lz: number): Flight | null {
  const f = lay.flights[level];
  if (!f) return null;
  return inLane(f, lx) && lz <= f.z0 + 0.5 && lz >= f.z0 - 0.6 ? f : null;
}

/** 是否站在「往下」的觸發區（樓梯井靠後牆那一端） */
export function downTrigger(lay: StoryLayout, level: number, lx: number, lz: number): Flight | null {
  if (level <= 0) return null;
  const f = lay.flights[level - 1];
  return inLane(f, lx) && lz >= f.z1 - 0.2 && lz <= f.z1 + 1.0 ? f : null;
}
