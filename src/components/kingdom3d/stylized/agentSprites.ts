import * as THREE from 'three';

/**
 * 創點源 Agent：直接用角色設定圖（三視圖＋動作圖去背）做成「看板人」
 * - 一律面向鏡頭（只繞 Y 軸轉，不會跟著俯仰歪掉）
 * - 依「角色面朝方向」和「鏡頭在哪一側」換正面／斜側／側面／背面圖，左右用鏡像補齊，繞著走會有立體感
 * - 動作（走路彈跳、揮手、敲槌、睡覺、跌倒…）換成對應的動作圖
 * - 不吃場景光，照時段調色（白天原色、黃昏偏暖、夜晚偏暗藍），腳下一片圓影
 */

const BASE = '/agents/3d/';

export type Facing = 'L' | 'R';
export interface ViewImg {
  img: string;
  /** 圖裡角色臉朝畫面哪一邊（正面、背面圖不用填） */
  faces?: Facing;
}
export interface SpriteSpec {
  front: string;
  q?: ViewImg; // 前斜 45°
  side?: ViewImg; // 側面 90°
  bq?: ViewImg; // 後斜 135°
  back?: string;
  /** 動作圖（正面拍的） */
  poses?: Record<string, ViewImg & { h?: number; anchorY?: number }>;
  /** 正面圖的高度（公尺）；其他圖依原圖比例換算（同一張設定表裡的角色等高） */
  height: number;
}

const loader = new THREE.TextureLoader();
const texCache = new Map<string, THREE.Texture>();
function tex(name: string) {
  let t = texCache.get(name);
  if (!t) {
    t = loader.load(BASE + name + '.webp');
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    texCache.set(name, t);
  }
  return t;
}

let blobTex: THREE.Texture | null = null;
function blob() {
  if (blobTex) return blobTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  blobTex = new THREE.CanvasTexture(c);
  return blobTex;
}

const TINT: Record<string, number> = { day: 0xffffff, dusk: 0xf3dcc4, night: 0x8f9cc4, morning: 0xf6f0e6 };
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export class AgentSprite {
  /** 鏡頭位置與時段（島上角色每幀更新；求職廟裡的搜搜等其他地方的看板人也讀這裡） */
  static cam = { x: 0, z: 0, tod: 'dusk' };
  readonly group = new THREE.Group();
  /** 只轉這一層面向鏡頭，group 本身留給外面擺位置 */
  private readonly board = new THREE.Group();
  private readonly mesh: THREE.Mesh;
  private readonly mat: THREE.MeshBasicMaterial;
  private readonly shadow: THREE.Mesh;
  private current = '';
  private aspect = new Map<string, number>();
  /** 角色面朝的方向（世界 yaw：0＝朝 +Z） */
  facing = 0;
  /** 動作（null＝依角度換視角圖） */
  pose: string | null = null;
  /** 彈跳、壓扁、側傾（外面的動畫填） */
  hop = 0;
  squash = 0;
  tilt = 0;

  /** 自己會發光（小燈泡）：夜裡也不調暗 */
  private selfLit = false;

  constructor(private spec: SpriteSpec, opts: { shadow?: number; selfLit?: boolean } = {}) {
    this.selfLit = Boolean(opts.selfLit);
    this.mat = new THREE.MeshBasicMaterial({ map: tex(spec.front), transparent: true, alphaTest: 0.32, side: THREE.DoubleSide, depthWrite: true });
    const geo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.renderOrder = 1;
    this.mesh.userData.noMerge = true;
    this.board.add(this.mesh);
    this.group.add(this.board);
    const sr = opts.shadow ?? spec.height * 0.32;
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(sr * 2, sr * 1.3).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blob(), transparent: true, depthWrite: false }));
    this.shadow.position.y = 0.03;
    this.shadow.userData.noMerge = true;
    this.group.add(this.shadow);
    this.group.userData.noMerge = true;
    // TextureLoader 載入完才知道寬高：輪詢一下
    const poll = () => {
      let pending = false;
      for (const n of this.allImages()) {
        const im = tex(n).image as HTMLImageElement | undefined;
        if (im && im.width) this.aspect.set(n, im.width / im.height);
        else pending = true;
      }
      if (pending) setTimeout(poll, 300);
      else this.current = '';
    };
    poll();
  }

  private allImages() {
    const s = this.spec;
    const list = [s.front, s.q?.img, s.side?.img, s.bq?.img, s.back, ...Object.values(s.poses || {}).map((p) => p.img)];
    return [...new Set(list.filter(Boolean) as string[])];
  }

  /** 每幀呼叫：鏡頭位置、時段 */
  update(camX: number, camZ: number, tod: string) {
    const wp = this.group.getWorldPosition(_v);
    const toCam = Math.atan2(camX - wp.x, camZ - wp.z);
    // 面板轉向鏡頭（扣掉外層的旋轉）
    const parentYaw = this.worldYaw();
    this.board.rotation.y = toCam - parentYaw;
    // 選圖
    let img = this.spec.front;
    let faces: Facing | undefined;
    let h = this.spec.height;
    const s = this.spec;
    const phi = wrap(toCam - this.facing);
    const a = Math.abs(phi);
    // 鏡頭在角色右手邊 → 角色看起來臉朝畫面右邊
    const camOnRight = Math.sin(this.facing - toCam) > 0;
    if (this.pose && s.poses?.[this.pose]) {
      const p = s.poses[this.pose];
      img = p.img;
      faces = p.faces;
      if (p.h) h = p.h;
    } else if (a < Math.PI / 8 || (!s.q && !s.side && a < Math.PI / 2)) {
      img = s.front;
    } else if (a < (Math.PI * 3) / 8 && s.q) {
      img = s.q.img;
      faces = s.q.faces;
    } else if (a < (Math.PI * 5) / 8 && s.side) {
      img = s.side.img;
      faces = s.side.faces;
    } else if (a < (Math.PI * 7) / 8 && (s.bq || s.side)) {
      const v = s.bq || s.side!;
      img = v.img;
      faces = v.faces;
    } else if (s.back) {
      img = s.back;
    } else if (s.bq || s.side) {
      const v = s.bq || s.side!;
      img = v.img;
      faces = v.faces;
    }
    const mirror = faces ? (faces === 'R') !== camOnRight : false;
    if (img !== this.current) {
      this.current = img;
      this.mat.map = tex(img);
      this.mat.needsUpdate = true;
    }
    const asp = this.aspect.get(img) || 0.75;
    const sq = 1 - this.squash;
    this.mesh.scale.set(h * asp * (mirror ? -1 : 1) * (1 + this.squash * 0.6), h * sq, 1);
    this.mesh.position.y = this.hop;
    this.mesh.rotation.z = this.tilt;
    this.mat.color.setHex(this.selfLit ? 0xffffff : TINT[tod] ?? 0xffffff);
    this.shadow.scale.setScalar(1 - Math.min(0.5, this.hop * 0.4));
  }

  private worldYaw() {
    this.group.getWorldQuaternion(_q);
    _e.setFromQuaternion(_q, 'YXZ');
    return _e.y;
  }

  /** 目前大約的寬高（給點擊範圍、對話泡泡用） */
  get height() {
    return this.spec.height;
  }
}

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();

