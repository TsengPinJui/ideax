import * as THREE from 'three';
import type { Collider } from '../types';
import { localToWorldXZ } from '../regionConfigs';
import { getStyleMaterials, buildRoofTier, mergeByMaterial, LanternBatch, scaledBox } from './architecture';
import { signboardTexture, coupletTexture, scrollPaintingTexture } from './textures';
import { makePickProxy } from '../picking';
import { DOOR_COUPLETS } from '../couplets';

/**
 * 創點樓外圍的客家圓形土樓（照 /island）：夯土環形外牆、石砌護裙、環形黛瓦大屋頂＋鎏金環脊、
 * 內側跑馬廊掛滿紅燈籠、正面青石拱門樓（重簷、金匾、抱鼓石、門聯、石階）。中央就是原本的多層樓閣。
 */
export const TULOU_RADIUS = 16;

let earthMat: THREE.MeshStandardMaterial | null = null;
function earth() {
  if (!earthMat) earthMat = new THREE.MeshStandardMaterial({ color: 0xd2b184, roughness: 0.97, side: THREE.DoubleSide });
  return earthMat;
}

interface TulouInput {
  id: string;
  name: string;
  position: THREE.Vector3;
  facingYaw: number;
  doorWidth?: number;
}

/** 圓柱壁的一段（theta 0 ＝ 本地 +Z 正面） */
function arcWall(r: number, y0: number, h: number, t0: number, t1: number, seg: number) {
  const g = new THREE.CylinderGeometry(r, r, h, seg, 1, true, t0, t1 - t0);
  g.translate(0, y0 + h / 2, 0);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const arcLen = r * (t1 - t0);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * arcLen) / 2.4, (uv.getY(i) * h) / 2.4);
  return g;
}

