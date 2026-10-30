import * as THREE from 'three';
import type { BuildingInteractable, Collider } from '../types';
import { getStyleMaterials, mergeByMaterial, buildRoofTier } from './architecture';
import { drawJobScrollTexture, JOB_SCROLLS } from './jobScroll';
import { createSosoNpc } from './npcs';
import { makePickProxy } from '../picking';
import { loadModelInto } from '../modelAssets';

/**
 * 求職廟（外殿重簷青瓦飛簷＋殿內朱紅神社大殿）：
 * 依照參考圖「求職廟內部」精細打造：
 * - 殿頂：全朱紅斜頂並列椽條（タルキ）、三道彩繪大虹樑（兩端鑲綠底金雲紋包角）、中央雕刻蟇股（蛙股）支撐、綠底金框直匾「求職宮」
 * - 兩側柱列：朱紅圓柱、柱間懸掛白底紫直紋神社垂幕（幕布 maku）與白色閃電狀紙垂（shide），下層設繪馬掛架
 * - 中央參道：溫潤木地板鋪設深紅絨毯，兩側排列參拜長條木椅
 * - 前方右側：木條格柵「賽錢箱」（正面鑲金色三巴紋與金銅包角）＋「二禮二拍手一禮」參拜立牌
 * - 前方左側：木案桌擺放紅色「おみくじ・求職靈籤」抽籤箱（頂部開圓孔）與原木籤箱（點擊可開啟求職探索）
 * - 後方神龕區：橫樑懸掛一排十盞白底紅頂黑字「御神燈」提燈、左側大太鼓、中央朱金神龕供桌、搜搜（Soso）與兩側 6 幅求職畫卷
 * 本地座標：+Z 朝廟門外
 */

const KAI = '"DFKai-SB","BiauKai","Kaiti TC","STKaiti","KaiTi","LXGW WenKai TC","CWTeXKai","Noto Serif TC",serif';

