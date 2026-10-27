import * as THREE from 'three';
import {
  RegionId,
  RegionStatus,
  RegionManifest,
  BuildingInteractable,
  Collider,
} from './types';
import {
  REGION_CONFIGS,
  ALL_REGION_IDS,
  WORLD_BRIDGES,
  getBridgeSideColliders,
} from './regionConfigs';
import {
  MaterialPalette,
  createHollowBuildingBlockout,
  createCourtyardWallMesh,
  createStoneArchBridge,
  createIslandWhiteboxBase,
  createColliderWireframes,
} from './ProceduralAssets';

export interface RegionLoadedData {
  manifest: RegionManifest;
  sceneGroup: THREE.Group;
  colliderDebugGroup: THREE.Group;
  buildings: BuildingInteractable[];
  colliders: Collider[];
}

export class RegionManager {
  public scene: THREE.Scene;
  public activeRegionId: RegionId = 'region-home';
  public failedTargetRegionId: RegionId | null = null;
  public status: RegionStatus = 'unloaded';
  public progress: number = 0;
  public errorMessage: string | null = null;
  public loadDurationMs: number = 0;
  public simulateNextError: boolean = false;
  public showColliderWireframes: boolean = false;

  // Shared material palette across the whitebox archipelago
  public sharedMaterials: MaterialPalette;
  // Persistent archipelago foundation (sea, island bases, and 6 connecting bridges)
  public archipelagoBaseGroup: THREE.Group;

  // Active region & loaded regions map
  public activeData: RegionLoadedData | null = null;
  public loadedRegions: Map<RegionId, RegionLoadedData> = new Map();

