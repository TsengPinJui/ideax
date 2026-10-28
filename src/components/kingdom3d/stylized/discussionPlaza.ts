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
 */

export const PLAZA = { x: 72, z: -48 };
export const STELES: { which: 'hot' | 'new'; x: number; z: number }[] = [
  { which: 'hot', x: 67.4, z: -56.6 },
  { which: 'new', x: 76.6, z: -56.6 },
];
const TABLES: [number, number][] = [
  [65.9, -50.2],
  [78.1, -50.2],
  [66.4, -41.8],
  [77.6, -41.8],
];

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
