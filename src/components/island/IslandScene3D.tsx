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
  timeMode?: TimeOfDayMode;
  localHour?: number;
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
    worldPos: [0, 8.6, -13.6],
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

  // 4. 討論島（藏書閣、工作坊、茶藝街 — 三大物件拉開間距，避免擁擠）
  {
    id: 'bldg-discussion-library',
    islandId: 'discussion',
    districtId: 'discussion-academic-district',
    buildingId: 'discussion-library',
    title: '藏書閣',
    worldPos: [26.3, 11.8, -31.3],
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
    worldPos: [41.7, 10.2, -29.1],
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
    worldPos: [31.7, 8.4, -16.9],
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
  timeMode = 'auto',
  localHour,
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
  const [isSceneLoading, setIsSceneLoading] = useState(true);
  const [loadingHint, setLoadingHint] = useState('正在啟動 3D 繪圖引擎與江南水鄉光影...');
  const [easterEggToast, setEasterEggToast] = useState<{ verse: string; key: number } | null>(null);
  const easterEggTimerRef = useRef<number | null>(null);

  const triggerEasterEggRef = useRef<(verse: string) => void>(() => {});
  triggerEasterEggRef.current = (verse: string) => {
    if (easterEggTimerRef.current !== null) {
      window.clearTimeout(easterEggTimerRef.current);
    }
    setEasterEggToast({ verse, key: Date.now() });
    easterEggTimerRef.current = window.setTimeout(() => {
      setEasterEggToast(null);
      easterEggTimerRef.current = null;
    }, 5200);
  };

  const viewRef = useRef<IslandViewTransform>(view);
  viewRef.current = view;

  const timePhaseRef = useRef<TimeOfDayPhase>(timePhase);
  timePhaseRef.current = timePhase;

  const timeModeRef = useRef<TimeOfDayMode>(timeMode);
  timeModeRef.current = timeMode;

  const localHourRef = useRef<number | undefined>(localHour);
  localHourRef.current = localHour;

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

    let cancelled = false;
    let teardownScene: (() => void) | null = null;
    setIsSceneLoading(true);
    setLoadingHint('正在建構創點源五島地形、拱橋水道與田園景觀...');

    const bootTimer = window.setTimeout(() => {
      if (cancelled || !mountRef.current) return;

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
        });
      } catch {
        setWebglFailed(true);
        setIsSceneLoading(false);
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
      // 外圍民房專屬窗光與門燈材質（晚上九點以後全部民房暗下來）
      homesteadWindowGlow: new THREE.MeshStandardMaterial({
        color: 0xffe39f,
        emissive: 0xffa726,
        emissiveIntensity: initialAtmos.windowEmissive,
        roughness: 0.45,
      }),
      homesteadLanternGlow: new THREE.MeshStandardMaterial({
        color: 0xff5722,
        emissive: 0xff4500,
        emissiveIntensity: initialAtmos.lanternEmissive,
        roughness: 0.35,
      }),
      // 山上唯一古塔樓專屬夜間發光材質（晚上持續璀璨發亮，不受民房熄燈影響）
      pagodaWindowGlow: new THREE.MeshStandardMaterial({
        color: 0xfff0b3,
        emissive: 0xffae19,
        emissiveIntensity: initialAtmos.windowEmissive * 1.35,
        roughness: 0.25,
      }),
      pagodaLanternGlow: new THREE.MeshStandardMaterial({
        color: 0xff6d2b,
        emissive: 0xff5500,
        emissiveIntensity: initialAtmos.lanternEmissive * 1.35,
        roughness: 0.25,
      }),
      pagodaSpireGlow: new THREE.MeshStandardMaterial({
        color: 0xffe566,
        emissive: 0xffaa00,
        emissiveIntensity: 1.2,
        roughness: 0.22,
        metalness: 0.65,
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
      elongateNorth = 0,
    ) => {
      const pts: THREE.Vector2[] = [];
      const segments = 36;
      for (let i = 0; i < segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        const wave =
          1 +
          0.045 * Math.sin(a * 3 + seed) +
          0.032 * Math.cos(a * 5 - seed * 1.7) +
          0.02 * Math.sin(a * 2 + seed * 0.8);
        let rx = radiusX * wave;
        let rz = radiusZ * wave;
        if (elongateSouth > 0 && Math.sin(a) > 0) {
          rz += elongateSouth * Math.pow(Math.sin(a), 1.6);
        }
        if (elongateNorth > 0 && Math.sin(a) < 0) {
          const northFactor = Math.pow(-Math.sin(a), 1.45);
          rz += elongateNorth * northFactor;
          rx *= 1 - 0.14 * northFactor;
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
      const elongateSouth = islandId === 'home' ? 2.4 : islandId === 'discussion' ? 3.2 : 0;
      const elongateNorth = islandId === 'home' ? 10.6 : 0;

      // 單一有機不規則島嶼岸線（向下深扎至河床 y = -2.1，絕不懸浮或堆疊圓盤）
      const baseShape = createOrganicShape(
        radiusX * 0.98,
        radiusZ * 0.98,
        seed,
        elongateSouth,
        elongateNorth,
      );
      const rockExtrude = new THREE.ExtrudeGeometry(baseShape, {
        depth: height + 1.4,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 1,
        bevelSize: 0.78,
        bevelThickness: 0.35,
        curveSegments: 28,
      });
      rockExtrude.rotateX(Math.PI / 2);
      const rockMesh = new THREE.Mesh(rockExtrude, mats.cliffRock);
      rockMesh.position.y = height - 0.35;
      group.add(rockMesh);

      const grassShape = createOrganicShape(
        radiusX * 0.97,
        radiusZ * 0.97,
        seed,
        elongateSouth,
        elongateNorth,
      );
      const grassExtrude = new THREE.ExtrudeGeometry(grassShape, {
        depth: 0.16,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.38,
        bevelThickness: 0.16,
        curveSegments: 28,
      });
      grassExtrude.rotateX(Math.PI / 2);
      const grassCap = new THREE.Mesh(grassExtrude, mats.grassTop);
      grassCap.position.y = height + 0.16;
      group.add(grassCap);

      // 島嶼邊緣層疊蒼翠青苔奇石與護岸岩塊（營造寫實立體山石肌理）
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2 + seed * 0.37;
        const jitter = 0.92 + ((i * 7) % 5) * 0.035;
        const rx = Math.cos(angle) * radiusX * jitter;
        const rz =
          Math.sin(angle) *
          (radiusZ * jitter +
            (Math.sin(angle) < 0 ? elongateNorth * 0.76 : elongateSouth * 0.76));
        const rSize = 0.78 + (i % 4) * 0.28;
        const rock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(rSize, 0),
          i % 3 === 0 ? mats.cliffDark : mats.cliffRock,
        );
        rock.position.set(rx, height * (0.18 + (i % 3) * 0.16), rz);
        rock.scale.set(1.25, 0.95 + (i % 2) * 0.35, 1.15);
        rock.rotation.set(i * 0.3, angle, i * 0.2);
        group.add(rock);

        if (i % 2 === 0) {
          const mossCap = new THREE.Mesh(
            new THREE.DodecahedronGeometry(rSize * 0.68, 0),
            mats.grassLush,
          );
          mossCap.position.set(rx * 0.98, height * 0.58 + (i % 2) * 0.22, rz * 0.98);
          mossCap.scale.set(1.3, 0.45, 1.2);
          group.add(mossCap);
        }
      }

      // 四座外島懸崖邊緣飛泉小瀑布（參照圖中各島岩壁傾瀉入河的水道飛瀑）
      if (islandId !== 'home') {
        const wfAngles =
          islandId === 'pain'
            ? [Math.PI * 0.68]
            : islandId === 'discussion'
            ? [Math.PI * 0.18, Math.PI * 0.82]
            : islandId === 'creative'
            ? [Math.PI * 0.35]
            : [Math.PI * 0.28];
        wfAngles.forEach((wAngle) => {
          const wx = Math.cos(wAngle) * radiusX * 0.95;
          const wz =
            Math.sin(wAngle) *
            (radiusZ * 0.95 +
              (Math.sin(wAngle) < 0 ? elongateNorth * 0.7 : elongateSouth * 0.7));
          const cliffFall = new THREE.Group();
          cliffFall.position.set(wx, 0, wz);
          cliffFall.rotation.y = Math.atan2(wx, wz);

          const fallStream = new THREE.Mesh(
            new THREE.BoxGeometry(1.65, height + 0.55, 0.38),
            mats.waterFoam,
          );
          fallStream.position.set(0, height * 0.42, 0.22);
          fallStream.rotation.x = 0.16;
          cliffFall.add(fallStream);

          for (let f = 0; f < 4; f++) {
            const foam = new THREE.Mesh(
              new THREE.SphereGeometry(0.32 + (f % 2) * 0.12, 8, 8),
              mats.waterFoam,
            );
            foam.position.set((f - 1.5) * 0.42, -0.38, 0.48);
            foam.scale.set(1.3, 0.55, 1.2);
            cliffFall.add(foam);
          }
          group.add(cliffFall);
        });
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

    // 桃花樹（隱世桃源粉嫩桃花林，微風中隨風輕擺；點擊觸發《桃花源記》桃花林詩文彩蛋）
    const createSakuraTree = (scale = 1, canSway = true) => {
      const tree = new THREE.Group();
      tree.userData = {
        easterEggPoem: '「忽逢桃花林，夾岸數百步，中無雜樹，芳草鮮美，落英繽紛。」',
        easterEggKind: 'peach_tree',
      };
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
      clickableIslands.push(tree);
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

      // 四角飛簷翹角（營造古典歇山／廡殿頂飛動韻味）
      [
        [-width * 0.54, -depth * 0.54],
        [width * 0.54, -depth * 0.54],
        [-width * 0.54, depth * 0.54],
        [width * 0.54, depth * 0.54],
      ].forEach(([cx, cz]) => {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 4), mats.goldTrim);
        horn.position.set(cx, 0.26, cz);
        horn.rotation.z = cx > 0 ? -0.45 : 0.45;
        horn.rotation.x = cz > 0 ? 0.45 : -0.45;
        roofGroup.add(horn);
      });

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

    // 江南市集攤販（支援經典藍白／紅白條紋遮陽布篷與黛瓦飛簷，還原參考圖市集攤位細節）
    const createMarketStall = (accentMat: THREE.Material) => {
      const stall = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.24, 1.4), mats.stoneStep);
      base.position.y = 0.12;
      stall.add(base);

      const counter = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.72, 1.15), mats.woodWarm);
      counter.position.y = 0.52;
      stall.add(counter);

      const woodTrim = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.14, 1.22), mats.woodDark);
      woodTrim.position.y = 0.88;
      stall.add(woodTrim);

      // 攤位桌面貨品（茶罐、果籃、布匹細節）
      [-0.55, 0, 0.55].forEach((gx, gIdx) => {
        const good = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.18, 0.22, 8),
          gIdx === 1 ? mats.goldTrim : accentMat,
        );
        good.position.set(gx, 1.04, 0.12);
        stall.add(good);
      });

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

      // 雙色相間條紋布篷頂（參照圖中主島與街道兩旁繽紛條紋遮陽棚）
      const canopyGroup = new THREE.Group();
      canopyGroup.position.y = 1.72;
      for (let s = -2; s <= 2; s++) {
        const stripe = new THREE.Mesh(
          new THREE.BoxGeometry(0.44, 0.16, 1.62),
          Math.abs(s) % 2 === 0 ? accentMat : mats.sailCream,
        );
        stripe.position.set(s * 0.44, 0, 0);
        stripe.rotation.x = 0.18;
        canopyGroup.add(stripe);
      }
      stall.add(canopyGroup);

      const banner = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.62, 0.04), accentMat);
      banner.position.set(1.02, 1.35, 0.56);
      stall.add(banner);

      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), mats.lanternGlow);
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

    // 中央青石同心圓雕花廣場台基與八角石欄望柱（還原參考圖主島中央精緻圓環廣場）
    const outerPlazaRing = new THREE.Mesh(
      new THREE.CylinderGeometry(5.6, 5.9, 0.22, 24),
      mats.stoneStep,
    );
    outerPlazaRing.position.y = homeY + 0.11;
    homeBase.group.add(outerPlazaRing);

    const centralPlaza = new THREE.Mesh(
      new THREE.CylinderGeometry(4.3, 4.5, 0.34, 24),
      mats.stonePlaza,
    );
    centralPlaza.position.y = homeY + 0.22;
    homeBase.group.add(centralPlaza);

    // 廣場四周 8 根雕花青石望柱與低矮石欄
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.16, 0.78, 8),
        mats.stonePlaza,
      );
      post.position.set(Math.cos(a) * 4.25, homeY + 0.58, Math.sin(a) * 4.25);
      homeBase.group.add(post);

      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), mats.goldTrim);
      cap.position.set(Math.cos(a) * 4.25, homeY + 1.02, Math.sin(a) * 4.25);
      homeBase.group.add(cap);
    }

    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.85, 1.2, 8), mats.arcadeDark);
    pedestal.position.y = homeY + 0.92;
    homeBase.group.add(pedestal);

    const pedestalTrim = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 1.78, 0.18, 8), mats.goldTrim);
    pedestalTrim.position.y = homeY + 0.45;
    homeBase.group.add(pedestalTrim);

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

    // 4. 環繞燈泡球體的傾斜金色星軌光環（參照圖中環繞大燈泡的動感金環）
    const orbitRingGroup = new THREE.Group();
    orbitRingGroup.position.y = 0.65;
    orbitRingGroup.rotation.z = 0.34;
    orbitRingGroup.rotation.x = 0.22;
    bulbGroup.add(orbitRingGroup);

    const orbitTorus = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.11, 14, 56), mats.bulbRing);
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

    // 5.5 小燈泡隱藏表情與雙手（平常是無臉雕像；點擊時露出微笑表情、招手並快速轉一圈）
    bulbGroup.userData = {
      isXiaoDengPaoStatue: true,
      islandId: 'home',
      districtId: 'home-plaza',
    };
    const xiaoDengPaoFeaturesGroup = new THREE.Group();
    xiaoDengPaoFeaturesGroup.visible = false;
    xiaoDengPaoFeaturesGroup.scale.setScalar(0.01);
    bulbGroup.add(xiaoDengPaoFeaturesGroup);

    const xdpDarkMat = new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.45 });
    const xdpWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
    const xdpIrisMat = new THREE.MeshStandardMaterial({ color: 0x6b3e26, roughness: 0.3 });
    const xdpEyelidMat = new THREE.MeshStandardMaterial({
      color: 0xf4c44e,
      emissive: 0xd99b26,
      emissiveIntensity: 0.25,
      roughness: 0.35,
    });
    const xdpBlushMat = new THREE.MeshBasicMaterial({
      color: 0xff8da1,
      transparent: true,
      opacity: 0.68,
    });

    // 臉部表情群組（位於燈泡正面 z = +2.06, y = 1.25）
    const xdpFaceGroup = new THREE.Group();
    xdpFaceGroup.position.set(0, 1.22, 2.02);
    xiaoDengPaoFeaturesGroup.add(xdpFaceGroup);

    [-0.54, 0.54].forEach((ex, idx) => {
      const side = idx === 0 ? -1 : 1;
      // 眉毛
      const brow = new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.042, 8, 16, Math.PI * 0.65),
        xdpDarkMat,
      );
      brow.position.set(ex, 0.36, 0.02);
      brow.rotation.z = Math.PI * 0.18 - side * 0.08;
      xdpFaceGroup.add(brow);

      // 眼白
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), xdpWhiteMat);
      eyeWhite.scale.set(1.0, 1.08, 0.42);
      eyeWhite.position.set(ex, 0.08, 0.04);
      xdpFaceGroup.add(eyeWhite);

      // 金色半垂眼皮（還原小燈泡招牌溫柔眼神）
      const eyelid = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.46),
        xdpEyelidMat,
      );
      eyelid.scale.set(1.02, 1.08, 0.46);
      eyelid.position.set(ex, 0.1, 0.05);
      eyelid.rotation.x = -0.18;
      xdpFaceGroup.add(eyelid);

      // 焦糖棕瞳孔與白色高光
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 14), xdpIrisMat);
      iris.scale.set(1.0, 1.05, 0.38);
      iris.position.set(ex, 0.04, 0.11);
      xdpFaceGroup.add(iris);

      const highlight = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 10), xdpWhiteMat);
      highlight.position.set(ex + 0.045, 0.09, 0.16);
      xdpFaceGroup.add(highlight);

      // 粉紅腮紅
      const blush = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 12), xdpBlushMat);
      blush.scale.set(1.35, 0.82, 0.25);
      blush.position.set(ex * 1.38, -0.22, -0.02);
      xdpFaceGroup.add(blush);
    });

    // 微笑嘴巴弧線
    const smileMouth = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.048, 10, 24, Math.PI * 0.78),
      xdpDarkMat,
    );
    smileMouth.position.set(0, -0.12, 0.06);
    smileMouth.rotation.z = Math.PI * 1.11;
    xdpFaceGroup.add(smileMouth);

    // 左右小手臂與白手套（點擊時右手熱情招手）
    const createBulbArm = (side: -1 | 1) => {
      const armPivot = new THREE.Group();
      armPivot.position.set(side * 1.32, -0.36, 0.35);

      const shoulderJoint = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), xdpEyelidMat);
      armPivot.add(shoulderJoint);

      const upperArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.14, 0.95, 12),
        xdpEyelidMat,
      );
      upperArm.position.set(side * 0.42, -0.18, 0.12);
      upperArm.rotation.z = side * 1.15;
      armPivot.add(upperArm);

      const gloveGroup = new THREE.Group();
      gloveGroup.position.set(side * 0.92, -0.32, 0.22);

      const gloveCuff = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.065, 10, 18), xdpWhiteMat);
      gloveCuff.rotation.y = Math.PI / 2;
      gloveGroup.add(gloveCuff);

      const palm = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 14), xdpWhiteMat);
      palm.scale.set(1.1, 0.95, 0.72);
      palm.position.set(side * 0.18, 0, 0.04);
      gloveGroup.add(palm);

      const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), xdpWhiteMat);
      thumb.scale.set(1.2, 0.85, 0.85);
      thumb.position.set(side * 0.12, 0.22, 0.14);
      gloveGroup.add(thumb);

      armPivot.add(gloveGroup);
      return armPivot;
    };

    const xiaoDengPaoLeftArm = createBulbArm(-1);
    const xiaoDengPaoRightArm = createBulbArm(1);
    xiaoDengPaoFeaturesGroup.add(xiaoDengPaoLeftArm, xiaoDengPaoRightArm);

    let xiaoDengPaoStartTime = -100;
    let xiaoDengPaoActiveUntil = -100;
    let xiaoDengPaoFacingYaw = 0;

    const bulbLight = new THREE.PointLight(0xffca4b, initialAtmos.bulbLightIntensity, 48, 1.35);
    bulbLight.position.set(0, homeY + 6.0, 0);
    homeBase.group.add(bulbLight);

    const pavCoords: Array<[number, number]> = [
      [-6.8, -3.8],
      [6.8, -3.8],
      [-6.5, 4.8],
      [6.5, 4.8],
    ];
    pavCoords.forEach(([px, pz]) => {
      const pav = createClassicalPavilion(mats.roofSlate);
      pav.position.set(px, homeY, pz);
      homeBase.group.add(pav);
    });

    // =========================================================
    // 主島北擴半島：「完整江南市集街廓（兩旁成排店鋪與攤販）」
    // =========================================================
    const homeStreetBlock = new THREE.Group();
    homeStreetBlock.position.set(0, homeY, 0);
    homeStreetBlock.userData = { islandId: 'home', districtId: 'home-trade-street' };
    homeBase.group.add(homeStreetBlock);

    // 1. 貫穿主島北半島的青石板大街（z = -5.0 至 z = -21.2）與兩側青石路緣
    const mainStreetRoad = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.1, 16.4),
      mats.stonePlaza,
    );
    mainStreetRoad.position.set(0, 0.05, -13.2);
    homeStreetBlock.add(mainStreetRoad);

    [-1.92, 1.92].forEach((curbX) => {
      const curb = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.18, 16.4),
        mats.stoneStep,
      );
      curb.position.set(curbX, 0.09, -13.2);
      homeStreetBlock.add(curb);
    });

    // 2. 街廓南北兩端「江南飛簷市集牌坊」
    [-5.4, -21.0].forEach((archZ) => {
      const archway = new THREE.Group();
      archway.position.set(0, 0, archZ);
      [-1.85, 1.85].forEach((px) => {
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.16, 3.2, 8),
          mats.vermilion,
        );
        pillar.position.set(px, 1.6, 0);
        archway.add(pillar);

        const baseStone = new THREE.Mesh(
          new THREE.CylinderGeometry(0.26, 0.3, 0.35, 8),
          mats.stonePlaza,
        );
        baseStone.position.set(px, 0.18, 0);
        archway.add(baseStone);
      });
      const beam = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.28, 0.32), mats.woodDark);
      beam.position.set(0, 2.85, 0);
      archway.add(beam);

      const plaque = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.38), mats.goldTrim);
      plaque.position.set(0, 2.95, 0);
      archway.add(plaque);

      const archRoof = createChineseRoof(4.8, 1.35, 0.85, mats.roofSlate);
      archRoof.position.set(0, 3.2, 0);
      archway.add(archRoof);

      [-1.3, 1.3].forEach((lx) => {
        const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), mats.lanternGlow);
        lantern.position.set(lx, 2.52, 0);
        archway.add(lantern);
      });
      homeStreetBlock.add(archway);
    });

    // 3. 街廓兩旁對稱排布的「江南白牆黛瓦街屋商鋪」與「繽紛布篷市集攤販」
    const createStreetShopHouse = (accentMat: THREE.Material) => {
      const shop = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.24, 3.0), mats.stoneStep);
      base.position.y = 0.12;
      shop.add(base);

      const body = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.85, 2.7), mats.wallCream);
      body.position.y = 1.04;
      shop.add(body);

      const matou = createMatouGablePair(2.3, 1.85, 2.7);
      shop.add(matou);

      const win = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 2.78), mats.windowGlow);
      win.position.y = 0.95;
      shop.add(win);

      const awning = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 2.6), accentMat);
      awning.position.set(0, 1.35, 1.55);
      awning.rotation.x = 0.28;
      shop.add(awning);

      const roof = createChineseRoof(2.9, 3.3, 0.95, mats.roofSlate);
      roof.position.y = 1.95;
      shop.add(roof);

      // 店門前招幌旗與紅燈籠
      const bannerPole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.1, 6), mats.woodDark);
      bannerPole.position.set(1.05, 1.05, 1.55);
      shop.add(bannerPole);

      const bannerFlag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.68, 0.38), mats.goldTrim);
      bannerFlag.position.set(1.05, 1.65, 1.75);
      shop.add(bannerFlag);

      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), mats.lanternGlow);
      lantern.position.set(-0.95, 1.55, 1.55);
      shop.add(lantern);

      enableShadows(shop);
      return shop;
    };

    const stallPalette = [mats.stallRed, mats.stallBlue, mats.stallGold];
    // 街道左右兩側（x = -3.55 與 x = +3.55）從南到北完整排開商鋪與攤販
    [-7.4, -10.3, -13.2, -16.1, -18.9].forEach((sz, idx) => {
      [-1, 1].forEach((side, sIdx) => {
        const isShop = idx === 1 || idx === 3;
        const accentMat = stallPalette[(idx + sIdx) % stallPalette.length];
        const unit = isShop ? createStreetShopHouse(accentMat) : createMarketStall(accentMat);
        unit.position.set(side * (isShop ? 3.85 : 3.15), 0.08, sz);
        // 面向中央青石街道
        unit.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
        homeStreetBlock.add(unit);
      });
    });

    // 南側碼頭前迎客雙攤販
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

    // 主島南向寬闊青石台階與石護欄（直通南側長木棧橋碼頭）
    for (let s = 0; s < 7; s++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.36, 0.72), mats.stoneStep);
      step.position.set(0, homeY - s * 0.42, 7.4 + s * 0.62);
      homeBase.group.add(step);

      [-1.68, 1.68].forEach((railX) => {
        const railBlock = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.58, 0.74), mats.stonePlaza);
        railBlock.position.set(railX, homeY - s * 0.42 + 0.24, 7.4 + s * 0.62);
        homeBase.group.add(railBlock);
      });
    }

    // 江南溫潤長木棧橋碼頭（參照圖中主島南側延伸入水的暖木大碼頭、繫船木樁與貨箱）
    const pierGroup = new THREE.Group();
    pierGroup.position.set(0, 0.42, 16.6);
    homeBase.group.add(pierGroup);

    const pierDeck = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.34, 8.2), mats.woodWarm);
    pierGroup.add(pierDeck);

    // 木棧橋橫向木板紋理與兩側繫船木柱、燈籠
    for (let pz = -3.6; pz <= 3.6; pz += 0.9) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(3.88, 0.08, 0.36), mats.woodDark);
      plank.position.set(0, 0.18, pz);
      pierGroup.add(plank);
    }

    for (let pz = -3.4; pz <= 3.4; pz += 1.7) {
      [-1.78, 1.78].forEach((px, sideIdx) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 2.5, 8), mats.woodDark);
        post.position.set(px, -0.35, pz);
        pierGroup.add(post);

        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 8), mats.goldTrim);
        cap.position.set(px, 0.92, pz);
        pierGroup.add(cap);

        if (Math.abs(pz) > 1.5 && sideIdx === 0) {
          const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), mats.lanternGlow);
          lantern.position.set(px, 1.15, pz);
          pierGroup.add(lantern);
        }
      });
    }

    // 碼頭上的貨箱、木桶與奇石擺設
    [
      [-0.85, 0.42, -1.2],
      [0.75, 0.42, 0.6],
      [-0.65, 0.42, 2.1],
    ].forEach(([cx, cy, cz], idx) => {
      const crate = new THREE.Mesh(
        idx % 2 === 0
          ? new THREE.BoxGeometry(0.68, 0.55, 0.68)
          : new THREE.CylinderGeometry(0.32, 0.35, 0.58, 8),
        idx % 2 === 0 ? mats.woodDark : mats.stoneGrey,
      );
      crate.position.set(cx, cy, cz);
      pierGroup.add(crate);
    });

    // 停泊於主島長木碼頭畔的「立體折扇雙白帆古帆船」（100% 還原參考圖主島碼頭右側高聳白帆木船）
    const sailboat = new THREE.Group();
    sailboat.position.set(3.45, -0.22, 18.8);
    sailboat.rotation.y = -0.42;
    sailboat.userData = {
      easterEggPoem: '「見漁人，乃大驚，問所從來。」',
      easterEggKind: 'boat',
    };
    homeBase.group.add(sailboat);
    clickableIslands.push(sailboat);

    // 船體（寬厚古木船身 + 船頭船尾微翹甲板）
    const mooredHull = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.68, 5.6), mats.woodDark);
    mooredHull.position.y = 0.28;
    sailboat.add(mooredHull);

    const bowProW = new THREE.Mesh(new THREE.ConeGeometry(1.35, 1.85, 4), mats.woodWarm);
    bowProW.rotation.x = Math.PI / 2;
    bowProW.rotation.z = Math.PI / 4;
    bowProW.position.set(0, 0.42, -3.35);
    sailboat.add(bowProW);

    const sternCabin = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.95, 1.95), mats.woodWarm);
    sternCabin.position.set(0, 0.92, 1.65);
    sailboat.add(sternCabin);

    const sternRoof = createChineseRoof(2.35, 2.25, 0.62, mats.roofSlate);
    sternRoof.position.set(0, 1.42, 1.65);
    sailboat.add(sternRoof);

    // 主桅杆與前副桅杆
    const mainMast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 5.8, 8), mats.woodDark);
    mainMast.position.set(0, 3.05, -0.25);
    sailboat.add(mainMast);

    const foreMast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 4.2, 8), mats.woodDark);
    foreMast.position.set(0, 2.25, -1.85);
    foreMast.rotation.x = -0.08;
    sailboat.add(foreMast);

    // 立體折扇式高聳白帆（主帆 + 前帆，帶橫向竹帆骨）
    const createPleatedJunkSail = (w: number, h: number) => {
      const sailGrp = new THREE.Group();
      const panel = new THREE.Mesh(
        new THREE.ConeGeometry(w, h, 4),
        mats.sailCream,
      );
      panel.scale.set(0.28, 1, 1.15);
      panel.rotation.y = Math.PI / 4;
      sailGrp.add(panel);

      for (let b = -2; b <= 2; b++) {
        const batten = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.03, w * (1.1 - (b + 2) * 0.16), 6),
          mats.woodWarm,
        );
        batten.rotation.x = Math.PI / 2;
        batten.position.set(0.08, b * (h * 0.16), 0);
        sailGrp.add(batten);
      }
      return sailGrp;
    };

    const mainSail = createPleatedJunkSail(2.45, 4.5);
    mainSail.position.set(0.12, 3.25, -0.15);
    mainSail.rotation.y = 0.22;
    sailboat.add(mainSail);

    const foreSail = createPleatedJunkSail(1.75, 3.2);
    foreSail.position.set(0.1, 2.35, -1.78);
    foreSail.rotation.y = 0.28;
    sailboat.add(foreSail);

    const boatLantern = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), mats.lanternGlow);
    boatLantern.position.set(0, 1.12, -2.65);
    sailboat.add(boatLantern);

    // 南側水域「三潭印月」石塔群（參照西湖三潭印月：三座葫蘆形五孔青石水塔呈品字形鼎立湖中，腹中點燭映照水面）
    const createThreePoolsMoonPagoda = () => {
      const pagoda = new THREE.Group();

      // 1. 水下青石基礎與圓形蓮花石雕基座
      const underwaterBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.95, 1.18, 1.65, 16),
        mats.stoneGrey,
      );
      underwaterBase.position.y = -0.55;
      pagoda.add(underwaterBase);

      const lotusPlinth = new THREE.Mesh(
        new THREE.CylinderGeometry(0.88, 0.98, 0.34, 16),
        mats.stonePlaza,
      );
      lotusPlinth.position.y = 0.36;
      pagoda.add(lotusPlinth);

      // 蓮瓣浮雕圈
      for (let p = 0; p < 12; p++) {
        const a = (p / 12) * Math.PI * 2;
        const petal = new THREE.Mesh(
          new THREE.ConeGeometry(0.16, 0.28, 5),
          mats.stoneStep,
        );
        petal.position.set(Math.cos(a) * 0.84, 0.46, Math.sin(a) * 0.84);
        petal.rotation.z = -Math.cos(a) * 0.35;
        petal.rotation.x = Math.sin(a) * 0.35;
        pagoda.add(petal);
      }

      const waistPedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.56, 0.78, 0.36, 16),
        mats.stoneGrey,
      );
      waistPedestal.position.y = 0.68;
      pagoda.add(waistPedestal);

      // 2. 標誌性「中空圓腹球形塔身」與五個圓形印月孔窗（內藏暖金燭光，夜晚映出「月影印水」）
      const bellySphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.76, 20, 18),
        mats.stonePlaza,
      );
      bellySphere.scale.set(1.0, 0.88, 1.0);
      bellySphere.position.y = 1.32;
      pagoda.add(bellySphere);

      const innerCandleGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.46, 14, 14),
        mats.lanternGlow,
      );
      innerCandleGlow.position.y = 1.32;
      pagoda.add(innerCandleGlow);

      for (let w = 0; w < 5; w++) {
        const wa = (w / 5) * Math.PI * 2;
        const holeRim = new THREE.Mesh(
          new THREE.TorusGeometry(0.21, 0.055, 8, 16),
          mats.stoneGrey,
        );
        holeRim.position.set(Math.cos(wa) * 0.72, 1.32, Math.sin(wa) * 0.72);
        holeRim.rotation.y = -wa + Math.PI / 2;
        pagoda.add(holeRim);

        const holeGlow = new THREE.Mesh(
          new THREE.CircleGeometry(0.18, 14),
          mats.lanternGlow,
        );
        holeGlow.position.set(Math.cos(wa) * 0.74, 1.32, Math.sin(wa) * 0.74);
        holeGlow.rotation.y = -wa + Math.PI / 2;
        pagoda.add(holeGlow);
      }

      // 3. 五層石雕輪傘小塔簷（層層微收，重現照片中三潭印月石塔層次）
      for (let t = 0; t < 4; t++) {
        const ty = 1.98 + t * 0.38;
        const r = 0.72 - t * 0.1;

        const tierCore = new THREE.Mesh(
          new THREE.CylinderGeometry(r * 0.65, r * 0.72, 0.26, 12),
          mats.stonePlaza,
        );
        tierCore.position.y = ty;
        pagoda.add(tierCore);

        const tierEave = new THREE.Mesh(
          new THREE.ConeGeometry(r * 1.12, 0.2, 12),
          mats.stoneGrey,
        );
        tierEave.position.y = ty + 0.16;
        pagoda.add(tierEave);
      }

      // 4. 頂部葫蘆形石雕寶頂
      const gourdLower = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 14, 12),
        mats.stonePlaza,
      );
      gourdLower.position.y = 3.58;
      pagoda.add(gourdLower);

      const gourdUpper = new THREE.Mesh(
        new THREE.SphereGeometry(0.19, 12, 10),
        mats.stonePlaza,
      );
      gourdUpper.position.y = 3.92;
      pagoda.add(gourdUpper);

      const gourdSpire = new THREE.Mesh(
        new THREE.ConeGeometry(0.09, 0.32, 10),
        mats.goldTrim,
      );
      gourdSpire.position.y = 4.18;
      pagoda.add(gourdSpire);

      // 透明擴大點擊感應框，方便點擊三潭印月石塔觸發詩文彩蛋
      const pagodaHitBox = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.5, 4.8, 8),
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      pagodaHitBox.position.y = 2.0;
      pagoda.add(pagodaHitBox);

      pagoda.userData = {
        easterEggPoem: '「夜深寒水月千片，塔影三雙秋一期。」',
        easterEggKind: 'three-pools',
      };

      enableShadows(pagoda);
      return pagoda;
    };

    // 三潭印月三座石塔呈經典品字形佇立於主島南側湖面
    [
      [-6.2, -0.28, 19.2, 0.95],
      [-2.1, -0.28, 23.6, 1.04],
      [-8.4, -0.28, 24.1, 0.92],
    ].forEach(([tx, ty, tz, tScale]) => {
      const moonPagoda = createThreePoolsMoonPagoda();
      moonPagoda.position.set(tx, ty, tz);
      moonPagoda.scale.setScalar(tScale);
      homeBase.group.add(moonPagoda);
      clickableIslands.push(moonPagoda);
    });

    // 主島平地樹木：江南垂柳 + 桃花樹（全數穩立於主島草坪與北街廓兩側）
    [
      [-9.2, -1.2, 1.12],
      [9.2, -1.0, 1.08],
      [-6.8, -11.5, 1.02],
      [6.8, -11.5, 1.02],
      [-5.6, -18.2, 0.98],
      [5.6, -18.2, 0.98],
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

    // 痛點島 · 創點樓：「大型客家圓形土樓建模」（三層厚實夯土環形古堡土樓 + 環形黛瓦大屋頂 + 內天井懸賞祖堂 + 跑馬廊滿掛紅燈籠 + 南向石拱門樓與御道石階）
    const towerGroup = new THREE.Group();
    towerGroup.position.set(-0.8, painY, -0.8);
    towerGroup.rotation.y = Math.PI / 7;
    towerGroup.userData = { islandId: 'pain', districtId: 'pain-innovation-tower' };
    painBase.group.add(towerGroup);

    const painTulouRadius = 5.35;
    const painTulouInnerRadius = 3.15;
    const painTulouHeight = 4.55;

    // 1. 土樓青石圓形台基與內天井鋪面
    const painTulouBase = new THREE.Mesh(
      new THREE.CylinderGeometry(painTulouRadius + 0.55, painTulouRadius + 0.82, 0.44, 36),
      mats.stonePlaza,
    );
    painTulouBase.position.y = 0.22;
    towerGroup.add(painTulouBase);

    // 2. 土樓三層厚重夯土環形外牆（空心圓環 ExtrudeGeometry，呈現中空內天井與厚實夯土外牆）
    const tulouEarthMat = new THREE.MeshStandardMaterial({
      color: 0xc89562,
      roughness: 0.88,
    });
    const tulouEarthDarkMat = new THREE.MeshStandardMaterial({
      color: 0xa67646,
      roughness: 0.9,
    });

    const painTulouWallShape = new THREE.Shape();
    painTulouWallShape.absarc(0, 0, painTulouRadius, 0, Math.PI * 2, false);
    const painTulouHolePath = new THREE.Path();
    painTulouHolePath.absarc(0, 0, painTulouInnerRadius, 0, Math.PI * 2, true);
    painTulouWallShape.holes.push(painTulouHolePath);

    const painTulouWallGeo = new THREE.ExtrudeGeometry(painTulouWallShape, {
      depth: painTulouHeight,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.1,
      bevelThickness: 0.1,
      curveSegments: 36,
    });
    painTulouWallGeo.rotateX(Math.PI / 2);
    const painTulouWallMesh = new THREE.Mesh(painTulouWallGeo, tulouEarthMat);
    painTulouWallMesh.position.y = painTulouHeight + 0.38;
    towerGroup.add(painTulouWallMesh);

    // 土樓外牆防禦石基護裙（底層青石砌築）
    const stoneSkirt = new THREE.Mesh(
      new THREE.TorusGeometry(painTulouRadius + 0.04, 0.26, 10, 36),
      mats.stoneGrey,
    );
    stoneSkirt.rotation.x = Math.PI / 2;
    stoneSkirt.position.y = 0.52;
    towerGroup.add(stoneSkirt);

    // 土樓夯土外牆腰線與二、三、四層內天井木構跑馬廊 + 滿掛喜慶紅燈籠
    [1.55, 2.85, 3.95].forEach((ledgeY, lIdx) => {
      const outerBelt = new THREE.Mesh(
        new THREE.TorusGeometry(painTulouRadius + 0.07, 0.1, 8, 36),
        tulouEarthDarkMat,
      );
      outerBelt.rotation.x = Math.PI / 2;
      outerBelt.position.y = ledgeY;
      towerGroup.add(outerBelt);

      // 內天井環形木構跑馬廊與雕花木欄杆
      const innerWalkway = new THREE.Mesh(
        new THREE.TorusGeometry(painTulouInnerRadius - 0.2, 0.24, 8, 32),
        mats.woodDark,
      );
      innerWalkway.rotation.x = Math.PI / 2;
      innerWalkway.position.y = ledgeY;
      towerGroup.add(innerWalkway);

      // 內環跑馬廊懸掛一整圈紅燈籠，重現土樓天井萬家燈火氛圍
      const lanternCount = 12;
      for (let i = 0; i < lanternCount; i++) {
        const a = (i / lanternCount) * Math.PI * 2 + lIdx * 0.26;
        const lantern = new THREE.Mesh(
          new THREE.SphereGeometry(0.16, 8, 8),
          mats.lanternGlow,
        );
        lantern.scale.set(1, 1.25, 1);
        lantern.position.set(
          Math.cos(a) * (painTulouInnerRadius - 0.36),
          ledgeY + 0.65,
          Math.sin(a) * (painTulouInnerRadius - 0.36),
        );
        towerGroup.add(lantern);
      }
    });

    // 土樓外牆二樓與三樓環形通風瞭望窗（16 組放射狀暖光窗格）
    for (let w = 0; w < 16; w++) {
      const a = (w / 16) * Math.PI * 2;
      if (Math.sin(a) > 0.78) continue; // 預留正南方土樓石拱大門位置
      [2.18, 3.45].forEach((wy) => {
        const win = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.54, 0.18),
          mats.windowGlow,
        );
        win.position.set(
          Math.cos(a) * (painTulouRadius + 0.05),
          wy,
          Math.sin(a) * (painTulouRadius + 0.05),
        );
        win.rotation.y = -a + Math.PI / 2;
        towerGroup.add(win);
      });
    }

    // 3. 土樓標誌性「環形黛瓦大屋頂」（中空圓環斜坡屋頂 + 28 道放射狀瓦壟脊線 + 鎏金環脊）
    const pRoofOuterR = painTulouRadius + 0.88;
    const pRoofInnerR = painTulouInnerRadius - 0.65;
    const pRoofMidR = (pRoofOuterR + pRoofInnerR) * 0.5;
    const pRoofTubeR = (pRoofOuterR - pRoofInnerR) * 0.52;

    const painTulouRingRoof = new THREE.Mesh(
      new THREE.TorusGeometry(pRoofMidR, pRoofTubeR, 14, 40),
      mats.roofSlate,
    );
    painTulouRingRoof.rotation.x = Math.PI / 2;
    painTulouRingRoof.scale.set(1, 1, 0.54);
    painTulouRingRoof.position.y = painTulouHeight + 0.48;
    towerGroup.add(painTulouRingRoof);

    const painTulouRidgeRing = new THREE.Mesh(
      new THREE.TorusGeometry(pRoofMidR, 0.14, 8, 40),
      mats.goldTrim,
    );
    painTulouRidgeRing.rotation.x = Math.PI / 2;
    painTulouRidgeRing.position.y = painTulouHeight + 1.05;
    towerGroup.add(painTulouRidgeRing);

    for (let r = 0; r < 28; r++) {
      const a = (r / 28) * Math.PI * 2;
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.2, pRoofOuterR - pRoofInnerR + 0.18),
        mats.woodDark,
      );
      rib.position.set(
        Math.cos(a) * pRoofMidR,
        painTulouHeight + 0.82,
        Math.sin(a) * pRoofMidR,
      );
      rib.rotation.y = -a + Math.PI / 2;
      towerGroup.add(rib);
    }

    // 4. 土樓內天井中央「創點懸賞祖堂」
    const painCenterHall = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.68, 2.05, 8),
      mats.vermilion,
    );
    painCenterHall.position.y = 1.25;
    towerGroup.add(painCenterHall);

    const painCenterRoof = new THREE.Mesh(
      new THREE.ConeGeometry(2.15, 1.25, 8),
      mats.roofSlate,
    );
    painCenterRoof.position.y = 2.85;
    towerGroup.add(painCenterRoof);

    const painCenterFinial = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 10, 10),
      mats.goldTrim,
    );
    painCenterFinial.position.y = 3.58;
    towerGroup.add(painCenterFinial);

    // 5. 土樓南向正門（青石雕花拱門、創點樓金匾、重簷門樓、門前抱鼓石與青石御道台階）
    const painGateGroup = new THREE.Group();
    painGateGroup.position.set(0, 0, painTulouRadius + 0.15);
    towerGroup.add(painGateGroup);

    const painGateFrame = new THREE.Mesh(
      new THREE.BoxGeometry(2.55, 2.65, 0.78),
      mats.stonePlaza,
    );
    painGateFrame.position.y = 1.48;
    painGateGroup.add(painGateFrame);

    const painGateOpening = new THREE.Mesh(
      new THREE.BoxGeometry(1.65, 2.05, 0.86),
      mats.windowGlow,
    );
    painGateOpening.position.y = 1.22;
    painGateGroup.add(painGateOpening);

    const painGatePlaque = new THREE.Mesh(
      new THREE.BoxGeometry(1.65, 0.48, 0.22),
      mats.goldTrim,
    );
    painGatePlaque.position.set(0, 2.48, 0.38);
    painGateGroup.add(painGatePlaque);

    const painGateCanopy = createChineseRoof(3.15, 1.55, 0.82, mats.roofSlate);
    painGateCanopy.position.set(0, 2.82, 0.22);
    painGateGroup.add(painGateCanopy);

    [-1.15, 1.15].forEach((gx) => {
      const drumStone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 0.42, 12),
        mats.stoneStep,
      );
      drumStone.rotation.z = Math.PI / 2;
      drumStone.position.set(gx, 0.42, 0.65);
      painGateGroup.add(drumStone);

      const gateLantern = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 8, 8),
        mats.lanternGlow,
      );
      gateLantern.scale.set(1, 1.3, 1);
      gateLantern.position.set(gx, 2.52, 0.62);
      painGateGroup.add(gateLantern);
    });

    // 土樓正前方寬闊青石台階與兩側石欄
    for (let s = 0; s < 5; s++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.26, 0.72), mats.stoneStep);
      step.position.set(0, 0.68 - s * 0.14, painTulouRadius + 0.95 + s * 0.58);
      towerGroup.add(step);

      [-1.82, 1.82].forEach((rx) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.48, 0.74), mats.stonePlaza);
        rail.position.set(rx, 0.86 - s * 0.14, painTulouRadius + 0.95 + s * 0.58);
        towerGroup.add(rail);
      });
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
    // 4. TOP-RIGHT ISLAND (討論島 · 藏書閣 + 工作坊 + 茶藝街 — 擴大島體並將三大建築分開配置，保持寬敞留白)
    // =========================================================
    const discBase = createIslandBase('discussion', 33.5, -24.5, 21.5, 19.2, 3.6);
    const discY = discBase.topY;

    // 4A. 藏書閣（退居西北側高台，與東側工作坊、南側茶藝街拉開寬闊間距）
    const libGroup = new THREE.Group();
    libGroup.position.set(-7.2, discY, -6.8);
    libGroup.rotation.y = -Math.PI / 10;
    libGroup.scale.setScalar(0.92);
    libGroup.userData = { islandId: 'discussion', districtId: 'discussion-academic-district' };
    discBase.group.add(libGroup);

    const libFound = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.68, 5.2), mats.stonePlaza);
    libFound.position.y = 0.34;
    libGroup.add(libFound);

    const libBody = new THREE.Mesh(new THREE.BoxGeometry(6.4, 2.7, 4.2), mats.wallCream);
    libBody.position.y = 1.95;
    libGroup.add(libBody);

    const libMatou = createMatouGablePair(6.4, 2.7, 4.2);
    libMatou.position.y = 0.62;
    libGroup.add(libMatou);

    const libDoor = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.85, 4.35), mats.windowGlow);
    libDoor.position.y = 1.65;
    libGroup.add(libDoor);

    const libPlaque = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.48, 0.18), mats.goldTrim);
    libPlaque.position.set(0, 2.95, 2.22);
    libGroup.add(libPlaque);

    const libRoof1 = createChineseRoof(7.8, 5.4, 1.65, mats.roofSlate);
    libRoof1.position.y = 3.3;
    libGroup.add(libRoof1);

    const libUpper = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.4, 2.8), mats.wallCream);
    libUpper.position.y = 4.65;
    libGroup.add(libUpper);

    const libRoof2 = createChineseRoof(5.4, 3.9, 1.45, mats.roofSlate);
    libRoof2.position.y = 5.35;
    libGroup.add(libRoof2);

    // 4B. 工作坊：「百工坊街道」（向東北東側外移至 x=8.2, z=-4.6，與藏書閣及茶藝街保持寬敞中庭距離）
    const workshopBlock = new THREE.Group();
    workshopBlock.position.set(8.2, discY, -4.6);
    workshopBlock.rotation.y = -0.16;
    workshopBlock.scale.setScalar(0.86);
    workshopBlock.userData = { islandId: 'discussion', districtId: 'discussion-tech-district' };
    discBase.group.add(workshopBlock);

    // 1. 貫穿工作坊街廓的青石板工匠長街（長 11.2m，寬 3.2m）與兩側路緣石
    const craftStreetRoad = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.12, 11.2),
      mats.stonePlaza,
    );
    craftStreetRoad.position.set(0, 0.06, 0);
    workshopBlock.add(craftStreetRoad);

    for (let sz = -4.5; sz <= 4.5; sz += 1.5) {
      const paver = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.14, 0.95),
        mats.stoneStep,
      );
      paver.position.set(0, 0.07, sz);
      workshopBlock.add(paver);
    }

    [-1.68, 1.68].forEach((cx) => {
      const curb = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.2, 11.2),
        mats.stoneStep,
      );
      curb.position.set(cx, 0.1, 0);
      workshopBlock.add(curb);
    });

    // 2. 百工坊街道南北街口「木石工匠牌坊」
    [-5.2, 5.2].forEach((archZ) => {
      const craftArch = new THREE.Group();
      craftArch.position.set(0, 0, archZ);
      [-1.58, 1.58].forEach((px) => {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.13, 0.15, 2.95, 8),
          mats.woodDark,
        );
        post.position.set(px, 1.48, 0);
        craftArch.add(post);

        const baseStone = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.28, 0.32, 8),
          mats.stoneGrey,
        );
        baseStone.position.set(px, 0.16, 0);
        craftArch.add(baseStone);
      });
      const beam = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.26, 0.28), mats.vermilion);
      beam.position.set(0, 2.65, 0);
      craftArch.add(beam);

      const plaque = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.42, 0.34), mats.goldTrim);
      plaque.position.set(0, 2.75, 0);
      craftArch.add(plaque);

      const archRoof = createChineseRoof(4.2, 1.25, 0.78, mats.roofSlate);
      archRoof.position.set(0, 2.98, 0);
      craftArch.add(archRoof);

      [-1.15, 1.15].forEach((lx) => {
        const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), mats.lanternGlow);
        lantern.position.set(lx, 2.38, 0);
        craftArch.add(lantern);
      });
      workshopBlock.add(craftArch);
    });

    // 3. 打造特色工匠鋪子模組（鐵匠鋪、木匠鋪、機關巧藝鋪、金工鍛造鋪）
    const forgeFireMat = new THREE.MeshStandardMaterial({
      color: 0xff6b2b,
      emissive: 0xff4500,
      emissiveIntensity: 1.85,
      roughness: 0.3,
    });
    const ironDarkMat = new THREE.MeshStandardMaterial({
      color: 0x2b3036,
      roughness: 0.35,
      metalness: 0.72,
    });
    const brickFurnaceMat = new THREE.MeshStandardMaterial({
      color: 0x8f4733,
      roughness: 0.85,
    });

    const createCraftsmanShop = (
      shopKind: 'blacksmith' | 'carpenter' | 'mechanism' | 'metalwork',
      side: -1 | 1,
    ) => {
      const shop = new THREE.Group();
      const isBlacksmith = shopKind === 'blacksmith';
      const isCarpenter = shopKind === 'carpenter';
      const isMechanism = shopKind === 'mechanism';

      // 鋪子青石台基與主屋身
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.24, 2.85), mats.stoneStep);
      base.position.y = 0.12;
      shop.add(base);

      const wallMat = isCarpenter ? mats.woodWarm : mats.wallCream;
      const bodyH = isBlacksmith || isMechanism ? 2.05 : 1.85;
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.35, bodyH, 2.45), wallMat);
      body.position.y = bodyH * 0.5 + 0.12;
      shop.add(body);

      if (!isCarpenter) {
        const matou = createMatouGablePair(2.35, bodyH, 2.45);
        matou.position.y = 0.12;
        shop.add(matou);
      }

      // 敞開式工坊暖光門窗與前廊木簷
      const openWorkshopWin = new THREE.Mesh(
        new THREE.BoxGeometry(1.55, bodyH * 0.62, 2.52),
        mats.windowGlow,
      );
      openWorkshopWin.position.y = bodyH * 0.45 + 0.12;
      shop.add(openWorkshopWin);

      const awningMat = isBlacksmith
        ? mats.stallRed
        : isCarpenter
        ? mats.stallGold
        : isMechanism
        ? mats.stallBlue
        : mats.roofJade;
      const frontAwning = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.12, 0.95), awningMat);
      frontAwning.position.set(0, 1.38, 1.52);
      frontAwning.rotation.x = 0.26;
      shop.add(frontAwning);

      // 屋頂
      const roofMat = isBlacksmith || isCarpenter ? mats.roofSlate : mats.roofBlue;
      const roof = createChineseRoof(2.95, 3.05, 0.95, roofMat);
      roof.position.y = bodyH + 0.12;
      shop.add(roof);

      // 鋪子門前工匠招幌旗與紅燈籠
      const bannerPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 2.25, 6),
        mats.woodDark,
      );
      bannerPole.position.set(1.08, 1.12, 1.58);
      shop.add(bannerPole);

      const bannerFlag = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.76, 0.05),
        isBlacksmith ? mats.stallRed : isCarpenter ? mats.stallGold : mats.stallBlue,
      );
      bannerFlag.position.set(1.08, 1.72, 1.78);
      shop.add(bannerFlag);

      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), mats.lanternGlow);
      lantern.position.set(-1.02, 1.52, 1.55);
      shop.add(lantern);

      // 各鋪子專屬寫實工匠陳設：
      if (isBlacksmith) {
        // 【鐵匠鋪】：高聳紅磚打鐵高爐煙囪、通紅爐火口、打鐵鐵砧、淬火水桶與兵器工具架
        const chimney = new THREE.Mesh(
          new THREE.BoxGeometry(0.78, 3.45, 0.78),
          brickFurnaceMat,
        );
        chimney.position.set(-0.75, 1.75, 0.85);
        shop.add(chimney);

        const furnaceMouth = new THREE.Mesh(
          new THREE.SphereGeometry(0.28, 10, 10),
          forgeFireMat,
        );
        furnaceMouth.position.set(-0.75, 0.58, 1.22);
        shop.add(furnaceMouth);

        // 門前打鐵鐵砧與木樁底座
        const anvilStump = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.26, 0.38, 8),
          mats.woodDark,
        );
        anvilStump.position.set(0.25, 0.31, 1.68);
        shop.add(anvilStump);

        const anvilBody = new THREE.Mesh(
          new THREE.BoxGeometry(0.46, 0.22, 0.24),
          ironDarkMat,
        );
        anvilBody.position.set(0.25, 0.56, 1.68);
        shop.add(anvilBody);

        // 兵器與鐵器展示架
        const toolRack = new THREE.Mesh(
          new THREE.BoxGeometry(0.75, 0.72, 0.22),
          mats.woodDark,
        );
        toolRack.position.set(0.82, 0.48, 1.55);
        shop.add(toolRack);
      } else if (isCarpenter) {
        // 【木匠鋪】：門前原木堆疊、木工刨木長條凳（鋸馬台）、大木輪與魯班木料架
        [-0.12, 0.12, 0.0].forEach((ly, lIdx) => {
          const log = new THREE.Mesh(
            new THREE.CylinderGeometry(0.14, 0.14, 1.05, 8),
            lIdx === 2 ? mats.woodWarm : mats.woodDark,
          );
          log.rotation.z = Math.PI / 2;
          log.position.set(-0.62, lIdx === 2 ? 0.52 : 0.32, 1.58 + ly);
          shop.add(log);
        });

        // 木工鋸馬刨木台
        const sawhorse = new THREE.Mesh(
          new THREE.BoxGeometry(0.95, 0.46, 0.38),
          mats.woodWarm,
        );
        sawhorse.position.set(0.42, 0.36, 1.68);
        shop.add(sawhorse);

        // 倚靠在鋪前的木造大車輪
        const woodWheel = new THREE.Mesh(
          new THREE.TorusGeometry(0.36, 0.06, 8, 16),
          mats.woodDark,
        );
        woodWheel.position.set(0.92, 0.48, 1.48);
        shop.add(woodWheel);
      } else if (isMechanism) {
        // 【機關巧藝鋪】：門額外牆大型咬合黃金齒輪組與展示台機關模型
        const bigGear = new THREE.Mesh(
          new THREE.CylinderGeometry(0.48, 0.48, 0.1, 12),
          mats.goldTrim,
        );
        bigGear.rotation.x = Math.PI / 2;
        bigGear.position.set(-0.35, 1.85, 1.28);
        shop.add(bigGear);

        const smallGear = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.3, 0.1, 10),
          mats.bulbRing,
        );
        smallGear.rotation.x = Math.PI / 2;
        smallGear.position.set(0.32, 1.65, 1.28);
        shop.add(smallGear);

        const displayTable = new THREE.Mesh(
          new THREE.BoxGeometry(1.1, 0.52, 0.58),
          mats.woodDark,
        );
        displayTable.position.set(0, 0.38, 1.65);
        shop.add(displayTable);
      } else {
        // 【金工與百工雜貨鋪】：銅器陶甕多寶格與工匠材料箱
        const shelf = new THREE.Mesh(
          new THREE.BoxGeometry(1.15, 0.85, 0.42),
          mats.woodDark,
        );
        shelf.position.set(-0.25, 0.54, 1.55);
        shop.add(shelf);

        [-0.55, -0.25, 0.05].forEach((jx, jIdx) => {
          const vessel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.11, 0.14, 0.28, 8),
            jIdx === 1 ? mats.goldTrim : ironDarkMat,
          );
          vessel.position.set(jx, 1.08, 1.55);
          shop.add(vessel);
        });
      }

      // 面向中央青石工匠街
      shop.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      enableShadows(shop);
      return shop;
    };

    // 沿著百工坊街道左右兩側（x = -3.25 與 x = +3.25）排開 6 座鐵匠鋪、木匠鋪、機關鋪與金工鋪
    const shopLayout: Array<{
      z: number;
      leftKind: 'blacksmith' | 'carpenter' | 'mechanism' | 'metalwork';
      rightKind: 'blacksmith' | 'carpenter' | 'mechanism' | 'metalwork';
    }> = [
      { z: -3.1, leftKind: 'blacksmith', rightKind: 'carpenter' },
      { z: 0.0, leftKind: 'mechanism', rightKind: 'blacksmith' },
      { z: 3.1, leftKind: 'carpenter', rightKind: 'metalwork' },
    ];

    shopLayout.forEach((row) => {
      const leftShop = createCraftsmanShop(row.leftKind, -1);
      leftShop.position.set(-3.25, 0.06, row.z);
      workshopBlock.add(leftShop);

      const rightShop = createCraftsmanShop(row.rightKind, 1);
      rightShop.position.set(3.25, 0.06, row.z);
      workshopBlock.add(rightShop);
    });

    // 4C. 茶藝街：「完整江南茶藝街道」（向南推移至 z=7.6，與北側藏書閣與東側工作坊完全分開）
    const teaStreetBlock = new THREE.Group();
    teaStreetBlock.position.set(-1.8, discY, 7.6);
    teaStreetBlock.rotation.y = 0.12;
    teaStreetBlock.scale.setScalar(0.88);
    teaStreetBlock.userData = { islandId: 'discussion', districtId: 'discussion-daily-district' };
    discBase.group.add(teaStreetBlock);

    // 1. 茶藝街青石板長街路面（長 15.6m）與兩側青石路緣石、街心雕花地磚
    const teaRoad = new THREE.Mesh(
      new THREE.BoxGeometry(15.6, 0.12, 3.4),
      mats.stonePlaza,
    );
    teaRoad.position.set(0, 0.06, 0);
    teaStreetBlock.add(teaRoad);

    for (let sx = -6.8; sx <= 6.8; sx += 1.7) {
      const centerPaver = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 0.14, 1.25),
        mats.stoneStep,
      );
      centerPaver.position.set(sx, 0.07, 0);
      teaStreetBlock.add(centerPaver);
    }

    [-1.82, 1.82].forEach((cz) => {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.2, 0.26), mats.stoneStep);
      curb.position.set(0, 0.1, cz);
      teaStreetBlock.add(curb);
    });

    // 2. 茶藝街東西兩端「江南茶坊街口牌樓」與橫跨街道上空的紅燈籠串
    [-7.5, 7.5].forEach((archX) => {
      const teaArch = new THREE.Group();
      teaArch.position.set(archX, 0, 0);
      teaArch.rotation.y = Math.PI / 2;
      [-1.75, 1.75].forEach((px) => {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.13, 0.15, 3.1, 8),
          mats.vermilion,
        );
        post.position.set(px, 1.55, 0);
        teaArch.add(post);

        const postBase = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.28, 0.34, 8),
          mats.stonePlaza,
        );
        postBase.position.set(px, 0.17, 0);
        teaArch.add(postBase);
      });
      const teaBeam = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.28, 0.3), mats.woodDark);
      teaBeam.position.set(0, 2.75, 0);
      teaArch.add(teaBeam);

      const teaPlaque = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.44, 0.34), mats.goldTrim);
      teaPlaque.position.set(0, 2.85, 0);
      teaArch.add(teaPlaque);

      const teaArchRoof = createChineseRoof(4.5, 1.3, 0.82, mats.roofJade);
      teaArchRoof.position.set(0, 3.08, 0);
      teaArch.add(teaArchRoof);

      [-1.2, 1.2].forEach((lx) => {
        const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 8), mats.lanternGlow);
        lantern.position.set(lx, 2.45, 0);
        teaArch.add(lantern);
      });
      teaStreetBlock.add(teaArch);
    });

    // 3. 茶藝街南北兩旁對稱成排的「江南白牆黛瓦茶莊／雙層茶樓」與「茗茶攤販」（真正形成一條熱鬧茶街）
    const createTeaShopBuilding = (isTwoStory: boolean, roofMat: THREE.Material) => {
      const bld = new THREE.Group();
      const h = isTwoStory ? 2.35 : 1.72;
      const w = isTwoStory ? 2.85 : 2.35;
      const d = 2.25;

      const base = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.24, d + 0.2), mats.stoneStep);
      base.position.y = 0.12;
      bld.add(base);

      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats.wallCream);
      body.position.y = h * 0.5 + 0.12;
      bld.add(body);

      const matou = createMatouGablePair(w, h, d);
      matou.position.y = 0.12;
      bld.add(matou);

      const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.65, h * 0.55, d + 0.08), mats.windowGlow);
      win.position.y = h * 0.48 + 0.12;
      bld.add(win);

      const roof = createChineseRoof(w + 0.65, d + 0.65, 0.92, roofMat);
      roof.position.y = h + 0.12;
      bld.add(roof);

      // 茶莊門前「茶」字青翠／鎏金招幌旗與木迴廊
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.15, 6), mats.woodDark);
      pole.position.set(w * 0.45, 1.08, d * 0.58);
      bld.add(pole);

      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.78, 0.05), mats.stallBlue);
      flag.position.set(w * 0.45, 1.68, d * 0.72);
      bld.add(flag);

      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), mats.lanternGlow);
      lantern.position.set(-w * 0.42, 1.48, d * 0.58);
      bld.add(lantern);

      enableShadows(bld);
      return bld;
    };

    [-5.4, -2.7, 0.0, 2.7, 5.4].forEach((tx, idx) => {
      [-1, 1].forEach((sideZ, sIdx) => {
        const isBuilding = idx % 2 === 0;
        if (isBuilding) {
          const isTwoStory = idx === 0 && sideZ < 0;
          const teaHouse = createTeaShopBuilding(
            isTwoStory,
            (idx + sIdx) % 2 === 0 ? mats.roofSlate : mats.roofJade,
          );
          teaHouse.position.set(tx, 0, sideZ * 3.15);
          teaHouse.rotation.y = sideZ < 0 ? 0 : Math.PI;
          teaStreetBlock.add(teaHouse);
        } else {
          const stallMat =
            (idx + sIdx) % 3 === 0
              ? mats.stallBlue
              : (idx + sIdx) % 3 === 1
              ? mats.stallGold
              : mats.stallRed;
          const teaStall = createMarketStall(stallMat);
          teaStall.position.set(tx, 0.08, sideZ * 2.78);
          teaStall.rotation.y = sideZ < 0 ? 0 : Math.PI;
          teaStreetBlock.add(teaStall);
        }
      });
    });

    // 4. 茶藝街街道兩側「藍傘與黃傘露天品茗茶座」（參照圖中討論島茶街成排的藍色與金黃遮陽傘茶席）
    [
      [-4.1, -1.05, mats.stallBlue],
      [-1.35, 1.05, mats.stallGold],
      [1.35, -1.05, mats.stallBlue],
      [4.1, 1.05, mats.stallGold],
      [6.2, -1.05, mats.stallBlue],
    ].forEach(([tx, tz, umbMat]) => {
      const tableGrp = new THREE.Group();
      tableGrp.position.set(tx as number, 0.08, tz as number);
      const table = new THREE.Mesh(
        new THREE.BoxGeometry(0.88, 0.52, 0.88),
        mats.woodWarm,
      );
      table.position.y = 0.26;
      tableGrp.add(table);

      // 四周小木凳
      [
        [-0.58, 0],
        [0.58, 0],
        [0, -0.58],
        [0, 0.58],
      ].forEach(([sx, sz]) => {
        const stool = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.16, 0.32, 6),
          mats.woodDark,
        );
        stool.position.set(sx, 0.16, sz);
        tableGrp.add(stool);
      });

      const umbrella = new THREE.Mesh(
        new THREE.ConeGeometry(1.05, 0.45, 8),
        umbMat as THREE.Material,
      );
      umbrella.position.y = 1.42;
      tableGrp.add(umbrella);

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 1.35, 6),
        mats.woodDark,
      );
      pole.position.y = 0.68;
      tableGrp.add(pole);
      teaStreetBlock.add(tableGrp);
    });

    // 討論島通往東北拱橋與東南水車的青石台階
    for (let s = 0; s < 5; s++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.28, 0.72), mats.stoneStep);
      step.position.set(-10.4 - s * 0.45, discY - s * 0.22, 6.8 + s * 0.52);
      step.rotation.y = Math.PI / 4;
      discBase.group.add(step);
    }

    const discRockBamboo = createTaihuRockAndBamboo(1.1);
    discRockBamboo.position.set(-12.6, discY, -1.8);
    discBase.group.add(discRockBamboo);

    const discWheel = createWaterwheel();
    discWheel.position.set(18.2, 1.5, 5.2);
    discWheel.rotation.y = -Math.PI / 4;
    discBase.group.add(discWheel);

    // 討論島平地樹木：江南垂柳 + 桃花樹（環繞擴大後的島緣與中庭）
    [
      [-13.4, 2.2, 1.15],
      [13.6, -7.8, 1.18],
      [12.4, 6.2, 1.08],
      [-10.8, 10.2, 1.05],
      [-0.4, -10.6, 1.12],
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

    const exhibWall = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.85, 5.6), mats.wallCream);
    exhibWall.position.y = 1.42;
    exhibGroup.add(exhibWall);

    // 展覽館外牆木構立柱與雕花窗框（參照圖中展覽館白牆木柱與拱形大門）
    [-3.4, -1.6, 1.6, 3.4].forEach((px) => {
      [-2.82, 2.82].forEach((pz) => {
        const pillar = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, 2.85, 0.24),
          mats.woodDark,
        );
        pillar.position.set(px, 1.42, pz);
        exhibGroup.add(pillar);
      });
    });

    // 展覽館頂部「菱格藍玻採光穹頂」（100% 還原參考圖中展覽館晶瑩剔透的藍色格柵玻璃屋頂）
    const exhibRim = new THREE.Mesh(
      new THREE.BoxGeometry(7.6, 0.36, 6.0),
      mats.wallCream,
    );
    exhibRim.position.y = 2.95;
    exhibGroup.add(exhibRim);

    const skylightDome = new THREE.Mesh(
      new THREE.ConeGeometry(4.6, 1.55, 4),
      mats.skylightGlass,
    );
    skylightDome.rotation.y = Math.PI / 4;
    skylightDome.scale.set(1.12, 1, 0.88);
    skylightDome.position.y = 3.82;
    exhibGroup.add(skylightDome);

    // 採光穹頂木金格柵肋條
    [-1.8, 0, 1.8].forEach((rx) => {
      const ribZ = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.95, 5.4),
        mats.woodWarm,
      );
      ribZ.position.set(rx, 3.45, 0);
      exhibGroup.add(ribZ);
    });
    [-1.4, 0, 1.4].forEach((rz) => {
      const ribX = new THREE.Mesh(
        new THREE.BoxGeometry(6.8, 0.95, 0.1),
        mats.woodWarm,
      );
      ribX.position.set(0, 3.45, rz);
      exhibGroup.add(ribX);
    });

    const exhibPortal = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.05, 5.72), mats.windowGlow);
    exhibPortal.position.y = 1.15;
    exhibGroup.add(exhibPortal);

    // 展覽館門前繽紛直立展旗（紅、藍、粉、金）
    [
      [-3.2, 3.35, mats.stallRed],
      [-1.8, 3.35, mats.stallBlue],
      [1.8, 3.35, mats.sakuraPink],
      [3.2, 3.35, mats.stallGold],
    ].forEach(([bx, bz, bMat]) => {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6),
        mats.woodDark,
      );
      pole.position.set(bx as number, 1.1, bz as number);
      exhibGroup.add(pole);

      const banner = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 1.15, 0.05),
        bMat as THREE.Material,
      );
      banner.position.set((bx as number) + 0.18, 1.45, bz as number);
      exhibGroup.add(banner);
    });

    const arcadeGroup = new THREE.Group();
    arcadeGroup.position.set(3.6, creativeY, 3.2);
    arcadeGroup.rotation.y = Math.PI / 6;
    arcadeGroup.userData = { islandId: 'creative', districtId: 'creative-arcade' };
    creativeBase.group.add(arcadeGroup);

    const arcadeBody = new THREE.Mesh(new THREE.BoxGeometry(5.8, 2.6, 4.8), mats.arcadeDark);
    arcadeBody.position.y = 1.3;
    arcadeGroup.add(arcadeBody);

    const arcadeRoofPlatform = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 0.28, 5.2),
      mats.roofSlate,
    );
    arcadeRoofPlatform.position.y = 2.68;
    arcadeGroup.add(arcadeRoofPlatform);

    const arcadeDoor = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.75, 4.92), mats.windowGlow);
    arcadeDoor.position.y = 1.02;
    arcadeGroup.add(arcadeDoor);

    // 電玩城門前炫彩街機燈柱與直立旗幟
    [-2.4, 2.4].forEach((ax, idx) => {
      const neonPillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 2.2, 0.32),
        idx === 0 ? mats.stallRed : mats.stallBlue,
      );
      neonPillar.position.set(ax, 1.1, 2.48);
      arcadeGroup.add(neonPillar);
    });

    const gamepadGroup = new THREE.Group();
    gamepadGroup.position.set(0, 3.35, 0);
    gamepadGroup.rotation.x = 0.28;
    arcadeGroup.add(gamepadGroup);

    const padCenter = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.48, 1.32), mats.gamepadWhite);
    gamepadGroup.add(padCenter);

    const gripLeft = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.0, 8, 12), mats.gamepadWhite);
    gripLeft.position.set(-1.15, -0.05, 0.38);
    gripLeft.rotation.x = Math.PI / 2;
    gripLeft.rotation.z = 0.32;
    gamepadGroup.add(gripLeft);

    const gripRight = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.0, 8, 12), mats.gamepadWhite);
    gripRight.position.set(1.15, -0.05, 0.38);
    gripRight.rotation.x = Math.PI / 2;
    gripRight.rotation.z = -0.32;
    gamepadGroup.add(gripRight);

    const dpadH = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.18, 0.2), mats.arcadeDark);
    dpadH.position.set(-0.78, 0.28, -0.05);
    gamepadGroup.add(dpadH);
    const dpadV = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.58), mats.arcadeDark);
    dpadV.position.set(-0.78, 0.28, -0.05);
    gamepadGroup.add(dpadV);

    // 搖桿類比蘑菇頭
    [-0.32, 0.32].forEach((sx) => {
      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.12, 0.22, 10),
        mats.arcadeDark,
      );
      stick.position.set(sx, 0.3, 0.28);
      gamepadGroup.add(stick);
    });

    const btnA = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.18, 10), mats.stallRed);
    btnA.position.set(0.75, 0.28, 0.15);
    gamepadGroup.add(btnA);

    const btnB = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.18, 10), mats.stallBlue);
    btnB.position.set(0.98, 0.28, -0.1);
    gamepadGroup.add(btnB);

    const btnY = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.18, 10), mats.stallGold);
    btnY.position.set(0.55, 0.28, -0.15);
    gamepadGroup.add(btnY);

    // 電玩城南側青石台階（連接南岸水車與河道）
    for (let s = 0; s < 5; s++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.26, 0.68), mats.stoneStep);
      step.position.set(4.8 + s * 0.35, creativeY - s * 0.22, 7.2 + s * 0.55);
      step.rotation.y = Math.PI / 6;
      creativeBase.group.add(step);
    }

    const creativeRockBamboo = createTaihuRockAndBamboo(1.08);
    creativeRockBamboo.position.set(3.2, creativeY, -4.8);
    creativeBase.group.add(creativeRockBamboo);

    const creativeWheel = createWaterwheel();
    creativeWheel.position.set(7.8, 1.2, 11.6);
    creativeWheel.rotation.y = -Math.PI / 6;
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
      const w = 4.4 - tier * 0.75;
      const h = 1.75;
      const yPos = tier * 1.95;
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mats.wallCream);
      body.position.y = yPos + h * 0.5;
      hanlinGroup.add(body);

      const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, h * 0.55, w + 0.08), mats.windowGlow);
      win.position.y = yPos + h * 0.5;
      hanlinGroup.add(win);

      const roof = createChineseRoof(w + 1.25, w + 1.25, 1.15, mats.roofJade);
      roof.position.y = yPos + h;
      hanlinGroup.add(roof);
    }

    // 翰林院門前翠綠／白底文昌書院旌旗（參照圖中翰林院兩側垂掛的翠綠長幡）
    [-2.2, 2.2].forEach((bx) => {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 2.8, 6),
        mats.woodDark,
      );
      pole.position.set(bx, 1.4, 2.45);
      hanlinGroup.add(pole);

      const banner = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 1.65, 0.05),
        mats.roofJade,
      );
      banner.position.set(bx, 1.65, 2.58);
      hanlinGroup.add(banner);
    });

    const templeGroup = new THREE.Group();
    templeGroup.position.set(3.2, careerY, -0.5);
    templeGroup.rotation.y = -Math.PI / 6;
    careerBase.group.add(templeGroup);

    const templePlatform = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.78, 6.8), mats.stonePlaza);
    templePlatform.position.y = 0.39;
    templeGroup.add(templePlatform);

    const templeHall = new THREE.Mesh(new THREE.BoxGeometry(6.8, 2.7, 5.2), mats.vermilion);
    templeHall.position.y = 2.05;
    templeGroup.add(templeHall);

    // 求職廟一樓外環朱紅廊柱與金匾、門前香爐
    for (let cx = -3.4; cx <= 3.4; cx += 1.7) {
      [-2.7, 2.7].forEach((cz) => {
        const col = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.16, 2.65, 8),
          mats.vermilion,
        );
        col.position.set(cx, 2.05, cz);
        templeGroup.add(col);
      });
    }

    const templeDoors = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.85, 5.35), mats.windowGlow);
    templeDoors.position.y = 1.75;
    templeGroup.add(templeDoors);

    const templePlaque = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.52, 0.22), mats.goldTrim);
    templePlaque.position.set(0, 3.05, 2.78);
    templeGroup.add(templePlaque);

    const templeRoof1 = createChineseRoof(8.8, 7.0, 1.7, mats.roofJade);
    templeRoof1.position.y = 3.4;
    templeGroup.add(templeRoof1);

    const templeUpper = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.5, 3.6), mats.vermilion);
    templeUpper.position.y = 4.85;
    templeGroup.add(templeUpper);

    const templeRoof2 = createChineseRoof(6.8, 5.4, 1.65, mats.roofJade);
    templeRoof2.position.y = 5.6;
    templeGroup.add(templeRoof2);

    for (let lx = -3.2; lx <= 3.2; lx += 1.6) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), mats.lanternGlow);
      l.position.set(lx, 3.15, 3.15);
      l.scale.set(1, 1.3, 1);
      templeGroup.add(l);
    }

    // 求職廟前埕青銅三足香爐
    const censer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.36, 0.65, 10),
      mats.goldTrim,
    );
    censer.position.set(0, 0.95, 3.85);
    templeGroup.add(censer);

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

    // 牌坊正前方下山青石階梯（參照圖中徵才島牌坊前寬闊石階）
    for (let s = 0; s < 6; s++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.28, 0.72), mats.stoneStep);
      step.position.set(-2.2 - s * 0.35, careerY - s * 0.24, 6.8 + s * 0.58);
      step.rotation.y = -Math.PI / 6;
      careerBase.group.add(step);
    }

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

    // 橋上垂釣客 NPC（頭戴斗笠或髮髻，手握修長竹魚竿倚欄垂釣，屬於場景 NPC，頭上無倒三角；點擊觸發《桃花源記》漁人彩蛋詩文）
    const createBridgeAnglerNPC = (sideDir: 1 | -1, robeIdx: number, phase: number) => {
      const angler = new THREE.Group();
      angler.userData = {
        easterEggPoem: '「見漁人，乃大驚，問所從來。」',
        easterEggKind: 'fisherman',
      };
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

      // 透明擴大點擊感應框，方便點擊橋上漁人觸發彩蛋
      const anglerHitBox = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.65, 1.65, 8),
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      anglerHitBox.position.set(0, 0.75, 0.15);
      angler.add(anglerHitBox);

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
      clickableIslands.push(angler);
      return angler;
    };

    // 全部橋樑皆採用中式江南青石單孔拱橋（含圓弧石拱券、兩端青石橋台、階梯石板橋面、雕花青石欄板與蓮花望柱；點擊拱橋觸發彩蛋詩文）
    const createArchedBridge = (
      x1: number,
      z1: number,
      x2: number,
      z2: number,
      bridgeIdx = 0,
    ) => {
      const bridge = new THREE.Group();
      bridge.userData = {
        easterEggPoem: '「此處無斷橋，更有佳人哭斷腸...」',
        easterEggKind: 'bridge',
      };
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
      clickableIslands.push(bridge);
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
    const waterfallFallingStreaks: Array<{
      mesh: THREE.Mesh;
      topY: number;
      bottomY: number;
      topZ: number;
      bottomZ: number;
      speed: number;
      phase: number;
    }> = [];
    const mountainPeakClouds: Array<{
      group: THREE.Group;
      baseY: number;
      phase: number;
      speed: number;
    }> = [];
    const animatedWaterwheels: THREE.Group[] = [];
    const animatedEgrets: Array<{ leftWing: THREE.Group; rightWing: THREE.Group; phase: number }> = [];
    const animatedFarmers: Array<{ group: THREE.Group; torso: THREE.Group; phase: number }> = [];
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
      landGrp.userData = {
        easterEggPoem: '「土地平曠，屋舍儼然，有良田、美池、桑竹之屬。」',
        easterEggKind: 'farmland',
      };

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
      clickableIslands.push(landGrp);
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
      // 1. 北岸左右兩座大型有機農田島（中央留出寬闊水道直通北山洞口 [0, -50.5]）
      { cx: -26.0, cz: -44.5, rx: 14.5, rz: 6.5, seed: 1.4, rotY: 0.05, topHeight: 0.62 },
      { cx: 26.0, cz: -44.5, rx: 14.5, rz: 6.5, seed: 2.8, rotY: -0.05, topHeight: 0.62 },

      // 2. 西岸紅圈區域全面填滿，並將內側岸線往外退至 x ≈ -31.5，確保與主島之間的水道寬敞通暢
      { cx: -42.5, cz: 0.0, rx: 11.8, rz: 9.2, seed: 4.1, rotY: 0.0, topHeight: 0.65 },
      { cx: -45.5, cz: -13.5, rx: 14.5, rz: 11.8, seed: 4.3, rotY: 0.08, topHeight: 0.65 },
      { cx: -45.5, cz: 13.5, rx: 14.5, rz: 11.8, seed: 4.7, rotY: -0.08, topHeight: 0.65 },
      { cx: -54.0, cz: 0.0, rx: 12.0, rz: 28.5, seed: 9.7, rotY: 0.0, topHeight: 0.63 },
      { cx: -46.5, cz: -34.0, rx: 13.5, rz: 9.5, seed: 10.3, rotY: 0.12, topHeight: 0.62 },
      { cx: -46.5, cz: 34.0, rx: 13.5, rz: 9.5, seed: 11.1, rotY: -0.12, topHeight: 0.62 },

      // 3. 東岸陸地往東（山側）退縮至 x ≈ 31.8 外側，大幅拓寬與主島之間的中央水道，同時保留討論島與東岸農田茶園的連綿陸地及南側瀑布河道
      { cx: 43.5, cz: -4.2, rx: 11.8, rz: 6.8, seed: 5.5, rotY: -0.04, topHeight: 0.65 },
      { cx: 41.5, cz: -13.5, rx: 10.2, rz: 7.6, seed: 5.9, rotY: -0.15, topHeight: 0.65 },
      { cx: 48.5, cz: -14.5, rx: 12.2, rz: 12.8, seed: 12.4, rotY: 0.04, topHeight: 0.63 },
      { cx: 46.5, cz: -34.0, rx: 13.0, rz: 9.5, seed: 12.9, rotY: -0.1, topHeight: 0.62 },

      // 4. 南岸左右兩座大型有機農田島（中央留出水道直通南山洞口 [0, 52.5]）
      { cx: -26.0, cz: 44.5, rx: 14.5, rz: 6.5, seed: 6.9, rotY: -0.05, topHeight: 0.62 },
      { cx: 26.0, cz: 44.5, rx: 14.5, rz: 6.5, seed: 8.3, rotY: 0.05, topHeight: 0.62 },

      // 5. 東南山麓陸地（位於徵才島 [32, 24] 東南側，避開 z = +4 ~ +15 的東山瀑布河道）
      { cx: 48.5, cz: 29.5, rx: 11.5, rz: 10.2, seed: 13.8, rotY: -0.08, topHeight: 0.62 },
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
    const mountainMistPoem =
      '「煙光山色淡溟蒙，千尺浮屠兀倚空。湖上畫船歸欲盡，孤峰猶帶夕陽紅。」';

    const closedRingCount = 32;
    for (let i = 0; i < closedRingCount; i++) {
      const angle = (i / closedRingCount) * Math.PI * 2;
      const isCaveOrWaterfallPeak = i === 8 || i === 24; // 南側洞口 (i=8) 與北側飛流直下大瀑布 (i=24) 退讓不遮擋
      const isWestPagodaPlateau = i === 16; // 痛點島與創意島之間後方的平頂山台 (i=16)
      const isWestPlateauShoulder = i === 15 || i === 17; // 塔樓山台兩側平緩山肩

      const radiusBase = isWestPagodaPlateau
        ? 61.5
        : isWestPlateauShoulder
        ? 65.5
        : (isCaveOrWaterfallPeak ? 75.0 : 69) + Math.sin(i * 1.6) * 3.5;
      const mx = Math.cos(angle) * (radiusBase * 1.08);
      const mz = Math.sin(angle) * (radiusBase * 0.94);
      const mr = isCaveOrWaterfallPeak ? 13.5 : 15.8 + (i % 4) * 1.1;
      const mh = 26 + (i % 5) * 2.8;

      const peakGrp = new THREE.Group();
      peakGrp.position.set(mx, -0.5, mz);
      peakGrp.userData = {
        easterEggPoem: mountainMistPoem,
        easterEggKind: 'mountain-mist',
      };

      if (isWestPagodaPlateau) {
        // 塔樓所在區域的山勢平緩開闊：打造寬闊平頂翠微山台（不蓋在尖峰上）
        const lowerSlope = new THREE.Mesh(
          new THREE.CylinderGeometry(13.8, 22.8, 12.2, 12),
          mats.mountainGreen,
        );
        lowerSlope.position.y = 6.1;
        peakGrp.add(lowerSlope);

        const midTerrace = new THREE.Mesh(
          new THREE.CylinderGeometry(11.6, 13.8, 3.2, 12),
          mats.grassLush,
        );
        midTerrace.position.y = 13.8;
        peakGrp.add(midTerrace);

        const flatLawnTop = new THREE.Mesh(
          new THREE.CylinderGeometry(11.2, 11.6, 0.6, 16),
          mats.grassTop,
        );
        flatLawnTop.position.y = 15.4;
        peakGrp.add(flatLawnTop);

        // 山台兩側自然緩坡延伸，與南北相鄰山肩柔和銜接
        [-1, 1].forEach((dir) => {
          const wingMound = new THREE.Mesh(
            new THREE.CylinderGeometry(7.2, 12.5, 13.2, 10),
            mats.mountainGreen,
          );
          wingMound.position.set(-1.5, 6.6, dir * 10.2);
          peakGrp.add(wingMound);

          const wingCap = new THREE.Mesh(
            new THREE.CylinderGeometry(6.8, 7.2, 0.6, 10),
            mats.grassLush,
          );
          wingCap.position.set(-1.5, 13.3, dir * 10.2);
          peakGrp.add(wingCap);

          const plateauPine = createPineTree(1.25);
          plateauPine.position.set(2.2, 15.6, dir * 7.6);
          peakGrp.add(plateauPine);
        });

        enableShadows(peakGrp);
        worldGroup.add(peakGrp);
        clickableIslands.push(peakGrp);
        continue;
      }

      if (isWestPlateauShoulder) {
        // 塔樓山台左右兩側（i=15, i=17）改為平緩圓頂山肩，讓整片西山區域山勢平緩開闊
        const shoulderH = 15.2;
        const mainShoulder = new THREE.Mesh(
          new THREE.CylinderGeometry(mr * 0.56, mr * 0.98, shoulderH, 10),
          mats.mountainGreen,
        );
        mainShoulder.position.y = shoulderH * 0.5;
        peakGrp.add(mainShoulder);

        const shoulderFlatCap = new THREE.Mesh(
          new THREE.CylinderGeometry(mr * 0.52, mr * 0.56, 0.7, 10),
          mats.grassLush,
        );
        shoulderFlatCap.position.y = shoulderH + 0.25;
        peakGrp.add(shoulderFlatCap);

        const shoulderPine = createPineTree(1.2);
        shoulderPine.position.set(2.5, shoulderH + 0.5, 0);
        peakGrp.add(shoulderPine);

        enableShadows(peakGrp);
        worldGroup.add(peakGrp);
        clickableIslands.push(peakGrp);
        continue;
      }

      const mainPeak = new THREE.Mesh(
        new THREE.ConeGeometry(mr, mh, 7),
        i % 2 === 0 ? mats.mountainGreen : mats.mountainRock,
      );
      mainPeak.position.y = mh * 0.48;
      mainPeak.rotation.y = i * 0.65;
      peakGrp.add(mainPeak);

      if (!isCaveOrWaterfallPeak) {
        const subPeak = new THREE.Mesh(
          new THREE.ConeGeometry(mr * 0.72, mh * 0.74, 6),
          i % 2 === 0 ? mats.mountainRock : mats.mountainGreen,
        );
        subPeak.position.set(mr * 0.42, mh * 0.35, mr * 0.28);
        peakGrp.add(subPeak);
      }

      // 精簡山壁岩石（僅每隔 5 座山峰點綴單一雅致山石，避免山壁岩石過多）
      const inwardAngle = Math.atan2(-mz, -mx);
      if (!isCaveOrWaterfallPeak && i % 5 === 0) {
        const cragMesh = new THREE.Mesh(
          new THREE.DodecahedronGeometry(1.0, 1),
          i % 2 === 0 ? mats.cliffRock : mats.mountainRock,
        );
        cragMesh.position.set(
          Math.cos(inwardAngle) * (mr * 0.56),
          mh * 0.24,
          Math.sin(inwardAngle) * (mr * 0.56),
        );
        cragMesh.scale.set(2.4, 7.8, 2.2);
        cragMesh.rotation.y = i * 0.7;
        peakGrp.add(cragMesh);
      }

      // 山上蒼翠古松（北側瀑布主峰 i=24 避開正中央水道視線，改種於兩側山肩）
      const pineCoords: Array<[number, number, number, number]> =
        i === 24
          ? [
              [-9.5, mh * 0.22, 6.5, 1.35],
              [9.5, mh * 0.22, 6.5, 1.35],
            ]
          : [
              [Math.cos(inwardAngle) * mr * 0.62, mh * 0.16, Math.sin(inwardAngle) * mr * 0.62, 1.5],
              [Math.cos(inwardAngle + 0.5) * mr * 0.5, mh * 0.3, Math.sin(inwardAngle + 0.5) * mr * 0.5, 1.35],
              [mr * 0.36, mh * 0.46, mr * 0.22, 1.25],
            ];
      pineCoords.forEach(([px, py, pz, pScale]) => {
        const mountainPine = createPineTree(pScale);
        mountainPine.position.set(px, py, pz);
        peakGrp.add(mountainPine);
      });

      // 雲繞山頭：在每座大山的山頭環繞蓬鬆雲帶（避開 i=24 北山飛瀑正上方以免遮擋飛瀑源頭）
      if (i !== 24) {
        const peakCloudCollar = new THREE.Group();
        const collarBaseY = mh * 0.68;
        peakCloudCollar.position.set(0, collarBaseY, 0);
        peakCloudCollar.userData = {
          easterEggPoem: mountainMistPoem,
          easterEggKind: 'mountain-mist',
        };

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
      }

      enableShadows(peakGrp);
      worldGroup.add(peakGrp);
      clickableIslands.push(peakGrp);
    }

    // 8.4b 精簡山麓奇石點綴（大幅減少石山數量與岩柱密度，讓翠綠山巒更清爽自然）
    const createStoneCragMountain = (
      sx: number,
      sz: number,
      scale = 1.0,
      rotY = 0,
    ) => {
      const cragGroup = new THREE.Group();
      cragGroup.position.set(sx, -0.4, sz);
      cragGroup.rotation.y = rotY;
      cragGroup.userData = {
        easterEggPoem: mountainMistPoem,
        easterEggKind: 'mountain-mist',
      };

      const pillars: Array<[number, number, number, number, number, number, boolean]> = [
        [0, 5.6, 0, 2.6, 10.5, 2.4, true],
        [-1.8, 4.2, 1.1, 1.9, 7.8, 1.8, false],
      ];

      pillars.forEach(([px, py, pz, rx, ry, rz, isWarm], idx) => {
        const rockMesh = new THREE.Mesh(
          new THREE.DodecahedronGeometry(1.0, 1),
          isWarm ? mats.cliffRock : mats.mountainRock,
        );
        rockMesh.position.set(px, py, pz);
        rockMesh.scale.set(rx, ry, rz);
        rockMesh.rotation.y = idx * 0.85;
        cragGroup.add(rockMesh);
      });

      const cliffPine = createPineTree(1.0);
      cliffPine.position.set(-1.2, 6.8, 1.1);
      cliffPine.rotation.z = 0.2;
      cragGroup.add(cliffPine);

      cragGroup.scale.setScalar(scale);
      enableShadows(cragGroup);
      worldGroup.add(cragGroup);
      clickableIslands.push(cragGroup);
    };

    const stoneCragLocations: Array<[number, number, number, number]> = [
      [-44.0, -46.5, 0.92, 0.6],
      [44.0, -46.5, 0.92, -0.55],
      [-42.5, 48.5, 0.92, 2.4],
      [42.5, 48.5, 0.92, -2.4],
    ];

    stoneCragLocations.forEach(([cx, cz, sc, rot]) => {
      createStoneCragMountain(cx, cz, sc, rot);
    });

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

    // 8.6 江南水鄉農田生活煙火氣：山邊大型水溶石洞口（連接水道）、東山飛瀑與河道、水稻梯田、運轉水車、水道兩岸桃樹、悠閒黃牛、辛勤農夫、白鷺鷥與生機家畜
    // A. 醒目高聳的山邊水溶石洞口（設於北山腳下 [0, 0, -50.5] 與南山腳下 [0, 0, 52.5]，連接南北中央水道，烏篷船可直接駛入洞中）
    const caveEasterEggSparkles: Array<{
      core: THREE.Mesh;
      halo: THREE.Mesh;
      haloMat: THREE.MeshBasicMaterial;
      baseY: number;
      phase: number;
    }> = [];

    const createMountainWaterGrotto = (gx: number, gy: number, gz: number, rotY = 0) => {
      const waterGrottoGroup = new THREE.Group();
      waterGrottoGroup.position.set(gx, gy, gz);
      waterGrottoGroup.rotation.y = rotY;
      waterGrottoGroup.userData = {
        easterEggPoem: '「初極狹，纔通人。復行數十步，豁然開朗。」',
        easterEggKind: 'cave',
      };

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

        const archLantern = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.32, 0.68, 8),
          mats.lanternGlow,
        );
        archLantern.position.set(lx * 0.72, 4.6, 2.2);
        waterGrottoGroup.add(archLantern);
      });

      // 8. 山洞彩蛋微光小亮點（「山有小口，彷彿若有光」—— 不加文字提示，僅以洞中一顆溫潤呼吸的小亮點吸引探索點擊）
      const sparkleCoreMat = new THREE.MeshBasicMaterial({
        color: 0xfff7cc,
      });
      const sparkleCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 16, 16),
        sparkleCoreMat,
      );
      sparkleCore.position.set(0, 2.45, 2.15);
      waterGrottoGroup.add(sparkleCore);

      const sparkleHaloMat = new THREE.MeshBasicMaterial({
        color: 0xffdf7a,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
      });
      const sparkleHalo = new THREE.Mesh(
        new THREE.SphereGeometry(0.78, 16, 16),
        sparkleHaloMat,
      );
      sparkleHalo.position.set(0, 2.45, 2.15);
      waterGrottoGroup.add(sparkleHalo);

      // 透明擴大點擊感應球，讓玩家輕點山洞口或小亮點皆能靈敏觸發詩文彩蛋
      const caveHitSphere = new THREE.Mesh(
        new THREE.SphereGeometry(5.2, 12, 12),
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      caveHitSphere.position.set(0, 2.8, 1.8);
      waterGrottoGroup.add(caveHitSphere);

      caveEasterEggSparkles.push({
        core: sparkleCore,
        halo: sparkleHalo,
        haloMat: sparkleHaloMat,
        baseY: 2.45,
        phase: gz < 0 ? 0 : Math.PI,
      });

      const caveLight = new THREE.PointLight(0xffb347, 2.4, 24, 1.4);
      caveLight.position.set(0, 3.8, 3.2);
      waterGrottoGroup.add(caveLight);

      worldGroup.add(waterGrottoGroup);
      clickableIslands.push(waterGrottoGroup);
    };

    // 留一個洞口就好（南山水道洞口 [0, 0.2, 52.5]），另一邊（北山中央水道盡頭 [0, 0, -50.5]）改為高崖飛流直下大瀑布
    createMountainWaterGrotto(0, 0.2, 52.5, Math.PI); // 南山唯一水道洞口（正對中央南水道）

    const createNorthCentralGrandWaterfall = () => {
      const grandWf = new THREE.Group();
      // 置於北山山腳最前方 (z = -50.5)，完全處於北山圓錐體前方，絕不被山體或雲霧遮擋
      grandWf.position.set(0, 0, -50.5);
      grandWf.userData = {
        easterEggPoem: '「日照香爐生紫煙，遙看瀑布掛前川。飛流直下三千尺，疑是銀河落九天。」',
        easterEggKind: 'mountain-mist',
      };

      const wfAquaMat = new THREE.MeshStandardMaterial({
        color: 0x3ec6e0,
        emissive: 0x176d80,
        emissiveIntensity: 0.55,
        roughness: 0.18,
      });
      const wfBrightCurtainMat = new THREE.MeshStandardMaterial({
        color: 0xf4feff,
        emissive: 0xcff6ff,
        emissiveIntensity: 0.78,
        roughness: 0.15,
        transparent: true,
        opacity: 0.94,
      });
      const wfStreakMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.92,
      });

      // 1. 瀑布後方深色濕潤玄武岩崖壁與左右峭壁山肩（形成強烈明暗對比，凸顯雪白飛瀑）
      const wetCliffBack = new THREE.Mesh(
        new THREE.BoxGeometry(10.8, 26.5, 2.8),
        mats.caveRockMat,
      );
      wetCliffBack.position.set(0, 12.8, -2.2);
       wetCliffBack.rotation.x = 0.22;
      grandWf.add(wetCliffBack);

      [-5.8, 5.8].forEach((sideX, sIdx) => {
        for (let h = 0; h < 4; h++) {
          const cliffShoulder = new THREE.Mesh(
            new THREE.DodecahedronGeometry(2.6 - h * 0.2, 1),
            h % 2 === sIdx ? mats.cliffDark : mats.caveRockMat,
          );
          cliffShoulder.position.set(
            sideX + (h % 2 === 0 ? 0.35 : -0.35),
            3.2 + h * 6.0,
            1.4 - h * 1.35,
          );
          cliffShoulder.scale.set(1.25, 1.85, 1.35);
          grandWf.add(cliffShoulder);
        }
      });

      // 崖頂碧水河源出口平台
      const crestPool = new THREE.Mesh(
        new THREE.CylinderGeometry(4.8, 5.2, 0.8, 16),
         wfAquaMat,
      );
      crestPool.position.set(0, 25.4, -4.6);
      grandWf.add(crestPool);

      // 2. 飛流直下主水簾（底層碧藍水脈 + 表層雪白飛瀑水簾，全程位於山壁最前方 z: -4.2 -> +2.8）
      const aquaCoreBody = new THREE.Mesh(
        new THREE.BoxGeometry(7.8, 26.8, 0.95),
        wfAquaMat,
      );
      aquaCoreBody.position.set(0, 12.8, -0.7);
      aquaCoreBody.rotation.x = 0.24;
      grandWf.add(aquaCoreBody);

      const topCascade = new THREE.Mesh(
        new THREE.BoxGeometry(6.8, 10.5, 1.05),
        wfBrightCurtainMat,
      );
      topCascade.position.set(0, 21.0, -2.5);
      topCascade.rotation.x = 0.24;
      grandWf.add(topCascade);

      const midCascade = new THREE.Mesh(
        new THREE.BoxGeometry(7.6, 10.8, 1.12),
        wfBrightCurtainMat,
      );
      midCascade.position.set(0, 12.2, -0.4);
      midCascade.rotation.x = 0.24;
      grandWf.add(midCascade);

      const lowerCascade = new THREE.Mesh(
        new THREE.BoxGeometry(8.6, 9.2, 1.2),
        wfBrightCurtainMat,
      );
      lowerCascade.position.set(0, 4.0, 1.6);
      lowerCascade.rotation.x = 0.26;
      grandWf.add(lowerCascade);

      // 3. 動態「飛流直下」奔騰水柱條紋（在 animate 中持續由上往下高速傾瀉流動）
      for (let s = 0; s < 22; s++) {
        const laneX = ((s % 7) - 3) * 1.05 + ((s % 2) - 0.5) * 0.28;
        const streakLen = 3.2 + (s % 3) * 1.1;
        const streakWidth = 0.38 + (s % 3) * 0.14;
        const streakMesh = new THREE.Mesh(
          new THREE.BoxGeometry(streakWidth, streakLen, 0.36),
          wfStreakMat,
        );
        streakMesh.rotation.x = 0.24;
        streakMesh.position.set(laneX, 12, 0.5);
        grandWf.add(streakMesh);

        waterfallFallingStreaks.push({
          mesh: streakMesh,
          topY: 24.8,
          bottomY: 0.6,
          topZ: -3.1,
          bottomZ: 2.95,
          speed: 0.55 + (s % 5) * 0.08,
          phase: (s / 22),
        });
      }

      // 4. 飛瀑底部翡翠深潭與翻湧雪白水花泡沫（直通中央北水道）
      const grandPlungePool = new THREE.Mesh(
        new THREE.CylinderGeometry(9.2, 9.2, 0.28, 28),
        wfAquaMat,
      );
      grandPlungePool.position.set(0, -0.52, 3.8);
      grandPlungePool.scale.set(1.25, 1.0, 1.35);
      grandWf.add(grandPlungePool);

      for (let f = 0; f < 16; f++) {
        const ang = (f / 16) * Math.PI * 1.4 - Math.PI * 0.2;
        const rad = 2.4 + (f % 4) * 1.15;
        const foam = new THREE.Mesh(
          new THREE.SphereGeometry(0.88 + (f % 3) * 0.32, 10, 10),
          wfBrightCurtainMat,
        );
        foam.position.set(Math.cos(ang) * rad, -0.15, 2.8 + Math.sin(ang) * rad * 0.78);
        grandWf.add(foam);
        waterfallDrops.push(foam);
      }

      for (let m = -4; m <= 4; m++) {
        const midFoam = new THREE.Mesh(
          new THREE.SphereGeometry(0.76 + (Math.abs(m) % 2) * 0.26, 8, 8),
          wfBrightCurtainMat,
        );
        midFoam.position.set(m * 0.92, 8.2, 0.85 + (m % 2) * 0.25);
        grandWf.add(midFoam);
        waterfallDrops.push(midFoam);
      }

      enableShadows(grandWf);
      worldGroup.add(grandWf);
      clickableIslands.push(grandWf);
    };

    createNorthCentralGrandWaterfall();

    // A2. 東山飛瀑與碧水河道（依藍色標記：自東山高崖 [54.5, 19.5, 11.2] 飛流直下匯入徵才島與東岸農田之間的清澈河道）
    const createEastMountainWaterfall = () => {
      const wfGroup = new THREE.Group();
      wfGroup.position.set(51.5, 0, 11.2);
      wfGroup.rotation.y = -Math.PI / 2 - 0.12;

      // 1. 瀑布後方層疊蒼翠崖壁與青石岩階（與東側高山無縫銜接）
      [
        [-3.4, 7.5, -2.2, 3.2, 16.5, 3.4],
        [3.4, 7.2, -2.0, 3.2, 15.8, 3.4],
        [0.0, 11.5, -3.5, 6.2, 12.0, 3.2],
        [0.0, 4.8, -1.5, 5.6, 9.8, 3.0],
      ].forEach(([rx, ry, rz, sx, sy, sz], idx) => {
        const cliff = new THREE.Mesh(
          new THREE.DodecahedronGeometry(1.0, 1),
          idx % 2 === 0 ? mats.cliffRock : mats.mountainRock,
        );
        cliff.position.set(rx, ry, rz);
        cliff.scale.set(sx, sy, sz);
        wfGroup.add(cliff);
      });

      // 2. 三疊飛流直下的雪白瀑布水簾（主瀑 + 上下疊瀑）
      const upperCascade = new THREE.Mesh(
        new THREE.BoxGeometry(3.8, 9.8, 0.65),
        mats.waterFoam,
      );
      upperCascade.position.set(0, 14.2, -1.6);
      upperCascade.rotation.x = 0.26;
      wfGroup.add(upperCascade);

      const lowerCascade = new THREE.Mesh(
        new THREE.BoxGeometry(4.4, 10.6, 0.75),
        mats.waterFoam,
      );
      lowerCascade.position.set(0, 5.2, 1.1);
      lowerCascade.rotation.x = 0.32;
      wfGroup.add(lowerCascade);

      // 瀑布中段激流飛沫岩台
      for (let m = -2; m <= 2; m++) {
        const midSplash = new THREE.Mesh(
          new THREE.SphereGeometry(0.68 + (Math.abs(m) % 2) * 0.22, 8, 8),
          mats.waterFoam,
        );
        midSplash.position.set(m * 0.85, 9.6, -0.1 + (m % 2) * 0.25);
        wfGroup.add(midSplash);
        waterfallDrops.push(midSplash);
      }

      // 3. 瀑布底部碧綠深潭與翻湧水花泡沫群
      const plungePool = new THREE.Mesh(
        new THREE.CylinderGeometry(5.6, 5.6, 0.22, 24),
        mats.caveWaterMat,
      );
      plungePool.position.set(0, -0.62, 3.8);
      plungePool.scale.set(1.15, 1.0, 1.45);
      wfGroup.add(plungePool);

      for (let f = 0; f < 9; f++) {
        const ang = (f / 9) * Math.PI * 1.4 - Math.PI * 0.2;
        const rad = 2.2 + (f % 3) * 0.85;
        const foam = new THREE.Mesh(
          new THREE.SphereGeometry(0.72 + (f % 2) * 0.28, 8, 8),
          mats.waterFoam,
        );
        foam.position.set(Math.cos(ang) * rad, -0.28, 3.2 + Math.sin(ang) * rad * 0.8);
        wfGroup.add(foam);
        waterfallDrops.push(foam);
      }

      enableShadows(wfGroup);
      worldGroup.add(wfGroup);

      // 4. 順著藍色標記河道蜿蜒流入中央水道的「清澈溪流波紋帶」（由瀑布深潭 [46, 11.0] 流經徵才島與東岸農田之間至 [20, 7.8]）
      const streamWaypoints: Array<[number, number, number, number]> = [
        [44.5, 10.8, 4.8, -0.08],
        [39.5, 10.2, 4.5, -0.12],
        [34.5, 9.6, 4.2, -0.16],
        [29.5, 8.8, 4.0, -0.24],
        [24.8, 7.6, 3.8, -0.35],
        [21.2, 6.0, 3.5, -0.48],
      ];
      streamWaypoints.forEach(([sx, sz, len, rot], idx) => {
        const rippleRibbon = new THREE.Mesh(
          new THREE.BoxGeometry(len, 0.04, 0.36 + (idx % 2) * 0.14),
          mats.waterFoam,
        );
        rippleRibbon.position.set(sx, -0.58, sz + (idx % 2 === 0 ? 0.55 : -0.55));
        rippleRibbon.rotation.y = rot;
        worldGroup.add(rippleRibbon);
      });
    };

    createEastMountainWaterfall();

    // A3. 北峽懸崖飛瀑與高山重簷古亭、北峽青石小拱橋、西山高崖飛瀑、以及南岸水鄉人家與南側雙石拱橋（100% 還原參考圖四周山水橋亭細節）
    const pagodaNightLights: THREE.PointLight[] = [];
    const pagodaNightHaloMats: THREE.MeshBasicMaterial[] = [];
    const pagodaNightHaloMeshes: THREE.Mesh[] = [];

    const createNorthWestWaterfallsAndSouthernBridges = () => {
      // 1. 北山峽谷大瀑布與崖頂重簷古亭（位於痛點島東北側、北峽水道 [-13.8, 0, -42.5]）
      const northWf = new THREE.Group();
      northWf.position.set(-13.8, 0, -42.5);
      northWf.rotation.y = 0.22;

      [
        [-2.8, 7.2, -1.8, 3.0, 15.5, 3.2],
        [2.8, 7.0, -1.8, 3.0, 15.0, 3.2],
        [0, 10.8, -3.2, 5.8, 12.5, 3.4],
      ].forEach(([rx, ry, rz, sx, sy, sz], idx) => {
        const rock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(1.0, 1),
          idx % 2 === 0 ? mats.cliffRock : mats.mountainRock,
        );
        rock.position.set(rx, ry, rz);
        rock.scale.set(sx, sy, sz);
        northWf.add(rock);
      });

      const nStreamUpper = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 9.2, 0.6),
        mats.waterFoam,
      );
      nStreamUpper.position.set(0, 11.5, -0.8);
      nStreamUpper.rotation.x = 0.22;
      northWf.add(nStreamUpper);

      const nStreamLower = new THREE.Mesh(
        new THREE.BoxGeometry(3.8, 8.8, 0.68),
        mats.waterFoam,
      );
      nStreamLower.position.set(0, 4.2, 1.2);
      nStreamLower.rotation.x = 0.28;
      northWf.add(nStreamLower);

      for (let f = 0; f < 6; f++) {
        const foam = new THREE.Mesh(
          new THREE.SphereGeometry(0.62 + (f % 2) * 0.22, 8, 8),
          mats.waterFoam,
        );
        foam.position.set((f - 2.5) * 0.78, -0.25, 2.8 + (f % 2) * 0.35);
        northWf.add(foam);
        waterfallDrops.push(foam);
      }

      const pagodaTowerPoems = [
        '「白日依山盡，黃湯入嘴留，芋頭西米露，端上此塔樓」',
        '「西泠西畔舊雷家，廢塔凋零夕照斜。一角紅云生古艷，半空青影帶殘霞。」',
        '「塔影初收日色昏，隔牆人語近甘園。南山遊遍分歸路，半入錢唐半暗門。」',
      ];

      enableShadows(northWf);
      worldGroup.add(northWf);

      // 2. 西山高崖飛瀑（參照圖左上方痛點島西側山壁傾瀉而下的高崖瀑布 [-53.5, 0, -19.5]）
      const westWf = new THREE.Group();
      westWf.position.set(-53.5, 0, -19.5);
      westWf.rotation.y = Math.PI / 2 - 0.15;

      const wStream = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 13.5, 0.65),
        mats.waterFoam,
      );
      wStream.position.set(0, 6.8, 0.6);
      wStream.rotation.x = 0.25;
      westWf.add(wStream);

      for (let f = 0; f < 5; f++) {
        const foam = new THREE.Mesh(
          new THREE.SphereGeometry(0.58 + (f % 2) * 0.2, 8, 8),
          mats.waterFoam,
        );
        foam.position.set((f - 2) * 0.72, -0.28, 2.4);
        westWf.add(foam);
        waterfallDrops.push(foam);
      }
      worldGroup.add(westWf);

      // 3. 外圍水域三座「江南重簷八角湖中亭」（取代原本懸在水中未接岸的斷橋，佇立於八角青石水榭台基之上）
      const createMidLakePavilion = (
        lx: number,
        lz: number,
        rotY = 0,
        useJadeRoof = false,
      ) => {
        const lakePavGroup = new THREE.Group();
        lakePavGroup.position.set(lx, 0.25, lz);
        lakePavGroup.rotation.y = rotY;

        // 1. 深入水底的八角青石基座與水榭平台
        const submergedPier = new THREE.Mesh(
          new THREE.CylinderGeometry(3.2, 3.6, 2.4, 8),
          mats.stoneGrey,
        );
        submergedPier.position.y = -1.1;
        lakePavGroup.add(submergedPier);

        const platformDeck = new THREE.Mesh(
          new THREE.CylinderGeometry(3.35, 3.5, 0.42, 8),
          mats.stonePlaza,
        );
        platformDeck.position.y = 0.21;
        lakePavGroup.add(platformDeck);

        const innerStep = new THREE.Mesh(
          new THREE.CylinderGeometry(2.55, 2.7, 0.24, 8),
          mats.stoneStep,
        );
        innerStep.position.y = 0.48;
        lakePavGroup.add(innerStep);

        // 2. 八角青石雕花護欄與望柱（正前方留出親水登船石階口）
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.13, 0.15, 0.85, 8),
            mats.stonePlaza,
          );
          post.position.set(Math.cos(a) * 3.05, 0.72, Math.sin(a) * 3.05);
          lakePavGroup.add(post);

          const postCap = new THREE.Mesh(
            new THREE.SphereGeometry(0.16, 8, 8),
            i % 2 === 0 ? mats.lanternGlow : mats.goldTrim,
          );
          postCap.position.set(Math.cos(a) * 3.05, 1.2, Math.sin(a) * 3.05);
          lakePavGroup.add(postCap);

          if (i !== 0) {
            const nextA = ((i + 1) / 8) * Math.PI * 2;
            const midX = (Math.cos(a) + Math.cos(nextA)) * 0.5 * 3.05;
            const midZ = (Math.sin(a) + Math.sin(nextA)) * 0.5 * 3.05;
            const rail = new THREE.Mesh(
              new THREE.BoxGeometry(2.15, 0.42, 0.14),
              mats.stoneStep,
            );
            rail.position.set(midX, 0.62, midZ);
            rail.rotation.y = -((a + nextA) * 0.5) + Math.PI / 2;
            lakePavGroup.add(rail);
          }
        }

        // 親水登船小石階
        for (let s = 0; s < 3; s++) {
          const dockStep = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 0.22, 0.45),
            mats.stoneStep,
          );
          dockStep.position.set(3.25 + s * 0.38, 0.22 - s * 0.18, 0);
          dockStep.rotation.y = Math.PI / 2;
          lakePavGroup.add(dockStep);
        }

        // 3. 湖心亭內青石茶几與石鼓凳
        const teaTable = new THREE.Mesh(
          new THREE.CylinderGeometry(0.58, 0.42, 0.56, 8),
          mats.stoneGrey,
        );
        teaTable.position.y = 0.82;
        lakePavGroup.add(teaTable);

        for (let st = 0; st < 4; st++) {
          const sa = (st / 4) * Math.PI * 2 + Math.PI / 4;
          const stool = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.22, 0.36, 8),
            mats.stonePlaza,
          );
          stool.position.set(Math.cos(sa) * 0.98, 0.72, Math.sin(sa) * 0.98);
          lakePavGroup.add(stool);
        }

        // 4. 八根朱紅廊柱與重簷攢尖飛角亭頂
        const roofMat = useJadeRoof ? mats.roofJade : mats.roofSlate;
        for (let c = 0; c < 8; c++) {
          const ca = (c / 8) * Math.PI * 2 + Math.PI / 8;
          const col = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.14, 2.25, 8),
            mats.vermilion,
          );
          col.position.set(Math.cos(ca) * 2.15, 1.65, Math.sin(ca) * 2.15);
          lakePavGroup.add(col);

          if (c % 2 === 0) {
            const lantern = new THREE.Mesh(
              new THREE.SphereGeometry(0.18, 8, 8),
              mats.lanternGlow,
            );
            lantern.scale.set(1, 1.28, 1);
            lantern.position.set(Math.cos(ca) * 2.48, 2.42, Math.sin(ca) * 2.48);
            lakePavGroup.add(lantern);
          }
        }

        const lowerRoof = new THREE.Mesh(
          new THREE.ConeGeometry(3.25, 1.15, 8),
          roofMat,
        );
        lowerRoof.position.y = 3.15;
        lakePavGroup.add(lowerRoof);

        const upperNeck = new THREE.Mesh(
          new THREE.CylinderGeometry(1.55, 1.65, 0.65, 8),
          mats.vermilion,
        );
        upperNeck.position.y = 3.75;
        lakePavGroup.add(upperNeck);

        const upperRoof = new THREE.Mesh(
          new THREE.ConeGeometry(2.45, 1.25, 8),
          roofMat,
        );
        upperRoof.position.y = 4.48;
        lakePavGroup.add(upperRoof);

        const goldFinial = new THREE.Mesh(
          new THREE.ConeGeometry(0.22, 0.72, 8),
          mats.goldTrim,
        );
        goldFinial.position.y = 5.38;
        lakePavGroup.add(goldFinial);

        enableShadows(lakePavGroup);
        worldGroup.add(lakePavGroup);
      };

      createMidLakePavilion(-13.2, -32.8, 0.25, false); // 北峽觀瀑湖中亭
      createMidLakePavilion(-22.8, 35.8, -0.4, true);   // 西南湖灣湖中亭
      createMidLakePavilion(21.6, 35.6, 0.4, false);    // 東南湖灣湖中亭

      // 5. 山上唯一一座「五層八角飛簷樓閣式古塔（雷峰夕照／夜間璀璨亮燈古塔）」
      const createMountainPagodaTower = (scale = 1.0) => {
        const pagodaTower = new THREE.Group();

        // 山巔青石台基與八角雕花護欄
        const stoneTerrace = new THREE.Mesh(
          new THREE.CylinderGeometry(4.2, 4.8, 1.8, 8),
          mats.stonePlaza,
        );
        stoneTerrace.position.y = 0.9;
        pagodaTower.add(stoneTerrace);

        // 五層八角重簷塔身（白牆、深木柱框、夜間高亮暖金花窗、黛青飛簷與八角飛簷宮燈）
        const totalStories = 5;
        let currentY = 1.8;
        for (let s = 0; s < totalStories; s++) {
          const radius = 3.35 - s * 0.42;
          const storyH = 2.05 - s * 0.14;

          // 八角白牆塔身
          const wallCore = new THREE.Mesh(
            new THREE.CylinderGeometry(radius * 0.88, radius * 0.92, storyH, 8),
            mats.wallCream,
          );
          wallCore.position.y = currentY + storyH * 0.5;
          pagodaTower.add(wallCore);

          // 八面發光雕花窗與外環木構廊柱（採用 pagodaWindowGlow 確保夜晚整座塔樓璀璨亮起）
          for (let f = 0; f < 8; f++) {
            const fa = (f / 8) * Math.PI * 2;
            const pillar = new THREE.Mesh(
              new THREE.CylinderGeometry(0.11, 0.12, storyH, 6),
              mats.woodDark,
            );
            pillar.position.set(
              Math.cos(fa) * (radius * 0.93),
              currentY + storyH * 0.5,
              Math.sin(fa) * (radius * 0.93),
            );
            pagodaTower.add(pillar);

            const winAngle = fa + Math.PI / 8;
            const winMesh = new THREE.Mesh(
              new THREE.BoxGeometry(radius * 0.42, storyH * 0.58, 0.14),
              mats.pagodaWindowGlow,
            );
            winMesh.position.set(
              Math.cos(winAngle) * (radius * 0.86),
              currentY + storyH * 0.52,
              Math.sin(winAngle) * (radius * 0.86),
            );
            winMesh.rotation.y = -winAngle + Math.PI / 2;
            pagodaTower.add(winMesh);
          }

          // 每層外挑平座木欄杆
          const balconyRing = new THREE.Mesh(
            new THREE.CylinderGeometry(radius * 1.04, radius * 1.02, 0.28, 8),
            mats.woodDark,
          );
          balconyRing.position.y = currentY + 0.18;
          pagodaTower.add(balconyRing);

          // 八角飛簷塔頂（採用黛青琉璃瓦與金色翼角翹脊）
          const eaveRadius = radius * 1.48;
          const eaveCone = new THREE.Mesh(
            new THREE.ConeGeometry(eaveRadius, 1.05, 8),
            mats.roofSlate,
          );
          eaveCone.position.y = currentY + storyH + 0.32;
          pagodaTower.add(eaveCone);

          for (let c = 0; c < 8; c++) {
            const ca = (c / 8) * Math.PI * 2;
            const horn = new THREE.Mesh(
              new THREE.ConeGeometry(0.14, 0.45, 4),
              mats.goldTrim,
            );
            horn.position.set(
              Math.cos(ca) * (eaveRadius * 0.94),
              currentY + storyH + 0.05,
              Math.sin(ca) * (eaveRadius * 0.94),
            );
            horn.rotation.z = -Math.cos(ca) * 0.45;
            horn.rotation.x = Math.sin(ca) * 0.45;
            pagodaTower.add(horn);

            // 飛簷八角懸掛夜間發光紅金宮燈
            const eaveLantern = new THREE.Mesh(
              new THREE.SphereGeometry(0.20, 8, 8),
              mats.pagodaLanternGlow,
            );
            eaveLantern.scale.set(1, 1.32, 1);
            eaveLantern.position.set(
              Math.cos(ca) * (eaveRadius * 0.88),
              currentY + storyH - 0.24,
              Math.sin(ca) * (eaveRadius * 0.88),
            );
            pagodaTower.add(eaveLantern);
          }

          currentY += storyH + 0.42;
        }

        // 頂層八角攢尖大屋頂
        const topRoof = new THREE.Mesh(
          new THREE.ConeGeometry(2.35, 1.65, 8),
          mats.roofSlate,
        );
        topRoof.position.y = currentY + 0.65;
        pagodaTower.add(topRoof);

        // 璀璨鎏金塔剎（覆缽、相輪、寶蓋與高聳金針剎頂，夜晚散發金色光芒）
        const spireBaseY = currentY + 1.45;
        const spireLotus = new THREE.Mesh(
          new THREE.SphereGeometry(0.46, 12, 10),
          mats.pagodaSpireGlow,
        );
        spireLotus.scale.set(1, 0.7, 1);
        spireLotus.position.y = spireBaseY;
        pagodaTower.add(spireLotus);

        const spireColumn = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.28, 2.45, 12),
          mats.pagodaSpireGlow,
        );
        spireColumn.position.y = spireBaseY + 1.25;
        pagodaTower.add(spireColumn);

        for (let r = 0; r < 6; r++) {
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.32 - r * 0.03, 0.045, 8, 16),
            mats.pagodaSpireGlow,
          );
          ring.rotation.x = Math.PI / 2;
          ring.position.y = spireBaseY + 0.42 + r * 0.32;
          pagodaTower.add(ring);
        }

        const spireTip = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, 1.35, 8),
          mats.pagodaSpireGlow,
        );
        spireTip.position.y = spireBaseY + 2.85;
        pagodaTower.add(spireTip);

        // 塔樓專屬夜間暖金光暈與點光源（夜晚照亮整座古塔與山巔）
        const pagHaloMat = new THREE.MeshBasicMaterial({
          color: 0xffcf56,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
        const pagHaloMesh = new THREE.Mesh(
          new THREE.SphereGeometry(6.8, 18, 18),
          pagHaloMat,
        );
        pagHaloMesh.position.y = 8.2;
        pagHaloMesh.visible = false;
        pagodaTower.add(pagHaloMesh);
        pagodaNightHaloMats.push(pagHaloMat);
        pagodaNightHaloMeshes.push(pagHaloMesh);

        const pagLight = new THREE.PointLight(0xffb833, 0, 38, 1.35);
        pagLight.position.set(0, 9.5, 0);
        pagodaTower.add(pagLight);
        pagodaNightLights.push(pagLight);

        // 透明擴大點擊感應框，方便點擊遠山古塔樓觸發隨機詩文彩蛋
        const pagodaTowerHitBox = new THREE.Mesh(
          new THREE.CylinderGeometry(5.5, 6.2, 18.5, 8),
          new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false,
          }),
        );
        pagodaTowerHitBox.position.y = 9.2;
        pagodaTower.add(pagodaTowerHitBox);

        pagodaTower.userData = {
          easterEggPoems: pagodaTowerPoems,
          easterEggPoem: pagodaTowerPoems[0],
          easterEggKind: 'pagoda-tower',
        };

        pagodaTower.scale.setScalar(scale);
        enableShadows(pagodaTower);
        return pagodaTower;
      };

      // 山上塔樓一個就好：移至痛點島 [-32, -24] 與創意島 [-32, 24] 之間後方的西山平頂山台 [-66.4, 15.1, 0]，穩立於平坦山坪上，晚上會亮
      const singleMountainPagoda = createMountainPagodaTower(1.16);
      singleMountainPagoda.position.set(-66.4, 15.1, 0);
      singleMountainPagoda.rotation.y = Math.PI / 2;
      worldGroup.add(singleMountainPagoda);
      clickableIslands.push(singleMountainPagoda);

      // 4. 南岸水鄉白牆黛瓦臨水民居（窗戶改用 homesteadWindowGlow，晚上九點以後全部民房暗下來）
      [
        [-14.5, 0.86, 42.2, 0.18],
        [13.5, 0.86, 42.4, -0.22],
      ].forEach(([hx, hy, hz, hRot], idx) => {
        const house = new THREE.Group();
        house.position.set(hx, hy, hz);
        house.rotation.y = hRot;
        house.userData = {
          easterEggPoem: '「土地平曠，屋舍儼然，有良田、美池、桑竹之屬。」',
          easterEggKind: 'farmland',
        };

        const hBase = new THREE.Mesh(
          new THREE.BoxGeometry(4.2, 0.36, 3.2),
          mats.stonePlaza,
        );
        hBase.position.y = 0.18;
        house.add(hBase);

        const hBody = new THREE.Mesh(
          new THREE.BoxGeometry(3.8, 2.1, 2.8),
          mats.wallCream,
        );
        hBody.position.y = 1.22;
        house.add(hBody);

        const hMatou = createMatouGablePair(3.8, 2.1, 2.8);
        hMatou.position.y = 0.18;
        house.add(hMatou);

        const hWin = new THREE.Mesh(
          new THREE.BoxGeometry(2.2, 1.15, 2.9),
          mats.homesteadWindowGlow,
        );
        hWin.position.y = 1.18;
        house.add(hWin);

        const hRoof = createChineseRoof(
          4.5,
          3.5,
          1.15,
          idx === 0 ? mats.roofSlate : mats.roofJade,
        );
        hRoof.position.y = 2.28;
        house.add(hRoof);

        enableShadows(house);
        worldGroup.add(house);
        clickableIslands.push(house);
      });
    };

    createNorthWestWaterfallsAndSouthernBridges();

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
      pGroup.userData = {
        easterEggPoem: '「土地平曠，屋舍儼然，有良田、美池、桑竹之屬。」',
        easterEggKind: 'farmland',
      };

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
      clickableIslands.push(pGroup);
    };

    // 精準配置於各座大型有機農田陸地上的水稻梯田（東岸與西岸皆隨陸地外推，保持中央水道寬敞）
    createPaddyCluster(-41.5, 0.89, 0.0, 12.5, 6.8, 3, 0.0);      // 西岸中央農田梯田
    createPaddyCluster(-46.5, 0.89, -13.5, 12.5, 6.2, 3, 0.08);   // 西岸紅圈區（痛點島與西農田之間）水稻梯田
    createPaddyCluster(-46.5, 0.89, 13.5, 12.5, 6.2, 3, -0.08);   // 西岸紅圈區（創意島與西農田之間）水稻梯田
    createPaddyCluster(41.2, 0.89, -4.2, 10.8, 6.2, 3, -0.04);    // 東岸中央農田梯田（隨陸地往東外推）
    createPaddyCluster(46.5, 0.87, -14.5, 10.5, 5.6, 2, 0.05);    // 東岸綠標連綿陸地梯田
    createPaddyCluster(-24.5, 0.86, -44.5, 12.5, 5.4, 2, 0.05);   // 西北農田島梯田
    createPaddyCluster(24.5, 0.86, -44.5, 12.5, 5.4, 2, -0.05);   // 東北農田島梯田
    createPaddyCluster(-24.0, 0.86, 44.5, 12.5, 5.4, 2, -0.05);   // 西南農田島梯田
    createPaddyCluster(24.0, 0.86, 44.5, 12.5, 5.4, 2, 0.05);    // 東南農田島梯田

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

    createWaterWheelMesh(-12.0, -0.35, -44.0, 0);          // 北水道西岸農田水車
    createWaterWheelMesh(-30.5, -0.35, 0.0, Math.PI / 2);   // 西岸中央農田島水車（隨西岸外推）
    createWaterWheelMesh(35.5, -0.35, 1.8, 0);              // 東岸瀑布河道北岸水車（正臨藍色河道提水）

    // D. 沿著各島小水道與南北洞口水道兩岸種植的「盛開桃花樹」（全數穩立於各有機陸地草坪上，絕不懸浮水面）
    // 1. 西岸連綿田園與東岸河道駁岸桃樹
    [-50, -45, -40, -35].forEach((x) => {
      [-5.2, 5.2].forEach((z) => {
        const t = createSakuraTree(1.12);
        t.position.set(x, 0.89, z);
        worldGroup.add(t);
      });
    });
    [35, 40, 45, 50].forEach((x) => {
      [-9.2, 1.2].forEach((z) => {
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

    // 3. 東西外岸山麓田園桃林（立於山麓有機陸地上）
    [-28, -20, -8, 8, 20, 28].forEach((z) => {
      const wTree = createSakuraTree(1.15);
      wTree.position.set(-53.5, 0.87, z);
      worldGroup.add(wTree);
    });
    [-28, -20, -10, 26, 32].forEach((z) => {
      const eTree = createSakuraTree(1.15);
      eTree.position.set(52.5, 0.86, z);
      worldGroup.add(eTree);
    });

    // E. 島以外的空地：蜿蜒鄉間青石板道路與白牆黛瓦江南民房聚落（晚上村民會回家，晚上九點以後全部民房暗下來）
    const createOuterRoadSegment = (
      x1: number,
      z1: number,
      x2: number,
      z2: number,
      y = 0.88,
      width = 1.45,
    ) => {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.hypot(dx, dz);
      if (len < 0.1) return;
      const roadGrp = new THREE.Group();
      roadGrp.position.set((x1 + x2) * 0.5, y, (z1 + z2) * 0.5);
      roadGrp.rotation.y = Math.atan2(dx, dz);

      const dirtBase = new THREE.Mesh(
        new THREE.BoxGeometry(width, 0.05, len + 0.35),
        mats.dirtPathMat,
      );
      roadGrp.add(dirtBase);

      const stoneSlab = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.72, 0.07, len + 0.2),
        mats.stoneStep,
      );
      stoneSlab.position.y = 0.015;
      roadGrp.add(stoneSlab);

      worldGroup.add(roadGrp);
    };

    // 鋪設外圍空地連接各處民房與農田的鄉間道路網
    const outerRoadSegments: Array<[number, number, number, number, number]> = [
      // 西北空地村道
      [-37.5, -45.5, -26.5, -45.5, 0.87],
      [-32.5, -45.5, -32.5, -37.5, 0.87],
      [-48.5, -35.5, -38.5, -35.5, 0.87],
      // 東北空地村道
      [26.5, -45.5, 38.5, -45.5, 0.87],
      [33.5, -45.5, 33.5, -37.5, 0.87],
      [38.5, -35.5, 48.5, -35.5, 0.87],
      // 西岸外圍空地南北縱貫村道
      [-51.2, -24.5, -51.2, 24.5, 0.89],
      [-51.2, -16.5, -44.5, -16.5, 0.89],
      [-51.2, 0.0, -43.5, 0.0, 0.89],
      [-51.2, 16.5, -44.5, 16.5, 0.89],
      // 東岸外圍空地村道
      [48.5, -24.5, 48.5, -6.5, 0.89],
      [43.5, -13.5, 51.5, -13.5, 0.89],
      [45.5, 26.5, 51.5, 32.5, 0.87],
      // 西南與東南空地村道
      [-48.5, 35.5, -35.5, 35.5, 0.87],
      [-35.5, 44.5, -20.5, 44.5, 0.87],
      [20.5, 44.5, 36.5, 44.5, 0.87],
      [36.5, 35.5, 48.5, 35.5, 0.87],
    ];
    outerRoadSegments.forEach(([x1, z1, x2, z2, ry]) => {
      createOuterRoadSegment(x1, z1, x2, z2, ry);
    });

    const createJiangnanHomestead = (x: number, y: number, z: number, rotY = 0, scale = 1.0) => {
      const cottage = new THREE.Group();
      cottage.position.set(x, y, z);
      cottage.rotation.y = rotY;
      cottage.userData = {
        easterEggPoem: '「土地平曠，屋舍儼然，有良田、美池、桑竹之屬。」',
        easterEggKind: 'farmland',
      };

      const stoneFoundation = new THREE.Mesh(
        new THREE.BoxGeometry(4.6, 0.28, 3.4),
        mats.stonePlaza,
      );
      stoneFoundation.position.y = 0.14;
      cottage.add(stoneFoundation);

      const houseWall = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.5, 3.2), mats.wallCream);
      houseWall.position.y = 1.35;
      cottage.add(houseWall);

      // 前後與左右發光暖窗（採用 homesteadWindowGlow，晚上九點以後全部民房暗下來）
      const frontWinLeft = new THREE.Mesh(
        new THREE.BoxGeometry(0.92, 0.88, 0.12),
        mats.homesteadWindowGlow,
      );
      frontWinLeft.position.set(-1.15, 1.42, 1.58);
      cottage.add(frontWinLeft);

      const frontWinRight = new THREE.Mesh(
        new THREE.BoxGeometry(0.92, 0.88, 0.12),
        mats.homesteadWindowGlow,
      );
      frontWinRight.position.set(1.15, 1.42, 1.58);
      cottage.add(frontWinRight);

      const sideWin = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.88, 1.35),
        mats.homesteadWindowGlow,
      );
      sideWin.position.set(2.18, 1.42, 0);
      cottage.add(sideWin);

      const backWin = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.85, 0.12),
        mats.homesteadWindowGlow,
      );
      backWin.position.set(0, 1.42, -1.58);
      cottage.add(backWin);

      // 木門與門前小石階、屋簷門燈（homesteadLanternGlow，九點後隨民房一同熄燈）
      const woodDoor = new THREE.Mesh(
        new THREE.BoxGeometry(0.82, 1.55, 0.12),
        mats.woodDark,
      );
      woodDoor.position.set(0, 0.92, 1.58);
      cottage.add(woodDoor);

      const doorLantern = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 8, 8),
        mats.homesteadLanternGlow,
      );
      doorLantern.scale.set(1, 1.25, 1);
      doorLantern.position.set(0.62, 2.12, 1.75);
      cottage.add(doorLantern);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.35, 4), mats.roofSlate);
      roof.position.y = 3.2;
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(1.4, 1.0, 1.0);
      cottage.add(roof);

      const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.2, 0.35), mats.stoneGrey);
      chimney.position.set(1.1, 3.4, 0.5);
      cottage.add(chimney);

      const fence = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.75, 0.12), mats.bambooStrawMat);
      fence.position.set(0, 0.38, 2.4);
      cottage.add(fence);

      const logs = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.5, 6), mats.woodWarm);
      logs.rotation.z = Math.PI / 2;
      logs.position.set(-2.5, 0.22, 1.0);
      cottage.add(logs);

      cottage.scale.setScalar(scale);
      enableShadows(cottage);
      worldGroup.add(cottage);
      clickableIslands.push(cottage);
    };

    // 在五島以外的空地（西北、東北、西岸、東岸、西南、東南）沿村道配置多座江南民房
    const outerHomesteadCoords: Array<[number, number, number, number, number]> = [
      [-33.2, 0.86, -44.5, 0.25, 1.0],   // 1. 西北農田村舍
      [-46.8, 0.86, -34.2, 0.15, 0.94],  // 2. 西北山麓村舍
      [33.8, 0.86, -44.5, -0.25, 1.0],   // 3. 東北農田村舍
      [46.8, 0.86, -34.2, -0.18, 0.94],  // 4. 東北山麓村舍
      [-52.8, 0.87, -17.5, 1.48, 0.95],  // 5. 西岸北段村舍
      [-52.5, 0.87, -2.5, 1.45, 1.0],    // 6. 西岸中段村舍
      [-52.8, 0.87, 17.2, 1.65, 0.95],   // 7. 西岸南段村舍
      [50.2, 0.87, -16.8, -1.52, 0.96],  // 8. 東岸北段村舍
      [49.5, 0.86, 29.8, -0.85, 0.94],   // 9. 東南山麓村舍
      [-46.5, 0.86, 34.5, 0.35, 0.95],   // 10. 西南山麓村舍
      [-33.5, 0.86, 44.5, 0.22, 0.96],   // 11. 西南農田村舍
      [33.2, 0.86, 44.5, -0.3, 1.0],     // 12. 東南農田村舍
    ];
    outerHomesteadCoords.forEach(([hx, hy, hz, hRot, hScale]) => {
      createJiangnanHomestead(hx, hy, hz, hRot, hScale);
    });

    // F. 江南梯級茶園階地（穩立於東岸農田島東側坡地 [50.5, 0.89, -4.2]）
    const teaTerraceGroup = new THREE.Group();
    teaTerraceGroup.position.set(50.5, 0.89, -4.2);
    teaTerraceGroup.userData = {
      easterEggPoem: '「土地平曠，屋舍儼然，有良田、美池、桑竹之屬。」',
      easterEggKind: 'farmland',
    };
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
    clickableIslands.push(teaTerraceGroup);

    // G. 悠閒黃牛 / 水牛（穩立於四座農田島田埂草坪上）
    const npcVillagerPoem = '「阡陌交通，雞犬相聞。其中往來種作，男女衣著，悉如外人。黃髮垂髫，並怡然自樂。」';
    const invisibleHitMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    const createWaterOx = (oxX: number, oxY: number, oxZ: number, rotY = 0) => {
      const oxGrp = new THREE.Group();
      oxGrp.position.set(oxX, oxY, oxZ);
      oxGrp.rotation.y = rotY;
      oxGrp.userData = {
        easterEggPoem: npcVillagerPoem,
        easterEggKind: 'npc',
      };

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
      clickableIslands.push(oxGrp);
    };

    createWaterOx(33.2, 0.86, -44.5, -0.6); // 東北農田島水牛
    createWaterOx(-14.8, 0.86, -44.5, 0.8); // 西北農田島水牛
    createWaterOx(-49.5, 0.89, 1.5, 0.8);   // 西岸中央農田島黃牛
    createWaterOx(50.5, 0.89, -2.0, -0.6);  // 東岸中央農田島黃牛

    // H. 辛勤農夫 NPC（著青布藍衣、頭戴竹編斗笠，手持鋤頭於農田島上勞作，頭上無倒三角）
    const createFarmer = (fx: number, fy: number, fz: number, rotY = 0, phase = 0) => {
      const farmerGrp = new THREE.Group();
      farmerGrp.position.set(fx, fy, fz);
      farmerGrp.rotation.y = rotY;
      farmerGrp.userData = {
        easterEggPoem: npcVillagerPoem,
        easterEggKind: 'farmer',
      };

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

      // 透明擴大點擊感應框，方便點擊農夫觸發詩文彩蛋
      const farmerHitBox = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 0.85, 1.85, 8),
        invisibleHitMat,
      );
      farmerHitBox.position.y = 0.92;
      farmerGrp.add(farmerHitBox);

      farmerGrp.add(torsoGrp);
      animatedFarmers.push({ group: farmerGrp, torso: torsoGrp, phase });
      enableShadows(farmerGrp);
      worldGroup.add(farmerGrp);
      clickableIslands.push(farmerGrp);
    };

    createFarmer(16.2, 0.86, -44.2, 0.4, 0.8);   // 東北農田島農夫
    createFarmer(-16.2, 0.86, -44.2, -0.6, 1.6); // 西北農田島農夫
    createFarmer(-48.5, 0.89, -1.8, 0.9, 2.4);   // 西岸中央農田島農夫
    createFarmer(17.5, 0.86, 44.2, -1.1, 0.2);   // 東南農田島農夫
    createFarmer(48.2, 0.89, -5.5, -0.3, 1.1);   // 東岸茶園茶農

    // H2. 外圍村道散步與歸家村民 NPC（白天在村道與田間散步，傍晚沿路走回民房，晚上回家進屋休息；另有少數夜遊村民留在外面）
    interface OuterVillagerItem {
      group: THREE.Group;
      leftLeg: THREE.Mesh;
      rightLeg: THREE.Mesh;
      leftArm: THREE.Mesh;
      rightArm: THREE.Mesh;
      homePos: [number, number, number];
      strollPos: [number, number, number];
      staysOutsideAtNight: boolean;
      speed: number;
      phase: number;
    }
    const outerVillagers: OuterVillagerItem[] = [];
    const villagerConfigs: Array<{
      homePos: [number, number, number];
      strollPos: [number, number, number];
      staysOutsideAtNight: boolean;
      robeColor: number;
    }> = [
      { homePos: [-33.2, 0.88, -42.2], strollPos: [-25.5, 0.88, -45.2], staysOutsideAtNight: false, robeColor: 0x4a6b82 },
      { homePos: [-46.8, 0.88, -32.0], strollPos: [-39.0, 0.88, -35.5], staysOutsideAtNight: false, robeColor: 0x7c5846 },
      { homePos: [33.8, 0.88, -42.2], strollPos: [25.5, 0.88, -45.2], staysOutsideAtNight: false, robeColor: 0x3d7058 },
      { homePos: [46.8, 0.88, -32.0], strollPos: [39.0, 0.88, -35.5], staysOutsideAtNight: false, robeColor: 0x8a5240 },
      { homePos: [-50.5, 0.90, -17.0], strollPos: [-44.5, 0.90, -8.5], staysOutsideAtNight: false, robeColor: 0x5c6478 },
      { homePos: [-50.5, 0.90, -2.5], strollPos: [-43.5, 0.90, 5.5], staysOutsideAtNight: false, robeColor: 0x6b4e71 },
      { homePos: [-50.5, 0.90, 17.0], strollPos: [-44.2, 0.90, 24.5], staysOutsideAtNight: false, robeColor: 0x3b6278 },
      { homePos: [48.2, 0.90, -16.5], strollPos: [43.8, 0.90, -7.5], staysOutsideAtNight: false, robeColor: 0x4f7556 },
      { homePos: [-33.5, 0.88, 42.2], strollPos: [-21.5, 0.88, 44.2], staysOutsideAtNight: true, robeColor: 0x46698a },
      { homePos: [33.2, 0.88, 42.2], strollPos: [21.5, 0.88, 44.2], staysOutsideAtNight: true, robeColor: 0x7a5980 },
    ];

    villagerConfigs.forEach((cfg, vIdx) => {
      const vGrp = new THREE.Group();
      vGrp.position.set(...cfg.strollPos);
      vGrp.userData = {
        easterEggPoem: npcVillagerPoem,
        easterEggKind: 'npc',
        isOutside: true,
      };

      const vRobeMat = new THREE.MeshStandardMaterial({
        color: cfg.robeColor,
        roughness: 0.78,
      });
      const vSkinMat = new THREE.MeshStandardMaterial({
        color: 0xffe2c4,
        roughness: 0.65,
      });

      const leftLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.05, 0.34, 6),
        mats.woodDark,
      );
      leftLeg.position.set(-0.08, 0.17, 0);
      vGrp.add(leftLeg);

      const rightLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.05, 0.34, 6),
        mats.woodDark,
      );
      rightLeg.position.set(0.08, 0.17, 0);
      vGrp.add(rightLeg);

      const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.22, 0.56, 8),
        vRobeMat,
      );
      torso.position.set(0, 0.56, 0);
      vGrp.add(torso);

      const leftArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.048, 0.042, 0.38, 6),
        vRobeMat,
      );
      leftArm.position.set(-0.2, 0.62, 0);
      vGrp.add(leftArm);

      const rightArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.048, 0.042, 0.38, 6),
        vRobeMat,
      );
      rightArm.position.set(0.2, 0.62, 0);
      vGrp.add(rightArm);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.145, 10, 10),
        vSkinMat,
      );
      head.position.set(0, 0.99, 0);
      vGrp.add(head);

      const hairBun = new THREE.Mesh(
        new THREE.SphereGeometry(0.075, 8, 8),
        mats.woodDark,
      );
      hairBun.position.set(0, 1.15, -0.03);
      vGrp.add(hairBun);

      const vHitBox = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.65, 1.65, 8),
        invisibleHitMat,
      );
      vHitBox.position.y = 0.82;
      vGrp.add(vHitBox);

      enableShadows(vGrp);
      worldGroup.add(vGrp);
      clickableIslands.push(vGrp);
      outerVillagers.push({
        group: vGrp,
        leftLeg,
        rightLeg,
        leftArm,
        rightArm,
        homePos: cfg.homePos,
        strollPos: cfg.strollPos,
        staysOutsideAtNight: cfg.staysOutsideAtNight,
        speed: 0.42 + (vIdx % 4) * 0.06,
        phase: vIdx * 1.15,
      });
    });

    // I. 白鷺鷥群（全數站在農田島水田內 y=1.02 或岸邊淺水 y=-0.58，絕不懸空漂浮）
    [
      { pos: [-22.0, 1.02, -44.5], ang: 0.6 },
      { pos: [22.0, 1.02, -44.5], ang: -0.8 },
      { pos: [-40.0, 1.05, 0.5], ang: 1.2 },
      { pos: [40.0, 1.05, -4.5], ang: -1.6 },
      { pos: [-22.0, 1.02, 44.5], ang: 0.4 },
      { pos: [22.0, 1.02, 44.5], ang: -0.9 },
      { pos: [-9.2, -0.58, -46.5], ang: 0.3 },
      { pos: [9.2, -0.58, -46.5], ang: -0.3 },
    ].forEach((egCfg, egIdx) => {
      const egretGrp = new THREE.Group();
      egretGrp.position.set(egCfg.pos[0], egCfg.pos[1], egCfg.pos[2]);
      egretGrp.rotation.y = egCfg.ang;
      egretGrp.userData = {
        easterEggPoem: npcVillagerPoem,
        easterEggKind: 'npc',
      };

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
      clickableIslands.push(egretGrp);
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
      sheep.userData = {
        easterEggPoem: npcVillagerPoem,
        easterEggKind: 'npc',
      };

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
      clickableIslands.push(sheep);
    });

    // K. 2 隻農舍旁憨厚小粉豬（穩立於西北與東南農田島農舍旁）
    [
      [-29.8, 0.86, -43.8, 0.9],
      [29.8, 0.86, 43.8, -0.8],
    ].forEach(([px, py, pz, prot]) => {
      const pigGrp = new THREE.Group();
      pigGrp.position.set(px, py, pz);
      pigGrp.rotation.y = prot;
      pigGrp.userData = {
        easterEggPoem: npcVillagerPoem,
        easterEggKind: 'npc',
      };

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
      clickableIslands.push(pigGrp);
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
      chickenGrp.userData = {
        easterEggPoem: npcVillagerPoem,
        easterEggKind: 'npc',
      };

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

      const chickenHitBox = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 8, 8),
        invisibleHitMat,
      );
      chickenHitBox.position.y = 0.28;
      chickenGrp.add(chickenHitBox);

      chickenGrp.add(cHeadGrp);
      animatedChickens.push({ head: cHeadGrp, phase: cIdx * 1.3 });
      worldGroup.add(chickenGrp);
      clickableIslands.push(chickenGrp);
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
        mistBank.userData = {
          easterEggPoem: mountainMistPoem,
          easterEggKind: 'mountain-mist',
        };

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
        clickableIslands.push(mistBank);
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
      boat.userData = {
        easterEggPoem: '「見漁人，乃大驚，問所從來。」',
        easterEggKind: 'boat',
      };

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

      // 2A. 白天「烏篷漁船」竹編拱棚與船頭竹魚簍（白天顯示，夜晚隱藏）
      const dayFishingDecor = new THREE.Group();
      const canopyLen = hullLength * 0.52;
      const canopyRadius = hullWidth * 0.48;
      const canopy = new THREE.Mesh(
        new THREE.CylinderGeometry(canopyRadius, canopyRadius, canopyLen, 14, 1, false, 0, Math.PI),
        wupengCanopyMat,
      );
      canopy.rotation.z = Math.PI / 2;
      canopy.rotation.y = Math.PI / 2;
      canopy.position.set(0, 0.24, 0.05);
      dayFishingDecor.add(canopy);

      // 竹篾拱骨橫紋（3 道細緻竹編箍環）
      [-canopyLen * 0.46, 0, canopyLen * 0.46].forEach((cz) => {
        const rib = new THREE.Mesh(
          new THREE.TorusGeometry(canopyRadius * 1.015, 0.032, 8, 20, Math.PI),
          bambooRibMat,
        );
        rib.position.set(0, 0.24, 0.05 + cz);
        dayFishingDecor.add(rib);
      });

      // 船頭竹編魚簍與漁網卷
      const fishBasket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.19, 0.28, 8),
        bambooRibMat,
      );
      fishBasket.position.set(-0.18, 0.42, hullLength * 0.28);
      dayFishingDecor.add(fishBasket);
      boat.add(dayFishingDecor);

      // 2B. 夜晚「江南雅致遊船（畫舫小舟）」雕花亭棚、四角宮燈與「擁毳衣爐火」賞景雅士（夜晚顯示，白天隱藏）
      const nightPleasureDecor = new THREE.Group();
      nightPleasureDecor.visible = false;

      // 四根朱紅雕花廊柱與飛簷四角遊船頂蓋
      const pillarOffsetX = hullWidth * 0.38;
      const pillarOffsetZ = canopyLen * 0.44;
      [
        [-pillarOffsetX, -pillarOffsetZ],
        [pillarOffsetX, -pillarOffsetZ],
        [-pillarOffsetX, pillarOffsetZ],
        [pillarOffsetX, pillarOffsetZ],
      ].forEach(([px, pz]) => {
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.035, 0.04, 0.72, 6),
          mats.vermilion,
        );
        pillar.position.set(px, 0.62, 0.05 + pz);
        nightPleasureDecor.add(pillar);

        // 四角懸掛暖光小宮燈
        const cornerLantern = new THREE.Mesh(
          new THREE.SphereGeometry(0.095, 8, 8),
          mats.lanternGlow,
        );
        cornerLantern.scale.set(1, 1.3, 1);
        cornerLantern.position.set(px * 1.18, 0.88, 0.05 + pz * 1.12);
        nightPleasureDecor.add(cornerLantern);
      });

      // 遊船飛簷攢尖亭頂與鎏金寶頂
      const pleasureRoof = createChineseRoof(
        hullWidth * 1.18,
        canopyLen * 1.22,
        0.48,
        mats.roofSlate,
      );
      pleasureRoof.position.set(0, 0.98, 0.05);
      nightPleasureDecor.add(pleasureRoof);

      const pleasureGoldTrim = new THREE.Mesh(
        new THREE.BoxGeometry(hullWidth * 0.96, 0.06, canopyLen * 1.02),
        mats.goldTrim,
      );
      pleasureGoldTrim.position.set(0, 0.96, 0.05);
      nightPleasureDecor.add(pleasureGoldTrim);

      // 船艙中央「擁毳衣爐火」：暖紅炭火小銅爐 + 身披雪白毳衣賞景的雅士
      const stoveBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.14, 0.18, 10),
        mats.woodDark,
      );
      stoveBase.position.set(0, 0.39, 0.22);
      nightPleasureDecor.add(stoveBase);

      const stoveFireGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 10, 10),
        mats.lanternGlow,
      );
      stoveFireGlow.position.set(0, 0.5, 0.22);
      nightPleasureDecor.add(stoveFireGlow);

      // 身披白狐毳衣獨坐船中賞景的遊客雅士
      const scholarCloak = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.22, 0.44, 10),
        mats.wallCream,
      );
      scholarCloak.position.set(0, 0.5, -0.12);
      nightPleasureDecor.add(scholarCloak);

      const scholarHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.095, 8, 8),
        mats.wallCream,
      );
      scholarHead.position.set(0, 0.78, -0.12);
      nightPleasureDecor.add(scholarHead);

      boat.add(nightPleasureDecor);

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
      clickableIslands.push(boat);
      return { boat, oarPivot, wakeGroup, dayFishingDecor, nightPleasureDecor };
    };

    // 江南烏篷漁船（白天）／遊船畫舫（夜晚）沿著群島水道航行的閉環航線
    const riverBoats: Array<{
      mesh: THREE.Group;
      oarPivot: THREE.Group;
      wakeGroup: THREE.Group;
      dayFishingDecor: THREE.Group;
      nightPleasureDecor: THREE.Group;
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
      // 航線 1 & 2：環繞主島與北擴街廓半島的寬闊中央水道（穿過四座拱橋下方，順時針兩艘對開）
      {
        isHuafang: false,
        speed: 0.020,
        phaseOffset: 0.0,
        getPoint: (u) => {
          const a = u * Math.PI * 2;
          const rz = Math.sin(a) < 0 ? 27.2 : 20.5;
          return [Math.cos(a) * 21.5, Math.sin(a) * rz];
        },
      },
      {
        isHuafang: true,
        speed: 0.018,
        phaseOffset: 0.5,
        getPoint: (u) => {
          const a = u * Math.PI * 2;
          const rz = Math.sin(a) < 0 ? 28.4 : 21.6;
          return [Math.cos(a) * 22.8, Math.sin(a) * rz];
        },
      },
      // 航線 3：北水道觀瀑舟（沿北水道駛向北山飛流直下大瀑布深潭前 [0, -44.0] 賞瀑，再悠然划回）
      {
        isHuafang: false,
        speed: 0.0095,
        phaseOffset: 0.0,
        getPoint: (u: number): [number, number] => {
          if (u < 0.40) {
            const p = u / 0.40;
            const z = -28 - p * 16.0; // -28 -> -44.0 駛近北山大瀑布深潭前
            const x = Math.sin(p * Math.PI) * 0.8;
            return [x, z];
          } else if (u < 0.55) {
            const p = (u - 0.40) / 0.15;
            const angle = p * Math.PI;
            const z = -44.0 - Math.sin(angle) * 1.8;
            const x = Math.sin(angle) * 1.6;
            return [x, z];
          } else if (u < 0.85) {
            const p = (u - 0.55) / 0.30;
            const z = -44.0 + p * 16.0; // 悠然返航
            const x = -Math.sin(p * Math.PI) * 0.8;
            return [x, z];
          } else {
            const p = (u - 0.85) / 0.15;
            const angle = p * Math.PI * 2;
            const z = -28 + Math.sin(angle) * 1.8;
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
      const { boat, oarPivot, wakeGroup, dayFishingDecor, nightPleasureDecor } =
        createJiangnanBoat(route.isHuafang);
      const [ix, iz] = route.getPoint(route.phaseOffset);
      boat.position.set(ix, -0.28, iz);
      worldGroup.add(boat);
      riverBoats.push({
        mesh: boat,
        oarPivot,
        wakeGroup,
        dayFishingDecor,
        nightPleasureDecor,
        baseY: -0.28,
        phase: route.phaseOffset,
        speed: route.speed + (idx % 2) * 0.001,
        getPoint: route.getPoint,
      });
    });

    // Perimeter Clouds (推至遠山高空，不遮擋群島與北山飛瀑、西山塔樓)
    const cloudClusters: Array<{ group: THREE.Group; baseX: number; phase: number }> = [];
    const cloudCoords: Array<[number, number, number, number]> = [
      [-68, 8.5, -48, 1.6],
      [68, 8.8, -48, 1.6],
      [-72, 6.5, 38, 1.5],
      [72, 6.5, 38, 1.5],
      [-44, 5.5, 54, 1.4],
      [44, 5.5, 54, 1.4],
    ];
    cloudCoords.forEach(([cx, cy, cz, sc], idx) => {
      const cGrp = new THREE.Group();
      cGrp.position.set(cx, cy, cz);
      cGrp.userData = {
        easterEggPoem: mountainMistPoem,
        easterEggKind: 'mountain-mist',
      };
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
      clickableIslands.push(cGrp);
      cloudClusters.push({ group: cGrp, baseX: cx, phase: idx * 1.1 });
    });

    // Low Valley Mist Clouds for Morning (清晨・霧濛濛) — 移至遠山山谷外緣，不遮擋島嶼水道、北山瀑布與西山塔樓
    const valleyMists: Array<{ group: THREE.Group; baseX: number; phase: number }> = [];
    const mistCoords: Array<[number, number, number, number]> = [
      [-56, 4.2, -38, 1.5],
      [56, 4.2, -38, 1.5],
      [-58, 3.8, 36, 1.45],
      [58, 3.8, 36, 1.45],
      [64, 5.5, 0, 1.6],
      [-36, 3.5, 48, 1.5],
      [36, 3.5, 48, 1.5],
    ];
    mistCoords.forEach(([mx, my, mz, sc], idx) => {
      const mGrp = new THREE.Group();
      mGrp.position.set(mx, my, mz);
      mGrp.userData = {
        easterEggPoem: mountainMistPoem,
        easterEggKind: 'mountain-mist',
      };
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
      clickableIslands.push(mGrp);
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
        center: [0, homeY + 0.15, -13.2],
        outsideRadius: [1.8, 3.2],
        insideRadius: [0.45, 1.4],
        frontAngle: 0,
        frontSpread: Math.PI * 1.4,
      },
      'pain-innovation-tower': {
        center: [-32.0, painY + 0.25, -24.2],
        outsideRadius: [3.2, 4.8],
        insideRadius: [0.55, 1.45],
        frontAngle: 0.2,
        frontSpread: Math.PI * 0.95,
      },
      'discussion-library': {
        center: [26.3, discY + 0.25, -31.3],
        outsideRadius: [2.4, 3.6],
        insideRadius: [0.5, 1.25],
        frontAngle: 0.15,
        frontSpread: Math.PI * 0.9,
      },
      'discussion-workshop': {
        center: [41.7, discY + 0.2, -29.1],
        outsideRadius: [2.0, 3.2],
        insideRadius: [0.45, 1.2],
        frontAngle: -0.25,
        frontSpread: Math.PI * 0.95,
      },
      'discussion-street': {
        center: [31.7, discY + 0.15, -16.9],
        outsideRadius: [2.2, 3.8],
        insideRadius: [0.5, 1.4],
        frontAngle: 0,
        frontSpread: Math.PI * 1.3,
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

      // 透明點擊感應框，方便點擊往來村民小人觸發《桃花源記》彩蛋
      const walkerHitBox = new THREE.Mesh(
        new THREE.CylinderGeometry(0.48, 0.48, 1.55, 8),
        invisibleHitMat,
      );
      walkerHitBox.position.y = 0.78;
      root.add(walkerHitBox);

      root.userData = {
        easterEggPoem: npcVillagerPoem,
        easterEggKind: 'npc',
      };
      root.scale.setScalar(1.08);
      root.visible = false;
      enableShadows(root);
      worldGroup.add(root);
      clickableIslands.push(root);

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
    // 8.6 創點源原創角色立體動態系統（搜搜、白喵、多慧）
    // =========================================================
    // (A) 搜搜 (Sousou)：駕著筋斗雲在天上騰雲駕霧
    const sousouCloudGroup = new THREE.Group();
    sousouCloudGroup.position.set(0, 15.5, 0);
    sousouCloudGroup.scale.setScalar(1.42);
    sousouCloudGroup.userData = {
      islandId: 'career',
      districtId: 'career-temple-district',
      easterEggPoem: npcVillagerPoem,
      easterEggKind: 'npc',
    };

    const somersaultCloudWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xe0f2fe,
      emissiveIntensity: 0.25,
      roughness: 0.55,
    });
    const somersaultSwirlBlueMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x2563eb,
      emissiveIntensity: 0.3,
      roughness: 0.4,
    });
    const sousouNavyMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.5 });
    const sousouWhiteFurMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55 });
    const sousouFaceSkinMat = new THREE.MeshStandardMaterial({ color: 0xfde2c8, roughness: 0.6 });
    const sousouGoldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.25,
      roughness: 0.3,
      metalness: 0.65,
    });

    // 1. 筋斗雲朵底座與藍色祥雲捲紋
    const cloudBaseGroup = new THREE.Group();
    const cloudPuffCoords: Array<[number, number, number, number]> = [
      [0, 0, 0, 0.58],
      [-0.46, -0.04, 0.12, 0.46],
      [0.46, -0.04, 0.12, 0.46],
      [0, -0.05, 0.42, 0.44],
      [0, -0.04, -0.44, 0.48],
      [-0.36, -0.06, -0.32, 0.40],
      [0.36, -0.06, -0.32, 0.40],
    ];
    cloudPuffCoords.forEach(([cx, cy, cz, cr]) => {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(cr, 12, 12), somersaultCloudWhiteMat);
      puff.scale.set(1.15, 0.72, 1.15);
      puff.position.set(cx, cy, cz);
      cloudBaseGroup.add(puff);
    });

    // 筋斗雲側邊藍色祥雲渦紋
    [-0.56, 0.56].forEach((sx) => {
      const swirl = new THREE.Mesh(
        new THREE.TorusGeometry(0.18, 0.038, 8, 18, Math.PI * 1.45),
        somersaultSwirlBlueMat,
      );
      swirl.position.set(sx, 0.02, 0.15);
      swirl.rotation.y = Math.PI / 2;
      cloudBaseGroup.add(swirl);
    });
    sousouCloudGroup.add(cloudBaseGroup);

    // 筋斗雲後方拖曳雲尾（4團動態翻湧雲煙）
    const sousouTrailPuffs: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const tPuff = new THREE.Mesh(
        new THREE.SphereGeometry(0.36 - i * 0.055, 10, 10),
        somersaultCloudWhiteMat,
      );
      tPuff.position.set(0, -0.05, -0.82 - i * 0.48);
      sousouCloudGroup.add(tPuff);
      sousouTrailPuffs.push(tPuff);
    }

    // 2. 搜搜本體（白猴少俠 + 藍頭箍 + 白藍刺蝟頭 + 背後金箍探測棒）
    const sousouBodyGroup = new THREE.Group();
    sousouBodyGroup.position.set(0, 0.26, 0.05);
    sousouCloudGroup.add(sousouBodyGroup);

    // 白色戰袍軀幹與深藍護肩、腰帶
    const ssTorso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.30, 0.62, 10),
      sousouWhiteFurMat,
    );
    ssTorso.position.y = 0.38;
    sousouBodyGroup.add(ssTorso);

    const ssCollar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.32), sousouNavyMat);
    ssCollar.position.set(0, 0.52, 0.08);
    sousouBodyGroup.add(ssCollar);

    const ssBelt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.27, 0.28, 0.12, 12),
      sousouNavyMat,
    );
    ssBelt.position.y = 0.30;
    sousouBodyGroup.add(ssBelt);

    const ssBuckle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 8, 16), sousouGoldMat);
    ssBuckle.position.set(0, 0.30, 0.27);
    sousouBodyGroup.add(ssBuckle);

    [-0.26, 0.26].forEach((shX) => {
      const pad = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), sousouNavyMat);
      pad.scale.set(1.1, 0.85, 1.0);
      pad.position.set(shX, 0.64, 0);
      sousouBodyGroup.add(pad);
    });

    // 背後斜背金箍探測杖
    const ssStaff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.042, 1.35, 8),
      sousouGoldMat,
    );
    ssStaff.position.set(0.04, 0.56, -0.24);
    ssStaff.rotation.z = -0.68;
    sousouBodyGroup.add(ssStaff);

    // 搜搜白猴頭部與藍色頭箍、刺蝟白髮
    const ssHead = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 14), sousouWhiteFurMat);
    ssHead.scale.set(1.08, 0.98, 1.0);
    ssHead.position.set(0, 0.98, 0.04);
    sousouBodyGroup.add(ssHead);

    const ssFaceMask = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12), sousouFaceSkinMat);
    ssFaceMask.scale.set(1.08, 0.9, 0.55);
    ssFaceMask.position.set(0, 0.95, 0.22);
    sousouBodyGroup.add(ssFaceMask);

    // 寶藍色大眼睛
    [-0.11, 0.11].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), somersaultSwirlBlueMat);
      eye.position.set(ex, 0.98, 0.34);
      sousouBodyGroup.add(eye);
    });

    // 左右招風猴耳
    [-0.36, 0.36].forEach((earX) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), sousouFaceSkinMat);
      ear.scale.set(0.55, 1.15, 0.85);
      ear.position.set(earX, 0.96, 0.02);
      sousouBodyGroup.add(ear);
    });

    // 藍色頭箍
    const ssHeadband = new THREE.Mesh(
      new THREE.TorusGeometry(0.33, 0.048, 10, 24),
      somersaultSwirlBlueMat,
    );
    ssHeadband.rotation.x = Math.PI / 2 - 0.12;
    ssHeadband.position.set(0, 1.12, 0.04);
    sousouBodyGroup.add(ssHeadband);

    // 頭頂白藍刺蝟髮束
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.26, 6),
        i % 2 === 0 ? sousouWhiteFurMat : somersaultSwirlBlueMat,
      );
      spike.position.set(Math.cos(a) * 0.14, 1.32, Math.sin(a) * 0.12 + 0.02);
      spike.rotation.z = -Math.cos(a) * 0.28;
      spike.rotation.x = Math.sin(a) * 0.28;
      sousouBodyGroup.add(spike);
    }

    // 雙手（右手舉至額前瞭望雲海、左手扶腰）
    const sousouLeftArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.055, 0.38, 8),
      sousouWhiteFurMat,
    );
    sousouLeftArm.position.set(-0.28, 0.48, 0.08);
    sousouLeftArm.rotation.z = 0.45;
    sousouBodyGroup.add(sousouLeftArm);

    const sousouRightArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.055, 0.42, 8),
      sousouWhiteFurMat,
    );
    sousouRightArm.position.set(0.28, 0.72, 0.22);
    sousouRightArm.rotation.z = -0.95;
    sousouRightArm.rotation.x = -0.65;
    sousouBodyGroup.add(sousouRightArm);

    enableShadows(sousouCloudGroup);
    worldGroup.add(sousouCloudGroup);
    clickableIslands.push(sousouCloudGroup);

    // (B) 白喵 (BaiMiao)：慵懶的在各座島和橋間閒晃，有時會躺下來打滾或睡覺
    const baiMiaoRoot = new THREE.Group();
    baiMiaoRoot.scale.setScalar(1.48);
    baiMiaoRoot.userData = {
      islandId: 'career',
      districtId: 'career-headhunter-district',
      easterEggPoem: npcVillagerPoem,
      easterEggKind: 'npc',
    };

    const baiMiaoBodyPivot = new THREE.Group();
    baiMiaoRoot.add(baiMiaoBodyPivot);

    const catWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 });
    const catGoldYellowMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xd97706,
      emissiveIntensity: 0.18,
      roughness: 0.38,
    });
    const catPinkMat = new THREE.MeshStandardMaterial({ color: 0xfda4af, roughness: 0.5 });
    const catDarkBrownMat = new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.4 });

    // 圓滾滾白貓身體
    const bmTorso = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 14), catWhiteMat);
    bmTorso.scale.set(1.0, 0.92, 1.25);
    bmTorso.position.set(0, 0.36, 0);
    baiMiaoBodyPivot.add(bmTorso);

    // 黃金蝴蝶結項圈與金鈴鐺
    const bmCollar = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.042, 8, 20),
      catGoldYellowMat,
    );
    bmCollar.rotation.x = Math.PI / 2 + 0.25;
    bmCollar.position.set(0, 0.54, 0.16);
    baiMiaoBodyPivot.add(bmCollar);

    [-0.1, 0.1].forEach((bx, idx) => {
      const bowWing = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.16, 4), catGoldYellowMat);
      bowWing.position.set(bx, 0.50, 0.38);
      bowWing.rotation.z = idx === 0 ? -Math.PI / 2 : Math.PI / 2;
      baiMiaoBodyPivot.add(bowWing);
    });

    const bmBell = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), sousouGoldMat);
    bmBell.position.set(0, 0.41, 0.40);
    baiMiaoBodyPivot.add(bmBell);

    // 白喵大圓頭
    const bmHead = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), catWhiteMat);
    bmHead.scale.set(1.12, 0.96, 0.98);
    bmHead.position.set(0, 0.82, 0.18);
    baiMiaoBodyPivot.add(bmHead);

    // 黃色耳尖貓耳
    [-0.26, 0.26].forEach((earX, idx) => {
      const side = idx === 0 ? -1 : 1;
      const earGroup = new THREE.Group();
      earGroup.position.set(earX, 1.12, 0.16);
      earGroup.rotation.z = -side * 0.28;

      const earBase = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.22, 4), catWhiteMat);
      earBase.rotation.y = Math.PI / 4;
      earGroup.add(earBase);

      const earGoldTip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.14, 4), catGoldYellowMat);
      earGoldTip.position.y = 0.08;
      earGoldTip.rotation.y = Math.PI / 4;
      earGroup.add(earGoldTip);

      const earInner = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.15, 3), catPinkMat);
      earInner.position.set(0, -0.01, 0.05);
      earGroup.add(earInner);

      baiMiaoBodyPivot.add(earGroup);
    });

    // 白喵眼睛、腮紅與貓鬚
    [-0.14, 0.14].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), catDarkBrownMat);
      eye.position.set(ex, 0.84, 0.52);
      baiMiaoBodyPivot.add(eye);

      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), catWhiteMat);
      shine.position.set(ex - 0.018, 0.86, 0.57);
      baiMiaoBodyPivot.add(shine);

      const blush = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), catPinkMat);
      blush.scale.set(1.3, 0.75, 0.3);
      blush.position.set(ex * 1.45, 0.75, 0.50);
      baiMiaoBodyPivot.add(blush);
    });

    const bmNose = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.04, 3), catPinkMat);
    bmNose.rotation.x = Math.PI;
    bmNose.position.set(0, 0.78, 0.56);
    baiMiaoBodyPivot.add(bmNose);

    // 四隻白貓小短腿
    const createCatPaw = (px: number, pz: number) => {
      const paw = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.24, 8), catWhiteMat);
      paw.position.set(px, 0.12, pz);
      baiMiaoBodyPivot.add(paw);
      return paw;
    };
    const bmFrontLeftPaw = createCatPaw(-0.16, 0.22);
    const bmFrontRightPaw = createCatPaw(0.16, 0.22);
    const bmBackLeftPaw = createCatPaw(-0.16, -0.20);
    const bmBackRightPaw = createCatPaw(0.16, -0.20);

    // 長白尾巴與末端金色圓球
    const baiMiaoTailPivot = new THREE.Group();
    baiMiaoTailPivot.position.set(0, 0.34, -0.36);
    baiMiaoBodyPivot.add(baiMiaoTailPivot);

    const tailShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.055, 0.56, 8),
      catWhiteMat,
    );
    tailShaft.position.set(0, 0.22, -0.14);
    tailShaft.rotation.x = -0.62;
    baiMiaoTailPivot.add(tailShaft);

    const tailGoldPom = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), catGoldYellowMat);
    tailGoldPom.position.set(0, 0.46, -0.30);
    baiMiaoTailPivot.add(tailGoldPom);

    // 睡覺時頭頂冒出的 3 顆金色/純白睡眠泡泡 (Zzz Bubbles)
    const baiMiaoSleepBubbles: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }> = [];
    for (let i = 0; i < 3; i++) {
      const bMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xfef08a : 0xffffff,
        transparent: true,
        opacity: 0,
      });
      const bMesh = new THREE.Mesh(new THREE.SphereGeometry(0.075 + i * 0.03, 10, 10), bMat);
      bMesh.visible = false;
      baiMiaoRoot.add(bMesh);
      baiMiaoSleepBubbles.push({ mesh: bMesh, mat: bMat });
    }

    enableShadows(baiMiaoRoot);
    worldGroup.add(baiMiaoRoot);
    clickableIslands.push(baiMiaoRoot);

    // 白喵跨島與過橋巡遊路線（主島 ➔ 西北拱橋 ➔ 痛點島 ➔ 主島 ➔ 東北拱橋 ➔ 討論島 ➔ 主島 ➔ 東南拱橋 ➔ 徵才島 ➔ 主島 ➔ 西南拱橋 ➔ 創意島）
    const baiMiaoWaypoints: Array<[number, number, number]> = [
      [0, homeY + 0.18, 4.2],
      [-5.2, homeY + 0.18, -3.8],
      [-8.8, homeY + 0.22, -6.6],
      [-15.65, homeY + 2.38, -11.7], // 西北青石拱橋橋頂
      [-22.5, painY + 0.22, -16.8],
      [-26.2, painY + 0.20, -19.5], // 痛點島閒晃
      [-22.5, painY + 0.22, -16.8],
      [-15.65, homeY + 2.38, -11.7],
      [-8.8, homeY + 0.22, -6.6],
      [0, homeY + 0.18, -4.6],
      [8.8, homeY + 0.22, -6.6],
      [15.65, homeY + 2.38, -11.7], // 東北青石拱橋橋頂
      [22.5, discY + 0.22, -16.8],
      [27.2, discY + 0.20, -18.2], // 討論島茶藝街口閒晃
      [22.5, discY + 0.22, -16.8],
      [15.65, homeY + 2.38, -11.7],
      [8.8, homeY + 0.22, -6.6],
      [6.2, homeY + 0.18, 0.5],
      [8.8, homeY + 0.22, 6.6],
      [15.65, homeY + 2.38, 11.7], // 東南青石拱橋橋頂
      [22.5, careerY + 0.22, 16.8],
      [26.0, careerY + 0.20, 19.6], // 徵才島閒晃
      [22.5, careerY + 0.22, 16.8],
      [15.65, homeY + 2.38, 11.7],
      [8.8, homeY + 0.22, 6.6],
      [0, homeY + 0.18, 5.2],
      [-8.8, homeY + 0.22, 6.6],
      [-15.65, homeY + 2.38, 11.7], // 西南青石拱橋橋頂
      [-22.5, creativeY + 0.22, 16.8],
      [-26.0, creativeY + 0.20, 19.8], // 創意島閒晃
      [-22.5, creativeY + 0.22, 16.8],
      [-15.65, homeY + 2.38, 11.7],
      [-8.8, homeY + 0.22, 6.6],
    ];

    // (C) 多慧 (Duohui)：在主島熱情的招呼新來的小人，有時會拍拍翅膀
    const duohuiRoot = new THREE.Group();
    duohuiRoot.position.set(1.85, homeY + 0.24, 5.1);
    duohuiRoot.scale.setScalar(1.52);
    duohuiRoot.userData = {
      islandId: 'home',
      districtId: 'home-plaza',
      easterEggPoem: npcVillagerPoem,
      easterEggKind: 'npc',
    };

    const owlSageGreenMat = new THREE.MeshStandardMaterial({ color: 0x6b9e58, roughness: 0.55 });
    const owlDarkGreenSuitMat = new THREE.MeshStandardMaterial({ color: 0x1e4d2b, roughness: 0.5 });
    const owlCreamMat = new THREE.MeshStandardMaterial({ color: 0xfefce8, roughness: 0.5 });
    const owlEyeEmeraldMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.25 });
    const owlHeadsetBlackMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.35,
      metalness: 0.45,
    });
    const owlOrangeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45 });

    const duohuiBodyPivot = new THREE.Group();
    duohuiRoot.add(duohuiBodyPivot);

    // 圓潤貓頭鷹身體與深綠制服背心、領帶、識別證
    const dhBody = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 16), owlSageGreenMat);
    dhBody.scale.set(1.06, 1.02, 0.96);
    dhBody.position.set(0, 0.42, 0);
    duohuiBodyPivot.add(dhBody);

    const dhBelly = new THREE.Mesh(new THREE.SphereGeometry(0.31, 14, 14), owlCreamMat);
    dhBelly.scale.set(0.95, 0.92, 0.65);
    dhBelly.position.set(0, 0.38, 0.16);
    duohuiBodyPivot.add(dhBelly);

    const dhVest = new THREE.Mesh(
      new THREE.CylinderGeometry(0.33, 0.36, 0.36, 12),
      owlDarkGreenSuitMat,
    );
    dhVest.position.set(0, 0.44, 0.03);
    duohuiBodyPivot.add(dhVest);

    const dhTie = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.22, 4), owlEyeEmeraldMat);
    dhTie.rotation.x = Math.PI;
    dhTie.position.set(0, 0.45, 0.36);
    duohuiBodyPivot.add(dhTie);

    // 胸前官方客服識別證小卡
    const dhBadge = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.15, 0.02), owlCreamMat);
    dhBadge.position.set(0.14, 0.42, 0.36);
    duohuiBodyPivot.add(dhBadge);

    // 多慧圓頭與白色臉盤、圓框金絲眼鏡、翠綠大眼、客服耳麥
    const dhHead = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), owlSageGreenMat);
    dhHead.scale.set(1.14, 0.98, 0.98);
    dhHead.position.set(0, 0.88, 0.04);
    duohuiBodyPivot.add(dhHead);

    [-0.15, 0.15].forEach((fx, idx) => {
      const side = idx === 0 ? -1 : 1;
      const faceDisc = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 12), owlCreamMat);
      faceDisc.scale.set(1.05, 1.05, 0.45);
      faceDisc.position.set(fx, 0.88, 0.31);
      duohuiBodyPivot.add(faceDisc);

      const eyeIris = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), owlEyeEmeraldMat);
      eyeIris.scale.set(1.0, 1.0, 0.45);
      eyeIris.position.set(fx, 0.88, 0.39);
      duohuiBodyPivot.add(eyeIris);

      const eyePupil = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), owlHeadsetBlackMat);
      eyePupil.position.set(fx, 0.88, 0.42);
      duohuiBodyPivot.add(eyePupil);

      const eyeShine = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), owlCreamMat);
      eyeShine.position.set(fx + 0.03, 0.91, 0.45);
      duohuiBodyPivot.add(eyeShine);

      // 圓框金絲眼鏡
      const glassesRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.165, 0.018, 8, 24),
        sousouGoldMat,
      );
      glassesRim.position.set(fx, 0.88, 0.43);
      duohuiBodyPivot.add(glassesRim);

      // 頭頂精靈羽冠耳簇
      const earTuft = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 5), owlSageGreenMat);
      earTuft.position.set(fx * 1.95, 1.18, 0.04);
      earTuft.rotation.z = -side * 0.48;
      duohuiBodyPivot.add(earTuft);
    });

    // 金絲眼鏡鼻橋與橘黃鳥喙
    const glassesBridge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 0.08, 6),
      sousouGoldMat,
    );
    glassesBridge.rotation.z = Math.PI / 2;
    glassesBridge.position.set(0, 0.90, 0.44);
    duohuiBodyPivot.add(glassesBridge);

    const dhBeak = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.14, 4), owlOrangeMat);
    dhBeak.rotation.x = Math.PI * 0.62;
    dhBeak.position.set(0, 0.83, 0.45);
    duohuiBodyPivot.add(dhBeak);

    // 25hr 官方客服耳麥與麥克風桿
    const headsetArch = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.032, 8, 24, Math.PI),
      owlHeadsetBlackMat,
    );
    headsetArch.position.set(0, 0.88, 0.04);
    duohuiBodyPivot.add(headsetArch);

    [-0.42, 0.42].forEach((hx) => {
      const earCup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12),
        owlHeadsetBlackMat,
      );
      earCup.rotation.z = Math.PI / 2;
      earCup.position.set(hx, 0.88, 0.04);
      duohuiBodyPivot.add(earCup);
    });

    const micBoom = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 0.34, 6),
      owlHeadsetBlackMat,
    );
    micBoom.position.set(-0.28, 0.76, 0.24);
    micBoom.rotation.x = Math.PI / 3;
    micBoom.rotation.z = -0.45;
    duohuiBodyPivot.add(micBoom);

    // 左右可拍動翠綠翅膀
    const createOwlWing = (side: -1 | 1) => {
      const wingPivot = new THREE.Group();
      wingPivot.position.set(side * 0.35, 0.56, 0.02);

      const wingMesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), owlSageGreenMat);
      wingMesh.scale.set(0.42, 1.35, 0.82);
      wingMesh.position.set(side * 0.08, -0.14, 0);
      wingPivot.add(wingMesh);

      return wingPivot;
    };
    const duohuiLeftWing = createOwlWing(-1);
    const duohuiRightWing = createOwlWing(1);
    duohuiBodyPivot.add(duohuiLeftWing, duohuiRightWing);

    // 橘黃貓頭鷹小腳爪
    [-0.14, 0.14].forEach((fx) => {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.18), owlOrangeMat);
      foot.position.set(fx, 0.04, 0.06);
      duohuiBodyPivot.add(foot);
    });

    enableShadows(duohuiRoot);
    worldGroup.add(duohuiRoot);
    clickableIslands.push(duohuiRoot);

    // ---------------------------------------------------------
    // (E) 【007】：躺在徵才島「翰林院」屋頂上（紫白配色特務機器人、頭頂旋轉紫金雷達碟、紫光雙眼螢幕、手捧發光情報平板）
    // ---------------------------------------------------------
    const agent007Group = new THREE.Group();
    agent007Group.userData = {
      islandId: 'career',
      districtId: 'career-academy',
      characterId: 'agent007',
      easterEggPoem: npcVillagerPoem,
      easterEggKind: 'npc',
    };
    // 放置在翰林院正面二層翠玉琉璃屋頂斜坡上（牌匾「翰林院」正上方屋瓦，視野極佳）
    agent007Group.position.set(0.42, 4.18, 1.48);
    agent007Group.rotation.set(0.18, 0.28, 0);
    agent007Group.scale.setScalar(1.12);

    const a007WhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf6f5fa,
      roughness: 0.3,
      metalness: 0.18,
    });
    const a007PurpleMat = new THREE.MeshStandardMaterial({
      color: 0x6b3fa0,
      roughness: 0.38,
      metalness: 0.22,
    });
    const a007LightPurpleMat = new THREE.MeshStandardMaterial({
      color: 0xa77be8,
      roughness: 0.35,
      metalness: 0.2,
    });
    const a007VisorMat = new THREE.MeshStandardMaterial({
      color: 0x161124,
      roughness: 0.18,
      metalness: 0.45,
    });
    const a007NeonEyeMat = new THREE.MeshStandardMaterial({
      color: 0xe6b8ff,
      emissive: 0xc864ff,
      emissiveIntensity: 1.5,
      roughness: 0.15,
    });
    const a007TabletScreenMat = new THREE.MeshStandardMaterial({
      color: 0x7ef4ff,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.35,
      roughness: 0.2,
    });

    // 007 斜躺姿態主樞紐（半躺依靠在翰林院琉璃瓦上）
    const a007LoungingPivot = new THREE.Group();
    a007LoungingPivot.rotation.z = 1.18; // 愜意側仰躺在屋頂上
    a007LoungingPivot.position.set(0, 0.28, 0);
    agent007Group.add(a007LoungingPivot);

    // 圓潤機甲軀幹與紫色大衣領巾
    const a007Torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.24, 0.3, 10, 16),
      a007WhiteMat,
    );
    a007Torso.position.set(0, 0.42, 0);
    a007LoungingPivot.add(a007Torso);

    const a007Coat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.29, 0.34, 14),
      a007PurpleMat,
    );
    a007Coat.position.set(0, 0.38, 0);
    a007LoungingPivot.add(a007Coat);

    const a007Scarf = new THREE.Mesh(
      new THREE.TorusGeometry(0.21, 0.065, 8, 18),
      a007LightPurpleMat,
    );
    a007Scarf.rotation.x = Math.PI / 2;
    a007Scarf.position.set(0, 0.58, 0.02);
    a007LoungingPivot.add(a007Scarf);

    // 背部雙卷軸筒
    [-0.12, 0.12].forEach((sx) => {
      const scrollTube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.46, 10),
        mats.goldTrim,
      );
      scrollTube.position.set(sx, 0.48, -0.24);
      scrollTube.rotation.z = sx * 0.6;
      a007LoungingPivot.add(scrollTube);
    });

    // 寬圓機器人頭盔與深色面罩螢幕
    const a007HeadGroup = new THREE.Group();
    a007HeadGroup.position.set(-0.04, 0.84, 0.04);
    a007HeadGroup.rotation.z = -0.38; // 躺著時抬頭看平板與風景
    a007LoungingPivot.add(a007HeadGroup);

    const a007Helmet = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 16), a007WhiteMat);
    a007Helmet.scale.set(1.15, 0.96, 1.02);
    a007HeadGroup.add(a007Helmet);

    // 頭盔兩側紫色耳機護罩
    [-0.35, 0.35].forEach((ex) => {
      const earPod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.08, 12),
        a007PurpleMat,
      );
      earPod.rotation.z = Math.PI / 2;
      earPod.position.set(ex, 0, 0.02);
      a007HeadGroup.add(earPod);
    });

    // 黑色顯示器面罩
    const a007Visor = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 14), a007VisorMat);
    a007Visor.scale.set(1.12, 0.78, 0.65);
    a007Visor.position.set(0, 0.01, 0.16);
    a007HeadGroup.add(a007Visor);

    // 發光紫色機器人雙眼（左眼眨眼笑弧、右眼圓亮）
    const a007LeftWink = new THREE.Mesh(
      new THREE.TorusGeometry(0.055, 0.018, 8, 14, Math.PI),
      a007NeonEyeMat,
    );
    a007LeftWink.position.set(-0.1, 0.02, 0.34);
    a007HeadGroup.add(a007LeftWink);

    const a007RightEye = new THREE.Mesh(
      new THREE.SphereGeometry(0.052, 10, 10),
      a007NeonEyeMat,
    );
    a007RightEye.scale.set(1, 1.15, 0.45);
    a007RightEye.position.set(0.1, 0.03, 0.34);
    a007HeadGroup.add(a007RightEye);

    // 頭頂可旋轉紫色雷達天線碟
    const agent007RadarPivot = new THREE.Group();
    agent007RadarPivot.position.set(0.08, 0.31, 0);
    a007HeadGroup.add(agent007RadarPivot);

    const radarStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.035, 0.14, 8),
      a007PurpleMat,
    );
    radarStem.position.y = 0.06;
    agent007RadarPivot.add(radarStem);

    const radarDish = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.09, 14, 1, true),
      a007LightPurpleMat,
    );
    radarDish.rotation.x = Math.PI * 0.78;
    radarDish.position.set(0, 0.15, 0.03);
    agent007RadarPivot.add(radarDish);

    const radarTip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), a007NeonEyeMat);
    radarTip.position.set(0, 0.21, 0.06);
    agent007RadarPivot.add(radarTip);

    // 右手撐頭愜意躺姿、左手舉著發光情報平板
    const a007RightArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.065, 0.24, 8, 10),
      a007WhiteMat,
    );
    a007RightArm.position.set(-0.22, 0.56, 0.08);
    a007RightArm.rotation.z = 0.65;
    a007LoungingPivot.add(a007RightArm);

    const a007LeftArmPivot = new THREE.Group();
    a007LeftArmPivot.position.set(0.16, 0.48, 0.18);
    a007LoungingPivot.add(a007LeftArmPivot);

    const a007LeftArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.065, 0.26, 8, 10),
      a007WhiteMat,
    );
    a007LeftArm.position.set(0.06, 0.12, 0.12);
    a007LeftArm.rotation.x = -0.65;
    a007LeftArmPivot.add(a007LeftArm);

    // 發光全息情報平板
    const a007Tablet = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.2, 0.025),
      a007PurpleMat,
    );
    a007Tablet.position.set(0.08, 0.24, 0.26);
    a007Tablet.rotation.set(-0.45, -0.35, -0.6);
    const a007Screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.23, 0.15),
      a007TabletScreenMat,
    );
    a007Screen.position.z = 0.015;
    a007Tablet.add(a007Screen);
    a007LeftArmPivot.add(a007Tablet);

    // 悠閒交疊的雙腿與紫白機甲靴
    const a007LeftLeg = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.075, 0.26, 8, 10),
      a007WhiteMat,
    );
    a007LeftLeg.position.set(0.12, 0.08, 0.06);
    a007LeftLeg.rotation.z = -0.18;
    a007LoungingPivot.add(a007LeftLeg);

    const a007RightLeg = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.075, 0.26, 8, 10),
      a007PurpleMat,
    );
    a007RightLeg.position.set(-0.06, 0.1, 0.16);
    a007RightLeg.rotation.x = -0.42;
    a007RightLeg.rotation.z = 0.28;
    a007LoungingPivot.add(a007RightLeg);

    enableShadows(agent007Group);
    hanlinGroup.add(agent007Group);

    // ---------------------------------------------------------
    // (F) 【紅色安全帽大熊】：在討論島「工作坊（百工坊街道：鐵匠鋪與木匠鋪之間）」工作台作勢修理與製作東西
    // ---------------------------------------------------------
    const bearWorkshopGroup = new THREE.Group();
    bearWorkshopGroup.userData = {
      islandId: 'discussion',
      districtId: 'disc-workshop',
      characterId: 'bear',
      easterEggPoem: npcVillagerPoem,
      easterEggKind: 'npc',
    };
    // 放置在百工坊街道中央（鐵匠鋪與木匠鋪門前青石街心），清楚可見大熊揮動木槌修理與打造機關
    bearWorkshopGroup.position.set(0.35, 0.14, 1.25);
    bearWorkshopGroup.rotation.y = -0.35;
    bearWorkshopGroup.scale.setScalar(1.18);

    const bearFurMat = new THREE.MeshStandardMaterial({
      color: 0x8c583a,
      roughness: 0.72,
    });
    const bearMuzzleMat = new THREE.MeshStandardMaterial({
      color: 0xeed9c4,
      roughness: 0.65,
    });
    const bearRedGearMat = new THREE.MeshStandardMaterial({
      color: 0xd93829,
      roughness: 0.35,
      metalness: 0.15,
    });
    const bearOverallsMat = new THREE.MeshStandardMaterial({
      color: 0x2c5e9e,
      roughness: 0.65,
    });
    const bearShirtMat = new THREE.MeshStandardMaterial({
      color: 0xf5ebd6,
      roughness: 0.65,
    });
    const bearDarkMat = new THREE.MeshStandardMaterial({
      color: 0x231815,
      roughness: 0.3,
    });

    // 1. 工匠實木工作台 + 待修理的發光齒輪機關 + 紅色工具箱
    const workbenchGroup = new THREE.Group();
    workbenchGroup.position.set(0, 0, 0.68);
    bearWorkshopGroup.add(workbenchGroup);

    const benchTop = new THREE.Mesh(
      new THREE.BoxGeometry(1.18, 0.1, 0.62),
      mats.woodWarm,
    );
    benchTop.position.y = 0.56;
    workbenchGroup.add(benchTop);

    [
      [-0.5, -0.22],
      [0.5, -0.22],
      [-0.5, 0.22],
      [0.5, 0.22],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.56, 0.1),
        mats.woodDark,
      );
      leg.position.set(lx, 0.28, lz);
      workbenchGroup.add(leg);
    });

    // 工作台上的待修理金屬齒輪與核心零件
    const bearCraftItemPivot = new THREE.Group();
    bearCraftItemPivot.position.set(-0.06, 0.66, 0);
    workbenchGroup.add(bearCraftItemPivot);

    const craftGear = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.08, 10),
      mats.goldTrim,
    );
    bearCraftItemPivot.add(craftGear);

    const craftCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.12, 0),
      mats.bulbRing,
    );
    craftCore.position.y = 0.1;
    bearCraftItemPivot.add(craftCore);

    // 旁側紅色工具箱
    const redToolbox = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.2, 0.22),
      bearRedGearMat,
    );
    redToolbox.position.set(0.36, 0.7, 0.05);
    redToolbox.rotation.y = -0.25;
    workbenchGroup.add(redToolbox);

    // 敲擊時迸發的金紅鍛造火花粒子
    const bearCraftSparks: THREE.Mesh[] = [];
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0,
    });
    for (let s = 0; s < 5; s++) {
      const sp = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), sparkMat);
      sp.position.set(-0.06, 0.76, 0);
      workbenchGroup.add(sp);
      bearCraftSparks.push(sp);
    }

    // 2. 大熊角色本體（站在工作台後方專注修理與敲打製作）
    const bearBodyPivot = new THREE.Group();
    bearBodyPivot.position.set(0, 0, 0);
    bearWorkshopGroup.add(bearBodyPivot);

    // 壯實身軀與藍色吊帶工裝褲
    const bearTorso = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 16, 14),
      bearShirtMat,
    );
    bearTorso.scale.set(1.08, 1.15, 0.95);
    bearTorso.position.set(0, 0.56, 0);
    bearBodyPivot.add(bearTorso);

    const bearOveralls = new THREE.Mesh(
      new THREE.CylinderGeometry(0.37, 0.4, 0.52, 16),
      bearOverallsMat,
    );
    bearOveralls.position.set(0, 0.44, 0.02);
    bearBodyPivot.add(bearOveralls);

    // 藍色吊帶與黃色圓釦
    [-0.16, 0.16].forEach((bx) => {
      const strap = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.34, 0.04),
        bearOverallsMat,
      );
      strap.position.set(bx, 0.72, 0.31);
      bearBodyPivot.add(strap);

      const btn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.02, 10),
        mats.goldTrim,
      );
      btn.rotation.x = Math.PI / 2;
      btn.position.set(bx, 0.62, 0.34);
      bearBodyPivot.add(btn);
    });

    // 背部紅色工程背包與腰間紅色工具袋
    const bearBackpack = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.44, 0.24),
      bearRedGearMat,
    );
    bearBackpack.position.set(0, 0.62, -0.34);
    bearBodyPivot.add(bearBackpack);

    // 大熊圓頭、口鼻與圓耳
    const bearHeadGroup = new THREE.Group();
    bearHeadGroup.position.set(0, 1.05, 0.04);
    bearBodyPivot.add(bearHeadGroup);

    const bearHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 18, 16),
      bearFurMat,
    );
    bearHead.scale.set(1.08, 0.98, 1.02);
    bearHeadGroup.add(bearHead);

    const bearMuzzle = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 14, 12),
      bearMuzzleMat,
    );
    bearMuzzle.scale.set(1.15, 0.85, 0.9);
    bearMuzzle.position.set(0, -0.06, 0.3);
    bearHeadGroup.add(bearMuzzle);

    const bearNose = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 10, 10),
      bearDarkMat,
    );
    bearNose.position.set(0, -0.02, 0.43);
    bearHeadGroup.add(bearNose);

    [-0.12, 0.12].forEach((ex) => {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.038, 10, 10),
        bearDarkMat,
      );
      eye.position.set(ex, 0.05, 0.33);
      bearHeadGroup.add(eye);
    });

    [-0.28, 0.28].forEach((earX) => {
      const ear = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 12, 12),
        bearFurMat,
      );
      ear.position.set(earX, 0.24, -0.02);
      bearHeadGroup.add(ear);
    });

    // 標誌性紅色工程安全帽與兩側紅色防噪耳罩
    const hardHatDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      bearRedGearMat,
    );
    hardHatDome.position.set(0, 0.08, 0);
    bearHeadGroup.add(hardHatDome);

    const hardHatBrim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.41, 0.41, 0.04, 18),
      bearRedGearMat,
    );
    hardHatBrim.position.set(0, 0.1, 0.04);
    hardHatBrim.rotation.x = 0.08;
    bearHeadGroup.add(hardHatBrim);

    const hardHatRidge = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.52),
      bearRedGearMat,
    );
    hardHatRidge.position.set(0, 0.41, 0);
    bearHeadGroup.add(hardHatRidge);

    [-0.37, 0.37].forEach((hx) => {
      const earmuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.08, 12),
        bearRedGearMat,
      );
      earmuff.rotation.z = Math.PI / 2;
      earmuff.position.set(hx, 0.02, 0.02);
      bearHeadGroup.add(earmuff);
    });

    // 左手臂（戴紅手套按住工作台零件）
    const bearLeftArmPivot = new THREE.Group();
    bearLeftArmPivot.position.set(0.36, 0.74, 0.08);
    bearBodyPivot.add(bearLeftArmPivot);

    const bearLeftArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.1, 0.26, 8, 10),
      bearFurMat,
    );
    bearLeftArm.position.set(0.04, -0.1, 0.16);
    bearLeftArm.rotation.x = -0.85;
    bearLeftArmPivot.add(bearLeftArm);

    const bearLeftGlove = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 12),
      bearRedGearMat,
    );
    bearLeftGlove.position.set(0.04, -0.2, 0.32);
    bearLeftArmPivot.add(bearLeftGlove);

    // 右手臂（戴紅手套握大木槌上下揮動敲擊修理）
    const bearRightArmPivot = new THREE.Group();
    bearRightArmPivot.position.set(-0.36, 0.78, 0.08);
    bearBodyPivot.add(bearRightArmPivot);

    const bearRightArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.1, 0.28, 8, 10),
      bearFurMat,
    );
    bearRightArm.position.set(-0.04, -0.08, 0.18);
    bearRightArm.rotation.x = -0.95;
    bearRightArmPivot.add(bearRightArm);

    const bearRightGlove = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 12),
      bearRedGearMat,
    );
    bearRightGlove.position.set(-0.04, -0.16, 0.36);
    bearRightArmPivot.add(bearRightGlove);

    // 工匠大木槌（綁在右手套上）
    const malletGroup = new THREE.Group();
    malletGroup.position.set(-0.04, -0.16, 0.42);
    bearRightArmPivot.add(malletGroup);

    const malletHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.038, 0.46, 8),
      mats.woodWarm,
    );
    malletHandle.position.set(0, 0.18, 0.08);
    malletHandle.rotation.x = 0.35;
    malletGroup.add(malletHandle);

    const malletHead = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.32, 12),
      mats.woodDark,
    );
    malletHead.rotation.z = Math.PI / 2;
    malletHead.position.set(0, 0.38, 0.16);
    malletGroup.add(malletHead);

    // 雙腳工程靴
    [-0.18, 0.18].forEach((fx) => {
      const boot = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.16, 0.26),
        bearRedGearMat,
      );
      boot.position.set(fx, 0.08, 0.06);
      bearBodyPivot.add(boot);
    });

    enableShadows(bearWorkshopGroup);
    workshopBlock.add(bearWorkshopGroup);

    // =========================================================
    // 8.7 夜晚水燈飄蕩與晴夜祈福天燈系統（晚上水面水燈飄蕩、晚上好天氣時天燈冉冉升空）
    // =========================================================
    const nightWaterLanternGroup = new THREE.Group();
    worldGroup.add(nightWaterLanternGroup);

    const waterLanternCoreMat = new THREE.MeshStandardMaterial({
      color: 0xffe49e,
      emissive: 0xff9e2c,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    });
    const waterLanternPetalMat = new THREE.MeshStandardMaterial({
      color: 0xffb3c6,
      emissive: 0xff5c8a,
      emissiveIntensity: 0.85,
      roughness: 0.4,
    });
    const waterLanternGlowMat = new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });

    interface NightWaterLanternItem {
      group: THREE.Group;
      baseX: number;
      baseZ: number;
      driftRadiusX: number;
      driftRadiusZ: number;
      speed: number;
      phase: number;
    }
    const nightWaterLanterns: NightWaterLanternItem[] = [];
    const waterLanternCoords: [number, number, number, number][] = [
      // 主島與四座拱橋周邊水道
      [-12.5, -6.5, 2.2, 1.4],
      [-8.2, 10.5, 1.8, 2.1],
      [9.5, 11.2, 2.4, 1.6],
      [13.2, -7.8, 1.9, 2.2],
      [0.5, -15.5, 2.8, 1.5],
      [-2.5, 16.8, 2.5, 1.4],
      [-19.5, 2.2, 1.8, 2.6],
      [20.2, -1.5, 1.7, 2.5],
      // 外環河道與碼頭附近
      [-6.8, 21.5, 2.2, 1.8],
      [7.4, 22.0, 2.4, 1.6],
      [-24.0, -10.5, 2.0, 2.0],
      [24.5, -11.2, 2.1, 1.9],
      [-22.5, 11.8, 1.9, 2.1],
      [23.0, 12.4, 2.2, 1.8],
      [-14.2, -18.5, 2.3, 1.5],
      [15.0, -18.0, 2.1, 1.7],
      [-15.8, 18.2, 2.0, 1.8],
      [16.2, 17.8, 2.2, 1.6],
    ];

    waterLanternCoords.forEach(([lx, lz, drx, drz], idx) => {
      const wl = new THREE.Group();
      // 木托底盤
      const baseTray = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.24, 0.05, 8),
        mats.woodDark,
      );
      baseTray.position.y = 0.025;
      wl.add(baseTray);

      // 蓮花瓣圈
      for (let p = 0; p < 6; p++) {
        const pAngle = (p / 6) * Math.PI * 2;
        const petal = new THREE.Mesh(
          new THREE.ConeGeometry(0.11, 0.22, 5),
          waterLanternPetalMat,
        );
        petal.position.set(Math.cos(pAngle) * 0.2, 0.08, Math.sin(pAngle) * 0.2);
        petal.rotation.z = -Math.cos(pAngle) * 0.55;
        petal.rotation.x = Math.sin(pAngle) * 0.55;
        wl.add(petal);
      }

      // 中心暖金燭光燈芯
      const lanternCore = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.09, 0.22, 8),
        waterLanternCoreMat,
      );
      lanternCore.position.y = 0.14;
      wl.add(lanternCore);

      // 水面柔光倒影圈
      const waterHalo = new THREE.Mesh(
        new THREE.CircleGeometry(0.62, 16),
        waterLanternGlowMat,
      );
      waterHalo.rotation.x = -Math.PI / 2;
      waterHalo.position.y = 0.01;
      wl.add(waterHalo);

      wl.position.set(lx, -0.22, lz);
      nightWaterLanternGroup.add(wl);
      nightWaterLanterns.push({
        group: wl,
        baseX: lx,
        baseZ: lz,
        driftRadiusX: drx,
        driftRadiusZ: drz,
        speed: 0.28 + (idx % 5) * 0.05,
        phase: idx * 1.37,
      });
    });

    // 夜晚好天氣時零星冉冉升空的祈福天燈（僅保留 5 盞零星天燈，輕巧不雜亂且流暢不卡頓）
    const nightSkyLanternGroup = new THREE.Group();
    worldGroup.add(nightSkyLanternGroup);

    const skyLanternBodyMat = new THREE.MeshStandardMaterial({
      color: 0xffb86c,
      emissive: 0xff7b29,
      emissiveIntensity: 2.1,
      roughness: 0.35,
      transparent: true,
      opacity: 0.92,
    });
    const skyLanternFlameMat = new THREE.MeshBasicMaterial({
      color: 0xfff3b0,
    });

    interface NightSkyLanternItem {
      group: THREE.Group;
      originX: number;
      originZ: number;
      speed: number;
      phase: number;
      swayAmp: number;
    }
    const nightSkyLanterns: NightSkyLanternItem[] = [];
    const skyLanternOrigins: Array<[number, number]> = [
      [-18, -14],
      [22, -16],
      [-24, 18],
      [20, 16],
      [0, -26],
    ];
    const skyLanternCount = skyLanternOrigins.length;
    for (let i = 0; i < skyLanternCount; i++) {
      const sl = new THREE.Group();

      // 天燈主燈籠罩（低面數輕量孔明燈造型）
      const bodyUpper = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.26, 0.64, 6),
        skyLanternBodyMat,
      );
      bodyUpper.position.y = 0.32;
      sl.add(bodyUpper);

      const topCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.34, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.5),
        skyLanternBodyMat,
      );
      topCap.scale.y = 0.42;
      topCap.position.y = 0.64;
      sl.add(topCap);

      const flameCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 6, 6),
        skyLanternFlameMat,
      );
      flameCore.position.y = 0.08;
      sl.add(flameCore);

      const [ox, oz] = skyLanternOrigins[i];
      nightSkyLanternGroup.add(sl);
      nightSkyLanterns.push({
        group: sl,
        originX: ox,
        originZ: oz,
        speed: 0.024 + i * 0.004,
        phase: i / skyLanternCount,
        swayAmp: 1.2 + (i % 3) * 0.35,
      });
    }

    // =========================================================
    // 9. RAYCASTING FOR CLICKING 3D ISLANDS & EASTER EGGS
    // =========================================================
    const raycaster = new THREE.Raycaster();
    const pointerDownPos = { x: 0, y: 0, time: 0, active: false };

    const handleCanvasPointerDown = (e: PointerEvent) => {
      if (e.button === 0) {
        pointerDownPos.x = e.clientX;
        pointerDownPos.y = e.clientY;
        pointerDownPos.time = performance.now();
        pointerDownPos.active = true;
      }
    };

    const handleCanvasPointerUp = (e: PointerEvent) => {
      if (e.button !== 0 || !pointerDownPos.active) return;
      pointerDownPos.active = false;
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      const elapsed = performance.now() - pointerDownPos.time;
      if (dist > 6 || elapsed > 550) return;

      const rect = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const rawHits = raycaster.intersectObjects(clickableIslands, true);
      const hits = rawHits.filter((h) => {
        let cur: THREE.Object3D | null = h.object;
        while (cur) {
          if (!cur.visible) return false;
          cur = cur.parent;
        }
        return true;
      });
      if (hits.length > 0) {
        const extractHitInfo = (hitObj: THREE.Object3D) => {
          let obj: THREE.Object3D | null = hitObj;
          let foundIslandId: string | undefined;
          let foundDistrictId: string | undefined;
          let foundEasterEggPoem: string | undefined;
          let foundEasterEggPoems: string[] | undefined;
          let foundEasterEggKind: string | undefined;
          let clickedXiaoDengPao = false;
          let isOutsideNpc = true;
          while (obj) {
            if (obj.userData?.isXiaoDengPaoStatue) {
              clickedXiaoDengPao = true;
            }
            if (typeof obj.userData?.isOutside === 'boolean') {
              isOutsideNpc = obj.userData.isOutside;
            }
            if (
              (obj.userData?.easterEggPoem || obj.userData?.easterEggPoems) &&
              !foundEasterEggPoem &&
              !foundEasterEggPoems
            ) {
              foundEasterEggPoem = obj.userData.easterEggPoem;
              foundEasterEggPoems = obj.userData.easterEggPoems;
              foundEasterEggKind = obj.userData.easterEggKind;
            }
            if (obj.userData?.districtId && !foundDistrictId) {
              foundDistrictId = obj.userData.districtId;
            }
            if (obj.userData?.islandId) {
              foundIslandId = obj.userData.islandId;
              break;
            }
            obj = obj.parent;
          }
          return {
            foundIslandId,
            foundDistrictId,
            foundEasterEggPoem,
            foundEasterEggPoems,
            foundEasterEggKind,
            clickedXiaoDengPao,
            isOutsideNpc,
          };
        };

        let chosen = extractHitInfo(hits[0].object);
        // 若第一順位的射線穿過山嵐／雲霧，但後方有具體塔樓、山洞、島嶼、船隻或 NPC，優先觸發具體景物
        if (chosen.foundEasterEggKind === 'mountain-mist' && hits.length > 1) {
          for (let i = 1; i < hits.length; i++) {
            const candidate = extractHitInfo(hits[i].object);
            if (
              candidate.clickedXiaoDengPao ||
              candidate.foundIslandId ||
              (candidate.foundEasterEggKind && candidate.foundEasterEggKind !== 'mountain-mist')
            ) {
              chosen = candidate;
              break;
            }
          }
        }

        const {
          foundIslandId,
          foundDistrictId,
          foundEasterEggPoem,
          foundEasterEggPoems,
          foundEasterEggKind,
          clickedXiaoDengPao,
          isOutsideNpc,
        } = chosen;

        if (clickedXiaoDengPao) {
          const nowT = clock.getElapsedTime();
          xiaoDengPaoStartTime = nowT;
          xiaoDengPaoActiveUntil = nowT + 3.2;
          xiaoDengPaoFacingYaw = smoothedSpherical.yawRad;
          return;
        }
        if (foundEasterEggPoem || (foundEasterEggPoems && foundEasterEggPoems.length > 0)) {
          const isNightNow = timePhaseRef.current === 'night';
          const isClearNightNow = isNightNow && weatherRef.current !== 'rain';

          if (foundEasterEggKind === 'boat' && isNightNow) {
            // 夜晚水上漁船換成遊船，點擊遊船出現《湖心亭看雪》名句
            triggerEasterEggRef.current(
              '「是日更定矣，余拏一小舟，擁毳衣爐火，獨往湖心亭看雪。」',
            );
            return;
          }
          if (
            isNightNow &&
            (foundEasterEggKind === 'npc' ||
              foundEasterEggKind === 'farmer' ||
              foundEasterEggKind === 'fisherman')
          ) {
            if (isOutsideNpc) {
              // 晚上點擊在外面的 NPC
              triggerEasterEggRef.current(
                '「六橋金粉人初散，十里鶯花夢乍醒。斷續聽來何處好，碧煙明月冷泉亭。」',
              );
              return;
            }
            if (isClearNightNow) {
              triggerEasterEggRef.current(
                '「月景尤不可言，花態柳情，山容水意，別是一種趣味。此樂留與山僧遊客受用，安可為俗士道哉！」',
              );
              return;
            }
          }
          if (foundEasterEggPoems && foundEasterEggPoems.length > 0) {
            const randomVerse =
              foundEasterEggPoems[Math.floor(Math.random() * foundEasterEggPoems.length)];
            triggerEasterEggRef.current(randomVerse);
            return;
          }
          if (foundEasterEggPoem) {
            triggerEasterEggRef.current(foundEasterEggPoem);
            return;
          }
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
    window.addEventListener('pointerup', handleCanvasPointerUp);

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

      // 晚上九點以後（21:00–04:59，或手動切換至子時夜晚預覽）全部民房暗下來
      const curHour = localHourRef.current ?? getUtc8TimeInfo().hour;
      const isAfter9Pm =
        isNightPhase && (timeModeRef.current !== 'auto' || curHour >= 21 || curHour < 5);
      const targetHomesteadWinEmissive = isAfter9Pm
        ? 0.0
        : isNightPhase
        ? 2.1 * rainGlowBoost
        : isDuskPhase
        ? 1.65 * rainGlowBoost
        : 0.18;
      const targetHomesteadLanternEmissive = isAfter9Pm
        ? 0.0
        : isNightPhase
        ? 2.35 * rainGlowBoost
        : isDuskPhase
        ? 1.85 * rainGlowBoost
        : 0.25;
      mats.homesteadWindowGlow.emissiveIntensity = THREE.MathUtils.lerp(
        mats.homesteadWindowGlow.emissiveIntensity,
        targetHomesteadWinEmissive,
        lerpSpeed,
      );
      mats.homesteadWindowGlow.color.lerp(
        targetColorHelper.setHex(isAfter9Pm ? 0x242c36 : 0xffe39f),
        lerpSpeed,
      );
      mats.homesteadLanternGlow.emissiveIntensity = THREE.MathUtils.lerp(
        mats.homesteadLanternGlow.emissiveIntensity,
        targetHomesteadLanternEmissive,
        lerpSpeed,
      );
      mats.homesteadLanternGlow.color.lerp(
        targetColorHelper.setHex(isAfter9Pm ? 0x332624 : 0xff5722),
        lerpSpeed,
      );

      // 山上唯一古塔樓：晚上持續璀璨發亮（不受九點民房熄燈影響）
      const targetPagodaWinEmissive = isNightPhase
        ? 3.4 * pulseFactor * rainGlowBoost
        : isDuskPhase
        ? 1.95 * pulseFactor * rainGlowBoost
        : 0.35;
      const targetPagodaLanternEmissive = isNightPhase
        ? 3.6 * pulseFactor * rainGlowBoost
        : isDuskPhase
        ? 2.1 * pulseFactor * rainGlowBoost
        : 0.45;
      const targetPagodaSpireEmissive = isNightPhase
        ? 2.85 * pulseFactor * rainGlowBoost
        : isDuskPhase
        ? 1.55 * pulseFactor * rainGlowBoost
        : 0.45;
      mats.pagodaWindowGlow.emissiveIntensity = THREE.MathUtils.lerp(
        mats.pagodaWindowGlow.emissiveIntensity,
        targetPagodaWinEmissive,
        lerpSpeed,
      );
      mats.pagodaLanternGlow.emissiveIntensity = THREE.MathUtils.lerp(
        mats.pagodaLanternGlow.emissiveIntensity,
        targetPagodaLanternEmissive,
        lerpSpeed,
      );
      mats.pagodaSpireGlow.emissiveIntensity = THREE.MathUtils.lerp(
        mats.pagodaSpireGlow.emissiveIntensity,
        targetPagodaSpireEmissive,
        lerpSpeed,
      );
      const targetPagodaLightIntensity = isNightPhase
        ? 6.8 * pulseFactor * rainGlowBoost
        : isDuskPhase
        ? 3.2 * rainGlowBoost
        : 0;
      pagodaNightLights.forEach((pl) => {
        pl.intensity = THREE.MathUtils.lerp(pl.intensity, targetPagodaLightIntensity, lerpSpeed);
      });
      const targetPagodaHaloOp = isNightPhase
        ? 0.28 * pulseFactor
        : isDuskPhase
        ? 0.12 * pulseFactor
        : 0;
      pagodaNightHaloMats.forEach((hm, idx) => {
        hm.opacity = THREE.MathUtils.lerp(hm.opacity, targetPagodaHaloOp, lerpSpeed);
        if (pagodaNightHaloMeshes[idx]) {
          pagodaNightHaloMeshes[idx].visible = hm.opacity > 0.01;
        }
      });

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

      // 1. Animate Central Lightbulb Statue (XiaoDengPao: 平常是無臉雕像；點擊時露出微笑表情、招手並快速轉一圈)
      orbitRingGroup.rotation.y = -t * 1.2;
      if (t < xiaoDengPaoActiveUntil) {
        const xdpElapsed = t - xiaoDengPaoStartTime;
        xiaoDengPaoFeaturesGroup.visible = true;
        const popScale =
          xdpElapsed < 0.22
            ? THREE.MathUtils.clamp(xdpElapsed / 0.22, 0.01, 1)
            : xdpElapsed > 2.92
            ? THREE.MathUtils.clamp((3.2 - xdpElapsed) / 0.28, 0.01, 1)
            : 1.0;
        xiaoDengPaoFeaturesGroup.scale.setScalar(popScale);

        if (xdpElapsed < 1.85) {
          // 階段一：面向鏡頭露出微笑表情並熱情揮手招呼
          bulbGroup.rotation.y = THREE.MathUtils.lerp(
            bulbGroup.rotation.y,
            xiaoDengPaoFacingYaw,
            0.22,
          );
          bulbGroup.position.y =
            homeY + 4.85 + Math.abs(Math.sin(xdpElapsed * 7.5)) * 0.38;
          xiaoDengPaoRightArm.rotation.z = -1.65 + Math.sin(xdpElapsed * 16.0) * 0.52;
          xiaoDengPaoLeftArm.rotation.z = 0.25 + Math.sin(xdpElapsed * 8.0) * 0.15;
        } else {
          // 階段二：開心地快速轉一圈 (360° 旋轉)
          const spinRatio = THREE.MathUtils.clamp((xdpElapsed - 1.85) / 0.98, 0, 1);
          const easeInOut =
            spinRatio < 0.5
              ? 4 * spinRatio * spinRatio * spinRatio
              : 1 - Math.pow(-2 * spinRatio + 2, 3) / 2;
          bulbGroup.rotation.y = xiaoDengPaoFacingYaw + easeInOut * Math.PI * 2;
          bulbGroup.position.y =
            homeY + 4.85 + Math.sin(spinRatio * Math.PI) * 0.65;
          xiaoDengPaoRightArm.rotation.z = -1.25;
          xiaoDengPaoLeftArm.rotation.z = 1.25;
        }
      } else {
        xiaoDengPaoFeaturesGroup.visible = false;
        bulbGroup.rotation.y = t * 0.9;
        bulbGroup.position.y = homeY + 4.85 + Math.sin(t * 2.1) * 0.2;
      }

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
      // 晚上就不會有農夫了（日落而息，夜晚隱藏農夫 NPC）
      animatedFarmers.forEach((f) => {
        f.group.visible = !isNightPhase;
        if (!isNightPhase) {
          f.torso.rotation.x = Math.sin(t * 2.2 + f.phase) * 0.14;
        }
      });
      // 外圍空地村道村民：白天在村道往來散步，傍晚回家，晚上進入屋內休息（僅留少數夜遊村民在外）
      outerVillagers.forEach((ov) => {
        if (isNightPhase && !ov.staysOutsideAtNight) {
          ov.group.visible = false;
          ov.group.userData.isOutside = false;
          return;
        }
        ov.group.visible = true;
        ov.group.userData.isOutside = true;

        // 計算在村道起點 (homePos) 與散步點 (strollPos) 之間的往返進度
        const cycle = (Math.sin(t * ov.speed + ov.phase) + 1) * 0.5;
        // 傍晚時逐漸往家門方向靠攏
        const blend = isDuskPhase ? cycle * 0.35 : cycle;
        const nextBlend = isDuskPhase
          ? ((Math.sin((t + 0.05) * ov.speed + ov.phase) + 1) * 0.5) * 0.35
          : (Math.sin((t + 0.05) * ov.speed + ov.phase) + 1) * 0.5;

        const vx = THREE.MathUtils.lerp(ov.homePos[0], ov.strollPos[0], blend);
        const vz = THREE.MathUtils.lerp(ov.homePos[2], ov.strollPos[2], blend);
        const nx = THREE.MathUtils.lerp(ov.homePos[0], ov.strollPos[0], nextBlend);
        const nz = THREE.MathUtils.lerp(ov.homePos[2], ov.strollPos[2], nextBlend);

        ov.group.position.set(vx, ov.homePos[1], vz);
        if (Math.hypot(nx - vx, nz - vz) > 0.0005) {
          ov.group.rotation.y = Math.atan2(nx - vx, nz - vz);
        }

        const swing = Math.sin(t * 5.4 + ov.phase) * 0.42;
        ov.leftLeg.rotation.x = swing;
        ov.rightLeg.rotation.x = -swing;
        ov.leftArm.rotation.x = -swing * 0.7;
        ov.rightArm.rotation.x = swing * 0.7;
      });
      animatedChickens.forEach((c) => {
        c.head.rotation.x = Math.max(0, Math.sin(t * 4.2 + c.phase)) * 0.38;
      });
      animatedAnglers.forEach((ag) => {
        // 釣客釣竿隨水波微晃，偶爾輕微抖動提竿
        const nibble = Math.pow(Math.max(0, Math.sin(t * 1.8 + ag.phase)), 4) * 0.12;
        ag.rodGroup.rotation.x = Math.sin(t * 1.3 + ag.phase) * 0.035 - nibble;
      });

      // 3. Bobbing Moored Jiangnan Boat & Sailing Jiangnan Boats along Waterways（白天為烏篷漁船，晚上換成擁毳衣爐火的江南遊船）
      sailboat.position.y = -0.18 + Math.sin(t * 1.8) * 0.08;
      sailboat.rotation.z = Math.sin(t * 1.4) * 0.03;
      riverBoats.forEach((b, bIdx) => {
        b.dayFishingDecor.visible = !isNightPhase;
        b.nightPleasureDecor.visible = isNightPhase;

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

      // 4. Waterfall Foam Pulse, Falling Cascade Streaks, Cave Sparkle Light, Outer Dense Mist Drift & Cloud / Mist Drift
      waterfallDrops.forEach((drop, idx) => {
        drop.scale.setScalar(0.85 + Math.sin(t * 4.5 + idx) * 0.22);
      });
      waterfallFallingStreaks.forEach((st) => {
        const prog = (t * st.speed + st.phase) % 1;
        st.mesh.position.y = THREE.MathUtils.lerp(st.topY, st.bottomY, prog);
        st.mesh.position.z = THREE.MathUtils.lerp(st.topZ, st.bottomZ, prog);
      });
      caveEasterEggSparkles.forEach((sp) => {
        const pulse = 0.85 + Math.sin(t * 3.2 + sp.phase) * 0.28;
        sp.core.scale.setScalar(pulse);
        sp.halo.scale.setScalar(0.95 + Math.sin(t * 2.4 + sp.phase) * 0.35);
        sp.haloMat.opacity = 0.32 + Math.sin(t * 3.2 + sp.phase) * 0.22;
        const bobY = sp.baseY + Math.sin(t * 1.8 + sp.phase) * 0.14;
        sp.core.position.y = bobY;
        sp.halo.position.y = bobY;
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

      // 4.3 創點源原創角色動態更新（搜搜騰雲駕霧、白喵跨島過橋閒晃打滾睡覺、多慧主島熱情招呼、007躺翰林院屋頂、大熊在工作坊修理製作）
      // (A) 搜搜駕筋斗雲在天上騰雲駕霧（白天天空上可以飛東西，晚上就不飛了）
      const canFlyInDaySky = !isNightPhase;
      sousouCloudGroup.visible = canFlyInDaySky;
      if (canFlyInDaySky) {
        const ssAngle = t * 0.28;
        const ssNextAngle = ssAngle + 0.025;
        const ssX = Math.sin(ssAngle) * 38.0;
        const ssZ = Math.sin(ssAngle * 2) * 26.0;
        const ssY = 14.2 + Math.cos(ssAngle * 3) * 2.1 + Math.sin(t * 2.4) * 0.25;
        const ssNextX = Math.sin(ssNextAngle) * 38.0;
        const ssNextZ = Math.sin(ssNextAngle * 2) * 26.0;
        const ssNextY = 14.2 + Math.cos(ssNextAngle * 3) * 2.1;

        sousouCloudGroup.position.set(ssX, ssY, ssZ);
        sousouCloudGroup.rotation.y = Math.atan2(ssNextX - ssX, ssNextZ - ssZ);
        // 過彎傾角與俯仰騰雲感
        sousouCloudGroup.rotation.z = Math.cos(ssAngle * 2) * -0.18;
        sousouCloudGroup.rotation.x = THREE.MathUtils.clamp((ssNextY - ssY) * -1.4, -0.22, 0.22);
        sousouRightArm.rotation.x = -0.65 + Math.sin(t * 3.2) * 0.14;

        sousouTrailPuffs.forEach((puff, pIdx) => {
          const pulse = 0.82 + Math.sin(t * 6.5 - pIdx * 1.1) * 0.24;
          puff.scale.setScalar(pulse);
          puff.position.x = Math.sin(t * 4.2 - pIdx * 0.9) * (0.08 * (pIdx + 1));
          puff.position.y = -0.05 + Math.cos(t * 5.0 - pIdx) * 0.06;
        });
      }

      // (B) 白喵慵懶在各座島與橋間閒晃，有時躺下來打滾或睡覺（每 20 秒循環：12.5 秒閒晃 ➔ 3.5 秒躺下打滾 ➔ 4 秒睡覺冒泡泡）
      const bmCycleLen = 20.0;
      const bmWalkLen = 12.5;
      const bmRollLen = 3.5;
      const bmFullCycles = Math.floor(t / bmCycleLen);
      const bmPhaseTime = t % bmCycleLen;
      const bmEffectiveWalkTime =
        bmFullCycles * bmWalkLen + Math.min(bmPhaseTime, bmWalkLen);

      const bmTotalSegments = baiMiaoWaypoints.length;
      const bmProgress = (bmEffectiveWalkTime * 0.34) % bmTotalSegments;
      const bmSegIdx = Math.floor(bmProgress);
      const bmSegFrac = bmProgress - bmSegIdx;
      const bmP0 = baiMiaoWaypoints[bmSegIdx % bmTotalSegments];
      const bmP1 = baiMiaoWaypoints[(bmSegIdx + 1) % bmTotalSegments];

      const bmCurX = THREE.MathUtils.lerp(bmP0[0], bmP1[0], bmSegFrac);
      const bmCurY = THREE.MathUtils.lerp(bmP0[1], bmP1[1], bmSegFrac);
      const bmCurZ = THREE.MathUtils.lerp(bmP0[2], bmP1[2], bmSegFrac);

      baiMiaoRoot.position.set(bmCurX, bmCurY, bmCurZ);
      baiMiaoRoot.rotation.y = Math.atan2(bmP1[0] - bmP0[0], bmP1[2] - bmP0[2]);

      if (bmPhaseTime < bmWalkLen) {
        // 狀態 1：慵懶閒晃散步
        baiMiaoBodyPivot.rotation.z = THREE.MathUtils.lerp(baiMiaoBodyPivot.rotation.z, 0, 0.15);
        baiMiaoBodyPivot.rotation.x = Math.sin(t * 4.8) * 0.04;
        baiMiaoBodyPivot.position.y = Math.abs(Math.sin(t * 4.8)) * 0.06;
        const pawSwing = Math.sin(t * 4.8) * 0.38;
        bmFrontLeftPaw.rotation.x = pawSwing;
        bmBackRightPaw.rotation.x = pawSwing;
        bmFrontRightPaw.rotation.x = -pawSwing;
        bmBackLeftPaw.rotation.x = -pawSwing;
        baiMiaoTailPivot.rotation.z = Math.sin(t * 3.2) * 0.35;
        baiMiaoSleepBubbles.forEach((b) => {
          b.mesh.visible = false;
        });
      } else if (bmPhaseTime < bmWalkLen + bmRollLen) {
        // 狀態 2：躺下來開心打滾
        const rollElapsed = bmPhaseTime - bmWalkLen;
        baiMiaoBodyPivot.rotation.z = Math.sin(rollElapsed * 4.2) * 1.35;
        baiMiaoBodyPivot.position.y = 0.14;
        const wiggle = Math.sin(t * 11.0) * 0.45;
        bmFrontLeftPaw.rotation.x = wiggle;
        bmFrontRightPaw.rotation.x = -wiggle;
        bmBackLeftPaw.rotation.x = -wiggle;
        bmBackRightPaw.rotation.x = wiggle;
        baiMiaoTailPivot.rotation.z = Math.sin(t * 7.5) * 0.55;
        baiMiaoSleepBubbles.forEach((b) => {
          b.mesh.visible = false;
        });
      } else {
        // 狀態 3：側躺蜷縮睡覺 + 呼吸起伏與睡眠泡泡
        baiMiaoBodyPivot.rotation.z = THREE.MathUtils.lerp(
          baiMiaoBodyPivot.rotation.z,
          1.42,
          0.12,
        );
        baiMiaoBodyPivot.position.y = 0.12 + Math.sin(t * 2.2) * 0.025;
        bmFrontLeftPaw.rotation.x = 0.2;
        bmFrontRightPaw.rotation.x = 0.2;
        bmBackLeftPaw.rotation.x = -0.2;
        bmBackRightPaw.rotation.x = -0.2;
        baiMiaoTailPivot.rotation.z = Math.sin(t * 1.4) * 0.12;

        baiMiaoSleepBubbles.forEach((b, bIdx) => {
          b.mesh.visible = true;
          const bCycle = (t * 0.65 + bIdx * 0.33) % 1;
          b.mesh.position.set(
            0.25 + Math.sin(bCycle * Math.PI * 2 + bIdx) * 0.12,
            0.65 + bCycle * 1.15,
            0.18,
          );
          b.mesh.scale.setScalar(0.6 + bCycle * 0.85);
          b.mat.opacity = Math.sin(bCycle * Math.PI) * 0.85;
        });
      }

      // (C) 多慧在主島熱情的招呼新來的小人，有時會拍拍翅膀
      const dhCycle = t % 6.0;
      const dhWalkX = 1.65 + Math.sin(t * 0.52) * 1.75;
      const dhWalkZ = 4.95 + Math.cos(t * 0.38) * 0.95;
      duohuiRoot.position.x = dhWalkX;
      duohuiRoot.position.z = dhWalkZ;

      // 朝向主島南岸碼頭與廣場新來的小人方向熱情招呼
      const dhTargetYaw = Math.atan2(-dhWalkX * 0.6, 7.5 - dhWalkZ) + Math.sin(t * 1.2) * 0.45;
      duohuiRoot.rotation.y = dhTargetYaw;

      if (dhCycle < 2.4) {
        // 熱情拍拍翅膀並輕快跳躍招呼小人
        const flapAngle = Math.abs(Math.sin(t * 15.0)) * 0.95;
        duohuiLeftWing.rotation.z = flapAngle + 0.15;
        duohuiRightWing.rotation.z = -(flapAngle + 0.15);
        duohuiBodyPivot.position.y = Math.abs(Math.sin(t * 7.5)) * 0.22;
        duohuiBodyPivot.rotation.x = Math.sin(t * 7.5) * 0.12;
      } else {
        // 親切點頭微笑迎賓與輕搖翅膀
        const gentleFlap = Math.sin(t * 3.6) * 0.18;
        duohuiLeftWing.rotation.z = 0.12 + Math.max(0, gentleFlap);
        duohuiRightWing.rotation.z = -0.12 - Math.max(0, gentleFlap);
        duohuiBodyPivot.position.y = Math.abs(Math.sin(t * 3.6)) * 0.06;
        duohuiBodyPivot.rotation.x = Math.max(0, Math.sin(t * 3.6)) * 0.16;
      }

      // (D) 007 躺在翰林院屋頂上（頭頂雷達碟旋轉、悠閒晃腳與查看發光情報平板）
      agent007RadarPivot.rotation.y = t * 2.4;
      a007LeftArmPivot.rotation.z = Math.sin(t * 2.0) * 0.08;
      a007RightLeg.rotation.x = -0.42 + Math.sin(t * 2.6) * 0.12;

      // (E) 紅色安全帽大熊在工作坊作勢修理或製作東西（揮動大木槌敲擊、轉動機關齒輪與迸發鍛造火花）
      const hammerWave = Math.sin(t * 6.8);
      // 下槌時快速落下、抬起時蓄力
      const hammerAngle = hammerWave > 0 ? -hammerWave * 0.95 : -hammerWave * 0.55;
      bearRightArmPivot.rotation.x = hammerAngle;
      bearLeftArmPivot.rotation.y = Math.sin(t * 3.4) * 0.22;
      bearBodyPivot.rotation.x = Math.max(0, -hammerWave) * 0.12;
      bearHeadGroup.rotation.z = Math.sin(t * 3.4) * 0.08;
      bearCraftItemPivot.rotation.y = t * 1.4;

      const impactIntensity = Math.max(0, -hammerWave - 0.55) / 0.45;
      sparkMat.opacity = impactIntensity * 0.95;
      bearCraftSparks.forEach((sp, sIdx) => {
        const sAngle = (sIdx / bearCraftSparks.length) * Math.PI * 2 + t * 3.0;
        const spread = impactIntensity * 0.26;
        sp.position.set(
          -0.06 + Math.cos(sAngle) * spread,
          0.74 + impactIntensity * (0.14 + (sIdx % 2) * 0.1),
          Math.sin(sAngle) * spread,
        );
        sp.scale.setScalar(0.5 + impactIntensity * 0.9);
      });

      // 4.4 夜晚水上水燈飄蕩 & 晚上好天氣時祈福天燈冉冉升空
      nightWaterLanternGroup.visible = isNightPhase;
      if (isNightPhase) {
        const lanternPulse = 1.9 + Math.sin(t * 3.5) * 0.35;
        waterLanternCoreMat.emissiveIntensity = lanternPulse;
        nightWaterLanterns.forEach((wl, idx) => {
          const driftT = t * wl.speed + wl.phase;
          wl.group.position.x = wl.baseX + Math.sin(driftT) * wl.driftRadiusX;
          wl.group.position.z = wl.baseZ + Math.cos(driftT * 0.85) * wl.driftRadiusZ;
          wl.group.position.y = -0.22 + Math.sin(t * 2.4 + idx) * 0.03;
          wl.group.rotation.y = driftT * 0.4;
        });
      }

      const showSkyLanterns = isNightPhase && !isRain;
      nightSkyLanternGroup.visible = showSkyLanterns;
      if (showSkyLanterns) {
        skyLanternBodyMat.emissiveIntensity = 2.0 + Math.sin(t * 4.2) * 0.3;
        nightSkyLanterns.forEach((sl, idx) => {
          const cycle = (t * sl.speed + sl.phase) % 1;
          const curY = 5.5 + cycle * 30.0;
          const swayX = Math.sin(t * 0.65 + idx * 1.3) * sl.swayAmp;
          const swayZ = Math.cos(t * 0.55 + idx * 1.7) * sl.swayAmp;
          sl.group.position.set(sl.originX + swayX, curY, sl.originZ + swayZ);
          sl.group.rotation.y = t * 0.3 + idx;
          sl.group.rotation.z = Math.sin(t * 1.2 + idx) * 0.06;
          // 剛升空與高空處平滑縮放過渡
          const edgeScale =
            cycle < 0.1
              ? THREE.MathUtils.clamp(cycle / 0.1, 0.01, 1)
              : cycle > 0.88
              ? THREE.MathUtils.clamp((1 - cycle) / 0.12, 0.01, 1)
              : 1.0;
          sl.group.scale.setScalar(edgeScale);
        });
      }

      // 4.5 白天好天氣時偶爾飛過天際的飛鳥群（白天天空上可以飛東西，晚上就不飛了）
      const isGoodWeatherForBirds = !isRain && canFlyInDaySky;
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

      if (!hasSignaledReady) {
        renderedFrameCount += 1;
        if (renderedFrameCount >= 2) {
          hasSignaledReady = true;
          setIsSceneLoading(false);
        }
      }

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

    let renderedFrameCount = 0;
    let hasSignaledReady = false;
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

    teardownScene = () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('pointerdown', handleCanvasPointerDown);
      window.removeEventListener('pointerup', handleCanvasPointerUp);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      envTarget.dispose();
      renderer.dispose();
      if (canvas.parentNode === container) {
        container.removeChild(canvas);
      }
    };
    }, 48);

    return () => {
      cancelled = true;
      window.clearTimeout(bootTimer);
      if (easterEggTimerRef.current !== null) {
        window.clearTimeout(easterEggTimerRef.current);
      }
      if (teardownScene) {
        teardownScene();
      }
    };
  }, []);

  if (webglFailed) {
    return null;
  }

  return (
    <div className="island-webgl-wrapper">
      <div ref={mountRef} className="island-webgl-canvas-mount" />

      {/* 桃花源記彩蛋詩文卷軸浮窗（點擊山洞或農田時優雅浮現） */}
      {easterEggToast && (
        <div
          key={easterEggToast.key}
          onClick={() => setEasterEggToast(null)}
          className="island-ui-interactive fixed top-20 left-1/2 z-40 -translate-x-1/2 cursor-pointer select-none px-4"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-amber-700/35 bg-[#fbf6eb]/95 px-6 py-3.5 shadow-[0_14px_38px_rgba(32,24,16,0.28)] backdrop-blur-md transition-all duration-300">
            <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
            <p className="font-serif text-base font-bold tracking-widest text-stone-800 sm:text-lg">
              {easterEggToast.verse}
            </p>
            <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
          </div>
        </div>
      )}

      {/* 3D 地圖載入中提示與轉圈圈動畫 */}
      <div
        className={`pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center transition-opacity duration-500 ${
          isSceneLoading ? 'opacity-100' : 'opacity-0'
        }`}
        aria-live="polite"
        aria-busy={isSceneLoading}
      >
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-amber-200/60 bg-stone-900/75 px-8 py-6 text-center shadow-2xl backdrop-blur-md">
          {/* 雙環轉圈圈動畫 */}
          <div className="relative flex h-14 w-14 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-amber-200/20" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-amber-400 border-r-amber-300" />
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-b-teal-300 border-l-teal-400"
              style={{ animationDirection: 'reverse', animationDuration: '1.4s' }}
            />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_10px_#fcd34d]" />
          </div>

          <div className="space-y-1">
            <div className="text-base font-black tracking-wider text-amber-100">
              正在載入創點源 3D 地圖...
            </div>
            <div className="text-xs font-medium text-stone-300">{loadingHint}</div>
          </div>

          {/* 動態進度光條 */}
          <div className="h-1.5 w-48 overflow-hidden rounded-full bg-stone-700/80">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-teal-400 via-amber-300 to-amber-500" />
          </div>
        </div>
      </div>

      {/* 3D World-Projected Floating Callout Badges (分級顯示：<75% 一級島名，>=75% 只顯示二級，>=100% 顯示三級) */}
      <div
        className={`island-3d-labels-layer transition-opacity duration-300 ${
          isSceneLoading ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
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
