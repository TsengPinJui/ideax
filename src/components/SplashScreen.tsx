import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, CheckCircle2, ChevronRight, Lightbulb, Compass, Zap, ArrowRight, ShieldCheck, Trophy, MessageSquare } from 'lucide-react';
import { IdeaXLogo } from './IdeaXLogo';
import { useApp } from '../context/AppContext';
import { APP_VERSION } from '../data/versionData';

interface SplashScreenProps {
  onDismiss?: () => void;
  minDurationMs?: number;
}

interface PlatformTip {
  tag: string;
  tagColor: string;
  icon: string;
  title: string;
  desc: string;
  highlight: string;
}

const PLATFORM_TIPS: PlatformTip[] = [
  {
    tag: '痛點活用',
    tagColor: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: '⚡',
    title: '生活中遇到的繁瑣困擾，都能發布在「痛點許願池」',
    desc: '不論是租屋倒垃圾、二手書流轉或停車難題，痛點就是新商機的起點，吸引全站創作者為你打造專屬解方！',
    highlight: '「提痛點、聚附議、引專家」一站搞定',
  },
  {
    tag: '創星季挑戰賽',
    tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: '🚀',
    title: '青年創新提案挑戰賽現正熱烈徵件中',
    desc: '將腦中靈感具現化！支援圖文提案、規格說明與互動原型展示，角逐賽事大獎、榮譽徽章與落地資源。',
    highlight: '角逐百萬資源與官方認證榮譽',
  },
  {
    tag: '3D 創點源漫遊',
    tagColor: 'bg-amber-100 text-amber-900 border-amber-300',
    icon: '🏮',
    title: '想散心找靈感？點擊右上角「創點源」進入 3D 江南水鄉',
    desc: '支援 3D 地圖與實境漫遊雙模式切換，可探索中央廣場、聚雲塔、電玩城，還能在茶藝街清茗茶莊入座品茶！',
    highlight: '茶藝街主館全新增設茶桌，隨時入座交流',
  },
  {
    tag: '自由交流',
    tagColor: 'bg-sky-100 text-sky-800 border-sky-200',
    icon: '💬',
    title: 'L0 自由討論區：零懸賞門檻、隨時發起交流',
    desc: '適合日常觀點激盪、技術探討與跨界請益，所有會員皆可無負擔留言討論、按讚支持與共同研討。',
    highlight: '免花費點數，自由發表您的第一篇交流帖',
  },
  {
    tag: '安全保障',
    tagColor: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: '🛡️',
    title: '懸賞提案三階段驗收：雙向權益安心保障',
    desc: '提問方懸賞點數由官方安全保管，解答方依進度驗收交付撥款，保障每一分努力與每一分點數。',
    highlight: '安全第三方驗收機制，保障解答方與提問方',
  },
  {
    tag: 'AI 智慧助理',
    tagColor: 'bg-yellow-100 text-yellow-900 border-yellow-300',
    icon: '🤖',
    title: '市場顧問白喵與 AICRM 巡航特助隨時待命',
    desc: 'AI 即時為問題拆解三大痛點維度、產出初步分析報告，並根據專長與履約評價精準媒合智庫專家！',
    highlight: '智慧自動貼標與雙向握手精準媒合',
  },
  {
    tag: 'PWA 行動體驗',
    tagColor: 'bg-stone-100 text-stone-800 border-stone-200',
    icon: '📱',
    title: '支援一鍵安裝至手機或桌面，享有原生 App 體驗',
    desc: '點擊選單「下載／安裝 App」，即刻享受全螢幕視野、離線快取、快速喚醒與即時手機原生推播通知。',
    highlight: '離線快取、快速啟動與鎖定畫面推播',
  },
  {
    tag: '知識變現',
    tagColor: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '💎',
    title: '實名認證成為智庫專家，將專業經驗轉為實質收入',
    desc: '入駐水電、室內裝修、法律智財、財稅會計或企管百工坊，承接企業難題與個人諮詢，享有每週結算保障。',
    highlight: '累積履約好評，成為專屬領域首席顧問',
  },
];

