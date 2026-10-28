import * as THREE from 'three';
import { DOCKS, TRAIL } from '../kingdom3d/stylized/docks';
import { ISLAND_TO_REGION } from '../kingdom3d/roamEntry';
import { REGION_CONFIGS } from '../kingdom3d/regionConfigs';

/**
 * 3D 地圖上的乘船點（渡口）與聚雲塔登山口，和「實境漫遊」同一套：
 * - 每座島的渡口：木棧橋＋紅柱小亭「乘船點」＋繫著的小船，上方飄一個藍色「乘船」大標章（遠遠就看得到）
 * - 西山塔樓下：登山口石牌坊「聚雲塔登山口」＋一路上山的石階，山腳岸邊另有一座登船點
 * - 點了直接換到實境漫遊的那個渡口／登山口（userData.roamTarget）
 * 位置用往下打射線找岸線與山坡高度，島形改了也會跟著貼齊
 */

const WATER_Y = -0.6;
const MAP_ISLANDS: Record<string, [number, number]> = {
  home: [0, -0.5],
  pain: [-32, -24.5],
  discussion: [33.5, -24.5],
  creative: [-32, 24],
  career: [32, 24],
};
const REGION_TO_ISLAND = Object.fromEntries(Object.entries(ISLAND_TO_REGION).map(([k, v]) => [v, k]));
/** 3D 地圖上聚雲塔所在的西山山台 */
const MAP_PAGODA = { x: -75, z: 0, top: 15.1 };

const KAI = '"DFKai-SB","BiauKai","Kaiti TC","STKaiti","KaiTi","LXGW WenKai TC","Noto Serif TC",serif';

