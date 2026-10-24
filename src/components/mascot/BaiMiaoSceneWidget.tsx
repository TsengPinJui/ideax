import React, { useEffect, useState } from 'react';
import { BaiMiao3D, BaiMiaoPose } from './BaiMiao3D';
import { BaiMiao2D } from './BaiMiao2D';
import './mascot.css';

export type BaiMiaoSceneType =
  | 'border_patrol'       // 首頁專區邊框漫步 & 中間側躺小睡 & 閒置過久中間躺平呼呼大睡
  | 'card_shuttle'        // 提案頁面：在各個圖卡與模組間穿梭
  | 'proposal_shuttle'    // 提案編輯頁面：在各個字卡模組間穿梭
  | 'headhunter_telescope'// 付費獵頭：拿出望遠鏡看
  | 'chat_mediator'       // 調解聊天室：坐下先戴眼鏡然後拿出紙筆書寫
  | 'report_magnifier'    // 付費報告：單手拿出放大鏡、單手撐地趴在地上看
  | 'idle_nap';           // 閒暇時：側躺撐頭閉眼小睡

const SHORT_SCENE_SPEECH: Record<BaiMiaoSceneType, string[]> = {
  border_patrol: [
    '嗨！喵～今天想逛哪個專區？',
    '喵嗚！點選下方卡片就能探索最新提案喔！',
    '呼嚕嚕…在中間側躺小睡一下喵 Zzz',
  ],
  card_shuttle: [
    '喵！把每個字卡填齊，媒合率會大幅提升喔！',
    '靈感來囉喵～需要幫忙隨時點我！',
  ],
  proposal_shuttle: [
    '喵！白喵正幫您的提案自動分類與貼標籤喔！',
    '把痛點與解方寫清楚，更容易吸引專家喵～',
  ],
  headhunter_telescope: [
    '喵！正拿望遠鏡幫您鎖定高勝率專家！',
    '看到幾位超合拍的領域行家囉喵～',
  ],
  chat_mediator: [
    '眼鏡戴好囉！幫雙方把共識重點記下來喵✍️',
    '有條理溝通最有效率，白喵全程陪跑喵！',
  ],
  report_magnifier: [
    '趴地拿放大鏡幫您把關每個關鍵細節喵🔍',
    '核心痛點與三階段落地方向都整理好囉喵！',
  ],
  idle_nap: [
    '呼嚕嚕…有需要隨時叫醒我喵 Zzz',
    '喵嗚～點我一下馬上精神百倍！',
  ],
};

/**
 * 1. 首頁「主題專區」與「提案頁圖卡模組間」無縫漫步與中間睡眠白喵組件
 * - 支援 renderMode="2d"（提案內頁與提案圖卡間使用 2D 白喵穿梭）與預設 "3d"（首頁專區與其他地方使用 3D 白喵）
 * - 漫步至中間位置 (50%) 時會「側躺撐頭小睡 (idle_nap)」
 * - 若使用者閒置過久，白喵會走到正中間 (50%) 並直接「四腳朝天躺平呼呼大睡 (deep_sleep)」
 */