  // Callbacks
  public onStatusChange?: (status: RegionStatus, progress: number) => void;
  public onError?: (error: string) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.sharedMaterials = new MaterialPalette();
    this.archipelagoBaseGroup = new THREE.Group();
    this.archipelagoBaseGroup.name = 'archipelago_shared_base';
    this.buildArchipelagoFoundation();
    this.scene.add(this.archipelagoBaseGroup);
  }

  /**
   * Build the shared sea plane, 5 island base platforms, and 4 arched bridges connecting to 主島
   */
  private buildArchipelagoFoundation() {
    // 1. Calm Sea Water Expanse
    const seaGeo = new THREE.PlaneGeometry(360, 320);
    const seaMesh = new THREE.Mesh(seaGeo, this.sharedMaterials.waterMat);
    seaMesh.rotation.x = -Math.PI / 2;
    seaMesh.position.set(0, -0.35, 0);
    this.archipelagoBaseGroup.add(seaMesh);

    // 2. 5 Island Landmass & Plaza Bases
    for (const id of ALL_REGION_IDS) {
      const manifest = REGION_CONFIGS[id];
      const baseGroup = createIslandWhiteboxBase(manifest, this.sharedMaterials);
      this.archipelagoBaseGroup.add(baseGroup);
    }

    // 3. 4 Arched Stone Bridges connecting 主島 to the 4 outer islands
    for (const bridge of WORLD_BRIDGES) {
      const bridgeMesh = createStoneArchBridge(bridge, this.sharedMaterials);
      this.archipelagoBaseGroup.add(bridgeMesh);
    }
  }

  private setStatus(status: RegionStatus, progress: number = 0) {
    this.status = status;
    this.progress = progress;
    this.onStatusChange?.(status, progress);
  }

  /**
   * Toggle debug wireframe visibility for all colliders
   */
  public setColliderWireframeVisible(visible: boolean) {
    this.showColliderWireframes = visible;
    for (const [, data] of this.loadedRegions) {
      data.colliderDebugGroup.visible = visible;
    }
  }

  /**
   * Assemble 3D hollow buildings, courtyard walls, and debug wireframes for a region
   */
  private async assembleRegionGroup(
    manifest: RegionManifest,
    onProgress: (p: number) => void
  ): Promise<RegionLoadedData> {
    const startTime = performance.now();
    const group = new THREE.Group();
    group.name = `region_buildings_${manifest.id}`;

    onProgress(20);
    await new Promise((r) => setTimeout(r, 35));

    if (this.simulateNextError) {
      this.simulateNextError = false;
      onProgress(50);
      await new Promise((r) => setTimeout(r, 110));
      throw new Error(
        `分區「${manifest.name} (${manifest.id})」資產清單載入失敗：模擬網路逾時或幾何建構中斷`
      );
    }

    // 1. Courtyard Walls & Moon Gates (e.g., 徵才島的圍牆與月洞門)
    if (manifest.courtyardWalls && manifest.courtyardWalls.length > 0) {
      for (const wallSeg of manifest.courtyardWalls) {
        const wallMesh = createCourtyardWallMesh(wallSeg, this.sharedMaterials);
        group.add(wallMesh);
      }
    }

    onProgress(55);
    await new Promise((r) => setTimeout(r, 35));

    // 2. Walk-In Hollow Main Buildings (主要建築物內皆可走入)
    for (const b of manifest.buildings) {
      const bldMesh = createHollowBuildingBlockout(b, this.sharedMaterials);
      group.add(bldMesh);
    }

    // 3. Debug Collider Wireframe Group
    const colliderDebugGroup = createColliderWireframes(manifest.colliders);
    colliderDebugGroup.visible = this.showColliderWireframes;
    group.add(colliderDebugGroup);

    onProgress(100);
    this.loadDurationMs = Math.round(performance.now() - startTime);

    return {
      manifest,
      sceneGroup: group,
      colliderDebugGroup,
      buildings: manifest.buildings,
      colliders: manifest.colliders,
    };
  }

  /**
   * Load and activate a region, while asynchronously loading remaining islands
   * so bridge walking across the entire 5-island map is seamless.
   */
  public async loadRegion(regionId: RegionId): Promise<RegionLoadedData> {
    const manifest = REGION_CONFIGS[regionId];
    if (!manifest) {
      this.failedTargetRegionId = regionId;
      this.setStatus('error', 0);
      this.errorMessage = `無效的區域 ID: ${regionId}`;
      this.onError?.(this.errorMessage);
      throw new Error(this.errorMessage);
    }

    this.errorMessage = null;
    this.failedTargetRegionId = null;
    this.setStatus('loading', 10);

    try {
      if (this.simulateNextError && this.loadedRegions.has(regionId)) {
        const existing = this.loadedRegions.get(regionId)!;
        this.scene.remove(existing.sceneGroup);
        this.disposeGroup(existing.sceneGroup);
        this.loadedRegions.delete(regionId);
      }

      let data = this.loadedRegions.get(regionId);
      if (!data) {
        data = await this.assembleRegionGroup(manifest, (p) => {
          this.setStatus('loading', p);
        });
        this.loadedRegions.set(regionId, data);
        this.scene.add(data.sceneGroup);
      } else {
        this.loadDurationMs = 0;
        if (!this.scene.children.includes(data.sceneGroup)) {
          this.scene.add(data.sceneGroup);
        }
      }

      this.setStatus('loaded', 100);
      this.activeRegionId = regionId;
      this.activeData = data;
      this.setStatus('active', 100);

      // Preload all other islands in the background so walking across any bridge is seamless
      for (const otherId of ALL_REGION_IDS) {
        if (otherId !== regionId && !this.loadedRegions.has(otherId)) {
          this.preloadRegion(otherId).catch(() => {});
        }
      }

      return data;
    } catch (err: any) {
      this.failedTargetRegionId = regionId;
      this.setStatus('error', 0);
      const msg: string = err?.message || '區域載入失敗';
      this.errorMessage = msg;
      this.onError?.(msg);
      throw err;
    }
  }

  /**
   * Preload an adjacent island and attach its buildings to the archipelago scene
   */
  public async preloadRegion(regionId: RegionId): Promise<void> {
    if (this.loadedRegions.has(regionId)) return;
    const manifest = REGION_CONFIGS[regionId];
    if (!manifest) return;

    try {
      const data = await this.assembleRegionGroup(manifest, () => {});
      this.loadedRegions.set(regionId, data);
      this.scene.add(data.sceneGroup);
    } catch (e) {
      console.warn(`Preload skipped for ${regionId}:`, e);
    }
  }

  /**
   * Update active region ID when the player walks across a bridge onto another island
   */
  public syncActiveRegionByPosition(detectedRegionId: RegionId) {
    if (detectedRegionId !== this.activeRegionId && this.status === 'active') {
      const data = this.loadedRegions.get(detectedRegionId);
      if (data) {
        this.activeRegionId = detectedRegionId;
        this.activeData = data;
      } else {
        this.loadRegion(detectedRegionId).catch(() => {});
      }
    }
  }

  /**
   * Return all active colliders across all loaded islands + all 6 bridges
   */
  public getAllColliders(): Collider[] {
    const all: Collider[] = [...getBridgeSideColliders()];
    for (const [, data] of this.loadedRegions) {
      for (const c of data.colliders) {
        if (!c.id.includes('-rail-')) {
          all.push(c);
        }
      }
    }
    return all;
  }

  /**
   * Return all interactive buildings across all loaded islands
   */
  public getAllBuildings(): BuildingInteractable[] {
    const list: BuildingInteractable[] = [];
    for (const [, data] of this.loadedRegions) {
      list.push(...data.buildings);
    }
    return list;
  }

  /**
   * Trigger a real simulated load failure through the RegionManager lifecycle
   */
  public async triggerSimulatedLoadError(targetId?: RegionId): Promise<void> {
    this.simulateNextError = true;
    const regionToFail = targetId || this.activeRegionId;
    try {
      await this.loadRegion(regionToFail);
    } catch {
      // Handled by loadRegion error state
    }
  }

  /**
   * Retry loading the failed region
   */
  public async retry(): Promise<RegionLoadedData> {
    this.simulateNextError = false;
    const targetId = this.failedTargetRegionId || this.activeRegionId;
    return this.loadRegion(targetId);
  }

  /**
   * Safely return to the current intact region without exiting 3D mode
   */
  public async recoverToSafeRegion(): Promise<RegionLoadedData> {
    this.simulateNextError = false;
    this.errorMessage = null;
    this.failedTargetRegionId = null;

    if (this.activeData) {
      if (!this.scene.children.includes(this.activeData.sceneGroup)) {
        this.scene.add(this.activeData.sceneGroup);
      }
      this.setStatus('active', 100);
      return this.activeData;
    }

    return this.loadRegion(this.activeRegionId);
  }

  private disposeGroup(group: THREE.Group) {
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
      }
    });
  }

  public disposeAll() {
    for (const [, data] of this.loadedRegions) {
      this.scene.remove(data.sceneGroup);
      this.disposeGroup(data.sceneGroup);
    }
    this.loadedRegions.clear();
    this.scene.remove(this.archipelagoBaseGroup);
    this.disposeGroup(this.archipelagoBaseGroup);
    this.sharedMaterials.dispose();
  }
}
