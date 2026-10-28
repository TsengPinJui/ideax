import * as THREE from 'three';
import { getGlobalWalkableZones, WORLD_BRIDGES, ALL_REGION_IDS, REGION_CONFIGS, bridgeAnglerSpots } from '../regionConfigs';
import { mergeByMaterial, getStyleMaterials } from './architecture';
import { seeded } from './textures';

/**
 * 河邊的村民：草地上躺著曬太陽、坐著休憩、岸邊戴斗笠的漁人；橋上坐著釣魚的釣客。
 * 都是靜態擺設（合併成少數幾個網格），只有釣竿會輕輕晃。
 */
type Pose = 'lying' | 'sitting' | 'fisher' | 'angler';

let vm: Record<string, THREE.MeshStandardMaterial> | null = null;
function mats() {
  if (vm) return vm;
  const std = (c: number, r = 0.8) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  vm = {
    skin: std(0xf1c9a5, 0.7),
    blue: std(0x3f5f8a),
    brown: std(0x7a5532),
    green: std(0x4f7a4a),
    red: std(0x9c3a2e),
    white: std(0xece4d2),
    straw: std(0xd8b46a, 0.9),
    hair: std(0x2a1d14, 0.7),
    rod: std(0x6b4a24, 0.6),
    line: std(0xe8e8e8, 0.4),
    basket: std(0xb08a4e, 0.95),
  };
  return vm;
}

function add(p: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  p.add(m);
  return m;
}

/** 一位村民（本地 +Z 朝前），y=0 是地面 */
function villager(pose: Pose, seed: number): THREE.Group {
  const m = mats();
  const rand = seeded(seed);
  const shirts = [m.blue, m.green, m.red, m.white, m.brown];
  const shirt = shirts[Math.floor(rand() * shirts.length)];
  const pants = rand() > 0.5 ? m.brown : m.blue;
  const g = new THREE.Group();
  const hatCone = new THREE.ConeGeometry(0.38, 0.2, 14);
  if (pose === 'lying') {
    // 仰躺在草地上，斗笠蓋在臉上，雙手枕在頭後
    add(g, new THREE.CapsuleGeometry(0.2, 0.6, 4, 10), shirt, 0, 0.2, 0, Math.PI / 2, 0, 0);
    add(g, new THREE.CapsuleGeometry(0.11, 0.62, 4, 8), pants, -0.1, 0.13, -0.72, Math.PI / 2, 0, 0.05);
    add(g, new THREE.CapsuleGeometry(0.11, 0.62, 4, 8), pants, 0.1, 0.13, -0.72, Math.PI / 2, 0, -0.08);
    add(g, new THREE.SphereGeometry(0.16, 12, 10), m.skin, 0, 0.2, 0.56);
    add(g, hatCone, m.straw, 0, 0.36, 0.56, Math.PI / 2, 0, 0);
    for (const s of [-1, 1]) add(g, new THREE.CapsuleGeometry(0.07, 0.36, 4, 6), shirt, s * 0.24, 0.22, 0.62, 0, 0, s * 1.2);
  } else if (pose === 'sitting') {
    // 坐在草地上，雙手撐在後面、腿伸直，看著河
    add(g, new THREE.CapsuleGeometry(0.19, 0.42, 4, 10), shirt, 0, 0.42, -0.08, -0.35, 0, 0);
    add(g, new THREE.SphereGeometry(0.16, 12, 10), m.skin, 0, 0.82, -0.2);
    add(g, new THREE.SphereGeometry(0.165, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.hair, 0, 0.84, -0.21);
    for (const s of [-1, 1]) {
      add(g, new THREE.CapsuleGeometry(0.1, 0.62, 4, 8), pants, s * 0.11, 0.12, 0.38, Math.PI / 2, 0, 0);
      add(g, new THREE.CapsuleGeometry(0.06, 0.42, 4, 6), shirt, s * 0.24, 0.32, -0.32, 0.6, 0, 0);
    }
  } else {
    // 漁人／釣客：坐在小凳上，戴斗笠，拿長竹竿伸向水面
    const sitY = pose === 'angler' ? 0.42 : 0.38;
    add(g, new THREE.CylinderGeometry(0.18, 0.2, sitY - 0.05, 10), m.brown, 0, (sitY - 0.05) / 2, -0.05);
    add(g, new THREE.CapsuleGeometry(0.2, 0.4, 4, 10), shirt, 0, sitY + 0.35, -0.05, 0.12, 0, 0);
    add(g, new THREE.SphereGeometry(0.16, 12, 10), m.skin, 0, sitY + 0.78, 0);
    add(g, hatCone, m.straw, 0, sitY + 0.93, 0);
    for (const s of [-1, 1]) {
      add(g, new THREE.CapsuleGeometry(0.1, 0.36, 4, 8), pants, s * 0.11, sitY, 0.2, Math.PI / 2, 0, 0);
      add(g, new THREE.CapsuleGeometry(0.09, 0.32, 4, 8), pants, s * 0.11, sitY * 0.5, 0.4, 0, 0, 0);
      add(g, new THREE.CapsuleGeometry(0.06, 0.34, 4, 6), shirt, s * 0.16, sitY + 0.42, 0.22, 1.2, 0, 0);
    }
    add(g, new THREE.CylinderGeometry(0.2, 0.16, 0.26, 10, 1, true), m.basket, 0.45, 0.13, -0.1);
    // 釣竿（另外放，會輕輕晃）
    const rodPivot = new THREE.Group();
    rodPivot.position.set(0, sitY + 0.42, 0.4);
    rodPivot.rotation.x = -0.6;
    const len = pose === 'angler' ? 3.6 : 4.2;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.03, len, 6), m.rod);
    rod.position.set(0, len / 2, 0);
    rod.rotation.x = Math.PI / 2 - 0.05;
    rod.position.set(0, 0, len / 2);
    rodPivot.add(rod);
    rodPivot.userData.noMerge = true;
    rod.userData.noMerge = true;
    g.add(rodPivot);
    g.userData.rodPivot = rodPivot;
    g.userData.rodLen = len;
  }
  return g;
}

