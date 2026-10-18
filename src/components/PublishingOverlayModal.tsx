import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface PublishingOverlayModalProps {
  isSubmitting: boolean;
  message?: string;
  statusText?: string;
}

export const PublishingOverlayModal: React.FC<PublishingOverlayModalProps> = ({
  isSubmitting,
  message = '正在發布，請勿離開此畫面。',
  statusText = 'AI篩選標籤中...',
}) => {
  if (!isSubmitting) return null;

  return (
    <div className="fixed inset-0 z-[250] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150 relative overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute -top-12 -left-12 w-28 h-28 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-28 h-28 bg-orange-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Animated AI Spinner */}
        <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400 via-orange-500 to-rose-500 animate-spin opacity-80 blur-xs" />
          <div className="relative w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-inner">
            <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-base sm:text-lg font-black text-stone-900 leading-snug">
            {message}
          </h3>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 font-extrabold text-xs shadow-2xs">
            <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin shrink-0" />
            <span>{statusText}</span>
          </div>
        </div>

        {/* Indeterminate Progress Bar */}
        <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden relative">
          <div className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 rounded-full animate-pulse w-3/4 mx-auto" />
        </div>
      </div>
    </div>
  );
};
