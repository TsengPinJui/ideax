import React, { useState, useEffect, useRef } from 'react';
import {
  ExternalLink,
  Globe,
  RefreshCw,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Loader2,
  Play,
} from 'lucide-react';
import { extractYoutubeVideoId } from '../utils/youtubeUtils';
import { toEmbedTarget, EMBED_PLATFORM_LABEL } from '../utils/embedPlatforms';

interface VibeCodingEmbedPreviewProps {
  url?: string;
  title: string;
  previewMode?: 'embed' | 'external';
}

type EmbedStatus = 'loading' | 'loaded' | 'blocked' | 'timeout' | 'error';

export const VibeCodingEmbedPreview: React.FC<VibeCodingEmbedPreviewProps> = ({
  url,
  title,
  previewMode = 'embed',
}) => {
  const cleanUrl = (url || '').trim();
  const { embedUrl, platform } = React.useMemo(() => toEmbedTarget(cleanUrl), [cleanUrl]);
  // Streamlit / Hugging Face 免費方案閒置後會休眠，喚醒需較久
  const loadTimeoutMs = platform ? 30000 : 8500;
  const [status, setStatus] = useState<EmbedStatus>('loading');
  const [blockReason, setBlockReason] = useState<string>('');
  const [reloadKey, setReloadKey] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const iframeLoadedRef = useRef(false);
  const blockedByServerRef = useRef(false);

  const isValidWebUrl = React.useMemo(() => {
    if (!cleanUrl) return false;
    try {
      const parsed = new URL(cleanUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
      // 若為純 YouTube 影片連結，已有專屬影片區塊，不重複作為網頁應用嵌入
      if (extractYoutubeVideoId(cleanUrl)) return false;
      return true;
    } catch {
      return false;
    }
  }, [cleanUrl]);

  useEffect(() => {
    if (!isValidWebUrl || previewMode === 'external') return;

    let cancelled = false;
    iframeLoadedRef.current = false;
    blockedByServerRef.current = false;
    setStatus('loading');
    setBlockReason('');

    // 1. 前端載入逾時保護（一般網站 8.5 秒、Streamlit 等平台 30 秒未完成載入則切換為外部連結提示）
    const timeoutId = window.setTimeout(() => {
      if (!cancelled && !iframeLoadedRef.current && !blockedByServerRef.current) {
        setStatus('timeout');
        setBlockReason('預覽載入超時，目標網站可能回應較慢或限制內嵌連線。');
      }
    }, loadTimeoutMs);

    // 2. 後端標頭與連線相容性檢查（偵測 X-Frame-Options / CSP frame-ancestors / 無法連線網域）
    fetch(`/api/competition/check-embed?url=${encodeURIComponent(embedUrl)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.canEmbed === false) {
          blockedByServerRef.current = true;
          window.clearTimeout(timeoutId);
          setStatus('blocked');
          if (data.reason === 'x-frame-options' || data.reason === 'csp-frame-ancestors') {
            setBlockReason('此網站設有安全保護策略（禁止 iframe 嵌入），無法於頁面內直接顯示，請點擊下方「到網站支持」按鈕前往體驗。');
          } else if (data.reason === 'demo-placeholder' || data.reason === 'unreachable') {
            setBlockReason('目前無法於內嵌視窗載入此網址，請點擊「到網站支持」前往。');
          } else {
            setBlockReason('目標網站不支援直接試玩預覽或連線發生異常，請點擊「到網站支持」前往體驗。');
          }
        }
      })
      .catch(() => {
        // 若後端檢查失敗，交由前端 iframe onLoad / timeout 判斷
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [cleanUrl, embedUrl, loadTimeoutMs, isValidWebUrl, previewMode, reloadKey]);

  if (!isValidWebUrl) return null;

  // 若作者設定為僅外部連結開啟（previewMode === 'external'）
  if (previewMode === 'external') {
    return (
      <section className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-indigo-50/80 via-white to-emerald-50/60 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 text-xs font-black text-indigo-950">
            <Globe className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>作品外部網站連結</span>
          </div>
          <p className="text-xs text-stone-600 truncate font-mono">{cleanUrl}</p>
        </div>
        <a
          href={cleanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 shadow-xs transition-colors"
        >
          <span>到網站支持</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </section>
    );
  }

  const handleRetry = () => {
    setReloadKey((prev) => prev + 1);
  };

  const isFailed = status === 'blocked' || status === 'timeout' || status === 'error';

  const previewBody = (
    <div
      className={
        isExpanded
          ? 'fixed inset-2 sm:inset-5 z-[120] bg-white rounded-2xl border-2 border-indigo-300 shadow-2xl flex flex-col overflow-hidden'
          : '-mx-4 sm:mx-0 w-[calc(100%+2rem)] sm:w-full rounded-none sm:rounded-2xl border-y sm:border border-indigo-200 bg-white shadow-xs overflow-hidden flex flex-col'
      }
    >
      {/* Top Toolbar */}
      <div className="px-3.5 sm:px-4 py-2.5 bg-stone-900 text-white flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-black shrink-0">
            <Play className="w-3 h-3 fill-emerald-400 text-emerald-400" />
            <span>試玩體驗區</span>
          </span>
          {platform && (
            <span className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-400/40 text-rose-200 text-[11px] font-black shrink-0">
              {EMBED_PLATFORM_LABEL[platform]}
            </span>
          )}
          <span className="text-xs font-bold text-stone-200 truncate hidden md:inline">
            {title}
          </span>
          <span className="text-[11px] font-mono text-stone-400 truncate max-w-[160px] sm:max-w-[260px]">
            {cleanUrl}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isFailed && (
            <>
              <button
                type="button"
                onClick={handleRetry}
                className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                title="重新載入互動預覽"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="hidden sm:inline">重新載入</span>
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                title={isExpanded ? '縮小預覽視窗' : '放大預覽視窗'}
              >
                {isExpanded ? (
                  <>
                    <Minimize2 className="w-3 h-3" />
                    <span>退出放大</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3 h-3" />
                    <span className="hidden sm:inline">放大操作</span>
                  </>
                )}
              </button>
            </>
          )}

          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-[11px] sm:text-xs font-black inline-flex items-center gap-1 transition-colors"
          >
            <span>到網站支持</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Main Content / Iframe or Fallback */}
      {isFailed ? (
        <div className="p-6 sm:p-10 bg-gradient-to-b from-stone-50 to-white flex flex-col items-center justify-center text-center space-y-4 min-h-[260px]">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-lg">
            <h4 className="text-sm sm:text-base font-black text-stone-900">
              無法在內嵌視窗載入預覽，已切換為外部連結模式
            </h4>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              {blockReason || '該網站禁止 iframe 嵌入或預覽載入超時，請點擊下方按鈕直接於新分頁開啟體驗完整互動功能。'}
            </p>
            <p className="text-[11px] font-mono text-stone-400 break-all pt-0.5">
              {cleanUrl}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <a
              href={cleanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm inline-flex items-center gap-2 shadow-sm transition-colors"
            >
              <Globe className="w-4 h-4" />
              <span>到網站支持</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={handleRetry}
              className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>重新嘗試載入</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          className={
            isExpanded
              ? 'relative flex-1 w-full bg-stone-100'
              : 'relative w-full h-[72dvh] min-h-[460px] max-h-[680px] sm:h-[580px] lg:h-[680px] lg:max-h-none bg-stone-100'
          }
        >
          {status === 'loading' && (
            <div className="absolute inset-0 z-10 bg-stone-900/5 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2.5 p-4 text-center">
              <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
              <div className="text-xs font-bold text-stone-700">
                正在載入試玩體驗網頁...
              </div>
              {platform && (
                <div className="text-[11px] text-stone-500 max-w-xs leading-relaxed">
                  {EMBED_PLATFORM_LABEL[platform]} 應用閒置後會休眠，首次喚醒約需 30 秒；若畫面出現喚醒按鈕，點一下即可。
                </div>
              )}
              <a
                href={cleanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white border border-stone-200 text-indigo-700 font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs"
              >
                <span>若等待過久可直接「到網站支持」</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          <iframe
            key={reloadKey}
            src={embedUrl}
            title={`${title} - 試玩體驗`}
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
                setBlockReason('網頁載入時發生錯誤，請改為「到網站支持」。');
              }
            }}
          />
        </div>
      )}

      {/* Bottom Compatibility Hint */}
      {!isFailed && (
        <div className="px-3.5 sm:px-4 py-2 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500 shrink-0">
          <span>
            💡 可直接於上方內嵌畫面互動操作；若部分網站因瀏覽器安全限制無法登入或顯示空白，請點右側按鈕開啟。
          </span>
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 shrink-0"
          >
            <span>到網站支持</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );

  return (
    <>
      {isExpanded && (
        <div
          className="fixed inset-0 z-[115] bg-black/70 backdrop-blur-xs"
          onClick={() => setIsExpanded(false)}
        />
      )}
      {previewBody}
    </>
  );
};
