import * as THREE from 'three';
import type { Collider } from '../types';
import { FARMLANDS } from './basinLayout';
import { seeded } from './textures';
import { makePickProxy } from '../picking';
import { mergeByMaterial } from './architecture';

/**
 * 五島的生活感（照 /island）：
 * - 田園：水牛、綿羊、小豬、雞、白鷺鷥、戴斗笠鋤地的農夫
 * - 天空：白天好天氣時偶爾飛過的人字雁群
 * - 創點源原創角色：白喵（徵才島庭院閒晃打滾）、多慧（主島廣場招呼旅人）、007（躺在翰林院屋頂）、大熊（百工坊街心敲敲打打）
 * 點原創角色會在左側打開角色小卡
 */

/** 由環境（時段、天氣）寫入：晴朗白天才有雁群；夜裡或下雨時農夫收工回家、雞進雞舍 */
export const faunaEnv: { tod: string; weather: string } = { tod: 'dusk', weather: 'clear' };

export type CharacterId = 'baimiao' | 'duohui' | 'agent007' | 'bear';

export const CHARACTERS: Record<CharacterId, { name: string; role: string; line: string; where: string; img: string }> = {
  baimiao: { img: '/agents/baimiao.webp', name: '白喵', role: '市場顧問 Agent', line: '「哈基米～讓我先打個滾再幫你媒合專家喵！」', where: '徵才島・月洞門庭院' },
  duohui: { img: '/agents/duohui.webp', name: '頂多慧', role: '官方客服 Agent', line: '「25 小時全年無休，有任何問題都包在我身上！」', where: '主島・中央廣場' },
  agent007: { img: '/agents/agent007.webp', name: '007', role: 'AI CRM Agent', line: '「躺在翰林院屋頂吹風，全島情報都在我的雷達裡！」', where: '徵才島・翰林院屋頂' },
  bear: { img: '/agents/bear.webp', name: '大熊', role: '預備神兵', line: '「敲敲打打修修補補，再難的技術都能幫你落地！」', where: '討論島・百工坊街心' },
};

const std = (color: number, rough = 0.7, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });

function addM(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

/* ---------------- 田園動物 ---------------- */

function buffalo(m: Record<string, THREE.Material>) {
  const g = new THREE.Group();
  addM(g, new THREE.CapsuleGeometry(0.42, 1.0, 6, 10).rotateX(Math.PI / 2), m.buffalo, 0, 0.95, 0);
  for (const [x, z] of [[-0.25, -0.45], [0.25, -0.45], [-0.25, 0.45], [0.25, 0.45]]) addM(g, new THREE.CylinderGeometry(0.09, 0.08, 0.6, 6), m.buffalo, x, 0.3, z);
  const head = new THREE.Group();
  head.position.set(0, 1.0, -0.95);
  g.add(head);
  addM(head, new THREE.BoxGeometry(0.42, 0.38, 0.46), m.buffalo, 0, 0, 0);
  addM(head, new THREE.BoxGeometry(0.34, 0.2, 0.14), m.muzzle, 0, -0.08, -0.26);
  for (const s of [-1, 1]) {
    const horn = addM(head, new THREE.TorusGeometry(0.22, 0.04, 6, 10, Math.PI * 0.8), m.horn, s * 0.22, 0.2, 0.05);
    horn.rotation.set(0, Math.PI / 2, s > 0 ? 0.2 : Math.PI - 0.2);
  }
  addM(g, new THREE.CylinderGeometry(0.03, 0.02, 0.5, 4), m.buffalo, 0, 0.85, 0.75).rotation.x = 0.5;
  g.userData.head = head;
  return g;
}

function sheep(m: Record<string, THREE.Material>) {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) addM(g, new THREE.SphereGeometry(0.26, 8, 6), m.wool, ((i % 3) - 1) * 0.18, 0.62 + (i > 2 ? 0.08 : 0), (i > 2 ? 0.12 : -0.12));
  addM(g, new THREE.SphereGeometry(0.15, 8, 6).scale(0.9, 1, 1.2), m.face, 0, 0.66, -0.42);
  for (const [x, z] of [[-0.14, -0.15], [0.14, -0.15], [-0.14, 0.18], [0.14, 0.18]]) addM(g, new THREE.CylinderGeometry(0.04, 0.04, 0.38, 5), m.face, x, 0.2, z);
  return g;
}

