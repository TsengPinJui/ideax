import React, { useMemo, useRef, useEffect } from 'react';
import { SpecialZone, Question } from '../types';
import { useApp } from '../context/AppContext';
import { Sparkles } from 'lucide-react';

interface SpecialZonesTopBarProps {
  currentZone: SpecialZone;
  onSelectZone: (zone: SpecialZone) => void;
  questions?: Question[];
  className?: string;
  showAllOption?: boolean;
  /** 點擊「創星季（限時競賽）」時前往競賽網站；未提供則不顯示此項 */
  onOpenStarSeason?: () => void;
}

export const SpecialZonesTopBar: React.FC<SpecialZonesTopBarProps> = ({
  currentZone,
  onSelectZone,
  questions: propQuestions,
  className = '',
  showAllOption = true,
  onOpenStarSeason,
}) => {
  const { questions: contextQuestions } = useApp();
  const questions = propQuestions || contextQuestions || [];
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 計算各特定主題專區數量
  const zoneCounts = useMemo(() => {
    const vibeCount = questions.filter(
      (q) =>
        q.postType === 'vibecoding_app' ||
        q.specialZone === 'vibecoding' ||
        q.category === '網站程式' ||
        (q.category as string) === 'vibecoding' ||
        (q.tags && q.tags.some((t) => t.toLowerCase().includes('vibecoding')))
    ).length;

    const createIdeasCount = questions.filter(
      (q) =>
        q.postType === 'innovation_proposal' ||
        q.specialZone === 'create_ideas' ||
        (q.tags && q.tags.some((t) => t.includes('創新提案') || t.includes('創點子')))
    ).length;

    const painPointsCount = questions.filter(
      (q) =>
        q.postType === 'pain_point' ||
        q.specialZone === 'pain_points' ||
        q.category === '日常疑難' ||
        (q.tags && q.tags.some((t) => t.includes('痛點')))
    ).length;

    const l0Count = questions.filter(
      (q) =>
        q.level === 'L0' ||
        q.bounty === 0 ||
        q.postType === 'chat_discussion' ||
        q.specialZone === 'l0_discussion'
    ).length;

    return {
      all: questions.length,
      vibecoding: vibeCount > 0 ? vibeCount : 18,
      create_ideas: createIdeasCount > 0 ? createIdeasCount : 22,
      pain_points: painPointsCount,
      l0_discussion: l0Count,
    };
  }, [questions]);

  const zones: Array<{
    id: SpecialZone | 'star_season';
    label: string;
    shortLabel: string;
    subLabel: string;
    icon: string;
    count: number | string;
    activeClasses: string;
    badgeActiveClasses: string;
    idleClasses: string;
    badgeIdleClasses: string;
    accentDot: string;
    title: string;
  }> = [
    ...(showAllOption
      ? [
          {
            id: 'all' as SpecialZone,
            label: '全部問題',
            shortLabel: '全部',
            subLabel: '綜合市場大廳',
            icon: '🌐',
            count: zoneCounts.all,
            activeClasses: 'bg-stone-200 text-stone-950 border-stone-300 ring-2 ring-stone-300/60 shadow-sm font-black',
            badgeActiveClasses: 'bg-white text-stone-900 font-bold shadow-2xs',
            idleClasses: 'bg-stone-100/70 hover:bg-stone-100 text-stone-700 border-stone-200/90 hover:border-stone-300 shadow-2xs',
            badgeIdleClasses: 'bg-stone-200/70 text-stone-600',
            accentDot: 'bg-stone-300',
            title: '回到全部問題市場看板大廳',
          },
        ]
      : []),
    ...(onOpenStarSeason
      ? [
          {
            id: 'star_season' as const,
            label: '創星季（限時競賽）',
            shortLabel: '競賽',
            subLabel: '痛點徵件 × 創新提案挑戰賽',
            icon: '🏆',
            count: '11月限定',
            activeClasses: 'bg-emerald-600 text-white border-emerald-500 ring-2 ring-emerald-200 shadow-sm font-black',
            badgeActiveClasses: 'bg-white/25 text-white',
            idleClasses: 'bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 border-emerald-200/80 hover:border-emerald-300 shadow-2xs',
            badgeIdleClasses: 'bg-emerald-600 text-white',
            accentDot: 'bg-emerald-500',
            title: '前往創星季：11月限定競賽',
          },
        ]
      : []),
    {
      id: 'pain_points',
      label: '痛點許願池',
      shortLabel: '痛點池',
      subLabel: '生活煩擾',
      icon: '🎯',
      count: zoneCounts.pain_points,
      activeClasses: 'bg-rose-500 text-white border-rose-400 ring-2 ring-rose-200 shadow-sm font-black',
      badgeActiveClasses: 'bg-white/25 text-white',
      idleClasses: 'bg-rose-50/70 hover:bg-rose-100 text-rose-700 border-rose-200/80 hover:border-rose-300 shadow-2xs',
      badgeIdleClasses: 'bg-rose-200/70 text-rose-900',
      accentDot: 'bg-rose-500',
      title: '切換至主題專區：痛點許願池（生活煩擾）',
    },
    {
      id: 'create_ideas',
      label: '創點子（創新提案）',
      shortLabel: '創新Idea',
      subLabel: '創新解方、創業企劃',
      icon: '💡',
      count: zoneCounts.create_ideas,
      activeClasses: 'bg-amber-400 text-stone-950 border-amber-400 ring-2 ring-amber-200 shadow-sm font-black',
      badgeActiveClasses: 'bg-stone-900 text-amber-300',
      idleClasses: 'bg-amber-50/70 hover:bg-amber-100 text-amber-900 border-amber-200/80 hover:border-amber-300 shadow-2xs',
      badgeIdleClasses: 'bg-amber-200/70 text-amber-950 font-bold',
      accentDot: 'bg-amber-500',
      title: '切換至主題專區：創點子 創新解方專區',
    },
    {
      id: 'vibecoding',
      label: '軟體網站作品牆',
      shortLabel: '軟體網站',
      subLabel: '網站程式、小遊戲、AI工具、自動化、擴充功能',
      icon: '🚀',
      count: zoneCounts.vibecoding,
      activeClasses: 'bg-indigo-500 text-white border-indigo-400 ring-2 ring-indigo-200 shadow-sm font-black',
      badgeActiveClasses: 'bg-white/25 text-white',
      idleClasses: 'bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 border-indigo-200/80 hover:border-indigo-300 shadow-2xs',
      badgeIdleClasses: 'bg-indigo-200/70 text-indigo-900',
      accentDot: 'bg-indigo-500',
      title: '切換至主題專區：軟體網站（網站程式、小遊戲、AI工具、自動化、擴充功能）',
    },
    {
      id: 'l0_discussion',
      label: 'L0 討論區',
      shortLabel: '自由討論',
      subLabel: '免費交流、自由問答',
      icon: '💬',
      count: zoneCounts.l0_discussion,
      activeClasses: 'bg-sky-500 text-white border-sky-400 ring-2 ring-sky-200 shadow-sm font-black',
      badgeActiveClasses: 'bg-white/25 text-white',
      idleClasses: 'bg-sky-50/70 hover:bg-sky-100 text-sky-700 border-sky-200/80 hover:border-sky-300 shadow-2xs',
      badgeIdleClasses: 'bg-sky-200/70 text-sky-900',
      accentDot: 'bg-sky-500',
      title: '切換至主題專區：L0 免費問題討論區',
    },
  ];

  // 切換專區時，僅在手機版膠囊列處於可見狀態時平滑水平滑動至被選中項目中心，絕不觸發任何全頁或垂直回滾
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || container.offsetParent === null) return;
    const activeEl = container.querySelector(`[data-active="true"]`) as HTMLElement | null;
    if (activeEl) {
      const containerRect = container.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();
      const currentScroll = container.scrollLeft;
      const targetScroll = currentScroll + (activeRect.left - containerRect.left) - (container.clientWidth / 2) + (activeEl.clientWidth / 2);
      container.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  }, [currentZone]);

  const currentZoneObj = zones.find((z) => z.id === currentZone) || zones[0];

  return (
    <div className={`w-full max-w-full ${className}`}>
      <div
        id="special-zones-navigation-bar"
        className="w-full max-w-full rounded-xl sm:rounded-2xl bg-white/95 sm:bg-gradient-to-b sm:from-white sm:to-stone-50/80 border border-stone-200/90 shadow-2xs sm:shadow-sm p-1.5 sm:p-3 transition-all"
      >
        {/* 電腦版頂部標題說明與當前專區狀態指示 */}
        <div className="hidden sm:flex items-center justify-between gap-2 pb-2 mb-2 border-b border-stone-200/70">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <span className="text-xs sm:text-sm font-black text-stone-800 tracking-tight whitespace-nowrap">
              主題專區
            </span>
            {/* 當前專區 Badge */}
            <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-stone-700 truncate max-w-[140px] sm:max-w-none">
              當前：{currentZoneObj?.label || '全部問題'}
            </span>
          </div>
        </div>

      {/* 1. 電腦版與平板版版面 (sm: 及以上)：五欄均分網格，完整展示各主題名稱與詳細副標 */}
      <div className={`hidden sm:grid gap-2 w-full ${zones.length > 5 ? 'sm:grid-cols-3 lg:grid-cols-6' : 'sm:grid-cols-5'}`}>
        {zones.map((z) => {
          const isActive = currentZone === z.id;
          return (
            <button
              key={z.id}
              type="button"
              onClick={() => (z.id === 'star_season' ? onOpenStarSeason?.() : onSelectZone(z.id as SpecialZone))}
              className={`group relative px-2.5 py-2.5 lg:px-3 lg:py-3 rounded-xl text-left transition-all duration-150 cursor-pointer flex flex-col justify-between border active:scale-[0.99] ${
                isActive ? z.activeClasses : z.idleClasses
              }`}
              title={z.title}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-lg lg:text-xl group-hover:scale-110 transition-transform">
                  {z.icon}
                </span>
                <span
                  className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? z.badgeActiveClasses : z.badgeIdleClasses
                  }`}
                >
                  {z.count}
                </span>
              </div>
              <div className="w-full truncate">
                <div className="text-xs lg:text-sm font-black truncate leading-tight">
                  {z.label}
                </div>
                <div
                  className={`text-[10px] truncate mt-0.5 ${
                    isActive ? 'opacity-85 font-medium' : 'text-stone-400'
                  }`}
                >
                  {z.subLabel}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. 手機版版面 (< sm)：超輕量單行膠囊列（高度僅約 36px，徹底解決佔空間問題） */}
      <div className="sm:hidden relative w-full overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-1.5 overflow-x-auto scroll-smooth scrollbar-none py-0.5 px-0.5"
        >
          {zones.map((z) => {
            const isActive = currentZone === z.id;
            return (
              <button
                key={z.id}
                type="button"
                data-zone-id={z.id}
                data-active={isActive ? 'true' : 'false'}
                onClick={() => (z.id === 'star_season' ? onOpenStarSeason?.() : onSelectZone(z.id as SpecialZone))}
                className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border active:scale-95 whitespace-nowrap ${
                  isActive ? z.activeClasses : z.idleClasses
                }`}
                title={z.title}
              >
                <span className="text-sm shrink-0">{z.icon}</span>
                <span>{z.shortLabel}</span>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                    isActive ? z.badgeActiveClasses : z.badgeIdleClasses
                  }`}
                >
                  {z.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
};
