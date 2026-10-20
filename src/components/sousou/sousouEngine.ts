// @ts-nocheck
// 探索者「搜搜」3D 角色：Q 版小猴子，藍色頭帶、白色上衣、藍色圍巾，騎筋斗雲，背後揹金箍棒。
// 跟小燈泡一樣全部用 three.js 程式建模（不需要模型檔），表情畫在臉部貼圖上，動作用骨架式群組控制。
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export const SOUSOU_EXPRESSIONS = ['confident', 'happy', 'angry', 'surprised', 'focused', 'wink', 'sorry'];
export const SOUSOU_ACTIONS = ['parked', 'takeoff', 'search', 'land', 'found', 'sorry', 'idle', 'think', 'wave', 'fly'];

const C = {
  fur: 0xd8cfc4, furDark: 0xb9ab9c, skin: 0xf3c7a4, tunic: 0xf3f1ec, navy: 0x1f2740, navyDark: 0x161b2c,
  blue: 0x2f5bd6, blueLight: 0x6d93f2, gold: 0xc9a14b, tail: 0xb8946f, boot: 0x2a2f42,
};

export function createSousou(canvas, opts = {}) {
  const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: !!opts.preserve });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
  camera.position.set(0, 1.75, 12.5);
  camera.lookAt(0, 1.45, 0);

  scene.add(new THREE.HemisphereLight(0xeef3ff, 0x2a3350, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(-3, 5, 6); scene.add(key);
  const rimL = new THREE.DirectionalLight(0x8fb0ff, 1.2); rimL.position.set(4, 3, -5); scene.add(rimL);

  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...o });
  const M = {
    fur: std(C.fur, { roughness: 0.9 }), furDark: std(C.furDark, { roughness: 0.9 }), skin: std(C.skin, { roughness: 0.6 }),
    tunic: std(C.tunic, { roughness: 0.65 }), navy: std(C.navy, { roughness: 0.55 }), navyDark: std(C.navyDark, { roughness: 0.6 }),
    blue: new THREE.MeshPhysicalMaterial({ color: C.blue, roughness: 0.45, sheen: 1, sheenColor: new THREE.Color(0x9fb8ff), sheenRoughness: 0.4 }),
    gold: std(C.gold, { metalness: 0.85, roughness: 0.28 }), tail: std(C.tail, { roughness: 0.9 }), boot: std(C.boot, { roughness: 0.5 }),
  };

  // 骨架：root（整隻＋雲）→ rider（角色）→ hips → torso → head / arms
  const root = new THREE.Group(); scene.add(root);
  const rider = new THREE.Group(); root.add(rider);
  const hips = new THREE.Group(); hips.position.y = 0.62; rider.add(hips);
  const torso = new THREE.Group(); torso.position.y = 0.12; hips.add(torso);

  const mesh = (geo, mat, parent, pos = [0, 0, 0], rot = [0, 0, 0], scale) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); if (scale) m.scale.set(...scale); parent.add(m); return m;
  };

  // ── 筋斗雲 ──
  const cloud = new THREE.Group(); cloud.position.y = 0; root.add(cloud);
  const cloudMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.95, emissive: new THREE.Color(0xbcd0ff), emissiveIntensity: 0.22, sheen: 1, sheenColor: new THREE.Color(0xdfe8ff) });
  [[0, -0.05, 0, 0.62], [-0.62, -0.12, 0.12, 0.5], [0.66, -0.1, 0.08, 0.52], [-1.15, -0.2, -0.05, 0.38], [1.2, -0.18, -0.02, 0.4],
   [-0.3, -0.25, 0.45, 0.42], [0.35, -0.24, 0.45, 0.44], [0.0, -0.2, -0.45, 0.48], [-0.75, -0.3, -0.35, 0.36], [0.8, -0.3, -0.35, 0.38],
   [0.0, -0.42, 0.1, 0.5], [-1.5, -0.32, 0.05, 0.26], [1.55, -0.3, 0.05, 0.27]].forEach(([x, y, z, r]) => mesh(new THREE.SphereGeometry(r, 28, 20), cloudMat, cloud, [x, y, z], [0, 0, 0], [1, 0.78, 1]));
  // 雲上的藍色漩渦紋
  const swirlMat = new THREE.MeshBasicMaterial({ color: 0x4f7ff0, transparent: true, opacity: 0.9, depthWrite: false });
  class Spiral extends THREE.Curve {
    constructor(r = 0.22, turns = 1.6) { super(); this.r = r; this.turns = turns; }
    getPoint(t, out = new THREE.Vector3()) { const a = t * Math.PI * 2 * this.turns; const rr = this.r * (1 - t * 0.85); return out.set(Math.cos(a) * rr, Math.sin(a) * rr, 0); }
  }
  [[-0.55, -0.12, 0.55, 0.2], [0.42, -0.1, 0.62, 0.24], [0.0, -0.32, 0.62, 0.16], [-1.1, -0.2, 0.32, 0.14], [1.15, -0.18, 0.34, 0.15]].forEach(([x, y, z, r]) => {
    const s = mesh(new THREE.TubeGeometry(new Spiral(r), 64, 0.018, 6), swirlMat, cloud, [x, y, z]); s.renderOrder = 3;
  });
  // 雲底下的光暈
  const glowCv = document.createElement('canvas'); glowCv.width = glowCv.height = 128;
  { const g = glowCv.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(140,175,255,0.9)'); gr.addColorStop(0.5, 'rgba(90,130,255,0.25)'); gr.addColorStop(1, 'rgba(90,130,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glowCv), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7 }));
  glow.scale.set(4.2, 1.6, 1); glow.position.set(0, -0.35, -0.2); cloud.add(glow);

  // ── 腿與靴子（微蹲的騎雲姿勢）──
  const legs = {};
  for (const s of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(0.2 * s, 0.02, 0); hips.add(leg);
    mesh(new THREE.CapsuleGeometry(0.17, 0.2, 8, 16), M.navy, leg, [0.03 * s, -0.16, 0.02], [0.15, 0, 0.12 * s]);
    const shin = new THREE.Group(); shin.position.set(0.06 * s, -0.36, 0.05); leg.add(shin);
    mesh(new THREE.CapsuleGeometry(0.1, 0.14, 8, 14), M.boot, shin, [0, -0.08, 0]);
    mesh(new THREE.TorusGeometry(0.105, 0.025, 8, 24), M.gold, shin, [0, 0.02, 0], [Math.PI / 2, 0, 0]);
    mesh(new THREE.SphereGeometry(0.13, 18, 12), M.boot, shin, [0, -0.2, 0.06], [0, 0, 0], [1, 0.6, 1.4]);
    legs[s] = { leg, shin };
  }

  // ── 上衣、腰帶、下擺 ──
  const tunicPts = [[0.0, -0.12], [0.42, -0.12], [0.46, 0.0], [0.4, 0.3], [0.33, 0.55], [0.18, 0.66], [0, 0.68]].map(([x, y]) => new THREE.Vector2(x, y));
  mesh(new THREE.LatheGeometry(tunicPts, 40), M.tunic, torso);
  // 前襟藍邊
  mesh(new THREE.BoxGeometry(0.06, 0.6, 0.02), M.blue, torso, [0.04, 0.32, 0.4], [0.12, 0, 0.05]);
  // 腰帶與金色圓扣
  mesh(new THREE.TorusGeometry(0.43, 0.06, 10, 40), M.navy, torso, [0, 0.03, 0], [Math.PI / 2, 0, 0]);
  mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 28), M.gold, torso, [0, 0.03, 0.46], [Math.PI / 2, 0, 0]);
  mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 20), M.navy, torso, [0, 0.03, 0.485]);
  // 下擺（白色裙甲＋藍色流蘇）
  const skirt = mesh(new THREE.CylinderGeometry(0.44, 0.56, 0.32, 32, 1, true), M.tunic, torso, [0, -0.26, 0]);
  skirt.material = M.tunic.clone(); skirt.material.side = THREE.DoubleSide;
  for (const s of [-1, 1]) {
    mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.22, 8), M.blue, torso, [0.18 * s, -0.22, 0.5]);
    mesh(new THREE.SphereGeometry(0.04, 10, 8), M.gold, torso, [0.18 * s, -0.08, 0.5]);
  }
  // 圍巾
  mesh(new THREE.TorusGeometry(0.24, 0.1, 12, 28), M.blue, torso, [0, 0.66, 0.02], [Math.PI / 2 - 0.15, 0, 0]);
  const scarfTail = mesh(new THREE.CapsuleGeometry(0.07, 0.22, 6, 10), M.blue, torso, [0.12, 0.5, 0.3], [0.5, 0, 0.35]);

  // ── 手臂：肩 → 上臂（白袖）→ 手肘 → 前臂（深藍護腕）→ 手 ──
  const arms = {};
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group(); shoulder.position.set(0.44 * s, 0.5, 0.02); torso.add(shoulder);
    mesh(new THREE.SphereGeometry(0.15, 18, 14), M.navy, shoulder, [0.02 * s, 0.02, 0], [0, 0, 0], [1.1, 0.8, 1]);
    mesh(new THREE.TorusGeometry(0.13, 0.018, 6, 22), M.gold, shoulder, [0.02 * s, -0.04, 0], [Math.PI / 2, 0, 0]);
    mesh(new THREE.CapsuleGeometry(0.095, 0.24, 8, 14), M.tunic, shoulder, [0, -0.2, 0]);
    const elbow = new THREE.Group(); elbow.position.set(0, -0.4, 0); shoulder.add(elbow);
    mesh(new THREE.CapsuleGeometry(0.09, 0.2, 8, 14), M.navy, elbow, [0, -0.15, 0]);
    mesh(new THREE.TorusGeometry(0.093, 0.02, 6, 20), M.gold, elbow, [0, -0.04, 0], [Math.PI / 2, 0, 0]);
    const hand = new THREE.Group(); hand.position.set(0, -0.38, 0); elbow.add(hand);
    mesh(new THREE.SphereGeometry(0.11, 18, 14), M.skin, hand, [0, -0.02, 0], [0, 0, 0], [1, 1.05, 0.8]);
    mesh(new THREE.CapsuleGeometry(0.035, 0.06, 4, 8), M.skin, hand, [0.08 * -s, 0.01, 0.06], [0.3, 0, 0.9 * s]);
    for (let f = 0; f < 3; f++) mesh(new THREE.CapsuleGeometry(0.032, 0.07, 4, 8), M.skin, hand, [(-0.05 + f * 0.05), -0.11, 0.02], [0.15, 0, 0]);
    arms[s] = { shoulder, elbow, hand };
  }

  // ── 金箍棒：揹在背後，「找到了」時拿在右手 ──
  const makeStaff = () => {
    const g = new THREE.Group();
    mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.7, 16), M.blue, g);
    for (const e of [-1, 1]) {
      mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.28, 18), M.gold, g, [0, 0.95 * e, 0]);
      mesh(new THREE.TorusGeometry(0.07, 0.014, 6, 18), M.gold, g, [0, 0.79 * e, 0], [Math.PI / 2, 0, 0]);
      mesh(new THREE.SphereGeometry(0.07, 14, 10), M.gold, g, [0, 1.09 * e, 0], [0, 0, 0], [1, 0.55, 1]);
    }
    return g;
  };
  const backStaff = makeStaff(); backStaff.position.set(0, 0.45, -0.48); backStaff.rotation.set(0.12, 0, 0.95); torso.add(backStaff);
  const handStaff = makeStaff(); handStaff.position.set(0, -0.04, 0.1); handStaff.rotation.set(0.25, 0, 0); handStaff.visible = false; arms[1].hand.add(handStaff);

  // ── 尾巴（捲起來的毛尾）──
  const tailGrp = new THREE.Group(); tailGrp.position.set(0, -0.1, -0.42); torso.add(tailGrp);
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.15, 0.02, -0.3), new THREE.Vector3(-0.45, 0.2, -0.42), new THREE.Vector3(-0.7, 0.55, -0.35),
    new THREE.Vector3(-0.72, 0.9, -0.2), new THREE.Vector3(-0.5, 1.05, -0.1), new THREE.Vector3(-0.35, 0.9, -0.08), new THREE.Vector3(-0.45, 0.78, -0.08),
  ]);
  const tailGeo = new THREE.TubeGeometry(tailCurve, 80, 0.065, 10);
  mesh(tailGeo, M.tail, tailGrp);

  // ── 頭 ──
  const neck = new THREE.Group(); neck.position.set(0, 0.7, 0); torso.add(neck);
  const head = new THREE.Group(); head.position.set(0, 0.64, 0.04); neck.add(head);
  mesh(new THREE.SphereGeometry(0.82, 48, 36), M.fur, head, [0, 0, 0], [0, 0, 0], [1.02, 0.96, 0.94]);
  // 臉頰毛
  for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.28, 18, 14), M.fur, head, [0.62 * s, -0.32, 0.22], [0, 0, 0], [0.9, 0.8, 0.7]);
  // 耳朵
  for (const s of [-1, 1]) {
    const ear = new THREE.Group(); ear.position.set(0.86 * s, 0.02, 0.0); head.add(ear);
    mesh(new THREE.SphereGeometry(0.24, 22, 16), M.fur, ear, [0, 0, 0], [0, 0, 0], [0.55, 1, 1]);
    mesh(new THREE.SphereGeometry(0.17, 22, 16), M.skin, ear, [0.06 * s, 0, 0.03], [0, 0, 0], [0.4, 0.85, 0.85]);
  }
  // 臉：畫在貼著頭部表面的曲面上（膚色臉、眼睛、眉毛、嘴巴都在這張圖）
  const faceCv = document.createElement('canvas'); faceCv.width = 1024; faceCv.height = 640;
  const fx = faceCv.getContext('2d');
  const faceTex = new THREE.CanvasTexture(faceCv); faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 8;
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, transparent: true, roughness: 0.6, depthWrite: false });
  const faceGeo = new THREE.SphereGeometry(0.83, 64, 40, Math.PI / 2 - 0.78, 1.56, 0.95, 1.12);
  const face = mesh(faceGeo, faceMat, head, [0, 0, 0], [0, 0, 0], [1.02, 0.96, 0.94]); face.renderOrder = 2;
  // 鼻吻（立體一點）

  // 頭髮：一束束往上翹的毛（米白→藍色髮尖）
  const hairGeo = new THREE.ConeGeometry(0.2, 0.55, 12, 5);
  { const pos = hairGeo.attributes.position; const col = []; const base = new THREE.Color(0xf1ece4), tip = new THREE.Color(0x7d9cf5);
    for (let i = 0; i < pos.count; i++) { const t = (pos.getY(i) + 0.275) / 0.55; const c = base.clone().lerp(tip, Math.pow(Math.max(0, t - 0.2) / 0.8, 1.1)); col.push(c.r, c.g, c.b); }
    hairGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); }
  const hairMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
  const hairGrp = new THREE.Group(); head.add(hairGrp);
  const rng = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const tufts = [];
  for (let i = 0; i < 30; i++) {
    // 分布在頭頂與後腦（前額留給頭帶與瀏海）
    const theta = rng() * Math.PI * 2, phi = 0.05 + rng() * 0.95;
    const dir = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
    if (dir.z > 0.55 && dir.y < 0.75) continue;
    const len = 0.4 + rng() * 0.25;
    const t = mesh(hairGeo, hairMat, hairGrp, [dir.x * 0.68, dir.y * 0.66 + 0.12, dir.z * 0.62], [0, 0, 0], [1 + rng() * 0.4, len / 0.55, 1 + rng() * 0.4]);
    const up = new THREE.Vector3(dir.x * 0.6, dir.y + 0.9, dir.z * 0.5 - 0.35).normalize();
    t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    tufts.push({ t, ph: rng() * 6 });
  }
  // 瀏海：從頭帶上方往上翹
  for (let i = -2; i <= 2; i++) {
    const t = mesh(hairGeo, hairMat, hairGrp, [i * 0.2, 0.52, 0.5 - Math.abs(i) * 0.06], [0, 0, 0], [0.95, 0.9, 0.95]);
    t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(i * 0.25, 1, 0.25).normalize());
    tufts.push({ t, ph: i });
  }
  // 頭帶與後腦的結
  const bandMat = M.blue.clone(); bandMat.side = THREE.DoubleSide;
  const band = mesh(new THREE.CylinderGeometry(0.84, 0.86, 0.17, 64, 1, true), bandMat, head, [0, 0.3, -0.02], [-0.2, 0, 0], [1.03, 1, 0.97]);
  for (const dy of [-0.085, 0.085]) mesh(new THREE.TorusGeometry(0.85, 0.014, 6, 64), M.navyDark, head, [0, 0.3 + dy, -0.02 - dy * 0.2], [Math.PI / 2 - 0.2, 0, 0], [1.03, 0.97, 1]);
  const knot = new THREE.Group(); knot.position.set(0, 0.44, -0.78); head.add(knot);
  mesh(new THREE.SphereGeometry(0.1, 16, 12), M.blue, knot, [0, 0, 0], [0, 0, 0], [1.3, 1, 0.8]);
  for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.09, 14, 10), M.blue, knot, [0.13 * s, 0.02, -0.02], [0, 0, 0.6 * s], [1.4, 0.8, 0.7]);
  // 飄帶（會隨風擺動的兩條藍色緞帶）
  const ribbonMat = new THREE.MeshPhysicalMaterial({ color: C.blue, roughness: 0.4, sheen: 1, sheenColor: new THREE.Color(0xa9c0ff), side: THREE.DoubleSide });
  const ribbons = [];
  for (const s of [-1, 1]) {
    const geo = new THREE.PlaneGeometry(0.15, 1.05, 1, 20);
    geo.translate(0, -0.52, 0);
    const r = mesh(geo, ribbonMat, knot, [0.08 * s, 0, -0.05]);
    ribbons.push({ r, s, base: geo.attributes.position.array.slice() });
  }

  // ── 汗滴與星星特效 ──
  const fxGrp = new THREE.Group(); scene.add(fxGrp);
  const dropCv = document.createElement('canvas'); dropCv.width = 64; dropCv.height = 96;
  { const g = dropCv.getContext('2d'); g.fillStyle = '#9cc4ff'; g.beginPath(); g.moveTo(32, 4); g.bezierCurveTo(60, 50, 58, 90, 32, 92); g.bezierCurveTo(6, 90, 4, 50, 32, 4); g.fill(); g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse(24, 60, 6, 12, -0.3, 0, Math.PI * 2); g.fill(); }
  const sweat = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(dropCv), transparent: true, depthTest: false }));
  sweat.scale.set(0.22, 0.33, 1); sweat.visible = false; sweat.renderOrder = 10; head.add(sweat); sweat.position.set(0.62, 0.45, 0.5);
  const starCv = document.createElement('canvas'); starCv.width = starCv.height = 64;
  { const g = starCv.getContext('2d'); g.translate(32, 32); g.fillStyle = '#fff'; g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 7 : 30, a = i * Math.PI / 4 - Math.PI / 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); }
  const starTex = new THREE.CanvasTexture(starCv);
  const sparks = Array.from({ length: 18 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: 0xffe08a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); s.visible = false; fxGrp.add(s); return { s, life: 0, v: new THREE.Vector3() }; });
  const burst = () => {
    head.updateMatrixWorld(); const p = new THREE.Vector3(); head.getWorldPosition(p);
    sparks.forEach((k, i) => { const a = (i / sparks.length) * Math.PI * 2; k.life = 1; k.s.visible = true; k.s.position.copy(p).add(new THREE.Vector3(Math.cos(a) * 0.5, 0.6 + Math.random() * 0.3, 0.3)); k.v.set(Math.cos(a) * (1.4 + Math.random()), 2.2 + Math.random() * 1.5, 0.2); });
  };
  // 速度線（飛行時）
  const speedLines = [];
  for (let i = 0; i < 7; i++) {
    const l = mesh(new THREE.PlaneGeometry(1.4 + Math.random(), 0.025), new THREE.MeshBasicMaterial({ color: 0xbfd2ff, transparent: true, opacity: 0, depthWrite: false }), scene, [0, 0.4 + i * 0.35, -0.6]);
    l.userData = { y: 0.3 + i * 0.38, off: Math.random() * 6 }; speedLines.push(l);
  }

  // ───────────── 表情 ─────────────
  const EXP = {
    confident: { brow: [-0.25, 0], lid: 0.12, mouth: 'smirk', blush: 0.3 },
    happy: { brow: [0.2, 6], lid: 0, closed: 'happy', mouth: 'grin', blush: 0.6 },
    angry: { brow: [-0.55, -6], lid: 0.25, mouth: 'shout', blush: 0.2 },
    surprised: { brow: [0.25, 14], lid: -0.1, mouth: 'o', blush: 0.3 },
    focused: { brow: [-0.3, -4], lid: 0.38, mouth: 'flat', blush: 0.2 },
    wink: { brow: [0.05, 4], lid: 0.08, closed: 'wink', mouth: 'smile', blush: 0.5 },
    sorry: { brow: [0.45, 4], lid: 0.2, mouth: 'wobbly', blush: 0.7 },
  };
  let expr = 'confident', blinkT = 0, nextBlink = 2.5, look = { x: 0, y: 0 }, talk = 0;
  const lerpN = (a, b, t) => a + (b - a) * t;

  function drawFace() {
    const W = faceCv.width, H = faceCv.height, g = fx;
    g.clearRect(0, 0, W, H);
    const e = EXP[expr] || EXP.confident;
    const cx = W / 2, EY = 250, ER = 118, EX = 190; // 眼睛中心高度、眼睛半徑、左右距離
    // 膚色臉：兩個眼窩＋下方鼻吻，連成愛心形
    g.fillStyle = '#f3c7a4';
    g.beginPath(); g.ellipse(cx - EX, EY + 10, 205, 200, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(cx + EX, EY + 10, 205, 200, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(cx, 470, 250, 165, 0, 0, Math.PI * 2); g.fill();
    // 臉頰紅暈
    g.fillStyle = `rgba(255,120,120,${0.4 * e.blush})`;
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * 300, 450, 70, 38, 0, 0, Math.PI * 2); g.fill(); }
    // 眼睛
    const blinking = blinkT > 0;
    for (const s of [-1, 1]) {
      const ex = cx + s * EX, ey = EY;
      const closed = blinking || e.closed === 'happy' || (e.closed === 'wink' && s === 1);
      if (closed) {
        g.strokeStyle = '#2b2430'; g.lineWidth = 22; g.lineCap = 'round';
        g.beginPath();
        if (e.closed === 'happy' || e.closed === 'wink') g.arc(ex, ey + 40, 80, Math.PI * 1.15, Math.PI * 1.85);
        else g.arc(ex, ey - 20, 90, Math.PI * 0.18, Math.PI * 0.82);
        g.stroke();
        continue;
      }
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex, ey, ER, ER * 1.12, 0, 0, Math.PI * 2); g.fill();
      const ix = ex + look.x * 34, iy = ey + 14 + look.y * 24;
      const gr = g.createRadialGradient(ix, iy + 16, 8, ix, iy, 96); gr.addColorStop(0, '#a9c8ff'); gr.addColorStop(0.5, '#3d6fe0'); gr.addColorStop(1, '#16286a');
      g.save(); g.beginPath(); g.ellipse(ex, ey, ER, ER * 1.12, 0, 0, Math.PI * 2); g.clip();
      g.fillStyle = gr; g.beginPath(); g.ellipse(ix, iy, 88, 98, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#0d1230'; g.beginPath(); g.ellipse(ix, iy + 6, 38, 44, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ix - 32, iy - 36, 24, 28, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(ix + 28, iy + 32, 11, 0, Math.PI * 2); g.fill();
      const lid = e.lid;
      if (lid > 0) {
        const tilt = expr === 'angry' ? s * 30 : 0;
        g.fillStyle = '#f3c7a4';
        g.beginPath(); g.moveTo(ex - 140, ey - 160); g.lineTo(ex + 140, ey - 160);
        g.lineTo(ex + 140, ey - ER * 1.12 + lid * 260 - tilt); g.lineTo(ex - 140, ey - ER * 1.12 + lid * 260 + tilt); g.closePath(); g.fill();
        g.strokeStyle = '#2b2430'; g.lineWidth = 14;
        g.beginPath(); g.moveTo(ex - ER, ey - ER * 1.12 + lid * 260 + tilt); g.lineTo(ex + ER, ey - ER * 1.12 + lid * 260 - tilt); g.stroke();
      }
      g.restore();
      g.strokeStyle = '#2b2430'; g.lineWidth = 14;
      g.beginPath(); g.ellipse(ex, ey, ER, ER * 1.12, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    }
    // 眉毛
    const [ang, raise] = e.brow;
    g.strokeStyle = '#857a70'; g.lineCap = 'round'; g.lineWidth = 42;
    for (const s of [-1, 1]) {
      const bx = cx + s * EX, by = EY - 165 - raise * 3;
      g.save(); g.translate(bx, by); g.rotate(-ang * s);
      g.beginPath(); g.moveTo(-95, 10); g.quadraticCurveTo(0, -22, 95, 6); g.stroke(); g.restore();
    }
    // 鼻子
    g.fillStyle = '#5a3b33'; g.beginPath(); g.ellipse(cx, 445, 36, 22, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(cx - 10, 437, 11, 6, 0, 0, Math.PI * 2); g.fill();
    // 嘴巴
    const my = 525; const open = talk > 0 ? 0.35 + Math.abs(Math.sin(performance.now() / 70)) * 0.65 : 0;
    g.strokeStyle = '#4a2a28'; g.lineWidth = 15; g.lineCap = 'round';
    const mouth = talk > 0 && (e.mouth === 'smirk' || e.mouth === 'flat' || e.mouth === 'smile') ? 'talk' : e.mouth;
    const openShape = (w, h, tongue = true) => {
      g.fillStyle = '#6d2430'; g.beginPath(); g.moveTo(cx - w, my); g.quadraticCurveTo(cx, my + h * 2, cx + w, my); g.closePath(); g.fill();
      if (tongue) { g.fillStyle = '#ef7d86'; g.beginPath(); g.ellipse(cx, my + h * 0.85, w * 0.5, h * 0.4, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#fff'; g.fillRect(cx - w * 0.7, my, w * 1.4, 12);
      g.stroke();
    };
    if (mouth === 'smirk') { g.beginPath(); g.moveTo(cx - 75, my + 8); g.quadraticCurveTo(cx + 15, my + 42, cx + 85, my - 14); g.stroke(); }
    else if (mouth === 'smile') { g.beginPath(); g.moveTo(cx - 85, my - 6); g.quadraticCurveTo(cx, my + 56, cx + 85, my - 6); g.stroke(); }
    else if (mouth === 'grin') openShape(110, 60);
    else if (mouth === 'shout') { g.fillStyle = '#6d2430'; g.beginPath(); g.ellipse(cx, my + 25, 85, 58, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.fillRect(cx - 55, my - 28, 110, 16); }
    else if (mouth === 'o') { g.fillStyle = '#6d2430'; g.beginPath(); g.ellipse(cx, my + 18, 36, 44, 0, 0, Math.PI * 2); g.fill(); g.stroke(); }
    else if (mouth === 'flat') { g.beginPath(); g.moveTo(cx - 55, my + 8); g.lineTo(cx + 55, my + 5); g.stroke(); }
    else if (mouth === 'wobbly') { g.beginPath(); g.moveTo(cx - 75, my + 12); for (let i = 0; i <= 6; i++) g.lineTo(cx - 75 + i * 25, my + 12 + (i % 2 ? -10 : 8)); g.stroke(); }
    else if (mouth === 'talk') openShape(55 + open * 25, 14 + open * 34, open > 0.5);
    faceTex.needsUpdate = true;
  }

  // ───────────── 動作 ─────────────
  // 狀態：parked（停在角落，沒有雲）、takeoff（雲冒出來、跳上去）、search（騰雲駕霧、手搭額頭眺望）、
  //       land（飛回來、雲散掉）、found（找到了：舉棒歡呼）、sorry（沒找到）、idle（站在雲上）、think、wave、fly
  let action = 'idle', actionT = 0, actionLoop = true;
  let cloudOn = true, cloudScale = 1, heading = 0;
  const emit = (name) => { try { opts.onSound && opts.onSound(name); } catch {} };
  const AUTO_EXPR = { found: 'happy', search: 'focused', think: 'focused', wave: 'wink', sorry: 'sorry', idle: 'confident', fly: 'confident', parked: 'confident', takeoff: 'surprised', land: 'confident' };
  const play = (name, loop) => {
    if (!SOUSOU_ACTIONS.includes(name) && !['parked', 'takeoff', 'land'].includes(name)) return;
    action = name; actionT = 0; actionLoop = loop ?? ['idle', 'search', 'fly', 'parked'].includes(name);
    if (AUTO_EXPR[name]) setExpression(AUTO_EXPR[name]);
    if (name === 'found') { burst(); emit('found'); }
    if (name === 'takeoff') { cloudOn = true; cloudScale = Math.min(cloudScale, 0.05); emit('poof'); setTimeout(() => emit('whoosh'), 380); }
    if (name === 'land') emit('land');
    if (name === 'parked') cloudOn = false;
    if (name === 'idle' || name === 'search' || name === 'fly') cloudOn = true;
  };
  const setExpression = (name) => { if (EXP[name]) { expr = name; drawFace(); } };
  const say = (ms = 1600) => { talk = ms / 1000; };
  /** 飛行方向：-1 往左、1 往右，角色會轉身並傾斜 */
  const setHeading = (h) => { heading = Math.max(-1, Math.min(1, h)); };

  const cur = {};
  const ease = (k, target, dt, speed = 8) => { const v = cur[k] ?? target; const n = v + (target - v) * Math.min(1, dt * speed); cur[k] = n; return n; };

  // 兩節手臂 IK：把手放到頭上的某一點（遮陽、摸下巴、抓頭）
  const UP_LEN = 0.4, LOW_LEN = 0.42;
  const _t = new THREE.Vector3(), _d = new THREE.Vector3(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion();
  const _qTarget = new THREE.Quaternion(), _e = new THREE.Euler();
  function solveArm(A, headPoint, pole) {
    head.updateMatrixWorld(true);
    _t.copy(headPoint); head.localToWorld(_t); torso.worldToLocal(_t);
    _d.copy(_t).sub(A.shoulder.position);
    const dist = _d.length();
    const reach = (UP_LEN + LOW_LEN) * 0.98;
    const stretch = Math.min(1.6, Math.max(1, dist / reach));
    const L1 = UP_LEN * stretch, L2 = LOW_LEN * stretch, D = Math.min(dist, (L1 + L2) * 0.999);
    const cosA = (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D);
    const a1 = Math.acos(Math.max(-1, Math.min(1, cosA)));
    const dir = _d.clone().normalize();
    // 手肘往 pole 方向彎
    const pl = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
    const upper = dir.clone().multiplyScalar(Math.cos(a1)).add(pl.clone().multiplyScalar(Math.sin(a1))); // 上臂方向
    // 肩膀局部座標：-Y 沿上臂，彎曲平面是 Y-Z（前臂往 +Z 彎）
    _y.copy(upper).negate();
    _z.copy(dir).sub(upper.clone().multiplyScalar(dir.dot(upper))).normalize();
    _x.crossVectors(_y, _z).normalize();
    _m.makeBasis(_x, _y, _z); _qTarget.setFromRotationMatrix(_m);
    const interior = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2))));
    return { q: _qTarget.clone(), elbow: -(Math.PI - interior), stretch };
  }
  const IK = {
    visor: { p: new THREE.Vector3(0.42, 0.34, 0.62), pole: new THREE.Vector3(1, -0.4, -0.1) }, // 手掌搭在右邊額頭上
    chin: { p: new THREE.Vector3(0.05, -0.55, 0.66), pole: new THREE.Vector3(1, -1, 0) },
    scratch: { p: new THREE.Vector3(0.5, 0.45, -0.3), pole: new THREE.Vector3(1, 0, 0.3) },
  };

  let last = performance.now(), raf = 0, destroyed = false, faceDirty = 0;
  function frame(now) {
    if (destroyed) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = now / 1000; actionT += dt;
    if (!actionLoop && actionT > (action === 'takeoff' ? 1.1 : action === 'land' ? 1.0 : 3.2)) {
      if (action === 'takeoff') play('search');
      else if (action === 'land') play(opts.afterLand || 'parked');
      else play(cloudOn ? 'idle' : 'parked');
    }

    let P = {
      bob: Math.sin(t * 1.6) * 0.06, lean: 0, rootRot: 0,
      headYaw: Math.sin(t * 0.5) * 0.15, headPitch: 0.02, headRoll: Math.sin(t * 0.7) * 0.04,
      Rz: 0.3, Rx: 0.05, Re: -0.3, Lz: -0.3, Lx: 0.05, Le: -0.3, Rhx: 0, Lhx: 0, Rhz: 0,
      kneel: 0.15, torsoTwist: 0, staffInHand: false, lookX: Math.sin(t * 0.5) * 0.5, lookY: 0, Rik: null, Lik: null,
    };
    const a = action, at = actionT;
    if (a === 'parked') {
      // 停在角落：站著、偶爾東張西望
      P = { ...P, bob: 0, kneel: 0.02, Lz: -0.75, Lx: 0.25, Le: -1.5, headYaw: Math.sin(t * 0.35) * 0.35, lookX: Math.sin(t * 0.35) * 0.8 };
    } else if (a === 'takeoff') {
      const j = Math.sin(Math.min(1, at / 0.55) * Math.PI);
      P = { ...P, bob: j * 0.55 + Math.max(0, at - 0.55) * 0.4, kneel: at < 0.2 ? 0.5 : 0.2, Rz: 0.9, Rx: -0.5, Lz: -0.9, Lx: -0.5, lookY: -0.3 };
    } else if (a === 'search') {
      // 騰雲駕霧：右手搭在額頭上眺望、左手叉腰，頭慢慢左右看
      const sweep = Math.sin(at * 0.9);
      P = { ...P, Rik: 'visor', Rhx: -0.2, Rhz: 1.35, Lz: -0.75, Lx: 0.25, Le: -1.5,
        headYaw: sweep * 0.55, headPitch: -0.06, headRoll: -sweep * 0.06, lean: 0.12, lookX: sweep, lookY: -0.35, torsoTwist: sweep * 0.12, kneel: 0.32,
        bob: Math.sin(t * 2.2) * 0.08 };
    } else if (a === 'land') {
      P = { ...P, bob: Math.max(0, 0.4 - at * 0.5), kneel: 0.4, Rz: 0.6, Lz: -0.6 };
    } else if (a === 'found') {
      const j = Math.sin(Math.min(1, at / 0.7) * Math.PI);
      P = { ...P, bob: j * 0.9, Rz: 0.3, Rx: -2.9, Re: -0.2, Lz: -0.9, Lx: -0.4, Le: -0.6, staffInHand: at < 2.6, headPitch: 0.15, lookY: -0.4, lookX: 0, kneel: 0.05 };
    } else if (a === 'think') {
      P = { ...P, Rik: 'chin', Rhx: 0.4, Lz: -0.75, Lx: 0.25, Le: -1.5, headRoll: 0.18, headYaw: -0.15, headPitch: 0.12, lookX: 0.6, lookY: -0.8 };
    } else if (a === 'wave') {
      P = { ...P, Rz: 1.2, Rx: -1.6, Re: -0.9 + Math.sin(at * 9) * 0.45, headRoll: 0.12, lookX: 0, lookY: 0 };
    } else if (a === 'sorry') {
      P = { ...P, Rik: 'scratch', Lz: -0.3, Lx: -0.4, Le: -1.2, headPitch: 0.3, headRoll: -0.1, headYaw: 0.1, lookY: 0.5, lookX: 0.2, lean: 0.08 };
    } else if (a === 'fly') {
      P = { ...P, lean: 0.35, rootRot: -0.12, Rz: 0.9, Rx: 0.7, Re: -0.3, Lz: -0.9, Lx: 0.7, Le: -0.3, kneel: 0.45, headPitch: -0.1, headYaw: 0.25, lookX: 0.8, lookY: -0.1, bob: Math.sin(t * 4) * 0.05 };
    }

    // 整體位置與轉向（飛行方向）
    root.position.y = ease('bob', P.bob, dt, 10) + 0.05;
    const hd = ease('heading', heading, dt, 4);
    root.rotation.y = hd * 0.55;
    root.rotation.z = ease('rootRot', P.rootRot, dt, 4) - hd * 0.12;
    rider.rotation.x = ease('lean', P.lean + Math.abs(hd) * 0.12, dt, 6);
    torso.rotation.y = ease('twist', P.torsoTwist, dt, 5);
    torso.rotation.x = Math.sin(t * 1.6) * 0.02;
    head.rotation.y = ease('hy', P.headYaw + hd * 0.3, dt, 5);
    head.rotation.x = ease('hp', P.headPitch, dt, 6);
    head.rotation.z = ease('hr', P.headRoll, dt, 6);
    const kn = ease('kneel', P.kneel, dt, 6);
    for (const s of [-1, 1]) { legs[s].leg.rotation.x = -kn * 0.6; legs[s].shin.rotation.x = kn * 1.1; }
    hips.position.y = 0.62 - kn * 0.12;

    // 手臂：一般姿勢用角度，遮陽／摸下巴／抓頭用 IK
    for (const s of [1, -1]) {
      const A = arms[s], k = s === 1 ? 'R' : 'L';
      const ikName = P[k + 'ik'];
      let qT, elbowT, stretchT = 1;
      if (ikName && IK[ikName]) {
        const pole = IK[ikName].pole.clone(); pole.x *= s;
        const pt = IK[ikName].p.clone(); pt.x *= s;
        const r = solveArm(A, pt, pole); qT = r.q; elbowT = r.elbow; stretchT = r.stretch;
      } else {
        _e.set(P[k + 'x'], 0, P[k + 'z'], 'ZXY'); qT = new THREE.Quaternion().setFromEuler(_e); elbowT = P[k + 'e'];
      }
      // 舉手時肩膀聳起一點
      A.shoulder.position.y = ease(k + 'sy', ikName ? 0.62 : 0.5, dt, 8);
      A.shoulder.quaternion.slerp(qT, Math.min(1, dt * 9));
      A.elbow.rotation.x = ease(k + 'e', elbowT, dt, 10);
      const st = ease(k + 'st', stretchT, dt, 8); A.shoulder.scale.setScalar(st);
      A.hand.rotation.x = ease(k + 'hx', P[k + 'hx'] || 0, dt, 10);
      A.hand.rotation.z = ease(k + 'hz', (P[k + 'hz'] || 0) * s, dt, 10);
    }
    backStaff.visible = !P.staffInHand; handStaff.visible = P.staffInHand;
    if (P.staffInHand) handStaff.rotation.z = Math.sin(at * 6) * 0.15;
    const lx = ease('lx', P.lookX, dt, 6), ly = ease('ly', P.lookY, dt, 6);

    // 雲：出現／消失（冒出來時有彈性）
    const cTarget = cloudOn ? 1 : 0;
    cloudScale += (cTarget - cloudScale) * Math.min(1, dt * (cloudOn ? 7 : 5));
    const wob = cloudOn ? 1 + Math.sin(t * 9) * 0.03 * Math.max(0, 1 - actionT) : 1;
    cloud.scale.set(cloudScale * wob, cloudScale * (2 - wob), cloudScale * wob);
    cloud.visible = cloudScale > 0.06;
    cloud.position.y = Math.sin(t * 1.6 + 0.6) * 0.04 - 0.02;
    cloud.children.forEach((c) => { if (c.geometry && c.geometry.type === 'TubeGeometry') c.rotation.z = -t * 0.8; });
    // 沒有雲時腳踩地（整隻往下一點）
    rider.position.y = (1 - cloudScale) * -0.05;

    // 尾巴、頭髮、飄帶擺動（飛的時候風比較大）
    tailGrp.rotation.z = Math.sin(t * 1.3) * 0.18; tailGrp.rotation.y = Math.sin(t * 0.9) * 0.15;
    const windy = a === 'fly' || a === 'search' ? 1.8 : 1;
    for (const rb of ribbons) {
      const p = rb.r.geometry.attributes.position, b = rb.base;
      for (let i = 0; i < p.count; i++) {
        const y = b[i * 3 + 1]; const d = -y;
        p.setX(i, b[i * 3] + rb.s * d * 0.35 + Math.sin(t * 5 * windy - d * 3 + rb.s) * 0.08 * d * windy - hd * d * 0.5);
        p.setZ(i, b[i * 3 + 2] - d * (0.5 + 0.2 * windy) + Math.sin(t * 4 * windy - d * 2.5) * 0.12 * d);
        p.setY(i, y * (windy > 1 ? 0.7 : 0.9));
      }
      p.needsUpdate = true; rb.r.geometry.computeVertexNormals();
    }
    speedLines.forEach((l) => { const on = a === 'fly' || (a === 'search' && Math.abs(hd) > 0.3); l.material.opacity = on ? 0.45 : Math.max(0, l.material.opacity - dt * 2); l.position.x = (hd >= 0 ? -1 : 1) * (3.5 - ((t * 9 + l.userData.off) % 7)); l.position.y = l.userData.y; });
    sweat.visible = a === 'sorry'; if (sweat.visible) sweat.position.y = 0.45 - ((at * 0.4) % 0.3);
    sparks.forEach((k) => { if (k.life <= 0) return; k.life -= dt / 1.2; k.v.y -= 5 * dt; k.s.position.addScaledVector(k.v, dt); k.s.scale.setScalar(0.25 * Math.sin(Math.max(0, k.life) * Math.PI)); if (k.life <= 0) k.s.visible = false; });

    if (blinkT > 0) { blinkT -= dt; if (blinkT <= 0) faceDirty = 1; }
    else if ((nextBlink -= dt) <= 0) { blinkT = 0.12; nextBlink = 2.5 + Math.random() * 3; faceDirty = 1; }
    if (talk > 0) { talk -= dt; faceDirty = 1; }
    if (Math.abs(look.x - lx) > 0.02 || Math.abs(look.y - ly) > 0.02) { look.x = lx; look.y = ly; faceDirty = 1; }
    if (faceDirty) { drawFace(); faceDirty = 0; }

    renderer.render(scene, camera);
  }

  function resize() {
    const w = canvas.clientWidth || 400, h = canvas.clientHeight || 400;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null; ro?.observe(canvas); resize();
  drawFace();
  play(opts.action || 'idle');
  if (opts.expression) setExpression(opts.expression);
  if (reduceMotion) { /* 減少動態：仍然顯示，但動作幅度由使用者觸發 */ }
  raf = requestAnimationFrame(frame);

  return {
    play, setExpression, say, setHeading,
    getAction: () => action,
    destroy() { destroyed = true; cancelAnimationFrame(raf); ro?.disconnect(); renderer.dispose(); },
  };
}