export const SpecialZoneBorderBaiMiao: React.FC<{
  activeZoneName?: string;
  onOpenFullPreview?: () => void;
  customSpeeches?: [string, string, string];
  renderMode?: '2d' | '3d';
  className?: string;
}> = ({ customSpeeches, renderMode = '3d', className = '' }) => {
  const [xPercent, setXPercent] = useState<number>(50);
  const [walkDurationMs, setWalkDurationMs] = useState<number>(0);
  const [pose, setPose] = useState<BaiMiaoPose>('idle_nap');
  const [showBubble, setShowBubble] = useState<boolean>(true);

  const rightSpeech = customSpeeches?.[0] || '嗨！喵～今天想逛哪個專區？';
  const leftSpeech = customSpeeches?.[1] || '嗨！這邊也有超多精彩懸賞與解方喵～';
  const napSpeech = customSpeeches?.[2] || '呼嚕嚕…在中間側躺小睡一下喵 Zzz';
  const deepSleepSpeech = '呼嚕嚕…大家都在忙，白喵躺平呼呼大睡囉 Zzz';

  const [speechText, setSpeechText] = useState<string>(napSpeech);
  const [phase, setPhase] = useState<
    | 'center_nap'
    | 'walk_to_right'
    | 'wave_right'
    | 'walk_to_center_from_right'
    | 'walk_to_left'
    | 'wave_left'
    | 'walk_to_center_from_left'
    | 'deep_sleep'
  >('center_nap');

  // 偵測使用者是否閒置過久（超過 18 秒無點擊/按鍵/滾動操作，自動進入正中間「躺平呼呼大睡」）
  useEffect(() => {
    let idleTimer: number;

    const resetIdleTimer = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        setPhase((prev) => (prev === 'deep_sleep' ? prev : 'deep_sleep'));
      }, 18000);
    };

    resetIdleTimer();
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, resetIdleTimer, { passive: true }));

    return () => {
      window.clearTimeout(idleTimer);
      events.forEach((ev) => window.removeEventListener(ev, resetIdleTimer));
    };
  }, []);

  // 自動隱藏氣泡（像小燈泡一樣顯示幾秒後自動收起，點擊白喵可隨時再叫出）
  useEffect(() => {
    if (!showBubble) return;
    const hideTimer = window.setTimeout(() => {
      setShowBubble(false);
    }, 4200);
    return () => window.clearTimeout(hideTimer);
  }, [showBubble, speechText]);

  useEffect(() => {
    let timer: number;

    if (phase === 'center_nap') {
      setWalkDurationMs(350);
      setXPercent(50);
      setPose('idle_nap');
      setSpeechText(napSpeech);
      setShowBubble(true);
      timer = window.setTimeout(() => {
        setShowBubble(false);
        setPhase('walk_to_right');
      }, 6500);
    } else if (phase === 'walk_to_right') {
      setPose('walk_right');
      setWalkDurationMs(3200);
      const raf = window.requestAnimationFrame(() => {
        setXPercent(82);
      });
      timer = window.setTimeout(() => {
        setPhase('wave_right');
      }, 3250);
      return () => {
        window.cancelAnimationFrame(raf);
        window.clearTimeout(timer);
      };
    } else if (phase === 'wave_right') {
      setWalkDurationMs(300);
      setPose('wave_hi_right');
      setXPercent(82);
      setSpeechText(rightSpeech);
      setShowBubble(true);
      timer = window.setTimeout(() => {
        setShowBubble(false);
        setPhase('walk_to_center_from_right');
      }, 4200);
    } else if (phase === 'walk_to_center_from_right') {
      setPose('walk_left');
      setWalkDurationMs(3200);
      const raf = window.requestAnimationFrame(() => {
        setXPercent(50);
      });
      timer = window.setTimeout(() => {
        setPose('idle_nap');
        setSpeechText(napSpeech);
        setShowBubble(true);
        timer = window.setTimeout(() => {
          setShowBubble(false);
          setPhase('walk_to_left');
        }, 5800);
      }, 3250);
      return () => {
        window.cancelAnimationFrame(raf);
        window.clearTimeout(timer);
      };
    } else if (phase === 'walk_to_left') {
      setPose('walk_left');
      setWalkDurationMs(3200);
      const raf = window.requestAnimationFrame(() => {
        setXPercent(18);
      });
      timer = window.setTimeout(() => {
        setPhase('wave_left');
      }, 3250);
      return () => {
        window.cancelAnimationFrame(raf);
        window.clearTimeout(timer);
      };
    } else if (phase === 'wave_left') {
      setWalkDurationMs(300);
      setPose('wave_hi_left');
      setXPercent(18);
      setSpeechText(leftSpeech);
      setShowBubble(true);
      timer = window.setTimeout(() => {
        setShowBubble(false);
        setPhase('walk_to_center_from_left');
      }, 4200);
    } else if (phase === 'walk_to_center_from_left') {
      setPose('walk_right');
      setWalkDurationMs(3200);
      const raf = window.requestAnimationFrame(() => {
        setXPercent(50);
      });
      timer = window.setTimeout(() => {
        setPhase('center_nap');
      }, 3250);
      return () => {
        window.cancelAnimationFrame(raf);
        window.clearTimeout(timer);
      };
    } else if (phase === 'deep_sleep') {
      setWalkDurationMs(1200);
      const raf = window.requestAnimationFrame(() => {
        setXPercent(50);
      });
      setPose('deep_sleep');
      setSpeechText(deepSleepSpeech);
      setShowBubble(true);
      return () => {
        window.cancelAnimationFrame(raf);
      };
    }

    return () => window.clearTimeout(timer);
  }, [phase, rightSpeech, leftSpeech, napSpeech]);

  const handleMascotClick = () => {
    if (phase === 'deep_sleep' || phase === 'center_nap') {
      setPhase('wave_right');
    } else {
      setShowBubble((prev) => !prev);
    }
  };

  return (
    <div className={`relative w-full h-11 sm:h-12 select-none pointer-events-none z-20 mb-0.5 ${className}`}>
      <div
        style={{
          left: `${xPercent}%`,
          transform: 'translateX(-50%)',
          transitionProperty: 'left',
          transitionDuration: `${walkDurationMs}ms`,
          transitionTimingFunction: 'ease-in-out',
        }}
        className="absolute -bottom-3 flex flex-col items-center pointer-events-auto"
      >
        {showBubble && (
          <div
            onClick={() => setShowBubble(false)}
            className="mascot-speech-bubble mb-0.5 cursor-pointer"
            title="點擊收起對話"
          >
            <p className="mascot-speech-text">{speechText}</p>
            <div className="mascot-speech-tail" />
          </div>
        )}

        <div
          onClick={handleMascotClick}
          className="cursor-pointer transition-transform hover:scale-105 active:scale-95"
          title={
            pose === 'deep_sleep'
              ? '白喵正在呼呼大睡，點擊叫醒他！'
              : pose === 'idle_nap'
              ? '白喵正在中間側躺小睡，點擊互動！'
              : '點擊白喵互動'
          }
        >
          {renderMode === '2d' ? (
            <BaiMiao2D pose={pose} size={74} />
          ) : (
            <BaiMiao3D pose={pose} size={74} />
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * 2. 各大場景無縫出現的白喵組件
 * - 提案穿梭場景 (proposal_shuttle / card_shuttle) 或指定 renderMode="2d" 時使用 2D 白喵
 * - 其他地方（獵頭、調解聊天室、報告解鎖等）一律使用 3D 白喵
 */
export const BaiMiaoTaskBanner: React.FC<{
  scene: BaiMiaoSceneType;
  customTaskStatus?: string;
  compact?: boolean;
  darkTheme?: boolean;
  renderMode?: '2d' | '3d';
  onOpenPreview?: () => void;
  className?: string;
}> = ({
  scene,
  customTaskStatus,
  compact = false,
  renderMode,
  className = '',
}) => {
  const [sleepStage, setSleepStage] = useState<'awake' | 'nap' | 'deep_sleep'>(
    scene === 'idle_nap' ? 'nap' : 'awake'
  );
  const [lineIdx, setLineIdx] = useState(0);
  const [showBubble, setShowBubble] = useState(true);

  useEffect(() => {
    setSleepStage(scene === 'idle_nap' ? 'nap' : 'awake');
  }, [scene]);

  useEffect(() => {
    const napTimer = window.setTimeout(() => {
      setSleepStage((prev) => (prev === 'awake' ? 'nap' : prev));
    }, 12000);
    const deepTimer = window.setTimeout(() => {
      setSleepStage('deep_sleep');
    }, 24000);

    return () => {
      window.clearTimeout(napTimer);
      window.clearTimeout(deepTimer);
    };
  }, [sleepStage]);

  const lines =
    SHORT_SCENE_SPEECH[sleepStage !== 'awake' ? 'idle_nap' : scene] ||
    SHORT_SCENE_SPEECH.border_patrol;

  const rawSpeech =
    sleepStage === 'deep_sleep'
      ? '呼嚕嚕…白喵躺平呼呼大睡中 Zzz'
      : sleepStage === 'nap'
      ? '呼嚕嚕…側躺小睡一下，有需要隨時點我喵 Zzz'
      : customTaskStatus || lines[lineIdx % lines.length];

  const conciseSpeech =
    rawSpeech.length > 36
      ? lines[lineIdx % lines.length]
      : rawSpeech;

  const activePose: BaiMiaoPose =
    sleepStage === 'deep_sleep'
      ? 'deep_sleep'
      : sleepStage === 'nap'
      ? 'idle_nap'
      : scene === 'card_shuttle' || scene === 'proposal_shuttle'
      ? 'card_shuttle'
      : scene === 'headhunter_telescope'
      ? 'headhunter_telescope'
      : scene === 'chat_mediator'
      ? 'chat_mediator'
      : scene === 'report_magnifier'
      ? 'report_magnifier'
      : 'wave_hi_right';

  const use2D =
    renderMode === '2d' ||
    (renderMode === undefined &&
      (scene === 'card_shuttle' || scene === 'proposal_shuttle'));

  const handleClickMascot = () => {
    if (sleepStage !== 'awake') {
      setSleepStage('awake');
      setShowBubble(true);
    } else {
      setLineIdx((prev) => prev + 1);
      setShowBubble(true);
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-2 select-none pointer-events-auto ${className}`}
    >
      <div
        onClick={handleClickMascot}
        className="shrink-0 cursor-pointer transition-transform hover:scale-105 active:scale-95"
        title="點擊白喵互動"
      >
        {use2D ? (
          <BaiMiao2D pose={activePose} size={compact ? 66 : 74} />
        ) : (
          <BaiMiao3D pose={activePose} size={compact ? 66 : 74} />
        )}
      </div>

      {showBubble && (
        <div
          onClick={() => setShowBubble(false)}
          className="mascot-speech-bubble !max-w-[240px] cursor-pointer"
          title="點擊收起"
        >
          <p className="mascot-speech-text">{conciseSpeech}</p>
        </div>
      )}
    </div>
  );
};

export interface ProposalModuleItem {
  id: string;
  label: string;
  icon?: string;
  speech: string;
}

/**
 * 3. 提案內頁專屬：2D 白喵模塊穿梭跑道 (ProposalModuleShuttleBaiMiao)
 * - 使用高畫質 2D 白喵在各個內容模塊（介紹、核心功能、使用方式、留言回饋、技術架構）間靈巧穿梭
 * - 點擊任意模塊標籤，白喵會跑跑跳躍 (card_shuttle) 抵達該模塊並平滑滾動頁面
 * - 中間停留時會側躺小睡 (idle_nap)
 * - 閒置過久自動回到正中間躺平呼呼大睡 (deep_sleep)
 */
export const ProposalModuleShuttleBaiMiao: React.FC<{
  modules?: ProposalModuleItem[];
  className?: string;
}> = ({
  modules = [
    { id: 'case-intro', label: '作品介紹', icon: '🌟', speech: '喵！來看看這個提案的創作初衷與背景！' },
    { id: 'case-tech', label: '技術架構', icon: '🛠️', speech: '查看背後的技術堆疊與實現工具喵～' },
    { id: 'case-discussions', label: '討論回饋', icon: '💬', speech: '歡迎留下你的建議或鼓勵，給作者滿滿靈感！' },
  ],
  className = '',
}) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [pose, setPose] = useState<BaiMiaoPose>('card_shuttle');
  const [speech, setSpeech] = useState<string>(modules[0]?.speech || '白喵正穿梭於模塊間為您導覽喵！');
  const [showBubble, setShowBubble] = useState(true);
  const [isIdleAsleep, setIsIdleAsleep] = useState(false);

  // 閒置 18 秒後自動回到中間躺平熟睡
  useEffect(() => {
    let idleTimer: number;
    const resetIdle = () => {
      setIsIdleAsleep(false);
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        setIsIdleAsleep(true);
        setPose('deep_sleep');
        setSpeech('呼嚕嚕…白喵在模塊間躺平呼呼大睡中 Zzz');
        setShowBubble(true);
      }, 18000);
    };

    resetIdle();
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, resetIdle, { passive: true }));
    return () => {
      window.clearTimeout(idleTimer);
      events.forEach((ev) => window.removeEventListener(ev, resetIdle));
    };
  }, []);

  const handleSelectModule = (index: number) => {
    const target = modules[index];
    if (!target) return;
    setActiveIdx(index);
    setIsIdleAsleep(false);
    setPose('card_shuttle');
    setSpeech(target.speech);
    setShowBubble(true);

    const el = document.getElementById(target.id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // 抵達後轉為開心揮手
    window.setTimeout(() => {
      setPose('wave_hi_right');
    }, 600);
  };

  const handleMascotClick = () => {
    if (isIdleAsleep) {
      setIsIdleAsleep(false);
      setPose('wave_hi_right');
      setSpeech('喵！白喵醒來囉～點擊上方模塊帶您快速導航！');
      setShowBubble(true);
    } else {
      setShowBubble((prev) => !prev);
    }
  };

  // 白喵在導航軌道上的百分比位置
  const targetPercent = isIdleAsleep
    ? 50
    : modules.length > 1
    ? 10 + (activeIdx / (modules.length - 1)) * 80
    : 50;

  return (
    <div
      className={`p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-50/90 via-yellow-50/80 to-amber-50/90 border border-amber-200/90 shadow-2xs space-y-2.5 ${className}`}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
            <span>🐾 2D 白喵模塊導航穿梭中</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 border border-amber-300">
              點擊快速跳轉
            </span>
          </span>
        </div>

        <div className="text-[11px] font-bold text-amber-800">
          目前導覽：{modules[activeIdx]?.label || '提案內頁'}
        </div>
      </div>

      {/* 模塊按鈕導軌 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {modules.map((mod, idx) => {
          const isCurrent = idx === activeIdx;
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => handleSelectModule(idx)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                isCurrent
                  ? 'bg-amber-500 text-stone-950 shadow-xs border-2 border-amber-600 scale-[1.02]'
                  : 'bg-white hover:bg-amber-100/70 text-stone-700 border border-amber-200/80 hover:border-amber-300'
              }`}
            >
              <span>{mod.icon || '📌'}</span>
              <span className="truncate">{mod.label}</span>
            </button>
          );
        })}
      </div>

      {/* 白喵漫步穿梭跑道 */}
      <div className="relative w-full h-20 select-none overflow-hidden pt-1">
        {/* 虛線跑道與小爪印 */}
        <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 border-b-2 border-dashed border-amber-300/80 pointer-events-none flex justify-between px-6 text-amber-300 text-[10px]">
          <span>🐾</span>
          <span>🐾</span>
          <span>🐾</span>
          <span>🐾</span>
          <span>🐾</span>
        </div>

        {/* 穿梭白喵實體 */}
        <div
          style={{
            left: `${targetPercent}%`,
            transform: 'translateX(-50%)',
            transition: 'left 550ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          className="absolute top-0 flex flex-col items-center pointer-events-auto z-10"
        >
          {showBubble && (
            <div
              onClick={() => setShowBubble(false)}
              className="mascot-speech-bubble !max-w-[280px] -mb-1 cursor-pointer scale-90"
              title="點擊收起"
            >
              <p className="mascot-speech-text">{speech}</p>
              <div className="mascot-speech-tail" />
            </div>
          )}

          <div
            onClick={handleMascotClick}
            className="cursor-pointer transition-transform hover:scale-110 active:scale-95"
            title={
              isIdleAsleep
                ? '白喵正在躺平呼呼大睡，點擊叫醒他！'
                : '2D 白喵正穿梭於各模塊，點擊互動！'
            }
          >
            <BaiMiao2D pose={pose} size={70} />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 4. 模塊卡片之間的小穿梭過道 (ModuleShuttlePassoverBaiMiao)
 * 放於兩大內容區塊之間，讓 2D 白喵穿梭於卡片與模塊縫隙中
 */
export const ModuleShuttlePassoverBaiMiao: React.FC<{
  nextModuleId?: string;
  nextModuleLabel?: string;
  hintText?: string;
  className?: string;
}> = ({
  nextModuleId,
  nextModuleLabel = '下一模塊',
  hintText,
  className = '',
}) => {
  const [showSpeech, setShowSpeech] = useState(true);

  const handleJump = () => {
    if (nextModuleId) {
      document.getElementById(nextModuleId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div
      className={`my-3 sm:my-4 p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between gap-3 text-xs select-none transition-colors hover:bg-amber-50 ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0 -my-2">
          <BaiMiao2D pose="card_shuttle" size={54} />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-amber-950 flex items-center gap-1.5">
            <span>🐾 2D 白喵穿梭模塊中</span>
            <span className="text-[10px] text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded-full">
              下一站 ➔ {nextModuleLabel}
            </span>
          </div>
          {hintText && showSpeech && (
            <p className="text-[11px] text-amber-800 truncate mt-0.5">{hintText}</p>
          )}
        </div>
      </div>

      {nextModuleId && (
        <button
          type="button"
          onClick={handleJump}
          className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
        >
          <span>快速前往</span>
          <span>↓</span>
        </button>
      )}
    </div>
  );
};
