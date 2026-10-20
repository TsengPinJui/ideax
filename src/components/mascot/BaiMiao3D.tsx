import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export type BaiMiaoPose =
  | 'stand_smile'          // 基礎站立開心微笑（參考圖左1：純白無黑框、黃色耳朵、黑色鬍鬚、黃色項圈、金色鈴鐺）
  | 'wave_hi_right'        // 首頁專區右端：單腳離地、單手舉高嗨！另一手水平平衡（參考圖左2）
  | 'wave_hi_left'         // 首頁專區左端：單腳離地、單手舉高嗨！另一手水平平衡（參考圖左2）
  | 'walk_right'           // 首頁專區邊框：開心地由左慢慢走到右邊
  | 'walk_left'            // 首頁專區邊框：開心地由右慢慢走回左邊
  | 'card_shuttle'         // 提案編輯頁面：在各個字卡模組間穿梭
  | 'headhunter_telescope' // 付費獵頭：雙手舉起雙筒望遠鏡看（參考圖左3）
  | 'chat_mediator'        // 調解聊天室：坐下戴深色圓框眼鏡、拿紙筆書寫（參考圖左4）
  | 'report_magnifier'     // 付費報告：趴在地上單手拿金色放大鏡看（參考圖左5）
  | 'idle_nap'             // 中間位置：側躺閉眼小睡（參考圖左6）
  | 'deep_sleep'           // 閒置過久：在中間躺平呼呼大睡（參考圖右7：趴平熟睡 + Zzz）
  | 'laptop_work';         // 市場顧問分析：拿著貼有燈泡貼紙的筆電工作

export interface BaiMiao3DProps {
  pose?: BaiMiaoPose;
  size?: number;
  width?: number;
  height?: number;
  interactiveRotate?: boolean;
  autoTurntable?: boolean;
  className?: string;
  onClick?: () => void;
}

type EyeMode = 'open' | 'blink' | 'squint' | 'sleep';
type MouthMode = 'smile_open' | 'calm_w';

// ==================== 全域共享幾何與材質快取 ====================
let cachedHeadGeo: THREE.BufferGeometry | null = null;
let cachedFaceGeo: THREE.BufferGeometry | null = null;

/**
 * 依據 3D 參考圖（baimiao-3d-poses.png）打造無黑框、圓潤飽滿、臉頰下緣微澎的純白 3D 麻糬貓頭
 */
function getSharedMochiCatHeadGeometry(applyFrontFaceUV: boolean): THREE.BufferGeometry {
  if (applyFrontFaceUV && cachedFaceGeo) return cachedFaceGeo;
  if (!applyFrontFaceUV && cachedHeadGeo) return cachedHeadGeo;

  const radius = 1.0;
  const geo = new THREE.SphereGeometry(radius, 44, 34);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const ny = v.y / radius;

    let sx = 1.05;
    let sy = 1.0;
    let sz = 1.0;

    // 3D 參考圖招牌「澎澎腮幫子」（黃金圓潤比例，不橫向拉寬）
    const cheekBulge = Math.exp(-Math.pow((ny + 0.16) / 0.38, 2));
    sx += 0.08 * cheekBulge;
    sz += 0.04 * cheekBulge;

    if (ny > 0.26) {
      const topTaper = Math.min(1, (ny - 0.26) / 0.74);
      sx -= 0.05 * topTaper;
      sz -= 0.03 * topTaper;
    }

    if (ny < -0.42) {
      const chinFlat = Math.min(1, (-0.42 - ny) / 0.58);
      sy -= 0.07 * chinFlat;
    }

    v.x *= sx;
    v.y *= sy;
    v.z *= sz;
    pos.setXYZ(i, v.x, v.y, v.z);

    if (applyFrontFaceUV) {
      if (v.z > 0.15) {
        const u = 0.5 + v.x / (2.1 * radius);
        const vt = 0.52 + v.y / (1.8 * radius);
        uv.setXY(i, Math.max(0.01, Math.min(0.99, u)), Math.max(0.01, Math.min(0.99, vt)));
      } else {
        uv.setXY(i, 0.0, 0.0);
      }
    }
  }

  geo.computeVertexNormals();
  if (applyFrontFaceUV) {
    cachedFaceGeo = geo;
  } else {
    cachedHeadGeo = geo;
  }
  return geo;
}

const faceTextureCache = new Map<string, THREE.CanvasTexture>();

function getSharedFaceTexture(eyeMode: EyeMode, mouthMode: MouthMode): THREE.CanvasTexture {
  const key = `${eyeMode}_${mouthMode}`;
  const existing = faceTextureCache.get(key);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.save();
    ctx.scale(0.5, 0.5);
    drawBaiMiaoFaceTexture(ctx, eyeMode, mouthMode);
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  faceTextureCache.set(key, tex);
  return tex;
}

/**
 * 完美還原 3D 參考圖（baimiao-3d-poses.png）五官：
 * - 圓潤深棕大眼＋高光（或開心 `< >` 笑眼、閉眼 `︶ ︶`）
 * - 柔和無斜線粉嫩腮紅暈染
 * - 粉色小貓鼻＋開朗笑口 / ω 嘴
 */
