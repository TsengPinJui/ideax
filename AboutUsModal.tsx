import React from 'react';
import { createPortal } from 'react-dom';
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

  const modalElement = (
    <div
      style={{ zIndex: 2147483648 }}
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Close Button in top right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer shadow-xs"
          title="關閉視窗"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable View */}
        <div className="overflow-y-auto flex-1 p-2 sm:p-4">
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

  return typeof document !== 'undefined' ? createPortal(modalElement, document.body) : modalElement;
};
