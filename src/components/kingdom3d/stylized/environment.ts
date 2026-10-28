import { WaterLife, WeatherType, isUnderRoof } from './waterLife';
import * as THREE from 'three';
import { disposeStreetMaterials } from './streets';
import { REGION_CONFIGS, localToWorldXZ } from '../regionConfigs';
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
} from './textures';
import { MOUNTAIN_RING, FARMLANDS, LOTUS_PATCHES, BASIN_LANDMARKS, landOutline } from './basinLayout';

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
    sunDir: [0.35, 0.75, -0.45], sunColor: 0xfff1d6, sunIntensity: 2.4, skyGlow: 0.6,
    hemiSky: 0xdbeeff, hemiGround: 0x8a7a62, hemiIntensity: 1.1, ambient: 0.25,
    fog: 0xcfe2ee, fogNear: 140, fogFar: 620,
    deep: 0x16627a, shallow: 0x3aa2a8, waterSky: 0x9fcbe6, glint: 1.0,
    lantern: 0.55, lamp: 0.4, windows: 0.0, glowOpacity: 0.12, glowSize: 1.8, orb: 1.0,
    exposure: 1.0, stars: 0, moon: false, playerLamp: 0, mountain: 0xffffff, cloud: 0xffffff, cloudOpacity: 0.95, bloom: 0.18,
  },
  dusk: {
    top: 0x4d79b8, horizon: 0xffc88f, bottom: 0xd99a6a,
    sunDir: [-0.45, 0.16, -0.88], sunColor: 0xffb265, sunIntensity: 2.6, skyGlow: 1.0,
    hemiSky: 0xffe2c0, hemiGround: 0x6d5446, hemiIntensity: 0.95, ambient: 0.22,
    fog: 0xf0c49c, fogNear: 120, fogFar: 560,
    deep: 0x1f4f63, shallow: 0x3f7d80, waterSky: 0xf2a877, glint: 1.4,
    lantern: 1.2, lamp: 0.95, windows: 0.4, glowOpacity: 0.28, glowSize: 2.0, orb: 1.3,
    exposure: 1.05, stars: 0, moon: false, playerLamp: 0.6, mountain: 0xe9dccd, cloud: 0xffd2b0, cloudOpacity: 0.9, bloom: 0.26,
  },
  night: {
    top: 0x060c22, horizon: 0x1d2b4f, bottom: 0x0b1226,
    sunDir: [0.35, 0.42, -0.84], sunColor: 0x9db4ff, sunIntensity: 0.55, skyGlow: 0.35,
    hemiSky: 0x3a4f88, hemiGround: 0x1a1418, hemiIntensity: 0.75, ambient: 0.2,
    fog: 0x15203b, fogNear: 70, fogFar: 420,
    deep: 0x07142a, shallow: 0x123049, waterSky: 0x223a66, glint: 0.9,
    // 夜晚：燈光柔和一點，避免泛光太暈、太刺眼
    lantern: 1.7, lamp: 1.4, windows: 0.75, glowOpacity: 0.38, glowSize: 2.1, orb: 1.5,
    exposure: 1.12, stars: 1, moon: true, playerLamp: 1.8, mountain: 0x4a5582, cloud: 0x3a4a73, cloudOpacity: 0.35, bloom: 0.3,
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
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uSunColor: { value: new THREE.Color() },
        uGlint: { value: 1 },
        // 有地下室的建築範圍：海面在這裡不畫，從樓梯井往下看才看得到地下室
        uHoles: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(1e5, 1e5, 1, 0)) },
        uHoleSizes: { value: [0, 1, 2, 3].map(() => new THREE.Vector2(0, 0)) },
      },
    ]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      varying vec3 vWorld;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
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
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform float uGlint;
      uniform vec4 uHoles[4];
      uniform vec2 uHoleSizes[4];
      varying vec3 vWorld;
      float wave(vec2 p) {
        return sin(p.x * 0.31 + uTime * 0.8) * 0.5
          + sin(p.y * 0.27 - uTime * 0.65) * 0.5
          + sin((p.x + p.y) * 0.71 + uTime * 1.4) * 0.22
          + sin((p.x - p.y) * 1.33 - uTime * 1.9) * 0.11
          + sin(p.x * 2.7 + p.y * 1.9 + uTime * 2.6) * 0.05;
      }
      void main() {
        vec2 p = vWorld.xz;
        for (int i = 0; i < 4; i++) {
          vec4 hh = uHoles[i];
          vec2 hd = p - hh.xy;
          vec2 hl = vec2(hd.x * hh.z - hd.y * hh.w, hd.x * hh.w + hd.y * hh.z);
          if (abs(hl.x) < uHoleSizes[i].x && abs(hl.y) < uHoleSizes[i].y) discard;
        }
        float e = 0.2;
        vec3 n = normalize(vec3(
          -(wave(p + vec2(e, 0.0)) - wave(p - vec2(e, 0.0))) * 0.55,
          1.0,
          -(wave(p + vec2(0.0, e)) - wave(p - vec2(0.0, e))) * 0.55));
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
        vec3 base = mix(uDeep, uShallow, clamp(0.45 + 0.22 * wave(p * 0.4), 0.0, 1.0));
        vec3 col = mix(base, uSky, clamp(fres * 0.4 + 0.05, 0.0, 0.45));
        vec3 R = reflect(-V, n);
        vec3 L = normalize(uSunDir);
        float spec = pow(max(dot(R, L), 0.0), 140.0) * 2.2 + pow(max(dot(R, L), 0.0), 18.0) * 0.18;
        col += uSunColor * spec * uGlint;
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
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600, 1, 1), this.waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.35;
    this.root.add(water);

    // 盆地：照 /island 的地圖構造（32 座閉合環形山、田園陸地、北山飛瀑、塔樓山台、南山洞口、東山飛瀑）
    this.mountainMat = new THREE.MeshStandardMaterial({ color: 0x7a7a8c, roughness: 1, vertexColors: true });
    const trees = new TreeBatch();
    this.buildMountainRing(trees);
    this.buildDistantPeaks(rand);
    this.buildFarmlands(trees);
    this.buildLakePavilion(0, 64);
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
    this.life.setWeather(w);
  }

  get weather(): WeatherType {
    return this.life.currentWeather;
  }

  /** 山的剖面：寬山腳、往上收窄、圓頂（可疊成連綿山牆） */
  private mountainGeometry(r: number, h: number, seed: number, flatTop = 0) {
    const rand = seeded(seed);
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      let rr = r * (1 - Math.pow(t, 1.15) * 0.82);
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
    for (const pk of MOUNTAIN_RING) {
      if (pk.kind === 'westPlateau') continue;
      const geo = this.mountainGeometry(pk.r, pk.h, pk.i * 7 + 3);
      const m = new THREE.Mesh(geo, this.mountainMat);
      m.position.set(pk.x, -2, pk.z);
      g.add(m);
      // 山腳的松樹
      const rand = seeded(pk.i + 11);
      for (let k = 0; k < 5; k++) {
        const a = Math.atan2(-pk.z, -pk.x) + (rand() - 0.5) * 1.6;
        const rr = pk.r * (0.82 + rand() * 0.12);
        trees.add(rand() > 0.3 ? 'pine' : 'green', pk.x + Math.cos(a) * rr, 1 + rand() * 2, pk.z + Math.sin(a) * rr, 1.3 + rand() * 0.8);
      }
    }
    mergeByMaterial(g, false);
    this.root.add(g);

    // 西側塔樓平頂山台＋五層塔
    const wp = BASIN_LANDMARKS.westPlateau;
    const plat = new THREE.Group();
    plat.position.set(wp.x, 0, wp.z);
    const plateauTop = 30;
    plat.add(new THREE.Mesh(this.mountainGeometry(wp.r * 1.25, plateauTop + 2, 161, 0.72), this.mountainMat));
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
    this.addConformingFall(g, { ...north, base: north.base.clone().setZ(ledgeZ.z + 60) }, 21.6, -0.3, 13, 1.4);

    // 東山飛瀑（山壁瀑布，朝向盆地）
    const ef = BASIN_LANDMARKS.eastFalls;
    this.addConformingFall(g, { base: new THREE.Vector3(ef.faceX - 60, 0, ef.z), dir: new THREE.Vector3(1, 0, 0), side: new THREE.Vector3(0, 0, 1) }, 36, -0.3, 8, 1.0);

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
    gap: number
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
    let len = 0;
    for (let i = 0; i <= n; i++) {
      if (i > 0) len += pts[i].distanceTo(pts[i - 1]);
      const w = width * (1 + (i / n) * 0.35);
      for (const sx of [-1, 1]) {
        const p = pts[i].clone().addScaledVector(at.side, (sx * w) / 2);
        pos.push(p.x, p.y, p.z);
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
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const tex = waterfallTexture().clone();
    tex.needsUpdate = true;
    this.ownedTextures.push(tex);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, color: 0xffffff });
    this.waterfalls.push(mat);
    this.root.add(new THREE.Mesh(geo, mat));
    const bottom = pts[n];
    const mist = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false }));
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
      const body = new THREE.Mesh(scaledBox(s, bh, s, 3, bh * 1.4, 3), mats.facades[t % 3]);
      body.position.y = y + bh / 2;
      g.add(body);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, bh, 8), mats.redLacquer);
        col.position.set((sx * s) / 2, y + bh / 2, (sz * s) / 2);
        g.add(col);
      }
      y += bh;
      const last = t === 4;
      const roof = buildRoofTier(s, s, { rise: last ? 3.2 : 1.3, overhang: 1.5, curl: 0.9, theme: t % 2 ? 'teal' : 'slate', ridge: last, finial: last });
      roof.position.y = y;
      g.add(roof);
      y += last ? 0 : 0.55;
    }
    const lan = new LanternBatch();
    for (let t = 0; t < 5; t++) {
      const s = (7.5 * (1 - t * 0.13)) / 2 + 1.3;
      const yy = top + 1.2 + 3.6 + t * 3.15 - 0.2;
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lan.addHanging(sx * s, yy, sz * s, 0.9);
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
      sideMesh.position.y = 0;
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
      // 農舍（白牆黑瓦）
      const nHouse = 2 + Math.floor(rand() * 3);
      for (let k = 0; k < nHouse; k++) {
        const a = rand() * Math.PI * 2;
        const rr = 0.35 + rand() * 0.4;
        const x = l.cx + Math.cos(a) * l.rx * rr;
        const z = l.cz + Math.sin(a) * l.rz * rr;
        const yaw = Math.atan2(-x, -z) + (rand() - 0.5) * 0.6;
        const hg = new THREE.Group();
        hg.position.set(x, 0.5, z);
        hg.rotation.y = yaw;
        const w = 4 + rand() * 2;
        const d = 3 + rand() * 1.2;
        const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 2.6, d), mats.plaster);
        wall.position.y = 1.3;
        hg.add(wall);
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.7, 0.1), mats.darkWood);
        door.position.set(0, 0.85, d / 2 + 0.02);
        hg.add(door);
        const roof = buildRoofTier(w, d, { rise: 1.3, overhang: 0.7, curl: 0.35, theme: 'slate', lite: true });
        roof.position.y = 2.6;
        hg.add(roof);
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
        trees.add((['cherry', 'green', 'green', 'pine', 'maple'] as TreeKind[])[k % 5], ix, 0.5, iz, 1 + rand() * 0.6);
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
    // 欄杆
    for (const [x, z, rx] of [[0, -4.2, 0], [0, 4.2, 0], [-4.2, 0, 1], [4.2, 0, 1]] as [number, number, number][]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(rx ? 0.14 : 8.4, 0.7, rx ? 8.4 : 0.14), mats.redLacquer);
      rail.position.set(x, 1.05, z);
      g.add(rail);
    }
    const beam = new THREE.Mesh(scaledBox(6.6, 0.4, 6.6, 3, 0.4, 3), mats.redLacquer);
    beam.position.y = 4.0;
    g.add(beam);
    const roof = buildRoofTier(6, 6, { rise: 2.6, overhang: 1.4, curl: 1.1, theme: 'teal', finial: true });
    roof.position.y = 4.2;
    g.add(roof);
    // 九曲橋（往南延伸，純景觀）
    let px = 0;
    let pz = 4.5;
    for (let k = 0; k < 5; k++) {
      const dir = k % 2 ? 1 : -1;
      const seg = new THREE.Mesh(scaledBox(2.2, 0.3, 4.4, 2, 0.3, 2), mats.woodFloor);
      const nx = px + dir * 1.6;
      seg.position.set(nx, 0.35, pz + 2.1);
      seg.rotation.y = dir * 0.35;
      g.add(seg);
      px = nx;
      pz += 4;
    }
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

  setTimeOfDay(t: TimeOfDay) {
    this.timeOfDay = t;
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
    w.uSunDir.value.copy(sd);
    w.uSunColor.value.setHex(p.sunColor);
    w.uGlint.value = p.glint;
    mats.lanternBody.emissiveIntensity = p.lantern;
    mats.lampPaper.emissiveIntensity = p.lamp;
    mats.facades.forEach((f) => (f.emissiveIntensity = p.windows));
    mats.glow.opacity = p.glowOpacity;
    mats.glow.size = p.glowSize;
    mats.orb.emissiveIntensity = p.orb;
    mats.bulbGlass.emissiveIntensity = 0.45 + p.orb * 0.25;
    mats.bulbRing.emissiveIntensity = 0.6 + p.orb * 0.2;
    this.renderer.toneMappingExposure = p.exposure;
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

