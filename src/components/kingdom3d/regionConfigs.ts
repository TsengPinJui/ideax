import * as THREE from 'three';
import {
  RegionId,
  RegionManifest,
  BridgeZone,
  BuildingInteractable,
  Collider,
  CourtyardWallSegment,
  WalkableZone,
} from './types';

/**
 * Transform local (lx, lz) inside a group with position (cx, cz) and rotation.y = yaw
 * into world (wx, wz) using Three.js right-handed Y-rotation matrix:
 * wx = cx + lx * cos(yaw) + lz * sin(yaw)
 * wz = cz - lx * sin(yaw) + lz * cos(yaw)
 */
export function localToWorldXZ(
  cx: number,
  cz: number,
  yaw: number,
  lx: number,
  lz: number
): [number, number] {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [cx + lx * c + lz * s, cz - lx * s + lz * c];
}

/**
 * Automatically generate 5 wall segment colliders (Back, Left, Right, Front-Left, Front-Right)
 * plus an interior exhibit/desk pedestal collider for a hollow walk-in building.
 */
/** 主島中央廣場佈告欄的碰撞：兩根柱子＋板子 */
export function noticeBoardColliders(b: BuildingInteractable): Collider[] {
  const [ax, az] = localToWorldXZ(b.position.x, b.position.z, b.facingYaw, -(b.width / 2 - 0.25), 0);
  const [bx, bz] = localToWorldXZ(b.position.x, b.position.z, b.facingYaw, b.width / 2 - 0.25, 0);
  return [{ id: `${b.id}-board`, type: 'segment', x1: ax, z1: az, x2: bx, z2: bz, halfThickness: 0.4 }];
}

export function generateBuildingWallColliders(b: BuildingInteractable): Collider[] {
  const cx = b.position.x;
  const cz = b.position.z;
  const yaw = b.facingYaw;
  const hw = b.width / 2;
  const hd = b.depth / 2;
  const doorHalf = (b.doorWidth || 3.8) / 2;
  const wallHalfThick = 0.28;

  const [blX, blZ] = localToWorldXZ(cx, cz, yaw, -hw, -hd); // Back-Left
  const [brX, brZ] = localToWorldXZ(cx, cz, yaw, hw, -hd); // Back-Right
  const [flX, flZ] = localToWorldXZ(cx, cz, yaw, -hw, hd); // Front-Left corner
  const [frX, frZ] = localToWorldXZ(cx, cz, yaw, hw, hd); // Front-Right corner
  const [dlX, dlZ] = localToWorldXZ(cx, cz, yaw, -doorHalf, hd); // Door-Left jamb
  const [drX, drZ] = localToWorldXZ(cx, cz, yaw, doorHalf, hd); // Door-Right jamb
  const [tableX, tableZ] = localToWorldXZ(cx, cz, yaw, 0, -hd * 0.25); // Interior desk

  return [
    // Back wall
    {
      id: `${b.id}-wall-back`,
      type: 'segment',
      x1: blX,
      z1: blZ,
      x2: brX,
      z2: brZ,
      halfThickness: wallHalfThick,
    },
    // Left wall
    {
      id: `${b.id}-wall-left`,
      type: 'segment',
      x1: blX,
      z1: blZ,
      x2: flX,
      z2: flZ,
      halfThickness: wallHalfThick,
    },
    // Right wall
    {
      id: `${b.id}-wall-right`,
      type: 'segment',
      x1: brX,
      z1: brZ,
      x2: frX,
      z2: frZ,
      halfThickness: wallHalfThick,
    },
    // Front-Left wall (left of open doorway)
    {
      id: `${b.id}-wall-front-left`,
      type: 'segment',
      x1: flX,
      z1: flZ,
      x2: dlX,
      z2: dlZ,
      halfThickness: wallHalfThick,
    },
    // Front-Right wall (right of open doorway)
    {
      id: `${b.id}-wall-front-right`,
      type: 'segment',
      x1: drX,
      z1: drZ,
      x2: frX,
      z2: frZ,
      halfThickness: wallHalfThick,
    },
    // Interior interactive desk/altar pedestal
    {
      id: `${b.id}-interior-desk`,
      type: 'cylinder',
      x: tableX,
      z: tableZ,
      radius: 0.75,
    },
  ];
}

/**
 * Generate wall colliders for courtyard walls, leaving an open passage at Moon Gates (月洞門)
 */
export function generateCourtyardWallColliders(
  walls: CourtyardWallSegment[]
): Collider[] {
  const colliders: Collider[] = [];
  for (const w of walls) {
    if (!w.hasMoonGate) {
      colliders.push({
        id: `${w.id}-seg`,
        type: 'segment',
        x1: w.x1,
        z1: w.z1,
        x2: w.x2,
        z2: w.z2,
        halfThickness: 0.3,
      });
    } else {
      const dx = w.x2 - w.x1;
      const dz = w.z2 - w.z1;
      const len = Math.hypot(dx, dz);
      const gateW = w.gateWidth || 5.2;
      const wingLen = Math.max(0.5, (len - gateW) / 2);
      const ux = dx / len;
      const uz = dz / len;

      // Left/First wall wing before Moon Gate opening
      colliders.push({
        id: `${w.id}-wing-1`,
        type: 'segment',
        x1: w.x1,
        z1: w.z1,
        x2: w.x1 + ux * wingLen,
        z2: w.z1 + uz * wingLen,
        halfThickness: 0.3,
      });
      // Right/Second wall wing after Moon Gate opening
      colliders.push({
        id: `${w.id}-wing-2`,
        type: 'segment',
        x1: w.x2 - ux * wingLen,
        z1: w.z2 - uz * wingLen,
        x2: w.x2,
        z2: w.z2,
        halfThickness: 0.3,
      });
    }
  }
  return colliders;
}

