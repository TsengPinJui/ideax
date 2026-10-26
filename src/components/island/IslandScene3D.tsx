import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export type TimeOfDayPhase = 'morning' | 'noon' | 'dusk' | 'night';
export type TimeOfDayMode = 'auto' | TimeOfDayPhase;
export type WeatherType = 'clear' | 'rain';
export type WeatherMode = 'auto' | WeatherType;

export interface TimeOfDayConfig {
  id: TimeOfDayPhase;
  clearLabel: string;
  rainLabel: string;
  shortLabel: string;
  timeRange: string;
  badgeColor: string;
}

export const TIME_OF_DAY_CONFIGS: Record<TimeOfDayPhase, TimeOfDayConfig> = {
  morning: {
    id: 'morning',
    clearLabel: '清晨・霧濛濛',
    rainLabel: '清晨・雨霧',
    shortLabel: '清晨',
    timeRange: '05:00–09:59',
    badgeColor: '#6b8e9b',
  },
  noon: {
    id: 'noon',
    clearLabel: '中午・陽光',
    rainLabel: '中午・雨天',
    shortLabel: '中午',
    timeRange: '10:00–15:59',
    badgeColor: '#2e8b9a',
  },
  dusk: {
    id: 'dusk',
    clearLabel: '傍晚・夕陽',
    rainLabel: '傍晚・雨夕',
    shortLabel: '傍晚',
    timeRange: '16:00–18:59',
    badgeColor: '#c86432',
  },
  night: {
    id: 'night',
    clearLabel: '晚上・月光',
    rainLabel: '晚上・雨夜',
    shortLabel: '晚上',
    timeRange: '19:00–04:59',
    badgeColor: '#283c66',
  },
};

export function getSceneTitle(phase: TimeOfDayPhase, weather: WeatherType): string {
  const cfg = TIME_OF_DAY_CONFIGS[phase];
  return weather === 'rain' ? cfg.rainLabel : cfg.clearLabel;
}

const SHICHEN_LIST: Array<{ name: string; alias: string }> = [
  { name: '子時', alias: '夜半' }, // 23:00 - 00:59
  { name: '丑時', alias: '雞鳴' }, // 01:00 - 02:59
  { name: '寅時', alias: '平旦' }, // 03:00 - 04:59
  { name: '卯時', alias: '日出' }, // 05:00 - 06:59
  { name: '辰時', alias: '食時' }, // 07:00 - 08:59
  { name: '巳時', alias: '隅中' }, // 09:00 - 10:59
  { name: '午時', alias: '日中' }, // 11:00 - 12:59
  { name: '未時', alias: '日昳' }, // 13:00 - 14:59
  { name: '申時', alias: '哺時' }, // 15:00 - 16:59
  { name: '酉時', alias: '日入' }, // 17:00 - 18:59
  { name: '戌時', alias: '黃昏' }, // 19:00 - 20:59
  { name: '亥時', alias: '人定' }, // 21:00 - 22:59
];

export function getShichenByHour(hour: number): { name: string; alias: string } {
  const index = Math.floor(((hour + 1) % 24) / 2);
  return SHICHEN_LIST[index] || SHICHEN_LIST[0];
}

export function getDisplayShichen(
  timeMode: TimeOfDayMode,
  utc8Info: { hour: number; timeString: string },
): { shichenName: string; shichenAlias: string; detailText: string } {
  if (timeMode === 'auto') {
    const sc = getShichenByHour(utc8Info.hour);
    return {
      shichenName: sc.name,
      shichenAlias: sc.alias,
      detailText: `${sc.name} · ${sc.alias}（${utc8Info.timeString}）`,
    };
  }
  const presetMap: Record<TimeOfDayPhase, { name: string; alias: string }> = {
    morning: { name: '辰時', alias: '食時' },
    noon: { name: '午時', alias: '日中' },
    dusk: { name: '酉時', alias: '日入' },
    night: { name: '子時', alias: '夜半' },
  };
  const sc = presetMap[timeMode];
  return {
    shichenName: sc.name,
    shichenAlias: sc.alias,
    detailText: `${sc.name} · ${sc.alias}`,
  };
}

export function getUtc8TimeInfo(now = new Date()): {
  hour: number;
  minute: number;
  timeString: string;
  phase: TimeOfDayPhase;
  shichenName: string;
  shichenAlias: string;
} {
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const utc8Date = new Date(utcMs + 8 * 3600000);
  const hour = utc8Date.getHours();
  const minute = utc8Date.getMinutes();
  const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  let phase: TimeOfDayPhase;
  if (hour >= 5 && hour < 10) {
    phase = 'morning';
  } else if (hour >= 10 && hour < 16) {
    phase = 'noon';
  } else if (hour >= 16 && hour < 19) {
    phase = 'dusk';
  } else {
    phase = 'night';
  }

  const sc = getShichenByHour(hour);
  return { hour, minute, timeString, phase, shichenName: sc.name, shichenAlias: sc.alias };
}

export interface IslandViewTransform {
  zoom: number;
  pitch: number; // degrees: 26 ~ 74 (default 48)
  yaw: number;   // degrees: -180 ~ 180 (default 0)
  panX: number;  // screen-like pan offset (-800 ~ 800)
  panY: number;  // screen-like pan offset (-600 ~ 600)
}

import {
  IslandAvatarAllocation,
  IslandBuildingId,
  IslandBuildingStats,
} from '../../utils/islandPresence';

export interface IslandLabelOverlay {
  id: string;
  islandId: string;
  districtId?: string;
  streetId?: string;
  buildingId?: IslandBuildingId;
  title: string;
  subtitle?: string;
  worldPos: [number, number, number];
  imgPos: [number, number]; // percentage [x%, y%] on the 2nd/3rd map panorama
  isSecondary?: boolean;
  kind: 'island' | 'building';
  isStaticOnly?: boolean;
  tier?: 1 | 2 | 3;
}

interface IslandScene3DProps {
  view: IslandViewTransform;
  timePhase: TimeOfDayPhase;
  weather: WeatherType;
  selectedIslandId: string | null;
  contentCounts: Record<string, number>;
  avatars?: IslandAvatarAllocation[];
  buildingStats?: Record<IslandBuildingId, IslandBuildingStats>;
  onSelectIsland: (islandId: string, districtId?: string, streetId?: string) => void;
  onFocusIsland?: (islandId: string) => void;
}

// 一級地名：島名標籤（< 75% 遠景俯瞰時顯示；點擊島名自動聚焦到 100% 並顯示建築物與分展區）
export const ISLAND_NAME_LABELS: IslandLabelOverlay[] = [
  {
    id: 'island-label-pain',
    islandId: 'pain',
    districtId: 'pain-innovation-tower',
    title: '痛點島',
    worldPos: [-32, 15.6, -24.5],
    imgPos: [27.5, 11.2],
    kind: 'island',
    tier: 1,
  },
  {
    id: 'island-label-discussion',
    islandId: 'discussion',
    title: '討論島',
    worldPos: [32, 13.8, -24.5],
    imgPos: [77.1, 18.8],
    kind: 'island',
    tier: 1,
  },
  {
    id: 'island-label-home',
    islandId: 'home',
    title: '主島',
    worldPos: [0, 14.5, -1.0],
    imgPos: [50.4, 37.8],
    kind: 'island',
    tier: 1,
  },
  {
    id: 'island-label-creative',
    islandId: 'creative',
    districtId: 'creative-exhibition',
    title: '創意島',
    worldPos: [-32, 12.6, 24.0],
    imgPos: [14.9, 50.6],
    kind: 'island',
    tier: 1,
  },
  {
    id: 'island-label-career',
    islandId: 'career',
    title: '徵才島',
    worldPos: [32, 13.8, 24.0],
    imgPos: [88.3, 53.0],
    kind: 'island',
    tier: 1,
  },
];

// 二級地名與三級地名標籤：
// 二級地名：75% 以上（包含）且 < 100% 時只顯示二級（各島主要建築/核心分區）
// 三級地名：100% 以上（包含）才能顯示三級（各展位、看板、電玩展區與獨立媒合處）
export const BUILDING_NAME_LABELS: IslandLabelOverlay[] = [
  // 1. 主島（中央廣場、貿易街）
  {
    id: 'bldg-home-plaza',
    islandId: 'home',
    districtId: 'main-plaza',
    buildingId: 'home-plaza',
    title: '中央廣場',
    worldPos: [0, 12.2, -1.2],
    imgPos: [50.4, 37.8],
    kind: 'building',
    tier: 2,
  },
  {
    id: 'bldg-home-explore',
    islandId: 'home',
    districtId: 'main-plaza',
    title: '探索看板',
    worldPos: [-4.6, 8.4, -2.8],
    imgPos: [46.5, 36.2],
    kind: 'building',
    isSecondary: true,
    tier: 3,
  },
  {
    id: 'bldg-home-map',
    islandId: 'home',
    districtId: 'main-plaza',
    title: '島覽地圖',
    worldPos: [4.6, 8.4, -2.8],
    imgPos: [54.5, 36.2],
    kind: 'building',
    isSecondary: true,
    tier: 3,
  },
  {
    id: 'bldg-home-agents',
    islandId: 'home',
    districtId: 'main-plaza',
    title: '角色介紹',
    worldPos: [0, 8.8, 3.8],
    imgPos: [50.4, 42.5],
    kind: 'building',
    isSecondary: true,
    tier: 3,
  },
  {
    id: 'bldg-home-trade',
    islandId: 'home',
    districtId: 'main-trade',
    buildingId: 'home-trade-street',
    title: '貿易街(開發中)',
    worldPos: [6.8, 7.5, 4.8],
    imgPos: [56.8, 43.5],
    kind: 'building',
    isSecondary: true,
    isStaticOnly: true,
    tier: 2,
  },

  // 2. 痛點島（創點樓）
  {
    id: 'bldg-pain-tower',
    islandId: 'pain',
    districtId: 'pain-innovation-tower',
    buildingId: 'pain-innovation-tower',
    title: '創點樓',
    worldPos: [-32.5, 13.8, -24.8],
    imgPos: [27.5, 11.2],
    kind: 'building',
    tier: 2,
  },
  {
    id: 'bldg-pain-bounty',
    islandId: 'pain',
    districtId: 'pain-innovation-tower',
    title: '懸賞牆',
    worldPos: [-35.5, 9.2, -26.0],
    imgPos: [24.5, 10.0],
    kind: 'building',
    isSecondary: true,
    tier: 3,
  },
  {
    id: 'bldg-pain-posting',
    islandId: 'pain',
    districtId: 'pain-innovation-tower',
    title: '佈告桌',
    worldPos: [-29.5, 8.8, -23.5],
    imgPos: [30.5, 12.5],
    kind: 'building',
    isSecondary: true,
    tier: 3,
  },

  // 3. 創意島（展覽館、電玩城）
  {
    id: 'bldg-creative-exhibition',
    islandId: 'creative',
    districtId: 'creative-exhibition',
    buildingId: 'creative-exhibition',
    title: '展覽館',
    worldPos: [-35.8, 10.4, 21.5],
    imgPos: [14.9, 50.6],
    kind: 'building',
    tier: 2,
  },
  {
    id: 'bldg-creative-ai-booth',
    islandId: 'creative',
    districtId: 'creative-exhibition',
    title: 'AI工具展場',
    worldPos: [-38.8, 7.8, 18.5],
    imgPos: [12.0, 48.0],
    kind: 'building',
    isSecondary: true,
    tier: 3,
  },
  {
    id: 'bldg-creative-software-booth',
    islandId: 'creative',
    districtId: 'creative-exhibition',
    title: '軟體應用展場',
    worldPos: [-36.2, 7.6, 25.2],
    imgPos: [15.2, 54.0],
    kind: 'building',
    isSecondary: true,
    tier: 3,
  },
  {
    id: 'bldg-creative-proposal-booth',
    islandId: 'creative',
    districtId: 'creative-exhibition',
    title: '創新提案展場',
    worldPos: [-32.5, 7.6, 18.0],
    imgPos: [18.5, 47.5],
    kind: 'building',
    isSecondary: true,
    tier: 3,
  },
  {
    id: 'bldg-creative-arcade',
    islandId: 'creative',
    districtId: 'creative-arcade',
    buildingId: 'creative-arcade',
    title: '電玩城',
    worldPos: [-27.2, 8.2, 28.2],
    imgPos: [26.4, 64.2],
    kind: 'building',
    tier: 2,
  },
  // 電玩城下轄不同種類遊戲分展區（三級地名，100% 顯示）
  {
    id: 'bldg-arcade-casual',
    islandId: 'creative',
    districtId: 'creative-arcade',
    streetId: 'game-street-休閒派對',
    title: '休閒派對展區',
    worldPos: [-24.2, 7.8, 29.5],
    imgPos: [28.0, 65.5],
    kind: 'building',
    isSecondary: true,
    tier: 3,
  },
  {
    id: 'bldg-arcade-puzzle',
    islandId: 'creative',
    districtId: 'creative-arcade',
    streetId: 'game-street-策略益智',
    title: '策略益智展區',
    worldPos: [-27.5, 7.8, 32.2],
    imgPos: [25.5, 68.0],
    kind: 'building',
    isSecondary: true,
    tier: 3,
  },
  {
    id: 'bldg-arcade-arena',
    islandId: 'creative',
    districtId: 'creative-arcade',
    streetId: 'game-street-競技對戰',
    title: '競技對戰展區',
    worldPos: [-30.2, 7.8, 28.5],
    imgPos: [23.0, 64.0],
    kind: 'building',
    isSecondary: true,
    tier: 3,
  },
  {
    id: 'bldg-arcade-adventure',
    islandId: 'creative',
    districtId: 'creative-arcade',
    streetId: 'game-street-解謎劇情',
    title: '冒險解謎展區',
    worldPos: [-28.5, 7.8, 25.0],
    imgPos: [25.0, 61.5],
    kind: 'building',
    isSecondary: true,
    tier: 3,
  },
  {
    id: 'bldg-arcade-sim',
    islandId: 'creative',
    districtId: 'creative-arcade',
    streetId: 'game-street-模擬體驗',
    title: '模擬體驗展區',
    worldPos: [-24.5, 7.8, 25.8],
    imgPos: [28.5, 62.5],
    kind: 'building',
    isSecondary: true,
    tier: 3,
  },

  // 4. 討論島（藏書閣、工作坊、茶藝街）
  {
    id: 'bldg-discussion-library',
    islandId: 'discussion',
    districtId: 'discussion-academic-district',
    buildingId: 'discussion-library',
    title: '藏書閣',
    worldPos: [28.2, 11.6, -26.5],
    imgPos: [73.0, 16.5],
    kind: 'building',
    tier: 2,
  },
  {
    id: 'bldg-discussion-workshop',
    islandId: 'discussion',
    districtId: 'discussion-tech-district',
    buildingId: 'discussion-workshop',
    title: '工作坊',
    worldPos: [36.2, 10.0, -25.0],
    imgPos: [81.0, 18.8],
    kind: 'building',
    tier: 2,
  },
  {
    id: 'bldg-discussion-street',
    islandId: 'discussion',
    districtId: 'discussion-daily-district',
    buildingId: 'discussion-street',
    title: '茶藝街',
    worldPos: [32.0, 7.8, -18.2],
    imgPos: [77.1, 24.0],
    kind: 'building',
    tier: 2,
  },

  // 5. 徵才島（翰林院、求職廟、人才獵頭/媒合專家）
  {
    id: 'bldg-career-academy',
    islandId: 'career',
    districtId: 'career-hanlin-district',
    buildingId: 'career-academy',
    title: '翰林院',
    worldPos: [28.4, 10.6, 22.8],
    imgPos: [84.0, 51.0],
    kind: 'building',
    tier: 2,
  },
  {
    id: 'bldg-career-temple',
    islandId: 'career',
    districtId: 'career-temple-district',
    buildingId: 'career-temple',
    title: '求職廟',
    worldPos: [35.8, 11.4, 24.2],
    imgPos: [91.0, 54.5],
    kind: 'building',
    tier: 2,
  },
  {
    id: 'bldg-career-headhunter',
    islandId: 'career',
    districtId: 'career-headhunter-district',
    streetId: 'hanlin-headhunter-street',
    title: '人才獵頭/媒合專家',
    worldPos: [25.0, 7.6, 26.2],
    imgPos: [80.5, 54.5],
    kind: 'building',
    isSecondary: true,
    tier: 3,
  },
];

export const ISLAND_3D_LABELS: IslandLabelOverlay[] = [
  ...ISLAND_NAME_LABELS,
  ...BUILDING_NAME_LABELS,
];

export const ISLAND_WORLD_CENTERS: Record<string, [number, number]> = {
  home: [0, 0],
  pain: [-32, -24],
  discussion: [32, -24],
  creative: [-32, 24],
  career: [32, 24],
};

// Target lighting & atmosphere presets for the 4 UTC+8 time phases
const PHASE_ATMOS: Record<
  TimeOfDayPhase,
  {
    bgColor: number;
    fogColor: number;
    fogDensity: number;
    waterColor: number;
    seabedColor: number;
    hemiSky: number;
    hemiGround: number;
    hemiIntensity: number;
    sunColor: number;
    sunIntensity: number;
    sunPos: [number, number, number];
    rimColor: number;
    rimIntensity: number;
    exposure: number;
    windowEmissive: number;
    lanternEmissive: number;
    bulbLightIntensity: number;
    islandNightLightIntensity: number;
    cloudColor: number;
    cloudOpacity: number;
    morningMistOpacity: number;
    moonOpacity: number;
    sunsetGlowOpacity: number;
  }
> = {
  // 清晨・霧濛濛 (Refined to match file_00000000403082068134621cc6cae39f.png: poetic warm-silver valley mist, sage-jade water, soft warm morning sunlight)
  morning: {
    bgColor: 0xc8d6d4,
    fogColor: 0xe6ece9,
    fogDensity: 0.0028,
    waterColor: 0x5c9699,
    seabedColor: 0x3b6e72,
    hemiSky: 0xf7f9f6,
    hemiGround: 0x6f8c82,
    hemiIntensity: 1.0,
    sunColor: 0xfff0d4,
    sunIntensity: 1.55,
    sunPos: [-40, 38, 26],
    rimColor: 0xdceceb,
    rimIntensity: 0.72,
    exposure: 1.05,
    windowEmissive: 0.75,
    lanternEmissive: 1.15,
    bulbLightIntensity: 3.4,
    islandNightLightIntensity: 0.9,
    cloudColor: 0xf7faf9,
    cloudOpacity: 0.88,
    morningMistOpacity: 0.24,
    moonOpacity: 0,
    sunsetGlowOpacity: 0,
  },
  // 中午・陽光
  noon: {
    bgColor: 0x52a3b0,
    fogColor: 0xd5ecee,
    fogDensity: 0.0016,
    waterColor: 0x3da1ad,
    seabedColor: 0x246f7a,
    hemiSky: 0xfff9eb,
    hemiGround: 0x3f8892,
    hemiIntensity: 0.95,
    sunColor: 0xffefd1,
    sunIntensity: 2.3,
    sunPos: [-32, 58, 32],
    rimColor: 0x9be7ef,
    rimIntensity: 0.75,
    exposure: 1.12,
    windowEmissive: 0.5,
    lanternEmissive: 0.9,
    bulbLightIntensity: 2.8,
    islandNightLightIntensity: 0.25,
    cloudColor: 0xffffff,
    cloudOpacity: 0.82,
    morningMistOpacity: 0.0,
    moonOpacity: 0,
    sunsetGlowOpacity: 0,
  },
  // 傍晚・夕陽
  dusk: {
    bgColor: 0xc97b63,
    fogColor: 0xd99b7e,
    fogDensity: 0.0024,
    waterColor: 0x4d7a8c,
    seabedColor: 0x2d495c,
    hemiSky: 0xffb07c,
    hemiGround: 0x594257,
    hemiIntensity: 0.82,
    sunColor: 0xff7b3d,
    sunIntensity: 2.1,
    sunPos: [12, 24, -48],
    rimColor: 0xffb86c,
    rimIntensity: 0.95,
    exposure: 1.0,
    windowEmissive: 1.65,
    lanternEmissive: 2.0,
    bulbLightIntensity: 4.6,
    islandNightLightIntensity: 2.8,
    cloudColor: 0xf5baa2,
    cloudOpacity: 0.8,
    morningMistOpacity: 0.1,
    moonOpacity: 0,
    sunsetGlowOpacity: 0.92,
  },
  // 晚上・月光
  night: {
    bgColor: 0x162642,
    fogColor: 0x1d3152,
    fogDensity: 0.0022,
    waterColor: 0x1c4966,
    seabedColor: 0x0f283d,
    hemiSky: 0x4b74b8,
    hemiGround: 0x152238,
    hemiIntensity: 0.58,
    sunColor: 0x8ab4f8,
    sunIntensity: 0.95,
    sunPos: [28, 44, -38],
    rimColor: 0x6ea8ff,
    rimIntensity: 0.65,
    exposure: 0.92,
    windowEmissive: 2.45,
    lanternEmissive: 2.75,
    bulbLightIntensity: 6.4,
    islandNightLightIntensity: 4.5,
    cloudColor: 0x3b5278,
    cloudOpacity: 0.65,
    morningMistOpacity: 0.1,
    moonOpacity: 1.0,
    sunsetGlowOpacity: 0,
  },
};

