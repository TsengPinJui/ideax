import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Search,
  Layers,
  LayoutGrid,
  FileText,
  PanelLeft,
  GraduationCap,
  Plus,
  User,
  CheckCircle2,
  Lightbulb,
} from 'lucide-react';
import { AppTab, MarketViewMode } from '../types';

export const ONBOARDING_STORAGE_KEY = 'ideax_app_onboarding_completed_v1';

export interface OnboardingStepConfig {
  id: number;
  title: string;
  targetId: string;
  icon: React.FC<{ className?: string }>;
  summary: string;
  targetTab?: AppTab;
  actionType?: 'reset_filters' | 'open_sidebar' | 'close_sidebar' | 'open_user_dashboard' | 'nav_solvers';
  showViewModeSelector?: boolean;
}

const ONBOARDING_STEPS: OnboardingStepConfig[] = [
  {
    id: 1,
    title: '1. 探索問題市場 - 選擇問題主題',
    targetId: 'onboarding-step-1-categories',
    icon: Layers,
    targetTab: 'explore',
    actionType: 'close_sidebar',
    summary: '點選分類標籤（如創新創業、專業問題、日常疑難）快速篩選主題。',
  },
  {
    id: 2,
    title: '2. 探索問題市場 - 搜尋與話題標籤',
    targetId: 'onboarding-step-2-search',
    icon: Search,
    targetTab: 'explore',
    actionType: 'close_sidebar',
    summary: '可直接輸入關鍵字、專家 ID 搜尋，或點選熱門話題標籤快速檢索。',
  },
  {
    id: 3,
    title: '3. 探索問題市場 - 問題分級與懸賞',
    targetId: 'onboarding-step-3-levels',
    icon: Sparkles,
    targetTab: 'explore',
    actionType: 'close_sidebar',
    summary: '包含 L0 免費探討與 L1~L4 懸賞題目，獎金由平台金流安全託管保障。',
  },
  {
    id: 4,
    title: '4. 探索問題市場 - 切換排列方式',
    targetId: 'onboarding-step-4-viewmode',
    icon: LayoutGrid,
    targetTab: 'explore',
    actionType: 'reset_filters',
    summary: '已自動重置篩選回歸全部題目。可點擊切換排列版面，系統將記住您進入下一步前的選擇作為日後預設。',
    showViewModeSelector: true,
  },
  {
    id: 5,
    title: '5. 點擊問題進入頁面',
    targetId: 'onboarding-step-5-cards',
    icon: FileText,
    targetTab: 'explore',
    actionType: 'close_sidebar',
    summary: '點選任一問題卡片可查看詳細需求說明並提交解答或參與討論。',
  },
  {
    id: 6,
    title: '6. 展開左側看板',
    targetId: 'onboarding-step-6-sidebar-btn',
    icon: PanelLeft,
    targetTab: 'explore',
    actionType: 'close_sidebar',
    summary: '點擊左上看板圖示可隨時展開側邊抽屜，快速探索細分子領域。',
  },
  {
    id: 7,
    title: '7. 創點子/痛點集 & L0問題討論區',
    targetId: 'onboarding-step-7-special-zones',
    icon: Lightbulb,
    targetTab: 'explore',
    actionType: 'open_sidebar',
    summary: '「創點子/痛點集」彙整大眾痛點找靈感；「L0討論區」供免懸賞自由交流。',
  },
  {
    id: 8,
    title: '8. 找專家 & 榮譽榜',
    targetId: 'onboarding-step-8-solvers',
    icon: GraduationCap,
    targetTab: 'solvers',
    actionType: 'nav_solvers',
    summary: '瀏覽各領域認證智庫專家與榮譽排行榜，可直接諮詢或指定提問。',
  },
  {
    id: 9,
    title: '9. 導覽列「+」發布提問',
    targetId: 'onboarding-step-9-create',
    icon: Plus,
    targetTab: 'explore',
    actionType: 'close_sidebar',
    summary: '提問分三種：「徵求完整解方(懸賞)」、「創點子痛點(免懸賞)」、「閒聊討論(免懸賞)」。',
  },
  {
    id: 10,
    title: '10. 個人中心 - 帳號與基本資料',
    targetId: 'onboarding-step-10-profile-page',
    icon: User,
    targetTab: 'user_dashboard',
    actionType: 'open_user_dashboard',
    summary: '已進入個人基本資料頁面，隨時可編輯個人資訊；填寫問卷即可免費領取會員體驗！',
  },
];

interface AppOnboardingGuideProps {
  isOpen: boolean;
  onClose: (completedAll?: boolean) => void;
  onNavigateTab: (tab: AppTab) => void;
  onOpenSidebar: () => void;
  onCloseSidebar: () => void;
  viewMode: MarketViewMode;
  onSetViewMode: (mode: MarketViewMode) => void;
  onResetFilters?: () => void;
  onOpenUserDashboard?: () => void;
  isFromAboutUs?: boolean;
}

