import * as THREE from 'three';
import type { Collider, BuildingInteractable } from '../types';
import { localToWorldXZ } from '../regionConfigs';
import { getStyleMaterials, mergeByMaterial, LanternBatch } from './architecture';

/**
 * 百工坊街（討論島東區）改建：
 * - 東側（右手邊）：大熊的「大熊匠鋪」，兩座平頂工棚，中間留一條路穿過去通到岸邊；
 *   棚下有木架、工具牆、木料、鐵砧、砂輪、工作台、工具箱
 * - 西側（左手邊）：一道白牆（另一面就是論道廣場東牆），百工佈告欄沿牆排開，牆上開一座月洞門通廣場
 */

const KAI = '"DFKai-SB","BiauKai","Kaiti TC","STKaiti","KaiTi","LXGW WenKai TC","CWTeXKai","Noto Serif TC",serif';

/** 西側白牆：牆的西面（朝廣場）在 x0、東面（朝百工坊街）在 x1 */
export const CRAFT_WALL = { x0: 80.0, x1: 80.6, z0: -55.6, z1: -32.0, h: 4.6, gateZ: -46.6, gateR: 1.45 };

/** 大熊匠鋪裡大熊站的位置（本地座標：x 沿街、z 朝街為正） */
export const BEAR_LOCAL = { x: 7.2, z: 1.3 };
/** 匠鋪中間的通道半寬 */
const LANE = 2.6;

function signTexture(main: string, sub: string) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#3b2412';
  g.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 26; i++) {
    g.fillStyle = `rgba(0,0,0,${0.05 + (i % 4) * 0.03})`;
    g.fillRect(0, (i * 37) % 256, 1024, 3);
  }
  g.strokeStyle = '#d9a63a';
  g.lineWidth = 10;
  g.strokeRect(12, 12, 1000, 232);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#f2cf7a';
  g.font = `900 132px ${KAI}`;
  g.fillText(main, 512, 112);
  g.font = `700 38px ${KAI}`;
  g.fillStyle = '#e8c890';
  g.fillText(sub, 512, 210);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** 工具牆：洞洞板上掛的鋸子、槌子、扳手、鉗子＋釘著的燈泡藍圖 */
