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
  Flame,
  MessageCircle,
  Landmark,
  Compass,
} from 'lucide-react';
import { AppTab, MarketViewMode } from '../types';

export const ONBOARDING_STORAGE_KEY = 'ideax_app_onboarding_completed_v1';

export type TourTrack = 'general' | 'create_ideas' | 'pain_points' | 'l0_discussion' | 'kingdom_3d';

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
    summary: '分為 L0（無懸賞）公開交流與 L1～L4 分級懸賞題目，懸賞獎金由平台金流安全託管保障。',
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
    title: '7. 痛點許願池 & L0討論區',
    targetId: 'onboarding-step-7-special-zones',
    icon: Lightbulb,
    targetTab: 'explore',
    actionType: 'open_sidebar',
    summary: '「痛點許願池」可提出難題（預設 L0 無懸賞，亦可設 L1～L4 懸賞）；「L0討論區」都是 L0（無懸賞），輕鬆無壓力交流。',
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
    title: '9. 導覽列「+」發布提問或提案',
    targetId: 'onboarding-step-9-create',
    icon: Plus,
    targetTab: 'explore',
    actionType: 'close_sidebar',
    summary: '可發布「創新提案（五階段完程度分級）」、「提出痛點（L0 無懸賞／L1～L4 分級懸賞）」或「交流討論（L0 無懸賞輕鬆聊）」。',
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

const TRACK_STEPS_MAP: Record<TourTrack, OnboardingStepConfig[]> = {
  create_ideas: [
    {
      id: 1,
      title: '1. 發布創新提案與分級制度',
      targetId: 'create-ideas-publish-btn',
      icon: Lightbulb,
      summary: '點此發表點子或作品！提案依完程度分為五級（初步構想、正在計畫、實行中、已完成、成功驗證），系統並自動記錄發布時間保障原創。',
    },
    {
      id: 2,
      title: '2. 分類篩選與收藏',
      targetId: 'create-ideas-filter-bar',
      icon: Sparkles,
      summary: '可依主題分類、關鍵字搜尋提案，或切換卡片排列方式；點選愛心即可收藏。',
    },
    {
      id: 3,
      title: '3. 瀏覽提案與打賞支持',
      targetId: 'create-ideas-cards-list',
      icon: FileText,
      summary: '點選任一提案卡片可查看完整內容與留言，也能贈送點數支持作者（作者可申請提領現金）。',
    },
    {
      id: 4,
      title: '4. 隨時切換其他專區',
      targetId: 'special-zones-top-bar',
      icon: Layers,
      summary: '上方專區列可隨時切換至「痛點許願池」、「L0討論區」、「軟體遊戲」或「創星季」。',
    },
  ],
  pain_points: [
    {
      id: 1,
      title: '1. 提出痛點與分級制度',
      targetId: 'pain-points-create-btn',
      icon: Flame,
      summary: '把生活或工作難題寫出來！預設為 L0（無懸賞）公開許願，也可依問題難度自訂 L1～L4 分級懸賞加速徵求深度解答，還能獲得打賞提現。',
    },
    {
      id: 2,
      title: '2. 篩選痛點與查看附議',
      targetId: 'pain-points-filter-bar',
      icon: Sparkles,
      summary: '可依分類或熱度排序痛點，也能一鍵查看自己按過「+1 附議」的痛點清單。',
    },
    {
      id: 3,
      title: '3. 點選痛點附議或提交解答',
      targetId: 'onboarding-step-5-cards',
      icon: FileText,
      summary: '看到有共鳴的痛點可按「+1」附議或打賞支持；若您有好辦法，也能點進卡片提交解答。',
    },
    {
      id: 4,
      title: '4. 隨時切換其他專區',
      targetId: 'special-zones-top-bar',
      icon: Layers,
      summary: '上方專區列可隨時切換至「創點子」、「L0討論區」或「軟體遊戲」展場。',
    },
  ],
  l0_discussion: [
    {
      id: 1,
      title: '1. 發起 L0 交流討論',
      targetId: 'l0-create-btn',
      icon: MessageCircle,
      summary: '這裡的討論都是 L0（無懸賞），輕鬆無壓力交流！不管是創業想法、專業問題或日常話題，都能點此隨時發起。',
    },
    {
      id: 2,
      title: '2. 搜尋與排序話題',
      targetId: 'l0-filter-bar',
      icon: Sparkles,
      summary: '可依領域篩選或搜尋關鍵字，快速找到感興趣的討論串與查看按讚紀錄。',
    },
    {
      id: 3,
      title: '3. 點進話題留言互動',
      targetId: 'onboarding-step-5-cards',
      icon: FileText,
      summary: '點選任一討論卡片即可參與回覆、交換意見，在輕鬆交流中認識志同道合的新夥伴。',
    },
  ],
  kingdom_3d: [
    {
      id: 1,
      title: '1. 切換 3D 地圖與實境漫遊',
      targetId: 'island-mode-switcher',
      icon: Landmark,
      summary: '上方可隨時切換「3D地圖」俯瞰全島，或進入「實境漫遊」以第一人稱走進水鄉街道。',
    },
    {
      id: 2,
      title: '2. 展開右側島覽目錄',
      targetId: 'island-right-atlas-btn',
      icon: Layers,
      summary: '點擊右側「島覽」可展開五大島嶼目錄，快速跳島、查看攤位內容或直接發布貼文。',
    },
    {
      id: 3,
      title: '3. 尋找隱藏彩蛋',
      targetId: 'island-easter-book-btn',
      icon: Sparkles,
      summary: '點擊島上發光物件或建築可解鎖詩句彩蛋，收集進度都會記錄在左下角收集冊。',
    },
    {
      id: 4,
      title: '4. 實境漫遊、邀請好友同遊與雙人羈絆任務',
      targetId: 'island-enter-roaming-btn',
      icon: Compass,
      summary: '點此走進 3D 水鄉划船遊湖、騎仙鶴！還能邀請好友同遊，在漫遊中點擊夥伴綁定羈絆，一起解「雙人羈絆任務」（同船遊湖、登聚雲塔等）。',
    },
  ],
  general: ONBOARDING_STEPS,
};

