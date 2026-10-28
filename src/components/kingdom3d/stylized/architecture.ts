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
  templeFacadeTexture,
  arcadeGlassTexture,
  graniteWallTexture,
  latticeGlassTexture,
  roofTileTexture,
  ceilingTexture,
  signboardTexture,
  bannerTexture,
  coupletTexture,
  glowTexture,
  scrollPaintingTexture,
  balustradeTexture,
  bumpOf,
  eaveTileTexture,
  doorTexture,
  grassTuftTexture,
  foamTexture,
  seeded,
} from './textures';
import { getStoryLayout, levelColliders, levelY } from './multiStory';
import { makePickProxy } from '../picking';
import { DOOR_COUPLETS } from '../couplets';
import { bridgeRailRange } from '../regionConfigs';
import { drawJobScrollTexture, JOB_SCROLLS } from './jobScroll';
import { createSosoNpc } from './npcs';
import { hallOf, createHallStairEntrance, isFloorsHall } from './exhibitHall';
import { createHallLobby, lobbyPit } from './hallLobby';
import type { BuildingInteractable, Collider } from '../types';
import { drawPainBoardTexture, deskPaperTexture, MAIN_BOARD, SIDE_BOARD, PainBoardLayout } from './painBoard';

/* =====================================================================
 * 共用材質（整個世界共用一份；晝夜切換時調整燈籠、窗紙的亮度）
 * ===================================================================== */

export interface StyleMaterials {
  lanternBody: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  lampPaper: THREE.MeshStandardMaterial;
  glow: THREE.PointsMaterial;
  facades: THREE.MeshStandardMaterial[];
  /** 廟宇牆面（朱紅牆、竹節窗、石裙堵） */
  templeFacade: THREE.MeshStandardMaterial;
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
  bulbGlass: THREE.MeshPhysicalMaterial;
  bulbRing: THREE.MeshStandardMaterial;
  filament: THREE.MeshBasicMaterial;
  screwMetal: THREE.MeshStandardMaterial;
  pedestalDark: THREE.MeshStandardMaterial;
  rug: THREE.MeshStandardMaterial;
  plaster: THREE.MeshStandardMaterial;
  balustrade: THREE.MeshStandardMaterial;
  eave: THREE.MeshStandardMaterial;
  door: THREE.MeshStandardMaterial;
  bracket: THREE.MeshStandardMaterial;
  pot: THREE.MeshStandardMaterial;
  sculpt: THREE.MeshStandardMaterial;
  potPlant: THREE.MeshStandardMaterial;
  grassTuft: THREE.MeshStandardMaterial;
  foam: THREE.MeshBasicMaterial;
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
  const templeFacade = std({ map: templeFacadeTexture(false), emissiveMap: templeFacadeTexture(true), emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.3, roughness: 0.7 });
  const roofs = {
    slate: std({ map: roofTileTexture('slate'), bumpMap: bumpOf('roof_slate', roofTileTexture('slate')), bumpScale: 4, roughness: 0.6, metalness: 0.1, side: THREE.FrontSide }),
    teal: std({ map: roofTileTexture('teal'), bumpMap: bumpOf('roof_teal', roofTileTexture('teal')), bumpScale: 4, roughness: 0.5, metalness: 0.12 }),
    gold: std({ map: roofTileTexture('gold'), bumpMap: bumpOf('roof_gold', roofTileTexture('gold')), bumpScale: 4, roughness: 0.45, metalness: 0.35 }),
    red: std({ map: roofTileTexture('red'), bumpMap: bumpOf('roof_red', roofTileTexture('red')), bumpScale: 4, roughness: 0.55, metalness: 0.08 }),
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
    templeFacade,
    stone: std({ map: stoneBlockTexture(), bumpMap: bumpOf('stone', stoneBlockTexture()), bumpScale: 3, color: 0xd9d0c3 }),
    stoneLight: std({ map: stoneBlockTexture(), bumpMap: bumpOf('stone', stoneBlockTexture()), bumpScale: 2, color: 0xf2ebe0 }),
    paving: std({ map: pavingTexture(), bumpMap: bumpOf('paving', pavingTexture()), bumpScale: 3.5, roughness: 0.92 }),
    plaza: std({ map: plazaTexture(), bumpMap: bumpOf('plaza', plazaTexture()), bumpScale: 3, roughness: 0.9 }),
    grass: std({ map: grassTexture(), roughness: 1 }),
    rock: std({ map: rockTexture(), bumpMap: bumpOf('rock', rockTexture()), bumpScale: 6, roughness: 0.95 }),
    woodFloor: std({ map: woodFloorTexture(), bumpMap: bumpOf('woodFloor', woodFloorTexture()), bumpScale: 1.5, roughness: 0.6 }),
    ceiling: std({ map: ceilingTexture(), roughness: 0.7, side: THREE.DoubleSide }),
    darkWood: std({ color: 0x4a2716, roughness: 0.7 }),
    redLacquer: std({ color: 0x9c2a22, roughness: 0.45, metalness: 0.05 }),
    roofUnder: std({ color: 0x5a3220, roughness: 0.8, side: THREE.BackSide }),
    roofs,
    ridges,
    trunk: std({ color: 0x5b3a26, roughness: 0.95 }),
    foliage: std({ color: 0xffffff, roughness: 0.85 }),
    orb: std({ color: 0xffe08a, emissive: 0xffc04a, emissiveIntensity: 1.6, roughness: 0.25 }),
    // 主廣場大燈泡（照 /island 的經典燈泡雕像）
    bulbGlass: new THREE.MeshPhysicalMaterial({ color: 0xffd23f, emissive: 0xff9d00, emissiveIntensity: 0.65, roughness: 0.14, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true, opacity: 0.84 }),
    bulbRing: std({ color: 0xffe066, emissive: 0xffae00, emissiveIntensity: 0.85, roughness: 0.25, metalness: 0.5 }),
    filament: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    screwMetal: std({ color: 0x363a40, roughness: 0.32, metalness: 0.72 }),
    pedestalDark: std({ color: 0x2a2440, roughness: 0.55, metalness: 0.15 }),
    rug: std({ color: 0x8e2420, roughness: 0.9 }),
    plaster: std({ color: 0xf1eadc, roughness: 0.95 }),
    balustrade: std({ map: balustradeTexture(), bumpMap: bumpOf('balustrade', balustradeTexture()), bumpScale: 2.5, roughness: 0.9 }),
    eave: std({ map: eaveTileTexture(), roughness: 0.6 }),
    door: std({ map: doorTexture(), roughness: 0.5, side: THREE.DoubleSide }),
    bracket: std({ color: 0x2c6a62, roughness: 0.6 }),
    pot: std({ color: 0x2f5675, roughness: 0.35, metalness: 0.05 }),
    sculpt: std({ color: 0xcfc7b8, roughness: 0.75 }),
    potPlant: std({ color: 0x5f9440, roughness: 0.9 }),
    grassTuft: std({ map: grassTuftTexture(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 1 }),
    foam: new THREE.MeshBasicMaterial({ map: foamTexture(), transparent: true, depthWrite: false, opacity: 0.8 }),
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
    const keepColor = Boolean((m.material as THREE.MeshStandardMaterial).vertexColors);
    for (const name of Object.keys(g.attributes)) {
      if (!['position', 'normal', 'uv', ...(keepColor ? ['color'] : [])].includes(name)) g.deleteAttribute(name);
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
  opts: { rise: number; overhang: number; curl: number; theme: RoofTheme; ridge?: boolean; finial?: boolean; lite?: boolean; horns?: boolean }
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
  for (const sa of opts.lite ? [] : [-1, 1]) {
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
  // 屋簷邊的一排瓦當（沿著翹起的簷口繞一圈）
  if (!opts.lite) {
    const pts: THREE.Vector3[] = [];
    const per = 14;
    const corners: [number, number][] = [[-halfW, -halfD], [halfW, -halfD], [halfW, halfD], [-halfW, halfD]];
    for (let c = 0; c < 4; c++) {
      const [x0, z0] = corners[c];
      const [x1, z1] = corners[(c + 1) % 4];
      for (let k = 0; k < per; k++) {
        const t = k / per;
        const x = x0 + (x1 - x0) * t;
        const z = z0 + (z1 - z0) * t;
        pts.push(new THREE.Vector3(x * 1.005, sample(x * 0.999, z * 0.999) - 0.04, z * 1.005));
      }
    }
    const perim = 4 * (halfW + halfD);
    const eaveGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, 'centripetal'), 160, 0.15, 6, true);
    const euv = eaveGeo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < euv.count; i++) euv.setX(i, euv.getX(i) * (perim / 0.5));
    g.add(new THREE.Mesh(eaveGeo, mats.eave));
  }
  if (opts.ridge !== false) {
    const peak = sample(0, 0);
    if (ridgeHalf > 0.3) {
      const len = ridgeHalf * 2 + 0.4;
      const beam = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len : 0.32, 0.42, alongX ? 0.32 : len), ridgeMat);
      beam.position.y = peak + 0.18;
      g.add(beam);
      // 脊獸（兩端上翹的鴟吻）；小屋頂改成正脊兩端微翹的脊頭
      for (const s of opts.horns === true ? [-1, 1] : []) {
        const horn = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.11, 6, 10, Math.PI * 0.75), mats.gold);
        const off = s * (ridgeHalf + 0.15);
        horn.position.set(alongX ? off : 0, peak + 0.55, alongX ? 0 : off);
        horn.rotation.set(0, alongX ? 0 : Math.PI / 2, s > 0 ? 0.15 : Math.PI - 0.15);
        g.add(horn);
      }
      if (opts.horns !== true) {
        for (const s of [-1, 1]) {
          // 正脊兩端微微上翹的脊頭（取代鉤狀鴟吻）
          const big = Math.min(1.6, 0.7 + ridgeHalf * 0.12);
          const cap = new THREE.Mesh(new THREE.BoxGeometry(alongX ? 0.5 * big : 0.38, 0.32 * big, alongX ? 0.38 : 0.5 * big), ridgeMat);
          cap.position.set(alongX ? s * (ridgeHalf + 0.3) : 0, peak + 0.28 + 0.06 * big, alongX ? 0 : s * (ridgeHalf + 0.3));
          cap.rotation.set(alongX ? 0 : s * 0.4, 0, alongX ? -s * 0.4 : 0);
          g.add(cap);
        }
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
      // 彩蛋用：記下每一棵的樹種（點到桃花樹：忽逢桃花林…）
      im.userData.treeKinds = list.map((t) => t.kind);
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
  floors?: number;
  basements?: number;
  exterior?: 'exhibition' | 'arcade' | 'tulou' | 'huizhou' | 'board' | 'temple' | 'bearShop' | 'libraryTower' | 'stoneBox' | 'lattice';
  /** 招牌名稱下方的小字；沒有就用 previewBadge */
  signSub?: string;
  npc?: 'soso';
  colorHex: number;
}

