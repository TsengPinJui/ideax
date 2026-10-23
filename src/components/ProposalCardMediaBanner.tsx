import React, { useState, useEffect } from 'react';
import { Play, Volume2, VolumeX, Images } from 'lucide-react';
import { extractYoutubeVideoId, getYoutubeThumbnailUrl, getYoutubeEmbedUrl } from '../utils/youtubeUtils';

export interface ProposalCardMediaBannerProps {
  youtubeUrl?: string;
  coverMode?: 'custom_image' | 'youtube_video';
  cardHoverMode?: 'video_autoplay' | 'image_carousel';
  coverImage?: string;
  galleryImages?: string[];
  fallbackImage: string;
  onFallbackErrorImage?: string;
  title: string;
  isHovered: boolean;
  heightClass?: string;
  children?: React.ReactNode;
}

export const ProposalCardMediaBanner: React.FC<ProposalCardMediaBannerProps> = ({
  youtubeUrl,
  coverMode = 'custom_image',
  cardHoverMode,
  coverImage,
  galleryImages = [],
  fallbackImage,
  onFallbackErrorImage,
  title,
  isHovered,
  heightClass = 'aspect-video',
  children,
}) => {
  const videoId = extractYoutubeVideoId(youtubeUrl);
  const ytThumb = getYoutubeThumbnailUrl(videoId, 'hqdefault');

  // 整理可用圖片清單（供自訂封面與圖片輪播使用）
  const allImages = React.useMemo(() => {
    const raw = [
      ...(coverImage ? [coverImage] : []),
      ...(galleryImages || []),
    ].filter((u): u is string => Boolean(u && typeof u === 'string' && u.trim()));
    const unique = Array.from(new Set(raw));
    return unique.length > 0 ? unique : [fallbackImage];
  }, [coverImage, galleryImages, fallbackImage]);

  // 決定靜態封面圖：若作者選擇「直接用 YouTube 影片當封面」且有有效 videoId，使用 YouTube 縮圖；否則嚴格使用原設定之自訂封面圖
  const useYoutubeAsCover = coverMode === 'youtube_video' && Boolean(videoId && ytThumb);
  const staticCoverSrc = useYoutubeAsCover && ytThumb ? ytThumb : (coverImage && coverImage.trim()) || allImages[0] || fallbackImage;

  // 決定滑鼠移到卡片時的動態行為：
  // - 若作者明確選擇 'image_carousel'，或沒有 YouTube 影片但有多張圖片 -> 滑鼠移到時圖片輪播
  // - 若作者選擇 'video_autoplay'（或預設有 YouTube 影片且未強制指定圖片輪播） -> 滑鼠移到時自動播放 YouTube 影片
  const effectiveHoverMode: 'video_autoplay' | 'image_carousel' | 'none' = React.useMemo(() => {
    if (cardHoverMode === 'image_carousel') {
      if (allImages.length > 1) return 'image_carousel';
      if (videoId) return 'video_autoplay';
      return 'none';
    }
    if (cardHoverMode === 'video_autoplay') {
      if (videoId) return 'video_autoplay';
      if (allImages.length > 1) return 'image_carousel';
      return 'none';
    }
    // 未指定時：若有 YouTube 影片預設懸停自動播放影片；否則若有多張圖則懸停自動輪播圖片
    if (videoId) return 'video_autoplay';
    if (allImages.length > 1) return 'image_carousel';
    return 'none';
  }, [cardHoverMode, videoId, allImages.length]);

  const [carouselIdx, setCarouselIdx] = useState(0);
  const [isMuted, setIsMuted] = useState(false); // 預設聲音播放 (默認有聲音)

  // 當滑鼠移開時重置輪播索引與預設有聲狀態
  useEffect(() => {
    if (!isHovered) {
      setCarouselIdx(0);
      setIsMuted(false);
      return;
    }

    if (effectiveHoverMode === 'image_carousel' && allImages.length > 1) {
      const timer = window.setInterval(() => {
        setCarouselIdx((prev) => (prev + 1) % allImages.length);
      }, 1300);
      return () => window.clearInterval(timer);
    }
  }, [isHovered, effectiveHoverMode, allImages.length]);

  const isPlayingVideoOnHover = isHovered && effectiveHoverMode === 'video_autoplay' && Boolean(videoId);
  const isRunningCarouselOnHover = isHovered && effectiveHoverMode === 'image_carousel' && allImages.length > 1;

  const displayedImageSrc = isRunningCarouselOnHover
    ? allImages[carouselIdx] || staticCoverSrc
    : staticCoverSrc;

  const embedUrl = isPlayingVideoOnHover
    ? getYoutubeEmbedUrl(videoId, {
        autoplay: true,
        mute: isMuted,
        controls: true,
        loop: true,
      })
    : null;

  return (
    <div className={`relative ${heightClass} bg-stone-900 overflow-hidden border-b border-stone-100 group/img select-none`}>
      {isPlayingVideoOnHover && embedUrl ? (
        <div className="relative w-full h-full bg-black">
          <iframe
            key={`${videoId}-${isMuted ? 'muted' : 'unmuted'}`}
            src={embedUrl}
            title={`${title} - YouTube 預覽`}
            className="w-full h-full object-cover pointer-events-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          {/* 左下角：聲音開關與狀態提示 */}
          <div className="absolute bottom-2.5 left-2.5 z-20 flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted((prev) => !prev);
              }}
              className="px-2 py-1 rounded-lg bg-black/80 hover:bg-black text-white text-[10px] font-bold flex items-center gap-1 shadow-md border border-white/20 cursor-pointer transition-all"
              title={isMuted ? '點擊開啟影片聲音' : '點擊切換靜音'}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-3 h-3 text-amber-400" />
                  <span>靜音播放中 · 點擊開聲音</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3 h-3 text-emerald-400" />
                  <span>聲音播放中</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 自訂封面：整張圖完整顯示（不裁切），比例不同時用同一張圖的模糊放大版補滿兩側 */}
          {!useYoutubeAsCover && (
            <img
              src={displayedImageSrc}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-70 pointer-events-none"
            />
          )}
          <img
            src={displayedImageSrc}
            alt={title}
            className={`relative w-full h-full ${useYoutubeAsCover ? 'object-cover' : 'object-contain'} group-hover/img:scale-[1.03] transition-transform duration-500`}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (useYoutubeAsCover && videoId && target.src.includes('maxresdefault')) {
                target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
              } else if (onFallbackErrorImage && target.src !== onFallbackErrorImage) {
                target.src = onFallbackErrorImage;
              } else if (target.src !== fallbackImage) {
                target.src = fallbackImage;
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent pointer-events-none" />

          {/* 若以 YouTube 作為封面（或滑鼠移入會播影片），顯示精緻的播放提示標記 */}
          {!isHovered && videoId && effectiveHoverMode === 'video_autoplay' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className={`rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 ${
                  useYoutubeAsCover
                    ? 'w-11 h-11 bg-red-600/95 text-white ring-2 ring-white/80'
                    : 'w-9 h-9 bg-black/65 text-white border border-white/50 backdrop-blur-xs'
                }`}
              >
                <Play className="w-4 h-4 fill-white ml-0.5" />
              </div>
            </div>
          )}

          {/* 左下角：動態預覽模式微標記（非懸停時提示，或輪播進行中顯示進度點） */}
          {isRunningCarouselOnHover ? (
            <div className="absolute bottom-2.5 left-2.5 z-20 flex items-center gap-1.5 bg-black/75 backdrop-blur-xs px-2 py-1 rounded-full border border-white/20 pointer-events-none">
              <Images className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] font-mono font-bold text-white">
                {carouselIdx + 1} / {allImages.length}
              </span>
              <div className="flex items-center gap-1 ml-0.5">
                {allImages.slice(0, 6).map((_, idx) => (
                  <span
                    key={idx}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      idx === carouselIdx ? 'bg-amber-400 scale-125' : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1 pointer-events-none">
              {videoId && effectiveHoverMode === 'video_autoplay' ? (
                <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1 border border-white/15">
                  <Play className="w-2.5 h-2.5 fill-red-500 text-red-500" />
                  <span>{useYoutubeAsCover ? 'YouTube 封面 · 移至卡片自動播放' : '含 YouTube 介紹 · 移至卡片播放'}</span>
                </span>
              ) : effectiveHoverMode === 'image_carousel' && allImages.length > 1 ? (
                <span className="px-2 py-0.5 rounded-md bg-black/65 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1 border border-white/15">
                  <Images className="w-2.5 h-2.5 text-amber-300" />
                  <span>{allImages.length} 張圖集 · 移至卡片輪播</span>
                </span>
              ) : null}
            </div>
          )}
        </>
      )}

      {/* 疊加層（分類標籤、收藏與按讚按鈕等） */}
      {children}
    </div>
  );
};
