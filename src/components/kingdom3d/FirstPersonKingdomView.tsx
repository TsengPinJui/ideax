import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  RegionId,
  RegionStatus,
  BuildingInteractable,
  Portal,
  DevPerformanceMetrics,
  QualitySettings,
} from './types';
import {
  REGION_CONFIGS,
  WORLD_BRIDGES,
  getGlobalWalkableZones,
  detectPlayerSpatialContext,
} from './regionConfigs';
import { RegionManager } from './RegionManager';
import { FirstPersonControls } from './FirstPersonControls';
import { PhysicsController } from './PhysicsController';
import { PerformanceMonitor } from './PerformanceMonitor';
import { MobileControlsOverlay } from './MobileControlsOverlay';
import { BuildingInteractionModal } from './BuildingInteractionModal';
import { DevStatsPanel } from './DevStatsPanel';
import {
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';

interface FirstPersonKingdomViewProps {
  onExit: () => void;
  onNavigateToModule?: (targetModule: string) => void;
  initialRegionId?: RegionId;
}

export const FirstPersonKingdomView: React.FC<FirstPersonKingdomViewProps> = ({
  onExit,
  onNavigateToModule,
  initialRegionId = 'region-home',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Core 3D engine refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<FirstPersonControls | null>(null);
  const regionManagerRef = useRef<RegionManager | null>(null);
  const perfMonitorRef = useRef<PerformanceMonitor>(new PerformanceMonitor());
  const rafIdRef = useRef<number | null>(null);

  // Lights
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);

  // Safe player pose for error recovery
  const safePlayerPoseRef = useRef<{ pos: THREE.Vector3; yaw: number } | null>(null);

  // Region state
  const [activeRegionId, setActiveRegionId] = useState<RegionId>(initialRegionId);
  const [regionStatus, setRegionStatus] = useState<RegionStatus>('loading');
  const [loadProgress, setLoadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Proximity interactables
  const [nearBuilding, setNearBuilding] = useState<BuildingInteractable | null>(null);
  const [nearPortal] = useState<Portal | null>(null);
  const [activeModalBuilding, setActiveModalBuilding] = useState<BuildingInteractable | null>(null);
  const nearBuildingRef = useRef<BuildingInteractable | null>(null);

  // Settings & Dev stats
  const [quality, setQuality] = useState<QualitySettings>({
    resolutionScale: 1.0,
    shadows: false,
    renderDistance: 220,
    headBob: true,
    sensitivity: 1.0,
    showColliders: false,
    moveSpeedMultiplier: 1.0,
  });
  const [isDevStatsOpen, setIsDevStatsOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDesktopPointerLocked, setIsDesktopPointerLocked] = useState(false);

  // Performance metrics for dev panel
  const [devMetrics, setDevMetrics] = useState<DevPerformanceMetrics>({
    fps: 30,
    frameTimeMs: 33.3,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    activeRegionId: initialRegionId,
    regionStatus: 'loading',
    loadTimeMs: 0,
    playerPos: { x: 0, y: 0, z: 4 },
    yawDeg: 0,
    pitchDeg: 0,
    resolutionScale: 1.0,
    shadowsEnabled: false,
    nearBuilding: null,
    nearPortal: null,
    currentSpaceLabel: '',
  });

  // Sound effects helper via Web Audio API
  const playSoundEffect = useCallback((type: 'portal' | 'interact') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      if (type === 'portal') {
        [440, 554.37, 659.25].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.001, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.15, now + idx * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.55);
        });
      } else if (type === 'interact') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.26);
      }
    } catch {
      // Audio policy safe
    }
  }, []);

  // Direct island jump handler (from top bar or radar map)
  const handleSelectRegion = useCallback(
    async (targetRegionId: RegionId) => {
      if (!regionManagerRef.current || !controlsRef.current) return;
      const manifest = REGION_CONFIGS[targetRegionId];
      if (!manifest) return;

      safePlayerPoseRef.current = {
        pos: controlsRef.current.position.clone(),
        yaw: controlsRef.current.yaw,
      };

      try {
        playSoundEffect('portal');
        await regionManagerRef.current.loadRegion(targetRegionId);
        controlsRef.current.setSpawn(
          new THREE.Vector3(...manifest.defaultSpawn.position),
          manifest.defaultSpawn.yaw
        );
        setActiveRegionId(targetRegionId);
      } catch (err) {
        console.warn('Region jump failed:', err);
      }
    },
    [playSoundEffect]
  );

  // Initialize Three.js Scene, Controls, RegionManager
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene (Clean architectural daylight atmosphere)
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const initialManifest = REGION_CONFIGS[initialRegionId] || REGION_CONFIGS['region-home'];
    scene.background = new THREE.Color(0xe2e8f0);
    scene.fog = new THREE.Fog(0xe2e8f0, 85, 240);

    // 2. Camera (far = 260 so neighboring islands and bridges are clearly visible)
    const camera = new THREE.PerspectiveCamera(68, width / height, 0.15, 260);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, 1.5) * quality.resolutionScale
    );
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = quality.shadows;
    renderer.shadowMap.type = THREE.BasicShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const hemiLight = new THREE.HemisphereLight(0xf8fafc, 0xcbd5e1, 0.55);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.15);
    sunLight.position.set(45, 80, 50);
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // 5. FirstPersonControls
    const controls = new FirstPersonControls(camera, renderer.domElement, quality);
    controlsRef.current = controls;

    const spawnPos = new THREE.Vector3(...initialManifest.defaultSpawn.position);
    controls.setSpawn(spawnPos, initialManifest.defaultSpawn.yaw);

    // 6. RegionManager
    const regionManager = new RegionManager(scene);
    regionManagerRef.current = regionManager;

    regionManager.onStatusChange = (status, progress) => {
      setRegionStatus(status);
      setLoadProgress(progress);
      if (status === 'error') {
        controls.unlockPointer();
      }
    };

    regionManager.onError = (err) => {
      setErrorMessage(err);
      controls.unlockPointer();
    };

    // Load Initial Region (which also preloads the remaining 4 islands in background)
    regionManager
      .loadRegion(initialManifest.id)
      .then(() => {
        setErrorMessage(null);
      })
      .catch((err) => {
        console.error('Initial region load error:', err);
      });

    // 7. Window Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 8. Keydown for E Interaction
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyE') {
        if (nearBuildingRef.current) {
          playSoundEffect('interact');
          setActiveModalBuilding(nearBuildingRef.current);
          controls.unlockPointer();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);

    // 9. Animation & Physics Game Loop
    const clock = new THREE.Clock();
    const globalWalkableZones = getGlobalWalkableZones();

    const animate = () => {
      rafIdRef.current = requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.08);
      setIsDesktopPointerLocked(controls.isLocked);

      if (!activeModalBuilding && regionManager.status === 'active') {
        const desiredVelocity = controls.getDesiredVelocity();
        const activeColliders = regionManager.getAllColliders();

        const newPos = PhysicsController.movePlayer(
          controls.position,
          desiredVelocity,
          delta,
          activeColliders,
          globalWalkableZones,
          WORLD_BRIDGES
        );

        controls.position.copy(newPos);
        controls.updateCameraTransform(delta);

        // Detect which island the player is on and whether inside a building
        const spatial = detectPlayerSpatialContext(
          controls.position.x,
          controls.position.z
        );
        regionManager.syncActiveRegionByPosition(spatial.regionId);
        setActiveRegionId(spatial.regionId);

        // Building interaction detection: triggers when inside a main building or right at its front door
        let foundBuilding: BuildingInteractable | null = spatial.insideBuilding;
        if (!foundBuilding) {
          const allBuildings = regionManager.getAllBuildings();
          for (const b of allBuildings) {
            const dist = Math.hypot(
              controls.position.x - b.position.x,
              controls.position.z - b.position.z
            );
            if (dist <= Math.max(b.width, b.depth) * 0.65) {
              foundBuilding = b;
              break;
            }
          }
        }
        nearBuildingRef.current = foundBuilding;
        setNearBuilding(foundBuilding);
      }

      // Render Scene
      renderer.render(scene, camera);

      // Update Performance Stats
      const stats = perfMonitorRef.current.update(renderer);
      setDevMetrics((prev) => ({
        ...prev,
        fps: stats.fps,
        frameTimeMs: stats.frameTimeMs,
        drawCalls: stats.drawCalls,
        triangles: stats.triangles,
        geometries: stats.geometries,
        textures: stats.textures,
        activeRegionId: regionManager.activeRegionId,
        regionStatus: regionManager.status,
        loadTimeMs: regionManager.loadDurationMs,
        playerPos: {
          x: controls.position.x,
          y: controls.position.y,
          z: controls.position.z,
        },
        yawDeg: THREE.MathUtils.radToDeg(controls.yaw) % 360,
        pitchDeg: THREE.MathUtils.radToDeg(controls.pitch),
        resolutionScale: quality.resolutionScale,
        shadowsEnabled: quality.shadows,
        nearBuilding: nearBuildingRef.current,
        nearPortal: null,
        currentSpaceLabel: '',
      }));
    };

    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleGlobalKeyDown);

      controls.dispose();
      regionManager.disposeAll();

      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [initialRegionId, playSoundEffect]);

  // Handle quality settings change
  const handleChangeQuality = (updated: Partial<QualitySettings>) => {
    setQuality((prev) => {
      const next = { ...prev, ...updated };
      if (rendererRef.current && updated.resolutionScale !== undefined) {
        rendererRef.current.setPixelRatio(
          Math.min(window.devicePixelRatio || 1, 1.5) * next.resolutionScale
        );
      }
      if (
        regionManagerRef.current &&
        updated.showColliders !== undefined
      ) {
        regionManagerRef.current.setColliderWireframeVisible(
          Boolean(next.showColliders)
        );
      }
      if (controlsRef.current) {
        controlsRef.current.settings = next;
      }
      return next;
    });
  };

  // Trigger real RegionManager load failure (loading -> error)
  const handleSimulateError = () => {
    if (!regionManagerRef.current || !controlsRef.current) return;
    controlsRef.current.unlockPointer();
    safePlayerPoseRef.current = {
      pos: controlsRef.current.position.clone(),
      yaw: controlsRef.current.yaw,
    };
    const nextTarget: RegionId =
      activeRegionId === 'region-home' ? 'region-career' : 'region-home';
    regionManagerRef.current.triggerSimulatedLoadError(nextTarget);
  };

  // Retry loading the failed region
  const handleRetry = () => {
    if (!regionManagerRef.current) return;
    setErrorMessage(null);

    regionManagerRef.current
      .retry()
      .then((loaded) => {
        const targetId = loaded.manifest.id;
        setActiveRegionId(targetId);
      })
      .catch((err) => {
        setErrorMessage(err?.message || '重試失敗');
      });
  };

  // Safe Return to the intact current/previous region without exiting 3D mode
  const handleSafeReturn = () => {
    if (!regionManagerRef.current) return;
    setErrorMessage(null);

    regionManagerRef.current
      .recoverToSafeRegion()
      .then((safeData) => {
        setActiveRegionId(safeData.manifest.id);
        if (safePlayerPoseRef.current && controlsRef.current) {
          controlsRef.current.setSpawn(
            safePlayerPoseRef.current.pos,
            safePlayerPoseRef.current.yaw
          );
        }
      })
      .catch((err) => {
        setErrorMessage(err?.message || '安全返回失敗');
      });
  };

  const failedRegionId =
    regionManagerRef.current?.failedTargetRegionId || activeRegionId;
  const failedRegionName =
    REGION_CONFIGS[failedRegionId]?.name || failedRegionId;

  const isFastWalk = (quality.moveSpeedMultiplier || 1.0) > 1.2;

  return (
    <div className="relative w-full h-screen bg-stone-950 overflow-hidden select-none font-sans">
      {/* 3D Canvas Mount Point */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Initial / Retry Loading Screen */}
      {regionStatus === 'loading' && (
        <div className="absolute inset-0 z-40 bg-stone-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-stone-100">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 mb-4 animate-pulse">
            🏯
          </div>
          <div className="text-lg font-black text-amber-200">
            載入創點源五島白模空間中...
          </div>
          <div className="w-56 h-2 bg-stone-800 rounded-full mt-4 overflow-hidden border border-stone-700">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-200"
              style={{ width: `${Math.max(8, loadProgress)}%` }}
            />
          </div>
          <div className="text-xs text-stone-400 mt-2 font-mono">
            {loadProgress}% 建構島嶼、拱橋、月洞門圍牆與可步入建築空間
          </div>
        </div>
      )}

      {/* Error Alert Screen with Retry & Safe Return Fallback */}
      {regionStatus === 'error' && (
        <div className="absolute inset-0 z-40 bg-stone-950/88 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-stone-900 border border-rose-500/60 rounded-3xl p-6 text-stone-100 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-black text-rose-300">
                    分區資產載入失敗
                  </h4>
                  <span className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/40 text-[10px] font-mono font-bold text-rose-300">
                    status: error
                  </span>
                </div>
                <p className="text-xs text-amber-200/90 font-bold">
                  目標分區：{failedRegionName}
                </p>
                <p className="text-xs text-stone-300 leading-relaxed">
                  {errorMessage || '分區資產載入逾時或幾何建構中斷'}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-stone-950/70 border border-stone-800 text-[11px] text-stone-400 space-y-1">
              <div>・原分區場景與玩家狀態已安全保留，未重新整理整個網站。</div>
              <div>
                ・您可選擇
                <span className="text-amber-300 font-bold">「重試載入」</span>
                重新建構目標分區，或
                <span className="text-emerald-300 font-bold">
                  「安全返回原區域」
                </span>
                繼續探索。
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onExit}
                className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-300 cursor-pointer transition-colors"
              >
                退出回主站
              </button>
              <button
                type="button"
                onClick={handleSafeReturn}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-lg shadow-emerald-950/50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>安全返回原區域</span>
              </button>
              <button
                type="button"
                onClick={handleRetry}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-lg shadow-amber-950/50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>重試載入</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile & Spatial HUD Overlay */}
      <MobileControlsOverlay
        activeRegionId={activeRegionId}
        playerPos={devMetrics.playerPos}
        yawRad={controlsRef.current?.yaw || 0}
        nearBuilding={nearBuilding}
        nearPortal={nearPortal}
        onSelectRegion={handleSelectRegion}
        onInteract={() => {
          if (nearBuilding) {
            playSoundEffect('interact');
            setActiveModalBuilding(nearBuilding);
            controlsRef.current?.unlockPointer();
          }
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleDevStats={() => setIsDevStatsOpen(!isDevStatsOpen)}
        onExit={onExit}
        onJoystickMove={(vx, vy) => {
          if (controlsRef.current) {
            controlsRef.current.touchStick.active = true;
            controlsRef.current.touchStick.vectorX = vx;
            controlsRef.current.touchStick.vectorY = vy;
          }
        }}
        onJoystickEnd={() => {
          if (controlsRef.current) {
            controlsRef.current.touchStick.active = false;
            controlsRef.current.touchStick.vectorX = 0;
            controlsRef.current.touchStick.vectorY = 0;
          }
        }}
        onTouchLookDelta={(dx, dy) => {
          controlsRef.current?.applyTouchLookDelta(dx, dy);
        }}
        isDesktopPointerLocked={isDesktopPointerLocked}
        onDesktopRequestLock={() => {
          controlsRef.current?.lockPointer();
        }}
        isFastWalk={isFastWalk}
        onToggleFastWalk={() => {
          handleChangeQuality({
            moveSpeedMultiplier: isFastWalk ? 1.0 : 1.75,
          });
        }}
      />

      {/* Building Interaction Preview Modal */}
      <BuildingInteractionModal
        building={activeModalBuilding}
        onClose={() => {
          setActiveModalBuilding(null);
        }}
        onNavigateToModule={(mod) => {
          setActiveModalBuilding(null);
          if (onNavigateToModule) {
            onNavigateToModule(mod);
          }
        }}
      />

      {/* Developer Performance & Spatial Collision Panel */}
      <DevStatsPanel
        metrics={devMetrics}
        quality={quality}
        onChangeQuality={handleChangeQuality}
        onSimulateError={handleSimulateError}
        onRetry={handleRetry}
        isOpen={isDevStatsOpen}
        onClose={() => setIsDevStatsOpen(false)}
      />

      {/* Controls Guide Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-lg w-full bg-stone-900 border border-amber-500/40 rounded-3xl p-6 text-stone-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <h3 className="text-lg font-black text-amber-200">
                創點源操作指南
              </h3>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-950/60 border border-stone-800 text-xs space-y-2">
              <div className="font-bold text-amber-300">操作方式：</div>
              <div className="grid grid-cols-2 gap-2 text-stone-300">
                <div>
                  <span className="text-stone-400">電腦桌機：</span>
                  <p className="mt-0.5">WASD / 方向鍵移動、Shift 加速</p>
                  <p className="mt-0.5">按住畫面拖曳或點擊鎖定滑鼠環顧</p>
                </div>
                <div>
                  <span className="text-stone-400">手機平板：</span>
                  <p className="mt-0.5">左下虛擬搖桿移動、上方可開「疾走」</p>
                  <p className="mt-0.5">右半部滑動調整視角、右上雷達點島瞬移</p>
                </div>
              </div>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-5 py-2 rounded-xl bg-amber-500 text-stone-950 font-black text-xs hover:bg-amber-400 cursor-pointer"
              >
                繼續探索
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FirstPersonKingdomView;