/** 展覽館、電玩城的外觀材質（照 /island） */
let extMats: {
  cream: THREE.MeshStandardMaterial;
  granite: THREE.MeshStandardMaterial;
  whiteStone: THREE.MeshStandardMaterial;
  warmGlass: THREE.MeshStandardMaterial;
  lightWood: THREE.MeshStandardMaterial;
  arcade: THREE.MeshStandardMaterial;
  arcadeTrim: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  neonRed: THREE.MeshStandardMaterial;
  neonBlue: THREE.MeshStandardMaterial;
  padWhite: THREE.MeshStandardMaterial;
  flags: THREE.MeshStandardMaterial[];
} | null = null;
function exteriorMats() {
  if (extMats) return extMats;
  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.02, ...p });
  extMats = {
    cream: std({ color: 0xf3ead6, roughness: 0.9 }),
    // 展覽館（照參考圖重建）：白色花崗岩
    granite: std({ map: graniteWallTexture(), roughness: 0.55, emissive: new THREE.Color(0x2a2620), emissiveIntensity: 0.3 }),
    // 徵才島（照設計圖）：人才獵頭的白色石材、翰林院的暖光玻璃與淺色木
    whiteStone: std({ color: 0xf1eee8, roughness: 0.6, emissive: new THREE.Color(0x2c2a26), emissiveIntensity: 0.35 }),
    warmGlass: std({ map: latticeGlassTexture(false), emissiveMap: latticeGlassTexture(true), emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.85, roughness: 0.25, metalness: 0.1 }),
    lightWood: std({ color: 0xc9925a, roughness: 0.7 }),
    // 電玩城（未來流線版）：深藍玻璃帷幕、銀色金屬柱
    arcade: std({ map: arcadeGlassTexture(false), emissiveMap: arcadeGlassTexture(true), emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.9, roughness: 0.18, metalness: 0.35 }),
    arcadeTrim: std({ color: 0xdfe4ec, roughness: 0.22, metalness: 0.85 }),
    glass: std({ color: 0x7cc0ee, emissive: 0x2a6a9a, emissiveIntensity: 0.35, roughness: 0.12, metalness: 0.3, transparent: true, opacity: 0.62, side: THREE.DoubleSide }),
    neonRed: std({ color: 0xff3b5c, emissive: 0xff2a4a, emissiveIntensity: 1.4, roughness: 0.3 }),
    neonBlue: std({ color: 0x3bb8ff, emissive: 0x2a9cff, emissiveIntensity: 1.4, roughness: 0.3 }),
    padWhite: std({ color: 0xf4f1ea, roughness: 0.35, metalness: 0.05 }),
    flags: [0xc62828, 0x2f6bb3, 0xf3a6c4, 0xe2b030].map((c) => std({ color: c, roughness: 0.85, side: THREE.DoubleSide })),
  };
  return extMats;
}

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

let lionGeoCache: THREE.BufferGeometry | null = null;
/** 石獅：須彌座、蹲坐的身體（前腿直立、後腿蹲）、大頭與一圈圈捲毛鬃、眼眉鼻吻、頸上鈴帶、腳邊繡球、捲尾 */
function getLionGeometry() {
  if (lionGeoCache) return lionGeoCache;
  const P = 0.57; // 座台頂面
  const S = (r: number, ws = 12, hs = 10) => new THREE.SphereGeometry(r, ws, hs);
  const parts: THREE.BufferGeometry[] = [
    // 須彌座：底座、束腰、台面
    new THREE.BoxGeometry(1.05, 0.25, 1.25).translate(0, 0.125, 0),
    new THREE.BoxGeometry(0.86, 0.2, 1.06).translate(0, 0.35, 0),
    new THREE.BoxGeometry(1.0, 0.12, 1.2).translate(0, 0.51, 0),
    // 後腿（蹲坐的大腿）與後掌
    S(0.3).scale(0.72, 0.85, 1.2).translate(-0.25, P + 0.26, -0.18),
    S(0.3).scale(0.72, 0.85, 1.2).translate(0.25, P + 0.26, -0.18),
    S(0.11).scale(1, 0.6, 1.4).translate(-0.27, P + 0.05, 0.12),
    S(0.11).scale(1, 0.6, 1.4).translate(0.27, P + 0.05, 0.12),
    // 胸腹（挺胸）
    S(0.34, 14, 12).scale(0.95, 1.4, 0.9).rotateX(-0.25).translate(0, P + 0.55, 0.0),
    // 前腿直立、前掌
    new THREE.CylinderGeometry(0.085, 0.1, 0.6, 10).translate(-0.16, P + 0.3, 0.26),
    new THREE.CylinderGeometry(0.085, 0.1, 0.6, 10).translate(0.16, P + 0.3, 0.26),
    S(0.12).scale(1, 0.62, 1.35).translate(-0.16, P + 0.05, 0.34),
    S(0.12).scale(1, 0.62, 1.35).translate(0.16, P + 0.05, 0.34),
    // 頸上鈴帶與鈴鐺
    new THREE.TorusGeometry(0.22, 0.035, 8, 20).rotateX(Math.PI / 2 - 0.5).translate(0, P + 0.86, 0.1),
    S(0.065, 10, 8).translate(0, P + 0.74, 0.32),
    // 大頭
    S(0.33, 16, 14).scale(1.05, 0.95, 0.95).translate(0, P + 1.1, 0.12),
    // 吻部、鼻、下巴
    new THREE.BoxGeometry(0.28, 0.17, 0.2).translate(0, P + 1.0, 0.4),
    S(0.075, 10, 8).scale(1.3, 0.9, 1).translate(0, P + 1.08, 0.5),
    new THREE.BoxGeometry(0.2, 0.07, 0.14).translate(0, P + 0.88, 0.38),
    // 凸眼與濃眉
    S(0.07, 10, 8).translate(-0.12, P + 1.18, 0.39),
    S(0.07, 10, 8).translate(0.12, P + 1.18, 0.39),
    new THREE.BoxGeometry(0.15, 0.05, 0.07).rotateZ(0.25).translate(-0.12, P + 1.26, 0.4),
    new THREE.BoxGeometry(0.15, 0.05, 0.07).rotateZ(-0.25).translate(0.12, P + 1.26, 0.4),
    // 耳朵
    S(0.08, 8, 6).scale(1, 1.2, 0.7).translate(-0.3, P + 1.24, 0.1),
    S(0.08, 8, 6).scale(1, 1.2, 0.7).translate(0.3, P + 1.24, 0.1),
    // 腳邊繡球（前掌按著）＋綵帶
    S(0.16, 14, 10).translate(0.36, P + 0.16, 0.36),
    new THREE.TorusGeometry(0.16, 0.025, 6, 16).rotateY(0.6).translate(0.36, P + 0.16, 0.36),
    // 捲尾（沿背後往上捲）
    S(0.11, 10, 8).translate(0, P + 0.3, -0.46),
    S(0.1, 10, 8).translate(0, P + 0.5, -0.5),
    S(0.09, 10, 8).translate(0, P + 0.68, -0.46),
    S(0.08, 10, 8).translate(0, P + 0.8, -0.38),
  ];
  // 捲毛鬃：頭後兩圈小螺髻，背上一列
  for (let i = 0; i <= 10; i++) {
    const a = -2.2 + (i / 10) * 4.4;
    parts.push(S(0.095, 8, 6).translate(Math.sin(a) * 0.34, P + 1.1 + Math.cos(a) * 0.34, -0.02));
    if (i % 2 === 0) parts.push(S(0.085, 8, 6).translate(Math.sin(a) * 0.24, P + 1.1 + Math.cos(a) * 0.24, -0.16));
  }
  for (let i = 0; i < 4; i++) parts.push(S(0.09, 8, 6).translate(0, P + 0.85 - i * 0.14, -0.2 - i * 0.04));
  lionGeoCache = mergeGeometries(parts)!;
  return lionGeoCache;
}

