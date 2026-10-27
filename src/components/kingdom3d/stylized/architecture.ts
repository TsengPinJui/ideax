import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  pavingTexture,
  plazaTexture,
  grassTexture,
  rockTexture,
  stoneBlockTexture,
  woodFloorTexture,
  facadeTexture,
  roofTileTexture,
  ceilingTexture,
  signboardTexture,
  bannerTexture,
  glowTexture,
  scrollPaintingTexture,
  balustradeTexture,
  seeded,
} from './textures';

/* =====================================================================
 * 共用材質（整個世界共用一份；晝夜切換時調整燈籠、窗紙的亮度）
 * ===================================================================== */

export interface StyleMaterials {
  lanternBody: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  lampPaper: THREE.MeshStandardMaterial;
  glow: THREE.PointsMaterial;
  facades: THREE.MeshStandardMaterial[];
  stone: THREE.MeshStandardMaterial;
  stoneLight: THREE.MeshStandardMaterial;
  paving: THREE.MeshStandardMaterial;
  plaza: THREE.MeshStandardMaterial;
  grass: THREE.MeshStandardMaterial;
  rock: THREE.MeshStandardMaterial;
  woodFloor: THREE.MeshStandardMaterial;
  ceiling: THREE.MeshStandardMaterial;
  darkWood: THREE.MeshStandardMaterial;
  redLacquer: THREE.MeshStandardMaterial;
  roofUnder: THREE.MeshStandardMaterial;
  roofs: Record<'slate' | 'teal' | 'gold' | 'red', THREE.MeshStandardMaterial>;
  ridges: Record<'slate' | 'teal' | 'gold' | 'red', THREE.MeshStandardMaterial>;
  trunk: THREE.MeshStandardMaterial;
  foliage: THREE.MeshStandardMaterial;
  orb: THREE.MeshStandardMaterial;
  rug: THREE.MeshStandardMaterial;
  plaster: THREE.MeshStandardMaterial;
  balustrade: THREE.MeshStandardMaterial;
}

let styleMats: StyleMaterials | null = null;

export function getStyleMaterials(): StyleMaterials {
  if (styleMats) return styleMats;
  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.02, ...p });
  const facades = [0, 1, 2].map(
    (v) =>
      std({
        map: facadeTexture(false, v),
        emissiveMap: facadeTexture(true, v),
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.3,
        roughness: 0.8,
      })
  );
  const roofs = {
    slate: std({ map: roofTileTexture('slate'), roughness: 0.6, metalness: 0.1, side: THREE.FrontSide }),
    teal: std({ map: roofTileTexture('teal'), roughness: 0.5, metalness: 0.12 }),
    gold: std({ map: roofTileTexture('gold'), roughness: 0.45, metalness: 0.35 }),
    red: std({ map: roofTileTexture('red'), roughness: 0.55, metalness: 0.08 }),
  };
  const ridges = {
    slate: std({ color: 0x2a323d, roughness: 0.55 }),
    teal: std({ color: 0x23463f, roughness: 0.5 }),
    gold: std({ color: 0x9a7322, roughness: 0.4, metalness: 0.4 }),
    red: std({ color: 0x5e2019, roughness: 0.5 }),
  };
  styleMats = {
    lanternBody: std({ color: 0xc62828, emissive: 0xff4a1a, emissiveIntensity: 0.9, roughness: 0.6 }),
    gold: std({ color: 0xc9a227, roughness: 0.38, metalness: 0.65 }),
    lampPaper: std({ color: 0xffe3a8, emissive: 0xffb04a, emissiveIntensity: 0.8, roughness: 0.7 }),
    glow: new THREE.PointsMaterial({
      map: glowTexture(),
      color: 0xffa240,
      size: 2.4,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
    facades,
    stone: std({ map: stoneBlockTexture(), color: 0xd9d0c3 }),
    stoneLight: std({ map: stoneBlockTexture(), color: 0xf2ebe0 }),
    paving: std({ map: pavingTexture(), roughness: 0.92 }),
    plaza: std({ map: plazaTexture(), roughness: 0.9 }),
    grass: std({ map: grassTexture(), roughness: 1 }),
    rock: std({ map: rockTexture(), roughness: 0.95 }),
    woodFloor: std({ map: woodFloorTexture(), roughness: 0.6 }),
    ceiling: std({ map: ceilingTexture(), roughness: 0.7, side: THREE.DoubleSide }),
    darkWood: std({ color: 0x4a2716, roughness: 0.7 }),
    redLacquer: std({ color: 0x9c2a22, roughness: 0.45, metalness: 0.05 }),
    roofUnder: std({ color: 0x5a3220, roughness: 0.8, side: THREE.BackSide }),
    roofs,
    ridges,
    trunk: std({ color: 0x5b3a26, roughness: 0.95 }),
    foliage: std({ color: 0xffffff, roughness: 0.85 }),
    orb: std({ color: 0xffe08a, emissive: 0xffc04a, emissiveIntensity: 1.6, roughness: 0.25 }),
    rug: std({ color: 0x8e2420, roughness: 0.9 }),
    plaster: std({ color: 0xf1eadc, roughness: 0.95 }),
    balustrade: std({ map: balustradeTexture(), roughness: 0.9 }),
  };
  return styleMats;
}

export function disposeStyleMaterials() {
  if (!styleMats) return;
  const all: THREE.Material[] = [];
  for (const v of Object.values(styleMats)) {
    if (Array.isArray(v)) all.push(...v);
    else if ((v as THREE.Material).isMaterial) all.push(v as THREE.Material);
    else all.push(...Object.values(v as Record<string, THREE.Material>));
  }
  all.forEach((m) => m.dispose());
  styleMats = null;
}

/* =====================================================================
 * 幾何小工具
 * ===================================================================== */

const tmpM = new THREE.Matrix4();

/** 立方體的 UV 依實際尺寸重複（貼圖一格＝bay 公尺），牆面才不會被拉伸 */
export function scaledBox(sx: number, sy: number, sz: number, bayX = 3, bayY = sy, bayZ = 3) {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const n = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(n.getX(i));
    const ny = Math.abs(n.getY(i));
    let u = uv.getX(i);
    let v = uv.getY(i);
    if (ny > 0.5) {
      u *= sx / bayX;
      v *= sz / bayZ;
    } else if (nx > 0.5) {
      u *= sz / bayZ;
      v *= sy / bayY;
    } else {
      u *= sx / bayX;
      v *= sy / bayY;
    }
    uv.setXY(i, u, v);
  }
  return g;
}

