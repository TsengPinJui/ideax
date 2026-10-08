import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Eye,
  Send,
  Flame,
  Coins,
  CheckCircle2,
  Trophy,
  Lightbulb,
  Layers,
  ArrowRight,
  ExternalLink,
  Compass,
  FileText,
  MessageSquare,
  HelpCircle,
  Shuffle,
  ShieldCheck,
  Zap,
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
}) => {
  const [activeRole, setActiveRole] = useState<GuideRole>(initialRole);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveRole(initialRole || 'audience');
      setStepIndex(0);
    }
  }, [isOpen, initialRole]);

  // 定義三大角色專屬 3 步內引導旅程
  const roleSteps: Record<Exclude<GuideRole, 'compare'>, SpotlightStepConfig[]> = {
    // 角色一：【一般觀眾】 (3 步)
    // 主要目標：逛提案與痛點、注資支持看好的項目。
    audience: [
      {
        id: 1,
        role: 'audience',
        title: 'Step 1：逛痛點 & 解方',
        focusHint: '聚焦在創星季的「痛點總覽」與「解方總覽」切換分頁',
        targetId: 'star-tour-overview-tabs',
        icon: Layers,
        description:
          '全場最新、最熱門的點子都在這裡！你可以自由切換查看大家敲碗的困擾與腦洞大開的創新解方。',
      },
      {
        id: 2,
        role: 'audience',
        title: 'Step 2：了解提案的內容',
        focusHint: '引導點擊卡片查看提案的 Demo 影音、雛形展示與社群討論',
        targetId: 'star-tour-proposal-card',
        icon: Eye,
        description:
          '點進卡片查看創作者的心血！看看大家是怎麼用創意解決問題的。',
      },
      {
        id: 3,
        role: 'audience',
        title: 'Step 3：注資、按讚(收藏)、留言與討論',
        focusHint: '引導注意卡片旁的【💰 注資 / 支持】按鈕、其次為按讚、再為討論',
        targetId: 'star-tour-card-actions',
        icon: Coins,
        description:
          '喜歡這個提案或很有同感？直接注資為他打氣！你的支持會推升他的排名。',
      },
    ],

    // 角色二：【提案參賽者】 (3 步)
    // 主要目標：找痛點靈感、發布解方。
    proposer: [
      {
        id: 1,
        role: 'proposer',
        title: 'Step 1：找題目與靈感（巡邏真實痛點池）',
        focusHint: '聚焦「痛點分類篩選器」與「高額懸賞排序」',
        targetId: 'star-tour-painpoint-filter',
        icon: Lightbulb,
        description:
          '不知道做什麼項目？先來痛點池看看真實用戶最痛的困擾，懸賞越高代表需求越強烈，直擊市場痛點！',
      },
      {
        id: 2,
        role: 'proposer',
        title: 'Step 2：一鍵提案',
        focusHint: '引導痛點卡片內的【我有解方，立即提案】按鈕',
        targetId: 'star-tour-solve-painpoint-btn',
        icon: Send,
        description:
          '看到拿手的題目，直接點擊提案！系統會自動將你的解方顯示在該痛點下方，讓所有對該痛點煩惱的觀眾們第一時間看到。',
      },
      {
        id: 3,
        role: 'proposer',
        title: 'Step 3：編輯內容並上傳亮點（吸引目光）',
        targetId: 'star-tour-proposal-editor',
        icon: Trophy,
        description:
          '填寫簡潔的方案介紹與展示影片。提交後你的提案將在全場展出，接受大眾注資與評審評分！',
        note: '💡 兩站功能切換提示：創星季(看痛點&提解方)、創點子(提痛點&進階功能)隨時可互相切換。',
        actionText: '填寫完整提案表單',
        actionCallback: onNavigateToSubmit,
      },
    ],

    // 角色三：【痛點參賽者】 (2 步)
    // 主要目標：提出困擾痛點、吸引強者解題。
    painpoint: [
      {
        id: 1,
        role: 'painpoint',
        title: 'Step 1：提出痛點（說出你的困擾）',
        focusHint: '聚焦頂部顯眼的【🔥 提出痛點】按鈕',
        targetId: 'star-tour-post-painpoint-btn',
        icon: Flame,
        description:
          '生活或工作中遇到卡關難題？點擊這裡寫下你的真實遭遇與痛點情境，向全世界的高手徵求神解方！',
        actionText: '立即提出痛點',
        actionCallback: onOpenSubmitPainPoint,
      },
      {
        id: 2,
        role: 'painpoint',
        title: 'Step 2：檢閱解方並互動反饋',
        focusHint: '引導至痛點下方的「已收到方案」與「討論區」',
        targetId: 'star-tour-solutions-received',
        icon: MessageSquare,
        description:
          '提案者會陸續送來解方成果！你可以直接在下方提問交流、測試體驗，並注資支持最滿意的作品。',
        note: '💡 兩站功能切換提示：創星季(看痛點&提解方)、創點子(提痛點&進階功能)隨時可互相切換。',
      },
    ],
  };

  const currentSteps = activeRole === 'compare' ? [] : roleSteps[activeRole] || [];
  const currentStep = currentSteps[stepIndex] || null;

  // 定位目標元素與平滑滾動（框出對應位置）
  const updateTargetRect = useCallback((targetId: string, shouldScroll = true) => {
    let el = document.getElementById(targetId);

    // 降級容錯搜尋器：如果特定 ID 未找到，尋找同類別最接近的元素
    if (!el) {
      if (targetId === 'star-tour-overview-tabs') {
        el = document.querySelector('[data-tour="overview-tabs"]') as HTMLElement;
      } else if (targetId === 'star-tour-proposal-card') {
        el = document.querySelector('#star-tour-overview-tabs') as HTMLElement;
      } else if (targetId === 'star-tour-solve-painpoint-btn') {
        el = document.getElementById('star-tour-overview-tabs');
      } else if (targetId === 'star-tour-post-painpoint-btn') {
        el = document.getElementById('star-tour-hero-cta') || document.getElementById('star-tour-overview-tabs');
      } else if (targetId === 'star-tour-submit-proposal-btn') {
        el = document.getElementById('star-tour-hero-cta') || document.getElementById('star-tour-overview-tabs');
      } else if (targetId === 'star-tour-proposal-editor') {
        el = document.getElementById('star-tour-proposal-editor') || (document.querySelector('form') as HTMLElement);
      } else if (targetId === 'star-tour-solutions-received') {
        el = document.getElementById('star-tour-overview-tabs');
      }
    }

    if (el) {
      if (shouldScroll) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, []);

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

    // 延遲以確保滾動完成並計算位置
    const timer = setTimeout(() => {
      updateTargetRect(currentStep.targetId, true);
    }, 120);

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

  // 導覽步驟切換時，自動同步至目標頁面（例如提案者 Step 3 自動跳轉至提案頁，Step 1/2 回到首頁探索區）
  useEffect(() => {
    if (!isOpen) return;

    if (activeRole === 'proposer') {
      if (stepIndex === 2) {
        onNavigateToSubmit?.();
      } else {
        onNavigateToExplore?.();
      }
    }
  }, [isOpen, activeRole, stepIndex, onNavigateToSubmit, onNavigateToExplore]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (stepIndex < currentSteps.length - 1) {
      setStepIndex((prev) => prev + 1);
    } else {
      // 完成當前角色旅程，可關閉或切換至比較
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

  const isTargetNearBottom = targetRect ? targetRect.bottom > window.innerHeight - 170 : false;

  return createPortal(
    <div className="fixed inset-0 z-[120] pointer-events-none select-none">
      {/* 1. 全局輕微半透明遮罩 (不透明度調低，保持底層內容清晰透亮) */}
      <div
        className="fixed inset-0 bg-stone-950/15 pointer-events-auto transition-opacity duration-300"
        onClick={onClose}
      />

      {/* 2. 目標框選高亮光環 (框出對應位置：金色動態外框與投射光芒) */}
      {targetRect && (
        <div
          className="fixed rounded-3xl ring-4 ring-amber-400 ring-offset-2 ring-offset-black/30 pointer-events-none transition-all duration-300 ease-out shadow-[0_0_35px_rgba(245,158,11,0.95)] z-[121] animate-pulse"
          style={{
            top: `${Math.max(8, targetRect.top - 6)}px`,
            left: `${Math.max(8, targetRect.left - 6)}px`,
            width: `${Math.min(window.innerWidth - 16, targetRect.width + 12)}px`,
            height: `${targetRect.height + 12}px`,
          }}
        />
      )}

      {/* 3. 浮動 HUD 導覽控制器 (位於畫面下方或上方，不遮擋重點) */}
      <div
        className={`fixed left-1/2 -translate-x-1/2 z-[122] w-[95vw] max-w-xl pointer-events-auto transition-all duration-300 ease-out ${
          activeRole === 'compare'
            ? 'top-1/2 -translate-y-1/2 max-w-2xl'
            : isTargetNearBottom
            ? 'top-4'
            : 'bottom-4 sm:bottom-6'
        }`}
      >
        <div className="bg-stone-900/95 text-white p-4 sm:p-5 rounded-3xl shadow-[0_15px_45px_rgba(0,0,0,0.6)] border border-amber-400/80 backdrop-blur-md flex flex-col gap-3">
          {/* 身分切換標籤列 */}
          <div className="flex items-center justify-between border-b border-stone-800 pb-2.5 gap-2">
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
                <span>痛點參賽者</span>
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
              className="text-stone-400 hover:text-white p-1 rounded-xl hover:bg-stone-800 cursor-pointer transition-colors shrink-0"
              title="關閉導覽"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 內容區塊 */}
          {activeRole === 'compare' ? (
            /* 兩站差異對照專區 */
            <div className="space-y-3.5 py-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Shuffle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-200">
                    兩個網站的功能差異解析
                  </h3>
                  <p className="text-stone-300 text-xs">
                    創星季與 IdeaX 創點子主站互聯互通，隨時可一鍵切換！
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* 創星季 */}
                <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/50 space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-black text-sm">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>🏆 創星季賽事官網</span>
                  </div>
                  <ul className="space-y-1.5 text-stone-200 leading-relaxed list-disc list-inside">
                    <li><strong className="text-amber-200">瀏覽痛點</strong> 與解方總覽</li>
                    <li><strong className="text-amber-200">模擬募資</strong> 與群眾注資評分</li>
                    <li><strong className="text-amber-200">提案管理</strong> 與組隊參賽</li>
                    <li><strong className="text-amber-200">官方競賽時程</strong> 與官方競賽大獎爭取</li>
                  </ul>
                  <div className="pt-1">
                    <span className="text-[10px] text-amber-400 font-bold block">
                      ★ 核心使命：校園與青年創新想法的落地驗證場
                    </span>
                  </div>
                </div>

                {/* 創點子主站 */}
                <div className="p-3.5 rounded-2xl bg-stone-800/60 border border-stone-700 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-300 font-black text-sm">
                    <Lightbulb className="w-4 h-4 text-emerald-400" />
                    <span>💡 IdeaX 創點子</span>
                  </div>
                  <ul className="space-y-1.5 text-stone-200 leading-relaxed list-disc list-inside">
                    <li><strong className="text-emerald-200">痛點與方案回應</strong> 永久存放庫</li>
                    <li><strong className="text-emerald-200">日常高額懸賞提問</strong> 與專利解鎖</li>
                    <li><strong className="text-emerald-200">專家 1 對 1 諮詢</strong> 與私聊媒合</li>
                    <li><strong className="text-emerald-200">AI 進階工具</strong> 與賞金安全提領</li>
                  </ul>
                  <div className="pt-1">
                    <span className="text-[10px] text-emerald-400 font-bold block">
                      ★ 核心使命：高價值問題與解決方案的長期交易市場
                    </span>
                  </div>
                </div>
              </div>

              {/* 切換按鈕 */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-800 gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSelectRole('audience')}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold cursor-pointer"
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
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-stone-950 font-black text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <span>造訪 IdeaX創點子</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : currentStep ? (
            /* 步驟內容 */
            <div className="space-y-3">
              {/* 步驟標題與進度 */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-black shrink-0">
                    <currentStep.icon className="w-4 h-4 text-stone-950" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/40 font-mono">
                        {stepIndex + 1} / {currentSteps.length}
                      </span>
                      <h4 className="text-sm font-black text-amber-100">
                        {currentStep.title}
                      </h4>
                    </div>
                  </div>
                </div>
              </div>

              {/* 使用者指定的文字說明 */}
              <div className="p-3 rounded-2xl bg-stone-800/70 border border-stone-700/80 text-xs sm:text-[13px] text-stone-100 font-medium leading-relaxed">
                「{currentStep.description}」
              </div>

              {/* 附註提醒（如果有） */}
              {currentStep.note && (
                <div className="text-[11px] text-amber-300 bg-amber-950/50 p-2 rounded-xl border border-amber-500/30 font-medium">
                  {currentStep.note}
                </div>
              )}

              {/* 控制列：上一步 / 下一步 / 動作按鈕 */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-800 gap-2">
                <div className="flex items-center gap-1.5">
                  {stepIndex > 0 ? (
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>上一步</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-3 py-1.5 rounded-xl text-stone-400 hover:text-white text-xs font-bold cursor-pointer"
                    >
                      略過教學
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {currentStep.actionText && currentStep.actionCallback && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        currentStep.actionCallback?.();
                      }}
                      className="px-3 py-1.5 rounded-xl border border-amber-400/80 text-amber-300 hover:bg-amber-400/20 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>{currentStep.actionText}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
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