export const IslandScene3D: React.FC<IslandScene3DProps> = ({
  view,
  timePhase,
  weather,
  selectedIslandId,
  contentCounts,
  avatars = [],
  buildingStats,
  onSelectIsland,
  onFocusIsland,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [webglFailed, setWebglFailed] = useState(false);

  const viewRef = useRef<IslandViewTransform>(view);
  viewRef.current = view;

  const timePhaseRef = useRef<TimeOfDayPhase>(timePhase);
  timePhaseRef.current = timePhase;

  const weatherRef = useRef<WeatherType>(weather);
  weatherRef.current = weather;

  const selectedIslandRef = useRef<string | null>(selectedIslandId);
  selectedIslandRef.current = selectedIslandId;

  const avatarsRef = useRef<IslandAvatarAllocation[]>(avatars);
  avatarsRef.current = avatars;

  const onSelectRef = useRef(onSelectIsland);
  onSelectRef.current = onSelectIsland;

  const onFocusIslandRef = useRef(onFocusIsland);
  onFocusIslandRef.current = onFocusIsland;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    const gl = renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|Software|Microsoft Basic Render/i.test(rendererStr);

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const handleContextLost = (event: Event) => {
      event.preventDefault();
    };
    canvas.addEventListener('webglcontextlost', handleContextLost, false);

    // Scene & Atmosphere
    const initialAtmos = PHASE_ATMOS[timePhaseRef.current];
    const scene = new THREE.Scene();
    const bgColor = new THREE.Color(initialAtmos.bgColor);
    const fogColor = new THREE.Color(initialAtmos.fogColor);
    scene.background = bgColor;
    const fog = new THREE.FogExp2(fogColor, initialAtmos.fogDensity);
    scene.fog = fog;

    // PMREM Environment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // Camera (far plane increased to 950 so high/distant sun, moon & clouds never clip)
    const camera = new THREE.PerspectiveCamera(
      36,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      1,
      950,
    );

    // Lighting Setup
    const hemiLight = new THREE.HemisphereLight(
      initialAtmos.hemiSky,
      initialAtmos.hemiGround,
      initialAtmos.hemiIntensity,
    );
    hemiLight.position.set(0, 60, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(initialAtmos.sunColor, initialAtmos.sunIntensity);
    sunLight.position.set(...initialAtmos.sunPos);
    sunLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      sunLight.shadow.mapSize.set(2048, 2048);
      sunLight.shadow.camera.near = 10;
      sunLight.shadow.camera.far = 220;
      const d = 82;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.bias = -0.0005;
      sunLight.shadow.normalBias = 0.02;
    }
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(initialAtmos.rimColor, initialAtmos.rimIntensity);
    rimLight.position.set(42, 28, -36);
    scene.add(rimLight);

    // Shared Materials Palette
    const mats = {
      grassTop: new THREE.MeshStandardMaterial({ color: 0x8fb863, roughness: 0.85 }),
      grassLush: new THREE.MeshStandardMaterial({ color: 0x739e4f, roughness: 0.85 }),
      cliffRock: new THREE.MeshStandardMaterial({ color: 0x9b8361, roughness: 0.9, flatShading: true }),
      cliffDark: new THREE.MeshStandardMaterial({ color: 0x6f5e48, roughness: 0.92, flatShading: true }),
      stonePlaza: new THREE.MeshStandardMaterial({ color: 0xf1e5c9, roughness: 0.72 }),
      stoneStep: new THREE.MeshStandardMaterial({ color: 0xe3d3b1, roughness: 0.78 }),
      stoneGrey: new THREE.MeshStandardMaterial({ color: 0xb7b9b4, roughness: 0.75 }),
      woodWarm: new THREE.MeshStandardMaterial({ color: 0xb87642, roughness: 0.68 }),
      woodDark: new THREE.MeshStandardMaterial({ color: 0x694227, roughness: 0.76 }),
      vermilion: new THREE.MeshStandardMaterial({ color: 0xc8412b, roughness: 0.55 }),
      wallCream: new THREE.MeshStandardMaterial({ color: 0xf6eedc, roughness: 0.7 }),
      roofSlate: new THREE.MeshStandardMaterial({ color: 0x2c3b47, roughness: 0.48, metalness: 0.18 }),
      roofBlue: new THREE.MeshStandardMaterial({ color: 0x355873, roughness: 0.45, metalness: 0.18 }),
      roofJade: new THREE.MeshStandardMaterial({ color: 0x2b7561, roughness: 0.42, metalness: 0.2 }),
      goldTrim: new THREE.MeshStandardMaterial({ color: 0xf4bd3e, roughness: 0.28, metalness: 0.72 }),
      bulbGold: new THREE.MeshPhysicalMaterial({
        color: 0xffd23f,
        emissive: 0xff9d00,
        emissiveIntensity: 0.65,
        roughness: 0.18,
        metalness: 0.15,
        clearcoat: 0.8,
      }),
      bulbRing: new THREE.MeshStandardMaterial({
        color: 0xffe066,
        emissive: 0xffae00,
        emissiveIntensity: 0.85,
        roughness: 0.25,
        metalness: 0.5,
      }),
      lanternGlow: new THREE.MeshStandardMaterial({
        color: 0xff3b1f,
        emissive: 0xff4500,
        emissiveIntensity: initialAtmos.lanternEmissive,
        roughness: 0.3,
      }),
      windowGlow: new THREE.MeshStandardMaterial({
        color: 0xffe39f,
        emissive: 0xffa726,
        emissiveIntensity: initialAtmos.windowEmissive,
        roughness: 0.4,
      }),
      skylightGlass: new THREE.MeshPhysicalMaterial({
        color: 0x6ec6eb,
        emissive: 0x2176a6,
        emissiveIntensity: 0.3,
        roughness: 0.15,
        metalness: 0.1,
        transmission: 0.45,
        transparent: true,
        opacity: 0.9,
      }),
      arcadeDark: new THREE.MeshStandardMaterial({ color: 0x2d333b, roughness: 0.5, metalness: 0.25 }),
      gamepadWhite: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.1 }),
      sakuraPink: new THREE.MeshStandardMaterial({ color: 0xffb3c6, roughness: 0.75, flatShading: true }),
      sakuraLight: new THREE.MeshStandardMaterial({ color: 0xffd6e0, roughness: 0.75, flatShading: true }),
      pineGreen: new THREE.MeshStandardMaterial({ color: 0x3b6e4c, roughness: 0.82, flatShading: true }),
      pineLight: new THREE.MeshStandardMaterial({ color: 0x568c58, roughness: 0.82, flatShading: true }),
      mountainGreen: new THREE.MeshStandardMaterial({ color: 0x4f7856, roughness: 0.88, flatShading: true }),
      mountainRock: new THREE.MeshStandardMaterial({ color: 0x768272, roughness: 0.9, flatShading: true }),
      cloudWhite: new THREE.MeshStandardMaterial({
        color: initialAtmos.cloudColor,
        roughness: 0.95,
        transparent: true,
        opacity: initialAtmos.cloudOpacity,
        flatShading: true,
      }),
      morningMistMat: new THREE.MeshStandardMaterial({
        color: 0xf2f6f5,
        roughness: 1.0,
        transparent: true,
        opacity: initialAtmos.morningMistOpacity,
        flatShading: true,
      }),
      waterFoam: new THREE.MeshBasicMaterial({ color: 0xeafaf8, transparent: true, opacity: 0.72 }),
      sailCream: new THREE.MeshStandardMaterial({ color: 0xfbf3df, roughness: 0.65, side: THREE.DoubleSide }),
      stallBlue: new THREE.MeshStandardMaterial({ color: 0x3d85c6, roughness: 0.6 }),
      stallRed: new THREE.MeshStandardMaterial({ color: 0xd9534f, roughness: 0.6 }),
      stallGold: new THREE.MeshStandardMaterial({ color: 0xf0ad4e, roughness: 0.6 }),
      dirtPathMat: new THREE.MeshStandardMaterial({ color: 0x93764d, roughness: 0.95 }),
      riceShootMat: new THREE.MeshStandardMaterial({ color: 0x48a832, roughness: 0.8, flatShading: true }),
      paddyWaterMat: new THREE.MeshStandardMaterial({ color: 0x3d949b, roughness: 0.18, metalness: 0.22 }),
      mountainMidMat: new THREE.MeshStandardMaterial({ color: 0x395b4c, roughness: 0.92, flatShading: true }),
      mountainFarMat: new THREE.MeshStandardMaterial({ color: 0x496372, roughness: 0.95, transparent: true, opacity: 0.65, flatShading: true }),
      mountainInfiniteMat: new THREE.MeshStandardMaterial({ color: 0x6e8494, roughness: 1.0, transparent: true, opacity: 0.35, flatShading: true }),
      caveRockMat: new THREE.MeshStandardMaterial({ color: 0x24282e, roughness: 0.95, flatShading: true }),
      caveWaterMat: new THREE.MeshStandardMaterial({ color: 0x1f7a8c, roughness: 0.12, metalness: 0.35, emissive: 0x0a3340, emissiveIntensity: 0.35 }),
      oxBrownMat: new THREE.MeshStandardMaterial({ color: 0xb5783f, roughness: 0.82 }),
      oxHornMat: new THREE.MeshStandardMaterial({ color: 0x3d352e, roughness: 0.6 }),
      farmerRobeBlue: new THREE.MeshStandardMaterial({ color: 0x3b6278, roughness: 0.85 }),
      bambooStrawMat: new THREE.MeshStandardMaterial({ color: 0xd4b26f, roughness: 0.88 }),
      egretFeatherMat: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 }),
      egretBeakMat: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 }),
      sheepWoolMat: new THREE.MeshStandardMaterial({ color: 0xf4f0e6, roughness: 0.95 }),
      pigSkinMat: new THREE.MeshStandardMaterial({ color: 0xf8b4be, roughness: 0.68 }),
      chickenFeatherMat: new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.75 }),
      roosterCombMat: new THREE.MeshStandardMaterial({ color: 0xd92b2b, roughness: 0.6 }),
    };

    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    const clickableIslands: THREE.Object3D[] = [];
    const enableShadows = (obj: THREE.Object3D) => {
      obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = !isSoftwareGl;
          child.receiveShadow = !isSoftwareGl;
        }
      });
    };

    // =========================================================
    // 1. WATER SURFACE & SHALLOWS
    // =========================================================
    const waterGeo = new THREE.PlaneGeometry(780, 780, 64, 64);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: initialAtmos.waterColor,
      roughness: 0.22,
      metalness: 0.14,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = -0.6;
    waterMesh.receiveShadow = !isSoftwareGl;
    worldGroup.add(waterMesh);

    const seabedMat = new THREE.MeshBasicMaterial({ color: initialAtmos.seabedColor });
    const seabedMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(780, 780).rotateX(-Math.PI / 2),
      seabedMat,
    );
    seabedMesh.position.y = -2.2;
    worldGroup.add(seabedMesh);

    // =========================================================
    // CELESTIAL BODIES (掛在更遠更高的天際高空) & 3D RAIN SYSTEM
    // =========================================================
    const celestialGroup = new THREE.Group();
    worldGroup.add(celestialGroup);

    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xfff8dc,
      transparent: true,
      opacity: initialAtmos.moonOpacity,
      fog: false,
    });
    const moonHaloMat = new THREE.MeshBasicMaterial({
      color: 0xdbeafe,
      transparent: true,
      opacity: initialAtmos.moonOpacity * 0.28,
      fog: false,
      depthWrite: false,
    });
    const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(6.8, 28, 28), moonMat);
    moonMesh.position.set(52, 88, -198);
    const moonHaloMesh = new THREE.Mesh(new THREE.SphereGeometry(12.4, 24, 24), moonHaloMat);
    moonMesh.add(moonHaloMesh);
    celestialGroup.add(moonMesh);

    const sunsetSunMat = new THREE.MeshBasicMaterial({
      color: 0xffa952,
      transparent: true,
      opacity: initialAtmos.sunsetGlowOpacity,
      fog: false,
    });
    const sunsetHaloMat = new THREE.MeshBasicMaterial({
      color: 0xff7b3d,
      transparent: true,
      opacity: initialAtmos.sunsetGlowOpacity * 0.3,
      fog: false,
      depthWrite: false,
    });
    const sunsetSunMesh = new THREE.Mesh(new THREE.SphereGeometry(8.6, 28, 28), sunsetSunMat);
    sunsetSunMesh.position.set(-22, 72, -196);
    const sunsetHaloMesh = new THREE.Mesh(new THREE.SphereGeometry(15.2, 24, 24), sunsetHaloMat);
    sunsetSunMesh.add(sunsetHaloMesh);
    celestialGroup.add(sunsetSunMesh);

    // 清晨與正午高掛遠方天際的太陽
    const initialDaySunOp =
      timePhaseRef.current === 'morning' || timePhaseRef.current === 'noon' ? 0.95 : 0;
    const daySunMat = new THREE.MeshBasicMaterial({
      color: 0xfff3cc,
      transparent: true,
      opacity: initialDaySunOp,
      fog: false,
    });
    const daySunHaloMat = new THREE.MeshBasicMaterial({
      color: 0xffe49e,
      transparent: true,
      opacity: initialDaySunOp * 0.28,
      fog: false,
      depthWrite: false,
    });
    const daySunMesh = new THREE.Mesh(new THREE.SphereGeometry(7.6, 28, 28), daySunMat);
    daySunMesh.position.set(-54, 94, -192);
    const daySunHaloMesh = new THREE.Mesh(new THREE.SphereGeometry(14.0, 24, 24), daySunHaloMat);
    daySunMesh.add(daySunHaloMesh);
    celestialGroup.add(daySunMesh);

    // Starfield for Night Mode (高遠夜空星河)
    const starCount = 220;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 320;
      starPositions[i * 3 + 1] = 48 + Math.random() * 88;
      starPositions[i * 3 + 2] = -150 - Math.random() * 75;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xfff6d6,
      size: 0.95,
      transparent: true,
      opacity: initialAtmos.moonOpacity,
      fog: false,
    });
    const starField = new THREE.Points(starGeo, starMat);
    celestialGroup.add(starField);

    // 3D Falling Rain Streaks (for 雨霧 / 雨天 / 雨夕 / 雨夜)
    const rainDropCount = 900;
    const rainPositions = new Float32Array(rainDropCount * 2 * 3);
    for (let i = 0; i < rainDropCount; i++) {
      const rx = (Math.random() - 0.5) * 110;
      const ry = Math.random() * 42;
      const rz = (Math.random() - 0.5) * 90;
      const idx = i * 6;
      rainPositions[idx] = rx;
      rainPositions[idx + 1] = ry;
      rainPositions[idx + 2] = rz;
      rainPositions[idx + 3] = rx - 0.35;
      rainPositions[idx + 4] = ry - 1.65;
      rainPositions[idx + 5] = rz;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.LineBasicMaterial({
      color: 0xdbeeff,
      transparent: true,
      opacity: weatherRef.current === 'rain' ? 0.52 : 0,
    });
    const rainLines = new THREE.LineSegments(rainGeo, rainMat);
    worldGroup.add(rainLines);

    // Expanding Water Ripples on the river surface during Rain
    const rainRipples: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; phase: number }> = [];
    const rippleCoords: Array<[number, number]> = [
      [-12, 0],
      [12, 0],
      [0, -14],
      [0, 14],
      [-15, -10],
      [15, -10],
      [-15, 10],
      [15, 10],
      [-8, 18],
      [8, 18],
      [-6, -20],
      [6, -20],
    ];
    rippleCoords.forEach(([rx, rz], idx) => {
      const rMat = new THREE.MeshBasicMaterial({
        color: 0xe6f9ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
      });
      const rMesh = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.58, 24).rotateX(-Math.PI / 2), rMat);
      rMesh.position.set(rx, -0.52, rz);
      worldGroup.add(rMesh);
      rainRipples.push({ mesh: rMesh, mat: rMat, phase: idx * 0.55 });
    });

    // Warm Island Point Lights
    const islandNightLights: THREE.PointLight[] = [];
    const islandLightCoords: Array<[number, number, number, number]> = [
      [-32, 9.5, -23, 0xff7b29], // 痛點島 創點樓
      [32, 8.5, -23, 0xff9e44],  // 討論島 圖書館與討論街
      [-32, 8.0, 24, 0xffaa44],  // 創意島 展覽館與電玩城
      [32, 8.5, 24, 0xff7b29],   // 徵才島 求職廟與翰林院
    ];
    islandLightCoords.forEach(([lx, ly, lz, col]) => {
      const pLight = new THREE.PointLight(col, initialAtmos.islandNightLightIntensity, 32, 1.5);
      pLight.position.set(lx, ly, lz);
      worldGroup.add(pLight);
      islandNightLights.push(pLight);
    });

    // =========================================================
    // HELPER BUILDERS (Trees, Pavilions, Lanterns, Organic Island Base)
    // =========================================================
    const createOrganicShape = (
      radiusX: number,
      radiusZ: number,
      seed: number,
      elongateSouth = 0,
    ) => {
      const pts: THREE.Vector2[] = [];
      const segments = 32;
      for (let i = 0; i < segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        const wave =
          1 +
          0.045 * Math.sin(a * 3 + seed) +
          0.032 * Math.cos(a * 5 - seed * 1.7) +
          0.02 * Math.sin(a * 2 + seed * 0.8);
        const rx = radiusX * wave;
        let rz = radiusZ * wave;
        if (elongateSouth > 0 && Math.sin(a) > 0) {
          rz += elongateSouth * Math.pow(Math.sin(a), 1.6);
        }
        pts.push(new THREE.Vector2(Math.cos(a) * rx, Math.sin(a) * rz));
      }
      const shape = new THREE.Shape();
      shape.moveTo(pts[0].x, pts[0].y);
      shape.splineThru([...pts.slice(1), pts[0]]);
      return shape;
    };

    const createIslandBase = (
      islandId: string,
      x: number,
      z: number,
      radiusX: number,
      radiusZ: number,
      height = 3.2,
    ) => {
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      group.userData = { islandId };

      const seed =
        islandId === 'home'
          ? 1.2
          : islandId === 'pain'
          ? 2.5
          : islandId === 'discussion'
          ? 3.8
          : islandId === 'creative'
          ? 5.1
          : 6.4;
      const elongateSouth = islandId === 'home' ? 2.4 : 0;

      // 單一有機不規則島嶼岸線（向下深扎至河床 y = -2.1，絕不懸浮或堆疊圓盤）
      const baseShape = createOrganicShape(radiusX * 0.98, radiusZ * 0.98, seed, elongateSouth);
      const rockExtrude = new THREE.ExtrudeGeometry(baseShape, {
        depth: height + 1.4,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 1,
        bevelSize: 0.78,
        bevelThickness: 0.35,
        curveSegments: 24,
      });
      rockExtrude.rotateX(Math.PI / 2);
      const rockMesh = new THREE.Mesh(rockExtrude, mats.cliffRock);
      rockMesh.position.y = height - 0.35;
      group.add(rockMesh);

      const grassShape = createOrganicShape(radiusX * 0.97, radiusZ * 0.97, seed, elongateSouth);
      const grassExtrude = new THREE.ExtrudeGeometry(grassShape, {
        depth: 0.16,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.38,
        bevelThickness: 0.16,
        curveSegments: 24,
      });
      grassExtrude.rotateX(Math.PI / 2);
      const grassCap = new THREE.Mesh(grassExtrude, mats.grassTop);
      grassCap.position.y = height + 0.16;
      group.add(grassCap);

      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + seed * 0.4;
        const rx = Math.cos(angle) * radiusX * 0.98;
        const rz = Math.sin(angle) * radiusZ * 0.98;
        const rock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.95 + (i % 3) * 0.3, 0),
          mats.cliffRock,
        );
        rock.position.set(rx, height * 0.28, rz);
        rock.scale.set(1.2, 1.1, 1.1);
        group.add(rock);
      }

      enableShadows(group);
      worldGroup.add(group);
      clickableIslands.push(group);
      return { group, topY: height + 0.32 };
    };

    const willowCrownDarkMat = new THREE.MeshStandardMaterial({
      color: 0x5c9640,
      roughness: 0.8,
      flatShading: true,
    });
    const willowCrownLightMat = new THREE.MeshStandardMaterial({
      color: 0x7ab856,
      roughness: 0.78,
      flatShading: true,
    });
    const willowFrondMat = new THREE.MeshStandardMaterial({
      color: 0x6ead4b,
      roughness: 0.75,
    });
    const bambooStalkMat = new THREE.MeshStandardMaterial({
      color: 0x4d8a42,
      roughness: 0.55,
    });
    const lotusLeafMat = new THREE.MeshStandardMaterial({
      color: 0x3f824d,
      roughness: 0.7,
      side: THREE.DoubleSide,
    });

    const swayingWillowFronds: Array<{ group: THREE.Group; phase: number }> = [];
    const swayingTrees: Array<{ group: THREE.Group; phase: number; amp: number }> = [];
    const swayingRiceShoots: Array<{ mesh: THREE.Mesh; baseX: number; baseZ: number; phase: number }> = [];

    // 桃花樹（隱世桃源粉嫩桃花林，微風中隨風輕擺）
    const createSakuraTree = (scale = 1, canSway = true) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 1.65, 7), mats.woodDark);
      trunk.position.y = 0.82;
      trunk.rotation.z = 0.06;
      tree.add(trunk);

      const crownGroup = new THREE.Group();
      const blobs: Array<[number, number, number, number]> = [
        [0, 1.95, 0, 1.08],
        [-0.68, 1.68, 0.36, 0.82],
        [0.68, 1.72, -0.32, 0.85],
        [0.15, 2.38, 0.25, 0.75],
      ];
      blobs.forEach(([bx, by, bz, br], idx) => {
        const crown = new THREE.Mesh(
          new THREE.IcosahedronGeometry(br, 1),
          idx % 2 === 0 ? mats.sakuraPink : mats.sakuraLight,
        );
        crown.position.set(bx, by, bz);
        crown.scale.set(1.18, 0.86, 1.18);
        crownGroup.add(crown);
      });
      tree.add(crownGroup);

      if (canSway) {
        swayingTrees.push({
          group: crownGroup,
          phase: Math.random() * Math.PI * 2,
          amp: 0.045,
        });
      }

      tree.scale.setScalar(scale);
      enableShadows(tree);
      return tree;
    };

    // 平地綠樹專用：江南垂柳（微彎樹幹、展開枝枒、翠綠柳冠與隨風搖曳的垂柳絲絛）
    const createWillowTree = (scale = 1) => {
      const tree = new THREE.Group();

      // 微彎古樸柳樹主幹
      const lowerTrunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.3, 1.25, 7),
        mats.woodDark,
      );
      lowerTrunk.position.set(0, 0.6, 0);
      lowerTrunk.rotation.z = 0.08;
      tree.add(lowerTrunk);

      const upperTrunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.19, 1.15, 7),
        mats.woodDark,
      );
      upperTrunk.position.set(0.08, 1.62, 0.04);
      upperTrunk.rotation.z = -0.06;
      tree.add(upperTrunk);

      // 3 根向四周舒展的分枝
      const branchAngles = [0.4, 2.5, 4.6];
      branchAngles.forEach((bAngle) => {
        const branch = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.1, 1.05, 6),
          mats.woodDark,
        );
        branch.position.set(Math.cos(bAngle) * 0.38, 2.15, Math.sin(bAngle) * 0.38);
        branch.rotation.z = -Math.cos(bAngle) * 0.55;
        branch.rotation.x = Math.sin(bAngle) * 0.55;
        tree.add(branch);
      });

      // 頂部蓬鬆溫潤的柳冠團簇
      const crownClouds: Array<[number, number, number, number]> = [
        [0, 2.65, 0, 1.05],
        [-0.72, 2.42, 0.42, 0.82],
        [0.75, 2.45, -0.38, 0.85],
        [-0.35, 2.48, -0.68, 0.78],
        [0.42, 2.44, 0.65, 0.8],
      ];
      crownClouds.forEach(([cx, cy, cz, cr], idx) => {
        const dome = new THREE.Mesh(
          new THREE.IcosahedronGeometry(cr, 1),
          idx % 2 === 0 ? willowCrownLightMat : willowCrownDarkMat,
        );
        dome.position.set(cx, cy, cz);
        dome.scale.set(1.22, 0.68, 1.22);
        tree.add(dome);
      });

      // 垂掛而下的江南柳絲絛（12 束修長柳條環繞樹冠自然下垂，並加入微風擺動群組）
      const frondGroup = new THREE.Group();
      frondGroup.position.set(0, 2.48, 0);
      const frondCount = 12;
      for (let i = 0; i < frondCount; i++) {
        const angle = (i / frondCount) * Math.PI * 2 + (i % 2) * 0.12;
        const radius = 0.82 + (i % 3) * 0.22;
        const frondLen = 1.45 + (i % 3) * 0.24;
        const fx = Math.cos(angle) * radius;
        const fz = Math.sin(angle) * radius;

        const strand = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.11, frondLen, 5),
          i % 2 === 0 ? willowFrondMat : willowCrownLightMat,
        );
        strand.position.set(fx, -frondLen * 0.48, fz);
        strand.rotation.z = Math.cos(angle) * 0.08;
        strand.rotation.x = Math.sin(angle) * 0.08;
        frondGroup.add(strand);
      }
      tree.add(frondGroup);
      swayingWillowFronds.push({
        group: frondGroup,
        phase: swayPhaseCounter++ * 0.75,
      });

      tree.scale.setScalar(scale);
      enableShadows(tree);
      return tree;
    };

    // 山上專用：蒼翠古松／迎客松（盤曲枝幹與層疊水平松針雲片）
    const createPineTree = (scale = 1) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 1.65, 6), mats.woodDark);
      trunk.position.y = 0.82;
      trunk.rotation.z = 0.08;
      tree.add(trunk);

      // 迎客松側伸枝幹
      const sideBranch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.12, 1.1, 5),
        mats.woodDark,
      );
      sideBranch.position.set(0.42, 1.45, 0.1);
      sideBranch.rotation.z = -0.68;
      tree.add(sideBranch);

      // 層疊蒼翠松針層
      const pineLayers: Array<[number, number, number, number, number]> = [
        [0, 1.55, 0, 1.25, 0.95],
        [0.52, 1.78, 0.12, 0.92, 0.72],
        [-0.28, 2.15, -0.1, 1.02, 0.88],
        [0.08, 2.72, 0.05, 0.82, 0.82],
      ];
      pineLayers.forEach(([lx, ly, lz, lr, lh], idx) => {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(lr, lh, 7),
          idx % 2 === 0 ? mats.pineGreen : mats.pineLight,
        );
        cone.position.set(lx, ly, lz);
        cone.scale.set(1.18, 1, 1.12);
        tree.add(cone);
      });
      tree.scale.setScalar(scale);
      enableShadows(tree);
      return tree;
    };

    // 江南太湖石假山與翠竹叢（點綴於庭院、亭台與橋畔，營造隱世桃源意境）
    const createTaihuRockAndBamboo = (scale = 1) => {
      const grp = new THREE.Group();

      // 太湖石主峰與副石（瘦、皺、漏、透）
      const mainRock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.72, 0), mats.stoneGrey);
      mainRock.position.set(0, 0.58, 0);
      mainRock.scale.set(0.85, 1.45, 0.72);
      mainRock.rotation.z = 0.15;
      grp.add(mainRock);

      const sideRock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.52, 0), mats.stoneGrey);
      sideRock.position.set(-0.52, 0.36, 0.24);
      sideRock.scale.set(1.1, 0.95, 0.85);
      grp.add(sideRock);

      // 3 竿修長翠竹與竹葉
      const bambooOffsets: Array<[number, number, number, number]> = [
        [0.42, 0.18, 2.35, 0.06],
        [0.64, -0.12, 2.05, -0.08],
        [0.24, -0.26, 1.85, 0.04],
      ];
      bambooOffsets.forEach(([bx, bz, bh, tilt]) => {
        const stalk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.055, bh, 6),
          bambooStalkMat,
        );
        stalk.position.set(bx, bh * 0.5, bz);
        stalk.rotation.z = tilt;
        grp.add(stalk);

        const foliage = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.42, 0),
          willowCrownLightMat,
        );
        foliage.position.set(bx - tilt * 0.8, bh * 0.92, bz);
        foliage.scale.set(1.25, 0.55, 1.1);
        grp.add(foliage);
      });

      grp.scale.setScalar(scale);
      enableShadows(grp);
      return grp;
    };

    // 江南白牆黛瓦馬頭牆（徽派／蘇式高低跌落山牆）
    const createMatouGablePair = (width: number, height: number, depth: number) => {
      const gableGroup = new THREE.Group();
      [-width * 0.51, width * 0.51].forEach((gx) => {
        // 白牆山牆主體
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, height * 1.08, depth * 1.04),
          mats.wallCream,
        );
        wall.position.set(gx, height * 0.54, 0);
        gableGroup.add(wall);

        // 三階跌落式黛瓦馬頭簷頂
        const steps: Array<[number, number, number]> = [
          [0, height * 1.14, depth * 0.42],
          [-depth * 0.34, height * 0.98, depth * 0.32],
          [depth * 0.34, height * 0.98, depth * 0.32],
        ];
        steps.forEach(([sz, sy, sLen]) => {
          const cap = new THREE.Mesh(
            new THREE.BoxGeometry(0.32, 0.16, sLen),
            mats.roofSlate,
          );
          cap.position.set(gx, sy, sz);
          gableGroup.add(cap);
        });
      });
      return gableGroup;
    };

    // 江南碧水荷花叢與蓮花河燈（點綴於橋畔與島嶼淺灘）
    const createLotusPatch = (x: number, z: number, padCount = 5) => {
      const patch = new THREE.Group();
      patch.position.set(x, -0.53, z);
      for (let i = 0; i < padCount; i++) {
        const a = (i / padCount) * Math.PI * 2 + 0.4;
        const dist = 0.55 + (i % 3) * 0.58;
        const px = Math.cos(a) * dist;
        const pz = Math.sin(a) * dist;
        const padR = 0.38 + (i % 2) * 0.14;

        const pad = new THREE.Mesh(
          new THREE.CylinderGeometry(padR, padR, 0.03, 12, 1, false, 0, Math.PI * 1.85),
          lotusLeafMat,
        );
        pad.position.set(px, 0, pz);
        pad.rotation.y = i * 1.3;
        patch.add(pad);

        if (i % 2 === 0) {
          const flower = new THREE.Mesh(
            new THREE.ConeGeometry(0.18, 0.24, 7),
            i === 0 ? mats.lanternGlow : mats.sakuraPink,
          );
          flower.position.set(px, 0.12, pz);
          flower.rotation.x = Math.PI;
          patch.add(flower);
        }
      }
      worldGroup.add(patch);
    };

    const createChineseRoof = (width: number, depth: number, height: number, mat: THREE.Material) => {
      const roofGroup = new THREE.Group();
      const mainRoof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(width, depth) * 0.78, height, 4), mat);
      mainRoof.rotation.y = Math.PI / 4;
      mainRoof.scale.set(width / Math.max(width, depth), 1, depth / Math.max(width, depth));
      mainRoof.position.y = height * 0.5;
      roofGroup.add(mainRoof);

      const skirt = new THREE.Mesh(
        new THREE.BoxGeometry(width * 1.12, 0.22, depth * 1.12),
        mat,
      );
      skirt.position.y = 0.08;
      roofGroup.add(skirt);

      const ridge = new THREE.Mesh(new THREE.BoxGeometry(width * 0.42, 0.18, 0.22), mats.goldTrim);
      ridge.position.y = height * 0.92;
      roofGroup.add(ridge);

      return roofGroup;
    };

    const createClassicalPavilion = (roofMat: THREE.Material = mats.roofSlate) => {
      const pav = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.7, 0.35, 6), mats.stonePlaza);
      base.position.y = 0.18;
      pav.add(base);

      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.65, 6), mats.vermilion);
        col.position.set(Math.cos(a) * 1.2, 1.0, Math.sin(a) * 1.2);
        pav.add(col);
      }

      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.05, 1.25, 6), roofMat);
      roof.position.y = 2.35;
      pav.add(roof);

      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), mats.goldTrim);
      finial.position.y = 3.05;
      pav.add(finial);

      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + 0.5;
        const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), mats.lanternGlow);
        lantern.position.set(Math.cos(a) * 1.35, 1.65, Math.sin(a) * 1.35);
        pav.add(lantern);
      }
      enableShadows(pav);
      return pav;
    };

    // 江南白牆黛瓦茶肆／市集軒坊（取代西式條紋攤棚，更符合江南水鄉古鎮風貌）
    const createMarketStall = (accentMat: THREE.Material) => {
      const stall = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.24, 1.4), mats.stoneStep);
      base.position.y = 0.12;
      stall.add(base);

      const counter = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.72, 1.15), mats.wallCream);
      counter.position.y = 0.52;
      stall.add(counter);

      const woodTrim = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.14, 1.22), mats.woodDark);
      woodTrim.position.y = 0.88;
      stall.add(woodTrim);

      const posts = [
        [-0.86, -0.52],
        [0.86, -0.52],
        [-0.86, 0.52],
        [0.86, 0.52],
      ];
      posts.forEach(([px, pz]) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.55, 6), mats.woodDark);
        post.position.set(px, 0.95, pz);
        stall.add(post);
      });

      // 江南黛瓦飛簷小頂與招幌燈籠
      const roof = createChineseRoof(2.25, 1.58, 0.72, mats.roofSlate);
      roof.position.y = 1.65;
      stall.add(roof);

      const banner = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.62, 0.04), accentMat);
      banner.position.set(1.02, 1.35, 0.56);
      stall.add(banner);

      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), mats.lanternGlow);
      lantern.position.set(-1.02, 1.45, 0.56);
      stall.add(lantern);

      enableShadows(stall);
      return stall;
    };

    const createWaterwheel = () => {
      const wheelGroup = new THREE.Group();
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.14, 8, 20), mats.woodDark);
      wheelGroup.add(rim);

      const innerRim = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.09, 6, 16), mats.woodWarm);
      wheelGroup.add(innerRim);

      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.12, 0.12), mats.woodWarm);
        spoke.rotation.z = angle;
        wheelGroup.add(spoke);

        const paddle = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.45, 0.65), mats.woodWarm);
        paddle.position.set(Math.cos(angle) * 1.65, Math.sin(angle) * 1.65, 0);
        paddle.rotation.z = angle;
        wheelGroup.add(paddle);
      }
      enableShadows(wheelGroup);
      return wheelGroup;
    };

    let swayPhaseCounter = 0;

    // =========================================================
    // 2. CENTRAL ISLAND (主島)
    // =========================================================
    const homeBase = createIslandBase('home', 0, 0, 15.6, 14.6, 3.2);
    const homeY = homeBase.topY;

    // 中央青石八角廣場台基（單層平整青石台，避免圓盤堆疊感）
    const centralPlaza = new THREE.Mesh(
      new THREE.CylinderGeometry(4.8, 5.1, 0.28, 8),
      mats.stonePlaza,
    );
    centralPlaza.position.y = homeY + 0.14;
    homeBase.group.add(centralPlaza);

    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.75, 1.15, 8), mats.stoneStep);
    pedestal.position.y = homeY + 0.85;
    homeBase.group.add(pedestal);

    // 主島中央「經典立體燈泡雕像」（360° 旋轉、玻璃球罩 + 收腰燈頸 + 內部發光鎢絲與燈芯 + 愛迪生金屬螺紋底座）
    const bulbGroup = new THREE.Group();
    bulbGroup.position.set(0, homeY + 4.85, 0);
    homeBase.group.add(bulbGroup);

    // 1. 經典燈泡半透明金黃玻璃罩（上方渾圓球體 + 下方平滑內凹收腰曲線，100% 經典燈泡輪廓）
    const bulbGlassPoints: THREE.Vector2[] = [];
    const neckSteps = 20;
    for (let i = 0; i <= neckSteps; i++) {
      const u = i / neckSteps;
      const y = -1.35 + u * 1.77;
      const s = u * u * (3 - 2 * u);
      const r = 0.88 + Math.pow(s, 1.35) * 1.10;
      bulbGlassPoints.push(new THREE.Vector2(r, y));
    }
    const domeCenterY = 1.15;
    const domeRadius = 2.11;
    const startAngle = Math.asin((0.42 - domeCenterY) / domeRadius);
    const domeSteps = 28;
    for (let i = 1; i <= domeSteps; i++) {
      const v = i / domeSteps;
      const theta = startAngle + v * (Math.PI / 2 - startAngle);
      const r = Math.max(0, Math.cos(theta) * domeRadius);
      const y = domeCenterY + Math.sin(theta) * domeRadius;
      bulbGlassPoints.push(new THREE.Vector2(r, y));
    }

    const bulbGlassGeo = new THREE.LatheGeometry(bulbGlassPoints, 48);
    mats.bulbGold.transparent = true;
    mats.bulbGold.opacity = 0.84;
    mats.bulbGold.roughness = 0.12;
    mats.bulbGold.metalness = 0.05;
    mats.bulbGold.clearcoat = 1.0;
    mats.bulbGold.clearcoatRoughness = 0.08;
    const bulbBodyMesh = new THREE.Mesh(bulbGlassGeo, mats.bulbGold);
    bulbGroup.add(bulbBodyMesh);

    // 2. 燈泡內部發光核心與經典鎢絲支架
    const filamentGlowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });
    const filamentSupportMat = new THREE.MeshStandardMaterial({
      color: 0xd4a338,
      emissive: 0xffae00,
      emissiveIntensity: 0.7,
      roughness: 0.3,
      metalness: 0.8,
    });

    const glassStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.28, 1.45, 16),
      filamentSupportMat,
    );
    glassStem.position.y = -0.68;
    bulbGroup.add(glassStem);

    const stemPinch = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.24, 0.18),
      filamentSupportMat,
    );
    stemPinch.position.y = 0.08;
    bulbGroup.add(stemPinch);

    [-1, 1].forEach((side) => {
      const wire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 1.35, 8),
        filamentSupportMat,
      );
      wire.position.set(side * 0.36, 0.68, 0);
      wire.rotation.z = -side * 0.28;
      bulbGroup.add(wire);
    });

    const filamentArcGeo = new THREE.TorusGeometry(0.62, 0.085, 14, 36, Math.PI * 1.25);
    const filamentArc = new THREE.Mesh(filamentArcGeo, filamentGlowMat);
    filamentArc.position.set(0, 1.25, 0);
    filamentArc.rotation.z = -Math.PI * 0.125;
    bulbGroup.add(filamentArc);

    const filamentArcCross = new THREE.Mesh(filamentArcGeo, filamentGlowMat);
    filamentArcCross.position.set(0, 1.25, 0);
    filamentArcCross.rotation.z = -Math.PI * 0.125;
    filamentArcCross.rotation.y = Math.PI / 2;
    bulbGroup.add(filamentArcCross);

    const filamentCoreSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 20, 20),
      filamentGlowMat,
    );
    filamentCoreSphere.position.set(0, 1.25, 0);
    bulbGroup.add(filamentCoreSphere);

    // 3. 360° 環形立體愛迪生螺紋金屬燈頭
    const screwMetalMat = new THREE.MeshStandardMaterial({
      color: 0x363a40,
      roughness: 0.32,
      metalness: 0.72,
    });
    const screwDarkCapMat = new THREE.MeshStandardMaterial({
      color: 0x181a1d,
      roughness: 0.45,
      metalness: 0.4,
    });

    const neckCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.90, 0.88, 0.22, 36),
      mats.goldTrim,
    );
    neckCollar.position.y = -1.42;
    bulbGroup.add(neckCollar);

    const screwCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.86, 0.78, 1.08, 36),
      screwMetalMat,
    );
    screwCylinder.position.y = -1.98;
    bulbGroup.add(screwCylinder);

    [-1.64, -1.94, -2.24].forEach((ry, idx) => {
      const threadRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.85 - idx * 0.025, 0.115, 16, 40),
        screwMetalMat,
      );
      threadRing.rotation.x = Math.PI / 2;
      threadRing.position.y = ry;
      bulbGroup.add(threadRing);
    });

    const insulatorCone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.74, 0.44, 0.28, 32),
      screwDarkCapMat,
    );
    insulatorCone.position.y = -2.58;
    bulbGroup.add(insulatorCone);

    const bottomContactTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.44, 24, 16, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55),
      screwMetalMat,
    );
    bottomContactTip.position.y = -2.62;
    bulbGroup.add(bottomContactTip);

    // 4. 底座外圍輕盈金色星軌環
    const orbitRingGroup = new THREE.Group();
    orbitRingGroup.position.y = -1.45;
    bulbGroup.add(orbitRingGroup);

    const orbitTorus = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.055, 12, 48), mats.bulbRing);
    orbitTorus.rotation.x = Math.PI / 2;
    orbitRingGroup.add(orbitTorus);

    // 5. 夜晚發光光暈
    const bulbHaloMat = new THREE.MeshBasicMaterial({
      color: 0xffe066,
      transparent: true,
      opacity: timePhaseRef.current === 'night' ? 0.42 : 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const bulbHaloMesh = new THREE.Mesh(new THREE.SphereGeometry(2.75, 28, 28), bulbHaloMat);
    bulbHaloMesh.position.y = 1.15;
    bulbGroup.add(bulbHaloMesh);

    const bulbOuterAuraMat = new THREE.MeshBasicMaterial({
      color: 0xffb733,
      transparent: true,
      opacity: timePhaseRef.current === 'night' ? 0.22 : 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const bulbOuterAuraMesh = new THREE.Mesh(
      new THREE.SphereGeometry(4.4, 28, 28),
      bulbOuterAuraMat,
    );
    bulbOuterAuraMesh.position.y = 1.15;
    bulbGroup.add(bulbOuterAuraMesh);

    const bulbLight = new THREE.PointLight(0xffca4b, initialAtmos.bulbLightIntensity, 48, 1.35);
    bulbLight.position.set(0, homeY + 6.0, 0);
    homeBase.group.add(bulbLight);

    const pavCoords: Array<[number, number]> = [
      [-6.5, -5.2],
      [6.5, -5.2],
      [-6.5, 4.8],
      [6.5, 4.8],
    ];
    pavCoords.forEach(([px, pz]) => {
      const pav = createClassicalPavilion(mats.roofSlate);
      pav.position.set(px, homeY, pz);
      homeBase.group.add(pav);
    });

    const stallLeft = createMarketStall(mats.stallRed);
    stallLeft.position.set(-3.3, homeY + 0.1, 6.6);
    stallLeft.rotation.y = 0.25;
    homeBase.group.add(stallLeft);

    const stallRight = createMarketStall(mats.stallBlue);
    stallRight.position.set(3.3, homeY + 0.1, 6.6);
    stallRight.rotation.y = -0.25;
    homeBase.group.add(stallRight);

    // 主島太湖石假山與翠竹庭院造景
    [
      [-8.4, 1.8, 1.05],
      [8.4, 1.8, 1.05],
    ].forEach(([rx, rz, rScale]) => {
      const rockBamboo = createTaihuRockAndBamboo(rScale);
      rockBamboo.position.set(rx, homeY, rz);
      homeBase.group.add(rockBamboo);
    });

    for (let s = 0; s < 6; s++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.35, 0.7), mats.stoneStep);
      step.position.set(0, homeY - s * 0.45, 7.6 + s * 0.62);
      homeBase.group.add(step);
    }

    // 江南青石水榭碼頭與飛簷接官亭
    const pierGroup = new THREE.Group();
    pierGroup.position.set(0, 0.4, 16.4);
    homeBase.group.add(pierGroup);

    const pierDeck = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.36, 6.8), mats.stonePlaza);
    pierGroup.add(pierDeck);

    // 碼頭上的江南四角飛簷水榭亭
    const pierPavRoof = createChineseRoof(3.8, 3.8, 1.15, mats.roofSlate);
    pierPavRoof.position.set(0, 2.15, 0.8);
    pierGroup.add(pierPavRoof);
    [-1.4, 1.4].forEach((px) => {
      [-0.6, 2.2].forEach((pz) => {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.0, 6), mats.vermilion);
        col.position.set(px, 1.15, pz);
        pierGroup.add(col);
      });
    });

    for (let pz = -2.8; pz <= 2.8; pz += 1.85) {
      [-1.55, 1.55].forEach((px) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.2, 8), mats.stoneGrey);
        post.position.set(px, -0.6, pz);
        pierGroup.add(post);
      });
    }

    // 停泊於主島水榭碼頭畔的江南雕花畫舫
    const sailboat = new THREE.Group();
    sailboat.position.set(3.8, -0.18, 17.6);
    sailboat.rotation.y = -0.38;
    homeBase.group.add(sailboat);

    const mooredHull = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.42, 4.4), mats.woodDark);
    mooredHull.position.y = 0.2;
    sailboat.add(mooredHull);

    const mooredCabin = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.85, 2.3), mats.wallCream);
    mooredCabin.position.y = 0.72;
    sailboat.add(mooredCabin);

    const mooredWin = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.45, 1.45), mats.windowGlow);
    mooredWin.position.y = 0.74;
    sailboat.add(mooredWin);

    const mooredRoof = createChineseRoof(1.75, 2.75, 0.68, mats.roofSlate);
    mooredRoof.position.y = 1.12;
    sailboat.add(mooredRoof);

    const boatLantern = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), mats.lanternGlow);
    boatLantern.position.set(0, 0.95, 1.95);
    sailboat.add(boatLantern);

    // 主島平地樹木：江南垂柳 + 桃花樹（全數穩立於主島草坪內）
    [
      [-9.2, -1.2, 1.12],
      [9.2, -1.0, 1.08],
      [-4.6, -8.2, 0.98],
      [4.6, -8.2, 1.02],
      [-7.4, 6.4, 1.05],
      [7.4, 6.4, 1.05],
    ].forEach(([tx, tz, sc], idx) => {
      const t = idx % 2 === 0 ? createWillowTree(sc) : createSakuraTree(sc);
      t.position.set(tx, homeY, tz);
      homeBase.group.add(t);
    });

    // =========================================================
    // 3. TOP-LEFT ISLAND (痛點島 · 創點樓)
    // =========================================================
    const painBase = createIslandBase('pain', -32, -24, 15.2, 13.6, 3.8);
    const painY = painBase.topY;

    const towerGroup = new THREE.Group();
    towerGroup.position.set(-1.2, painY, -1.2);
    towerGroup.rotation.y = Math.PI / 6;
    painBase.group.add(towerGroup);

    const terrace = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.9, 7.8), mats.stonePlaza);
    terrace.position.y = 0.45;
    towerGroup.add(terrace);

    const floor1 = new THREE.Mesh(new THREE.BoxGeometry(7.6, 2.8, 6.2), mats.vermilion);
    floor1.position.y = 2.25;
    towerGroup.add(floor1);

    const win1 = new THREE.Mesh(new THREE.BoxGeometry(7.72, 1.2, 4.2), mats.windowGlow);
    win1.position.y = 2.35;
    towerGroup.add(win1);

    const roof1 = createChineseRoof(9.4, 8.0, 1.85, mats.roofSlate);
    roof1.position.y = 3.65;
    towerGroup.add(roof1);

    const floor2 = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.2, 4.6), mats.vermilion);
    floor2.position.y = 5.45;
    towerGroup.add(floor2);

    const win2 = new THREE.Mesh(new THREE.BoxGeometry(5.72, 1.0, 3.0), mats.windowGlow);
    win2.position.y = 5.55;
    towerGroup.add(win2);

    const roof2 = createChineseRoof(7.4, 6.2, 1.65, mats.roofSlate);
    roof2.position.y = 6.55;
    towerGroup.add(roof2);

    const floor3 = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.6, 3.2), mats.vermilion);
    floor3.position.y = 8.05;
    towerGroup.add(floor3);

    const roof3 = createChineseRoof(5.4, 4.6, 1.6, mats.roofSlate);
    roof3.position.y = 8.85;
    towerGroup.add(roof3);

    for (let lx = -3.6; lx <= 3.6; lx += 1.8) {
      [-3.6, 3.6].forEach((lz) => {
        const l1 = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), mats.lanternGlow);
        l1.position.set(lx, 3.35, lz);
        l1.scale.set(1, 1.3, 1);
        towerGroup.add(l1);
      });
    }

    for (let s = 0; s < 5; s++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.28, 0.8), mats.stoneStep);
      step.position.set(0, 0.85 - s * 0.16, 4.1 + s * 0.65);
      towerGroup.add(step);
    }

    const painRockBamboo = createTaihuRockAndBamboo(1.1);
    painRockBamboo.position.set(6.2, painY, 2.4);
    painBase.group.add(painRockBamboo);

    // 痛點島平地樹木：江南垂柳 + 桃花樹
    [
      [-7.8, 2.6, 1.2],
      [6.8, -2.2, 1.22],
      [-6.2, -5.8, 1.05],
      [4.5, 5.4, 1.12],
      [-2.2, 7.2, 1.05],
    ].forEach(([tx, tz, sc], idx) => {
      const tree = idx % 2 === 0 ? createWillowTree(sc) : createSakuraTree(sc);
      tree.position.set(tx, painY, tz);
      painBase.group.add(tree);
    });

    // =========================================================
    // 4. TOP-RIGHT ISLAND (討論島 · 江南白牆黛瓦藏書閣與水榭工作坊)
    // =========================================================
    const discBase = createIslandBase('discussion', 32, -24, 15.4, 13.8, 3.6);
    const discY = discBase.topY;

    const libGroup = new THREE.Group();
    libGroup.position.set(1.2, discY, -2.0);
    libGroup.rotation.y = -Math.PI / 6;
    discBase.group.add(libGroup);

    const libFound = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.65, 5.4), mats.stonePlaza);
    libFound.position.y = 0.32;
    libGroup.add(libFound);

    const libBody = new THREE.Mesh(new THREE.BoxGeometry(6.8, 2.7, 4.4), mats.wallCream);
    libBody.position.y = 1.95;
    libGroup.add(libBody);

    // 藏書閣兩側江南白牆黛瓦馬頭牆
    const libMatou = createMatouGablePair(6.8, 2.7, 4.4);
    libMatou.position.y = 0.62;
    libGroup.add(libMatou);

    const libDoor = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 4.55), mats.windowGlow);
    libDoor.position.y = 1.65;
    libGroup.add(libDoor);

    const libRoof1 = createChineseRoof(8.2, 5.8, 1.65, mats.roofSlate);
    libRoof1.position.y = 3.3;
    libGroup.add(libRoof1);

    const libUpper = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.4, 3.0), mats.wallCream);
    libUpper.position.y = 4.65;
    libGroup.add(libUpper);

    const libRoof2 = createChineseRoof(5.8, 4.2, 1.45, mats.roofSlate);
    libRoof2.position.y = 5.35;
    libGroup.add(libRoof2);

    [-5.8, 5.8].forEach((wx) => {
      const wk = new THREE.Group();
      wk.position.set(wx, 0, 2.4);
      const wBody = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.8, 2.8), mats.wallCream);
      wBody.position.y = 0.9;
      wk.add(wBody);
      const wkMatou = createMatouGablePair(3.4, 1.8, 2.8);
      wk.add(wkMatou);
      const wWin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 2.9), mats.windowGlow);
      wWin.position.y = 0.85;
      wk.add(wWin);
      const wRoof = createChineseRoof(4.2, 3.5, 1.15, mats.roofSlate);
      wRoof.position.y = 1.8;
      wk.add(wRoof);
      libGroup.add(wk);
    });

    // 江南庭院石桌石凳與紙傘茶席
    [
      [-2.2, 4.2],
      [1.8, 4.6],
      [-0.4, 6.2],
    ].forEach(([tx, tz]) => {
      const tableGrp = new THREE.Group();
      tableGrp.position.set(tx, 0, tz);
      const table = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.55, 0.55, 8), mats.stonePlaza);
      table.position.y = 0.28;
      tableGrp.add(table);
      const umbrella = new THREE.Mesh(new THREE.ConeGeometry(1.05, 0.45, 10), mats.sailCream);
      umbrella.position.y = 1.35;
      tableGrp.add(umbrella);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.3, 6), mats.woodDark);
      pole.position.y = 0.65;
      tableGrp.add(pole);
      libGroup.add(tableGrp);
    });

    const discRockBamboo = createTaihuRockAndBamboo(1.1);
    discRockBamboo.position.set(-6.4, discY, -4.2);
    discBase.group.add(discRockBamboo);

    const discWheel = createWaterwheel();
    discWheel.position.set(-13.8, 1.5, -5.2);
    discWheel.rotation.y = Math.PI / 4;
    discBase.group.add(discWheel);

    // 討論島平地樹木：江南垂柳 + 桃花樹
    [
      [-7.6, 2.8, 1.15],
      [7.8, -1.8, 1.2],
      [5.5, 5.5, 1.08],
      [-2.8, 7.6, 1.05],
    ].forEach(([tx, tz, sc], idx) => {
      const tree = idx % 2 === 0 ? createWillowTree(sc) : createSakuraTree(sc);
      tree.position.set(tx, discY, tz);
      discBase.group.add(tree);
    });

    // =========================================================
    // 5. BOTTOM-LEFT ISLAND (創意島 · 展覽館 + 電玩城)
    // =========================================================
    const creativeBase = createIslandBase('creative', -32, 24, 15.4, 13.8, 3.2);
    const creativeY = creativeBase.topY;

    const exhibGroup = new THREE.Group();
    exhibGroup.position.set(-4.2, creativeY, -2.2);
    exhibGroup.rotation.y = Math.PI / 6;
    creativeBase.group.add(exhibGroup);

    const exhibWall = new THREE.Mesh(new THREE.BoxGeometry(6.8, 2.8, 5.2), mats.wallCream);
    exhibWall.position.y = 1.4;
    exhibGroup.add(exhibWall);

    const exhibMatou = createMatouGablePair(6.8, 2.8, 5.2);
    exhibGroup.add(exhibMatou);

    const exhibRoofFrame = createChineseRoof(7.8, 6.2, 1.5, mats.roofSlate);
    exhibRoofFrame.position.y = 2.8;
    exhibGroup.add(exhibRoofFrame);

    const skylight = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.45, 3.6), mats.skylightGlass);
    skylight.position.y = 3.55;
    exhibGroup.add(skylight);

    const exhibPortal = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.9, 5.35), mats.windowGlow);
    exhibPortal.position.y = 1.1;
    exhibGroup.add(exhibPortal);

    const arcadeGroup = new THREE.Group();
    arcadeGroup.position.set(3.6, creativeY, 3.2);
    arcadeGroup.rotation.y = Math.PI / 6;
    arcadeGroup.userData = { islandId: 'creative', districtId: 'creative-arcade' };
    creativeBase.group.add(arcadeGroup);

    const arcadeBody = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.5, 4.6), mats.arcadeDark);
    arcadeBody.position.y = 1.25;
    arcadeGroup.add(arcadeBody);

    const arcadeRoofTrim = createChineseRoof(6.4, 5.4, 1.15, mats.roofSlate);
    arcadeRoofTrim.position.y = 2.45;
    arcadeGroup.add(arcadeRoofTrim);

    const arcadeDoor = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.65, 4.72), mats.windowGlow);
    arcadeDoor.position.y = 0.95;
    arcadeGroup.add(arcadeDoor);

    const gamepadGroup = new THREE.Group();
    gamepadGroup.position.set(0, 3.85, 0);
    gamepadGroup.rotation.x = 0.25;
    arcadeGroup.add(gamepadGroup);

    const padCenter = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.45, 1.25), mats.gamepadWhite);
    gamepadGroup.add(padCenter);

    const gripLeft = new THREE.Mesh(new THREE.CapsuleGeometry(0.48, 0.95, 8, 12), mats.gamepadWhite);
    gripLeft.position.set(-1.1, -0.05, 0.35);
    gripLeft.rotation.x = Math.PI / 2;
    gripLeft.rotation.z = 0.32;
    gamepadGroup.add(gripLeft);

    const gripRight = new THREE.Mesh(new THREE.CapsuleGeometry(0.48, 0.95, 8, 12), mats.gamepadWhite);
    gripRight.position.set(1.1, -0.05, 0.35);
    gripRight.rotation.x = Math.PI / 2;
    gripRight.rotation.z = -0.32;
    gamepadGroup.add(gripRight);

    const dpadH = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.18), mats.arcadeDark);
    dpadH.position.set(-0.75, 0.26, -0.05);
    gamepadGroup.add(dpadH);
    const dpadV = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.55), mats.arcadeDark);
    dpadV.position.set(-0.75, 0.26, -0.05);
    gamepadGroup.add(dpadV);

    const btnA = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.16, 10), mats.stallRed);
    btnA.position.set(0.75, 0.26, 0.15);
    gamepadGroup.add(btnA);

    const btnB = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.16, 10), mats.stallBlue);
    btnB.position.set(0.98, 0.26, -0.1);
    gamepadGroup.add(btnB);

    const btnY = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.16, 10), mats.stallGold);
    btnY.position.set(0.55, 0.26, -0.15);
    gamepadGroup.add(btnY);

    const creativeRockBamboo = createTaihuRockAndBamboo(1.08);
    creativeRockBamboo.position.set(3.2, creativeY, -4.8);
    creativeBase.group.add(creativeRockBamboo);

    const creativeWheel = createWaterwheel();
    creativeWheel.position.set(13.6, 1.4, 5.8);
    creativeWheel.rotation.y = -Math.PI / 5;
    creativeBase.group.add(creativeWheel);

    // 創意島平地樹木：江南垂柳 + 桃花樹
    [
      [-8.5, 3.2, 1.18],
      [7.8, -2.5, 1.15],
      [-2.2, 7.6, 1.08],
      [-7.5, -6.2, 1.1],
    ].forEach(([tx, tz, sc], idx) => {
      const tree = idx % 2 === 0 ? createWillowTree(sc) : createSakuraTree(sc);
      tree.position.set(tx, creativeY, tz);
      creativeBase.group.add(tree);
    });

    // =========================================================
    // 6. BOTTOM-RIGHT ISLAND (徵才島 · 翰林院 · 求職廟)
    // =========================================================
    const careerBase = createIslandBase('career', 32, 24, 15.4, 13.8, 3.4);
    const careerY = careerBase.topY;

    const hanlinGroup = new THREE.Group();
    hanlinGroup.position.set(-4.6, careerY, -2.6);
    hanlinGroup.rotation.y = -Math.PI / 6;
    careerBase.group.add(hanlinGroup);

    for (let tier = 0; tier < 3; tier++) {
      const w = 4.2 - tier * 0.75;
      const h = 1.75;
      const yPos = tier * 1.95;
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mats.wallCream);
      body.position.y = yPos + h * 0.5;
      hanlinGroup.add(body);

      const roof = createChineseRoof(w + 1.15, w + 1.15, 1.15, mats.roofJade);
      roof.position.y = yPos + h;
      hanlinGroup.add(roof);
    }

    const templeGroup = new THREE.Group();
    templeGroup.position.set(3.2, careerY, -0.5);
    templeGroup.rotation.y = -Math.PI / 6;
    careerBase.group.add(templeGroup);

    const templePlatform = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.75, 6.6), mats.stonePlaza);
    templePlatform.position.y = 0.38;
    templeGroup.add(templePlatform);

    const templeHall = new THREE.Mesh(new THREE.BoxGeometry(6.8, 2.7, 5.2), mats.vermilion);
    templeHall.position.y = 2.05;
    templeGroup.add(templeHall);

    const templeDoors = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.85, 5.35), mats.windowGlow);
    templeDoors.position.y = 1.75;
    templeGroup.add(templeDoors);

    const templeRoof1 = createChineseRoof(8.6, 6.8, 1.7, mats.roofJade);
    templeRoof1.position.y = 3.4;
    templeGroup.add(templeRoof1);

    const templeUpper = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.5, 3.6), mats.vermilion);
    templeUpper.position.y = 4.85;
    templeGroup.add(templeUpper);

    const templeRoof2 = createChineseRoof(6.6, 5.2, 1.65, mats.roofJade);
    templeRoof2.position.y = 5.6;
    templeGroup.add(templeRoof2);

    for (let lx = -2.8; lx <= 2.8; lx += 1.85) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), mats.lanternGlow);
      l.position.set(lx, 3.15, 3.1);
      l.scale.set(1, 1.3, 1);
      templeGroup.add(l);
    }

    const paifang = new THREE.Group();
    paifang.position.set(-2.2, careerY, 5.5);
    paifang.rotation.y = -Math.PI / 6;
    careerBase.group.add(paifang);

    [-2.1, -0.75, 0.75, 2.1].forEach((px) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 3.2, 8), mats.vermilion);
      pillar.position.set(px, 1.6, 0);
      paifang.add(pillar);
    });
    const beam1 = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.32, 0.45), mats.goldTrim);
    beam1.position.y = 2.75;
    paifang.add(beam1);

    const topArchRoof = createChineseRoof(5.2, 1.3, 0.85, mats.roofJade);
    topArchRoof.position.y = 3.1;
    paifang.add(topArchRoof);

    const careerRockBamboo = createTaihuRockAndBamboo(1.1);
    careerRockBamboo.position.set(6.8, careerY, -5.2);
    careerBase.group.add(careerRockBamboo);

    // 徵才島平地樹木：江南垂柳 + 桃花樹
    [
      [8.2, 3.8, 1.2],
      [-7.8, 2.2, 1.15],
      [6.5, -5.8, 1.1],
      [-5.2, -6.8, 1.05],
    ].forEach(([tx, tz, sc], idx) => {
      const tree = idx % 2 === 0 ? createWillowTree(sc) : createSakuraTree(sc);
      tree.position.set(tx, careerY, tz);
      careerBase.group.add(tree);
    });

    // =========================================================
    // 7. 江南青石拱橋與橋上垂釣客 NPC (TRADITIONAL JIANGNAN STONE ARCHED BRIDGES & ANGLERS)
    // =========================================================
    const animatedAnglers: Array<{ rodGroup: THREE.Group; phase: number }> = [];
    const anglerRobeMats = [
      new THREE.MeshStandardMaterial({ color: 0x365b6d, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x4b6b53, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x6b5344, roughness: 0.8 }),
    ];
    const anglerSkinMat = new THREE.MeshStandardMaterial({ color: 0xffe0bd, roughness: 0.65 });
    const fishingLineMat = new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.75,
    });

    // 橋上垂釣客 NPC（頭戴斗笠或髮髻，手握修長竹魚竿倚欄垂釣，屬於場景 NPC，頭上無倒三角）
    const createBridgeAnglerNPC = (sideDir: 1 | -1, robeIdx: number, phase: number) => {
      const angler = new THREE.Group();
      // 面向橋外水面 (+X 或 -X)
      angler.rotation.y = sideDir > 0 ? Math.PI / 2 : -Math.PI / 2;

      const legs = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.1, 0.42, 6),
        mats.woodDark,
      );
      legs.position.y = 0.21;
      angler.add(legs);

      const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.2, 0.56, 8),
        anglerRobeMats[robeIdx % anglerRobeMats.length],
      );
      torso.position.y = 0.62;
      angler.add(torso);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), anglerSkinMat);
      head.position.set(0, 1.0, 0.02);
      angler.add(head);

      const hat = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.16, 10), mats.bambooStrawMat);
      hat.position.set(0, 1.12, 0.02);
      hat.rotation.x = 0.12;
      angler.add(hat);

      // 竹魚竿與垂入水面的釣線、紅白浮標
      const rodGroup = new THREE.Group();
      rodGroup.position.set(0.08, 0.72, 0.18);

      const rodPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.028, 2.65, 6),
        mats.bambooStrawMat,
      );
      rodPole.rotation.x = Math.PI / 2.8;
      rodPole.position.set(0, 0.42, 1.18);
      rodGroup.add(rodPole);

      // 釣線（自竿尖垂直落向橋下水面）
      const lineLen = 4.5;
      const fishingLine = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.005, lineLen, 4),
        fishingLineMat,
      );
      fishingLine.position.set(0, 0.85 - lineLen * 0.5, 2.38);
      rodGroup.add(fishingLine);

      // 水面紅白釣魚浮標
      const bobber = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 6, 6),
        mats.stallRed,
      );
      bobber.position.set(0, 0.85 - lineLen, 2.38);
      bobber.scale.set(1, 1.4, 1);
      rodGroup.add(bobber);

      angler.add(rodGroup);
      animatedAnglers.push({ rodGroup, phase });
      return angler;
    };

    // 全部橋樑皆採用中式江南青石單孔拱橋（含圓弧石拱券、兩端青石橋台、階梯石板橋面、雕花青石欄板與蓮花望柱）
    const createArchedBridge = (
      x1: number,
      z1: number,
      x2: number,
      z2: number,
      bridgeIdx = 0,
    ) => {
      const bridge = new THREE.Group();
      const midX = (x1 + x2) / 2;
      const midZ = (z1 + z2) / 2;
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.hypot(dx, dz);
      const angle = Math.atan2(dx, dz);

      bridge.position.set(midX, 2.35, midZ);
      bridge.rotation.y = angle;

      const segments = 15;
      const segLen = len / segments;
      const bridgeWidth = 2.95;
      const archRise = 2.45;

      // 兩端青石橋台墩座（深入水面與島基，零縫隙銜接島岸石板路）
      [-0.47, 0.47].forEach((endT) => {
        const abutment = new THREE.Mesh(
          new THREE.BoxGeometry(bridgeWidth * 1.18, 3.2, segLen * 2.2),
          mats.stoneGrey,
        );
        abutment.position.set(0, -1.25, endT * len);
        bridge.add(abutment);
      });

      // 兩端實體石階引道踏步與深厚基座（嚴禁斷橋：向外延伸並深入島嶼石板走道，絕無懸空隙縫）
      [-1, 1].forEach((dir) => {
        const rampSteps = 4;
        const rampStepLen = segLen * 0.72;
        for (let s = 0; s < rampSteps; s++) {
          const dist = len * 0.5 + (s + 0.5) * rampStepLen;
          const stepY = archRise * 0.05 - s * 0.22;
          const rampStep = new THREE.Mesh(
            new THREE.BoxGeometry(bridgeWidth * 1.08, 0.36, rampStepLen * 1.08),
            s % 2 === 0 ? mats.stonePlaza : mats.stoneStep,
          );
          rampStep.position.set(0, stepY, dir * dist);
          bridge.add(rampStep);
        }

        // 深厚穩固基石墩座（直接向下扎根至島基與水底，深達 y = -2.8）
        const foundation = new THREE.Mesh(
          new THREE.BoxGeometry(bridgeWidth * 1.35, 4.6, segLen * 3.2),
          mats.stoneGrey,
        );
        foundation.position.set(0, -1.8, dir * (len * 0.5 + segLen * 1.2));
        bridge.add(foundation);

        // 引道兩側抱鼓石與青石望柱
        [-bridgeWidth * 0.48, bridgeWidth * 0.48].forEach((rx) => {
          const drumStone = new THREE.Mesh(
            new THREE.CylinderGeometry(0.24, 0.28, 0.76, 12),
            mats.stonePlaza,
          );
          drumStone.rotation.z = Math.PI / 2;
          drumStone.position.set(rx, 0.32, dir * (len * 0.5 + segLen * 1.6));
          bridge.add(drumStone);
        });
      });

      for (let i = 0; i < segments; i++) {
        const t = (i + 0.5) / segments - 0.5; // -0.5 -> 0.5
        const cosVal = Math.cos(t * Math.PI);
        const archY = cosVal * archRise;
        const slope = Math.sin(t * Math.PI) * 0.38;

        // 1. 下方青石拱券與橋側石壁（營造厚實古樸的半圓石拱洞視覺）
        const spandrelHeight = 0.52 + (1 - cosVal) * 0.55;
        const archBlock = new THREE.Mesh(
          new THREE.BoxGeometry(bridgeWidth * 0.96, spandrelHeight, segLen * 1.08),
          mats.stoneGrey,
        );
        archBlock.position.set(0, archY - spandrelHeight * 0.45, t * len);
        archBlock.rotation.x = slope;
        bridge.add(archBlock);

        // 2. 青石階梯橋面石板
        const stepDeck = new THREE.Mesh(
          new THREE.BoxGeometry(bridgeWidth, 0.24, segLen * 1.06),
          i % 2 === 0 ? mats.stonePlaza : mats.stoneStep,
        );
        stepDeck.position.set(0, archY + 0.12, t * len);
        stepDeck.rotation.x = slope;
        bridge.add(stepDeck);

        // 3. 兩側雕花青石欄板與蓮花望柱
        [-bridgeWidth * 0.45, bridgeWidth * 0.45].forEach((rx) => {
          // 青石欄板
          const stonePanel = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.54, segLen * 1.02),
            mats.stoneStep,
          );
          stonePanel.position.set(rx, archY + 0.46, t * len);
          stonePanel.rotation.x = slope;
          bridge.add(stonePanel);

          // 欄板頂部青石扶手壓頂
          const topRail = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.12, segLen * 1.08),
            mats.stoneGrey,
          );
          topRail.position.set(rx, archY + 0.76, t * len);
          topRail.rotation.x = slope;
          bridge.add(topRail);

          // 每隔兩段立一根青石望柱與柱頭石獅/蓮花珠
          if (i % 2 === 0 || i === Math.floor(segments / 2)) {
            const post = new THREE.Mesh(
              new THREE.BoxGeometry(0.24, 1.02, 0.24),
              mats.stonePlaza,
            );
            post.position.set(rx, archY + 0.56, t * len);
            bridge.add(post);

            const finial = new THREE.Mesh(
              new THREE.SphereGeometry(0.14, 8, 8),
              i === Math.floor(segments / 2) ? mats.lanternGlow : mats.stoneGrey,
            );
            finial.position.set(rx, archY + 1.14, t * len);
            bridge.add(finial);
          }
        });
      }

      // 在每座青石拱橋的橋欄旁配置 1~2 位悠然垂釣的江南釣客 NPC（頭上無倒三角）
      const anglerSlots: Array<{ tPos: number; side: 1 | -1 }> =
        bridgeIdx % 2 === 0
          ? [
              { tPos: -0.14, side: 1 },
              { tPos: 0.18, side: -1 },
            ]
          : [{ tPos: 0.08, side: 1 }];

      anglerSlots.forEach((slot, sIdx) => {
        const aY = Math.cos(slot.tPos * Math.PI) * archRise + 0.24;
        const anglerNPC = createBridgeAnglerNPC(
          slot.side,
          bridgeIdx + sIdx,
          bridgeIdx * 1.7 + sIdx * 2.3,
        );
        anglerNPC.position.set(slot.side * (bridgeWidth * 0.32), aY, slot.tPos * len);
        bridge.add(anglerNPC);
      });

      enableShadows(bridge);
      worldGroup.add(bridge);
    };

    // 四座連結主島與外島的江南青石拱橋（含橋上垂釣客 NPC）
    createArchedBridge(-22.5, -16.8, -8.8, -6.6, 0);
    createArchedBridge(22.5, -16.8, 8.8, -6.6, 1);
    createArchedBridge(-22.5, 16.8, -8.8, 6.6, 2);
    createArchedBridge(22.5, 16.8, 8.8, 6.6, 3);

    // 點綴於江南青石拱橋畔與島嶼淺灣的碧水荷花池與蓮花河燈
    [
      [-11.5, -2.5, 6],
      [11.5, -2.5, 6],
      [-11.5, 3.2, 6],
      [11.5, 3.2, 6],
      [-21.5, -11.5, 5],
      [21.5, -11.5, 5],
      [-21.5, 11.5, 5],
      [21.5, 11.5, 5],
      [-6.5, 12.2, 6],
      [6.8, 12.2, 6],
    ].forEach(([lx, lz, cnt]) => {
      createLotusPatch(lx, lz, cnt);
    });

    // =========================================================
    // 8. JIANGNAN BASIN, 32 CLOSED MOUNTAINS, GROTTO WATERFALL, MIRROR LAKE & FARMLAND VITALITY
    // =========================================================
    const waterfallDrops: THREE.Mesh[] = [];
    const mountainPeakClouds: Array<{
      group: THREE.Group;
      baseY: number;
      phase: number;
      speed: number;
    }> = [];
    const animatedWaterwheels: THREE.Group[] = [];
    const animatedEgrets: Array<{ leftWing: THREE.Group; rightWing: THREE.Group; phase: number }> = [];
    const animatedFarmers: Array<{ torso: THREE.Group; phase: number }> = [];
    const animatedOxHeads: THREE.Group[] = [];
    const animatedChickens: Array<{ head: THREE.Group; phase: number }> = [];

    // 8.1 江南盆地自然有機沙洲與陸地（向下深扎至水底河床 y = -2.0，絕不懸浮或堆疊圓盤；各島嶼之間留有清澈小水道分開，南北中央水道直通山邊洞口）
    const createOrganicLandmass = (
      cx: number,
      cz: number,
      rx: number,
      rz: number,
      seed: number,
      rotY = 0,
      topHeight = 0.65,
    ) => {
      const landGrp = new THREE.Group();
      landGrp.position.set(cx, 0, cz);
      landGrp.rotation.y = rotY;

      const rockShape = createOrganicShape(rx, rz, seed);
      const rockGeo = new THREE.ExtrudeGeometry(rockShape, {
        depth: topHeight + 1.45,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.68,
        bevelThickness: 0.28,
        curveSegments: 24,
      });
      rockGeo.rotateX(Math.PI / 2);
      const rockBase = new THREE.Mesh(rockGeo, mats.cliffRock);
      rockBase.position.y = topHeight - 0.28;
      landGrp.add(rockBase);

      const grassShape = createOrganicShape(rx * 0.97, rz * 0.97, seed);
      const grassGeo = new THREE.ExtrudeGeometry(grassShape, {
        depth: 0.12,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.36,
        bevelThickness: 0.12,
        curveSegments: 24,
      });
      grassGeo.rotateX(Math.PI / 2);
      const grassTop = new THREE.Mesh(grassGeo, mats.grassTop);
      grassTop.position.y = topHeight + 0.12;
      landGrp.add(grassTop);

      const landSurfaceY = topHeight + 0.24;
      [
        [-rx * 0.36, -rz * 0.28, 1.06],
        [rx * 0.36, rz * 0.28, 1.1],
      ].forEach(([tx, tz, sc], tIdx) => {
        const tree = tIdx % 2 === 0 ? createWillowTree(sc) : createSakuraTree(sc);
        tree.position.set(tx, landSurfaceY, tz);
        landGrp.add(tree);
      });

      enableShadows(landGrp);
      worldGroup.add(landGrp);
      return landSurfaceY;
    };

    const organicLandmasses: Array<{
      cx: number;
      cz: number;
      rx: number;
      rz: number;
      seed: number;
      rotY?: number;
      topHeight?: number;
    }> = [
      // 1. 北岸左右兩座大型有機農田島（與痛點島、討論島之間留有小水道分開；中央留出寬闊水道直通北山洞口 [0, -50.5]）
      { cx: -25.0, cz: -45.0, rx: 13.8, rz: 5.8, seed: 1.4, rotY: 0.05, topHeight: 0.62 },
      { cx: 25.0, cz: -45.0, rx: 13.8, rz: 5.8, seed: 2.8, rotY: -0.05, topHeight: 0.62 },

      // 2. 西岸中央大型有機農田島（位於痛點島與創意島之間，上下皆有小水道與兩島分開）
      { cx: -35.0, cz: 0.0, rx: 14.8, rz: 7.4, seed: 4.1, rotY: 0.0, topHeight: 0.65 },

      // 3. 東岸中央大型有機農田茶園島（位於討論島與徵才島之間，上下皆有小水道與兩島分開）
      { cx: 35.0, cz: 0.0, rx: 14.8, rz: 7.4, seed: 5.5, rotY: 0.0, topHeight: 0.65 },

      // 4. 南岸左右兩座大型有機農田島（位於創意島與徵才島南側，與兩島之間留有小水道分開；中央留出水道直通南山洞口 [0, 52.5]）
      { cx: -25.0, cz: 45.0, rx: 13.8, rz: 5.8, seed: 6.9, rotY: -0.05, topHeight: 0.62 },
      { cx: 25.0, cz: 45.0, rx: 13.8, rz: 5.8, seed: 8.3, rotY: 0.05, topHeight: 0.62 },

      // 5. 西外岸與東外岸山麓桃林沙洲（與內圈四島以運河小水道分開）
      { cx: -55.5, cz: -24.0, rx: 6.2, rz: 11.5, seed: 9.7, rotY: -0.05, topHeight: 0.58 },
      { cx: -55.5, cz: 24.0, rx: 6.2, rz: 11.5, seed: 11.1, rotY: 0.05, topHeight: 0.58 },
      { cx: 55.5, cz: -24.0, rx: 6.2, rz: 11.5, seed: 12.4, rotY: 0.05, topHeight: 0.58 },
      { cx: 55.5, cz: 24.0, rx: 6.2, rz: 11.5, seed: 13.8, rotY: -0.05, topHeight: 0.58 },
    ];

    organicLandmasses.forEach((lm) => {
      createOrganicLandmass(lm.cx, lm.cz, lm.rx, lm.rz, lm.seed, lm.rotY || 0, lm.topHeight || 0.62);
    });

    // 8.3 北水道與南水道荷花叢點綴（保持中央航道暢通無阻，直通山邊大溶洞口）
    createLotusPatch(-7.5, -42, 6);
    createLotusPatch(7.5, -42, 6);
    createLotusPatch(-8.2, -35, 5);
    createLotusPatch(8.2, -35, 5);
    createLotusPatch(-7.8, 42, 5);
    createLotusPatch(7.8, 42, 5);

    // 8.4 第一層：32座無縫閉合疊嶂環形山脈（正北 i=24 與正南 i=8 山峰微向後退讓，完整露出山腳下高聳壯觀的水道洞口）
    const closedRingCount = 32;
    for (let i = 0; i < closedRingCount; i++) {
      const angle = (i / closedRingCount) * Math.PI * 2;
      const isCaveMouthPeak = i === 24 || i === 8;
      const radiusBase = (isCaveMouthPeak ? 74.5 : 69) + Math.sin(i * 1.6) * 3.5;
      const mx = Math.cos(angle) * (radiusBase * 1.08);
      const mz = Math.sin(angle) * (radiusBase * 0.94);
      const mr = isCaveMouthPeak ? 13.5 : 15.8 + (i % 4) * 1.1;
      const mh = 26 + (i % 5) * 2.8;

      const peakGrp = new THREE.Group();
      peakGrp.position.set(mx, -0.5, mz);

      const mainPeak = new THREE.Mesh(
        new THREE.ConeGeometry(mr, mh, 7),
        i % 2 === 0 ? mats.mountainGreen : mats.mountainRock,
      );
      mainPeak.position.y = mh * 0.48;
      mainPeak.rotation.y = i * 0.65;
      peakGrp.add(mainPeak);

      const subPeak = new THREE.Mesh(
        new THREE.ConeGeometry(mr * 0.72, mh * 0.74, 6),
        i % 2 === 0 ? mats.mountainRock : mats.mountainGreen,
      );
      subPeak.position.set(mr * 0.42, mh * 0.35, mr * 0.28);
      peakGrp.add(subPeak);

      // 山上蒼翠古松
      const inwardAngle = Math.atan2(-mz, -mx);
      [
        [Math.cos(inwardAngle) * mr * 0.62, mh * 0.16, Math.sin(inwardAngle) * mr * 0.62, 1.5],
        [Math.cos(inwardAngle + 0.5) * mr * 0.5, mh * 0.3, Math.sin(inwardAngle + 0.5) * mr * 0.5, 1.35],
        [mr * 0.36, mh * 0.46, mr * 0.22, 1.25],
      ].forEach(([px, py, pz, pScale]) => {
        const mountainPine = createPineTree(pScale);
        mountainPine.position.set(px, py, pz);
        peakGrp.add(mountainPine);
      });

      // 雲繞山頭：在每座大山的山頭環繞蓬鬆雲帶
      const peakCloudCollar = new THREE.Group();
      const collarBaseY = mh * 0.68;
      peakCloudCollar.position.set(0, collarBaseY, 0);

      const collarClusterCount = 4;
      for (let c = 0; c < collarClusterCount; c++) {
        const cAngle = (c / collarClusterCount) * Math.PI * 2 + i * 0.4;
        const cRadius = mr * (0.42 + (c % 2) * 0.08);
        const cx = Math.cos(cAngle) * cRadius;
        const cz = Math.sin(cAngle) * cRadius;

        const cloudPuff = new THREE.Mesh(new THREE.IcosahedronGeometry(mr * 0.18, 1), mats.cloudWhite);
        cloudPuff.position.set(cx, ((c % 2) - 0.5) * 0.8, cz);
        cloudPuff.scale.set(1.4, 0.62, 1.15);
        peakCloudCollar.add(cloudPuff);
      }
      peakGrp.add(peakCloudCollar);
      mountainPeakClouds.push({
        group: peakCloudCollar,
        baseY: collarBaseY,
        phase: i * 0.85,
        speed: (i % 2 === 0 ? 1 : -1) * 0.045,
      });

      enableShadows(peakGrp);
      worldGroup.add(peakGrp);
    }

    // 8.5 階梯式四重山巒天際線系統（Layer 2: 中景 28 座，Layer 3: 遠景 24 座，Layer 4: 極遠天際 20 座）
    // 第二層：中景層疊山巒（28座，r≈108，深黛青墨色）
    for (let i = 0; i < 28; i++) {
      const ang = (i / 28) * Math.PI * 2 + 0.11;
      const r = 108 + ((i * 3) % 7) * 2.2;
      const cx = Math.cos(ang) * (r * 1.1);
      const cz = Math.sin(ang) * (r * 0.95);
      const mr = 20 + (i % 3) * 2.5;
      const mh = 38 + (i % 4) * 3.5;

      const midPeak = new THREE.Mesh(new THREE.ConeGeometry(mr, mh, 7), mats.mountainMidMat);
      midPeak.position.set(cx, mh * 0.48 - 0.5, cz);
      midPeak.rotation.y = i * 0.5;
      worldGroup.add(midPeak);
    }

    // 第三層：遠景水墨遠山（24座，r≈158，淡青灰薄霧色）
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * Math.PI * 2 + 0.22;
      const r = 158 + (i % 5) * 3.0;
      const cx = Math.cos(ang) * (r * 1.12);
      const cz = Math.sin(ang) * (r * 0.96);
      const mr = 28 + (i % 3) * 3.5;
      const mh = 52 + (i % 4) * 4.5;

      const farPeak = new THREE.Mesh(new THREE.ConeGeometry(mr, mh, 6), mats.mountainFarMat);
      farPeak.position.set(cx, mh * 0.48 - 0.5, cz);
      farPeak.rotation.y = i * 0.7;
      worldGroup.add(farPeak);
    }

    // 第四層：極遠天際線連綿墨影（20座，r≈225，淡雅天際水墨）
    for (let i = 0; i < 20; i++) {
      const ang = (i / 20) * Math.PI * 2 + 0.33;
      const r = 225 + (i % 4) * 4.0;
      const cx = Math.cos(ang) * (r * 1.14);
      const cz = Math.sin(ang) * (r * 0.98);
      const mr = 38 + (i % 3) * 4.5;
      const mh = 68 + (i % 4) * 6.0;

      const skyPeak = new THREE.Mesh(new THREE.ConeGeometry(mr, mh, 6), mats.mountainInfiniteMat);
      skyPeak.position.set(cx, mh * 0.48 - 0.5, cz);
      skyPeak.rotation.y = i * 0.9;
      worldGroup.add(skyPeak);
    }

    // 8.6 江南水鄉農田生活煙火氣：山邊大型水溶石洞口（連接水道）、水稻梯田、運轉水車、水道兩岸桃樹、悠閒黃牛、辛勤農夫、白鷺鷥與生機家畜
    // A. 醒目高聳的山邊水溶石洞口（設於北山腳下 [0, 0, -50.5] 與南山腳下 [0, 0, 52.5]，連接南北中央水道，烏篷船可直接駛入洞中）
    const createMountainWaterGrotto = (gx: number, gy: number, gz: number, rotY = 0) => {
      const waterGrottoGroup = new THREE.Group();
      waterGrottoGroup.position.set(gx, gy, gz);
      waterGrottoGroup.rotation.y = rotY;

      // 1. 深邃幽暗溶洞內膛（半圓拱頂深洞隧道 + 純黑深淵背板，置於山腳最前方絕不被山體遮擋）
      const caveDeepMat = new THREE.MeshBasicMaterial({
        color: 0x03080c,
        side: THREE.DoubleSide,
      });
      const caveTunnelVault = new THREE.Mesh(
        new THREE.CylinderGeometry(7.2, 7.6, 11.5, 24, 1, false, 0, Math.PI),
        caveDeepMat,
      );
      caveTunnelVault.rotation.z = Math.PI / 2;
      caveTunnelVault.rotation.y = Math.PI / 2;
      caveTunnelVault.position.set(0, 0.8, -2.5);
      waterGrottoGroup.add(caveTunnelVault);

      const caveBackdrop = new THREE.Mesh(
        new THREE.CircleGeometry(7.4, 24, 0, Math.PI),
        caveDeepMat,
      );
      caveBackdrop.position.set(0, 0.8, -1.2);
      waterGrottoGroup.add(caveBackdrop);

      // 2. 高聳外凸的雙層天然青石岩拱門（高約 10.5m、寬約 17m，與後方翠綠山體形成強烈明暗對比）
      const outerCliffArch = new THREE.Mesh(
        new THREE.TorusGeometry(7.8, 2.35, 8, 24, Math.PI),
        mats.stonePlaza,
      );
      outerCliffArch.position.set(0, 1.2, 1.4);
      waterGrottoGroup.add(outerCliffArch);

      const innerDarkArch = new THREE.Mesh(
        new THREE.TorusGeometry(6.9, 1.75, 7, 20, Math.PI),
        mats.caveRockMat,
      );
      innerDarkArch.position.set(0, 1.0, 0.2);
      waterGrottoGroup.add(innerDarkArch);

      // 3. 洞口左右兩側巍峨嶙峋的峭壁巨岩柱（向下扎根至水底）
      [-8.2, 8.2].forEach((cx, cIdx) => {
        for (let h = 0; h < 5; h++) {
          const rock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(2.8 - h * 0.18, 1),
            h % 2 === cIdx ? mats.stonePlaza : mats.caveRockMat,
          );
          rock.position.set(
            cx + (h % 2 === 0 ? 0.45 : -0.45),
            h * 2.1 - 0.2,
            1.6 - h * 0.25,
          );
          rock.scale.set(1.35, 1.25, 1.45);
          waterGrottoGroup.add(rock);
        }
      });

      // 4. 洞內延伸至洞外水道的翡翠微光水面（與河道無縫銜接）
      const cavePool = new THREE.Mesh(
        new THREE.CylinderGeometry(7.2, 7.2, 0.24, 24),
        mats.caveWaterMat,
      );
      cavePool.position.set(0, -0.66, 0.8);
      cavePool.scale.set(0.95, 1.0, 1.55);
      waterGrottoGroup.add(cavePool);

      // 5. 洞頂垂掛的大型鐘乳石群（在幽暗洞口背景前清晰可見）
      [
        [-3.8, 6.2, 1.2, 2.2],
        [-1.8, 7.1, 1.4, 2.7],
        [0.0, 7.4, 1.5, 3.0],
        [1.9, 7.0, 1.4, 2.5],
        [3.8, 6.1, 1.2, 2.1],
      ].forEach(([sx, sy, sz, sh], sIdx) => {
        const stalactite = new THREE.Mesh(
          new THREE.ConeGeometry(0.42, sh, 6),
          sIdx % 2 === 0 ? mats.stonePlaza : mats.caveRockMat,
        );
        stalactite.rotation.x = Math.PI;
        stalactite.position.set(sx, sy, sz);
        waterGrottoGroup.add(stalactite);
      });

      // 6. 洞口峭壁側方飛流直下的山澗小瀑布與水花泡泡
      const waterfallStream = new THREE.Mesh(
        new THREE.BoxGeometry(1.65, 9.5, 0.45),
        mats.waterFoam,
      );
      waterfallStream.position.set(-7.6, 4.6, 2.8);
      waterfallStream.rotation.z = -0.12;
      waterGrottoGroup.add(waterfallStream);

      for (let f = 0; f < 5; f++) {
        const foam = new THREE.Mesh(
          new THREE.SphereGeometry(0.55 + (f % 2) * 0.2, 8, 8),
          mats.waterFoam,
        );
        foam.position.set(-7.2 + (f - 2) * 0.55, -0.35, 3.2 + (f % 2) * 0.35);
        waterGrottoGroup.add(foam);
        waterfallDrops.push(foam);
      }

      // 7. 洞口水道兩側「江南青石引航燈柱」與洞拱懸掛紅燈籠（引導水道船隻進洞）
      [-6.2, 6.2].forEach((lx) => {
        // 水道入口青石引航燈塔（直接立於水底河床）
        const beaconPost = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.38, 3.2, 6),
          mats.stonePlaza,
        );
        beaconPost.position.set(lx, 0.6, 4.2);
        waterGrottoGroup.add(beaconPost);

        const beaconCap = new THREE.Mesh(
          new THREE.ConeGeometry(0.68, 0.45, 6),
          mats.roofSlate,
        );
        beaconCap.position.set(lx, 2.65, 4.2);
        waterGrottoGroup.add(beaconCap);

        const beaconGlow = new THREE.Mesh(
          new THREE.SphereGeometry(0.28, 10, 10),
          mats.lanternGlow,
        );
        beaconGlow.position.set(lx, 2.25, 4.2);
        waterGrottoGroup.add(beaconGlow);

        // 洞口石拱下方懸掛的暖光燈籠
        const archLantern = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.32, 0.68, 8),
          mats.lanternGlow,
        );
        archLantern.position.set(lx * 0.72, 4.6, 2.2);
        waterGrottoGroup.add(archLantern);
      });

      const caveLight = new THREE.PointLight(0xffb347, 2.4, 24, 1.4);
      caveLight.position.set(0, 3.8, 3.2);
      waterGrottoGroup.add(caveLight);

      worldGroup.add(waterGrottoGroup);
    };

    createMountainWaterGrotto(0, 0.2, -50.5, 0);        // 北山水道洞口（正對中央北水道）
    createMountainWaterGrotto(0, 0.2, 52.5, Math.PI);   // 南山水道洞口（正對中央南水道）

    // B. 水稻梯田（全數精準鋪設於有機農田島草坪表面，絕不懸浮於水面）
    const createPaddyCluster = (
      centerX: number,
      centerY: number,
      centerZ: number,
      width: number,
      depth: number,
      tierCount = 3,
      rotY = 0,
    ) => {
      const pGroup = new THREE.Group();
      pGroup.position.set(centerX, centerY, centerZ);
      pGroup.rotation.y = rotY;

      const tierDepth = depth / tierCount;

      for (let t = 0; t < tierCount; t++) {
        const tierZ = (t - (tierCount - 1) * 0.5) * tierDepth;
        const tierHeight = t * 0.12;

        // 土埂（底部緊貼陸地草坪表面）
        const dike = new THREE.Mesh(
          new THREE.BoxGeometry(width, 0.24, tierDepth * 0.95),
          mats.dirtPathMat,
        );
        dike.position.set(0, tierHeight + 0.08, tierZ);
        pGroup.add(dike);

        // 倒映天光水面
        const water = new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.92, 0.1, tierDepth * 0.78),
          mats.paddyWaterMat,
        );
        water.position.set(0, tierHeight + 0.17, tierZ);
        pGroup.add(water);

        // 整齊的青蔥水稻秧苗（並加入微風稻浪群組）
        const shootSpacingX = 1.35;
        const shootSpacingZ = 0.95;
        const xCount = Math.floor((width * 0.84) / shootSpacingX);
        const zCount = Math.floor((tierDepth * 0.65) / shootSpacingZ);

        for (let ix = -xCount / 2; ix <= xCount / 2; ix++) {
          for (let iz = -zCount / 2; iz <= zCount / 2; iz++) {
            const shoot = new THREE.Mesh(
              new THREE.ConeGeometry(0.22, 0.62, 4),
              mats.riceShootMat,
            );
            const shootX = ix * shootSpacingX + ((ix * 2) % 0.25);
            const shootZ = tierZ + iz * shootSpacingZ + ((iz * 2) % 0.2);
            shoot.position.set(shootX, tierHeight + 0.44, shootZ);
            shoot.rotation.y = (ix + iz) * 0.8;
            pGroup.add(shoot);

            const worldX = centerX + Math.cos(rotY) * shootX - Math.sin(rotY) * shootZ;
            const worldZ = centerZ + Math.sin(rotY) * shootX + Math.cos(rotY) * shootZ;
            swayingRiceShoots.push({
              mesh: shoot,
              baseX: worldX,
              baseZ: worldZ,
              phase: (ix * 0.7 + iz * 0.5) + t * 0.4,
            });
          }
        }
      }

      enableShadows(pGroup);
      worldGroup.add(pGroup);
    };

    // 精準配置於六座大型有機農田島上的水稻梯田（100% 位於陸地範圍內）
    createPaddyCluster(-34.5, 0.89, 0.0, 14.0, 6.8, 3, 0.0);    // 西岸中央農田島梯田
    createPaddyCluster(31.0, 0.89, 0.0, 11.0, 6.6, 3, 0.0);     // 東岸中央農田島梯田
    createPaddyCluster(-23.5, 0.86, -45.0, 12.5, 5.4, 2, 0.05); // 西北農田島梯田
    createPaddyCluster(23.5, 0.86, -45.0, 12.5, 5.4, 2, -0.05); // 東北農田島梯田
    createPaddyCluster(-23.0, 0.86, 45.0, 12.5, 5.4, 2, -0.05); // 西南農田島梯田
    createPaddyCluster(23.0, 0.86, 45.0, 12.5, 5.4, 2, 0.05);  // 東南農田島梯田

    // C. 3 座大型江南木構運轉水車（青石支架向下扎根至河床，緊貼農田島岸邊提水灌溉）
    const createWaterWheelMesh = (posX: number, posY: number, posZ: number, rotY = 0) => {
      const wBase = new THREE.Group();
      wBase.position.set(posX, posY, posZ);
      wBase.rotation.y = rotY;

      // 青石支架（向下深扎至河床）
      const pier1 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 3.8, 0.55), mats.stonePlaza);
      pier1.position.set(-1.0, 0.9, 0);
      const pier2 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 3.8, 0.55), mats.stonePlaza);
      pier2.position.set(1.0, 0.9, 0);
      wBase.add(pier1, pier2);

      // 木架引水槽
      const flume = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.28, 4.4), mats.woodDark);
      flume.position.set(0, 2.7, -1.6);
      wBase.add(flume);

      // 旋轉主輪（12根輪輻 + 12面提水木刮板）
      const rWheel = new THREE.Group();
      rWheel.position.set(0, 1.9, 0);

      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.2, 8), mats.woodWarm);
      axle.rotation.z = Math.PI / 2;
      rWheel.add(axle);

      const rim1 = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.08, 6, 24), mats.woodWarm);
      rim1.position.x = -0.55;
      rim1.rotation.y = Math.PI / 2;
      const rim2 = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.08, 6, 24), mats.woodWarm);
      rim2.position.x = 0.55;
      rim2.rotation.y = Math.PI / 2;
      rWheel.add(rim1, rim2);

      for (let s = 0; s < 12; s++) {
        const sAng = (s / 12) * Math.PI * 2;
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.6, 0.08), mats.woodWarm);
        spoke.rotation.x = sAng;
        rWheel.add(spoke);

        const paddle = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.22, 0.38), mats.woodDark);
        paddle.position.set(0, Math.cos(sAng) * 1.85, Math.sin(sAng) * 1.85);
        paddle.rotation.x = sAng;
        rWheel.add(paddle);
      }

      wBase.add(rWheel);
      animatedWaterwheels.push(rWheel);
      enableShadows(wBase);
      worldGroup.add(wBase);
    };

    createWaterWheelMesh(-11.4, -0.35, -44.5, 0);         // 北水道西岸農田水車
    createWaterWheelMesh(-20.8, -0.35, 0.0, Math.PI / 2);  // 西岸中央農田島水車
    createWaterWheelMesh(20.8, -0.35, 0.0, -Math.PI / 2);  // 東岸中央農田島水車

    // D. 沿著各島小水道與南北洞口水道兩岸種植的「盛開桃花樹」（全數穩立於各有機陸地草坪上，絕不懸浮水面）
    // 1. 西岸與東岸中央農田島南北小水道駁岸桃樹
    [-44, -38, -31, -25].forEach((x) => {
      [-4.8, 4.8].forEach((z) => {
        const t = createSakuraTree(1.12);
        t.position.set(x, 0.89, z);
        worldGroup.add(t);
      });
    });
    [25, 31, 38, 44].forEach((x) => {
      [-4.8, 4.8].forEach((z) => {
        const t = createSakuraTree(1.12);
        t.position.set(x, 0.89, z);
        worldGroup.add(t);
      });
    });

    // 2. 北山洞口水道與南山洞口水道兩側岸上迎客桃樹（立於南北農田島內側草坪岸邊）
    [-42.5, -45.5, -48.0].forEach((z) => {
      const leftTree = createSakuraTree(1.18);
      leftTree.position.set(-13.5, 0.86, z);
      worldGroup.add(leftTree);

      const rightTree = createSakuraTree(1.18);
      rightTree.position.set(13.5, 0.86, z);
      worldGroup.add(rightTree);
    });
    [42.5, 45.5, 48.0].forEach((z) => {
      const leftTree = createSakuraTree(1.15);
      leftTree.position.set(-13.5, 0.86, z);
      worldGroup.add(leftTree);

      const rightTree = createSakuraTree(1.15);
      rightTree.position.set(13.5, 0.86, z);
      worldGroup.add(rightTree);
    });

    // 3. 東西外岸山麓沙洲桃林（立於 x = ±55.5 山麓沙洲陸地上）
    [-29, -24, -19, 19, 24, 29].forEach((z) => {
      const wTree = createSakuraTree(1.15);
      wTree.position.set(-55.2, 0.82, z);
      worldGroup.add(wTree);

      const eTree = createSakuraTree(1.15);
      eTree.position.set(55.2, 0.82, z);
      worldGroup.add(eTree);
    });

    // E. 江南農莊民舍（白牆黛瓦、竹籬圍欄，穩立於西北與東南農田島草坪上）
    const createJiangnanHomestead = (x: number, y: number, z: number, rotY = 0) => {
      const cottage = new THREE.Group();
      cottage.position.set(x, y, z);
      cottage.rotation.y = rotY;

      const houseWall = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.5, 3.2), mats.wallCream);
      houseWall.position.y = 1.25;
      cottage.add(houseWall);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.35, 4), mats.roofSlate);
      roof.position.y = 3.1;
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(1.4, 1.0, 1.0);
      cottage.add(roof);

      const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.2, 0.35), mats.stoneGrey);
      chimney.position.set(1.1, 3.3, 0.5);
      cottage.add(chimney);

      const fence = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.75, 0.12), mats.bambooStrawMat);
      fence.position.set(0, 0.38, 2.4);
      cottage.add(fence);

      const logs = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.5, 6), mats.woodWarm);
      logs.rotation.z = Math.PI / 2;
      logs.position.set(-2.5, 0.22, 1.0);
      cottage.add(logs);

      enableShadows(cottage);
      worldGroup.add(cottage);
    };

    createJiangnanHomestead(-33.2, 0.86, -45.0, 0.25); // 西北農田島農舍
    createJiangnanHomestead(33.2, 0.86, 45.0, -0.3);   // 東南農田島農舍

    // F. 江南梯級茶園階地（穩立於東岸中央農田島東側坡地 [42.5, 0.89, 0]）
    const teaTerraceGroup = new THREE.Group();
    teaTerraceGroup.position.set(42.5, 0.89, 0);
    for (let r = 0; r < 3; r++) {
      const tRadius = 3.2 + r * 1.4;
      const count = 5 + r * 2;
      for (let b = 0; b < count; b++) {
        const ang = -0.75 + (b / Math.max(1, count - 1)) * 1.5;
        const bx = Math.cos(ang) * tRadius;
        const bz = Math.sin(ang) * tRadius;
        const bush = new THREE.Mesh(
          new THREE.SphereGeometry(0.48, 6, 6),
          mats.mountainGreen,
        );
        bush.scale.set(1.1, 0.65, 1.1);
        bush.position.set(bx - 3.2, r * 0.18 + 0.28, bz);
        teaTerraceGroup.add(bush);
      }
    }
    worldGroup.add(teaTerraceGroup);

    // G. 悠閒黃牛 / 水牛（穩立於四座農田島田埂草坪上）
    const createWaterOx = (oxX: number, oxY: number, oxZ: number, rotY = 0) => {
      const oxGrp = new THREE.Group();
      oxGrp.position.set(oxX, oxY, oxZ);
      oxGrp.rotation.y = rotY;

      const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.95, 2.2), mats.oxBrownMat);
      body.position.y = 0.85;
      oxGrp.add(body);

      const rump = new THREE.Mesh(new THREE.SphereGeometry(0.72, 8, 8), mats.oxBrownMat);
      rump.position.set(0, 0.95, -0.9);
      oxGrp.add(rump);

      [
        [-0.48, 0.35, 0.7],
        [0.48, 0.35, 0.7],
        [-0.48, 0.35, -0.7],
        [0.48, 0.35, -0.7],
      ].forEach(([lx, ly, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.75, 6), mats.oxBrownMat);
        leg.position.set(lx, ly, lz);
        oxGrp.add(leg);
      });

      const headGrp = new THREE.Group();
      headGrp.position.set(0, 1.25, 1.05);

      const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.85), mats.oxBrownMat);
      headMesh.position.set(0, 0, 0.35);
      headGrp.add(headMesh);

      [-1, 1].forEach((dir) => {
        const horn = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 5, 8, Math.PI * 0.75), mats.oxHornMat);
        horn.position.set(dir * 0.38, 0.36, 0.15);
        horn.rotation.set(0.3, dir * 0.4, dir * 0.8);
        headGrp.add(horn);
      });

      oxGrp.add(headGrp);
      animatedOxHeads.push(headGrp);
      enableShadows(oxGrp);
      worldGroup.add(oxGrp);
    };

    createWaterOx(33.2, 0.86, -45.0, -0.6); // 東北農田島水牛
    createWaterOx(-14.8, 0.86, -45.2, 0.8); // 西北農田島水牛
    createWaterOx(-44.5, 0.89, 1.5, 0.8);   // 西岸中央農田島黃牛
    createWaterOx(44.5, 0.89, 2.2, -0.6);   // 東岸中央農田島黃牛

    // H. 辛勤農夫 NPC（著青布藍衣、頭戴竹編斗笠，手持鋤頭於農田島上勞作，頭上無倒三角）
    const createFarmer = (fx: number, fy: number, fz: number, rotY = 0, phase = 0) => {
      const farmerGrp = new THREE.Group();
      farmerGrp.position.set(fx, fy, fz);
      farmerGrp.rotation.y = rotY;

      const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 6), mats.woodDark);
      legs.position.y = 0.3;
      farmerGrp.add(legs);

      const torsoGrp = new THREE.Group();
      torsoGrp.position.y = 0.6;

      const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.65, 8), mats.farmerRobeBlue);
      robe.position.y = 0.32;
      torsoGrp.add(robe);

      const hat = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.24, 10), mats.bambooStrawMat);
      hat.position.set(0, 0.76, 0.08);
      hat.rotation.x = 0.25;
      torsoGrp.add(hat);

      const hoe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.35, 6), mats.woodWarm);
      hoe.position.set(0.35, 0.35, 0.45);
      hoe.rotation.set(0.65, 0.2, -0.4);
      torsoGrp.add(hoe);

      farmerGrp.add(torsoGrp);
      animatedFarmers.push({ torso: torsoGrp, phase });
      enableShadows(farmerGrp);
      worldGroup.add(farmerGrp);
    };

    createFarmer(16.2, 0.86, -44.2, 0.4, 0.8);   // 東北農田島農夫
    createFarmer(-16.2, 0.86, -44.2, -0.6, 1.6); // 西北農田島農夫
    createFarmer(-43.0, 0.89, -1.8, 0.9, 2.4);   // 西岸中央農田島農夫
    createFarmer(17.5, 0.86, 44.2, -1.1, 0.2);   // 東南農田島農夫
    createFarmer(40.2, 0.89, -1.5, -0.3, 1.1);   // 東岸茶園茶農

    // I. 白鷺鷥群（全數站在農田島水田內 y=1.02 或岸邊淺水 y=-0.58，絕不懸空漂浮）
    [
      { pos: [-22.0, 1.02, -44.5], ang: 0.6 },
      { pos: [22.0, 1.02, -44.5], ang: -0.8 },
      { pos: [-33.0, 1.05, 0.5], ang: 1.2 },
      { pos: [30.0, 1.05, -0.5], ang: -1.6 },
      { pos: [-22.0, 1.02, 44.5], ang: 0.4 },
      { pos: [22.0, 1.02, 44.5], ang: -0.9 },
      { pos: [-9.2, -0.58, -46.5], ang: 0.3 },
      { pos: [9.2, -0.58, -46.5], ang: -0.3 },
    ].forEach((egCfg, egIdx) => {
      const egretGrp = new THREE.Group();
      egretGrp.position.set(egCfg.pos[0], egCfg.pos[1], egCfg.pos[2]);
      egretGrp.rotation.y = egCfg.ang;

      [-0.08, 0.08].forEach((lx) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 4), mats.stoneGrey);
        leg.position.set(lx, 0.28, 0);
        egretGrp.add(leg);
      });

      const body = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.65, 6), mats.egretFeatherMat);
      body.rotation.x = Math.PI / 2.8;
      body.position.set(0, 0.65, 0);
      egretGrp.add(body);

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 0.48, 6), mats.egretFeatherMat);
      neck.position.set(0, 0.95, 0.22);
      neck.rotation.x = -0.3;
      egretGrp.add(neck);

      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.32, 5), mats.egretBeakMat);
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 1.15, 0.46);
      egretGrp.add(beak);

      const leftWing = new THREE.Group();
      const lWingMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.22), mats.egretFeatherMat);
      lWingMesh.position.set(-0.24, 0, 0);
      leftWing.add(lWingMesh);
      leftWing.position.set(-0.14, 0.68, 0);
      egretGrp.add(leftWing);

      const rightWing = new THREE.Group();
      const rWingMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.22), mats.egretFeatherMat);
      rWingMesh.position.set(0.24, 0, 0);
      rightWing.add(rWingMesh);
      rightWing.position.set(0.14, 0.68, 0);
      egretGrp.add(rightWing);

      animatedEgrets.push({ leftWing, rightWing, phase: egIdx * 1.5 });
      worldGroup.add(egretGrp);
    });

    // J. 放牧綿羊群（6隻蓬鬆綿羊穩立於西南與東南農田島草甸上）
    [
      [15.2, 0.86, 44.2, 0.5],
      [16.8, 0.86, 45.8, -0.8],
      [14.5, 0.86, 46.2, 1.4],
      [-32.5, 0.86, 44.0, -0.5],
      [-34.2, 0.86, 45.5, 1.1],
      [-31.2, 0.86, 46.2, -1.3],
    ].forEach(([sx, sy, sz, rot]) => {
      const sheep = new THREE.Group();
      sheep.position.set(sx, sy, sz);
      sheep.rotation.y = rot;

      const wool = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), mats.sheepWoolMat);
      wool.position.y = 0.55;
      wool.scale.set(1.25, 0.95, 1.0);
      sheep.add(wool);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6), mats.stoneGrey);
      head.position.set(0, 0.65, 0.62);
      sheep.add(head);

      [-0.22, 0.22].forEach((lx) => {
        [-0.3, 0.3].forEach((lz) => {
          const sLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.32, 4), mats.woodDark);
          sLeg.position.set(lx, 0.16, lz);
          sheep.add(sLeg);
        });
      });

      worldGroup.add(sheep);
    });

    // K. 2 隻農舍旁憨厚小粉豬（穩立於西北與東南農田島農舍旁）
    [
      [-29.8, 0.86, -43.8, 0.9],
      [29.8, 0.86, 43.8, -0.8],
    ].forEach(([px, py, pz, prot]) => {
      const pigGrp = new THREE.Group();
      pigGrp.position.set(px, py, pz);
      pigGrp.rotation.y = prot;

      const pigBody = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.95, 8), mats.pigSkinMat);
      pigBody.rotation.x = Math.PI / 2;
      pigBody.position.y = 0.45;
      pigGrp.add(pigBody);

      const pigHead = new THREE.Mesh(new THREE.SphereGeometry(0.32, 6, 6), mats.pigSkinMat);
      pigHead.position.set(0, 0.45, 0.58);
      pigGrp.add(pigHead);

      const pigSnout = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.18, 6), mats.pigSkinMat);
      pigSnout.rotation.x = Math.PI / 2;
      pigSnout.position.set(0, 0.42, 0.88);
      pigGrp.add(pigSnout);

      worldGroup.add(pigGrp);
    });

    // L. 田埂啄食小公雞與母雞（8隻，穩立於農田島草坪上）
    [
      [31.2, 0.86, -43.8, 0],
      [32.0, 0.86, -44.2, 1.2],
      [30.8, 0.86, -45.0, -1.0],
      [32.5, 0.86, -45.5, 2.1],
      [-30.5, 0.86, -45.2, -0.5],
      [-31.4, 0.86, -45.8, 0.8],
      [-15.5, 0.86, 44.5, 1.4],
      [31.0, 0.86, 44.5, -1.2],
    ].forEach(([cx, cy, cz, crot], cIdx) => {
      const chickenGrp = new THREE.Group();
      chickenGrp.position.set(cx, cy, cz);
      chickenGrp.rotation.y = crot;

      const cBody = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), mats.chickenFeatherMat);
      cBody.position.y = 0.22;
      chickenGrp.add(cBody);

      const cHeadGrp = new THREE.Group();
      cHeadGrp.position.set(0, 0.28, 0.14);

      const cHeadMesh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 5, 5), mats.chickenFeatherMat);
      cHeadGrp.add(cHeadMesh);

      const cComb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.09, 0.08), mats.roosterCombMat);
      cComb.position.set(0, 0.08, 0);
      cHeadGrp.add(cComb);

      const cBeak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 4), mats.egretBeakMat);
      cBeak.rotation.x = Math.PI / 2;
      cBeak.position.set(0, 0, 0.1);
      cHeadGrp.add(cBeak);

      chickenGrp.add(cHeadGrp);
      animatedChickens.push({ head: cHeadGrp, phase: cIdx * 1.3 });
      worldGroup.add(chickenGrp);
    });

    // 距離大山近的迷霧淡淡的就好，越往天際外圍才漸次轉濃（營造水墨江南遠山淡霧意境）
    const outerMistRingMats = [0.16, 0.32, 0.58, 0.85].map(
      (op) =>
        new THREE.MeshStandardMaterial({
          color: initialAtmos.cloudColor,
          emissive: initialAtmos.fogColor,
          emissiveIntensity: 0.22,
          roughness: 1.0,
          metalness: 0.0,
          transparent: true,
          opacity: op,
          depthWrite: false,
          flatShading: false,
        }),
    );

    const nearMountainMistFloorMat = new THREE.MeshBasicMaterial({
      color: initialAtmos.fogColor,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const outerDenseMistFloorMat = new THREE.MeshBasicMaterial({
      color: initialAtmos.fogColor,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // 1. 距離大山近的淡霧過渡層（半徑 88~126 僅有 0.2 輕透薄霧）+ 遠方天際雲海（半徑 126~380）
    const nearMistFloor = new THREE.Mesh(
      new THREE.RingGeometry(88, 128, 72, 1).rotateX(-Math.PI / 2),
      nearMountainMistFloorMat,
    );
    nearMistFloor.position.y = 1.5;
    worldGroup.add(nearMistFloor);

    const outerMistFloor = new THREE.Mesh(
      new THREE.RingGeometry(126, 380, 72, 1).rotateX(-Math.PI / 2),
      outerDenseMistFloorMat,
    );
    outerMistFloor.position.y = 1.6;
    worldGroup.add(outerMistFloor);

    const outerMistMidLayer = new THREE.Mesh(
      new THREE.RingGeometry(136, 380, 72, 1).rotateX(-Math.PI / 2),
      outerDenseMistFloorMat,
    );
    outerMistMidLayer.position.y = 4.6;
    worldGroup.add(outerMistMidLayer);

    // 2. 環繞遠山外圍 360° 的漸層迷霧團（靠近大山的內圈淡淡輕透，往外逐層漸濃）
    const outerMistRings: Array<{ group: THREE.Group; baseAngle: number; radius: number; baseY: number; speed: number }> = [];
    const ringConfigs = [
      { count: 26, radius: 90, y: 4.2, scale: 2.1, speed: 0.011 },
      { count: 32, radius: 112, y: 6.8, scale: 2.8, speed: -0.009 },
      { count: 36, radius: 138, y: 10.2, scale: 3.7, speed: 0.007 },
      { count: 40, radius: 168, y: 14.0, scale: 4.6, speed: -0.005 },
    ];

    ringConfigs.forEach((cfg, rIdx) => {
      const ringMat = outerMistRingMats[rIdx] || outerMistRingMats[outerMistRingMats.length - 1];
      for (let i = 0; i < cfg.count; i++) {
        const angle = (i / cfg.count) * Math.PI * 2 + rIdx * 0.23;
        const rx = cfg.radius * 1.14;
        const rz = cfg.radius * 0.96;
        const mx = Math.cos(angle) * rx;
        const mz = Math.sin(angle) * rz;

        const mistBank = new THREE.Group();
        mistBank.position.set(mx, cfg.y + (i % 3) * 0.8, mz);
        mistBank.rotation.y = -angle + Math.PI / 2;

        const blobs: Array<[number, number, number, number]> = [
          [0, 0, 0, 4.8],
          [-3.4, -0.4, 0.9, 3.9],
          [3.4, -0.3, -0.7, 4.0],
          [0.5, 1.4, 1.1, 3.4],
          [-1.8, 1.1, -1.2, 3.2],
        ];
        blobs.forEach(([bx, by, bz, br]) => {
          const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(br, 2), ringMat);
          puff.position.set(bx, by, bz);
          puff.scale.set(1.65, 0.82, 1.35);
          mistBank.add(puff);
        });

        mistBank.scale.setScalar(cfg.scale);
        worldGroup.add(mistBank);
        outerMistRings.push({
          group: mistBank,
          baseAngle: angle,
          radius: cfg.radius,
          baseY: cfg.y + (i % 3) * 0.8,
          speed: cfg.speed,
        });
      }
    });



    // 好天氣時天上偶爾飛過的飛鳥群（人字形鶴群，振翅掠過群島天際）
    const birdFlockGroup = new THREE.Group();
    worldGroup.add(birdFlockGroup);

    const birdBodyMat = new THREE.MeshStandardMaterial({
      color: 0xfbfaf5,
      roughness: 0.6,
    });
    const birdWingTipMat = new THREE.MeshStandardMaterial({
      color: 0x2f3b37,
      roughness: 0.7,
    });

    const flockBirds: Array<{
      group: THREE.Group;
      leftWing: THREE.Group;
      rightWing: THREE.Group;
      phase: number;
      baseOffset: [number, number, number];
    }> = [];

    // 7 隻飛鳥排成優雅的人字雁行陣列
    const vFormationOffsets: Array<[number, number, number]> = [
      [0, 0, 0],
      [-1.1, 0.15, -1.0],
      [1.1, 0.12, -1.0],
      [-2.2, 0.32, -2.0],
      [2.2, 0.28, -2.0],
      [-3.3, 0.45, -3.1],
      [3.3, 0.42, -3.1],
    ];

    vFormationOffsets.forEach(([ox, oy, oz], bIdx) => {
      const birdGrp = new THREE.Group();
      birdGrp.position.set(ox, oy, oz);

      const torso = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.68, 6), birdBodyMat);
      torso.rotation.x = Math.PI / 2;
      birdGrp.add(torso);

      const leftWing = new THREE.Group();
      const lInner = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.035, 0.22), birdBodyMat);
      lInner.position.set(-0.26, 0, 0);
      const lTip = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.16), birdWingTipMat);
      lTip.position.set(-0.62, 0, -0.03);
      leftWing.add(lInner, lTip);
      birdGrp.add(leftWing);

      const rightWing = new THREE.Group();
      const rInner = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.035, 0.22), birdBodyMat);
      rInner.position.set(0.26, 0, 0);
      const rTip = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.16), birdWingTipMat);
      rTip.position.set(0.62, 0, -0.03);
      rightWing.add(rInner, rTip);
      birdGrp.add(rightWing);

      birdGrp.scale.setScalar(bIdx === 0 ? 1.15 : 0.96);
      birdFlockGroup.add(birdGrp);
      flockBirds.push({
        group: birdGrp,
        leftWing,
        rightWing,
        phase: bIdx * 0.65,
        baseOffset: [ox, oy, oz],
      });
    });

    // =========================================================
    // 江南烏篷船與畫舫（在寬闊的群島水道中悠然航行）
    // =========================================================
    const wupengCanopyMat = new THREE.MeshStandardMaterial({
      color: 0x2e2925, // 經典江南烏篷深黛黑竹席色
      roughness: 0.85,
      side: THREE.DoubleSide,
    });
    const bambooRibMat = new THREE.MeshStandardMaterial({
      color: 0xc29b61, // 竹篾拱骨暖色
      roughness: 0.65,
    });
    const boatmanRobeMat = new THREE.MeshStandardMaterial({
      color: 0x3b4d5e, // 江南船夫青衫
      roughness: 0.8,
    });

    const createJiangnanBoat = (isHuafang = false) => {
      const boat = new THREE.Group();

      // 1. 船身：流線型兩端微翹的江南木船（船中段 + 船頭微翹 + 船尾微翹）
      const hullLength = isHuafang ? 3.8 : 2.95;
      const hullWidth = isHuafang ? 1.32 : 1.02;

      const midHull = new THREE.Mesh(
        new THREE.BoxGeometry(hullWidth, 0.34, hullLength * 0.62),
        mats.woodDark,
      );
      midHull.position.y = 0.08;
      boat.add(midHull);

      // 船底甲板邊框
      const gunwale = new THREE.Mesh(
        new THREE.BoxGeometry(hullWidth * 1.06, 0.08, hullLength * 0.64),
        mats.woodWarm,
      );
      gunwale.position.y = 0.26;
      boat.add(gunwale);

      // 船頭微翹尖端 (+Z 方向為航行前方)
      const bowGroup = new THREE.Group();
      bowGroup.position.set(0, 0.14, hullLength * 0.31);
      bowGroup.rotation.x = -0.22;
      const bowMesh = new THREE.Mesh(
        new THREE.ConeGeometry(hullWidth * 0.52, hullLength * 0.36, 4),
        mats.woodDark,
      );
      bowMesh.rotation.x = Math.PI / 2;
      bowMesh.rotation.y = Math.PI / 4;
      bowMesh.scale.set(1, 0.52, 1);
      bowMesh.position.z = hullLength * 0.16;
      bowGroup.add(bowMesh);
      boat.add(bowGroup);

      // 船尾微翹尖端 (-Z 方向為船尾搖櫓處)
      const sternGroup = new THREE.Group();
      sternGroup.position.set(0, 0.15, -hullLength * 0.31);
      sternGroup.rotation.x = 0.24;
      const sternMesh = new THREE.Mesh(
        new THREE.ConeGeometry(hullWidth * 0.48, hullLength * 0.32, 4),
        mats.woodDark,
      );
      sternMesh.rotation.x = -Math.PI / 2;
      sternMesh.rotation.y = Math.PI / 4;
      sternMesh.scale.set(1, 0.55, 1);
      sternMesh.position.z = -hullLength * 0.14;
      sternGroup.add(sternMesh);
      boat.add(sternGroup);

      // 2. 烏篷拱頂 / 江南畫舫雕花拱頂
      const canopyLen = hullLength * 0.52;
      const canopyRadius = hullWidth * 0.48;
      const canopy = new THREE.Mesh(
        new THREE.CylinderGeometry(canopyRadius, canopyRadius, canopyLen, 14, 1, false, 0, Math.PI),
        isHuafang ? mats.roofSlate : wupengCanopyMat,
      );
      canopy.rotation.z = Math.PI / 2;
      canopy.rotation.y = Math.PI / 2;
      canopy.position.set(0, 0.24, 0.05);
      boat.add(canopy);

      // 竹篾拱骨橫紋（3 道細緻竹編箍環）
      [-canopyLen * 0.46, 0, canopyLen * 0.46].forEach((cz) => {
        const rib = new THREE.Mesh(
          new THREE.TorusGeometry(canopyRadius * 1.015, 0.032, 8, 20, Math.PI),
          isHuafang ? mats.goldTrim : bambooRibMat,
        );
        rib.position.set(0, 0.24, 0.05 + cz);
        boat.add(rib);
      });

      // 烏篷內暖黃燈窗光影
      const cabinGlow = new THREE.Mesh(
        new THREE.BoxGeometry(hullWidth * 0.68, 0.28, canopyLen * 0.72),
        mats.windowGlow,
      );
      cabinGlow.position.set(0, 0.32, 0.05);
      boat.add(cabinGlow);

      // 3. 船頭彎桿與江南紅燈籠
      const lanternPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.032, 0.92, 6),
        mats.woodWarm,
      );
      lanternPole.position.set(0, 0.58, hullLength * 0.42);
      lanternPole.rotation.x = 0.38;
      boat.add(lanternPole);

      const bLantern = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), mats.lanternGlow);
      bLantern.scale.set(1, 1.25, 1);
      bLantern.position.set(0, 0.86, hullLength * 0.56);
      boat.add(bLantern);

      // 4. 船尾戴斗笠的江南船夫與搖櫓
      const boatmanGrp = new THREE.Group();
      boatmanGrp.position.set(0.12, 0.26, -hullLength * 0.34);
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.46, 8), boatmanRobeMat);
      torso.position.y = 0.23;
      boatmanGrp.add(torso);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), mats.wallCream);
      head.position.y = 0.52;
      boatmanGrp.add(head);
      const bambooHat = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.14, 12), bambooRibMat);
      bambooHat.position.y = 0.6;
      boatmanGrp.add(bambooHat);
      boat.add(boatmanGrp);

      // 船尾搖櫓（隨航行左右搖擺）
      const oarPivot = new THREE.Group();
      oarPivot.position.set(0.18, 0.36, -hullLength * 0.38);
      const oarShaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.035, 1.55, 6),
        mats.woodWarm,
      );
      oarShaft.rotation.x = Math.PI / 2.6;
      oarShaft.position.set(-0.08, -0.18, -0.62);
      oarPivot.add(oarShaft);
      boat.add(oarPivot);

      // 5. 船尾行船水波紋（V 字形水花）
      const wakeGroup = new THREE.Group();
      wakeGroup.position.set(0, -0.26, -hullLength * 0.52);
      [-1, 1].forEach((side) => {
        const wakeLine = new THREE.Mesh(
          new THREE.BoxGeometry(0.09, 0.02, 1.65),
          mats.waterFoam,
        );
        wakeLine.position.set(side * 0.42, 0, -0.65);
        wakeLine.rotation.y = side * 0.28;
        wakeGroup.add(wakeLine);
      });
      boat.add(wakeGroup);

      enableShadows(boat);
      return { boat, oarPivot, wakeGroup };
    };

    // 7 艘江南烏篷船／畫舫沿著群島水道航行的閉環航線
    const riverBoats: Array<{
      mesh: THREE.Group;
      oarPivot: THREE.Group;
      wakeGroup: THREE.Group;
      baseY: number;
      phase: number;
      speed: number;
      getPoint: (u: number) => [number, number];
    }> = [];

    const boatRoutes: Array<{
      isHuafang: boolean;
      speed: number;
      phaseOffset: number;
      getPoint: (u: number) => [number, number];
    }> = [
      // 航線 1 & 2：環繞主島的中央水道（穿過四座拱橋下方，順時針兩艘對開）
      {
        isHuafang: false,
        speed: 0.022,
        phaseOffset: 0.0,
        getPoint: (u) => {
          const a = u * Math.PI * 2;
          return [Math.cos(a) * 19.2, Math.sin(a) * 18.2];
        },
      },
      {
        isHuafang: true,
        speed: 0.020,
        phaseOffset: 0.5,
        getPoint: (u) => {
          const a = u * Math.PI * 2;
          return [Math.cos(a) * 20.4, Math.sin(a) * 19.2];
        },
      },
      // 航線 3：出入北山洞口探秘舟（沿北水道駛入北山洞口 [0, -51.5] 再悠然划出）
      {
        isHuafang: false,
        speed: 0.0095,
        phaseOffset: 0.0,
        getPoint: (u: number): [number, number] => {
          if (u < 0.40) {
            const p = u / 0.40;
            const z = -22 - p * 29.5; // -22 -> -51.5 駛入北山洞口
            const x = Math.sin(p * Math.PI) * 0.8;
            return [x, z];
          } else if (u < 0.55) {
            const p = (u - 0.40) / 0.15;
            const angle = p * Math.PI;
            const z = -51.5 - Math.sin(angle) * 2.5;
            const x = Math.sin(angle) * 1.6;
            return [x, z];
          } else if (u < 0.85) {
            const p = (u - 0.55) / 0.30;
            const z = -51.5 + p * 29.5; // 破洞而出
            const x = -Math.sin(p * Math.PI) * 0.8;
            return [x, z];
          } else {
            const p = (u - 0.85) / 0.15;
            const angle = p * Math.PI * 2;
            const z = -22 + Math.sin(angle) * 2.5;
            const x = -Math.sin(angle) * 3.2;
            return [x, z];
          }
        },
      },
      // 航線 4：出入南山洞口探秘舟（沿南水道駛入南山洞口 [0, 53.5] 再悠然划出）
      {
        isHuafang: true,
        speed: 0.0095,
        phaseOffset: 0.35,
        getPoint: (u: number): [number, number] => {
          if (u < 0.40) {
            const p = u / 0.40;
            const z = 24 + p * 29.5; // 24 -> 53.5 駛入南山洞口
            const x = Math.sin(p * Math.PI) * 0.9;
            return [x, z];
          } else if (u < 0.55) {
            const p = (u - 0.40) / 0.15;
            const angle = p * Math.PI;
            const z = 53.5 + Math.sin(angle) * 2.5;
            const x = Math.sin(angle) * 1.6;
            return [x, z];
          } else if (u < 0.85) {
            const p = (u - 0.55) / 0.30;
            const z = 53.5 - p * 29.5; // 破洞而出
            const x = -Math.sin(p * Math.PI) * 0.9;
            return [x, z];
          } else {
            const p = (u - 0.85) / 0.15;
            const angle = p * Math.PI * 2;
            const z = 24 - Math.sin(angle) * 2.5;
            const x = -Math.sin(angle) * 3.2;
            return [x, z];
          }
        },
      },
    ];

    boatRoutes.forEach((route, idx) => {
      const { boat, oarPivot, wakeGroup } = createJiangnanBoat(route.isHuafang);
      const [ix, iz] = route.getPoint(route.phaseOffset);
      boat.position.set(ix, -0.28, iz);
      worldGroup.add(boat);
      riverBoats.push({
        mesh: boat,
        oarPivot,
        wakeGroup,
        baseY: -0.28,
        phase: route.phaseOffset,
        speed: route.speed + (idx % 2) * 0.001,
        getPoint: route.getPoint,
      });
    });

    // Perimeter Clouds (推至遠山高空，不遮擋群島)
    const cloudClusters: Array<{ group: THREE.Group; baseX: number; phase: number }> = [];
    const cloudCoords: Array<[number, number, number, number]> = [
      [-68, 8.5, -48, 1.6],
      [68, 8.8, -48, 1.6],
      [-72, 6.5, 38, 1.5],
      [72, 6.5, 38, 1.5],
      [-44, 5.5, 54, 1.4],
      [44, 5.5, 54, 1.4],
      [0, 9.5, -60, 1.7],
    ];
    cloudCoords.forEach(([cx, cy, cz, sc], idx) => {
      const cGrp = new THREE.Group();
      cGrp.position.set(cx, cy, cz);
      [
        [0, 0, 0, 2.8],
        [-2.2, -0.3, 0.6, 2.1],
        [2.2, -0.2, -0.4, 2.2],
        [0.6, 0.8, 0.8, 1.9],
      ].forEach(([bx, by, bz, br]) => {
        const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(br, 1), mats.cloudWhite);
        puff.position.set(bx, by, bz);
        puff.scale.set(1.3, 0.72, 1.1);
        cGrp.add(puff);
      });
      cGrp.scale.setScalar(sc);
      worldGroup.add(cGrp);
      cloudClusters.push({ group: cGrp, baseX: cx, phase: idx * 1.1 });
    });

    // Low Valley Mist Clouds for Morning (清晨・霧濛濛) — 移至遠山山谷外緣，不遮擋島嶼水道
    const valleyMists: Array<{ group: THREE.Group; baseX: number; phase: number }> = [];
    const mistCoords: Array<[number, number, number, number]> = [
      [-56, 4.2, -38, 1.5],
      [56, 4.2, -38, 1.5],
      [-58, 3.8, 36, 1.45],
      [58, 3.8, 36, 1.45],
      [0, 5.2, -50, 1.7],
      [-64, 5.5, 0, 1.6],
      [64, 5.5, 0, 1.6],
      [-36, 3.5, 48, 1.5],
      [36, 3.5, 48, 1.5],
    ];
    mistCoords.forEach(([mx, my, mz, sc], idx) => {
      const mGrp = new THREE.Group();
      mGrp.position.set(mx, my, mz);
      [
        [0, 0, 0, 3.2],
        [-2.8, -0.2, 0.8, 2.4],
        [2.8, -0.2, -0.6, 2.4],
      ].forEach(([bx, by, bz, br]) => {
        const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(br, 1), mats.morningMistMat);
        puff.position.set(bx, by, bz);
        puff.scale.set(1.85, 0.36, 1.4);
        mGrp.add(puff);
      });
      mGrp.scale.setScalar(sc);
      worldGroup.add(mGrp);
      valleyMists.push({ group: mGrp, baseX: mx, phase: idx * 0.9 });
    });

    // Selection Highlight Ring
    const selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(11.8, 12.8, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: 0xffe484,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.78,
      }),
    );
    selectionRing.position.y = 0.15;
    worldGroup.add(selectionRing);

    // =========================================================
    // 8.5 線上真人位置 3D 小人系統（上限 50 位小人，頭頂皆有倒三角標記；NPC 無倒三角）
    // =========================================================
    const BUILDING_3D_ANCHORS: Record<
      IslandBuildingId,
      {
        center: [number, number, number];
        outsideRadius: [number, number];
        insideRadius: [number, number];
        frontAngle: number;
        frontSpread: number;
      }
    > = {
      'home-plaza': {
        center: [0, homeY + 0.35, 0],
        outsideRadius: [4.2, 6.2],
        insideRadius: [1.5, 2.8],
        frontAngle: 0,
        frontSpread: Math.PI * 1.6,
      },
      'home-trade-street': {
        center: [4.8, homeY + 0.15, 2.6],
        outsideRadius: [2.2, 3.6],
        insideRadius: [0.45, 1.25],
        frontAngle: 0.4,
        frontSpread: Math.PI * 1.1,
      },
      'pain-innovation-tower': {
        center: [-32.0, painY + 0.25, -24.2],
        outsideRadius: [3.2, 4.8],
        insideRadius: [0.55, 1.45],
        frontAngle: 0.2,
        frontSpread: Math.PI * 0.95,
      },
      'discussion-library': {
        center: [28.5, discY + 0.25, -26.2],
        outsideRadius: [2.6, 3.9],
        insideRadius: [0.5, 1.25],
        frontAngle: 0.15,
        frontSpread: Math.PI * 0.9,
      },
      'discussion-workshop': {
        center: [35.8, discY + 0.25, -24.8],
        outsideRadius: [2.2, 3.4],
        insideRadius: [0.45, 1.1],
        frontAngle: -0.25,
        frontSpread: Math.PI * 0.9,
      },
      'discussion-street': {
        center: [32.0, discY + 0.15, -18.5],
        outsideRadius: [2.0, 3.3],
        insideRadius: [0.45, 1.2],
        frontAngle: 0,
        frontSpread: Math.PI * 1.2,
      },
      'creative-exhibition': {
        center: [-35.5, creativeY + 0.25, 21.8],
        outsideRadius: [2.8, 4.2],
        insideRadius: [0.55, 1.35],
        frontAngle: 0.25,
        frontSpread: Math.PI * 0.95,
      },
      'creative-arcade': {
        center: [-27.5, creativeY + 0.2, 27.6],
        outsideRadius: [2.3, 3.6],
        insideRadius: [0.45, 1.15],
        frontAngle: -0.2,
        frontSpread: Math.PI * 0.95,
      },
      'career-academy': {
        center: [28.6, careerY + 0.25, 22.8],
        outsideRadius: [2.5, 3.8],
        insideRadius: [0.5, 1.2],
        frontAngle: 0.2,
        frontSpread: Math.PI * 0.9,
      },
      'career-temple': {
        center: [35.6, careerY + 0.25, 23.8],
        outsideRadius: [2.5, 3.8],
        insideRadius: [0.5, 1.2],
        frontAngle: -0.2,
        frontSpread: Math.PI * 0.9,
      },
    };

    const walkerRobeColors = [
      0x3b6e8c, // 青衫藍
      0xb84a39, // 朱砂紅
      0x3d7a5a, // 竹葉青
      0x7c5295, // 紫檀色
      0xc68b38, // 琥珀金
      0x4a5d6e, // 黛墨藍
      0xd46a7e, // 桃夭粉
    ];
    const walkerSkinMat = new THREE.MeshStandardMaterial({ color: 0xffe4c4, roughness: 0.65 });
    const walkerHairMat = new THREE.MeshStandardMaterial({ color: 0x231f20, roughness: 0.8 });
    const browsingBadgeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 }); // 瀏覽中：青藍倒三角
    const usingBadgeMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });    // 使用中：暖金倒三角

    const MAX_WALKERS = 50;
    const islandWalkers: Array<{
      root: THREE.Group;
      leftLeg: THREE.Mesh;
      rightLeg: THREE.Mesh;
      leftArm: THREE.Mesh;
      rightArm: THREE.Mesh;
      statusDot: THREE.Mesh;
      robeMat: THREE.MeshStandardMaterial;
    }> = [];

    for (let i = 0; i < MAX_WALKERS; i++) {
      const root = new THREE.Group();
      const robeMat = new THREE.MeshStandardMaterial({
        color: walkerRobeColors[i % walkerRobeColors.length],
        roughness: 0.72,
      });

      const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.34, 6), walkerHairMat);
      leftLeg.position.set(-0.08, 0.17, 0);
      root.add(leftLeg);

      const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.34, 6), walkerHairMat);
      rightLeg.position.set(0.08, 0.17, 0);
      root.add(rightLeg);

      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.21, 0.56, 8), robeMat);
      torso.position.set(0, 0.56, 0);
      root.add(torso);

      const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.042, 0.38, 6), robeMat);
      leftArm.position.set(-0.2, 0.62, 0);
      root.add(leftArm);

      const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.042, 0.38, 6), robeMat);
      rightArm.position.set(0.2, 0.62, 0);
      root.add(rightArm);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.145, 10, 10), walkerSkinMat);
      head.position.set(0, 0.99, 0);
      root.add(head);

      const hairBun = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), walkerHairMat);
      hairBun.position.set(0, 1.15, -0.03);
      root.add(hairBun);

      // 線上統計人數小人專屬：頭頂醒目倒三角標記（尖端朝下指向頭頂，NPC 無此標記）
      const invertedTriangleGeo = new THREE.ConeGeometry(0.145, 0.28, 4);
      invertedTriangleGeo.rotateX(Math.PI); // 旋轉 180 度使三角錐尖端朝下（倒三角）
      const statusDot = new THREE.Mesh(invertedTriangleGeo, browsingBadgeMat);
      statusDot.position.set(0, 1.44, 0);
      root.add(statusDot);

      root.scale.setScalar(1.08);
      root.visible = false;
      enableShadows(root);
      worldGroup.add(root);

      islandWalkers.push({
        root,
        leftLeg,
        rightLeg,
        leftArm,
        rightArm,
        statusDot,
        robeMat,
      });
    }

    // =========================================================
    // 9. RAYCASTING FOR CLICKING 3D ISLANDS
    // =========================================================
    const raycaster = new THREE.Raycaster();
    const pointerDownPos = { x: 0, y: 0, time: 0 };

    const handleCanvasPointerDown = (e: PointerEvent) => {
      if (e.button === 0) {
        pointerDownPos.x = e.clientX;
        pointerDownPos.y = e.clientY;
        pointerDownPos.time = performance.now();
      }
    };

    const handleCanvasPointerUp = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      const elapsed = performance.now() - pointerDownPos.time;
      if (dist > 6 || elapsed > 550) return;

      const rect = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(clickableIslands, true);
      if (hits.length > 0) {
        let obj: THREE.Object3D | null = hits[0].object;
        let foundIslandId: string | undefined;
        let foundDistrictId: string | undefined;
        while (obj) {
          if (obj.userData?.districtId && !foundDistrictId) {
            foundDistrictId = obj.userData.districtId;
          }
          if (obj.userData?.islandId) {
            foundIslandId = obj.userData.islandId;
            break;
          }
          obj = obj.parent;
        }
        if (foundDistrictId === 'home-trade-street' || foundDistrictId === 'main-trade') {
          return;
        }
        if (foundIslandId) {
          onSelectRef.current(foundIslandId, foundDistrictId);
        }
      }
    };

    canvas.addEventListener('pointerdown', handleCanvasPointerDown);
    canvas.addEventListener('pointerup', handleCanvasPointerUp);

    // =========================================================
    // 10. ANIMATION, TIME-OF-DAY + WEATHER LERP & CAMERA LOOP
    // =========================================================
    const clock = new THREE.Clock();
    const smoothedTarget = new THREE.Vector3(0, 1.5, 2);
    const smoothedSpherical = {
      radius: 66,
      pitchRad: THREE.MathUtils.degToRad(48),
      yawRad: 0,
    };
    const tempVec = new THREE.Vector3();
    const targetColorHelper = new THREE.Color();

    let animationFrameId = 0;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      const atmos = PHASE_ATMOS[timePhaseRef.current];
      const isRain = weatherRef.current === 'rain';
      const lerpSpeed = 0.06;

      // Adjust fog & lighting when Rain is active (雨霧 / 雨天 / 雨夕 / 雨夜), and reduce fog density when zoomed far out
      const zoomFogScale = Math.min(1, Math.max(0.42, viewRef.current.zoom));
      const targetFogDensity = (isRain ? atmos.fogDensity * 1.32 : atmos.fogDensity) * zoomFogScale;
      const targetSunIntensity = isRain ? atmos.sunIntensity * 0.68 : atmos.sunIntensity;
      const targetMistOpacity = isRain
        ? Math.max(0.48, atmos.morningMistOpacity * 1.15)
        : atmos.morningMistOpacity;

      bgColor.lerp(targetColorHelper.setHex(atmos.bgColor), lerpSpeed);
      fog.color.lerp(targetColorHelper.setHex(atmos.fogColor), lerpSpeed);
      fog.density = THREE.MathUtils.lerp(fog.density, targetFogDensity, lerpSpeed);

      waterMat.color.lerp(targetColorHelper.setHex(atmos.waterColor), lerpSpeed);
      waterMat.roughness = THREE.MathUtils.lerp(waterMat.roughness, isRain ? 0.08 : 0.22, lerpSpeed);
      mats.stonePlaza.roughness = THREE.MathUtils.lerp(mats.stonePlaza.roughness, isRain ? 0.22 : 0.72, lerpSpeed);
      mats.roofSlate.roughness = THREE.MathUtils.lerp(mats.roofSlate.roughness, isRain ? 0.2 : 0.48, lerpSpeed);

      seabedMat.color.lerp(targetColorHelper.setHex(atmos.seabedColor), lerpSpeed);

      hemiLight.color.lerp(targetColorHelper.setHex(atmos.hemiSky), lerpSpeed);
      hemiLight.groundColor.lerp(targetColorHelper.setHex(atmos.hemiGround), lerpSpeed);
      hemiLight.intensity = THREE.MathUtils.lerp(hemiLight.intensity, atmos.hemiIntensity, lerpSpeed);

      sunLight.color.lerp(targetColorHelper.setHex(atmos.sunColor), lerpSpeed);
      sunLight.intensity = THREE.MathUtils.lerp(sunLight.intensity, targetSunIntensity, lerpSpeed);
      sunLight.position.lerp(
        tempVec.set(atmos.sunPos[0], atmos.sunPos[1], atmos.sunPos[2]),
        lerpSpeed,
      );

      rimLight.color.lerp(targetColorHelper.setHex(atmos.rimColor), lerpSpeed);
      rimLight.intensity = THREE.MathUtils.lerp(rimLight.intensity, atmos.rimIntensity, lerpSpeed);

      renderer.toneMappingExposure = THREE.MathUtils.lerp(
        renderer.toneMappingExposure,
        isRain ? atmos.exposure * 0.94 : atmos.exposure,
        lerpSpeed,
      );

      // In rainy weather, warm interior windows & lanterns glow slightly brighter for cozy contrast
      const rainGlowBoost = isRain ? 1.25 : 1.0;
      mats.windowGlow.emissiveIntensity = THREE.MathUtils.lerp(
        mats.windowGlow.emissiveIntensity,
        atmos.windowEmissive * rainGlowBoost,
        lerpSpeed,
      );
      mats.lanternGlow.emissiveIntensity = THREE.MathUtils.lerp(
        mats.lanternGlow.emissiveIntensity,
        atmos.lanternEmissive * rainGlowBoost,
        lerpSpeed,
      );
      // 燈泡雕像夜晚發光效果（白天維持低飽和柔和金黃，傍晚微亮，夜晚散發璀璨暖金光芒與光暈）
      const isNightPhase = timePhaseRef.current === 'night';
      const isDuskPhase = timePhaseRef.current === 'dusk';
      const pulseFactor = 1 + Math.sin(t * 2.6) * 0.12;
      const targetBulbEmissive = isNightPhase
        ? 2.25 * pulseFactor
        : isDuskPhase
        ? 1.15 * pulseFactor
        : 0.28;
      const targetRingEmissive = isNightPhase
        ? 2.6 * pulseFactor
        : isDuskPhase
        ? 1.35 * pulseFactor
        : 0.48;
      const targetHaloOpacity = isNightPhase
        ? 0.38 * pulseFactor
        : isDuskPhase
        ? 0.14 * pulseFactor
        : 0;
      const targetOuterAuraOpacity = isNightPhase
        ? 0.2 * pulseFactor
        : isDuskPhase
        ? 0.06 * pulseFactor
        : 0;

      mats.bulbGold.emissiveIntensity = THREE.MathUtils.lerp(
        mats.bulbGold.emissiveIntensity,
        targetBulbEmissive * rainGlowBoost,
        lerpSpeed,
      );
      mats.bulbRing.emissiveIntensity = THREE.MathUtils.lerp(
        mats.bulbRing.emissiveIntensity,
        targetRingEmissive * rainGlowBoost,
        lerpSpeed,
      );
      bulbHaloMat.opacity = THREE.MathUtils.lerp(bulbHaloMat.opacity, targetHaloOpacity, lerpSpeed);
      bulbOuterAuraMat.opacity = THREE.MathUtils.lerp(
        bulbOuterAuraMat.opacity,
        targetOuterAuraOpacity,
        lerpSpeed,
      );
      bulbHaloMesh.visible = bulbHaloMat.opacity > 0.01;
      bulbOuterAuraMesh.visible = bulbOuterAuraMat.opacity > 0.01;

      bulbLight.intensity = THREE.MathUtils.lerp(
        bulbLight.intensity,
        (isNightPhase ? atmos.bulbLightIntensity * 1.45 * pulseFactor : atmos.bulbLightIntensity) *
          rainGlowBoost,
        lerpSpeed,
      );

      islandNightLights.forEach((pl) => {
        pl.intensity = THREE.MathUtils.lerp(
          pl.intensity,
          atmos.islandNightLightIntensity * rainGlowBoost,
          lerpSpeed,
        );
      });

      mats.cloudWhite.color.lerp(targetColorHelper.setHex(atmos.cloudColor), lerpSpeed);
      mats.cloudWhite.opacity = THREE.MathUtils.lerp(mats.cloudWhite.opacity, atmos.cloudOpacity, lerpSpeed);
      outerMistRingMats.forEach((rm) => {
        rm.color.lerp(targetColorHelper.setHex(atmos.cloudColor), lerpSpeed);
        rm.emissive.lerp(targetColorHelper.setHex(atmos.fogColor), lerpSpeed);
      });
      nearMountainMistFloorMat.color.lerp(targetColorHelper.setHex(atmos.fogColor), lerpSpeed);
      outerDenseMistFloorMat.color.lerp(targetColorHelper.setHex(atmos.fogColor), lerpSpeed);
      mats.morningMistMat.opacity = THREE.MathUtils.lerp(
        mats.morningMistMat.opacity,
        targetMistOpacity,
        lerpSpeed,
      );

      moonMat.opacity = THREE.MathUtils.lerp(
        moonMat.opacity,
        isRain ? atmos.moonOpacity * 0.65 : atmos.moonOpacity,
        lerpSpeed,
      );
      moonHaloMat.opacity = moonMat.opacity * 0.28;
      starMat.opacity = THREE.MathUtils.lerp(
        starMat.opacity,
        isRain ? atmos.moonOpacity * 0.25 : atmos.moonOpacity * 0.9,
        lerpSpeed,
      );
      sunsetSunMat.opacity = THREE.MathUtils.lerp(
        sunsetSunMat.opacity,
        isRain ? atmos.sunsetGlowOpacity * 0.72 : atmos.sunsetGlowOpacity,
        lerpSpeed,
      );
      sunsetHaloMat.opacity = sunsetSunMat.opacity * 0.3;

      const isDayPhase = timePhaseRef.current === 'morning' || timePhaseRef.current === 'noon';
      const targetDaySunOp = isDayPhase ? (isRain ? 0.38 : 0.92) : 0;
      daySunMat.opacity = THREE.MathUtils.lerp(daySunMat.opacity, targetDaySunOp, lerpSpeed);
      daySunHaloMat.opacity = daySunMat.opacity * 0.28;

      // Animate 3D Rain Particles & River Ripples
      rainMat.opacity = THREE.MathUtils.lerp(rainMat.opacity, isRain ? 0.48 : 0, 0.1);
      rainLines.visible = rainMat.opacity > 0.01;
      if (rainLines.visible) {
        const posAttr = rainGeo.getAttribute('position') as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        for (let i = 0; i < rainDropCount; i++) {
          const idx = i * 6;
          arr[idx + 1] -= 0.95;
          arr[idx + 4] -= 0.95;
          arr[idx] -= 0.18;
          arr[idx + 3] -= 0.18;
          if (arr[idx + 4] < -1) {
            const resetY = 38 + Math.random() * 6;
            const resetX = (Math.random() - 0.5) * 110;
            arr[idx] = resetX;
            arr[idx + 1] = resetY;
            arr[idx + 3] = resetX - 0.35;
            arr[idx + 4] = resetY - 1.65;
          }
        }
        posAttr.needsUpdate = true;
      }

      rainRipples.forEach((rp) => {
        if (!isRain) {
          rp.mat.opacity = THREE.MathUtils.lerp(rp.mat.opacity, 0, 0.12);
          rp.mesh.visible = rp.mat.opacity > 0.01;
          return;
        }
        rp.mesh.visible = true;
        const cycle = (t * 1.4 + rp.phase) % 1;
        const scale = 0.6 + cycle * 2.8;
        rp.mesh.scale.set(scale, scale, 1);
        rp.mat.opacity = (1 - cycle) * 0.55;
      });

      // 1. Animate Central Lightbulb Statue Rotation & Gentle Float
      bulbGroup.rotation.y = t * 0.9;
      orbitRingGroup.rotation.y = -t * 1.2;
      bulbGroup.position.y = homeY + 4.85 + Math.sin(t * 2.1) * 0.2;

      // 1.5 江南垂柳柳絲與兩排桃花林隨微風輕柔擺動
      swayingWillowFronds.forEach((wf) => {
        wf.group.rotation.z = Math.sin(t * 1.6 + wf.phase) * 0.055;
        wf.group.rotation.x = Math.cos(t * 1.3 + wf.phase) * 0.045;
      });
      swayingTrees.forEach((st) => {
        st.group.rotation.z = Math.sin(t * 1.5 + st.phase) * st.amp;
        st.group.rotation.x = Math.cos(t * 1.2 + st.phase) * (st.amp * 0.8);
      });

      // 1.8 風吹稻浪（水稻梯田秧苗隨微風陣陣翻滾起伏）
      const windT = t * 2.8;
      for (let i = 0; i < swayingRiceShoots.length; i++) {
        const rs = swayingRiceShoots[i];
        const wave = Math.sin(windT + rs.baseX * 0.28 + rs.baseZ * 0.22 + rs.phase);
        rs.mesh.rotation.z = wave * 0.18;
        rs.mesh.rotation.x = Math.cos(windT * 0.85 + rs.baseX * 0.2) * 0.10;
      }

      // 2. Rotate Waterwheels
      discWheel.rotation.z = -t * 0.9;
      creativeWheel.rotation.z = t * 0.9;
      animatedWaterwheels.forEach((w) => {
        w.rotation.x = t * 1.15;
      });

      // 2.5 Farmland Vitality & Bridge Angler Living Animations (悠閒黃牛晃頭、辛勤農夫勞作、白鷺鷥振翅、小雞啄米、橋上垂釣客提竿)
      animatedOxHeads.forEach((oxHead, idx) => {
        oxHead.rotation.x = 0.2 + Math.sin(t * 1.4 + idx * 1.2) * 0.12;
      });
      animatedEgrets.forEach((eg) => {
        const flap = Math.sin(t * 7.5 + eg.phase) * 0.42;
        eg.leftWing.rotation.z = flap;
        eg.rightWing.rotation.z = -flap;
      });
      animatedFarmers.forEach((f) => {
        f.torso.rotation.x = Math.sin(t * 2.2 + f.phase) * 0.14;
      });
      animatedChickens.forEach((c) => {
        c.head.rotation.x = Math.max(0, Math.sin(t * 4.2 + c.phase)) * 0.38;
      });
      animatedAnglers.forEach((ag) => {
        // 釣客釣竿隨水波微晃，偶爾輕微抖動提竿
        const nibble = Math.pow(Math.max(0, Math.sin(t * 1.8 + ag.phase)), 4) * 0.12;
        ag.rodGroup.rotation.x = Math.sin(t * 1.3 + ag.phase) * 0.035 - nibble;
      });

      // 3. Bobbing Moored Jiangnan Boat & Sailing Jiangnan Boats along Waterways
      sailboat.position.y = -0.18 + Math.sin(t * 1.8) * 0.08;
      sailboat.rotation.z = Math.sin(t * 1.4) * 0.03;
      riverBoats.forEach((b, bIdx) => {
        const u = (b.phase + t * b.speed) % 1;
        const uNext = (u + 0.004) % 1;
        const [bx, bz] = b.getPoint(u);
        const [nx, nz] = b.getPoint(uNext);
        b.mesh.position.x = bx;
        b.mesh.position.z = bz;
        b.mesh.position.y = b.baseY + Math.sin(t * 2.2 + bIdx * 1.3) * 0.06;
        b.mesh.rotation.y = Math.atan2(nx - bx, nz - bz);
        b.mesh.rotation.z = Math.sin(t * 1.8 + bIdx) * 0.025;
        // 搖櫓左右擺動與水波紋呼吸
        b.oarPivot.rotation.y = Math.sin(t * 4.2 + bIdx * 0.9) * 0.35;
        b.oarPivot.rotation.z = Math.cos(t * 4.2 + bIdx * 0.9) * 0.12;
        const wakeScale = 0.92 + Math.sin(t * 5.0 + bIdx) * 0.12;
        b.wakeGroup.scale.set(wakeScale, 1, 1 + Math.cos(t * 4.0 + bIdx) * 0.1);
      });

      // 4. Waterfall Foam Pulse, Outer Dense Mist Drift & Cloud / Mist Drift
      waterfallDrops.forEach((drop, idx) => {
        drop.scale.setScalar(0.85 + Math.sin(t * 4.5 + idx) * 0.22);
      });
      outerMistRings.forEach((om, idx) => {
        const curAngle = om.baseAngle + t * om.speed;
        const rx = om.radius * 1.14;
        const rz = om.radius * 0.96;
        om.group.position.x = Math.cos(curAngle) * rx;
        om.group.position.z = Math.sin(curAngle) * rz;
        om.group.position.y = om.baseY + Math.sin(t * 0.4 + idx) * 0.35;
        om.group.rotation.y = -curAngle + Math.PI / 2;
      });
      cloudClusters.forEach((c) => {
        c.group.position.x = c.baseX + Math.sin(t * 0.25 + c.phase) * 1.2;
      });
      valleyMists.forEach((m) => {
        m.group.position.x = m.baseX + Math.sin(t * 0.35 + m.phase) * 1.8;
        m.group.visible = mats.morningMistMat.opacity > 0.02;
      });
      mountainPeakClouds.forEach((pc) => {
        pc.group.rotation.y = t * pc.speed + pc.phase;
        pc.group.position.y = pc.baseY + Math.sin(t * 0.7 + pc.phase) * 0.45;
      });

      // 4.2 線上真人 3D 小人動態更新（上限 50 位：頭頂旋轉倒三角標記，瀏覽中在建築外漫步並注視裡面，使用中進入建築內部）
      const currentAvatars = avatarsRef.current || [];
      for (let i = 0; i < MAX_WALKERS; i++) {
        const walker = islandWalkers[i];
        const alloc = currentAvatars[i];
        if (!alloc) {
          walker.root.visible = false;
          continue;
        }
        const anchor = BUILDING_3D_ANCHORS[alloc.buildingId] || BUILDING_3D_ANCHORS['home-plaza'];
        walker.root.visible = true;

        const seed = alloc.slotIndex * 1.618 + (i + 1) * 0.73;
        const [cx, cy, cz] = anchor.center;

        if (alloc.activity === 'browsing') {
          // 瀏覽中：在島上建築物外面漫步，並停駐注視建築物裡面
          walker.statusDot.material = browsingBadgeMat;
          const [minR, maxR] = anchor.outsideRadius;
          const r = minR + ((seed * 3.7) % 1) * (maxR - minR);
          // 週期性在建築正前方弧線走動與駐足注視建築內部
          const cycle = (t * 0.42 + seed) % (Math.PI * 2);
          const swayAngle = anchor.frontAngle + Math.sin(cycle) * (anchor.frontSpread * 0.45);
          const wx = cx + Math.cos(swayAngle) * r;
          const wz = cz + Math.sin(swayAngle) * r;

          walker.root.position.set(wx, cy, wz);
          // 面向建築物內部中心（注視建築物裡面）
          walker.root.rotation.y = Math.atan2(cx - wx, cz - wz);

          const walkSpeed = Math.abs(Math.cos(cycle));
          const limbSwing = Math.sin(t * 5.2 + seed * 4) * 0.42 * walkSpeed;
          walker.leftLeg.rotation.x = limbSwing;
          walker.rightLeg.rotation.x = -limbSwing;
          walker.leftArm.rotation.x = -limbSwing * 0.7;
          walker.rightArm.rotation.x = limbSwing * 0.7;
        } else {
          // 正在使用功能：進入建築物內部走動與互動
          walker.statusDot.material = usingBadgeMat;
          const [minR, maxR] = anchor.insideRadius;
          const r = minR + ((seed * 2.3) % 1) * (maxR - minR);
          const orbitAngle = seed * Math.PI * 2 + t * (0.55 + (i % 3) * 0.12);
          const wx = cx + Math.cos(orbitAngle) * r;
          const wz = cz + Math.sin(orbitAngle) * r;
          const nextAngle = orbitAngle + 0.08;
          const nx = cx + Math.cos(nextAngle) * r;
          const nz = cz + Math.sin(nextAngle) * r;

          walker.root.position.set(wx, cy + 0.08, wz);
          walker.root.rotation.y = Math.atan2(nx - wx, nz - wz);

          const limbSwing = Math.sin(t * 6.4 + seed * 3) * 0.48;
          walker.leftLeg.rotation.x = limbSwing;
          walker.rightLeg.rotation.x = -limbSwing;
          walker.leftArm.rotation.x = -limbSwing * 0.75;
          walker.rightArm.rotation.x = limbSwing * 0.75;
        }
        walker.statusDot.rotation.y = t * 2.4 + seed;
        walker.statusDot.position.y = 1.44 + Math.sin(t * 3.2 + seed) * 0.05;
      }

      // 4.5 好天氣時偶爾飛過天際的飛鳥群（每 24 秒為一週期，其中 16 秒優雅飛越群島上空，8 秒歇息）
      const isGoodWeatherForBirds = !isRain && timePhaseRef.current !== 'night';
      const birdCycleDuration = 24;
      const birdActiveDuration = 16;
      const cycleTime = t % birdCycleDuration;
      const passIndex = Math.floor(t / birdCycleDuration);

      if (isGoodWeatherForBirds && cycleTime < birdActiveDuration) {
        birdFlockGroup.visible = true;
        const progress = cycleTime / birdActiveDuration; // 0 -> 1
        // 交替不同航線飛越群島上空
        const isEvenPass = passIndex % 2 === 0;
        const startX = isEvenPass ? -64 : 64;
        const endX = isEvenPass ? 64 : -64;
        const startZ = isEvenPass ? -30 : 22;
        const endZ = isEvenPass ? 24 : -26;

        const curX = THREE.MathUtils.lerp(startX, endX, progress);
        const curZ =
          THREE.MathUtils.lerp(startZ, endZ, progress) +
          Math.sin(progress * Math.PI) * (isEvenPass ? -8 : 8);
        const curY = 18.5 + Math.sin(progress * Math.PI) * 2.2 + Math.sin(t * 1.6) * 0.35;

        const nextProgress = Math.min(1, progress + 0.01);
        const nextX = THREE.MathUtils.lerp(startX, endX, nextProgress);
        const nextZ =
          THREE.MathUtils.lerp(startZ, endZ, nextProgress) +
          Math.sin(nextProgress * Math.PI) * (isEvenPass ? -8 : 8);

        birdFlockGroup.position.set(curX, curY, curZ);
        birdFlockGroup.rotation.y = Math.atan2(nextX - curX, nextZ - curZ);

        flockBirds.forEach((b) => {
          const flap = Math.sin(t * 7.8 + b.phase) * 0.55;
          b.leftWing.rotation.z = flap;
          b.rightWing.rotation.z = -flap;
          b.group.position.y = b.baseOffset[1] + Math.cos(t * 7.8 + b.phase) * 0.06;
        });
      } else {
        birdFlockGroup.visible = false;
      }

      // 5. Update Selection Highlight Ring position
      const activeId = selectedIslandRef.current || 'home';
      const [ix, iz] = ISLAND_WORLD_CENTERS[activeId] || [0, 0];
      selectionRing.position.x = THREE.MathUtils.lerp(selectionRing.position.x, ix, 0.12);
      selectionRing.position.z = THREE.MathUtils.lerp(selectionRing.position.z, iz, 0.12);
      const ringScale = 1 + Math.sin(t * 3) * 0.03;
      selectionRing.scale.set(ringScale, ringScale, 1);

      // 6. Camera Orbit + Pan calculation from `viewRef.current` (zoom 40% ~ 240%, radius 40 ~ 240)
      const v = viewRef.current;
      const clampedZoom = THREE.MathUtils.clamp(v.zoom, 0.4, 2.4);
      const targetRadius = THREE.MathUtils.clamp(78 / clampedZoom, 32.5, 240);
      const targetPitch = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(v.pitch, 18, 74));
      const targetYaw = THREE.MathUtils.degToRad(-v.yaw);

      smoothedSpherical.radius = THREE.MathUtils.lerp(smoothedSpherical.radius, targetRadius, 0.14);
      smoothedSpherical.pitchRad = THREE.MathUtils.lerp(smoothedSpherical.pitchRad, targetPitch, 0.14);
      smoothedSpherical.yawRad = THREE.MathUtils.lerp(smoothedSpherical.yawRad, targetYaw, 0.14);

      const panFactor = 0.055 / Math.max(0.42, v.zoom);
      const localRight = -v.panX * panFactor;
      const localForward = -v.panY * panFactor;
      const cosY = Math.cos(smoothedSpherical.yawRad);
      const sinY = Math.sin(smoothedSpherical.yawRad);

      const desiredTargetX = localRight * cosY + localForward * sinY;
      const desiredTargetZ = -localRight * sinY + localForward * cosY + 1.5;

      smoothedTarget.x = THREE.MathUtils.lerp(smoothedTarget.x, desiredTargetX, 0.16);
      smoothedTarget.z = THREE.MathUtils.lerp(smoothedTarget.z, desiredTargetZ, 0.16);

      const horizDist = smoothedSpherical.radius * Math.cos(smoothedSpherical.pitchRad);
      const vertDist = smoothedSpherical.radius * Math.sin(smoothedSpherical.pitchRad);

      camera.position.set(
        smoothedTarget.x + Math.sin(smoothedSpherical.yawRad) * horizDist,
        smoothedTarget.y + vertDist,
        smoothedTarget.z + Math.cos(smoothedSpherical.yawRad) * horizDist,
      );
      camera.lookAt(smoothedTarget);

      renderer.render(scene, camera);

      // 7. Project 3D Floating Callout Labels to 2D Screen Coordinates
      // 地名分級與縮放規則：
      // < 75% 遠景俯瞰：只顯示一級地名（島名）
      // 75% 以上(包含)且 < 100%：只顯示二級地名（各島核心主建築/分區）
      // 100% 以上(包含)：才能顯示三級地名（二級與三級細部分展區/展位/看板）
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      const badgeScale = Math.min(1.08, Math.max(0.76, Math.pow(v.zoom, 0.35)));
      const currentZoomPct = Math.round(v.zoom * 100);

      ISLAND_3D_LABELS.forEach((lbl) => {
        const el = labelRefs.current[lbl.id];
        if (!el) return;

        const labelTier = lbl.tier || (lbl.kind === 'island' ? 1 : 2);
        let shouldDisplay = false;

        if (currentZoomPct < 75) {
          // 75% 以下只顯示一級地名（島名）
          shouldDisplay = labelTier === 1;
        } else if (currentZoomPct < 100) {
          // 75% 以上(包含)只顯示二級地名
          shouldDisplay = labelTier === 2;
        } else {
          // 100% 才能顯示三級地名（100% 以上二級與三級同時呈現）
          shouldDisplay = labelTier === 2 || labelTier === 3;
        }

        if (!shouldDisplay) {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
          return;
        }

        tempVec.set(lbl.worldPos[0], lbl.worldPos[1], lbl.worldPos[2]);
        tempVec.project(camera);

        if (tempVec.z > 1) {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
          return;
        }
        const sx = (tempVec.x * 0.5 + 0.5) * width;
        const sy = (-tempVec.y * 0.5 + 0.5) * height;
        el.style.opacity = '1';
        el.style.pointerEvents = lbl.isStaticOnly ? 'none' : 'auto';
        el.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -100%) scale(${badgeScale})`;
      });
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('pointerdown', handleCanvasPointerDown);
      canvas.removeEventListener('pointerup', handleCanvasPointerUp);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      envTarget.dispose();
      renderer.dispose();
      if (canvas.parentNode === container) {
        container.removeChild(canvas);
      }
    };
  }, []);

  if (webglFailed) {
    return null;
  }

  return (
    <div className="island-webgl-wrapper">
      <div ref={mountRef} className="island-webgl-canvas-mount" />

      {/* 3D World-Projected Floating Callout Badges (分級顯示：<75% 一級島名，>=75% 只顯示二級，>=100% 顯示三級) */}
      <div className="island-3d-labels-layer">
        {ISLAND_3D_LABELS.map((lbl) => {
          const isSelected = selectedIslandId === lbl.islandId;
          const bStats = lbl.buildingId && buildingStats ? buildingStats[lbl.buildingId] : undefined;
          const pct = bStats ? bStats.percentage : 0;

          const handleBadgeClick = (e: React.MouseEvent | React.KeyboardEvent) => {
            if (lbl.isStaticOnly) return;
            e.stopPropagation();
            if (lbl.kind === 'island' || lbl.tier === 1) {
              if (onFocusIslandRef.current) {
                onFocusIslandRef.current(lbl.islandId);
              } else {
                onSelectIsland(lbl.islandId, lbl.districtId, lbl.streetId);
              }
            } else {
              onSelectIsland(lbl.islandId, lbl.districtId, lbl.streetId);
            }
          };

          return (
            <div
              key={lbl.id}
              ref={(el) => {
                labelRefs.current[lbl.id] = el;
              }}
              onClick={lbl.isStaticOnly ? undefined : handleBadgeClick}
              className={`island-3d-callout-badge ${
                lbl.isStaticOnly ? 'is-static-only' : 'island-ui-interactive'
              } ${lbl.isSecondary ? 'is-secondary' : ''} ${isSelected ? 'is-selected' : ''}`}
              role={lbl.isStaticOnly ? undefined : 'button'}
              tabIndex={lbl.isStaticOnly ? -1 : 0}
              title={
                lbl.isStaticOnly
                  ? `${lbl.title}（籌備中，暫未開放）`
                  : lbl.tier === 1 || lbl.kind === 'island'
                  ? `點擊進入「${lbl.title}」`
                  : bStats
                  ? `${lbl.title}：目前線上佔比 ${pct}%（瀏覽 ${bStats.browsingCount} 人 · 使用 ${bStats.usingCount} 人）`
                  : lbl.title
              }
              onKeyDown={(e) => {
                if (lbl.isStaticOnly) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleBadgeClick(e);
                }
              }}
            >
              <div className="callout-badge-title-row">
                <span className="callout-badge-title">{lbl.title}</span>
                {lbl.kind === 'building' && !lbl.isStaticOnly && (
                  <span className="callout-badge-count">{pct}%</span>
                )}
              </div>
              <div className="callout-badge-pointer" />
            </div>
          );
        })}
      </div>
    </div>
  );
};
