// @ts-nocheck
/* IdeaX 燈泡吉祥物 3D 引擎（three.js）
 * 果凍軟體物理（3×3×3 Bezier 自由變形晶格）、拖曳甩動、情緒、臉部即時繪製。
 * 由 JellyMascot.tsx 延遲載入，不影響首頁初始載入。
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export type MascotMood = 'idle' | 'happy' | 'sad' | 'think' | 'dizzy' | 'scared' | 'shy' | 'wow';
export interface MascotTuning { k: number; damp: number; amp: number }
export interface MascotEngineOptions {
  root: HTMLElement; shadow: HTMLElement; bubble: HTMLElement; bubbleText: HTMLElement;
  glow: HTMLElement; rays: Element; alarm: HTMLElement; puddle: HTMLElement; drops: HTMLElement; pool: HTMLElement;
  tuning?: Partial<MascotTuning>; bubbleDefault?: string;
  getInsets?: () => { bottom: number; right: number };
  /** impact 會帶撞擊速度（px/s）；scared 進入驚嚇；zap 驚嚇中燈光閃一下 */
  onEvent?: (type: 'click' | 'drag' | 'comfort' | 'dropped' | 'glow' | 'scared' | 'calm' | 'zap' | 'impact', data?: number) => void;
}
export interface MascotStage { x: number; y: number; lean?: number; look?: 'around' }
export interface MascotEngine {
  setMood(m: MascotMood, ms?: number): void; say(text: string, ms?: number): void; jump(p?: number): void;
  cheer(text?: string): void; sad(text?: string): void;
  /** 驚喜：燈泡亮起、睜大眼睛、嘴巴張成 O（例如有新提案時） */
  surprise(text?: string, ms?: number): void; embarrassed(text?: string): void; think(on: boolean): void; wave(text?: string): void;
  /** 波浪舞：雙手流暢波浪律動、身體歡樂扭動跳躍 */
  waveDance(text?: string, ms?: number): void;
  poke(): void; shake(): void; setTuning(t: Partial<MascotTuning>): void; setBubbleDefault(t: string): void;
  enterFrom(): void; getMood(): MascotMood; refreshInsets(): void; destroy(): void;
  /** 舞台走位：指定站位（null 回到右下角）；teleport 直接瞬移（藏在對話框後面時用） */
  stage(target: MascotStage | null, teleport?: boolean): void;
  /** 說話嘴型，持續 ms 毫秒 */
  talk(ms: number): void;
  /** 果凍啵一下（正值往右、負值往左） */
  pop(k: number): void;
  /** 壓扁蓄力（正值壓扁） */
  squash?(k: number): void;
  /** 取消站位並受重力掉回地面（例如對話框關閉時） */
  drop(): void;
  size(): { w: number; h: number; foot: number };
}

