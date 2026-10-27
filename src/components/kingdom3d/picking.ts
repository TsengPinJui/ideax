import * as THREE from 'three';

/** 畫面上可以點的東西：建築、商店街／攤位／牌坊、創點樓各層懸賞牆 */
export type PickTarget =
  | { kind: 'building'; id: string }
  | { kind: 'street'; id: string }
  | { kind: 'painBoard'; level: number; buildingId: string }
  | { kind: 'desk'; buildingId: string };

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
