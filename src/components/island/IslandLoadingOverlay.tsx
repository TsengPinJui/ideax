import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Compass,
  Sparkles,
  Lightbulb,
  Gamepad2,
  Coffee,
  Feather,
  Footprints,
  Sun,
  Users,
  ChevronRight,
  Waves,
  BookOpen,
  Briefcase,
  Bell,
  Wind,
} from 'lucide-react';

export interface IslandTipItem {
  tag: string;
  tagColor: string;
  iconName: string;
  title: string;
  desc: string;
}

export const ISLAND_EXPLORATION_TIPS: IslandTipItem[] = [
  {
    tag: '茶藝街',
    tagColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
    iconName: 'coffee',
    title: '步入清茗茶莊，靠近茶桌即可入座品茶',
    desc: '實境漫遊走入茶藝街茶莊，點擊茶桌可坐下品茶、聆聽古箏雅樂，與在線同好圍桌交流。',
  },
  {
    tag: '快捷操作',
    tagColor: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
    iconName: 'gamepad',
    title: '鍵盤 W/A/S/D 移動，空白鍵跳躍、C 鍵打坐',
    desc: '電腦版支援 V 鍵切換第一／第三人稱、Shift 疾跑；手機端左下角虛擬搖桿可平滑移動。',
  },
  {
    tag: '雙模式',
    tagColor: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40',
    iconName: 'compass',
    title: '高空俯瞰 ⇄ 實境漫遊，右上角隨時切換',
    desc: '3D 地圖適合鳥瞰五島與快速傳送，實境漫遊則可親臨石板巷弄與亭台樓閣，各具樂趣。',
  },
  {
    tag: '坐騎',
    tagColor: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
    iconName: 'feather',
    title: '城門與碼頭可尋找白馬與仙鶴乘騎巡島',
    desc: '靠近白馬或仙鶴可觸發騎乘互動，體驗奔馳於青石板道與翱翔水鄉天際的御風暢快。',
  },
  {
    tag: '彩蛋典籍',
    tagColor: 'bg-purple-950/80 text-purple-300 border-purple-500/40',
    iconName: 'sparkles',
    title: '靠近古碑、晚鐘或花叢，解鎖隱藏詩詞手卷',
    desc: '五島各處散落古風彩蛋，靠近即可展開宣紙水墨詩卷，並永久收錄至右上角彩蛋典籍。',
  },
  {
    tag: '中央廣場',
    tagColor: 'bg-yellow-950/80 text-yellow-300 border-yellow-500/40',
    iconName: 'lightbulb',
    title: '中央廣場大燈泡：全站有新點子時即刻亮起',
    desc: '當全站有會員提出新痛點或創新提案時，中央廣場大燈泡會瞬間亮起金黃光芒與風鈴音。',
  },
  {
    tag: '時辰氣候',
    tagColor: 'bg-blue-950/80 text-blue-300 border-blue-500/40',
    iconName: 'sun',
    title: '時辰盤可預覽八大光影，亦連動城市真實氣候',
    desc: '右上角可切換晨曦、夕陽、雨景或雪景光影，亦可連動台北、台中、高雄等即時天氣。',
  },
  {
    tag: '聚雲塔',
    tagColor: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40',
    iconName: 'footprints',
    title: '沿梯級登上聚雲塔頂，飽覽江南五島全貌',
    desc: '聚雲塔是創點源的至高地標，沿塔外階梯登頂可俯瞰整座水鄉萬家燈火與江心泛舟。',
  },
  {
    tag: '小地圖',
    tagColor: 'bg-pink-950/80 text-pink-300 border-pink-500/40',
    iconName: 'users',
    title: '右上角小地圖粉色光點，即時查看在線同好',
    desc: '探索時可從地圖掌握其他訪客足跡，靠近對方身旁即可查看創作者稱號與名片。',
  },
  {
    tag: '渡口碼頭',
    tagColor: 'bg-teal-950/80 text-teal-300 border-teal-500/40',
    iconName: 'waves',
    title: '碼頭可乘烏篷小船，隨水波悠閒巡航五島',
    desc: '靠近碼頭木棧道可搭上青瓦烏篷小船，隨水波穿梭於石拱橋之間，享受慢活江南。',
  },
  {
    tag: '百工坊',
    tagColor: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
    iconName: 'briefcase',
    title: '百工長街匯集水電、裝修、智財、會計、企管',
    desc: '實境漫遊走入百工長街，每座店鋪均有對應領域專家入駐，點擊招牌即可查閱專業解答。',
  },
  {
    tag: '藏書閣',
    tagColor: 'bg-violet-950/80 text-violet-300 border-violet-500/40',
    iconName: 'book-open',
    title: '穿過拱門步入藏書閣，閱覽智慧經典古卷',
    desc: '拾級而下進入地下藏書古庫，書架環繞如千卷書海，是深思企劃與尋求靈感的絕佳處。',
  },
  {
    tag: '寒山古寺',
    tagColor: 'bg-stone-900 text-amber-200 border-amber-400/40',
    iconName: 'bell',
    title: '靠近古寺與泊岸客船，聆聽悠揚寒山晚鐘',
    desc: '「姑蘇城外寒山寺，夜半鐘聲到客船。」五島特定景點靠近即能聆聽清澈鐘磬音律。',
  },
  {
    tag: '江南水鄉',
    tagColor: 'bg-emerald-950/80 text-emerald-200 border-emerald-400/40',
    iconName: 'wind',
    title: '慢步石板路，細賞落櫻微風與清澈水波倒影',
    desc: '放慢腳步細看石階青苔、江面倒影與飛鳥盤旋，處處皆融入東方江南水鄉的匠心意境。',
  },
  {
    tag: '電玩城',
    tagColor: 'bg-purple-950/80 text-purple-200 border-purple-400/40',
    iconName: 'gamepad',
    title: '探訪電玩城主展館，體驗精選獨立小遊戲',
    desc: '走過拱橋進入電玩城館區，陳列全站精選之休閒小遊戲與互動體驗，隨時上手試玩。',
  },
  {
    tag: '創點樓',
    tagColor: 'bg-red-950/80 text-red-200 border-red-400/40',
    iconName: 'compass',
    title: '漫步客家圓形土樓，檢閱全站最新痛點貼文',
    desc: '創點樓以壯麗的圓形土樓為外觀，層層環繞著各行各業生活痛點與眾創點子方案。',
  },
];

