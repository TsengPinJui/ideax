import os

configs = """import * as THREE from 'three';
import { RegionManifest } from './types';

export const REGION_A_STREET: RegionManifest = {
  id: 'region-a-street',
  name: '創點老街',
  subtitle: '古風匠心坊市與跨河青石街',
  defaultSpawn: {
    position: [0, 0, -24],
    yaw: 0,
  },
  groundBounds: {
    width: 48,
    depth: 76,
  },
  ambientColor: 0xfff1db,
  sunColor: 0xffe2aa,
  fogColor: 0xf5ebd9,
  fogNear: 22,
  fogFar: 68,
  skyColors: {
    top: '#fed7aa',
    bottom: '#fef3c7',
  },
  roadBounds: [
    { minX: -5.5, maxX: 5.5, minZ: -32, maxZ: 21 },
    { minX: -3.8, maxX: 3.8, minZ: 21, maxZ: 31 },
    { minX: -6.5, maxX: 6.5, minZ: 31, maxZ: 38 },
  ],
  bridges: [
    {
      id: 'bridge-old-stream',
      minX: -4.0,
      maxX: 4.0,
      minZ: 20.5,
      maxZ: 31.5,
      bridgeCenterZ: 26.0,
      bridgeSpanZ: 10.0,
      bridgeMaxHeight: 1.45,
    },
  ],
  colliders: [
    { id: 'bld-workshop', type: 'box', x: -10, z: -12, halfWidth: 4.2, halfDepth: 5.5 },
    { id: 'bld-academy', type: 'box', x: 10, z: -10, halfWidth: 4.5, halfDepth: 5.8 },
    { id: 'bld-pavilion', type: 'box', x: -10, z: 8, halfWidth: 4.2, halfDepth: 5.2 },
    { id: 'bld-vault', type: 'box', x: 10, z: 10, halfWidth: 4.2, halfDepth: 5.5 },
    { id: 'fence-river-north-left', type: 'box', x: -13, z: 20.8, halfWidth: 9, halfDepth: 0.6 },
    { id: 'fence-river-north-right', type: 'box', x: 13, z: 20.8, halfWidth: 9, halfDepth: 0.6 },
    { id: 'fence-river-south-left', type: 'box', x: -13, z: 31.2, halfWidth: 9, halfDepth: 0.6 },
    { id: 'fence-river-south-right', type: 'box', x: 13, z: 31.2, halfWidth: 9, halfDepth: 0.6 },
    { id: 'bridge-rail-left', type: 'box', x: -4.1, z: 26, halfWidth: 0.35, halfDepth: 5.2 },
    { id: 'bridge-rail-right', type: 'box', x: 4.1, z: 26, halfWidth: 0.35, halfDepth: 5.2 },
  ],
  buildings: [
    {
      id: 'building-workshop',
      name: '天工坊',
      subtitle: '創新解方・原型試製工坊',
      position: new THREE.Vector3(-6.2, 0, -12),
      interactionRadius: 4.5,
      description: '彙集硬體創客、軟體架構師與全端工程師的共創聚落，提供實體與虛擬產品原型驗證服務。',
      targetModule: 'create_ideas',
      previewBadge: '原型驗證中',
      previewFeatures: [
        '可預約專家 1 對 1 架構諮詢',
        '開放中小型 AI / 物聯網 PoC 原型認領',
        '代管履約里程碑交付與代碼審查',
      ],
      mockData: {
        stats: '目前在製工單：8 件・可承接專家：14 位',
        notice: '週三開放自由創客交流茶會，歡迎攜帶點子進駐。',
        primaryActionLabel: '預約工坊共創席位',
      },
    },
    {
      id: 'building-academy',
      name: '翰林院',
      subtitle: '專家認證・平台智庫中樞',
      position: new THREE.Vector3(6.2, 0, -10),
      interactionRadius: 4.5,
      description: '匯集產業顧問、專利代理人與技術評審的認證殿堂，負責高階題目審查與解方質量把關。',
      targetModule: 'solvers',
      previewBadge: '專家認證受理中',
      previewFeatures: [
        '申請通過可獲得「翰林專家」徽章與專屬派單',
        '查閱各領域技術評估報告與歷史題庫解析',
        '可發起線上專家跨領域圓桌會談',
      ],
      mockData: {
        stats: '已認證解題官：62 位・平均回覆：2.4 小時',
        notice: '本月開放綠能科技與邊緣運算領域專家資格審核。',
        primaryActionLabel: '查閱專家智庫名單',
      },
    },
    {
      id: 'building-pavilion',
      name: '墨香閣',
      subtitle: '企劃撰寫・社群腦力激盪堂',
      position: new THREE.Vector3(-6.2, 0, 8),
      interactionRadius: 4.5,
      description: '提供創意思維引導、痛點釐清框架與企劃書智能協作，助你將零散靈感轉化為商業計畫。',
      targetModule: 'chat',
      previewBadge: '自由討論熱絡',
      previewFeatures: [
        'AI 輔助痛點樹狀圖與商業畫布產生',
        '社群同儕匿名點子盲測與回饋評分',
        '即時多人協作靈感便箋看板',
      ],
      mockData: {
        stats: '今日在線交流：29 人・新發布痛點：11 則',
        notice: '點擊可預覽正在發生的靈感討論串。',
        primaryActionLabel: '進入靈感交流沙龍',
      },
    },
    {
      id: 'building-vault',
      name: '百寶庫',
      subtitle: '懸賞點數・合約與託管金庫',
      position: new THREE.Vector3(6.2, 0, 10),
      interactionRadius: 4.5,
      description: '平台金融交易與安全信託樞紐，確保每筆委託之懸賞點數均享有雙向履約保障與里程碑撥款。',
      targetModule: 'topup',
      previewBadge: '金流安全託管',
      previewFeatures: [
        '點數購買、儲值優惠與發票統編管理',
        '查閱託管合約進度與驗收撥款明細',
        '申請信譽保證金退回與提領作業',
      ],
      mockData: {
        stats: '託管保障金池：NT$ 3,850,000・履約完成率：99.4%',
        notice: '所有交易皆受 IdeaX 平台爭議調解仲裁保護。',
        primaryActionLabel: '查看個人點數資產',
      },
    },
  ],
  portals: [
    {
      id: 'portal-to-pier',
      name: '凌雲隘口',
      description: '穿過老街南端石牌樓，通往波光粼粼的「星河碼頭」',
      position: new THREE.Vector3(0, 0, 36.5),
      triggerRadius: 2.2,
      targetRegionId: 'region-b-pier',
      targetSpawnPosition: new THREE.Vector3(0, 0, -22),
      targetYaw: 0,
      colorHex: 0x38bdf8,
    },
  ],
};

export const REGION_B_PIER: RegionManifest = {
  id: 'region-b-pier',
  name: '星河碼頭',
  subtitle: '水畔棧道・創星季出海口',
  defaultSpawn: {
    position: [0, 0, -22],
    yaw: 0,
  },
  groundBounds: {
    width: 52,
    depth: 66,
  },
  ambientColor: 0xe0f2fe,
  sunColor: 0xfef08a,
  fogColor: 0xe0f2fe,
  fogNear: 24,
  fogFar: 72,
  skyColors: {
    top: '#bae6fd',
    bottom: '#e0f2fe',
  },
  roadBounds: [
    { minX: -6.0, maxX: 6.0, minZ: -26, maxZ: -16 },
    { minX: -5.0, maxX: 5.0, minZ: -16, maxZ: 18 },
    { minX: -14.0, maxX: 14.0, minZ: 6, maxZ: 16 },
  ],
  bridges: [],
  colliders: [
    { id: 'bld-station', type: 'box', x: -11, z: -6, halfWidth: 4.8, halfDepth: 5.2 },
    { id: 'bld-observatory', type: 'box', x: 11, z: -4, halfWidth: 4.5, halfDepth: 5.5 },
    { id: 'bld-guild', type: 'box', x: -12, z: 12, halfWidth: 4.2, halfDepth: 4.8 },
    { id: 'pier-rail-left', type: 'box', x: -5.4, z: -3, halfWidth: 0.35, halfDepth: 12 },
    { id: 'pier-rail-right', type: 'box', x: 5.4, z: -3, halfWidth: 0.35, halfDepth: 12 },
    { id: 'pier-rail-east-end', type: 'box', x: 14.5, z: 11, halfWidth: 0.35, halfDepth: 5.5 },
    { id: 'pier-rail-south-head', type: 'box', x: 0, z: 18.5, halfWidth: 5.5, halfDepth: 0.35 },
  ],
  buildings: [
    {
      id: 'building-station',
      name: '星河驛站',
      subtitle: '創星季・專案啟航接駁碼頭',
      position: new THREE.Vector3(-6.2, 0, -6),
      interactionRadius: 4.5,
      description: '年度最大規模創星季競賽的核心報到站，提供參賽提案諮詢、投資意向書遞交與時程指引。',
      targetModule: 'star_season',
      previewBadge: '11月限定創星季',
      previewFeatures: [
        '提交創新提案參加 300 萬總獎金與創星幣注資',
        '對接天使投資人、產業評審與海外加速器',
        '享有官方全通路曝光與媒體專訪宣傳',
      ],
      mockData: {
        stats: '已入選提案：42 件・爭取總獎金：NT$ 3,000,000',
        notice: '目前熱烈徵件中！至 11 月底截止評選。',
        primaryActionLabel: '前往創星季投稿辦法',
      },
    },
    {
      id: 'building-observatory',
      name: '觀星水榭',
      subtitle: '大數據・未來科技趨勢觀測台',
      position: new THREE.Vector3(6.5, 0, -4),
      interactionRadius: 4.5,
      description: '高居水畔的八角觀景水榭，實時投影全島熱門搜尋詞、痛點解決熱力圖與前瞻科技指數。',
      targetModule: 'leaderboard',
      previewBadge: '即時數據雷達',
      previewFeatures: [
        '全平台搜尋關鍵字排行榜與人氣痛點排行',
        '產業垂直領域熱度預測與市場缺口探測',
        '專家聲量排名與用戶滿意度榜單',
      ],
      mockData: {
        stats: '今日監測詞條：1,420 條・熱度最高：AI工作流',
        notice: '每小時更新一次即時趨勢雷達動態。',
        primaryActionLabel: '探索即時榜單',
      },
    },
    {
      id: 'building-guild',
      name: '遠航商會',
      subtitle: '通路媒合・商務拓展中心',
      position: new THREE.Vector3(-7.5, 0, 11),
      interactionRadius: 4.5,
      description: '連接海內外企業採購需求、技術轉移與產品落地的商務中心，定期舉辦跨國遠航商洽對接會。',
      targetModule: 'job_explorer',
      previewBadge: '商機媒合中',
      previewFeatures: [
        '企業痛點採購外包招標合約清單',
        '專利與智慧財產權授權轉移平台',
        '跨國市場經銷代理與技術落地對接',
      ],
      mockData: {
        stats: '進行中商洽案件：18 案・媒合成功率：87%',
        notice: '最新公布東南亞跨境電商技術採購案。',
        primaryActionLabel: '查看商務需求列表',
      },
    },
  ],
  portals: [
    {
      id: 'portal-to-street',
      name: '老街棧道口',
      description: '由此北上穿過水榭廊道，返回熱鬧的「創點老街」',
      position: new THREE.Vector3(0, 0, -25.5),
      triggerRadius: 2.2,
      targetRegionId: 'region-a-street',
      targetSpawnPosition: new THREE.Vector3(0, 0, 31.5),
      targetYaw: Math.PI,
      colorHex: 0xf59e0b,
    },
  ],
};

export const REGION_CONFIGS: Record<string, RegionManifest> = {
  'region-a-street': REGION_A_STREET,
  'region-b-pier': REGION_B_PIER,
};
"""

with open('src/components/kingdom3d/regionConfigs.ts', 'w') as f:
    f.write(configs)
print("Wrote regionConfigs.ts successfully")