export function createTulouShell(b: TulouInput): THREE.Group {
  const mats = getStyleMaterials();
  const R = TULOU_RADIUS;
  const T = 0.9; // 牆厚
  const H = 9.0; // 外牆高（兩層樓）
  const gateW = (b.doorWidth || 4.8) + 0.6;
  const gateH = 4.6;
  const gap = gateW / 2 / R;
  const root = new THREE.Group();
  root.position.copy(b.position);
  root.rotation.y = b.facingYaw;
  root.name = `tulou_${b.id}`;
  const body = new THREE.Group();
  root.add(body);
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, ry = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    body.add(m);
    return m;
  };
  const lanterns = new LanternBatch();
  const t0 = gap;
  const t1 = Math.PI * 2 - gap;

  // 石砌台基與護裙
  add(arcWall(R + 0.55, 0, 0.5, t0 - 0.02, t1 + 0.02, 96), mats.stone);
  add(new THREE.RingGeometry(R, R + 0.55, 96, 1, Math.PI / 2 + t0, t1 - t0).rotateX(-Math.PI / 2), mats.stoneLight, 0, 0.5, 0);
  add(arcWall(R + 0.04, 0, 1.6, t0, t1, 96), mats.stone);
  // 夯土外牆（外面、裡面、牆頂），門洞上方的門楣牆
  add(arcWall(R, 1.6, H - 1.6, t0, t1, 96), earth());
  add(arcWall(R - T, 0, H, t0, t1, 96), earth());
  add(arcWall(R, gateH, H - gateH, -gap, gap, 8), earth());
  add(arcWall(R - T, gateH, H - gateH, -gap, gap, 8), earth());
  // 門洞兩側的牆端面與拱頂
  for (const s of [-1, 1]) {
    const th = s * gap;
    add(new THREE.BoxGeometry(0.12, gateH, T), mats.stone, Math.sin(th) * (R - T / 2), gateH / 2, Math.cos(th) * (R - T / 2), th + Math.PI / 2);
  }
  add(new THREE.BoxGeometry(gateW, 0.2, T), mats.stone, 0, gateH, R - T / 2);
  // 外牆腰線
  add(arcWall(R + 0.06, 4.45, 0.18, t0, t1, 96), mats.darkWood);

  // 外牆一圈小窗（二樓、三樓高度，正面門樓附近不開）
  const winGeo = new THREE.BoxGeometry(0.7, 0.9, 0.14);
  const frameGeo = new THREE.BoxGeometry(0.86, 1.06, 0.1);
  const nWin = 24;
  for (let i = 0; i < nWin; i++) {
    const th = (i / nWin) * Math.PI * 2 + Math.PI / nWin;
    if (Math.cos(th) > 0.93) continue;
    for (const wy of [5.6, 7.6]) {
      const x = Math.sin(th) * (R + 0.04);
      const z = Math.cos(th) * (R + 0.04);
      add(frameGeo, mats.darkWood, x, wy, z, th);
      add(winGeo, mats.lampPaper, Math.sin(th) * (R + 0.08), wy, Math.cos(th) * (R + 0.08), th);
    }
  }

  // 環形黛瓦大屋頂（外簷 → 屋脊 → 內簷），整圈連續
  const prof = [
    new THREE.Vector2(R + 1.9, H - 0.25),
    new THREE.Vector2(R + 0.9, H + 0.55),
    new THREE.Vector2(R - 0.45, H + 2.15),
    new THREE.Vector2(R - 1.7, H + 1.2),
    new THREE.Vector2(R - 2.7, H + 0.55),
  ];
  const roofGeo = new THREE.LatheGeometry(prof, 96);
  {
    const uv = roofGeo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * Math.PI * 2 * R) / 1.5, (uv.getY(i) * 6.2) / 1.5);
  }
  const roof = add(roofGeo, mats.roofs.slate);
  roof.castShadow = true;
  const under = add(roofGeo.clone(), mats.roofUnder, 0, -0.12, 0);
  under.castShadow = false;
  // 鎏金環脊＋放射狀瓦壟脊線
  add(new THREE.TorusGeometry(R - 0.45, 0.2, 8, 96).rotateX(Math.PI / 2), mats.gold, 0, H + 2.2, 0);
  const nRib = 28;
  for (let i = 0; i < nRib; i++) {
    const th = (i / nRib) * Math.PI * 2;
    const a = new THREE.Vector3(Math.sin(th) * (R - 0.45), H + 2.15, Math.cos(th) * (R - 0.45));
    const c = new THREE.Vector3(Math.sin(th) * (R + 1.85), H - 0.2, Math.cos(th) * (R + 1.85));
    const len = a.distanceTo(c);
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, len), mats.ridges.slate);
    rib.position.copy(a).add(c).multiplyScalar(0.5);
    rib.lookAt(c.x + root.position.x, c.y, c.z + root.position.z);
    rib.position.y += 0.08;
    // lookAt 用的是世界座標；body 還沒有轉向，所以直接用本地方向重算
    rib.rotation.set(0, 0, 0);
    const dir = c.clone().sub(a).normalize();
    rib.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    body.add(rib);
  }

  // 內側跑馬廊（二樓高度）：木廊、欄杆、一整圈紅燈籠
  const gy = 4.5;
  const gIn = R - T - 1.5;
  add(new THREE.RingGeometry(gIn, R - T, 96, 1).rotateX(-Math.PI / 2), mats.woodFloor, 0, gy, 0);
  add(new THREE.RingGeometry(gIn, R - T, 96, 1).rotateX(Math.PI / 2), mats.darkWood, 0, gy - 0.12, 0);
  add(arcWall(gIn, gy, 0.85, 0, Math.PI * 2, 96), mats.balustrade);
  add(new THREE.TorusGeometry(gIn, 0.06, 6, 96).rotateX(Math.PI / 2), mats.redLacquer, 0, gy + 0.9, 0);
  const nPost = 32;
  for (let i = 0; i < nPost; i++) {
    const th = (i / nPost) * Math.PI * 2;
    add(new THREE.CylinderGeometry(0.14, 0.14, gy, 8), mats.redLacquer, Math.sin(th) * (gIn + 0.1), gy / 2, Math.cos(th) * (gIn + 0.1));
    add(new THREE.CylinderGeometry(0.11, 0.11, H - gy + 0.4, 8), mats.redLacquer, Math.sin(th) * (gIn + 0.1), gy + (H - gy + 0.4) / 2, Math.cos(th) * (gIn + 0.1));
    const lt = th + Math.PI / nPost;
    lanterns.addHanging(Math.sin(lt) * (gIn + 0.4), gy - 0.75, Math.cos(lt) * (gIn + 0.4), 0.75);
    lanterns.addHanging(Math.sin(lt) * (gIn + 0.4), H - 0.4, Math.cos(lt) * (gIn + 0.4), 0.65);
  }

  // 正面青石拱門樓：石框、金匾、重簷、抱鼓石、門聯、石階
  const fz = R + 0.25;
  for (const s of [-1, 1]) {
    add(scaledBox(0.9, gateH + 1.3, 0.7, 1.2, 1.2, 1.2), mats.stoneLight, s * (gateW / 2 + 0.45), (gateH + 1.3) / 2, fz);
    const drum = add(new THREE.CylinderGeometry(0.55, 0.55, 0.32, 18), mats.sculpt, s * (gateW / 2 + 0.45), 1.05, fz + 0.7);
    drum.rotation.z = Math.PI / 2;
    add(new THREE.BoxGeometry(0.5, 0.5, 0.9), mats.sculpt, s * (gateW / 2 + 0.45), 0.25, fz + 0.7);
  }
  add(new THREE.TorusGeometry(gateW / 2, 0.22, 8, 24, Math.PI).scale(1, 0.32, 1), mats.stoneLight, 0, gateH - 0.05, fz);
  add(scaledBox(gateW + 1.8, 0.5, 0.75, 1.5, 0.5, 1.5), mats.stoneLight, 0, gateH + 0.25, fz);
  const signMat = new THREE.MeshStandardMaterial({ map: signboardTexture(b.name, '痛點懸賞・四層樓'), roughness: 0.55, metalness: 0.1 });
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.15, 0.16), [mats.darkWood, mats.darkWood, mats.darkWood, mats.darkWood, signMat, mats.darkWood]);
  plaque.position.set(0, gateH + 1.15, fz + 0.32);
  plaque.userData.noMerge = true;
  root.add(plaque);
  const roof1 = buildRoofTier(gateW + 2.6, 1.8, { rise: 0.85, overhang: 0.8, curl: 0.5, theme: 'slate', ridge: true, lite: true, horns: false });
  roof1.position.set(0, gateH + 1.85, fz);
  body.add(roof1);
  const roof2 = buildRoofTier(gateW + 0.8, 1.3, { rise: 0.7, overhang: 0.65, curl: 0.45, theme: 'slate', ridge: true, lite: true, horns: false });
  roof2.position.set(0, gateH + 2.9, fz - 0.1);
  add(new THREE.BoxGeometry(gateW + 0.6, 0.85, 1.0), earth(), 0, gateH + 2.45, fz - 0.1);
  body.add(roof2);
  const couplet = DOOR_COUPLETS[b.id];
  if (couplet) {
    for (const s of [1, -1]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 3.2), new THREE.MeshStandardMaterial({ map: coupletTexture(s > 0 ? couplet[0] : couplet[1]), roughness: 0.85 }));
      m.position.set(s * (gateW / 2 + 0.45), 2.45, fz + 0.36);
      m.userData.noMerge = true;
      root.add(m);
    }
  }
  for (const s of [-1, 1]) lanterns.addHanging(s * (gateW / 2 + 1.5), gateH - 0.2, fz + 1.0, 1.1);
  for (let k = 0; k < 3; k++) add(scaledBox(gateW + 2.6 - k * 0.4, 0.16, 0.6, 1.5, 0.16, 1.5), mats.stoneLight, 0, 0.08 + (2 - k) * 0.0, fz + 1.6 + k * 0.55);

  // 天井西側：創點舞台（戲台：台基、紅柱、小屋頂、背幕與匾額、台前石階）
  {
    const sg = new THREE.Group();
    sg.position.set(-12.0, 0, 0);
    sg.rotation.y = Math.PI / 2; // 台口朝東（朝中央樓閣與大門方向）
    body.add(sg);
    const sw = 6.0;
    const sd = 2.8;
    const sh = 0.85;
    const a2 = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      sg.add(m);
      return m;
    };
    a2(scaledBox(sw, sh, sd, 1.5, sh, 1.5), mats.stone, 0, sh / 2, 0);
    a2(scaledBox(sw - 0.2, 0.08, sd - 0.2, 2, 0.08, 2), mats.woodFloor, 0, sh + 0.04, 0);
    a2(new THREE.BoxGeometry(sw - 0.6, 0.05, sd * 0.6), mats.rug, 0, sh + 0.1, 0.1);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) a2(new THREE.CylinderGeometry(0.15, 0.17, 2.6, 10), mats.redLacquer, sx * (sw / 2 - 0.2), sh + 1.3, sz * (sd / 2 - 0.2));
    a2(new THREE.BoxGeometry(sw + 0.2, 0.3, 0.3), mats.redLacquer, 0, sh + 2.6, sd / 2 - 0.2);
    // 背幕：山水畫
    const back = new THREE.Mesh(new THREE.PlaneGeometry(sw - 0.6, 2.3), new THREE.MeshStandardMaterial({ map: scrollPaintingTexture(5), roughness: 0.9 }));
    back.position.set(0, sh + 1.3, -sd / 2 + 0.15);
    back.userData.noMerge = true;
    sg.add(back);
    a2(new THREE.BoxGeometry(sw - 0.4, 2.5, 0.12), mats.darkWood, 0, sh + 1.3, -sd / 2 + 0.06);
    const smat = new THREE.MeshStandardMaterial({ map: signboardTexture('創點舞台', '提案發表・創星季'), roughness: 0.55 });
    const splaque = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.62, 0.1), [mats.darkWood, mats.darkWood, mats.darkWood, mats.darkWood, smat, mats.darkWood]);
    splaque.position.set(0, sh + 2.95, sd / 2 - 0.15);
    splaque.userData.noMerge = true;
    sg.add(splaque);
    const sroof = buildRoofTier(sw, sd, { rise: 0.55, overhang: 0.45, curl: 0.3, theme: 'red', ridge: true, lite: true, horns: false });
    sroof.position.y = sh + 2.75;
    sroof.scale.y = 0.85;
    sg.add(sroof);
    for (let k = 0; k < 3; k++) a2(scaledBox(2.2, 0.28, 0.4, 1, 0.28, 1), mats.stoneLight, 0, sh - 0.14 - k * 0.28, sd / 2 + 0.2 + k * 0.4);
    for (const sx of [-1, 1]) lanterns.addHanging(-12.0 + 0, sh + 2.35, sx * (sw / 2 - 0.3), 0.7);
  }
  // 天井東側：提案桌（長案、卷軸、筆墨、匾額、兩張圓凳）
  {
    const tg = new THREE.Group();
    tg.position.set(12.0, 0, 0);
    tg.rotation.y = -Math.PI / 2;
    body.add(tg);
    const a2 = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      tg.add(m);
      return m;
    };
    a2(new THREE.BoxGeometry(2.8, 0.1, 1.1), mats.redLacquer, 0, 0.82, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) a2(new THREE.BoxGeometry(0.1, 0.78, 0.1), mats.darkWood, sx * 1.25, 0.39, sz * 0.45);
    for (const [x, z] of [[-0.8, 0.05], [0.1, -0.1], [0.75, 0.15]] as [number, number][]) {
      const roll = a2(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 10), mats.plaster, x, 0.94, z);
      roll.rotation.z = Math.PI / 2;
    }
    a2(new THREE.BoxGeometry(0.3, 0.05, 0.22), mats.ridges.slate, 1.05, 0.9, -0.25);
    a2(new THREE.CylinderGeometry(0.09, 0.08, 0.24, 10), mats.pot, -1.1, 0.99, -0.3);
    const tmat = new THREE.MeshStandardMaterial({ map: signboardTexture('提案桌', '把點子寫成提案'), roughness: 0.55 });
    const tplaque = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 0.06), [mats.darkWood, mats.darkWood, mats.darkWood, mats.darkWood, tmat, mats.darkWood]);
    tplaque.position.set(0, 1.12, -0.45);
    tplaque.rotation.x = -0.2;
    tplaque.userData.noMerge = true;
    tg.add(tplaque);
    for (const sx of [-0.7, 0.7]) a2(new THREE.CylinderGeometry(0.24, 0.2, 0.46, 12), mats.redLacquer, sx, 0.23, 0.95);
  }

  mergeByMaterial(body);
  root.add(lanterns.build());

  // 碰撞：外牆一圈（門洞留空）、門樓石柱與抱鼓石
  const colliders: Collider[] = [];
  const N = 72;
  const rc = R - T / 2;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2;
    const a1 = ((i + 1) / N) * Math.PI * 2;
    const mid = (a0 + a1) / 2;
    const md = Math.atan2(Math.sin(mid), Math.cos(mid));
    if (Math.abs(md) < gap + (Math.PI * 2) / N / 2) continue;
    const [x1, z1] = localToWorldXZ(b.position.x, b.position.z, b.facingYaw, Math.sin(a0) * rc, Math.cos(a0) * rc);
    const [x2, z2] = localToWorldXZ(b.position.x, b.position.z, b.facingYaw, Math.sin(a1) * rc, Math.cos(a1) * rc);
    colliders.push({ id: `${b.id}-tulou-${i}`, type: 'segment', x1, z1, x2, z2, halfThickness: T / 2 + 0.05 } as Collider);
  }
  // 門洞兩側（讓碰撞剛好接到門洞）
  for (const s of [-1, 1]) {
    const [x1, z1] = localToWorldXZ(b.position.x, b.position.z, b.facingYaw, s * (gateW / 2 + 0.15), R - T);
    const [x2, z2] = localToWorldXZ(b.position.x, b.position.z, b.facingYaw, s * (gateW / 2 + 0.9), fz);
    colliders.push({ id: `${b.id}-gatejamb-${s}`, type: 'segment', x1, z1, x2, z2, halfThickness: 0.35 } as Collider);
    const [dx, dz] = localToWorldXZ(b.position.x, b.position.z, b.facingYaw, s * (gateW / 2 + 0.45), fz + 0.7);
    colliders.push({ id: `${b.id}-drum-${s}`, type: 'cylinder', x: dx, z: dz, radius: 0.5 } as Collider);
  }
  // 舞台與提案桌的碰撞＋點擊範圍
  const rect = (id: string, cx0: number, cz0: number, hw: number, hd: number) => {
    const corners: [number, number][] = [[cx0 - hw, cz0 - hd], [cx0 + hw, cz0 - hd], [cx0 + hw, cz0 + hd], [cx0 - hw, cz0 + hd]];
    corners.forEach(([ax, az], i) => {
      const [bx2, bz2] = corners[(i + 1) % 4];
      const [x1, z1] = localToWorldXZ(b.position.x, b.position.z, b.facingYaw, ax, az);
      const [x2, z2] = localToWorldXZ(b.position.x, b.position.z, b.facingYaw, bx2, bz2);
      colliders.push({ id: `${b.id}-${id}-${i}`, type: 'segment', x1, z1, x2, z2, halfThickness: 0.15 } as Collider);
    });
  };
  rect('stage', -12.0, 0, 1.6, 3.1);
  rect('ptable', 12.0, 0, 0.65, 1.5);
  root.add(makePickProxy(3.6, 4.0, 6.4, -12.0, 0, 0, { kind: 'feature', id: 'stage' }));
  root.add(makePickProxy(1.8, 1.8, 3.2, 12.0, 0, 0, { kind: 'feature', id: 'proposal' }));
  root.userData.colliders = colliders;
  // 點外牆也能打開創點樓介紹
  root.add(makePickProxy(R * 2 + 1, H + 2.5, R * 2 + 1, 0, 0, 0, { kind: 'building', id: b.id }));
  return root;
}
