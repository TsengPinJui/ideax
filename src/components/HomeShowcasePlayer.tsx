import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Trophy, Megaphone, Star, Play, Flame } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { HomeShowcaseCategory, HomeShowcaseMode, Question } from '../types';
import { getYoutubeThumbnailUrl } from '../utils/youtubeUtils';
import { deriveInnovationProposalName } from '../utils/titleFormat';
import { OPEN_QUESTION_EVENT } from './mascot/mascotConfig';
import {
  HOT_GAMES_DEFS,
  createHotGameQuestion,
  getFeaturedGames,
  getFeaturedProposalsAndSoftware,
  getHotRankedGames,
  getHotRankedProposalsAndSoftware,
  isShowcaseGameQuestion,
  isShowcaseProposalOrSoftwareQuestion,
} from '../data/hotGamesData';

/**
 * 首頁創點子播放區：依管理員在儀表板勾選的內容輪流播放（分成「提案與軟體」、「遊戲」兩類）
 * 同時支援「精選榜」與「熱度榜」雙榜交錯輪播展示
 */

type SlideMode = HomeShowcaseMode | 'hot';

const MODE_META: Record<SlideMode, { label: string; icon: React.ReactNode; cls: string }> = {
  excellent: { label: '精選榜', icon: <Trophy className="w-3 h-3" />, cls: 'bg-amber-400 text-stone-950' },
  paid: { label: '推播', icon: <Megaphone className="w-3 h-3" />, cls: 'bg-white/90 text-stone-800' },
  custom: { label: '精選榜', icon: <Star className="w-3 h-3" />, cls: 'bg-sky-500 text-white' },
  hot: { label: '熱度榜', icon: <Flame className="w-3 h-3" />, cls: 'bg-rose-600 text-white' },
};
const TYPE_LABEL: Record<string, string> = {
  innovation_proposal: '創新提案',
  vibecoding_app: '軟體作品',
  pain_point: '痛點',
  seek_solution: '提問',
  chat_discussion: '討論',
};
const INTERVAL_MS = 5000;
const MAX_SLIDES = 30;

export type Slide = { q: Question; mode: SlideMode; image: string; isVideo: boolean; badgeLabel?: string };

const imageOf = (q: Question): { image: string; isVideo: boolean } => {
  const yt = q.youtubeUrl || (q as any).vibeCodingData?.youtubeUrl;
  const pick =
    (q.coverImage && q.coverImage.trim()) ||
    (q as any).vibeCodingData?.coverImageUrl ||
    (q.cardDisplayImage && q.cardDisplayImage.trim()) ||
    q.galleryImages?.[0] ||
    q.screenshots?.[0] ||
    (q as any).vibeCodingData?.screenshots?.[0] ||
    '';
  if (q.coverMode === 'youtube_video' && yt) return { image: getYoutubeThumbnailUrl(yt) || pick || '', isVideo: true };
  if (pick) return { image: pick, isVideo: false };
  if (yt) return { image: getYoutubeThumbnailUrl(yt) || '', isVideo: true };
  return { image: '', isVideo: false };
};

const isLive = (q: Question) => q.status !== 'delisted' && q.status !== 'closed';
const score = (q: Question) => (q.likes || 0) * 2 + (q.secondedCount || 0) * 2 + (q.supporterCount || 0) + (q.supportPoints || 0) / 50 + (q.views || 0) / 100;

