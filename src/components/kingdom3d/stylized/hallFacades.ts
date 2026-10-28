import * as THREE from 'three';
import type { BuildingInteractable, Collider } from '../types';
import { getStyleMaterials, mergeByMaterial, buildRoofTier } from './architecture';
import { lobbyPit } from './hallLobby';

/**
 * 展覽館、電玩城的門面（照參考圖）：
 * - 展覽館：中央金框玻璃大廳（兩坡玻璃頂、山牆上的燈泡金徽）、兩側飛簷樓閣、玻璃帷幕正面、「創意展覽館」黑底金字匾、
 *   「創意無界」「點亮未來」大紅條幅、白底山水燈泡幡、大廳裡懸吊的金色燈泡雕塑、寬石階、石燈籠、盆景松、幡旗
 * - 電玩城：深色木構框＋粉紅透光格窗、正門上方的大紅布幔（霓虹遊戲手把與星環）、黑底金字匾、
 *   「親子同樂」「雅俗共賞」門簾、水墨幡、手把宮燈、屋頂玻璃穹頂、入口霓虹光環、紅毯石階
 * - 薈萃廣場：廣場地面的金色圓環徽（薈萃廣場・IdeaX）與電玩城前的手把地徽
 * 本地座標：+Z 朝大門外
 */

const KAI = '"DFKai-SB","BiauKai","Kaiti TC","STKaiti","KaiTi","LXGW WenKai TC","CWTeXKai","Noto Serif TC",serif';

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function drawBulb(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, lw = 4) {
  g.strokeStyle = color;
  g.lineWidth = lw;
  g.beginPath();
  g.arc(cx, cy, r, Math.PI * 0.8, Math.PI * 2.2);
  g.lineTo(cx + r * 0.45, cy + r * 1.1);
  g.lineTo(cx - r * 0.45, cy + r * 1.1);
  g.closePath();
  g.stroke();
  for (let k = 0; k < 2; k++) {
    g.beginPath();
    g.moveTo(cx - r * 0.42, cy + r * (1.3 + k * 0.22));
    g.lineTo(cx + r * 0.42, cy + r * (1.3 + k * 0.22));
    g.stroke();
  }
  // 燈絲
  g.beginPath();
  g.moveTo(cx - r * 0.3, cy + r * 0.2);
  g.lineTo(cx - r * 0.1, cy - r * 0.2);
  g.lineTo(cx + r * 0.1, cy + r * 0.2);
  g.lineTo(cx + r * 0.3, cy - r * 0.2);
  g.stroke();
}

function drawController(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string, lw = 5) {
  g.strokeStyle = color;
  g.lineWidth = lw;
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(cx - s, cy - s * 0.35);
  g.quadraticCurveTo(cx - s * 1.25, cy + s * 0.9, cx - s * 0.75, cy + s * 0.75);
  g.quadraticCurveTo(cx - s * 0.5, cy + s * 0.25, cx - s * 0.25, cy + s * 0.25);
  g.lineTo(cx + s * 0.25, cy + s * 0.25);
  g.quadraticCurveTo(cx + s * 0.5, cy + s * 0.25, cx + s * 0.75, cy + s * 0.75);
  g.quadraticCurveTo(cx + s * 1.25, cy + s * 0.9, cx + s, cy - s * 0.35);
  g.quadraticCurveTo(cx + s * 0.9, cy - s * 0.6, cx + s * 0.5, cy - s * 0.6);
  g.lineTo(cx - s * 0.5, cy - s * 0.6);
  g.quadraticCurveTo(cx - s * 0.9, cy - s * 0.6, cx - s, cy - s * 0.35);
  g.stroke();
  // 十字鍵與按鈕
  g.beginPath();
  g.moveTo(cx - s * 0.7, cy - s * 0.15);
  g.lineTo(cx - s * 0.3, cy - s * 0.15);
  g.moveTo(cx - s * 0.5, cy - s * 0.35);
  g.lineTo(cx - s * 0.5, cy + s * 0.05);
  g.stroke();
  for (const [dx, dy] of [
    [0.45, -0.3],
    [0.65, -0.12],
  ]) {
    g.beginPath();
    g.arc(cx + s * dx, cy + s * dy, s * 0.08, 0, Math.PI * 2);
    g.stroke();
  }
}

