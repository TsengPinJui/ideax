import * as THREE from 'three';
import type { Collider, BuildingInteractable } from '../types';
import { localToWorldXZ } from '../regionConfigs';
import { getStyleMaterials, mergeByMaterial, buildRoofTier, LanternBatch } from './architecture';

/**
 * 百工坊街（討論島東區）：
 * - 東側（右手邊）：大熊的「大熊匠鋪」，依參考圖「大熊匠鋪」打造江南古風匠作廳堂：
 *   - 露明深色木椽雙坡頂、大橫樑與瓜柱、烏木立柱與青石柱礎、復古青磚鋪地
 *   - 斑駁白牆配「左右對稱雙八角木格柵花窗」＋中央「雙圓光山水木雕掛屏」＋紅木條案（松盆景、銅渾天儀）
 *   - 側牆整排木格柵花格窗、羅漢床與暖橙桌燈；另一側博古架（多寶格青花瓷瓶）與白瓷盆闊葉綠植
 *   - 廳堂中央懸掛雙層彩繪宮燈（垂掛長紅流蘇），下方擺設紅木大畫案（筆架、青花大筆筒插捲軸、碗碟、官帽椅搭白布）
 *   - 兩座廳堂中間保留青石通道穿往東岸雙人馬車
 * - 西側（左手邊）：白牆與百工佈告欄，牆上開月洞門通往論道廣場
 */

const KAI = '"DFKai-SB","BiauKai","Kaiti TC","STKaiti","KaiTi","LXGW WenKai TC","CWTeXKai","Noto Serif TC",serif';

/** 西側白牆：牆的西面（朝廣場）在 x0、東面（朝百工坊街）在 x1 */
export const CRAFT_WALL = { x0: 80.0, x1: 80.6, z0: -55.6, z1: -32.0, h: 4.6, gateZ: -46.6, gateR: 1.45 };

/** 大熊匠鋪裡大熊站的位置（本地座標：位於北廳紅木大畫案旁） */
export const BEAR_LOCAL = { x: 6.6, z: 1.15 };
/** 匠鋪中間的通道半寬 */
const LANE = 2.4;

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

/** 復古青磚鋪地貼圖（呼應大熊匠鋪地面溫潤古磚質感） */
function antiqueBrickFloorTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#6c6359';
  g.fillRect(0, 0, 512, 512);
  const rows = 8;
  const cols = 4;
  const rh = 512 / rows;
  const cw = 512 / cols;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (cw / 2);
    for (let k = -1; k <= cols; k++) {
      const x = k * cw + off;
      const y = r * rh;
      const shade = ((r * 7 + k * 13) & 3) * 6 - 9;
      g.fillStyle = `rgb(${114 + shade},${103 + shade},${92 + shade})`;
      g.fillRect(x + 3, y + 3, cw - 6, rh - 6);
      g.fillStyle = 'rgba(255,235,205,0.06)';
      g.fillRect(x + 6, y + 6, cw - 18, rh - 18);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 3);
  return t;
}