function toolWallTexture(seed: number) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 384;
  const g = c.getContext('2d')!;
  g.fillStyle = '#a9824f';
  g.fillRect(0, 0, 1024, 384);
  g.fillStyle = 'rgba(60,40,20,0.35)';
  for (let x = 16; x < 1024; x += 32) for (let y = 16; y < 384; y += 32) g.fillRect(x, y, 5, 5);
  const tool = (x: number, kind: number) => {
    g.save();
    g.translate(x, 64);
    g.lineCap = 'round';
    if (kind === 0) {
      // 槌子
      g.fillStyle = '#4a2f18';
      g.fillRect(-7, 0, 14, 170);
      g.fillStyle = '#5c5f66';
      g.fillRect(-38, -12, 76, 38);
    } else if (kind === 1) {
      // 扳手
      g.strokeStyle = '#7d828a';
      g.lineWidth = 16;
      g.beginPath();
      g.moveTo(0, 20);
      g.lineTo(0, 180);
      g.stroke();
      g.lineWidth = 12;
      g.beginPath();
      g.arc(0, 10, 22, Math.PI * 0.2, Math.PI * 1.8);
      g.stroke();
    } else if (kind === 2) {
      // 鋸子
      g.fillStyle = '#8f949c';
      g.beginPath();
      g.moveTo(-12, 0);
      g.lineTo(70, 0);
      g.lineTo(70, 34);
      g.lineTo(-12, 150);
      g.closePath();
      g.fill();
      g.fillStyle = '#b5651d';
      g.fillRect(-30, 140, 34, 52);
    } else {
      // 螺絲起子
      g.fillStyle = '#c62828';
      g.fillRect(-10, 0, 20, 90);
      g.fillStyle = '#6b7280';
      g.fillRect(-4, 90, 8, 80);
    }
    g.restore();
  };
  const xs = [70, 150, 235, 315, 700, 780, 865, 950];
  xs.forEach((x, i) => tool(x, (i + seed) % 4));
  // 藍圖（燈泡）
  g.fillStyle = '#2a5b8c';
  g.fillRect(398, 36, 236, 310);
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.lineWidth = 4;
  g.beginPath();
  g.arc(516, 150, 56, Math.PI * 0.8, Math.PI * 2.2);
  g.lineTo(542, 232);
  g.lineTo(490, 232);
  g.closePath();
  g.stroke();
  for (let k = 0; k < 3; k++) {
    g.beginPath();
    g.moveTo(494, 250 + k * 18);
    g.lineTo(538, 250 + k * 18);
    g.stroke();
  }
  g.lineWidth = 1.5;
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  for (let x = 410; x < 634; x += 22) {
    g.beginPath();
    g.moveTo(x, 40);
    g.lineTo(x, 342);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 大熊匠鋪：兩座平頂工棚，中間留路（b.facingYaw 讓本地 +Z 朝向街道） */
export function createBearWorkshop(b: BuildingInteractable): THREE.Group {
  const sm = getStyleMaterials();
  const root = new THREE.Group();
  root.name = `bearshop_${b.id}`;
  root.position.set(b.position.x, 0, b.position.z);
  root.rotation.y = b.facingYaw;
  const stat = new THREE.Group();
  root.add(stat);
  const colliders: Collider[] = [];
  const W = (lx: number, lz: number) => localToWorldXZ(b.position.x, b.position.z, b.facingYaw, lx, lz);
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, ry = 0, parent: THREE.Object3D = stat) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const boxCol = (id: string, lx: number, lz: number, hw: number, hd: number) => {
    // 本地軸對齊的盒子 → 世界：facingYaw 為 ±90° 時寬深對調
    const [x, z] = W(lx, lz);
    const swap = Math.abs(Math.sin(b.facingYaw)) > 0.7;
    colliders.push({ id: `${b.id}-${id}`, type: 'box', x, z, halfWidth: swap ? hd : hw, halfDepth: swap ? hw : hd });
  };
  const postCol = (id: string, lx: number, lz: number, r = 0.22) => {
    const [x, z] = W(lx, lz);
    colliders.push({ id: `${b.id}-${id}`, type: 'cylinder', x, z, radius: r });
  };

  const half = b.width / 2; // 沿街方向
  const D = b.depth / 2; // 進深方向（+D 朝街）
  const H = 4.1;
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5030, roughness: 0.85 });
  const plank = new THREE.MeshStandardMaterial({ color: 0x8e6239, roughness: 0.9 });
  const raw = new THREE.MeshStandardMaterial({ color: 0xc29a62, roughness: 0.9 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x3b3d42, roughness: 0.45, metalness: 0.75 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.35, metalness: 0.8 });
  const red = new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.5 });
  const canvas = new THREE.MeshStandardMaterial({ color: 0xd9c9a3, roughness: 0.95, side: THREE.DoubleSide });
  const earthFloor = new THREE.MeshStandardMaterial({ color: 0x8a7a66, roughness: 0.95 });
  const lan = new LanternBatch();

  // 地坪：兩座工棚下是夯土地，中間通道鋪青石板
  add(new THREE.BoxGeometry(b.width, 0.1, b.depth), earthFloor, 0, 0.05, 0);
  add(new THREE.BoxGeometry(LANE * 2, 0.12, b.depth + 4), sm.stoneLight ?? sm.stone, 0, 0.06, -1.5);

  const sheds: [number, number][] = [
    [LANE, half],
    [-half, -LANE],
  ];
  sheds.forEach(([x0, x1], si) => {
    const cx = (x0 + x1) / 2;
    const L = x1 - x0;
    // 平頂：厚木板屋面＋一圈封簷板，前緣略伸出成雨遮
    add(new THREE.BoxGeometry(L + 0.5, 0.24, b.depth + 1.1), plank, cx, H + 0.12, 0.3);
    add(new THREE.BoxGeometry(L + 0.6, 0.34, 0.12), sm.darkWood, cx, H + 0.06, D + 0.86);
    add(new THREE.BoxGeometry(L + 0.6, 0.34, 0.12), sm.darkWood, cx, H + 0.06, -D - 0.26);
    add(new THREE.BoxGeometry(L + 0.62, 0.06, 0.16), sm.gold, cx, H + 0.25, D + 0.86);
    // 屋頂上的雜物：木箱、捲起的帆布
    add(new THREE.BoxGeometry(0.9, 0.6, 0.9), raw, cx + L * 0.25, H + 0.54, -D + 1.0);
    const roll = add(new THREE.CylinderGeometry(0.22, 0.22, 2.2, 10), canvas, cx - L * 0.2, H + 0.46, -D + 1.2);
    roll.rotation.z = Math.PI / 2;
    // 樑與柱：前排、後排各 4 根
    const nP = 4;
    for (let i = 0; i < nP; i++) {
      const x = x0 + 0.2 + ((L - 0.4) * i) / (nP - 1);
      for (const z of [D - 0.2, -D + 0.2]) {
        add(new THREE.BoxGeometry(0.28, H, 0.28), sm.darkWood, x, H / 2, z);
        postCol(`post-${si}-${i}-${z > 0 ? 'f' : 'b'}`, x, z);
      }
      // 斜撐
      const br = add(new THREE.BoxGeometry(0.12, 0.12, 1.2), sm.darkWood, x, H - 0.45, D - 0.62);
      br.rotation.x = Math.PI / 4;
    }
    add(new THREE.BoxGeometry(L, 0.3, 0.3), sm.darkWood, cx, H - 0.15, D - 0.2);
    add(new THREE.BoxGeometry(L, 0.3, 0.3), sm.darkWood, cx, H - 0.15, -D + 0.2);
    for (let i = 0; i <= 5; i++) add(new THREE.BoxGeometry(0.16, 0.22, b.depth), sm.darkWood, x0 + (L * i) / 5, H - 0.12, 0);
    // 後牆：直拼木板＋掛工具的洞洞板
    add(new THREE.BoxGeometry(L, H, 0.14), wood, cx, H / 2, -D + 0.07);
    for (let i = 0; i < Math.round(L / 0.42); i++) add(new THREE.BoxGeometry(0.03, H - 0.2, 0.02), sm.darkWood, x0 + 0.21 + i * 0.42, H / 2, -D + 0.155);
    boxCol(`back-${si}`, cx, -D + 0.07, L / 2, 0.2);
    const tw = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(6.4, L - 1.6), 2.3), new THREE.MeshStandardMaterial({ map: toolWallTexture(si), roughness: 0.85 }));
    tw.position.set(cx, 2.35, -D + 0.17);
    tw.userData.noMerge = true;
    root.add(tw);
    // 外側山牆（靠島外那頭封起來，通道那頭開放）
    const xe = si === 0 ? x1 : x0;
    add(new THREE.BoxGeometry(0.14, H, b.depth), wood, xe, H / 2, 0);
    colliders.push(...segCol(W, `${b.id}-end-${si}`, xe, -D, xe, D - 0.5));

    // 木架（棚架）：三層板架，擺滿罐子、木箱、零件
    const rackX = [x0 + 1.4, x1 - 1.4];
    rackX.forEach((rx, ri) => {
      const rz = -D + 0.75;
      for (const ox of [-0.8, 0.8]) for (const oz of [-0.3, 0.3]) add(new THREE.BoxGeometry(0.08, 2.6, 0.08), sm.darkWood, rx + ox, 1.3, rz + oz);
      for (let k = 0; k < 3; k++) {
        const y = 0.45 + k * 0.85;
        add(new THREE.BoxGeometry(1.72, 0.06, 0.7), plank, rx, y, rz);
        for (let q = 0; q < 3; q++) {
          const kind = (q + k + ri + si) % 3;
          const px = rx - 0.5 + q * 0.5;
          if (kind === 0) add(new THREE.BoxGeometry(0.34, 0.28, 0.4), raw, px, y + 0.17, rz);
          else if (kind === 1) add(new THREE.CylinderGeometry(0.13, 0.15, 0.32, 10), (q + k) % 2 ? sm.pot : steel, px, y + 0.19, rz);
          else add(new THREE.BoxGeometry(0.36, 0.16, 0.3), red, px, y + 0.11, rz);
        }
      }
      boxCol(`rack-${si}-${ri}`, rx, rz, 0.95, 0.45);
    });
    // 木料堆（立著靠牆＋平放一疊）
    for (let k = 0; k < 6; k++) {
      const pl = add(new THREE.BoxGeometry(0.16, 2.8, 0.1), raw, cx - 1.2 + k * 0.2, 1.42, -D + 0.32);
      pl.rotation.z = 0.12;
    }
    for (let k = 0; k < 6; k++) add(new THREE.BoxGeometry(2.6, 0.16, 0.22), raw, cx + (si ? 1.6 : -1.6), 0.18 + Math.floor(k / 3) * 0.17, -D + 1.6 + (k % 3) * 0.24);
    boxCol(`lumber-${si}`, cx + (si ? 1.6 : -1.6), -D + 1.85, 1.35, 0.45);
    // 掛燈
    lan.addHanging(cx - L * 0.25, H - 0.35, 0.6, 0.62);
    lan.addHanging(cx + L * 0.25, H - 0.35, 0.6, 0.62);
  });

  // ── 南棚（x < 0）：鐵砧、砂輪、鋸木架、大工作台
  {
    const ax = -6.0;
    add(new THREE.CylinderGeometry(0.35, 0.45, 0.6, 12), plank, ax, 0.3, 0.6);
    add(new THREE.BoxGeometry(0.9, 0.22, 0.4), iron, ax, 0.72, 0.6);
    add(new THREE.BoxGeometry(0.5, 0.18, 0.3), iron, ax + 0.55, 0.74, 0.6);
    postCol('anvil', ax, 0.6, 0.55);
    // 砂輪
    const gx = -9.2;
    add(new THREE.BoxGeometry(0.5, 0.9, 0.5), iron, gx, 0.45, 0.8);
    const wh = add(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 20), new THREE.MeshStandardMaterial({ color: 0x8a8580, roughness: 0.95 }), gx, 1.25, 0.8);
    wh.rotation.x = Math.PI / 2;
    postCol('grinder', gx, 0.8, 0.45);
    // 鋸木架＋木板
    for (const ox of [-0.7, 0.7]) {
      const l1 = add(new THREE.BoxGeometry(0.08, 0.8, 0.08), sm.darkWood, -3.9 + ox, 0.4, 1.5);
      l1.rotation.x = 0.25;
      const l2 = add(new THREE.BoxGeometry(0.08, 0.8, 0.08), sm.darkWood, -3.9 + ox, 0.4, 1.8);
      l2.rotation.x = -0.25;
    }
    add(new THREE.BoxGeometry(2.4, 0.06, 0.4), raw, -3.9, 0.82, 1.65);
    boxCol('sawhorse', -3.9, 1.65, 1.2, 0.35);
    // 大工作台＋台鉗
    const bx = -7.6;
    const bz = -1.2;
    add(new THREE.BoxGeometry(3.0, 0.12, 1.1), plank, bx, 0.92, bz);
    for (const [ox, oz] of [[-1.35, -0.45], [1.35, -0.45], [-1.35, 0.45], [1.35, 0.45]]) add(new THREE.BoxGeometry(0.12, 0.9, 0.12), sm.darkWood, bx + ox, 0.45, bz + oz);
    add(new THREE.BoxGeometry(2.8, 0.06, 0.9), plank, bx, 0.25, bz);
    add(new THREE.BoxGeometry(0.3, 0.22, 0.24), iron, bx + 1.2, 1.09, bz + 0.45);
    add(new THREE.BoxGeometry(0.7, 0.3, 0.4), red, bx - 0.8, 1.13, bz);
    add(new THREE.BoxGeometry(0.75, 0.05, 0.44), sm.gold, bx - 0.8, 1.3, bz);
    boxCol('bench-s', bx, bz, 1.55, 0.6);
  }
  // ── 北棚（x > 0）：大熊的工作區（大熊自己帶工作台）、工具箱、油桶、齒輪招牌
  {
    add(new THREE.CylinderGeometry(0.32, 0.32, 0.9, 14), new THREE.MeshStandardMaterial({ color: 0x2f5675, roughness: 0.5, metalness: 0.3 }), 10.6, 0.45, 1.4);
    add(new THREE.CylinderGeometry(0.32, 0.32, 0.9, 14), red, 11.3, 0.45, 0.9);
    postCol('drum-a', 10.6, 1.4, 0.4);
    postCol('drum-b', 11.3, 0.9, 0.4);
    add(new THREE.BoxGeometry(0.9, 0.55, 0.5), red, 4.4, 0.33, -1.0);
    add(new THREE.BoxGeometry(0.95, 0.06, 0.55), sm.gold, 4.4, 0.62, -1.0);
    boxCol('toolbox', 4.4, -1.0, 0.5, 0.3);
    // 牆上的發光齒輪
    const gear = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.12, 8, 18),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 0.7, roughness: 0.3, metalness: 0.4 })
    );
    gear.position.set(9.6, 3.2, -D + 0.25);
    gear.userData.noMerge = true;
    root.add(gear);
    root.userData.tick = (t: number) => {
      gear.rotation.z = t * 0.6;
    };
  }

  // ── 通道上方的匾額「大熊匠鋪」：兩根門柱＋橫樑
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(0.34, H + 1.1, 0.34), sm.redLacquer, s * (LANE - 0.05), (H + 1.1) / 2, D + 0.4);
    postCol(`gate-${s}`, s * (LANE - 0.05), D + 0.4, 0.25);
  }
  add(new THREE.BoxGeometry(LANE * 2 + 0.6, 0.3, 0.4), sm.darkWood, 0, H + 1.05, D + 0.4);
  const tex = signTexture(b.name, '百工坊・修修補補・技術落地');
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 1.1),
    new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.35, roughness: 0.6 })
  );
  sign.position.set(0, H + 0.35, D + 0.62);
  sign.userData.noMerge = true;
  root.add(sign);
  const back = sign.clone();
  back.rotation.y = Math.PI;
  back.position.z = D + 0.18;
  root.add(back);
  lan.addHanging(-LANE + 0.5, H - 0.1, D + 0.4, 0.7);
  lan.addHanging(LANE - 0.5, H - 0.1, D + 0.4, 0.7);

  mergeByMaterial(stat);
  root.add(lan.build());
  root.userData.colliders = colliders;
  return root;
}

