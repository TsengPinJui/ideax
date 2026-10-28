import * as THREE from 'three';
import { seeded } from './textures';
import { faunaEnv } from './fauna';

/**
 * 小生命（加強沉浸感）：
 * - 螢火蟲：夜晚、天氣好時，在河岸草地、水邊與徵才島綠塘一帶忽明忽滅地飄
 * - 蝴蝶：白天、黃昏天氣好時，在河岸花草與園林裡翩翩飛
 * 全部各用一個網格（每幀在 CPU 更新頂點），只多兩次繪製
 */

export interface LifeSpot {
  x: number;
  z: number;
  r: number;
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,220,1)');
  grd.addColorStop(0.25, 'rgba(230,255,140,0.85)');
  grd.addColorStop(1, 'rgba(160,255,80,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function smokeMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uColor: { value: new THREE.Color(0xe8e4dc) } },
    vertexShader: `
      attribute float aSize;
      attribute float aAlpha;
      varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (320.0 / max(1.0, -mv.z));
        vAlpha = aAlpha;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float r = length(d);
        float a = smoothstep(0.5, 0.1, r) * vAlpha;
        if (a < 0.01) discard;
        gl_FragColor = vec4(uColor, a);
      }`,
  });
}

export function createAmbientLife(fireflySpots: LifeSpot[], butterflySpots: LifeSpot[], chimneys: [number, number, number][] = []): THREE.Group {
  const root = new THREE.Group();
  root.name = 'ambient_life';
  const rand = seeded(9090);

  // ── 螢火蟲 ──
  type Fly = { cx: number; cz: number; r: number; ph: number; sp: number; h: number };
  const flies: Fly[] = [];
  for (const s of fireflySpots) {
    const n = 6 + Math.floor(rand() * 5);
    for (let i = 0; i < n; i++) flies.push({ cx: s.x + (rand() - 0.5) * s.r, cz: s.z + (rand() - 0.5) * s.r, r: 0.6 + rand() * 1.6, ph: rand() * 20, sp: 0.25 + rand() * 0.35, h: 0.4 + rand() * 1.4 });
  }
  const fPos = new Float32Array(flies.length * 3);
  const fCol = new Float32Array(flies.length * 3);
  const fGeo = new THREE.BufferGeometry();
  fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
  fGeo.setAttribute('color', new THREE.BufferAttribute(fCol, 3));
  const fMat = new THREE.PointsMaterial({
    size: 0.42,
    map: glowTexture(),
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const fireflies = new THREE.Points(fGeo, fMat);
  fireflies.frustumCulled = false;
  fireflies.visible = false;
  root.add(fireflies);

  // ── 蝴蝶（每隻兩片翅膀，各兩個三角形） ──
  type Bfly = { cx: number; cz: number; r: number; ph: number; sp: number; h: number; col: THREE.Color };
  const PALETTE = [0xfff3b0, 0xffffff, 0xf9a8d4, 0xfcd34d, 0x93c5fd, 0xfdba74];
  const bflies: Bfly[] = [];
  for (const s of butterflySpots) {
    const n = 2 + Math.floor(rand() * 2);
    for (let i = 0; i < n; i++) {
      bflies.push({
        cx: s.x + (rand() - 0.5) * s.r,
        cz: s.z + (rand() - 0.5) * s.r,
        r: 1 + rand() * 2.2,
        ph: rand() * 20,
        sp: 0.35 + rand() * 0.3,
        h: 0.7 + rand() * 1.1,
        col: new THREE.Color(PALETTE[Math.floor(rand() * PALETTE.length)]),
      });
    }
  }
  const VERTS = 12; // 2 翅 × 2 三角形 × 3 頂點
  const bPos = new Float32Array(bflies.length * VERTS * 3);
  const bCol = new Float32Array(bflies.length * VERTS * 3);
  bflies.forEach((b, i) => {
    for (let k = 0; k < VERTS; k++) {
      // 翅膀內側稍深
      const dark = k % 3 === 0 ? 0.75 : 1;
      bCol.set([b.col.r * dark, b.col.g * dark, b.col.b * dark], (i * VERTS + k) * 3);
    }
  });
  const bGeo = new THREE.BufferGeometry();
  bGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3));
  bGeo.setAttribute('color', new THREE.BufferAttribute(bCol, 3));
  const bMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const butterflies = new THREE.Mesh(bGeo, bMat);
  butterflies.frustumCulled = false;
  butterflies.visible = false;
  root.add(butterflies);

  // ── 炊煙：農舍煙囪冒出的淡淡白煙，往上飄、被風吹斜、慢慢散掉 ──
  const PUFFS = 7;
  const sPos = new Float32Array(chimneys.length * PUFFS * 3);
  const sSize = new Float32Array(chimneys.length * PUFFS);
  const sAlpha = new Float32Array(chimneys.length * PUFFS);
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  sGeo.setAttribute('aSize', new THREE.BufferAttribute(sSize, 1));
  sGeo.setAttribute('aAlpha', new THREE.BufferAttribute(sAlpha, 1));
  const sMat = smokeMaterial();
  const smoke = new THREE.Points(sGeo, sMat);
  smoke.frustumCulled = false;
  smoke.visible = false;
  root.add(smoke);
  const chPh = chimneys.map(() => rand() * 10);

  // 翅膀在蝴蝶本地座標的形狀（x 往右、z 往前）：前翅大、後翅小
  const WING: [number, number][] = [
    [0, 0.015],
    [0.15, 0.12],
    [0.18, -0.015],
    [0, -0.015],
    [0.13, -0.03],
    [0.075, -0.13],
  ];
  const tmp = new THREE.Vector3();
  let last = -1;
  root.userData.tick = (t: number) => {
    const clear = faunaEnv.weather === 'clear';
    const night = faunaEnv.tod === 'night';
    fireflies.visible = clear && night;
    butterflies.visible = clear && !night;
    // 炊煙：黃昏最濃、白天淡淡的、夜裡與雨天沒有
    smoke.visible = chimneys.length > 0 && clear && !night;
    // 每秒最多更新 40 次就夠順，省 CPU
    const throttled = t - last < 1 / 40;
    if (throttled) return;
    last = t;
    if (fireflies.visible) {
      flies.forEach((f, i) => {
        const a = t * f.sp + f.ph;
        fPos[i * 3] = f.cx + Math.cos(a) * f.r + Math.sin(a * 2.3) * 0.3;
        fPos[i * 3 + 1] = f.h + Math.sin(a * 1.7) * 0.35;
        fPos[i * 3 + 2] = f.cz + Math.sin(a * 0.8) * f.r;
        // 一閃一閃
        const blink = Math.max(0, Math.sin(t * (1.2 + (i % 5) * 0.23) + f.ph * 3));
        const v = 0.15 + blink * blink * 0.95;
        fCol[i * 3] = v * 0.95;
        fCol[i * 3 + 1] = v;
        fCol[i * 3 + 2] = v * 0.45;
      });
      fGeo.attributes.position.needsUpdate = true;
      fGeo.attributes.color.needsUpdate = true;
    }
    if (smoke.visible) {
      const dusk = faunaEnv.tod === 'dusk';
      (sMat.uniforms.uColor.value as THREE.Color).setHex(dusk ? 0xd9cfc4 : 0xf2f0ea);
      chimneys.forEach(([cx, cy, cz], ci) => {
        for (let k = 0; k < PUFFS; k++) {
          const i = ci * PUFFS + k;
          // 每團煙的年紀 0..1，循環
          const age = (t * 0.09 + k / PUFFS + chPh[ci]) % 1;
          const rise = age * 7;
          sPos[i * 3] = cx + rise * 0.35 + Math.sin(age * 9 + chPh[ci]) * 0.25;
          sPos[i * 3 + 1] = cy + rise;
          sPos[i * 3 + 2] = cz + rise * 0.15;
          sSize[i] = 0.8 + age * 3.2;
          sAlpha[i] = (dusk ? 0.5 : 0.28) * Math.min(1, age * 6) * (1 - age);
        }
      });
      sGeo.attributes.position.needsUpdate = true;
      sGeo.attributes.aSize.needsUpdate = true;
      sGeo.attributes.aAlpha.needsUpdate = true;
    }
    if (butterflies.visible) {
      bflies.forEach((b, i) => {
        const a = t * b.sp + b.ph;
        const x = b.cx + Math.sin(a) * b.r + Math.sin(a * 3.1) * 0.25;
        const z = b.cz + Math.sin(a * 0.7 + 1) * b.r;
        const y = b.h + Math.sin(a * 2.6) * 0.3 + Math.abs(Math.sin(t * 9 + b.ph)) * 0.06;
        // 飛行方向
        const dx = Math.cos(a) * b.r * b.sp;
        const dz = Math.cos(a * 0.7 + 1) * 0.7 * b.r * b.sp;
        const yaw = Math.atan2(dx, dz);
        const cy = Math.cos(yaw);
        const sy = Math.sin(yaw);
        const flap = 0.25 + Math.abs(Math.sin(t * 14 + b.ph)) * 1.15;
        let k = (i * VERTS) * 3;
        for (const side of [-1, 1]) {
          const ca = Math.cos(flap);
          const sa = Math.sin(flap);
          for (const [wx, wz] of WING) {
            // 翅膀繞身體縱軸往上掀
            const lx = side * wx * ca;
            const ly = wx * sa;
            const lz = wz;
            tmp.set(x + lx * cy + lz * sy, y + ly, z - lx * sy + lz * cy);
            bPos[k++] = tmp.x;
            bPos[k++] = tmp.y;
            bPos[k++] = tmp.z;
          }
        }
      });
      bGeo.attributes.position.needsUpdate = true;
    }
  };
  return root;
}
