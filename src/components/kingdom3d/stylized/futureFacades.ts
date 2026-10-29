import * as THREE from 'three';
import type { BuildingInteractable, Collider } from '../types';
import { mergeByMaterial } from './architecture';
import { canvasTex, drawController } from './hallFacades';
import { graniteWallTexture } from './textures';

/**
 * 電玩城（照參考圖重建）：未來感流線建築
 * - 整棟深藍玻璃帷幕（牆面材質在 architecture.ts 換成 arcadeGlassTexture）
 * - 銀白色流線大屋簷環繞整棟，前面高高拱起、兩側像翅膀一樣掃到地面，邊緣一道道冷白燈帶
 * - 屋頂上一圈傾斜的流線環＋橢圓玻璃穹頂，裡面是發光的同心環燈
 * - 正門：門上「電玩城 IdeaX」黑底白字大招牌、上方發光手把螢幕；兩側黑底直幡「親子同樂」「雅俗共賞」
 * - 側面大型發光影像幡、門前白石花台上的松樹盆景、方形地燈、手把地徽外的發光圓環
 * 本地座標：+Z 朝大門外
 */

const KAI = '"DFKai-SB","BiauKai","Kaiti TC","STKaiti","KaiTi","LXGW WenKai TC","CWTeXKai","Noto Serif TC",serif';

type V = THREE.Vector3;
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = v3(0, 1, 0);

/** 沿著一條中心線掃出一條有厚度的扁帶（流線屋簷用） */
function ribbonGeo(pts: V[], sides: V[], widths: number[], th: number, closed = false) {
  const n = pts.length;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const T = b.clone().sub(a).normalize();
    const S = sides[i].clone().sub(T.clone().multiplyScalar(sides[i].dot(T))).normalize();
    const N = new THREE.Vector3().crossVectors(S, T).normalize();
    const P = pts[i];
    const hw = widths[i] / 2;
    const ht = th / 2;
    for (const [s, t] of [
      [1, 1],
      [-1, 1],
      [-1, -1],
      [1, -1],
    ]) {
      const q = P.clone().addScaledVector(S, s * hw).addScaledVector(N, t * ht);
      pos.push(q.x, q.y, q.z);
    }
  }
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % n;
    for (let k = 0; k < 4; k++) {
      const a = i * 4 + k;
      const b = i * 4 + ((k + 1) % 4);
      const c = j * 4 + ((k + 1) % 4);
      const d = j * 4 + k;
      idx.push(a, d, b, b, d, c);
    }
  }
  if (!closed) {
    idx.push(0, 1, 2, 0, 2, 3);
    const e = (n - 1) * 4;
    idx.push(e, e + 2, e + 1, e, e + 3, e + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function edgeOf(pts: V[], sides: V[], widths: number[], sign: number, drop = 0) {
  return pts.map((p, i) => p.clone().addScaledVector(sides[i].clone().normalize(), (sign * widths[i]) / 2).add(v3(0, -drop, 0)));
}

/* ---------------- 招牌、直幡、影像幡貼圖 ---------------- */

function arcadeSignTex(main: string, sub: string) {
  return canvasTex(1024, 280, (g) => {
    g.fillStyle = '#0b0e16';
    g.fillRect(0, 0, 1024, 280);
    g.strokeStyle = '#cfd8e6';
    g.lineWidth = 6;
    g.strokeRect(14, 14, 996, 252);
    g.lineWidth = 2;
    g.strokeRect(28, 28, 968, 224);
    // 四角回紋
    g.strokeStyle = '#9fb2cc';
    for (const [x, y, sx, sy] of [
      [40, 40, 1, 1],
      [984, 40, -1, 1],
      [40, 240, 1, -1],
      [984, 240, -1, -1],
    ]) {
      g.beginPath();
      g.moveTo(x, y + sy * 30);
      g.lineTo(x, y);
      g.lineTo(x + sx * 30, y);
      g.moveTo(x + sx * 10, y + sy * 20);
      g.lineTo(x + sx * 10, y + sy * 10);
      g.lineTo(x + sx * 20, y + sy * 10);
      g.stroke();
    }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = '#bfe0ff';
    g.shadowBlur = 18;
    g.fillStyle = '#ffffff';
    g.font = `900 140px ${KAI}`;
    g.fillText(main, 512, 118);
    g.shadowBlur = 8;
    g.font = '600 46px Georgia, serif';
    g.fillText(sub, 512, 222);
    g.fillStyle = '#9fb2cc';
    g.fillRect(300, 220, 110, 3);
    g.fillRect(614, 220, 110, 3);
  });
}

function padScreenTex() {
  return canvasTex(768, 448, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 448);
    gr.addColorStop(0, '#0a1020');
    gr.addColorStop(1, '#101a33');
    g.fillStyle = gr;
    g.fillRect(0, 0, 768, 448);
    g.strokeStyle = '#cfd8e6';
    g.lineWidth = 6;
    g.strokeRect(10, 10, 748, 428);
    g.shadowColor = '#7fd0ff';
    g.shadowBlur = 24;
    g.strokeStyle = '#e8f6ff';
    g.lineWidth = 5;
    g.beginPath();
    g.ellipse(384, 250, 250, 72, -0.05, 0, Math.PI * 2);
    g.stroke();
    drawController(g, 384, 240, 120, '#ffffff', 9);
    // 小星星
    g.fillStyle = '#ffffff';
    g.beginPath();
    const sx = 384;
    const sy = 70;
    for (let k = 0; k < 8; k++) {
      const r = k % 2 ? 8 : 26;
      const a = (k / 8) * Math.PI * 2 - Math.PI / 2;
      g.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
    }
    g.fill();
  });
}

function darkBannerTex(text: string) {
  return canvasTex(256, 1024, (g) => {
    g.fillStyle = '#0c0f17';
    g.fillRect(0, 0, 256, 1024);
    g.strokeStyle = '#cfd8e6';
    g.lineWidth = 5;
    g.strokeRect(14, 14, 228, 996);
    g.lineWidth = 2;
    g.strokeRect(26, 26, 204, 972);
    g.shadowColor = '#bfe0ff';
    g.shadowBlur = 12;
    drawController(g, 128, 150, 58, '#ffffff', 6);
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `900 150px ${KAI}`;
    Array.from(text).forEach((ch, i) => g.fillText(ch, 128, 330 + i * 170));
  });
}

/** 側面的大型發光影像幡：藍紫星雲、光束與手把剪影（抽象畫面，不是任何既有角色） */
function videoBannerTex(seed: number) {
  return canvasTex(256, 768, (g) => {
    let s = seed;
    const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const gr = g.createLinearGradient(0, 0, 256, 768);
    gr.addColorStop(0, '#1a1f6e');
    gr.addColorStop(0.5, '#5a2aa8');
    gr.addColorStop(1, '#152a6a');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 768);
    for (let i = 0; i < 9; i++) {
      const rg = g.createRadialGradient(r() * 256, r() * 768, 0, r() * 256, r() * 768, 60 + r() * 120);
      rg.addColorStop(0, `rgba(${150 + r() * 100},${170 + r() * 80},255,0.55)`);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, 256, 768);
    }
    g.strokeStyle = 'rgba(255,255,255,0.65)';
    g.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(r() * 256, 0);
      g.bezierCurveTo(r() * 256, 250, r() * 256, 500, r() * 256, 768);
      g.stroke();
    }
    for (let i = 0; i < 70; i++) {
      g.fillStyle = `rgba(255,255,255,${0.4 + r() * 0.6})`;
      g.fillRect(r() * 256, r() * 768, 2 + r() * 3, 2 + r() * 3);
    }
    g.shadowColor = '#c9e8ff';
    g.shadowBlur = 16;
    drawController(g, 128, 520, 64, '#ffffff', 6);
    g.strokeStyle = '#cfd8e6';
    g.lineWidth = 6;
    g.strokeRect(6, 6, 244, 756);
  });
}

/* ---------------- 電玩城 ---------------- */