/** 把同一個群組裡、材質相同的靜態網格合併，大幅減少繪製次數 */
export function mergeByMaterial(group: THREE.Group, shadows = true) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map<THREE.Material, { geos: THREE.BufferGeometry[]; meshes: THREE.Mesh[] }>();
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || (m as any).isInstancedMesh || Array.isArray(m.material) || m.userData.noMerge) return;
    let geo = m.geometry;
    if (!geo.index) return;
    if (!geo.attributes.uv || !geo.attributes.normal) return;
    const g = geo.clone();
    for (const name of Object.keys(g.attributes)) {
      if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    }
    g.applyMatrix4(tmpM.multiplyMatrices(inv, m.matrixWorld));
    const b = buckets.get(m.material as THREE.Material) || { geos: [], meshes: [] };
    b.geos.push(g);
    b.meshes.push(m);
    buckets.set(m.material as THREE.Material, b);
  });
  for (const [mat, b] of buckets) {
    if (b.meshes.length < 2) {
      b.geos.forEach((g) => g.dispose());
      continue;
    }
    const merged = mergeGeometries(b.geos, false);
    b.geos.forEach((g) => g.dispose());
    if (!merged) continue;
    for (const m of b.meshes) {
      m.parent?.remove(m);
      m.geometry.dispose();
    }
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = shadows;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
}

function addMesh(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, ry = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}

/* =====================================================================
 * 中式屋頂：凹曲面坡頂＋翹起的屋角＋正脊、垂脊、脊獸
 * ===================================================================== */

export interface RoofInfo {
  geo: THREE.BufferGeometry;
  halfW: number;
  halfD: number;
  ridgeHalf: number;
  alongX: boolean;
  rise: number;
  sample: (x: number, z: number) => number;
}

export function chineseRoofGeometry(w: number, d: number, rise: number, overhang: number, curl: number, seg = 22): RoofInfo {
  const halfW = w / 2 + overhang;
  const halfD = d / 2 + overhang;
  const alongX = halfW >= halfD;
  const A = alongX ? halfW : halfD;
  const B = alongX ? halfD : halfW;
  const ridgeHalf = Math.max(0, A - B);
  const sm = (v: number) => {
    const t = Math.min(1, Math.max(0, (v - 0.5) / 0.5));
    return t * t;
  };
  const params = (x: number, z: number) => {
    const a = Math.abs(alongX ? x : z);
    const b = Math.abs(alongX ? z : x);
    const ta = A - ridgeHalf > 1e-4 ? Math.max(0, a - ridgeHalf) / (A - ridgeHalf) : 0;
    const tb = b / B;
    return { ta, tb, t: Math.max(ta, tb) };
  };
  const sample = (x: number, z: number) => {
    const { ta, tb, t } = params(x, z);
    const corner = sm(ta) * sm(tb);
    return rise * Math.pow(1 - t, 1.7) + curl * corner * 1.4 + curl * 0.22 * Math.pow(t, 6);
  };
  const nx = seg;
  const nz = Math.max(8, Math.round((seg * halfD) / halfW));
  const pos: number[] = [];
  const uvs: number[] = [];
  const slope = Math.hypot(B, rise);
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = -halfW + (2 * halfW * i) / nx;
      const z = -halfD + (2 * halfD * j) / nz;
      const y = sample(x, z);
      pos.push(x, y, z);
      const { ta, tb, t } = params(x, z);
      const across = tb >= ta ? (alongX ? x : z) : alongX ? z : x;
      uvs.push(across / 1.5, (t * slope) / 1.5);
    }
  }
  const idx: number[] = [];
  const row = nx + 1;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * row + i;
      const b = (j + 1) * row + i;
      const c = j * row + i + 1;
      const dd = (j + 1) * row + i + 1;
      idx.push(a, b, c, b, dd, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return { geo, halfW, halfD, ridgeHalf, alongX, rise, sample };
}

export type RoofTheme = 'slate' | 'teal' | 'gold' | 'red';

