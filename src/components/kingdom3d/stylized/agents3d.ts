import * as THREE from 'three';

/**
 * 創點源六位 Agent 的 3D 造型（照角色設定圖重做）：白喵、頂多慧、007、大熊、搜搜、小燈泡
 * - 臉（眼睛、眉毛、嘴、腮紅）畫在貼圖上，貼在頭前面一片「臉皮」（略大一點的半球殼）
 * - 各角色保留原本動畫用的部件（userData）：
 *   白喵 body/tail、多慧 wingL/wingR、007 dish/legs、大熊 arm/gear、搜搜 trail、小燈泡 setPose
 * - 朝向：白喵、多慧、007、大熊、小燈泡臉朝 -Z；搜搜臉朝 +Z（和原本一樣）
 */

type Mat = THREE.MeshStandardMaterial;
const mat = (color: number, rough = 0.6, extra: Partial<THREE.MeshStandardMaterialParameters> = {}): Mat =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });

function put(parent: THREE.Object3D, geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
const grp = (parent: THREE.Object3D, x = 0, y = 0, z = 0) => {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
};
const sph = (r: number, sx = 1, sy = 1, sz = 1, ws = 20, hs = 16) => new THREE.SphereGeometry(r, ws, hs).scale(sx, sy, sz);
const cap = (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 6, 12);
/** 沿著幾個點彎的管子（尾巴、麥克風桿、彈簧手臂） */
function tube(points: [number, number, number][], r: number, seg = 24, rEnd = r) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const geo = new THREE.TubeGeometry(curve, seg, r, 10, false);
  if (rEnd !== r) {
    // 由粗到細
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const n = 11;
    for (let i = 0; i <= seg; i++) {
      const t = i / seg;
      const c = curve.getPointAt(t);
      const k = (r + (rEnd - r) * t) / r;
      for (let j = 0; j < n; j++) {
        const idx = i * n + j;
        const v = new THREE.Vector3().fromBufferAttribute(pos, idx).sub(c).multiplyScalar(k).add(c);
        pos.setXYZ(idx, v.x, v.y, v.z);
      }
    }
    geo.computeVertexNormals();
  }
  return geo;
}

/* ---------------- 臉貼圖 ---------------- */

