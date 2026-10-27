import React from 'react';
import { BuildingInteractable } from './types';
import { X, Sparkles, Compass, CheckCircle2, ArrowRight } from 'lucide-react';

interface BuildingInteractionModalProps {
  building: BuildingInteractable | null;
  onClose: () => void;
  onNavigateToModule?: (targetModule: string) => void;
}

export const BuildingInteractionModal: React.FC<BuildingInteractionModalProps> = ({
  building,
  onClose,
  onNavigateToModule,
}) => {
  if (!building) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-stone-900/95 border border-amber-500/40 rounded-3xl shadow-2xl p-6 sm:p-7 text-stone-100 overflow-hidden font-sans">
        {/* Decorative Top Accent Banner */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 text-2xl shadow-inner shrink-0">
              🏯
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl sm:text-2xl font-black text-amber-200 tracking-wide">
                  {building.name}
                </h3>
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {building.previewBadge}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-400 mt-0.5 font-medium">
                {building.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer"
            title="關閉面板 (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description Lore */}
        <div className="mt-4 p-3.5 rounded-2xl bg-stone-950/50 border border-stone-800/80 text-xs sm:text-sm text-stone-300 leading-relaxed font-normal">
          {building.description}
        </div>

        {/* Feature Highlights */}
        <div className="mt-4 space-y-2">
          <div className="text-xs font-bold text-amber-400/90 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>核心整合功能預覽</span>
          </div>
          <div className="grid gap-2">
            {building.previewFeatures.map((feat, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-stone-800/40 border border-stone-800 text-xs text-stone-200"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mock Data & Notice */}
        <div className="mt-4 p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-[11px] text-amber-200/90 space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{building.mockData.stats}</span>
          </div>
          <div className="text-stone-400">{building.mockData.notice}</div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-6 flex items-center justify-between gap-3 pt-3 border-t border-stone-800/80">
          <div className="text-[11px] text-stone-500">
            * 目前為 3D 探索原型展示資料
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-stone-400 hover:bg-stone-800 hover:text-stone-200 cursor-pointer transition-colors"
            >
              繼續漫步
            </button>
            <button
              type="button"
              onClick={() => {
                if (onNavigateToModule) {
                  onNavigateToModule(building.targetModule);
                }
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <span>{building.mockData.primaryActionLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