export function createArcadeFacade(b: BuildingInteractable): { group: THREE.Group; colliders: Collider[] } {
  const root = new THREE.Group();
  root.name = `facade_${b.id}`;
  root.position.copy(b.position);
  root.rotation.y = b.facingYaw;
  const stat = new THREE.Group();
  root.add(stat);
  const colliders: Collider[] = [];
  const cy = Math.cos(b.facingYaw);
  const sy = Math.sin(b.facingYaw);
  const toWorld = (lx: number, lz: number): [number, number] => [b.position.x + lx * cy + lz * sy, b.position.z - lx * sy + lz * cy];
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, parent: THREE.Object3D = stat) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const plane = (tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0, emissive = 0.6) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: emissive, roughness: 0.5 })
    );
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.userData.noMerge = true;
    root.add(m);
    return m;
  };
  const col = (lx: number, lz: number, r: number, tag: string) => {
    const [x, z] = toWorld(lx, lz);
    colliders.push({ id: `${b.id}-fx-${tag}`, type: 'cylinder', x, z, radius: r });
  };

  const w = b.width;
  const d = b.depth;
  const h = b.height;
  const doorW = b.doorWidth || 5.6;
  const doorH = Math.min(3.6, h - 0.8);
  const fz = d / 2 + 0.25;

  const silver = new THREE.MeshStandardMaterial({ color: 0xeef1f6, roughness: 0.28, metalness: 0.35, emissive: 0x3a4250, emissiveIntensity: 0.55, side: THREE.DoubleSide });
  const coolLight = new THREE.MeshBasicMaterial({ color: 0xe6f3ff });
  const warmLight = new THREE.MeshBasicMaterial({ color: 0xffdcaa });
  const stoneW = new THREE.MeshStandardMaterial({ color: 0xe9e6e0, roughness: 0.55 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xcfe6ff, roughness: 0.06, metalness: 0.15, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false });

  /** 掃一條流線帶：加上外緣冷白燈帶、下緣暖光 */
  const sweep = (pts: V[], sides: V[], widths: number[], th: number, closed = false, glowWarm = true) => {
    const m = add(ribbonGeo(pts, sides, widths, th, closed), silver);
    m.castShadow = true;
    const outer = edgeOf(pts, sides, widths, 1);
    const curve = new THREE.CatmullRomCurve3(outer, closed);
    add(new THREE.TubeGeometry(curve, pts.length * 2, 0.07, 6, closed), coolLight);
    if (glowWarm) {
      const inner = edgeOf(pts, sides, widths, -1, th / 2 + 0.02);
      add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(inner, closed), pts.length * 2, 0.05, 5, closed), warmLight);
    }
    // 貼近地面的部分要擋人
    let last = -99;
    pts.forEach((p, i) => {
      if (p.y < 2.1 && (last < 0 || p.distanceTo(pts[last]) > 1.0)) {
        last = i;
        col(p.x, p.z, Math.max(0.6, widths[i] / 2), `rb${Math.round(p.x * 10)}_${Math.round(p.z * 10)}`);
      }
    });
    return m;
  };

  // ── 主屋簷：環繞整棟的流線帶，前面拱高 ──
  const A = w / 2 + 2.6;
  const B = d / 2 + 2.4;
  const brim = (t: number) => {
    const c = Math.cos(t);
    return v3(Math.sin(t) * A, h + 0.9 + 2.4 * Math.max(0, c) ** 2 + 0.7 * Math.sin(2 * t), c * B);
  };
  {
    const N = 120;
    const pts: V[] = [];
    const sides: V[] = [];
    const ws: number[] = [];
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      pts.push(brim(t));
      sides.push(v3(Math.sin(t) * B, 0.32 * Math.max(A, B), Math.cos(t) * A).normalize());
      ws.push(3.0 + 0.9 * Math.cos(t));
    }
    sweep(pts, sides, ws, 0.32, true);
    // 下面再一道較窄的平行流線帶（層層線條，和參考圖一樣）
    const lp: V[] = [];
    const ls: V[] = [];
    const lw: number[] = [];
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      const p = brim(t);
      lp.push(v3(p.x * 0.93, h + 0.35 + (p.y - h - 0.9) * 0.45, p.z * 0.93));
      ls.push(sides[i]);
      lw.push(1.3 + 0.4 * Math.cos(t));
    }
    sweep(lp, ls, lw, 0.2, true);
  }

  // ── 兩側翅膀：從屋簷前角掃到地面 ──
  const wing = (s: number, t0: number, p1: V, p2: V, p3: V, w0: number, w1: number) => {
    // 尾端往外、往上微微翹起並收尖（像飄帶的末梢），不會看起來像被切斷
    const out = p3.clone().sub(p2).setY(0).normalize();
    const p4 = p3.clone().addScaledVector(out, 1.6).add(v3(0, 1.3, 0));
    const curve = new THREE.CatmullRomCurve3([brim(t0), p1, p2, p3, p4], false, 'centripetal');
    const N = 56;
    const pts = curve.getPoints(N - 1);
    const sides: V[] = [];
    const ws: number[] = [];
    pts.forEach((p, i) => {
      const T = curve.getTangent(i / (N - 1));
      let S = new THREE.Vector3().crossVectors(T, UP);
      if (S.lengthSq() < 1e-4) S = v3(s, 0, 0);
      S.normalize();
      if (S.dot(v3(s, 0.2, 0.4)) < 0) S.negate();
      S.lerp(UP, 0.25).normalize();
      sides.push(S);
      const t = i / (N - 1);
      const base = w0 + (w1 - w0) * Math.min(1, t / 0.75);
      ws.push(t < 0.72 ? base : base * Math.max(0.08, Math.cos(((t - 0.72) / 0.28) * Math.PI * 0.5)));
    });
    sweep(pts, sides, ws, 0.24);
  };
  // 兩翼與後翼：從屋簷往外掃下來，尾端停在 2.8 公尺以上的半空中（人可以從底下走過，不會擋路）
  wing(-1, -1.0, v3(-(w / 2 + 3.8), h * 0.7, d / 2 + 2.0), v3(-(w / 2 + 3.6), h * 0.42, d / 2 + 1.0), v3(-(w / 2 + 3.0), 2.9, d / 2 - 0.6), 3.0, 1.4);
  wing(1, 1.0, v3(w / 2 + 3.4, h * 0.7, d / 2 + 1.0), v3(w / 2 + 3.0, h * 0.42, d / 2 - 1.6), v3(w / 2 + 2.4, 2.9, d / 2 - 4.6), 3.0, 1.4);
  wing(1, Math.PI - 0.95, v3(w / 2 + 3.6, h * 0.66, -d / 2 - 1.4), v3(w / 2 + 3.2, h * 0.4, -d / 2 - 0.4), v3(w / 2 + 2.6, 2.9, -d / 2 + 1.6), 2.6, 1.2);

  // ── 正門兩側的銀色鰭柱：從地面升起接到前簷 ──
  for (const s of [-1, 1]) {
    const x0 = s * (doorW / 2 + 1.05);
    const curve = new THREE.CatmullRomCurve3([v3(x0, 0, fz + 0.6), v3(x0 + s * 0.4, h * 0.45, fz + 1.2), v3(s * (doorW / 2 + 2.6), h + 1.2, fz + 1.8), brim(s * 0.46)]);
    const N = 36;
    const pts = curve.getPoints(N - 1);
        const sides2 = pts.map((_, i) => v3(1, 0, 0.6 * (i / (N - 1))).normalize());
    const ws = pts.map((_, i) => 0.55 + 0.75 * (i / (N - 1)));
    sweep(pts, sides2, ws, 0.35);
  }

  // ── 屋頂：傾斜的流線環＋橢圓玻璃穹頂＋發光同心環 ──
  {
    const N = 96;
    const a2 = w / 2 - 1.2;
    const b2 = d / 2 - 1.0;
    const pts: V[] = [];
    const sides: V[] = [];
    const ws: number[] = [];
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      pts.push(v3(Math.sin(t) * a2, h + 2.8 + 1.5 * Math.sin(t + 1.1), Math.cos(t) * b2 - 0.6));
      sides.push(v3(Math.sin(t) * b2, 0.5 * a2, Math.cos(t) * a2).normalize());
      ws.push(1.7 + 0.5 * Math.sin(t * 2));
    }
    sweep(pts, sides, ws, 0.24, true);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 18, 0, Math.PI * 2, 0, Math.PI / 2), glass);
    dome.scale.set(w / 2 - 2.6, 3.0, d / 2 - 2.4);
    dome.position.set(0, h + 0.45, -0.6);
    dome.userData.noMerge = true;
    dome.renderOrder = 3;
    root.add(dome);
    for (const [r, y] of [
      [5.5, 0.9],
      [3.8, 1.9],
      [2.2, 2.6],
    ] as [number, number][]) {
      const ring = add(new THREE.TorusGeometry(r, 0.06, 6, 64).rotateX(Math.PI / 2), coolLight, 0, h + 0.45 + y, -0.6);
      ring.scale.set(1.25, 1, 0.9);
    }
    // 穹頂骨架
    for (let k = 0; k < 10; k++) {
      const rib = add(new THREE.TorusGeometry(1, 0.025, 4, 24, Math.PI), silver, 0, h + 0.45, -0.6);
      const a = (k / 10) * Math.PI;
      rib.rotation.y = a;
      rib.scale.set((w / 2 - 2.6) * Math.abs(Math.cos(a)) + (d / 2 - 2.4) * Math.abs(Math.sin(a)), 3.0, 1);
    }
  }

  // ── 正面招牌、手把螢幕、直幡 ──
  {
    // 門楣上的大招牌（黑底白字）
    add(new THREE.BoxGeometry(8.0, 2.2, 0.35), silver, 0, doorH + 1.35, fz + 0.45);
    plane(arcadeSignTex('電玩城', 'IdeaX'), 7.7, 2.0, 0, doorH + 1.35, fz + 0.64, 0, 0.75);
    // 上方發光手把螢幕
    add(new THREE.BoxGeometry(6.6, 3.9, 0.3), silver, 0, doorH + 4.55, fz + 0.4);
    plane(padScreenTex(), 6.3, 3.6, 0, doorH + 4.55, fz + 0.57, 0, 0.9);
    // 兩側直幡：左「親子同樂」、右「雅俗共賞」
    for (const [s, txt] of [
      [-1, '親子同樂'],
      [1, '雅俗共賞'],
    ] as [number, string][]) {
      const x = s * (doorW / 2 + 2.9);
      add(new THREE.BoxGeometry(2.1, 7.4, 0.25), silver, x, 4.6, fz + 0.9);
      plane(darkBannerTex(txt), 1.9, 7.2, x, 4.6, fz + 1.04, 0, 0.7);
      add(new THREE.BoxGeometry(0.12, 0.12, 0.9), silver, x, 8.25, fz + 0.5);
    }
    // 正面兩角、兩側牆的大型發光影像幡
    for (const s of [-1, 1]) {
      plane(videoBannerTex(s > 0 ? 17 : 91), 2.6, 7.6, s * (w / 2 - 1.6), 5.4, fz + 0.12, 0, 0.85);
      plane(videoBannerTex(s > 0 ? 41 : 63), 2.8, 8.2, s * (w / 2 + 0.3), 5.6, -1.5, (s * Math.PI) / 2, 0.85);
    }
  }

  // ── 入口：玻璃門廊上方的同心環燈、地面燈帶 ──
  for (const [r, y] of [
    [2.3, 0.0],
    [1.5, 0.12],
  ] as [number, number][]) add(new THREE.TorusGeometry(r, 0.05, 6, 48).rotateX(Math.PI / 2), coolLight, 0, h - 1.4 + y, d / 2 - 2.6);
  [0.18, 0.1].forEach((hh, i) => {
    add(new THREE.BoxGeometry(12 - i * 1.2, hh, 1.0), stoneW, 0, hh / 2, d / 2 + 0.7 + i * 1.0);
    add(new THREE.BoxGeometry(12 - i * 1.2, 0.03, 0.05), warmLight, 0, hh + 0.01, d / 2 + 1.2 + i * 1.0);
  });

  // ── 門前白石花台＋松樹盆景、方形地燈 ──
  const bark = new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 1 });
  const pine = new THREE.MeshStandardMaterial({ color: 0x2f5530, roughness: 0.85 });
  const pineTree = (x: number, z: number, seed: number, sc = 1) => {
    let s = seed;
    const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const y0 = 0.7;
    const pts = [v3(x, y0, z), v3(x + 0.35 * sc, y0 + 1.0 * sc, z + 0.1), v3(x - 0.3 * sc, y0 + 2.0 * sc, z), v3(x + 0.2 * sc, y0 + 2.9 * sc, z)];
    stat.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.16 * sc, 7, false), bark));
    const pads: [number, number, number, number][] = [
      [0.9, 1.4, 0.1, 1.0],
      [-1.0, 2.0, -0.1, 0.95],
      [0.6, 2.6, 0.1, 0.9],
      [-0.5, 3.1, 0, 0.8],
      [0.1, 3.6, 0, 0.6],
    ];
    for (const [dx, y, dz, rr] of pads) {
      const m = add(new THREE.SphereGeometry(rr * sc, 10, 7), pine, x + (dx + (r() - 0.5) * 0.2) * sc, y0 + (y - 0.6) * sc, z + dz * sc);
      m.scale.set(1.45, 0.38, 1.1);
    }
  };
  for (const s of [-1, 1]) {
    const px = s * 7.4;
    const pz = d / 2 + 3.4;
    add(new THREE.BoxGeometry(4.6, 0.7, 2.2), stoneW, px, 0.35, pz);
    add(new THREE.BoxGeometry(4.7, 0.04, 0.06), warmLight, px, 0.05, pz + 1.12);
    add(new THREE.BoxGeometry(4.3, 0.06, 1.9), new THREE.MeshStandardMaterial({ color: 0x35502e, roughness: 1 }), px, 0.71, pz);
    pineTree(px, pz, s > 0 ? 7 : 29, 1.1);
    col(px - 1.2, pz, 0.65, `pl${s}a`);
    col(px + 1.2, pz, 0.65, `pl${s}b`);
    col(px, pz, 0.65, `pl${s}c`);
  }
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff4dc, emissive: 0xffd9a0, emissiveIntensity: 1.3, roughness: 0.5 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.5, metalness: 0.4 });
  for (const [x, z] of [
    [-4.3, d / 2 + 5.2],
    [4.3, d / 2 + 5.2],
    [-9.6, d / 2 + 5.2],
    [9.6, d / 2 + 5.2],
    [-9.6, d / 2 + 1.2],
    [9.6, d / 2 + 1.2],
  ] as [number, number][]) {
    add(new THREE.BoxGeometry(0.62, 0.12, 0.62), frameMat, x, 0.06, z);
    add(new THREE.BoxGeometry(0.5, 0.9, 0.5), lampMat, x, 0.57, z);
    add(new THREE.BoxGeometry(0.66, 0.1, 0.66), frameMat, x, 1.07, z);
  }

  // ── 手把地徽外的發光圓環（地徽本身在 createPlazaMedallions） ──
  {
    const mz = d / 2 + 6.6;
    for (const r of [3.3, 4.3]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.06, r + 0.06, 96).rotateX(-Math.PI / 2), coolLight);
      ring.position.set(0, 0.045, mz);
      ring.userData.noMerge = true;
      root.add(ring);
    }
    const arc = new THREE.Mesh(new THREE.RingGeometry(5.2, 5.32, 96, 1, 0.3, Math.PI - 0.6).rotateX(-Math.PI / 2), coolLight);
    arc.position.set(0, 0.045, mz);
    arc.userData.noMerge = true;
    root.add(arc);
  }

  mergeByMaterial(stat);
  root.updateMatrixWorld(true);
  return { group: root, colliders };
}

