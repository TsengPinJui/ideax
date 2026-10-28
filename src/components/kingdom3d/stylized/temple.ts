import * as THREE from 'three';
import type { BuildingInteractable, Collider } from '../types';
import { getStyleMaterials, mergeByMaterial, buildRoofTier } from './architecture';

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
  c.height = 160;
  const g = c.getContext('2d')!;
  g.fillStyle = '#d9a63a';
  g.fillRect(0, 0, 512, 160);
  g.fillStyle = '#1c2f5a';
  g.fillRect(14, 14, 484, 132);
  g.strokeStyle = '#f2cf6b';
  g.lineWidth = 4;
  g.strokeRect(24, 24, 464, 112);
  g.fillStyle = '#f6d27a';
  g.font = `900 96px ${KAI}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 84);
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
      const y = yR + (yE - yR) * Math.pow(t, 0.75) + edge * t * 0.55 + t * t * 0.18;
      pos.push(x, y, z);
      uv.push((x / 2.2) * 1.0, (t * Math.hypot(zE - zR, yE - yR)) / 2.2);
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
  // Legacy hall geometry is retained below as a fallback reference while the new pavilion is tuned.
  const mats = getStyleMaterials();
  const root = new THREE.Group();
  root.name = `temple_extras_${b.id}`;
  root.position.copy(b.position);
  root.rotation.y = b.facingYaw;
  const stat = new THREE.Group();
  root.add(stat);
  const colliders: Collider[] = [];
  const d2 = b.depth / 2;
  const toWorld = (lx: number, lz: number): [number, number] => {
    const c = Math.cos(b.facingYaw);
    const s = Math.sin(b.facingYaw);
    return [b.position.x + lx * c + lz * s, b.position.z - lx * s + lz * c];
  };
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = stat) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const granite = new THREE.MeshStandardMaterial({ color: 0x8b8a84, roughness: 0.85 });
  const dragonGreen = new THREE.MeshStandardMaterial({ color: 0x2f8f6a, roughness: 0.35, metalness: 0.25 });
  const dragonBlue = new THREE.MeshStandardMaterial({ color: 0x2c63b5, roughness: 0.35, metalness: 0.25 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xe2b23f, roughness: 0.3, metalness: 0.75, emissive: new THREE.Color(0x6b4a00), emissiveIntensity: 0.25 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0x6f5a30, roughness: 0.45, metalness: 0.75 });
  const pearlMat = new THREE.MeshStandardMaterial({ color: 0xffd36b, roughness: 0.25, metalness: 0.4, emissive: new THREE.Color(0xff9a2a), emissiveIntensity: 0.6 });
  const flameMat = new THREE.MeshStandardMaterial({ color: 0xff5a2a, roughness: 0.4, emissive: new THREE.Color(0xff3a10), emissiveIntensity: 0.7 });

  const zF = d2; // 廟正面
  const colZ = zF + 2.55;
  const ridgeZ = zF + 1.45;
  const ridgeY = 6.35;
  const eaveF = { z: zF + 3.35, y: 4.55 };
  const eaveB = { z: zF - 0.35, y: 5.25 };
  const halfX = 6.2;

  // ── 月台（石階平台） ──
  add(new THREE.BoxGeometry(12.2, 0.22, 3.4), granite, 0, 0.11, zF + 1.7);
  add(new THREE.BoxGeometry(5.0, 0.12, 0.6), granite, 0, 0.06, zF + 3.6);

  // ── 龍柱一對（盤龍繞著石柱） ──
  for (const sx of [-1, 1]) {
    const x = sx * 2.35;
    add(new THREE.CylinderGeometry(0.26, 0.3, 4.4, 14), granite, x, 2.2, colZ);
    add(new THREE.CylinderGeometry(0.42, 0.46, 0.35, 8), granite, x, 0.18, colZ);
    // 螺旋盤龍
    const pts: THREE.Vector3[] = [];
    const turns = 2.6;
    for (let k = 0; k <= 80; k++) {
      const t = k / 80;
      const a = t * turns * Math.PI * 2 * sx + (sx > 0 ? Math.PI : 0);
      pts.push(new THREE.Vector3(x + Math.cos(a) * 0.34, 0.45 + t * 3.5, colZ + Math.sin(a) * 0.34));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const body = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.12, 8, false), dragonGreen);
    body.castShadow = true;
    stat.add(body);
    // 鱗脊（金色細線）
    const fin = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.045, 5, false), gold);
    fin.position.y = 0.09;
    stat.add(fin);
    // 龍頭（朝外、張口）
    const end = pts[pts.length - 1];
    const head = add(new THREE.SphereGeometry(0.2, 12, 10), dragonGreen, end.x, end.y + 0.08, end.z + 0.12);
    head.scale.set(1, 0.85, 1.3);
    add(new THREE.ConeGeometry(0.1, 0.3, 8).rotateX(Math.PI / 2), gold, end.x, end.y + 0.06, end.z + 0.38);
    for (const hx of [-0.09, 0.09]) add(new THREE.ConeGeometry(0.035, 0.28, 6), gold, end.x + hx, end.y + 0.32, end.z + 0.05).rotation.x = -0.5;
    const [wx, wz] = toWorld(x, colZ);
    colliders.push({ id: `${b.id}-dragon-col-${sx}`, type: 'cylinder', x: wx, z: wz, radius: 0.48 });
  }
  // 朱漆角柱
  for (const sx of [-1, 1]) {
    const x = sx * 5.35;
    add(new THREE.CylinderGeometry(0.22, 0.24, 4.4, 12), mats.redLacquer, x, 2.2, colZ);
    add(new THREE.CylinderGeometry(0.36, 0.38, 0.3, 8), granite, x, 0.15, colZ);
    const [wx, wz] = toWorld(x, colZ);
    colliders.push({ id: `${b.id}-col-${sx}`, type: 'cylinder', x: wx, z: wz, radius: 0.38 });
  }
  // ── 樑枋（朱紅樑＋金線＋彩繪板）與匾額 ──
  add(new THREE.BoxGeometry(11.4, 0.42, 0.42), mats.redLacquer, 0, 4.5, colZ);
  add(new THREE.BoxGeometry(11.5, 0.06, 0.46), gold, 0, 4.25, colZ);
  add(new THREE.BoxGeometry(11.4, 0.35, 0.3), mats.templeFacade, 0, 4.0, colZ - 0.05);
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.3, 0.36, 3.0), mats.redLacquer, sx * 5.35, 4.5, colZ - 1.45);
  {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.94), new THREE.MeshStandardMaterial({ map: plaqueTexture(b.name), emissive: 0xffffff, emissiveMap: plaqueTexture(b.name), emissiveIntensity: 0.35, roughness: 0.5 }));
    pl.position.set(0, 5.25, eaveF.z - 0.55);
    pl.rotation.x = -0.12;
    pl.userData.noMerge = true;
    root.add(pl);
  }

  // ── 兩坡琉璃頂＋屋簷下封板 ──
  const roofMat = mats.roofs.gold;
  add(slopeGeometry(halfX, ridgeZ, ridgeY, eaveF.z, eaveF.y, false), roofMat, 0, 0, 0);
  add(slopeGeometry(halfX, ridgeZ, ridgeY, eaveB.z, eaveB.y, true), roofMat, 0, 0, 0);
  add(slopeGeometry(halfX - 0.05, ridgeZ, ridgeY - 0.08, eaveF.z - 0.05, eaveF.y - 0.08, true), mats.roofUnder, 0, 0, 0);
  // 簷口滴水（金邊）
  add(new THREE.BoxGeometry(halfX * 2, 0.12, 0.12), gold, 0, eaveF.y + 0.04, eaveF.z);

  // ── 燕尾脊：正脊兩端高高翹起、分叉 ──
  const ridgeMat = mats.redLacquer;
  add(new THREE.BoxGeometry(halfX * 2 - 1.4, 0.36, 0.36), ridgeMat, 0, ridgeY + 0.2, ridgeZ);
  add(new THREE.BoxGeometry(halfX * 2 - 1.4, 0.08, 0.4), gold, 0, ridgeY + 0.4, ridgeZ);
  for (const sx of [-1, 1]) {
    for (const fz of [-0.1, 0.1]) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(sx * (halfX - 0.9), ridgeY + 0.22, ridgeZ),
        new THREE.Vector3(sx * (halfX - 0.1), ridgeY + 0.35, ridgeZ + fz * 0.5),
        new THREE.Vector3(sx * (halfX + 0.5), ridgeY + 0.9, ridgeZ + fz * 1.6),
        new THREE.Vector3(sx * (halfX + 0.75), ridgeY + 1.65, ridgeZ + fz * 3.2),
      ]);
      const tail = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.13, 8, false), ridgeMat);
      tail.castShadow = true;
      stat.add(tail);
    }
  }
  // 垂脊（屋面兩側往下）
  for (const sx of [-1, 1]) {
    for (const [ez, ey] of [
      [eaveF.z, eaveF.y],
      [eaveB.z, eaveB.y],
    ]) {
      const c = new THREE.CatmullRomCurve3([
        new THREE.Vector3(sx * (halfX - 0.55), ridgeY + 0.12, ridgeZ),
        new THREE.Vector3(sx * (halfX - 0.35), (ridgeY + ey) / 2 + 0.1, (ridgeZ + ez) / 2),
        new THREE.Vector3(sx * (halfX + 0.05), ey + 0.45, ez + Math.sign(ez - ridgeZ) * 0.15),
      ]);
      const m = new THREE.Mesh(new THREE.TubeGeometry(c, 12, 0.1, 6, false), ridgeMat);
      stat.add(m);
    }
  }

  // ── 剪黏雙龍搶珠（正脊上） ──
  {
    add(new THREE.SphereGeometry(0.3, 16, 12), pearlMat, 0, ridgeY + 0.85, ridgeZ);
    const fl = add(new THREE.ConeGeometry(0.16, 0.5, 8), flameMat, 0, ridgeY + 1.32, ridgeZ);
    fl.userData.flame = true;
    add(new THREE.CylinderGeometry(0.08, 0.12, 0.35, 8), gold, 0, ridgeY + 0.55, ridgeZ);
    for (const sx of [-1, 1]) {
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 30; k++) {
        const t = k / 30;
        const x = sx * (0.65 + t * 3.9);
        pts.push(new THREE.Vector3(x, ridgeY + 0.62 + Math.sin(t * Math.PI * 3) * 0.28 + (1 - t) * 0.2, ridgeZ + Math.cos(t * Math.PI * 3) * 0.08));
      }
      const c = new THREE.CatmullRomCurve3(pts);
      stat.add(new THREE.Mesh(new THREE.TubeGeometry(c, 60, 0.11, 8, false), sx < 0 ? dragonGreen : dragonBlue));
      const spine = new THREE.Mesh(new THREE.TubeGeometry(c, 60, 0.04, 5, false), gold);
      spine.position.y = 0.09;
      stat.add(spine);
      const h = pts[0];
      const head = add(new THREE.SphereGeometry(0.17, 12, 10), sx < 0 ? dragonGreen : dragonBlue, h.x, h.y + 0.04, h.z);
      head.scale.set(1.35, 0.9, 0.9);
      add(new THREE.ConeGeometry(0.08, 0.26, 8).rotateZ(sx > 0 ? Math.PI / 2 : -Math.PI / 2), gold, h.x - sx * 0.22, h.y + 0.02, h.z);
      for (const hz of [-0.08, 0.08]) add(new THREE.ConeGeometry(0.03, 0.24, 6), gold, h.x + sx * 0.05, h.y + 0.26, h.z + hz).rotation.z = sx * 0.5;
    }
  }

  // ── 宮燈一對 ──
  const lanternMat = mats.lanternBody;
  for (const sx of [-1, 1]) {
    const x = sx * 1.25;
    add(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 4), mats.darkWood, x, 3.95, colZ - 0.05);
    const l = add(new THREE.SphereGeometry(0.42, 16, 12), lanternMat, x, 3.25, colZ - 0.05);
    l.scale.set(1, 1.2, 1);
    add(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 12), gold, x, 3.78, colZ - 0.05);
    add(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 12), gold, x, 2.72, colZ - 0.05);
  }

  // ── 天公爐（吊在門廊下，香煙裊裊） ──
  const censer = new THREE.Group();
  censer.position.set(0, 2.75, colZ - 1.0);
  stat.add(censer);
  {
    const prof = [
      [0.01, -0.35],
      [0.4, -0.3],
      [0.55, -0.05],
      [0.58, 0.2],
      [0.5, 0.32],
      [0.62, 0.38],
      [0.55, 0.4],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    add(new THREE.LatheGeometry(prof, 20), bronze, 0, 0, 0, censer);
    add(new THREE.TorusGeometry(0.56, 0.035, 6, 24).rotateX(Math.PI / 2), gold, 0, 0.12, 0, censer);
    for (const sx of [-1, 1]) add(new THREE.TorusGeometry(0.13, 0.03, 6, 12, Math.PI), gold, sx * 0.62, 0.42, 0, censer).rotation.y = Math.PI / 2;
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      const ch = add(new THREE.CylinderGeometry(0.01, 0.01, 1.35, 4), mats.darkWood, Math.cos(a) * 0.45, 1.05, Math.sin(a) * 0.45, censer);
      ch.rotation.z = Math.cos(a) * 0.35;
      ch.rotation.x = -Math.sin(a) * 0.35;
    }
    // 香
    for (let k = 0; k < 5; k++) add(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 4), flameMat, (k - 2) * 0.08, 0.55, (k % 2) * 0.06 - 0.03, censer);
  }

  // ── 金爐（廟旁燒金紙的小塔） ──
  {
    const kx = b.width / 2 + 1.9;
    const kz = 1.2;
    add(new THREE.BoxGeometry(1.7, 0.35, 1.7), granite, kx, 0.18, kz);
    add(new THREE.BoxGeometry(1.3, 1.6, 1.3), mats.redLacquer, kx, 1.15, kz);
    add(new THREE.BoxGeometry(1.42, 0.12, 1.42), gold, kx, 1.98, kz);
    add(new THREE.BoxGeometry(1.0, 0.9, 1.0), mats.redLacquer, kx, 2.5, kz);
    add(new THREE.ConeGeometry(0.95, 0.7, 4).rotateY(Math.PI / 4), mats.roofs.gold, kx, 3.3, kz);
    add(new THREE.CylinderGeometry(0.12, 0.16, 0.6, 8), granite, kx, 3.85, kz);
    const fire = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshBasicMaterial({ color: 0xff8a2a }));
    fire.position.set(kx, 0.95, kz + 0.66);
    fire.userData.noMerge = true;
    fire.userData.flicker = true;
    root.add(fire);
    const [wx, wz] = toWorld(kx, kz);
    colliders.push({ id: `${b.id}-jinlu`, type: 'box', x: wx, z: wz, halfWidth: 0.95, halfDepth: 0.95 });
  }

  mergeByMaterial(stat);

  // 香煙＋金爐火光
  const smokeTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,0.9)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const puffs: THREE.Sprite[] = [];
  for (let i = 0; i < 7; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: 0xf2efe8, transparent: true, opacity: 0, depthWrite: false }));
    sp.userData.ph = i / 7;
    root.add(sp);
    puffs.push(sp);
  }
  const fire = root.children.find((c) => c.userData.flicker) as THREE.Mesh | undefined;
  root.userData.tick = (t: number) => {
    for (const p of puffs) {
      const age = (t * 0.14 + (p.userData.ph as number)) % 1;
      p.position.set(Math.sin(age * 6 + t * 0.4) * 0.18, 3.35 + age * 2.0, colZ - 1.0 + Math.cos(age * 5) * 0.12 + age * 0.6);
      const s = 0.25 + age * 0.9;
      p.scale.set(s, s, 1);
      (p.material as THREE.SpriteMaterial).opacity = 0.42 * Math.min(1, age * 5) * (1 - age);
    }
    if (fire) (fire.material as THREE.MeshBasicMaterial).color.setRGB(1, 0.45 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.06, 0.12);
  };
  root.updateMatrixWorld(true);
  return { group: root, colliders };
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
  const stone = new THREE.MeshStandardMaterial({ color: 0xaaa493, roughness: 0.88 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd5a84f, roughness: 0.34, metalness: 0.55 });
  const roofRed = new THREE.MeshStandardMaterial({ color: 0x922f24, roughness: 0.7, metalness: 0.05 });
  const floorRadius = Math.min(b.width * 0.48, b.depth * 0.62);

  // 八角石台、木地坪與一圈細金線收邊。
  add(new THREE.CylinderGeometry(floorRadius * 0.93, floorRadius, 0.64, 8), stone, 0, 0.32, 0).rotation.y = Math.PI / 8;
  add(new THREE.CylinderGeometry(floorRadius * 0.84, floorRadius * 0.84, 0.1, 8), mats.woodFloor, 0, 0.69, 0).rotation.y = Math.PI / 8;
  const sill = add(new THREE.CylinderGeometry(floorRadius * 0.97, floorRadius * 0.97, 0.08, 8), gold, 0, 0.65, 0);
  sill.rotation.y = Math.PI / 8;

  // 八根朱柱與金色柱礎，四面保持通透，讓廟亭本身一眼可辨。
  const postRadius = floorRadius * 0.76;
  const postY = 0.78;
  const postHeight = 4.65;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const x = Math.cos(a) * postRadius;
    const z = Math.sin(a) * postRadius;
    add(new THREE.CylinderGeometry(0.28, 0.34, 0.22, 8), gold, x, postY + 0.11, z);
    add(new THREE.CylinderGeometry(0.18, 0.22, postHeight, 10), mats.redLacquer, x, postY + postHeight / 2, z);
    add(new THREE.CylinderGeometry(0.3, 0.25, 0.18, 8), gold, x, postY + postHeight - 0.02, z);
    const [wx, wz] = worldPoint(x, z);
    colliders.push({ id: `${b.id}-oct-post-${i}`, type: 'cylinder', x: wx, z: wz, radius: 0.42 });
    // 面向入口的兩根主柱盤繞青龍、金線鱗脊與龍首，讓閩式廟亭的龍柱成為正面焦點。
    if (Math.sin(a) > 0.5) {
      const dragonMat = new THREE.MeshStandardMaterial({ color: i % 2 ? 0x26765f : 0x315c83, roughness: 0.38, metalness: 0.28 });
      const goldLine = new THREE.MeshStandardMaterial({ color: 0xd6ac50, roughness: 0.35, metalness: 0.65 });
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 72; k++) {
        const t = k / 72;
        const angle = t * Math.PI * 6 + i;
        pts.push(new THREE.Vector3(x + Math.cos(angle) * 0.34, postY + 0.38 + t * (postHeight - 0.9), z + Math.sin(angle) * 0.34));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const dragon = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.105, 7, false), dragonMat);
      dragon.castShadow = true;
      pavilion.add(dragon);
      const scales = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.026, 5, false), goldLine);
      scales.position.y = 0.045;
      pavilion.add(scales);
      const headPoint = pts[pts.length - 1];
      const head = add(new THREE.SphereGeometry(0.22, 12, 10), dragonMat, headPoint.x, headPoint.y + 0.08, headPoint.z);
      head.scale.set(1.25, 0.92, 1.3);
      for (const side of [-1, 1]) add(new THREE.ConeGeometry(0.055, 0.3, 7), goldLine, headPoint.x + side * 0.13, headPoint.y + 0.27, headPoint.z).rotation.z = side * -0.45;
    }
  }
  const beamRing = add(new THREE.CylinderGeometry(postRadius * 1.04, postRadius * 1.04, 0.32, 8), mats.redLacquer, 0, postY + postHeight - 0.06, 0);
  beamRing.rotation.y = Math.PI / 8;
  const lintel = add(new THREE.CylinderGeometry(postRadius * 1.08, postRadius * 1.08, 0.08, 8), gold, 0, postY + postHeight - 0.26, 0);
  lintel.rotation.y = Math.PI / 8;

  // 朱色雙層八角攢尖頂，瓦沿以金色滴水線勾邊。
  const roofTier = (radius: number, y: number, height: number, tipRadius: number) => {
    const roof = add(new THREE.CylinderGeometry(tipRadius, radius, height, 8, 1), roofRed, 0, y, 0);
    roof.rotation.y = Math.PI / 8;
    const edge = add(new THREE.TorusGeometry(radius * 0.99, 0.09, 7, 8), gold, 0, y - height / 2 + 0.05, 0);
    edge.rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const finial = add(new THREE.SphereGeometry(0.16, 8, 6), gold, Math.cos(a) * (radius + 0.08), y - height / 2 + 0.1, Math.sin(a) * (radius + 0.08));
      finial.scale.set(1.1, 0.75, 1.1);
      if (radius > floorRadius) {
        const eave = y - height / 2 + 0.1;
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(Math.cos(a) * radius * 0.88, eave, Math.sin(a) * radius * 0.88),
          new THREE.Vector3(Math.cos(a) * radius, eave + 0.1, Math.sin(a) * radius),
          new THREE.Vector3(Math.cos(a) * radius * 1.06, eave + 0.46, Math.sin(a) * radius * 1.06),
          new THREE.Vector3(Math.cos(a) * radius * 1.1, eave + 0.82, Math.sin(a) * radius * 1.1),
        ]);
        const tail = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.11, 7, false), roofRed);
        tail.castShadow = true;
        pavilion.add(tail);
        add(new THREE.SphereGeometry(0.13, 8, 6), gold, Math.cos(a) * radius * 1.1, eave + 0.82, Math.sin(a) * radius * 1.1);
      }
    }
  };
  roofTier(floorRadius * 1.13, 5.9, 1.32, 1.65);
  roofTier(floorRadius * 0.66, 7.05, 1.12, 0.34);
  add(new THREE.ConeGeometry(0.3, 0.9, 8), gold, 0, 8.05, 0);

  // 額匾與暖色宮燈。
  const plaqueTex = plaqueTexture(b.name);
  const plaque = add(new THREE.PlaneGeometry(3.2, 0.9), new THREE.MeshStandardMaterial({ map: plaqueTex, emissive: 0x6b2c17, emissiveMap: plaqueTex, emissiveIntensity: 0.22, roughness: 0.55 }), 0, 4.8, floorRadius * 0.78);
  plaque.userData.noMerge = true;
  for (const x of [-2.1, 2.1]) {
    const lantern = add(new THREE.SphereGeometry(0.3, 10, 8), mats.lanternBody, x, 4.4, floorRadius * 0.66);
    lantern.scale.set(0.8, 1.25, 0.8);
    lantern.userData.noMerge = true;
    add(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 8), gold, x, 4.8, floorRadius * 0.66);
  }

  // 延伸至前埕的有頂廊道，兩側朱柱與低矮欄板形成清楚的迎賓路線。
  const corridor = new THREE.Group();
  corridor.position.z = floorRadius * 0.83;
  pavilion.add(corridor);
  const corridorLength = Math.max(7.2, b.depth * 0.92);
  add(new THREE.BoxGeometry(3.9, 0.2, corridorLength), stone, 0, 0.42, corridorLength / 2, corridor);
  for (const x of [-1.7, 1.7]) {
    for (let i = 0; i < 4; i++) {
      const z = 0.45 + i * (corridorLength - 0.9) / 3;
      add(new THREE.CylinderGeometry(0.13, 0.16, 2.72, 8), mats.redLacquer, x, 1.85, z, corridor);
      add(new THREE.CylinderGeometry(0.2, 0.18, 0.12, 8), gold, x, 3.25, z, corridor);
      const [wx, wz] = worldPoint(x, floorRadius * 0.83 + z);
      colliders.push({ id: `${b.id}-gallery-${x}-${i}`, type: 'cylinder', x: wx, z: wz, radius: 0.3 });
    }
  }
  const corridorRoof = buildRoofTier(4.4, corridorLength + 0.7, { rise: 1.2, overhang: 0.58, curl: 0.35, theme: 'red' });
  corridorRoof.position.set(0, 3.35, corridorLength / 2);
  corridorRoof.traverse((o) => { o.userData.noMerge = true; });
  corridor.add(corridorRoof);

  // 閩南廟宇入口石獅：一對蹲踞石獅立於廊道外側，讓出中央進出動線。
  const lionStone = new THREE.MeshStandardMaterial({ color: 0xaaa79e, roughness: 0.9 });
  const lionShade = new THREE.MeshStandardMaterial({ color: 0x777a77, roughness: 0.88 });
  for (const side of [-1, 1]) {
    const lion = new THREE.Group();
    lion.position.set(side * 3.25, 0, floorRadius * 0.83 + corridorLength + 1.55);
    lion.userData.noMerge = true;
    corridor.add(lion);
    add(new THREE.CylinderGeometry(0.9, 1.0, 0.34, 8), stone, 0, 0.17, 0, lion);
    add(new THREE.BoxGeometry(1.0, 0.16, 0.92), gold, 0, 0.42, 0, lion);
    const pose = new THREE.Group();
    lion.add(pose);
    const la = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
      const mesh = add(geo, mat, x, y, z, pose);
      mesh.userData.noMerge = true;
      return mesh;
    };
    const body = la(new THREE.SphereGeometry(0.68, 12, 10), lionStone, 0, 0.92, 0);
    body.userData.pick = { kind: 'egg', egg: 'stoneLion', maxDist: 24 };
    body.userData.noMerge = true;
    const mane = la(new THREE.SphereGeometry(0.59, 12, 10), lionShade, 0, 1.35, -0.04);
    mane.userData.pick = { kind: 'egg', egg: 'stoneLion', maxDist: 24 };
    mane.userData.noMerge = true;
    la(new THREE.SphereGeometry(0.39, 12, 10), lionStone, 0, 1.42, -0.38);
    la(new THREE.SphereGeometry(0.16, 10, 8), lionShade, 0, 1.27, -0.72);
    for (const x of [-0.4, 0.4]) {
      la(new THREE.SphereGeometry(0.22, 8, 7), lionStone, x, 1.75, -0.05);
      la(new THREE.SphereGeometry(0.12, 8, 7), gold, x * 1.45, 1.18, -0.44);
    }
    for (const x of [-0.42, 0.42]) for (const z of [-0.32, 0.34]) {
      la(new THREE.CylinderGeometry(0.17, 0.2, 0.48, 8), lionStone, x, 0.56, z);
      la(new THREE.SphereGeometry(0.22, 8, 6), lionStone, x, 0.36, z - 0.08);
    }
    lion.userData.tick = (t: number) => {
      const phase = (t + (side < 0 ? 0 : 10.5)) % 27;
      let stretch = 0;
      if (phase >= 17 && phase < 19.2) stretch = (phase - 17) / 2.2;
      else if (phase >= 19.2 && phase < 20.7) stretch = 1;
      else if (phase >= 20.7 && phase < 23.1) stretch = 1 - (phase - 20.7) / 2.4;
      stretch = THREE.MathUtils.smoothstep(stretch, 0, 1);
      pose.position.y = stretch * 0.32;
      pose.rotation.x = stretch * 0.13;
      pose.scale.y = 1 + stretch * 0.045;
    };
    const [wx, wz] = worldPoint(side * 3.25, floorRadius * 0.83 + corridorLength + 1.55);
    colliders.push({ id: `${b.id}-stone-lion-${side}`, type: 'cylinder', x: wx, z: wz, radius: 0.95 });
  }

  // 香爐安排在廊道前緣，留出進亭空間。
  const incense = new THREE.Group();
  incense.position.set(0, 0.7, corridorLength + 1.2);
  corridor.add(incense);
  add(new THREE.CylinderGeometry(0.52, 0.38, 0.7, 10), gold, 0, 0.35, 0, incense);
  add(new THREE.TorusGeometry(0.48, 0.06, 6, 12).rotateX(Math.PI / 2), gold, 0, 0.72, 0, incense);
  for (const x of [-0.38, 0, 0.38]) add(new THREE.CylinderGeometry(0.018, 0.018, 0.9, 5), mats.darkWood, x, 1.35, 0, incense);

  // 開放式亭體的外圈低扶手只落在兩側，不封住正門與廊道。
  for (const side of [-1, 1]) {
    const rail = add(new THREE.BoxGeometry(0.14, 0.72, floorRadius * 0.74), mats.redLacquer, side * (floorRadius * 0.52), 1.28, -floorRadius * 0.18);
    rail.rotation.y = side * Math.PI / 4;
  }
  mergeByMaterial(pavilion);
  root.updateMatrixWorld(true);
  return { group: root, colliders };
}
