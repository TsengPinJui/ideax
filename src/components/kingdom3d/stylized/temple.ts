import * as THREE from 'three';
import type { BuildingInteractable, Collider } from '../types';
import { getStyleMaterials, mergeByMaterial, buildRoofTier, getLionGeometry } from './architecture';

/**
 * 求職廟的廟宇特色（讓它一眼就和其他樓閣不同）：
 * - 門前一座「三川殿」門廊：金黃琉璃兩坡頂、高高翹起的燕尾脊、屋脊上剪黏「雙龍搶珠」
 * - 一對盤龍石柱（龍柱）、兩根朱漆角柱、彩繪樑枋與「求職廟」金字匾
 * - 門廊下吊著天公爐，香煙裊裊；兩盞大紅宮燈
 * - 廟旁的金爐（燒金紙的小塔，爐口有火光）
 * 本地座標：+Z 朝廟門外
 */

const KAI = '"DFKai-SB","BiauKai","Kaiti TC","STKaiti","KaiTi","LXGW WenKai TC","CWTeXKai","Noto Serif TC",serif';

function plaqueTexture(text: string) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 176;
  const g = c.getContext('2d')!;
  // 外框鎏金、內底烏木黑漆，呼應「求職廟・近景」黑底金字匾額
  g.fillStyle = '#d8a642';
  g.fillRect(0, 0, 512, 176);
  g.fillStyle = '#17110d';
  g.fillRect(12, 12, 488, 152);
  g.strokeStyle = '#f3cd6e';
  g.lineWidth = 4;
  g.strokeRect(22, 22, 468, 132);
  g.strokeStyle = 'rgba(243,205,110,0.45)';
  g.lineWidth = 2;
  g.strokeRect(30, 30, 452, 116);
  g.fillStyle = '#ffd978';
  g.font = `900 98px ${KAI}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 92);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 兩坡屋面（中間微凹、兩端微翹）：從屋脊 (zR, yR) 往簷口 (zE, yE) */
function slopeGeometry(halfX: number, zR: number, yR: number, zE: number, yE: number, flipNormal: boolean) {
  const nx = 18;
  const nz = 8;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= nz; j++) {
    const t = j / nz;
    for (let i = 0; i <= nx; i++) {
      const u = i / nx;
      const x = -halfX + 2 * halfX * u;
      const edge = Math.pow(Math.abs(u - 0.5) * 2, 6);
      const z = zR + (zE - zR) * t;
      // 下凹的曲線＋簷角起翹
      const safeT = Math.max(0, Math.min(1, t));
      const y = yR + (yE - yR) * Math.pow(safeT, 0.75) + edge * safeT * 0.55 + safeT * safeT * 0.18;
      pos.push(x, Number.isFinite(y) ? y : 0, z);
      uv.push((x / 2.2) * 1.0, (safeT * Math.hypot(zE - zR, yE - yR)) / 2.2);
    }
  }
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      const b = a + 1;
      const c = a + nx + 1;
      const d = c + 1;
      if (flipNormal) idx.push(a, b, c, b, d, c);
      else idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function createTempleExtras(b: BuildingInteractable): { group: THREE.Group; colliders: Collider[] } {
  return createOctagonalTemple(b);
}

function createOctagonalTemple(b: BuildingInteractable): { group: THREE.Group; colliders: Collider[] } {
  const mats = getStyleMaterials();
  const root = new THREE.Group();
  root.name = `temple_extras_${b.id}`;
  root.position.copy(b.position);
  root.rotation.y = b.facingYaw;
  const pavilion = new THREE.Group();
  root.add(pavilion);
  const colliders: Collider[] = [];
  const worldPoint = (x: number, z: number) => {
    const c = Math.cos(b.facingYaw);
    const s = Math.sin(b.facingYaw);
    return [b.position.x + x * c + z * s, b.position.z - x * s + z * c] as const;
  };
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = pavilion) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  // 建築材質元素：青瓦（mats.roofs.slate）、朱紅木（mats.redLacquer）、金飾（gold）、白石（whiteStone）、暖光燈籠
  const whiteStone = new THREE.MeshStandardMaterial({ color: 0xe6e1d6, roughness: 0.82 });
  const carvedStone = new THREE.MeshStandardMaterial({ color: 0xd5cfc2, roughness: 0.86 });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xd9ac4e,
    roughness: 0.3,
    metalness: 0.65,
    emissive: new THREE.Color(0x523608),
    emissiveIntensity: 0.18,
  });
  const bronze = new THREE.MeshStandardMaterial({ color: 0x725932, roughness: 0.42, metalness: 0.72 });
  const warmGlow = new THREE.MeshStandardMaterial({
    color: 0xffe2a8,
    emissive: new THREE.Color(0xff9d3b),
    emissiveIntensity: 1.15,
    roughness: 0.35,
  });
  const floorRadius = Math.min(b.width * 0.48, b.depth * 0.62);

  // ── 白石台基、八角石台與溫潤木地坪 ──
  add(new THREE.CylinderGeometry(floorRadius * 0.96, floorRadius * 1.03, 0.68, 8), whiteStone, 0, 0.34, 0).rotation.y = Math.PI / 8;
  add(new THREE.CylinderGeometry(floorRadius * 0.86, floorRadius * 0.86, 0.1, 8), mats.woodFloor, 0, 0.71, 0).rotation.y = Math.PI / 8;
  const sill = add(new THREE.CylinderGeometry(floorRadius * 0.99, floorRadius * 0.99, 0.08, 8), gold, 0, 0.68, 0);
  sill.rotation.y = Math.PI / 8;

  // ── 朱紅木立柱與白石柱礎（高挑通透的重簷廟亭比例） ──
  const postRadius = floorRadius * 0.78;
  const postY = 0.76;
  const postHeight = 6.2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const x = Math.cos(a) * postRadius;
    const z = Math.sin(a) * postRadius;
    add(new THREE.CylinderGeometry(0.3, 0.36, 0.24, 8), whiteStone, x, postY + 0.12, z);
    add(new THREE.CylinderGeometry(0.24, 0.28, 0.08, 8), gold, x, postY + 0.26, z);
    add(new THREE.CylinderGeometry(0.19, 0.22, postHeight, 12), mats.redLacquer, x, postY + postHeight / 2, z);
    add(new THREE.CylinderGeometry(0.31, 0.25, 0.2, 8), gold, x, postY + postHeight - 0.02, z);
    const [wx, wz] = worldPoint(x, z);
    colliders.push({ id: `${b.id}-oct-post-${i}`, type: 'cylinder', x: wx, z: wz, radius: 0.42 });
  }
  const beamRing = add(new THREE.CylinderGeometry(postRadius * 1.04, postRadius * 1.04, 0.34, 8), mats.redLacquer, 0, postY + postHeight - 0.06, 0);
  beamRing.rotation.y = Math.PI / 8;
  const lintel = add(new THREE.CylinderGeometry(postRadius * 1.08, postRadius * 1.08, 0.09, 8), gold, 0, postY + postHeight - 0.26, 0);
  lintel.rotation.y = Math.PI / 8;

  // ── 青瓦重簷飛簷翹角屋頂（參照「求職廟・近景」：深青黛瓦 + 金色正脊／垂脊 + 飛簷翹角 + 寶頂） ──
  const lowerRoofW = floorRadius * 2.28;
  const lowerRoofD = floorRadius * 1.95;
  const lowerRoof = buildRoofTier(lowerRoofW, lowerRoofD, {
    rise: 1.55,
    overhang: 0.88,
    curl: 0.56,
    theme: 'slate',
    ridge: false,
  });
  lowerRoof.position.set(0, 6.95, 0.2);
  lowerRoof.traverse((o) => { o.userData.noMerge = true; });
  root.add(lowerRoof);

  // 上層重簷主脊與橫向連接木構（讓上下兩層青瓦之間可懸掛「求職廟」黑底金字額匾）
  add(new THREE.BoxGeometry(lowerRoofW * 0.62, 0.78, lowerRoofD * 0.58), mats.redLacquer, 0, 7.95, 0.2);
  add(new THREE.BoxGeometry(lowerRoofW * 0.64, 0.1, lowerRoofD * 0.6), gold, 0, 8.32, 0.2);

  const upperRoof = buildRoofTier(lowerRoofW * 0.74, lowerRoofD * 0.72, {
    rise: 1.75,
    overhang: 0.76,
    curl: 0.62,
    theme: 'slate',
    ridge: true,
    finial: true,
  });
  upperRoof.position.set(0, 8.38, 0.2);
  upperRoof.traverse((o) => { o.userData.noMerge = true; });
  root.add(upperRoof);

  // 殿內中央大香爐與暖光神龕背光（呼應近景圖中殿堂中央香案與金光）
  const innerAltar = new THREE.Group();
  innerAltar.position.set(0, 0.76, -0.15);
  pavilion.add(innerAltar);
  add(new THREE.BoxGeometry(1.75, 0.34, 1.35), whiteStone, 0, 0.17, 0, innerAltar);
  add(new THREE.BoxGeometry(1.42, 0.42, 1.05), carvedStone, 0, 0.55, 0, innerAltar);
  add(new THREE.CylinderGeometry(0.56, 0.42, 0.68, 12), bronze, 0, 1.08, 0, innerAltar);
  add(new THREE.TorusGeometry(0.54, 0.055, 8, 16).rotateX(Math.PI / 2), gold, 0, 1.38, 0, innerAltar);
  for (const sx of [-1, 1]) {
    add(new THREE.BoxGeometry(0.14, 0.46, 0.14), gold, sx * 0.6, 1.32, 0, innerAltar);
  }
  for (const ix of [-0.14, 0, 0.14]) {
    add(new THREE.CylinderGeometry(0.015, 0.015, 0.52, 5), warmGlow, ix, 1.62, 0, innerAltar);
  }
  // 殿堂背景蓮座暖光圓屏
  const halo = add(new THREE.CylinderGeometry(1.35, 1.35, 0.08, 24).rotateX(Math.PI / 2), gold, 0, 2.55, -floorRadius * 0.52);
  halo.scale.set(1, 1, 0.6);
  const innerGlow = add(new THREE.SphereGeometry(0.32, 12, 10), warmGlow, 0, 2.35, -floorRadius * 0.46);
  innerGlow.userData.noMerge = true;

  // ── 延伸至廟前的重簷門廊與白石台階 ──
  const corridor = new THREE.Group();
  corridor.position.z = floorRadius * 0.83;
  pavilion.add(corridor);
  const corridorLength = 4.2;
  // 白石平台與三級白石台階
  add(new THREE.BoxGeometry(5.2, 0.44, corridorLength), whiteStone, 0, 0.22, corridorLength / 2, corridor);
  for (let s = 0; s < 3; s++) {
    const stepW = 3.5 + s * 0.28;
    const stepH = 0.14;
    const stepZ = corridorLength + 0.22 + s * 0.34;
    add(new THREE.BoxGeometry(stepW, stepH, 0.36), whiteStone, 0, 0.36 - s * 0.12, stepZ, corridor);
  }
  // 台階兩側白石抱鼓石欄板
  for (const side of [-1, 1]) {
    add(new THREE.BoxGeometry(0.24, 0.62, 1.18), whiteStone, side * 1.92, 0.36, corridorLength + 0.48, corridor);
    add(new THREE.CylinderGeometry(0.24, 0.24, 0.26, 12).rotateZ(Math.PI / 2), carvedStone, side * 1.92, 0.42, corridorLength + 0.98, corridor);
  }

  // 門廊朱紅木柱與柱間暖光宮燈
  for (const x of [-2.15, -1.18, 1.18, 2.15]) {
    const z = corridorLength - 0.35;
    add(new THREE.CylinderGeometry(0.24, 0.28, 0.22, 8), whiteStone, x, 0.55, z, corridor);
    add(new THREE.CylinderGeometry(0.15, 0.18, 4.45, 10), mats.redLacquer, x, 2.78, z, corridor);
    add(new THREE.CylinderGeometry(0.22, 0.19, 0.14, 8), gold, x, 5.02, z, corridor);
    const [wx, wz] = worldPoint(x, floorRadius * 0.83 + z);
    colliders.push({ id: `${b.id}-gallery-front-${x}`, type: 'cylinder', x: wx, z: wz, radius: 0.3 });
  }
  for (const x of [-2.15, 2.15]) {
    const z = 1.15;
    add(new THREE.CylinderGeometry(0.24, 0.28, 0.22, 8), whiteStone, x, 0.55, z, corridor);
    add(new THREE.CylinderGeometry(0.15, 0.18, 4.45, 10), mats.redLacquer, x, 2.78, z, corridor);
    add(new THREE.CylinderGeometry(0.22, 0.19, 0.14, 8), gold, x, 5.02, z, corridor);
    const [wx, wz] = worldPoint(x, floorRadius * 0.83 + z);
    colliders.push({ id: `${b.id}-gallery-mid-${x}`, type: 'cylinder', x: wx, z: wz, radius: 0.3 });
  }
  // 門廊朱紅額枋與金線
  add(new THREE.BoxGeometry(4.8, 0.32, 0.32), mats.redLacquer, 0, 4.92, corridorLength - 0.35, corridor);
  add(new THREE.BoxGeometry(4.86, 0.07, 0.36), gold, 0, 4.72, corridorLength - 0.35, corridor);

  // 門廊青瓦飛簷頂（下層寬簷）與上層額匾屋脊，完整重現「求職廟・近景」正面雙層飛簷與黑底金字「求職廟」大匾
  const corridorRoof = buildRoofTier(5.8, corridorLength + 0.9, {
    rise: 1.38,
    overhang: 0.72,
    curl: 0.52,
    theme: 'slate',
    ridge: false,
  });
  corridorRoof.position.set(0, 5.12, corridorLength / 2);
  corridorRoof.traverse((o) => { o.userData.noMerge = true; });
  corridor.add(corridorRoof);

  const porchUpperRoof = buildRoofTier(3.9, 2.5, {
    rise: 1.18,
    overhang: 0.58,
    curl: 0.48,
    theme: 'slate',
    ridge: true,
  });
  porchUpperRoof.position.set(0, 6.42, corridorLength - 0.55);
  porchUpperRoof.traverse((o) => { o.userData.noMerge = true; });
  corridor.add(porchUpperRoof);

  // 「求職廟」黑底金字額匾（懸掛於正面上下兩層青瓦飛簷之間）
  const plaqueTex = plaqueTexture(b.name);
  const plaqueFrame = add(new THREE.BoxGeometry(2.48, 0.92, 0.14), gold, 0, 5.75, corridorLength + 0.12, corridor);
  plaqueFrame.rotation.x = 0.08;
  const plaque = add(
    new THREE.PlaneGeometry(2.36, 0.82),
    new THREE.MeshStandardMaterial({
      map: plaqueTex,
      emissive: new THREE.Color(0xffd275),
      emissiveMap: plaqueTex,
      emissiveIntensity: 0.32,
      roughness: 0.45,
    }),
    0,
    5.75,
    corridorLength + 0.2,
    corridor,
  );
  plaque.rotation.x = 0.08;
  plaque.userData.noMerge = true;

  // 簷下四盞暖光宮燈（呼應近景圖中朱紅木柱間懸掛的橘紅暖光燈籠）
  for (const [lx, lz] of [
    [-1.66, corridorLength - 0.25],
    [1.66, corridorLength - 0.25],
    [-2.55, corridorLength - 0.45],
    [2.55, corridorLength - 0.45],
  ]) {
    add(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 5), mats.darkWood, lx, 4.65, lz, corridor);
    const lantern = add(new THREE.SphereGeometry(0.28, 12, 10), mats.lanternBody, lx, 4.18, lz, corridor);
    lantern.scale.set(0.82, 1.32, 0.82);
    lantern.userData.noMerge = true;
    add(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 8), gold, lx, 4.54, lz, corridor);
    add(new THREE.CylinderGeometry(0.12, 0.12, 0.07, 8), gold, lx, 3.82, lz, corridor);
    add(new THREE.CylinderGeometry(0.025, 0.04, 0.24, 6), mats.redLacquer, lx, 3.66, lz, corridor);
  }

  // 求職廟前石獅子與矮石燈：直接採用茶藝街門口的石獅精細建模（getLionGeometry），立於白石台階兩側，並融入「事實是隻石獅子」彩蛋與伸懶腰動態
  const lionGeo = getLionGeometry();
  for (const side of [-1, 1]) {
    const lion = new THREE.Group();
    lion.position.set(side * 2.55, 0, corridorLength + 0.85);
    lion.rotation.y = side * 0.22;
    lion.userData.noMerge = true;
    corridor.add(lion);
    const pose = new THREE.Group();
    pose.userData.noMerge = true;
    lion.add(pose);
    const lionMesh = add(lionGeo, mats.sculpt, 0, 0, 0, pose);
    lionMesh.userData.noMerge = true;
    lionMesh.userData.pick = { kind: 'egg', egg: 'stoneLion', maxDist: 28 };
    lion.userData.tick = (t: number) => {
      const phase = (t + (side < 0 ? 0 : 10.5)) % 27;
      let stretch = 0;
      if (phase >= 17 && phase < 19.2) stretch = (phase - 17) / 2.2;
      else if (phase >= 19.2 && phase < 20.7) stretch = 1;
      else if (phase >= 20.7 && phase < 23.1) stretch = 1 - (phase - 20.7) / 2.4;
      stretch = THREE.MathUtils.smoothstep(stretch, 0, 1);
      pose.position.y = stretch * 0.22;
      pose.rotation.x = stretch * 0.11;
      pose.scale.y = 1 + stretch * 0.04;
    };
    const [wx, wz] = worldPoint(side * 2.55, floorRadius * 0.83 + corridorLength + 0.85);
    colliders.push({ id: `${b.id}-stone-lion-${side}`, type: 'cylinder', x: wx, z: wz, radius: 0.65 });

    // 台階兩側暖光矮石燈籠（呼應近景圖中石獅與台階旁的庭園矮石燈）
    const lx = side * 1.98;
    const lz = corridorLength + 1.32;
    add(new THREE.CylinderGeometry(0.18, 0.22, 0.22, 6), carvedStone, lx, 0.11, lz, corridor);
    add(new THREE.CylinderGeometry(0.1, 0.12, 0.34, 6), whiteStone, lx, 0.38, lz, corridor);
    const lampCore = add(new THREE.BoxGeometry(0.22, 0.24, 0.22), warmGlow, lx, 0.66, lz, corridor);
    lampCore.userData.noMerge = true;
    add(new THREE.ConeGeometry(0.28, 0.2, 6), carvedStone, lx, 0.88, lz, corridor);
  }

  // 開放式亭體兩側與門廊側面的朱紅美人靠／低欄杆，保留正門動線暢通
  for (const side of [-1, 1]) {
    const rail = add(new THREE.BoxGeometry(0.14, 0.68, floorRadius * 0.74), mats.redLacquer, side * (floorRadius * 0.56), 1.12, -floorRadius * 0.16);
    rail.rotation.y = side * Math.PI / 4;
    add(new THREE.BoxGeometry(0.12, 0.62, corridorLength * 0.62), mats.redLacquer, side * 2.15, 0.78, corridorLength * 0.48, corridor);
    add(new THREE.BoxGeometry(0.16, 0.08, corridorLength * 0.64), gold, side * 2.15, 1.12, corridorLength * 0.48, corridor);
  }

  mergeByMaterial(pavilion);
  root.updateMatrixWorld(true);
  return { group: root, colliders };
}