/** 一層屋頂（含垂脊、正脊、脊獸、寶頂），回傳群組（原點在屋簷底） */
export function buildRoofTier(
  w: number,
  d: number,
  opts: { rise: number; overhang: number; curl: number; theme: RoofTheme; ridge?: boolean; finial?: boolean }
): THREE.Group {
  const mats = getStyleMaterials();
  const g = new THREE.Group();
  const info = chineseRoofGeometry(w, d, opts.rise, opts.overhang, opts.curl);
  const top = new THREE.Mesh(info.geo, mats.roofs[opts.theme]);
  top.castShadow = true;
  g.add(top);
  const under = new THREE.Mesh(info.geo, mats.roofUnder);
  under.position.y = -0.12;
  g.add(under);

  const ridgeMat = mats.ridges[opts.theme];
  const { halfW, halfD, ridgeHalf, alongX, sample } = info;
  const A = alongX ? halfW : halfD;
  const B = alongX ? halfD : halfW;
  // 垂脊：從正脊兩端沿對角線到翹起的屋角
  for (const sa of [-1, 1]) {
    for (const sb of [-1, 1]) {
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 8; k++) {
        const s = k / 8;
        const a = sa * (ridgeHalf + s * (A - ridgeHalf));
        const b = sb * s * B;
        const x = alongX ? a : b;
        const z = alongX ? b : a;
        pts.push(new THREE.Vector3(x, sample(x, z) + 0.1, z));
      }
      const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.13, 5, false);
      g.add(new THREE.Mesh(tube, ridgeMat));
    }
  }
  if (opts.ridge !== false) {
    const peak = sample(0, 0);
    if (ridgeHalf > 0.3) {
      const len = ridgeHalf * 2 + 0.4;
      const beam = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len : 0.32, 0.42, alongX ? 0.32 : len), ridgeMat);
      beam.position.y = peak + 0.18;
      g.add(beam);
      // 脊獸（兩端上翹的鴟吻）
      for (const s of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.11, 6, 10, Math.PI * 0.75), mats.gold);
        const off = s * (ridgeHalf + 0.15);
        horn.position.set(alongX ? off : 0, peak + 0.55, alongX ? 0 : off);
        horn.rotation.set(0, alongX ? 0 : Math.PI / 2, s > 0 ? 0.15 : Math.PI - 0.15);
        g.add(horn);
      }
    }
    if (opts.finial || ridgeHalf <= 0.3) {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), mats.gold);
      ball.position.y = peak + 0.32;
      g.add(ball);
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.1, 8), mats.gold);
      spire.position.y = peak + 1.0;
      g.add(spire);
    }
  }
  return g;
}

/* =====================================================================
 * 批次：燈籠、石燈柱、樹（InstancedMesh＋一個光暈點雲，繪製次數很少）
 * ===================================================================== */

export class LanternBatch {
  private hanging: THREE.Matrix4[] = [];
  private posts: THREE.Matrix4[] = [];
  private glows: number[] = [];

  /** 紅色吊燈籠（y 為燈籠中心） */
  addHanging(x: number, y: number, z: number, scale = 1) {
    this.hanging.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(scale, scale, scale)));
    this.glows.push(x, y, z);
  }

  /** 石燈柱（x,z 為柱底，y 為地面高度） */
  addPost(x: number, y: number, z: number, height = 2.4, rotY = 0) {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
    this.posts.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, height / 2.4, 1)));
    this.glows.push(x, y + height + 0.05, z);
  }

  build(): THREE.Group {
    const mats = getStyleMaterials();
    const g = new THREE.Group();
    g.name = 'lanterns';
    const inst = (geo: THREE.BufferGeometry, mat: THREE.Material, list: THREE.Matrix4[], extra?: THREE.Matrix4) => {
      if (!list.length) return;
      const im = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((m, i) => im.setMatrixAt(i, extra ? new THREE.Matrix4().multiplyMatrices(m, extra) : m));
      im.instanceMatrix.needsUpdate = true;
      im.frustumCulled = false;
      g.add(im);
    };
    if (this.hanging.length) {
      const body = new THREE.SphereGeometry(0.34, 10, 8);
      body.scale(1, 1.18, 1);
      const caps = mergeGeometries([
        new THREE.CylinderGeometry(0.2, 0.22, 0.12, 10).translate(0, 0.42, 0),
        new THREE.CylinderGeometry(0.22, 0.2, 0.12, 10).translate(0, -0.42, 0),
        new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4).translate(0, 0.72, 0),
        new THREE.CylinderGeometry(0.05, 0.02, 0.4, 5).translate(0, -0.66, 0),
      ])!;
      inst(body, mats.lanternBody, this.hanging);
      inst(caps, mats.gold, this.hanging);
    }
    if (this.posts.length) {
      const stoneGeo = mergeGeometries([
        new THREE.BoxGeometry(0.6, 0.25, 0.6).translate(0, 0.125, 0),
        new THREE.BoxGeometry(0.3, 1.7, 0.3).translate(0, 1.1, 0),
        new THREE.BoxGeometry(0.62, 0.12, 0.62).translate(0, 1.98, 0),
      ])!;
      const lampGeo = new THREE.BoxGeometry(0.46, 0.5, 0.46).translate(0, 2.3, 0);
      const capGeo = mergeGeometries([
        new THREE.ConeGeometry(0.55, 0.38, 4).rotateY(Math.PI / 4).translate(0, 2.74, 0),
        new THREE.SphereGeometry(0.08, 6, 5).translate(0, 2.98, 0),
      ])!;
      inst(stoneGeo, mats.stone, this.posts);
      inst(lampGeo, mats.lampPaper, this.posts);
      inst(capGeo, mats.darkWood, this.posts);
    }
    if (this.glows.length) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(this.glows, 3));
      const pts = new THREE.Points(geo, mats.glow);
      pts.frustumCulled = false;
      pts.renderOrder = 5;
      g.add(pts);
    }
    return g;
  }
}

export type TreeKind = 'cherry' | 'green' | 'pine' | 'maple' | 'bush';

const TREE_COLORS: Record<TreeKind, number[]> = {
  cherry: [0xf6b8cf, 0xf9c9d8, 0xf2a6c2, 0xfde2ea, 0xf4b0c8],
  green: [0x5d8f3c, 0x6c9a44, 0x4f7f36, 0x78a54c],
  pine: [0x2f5e3a, 0x37683f, 0x2b5434],
  maple: [0xd9653b, 0xe07a3c, 0xc9502f],
  bush: [0xf3a2c0, 0xfbe3ea, 0x7fae5a, 0xf7c7d6],
};

