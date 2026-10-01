import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  MessageSquare,
  Plus,
  Award,
  HelpCircle,
  FileText,
  Scale,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
} from 'lucide-react';

export const CHAT_ONBOARDING_STORAGE_KEY = 'ideax_chat_onboarding_completed_v1';

export type ChatOnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;

interface ChatOnboardingGuideProps {
  isOpen: boolean;
  onClose: () => void;
  activeConversationId: string | null;
  isOfferModalOpen: boolean;
  isRequestModalOpen: boolean;
  isSubmitAnswerModalOpen: boolean;
  isPlusMenuOpen: boolean;
  onSelectFirstConversation: () => void;
  onOpenPlusMenu: () => void;
  onOpenOfferModal: () => void;
  onOpenRequestModal: () => void;
  onOpenSubmitAnswerModal: () => void;
}

export const ChatOnboardingGuide: React.FC<ChatOnboardingGuideProps> = ({
  isOpen,
  onClose,
  activeConversationId,
  isOfferModalOpen,
  isRequestModalOpen,
  isSubmitAnswerModalOpen,
  isPlusMenuOpen,
  onSelectFirstConversation,
  onOpenPlusMenu,
}) => {
  // Step 1: 點選聊天室進入對話
  // Step 2: 點擊「＋」展開選單
  // Step 3: 自訂方案報價
  // Step 4: 詢價委託
  // Step 5: 提出方案
  // Step 6: 申請 AI 調解
  const [currentStep, setCurrentStep] = useState<ChatOnboardingStep>(1);
  const [visitedModal, setVisitedModal] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const callbacksRef = useRef({
    onClose,
    onSelectFirstConversation,
    onOpenPlusMenu,
  });

  callbacksRef.current = {
    onClose,
    onSelectFirstConversation,
    onOpenPlusMenu,
  };

  // 當用戶在步驟 1 點擊聊天室進入後，自動進入步驟 2
  useEffect(() => {
    if (!isOpen) return;
    if (currentStep === 1 && activeConversationId) {
      setCurrentStep(2);
    }
  }, [isOpen, currentStep, activeConversationId]);

  // 當用戶在步驟 2 點擊「＋」號展開選單後，自動進入步驟 3 (自訂方案報價)
  useEffect(() => {
    if (!isOpen) return;
    if (currentStep === 2 && isPlusMenuOpen) {
      setCurrentStep(3);
    }
  }, [isOpen, currentStep, isPlusMenuOpen]);

  // 進入步驟 3, 4, 5, 6 時，若選單未開啟且非正在檢視彈窗，確保選單保持展開
  const isAnyModalOpen = isOfferModalOpen || isRequestModalOpen || isSubmitAnswerModalOpen;

  useEffect(() => {
    if (isOpen && currentStep >= 3 && !isAnyModalOpen && !isPlusMenuOpen) {
      callbacksRef.current.onOpenPlusMenu();
    }
  }, [isOpen, currentStep, isAnyModalOpen, isPlusMenuOpen]);

  // 監聽 Modal 開關狀態以平滑推進步驟 (3: 報價, 4: 詢價, 5: 提案)
  useEffect(() => {
    if (!isOpen) return;

    if (currentStep === 3) {
      if (isOfferModalOpen) {
        setVisitedModal(true);
      } else if (visitedModal && !isOfferModalOpen) {
        setVisitedModal(false);
        setCurrentStep(4);
        callbacksRef.current.onOpenPlusMenu();
      }
    } else if (currentStep === 4) {
      if (isRequestModalOpen) {
        setVisitedModal(true);
      } else if (visitedModal && !isRequestModalOpen) {
        setVisitedModal(false);
        setCurrentStep(5);
        callbacksRef.current.onOpenPlusMenu();
      }
    } else if (currentStep === 5) {
      if (isSubmitAnswerModalOpen) {
        setVisitedModal(true);
      } else if (visitedModal && !isSubmitAnswerModalOpen) {
        setVisitedModal(false);
        setCurrentStep(6);
        callbacksRef.current.onOpenPlusMenu();
      }
    }
  }, [
    isOpen,
    currentStep,
    isOfferModalOpen,
    isRequestModalOpen,
    isSubmitAnswerModalOpen,
    visitedModal,
  ]);

  // 獲取當前步驟目標元件 DOM ID
  const getTargetId = useCallback(() => {
    switch (currentStep) {
      case 1:
        return 'chat-conversation-item-0';
      case 2:
        return 'chat-plus-button';
      case 3:
        return 'chat-menu-item-offer';
      case 4:
        return 'chat-menu-item-request';
      case 5:
        return 'chat-menu-item-submit';
      case 6:
        return 'chat-menu-item-mediation';
      default:
        return 'chat-conversation-item-0';
    }
  }, [currentStep]);

  // 計算並更新目標元件螢幕座標
  const updateRect = useCallback(() => {
    if (!isOpen || isAnyModalOpen) {
      setTargetRect(null);
      return;
    }

    const id = getTargetId();
    const el = document.getElementById(id);
    if (el) {
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
  }, [isOpen, isAnyModalOpen, getTargetId]);

  useEffect(() => {
    if (!isOpen) return;
    const timer1 = setTimeout(updateRect, 80);
    const timer2 = setTimeout(updateRect, 220);

    const handleResize = () => updateRect();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isOpen, currentStep, isPlusMenuOpen, updateRect]);

  const handleFinish = useCallback(() => {
    try {
      localStorage.setItem(CHAT_ONBOARDING_STORAGE_KEY, 'true');
    } catch (e) {
      console.error(e);
    }
    callbacksRef.current.onClose();
  }, []);

  const handleSkip = useCallback(() => {
    handleFinish();
  }, [handleFinish]);

  const handleNextStep = useCallback(() => {
    if (currentStep === 1) {
      callbacksRef.current.onSelectFirstConversation();
      setCurrentStep(2);
    } else if (currentStep === 2) {
      callbacksRef.current.onOpenPlusMenu();
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
      callbacksRef.current.onOpenPlusMenu();
    } else if (currentStep === 4) {
      setCurrentStep(5);
      callbacksRef.current.onOpenPlusMenu();
    } else if (currentStep === 5) {
      setCurrentStep(6);
      callbacksRef.current.onOpenPlusMenu();
    } else {
      handleFinish();
    }
  }, [currentStep, handleFinish]);

  const handlePrevStep = useCallback(() => {
    if (currentStep > 1) {
      const prevStep = (currentStep - 1) as ChatOnboardingStep;
      setCurrentStep(prevStep);
      if (prevStep >= 3) {
        callbacksRef.current.onOpenPlusMenu();
      }
    }
  }, [currentStep]);

  if (!isOpen) return null;

  // Case A: 用戶正在瀏覽彈出的功能 Modal (步驟 3, 4, 5)
  if (isAnyModalOpen) {
    const modalTitle = isOfferModalOpen
      ? '發起自訂方案報價'
      : isRequestModalOpen
      ? '發起詢價委託'
      : '提出方案';

    return createPortal(
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[120] w-[94vw] max-w-md pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="bg-stone-900/95 text-white p-3 rounded-2xl shadow-xl border border-amber-400/80 backdrop-blur-md flex items-center justify-between gap-2.5 pointer-events-auto">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-black uppercase text-amber-300 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-500/40 shrink-0">
              {currentStep}/6 瀏覽中
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-200 truncate">{modalTitle}</p>
              <p className="text-[11px] text-stone-300">瀏覽完畢後關閉此視窗，將自動進入下一步教學。</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="text-[11px] text-stone-400 hover:text-white px-2 py-1 rounded-lg hover:bg-stone-800 transition-colors shrink-0 cursor-pointer"
          >
            略過
          </button>
        </div>
      </div>,
      document.body
    );
  }

  // Case B: 浮動步驟引導 HUD 控制條
  return createPortal(
    <div className="fixed inset-0 z-[105] pointer-events-none select-none">
      {/* 聚焦亮框標示 (金色動態呼吸框) */}
      {targetRect && (
        <div
          className="fixed rounded-2xl ring-4 ring-amber-400 ring-offset-2 ring-offset-black/20 pointer-events-none transition-all duration-200 ease-out shadow-[0_0_20px_rgba(245,158,11,0.85)] z-[106]"
          style={{
            top: `${Math.max(4, targetRect.top - 3)}px`,
            left: `${Math.max(4, targetRect.left - 3)}px`,
            width: `${Math.min(window.innerWidth - 8, targetRect.width + 6)}px`,
            height: `${targetRect.height + 6}px`,
          }}
        >
          <span className="absolute -top-3 left-3 px-2 py-0.5 bg-amber-500 text-stone-950 font-black text-[10px] rounded-full shadow-md">
            點此處
          </span>
        </div>
      )}

      {/* 浮動 HUD 導引條 (依目標位置置頂或置底) */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[107] w-[94vw] max-w-lg pointer-events-auto">
        <div className="bg-stone-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-amber-400/80 backdrop-blur-md flex flex-col gap-2">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-black">
                {currentStep === 1 && <MessageSquare className="w-3.5 h-3.5" />}
                {currentStep === 2 && <Plus className="w-3.5 h-3.5" />}
                {currentStep === 3 && <Award className="w-3.5 h-3.5" />}
                {currentStep === 4 && <HelpCircle className="w-3.5 h-3.5" />}
                {currentStep === 5 && <FileText className="w-3.5 h-3.5" />}
                {currentStep === 6 && <Scale className="w-3.5 h-3.5" />}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-amber-300 bg-amber-950 px-1.5 py-0.2 rounded border border-amber-500/40">
                  聊天室教學 {currentStep}/6
                </span>
                <h4 className="text-xs sm:text-sm font-black text-amber-100">
                  {currentStep === 1 && '1. 點選聊天室進入對話'}
                  {currentStep === 2 && '2. 點擊「＋」展開功能選單'}
                  {currentStep === 3 && '3. 發起自訂方案報價'}
                  {currentStep === 4 && '4. 發起詢價委託'}
                  {currentStep === 5 && '5. 提出方案'}
                  {currentStep === 6 && '6. 申請 AI 調解'}
                </h4>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSkip}
              className="text-stone-400 hover:text-white px-2 py-0.5 rounded text-[11px] font-bold hover:bg-stone-800 transition-colors shrink-0 cursor-pointer flex items-center gap-0.5"
            >
              <span>略過</span>
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* 簡潔說明文案 */}
          <div className="text-xs text-stone-200 font-medium leading-relaxed">
            {currentStep === 1 && (
              <p>
                <strong className="text-amber-300">請點擊一個聊天室卡片</strong>，進入專屬諮詢與對話交流介面。
              </p>
            )}
            {currentStep === 2 && (
              <p>
                <strong className="text-amber-300">點擊輸入框左側的「＋」號</strong>，展開豐富的商業交易與提案工具。
              </p>
            )}
            {currentStep === 3 && (
              <p>
                <strong className="text-amber-300">「自訂方案報價」</strong>：解答者可自訂服務項目、時程與分階段報價。點擊選單按鈕可開啟瀏覽，關閉後自動繼續。
              </p>
            )}
            {currentStep === 4 && (
              <p>
                <strong className="text-amber-300">「詢價委託」</strong>：提問者向專家提出需求痛點、預期交付成果與預算上限。點擊選單按鈕可開啟瀏覽。
              </p>
            )}
            {currentStep === 5 && (
              <p>
                <strong className="text-amber-300">「提出方案」</strong>：針對問題提交具體解方、交付附件與驗收里程碑。點擊選單按鈕可開啟瀏覽。
              </p>
            )}
            {currentStep === 6 && (
              <div className="space-y-1 text-[11px]">
                <p>
                  <strong className="text-amber-300">• 時機與效力：</strong>履約有爭議時使用，AI 分析對話與條款生成客觀和解方案。
                </p>
                <p className="text-stone-400 font-normal">
                  💡 此為爭議保全機制，<strong>平時備用無須點進去</strong>。
                </p>
              </div>
            )}
          </div>

          {/* Footer 控制列 */}
          <div className="flex items-center justify-between pt-1 border-t border-stone-800">
            {/* Dots */}
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setCurrentStep(s as ChatOnboardingStep);
                    if (s === 1) {
                      // back to list if needed
                    } else if (s === 2) {
                      callbacksRef.current.onSelectFirstConversation();
                    } else {
                      callbacksRef.current.onSelectFirstConversation();
                      callbacksRef.current.onOpenPlusMenu();
                    }
                  }}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    s === currentStep
                      ? 'w-4 bg-amber-400'
                      : s < currentStep
                      ? 'w-1.5 bg-amber-600'
                      : 'w-1.5 bg-stone-700'
                  }`}
                  title={`跳至步驟 ${s}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-2 py-1 rounded-lg text-xs font-bold text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer flex items-center gap-0.5"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>上一步</span>
                </button>
              )}

              {currentStep < 6 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 text-xs font-black shadow-sm flex items-center gap-1 transition-all cursor-pointer"
                >
                  <span>下一步</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-stone-950 text-xs font-black shadow-sm flex items-center gap-1 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>完成教學・開始暢聊</span>
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