/* ---------------- 展覽館（照參考圖重建）：清水模量體、大圓洞牆、倒影水池與發光步道 ---------------- */

function drawTriplePyramidEmblem(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string, lw: number) {
  g.save();
  g.strokeStyle = color;
  g.lineWidth = lw;
  g.lineJoin = 'round';
  g.lineCap = 'round';

  // 中央主金字塔（最高峰）
  g.beginPath();
  g.moveTo(cx - s * 0.58, cy + s * 0.48);
  g.lineTo(cx, cy - s * 0.62);
  g.lineTo(cx + s * 0.58, cy + s * 0.48);
  g.closePath();
  g.stroke();
  // 中央主峰內部稜線
  g.beginPath();
  g.moveTo(cx, cy - s * 0.62);
  g.lineTo(cx - s * 0.14, cy + s * 0.48);
  g.stroke();

  // 左側重疊副金字塔
  g.beginPath();
  g.moveTo(cx - s * 1.05, cy + s * 0.48);
  g.lineTo(cx - s * 0.52, cy - s * 0.26);
  g.lineTo(cx - s * 0.02, cy + s * 0.48);
  g.closePath();
  g.stroke();
  g.beginPath();
  g.moveTo(cx - s * 0.52, cy - s * 0.26);
  g.lineTo(cx - s * 0.62, cy + s * 0.48);
  g.stroke();

  // 右側重疊副金字塔
  g.beginPath();
  g.moveTo(cx + s * 0.05, cy + s * 0.48);
  g.lineTo(cx + s * 0.54, cy - s * 0.22);
  g.lineTo(cx + s * 1.05, cy + s * 0.48);
  g.closePath();
  g.stroke();
  g.beginPath();
  g.moveTo(cx + s * 0.54, cy - s * 0.22);
  g.lineTo(cx + s * 0.64, cy + s * 0.48);
  g.stroke();
  g.restore();
}

