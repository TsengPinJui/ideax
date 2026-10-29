import { WaterLife, WeatherType, isUnderRoof } from './waterLife';
import * as THREE from 'three';
import { faunaEnv } from './fauna';
import { disposeStreetMaterials } from './streets';
import { REGION_CONFIGS, localToWorldXZ, getGlobalWalkableZones } from '../regionConfigs';
import { isFloorsHall } from './exhibitHall';
import { lobbyPit } from './hallLobby';
import {
  getStyleMaterials,
  disposeStyleMaterials,
  buildRoofTier,
  cliffGeometry,
  scaledBox,
  mergeByMaterial,
  LanternBatch,
  TreeBatch,
  TreeKind,
} from './architecture';
import {
  cloudTexture,
  waterfallTexture,
  glowTexture,
  lotusPadTexture,
  moonTexture,
  petalTexture,
  farmlandTexture,
  seeded,
  signboardTexture,
} from './textures';
import { makePickProxy } from '../picking';
import { MOUNTAIN_RING, FARMLANDS, LOTUS_PATCHES, BASIN_LANDMARKS, landOutline, farmHouseLayout } from './basinLayout';

export type TimeOfDay = 'day' | 'dusk' | 'night';

export const TIME_OF_DAY_LABEL: Record<TimeOfDay, string> = {
  day: '白天',
  dusk: '黃昏',
  night: '夜晚',
};

interface Preset {
  top: number;
  horizon: number;
  bottom: number;
  sunDir: [number, number, number];
  sunColor: number;
  sunIntensity: number;
  skyGlow: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  ambient: number;
  fog: number;
  fogNear: number;
  fogFar: number;
  deep: number;
  shallow: number;
  waterSky: number;
  glint: number;
  lantern: number;
  lamp: number;
  windows: number;
  glowOpacity: number;
  glowSize: number;
  orb: number;
  exposure: number;
  stars: number;
  moon: boolean;
  playerLamp: number;
  mountain: number;
  cloud: number;
  cloudOpacity: number;
  bloom: number;
}

const PRESETS: Record<TimeOfDay, Preset> = {
  day: {
    top: 0x3f86d6, horizon: 0xcfe5f2, bottom: 0x9cc3d8,
    sunDir: [0.35, 0.75, -0.45], sunColor: 0xfff3dc, sunIntensity: 2.5, skyGlow: 0.65,
    hemiSky: 0xdbeeff, hemiGround: 0x9a8466, hemiIntensity: 1.05, ambient: 0.22,
    fog: 0xd3e2e8, fogNear: 95, fogFar: 640,
    deep: 0x114d63, shallow: 0x359ca4, waterSky: 0xa8d4f0, glint: 1.35,
    lantern: 0.55, lamp: 0.4, windows: 0.0, glowOpacity: 0.12, glowSize: 1.8, orb: 1.0,
    exposure: 1.02, stars: 0, moon: false, playerLamp: 0, mountain: 0xffffff, cloud: 0xffffff, cloudOpacity: 0.95, bloom: 0.18,
  },
  dusk: {
    top: 0x4d79b8, horizon: 0xffc88f, bottom: 0xd99a6a,
    sunDir: [-0.45, 0.18, -0.88], sunColor: 0xffb86c, sunIntensity: 2.7, skyGlow: 1.05,
    hemiSky: 0xffe2c0, hemiGround: 0x6d5446, hemiIntensity: 0.95, ambient: 0.22,
    fog: 0xeec29a, fogNear: 70, fogFar: 540,
    deep: 0x163f52, shallow: 0x3b787c, waterSky: 0xf7b07e, glint: 1.75,
    lantern: 1.25, lamp: 1.0, windows: 0.45, glowOpacity: 0.3, glowSize: 2.0, orb: 1.35,
    exposure: 1.06, stars: 0, moon: false, playerLamp: 0.6, mountain: 0xe9dccd, cloud: 0xffd2b0, cloudOpacity: 0.9, bloom: 0.26,
  },
  night: {
    top: 0x050b1f, horizon: 0x1b2b52, bottom: 0x091022,
    sunDir: [0.35, 0.38, -0.85], sunColor: 0xc4d7ff, sunIntensity: 0.72, skyGlow: 0.45,
    hemiSky: 0x425b9c, hemiGround: 0x161218, hemiIntensity: 0.78, ambient: 0.2,
    fog: 0x131f3b, fogNear: 70, fogFar: 420,
    deep: 0x051024, shallow: 0x102e4a, waterSky: 0x2c4b82, glint: 1.65,
    // 夜晚：燈光柔和、月光清亮，水面清楚映出月色與倒影
    lantern: 1.75, lamp: 1.45, windows: 0.78, glowOpacity: 0.4, glowSize: 2.1, orb: 1.55,
    exposure: 1.14, stars: 1, moon: true, playerLamp: 1.8, mountain: 0x4a5582, cloud: 0x3a4a73, cloudOpacity: 0.35, bloom: 0.3,
  },
};

