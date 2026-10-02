import React, { useEffect, useState } from 'react';
import { Lock, AlertCircle, CheckCircle2, Info, ChevronRight, X } from 'lucide-react';

export interface CenterToastData {
  id: number;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  type?: 'lock' | 'info' | 'warning' | 'success';
  duration?: number; // 預設 2000ms
}

interface CenterToastProps {
  toast: CenterToastData | null;
  onDismiss: () => void;
}

export const CenterToast: React.FC<CenterToastProps> = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!toast) {
      setIsExiting(false);
      return;
    }

    setIsExiting(false);
    const duration = toast.duration || 2000;

    // 開始淡出動畫
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, Math.max(300, duration - 300));

    // 完全卸載
    const dismissTimer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(dismissTimer);
    };
  }, [toast?.id, toast?.duration, onDismiss]);

  if (!toast) return null;

  const handleAction = () => {
    if (toast.onAction) {
      toast.onAction();
    }
    onDismiss();
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="w-6 h-6 text-emerald-600 stroke-[2.2]" />;
      case 'warning':
        return <AlertCircle className="w-6 h-6 text-amber-600 stroke-[2.2]" />;
      case 'info':
        return <Info className="w-6 h-6 text-blue-600 stroke-[2.2]" />;
      case 'lock':
      default:
        return <Lock className="w-6 h-6 text-amber-600 stroke-[2.2]" />;
    }
  };

  const getBadgeBg = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-emerald-50 border-emerald-200 text-emerald-600';
      case 'warning':
      case 'lock':
      default:
        return 'bg-amber-50 border-amber-200 text-amber-600';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-600';
    }
  };

  return (
    <div
      style={{ zIndex: 2147483646 }}
      className="fixed inset-0 flex items-center justify-center pointer-events-none p-4 select-none"
    >
      {/* 輕量半透明遮罩背景（增加中央焦點感） */}
      <div
        className={`absolute inset-0 bg-stone-950/20 backdrop-blur-[2px] transition-opacity duration-300 ${
          isExiting ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* 中央跳出提示卡片（簡約白底質感主題） */}
      <div
        role="alert"
        aria-live="assertive"
        className={`pointer-events-auto relative w-full max-w-[290px] sm:max-w-xs bg-white/95 text-stone-900 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-stone-200/90 ring-1 ring-stone-900/5 flex flex-col items-center text-center transition-all duration-300 ease-out ${
          isExiting
            ? 'opacity-0 scale-95 translate-y-1'
            : 'opacity-100 scale-100 translate-y-0 animate-in zoom-in-90 fade-in duration-200'
        }`}
      >
        {/* 右上角關閉按鈕 */}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-3.5 right-3.5 p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          title="關閉"
          aria-label="關閉提示"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 提示圖示圓圈 */}
        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-3 shadow-inner ${getBadgeBg()}`}>
          {getIcon()}
        </div>

        {/* 標題 */}
        <h3 className="text-base sm:text-lg font-black tracking-tight text-stone-900">
          {toast.title}
        </h3>

        {/* 副標題說明 */}
        {toast.subtitle && (
          <p className="text-xs sm:text-sm text-stone-500 mt-1 leading-relaxed px-1">
            {toast.subtitle}
          </p>
        )}

        {/* 動作按鈕（例如 前往登入） */}
        {toast.actionLabel && (
          <button
            type="button"
            onClick={handleAction}
            className="mt-4 px-5 py-2 rounded-full bg-linear-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 text-xs sm:text-sm font-black shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>{toast.actionLabel}</span>
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        )}
      </div>
    </div>
  );
};