/** 黑底金字匾 */
function plaqueTex(main: string, sub: string) {
  return canvasTex(1024, 256, (g) => {
    g.fillStyle = '#c9963a';
    g.fillRect(0, 0, 1024, 256);
    g.fillStyle = '#141010';
    g.fillRect(12, 12, 1000, 232);
    g.strokeStyle = '#e2b85a';
    g.lineWidth = 4;
    g.strokeRect(28, 28, 968, 200);
    g.fillStyle = '#f2cf7a';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `900 112px ${KAI}`;
    g.fillText(main, 512, 112);
    g.font = `700 40px serif`;
    g.fillText(sub, 512, 196);
    g.fillRect(330, 196, 70, 3);
    g.fillRect(624, 196, 70, 3);
  });
}

/** 大紅條幅／門簾：金邊、上方圖示、直書金字 */
function coupletTex(text: string, icon: 'bulb' | 'pad') {
  return canvasTex(256, 1280, (g) => {
    g.fillStyle = '#a31d18';
    g.fillRect(0, 0, 256, 1280);
    const gr = g.createLinearGradient(0, 0, 256, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0.25)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.06)');
    gr.addColorStop(1, 'rgba(0,0,0,0.25)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 1280);
    g.strokeStyle = '#e2b85a';
    g.lineWidth = 8;
    g.strokeRect(16, 16, 224, 1248);
    g.lineWidth = 2;
    g.strokeRect(30, 30, 196, 1220);
    if (icon === 'bulb') drawBulb(g, 128, 130, 44, '#f2cf7a', 5);
    else drawController(g, 128, 140, 58, '#f2cf7a', 6);
    g.fillStyle = '#f2cf7a';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `900 150px ${KAI}`;
    [...text].forEach((ch, i) => g.fillText(ch, 128, 330 + i * 230));
  });
}

/** 白底山水燈泡幡 */
function landscapeBannerTex() {
  return canvasTex(256, 1024, (g) => {
    g.fillStyle = '#f4efe3';
    g.fillRect(0, 0, 256, 1024);
    g.strokeStyle = '#c9963a';
    g.lineWidth = 6;
    g.strokeRect(10, 10, 236, 1004);
    drawBulb(g, 128, 120, 40, '#b8862b', 4);
    // 水墨山
    for (let k = 0; k < 4; k++) {
      const y0 = 420 + k * 140;
      g.fillStyle = `rgba(40,50,60,${0.18 + k * 0.12})`;
      g.beginPath();
      g.moveTo(10, y0 + 120);
      for (let x = 10; x <= 246; x += 12) g.lineTo(x, y0 + 120 - Math.abs(Math.sin(x * 0.04 + k * 1.7)) * (70 + k * 10));
      g.lineTo(246, y0 + 140);
      g.lineTo(10, y0 + 140);
      g.fill();
    }
    // 松
    g.fillStyle = 'rgba(30,60,40,0.6)';
    for (let k = 0; k < 3; k++) {
      g.beginPath();
      g.ellipse(70 + k * 50, 860 - k * 20, 30, 10, -0.2, 0, Math.PI * 2);
      g.fill();
    }
  });
}