function portalSignTex() {
  return canvasTex(1024, 640, (g) => {
    g.clearRect(0, 0, 1024, 640);
    // 暖金背光光暈
    const glow = g.createRadialGradient(512, 330, 30, 512, 330, 420);
    glow.addColorStop(0, 'rgba(255, 224, 166, 0.28)');
    glow.addColorStop(0.6, 'rgba(255, 210, 140, 0.08)');
    glow.addColorStop(1, 'rgba(255, 210, 140, 0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, 1024, 640);

    g.shadowColor = '#ffd084';
    g.shadowBlur = 28;
    drawTriplePyramidEmblem(g, 512, 155, 92, '#fff0d0', 9);

    g.fillStyle = '#fff3da';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `900 162px ${KAI}`;
    g.fillText('展覽館', 512, 365);

    g.shadowBlur = 14;
    g.fillStyle = '#fbe5be';
    g.font = '600 54px Georgia, "Times New Roman", serif';
    g.fillText('IdeaX', 512, 505);
    g.fillRect(250, 505, 145, 3.5);
    g.fillRect(629, 505, 145, 3.5);
  });
}

function exhibitBannerTex(text: string) {
  return canvasTex(256, 1024, (g) => {
    // 深炭黑消光布面與漸層光澤
    const bg = g.createLinearGradient(0, 0, 256, 1024);
    bg.addColorStop(0, '#19191b');
    bg.addColorStop(0.5, '#121214');
    bg.addColorStop(1, '#1d1b18');
    g.fillStyle = bg;
    g.fillRect(0, 0, 256, 1024);

    // 外框雙層香檳金細線
    g.strokeStyle = '#9e8b6c';
    g.lineWidth = 3.5;
    g.strokeRect(14, 16, 228, 992);
    g.strokeStyle = 'rgba(218, 196, 158, 0.45)';
    g.lineWidth = 1.5;
    g.strokeRect(22, 24, 212, 976);

    // 底部暖光洗牆漸層
    const bot = g.createLinearGradient(0, 1024, 0, 740);
    bot.addColorStop(0, 'rgba(255, 214, 150, 0.28)');
    bot.addColorStop(1, 'rgba(255, 214, 150, 0)');
    g.fillStyle = bot;
    g.fillRect(14, 740, 228, 268);

    // 直排發光書法字
    g.shadowColor = 'rgba(255, 230, 185, 0.65)';
    g.shadowBlur = 12;
    g.fillStyle = '#f8f2e6';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `900 138px ${KAI}`;
    Array.from(text).forEach((ch, i) => g.fillText(ch, 128, 165 + i * 178));

    g.shadowBlur = 6;
    drawTriplePyramidEmblem(g, 128, 905, 48, '#dfd2bc', 4.2);
  });
}

/** 左側石材高牆巨幅藝術海報：古典雕像特展黑金直幡 */
function posterSculptureTex() {
  return canvasTex(512, 1400, (g) => {
    const bg = g.createLinearGradient(0, 0, 0, 1400);
    bg.addColorStop(0, '#141518');
    bg.addColorStop(0.65, '#1b1a19');
    bg.addColorStop(1, '#101012');
    g.fillStyle = bg;
    g.fillRect(0, 0, 512, 1400);

    // 戲劇性暖金側光背景
    const halo = g.createRadialGradient(270, 520, 30, 256, 520, 360);
    halo.addColorStop(0, 'rgba(235, 210, 175, 0.42)');
    halo.addColorStop(0.55, 'rgba(160, 138, 112, 0.16)');
    halo.addColorStop(1, 'rgba(20, 20, 22, 0)');
    g.fillStyle = halo;
    g.fillRect(0, 120, 512, 820);

    // 古典石膏半身像剪影與光影刻畫（明暗對比）
    g.save();
    // 肩頸底座
    const bustGr = g.createLinearGradient(110, 400, 390, 820);
    bustGr.addColorStop(0, '#e8dfd1');
    bustGr.addColorStop(0.48, '#b8ada0');
    bustGr.addColorStop(0.75, '#59534d');
    bustGr.addColorStop(1, '#23201e');
    g.fillStyle = bustGr;
    g.beginPath();
    g.moveTo(85, 920);
    g.quadraticCurveTo(120, 740, 195, 700);
    g.lineTo(315, 700);
    g.quadraticCurveTo(395, 745, 425, 920);
    g.closePath();
    g.fill();

    // 臉部輪廓與雕塑明暗面
    const faceGr = g.createLinearGradient(155, 310, 365, 620);
    faceGr.addColorStop(0, '#f4ede2');
    faceGr.addColorStop(0.45, '#cbbba8');
    faceGr.addColorStop(0.7, '#6d6359');
    faceGr.addColorStop(1, '#262321');
    g.fillStyle = faceGr;
    g.beginPath();
    g.ellipse(260, 485, 108, 148, -0.04, 0, Math.PI * 2);
    g.fill();

    // 捲髮雕塑塊面
    const hairClusters: [number, number, number, string][] = [
      [175, 360, 42, '#ded4c6'],
      [215, 325, 46, '#ebe2d5'],
      [268, 318, 48, '#d4c7b7'],
      [320, 338, 44, '#9a8e80'],
      [358, 382, 42, '#625950'],
      [152, 415, 38, '#cfc3b4'],
      [158, 470, 34, '#b5a899'],
      [368, 440, 36, '#4d463f'],
    ];
    for (const [hx, hy, hr, col] of hairClusters) {
      g.fillStyle = col;
      g.beginPath();
      g.arc(hx, hy, hr, 0, Math.PI * 2);
      g.fill();
    }

    // 鼻樑、眉骨、眼窩與唇部古典陰影
    g.fillStyle = 'rgba(38, 33, 29, 0.72)';
    g.beginPath();
    g.ellipse(222, 468, 24, 14, 0.08, 0, Math.PI * 2);
    g.ellipse(304, 468, 24, 14, -0.08, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#efe7dc';
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(262, 445);
    g.lineTo(256, 536);
    g.lineTo(278, 544);
    g.stroke();
    g.fillStyle = 'rgba(48, 42, 37, 0.65)';
    g.beginPath();
    g.ellipse(262, 578, 32, 10, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();

    // 底部展覽字樣
    g.fillStyle = '#e5d8c3';
    g.textAlign = 'center';
    g.font = '600 44px Georgia, serif';
    g.fillText('IdeaX', 256, 1135);
    g.font = `700 56px ${KAI}`;
    g.fillText('藝術典藏展', 256, 1225);

    g.strokeStyle = '#8b7b62';
    g.lineWidth = 4;
    g.strokeRect(18, 18, 476, 1364);
  });
}

/** 右側與左外翼黑金幾何星體海報 */
function posterCosmosTex() {
  return canvasTex(512, 1400, (g) => {
    g.fillStyle = '#121316';
    g.fillRect(0, 0, 512, 1400);

    // 頂部標誌與館名
    drawTriplePyramidEmblem(g, 256, 170, 52, '#d8c9b0', 4.5);
    g.fillStyle = '#efe5d4';
    g.textAlign = 'center';
    g.font = '600 40px Georgia, serif';
    g.fillText('IdeaX', 256, 290);
    g.font = `800 72px ${KAI}`;
    g.fillText('展覽館', 256, 395);

    // 中央銀白光影球體與星環
    const sp = g.createRadialGradient(210, 740, 20, 260, 780, 165);
    sp.addColorStop(0, '#f5efe6');
    sp.addColorStop(0.45, '#b8b2aa');
    sp.addColorStop(0.8, '#464547');
    sp.addColorStop(1, '#151619');
    g.fillStyle = sp;
    g.beginPath();
    g.arc(256, 770, 155, 0, Math.PI * 2);
    g.fill();

    // 下方第二顆半影球體
    const sp2 = g.createRadialGradient(290, 1120, 15, 256, 1160, 150);
    sp2.addColorStop(0, '#ded6c9');
    sp2.addColorStop(0.55, '#6e6a66');
    sp2.addColorStop(1, '#121316');
    g.fillStyle = sp2;
    g.beginPath();
    g.arc(256, 1140, 135, 0, Math.PI * 2);
    g.fill();

    g.strokeStyle = '#8b7b62';
    g.lineWidth = 4;
    g.strokeRect(18, 18, 476, 1364);
  });
}

/** 淺暖灰精密切割石材貼圖（用於門樓與幾何側翼量體） */
function ashlarLimestoneTex() {
  return canvasTex(512, 512, (g) => {
    const gr = g.createLinearGradient(0, 0, 512, 512);
    gr.addColorStop(0, '#dfdcd5');
    gr.addColorStop(0.5, '#d5d1c8');
    gr.addColorStop(1, '#cbc6bc');
    g.fillStyle = gr;
    g.fillRect(0, 0, 512, 512);

    // 細緻石材顆粒與色差塊面
    const rows = 8;
    const rowH = 512 / rows;
    for (let r = 0; r < rows; r++) {
      const cols = r % 2 === 0 ? 4 : 5;
      const colW = 512 / cols;
      for (let c = 0; c < cols; c++) {
        const shade = ((r * 7 + c * 13) % 5) * 3 - 6;
        const v = 212 + shade;
        g.fillStyle = `rgb(${v + 3}, ${v}, ${v - 6})`;
        g.fillRect(c * colW + 2, r * rowH + 2, colW - 4, rowH - 4);
      }
    }

    // 精密石縫線
    g.strokeStyle = 'rgba(120, 114, 105, 0.42)';
    g.lineWidth = 2;
    for (let r = 0; r <= rows; r++) {
      g.beginPath();
      g.moveTo(0, r * rowH);
      g.lineTo(512, r * rowH);
      g.stroke();
      const cols = r % 2 === 0 ? 4 : 5;
      const colW = 512 / cols;
      for (let c = 0; c <= cols; c++) {
        g.beginPath();
        g.moveTo(c * colW, r * rowH);
        g.lineTo(c * colW, (r + 1) * rowH);
        g.stroke();
      }
    }
  });
}

/** 側翼挑高玻璃帷幕內透出的暖光藝廊與展台 */
function galleryWindowTex() {
  return canvasTex(512, 512, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, '#fce8c3');
    gr.addColorStop(0.55, '#e8be84');
    gr.addColorStop(1, '#b88349');
    g.fillStyle = gr;
    g.fillRect(0, 0, 512, 512);

    // 樓層天花燈帶
    g.fillStyle = '#fff8ea';
    for (const y of [45, 255, 295]) {
      g.fillRect(24, y, 464, 8);
    }
    // 二樓樓板線
    g.fillStyle = '#5c4e3e';
    g.fillRect(0, 268, 512, 18);

    // 藝廊內的雕塑展座與暖光投射
    g.fillStyle = 'rgba(72, 54, 38, 0.55)';
    for (let i = 0; i < 5; i++) {
      const x = 55 + i * 95;
      g.fillRect(x, 195, 34, 73);
      g.beginPath();
      g.arc(x + 17, 172, 16, 0, Math.PI * 2);
      g.fill();
      g.fillRect(x + 6, 410, 30, 95);
    }
  });
}

/** 前庭廣場中央圓形幾何石材拼花羅盤 */
function plazaMedallionTex() {
  return canvasTex(512, 512, (g) => {
    g.clearRect(0, 0, 512, 512);
    const cx = 256;
    const cy = 256;
    // 外圈深灰花崗石環
    g.strokeStyle = 'rgba(75, 72, 68, 0.72)';
    g.lineWidth = 18;
    g.beginPath();
    g.arc(cx, cy, 232, 0, Math.PI * 2);
    g.stroke();

    // 內圈香檳金與淺石材同心環
    g.strokeStyle = 'rgba(186, 162, 122, 0.78)';
    g.lineWidth = 6;
    for (const r of [212, 168, 118, 62]) {
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.stroke();
    }

    // 放射幾何分格線
    g.strokeStyle = 'rgba(95, 88, 78, 0.55)';
    g.lineWidth = 4;
    for (let i = 0; i < 16; i++) {
      const ang = (i * Math.PI) / 8;
      g.beginPath();
      g.moveTo(cx + Math.cos(ang) * 62, cy + Math.sin(ang) * 62);
      g.lineTo(cx + Math.cos(ang) * 232, cy + Math.sin(ang) * 232);
      g.stroke();
    }
  });
}

export function createExhibitionFacade(b: BuildingInteractable): { group: THREE.Group; colliders: Collider[] } {
  const root = new THREE.Group();
  root.name = `facade_${b.id}`;
  root.position.copy(b.position);
  root.rotation.y = b.facingYaw;
  const stat = new THREE.Group();
  root.add(stat);
  const colliders: Collider[] = [];
  const cy = Math.cos(b.facingYaw);
  const sy = Math.sin(b.facingYaw);
  const toWorld = (lx: number, lz: number): [number, number] => [b.position.x + lx * cy + lz * sy, b.position.z - lx * sy + lz * cy];

  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, parent: THREE.Object3D = stat) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const plane = (tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0, emissive = 0.45, transparent = false) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({
        map: tex,
        emissive: 0xffffff,
        emissiveMap: tex,
        emissiveIntensity: emissive,
        roughness: 0.55,
        transparent,
        side: THREE.DoubleSide,
      })
    );
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.userData.noMerge = true;
    root.add(m);
    return m;
  };

  // 連接任意 3D 兩點的鋼構桿件（用於菱格玻璃金字塔與右後光塔）
  const upVec = new THREE.Vector3(0, 1, 0);
  const addBeam = (p1: THREE.Vector3, p2: THREE.Vector3, radius: number, mat: THREE.Material) => {
    const diff = new THREE.Vector3().subVectors(p2, p1);
    const len = diff.length();
    if (len < 0.04) return;
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const geo = new THREE.BoxGeometry(radius * 2, len, radius * 2);
    const q = new THREE.Quaternion().setFromUnitVectors(upVec, diff.clone().normalize());
    geo.applyQuaternion(q);
    geo.translate(mid.x, mid.y, mid.z);
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    stat.add(m);
  };

  const addTriGlass = (a: THREE.Vector3, bPt: THREE.Vector3, c: THREE.Vector3, mat: THREE.Material, order = 3) => {
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array([a.x, a.y, a.z, bPt.x, bPt.y, bPt.z, c.x, c.y, c.z]);
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);
    m.userData.noMerge = true;
    m.renderOrder = order;
    root.add(m);
    return m;
  };

  let cid = 0;
  const seg = (x1: number, z1: number, x2: number, z2: number, th = 0.25) => {
    const [a, bb] = toWorld(x1, z1);
    const [c, dd] = toWorld(x2, z2);
    colliders.push({ id: `${b.id}-ex-${cid++}`, type: 'segment', x1: a, z1: bb, x2: c, z2: dd, halfThickness: th });
  };
  const rect = (x0: number, z0: number, x1: number, z1: number) => {
    seg(x0, z0, x1, z0);
    seg(x1, z0, x1, z1);
    seg(x1, z1, x0, z1);
    seg(x0, z1, x0, z0);
  };

  const w = b.width;
  const d = b.depth;
  const h = b.height;
  const fz = d / 2 + 0.25; // 9.25

  const stoneBaseTex = ashlarLimestoneTex();
  stoneBaseTex.wrapS = THREE.RepeatWrapping;
  stoneBaseTex.wrapT = THREE.RepeatWrapping;
  const limestone = (rx: number, ry: number) => {
    const t = stoneBaseTex.clone();
    t.needsUpdate = true;
    t.repeat.set(Math.max(1, rx / 5.5), Math.max(1, ry / 5.5));
    return new THREE.MeshStandardMaterial({
      map: t,
      roughness: 0.72,
      metalness: 0.06,
      emissive: 0x2d2923,
      emissiveIntensity: 0.28,
    });
  };
  const limestonePlain = new THREE.MeshStandardMaterial({
    color: 0xd9d4cb,
    roughness: 0.72,
    metalness: 0.06,
    emissive: 0x2d2923,
    emissiveIntensity: 0.26,
  });
  const darkStone = new THREE.MeshStandardMaterial({ color: 0x3b3a38, roughness: 0.65, metalness: 0.15 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x26282c, roughness: 0.36, metalness: 0.72 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0x5c4b37, roughness: 0.35, metalness: 0.68 });
  const warmGlow = new THREE.MeshBasicMaterial({ color: 0xffe4b5 });
  const chandelierMat = new THREE.MeshStandardMaterial({
    color: 0xfff5e0,
    emissive: 0xffd28a,
    emissiveIntensity: 1.55,
    roughness: 0.2,
    metalness: 0.3,
  });
  const pyramidGlass = new THREE.MeshPhysicalMaterial({
    color: 0xdcebf7,
    emissive: 0xffcf8b,
    emissiveIntensity: 0.18,
    roughness: 0.08,
    metalness: 0.18,
    transparent: true,
    opacity: 0.38,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const pyramidInnerGlow = new THREE.MeshBasicMaterial({
    color: 0xffd99c,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const galTex = galleryWindowTex();

  // ══════════════════════════════════════════════════════════════════════════
  // 1. 中央全通透三角形菱格水晶玻璃金字塔 (Full-Height Triangular Crystal Glass Pyramid)
  //    正中央自地面 (y = 0.15) 直接斜升至塔尖 (y = 19.2)，完全為透明三角形玻璃金字塔（中間無任何方形水泥牆），
  //    只有左右兩側（|x| >= 10.6）與後方退縮階層才是方形水泥石材量體
  // ══════════════════════════════════════════════════════════════════════════
  {
    const apex = v3(0, 19.2, 1.4);
    // 正面三角形底角直接落地於門樓左右兩側（x = -10.8 .. +10.8, y = 0.15），形成純粹的巨型三角形玻璃立面
    const fl = v3(-10.8, 0.15, fz + 1.35);
    const fr = v3(10.8, 0.15, fz + 1.35);
    // 左右側斜面往後延伸至 z = 1.4 銜接兩側方形水泥量體
    const ml = v3(-10.8, 0.15, 1.4);
    const mr = v3(10.8, 0.15, 1.4);
    // 後方高處屋脊銜接後側大廳屋頂（y = 11.2，完全高於一樓大廳與左右排行榜）
    const bl = v3(-10.6, 11.2, -d / 2);
    const br = v3(10.6, 11.2, -d / 2);

    // 主斜脊鋼樑
    addBeam(apex, fl, 0.115, steel);
    addBeam(apex, fr, 0.115, steel);
    addBeam(apex, ml, 0.105, steel);
    addBeam(apex, mr, 0.105, steel);
    addBeam(apex, bl, 0.1, steel);
    addBeam(apex, br, 0.1, steel);
    // 底框鋼樑（避開正中央門樓開口 x = -4.4 .. +4.4）
    addBeam(fl, v3(-4.4, 0.15, fz + 1.35), 0.09, steel);
    addBeam(v3(4.4, 0.15, fz + 1.35), fr, 0.09, steel);
    addBeam(fl, ml, 0.09, steel);
    addBeam(fr, mr, 0.09, steel);
    addBeam(bl, br, 0.09, steel);

    // 雙層透明玻璃面（正面完整大三角形 + 左右斜翼三角形 + 後上屋頂斜面）
    const faces: [THREE.Vector3, THREE.Vector3, THREE.Vector3][] = [
      [apex, fl, fr], // 正面巨型三角形玻璃
      [apex, ml, fl], // 左前側面三角形玻璃
      [apex, fr, mr], // 右前側面三角形玻璃
      [apex, br, bl], // 背上斜面玻璃
    ];
    for (const [A, B, C] of faces) {
      addTriGlass(A, B, C, pyramidGlass, 3);
      const shrink = (p: THREE.Vector3) => new THREE.Vector3(p.x * 0.985, p.y - 0.06, p.z * 0.985);
      addTriGlass(shrink(A), shrink(B), shrink(C), pyramidInnerGlow, 2);
    }

    // 菱格斜交鋼構網格（Diamond Space-Frame Lattice）
    const lerp3 = (a: THREE.Vector3, bPt: THREE.Vector3, t: number) => new THREE.Vector3().lerpVectors(a, bPt, t);
    const triPt = (A: THREE.Vector3, B: THREE.Vector3, C: THREE.Vector3, nSeg: number, i: number, j: number) => {
      if (i === 0) return A.clone();
      const rowL = lerp3(A, B, i / nSeg);
      const rowR = lerp3(A, C, i / nSeg);
      return lerp3(rowL, rowR, j / i);
    };
    const isInsidePortalCutout = (p: THREE.Vector3) => p.z > fz - 0.2 && p.y < 10.7 && Math.abs(p.x) < 4.35;

    for (let fIdx = 0; fIdx < 3; fIdx++) {
      const [A, B, C] = faces[fIdx];
      const N = fIdx === 0 ? 8 : 6;
      for (let i = 0; i < N; i++) {
        for (let j = 0; j <= i; j++) {
          const pTop = triPt(A, B, C, N, i, j);
          const pBotL = triPt(A, B, C, N, i + 1, j);
          const pBotR = triPt(A, B, C, N, i + 1, j + 1);
          if (!(fIdx === 0 && isInsidePortalCutout(pTop) && isInsidePortalCutout(pBotL))) {
            addBeam(pTop, pBotL, 0.046, steel);
          }
          if (!(fIdx === 0 && isInsidePortalCutout(pTop) && isInsidePortalCutout(pBotR))) {
            addBeam(pTop, pBotR, 0.046, steel);
          }
          if (!(fIdx === 0 && isInsidePortalCutout(pBotL) && isInsidePortalCutout(pBotR))) {
            addBeam(pBotL, pBotR, 0.036, steel);
          }
          if (fIdx === 0 && i >= 2 && i < N - 1 && j > 0 && j < i && !isInsidePortalCutout(pTop)) {
            const pIn = new THREE.Vector3(pTop.x * 0.95, pTop.y - 0.32, pTop.z - 0.42);
            addBeam(pTop, pIn, 0.026, bronze);
          }
        }
      }
    }

    // 金字塔頂端內部懸浮的流線螺旋光帶吊燈（透過三角形玻璃清晰可見）
    for (let strand = 0; strand < 2; strand++) {
      const curvePts: THREE.Vector3[] = [];
      const phase = strand * Math.PI;
      for (let s = 0; s <= 36; s++) {
        const t = s / 36;
        const yy = 10.6 + t * 6.6;
        const rad = (1 - t * 0.68) * 2.15 + Math.sin(t * Math.PI * 3) * 0.25;
        const ang = t * Math.PI * 5.5 + phase;
        curvePts.push(v3(Math.cos(ang) * rad, yy, 1.4 + Math.sin(ang) * rad * 0.85));
      }
      const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curvePts), 64, 0.065, 8, false);
      add(tube, chandelierMat, 0, 0, 0);
    }
    for (const [ry, rr] of [
      [11.4, 2.1],
      [12.9, 1.65],
      [14.4, 1.2],
      [15.8, 0.75],
    ] as [number, number][]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.055, 8, 40), chandelierMat);
      ring.rotation.x = Math.PI / 2 + 0.14;
      ring.rotation.z = ry * 0.3;
      ring.position.set(0, ry, 1.4);
      stat.add(ring);
    }

    // 三角形玻璃金字塔左右落地底角碰撞（中央大門暢通）
    rect(-10.8, fz - 0.2, -4.5, fz + 1.35);
    rect(4.5, fz - 0.2, 10.8, fz + 1.35);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 2. 右後方高聳玻璃光塔 (Upper-Right Rectangular Glass Lantern Tower)
  // ══════════════════════════════════════════════════════════════════════════
  {
    const tx = 4.65;
    const tz = -2.2;
    const tw = 5.4;
    const td = 4.6;
    const yBase = 12.2;
    const yTop = 20.8;
    const th = yTop - yBase;

    // 石材基座環領
    add(new THREE.BoxGeometry(tw + 0.5, 2.2, td + 0.5), limestone(tw, 2.2), tx, yBase + 1.1, tz);

    // 內部暖光展廳核心與螺旋樓梯剪影
    const coreMat = new THREE.MeshStandardMaterial({
      map: galTex,
      emissive: 0xffd28a,
      emissiveMap: galTex,
      emissiveIntensity: 0.95,
      roughness: 0.4,
    });
    const core = new THREE.Mesh(new THREE.BoxGeometry(tw - 0.7, th - 1.8, td - 0.7), coreMat);
    core.position.set(tx, yBase + 1.1 + (th - 1.8) / 2, tz);
    core.userData.noMerge = true;
    root.add(core);

    // 外層四面透明玻璃罩
    const lanternGlass = new THREE.Mesh(new THREE.BoxGeometry(tw, th - 1.4, td), pyramidGlass);
    lanternGlass.position.set(tx, yBase + 1.4 + (th - 1.4) / 2, tz);
    lanternGlass.userData.noMerge = true;
    lanternGlass.renderOrder = 3;
    root.add(lanternGlass);

    // 黑色鋼構立柱、水平環樑與 X 型斜撐
    const xL = tx - tw / 2;
    const xR = tx + tw / 2;
    const zF = tz + td / 2;
    const zB = tz - td / 2;
    for (let ix = 0; ix <= 3; ix++) {
      const xx = xL + (tw * ix) / 3;
      addBeam(v3(xx, yBase + 1.4, zF), v3(xx, yTop, zF), 0.055, steel);
      addBeam(v3(xx, yBase + 1.4, zB), v3(xx, yTop, zB), 0.055, steel);
    }
    for (let iz = 0; iz <= 2; iz++) {
      const zz = zB + (td * iz) / 2;
      addBeam(v3(xL, yBase + 1.4, zz), v3(xL, yTop, zz), 0.055, steel);
      addBeam(v3(xR, yBase + 1.4, zz), v3(xR, yTop, zz), 0.055, steel);
    }
    for (const yy of [yBase + 4.2, yBase + 6.8, yTop]) {
      addBeam(v3(xL, yy, zF), v3(xR, yy, zF), 0.055, steel);
      addBeam(v3(xL, yy, zB), v3(xR, yy, zB), 0.055, steel);
      addBeam(v3(xL, yy, zB), v3(xL, yy, zF), 0.055, steel);
      addBeam(v3(xR, yy, zB), v3(xR, yy, zF), 0.055, steel);
    }
    addBeam(v3(xL, yBase + 2.0, zF), v3(xR, yTop, zF), 0.04, steel);
    addBeam(v3(xR, yBase + 2.0, zF), v3(xL, yTop, zF), 0.04, steel);
    addBeam(v3(xR, yBase + 2.0, zF), v3(xR, yTop, zB), 0.04, steel);

    // 塔頂斜切玻璃採光頂
    const roofPeakL = v3(xL, yTop + 1.35, tz);
    const roofPeakR = v3(xR, yTop + 1.35, tz);
    addBeam(v3(xL, yTop, zF), roofPeakL, 0.055, steel);
    addBeam(v3(xL, yTop, zB), roofPeakL, 0.055, steel);
    addBeam(v3(xR, yTop, zF), roofPeakR, 0.055, steel);
    addBeam(v3(xR, yTop, zB), roofPeakR, 0.055, steel);
    addBeam(roofPeakL, roofPeakR, 0.06, steel);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 3. 正門幾何斜切石材門樓 (Monumental Angular Limestone Entrance Portal)
  // ══════════════════════════════════════════════════════════════════════════
  {
    const pOutX = 4.45;
    const pInX = 2.75; // 中央 5.5m 挑高入口通道，玩家可直接走進一樓大廳
    const doorH = 5.55;
    const pedTopY = 10.85;
    const pedTopHalfW = 1.85;
    const zBack = fz - 0.15;
    const zFront = fz + 2.35;
    const pDepth = zFront - zBack;

    // 左右厚實石材門柱（掛「親子同樂」、「雅俗共賞」黑金直幡）
    const pierW = pOutX - pInX; // 1.7m
    for (const sx of [-1, 1]) {
      const px = sx * (pInX + pierW / 2);
      add(new THREE.BoxGeometry(pierW, doorH, pDepth), limestone(pierW, doorH), px, doorH / 2, (zBack + zFront) / 2);
      add(new THREE.BoxGeometry(pierW + 0.08, 0.36, pDepth + 0.08), darkStone, px, 0.18, (zBack + zFront) / 2);
      rect(sx > 0 ? pInX : -pOutX, zBack, sx > 0 ? pOutX : -pInX, zFront);
    }

    // 門楣上方五角斜切石材山牆量體（順應後方三角形玻璃金字塔斜率向上收束）
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-pOutX, doorH);
    gableShape.lineTo(pOutX, doorH);
    gableShape.lineTo(pedTopHalfW, pedTopY);
    gableShape.lineTo(-pedTopHalfW, pedTopY);
    gableShape.closePath();
    const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: pDepth, bevelEnabled: false });
    add(gableGeo, limestone(pOutX * 2, pedTopY - doorH), 0, 0, zBack);

    // 山牆斜切頂緣深古銅金屬收邊壓條
    addBeam(v3(-pOutX, doorH, zFront), v3(-pedTopHalfW, pedTopY, zFront), 0.065, bronze);
    addBeam(v3(pOutX, doorH, zFront), v3(pedTopHalfW, pedTopY, zFront), 0.065, bronze);
    addBeam(v3(-pedTopHalfW, pedTopY, zFront), v3(pedTopHalfW, pedTopY, zFront), 0.065, bronze);

    // 正門山牆中央發光浮雕標誌：「三峰金字塔 + 展覽館 + — IdeaX —」
    plane(portalSignTex(), 5.8, 3.6, 0, 8.15, zFront + 0.04, 0, 1.05, true);

    // 左右門柱黑金直幡：「親子同樂」（左）、「雅俗共賞」（右）
    const banW = 1.34;
    const banH = 4.65;
    const banY = 2.88;
    for (const [sx, text] of [
      [-1, '親子同樂'],
      [1, '雅俗共賞'],
    ] as [number, string][]) {
      const bx = sx * (pInX + pierW / 2);
      plane(exhibitBannerTex(text), banW, banH, bx, banY, zFront + 0.05, 0, 0.48);
      add(new THREE.BoxGeometry(banW + 0.14, 0.06, 0.08), bronze, bx, banY + banH / 2 + 0.03, zFront + 0.05);
      add(new THREE.BoxGeometry(banW + 0.14, 0.06, 0.08), bronze, bx, banY - banH / 2 - 0.03, zFront + 0.05);
      add(new THREE.BoxGeometry(0.42, 0.08, 0.24), darkStone, bx, 0.04, zFront + 0.22);
      add(new THREE.BoxGeometry(0.3, 0.03, 0.12), warmGlow, bx, 0.09, zFront + 0.22);
    }

    // 門廊挑高內凹天花板、嵌燈與古銅玻璃門框
    add(new THREE.BoxGeometry(pInX * 2, 0.22, pDepth), limestonePlain, 0, doorH - 0.11, (zBack + zFront) / 2);
    add(new THREE.BoxGeometry(pInX * 2 - 0.3, 0.04, 0.12), warmGlow, 0, doorH - 0.23, zFront - 0.25);
    for (const lx of [-1.8, -0.6, 0.6, 1.8]) {
      for (const lz of [zBack + 0.7, zFront - 0.7]) {
        add(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 12), warmGlow, lx, doorH - 0.23, lz);
      }
    }

    // 門廊兩側敞開的古銅框落地玻璃門扇
    for (const sx of [-1, 1]) {
      const gx = sx * (pInX - 0.22);
      add(new THREE.BoxGeometry(0.08, doorH - 0.25, 0.12), bronze, sx * (pInX - 0.04), (doorH - 0.25) / 2, zBack + 0.4);
      add(new THREE.BoxGeometry(0.38, doorH - 0.3, 0.06), bronze, gx, (doorH - 0.3) / 2, zBack + 0.4);
      add(new THREE.CylinderGeometry(0.022, 0.022, 1.6, 8), warmGlow, sx * (pInX - 0.38), 1.6, zBack + 0.46);
    }

    // 正門三階寬幅迎賓石階
    for (let st = 0; st < 3; st++) {
      const sw = pOutX * 2 + 1.2 + st * 0.55;
      const sd = 0.34;
      const syH = 0.08;
      const sz = zFront + 0.17 + st * sd;
      const syPos = (2 - st) * syH + syH / 2;
      add(new THREE.BoxGeometry(sw, syH, sd), limestonePlain, 0, syPos, sz);
      add(new THREE.BoxGeometry(sw - 0.2, 0.02, 0.03), warmGlow, 0, syPos + syH / 2 - 0.01, sz + sd / 2 + 0.01);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 4. 兩側方形水泥石材量體與挑高玻璃側翼 (Flanking Rectangular Concrete/Limestone Wings)
  //    中間（-10.6 < x < 10.6）完全留給三角形水晶玻璃金字塔與一樓挑高大廳，
  //    方形水泥量體僅配置於三角形玻璃的左右兩旁（|x| >= 10.6）與後方退縮高層（y >= 11.2）
  // ══════════════════════════════════════════════════════════════════════════
  {
    // ── 左側翼（南側）：位於三角形玻璃左側的方形水泥塔樓 + 退縮高窗 + 兩幅黑金藝術海報 ──
    // 左側三角形玻璃斜邊後方露出的雙層暖光玻璃展廊（位於 z = 1.25, y = 6.2 .. 12.2）
    plane(galTex, 4.2, 6.0, -7.8, 9.2, 1.22, 0, 0.85);
    const leftCurtain = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 6.0), pyramidGlass);
    leftCurtain.position.set(-7.8, 9.2, 1.32);
    leftCurtain.userData.noMerge = true;
    leftCurtain.renderOrder = 3;
    root.add(leftCurtain);
    for (let k = 0; k <= 3; k++) {
      add(new THREE.BoxGeometry(0.07, 6.0, 0.12), steel, -9.8 + k * 1.33, 9.2, 1.34);
    }
    for (const yy of [6.2, 9.2, 12.2]) {
      add(new THREE.BoxGeometry(4.2, 0.09, 0.14), steel, -7.8, yy, 1.34);
    }

    // 左側主方形水泥石材塔樓（位於三角形玻璃左側 x = -14.2 .. -10.6，掛古典雕像特展巨幅直幡）
    const leftTowerW = 3.6;
    const leftTowerH = 13.6;
    const leftTowerD = 12.2;
    const leftTowerX = -10.6 - leftTowerW / 2; // -12.4
    const leftTowerZ = fz - 3.6; // 5.65 (front at fz + 2.5 = 11.75? Wait: let's set front at z = fz + 0.45 = 9.7)
    const ltFrontZ = fz + 0.45;
    add(new THREE.BoxGeometry(leftTowerW, leftTowerH, leftTowerD), limestone(leftTowerW, leftTowerH), leftTowerX, leftTowerH / 2, ltFrontZ - leftTowerD / 2);
    plane(posterSculptureTex(), 2.25, 6.6, leftTowerX, 8.2, ltFrontZ + 0.04, 0, 0.42);
    add(new THREE.BoxGeometry(2.45, 0.07, 0.1), bronze, leftTowerX, 11.53, ltFrontZ + 0.04);
    add(new THREE.BoxGeometry(2.45, 0.07, 0.1), bronze, leftTowerX, 4.87, ltFrontZ + 0.04);
    rect(leftTowerX - leftTowerW / 2, ltFrontZ - leftTowerD, leftTowerX + leftTowerW / 2, ltFrontZ);

    // 左後方高聳方形水泥量體：下段（x = -15.6 .. -10.6）圍塑大廳左牆，上段（y = 11.4 .. 15.8）在三角形玻璃左後方形成階梯水泥天際線
    add(new THREE.BoxGeometry(5.0, 15.8, d), limestone(5.0, 15.8), -13.1, 7.9, 0);
    add(new THREE.BoxGeometry(4.8, 4.4, 10.2), limestone(4.8, 4.4), -8.4, 13.6, -3.9);

    // 左最外翼退縮方形水泥牆（掛第二幅 IdeaX 展覽館黑金直幡，x = -16.8 .. -14.4）
    const loFrontZ = fz - 0.8;
    add(new THREE.BoxGeometry(2.4, 10.6, 8.0), limestone(2.4, 10.6), -15.4, 5.3, loFrontZ - 4.0);
    plane(posterCosmosTex(), 1.48, 4.8, -15.4, 6.4, loFrontZ + 0.04, 0, 0.4);
    rect(-16.6, loFrontZ - 8.0, -14.2, loFrontZ);

    // ── 右側翼（北側）：位於三角形玻璃右側的方形水泥肩牆 + 雙層挑高玻璃帷幕 + 右外翼宇宙球體水泥柱 ──
    // 右側高聳方形水泥肩部量體：下段位於 x = +10.6 .. +14.6（構成大廳右牆），上段（y = 11.2 .. 14.8）在三角形玻璃右斜坡後方形成方形水泥肩部
    add(new THREE.BoxGeometry(4.0, 14.6, d), limestone(4.0, 14.6), 12.6, 7.3, 0);
    add(new THREE.BoxGeometry(5.2, 3.8, 9.6), limestone(5.2, 3.8), 8.2, 13.1, -3.4);

    // 右側雙層挑高玻璃帷幕（夾於三角形玻璃右底角與右外翼方形水泥柱之間，x = 10.8 .. 13.4）
    const rcFrontZ = fz - 0.25;
    plane(galTex, 2.6, 10.2, 12.1, 5.3, rcFrontZ - 0.08, 0, 0.85);
    const rightCurtain = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 10.2), pyramidGlass);
    rightCurtain.position.set(12.1, 5.3, rcFrontZ + 0.02);
    rightCurtain.userData.noMerge = true;
    rightCurtain.renderOrder = 3;
    root.add(rightCurtain);
    for (const xx of [10.85, 12.1, 13.35]) {
      add(new THREE.BoxGeometry(0.07, 10.2, 0.12), steel, xx, 5.3, rcFrontZ + 0.04);
    }
    add(new THREE.BoxGeometry(2.6, 0.45, 0.22), limestonePlain, 12.1, 5.4, rcFrontZ + 0.04);
    add(new THREE.BoxGeometry(2.6, 0.25, 0.25), steel, 12.1, 10.35, rcFrontZ + 0.04);

    // 右外翼凸出方形水泥端柱（掛宇宙星體黑金直幡，x = 13.4 .. 15.8）
    const rtFrontZ = fz + 0.65;
    add(new THREE.BoxGeometry(2.4, 10.8, 10.0), limestone(2.4, 10.8), 14.6, 5.4, rtFrontZ - 5.0);
    plane(posterCosmosTex(), 1.68, 5.4, 14.6, 6.2, rtFrontZ + 0.04, 0, 0.42);
    add(new THREE.BoxGeometry(1.85, 0.07, 0.1), bronze, 14.6, 8.93, rtFrontZ + 0.04);
    add(new THREE.BoxGeometry(1.85, 0.07, 0.1), bronze, 14.6, 3.47, rtFrontZ + 0.04);
    rect(10.6, -d / 2, 15.8, rtFrontZ);

    // 大廳後牆（方形水泥石牆封閉背面 z = -d / 2，承載一樓大廳正面的榜單大螢幕）
    add(new THREE.BoxGeometry(22.4, 11.6, 0.55), limestone(22.4, 11.6), 0, 5.8, -d / 2 - 0.05);
    plane(galTex, 18.0, 2.2, 0, 9.8, -d / 2 - 0.35, Math.PI, 0.65);
    seg(-11.2, -d / 2, 11.2, -d / 2, 0.3);
    seg(-10.6, -d / 2, -10.6, fz, 0.3);
    seg(10.6, -d / 2, 10.6, fz, 0.3);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 5. 前庭迎客松盆景、盛開粉櫻、鏡面水景、圓形拼花廣場與方形石燈
  // ══════════════════════════════════════════════════════════════════════════
  {
    // ── 正門前地面圓形幾何石材拼花與暖光倒影 ──
    const med = new THREE.Mesh(
      new THREE.PlaneGeometry(5.6, 5.6).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({
        map: plazaMedallionTex(),
        roughness: 0.28,
        metalness: 0.2,
        transparent: true,
        depthWrite: false,
      })
    );
    med.position.set(0, 0.04, fz + 5.8);
    med.userData.noMerge = true;
    root.add(med);

    const poolGlow = new THREE.Mesh(
      new THREE.CircleGeometry(4.4, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        map: canvasTex(128, 128, (g) => {
          const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
          gr.addColorStop(0, 'rgba(255, 218, 155, 0.52)');
          gr.addColorStop(1, 'rgba(255, 218, 155, 0)');
          g.fillStyle = gr;
          g.fillRect(0, 0, 128, 128);
        }),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    poolGlow.position.set(0, 0.05, fz + 3.4);
    poolGlow.userData.noMerge = true;
    root.add(poolGlow);

    // ── 左右對稱迎客松石砌景觀花台 (Cloud-Pruned Pine Bonsai Planters) ──
    const barkMat = new THREE.MeshStandardMaterial({ color: 0x4b3626, roughness: 0.92 });
    const pineDark = new THREE.MeshStandardMaterial({ color: 0x264728, roughness: 0.8, emissive: 0x102112, emissiveIntensity: 0.22 });
    const pineMid = new THREE.MeshStandardMaterial({ color: 0x355e34, roughness: 0.78, emissive: 0x182e18, emissiveIntensity: 0.25 });
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x416436, roughness: 0.9 });

    for (const [px, pz, dir] of [
      [-6.85, fz + 2.85, -1],
      [6.85, fz + 2.85, 1],
    ] as [number, number, number][]) {
      // 深灰石砌花台與底部暖光燈帶
      add(new THREE.BoxGeometry(3.5, 0.42, 2.2), limestonePlain, px, 0.21, pz);
      add(new THREE.BoxGeometry(3.2, 0.14, 1.9), darkStone, px, 0.46, pz);
      add(new THREE.BoxGeometry(3.54, 0.03, 2.24), warmGlow, px, 0.04, pz);
      // 苔蘚土丘與景觀奇石
      const mound = add(new THREE.SphereGeometry(1.15, 12, 8), mossMat, px, 0.48, pz);
      mound.scale.set(1.3, 0.24, 0.75);
      for (const [rx, rz, rs] of [
        [-0.85, 0.35, 0.32],
        [0.75, 0.4, 0.28],
        [0.2, -0.42, 0.36],
      ] as [number, number, number][]) {
        const rock = add(new THREE.DodecahedronGeometry(rs, 1), darkStone, px + rx, 0.56, pz + rz);
        rock.scale.set(1.3, 0.75, 1.0);
      }

      // 蒼勁曲幹迎客松主幹與分枝
      const trunkPts = [
        v3(px - dir * 0.2, 0.5, pz),
        v3(px + dir * 0.35, 1.35, pz + 0.12),
        v3(px - dir * 0.25, 2.25, pz - 0.08),
        v3(px + dir * 0.15, 3.15, pz + 0.05),
        v3(px, 3.75, pz),
      ];
      stat.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(trunkPts), 20, 0.16, 7, false), barkMat));
      const branchPts = [
        v3(px + dir * 0.2, 1.5, pz + 0.08),
        v3(px + dir * 0.95, 1.85, pz + 0.18),
        v3(px + dir * 1.45, 1.95, pz + 0.22),
      ];
      stat.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(branchPts), 12, 0.09, 6, false), barkMat));

      // 層雲狀翠綠松針團（Cloud-Pruned Pine Pads）
      const pads: [number, number, number, number, boolean][] = [
        [dir * 1.35, 1.95, 0.2, 0.92, true],
        [-dir * 1.05, 1.75, 0.1, 0.88, false],
        [dir * 0.65, 2.55, -0.1, 0.95, true],
        [-dir * 0.75, 2.85, 0.08, 0.82, false],
        [dir * 0.35, 3.35, 0.05, 0.78, true],
        [0, 3.85, 0, 0.72, true],
      ];
      for (const [dx, py, dz, rr, isMid] of pads) {
        const pad = add(new THREE.SphereGeometry(rr, 12, 8), isMid ? pineMid : pineDark, px + dx, py, pz + dz);
        pad.scale.set(1.55, 0.34, 1.15);
      }

      // 松樹下方暖光投樹燈
      add(new THREE.CylinderGeometry(0.12, 0.14, 0.08, 10), warmGlow, px, 0.56, pz + 0.55);
      rect(px - 1.75, pz - 1.1, px + 1.75, pz + 1.1);
    }

    // ── 左右外翼盛開粉紅櫻花樹 (Blooming Pink Cherry Blossom Trees) ──
    const sakuraPink1 = new THREE.MeshStandardMaterial({ color: 0xf7b9ce, roughness: 0.75, emissive: 0xd97a98, emissiveIntensity: 0.28 });
    const sakuraPink2 = new THREE.MeshStandardMaterial({ color: 0xffd6e4, roughness: 0.72, emissive: 0xe899b3, emissiveIntensity: 0.32 });
    for (const [sx, sz, dir] of [
      [-11.35, fz + 2.95, -1],
      [12.45, fz + 2.95, 1],
    ] as [number, number, number][]) {
      const sTrunk = [
        v3(sx, 0.2, sz),
        v3(sx + dir * 0.25, 1.4, sz + 0.1),
        v3(sx - dir * 0.15, 2.6, sz + 0.15),
        v3(sx + dir * 0.2, 3.6, sz + 0.2),
      ];
      stat.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sTrunk), 14, 0.13, 6, false), barkMat));
      const blossoms: [number, number, number, number, boolean][] = [
        [0, 3.6, 0.2, 1.15, true],
        [dir * 0.9, 3.1, 0.35, 0.95, false],
        [-dir * 0.8, 2.9, 0.25, 0.9, true],
        [dir * 0.4, 4.2, 0.1, 0.85, false],
        [-dir * 0.35, 3.9, -0.2, 0.82, true],
      ];
      for (const [bx, by, bz, br, alt] of blossoms) {
        const bl = add(new THREE.SphereGeometry(br, 10, 8), alt ? sakuraPink2 : sakuraPink1, sx + bx, by, sz + bz);
        bl.scale.set(1.25, 0.78, 1.15);
      }
    }

    // ── 鏡面淺水景與發光石材護岸（左南側內縮保留往電玩城寬敞通道） ──
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x162029, roughness: 0.04, metalness: 0.78 });
    const WALK = 3.1;
    const za = fz + 4.25;
    const zb = fz + 7.25;
    for (const s of [-1, 1]) {
      const xa = s * WALK;
      const xb = s > 0 ? 12.6 : -6.8; // 左側只到 -6.8，讓西南角通道完全開闊
      const xc = (xa + xb) / 2;
      const zc = (za + zb) / 2;
      const ww = Math.abs(xb - xa);
      add(new THREE.BoxGeometry(ww, 0.22, zb - za), limestonePlain, xc, 0.11, zc);
      add(new THREE.BoxGeometry(ww - 0.36, 0.05, zb - za - 0.36), waterMat, xc, 0.23, zc);
      // 水池底部邊緣暖光燈帶
      add(new THREE.BoxGeometry(ww + 0.04, 0.03, 0.04), warmGlow, xc, 0.03, za - 0.02);
      add(new THREE.BoxGeometry(0.04, 0.03, zb - za), warmGlow, xa - s * 0.02, 0.03, zc);
      rect(Math.min(xa, xb), za, Math.max(xa, xb), zb);
    }

    // ── 現代方形暖光石燈籠陣列 (Modern Square Stone & Frosted-Glass Lanterns) ──
    const lampCoreMat = new THREE.MeshStandardMaterial({
      color: 0xfff6e3,
      emissive: 0xffd596,
      emissiveIntensity: 1.45,
      roughness: 0.35,
    });
    const addSquareLantern = (lx: number, lz: number, scale = 1.0) => {
      const bw = 0.52 * scale;
      const bh = 0.72 * scale;
      add(new THREE.BoxGeometry(bw * 1.18, 0.12 * scale, bw * 1.18), darkStone, lx, 0.06 * scale, lz);
      add(new THREE.BoxGeometry(bw, bh, bw), lampCoreMat, lx, (0.12 + bh / 2) * scale, lz);
      // 四角黑鐵細框
      for (const cxSign of [-1, 1]) {
        for (const czSign of [-1, 1]) {
          add(
            new THREE.BoxGeometry(0.04 * scale, bh, 0.04 * scale),
            steel,
            lx + cxSign * (bw / 2),
            (0.12 + bh / 2) * scale,
            lz + czSign * (bw / 2)
          );
        }
      }
      // 方形微翹頂蓋
      add(new THREE.BoxGeometry(bw * 1.24, 0.09 * scale, bw * 1.24), darkStone, lx, (0.12 + bh + 0.045) * scale, lz);
      add(new THREE.BoxGeometry(bw * 0.7, 0.06 * scale, bw * 0.7), darkStone, lx, (0.12 + bh + 0.11) * scale, lz);
    };

    // 階梯兩側、松樹花台前與水池步道旁石燈籠
    addSquareLantern(-2.95, fz + 3.45, 0.95);
    addSquareLantern(2.95, fz + 3.45, 0.95);
    addSquareLantern(-4.85, fz + 2.45, 0.78);
    addSquareLantern(4.85, fz + 2.45, 0.78);
    addSquareLantern(-5.8, fz + 4.85, 1.08);
    addSquareLantern(8.6, fz + 4.85, 1.08);
  }

  mergeByMaterial(stat);
  root.updateMatrixWorld(true);
  return { group: root, colliders };
}