export function useShowcaseSlides(categoryOverride?: HomeShowcaseCategory): Slide[] {
  const { questions, homeShowcaseConfig } = useApp();
  return useMemo(() => {
    const cfg = homeShowcaseConfig;
    if (!cfg?.enabled) return [];
    const activeCat: HomeShowcaseCategory =
      categoryOverride || (cfg.defaultCategory === 'proposals_software' ? 'proposals_software' : 'games');

    const activeModes: HomeShowcaseMode[] =
      activeCat === 'proposals_software'
        ? Array.isArray(cfg.proposalModes)
          ? cfg.proposalModes
          : cfg.modes || []
        : Array.isArray(cfg.gameModes)
        ? cfg.gameModes
        : cfg.modes || [];

    if (!activeModes.length) return [];

    const liveQuestions = (questions || []).filter(isLive);
    const seedGames = HOT_GAMES_DEFS.map(createHotGameQuestion);
    const byId = new Map<string, Question>();
    liveQuestions.forEach((q) => byId.set(q.id, q));
    seedGames.forEach((g) => {
      if (!byId.has(g.id)) byId.set(g.id, g);
    });

    const allWithSeeds = [...byId.values()];
    const categoryPool = allWithSeeds.filter((q) =>
      activeCat === 'games' ? isShowcaseGameQuestion(q) : isShowcaseProposalOrSoftwareQuestion(q)
    );

    // 虛擬（模擬）卡片：管理員打開「包含虛擬卡片」時，優秀作品、付費推播也會播放
    const real =
      cfg.includeSimulated === false
        ? categoryPool.filter((q) => !q.isSimulated && !q.simulatedBatchId)
        : categoryPool;

    const rawCustomIds: string[] =
      activeCat === 'proposals_software'
        ? Array.isArray(cfg.proposalCustomIds)
          ? cfg.proposalCustomIds
          : cfg.customIds || []
        : Array.isArray(cfg.gameCustomIds)
        ? cfg.gameCustomIds
        : cfg.customIds || [];

    const activeCustomIds: string[] = rawCustomIds.filter((id) => {
      const item = byId.get(id);
      if (!item) return false;
      return activeCat === 'games'
        ? isShowcaseGameQuestion(item)
        : isShowcaseProposalOrSoftwareQuestion(item);
    });

    const out: Slide[] = [];
    const seen = new Set<string>();
    const push = (q: Question | undefined, mode: HomeShowcaseMode) => {
      if (!q || seen.has(q.id) || out.length >= MAX_SLIDES) return;
      seen.add(q.id);
      out.push({ q, mode, ...imageOf(q) });
    };

    // 優先順序：自選（custom）作品最優先播放！確保管理員在後台調整的排序（#1, #2...）精確直接反映在輪播前端
    const modePriority: HomeShowcaseMode[] = ['custom', 'paid', 'excellent'];
    for (const mode of modePriority) {
      if (!activeModes.includes(mode)) continue;
      if (mode === 'custom') {
        activeCustomIds.forEach((id) => push(byId.get(id), 'custom'));
      } else if (mode === 'paid') {
        real
          .filter((q) => q.isFeatured && q.status === 'open')
          .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
          .slice(0, 8)
          .forEach((q) => push(q, 'paid'));
      } else if (mode === 'excellent') {
        const starItems = real
          .filter((q) => q.isStarSeason || q.starSeasonProposalId)
          .sort((a, b) => score(b) - score(a))
          .slice(0, 8);
        if (starItems.length > 0) {
          starItems.forEach((q, idx) => push(q, 'excellent'));
        } else if (activeCat === 'games') {
          getFeaturedGames(real)
            .slice(0, 8)
            .forEach((item) => push(item.question, 'excellent'));
        } else {
          getFeaturedProposalsAndSoftware(real)
            .slice(0, 8)
            .forEach((item) => push(item.question, 'excellent'));
        }
      }
    }
    return out.map((s, idx) => ({
      ...s,
      badgeLabel: s.badgeLabel || `精選榜 #${idx + 1}`,
    }));
  }, [questions, homeShowcaseConfig, categoryOverride]);
}

/**
 * 結合「精選榜」與「熱度榜」雙榜交錯輪播（除了輪播精選榜，也同步輪播熱度榜 TOP 10）
 */
export function useCombinedShowcaseSlides(categoryOverride?: HomeShowcaseCategory): Slide[] {
  const { questions, homeShowcaseConfig } = useApp();
  const featuredSlides = useShowcaseSlides(categoryOverride);
  return useMemo(() => {
    const cfg = homeShowcaseConfig;
    if (!cfg?.enabled) return featuredSlides;
    const activeCat: HomeShowcaseCategory =
      categoryOverride || (cfg.defaultCategory === 'proposals_software' ? 'proposals_software' : 'games');

    const hotRanked =
      activeCat === 'games'
        ? getHotRankedGames(questions || [], cfg.hotGamesMode || 'custom', cfg.hotGameIds || [])
        : getHotRankedProposalsAndSoftware(questions || [], cfg.hotProposalsMode || 'custom', cfg.hotProposalIds || []);

    const hotSlides: Slide[] = hotRanked.slice(0, 10).map((item, idx) => ({
      q: item.question,
      mode: 'hot' as const,
      ...imageOf(item.question),
      badgeLabel: `熱度榜 #${idx + 1}`,
    }));

    const combined: Slide[] = [];
    const maxLen = Math.max(featuredSlides.length, hotSlides.length);
    for (let i = 0; i < maxLen; i++) {
      if (featuredSlides[i]) {
        combined.push({
          ...featuredSlides[i],
          badgeLabel: featuredSlides[i].badgeLabel || `精選榜 #${i + 1}`,
        });
      }
      if (hotSlides[i]) {
        combined.push(hotSlides[i]);
      }
    }
    return combined.slice(0, MAX_SLIDES);
  }, [featuredSlides, questions, homeShowcaseConfig, categoryOverride]);
}

