import type { EggId } from './eggs';
import * as THREE from 'three';

/** 畫面上可以點的東西：建築、商店街／攤位／牌坊、創點樓各層懸賞牆 */
export type PickTarget =
  | { kind: 'building'; id: string }
  | { kind: 'street'; id: string }
  | { kind: 'painBoard'; level: number; buildingId: string }
  | { kind: 'desk'; buildingId: string }
  | { kind: 'npc'; id: 'soso' }
  | { kind: 'jobScroll' }
  | { kind: 'feature'; id: 'stage' | 'proposal' }
  | { kind: 'bulb' }
  /** 展覽館、電玩城地下主展場的攤位 */
  | { kind: 'booth'; buildingId: string; zone: number; index: number }
  /** 換樓層：一樓大廳的下樓口（level -1）、地下室的上樓梯（level 0） */
  | { kind: 'goFloor'; buildingId: string; level: number }
  /** 展覽館、電玩城一樓：正對大門的大螢幕、左右牆的精選榜／熱度榜 */
  | { kind: 'lobbyScreen'; buildingId: string }
  | { kind: 'lobbyRank'; buildingId: string; which: 'featured' | 'hot' }
  /** 渡口（乘船點）、塔樓登山口／下山石碑 */
  | { kind: 'dock'; id: string }
  | { kind: 'trail'; dir: 'up' | 'down' | 'top' | 'down-top' }
  // 創點源原創角色（白喵、多慧、007、大熊）
  | { kind: 'character'; id: 'baimiao' | 'duohui' | 'agent007' | 'bear' }
  // 討論島論道廣場的議題碑
  | { kind: 'discStele'; which: 'hot' | 'new' }
  // 彩蛋（和 3D 地圖同一套詩句、同一本收集冊）；maxDist：太遠點不到；minY：要站得夠高（山台、塔頂）
  | { kind: 'egg'; egg: EggId; id?: string; maxDist?: number; minY?: number };

let proxyMat: THREE.MeshBasicMaterial | null = null;

/** 看不見的點擊範圍（不畫出來，只給滑鼠／手指點選用） */
export function makePickProxy(w: number, h: number, d: number, x: number, z: number, yaw: number, target: PickTarget, y0 = 0) {
  if (!proxyMat) proxyMat = new THREE.MeshBasicMaterial({ visible: false });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), proxyMat);
  m.position.set(x, y0 + h / 2, z);
  m.rotation.y = yaw;
  m.userData.pick = target;
  m.userData.noMerge = true;
  m.castShadow = false;
  m.receiveShadow = false;
  m.updateMatrixWorld(true);
  return m;
}

export function pickTargetOf(o: THREE.Object3D): PickTarget | null {
  if (o.userData?.pick) return o.userData.pick as PickTarget;
  if (o.userData?.painBoard) return { kind: 'painBoard', ...(o.userData.painBoard as { level: number; buildingId: string }) };
  return null;
}