/**
 * 4 Arched Bridges connecting 主島 to the 4 outer islands (痛點島、討論島、創意島、徵才島)
 * Strictly matching IslandScene3D.tsx
 */
export const WORLD_BRIDGES: BridgeZone[] = [
  // 1. 主島 <-> 痛點島
  {
    id: 'bridge-home-pain',
    name: '主島 ↔ 痛點島',
    x1: -20,
    z1: -15,
    x2: -46,
    z2: -34,
    halfWidth: 3.1,
    bridgeMaxHeight: 2.1,
    fromRegionId: 'region-home',
    toRegionId: 'region-pain',
  },
  // 2. 主島 <-> 討論島
  {
    id: 'bridge-home-discussion',
    name: '主島 ↔ 討論島',
    x1: 20,
    z1: -15,
    x2: 46,
    z2: -34,
    halfWidth: 3.1,
    bridgeMaxHeight: 2.1,
    fromRegionId: 'region-home',
    toRegionId: 'region-discussion',
  },
  // 3. 主島 <-> 創意島
  {
    id: 'bridge-home-creative',
    name: '主島 ↔ 創意島',
    x1: -20,
    z1: 15,
    x2: -46,
    z2: 34,
    halfWidth: 3.1,
    bridgeMaxHeight: 2.1,
    fromRegionId: 'region-home',
    toRegionId: 'region-creative',
  },
  // 4. 主島 <-> 徵才島
  {
    id: 'bridge-home-career',
    name: '主島 ↔ 徵才島',
    x1: 20,
    z1: 15,
    x2: 46,
    z2: 35,
    halfWidth: 3.1,
    bridgeMaxHeight: 2.1,
    fromRegionId: 'region-home',
    toRegionId: 'region-career',
  },
];

/**
 * Generate bridge balustrade colliders and walkable corridor zones
 */
/**
 * 拱橋欄杆只蓋在水面上那一段（兩端停在岸邊）：橋的端點其實已經在島上，
 * 欄杆一路延伸上岸會和岸上的圍牆接在一起，把旁邊的空地封死。回傳 [t0, t1]（0～1 沿橋）。
 */
export function bridgeRailRange(b: { x1: number; z1: number; x2: number; z2: number }): [number, number] {
  const isles = [
    { cx: 0, cz: 0, rx: 31.5, rz: 29.5 },
    { cx: -68, cz: -48, rx: 31.0, rz: 28.0 },
    { cx: 72, cz: -48, rx: 34.0, rz: 31.0 },
    { cx: -68, cz: 48, rx: 33.0, rz: 30.0 },
    { cx: 72, cz: 48, rx: 35.0, rz: 31.0 },
  ];
  // 岸邊：可走範圍外緣往內 1.5 公尺的地方
  const onLand = (x: number, z: number) => isles.some((e) => ((x - e.cx) / (e.rx - 1.5)) ** 2 + ((z - e.cz) / (e.rz - 1.5)) ** 2 < 1);
  let t0 = 0;
  let t1 = 1;
  const n = 400;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (!onLand(b.x1 + (b.x2 - b.x1) * t, b.z1 + (b.z2 - b.z1) * t)) {
      t0 = t;
      break;
    }
  }
  for (let i = n; i >= 0; i--) {
    const t = i / n;
    if (!onLand(b.x1 + (b.x2 - b.x1) * t, b.z1 + (b.z2 - b.z1) * t)) {
      t1 = t;
      break;
    }
  }
  return t1 > t0 ? [t0, t1] : [0, 1];
}

/** 橋上釣客的位置：每座橋兩位，坐在欄杆內側、面向橋外（碰撞也用這份） */
export function bridgeAnglerSpots(): { id: string; x: number; z: number; y: number; faceYaw: number }[] {
  const out: { id: string; x: number; z: number; y: number; faceYaw: number }[] = [];
  WORLD_BRIDGES.forEach((b, bi) => {
    const dx = b.x2 - b.x1;
    const dz = b.z2 - b.z1;
    const len = Math.hypot(dx, dz);
    const nx = -dz / len;
    const nz = dx / len;
    [
      [0.36, 1],
      [0.64, -1],
    ].forEach(([t, side], k) => {
      const off = (b.halfWidth - 0.75) * side;
      const ox = nx * side;
      const oz = nz * side;
      out.push({
        id: `${b.id}-angler-${k}`,
        x: b.x1 + dx * t + nx * off,
        z: b.z1 + dz * t + nz * off,
        y: Math.sin(t * Math.PI) * b.bridgeMaxHeight,
        // 面向橋外（本地 +Z 朝外）
        faceYaw: Math.atan2(ox, oz) + (bi % 2 ? 0.08 : -0.08),
      });
    });
  });
  return out;
}

