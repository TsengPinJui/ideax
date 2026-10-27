import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
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
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!containerRef.current || typeof window === 'undefined') return;
    const rect = containerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 12;
    const width = Math.min(288, vw - margin * 2);

    // Center horizontally relative to trigger button, clamped safely inside viewport
    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(margin, Math.min(left, vw - width - margin));

    const popupHeight = popupRef.current?.offsetHeight || 160;
    let top = rect.bottom + 8;
    if (top + popupHeight > vh - margin && rect.top - popupHeight - 8 >= margin) {
      top = rect.top - popupHeight - 8;
    } else {
      top = Math.max(margin, Math.min(top, vh - popupHeight - margin));
    }

    setPopupStyle({
      position: 'fixed',
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      width: `${Math.round(width)}px`,
    });
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
  }, [isOpen]);

  // Close on outside click & reposition on scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        (!popupRef.current || !popupRef.current.contains(e.target as Node))
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
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
          ref={popupRef}
          style={popupStyle}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-[999] p-3 bg-white rounded-2xl shadow-xl border border-stone-200 text-stone-800 text-xs animate-in fade-in zoom-in-95 duration-100"
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