let bushGeoCache: THREE.BufferGeometry | null = null;
function getRoundBushGeometry() {
  if (bushGeoCache) return bushGeoCache;
  const parts: THREE.BufferGeometry[] = [];
  for (const [x, y, z, r] of [[0, 0, 0, 0.42], [0.22, -0.08, 0.1, 0.3], [-0.2, -0.05, -0.12, 0.32], [0.05, 0.22, -0.05, 0.3]]) {
    const g = new THREE.IcosahedronGeometry(r, 1);
    const p = g.attributes.position as THREE.BufferAttribute;
    const n = g.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).normalize();
      n.setXYZ(i, v.x, v.y, v.z);
    }
    parts.push(g.translate(x, y, z));
  }
  bushGeoCache = mergeGeometries(parts.map((g) => {
    const idx = Array.from({ length: g.attributes.position.count }, (_, i) => i);
    g.setIndex(idx);
    return g;
  }))!;
  return bushGeoCache;
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
  const ext = b.exterior;
  const modern = ext === 'stoneBox' || ext === 'lattice';
  const em = ext === 'exhibition' || ext === 'arcade' || modern ? exteriorMats() : null;
  // 徽派（討論島，照 /island）：白牆黛瓦、深色木柱、兩側馬頭牆
  const huizhou = ext === 'huizhou';
  // 廟宇（求職廟）：朱紅牆、金黃琉璃瓦，前面另外加三川殿門廊、龍柱、剪黏雙龍搶珠
  const temple = ext === 'temple';
  const facade = ext === 'stoneBox' ? exteriorMats().whiteStone : ext === 'lattice' ? exteriorMats().warmGlass : ext === 'exhibition' ? exteriorMats().granite : huizhou ? exteriorMats().cream : ext === 'arcade' ? em!.arcade : temple ? mats.templeFacade : mats.facades[hv % mats.facades.length];
  // 柱子：展覽館與徽派深色木柱、電玩城深色金屬，其餘紅柱
  const pillarMat = ext === 'stoneBox' ? exteriorMats().whiteStone : ext === 'lattice' ? exteriorMats().lightWood : ext === 'exhibition' ? exteriorMats().granite : huizhou ? mats.darkWood : ext === 'arcade' ? em!.arcadeTrim : mats.redLacquer;
  const themes: RoofTheme[] = ['slate', 'teal', 'slate', 'red'];
  const theme: RoofTheme = b.exterior === 'huizhou' ? 'slate' : temple || tiers >= 4 ? 'gold' : themes[hv % themes.length];
  const plinthH = 0.45;
  const wallH = h - plinthH;
  const lanterns = new LanternBatch();
  const lay = getStoryLayout(b);

  const body = new THREE.Group();
  root.add(body);

  // 室內木地板、紅地毯（有地下室時，地面層樓板另外蓋、留樓梯井；展覽館、電玩城中央留大樓梯井）
  const floorsHall = isFloorsHall(b.id);
  if (floorsHall) {
    const pit = lobbyPit(b);
    const xmin = -w / 2 + 0.1;
    const xmax = w / 2 - 0.1;
    const zmin = -d / 2 + 0.1;
    const zmax = d / 2 - 0.1;
    const pieces: [number, number, number, number][] = [
      [xmin, pit.x0, zmin, zmax],
      [pit.x1, xmax, zmin, zmax],
      [pit.x0, pit.x1, zmin, pit.zBot],
      [pit.x0, pit.x1, pit.zTop, zmax],
    ];
    for (const [x0, x1, z0, z1] of pieces) {
      if (x1 - x0 < 0.05 || z1 - z0 < 0.05) continue;
      addMesh(body, scaledBox(x1 - x0, 0.06, z1 - z0, 2.5, 0.06, 2.5), mats.woodFloor, (x0 + x1) / 2, 0.03, (z0 + z1) / 2);
    }
    const rugLen = d / 2 - pit.zTop;
    addMesh(body, new THREE.BoxGeometry(doorW * 0.55, 0.02, rugLen), mats.rug, 0, 0.07, pit.zTop + rugLen / 2);
  } else {
    if (!lay || lay.basements < 1) {
      const floor = new THREE.Mesh(scaledBox(w - 0.2, 0.06, d - 0.2, 2.5, 0.06, 2.5), mats.woodFloor);
      floor.position.y = 0.03;
      body.add(floor);
    }
    const rug = new THREE.Mesh(new THREE.BoxGeometry(doorW * 0.55, 0.02, d * 0.62), mats.rug);
    rug.position.set(0, 0.07, d * 0.12);
    body.add(rug);
  }
  // 門口石階
  addMesh(body, scaledBox(doorW + 0.8, 0.12, 1.5, 1.5, 0.12, 1.5), mats.stoneLight, 0, 0.06, d / 2 + 0.2);

  // 多樓層：頂樓那一層的牆另外蓋（前面與兩側開窗），下面各層是實牆
  const wallTop = lay ? levelY(lay, lay.floors - 1) : h;
  // 牆：下段石台基＋上段木構立面（與原本白模牆的位置、厚度相同）
  const wall = (lenX: number, lenZ: number, x: number, z: number) => {
    addMesh(body, scaledBox(lenX + (lenX > lenZ ? 0.1 : 0.25), plinthH, lenZ + (lenZ > lenX ? 0.1 : 0.25), 2, plinthH, 2), mats.stone, x, plinthH / 2, z);
    const wallH = wallTop - plinthH;
    const wg = scaledBox(lenX, wallH, lenZ, 3.2, lay ? lay.floorH : wallH, 3.2);
    if (lay) {
      // 多樓層：讓每層的彩繪樑枋剛好落在樓板下方，而不是腳邊
      const uv = wg.attributes.uv as THREE.BufferAttribute;
      const nm = wg.attributes.normal as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) if (Math.abs(nm.getY(i)) < 0.5) uv.setY(i, uv.getY(i) + plinthH / lay.floorH);
    }
    addMesh(body, wg, facade, x, plinthH + wallH / 2, z);
  };
  wall(w, thick, 0, -d / 2);
  wall(thick, d, -w / 2, 0);
  wall(thick, d, w / 2, 0);
  const wingW = Math.max(0.8, (w - doorW) / 2);
  wall(wingW, thick, -w / 2 + wingW / 2, d / 2);
  wall(wingW, thick, w / 2 - wingW / 2, d / 2);
  // 門楣
  const lintelH = lay ? 0.6 : Math.max(0.6, h - doorH);
  addMesh(body, new THREE.BoxGeometry(doorW + 0.1, lintelH, thick), ext === 'arcade' ? em!.arcade : ext === 'exhibition' ? em!.granite : ext === 'stoneBox' ? em!.whiteStone : ext === 'lattice' ? em!.lightWood : mats.redLacquer, 0, doorH + lintelH / 2, d / 2);
  if (lay) {
    // 門楣上方到頂樓之間的正面牆
    const fh0 = doorH + lintelH;
    if (wallTop - fh0 > 0.05) {
      const fg = scaledBox(doorW + 0.1, wallTop - fh0, thick, 3.2, lay.floorH, 3.2);
      addMesh(body, fg, facade, 0, fh0 + (wallTop - fh0) / 2, d / 2);
    }
    // 頂樓：後牆實牆（掛懸賞牆），前面與兩側在柱間開窗
    const bandH = h - wallTop;
    const sillH = 1.05;
    const winH = Math.min(1.85, bandH - sillH - 0.45);
    const headH = bandH - sillH - winH;
    const band = (alongX: boolean, fixed: number, a: number, b0: number, posts: number[], solid?: [number, number]) => {
      const piece = (c: number, len: number, y0: number, hh: number, mat: THREE.Material = facade) => {
        if (len < 0.02 || hh < 0.02) return;
        const geo = alongX ? scaledBox(len, hh, thick, 3.2, hh * 2, 3.2) : scaledBox(thick, hh, len, 3.2, hh * 2, 3.2);
        addMesh(body, geo, mat, alongX ? c : fixed, y0 + hh / 2, alongX ? fixed : c);
      };
      piece((a + b0) / 2, b0 - a, wallTop, sillH);
      piece((a + b0) / 2, b0 - a, wallTop + sillH + winH, headH);
      // 每兩根柱子之間開窗；寬的開間開兩扇
      const edges = [a, ...posts.filter((p) => p > a + 0.3 && p < b0 - 0.3).sort((m, n) => m - n), b0];
      const windows: [number, number][] = [];
      for (let i = 0; i < edges.length - 1; i++) {
        const s0 = edges[i];
        const s1 = edges[i + 1];
        if (solid && s1 <= solid[1] + 0.01 && s0 >= solid[0] - 0.01) continue;
        const span = s1 - s0;
        const n = span > 4.6 ? 2 : 1;
        const ww = Math.min(2.1, span / n - 0.9);
        if (ww < 0.8) continue;
        for (let k = 0; k < n; k++) {
          const c = s0 + (span * (k + 0.5)) / n;
          windows.push([c - ww / 2, c + ww / 2]);
        }
      }
      // 窗間的牆垛
      let cur = a;
      for (const [w0, w1] of windows) {
        piece((cur + w0) / 2, w0 - cur, wallTop + sillH, winH);
        cur = w1;
      }
      piece((cur + b0) / 2, b0 - cur, wallTop + sillH, winH);
      // 窗框、橫披格柵（上方一小段）
      for (const [w0, w1] of windows) {
        const c = (w0 + w1) / 2;
        const ww = w1 - w0;
        const y0 = wallTop + sillH;
        const bar = (len: number, along: boolean, cc: number, yy: number, hh: number, mat: THREE.Material = mats.darkWood) => {
          const g = along === alongX ? (alongX ? new THREE.BoxGeometry(len, hh, thick + 0.1) : new THREE.BoxGeometry(thick + 0.1, hh, len)) : new THREE.BoxGeometry(0.1, hh, 0.1);
          addMesh(body, g, mat, alongX ? cc : fixed, yy, alongX ? fixed : cc);
        };
        const frame = (cc: number, hh: number, yy: number) => {
          const g = alongX ? new THREE.BoxGeometry(0.1, hh, thick + 0.1) : new THREE.BoxGeometry(thick + 0.1, hh, 0.1);
          addMesh(body, g, mats.darkWood, alongX ? cc : fixed, yy, alongX ? fixed : cc);
        };
        bar(ww + 0.2, alongX, c, y0, 0.12, mats.redLacquer); // 窗台
        bar(ww + 0.2, alongX, c, y0 + winH, 0.12); // 窗楣
        bar(ww, alongX, c, y0 + winH - 0.42, 0.07); // 橫披下緣
        frame(w0, winH, y0 + winH / 2);
        frame(w1, winH, y0 + winH / 2);
        const nb = Math.max(3, Math.round(ww / 0.28));
        for (let k = 1; k < nb; k++) frame(w0 + (ww * k) / nb, 0.36, y0 + winH - 0.21);
      }
    };
    const sideCols = Array.from({ length: Math.max(0, Math.floor(d / 3.2) - 1) }, (_, i) => -d / 2 + (d * (i + 1)) / (Math.max(0, Math.floor(d / 3.2) - 1) + 1));
    // 後牆：實牆
    addMesh(body, scaledBox(w, bandH, thick, 3.2, bandH * 2, 3.2), facade, 0, wallTop + bandH / 2, -d / 2);
    // 兩側：最後面一開間保留給側牆懸賞牆
    const backBay: [number, number] = [-d / 2, sideCols[0] ?? -d / 4];
    band(false, -w / 2, -d / 2, d / 2, sideCols, backBay);
    band(false, w / 2, -d / 2, d / 2, sideCols, backBay);
    // 正面：柱子在門兩側
    band(true, d / 2, -w / 2, w / 2, [-doorW / 2 - 0.12, doorW / 2 + 0.12]);
  }

  // 紅柱：四角、門兩側、沿牆每約 3.2 公尺
  const colGeo = new THREE.CylinderGeometry(0.24, 0.27, h - 0.1, 10);
  const colAt = (x: number, z: number) => addMesh(body, colGeo, pillarMat, x, (h - 0.1) / 2 + 0.05, z);
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

  // 屋簷下的額枋（展覽館：奶油色簷口；電玩城：深色平台；徽派：深色木枋）
  addMesh(body, scaledBox(w + 0.5, 0.42, d + 0.5, 3, 0.42, 3), ext === 'stoneBox' ? em!.whiteStone : ext === 'lattice' ? em!.lightWood : ext === 'exhibition' ? em!.granite : ext === 'arcade' ? em!.arcadeTrim : huizhou ? mats.darkWood : mats.redLacquer, 0, h - 0.1, 0);
  // 斗拱：額枋上方一排青綠彩繪的托架（中式樓閣才有）
  if (!em && !huizhou) {
    const blockGeo = new THREE.BoxGeometry(0.3, 0.22, 0.3);
    const armGeo = new THREE.BoxGeometry(0.18, 0.15, 0.7);
    const crossGeo = new THREE.BoxGeometry(0.7, 0.15, 0.18);
    const sides: [number, number, number, number, number][] = [
      // 起點 x, z, 方向 dx, dz, 長度
      [-w / 2, d / 2 + 0.25, 1, 0, w],
      [-w / 2, -d / 2 - 0.25, 1, 0, w],
      [-w / 2 - 0.25, -d / 2, 0, 1, d],
      [w / 2 + 0.25, -d / 2, 0, 1, d],
    ];
    for (const [sx, sz, dx, dz, len] of sides) {
      const n = Math.max(2, Math.round(len / 1.3));
      const outX = dz !== 0 ? Math.sign(sx) : 0;
      const outZ = dx !== 0 ? Math.sign(sz) : 0;
      const ry = outX !== 0 ? Math.PI / 2 : 0;
      for (let i = 0; i <= n; i++) {
        const x = sx + dx * (len * i) / n;
        const z = sz + dz * (len * i) / n;
        addMesh(body, blockGeo, mats.bracket, x, h + 0.2, z, ry);
        addMesh(body, armGeo, mats.bracket, x + outX * 0.2, h + 0.38, z + outZ * 0.2, ry);
        addMesh(body, crossGeo, mats.gold, x + outX * 0.3, h + 0.38, z + outZ * 0.3, ry);
      }
    }
  }
  // 敞開的朱漆大門（門扇貼在前牆內側，不擋路）
  for (const sx of ext === 'arcade' || ext === 'exhibition' || modern ? [] : [-1, 1]) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(doorW / 2 - 0.05, doorH - 0.1, 0.08), mats.door);
    leaf.position.set(sx * (doorW / 2 + doorW / 4), (doorH - 0.1) / 2 + 0.05, d / 2 - thick / 2 - 0.06);
    if (sx > 0) leaf.rotation.y = Math.PI;
    leaf.userData.noMerge = true;
    root.add(leaf);
  }

  // 天花（藻井）
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.4, d - 0.4), mats.ceiling);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = h - 0.3;
  const cu = ceil.geometry.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < cu.count; i++) cu.setXY(i, (cu.getX(i) * (w - 0.4)) / 3, (cu.getY(i) * (d - 0.4)) / 3);
  body.add(ceil);

  // 屋頂：展覽館＝菱格藍玻璃採光穹頂；電玩城＝平頂＋屋頂大手把；其餘＝多重簷
  if (ext === 'exhibition') {
    const rimY = h + 0.1;
    addMesh(body, scaledBox(w + 0.9, 0.36, d + 0.9, 3, 0.36, 3), em!.granite, 0, rimY + 0.18, 0);
    // 玻璃大廳屋頂、兩側樓閣、門面布置由 hallFacades.ts 另外蓋（照參考圖）
  } else if (ext === 'stoneBox') {
    // 人才獵頭：平頂白石方盒（玻璃正面、石鰭、懸挑簷板由 futureFacades.ts 另外蓋）
    addMesh(body, scaledBox(w + 0.5, 0.4, d + 0.5, 3, 0.4, 3), em!.whiteStone, 0, h + 0.3, 0);
  } else if (ext === 'lattice') {
    // 翰林院：低緩的大屋簷，出簷很深（木格柵、簷下木條由 futureFacades.ts 另外蓋）
    const roof = buildRoofTier(w + 0.6, d + 0.6, { rise: 1.7, overhang: 2.1, curl: 0.45, theme: 'slate', ridge: true });
    roof.position.y = h + 0.1;
    body.add(roof);
  } else if (ext === 'arcade') {
    const rimY = h + 0.1;
    addMesh(body, scaledBox(w + 0.8, 0.3, d + 0.8, 3, 0.3, 3), em!.arcadeTrim, 0, rimY + 0.15, 0);
    // 屋頂玻璃穹頂、霓虹手把大旗、門簾、宮燈由 hallFacades.ts 另外蓋（照參考圖）
  }
  let y = h + 0.1;
  for (let t = 0; t < (em ? 0 : tiers); t++) {
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
      // 上層迴廊欄杆
      {
        const bw = tw * 0.86 + 0.9;
        const bd = td * 0.86 + 0.9;
        const ry0 = y + 0.05;
        for (const [lx, lz, ln, alongX] of [[0, bd / 2, bw, true], [0, -bd / 2, bw, true], [bw / 2, 0, bd, false], [-bw / 2, 0, bd, false]] as [number, number, number, boolean][]) {
          addMesh(body, new THREE.BoxGeometry(alongX ? ln : 0.1, 0.1, alongX ? 0.1 : ln), mats.redLacquer, lx, ry0 + 0.55, lz);
          addMesh(body, new THREE.BoxGeometry(alongX ? ln : 0.06, 0.06, alongX ? 0.06 : ln), mats.gold, lx, ry0 + 0.25, lz);
          const np = Math.max(2, Math.round(ln / 0.9));
          for (let k = 0; k <= np; k++) {
            const off = -ln / 2 + (ln * k) / np;
            addMesh(body, new THREE.BoxGeometry(0.09, 0.6, 0.09), mats.redLacquer, alongX ? off : lx, ry0 + 0.3, alongX ? lz : off);
          }
        }
      }
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
    // 徽派馬頭牆：兩側山牆高出屋頂，三階跌落、黛瓦壓頂
    if (huizhou && t === 0) {
      const top = y + rise * 0.82;
      const steps: [number, number, number][] = [
        [d + 0.4, y - 0.2, y + 0.75],
        [d * 0.66, y + 0.75, top - 0.75],
        [d * 0.32, top - 0.75, top],
      ];
      for (const sx of [-1, 1]) {
        const gx = sx * (w / 2 + 0.05);
        for (const [len, y0, y1] of steps) {
          addMesh(body, scaledBox(0.42, y1 - y0, len, 1.5, 1.5, 1.5), facade, gx, (y0 + y1) / 2, 0);
          addMesh(body, new THREE.BoxGeometry(0.72, 0.2, len + 0.3), mats.roofs.slate, gx, y1 + 0.1, 0);
          for (const sz of [-1, 1]) addMesh(body, new THREE.BoxGeometry(0.72, 0.16, 0.5), mats.ridges.slate, gx, y1 + 0.26, sz * (len / 2 + 0.05));
        }
      }
    }
    // 屋角吊燈籠（第一層）
    if (t === 0) {
      const ox = tw / 2 + 1.1;
      const oz = td / 2 + 1.1;
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lanterns.addHanging(sx * ox, y - 0.15, sz * oz, 0.9);
    }
    y += last ? 0 : rise * 0.4;
  }

  // 門口石獅一對、轉角盆栽（另外加上碰撞，玩家不會穿過去）
  const extraColliders: Collider[] = [];
  const toWorld = (lx: number, lz: number): [number, number] => {
    const c = Math.cos(b.facingYaw);
    const sn = Math.sin(b.facingYaw);
    return [b.position.x + lx * c + lz * sn, b.position.z - lx * sn + lz * c];
  };
  const lionGeo = getLionGeometry();
  for (const sx of [-1, 1]) {
    const lx = sx * (doorW / 2 + 1.15);
    const lz = d / 2 + 1.3;
    if (Math.abs(lx) + 0.5 > w / 2 + 1.5 || em) continue;
    addMesh(body, lionGeo, mats.sculpt, lx, 0, lz, sx * 0.25);
    const [wx, wz] = toWorld(lx, lz);
    extraColliders.push({ id: `${b.id}-lion-${sx}`, type: 'cylinder', x: wx, z: wz, radius: 0.6 });
  }
  if (w / 2 - 0.55 > doorW / 2 + 2.3) {
    const potGeo = new THREE.CylinderGeometry(0.34, 0.24, 0.55, 12);
    const plantGeo = getRoundBushGeometry();
    for (const sx of [-1, 1]) {
      const lx = sx * (w / 2 - 0.55);
      const lz = d / 2 + 0.8;
      addMesh(body, potGeo, mats.pot, lx, 0.275, lz);
      addMesh(body, plantGeo, mats.potPlant, lx, 0.85, lz);
      const [wx, wz] = toWorld(lx, lz);
      extraColliders.push({ id: `${b.id}-pot-${sx}`, type: 'cylinder', x: wx, z: wz, radius: 0.45 });
    }
  }
  // 多樓層：一樓樓梯的扶手碰撞
  if (lay) extraColliders.push(...(levelColliders(b as any, lay, lay.basements) as any));
  // 搜搜（求職廟裡的人物）不放碰撞：人物之間可以穿過去
  root.userData.colliders = extraColliders;

  // 門口一對大燈籠、兩側旗幟、牌匾
  lanterns.addHanging(-doorW / 2 - 0.85, Math.min(doorH - 0.15, 3.1), d / 2 + 0.75, 1.15);
  lanterns.addHanging(doorW / 2 + 0.85, Math.min(doorH - 0.15, 3.1), d / 2 + 0.75, 1.15);
  // 門聯：與建築功能有關的七言詩句（面向大門時上聯在右）；沒有設定的才用館名旗幟
  const couplet = DOOR_COUPLETS[b.id];
  const bannerText = (b.name || '').replace(/[（(].*$/, '').replace(/[^\p{Script=Han}A-Za-z]/gu, '').slice(0, 4) || '創點';
  const bannerTex = bannerTexture(bannerText);
  const bannerMat = new THREE.MeshStandardMaterial({ map: bannerTex, emissive: 0xffffff, emissiveMap: bannerTex, emissiveIntensity: 0.52, roughness: 0.85, side: THREE.DoubleSide });
  const bannerH = Math.min(couplet ? 3.1 : 2.6, wallH - 0.6, doorH - 0.15);
  for (const sx of [-1, 1]) {
    const x = sx * (doorW / 2 + Math.min(1.25, wingW * 0.55));
    if (Math.abs(x) + 0.5 > w / 2) continue;
    const cTex = couplet ? coupletTexture(sx > 0 ? couplet[0] : couplet[1]) : null;
    const mat = cTex ? new THREE.MeshStandardMaterial({ map: cTex, emissive: 0xffffff, emissiveMap: cTex, emissiveIntensity: 0.55, roughness: 0.8 }) : bannerMat;
    const ban = new THREE.Mesh(new THREE.PlaneGeometry(couplet ? 0.62 : 0.85, bannerH), mat);
    ban.position.set(x, plinthH + 0.35 + bannerH / 2, d / 2 + thick / 2 + 0.03);
    ban.userData.noMerge = true;
    root.add(ban);
  }
  const sTex = signboardTexture(b.name, b.signSub ?? b.previewBadge);
  const signMat = new THREE.MeshStandardMaterial({ map: sTex, emissive: 0xffffff, emissiveMap: sTex, emissiveIntensity: 0.58, roughness: 0.45, metalness: 0.12 });
  const signH = Math.min(1.25, Math.max(0.8, h - doorH - 0.05));
  const signW = Math.min(doorW + 1.6, signH * 3);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(signW, signH, 0.14), [mats.darkWood, mats.darkWood, mats.darkWood, mats.darkWood, signMat, mats.darkWood]);
  sign.position.set(0, doorH + signH / 2 + 0.06, d / 2 + thick / 2 + 0.1);
  sign.userData.noMerge = true;
  // 展覽館、電玩城的匾額另外做（hallFacades）
  if (!em) root.add(sign);

  // 室內：掛畫、內牆牌匾、中央發光寶珠台
  const inner = new THREE.Group();
  // 求職廟：兩側換成搜搜的尋職畫卷（內容只畫在自己的畫面上）＋搜搜本人
  if (b.npc === 'soso') {
    // 左右牆各三卷（共 JOB_SCROLLS 卷、每卷 5 筆）：搜出來的職缺通常不少，一次多列一些
    const per = JOB_SCROLLS / 2;
    const sw = 1.95;
    const shh = sw * (860 / 600);
    const gapZ = 0.42;
    const span = per * sw + (per - 1) * gapZ;
    for (let side = 0; side < JOB_SCROLLS; side++) {
      const sx = side < per ? -1 : 1;
      const k = side % per;
      // 面向牆時由左往右讀（卷一在最左）：左牆（朝 +x）從門口往裡、右牆（朝 -x）從裡往門口
      const zz = sx < 0 ? span / 2 - sw / 2 - k * (sw + gapZ) - 0.2 : -span / 2 + sw / 2 + k * (sw + gapZ) - 0.2;
      const scroll = new THREE.Mesh(new THREE.PlaneGeometry(sw, shh), new THREE.MeshStandardMaterial({ map: drawJobScrollTexture(side, [], 'idle'), roughness: 0.85 }));
      scroll.position.set(sx * (w / 2 - thick / 2 - 0.05), 2.4, zz);
      scroll.rotation.y = -sx * (Math.PI / 2);
      scroll.userData.noMerge = true;
      scroll.userData.jobScroll = { side };
      scroll.userData.pick = { kind: 'jobScroll' };
      inner.add(scroll);
      for (const yy of [2.4 + shh / 2 + 0.06, 2.4 - shh / 2 - 0.06]) {
        const rod = addMesh(inner, new THREE.CylinderGeometry(0.06, 0.06, sw + 0.24, 10), mats.darkWood, sx * (w / 2 - thick / 2 - 0.12), yy, zz);
        rod.rotation.x = Math.PI / 2;
        for (const e of [-1, 1]) addMesh(inner, new THREE.SphereGeometry(0.085, 8, 6), mats.gold, sx * (w / 2 - thick / 2 - 0.12), yy, zz + e * (sw / 2 + 0.12));
      }
    }
    const soso = createSosoNpc();
    soso.position.set(2.6, 0.05, -d * 0.25 + 0.4);
    soso.rotation.y = -0.35;
    soso.userData.noMerge = true;
    root.add(soso);
  }
  // 徵才島的翰林院、人才獵頭：兩側牆各掛一排卷軸（一般建築兩幅）
  const manyScrolls = b.id === 'career-academy' || b.id === 'hanlin-headhunter';
  const nScroll = manyScrolls ? 5 : 2;
  for (const sx of lay || b.npc === 'soso' ? [] : [-1, 1]) {
    for (let k = 0; k < nScroll; k++) {
      const pm = new THREE.MeshStandardMaterial({ map: scrollPaintingTexture(hv % 7 + k + (sx > 0 ? 3 : 0)), roughness: 0.9 });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(manyScrolls ? 0.95 : 0.9, manyScrolls ? 2.5 : 2.2), pm);
      const zk = manyScrolls ? -d / 2 + 1.2 + (k * (d - 2.6)) / (nScroll - 1) : -d / 4 + k * (d / 2.4);
      p.position.set(sx * (w / 2 - thick / 2 - 0.03), manyScrolls ? 2.4 : 2.2, zk);
      p.rotation.y = -sx * Math.PI / 2;
      p.userData.noMerge = true;
      inner.add(p);
    }
  }
  const bTex = signboardTexture(b.name, b.signSub ?? b.previewBadge);
  const boardMat = new THREE.MeshStandardMaterial({ map: bTex, emissive: 0xffffff, emissiveMap: bTex, emissiveIntensity: 0.58, roughness: 0.5 });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(5.2, w - 2), Math.min(5.2, w - 2) / 3), boardMat);
  board.position.set(0, Math.min(3.1, h - 1.4), -d / 2 + thick / 2 + 0.04);
  board.userData.noMerge = true;
  if (!lay) inner.add(board);
  if (lay) {
    const fh = lay.floorH;
    // 樓板（留樓梯井）與樓梯井欄杆
    for (let k = 1; k < lay.floors; k++) {
      // 地面層的樓板頂面略高於島上地面，避免和石板地面閃爍
      const y = levelY(lay, k) + (k === lay.basements ? 0.04 : 0);
      const f = lay.flights[k - 1];
      const hx0 = f.lx - f.laneW / 2;
      const hx1 = f.lx + f.laneW / 2;
      const xmin = -w / 2 + 0.22;
      const xmax = w / 2 - 0.22;
      const zmin = -d / 2 + 0.22;
      const zmax = d / 2 - 0.22;
      const pieces: [number, number, number, number][] = [
        [xmin, hx0, zmin, zmax],
        [hx1, xmax, zmin, zmax],
        [Math.max(xmin, hx0), Math.min(xmax, hx1), zmin, f.z1],
        [Math.max(xmin, hx0), Math.min(xmax, hx1), f.z0, zmax],
      ];
      for (const [x0, x1, z0, z1] of pieces) {
        if (x1 - x0 < 0.05 || z1 - z0 < 0.05) continue;
        addMesh(inner, scaledBox(x1 - x0, 0.26, z1 - z0, 2.5, 0.26, 2.5), mats.woodFloor, (x0 + x1) / 2, y - 0.13, (z0 + z1) / 2);
      }
      const inner0 = f.lx - f.side * (f.laneW / 2);
      const outer0 = f.lx + f.side * (f.laneW / 2);
      const railLen = f.z0 - f.z1;
      addMesh(inner, new THREE.BoxGeometry(0.1, 0.1, railLen), mats.redLacquer, inner0, y + 0.95, (f.z0 + f.z1) / 2);
      addMesh(inner, new THREE.BoxGeometry(Math.abs(outer0 - inner0), 0.1, 0.1), mats.redLacquer, (inner0 + outer0) / 2, y + 0.95, f.z0);
      for (let q = 0; q <= 6; q++) addMesh(inner, new THREE.BoxGeometry(0.08, 0.95, 0.08), mats.redLacquer, inner0, y + 0.475, f.z1 + (railLen * q) / 6);
    }
    // 樓梯（每段 12 階）與扶手
    for (const f of lay.flights) {
      const yBase = levelY(lay, f.k);
      const n = 12;
      const L = f.z0 - f.z1;
      for (let i = 0; i < n; i++) {
        const top = ((i + 1) * fh) / n;
        addMesh(inner, scaledBox(f.laneW, top, L / n + 0.02, 1.5, 1.5, 1.5), mats.woodFloor, f.lx, yBase + top / 2, f.z0 - ((i + 0.5) * L) / n);
      }
      const innerX = f.lx - f.side * (f.laneW / 2);
      const railLen = Math.hypot(L, fh);
      const rail = addMesh(inner, new THREE.BoxGeometry(0.1, 0.1, railLen), mats.redLacquer, innerX, yBase + fh / 2 + 0.95, (f.z0 + f.z1) / 2);
      rail.rotation.x = Math.atan2(fh, L);
      for (let q = 0; q <= 4; q++) {
        const t = q / 4;
        addMesh(inner, new THREE.BoxGeometry(0.08, 0.95, 0.08), mats.redLacquer, innerX, yBase + t * fh + 0.475, f.z0 - t * L);
      }
    }
    // 每層的懸賞牆（內容由畫面載入後填入真實痛點）：後牆一面大的＋兩側牆、前牆各一面小的
    const bw = Math.min(10, w - 2 * (2.0 + 1.4));
    const firstSideCol = -d / 2 + d / (Math.max(0, Math.floor(d / 3.2) - 1) + 1);
    for (let k = 0; k < lay.floors; k++) {
      const top = k === lay.floors - 1;
      const boards: { x: number; z: number; ry: number; bw: number; layout: PainBoardLayout }[] = [
        { x: 0, z: -d / 2 + thick / 2 + 0.05, ry: 0, bw, layout: MAIN_BOARD },
      ];
      // 側牆：後段（樓梯在前段），頂樓只用最後一開間（其他開窗）
      const sz0 = -d / 2 + 0.35;
      const sz1 = top ? firstSideCol - 0.35 : Math.min(lay.flights[0].z1 - 0.45, firstSideCol + 3.2);
      const sideW = Math.min(4.4, sz1 - sz0);
      if (sideW > 1.6) {
        for (const sx of [-1, 1]) boards.push({ x: sx * (w / 2 - thick / 2 - 0.05), z: (sz0 + sz1) / 2, ry: -sx * (Math.PI / 2), bw: sideW, layout: SIDE_BOARD });
      }
      // 前牆內側：門扇外側（頂樓開窗所以不放）
      if (!top) {
        const fx0 = doorW / 2 + doorW / 2 + 0.35;
        const fx1 = w / 2 - 0.5;
        const fw = Math.min(3.6, fx1 - fx0);
        if (fw > 1.6) for (const sx of [-1, 1]) boards.push({ x: sx * (fx0 + fx1) / 2, z: d / 2 - thick / 2 - 0.05, ry: Math.PI, bw: fw, layout: SIDE_BOARD });
      }
      let offset = 0;
      boards.forEach((bd, bi) => {
        const count = bd.layout.cols * bd.layout.rows;
        const pm = new THREE.MeshStandardMaterial({ map: drawPainBoardTexture(k, [], true, bd.layout), roughness: 0.75 });
        const aspect = bd.layout.label ? 0.275 : 0.5;
        const pb = new THREE.Mesh(new THREE.PlaneGeometry(bd.bw, bd.bw * aspect), pm);
        pb.position.set(bd.x, levelY(lay, k) + (bi === 0 ? 2.05 : 1.85), bd.z);
        pb.rotation.y = bd.ry;
        pb.userData.noMerge = true;
        pb.userData.painBoard = { level: k, buildingId: b.id, offset, count, layout: bd.layout };
        offset += count;
        inner.add(pb);
      });
      if (k < lay.floors - 1) for (const sx of [-1, 1]) lanterns.addHanging(sx * w * 0.2, levelY(lay, k) + fh - 0.75, -d * 0.1, 0.7);
    }
  }
  const deskZ = -d * 0.25;
  if (lay) {
    // 地下室：石牆與地板（地面以下）
    if (lay.basements > 0) {
      const by0 = levelY(lay, 0);
      const bh = -by0;
      const t = thick;
      addMesh(inner, scaledBox(w - 0.2, 0.2, d - 0.2, 2.5, 0.2, 2.5), mats.woodFloor, 0, by0 - 0.1, 0);
      addMesh(inner, scaledBox(w, bh, t, 2.4, 2.4, 2.4), mats.stone, 0, by0 + bh / 2, -d / 2);
      addMesh(inner, scaledBox(w, bh, t, 2.4, 2.4, 2.4), mats.stone, 0, by0 + bh / 2, d / 2);
      addMesh(inner, scaledBox(t, bh, d, 2.4, 2.4, 2.4), mats.stone, -w / 2, by0 + bh / 2, 0);
      addMesh(inner, scaledBox(t, bh, d, 2.4, 2.4, 2.4), mats.stone, w / 2, by0 + bh / 2, 0);
      // 撐住地面層樓板的木樑
      for (const bx of [-w / 4, 0, w / 4]) addMesh(inner, new THREE.BoxGeometry(0.3, 0.32, d - 0.4), mats.darkWood, bx, -0.32, 0);
    }
    // 一樓的書桌案台：在這裡填寫並刊登痛點（取代原本的寶珠台）
    const dy = levelY(lay, lay.basements) + 0.04;
    const top = new THREE.Group();
    top.position.set(0, dy, deskZ);
    addMesh(top, new THREE.BoxGeometry(2.3, 0.09, 1.05), mats.redLacquer, 0, 0.84, 0);
    addMesh(top, new THREE.BoxGeometry(2.36, 0.04, 1.1), mats.gold, 0, 0.79, 0);
    // 兩端翹起的案頭
    for (const sx of [-1, 1]) addMesh(top, new THREE.BoxGeometry(0.12, 0.08, 1.05), mats.redLacquer, sx * 1.12, 0.92, 0);
    // 桌腳與側邊擋板
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) addMesh(top, new THREE.BoxGeometry(0.1, 0.8, 0.1), mats.darkWood, sx * 1.0, 0.4, sz * 0.42);
      addMesh(top, new THREE.BoxGeometry(0.06, 0.5, 0.86), mats.darkWood, sx * 1.0, 0.5, 0);
      addMesh(top, new THREE.BoxGeometry(0.34, 0.06, 0.96), mats.darkWood, sx * 1.0, 0.03, 0);
    }
    addMesh(top, new THREE.BoxGeometry(2.0, 0.14, 0.05), mats.darkWood, 0, 0.72, 0.5);
    // 桌上：紙、硯台、筆筒與毛筆、小牌
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.62).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: deskPaperTexture(), roughness: 0.9 }));
    paper.position.set(-0.15, 0.895, 0.08);
    paper.userData.noMerge = true;
    top.add(paper);
    addMesh(top, new THREE.BoxGeometry(0.34, 0.05, 0.24), mats.ridges.slate, 0.62, 0.915, 0.12);
    addMesh(top, new THREE.CylinderGeometry(0.1, 0.09, 0.26, 12), mats.pot, 0.78, 1.02, -0.25);
    for (const [bx, bz, tilt] of [[0.74, -0.27, 0.12], [0.8, -0.22, -0.1], [0.82, -0.29, 0.05]] as [number, number, number][]) {
      const brush = addMesh(top, new THREE.CylinderGeometry(0.012, 0.018, 0.42, 6), mats.darkWood, bx, 1.2, bz);
      brush.rotation.z = tilt;
    }
    const brushRest = addMesh(top, new THREE.CylinderGeometry(0.014, 0.022, 0.36, 6), mats.darkWood, 0.25, 0.915, 0.18);
    brushRest.rotation.z = Math.PI / 2;
    const pTex = signboardTexture('佈告桌', '在這裡填寫痛點');
    const plaqueMat = new THREE.MeshStandardMaterial({ map: pTex, emissive: 0xffffff, emissiveMap: pTex, emissiveIntensity: 0.58, roughness: 0.45 });
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.05), [mats.darkWood, mats.darkWood, mats.darkWood, mats.darkWood, plaqueMat, mats.darkWood]);
    plaque.position.set(-0.15, 1.06, -0.38);
    plaque.rotation.x = -0.25;
    plaque.userData.noMerge = true;
    top.add(plaque);
    // 桌後的圓凳
    addMesh(top, new THREE.CylinderGeometry(0.26, 0.22, 0.48, 12), mats.redLacquer, 0, 0.24, -0.95);
    inner.add(top);
    lanterns.addHanging(-1.4, dy + 2.3, deskZ + 0.2, 0.6);
    lanterns.addHanging(1.4, dy + 2.3, deskZ + 0.2, 0.6);
    // 點書桌就能填寫痛點
    root.add(makePickProxy(2.6, 1.6, 1.6, 0, deskZ, 0, { kind: 'desk', buildingId: b.id }, dy));
  } else if (isFloorsHall(b.id)) {
    // 展覽館、電玩城：大廳中央是很寬的大樓梯，正對的牆是榜單大螢幕，左右牆是精選榜、熱度榜
    const lobby = createHallLobby(
      b as BuildingInteractable,
      { stone: mats.stoneLight, red: mats.redLacquer, gold: mats.gold, dark: mats.darkWood, floor: mats.woodFloor },
      { back: -d / 2 + thick / 2, side: w / 2 - thick / 2, h: wallH }
    );
    root.add(lobby.group);
    extraColliders.push(...lobby.colliders);
  } else if (hallOf(b.id)) {
    // 藏書閣：大廳中央是往地下圖書館的下樓口（不放寶珠台）
    root.add(createHallStairEntrance(b as BuildingInteractable, deskZ));
  } else {
    addMesh(inner, new THREE.CylinderGeometry(0.72, 0.85, 0.5, 16), mats.stoneLight, 0, 0.25, deskZ);
    addMesh(inner, new THREE.CylinderGeometry(0.55, 0.7, 0.75, 12), mats.redLacquer, 0, 0.85, deskZ);
    addMesh(inner, new THREE.TorusGeometry(0.62, 0.06, 6, 20).rotateX(Math.PI / 2), mats.gold, 0, 1.24, deskZ);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 16), mats.orb);
    orb.position.set(0, 1.7, deskZ);
    orb.userData.noMerge = true;
    inner.add(orb);
    lanterns.addHanging(0, 1.7, deskZ, 0.01); // 寶珠光暈
  }
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
  // 欄杆只在水面那一段，上岸後就收掉（和碰撞一致）
  const [ra, rb] = bridgeRailRange(bridge);

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
    for (const rx of tm >= ra && tm <= rb ? [-w / 2 + 0.18, w / 2 - 0.18] : []) {
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
    for (const rx of t1 >= ra - 0.5 / segs && t1 <= rb + 1 / segs ? [-w / 2 + 0.18, w / 2 - 0.18] : []) {
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
  // 橋頭與橋中的石燈
  for (const t of [Math.max(0.04, ra), 0.5, Math.min(0.96, rb)]) {
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
  /** 地面要挖空的地方（世界座標多邊形，例如通往地下室的樓梯井） */
  groundHoles?: [number, number][][];
}

/** 有洞的水平圓盤／橢圓盤（洞是本地座標多邊形）；uv 依 mode 設定 */
function discWithHoles(rx: number, rz: number, holes: [number, number][][], uvOf: (x: number, z: number) => [number, number], seg = 72) {
  const shape = new THREE.Shape();
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const z = Math.sin(a) * rz;
    if (i === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  }
  for (const h of holes) {
    const path = new THREE.Path();
    h.forEach(([x, z], i) => (i === 0 ? path.moveTo(x, -z) : path.lineTo(x, -z)));
    path.closePath();
    shape.holes.push(path);
  }
  const g = new THREE.ShapeGeometry(shape, 1);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const [u, v] = uvOf(p.getX(i), p.getZ(i));
    uv.setXY(i, u, v);
  }
  g.computeVertexNormals();
  return g;
}

export function createStyledIsland(inp: StyledIslandInput, trees: TreeBatch, grass?: GrassBatch): THREE.Group {
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

  // 地面要挖洞的地方（轉成本島座標；只取完全落在範圍內的）
  const localHoles = (inp.groundHoles || []).map((h) => h.map(([x, z]) => [x - cx, z - cz] as [number, number]));
  const inEllipse = (h: [number, number][], ex: number, ez: number) => h.every(([x, z]) => (x / ex) ** 2 + (z / ez) ** 2 < 0.98);
  const pavingHoles = localHoles.filter((h) => inEllipse(h, rx + 0.4, rz + 0.4));
  if (pavingHoles.length) addMesh(parts, discWithHoles(rx + 0.4, rz + 0.4, pavingHoles, (x, z) => [x / 3.5, z / 3.5]), mats.paving, 0, 0, 0);
  else addMesh(parts, ellipseDisc(rx + 0.4, rz + 0.4), mats.paving, 0, 0, 0);
  addMesh(parts, ellipseRing(rx + 0.35, rz + 0.35, rx + rim, rz + rim, 96, 3.5, 0.08, inp.seed), mats.grass, 0, -0.04, 0);
  addMesh(parts, cliffGeometry(rx + rim, rz + rim, rx + rim + 3.5, rz + rim + 3.5, 9, inp.seed + 3), mats.rock, 0, -0.04, 0);
  // 廣場
  const R = inp.plazaRadius;
  const plazaHoles = localHoles.filter((h) => inEllipse(h, R, R));
  const plaza = new THREE.Mesh(
    plazaHoles.length
      ? discWithHoles(R, R, plazaHoles, (x, z) => [(x / R + 1) / 2, (-z / R + 1) / 2], 64)
      : new THREE.CircleGeometry(R, 64).rotateX(-Math.PI / 2),
    mats.plaza
  );
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
    // 每隔一段留一個缺口（步道口）：可以走到欄杆外的草地、靠近水邊
    posts.push(blockedByBridge(x + cx, z + cz, 1.2) || i % 7 === 3 ? null : { x, z });
  }
  const edgeCols: Collider[] = [];
  const postGeo = new THREE.BoxGeometry(0.28, 0.9, 0.28);
  const capGeo = new THREE.SphereGeometry(0.15, 6, 4);
  posts.forEach((p, i) => {
    if (!p) return;
    addMesh(parts, postGeo, mats.stoneLight, p.x, 0.45, p.z);
    addMesh(parts, capGeo, mats.stoneLight, p.x, 0.98, p.z);
    const q = posts[(i + 1) % n];
    if (q) {
      edgeCols.push({ id: `edge-${inp.seed}-${i}`, type: 'segment', x1: p.x + cx, z1: p.z + cz, x2: q.x + cx, z2: q.z + cz, halfThickness: 0.2 });
      const len = Math.hypot(q.x - p.x, q.z - p.z);
      const ang = -Math.atan2(q.z - p.z, q.x - p.x);
      addMesh(parts, scaledBox(len, 0.55, 0.16, len, 0.55, len), mats.balustrade, (p.x + q.x) / 2, 0.3, (p.z + q.z) / 2, ang);
      addMesh(parts, new THREE.BoxGeometry(len, 0.1, 0.22), mats.stoneLight, (p.x + q.x) / 2, 0.66, (p.z + q.z) / 2, ang);
    }
    if (i % 6 === 0) {
      const lx = p.x + Math.cos((i / n) * Math.PI * 2) * 0.7;
      const lz = p.z + Math.sin((i / n) * Math.PI * 2) * 0.7;
      lanterns.addPost(lx, 0, lz, 2.4);
      edgeCols.push({ id: `edgelamp-${inp.seed}-${i}`, type: 'cylinder', x: lx + cx, z: lz + cz, radius: 0.3 });
    }
  });

  // 草地外環：櫻花、綠樹、松、花叢
  const kinds: TreeKind[] = ['cherry', 'cherry', 'green', 'pine', 'cherry', 'green', 'maple'];
  const treeN = Math.round(perim / 5.5);
  for (let i = 0; i < treeN; i++) {
    const a = (i / treeN) * Math.PI * 2 + rand() * 0.08;
    let off = 3.0 + rand() * 3.2;
    // 島緣有店面時，樹往外退一點，樹冠才不會穿進屋頂
    if (blockedByBuilding(Math.cos(a) * (rx + off) + cx, Math.sin(a) * (rz + off) + cz, 4)) off += 2.8;
    const x = Math.cos(a) * (rx + off);
    const z = Math.sin(a) * (rz + off);
    if (blockedByBridge(x + cx, z + cz, 3.5)) continue;
    const ts = 0.85 + rand() * 0.6;
    trees.add(kinds[Math.floor(rand() * kinds.length)], x + cx, -0.04, z + cz, ts);
    edgeCols.push({ id: `edgetree-${inp.seed}-${i}`, type: 'cylinder', x: x + cx, z: z + cz, radius: 0.32 * ts + 0.1 });
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

  // 地標：主廣場大燈泡雕像（照 /island：八角深色石座＋金邊、渾圓金黃玻璃燈泡、發光鎢絲、愛迪生螺紋燈頭、傾斜金色光環）
  if (inp.landmark) {
    const lm = inp.landmark;
    const S = 1.45;
    const lg = new THREE.Group();
    lg.position.set(lm.x - cx, 0, lm.z - cz);
    lg.scale.setScalar(S);
    addMesh(lg, new THREE.CylinderGeometry(1.95, 2.05, 0.2, 8), mats.stone, 0, 0.1, 0);
    addMesh(lg, new THREE.CylinderGeometry(1.55, 1.85, 1.2, 8), mats.pedestalDark, 0, 0.8, 0);
    addMesh(lg, new THREE.CylinderGeometry(1.72, 1.78, 0.18, 8), mats.gold, 0, 0.33, 0);
    addMesh(lg, new THREE.CylinderGeometry(1.6, 1.6, 0.12, 8), mats.gold, 0, 1.42, 0);
    const bulb = new THREE.Group();
    bulb.position.y = 4.55;
    lg.add(bulb);
    // 玻璃罩：下方收腰燈頸＋上方渾圓球體
    const prof: THREE.Vector2[] = [];
    for (let i = 0; i <= 20; i++) {
      const u = i / 20;
      const y = -1.35 + u * 1.77;
      const sm = u * u * (3 - 2 * u);
      prof.push(new THREE.Vector2(0.88 + Math.pow(sm, 1.35) * 1.1, y));
    }
    const domeC = 1.15;
    const domeR = 2.11;
    const a0 = Math.asin((0.42 - domeC) / domeR);
    for (let i = 1; i <= 28; i++) {
      const th = a0 + (i / 28) * (Math.PI / 2 - a0);
      prof.push(new THREE.Vector2(Math.max(0, Math.cos(th) * domeR), domeC + Math.sin(th) * domeR));
    }
    const glass = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), mats.bulbGlass);
    glass.userData.noMerge = true;
    glass.renderOrder = 3;
    bulb.add(glass);
    // 內部鎢絲支架與發光鎢絲
    addMesh(bulb, new THREE.CylinderGeometry(0.18, 0.28, 1.45, 16), mats.bulbRing, 0, -0.68, 0);
    addMesh(bulb, new THREE.BoxGeometry(0.46, 0.24, 0.18), mats.bulbRing, 0, 0.08, 0);
    for (const side of [-1, 1]) {
      const wire = addMesh(bulb, new THREE.CylinderGeometry(0.045, 0.045, 1.35, 8), mats.bulbRing, side * 0.36, 0.68, 0);
      wire.rotation.z = -side * 0.28;
    }
    const arcGeo = new THREE.TorusGeometry(0.62, 0.085, 12, 32, Math.PI * 1.25);
    for (const ry of [0, Math.PI / 2]) {
      const arc = new THREE.Mesh(arcGeo, mats.filament);
      arc.position.y = 1.25;
      arc.rotation.set(0, ry, -Math.PI * 0.125);
      arc.userData.noMerge = true;
      bulb.add(arc);
    }
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 16), mats.filament);
    core.position.y = 1.25;
    core.userData.noMerge = true;
    bulb.add(core);
    // 愛迪生螺紋燈頭
    addMesh(bulb, new THREE.CylinderGeometry(0.9, 0.88, 0.22, 36), mats.gold, 0, -1.42, 0);
    addMesh(bulb, new THREE.CylinderGeometry(0.86, 0.78, 1.08, 36), mats.screwMetal, 0, -1.98, 0);
    [-1.64, -1.94, -2.24].forEach((ry, k) => addMesh(bulb, new THREE.TorusGeometry(0.85 - k * 0.025, 0.115, 12, 36).rotateX(Math.PI / 2), mats.screwMetal, 0, ry, 0));
    addMesh(bulb, new THREE.CylinderGeometry(0.74, 0.44, 0.28, 32), mats.pedestalDark, 0, -2.58, 0);
    addMesh(bulb, new THREE.SphereGeometry(0.44, 20, 12, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), mats.screwMetal, 0, -2.62, 0);
    // 傾斜的金色星軌光環
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.11, 12, 56).rotateX(Math.PI / 2), mats.bulbRing);
    orbit.position.y = 0.65;
    orbit.rotation.set(0.22, 0, 0.34);
    orbit.userData.noMerge = true;
    bulb.add(orbit);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffc860, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.set(9, 9, 1);
    halo.position.y = 1.15;
    halo.userData.noMerge = true;
    bulb.add(halo);
    lanterns.addHanging(lm.x - cx, (4.55 + 1.15) * S, lm.z - cz, 0.01);
    // 隱藏的笑臉：平常是無臉雕像，點一下露出笑臉並快速轉圈
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x5a3a12 });
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xff8fa3, transparent: true, opacity: 0.85 });
    const face = new THREE.Group();
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.055, 6, 14, Math.PI), faceMat);
      eye.position.set(sx * 0.55, 1.62, 2.1);
      face.add(eye);
      const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.18, 14), cheekMat);
      cheek.position.set(sx * 0.95, 1.2, 1.98);
      cheek.rotation.y = sx * 0.45;
      face.add(cheek);
    }
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 8, 20, Math.PI), faceMat);
    smile.rotation.z = Math.PI;
    smile.position.set(0, 1.12, 2.16);
    face.add(smile);
    face.visible = false;
    face.traverse((o) => (o.renderOrder = 5));
    bulb.add(face);
    bulb.traverse((o) => (o.userData.noMerge = true));
    let last = 0;
    let alertAt = -10;
    let spinAt = -10;
    let spinFrom = 0;
    let spinTo = 0;
    const baseY = bulb.position.y;
    let baseGlow = -1;
    // 平常慢慢轉；有新提案時閃爍、跳躍約 2.5 秒
    bulb.userData.tick = (t: number) => {
      const dt = last ? Math.min(0.1, t - last) : 0;
      last = t;
      const k = t - alertAt;
      const on = k >= 0 && k < 2.6;
      const ks = t - spinAt;
      // 點擊：快速轉兩圈後停在面向點的人，笑臉露出約 3 秒
      face.visible = ks >= 0 && ks < 3.2;
      if (ks >= 0 && ks < 1.0) {
        const e = 1 - Math.pow(1 - ks / 1.0, 3);
        bulb.rotation.y = spinFrom + (spinTo - spinFrom) * e;
      } else if (ks >= 1.0 && ks < 3.2) {
        bulb.rotation.y = spinTo;
      } else {
        bulb.rotation.y += dt * (on ? 2.2 : 0.35);
      }
      if (on) {
        if (baseGlow < 0) baseGlow = mats.bulbGlass.emissiveIntensity;
        const decay = 1 - k / 2.6;
        bulb.position.y = baseY + Math.abs(Math.sin(k * 7.5)) * 0.9 * decay;
        mats.bulbGlass.emissiveIntensity = baseGlow + (Math.sin(k * 26) > 0 ? 2.4 : 0.2) * decay;
        (halo.material as THREE.SpriteMaterial).opacity = 0.5 + 0.45 * decay * (Math.sin(k * 26) > 0 ? 1 : 0.3);
      } else if (baseGlow >= 0) {
        bulb.position.y = baseY;
        mats.bulbGlass.emissiveIntensity = baseGlow;
        (halo.material as THREE.SpriteMaterial).opacity = 0.5;
        baseGlow = -1;
      }
    };
    bulb.userData.alert = () => {
      alertAt = performance.now() / 1000;
    };
    bulb.userData.celebrate = (camX?: number, camZ?: number) => {
      spinAt = performance.now() / 1000;
      spinFrom = bulb.rotation.y;
      const wp = new THREE.Vector3();
      bulb.getWorldPosition(wp);
      const face = camX === undefined || camZ === undefined ? spinFrom : Math.atan2(camX - wp.x, camZ - wp.z);
      // 轉兩圈多，最後笑臉朝向點的人
      let target = face;
      while (target < spinFrom + Math.PI * 4) target += Math.PI * 2;
      spinTo = target;
    };
    lg.add(makePickProxy(4.6, 5.6, 4.6, 0, 0, 0, { kind: 'bulb' }, 1.6));
    g.add(lg);
  }

  // 草叢與小花（草地外環）
  if (grass) {
    const gn = Math.round(perim / 0.55);
    for (let i = 0; i < gn; i++) {
      const a = rand() * Math.PI * 2;
      const off = 0.8 + rand() * 5.8;
      const x = Math.cos(a) * (rx + off);
      const z = Math.sin(a) * (rz + off);
      if (blockedByBridge(x + cx, z + cz, 0.6)) continue;
      grass.add(x + cx, -0.04, z + cz, 0.7 + rand() * 0.7, rand() * Math.PI);
    }
  }
  // 島緣欄杆（留步道口）、草地外環的燈柱與樹：給走到欄杆外草地的人用的碰撞
  g.userData.colliders = edgeCols;
  // 岸邊浪花
  const foam = new THREE.Mesh(foamRingGeometry(rx + rim + 0.05, rz + rim + 0.05, 3.2), mats.foam);
  foam.position.y = -0.3;
  foam.renderOrder = 2;
  g.add(foam);

  g.add(parts);
  mergeByMaterial(parts);
  g.add(lanterns.build());
  return g;
}