function segCol(W: (x: number, z: number) => [number, number], id: string, ax: number, az: number, bx: number, bz: number): Collider[] {
  const [x1, z1] = W(ax, az);
  const [x2, z2] = W(bx, bz);
  return [{ id, type: 'segment', x1, z1, x2, z2, halfThickness: 0.14 } as Collider];
}

/** 百工坊街西側白牆（另一面是論道廣場東牆），中間開月洞門 */
export function createCraftWall(): { group: THREE.Group; colliders: Collider[] } {
  const sm = getStyleMaterials();
  const root = new THREE.Group();
  root.name = 'craft_wall';
  const { x0, x1, z0, z1, h, gateZ, gateR } = CRAFT_WALL;
  const t = x1 - x0;
  const xc = (x0 + x1) / 2;
  const cream = new THREE.MeshStandardMaterial({ color: 0xf1ece2, roughness: 0.95, side: THREE.DoubleSide });
  // 牆身輪廓（shape 的 x＝世界 z、y＝高度），月洞門做成從地面往上凹進去的圓拱（底部切平當門檻）
  const cy = gateR * 0.85;
  const c = Math.sqrt(gateR * gateR - cy * cy);
  const th0 = Math.asin(cy / gateR);
  const shape = new THREE.Shape();
  shape.moveTo(z0, 0);
  shape.lineTo(gateZ - c, 0);
  shape.absarc(gateZ, cy, gateR, Math.PI + th0, -th0, true);
  shape.lineTo(z1, 0);
  shape.lineTo(z1, h);
  shape.lineTo(z0, h);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 32 });
  // (u, v, w) → (x0 + w, v, u)
  geo.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, x0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
  geo.computeVertexNormals();
  const wallMesh = new THREE.Mesh(geo, cream);
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  root.add(wallMesh);
  // 石裙、黛瓦壓頂
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(t + 0.08, 0.6, gateZ - gateR - z0), sm.stone);
  skirt.position.set(xc, 0.3, (z0 + gateZ - gateR) / 2);
  root.add(skirt);
  const skirt2 = new THREE.Mesh(new THREE.BoxGeometry(t + 0.08, 0.6, z1 - (gateZ + gateR)), sm.stone);
  skirt2.position.set(xc, 0.3, (gateZ + gateR + z1) / 2);
  root.add(skirt2);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(t + 0.9, 0.18, z1 - z0 + 0.4), sm.roofs.slate);
  cap.position.set(xc, h + 0.1, (z0 + z1) / 2);
  root.add(cap);
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, z1 - z0 + 0.4), sm.ridges.slate);
  ridge.position.set(xc, h + 0.3, (z0 + z1) / 2);
  root.add(ridge);
  // 月洞門石框（沿著圓拱）
  const arcG = new THREE.TorusGeometry(gateR + 0.05, 0.1, 8, 40, Math.PI + 2 * th0);
  arcG.rotateZ(-th0);
  arcG.rotateY(Math.PI / 2);
  for (const x of [x0 - 0.03, x1 + 0.03]) {
    const r = new THREE.Mesh(arcG, sm.stoneLight ?? sm.stone);
    r.position.set(x, cy, gateZ);
    root.add(r);
  }
  const colliders: Collider[] = [
    { id: 'craft-wall-s', type: 'segment', x1: xc, z1: z0, x2: xc, z2: gateZ - gateR + 0.15, halfThickness: t / 2 + 0.05 } as Collider,
    { id: 'craft-wall-n', type: 'segment', x1: xc, z1: gateZ + gateR - 0.15, x2: xc, z2: z1, halfThickness: t / 2 + 0.05 } as Collider,
  ];
  return { group: root, colliders };
}