function makeWaterMaterial() {
  return new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uDeep: { value: new THREE.Color() },
        uShallow: { value: new THREE.Color() },
        uSky: { value: new THREE.Color() },
        uSkyTop: { value: new THREE.Color() },
        uSkyHorizon: { value: new THREE.Color() },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uSunColor: { value: new THREE.Color() },
        uGlint: { value: 1 },
        uNight: { value: 0 },
        uFoam: { value: new THREE.Color(0xffffff) },
        uFoamAmt: { value: 0.35 },
        // 即時倒影：倒影貼圖與投影矩陣
        tReflect: { value: null },
        uReflMatrix: { value: new THREE.Matrix4() },
        uReflStrength: { value: 0 },
        // 五座島（可走範圍＋河岸草地）：岸邊淺水與浪花
        uIslands: { value: [0, 1, 2, 3, 4].map(() => new THREE.Vector4(1e5, 1e5, 1, 1)) },
        // 有地下室的建築範圍：海面在這裡不畫，從樓梯井往下看才看得到地下室
        uHoles: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(1e5, 1e5, 1, 0)) },
        uHoleSizes: { value: [0, 1, 2, 3].map(() => new THREE.Vector2(0, 0)) },
      },
    ]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      uniform mat4 uReflMatrix;
      varying vec3 vWorld;
      varying vec4 vRefl;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vRefl = uReflMatrix * wp;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uSky;
      uniform vec3 uSkyTop;
      uniform vec3 uSkyHorizon;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform vec3 uFoam;
      uniform float uFoamAmt;
      uniform float uGlint;
      uniform float uNight;
      uniform sampler2D tReflect;
      uniform float uReflStrength;
      uniform vec4 uIslands[5];
      uniform vec4 uHoles[4];
      uniform vec2 uHoleSizes[4];
      varying vec3 vWorld;
      varying vec4 vRefl;

      // 大浪（慢）＋中浪＋細碎漣漪：幾組不同方向、不同頻率的波疊起來
      float waveH(vec2 p, float detail) {
        float h = 0.0;
        h += sin(dot(p, vec2(0.31, 0.12)) + uTime * 0.85) * 0.52;
        h += sin(dot(p, vec2(-0.14, 0.27)) - uTime * 0.68) * 0.46;
        h += sin(dot(p, vec2(0.52, 0.47)) + uTime * 1.28) * 0.24;
        h += sin(dot(p, vec2(-0.77, 0.61)) - uTime * 1.65) * 0.15 * detail;
        h += sin(dot(p, vec2(1.31, -0.93)) + uTime * 2.35) * 0.08 * detail;
        h += sin(dot(p, vec2(2.17, 1.71)) - uTime * 3.15) * 0.042 * detail;
        h += sin(dot(p, vec2(-3.4, 2.6)) + uTime * 4.1) * 0.022 * detail;
        return h;
      }
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      // 離最近島岸（草地外緣）的距離（公尺；岸上是負的）
      float shoreDist(vec2 p) {
        float d = 1e5;
        for (int i = 0; i < 5; i++) {
          vec4 e = uIslands[i];
          vec2 q = (p - e.xy) / e.zw;
          float l = length(q);
          d = min(d, (l - 1.0) * min(e.z, e.w));
        }
        return d;
      }
      void main() {
        vec2 p = vWorld.xz;
        for (int i = 0; i < 4; i++) {
          vec4 hh = uHoles[i];
          vec2 hd = p - hh.xy;
          vec2 hl = vec2(hd.x * hh.z - hd.y * hh.w, hd.x * hh.w + hd.y * hh.z);
          if (abs(hl.x) < uHoleSizes[i].x && abs(hl.y) < uHoleSizes[i].y) discard;
        }
        vec3 toCam = cameraPosition - vWorld;
        float dist = length(toCam);
        vec3 V = toCam / dist;
        // 遠處的細浪淡掉（不會閃爍），近處清楚
        float detail = clamp(1.0 - dist / 280.0, 0.18, 1.0);
        float e = 0.16;
        vec3 n = normalize(vec3(
          -(waveH(p + vec2(e, 0.0), detail) - waveH(p - vec2(e, 0.0), detail)) * 0.56 * detail,
          1.0,
          -(waveH(p + vec2(0.0, e), detail) - waveH(p - vec2(0.0, e), detail)) * 0.56 * detail));

        vec3 L = normalize(uSunDir);
        float sd = shoreDist(p);
        float shallow = 1.0 - smoothstep(0.0, 15.0, sd);
        // 水色與明暗立體感：浪峰受光透亮、波谷深邃有暗部光影對比
        float wH = waveH(p * 0.52, 1.0);
        float crest = clamp(0.5 + 0.5 * wH, 0.0, 1.0);
        float waveLight = clamp(dot(n, normalize(vec3(L.x, max(0.28, L.y), L.z))), 0.0, 1.0);
        float shadowContrast = mix(0.62, 1.24, pow(waveLight, 1.35) * (0.65 + 0.35 * crest));
        vec3 body = mix(uDeep, uShallow, clamp(0.18 + shallow * 0.72 + crest * 0.22, 0.0, 1.0)) * shadowContrast;
        // 次表面散射（浪尖迎光泛出翠玉／銀藍透光）
        float sss = pow(clamp(dot(-V, L + n * 0.65), 0.0, 1.0), 3.0) * (0.35 + 0.65 * crest);
        body += mix(uShallow * 0.42, vec3(0.38, 0.64, 0.95), uNight) * sss;

        // 天空與鏡面映射倒影（增強菲涅耳與近岸建築／山影映射）
        vec3 R = reflect(-V, n);
        float ry = clamp(R.y, 0.0, 1.0);
        vec3 skyCol = mix(uSkyHorizon, uSkyTop, pow(ry, 0.5));
        skyCol = mix(skyCol, uSky, 0.48) * 0.92;
        float cosT = max(dot(n, V), 0.0);
        float fres = 0.24 + 0.74 * pow(1.0 - cosT, 2.75);
        fres = clamp(fres, 0.0, uReflStrength > 0.0 ? 0.88 : 0.68);
        vec3 refl = skyCol;
        // 即時鏡面倒影（建築、樹、山、燈籠、月影），隨水波輕微搖曳
        if (uReflStrength > 0.0 && vRefl.w > 0.0) {
          vec2 uv = clamp(vRefl.xy / vRefl.w + n.xz * (0.032 + 0.018 * (1.0 - shallow)) * detail, 0.002, 0.998);
          vec3 rc = texture2D(tReflect, uv).rgb;
          // 提亮倒影中的燈火與建築輪廓對比
          rc = max(vec3(0.0), (rc - 0.03) * 1.16 + 0.03);
          refl = mix(refl, rc, uReflStrength);
        }
        // 岸邊暖色燈籠水波倒影（黃昏與夜晚沿岸泛起搖曳金紅波光）
        float shoreGlow = smoothstep(18.0, 0.5, sd) * smoothstep(-1.0, 1.2, sd);
        float lanternRipple = 0.55 + 0.45 * sin(p.x * 1.3 + uTime * 2.4) * cos(p.y * 1.2 - uTime * 1.9);
        refl += vec3(1.0, 0.58, 0.24) * shoreGlow * lanternRipple * (0.12 + uNight * 0.26);

        vec3 col = mix(body, refl, fres);

        // 太陽與月光波光：核心高光＋寬幅銀藍月光帶＋細碎星芒波光
        float rl = max(dot(R, L), 0.0);
        // 橫向拉長的水波光帶（模擬真實水面波紋把陽光／月光拉成一條粼粼光路）
        vec3 R_ribbon = normalize(vec3(R.x + n.x * 1.65, R.y * 0.68, R.z + n.z * 1.65));
        float rlRibbon = max(dot(R_ribbon, L), 0.0);
        float specCore = pow(rl, 260.0) * 3.8 + pow(rl, 48.0) * 0.42;
        float specRibbon = pow(rlRibbon, 26.0) * (0.36 + uNight * 0.58) * (0.6 + 0.4 * sin(wH * 6.0 + uTime * 2.2));
        float sparkle = step(0.978, vnoise(p * 3.1 + vec2(uTime * 0.65, -uTime * 0.48))) * pow(rl, 5.0) * (2.1 + uNight * 1.4) * detail;
        vec3 lightTint = mix(uSunColor, vec3(0.84, 0.92, 1.0), uNight * 0.65);
        col += lightTint * (specCore + specRibbon + sparkle) * uGlint;

        // 夜晚專屬：清澈月輪倒影與銀白月華水紋
        if (uNight > 0.01) {
          float moonDisc = smoothstep(0.9965, 0.9994, dot(normalize(vec3(R.x + n.x * 0.35, R.y, R.z + n.z * 0.35)), L));
          float moonHalo = pow(rl, 14.0) * 0.28 + pow(rlRibbon, 12.0) * 0.32;
          col += vec3(0.86, 0.93, 1.0) * (moonDisc * 2.2 + moonHalo) * uNight;
        }

        // 岸邊浪花：沿岸一圈白沫，隨浪推近退遠
        if (sd > -0.5 && sd < 2.2) {
          float band = sd + sin(uTime * 0.9 + p.x * 0.15 + p.y * 0.11) * 0.3;
          float foam = smoothstep(1.1, 0.15, band) * smoothstep(-0.35, 0.15, band);
          foam *= smoothstep(0.35, 0.75, vnoise(p * 2.2 + vec2(uTime * 0.25, -uTime * 0.18)));
          col = mix(col, uFoam, clamp(foam * uFoamAmt, 0.0, 0.5));
        }
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
}

function makeSkyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uBottom: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color() },
      uGlow: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop;
      uniform vec3 uHorizon;
      uniform vec3 uBottom;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform float uGlow;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float y = d.y;
        vec3 col = y > 0.0 ? mix(uHorizon, uTop, pow(clamp(y, 0.0, 1.0), 0.5)) : mix(uHorizon, uBottom, pow(clamp(-y, 0.0, 1.0), 0.35));
        float s = max(dot(d, normalize(uSunDir)), 0.0);
        col += uSunColor * (pow(s, 1400.0) * 4.0 + pow(s, 40.0) * 0.45 * uGlow + pow(s, 5.0) * 0.18 * uGlow);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

/** 遠景、天空、水面、瀑布、湖心亭、花瓣與晝夜控制 */
export class StylizedWorld {
  public timeOfDay: TimeOfDay = 'dusk';
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private root = new THREE.Group();
  private sky: THREE.Mesh;
  private skyMat: THREE.ShaderMaterial;
  private waterMat: THREE.ShaderMaterial;
  private water: THREE.Mesh | null = null;
  // 即時倒影
  private reflRT: THREE.WebGLRenderTarget | null = null;
  private reflCam = new THREE.PerspectiveCamera();
  public reflections = true;
  private stars: THREE.Points;
  private moon: THREE.Sprite;
  private clouds: THREE.Sprite[] = [];
  private cloudMat: THREE.SpriteMaterial;
  private mountainMat: THREE.MeshStandardMaterial;
  private waterfalls: THREE.MeshBasicMaterial[] = [];
  private petals: THREE.Points;
  private petalMat: THREE.PointsMaterial;
  private petalData: Float32Array;
  private hemi: THREE.HemisphereLight;
  private sun: THREE.DirectionalLight;
  private ambient: THREE.AmbientLight;
  private playerLamp: THREE.PointLight;
  private time = 0;
  private waterwheels: THREE.Group[] = [];
  private lotusPadMat: THREE.MeshStandardMaterial | null = null;
  private ownedTextures: THREE.Texture[] = [];
  private life!: WaterLife;

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.renderer = renderer;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.root.name = 'stylized_world';
    scene.add(this.root);

    // 光源
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    this.sun = new THREE.DirectionalLight(0xffffff, 2);
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.05;
    const sc = this.sun.shadow.camera;
    sc.left = -38;
    sc.right = 38;
    sc.top = 38;
    sc.bottom = -38;
    sc.near = 1;
    sc.far = 220;
    this.ambient = new THREE.AmbientLight(0xffffff, 0.2);
    this.playerLamp = new THREE.PointLight(0xffa64d, 0, 22, 1.6);
    this.root.add(this.hemi, this.sun, this.sun.target, this.ambient, this.playerLamp);

