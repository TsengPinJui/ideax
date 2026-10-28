import * as THREE from 'three';
import type { Collider } from '../types';
import { FARMLANDS, farmHouseLayout, FarmHouse } from './basinLayout';
import { seeded } from './textures';
import { makePickProxy } from '../picking';
import { mergeByMaterial } from './architecture';
import { AgentSprite, SPRITES } from './agentSprites';
const wrapA = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
import { BEAR_LOCAL } from './craftStreet';
import { REGION_CONFIGS, localToWorldXZ } from '../regionConfigs';

/**
 * 五島的生活感（照 /island）：
 * - 田園：水牛、綿羊、小豬、雞、白鷺鷥、戴斗笠鋤地的農夫
 * - 天空：白天好天氣時偶爾飛過的人字雁群
 * - 創點源原創角色：白喵（徵才島庭院閒晃打滾）、多慧（主島廣場招呼旅人）、007（躺在翰林院屋頂）、大熊（百工坊街的大熊匠鋪裡敲敲打打）
 * 點原創角色會在左側打開角色小卡
 */

/** 由環境（時段、天氣）寫入：晴朗白天才有雁群；夜裡或下雨時農夫收工回家、雞進雞舍 */
export const faunaEnv: { tod: string; weather: string; camX: number; camY: number; camZ: number } = { tod: 'dusk', weather: 'clear', camX: 0, camY: 1.6, camZ: 0 };

const KAI = '"DFKai-SB","BiauKai","Kaiti TC","STKaiti","KaiTi","LXGW WenKai TC","Noto Serif TC",serif';

/** 角色頭上的對話泡泡（走近才浮現） */
function speechBubble(name: string, line: string) {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 200;
  const g = c.getContext('2d')!;
  const text = line.replace(/^「|」$/g, '');
  // 斷成最多兩行
  const per = Math.ceil(text.length / Math.ceil(text.length / 15));
  const lines = [text.slice(0, per), text.slice(per)].filter(Boolean);
  const rr = (x: number, y: number, w: number, h: number, r: number) => {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  };
  const h = lines.length > 1 ? 160 : 112;
  g.fillStyle = 'rgba(253,246,227,0.96)';
  g.strokeStyle = '#8b5a2b';
  g.lineWidth = 6;
  rr(6, 6, 628, h, 26);
  g.fill();
  g.stroke();
  // 小尾巴
  g.beginPath();
  g.moveTo(300, h + 4);
  g.lineTo(320, h + 34);
  g.lineTo(340, h + 4);
  g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(300, h + 6);
  g.lineTo(320, h + 34);
  g.lineTo(340, h + 6);
  g.stroke();
  g.fillStyle = '#b3261e';
  g.font = `900 30px ${KAI}`;
  g.textBaseline = 'top';
  g.fillText(name, 28, 18);
  g.fillStyle = '#3b2314';
  g.font = `700 40px ${KAI}`;
  lines.forEach((l, i) => g.fillText(l, 28, 56 + i * 48));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }));
  sp.scale.set(3.2, 1.0, 1);
  sp.center.set(0.5, 0);
  sp.visible = false;
  sp.renderOrder = 10;
  return sp;
}

/** 走近角色：泡泡淡入；離開淡出 */
function bubbleTick(sp: THREE.Sprite, x: number, y: number, z: number, near = 6.5) {
  const d = Math.hypot(faunaEnv.camX - x, faunaEnv.camZ - z, (faunaEnv.camY - y) * 0.6);
  const target = d < near ? 1 : d > near + 3 ? 0 : 1 - (d - near) / 3;
  const m = sp.material as THREE.SpriteMaterial;
  m.opacity += (target - m.opacity) * 0.12;
  sp.visible = m.opacity > 0.02;
  sp.position.set(x, y, z);
  return d;
}

export type CharacterId = 'baimiao' | 'duohui' | 'agent007' | 'bear' | 'sousou' | 'xiaodengpao';