/** 水墨幡（黑底紅白潑墨） */
function inkBannerTex(seed: number) {
  return canvasTex(256, 1024, (g) => {
    g.fillStyle = '#1b1820';
    g.fillRect(0, 0, 256, 1024);
    let s = seed;
    const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let k = 0; k < 26; k++) {
      g.fillStyle = k % 3 === 0 ? 'rgba(200,40,40,0.55)' : 'rgba(240,235,230,0.5)';
      g.beginPath();
      g.ellipse(r() * 256, 120 + r() * 800, 20 + r() * 70, 8 + r() * 26, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = '#c9963a';
    g.lineWidth = 6;
    g.strokeRect(8, 8, 240, 1008);
  });
}

/** 大紅布幔：霓虹遊戲手把＋星環＋四角星 */
function neonPadTex() {
  return canvasTex(1024, 704, (g) => {
    const gr = g.createRadialGradient(512, 330, 40, 512, 330, 620);
    gr.addColorStop(0, '#b3221c');
    gr.addColorStop(1, '#5e0d0a');
    g.fillStyle = gr;
    g.fillRect(0, 0, 1024, 704);
    g.strokeStyle = '#c9963a';
    g.lineWidth = 10;
    g.strokeRect(14, 14, 996, 676);
    const neon = (draw: () => void) => {
      g.save();
      g.shadowColor = '#ffb04a';
      g.shadowBlur = 28;
      draw();
      g.restore();
      draw();
    };
    neon(() => {
      g.strokeStyle = '#ffd27a';
      g.lineWidth = 10;
      g.beginPath();
      g.ellipse(512, 360, 330, 92, -0.12, 0, Math.PI * 2);
      g.stroke();
      drawController(g, 512, 350, 170, '#fff1c8', 14);
      // 四角星
      g.fillStyle = '#fff1c8';
      g.beginPath();
      const sx = 512;
      const sy = 120;
      g.moveTo(sx, sy - 46);
      g.lineTo(sx + 12, sy - 12);
      g.lineTo(sx + 46, sy);
      g.lineTo(sx + 12, sy + 12);
      g.lineTo(sx, sy + 46);
      g.lineTo(sx - 12, sy + 12);
      g.lineTo(sx - 46, sy);
      g.lineTo(sx - 12, sy - 12);
      g.closePath();
      g.fill();
    });
  });
}

/** 廣場地徽：金色圓環＋字或圖示 */
function medallionTex(main: string | null, sub: string, icon: 'pad' | null) {
  return canvasTex(1024, 1024, (g) => {
    g.clearRect(0, 0, 1024, 1024);
    const ring = (r: number, lw: number, col: string) => {
      g.strokeStyle = col;
      g.lineWidth = lw;
      g.beginPath();
      g.arc(512, 512, r, 0, Math.PI * 2);
      g.stroke();
    };
    g.fillStyle = 'rgba(236,224,200,0.55)';
    g.beginPath();
    g.arc(512, 512, 500, 0, Math.PI * 2);
    g.fill();
    ring(496, 18, '#a8792a');
    ring(470, 6, '#d8a945');
    ring(330, 14, '#a8792a');
    ring(300, 4, '#d8a945');
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      g.strokeStyle = 'rgba(168,121,42,0.7)';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(512 + Math.cos(a) * 340, 512 + Math.sin(a) * 340);
      g.lineTo(512 + Math.cos(a) * 460, 512 + Math.sin(a) * 460);
      g.stroke();
    }
    g.fillStyle = '#a8792a';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    if (main) {
      g.font = `900 150px ${KAI}`;
      g.fillText(main, 512, 480);
      g.font = `700 64px serif`;
      g.fillText(sub, 512, 610);
    }
    if (icon === 'pad') drawController(g, 512, 520, 150, '#a8792a', 16);
  });
}

type Ctx = {
  root: THREE.Group;
  stat: THREE.Group;
  colliders: Collider[];
  toWorld: (lx: number, lz: number) => [number, number];
  add: (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent?: THREE.Object3D) => THREE.Mesh;
  plane: (tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, opts?: { emissive?: number; ry?: number; double?: boolean }) => THREE.Mesh;
  b: BuildingInteractable;
};

function makeCtx(b: BuildingInteractable, name: string): Ctx {
  const root = new THREE.Group();
  root.name = name;
  root.position.copy(b.position);
  root.rotation.y = b.facingYaw;
  const stat = new THREE.Group();
  root.add(stat);
  const colliders: Collider[] = [];
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
  const plane = (tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, opts: { emissive?: number; ry?: number; double?: boolean } = {}) => {
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: opts.emissive ?? 0.2,
      roughness: 0.75,
      side: opts.double ? THREE.DoubleSide : THREE.FrontSide,
      transparent: true,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z);
    m.rotation.y = opts.ry || 0;
    m.userData.noMerge = true;
    root.add(m);
    return m;
  };
  return { root, stat, colliders, toWorld, add, plane, b };
}

function stoneLantern(c: Ctx, x: number, z: number) {
  const mats = getStyleMaterials();
  const stone = new THREE.MeshStandardMaterial({ color: 0x5f5a54, roughness: 0.85 });
  c.add(new THREE.BoxGeometry(0.9, 0.3, 0.9), stone, x, 0.15, z);
  c.add(new THREE.CylinderGeometry(0.16, 0.2, 1.3, 8), stone, x, 0.95, z);
  c.add(new THREE.BoxGeometry(0.85, 0.12, 0.85), stone, x, 1.62, z);
  c.add(new THREE.BoxGeometry(0.62, 0.62, 0.62), mats.lampPaper, x, 1.99, z);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) c.add(new THREE.BoxGeometry(0.08, 0.66, 0.08), stone, x + sx * 0.3, 1.99, z + sz * 0.3);
  c.add(new THREE.ConeGeometry(0.72, 0.42, 4).rotateY(Math.PI / 4), mats.roofs.slate, x, 2.5, z);
  c.add(new THREE.SphereGeometry(0.1, 8, 6), stone, x, 2.78, z);
  const [wx, wz] = c.toWorld(x, z);
  c.colliders.push({ id: `${c.b.id}-slant-${x}-${z}`, type: 'cylinder', x: wx, z: wz, radius: 0.5 });
}