function canopyGeometry(seed: number) {
  const rand = seeded(seed);
  const parts: THREE.BufferGeometry[] = [];
  const blobs = [
    [0, 0, 0, 1],
    [0.7, -0.15, 0.2, 0.75],
    [-0.65, -0.1, -0.15, 0.78],
    [0.1, 0.45, -0.55, 0.7],
    [-0.15, 0.3, 0.6, 0.72],
  ];
  for (const [x, y, z, r] of blobs) {
    // 用球面法線（不用面法線），樹冠看起來才是圓潤的一團，而不是多角形
    const g = new THREE.IcosahedronGeometry(r, 1);
    const p = g.attributes.position as THREE.BufferAttribute;
    const nrm = g.attributes.normal as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.set(p.getX(i), p.getY(i), p.getZ(i));
      const n = v.clone().normalize();
      nrm.setXYZ(i, n.x, n.y, n.z);
      const k = 1 + Math.sin(v.x * 5.1 + seed) * 0.06 + Math.sin(v.z * 4.3 + v.y * 3.7) * 0.06;
      p.setXYZ(i, v.x * k, v.y * k * 0.85, v.z * k);
    }
    g.translate(x, y, z);
    parts.push(g);
  }
  void rand;
  return mergeGeometries(parts)!;
}

function pineGeometry() {
  return mergeGeometries([
    new THREE.ConeGeometry(1.1, 1.4, 9).translate(0, -0.5, 0),
    new THREE.ConeGeometry(0.85, 1.2, 9).translate(0, 0.2, 0),
    new THREE.ConeGeometry(0.55, 1.0, 9).translate(0, 0.85, 0),
  ])!;
}

export class TreeBatch {
  private items: { kind: TreeKind; x: number; y: number; z: number; s: number; rot: number; color: number }[] = [];
  private rand = seeded(97);

  add(kind: TreeKind, x: number, y: number, z: number, s = 1) {
    const pal = TREE_COLORS[kind];
    this.items.push({ kind, x, y, z, s, rot: this.rand() * Math.PI * 2, color: pal[Math.floor(this.rand() * pal.length)] });
  }

  get count() {
    return this.items.length;
  }

  build(): THREE.Group {
    const mats = getStyleMaterials();
    const g = new THREE.Group();
    g.name = 'trees';
    const trunks = this.items.filter((t) => t.kind !== 'bush');
    if (trunks.length) {
      const trunkGeo = new THREE.CylinderGeometry(0.13, 0.24, 1, 6).translate(0, 0.5, 0);
      const im = new THREE.InstancedMesh(trunkGeo, mats.trunk, trunks.length);
      trunks.forEach((t, i) => {
        const h = (t.kind === 'pine' ? 2.6 : 2.2) * t.s;
        im.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(t.x, t.y, t.z), new THREE.Quaternion(), new THREE.Vector3(t.s, h, t.s)));
      });
      im.castShadow = true;
      g.add(im);
    }
    const blob = canopyGeometry(3);
    const pine = pineGeometry();
    const byGeo: [THREE.BufferGeometry, typeof this.items][] = [
      [blob, this.items.filter((t) => t.kind !== 'pine')],
      [pine, this.items.filter((t) => t.kind === 'pine')],
    ];
    for (const [geo, list] of byGeo) {
      if (!list.length) continue;
      const im = new THREE.InstancedMesh(geo, mats.foliage, list.length);
      const c = new THREE.Color();
      list.forEach((t, i) => {
        const bush = t.kind === 'bush';
        const s = t.s * (bush ? 0.55 : t.kind === 'pine' ? 1.35 : 1.3);
        const y = t.y + (bush ? 0.35 : t.kind === 'pine' ? 3.0 * t.s : 2.9 * t.s);
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.rot);
        im.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(t.x, y, t.z), q, new THREE.Vector3(s * 1.1, s, s * 1.1)));
        im.setColorAt(i, c.setHex(t.color));
      });
      im.castShadow = true;
      g.add(im);
    }
    return g;
  }
}

/* =====================================================================
 * 可走入的建築（外觀換成中式樓閣；牆的位置與厚度不變，碰撞完全一致）
 * ===================================================================== */