const DYNAMIC_STATUS_MESSAGES = [
  '正在初始化應用程式核心模組...',
  '正在連線雲端資料庫並同步痛點清單...',
  '正在喚醒 AI 智庫顧問與市場分析引擎...',
  '正在整理最新精選創新提案與實用方案...',
  '正在佈置創點源五島與江南水鄉建築...',
  '資料載入完成，即刻開啟探索！',
];

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onDismiss,
  minDurationMs = 1200,
}) => {
  const {
    onlineUsersCount,
    initialBootProgress,
    initialBootStatusText,
    isInitialBootComplete,
  } = useApp();

  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isRendered, setIsRendered] = useState(true);
  // 隨機初始技巧與狀態訊息，確保每次進站都有全新發現，不再千篇一律
  const [currentTipIndex, setCurrentTipIndex] = useState<number>(() =>
    Math.floor(Math.random() * PLATFORM_TIPS.length)
  );
  const [isTipFading, setIsTipFading] = useState(false);
  const [bulbSparkleActive, setBulbSparkleActive] = useState(false);
  const [showSkipButton, setShowSkipButton] = useState(false);
  const [statusMessageIndex, setStatusMessageIndex] = useState<number>(() =>
    Math.floor(Math.random() * (DYNAMIC_STATUS_MESSAGES.length - 1))
  );

  // 平滑持續微動進度條：避免網路稍慢時進度條完全停滯，給使用者生動流暢的視覺反饋
  const [displayProgress, setDisplayProgress] = useState<number>(() => {
    if (typeof window !== 'undefined' && typeof (window as any).__ideaxBootProgress === 'number') {
      return Math.max(12, Math.min(85, (window as any).__ideaxBootProgress));
    }
    return 16;
  });

  const enterTimeRef = useRef<number>(Date.now());

  // 乾淨且安全的關閉流程
  const handleDismiss = useCallback(() => {
    if (isFadingOut || !isRendered) return;
    setIsFadingOut(true);
    setTimeout(() => {
      setIsRendered(false);
      // 清除 pre-boot HTML 殘留元素
      if (typeof document !== 'undefined') {
        const preBoot = document.getElementById('ideax-boot-splash');
        if (preBoot) preBoot.style.display = 'none';
      }
      if (onDismiss) onDismiss();
    }, 280);
  }, [isFadingOut, isRendered, onDismiss]);

  // 3 秒後顯示快速跳過按鈕（若使用者不想等待，可立即進入）
  useEffect(() => {
    const skipTimer = setTimeout(() => {
      setShowSkipButton(true);
    }, 2600);
    return () => clearTimeout(skipTimer);
  }, []);

  // 技巧卡片自動輪播 (每 3.8 秒換一則)
  useEffect(() => {
    const tipTimer = setInterval(() => {
      setIsTipFading(true);
      setTimeout(() => {
        setCurrentTipIndex((prev) => (prev + 1) % PLATFORM_TIPS.length);
        setIsTipFading(false);
      }, 180);
    }, 3800);
    return () => clearInterval(tipTimer);
  }, []);

  // 狀態訊息輪播
  useEffect(() => {
    const statusTimer = setInterval(() => {
      setStatusMessageIndex((prev) => (prev + 1) % (DYNAMIC_STATUS_MESSAGES.length - 1));
    }, 1900);
    return () => clearInterval(statusTimer);
  }, []);

  // 持續平滑進度更新機制：即使網路請求正在等待，進度條也會微幅自然推進（最高到 93%），絕不給用戶「當掉」感
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayProgress((prev) => {
        if (isInitialBootComplete) {
          return 100;
        }
        const realTarget = Math.max(18, initialBootProgress);
        // 如果真實進度比顯示進度高，快速追上
        if (realTarget > prev) {
          const step = Math.max(1.5, (realTarget - prev) * 0.35);
          return Math.min(94, prev + step);
        }
        // 如果真實進度正在等待，則平滑緩慢微增（越接近 92% 越慢）
        if (prev < 92) {
          const microStep = Math.max(0.08, (92 - prev) * 0.018);
          return Math.min(92, prev + microStep);
        }
        return prev;
      });
    }, 90);

    return () => clearInterval(interval);
  }, [initialBootProgress, isInitialBootComplete]);

  // 當真實載入完成 (isInitialBootComplete === true)
  useEffect(() => {
    if (!isInitialBootComplete) return;

    setDisplayProgress(100);
    const elapsed = Date.now() - enterTimeRef.current;
    const remainingMinTime = Math.max(0, minDurationMs - elapsed);

    const finishTimer = setTimeout(() => {
      handleDismiss();
    }, remainingMinTime + 180);

    return () => clearTimeout(finishTimer);
  }, [isInitialBootComplete, minDurationMs, handleDismiss]);

  // 手動切換下一則技巧
  const handleNextTip = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsTipFading(true);
    setTimeout(() => {
      setCurrentTipIndex((prev) => (prev + 1) % PLATFORM_TIPS.length);
      setIsTipFading(false);
    }, 140);
  };

  // 點擊小燈泡觸發靈感小彩蛋
  const handleBulbClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBulbSparkleActive(true);
    setTimeout(() => setBulbSparkleActive(false), 900);
  };

  if (!isRendered) return null;

  const currentTip = PLATFORM_TIPS[currentTipIndex];
  const activeStatusText = isInitialBootComplete
    ? '資料載入完成，即刻開啟探索！'
    : (initialBootStatusText || DYNAMIC_STATUS_MESSAGES[statusMessageIndex]);

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col justify-between items-center select-none bg-[#FAFAF8] transition-all duration-300 ease-out p-4 sm:p-7 overflow-y-auto ${
        !isFadingOut
          ? 'opacity-100 scale-100'
          : 'opacity-0 scale-[1.01] pointer-events-none'
      }`}
      aria-label="IdeaX 載入中"
    >
      {/* 頂部與周邊放射柔和金黃光暈 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[720px] max-w-full h-[380px] bg-gradient-to-b from-amber-300/30 via-yellow-100/20 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-amber-100/40 rounded-full blur-2xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-6 w-48 h-48 bg-orange-100/30 rounded-full blur-2xl pointer-events-none -z-10" />

      {/* 1. 頂部品牌 Header */}
      <div className="flex flex-col items-center text-center w-full max-w-md pt-2 sm:pt-4">
        {/* 創點子 Logo 品牌聚光區（支援點擊小互動） */}
        <div
          onClick={handleBulbClick}
          className="relative mb-2 group cursor-pointer active:scale-95 transition-transform"
          title="點擊小燈泡，點亮你的創意靈感！"
        >
          <div className="absolute -inset-1 rounded-2xl bg-amber-300/40 blur-lg pointer-events-none animate-pulse" />
          <div className="relative py-2.5 px-6 rounded-2xl bg-white/95 border border-amber-200/90 shadow-xs flex items-center justify-center gap-3">
            <IdeaXLogo variant="chuangdianzi" size="lg" />
            {bulbSparkleActive && (
              <span className="text-[11px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 animate-bounce">
                ✨ +1 靈感！
              </span>
            )}
          </div>
        </div>

        {/* 品牌主標語 */}
        <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight leading-snug mt-2">
          一個問題，找到<span className="text-amber-500 underline decoration-amber-300 decoration-wavy decoration-2">更多可能</span>。
        </h1>
        <p className="text-[11px] sm:text-xs text-stone-500 mt-1 font-medium">
          生活痛點與解方 • 創新提案交流 • 專業知識變現
        </p>
      </div>

      {/* 2. 中間互動式輪播卡片（教學、叮嚀、資訊） */}
      <div className="w-full max-w-md my-4 sm:my-6 flex flex-col items-center">
        {/* 小卡片頂部操作提示列 */}
        <div className="w-full flex items-center justify-between px-1 mb-2">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-stone-600">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>開站靈感漫遊</span>
            <span className="text-stone-400 font-mono text-[10px]">
              ({currentTipIndex + 1}/{PLATFORM_TIPS.length})
            </span>
          </div>

          <button
            type="button"
            onClick={handleNextTip}
            className="text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200/90 px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95"
            title="點擊換下一個小知識"
          >
            <span>點我換下一則</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* 互動式知識/叮嚀主卡片 */}
        <div
          onClick={handleNextTip}
          className={`w-full p-4 sm:p-5 rounded-2xl bg-white/95 border border-amber-200/90 shadow-sm hover:border-amber-300 hover:shadow-md transition-all duration-200 cursor-pointer group active:scale-[0.99] relative overflow-hidden ${
            isTipFading ? 'opacity-40 scale-[0.98]' : 'opacity-100 scale-100'
          }`}
          title="點擊卡片切換下一則平台提示"
        >
          {/* 背景微光 */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full blur-xl pointer-events-none -mr-10 -mt-10" />

          <div className="relative z-10 space-y-2.5">
            {/* 標籤列 */}
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border shadow-2xs flex items-center gap-1 ${currentTip.tagColor}`}
              >
                <span>{currentTip.icon}</span>
                <span>{currentTip.tag}</span>
              </span>

              <span className="text-[10px] text-stone-400 font-semibold group-hover:text-amber-700 transition-colors flex items-center gap-0.5">
                <span>點擊換題</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>

            {/* 標題 */}
            <h3 className="text-xs sm:text-sm font-black text-stone-900 group-hover:text-amber-900 transition-colors leading-snug">
              {currentTip.title}
            </h3>

            {/* 說明文字 */}
            <p className="text-[11px] sm:text-xs text-stone-600 leading-relaxed font-normal">
              {currentTip.desc}
            </p>

            {/* 特色亮點膠囊 */}
            <div className="pt-2 border-t border-amber-100 flex items-center gap-1.5 text-[11px] font-bold text-amber-800">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">{currentTip.highlight}</span>
            </div>
          </div>
        </div>

        {/* 底部小圓點導航 */}
        <div className="flex items-center gap-1.5 mt-2.5">
          {PLATFORM_TIPS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentTipIndex(idx)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === currentTipIndex ? 'w-5 bg-amber-500' : 'w-1.5 bg-stone-200 hover:bg-stone-300'
              }`}
              title={`切換至第 ${idx + 1} 則`}
            />
          ))}
        </div>
      </div>

      {/* 3. 底部進度條、狀態提示與安全跳過閥 */}
      <div className="flex flex-col items-center w-full max-w-xs sm:max-w-md pb-1 sm:pb-2">
        {/* 進度數值與標籤 */}
        <div className="w-full flex items-center justify-between text-[11px] font-extrabold text-amber-900 mb-1.5 px-0.5">
          <span className="flex items-center gap-1">
            <Compass className="w-3 h-3 text-amber-600 animate-spin" />
            <span>環境載入與初始化</span>
          </span>
          <span className="font-mono text-amber-600 text-xs font-black">
            {Math.round(displayProgress)}%
          </span>
        </div>

        {/* 進度條（具備流光漸層動畫，隨時都在流暢推進） */}
        <div className="w-full h-2.5 bg-amber-100/80 rounded-full overflow-hidden shadow-inner relative border border-amber-200">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 rounded-full transition-all duration-150 ease-out relative"
            style={{ width: `${Math.max(8, displayProgress)}%` }}
          >
            {/* 光芒流動效果 */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />
          </div>
        </div>

        {/* 實時動態狀態文字（不轉圈，純淨文字引導） */}
        <div className="mt-2.5 flex items-center justify-center gap-1.5 text-xs font-bold text-stone-700 min-h-[20px] text-center px-2">
          {displayProgress >= 100 && isInitialBootComplete ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-pulse" />
          )}
          <span className="tracking-wide line-clamp-1">{activeStatusText}</span>
        </div>

        {/* 友善跳過按鈕：避免網路延遲讓用戶乾等 */}
        <div className="mt-3 flex items-center gap-3">
          {showSkipButton && (
            <button
              type="button"
              onClick={handleDismiss}
              className="text-[11px] font-bold text-amber-900 hover:text-amber-950 bg-white hover:bg-amber-100 border border-amber-300 px-3 py-1 rounded-full shadow-2xs transition-all cursor-pointer flex items-center gap-1 active:scale-95 animate-in fade-in duration-300"
              title="若不想等待，可立即進入探索"
            >
              <Zap className="w-3 h-3 text-amber-600" />
              <span>點此直接進入首頁</span>
            </button>
          )}

          <span className="text-[11px] font-medium text-stone-400">
            v{APP_VERSION} • {Math.max(1, onlineUsersCount || 1).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};