function pig(m: Record<string, THREE.Material>) {
  const g = new THREE.Group();
  addM(g, new THREE.SphereGeometry(0.32, 10, 8).scale(1, 0.9, 1.35), m.pig, 0, 0.42, 0);
  addM(g, new THREE.CylinderGeometry(0.1, 0.11, 0.08, 10).rotateX(Math.PI / 2), m.pigNose, 0, 0.42, -0.45);
  for (const s of [-1, 1]) addM(g, new THREE.ConeGeometry(0.07, 0.14, 5), m.pig, s * 0.14, 0.66, -0.3);
  for (const [x, z] of [[-0.14, -0.2], [0.14, -0.2], [-0.14, 0.2], [0.14, 0.2]]) addM(g, new THREE.CylinderGeometry(0.05, 0.05, 0.2, 5), m.pig, x, 0.1, z);
  return g;
}

function chicken(m: Record<string, THREE.Material>, hen: boolean) {
  const g = new THREE.Group();
  const body = addM(g, new THREE.SphereGeometry(0.14, 8, 6).scale(1, 0.95, 1.2), hen ? m.hen : m.wool, 0, 0.24, 0);
  void body;
  const head = new THREE.Group();
  head.position.set(0, 0.36, -0.12);
  g.add(head);
  addM(head, new THREE.SphereGeometry(0.075, 8, 6), hen ? m.hen : m.wool, 0, 0, 0);
  addM(head, new THREE.ConeGeometry(0.025, 0.07, 4).rotateX(-Math.PI / 2), m.beak, 0, -0.01, -0.08);
  addM(head, new THREE.BoxGeometry(0.02, 0.06, 0.07), m.comb, 0, 0.07, 0);
  addM(g, new THREE.ConeGeometry(0.06, 0.16, 5), hen ? m.hen : m.tail, 0, 0.32, 0.17).rotation.x = -0.6;
  for (const s of [-1, 1]) addM(g, new THREE.CylinderGeometry(0.012, 0.012, 0.14, 4), m.beak, s * 0.05, 0.07, 0);
  g.userData.head = head;
  return g;
}

function egret(m: Record<string, THREE.Material>) {
  const g = new THREE.Group();
  addM(g, new THREE.SphereGeometry(0.16, 8, 6).scale(0.8, 0.8, 1.6), m.white, 0, 0.62, 0);
  const neck = addM(g, new THREE.CylinderGeometry(0.035, 0.045, 0.4, 5), m.white, 0, 0.86, -0.18);
  neck.rotation.x = -0.4;
  addM(g, new THREE.SphereGeometry(0.06, 8, 6), m.white, 0, 1.05, -0.28);
  addM(g, new THREE.ConeGeometry(0.02, 0.2, 4).rotateX(-Math.PI / 2), m.beakYellow, 0, 1.04, -0.42);
  for (const s of [-1, 1]) addM(g, new THREE.CylinderGeometry(0.012, 0.012, 0.5, 4), m.leg, s * 0.05, 0.25, 0.02);
  return g;
}

function farmer(m: Record<string, THREE.Material>) {
  const g = new THREE.Group();
  addM(g, new THREE.CylinderGeometry(0.16, 0.26, 0.85, 10), m.blueCloth, 0, 0.62, 0);
  addM(g, new THREE.SphereGeometry(0.15, 10, 8), m.skin, 0, 1.18, 0);
  addM(g, new THREE.ConeGeometry(0.38, 0.2, 14), m.straw, 0, 1.33, 0);
  for (const s of [-1, 1]) addM(g, new THREE.CylinderGeometry(0.06, 0.06, 0.4, 6), m.blueCloth, s * 0.1, 0.2, 0);
  const arms = new THREE.Group();
  arms.position.set(0, 0.95, -0.05);
  g.add(arms);
  addM(arms, new THREE.CylinderGeometry(0.025, 0.025, 1.2, 5), m.wood, 0, -0.2, -0.35).rotation.x = 1.1;
  addM(arms, new THREE.BoxGeometry(0.22, 0.03, 0.14), m.iron, 0, -0.45, -0.85);
  g.userData.arms = arms;
  return g;
}

/* ---------------- 原創角色 ---------------- */

