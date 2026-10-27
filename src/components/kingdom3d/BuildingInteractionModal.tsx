import React from 'react';
import './kingdomUi.css';
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
    <div className="kx-root fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="kx-panel kx-corners relative w-full max-w-lg p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 pb-3" style={{ borderBottom: '1px solid rgba(226,184,90,0.3)' }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="kx-title text-2xl">{building.name}</h3>
              {building.previewBadge && (
                <span className="text-[11.5px] px-2 py-0.5 rounded" style={{ background: 'rgba(179,38,30,0.85)', color: '#fff0c8', border: '1px solid rgba(242,198,106,0.7)' }}>
                  {building.previewBadge}
                </span>
              )}
            </div>
            <p className="kx-sub text-[13px] mt-1">{building.subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="kx-round w-9 h-9 shrink-0" title="關閉 (ESC)" aria-label="關閉">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="kx-sub mt-4 text-[14px] leading-relaxed">{building.description}</p>

        {building.previewFeatures.length > 0 && (
          <div className="mt-4">
            <p className="kx-title text-[14px] mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> 這裡可以
            </p>
            <ul className="space-y-1.5">
              {building.previewFeatures.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[13.5px]" style={{ color: '#f6e7c4' }}>
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-amber-300" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(building.mockData.stats || building.mockData.notice) && (
          <div className="mt-4 rounded-lg px-3 py-2 text-[12.5px]" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(226,184,90,0.2)' }}>
            {building.mockData.stats && (
              <p className="flex items-center gap-1.5" style={{ color: '#fbe3a4' }}>
                <Compass className="w-3.5 h-3.5 shrink-0" /> {building.mockData.stats}
              </p>
            )}
            {building.mockData.notice && <p className="kx-sub mt-0.5">{building.mockData.notice}</p>}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="kx-btn-ghost px-4 py-2 text-[13.5px] cursor-pointer">
            繼續漫步
          </button>
          <button
            type="button"
            onClick={() => {
              if (onNavigateToModule) onNavigateToModule(building.targetModule);
              onClose();
            }}
            className="kx-btn-primary px-4 py-2 text-[13.5px] flex items-center gap-1.5 cursor-pointer"
          >
            {building.mockData.primaryActionLabel}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