export function createMascotEngine(o: MascotEngineOptions): MascotEngine {

  const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { root: el, shadow: shadowEl, bubble, bubbleText, glow: glowEl, rays: raysEl, alarm: alarmEl, puddle: puddleEl, drops: dropsEl, pool: poolEl } = o;
  const JELLY = { k: 120, damp: 2.6, amp: 0.9, ...(o.tuning || {}) };
  let destroyed = false, rafId = 0;
  const cleanups = [];
  const on = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); cleanups.push(() => target.removeEventListener(type, fn, opts)); };
  const later = (fn, ms) => { const t = setTimeout(() => { if (!destroyed) fn(); }, ms); cleanups.push(() => clearTimeout(t)); };
  const emit = (type, data) => { try { o.onEvent && o.onEvent(type, data); } catch {} };
  let insets = { bottom: 14, right: 6 };
  const readInsets = () => { try { const v = o.getInsets && o.getInsets(); if (v) insets = { bottom: Math.max(8, v.bottom), right: Math.max(4, v.right) }; } catch {} };
  readInsets();

  // ───────────── 3D 場景 ─────────────
  const canvas = document.createElement('canvas');
  el.appendChild(canvas);
  canvas.className = 'ixm-canvas';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(2.5, Math.max(1.5, devicePixelRatio || 1)));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, 180 / 240, 0.1, 50);
  // 畫布比燈泡本體大 PAD 倍（四周留透明空間），探頭、舉手、躺下、被拉長時才不會被裁掉；鏡頭等比拉遠，畫面上的大小不變
  camera.position.set(0, 0.888, 14.1);
  camera.lookAt(0, 0.888, 0);

  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x5a4a30, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-3, 4, 5); scene.add(key);
  const rimLight = new THREE.DirectionalLight(0xfff0c0, 0.8); rimLight.position.set(3, 2, -4); scene.add(rimLight);

  // pivot：腳底（燈座尖端），擠壓與傾斜都以這裡為支點
  const pivot = new THREE.Group(); pivot.position.set(0, -1.38, 0); scene.add(pivot);
  // jelly：剪切變形層，讓身體像果凍一樣晃動（頭部會比腳慢半拍）
  const jelly = new THREE.Group(); pivot.add(jelly);
  const model = new THREE.Group(); model.position.y = 0.95; jelly.add(model);
  const fixedFx = new THREE.Group(); fixedFx.position.y = 0.95; jelly.add(fixedFx); // 不跟著轉身的反光

  // ───────────── 果凍軟體：3×3×3 控制點晶格（Bezier 自由變形），最底層固定在燈座 ─────────────
  // 玻璃、臉、燈絲都在 GPU 上跟著晶格變形；手臂在 JS 端跟著變形，所以整顆燈泡像一塊果凍。
  const NODES = 27, LX = 1.15, LY0 = 0.95, LH = 2.3;
  const ffdU = { uD: { value: Array.from({ length: NODES }, () => new THREE.Vector3()) }, uYaw: { value: 0 }, uVol: { value: 0 } };
  const nd = ffdU.uD.value, nv = Array.from({ length: NODES }, () => new THREE.Vector3());
  const layerOf = (n) => Math.floor(n / 3) % 3;
  const nbrs = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) {
    const l = []; for (const [a, b, c] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) { const I = i + a, J = j + b, K = k + c; if (I >= 0 && I < 3 && J >= 0 && J < 3 && K >= 0 && K < 3) l.push(I * 9 + J * 3 + K); }
    nbrs.push(l);
  }
  const clamp01 = (t) => Math.min(1, Math.max(0, t));
  const bern = (t) => [(1 - t) * (1 - t), 2 * t * (1 - t), t * t];
  function ffdWeights(p, out) {
    const bu = bern(clamp01((p.x + LX) / (2 * LX))), bv = bern(clamp01((p.y - LY0) / LH)), bw = bern(clamp01((p.z + LX) / (2 * LX)));
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) out[i * 9 + j * 3 + k] = bu[i] * bv[j] * bw[k];
    return out;
  }
  const _w = new Float32Array(NODES), _pj = new THREE.Vector3(), _dj = new THREE.Vector3(), _dm = new THREE.Vector3();
  function ffdDisp(pj, out) {
    ffdWeights(pj, _w); out.set(0, 0, 0); for (let n = 0; n < NODES; n++) out.addScaledVector(nd[n], _w[n]);
    const vv = clamp01((pj.y - LY0) / LH); out.x -= pj.x * ffdU.uVol.value * vv; out.z -= pj.z * ffdU.uVol.value * vv; return out;
  }
  function deformModelPoint(p, k = 1) {
    const c = Math.cos(model.rotation.y), s = Math.sin(model.rotation.y);
    _pj.set(c * p.x + s * p.z, p.y + 0.95, -s * p.x + c * p.z); ffdDisp(_pj, _dj);
    _dm.set(c * _dj.x - s * _dj.z, _dj.y, s * _dj.x + c * _dj.z); return p.addScaledVector(_dm, k);
  }
  const FFD_GLSL = `
  uniform vec3 uD[27]; uniform float uYaw; uniform float uVol; uniform float uOffY;
  vec3 ffdDisp(vec3 q) {
    vec3 t = clamp(vec3((q.x + 1.15) / 2.3, (q.y - 0.95) / 2.3, (q.z + 1.15) / 2.3), 0.0, 1.0); vec3 r = 1.0 - t;
    float bx[3] = float[3](r.x * r.x, 2.0 * t.x * r.x, t.x * t.x);
    float by[3] = float[3](r.y * r.y, 2.0 * t.y * r.y, t.y * t.y);
    float bz[3] = float[3](r.z * r.z, 2.0 * t.z * r.z, t.z * t.z);
    vec3 d = vec3(0.0);
    for (int i = 0; i < 3; i++) for (int j = 0; j < 3; j++) for (int k = 0; k < 3; k++) d += bx[i] * by[j] * bz[k] * uD[i * 9 + j * 3 + k];
    d.xz -= q.xz * uVol * t.y;
    return d;
  }
  vec3 ffdPos(vec3 p) {
    vec3 m = p + vec3(0.0, uOffY, 0.0); float c = cos(uYaw), s = sin(uYaw);
    vec3 d = ffdDisp(vec3(c * m.x + s * m.z, m.y + 0.95, -s * m.x + c * m.z));
    return p + vec3(c * d.x - s * d.z, d.y, s * d.x + c * d.z);
  }`;
  const FFD_NORMAL = `vec3 objectNormal = vec3( normal );
  { vec3 n0 = normalize(normal); vec3 t1 = normalize(abs(n0.y) < 0.95 ? cross(n0, vec3(0.0, 1.0, 0.0)) : cross(n0, vec3(1.0, 0.0, 0.0))); vec3 t2 = cross(n0, t1);
    vec3 p0 = ffdPos(position); vec3 nn = cross(ffdPos(position + t1 * 0.02) - p0, ffdPos(position + t2 * 0.02) - p0);
    if (length(nn) > 1e-8) { nn = normalize(nn); objectNormal = dot(nn, n0) < 0.0 ? -nn : nn; } }
  #ifdef USE_TANGENT
    vec3 objectTangent = vec3( tangent.xyz );
  #endif`;
  function softify(mat, offY, yawU = ffdU.uYaw) {
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { uD: ffdU.uD, uYaw: yawU, uVol: ffdU.uVol, uOffY: { value: offY } });
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + FFD_GLSL)
        .replace('#include <beginnormal_vertex>', FFD_NORMAL)
        .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = ffdPos(position);');
    };
    mat.customProgramCacheKey = () => `ffd-${offY}-${yawU === ffdU.uYaw ? 'yaw' : 'fixed'}`;
  }
  let grab = null;
  function softStep(dt, ax, ay) {
    const kH = JELLY.k, kN = JELLY.k * 0.46, damp = JELLY.damp, kG = 900, h = dt / 2;
    for (let step = 0; step < 2; step++) {
      let gx = 0, gy = 0, gz = 0;
      if (grab) for (let n = 0; n < NODES; n++) { gx += grab.w[n] * nd[n].x; gy += grab.w[n] * nd[n].y; gz += grab.w[n] * nd[n].z; }
      for (let n = 0; n < NODES; n++) {
        const L = layerOf(n); if (L === 0) continue;
        const d = nd[n], v = nv[n], hw = L / 2 * JELLY.amp;
        let fx = -kH * d.x - damp * v.x - ax * hw, fy = -kH * d.y - damp * v.y - ay * hw, fz = -kH * d.z - damp * v.z;
        for (const m of nbrs[n]) { fx += kN * (nd[m].x - d.x); fy += kN * (nd[m].y - d.y); fz += kN * (nd[m].z - d.z); }
        if (grab) { const g = kG * grab.w[n] / grab.wmax; fx += g * (grab.target.x - gx); fy += g * (grab.target.y - gy); fz += g * (grab.target.z - gz); }
        v.x += fx * h; v.y += fy * h; v.z += fz * h; d.addScaledVector(v, h);
        if (d.length() > 0.85) d.setLength(0.85);
      }
    }
    let top = 0; for (let n = 0; n < NODES; n++) if (layerOf(n) === 2) top += nd[n].y;
    ffdU.uVol.value = THREE.MathUtils.clamp(top / 9 / LH * 0.8, -0.2, 0.16);
  }
  function poke(pj, strength) {
    const w = ffdWeights(pj, new Float32Array(NODES)); const wmax = Math.max(...w);
    const nrm = pj.clone().sub(new THREE.Vector3(0, 0.95 + 1.25, 0)).normalize();
    for (let n = 0; n < NODES; n++) if (layerOf(n) > 0) nv[n].addScaledVector(nrm, -strength * w[n] / wmax);
  }

  // 玻璃燈泡（旋轉體）
  const glassPts = [];
  for (let i = 0; i <= 64; i++) { const t = (i / 64) * 2.25; glassPts.push(new THREE.Vector2(Math.sin(t) * 1.0, 1.25 + Math.cos(t) * 1.0)); }
  const last = glassPts[glassPts.length - 1];
  for (let i = 1; i <= 16; i++) { const t = i / 16; glassPts.push(new THREE.Vector2(THREE.MathUtils.lerp(last.x, 0.47, t) - Math.sin(t * Math.PI) * 0.06, THREE.MathUtils.lerp(last.y, 0.05, t))); }
  glassPts.reverse();
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffe795, roughness: 0.025, metalness: 0, transmission: 0.82, thickness: 1.1, ior: 1.4,
    clearcoat: 1, clearcoatRoughness: 0.02, specularIntensity: 1, attenuationColor: new THREE.Color(0xffa400), attenuationDistance: 1.05,
    emissive: new THREE.Color(0xffb300), emissiveIntensity: 0.1, transparent: true, opacity: 0.97, side: THREE.DoubleSide,
  });
  const glass = new THREE.Mesh(new THREE.LatheGeometry(glassPts, 96), glassMat);
  model.add(glass);
  softify(glassMat, 0);
  // 菲涅耳邊緣：玻璃邊緣較厚 → 琥珀色描邊＋內側一圈亮光，讓輪廓在淺色背景上也清楚
  const rimU = { uStrength: { value: 1 }, uEdge: { value: new THREE.Color(0xc96f00) }, uSheen: { value: new THREE.Color(0xfff7dc) } };
  const rimMat = new THREE.ShaderMaterial({
    uniforms: { uD: ffdU.uD, uYaw: ffdU.uYaw, uVol: ffdU.uVol, uOffY: { value: 0 }, ...rimU },
    vertexShader: FFD_GLSL + `
      varying vec3 vN; varying vec3 vV;
      void main() { vec3 p = ffdPos(position); vec4 mv = modelViewMatrix * vec4(p, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      uniform float uStrength; uniform vec3 uEdge; uniform vec3 uSheen; varying vec3 vN; varying vec3 vV;
      void main() {
        float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
        float edge = smoothstep(0.62, 0.98, f), sheen = smoothstep(0.25, 0.6, f) * (1.0 - edge);
        vec3 col = mix(uSheen, uEdge, edge);
        gl_FragColor = vec4(col, (edge * 0.55 + sheen * 0.16) * uStrength);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false,
  });
  const rim = new THREE.Mesh(glass.geometry, rimMat); rim.renderOrder = 4; rim.scale.setScalar(1.004); model.add(rim);

  // 柔和光核（貼圖光暈，比實心球自然）
  function radialTex(stops, sz = 256) {
    const cv = document.createElement('canvas'); cv.width = cv.height = sz; const c = cv.getContext('2d');
    const g = c.createRadialGradient(sz / 2, sz / 2, 0, sz / 2, sz / 2, sz / 2); for (const [o, col] of stops) g.addColorStop(o, col);
    c.fillStyle = g; c.fillRect(0, 0, sz, sz); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const coreMat = new THREE.SpriteMaterial({ map: radialTex([[0, 'rgba(255,255,235,1)'], [0.25, 'rgba(255,236,160,0.85)'], [0.6, 'rgba(255,200,60,0.25)'], [1, 'rgba(255,190,40,0)']]), transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false });
  const core = new THREE.Sprite(coreMat); core.position.set(0, 1.12, 0); core.scale.setScalar(1.6); core.renderOrder = 1; model.add(core);
  const bulbLight = new THREE.PointLight(0xffc240, 0.6, 6, 2); bulbLight.position.set(0, 1.2, 0.2); model.add(bulbLight);

  // 玻璃芯柱、導線、螺旋燈絲
  const stemMat = new THREE.MeshPhysicalMaterial({ color: 0xfff6dc, roughness: 0.15, clearcoat: 1, emissive: new THREE.Color(0xffe2a0), emissiveIntensity: 0.15 });
  const stemPts = [[0.28, 0.04], [0.25, 0.1], [0.16, 0.22], [0.1, 0.36], [0.085, 0.6], [0.11, 0.7], [0.0, 0.74]].map(([x, y]) => new THREE.Vector2(x, y));
  model.add(new THREE.Mesh(new THREE.LatheGeometry(stemPts, 32), stemMat));
  const wireMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, metalness: 0.8, roughness: 0.35 });
  const filMat = new THREE.MeshStandardMaterial({ color: 0xc98a00, emissive: new THREE.Color(0xffc040), emissiveIntensity: 0.3, roughness: 0.4 });
  for (const sx of [-1, 1]) {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0.05 * sx, 0.68, 0), new THREE.Vector3(0.16 * sx, 0.86, 0), new THREE.Vector3(0.3 * sx, 1.06, 0)]);
    model.add(new THREE.Mesh(new THREE.TubeGeometry(c, 16, 0.014, 6), wireMat));
  }
  { const c = new THREE.LineCurve3(new THREE.Vector3(0, 0.7, 0), new THREE.Vector3(0, 1.3, 0.02)); model.add(new THREE.Mesh(new THREE.TubeGeometry(c, 4, 0.01, 6), wireMat)); }
  class CoilCurve extends THREE.Curve {
    getPoint(t, out = new THREE.Vector3()) {
      const x = THREE.MathUtils.lerp(-0.3, 0.3, t), y = 1.06 + Math.sin(Math.PI * t) * 0.24, a = t * Math.PI * 2 * 16, r = 0.032 * Math.sin(Math.PI * Math.min(1, t * 12, (1 - t) * 12));
      return out.set(x, y + Math.cos(a) * r, Math.sin(a) * r);
    }
  }
  model.add(new THREE.Mesh(new THREE.TubeGeometry(new CoilCurve(), 480, 0.011, 6), filMat));
  softify(stemMat, 0); softify(wireMat, 0); softify(filMat, 0);

  // 金屬燈座：連續螺紋、頂部環、黑色絕緣層、黃銅接點
  const baseGrp = new THREE.Group(); baseGrp.scale.set(0.78, 1, 0.78); model.add(baseGrp);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x8c8c96, metalness: 0.85, roughness: 0.27 });
  const bodyPts = [[0.5, -0.7], [0.545, -0.69], [0.545, 0.0], [0.6, 0.02], [0.6, 0.08], [0.52, 0.09]].map(([x, y]) => new THREE.Vector2(x, y));
  baseGrp.add(new THREE.Mesh(new THREE.LatheGeometry(bodyPts, 64), baseMat));
  class HelixCurve extends THREE.Curve {
    getPoint(t, out = new THREE.Vector3()) { const a = t * Math.PI * 2 * 4.6, y = -0.64 + t * 0.6; return out.set(Math.cos(a) * 0.55, y, Math.sin(a) * 0.55); }
  }
  baseGrp.add(new THREE.Mesh(new THREE.TubeGeometry(new HelixCurve(), 300, 0.05, 10), baseMat));
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.585, 0.04, 12, 64), baseMat); collar.rotation.x = Math.PI / 2; collar.position.y = 0.06; baseGrp.add(collar);
  const insPts = [[0.5, -0.69], [0.47, -0.76], [0.36, -0.82], [0.22, -0.85], [0, -0.85]].map(([x, y]) => new THREE.Vector2(x, y));
  baseGrp.add(new THREE.Mesh(new THREE.LatheGeometry(insPts, 48), new THREE.MeshPhysicalMaterial({ color: 0x17171b, roughness: 0.18, clearcoat: 1 })));
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.17, 32, 16), new THREE.MeshStandardMaterial({ color: 0xd2a94a, metalness: 0.9, roughness: 0.25 }));
  tip.position.y = -0.87; tip.scale.y = 0.45; baseGrp.add(tip);

  // 玻璃上的主光反射（固定朝向鏡頭，像真的打光）
  const hlCanvas = document.createElement('canvas'); hlCanvas.width = 256; hlCanvas.height = 256;
  { const c = hlCanvas.getContext('2d');
    c.filter = 'blur(3px)';
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 16; c.lineCap = 'round';
    c.beginPath(); c.arc(150, 150, 96, Math.PI * 1.08, Math.PI * 1.42); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.ellipse(92, 160, 9, 12, -0.3, 0, Math.PI * 2); c.fill();
    c.filter = 'blur(10px)'; c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(110, 100, 46, 26, -0.6, 0, Math.PI * 2); c.fill(); }
  const hlTex = new THREE.CanvasTexture(hlCanvas); hlTex.colorSpace = THREE.SRGBColorSpace;
  const hlMat = new THREE.MeshBasicMaterial({ map: hlTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.75 });
  const hl = new THREE.Mesh(new THREE.SphereGeometry(1.03, 32, 24, Math.PI / 2 - 1.25, 1.4, 0.25, 1.15), hlMat);
  hl.position.y = 1.25; hl.renderOrder = 3; fixedFx.add(hl); softify(hlMat, 1.25, { value: 0 });

  // 臉：畫在貼著玻璃表面的曲面貼圖上，跟著燈泡一起轉，轉到背面自然看不到
  const faceCanvas = document.createElement('canvas'); faceCanvas.width = 1024; faceCanvas.height = 768;
  const fctx = faceCanvas.getContext('2d');
  const faceTex = new THREE.CanvasTexture(faceCanvas); faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 8;
  const faceMat = new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, depthWrite: false });
  const faceGeo = new THREE.SphereGeometry(1.012, 64, 40, Math.PI / 2 - 0.95, 1.9, 0.7, 1.2);
  softify(faceMat, 1.25);
  const faceMesh = new THREE.Mesh(faceGeo, faceMat); faceMesh.position.y = 1.25; faceMesh.renderOrder = 2; model.add(faceMesh);

  // 手臂（橡膠管）與卡通手套
  const armMat = new THREE.MeshPhysicalMaterial({ color: 0xffbb22, roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.2 });
  const gloveMat = new THREE.MeshPhysicalMaterial({ color: 0xfbfaf6, roughness: 0.62, sheen: 1, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.45, clearcoat: 0.15 });
  const seamMat = new THREE.MeshStandardMaterial({ color: 0xc9c4b8, roughness: 0.8 });
  function makeGlove() {
    const g = new THREE.Group();
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.16, 28, 20), gloveMat); palm.scale.set(1, 0.92, 0.6); g.add(palm);
    [[-0.095, 0.19, 0.22], [0, 0.215, 0.02], [0.092, 0.19, -0.2]].forEach(([x, y, rz]) => {
      const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.056, 0.13, 6, 14), gloveMat); f.position.set(x, y, 0.01); f.rotation.set(0.12, 0, rz); g.add(f);
    });
    const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.056, 0.09, 6, 14), gloveMat); th.position.set(-0.16, 0.03, 0.05); th.rotation.set(0.3, 0, 1.0); g.add(th);
    for (const x of [-0.045, 0.045]) { const s = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.11, 2, 6), seamMat); s.position.set(x, 0.02, -0.092); g.add(s); }
    const cuffPts = [[0.1, -0.12], [0.145, -0.15], [0.16, -0.2], [0.15, -0.25], [0.11, -0.26]].map(([x, y]) => new THREE.Vector2(x, y));
    g.add(new THREE.Mesh(new THREE.LatheGeometry(cuffPts, 24), gloveMat));
    g.scale.setScalar(1.3); model.add(g); return g;
  }
  const shoulderGeo = new THREE.SphereGeometry(0.1, 16, 12);
  const arms = {};
  for (const side of ['L', 'R']) {
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), armMat); model.add(mesh);
    const joint = new THREE.Mesh(shoulderGeo, armMat); model.add(joint);
    arms[side] = { mesh, joint, glove: makeGlove(), hand: new THREE.Vector3(), ctrl: new THREE.Vector3() };
  }
  // 姿勢（左手；右手為鏡像）：手的位置、手肘控制點（模型座標）
  const POSES = {
    idle:   { hand: [-0.95, -0.15, 0.35], ctrl: [-1.15, 0.35, 0.2] },
    up:     { hand: [-1.25, 2.35, 0.25],  ctrl: [-1.15, 1.05, 0.2] },
    down:   { hand: [-0.85, -0.55, 0.3],  ctrl: [-0.85, 0.1, 0.25] },
    panic:  { hand: [-1.55, 1.9, 0.45],   ctrl: [-1.25, 0.8, 0.3] },
    fallen: { hand: [-1.1, -0.55, 0.6],   ctrl: [-1.0, 0.0, 0.4] },
  };
  const SHOULDER = new THREE.Vector3(0.66, 0.42, 0.12);
  const DANCE_BEAT = 300; // 波浪舞一拍的毫秒數
  for (const side of ['L', 'R']) {
    const m = side === 'R' ? -1 : 1;
    arms[side].hand.set(POSES.idle.hand[0] * m, POSES.idle.hand[1], POSES.idle.hand[2]);
    arms[side].ctrl.set(POSES.idle.ctrl[0] * m, POSES.idle.ctrl[1], POSES.idle.ctrl[2]);
  }

  // ───────────── 開心時的星星粒子 ─────────────
  const SPARK_N = 36;
  const starCv = document.createElement('canvas'); starCv.width = starCv.height = 64;
  { const c = starCv.getContext('2d'); c.translate(32, 32); c.fillStyle = '#fff';
    c.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 7 : 30, a = i * Math.PI / 4 - Math.PI / 2; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); }
  const starTex = new THREE.CanvasTexture(starCv);
  const sparkGeo = new THREE.BufferGeometry();
  const sparkPos = new Float32Array(SPARK_N * 3), sparkLife = new Float32Array(SPARK_N), sparkVel = new Float32Array(SPARK_N * 3), sparkHue = new Float32Array(SPARK_N);
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3)); sparkGeo.setAttribute('aLife', new THREE.BufferAttribute(sparkLife, 1)); sparkGeo.setAttribute('aHue', new THREE.BufferAttribute(sparkHue, 1));
  const sparkMat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: starTex }, uScale: { value: 300 } },
    vertexShader: `attribute float aLife; attribute float aHue; varying float vLife; varying float vHue; uniform float uScale;
      void main() { vLife = aLife; vHue = aHue; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = uScale * 0.11 * sin(aLife * 3.1416) / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D uTex; varying float vLife; varying float vHue;
      void main() { if (vLife <= 0.0) discard; float a = texture2D(uTex, gl_PointCoord).a; vec3 c = mix(vec3(1.0, 0.72, 0.05), vec3(1.0, 0.92, 0.45), vHue);
        gl_FragColor = vec4(c, a * min(1.0, vLife * 3.0));
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false,
  });
  const sparks = new THREE.Points(sparkGeo, sparkMat); sparks.frustumCulled = false; sparks.renderOrder = 6; scene.add(sparks);
  const _top = new THREE.Vector3();
  function burst(n = 12) {
    pivot.updateMatrixWorld(); pivot.localToWorld(_top.set(0, 0.95 + 1.6, 0));
    for (let i = 0, made = 0; i < SPARK_N && made < n; i++) {
      if (sparkLife[i] > 0) continue; made++;
      const a = Math.random() * Math.PI * 2, up = 0.4 + Math.random() * 0.6;
      sparkPos.set([_top.x + Math.cos(a) * 0.6, _top.y + Math.random() * 0.5, 0.6], i * 3);
      sparkVel.set([Math.cos(a) * (1.4 + Math.random() * 1.6), 2.6 * up + 1.2, 0.3], i * 3);
      sparkLife[i] = 1; sparkHue[i] = Math.random();
    }
  }
  function stepSparks(dt) {
    for (let i = 0; i < SPARK_N; i++) {
      if (sparkLife[i] <= 0) continue;
      sparkLife[i] = Math.max(0, sparkLife[i] - dt / 1.1);
      sparkVel[i * 3 + 1] -= 5.5 * dt;
      for (let k = 0; k < 3; k++) sparkPos[i * 3 + k] += sparkVel[i * 3 + k] * dt;
    }
    sparkGeo.attributes.position.needsUpdate = true; sparkGeo.attributes.aLife.needsUpdate = true; sparkGeo.attributes.aHue.needsUpdate = true;
  }

  // ───────────── 狀態與物理 ─────────────
  const S = {
    x: 0, y: 0, vx: 0, vy: 0, mode: 'home',
    squash: 0, squashV: 0, angle: 0, angleV: 0, tumble: 0, tumbleV: 0,
    yaw: 0, glow: 0.15, glowTarget: 0.15,
    mood: 'idle', moodUntil: 0, prevMood: 'idle',
    jumpY: 0, jumpV: 0, blinkAt: performance.now() + 2000, blink: 0,
    lookX: 0, lookY: 0, pose: 'idle', waveUntil: 0, waveDanceUntil: 0, waveDanceStart: 0, danceHopAt: 0, spinAt: 0, lastPointer: null,
    flickerAt: 0, flickerOn: false, prevX: 0, prevY: 0, prevVx: 0, prevVy: 0, ax: 0, ay: 0,
    sadSince: 0, sadLie: false, lie: 0, sadMix: 0, puddle: 0, stage: null, talkUntil: 0, dropFromStage: false,
  };
  const size = () => ({ w: el.offsetWidth, h: el.offsetHeight });
  const FOOT_RATIO = 0.8; // 腳底在畫布中的高度比例
  const PAD = 1.5; // 畫布 / 燈泡本體框 的比例（CSS 尺寸也要一致）
  const msize = () => ({ w: el.offsetWidth / PAD, h: el.offsetHeight / PAD });
  // 除錯用：localStorage 設 ixm_debug=1 時可在主控台讀取狀態
  try { if (localStorage.getItem('ixm_debug') === '1') (window as any).__ixm = S; } catch {}
  function home() { const { w } = msize(); return { x: innerWidth - w / 2 - insets.right, y: innerHeight - insets.bottom }; }
  { const h = home(); S.x = h.x; S.y = h.y; S.prevX = S.x; S.prevY = S.y; }

  let drag = null;
  const raycaster = new THREE.Raycaster(), _ndc = new THREE.Vector2();
  function hitGlass(e) {
    const r = canvas.getBoundingClientRect(); _ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(_ndc, camera); const hit = raycaster.intersectObject(glass, false)[0];
    return hit ? jelly.worldToLocal(hit.point.clone()) : null;
  }
  on(el, 'pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const pj = hitGlass(e);
    if (pj) { const w = ffdWeights(pj, new Float32Array(NODES)); grab = { p: pj, w, wmax: Math.max(...w), target: new THREE.Vector3(), nrm: pj.clone().sub(new THREE.Vector3(0, 2.2, 0)).normalize() }; }
    el.setPointerCapture(e.pointerId); drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: e.clientX - S.x, oy: e.clientY - S.y, t: performance.now(), moved: false, hist: [] }; });
  on(el, 'pointermove', (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    if (!drag.moved && (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6 || performance.now() - drag.t > 220)) { drag.moved = true; drag.tx = S.x; drag.ty = S.y; S.mode = 'drag'; S.sadLie = false; el.classList.add('dragging'); emit('drag'); if (S.mood === 'dizzy') setMood('idle'); }
    if (drag.moved) { const nx = e.clientX - drag.ox, ny = e.clientY - drag.oy, now = performance.now(); drag.hist.push({ x: nx, y: ny, t: now }); if (drag.hist.length > 6) drag.hist.shift(); drag.tx = nx; drag.ty = ny; }
  });
  function endDrag(e) {
    if (!drag || drag.id !== e.pointerId) return;
    el.classList.remove('dragging');
    if (drag.moved) {
      const h = drag.hist; if (h.length >= 2) { const a = h[0], b = h[h.length - 1], dt = Math.max(16, b.t - a.t) / 1000; S.vx = (b.x - a.x) / dt; S.vy = (b.y - a.y) / dt; }
      S.mode = 'fly'; S.tumbleV += S.vx * 0.012;
      // 原本站在高處（對話框上方）被拖下來放開：掉回地面會暈倒，之後由外層決定是否再爬回去
      if (S.stage && S.stage.y < innerHeight - insets.bottom - 30) { S.stage = null; S.dropFromStage = true; }
    }
    else { if (grab) poke(grab.p, 4.2); onClick(); }
    drag = null; grab = null;
  }
  on(el, 'pointerup', endDrag); on(el, 'pointercancel', endDrag);
  on(el, 'keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } });
  on(window, 'pointermove', (e) => { S.lastPointer = { x: e.clientX, y: e.clientY, t: performance.now() }; }, { passive: true });

  function onClick() {
    emit('click');
    if (S.mood === 'sad') { S.sadLie = false; emit('comfort'); say('你回來了！好開心～', 2400); setMood('happy', 2600); jump(1.1); return; }
    setMood('happy', 1800); jump(1); wobble((Math.random() < 0.5 ? -1 : 1) * 2.2);
    say(['嘿嘿～', '再點一下！', '有想法就來找我！', '我在發光嗎？'][Math.floor(Math.random() * 4)], 1600);
  }
  function wobble(k) { for (let n = 0; n < NODES; n++) if (layerOf(n) === 2) nv[n].x += k * 1.2; }
  function jump(p = 1) { if (S.mode !== 'home') return; if (p >= 0.9 && !reduceMotion) later(() => burst(14), 120); S.squash = 0.18; S.squashV = 0; later(() => { S.jumpV = -600 * p; S.squashV = -9; }, reduceMotion ? 0 : 90); }
  function setMood(m, ms = 0) {
    if (m === 'sad' && S.mood !== 'sad') S.sadSince = performance.now();
    if (m !== 'sad' && m !== 'scared') S.sadLie = false;
    if ((m === 'happy' || m === 'wow') && S.mood !== 'happy' && S.mood !== 'wow') emit('glow'); // 亮起來（外層播放發亮音效）
    if (m === 'scared' && S.mood !== 'scared') emit('scared'); // 嚇到（外層播放觸電聲＋電流聲）
    if (m !== 'scared' && S.mood === 'scared') emit('calm'); // 不嚇了（外層停掉電流聲）
    S.mood = m; S.moodUntil = ms ? performance.now() + ms : 0;
    S.glowTarget = { happy: 1, wow: 1, sad: 0.03, think: 0.5, dizzy: 0.08, scared: 0.6, shy: 0.28 }[m] ?? 0.15;
    S.pose = { happy: 'up', wow: 'up', sad: 'cry', dizzy: 'fallen', scared: 'panic', shy: 'scratch' }[m] || 'idle';
    alarmEl.style.opacity = m === 'scared' ? '1' : '0';
    faceDirty = true;
  }

  // 對話泡泡（文字由引擎控制，點泡泡交給外層開啟對話）
  let bubbleUntil = 0, bubbleDefault = o.bubbleDefault || '對什麼主題有興趣呢？客服問題也可以問我～';
  function say(text, ms = 3200) { bubbleText.textContent = text; bubbleUntil = performance.now() + ms; }

  // ───────────── 臉部繪製 ─────────────
  let faceDirty = true, faceSig = '';
  function drawFace() {
    const m = S.mood, c = fctx, W = 512, H = 384;
    const lx = S.lookX * 10, ly = S.lookY * 9;
    const talking = S.talkUntil > performance.now() && m !== 'sad' && m !== 'scared' && m !== 'dizzy';
    const sig = [m, lx.toFixed(0), ly.toFixed(0), S.blink.toFixed(1), talking ? 't' : '', Math.floor(performance.now() / (m === 'sad' || talking ? 60 : 120)) % 64].join('|');
    if (!faceDirty && sig === faceSig) return;
    faceSig = sig; faceDirty = false;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 1024, 768); c.setTransform(2, 0, 0, 2, 0, 0);
    const ex = [196, 316], ey = 150;
    const wail = m === 'sad' && Math.floor(performance.now() / 2600) % 2 === 0;
    const INK = '#3b2412';
    // 腮紅（柔和漸層）
    for (const x of [148, 364]) { const g = c.createRadialGradient(x, 222, 2, x, 222, 34); g.addColorStop(0, m === 'shy' ? 'rgba(255,80,70,0.8)' : m === 'happy' ? 'rgba(255,110,70,0.6)' : 'rgba(255,130,80,0.45)'); g.addColorStop(1, 'rgba(255,130,80,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(x, 222, 34, 22, 0, 0, Math.PI * 2); c.fill(); }
    // 眼睛
    if (m === 'shy') {
      // 不好意思：臉頰 /// 紅暈線
      c.strokeStyle = 'rgba(220,60,50,0.75)'; c.lineWidth = 4; c.lineCap = 'round';
      for (const x of [148, 364]) for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(x + k * 14 - 6, 232); c.lineTo(x + k * 14 + 6, 212); c.stroke(); }
    }
    for (const x of ex) {
      if (m === 'shy') {
        // 眼睛瞇成 ^ ^（尷尬地笑）
        c.strokeStyle = INK; c.lineWidth = 8; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x - 22, ey + 8); c.quadraticCurveTo(x, ey - 20, x + 22, ey + 8); c.stroke();
        continue;
      }
      const ry = m === 'scared' || m === 'wow' ? 42 : 38, rx = m === 'wow' ? 33 : 31;
      c.save(); c.beginPath(); c.ellipse(x, ey, rx, ry, 0, 0, Math.PI * 2); c.clip();
      const gw = c.createRadialGradient(x - 8, ey - 14, 4, x, ey, 44); gw.addColorStop(0, '#ffffff'); gw.addColorStop(1, '#efe6d6'); c.fillStyle = gw; c.fillRect(x - 40, ey - 50, 80, 100);
      if (m === 'dizzy') {
        c.strokeStyle = INK; c.lineWidth = 5; c.beginPath();
        for (let a = 0; a < Math.PI * 6; a += 0.2) { const r = a * 3.3; c.lineTo(x + Math.cos(a + performance.now() / 200) * r, ey + Math.sin(a + performance.now() / 200) * r); }
        c.stroke();
      } else {
        const ir = m === 'scared' ? 12 : m === 'wow' ? 15 : 20, px = x + lx, py = ey + 6 + ly;
        const gi = c.createRadialGradient(px - 4, py - 6, 2, px, py, ir); gi.addColorStop(0, '#a8743c'); gi.addColorStop(0.7, '#6b4220'); gi.addColorStop(1, '#3d2410');
        c.fillStyle = gi; c.beginPath(); c.arc(px, py, ir, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#1a0f07'; c.beginPath(); c.arc(px, py + 1, ir * 0.55, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(px - ir * 0.38, py - ir * 0.4, ir * 0.32, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(px + ir * 0.35, py + ir * 0.35, ir * 0.14, 0, Math.PI * 2); c.fill();
      }
      // 眼皮（眨眼、傷心半閉）
      const lid = Math.max(m === 'sad' ? (wail ? 0.78 : 0.45) : 0, S.blink);
      if (lid > 0.02) {
        const ly2 = ey - ry + 2 * ry * lid;
        const gl = c.createLinearGradient(0, ey - ry, 0, ly2); gl.addColorStop(0, m === 'sad' ? '#cdae62' : '#f9cf4a'); gl.addColorStop(1, m === 'sad' ? '#d9b867' : '#f2bf34');
        c.fillStyle = gl; c.beginPath(); c.moveTo(x - 40, ey - 50); c.lineTo(x + 40, ey - 50); c.lineTo(x + 40, ly2); c.quadraticCurveTo(x, ly2 + 12, x - 40, ly2); c.closePath(); c.fill();
        c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.moveTo(x - 34, ly2 + 1); c.quadraticCurveTo(x, ly2 + 13, x + 34, ly2 + 1); c.stroke();
      }
      c.restore();
      c.strokeStyle = 'rgba(70,40,15,0.8)'; c.lineWidth = 3.5; c.beginPath(); c.ellipse(x, ey, rx, ry, 0, 0, Math.PI * 2); c.stroke();
    }
    // 眉毛
    c.strokeStyle = INK; c.lineWidth = 10; c.lineCap = 'round';
    const brow = (x1, y1, cx, cy, x2, y2) => { c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(cx, cy, x2, y2); c.stroke(); };
    if (m === 'sad' || m === 'scared' || m === 'shy') { brow(166, 104, 196, 98, 222, 80); brow(290, 80, 316, 98, 346, 104); }
    else if (m === 'happy') { brow(166, 92, 196, 70, 226, 86); brow(286, 86, 316, 70, 346, 92); }
    else if (m === 'wow') { brow(166, 84, 196, 56, 226, 74); brow(286, 74, 316, 56, 346, 84); } // 眉毛挑高：咦！
    else { brow(166, 100, 196, 84, 226, 94); brow(286, 94, 316, 84, 346, 100); }
    // 嘴巴
    c.lineWidth = 8;
    if (talking) {
      // 說話：嘴巴一開一合（大小不規則一點比較自然）
      const tt = performance.now();
      const open = Math.max(0.08, Math.abs(Math.sin(tt / 85)) * (0.55 + 0.45 * Math.abs(Math.sin(tt / 310))));
      const mh = 6 + open * 30, mw = 26 + (1 - open) * 8;
      c.save(); c.beginPath(); c.ellipse(256, 258, mw, mh, 0, 0, Math.PI * 2);
      const gm = c.createLinearGradient(0, 258 - mh, 0, 258 + mh); gm.addColorStop(0, '#5e1a10'); gm.addColorStop(1, '#8a2c1a'); c.fillStyle = gm; c.fill(); c.clip();
      c.fillStyle = '#ff7f6e'; c.beginPath(); c.ellipse(256, 258 + mh * 0.75, mw * 0.65, mh * 0.5, 0, 0, Math.PI * 2); c.fill(); c.restore();
      c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.ellipse(256, 258, mw, mh, 0, 0, Math.PI * 2); c.stroke();
    } else if (m === 'happy') {
      c.save(); c.beginPath(); c.moveTo(208, 236); c.quadraticCurveTo(256, 318, 304, 236); c.quadraticCurveTo(256, 250, 208, 236); c.closePath();
      const gm = c.createLinearGradient(0, 236, 0, 290); gm.addColorStop(0, '#5e1a10'); gm.addColorStop(1, '#8a2c1a'); c.fillStyle = gm; c.fill(); c.clip();
      c.fillStyle = '#ff7f6e'; c.beginPath(); c.ellipse(256, 286, 26, 15, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(256, 238, 40, 7, 0, 0, Math.PI * 2); c.fill(); c.restore();
      c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.moveTo(208, 236); c.quadraticCurveTo(256, 318, 304, 236); c.quadraticCurveTo(256, 250, 208, 236); c.stroke();
    } else if (m === 'wow') {
      // 😯 嘴巴張成小小的 O
      c.save(); c.beginPath(); c.ellipse(256, 266, 18, 23, 0, 0, Math.PI * 2);
      const gw2 = c.createLinearGradient(0, 243, 0, 289); gw2.addColorStop(0, '#5e1a10'); gw2.addColorStop(1, '#8a2c1a'); c.fillStyle = gw2; c.fill(); c.clip();
      c.fillStyle = '#ff7f6e'; c.beginPath(); c.ellipse(256, 286, 12, 8, 0, 0, Math.PI * 2); c.fill(); c.restore();
      c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.ellipse(256, 266, 18, 23, 0, 0, Math.PI * 2); c.stroke();
    } else if (m === 'scared') {
      c.fillStyle = '#7a2b1c'; c.beginPath(); c.ellipse(256, 262, 34, 30, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff'; c.fillRect(232, 236, 48, 10);
    } else if (m === 'sad') {
      if (wail) {
        const o = Math.sin(performance.now() / 110) * 4;
        c.fillStyle = '#7a2b1c'; c.beginPath(); c.moveTo(210, 282); c.quadraticCurveTo(256, 222 - o, 302, 282); c.quadraticCurveTo(256, 300 + o, 210, 282); c.fill();
        c.fillStyle = '#ff7a6b'; c.beginPath(); c.ellipse(256, 284 + o * 0.5, 22, 9, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.ellipse(256, 246 - o * 0.5, 24, 5, 0, 0, Math.PI * 2); c.fill();
      } else {
        c.beginPath(); c.moveTo(222, 276); c.quadraticCurveTo(239, 256, 256, 264); c.quadraticCurveTo(273, 256, 290, 276); c.stroke();
      }
    }
    else if (m === 'shy') { c.lineWidth = 7; c.beginPath(); c.moveTo(224, 262); c.bezierCurveTo(236, 250, 244, 276, 256, 262); c.bezierCurveTo(268, 250, 276, 276, 288, 262); c.stroke(); }
    else if (m === 'think') { brow(238, 262, 256, 254, 274, 262); }
    else if (m === 'dizzy') { c.beginPath(); c.moveTo(224, 262); for (let i = 0; i <= 8; i++) c.lineTo(224 + i * 8, 262 + (i % 2 ? -7 : 7)); c.stroke(); }
    else { brow(222, 248, 256, 278, 290, 248); c.lineWidth = 4; brow(214, 242, 216, 248, 222, 250); brow(298, 242, 296, 248, 290, 250); }
    // 眼淚、冷汗
    if (m === 'sad') {
      const t = (performance.now() % 1400) / 1400;
      c.fillStyle = 'rgba(120,200,255,0.95)';
      // 淚痕（從眼角流下）
      c.strokeStyle = 'rgba(140,205,255,0.75)'; c.lineWidth = wail ? 14 : 8; c.lineCap = 'round';
      for (const x of [176, 336]) { c.beginPath(); c.moveTo(x, 182); c.bezierCurveTo(x - 6, 220, x + 6, 260, x - 2, wail ? 330 : 290); c.stroke(); }
      // 豆大淚珠
      for (const [x, o] of [[176, 0], [336, 0.5], [170, 0.25], [342, 0.75]]) { const y = 196 + ((t + o) % 1) * 130, r = wail ? 1.35 : 1; c.beginPath(); c.moveTo(x, y - 14 * r); c.quadraticCurveTo(x + 12 * r, y + 6 * r, x, y + 10 * r); c.quadraticCurveTo(x - 12 * r, y + 6 * r, x, y - 14 * r); c.fill(); }
    }
    if (m === 'shy') {
      // 一滴大冷汗
      const x = 380, y = 104 + Math.sin(performance.now() / 400) * 3;
      c.fillStyle = 'rgba(110,190,245,0.95)'; c.beginPath(); c.moveTo(x, y - 24); c.quadraticCurveTo(x + 19, y + 12, x, y + 18); c.quadraticCurveTo(x - 19, y + 12, x, y - 24); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.ellipse(x - 6, y + 6, 3, 5, 0, 0, Math.PI * 2); c.fill();
    }
    if (m === 'scared') {
      c.fillStyle = 'rgba(110,190,245,0.95)';
      for (const [x, y] of [[372, 96], [130, 120]]) { c.beginPath(); c.moveTo(x, y - 16); c.quadraticCurveTo(x + 13, y + 8, x, y + 12); c.quadraticCurveTo(x - 13, y + 8, x, y - 16); c.fill(); }
    }
    faceTex.needsUpdate = true;
  }

  // ───────────── 每一格 ─────────────
  const tmpQ = new THREE.Vector3();
  function updateArms(now) {
    for (const side of ['L', 'R']) {
      const m = side === 'R' ? -1 : 1;
      let P = POSES[S.pose] || POSES.idle;
      let hx = P.hand[0] * m, hy = P.hand[1], hz = P.hand[2], cx = P.ctrl[0] * m, cy = P.ctrl[1], cz = P.ctrl[2];
      if (S.pose === 'scratch') {
        // 一手抓頭、一手放在胸前，不好意思的樣子
        if (side === 'R') { hx = 0.72 + Math.sin(now / 65) * 0.05; hy = 2.2 + Math.cos(now / 65) * 0.06; hz = 0.25; cx = 1.35; cy = 1.35; cz = 0.3; }
        else { hx = -0.32; hy = 0.6; hz = 1.05; cx = -1.0; cy = 0.35; cz = 0.7; }
      }
      if (S.pose === 'cry') {
        if (side === 'L') { hx = -0.34 + Math.sin(now / 95) * 0.06; hy = 1.55 + Math.cos(now / 95) * 0.04; hz = 1.2; cx = -1.05; cy = 0.8; cz = 0.75; }
        else { hx = 0.85 + Math.sin(now / 650) * 0.05; hy = -0.55; hz = 0.35; cx = 0.95; cy = 0.05; cz = 0.3; }
      }
      if (S.pose === 'lieCry') {
        if (side === 'L') { hx = -1.12; hy = 1.35; hz = 0.55; cx = -1.05; cy = 0.65; cz = 0.45; }
        else { hx = 0.36 + Math.sin(now / 95) * 0.05; hy = 1.62 + Math.cos(now / 95) * 0.04; hz = 1.18; cx = 1.05; cy = 0.85; cz = 0.75; }
      }
      if (S.waveDanceUntil > now) {
        // 波浪舞：雙手往兩側伸直，波浪從左手 → 左手肘 → 右手肘 → 右手傳過去，每兩拍換方向傳回來
        const back = Math.floor((now - S.waveDanceStart) / (DANCE_BEAT * 4)) % 2 === 1;
        const pos = (p: number) => (back ? 3.2 - p : p); // 0 左手、1 左手肘、2.2 右手肘、3.2 右手
        const w = (p: number) => Math.sin((now - S.waveDanceStart) / DANCE_BEAT * Math.PI - pos(p) * 0.95);
        const handP = side === 'L' ? 0 : 3.2, elbowP = side === 'L' ? 1 : 2.2;
        hx = (side === 'L' ? -1.62 : 1.62); hy = 0.9 + w(handP) * 0.6; hz = 0.32;
        cx = (side === 'L' ? -1.18 : 1.18); cy = 0.62 + w(elbowP) * 0.42; cz = 0.24;
      } else if (S.waveUntil > now && side === 'R') {
        hx = 1.2 + Math.sin(now / 110) * 0.18; hy = 2.1; hz = 0.4; cx = 1.15; cy = 0.95;
      }
      if (S.pose === 'up') hy += Math.sin(now / 140 + (m > 0 ? 0 : 1)) * 0.08;
      if (S.pose === 'panic') { hx += Math.sin(now / 60 + (m > 0 ? 0 : 2)) * 0.14; hy += Math.cos(now / 70 + (m > 0 ? 1 : 0)) * 0.12; }
      const a = arms[side];
      a.hand.lerp(tmpQ.set(hx, hy, hz), 0.2); a.ctrl.lerp(tmpQ.set(cx, cy, cz), 0.2);
      const sh = new THREE.Vector3(SHOULDER.x * -m, SHOULDER.y, SHOULDER.z);
      deformModelPoint(sh);
      const curve = new THREE.QuadraticBezierCurve3(sh, deformModelPoint(a.ctrl.clone(), 0.8), deformModelPoint(a.hand.clone(), 0.6));
      a.mesh.geometry.dispose();
      a.mesh.geometry = new THREE.TubeGeometry(curve, 24, 0.085, 12);
      a.joint.position.copy(sh);
      a.glove.position.copy(curve.v2);
      const dir = curve.v2.clone().sub(curve.getPoint(0.85)).normalize();
      a.glove.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      a.glove.scale.set(1.3 * m, 1.3, 1.3);
    }
  }

  let lastT = performance.now(), running = !document.hidden, unitPx = 50, lastInsetRead = 0;
  function frame(now) {
    if (!running || destroyed) return;
    if (now - lastInsetRead > 1000) { lastInsetRead = now; readInsets(); }
    const dt = Math.min(0.033, (now - lastT) / 1000); lastT = now;
    const vw = innerWidth, vh = innerHeight, { w, h } = size(), H = S.stage ? { x: S.stage.x, y: S.stage.y } : home();

    if (S.moodUntil && now > S.moodUntil && S.mood !== 'sad') setMood('idle');
    const high = (S.mode === 'drag' || S.mode === 'fly') && S.y < vh * 0.55;
    if (high && S.mood !== 'scared' && S.mood !== 'dizzy') { S.prevMood = S.mood === 'sad' ? 'sad' : 'idle'; setMood('scared'); say(['哇啊啊！太高了！', '放我下來～', '我有懼高症！'][Math.floor(Math.random() * 3)], 1800); }
    if (!high && S.mood === 'scared' && (S.mode === 'home' || S.y > vh * 0.7)) { setMood(S.prevMood === 'sad' ? 'sad' : 'idle'); if (S.prevMood !== 'sad') say('呼…嚇死我了', 1500); }

    if (S.mood === 'sad' && S.mode === 'home' && !S.sadLie && now - S.sadSince > 6000) { S.sadLie = true; S.squashV += 6; }
    if (S.mood === 'sad') S.pose = S.sadLie ? 'lieCry' : 'cry';
    if (S.mode === 'fly' || S.mode === 'fallen') {
      S.vy += 2400 * dt; S.x += S.vx * dt; S.y += S.vy * dt;
      const mz = msize(); const left = mz.w * 0.35, right = vw - mz.w * 0.35, floor = vh - insets.bottom, ceil = mz.h * 0.9;
      const bounce = (sp) => { S.squashV += Math.min(14, sp * 0.006); if (sp > 420) emit('impact', sp); }; // 撞到牆或地面：玻璃哐當聲
      if (S.x < left) { S.x = left; bounce(Math.abs(S.vx)); S.vx = -S.vx * 0.55; S.tumbleV *= -0.6; }
      if (S.x > right) { S.x = right; bounce(Math.abs(S.vx)); S.vx = -S.vx * 0.55; S.tumbleV *= -0.6; }
      if (S.y < ceil) { if (Math.abs(S.vy) > 420) emit('impact', Math.abs(S.vy)); S.y = ceil; S.vy = Math.abs(S.vy) * 0.4; }
      if (S.y > floor) {
        const impact = Math.abs(S.vy); S.y = floor; bounce(impact);
        S.vy = impact > 260 ? -impact * 0.45 : 0; S.vx *= 0.82;
        if ((impact > 1500 || S.dropFromStage) && S.mood !== 'dizzy') { setMood('dizzy', 2600); say('頭好暈…', 2200); S.mode = 'fallen'; }
        if (S.dropFromStage) { S.dropFromStage = false; emit('dropped'); }
        if (S.vy === 0 && Math.abs(S.vx) < 30) { S.vx = 0; if (S.mode === 'fly') later(() => { if (S.mode === 'fly') S.mode = 'home'; }, 500); }
      }
      if (S.mode === 'fallen' && S.mood !== 'dizzy' && S.vy === 0) S.mode = 'home';
    } else if (S.mode === 'drag' && drag && drag.moved) {
      // 身體以彈簧追手指（稍微落後），被抓住的那一點留在手指下 → 果凍被拉長
      S.vx += ((drag.tx - S.x) * 520 - S.vx * 36) * dt; S.vy += ((drag.ty - S.y) * 520 - S.vy * 36) * dt;
      S.x += S.vx * dt; S.y += S.vy * dt;
    } else if (S.mode === 'home') {
      S.vx += ((H.x - S.x) * 34 - S.vx * 6.5) * dt; S.vy += ((H.y - S.y) * 34 - S.vy * 6.5) * dt;
      S.x += S.vx * dt; S.y += S.vy * dt;
    }
    if (S.jumpV || S.jumpY) {
      S.jumpV += 2400 * dt; S.jumpY += S.jumpV * dt;
      if (S.jumpY > 0) { S.squashV += Math.min(10, S.jumpV * 0.012); for (let n = 0; n < NODES; n++) if (layerOf(n) > 0) nv[n].y -= Math.min(5, S.jumpV * 0.006) * layerOf(n) / 2; S.jumpY = 0; S.jumpV = 0; if (S.mood === 'happy' && S.moodUntil - now > 600 && !(S.waveDanceUntil > now)) later(() => jump(0.7), 160); }
    }
    let sqT = 0;
    if (S.mode === 'drag') sqT = -Math.min(0.22, Math.hypot(S.vx, S.vy) / 6000);
    if (S.mode === 'home' && S.mood === 'idle') sqT = Math.sin(now / 900) * 0.012;
    if (S.mood === 'sad') sqT = 0.05 + (Math.floor(now / 2600) % 2 === 0 ? Math.max(0, Math.sin(now / 130)) * 0.035 : 0);
    S.squashV += (-(S.squash - sqT) * 380 - S.squashV * 7) * dt; S.squash += S.squashV * dt;

    // 果凍：量測身體加速度（扣掉自由落體），當作慣性力推動晶格
    const pyNow = S.y + S.jumpY, dd = Math.max(dt, 0.004);
    const vxF = (S.x - S.prevX) / dd, vyF = (pyNow - S.prevY) / dd; S.prevX = S.x; S.prevY = pyNow;
    let axF = (vxF - S.prevVx) / dd, ayF = (vyF - S.prevVy) / dd; S.prevVx = vxF; S.prevVy = vyF;
    if ((S.mode === 'fly' && S.y < vh - insets.bottom - 2) || S.jumpV !== 0) ayF -= 2400;
    S.ax += (THREE.MathUtils.clamp(axF, -9000, 9000) - S.ax) * 0.5; S.ay += (THREE.MathUtils.clamp(ayF, -9000, 9000) - S.ay) * 0.5;
    // 傾斜（拖曳方向）、翻滾（甩飛）、倒地
    let angT = 0;
    if (S.mode === 'drag') angT = THREE.MathUtils.clamp(S.vx * 0.0005, -0.6, 0.6);
    if (S.mode === 'fallen' && S.mood === 'dizzy') angT = (S.angle >= 0 ? 1 : -1) * Math.PI / 2;
    if (S.mood === 'sad') angT = S.sadLie ? -Math.PI / 2 : -0.1;
    if (S.mood === 'shy' && S.mode === 'home') angT = 0.13 + Math.sin(now / 320) * 0.04; // 微微低頭鞠躬
    if (S.stage && S.stage.lean != null && S.mode === 'home') angT = S.stage.lean; // 探頭時身體傾斜
    // 波浪舞：身體跟著節拍左右擺、每拍輕輕跳一下（用原本的跳躍，不直接改位置）
    if (S.waveDanceUntil > now && S.mode === 'home') {
      angT = Math.sin((now - S.waveDanceStart) / DANCE_BEAT * Math.PI) * 0.13;
      if (!reduceMotion && now >= S.danceHopAt && Math.abs(S.jumpY) < 0.5 && Math.abs(S.jumpV) < 1) { S.danceHopAt = now + DANCE_BEAT * 2; jump(0.3); } // 落地了才跳下一下，不會越跳越高
    }
    if (S.mode === 'fly' && S.y < vh - insets.bottom - 2) { S.angle += S.tumbleV * dt; S.tumbleV *= 0.99; }
    else {
      S.angle = Math.atan2(Math.sin(S.angle), Math.cos(S.angle));
      S.angleV += (-(S.angle - angT) * 90 - S.angleV * 12) * dt; S.angle += S.angleV * dt;
    }

    // 轉身（真 3D）：看向游標、拖曳時轉向移動方向、閒著時張望
    let yawT;
    if (S.mode === 'drag') yawT = THREE.MathUtils.clamp(S.vx / 1200, -1, 1);
    else if (S.lastPointer && now - S.lastPointer.t < 3000) yawT = THREE.MathUtils.clamp((S.lastPointer.x - S.x) / 600, -0.75, 0.75);
    else yawT = Math.sin(now / 2600) * 0.45;
    if (S.mood === 'shy' && S.mode !== 'drag') yawT = -0.35; // 害羞地把臉轉開一點
    if (S.stage && S.stage.look === 'around') yawT = Math.sin(now / 420) * 0.6; // 探頭左右張望
    if (S.lie > 0.3) yawT = 0;
    if (S.spinAt) { const p = (now - S.spinAt) / 2400; if (p >= 1) S.spinAt = 0; else yawT = p * Math.PI * 2; }
    if (!S.spinAt) S.yaw = Math.atan2(Math.sin(S.yaw), Math.cos(S.yaw));
    S.yaw += (yawT - S.yaw) * Math.min(1, dt * (S.spinAt ? 12 : 5));

    let lx = 0, ly = 0;
    if (S.lastPointer) { lx = THREE.MathUtils.clamp((S.lastPointer.x - S.x) / 260, -1, 1); ly = THREE.MathUtils.clamp((S.lastPointer.y - (S.y - msize().h * 0.6)) / 260, -1, 1); }
    if (S.mood === 'sad') { lx = 0; ly = 0.9; }
    if (S.stage && S.stage.look === 'around') { lx = Math.sin(now / 420); ly = -0.1; }
    S.lookX += (lx - S.lookX) * Math.min(1, dt * 8); S.lookY += (ly - S.lookY) * Math.min(1, dt * 8);
    if (now > S.blinkAt) { S.blinkStart = now; S.blinkAt = now + (Math.random() < 0.2 ? 260 : 2400 + Math.random() * 3200); }
    { const bt = (now - (S.blinkStart || -1e9)) / 170; S.blink = bt >= 0 && bt < 1 ? Math.sin(Math.PI * bt) : 0; }

    // 燈光
    let gt = S.glowTarget;
    if (S.mood === 'idle') gt = 0.14 + Math.sin(now / 900) * 0.06;
    if (S.mood === 'think') gt = 0.3 + (Math.sin(now / 90) > 0.3 ? 0.35 : 0);
    if (S.mood === 'happy') gt = S.jumpY < -10 ? 1.3 : 0.95;
    if (S.waveDanceUntil > now) gt = 0.8 + Math.abs(Math.sin((now - S.waveDanceStart) / DANCE_BEAT * Math.PI)) * 0.45; // 燈光跟著節拍閃
    if (S.mood === 'wow') gt = 1.15 + Math.sin(now / 160) * 0.12; // 整顆亮起來、微微閃
    if (S.mood === 'scared') { if (now > S.flickerAt) { S.flickerOn = !S.flickerOn; S.flickerAt = now + 40 + Math.random() * 110; if (S.flickerOn) emit('zap'); } S.glow = S.flickerOn ? 1 : 0.04; }
    else { if (S.mood === 'sad' && Math.random() < 0.006) S.glow = 0.16; S.glow += (gt - S.glow) * Math.min(1, dt * (gt > S.glow ? 9 : 4)); }

    // ── 套用到 3D 模型 ──
    const g = Math.max(0, S.glow);
    const sq = Math.max(-0.16, S.squash), sy = 1 - sq, sx = 1 + sq * 0.7;
    pivot.rotation.z = -S.angle;
    // 躺下時把燈泡抬到地面上、置中，鏡頭稍微拉遠
    const lieT = (S.sadLie || (S.mode === 'fallen' && S.mood === 'dizzy')) ? 1 : 0;
    S.lie += (lieT - S.lie) * Math.min(1, dt * 6);
    const rz = pivot.rotation.z;
    const ls = 1 - 0.16 * S.lie;
    pivot.scale.set(sx * ls, sy * ls, sx * ls);
    pivot.position.set(S.lie * Math.sin(rz) * 1.4, -1.38 + S.lie * Math.abs(Math.sin(rz)) * 1.2, 0);
    model.rotation.y = S.yaw;
    ffdU.uYaw.value = S.yaw;
    {
      const c = Math.cos(-pivot.rotation.z), sn = Math.sin(-pivot.rotation.z);
      const wx = S.ax / unitPx, wy = -S.ay / unitPx;
      if (grab && drag) {
        if (drag.moved) { const tx = (drag.tx - S.x) / unitPx, ty = -(drag.ty - S.y) / unitPx; grab.target.set(c * tx - sn * ty, sn * tx + c * ty, 0).clampLength(0, 0.7); }
        else grab.target.copy(grab.nrm).multiplyScalar(-0.16); // 按住：表面被壓下去
      }
      softStep(dt, c * wx - sn * wy, sn * wx + c * wy);
    }
    glassMat.emissiveIntensity = 0.05 + g * 1.5;
    coreMat.opacity = Math.min(1, 0.1 + g * 0.8);
    core.scale.setScalar(1.3 + g * 0.9);
    deformModelPoint(core.position.set(0, 1.12, 0));
    hlMat.opacity = 0.75 - S.sadMix * 0.35;
    bulbLight.intensity = 0.4 + g * 6;
    filMat.emissiveIntensity = 0.2 + g * 3;
    // 傷心：黯淡、褪色的琥珀色玻璃
    S.sadMix += ((S.mood === 'sad' ? 1 : 0) - S.sadMix) * Math.min(1, dt * 2.5);
    const sm = S.sadMix;
    glassMat.color.setRGB(1 - sm * 0.25, 0.9 - sm * 0.24, 0.58 - sm * 0.12);
    rimU.uEdge.value.setRGB(0.79 - sm * 0.25, 0.44 - sm * 0.1, sm * 0.1); rimU.uStrength.value = 1 - sm * 0.3;
    glassMat.emissive.setRGB(1 - sm * 0.45, 0.7 - sm * 0.32, sm * 0.1);
    glassMat.envMapIntensity = 1 - sm * 0.55;
    filMat.color.setRGB(0.79 - sm * 0.3, 0.54 - sm * 0.22, sm * 0.05);
    renderer.toneMappingExposure = 1.0 + g * 0.35 - sm * 0.3;
    updateArms(now);
    stepSparks(dt);
    sparkMat.uniforms.uScale.value = renderer.getPixelRatio() * msize().h;
    drawFace();
    try {
      const gl = renderer.getContext();
      if (gl && !gl.isContextLost()) {
        renderer.render(scene, camera);
      }
    } catch {}

    // ── DOM 位置與光暈 ──
    const shake = S.mood === 'scared' && !reduceMotion ? (Math.random() - 0.5) * 4 : 0;
    const bob = S.mode === 'home' && !S.jumpY ? Math.sin(now / 700) * 2 : 0;
    el.style.transform = `translate(${S.x - w / 2 + shake}px, ${S.y - h * FOOT_RATIO + S.jumpY + bob}px)`;
    const lift = Math.min(1, -S.jumpY / 200 + Math.max(0, (vh - insets.bottom - S.y) / 300));
    shadowEl.style.transform = `translate(${S.x - shadowEl.offsetWidth / 2}px, ${vh - insets.bottom - 8}px) scale(${1 - lift * 0.5})`;
    shadowEl.style.opacity = String(1 - lift * 0.7);
    glowEl.style.opacity = String(Math.min(1, g * 0.95));
    { const lift2 = Math.min(1, -S.jumpY / 220 + Math.max(0, (vh - insets.bottom - S.y) / 320));
      poolEl.style.opacity = String(Math.max(0, (g - 0.25) * 1.1) * (1 - lift2 * 0.6));
      poolEl.style.transform = `translate(${S.x - 130}px, ${vh - insets.bottom - 22}px) scale(${0.8 + g * 0.3 + lift2 * 0.3})`; }
    S.puddle = S.mood === 'sad' && S.mode === 'home' ? Math.min(1, S.puddle + dt / 7) : Math.max(0, S.puddle - dt / 1.2);
    puddleEl.style.opacity = String(Math.min(1, S.puddle * 1.6));
    puddleEl.style.transform = `translate(${S.x - 65 - S.lie * msize().w * 0.12}px, ${vh - insets.bottom - 10}px) scale(${0.3 + S.puddle * 0.9}, ${0.4 + S.puddle * 0.6})`;
    const wailing = S.mood === 'sad' && Math.floor(now / 2600) % 2 === 0;
    dropsEl.style.opacity = wailing && !reduceMotion ? String(0.5 + 0.5 * Math.abs(Math.sin(now / 300))) : '0';
    dropsEl.style.transform = `translateY(${(now / 12) % 18 - 9}px)`;
    glowEl.style.transform = `scale(${0.8 + g * 0.45})`;
    raysEl.style.opacity = S.mood === 'happy' || S.mood === 'wow' ? String(Math.min(1, g)) : '0';
    raysEl.style.transform = `scale(${1 + Math.sin(now / 120) * 0.05})`;
    alarmEl.style.transform = `translateY(${Math.sin(now / 80) * 3}px)`;
    if (!bubble.hidden) {
      if (bubbleUntil && now > bubbleUntil) { bubbleText.textContent = bubbleDefault; bubbleUntil = 0; }
      const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
      // 手機上燈泡比較小，訊息框往下靠近燈泡一點（不然離太遠，像是飄在內容上）
      const near = vw < 640 ? 38 : 0;
      const bx = Math.max(12, Math.min(vw - bw - 12, S.x - bw + 20)), by = Math.max(12, S.y - msize().h * 0.95 - bh + S.jumpY + near);
      bubble.style.transform = `translate(${bx}px, ${by}px)`;
    }
    rafId = requestAnimationFrame(frame);
  }

  function resize() {
    readInsets();
    const { w, h } = size();
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    unitPx = h / (2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(15)));
    if (S.mode === 'home') { const H = home(); S.x = H.x; S.y = H.y; }
  }
  on(window, 'resize', resize);
  // 分頁沒在看時暫停
  on(document, 'visibilitychange', () => { const was = running; running = !document.hidden; if (running && !was && !destroyed) { lastT = performance.now(); rafId = requestAnimationFrame(frame); } });
  resize();
  setMood('idle');
  bubbleText.textContent = bubbleDefault;
  rafId = requestAnimationFrame(frame);

  return {
    setMood: (m, ms = 0) => setMood(m, ms),
    say: (text, ms) => say(text, ms),
    jump: (p = 1) => jump(p),
    cheer: (text) => { if (S.mood === 'sad') return; setMood('happy', 2200); jump(1.1); if (text) say(text, 2400); },
    sad: (text) => { setMood('sad'); if (text) say(text, 1e9); },
    surprise: (text, ms = 7000) => { S.sadLie = false; setMood('wow', ms); jump(0.7); if (text) say(text, ms); },
    think: (thinking) => { if (thinking) setMood('think'); else if (S.mood === 'think') setMood('idle'); },
    embarrassed: (text) => { setMood('shy', 5200); wobble(1.4); if (text) say(text, 4200); },
    wave: (text) => { S.waveUntil = performance.now() + 2400; if (text) say(text, 2200); },
    waveDance: (text, ms = 6000) => {
      if (S.mode !== 'home') return; // 被拖著或摔倒時不跳
      const now = performance.now();
      S.sadLie = false;
      S.waveDanceStart = now; S.waveDanceUntil = now + ms; S.danceHopAt = now + DANCE_BEAT;
      setMood('happy', ms);
      S.pose = 'idle'; // 手的動作交給波浪舞
      say(text || '～♪ 來跟我一起跳波浪舞！～♬', ms);
    },
    poke: () => { const a = (Math.random() - 0.5) * 1.4; poke(new THREE.Vector3(Math.sin(a) * 0.95, 0.95 + 1.35 + Math.random() * 0.4, Math.cos(a) * 0.95), 4.2); },
    shake: () => { let i = 0; const t = setInterval(() => { if (destroyed) return clearInterval(t); wobble(i % 2 ? 2.4 : -2.4); if (++i >= 4) clearInterval(t); }, 110); cleanups.push(() => clearInterval(t)); },
    setTuning: (t) => { Object.assign(JELLY, t || {}); },
    setBubbleDefault: (t) => { bubbleDefault = t; if (!bubbleUntil) bubbleText.textContent = t; },
    enterFrom: () => { S.x = innerWidth + 80; S.mode = 'home'; setMood('happy', 1500); },
    getMood: () => S.mood,
    stage: (t, teleport) => {
      S.stage = t ? { ...t } : null;
      if (t && teleport) { S.x = t.x; S.y = t.y; S.vx = 0; S.vy = 0; S.prevX = S.x; S.prevY = S.y + S.jumpY; S.prevVx = 0; S.prevVy = 0; }
      if (S.mode !== 'drag') S.mode = 'home';
    },
    talk: (ms) => { S.talkUntil = performance.now() + Math.max(0, ms); faceDirty = true; },
    pop: (k) => wobble(k),
    squash: (k) => { S.squash = k; S.squashV = 0; },
    drop: () => {
      S.stage = null;
      if (S.mode === 'drag') return;
      if (S.y < innerHeight - insets.bottom - 20) { S.mode = 'fly'; S.vx = 0; S.vy = 0; } else S.mode = 'home';
    },
    // 回傳燈泡本體框（不含透明留白）的大小；foot 為腳底在本體框中的比例
    size: () => ({ ...msize(), foot: 0.86 }),
    refreshInsets: () => { readInsets(); if (S.mode === 'fallen' || S.mode === 'fly') return; S.mode = 'home'; },
    destroy: () => {
      destroyed = true; cancelAnimationFrame(rafId); cleanups.forEach((f) => f());
      scene.traverse((obj) => { if (obj.geometry) obj.geometry.dispose(); const m = obj.material; if (m) (Array.isArray(m) ? m : [m]).forEach((mm) => { if (mm.map) mm.map.dispose(); mm.dispose(); }); });
      pmrem.dispose(); renderer.dispose(); canvas.remove();
    },
  };
}