export const CHARACTERS: Record<CharacterId, { name: string; role: string; line: string; where: string; img: string }> = {
  baimiao: { img: '/agents/baimiao.webp', name: '白喵', role: '市場顧問 Agent', line: '「哈基米～讓我先打個滾再幫你媒合專家喵！」', where: '徵才島庭院・石拱橋一帶閒晃' },
  duohui: { img: '/agents/duohui.webp', name: '頂多慧', role: '官方客服 Agent', line: '「25 小時全年無休，有任何問題都包在我身上！」', where: '主島・中央廣場' },
  sousou: { img: '/agents/sousou.webp', name: '搜搜', role: '探索者 Agent', line: '「駕著筋斗雲，一眨眼就幫你尋遍天下機會！」', where: '五島上空・筋斗雲' },
  agent007: { img: '/agents/agent007.webp', name: '007', role: 'AI CRM Agent', line: '「躺在翰林院屋頂吹風，全島情報都在我的雷達裡！」', where: '徵才島・翰林院屋頂' },
  xiaodengpao: { img: '/agents/xiaodengpao.webp', name: '小燈泡', role: '調節器 Agent', line: '「有新點子我就亮一下！跌倒了也會馬上爬起來～」', where: '主島・中央廣場大燈泡旁' },
  bear: { img: '/agents/bear.webp', name: '大熊', role: '預備神兵', line: '「敲敲打打修修補補，再難的技術都能幫你落地！」', where: '討論島・百工坊街的大熊匠鋪' },
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

/** 在河岸散步的村民（本地 -Z 朝前）；有的挑著扁擔 */
function walker(m: Record<string, THREE.Material>, rand: () => number, pole: boolean) {
  const g = new THREE.Group();
  const shirts = [m.blueCloth, m.shirtRed, m.shirtGreen, m.shirtWhite];
  const shirt = shirts[Math.floor(rand() * shirts.length)];
  const pants = rand() > 0.5 ? m.pantsBrown : m.blueCloth;
  const body = new THREE.Group();
  g.add(body);
  addM(body, new THREE.CapsuleGeometry(0.19, 0.42, 4, 10), shirt, 0, 1.08, 0);
  addM(body, new THREE.SphereGeometry(0.15, 12, 10), m.skin, 0, 1.55, 0);
  if (rand() > 0.4) addM(body, new THREE.ConeGeometry(0.36, 0.18, 14), m.straw, 0, 1.7, 0);
  else addM(body, new THREE.SphereGeometry(0.155, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.hair, 0, 1.57, 0.01);
  if (pole) {
    // 扁擔與兩個竹籃
    addM(body, new THREE.CylinderGeometry(0.025, 0.025, 1.9, 6).rotateZ(Math.PI / 2), m.wood, 0, 1.38, 0.05);
    for (const s2 of [-1, 1]) {
      addM(body, new THREE.CylinderGeometry(0.005, 0.005, 0.7, 3), m.wood, s2 * 0.88, 1.03, 0.05);
      addM(body, new THREE.CylinderGeometry(0.22, 0.17, 0.26, 10, 1, true), m.basket, s2 * 0.88, 0.62, 0.05);
      addM(body, new THREE.SphereGeometry(0.16, 8, 6), s2 < 0 ? m.veg : m.straw, s2 * 0.88, 0.72, 0.05);
    }
  }
  const limbs: THREE.Group[] = [];
  for (const s2 of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(s2 * 0.1, 0.78, 0);
    addM(leg, new THREE.CapsuleGeometry(0.085, 0.55, 4, 8), pants, 0, -0.38, 0);
    g.add(leg);
    leg.userData.swing = s2;
    limbs.push(leg);
    if (!pole) {
      const arm = new THREE.Group();
      arm.position.set(s2 * 0.25, 1.28, 0);
      addM(arm, new THREE.CapsuleGeometry(0.055, 0.42, 4, 6), shirt, 0, -0.26, 0);
      g.add(arm);
      arm.userData.swing = -s2;
      limbs.push(arm);
    } else {
      // 挑扁擔：手扶在擔子上
      addM(body, new THREE.CapsuleGeometry(0.055, 0.3, 4, 6), shirt, s2 * 0.24, 1.32, -0.05).rotation.x = -1.2;
    }
  }
  g.userData.body = body;
  g.userData.limbs = limbs;
  return g;
}

/* ---------------- 原創角色 ---------------- */

// 原創角色的造型在 agentSprites.ts（角色設定圖看板人）

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
    shirtRed: std(0x9c3a2e, 0.8),
    shirtGreen: std(0x4f7a4a, 0.8),
    shirtWhite: std(0xece4d2, 0.8),
    pantsBrown: std(0x7a5532, 0.8),
    hair: std(0x2a1d14, 0.7),
    basket: std(0xb08a4e, 0.95),
    veg: std(0x6aa84f, 0.8),
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
  // 農舍位置（和環境建模同一套亂數）：動物不站進屋裡
  const housesOf = new Map<(typeof FARMLANDS)[number], FarmHouse[]>();
  FARMLANDS.forEach((l, li) => housesOf.set(l, farmHouseLayout(l, seeded(Math.round(l.seed * 100)), li)));
  const spotOn = (li: number) => {
    const l = lands[(li * 7) % lands.length];
    const hs = housesOf.get(l) || [];
    const c = Math.cos(l.rot);
    const s = Math.sin(l.rot);
    let best: [number, number] = [l.cx, l.cz];
    let bd = Infinity;
    // 取幾個候選點，避開農舍，用最靠近島的那一個
    for (let k = 0; k < 8; k++) {
      const a = rand() * Math.PI * 2;
      const r = 0.2 + rand() * 0.5;
      const lx = Math.cos(a) * l.rx * r;
      const lz = Math.sin(a) * l.rz * r;
      const p: [number, number] = [l.cx + lx * c - lz * s, l.cz + lx * s + lz * c];
      if (hs.some((h) => Math.hypot(h.x - p[0], h.z - p[1]) < Math.max(h.w, h.d) / 2 + 1.8)) continue;
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
      root.add(makePickProxy(1.4, 1.6, 2.4, x, z, g.rotation.y, { kind: 'egg', egg: 'buffalo', maxDist: 40 }, 0.5));
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
      root.add(makePickProxy(0.9, 1.3, 0.9, x, z, 0, { kind: 'egg', egg: 'egret', maxDist: 45 }, 0.5));
    }
    // 戴斗笠鋤地的農夫
    for (let i = 0; i < 6; i++) {
      const g = farmer(m);
      const [x, z] = spotOn(i * 4 + 2);
      g.position.set(x, 0.5, z);
      g.rotation.y = rand() * Math.PI * 2;
      offGroup.add(g);
      offGroup.add(makePickProxy(0.9, 1.6, 0.9, x, z, 0, { kind: 'egg', egg: 'villager', maxDist: 45 }, 0.5));
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
        root.add(makePickProxy(1.4, 1.6, 2.4, x, z, g.rotation.y, { kind: 'egg', egg: 'buffalo', maxDist: 40 }));
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
      root.add(makePickProxy(0.9, 1.3, 0.9, sp[0], sp[1], 0, { kind: 'egg', egg: 'egret', maxDist: 40 }));
    }
  });

  // ── 河岸散步的村民（沿著欄杆外的草地來回走；有的挑扁擔） ──
  const walkers: { g: THREE.Group; isl: FaunaOptions['rims'][number]; a0: number; a1: number; ph: number; sp: number }[] = [];
  const RIM_WALK = 2.0;
  const arcClear = (isl: FaunaOptions['rims'][number], a0: number, a1: number) => {
    for (let k = 0; k <= 16; k++) {
      const a = a0 + ((a1 - a0) * k) / 16;
      const x = isl.cx + Math.cos(a) * (isl.rx + RIM_WALK);
      const z = isl.cz + Math.sin(a) * (isl.rz + RIM_WALK);
      if (opts.avoidPts.some(([px, pz]) => Math.hypot(px - x, pz - z) < 6)) return false;
      if (nearCollider(x, z, opts.avoid, 0.6) || nearCollider(x, z, colliders, 0.6)) return false;
    }
    return true;
  };
  opts.rims.forEach((isl, ii) => {
    let placed = 0;
    const used: [number, number][] = [];
    for (let tries = 0; tries < 60 && placed < 2; tries++) {
      const a0 = rand() * Math.PI * 2;
      const span = (10 + rand() * 12) / Math.max(isl.rx, isl.rz);
      // 同一座島的兩位不走同一段
      if (used.some(([u0, u1]) => {
        const mid = (a0 + span / 2 - (u0 + u1) / 2 + Math.PI * 3) % (Math.PI * 2) - Math.PI;
        return Math.abs(mid) < (span + (u1 - u0)) / 2 + 0.15;
      })) continue;
      if (!arcClear(isl, a0, a0 + span)) continue;
      used.push([a0, a0 + span]);
      const g = walker(m, rand, (ii + placed) % 3 === 1);
      g.name = 'rim-walker';
      root.add(g);
      // 跟著走的點擊範圍（本地座標，跟著村民動）
      const px = makePickProxy(0.9, 1.8, 0.9, 0, 0, 0, { kind: 'egg', egg: 'villager', maxDist: 35 });
      g.add(px);
      walkers.push({ g, isl, a0, a1: a0 + span, ph: rand() * 10, sp: 0.85 + rand() * 0.3 });
      placed++;
    }
  });
  walkers.forEach((w) => {
    const body = w.g.userData.body as THREE.Group;
    const limbs = w.g.userData.limbs as THREE.Group[];
    mergeByMaterial(body);
    keepApart(body);
    for (const l of limbs) keepApart(l);
  });
  anims.push((t) => {
    const on = faunaEnv.weather === 'clear';
    for (const w of walkers) {
      w.g.visible = on;
      if (!on) continue;
      const rx = w.isl.rx + RIM_WALK;
      const rz = w.isl.rz + RIM_WALK;
      const len = (w.a1 - w.a0) * Math.max(rx, rz);
      const dur = len / w.sp;
      // 來回走：0→1→0，兩端稍停
      const cyc = ((t + w.ph * 7) % (dur * 2 + 4)) - 1;
      const forward = cyc < dur + 1;
      const u = forward ? Math.min(1, Math.max(0, cyc / dur)) : Math.min(1, Math.max(0, 1 - (cyc - dur - 2) / dur));
      const moving = forward ? cyc > 0 && cyc < dur : cyc > dur + 2 && cyc < dur * 2 + 2;
      const a = w.a0 + (w.a1 - w.a0) * u;
      const x = w.isl.cx + Math.cos(a) * rx;
      const z = w.isl.cz + Math.sin(a) * rz;
      // 切線方向（角度增加的方向），面向前進方向（本地 -Z 朝前）
      const tx = -Math.sin(a) * rx;
      const tz = Math.cos(a) * rz;
      const dirSign = forward ? 1 : -1;
      w.g.position.set(x, -0.04, z);
      w.g.rotation.y = Math.atan2(-tx * dirSign, -tz * dirSign);
      const sw = moving ? Math.sin(t * 6.5 + w.ph) * 0.5 : 0;
      const limbs = w.g.userData.limbs as THREE.Group[];
      for (const l of limbs) l.rotation.x = (l.userData.swing as number) * sw;
      (w.g.userData.body as THREE.Object3D).position.y = moving ? Math.abs(Math.sin(t * 6.5 + w.ph)) * 0.04 : 0;
    }
  });

  // ── 原創角色：直接用角色設定圖做的看板人（agentSprites：依角度換正／斜／側／背面圖） ──
  const pick = (id: CharacterId, w: number, h: number, x: number, z: number, y0 = 0) => root.add(makePickProxy(w, h, w, x, z, 0, { kind: 'character', id }, y0));
  const sprites: AgentSprite[] = [];
  const spriteOf = (id: keyof typeof SPRITES, name: string) => {
    const sp = new AgentSprite(SPRITES[id]);
    sp.group.name = name;
    root.add(sp.group);
    sprites.push(sp);
    return sp;
  };

  // 白喵：徵才島庭院前庭繞圈閒晃，偶爾停下來打滾；會走出西月洞門、過石拱橋到主島橋頭睡一下
  {
    const sp = spriteOf('baimiao', 'char-cat');
    const g = sp.group;
    const proxy = makePickProxy(1.1, 1.2, 1.1, 0, 0, 0, { kind: 'character', id: 'baimiao' });
    root.add(proxy);
    const bub = speechBubble(CHARACTERS.baimiao.name, CHARACTERS.baimiao.line);
    root.add(bub);
    const PATH: [number, number][] = [
      [66, 50.5],
      [53.2, 49.6],
      [52.6, 37.2],
      [48, 35.5],
      [46, 35],
      [20, 15],
    ];
    const BRIDGE_A = 4; // PATH[4]→PATH[5] 是石拱橋
    const segLen = PATH.slice(1).map((p, i) => Math.hypot(p[0] - PATH[i][0], p[1] - PATH[i][1]));
    const total = segLen.reduce((a, b) => a + b, 0);
    const SPEED = 1.15;
    const WALK = total / SPEED;
    const LOOP = 34; // 庭院閒晃
    const NAP = 14; // 橋頭打盹
    const CYCLE = LOOP + WALK + NAP + WALK;
    const along = (d: number): [number, number, number, number] => {
      let rest = Math.max(0, Math.min(total, d));
      for (let i = 0; i < segLen.length; i++) {
        if (rest <= segLen[i] || i === segLen.length - 1) {
          const u = segLen[i] ? Math.min(1, rest / segLen[i]) : 0;
          const [ax, az] = PATH[i];
          const [bx, bz] = PATH[i + 1];
          const x = ax + (bx - ax) * u;
          const z = az + (bz - az) * u;
          const y = i === BRIDGE_A ? Math.sin(u * Math.PI) * 2.1 + 0.05 : 0;
          return [x, y, z, Math.atan2(bx - ax, bz - az)];
        }
        rest -= segLen[i];
      }
      return [PATH[0][0], 0, PATH[0][1], 0];
    };
    anims.push((t) => {
      const c = (t + 7) % CYCLE;
      let moving = true;
      sp.pose = null;
      if (c < LOOP) {
        const a = (c / LOOP) * Math.PI * 4;
        g.position.set(66 + Math.cos(a) * 5.5 - 5.5, 0, 50.5 + Math.sin(a) * 3.2);
        // 前進方向＝繞圈切線
        sp.facing = Math.atan2(-Math.sin(a) * 5.5, Math.cos(a) * 3.2);
        if (c > LOOP - 7) {
          // 停下來蹦蹦跳跳打滾
          sp.pose = 'jump';
          moving = false;
        }
      } else if (c < LOOP + WALK) {
        const [x, y, z, h] = along((c - LOOP) * SPEED);
        g.position.set(x, y, z);
        sp.facing = h;
        if ((c - LOOP) % 9 < 3) sp.pose = 'run';
      } else if (c < LOOP + WALK + NAP) {
        const [x, y, z] = along(total);
        g.position.set(x, y, z);
        sp.pose = 'sleep';
        moving = false;
      } else {
        const [x, y, z, h] = along(total - (c - LOOP - WALK - NAP) * SPEED);
        g.position.set(x, y, z);
        sp.facing = h + Math.PI;
      }
      sp.hop = sp.pose === 'jump' ? Math.abs(Math.sin(t * 5)) * 0.35 : moving ? Math.abs(Math.sin(t * 7)) * 0.06 : 0;
      sp.squash = sp.pose === 'sleep' ? Math.sin(t * 1.4) * 0.03 : moving ? Math.sin(t * 14) * 0.02 : 0;
      sp.tilt = moving ? Math.sin(t * 7) * 0.05 : 0;
      proxy.position.set(g.position.x, g.position.y + 0.6, g.position.z);
      bubbleTick(bub, g.position.x, g.position.y + 1.3, g.position.z);
    });
  }
  // 搜搜：駕著筋斗雲在五島上空騰雲駕霧
  {
    const sp = spriteOf('sousou', 'char-sousou');
    const g = sp.group;
    const proxy = makePickProxy(2.8, 2.8, 2.8, 0, 0, 0, { kind: 'character', id: 'sousou' });
    g.add(proxy);
    const bub = speechBubble(CHARACTERS.sousou.name, CHARACTERS.sousou.line);
    root.add(bub);
    const pos = (t: number): [number, number, number] => [Math.sin(t * 0.028) * 78, 14 + Math.sin(t * 0.11) * 2.2, Math.sin(t * 0.056) * 46];
    anims.push((t) => {
      const [x, y, z] = pos(t);
      const [nx, , nz] = pos(t + 0.5);
      g.position.set(x, y, z);
      sp.facing = Math.atan2(nx - x, nz - z);
      sp.tilt = Math.sin(t * 0.7) * 0.06;
      sp.hop = Math.sin(t * 1.8) * 0.12;
      bubbleTick(bub, x, y + 3.0, z, 14);
    });
  }
  // 頂多慧：主島中央廣場招呼旅人；有人走近就轉過來，偶爾揮揮翅膀
  {
    const X = -10.05;
    const Z = -11.0;
    const sp = spriteOf('duohui', 'char-duohui');
    sp.group.position.set(X, 0, Z);
    colliders.push({ id: 'char-duohui', type: 'cylinder', x: X, z: Z, radius: 0.6 });
    pick('duohui', 1.2, 1.9, X, Z);
    const bub = speechBubble(CHARACTERS.duohui.name, CHARACTERS.duohui.line);
    root.add(bub);
    const restYaw = Math.atan2(-X, -Z);
    sp.facing = restYaw;
    anims.push((t) => {
      const d = bubbleTick(bub, X, 2.0, Z);
      const want = d < 8 ? Math.atan2(faunaEnv.camX - X, faunaEnv.camZ - Z) : restYaw;
      sp.facing += wrapA(want - sp.facing) * 0.06;
      sp.pose = d < 8 && t % 6 < 1.6 ? 'wave' : null;
      sp.hop = sp.pose ? Math.abs(Math.sin(t * 6)) * 0.08 : Math.abs(Math.sin(t * 1.6)) * 0.02;
    });
  }
  // 007：坐在翰林院一層屋簷上吹風看平板（面向庭院）
  {
    const sp = spriteOf('agent007', 'char-007');
    sp.group.position.set(63.2, 6.45, 47.0);
    sp.facing = 0;
    pick('agent007', 1.4, 1.9, 63.2, 47.0, 6.0);
    const bub = speechBubble(CHARACTERS.agent007.name, CHARACTERS.agent007.line);
    root.add(bub);
    anims.push((t) => {
      bubbleTick(bub, 63.2, 8.3, 47.2, 9);
      sp.pose = t % 10 < 4 ? 'hero' : null;
      sp.hop = Math.sin(t * 1.3) * 0.04;
    });
  }
  // 大熊：百工坊街右手邊自己的「大熊匠鋪」工棚裡，扛著木槌敲敲打打（面向街道）
  {
    const wb = REGION_CONFIGS['region-discussion'].buildings.find((x) => x.id === 'discussion-workshop');
    const [bwx, bwz] = wb ? localToWorldXZ(wb.position.x, wb.position.z, wb.facingYaw, BEAR_LOCAL.x, BEAR_LOCAL.z) : [92.3, -36.4];
    const sp = spriteOf('bear', 'char-bear');
    sp.group.position.set(bwx, 0.1, bwz);
    sp.facing = -Math.PI / 2;
    colliders.push({ id: 'char-bear', type: 'cylinder', x: bwx, z: bwz, radius: 0.7 });
    pick('bear', 1.6, 2.2, bwx, bwz);
    const bub = speechBubble(CHARACTERS.bear.name, CHARACTERS.bear.line);
    root.add(bub);
    anims.push((t) => {
      bubbleTick(bub, bwx, 2.45, bwz);
      const k = t % 5;
      sp.pose = k < 2.2 ? 'hammer' : null;
      // 敲槌：一下一下壓低再彈起
      sp.squash = sp.pose ? Math.max(0, Math.sin(t * 6)) * 0.05 : 0;
      sp.hop = sp.pose ? 0 : Math.abs(Math.sin(t * 1.2)) * 0.02;
    });
  }
  // 小燈泡：主島中央廣場繞著大燈泡散步，偶爾跳起來揮手、偶爾跌一跤再爬起來
  {
    const sp = spriteOf('xiaodengpao', 'char-bulb');
    const g = sp.group;
    const proxy = makePickProxy(1.0, 1.6, 1.0, 0, 0, 0, { kind: 'character', id: 'xiaodengpao' });
    root.add(proxy);
    const bub = speechBubble(CHARACTERS.xiaodengpao.name, CHARACTERS.xiaodengpao.line);
    root.add(bub);
    const R = 7.6;
    const CYCLE = 34;
    let ang = 0.6;
    let lastT = 0;
    anims.push((t) => {
      const dt = lastT ? Math.min(0.1, t - lastT) : 0;
      lastT = t;
      const c = t % CYCLE;
      let walking = true;
      sp.pose = null;
      if (c >= 14 && c < 17.5) {
        sp.pose = 'jump';
        walking = false;
      } else if (c >= 27 && c < 30) {
        sp.pose = 'fall';
        walking = false;
      } else if (c >= 30 && c < 31.5) walking = false;
      if (walking) ang += (dt * 0.9) / R;
      const x = Math.cos(ang) * R;
      const z = Math.sin(ang) * R;
      g.position.set(x, 0, z);
      sp.facing = Math.atan2(-Math.sin(ang), Math.cos(ang));
      sp.hop = sp.pose === 'jump' ? Math.abs(Math.sin(t * 6)) * 0.5 : walking ? Math.abs(Math.sin(t * 7)) * 0.07 : 0;
      sp.tilt = walking ? Math.sin(t * 7) * 0.06 : 0;
      sp.squash = 0;
      proxy.position.set(x, 0.8, z);
      bubbleTick(bub, x, 2.2, z);
    });
  }

  // 看板人每幀面向鏡頭、換視角圖（放在各角色動畫之後，位置才是最新的）
  anims.push(() => {
    AgentSprite.cam.x = faunaEnv.camX;
    AgentSprite.cam.z = faunaEnv.camZ;
    AgentSprite.cam.tod = faunaEnv.tod;
    for (const sp of sprites) sp.update(faunaEnv.camX, faunaEnv.camZ, faunaEnv.tod);
  });

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