/* ---------------- 六位角色 ---------------- */

export const SPRITES: Record<'baimiao' | 'duohui' | 'agent007' | 'bear' | 'sousou' | 'xiaodengpao', SpriteSpec> = {
  baimiao: {
    front: 'cat_front',
    q: { img: 'cat_q', faces: 'L' },
    side: { img: 'cat_side', faces: 'L' },
    bq: { img: 'cat_bq', faces: 'L' },
    height: 0.95,
    poses: {
      run: { img: 'cat_run', faces: 'L', h: 0.78 },
      jump: { img: 'cat_jump', faces: 'L', h: 0.82 },
      sleep: { img: 'cat_sleep', faces: 'L', h: 0.5 },
    },
  },
  duohui: {
    front: 'owl_front',
    q: { img: 'owl_q', faces: 'R' },
    side: { img: 'owl_side', faces: 'L' },
    back: 'owl_back',
    height: 1.45,
    poses: { wave: { img: 'owl_wave', faces: 'L', h: 1.2 } },
  },
  agent007: {
    front: '007_front',
    q: { img: '007_q', faces: 'R' },
    side: { img: '007_side', faces: 'L' },
    back: '007_back',
    height: 1.45,
    poses: { hero: { img: '007_hero', faces: 'R', h: 1.5 } },
  },
  bear: {
    front: 'bear_front',
    q: { img: 'bear_q', faces: 'R' },
    side: { img: 'bear_side', faces: 'L' },
    back: 'bear_back',
    height: 1.95,
    poses: { hammer: { img: 'bear_hammer', faces: 'R', h: 2.0 } },
  },
  sousou: {
    front: 'soso_front',
    q: { img: 'soso_q', faces: 'L' },
    side: { img: 'soso_side', faces: 'R' },
    height: 2.6,
  },
  xiaodengpao: {
    front: 'bulb_front',
    q: { img: 'bulb_q', faces: 'L' },
    side: { img: 'bulb_side', faces: 'L' },
    back: 'bulb_back',
    height: 1.25,
    poses: {
      jump: { img: 'bulb_jump', h: 1.3 },
      fall: { img: 'bulb_fall', faces: 'L', h: 0.62 },
    },
  },
};