export const AppOnboardingGuide: React.FC<AppOnboardingGuideProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenSidebar,
  onCloseSidebar,
  viewMode,
  onSetViewMode,
  onResetFilters,
  onOpenUserDashboard,
  isFromAboutUs = false,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Store action callbacks in refs to avoid useEffect dependency churn and infinite loops
  const callbacksRef = useRef({
    onNavigateTab,
    onOpenSidebar,
    onCloseSidebar,
    onResetFilters,
    onOpenUserDashboard,
    onSetViewMode,
    onClose,
  });

  // Always keep ref current without triggering effects
  callbacksRef.current = {
    onNavigateTab,
    onOpenSidebar,
    onCloseSidebar,
    onResetFilters,
    onOpenUserDashboard,
    onSetViewMode,
    onClose,
  };

  const currentStep = ONBOARDING_STEPS[currentStepIndex] || ONBOARDING_STEPS[0];
  const lastExecutedStepIndexRef = useRef<number | null>(null);

  // Update target rect on step change or resize (Strictly scoped to current step ONLY)
  const updateTargetRect = useCallback((stepId: string, shouldScroll = false) => {
    const el =
      document.getElementById(stepId) ||
      document.getElementById(`${stepId}-content`) ||
      document.getElementById(`${stepId}-desktop`);
    if (el) {
      if (shouldScroll) {
        const r = el.getBoundingClientRect();
        if (
          r.top < 70 ||
          r.bottom > window.innerHeight - 80 ||
          r.left < 0 ||
          r.right > window.innerWidth
        ) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
      }
      const rect = el.getBoundingClientRect();
      setTargetRect((prev) => {
        if (!prev) return rect;
        if (
          Math.round(prev.top) === Math.round(rect.top) &&
          Math.round(prev.left) === Math.round(rect.left) &&
          Math.round(prev.width) === Math.round(rect.width) &&
          Math.round(prev.height) === Math.round(rect.height)
        ) {
          return prev;
        }
        return rect;
      });
    } else {
      setTargetRect(null);
    }
  }, []);

  const handleFinish = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } catch (e) {
      console.error(e);
    }
    callbacksRef.current.onCloseSidebar();
    callbacksRef.current.onClose(true);
  }, []);

  const handleNext = useCallback(() => {
    setCurrentStepIndex((prev) => {
      if (prev < ONBOARDING_STEPS.length - 1) {
        return prev + 1;
      } else {
        handleFinish();
        return prev;
      }
    });
  }, [handleFinish]);

  const handlePrev = useCallback(() => {
    setCurrentStepIndex((prev) => {
      if (prev > 0) {
        return prev - 1;
      }
      return prev;
    });
  }, []);

  const handleSkip = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } catch (e) {
      console.error(e);
    }
    callbacksRef.current.onCloseSidebar();
    callbacksRef.current.onClose(false);
  }, []);

  // Synchronize screen state whenever currentStepIndex changes
  useEffect(() => {
    if (!isOpen) {
      setTargetRect(null);
      lastExecutedStepIndexRef.current = null;
      return;
    }

    const step = ONBOARDING_STEPS[currentStepIndex];
    if (!step) return;

    if (lastExecutedStepIndexRef.current !== currentStepIndex) {
      lastExecutedStepIndexRef.current = currentStepIndex;

      // 1. Perform navigation and screen synchronization actions
      if (step.actionType === 'reset_filters') {
        callbacksRef.current.onResetFilters?.();
        callbacksRef.current.onCloseSidebar();
        callbacksRef.current.onNavigateTab('explore');
      } else if (step.actionType === 'open_sidebar') {
        callbacksRef.current.onNavigateTab('explore');
        callbacksRef.current.onOpenSidebar();
      } else if (step.actionType === 'close_sidebar') {
        callbacksRef.current.onCloseSidebar();
        if (step.targetTab) {
          callbacksRef.current.onNavigateTab(step.targetTab);
        }
      } else if (step.actionType === 'nav_solvers') {
        callbacksRef.current.onCloseSidebar();
        callbacksRef.current.onNavigateTab('solvers');
      } else if (step.actionType === 'open_user_dashboard') {
        callbacksRef.current.onCloseSidebar();
        if (callbacksRef.current.onOpenUserDashboard) {
          callbacksRef.current.onOpenUserDashboard();
        } else {
          callbacksRef.current.onNavigateTab('user_dashboard');
        }
      } else if (step.targetTab) {
        callbacksRef.current.onNavigateTab(step.targetTab);
      }
    }

    // 2. Position the spotlight outline with smooth scroll once
    const timer = setTimeout(() => {
      updateTargetRect(step.targetId, true);
    }, 150);

    const handleUpdateOnly = () => {
      updateTargetRect(step.targetId, false);
    };

    window.addEventListener('resize', handleUpdateOnly);
    window.addEventListener('scroll', handleUpdateOnly, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleUpdateOnly);
      window.removeEventListener('scroll', handleUpdateOnly, true);
    };
  }, [isOpen, currentStepIndex, updateTargetRect]);

  if (!isOpen) return null;

  const Icon = currentStep.icon;

  // Position guide bar intelligently at top or bottom to never obscure target
  const isTargetNearBottom = targetRect ? targetRect.bottom > window.innerHeight - 150 : false;

  return createPortal(
    <div className="fixed inset-0 z-[110] pointer-events-none select-none">
      {/* 1. Transparent clean backdrop - NO blur, 100% clear view of underlying app */}
      <div className="fixed inset-0 pointer-events-none" />

      {/* 2. Target Spotlight Highlight Frame - Crisp golden/amber animated glow border */}
      {targetRect && (
        <div
          className="fixed rounded-2xl ring-4 ring-amber-400 ring-offset-2 ring-offset-black/20 pointer-events-none transition-all duration-200 ease-out shadow-[0_0_20px_rgba(245,158,11,0.85)] z-[111]"
          style={{
            top: `${Math.max(4, targetRect.top - 4)}px`,
            left: `${Math.max(4, targetRect.left - 4)}px`,
            width: `${Math.min(window.innerWidth - 8, targetRect.width + 8)}px`,
            height: `${targetRect.height + 8}px`,
          }}
        />
      )}

      {/* 3. Non-blocking Sleek HUD Controller - Positioned safely away from target without covering content */}
      <div
        className={`fixed left-1/2 -translate-x-1/2 z-[112] w-[94vw] max-w-xl pointer-events-auto transition-all duration-300 ease-out ${
          isTargetNearBottom ? 'top-3' : 'bottom-4 sm:bottom-6'
        }`}
      >
        <div className="bg-stone-900/95 text-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.6)] border border-amber-400/80 backdrop-blur-md flex flex-col gap-2.5">
          {/* Header Row: Step Badge + Title + Skip */}
          <div className="flex items-center justify-between gap-2 border-b border-stone-800 pb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-black shrink-0 shadow-xs">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase text-amber-300 bg-amber-950 px-1.5 py-0.2 rounded border border-amber-500/40">
                    {currentStepIndex + 1}/{ONBOARDING_STEPS.length}
                  </span>
                  <h4 className="text-xs sm:text-sm font-black text-amber-100 truncate">
                    {currentStep.title}
                  </h4>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSkip}
              className="text-stone-400 hover:text-white px-2 py-1 rounded-lg text-[11px] font-bold hover:bg-stone-800 transition-colors shrink-0 cursor-pointer flex items-center gap-1"
              title="略過所有教學"
            >
              <span>略過</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Concise Summary Text */}
          <div className="text-xs sm:text-[13px] text-stone-200 font-medium leading-relaxed">
            <p className="text-white font-bold">{currentStep.summary}</p>

            {/* If step 4: Interactive ViewMode pills */}
            {currentStep.showViewModeSelector && (
              <div className="mt-2 pt-2 border-t border-stone-800/80 flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-amber-300 shrink-0">即時試試：</span>
                {(['large', 'list', 'grid'] as MarketViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      onSetViewMode(mode);
                    }}
                    className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewMode === mode
                        ? 'bg-amber-400 text-stone-950 font-black shadow-xs'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700 border border-stone-700'
                    }`}
                  >
                    {mode === 'large' ? '大視窗' : mode === 'list' ? '條列式' : '方格'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer Controls: Dots + Prev / Next */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-800">
            {/* Dots */}
            <div className="flex items-center gap-1">
              {ONBOARDING_STEPS.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === currentStepIndex
                      ? 'w-5 bg-amber-400'
                      : idx < currentStepIndex
                      ? 'w-2 bg-amber-600'
                      : 'w-1.5 bg-stone-700'
                  }`}
                  title={`跳至步驟 ${idx + 1}`}
                />
              ))}
            </div>

            {/* Nav buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentStepIndex === 0}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-0.5 transition-all cursor-pointer ${
                  currentStepIndex === 0
                    ? 'opacity-30 cursor-not-allowed text-stone-500'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800'
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>上一步</span>
              </button>

              {currentStepIndex < ONBOARDING_STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 text-xs font-black shadow-sm flex items-center gap-1 transition-all cursor-pointer"
                >
                  <span>下一步</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : isFromAboutUs ? (
                <button
                  type="button"
                  onClick={handleFinish}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-stone-950 text-xs font-black shadow-md flex items-center gap-1 transition-all cursor-pointer"
                >
                  <span>下一步：聊天室教學</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-stone-950 text-xs font-black shadow-sm flex items-center gap-1 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>完成教學</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
