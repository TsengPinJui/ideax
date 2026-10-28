import * as THREE from 'three';
import type { Collider } from '../types';
import type { Question } from '../../../types';
import { getStyleMaterials, mergeByMaterial } from './architecture';
import { makePickProxy } from '../picking';
import { isGameQuestion } from '../../../utils/gameClassification';

/**
 * 討論島藏書閣前的「論道廣場」：
 * - 中央一座青銅三足鼎（香煙裊裊）
 * - 藏書閣門前兩旁兩座「議題碑」：左「熱門議題」、右「最新議題」，刻著站上真實的討論標題；點石碑看完整列表
 * - 廣場兩側四組石桌石凳（論道石桌），讓人坐下來聊
 * - 廣場東西兩面白牆各立一座大型佈告欄：西牆「茶藝街・熱門茶話」、東牆「百工坊・熱門議題」，輪播兩類熱門討論
 */

export const PLAZA = { x: 72, z: -48 };
export const STELES: { which: 'hot' | 'new'; x: number; z: number }[] = [
  { which: 'hot', x: 67.4, z: -56.6 },
  { which: 'new', x: 76.6, z: -56.6 },
];
const TABLES: [number, number][] = [
  [67.0, -50.4],
  [77.0, -50.4],
  [67.0, -40.8],
  [77.0, -40.8],
];

/** 廣場兩側白牆上的大型佈告欄（貼在茶藝街、百工坊中間那間店鋪的背牆上，面向廣場） */
export type WallBoardWhich = 'tea' | 'craft';
export const WALL_BOARDS: { which: WallBoardWhich; x: number; z: number; yaw: number; propId: string }[] = [
  { which: 'tea', x: 64.2, z: -43.5, yaw: Math.PI / 2, propId: 'region-discussion-tea-board-0' },
  { which: 'craft', x: 79.8, z: -43.5, yaw: -Math.PI / 2, propId: 'region-discussion-craft-board-5' },
];
const WALL_BOARD_TEXT: Record<WallBoardWhich, { title: string; sub: string }> = {
  tea: { title: '茶藝街・熱門茶話', sub: '日常・生活・職場・靈感' },
  craft: { title: '百工坊・熱門議題', sub: '水電・裝修・法律・財稅・企管' },
};

export interface WallBoardItem {
  title: string;
  author?: string;
  tag?: string;
  views: number;
  likes: number;
  replies: number;
}