export function getBridgeSideColliders(): Collider[] {
  const list: Collider[] = [];
  for (const b0 of WORLD_BRIDGES) {
    const [ta, tb] = bridgeRailRange(b0);
    const b = {
      ...b0,
      x1: b0.x1 + (b0.x2 - b0.x1) * ta,
      z1: b0.z1 + (b0.z2 - b0.z1) * ta,
      x2: b0.x1 + (b0.x2 - b0.x1) * tb,
      z2: b0.z1 + (b0.z2 - b0.z1) * tb,
    };
    const dx = b.x2 - b.x1;
    const dz = b.z2 - b.z1;
    const len = Math.hypot(dx, dz);
    const nx = -dz / len;
    const nz = dx / len;
    const railOffset = b.halfWidth + 0.15;

    list.push({
      id: `${b.id}-rail-left`,
      type: 'segment',
      x1: b.x1 + nx * railOffset,
      z1: b.z1 + nz * railOffset,
      x2: b.x2 + nx * railOffset,
      z2: b.z2 + nz * railOffset,
      halfThickness: 0.25,
    });
    list.push({
      id: `${b.id}-rail-right`,
      type: 'segment',
      x1: b.x1 - nx * railOffset,
      z1: b.z1 - nz * railOffset,
      x2: b.x2 - nx * railOffset,
      z2: b.z2 - nz * railOffset,
      halfThickness: 0.25,
    });
  }
  return list;
}

/**
 * 西側田園（聚雲塔山腳）的登山渡口與登山口：
 * 乘船到西岸田園的渡口上岸，沿田間石板路走到山腳的登山口，點登山口直上聚雲塔山台
 */
export const WEST_LANDING = {
  /** 渡口上岸處（田園東岸） */
  dockLand: [-121.6, 15.0] as [number, number],
  /** 船靠岸的水面 */
  dockWater: [-111.0, 15.0] as [number, number],
  /** 山腳登山口 */
  trail: [-143.0, -6.0] as [number, number],
  /** 石板路半寬 */
  halfWidth: 2.2,
  /** 田園地面高度（田埂上） */
  y: 0.5,
};

export function getGlobalWalkableZones(): WalkableZone[] {
  const bridgeCorridors: WalkableZone[] = WORLD_BRIDGES.map((b) => {
    const dx = b.x2 - b.x1;
    const dz = b.z2 - b.z1;
    const len = Math.hypot(dx, dz);
    const ux = dx / len;
    const uz = dz / len;
    // Extend corridor 3.5m into each island so bridge-to-island transition has zero gap
    return {
      type: 'corridor',
      x1: b.x1 - ux * 3.5,
      z1: b.z1 - uz * 3.5,
      x2: b.x2 + ux * 3.5,
      z2: b.z2 + uz * 3.5,
      halfWidth: b.halfWidth - 0.15,
    };
  });

  return [
    // 5 Islands Walkable Landmasses
    { type: 'ellipse', cx: 0, cz: 0, rx: 31.5, rz: 29.5 }, // 主島
    { type: 'ellipse', cx: -68, cz: -48, rx: 31.0, rz: 28.0 }, // 痛點島
    { type: 'ellipse', cx: 72, cz: -48, rx: 34.0, rz: 31.0 }, // 討論島
    { type: 'ellipse', cx: -68, cz: 48, rx: 33.0, rz: 30.0 }, // 創意島
    { type: 'ellipse', cx: 72, cz: 48, rx: 35.0, rz: 31.0 }, // 徵才島
    ...bridgeCorridors,
    // 西側田園：渡口 → 石板路 → 山腳登山口
    { type: 'corridor', x1: WEST_LANDING.dockLand[0], z1: WEST_LANDING.dockLand[1], x2: WEST_LANDING.trail[0], z2: WEST_LANDING.trail[1], halfWidth: WEST_LANDING.halfWidth },
    { type: 'rect', minX: WEST_LANDING.dockLand[0] - 3.4, maxX: WEST_LANDING.dockLand[0] + 2.8, minZ: WEST_LANDING.dockLand[1] - 3.4, maxZ: WEST_LANDING.dockLand[1] + 3.4 },
    { type: 'rect', minX: WEST_LANDING.trail[0] - 4, maxX: WEST_LANDING.trail[0] + 4, minZ: WEST_LANDING.trail[1] - 4.5, maxZ: WEST_LANDING.trail[1] + 4.5 },
  ];
}

// =========================================================
// 1. 主島 (region-home)
// 原定名稱：中央廣場（探索看板、島覽地圖、角色介紹）、貿易街(開發中)
// =========================================================
const homeBuildings: BuildingInteractable[] = [
  {
    id: 'home-explore',
    name: '探索看板',
    subtitle: '中央廣場・直接逛全站最新公開內容',
    position: new THREE.Vector3(-14, 0, -9),
    facingYaw: Math.PI / 4,
    width: 6.4,
    depth: 1.4,
    height: 5.0,
    exterior: 'board',
    doorWidth: 3.8,
    tiers: 2,
    colorHex: 0xd97706,
    interactionRadius: 4.5,
    description: '沿著中央廣場的探索看板瀏覽 IdeaX 目前最新公開內容與探索動態。',
    targetModule: 'explore',
    previewBadge: '中央廣場',
    previewFeatures: [
      '直接逛全站最新公開內容',
      '導覽員多慧駐守接待',
      '中央廣場的大佈告欄，張貼全站最新內容',
    ],
    mockData: {
      stats: '所屬區域：主島・中央廣場',
      notice: '多慧：「想先看看大家最近提出的問題、討論和作品嗎？」',
      primaryActionLabel: '看全站內容',
    },
  },
  {
    id: 'home-map',
    name: '島覽地圖',
    subtitle: '中央廣場・新手導覽教學、平台介紹、運作說明、條款聲明',
    position: new THREE.Vector3(14, 0, -9),
    facingYaw: -Math.PI / 4,
    width: 6.4,
    depth: 1.4,
    height: 5.0,
    exterior: 'board',
    doorWidth: 3.8,
    tiers: 2,
    colorHex: 0x0284c7,
    interactionRadius: 4.5,
    description: '新手導覽教學、平台介紹、運作說明、條款聲明。',
    targetModule: 'kingdom',
    previewBadge: '中央廣場',
    previewFeatures: [
      '五大島嶼：主島、痛點島、討論島、創意島、徵才島',
      '新手導覽教學與平台介紹',
      '運作說明與條款聲明',
    ],
    mockData: {
      stats: '所屬區域：主島・中央廣場',
      notice: '走進室內即可查看完整島覽地圖與導覽說明。',
      primaryActionLabel: '查看島覽地圖',
    },
  },
  {
    id: 'home-agents',
    name: '角色介紹',
    subtitle: '中央廣場・創點源六隻守護 Agent 介紹與身分證名冊',
    position: new THREE.Vector3(0, 0, 15.5),
    facingYaw: Math.PI,
    width: 7.0,
    depth: 1.4,
    height: 5.0,
    exterior: 'board',
    doorWidth: 4.2,
    tiers: 2,
    colorHex: 0x7c3aed,
    interactionRadius: 4.8,
    description: '創點源六大原創 Agent 角色：小燈泡、搜搜、白喵、頂多慧、007、大熊！查看角色職位、出沒地點與虛擬身分證。',
    targetModule: 'explore',
    previewBadge: '中央廣場',
    previewFeatures: [
      '小燈泡（調節器 Agent）、搜搜（探索者 Agent）、白喵（市場顧問 Agent）',
      '頂多慧（官方客服 Agent）、007（AI CRM Agent）、大熊（預備神兵）',
      '查看角色職位、出沒地點與虛擬身分證',
    ],
    mockData: {
      stats: '所屬區域：主島・中央廣場',
      notice: '小燈泡：「哈囉！我們是創點源的六位守護夥伴，點擊卡片就能查看大家的檔案與身分證喔！💡」',
      primaryActionLabel: '查看角色介紹',
    },
  },
];

