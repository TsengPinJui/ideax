import React from 'react';
import { X } from 'lucide-react';
import { AboutUsView } from './AboutUsView';
import { AboutSection } from '../types';

interface AboutUsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: AboutSection;
  onStartOnboarding?: () => void;
}

export const AboutUsModal: React.FC<AboutUsModalProps> = ({
  isOpen,
  onClose,
  initialSection = 'list',
  onStartOnboarding,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl h-[94vh] sm:h-auto sm:max-h-[92vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-stone-200/90 max-sm:pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Bar Indicator (移動端專屬拖曳握把視覺) */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center items-center shrink-0 bg-stone-50/80 border-b border-stone-100">
          <div className="w-10 h-1 rounded-full bg-stone-300" />
        </div>

        {/* Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 sm:top-4 right-3 sm:right-4 z-30 min-h-[40px] min-w-[40px] p-2 rounded-full bg-stone-100/90 hover:bg-stone-200 text-stone-600 hover:text-stone-900 transition-all cursor-pointer shadow-xs active:scale-90 flex items-center justify-center"
          title="關閉視窗"
          aria-label="關閉視窗"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable View with smooth momentum scrolling */}
        <div className="overflow-y-auto flex-1 p-2 sm:p-4 overscroll-contain">
          <AboutUsView
            initialSection={initialSection}
            onBack={onClose}
            isModal={true}
            onStartOnboarding={() => {
              onClose();
              if (onStartOnboarding) {
                onStartOnboarding();
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