export interface StyledBuildingInput {
  id: string;
  name: string;
  previewBadge?: string;
  position: THREE.Vector3;
  facingYaw: number;
  width: number;
  depth: number;
  height: number;
  doorWidth?: number;
  tiers?: number;
  colorHex: number;
}

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function createStyledBuilding(b: StyledBuildingInput): THREE.Group {
  const mats = getStyleMaterials();
  const root = new THREE.Group();
  root.position.copy(b.position);
  root.rotation.y = b.facingYaw;
  root.name = `building_${b.id}`;

  const w = b.width;
  const d = b.depth;
  const h = b.height;
  const doorW = b.doorWidth || 3.8;
  const doorH = Math.min(3.6, h - 0.8);
  const thick = 0.45;
  const tiers = b.tiers || 1;
  const hv = hashStr(b.id);
  const facade = mats.facades[hv % mats.facades.length];
  const themes: RoofTheme[] = ['slate', 'teal', 'slate', 'red'];
  const theme: RoofTheme = tiers >= 4 ? 'gold' : themes[hv % themes.length];
  const plinthH = 0.45;
  const wallH = h - plinthH;
  const lanterns = new LanternBatch();

  const body = new THREE.Group();
  root.add(body);

  // 室內木地板、紅地毯
  const floor = new THREE.Mesh(scaledBox(w - 0.2, 0.06, d - 0.2, 2.5, 0.06, 2.5), mats.woodFloor);
  floor.position.y = 0.03;
  body.add(floor);
  const rug = new THREE.Mesh(new THREE.BoxGeometry(doorW * 0.55, 0.02, d * 0.62), mats.rug);
  rug.position.set(0, 0.07, d * 0.12);
  body.add(rug);
  // 門口石階
  addMesh(body, scaledBox(doorW + 0.8, 0.12, 1.5, 1.5, 0.12, 1.5), mats.stoneLight, 0, 0.06, d / 2 + 0.2);

  // 牆：下段石台基＋上段木構立面（與原本白模牆的位置、厚度相同）
  const wall = (lenX: number, lenZ: number, x: number, z: number) => {
    addMesh(body, scaledBox(lenX + (lenX > lenZ ? 0.1 : 0.25), plinthH, lenZ + (lenZ > lenX ? 0.1 : 0.25), 2, plinthH, 2), mats.stone, x, plinthH / 2, z);
    addMesh(body, scaledBox(lenX, wallH, lenZ, 3.2, wallH, 3.2), facade, x, plinthH + wallH / 2, z);
  };
  wall(w, thick, 0, -d / 2);
  wall(thick, d, -w / 2, 0);
  wall(thick, d, w / 2, 0);
  const wingW = Math.max(0.8, (w - doorW) / 2);
  wall(wingW, thick, -w / 2 + wingW / 2, d / 2);
  wall(wingW, thick, w / 2 - wingW / 2, d / 2);
  // 門楣
  const lintelH = Math.max(0.6, h - doorH);
  addMesh(body, new THREE.BoxGeometry(doorW + 0.1, lintelH, thick), mats.redLacquer, 0, doorH + lintelH / 2, d / 2);

  // 紅柱：四角、門兩側、沿牆每約 3.2 公尺
  const colGeo = new THREE.CylinderGeometry(0.24, 0.27, h - 0.1, 10);
  const colAt = (x: number, z: number) => addMesh(body, colGeo, mats.redLacquer, x, (h - 0.1) / 2 + 0.05, z);
  for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) colAt(x, z);
  colAt(-doorW / 2 - 0.12, d / 2 + 0.05);
  colAt(doorW / 2 + 0.12, d / 2 + 0.05);
  const bays = (len: number) => Math.max(0, Math.floor(len / 3.2) - 1);
  for (let i = 1; i <= bays(w); i++) {
    const x = -w / 2 + (w * i) / (bays(w) + 1);
    colAt(x, -d / 2 - 0.02);
  }
  for (let i = 1; i <= bays(d); i++) {
    const z = -d / 2 + (d * i) / (bays(d) + 1);
    colAt(-w / 2 - 0.02, z);
    colAt(w / 2 + 0.02, z);
  }
  // 門框金邊
  addMesh(body, new THREE.BoxGeometry(doorW + 0.7, 0.18, thick + 0.25), mats.gold, 0, doorH, d / 2);

  // 屋簷下的額枋
  addMesh(body, scaledBox(w + 0.5, 0.42, d + 0.5, 3, 0.42, 3), mats.redLacquer, 0, h - 0.1, 0);

  // 天花（藻井）
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.4, d - 0.4), mats.ceiling);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = h - 0.3;
  const cu = ceil.geometry.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < cu.count; i++) cu.setXY(i, (cu.getX(i) * (w - 0.4)) / 3, (cu.getY(i) * (d - 0.4)) / 3);
  body.add(ceil);

  // 屋頂（多重簷）
  let y = h + 0.1;
  for (let t = 0; t < tiers; t++) {
    const sc = 1 - t * 0.2;
    const tw = w * sc;
    const td = d * sc;
    const last = t === tiers - 1;
    if (t > 0) {
      const bodyH = 2.1;
      addMesh(body, scaledBox(tw * 0.86, bodyH, td * 0.86, 3.2, bodyH * 1.6, 3.2), facade, 0, y + bodyH / 2 - 0.15, 0);
      for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        addMesh(body, new THREE.CylinderGeometry(0.2, 0.2, bodyH, 8), mats.redLacquer, (cx * tw * 0.86) / 2, y + bodyH / 2 - 0.15, (cz * td * 0.86) / 2);
      }
      addMesh(body, scaledBox(tw * 0.9, 0.34, td * 0.9, 3, 0.34, 3), mats.redLacquer, 0, y + bodyH - 0.2, 0);
      y += bodyH - 0.1;
    }
    const rise = last ? Math.min(3.4, 0.3 * Math.min(tw, td) + 0.6) : 1.25;
    const tier = buildRoofTier(tw, td, {
      rise,
      overhang: last ? 1.6 : 1.25,
      curl: last ? 0.85 : 0.6,
      theme,
      ridge: last,
      finial: last && Math.abs(tw - td) < 1.5,
    });
    tier.position.y = y;
    body.add(tier);
    // 屋角吊燈籠（第一層）
    if (t === 0) {
      const ox = tw / 2 + 1.1;
      const oz = td / 2 + 1.1;
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lanterns.addHanging(sx * ox, y - 0.15, sz * oz, 0.9);
    }
    y += last ? 0 : rise * 0.4;
  }

  // 門口一對大燈籠、兩側旗幟、牌匾
  lanterns.addHanging(-doorW / 2 - 0.85, Math.min(doorH - 0.15, 3.1), d / 2 + 0.75, 1.15);
  lanterns.addHanging(doorW / 2 + 0.85, Math.min(doorH - 0.15, 3.1), d / 2 + 0.75, 1.15);
  const bannerText = (b.name || '').replace(/[（(].*$/, '').replace(/[^\p{Script=Han}A-Za-z]/gu, '').slice(0, 4) || '創點';
  const bannerMat = new THREE.MeshStandardMaterial({ map: bannerTexture(bannerText), roughness: 0.9, side: THREE.DoubleSide });
  const bannerH = Math.min(2.6, wallH - 0.6);
  for (const sx of [-1, 1]) {
    const x = sx * (doorW / 2 + Math.min(1.25, wingW * 0.55));
    if (Math.abs(x) + 0.5 > w / 2) continue;
    const ban = new THREE.Mesh(new THREE.PlaneGeometry(0.85, bannerH), bannerMat);
    ban.position.set(x, plinthH + 0.35 + bannerH / 2, d / 2 + thick / 2 + 0.03);
    ban.userData.noMerge = true;
    root.add(ban);
  }
  const signMat = new THREE.MeshStandardMaterial({ map: signboardTexture(b.name, b.previewBadge), roughness: 0.55, metalness: 0.1 });
  const signH = Math.min(1.25, Math.max(0.8, h - doorH - 0.05));
  const signW = Math.min(doorW + 1.6, signH * 3);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(signW, signH, 0.14), [mats.darkWood, mats.darkWood, mats.darkWood, mats.darkWood, signMat, mats.darkWood]);
  sign.position.set(0, doorH + signH / 2 + 0.06, d / 2 + thick / 2 + 0.1);
  sign.userData.noMerge = true;
  root.add(sign);

  // 室內：掛畫、內牆牌匾、中央發光寶珠台
  const inner = new THREE.Group();
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 2; k++) {
      const pm = new THREE.MeshStandardMaterial({ map: scrollPaintingTexture(hv % 7 + k + (sx > 0 ? 3 : 0)), roughness: 0.9 });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.2), pm);
      p.position.set(sx * (w / 2 - thick / 2 - 0.03), 2.2, -d / 4 + k * (d / 2.4));
      p.rotation.y = -sx * Math.PI / 2;
      p.userData.noMerge = true;
      inner.add(p);
    }
  }
  const boardMat = new THREE.MeshStandardMaterial({ map: signboardTexture(b.name, b.previewBadge), roughness: 0.6 });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(5.2, w - 2), Math.min(5.2, w - 2) / 3), boardMat);
  board.position.set(0, Math.min(3.1, h - 1.4), -d / 2 + thick / 2 + 0.04);
  board.userData.noMerge = true;
  inner.add(board);
  const deskZ = -d * 0.25;
  addMesh(inner, new THREE.CylinderGeometry(0.72, 0.85, 0.5, 16), mats.stoneLight, 0, 0.25, deskZ);
  addMesh(inner, new THREE.CylinderGeometry(0.55, 0.7, 0.75, 12), mats.redLacquer, 0, 0.85, deskZ);
  addMesh(inner, new THREE.TorusGeometry(0.62, 0.06, 6, 20).rotateX(Math.PI / 2), mats.gold, 0, 1.24, deskZ);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 16), mats.orb);
  orb.position.set(0, 1.7, deskZ);
  orb.userData.noMerge = true;
  inner.add(orb);
  lanterns.addHanging(0, 1.7, deskZ, 0.01); // 寶珠光暈
  for (const lz of [d * 0.18, -d * 0.4]) {
    for (const sx of [-1, 1]) lanterns.addHanging(sx * w * 0.24, h - 1.25, lz, 0.85);
  }
  root.add(inner);
  // 室內細節只在玩家靠近時才畫（遠處看不到，省繪製次數）
  root.userData.interior = inner;

  mergeByMaterial(body);
  mergeByMaterial(inner, false);
  root.add(lanterns.build());
  return root;
}