/** 大型佈告欄：上方大字輪播目前這則熱門討論，下方列出接下來的幾則 */
export function drawWallBoardTexture(which: WallBoardWhich, items: WallBoardItem[], idx: number) {
  const W = 1024;
  const H = 680;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  // 宣紙底
  g.fillStyle = '#efe2c2';
  g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(120,90,50,0.07)';
  for (let i = 0; i < 90; i++) g.fillRect((i * 113) % W, (i * 71) % H, 90 + (i % 5) * 30, 2);
  g.strokeStyle = '#6b3d1c';
  g.lineWidth = 12;
  g.strokeRect(6, 6, W - 12, H - 12);
  // 朱紅標題列
  const hd = g.createLinearGradient(0, 0, W, 0);
  hd.addColorStop(0, '#8e2018');
  hd.addColorStop(0.5, '#b2291f');
  hd.addColorStop(1, '#8e2018');
  g.fillStyle = hd;
  g.fillRect(18, 18, W - 36, 96);
  g.strokeStyle = '#e8c36a';
  g.lineWidth = 3;
  g.strokeRect(24, 24, W - 48, 84);
  const T = WALL_BOARD_TEXT[which];
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  g.fillStyle = '#fff3d0';
  g.font = `900 54px ${KAI}`;
  g.fillText(T.title, 46, 68);
  const n = Math.min(items.length, 6);
  const cur = n ? idx % n : 0;
  g.textAlign = 'right';
  g.font = `700 26px ${KAI}`;
  g.fillStyle = '#ffe2a0';
  g.fillText(n ? `${Array.from({ length: n }, (_, i) => (i === cur ? '●' : '○')).join(' ')}  ${cur + 1}/${n}` : T.sub, W - 46, 68);

  if (!n) {
    g.textAlign = 'center';
    g.fillStyle = '#4a2a10';
    g.font = `900 46px ${KAI}`;
    g.fillText('還沒有熱門討論', W / 2, 300);
    g.font = `700 32px ${KAI}`;
    g.fillStyle = '#6b4a2a';
    g.fillText(`${T.sub}，點佈告欄發起第一則`, W / 2, 370, W - 120);
  } else {
    const it = items[cur];
    // 名次章
    g.fillStyle = '#b3261e';
    g.beginPath();
    g.arc(96, 196, 46, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#f2cf7a';
    g.lineWidth = 3;
    g.stroke();
    g.textAlign = 'center';
    g.fillStyle = '#fff3d0';
    g.font = `900 30px ${KAI}`;
    g.fillText(`第${'一二三四五六'[cur]}`, 96, 182);
    g.fillText('熱議', 96, 214);
    // 標題（最多三行）
    g.textAlign = 'left';
    g.fillStyle = '#2b1a0c';
    g.font = `900 52px ${KAI}`;
    const lines: string[] = [];
    let line = '';
    for (const ch of (it.title || '').trim()) {
      if (g.measureText(line + ch).width > W - 220) {
        lines.push(line);
        line = ch;
        if (lines.length === 3) break;
      } else line += ch;
    }
    if (lines.length < 3 && line) lines.push(line);
    else if (lines.length === 3) lines[2] = `${lines[2].slice(0, -1)}…`;
    lines.forEach((ln, i) => g.fillText(ln, 170, 172 + i * 64));
    // 資訊列
    const my = 172 + Math.max(1, lines.length) * 64 + 14;
    let x = 170;
    if (it.tag) {
      g.font = `800 26px ${KAI}`;
      const tw = g.measureText(it.tag).width + 28;
      g.fillStyle = 'rgba(179,38,30,0.12)';
      g.fillRect(x, my - 20, tw, 40);
      g.strokeStyle = '#b3261e';
      g.lineWidth = 2;
      g.strokeRect(x, my - 20, tw, 40);
      g.fillStyle = '#8e2420';
      g.fillText(it.tag, x + 14, my + 1);
      x += tw + 18;
    }
    g.font = `700 28px ${KAI}`;
    g.fillStyle = '#6b4a2a';
    const meta = [it.author ? `發起：${it.author.slice(0, 10)}` : '', `👁 ${it.views}`, `❤ ${it.likes}`, `💬 ${it.replies}`].filter(Boolean).join('　');
    g.fillText(meta, x, my + 1, W - x - 40);
    // 接下來輪播
    g.fillStyle = 'rgba(107,61,28,0.4)';
    g.fillRect(40, 470, W - 80, 2);
    g.fillStyle = '#8e2420';
    g.font = `900 28px ${KAI}`;
    g.fillText('接著看', 46, 506);
    for (let k = 1; k <= Math.min(3, n - 1); k++) {
      const j = (cur + k) % n;
      const y = 506 + (k - 1) * 46;
      g.fillStyle = '#b3261e';
      g.font = `900 26px ${KAI}`;
      g.fillText(`${'一二三四五六'[j]}`, 170, y);
      g.fillStyle = '#3e2a14';
      g.font = `700 28px ${KAI}`;
      g.fillText((items[j].title || '').trim(), 210, y, W - 260);
    }
  }
  g.textAlign = 'right';
  g.fillStyle = 'rgba(107,61,28,0.75)';
  g.font = `700 24px ${KAI}`;
  g.fillText('點佈告欄看全部 ›', W - 40, H - 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const KAI = '"DFKai-SB","BiauKai","Kaiti TC","STKaiti","KaiTi","LXGW WenKai TC","CWTeXKai","Noto Serif TC",serif';

const visible = (q: Question) => q.status !== 'delisted' && !(q as any).isDelisted && !(q as any).isSimulated && !(q as any).simulatedBatchId;
const isDisc = (q: Question) => q.postType === 'chat_discussion' || (!q.postType && !isGameQuestion(q));

function hotScore(q: Question): number {
  const a = q as any;
  const views = a.viewsCount ?? a.views ?? 0;
  const likes = a.likesCount ?? a.likes ?? 0;
  const discs = a.discussionsCount ?? (Array.isArray(a.discussions) ? a.discussions.length : 0);
  const sols = a.solutionsCount ?? (Array.isArray(a.solutions) ? a.solutions.length : 0);
  return views + likes * 5 + discs * 8 + sols * 10;
}

/** 議題碑上的討論（真實資料；沒有就空著） */
export function plazaTopics(questions: Question[], which: 'hot' | 'new'): Question[] {
  const pool = questions.filter((q) => visible(q) && isDisc(q));
  return which === 'hot'
    ? pool.sort((a, b) => hotScore(b) - hotScore(a) || (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0))
    : pool.sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
}

/** 青石碑面：金字刻標題，下方列出前 7 則議題 */
export function drawSteleTexture(which: 'hot' | 'new', list: Question[]) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 768;
  const g = c.getContext('2d')!;
  const grd = g.createLinearGradient(0, 0, 0, 768);
  grd.addColorStop(0, '#4b5450');
  grd.addColorStop(1, '#3a423f');
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 768);
  // 石紋
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(${200 + (i % 40)},${200 + (i % 30)},${190},${0.03 + (i % 5) * 0.01})`;
    g.fillRect((i * 131) % 512, (i * 67) % 768, 2 + (i % 4), 1 + (i % 3));
  }
  g.strokeStyle = 'rgba(214,180,106,0.75)';
  g.lineWidth = 5;
  g.strokeRect(18, 18, 476, 732);
  g.lineWidth = 2;
  g.strokeRect(30, 30, 452, 708);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#e8c36a';
  g.font = `900 64px ${KAI}`;
  g.fillText(which === 'hot' ? '熱門議題' : '最新議題', 256, 92);
  g.font = `700 24px ${KAI}`;
  g.fillStyle = 'rgba(232,195,106,0.85)';
  g.fillText(which === 'hot' ? '討論島・大家最常討論的' : '討論島・剛剛發起的討論', 256, 146);
  g.fillStyle = 'rgba(232,195,106,0.5)';
  g.fillRect(70, 172, 372, 2);
  g.textAlign = 'left';
  const items = list.slice(0, 7);
  if (!items.length) {
    g.textAlign = 'center';
    g.fillStyle = '#e9e3d2';
    g.font = `700 32px ${KAI}`;
    g.fillText('還沒有討論', 256, 360);
    g.font = `700 26px ${KAI}`;
    g.fillText('點石碑發起第一則', 256, 410);
  }
  items.forEach((q, i) => {
    const y = 214 + i * 74;
    g.fillStyle = '#e8c36a';
    g.font = `900 30px ${KAI}`;
    g.fillText(`${'一二三四五六七'[i]}`, 54, y);
    g.fillStyle = '#f1ece0';
    g.font = `700 30px ${KAI}`;
    const t = (q.title || '').trim();
    // 一行放不下就斷兩行
    const max = 12;
    if (t.length > max) {
      g.font = `700 25px ${KAI}`;
      g.fillText(t.slice(0, 15), 100, y - 15, 380);
      g.fillText(t.length > 30 ? `${t.slice(15, 29)}…` : t.slice(15), 100, y + 17, 380);
    } else g.fillText(t, 100, y, 380);
  });
  g.textAlign = 'center';
  g.fillStyle = 'rgba(232,195,106,0.8)';
  g.font = `700 22px ${KAI}`;
  g.fillText('點石碑看全部', 256, 728);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createDiscussionPlaza(): { group: THREE.Group; colliders: Collider[] } {
  const sm = getStyleMaterials();
  const root = new THREE.Group();
  root.name = 'discussion_plaza';
  const stat = new THREE.Group();
  root.add(stat);
  const colliders: Collider[] = [];
  const stone = new THREE.MeshStandardMaterial({ color: 0x8e918a, roughness: 0.92 });
  const darkStone = new THREE.MeshStandardMaterial({ color: 0x5d625e, roughness: 0.85 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0x7a6436, roughness: 0.45, metalness: 0.7 });
  const patina = new THREE.MeshStandardMaterial({ color: 0x4f7a68, roughness: 0.6, metalness: 0.35 });
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = stat) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  // ── 中央青銅三足鼎 ──
  {
    const { x, z } = PLAZA;
    add(new THREE.CylinderGeometry(2.3, 2.5, 0.36, 8), stone, x, 0.18, z);
    add(new THREE.CylinderGeometry(1.8, 2.0, 0.3, 8), darkStone, x, 0.5, z);
    // 鼎身（車床曲線：微鼓的腹、外翻的口沿）
    const prof = [
      [0.01, 0],
      [0.75, 0.05],
      [1.05, 0.35],
      [1.12, 0.75],
      [1.02, 1.1],
      [1.18, 1.22],
      [1.2, 1.3],
      [1.06, 1.3],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const body = add(new THREE.LatheGeometry(prof, 24), bronze, x, 1.35, z);
    body.geometry.computeVertexNormals();
    // 腹部饕餮紋帶（綠鏽）
    add(new THREE.TorusGeometry(1.1, 0.06, 6, 28).rotateX(Math.PI / 2), patina, x, 1.35 + 0.72, z);
    add(new THREE.TorusGeometry(1.07, 0.05, 6, 28).rotateX(Math.PI / 2), patina, x, 1.35 + 0.42, z);
    // 三足
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
      const leg = add(new THREE.CylinderGeometry(0.16, 0.12, 0.75, 10), bronze, x + Math.cos(a) * 0.62, 1.0, z + Math.sin(a) * 0.62);
      leg.rotation.z = Math.cos(a) * 0.12;
      leg.rotation.x = -Math.sin(a) * 0.12;
    }
    // 雙耳
    for (const s of [-1, 1]) {
      const ear = add(new THREE.TorusGeometry(0.28, 0.07, 8, 16, Math.PI), bronze, x + s * 0.9, 2.65, z);
      ear.rotation.y = Math.PI / 2;
    }
    colliders.push({ id: 'disc-plaza-ding', type: 'cylinder', x, z, radius: 2.5 });
  }

  // ── 議題碑（藏書閣門前兩旁） ──
  for (const st of STELES) {
    const { x, z } = st;
    add(new THREE.BoxGeometry(3.0, 0.55, 1.1), stone, x, 0.28, z);
    add(new THREE.BoxGeometry(2.6, 0.2, 0.9), darkStone, x, 0.65, z);
    add(new THREE.BoxGeometry(2.3, 3.4, 0.42), darkStone, x, 0.75 + 1.7, z);
    // 碑額（半圓頂）
    add(new THREE.CylinderGeometry(1.15, 1.15, 0.42, 24).rotateX(Math.PI / 2), darkStone, x, 4.15, z);
    const tex = drawSteleTexture(st.which, []);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 3.0),
      new THREE.MeshStandardMaterial({ map: tex, emissive: new THREE.Color(0xffffff), emissiveMap: tex, emissiveIntensity: 0.12, roughness: 0.75 })
    );
    face.position.set(x, 0.75 + 1.72, z + 0.215);
    face.userData.noMerge = true;
    face.userData.plazaStele = st.which;
    face.userData.pick = { kind: 'discStele', which: st.which };
    root.add(face);
    root.add(makePickProxy(2.6, 4.4, 1.2, x, z, 0, { kind: 'discStele', which: st.which }));
    colliders.push({ id: `disc-plaza-stele-${st.which}`, type: 'box', x, z, halfWidth: 1.5, halfDepth: 0.6 });
  }

  // ── 兩側白牆大型佈告欄（輪播兩類熱門討論） ──
  for (const wb of WALL_BOARDS) {
    const bw = 4.5;
    const bh = bw * (680 / 1024);
    const cy = 3.05;
    const grp = new THREE.Group();
    grp.position.set(wb.x, 0, wb.z);
    grp.rotation.y = wb.yaw;
    root.add(grp);
    // 木框、上方小瓦簷、下方托木
    add(new THREE.BoxGeometry(bw + 0.34, bh + 0.34, 0.14), sm.darkWood, 0, cy, 0.07, grp);
    add(new THREE.BoxGeometry(bw + 0.5, 0.12, 0.36), sm.gold, 0, cy + bh / 2 + 0.2, 0.2, grp);
    const eave = add(new THREE.BoxGeometry(bw + 1.0, 0.12, 0.9), sm.roofs.slate, 0, cy + bh / 2 + 0.42, 0.42, grp);
    eave.rotation.x = 0.3;
    add(new THREE.BoxGeometry(bw + 1.0, 0.14, 0.14), sm.ridges.slate, 0, cy + bh / 2 + 0.55, 0.06, grp);
    add(new THREE.BoxGeometry(bw + 0.2, 0.1, 0.3), sm.darkWood, 0, cy - bh / 2 - 0.2, 0.15, grp);
    for (const s of [-1, 1]) {
      add(new THREE.BoxGeometry(0.14, 0.4, 0.3), sm.darkWood, s * (bw / 2 - 0.3), cy - bh / 2 - 0.42, 0.15, grp);
      // 兩側紅燈籠
      const lan = add(new THREE.SphereGeometry(0.3, 14, 10), sm.lanternBody, s * (bw / 2 + 0.55), cy + bh / 2 - 0.35, 0.45, grp);
      lan.scale.y = 1.22;
      add(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 4), sm.darkWood, s * (bw / 2 + 0.55), cy + bh / 2 + 0.05, 0.45, grp);
    }
    const tex = drawWallBoardTexture(wb.which, [], 0);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(bw, bh),
      new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.32, roughness: 0.7 })
    );
    face.position.set(0, cy, 0.15);
    face.userData.noMerge = true;
    face.userData.plazaWallBoard = wb.which;
    face.userData.pick = { kind: 'street', id: wb.propId };
    grp.add(face);
    root.add(makePickProxy(bw + 0.4, bh + 0.9, 0.7, wb.x + Math.sin(wb.yaw) * 0.3, wb.z, wb.yaw, { kind: 'street', id: wb.propId }, cy - bh / 2 - 0.4));
  }

  // ── 論道石桌：圓桌＋四個鼓凳 ──
  for (const [x, z] of TABLES) {
    add(new THREE.CylinderGeometry(0.25, 0.36, 0.72, 10), stone, x, 0.36, z);
    add(new THREE.CylinderGeometry(0.85, 0.82, 0.12, 20), stone, x, 0.78, z);
    // 桌面刻棋盤（淡淡的線）
    add(new THREE.CylinderGeometry(0.6, 0.6, 0.01, 20), darkStone, x, 0.845, z);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      add(new THREE.CylinderGeometry(0.26, 0.3, 0.46, 12), sm.darkWood, x + Math.cos(a) * 1.25, 0.23, z + Math.sin(a) * 1.25);
    }
    colliders.push({ id: `disc-plaza-table-${x}`, type: 'cylinder', x, z, radius: 1.6 });
  }
  mergeByMaterial(stat);

  // ── 香煙（鼎口飄出的幾縷白煙） ──
  const smokeMat = new THREE.SpriteMaterial({ color: 0xf2efe8, transparent: true, opacity: 0.0, depthWrite: false });
  const puffs: THREE.Sprite[] = [];
  for (let i = 0; i < 6; i++) {
    const sp = new THREE.Sprite(smokeMat.clone());
    sp.userData.ph = i / 6;
    root.add(sp);
    puffs.push(sp);
  }
  const softTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,0.9)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  puffs.forEach((p) => ((p.material as THREE.SpriteMaterial).map = softTex));
  root.userData.tick = (t: number) => {
    for (const p of puffs) {
      const age = (t * 0.12 + (p.userData.ph as number)) % 1;
      p.position.set(PLAZA.x + Math.sin(age * 7 + t * 0.3) * 0.25 + age * 0.6, 2.7 + age * 3.2, PLAZA.z + Math.cos(age * 5) * 0.2);
      const s = 0.4 + age * 1.6;
      p.scale.set(s, s, 1);
      (p.material as THREE.SpriteMaterial).opacity = 0.35 * Math.min(1, age * 5) * (1 - age);
    }
  };
  return { group: root, colliders };
}
