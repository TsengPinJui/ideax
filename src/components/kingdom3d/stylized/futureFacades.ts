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
    const curve = new THREE.CatmullRomCurve3([brim(t0), p1, p2, p3]);
    const N = 44;
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
      ws.push(w0 + (w1 - w0) * (i / (N - 1)));
    });
    sweep(pts, sides, ws, 0.28);
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
    col(px - 1.4, pz, 1.0, `pl${s}a`);
    col(px + 1.4, pz, 1.0, `pl${s}b`);
    col(px, pz, 1.0, `pl${s}c`);
  }
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff4dc, emissive: 0xffd9a0, emissiveIntensity: 1.3, roughness: 0.5 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.5, metalness: 0.4 });
  for (const [x, z] of [
    [-4.3, d / 2 + 5.2],
    [4.3, d / 2 + 5.2],
    [-10.6, d / 2 + 5.6],
    [10.6, d / 2 + 5.6],
    [-10.6, d / 2 + 1.2],
    [10.6, d / 2 + 1.2],
  ] as [number, number][]) {
    add(new THREE.BoxGeometry(0.62, 0.12, 0.62), frameMat, x, 0.06, z);
    add(new THREE.BoxGeometry(0.5, 0.9, 0.5), lampMat, x, 0.57, z);
    add(new THREE.BoxGeometry(0.66, 0.1, 0.66), frameMat, x, 1.07, z);
    col(x, z, 0.4, `lamp${x}_${z}`);
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

function drawMountains(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string, lw: number) {
  g.strokeStyle = color;
  g.lineWidth = lw;
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(cx - s, cy + s * 0.5);
  g.lineTo(cx - s * 0.3, cy - s * 0.55);
  g.lineTo(cx + s * 0.05, cy - s * 0.05);
  g.lineTo(cx + s * 0.35, cy - s * 0.4);
  g.lineTo(cx + s, cy + s * 0.5);
  g.closePath();
  g.stroke();
  g.beginPath();
  g.moveTo(cx - s * 0.55, cy + s * 0.5);
  g.lineTo(cx - s * 0.3, cy + s * 0.1);
  g.lineTo(cx - s * 0.05, cy + s * 0.5);
  g.stroke();
}

function portalSignTex() {
  return canvasTex(1024, 512, (g) => {
    g.clearRect(0, 0, 1024, 512);
    g.shadowColor = '#ffcf8a';
    g.shadowBlur = 20;
    drawMountains(g, 512, 120, 80, '#ffe3b0', 9);
    g.fillStyle = '#ffe6bd';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `900 150px ${KAI}`;
    g.fillText('展覽館', 512, 300);
    g.shadowBlur = 10;
    g.font = '600 52px Georgia, serif';
    g.fillText('IdeaX', 512, 420);
    g.fillRect(250, 420, 130, 3);
    g.fillRect(644, 420, 130, 3);
  });
}

function exhibitBannerTex(text: string) {
  return canvasTex(256, 1024, (g) => {
    g.fillStyle = '#1c1b1d';
    g.fillRect(0, 0, 256, 1024);
    g.strokeStyle = '#8a8378';
    g.lineWidth = 3;
    g.strokeRect(16, 16, 224, 992);
    g.fillStyle = '#f4efe6';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `900 150px ${KAI}`;
    Array.from(text).forEach((ch, i) => g.fillText(ch, 128, 170 + i * 190));
    drawMountains(g, 128, 920, 46, '#cfc6b8', 4);
  });
}


/** 金字塔後面透出來的中庭：暖光、手扶梯、環形燈 */
function atriumTex() {
  return canvasTex(512, 512, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, '#f7e2bf');
    gr.addColorStop(1, '#c99a62');
    g.fillStyle = gr;
    g.fillRect(0, 0, 512, 512);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 5;
    for (const [y, rx] of [
      [90, 150],
      [200, 110],
      [300, 80],
    ] as [number, number][]) {
      g.beginPath();
      g.ellipse(256, y, rx, rx * 0.16, 0, 0, Math.PI * 2);
      g.stroke();
    }
    g.strokeStyle = '#e9e2d6';
    g.lineWidth = 14;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(256 + s * 40, 500);
      g.lineTo(256 + s * 200, 330);
      g.stroke();
    }
    g.fillStyle = 'rgba(80,60,40,0.55)';
    for (let i = 0; i < 9; i++) g.fillRect(40 + i * 50, 420 + (i % 3) * 8, 26, 60);
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
  const plane = (tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0, emissive = 0.4, transparent = false) => {
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
  const cylCol = (x: number, z: number, r: number) => {
    const [wx, wz] = toWorld(x, z);
    colliders.push({ id: `${b.id}-ex-${cid++}`, type: 'cylinder', x: wx, z: wz, radius: r });
  };

  const w = b.width;
  const d = b.depth;
  const h = b.height;
  const fz = d / 2 + 0.25;
  const doorW = b.doorWidth || 6.4;
  const concreteTex = graniteWallTexture().clone();
  concreteTex.needsUpdate = true;
  const concrete = (rx: number, ry: number) => {
    const t = concreteTex.clone();
    t.needsUpdate = true;
    t.repeat.set(rx / 3.2, ry / 12);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.75, emissive: 0x2a2826, emissiveIntensity: 0.3 });
  };
  const concretePlain = new THREE.MeshStandardMaterial({ color: 0xd2cfc9, roughness: 0.75, emissive: 0x2a2826, emissiveIntensity: 0.3 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x3a3a3c, roughness: 0.4, metalness: 0.6 });
  const warm = new THREE.MeshBasicMaterial({ color: 0xffdfae });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xd6e8f5, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });

  // ── 正中：玻璃入口（後面透出暖光大廳）＋上方懸挑的清水模招牌量體 ──
  const EX = 5.6;
  {
    plane(atriumTex(), EX * 2, 5.6, 0, 2.8, fz + 0.02, 0, 0.85);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(EX * 2, 5.6), glass);
    gl.position.set(0, 2.8, fz + 0.3);
    gl.userData.noMerge = true;
    gl.renderOrder = 3;
    root.add(gl);
    for (let k = 0; k <= 6; k++) add(new THREE.BoxGeometry(0.08, 5.6, 0.1), steel, -EX + (EX * 2 * k) / 6, 2.8, fz + 0.32);
    // 入口天花暖光
    add(new THREE.BoxGeometry(EX * 2 + 0.4, 0.3, 3.0), concretePlain, 0, 5.75, fz + 1.4);
    add(new THREE.BoxGeometry(EX * 2 - 0.4, 0.04, 2.6), warm, 0, 5.58, fz + 1.4);
    // 懸挑招牌量體
    add(new THREE.BoxGeometry(EX * 2 + 1.2, 4.6, 3.2), concrete(EX * 2 + 1.2, 4.6), 0, 8.2, fz + 1.4);
    plane(portalSignTex(), 6.2, 3.1, 0, 8.25, fz + 3.02, 0, 0.9, true);
    // 招牌量體上方退縮的玻璃樓層
    add(new THREE.BoxGeometry(EX * 2 + 1.2, 0.25, 3.4), concretePlain, 0, 10.6, fz + 1.2);
    plane(atriumTex(), EX * 2, 1.8, 0, 11.6, fz + 0.05, 0, 0.6);
  }

  // ── 左側：斜頂的清水模高牆（「親子同樂」直幡） ──
  {
    const x0 = -12.6;
    const x1 = -EX - 0.4;
    const shape = new THREE.Shape();
    shape.moveTo(x0, 0);
    shape.lineTo(x1, 0);
    shape.lineTo(x1, h + 1.2);
    shape.lineTo(x0 + 1.2, h + 4.8);
    shape.lineTo(x0, h + 4.2);
    shape.closePath();
    const ex = new THREE.ExtrudeGeometry(shape, { depth: 2.4, bevelEnabled: false });
    const m = add(ex, concrete(x1 - x0, h + 4), 0, 0, fz - 0.1);
    void m;
    plane(exhibitBannerTex('親子同樂'), 1.7, 6.2, (x0 + x1) / 2 + 0.6, 7.4, fz + 2.33, 0, 0.35);
    rect(x0, fz - 0.1, x1, fz + 2.3);
  }

  // ── 右側：大圓洞清水模牆（從圓洞看見後面的玻璃展廊） ──
  {
    const x0 = EX + 0.4;
    const x1 = 13.6;
    const H = h + 2.8;
    const R = 4.6;
    const cxh = (x0 + x1) / 2 + 0.6;
    const cyh = 6.4;
    const shape = new THREE.Shape();
    shape.moveTo(x0, 0);
    shape.lineTo(x1, 0);
    shape.lineTo(x1, H);
    shape.lineTo(x0, H - 1.6);
    shape.closePath();
    const hole = new THREE.Path();
    hole.absarc(cxh, cyh, R, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const ex = new THREE.ExtrudeGeometry(shape, { depth: 1.2, bevelEnabled: false, curveSegments: 48 });
    add(ex, concrete(x1 - x0, H), 0, 0, fz + 1.6);
    // 圓洞內緣一圈光
    const ring = add(new THREE.TorusGeometry(R - 0.04, 0.05, 6, 80), warm, cxh, cyh, fz + 2.82);
    void ring;
    // 圓洞後面的玻璃展廊
    plane(atriumTex(), 7.2, 5.0, cxh, 4.0, fz + 0.04, 0, 0.7);
    for (let k = 0; k <= 4; k++) add(new THREE.BoxGeometry(0.07, 5.0, 0.08), steel, cxh - 3.6 + k * 1.8, 4.0, fz + 0.12);
    add(new THREE.BoxGeometry(7.6, 0.2, 1.4), concretePlain, cxh, 6.6, fz + 0.75);
    // 「雅俗共賞」直幡掛在圓洞牆左段
    plane(exhibitBannerTex('雅俗共賞'), 1.5, 5.6, x0 + 1.0, 6.6, fz + 2.83, 0, 0.35);
    // 圓洞牆碰撞（下緣到地，圓洞底在 1.8 公尺：整面擋住）
    rect(x0, fz + 1.6, x1, fz + 2.8);
    // 牆後與立面之間的縫也擋住
    seg(x1, fz, x1, fz + 1.6);
  }

  // ── 屋頂邊的玻璃帶與懸挑板 ──
  add(new THREE.BoxGeometry(w + 1.6, 0.35, d + 1.6), concretePlain, 0, h + 1.8, 0);
  for (const s of [-1, 1]) plane(atriumTex(), d - 1, 1.3, s * (w / 2 + 0.05), h + 1.0, 0, (s * Math.PI) / 2, 0.55);
  plane(atriumTex(), w - 1, 1.3, 0, h + 1.0, -d / 2 - 0.05, Math.PI, 0.55);

  // ── 門前：整片倒影水池、中間一條發光步道、步道兩旁方形石燈 ──
  {
    const water = new THREE.MeshStandardMaterial({ color: 0x1a2630, roughness: 0.04, metalness: 0.7 });
    const WALK = 2.3;
    const za = fz + 3.0;
    const zb = fz + 6.9;
    for (const s of [-1, 1]) {
      const xa = s * WALK;
      const xb = s * 13.6;
      const xc = (xa + xb) / 2;
      const zc = (za + zb) / 2;
      const ww = Math.abs(xb - xa);
      add(new THREE.BoxGeometry(ww, 0.22, zb - za), concretePlain, xc, 0.11, zc);
      add(new THREE.BoxGeometry(ww - 0.4, 0.05, zb - za - 0.4), water, xc, 0.23, zc);
      add(new THREE.BoxGeometry(0.05, 0.03, zb - za), warm, xa + s * 0.02, 0.25, zc);
      rect(Math.min(xa, xb), za, Math.max(xa, xb), zb);
    }
    // 牆腳與水池之間的水道（左、右各一條，貼著立面）
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff4dc, emissive: 0xffd9a0, emissiveIntensity: 1.3, roughness: 0.5 });
    for (const s of [-1, 1]) {
      for (const z of [za + 0.6, zb - 0.6]) {
        const x = s * (WALK + 0.55);
        add(new THREE.BoxGeometry(0.5, 0.1, 0.5), steel, x, 0.28, z);
        add(new THREE.BoxGeometry(0.4, 0.7, 0.4), lampMat, x, 0.68, z);
        add(new THREE.BoxGeometry(0.55, 0.08, 0.55), steel, x, 1.07, z);
      }
    }
    for (const [x, z] of [
      [-8.4, zb + 1.6],
      [8.4, zb + 1.6],
    ] as [number, number][]) {
      add(new THREE.BoxGeometry(0.75, 0.12, 0.75), steel, x, 0.06, z);
      add(new THREE.BoxGeometry(0.6, 0.9, 0.6), lampMat, x, 0.57, z);
      add(new THREE.BoxGeometry(0.8, 0.1, 0.8), steel, x, 1.07, z);
      cylCol(x, z, 0.45);
    }
    // 右前方石台上的松樹盆景
    const bark = new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 1 });
    const pine = new THREE.MeshStandardMaterial({ color: 0x2f5530, roughness: 0.85 });
    for (const [px, pz, s] of [
      [11.2, fz + 4.9, 1],
      [-11.2, fz + 4.9, -1],
    ] as [number, number, number][]) {
      add(new THREE.BoxGeometry(3.2, 0.6, 1.8), concretePlain, px, 0.3, pz);
      const pts = [v3(px, 0.6, pz), v3(px + s * 0.4, 1.6, pz + 0.1), v3(px - s * 0.3, 2.6, pz), v3(px + s * 0.2, 3.4, pz)];
      stat.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.17, 7, false), bark));
      for (const [dx, y, rr] of [
        [s * 1.0, 1.7, 1.0],
        [-s * 0.9, 2.3, 0.95],
        [s * 0.5, 2.9, 0.85],
        [-s * 0.2, 3.5, 0.65],
      ] as [number, number, number][]) {
        const m = add(new THREE.SphereGeometry(rr, 10, 7), pine, px + dx, y, pz);
        m.scale.set(1.5, 0.38, 1.1);
      }
    }
    void doorW;
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
    const atr = atriumTex();
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
