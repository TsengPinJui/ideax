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
  camera.position.set(0, 1.72, 11.0);
  camera.lookAt(0, 1.45, 0);

  scene.add(new THREE.HemisphereLight(0xeef3ff, 0x2a3350, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(-3, 5, 6); scene.add(key);
  const rimL = new THREE.DirectionalLight(0x8fb0ff, 1.2); rimL.position.set(4, 3, -5); scene.add(rimL);

  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...o });
  const M = {
    fur: std(C.fur, { roughness: 0.9 }), furDark: std(C.furDark, { roughness: 0.9 }), skin: std(C.skin, { roughness: 0.7, envMapIntensity: 0.55 }),
    tunic: std(C.tunic, { roughness: 0.65 }), navy: std(C.navy, { roughness: 0.55 }), navyDark: std(C.navyDark, { roughness: 0.6 }),
    blue: new THREE.MeshPhysicalMaterial({ color: C.blue, roughness: 0.45, sheen: 1, sheenColor: new THREE.Color(0x9fb8ff), sheenRoughness: 0.4 }),
    blueDeep: std(0x152a78, { roughness: 0.5 }),
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
  // 交領：深藍領片＋金色滾邊（左右交叉成 V）
  for (const s of [-1, 1]) {
    const lap = new THREE.Group(); lap.position.set(0.1 * s, 0.34, 0.37); lap.rotation.set(0.2, 0, -0.42 * s); torso.add(lap);
    mesh(new THREE.BoxGeometry(0.12, 0.5, 0.03), M.navy, lap);
    mesh(new THREE.BoxGeometry(0.018, 0.5, 0.035), M.gold, lap, [0.065 * s, 0, 0.004]);
  }
  // 胸前金色小扣
  mesh(new THREE.SphereGeometry(0.035, 12, 10), M.gold, torso, [0, 0.16, 0.43]);
  // 下擺的深藍滾邊＋金線
  const hem = mesh(new THREE.CylinderGeometry(0.545, 0.565, 0.07, 40, 1, true), M.navy.clone(), torso, [0, -0.385, 0]); hem.material.side = THREE.DoubleSide;
  mesh(new THREE.TorusGeometry(0.542, 0.008, 6, 48), M.gold, torso, [0, -0.35, 0], [Math.PI / 2, 0, 0]);
  // 腰帶與金色圓扣
  mesh(new THREE.TorusGeometry(0.43, 0.06, 10, 40), M.navy, torso, [0, 0.03, 0], [Math.PI / 2, 0, 0]);
  mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 28), M.gold, torso, [0, 0.03, 0.46], [Math.PI / 2, 0, 0]);
  mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 20), M.navy, torso, [0, 0.03, 0.485]);
  mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 28), M.gold, torso, [0, 0.03, 0.48]);
  mesh(new THREE.SphereGeometry(0.03, 10, 8), M.gold, torso, [0, 0.03, 0.49]);
  // 腰帶上下的金線
  for (const dy of [-0.055, 0.055]) mesh(new THREE.TorusGeometry(0.445, 0.008, 6, 48), M.gold, torso, [0, 0.03 + dy, 0], [Math.PI / 2, 0, 0]);
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
    mesh(new THREE.TorusGeometry(0.096, 0.016, 6, 20), M.gold, elbow, [0, -0.25, 0], [Math.PI / 2, 0, 0]);
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
  const TS = 80, TR = 10;
  const tailGeo = new THREE.TubeGeometry(tailCurve, TS, 0.075, TR);
  {
    const pos = tailGeo.attributes.position; const col = [];
    const cRoot = new THREE.Color(0x9c7552), cTip = new THREE.Color(0xe9dccb), p = new THREE.Vector3(), c = new THREE.Vector3();
    for (let i = 0; i <= TS; i++) {
      const t = i / TS; tailCurve.getPointAt(t, c);
      const k = 1 - t * 0.45 + (t > 0.9 ? (t - 0.9) * 2.5 : 0);
      const color = cRoot.clone().lerp(cTip, Math.pow(t, 2.2));
      for (let j = 0; j <= TR; j++) {
        const idx = i * (TR + 1) + j; p.fromBufferAttribute(pos, idx).sub(c).multiplyScalar(k).add(c); pos.setXYZ(idx, p.x, p.y, p.z);
        col.push(color.r, color.g, color.b);
      }
    }
    tailGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); tailGeo.computeVertexNormals();
  }
  mesh(tailGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), tailGrp);

  // ── 頭 ──
  const neck = new THREE.Group(); neck.position.set(0, 0.7, 0); torso.add(neck);
  const head = new THREE.Group(); head.position.set(0, 0.64, 0.04); neck.add(head);
  mesh(new THREE.SphereGeometry(0.82, 48, 36), M.fur, head, [0, 0, 0], [0, 0, 0], [1.02, 0.96, 0.94]);
  // 臉頰毛
  const cheekGeo = new THREE.ConeGeometry(0.1, 0.32, 10, 3);
  { const pos = cheekGeo.attributes.position; const col = []; const a = new THREE.Color(C.furDark), b = new THREE.Color(0xf4f0ea);
    for (let i = 0; i < pos.count; i++) { const t = (pos.getY(i) + 0.16) / 0.32; const c = a.clone().lerp(b, t); col.push(c.r, c.g, c.b); }
    cheekGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); }
  const cheekMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  for (const s of [-1, 1]) {
    mesh(new THREE.SphereGeometry(0.24, 18, 14), M.fur, head, [0.6 * s, -0.34, 0.2], [0, 0, 0], [0.9, 0.78, 0.7]);
    [[0.72, -0.3, 0.22, -1.15, 0.0], [0.7, -0.42, 0.2, -1.6, 0.1], [0.62, -0.52, 0.22, -2.1, 0.2], [0.76, -0.18, 0.12, -0.8, -0.1]].forEach(([x, y, z, rz, rx]) => {
      mesh(cheekGeo, cheekMat, head, [x * s, y, z], [rx, 0, rz * -s]);
    });
  }
  // 耳朵
  const earInner = std(0xe8a08f, { roughness: 0.55 });
  for (const s of [-1, 1]) {
    const ear = new THREE.Group(); ear.position.set(0.84 * s, -0.04, 0.02); ear.rotation.y = 0.35 * s; head.add(ear);
    mesh(new THREE.SphereGeometry(0.27, 26, 18), M.skin, ear, [0.04 * s, 0, 0], [0, 0, 0], [0.42, 1, 0.92]);
    mesh(new THREE.TorusGeometry(0.2, 0.045, 10, 30), M.skin, ear, [0.1 * s, 0, 0], [0, Math.PI / 2, 0], [1, 1.2, 1.05]);
    mesh(new THREE.SphereGeometry(0.19, 22, 16), earInner, ear, [0.09 * s, -0.01, 0], [0, 0, 0], [0.3, 0.85, 0.75]);
    // 耳根的毛
    mesh(new THREE.SphereGeometry(0.14, 14, 10), M.fur, ear, [-0.04 * s, -0.12, -0.04], [0, 0, 0], [0.8, 1, 1]);
  }
  // 臉：畫在貼著頭部表面的曲面上（膚色臉、眼睛、眉毛、嘴巴都在這張圖）
  const faceCv = document.createElement('canvas'); faceCv.width = 1024; faceCv.height = 640;
  const fx = faceCv.getContext('2d');
  const faceTex = new THREE.CanvasTexture(faceCv); faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 8;
  // 臉的貼圖稍微壓暗、減少環境反光，膚色和眼睛才不會被打光洗白
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, color: 0xd6d6d6, transparent: true, roughness: 0.8, envMapIntensity: 0.45, depthWrite: false });
  const faceGeo = new THREE.SphereGeometry(0.83, 64, 40, Math.PI / 2 - 0.86, 1.72, 0.9, 1.2);
  const face = mesh(faceGeo, faceMat, head, [0, 0, 0], [0, 0, 0], [1.02, 0.96, 0.94]); face.renderOrder = 2;
  // 鼻吻（立體一點）

  // 頭髮：一束束往上翹的毛（米白→藍色髮尖）
  // 毛束：底部稍粗、尖端彎一點；兩種配色（米灰、藍色挑染）
  const makeHairGeo = (base, mid, tip) => {
    const geo = new THREE.ConeGeometry(0.17, 0.55, 10, 6);
    const pos = geo.attributes.position; const col = [];
    const cb = new THREE.Color(base), cm = new THREE.Color(mid), ct = new THREE.Color(tip);
    for (let i = 0; i < pos.count; i++) {
      const t = (pos.getY(i) + 0.275) / 0.55;
      pos.setZ(i, pos.getZ(i) - t * t * 0.1); // 尖端往後彎
      const c = t < 0.55 ? cb.clone().lerp(cm, t / 0.55) : cm.clone().lerp(ct, (t - 0.55) / 0.45);
      col.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
    return geo;
  };
  const hairGeo = makeHairGeo(0x9c938b, 0xd6cec5, 0xf4f0ea);
  const hairBlueGeo = makeHairGeo(0x9c938b, 0xc9d3ee, 0x3f6ae0);
  const hairMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
  const hairGrp = new THREE.Group(); head.add(hairGrp);
  const rng = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const tufts = [];
  for (let i = 0; i < 52; i++) {
    // 分布在頭頂與後腦（前額留給頭帶與瀏海）
    const theta = rng() * Math.PI * 2, phi = 0.05 + rng() * 0.95;
    const dir = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
    if (dir.z > 0.55 && dir.y < 0.75) continue;
    const len = 0.38 + rng() * 0.3;
    const w = 0.85 + rng() * 0.45;
    const t = mesh(rng() < 0.45 ? hairBlueGeo : hairGeo, hairMat, hairGrp, [dir.x * 0.68, dir.y * 0.66 + 0.12, dir.z * 0.62], [0, 0, 0], [w, len / 0.55, w]);
    const up = new THREE.Vector3(dir.x * 0.6, dir.y + 0.9, dir.z * 0.5 - 0.35).normalize();
    t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    tufts.push({ t, ph: rng() * 6 });
  }
  // 瀏海：從頭帶上方往上翹
  for (let i = -2; i <= 2; i++) {
    const t = mesh(i % 2 ? hairBlueGeo : hairGeo, hairMat, hairGrp, [i * 0.2, 0.52, 0.5 - Math.abs(i) * 0.06], [0, 0, 0], [0.95, 0.9, 0.95]);
    t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(i * 0.25, 1, 0.25).normalize());
    tufts.push({ t, ph: i });
  }
  // 頭帶與後腦的結
  const bandCv = document.createElement('canvas'); bandCv.width = 1024; bandCv.height = 96;
  {
    const g = bandCv.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, 96); bg.addColorStop(0, '#1b3a9e'); bg.addColorStop(0.5, '#2c55c9'); bg.addColorStop(1, '#16318a');
    g.fillStyle = bg; g.fillRect(0, 0, 1024, 96);
    // 上下車縫線
    g.strokeStyle = 'rgba(160,190,255,0.55)'; g.lineWidth = 3; g.setLineDash([10, 8]);
    for (const y of [12, 84]) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
    g.setLineDash([]);
    // 祥雲刺繡
    g.strokeStyle = 'rgba(12,28,90,0.75)'; g.lineWidth = 5; g.lineCap = 'round';
    for (let x = 32; x < 1024; x += 128) {
      g.beginPath(); g.arc(x, 50, 18, Math.PI * 0.2, Math.PI * 1.9); g.stroke();
      g.beginPath(); g.arc(x + 4, 50, 8, Math.PI * 1.1, Math.PI * 2.6); g.stroke();
      g.beginPath(); g.moveTo(x + 18, 54); g.quadraticCurveTo(x + 46, 30, x + 70, 50); g.quadraticCurveTo(x + 90, 66, x + 110, 46); g.stroke();
    }
  }
  const bandTex = new THREE.CanvasTexture(bandCv); bandTex.colorSpace = THREE.SRGBColorSpace; bandTex.wrapS = THREE.RepeatWrapping; bandTex.anisotropy = 8;
  const bandMat = new THREE.MeshPhysicalMaterial({ map: bandTex, roughness: 0.55, sheen: 1, sheenColor: new THREE.Color(0x9fb8ff), sheenRoughness: 0.5, side: THREE.DoubleSide });
  const band = mesh(new THREE.CylinderGeometry(0.84, 0.86, 0.17, 64, 1, true), bandMat, head, [0, 0.37, -0.02], [-0.2, 0, 0], [1.03, 1, 0.97]);
  for (const dy of [-0.085, 0.085]) mesh(new THREE.TorusGeometry(0.85, 0.014, 6, 64), M.blueDeep, head, [0, 0.37 + dy, -0.02 - dy * 0.2], [Math.PI / 2 - 0.2, 0, 0], [1.03, 0.97, 1]);
  const knot = new THREE.Group(); knot.position.set(0, 0.5, -0.76); head.add(knot);
  mesh(new THREE.SphereGeometry(0.1, 16, 12), M.blue, knot, [0, 0, 0], [0, 0, 0], [1.3, 1, 0.8]);
  for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.09, 14, 10), M.blue, knot, [0.13 * s, 0.02, -0.02], [0, 0, 0.6 * s], [1.4, 0.8, 0.7]);
  // 飄帶（會隨風擺動的兩條藍色緞帶）
  const ribbonMat = new THREE.MeshPhysicalMaterial({ color: 0x2549b8, roughness: 0.45, sheen: 1, sheenColor: new THREE.Color(0xa9c0ff), side: THREE.DoubleSide });
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
    confident: { brow: [-0.25, 0], lid: 0, mouth: 'smirk', blush: 0.3 },
    happy: { brow: [0.2, 6], lid: 0, closed: 'happy', mouth: 'grin', blush: 0.6 },
    angry: { brow: [-0.55, -6], lid: 0.25, mouth: 'shout', blush: 0.2 },
    surprised: { brow: [0.25, 14], lid: -0.1, mouth: 'o', blush: 0.3 },
    focused: { brow: [-0.3, -4], lid: 0.38, mouth: 'flat', blush: 0.2 },
    wink: { brow: [0.05, 4], lid: 0.08, closed: 'wink', mouth: 'smile', blush: 0.5 },
    sorry: { brow: [0.45, 4], lid: 0.2, mouth: 'wobbly', blush: 0.7 },
  };
  let expr = 'confident', blinkT = 0, nextBlink = 2.5, look = { x: 0, y: 0 }, talk = 0;
  const lerpN = (a, b, t) => a + (b - a) * t;

  // 臉部各部位（畫布座標）：眼睛中心高度、眼睛半徑、左右距離
  const FACE = { EY: 276, ER: 114, EX: 190 };
  const SKIN = '#f2bf98', SKIN_SHADE = '#dc9873', FUR = '#fbf2e8', FUR_DARK = '#e6dbcf'; // 臉部貼圖整體會被壓暗一點，毛色要調亮才會和頭上的毛一致
  // 臉的範圍：兩個眼窩＋下方鼻吻，連成桃心形
  const faceShapes = () => {
    const { EY, EX } = FACE, cx = faceCv.width / 2;
    return [[cx - EX, EY + 6, 200, 196], [cx + EX, EY + 6, 200, 196], [cx, 468, 246, 160]];
  };
  const inFace = (x, y, pad = 0) => faceShapes().some(([ex, ey, rx, ry]) => ((x - ex) / (rx - pad)) ** 2 + ((y - ey) / (ry - pad)) ** 2 <= 1);
  const facePath = (g) => { g.beginPath(); for (const [x, y, rx, ry] of faceShapes()) { g.moveTo(x + rx, y); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); } };
  // 臉緣的細毛（固定亂數，避免每次重畫都跳動）
  const furTufts = [];
  {
    let sd = 11; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (const [ex, ey, rx, ry] of [[512 - FACE.EX, FACE.EY + 6, 200, 196], [512 + FACE.EX, FACE.EY + 6, 200, 196], [512, 468, 246, 160]]) {
      for (let i = 0; i < 44; i++) {
        const a = (i / 44) * Math.PI * 2 + r() * 0.05;
        const x = ex + Math.cos(a) * rx, y = ey + Math.sin(a) * ry;
        const len = 10 + r() * 16, w = 6 + r() * 5, bend = (r() - 0.5) * 0.7, dark = r() < 0.2;
        // 只留在臉的外緣（落在其他部位裡面的點跳過）
        if (inFace(x, y, 3)) continue;
        furTufts.push({ x, y, a, len, w, bend, dark });
      }
    }
  }

  function drawEye(g, ex, ey, s, e) {
    const { ER } = FACE;
    const RY = ER * 1.08;
    const eyePath = () => { g.beginPath(); g.ellipse(ex, ey, ER, RY, 0, 0, Math.PI * 2); };
    // 眼白（上方有眼瞼的淡淡陰影）
    const wg = g.createLinearGradient(0, ey - RY, 0, ey + RY);
    wg.addColorStop(0, '#c9d3e8'); wg.addColorStop(0.32, '#f7f9ff'); wg.addColorStop(1, '#ffffff');
    g.fillStyle = wg; eyePath(); g.fill();
    g.save(); eyePath(); g.clip();
    const ix = ex + look.x * 30 + s * -4, iy = ey + 12 + look.y * 22;
    const IR = 84, IRY = 92;
    // 虹膜：深藍外圈 → 寶藍 → 下方透亮
    const gr = g.createRadialGradient(ix, iy + 34, 6, ix, iy, IRY);
    gr.addColorStop(0, '#b9d2ff'); gr.addColorStop(0.35, '#4f82ea'); gr.addColorStop(0.72, '#244fbf'); gr.addColorStop(1, '#0d1d5c');
    g.fillStyle = gr; g.beginPath(); g.ellipse(ix, iy, IR, IRY, 0, 0, Math.PI * 2); g.fill();
    // 虹膜放射紋
    g.strokeStyle = 'rgba(190,214,255,0.35)'; g.lineWidth = 3;
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * Math.PI * 2;
      g.beginPath(); g.moveTo(ix + Math.cos(a) * 46, iy + Math.sin(a) * 50); g.lineTo(ix + Math.cos(a) * (IR - 12), iy + Math.sin(a) * (IRY - 12)); g.stroke();
    }
    // 虹膜外緣深色環
    g.strokeStyle = 'rgba(8,16,60,0.85)'; g.lineWidth = 9; g.beginPath(); g.ellipse(ix, iy, IR - 4, IRY - 4, 0, 0, Math.PI * 2); g.stroke();
    // 瞳孔
    const pg = g.createRadialGradient(ix, iy, 4, ix, iy + 4, 46); pg.addColorStop(0, '#05081c'); pg.addColorStop(1, '#101b4d');
    g.fillStyle = pg; g.beginPath(); g.ellipse(ix, iy + 4, 38, 44, 0, 0, Math.PI * 2); g.fill();
    // 上眼瞼投在眼球上的陰影
    const sg = g.createLinearGradient(0, ey - RY, 0, ey - RY + 70); sg.addColorStop(0, 'rgba(20,24,60,0.45)'); sg.addColorStop(1, 'rgba(20,24,60,0)');
    g.fillStyle = sg; g.fillRect(ex - ER, ey - RY, ER * 2, 80);
    // 高光：左上大、右下小、再加一個星點
    g.fillStyle = '#fff';
    g.beginPath(); g.ellipse(ix - 30 * s - 4, iy - 34, 25, 30, -0.4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(ix + 30, iy + 34, 11, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 0.8; g.beginPath(); g.arc(ix - 4, iy - 52, 6, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    // 半闔的眼皮（專注、生氣時）
    const lid = e.lid;
    if (lid > 0) {
      const tilt = expr === 'angry' ? s * 30 : expr === 'sorry' ? -s * 22 : 0;
      g.fillStyle = SKIN;
      g.beginPath(); g.moveTo(ex - 140, ey - 160); g.lineTo(ex + 140, ey - 160);
      g.lineTo(ex + 140, ey - RY + lid * 250 - tilt); g.lineTo(ex - 140, ey - RY + lid * 250 + tilt); g.closePath(); g.fill();
    }
    g.restore();
    // 上睫毛線：粗、外眼角往外上勾
    const lidY = ey - RY + Math.max(0, lid) * 250;
    const tilt = lid > 0 ? (expr === 'angry' ? s * 30 : expr === 'sorry' ? -s * 22 : 0) : 0;
    g.fillStyle = '#1d1720';
    g.beginPath();
    if (lid > 0.05) {
      g.moveTo(ex - ER - 4, lidY + tilt); g.lineTo(ex + ER + 4, lidY - tilt);
      g.lineTo(ex + ER + 4, lidY - tilt + 18); g.lineTo(ex - ER - 4, lidY + tilt + 18); g.closePath(); g.fill();
    } else {
      const inner = -s, outer = s; // 內眼角、外眼角方向
      g.moveTo(ex + inner * (ER + 2), ey + 6);
      g.bezierCurveTo(ex + inner * ER * 0.95, ey - RY * 1.08, ex + outer * ER * 0.7, ey - RY * 1.2, ex + outer * (ER + 40), ey - RY * 0.78);
      g.lineTo(ex + outer * (ER + 6), ey - RY * 0.36);
      g.bezierCurveTo(ex + outer * ER * 0.55, ey - RY * 0.84, ex + inner * ER * 0.8, ey - RY * 0.7, ex + inner * (ER - 8), ey + 2);
      g.closePath(); g.fill();
    }
    // 雙眼皮摺線
    g.strokeStyle = 'rgba(150,92,70,0.55)'; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); g.ellipse(ex + s * 4, lidY + RY - 22 + tilt * 0.2, ER * 0.92, RY, 0, Math.PI * 1.2, Math.PI * 1.8); g.stroke();
    // 下睫毛（外眼角一小段）
    g.strokeStyle = 'rgba(60,40,45,0.6)'; g.lineWidth = 6;
    g.beginPath(); g.ellipse(ex, ey, ER - 2, RY - 2, 0, s > 0 ? Math.PI * 0.05 : Math.PI * 0.7, s > 0 ? Math.PI * 0.3 : Math.PI * 0.95); g.stroke();
  }

  function drawFace() {
    const W = faceCv.width, H = faceCv.height, g = fx;
    g.clearRect(0, 0, W, H);
    const e = EXP[expr] || EXP.confident;
    const cx = W / 2, { EY, EX } = FACE;
    // 膚色臉＋立體陰影
    g.save(); facePath(g); g.clip();
    const sk = g.createRadialGradient(cx, 380, 60, cx, 330, 470); sk.addColorStop(0, '#f8d2b2'); sk.addColorStop(0.55, SKIN); sk.addColorStop(1, SKIN_SHADE);
    g.fillStyle = sk; g.fillRect(0, 0, W, H);
    // 美人尖：額頭中間往下的一撮毛
    g.fillStyle = FUR;
    g.beginPath(); g.moveTo(cx - 92, 40); g.quadraticCurveTo(cx - 30, 120, cx, 196); g.quadraticCurveTo(cx + 30, 120, cx + 92, 40); g.closePath(); g.fill();
    g.strokeStyle = FUR_DARK; g.lineWidth = 5;
    for (const k of [-1, 0, 1]) { g.beginPath(); g.moveTo(cx + k * 34, 60); g.quadraticCurveTo(cx + k * 14, 120, cx + k * 4, 168); g.stroke(); }
    // 臉頰紅暈
    for (const s of [-1, 1]) {
      const bg = g.createRadialGradient(cx + s * 292, 446, 4, cx + s * 292, 446, 86);
      bg.addColorStop(0, `rgba(255,120,120,${0.55 * e.blush + 0.08})`); bg.addColorStop(1, 'rgba(255,120,120,0)');
      g.fillStyle = bg; g.beginPath(); g.ellipse(cx + s * 292, 446, 96, 60, 0, 0, Math.PI * 2); g.fill();
    }
    // 鼻吻的亮面
    const mz = g.createRadialGradient(cx, 470, 10, cx, 470, 170); mz.addColorStop(0, 'rgba(255,232,214,0.4)'); mz.addColorStop(1, 'rgba(255,236,220,0)');
    g.fillStyle = mz; g.beginPath(); g.ellipse(cx, 470, 200, 130, 0, 0, Math.PI * 2); g.fill();
    g.restore();
    // 臉緣的細描邊＋往內長的細毛（邊緣毛茸茸）
    g.lineCap = 'round';
    for (const t of furTufts) {
      g.strokeStyle = t.dark ? FUR_DARK : FUR; g.lineWidth = t.w;
      const ox = t.x + Math.cos(t.a) * 14, oy = t.y + Math.sin(t.a) * 14;
      const tx = t.x - Math.cos(t.a + t.bend) * t.len, ty = t.y - Math.sin(t.a + t.bend) * t.len;
      g.beginPath(); g.moveTo(ox, oy); g.quadraticCurveTo(t.x - Math.cos(t.a) * t.len * 0.4, t.y - Math.sin(t.a) * t.len * 0.4, tx, ty); g.stroke();
    }
    // 眼睛
    const blinking = blinkT > 0;
    for (const s of [-1, 1]) {
      const ex = cx + s * EX, ey = EY;
      const closed = blinking || e.closed === 'happy' || (e.closed === 'wink' && s === 1);
      if (closed) {
        g.strokeStyle = '#1d1720'; g.lineWidth = 20; g.lineCap = 'round';
        g.beginPath();
        if (e.closed === 'happy' || e.closed === 'wink') g.arc(ex, ey + 42, 82, Math.PI * 1.15, Math.PI * 1.85);
        else g.arc(ex, ey - 24, 92, Math.PI * 0.18, Math.PI * 0.82);
        g.stroke();
        // 外眼角睫毛
        g.lineWidth = 9; g.beginPath(); g.moveTo(ex + s * 72, ey + (e.closed ? -4 : 30)); g.lineTo(ex + s * 104, ey + (e.closed ? -24 : 16)); g.stroke();
        continue;
      }
      drawEye(g, ex, ey, s, e);
    }
    // 眉毛：粗、深色、往內下壓的劍眉，尾端收細
    const [ang, raise] = e.brow;
    for (const s of [-1, 1]) {
      const bx = cx + s * (EX + 6), by = EY - 150 - raise * 3;
      g.save(); g.translate(bx, by); g.rotate(-ang * s); g.scale(s * 1.15, 1.2);
      // s=1 時右眉：內側在左（-x）
      g.fillStyle = '#3b2c27';
      g.beginPath(); g.moveTo(-100, 30); g.quadraticCurveTo(-100, -16, -40, -22); g.quadraticCurveTo(40, -28, 110, -4);
      g.quadraticCurveTo(50, 4, -10, 12); g.quadraticCurveTo(-60, 16, -100, 30); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(120,96,86,0.7)'; g.lineWidth = 3;
      for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(-80 + k * 30, 10 - k * 2); g.lineTo(-58 + k * 30, -10 - k * 2); g.stroke(); }
      g.restore();
    }
    // 鼻子：小小的倒三角猴鼻＋鼻孔＋高光，下方淡陰影
    const ny = 440;
    g.save(); g.translate(cx, ny); g.scale(1.35, 1.35); g.translate(-cx, -ny);
    g.fillStyle = 'rgba(170,100,80,0.25)'; g.beginPath(); g.ellipse(cx, ny + 30, 44, 14, 0, 0, Math.PI * 2); g.fill();
    const ng = g.createLinearGradient(0, ny - 24, 0, ny + 22); ng.addColorStop(0, '#c98270'); ng.addColorStop(1, '#8e4b3c');
    g.fillStyle = ng; g.beginPath(); g.moveTo(cx - 40, ny - 14); g.quadraticCurveTo(cx, ny - 30, cx + 40, ny - 14); g.quadraticCurveTo(cx + 34, ny + 18, cx, ny + 24); g.quadraticCurveTo(cx - 34, ny + 18, cx - 40, ny - 14); g.fill();
    g.fillStyle = '#5b2f2a';
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * 14, ny + 8, 8, 6, s * 0.4, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(cx - 10, ny - 12, 12, 6, -0.2, 0, Math.PI * 2); g.fill();
    g.restore();
    // 人中
    g.strokeStyle = 'rgba(176,112,90,0.6)'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx, ny + 40); g.lineTo(cx, 508); g.stroke();
    // 嘴巴
    const my = 528; const open = talk > 0 ? 0.35 + Math.abs(Math.sin(performance.now() / 70)) * 0.65 : 0;
    g.strokeStyle = '#5a2a26'; g.lineWidth = 14; g.lineCap = 'round';
    const mouth = talk > 0 && (e.mouth === 'smirk' || e.mouth === 'flat' || e.mouth === 'smile') ? 'talk' : e.mouth;
    const openShape = (w, h, tongue = true) => {
      g.fillStyle = '#6d2430'; g.beginPath(); g.moveTo(cx - w, my); g.quadraticCurveTo(cx, my + h * 2, cx + w, my); g.closePath(); g.fill();
      if (tongue) { g.fillStyle = '#ef7d86'; g.beginPath(); g.ellipse(cx, my + h * 0.95, w * 0.5, h * 0.42, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(cx - w * 0.72, my + 2); g.lineTo(cx + w * 0.72, my + 2); g.lineTo(cx + w * 0.6, my + 14); g.lineTo(cx - w * 0.6, my + 14); g.fill();
      g.stroke();
    };
    const lowerLip = (w, y) => { g.save(); g.strokeStyle = 'rgba(200,110,100,0.45)'; g.lineWidth = 6; g.beginPath(); g.moveTo(cx - w, y); g.quadraticCurveTo(cx, y + 12, cx + w, y); g.stroke(); g.restore(); };
    if (mouth === 'smirk') {
      g.beginPath(); g.moveTo(cx - 72, my + 4); g.quadraticCurveTo(cx + 10, my + 38, cx + 80, my - 16); g.stroke();
      g.lineWidth = 7; g.beginPath(); g.moveTo(cx + 74, my - 24); g.quadraticCurveTo(cx + 88, my - 14, cx + 84, my - 2); g.stroke(); // 酒窩
      lowerLip(30, my + 36);
    } else if (mouth === 'smile') { g.beginPath(); g.moveTo(cx - 82, my - 8); g.quadraticCurveTo(cx, my + 52, cx + 82, my - 8); g.stroke(); lowerLip(30, my + 42); }
    else if (mouth === 'grin') openShape(108, 58);
    else if (mouth === 'shout') {
      g.fillStyle = '#6d2430'; g.beginPath(); g.moveTo(cx - 84, my + 6); g.quadraticCurveTo(cx, my - 30, cx + 84, my + 6); g.quadraticCurveTo(cx + 70, my + 90, cx, my + 92); g.quadraticCurveTo(cx - 70, my + 90, cx - 84, my + 6); g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.fillRect(cx - 52, my - 10, 104, 14);
      g.fillStyle = '#ef7d86'; g.beginPath(); g.ellipse(cx, my + 66, 40, 18, 0, 0, Math.PI * 2); g.fill();
    }
    else if (mouth === 'o') { g.fillStyle = '#6d2430'; g.beginPath(); g.ellipse(cx, my + 18, 34, 42, 0, 0, Math.PI * 2); g.fill(); g.stroke(); }
    else if (mouth === 'flat') { g.beginPath(); g.moveTo(cx - 52, my + 8); g.quadraticCurveTo(cx, my + 14, cx + 52, my + 4); g.stroke(); lowerLip(24, my + 28); }
    else if (mouth === 'wobbly') { g.beginPath(); g.moveTo(cx - 72, my + 12); for (let i = 0; i <= 6; i++) g.lineTo(cx - 72 + i * 24, my + 12 + (i % 2 ? -9 : 8)); g.stroke(); }
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

    try {
      const gl = renderer.getContext();
      if (gl && !gl.isContextLost()) {
        renderer.render(scene, camera);
      }
    } catch {}
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
