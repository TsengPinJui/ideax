import * as THREE from 'three';

export type RegionId =
  | 'region-home'
  | 'region-pain'
  | 'region-discussion'
  | 'region-creative'
  | 'region-career';

export type RegionStatus =
  | 'unloaded'
  | 'loading'
  | 'loaded'
  | 'active'
  | 'unloading'
  | 'error';

export interface RectWalkableZone {
  type: 'rect';
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface EllipseWalkableZone {
  type: 'ellipse';
  cx: number;
  cz: number;
  rx: number;
  rz: number;
}

export interface CorridorWalkableZone {
  type: 'corridor';
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  halfWidth: number;
}

export type WalkableZone =
  | RectWalkableZone
  | EllipseWalkableZone
  | CorridorWalkableZone;

export interface BridgeZone {
  id: string;
  name: string;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  halfWidth: number;
  bridgeMaxHeight: number;
  fromRegionId: RegionId;
  toRegionId: RegionId;
}

export interface BoxCollider {
  id: string;
  type: 'box';
  x: number;
  z: number;
  halfWidth: number;
  halfDepth: number;
}

export interface CylinderCollider {
  id: string;
  type: 'cylinder';
  x: number;
  z: number;
  radius: number;
}

export interface SegmentCollider {
  id: string;
  type: 'segment';
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  halfThickness: number;
}

export type Collider = BoxCollider | CylinderCollider | SegmentCollider;

export interface CourtyardWallSegment {
  id: string;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  height: number;
  hasMoonGate?: boolean;
  gateWidth?: number;
  gateLabel?: string;
  colorHex?: number;
}

export interface Portal {
  id: string;
  name: string;
  description: string;
  position: THREE.Vector3;
  triggerRadius: number;
  targetRegionId: RegionId;
  targetSpawnPosition: THREE.Vector3;
  targetYaw: number;
  colorHex?: number;
}

export interface BuildingInteractable {
  id: string;
  name: string;
  subtitle: string;
  /** Center position of the walk-in building (floor y = 0) */
  position: THREE.Vector3;
  /** Y-axis rotation in radians (local +Z is the front entrance wall) */
  facingYaw: number;
  /** Building footprint width (local X) */
  width: number;
  /** Building footprint depth (local Z) */
  depth: number;
  /** Wall height (local Y) */
  height: number;
  /** Open entrance doorway width on the front (+Z) wall */
  doorWidth?: number;
  /** 可走上去的樓層數（例如創點樓 3 層）；沒有設定就是單層 */
  floors?: number;
  /** 地下樓層數（例如創點樓的地下一樓） */
  basements?: number;
  /** 外觀造型（照 /island）：展覽館＝白牆木柱＋藍玻璃採光穹頂；電玩城＝深色館體＋屋頂大手把；土樓＝圓形土樓包住中央樓閣 */
  exterior?: 'exhibition' | 'arcade' | 'tulou' | 'huizhou' | 'board' | 'temple' | 'bearShop' | 'libraryTower';
  /** 招牌名稱下方的小字 */
  signSub?: string;
  /** 館內駐守的角色（求職廟：搜搜，兩側畫卷顯示搜尋結果） */
  npc?: 'soso';
  /** Number of stacked architectural roof tiers (1, 2, 3, or 4) */
  tiers?: number;
  /** Solid whitebox blockout accent color */
  colorHex: number;
  /** Interior interaction radius around the center of the building */
  interactionRadius: number;
  description: string;
  targetModule: string;
  previewBadge: string;
  previewFeatures: string[];
  mockData: {
    stats: string;
    notice: string;
    primaryActionLabel: string;
  };
}

export interface RegionManifest {
  id: RegionId;
  name: string;
  shortName: string;
  compassLabel: string;
  subtitle: string;
  center: [number, number];
  islandRadiusX: number;
  islandRadiusZ: number;
  plazaRadius: number;
  defaultSpawn: {
    position: [number, number, number];
    yaw: number;
  };
  ambientColor: number;
  sunColor: number;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  islandColorHex: number;
  plazaColorHex: number;
  walkableZones: WalkableZone[];
  colliders: Collider[];
  buildings: BuildingInteractable[];
  courtyardWalls?: CourtyardWallSegment[];
  portals: Portal[];
  landmark?: {
    name: string;
    x: number;
    z: number;
    radius: number;
    height: number;
    colorHex: number;
  };
}

export interface TouchStickState {
  active: boolean;
  touchId: number | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  vectorX: number; // -1 to 1
  vectorY: number; // -1 to 1
}

export interface TouchLookState {
  active: boolean;
  touchId: number | null;
  lastX: number;
  lastY: number;
  deltaX: number;
  deltaY: number;
}

export interface QualitySettings {
  resolutionScale: number; // 0.5, 0.75, 1.0
  shadows: boolean;
  renderDistance: number;
  headBob: boolean;
  sensitivity: number;
  showColliders?: boolean;
  moveSpeedMultiplier?: number;
  /** 精緻畫質：柔和陰影、燈籠泛光、反鋸齒 */
  fancy?: boolean;
}

export interface DevPerformanceMetrics {
  fps: number;
  frameTimeMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  activeRegionId: RegionId;
  regionStatus: RegionStatus;
  loadTimeMs: number;
  playerPos: { x: number; y: number; z: number };
  yawDeg: number;
  pitchDeg: number;
  resolutionScale: number;
  shadowsEnabled: boolean;
  nearBuilding: BuildingInteractable | null;
  nearPortal: Portal | null;
  currentSpaceLabel?: string;
}