/** 所有村民＋橋上釣客（回傳群組；userData.tick 讓釣竿晃動） */
export function createVillagers(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'villagers';
  const statics = new THREE.Group();
  root.add(statics);
  const rods: { pivot: THREE.Object3D; phase: number; tip: THREE.Vector3 }[] = [];
  const walk = getGlobalWalkableZones();
  const cols: { id: string; type: 'cylinder'; x: number; z: number; radius: number }[] = [];
  const place = (pose: Pose, x: number, y: number, z: number, yaw: number, seed: number) => {
    if (pose !== 'angler') cols.push({ id: `villager-${seed}`, type: 'cylinder', x, z, radius: pose === 'lying' ? 0.95 : 0.6 });
    const v = villager(pose, seed);
    v.position.set(x, y, z);
    v.rotation.y = yaw;
    statics.add(v);
    if (v.userData.rodPivot) rods.push({ pivot: v.userData.rodPivot, phase: seed * 0.7, tip: new THREE.Vector3() });
  };
  // 河邊草地：每座島 4 位（躺、坐、兩位漁人），避開拱橋
  ALL_REGION_IDS.forEach((rid, ii) => {
    const r = REGION_CONFIGS[rid];
    const [cx, cz] = r.center;
    const e = walk.find((zn) => zn.type === 'ellipse' && Math.abs(zn.cx - cx) < 0.5 && Math.abs(zn.cz - cz) < 0.5);
    if (!e || e.type !== 'ellipse') return;
    const rand = seeded(700 + ii * 31);
    const nearBridge = (a: number) =>
      WORLD_BRIDGES.some((b) => {
        for (const [bx, bz] of [[b.x1, b.z1], [b.x2, b.z2]]) {
          const ba = Math.atan2(bz - cz, bx - cx);
          if (Math.hypot(bx - cx, bz - cz) < Math.max(e.rx, e.rz) + 6) {
            const da = Math.atan2(Math.sin(a - ba), Math.cos(a - ba));
            if (Math.abs(da) < 0.42) return true;
          }
        }
        return false;
      });
    const poses: Pose[] = ['lying', 'sitting', 'fisher', 'fisher'];
    let a = rand() * Math.PI * 2;
    let placed = 0;
    for (let tries = 0; tries < 40 && placed < poses.length; tries++) {
      a += 0.9 + rand() * 0.8;
      if (nearBridge(a)) continue;
      const pose = poses[placed];
      const off = pose === 'fisher' ? 5.9 : 2.6 + rand() * 1.6;
      const x = cx + Math.cos(a) * (e.rx + off);
      const z = cz + Math.sin(a) * (e.rz + off);
      // 面向水面（往外）
      const out = Math.atan2(Math.cos(a) * e.rz, Math.sin(a) * e.rx);
      const yaw = pose === 'lying' ? out + Math.PI / 2 + (rand() - 0.5) * 0.6 : out + (rand() - 0.5) * 0.3;
      place(pose, x, -0.04, z, yaw, ii * 10 + placed + 1);
      placed++;
    }
  });
  // 橋上的釣客
  bridgeAnglerSpots().forEach((p, i) => place('angler', p.x, p.y, p.z, p.faceYaw, 90 + i));

  // 釣線（從竿尖垂到水面）：每幀更新一條線段集合
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(rods.length * 6), 3));
  const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: 0xf2f2f2, transparent: true, opacity: 0.7 }));
  lines.frustumCulled = false;
  root.add(lines);

  // 靜態部分合併（釣竿另外保留，才能晃動）
  const keepRods = rods.map((r) => {
    const parent = r.pivot.parent!;
    return { r, parent };
  });
  keepRods.forEach(({ r }) => r.pivot.removeFromParent());
  mergeByMaterial(statics);
  keepRods.forEach(({ r, parent }) => {
    // 合併後村民群組還在（只是網格被搬走），把竿子掛回去
    parent.add(r.pivot);
  });
  root.updateMatrixWorld(true);
  // 走到欄杆外草地時不會穿過村民
  root.userData.colliders = cols;

  const tip = new THREE.Vector3();
  root.userData.tick = (t: number) => {
    const pos = lineGeo.attributes.position as THREE.BufferAttribute;
    rods.forEach((r, i) => {
      r.pivot.rotation.x = -0.6 + Math.sin(t * 1.3 + r.phase) * 0.05 + (Math.sin(t * 0.37 + r.phase) > 0.97 ? -0.12 : 0);
      r.pivot.updateMatrixWorld(true);
      const len = (r.pivot.parent?.userData.rodLen as number) || 4;
      tip.set(0, 0, len).applyMatrix4(r.pivot.matrixWorld);
      pos.setXYZ(i * 2, tip.x, tip.y, tip.z);
      pos.setXYZ(i * 2 + 1, tip.x, -0.3, tip.z);
    });
    pos.needsUpdate = true;
  };
  void getStyleMaterials;
  return root;
}
