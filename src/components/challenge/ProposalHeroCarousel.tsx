import React, { useState, useEffect } from 'react';
import { Sparkles, Camera, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { StarSeasonProposal, STAR_SEASON_TRACKS } from '../../types/competition';

interface ProposalHeroCarouselProps {
  proposals: StarSeasonProposal[];
  onSelectProposal: (proposal: StarSeasonProposal) => void;
  className?: string;
}

export const ProposalHeroCarousel: React.FC<ProposalHeroCarouselProps> = ({
  proposals,
  onSelectProposal,
  className = '',
}) => {
  // 萃取所有已上傳照片之提案
  const imageItems = React.useMemo(() => {
    const items: {
      imageUrl: string;
      proposal: StarSeasonProposal;
      imageIndex: number;
    }[] = [];

    proposals.forEach((p) => {
      if (p.images && p.images.length > 0) {
        p.images.forEach((img, idx) => {
          items.push({
            imageUrl: img,
            proposal: p,
            imageIndex: idx,
          });
        });
      }
    });

    // 若尚無足夠上傳圖片，使用預設高品質示範照片
    if (items.length === 0) {
      const fallbackImages = [
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=600&auto=format&fit=crop&q=80',
      ];
      proposals.slice(0, 4).forEach((p, idx) => {
        items.push({
          imageUrl: fallbackImages[idx % fallbackImages.length],
          proposal: p,
          imageIndex: 0,
        });
      });
    }

    return items;
  }, [proposals]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (imageItems.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % imageItems.length);
    }, 3600);
    return () => clearInterval(timer);
  }, [imageItems.length, isPaused]);

  if (imageItems.length === 0) return null;

  const currentItem = imageItems[currentIndex] || imageItems[0];
  const trackInfo = STAR_SEASON_TRACKS[currentItem.proposal.track] || STAR_SEASON_TRACKS.ict;

  return (
    <div
      className={`relative w-full sm:w-80 md:w-96 h-40 sm:h-44 rounded-3xl overflow-hidden shadow-lg border border-white/80 bg-white/40 backdrop-blur-md group transition-all ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 輪播主圖片 */}
      <img
        src={currentItem.imageUrl}
        alt={currentItem.proposal.title}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 select-none"
      />

      {/* 四周薄霧白遮罩 (半透明霧面白光覆蓋) */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/20 to-white/40 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-transparent to-white/40 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-stone-950/70 via-stone-900/30 to-transparent pointer-events-none" />

      {/* 頂部標籤列：半透明白底圓角膠囊 */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 z-10">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/85 backdrop-blur-md border border-white/60 text-stone-900 text-[10px] font-black shadow-2xs">
          <Camera className="w-3 h-3 text-amber-600" />
          <span>提案圖片輪播</span>
          <span className="text-stone-400 font-mono text-[9px]">
            {currentIndex + 1}/{imageItems.length}
          </span>
        </div>

        <span className="px-2 py-0.5 rounded-full bg-amber-400/90 text-stone-950 font-black text-[10px] shadow-2xs border border-amber-300">
          {trackInfo.tag}
        </span>
      </div>

      {/* 底部浮層卡片資訊：點擊直接開啟詳情 */}
      <div
        onClick={() => onSelectProposal(currentItem.proposal)}
        className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-between gap-2 z-10 cursor-pointer group-hover:bg-black/10 transition-colors"
        title="點擊查看此提案完整詳情"
      >
        <div className="min-w-0 flex-1">
          <div className="text-white font-black text-xs sm:text-sm line-clamp-1 drop-shadow-md group-hover:text-amber-300 transition-colors">
            {currentItem.proposal.title}
          </div>
          <div className="text-white/80 text-[10px] line-clamp-1 mt-0.5 font-medium drop-shadow-sm">
            提案人：{currentItem.proposal.authorName} • {currentItem.proposal.stage === 'pain_point' ? '痛點徵件' : '創新解方'}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectProposal(currentItem.proposal);
          }}
          className="px-2.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-[10px] font-black shadow-xs flex items-center gap-0.5 shrink-0 transition-transform active:scale-95 cursor-pointer"
        >
          <span>查看</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </button>
      </div>

      {/* 左右快速切換箭頭 (懸浮顯示) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setCurrentIndex((prev) => (prev - 1 + imageItems.length) % imageItems.length);
        }}
        className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/80 hover:bg-white text-stone-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer shadow-2xs"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setCurrentIndex((prev) => (prev + 1) % imageItems.length);
        }}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/80 hover:bg-white text-stone-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer shadow-2xs"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>

      {/* 底部小圓點導覽列 */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 z-20 pointer-events-none">
        {imageItems.slice(0, 6).map((_, idx) => (
          <div
            key={idx}
            className={`h-1 rounded-full transition-all ${
              idx === currentIndex % 6 ? 'w-3 bg-amber-400' : 'w-1 bg-white/60'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
