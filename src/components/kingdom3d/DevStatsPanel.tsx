import React, { useState } from 'react';
import { DevPerformanceMetrics, QualitySettings } from './types';
import { REGION_CONFIGS } from './regionConfigs';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RefreshCw,
  Sliders,
} from 'lucide-react';

interface DevStatsPanelProps {
  metrics: DevPerformanceMetrics;
  quality: QualitySettings;
  onChangeQuality: (updated: Partial<QualitySettings>) => void;
  onSimulateError: () => void;
  onRetry: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const DevStatsPanel: React.FC<DevStatsPanelProps> = ({
  metrics,
  quality,
  onChangeQuality,
  onSimulateError,
  onRetry,
  isOpen,
  onClose,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  if (!isOpen) return null;

  const fpsColor =
    metrics.fps >= 28
      ? 'text-emerald-400'
      : metrics.fps >= 20
      ? 'text-amber-400'
      : 'text-rose-400';

  const statusBadge =
    metrics.regionStatus === 'active'
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
      : metrics.regionStatus === 'loading'
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
      : metrics.regionStatus === 'error'
      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
      : 'bg-stone-800 text-stone-300 border-stone-700';

  const regionName =
    REGION_CONFIGS[metrics.activeRegionId]?.shortName || metrics.activeRegionId;

  return (
    <div className="absolute top-16 left-3 sm:left-4 z-30 max-w-xs w-full bg-stone-950/90 backdrop-blur-md border border-stone-700/80 rounded-2xl shadow-2xl p-3 sm:p-3.5 text-stone-200 font-mono text-xs select-none pointer-events-auto">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-stone-100 font-sans text-xs">
            效能監控面板 (Dev HUD)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-200 cursor-pointer"
            title={collapsed ? '展開詳細' : '折疊面板'}
          >
            {collapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-rose-400 text-xs font-sans cursor-pointer"
            title="關閉"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-3 gap-2 py-2 text-center">
        <div className="bg-stone-900/60 p-1.5 rounded-xl border border-stone-800/80">
          <div className="text-[10px] text-stone-400">FPS</div>
          <div className={`text-base font-black ${fpsColor}`}>{metrics.fps}</div>
        </div>
        <div className="bg-stone-900/60 p-1.5 rounded-xl border border-stone-800/80">
          <div className="text-[10px] text-stone-400">Frame</div>
          <div className="text-xs font-bold text-stone-200 mt-0.5">
            {metrics.frameTimeMs} ms
          </div>
        </div>
        <div className="bg-stone-900/60 p-1.5 rounded-xl border border-stone-800/80">
          <div className="text-[10px] text-stone-400">Draw Calls</div>
          <div className="text-xs font-bold text-amber-300 mt-0.5">
            {metrics.drawCalls}
          </div>
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-2 pt-1 text-[11px]">
          {/* Active Region */}
          <div className="p-2 rounded-xl bg-stone-900/50 border border-stone-800/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-stone-400">所屬分區：</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-amber-200">{regionName}</span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${statusBadge}`}
                >
                  {metrics.regionStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Triangles & Geometries */}
          <div className="flex items-center justify-between text-stone-400 px-1">
            <span>面數 / 載入耗時：</span>
            <span className="text-stone-300">
              {metrics.triangles.toLocaleString()} 面 / {metrics.loadTimeMs}ms
            </span>
          </div>

          {/* Player Coordinates & Angles */}
          <div className="p-2 rounded-xl bg-stone-900/50 border border-stone-800/60 text-[10px] space-y-1">
            <div className="flex justify-between text-stone-400">
              <span>座標 X / Y / Z：</span>
              <span className="text-amber-200">
                {metrics.playerPos.x.toFixed(1)}, {metrics.playerPos.y.toFixed(1)},{' '}
                {metrics.playerPos.z.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between text-stone-400">
              <span>視角 Yaw / Pitch：</span>
              <span className="text-stone-300">
                {metrics.yawDeg.toFixed(0)}° / {metrics.pitchDeg.toFixed(0)}°
              </span>
            </div>
          </div>

          {/* Quality & Spatial Debug Tweaks */}
          <div className="pt-2 border-t border-stone-800 space-y-1.5">
            <div className="flex items-center justify-between text-stone-300 text-xs font-bold font-sans">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>空間與效能調控</span>
              </span>
            </div>

            {/* Resolution scale buttons */}
            <div className="flex items-center justify-between">
              <span className="text-stone-400">解析度：</span>
              <div className="flex gap-1">
                {[0.5, 0.75, 1.0].map((scale) => (
                  <button
                    key={scale}
                    type="button"
                    onClick={() => onChangeQuality({ resolutionScale: scale })}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                      quality.resolutionScale === scale
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                    }`}
                  >
                    {scale === 1.0 ? '1x' : `${scale}x`}
                  </button>
                ))}
              </div>
            </div>

            {/* Collider Wireframe Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-stone-400">碰撞牆體邊框：</span>
              <button
                type="button"
                onClick={() =>
                  onChangeQuality({ showColliders: !quality.showColliders })
                }
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                  quality.showColliders
                    ? 'bg-rose-600 text-white'
                    : 'bg-stone-800 text-stone-400'
                }`}
              >
                {quality.showColliders ? '顯示中 (紅框)' : '隱藏'}
              </button>
            </div>

            {/* Error simulation & recovery test buttons */}
            <div className="pt-1 flex gap-2">
              <button
                type="button"
                onClick={onSimulateError}
                className="flex-1 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors active:scale-95"
                title="實際觸發 RegionManager 載入失敗流程 (loading -> error)"
              >
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>模擬載入錯誤</span>
              </button>
              <button
                type="button"
                onClick={onRetry}
                className="py-1.5 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors active:scale-95"
                title="重新載入當前區域"
              >
                <RefreshCw className="w-3 h-3 text-emerald-400" />
                <span>重試</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