/* =====================================================================
 * 石拱橋：石板橋面、望柱欄杆、橋頭石燈、橋墩
 * ===================================================================== */

export function createStyledBridge(bridge: { id: string; x1: number; z1: number; x2: number; z2: number; halfWidth: number; bridgeMaxHeight: number }): THREE.Group {
  const mats = getStyleMaterials();
  const root = new THREE.Group();
  root.name = `bridge_${bridge.id}`;
  const dx = bridge.x2 - bridge.x1;
  const dz = bridge.z2 - bridge.z1;
  const span = Math.hypot(dx, dz);
  root.position.set((bridge.x1 + bridge.x2) / 2, 0, (bridge.z1 + bridge.z2) / 2);
  root.rotation.y = Math.atan2(dx, dz);
  const w = bridge.halfWidth * 2;
  const maxH = bridge.bridgeMaxHeight;
  const segs = 18;
  const stepZ = span / segs;
  const parts = new THREE.Group();
  const lanterns = new LanternBatch();
  const yAt = (t: number) => Math.sin(t * Math.PI) * maxH;

  for (let i = 0; i < segs; i++) {
    const t1 = i / segs;
    const t2 = (i + 1) / segs;
    const tm = (t1 + t2) / 2;
    const lz = (tm - 0.5) * span;
    const pitch = Math.atan2(yAt(t1) - yAt(t2), stepZ);
    const deck = new THREE.Mesh(scaledBox(w, 0.45, stepZ + 0.1, 2.4, 0.45, 2.4), mats.stoneLight);
    deck.position.set(0, yAt(tm) - 0.17, lz);
    deck.rotation.x = pitch;
    parts.add(deck);
    // 欄板＋扶手
    for (const rx of [-w / 2 + 0.18, w / 2 - 0.18]) {
      const panel = new THREE.Mesh(scaledBox(0.2, 0.58, stepZ + 0.04, stepZ, 0.58, stepZ), mats.balustrade);
      panel.position.set(rx, yAt(tm) + 0.34, lz);
      panel.rotation.x = pitch;
      parts.add(panel);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, stepZ + 0.06), mats.stoneLight);
      rail.position.set(rx, yAt(tm) + 0.7, lz);
      rail.rotation.x = pitch;
      parts.add(rail);
    }
    // 望柱
    for (const rx of [-w / 2 + 0.18, w / 2 - 0.18]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.0, 0.3), mats.stoneLight);
      post.position.set(rx, yAt(t1) + 0.5, (t1 - 0.5) * span);
      parts.add(post);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 5), mats.stoneLight);
      cap.position.set(rx, yAt(t1) + 1.08, (t1 - 0.5) * span);
      parts.add(cap);
    }
  }
  // 拱下的橋墩與拱圈
  for (const t of [0.22, 0.78]) {
    const pier = new THREE.Mesh(scaledBox(w - 0.4, yAt(t) + 3, 1.6, 2, 2, 2), mats.stone);
    pier.position.set(0, (yAt(t) - 3) / 2 - 0.3, (t - 0.5) * span);
    parts.add(pier);
  }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(span * 0.2, 0.35, 6, 16, Math.PI), mats.stone);
  arch.rotation.y = Math.PI / 2;
  arch.position.set(0, -0.6, 0);
  arch.scale.set(1, 0.55, 1);
  parts.add(arch);
  // 橋頭與橋中的石燈
  for (const t of [0.04, 0.5, 0.96]) {
    for (const rx of [-w / 2 - 0.15, w / 2 + 0.15]) {
      lanterns.addPost(rx, yAt(t), (t - 0.5) * span, t === 0.5 ? 1.6 : 2.4);
    }
  }
  root.add(parts);
  mergeByMaterial(parts);
  root.add(lanterns.build());
  return root;
}