    // 天空
    this.skyMat = makeSkyMaterial();
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), this.skyMat);
    this.sky.renderOrder = -10;
    this.sky.frustumCulled = false;
    this.root.add(this.sky);

    // 星空與月亮
    const rand = seeded(77);
    const starPos: number[] = [];
    for (let i = 0; i < 700; i++) {
      const a = rand() * Math.PI * 2;
      const y = 0.08 + rand() * 0.92;
      const r = Math.sqrt(1 - y * y);
      starPos.push(Math.cos(a) * r * 850, y * 850, Math.sin(a) * r * 850);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    this.stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })
    );
    this.stars.frustumCulled = false;
    this.root.add(this.stars);
    this.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTexture(), fog: false, depthWrite: false, transparent: true }));
    this.moon.scale.set(110, 110, 1);
    this.root.add(this.moon);

    // 雲
    this.cloudMat = new THREE.SpriteMaterial({ map: cloudTexture(), fog: false, depthWrite: false, transparent: true, opacity: 0.9 });
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Sprite(this.cloudMat);
      const a = rand() * Math.PI * 2;
      const r = 420 + rand() * 300;
      s.position.set(Math.cos(a) * r, 90 + rand() * 120, Math.sin(a) * r);
      const k = 110 + rand() * 120;
      s.scale.set(k * 2, k, 1);
      this.clouds.push(s);
      this.root.add(s);
    }

    // 海面
    this.waterMat = makeWaterMaterial();
    {
      // 海面挖洞：有地下室的建築、展覽館與電玩城的大樓梯井（從上往下看才看得到樓梯）
      const holes: { x: number; z: number; yaw: number; hx: number; hz: number }[] = [];
      for (const bb of Object.values(REGION_CONFIGS).flatMap((r) => r.buildings)) {
        if ((bb.basements || 0) > 0) holes.push({ x: bb.position.x, z: bb.position.z, yaw: bb.facingYaw, hx: bb.width / 2, hz: bb.depth / 2 });
        else if (isFloorsHall(bb.id)) {
          const p = lobbyPit(bb);
          const [x, z] = localToWorldXZ(bb.position.x, bb.position.z, bb.facingYaw, (p.x0 + p.x1) / 2, (p.zTop + p.zBot) / 2);
          holes.push({ x, z, yaw: bb.facingYaw, hx: (p.x1 - p.x0) / 2 + 0.5, hz: (p.zTop - p.zBot) / 2 + 0.5 });
        }
      }
      holes.slice(0, 4).forEach((hh, i) => {
        this.waterMat.uniforms.uHoles.value[i].set(hh.x, hh.z, Math.cos(hh.yaw), Math.sin(hh.yaw));
        this.waterMat.uniforms.uHoleSizes.value[i].set(hh.hx, hh.hz);
      });
    }
    {
      // 島岸（可走範圍＋草地外環）：岸邊淺水與浪花
      const zones = getGlobalWalkableZones();
      Object.values(REGION_CONFIGS).forEach((r, i) => {
        const z = zones.find((zz) => zz.type === 'ellipse' && Math.abs(zz.cx - r.center[0]) < 0.5 && Math.abs(zz.cz - r.center[1]) < 0.5);
        if (z && z.type === 'ellipse' && i < 5) this.waterMat.uniforms.uIslands.value[i].set(z.cx, z.cz, z.rx + 6.2, z.rz + 6.2);
      });
    }
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600, 1, 1), this.waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.35;
    this.water = water;
    this.root.add(water);

    // 盆地：照 /island 的地圖構造（32 座閉合環形山、田園陸地、北山飛瀑、塔樓山台、南山洞口、東山飛瀑）
    this.mountainMat = new THREE.MeshStandardMaterial({ color: 0x7a7a8c, roughness: 1, vertexColors: true });
    const trees = new TreeBatch();
    this.buildMountainRing(trees);
    this.buildDistantPeaks(rand);
    this.buildFarmlands(trees);
    this.buildLakePavilion(BASIN_LANDMARKS.lakePavilion.x, BASIN_LANDMARKS.lakePavilion.z);
    for (const [x, z, r] of LOTUS_PATCHES) this.buildLotus(x, z, r, Math.round(r * 3));
    this.root.add(trees.build());

    // 飄落的花瓣（夜晚變成螢火蟲）
    const count = 320;
    this.petalData = new Float32Array(count * 4);
    const pp = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pp[i * 3] = (rand() - 0.5) * 60;
      pp[i * 3 + 1] = rand() * 14;
      pp[i * 3 + 2] = (rand() - 0.5) * 60;
      this.petalData[i * 4] = 0.4 + rand() * 0.7;
      this.petalData[i * 4 + 1] = rand() * Math.PI * 2;
      this.petalData[i * 4 + 2] = 0.5 + rand();
    }
    const petalGeo = new THREE.BufferGeometry();
    petalGeo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    this.petalMat = new THREE.PointsMaterial({
      map: petalTexture(),
      color: 0xffb7cf,
      size: 0.22,
      sizeAttenuation: true,
      transparent: true,
      depthWrite: false,
      opacity: 0.9,
    });
    this.petals = new THREE.Points(petalGeo, this.petalMat);
    this.petals.frustumCulled = false;
    this.root.add(this.petals);

    // 漁船／遊船、水燈、天燈與細雨
    this.life = new WaterLife();
    this.root.add(this.life.root);

    this.setTimeOfDay('dusk');
  }

  /** 天氣：晴天才有漁船、遊船、水燈與天燈；下雨時飄細雨 */
  setWeather(w: WeatherType) {
    faunaEnv.weather = w;
    this.life.setWeather(w);
  }

  get weather(): WeatherType {
    return this.life.currentWeather;
  }

  /** 山的剖面：寬山腳、往上收窄、圓頂（可疊成連綿山牆） */
  private mountainGeometry(r: number, h: number, seed: number, flatTop = 0, baseR = 0) {
    const rand = seeded(seed);
    const pts: THREE.Vector2[] = [];
    const rTop = r * (1 - Math.pow(0.8, 1.15) * 0.82);
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      let rr = r * (1 - Math.pow(t, 1.15) * 0.82);
      // 指定山腳半徑：下半段收得比較陡（山腳不會伸到旁邊的田園、步道上），山頂平台大小不變
      if (baseR > 0 && t < 0.8) rr = rTop + (baseR - rTop) * Math.pow(1 - t / 0.8, 1.2);
      if (t > 0.8) rr *= Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.8) / 0.2, 2))) * (1 - flatTop) + flatTop;
      pts.push(new THREE.Vector2(Math.max(0.05, rr), t * h));
    }
    const geo = new THREE.LatheGeometry(pts, 18);
    const p = geo.attributes.position as THREE.BufferAttribute;
    const colors: number[] = [];
    const low = new THREE.Color(0x8c8775);
    const mid = new THREE.Color(0x5f8a4e);
    const top = new THREE.Color(0x7aa35a);
    const c = new THREE.Color();
    for (let k = 0; k < p.count; k++) {
      const y = p.getY(k);
      const ang = Math.atan2(p.getZ(k), p.getX(k));
      const j = 1 + Math.sin(ang * 3 + seed) * 0.07 + Math.sin(ang * 7 + y * 0.08) * 0.05 + (rand() - 0.5) * 0.05;
      p.setXYZ(k, p.getX(k) * j, y * (1 + (rand() - 0.5) * 0.02), p.getZ(k) * j);
      const t = y / h;
      c.copy(low).lerp(mid, Math.min(1, t * 2.4));
      if (t > 0.55) c.lerp(top, (t - 0.55) / 0.45);
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }

  /** 第一層：32 座閉合環形山，圍成盆地 */
  private buildMountainRing(trees: TreeBatch) {
    const mats = getStyleMaterials();
    const g = new THREE.Group();
    const ef = BASIN_LANDMARKS.eastFalls;
    for (const pk of MOUNTAIN_RING) {
      if (pk.kind === 'westPlateau') continue;
      const geo = this.mountainGeometry(pk.r, pk.h, pk.i * 7 + 3);
      // 東山飛瀑（pk.i === 1 及相鄰山峰）：在洞口水道範圍內把山腳頂點往上拱起，留出可讓遊船直接駛入水濂洞的拱門隧道
      if (pk.i === 1 || pk.i === 0 || pk.i === 2) {
        const pos = geo.attributes.position as THREE.BufferAttribute;
        for (let vi = 0; vi < pos.count; vi++) {
          const wx = pk.x + pos.getX(vi);
          const wy = -2 + pos.getY(vi);
          const wz = pk.z + pos.getZ(vi);
          const dz = Math.abs(wz - ef.caveZ);
          if (dz < 11.5 && wx < ef.faceX + 27.5 && wy < 9.5) {
            const archH = Math.max(0, Math.cos((dz / 11.5) * (Math.PI / 2)) * 8.2);
            if (wy < archH) {
              pos.setY(vi, archH + 2.2);
            }
          }
        }
        geo.computeVertexNormals();
      }
      const m = new THREE.Mesh(geo, this.mountainMat);
      m.position.set(pk.x, -2, pk.z);
      g.add(m);
      // 山腳的松樹
      const rand = seeded(pk.i + 11);
      for (let k = 0; k < 5; k++) {
        const a = Math.atan2(-pk.z, -pk.x) + (rand() - 0.5) * 1.6;
        const rr = pk.r * (0.82 + rand() * 0.12);
        const tx = pk.x + Math.cos(a) * rr;
        const tz = pk.z + Math.sin(a) * rr;
        if (Math.abs(tz - ef.caveZ) < 10 && tx > 110) continue;
        trees.add(rand() > 0.3 ? 'pine' : 'green', tx, 1 + rand() * 2, tz, 1.3 + rand() * 0.8);
      }
    }
    mergeByMaterial(g, false);
    this.root.add(g);

    // 西側塔樓平頂山台＋五層塔
    const wp = BASIN_LANDMARKS.westPlateau;
    const plat = new THREE.Group();
    plat.position.set(wp.x, 0, wp.z);
    const plateauTop = 30;
    plat.add(new THREE.Mesh(this.mountainGeometry(wp.r * 1.25, plateauTop + 2, 161, 0.72, 28), this.mountainMat));
    plat.children[0].position.y = -2;
    const lawn = new THREE.Mesh(new THREE.CircleGeometry(wp.r * 1.25 * 0.33, 32).rotateX(-Math.PI / 2), mats.grass);
    lawn.position.y = plateauTop - 0.15;
    plat.add(lawn);
    this.root.add(plat);
    this.buildPagoda(wp.x + 2, wp.z, plateauTop, trees);

    // 北山飛瀑：上下兩疊瀑布，中間一層岩台與水潭
    // 瀑布貼著山壁的實際表面往下流（用射線量山壁位置，水幕不會被山體蓋住）
    g.updateWorldMatrix(true, true);
    const nf = BASIN_LANDMARKS.northFalls;
    const north = { base: new THREE.Vector3(nf.x, 0, nf.faceZ + 60), dir: new THREE.Vector3(0, 0, -1), side: new THREE.Vector3(1, 0, 0) };
    const ledgeZ = this.surfaceAt(g, north.base, north.dir, 24);
    const ledge = new THREE.Mesh(cliffGeometry(9, 5, 11, 7, 3, 77, 24, 3), mats.rock);
    ledge.position.set(nf.x, 21.5, ledgeZ.z + 3.5);
    this.root.add(ledge);
    this.addConformingFall(g, north, 50, 24.6, 9, 1.0);
    // 下層瀑布：分開的水幕只保留在北山飛瀑；水濂洞主入口位於東山飛瀑。
    {
      const lb = north.base.clone().setZ(ledgeZ.z + 60);
      this.addConformingFall(g, { ...north, base: lb }, 21.6, 6.8, 13, 1.4, 0, 0);
      for (const sx of [-1, 1]) this.addConformingFall(g, { ...north, base: lb.clone().setX(lb.x + sx * 4.6) }, 7.0, -0.3, 4.6, 1.4, 0, 0.4);
      this.addConformingFall(g, { ...north, base: lb }, 7.0, -0.3, 4.6, 1.6, 99, 0);
    }

    // 東山飛瀑與水濂洞：水瀑自崖頂 36m 直瀉入湖（-0.3m），水濂完整遮覆洞門，水濂洞隱藏於飛瀑水幕之後，船隻與遊人可穿瀑而入，別有洞天
    const eastFallAt = { base: new THREE.Vector3(ef.faceX - 60, 0, ef.caveZ), dir: new THREE.Vector3(1, 0, 0), side: new THREE.Vector3(0, 0, 1) };
    {
      // 兩側山壁輔助水簾
      for (const side of [-1, 1]) this.addConformingFall(g, { ...eastFallAt, base: eastFallAt.base.clone().setZ(ef.caveZ + side * 6.8) }, 36, -0.3, 5.2, 1.0);
      // 正面主瀑布：自 36m 頂峰一路垂落至湖面 -0.3m，不挖除洞前水流，將水濂洞完整隱藏在磅礡水瀑之後
      this.addConformingFall(g, eastFallAt, 36, -0.3, 8.8, 1.1, 0, 0.75);
      const waterBase = new THREE.Vector3(ef.faceX - 48, 0, ef.caveZ);
      for (const side of [-1, 1]) this.addConformingFall(g, { base: waterBase.clone().setZ(ef.caveZ + side * 6.8), dir: new THREE.Vector3(1, 0, 0), side: new THREE.Vector3(0, 0, 1) }, 18, -0.3, 3.6, 1.0);
      const cg = new THREE.Group();
      cg.name = 'shuilian_cave';
      cg.position.set(ef.faceX, -0.1, ef.caveZ);
      cg.rotation.y = -Math.PI / 2;
      this.root.add(cg);
      const darkMat = new THREE.MeshBasicMaterial({ color: 0x05090c });
      const rockMat = mats.rock;
      // 洞口薄水簾（半透明水幕，船可直接穿過，不會擋住視線或船隻）
      const curtainTex = waterfallTexture().clone();
      curtainTex.needsUpdate = true;
      curtainTex.wrapS = curtainTex.wrapT = THREE.RepeatWrapping;
      curtainTex.repeat.set(2.2, 1.8);
      const curtainMat = new THREE.MeshBasicMaterial({
        map: curtainTex,
        color: 0xdff6ff,
        transparent: true,
        opacity: 0.36,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      this.waterfalls.push(curtainMat);
      this.ownedTextures.push(curtainTex);
      const curtain = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 6.6), curtainMat);
      curtain.position.set(0, 3.1, 0.25);
      cg.add(curtain);
      // 洞口外岩石拱門（加寬至半徑 5.4m，讓遊船雙向進出順暢）
      const frame = new THREE.Mesh(new THREE.TorusGeometry(5.4, 0.95, 12, 32, Math.PI), rockMat);
      frame.scale.set(1.05, 1.18, 1.35);
      frame.position.set(0, 0.1, 0.2);
      cg.add(frame);
      for (const sx of [-1, 1]) {
        const jamb = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.2, 2.4), rockMat);
        jamb.position.set(sx * 5.4, 0.9, 0.2);
        cg.add(jamb);
      }
      const tunnelMat = new THREE.MeshStandardMaterial({ color: 0x1c252c, roughness: 0.92, side: THREE.DoubleSide });
      // 洞底低於水面（y = -1.25），讓湖水自然延伸進水濂洞內形成地下水道
      const floor = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.5, 26), tunnelMat);
      floor.position.set(0, -1.25, -13);
      cg.add(floor);
      // 洞內兩側石岸平台與鐘乳石柱
      for (const sx of [-1, 1]) {
        const bank = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 24), rockMat);
        bank.position.set(sx * 5.1, -0.15, -13);
        cg.add(bank);
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.9, 6.8, 26), tunnelMat);
        wall.position.set(sx * 6.0, 2.5, -13);
        cg.add(wall);
      }
      const roof = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.9, 26), tunnelMat);
      roof.position.set(0, 6.0, -13);
      cg.add(roof);
      // 洞底最深處的玄武岩壁與「別有洞天」仙石秘境
      const backWall = new THREE.Mesh(new THREE.CircleGeometry(6.2, 32, 0, Math.PI), darkMat);
      backWall.scale.y = 1.15;
      backWall.position.set(0, 0.1, -25.8);
      cg.add(backWall);
      for (let k = 0; k < 7; k++) {
        const sx = ((k % 2 === 0 ? -1 : 1) * (2.2 + (k % 3) * 1.1));
        const stal = new THREE.Mesh(new THREE.ConeGeometry(0.38 + (k % 3) * 0.12, 1.5 + (k % 2) * 0.6, 7), rockMat);
        stal.rotation.x = Math.PI;
        stal.position.set(sx, 5.2, -4 - k * 3.1);
        cg.add(stal);
      }
      for (const z of [-4.5, -11, -17.5, -23]) {
        const lantern = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x70d7e8, transparent: true, opacity: 0.48, depthWrite: false, blending: THREE.AdditiveBlending }));
        lantern.scale.set(3.8, 4.2, 1);
        lantern.position.set(0, 3.2, z);
        cg.add(lantern);
      }
      // 洞內深處石壇與仙石彩蛋
      const altar = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 0.8, 12), rockMat);
      altar.position.set(0, 0.1, -22.2);
      cg.add(altar);
      const magicStone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.72, 1), mats.gold);
      magicStone.position.set(0, 0.95, -22.2);
      cg.add(magicStone);
      cg.add(makePickProxy(2.4, 2.4, 2.4, 0, -22.2, 0, { kind: 'egg', egg: 'stoneEgg', maxDist: 45 }, 0.8));
      const innerTex = signboardTexture('別有洞天', '花果山福地・水簾洞洞天');
      const innerPlaque = new THREE.Mesh(
        new THREE.PlaneGeometry(3.6, 1.1),
        new THREE.MeshStandardMaterial({ map: innerTex, emissive: 0xffffff, emissiveMap: innerTex, emissiveIntensity: 0.65, roughness: 0.5 })
      );
      innerPlaque.position.set(0, 3.8, -24.8);
      innerPlaque.userData.noMerge = true;
      cg.add(innerPlaque);
      const tex = signboardTexture('水濂洞', '東山飛瀑・乘舟入洞');
      const plaque = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 1.15), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.5, roughness: 0.6 }));
      plaque.position.set(0, 7.2, 3.6);
      plaque.userData.noMerge = true;
      cg.add(plaque);
      cg.add(makePickProxy(6.4, 5.6, 1.2, 0, 2.2, 0, { kind: 'egg', egg: 'shuilian', maxDist: 260 }, 0.1));
    }

    // 南山洞口：水道一路通進山腳的大溶洞
    const sc = BASIN_LANDMARKS.southCave;
    const cave = new THREE.Group();
    cave.position.set(0, 0, sc.faceZ + 3);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(10, 2.6, 8, 24, Math.PI), mats.rock);
    arch.scale.set(1, 1.15, 1.4);
    cave.add(arch);
    const dark = new THREE.Mesh(new THREE.CircleGeometry(10, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x07080a }));
    dark.position.z = 1.5;
    dark.rotation.y = Math.PI;
    dark.scale.y = 1.15;
    // 彩蛋：南山洞口（初極狹，纔通人…）
    dark.userData.pick = { kind: 'egg', egg: 'cave', maxDist: 260 };
    cave.add(dark);
    cave.position.y = -0.4;
    this.root.add(cave);
    const lan = new LanternBatch();
    for (const sx of [-1, 1]) lan.addPost(sx * 13, 0.2, sc.faceZ - 2, 2.6);
    this.root.add(lan.build());

    // 山腰的雲霧（坐看雲起時）
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const r = 150 + (i % 3) * 8;
      const sp = new THREE.Sprite(this.cloudMat);
      sp.position.set(Math.cos(a) * r * 1.08, 22 + (i % 4) * 5, Math.sin(a) * r * 0.94);
      sp.scale.set(70, 22, 1);
      // 彩蛋：山腰雲霧（坐看雲起時）：登上山台或塔頂才點得到
      sp.userData.pick = { kind: 'egg', egg: 'mist', maxDist: 260, minY: 20 };
      this.root.add(sp);
    }
  }

  /** 第二層：盆地外更遠、更高的峰林（被霧淡化，增加層次） */
  private buildDistantPeaks(rand: () => number) {
    const g = new THREE.Group();
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2 + rand() * 0.1;
      const dist = 300 + rand() * 200;
      const h = 90 + rand() * 90;
      const geo = this.mountainGeometry(h * 0.42, h, 500 + i);
      geo.translate(Math.cos(a) * dist, -3, Math.sin(a) * dist);
      g.add(new THREE.Mesh(geo, this.mountainMat));
    }
    mergeByMaterial(g, false);
    this.root.add(g);
  }

  /** 一段瀑布（從 topY 落到 bottomY），x,z 是瀑布頂端、faceYaw 是水流朝向 */
  /** 從盆地這側往山的方向打射線，回傳某高度上山壁表面的位置（沒打到就回傳很遠的地方） */
  private surfaceAt(target: THREE.Object3D, base: THREE.Vector3, dir: THREE.Vector3, y: number) {
    const rc = new THREE.Raycaster(new THREE.Vector3(base.x, y, base.z), dir, 0, 200);
    const hit = rc.intersectObject(target, true)[0];
    return hit ? hit.point.clone() : new THREE.Vector3(base.x, y, base.z).addScaledVector(dir, 60);
  }

  /** 貼著山壁的瀑布水幕：每一段高度量一次山壁，往外留 gap 公尺 */
  private addConformingFall(
    target: THREE.Object3D,
    at: { base: THREE.Vector3; dir: THREE.Vector3; side: THREE.Vector3 },
    topY: number,
    bottomY: number,
    width: number,
    gap: number,
    thinBelow = 0,
    mistOpacity = 0.6
  ) {
    const n = 16;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i++) {
      const y = topY - ((topY - bottomY) * i) / n;
      pts.push(this.surfaceAt(target, at.base, at.dir, y).addScaledVector(at.dir, -gap));
    }
    // 水幕不能往山裡縮：每一點至少和上一點一樣往外
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1].dot(at.dir);
      const cur = pts[i].dot(at.dir);
      if (cur > prev) pts[i].addScaledVector(at.dir, prev - cur);
    }
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    const col: number[] = [];
    let len = 0;
    for (let i = 0; i <= n; i++) {
      if (i > 0) len += pts[i].distanceTo(pts[i - 1]);
      const w = width * (1 + (i / n) * 0.35);
      for (const sx of [-1, 1]) {
        const p = pts[i].clone().addScaledVector(at.side, (sx * w) / 2);
        pos.push(p.x, p.y, p.z);
        // 下段水幕變薄（看得見後面的水濂洞）
        const al = thinBelow > 0 ? (p.y < thinBelow ? 0.14 : p.y < thinBelow + 2 ? 0.14 + ((p.y - thinBelow) / 2) * 0.86 : 1) : 1;
        col.push(1, 1, 1, al);
        uv.push(((sx + 1) / 2) * (width / 6), -len / 10);
      }
      if (i < n) {
        const a = i * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const tex = waterfallTexture().clone();
    tex.needsUpdate = true;
    this.ownedTextures.push(tex);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, color: 0xffffff, vertexColors: true });
    this.waterfalls.push(mat);
    const fallMesh = new THREE.Mesh(geo, mat);
    // 彩蛋：飛瀑（垂涎三尺…）
    fallMesh.userData.pick = { kind: 'egg', egg: 'waterfall', maxDist: 220 };
    this.root.add(fallMesh);
    const bottom = pts[n];
    const mist = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffffff, transparent: true, opacity: mistOpacity, depthWrite: false }));
    mist.scale.set(width * 2.4, width * 1.3, 1);
    mist.position.copy(bottom).addScaledVector(at.dir, -1.5);
    mist.position.y = bottomY + 1.2;
    this.root.add(mist);
  }

  private addFallSegment(x: number, z: number, topY: number, bottomY: number, width: number, faceYaw: number, tilt: number) {
    const tex = waterfallTexture().clone();
    tex.needsUpdate = true;
    const len = topY - bottomY;
    tex.repeat.set(width / 6, len / 10);
    this.ownedTextures.push(tex);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, color: 0xffffff });
    this.waterfalls.push(mat);
    const grp = new THREE.Group();
    grp.position.set(x, 0, z);
    grp.rotation.y = faceYaw;
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(width, len), mat);
    fall.userData.pick = { kind: 'egg', egg: 'waterfall', maxDist: 220 };
    fall.position.set(0, bottomY + len / 2, Math.sin(tilt) * len * 0.5);
    fall.rotation.x = -tilt;
    grp.add(fall);
    const mist = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false }));
    mist.scale.set(width * 2.4, width * 1.3, 1);
    mist.position.set(0, bottomY + 1.2, Math.sin(tilt) * len + 1);
    grp.add(mist);
    this.root.add(grp);
  }

  private buildPagoda(cx: number, cz: number, top: number, trees: TreeBatch) {
    const mats = getStyleMaterials();
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    const base = new THREE.Mesh(scaledBox(11, 1.2, 11, 2, 1.2, 2), mats.stone);
    base.position.y = top + 0.6;
    g.add(base);
    let y = top + 1.2;
    for (let t = 0; t < 5; t++) {
      const s = 7.5 * (1 - t * 0.13);
      const bh = t === 0 ? 3.6 : 2.6;
      const deck = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.67, s * 0.7, 0.26, 8), mats.stoneLight);
      deck.position.y = y - 0.13;
      deck.rotation.y = Math.PI / 8;
      g.add(deck);
      const floor = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.61, s * 0.61, 0.08, 8), mats.woodFloor);
      floor.position.y = y - 0.04;
      floor.rotation.y = Math.PI / 8;
      g.add(floor);
      const postRadius = s * 0.52;
      // 1～4 層（t < 4）建造八角實心塔牆與朱漆門窗，避免只有柱子鏤空；頂層（t === 4）保留為開闊觀景台
      if (t < 4) {
        const wallR = postRadius * 0.96;
        const wallH = bh - 0.18;
        const wallCore = new THREE.Mesh(
          new THREE.CylinderGeometry(wallR, wallR, wallH, 8),
          mats.plaster,
        );
        wallCore.position.y = y + wallH * 0.5;
        wallCore.rotation.y = Math.PI / 8;
        g.add(wallCore);

        const baseSkirt = new THREE.Mesh(
          new THREE.CylinderGeometry(wallR * 1.015, wallR * 1.02, 0.24, 8),
          mats.stone,
        );
        baseSkirt.position.y = y + 0.12;
        baseSkirt.rotation.y = Math.PI / 8;
        g.add(baseSkirt);

        const midBelt = new THREE.Mesh(
          new THREE.CylinderGeometry(wallR * 1.012, wallR * 1.012, 0.14, 8),
          mats.redLacquer,
        );
        midBelt.position.y = y + wallH * 0.86;
        midBelt.rotation.y = Math.PI / 8;
        g.add(midBelt);

        const apothem = wallR * Math.cos(Math.PI / 8);
        const faceW = 2 * wallR * Math.sin(Math.PI / 8);
        for (let f = 0; f < 8; f++) {
          const faceAng = (f / 8) * Math.PI * 2;
          const fx = Math.cos(faceAng) * (apothem + 0.03);
          const fz = Math.sin(faceAng) * (apothem + 0.03);
          const isCardinal = f % 2 === 0;
          const panelW = faceW * (isCardinal ? 0.52 : 0.44);
          const panelH = wallH * (isCardinal ? 0.66 : 0.46);
          const panelY = y + (isCardinal ? panelH * 0.5 + 0.22 : wallH * 0.52);

          const frame = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, panelH + 0.16, panelW + 0.16),
            mats.darkWood,
          );
          frame.position.set(fx, panelY, fz);
          frame.rotation.y = -faceAng;
          g.add(frame);

          const inset = new THREE.Mesh(
            new THREE.BoxGeometry(0.13, panelH, panelW),
            t === 0 && isCardinal ? mats.door : mats.lampPaper,
          );
          inset.position.set(fx, panelY, fz);
          inset.rotation.y = -faceAng;
          g.add(inset);
        }
      }
      // 頂層（t === 4，觀景台）：不建擋住東側（+X）遠眺五島與湖面的前排柱子，頂層其餘柱樑標記 pagoda-top-roof，登上塔頂眺望時自動隱藏，確保 360° 全無視線遮擋
      for (let p = 0; p < 8; p++) {
        const a = (p / 8) * Math.PI * 2 + Math.PI / 8;
        if (t === 4 && Math.cos(a) > -0.2) continue; // 移除正面與兩側擋人視線的柱子
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.2 - t * 0.012, 0.24 - t * 0.012, bh - 0.35, 8), mats.redLacquer);
        col.position.set(Math.cos(a) * postRadius, y + (bh + 0.25) / 2, Math.sin(a) * postRadius);
        if (t === 4) {
          col.name = 'pagoda-top-roof';
          col.userData.noMerge = true;
        }
        g.add(col);
        const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.31 - t * 0.015, 0.31 - t * 0.015, 0.12, 8), mats.gold);
        collar.position.set(Math.cos(a) * postRadius, y + 0.42, Math.sin(a) * postRadius);
        if (t === 4) {
          collar.name = 'pagoda-top-roof';
          collar.userData.noMerge = true;
        }
        g.add(collar);
      }
      const beamRing = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.62, s * 0.62, 0.32, 8), mats.redLacquer);
      beamRing.position.y = y + bh - 0.18;
      beamRing.rotation.y = Math.PI / 8;
      if (t === 4) {
        beamRing.name = 'pagoda-top-roof';
        beamRing.userData.noMerge = true;
      }
      g.add(beamRing);
      // 頂層觀景台周圍設置低矮雕花欄杆（低於胸口，不擋視線）
      if (t === 4) {
        for (let p = 0; p < 8; p++) {
          const a = (p / 8) * Math.PI * 2 + Math.PI / 8;
          const aNext = ((p + 1) / 8) * Math.PI * 2 + Math.PI / 8;
          const x1 = Math.cos(a) * postRadius;
          const z1 = Math.sin(a) * postRadius;
          const x2 = Math.cos(aNext) * postRadius;
          const z2 = Math.sin(aNext) * postRadius;
          const mx = (x1 + x2) / 2;
          const mz = (z1 + z2) / 2;
          const segLen = Math.hypot(x2 - x1, z2 - z1);
          const segYaw = Math.atan2(x2 - x1, z2 - z1);
          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, segLen), mats.redLacquer);
          rail.position.set(mx, y - bh + 0.32, mz);
          rail.rotation.y = segYaw;
          g.add(rail);
        }
      }
      y += bh;
      const last = t === 4;
      const roof = buildRoofTier(s, s, { rise: last ? 3.2 : 1.3, overhang: 1.5, curl: 0.9, theme: 'red', ridge: last, finial: last });
      roof.position.y = y;
      // 最上面兩層屋簷：人在塔頂眺望時會暫時藏起來，風景不會被屋簷擋住
      if (t >= 3) {
        roof.name = 'pagoda-top-roof';
        roof.traverse((o) => (o.userData.noMerge = true));
      }
      g.add(roof);
      y += last ? 0 : 0.55;
    }
    // 聚雲塔入口下方保持開闊，不另設亭廊遮擋塔身與山景。
    const lan = new LanternBatch();
    for (let t = 0; t < 5; t++) {
      const s = (7.5 * (1 - t * 0.13)) / 2 + 1.3;
      const yy = top + 1.2 + 3.6 + t * 3.15 - 0.2;
      for (let p = 0; p < 8; p += 2) {
        const a = (p / 8) * Math.PI * 2 + Math.PI / 8;
        lan.addHanging(Math.cos(a) * s, yy, Math.sin(a) * s, 0.72);
      }
    }
    g.add(lan.build());
    const rand = seeded(5);
    const kinds: TreeKind[] = ['pine', 'cherry', 'green', 'cherry'];
    for (let i = 0; i < 16; i++) {
      const a = rand() * Math.PI * 2;
      const r = 8 + rand() * 4;
      trees.add(kinds[i % kinds.length], cx + Math.cos(a) * r, top, cz + Math.sin(a) * r, 1 + rand() * 0.5);
    }
    mergeByMaterial(g);
    this.root.add(g);
  }

  /** 田園陸地：岩岸＋草地＋田埂分隔的稻田、水田、油菜花、茶園，點綴農舍、水車、草垛與樹 */
  private buildFarmlands(trees: TreeBatch) {
    const mats = getStyleMaterials();
    const farmMat = new THREE.MeshStandardMaterial({ map: farmlandTexture(), roughness: 0.9 });
    const g = new THREE.Group();
    const houses = new THREE.Group();
    const lan = new LanternBatch();
    const hayGeo = new THREE.ConeGeometry(0.9, 1.6, 10);
    const hayMat = new THREE.MeshStandardMaterial({ color: 0xd9b45a, roughness: 1 });
    FARMLANDS.forEach((l, li) => {
      const outline = landOutline(l);
      const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, z)));
      // 岩岸（往下延伸到水下）
      const side = new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: true, bevelSize: 1.2, bevelThickness: 0.5, bevelSegments: 2, curveSegments: 24 });
      side.rotateX(Math.PI / 2);
      const sideMesh = new THREE.Mesh(side, [mats.grass, mats.rock]);
      // 陸地頂面比田地低一點（原本兩者同高 y=0.5，重疊會閃爍）
      sideMesh.position.y = -0.14;
      g.add(sideMesh);
      // 田地（比陸地小一圈，留草地邊）
      const inner = landOutline({ ...l, rx: l.rx * 0.84, rz: l.rz * 0.84 });
      const fshape = new THREE.Shape(inner.map(([x, z]) => new THREE.Vector2(x, z)));
      const fgeo = new THREE.ShapeGeometry(fshape, 24);
      fgeo.rotateX(Math.PI / 2);
      const uv = fgeo.attributes.uv as THREE.BufferAttribute;
      const p = fgeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 26, p.getZ(i) / 26);
      // ShapeGeometry 旋轉後法線朝下，翻面
      const idx = fgeo.index!;
      for (let i = 0; i < idx.count; i += 3) {
        const a0 = idx.getX(i + 1);
        idx.setX(i + 1, idx.getX(i + 2));
        idx.setX(i + 2, a0);
      }
      fgeo.computeVertexNormals();
      const field = new THREE.Mesh(fgeo, farmMat);
      field.position.y = 0.5;
      field.receiveShadow = true;
      g.add(field);

      const rand = seeded(Math.round(l.seed * 100));
      // 農舍（白牆黑瓦）；位置與田園動物、炊煙共用 farmHouseLayout
      for (const fh of farmHouseLayout(l, rand, li)) {
        const { x, z, yaw, w, d } = fh;
        const hg = new THREE.Group();
        hg.position.set(x, 0.5, z);
        hg.rotation.y = yaw;
        const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 2.6, d), mats.plaster);
        wall.position.y = 1.3;
        hg.add(wall);
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.7, 0.1), mats.darkWood);
        door.position.set(0, 0.85, d / 2 + 0.02);
        hg.add(door);
        const roof = buildRoofTier(w, d, { rise: 1.3, overhang: 0.7, curl: 0.35, theme: 'slate', lite: true });
        roof.position.y = 2.6;
        hg.add(roof);
        if (fh.chimney) {
          // 灶間煙囪（傍晚飄炊煙）
          const ch = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.9, 0.5), mats.plaster);
          ch.position.set(w * 0.25, 2.6 + 0.8, -d * 0.12);
          hg.add(ch);
          const cap = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.7), mats.darkWood);
          cap.position.set(w * 0.25, 2.6 + 1.78, -d * 0.12);
          hg.add(cap);
        }
        houses.add(hg);
        lan.addHanging(x + Math.sin(yaw) * (d / 2 + 0.4), 2.2, z + Math.cos(yaw) * (d / 2 + 0.4), 0.7);
      }
      // 草垛
      for (let k = 0; k < 3; k++) {
        const a = rand() * Math.PI * 2;
        const rr = 0.3 + rand() * 0.45;
        const hay = new THREE.Mesh(hayGeo, hayMat);
        hay.position.set(l.cx + Math.cos(a) * l.rx * rr, 1.3, l.cz + Math.sin(a) * l.rz * rr);
        g.add(hay);
      }
      // 樹：沿陸地外緣
      for (let k = 0; k < Math.round((l.rx + l.rz) / 4); k++) {
        const [x, z] = outline[Math.floor(rand() * outline.length)];
        const ix = l.cx + (x - l.cx) * 0.9;
        const iz = l.cz + (z - l.cz) * 0.9;
        trees.add((['cherry', 'green', 'green', 'pine', 'maple'] as TreeKind[])[k % 5], ix, 0.36, iz, 1 + rand() * 0.6);
      }
      // 水車（朝向盆地中央的岸邊）
      if (li % 2 === 0) {
        const toC = Math.atan2(-l.cz, -l.cx);
        let best = outline[0];
        let bd = -Infinity;
        for (const pt of outline) {
          const d = Math.cos(Math.atan2(pt[1] - l.cz, pt[0] - l.cx) - toC);
          if (d > bd) {
            bd = d;
            best = pt;
          }
        }
        const wheel = new THREE.Group();
        wheel.position.set(best[0] + Math.cos(toC) * 1.5, 1.4, best[1] + Math.sin(toC) * 1.5);
        wheel.rotation.y = -toC;
        const rim = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.16, 6, 20), mats.darkWood);
        wheel.add(rim);
        for (let k = 0; k < 8; k++) {
          const sp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4.4, 0.12), mats.darkWood);
          sp.rotation.z = (k / 8) * Math.PI;
          wheel.add(sp);
          const pad = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.9), mats.darkWood);
          pad.position.set(Math.cos((k / 8) * Math.PI * 2) * 2.2, Math.sin((k / 8) * Math.PI * 2) * 2.2, 0);
          pad.rotation.z = (k / 8) * Math.PI * 2;
          wheel.add(pad);
        }
        const holder = new THREE.Group();
        holder.add(wheel);
        this.root.add(holder);
        this.waterwheels.push(wheel);
      }
    });
    mergeByMaterial(g);
    mergeByMaterial(houses);
    this.root.add(g, houses, lan.build());
  }

  private buildLotus(cx: number, cz: number, radius: number, n: number) {
    const rand = seeded(Math.round(cx * 7 + cz * 13));
    const padMat = this.lotusPadMat || (this.lotusPadMat = new THREE.MeshStandardMaterial({ map: lotusPadTexture(), transparent: true, alphaTest: 0.4, roughness: 0.7, side: THREE.DoubleSide }));
    const pads = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.6, 1.6).rotateX(-Math.PI / 2), padMat, n);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * radius;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2);
      const s = 0.6 + rand() * 0.9;
      pads.setMatrixAt(i, m.compose(new THREE.Vector3(cx + Math.cos(a) * r, -0.3, cz + Math.sin(a) * r), q, new THREE.Vector3(s, 1, s)));
    }
    this.root.add(pads);
  }

  private buildLakePavilion(cx: number, cz: number) {
    const mats = getStyleMaterials();
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    const deck = new THREE.Mesh(scaledBox(9, 0.4, 9, 2.5, 0.4, 2.5), mats.woodFloor);
    deck.position.y = 0.5;
    g.add(deck);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.2, 6), mats.darkWood);
      pile.position.set(sx * 4, -0.6, sz * 4);
      g.add(pile);
    }
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 3.4, 10), mats.redLacquer);
      col.position.set(sx * 3, 2.4, sz * 3);
      g.add(col);
    }
    // 欄杆：北側留出入口與橋堤相連，東、西、南三側完整圍起，無後方棧道
    const northLeft = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.7, 0.14), mats.redLacquer);
    northLeft.position.set(-2.85, 1.05, -4.2);
    g.add(northLeft);
    const northRight = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.7, 0.14), mats.redLacquer);
    northRight.position.set(2.85, 1.05, -4.2);
    g.add(northRight);
    const southRail = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.7, 0.14), mats.redLacquer);
    southRail.position.set(0, 1.05, 4.2);
    g.add(southRail);
    for (const sx of [-4.2, 4.2]) {
      const sideRail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.7, 8.4), mats.redLacquer);
      sideRail.position.set(sx, 1.05, 0);
      g.add(sideRail);
    }
    const beam = new THREE.Mesh(scaledBox(6.6, 0.4, 6.6, 3, 0.4, 3), mats.redLacquer);
    beam.position.y = 4.0;
    g.add(beam);
    const roof = buildRoofTier(6, 6, { rise: 2.6, overhang: 1.4, curl: 1.1, theme: 'teal', finial: true });
    roof.position.y = 4.2;
    g.add(roof);
    mergeByMaterial(g);
    const lan = new LanternBatch();
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lan.addHanging(sx * 4.1, 3.6, sz * 4.1, 0.95);
    lan.addHanging(0, 3.3, 0, 1.2);
    g.add(lan.build());
    this.root.add(g);

    // 荷葉與荷花
    const rand = seeded(61);
    const padMat = new THREE.MeshStandardMaterial({ map: lotusPadTexture(), transparent: true, alphaTest: 0.4, roughness: 0.7, side: THREE.DoubleSide });
    const padGeo = new THREE.PlaneGeometry(1.6, 1.6).rotateX(-Math.PI / 2);
    const pads = new THREE.InstancedMesh(padGeo, padMat, 150);
    const flowerGeo = new THREE.ConeGeometry(0.28, 0.5, 6, 1, true).rotateX(Math.PI);
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xf6a5c3, emissive: 0x5a1a2c, emissiveIntensity: 0.3, roughness: 0.6, side: THREE.DoubleSide });
    const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, 30);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    let fi = 0;
    for (let i = 0; i < 150; i++) {
      const a = rand() * Math.PI * 2;
      const r = 6 + rand() * 18;
      const x = cx + Math.cos(a) * r * 1.3;
      const z = cz + Math.sin(a) * r * 0.75 - 2;
      const s = 0.6 + rand() * 0.9;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2);
      pads.setMatrixAt(i, m.compose(new THREE.Vector3(x, -0.3, z), q, new THREE.Vector3(s, 1, s)));
      if (fi < 30 && rand() > 0.72) {
        flowers.setMatrixAt(fi++, m.compose(new THREE.Vector3(x + 0.2, 0.05, z + 0.1), q, new THREE.Vector3(1, 1, 1)));
      }
    }
    flowers.count = fi;
    this.root.add(pads, flowers);
  }

  /** 燈籠泛光強度（依時段） */
  get bloomStrength() {
    return PRESETS[this.timeOfDay].bloom;
  }

  /** 泛光門檻：黃昏、夜裡燈籠更容易暈開 */
  get bloomThreshold() {
    return this.timeOfDay === 'night' ? 0.8 : this.timeOfDay === 'dusk' ? 0.9 : 0.95;
  }

  /** 調色（後製）：飽和度、對比、暗部／亮部色偏、暗角 */
  get grade() {
    const t = this.timeOfDay;
    const rain = this.weather === 'rain';
    if (t === 'night') return { sat: 1.06, contrast: 1.06, shadow: [0.0, 0.02, 0.07], high: [0.06, 0.035, 0.0], vignette: 0.42 };
    if (t === 'dusk') return { sat: rain ? 1.0 : 1.14, contrast: 1.07, shadow: [0.03, 0.0, 0.045], high: [0.07, 0.035, -0.01], vignette: 0.34 };
    return { sat: rain ? 0.92 : 1.1, contrast: 1.06, shadow: [-0.005, 0.01, 0.035], high: [0.045, 0.03, 0.0], vignette: 0.26 };
  }

  setTimeOfDay(t: TimeOfDay) {
    this.timeOfDay = t;
    faunaEnv.tod = t;
    this.life?.setTimeOfDay(t);
    const p = PRESETS[t];
    const mats = getStyleMaterials();
    const sd = new THREE.Vector3(...p.sunDir).normalize();
    this.skyMat.uniforms.uTop.value.setHex(p.top);
    this.skyMat.uniforms.uHorizon.value.setHex(p.horizon);
    this.skyMat.uniforms.uBottom.value.setHex(p.bottom);
    this.skyMat.uniforms.uSunDir.value.copy(sd);
    this.skyMat.uniforms.uSunColor.value.setHex(p.sunColor);
    this.skyMat.uniforms.uGlow.value = p.skyGlow;
    this.scene.background = new THREE.Color(p.horizon);
    this.scene.fog = new THREE.Fog(p.fog, p.fogNear, p.fogFar);
    this.hemi.color.setHex(p.hemiSky);
    this.hemi.groundColor.setHex(p.hemiGround);
    this.hemi.intensity = p.hemiIntensity;
    this.ambient.intensity = p.ambient;
    this.sun.color.setHex(p.sunColor);
    this.sun.intensity = p.sunIntensity;
    this.sunDir.copy(sd);
    const w = this.waterMat.uniforms;
    w.uDeep.value.setHex(p.deep);
    w.uShallow.value.setHex(p.shallow);
    w.uSky.value.setHex(p.waterSky);
    w.uSkyTop.value.setHex(p.top);
    w.uSkyHorizon.value.setHex(p.horizon);
    w.uFoam.value.setHex(t === 'night' ? 0x8fa3c8 : t === 'dusk' ? 0xffe8d0 : 0xf4fbff);
    w.uFoamAmt.value = t === 'night' ? 0.12 : t === 'dusk' ? 0.3 : 0.34;
    w.uSunDir.value.copy(sd);
    w.uSunColor.value.setHex(p.sunColor);
    w.uGlint.value = p.glint;
    w.uNight.value = t === 'night' ? 1.0 : t === 'dusk' ? 0.35 : 0.0;
    mats.lanternBody.emissiveIntensity = p.lantern;
    mats.lampPaper.emissiveIntensity = p.lamp;
    mats.facades.forEach((f) => (f.emissiveIntensity = p.windows));
    mats.templeFacade.emissiveIntensity = p.windows;
    mats.glow.opacity = p.glowOpacity;
    mats.glow.size = p.glowSize;
    mats.orb.emissiveIntensity = p.orb;
    mats.bulbGlass.emissiveIntensity = 0.45 + p.orb * 0.25;
    mats.bulbRing.emissiveIntensity = 0.6 + p.orb * 0.2;
    this.renderer.toneMappingExposure = p.exposure;
    this.updateEnvironmentMap();
    (this.stars.material as THREE.PointsMaterial).opacity = p.stars;
    this.moon.visible = p.moon;
    this.moon.position.copy(sd).multiplyScalar(760);
    this.playerLamp.intensity = p.playerLamp;
    this.mountainMat.color.setHex(p.mountain);
    this.cloudMat.color.setHex(p.cloud);
    this.cloudMat.opacity = p.cloudOpacity;
    this.waterfalls.forEach((m) => m.color.setHex(t === 'night' ? 0x8fa6cc : t === 'dusk' ? 0xffe6cc : 0xffffff));
    if (t === 'night') {
      // 螢火蟲：顏色淡一點、少一點亮度，夜裡不刺眼
      this.petalMat.color.setHex(0x8fae55);
      this.petalMat.map = glowTexture();
      this.petalMat.blending = THREE.AdditiveBlending;
      this.petalMat.size = 0.26;
      this.petalMat.opacity = 0.45;
    } else {
      this.petalMat.color.setHex(0xffb7cf);
      this.petalMat.map = petalTexture();
      this.petalMat.blending = THREE.NormalBlending;
      this.petalMat.size = 0.22;
      this.petalMat.opacity = 1;
    }
    this.petalMat.needsUpdate = true;
  }

  private sunDir = new THREE.Vector3(0, 1, 0);
  private pmrem: THREE.PMREMGenerator | null = null;
  private envRT: THREE.WebGLRenderTarget | null = null;
  private envScene: THREE.Scene | null = null;
  public envIntensity = 0.45;

  /**
   * 環境光照（IBL）：用目前時段的天空做一張模糊的環境貼圖，琉璃瓦、漆木、銅器、石板會帶一點天光反射，
   * 暗面也會染上天空的色調（黃昏偏暖、夜裡偏藍）
   */
  private updateEnvironmentMap() {
    try {
      if (!this.pmrem) {
        this.pmrem = new THREE.PMREMGenerator(this.renderer);
        this.envScene = new THREE.Scene();
        const sky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), this.skyMat);
        this.envScene.add(sky);
        // 地面：盆地裡的草地與水面顏色
        const ground = new THREE.Mesh(new THREE.CircleGeometry(48, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x4f6a4a }));
        ground.position.y = -2;
        ground.userData.envGround = true;
        this.envScene.add(ground);
      }
      const g = this.envScene!.children.find((c) => c.userData.envGround) as THREE.Mesh | undefined;
      if (g) (g.material as THREE.MeshBasicMaterial).color.setHex(this.timeOfDay === 'night' ? 0x0c1424 : this.timeOfDay === 'dusk' ? 0x5a4a38 : 0x5a7050);
      const rt = this.pmrem.fromScene(this.envScene!, 0.04);
      this.envRT?.dispose();
      this.envRT = rt;
      this.scene.environment = rt.texture;
    } catch {
      // 不支援時就不用環境貼圖
    }
  }

  /** 把場景裡的材質設成合適的環境反射強度（載入新的島之後呼叫） */
  applyEnvIntensity(root: THREE.Object3D) {
    root.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (!m) return;
      for (const mm of Array.isArray(m) ? m : [m]) {
        const st = mm as THREE.MeshStandardMaterial;
        if (st.isMeshStandardMaterial && !st.userData.envSet) {
          // 招牌、佈告欄這類自己會亮的紙面：幾乎不吃環境光，避免白天整片反白看不清字
          st.envMapIntensity = st.emissiveMap ? 0.12 : this.envIntensity * (st.metalness > 0.3 ? 1.6 : 1);
          st.userData.envSet = true;
        }
      }
    });
  }

  /**
   * 即時倒影（精緻畫質）：用鏡像相機從水面下往上拍一張（解析度減半），水面 shader 依菲涅耳混進來
   * 和 three 的 Reflector 同一套算法（斜截投影把水面以下裁掉）
   */
  renderReflection(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const u = this.waterMat.uniforms;
    if (!this.reflections || !this.water || camera.position.y < this.water.position.y + 0.05) {
      u.uReflStrength.value = 0;
      return;
    }
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const w = Math.max(256, Math.floor(size.x * 0.5));
    const h = Math.max(256, Math.floor(size.y * 0.5));
    if (!this.reflRT) {
      this.reflRT = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 0 });
      u.tReflect.value = this.reflRT.texture;
    } else if (this.reflRT.width !== w || this.reflRT.height !== h) this.reflRT.setSize(w, h);
    const y0 = this.water.position.y;
    const vc = this.reflCam;
    // 鏡像相機：位置與視線對水面翻轉
    const cp = camera.getWorldPosition(new THREE.Vector3());
    const look = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())).add(cp);
    vc.position.set(cp.x, 2 * y0 - cp.y, cp.z);
    vc.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    vc.up.y = -vc.up.y;
    vc.lookAt(look.x, 2 * y0 - look.y, look.z);
    vc.far = camera.far;
    vc.updateMatrixWorld();
    vc.projectionMatrix.copy(camera.projectionMatrix);
    const tm = u.uReflMatrix.value as THREE.Matrix4;
    tm.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    tm.multiply(vc.projectionMatrix).multiply(vc.matrixWorldInverse);
    // 斜截投影：只畫水面以上的東西
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y0).applyMatrix4(vc.matrixWorldInverse);
    const clip = new THREE.Vector4(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
    const pm = vc.projectionMatrix;
    const q = new THREE.Vector4(
      (Math.sign(clip.x) + pm.elements[8]) / pm.elements[0],
      (Math.sign(clip.y) + pm.elements[9]) / pm.elements[5],
      -1,
      (1 + pm.elements[10]) / pm.elements[14]
    );
    clip.multiplyScalar(2 / clip.dot(q));
    pm.elements[2] = clip.x;
    pm.elements[6] = clip.y;
    pm.elements[10] = clip.z + 1 - 0.003;
    pm.elements[14] = clip.w;
    this.water.visible = false;
    const prevRT = renderer.getRenderTarget();
    const prevShadow = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(this.reflRT);
    renderer.clear();
    renderer.render(scene, vc);
    renderer.setRenderTarget(prevRT);
    renderer.shadowMap.autoUpdate = prevShadow;
    this.water.visible = true;
    u.uReflStrength.value = 0.9;
  }

  /** 開啟或關閉陰影（依畫質設定） */
  setShadows(on: boolean) {
    this.sun.castShadow = on;
  }

  update(dt: number, cam: THREE.Vector3) {
    this.time += dt;
    this.waterMat.uniforms.uTime.value = this.time;
    this.sky.position.copy(cam);
    this.stars.position.copy(cam);
    this.moon.position.copy(this.sunDir).multiplyScalar(760).add(cam);
    for (const m of this.waterfalls) if (m.map) m.map.offset.y = (this.time * 0.9) % 1;
    for (const w of this.waterwheels) w.rotation.z = -this.time * 0.6;
    this.playerLamp.position.set(cam.x, cam.y + 1.5, cam.z);
    this.sun.position.copy(this.sunDir).multiplyScalar(120).add(cam);
    this.sun.target.position.copy(cam);
    // 花瓣／螢火蟲
    const pos = this.petals.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const night = this.timeOfDay === 'night';
    for (let i = 0; i < pos.count; i++) {
      const sp = this.petalData[i * 4];
      const ph = this.petalData[i * 4 + 1];
      const sw = this.petalData[i * 4 + 2];
      let x = arr[i * 3];
      let y = arr[i * 3 + 1];
      let z = arr[i * 3 + 2];
      if (night) {
        x += Math.sin(this.time * sw + ph) * dt * 0.8;
        y += Math.cos(this.time * sw * 0.7 + ph) * dt * 0.5;
        z += Math.cos(this.time * sw + ph * 1.3) * dt * 0.8;
        if (y < 0.3) y = 0.3;
        if (y > 6) y = 6;
      } else {
        y -= sp * dt;
        x += (Math.sin(this.time * sw + ph) * 0.6 + 0.35) * dt;
        z += Math.cos(this.time * sw * 0.8 + ph) * 0.4 * dt;
        if (y < 0) y += 14;
      }
      // 以玩家為中心循環
      const rx = x - cam.x;
      const rz = z - cam.z;
      if (rx > 30) x -= 60;
      else if (rx < -30) x += 60;
      if (rz > 30) z -= 60;
      else if (rz < -30) z += 60;
      // 屋內與地下室不飄落花瓣或螢火蟲
      if (isUnderRoof(x, y, z)) {
        y = 11 + (i % 5);
      }
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
    this.petals.visible = cam.y > -1.5;
    pos.needsUpdate = true;
    this.life.update(dt, cam);
  }

  dispose() {
    this.scene.remove(this.root);
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else if (mat) mat.dispose();
    });
    this.ownedTextures.forEach((t) => t.dispose());
    disposeStyleMaterials();
    disposeStreetMaterials();
  }
}

