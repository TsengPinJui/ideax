import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, X, ExternalLink } from 'lucide-react';

interface HelpTooltipProps {
  content: React.ReactNode;
  title?: string;
  onLearnMore?: () => void;
  learnMoreText?: string;
  className?: string;
  iconClassName?: string;
  size?: 'sm' | 'md';
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  content,
  title,
  onLearnMore,
  learnMoreText = '查看運作條款',
  className = '',
  iconClassName = '',
  size = 'sm',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const sizeClasses = size === 'sm' ? 'w-4 h-4 text-[10px]' : 'w-5 h-5 text-xs';

  return (
    <div className={`relative inline-flex items-center shrink-0 ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        className={`${sizeClasses} rounded-full bg-stone-100 hover:bg-amber-100 text-stone-500 hover:text-amber-900 border border-stone-300/80 hover:border-amber-300 flex items-center justify-center font-bold cursor-pointer transition-colors shadow-2xs ${iconClassName}`}
        title={title || '點擊查閱說明'}
        aria-label={title || '說明'}
      >
        ?
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 top-full mt-1.5 w-64 sm:w-72 p-3 bg-white rounded-2xl shadow-xl border border-stone-200 text-stone-800 text-xs animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-1.5 mb-2">
            <span className="font-extrabold text-stone-900 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>{title || '補充說明'}</span>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-0.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-stone-600 leading-relaxed font-normal space-y-1">
            {content}
          </div>

          {onLearnMore && (
            <div className="mt-2.5 pt-2 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onLearnMore();
                }}
                className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <span>{learnMoreText}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
