import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  X,
  ExternalLink,
  RefreshCw,
  Globe,
  FileText,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Share2,
  Check,
  Maximize2,
  Minimize2,
  Sparkles,
} from 'lucide-react';
import { Question } from '../types';
import { toEmbedTarget, EMBED_PLATFORM_LABEL } from '../utils/embedPlatforms';
import { extractYoutubeVideoId } from '../utils/youtubeUtils';
import { getFormattedAppNameAndTitle } from './QuestionCard';
import {
  resolveUserDisplayName,
  resolveUserAvatar,
  getUserNameColorClass,
  isPlatformPublishedWork,
  PLATFORM_CURATED_NAME,
  PLATFORM_CURATED_AVATAR,
} from '../utils/userDisplay';
import { useApp } from '../context/AppContext';
import { shareOrCopyUrl } from '../utils/shareUtils';
import { AdminDelistModal } from './AdminDelistModal';
import {
  calculateNewExperienceRating,
  getExperienceScore,
  ExperienceVote,
  getLocalExperienceVotes,
} from '../utils/experienceRating';
import { syncQuestionToFirestore } from '../services/firestoreSync';

interface FullscreenAppEmbedViewProps {
  question: Question;
  onClose: () => void;
  onViewDescription: (question: Question) => void;
}

type EmbedStatus = 'loading' | 'loaded' | 'blocked' | 'timeout' | 'error';