// =========================================================
// 2. 痛點島 (region-pain)
// 原定名稱：創點樓（樓內設有：懸賞牆、佈告桌）
// =========================================================
const painBuildings: BuildingInteractable[] = [
  {
    id: 'pain-innovation-tower',
    name: '創點樓',
    subtitle: '痛點島・樓內設有懸賞牆（分門別類瀏覽與刊登）與佈告桌（撰寫痛點表單並刊登）',
    // 放在痛點島中央，大門朝向主島過來的石拱橋
    position: new THREE.Vector3(-68, 0, -48),
    facingYaw: 0.995,
    // 圓形土樓：外徑 44 公尺（判斷是否在樓內、互動距離用）
    width: 44.0,
    depth: 44.0,
    // 每層挑高 4.5 公尺，共三層環形迴廊
    height: 13.5,
    floors: 3,
    exterior: 'tulou',
    doorWidth: 4.8,
    tiers: 3,
    colorHex: 0xdc2626,
    interactionRadius: 6.5,
    description: '圓形土樓：沿著環形迴廊逛各樓層的懸賞牆，或在中庭的佈告桌刊登痛點、在提案台寫創新提案。',
    targetModule: 'pain_points',
    previewBadge: '圓形土樓・三層迴廊',
    previewFeatures: [
      '整棟是客家圓形土樓：一、二、三樓都是環形迴廊，沿牆掛滿懸賞牆，可以一路逛痛點',
      '一樓日常疑難（中庭佈告欄＋一樓迴廊）、二樓專業問題、三樓學術探討；迴廊裡有樓梯上下樓',
      '中間是露天中庭：桌椅、創點舞台、提案台，以及刊登痛點的佈告桌',
    ],
    mockData: {
      stats: '樓內分區：懸賞牆、佈告桌',
      notice: '掌櫃阿點：「客官，懸賞牆上已按類別分門別類張貼各方痛點；若您也有痛點難題，隨時可於佈告桌撰寫並刊登於牆上！」',
      primaryActionLabel: '進入創點樓（懸賞牆 / 佈告桌）',
    },
  },
];