interface AppOnboardingGuideProps {
  isOpen: boolean;
  tourTrack?: TourTrack;
  onClose: (completedAll?: boolean) => void;
  onOpenGuideSelector?: () => void;
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
  tourTrack = 'general',
  onClose,
  onOpenGuideSelector,
  onNavigateTab,
  onOpenSidebar,
  onCloseSidebar,
  viewMode,
  onSetViewMode,
  onResetFilters,
  onOpenUserDashboard,
  isFromAboutUs = false,
}) => {
  const activeSteps = TRACK_STEPS_MAP[tourTrack] || ONBOARDING_STEPS;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // 當 tourTrack 改變或重新打開時重置步驟索引
  useEffect(() => {
    setCurrentStepIndex(0);
  }, [tourTrack, isOpen]);

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

  const currentStep = activeSteps[currentStepIndex] || activeSteps[0];
  const lastExecutedStepIndexRef = useRef<number | null>(null);

  // Update target rect on step change or resize (Strictly scoped to current step ONLY)
  const updateTargetRect = useCallback((stepId: string, shouldScroll = false, retryCount = 0) => {
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
      if (retryCount < 5) {
        setTimeout(() => updateTargetRect(stepId, shouldScroll, retryCount + 1), 120);
      } else {
        setTargetRect(null);
      }
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
      if (prev < activeSteps.length - 1) {
        return prev + 1;
      } else {
        handleFinish();
        return prev;
      }
    });
  }, [activeSteps.length, handleFinish]);

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

    const step = activeSteps[currentStepIndex];
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
  }, [isOpen, currentStepIndex, activeSteps, updateTargetRect]);

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
                    {tourTrack !== 'general' && (
                      <span className="mr-1 text-amber-400">
                        {tourTrack === 'create_ideas' ? '創新提案' : tourTrack === 'pain_points' ? '提出痛點' : tourTrack === 'l0_discussion' ? '交流討論' : '3D島覽'} •
                      </span>
                    )}
                    {currentStepIndex + 1}/{activeSteps.length}
                  </span>
                  <h4 className="text-xs sm:text-sm font-black text-amber-100 truncate">
                    {currentStep.title}
                  </h4>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {onOpenGuideSelector && (
                <button
                  type="button"
                  onClick={() => {
                    callbacksRef.current.onCloseSidebar();
                    onOpenGuideSelector();
                  }}
                  className="text-amber-300 hover:text-amber-200 px-2 py-1 rounded-lg text-[11px] font-bold hover:bg-stone-800 transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                  title="切換查看其他功能教學"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>其他教學</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleSkip}
                className="text-stone-400 hover:text-white px-2 py-1 rounded-lg text-[11px] font-bold hover:bg-stone-800 transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                title="關閉教學"
              >
                <span>略過</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
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
              {activeSteps.map((s, idx) => (
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

              {currentStepIndex < activeSteps.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 text-xs font-black shadow-sm flex items-center gap-1 transition-all cursor-pointer"
                >
                  <span>下一步</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  {onOpenGuideSelector && (
                    <button
                      type="button"
                      onClick={() => {
                        callbacksRef.current.onCloseSidebar();
                        onOpenGuideSelector();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-amber-400/60 text-amber-300 text-xs font-black flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>查看其他教學</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleFinish}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-stone-950 text-xs font-black shadow-sm flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>完成教學</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
