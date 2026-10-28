import * as THREE from 'three';
import type { BuildingInteractable, Collider } from '../types';
import { HALL_ZONES } from './exhibitHall';

/**
 * 藏書閣・書海（內部空間，和外觀分開）：
 * 從藏書閣大門走進去就傳送到這裡——一座挑高的圓形書廳
 * - 黑亮如鏡的地板與天花，滿牆發亮的書架
 * - 一圈八面拱門書牆（拱形曲面），四個方位各是一類書庫（資訊工程閣、經世商道閣、自然生命閣、人文哲思閣）
 * - 正中央一座直通天花的圓柱書塔，外面繞著一座螺旋階梯；兩側再各一座較細的書塔
 * - 南邊的發光拱門是出口，回到論道廣場
 * 位置在論道廣場地底深處（不會和地面上的東西重疊）
 */
export const LIB_HALL = { cx: 72, cz: -48, Y: -40, R: 17, H: 22 };

const KAI = '"DFKai-SB","BiauKai","Kaiti TC","STKaiti","KaiTi","LXGW WenKai TC","CWTeXKai","Noto Serif TC",serif';

/** 書架貼圖：一層層書架、彩色書背、每層下緣一條暖光 */
function shelfTexture(seed: number, rows = 4, light = true) {
  const W = 1024;
  const H = 1024;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  let s = seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  g.fillStyle = '#1a120c';
  g.fillRect(0, 0, W, H);
  const rowH = H / rows;
  const palette = ['#7a2a22', '#2f4f6b', '#d8c7a2', '#3c5a3a', '#b98a3a', '#5a3a5e', '#e9e0cc', '#8c5a2c', '#2a2a2e', '#a3472f', '#c9b48a', '#46607a'];
  for (let r = 0; r < rows; r++) {
    const y0 = r * rowH;
    // 書架內側（暖光）
    const gr = g.createLinearGradient(0, y0, 0, y0 + rowH);
    gr.addColorStop(0, light ? '#5a3a1e' : '#2a1c12');
    gr.addColorStop(1, '#1a110a');
    g.fillStyle = gr;
    g.fillRect(0, y0, W, rowH);
    // 書
    let x = 4;
    while (x < W - 4) {
      const w = 10 + Math.floor(rnd() * 18);
      const h = rowH * (0.62 + rnd() * 0.28);
      const tilt = rnd() < 0.05;
      g.fillStyle = palette[Math.floor(rnd() * palette.length)];
      if (tilt) {
        g.save();
        g.translate(x, y0 + rowH - 14);
        g.rotate(-0.18);
        g.fillRect(0, -h, w, h);
        g.restore();
        x += w + 8;
        continue;
      }
      g.fillRect(x, y0 + rowH - 14 - h, w, h);
      // 書背上的金線、書名
      g.fillStyle = 'rgba(255,230,170,0.35)';
      g.fillRect(x + 2, y0 + rowH - 14 - h + h * 0.18, w - 4, 2);
      g.fillRect(x + 2, y0 + rowH - 14 - h * 0.28, w - 4, 2);
      x += w + (rnd() < 0.12 ? 6 : 1);
      // 偶爾一段空位擺小擺飾
      if (rnd() < 0.03) x += 24;
    }
    // 層板（白色曲面書架的邊）
    g.fillStyle = '#f3efe6';
    g.fillRect(0, y0 + rowH - 14, W, 14);
    g.fillStyle = '#f3efe6';
    g.fillRect(0, y0, W, 6);
    if (light) {
      // 層板下的燈條
      const lg = g.createLinearGradient(0, y0 + 6, 0, y0 + 40);
      lg.addColorStop(0, 'rgba(255,214,150,0.75)');
      lg.addColorStop(1, 'rgba(255,214,150,0)');
      g.fillStyle = lg;
      g.fillRect(0, y0 + 6, W, 34);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

function signTexture(text: string, sub: string) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(12,10,8,0.85)';
  g.fillRect(0, 0, 1024, 256);
  g.strokeStyle = '#e8c36a';
  g.lineWidth = 6;
  g.strokeRect(10, 10, 1004, 236);
  g.fillStyle = '#ffe9b8';
  g.font = `900 104px ${KAI}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 512, 110, 960);
  g.font = `700 40px ${KAI}`;
  g.fillStyle = '#e8c36a';
  g.fillText(sub, 512, 202, 960);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createLibraryInterior(b: BuildingInteractable): THREE.Group {
  const { cx, cz, Y, R, H } = LIB_HALL;
  const root = new THREE.Group();
  root.name = `hall_${b.id}`;
  root.visible = false;
  root.userData.hallId = b.id;
  const colliders: Collider[] = [];
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, ry = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    root.add(m);
    return m;
  };
  const shelfMat = (seed: number, rx: number, ry: number, glow = 0.85) => {
    const t = shelfTexture(seed);
    t.repeat.set(rx, ry);
    return new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: glow, roughness: 0.7, side: THREE.DoubleSide });
  };
  const white = new THREE.MeshStandardMaterial({ color: 0xf1ede4, roughness: 0.35, emissive: 0xf1ede4, emissiveIntensity: 0.22 });
  const black = new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 0.08, metalness: 0.85, emissive: 0x050507, emissiveIntensity: 1 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.4, metalness: 0.7 });

  // ── 鏡面地板、鏡面天花（滿天小燈） ──
  add(new THREE.CircleGeometry(R + 0.5, 64).rotateX(-Math.PI / 2), black, cx, Y + 0.01, cz);
  // 地上一圈圈細金線，倒影感
  for (const r of [4.6, 9.2, 13.6]) add(new THREE.RingGeometry(r - 0.04, r + 0.04, 96).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x8a6a2a }), cx, Y + 0.02, cz);
  add(new THREE.CircleGeometry(R + 0.5, 64).rotateX(Math.PI / 2), black, cx, Y + H, cz);
  {
    const dot = new THREE.CircleGeometry(0.09, 8).rotateX(Math.PI / 2);
    const n = 260;
    const im = new THREE.InstancedMesh(dot, new THREE.MeshBasicMaterial({ color: 0xfff1d0 }), n);
    const m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const a = i * 2.399963;
      const rr = Math.sqrt((i + 0.5) / n) * (R - 0.8);
      m.makeTranslation(cx + Math.cos(a) * rr, Y + H - 0.02, cz + Math.sin(a) * rr);
      im.setMatrixAt(i, m);
    }
    root.add(im);
  }

  // ── 外圈：整面發亮的書牆 ──
  {
    const circ = Math.PI * 2 * R;
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 96, 1, true), shelfMat(1, circ / 4.5, H / 4.5));
    wall.material.side = THREE.BackSide;
    wall.position.set(cx, Y + H / 2, cz);
    root.add(wall);
    // 書牆上每隔幾層一圈白色曲面腰帶
    for (let k = 1; k < 5; k++) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(R - 0.1, 0.12, 6, 96).rotateX(Math.PI / 2), white);
      band.position.set(cx, Y + (k * H) / 5, cz);
      root.add(band);
    }
    const N = 72;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2;
      const a1 = ((i + 1) / N) * Math.PI * 2;
      colliders.push({ id: `lib-wall-${i}`, type: 'segment', x1: cx + Math.cos(a0) * (R - 0.6), z1: cz + Math.sin(a0) * (R - 0.6), x2: cx + Math.cos(a1) * (R - 0.6), z2: cz + Math.sin(a1) * (R - 0.6), halfThickness: 0.3 });
    }
  }

  // ── 內圈八面拱門書牆（曲面拱形），四個方位四類書庫 ──
  const zones = HALL_ZONES.library;
  const RI = 10.5;
  const ARCH = { w: 8.0, h: 11, open: 4.6, spring: 5.2 };
  for (let k = 0; k < 8; k++) {
    // 南邊（+Z，出口那面）不放牆，留給入口
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.5) continue;
    const px = cx + Math.cos(a) * RI;
    const pz = cz + Math.sin(a) * RI;
    const yaw = -a + Math.PI / 2; // 面朝圓心
    const shape = new THREE.Shape();
    shape.moveTo(-ARCH.w / 2, 0);
    shape.lineTo(-ARCH.open / 2, 0);
    shape.lineTo(-ARCH.open / 2, ARCH.spring);
    shape.absarc(0, ARCH.spring, ARCH.open / 2, Math.PI, 0, true);
    shape.lineTo(ARCH.open / 2, 0);
    shape.lineTo(ARCH.w / 2, 0);
    shape.lineTo(ARCH.w / 2, ARCH.h);
    // 頂部也是弧（曲面感）
    shape.absarc(0, ARCH.h - 1.2, ARCH.w / 2 + 0.4, Math.atan2(1.2, ARCH.w / 2 + 0.4), Math.PI - Math.atan2(1.2, ARCH.w / 2 + 0.4), false);
    shape.lineTo(-ARCH.w / 2, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.9, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2, curveSegments: 24 });
    geo.translate(0, 0, -0.45);
    // 正背面用書架貼圖（世界座標比例）
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 4.2, pos.getY(i) / 4.2);
    const mat = shelfMat(10 + k, 1, 1, 0.95);
    const m = new THREE.Mesh(geo, [mat, white]);
    m.position.set(px, Y, pz);
    m.rotation.y = yaw;
    root.add(m);
    // 拱門內緣的白色曲面框
    const frame = new THREE.Mesh(new THREE.TorusGeometry(ARCH.open / 2 + 0.05, 0.16, 8, 24, Math.PI), white);
    frame.position.set(px, Y + ARCH.spring, pz);
    frame.rotation.y = yaw;
    root.add(frame);
    // 碰撞：拱門兩側的牆墩（中間可以穿過去）
    const tx = Math.cos(yaw);
    const tz = -Math.sin(yaw);
    for (const s of [-1, 1]) {
      const e0 = ARCH.open / 2 + 0.1;
      const e1 = ARCH.w / 2;
      colliders.push({ id: `lib-arch-${k}-${s}`, type: 'segment', x1: px + tx * e0 * s, z1: pz + tz * e0 * s, x2: px + tx * e1 * s, z2: pz + tz * e1 * s, halfThickness: 0.55 });
    }
    // 每面拱牆屬於一類書庫（四類各兩面）：點了看這一類的討論
    const zi = Math.floor(((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 2)) % zones.length;
    const z = zones[zi];
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.1), new THREE.MeshBasicMaterial({ map: signTexture(z.name, z.sub), transparent: true }));
    sign.position.set(px - Math.cos(a) * 0.5, Y + ARCH.h + 0.9, pz - Math.sin(a) * 0.5);
    sign.rotation.y = yaw;
    root.add(sign);
    // 拱門上方的書庫看板（數量會自動更新）
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.78), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    plaque.position.set(px - Math.cos(a) * 0.5, Y + ARCH.spring + ARCH.open / 2 + 0.75, pz - Math.sin(a) * 0.5);
    plaque.rotation.y = yaw;
    plaque.userData.hallSign = { buildingId: b.id, zone: zi };
    root.add(plaque);
    const pick = new THREE.Mesh(new THREE.BoxGeometry(ARCH.w, ARCH.h, 1.4), new THREE.MeshBasicMaterial({ visible: false }));
    pick.position.set(px, Y + ARCH.h / 2, pz);
    pick.rotation.y = yaw;
    pick.userData.pick = { kind: 'booth', buildingId: b.id, zone: zi, index: 999 };
    pick.userData.noMerge = true;
    root.add(pick);
  }

  // ── 中央書塔＋螺旋階梯 ──
  {
    const TR = 2.3;
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(TR, TR, H, 48, 1, true), shelfMat(3, (Math.PI * 2 * TR) / 4.2, H / 4.2, 1.0));
    tower.position.set(cx, Y + H / 2, cz);
    root.add(tower);
    for (let k = 0; k <= 9; k++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(TR + 0.05, 0.09, 6, 48).rotateX(Math.PI / 2), white);
      ring.position.set(cx, Y + (k * H) / 9, cz);
      root.add(ring);
    }
    // 螺旋階梯：白色踏板繞著書塔往上，外側黑色扶手
    const turns = 2.2;
    const steps = 120;
    const rise = H * 0.82;
    const rs = TR + 1.1;
    const stepGeo = new THREE.BoxGeometry(1.7, 0.16, 0.55);
    const ims = new THREE.InstancedMesh(stepGeo, white, steps);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const helix: THREE.Vector3[] = [];
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const ang = t * turns * Math.PI * 2 + Math.PI / 2;
      const x = cx + Math.cos(ang) * rs;
      const z = cz + Math.sin(ang) * rs;
      const y = Y + 0.12 + t * rise;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -ang);
      m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
      ims.setMatrixAt(i, m4);
      helix.push(new THREE.Vector3(cx + Math.cos(ang) * (rs + 0.85), y + 1.0, cz + Math.sin(ang) * (rs + 0.85)));
    }
    root.add(ims);
    // 階梯底面的白色曲面（螺旋帶）
    {
      const seg = 200;
      const posArr: number[] = [];
      const idx: number[] = [];
      for (let i = 0; i <= seg; i++) {
        const t = i / seg;
        const ang = t * turns * Math.PI * 2 + Math.PI / 2;
        const y = Y + t * rise - 0.05;
        for (const rr of [TR + 0.25, rs + 0.85]) posArr.push(cx + Math.cos(ang) * rr, y, cz + Math.sin(ang) * rr);
        if (i < seg) {
          const a0 = i * 2;
          idx.push(a0, a0 + 1, a0 + 2, a0 + 1, a0 + 3, a0 + 2);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      const ribbon = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xece7dc, roughness: 0.4, emissive: 0xece7dc, emissiveIntensity: 0.18, side: THREE.DoubleSide }));
      root.add(ribbon);
    }
    const rail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), 300, 0.05, 6, false), railMat);
    root.add(rail);
    // 扶手立柱
    const balGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.0, 4);
    const bal = new THREE.InstancedMesh(balGeo, railMat, Math.floor(steps / 2));
    for (let i = 0; i < steps; i += 2) {
      const p = helix[i];
      m4.makeTranslation(p.x, p.y - 0.5, p.z);
      bal.setMatrixAt(i / 2, m4);
    }
    root.add(bal);
    colliders.push({ id: 'lib-tower', type: 'cylinder', x: cx, z: cz, radius: rs + 1.0 });
  }

  // ── 兩側較細的書塔（東、西）──
  for (const s of [-1, 1]) {
    const tr = 1.35;
    const x = cx + s * 6.4;
    const z = cz - 1.5;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(tr, tr, H, 36, 1, true), shelfMat(20 + s, (Math.PI * 2 * tr) / 4.2, H / 4.2, 1.0));
    t.position.set(x, Y + H / 2, z);
    root.add(t);
    for (let k = 0; k <= 11; k++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(tr + 0.04, 0.07, 6, 36).rotateX(Math.PI / 2), white);
      ring.position.set(x, Y + (k * H) / 11, z);
      root.add(ring);
    }
    colliders.push({ id: `lib-side-tower-${s}`, type: 'cylinder', x, z, radius: tr + 0.4 });
  }

  // ── 上方一圈懸空的弧形書廊（看得到、走不到，像照片裡層層疊疊的書架） ──
  for (const yy of [9.5, 15.5]) {
    const g = new THREE.Mesh(new THREE.CylinderGeometry(RI + 1.8, RI + 1.8, 2.4, 96, 1, true), shelfMat(40 + yy, (Math.PI * 2 * (RI + 1.8)) / 4.2, 2.4 / 4.2 * 1.0, 0.9));
    g.position.set(cx, Y + yy + 1.2, cz);
    root.add(g);
    const floorRing = new THREE.Mesh(new THREE.RingGeometry(RI + 1.8, R, 96).rotateX(-Math.PI / 2), white);
    floorRing.position.set(cx, Y + yy, cz);
    root.add(floorRing);
    const under = new THREE.Mesh(new THREE.RingGeometry(RI + 1.8, R, 96).rotateX(Math.PI / 2), white);
    under.position.set(cx, Y + yy - 0.25, cz);
    root.add(under);
    const railRing = new THREE.Mesh(new THREE.TorusGeometry(RI + 1.75, 0.05, 6, 96).rotateX(Math.PI / 2), railMat);
    railRing.position.set(cx, Y + yy + 1.05, cz);
    root.add(railRing);
  }

  // ── 南邊出口：發光拱門「回到論道廣場」 ──
  {
    const ez = cz + R - 0.7;
    const frame = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.2, 10, 32, Math.PI), new THREE.MeshBasicMaterial({ color: 0xffd98a }));
    frame.position.set(cx, Y + 2.6, ez);
    root.add(frame);
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.4, 2.6, 0.4), new THREE.MeshBasicMaterial({ color: 0xffd98a }), cx + s * 1.8, Y + 1.3, ez);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.3), new THREE.MeshBasicMaterial({ color: 0xfff2d0, transparent: true, opacity: 0.55 }));
    glow.position.set(cx, Y + 2.15, ez + 0.05);
    glow.rotation.y = Math.PI;
    root.add(glow);
    const s1 = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), new THREE.MeshBasicMaterial({ map: signTexture('出口', '回到論道廣場'), transparent: true }));
    s1.position.set(cx, Y + 5.2, ez - 0.1);
    s1.rotation.y = Math.PI;
    root.add(s1);
    const pick = new THREE.Mesh(new THREE.BoxGeometry(4, 4.6, 1.2), new THREE.MeshBasicMaterial({ visible: false }));
    pick.position.set(cx, Y + 2.3, ez);
    pick.userData.pick = { kind: 'goFloor', buildingId: b.id, level: 0 };
    pick.userData.noMerge = true;
    root.add(pick);
    const title = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.8), new THREE.MeshBasicMaterial({ map: signTexture('藏書閣・書海', '書架上每一本書都是站上的一則討論，點拱門書牆看該類典籍'), transparent: true }));
    title.position.set(cx, Y + 12.4, cz - RI + 0.3);
    root.add(title);
  }

  // ── 幾盞暖光 ──
  for (const [dx, dy, dz] of [
    [0, 8, 6],
    [0, 15, -6],
    [-9, 6, 0],
    [9, 6, 0],
  ] as [number, number, number][]) {
    const l = new THREE.PointLight(0xffd7a0, 30, 26, 1.6);
    l.position.set(cx + dx, Y + dy, cz + dz);
    root.add(l);
  }

  root.traverse((o) => (o.userData.noMerge = true));
  root.userData.hallColliders = colliders;
  return root;
}

/** 進書廳的位置：出口拱門內側，面向中央書塔（yaw 0 面向 -Z） */
export function libraryArrival() {
  return { x: LIB_HALL.cx, y: LIB_HALL.Y, z: LIB_HALL.cz + LIB_HALL.R - 3.2, yaw: 0 };
}
/** 是否走到出口拱門 */
export function atLibraryExit(x: number, z: number) {
  return Math.abs(x - LIB_HALL.cx) < 1.6 && z > LIB_HALL.cz + LIB_HALL.R - 1.9;
}