function baimiao() {
  const g = new THREE.Group();
  const white = std(0xffffff, 0.45);
  const gold = std(0xfacc15, 0.38, { emissive: new THREE.Color(0xd97706), emissiveIntensity: 0.18 });
  const pink = std(0xfda4af, 0.5);
  const dark = std(0x3b2314, 0.4);
  const body = new THREE.Group();
  g.add(body);
  addM(body, new THREE.SphereGeometry(0.32, 14, 12).scale(1, 0.92, 1.25), white, 0, 0.36, 0);
  addM(body, new THREE.SphereGeometry(0.3, 14, 12), white, 0, 0.76, -0.26);
  for (const s of [-1, 1]) {
    addM(body, new THREE.ConeGeometry(0.1, 0.18, 6), gold, s * 0.17, 1.03, -0.26);
    addM(body, new THREE.SphereGeometry(0.045, 8, 6), dark, s * 0.11, 0.8, -0.53);
    addM(body, new THREE.SphereGeometry(0.04, 8, 6).scale(1.4, 0.7, 0.6), pink, s * 0.17, 0.7, -0.5);
  }
  addM(body, new THREE.TorusGeometry(0.2, 0.035, 6, 16).rotateX(Math.PI / 2), gold, 0, 0.55, -0.2);
  addM(body, new THREE.SphereGeometry(0.06, 8, 6), gold, 0, 0.5, -0.4);
  for (const [x, z] of [[-0.15, -0.22], [0.15, -0.22], [-0.15, 0.22], [0.15, 0.22]]) addM(body, new THREE.SphereGeometry(0.08, 8, 6), white, x, 0.08, z);
  const tail = addM(body, new THREE.CylinderGeometry(0.05, 0.04, 0.45, 6), gold, 0, 0.55, 0.42);
  tail.rotation.x = -0.7;
  g.userData.body = body;
  g.userData.tail = tail;
  return g;
}

function duohui() {
  const g = new THREE.Group();
  const sage = std(0x6b9e58, 0.55);
  const suit = std(0x1e4d2b, 0.5);
  const cream = std(0xfefce8, 0.5);
  const orange = std(0xf59e0b, 0.45);
  const black = std(0x18181b, 0.35, { metalness: 0.45 });
  const eye = std(0x15803d, 0.25);
  addM(g, new THREE.SphereGeometry(0.42, 16, 14).scale(1, 1.1, 0.95), sage, 0, 0.62, 0);
  addM(g, new THREE.SphereGeometry(0.36, 14, 12).scale(1, 1.05, 0.5), suit, 0, 0.55, -0.18);
  addM(g, new THREE.SphereGeometry(0.2, 12, 10).scale(1, 1.3, 0.5), cream, 0, 0.68, -0.3);
  addM(g, new THREE.BoxGeometry(0.06, 0.2, 0.03), std(0xb3261e, 0.5), 0, 0.62, -0.4);
  for (const s of [-1, 1]) {
    addM(g, new THREE.SphereGeometry(0.13, 12, 10), cream, s * 0.15, 1.05, -0.3);
    addM(g, new THREE.SphereGeometry(0.075, 10, 8), eye, s * 0.15, 1.05, -0.4);
    addM(g, new THREE.TorusGeometry(0.14, 0.015, 6, 16), std(0xd8a945, 0.3, { metalness: 0.6 }), s * 0.15, 1.05, -0.42);
    addM(g, new THREE.ConeGeometry(0.08, 0.2, 5), sage, s * 0.28, 1.32, -0.05);
    const wing = addM(g, new THREE.SphereGeometry(0.22, 10, 8).scale(0.35, 1, 0.8), sage, s * 0.42, 0.62, 0);
    g.userData[s < 0 ? 'wingL' : 'wingR'] = wing;
    addM(g, new THREE.CylinderGeometry(0.05, 0.06, 0.12, 6), orange, s * 0.13, 0.06, -0.05);
  }
  addM(g, new THREE.ConeGeometry(0.05, 0.14, 5).rotateX(-Math.PI / 2 - 0.4), orange, 0, 0.93, -0.45);
  // 耳機
  addM(g, new THREE.TorusGeometry(0.4, 0.025, 6, 20, Math.PI), black, 0, 1.08, -0.05).rotation.set(0, Math.PI / 2, 0);
  addM(g, new THREE.CylinderGeometry(0.012, 0.012, 0.3, 4), black, 0.32, 0.92, -0.25).rotation.x = 1.0;
  g.scale.setScalar(1.15);
  return g;
}