/** 斑駁白牆貼圖（呼應大熊匠鋪後牆歲月肌理） */
function agedPlasterWallTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#e5dfd3';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) {
    const x = (i * 73) % 512;
    const y = (i * 137) % 512;
    const r = 18 + (i % 5) * 14;
    const grd = g.createRadialGradient(x, y, 2, x, y, r);
    grd.addColorStop(0, i % 2 ? 'rgba(165,152,132,0.16)' : 'rgba(255,252,245,0.18)');
    grd.addColorStop(1, 'rgba(229,223,211,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 後牆中央「圓光山水木雕掛屏」貼圖（深色雕花木框＋金色圓形山水畫＋題字） */
function roundLandscapeScrollTexture(variant: number) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 640;
  const g = c.getContext('2d')!;
  // 烏木底板與回紋金邊
  g.fillStyle = '#2d1c11';
  g.fillRect(0, 0, 256, 640);
  g.strokeStyle = '#c59645';
  g.lineWidth = 8;
  g.strokeRect(10, 10, 236, 620);
  g.strokeStyle = 'rgba(229,188,108,0.45)';
  g.lineWidth = 3;
  g.strokeRect(20, 20, 216, 600);

  // 上方米黃綾絹襯底
  g.fillStyle = '#dfd1b4';
  g.fillRect(28, 86, 200, 440);

  // 中央金色圓光山水扇面
  const cx = 128;
  const cy = 276;
  const r = 82;
  const sky = g.createRadialGradient(cx, cy - 20, 8, cx, cy, r);
  sky.addColorStop(0, '#fff2c2');
  sky.addColorStop(0.65, '#e6be6a');
  sky.addColorStop(1, '#b88636');
  g.fillStyle = sky;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();

  // 遠山與松影（裁切在圓光內）
  g.save();
  g.beginPath();
  g.arc(cx, cy, r - 2, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = '#5c4b32';
  g.beginPath();
  g.moveTo(cx - 85, cy + 40);
  g.lineTo(cx - 30, cy - 22);
  g.lineTo(cx + 15, cy + 18);
  g.lineTo(cx + 55, cy - 34);
  g.lineTo(cx + 90, cy + 40);
  g.closePath();
  g.fill();
  g.fillStyle = '#2f2416';
  g.beginPath();
  g.moveTo(cx - 90, cy + 75);
  g.lineTo(cx - 45, cy + 8);
  g.lineTo(cx + 22, cy + 48);
  g.lineTo(cx + 90, cy + 75);
  g.closePath();
  g.fill();
  g.restore();

  g.strokeStyle = '#785226';
  g.lineWidth = 5;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.stroke();

  // 上下書法題跋
  g.fillStyle = '#3a2514';
  g.font = `900 32px ${KAI}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(variant === 0 ? '巧奪天工' : '匠心獨運', cx, 132);
  g.font = `700 24px ${KAI}`;
  g.fillText(variant === 0 ? '百工傳承・格物致知' : '木石生輝・大熊匠作', cx, 446);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 八角格柵花窗與側牆木格窗的暖光窗景貼圖 */
function latticeWindowGlowTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, '#fff7dc');
  grd.addColorStop(0.55, '#f6e4b5');
  grd.addColorStop(1, '#d8c394');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  // 窗外竹葉翠影
  g.fillStyle = 'rgba(96,125,82,0.32)';
  for (let i = 0; i < 12; i++) {
    g.beginPath();
    g.ellipse(45 + (i * 37) % 170, 60 + (i * 53) % 140, 28, 7, (i * 0.4) - 0.6, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 青花瓷筆筒與瓷瓶貼圖 */
function blueWhitePorcelainTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f4f6f8';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#1e4e8c';
  g.lineWidth = 8;
  g.strokeRect(0, 18, 256, 220);
  g.fillStyle = '#23589c';
  for (let x = 20; x < 256; x += 48) {
    g.beginPath();
    g.arc(x, 128, 16, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(x + 24, 92, 10, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(x + 24, 164, 10, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 大熊匠鋪：依參考圖二打造江南古風匠作廳堂（b.facingYaw 讓本地 +Z 朝向百工坊街） */
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
    const [x, z] = W(lx, lz);
    const swap = Math.abs(Math.sin(b.facingYaw)) > 0.7;
    colliders.push({ id: `${b.id}-${id}`, type: 'box', x, z, halfWidth: swap ? hd : hw, halfDepth: swap ? hw : hd });
  };
  const postCol = (id: string, lx: number, lz: number, r = 0.24) => {
    const [x, z] = W(lx, lz);
    colliders.push({ id: `${b.id}-${id}`, type: 'cylinder', x, z, radius: r });
  };

  const half = b.width / 2; // 12.0m
  const D = b.depth / 2; // 3.8m（+D 朝百工坊街，-D 靠東岸）
  const H = 4.35;
  const ridgeH = 6.05;

  // ── 材質定義（呼應大熊匠鋪參考圖：烏木樑柱、紅木大畫案、斑駁白牆、復古青磚、青花瓷、暖光宮燈紅流蘇） ──
  const darkTimber = new THREE.MeshStandardMaterial({ color: 0x2c1d13, roughness: 0.72 });
  const rafterWood = new THREE.MeshStandardMaterial({ color: 0x3b2618, roughness: 0.78 });
  const rosewood = new THREE.MeshStandardMaterial({ color: 0x6e2c1b, roughness: 0.46, metalness: 0.08 });
  const warmWood = new THREE.MeshStandardMaterial({ color: 0x8c5330, roughness: 0.62 });
  const scrollPaper = new THREE.MeshStandardMaterial({ color: 0xf4ead2, roughness: 0.75 });
  const whiteCloth = new THREE.MeshStandardMaterial({ color: 0xf7f4ec, roughness: 0.82, side: THREE.DoubleSide });
  const ceramicWhite = new THREE.MeshStandardMaterial({ color: 0xf0ede6, roughness: 0.35, metalness: 0.05 });
  const porcelainMat = new THREE.MeshStandardMaterial({ map: blueWhitePorcelainTexture(), roughness: 0.3, metalness: 0.08 });
  const celadonMat = new THREE.MeshStandardMaterial({ color: 0x8fb39e, roughness: 0.32, metalness: 0.06 });
  const plantLeaf = new THREE.MeshStandardMaterial({ color: 0x2d6a36, roughness: 0.65, side: THREE.DoubleSide });
  const tasselRed = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.55 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4a642, roughness: 0.32, metalness: 0.72 });
  const brickFloorMat = new THREE.MeshStandardMaterial({ map: antiqueBrickFloorTexture(), roughness: 0.86 });
  const plasterWallMat = new THREE.MeshStandardMaterial({ map: agedPlasterWallTexture(), roughness: 0.9 });
  const windowGlowMat = new THREE.MeshStandardMaterial({
    map: latticeWindowGlowTexture(),
    emissive: new THREE.Color(0xffe6b0),
    emissiveIntensity: 0.48,
    roughness: 0.5,
  });
  const palaceLanternGlow = new THREE.MeshStandardMaterial({
    color: 0xffe4a8,
    emissive: new THREE.Color(0xff9e32),
    emissiveIntensity: 1.15,
    roughness: 0.38,
  });
  const tableLampGlow = new THREE.MeshStandardMaterial({
    color: 0xffd08a,
    emissive: new THREE.Color(0xff7b1a),
    emissiveIntensity: 1.35,
    roughness: 0.35,
  });
  const lan = new LanternBatch();

  // ── 1. 地坪：兩座匠作廳堂鋪設復古青磚，中央通道鋪青石板通往東岸馬車 ──
  add(new THREE.BoxGeometry(b.width + 0.4, 0.14, b.depth + 0.4), sm.stone, 0, 0.07, 0);
  add(new THREE.BoxGeometry(LANE * 2 + 0.2, 0.16, b.depth + 3.6), sm.stoneLight ?? sm.stone, 0, 0.08, -1.2);

  const halls: [number, number][] = [
    [LANE, half],   // 北廳（主匠作廳堂：大熊與紅木大畫案所在）
    [-half, -LANE], // 南廳（百工器物與木作展示廳）
  ];

  // 輔助：在牆面上建造「八角木格柵花窗」
  const buildOctagonalWindow = (cx: number, cy: number, cz: number) => {
    const r = 0.86;
    const octGlow = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.92, r * 0.92, 0.04, 8).rotateX(Math.PI / 2), windowGlowMat);
    octGlow.position.set(cx, cy, cz);
    octGlow.rotation.z = Math.PI / 8;
    octGlow.userData.noMerge = true;
    root.add(octGlow);
    // 八角烏木外框
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      const bx = cx + Math.cos(a) * (r * 0.88);
      const by = cy + Math.sin(a) * (r * 0.88);
      const bar = add(new THREE.BoxGeometry(r * 0.78, 0.08, 0.12), darkTimber, bx, by, cz + 0.03);
      bar.rotation.z = a + Math.PI / 2;
    }
    // 窗心傳統冰裂／方格木欞條
    for (const off of [-0.36, 0, 0.36]) {
      add(new THREE.BoxGeometry(r * 1.55, 0.045, 0.08), darkTimber, cx, cy + off, cz + 0.04);
      add(new THREE.BoxGeometry(0.045, r * 1.55, 0.08), darkTimber, cx + off, cy, cz + 0.04);
    }
    add(new THREE.BoxGeometry(0.62, 0.62, 0.09), darkTimber, cx, cy, cz + 0.045).rotation.z = Math.PI / 4;
    add(new THREE.BoxGeometry(0.48, 0.48, 0.1), windowGlowMat, cx, cy, cz + 0.05).rotation.z = Math.PI / 4;
  };

  // 輔助：建造天花板中央「雙層彩繪宮燈（附長紅流蘇）」
  const buildPalaceLantern = (lx: number, topY: number, lz: number) => {
    const gLan = new THREE.Group();
    gLan.position.set(lx, topY, lz);
    gLan.userData.noMerge = true;
    root.add(gLan);
    // 吊桿
    add(new THREE.CylinderGeometry(0.025, 0.025, 0.65, 6), darkTimber, 0, -0.32, 0, 0, gLan);
    // 上層與下層六角雕花宮燈框與暖光畫片
    const tiers = [
      { y: -0.82, r: 0.56, h: 0.46 },
      { y: -1.36, r: 0.42, h: 0.42 },
    ];
    tiers.forEach((tr) => {
      add(new THREE.CylinderGeometry(tr.r * 1.15, tr.r * 1.25, 0.1, 6), darkTimber, 0, tr.y + tr.h / 2 + 0.04, 0, 0, gLan);
      add(new THREE.CylinderGeometry(tr.r * 1.05, tr.r * 1.05, 0.08, 6), darkTimber, 0, tr.y - tr.h / 2 - 0.03, 0, 0, gLan);
      const core = add(new THREE.CylinderGeometry(tr.r * 0.88, tr.r * 0.82, tr.h, 6), palaceLanternGlow, 0, tr.y, 0, 0, gLan);
      core.userData.noMerge = true;
      // 六角飛簷翹角與垂掛長紅流蘇
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        const rx = Math.cos(a) * tr.r;
        const rz = Math.sin(a) * tr.r;
        add(new THREE.CylinderGeometry(0.025, 0.025, tr.h + 0.08, 6), darkTimber, rx, tr.y, rz, 0, gLan);
        add(new THREE.CylinderGeometry(0.015, 0.028, 0.52, 6), tasselRed, rx * 1.08, tr.y - tr.h / 2 - 0.28, rz * 1.08, 0, gLan);
      }
    });
    // 中央主長紅流蘇與金珠
    add(new THREE.SphereGeometry(0.08, 10, 8), brassMat, 0, -1.66, 0, 0, gLan);
    add(new THREE.CylinderGeometry(0.025, 0.055, 0.85, 8), tasselRed, 0, -2.12, 0, 0, gLan);
  };

  halls.forEach(([x0, x1], hi) => {
    const cx = (x0 + x1) / 2;
    const L = x1 - x0;

    // 復古青磚地坪
    const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(L - 0.1, 0.06, b.depth - 0.1), brickFloorMat);
    floorMesh.position.set(cx, 0.15, 0);
    floorMesh.receiveShadow = true;
    floorMesh.userData.noMerge = true;
    root.add(floorMesh);

    // ── 烏木立柱與青石柱礎（前排開敞迎客、中排獨立立柱、後排貼牆柱） ──
    const nCols = 4;
    for (let i = 0; i < nCols; i++) {
      const px = x0 + 0.28 + ((L - 0.56) * i) / (nCols - 1);
      for (const pz of [D - 0.22, -D + 0.22]) {
        add(new THREE.CylinderGeometry(0.22, 0.27, 0.28, 8), sm.stone, px, 0.28, pz);
        add(new THREE.CylinderGeometry(0.15, 0.17, H - 0.2, 12), darkTimber, px, H / 2 + 0.1, pz);
        postCol(`post-${hi}-${i}-${pz > 0 ? 'f' : 'b'}`, px, pz, 0.25);
      }
      // 橫跨進深的大橫樑（大柁樑）、雙層抬樑與瓜柱（Queen-post）
      add(new THREE.BoxGeometry(0.24, 0.3, b.depth - 0.2), darkTimber, px, H - 0.08, 0);
      add(new THREE.BoxGeometry(0.2, 0.24, b.depth * 0.56), darkTimber, px, H + 0.68, 0);
      for (const qz of [-b.depth * 0.22, b.depth * 0.22]) {
        add(new THREE.CylinderGeometry(0.11, 0.12, 0.62, 8), darkTimber, px, H + 0.34, qz);
      }
      add(new THREE.CylinderGeometry(0.11, 0.12, ridgeH - (H + 0.68), 8), darkTimber, px, (ridgeH + H + 0.68) / 2, 0);
    }

    // 室內中央獨立烏木立柱（重現參考圖二前景右側立於青石柱礎上的深色大木柱）
    const innerPostX = hi === 0 ? cx + 1.45 : cx - 1.45;
    add(new THREE.CylinderGeometry(0.24, 0.29, 0.32, 8), sm.stone, innerPostX, 0.3, 0.55);
    add(new THREE.CylinderGeometry(0.16, 0.18, H + 0.35, 12), darkTimber, innerPostX, (H + 0.35) / 2 + 0.12, 0.55);
    postCol(`inner-post-${hi}`, innerPostX, 0.55, 0.26);

    // 縱向貫穿額枋與檁條
    for (const pz of [D - 0.22, -D + 0.22, 0]) {
      add(new THREE.BoxGeometry(L, 0.26, 0.26), darkTimber, cx, pz === 0 ? ridgeH - 0.12 : H - 0.08, pz);
    }

    // ── 露明深色木椽雙坡屋頂（內部可見密排木椽條，外部覆黛瓦飛簷） ──
    const halfSpanZ = D + 0.45;
    const slopeLen = Math.hypot(halfSpanZ, ridgeH - H);
    const slopeAng = Math.atan2(ridgeH - H, halfSpanZ);
    for (const sz of [-1, 1]) {
      const ceilingBoard = add(new THREE.BoxGeometry(L + 0.4, 0.06, slopeLen), darkTimber, cx, (H + ridgeH) / 2 + 0.04, sz * (halfSpanZ / 2));
      ceilingBoard.rotation.x = sz * slopeAng;
      for (let rx = x0 + 0.2; rx <= x1 - 0.2; rx += 0.38) {
        const rafter = add(new THREE.BoxGeometry(0.09, 0.1, slopeLen), rafterWood, rx, (H + ridgeH) / 2 - 0.02, sz * (halfSpanZ / 2));
        rafter.rotation.x = sz * slopeAng;
      }
    }
    const extRoof = buildRoofTier(L + 0.8, b.depth + 1.1, {
      rise: ridgeH - H + 0.15,
      overhang: 0.58,
      curl: 0.34,
      theme: 'slate',
      ridge: true,
      lite: true,
    });
    extRoof.position.set(cx, H + 0.05, 0);
    extRoof.traverse((o) => {
      o.userData.noMerge = true;
    });
    root.add(extRoof);

    // ── 後牆（z = -D + 0.12）：斑駁白牆＋左右對稱雙八角格柵花窗＋中央雙圓光山水木雕掛屏＋紅木條案 ──
    const backZ = -D + 0.12;
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(L - 0.2, H - 0.1, 0.18), plasterWallMat);
    backWall.position.set(cx, H / 2 + 0.08, backZ);
    backWall.userData.noMerge = true;
    root.add(backWall);
    // 後牆山尖白牆與深色木踢腳線
    add(new THREE.BoxGeometry(L - 0.2, 0.52, 0.22), darkTimber, cx, 0.38, backZ);
    boxCol(`back-${hi}`, cx, backZ, L / 2, 0.24);

    // 左右對稱兩座「八角木格柵花窗」
    buildOctagonalWindow(cx - 2.65, 2.45, backZ + 0.09);
    buildOctagonalWindow(cx + 2.65, 2.45, backZ + 0.09);

    // 中央兩幅「圓光山水木雕掛屏」
    for (const [si, sx] of [
      [0, -0.58],
      [1, 0.58],
    ] as [number, number][]) {
      const px = cx + sx;
      add(new THREE.BoxGeometry(0.92, 2.38, 0.08), darkTimber, px, 2.52, backZ + 0.1);
      const scrollMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.84, 2.26),
        new THREE.MeshStandardMaterial({ map: roundLandscapeScrollTexture((si + hi) % 2), roughness: 0.55 })
      );
      scrollMesh.position.set(px, 2.52, backZ + 0.15);
      scrollMesh.userData.noMerge = true;
      root.add(scrollMesh);
    }

    // 掛屏下方：紅木條案（擺設迎客松盆景與銅渾天儀）
    const cTableZ = backZ + 0.58;
    add(new THREE.BoxGeometry(2.35, 0.08, 0.58), rosewood, cx, 1.02, cTableZ);
    add(new THREE.BoxGeometry(2.2, 0.14, 0.48), darkTimber, cx, 0.92, cTableZ);
    for (const ox of [-1.05, 1.05]) {
      add(new THREE.BoxGeometry(0.1, 0.9, 0.46), darkTimber, cx + ox, 0.5, cTableZ);
    }
    // 條案左側：白瓷盆迎客松盆景
    add(new THREE.CylinderGeometry(0.22, 0.16, 0.16, 10), ceramicWhite, cx - 0.55, 1.14, cTableZ);
    add(new THREE.CylinderGeometry(0.04, 0.06, 0.34, 6), darkTimber, cx - 0.55, 1.34, cTableZ);
    add(new THREE.SphereGeometry(0.24, 10, 8).scale(1.35, 0.55, 0.95), plantLeaf, cx - 0.48, 1.52, cTableZ);
    // 條案右側：銅製渾天儀／星盤
    add(new THREE.BoxGeometry(0.28, 0.08, 0.28), darkTimber, cx + 0.58, 1.1, cTableZ);
    add(new THREE.TorusGeometry(0.2, 0.018, 8, 18), brassMat, cx + 0.58, 1.36, cTableZ);
    add(new THREE.TorusGeometry(0.16, 0.015, 8, 18), brassMat, cx + 0.58, 1.36, cTableZ, Math.PI / 3);
    add(new THREE.SphereGeometry(0.05, 8, 8), brassMat, cx + 0.58, 1.36, cTableZ);
    boxCol(`console-${hi}`, cx, cTableZ, 1.2, 0.35);

    // ── 外側端牆（x = x1 或 x0）：整面傳統木格柵花格窗牆＋護牆木裙板 ──
    const endX = hi === 0 ? x1 - 0.08 : x0 + 0.08;
    const inward = hi === 0 ? -1 : 1;
    add(new THREE.BoxGeometry(0.18, 1.15, b.depth - 0.2), darkTimber, endX, 0.68, 0);
    const winPane = new THREE.Mesh(new THREE.BoxGeometry(0.08, H - 1.35, b.depth - 0.5), windowGlowMat);
    winPane.position.set(endX, 1.25 + (H - 1.35) / 2, 0);
    winPane.userData.noMerge = true;
    root.add(winPane);
    // 木格柵花格窗直欞與橫欞
    for (let wz = -D + 0.35; wz <= D - 0.35; wz += 0.42) {
      add(new THREE.BoxGeometry(0.14, H - 1.25, 0.05), darkTimber, endX + inward * 0.03, 1.25 + (H - 1.35) / 2, wz);
    }
    for (let wy = 1.45; wy <= H - 0.2; wy += 0.48) {
      add(new THREE.BoxGeometry(0.14, 0.05, b.depth - 0.3), darkTimber, endX + inward * 0.03, wy, 0);
    }
    colliders.push(...segCol(W, `${b.id}-end-${hi}`, endX, -D, endX, D - 0.3));

    // ── 通道內側隔牆（靠近中央通道處設半開放博古架（多寶格）＋白瓷盆闊葉綠植） ──
    const shelfX = hi === 0 ? x0 + 0.55 : x1 - 0.55;
    const shelfZ = -1.25;
    // 明式博古架（多寶格）
    const shelfW = 0.52;
    const shelfD = 2.25;
    const shelfH = 3.15;
    for (const sz of [-shelfD / 2, 0, shelfD / 2]) {
      for (const sx of [-shelfW / 2, shelfW / 2]) {
        add(new THREE.BoxGeometry(0.07, shelfH, 0.07), darkTimber, shelfX + sx, 0.16 + shelfH / 2, shelfZ + sz);
      }
    }
    for (let lv = 0; lv < 4; lv++) {
      const ly = 0.42 + lv * 0.78;
      add(new THREE.BoxGeometry(shelfW + 0.04, 0.05, shelfD + 0.04), rosewood, shelfX, ly, shelfZ);
      // 錯落擺放青花瓷瓶、天青汝窯瓶與古籍函套
      for (let slot = -1; slot <= 1; slot++) {
        const pz = shelfZ + slot * 0.68;
        if ((lv + slot) % 2 === 0) {
          const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.38, 12), (lv + slot) % 4 === 0 ? porcelainMat : celadonMat);
          vase.position.set(shelfX, ly + 0.21, pz);
          vase.userData.noMerge = true;
          root.add(vase);
          add(new THREE.CylinderGeometry(0.06, 0.08, 0.14, 10), (lv + slot) % 4 === 0 ? porcelainMat : celadonMat, shelfX, ly + 0.44, pz);
        } else {
          add(new THREE.BoxGeometry(0.28, 0.14, 0.34), warmWood, shelfX, ly + 0.1, pz);
          add(new THREE.BoxGeometry(0.26, 0.08, 0.3), scrollPaper, shelfX, ly + 0.21, pz);
        }
      }
    }
    boxCol(`curio-shelf-${hi}`, shelfX, shelfZ, 0.36, shelfD / 2 + 0.1);

    // 博古架前方：大型白瓷花盆與茂盛闊葉綠植（呼應參考圖二左側大盆栽）
    const plantX = shelfX + (hi === 0 ? 0.32 : -0.32);
    const plantZ = 0.68;
    add(new THREE.CylinderGeometry(0.34, 0.25, 0.56, 14), ceramicWhite, plantX, 0.44, plantZ);
    add(new THREE.TorusGeometry(0.33, 0.03, 8, 16).rotateX(Math.PI / 2), ceramicWhite, plantX, 0.71, plantZ);
    for (let li = 0; li < 9; li++) {
      const a = (li / 9) * Math.PI * 2;
      const hOff = 0.92 + (li % 3) * 0.24;
      const rOut = 0.28 + (li % 2) * 0.16;
      add(new THREE.CylinderGeometry(0.02, 0.03, 0.55, 5), plantLeaf, plantX + Math.cos(a) * 0.12, hOff - 0.18, plantZ + Math.sin(a) * 0.12);
      const leaf = add(new THREE.SphereGeometry(0.24, 8, 6).scale(1.3, 0.18, 0.85), plantLeaf, plantX + Math.cos(a) * rOut, hOff, plantZ + Math.sin(a) * rOut, -a);
      leaf.rotation.z = 0.32;
    }
    postCol(`plant-${hi}`, plantX, plantZ, 0.42);

    // ── 廳堂天花板中央懸掛「雙層彩繪宮燈（附長紅流蘇）」 ──
    buildPalaceLantern(cx, ridgeH - 0.18, 0.1);
  });

  // ── 2. 北廳（主廳）：紅木大畫案（筆架、青花大筆筒插捲軸、碗碟、端硯）、官帽椅搭白布、羅漢床與暖橙桌燈 ──
  {
    const deskX = 7.45;
    const deskZ = 0.25;
    const deskW = 2.75;
    const deskD = 1.28;
    const deskH = 0.88;
    // 明式紅木大畫案桌面、雕花牙板與四足
    add(new THREE.BoxGeometry(deskW, 0.09, deskD), rosewood, deskX, deskH, deskZ);
    add(new THREE.BoxGeometry(deskW - 0.16, 0.14, deskD - 0.16), darkTimber, deskX, deskH - 0.1, deskZ);
    for (const [lx, lz] of [
      [-deskW / 2 + 0.16, -deskD / 2 + 0.16],
      [deskW / 2 - 0.16, -deskD / 2 + 0.16],
      [-deskW / 2 + 0.16, deskD / 2 - 0.16],
      [deskW / 2 - 0.16, deskD / 2 - 0.16],
    ]) {
      add(new THREE.BoxGeometry(0.11, deskH - 0.08, 0.11), rosewood, deskX + lx, (deskH - 0.08) / 2 + 0.08, deskZ + lz);
    }
    // 畫案左側：青花大筆筒（插滿建築圖紙捲軸）
    const potX = deskX - 0.78;
    const potZ = deskZ + 0.12;
    const brushPot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.17, 0.36, 14), porcelainMat);
    brushPot.position.set(potX, deskH + 0.22, potZ);
    brushPot.userData.noMerge = true;
    root.add(brushPot);
    for (const [sx, sz, h, tilt] of [
      [-0.06, -0.04, 0.56, 0.14],
      [0.05, -0.03, 0.62, -0.12],
      [0.0, 0.06, 0.52, 0.08],
      [-0.07, 0.05, 0.48, -0.16],
      [0.07, 0.04, 0.58, 0.18],
    ]) {
      const sRoll = add(new THREE.CylinderGeometry(0.035, 0.035, h, 8), scrollPaper, potX + sx, deskH + 0.36, potZ + sz);
      sRoll.rotation.z = tilt;
      add(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 8), tasselRed, potX + sx, deskH + 0.36 + h * 0.3, potZ + sz);
    }
    // 畫案中左：雕花木筆架（懸掛多支毛筆）
    const bhX = deskX - 0.18;
    const bhZ = deskZ - 0.18;
    add(new THREE.BoxGeometry(0.46, 0.04, 0.12), darkTimber, bhX, deskH + 0.06, bhZ);
    for (const ox of [-0.18, 0.18]) {
      add(new THREE.CylinderGeometry(0.02, 0.025, 0.38, 6), darkTimber, bhX + ox, deskH + 0.25, bhZ);
    }
    add(new THREE.BoxGeometry(0.48, 0.04, 0.05), darkTimber, bhX, deskH + 0.44, bhZ);
    for (const bx of [-0.1, -0.03, 0.04, 0.11]) {
      add(new THREE.CylinderGeometry(0.01, 0.012, 0.24, 6), warmWood, bhX + bx, deskH + 0.3, bhZ);
      add(new THREE.ConeGeometry(0.018, 0.07, 6), darkTimber, bhX + bx, deskH + 0.16, bhZ).rotation.x = Math.PI;
    }
    // 畫案中央與右側：攤開的匠作圖譜、端硯、白瓷碗碟與摺扇
    add(new THREE.BoxGeometry(0.76, 0.02, 0.52), scrollPaper, deskX + 0.42, deskH + 0.055, deskZ + 0.08);
    add(new THREE.BoxGeometry(0.22, 0.035, 0.15), darkTimber, deskX + 0.15, deskH + 0.06, deskZ + 0.22);
    for (const [cx, cz, r] of [
      [0.88, -0.18, 0.11],
      [1.06, 0.05, 0.09],
      [0.82, 0.26, 0.08],
    ]) {
      add(new THREE.CylinderGeometry(r, r * 0.65, 0.09, 12), ceramicWhite, deskX + cx, deskH + 0.09, deskZ + cz);
    }
    boxCol('main-rosewood-desk', deskX, deskZ, deskW / 2 + 0.1, deskD / 2 + 0.1);

    // 畫案旁的明式官帽椅（椅背搭白布，呼應參考圖二工作桌後方木椅）
    const chairX = deskX + 0.35;
    const chairZ = deskZ - 0.92;
    add(new THREE.BoxGeometry(0.58, 0.05, 0.52), rosewood, chairX, 0.52, chairZ);
    for (const [lx, lz] of [
      [-0.25, -0.22],
      [0.25, -0.22],
      [-0.25, 0.22],
      [0.25, 0.22],
    ]) {
      add(new THREE.CylinderGeometry(0.03, 0.03, 0.48, 8), darkTimber, chairX + lx, 0.28, chairZ + lz);
    }
    for (const lx of [-0.25, 0.25]) {
      add(new THREE.CylinderGeometry(0.03, 0.03, 0.56, 8), darkTimber, chairX + lx, 0.8, chairZ - 0.22);
    }
    add(new THREE.BoxGeometry(0.66, 0.06, 0.08), rosewood, chairX, 1.08, chairZ - 0.22);
    add(new THREE.BoxGeometry(0.24, 0.48, 0.03), rosewood, chairX, 0.8, chairZ - 0.22);
    // 椅背與扶手上的白麻布巾
    add(new THREE.BoxGeometry(0.28, 0.34, 0.06), whiteCloth, chairX + 0.12, 0.96, chairZ - 0.22);

    // 北廳靠東側花窗牆下：明式羅漢床（矮榻）與暖橙色桌燈（呼應參考圖二右側窗下木榻與暖燈）
    const bedX = half - 0.72;
    const bedZ = 0.35;
    add(new THREE.BoxGeometry(1.05, 0.44, 2.35), rosewood, bedX, 0.36, bedZ);
    add(new THREE.BoxGeometry(0.96, 0.06, 2.24), scrollPaper, bedX, 0.6, bedZ);
    add(new THREE.BoxGeometry(0.1, 0.38, 2.35), darkTimber, bedX + 0.46, 0.76, bedZ);
    for (const sz of [-1.12, 1.12]) {
      add(new THREE.BoxGeometry(1.05, 0.34, 0.1), darkTimber, bedX, 0.74, bedZ + sz);
    }
    // 羅漢床旁几案與暖橙色檯燈
    const lampZ = -1.25;
    add(new THREE.BoxGeometry(0.62, 0.68, 0.62), darkTimber, bedX, 0.48, lampZ);
    add(new THREE.CylinderGeometry(0.12, 0.16, 0.12, 10), darkTimber, bedX, 0.88, lampZ);
    const orangeShade = add(new THREE.ConeGeometry(0.26, 0.34, 12, 1, false), tableLampGlow, bedX, 1.12, lampZ);
    orangeShade.userData.noMerge = true;
    boxCol('daybed-n', bedX, 0, 0.6, 1.8);
  }

  // ── 3. 南廳（x < 0）：百工鲁班木作案、魯班鎖與精工器物展示 ──
  {
    const sDeskX = -7.2;
    const sDeskZ = 0.25;
    add(new THREE.BoxGeometry(2.6, 0.09, 1.2), rosewood, sDeskX, 0.88, sDeskZ);
    for (const [lx, lz] of [
      [-1.15, -0.48],
      [1.15, -0.48],
      [-1.15, 0.48],
      [1.15, 0.48],
    ]) {
      add(new THREE.BoxGeometry(0.11, 0.8, 0.11), darkTimber, sDeskX + lx, 0.48, sDeskZ + lz);
    }
    // 案上擺設：青花筆筒、建築斗栱模型與圖紙捲軸
    const pot2 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.15, 0.34, 12), porcelainMat);
    pot2.position.set(sDeskX + 0.68, 1.09, sDeskZ - 0.1);
    pot2.userData.noMerge = true;
    root.add(pot2);
    add(new THREE.BoxGeometry(0.48, 0.32, 0.48), warmWood, sDeskX - 0.45, 1.08, sDeskZ);
    add(new THREE.BoxGeometry(0.64, 0.14, 0.64), rosewood, sDeskX - 0.45, 1.28, sDeskZ);
    add(new THREE.BoxGeometry(0.75, 0.025, 0.5), scrollPaper, sDeskX + 0.15, 0.94, sDeskZ + 0.12);
    boxCol('south-desk', sDeskX, sDeskZ, 1.35, 0.65);
  }

  // ── 4. 中央通道上方牌樓與「大熊匠鋪」金字大匾 ──
  for (const s of [-1, 1]) {
    add(new THREE.CylinderGeometry(0.24, 0.28, 0.28, 8), sm.stone, s * (LANE - 0.05), 0.24, D + 0.38);
    add(new THREE.CylinderGeometry(0.17, 0.19, H + 1.15, 12), darkTimber, s * (LANE - 0.05), (H + 1.15) / 2 + 0.12, D + 0.38);
    postCol(`gate-${s}`, s * (LANE - 0.05), D + 0.38, 0.26);
  }
  add(new THREE.BoxGeometry(LANE * 2 + 0.8, 0.32, 0.38), darkTimber, 0, H + 1.1, D + 0.38);
  const gateRoof = buildRoofTier(LANE * 2 + 1.4, 1.5, {
    rise: 0.72,
    overhang: 0.48,
    curl: 0.32,
    theme: 'slate',
    ridge: true,
    lite: true,
  });
  gateRoof.position.set(0, H + 1.28, D + 0.38);
  gateRoof.traverse((o) => {
    o.userData.noMerge = true;
  });
  root.add(gateRoof);

  const tex = signTexture(b.name, '百工坊・格物匠作・技術落地');
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 1.05),
    new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.35, roughness: 0.6 })
  );
  sign.position.set(0, H + 0.42, D + 0.58);
  sign.userData.noMerge = true;
  root.add(sign);
  const back = sign.clone();
  back.rotation.y = Math.PI;
  back.position.z = D + 0.18;
  root.add(back);
  lan.addHanging(-LANE + 0.48, H - 0.05, D + 0.38, 0.68);
  lan.addHanging(LANE - 0.48, H - 0.05, D + 0.38, 0.68);

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