// =========================================================
// 3. 討論島 (region-discussion)
// 原定名稱：藏書閣、工作坊（技術工作坊）、茶藝街 — 三個物件圍繞中央廣場空地
// =========================================================
const discussionBuildings: BuildingInteractable[] = [
  {
    id: 'discussion-library',
    name: '藏書閣',
    subtitle: '討論島北區・古雅藏書閣，地下一樓為大型分類圖書館，陳列成排古籍書架',
    position: new THREE.Vector3(72, 0, -65),
    facingYaw: 0,
    width: 15.0,
    depth: 11.0,
    height: 7.6,
    exterior: 'huizhou',
    doorWidth: 4.4,
    tiers: 2,
    colorHex: 0x0f766e,
    interactionRadius: 5.5,
    description: '討論島北區核心地標，地下室為大型分類圖書館，依樓層分門別類陳列成排書架：一層·資訊工程閣、二層·經世商道閣、三層·自然生命閣、四層·人文哲思閣。',
    targetModule: 'l0_discussion',
    previewBadge: '討論島・北區',
    previewFeatures: [
      '地下一樓為大型分類圖書館：成排古籍書架分門別類陳列討論典籍，點擊書架即可閱覽',
      '一層·資訊工程閣（演算法、系統架構與 AI 典籍書架）',
      '二層·經世商道閣（商業經營、經濟模型與策略典籍書架）',
      '三層·自然生命閣 & 四層·人文哲思閣（生醫自然與人文哲思典籍書架）',
    ],
    mockData: {
      stats: '地下圖書館：四大分類書庫・成排書架典藏',
      notice: '知知：「歡迎蒞臨藏書閣！可由一樓大廳階梯進入地下圖書館，各分類書架皆可點選研讀。」',
      primaryActionLabel: '進入藏書閣',
    },
  },
  {
    id: 'discussion-workshop',
    name: '大熊匠鋪',
    subtitle: '討論島東區・百工坊街右側，大熊的平頂工棚：棚架、器具、工作台；對面白牆一排百工佈告欄張貼專業討論',
    // 百工坊街右手邊（東側）：兩座平頂工棚，中間留一條路穿過去
    position: new THREE.Vector3(93.6, 0, -43.6),
    facingYaw: -Math.PI / 2,
    width: 25.0,
    depth: 7.6,
    height: 4.4,
    exterior: 'bearShop',
    doorWidth: 5.2,
    tiers: 1,
    colorHex: 0x1d4ed8,
    interactionRadius: 4.8,
    description: '討論島東區「百工坊」街：右手邊是大熊的「大熊匠鋪」（兩座平頂工棚，棚架、器具、工作台，中間一條路穿過去）；左手邊白牆上一排百工佈告欄，依水電、室內裝修、法律智財、會計稅務、企業管理分類張貼專業討論，牆上月洞門通往論道廣場。',
    targetModule: 'l0_discussion',
    previewBadge: '百工坊・東區',
    previewFeatures: [
      '大熊匠鋪：大熊（預備神兵）在工棚裡敲敲打打',
      '對面白牆的百工佈告欄：水電、室內裝修、法律智財、會計稅務、企業管理、百業熱議',
      '論道廣場東牆另有「百工坊・熱門議題」大型佈告欄輪播熱門討論',
    ],
    mockData: {
      stats: '駐守角色：大熊（預備神兵）',
      notice: '大熊：「歡迎來到百工坊！專業問題貼在對面白牆的佈告欄上，修修補補的事交給我！」',
      primaryActionLabel: '逛百工討論',
    },
  },
  {
    id: 'discussion-street',
    name: '茶藝街',
    subtitle: '討論島西區・江南茶藝長街，街道兩側茶莊林立、露天茶座飄香',
    position: new THREE.Vector3(48.5, 0, -44.5),
    facingYaw: Math.PI / 2,
    width: 11.5,
    depth: 8.8,
    height: 5.0,
    exterior: 'huizhou',
    doorWidth: 3.8,
    tiers: 2,
    colorHex: 0x15803d,
    interactionRadius: 4.8,
    description: '討論島西區「茶藝街」主茶樓，與街道兩側的清茗茶莊、雅韻茶樓、龍井茶寮、茗香茶點及露天茶座連成一條熱鬧的江南茶街。',
    targetModule: 'l0_discussion',
    previewBadge: '討論島・西區',
    previewFeatures: [
      '日常交流茶館（清茗茶莊）& 生活慢調茶館（雅韻茶樓）',
      '職場江湖茶館（龍井茶寮）& 靈感悟道茶館（茗香茶點）',
      '貫穿西區的青石茶藝長街，兩側茶鋪與露天茶座皆可入座慢聊',
    ],
    mockData: {
      stats: '下轄街區：江南茶藝長街與主題茶鋪',
      notice: '陸羽：「客官請進茶藝街！沿街兩側茶莊與茶座皆可入座，每張卡片都是一張品茗茶桌。」',
      primaryActionLabel: '進入茶藝街',
    },
  },
];

// =========================================================
// 4. 創意島 (region-creative)
// 原定名稱：展覽館（AI工具展場、軟體應用展場、創新提案展場）、電玩城
// =========================================================
const creativeBuildings: BuildingInteractable[] = [
  {
    id: 'creative-exhibition',
    name: '展覽館',
    subtitle: '創意島・作品、AI 工具與創新提案主題展館',
    // 貼著創意島西緣；地下是很大的主展場（從館內的樓層表或下樓入口進入）
    position: new THREE.Vector3(-88, 0, 48),
    facingYaw: Math.PI / 2,
    width: 26.0,
    depth: 18.0,
    height: 12.5,
    exterior: 'exhibition',
    doorWidth: 6.4,
    tiers: 2,
    colorHex: 0x0284c7,
    interactionRadius: 5.5,
    description: '作品、AI 工具與創新提案主題展館，一樓大廳有榜單大螢幕與精選榜、熱度榜，走下大樓梯是三層地下展場：B1 AI 工具展場、B2 軟體應用展場、B3 創新提案展場。',
    targetModule: 'vibecoding',
    previewBadge: '創意島',
    previewFeatures: [
      '一樓大廳：進門正對精選榜＋熱度榜作品大螢幕輪播，左牆精選榜、右牆熱度榜（和首頁同一份榜單）',
      '中央大樓梯往下：每一層是一類展場（B1 AI 工具、B2 軟體應用、B3 創新提案），用右側樓層表也能直接換樓層',
      '一個攤位展示一件真實作品：上方名稱、中間圖片或影片縮圖（多張輪播）、下方簡述，櫃台上擺攤主姓名牌；靠近攤位按 E 或點攤位就能看',
      'AI 工具展場（小艾）：生成式 AI、智慧自動化、影像視覺與多媒體創作攤位',
      '軟體應用展場（程程）：網站平台、生活實用、商業營運與數位系統攤位',
      '創新提案展場（提提）：資訊科技、商業模式、日常生活文創、生醫療材提案攤位',
    ],
    mockData: {
      stats: '地下三層展場：AI 工具、軟體應用、創新提案',
      notice: '走進展覽館即可瀏覽三大展場與各個別個案攤位。',
      primaryActionLabel: '進入展覽館',
    },
  },
  {
    id: 'creative-arcade',
    name: '電玩城',
    subtitle: '創意島・每一層是一類遊戲展區，點攤位體驗作品',
    // 貼著創意島南緣
    position: new THREE.Vector3(-64, 0, 66),
    facingYaw: Math.PI,
    width: 22.0,
    depth: 16.0,
    height: 11.5,
    exterior: 'arcade',
    doorWidth: 5.6,
    tiers: 2,
    colorHex: 0x9333ea,
    interactionRadius: 5.5,
    description: '遊戲展館，一樓大廳有遊戲榜單大螢幕與精選榜、熱度榜，走下大樓梯是四層地下展區：B1 休閒同樂、B2 益智解謎、B3 冒險競技、B4 模擬驚悚。',
    targetModule: 'vibecoding',
    previewBadge: '創意島',
    previewFeatures: [
      '一樓大廳：進門正對遊戲精選榜＋熱度榜大螢幕輪播，左牆精選榜、右牆熱度榜（和首頁同一份榜單）',
      'B1 休閒同樂（休閒派對、親子兒童、甜蜜浪漫）、B2 益智解謎（策略益智、卡牌桌遊、解謎劇情）',
      'B3 冒險競技（多人冒險、競技對戰）、B4 模擬驚悚（模擬體驗、恐怖驚悚）',
    ],
    mockData: {
      stats: '地下四層遊戲展區',
      notice: '樂樂：「想先玩一局輕鬆的小遊戲嗎？我帶你看看園區裡的作品。」',
      primaryActionLabel: '進入電玩城',
    },
  },
];

