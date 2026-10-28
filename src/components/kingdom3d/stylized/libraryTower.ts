import * as THREE from 'three';
import type { BuildingInteractable, Collider } from '../types';
import { localToWorldXZ } from '../regionConfigs';
import { getStyleMaterials, LanternBatch } from './architecture';

/**
 * 藏書閣外觀（照參考圖）：白色大理石的圓形多層樓閣
 * - 每層一圈拱廊（白柱＋半圓拱），拱廊後面是發亮的書架
 * - 層層有外挑的陽台與黑鐵欄杆
 * - 頂上飛簷大屋頂＋玻璃穹頂＋金色寶頂
 * - 正面大紅長幡「藏書閣 IdeaX」，兩側「雅俗共賞」「親子同樂」
 * - 大門前白石台階、石燈籠、盆景
 * 走進大門就傳送到內部的「藏書閣・書海」（libraryInterior）
 */
export const LIB_TOWER = { R0: 5.6, tierH: 4.0, tiers: 3, doorHalf: 1.8, base: 0.45 };

const KAI = '"DFKai-SB","BiauKai","Kaiti TC","STKaiti","KaiTi","LXGW WenKai TC","CWTeXKai","Noto Serif TC",serif';

function bannerTex(lines: string[], sub?: string) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 1024;
  const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 0, 1024);
  gr.addColorStop(0, '#9a1f18');
  gr.addColorStop(1, '#7a1410');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 1024);
  g.strokeStyle = '#e8c36a';
  g.lineWidth = 8;
  g.strokeRect(14, 14, 228, 996);
  g.lineWidth = 2;
  g.strokeRect(26, 26, 204, 972);
  g.fillStyle = '#f6d98a';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const n = lines.length;
  const step = Math.min(200, (sub ? 760 : 880) / n);
  g.font = `900 ${Math.min(170, step * 0.9)}px ${KAI}`;
  lines.forEach((ch, i) => g.fillText(ch, 128, 120 + step * i + step / 2 - 40));
  if (sub) {
    g.font = `800 52px Georgia, serif`;
    g.fillText(sub, 128, 120 + step * n + 10);
    // 小書本圖示
    g.strokeStyle = '#f6d98a';
    g.lineWidth = 5;
    g.strokeRect(92, 940, 34, 24);
    g.strokeRect(130, 940, 34, 24);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function glowShelfTex() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#3a2410';
  g.fillRect(0, 0, 512, 512);
  const cols = ['#c9a25a', '#e8d2a0', '#8a3a24', '#5a3a1e', '#f0e2c0', '#a87a3a'];
  for (let r = 0; r < 4; r++) {
    const y0 = r * 128;
    const gr = g.createLinearGradient(0, y0, 0, y0 + 128);
    gr.addColorStop(0, '#ffcf7a');
    gr.addColorStop(1, '#6a4018');
    g.fillStyle = gr;
    g.fillRect(0, y0, 512, 128);
    let x = 2;
    let k = r * 7;
    while (x < 510) {
      const w = 8 + ((k * 37) % 11);
      const h = 70 + ((k * 53) % 40);
      g.fillStyle = cols[k % cols.length];
      g.fillRect(x, y0 + 120 - h, w, h);
      x += w + 1;
      k++;
    }
    g.fillStyle = '#f3e6cc';
    g.fillRect(0, y0 + 120, 512, 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function createLibraryTower(b: BuildingInteractable): THREE.Group {
  const sm = getStyleMaterials();
  const root = new THREE.Group();
  root.name = `libtower_${b.id}`;
  root.position.set(b.position.x, 0, b.position.z);
  root.rotation.y = b.facingYaw;
  const colliders: Collider[] = [];
  const W = (lx: number, lz: number) => localToWorldXZ(b.position.x, b.position.z, b.facingYaw, lx, lz);
  const lan = new LanternBatch();
  const marble = new THREE.MeshStandardMaterial({ color: 0xf2ede3, roughness: 0.45, emissive: 0x2a2620, emissiveIntensity: 0.25 });
  const marbleDark = new THREE.MeshStandardMaterial({ color: 0xd9d1c2, roughness: 0.5 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.45, metalness: 0.6 });
  const gold = sm.gold;
  const tile = sm.roofs.slate;
  const shelfT = glowShelfTex();
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, ry = 0, parent: THREE.Object3D = root) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const { R0, tierH, tiers, doorHalf, base } = LIB_TOWER;

  // ── 白石台基與正面台階 ──
  add(new THREE.CylinderGeometry(R0 + 1.4, R0 + 1.6, base, 48), marbleDark, 0, base / 2, 0);
  for (let k = 0; k < 3; k++) add(new THREE.BoxGeometry(5.0, 0.15 * (3 - k), 0.5), marble, 0, (0.15 * (3 - k)) / 2, R0 + 1.25 + k * 0.45);
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.35, 0.6, 1.6), marble, s * 2.65, 0.3, R0 + 1.6);

  // ── 各層：發亮的書架芯＋一圈拱廊＋外挑陽台 ──
  let y = base;
  for (let k = 0; k < tiers; k++) {
    const r = R0 - k * 0.38;
    const h = tierH - (k === 0 ? -0.5 : 0);
    // 書架芯（從拱廊看進去是滿滿發亮的書）
    const st = shelfT.clone();
    st.needsUpdate = true;
    st.repeat.set(Math.round((Math.PI * 2 * (r - 1.3)) / 3), 1);
    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(r - 1.3, r - 1.3, h, 40, 1, true),
      new THREE.MeshStandardMaterial({ map: st, emissive: 0xffffff, emissiveMap: st, emissiveIntensity: 0.9, roughness: 0.8 })
    );
    core.position.y = y + h / 2;
    core.userData.noMerge = true;
    root.add(core);
    // 樓板
    add(new THREE.CylinderGeometry(r - 1.25, r - 1.25, 0.12, 40), new THREE.MeshStandardMaterial({ color: 0x5a3a1e, emissive: 0x3a2410, emissiveIntensity: 0.6 }), 0, y + 0.06, 0);
    // 拱廊：白柱與半圓拱
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const px = Math.sin(a) * r;
      const pz = Math.cos(a) * r;
      add(new THREE.CylinderGeometry(0.2, 0.24, h - 0.9, 12), marble, px, y + (h - 0.9) / 2, pz);
      add(new THREE.BoxGeometry(0.5, 0.18, 0.5), marble, px, y + h - 0.85, pz);
      // 柱與柱之間的拱
      const am = a + Math.PI / n;
      const chord = 2 * r * Math.sin(Math.PI / n);
      const arch = new THREE.Mesh(new THREE.TorusGeometry(chord / 2 - 0.2, 0.13, 8, 16, Math.PI), marble);
      arch.position.set(Math.sin(am) * (r * Math.cos(Math.PI / n)), y + h - 0.85, Math.cos(am) * (r * Math.cos(Math.PI / n)));
      arch.rotation.y = am;
      root.add(arch);
    }
    // 拱頂上的橫楣環
    add(new THREE.CylinderGeometry(r + 0.15, r + 0.15, 0.55, 48, 1, true), marble, 0, y + h - 0.25, 0);
    // 外挑陽台（最上層改成屋簷）
    if (k < tiers - 1) {
      const bal = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.95, r + 0.75, 0.3, 48), marbleDark);
      bal.position.y = y + h + 0.05;
      root.add(bal);
      const rail = new THREE.Mesh(new THREE.TorusGeometry(r + 0.85, 0.06, 6, 64).rotateX(Math.PI / 2), iron);
      rail.position.y = y + h + 1.15;
      root.add(rail);
      const nb = 64;
      const bg = new THREE.CylinderGeometry(0.03, 0.03, 0.95, 4);
      const ib = new THREE.InstancedMesh(bg, iron, nb);
      const m4 = new THREE.Matrix4();
      for (let i = 0; i < nb; i++) {
        const a = (i / nb) * Math.PI * 2;
        m4.makeTranslation(Math.sin(a) * (r + 0.85), y + h + 0.65, Math.cos(a) * (r + 0.85));
        ib.setMatrixAt(i, m4);
      }
      root.add(ib);
      // 陽台上的盆景與燈籠
      for (const a of [0.55, -0.55, Math.PI - 0.6, Math.PI + 0.6]) {
        const bx = Math.sin(a) * (r + 0.55);
        const bz = Math.cos(a) * (r + 0.55);
        add(new THREE.CylinderGeometry(0.22, 0.18, 0.3, 10), sm.pot, bx, y + h + 0.35, bz);
        add(new THREE.SphereGeometry(0.38, 8, 6).scale(1.2, 0.7, 1.2), new THREE.MeshStandardMaterial({ color: 0x3f6b35, roughness: 0.9 }), bx, y + h + 0.75, bz);
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        lan.addHanging(Math.sin(a) * (r + 0.1), y + h - 1.4, Math.cos(a) * (r + 0.1), 0.45);
      }
    }
    y += h + (k < tiers - 1 ? 0.2 : 0);
  }

  // ── 飛簷大屋頂＋玻璃穹頂＋金色寶頂 ──
  {
    const rr = R0 - (tiers - 1) * 0.38;
    const prof = [
      new THREE.Vector2(rr + 3.0, y + 0.9),
      new THREE.Vector2(rr + 2.4, y + 0.55),
      new THREE.Vector2(rr + 1.2, y + 0.9),
      new THREE.Vector2(rr - 0.2, y + 1.7),
      new THREE.Vector2(rr - 1.6, y + 2.3),
    ];
    const roof = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), tile);
    root.add(roof);
    const under = new THREE.Mesh(new THREE.LatheGeometry(prof.map((p) => new THREE.Vector2(p.x, p.y - 0.12)), 64), sm.roofUnder);
    root.add(under);
    add(new THREE.TorusGeometry(rr + 3.0, 0.1, 6, 64).rotateX(Math.PI / 2), gold, 0, y + 0.9, 0);
    // 斗拱（簷下一圈金色小方塊）
    const nbk = 32;
    const ibk = new THREE.InstancedMesh(new THREE.BoxGeometry(0.28, 0.32, 0.5), new THREE.MeshStandardMaterial({ color: 0x7a2a1e, roughness: 0.6 }), nbk);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let i = 0; i < nbk; i++) {
      const a = (i / nbk) * Math.PI * 2;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a);
      m4.compose(new THREE.Vector3(Math.sin(a) * (rr + 0.6), y + 0.35, Math.cos(a) * (rr + 0.6)), q, new THREE.Vector3(1, 1, 1));
      ibk.setMatrixAt(i, m4);
    }
    root.add(ibk);
    // 簷角翹起的八個角
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.1, 6), tile);
      horn.position.set(Math.sin(a) * (rr + 3.0), y + 1.25, Math.cos(a) * (rr + 3.0));
      horn.rotation.set(Math.cos(a) * 0.9, 0, -Math.sin(a) * 0.9);
      root.add(horn);
    }
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(rr - 1.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshPhysicalMaterial({ color: 0xbfd8ea, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.55, emissive: 0x5a7a8a, emissiveIntensity: 0.25 })
    );
    dome.position.y = y + 2.2;
    dome.userData.noMerge = true;
    root.add(dome);
    for (let i = 0; i < 12; i++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(rr - 1.48, 0.05, 4, 24, Math.PI / 2), gold);
      rib.position.y = y + 2.2;
      rib.rotation.set(0, (i / 12) * Math.PI * 2, Math.PI / 2);
      root.add(rib);
    }
    const top = y + 2.2 + rr - 1.5;
    add(new THREE.CylinderGeometry(0.35, 0.5, 0.5, 12), gold, 0, top + 0.2, 0);
    add(new THREE.SphereGeometry(0.42, 16, 12), gold, 0, top + 0.75, 0);
    add(new THREE.ConeGeometry(0.16, 1.2, 10), gold, 0, top + 1.6, 0);
  }

  // ── 正面三面長幡 ──
    {
    const t = bannerTex(['藏', '書', '閣'], 'IdeaX');
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 7.6), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.35, roughness: 0.8, side: THREE.DoubleSide }));
    m.position.set(0, base + tierH + 0.5 + 3.4, R0 + 1.2);
    m.userData.noMerge = true;
    root.add(m);
    for (const [s, txt] of [
      [-1, ['雅', '俗', '共', '賞']],
      [1, ['親', '子', '同', '樂']],
    ] as [number, string[]][]) {
      const tt = bannerTex(txt);
      const a = s * 0.78;
      const bm = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 6.2), new THREE.MeshStandardMaterial({ map: tt, emissive: 0xffffff, emissiveMap: tt, emissiveIntensity: 0.3, roughness: 0.8, side: THREE.DoubleSide }));
      bm.position.set(Math.sin(a) * (R0 + 1.2), base + tierH + 0.5 + 3.2, Math.cos(a) * (R0 + 1.2));
      bm.rotation.y = a;
      bm.userData.noMerge = true;
      root.add(bm);
    }
  }

  // ── 大門：發光的圓窗門（走進去就傳送到書海） ──
  {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.12, 10, 40), gold);
    ring.position.set(0, base + 1.75, R0 - 0.9);
    root.add(ring);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(1.3, 40), new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.85 }));
    glow.position.set(0, base + 1.75, R0 - 0.95);
    glow.userData.noMerge = true;
    root.add(glow);
  }

  // ── 門前石燈籠、盆景（放在白石台基上） ──
  for (const s of [-1, 1]) {
    const lz = Math.sqrt((R0 + 1.0) ** 2 - 3.4 ** 2);
    lan.addPost(s * 3.4, base, lz, 2.2);
    const pz = Math.sqrt((R0 + 0.75) ** 2 - 2.25 ** 2);
    add(new THREE.CylinderGeometry(0.4, 0.3, 0.5, 12), sm.pot, s * 2.25, base + 0.25, pz);
    add(new THREE.SphereGeometry(0.62, 8, 6).scale(1.3, 0.75, 1.3), new THREE.MeshStandardMaterial({ color: 0x3a6b32, roughness: 0.9 }), s * 2.25, base + 0.9, pz);
  }

  // ── 碰撞：一圈外牆，大門留口 ──
  {
    const N = 40;
    const rc = R0 + 1.45;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2;
      const a1 = ((i + 1) / N) * Math.PI * 2;
      const mid = (a0 + a1) / 2;
      if (Math.abs(Math.sin(mid) * rc) < doorHalf && Math.cos(mid) > 0) continue;
      const [x1, z1] = W(Math.sin(a0) * rc, Math.cos(a0) * rc);
      const [x2, z2] = W(Math.sin(a1) * rc, Math.cos(a1) * rc);
      colliders.push({ id: `${b.id}-ring-${i}`, type: 'segment', x1, z1, x2, z2, halfThickness: 0.3 });
    }
  }
  root.add(lan.build());
  root.userData.colliders = colliders;
  return root;
}

/** 是否站在藏書閣大門口（走到這裡就進書海） */
export function atLibraryDoor(b: BuildingInteractable, x: number, z: number) {
  const rx = x - b.position.x;
  const rz = z - b.position.z;
  const c = Math.cos(b.facingYaw);
  const s = Math.sin(b.facingYaw);
  const lx = rx * c - rz * s;
  const lz = rx * s + rz * c;
  return Math.abs(lx) < LIB_TOWER.doorHalf && lz < LIB_TOWER.R0 + 1.5 && lz > LIB_TOWER.R0 - 2.5;
}