interface IslandLoadingOverlayProps {
  mode: 'map3d' | 'roam';
  isLoading: boolean;
  externalProgress?: number;
  loadingHint?: string;
  onSwitchMode?: () => void;
  onQuickEnter?: () => void;
  title?: string;
}

export const IslandLoadingOverlay: React.FC<IslandLoadingOverlayProps> = ({
  mode,
  isLoading,
  externalProgress,
  onSwitchMode,
  onQuickEnter,
  title,
}) => {
  // 隨機起點錦囊索引，確保每次進入不同
  const [currentTipIndex, setCurrentTipIndex] = useState<number>(() =>
    Math.floor(Math.random() * ISLAND_EXPLORATION_TIPS.length)
  );

  const [bulbSparkle, setBulbSparkle] = useState(false);
  const [showQuickEnter, setShowQuickEnter] = useState(false);

  // 隨機起點微步進度條（16% ~ 24%）
  const [displayProgress, setDisplayProgress] = useState<number>(() => 16 + Math.floor(Math.random() * 8));

  useEffect(() => {
    if (!isLoading) {
      setDisplayProgress(100);
      return;
    }

    // Micro-step interval keeps the progress bar moving smoothly so users never feel stuck
    const ticker = setInterval(() => {
      setDisplayProgress((prev) => {
        if (externalProgress !== undefined && externalProgress > prev) {
          return externalProgress;
        }
        if (prev < 45) return prev + 1.6;
        if (prev < 75) return prev + 0.9;
        if (prev < 92) return prev + 0.45;
        if (prev < 98) return prev + 0.15;
        return prev;
      });
    }, 120);

    return () => clearInterval(ticker);
  }, [isLoading, externalProgress]);

  // Sync when externalProgress increases
  useEffect(() => {
    if (externalProgress !== undefined && externalProgress > displayProgress) {
      setDisplayProgress(externalProgress);
    }
  }, [externalProgress, displayProgress]);

  // 切換下一則錦囊（即時生效、防止連點抖動、重設自動輪播計時器，確保完全不卡）
  const lastClickRef = useRef<number>(0);
  const autoRotateTimerRef = useRef<NodeJS.Timeout | null>(null);

  const nextTip = useCallback((e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const now = Date.now();
    if (now - lastClickRef.current < 90) {
      return;
    }
    lastClickRef.current = now;

    setCurrentTipIndex((prev) => {
      const candidates = ISLAND_EXPLORATION_TIPS.map((_, i) => i).filter((i) => i !== prev);
      return candidates[Math.floor(Math.random() * candidates.length)] ?? ((prev + 1) % ISLAND_EXPLORATION_TIPS.length);
    });

    // 重設計時器，避免手動點擊後立刻觸發自動輪播造成卡頓感
    if (autoRotateTimerRef.current) {
      clearInterval(autoRotateTimerRef.current);
    }
    autoRotateTimerRef.current = setInterval(() => {
      setCurrentTipIndex((prev) => {
        const candidates = ISLAND_EXPLORATION_TIPS.map((_, i) => i).filter((i) => i !== prev);
        return candidates[Math.floor(Math.random() * candidates.length)] ?? ((prev + 1) % ISLAND_EXPLORATION_TIPS.length);
      });
    }, 5000);
  }, []);

  // 自動定時輪播錦囊 (每 5 秒)
  useEffect(() => {
    if (!isLoading) return;
    autoRotateTimerRef.current = setInterval(() => {
      nextTip();
    }, 5000);
    return () => {
      if (autoRotateTimerRef.current) {
        clearInterval(autoRotateTimerRef.current);
      }
    };
  }, [isLoading, nextTip]);

  // Show quick enter after 2.2s
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => {
      setShowQuickEnter(true);
    }, 2200);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const triggerBulbSparkle = useCallback((e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    setBulbSparkle(true);
    setTimeout(() => setBulbSparkle(false), 800);
    nextTip();
  }, [nextTip]);

  if (!isLoading) return null;

  const currentTip = ISLAND_EXPLORATION_TIPS[currentTipIndex] ?? ISLAND_EXPLORATION_TIPS[0];
  const roundedProgress = Math.min(100, Math.round(displayProgress));

  const renderIcon = (name: string) => {
    switch (name) {
      case 'coffee':
        return <Coffee className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'gamepad':
        return <Gamepad2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'compass':
        return <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
      case 'feather':
        return <Feather className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
      case 'sparkles':
        return <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
      case 'lightbulb':
        return <Lightbulb className="w-3.5 h-3.5 text-yellow-400 shrink-0" />;
      case 'sun':
        return <Sun className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
      case 'footprints':
        return <Footprints className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
      case 'users':
        return <Users className="w-3.5 h-3.5 text-pink-400 shrink-0" />;
      case 'waves':
        return <Waves className="w-3.5 h-3.5 text-teal-400 shrink-0" />;
      case 'book-open':
        return <BookOpen className="w-3.5 h-3.5 text-violet-400 shrink-0" />;
      case 'briefcase':
        return <Briefcase className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'bell':
        return <Bell className="w-3.5 h-3.5 text-amber-300 shrink-0" />;
      case 'wind':
        return <Wind className="w-3.5 h-3.5 text-emerald-300 shrink-0" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    }
  };

  return (
    <div
      className="island-ui-interactive absolute inset-0 z-50 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto select-none"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(38,24,14,0.96) 0%, rgba(12,8,6,0.98) 75%)',
      }}
      aria-live="polite"
      aria-busy={isLoading}
    >
      <div
        className="flex flex-col items-center w-full max-w-sm sm:max-w-md rounded-3xl border border-amber-300/40 bg-stone-900/90 p-5 sm:p-6 text-center shadow-2xl backdrop-blur-xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 高雅東方星盤／水鄉靈感光環轉圈 (漸層流光圓弧、水波微光、琉璃燈芯) */}
        <div className="relative mb-2.5 flex items-center justify-center">
          <div className="relative flex h-20 w-20 items-center justify-center">
            {/* 柔和金色脈衝光暈 */}
            <div
              className="absolute inset-2 rounded-full bg-amber-400/15 blur-xl animate-pulse"
              style={{ animationDuration: '3s' }}
            />

            {/* SVG 雙軌流光弧度與八卦星盤刻度 */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* 雅緻暖金至碧青的環形漸層流光 */}
                <linearGradient id="celestialRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
                  <stop offset="35%" stopColor="#f59e0b" stopOpacity="0.85" />
                  <stop offset="70%" stopColor="#14b8a6" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.05" />
                </linearGradient>

                <linearGradient id="jadeRingGrad" x1="100%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.95" />
                  <stop offset="45%" stopColor="#0d9488" stopOpacity="0.6" />
                  <stop offset="85%" stopColor="#f59e0b" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.0" />
                </linearGradient>

                <filter id="goldBloom" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.8" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* 沉穩細膩的底軌星盤底環 */}
              <circle cx="50" cy="50" r="38" stroke="#fbbf24" strokeOpacity="0.16" strokeWidth="1.2" />
              <circle cx="50" cy="50" r="30" stroke="#14b8a6" strokeOpacity="0.14" strokeWidth="1" strokeDasharray="3 5" />

              {/* 外層四方雅緻星芒點 (隨緩速星盤旋轉) */}
              <g className="animate-[spin_32s_linear_infinite]" style={{ transformOrigin: '50% 50%' }}>
                <circle cx="50" cy="12" r="1.5" fill="#fef08a" opacity="0.6" />
                <circle cx="88" cy="50" r="1.5" fill="#fef08a" opacity="0.6" />
                <circle cx="50" cy="88" r="1.5" fill="#fef08a" opacity="0.6" />
                <circle cx="12" cy="50" r="1.5" fill="#fef08a" opacity="0.6" />
              </g>

              {/* 主流光玉環：平滑旋轉的暖金漸層光弧 */}
              <g className="animate-[spin_2.4s_linear_infinite]" style={{ transformOrigin: '50% 50%' }}>
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="url(#celestialRingGrad)"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeDasharray="145 95"
                  filter="url(#goldBloom)"
                />
                <circle cx="88" cy="50" r="2.2" fill="#fffdf0" />
              </g>

              {/* 次流光玉環：反向呼吸流轉的碧水玉青光弧 */}
              <g className="animate-[spin_3.2s_linear_infinite_reverse]" style={{ transformOrigin: '50% 50%' }}>
                <circle
                  cx="50"
                  cy="50"
                  r="30"
                  stroke="url(#jadeRingGrad)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeDasharray="110 80"
                />
                <circle cx="50" cy="20" r="1.8" fill="#a5f3fc" />
              </g>

              {/* 核心柔和呼吸脈衝光暈圈 */}
              <circle
                cx="50"
                cy="50"
                r="22"
                stroke="#fbbf24"
                strokeOpacity="0.22"
                strokeWidth="1.2"
                className="animate-pulse"
                style={{ transformOrigin: '50% 50%', animationDuration: '2.5s' }}
              />
            </svg>

            {/* 核心：琉璃暖金靈感燈芯 */}
            <button
              type="button"
              onClick={triggerBulbSparkle}
              title="點擊點亮創點靈感，並切換下一則錦囊"
              className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 text-stone-950 shadow-[0_0_18px_rgba(251,191,36,0.65),inset_0_1px_2px_rgba(255,255,255,0.7)] border border-amber-200/80 cursor-pointer transition-all hover:scale-110 active:scale-95 ${
                bulbSparkle ? 'scale-125 ring-4 ring-amber-300/80 shadow-[0_0_30px_#fbbf24]' : ''
              }`}
            >
              <Lightbulb className="w-4 h-4 fill-amber-50 text-amber-950 stroke-[1.8]" />
              {bulbSparkle && (
                <Sparkles className="absolute -top-1 -right-1 w-3.5 h-3.5 text-yellow-200 animate-bounce" />
              )}
            </button>
          </div>
        </div>

        {/* 主標題（維持焦點聚焦） */}
        <h3 className="text-lg sm:text-xl font-black tracking-wider text-amber-50">
          {title || (mode === 'map3d' ? '正在載入創點源 3D 地圖...' : '正在進入創點源實境漫遊...')}
        </h3>

        {/* 平滑微動進度條 (百分比與光暈) */}
        <div className="w-full max-w-xs mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-amber-200/75 px-1 font-mono">
            <span>載入進度</span>
            <span className="font-bold tabular-nums text-amber-300">{roundedProgress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-stone-800/90 border border-amber-400/20 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#b3261e] via-amber-400 to-teal-300 transition-all duration-150 ease-out shadow-[0_0_8px_rgba(251,191,36,0.4)]"
              style={{ width: `${Math.max(10, displayProgress)}%` }}
            />
          </div>
        </div>

        {/* 簡潔聚焦的探索錦囊卡片（固定高度、無排版抖動、即時響應） */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            nextTip();
          }}
          style={{ touchAction: 'manipulation' }}
          className="group relative mt-3.5 w-full cursor-pointer rounded-2xl border border-amber-300/35 bg-stone-950/75 p-3 sm:p-3.5 text-left shadow-lg transition-transform hover:border-amber-300/70 hover:bg-stone-950/90 active:scale-[0.99] select-none"
          role="button"
          tabIndex={0}
          title="點擊切換下一則錦囊"
        >
          {/* 卡片頂部標籤與獨立按鈕 */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${currentTip.tagColor}`}
            >
              {renderIcon(currentTip.iconName)}
              <span>{currentTip.tag}</span>
            </span>

            {/* 具備高觸控反應的下一則切換按鈕 */}
            <button
              type="button"
              style={{ touchAction: 'manipulation' }}
              onClick={(e) => {
                e.stopPropagation();
                nextTip();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-amber-200 bg-amber-500/20 hover:bg-amber-500/35 active:bg-amber-500/50 border border-amber-400/40 shadow-xs cursor-pointer transition-transform active:scale-95"
              title="切換下一則探索錦囊"
            >
              <span>下一則</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 卡片主體內容：穩定最小高度，切換文字不跳動、不卡頓 */}
          <div className="min-h-[58px] sm:min-h-[52px] flex flex-col justify-start">
            <div className="text-[13px] sm:text-sm font-bold text-amber-100 leading-snug">
              {currentTip.title}
            </div>
            <div className="text-xs text-stone-300/90 mt-1 leading-relaxed">
              {currentTip.desc}
            </div>
          </div>
        </div>

        {/* 簡約俐落的雙模式切換按鈕列 */}
        <div className="pt-3.5 flex items-center justify-center w-full">
          <div
            className="inline-flex items-center p-1 rounded-full bg-stone-950/80 border border-amber-300/40 shadow-inner gap-1"
            role="group"
            aria-label="選擇探索模式"
          >
            {mode === 'map3d' ? (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onQuickEnter) onQuickEnter();
                  }}
                  className="px-4 py-1.5 rounded-full text-xs sm:text-sm font-black text-amber-50 bg-gradient-to-b from-[#b3261e] to-[#7d1a16] border border-amber-300/70 shadow-sm cursor-pointer transition-transform active:scale-95"
                >
                  3D 地圖
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSwitchMode) onSwitchMode();
                  }}
                  className="px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold text-amber-100/90 hover:text-amber-50 hover:bg-amber-500/25 border border-transparent hover:border-amber-300/40 cursor-pointer transition-all active:scale-95"
                >
                  實境漫遊 →
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onQuickEnter) onQuickEnter();
                  }}
                  className="px-4 py-1.5 rounded-full text-xs sm:text-sm font-black text-amber-50 bg-gradient-to-b from-[#b3261e] to-[#7d1a16] border border-amber-300/70 shadow-sm cursor-pointer transition-transform active:scale-95"
                >
                  實境漫遊
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSwitchMode) onSwitchMode();
                  }}
                  className="px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold text-amber-100/90 hover:text-amber-50 hover:bg-amber-500/25 border border-transparent hover:border-amber-300/40 cursor-pointer transition-all active:scale-95"
                >
                  3D 地圖 →
                </button>
              </>
            )}
          </div>
        </div>

        {/* 快速跳過/加速進入 (等待超時提供安全入口) */}
        {showQuickEnter && onQuickEnter && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickEnter();
            }}
            className="mt-2.5 text-[11px] text-amber-300/80 hover:text-amber-200 underline decoration-amber-400/40 underline-offset-4 cursor-pointer transition-colors"
          >
            立即進入畫面 ➔
          </button>
        )}
      </div>
    </div>
  );
};