function outerPlaqueTexture(text: string) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 176;
  const g = c.getContext('2d')!;
  g.fillStyle = '#d8a642';
  g.fillRect(0, 0, 512, 176);
  g.fillStyle = '#17110d';
  g.fillRect(12, 12, 488, 152);
  g.strokeStyle = '#f3cd6e';
  g.lineWidth = 4;
  g.strokeRect(22, 22, 468, 132);
  g.strokeStyle = 'rgba(243,205,110,0.45)';
  g.lineWidth = 2;
  g.strokeRect(30, 30, 452, 116);
  g.fillStyle = '#ffd978';
  g.font = `900 98px ${KAI}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 92);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 殿內大樑中央懸掛的綠底金框直匾「求職宮」 */
function innerVerticalPlaqueTexture(text: string) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#d4a63a';
  g.fillRect(0, 0, 256, 512);
  g.fillStyle = '#143828';
  g.fillRect(14, 14, 228, 484);
  g.strokeStyle = '#f5d478';
  g.lineWidth = 6;
  g.strokeRect(24, 24, 208, 464);
  g.fillStyle = '#ffe28a';
  g.font = `900 92px ${KAI}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const chars = Array.from(text);
  chars.forEach((ch, idx) => {
    g.fillText(ch, 128, 120 + idx * 136);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 白底紫直紋神社垂幕（幕布 maku）貼圖 */
function shrineCurtainTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f8f5ee';
  g.fillRect(0, 0, 512, 256);
  // 底部微暗垂墜陰影
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, 'rgba(0,0,0,0.08)');
  grd.addColorStop(0.2, 'rgba(255,255,255,0)');
  grd.addColorStop(1, 'rgba(0,0,0,0.12)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 256);
  // 紫色直紋與圓形神紋
  g.fillStyle = '#4a2556';
  for (let x = 28; x < 512; x += 64) {
    g.fillRect(x, 0, 14, 256);
    g.fillRect(x + 20, 0, 6, 256);
  }
  g.strokeStyle = '#4a2556';
  g.lineWidth = 5;
  for (const cx of [128, 256, 384]) {
    g.beginPath();
    g.arc(cx, 128, 34, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.arc(cx, 128, 16, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 後方橫樑一排「御神燈」白底黑字紅框提燈貼圖 */
function goshintoLanternTexture(label: string) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 384;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff5dc';
  g.fillRect(0, 0, 256, 384);
  // 上下紅漆箍邊
  g.fillStyle = '#b91c1c';
  g.fillRect(0, 0, 256, 44);
  g.fillRect(0, 340, 256, 44);
  // 竹骨橫紋
  g.strokeStyle = 'rgba(120,70,30,0.22)';
  g.lineWidth = 2;
  for (let y = 56; y < 336; y += 22) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(256, y);
    g.stroke();
  }
  // 紅框與書法黑字
  g.strokeStyle = '#c81e1e';
  g.lineWidth = 6;
  g.strokeRect(52, 62, 152, 260);
  g.fillStyle = '#18110c';
  g.font = `900 68px ${KAI}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const chars = Array.from(label);
  chars.forEach((ch, i) => {
    g.fillText(ch, 128, 114 + i * 78);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 賽錢箱正面：金色三巴紋＋木格柵陰影 */
function saisenFrontTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 384;
  const g = c.getContext('2d')!;
  g.fillStyle = '#8b572a';
  g.fillRect(0, 0, 512, 384);
  g.fillStyle = 'rgba(40,20,6,0.38)';
  for (let x = 24; x < 512; x += 32) {
    g.fillRect(x, 24, 8, 336);
  }
  // 金銅包邊與橫帶
  g.strokeStyle = '#e0b346';
  g.lineWidth = 18;
  g.strokeRect(9, 9, 494, 366);
  g.fillStyle = '#d4a238';
  g.fillRect(0, 96, 512, 18);
  g.fillRect(0, 272, 512, 18);
  // 中央金色三巴紋圓徽
  g.save();
  g.translate(256, 192);
  g.fillStyle = '#f2c94c';
  g.beginPath();
  g.arc(0, 0, 66, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#5a3514';
  g.beginPath();
  g.arc(0, 0, 54, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffd966';
  for (let k = 0; k < 3; k++) {
    g.save();
    g.rotate((k * Math.PI * 2) / 3);
    g.beginPath();
    g.arc(0, -22, 17, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(0, 0, 42, -Math.PI * 0.5, Math.PI * 0.15);
    g.lineWidth = 10;
    g.strokeStyle = '#ffd966';
    g.stroke();
    g.restore();
  }
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 紅色「おみくじ・求職靈籤」抽籤箱正面貼圖 */
function omikujiBoxTexture(redStyle: boolean) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 384;
  const g = c.getContext('2d')!;
  g.fillStyle = redStyle ? '#c81e1e' : '#b8864c';
  g.fillRect(0, 0, 256, 384);
  g.strokeStyle = redStyle ? '#fde047' : '#523214';
  g.lineWidth = 10;
  g.strokeRect(12, 12, 232, 360);
  // 白底書法籤條
  g.fillStyle = '#fff9eb';
  g.fillRect(68, 42, 120, 300);
  g.strokeStyle = '#b91c1c';
  g.lineWidth = 4;
  g.strokeRect(74, 48, 108, 288);
  g.fillStyle = redStyle ? '#b91c1c' : '#291709';
  g.font = `900 52px ${KAI}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const chars = redStyle ? ['求', '職', '靈', '籤'] : ['良', '緣', '職', '籤'];
  chars.forEach((ch, i) => g.fillText(ch, 128, 92 + i * 66));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 參拜禮儀白底立牌貼圖 */
function etiquetteSignTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 384;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fcf9f2';
  g.fillRect(0, 0, 256, 384);
  g.strokeStyle = '#8b572a';
  g.lineWidth = 12;
  g.strokeRect(6, 6, 244, 372);
  g.fillStyle = '#b91c1c';
  g.fillRect(22, 22, 212, 52);
  g.fillStyle = '#fff8dc';
  g.font = `900 30px ${KAI}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('參拜作法', 128, 48);
  g.fillStyle = '#24160c';
  g.font = `900 40px ${KAI}`;
  const lines = ['二禮', '二拍手', '一禮', '誠心求職'];
  lines.forEach((ln, i) => g.fillText(ln, 128, 126 + i * 64));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createTempleExtras(b: BuildingInteractable): { group: THREE.Group; colliders: Collider[] } {
  const mats = getStyleMaterials();
  const root = new THREE.Group();
  root.name = `temple_extras_${b.id}`;
  root.position.copy(b.position);
  root.rotation.y = b.facingYaw;

  const stat = new THREE.Group();
  root.add(stat);
  const colliders: Collider[] = [];

  const worldPoint = (x: number, z: number) => {
    const c = Math.cos(b.facingYaw);
    const s = Math.sin(b.facingYaw);
    return [b.position.x + x * c + z * s, b.position.z - x * s + z * c] as const;
  };
  const segCol = (id: string, ax: number, az: number, bx: number, bz: number, halfThickness = 0.25) => {
    const [x1, z1] = worldPoint(ax, az);
    const [x2, z2] = worldPoint(bx, bz);
    colliders.push({ id: `${b.id}-${id}`, type: 'segment', x1, z1, x2, z2, halfThickness });
  };
  const postCol = (id: string, lx: number, lz: number, r = 0.34) => {
    const [x, z] = worldPoint(lx, lz);
    colliders.push({ id: `${b.id}-${id}`, type: 'cylinder', x, z, radius: r });
  };
  const add = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = stat
  ) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // ── 材質定義（呼應求職廟內部參考圖：鮮明朱紅漆木、綠金彩繪包角、溫潤檜木、白底紫紋幕布、深紅參道毯） ──
  const vermilion = new THREE.MeshStandardMaterial({ color: 0xc8281c, roughness: 0.42, metalness: 0.06 });
  const vermilionDark = new THREE.MeshStandardMaterial({ color: 0x991b14, roughness: 0.52 });
  const beamGreen = new THREE.MeshStandardMaterial({ color: 0x165b40, roughness: 0.48 });
  const hinokiWood = new THREE.MeshStandardMaterial({ color: 0xc89658, roughness: 0.68 });
  const warmWoodFloor = new THREE.MeshStandardMaterial({ color: 0x9e6334, roughness: 0.62 });
  const redCarpet = new THREE.MeshStandardMaterial({ color: 0x991818, roughness: 0.85 });
  const whiteStone = new THREE.MeshStandardMaterial({ color: 0xe6e1d6, roughness: 0.82 });
  const carvedStone = new THREE.MeshStandardMaterial({ color: 0xd5cfc2, roughness: 0.86 });
  const creamPlaster = new THREE.MeshStandardMaterial({ color: 0xf7f2e4, roughness: 0.88 });
  const shideWhite = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: new THREE.Color(0xfff8eb),
    emissiveIntensity: 0.22,
    roughness: 0.5,
    side: THREE.DoubleSide,
  });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xe5b84b,
    roughness: 0.28,
    metalness: 0.68,
    emissive: new THREE.Color(0x523608),
    emissiveIntensity: 0.2,
  });
  const warmGlow = new THREE.MeshStandardMaterial({
    color: 0xffe2a8,
    emissive: new THREE.Color(0xffa73b),
    emissiveIntensity: 1.15,
    roughness: 0.35,
  });

  // 殿堂尺寸（寬 12.0m、進深 10.4m，+Z 為正門方向）
  const W = 12.0;
  const D = 10.4;
  const hw = W / 2;
  const hd = D / 2;
  const floorY = 0.48;
  const eaveY = 5.45;
  const ridgeY = 8.15;

  // ── 1. 白石台基、溫潤木地板與中央深紅參道地毯 ──
  add(new THREE.BoxGeometry(W + 1.2, floorY, D + 1.2), whiteStone, 0, floorY / 2, 0);
  add(new THREE.BoxGeometry(W + 1.36, 0.08, D + 1.36), gold, 0, floorY - 0.02, 0);
  add(new THREE.BoxGeometry(W - 0.2, 0.08, D - 0.2), warmWoodFloor, 0, floorY + 0.04, 0);
  // 木地板拼縫線條
  for (let x = -hw + 0.8; x <= hw - 0.8; x += 0.8) {
    add(new THREE.BoxGeometry(0.02, 0.01, D - 0.4), vermilionDark, x, floorY + 0.085, 0);
  }
  // 中央深紅絨毯（從門口直通後方神龕）
  add(new THREE.BoxGeometry(2.7, 0.025, D - 0.6), redCarpet, 0, floorY + 0.09, 0.15);
  for (const sx of [-1, 1]) {
    add(new THREE.BoxGeometry(0.08, 0.028, D - 0.6), gold, sx * 1.32, floorY + 0.092, 0.15);
  }

  // ── 2. 外牆與室內柱列（前門寬敞開敞，兩側設下段木格護欄＋上段通透柱廊＋白底紫紋神社垂幕） ──
  const colX = hw - 0.45;
  const innerColX = hw - 1.35;
  const colZList = [-4.6, -2.3, 0, 2.3, 4.6];

  // 後牆（朱紅木骨＋米白灰泥牆面）
  add(new THREE.BoxGeometry(W - 0.4, eaveY - floorY, 0.28), creamPlaster, 0, floorY + (eaveY - floorY) / 2, -hd + 0.14);
  add(new THREE.BoxGeometry(W - 0.2, 1.35, 0.34), vermilionDark, 0, floorY + 0.68, -hd + 0.16);
  for (let x = -hw + 0.5; x <= hw - 0.5; x += 1.8) {
    add(new THREE.BoxGeometry(0.18, eaveY - floorY, 0.34), vermilion, x, floorY + (eaveY - floorY) / 2, -hd + 0.16);
  }
  // 後山牆三角尖頂封板
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-hw + 0.2, 0);
  gableShape.lineTo(hw - 0.2, 0);
  gableShape.lineTo(0, ridgeY - eaveY);
  gableShape.closePath();
  const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: 0.24, bevelEnabled: false });
  add(gableGeo, vermilionDark, 0, eaveY, -hd + 0.04);

  // 左右兩側牆裙與外柱列
  for (const sx of [-1, 1]) {
    // 側面下半部牆裙與白牆（讓兩側6幅求職畫卷與繪馬掛架有穩固靠背）
    add(new THREE.BoxGeometry(0.26, eaveY - floorY, D - 0.6), creamPlaster, sx * (hw - 0.14), floorY + (eaveY - floorY) / 2, 0);
    add(new THREE.BoxGeometry(0.32, 1.25, D - 0.4), vermilionDark, sx * (hw - 0.14), floorY + 0.62, 0);
    // 側牆高處橫窗木格柵（透入柔和晨光）
    for (let z = -3.8; z <= 3.8; z += 0.45) {
      add(new THREE.BoxGeometry(0.32, 1.05, 0.05), vermilion, sx * (hw - 0.14), eaveY - 0.95, z);
    }
    // 兩側朱紅大圓柱（外列與內列）
    for (const cz of colZList) {
      add(new THREE.CylinderGeometry(0.24, 0.28, 0.22, 10), whiteStone, sx * colX, floorY + 0.11, cz);
      add(new THREE.CylinderGeometry(0.2, 0.22, eaveY - floorY, 12), vermilion, sx * colX, floorY + (eaveY - floorY) / 2, cz);
      add(new THREE.CylinderGeometry(0.26, 0.22, 0.16, 10), gold, sx * colX, eaveY - 0.1, cz);

      // 內列參道廊柱（支撐彩繪大虹樑與白底紫紋垂幕）
      add(new THREE.CylinderGeometry(0.2, 0.24, 0.18, 10), whiteStone, sx * innerColX, floorY + 0.09, cz);
      add(new THREE.CylinderGeometry(0.16, 0.18, eaveY - floorY + 0.35, 12), vermilion, sx * innerColX, floorY + (eaveY - floorY + 0.35) / 2, cz);
      add(new THREE.CylinderGeometry(0.21, 0.18, 0.14, 10), beamGreen, sx * innerColX, eaveY + 0.18, cz);
    }
    // 縱向貫穿朱紅額枋
    add(new THREE.BoxGeometry(0.28, 0.34, D - 0.4), vermilion, sx * innerColX, eaveY - 0.18, 0);
    add(new THREE.BoxGeometry(0.32, 0.08, D - 0.36), gold, sx * innerColX, eaveY - 0.36, 0);
  }

  // ── 3. 兩側白底紫紋神社垂幕（幕布 maku）與白色閃電狀紙垂（shide）＋繪馬掛架 ──
  const curtainMat = new THREE.MeshStandardMaterial({
    map: shrineCurtainTexture(),
    roughness: 0.75,
    side: THREE.DoubleSide,
  });
  for (const sx of [-1, 1]) {
    for (let bi = 0; bi < colZList.length - 1; bi++) {
      const zMid = (colZList[bi] + colZList[bi + 1]) / 2;
      const bayLen = colZList[bi + 1] - colZList[bi] - 0.28;
      const curtain = new THREE.Mesh(new THREE.PlaneGeometry(bayLen, 0.92), curtainMat);
      curtain.position.set(sx * (innerColX - sx * 0.08), eaveY - 0.68, zMid);
      curtain.rotation.y = -sx * (Math.PI / 2);
      curtain.userData.noMerge = true;
      root.add(curtain);

      // 注連繩與三道白色閃電紙垂（紙垂 shide）
      add(new THREE.CylinderGeometry(0.035, 0.035, bayLen, 6).rotateX(Math.PI / 2), hinokiWood, sx * (innerColX - sx * 0.12), eaveY - 1.16, zMid);
      for (const oz of [-0.58, 0, 0.58]) {
        const shideX = sx * (innerColX - sx * 0.14);
        const shideZ = zMid + oz;
        for (let k = 0; k < 3; k++) {
          const piece = add(new THREE.BoxGeometry(0.02, 0.22, 0.12), shideWhite, shideX, eaveY - 1.28 - k * 0.17, shideZ + (k % 2 ? 0.04 : -0.04));
          piece.rotation.x = (k % 2 ? 1 : -1) * 0.28;
        }
      }
    }

    // 前半段側廊設木造「繪馬掛架」（掛滿祈願合格與良職的五角木繪馬）
    for (const rackZ of [1.15, 3.45]) {
      const rx = sx * (innerColX + sx * 0.22);
      add(new THREE.BoxGeometry(0.14, 1.45, 1.55), hinokiWood, rx, floorY + 1.15, rackZ);
      add(new THREE.BoxGeometry(0.24, 0.12, 1.72), vermilion, rx, floorY + 1.92, rackZ);
      for (let row = 0; row < 3; row++) {
        const ry = floorY + 0.72 + row * 0.38;
        add(new THREE.BoxGeometry(0.06, 0.04, 1.48), vermilionDark, rx, ry + 0.12, rackZ);
        for (let ei = -2; ei <= 2; ei++) {
          add(new THREE.BoxGeometry(0.04, 0.22, 0.18), hinokiWood, rx - sx * 0.05, ry, rackZ + ei * 0.26);
          add(new THREE.BoxGeometry(0.045, 0.05, 0.19), vermilion, rx - sx * 0.05, ry + 0.1, rackZ + ei * 0.26);
        }
      }
    }
  }

  // ── 4. 全朱紅斜頂並列椽條（タルキ）、三道彩繪大虹樑、蟇股（蛙股）與「求職宮」直匾 ──
  const slopeLen = Math.hypot(hw + 0.35, ridgeY - eaveY);
  const slopeAngle = Math.atan2(ridgeY - eaveY, hw + 0.35);

  // 屋頂底板（深朱紅底襯）
  for (const sx of [-1, 1]) {
    const roofBoard = add(
      new THREE.BoxGeometry(slopeLen, 0.08, D + 0.6),
      vermilionDark,
      sx * ((hw + 0.35) / 2),
      (eaveY + ridgeY) / 2 + 0.08,
      0
    );
    roofBoard.rotation.z = -sx * slopeAngle;
  }
  // 密排朱紅斜椽條（19 道並列鮮明朱紅椽木與金色中脊樑）
  add(new THREE.BoxGeometry(0.36, 0.38, D + 0.8), gold, 0, ridgeY + 0.02, 0);
  for (let z = -hd + 0.2; z <= hd - 0.2; z += 0.52) {
    for (const sx of [-1, 1]) {
      const rafter = add(
        new THREE.BoxGeometry(slopeLen, 0.14, 0.14),
        vermilion,
        sx * ((hw + 0.2) / 2),
        (eaveY + ridgeY) / 2 - 0.02,
        z
      );
      rafter.rotation.z = -sx * slopeAngle;
    }
  }
  // 縱向母屋桁（檁條）
  for (const frac of [0.33, 0.66]) {
    for (const sx of [-1, 1]) {
      const px = sx * (hw * frac);
      const py = ridgeY - (ridgeY - eaveY) * frac;
      add(new THREE.BoxGeometry(0.22, 0.24, D + 0.4), vermilion, px, py - 0.08, 0);
      add(new THREE.BoxGeometry(0.24, 0.06, D + 0.42), gold, px, py - 0.21, 0);
    }
  }

  // 三道橫跨大殿的彩繪大虹樑（朱紅樑身＋兩端綠底金邊包角＋中央雕刻蟇股與斗栱）
  const beamW = innerColX * 2 + 0.3;
  for (const bz of [-2.4, 0.4, 3.2]) {
    const by = eaveY + 0.12;
    add(new THREE.BoxGeometry(beamW, 0.42, 0.38), vermilion, 0, by, bz);
    add(new THREE.BoxGeometry(beamW + 0.06, 0.07, 0.42), gold, 0, by - 0.22, bz);
    add(new THREE.BoxGeometry(beamW + 0.06, 0.07, 0.42), gold, 0, by + 0.22, bz);
    // 兩端綠底金框包角（呼應參考圖一橫樑兩端翠綠鑲金裝飾）
    for (const sx of [-1, 1]) {
      add(new THREE.BoxGeometry(1.45, 0.46, 0.42), beamGreen, sx * (innerColX - 0.65), by, bz);
      add(new THREE.BoxGeometry(0.12, 0.48, 0.44), gold, sx * (innerColX - 1.38), by, bz);
      add(new THREE.BoxGeometry(0.12, 0.48, 0.44), gold, sx * (innerColX - 0.05), by, bz);
    }
    // 虹樑上方中央的雕刻蟇股（蛙股 kaerumata）與金色大斗支撐屋脊
    const strutH = ridgeY - by - 0.25;
    add(new THREE.BoxGeometry(1.65, 0.48, 0.28), vermilion, 0, by + 0.46, bz);
    add(new THREE.CylinderGeometry(0.32, 0.56, 0.52, 8), gold, 0, by + 0.52, bz);
    add(new THREE.CylinderGeometry(0.2, 0.22, strutH, 10), vermilion, 0, by + strutH / 2 + 0.2, bz);
    add(new THREE.BoxGeometry(0.58, 0.24, 0.44), gold, 0, ridgeY - 0.26, bz);
    // 左右對稱瓜柱與斗栱
    for (const sx of [-1, 1]) {
      add(new THREE.CylinderGeometry(0.16, 0.18, strutH * 0.52, 8), vermilion, sx * 2.25, by + strutH * 0.26, bz);
      add(new THREE.BoxGeometry(0.46, 0.2, 0.38), beamGreen, sx * 2.25, by + strutH * 0.52, bz);
      add(new THREE.BoxGeometry(0.52, 0.08, 0.42), gold, sx * 2.25, by + strutH * 0.52 + 0.12, bz);
    }
  }

  // 前方大虹樑中央懸掛「求職宮」綠底金框直匾
  const innerPlaqueTex = innerVerticalPlaqueTexture('求職宮');
  add(new THREE.BoxGeometry(1.06, 2.08, 0.14), gold, 0, eaveY + 0.88, 3.36);
  const innerPlaque = new THREE.Mesh(
    new THREE.PlaneGeometry(0.96, 1.96),
    new THREE.MeshStandardMaterial({
      map: innerPlaqueTex,
      emissive: new THREE.Color(0xffe082),
      emissiveMap: innerPlaqueTex,
      emissiveIntensity: 0.28,
      roughness: 0.42,
    })
  );
  innerPlaque.position.set(0, eaveY + 0.88, 3.44);
  innerPlaque.userData.noMerge = true;
  root.add(innerPlaque);

  // ── 5. 後方神龕區橫樑懸掛一排 10 盞白底紅框「御神燈」提燈 ──
  const lanternLabels = ['御神燈', '奉納', '御神燈', '良職', '御神燈', '合格', '御神燈', '祈願', '奉納', '御神燈'];
  add(new THREE.BoxGeometry(beamW, 0.14, 0.14), vermilionDark, 0, eaveY - 0.35, -2.1);
  lanternLabels.forEach((lbl, idx) => {
    const lx = -4.05 + idx * 0.9;
    const ly = eaveY - 0.92;
    const lz = -2.1;
    add(new THREE.CylinderGeometry(0.015, 0.015, 0.32, 6), gold, lx, eaveY - 0.5, lz);
    add(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 12), vermilionDark, lx, ly + 0.36, lz);
    add(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 12), vermilionDark, lx, ly - 0.36, lz);
    const lTex = goshintoLanternTexture(lbl);
    const lMat = new THREE.MeshStandardMaterial({
      map: lTex,
      emissive: new THREE.Color(0xffd685),
      emissiveMap: lTex,
      emissiveIntensity: 0.85,
      roughness: 0.4,
    });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.23, 0.68, 16), lMat);
    body.position.set(lx, ly, lz);
    body.rotation.y = -Math.PI / 2;
    body.userData.noMerge = true;
    root.add(body);
  });

  // ── 6. 參道兩側：長條參拜木椅、右側「賽錢箱＋參拜立牌」、左側「紅色おみくじ靈籤箱＋良緣籤箱」 ──
  for (const sx of [-1, 1]) {
    for (const bz of [-0.6, 1.05]) {
      const bx = sx * 2.55;
      add(new THREE.BoxGeometry(0.56, 0.07, 1.45), hinokiWood, bx, floorY + 0.46, bz);
      add(new THREE.BoxGeometry(0.08, 0.44, 0.12), vermilionDark, bx, floorY + 0.22, bz - 0.56);
      add(new THREE.BoxGeometry(0.08, 0.44, 0.12), vermilionDark, bx, floorY + 0.22, bz + 0.56);
    }
  }

  // 前方右側（x = +2.35, z = +2.85）：大型木格柵「賽錢箱」（鑲金色三巴紋）＋「參拜作法」立牌
  {
    const sx = 2.35;
    const sz = 2.85;
    add(new THREE.BoxGeometry(1.72, 0.16, 1.08), vermilionDark, sx, floorY + 0.08, sz);
    add(new THREE.BoxGeometry(1.58, 1.05, 0.96), hinokiWood, sx, floorY + 0.66, sz);
    // 頂部投幣木格柵與金銅包邊
    add(new THREE.BoxGeometry(1.66, 0.12, 1.04), gold, sx, floorY + 1.2, sz);
    for (let k = -3; k <= 3; k++) {
      add(new THREE.BoxGeometry(0.05, 0.06, 0.84), vermilionDark, sx + k * 0.2, floorY + 1.25, sz);
    }
    const saisenTex = saisenFrontTexture();
    const saisenFront = new THREE.Mesh(
      new THREE.PlaneGeometry(1.54, 1.02),
      new THREE.MeshStandardMaterial({ map: saisenTex, roughness: 0.55 })
    );
    saisenFront.position.set(sx, floorY + 0.66, sz + 0.49);
    saisenFront.userData.noMerge = true;
    root.add(saisenFront);
    // 賽錢箱旁「參拜作法」白底立牌
    const etx = sx + 1.18;
    const etz = sz - 0.15;
    add(new THREE.BoxGeometry(0.46, 0.12, 0.36), vermilionDark, etx, floorY + 0.06, etz);
    add(new THREE.CylinderGeometry(0.04, 0.04, 1.35, 8), hinokiWood, etx, floorY + 0.72, etz);
    add(new THREE.BoxGeometry(0.68, 0.96, 0.08), hinokiWood, etx, floorY + 1.42, etz);
    const etPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.9),
      new THREE.MeshStandardMaterial({ map: etiquetteSignTexture(), roughness: 0.6 })
    );
    etPlane.position.set(etx, floorY + 1.42, etz + 0.046);
    etPlane.userData.noMerge = true;
    root.add(etPlane);
    postCol('saisen-box', sx, sz, 0.85);
    root.add(makePickProxy(1.9, 1.6, 1.3, sx, sz, 0, { kind: 'jobScroll' }, floorY));
  }

  // 前方左側（x = -2.35, z = +2.85）：木案桌＋紅色「求職靈籤（おみくじ）」抽籤箱＋原木良緣籤箱
  {
    const ox = -2.35;
    const oz = 2.85;
    // 鋪白布與木案桌
    add(new THREE.BoxGeometry(1.76, 0.08, 0.98), hinokiWood, ox, floorY + 0.82, oz);
    add(new THREE.BoxGeometry(1.8, 0.24, 1.02), creamPlaster, ox, floorY + 0.74, oz);
    for (const [lx, lz] of [
      [-0.76, -0.38],
      [0.76, -0.38],
      [-0.76, 0.38],
      [0.76, 0.38],
    ]) {
      add(new THREE.BoxGeometry(0.1, 0.78, 0.1), hinokiWood, ox + lx, floorY + 0.39, oz + lz);
    }
    // 右側鮮紅抽籤箱（頂部帶黑色手伸圓孔）
    const rbx = ox + 0.42;
    add(new THREE.BoxGeometry(0.58, 0.82, 0.58), vermilion, rbx, floorY + 1.27, oz);
    add(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 14), new THREE.MeshBasicMaterial({ color: 0x120907 }), rbx, floorY + 1.69, oz);
    const redFace = new THREE.Mesh(
      new THREE.PlaneGeometry(0.54, 0.78),
      new THREE.MeshStandardMaterial({ map: omikujiBoxTexture(true), roughness: 0.48 })
    );
    redFace.position.set(rbx, floorY + 1.27, oz + 0.295);
    redFace.userData.noMerge = true;
    root.add(redFace);

    // 左側原木籤箱
    const wbx = ox - 0.42;
    add(new THREE.BoxGeometry(0.54, 0.72, 0.54), hinokiWood, wbx, floorY + 1.22, oz);
    add(new THREE.BoxGeometry(0.58, 0.06, 0.58), gold, wbx, floorY + 1.59, oz);
    const woodFace = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.68),
      new THREE.MeshStandardMaterial({ map: omikujiBoxTexture(false), roughness: 0.55 })
    );
    woodFace.position.set(wbx, floorY + 1.22, oz + 0.275);
    woodFace.userData.noMerge = true;
    root.add(woodFace);

    postCol('omikuji-table', ox, oz, 0.85);
    root.add(makePickProxy(1.9, 1.8, 1.2, ox, oz, 0, { kind: 'jobScroll' }, floorY));
  }

  // ── 7. 後方神龕區：左側大太鼓、中央朱金神龕供桌、搜搜（Soso）與兩側 6 幅求職畫卷 ──
  // 左後方神社大太鼓（Taiko Drum）
  {
    const tx = -2.65;
    const tz = -2.85;
    add(new THREE.BoxGeometry(0.95, 0.72, 0.85), vermilionDark, tx, floorY + 0.36, tz);
    const drumBody = add(new THREE.CylinderGeometry(0.54, 0.48, 0.82, 18), vermilion, tx, floorY + 1.12, tz);
    drumBody.rotation.x = Math.PI / 2;
    const drumSkin = add(new THREE.CylinderGeometry(0.49, 0.49, 0.84, 18), creamPlaster, tx, floorY + 1.12, tz);
    drumSkin.rotation.x = Math.PI / 2;
    add(new THREE.TorusGeometry(0.48, 0.035, 8, 18), gold, tx, floorY + 1.12, tz + 0.41);
  }

  // 中央後方神龕高台與朱金供桌、御幣（Gohei）與金鏡
  {
    const az = -3.35;
    add(new THREE.BoxGeometry(4.2, 0.36, 2.2), whiteStone, 0, floorY + 0.18, az);
    add(new THREE.BoxGeometry(4.28, 0.06, 2.28), gold, 0, floorY + 0.37, az);
    // 朱紅鎏金神龕供桌
    add(new THREE.BoxGeometry(2.8, 0.92, 1.15), vermilion, 0, floorY + 0.82, az + 0.2);
    add(new THREE.BoxGeometry(3.05, 0.12, 1.28), gold, 0, floorY + 1.32, az + 0.2);
    // 神龕中央神鏡與御幣
    add(new THREE.CylinderGeometry(0.46, 0.46, 0.06, 20).rotateX(Math.PI / 2), gold, 0, floorY + 2.05, az - 0.35);
    add(new THREE.CylinderGeometry(0.06, 0.14, 0.32, 8), vermilionDark, 0, floorY + 1.52, az - 0.35);
    for (const gx of [-0.85, 0.85]) {
      add(new THREE.CylinderGeometry(0.03, 0.04, 0.68, 8), gold, gx, floorY + 1.68, az + 0.15);
      add(new THREE.BoxGeometry(0.24, 0.34, 0.03), shideWhite, gx, floorY + 1.85, az + 0.15);
    }
    postCol('inner-altar', 0, az + 0.2, 1.25);
  }

  // ── 搜搜（Soso）坐鎮於神龕供桌前，兩側內壁懸掛 6 幅求職畫卷（JOB_SCROLLS） ──
  const soso = createSosoNpc();
  soso.position.set(0, floorY + 0.06, -1.65);
  soso.userData.noMerge = true;
  root.add(soso);
  postCol('soso-npc', 0, -1.65, 0.65);

  const scrollFrameGeo = new THREE.BoxGeometry(0.1, 3.05, 2.15);
  const scrollRollerGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.28, 10);
  scrollRollerGeo.rotateX(Math.PI / 2);
  const scrollFaceGeo = new THREE.PlaneGeometry(2.0, 2.8);
  const scrollWallX = innerColX - 0.18;
  for (let i = 0; i < JOB_SCROLLS; i++) {
    const sx = i < 3 ? -1 : 1;
    const row = i % 3;
    const z = -2.4 + row * 2.25;
    const x = sx * scrollWallX;
    const y = floorY + 2.08;
    add(scrollFrameGeo, mats.darkWood, x, y, z);
    add(scrollRollerGeo, gold, x - sx * 0.04, y + 1.56, z);
    add(scrollRollerGeo, gold, x - sx * 0.04, y - 1.56, z);
    const face = new THREE.Mesh(
      scrollFaceGeo,
      new THREE.MeshStandardMaterial({
        map: drawJobScrollTexture(i, [], 'idle', ''),
        roughness: 0.72,
      })
    );
    face.position.set(x - sx * 0.07, y, z);
    face.rotation.y = -sx * (Math.PI / 2);
    face.userData.noMerge = true;
    face.userData.jobScroll = { side: i };
    face.userData.pick = { kind: 'jobScroll' };
    root.add(face);
  }

  // ── 8. 外觀重簷青瓦飛簷屋頂、正門三川門廊、「求職廟」黑底金字大匾與門口石獅 ──
  const lowerRoof = buildRoofTier(W + 1.8, D + 1.6, {
    rise: 1.65,
    overhang: 0.92,
    curl: 0.56,
    theme: 'slate',
    ridge: false,
  });
  lowerRoof.position.set(0, eaveY + 0.15, 0);
  lowerRoof.traverse((o) => {
    o.userData.noMerge = true;
  });
  root.add(lowerRoof);

  const upperRoof = buildRoofTier(W * 0.82, D * 0.82, {
    rise: 1.85,
    overhang: 0.78,
    curl: 0.62,
    theme: 'slate',
    ridge: true,
    finial: true,
  });
  upperRoof.position.set(0, ridgeY - 0.55, 0);
  upperRoof.traverse((o) => {
    o.userData.noMerge = true;
  });
  root.add(upperRoof);

  // 正門前伸門廊、白石台階與石獅
  const porchZ = hd + 1.45;
  add(new THREE.BoxGeometry(5.6, floorY, 2.5), whiteStone, 0, floorY / 2, porchZ);
  for (let s = 0; s < 3; s++) {
    const stepW = 4.2 + s * 0.28;
    const stepZ = porchZ + 1.38 + s * 0.34;
    add(new THREE.BoxGeometry(stepW, 0.16, 0.36), whiteStone, 0, floorY - 0.08 - s * 0.14, stepZ);
  }
  for (const px of [-2.35, 2.35]) {
    const pz = porchZ + 0.95;
    add(new THREE.CylinderGeometry(0.24, 0.28, 0.22, 8), whiteStone, px, floorY + 0.11, pz);
    add(new THREE.CylinderGeometry(0.17, 0.2, 4.45, 10), vermilion, px, floorY + 2.32, pz);
    add(new THREE.CylinderGeometry(0.23, 0.2, 0.15, 8), gold, px, floorY + 4.58, pz);
    postCol(`porch-post-${px}`, px, pz, 0.32);
  }
  add(new THREE.BoxGeometry(5.2, 0.32, 0.32), vermilion, 0, floorY + 4.48, porchZ + 0.95);
  add(new THREE.BoxGeometry(5.26, 0.08, 0.36), gold, 0, floorY + 4.28, porchZ + 0.95);

  const porchRoof = buildRoofTier(6.2, 3.2, {
    rise: 1.28,
    overhang: 0.68,
    curl: 0.5,
    theme: 'slate',
    ridge: true,
  });
  porchRoof.position.set(0, floorY + 4.72, porchZ + 0.15);
  porchRoof.traverse((o) => {
    o.userData.noMerge = true;
  });
  root.add(porchRoof);

  // 「求職廟」外門黑底金字額匾
  const outerPlaqueTex = outerPlaqueTexture(b.name);
  const plaqueFrame = add(new THREE.BoxGeometry(2.56, 0.94, 0.14), gold, 0, floorY + 5.25, porchZ + 1.22);
  plaqueFrame.rotation.x = 0.08;
  const outerPlaque = new THREE.Mesh(
    new THREE.PlaneGeometry(2.42, 0.84),
    new THREE.MeshStandardMaterial({
      map: outerPlaqueTex,
      emissive: new THREE.Color(0xffd275),
      emissiveMap: outerPlaqueTex,
      emissiveIntensity: 0.32,
      roughness: 0.45,
    })
  );
  outerPlaque.position.set(0, floorY + 5.25, porchZ + 1.3);
  outerPlaque.rotation.x = 0.08;
  outerPlaque.userData.noMerge = true;
  root.add(outerPlaque);

  // 門廊簷下暖光宮燈
  for (const lx of [-1.72, 1.72]) {
    const lz = porchZ + 0.95;
    add(new THREE.CylinderGeometry(0.015, 0.015, 0.48, 5), mats.darkWood, lx, floorY + 4.18, lz);
    const lantern = add(new THREE.SphereGeometry(0.28, 12, 10), mats.lanternBody, lx, floorY + 3.72, lz);
    lantern.scale.set(0.82, 1.32, 0.82);
    lantern.userData.noMerge = true;
    add(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 8), gold, lx, floorY + 4.08, lz);
    add(new THREE.CylinderGeometry(0.12, 0.12, 0.07, 8), gold, lx, floorY + 3.36, lz);
  }

  // 台階兩側石獅（保留石獅彩蛋與動態）與矮石燈
  for (const side of [-1, 1]) {
    const lz = porchZ + 2.15;
    const lion = new THREE.Group();
    lion.position.set(side * 2.75, 0, lz);
    lion.rotation.y = side * 0.22;
    lion.userData.noMerge = true;
    root.add(lion);
    const pose = new THREE.Group();
    pose.userData.noMerge = true;
    pose.userData.modelAsset = 'stoneLion';
    pose.userData.modelSize = [1.3, 2.0, 1.5];
    lion.add(pose);
    void loadModelInto(pose, 'stoneLion');
    const lionPick = makePickProxy(1.5, 2.2, 1.6, 0, 0.95, 0, { kind: 'egg', egg: 'stoneLion', maxDist: 28 });
    lionPick.userData.keepOnModelSwap = true;
    pose.add(lionPick);
    lion.userData.tick = (t: number) => {
      const phase = (t + (side < 0 ? 0 : 10.5)) % 27;
      let stretch = 0;
      if (phase >= 17 && phase < 19.2) stretch = (phase - 17) / 2.2;
      else if (phase >= 19.2 && phase < 20.7) stretch = 1;
      else if (phase >= 20.7 && phase < 23.1) stretch = 1 - (phase - 20.7) / 2.4;
      stretch = THREE.MathUtils.smoothstep(stretch, 0, 1);
      pose.position.y = stretch * 0.22;
      pose.rotation.x = stretch * 0.11;
      pose.scale.y = 1 + stretch * 0.04;
    };
    postCol(`stone-lion-${side}`, side * 2.75, lz, 0.65);

    const lampX = side * 2.15;
    const lampZ = lz + 0.55;
    add(new THREE.CylinderGeometry(0.18, 0.22, 0.22, 6), carvedStone, lampX, 0.11, lampZ);
    add(new THREE.CylinderGeometry(0.1, 0.12, 0.34, 6), whiteStone, lampX, 0.38, lampZ);
    const lampCore = add(new THREE.BoxGeometry(0.22, 0.24, 0.22), warmGlow, lampX, 0.66, lampZ);
    lampCore.userData.noMerge = true;
    add(new THREE.ConeGeometry(0.28, 0.2, 6), carvedStone, lampX, 0.88, lampZ);
  }

  // ── 9. 牆體碰撞（後牆、左右側牆、前門兩翼，留出正中央 4.6m 寬敞參道） ──
  segCol('wall-back', -hw, -hd, hw, -hd, 0.32);
  segCol('wall-left', -hw, -hd, -hw, hd, 0.32);
  segCol('wall-right', hw, -hd, hw, hd, 0.32);
  segCol('wall-front-l', -hw, hd, -2.35, hd, 0.3);
  segCol('wall-front-r', 2.35, hd, hw, hd, 0.3);

  mergeByMaterial(stat);
  root.updateMatrixWorld(true);
  return { group: root, colliders };
}