// =========================================================
// 5. 徵才島 (region-career)
// 原定名稱：翰林院、求職廟、人才獵頭/媒合專家（位於徵才島的圍牆內，設月洞門）
// =========================================================
const careerCourtyardWalls: CourtyardWallSegment[] = [
  // 西側院牆（含迎橋「月洞門」，正對主島通往徵才島的拱橋橋頭 x=48, z=36）
  {
    id: 'career-wall-west-north',
    x1: 48,
    z1: 28,
    x2: 48,
    z2: 43,
    height: 3.2,
    hasMoonGate: true,
    // 拱橋斜著接上院牆，橋面在牆線上約佔 z 31.6～39.3，門要整個讓開
    gateWidth: 8.8,
    gateLabel: '月洞門',
    colorHex: 0xf5f5f4,
  },
  {
    id: 'career-wall-west-south',
    x1: 48,
    z1: 43,
    x2: 48,
    z2: 68,
    height: 3.2,
    hasMoonGate: false,
    colorHex: 0xf5f5f4,
  },
  // 北側院牆（含北側「月洞門」，x=72, z=28）
  {
    id: 'career-wall-north',
    x1: 48,
    z1: 28,
    x2: 96,
    z2: 28,
    height: 3.2,
    hasMoonGate: true,
    gateWidth: 6.2,
    gateLabel: '月洞門',
    colorHex: 0xf5f5f4,
  },
  // 南側院牆（含南側正門「月洞門」，x=72, z=68）
  {
    id: 'career-wall-south',
    x1: 48,
    z1: 68,
    x2: 96,
    z2: 68,
    height: 3.2,
    hasMoonGate: true,
    gateWidth: 6.2,
    gateLabel: '月洞門',
    colorHex: 0xf5f5f4,
  },
  // 東側院牆（含東側「月洞門」，x=96, z=48）
  {
    id: 'career-wall-east',
    x1: 96,
    z1: 28,
    x2: 96,
    z2: 68,
    height: 3.2,
    hasMoonGate: true,
    gateWidth: 6.2,
    gateLabel: '月洞門',
    colorHex: 0xf5f5f4,
  },
];

const careerBuildings: BuildingInteractable[] = [
  {
    id: 'career-academy',
    name: '翰林院',
    subtitle: '徵才島・五大領域專家智庫，分藏各領域名冊',
    position: new THREE.Vector3(60, 0, 41),
    facingYaw: 0, // Door faces South (+Z) into the courtyard
    width: 12.0,
    depth: 9.5,
    height: 6.4,
    doorWidth: 4.0,
    tiers: 3,
    colorHex: 0x0d9488,
    interactionRadius: 4.8,
    description: '五大領域專家智庫，分藏各領域名冊：資訊科技庫、商業經營庫、生醫療材庫、創意設計庫、法律智財庫。',
    targetModule: 'solvers',
    previewBadge: '徵才島',
    previewFeatures: [
      '資訊科技庫 & 商業經營庫',
      '生醫療材庫 & 創意設計庫',
      '法律智財庫',
    ],
    mockData: {
      stats: '下轄智庫：五大領域專家智庫',
      notice: '院士：「翰林院收納全站頂尖領域專家，請查閱名冊。」',
      primaryActionLabel: '進入翰林院',
    },
  },
  {
    id: 'career-temple',
    name: '求職廟',
    subtitle: '徵才島・求籤祈願：填需求 · 匯職缺',
    position: new THREE.Vector3(84, 0, 41),
    facingYaw: 0, // Door faces South (+Z) into the courtyard
    width: 12.5,
    depth: 9.5,
    height: 6.0,
    npc: 'soso',
    doorWidth: 4.2,
    tiers: 2,
    exterior: 'temple',
    colorHex: 0xe11d48,
    interactionRadius: 4.8,
    description: '填寫求職條件，由搜搜為你整理並在全網匯職缺搜尋最新機會。',
    targetModule: 'job_explorer',
    previewBadge: '徵才島',
    previewFeatures: [
      '求職廟靈籤祈願：填寫求職條件，比對全網匯職缺',
      '探索者 Agent「搜搜」駐守服務',
    ],
    mockData: {
      stats: '駐守角色：搜搜（探索者 Agent）',
      notice: '搜搜：「填寫求職條件，我幫你比對全網匯職缺！」',
      primaryActionLabel: '進入求職廟',
    },
  },
  {
    id: 'hanlin-headhunter',
    name: '人才獵頭/媒合專家',
    subtitle: '徵才島・高階人才獵頭尋訪與跨域專家媒合委託',
    position: new THREE.Vector3(60, 0, 59),
    facingYaw: Math.PI, // Door faces North (-Z) into the courtyard
    width: 11.5,
    depth: 8.5,
    height: 5.0,
    doorWidth: 3.8,
    tiers: 1,
    colorHex: 0xd97706,
    interactionRadius: 4.5,
    description: '高階人才獵頭與跨領域專家媒合服務，配屬白喵顧問 Agent，提供企業獵才與專家對接。',
    targetModule: 'solvers',
    previewBadge: '徵才島',
    previewFeatures: [
      '高階人才獵頭尋訪與跨域專家媒合委託',
      '市場顧問 Agent「白喵」駐守服務',
    ],
    mockData: {
      stats: '駐守角色：白喵（市場顧問 Agent）',
      notice: '白喵：「哈基米！找關鍵人才或跨領域專家，交給我！」',
      primaryActionLabel: '委託獵頭媒合',
    },
  },
];