export const FullscreenAppEmbedView: React.FC<FullscreenAppEmbedViewProps> = ({
  question,
  onClose,
  onViewDescription,
}) => {
  const { availableUsers, showCenterToast, currentUser, setQuestions } = useApp();
  const [isAdminDelistModalOpen, setIsAdminDelistModalOpen] = useState(false);
  const [showExitRatingModal, setShowExitRatingModal] = useState(false);

  const existingVote = useMemo(() => {
    return question.id ? getLocalExperienceVotes()[question.id] : undefined;
  }, [question.id]);

  const handleRequestClose = useCallback(() => {
    setShowExitRatingModal(true);
  }, []);

  const handleSkipRatingAndClose = useCallback(() => {
    setShowExitRatingModal(false);
    onClose();
  }, [onClose]);

  const handleVoteAndClose = useCallback((vote: ExperienceVote) => {
    const { updatedQuestion, score, total } = calculateNewExperienceRating(question, vote);
    
    // 即時更新全域 AppContext 題目資料
    setQuestions((prev) =>
      prev.map((q) => (q.id === updatedQuestion.id ? updatedQuestion : q))
    );
    // 背景同步至雲端 Firestore
    void syncQuestionToFirestore(updatedQuestion).catch(() => {});

    const voteLabel = vote === 'thumbs_up' ? '👍🏻 讚 (100分)' : vote === 'neutral' ? '😐 普通 (0分)' : '👎🏻 倒讚 (0分)';
    if (showCenterToast) {
      showCenterToast(`感謝您的回饋！【${voteLabel}】`, `平均體驗評分已即時計算為 ${score} 分 (共 ${total} 人評分)`, {
        type: 'success',
        duration: 3000,
      });
    }

    setShowExitRatingModal(false);
    onClose();
  }, [question, setQuestions, showCenterToast, onClose]);

  // 取得目標體驗網址 (demoUrl 或 externalLink 或上架平台連結)
  const targetRawUrl = useMemo(() => {
    if (question.demoUrl && question.demoUrl.trim()) return question.demoUrl.trim();
    if (question.externalLink && question.externalLink.trim()) return question.externalLink.trim();
    if (Array.isArray(question.publishedPlatforms) && question.publishedPlatforms.length > 0) {
      const firstValid = question.publishedPlatforms.find((p) => p && typeof p.url === 'string' && p.url.trim().length > 0);
      if (firstValid && firstValid.url) return firstValid.url.trim();
    }
    return '';
  }, [question]);

  const { embedUrl, openUrl, platform } = useMemo(() => toEmbedTarget(targetRawUrl), [targetRawUrl]);
  const loadTimeoutMs = platform ? 30000 : 9000;

  const [status, setStatus] = useState<EmbedStatus>('loading');
  const [blockReason, setBlockReason] = useState<string>('');
  const [reloadKey, setReloadKey] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);

  const iframeLoadedRef = useRef(false);
  const blockedByServerRef = useRef(false);

  const { appName: rawAppName, cleanTitle } = useMemo(() => {
    return getFormattedAppNameAndTitle(question);
  }, [question]);

  const displayAppName = question.appName || rawAppName;

  const isPlatformWork = isPlatformPublishedWork(question);
  const authorDisplayName = isPlatformWork
    ? PLATFORM_CURATED_NAME
    : resolveUserDisplayName(question.authorId, question.authorName, availableUsers);
  const authorDisplayAvatar = isPlatformWork
    ? PLATFORM_CURATED_AVATAR
    : resolveUserAvatar(question.authorId, question.authorAvatar, availableUsers);

  const isValidWebUrl = useMemo(() => {
    if (!targetRawUrl) return false;
    try {
      const parsed = new URL(targetRawUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
      if (extractYoutubeVideoId(targetRawUrl)) return false;
      return true;
    } catch {
      return false;
    }
  }, [targetRawUrl]);

  // 鍵盤 Esc 監聽：跳出體驗評分或直接關閉
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showExitRatingModal) {
          setShowExitRatingModal(false);
          onClose();
        } else {
          setShowExitRatingModal(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showExitRatingModal, onClose]);

  // 鎖定背景捲動
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // 網址檢測與載入逾時保護
  useEffect(() => {
    if (!isValidWebUrl) {
      setStatus('loaded');
      return;
    }

    let cancelled = false;
    iframeLoadedRef.current = false;
    blockedByServerRef.current = false;
    setStatus('loading');
    setBlockReason('');

    const timeoutId = window.setTimeout(() => {
      if (!cancelled && !iframeLoadedRef.current && !blockedByServerRef.current) {
        setStatus('timeout');
        setBlockReason('內嵌預覽載入超時，目標網站可能回應較慢或設有存取保護。');
      }
    }, loadTimeoutMs);

    fetch(`/api/competition/check-embed?url=${encodeURIComponent(embedUrl)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.canEmbed === false) {
          blockedByServerRef.current = true;
          window.clearTimeout(timeoutId);
          setStatus('blocked');
          if (data.reason === 'x-frame-options' || data.reason === 'csp-frame-ancestors') {
            setBlockReason('此作品網站設有嚴格安全保護策略（禁止 iframe 嵌入），請點擊下方「前往網站」按鈕前往體驗。');
          } else if (data.reason === 'demo-placeholder' || data.reason === 'unreachable') {
            setBlockReason('目標網址連線異常或為範例佔位網址，請點擊「前往網站」前往。');
          } else {
            setBlockReason('目標網站不支援直接試玩預覽，請點擊「前往網站」前往體驗。');
          }
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isValidWebUrl, embedUrl, loadTimeoutMs, reloadKey]);

  const handleRetry = () => {
    setReloadKey((prev) => prev + 1);
  };

  const handleShare = async () => {
    const success = await shareOrCopyUrl({
      title: `${displayAppName ? `【${displayAppName}】` : ''}${cleanTitle} - IdeaX 軟體作品體驗`,
      text: question.description || cleanTitle,
      url: window.location.href,
    });
    if (success) {
      setIsCopied(true);
      if (showCenterToast) {
        showCenterToast('連結已複製至剪貼簿！', '可直接貼上分享給朋友體驗', { type: 'success', duration: 2500 });
      }
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleToggleNativeFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsNativeFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsNativeFullscreen(false);
      }
    }
  };

  const isFailed = status === 'blocked' || status === 'timeout' || status === 'error';

  return (
    <div className="fixed inset-0 z-[150] w-screen h-screen bg-stone-950 flex flex-col overflow-hidden text-stone-100 select-none animate-in fade-in duration-200">
      {/* 頂部極簡控制列 (Top Toolbar) */}
      <header className="h-14 sm:h-16 px-3 sm:px-5 bg-stone-900/95 border-b border-stone-800 flex items-center justify-between gap-3 backdrop-blur-md shrink-0 z-30">
        {/* 左側：返回鍵 + 作品名稱與標籤 */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <button
            type="button"
            onClick={handleRequestClose}
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-stone-200 hover:text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 border border-stone-700/80 shadow-xs shrink-0"
            title="關閉試玩體驗，返回列表 (Esc)"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">返回展場</span>
            <span className="sm:hidden">返回</span>
          </button>

          <div className="h-5 w-px bg-stone-800 shrink-0 hidden sm:block" />

          <div className="flex items-center gap-2 min-w-0">
            {displayAppName && (
              <span className="text-xs sm:text-sm font-black text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-lg shrink-0 truncate max-w-[140px] sm:max-w-[200px]">
                {displayAppName}
              </span>
            )}
            <h2 className="text-xs sm:text-sm font-bold text-stone-100 truncate max-w-[160px] sm:max-w-[280px] md:max-w-[420px]">
              {cleanTitle}
            </h2>

            <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>試玩體驗</span>
            </span>

            {platform && (
              <span className="hidden lg:inline-flex text-[11px] font-black px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                {EMBED_PLATFORM_LABEL[platform]}
              </span>
            )}

            {question.tertiaryCategory && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                <span>🎮 遊戲 › {question.tertiaryCategory}</span>
              </span>
            )}
          </div>
        </div>

        {/* 右側：網址、詳細說明（桌面版保留，手機版隱藏防擁擠）、重新載入、在新分頁開啟、分享與關閉 */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onViewDescription(question)}
            className="hidden sm:inline-flex px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-bold items-center gap-1.5 transition-colors border border-stone-700/80 cursor-pointer shadow-xs"
            title="查看作品詳細說明、架構與版本日誌"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>詳細說明</span>
          </button>
          {isValidWebUrl && !isFailed && (
            <button
              type="button"
              onClick={handleRetry}
              className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-bold inline-flex items-center gap-1 transition-colors border border-stone-700/80 cursor-pointer"
              title="重新載入作品畫面"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">重新整理</span>
            </button>
          )}

          {isValidWebUrl && (
            <a
              href={openUrl || targetRawUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black inline-flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              title="前往作者官方網站體驗與支持"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">前往網站</span>
            </a>
          )}

          <button
            type="button"
            onClick={handleShare}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors border border-stone-700/80 cursor-pointer"
            title="分享作品"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          </button>

          {currentUser?.role === 'admin' && (
            <button
              type="button"
              onClick={() => setIsAdminDelistModalOpen(true)}
              className="hidden md:inline-flex px-2.5 py-1.5 rounded-xl bg-rose-900/80 hover:bg-rose-800 text-rose-200 text-xs font-bold items-center gap-1 transition-colors border border-rose-700/80 cursor-pointer shadow-xs"
              title="管理員下架此作品"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden lg:inline">下架作品</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleNativeFullscreen}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors border border-stone-700/80 cursor-pointer hidden md:flex items-center justify-center"
            title={isNativeFullscreen ? '退出瀏覽器全螢幕' : '瀏覽器全螢幕視圖'}
          >
            {isNativeFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleRequestClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-rose-900/80 hover:text-rose-200 text-stone-400 transition-colors border border-stone-700/80 cursor-pointer"
            title="關閉瀏覽 (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 主體畫面：滿版嵌入 iframe 或友善連線提示或無網址預覽卡片 */}
      <main className="flex-1 w-full h-full relative bg-stone-900 overflow-hidden select-auto">
        {!isValidWebUrl ? (
          /* 沒有提供 demoUrl 或外連的軟體作品預覽卡片 */
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
            <div className="max-w-xl w-full bg-stone-900/90 border border-stone-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 mx-auto flex items-center justify-center">
                <Globe className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <div className="text-xs font-black text-amber-400 tracking-wider uppercase">
                  {displayAppName || '軟體網站作品'}
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {cleanTitle}
                </h3>
                <p className="text-xs sm:text-sm text-stone-400 leading-relaxed pt-1">
                  {question.description || '此作品目前尚未配置公開線上體驗網址，您可以點擊右下角按鍵查看作者提供的完整規格架構、更新日誌與截圖說明。'}
                </p>
              </div>

              {/* 開發者名牌 */}
              <div className="p-3 rounded-2xl bg-stone-800/80 border border-stone-700/60 flex items-center justify-center gap-3">
                <img
                  src={authorDisplayAvatar}
                  alt={authorDisplayName}
                  className="w-10 h-10 rounded-full object-cover border border-stone-600"
                />
                <div className="text-left">
                  <div className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                    <span>{authorDisplayName}</span>
                    {isPlatformWork && (
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40">
                        精選刊登
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-400">{isPlatformWork ? '官方審核精選 / 平台推薦作品' : '作品創作者 / 開發者'}</div>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => onViewDescription(question)}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
                >
                  <FileText className="w-4 h-4" />
                  <span>查看詳細內容與架構</span>
                </button>
                <button
                  type="button"
                  onClick={handleRequestClose}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-sm transition-colors cursor-pointer"
                >
                  返回展場列表
                </button>
              </div>
            </div>
          </div>
        ) : isFailed ? (
          /* 目標網站設有安全政策 (X-Frame-Options / CSP) 或逾時 fallback 畫面 */
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
            <div className="max-w-lg w-full bg-stone-900/90 border border-stone-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-black text-white">
                  此網站限制內嵌連線，已為您準備好「前往網站」
                </h3>
                <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                  {blockReason || '目標網站設有安全保護政策（禁止 iframe 嵌入）或連線載入超時，請點擊下方按鈕直接前往官方網站體驗與支持。'}
                </p>
                <div className="text-[11px] font-mono text-stone-500 break-all p-2 rounded-xl bg-stone-950/80 border border-stone-800">
                  {openUrl || targetRawUrl}
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href={openUrl || targetRawUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
                >
                  <Globe className="w-4 h-4" />
                  <span>前往網站</span>
                  <ExternalLink className="w-4 h-4" />
                </a>

                <button
                  type="button"
                  onClick={handleRetry}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>再試一次</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 正常載入 iframe */
          <div className="w-full h-full relative">
            {status === 'loading' && (
              <div className="absolute inset-0 z-20 bg-stone-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 p-6 text-center">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                <div className="text-sm font-bold text-stone-200">
                  正在載入軟體作品試玩體驗...
                </div>
                {platform && (
                  <div className="text-xs text-stone-400 max-w-sm leading-relaxed">
                    💡 {EMBED_PLATFORM_LABEL[platform]} 專案若閒置會自動休眠，首次喚醒約需 20~30 秒，請稍候。
                  </div>
                )}
                <a
                  href={openUrl || targetRawUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-indigo-300 hover:text-white border border-stone-700 text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <span>若載入較慢可直接「前往網站」</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            <iframe
              key={reloadKey}
              src={embedUrl}
              title={`${displayAppName || ''} ${cleanTitle} - 試玩體驗`}
              className="w-full h-full border-0 bg-white"
              allow="clipboard-read; clipboard-write; fullscreen; autoplay; microphone; camera; geolocation"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads"
              onLoad={() => {
                iframeLoadedRef.current = true;
                if (!blockedByServerRef.current) {
                  setStatus('loaded');
                }
              }}
              onError={() => {
                if (!blockedByServerRef.current) {
                  setStatus('error');
                  setBlockReason('網頁載入時發生錯誤，請直接點擊「前往網站」。');
                }
              }}
            />
          </div>
        )}
      </main>

      {/* 邊框貼邊精簡按鍵：依箭頭移至右下角、縮窄寬度（「詳情」2字、不佔畫面與遊戲視線） */}
      <div className="fixed right-0 bottom-16 sm:bottom-20 z-[160] pointer-events-auto">
        <button
          type="button"
          onClick={() => onViewDescription(question)}
          className="group pl-2 pr-1.5 py-1 rounded-l-md bg-stone-900/85 hover:bg-amber-400 text-stone-300 hover:text-stone-950 border-y border-l border-stone-700/80 hover:border-amber-300 shadow-md backdrop-blur-xs flex items-center gap-1 transition-all duration-150 cursor-pointer active:scale-95"
          title="查看作品詳細內容、版本紀錄與討論"
        >
          <FileText className="w-3 h-3 text-amber-400 group-hover:text-stone-950 transition-colors shrink-0" />
          <span className="text-[11px] font-black tracking-tight">詳情</span>
        </button>
      </div>

      {/* 離開試玩體驗時的「體驗如何？」評分彈窗 */}
      {showExitRatingModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rating-modal-title"
          >
            {/* 略過 X 按鈕 */}
            <button
              type="button"
              onClick={handleSkipRatingAndClose}
              className="absolute top-4 right-4 p-2 rounded-xl text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors cursor-pointer"
              title="略過並返回"
            >
              <X className="w-4 h-4" />
            </button>

            {/* 標題與簡介 */}
            <div className="space-y-2 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black">
                <Sparkles className="w-3.5 h-3.5" />
                <span>試玩回饋</span>
              </div>
              <h3 id="rating-modal-title" className="text-xl sm:text-2xl font-black text-white">
                體驗如何？
              </h3>
              <p className="text-xs sm:text-sm text-stone-400 leading-relaxed max-w-xs mx-auto">
                點擊為《{cleanTitle}》留下您的直覺評價，幫助創作者打造更好的作品！
              </p>
            </div>

            {/* 現有平均分數統計提示 */}
            {(() => {
              const currentScore = getExperienceScore(question);
              return (
                <div className="py-2 px-3 rounded-xl bg-stone-950/70 border border-stone-800/80 flex items-center justify-around text-xs">
                  <div>
                    <span className="text-stone-500 font-bold block text-[10px]">平均體驗評分</span>
                    <span className="font-black text-amber-400 text-sm">
                      {currentScore.totalRatings > 0 ? `${currentScore.score} 分` : '尚無評分'}
                    </span>
                  </div>
                  <div className="h-6 w-px bg-stone-800" />
                  <div>
                    <span className="text-stone-500 font-bold block text-[10px]">評分人數</span>
                    <span className="font-bold text-stone-300 text-sm">
                      {currentScore.totalRatings} 位探索者
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* 三種評價選項按鈕：👍🏻 讚 (100分)、😐 普通 (0分)、👎🏻 倒讚 (0分) */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 pt-1">
              {/* 👍🏻 讚 */}
              <button
                type="button"
                onClick={() => handleVoteAndClose('thumbs_up')}
                className={`group relative p-3 sm:p-4 rounded-2xl border transition-all duration-200 flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                  existingVote === 'thumbs_up'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/10'
                    : 'bg-stone-800/80 hover:bg-emerald-950/40 border-stone-700/70 hover:border-emerald-500/60 text-stone-200 hover:text-emerald-300'
                }`}
              >
                <span className="text-3xl sm:text-4xl filter group-hover:scale-110 transition-transform duration-150">
                  👍🏻
                </span>
                <span className="text-xs sm:text-sm font-black text-white group-hover:text-emerald-300">
                  讚
                </span>
                <span className="text-[10px] font-bold text-emerald-400/90 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                  100 分
                </span>
              </button>

              {/* 😐 普通 */}
              <button
                type="button"
                onClick={() => handleVoteAndClose('neutral')}
                className={`group relative p-3 sm:p-4 rounded-2xl border transition-all duration-200 flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                  existingVote === 'neutral'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-2 ring-amber-500/40 shadow-lg shadow-amber-500/10'
                    : 'bg-stone-800/80 hover:bg-amber-950/40 border-stone-700/70 hover:border-amber-500/60 text-stone-200 hover:text-amber-300'
                }`}
              >
                <span className="text-3xl sm:text-4xl filter group-hover:scale-110 transition-transform duration-150">
                  😐
                </span>
                <span className="text-xs sm:text-sm font-black text-white group-hover:text-amber-300">
                  普通
                </span>
                <span className="text-[10px] font-bold text-amber-400/90 bg-amber-500/10 px-1.5 py-0.2 rounded">
                  0 分
                </span>
              </button>

              {/* 👎🏻 倒讚 */}
              <button
                type="button"
                onClick={() => handleVoteAndClose('thumbs_down')}
                className={`group relative p-3 sm:p-4 rounded-2xl border transition-all duration-200 flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                  existingVote === 'thumbs_down'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 ring-2 ring-rose-500/40 shadow-lg shadow-rose-500/10'
                    : 'bg-stone-800/80 hover:bg-rose-950/40 border-stone-700/70 hover:border-rose-500/60 text-stone-200 hover:text-rose-300'
                }`}
              >
                <span className="text-3xl sm:text-4xl filter group-hover:scale-110 transition-transform duration-150">
                  👎🏻
                </span>
                <span className="text-xs sm:text-sm font-black text-white group-hover:text-rose-300">
                  倒讚
                </span>
                <span className="text-[10px] font-bold text-rose-400/90 bg-rose-500/10 px-1.5 py-0.2 rounded">
                  0 分
                </span>
              </button>
            </div>

            {/* 略過與關閉按鈕 */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSkipRatingAndClose}
                className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 text-xs font-bold transition-colors cursor-pointer"
              >
                略過，直接返回展場
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 管理員下架作品彈窗 */}
      <AdminDelistModal
        isOpen={isAdminDelistModalOpen}
        onClose={() => setIsAdminDelistModalOpen(false)}
        targetId={question.id}
        targetTitle={question.appName || question.title}
        targetType="app"
        onSuccess={onClose}
      />
    </div>
  );
};