function bonsai(c: Ctx, x: number, z: number, seed: number) {
  const stone = new THREE.MeshStandardMaterial({ color: 0x7c776f, roughness: 0.9 });
  const bark = new THREE.MeshStandardMaterial({ color: 0x5a3d2a, roughness: 1 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x3f6b3a, roughness: 0.85 });
  c.add(new THREE.BoxGeometry(1.6, 0.55, 1.6), stone, x, 0.28, z);
  c.add(new THREE.BoxGeometry(1.7, 0.08, 1.7), stone, x, 0.58, z);
  const pts = [
    new THREE.Vector3(x, 0.6, z),
    new THREE.Vector3(x + 0.25, 1.2, z + 0.1),
    new THREE.Vector3(x - 0.2, 1.8, z - 0.05),
    new THREE.Vector3(x + 0.15, 2.4, z + 0.05),
  ];
  c.stat.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.13, 7, false), bark));
  let s = seed;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const pads: [number, number, number, number][] = [
    [0.6, 1.5, 0.2, 0.75],
    [-0.65, 1.95, -0.1, 0.7],
    [0.35, 2.45, 0.05, 0.8],
    [-0.1, 2.85, 0, 0.6],
  ];
  for (const [dx, y, dz, rr] of pads) {
    const m = c.add(new THREE.SphereGeometry(rr, 10, 7), leaf, x + dx + (r() - 0.5) * 0.1, y, z + dz);
    m.scale.set(1.25, 0.42, 1.0);
  }
  const [wx, wz] = c.toWorld(x, z);
  c.colliders.push({ id: `${c.b.id}-bonsai-${x}-${z}`, type: 'cylinder', x: wx, z: wz, radius: 0.95 });
}

function flagPole(c: Ctx, x: number, z: number, tex: THREE.Texture) {
  const mats = getStyleMaterials();
  c.add(new THREE.CylinderGeometry(0.07, 0.09, 6.2, 8), mats.darkWood, x, 3.1, z);
  c.add(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6).rotateZ(Math.PI / 2), mats.darkWood, x, 5.8, z);
  c.add(new THREE.SphereGeometry(0.12, 8, 6), mats.gold, x, 6.3, z);
  const f = c.plane(tex, 1.35, 3.4, x, 4.05, z, { double: true, ry: Math.PI / 2, emissive: 0.15 });
  f.userData.flutter = true;
  const [wx, wz] = c.toWorld(x, z);
  c.colliders.push({ id: `${c.b.id}-flag-${x}-${z}`, type: 'cylinder', x: wx, z: wz, radius: 0.22 });
}

function finishCtx(c: Ctx) {
  mergeByMaterial(c.stat);
  const flutters = c.root.children.filter((o) => o.userData.flutter);
  const spinners: THREE.Object3D[] = [];
  c.root.traverse((o) => {
    if (o.userData.spin) spinners.push(o);
  });
  c.root.userData.tick = (t: number) => {
    flutters.forEach((f, i) => (f.rotation.y = Math.PI / 2 + Math.sin(t * 1.3 + i) * 0.12));
    spinners.forEach((o, i) => {
      o.rotation.y = t * (0.3 + i * 0.12) * (i % 2 ? -1 : 1);
      o.rotation.x = (o.userData.tilt as number) || 0;
    });
  };
  c.root.updateMatrixWorld(true);
  return { group: c.root, colliders: c.colliders };
}

/* ======================= 展覽館 ======================= */