function drawBaiMiaoFaceTexture(
  ctx: CanvasRenderingContext2D,
  eyeMode: EyeMode,
  mouthMode: MouthMode
) {
  const W = 1024;
  const H = 1024;
  ctx.clearRect(0, 0, W, H);

  const lineDark = '#2b1810';

  // 1. 柔和粉嫩腮紅暈染（3D 參考圖為無斜線的柔光粉暈）
  const drawSoftBlush = (cx: number, cy: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    const grad = ctx.createRadialGradient(0, 0, 6, 0, 0, 76);
    grad.addColorStop(0, 'rgba(251, 164, 164, 0.68)');
    grad.addColorStop(0.55, 'rgba(251, 164, 164, 0.32)');
    grad.addColorStop(1, 'rgba(251, 164, 164, 0)');
    ctx.fillStyle = grad;
    ctx.scale(1.35, 0.88);
    ctx.beginPath();
    ctx.arc(0, 0, 74, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawSoftBlush(335, 550);
  drawSoftBlush(689, 550);

  // 2. 左右眼睛（對齊 3D 參考圖：open 圓亮深棕眼、squint `< >` 開心笑眼、sleep `︶ ︶` 閉眼）
  const drawEye = (cx: number, cy: number, isLeft: boolean) => {
    ctx.save();
    ctx.translate(cx, cy);

    if (eyeMode === 'open') {
      ctx.fillStyle = lineDark;
      ctx.beginPath();
      ctx.ellipse(0, 0, 52, 58, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#783f1d';
      ctx.beginPath();
      ctx.ellipse(3, 20, 30, 20, 0, 0, Math.PI);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-15, -18, 17, 19, -0.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(17, 17, 8.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (eyeMode === 'blink') {
      ctx.strokeStyle = lineDark;
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-48, 4);
      ctx.quadraticCurveTo(0, 18, 48, 4);
      ctx.stroke();
    } else if (eyeMode === 'squint') {
      // 3D 參考圖左2：揮手嗨時的 `<` `>` 開心笑眼
      ctx.strokeStyle = lineDark;
      ctx.lineWidth = 15;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const dir = isLeft ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(-42 * dir, -28);
      ctx.lineTo(34 * dir, 2);
      ctx.lineTo(-42 * dir, 32);
      ctx.stroke();
    } else if (eyeMode === 'sleep') {
      // 3D 參考圖左6 & 右7：閉眼睡覺的柔和下彎弧線
      ctx.strokeStyle = lineDark;
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-48, -2);
      ctx.quadraticCurveTo(0, 38, 48, -2);
      ctx.stroke();
    }

    ctx.restore();
  };

  drawEye(385, 482, true);
  drawEye(639, 482, false);

  // 3. 粉嫩小貓鼻（3D 參考圖中為粉紅小倒三角鼻）
  ctx.save();
  ctx.fillStyle = '#e07a7a';
  ctx.beginPath();
  ctx.moveTo(512 - 18, 526);
  ctx.quadraticCurveTo(512, 520, 512 + 18, 526);
  ctx.quadraticCurveTo(512 + 10, 544, 512, 548);
  ctx.quadraticCurveTo(512 - 10, 544, 512 - 18, 526);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 4. 嘴巴（smile_open 開心張口笑 vs calm_w 精緻 ω 貓嘴）
  ctx.save();
  ctx.strokeStyle = lineDark;
  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (mouthMode === 'smile_open') {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(458, 564);
    ctx.quadraticCurveTo(485, 580, 512, 556);
    ctx.quadraticCurveTo(539, 580, 566, 564);
    ctx.bezierCurveTo(570, 636, 546, 664, 512, 664);
    ctx.bezierCurveTo(478, 664, 454, 636, 458, 564);
    ctx.closePath();
    ctx.fillStyle = '#c84b58';
    ctx.fill();
    ctx.clip();

    ctx.fillStyle = '#ff9aa2';
    ctx.beginPath();
    ctx.ellipse(512, 642, 48, 38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(458, 564);
    ctx.bezierCurveTo(454, 636, 478, 664, 512, 664);
    ctx.bezierCurveTo(546, 664, 570, 636, 566, 564);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(450, 560);
    ctx.quadraticCurveTo(482, 584, 512, 554);
    ctx.quadraticCurveTo(542, 584, 574, 560);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(460, 566);
    ctx.quadraticCurveTo(486, 590, 512, 558);
    ctx.quadraticCurveTo(538, 590, 564, 566);
    ctx.stroke();
  }

  ctx.restore();
}

function addPinkPawPads(
  parent: THREE.Group,
  padMat: THREE.Material,
  centerY: number,
  centerZ: number,
  facingRotationX: number,
  scale = 1.0
) {
  const padGroup = new THREE.Group();
  padGroup.position.set(0, centerY, centerZ);
  padGroup.rotation.x = facingRotationX;
  padGroup.scale.setScalar(scale);

  const mainBean = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 10), padMat);
  mainBean.scale.set(1.2, 0.95, 0.45);
  mainBean.position.set(0, -0.015, 0);
  padGroup.add(mainBean);

  const toePositions = [
    [-0.056, 0.05, 0.008],
    [0, 0.066, 0.012],
    [0.056, 0.05, 0.008],
  ];
  toePositions.forEach(([tx, ty, tz]) => {
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.031, 10, 8), padMat);
    toe.scale.set(0.95, 1.15, 0.45);
    toe.position.set(tx, ty, tz);
    padGroup.add(toe);
  });

  parent.add(padGroup);
}