/* =====================================================================
 * 島嶼：石板路面、廣場圓紋、草地外環、山崖、石欄杆、樹與燈柱
 * ===================================================================== */

function ellipseRing(rxIn: number, rzIn: number, rxOut: number, rzOut: number, seg = 96, uvScale = 3.5, jitter = 0, seed = 1) {
  const rand = seeded(seed);
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const j = 1 + (i === seg ? 0 : (rand() - 0.5) * jitter);
    const pts = [
      [Math.cos(a) * rxIn, Math.sin(a) * rzIn],
      [Math.cos(a) * rxOut * j, Math.sin(a) * rzOut * j],
    ];
    for (const [x, z] of pts) {
      pos.push(x, 0, z);
      uv.push(x / uvScale, z / uvScale);
    }
  }
  for (let i = 0; i < seg; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function ellipseDisc(rx: number, rz: number, uvScale = 3.5, seg = 72) {
  const g = new THREE.CircleGeometry(1, seg);
  g.rotateX(-Math.PI / 2);
  g.scale(rx, 1, rz);
  const p = g.attributes.position as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / uvScale, p.getZ(i) / uvScale);
  return g;
}

/** 山崖側面（向下張開、帶凹凸的岩壁） */
export function cliffGeometry(rxTop: number, rzTop: number, rxBot: number, rzBot: number, height: number, seed = 1, seg = 64, rows = 6) {
  const rand = seeded(seed);
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const noise: number[] = [];
  for (let i = 0; i < seg; i++) noise.push((rand() - 0.5) * 0.18);
  for (let r = 0; r <= rows; r++) {
    const t = r / rows;
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const n = 1 + noise[i % seg] * (0.4 + t) + (r > 0 && r < rows ? (rand() - 0.5) * 0.06 : 0);
      const rx = (rxTop + (rxBot - rxTop) * t) * n;
      const rz = (rzTop + (rzBot - rzTop) * t) * n;
      pos.push(Math.cos(a) * rx, -t * height, Math.sin(a) * rz);
      uv.push((a * (rxTop + rzTop)) / 2 / 6, (t * height) / 6);
    }
  }
  const row = seg + 1;
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < seg; i++) {
      const a = r * row + i;
      const b = a + row;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function distToSegment(px: number, pz: number, x1: number, z1: number, x2: number, z2: number) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / l2));
  return Math.hypot(px - (x1 + t * dx), pz - (z1 + t * dz));
}

export interface StyledIslandInput {
  id: string;
  center: [number, number];
  walkRx: number;
  walkRz: number;
  plazaRadius: number;
  bridges: { x1: number; z1: number; x2: number; z2: number; halfWidth: number }[];
  /** 不能種樹、不能放裝飾的區域（建築位置） */
  avoid: { x: number; z: number; r: number }[];
  landmark?: { x: number; z: number; radius: number; height: number };
  seed: number;
}

