import * as THREE from 'three';
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
  seeded,
} from './textures';

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
}

const PRESETS: Record<TimeOfDay, Preset> = {
  day: {
    top: 0x3f86d6, horizon: 0xcfe5f2, bottom: 0x9cc3d8,
    sunDir: [0.35, 0.75, -0.45], sunColor: 0xfff1d6, sunIntensity: 2.4, skyGlow: 0.6,
    hemiSky: 0xdbeeff, hemiGround: 0x8a7a62, hemiIntensity: 1.1, ambient: 0.25,
    fog: 0xcfe2ee, fogNear: 140, fogFar: 620,
    deep: 0x16627a, shallow: 0x3aa2a8, waterSky: 0x9fcbe6, glint: 1.0,
    lantern: 0.55, lamp: 0.4, windows: 0.0, glowOpacity: 0.12, glowSize: 1.8, orb: 1.0,
    exposure: 1.0, stars: 0, moon: false, playerLamp: 0, mountain: 0x5f8c72, cloud: 0xffffff, cloudOpacity: 0.95,
  },
  dusk: {
    top: 0x4d79b8, horizon: 0xffc88f, bottom: 0xd99a6a,
    sunDir: [-0.45, 0.16, -0.88], sunColor: 0xffb265, sunIntensity: 2.6, skyGlow: 1.0,
    hemiSky: 0xffe2c0, hemiGround: 0x6d5446, hemiIntensity: 0.95, ambient: 0.22,
    fog: 0xf0c49c, fogNear: 120, fogFar: 560,
    deep: 0x1f4f63, shallow: 0x3f7d80, waterSky: 0xf2a877, glint: 1.4,
    lantern: 1.5, lamp: 1.1, windows: 0.45, glowOpacity: 0.42, glowSize: 2.4, orb: 1.6,
    exposure: 1.05, stars: 0, moon: false, playerLamp: 0.6, mountain: 0x6f7f78, cloud: 0xffd2b0, cloudOpacity: 0.9,
  },
  night: {
    top: 0x060c22, horizon: 0x1d2b4f, bottom: 0x0b1226,
    sunDir: [0.35, 0.42, -0.84], sunColor: 0x9db4ff, sunIntensity: 0.55, skyGlow: 0.35,
    hemiSky: 0x3a4f88, hemiGround: 0x1a1418, hemiIntensity: 0.75, ambient: 0.2,
    fog: 0x15203b, fogNear: 70, fogFar: 420,
    deep: 0x07142a, shallow: 0x123049, waterSky: 0x223a66, glint: 0.9,
    lantern: 3.2, lamp: 2.6, windows: 1.35, glowOpacity: 0.95, glowSize: 3.0, orb: 2.6,
    exposure: 1.2, stars: 1, moon: true, playerLamp: 2.2, mountain: 0x1d2740, cloud: 0x3a4a73, cloudOpacity: 0.35,
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
        float e = 0.2;
        vec3 n = normalize(vec3(
          -(wave(p + vec2(e, 0.0)) - wave(p - vec2(e, 0.0))) * 0.55,
          1.0,
          -(wave(p + vec2(0.0, e)) - wave(p - vec2(0.0, e))) * 0.55));
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
        vec3 base = mix(uDeep, uShallow, clamp(0.45 + 0.22 * wave(p * 0.4), 0.0, 1.0));
        vec3 col = mix(base, uSky, clamp(fres * 0.5 + 0.06, 0.0, 0.62));
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
  private ownedTextures: THREE.Texture[] = [];

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
    this.sun.shadow.mapSize.set(1024, 1024);
    const sc = this.sun.shadow.camera;
    sc.left = -45;
    sc.right = 45;
    sc.top = 45;
    sc.bottom = -45;
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
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600, 1, 1), this.waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.35;
    this.root.add(water);

    // 遠山（石灰岩峰林）
    this.mountainMat = new THREE.MeshStandardMaterial({ color: 0x7a7a8c, roughness: 1 });
    this.buildMountains(rand);

    // 近景：北方瀑布懸崖與五層塔、東西兩座瀑布岩、湖心亭與荷花
    const trees = new TreeBatch();
    this.buildPagodaCliff(trees);
    this.buildSideCliff(-152, 4, 1, trees, 21);
    this.buildSideCliff(154, -2, -1, trees, 33);
    this.buildLakePavilion(0, 64);
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

    this.setTimeOfDay('dusk');
  }

  private buildMountains(rand: () => number) {
    // 桂林式石灰岩峰林：陡峭的側面、圓頂，用旋轉剖面做出來
    const g = new THREE.Group();
    const profile = (h: number, r: number) => {
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const rr = r * (t < 0.75 ? 1 - t * 0.35 : 0.74 * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.75) / 0.25, 2))));
        pts.push(new THREE.Vector2(Math.max(0.01, rr), t * h));
      }
      return pts;
    };
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2 + rand() * 0.1;
      const dist = 250 + rand() * 230;
      const h = 50 + rand() * 100;
      const r = h * (0.22 + rand() * 0.14);
      const geo = new THREE.LatheGeometry(profile(h, r), 12);
      const p = geo.attributes.position as THREE.BufferAttribute;
      for (let k = 0; k < p.count; k++) {
        const y = p.getY(k);
        const j = 1 + Math.sin(y * 0.15 + i) * 0.08 + (rand() - 0.5) * 0.08;
        p.setXYZ(k, p.getX(k) * j, y, p.getZ(k) * j);
      }
      geo.computeVertexNormals();
      geo.scale(1, 1, 0.8 + rand() * 0.4);
      geo.translate(Math.cos(a) * dist, -3, Math.sin(a) * dist);
      g.add(new THREE.Mesh(geo, this.mountainMat));
    }
    mergeByMaterial(g, false);
    this.root.add(g);
  }

  private addWaterfall(x: number, z: number, topY: number, width: number, faceYaw: number, tilt: number) {
    const tex = waterfallTexture().clone();
    tex.needsUpdate = true;
    tex.repeat.set(width / 6, topY / 10);
    this.ownedTextures.push(tex);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, color: 0xffffff });
    this.waterfalls.push(mat);
    const len = topY + 0.4;
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(width, len), mat);
    const grp = new THREE.Group();
    grp.position.set(x, 0, z);
    grp.rotation.y = faceYaw;
    fall.position.set(0, topY / 2 - 0.3, Math.sin(tilt) * len * 0.5);
    fall.rotation.x = -tilt;
    grp.add(fall);
    // 水花與水霧
    const mist = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }));
    mist.scale.set(width * 2.2, width * 1.2, 1);
    mist.position.set(0, 1.2, Math.sin(tilt) * len + 1);
    grp.add(mist);
    this.root.add(grp);
  }

  private buildPagodaCliff(trees: TreeBatch) {
    const mats = getStyleMaterials();
    const cx = 0;
    const cz = -122;
    const top = 26;
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    const cliff = new THREE.Mesh(cliffGeometry(25, 17, 31, 23, top + 6, 91, 64, 8), mats.rock);
    cliff.position.y = top;
    g.add(cliff);
    const cap = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2).scale(25, 1, 17), mats.grass);
    cap.position.y = top;
    g.add(cap);
    // 五層塔
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
      const s = 7.5 * (1 - t * 0.13) / 2 + 1.3;
      const yy = top + 1.2 + 3.6 + t * 3.15 - 0.2;
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lan.addHanging(sx * s, yy, sz * s, 0.9);
    }
    g.add(lan.build());
    const rand = seeded(5);
    const kinds: TreeKind[] = ['pine', 'cherry', 'green', 'cherry'];
    for (let i = 0; i < 22; i++) {
      const a = rand() * Math.PI * 2;
      const k = 0.62 + rand() * 0.32;
      const x = Math.cos(a) * 25 * k;
      const z = Math.sin(a) * 17 * k;
      if (Math.abs(x) < 7.5 && Math.abs(z) < 7.5) continue;
      trees.add(kinds[i % kinds.length], cx + x, top, cz + z, 1.0 + rand() * 0.6);
    }
    mergeByMaterial(g);
    this.root.add(g);
    // 兩道瀑布（南面，朝向主島）
    this.addWaterfall(cx - 9, cz + 15.5, top, 6, 0, 0.2);
    this.addWaterfall(cx + 6, cz + 16.3, top - 2, 4.5, 0, 0.22);
  }

  private buildSideCliff(cx: number, cz: number, faceDir: 1 | -1, trees: TreeBatch, seed: number) {
    const mats = getStyleMaterials();
    const top = 17;
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    const cliff = new THREE.Mesh(cliffGeometry(14, 22, 19, 28, top + 6, seed, 48, 6), mats.rock);
    cliff.position.y = top;
    g.add(cliff);
    const cap = new THREE.Mesh(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2).scale(14, 1, 22), mats.grass);
    cap.position.y = top;
    g.add(cap);
    // 崖頂涼亭
    const pav = new THREE.Group();
    pav.position.set(0, top, -6);
    const deck = new THREE.Mesh(scaledBox(6, 0.5, 6, 2, 0.5, 2), mats.stone);
    deck.position.y = 0.25;
    pav.add(deck);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 3, 8), mats.redLacquer);
      col.position.set(sx * 2.4, 2, sz * 2.4);
      pav.add(col);
    }
    const roof = buildRoofTier(4.8, 4.8, { rise: 2.2, overhang: 1.2, curl: 1.0, theme: 'teal', finial: true });
    roof.position.y = 3.5;
    pav.add(roof);
    g.add(pav);
    const rand = seeded(seed);
    for (let i = 0; i < 14; i++) {
      const a = rand() * Math.PI * 2;
      const k = 0.55 + rand() * 0.35;
      trees.add(i % 3 ? 'pine' : 'cherry', cx + Math.cos(a) * 14 * k, top, cz + Math.sin(a) * 22 * k + 3, 1 + rand() * 0.5);
    }
    mergeByMaterial(g);
    this.root.add(g);
    this.addWaterfall(cx + faceDir * 14.6, cz + 4, top, 5, (faceDir * Math.PI) / 2, 0.24);
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

  setTimeOfDay(t: TimeOfDay) {
    this.timeOfDay = t;
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
      this.petalMat.color.setHex(0xd8ff7a);
      this.petalMat.map = glowTexture();
      this.petalMat.blending = THREE.AdditiveBlending;
      this.petalMat.size = 0.3;
    } else {
      this.petalMat.color.setHex(0xffb7cf);
      this.petalMat.map = petalTexture();
      this.petalMat.blending = THREE.NormalBlending;
      this.petalMat.size = 0.22;
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
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
    pos.needsUpdate = true;
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
  }
}

