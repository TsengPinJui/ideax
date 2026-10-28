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

export function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
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

export function drawController(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string, lw = 5) {
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

/* ======================= 電玩城 ======================= */

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
  const a = mk(medallionTex('薈萃廣場', 'IdeaX', null), -67, 44, 4.4);
  a.rotation.y = Math.PI / 2;
  // 電玩城前的手把地徽
  const p = mk(medallionTex(null, '', 'pad'), -64, 51.4, 2.8);
  p.rotation.y = Math.PI;
  return g;
}