/* ---------------- 徵才島（照設計圖）：人才獵頭的白色石材方盒、翰林院的木格柵玻璃書院 ---------------- */

function careerSignTex(lines: string[], sub: string, dark: boolean, vertical = false) {
  const W = vertical ? 320 : 1024;
  const H = vertical ? 1024 : 300;
  return canvasTex(W, H, (g) => {
    g.fillStyle = dark ? '#1d1a17' : 'rgba(0,0,0,0)';
    g.fillRect(0, 0, W, H);
    if (dark) {
      g.strokeStyle = '#8a7a62';
      g.lineWidth = 4;
      g.strokeRect(12, 12, W - 24, H - 24);
    }
    g.fillStyle = dark ? '#fff4dc' : '#5a564e';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    if (dark) {
      g.shadowColor = '#ffd9a0';
      g.shadowBlur = 16;
    }
    if (vertical) {
      const cols = lines.length;
      lines.forEach((ln, ci) => {
        const chars = Array.from(ln);
        const x = W / 2 + (cols === 1 ? 0 : (cols / 2 - ci - 0.5) * 130);
        g.font = `900 120px ${KAI}`;
        chars.forEach((ch, i) => g.fillText(ch, x, 120 + i * 150));
      });
      g.font = '600 44px Georgia, serif';
      g.fillText(sub, W / 2, H - 110);
      g.fillRect(W / 2 - 80, H - 76, 160, 3);
    } else {
      g.font = `900 ${lines.length > 1 ? 92 : 130}px ${KAI}`;
      lines.forEach((ln, i) => g.fillText(ln, W / 2, lines.length > 1 ? 80 + i * 105 : 120));
      g.font = '600 40px Georgia, serif';
      g.fillText(sub, W / 2, H - 40);
    }
  });
}