// =========================================================
// Assemble Full 5-Region Manifests (Strictly Original Names)
// =========================================================

export const REGION_HOME: RegionManifest = {
  id: 'region-home',
  name: '主島',
  shortName: '主島',
  compassLabel: '中央廣場',
  subtitle: '中央廣場（探索看板、島覽地圖、角色介紹佈告欄）・貿易街',
  center: [0, 0],
  islandRadiusX: 32,
  islandRadiusZ: 30,
  plazaRadius: 15,
  defaultSpawn: {
    position: [0, 0, 4],
    yaw: 0,
  },
  ambientColor: 0xf8fafc,
  sunColor: 0xfef08a,
  fogColor: 0xe2e8f0,
  fogNear: 65,
  fogFar: 210,
  islandColorHex: 0xd6d3d1,
  plazaColorHex: 0xe7e5e4,
  walkableZones: getGlobalWalkableZones(),
  colliders: [
    // 橋上的釣客（坐著，繞過去就好）
    ...bridgeAnglerSpots().map((p) => ({ id: p.id, type: 'cylinder' as const, x: p.x, z: p.z, radius: 0.55 })),
    // 大燈泡雕像（八角石座，半徑約 3 公尺）
    { id: 'home-bulb-monument', type: 'cylinder', x: 0, z: -2, radius: 3.0 },
    ...homeBuildings.flatMap((b) => (b.exterior === 'board' ? noticeBoardColliders(b) : generateBuildingWallColliders(b))),
    ...getBridgeSideColliders(),
  ],
  buildings: homeBuildings,
  portals: [],
  landmark: {
    name: '小燈泡',
    x: 0,
    z: -2,
    radius: 2.0,
    height: 8.5,
    colorHex: 0xf59e0b,
  },
};

export const REGION_PAIN: RegionManifest = {
  id: 'region-pain',
  name: '痛點島',
  shortName: '痛點島',
  compassLabel: '創點樓',
  subtitle: '創點樓（懸賞牆、佈告桌）',
  center: [-68, -48],
  islandRadiusX: 31,
  islandRadiusZ: 28,
  plazaRadius: 14,
  defaultSpawn: {
    // 土樓正門前（門朝石拱橋）
    position: [-45.7, 0, -33.6],
    yaw: 0.995,
  },
  ambientColor: 0xfef2f2,
  sunColor: 0xfde68a,
  fogColor: 0xe2e8f0,
  fogNear: 65,
  fogFar: 210,
  islandColorHex: 0xd6d3d1,
  plazaColorHex: 0xe7e5e4,
  walkableZones: getGlobalWalkableZones(),
  colliders: [
    // 圓形土樓的牆另外由土樓模型提供（不用方形牆）
    ...painBuildings.filter((b) => b.exterior !== 'tulou').flatMap(generateBuildingWallColliders),
    ...getBridgeSideColliders(),
  ],
  buildings: painBuildings,
  portals: [],
};

export const REGION_DISCUSSION: RegionManifest = {
  id: 'region-discussion',
  name: '討論島',
  shortName: '討論島',
  compassLabel: '藏書閣・百工坊・茶藝街',
  subtitle: '藏書閣・百工坊・茶藝街',
  center: [72, -48],
  islandRadiusX: 34,
  islandRadiusZ: 31,
  plazaRadius: 15,
  defaultSpawn: {
    position: [72, 0, -30],
    yaw: 0,
  },
  ambientColor: 0xf0fdf4,
  sunColor: 0xfef08a,
  fogColor: 0xe2e8f0,
  fogNear: 65,
  fogFar: 210,
  islandColorHex: 0xd6d3d1,
  plazaColorHex: 0xe7e5e4,
  walkableZones: getGlobalWalkableZones(),
  colliders: [
    ...discussionBuildings.flatMap(generateBuildingWallColliders),
    ...getBridgeSideColliders(),
  ],
  buildings: discussionBuildings,
  portals: [],
};