/** 浪花環：內圈貼岸、往外漸淡 */
export function foamRingGeometry(rxIn: number, rzIn: number, width: number, seg = 120) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const perim = Math.PI * (rxIn + rzIn);
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    pos.push(c * rxIn, 0, sn * rzIn, c * (rxIn + width), 0, sn * (rzIn + width));
    const u = ((i / seg) * perim) / 10;
    uv.push(u, 0, u, 1);
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

/** 草叢批次（十字交叉的透明草葉，一次畫完） */
export class GrassBatch {
  private items: number[] = [];
  add(x: number, y: number, z: number, s: number, rot: number) {
    this.items.push(x, y, z, s, rot);
  }
  build(): THREE.Object3D {
    const mats = getStyleMaterials();
    const n = this.items.length / 5;
    const geo = mergeGeometries([
      new THREE.PlaneGeometry(1, 0.7).translate(0, 0.35, 0),
      new THREE.PlaneGeometry(1, 0.7).translate(0, 0.35, 0).rotateY(Math.PI / 2),
    ])!;
    const im = new THREE.InstancedMesh(geo, mats.grassTuft, Math.max(1, n));
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const [x, y, z, s, r] = this.items.slice(i * 5, i * 5 + 5);
      q.setFromAxisAngle(up, r);
      im.setMatrixAt(i, m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s, s)));
      im.setColorAt(i, c.setHSL(0.24 + ((i * 37) % 10) / 200, 0.45, 0.62 + ((i * 13) % 10) / 60));
    }
    im.count = n;
    im.frustumCulled = false;
    return im;
  }
}