export function createExhibitionFacade(b: BuildingInteractable): { group: THREE.Group; colliders: Collider[] } {
  const mats = getStyleMaterials();
  const c = makeCtx(b, `facade_${b.id}`);
  const { add, plane } = c;
  const w = b.width;
  const d = b.depth;
  const h = b.height;
  const fz = d / 2 + 0.24;
  const rimTop = h + 0.46;
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a93f, roughness: 0.28, metalness: 0.85, emissive: new THREE.Color(0x4a3000), emissiveIntensity: 0.2 });
  const glass = new THREE.MeshStandardMaterial({ color: 0xcfe9ff, roughness: 0.04, metalness: 0.4, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false });
  const curtain = new THREE.MeshStandardMaterial({ color: 0x3a5468, roughness: 0.06, metalness: 0.75, emissive: new THREE.Color(0x3a2410), emissiveIntensity: 0.35 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xf1e7d2, roughness: 0.85 });

  // ── 中央玻璃大廳：兩坡玻璃頂 ──
  const HX = 7.2;
  const z0 = -d / 2 + 0.6;
  const z1 = d / 2 + 0.7;
  const RH = 6.4;
  {
    const g = new THREE.BufferGeometry();
    const P = [
      // 左坡
      -HX, rimTop, z0, 0, rimTop + RH, z0, 0, rimTop + RH, z1,
      -HX, rimTop, z0, 0, rimTop + RH, z1, -HX, rimTop, z1,
      // 右坡
      HX, rimTop, z0, HX, rimTop, z1, 0, rimTop + RH, z1,
      HX, rimTop, z0, 0, rimTop + RH, z1, 0, rimTop + RH, z0,
      // 正面山牆
      -HX, rimTop, z1, 0, rimTop + RH, z1, HX, rimTop, z1,
      // 背面山牆
      -HX, rimTop, z0, HX, rimTop, z0, 0, rimTop + RH, z0,
    ];
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, glass);
    m.userData.noMerge = true;
    m.renderOrder = 3;
    c.root.add(m);
    // 金框：屋脊、簷口、椽、山牆格
    const beam = (a: THREE.Vector3, bb: THREE.Vector3, r = 0.07) => {
      const len = a.distanceTo(bb);
      const mm = add(new THREE.CylinderGeometry(r, r, len, 6), gold, (a.x + bb.x) / 2, (a.y + bb.y) / 2, (a.z + bb.z) / 2);
      mm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bb.clone().sub(a).normalize());
    };
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    beam(V(0, rimTop + RH, z0), V(0, rimTop + RH, z1), 0.12);
    for (const sx of [-1, 1]) beam(V(sx * HX, rimTop, z0), V(sx * HX, rimTop, z1), 0.1);
    const nR = 9;
    for (let k = 0; k <= nR; k++) {
      const z = z0 + ((z1 - z0) * k) / nR;
      for (const sx of [-1, 1]) beam(V(sx * HX, rimTop, z), V(0, rimTop + RH, z), k === 0 || k === nR ? 0.11 : 0.06);
    }
    // 檁條
    for (let j = 1; j < 4; j++) {
      const t = j / 4;
      for (const sx of [-1, 1]) beam(V(sx * HX * (1 - t), rimTop + RH * t, z0), V(sx * HX * (1 - t), rimTop + RH * t, z1), 0.05);
    }
    // 正面山牆：直櫺＋斜撐格
    for (let k = -4; k <= 4; k++) {
      const x = (k / 5) * HX;
      const top = rimTop + RH * (1 - Math.abs(x) / HX);
      beam(V(x, rimTop, z1 + 0.02), V(x, top, z1 + 0.02), 0.05);
    }
    for (let k = -3; k <= 3; k++) {
      const x = (k / 4) * HX * 0.9;
      beam(V(x - 1.2, rimTop, z1 + 0.03), V(x + 1.2, rimTop + RH * 0.42, z1 + 0.03), 0.035);
      beam(V(x + 1.2, rimTop, z1 + 0.03), V(x - 1.2, rimTop + RH * 0.42, z1 + 0.03), 0.035);
    }
    // 山牆金徽：圓環＋燈泡
    const em = add(new THREE.TorusGeometry(1.05, 0.08, 8, 32), gold, 0, rimTop + RH * 0.46, z1 + 0.06);
    void em;
    const bulbTex = canvasTex(256, 256, (gg) => {
      gg.clearRect(0, 0, 256, 256);
      gg.save();
      gg.shadowColor = '#ffcf6a';
      gg.shadowBlur = 18;
      drawBulb(gg, 128, 110, 54, '#ffe2a0', 9);
      gg.restore();
    });
    plane(bulbTex, 1.9, 1.9, 0, rimTop + RH * 0.46, z1 + 0.08, { emissive: 1.4 });
    // 屋脊尖頂金球
    add(new THREE.SphereGeometry(0.34, 14, 10), gold, 0, rimTop + RH + 0.3, z1);
    add(new THREE.ConeGeometry(0.06, 0.8, 6), gold, 0, rimTop + RH + 0.9, z1);
  }

  // ── 兩側飛簷樓閣 ──
  for (const sx of [-1, 1]) {
    const tx = sx * 10.3;
    const tz = d / 2 - 3.4;
    const tw = 5.4;
    const td = 6.9;
    // 下層簷
    const r1 = buildRoofTier(tw + 0.4, td + 0.4, { rise: 0.7, overhang: 1.0, curl: 0.7, theme: 'slate', ridge: false });
    r1.position.set(tx, rimTop - 0.2, tz);
    c.stat.add(r1);
    // 樓身
    add(new THREE.BoxGeometry(tw - 0.6, 3.6, td - 0.6), cream, tx, rimTop + 0.4 + 1.8, tz);
    for (const ex of [-1, 1]) for (const ez of [-1, 1]) add(new THREE.BoxGeometry(0.32, 3.6, 0.32), mats.darkWood, tx + ex * (tw / 2 - 0.3), rimTop + 2.2, tz + ez * (td / 2 - 0.3));
    add(new THREE.BoxGeometry(tw - 0.2, 0.3, td - 0.2), mats.darkWood, tx, rimTop + 4.0, tz);
    // 樓身正面的白幡
    plane(landscapeBannerTex(), 1.6, 3.0, tx, rimTop + 2.2, tz + td / 2 - 0.28, { emissive: 0.12 });
    // 上層頂
    const r2 = buildRoofTier(tw, td, { rise: 1.9, overhang: 1.2, curl: 0.95, theme: 'slate', ridge: true });
    r2.position.set(tx, rimTop + 4.15, tz);
    c.stat.add(r2);
  }

  // ── 正面玻璃帷幕（金框）＋門 ──
  const doorW = b.doorWidth || 6.4;
  const doorH = Math.min(3.6, h - 0.8);
  const cw = HX;
  const panel = (x0: number, x1: number, y0: number, y1: number) => {
    add(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.06), curtain, (x0 + x1) / 2, (y0 + y1) / 2, fz);
  };
  panel(-cw, -doorW / 2 - 0.2, 0.5, h);
  panel(doorW / 2 + 0.2, cw, 0.5, h);
  panel(-doorW / 2 - 0.2, doorW / 2 + 0.2, doorH + 0.15, h);
  for (let x = -cw; x <= cw + 0.01; x += (cw * 2) / 8) {
    if (Math.abs(x) < doorW / 2 + 0.1) {
      add(new THREE.BoxGeometry(0.1, h - doorH - 0.15, 0.12), gold, x, (h + doorH + 0.15) / 2, fz + 0.04);
    } else add(new THREE.BoxGeometry(0.1, h - 0.5, 0.12), gold, x, (h + 0.5) / 2, fz + 0.04);
  }
  for (let y = 0.5; y <= h + 0.01; y += (h - 0.5) / 5) {
    if (y < doorH + 0.1) {
      for (const sx of [-1, 1]) add(new THREE.BoxGeometry(cw - doorW / 2 - 0.2, 0.08, 0.12), gold, sx * (cw + doorW / 2 + 0.2) / 2, y, fz + 0.04);
    } else add(new THREE.BoxGeometry(cw * 2, 0.08, 0.12), gold, 0, y, fz + 0.04);
  }
  // 門框（金）
  add(new THREE.BoxGeometry(doorW + 0.5, 0.25, 0.3), gold, 0, doorH + 0.05, fz + 0.06);
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.25, doorH, 0.3), gold, sx * (doorW / 2 + 0.12), doorH / 2, fz + 0.06);
  // 黑底金字匾
  plane(plaqueTex('創意展覽館', 'IdeaX'), 8.0, 2.0, 0, doorH + 1.55, fz + 0.12, { emissive: 0.45 });

  // ── 大紅條幅（創意無界／點亮未來）與白底山水幡 ──
  plane(coupletTex('創意無界', 'bulb'), 1.7, 8.4, -(cw + 1.2), 5.6, fz + 0.05, { emissive: 0.25 });
  plane(coupletTex('點亮未來', 'bulb'), 1.7, 8.4, cw + 1.2, 5.6, fz + 0.05, { emissive: 0.25 });
  for (const sx of [-1, 1]) plane(landscapeBannerTex(), 1.5, 6.4, sx * (w / 2 - 1.4), 5.0, fz + 0.05, { emissive: 0.15 });

  // ── 大廳裡懸吊的金色燈泡雕塑（從門口就看得到） ──
  {
    const pit = lobbyPit(b);
    const cz = (pit.zTop + pit.zBot) / 2;
    const glow = new THREE.MeshStandardMaterial({ color: 0xffe2a0, emissive: new THREE.Color(0xffb84a), emissiveIntensity: 1.6, roughness: 0.3 });
    const sg = new THREE.Group();
    sg.position.set(0, 8.6, cz);
    c.root.add(sg);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.95, 20, 16), glow);
    sg.add(bulb);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.7, 14), gold);
    base.position.y = -1.15;
    sg.add(base);
    for (let k = 0; k < 3; k++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55 + k * 0.32, 0.05, 6, 40), gold);
      ring.userData.spin = true;
      ring.userData.tilt = 0.5 + k * 0.45;
      sg.add(ring);
    }
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, h - 9.8, 4), mats.darkWood);
    cable.position.y = (h - 9.8) / 2 + 0.9;
    sg.add(cable);
  }

  // ── 寬石階、石燈籠、盆景松、幡旗 ──
  const granite = new THREE.MeshStandardMaterial({ color: 0xbdb5a6, roughness: 0.8 });
  [0.2, 0.13, 0.06].forEach((hh, i) => add(new THREE.BoxGeometry(16 - i * 0.8, hh, 1.2), granite, 0, hh / 2, d / 2 + 0.75 + i * 1.15));
  for (const sx of [-1, 1]) {
    stoneLantern(c, sx * 8.4, d / 2 + 3.4);
    bonsai(c, sx * 5.8, d / 2 + 2.5, sx > 0 ? 7 : 3);
  }
  const red = canvasTex(256, 640, (g) => {
    g.fillStyle = '#b3221c';
    g.fillRect(0, 0, 256, 640);
    g.strokeStyle = '#e2b85a';
    g.lineWidth = 8;
    g.strokeRect(14, 14, 228, 612);
    drawBulb(g, 128, 280, 56, '#f2cf7a', 7);
  });
  const white = canvasTex(256, 640, (g) => {
    g.fillStyle = '#f4efe3';
    g.fillRect(0, 0, 256, 640);
    g.strokeStyle = '#c9963a';
    g.lineWidth = 8;
    g.strokeRect(14, 14, 228, 612);
    drawBulb(g, 128, 280, 56, '#b8862b', 7);
  });
  for (const sx of [-1, 1]) {
    flagPole(c, sx * 11.8, d / 2 + 4.4, red);
    flagPole(c, sx * 13.4, d / 2 + 2.6, white);
  }
  return finishCtx(c);
}