export const REGION_CREATIVE: RegionManifest = {
  id: 'region-creative',
  name: '創意島',
  shortName: '創意島',
  compassLabel: '展覽館・電玩城',
  subtitle: '展覽館・電玩城',
  center: [-68, 48],
  islandRadiusX: 33,
  islandRadiusZ: 30,
  plazaRadius: 15,
  defaultSpawn: {
    position: [-64, 0, 44],
    yaw: Math.PI / 2,
  },
  ambientColor: 0xf0f9ff,
  sunColor: 0xfef08a,
  fogColor: 0xe2e8f0,
  fogNear: 65,
  fogFar: 210,
  islandColorHex: 0xd6d3d1,
  plazaColorHex: 0xe7e5e4,
  walkableZones: getGlobalWalkableZones(),
  colliders: [
    ...creativeBuildings.flatMap(generateBuildingWallColliders),
    ...getBridgeSideColliders(),
  ],
  buildings: creativeBuildings,
  portals: [],
};

export const REGION_CAREER: RegionManifest = {
  id: 'region-career',
  name: '徵才島',
  shortName: '徵才島',
  compassLabel: '翰林院・求職廟',
  subtitle: '翰林院・求職廟・人才獵頭/媒合專家',
  center: [72, 48],
  islandRadiusX: 35,
  islandRadiusZ: 31,
  plazaRadius: 18,
  defaultSpawn: {
    position: [72, 0, 50],
    yaw: 0,
  },
  ambientColor: 0xfffbeb,
  sunColor: 0xfde68a,
  fogColor: 0xe2e8f0,
  fogNear: 65,
  fogFar: 210,
  islandColorHex: 0xd6d3d1,
  plazaColorHex: 0xe7e5e4,
  walkableZones: getGlobalWalkableZones(),
  courtyardWalls: careerCourtyardWalls,
  colliders: [
    ...generateCourtyardWallColliders(careerCourtyardWalls),
    ...careerBuildings.flatMap(generateBuildingWallColliders),
    ...getBridgeSideColliders(),
  ],
  buildings: careerBuildings,
  portals: [],
};

export const REGION_CONFIGS: Record<RegionId, RegionManifest> = {
  'region-home': REGION_HOME,
  'region-pain': REGION_PAIN,
  'region-discussion': REGION_DISCUSSION,
  'region-creative': REGION_CREATIVE,
  'region-career': REGION_CAREER,
};

export const ALL_REGION_IDS: RegionId[] = [
  'region-home',
  'region-pain',
  'region-discussion',
  'region-creative',
  'region-career',
];

/**
 * Determine which island region the player is currently in or closest to,
 * and describe the exact walkable space type using the 5 user-defined space names:
 * 主要建築物內 / 廣場內 / 橋上 / 島上 / 徵才島的圍牆內
 */
export function detectPlayerSpatialContext(
  x: number,
  z: number
): {
  regionId: RegionId;
  spaceLabel: string;
  insideBuilding: BuildingInteractable | null;
} {
  // 1. Check if on any bridge (橋上)
  for (const b of WORLD_BRIDGES) {
    const dx = b.x2 - b.x1;
    const dz = b.z2 - b.z1;
    const lenSq = dx * dx + dz * dz;
    const t = ((x - b.x1) * dx + (z - b.z1) * dz) / lenSq;
    if (t >= 0 && t <= 1) {
      const projX = b.x1 + t * dx;
      const projZ = b.z1 + t * dz;
      const lateral = Math.hypot(x - projX, z - projZ);
      if (lateral <= b.halfWidth + 0.3) {
        const nearestRegion = t < 0.5 ? b.fromRegionId : b.toRegionId;
        return {
          regionId: nearestRegion,
          spaceLabel: `橋上（${b.name}）`,
          insideBuilding: null,
        };
      }
    }
  }

  // 2. Find nearest island region
  let bestRegion: RegionManifest = REGION_HOME;
  let bestDist = Infinity;
  for (const id of ALL_REGION_IDS) {
    const r = REGION_CONFIGS[id];
    const d = Math.hypot(x - r.center[0], z - r.center[1]);
    if (d < bestDist) {
      bestDist = d;
      bestRegion = r;
    }
  }

  // 3. Check if inside any main building on this island (主要建築物內)
  for (const b of bestRegion.buildings) {
    const relX = x - b.position.x;
    const relZ = z - b.position.z;
    const c = Math.cos(b.facingYaw);
    const s = Math.sin(b.facingYaw);
    const lx = relX * c - relZ * s;
    const lz = relX * s + relZ * c;
    if (Math.abs(lx) <= b.width / 2 && Math.abs(lz) <= b.depth / 2) {
      return {
        regionId: bestRegion.id,
        spaceLabel: `主要建築物內（${b.name}）`,
        insideBuilding: b,
      };
    }
  }

  // 4. Check if inside Career Island Courtyard Walls (徵才島的圍牆內)
  if (
    bestRegion.id === 'region-career' &&
    x >= 48 &&
    x <= 96 &&
    z >= 28 &&
    z <= 68
  ) {
    return {
      regionId: 'region-career',
      spaceLabel: '徵才島的圍牆內',
      insideBuilding: null,
    };
  }

  // 5. Check if inside the island's central plaza (廣場內)
  if (bestDist <= bestRegion.plazaRadius) {
    return {
      regionId: bestRegion.id,
      spaceLabel:
        bestRegion.id === 'region-home'
          ? '廣場內（中央廣場）'
          : bestRegion.id === 'region-creative'
          ? '廣場內（薈萃廣場）'
          : `廣場內（${bestRegion.name}廣場）`,
      insideBuilding: null,
    };
  }

  // 6. On the island (島上)
  return {
    regionId: bestRegion.id,
    spaceLabel: `島上（${bestRegion.name}）`,
    insideBuilding: null,
  };
}