function agent007() {
  const g = new THREE.Group();
  // 白色機身、紫色關節（照角色設定圖）
  const metal = std(0xf1f0f7, 0.35, { metalness: 0.2 });
  const purple = std(0x7c4dbd, 0.45);
  const screen = std(0x111827, 0.2, { emissive: new THREE.Color(0x22d3ee), emissiveIntensity: 0.6 });
  // 半躺：往後靠在屋瓦上，腳掛在屋簷外
  const pivot = new THREE.Group();
  pivot.rotation.x = 0.28;
  g.add(pivot);
  addM(pivot, new THREE.CapsuleGeometry(0.3, 0.5, 6, 12), metal, 0, 0.6, 0);
  addM(pivot, new THREE.TorusGeometry(0.3, 0.07, 6, 16).rotateX(Math.PI / 2), purple, 0, 0.92, 0);
  const head = new THREE.Group();
  head.position.set(0, 1.25, 0);
  head.rotation.z = -0.38;
  pivot.add(head);
  addM(head, new THREE.SphereGeometry(0.3, 14, 12).scale(1.1, 0.9, 1), metal, 0, 0, 0);
  addM(head, new THREE.SphereGeometry(0.22, 12, 10).scale(1.2, 0.7, 0.6), screen, 0, 0.02, -0.18);
  const dish = addM(head, new THREE.ConeGeometry(0.16, 0.08, 12, 1, true), metal, 0, 0.36, 0);
  addM(head, new THREE.CylinderGeometry(0.015, 0.015, 0.14, 4), metal, 0, 0.28, 0);
  for (const s of [-1, 1]) addM(pivot, new THREE.CylinderGeometry(0.07, 0.07, 0.6, 6), metal, s * 0.16, 0.05, 0);
  // 發光平板
  addM(pivot, new THREE.BoxGeometry(0.34, 0.24, 0.03), screen, 0.25, 1.0, -0.35).rotation.x = -0.4;
  g.userData.dish = dish;
  g.userData.legs = pivot;
  return g;
}

function bear() {
  const g = new THREE.Group();
  const fur = std(0x8b5a2b, 0.75);
  const light = std(0xd9b38c, 0.7);
  const red = std(0xd32f2f, 0.4);
  const wood = std(0x6b4423, 0.8);
  const iron = std(0x6b7280, 0.4, { metalness: 0.5 });
  const glow = std(0xfacc15, 0.3, { emissive: new THREE.Color(0xf59e0b), emissiveIntensity: 0.6 });
  // 工作台
  addM(g, new THREE.BoxGeometry(1.4, 0.08, 0.7), wood, 0, 0.8, -0.75);
  for (const [x, z] of [[-0.6, -0.45], [0.6, -0.45], [-0.6, -1.05], [0.6, -1.05]]) addM(g, new THREE.BoxGeometry(0.08, 0.8, 0.08), wood, x, 0.4, z);
  const gear = addM(g, new THREE.TorusGeometry(0.16, 0.05, 6, 12).rotateX(Math.PI / 2), glow, -0.2, 0.88, -0.75);
  addM(g, new THREE.BoxGeometry(0.36, 0.2, 0.22), red, 0.45, 0.94, -0.8);
  // 身體
  addM(g, new THREE.SphereGeometry(0.42, 14, 12).scale(1, 1.15, 0.9), fur, 0, 0.62, 0);
  addM(g, new THREE.SphereGeometry(0.26, 12, 10).scale(1, 1.2, 0.5), light, 0, 0.6, -0.26);
  addM(g, new THREE.SphereGeometry(0.3, 14, 12), fur, 0, 1.22, 0);
  addM(g, new THREE.SphereGeometry(0.13, 10, 8).scale(1, 0.8, 0.8), light, 0, 1.15, -0.26);
  addM(g, new THREE.SphereGeometry(0.045, 8, 6), std(0x1f1f1f, 0.3), 0, 1.19, -0.36);
  for (const s of [-1, 1]) {
    addM(g, new THREE.SphereGeometry(0.1, 8, 6), fur, s * 0.24, 1.45, 0);
    addM(g, new THREE.SphereGeometry(0.035, 8, 6), std(0x1f1f1f, 0.3), s * 0.1, 1.28, -0.27);
    addM(g, new THREE.CylinderGeometry(0.1, 0.11, 0.35, 8), fur, s * 0.17, 0.15, 0);
  }
  // 紅色安全帽
  addM(g, new THREE.SphereGeometry(0.31, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), red, 0, 1.3, 0);
  addM(g, new THREE.CylinderGeometry(0.36, 0.36, 0.03, 16), red, 0, 1.3, -0.04);
  // 揮木槌的手
  const arm = new THREE.Group();
  arm.position.set(0.36, 0.9, -0.1);
  g.add(arm);
  addM(arm, new THREE.CylinderGeometry(0.08, 0.08, 0.4, 6), fur, 0, -0.1, -0.15).rotation.x = 1.0;
  addM(arm, new THREE.CylinderGeometry(0.025, 0.025, 0.5, 5), wood, 0, 0.05, -0.45).rotation.x = 1.4;
  addM(arm, new THREE.BoxGeometry(0.18, 0.12, 0.12), iron, 0, 0.06, -0.7);
  g.userData.arm = arm;
  g.userData.gear = gear;
  return g;
}