/* ======================= 電玩城 ======================= */

export function createArcadeFacade(b: BuildingInteractable): { group: THREE.Group; colliders: Collider[] } {
  const mats = getStyleMaterials();
  const c = makeCtx(b, `facade_${b.id}`);
  const { add, plane } = c;
  const w = b.width;
  const d = b.depth;
  const h = b.height;
  const fz = d / 2 + 0.24;
  const rimTop = h + 0.4;
  const wood = new THREE.MeshStandardMaterial({ color: 0x241612, roughness: 0.7 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc9963a, roughness: 0.35, metalness: 0.7 });
  const glass = new THREE.MeshStandardMaterial({ color: 0xe8f4ff, roughness: 0.03, metalness: 0.5, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
  const doorW = b.doorWidth || 5.6;
  const doorH = Math.min(3.6, h - 0.8);

  // ── 深色木構框：柱、樑、金線 ──
  for (const x of [-w / 2, -7.4, -doorW / 2 - 0.6, doorW / 2 + 0.6, 7.4, w / 2]) {
    add(new THREE.BoxGeometry(0.55, h + 0.3, 0.5), wood, x, (h + 0.3) / 2, fz + 0.05);
    add(new THREE.BoxGeometry(0.08, h - 1, 0.06), gold, x + 0.3, h / 2, fz + 0.32);
  }
  add(new THREE.BoxGeometry(w + 0.6, 0.55, 0.5), wood, 0, h - 0.1, fz + 0.05);
  add(new THREE.BoxGeometry(w + 0.6, 0.08, 0.1), gold, 0, h + 0.2, fz + 0.32);
  add(new THREE.BoxGeometry(w + 0.6, 0.45, 0.5), wood, 0, 0.6, fz + 0.05);
  // 屋簷上的斗拱列
  for (let k = 0; k <= 10; k++) add(new THREE.BoxGeometry(0.5, 0.35, 0.6), wood, -w / 2 + (w * k) / 10, h + 0.45, fz + 0.15);

  // ── 屋頂玻璃穹頂 ──
  {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), glass);
    dome.scale.set(1.25, 0.45, 0.95);
    dome.position.set(0, rimTop, -0.5);
    dome.userData.noMerge = true;
    dome.renderOrder = 3;
    c.root.add(dome);
    for (let k = 0; k < 8; k++) {
      const rib = add(new THREE.TorusGeometry(6, 0.05, 4, 32, Math.PI), gold, 0, rimTop, -0.5);
      rib.rotation.y = (k / 8) * Math.PI;
      rib.scale.set(1.25 * Math.abs(Math.cos((k / 8) * Math.PI)) + 0.95 * Math.abs(Math.sin((k / 8) * Math.PI)), 0.45, 1);
    }
  }

  // ── 正門上方的大紅布幔（霓虹手把）＋匾 ──
  plane(neonPadTex(), 7.4, 5.1, 0, 8.25, fz + 0.36, { emissive: 0.75 });
  plane(plaqueTex(b.name, 'IdeaX'), 6.4, 1.6, 0, doorH + 1.05, fz + 0.4, { emissive: 0.45 });
  // 門簾（親子同樂／雅俗共賞）
  plane(coupletTex('親子同樂', 'pad'), 1.35, 6.8, -(doorW / 2 + 1.55), 4.4, fz + 0.36, { emissive: 0.3 });
  plane(coupletTex('雅俗共賞', 'pad'), 1.35, 6.8, doorW / 2 + 1.55, 4.4, fz + 0.36, { emissive: 0.3 });
  // 水墨幡
  for (const sx of [-1, 1]) plane(inkBannerTex(sx > 0 ? 11 : 37), 1.7, 5.6, sx * 9.2, 4.4, fz + 0.32, { emissive: 0.12 });

  // ── 手把宮燈 ──
  const padIcon = canvasTex(256, 256, (g) => {
    g.clearRect(0, 0, 256, 256);
    drawController(g, 128, 128, 70, '#ffffff', 10);
  });
  for (const sx of [-1, 1]) {
    const x = sx * (doorW / 2 + 0.2);
    add(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 4), mats.darkWood, x, doorH + 0.4, fz + 0.75);
    const l = add(new THREE.SphereGeometry(0.55, 18, 12), mats.lanternBody, x, doorH - 0.45, fz + 0.75);
    l.scale.set(1.1, 0.95, 1.1);
    add(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 12), gold, x, doorH + 0.06, fz + 0.75);
    add(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 12), gold, x, doorH - 0.98, fz + 0.75);
    add(new THREE.CylinderGeometry(0.04, 0.02, 0.5, 6), mats.lanternBody, x, doorH - 1.3, fz + 0.75);
    plane(padIcon, 0.7, 0.7, x, doorH - 0.45, fz + 1.31, { emissive: 0.9 });
  }

  // ── 入口內的霓虹光環 ──
  {
    const neon = new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: new THREE.Color(0xffb04a), emissiveIntensity: 2.0, roughness: 0.3 });
    const ring = add(new THREE.TorusGeometry(2.0, 0.07, 8, 48).rotateX(Math.PI / 2), neon, 0, doorH - 0.15, d / 2 - 2.4);
    void ring;
    const orb = add(new THREE.SphereGeometry(0.35, 14, 10), neon, 0, doorH - 1.0, d / 2 - 2.4);
    void orb;
  }

  // ── 紅毯石階、盆景松、石燈籠、手把幡 ──
  const granite = new THREE.MeshStandardMaterial({ color: 0xbdb5a6, roughness: 0.8 });
  const carpet = new THREE.MeshStandardMaterial({ color: 0xa3141a, roughness: 0.9 });
  [0.2, 0.13, 0.06].forEach((hh, i) => add(new THREE.BoxGeometry(13 - i * 0.8, hh, 1.1), granite, 0, hh / 2, d / 2 + 0.7 + i * 1.05));
  add(new THREE.BoxGeometry(3.0, 0.22, 3.4), carpet, 0, 0.11, d / 2 + 1.75);
  for (const sx of [-1, 1]) {
    bonsai(c, sx * 6.2, d / 2 + 2.6, sx > 0 ? 13 : 5);
    stoneLantern(c, sx * 8.8, d / 2 + 3.6);
  }
  const padBanner = canvasTex(256, 640, (g) => {
    g.fillStyle = '#a31d18';
    g.fillRect(0, 0, 256, 640);
    g.strokeStyle = '#e2b85a';
    g.lineWidth = 8;
    g.strokeRect(14, 14, 228, 612);
    drawController(g, 128, 300, 70, '#f2cf7a', 8);
  });
  for (const sx of [-1, 1]) flagPole(c, sx * 10.8, d / 2 + 4.8, padBanner);
  return finishCtx(c);
}

/* ======================= 薈萃廣場地徽 ======================= */

export function createPlazaMedallions(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'plaza_medallions';
  const mk = (tex: THREE.Texture, x: number, z: number, r: number) => {
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(r, 64).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.35, metalness: 0.25, polygonOffset: true, polygonOffsetFactor: -2 })
    );
    m.position.set(x, 0.035, z);
    m.receiveShadow = true;
    m.renderOrder = 1;
    g.add(m);
    return m;
  };
  // 薈萃廣場（展覽館正前方）：字朝展覽館大門外看過來的方向
  const a = mk(medallionTex('薈萃廣場', 'IdeaX', null), -70, 45.5, 5.6);
  a.rotation.y = Math.PI / 2;
  // 電玩城前的手把地徽
  const p = mk(medallionTex(null, '', 'pad'), -64, 51.4, 2.8);
  p.rotation.y = Math.PI;
  return g;
}