function canvas(w = 512, h = 512) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}
function tex(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
/** 大眼睛：眼白（可省略）＋虹膜漸層＋瞳孔＋兩點高光 */
function eye(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, iris: string, opts: { white?: boolean; ring?: string; pupil?: number } = {}) {
  if (opts.white) {
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(x, y, rx * 1.18, ry * 1.12, 0, 0, Math.PI * 2);
    g.fill();
  }
  const gr = g.createRadialGradient(x, y + ry * 0.35, rx * 0.1, x, y, rx);
  gr.addColorStop(0, iris);
  gr.addColorStop(1, opts.ring || '#0b0b0b');
  g.fillStyle = gr;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#0a0a0a';
  g.beginPath();
  g.ellipse(x, y + ry * 0.08, rx * (opts.pupil ?? 0.5), ry * (opts.pupil ?? 0.5), 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.ellipse(x - rx * 0.32, y - ry * 0.38, rx * 0.3, ry * 0.26, -0.4, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(x + rx * 0.35, y + ry * 0.32, rx * 0.13, 0, Math.PI * 2);
  g.fill();
}
function blush(g: CanvasRenderingContext2D, x: number, y: number, r: number, color = 'rgba(255,120,140,0.55)') {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, color);
  gr.addColorStop(1, 'rgba(255,120,140,0)');
  g.fillStyle = gr;
  g.beginPath();
  g.ellipse(x, y, r * 1.3, r, 0, 0, Math.PI * 2);
  g.fill();
}
function brow(g: CanvasRenderingContext2D, x: number, y: number, w: number, tilt: number, color = '#2b1a10', lw = 12) {
  g.strokeStyle = color;
  g.lineWidth = lw;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x - w / 2, y + tilt);
  g.quadraticCurveTo(x, y - Math.abs(w) * 0.18, x + w / 2, y - tilt);
  g.stroke();
}

/** 臉皮：以 front（+1 朝 +Z、-1 朝 -Z）為中心的一片球殼；貼圖左→右＝看著臉時的左→右 */
function faceShell(r: number, t: THREE.Texture, front: 1 | -1, hSpan = 1.9, vTop = 0.55, vSpan = 1.35, emissive = 0) {
  const phiC = front > 0 ? Math.PI / 2 : (Math.PI * 3) / 2;
  const geo = new THREE.SphereGeometry(r, 40, 28, phiC - hSpan / 2, hSpan, vTop, vSpan);
  const m = new THREE.MeshStandardMaterial({
    map: t,
    transparent: true,
    alphaTest: 0.04,
    roughness: 0.45,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    ...(emissive ? { emissive: 0xffffff, emissiveMap: t, emissiveIntensity: emissive } : {}),
  });
  const mesh = new THREE.Mesh(geo, m);
  mesh.renderOrder = 2;
  mesh.userData.noMerge = true;
  return mesh;
}

/* ---------------- 白喵 ---------------- */

function catFaceTex() {
  const [c, g] = canvas(512, 512);
  // 眼睛（大、深棕、亮點）
  for (const s of [-1, 1]) eye(g, 256 + s * 92, 220, 46, 54, '#7a4a22', { ring: '#2a160a', pupil: 0.55 });
  for (const s of [-1, 1]) blush(g, 256 + s * 150, 300, 40);
  // 粉鼻子
  g.fillStyle = '#f48aa0';
  g.beginPath();
  g.moveTo(240, 274);
  g.lineTo(272, 274);
  g.lineTo(256, 294);
  g.closePath();
  g.fill();
  // 張嘴笑（ω 嘴＋粉舌頭）
  g.fillStyle = '#5a1f1f';
  g.beginPath();
  g.moveTo(214, 306);
  g.quadraticCurveTo(256, 300, 298, 306);
  g.quadraticCurveTo(290, 370, 256, 372);
  g.quadraticCurveTo(222, 370, 214, 306);
  g.fill();
  g.fillStyle = '#ff8fa3';
  g.beginPath();
  g.ellipse(256, 350, 26, 16, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#3b2314';
  g.lineWidth = 6;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(256, 294);
  g.lineTo(256, 306);
  g.stroke();
  // 鬍鬚
  g.strokeStyle = 'rgba(120,96,80,0.7)';
  g.lineWidth = 4;
  for (const s of [-1, 1])
    for (let k = 0; k < 3; k++) {
      g.beginPath();
      g.moveTo(256 + s * 120, 300 + k * 16);
      g.lineTo(256 + s * 220, 286 + k * 22);
      g.stroke();
    }
  return tex(c);
}

export function buildBaimiao() {
  const g = new THREE.Group();
  const white = mat(0xfbf8f1, 0.55);
  const shade = mat(0xefe7da, 0.6);
  const gold = mat(0xf5c542, 0.35, { metalness: 0.35, emissive: new THREE.Color(0xb7791f), emissiveIntensity: 0.12 });
  const yellow = mat(0xf7d36a, 0.5);
  const pink = mat(0xffa8b8, 0.5);
  const bulbGlow = mat(0xfff1a8, 0.25, { emissive: new THREE.Color(0xfacc15), emissiveIntensity: 0.9 });
  const body = new THREE.Group();
  g.add(body);
  // 身體（坐姿小胖身）＋肚子
  put(body, sph(0.27, 1, 1.05, 0.95), white, 0, 0.36, 0);
  put(body, sph(0.19, 1, 1.1, 0.6), shade, 0, 0.34, -0.15);
  // 頭（大頭）＋兩頰蓬毛
  const head = grp(body, 0, 0.84, -0.02);
  put(head, sph(0.34, 1.14, 0.96, 1), white);
  for (const s of [-1, 1]) put(head, sph(0.13, 1.2, 0.8, 0.9), white, s * 0.33, -0.12, -0.06, 0, 0, s * 0.3);
  head.add(faceShell(0.345, catFaceTex(), -1, 1.9, 0.75, 1.25)).scale.set(1.14, 0.96, 1);
  // 耳朵：白色外耳＋粉內耳＋黃耳尖
  for (const s of [-1, 1]) {
    const ear = grp(head, s * 0.2, 0.27, 0.02);
    ear.rotation.z = -s * 0.32;
    put(ear, new THREE.ConeGeometry(0.11, 0.2, 12), white, 0, 0.06, 0);
    put(ear, new THREE.ConeGeometry(0.065, 0.13, 10), pink, 0, 0.04, -0.045);
    put(ear, new THREE.ConeGeometry(0.05, 0.08, 10), yellow, 0, 0.14, 0);
  }
  // 金色圍巾＋垂下的兩條＋燈泡鈴鐺
  put(body, new THREE.TorusGeometry(0.2, 0.05, 10, 24), gold, 0, 0.6, -0.01, Math.PI / 2);
  put(body, new THREE.BoxGeometry(0.07, 0.17, 0.03), gold, 0.1, 0.5, -0.2, 0.2, 0, 0.25);
  put(body, new THREE.BoxGeometry(0.07, 0.14, 0.03), gold, 0.16, 0.52, -0.18, 0.2, 0, 0.55);
  put(body, sph(0.055, 1, 1.15, 1), bulbGlow, 0, 0.5, -0.22);
  put(body, new THREE.CylinderGeometry(0.03, 0.03, 0.04, 10), gold, 0, 0.56, -0.22);
  // 前腳（舉著小肉掌）、後腳（腳底粉色肉球）
  for (const s of [-1, 1]) {
    const arm = put(body, cap(0.06, 0.12), white, s * 0.2, 0.42, -0.14, -0.5, 0, s * 0.35);
    void arm;
    put(body, sph(0.068), white, s * 0.24, 0.33, -0.24);
    put(body, new THREE.CircleGeometry(0.03, 12), pink, s * 0.24, 0.33, -0.306, 0, Math.PI, 0);
    put(body, sph(0.1, 1, 0.7, 1.3), white, s * 0.13, 0.07, -0.12);
    put(body, sph(0.035, 1, 0.6, 1), pink, s * 0.13, 0.03, -0.24);
  }
  // 尾巴：白色長尾、黃色尾尖（tail 群組可左右甩）
  const tail = grp(body, 0, 0.2, 0.22);
  put(tail, tube([[0, 0, 0], [0, 0.12, 0.16], [0.04, 0.32, 0.22], [0.1, 0.46, 0.12]], 0.05, 24, 0.04), white);
  put(tail, sph(0.06, 1, 1.4, 1), yellow, 0.1, 0.5, 0.1);
  g.userData.body = body;
  g.userData.tail = tail;
  return g;
}

/* ---------------- 頂多慧（貓頭鷹客服） ---------------- */

function owlFaceTex() {
  const [c, g] = canvas(512, 512);
  // 白色心形臉盤
  g.fillStyle = '#fbfaf3';
  g.beginPath();
  g.moveTo(256, 120);
  g.bezierCurveTo(160, 40, 30, 110, 60, 250);
  g.bezierCurveTo(80, 360, 190, 420, 256, 440);
  g.bezierCurveTo(322, 420, 432, 360, 452, 250);
  g.bezierCurveTo(482, 110, 352, 40, 256, 120);
  g.fill();
  // 綠色大眼
  for (const s of [-1, 1]) eye(g, 256 + s * 98, 236, 62, 66, '#43b05c', { ring: '#0e3b1c', white: true, pupil: 0.5 });
  for (const s of [-1, 1]) brow(g, 256 + s * 98, 140, 86, -s * 6, '#2f5d34', 14);
  for (const s of [-1, 1]) blush(g, 256 + s * 150, 340, 34);
  // 微笑
  g.strokeStyle = '#7a4a22';
  g.lineWidth = 8;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(256, 356, 34, 0.25 * Math.PI, 0.75 * Math.PI);
  g.stroke();
  return tex(c);
}
function badgeTex() {
  const [c, g] = canvas(128, 160);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 128, 160);
  g.fillStyle = '#2f7d3a';
  g.fillRect(0, 0, 128, 36);
  g.fillStyle = '#fff';
  g.font = '900 22px sans-serif';
  g.textAlign = 'center';
  g.fillText('IdeaX', 64, 26);
  g.fillStyle = '#facc15';
  g.beginPath();
  g.arc(64, 88, 26, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#2f7d3a';
  g.font = '800 18px sans-serif';
  g.fillText('客服', 64, 146);
  return tex(c);
}

export function buildDuohui() {
  const g = new THREE.Group();
  const green = mat(0x5aa04a, 0.6);
  const greenDark = mat(0x2f6b33, 0.55);
  const greenTip = mat(0x8fcf6a, 0.6);
  const vest = mat(0x1f5a2c, 0.5);
  const shirt = mat(0xfafaf5, 0.5);
  const orange = mat(0xf59e0b, 0.45);
  const goldM = mat(0xd8a945, 0.3, { metalness: 0.75 });
  const black = mat(0x1b1b1f, 0.35, { metalness: 0.4 });
  const glow = mat(0xfff4b0, 0.25, { emissive: new THREE.Color(0xfacc15), emissiveIntensity: 1.1 });
  const cape = mat(0x2e7a3b, 0.6, { side: THREE.DoubleSide });
  // 身體
  put(g, sph(0.33, 1, 1.05, 0.92), green, 0, 0.5, 0);
  // 背上披風（半圓筒往下展開）
  put(g, new THREE.CylinderGeometry(0.3, 0.44, 0.62, 20, 1, true, -Math.PI * 0.55, Math.PI * 1.1), cape, 0, 0.5, 0.02, 0, 0, 0);
  // 西裝背心＋白襯衫＋領帶＋識別證
  put(g, sph(0.3, 1, 1.0, 0.55), vest, 0, 0.5, -0.15);
  put(g, new THREE.ConeGeometry(0.12, 0.3, 3), shirt, 0, 0.64, -0.29, Math.PI, 0, 0);
  put(g, new THREE.BoxGeometry(0.05, 0.18, 0.02), mat(0x14532d, 0.5), 0, 0.58, -0.32);
  put(g, new THREE.ConeGeometry(0.04, 0.06, 4), mat(0x14532d, 0.5), 0, 0.47, -0.32, Math.PI, Math.PI / 4, 0);
  for (const s of [-1, 1]) put(g, new THREE.CylinderGeometry(0.006, 0.006, 0.26, 4), black, s * 0.06, 0.6, -0.3, 0.1, 0, s * 0.35);
  put(g, new THREE.PlaneGeometry(0.1, 0.13), new THREE.MeshStandardMaterial({ map: badgeTex(), roughness: 0.5 }), 0.1, 0.43, -0.315, 0, Math.PI, 0).userData.noMerge = true;
  // 頭（大頭）＋耳羽
  const head = grp(g, 0, 1.0, 0);
  put(head, sph(0.38, 1.05, 0.95, 0.95), green);
  head.add(faceShell(0.385, owlFaceTex(), -1, 1.75, 0.55, 1.55));
  for (const s of [-1, 1]) {
    const tuft = grp(head, s * 0.24, 0.3, 0.02);
    tuft.rotation.z = -s * 0.4;
    put(tuft, new THREE.ConeGeometry(0.08, 0.22, 8), green, 0, 0.08, 0);
    put(tuft, new THREE.ConeGeometry(0.04, 0.1, 8), greenDark, 0, 0.17, 0);
  }
  // 鳥喙
  put(head, new THREE.ConeGeometry(0.05, 0.13, 8), orange, 0, -0.06, -0.39, -Math.PI / 2 - 0.35, 0, 0);
  // 金框圓眼鏡
  for (const s of [-1, 1]) put(head, new THREE.TorusGeometry(0.12, 0.014, 8, 28), goldM, s * 0.135, 0.02, -0.355, 0, s * 0.18, 0);
  put(head, new THREE.CylinderGeometry(0.008, 0.008, 0.06, 4), goldM, 0, 0.05, -0.38, 0, 0, Math.PI / 2);
  // 黑色耳機＋發光燈泡耳罩＋麥克風
  put(head, new THREE.TorusGeometry(0.4, 0.028, 8, 28, Math.PI), black, 0, 0.02, 0.02, 0, Math.PI / 2, 0);
  for (const s of [-1, 1]) {
    put(head, new THREE.CylinderGeometry(0.11, 0.11, 0.08, 20), black, s * 0.39, -0.02, 0.02, 0, 0, Math.PI / 2);
    put(head, new THREE.CylinderGeometry(0.075, 0.075, 0.02, 20), glow, s * 0.435, -0.02, 0.02, 0, 0, Math.PI / 2);
  }
  put(head, tube([[0.39, -0.08, -0.02], [0.34, -0.2, -0.22], [0.14, -0.22, -0.36]], 0.012), black);
  put(head, sph(0.03), black, 0.13, -0.22, -0.37);
  // 翅膀（以肩膀為軸拍動）：綠色、淺綠羽尖
  for (const s of [-1, 1]) {
    const w = grp(g, s * 0.3, 0.72, 0.02);
    put(w, sph(0.2, 0.35, 1, 0.75), green, s * 0.05, -0.18, 0);
    for (let k = 0; k < 3; k++) put(w, sph(0.07, 0.4, 1, 0.6), greenTip, s * 0.07, -0.36 + k * 0.02, -0.08 + k * 0.08);
    g.userData[s < 0 ? 'wingL' : 'wingR'] = w;
  }
  // 橘色小腳（三趾）
  for (const s of [-1, 1]) {
    put(g, new THREE.CylinderGeometry(0.04, 0.05, 0.12, 8), orange, s * 0.13, 0.08, -0.02);
    for (const a of [-0.4, 0, 0.4]) put(g, cap(0.025, 0.07), orange, s * 0.13 + Math.sin(a) * 0.05, 0.025, -0.08 - Math.cos(a) * 0.03, Math.PI / 2, a, 0);
  }
  g.scale.setScalar(1.15);
  return g;
}

/* ---------------- 007（白色機器人、紫色光） ---------------- */

function visorTex() {
  const [c, g] = canvas(512, 256);
  g.fillStyle = 'rgba(0,0,0,0)';
  g.fillRect(0, 0, 512, 256);
  // 紫色發光眼睛（帶光暈）
  for (const s of [-1, 1]) {
    const x = 256 + s * 92;
    const gr = g.createRadialGradient(x, 128, 6, x, 128, 70);
    gr.addColorStop(0, 'rgba(216,180,254,1)');
    gr.addColorStop(0.45, 'rgba(168,85,247,0.95)');
    gr.addColorStop(1, 'rgba(126,34,206,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(x, 128, 70, 70, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#f5e8ff';
    g.beginPath();
    g.ellipse(x, 128, 28, 36, 0, 0, Math.PI * 2);
    g.fill();
  }
  return tex(c);
}
function aiBuckleTex() {
  const [c, g] = canvas(128, 96);
  g.fillStyle = '#d8b4fe';
  g.fillRect(0, 0, 128, 96);
  g.fillStyle = '#4c1d95';
  g.font = '900 56px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('AI', 64, 52);
  return tex(c);
}
function tabletTex() {
  const [c, g] = canvas(256, 180);
  const gr = g.createLinearGradient(0, 0, 256, 180);
  gr.addColorStop(0, '#2e1065');
  gr.addColorStop(1, '#6d28d9');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 180);
  g.strokeStyle = '#c4b5fd';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(20, 140);
  g.lineTo(80, 100);
  g.lineTo(130, 118);
  g.lineTo(200, 50);
  g.lineTo(236, 64);
  g.stroke();
  g.fillStyle = 'rgba(196,181,253,0.7)';
  for (let i = 0; i < 5; i++) g.fillRect(24 + i * 44, 150 - i * 14, 26, 14 + i * 14);
  return tex(c);
}

export function buildAgent007() {
  const g = new THREE.Group();
  const white = mat(0xf4f3fa, 0.3, { metalness: 0.15 });
  const grey = mat(0xc9c6d8, 0.35, { metalness: 0.3 });
  const purple = mat(0x7c3aed, 0.4);
  const glowP = mat(0xc084fc, 0.25, { emissive: new THREE.Color(0xa855f7), emissiveIntensity: 1.2 });
  const visor = mat(0x0b0716, 0.15, { metalness: 0.5 });
  const capeM = mat(0x6d28d9, 0.55, { side: THREE.DoubleSide });
  // 半躺：往後靠在屋瓦上，腳掛在屋簷外
  const pivot = new THREE.Group();
  pivot.rotation.x = 0.28;
  g.add(pivot);
  // 軀幹：白色圓身＋紫色胸環
  put(pivot, cap(0.27, 0.32), white, 0, 0.62, 0);
  put(pivot, new THREE.TorusGeometry(0.26, 0.035, 8, 28), glowP, 0, 0.72, 0, Math.PI / 2);
  // 紫色圍巾＋短披風
  put(pivot, new THREE.TorusGeometry(0.2, 0.06, 10, 24), purple, 0, 0.95, 0, Math.PI / 2);
  put(pivot, new THREE.BoxGeometry(0.1, 0.22, 0.04), purple, 0.1, 0.84, -0.22, 0.25, 0, 0.2);
  put(pivot, new THREE.CylinderGeometry(0.24, 0.36, 0.62, 18, 1, true, -Math.PI * 0.6, Math.PI * 1.2), capeM, 0, 0.66, 0.03);
  // 皮帶＋AI 扣環
  put(pivot, new THREE.TorusGeometry(0.27, 0.03, 8, 28), mat(0x3b2a5a, 0.5), 0, 0.42, 0, Math.PI / 2);
  put(pivot, new THREE.PlaneGeometry(0.12, 0.09), new THREE.MeshStandardMaterial({ map: aiBuckleTex(), emissive: 0xffffff, emissiveMap: aiBuckleTex(), emissiveIntensity: 0.25 }), 0, 0.42, -0.3, 0, Math.PI, 0).userData.noMerge = true;
  // 頭：白色頭盔＋黑色面罩＋紫色發光眼＋紫色耳環＋額頭三角標誌
  const head = new THREE.Group();
  head.position.set(0, 1.27, 0);
  head.rotation.z = -0.38;
  pivot.add(head);
  put(head, sph(0.32, 1.12, 0.95, 1.0), white);
  put(head, sph(0.25, 1.22, 0.78, 0.6), visor, 0, -0.02, -0.17);
  const vs = faceShell(0.265, visorTex(), -1, 1.7, 1.2, 0.8, 1.4);
  vs.scale.set(1.22, 0.78, 0.6);
  vs.position.set(0, -0.02, -0.18);
  head.add(vs);
  for (const s of [-1, 1]) {
    put(head, new THREE.TorusGeometry(0.1, 0.03, 8, 20), glowP, s * 0.355, 0, 0, 0, Math.PI / 2, 0);
    put(head, new THREE.CylinderGeometry(0.075, 0.075, 0.06, 16), grey, s * 0.35, 0, 0, 0, 0, Math.PI / 2);
  }
  put(head, new THREE.ConeGeometry(0.05, 0.07, 3), glowP, 0, 0.2, -0.27, -Math.PI / 2 + 0.5, 0, 0);
  // 頭頂雷達天線（dish 會轉）
  put(head, new THREE.CylinderGeometry(0.018, 0.018, 0.18, 6), grey, 0, 0.36, 0);
  const dish = grp(head, 0, 0.44, 0);
  put(dish, new THREE.SphereGeometry(0.15, 16, 8, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), white, 0, 0.14, 0);
  put(dish, new THREE.CylinderGeometry(0.008, 0.008, 0.16, 4), grey, 0, 0.1, 0);
  put(dish, sph(0.025), glowP, 0, 0.19, 0);
  // 手臂（白色分段＋紫色關節）、手上拿平板
  for (const s of [-1, 1]) {
    const arm = grp(pivot, s * 0.3, 0.86, 0);
    put(arm, sph(0.07), purple);
    put(arm, cap(0.055, 0.16), white, s * 0.04, -0.14, -0.04, -0.4, 0, s * 0.2);
    put(arm, sph(0.05), purple, s * 0.07, -0.26, -0.1);
    put(arm, cap(0.05, 0.12), white, s * 0.08, -0.3, -0.22, -1.3, 0, 0);
    put(arm, sph(0.06), white, s * 0.08, -0.32, -0.32);
  }
  const tab = grp(pivot, 0.05, 0.6, -0.42);
  tab.rotation.x = -0.5;
  put(tab, new THREE.BoxGeometry(0.4, 0.28, 0.025), mat(0x2a2338, 0.3, { metalness: 0.4 }));
  put(tab, new THREE.PlaneGeometry(0.36, 0.24), new THREE.MeshStandardMaterial({ map: tabletTex(), emissive: 0xffffff, emissiveMap: tabletTex(), emissiveIntensity: 0.9 }), 0, 0, -0.014, 0, Math.PI, 0).userData.noMerge = true;
  // 腿：白色＋紫色膝蓋、圓腳
  for (const s of [-1, 1]) {
    put(pivot, cap(0.07, 0.22), white, s * 0.14, 0.16, -0.02);
    put(pivot, sph(0.06), purple, s * 0.14, 0.12, -0.08);
    put(pivot, sph(0.09, 1, 0.7, 1.4), grey, s * 0.14, -0.06, -0.06);
  }
  g.userData.dish = dish;
  g.userData.legs = pivot;
  return g;
}

/* ---------------- 大熊 ---------------- */

function bearFaceTex() {
  const [c, g] = canvas(512, 512);
  for (const s of [-1, 1]) eye(g, 256 + s * 84, 210, 30, 34, '#5a3418', { ring: '#1a0d05', pupil: 0.6 });
  for (const s of [-1, 1]) brow(g, 256 + s * 84, 150, 70, -s * 8, '#3d2210', 16);
  for (const s of [-1, 1]) blush(g, 256 + s * 140, 290, 36, 'rgba(240,110,90,0.45)');
  return tex(c);
}
function overallLogoTex() {
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#2f4f7a';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#f5c542';
  g.lineWidth = 8;
  g.beginPath();
  g.arc(64, 54, 26, Math.PI * 0.8, Math.PI * 2.2);
  g.lineTo(76, 92);
  g.lineTo(52, 92);
  g.closePath();
  g.stroke();
  g.beginPath();
  g.moveTo(54, 104);
  g.lineTo(74, 104);
  g.stroke();
  return tex(c);
}
function hatLogoTex() {
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(64, 64, 58, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#facc15';
  g.beginPath();
  g.arc(64, 54, 26, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#6b7280';
  g.fillRect(52, 78, 24, 18);
  return tex(c);
}

export function buildBear() {
  const g = new THREE.Group();
  const fur = mat(0x8a5428, 0.8);
  const furLight = mat(0xd9a873, 0.75);
  const nose = mat(0x231710, 0.3);
  const red = mat(0xd32f2f, 0.4);
  const redDark = mat(0x9b1c1c, 0.45);
  const denim = mat(0x3a5f8f, 0.75);
  const denimDark = mat(0x2b4a72, 0.75);
  const shirt = mat(0xf1e6cf, 0.7);
  const leather = mat(0x6b4423, 0.65);
  const wood = mat(0x8a5a32, 0.8);
  const iron = mat(0x6b7280, 0.4, { metalness: 0.55 });
  const glow = mat(0xfacc15, 0.3, { emissive: new THREE.Color(0xf59e0b), emissiveIntensity: 0.6 });
  const blue = mat(0x9cc8ef, 0.7);
  // 工作台（在大熊前方 -Z）
  put(g, new THREE.BoxGeometry(1.4, 0.08, 0.7), wood, 0, 0.8, -0.78);
  for (const [x, z] of [[-0.6, -0.48], [0.6, -0.48], [-0.6, -1.08], [0.6, -1.08]]) put(g, new THREE.BoxGeometry(0.08, 0.8, 0.08), wood, x, 0.4, z);
  const gear = put(g, new THREE.TorusGeometry(0.16, 0.05, 6, 12).rotateX(Math.PI / 2), glow, -0.25, 0.88, -0.78);
  put(g, new THREE.BoxGeometry(0.34, 0.18, 0.22), red, 0.42, 0.93, -0.84);
  put(g, new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), mat(0x9cc8ef, 0.6), 0.1, 0.87, -0.95, 0, 0, Math.PI / 2);
  // 身體：大肚子、丹寧吊帶褲、紅色吊帶、米色襯衫
  put(g, sph(0.44, 1, 1.08, 0.92), shirt, 0, 0.78, 0);
  put(g, sph(0.45, 1.02, 0.78, 0.94), denim, 0, 0.56, 0);
  put(g, new THREE.BoxGeometry(0.42, 0.3, 0.1), denim, 0, 0.88, -0.36, -0.12, 0, 0);
  const logo = put(g, new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshStandardMaterial({ map: overallLogoTex(), roughness: 0.7 }), 0, 0.88, -0.415, -0.12, Math.PI, 0);
  logo.userData.noMerge = true;
  for (const s of [-1, 1]) {
    put(g, new THREE.BoxGeometry(0.07, 0.5, 0.04), red, s * 0.17, 1.0, -0.35, -0.2, 0, 0);
    put(g, new THREE.BoxGeometry(0.07, 0.5, 0.04), red, s * 0.17, 1.0, 0.36, 0.2, 0, 0);
    put(g, sph(0.035), mat(0xf5c542, 0.3, { metalness: 0.7 }), s * 0.17, 0.82, -0.395);
  }
  // 工具腰帶（皮帶＋小工具袋＋扳手）
  put(g, new THREE.TorusGeometry(0.45, 0.045, 8, 32), leather, 0, 0.55, 0, Math.PI / 2);
  for (const a of [-0.9, 0.9, 2.3]) put(g, new THREE.BoxGeometry(0.16, 0.16, 0.09), leather, Math.sin(a) * 0.47, 0.48, -Math.cos(a) * 0.43, 0, a, 0);
  put(g, new THREE.BoxGeometry(0.03, 0.2, 0.05), iron, -0.44, 0.5, -0.12);
  // 腿：丹寧褲管＋紅色護膝＋棕色大腳
  for (const s of [-1, 1]) {
    put(g, cap(0.13, 0.12), denimDark, s * 0.19, 0.24, 0);
    put(g, sph(0.09, 1.1, 0.8, 0.6), red, s * 0.19, 0.27, -0.12);
    put(g, sph(0.14, 1, 0.6, 1.3), fur, s * 0.19, 0.06, -0.06);
  }
  // 背包＋藍圖卷
  put(g, new THREE.BoxGeometry(0.5, 0.52, 0.22), redDark, 0, 0.92, 0.44);
  put(g, new THREE.BoxGeometry(0.42, 0.2, 0.06), red, 0, 0.8, 0.56);
  for (const [x, l] of [[-0.12, 0.62], [0.04, 0.7], [0.18, 0.56]] as [number, number][]) {
    put(g, new THREE.CylinderGeometry(0.045, 0.045, l, 10), blue, x, 1.2 + l * 0.2, 0.5, 0.15, 0, x * 0.6);
  }
  // 頭：棕色大頭、淺色嘴套、黑鼻、圓耳
  const head = grp(g, 0, 1.38, -0.02);
  put(head, sph(0.33, 1.08, 0.98, 1), fur);
  head.add(faceShell(0.335, bearFaceTex(), -1, 1.6, 0.9, 1.2)).scale.set(1.08, 0.98, 1);
  put(head, sph(0.15, 1.2, 0.85, 0.9), furLight, 0, -0.1, -0.27);
  put(head, sph(0.055, 1.3, 0.9, 0.9), nose, 0, -0.05, -0.405);
  const mouth = put(head, new THREE.TorusGeometry(0.06, 0.012, 6, 16, Math.PI), nose, 0, -0.14, -0.4, 0, 0, Math.PI);
  void mouth;
  for (const s of [-1, 1]) {
    put(head, sph(0.1, 1, 1, 0.6), fur, s * 0.27, 0.2, 0);
    put(head, sph(0.055, 1, 1, 0.5), furLight, s * 0.27, 0.2, -0.04);
  }
  // 紅色工程安全帽（燈泡標誌）＋紅色耳機
  put(head, new THREE.SphereGeometry(0.35, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), red, 0, 0.08, 0.01);
  put(head, new THREE.CylinderGeometry(0.37, 0.37, 0.03, 28), red, 0, 0.08, -0.05);
  put(head, new THREE.BoxGeometry(0.06, 0.06, 0.6), redDark, 0, 0.42, 0.0);
  const hl = put(head, new THREE.CircleGeometry(0.09, 20), new THREE.MeshStandardMaterial({ map: hatLogoTex(), roughness: 0.5 }), 0, 0.24, -0.3, -0.75, Math.PI, 0);
  hl.userData.noMerge = true;
  for (const s of [-1, 1]) put(head, new THREE.CylinderGeometry(0.1, 0.1, 0.08, 18), red, s * 0.34, -0.02, 0.02, 0, 0, Math.PI / 2);
  // 揮木槌的右手（arm 群組；以肩膀為軸往下敲）
  const arm = grp(g, 0.42, 1.0, -0.08);
  put(arm, cap(0.1, 0.24), fur, 0, -0.08, -0.16, 1.0, 0, 0);
  put(arm, sph(0.1), shirt, 0, 0.04, 0, 0, 0, 0);
  put(arm, new THREE.CylinderGeometry(0.03, 0.03, 0.55, 8), wood, 0, 0.06, -0.48, 1.4, 0, 0);
  put(arm, new THREE.CylinderGeometry(0.11, 0.11, 0.26, 14), wood, 0, 0.1, -0.74, 0, 0, Math.PI / 2);
  // 左手扶著工作台
  put(g, cap(0.1, 0.22), fur, -0.44, 0.86, -0.3, 0.9, 0, 0.2);
  put(g, sph(0.1, 1, 0.8, 1), furLight, -0.44, 0.84, -0.5);
  g.userData.arm = arm;
  g.userData.gear = gear;
  return g;
}

/* ---------------- 搜搜（白猴少俠、筋斗雲） ---------------- */

function monkeyFaceTex() {
  const [c, g] = canvas(512, 512);
  for (const s of [-1, 1]) eye(g, 256 + s * 82, 240, 44, 52, '#3b82f6', { ring: '#0b2a6b', white: true, pupil: 0.48 });
  for (const s of [-1, 1]) brow(g, 256 + s * 84, 164, 76, s * 10, '#475569', 14);
  for (const s of [-1, 1]) blush(g, 256 + s * 140, 320, 30);
  g.fillStyle = '#6b3a2a';
  g.beginPath();
  g.ellipse(256, 300, 10, 7, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#6b3a2a';
  g.lineWidth = 7;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(222, 338);
  g.quadraticCurveTo(256, 362, 296, 332);
  g.stroke();
  return tex(c);
}

export function buildSousou() {
  const g = new THREE.Group();
  const cloudW = mat(0xffffff, 0.5, { emissive: new THREE.Color(0xe0f2fe), emissiveIntensity: 0.28 });
  const swirl = mat(0x3b82f6, 0.35, { emissive: new THREE.Color(0x2563eb), emissiveIntensity: 0.55 });
  const navy = mat(0x1e3a8a, 0.5);
  const white = mat(0xf5f7fb, 0.55);
  const silver = mat(0xe2e8f0, 0.4, { metalness: 0.25 });
  const blueHair = mat(0x2563eb, 0.4);
  const skin = mat(0xf8d9bf, 0.6);
  const brown = mat(0x7a4a2a, 0.65);
  const gold = mat(0xfbbf24, 0.3, { emissive: new THREE.Color(0xd97706), emissiveIntensity: 0.25, metalness: 0.7 });
  const band = mat(0x1d4ed8, 0.45);
  // 筋斗雲：一團團白雲＋藍色漩渦
  const cloud = grp(g);
  for (const [cx, cy, cz, cr] of [
    [0, 0, 0, 0.58],
    [-0.46, -0.04, 0.12, 0.46],
    [0.46, -0.04, 0.12, 0.46],
    [0, -0.05, 0.42, 0.44],
    [0, -0.04, -0.44, 0.48],
    [-0.36, -0.06, -0.32, 0.4],
    [0.36, -0.06, -0.32, 0.4],
    [0, 0.12, 0.05, 0.36],
  ]) put(cloud, sph(cr, 1.15, 0.72, 1.15, 16, 12), cloudW, cx, cy, cz);
  for (const [sx, sz, ry] of [[-0.6, 0.1, Math.PI / 2], [0.6, 0.1, Math.PI / 2], [0, -0.64, 0], [-0.3, 0.5, 0.6]] as [number, number, number][])
    put(cloud, new THREE.TorusGeometry(0.17, 0.035, 8, 20, Math.PI * 1.5), swirl, sx, 0.02, sz, 0, ry, 0);
  const trail: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) trail.push(put(g, sph(0.36 - i * 0.055, 1, 0.8, 1, 14, 10), cloudW, 0, -0.05, -0.82 - i * 0.48));
  for (let i = 0; i < 3; i++) put(g, new THREE.TorusGeometry(0.2 - i * 0.04, 0.025, 6, 16, Math.PI * 1.3), swirl, 0, -0.02, -0.9 - i * 0.5, Math.PI / 2, 0, i);
  // 身體：白衣、深藍罩衫、金色滾邊、藍圍巾
  const b = grp(g, 0, 0.26, 0.05);
  put(b, new THREE.CylinderGeometry(0.2, 0.28, 0.5, 14), white, 0, 0.42, 0);
  put(b, new THREE.CylinderGeometry(0.21, 0.29, 0.34, 14, 1, true, -Math.PI * 0.7, Math.PI * 1.4), navy, 0, 0.36, 0);
  put(b, new THREE.TorusGeometry(0.27, 0.02, 6, 24), gold, 0, 0.2, 0, Math.PI / 2);
  put(b, new THREE.TorusGeometry(0.17, 0.05, 8, 20), band, 0, 0.68, 0.01, Math.PI / 2);
  put(b, new THREE.BoxGeometry(0.08, 0.24, 0.03), band, -0.1, 0.56, -0.18, -0.4, 0, 0.3);
  put(b, new THREE.TorusGeometry(0.26, 0.035, 8, 24), navy, 0, 0.28, 0, Math.PI / 2);
  put(b, sph(0.05), gold, 0, 0.28, 0.27);
  // 腿（跪蹲在雲上）、深色綁腿
  for (const s of [-1, 1]) {
    put(b, cap(0.085, 0.2), navy, s * 0.13, 0.12, 0.06, Math.PI / 2 - 0.3, 0, 0);
    put(b, sph(0.08, 1, 0.7, 1.4), mat(0x1f2937, 0.5), s * 0.13, 0.02, 0.2);
  }
  // 手臂與金藍棍子（如意金箍棒：兩端金、中間藍）
  put(b, cap(0.055, 0.22), white, -0.28, 0.48, 0.08, 0.3, 0, 0.5);
  const ra = put(b, cap(0.055, 0.24), white, 0.28, 0.66, 0.2, -0.65, 0, -0.95);
  void ra;
  const staff = grp(b, 0.05, 0.6, -0.22);
  staff.rotation.z = -0.68;
  put(staff, new THREE.CylinderGeometry(0.035, 0.035, 1.1, 10), blueHair);
  for (const e of [-1, 1]) put(staff, new THREE.CylinderGeometry(0.048, 0.048, 0.16, 10), gold, 0, e * 0.6, 0);
  // 頭：臉、猴耳、銀色刺刺頭髮（藍色挑染）、藍頭巾＋飄帶
  const head = grp(b, 0, 0.98, 0.04);
  put(head, sph(0.32, 1.06, 0.98, 1), silver);
  put(head, sph(0.25, 1.1, 0.95, 0.6), skin, 0, -0.04, 0.16);
  head.add(faceShell(0.26, monkeyFaceTex(), 1, 1.7, 0.7, 1.3)).scale.set(1.1, 0.95, 0.62);
  (head.children[head.children.length - 1] as THREE.Mesh).position.set(0, -0.04, 0.17);
  for (const s of [-1, 1]) {
    put(head, sph(0.1, 0.55, 1, 0.9), skin, s * 0.33, -0.02, 0.0);
    put(head, sph(0.06, 0.4, 0.8, 0.7), mat(0xf2a7a0, 0.6), s * 0.35, -0.02, 0.02);
  }
  put(head, new THREE.TorusGeometry(0.31, 0.045, 10, 28), band, 0, 0.12, 0.02, Math.PI / 2 - 0.12, 0, 0);
  for (const s of [-1, 1]) put(head, tube([[s * 0.05, 0.12, -0.3], [s * 0.15, 0.05, -0.5], [s * 0.1, -0.05, -0.72]], 0.025, 16, 0.012), band);
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    const r = i % 3 === 0 ? 0.08 : 0.07;
    const sp = put(head, new THREE.ConeGeometry(r, 0.3, 6), i % 4 === 1 ? blueHair : silver, Math.cos(a) * 0.17, 0.3, Math.sin(a) * 0.14 - 0.04);
    sp.rotation.z = -Math.cos(a) * 0.55;
    sp.rotation.x = Math.sin(a) * 0.55;
  }
  put(head, new THREE.ConeGeometry(0.09, 0.32, 6), silver, 0, 0.38, 0.02, 0.15, 0, 0);
  // 棕色猴尾巴（捲起來）
  put(b, tube([[0, 0.25, -0.25], [0.05, 0.1, -0.5], [0.2, 0.2, -0.7], [0.3, 0.45, -0.62], [0.22, 0.55, -0.48]], 0.035, 30, 0.02), brown);
  g.userData.trail = trail;
  return g;
}

/* ---------------- 小燈泡（吉祥物） ---------------- */

function bulbFaceTex(mood: 'happy' | 'dizzy') {
  const [c, g] = canvas(512, 512);
  if (mood === 'happy') {
    for (const s of [-1, 1]) eye(g, 256 + s * 70, 230, 34, 44, '#4a2a10', { ring: '#1a0d05', white: true, pupil: 0.55 });
    for (const s of [-1, 1]) brow(g, 256 + s * 74, 160, 64, -s * 6, '#3a2410', 14);
    for (const s of [-1, 1]) blush(g, 256 + s * 128, 300, 34);
    g.strokeStyle = '#3a2410';
    g.lineWidth = 10;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(256, 280, 54, 0.18 * Math.PI, 0.82 * Math.PI);
    g.stroke();
  } else {
    // 倒地：眼睛轉圈圈、嘴巴歪一邊
    g.strokeStyle = '#3a2410';
    g.lineWidth = 8;
    for (const s of [-1, 1]) {
      g.beginPath();
      for (let a = 0; a < Math.PI * 5; a += 0.15) {
        const r = 4 + a * 2.6;
        const x = 256 + s * 70 + Math.cos(a) * r;
        const y = 230 + Math.sin(a) * r;
        if (a === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
    g.beginPath();
    g.moveTo(220, 310);
    g.quadraticCurveTo(250, 290, 290, 312);
    g.stroke();
    for (const s of [-1, 1]) blush(g, 256 + s * 128, 300, 30);
  }
  return tex(c);
}

/**
 * 小燈泡：黃色玻璃燈泡（臉在玻璃上）、黃色細管手臂＋白手套、黑色螺紋燈頭
 * userData.setPose(pose, k)：'idle' | 'walk' | 'jump' | 'fallen'
 */
export function buildXiaodengpao() {
  const g = new THREE.Group();
  const inner = grp(g);
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xffe066,
    roughness: 0.12,
    metalness: 0,
    transmission: 0,
    transparent: true,
    opacity: 0.92,
    emissive: new THREE.Color(0xffc21a),
    emissiveIntensity: 0.55,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
  });
  const arm = mat(0xf2b705, 0.45);
  const glove = mat(0xfafafa, 0.55);
  const screw = mat(0x2a2a2e, 0.35, { metalness: 0.8 });
  const fil = mat(0xfff3c4, 0.2, { emissive: new THREE.Color(0xffb020), emissiveIntensity: 1.4 });
  // 燈泡玻璃（車床曲線：圓球＋收頸）
  const prof: [number, number][] = [
    [0.001, 1.22],
    [0.18, 1.2],
    [0.3, 1.12],
    [0.37, 0.98],
    [0.38, 0.84],
    [0.33, 0.68],
    [0.24, 0.55],
    [0.18, 0.46],
    [0.17, 0.4],
  ];
  const bulb = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 40), glass);
  bulb.castShadow = true;
  bulb.userData.noMerge = true;
  inner.add(bulb);
  // 鎢絲
  put(inner, new THREE.TorusGeometry(0.08, 0.012, 6, 16, Math.PI), fil, 0, 0.72, 0, 0, 0, Math.PI);
  for (const s of [-1, 1]) put(inner, new THREE.CylinderGeometry(0.006, 0.006, 0.26, 4), fil, s * 0.08, 0.58, 0);
  // 臉（貼在玻璃前面，臉朝 -Z）
  const happy = bulbFaceTex('happy');
  const dizzy = bulbFaceTex('dizzy');
  const face = faceShell(0.376, happy, -1, 1.5, 0.75, 1.0);
  face.position.y = 0.86;
  face.scale.set(1, 1, 1);
  inner.add(face);
  // 黑色螺紋燈頭
  put(inner, new THREE.CylinderGeometry(0.175, 0.17, 0.08, 24), mat(0xc9a227, 0.3, { metalness: 0.8 }), 0, 0.38, 0);
  for (let k = 0; k < 4; k++) put(inner, new THREE.TorusGeometry(0.16 - k * 0.006, 0.028, 8, 24), screw, 0, 0.32 - k * 0.06, 0, Math.PI / 2);
  put(inner, new THREE.CylinderGeometry(0.15, 0.12, 0.22, 20), screw, 0, 0.21, 0);
  put(inner, sph(0.08, 1, 0.6, 1), screw, 0, 0.08, 0);
  // 手臂（細黃管）＋白手套
  const arms: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const a = grp(inner, s * 0.3, 0.62, 0);
    put(a, tube([[0, 0, 0], [s * 0.1, -0.08, 0], [s * 0.14, -0.22, -0.02]], 0.022), arm);
    put(a, sph(0.06, 1, 1.1, 0.9), glove, s * 0.15, -0.27, -0.02);
    put(a, sph(0.025, 1, 1.4, 1), glove, s * 0.1, -0.24, -0.06);
    a.userData.side = s;
    arms.push(a);
  }
  const shadowLight = new THREE.PointLight(0xffc860, 0.6, 3.2, 2);
  shadowLight.position.y = 0.85;
  inner.add(shadowLight);
  const faceMat = face.material as THREE.MeshStandardMaterial;
  g.userData.setPose = (pose: 'idle' | 'walk' | 'jump' | 'fallen', t: number) => {
    faceMat.map = pose === 'fallen' ? dizzy : happy;
    if (pose === 'fallen') {
      inner.rotation.set(0, 0, Math.PI / 2 - 0.12);
      inner.position.set(0.55, 0.36, 0);
      for (const a of arms) a.rotation.set(0, 0, (a.userData.side as number) * 0.9);
      return;
    }
    inner.rotation.set(0, 0, 0);
    inner.position.set(0, 0, 0);
    if (pose === 'jump') {
      const k = Math.abs(Math.sin(t * 6));
      inner.position.y = k * 0.45;
      inner.rotation.z = Math.sin(t * 3) * 0.12;
      for (const a of arms) a.rotation.set(0, 0, -(a.userData.side as number) * (2.4 + Math.sin(t * 12) * 0.3));
    } else if (pose === 'walk') {
      inner.position.y = Math.abs(Math.sin(t * 7)) * 0.06;
      inner.rotation.z = Math.sin(t * 7) * 0.08;
      for (const a of arms) a.rotation.set(Math.sin(t * 7) * 0.6 * (a.userData.side as number), 0, 0);
    } else {
      inner.position.y = Math.sin(t * 2) * 0.02;
      for (const a of arms) a.rotation.set(0, 0, -(a.userData.side as number) * 0.15);
    }
  };
  g.userData.setPose('idle', 0);
  return g;
}