/* ---------------- 天上的人字雁群 ---------------- */

function birdFlock() {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0x2a2a30, side: THREE.DoubleSide });
  const wings: THREE.Mesh[] = [];
  for (let i = 0; i < 7; i++) {
    const row = Math.ceil(i / 2);
    const side = i === 0 ? 0 : i % 2 ? -1 : 1;
    const bg = new THREE.Group();
    bg.position.set(side * row * 2.2, 0, row * 2.4);
    g.add(bg);
    for (const s of [-1, 1]) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, s * 1.1, 0, 0.4, 0, 0, 0.5], 3));
      const w = new THREE.Mesh(geo, mat);
      bg.add(w);
      wings.push(w);
    }
  }
  g.userData.wings = wings;
  return g;
}

export interface FaunaOptions {
  /** 每座島的可走橢圓（欄杆位置）；欄杆外到水邊是約 5.6 m 的河岸草地 */
  rims: { cx: number; cz: number; rx: number; rz: number }[];
  /** 已有的碰撞（欄杆、岸邊樹、燈、村民）：動物不放在這些旁邊 */
  avoid: Collider[];
  /** 其他要讓開的點（渡口、橋頭、登山口） */
  avoidPts: [number, number][];
}

/** 會動的部位不參與合併 */
function keepApart(o: THREE.Object3D) {
  o.traverse((c) => (c.userData.noMerge = true));
}

/** 單一隻（或一個角色）自己合併：會動的部位先各自合併再標記保留 */
function mergeSelf(g: THREE.Group, moving: THREE.Object3D[] = []) {
  for (const mv of moving) {
    if ((mv as THREE.Group).isGroup) mergeByMaterial(mv as THREE.Group);
    keepApart(mv);
  }
  mergeByMaterial(g);
}

function nearCollider(x: number, z: number, cols: Collider[], pad: number) {
  for (const c of cols) {
    if (c.type === 'cylinder') {
      if (Math.hypot(x - c.x, z - c.z) < c.radius + pad) return true;
    } else if (c.type === 'box') {
      if (Math.abs(x - c.x) < c.halfWidth + pad && Math.abs(z - c.z) < c.halfDepth + pad) return true;
    } else {
      const abx = c.x2 - c.x1;
      const abz = c.z2 - c.z1;
      const t = Math.max(0, Math.min(1, ((x - c.x1) * abx + (z - c.z1) * abz) / (abx * abx + abz * abz || 1)));
      if (Math.hypot(x - c.x1 - abx * t, z - c.z1 - abz * t) < c.halfThickness + pad) return true;
    }
  }
  return false;
}

