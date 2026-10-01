import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
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

interface ChatOnboardingGuideProps {
  isOpen: boolean;
  onClose: () => void;
  isOfferModalOpen: boolean;
  isRequestModalOpen: boolean;
  isSubmitAnswerModalOpen: boolean;
  isPlusMenuOpen: boolean;
  onOpenPlusMenu: () => void;
  onOpenOfferModal: () => void;
  onOpenRequestModal: () => void;
  onOpenSubmitAnswerModal: () => void;
}

export const ChatOnboardingGuide: React.FC<ChatOnboardingGuideProps> = ({
  isOpen,
  onClose,
  isOfferModalOpen,
  isRequestModalOpen,
  isSubmitAnswerModalOpen,
  isPlusMenuOpen,
  onOpenPlusMenu,
  onOpenOfferModal,
  onOpenRequestModal,
  onOpenSubmitAnswerModal,
}) => {
  // Step 1: 自訂方案報價, Step 2: 詢價委託, Step 3: 提出方案, Step 4: AI 調解說明
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [visitedModal, setVisitedModal] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const callbacksRef = useRef({
    onClose,
    onOpenPlusMenu,
    onOpenOfferModal,
    onOpenRequestModal,
    onOpenSubmitAnswerModal,
  });

  callbacksRef.current = {
    onClose,
    onOpenPlusMenu,
    onOpenOfferModal,
    onOpenRequestModal,
    onOpenSubmitAnswerModal,
  };

  // Track modal open/close transitions to advance steps naturally after user closes previewed modal
  useEffect(() => {
    if (!isOpen) return;

    if (currentStep === 1) {
      if (isOfferModalOpen) {
        setVisitedModal(true);
      } else if (visitedModal && !isOfferModalOpen) {
        setVisitedModal(false);
        setCurrentStep(2);
        callbacksRef.current.onOpenPlusMenu();
      }
    } else if (currentStep === 2) {
      if (isRequestModalOpen) {
        setVisitedModal(true);
      } else if (visitedModal && !isRequestModalOpen) {
        setVisitedModal(false);
        setCurrentStep(3);
        callbacksRef.current.onOpenPlusMenu();
      }
    } else if (currentStep === 3) {
      if (isSubmitAnswerModalOpen) {
        setVisitedModal(true);
      } else if (visitedModal && !isSubmitAnswerModalOpen) {
        setVisitedModal(false);
        setCurrentStep(4);
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

  // Ensure menu is open when in step 1, 2, 3, 4 (if not currently inspecting a modal)
  const isAnyModalOpen = isOfferModalOpen || isRequestModalOpen || isSubmitAnswerModalOpen;

  useEffect(() => {
    if (isOpen && !isAnyModalOpen && !isPlusMenuOpen) {
      callbacksRef.current.onOpenPlusMenu();
    }
  }, [isOpen, isAnyModalOpen, isPlusMenuOpen]);

  // Target element ID for current step
  const getTargetId = useCallback(() => {
    switch (currentStep) {
      case 1:
        return 'chat-menu-item-offer';
      case 2:
        return 'chat-menu-item-request';
      case 3:
        return 'chat-menu-item-submit';
      case 4:
        return 'chat-menu-item-mediation';
      default:
        return 'chat-menu-item-offer';
    }
  }, [currentStep]);

  // Update target rect (Strictly scoped to current step target ID)
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
    const timer = setTimeout(updateRect, 100);

    const handleResize = () => updateRect();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      clearTimeout(timer);
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
      setCurrentStep(2);
      callbacksRef.current.onOpenPlusMenu();
    } else if (currentStep === 2) {
      setCurrentStep(3);
      callbacksRef.current.onOpenPlusMenu();
    } else if (currentStep === 3) {
      setCurrentStep(4);
      callbacksRef.current.onOpenPlusMenu();
    } else {
      handleFinish();
    }
  }, [currentStep, handleFinish]);

  const handlePrevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
      callbacksRef.current.onOpenPlusMenu();
    }
  }, [currentStep]);

  if (!isOpen) return null;

  // Case A: User is currently inside one of the previewed modals (Step 1, 2, or 3)
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
              {currentStep}/4 瀏覽中
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

  // Case B: Floating step tooltip HUD - NO blur, completely clear background
  return createPortal(
    <div className="fixed inset-0 z-[105] pointer-events-none select-none">
      {/* Crisp glowing highlight around current item in attachment menu */}
      {targetRect && (
        <div
          className="fixed rounded-xl ring-4 ring-amber-400 ring-offset-2 ring-offset-transparent pointer-events-none transition-all duration-200 ease-out shadow-[0_0_20px_rgba(245,158,11,0.85)] z-[106]"
          style={{
            top: `${Math.max(4, targetRect.top - 2)}px`,
            left: `${Math.max(4, targetRect.left - 2)}px`,
            width: `${targetRect.width + 4}px`,
            height: `${targetRect.height + 4}px`,
          }}
        >
          <span className="absolute -top-3 left-3 px-2 py-0.5 bg-amber-500 text-stone-950 font-black text-[10px] rounded-full shadow-md">
            重點標示
          </span>
        </div>
      )}

      {/* Non-blocking concise floating HUD bar */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[107] w-[94vw] max-w-lg pointer-events-auto">
        <div className="bg-stone-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-amber-400/80 backdrop-blur-md flex flex-col gap-2">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-black">
                {currentStep === 1 && <Award className="w-3.5 h-3.5" />}
                {currentStep === 2 && <HelpCircle className="w-3.5 h-3.5" />}
                {currentStep === 3 && <FileText className="w-3.5 h-3.5" />}
                {currentStep === 4 && <Scale className="w-3.5 h-3.5" />}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-amber-300 bg-amber-950 px-1.5 py-0.2 rounded border border-amber-500/40">
                  聊天室教學 {currentStep}/4
                </span>
                <h4 className="text-xs sm:text-sm font-black text-amber-100">
                  {currentStep === 1 && '1. 發起自訂方案報價'}
                  {currentStep === 2 && '2. 發起詢價委託'}
                  {currentStep === 3 && '3. 提出方案'}
                  {currentStep === 4 && '4. 申請 AI 調解'}
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

          {/* Concise explanation */}
          <div className="text-xs text-stone-200 font-medium leading-relaxed">
            {currentStep === 1 && (
              <p>
                <strong className="text-amber-300">「自訂方案報價」</strong>：解答者可自訂服務項目、時程與分階段報價。點擊選單按鈕可開啟瀏覽，關閉後自動繼續。
              </p>
            )}
            {currentStep === 2 && (
              <p>
                <strong className="text-amber-300">「詢價委託」</strong>：提問者向專家提出需求痛點、預期交付成果與預算上限。點擊選單按鈕可開啟瀏覽。
              </p>
            )}
            {currentStep === 3 && (
              <p>
                <strong className="text-amber-300">「提出方案」</strong>：針對問題提交具體解方、交付附件與驗收里程碑。點擊選單按鈕可開啟瀏覽。
              </p>
            )}
            {currentStep === 4 && (
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

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-1 border-t border-stone-800">
            {/* Dots */}
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setCurrentStep(s as 1 | 2 | 3 | 4);
                    callbacksRef.current.onOpenPlusMenu();
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

              {currentStep < 4 ? (
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