export function createStyledIsland(inp: StyledIslandInput, trees: TreeBatch): THREE.Group {
  const mats = getStyleMaterials();
  const g = new THREE.Group();
  const [cx, cz] = inp.center;
  g.position.set(cx, 0, cz);
  g.name = `island_${inp.id}`;
  const rand = seeded(inp.seed);
  const rx = inp.walkRx;
  const rz = inp.walkRz;
  const rim = 7;
  const parts = new THREE.Group();

  addMesh(parts, ellipseDisc(rx + 0.4, rz + 0.4), mats.paving, 0, 0, 0);
  addMesh(parts, ellipseRing(rx + 0.35, rz + 0.35, rx + rim, rz + rim, 96, 3.5, 0.08, inp.seed), mats.grass, 0, -0.04, 0);
  addMesh(parts, cliffGeometry(rx + rim, rz + rim, rx + rim + 3.5, rz + rim + 3.5, 9, inp.seed + 3), mats.rock, 0, -0.04, 0);
  // 廣場
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(inp.plazaRadius, 64).rotateX(-Math.PI / 2), mats.plaza);
  plaza.position.y = 0.012;
  parts.add(plaza);
  addMesh(parts, new THREE.RingGeometry(inp.plazaRadius - 0.35, inp.plazaRadius + 0.15, 64).rotateX(-Math.PI / 2), mats.stoneLight, 0, 0.02, 0);

  const lanterns = new LanternBatch();
  const blockedByBridge = (wx: number, wz: number, pad: number) =>
    inp.bridges.some((b) => distToSegment(wx, wz, b.x1, b.z1, b.x2, b.z2) < b.halfWidth + pad);
  const blockedByBuilding = (wx: number, wz: number, pad: number) => inp.avoid.some((a) => Math.hypot(wx - a.x, wz - a.z) < a.r + pad);

  // 沿島緣的石欄杆（在可行走範圍外側一點點；橋頭留出開口）
  const railR = 0.25;
  const perim = Math.PI * (3 * (rx + rz) - Math.sqrt((3 * rx + rz) * (rx + 3 * rz)));
  const n = Math.round(perim / 2.4);
  const posts: ({ x: number; z: number } | null)[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * (rx + railR);
    const z = Math.sin(a) * (rz + railR);
    posts.push(blockedByBridge(x + cx, z + cz, 1.2) ? null : { x, z });
  }
  const postGeo = new THREE.BoxGeometry(0.28, 0.9, 0.28);
  const capGeo = new THREE.SphereGeometry(0.15, 6, 4);
  posts.forEach((p, i) => {
    if (!p) return;
    addMesh(parts, postGeo, mats.stoneLight, p.x, 0.45, p.z);
    addMesh(parts, capGeo, mats.stoneLight, p.x, 0.98, p.z);
    const q = posts[(i + 1) % n];
    if (q) {
      const len = Math.hypot(q.x - p.x, q.z - p.z);
      const ang = -Math.atan2(q.z - p.z, q.x - p.x);
      addMesh(parts, scaledBox(len, 0.55, 0.16, len, 0.55, len), mats.balustrade, (p.x + q.x) / 2, 0.3, (p.z + q.z) / 2, ang);
      addMesh(parts, new THREE.BoxGeometry(len, 0.1, 0.22), mats.stoneLight, (p.x + q.x) / 2, 0.66, (p.z + q.z) / 2, ang);
    }
    if (i % 6 === 0) lanterns.addPost(p.x + Math.cos((i / n) * Math.PI * 2) * 0.7, 0, p.z + Math.sin((i / n) * Math.PI * 2) * 0.7, 2.4);
  });

  // 草地外環：櫻花、綠樹、松、花叢
  const kinds: TreeKind[] = ['cherry', 'cherry', 'green', 'pine', 'cherry', 'green', 'maple'];
  const treeN = Math.round(perim / 5.5);
  for (let i = 0; i < treeN; i++) {
    const a = (i / treeN) * Math.PI * 2 + rand() * 0.08;
    const off = 3.0 + rand() * 3.2;
    const x = Math.cos(a) * (rx + off);
    const z = Math.sin(a) * (rz + off);
    if (blockedByBridge(x + cx, z + cz, 3.5)) continue;
    trees.add(kinds[Math.floor(rand() * kinds.length)], x + cx, -0.04, z + cz, 0.85 + rand() * 0.6);
    if (rand() > 0.45) {
      const bx = Math.cos(a + 0.05) * (rx + 1.3);
      const bz = Math.sin(a + 0.05) * (rz + 1.3);
      if (!blockedByBridge(bx + cx, bz + cz, 2)) trees.add('bush', bx + cx, -0.04, bz + cz, 0.8 + rand() * 0.5);
    }
  }
  // 島內：建築之間的空地點綴花叢（放在島緣內側、遠離建築與橋）
  for (let i = 0; i < 10; i++) {
    const a = rand() * Math.PI * 2;
    const k = 0.8 + rand() * 0.12;
    const x = Math.cos(a) * rx * k;
    const z = Math.sin(a) * rz * k;
    if (Math.hypot(x, z) < inp.plazaRadius + 2) continue;
    if (blockedByBridge(x + cx, z + cz, 3) || blockedByBuilding(x + cx, z + cz, 2.5)) continue;
    trees.add('bush', x + cx, 0, z + cz, 0.6 + rand() * 0.4);
  }

  // 地標：小燈泡紀念碑（蓮花石座＋紅柱＋發光燈泡）
  if (inp.landmark) {
    const lm = inp.landmark;
    const lg = new THREE.Group();
    lg.position.set(lm.x - cx, 0, lm.z - cz);
    addMesh(lg, new THREE.CylinderGeometry(lm.radius + 0.15, lm.radius + 0.4, 0.5, 8), mats.stone, 0, 0.25, 0);
    addMesh(lg, new THREE.CylinderGeometry(lm.radius - 0.35, lm.radius - 0.05, 0.9, 8), mats.stoneLight, 0, 0.95, 0);
    addMesh(lg, new THREE.TorusGeometry(lm.radius - 0.1, 0.12, 6, 24).rotateX(Math.PI / 2), mats.gold, 0, 1.42, 0);
    const pillarH = Math.max(2, lm.height - 3.3);
    addMesh(lg, new THREE.CylinderGeometry(0.55, 0.75, pillarH, 12), mats.redLacquer, 0, 1.4 + pillarH / 2, 0);
    for (const yy of [1.6, 1.4 + pillarH - 0.2]) addMesh(lg, new THREE.TorusGeometry(0.7, 0.1, 6, 18).rotateX(Math.PI / 2), mats.gold, 0, yy, 0);
    addMesh(lg, new THREE.CylinderGeometry(0.75, 0.55, 0.6, 12), mats.gold, 0, lm.height - 1.7, 0);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(1.5, 24, 18), mats.orb);
    bulb.position.y = lm.height;
    bulb.userData.noMerge = true;
    lg.add(bulb);
    lanterns.addHanging(lm.x - cx, lm.height, lm.z - cz, 0.01);
    lanterns.addHanging(lm.x - cx, lm.height + 0.4, lm.z - cz, 0.01);
    parts.add(lg);
  }

  g.add(parts);
  mergeByMaterial(parts);
  g.add(lanterns.build());
  return g;
}