function inkScrollTex(text: string) {
  return canvasTex(256, 768, (g) => {
    g.fillStyle = '#f4ecdb';
    g.fillRect(0, 0, 256, 768);
    g.fillStyle = '#2a2622';
    g.textAlign = 'center';
    g.font = `900 64px ${KAI}`;
    const chars = Array.from(text);
    const half = Math.ceil(chars.length / 2);
    chars.forEach((ch, i) => g.fillText(ch, i < half ? 160 : 96, 110 + (i % half) * 78));
    // 水墨山
    g.fillStyle = 'rgba(40,40,40,0.55)';
    g.beginPath();
    g.moveTo(10, 690);
    g.lineTo(70, 560);
    g.lineTo(120, 640);
    g.lineTo(170, 520);
    g.lineTo(246, 690);
    g.fill();
    g.fillStyle = 'rgba(40,40,40,0.25)';
    g.beginPath();
    g.moveTo(10, 700);
    g.lineTo(100, 610);
    g.lineTo(200, 700);
    g.fill();
    g.fillStyle = '#7a5a36';
    g.fillRect(0, 0, 256, 16);
    g.fillRect(0, 752, 256, 16);
  });
}

export function createCareerFacade(b: BuildingInteractable): { group: THREE.Group; colliders: Collider[] } {
  const root = new THREE.Group();
  root.name = `facade_${b.id}`;
  root.position.copy(b.position);
  root.rotation.y = b.facingYaw;
  const stat = new THREE.Group();
  root.add(stat);
  const colliders: Collider[] = [];
  const cy = Math.cos(b.facingYaw);
  const sy = Math.sin(b.facingYaw);
  const toWorld = (lx: number, lz: number): [number, number] => [b.position.x + lx * cy + lz * sy, b.position.z - lx * sy + lz * cy];
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, parent: THREE.Object3D = stat) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const plane = (tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0, emissive = 0.5, transparent = false) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: emissive, roughness: 0.6, transparent })
    );
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.userData.noMerge = true;
    root.add(m);
    return m;
  };
  let cid = 0;
  const cyl = (x: number, z: number, r: number) => {
    const [wx, wz] = toWorld(x, z);
    colliders.push({ id: `${b.id}-cf-${cid++}`, type: 'cylinder', x: wx, z: wz, radius: r });
  };
  const w = b.width;
  const d = b.depth;
  const h = b.height;
  const fz = d / 2 + 0.25;
  const doorW = b.doorWidth || 3.6;
  const doorH = Math.min(3.6, h - 0.8);
  const warm = new THREE.MeshBasicMaterial({ color: 0xffdfae });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff4dc, emissive: 0xffd9a0, emissiveIntensity: 1.3, roughness: 0.5 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 0.5, metalness: 0.4 });
  const cubeLamp = (x: number, z: number) => {
    add(new THREE.BoxGeometry(0.5, 0.1, 0.5), frameMat, x, 0.05, z);
    add(new THREE.BoxGeometry(0.4, 0.62, 0.4), lampMat, x, 0.41, z);
    add(new THREE.BoxGeometry(0.54, 0.08, 0.54), frameMat, x, 0.76, z);
    cyl(x, z, 0.32);
  };
  const pine = (x: number, z: number, s: number, seed: number) => {
    const bark = new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 1 });
    const leaf = new THREE.MeshStandardMaterial({ color: 0x2f5530, roughness: 0.85 });
    let q = seed;
    const r = () => ((q = (q * 9301 + 49297) % 233280) / 233280);
    const pts = [v3(x, 0.3, z), v3(x + 0.3 * s, 1.0 * s, z), v3(x - 0.25 * s, 1.8 * s, z + 0.1), v3(x + 0.15 * s, 2.5 * s, z)];
    stat.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.12 * s, 6, false), bark));
    for (const [dx, y, rr] of [
      [0.8, 1.3, 0.85],
      [-0.8, 1.8, 0.8],
      [0.4, 2.3, 0.7],
      [-0.1, 2.8, 0.5],
    ] as [number, number, number][]) {
      const m = add(new THREE.SphereGeometry(rr * s, 9, 6), leaf, x + (dx + (r() - 0.5) * 0.2) * s, y * s, z);
      m.scale.set(1.45, 0.4, 1.1);
    }
  };

  if (b.exterior === 'stoneBox') {
    const stone = new THREE.MeshStandardMaterial({ color: 0xf1eee8, roughness: 0.6, emissive: 0x2c2a26, emissiveIntensity: 0.35 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xdfeaf2, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
    const steel = new THREE.MeshStandardMaterial({ color: 0x3a3a3c, roughness: 0.4, metalness: 0.6 });
    // 正面整片玻璃（門洞留空）：透出暖光大廳與樓梯
    const gx0 = -w / 2 + 1.5;
    const gx1 = w / 2 - 0.2;
    const atr = galleryWindowTex();
    const pane = (x0: number, x1: number, y0: number, y1: number) => {
      if (x1 - x0 < 0.05 || y1 - y0 < 0.05) return;
      const t = atr.clone();
      t.needsUpdate = true;
      t.repeat.set((x1 - x0) / (gx1 - gx0), (y1 - y0) / (h - 0.4));
      t.offset.set((x0 - gx0) / (gx1 - gx0), y0 / (h - 0.4));
      plane(t, x1 - x0, y1 - y0, (x0 + x1) / 2, (y0 + y1) / 2, fz + 0.02, 0, 0.8);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), glass);
      gl.position.set((x0 + x1) / 2, (y0 + y1) / 2, fz + 0.12);
      gl.userData.noMerge = true;
      gl.renderOrder = 3;
      root.add(gl);
    };
    pane(gx0, -doorW / 2, 0.05, h - 0.4);
    pane(doorW / 2, gx1, 0.05, h - 0.4);
    pane(-doorW / 2, doorW / 2, doorH, h - 0.4);
    for (let k = 0; k <= 6; k++) add(new THREE.BoxGeometry(0.06, h - 0.4, 0.08), steel, gx0 + ((gx1 - gx0) * k) / 6, (h - 0.4) / 2, fz + 0.14);
    add(new THREE.BoxGeometry(gx1 - gx0, 0.08, 0.1), steel, (gx0 + gx1) / 2, doorH, fz + 0.14);
    // 左側高起的石鰭（一道暖光細縫＋直書招牌）
    add(new THREE.BoxGeometry(1.3, h + 1.6, 1.8), stone, -w / 2 + 0.55, (h + 1.6) / 2, fz + 0.3);
    add(new THREE.BoxGeometry(0.1, h + 0.6, 0.04), warm, -w / 2 + 1.0, (h + 0.6) / 2 + 0.3, fz + 1.22);
    plane(careerSignTex(['人才獵頭', '專家媒合中心'], 'IdeaX', false, true), 0.95, 3.0, -w / 2 + 0.4, 3.0, fz + 1.21, 0, 0.15, true);
    cyl(-w / 2 + 0.55, fz + 0.3, 0.95);
    // 懸挑的白石簷板
    add(new THREE.BoxGeometry(w + 0.4, 0.4, 2.4), stone, 0.2, h + 0.3, fz + 0.9);
    add(new THREE.BoxGeometry(w - 0.4, 0.03, 2.0), warm, 0.2, h + 0.09, fz + 0.9);
    // 玻璃上緣的招牌
    plane(careerSignTex(['人才獵頭・專家媒合中心'], 'IdeaX', false), 4.6, 1.35, 1.0, h - 0.95, fz + 0.15, 0, 0.1, true);
    // 門前石台、松樹、方燈
    add(new THREE.BoxGeometry(w + 1.0, 0.12, 2.2), stone, 0, 0.06, fz + 1.4);
    add(new THREE.BoxGeometry(w + 1.0, 0.02, 0.05), warm, 0, 0.13, fz + 2.48);
    pine(w / 2 + 0.6, fz + 1.4, 1.0, 11);
    cyl(w / 2 + 0.6, fz + 1.4, 0.6);
    cubeLamp(doorW / 2 + 0.6, fz + 2.2);
    cubeLamp(-doorW / 2 - 0.6, fz + 2.2);
  } else {
    // ── 翰林院：木格柵玻璃書院 ──
    const wood = new THREE.MeshStandardMaterial({ color: 0xc9925a, roughness: 0.7 });
    const woodDark = new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: 0.8 });
    const stone = new THREE.MeshStandardMaterial({ color: 0xd8d2c6, roughness: 0.85 });
    // 石砌台基＋前方臨水平台與台階
    add(new THREE.BoxGeometry(w + 1.4, 0.3, d + 1.4), stone, 0, 0.15, 0);
    add(new THREE.BoxGeometry(w + 1.4, 0.3, 2.6), stone, 0, 0.15, fz + 1.3);
    add(new THREE.BoxGeometry(doorW + 1.6, 0.15, 0.7), stone, 0, 0.075, fz + 2.95);
    // 四周的直木格柵（離牆 0.35 公尺；正面門口、兩側各留一段空）
    const slat = new THREE.BoxGeometry(0.07, h - 0.3, 0.14);
    const mats: THREE.Matrix4[] = [];
    const m4 = (x: number, z: number, ry = 0) => new THREE.Matrix4().compose(v3(x, 0.3 + (h - 0.3) / 2, z), new THREE.Quaternion().setFromAxisAngle(UP, ry), v3(1, 1, 1));
    const step = 0.34;
    for (let x = -w / 2 - 0.3; x <= w / 2 + 0.3; x += step) {
      if (Math.abs(x) > doorW / 2 + 0.3 && !(Math.abs(x) > 2.6 && Math.abs(x) < 3.9)) mats.push(m4(x, fz + 0.35));
      mats.push(m4(x, -d / 2 - 0.6));
    }
    for (let z = -d / 2 - 0.3; z <= d / 2 + 0.3; z += step) {
      for (const s of [-1, 1]) if (!(z > -1.2 && z < 1.2)) mats.push(m4(s * (w / 2 + 0.6), z, Math.PI / 2));
    }
    // 格柵碰撞（正面門口留空）
    const segc = (x1: number, z1: number, x2: number, z2: number) => {
      const [a1, b1] = toWorld(x1, z1);
      const [a2, b2] = toWorld(x2, z2);
      colliders.push({ id: `${b.id}-slat-${cid++}`, type: 'segment', x1: a1, z1: b1, x2: a2, z2: b2, halfThickness: 0.12 });
    };
    segc(-w / 2 - 0.6, fz + 0.35, -doorW / 2 - 0.3, fz + 0.35);
    segc(doorW / 2 + 0.3, fz + 0.35, w / 2 + 0.6, fz + 0.35);
    segc(-w / 2 - 0.6, -d / 2 - 0.6, w / 2 + 0.6, -d / 2 - 0.6);
    for (const sx of [-1, 1]) segc(sx * (w / 2 + 0.6), -d / 2 - 0.6, sx * (w / 2 + 0.6), fz + 0.35);
    const im = new THREE.InstancedMesh(slat, wood, mats.length);
    mats.forEach((m, i) => im.setMatrixAt(i, m));
    im.castShadow = true;
    root.add(im);
    // 格柵上下的橫木
    for (const y of [0.32, h - 0.05]) {
      add(new THREE.BoxGeometry(w + 1.3, 0.12, 0.16), wood, 0, y, fz + 0.35);
      add(new THREE.BoxGeometry(w + 1.3, 0.12, 0.16), wood, 0, y, -d / 2 - 0.6);
      for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.16, 0.12, d + 1.0), wood, s * (w / 2 + 0.6), y, 0);
    }
    // 屋簷下一整片細木條天花（深出簷底下）
    {
      const n = Math.round((w + 4) / 0.22);
      const geo = new THREE.BoxGeometry(0.06, 0.05, d + 4.2);
      const ims = new THREE.InstancedMesh(geo, wood, n);
      for (let i = 0; i < n; i++) ims.setMatrixAt(i, new THREE.Matrix4().makeTranslation(-w / 2 - 2 + i * 0.22, h + 0.05, 0));
      root.add(ims);
      add(new THREE.BoxGeometry(w + 4.2, 0.04, d + 4.2), new THREE.MeshStandardMaterial({ color: 0x3a2818, roughness: 1 }), 0, h + 0.12, 0);
    }
    // 粗木柱（正面）
    for (const x of [-w / 2 - 0.6, -doorW / 2 - 0.5, doorW / 2 + 0.5, w / 2 + 0.6]) {
      add(new THREE.BoxGeometry(0.32, h, 0.32), woodDark, x, h / 2 + 0.15, fz + 0.5);
      cyl(x, fz + 0.5, 0.3);
    }
    // 招牌：門右側黑底發光直匾「翰林院 IdeaX」；門左側水墨掛軸
    plane(careerSignTex(['翰林院'], 'IdeaX', true, true), 1.5, 4.0, doorW / 2 + 1.5, 2.55, fz + 0.48, 0, 0.6);
    plane(inkScrollTex('江南創新・藏賢納士'), 1.2, 3.4, -doorW / 2 - 1.5, 2.6, fz + 0.48, 0, 0.25);
    // 臨水平台上的方燈、兩側松樹
    cubeLamp(doorW / 2 + 0.9, fz + 2.4);
    cubeLamp(-doorW / 2 - 0.9, fz + 2.4);
    pine(-w / 2 - 1.6, fz + 1.2, 1.15, 5);
    pine(w / 2 + 1.6, fz + 1.0, 1.0, 19);
    cyl(-w / 2 - 1.6, fz + 1.2, 0.6);
    cyl(w / 2 + 1.6, fz + 1.0, 0.6);
  }

  mergeByMaterial(stat);
  root.updateMatrixWorld(true);
  return { group: root, colliders };
}