const RENDER_RESOLUTION = 256;
let sharedRenderer: THREE.WebGLRenderer | null = null;

function getSharedWebGLRenderer(): THREE.WebGLRenderer | null {
  if (typeof window === 'undefined') return null;
  if (!sharedRenderer) {
    try {
      sharedRenderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      sharedRenderer.setPixelRatio(1);
      sharedRenderer.setSize(RENDER_RESOLUTION, RENDER_RESOLUTION, false);
      sharedRenderer.outputColorSpace = THREE.SRGBColorSpace;
      sharedRenderer.toneMapping = THREE.NoToneMapping;
    } catch {
      return null;
    }
  }
  return sharedRenderer;
}

export const BaiMiao3D: React.FC<BaiMiao3DProps> = ({
  pose = 'stand_smile',
  size = 78,
  width,
  height,
  interactiveRotate = false,
  autoTurntable = false,
  className = '',
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const poseRef = useRef<BaiMiaoPose>(pose);
  poseRef.current = pose;

  const w = width || size;
  const h = height || size;

  useEffect(() => {
    const displayCanvas = canvasRef.current;
    if (!displayCanvas) return;

    const renderer = getSharedWebGLRenderer();
    if (!renderer) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    displayCanvas.width = Math.round(w * dpr);
    displayCanvas.height = Math.round(h * dpr);
    const displayCtx = displayCanvas.getContext('2d');
    if (!displayCtx) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.18, 6.1);
    camera.lookAt(0, 0.06, 0);

    // ==================== 3D 參考圖專屬棚拍柔光（無黑邊、溫潤奶白立體陰影，手腳與身體分明且永不變黑！） ====================
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xd6cfc2, 1.55);
    hemiLight.position.set(0, 5, 2);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffdf9, 1.15);
    keyLight.position.set(2.6, 4.2, 5.2);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xfffbeb, 0.55);
    fillLight.position.set(-3.2, 1.5, 3.0);
    scene.add(fillLight);

    // ==================== 材質設定（完全對齊 baimiao-3d-poses.png） ====================
    // 1. 純白柔霧 3D 陶瓷絨毛材質（不加黑框，靠光影呈現圓潤立體感）
    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfffaf0,
      emissiveIntensity: 0.28,
      roughness: 0.72,
      metalness: 0.02,
    });

    // 2. 耳朵黃色（對齊參考圖與用戶要求：雙耳奶油金黃色）
    const earYellowMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xfacc15,
      emissiveIntensity: 0.26,
      roughness: 0.62,
      metalness: 0.02,
    });

    // 內耳淺鵝黃材質
    const innerEarCreamMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfef9c3,
      emissiveIntensity: 0.35,
      roughness: 0.7,
      metalness: 0.0,
    });

    // 3. 黃色項圈（圓潤鮮明金黃色項圈）
    const collarYellowMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xeab308,
      emissiveIntensity: 0.24,
      roughness: 0.45,
      metalness: 0.08,
    });

    // 4. 金色鈴鐺（金屬光澤黃金鈴鐺 + 深棕鈴鐺孔與一字縫）
    const goldBellMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.28,
      roughness: 0.22,
      metalness: 0.78,
    });
    const bellSlitMat = new THREE.MeshBasicMaterial({
      color: 0x2b1810,
    });

    // 5. 黑色鬍鬚（對齊參考圖：左右臉頰各三根俐落黑色/深棕細鬍鬚）
    const whiskerBlackMat = new THREE.MeshBasicMaterial({
      color: 0x1f120b,
    });

    // 6. 粉嫩肉球材質
    const pawPinkMat = new THREE.MeshStandardMaterial({
      color: 0xf9a8b8,
      emissive: 0xf472b6,
      emissiveIntensity: 0.22,
      roughness: 0.65,
      metalness: 0.0,
    });

    // 7. 道具材質（雙筒望遠鏡、深藍黑圓框眼鏡、記事本與鉛筆、金色放大鏡）
    const darkNavyMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.3,
    });
    const lensGlassMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      emissive: 0x475569,
      emissiveIntensity: 0.25,
      roughness: 0.15,
      metalness: 0.6,
    });
    const woodHandleMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.6,
      metalness: 0.1,
    });

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // 底部柔和落地陰影
    const shadowMesh = new THREE.Mesh(
      new THREE.CircleGeometry(1.05, 28),
      new THREE.MeshBasicMaterial({
        color: 0x3b2818,
        transparent: true,
        opacity: 0.12,
      })
    );
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -1.32;
    shadowMesh.scale.set(1.18, 0.65, 1);
    scene.add(shadowMesh);

    const catGroup = new THREE.Group();
    rootGroup.add(catGroup);

    // ==================== 1. 頭部（純白澎澎臉＋黃色耳朵＋黑色鬍鬚，完全無黑邊） ====================
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.52, 0);
    catGroup.add(headGroup);

    const headGeo = getSharedMochiCatHeadGeometry(false);
    const headMesh = new THREE.Mesh(headGeo, whiteMat);
    headGroup.add(headMesh);

    let currentEyeMode: EyeMode = 'open';
    let currentMouthMode: MouthMode = 'smile_open';

    const faceOverlayGeo = getSharedMochiCatHeadGeometry(true);
    const faceOverlayMat = new THREE.MeshBasicMaterial({
      map: getSharedFaceTexture(currentEyeMode, currentMouthMode),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const faceOverlayMesh = new THREE.Mesh(faceOverlayGeo, faceOverlayMat);
    faceOverlayMesh.scale.setScalar(1.008);
    headGroup.add(faceOverlayMesh);

    // 左右黃色貓耳（對齊 3D 參考圖：黃色耳朵＋淺鵝黃內耳）
    const createYellowCatEar = (isLeft: boolean) => {
      const sign = isLeft ? -1 : 1;
      const earPivot = new THREE.Group();
      earPivot.position.set(sign * 0.58, 0.74, -0.02);
      earPivot.rotation.z = -sign * 0.30;
      earPivot.rotation.x = 0.05;
      earPivot.rotation.y = sign * 0.10;

      const earConeGeo = new THREE.ConeGeometry(0.38, 0.68, 24);
      earConeGeo.scale(1.0, 1.0, 0.55);

      const earBase = new THREE.Mesh(earConeGeo, earYellowMat);
      earBase.position.y = 0.22;
      earPivot.add(earBase);

      const innerEarGeo = new THREE.ConeGeometry(0.24, 0.44, 18);
      innerEarGeo.scale(0.95, 1.0, 0.36);
      const innerEar = new THREE.Mesh(innerEarGeo, innerEarCreamMat);
      innerEar.position.set(0, 0.19, 0.10);
      earPivot.add(innerEar);

      return earPivot;
    };

    const leftEar = createYellowCatEar(true);
    const rightEar = createYellowCatEar(false);
    headGroup.add(leftEar, rightEar);

    // 左右臉頰各三根黑色鬍鬚（對齊 3D 參考圖！）
    const createWhiskersSide = (isLeft: boolean) => {
      const sign = isLeft ? -1 : 1;
      const sideGroup = new THREE.Group();
      // 位於圓潤腮幫子外側
      sideGroup.position.set(sign * 0.94, -0.14, 0.44);

      const angles = [0.15, 0.0, -0.15];
      angles.forEach((ang, idx) => {
        const whiskerGeo = new THREE.CylinderGeometry(0.012, 0.010, 0.38, 8);
        whiskerGeo.rotateZ(Math.PI / 2);
        const wMesh = new THREE.Mesh(whiskerGeo, whiskerBlackMat);
        wMesh.position.set(sign * 0.12, (1 - idx) * 0.075, 0);
        wMesh.rotation.z = sign * ang;
        wMesh.rotation.y = -sign * 0.18;
        sideGroup.add(wMesh);
      });

      return sideGroup;
    };

    const leftWhiskers = createWhiskersSide(true);
    const rightWhiskers = createWhiskersSide(false);
    headGroup.add(leftWhiskers, rightWhiskers);

    // ==================== 2. 圓潤純白身體 + 黃色項圈 + 金色鈴鐺 ====================
    const bodyGroup = new THREE.Group();
    bodyGroup.position.set(0, -0.46, 0);
    catGroup.add(bodyGroup);

    const torsoGeo = new THREE.SphereGeometry(0.64, 28, 22);
    torsoGeo.scale(0.96, 1.04, 0.92);
    const torsoMesh = new THREE.Mesh(torsoGeo, whiteMat);
    bodyGroup.add(torsoMesh);

    // 黃色項圈（對齊 3D 參考圖：飽滿平滑的黃色圓環項圈）
    const collarGroup = new THREE.Group();
    collarGroup.position.set(0, 0.34, 0.04);
    collarGroup.rotation.x = Math.PI / 2 + 0.08;
    bodyGroup.add(collarGroup);

    const collarTorusGeo = new THREE.TorusGeometry(0.50, 0.095, 16, 32);
    const collarTorus = new THREE.Mesh(collarTorusGeo, collarYellowMat);
    collarTorus.scale.set(1.08, 0.96, 1.0);
    collarGroup.add(collarTorus);

    // 金色鈴鐺（對齊 3D 參考圖：掛在黃色項圈正前方的立體金屬鈴鐺＋環帶與中縫）
    const bellGroup = new THREE.Group();
    bellGroup.position.set(0, 0.18, 0.58);
    bodyGroup.add(bellGroup);

    const bellSphereGeo = new THREE.SphereGeometry(0.135, 18, 16);
    const bellSphere = new THREE.Mesh(bellSphereGeo, goldBellMat);
    bellGroup.add(bellSphere);

    const bellRimGeo = new THREE.TorusGeometry(0.132, 0.020, 10, 24);
    const bellRim = new THREE.Mesh(bellRimGeo, goldBellMat);
    bellRim.rotation.x = Math.PI / 2;
    bellRim.position.y = 0.02;
    bellGroup.add(bellRim);

    const bellHole = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), bellSlitMat);
    bellHole.position.set(0, -0.045, 0.118);
    bellGroup.add(bellHole);

    const bellSlit = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.08, 0.05), bellSlitMat);
    bellSlit.position.set(0, -0.08, 0.10);
    bellGroup.add(bellSlit);

    // ==================== 3. 立體雙手與雙腳 + 粉嫩肉球 ====================
    const armGeo = new THREE.CapsuleGeometry(0.145, 0.40, 14, 18);

    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.50, -0.14, 0.16);
    catGroup.add(leftArmPivot);

    const leftArmMesh = new THREE.Mesh(armGeo, whiteMat);
    leftArmMesh.position.y = -0.20;
    leftArmPivot.add(leftArmMesh);
    addPinkPawPads(leftArmPivot, pawPinkMat, -0.37, 0.14, -0.14, 1.0);

    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.50, -0.14, 0.16);
    catGroup.add(rightArmPivot);

    const rightArmMesh = new THREE.Mesh(armGeo, whiteMat);
    rightArmMesh.position.y = -0.20;
    rightArmPivot.add(rightArmMesh);
    addPinkPawPads(rightArmPivot, pawPinkMat, -0.39, 0.15, -0.15, 1.05);

    const legGeo = new THREE.CapsuleGeometry(0.185, 0.32, 14, 18);

    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.34, -0.94, 0.08);
    catGroup.add(leftLegPivot);

    const leftLegMesh = new THREE.Mesh(legGeo, whiteMat);
    leftLegMesh.position.y = -0.15;
    leftLegPivot.add(leftLegMesh);
    addPinkPawPads(leftLegPivot, pawPinkMat, -0.32, 0.12, Math.PI / 2 - 0.35, 1.12);

    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.34, -0.94, 0.08);
    catGroup.add(rightLegPivot);

    const rightLegMesh = new THREE.Mesh(legGeo, whiteMat);
    rightLegMesh.position.y = -0.15;
    rightLegPivot.add(rightLegMesh);
    addPinkPawPads(rightLegPivot, pawPinkMat, -0.32, 0.12, Math.PI / 2 - 0.35, 1.12);

    // ==================== 4. 優雅彎曲長貓尾（純白帶淡黃尾尖） ====================
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0.38, -0.78, -0.36);
    catGroup.add(tailPivot);

    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.46, 0.16, -0.1),
      new THREE.Vector3(0.76, 0.62, 0.0),
      new THREE.Vector3(0.58, 1.05, 0.08),
    ]);
    const tailTubeGeo = new THREE.TubeGeometry(tailCurve, 20, 0.125, 12, false);
    const tailMesh = new THREE.Mesh(tailTubeGeo, whiteMat);
    tailPivot.add(tailMesh);

    const tailTipGeo = new THREE.SphereGeometry(0.135, 12, 10);
    const tailTip = new THREE.Mesh(tailTipGeo, earYellowMat);
    tailTip.position.set(0.58, 1.05, 0.08);
    tailPivot.add(tailTip);

    // ==================== 5. 3D 參考圖專屬道具組 ====================
    // 5a. 雙筒望遠鏡（參考圖左3：黑金配色雙筒望遠鏡）
    const binocularsGroup = new THREE.Group();
    [-0.22, 0.22].forEach((bx) => {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.42, 16), darkNavyMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(bx, 0, 0);
      binocularsGroup.add(barrel);

      const goldRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 10, 20), goldBellMat);
      goldRing.position.set(bx, 0, 0.21);
      binocularsGroup.add(goldRing);

      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), lensGlassMat);
      lens.position.set(bx, 0, 0.22);
      binocularsGroup.add(lens);
    });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.15), goldBellMat);
    binocularsGroup.add(bridge);
    binocularsGroup.position.set(0, 0.02, 1.18);
    binocularsGroup.visible = false;
    headGroup.add(binocularsGroup);

    // 5b. 調解員圓框眼鏡 + 記事本與鉛筆（參考圖左4）
    const glassesGroup = new THREE.Group();
    [-0.34, 0.34].forEach((gx) => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.028, 10, 24), darkNavyMat);
      rim.position.set(gx, -0.02, 1.06);
      glassesGroup.add(rim);
    });
    const glassBridge = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 8), darkNavyMat);
    glassBridge.rotation.z = Math.PI / 2;
    glassBridge.position.set(0, -0.02, 1.06);
    glassesGroup.add(glassBridge);
    glassesGroup.visible = false;
    headGroup.add(glassesGroup);

    const notepadGroup = new THREE.Group();
    const padBase = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.54, 0.04), collarYellowMat);
    const padPaper = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.045), whiteMat);
    padPaper.position.z = 0.01;
    notepadGroup.add(padBase, padPaper);
    notepadGroup.position.set(-0.06, -0.82, 0.72);
    notepadGroup.rotation.x = -0.55;
    notepadGroup.visible = false;
    catGroup.add(notepadGroup);

    const pencilGroup = new THREE.Group();
    const pencilShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.58, 10), collarYellowMat);
    const pencilTip = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.1, 10), woodHandleMat);
    pencilTip.rotation.x = Math.PI;
    pencilTip.position.y = -0.34;
    pencilGroup.add(pencilShaft, pencilTip);
    pencilGroup.position.set(0, -0.36, 0.22);
    pencilGroup.rotation.x = 0.35;
    pencilGroup.visible = false;
    rightArmPivot.add(pencilGroup);

    // 5c. 金色放大鏡（參考圖左5）
    const magnifierGroup = new THREE.Group();
    const magFrame = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.042, 12, 24), goldBellMat);
    const magLens = new THREE.Mesh(new THREE.CircleGeometry(0.26, 20), lensGlassMat);
    const magHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.42, 10), woodHandleMat);
    magHandle.position.set(0.24, -0.26, 0);
    magHandle.rotation.z = Math.PI / 4;
    magnifierGroup.add(magFrame, magLens, magHandle);
    magnifierGroup.position.set(-0.38, -0.92, 0.95);
    magnifierGroup.rotation.set(-0.35, 0.25, -0.2);
    magnifierGroup.visible = false;
    catGroup.add(magnifierGroup);

    // ==================== 6. 30fps 節流渲染迴圈 ====================
    let animFrameId: number;
    const startTime = performance.now();
    let lastRenderTime = 0;

    const animate = (now: number) => {
      animFrameId = requestAnimationFrame(animate);
      if (now - lastRenderTime < 33) return;
      lastRenderTime = now;

      const elapsed = (now - startTime) * 0.001;
      const activePose = poseRef.current;

      const isBlinkingNow = elapsed % 3.8 > 3.64;
      let targetEye: EyeMode = isBlinkingNow ? 'blink' : 'open';
      let targetMouth: MouthMode = 'smile_open';

      if (activePose === 'idle_nap' || activePose === 'deep_sleep') {
        targetEye = 'sleep';
        targetMouth = 'calm_w';
      } else if (activePose === 'wave_hi_right' || activePose === 'wave_hi_left') {
        // 3D 參考圖左2：揮手嗨時呈現 `< >` 開心笑眼 + 張口笑
        targetEye = 'squint';
        targetMouth = 'smile_open';
      } else if (
        activePose === 'headhunter_telescope' ||
        activePose === 'chat_mediator' ||
        activePose === 'report_magnifier'
      ) {
        targetMouth = 'calm_w';
      }

      if (targetEye !== currentEyeMode || targetMouth !== currentMouthMode) {
        currentEyeMode = targetEye;
        currentMouthMode = targetMouth;
        faceOverlayMat.map = getSharedFaceTexture(currentEyeMode, currentMouthMode);
        faceOverlayMat.needsUpdate = true;
      }

      // 重設基礎變換（對齊參考圖左1：微側身自然站立、手腳與身體分明）
      catGroup.position.set(0, 0, 0);
      catGroup.rotation.set(0, -0.18, 0);
      headGroup.position.set(0, 0.52, 0);
      headGroup.rotation.set(0, 0.12, 0);
      bodyGroup.position.set(0, -0.46, 0);
      bodyGroup.rotation.set(0, 0, 0);
      bodyGroup.visible = true;
      leftArmPivot.visible = true;
      rightArmPivot.visible = true;
      leftLegPivot.visible = true;
      rightLegPivot.visible = true;

      leftArmPivot.position.set(-0.6, -0.14, 0.18);
      leftArmPivot.rotation.set(0.15, 0, -0.42);
      rightArmPivot.position.set(0.6, -0.14, 0.18);
      rightArmPivot.rotation.set(0.22, 0, 0.42);

      leftLegPivot.position.set(-0.32, -0.94, 0.08);
      leftLegPivot.rotation.set(0, 0, -0.05);
      rightLegPivot.position.set(0.32, -0.94, 0.08);
      rightLegPivot.rotation.set(0, 0, 0.05);

      tailPivot.position.set(0.38, -0.78, -0.36);
      tailPivot.rotation.set(0, 0, Math.sin(elapsed * 3.2) * 0.16);

      binocularsGroup.visible = false;
      glassesGroup.visible = false;
      notepadGroup.visible = false;
      pencilGroup.visible = false;
      magnifierGroup.visible = false;

      if (activePose === 'wave_hi_right' || activePose === 'wave_hi_left') {
        // 對齊 3D 參考圖左2：一隻手高舉歡呼、另一隻手水平往側邊伸平平衡、雙腳微開跳躍露出粉嫩肉球
        const isRight = activePose === 'wave_hi_right';
        catGroup.rotation.set(0, 0, 0);
        catGroup.position.y = Math.abs(Math.sin(elapsed * 3.4)) * 0.08;
        headGroup.rotation.set(0, 0, (isRight ? -1 : 1) * 0.06);

        if (isRight) {
          // 畫面左側手高舉、右側手水平伸展（完全對齊參考圖左2！）
          leftArmPivot.position.set(-0.58, 0.08, 0.22);
          leftArmPivot.rotation.set(0.1, 0, -2.45 + Math.sin(elapsed * 8.0) * 0.22);
          rightArmPivot.position.set(0.64, -0.18, 0.22);
          rightArmPivot.rotation.set(0.1, 0, 1.48);
          leftLegPivot.position.set(-0.38, -0.88, 0.22);
          leftLegPivot.rotation.set(-0.55, 0, -0.25);
          rightLegPivot.position.set(0.38, -0.92, 0.18);
          rightLegPivot.rotation.set(-0.35, 0, 0.2);
        } else {
          rightArmPivot.position.set(0.58, 0.08, 0.22);
          rightArmPivot.rotation.set(0.1, 0, 2.45 + Math.sin(elapsed * 8.0) * 0.22);
          leftArmPivot.position.set(-0.64, -0.18, 0.22);
          leftArmPivot.rotation.set(0.1, 0, -1.48);
          rightLegPivot.position.set(0.38, -0.88, 0.22);
          rightLegPivot.rotation.set(-0.55, 0, 0.25);
          leftLegPivot.position.set(-0.38, -0.92, 0.18);
          leftLegPivot.rotation.set(-0.35, 0, -0.2);
        }
      } else if (activePose === 'walk_right' || activePose === 'walk_left') {
        const dir = activePose === 'walk_right' ? 1 : -1;
        const walkCycle = elapsed * 7.6;
        catGroup.rotation.y = dir * 0.35;
        catGroup.position.y = Math.abs(Math.sin(walkCycle)) * 0.09;
        leftLegPivot.rotation.x = Math.sin(walkCycle) * 0.6;
        rightLegPivot.rotation.x = -Math.sin(walkCycle) * 0.6;
        leftArmPivot.rotation.x = -Math.sin(walkCycle) * 0.5;
        rightArmPivot.rotation.x = Math.sin(walkCycle) * 0.5;
      } else if (activePose === 'headhunter_telescope') {
        // 對齊 3D 參考圖左3：雙手一起舉起雙筒望遠鏡放到眼睛前
        catGroup.rotation.set(0, 0.18, 0);
        headGroup.rotation.set(-0.08, 0.1, 0);
        binocularsGroup.visible = true;
        leftArmPivot.position.set(-0.42, -0.02, 0.52);
        leftArmPivot.rotation.set(-1.75, 0.35, -0.15);
        rightArmPivot.position.set(0.42, -0.02, 0.52);
        rightArmPivot.rotation.set(-1.75, -0.35, 0.15);
      } else if (activePose === 'chat_mediator') {
        // 對齊 3D 參考圖左4：端正坐姿、戴深色圓框眼鏡、左手扶記事本、右手拿黃色鉛筆書寫
        catGroup.rotation.set(0, 0, 0);
        catGroup.position.y = -0.18;
        headGroup.rotation.set(0.08, 0, 0);
        glassesGroup.visible = true;
        notepadGroup.visible = true;
        pencilGroup.visible = true;
        leftArmPivot.position.set(-0.48, -0.28, 0.38);
        leftArmPivot.rotation.set(-1.15, 0.35, -0.25);
        rightArmPivot.position.set(0.48, -0.24, 0.38);
        rightArmPivot.rotation.set(-1.25 + Math.sin(elapsed * 6.0) * 0.12, -0.25, 0.2);
        leftLegPivot.position.set(-0.36, -0.82, 0.38);
        leftLegPivot.rotation.x = -1.4;
        rightLegPivot.position.set(0.36, -0.82, 0.38);
        rightLegPivot.rotation.x = -1.4;
      } else if (activePose === 'report_magnifier') {
        // 對齊 3D 參考圖左5：趴在地上、身體往後延伸、前手伸出拿金色放大鏡仔細看
        catGroup.rotation.set(0.15, -0.25, 0);
        catGroup.position.set(0, -0.38, 0.15);
        headGroup.position.set(-0.12, 0.12, 0.35);
        headGroup.rotation.set(0.05, 0.18, 0);
        bodyGroup.position.set(0.32, 0.02, -0.45);
        bodyGroup.rotation.set(1.15, 0, -0.25);
        magnifierGroup.visible = true;
        leftArmPivot.position.set(-0.46, -0.42, 0.65);
        leftArmPivot.rotation.set(-1.25, 0.2, -0.3);
        rightArmPivot.position.set(0.28, -0.42, 0.55);
        rightArmPivot.rotation.set(-1.1, -0.2, 0.25);
        leftLegPivot.position.set(0.15, -0.25, -0.95);
        leftLegPivot.rotation.set(1.2, 0, 0);
        rightLegPivot.position.set(0.55, -0.25, -0.85);
        rightLegPivot.rotation.set(1.2, 0, 0);
      } else if (activePose === 'idle_nap') {
        // 對齊 3D 參考圖左6：在中間側躺閉眼小睡，身體橫向舒展、黃色項圈與鈴鐺在中間、小腳露出粉紅肉球
        const breath = Math.sin(elapsed * 2.0);
        catGroup.position.set(-0.08, -0.38, 0);
        catGroup.rotation.set(0, 0, 0);
        headGroup.position.set(-0.46, 0.12, 0.15);
        headGroup.rotation.set(0.06, 0.12, 0.22 + breath * 0.02);
        bodyGroup.position.set(0.48, 0.04, -0.05);
        bodyGroup.rotation.set(0, 0, Math.PI / 2 - 0.12);
        leftArmPivot.position.set(-0.62, -0.32, 0.45);
        leftArmPivot.rotation.set(-1.2, 0.3, -0.4);
        rightArmPivot.position.set(0.38, 0.42, 0.22);
        rightArmPivot.rotation.set(-0.4, 0.2, 1.85);
        leftLegPivot.position.set(0.95, 0.12, 0.18);
        leftLegPivot.rotation.set(0, 0.3, 1.45);
        rightLegPivot.position.set(0.88, -0.25, 0.22);
        rightLegPivot.rotation.set(0, 0.2, 1.55);
        tailPivot.position.set(0.75, 0.35, -0.25);
      } else if (activePose === 'deep_sleep') {
        // 對齊 3D 參考圖右7：閒置過久時在中間趴平/躺平呼呼大睡（圓滾滾麻糬睡姿 + 呼吸起伏）
        const breath = Math.sin(elapsed * 1.8);
        catGroup.position.set(0, -0.48, 0.1);
        catGroup.rotation.set(0, 0, 0);
        headGroup.position.set(0, 0.08 + breath * 0.02, 0.28);
        headGroup.rotation.set(0.18, 0, 0);
        headGroup.scale.set(1.06, 0.94 + breath * 0.02, 1.04);
        bodyGroup.position.set(0.08, 0.18, -0.48);
        bodyGroup.rotation.set(1.35, 0, 0);
        leftArmPivot.position.set(-0.68, -0.32, 0.42);
        leftArmPivot.rotation.set(-1.45, 0.4, -0.5);
        rightArmPivot.position.set(0.68, -0.32, 0.42);
        rightArmPivot.rotation.set(-1.45, -0.4, 0.5);
        leftLegPivot.visible = false;
        rightLegPivot.visible = false;
        tailPivot.position.set(0.25, 0.45, -0.55);
      } else {
        // 基礎站立微笑（對齊 3D 參考圖左1）
        catGroup.position.y = Math.sin(elapsed * 2.5) * 0.04;
        headGroup.scale.set(1, 1, 1);
      }

      if (activePose !== 'deep_sleep') {
        headGroup.scale.set(1, 1, 1);
      }

      renderer.render(scene, camera);
      displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
      displayCtx.drawImage(
        renderer.domElement,
        0,
        0,
        displayCanvas.width,
        displayCanvas.height
      );

      // 在 2D 畫布疊加 3D 參考圖中的精緻動態符號（揮手時的金色閃耀星芒 ✨、睡覺時的柔和藍紫 Zzz）
      if (activePose === 'wave_hi_right' || activePose === 'wave_hi_left') {
        displayCtx.save();
        displayCtx.fillStyle = '#eab308';
        const sparkles = [
          [0.22, 0.12],
          [0.48, 0.07],
          [0.76, 0.13],
        ];
        sparkles.forEach(([sx, sy], i) => {
          const pulse = 0.7 + 0.3 * Math.sin(elapsed * 5 + i * 1.5);
          const cx = displayCanvas.width * sx;
          const cy = displayCanvas.height * sy;
          const r = 6 * dpr * pulse;
          displayCtx.beginPath();
          displayCtx.moveTo(cx, cy - r);
          displayCtx.lineTo(cx + r * 0.3, cy - r * 0.3);
          displayCtx.lineTo(cx + r, cy);
          displayCtx.lineTo(cx + r * 0.3, cy + r * 0.3);
          displayCtx.lineTo(cx, cy + r);
          displayCtx.lineTo(cx - r * 0.3, cy + r * 0.3);
          displayCtx.lineTo(cx - r, cy);
          displayCtx.lineTo(cx - r * 0.3, cy - r * 0.3);
          displayCtx.closePath();
          displayCtx.fill();
        });
        displayCtx.restore();
      } else if (activePose === 'idle_nap' || activePose === 'deep_sleep') {
        displayCtx.save();
        displayCtx.font = `900 ${Math.round(13 * dpr)}px sans-serif`;
        displayCtx.fillStyle = 'rgba(100, 116, 139, 0.75)';
        const floatY = Math.sin(elapsed * 2.4) * 3 * dpr;
        displayCtx.fillText('z', displayCanvas.width * 0.62, displayCanvas.height * 0.28 + floatY);
        displayCtx.font = `900 ${Math.round(17 * dpr)}px sans-serif`;
        displayCtx.fillStyle = 'rgba(71, 85, 105, 0.85)';
        displayCtx.fillText('Z', displayCanvas.width * 0.72, displayCanvas.height * 0.16 - floatY);
        displayCtx.restore();
      }
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
      whiteMat.dispose();
      earYellowMat.dispose();
      innerEarCreamMat.dispose();
      collarYellowMat.dispose();
      goldBellMat.dispose();
      bellSlitMat.dispose();
      whiskerBlackMat.dispose();
      pawPinkMat.dispose();
      darkNavyMat.dispose();
      lensGlassMat.dispose();
      woodHandleMat.dispose();
      faceOverlayMat.dispose();
      torsoGeo.dispose();
      collarTorusGeo.dispose();
      bellSphereGeo.dispose();
      bellRimGeo.dispose();
      armGeo.dispose();
      legGeo.dispose();
      tailTubeGeo.dispose();
      tailTipGeo.dispose();
    };
  }, [w, h, interactiveRotate, autoTurntable]);

  return (
    <div
      onClick={onClick}
      style={{ width: w, height: h }}
      className={`relative inline-flex items-center justify-center select-none shrink-0 ${className}`}
    >
      <canvas
        ref={canvasRef}
        style={{ width: w, height: h }}
        className="block pointer-events-auto"
      />
    </div>
  );
};