export const HomeShowcasePlayer: React.FC<{ slides: Slide[]; onSelectSlide?: (q: Question) => void }> = ({ slides, onSelectSlide }) => {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const reduceMotion = useMemo(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const n = slides.length;
  const go = useCallback((d: number) => setIdx((i) => (i + d + n) % n), [n]);

  useEffect(() => { if (idx >= n) setIdx(0); }, [n, idx]);
  useEffect(() => {
    if (paused || reduceMotion || n <= 1) return;
    const t = window.setInterval(() => { if (!document.hidden) go(1); }, INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [paused, reduceMotion, n, go]);

  const open = (q: Question) => {
    if (onSelectSlide) {
      onSelectSlide(q);
      return;
    }
    try { window.dispatchEvent(new CustomEvent(OPEN_QUESTION_EVENT, { detail: { id: q.id } })); } catch {}
  };

  if (!n) return null;
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-amber-200/80 bg-stone-900 shadow-md"
      role="region"
      aria-roledescription="carousel"
      aria-label="首頁輪播：精選榜與熱度榜"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; setPaused(true); }}
      onTouchEnd={(e) => {
        const s = touch.current; touch.current = null; setPaused(false);
        if (!s) return;
        const dx = e.changedTouches[0].clientX - s.x, dy = e.changedTouches[0].clientY - s.y;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
      }}
    >
      <div className="relative aspect-[16/9] sm:aspect-[2/1]">
        {slides.map((s, i) => {
          const meta = MODE_META[s.mode];
          const active = i === idx;
          const badgeText = s.badgeLabel || meta.label;
          return (
            <button
              key={`${s.mode}-${s.q.id}-${i}`}
              type="button"
              onClick={() => open(s.q)}
              aria-hidden={!active}
              tabIndex={active ? 0 : -1}
              aria-label={`${badgeText}：${s.q.title}`}
              className={`absolute inset-0 w-full h-full text-left cursor-pointer transition-opacity duration-700 ${active ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
            >
              {s.image ? (
                <img src={s.image} alt="" loading={i === 0 ? 'eager' : 'lazy'} className="absolute inset-0 w-full h-full object-cover brightness-[1.06] contrast-[1.02]" />
              ) : (
                <span className="absolute inset-0 bg-gradient-to-br from-amber-300 via-amber-200 to-orange-200" />
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
              {s.isVideo && (
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/55 text-white flex items-center justify-center">
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
                </span>
              )}
              <span className={`absolute top-2.5 left-2.5 sm:top-3.5 sm:left-3.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black shadow-xs ${meta.cls}`}>
                {meta.icon}{badgeText}
              </span>
              <span className="absolute inset-x-0 bottom-0 p-3 sm:p-5 pb-6 sm:pb-8">
                {(() => {
                  const pName = s.q.appName || (s.q.postType === 'innovation_proposal' ? deriveInnovationProposalName(s.q) : '');
                  return (
                    <span className="block text-[10px] sm:text-xs font-bold text-amber-200">
                      {TYPE_LABEL[s.q.postType || ''] || '創點子'}{pName ? `・${pName}` : ''}
                    </span>
                  );
                })()}
                <span className="block text-sm sm:text-xl font-black text-white leading-snug line-clamp-2 drop-shadow">{s.q.title}</span>
                <span className="block text-[10px] sm:text-xs text-white/75 mt-0.5 truncate">{s.q.authorName}</span>
              </span>
            </button>
          );
        })}

        {n > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="上一個" className="absolute z-20 left-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/35 hover:bg-black/55 text-white hidden sm:flex items-center justify-center cursor-pointer">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="下一個" className="absolute z-20 right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/35 hover:bg-black/55 text-white hidden sm:flex items-center justify-center cursor-pointer">
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute z-20 bottom-2 inset-x-0 flex justify-center gap-1.5" role="tablist" aria-label="切換播放項目">
              {slides.map((s, i) => (
                <button
                  key={s.q.id}
                  type="button"
                  role="tab"
                  aria-selected={i === idx}
                  aria-label={`第 ${i + 1} 個：${s.q.title}`}
                  onClick={() => setIdx(i)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${i === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HomeShowcasePlayer;