export function createFauna(opts: FaunaOptions): { group: THREE.Group; colliders: Collider[] } {
  const root = new THREE.Group();
  root.name = 'fauna';
  const colliders: Collider[] = [];
  const rand = seeded(4242);
  const m: Record<string, THREE.Material> = {
    buffalo: std(0x4a4440, 0.85),
    muzzle: std(0x2e2a28, 0.8),
    horn: std(0xd8cdb8, 0.6),
    wool: std(0xf4f1ea, 0.95),
    face: std(0x2b2523, 0.8),
    pig: std(0xf2b8c0, 0.7),
    pigNose: std(0xe48d9c, 0.6),
    hen: std(0xb7743a, 0.8),
    tail: std(0x2f4a3a, 0.6),
    beak: std(0xe0a030, 0.5),
    comb: std(0xd32f2f, 0.5),
    white: std(0xfafafa, 0.6),
    beakYellow: std(0xf2c230, 0.5),
    leg: std(0x2a2a2a, 0.6),
    blueCloth: std(0x3e5c7a, 0.85),
    skin: std(0xf1c9a5, 0.7),
    straw: std(0xc9a764, 0.95),
    wood: std(0x6b4423, 0.85),
    iron: std(0x6b7280, 0.5),
  };
  type Anim = (t: number) => void;
  const anims: Anim[] = [];
  // 靜態動物合併成少數幾個網格（手機上繪製次數才不會爆）
  const statics = new THREE.Group();
  const offGroup = new THREE.Group();
  root.add(statics, offGroup);
  const offDuty: THREE.Object3D[] = [offGroup];
  anims.push(() => {
    const on = faunaEnv.tod !== 'night' && faunaEnv.weather === 'clear';
    if (offDuty[0] && offDuty[0].visible !== on) offDuty.forEach((o) => (o.visible = on));
  });
  const ISLANDS: [number, number][] = [[0, 0], [-68, -48], [72, -48], [-68, 48], [72, 48]];
  const near = (x: number, z: number) => Math.min(...ISLANDS.map(([a, b]) => Math.hypot(x - a, z - b)));
  // 先放在島與島之間、離岸近的田（從島邊看得到），遠的大片田也撒一些
  const lands = FARMLANDS.filter((l) => l.rx >= 10 && l.rz >= 6).sort((a, b) => near(a.cx, a.cz) - near(b.cx, b.cz));
  const spotOn = (li: number) => {
    const l = lands[(li * 7) % lands.length];
    const c = Math.cos(l.rot);
    const s = Math.sin(l.rot);
    let best: [number, number] = [l.cx, l.cz];
    let bd = Infinity;
    // 取三個候選點，用最靠近島的那一個
    for (let k = 0; k < 3; k++) {
      const a = rand() * Math.PI * 2;
      const r = 0.2 + rand() * 0.5;
      const lx = Math.cos(a) * l.rx * r;
      const lz = Math.sin(a) * l.rz * r;
      const p: [number, number] = [l.cx + lx * c - lz * s, l.cz + lx * s + lz * c];
      const d = near(p[0], p[1]);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  };
  if (lands.length) {
    // 水牛（慢慢低頭吃草）
    for (let i = 0; i < 5; i++) {
      const g = buffalo(m);
      const [x, z] = spotOn(i * 3);
      g.position.set(x, 0.5, z);
      g.rotation.y = rand() * Math.PI * 2;
      statics.add(g);
      const head = g.userData.head as THREE.Object3D;
      if (head instanceof THREE.Group) mergeByMaterial(head);
      keepApart(head);
      const ph = rand() * 6;
      anims.push((t) => {
        head.rotation.x = 0.35 + Math.sin(t * 0.6 + ph) * 0.3;
      });
    }
    // 綿羊群
    for (let k = 0; k < 2; k++) {
      const [cx, cz] = spotOn(5 + k * 4);
      for (let i = 0; i < 5; i++) {
        const g = sheep(m);
        g.position.set(cx + (rand() - 0.5) * 5, 0.5, cz + (rand() - 0.5) * 5);
        g.rotation.y = rand() * Math.PI * 2;
        statics.add(g);
      }
    }
    // 小豬
    for (let i = 0; i < 3; i++) {
      const g = pig(m);
      const [x, z] = spotOn(2 + i * 5);
      g.position.set(x, 0.5, z);
      g.rotation.y = rand() * Math.PI * 2;
      statics.add(g);
    }
    // 雞（啄食）
    for (let k = 0; k < 3; k++) {
      const [cx, cz] = spotOn(1 + k * 6);
      for (let i = 0; i < 4; i++) {
        const g = chicken(m, i % 3 !== 0);
        g.position.set(cx + (rand() - 0.5) * 3, 0.5, cz + (rand() - 0.5) * 3);
        g.rotation.y = rand() * Math.PI * 2;
        offGroup.add(g);
      }
    }
    // 白鷺鷥（站在田裡）
    for (let i = 0; i < 8; i++) {
      const g = egret(m);
      const [x, z] = spotOn(i * 2 + 1);
      g.position.set(x, 0.5, z);
      g.rotation.y = rand() * Math.PI * 2;
      statics.add(g);
    }
    // 戴斗笠鋤地的農夫
    for (let i = 0; i < 6; i++) {
      const g = farmer(m);
      const [x, z] = spotOn(i * 4 + 2);
      g.position.set(x, 0.5, z);
      g.rotation.y = rand() * Math.PI * 2;
      offGroup.add(g);
      const arms = g.userData.arms as THREE.Object3D;
      if (arms instanceof THREE.Group) mergeByMaterial(arms);
      keepApart(arms);
      const ph = rand() * 6;
      anims.push((t) => {
        arms.rotation.x = Math.max(0, Math.sin(t * 2.2 + ph)) * -0.9;
      });
    }
  }

  // ── 河岸草地（欄杆外、玩家走得到的地方）：吃草的水牛、綿羊、雞，水邊的白鷺鷥 ──
  const rimSpot = (isl: FaunaOptions['rims'][number], extra: number, pad: number): [number, number, number] | null => {
    for (let k = 0; k < 40; k++) {
      const a = rand() * Math.PI * 2;
      const x = isl.cx + Math.cos(a) * (isl.rx + extra);
      const z = isl.cz + Math.sin(a) * (isl.rz + extra);
      if (opts.avoidPts.some(([px, pz]) => Math.hypot(px - x, pz - z) < 7)) continue;
      if (nearCollider(x, z, opts.avoid, pad) || nearCollider(x, z, colliders, pad)) continue;
      // 切線方向（沿著岸邊）
      const tan = Math.atan2(-Math.sin(a) * isl.rx, Math.cos(a) * isl.rz);
      return [x, z, tan];
    }
    return null;
  };
  const RIM_KINDS: ('buffalo' | 'sheep' | 'chicken')[][] = [
    ['chicken', 'sheep'],
    ['buffalo', 'chicken'],
    ['sheep', 'buffalo'],
    ['chicken', 'sheep'],
    ['buffalo', 'chicken'],
  ];
  opts.rims.forEach((isl, ii) => {
    for (const kind of RIM_KINDS[ii % RIM_KINDS.length]) {
      const sp = rimSpot(isl, 2.9, kind === 'buffalo' ? 1.4 : 0.9);
      if (!sp) continue;
      const [x, z, tan] = sp;
      if (kind === 'buffalo') {
        const g = buffalo(m);
        g.name = 'rim-buffalo';
        g.position.set(x, -0.04, z);
        g.rotation.y = tan + (rand() - 0.5) * 0.6;
        statics.add(g);
        colliders.push({ id: `fauna-buffalo-${ii}`, type: 'cylinder', x, z, radius: 0.9 });
        const head = g.userData.head as THREE.Object3D;
        if (head instanceof THREE.Group) mergeByMaterial(head);
        keepApart(head);
        const ph = rand() * 6;
        anims.push((t) => {
          head.rotation.x = 0.35 + Math.sin(t * 0.6 + ph) * 0.3;
        });
      } else if (kind === 'sheep') {
        for (let i = 0; i < 3; i++) {
          const g = sheep(m);
          g.name = 'rim-sheep';
          const ox = (rand() - 0.5) * 2.4;
          const oz = (rand() - 0.5) * 2.4;
          g.position.set(x + ox, -0.04, z + oz);
          g.rotation.y = rand() * Math.PI * 2;
          statics.add(g);
        }
        colliders.push({ id: `fauna-sheep-${ii}`, type: 'cylinder', x, z, radius: 1.4 });
      } else {
        for (let i = 0; i < 4; i++) {
          const g = chicken(m, i % 3 !== 0);
          offDuty.push(g);
          g.position.set(x + (rand() - 0.5) * 2.2, -0.04, z + (rand() - 0.5) * 2.2);
          g.rotation.y = rand() * Math.PI * 2;
          root.add(g);
          // 一隻一個合併網格；在草地上慢慢踱步、轉頭
          mergeSelf(g);
          keepApart(g);
          const ph = rand() * 6;
          const bx = g.position.x;
          const bz = g.position.z;
          const by = g.rotation.y;
          anims.push((t) => {
            g.rotation.y = by + Math.sin(t * 0.5 + ph) * 0.8;
            g.position.x = bx + Math.sin(t * 0.3 + ph) * 0.5;
            g.position.z = bz + Math.cos(t * 0.23 + ph) * 0.5;
          });
        }
      }
    }
    // 水邊的白鷺鷥
    for (let i = 0; i < 2; i++) {
      const sp = rimSpot(isl, 5.1, 0.6);
      if (!sp) continue;
      const g = egret(m);
      g.name = 'rim-egret';
      g.position.set(sp[0], -0.04, sp[1]);
      g.rotation.y = sp[2] + (rand() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
      statics.add(g);
    }
  });

  // ── 原創角色 ──
  const pick = (id: CharacterId, w: number, h: number, x: number, z: number, y0 = 0) => root.add(makePickProxy(w, h, w, x, z, 0, { kind: 'character', id }, y0));

  // 白喵：徵才島庭院前庭繞圈閒晃，偶爾停下來打滾
  {
    const g = baimiao();
    root.add(g);
    const body = g.userData.body as THREE.Object3D;
    const tail = g.userData.tail as THREE.Object3D;
    keepApart(tail);
    mergeByMaterial(body as THREE.Group);
    const proxy = makePickProxy(1.2, 1.3, 1.2, 0, 0, 0, { kind: 'character', id: 'baimiao' });
    root.add(proxy);
    anims.push((t) => {
      const cyc = t % 40;
      const a = t * 0.14;
      const x = 66 + Math.cos(a) * 5.5;
      const z = 50.5 + Math.sin(a) * 3.2;
      if (cyc < 32) {
        g.position.set(x, 0, z);
        g.rotation.y = Math.atan2(Math.sin(a), -Math.cos(a) * 0.58);
        body.rotation.z = 0;
        body.position.y = Math.abs(Math.sin(t * 6)) * 0.04;
      } else {
        // 打滾
        body.rotation.z = Math.sin((cyc - 32) * 1.2) * 1.4;
      }
      tail.rotation.z = Math.sin(t * 3) * 0.4;
      proxy.position.set(g.position.x, 0.65, g.position.z);
    });
  }
  // 多慧：主島中央廣場招呼旅人，偶爾拍拍翅膀
  {
    const g = duohui();
    // 站在「探索看板」旁邊，面向中央廣場
    g.position.set(-10.05, 0, -11.0);
    g.rotation.y = Math.atan2(-10.05, -11.0);
    root.add(g);
    colliders.push({ id: 'char-duohui', type: 'cylinder', x: -10.05, z: -11.0, radius: 0.6 });
    pick('duohui', 1.2, 1.9, -10.05, -11.0);
    const wl = g.userData.wingL as THREE.Object3D;
    const wr = g.userData.wingR as THREE.Object3D;
    mergeSelf(g, [wl, wr]);
    anims.push((t) => {
      const f = (t % 6) < 1.2 ? Math.sin(t * 14) * 0.6 : 0;
      wl.rotation.z = f;
      wr.rotation.z = -f;
      g.position.y = Math.abs(Math.sin(t * 1.6)) * 0.03;
    });
  }
  // 007：躺在翰林院屋頂（前坡）吹風看平板
  {
    const g = agent007();
    g.name = 'char-007';
    // 翰林院一層屋簷（簷口約 z 47、高 6.6）：靠在屋瓦上、腳掛在簷外，面向庭院
    g.position.set(63.2, 6.6, 47.1);
    g.rotation.y = Math.PI;
    g.scale.setScalar(1.15);
    root.add(g);
    pick('agent007', 1.4, 1.9, 63.2, 47.0, 6.0);
    const dish = g.userData.dish as THREE.Object3D;
    mergeSelf(g, [dish]);
    anims.push((t) => {
      dish.rotation.y = t * 2;
    });
  }
  // 大熊：百工坊街心工作台敲敲打打
  {
    const g = bear();
    g.position.set(88.2, 0, -43.0);
    g.rotation.y = Math.PI;
    root.add(g);
    colliders.push({ id: 'char-bear', type: 'box', x: 88.2, z: -42.6, halfWidth: 0.8, halfDepth: 0.85 });
    pick('bear', 1.8, 1.8, 88.2, -42.6);
    const arm = g.userData.arm as THREE.Object3D;
    const gear = g.userData.gear as THREE.Object3D;
    mergeSelf(g, [arm, gear]);
    anims.push((t) => {
      arm.rotation.x = Math.max(0, Math.sin(t * 5)) * -1.0;
      gear.rotation.y = t * 0.8;
    });
  }

  // ── 人字雁群（白天、天氣好時偶爾飛過；由外部決定顯示） ──
  const flock = birdFlock();
  flock.visible = false;
  root.add(flock);
  root.userData.flock = flock;
  anims.push((t) => {
    const cyc = t % 70;
    if (!(faunaEnv.tod === 'day' && faunaEnv.weather === 'clear') || cyc > 24) {
      flock.visible = false;
      return;
    }
    flock.visible = true;
    const p = cyc / 24;
    flock.position.set(-160 + p * 320, 46 + Math.sin(p * 3) * 3, -30 + p * 60);
    flock.rotation.y = -Math.atan2(320, 60) + Math.PI;
    const wings = flock.userData.wings as THREE.Mesh[];
    wings.forEach((w, i) => (w.rotation.z = Math.sin(t * 5 + i * 0.3) * 0.5 * (i % 2 ? 1 : -1)));
  });

  mergeByMaterial(statics);
  mergeByMaterial(offGroup);
  root.userData.tick = (t: number) => {
    for (const a of anims) a(t);
  };
  return { group: root, colliders };
}