function badgeTexture(kind: 'boat' | 'trail', label: string) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 320;
  const g = c.getContext('2d')!;
  const col = kind === 'boat' ? '#1d5fbf' : '#2f7d3a';
  // 圓章
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath();
  g.arc(128, 132, 112, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = col;
  g.beginPath();
  g.arc(128, 124, 108, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#ffffff';
  g.lineWidth = 10;
  g.beginPath();
  g.arc(128, 124, 92, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = '#ffffff';
  if (kind === 'boat') {
    // 小船＋帆
    g.beginPath();
    g.moveTo(58, 140);
    g.lineTo(198, 140);
    g.lineTo(172, 176);
    g.lineTo(84, 176);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(132, 56);
    g.lineTo(132, 132);
    g.lineTo(82, 132);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(140, 70);
    g.lineTo(140, 132);
    g.lineTo(178, 132);
    g.closePath();
    g.fill();
    g.fillRect(130, 52, 6, 90);
  } else {
    // 山＋階梯
    g.beginPath();
    g.moveTo(44, 178);
    g.lineTo(112, 70);
    g.lineTo(146, 120);
    g.lineTo(166, 96);
    g.lineTo(214, 178);
    g.closePath();
    g.fill();
    g.fillStyle = col;
    for (let i = 0; i < 4; i++) g.fillRect(92 + i * 12, 162 - i * 18, 26, 8);
  }
  // 下方字條
  g.fillStyle = '#fff8e6';
  g.strokeStyle = col;
  g.lineWidth = 6;
  const w = Math.min(240, 60 + label.length * 40);
  g.beginPath();
  g.roundRect(128 - w / 2, 246, w, 64, 18);
  g.fill();
  g.stroke();
  g.fillStyle = col;
  g.font = `900 40px ${KAI}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(label, 128, 280);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function plaqueTexture(text: string) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#3b2412';
  g.fillRect(0, 0, 512, 128);
  g.strokeStyle = '#d9a63a';
  g.lineWidth = 8;
  g.strokeRect(8, 8, 496, 112);
  g.fillStyle = '#f2cf7a';
  g.font = `900 64px ${KAI}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 68, 470);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export interface MapDocks {
  group: THREE.Group;
  /** 可點的東西（加進 clickable 清單） */
  pickables: THREE.Object3D[];
  tick: (t: number) => void;
}

export function createMapDocksAndTrail(world: THREE.Object3D, ignore: THREE.Object3D[] = []): MapDocks {
  const group = new THREE.Group();
  group.name = 'map_docks_trail';
  const pickables: THREE.Object3D[] = [];
  const badges: { s: THREE.Sprite; y: number; ph: number }[] = [];
  world.updateMatrixWorld(true);
  const rc = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const skip = new Set(ignore);
  const targets: THREE.Object3D[] = [];
  world.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || skip.has(o)) return;
    const mt = m.material as THREE.Material & { opacity?: number; transparent?: boolean };
    if (Array.isArray(mt)) return targets.push(o);
    if (mt && mt.transparent && (mt.opacity ?? 1) < 0.2) return;
    targets.push(o);
  });
  /** 這一點的地面高度（沒有地就回傳水面以下） */
  const groundY = (x: number, z: number) => {
    rc.set(new THREE.Vector3(x, 60, z), down);
    rc.far = 80;
    const hits = rc.intersectObjects(targets, false);
    for (const h of hits) {
      let ok = true;
      let p: THREE.Object3D | null = h.object;
      while (p) {
        if (!p.visible || skip.has(p)) ok = false;
        p = p.parent;
      }
      if (ok) return h.point.y;
    }
    return WATER_Y - 1;
  };
  const isLand = (x: number, z: number) => groundY(x, z) > WATER_Y + 0.25;

  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3d2414, roughness: 0.8 });
  const red = new THREE.MeshStandardMaterial({ color: 0xb3261e, roughness: 0.55 });
  const tile = new THREE.MeshStandardMaterial({ color: 0x2f3a40, roughness: 0.7 });
  const stone = new THREE.MeshStandardMaterial({ color: 0xb8b2a6, roughness: 0.92 });
  const lantern = new THREE.MeshStandardMaterial({ color: 0xff7a3d, emissive: 0xff5a1f, emissiveIntensity: 0.9, roughness: 0.5 });
  const hull = new THREE.MeshStandardMaterial({ color: 0x7a4a26, roughness: 0.75 });
  const box = (p: THREE.Object3D, w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    p.add(mesh);
    return mesh;
  };
  const badge = (kind: 'boat' | 'trail', label: string, x: number, y: number, z: number, target: unknown) => {
    const mat = new THREE.SpriteMaterial({ map: badgeTexture(kind, label), depthTest: false, transparent: true });
    const s = new THREE.Sprite(mat);
    s.scale.set(5.6, 7.0, 1);
    s.position.set(x, y, z);
    s.renderOrder = 20;
    s.userData.roamTarget = target;
    group.add(s);
    pickables.push(s);
    badges.push({ s, y, ph: Math.random() * 6 });
  };

  /** 渡口：岸邊一座小亭＋伸進水裡的木棧橋＋一艘小船；yaw 讓本地 +Z 朝向水面 */
  const buildDock = (x: number, z: number, yaw: number, gy: number, label: string, target: unknown) => {
    const d = new THREE.Group();
    d.position.set(x, 0, z);
    d.rotation.y = yaw;
    group.add(d);
    const top = Math.max(gy, WATER_Y + 0.35);
    // 棧橋
    box(d, 1.4, 0.14, 4.6, wood, 0, top + 0.02, 2.4);
    for (let i = 0; i < 6; i++) box(d, 1.44, 0.03, 0.06, dark, 0, top + 0.1, 0.4 + i * 0.8);
    for (const sx of [-0.66, 0.66]) for (const sz of [0.6, 2.4, 4.4]) box(d, 0.14, 1.6, 0.14, dark, sx, top - 0.6, sz);
    // 小亭
    for (const sx of [-0.85, 0.85]) for (const sz of [-1.1, 0.5]) box(d, 0.16, 1.9, 0.16, red, sx, gy + 0.95, sz);
    const roof = box(d, 2.5, 0.16, 2.4, tile, 0, gy + 2.0, -0.3);
    roof.rotation.x = 0.05;
    box(d, 2.0, 0.34, 2.0, tile, 0, gy + 2.24, -0.3).scale.set(1, 1, 1);
    box(d, 0.7, 0.4, 0.2, tile, 0, gy + 2.5, -0.3);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.38), new THREE.MeshStandardMaterial({ map: plaqueTexture(label), emissive: 0xffffff, emissiveMap: plaqueTexture(label), emissiveIntensity: 0.4 }));
    sign.position.set(0, gy + 1.72, 0.6);
    d.add(sign);
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), lantern);
    l.position.set(0.66, top + 0.9, 4.4);
    d.add(l);
    // 繫在棧橋旁的小船
    const boat = new THREE.Group();
    boat.position.set(1.35, WATER_Y + 0.12, 3.3);
    d.add(boat);
    box(boat, 0.9, 0.3, 2.6, hull, 0, 0, 0);
    box(boat, 0.7, 0.05, 2.2, wood, 0, 0.16, 0);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.7, 4), hull);
    bow.rotation.x = Math.PI / 2;
    bow.position.set(0, 0, 1.6);
    boat.add(bow);
    box(boat, 0.8, 0.5, 0.8, new THREE.MeshStandardMaterial({ color: 0xd9c9a3, roughness: 0.9 }), 0, 0.45, -0.3);
    // 透明點擊框
    const hit = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.6, 6.4), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    hit.position.set(0, gy + 1.4, 1.6);
    hit.userData.roamTarget = target;
    d.add(hit);
    pickables.push(hit);
    const bp = new THREE.Vector3(0, gy + 6.4, 0.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(new THREE.Vector3(x, 0, z));
    badge('boat', '乘船', bp.x, bp.y, bp.z, target);
  };

  /** 從某點沿方向走，找第一個離開陸地的點（岸線） */
  const shore = (cx: number, cz: number, dx: number, dz: number, r0: number, r1: number): { x: number; z: number; y: number } | null => {
    let last: { x: number; z: number; y: number } | null = null;
    for (let r = r0; r <= r1; r += 0.35) {
      const x = cx + dx * r;
      const z = cz + dz * r;
      const y = groundY(x, z);
      if (y > WATER_Y + 0.25) last = { x, z, y };
      else if (last) return last;
    }
    return null;
  };

  // ── 各島渡口（和實境漫遊同一批，角度相同） ──
  for (const dk of DOCKS) {
    const isl = REGION_TO_ISLAND[dk.regionId];
    const c = isl ? MAP_ISLANDS[isl] : null;
    if (!c) continue;
    // 實境漫遊裡渡口相對島中心的方向
    const wc = { x: dk.landX, z: dk.landZ };
    const a = Math.atan2(wc.z - regionCenterZ(dk.regionId), wc.x - regionCenterX(dk.regionId));
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    const s = shore(c[0], c[1], dx, dz, 3, 34);
    if (!s) continue;
    // 往岸內退一點放小亭，棧橋朝外
    const x = s.x - dx * 1.1;
    const z = s.z - dz * 1.1;
    const yaw = Math.atan2(dx, dz);
    buildDock(x, z, yaw, Math.max(groundY(x, z), WATER_Y + 0.3), '乘船點', { x: dk.landX, z: dk.landZ, yaw: dk.landYaw });
  }

  // ── 聚雲塔登山口：從塔往東（湖的方向）找山腳，再沿坡鋪石階上山 ──
  {
    const dx = 1;
    const dz = 0;
    let foot: { x: number; z: number; y: number } | null = null;
    const path: { x: number; z: number; y: number }[] = [];
    for (let r = 4; r < 40; r += 0.5) {
      const x = MAP_PAGODA.x + dx * r;
      const z = MAP_PAGODA.z + dz * r;
      const y = groundY(x, z);
      path.push({ x, z, y });
      if (y < 1.6 && y > WATER_Y + 0.25) {
        foot = { x, z, y };
        break;
      }
    }
    const trailTarget = { x: TRAIL.x, z: TRAIL.z, yaw: TRAIL.yaw };
    if (foot) {
      const tg = new THREE.Group();
      group.add(tg);
      // 石階：沿坡面每 0.5 一階（只鋪在坡上，山台頂平地不鋪）
      for (const p of path) {
        if (p.y < foot.y + 0.2 || p.y > MAP_PAGODA.top - 0.4) continue;
        for (const oz of [-0.55, 0.55]) box(tg, 0.55, 0.12, 0.08, stone, p.x, p.y + 0.06, p.z + oz * 1.15);
        box(tg, 0.55, 0.14, 1.1, stone, p.x, p.y + 0.04, p.z);
      }
      // 山腳石牌坊
      const fx = foot.x + 0.8;
      const gw = 3.2;
      for (const s of [-1, 1]) {
        box(tg, 0.4, 3.0, 0.4, stone, fx, foot.y + 1.5, foot.z + s * (gw / 2));
        box(tg, 0.7, 0.4, 0.7, stone, fx, foot.y + 0.2, foot.z + s * (gw / 2));
      }
      box(tg, 0.5, 0.36, gw + 1.2, stone, fx, foot.y + 3.0, foot.z);
      box(tg, 0.9, 0.18, gw + 1.8, tile, fx, foot.y + 3.3, foot.z);
      box(tg, 0.4, 0.22, gw + 1.4, tile, fx, foot.y + 3.48, foot.z);
      const pq = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.62), new THREE.MeshStandardMaterial({ map: plaqueTexture('聚雲塔登山口'), emissive: 0xffffff, emissiveMap: plaqueTexture('聚雲塔登山口'), emissiveIntensity: 0.45, side: THREE.DoubleSide }));
      pq.position.set(fx + 0.27, foot.y + 2.55, foot.z);
      pq.rotation.y = Math.PI / 2;
      tg.add(pq);
      for (const s of [-1, 1]) {
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), lantern);
        l.position.set(fx + 0.45, foot.y + 2.1, foot.z + s * (gw / 2));
        tg.add(l);
      }
      const hit = new THREE.Mesh(new THREE.BoxGeometry(3, 4.4, gw + 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      hit.position.set(fx, foot.y + 2.2, foot.z);
      hit.userData.roamTarget = trailTarget;
      tg.add(hit);
      pickables.push(hit);
      badge('trail', '登山口', fx + 0.4, foot.y + 7.6, foot.z, trailTarget);

      // 山腳下的登船點：繼續往東找到岸邊
      const s = shore(foot.x, foot.z, dx, dz, 0.5, 40);
      if (s) {
        const x = s.x - dx * 1.1;
        const z = s.z - dz * 1.1;
        const near = [...DOCKS].sort((p, q) => Math.hypot(p.landX - TRAIL.x, p.landZ - TRAIL.z) - Math.hypot(q.landX - TRAIL.x, q.landZ - TRAIL.z))[0];
        buildDock(x, z, Math.atan2(dx, dz), Math.max(groundY(x, z), WATER_Y + 0.3), '登山渡口', { x: near.landX, z: near.landZ, yaw: near.landYaw });
      }
    }
  }

  group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).receiveShadow = true;
  });
  return {
    group,
    pickables,
    tick: (t: number) => {
      for (const b of badges) b.s.position.y = b.y + Math.sin(t * 1.6 + b.ph) * 0.25;
    },
  };
}

function regionCenterX(id: string) {
  return (REGION_CONFIGS as any)[id]?.center?.[0] ?? 0;
}
function regionCenterZ(id: string) {
  return (REGION_CONFIGS as any)[id]?.center?.[1] ?? 0;
}
