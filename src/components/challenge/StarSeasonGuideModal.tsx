import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Send,
  Flame,
  Coins,
  Trophy,
  Lightbulb,
  Layers,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Shuffle,
} from 'lucide-react';

export type GuideRole = 'audience' | 'proposer' | 'painpoint' | 'compare';

interface StarSeasonGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: GuideRole;
  onNavigateToExplore?: () => void;
  onNavigateToPainPoints?: () => void;
  onNavigateToSubmit?: () => void;
  onOpenSubmitPainPoint?: () => void;
  onBackToOldSite?: () => void;
  onSetHomepageSectionTab?: (tab: 'solution' | 'pain_point') => void;
  onNavigateToSubView?: (subView: 'home' | 'submit' | 'participant' | 'rules' | 'judge' | 'ambassador' | 'proposal') => void;
}

interface SpotlightStepConfig {
  id: number;
  role: GuideRole;
  title: string;
  focusHint?: string;
  targetId: string;
  description: string;
  actionText?: string;
  actionCallback?: () => void;
  note?: string;
  icon: React.FC<{ className?: string }>;
}

export const StarSeasonGuideModal: React.FC<StarSeasonGuideModalProps> = ({
  isOpen,
  onClose,
  initialRole = 'audience',
  onNavigateToExplore,
  onNavigateToPainPoints,
  onNavigateToSubmit,
  onOpenSubmitPainPoint,
  onBackToOldSite,
  onSetHomepageSectionTab,
  onNavigateToSubView,
}) => {
  const [activeRole, setActiveRole] = useState<GuideRole>(initialRole);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Store action callbacks in refs to prevent useEffect churn
  const callbacksRef = useRef({
    onNavigateToExplore,
    onNavigateToPainPoints,
    onNavigateToSubmit,
    onOpenSubmitPainPoint,
    onBackToOldSite,
    onSetHomepageSectionTab,
    onNavigateToSubView,
    onClose,
  });

  callbacksRef.current = {
    onNavigateToExplore,
    onNavigateToPainPoints,
    onNavigateToSubmit,
    onOpenSubmitPainPoint,
    onBackToOldSite,
    onSetHomepageSectionTab,
    onNavigateToSubView,
    onClose,
  };

  useEffect(() => {
    if (isOpen) {
      setActiveRole(initialRole || 'audience');
      setStepIndex(0);
    }
  }, [isOpen, initialRole]);

  // 定義三大角色專屬 3 步內引導旅程
  const roleSteps: Record<Exclude<GuideRole, 'compare'>, SpotlightStepConfig[]> = {
    // 角色一：【一般觀眾】 (3 步)
    audience: [
      {
        id: 1,
        role: 'audience',
        title: 'Step 1：逛痛點 & 解方提案',
        focusHint: '聚焦在創星季的「痛點問題」與「解方提案」切換分頁',
        targetId: 'star-tour-overview-tabs',
        icon: Layers,
        description:
          '全場最新、最熱門的點子都在這裡！您可以自由切換查看大家敲碗的生活痛點與腦洞大開的原創提案。',
      },
      {
        id: 2,
        role: 'audience',
        title: 'Step 2：了解提案詳情與亮點',
        focusHint: '引導點擊卡片查看提案的 Demo 影音、雛形展示與社群討論',
        targetId: 'star-tour-proposal-card',
        icon: Eye,
        description:
          '點進卡片查看創作者的心血！看看大家是怎麼用創意解決生活與產業難題。',
      },
      {
        id: 3,
        role: 'audience',
        title: 'Step 3：注資支持、按讚與交流討論',
        focusHint: '引導注意卡片旁的【💰 注資支持】按鈕、其次為按讚、再為討論',
        targetId: 'star-tour-card-actions',
        icon: Coins,
        description:
          '喜歡這個提案或很有同感？直接使用創星幣注資為他打氣！您的支持將推升他的排名晉級決賽。',
      },
    ],

    // 角色二：【提案參賽者】 (3 步)
    proposer: [
      {
        id: 1,
        role: 'proposer',
        title: 'Step 1：巡邏真實痛點池找靈感',
        focusHint: '聚焦痛點卡片與真實需求庫',
        targetId: 'star-tour-painpoint-card',
        icon: Lightbulb,
        description:
          '不知道做什麼題目？先來痛點池看看真實用戶最急迫的困擾，直擊市場真實需求！',
      },
      {
        id: 2,
        role: 'proposer',
        title: 'Step 2：一鍵針對痛點提案',
        focusHint: '引導痛點卡片內的【我有解方，立即提案】按鈕',
        targetId: 'star-tour-solve-painpoint-btn',
        icon: Send,
        description:
          '看到拿手的題目，直接點擊「前往查看並提案」！系統會將您的解方深度關聯該痛點，第一時間觸及受眾。',
      },
      {
        id: 3,
        role: 'proposer',
        title: 'Step 3：填寫提案並上傳展示亮點',
        targetId: 'star-tour-proposal-editor',
        icon: Trophy,
        description:
          '填寫簡潔的方案介紹、商業計畫與上傳影音Demo。提交後您的提案將在全場展出，接受大眾注資與專家評審評分！',
        note: '💡 兩站互通提示：創星季(看痛點&提解方)、創點子主站(提痛點&進階諮詢交易)隨時可一鍵切換。',
        actionText: '前往填寫提案表單',
        actionCallback: onNavigateToSubmit,
      },
    ],

    // 角色三：【痛點提出者】 (2 步)
    painpoint: [
      {
        id: 1,
        role: 'painpoint',
        title: 'Step 1：提出痛點（說出您的困擾）',
        focusHint: '聚焦頂部顯眼的【🔥 提出痛點】按鈕',
        targetId: 'star-tour-post-painpoint-btn',
        icon: Flame,
        description:
          '生活或工作中遇到卡關難題？點擊這裡寫下真實遭遇與情境，向全世界高手徵求神解方！',
        actionText: '立即提出痛點',
        actionCallback: onOpenSubmitPainPoint,
      },
      {
        id: 2,
        role: 'painpoint',
        title: 'Step 2：檢閱解方並即時互動',
        focusHint: '引導至痛點下方的「已收到解方」與「討論互動」',
        targetId: 'star-tour-solutions-received',
        icon: MessageSquare,
        description:
          '提案者陸續送來解方成果！您可以直接在下方提問交流、測試體驗，並注資支持最滿意的作品。',
        note: '💡 兩站互通提示：創星季(看痛點&提解方)、創點子主站(提痛點&進階功能)隨時可一鍵切換。',
      },
    ],
  };

  const currentSteps = activeRole === 'compare' ? [] : roleSteps[activeRole] || [];
  const currentStep = currentSteps[stepIndex] || null;

  // 定位目標元素與平滑滾動（框出對應位置，與創點子導覽風格完全一致）
  const updateTargetRect = useCallback((targetId: string, shouldScroll = false) => {
    let el = document.getElementById(targetId);

    // 降級容錯搜尋器：如果特定 ID 未找到，尋找同類別最接近的元素
    if (!el) {
      if (targetId === 'star-tour-overview-tabs') {
        el = document.querySelector('[data-tour="overview-tabs"]') as HTMLElement;
      } else if (targetId === 'star-tour-proposal-card') {
        el = (document.querySelector('#star-tour-overview-tabs') || document.querySelector('[id*="star-tour"]')) as HTMLElement;
      } else if (targetId === 'star-tour-card-actions') {
        el = document.getElementById('star-tour-proposal-card') || document.getElementById('star-tour-overview-tabs');
      } else if (targetId === 'star-tour-painpoint-card') {
        el = document.getElementById('star-tour-overview-tabs');
      } else if (targetId === 'star-tour-solve-painpoint-btn') {
        el = document.getElementById('star-tour-painpoint-card') || document.getElementById('star-tour-overview-tabs');
      } else if (targetId === 'star-tour-post-painpoint-btn') {
        el = document.getElementById('star-tour-hero-cta') || document.getElementById('star-tour-overview-tabs');
      } else if (targetId === 'star-tour-proposal-editor') {
        el = document.getElementById('star-tour-proposal-editor') || (document.querySelector('form') as HTMLElement);
      } else if (targetId === 'star-tour-solutions-received') {
        el = document.getElementById('star-tour-painpoint-card') || document.getElementById('star-tour-overview-tabs');
      }
    }

    if (el) {
      if (shouldScroll) {
        const r = el.getBoundingClientRect();
        if (
          r.top < 80 ||
          r.bottom > window.innerHeight - 90 ||
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

  // 步驟變更時，自動切換畫面狀態與目標位置
  useEffect(() => {
    if (!isOpen) {
      setTargetRect(null);
      return;
    }

    if (activeRole === 'compare') {
      setTargetRect(null);
      return;
    }

    if (!currentStep) return;

    // 1. 同步視圖與頁籤
    if (activeRole === 'audience') {
      callbacksRef.current.onNavigateToSubView?.('home');
      callbacksRef.current.onSetHomepageSectionTab?.('solution');
    } else if (activeRole === 'proposer') {
      if (stepIndex === 2) {
        callbacksRef.current.onNavigateToSubView?.('submit');
      } else {
        callbacksRef.current.onNavigateToSubView?.('home');
        callbacksRef.current.onSetHomepageSectionTab?.('pain_point');
      }
    } else if (activeRole === 'painpoint') {
      callbacksRef.current.onNavigateToSubView?.('home');
      if (stepIndex === 1) {
        callbacksRef.current.onSetHomepageSectionTab?.('pain_point');
      }
    }

    // 2. 框選目標元素位置
    const timer = setTimeout(() => {
      updateTargetRect(currentStep.targetId, true);
    }, 150);

    const handleUpdateOnly = () => {
      updateTargetRect(currentStep.targetId, false);
    };

    window.addEventListener('resize', handleUpdateOnly);
    window.addEventListener('scroll', handleUpdateOnly, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleUpdateOnly);
      window.removeEventListener('scroll', handleUpdateOnly, true);
    };
  }, [isOpen, activeRole, stepIndex, currentStep, updateTargetRect]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (stepIndex < currentSteps.length - 1) {
      setStepIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      setStepIndex((prev) => prev - 1);
    }
  };

  const handleSelectRole = (newRole: GuideRole) => {
    setActiveRole(newRole);
    setStepIndex(0);
  };

  const isTargetNearBottom = targetRect ? targetRect.bottom > window.innerHeight - 160 : false;

  return createPortal(
    <div className="fixed inset-0 z-[120] pointer-events-none select-none">
      {/* 1. 全透明無阻塞背景 - 底層畫面100%清晰可見 */}
      <div className="fixed inset-0 pointer-events-none" />

      {/* 2. 目標框選高亮光環 (框出對應位置：金色動態外框與投射光芒，與創點子導覽一致) */}
      {targetRect && (
        <div
          className="fixed rounded-2xl ring-4 ring-amber-400 ring-offset-2 ring-offset-black/20 pointer-events-none transition-all duration-200 ease-out shadow-[0_0_22px_rgba(245,158,11,0.85)] z-[121]"
          style={{
            top: `${Math.max(4, targetRect.top - 4)}px`,
            left: `${Math.max(4, targetRect.left - 4)}px`,
            width: `${Math.min(window.innerWidth - 8, targetRect.width + 8)}px`,
            height: `${targetRect.height + 8}px`,
          }}
        />
      )}

      {/* 3. 浮動 HUD 導覽控制器 (位於畫面下方或上方，不遮擋重點卡片) */}
      <div
        className={`fixed left-1/2 -translate-x-1/2 z-[122] w-[94vw] max-w-xl pointer-events-auto transition-all duration-300 ease-out ${
          activeRole === 'compare'
            ? 'top-1/2 -translate-y-1/2 max-w-2xl'
            : isTargetNearBottom
            ? 'top-3'
            : 'bottom-4 sm:bottom-6'
        }`}
      >
        <div className="bg-stone-900/95 text-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.6)] border border-amber-400/80 backdrop-blur-md flex flex-col gap-2.5">
          {/* 身分切換標籤列 + 關閉 */}
          <div className="flex items-center justify-between border-b border-stone-800 pb-2 gap-2">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
              <button
                type="button"
                onClick={() => handleSelectRole('audience')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                  activeRole === 'audience'
                    ? 'bg-amber-400 text-stone-950 shadow-xs font-black'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>一般觀眾</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRole('proposer')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                  activeRole === 'proposer'
                    ? 'bg-amber-400 text-stone-950 shadow-xs font-black'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>提案參賽者</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRole('painpoint')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                  activeRole === 'painpoint'
                    ? 'bg-rose-500 text-white shadow-xs font-black'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>痛點提出者</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRole('compare')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                  activeRole === 'compare'
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800'
                }`}
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>兩站功能差異</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-stone-400 hover:text-white px-2 py-1 rounded-lg text-[11px] font-bold hover:bg-stone-800 transition-colors shrink-0 cursor-pointer flex items-center gap-1"
              title="略過所有教學"
            >
              <span>略過</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 內容區塊 */}
          {activeRole === 'compare' ? (
            /* 兩站差異對照專區 */
            <div className="space-y-3 py-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Shuffle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-amber-200">
                    兩個網站的功能差異解析
                  </h3>
                  <p className="text-stone-300 text-[11px]">
                    創星季與 IdeaX 創點子主站互聯互通，隨時可一鍵切換！
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {/* 創星季 */}
                <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/50 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-300 font-black text-xs sm:text-sm">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>🏆 創星季賽事官網</span>
                  </div>
                  <ul className="space-y-1 text-stone-200 leading-relaxed list-disc list-inside text-[11px]">
                    <li><strong className="text-amber-200">瀏覽痛點</strong> 與原創解方總覽</li>
                    <li><strong className="text-amber-200">群眾注資支持</strong> 與人氣評分</li>
                    <li><strong className="text-amber-200">提案管理</strong> 與組隊參賽</li>
                    <li><strong className="text-amber-200">官方時程</strong> 與官方競賽大獎爭取</li>
                  </ul>
                  <div className="pt-0.5">
                    <span className="text-[10px] text-amber-400 font-bold block">
                      ★ 核心使命：校園與青年創新想法的落地驗證場
                    </span>
                  </div>
                </div>

                {/* 創點子主站 */}
                <div className="p-3 rounded-2xl bg-stone-800/60 border border-stone-700 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-300 font-black text-xs sm:text-sm">
                    <Lightbulb className="w-4 h-4 text-emerald-400" />
                    <span>💡 IdeaX 創點子</span>
                  </div>
                  <ul className="space-y-1 text-stone-200 leading-relaxed list-disc list-inside text-[11px]">
                    <li><strong className="text-emerald-200">痛點與方案回應</strong> 永久存放庫</li>
                    <li><strong className="text-emerald-200">日常高額懸賞提問</strong> 與專利解鎖</li>
                    <li><strong className="text-emerald-200">專家 1 對 1 諮詢</strong> 與私聊媒合</li>
                    <li><strong className="text-emerald-200">AI 進階工具</strong> 與賞金安全提領</li>
                  </ul>
                  <div className="pt-0.5">
                    <span className="text-[10px] text-emerald-400 font-bold block">
                      ★ 核心使命：高價值問題與解決方案的長期交易市場
                    </span>
                  </div>
                </div>
              </div>

              {/* 切換按鈕 */}
              <div className="flex items-center justify-between pt-1.5 border-t border-stone-800 gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSelectRole('audience')}
                  className="px-2.5 py-1 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold cursor-pointer"
                >
                  ← 返回角色教學
                </button>
                {onBackToOldSite && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onBackToOldSite();
                    }}
                    className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-stone-950 font-black text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <span>造訪 IdeaX創點子</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : currentStep ? (
            /* 步驟內容 */
            <div className="space-y-2.5">
              {/* 步驟標題與進度 */}
              <div className="flex items-center justify-between gap-2 border-b border-stone-800 pb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-black shrink-0 shadow-xs">
                    <currentStep.icon className="w-4 h-4 text-stone-950" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase text-amber-300 bg-amber-950 px-1.5 py-0.2 rounded border border-amber-500/40 font-mono">
                        {stepIndex + 1}/{currentSteps.length}
                      </span>
                      <h4 className="text-xs sm:text-sm font-black text-amber-100 truncate">
                        {currentStep.title}
                      </h4>
                    </div>
                  </div>
                </div>
              </div>

              {/* 簡潔易懂的說明文案 */}
              <div className="text-xs sm:text-[13px] text-stone-200 font-medium leading-relaxed">
                <p className="text-white font-bold">{currentStep.description}</p>
              </div>

              {/* 附註提醒（如果有） */}
              {currentStep.note && (
                <div className="text-[11px] text-amber-300 bg-amber-950/60 p-2 rounded-xl border border-amber-500/30 font-medium">
                  {currentStep.note}
                </div>
              )}

              {/* 控制列：步驟點點 + 上一步 / 下一步 / 動作按鈕 */}
              <div className="flex items-center justify-between pt-1 border-t border-stone-800 gap-2">
                {/* 點點進度指示 */}
                <div className="flex items-center gap-1">
                  {currentSteps.map((s, idx) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStepIndex(idx)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        idx === stepIndex
                          ? 'w-5 bg-amber-400'
                          : idx < stepIndex
                          ? 'w-2 bg-amber-600'
                          : 'w-1.5 bg-stone-700'
                      }`}
                      title={`跳至步驟 ${idx + 1}`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={stepIndex === 0}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-0.5 transition-all cursor-pointer ${
                      stepIndex === 0
                        ? 'opacity-30 cursor-not-allowed text-stone-500'
                        : 'text-stone-300 hover:text-white hover:bg-stone-800'
                    }`}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>上一步</span>
                  </button>

                  {currentStep.actionText && currentStep.actionCallback && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        currentStep.actionCallback?.();
                      }}
                      className="px-2.5 py-1.5 rounded-xl border border-amber-400/80 text-amber-300 hover:bg-amber-400/20 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>{currentStep.actionText}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 text-xs font-black shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <span>{stepIndex === currentSteps.length - 1 ? '完成導覽 🎉' : '下一步'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
};
