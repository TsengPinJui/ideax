import React, { useState, useEffect } from 'react';
import {
  X,
  Eye,
  CheckCircle2,
  ExternalLink,
  Code2,
  Lightbulb,
  Sparkles,
  Flame,
  Coins,
  Heart,
  MessageCircle,
  Cpu,
  Layers,
  ShieldCheck,
  Tag,
  Loader2,
  Globe,
  Star,
  ThumbsUp,
  Share2,
  Square,
  List,
  LayoutGrid,
  Terminal,
  Trophy,
  Users,
  Clock,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';
import { Category, MarketViewMode, Question } from '../types';
import { QuestionCard } from './QuestionCard';

export interface PublishEffectPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmPublish: () => void;
  isSubmitting?: boolean;
  postType: 'vibecoding_app' | 'innovation_proposal';
  // Common fields
  title: string;
  description: string;
  category?: Category | string;
  subcategory?: string;
  tags?: string[];
  authorName: string;
  authorAvatar?: string;
  authorTitle?: string;
  bounty?: number;
  coverImage?: string;
  galleryImages?: string[];
  youtubeUrl?: string;
  coverMode?: 'custom_image' | 'youtube_video';
  cardHoverMode?: 'video_autoplay' | 'image_carousel';
  proposalProgressStage?: string;
  // VibeCoding specific
  appName?: string;
  demoUrl?: string;
  techArchitecture?: string;
  referencedPainPoint?: string;
  targetGoal?: string;
  currentVersion?: string;
  selectedVibeCategories?: string[];
  // Innovation proposal specific
  domainTrack?: string;
  milestones?: { title: string; bounty?: number }[];
}

export const PublishEffectPreviewModal: React.FC<PublishEffectPreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirmPublish,
  isSubmitting = false,
  postType,
  title,
  description,
  category = '創新創業',
  subcategory = '資訊科技',
  tags = [],
  authorName,
  authorAvatar,
  authorTitle,
  bounty = 0,
  coverImage,
  galleryImages = [],
  youtubeUrl,
  coverMode = 'custom_image',
  cardHoverMode = 'video_autoplay',
  proposalProgressStage,
  appName = '',
  demoUrl,
  techArchitecture,
  referencedPainPoint,
  targetGoal,
  currentVersion = 'v1.0.0',
  selectedVibeCategories = [],
  domainTrack = '創新創業',
  milestones = [],
}) => {
  const [activePreviewType, setActivePreviewType] = useState<'vibecoding_app' | 'innovation_proposal'>(postType);
  const [previewTab, setPreviewTab] = useState<'card' | 'detail'>('card');
  const [cardViewMode, setCardViewMode] = useState<MarketViewMode>('large');
  const [activeMediaIndex, setActiveMediaIndex] = useState<number>(0);

  // Interactive preview states (收藏 ⭐ / Like ❤️ / 留言按讚 👍 / 版本詳述展開)
  const [previewBookmarked, setPreviewBookmarked] = useState(false);
  const [previewLiked, setPreviewLiked] = useState(false);
  const [previewCommentLiked, setPreviewCommentLiked] = useState(true);
  const [previewSupportPoints, setPreviewSupportPoints] = useState(0);
  const [previewChangelogExpanded, setPreviewChangelogExpanded] = useState(false);

  useEffect(() => {
    setActivePreviewType(postType);
    setActiveMediaIndex(0);
  }, [postType, isOpen]);

  if (!isOpen) return null;

  const isVibeApp = activePreviewType === 'vibecoding_app';
  const effectiveAppName =
    appName.trim() || (isVibeApp ? 'MyVibeApp 智慧助手' : '');
  const displayTitle =
    title.trim() ||
    (isVibeApp
      ? '一站式 AI 自動化工作流與視覺化互動平台（範例預覽標題）'
      : '結合 AI 視覺辨識與智慧媒合之跨領域創新解方提案（範例預覽標題）');
  const displayDesc =
    description.trim() ||
    (isVibeApp
      ? '透過自然語言即可快速生成專案結構、串接即時資料庫並自動部署上線。支援多模態輸入、即時協作白板與一鍵匯出報表，大幅縮短從靈感到產品落地的開發週期。（尚未填寫詳細說明，此為預覽範例文字）'
      : '針對現行產業流程斷點與資訊不對稱痛點，提出一套結合自動化審核、智能推薦與透明分潤機制的創新商業模式。透過標準化モジュール與彈性 API 串接，協助合作夥伴降低 60% 營運溝通成本。（尚未填寫詳細說明，此為預覽範例文字）');
  const displayAvatar =
    authorAvatar ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
  const displayCategory = (
    isVibeApp ? '網站程式' : category || domainTrack || '創新創業'
  ) as Category;
  const displaySubcategory = isVibeApp
    ? selectedVibeCategories[0] || '網站程式'
    : subcategory || '資訊科技';

  const effectiveVibeCategories =
    selectedVibeCategories && selectedVibeCategories.length > 0
      ? selectedVibeCategories
      : ['網站程式', 'AI工具'];

  const defaultTechTags = techArchitecture
    ? techArchitecture
        .split(/[,、+\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 6)
    : isVibeApp
    ? ['React', 'TypeScript', 'Tailwind CSS', 'Gemini API']
    : ['商業模式', 'AI應用', '創新提案', '市場驗證'];

  const effectiveTags =
    tags && tags.length > 0 ? tags : defaultTechTags;

  const allPreviewImages = [
    ...(coverImage ? [coverImage] : []),
    ...(galleryImages || []),
  ].filter(Boolean);

  const effectivePainPoint =
    referencedPainPoint?.trim() ||
    (isVibeApp
      ? '跨工具切換繁瑣、缺乏直覺好上手的視覺化整理介面'
      : '傳統跨部門協作與外部專家媒合耗時且缺乏標準化驗收依據');

  const effectiveTargetGoal =
    targetGoal?.trim() ||
    (isVibeApp
      ? '希望 3 個月內達成 5,000 次線上體驗與 500 位活躍用戶回饋'
      : '於 6 個月內完成 POC 概念驗證並取得 50 家種子客戶導入');

  // Synthesize a Question object so QuestionCard renders 100% authentically across large / list / grid modes
  const previewQuestionObj: Question = {
    id: 'preview-question-demo',
    title: displayTitle,
    description: displayDesc,
    category: displayCategory,
    subcategory: displaySubcategory,
    subcategories: isVibeApp ? effectiveVibeCategories : [displaySubcategory],
    level: 'L0',
    bounty: isVibeApp ? 0 : bounty || 0,
    answersCount: 0,
    authorId: 'preview-author',
    authorName: authorName || '創作者',
    authorAvatar: displayAvatar,
    authorTitle: authorTitle || (isVibeApp ? '獨立開發者' : '提案發起人'),
    createdAt: new Date().toISOString(),
    deadline: '永久',
    status: 'open',
    views: 1,
    likes: previewLiked ? 1 : 0,
    secondedCount: previewLiked ? 1 : 0,
    supportPoints: previewSupportPoints,
    postType: activePreviewType,
    specialZone: isVibeApp ? 'vibecoding' : 'create_ideas',
    appName: isVibeApp ? effectiveAppName : undefined,
    coverImage: coverImage || undefined,
    galleryImages: galleryImages.length > 0 ? galleryImages : undefined,
    youtubeUrl: youtubeUrl || undefined,
    coverMode,
    cardHoverMode,
    proposalProgressStage: proposalProgressStage || undefined,
    techArchitecture: techArchitecture || (isVibeApp ? 'React + TypeScript + Tailwind CSS + Gemini API' : undefined),
    demoUrl: demoUrl || undefined,
    referencedPainPoint: effectivePainPoint,
    targetGoal: effectiveTargetGoal,
    currentVersion: isVibeApp ? currentVersion || 'v1.0.0' : 'v1.0',
    tags: effectiveTags,
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div
        className={`bg-white border-2 ${
          isVibeApp ? 'border-indigo-400/90' : 'border-emerald-400/90'
        } rounded-3xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto text-stone-900`}
      >
        {/* Header Bar */}
        <div
          className={`p-3.5 sm:p-5 border-b border-stone-200 ${
            isVibeApp
              ? 'bg-gradient-to-r from-indigo-50 via-purple-50 to-stone-50'
              : 'bg-gradient-to-r from-emerald-50 via-amber-50/70 to-stone-50'
          } flex flex-col gap-3 shrink-0`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-10 h-10 rounded-2xl ${
                  isVibeApp ? 'bg-indigo-600' : 'bg-emerald-600'
                } text-white flex items-center justify-center shadow-xs font-black shrink-0 transition-colors`}
              >
                <Eye className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full text-white shadow-2xs ${
                      isVibeApp ? 'bg-indigo-600' : 'bg-emerald-600'
                    }`}
                  >
                    {isVibeApp
                      ? '💻 VibeCoding 作品牆 預覽'
                      : '💡 創點子 (創新提案) 預覽'}
                  </span>
                  <span className="text-xs font-bold text-stone-600 hidden sm:inline">
                    前台卡片與完整內頁即時效果確認
                  </span>
                </div>
                <h2 className="text-sm sm:text-lg font-black text-stone-900 truncate mt-0.5">
                  前台展示效果預覽
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-800 hover:bg-white/80 transition-colors cursor-pointer shrink-0"
              title="關閉預覽"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Control Bar: 1. 切換兩種類型提案預覽 + 2. 切換「卡片效果 / 內頁效果」 */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200/70">
            {/* 兩種類型提案切換器 */}
            <div className="inline-flex items-center rounded-xl bg-white/90 p-1 border border-stone-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setActivePreviewType('innovation_proposal')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  !isVibeApp
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>💡 創新提案 (創點子)</span>
                {postType === 'innovation_proposal' && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                      !isVibeApp
                        ? 'bg-white/20 text-white'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    目前選擇
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActivePreviewType('vibecoding_app')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  isVibeApp
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>💻 程式或網站 (作品牆)</span>
                {postType === 'vibecoding_app' && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                      isVibeApp
                        ? 'bg-white/20 text-white'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    目前選擇
                  </span>
                )}
              </button>
            </div>

            {/* 卡片效果 vs 內頁效果 切換器 */}
            <div className="flex items-center gap-2 ml-auto">
              <div className="inline-flex rounded-xl bg-white/90 p-1 border border-stone-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setPreviewTab('card')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    previewTab === 'card'
                      ? isVibeApp
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-emerald-600 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>卡片效果 (3種檢視)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('detail')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    previewTab === 'detail'
                      ? isVibeApp
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-emerald-600 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>完整內頁效果</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notice strip */}
        <div
          className={`px-4 py-2 border-b text-xs font-medium flex flex-wrap items-center justify-between gap-2 ${
            isVibeApp
              ? 'bg-indigo-50/80 border-indigo-200 text-indigo-950'
              : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Sparkles
              className={`w-3.5 h-3.5 shrink-0 ${
                isVibeApp ? 'text-indigo-600' : 'text-emerald-600'
              }`}
            />
            <span>
              {isVibeApp
                ? '【程式或網站】刊登於「VibeCoding 作品牆」，卡片統一採用圖示 ⭐ 收藏 + ❤️ Like，左下角固定顯示藍色作品名稱徽章。'
                : '【創新提案】刊登於「創點子 (創新提案)」專區，卡片統一採用圖示 ⭐ 收藏 + ❤️ Like，支援引用痛點雙向關聯與點數支持。'}
            </span>
          </div>
          { (!title.trim() || !description.trim()) && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
              尚未填寫之欄位以範例文字預覽
            </span>
          )}
        </div>

        {/* Scrollable Preview Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 bg-stone-100/80 flex-1">
          {previewTab === 'card' ? (
            /* ========================================================
               TAB 1: CARD VIEW PREVIEW (卡片展示效果：支援大卡片 / 條列式 / 小卡片 + 專區封面卡)
               ======================================================== */
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* 1. 檢視模式切換列 (大卡片 / 條列式 / 小卡片) */}
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isVibeApp ? 'bg-indigo-600' : 'bg-emerald-600'
                    }`}
                  />
                  <span className="text-xs sm:text-sm font-black text-stone-900">
                    {isVibeApp
                      ? '① 看板與問題市場卡片預覽（可切換 3 種檢視模式）'
                      : '① 創點子專區與問題市場卡片預覽（可切換 3 種檢視模式）'}
                  </span>
                </div>

                <div className="inline-flex items-center gap-1 rounded-xl bg-stone-100 p-1 border border-stone-200">
                  <button
                    type="button"
                    onClick={() => setCardViewMode('large')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      cardViewMode === 'large'
                        ? isVibeApp
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>大卡片</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardViewMode('list')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      cardViewMode === 'list'
                        ? isVibeApp
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>條列式</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardViewMode('grid')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      cardViewMode === 'grid'
                        ? isVibeApp
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>小卡片</span>
                  </button>
                </div>
              </div>

              {/* 真實 QuestionCard 元件渲染 (大卡片 / 條列式 / 小卡片) */}
              <div
                className={
                  cardViewMode === 'grid'
                    ? 'max-w-xs mx-auto'
                    : cardViewMode === 'large'
                    ? 'max-w-xl mx-auto'
                    : 'max-w-3xl mx-auto'
                }
              >
                <QuestionCard
                  question={previewQuestionObj}
                  solutionsCount={0}
                  discussionsCount={2}
                  viewMode={cardViewMode}
                  onClick={() => setPreviewTab('detail')}
                />
                <p className="text-center text-[11px] text-stone-500 mt-2">
                  ▲ 點擊上方卡片可直接切換至「完整內頁效果」預覽（右上角回饋按鈕統一僅顯示圖示 ⭐ 與 ❤️）
                </p>
              </div>

              {/* 2. 專區特色視覺卡片預覽 (VibeCoding 作品牆封面卡 vs 創點子創新提案專區卡) */}
              <div className="pt-2 border-t border-stone-200/80 space-y-3">
                <div className="text-center">
                  <span className="text-xs font-black text-stone-600">
                    {isVibeApp
                      ? '── ② VibeCoding 作品牆 封面視覺卡效果 ──'
                      : '── ② 創點子 (創新提案) 專區焦點卡片效果 ──'}
                  </span>
                </div>

                {isVibeApp ? (
                  /* VibeCoding 軟體與網站作品牆 視覺大卡 */
                  <div className="max-w-md mx-auto bg-white rounded-3xl border-2 border-indigo-200 hover:border-indigo-400 shadow-md overflow-hidden transition-all duration-300">
                    {/* Card Cover */}
                    <div className="relative h-48 sm:h-52 bg-gradient-to-tr from-indigo-950 via-indigo-800 to-purple-800 overflow-hidden">
                      {coverImage ? (
                        <img
                          src={coverImage}
                          alt={displayTitle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-white/90 p-4 text-center">
                          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-2 shadow-xs border border-white/20">
                            <Code2 className="w-7 h-7 text-indigo-200" />
                          </div>
                          <div className="font-black text-sm text-white/95">
                            {effectiveAppName}
                          </div>
                          <div className="text-[11px] text-white/70 mt-0.5">
                            可於表單上傳封面大圖（單張上限 2MB）自訂作品視覺圖
                          </div>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                      {/* Top Badges + Icon-only ⭐ & ❤️ */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {effectiveVibeCategories.map((vc) => (
                            <span
                              key={vc}
                              className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-white/95 text-stone-900 border border-white/40 shadow-xs"
                            >
                              {vc}
                            </span>
                          ))}
                          {currentVersion && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-purple-200 border border-purple-300/40">
                              {currentVersion}
                            </span>
                          )}
                        </div>

                        {/* 卡片上僅顯示圖示 ⭐ + ❤️ */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewBookmarked(!previewBookmarked)}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                              previewBookmarked
                                ? 'bg-amber-400 text-stone-950 border-amber-300 shadow-xs'
                                : 'bg-black/50 hover:bg-black/70 text-white border-white/25 backdrop-blur-md'
                            }`}
                            title="⭐ 收藏"
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                previewBookmarked ? 'fill-stone-950 text-stone-950' : 'text-amber-300'
                              }`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewLiked(!previewLiked)}
                            className={`h-7 px-2 rounded-lg flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                              previewLiked
                                ? 'bg-rose-500 text-white border-rose-400 shadow-xs'
                                : 'bg-black/50 hover:bg-black/70 text-white border-white/25 backdrop-blur-md'
                            }`}
                            title="❤️ Like（軟體刊登）"
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${
                                previewLiked ? 'fill-white text-white' : 'fill-rose-400 text-rose-400'
                              }`}
                            />
                            {previewLiked && <span className="text-[11px] font-mono font-black">1</span>}
                          </button>
                        </div>
                      </div>

                      {/* Bottom-left App Name tag (藍色徽章固定於左下角) */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white drop-shadow-sm">
                        <span className="inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-lg bg-blue-600 text-white border border-blue-400/80 shadow-md">
                          <Code2 className="w-3.5 h-3.5 text-blue-100" />
                          <span>{effectiveAppName}</span>
                        </span>

                        {demoUrl ? (
                          <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1 bg-black/50 px-2.5 py-1 rounded-lg backdrop-blur-xs border border-emerald-400/30">
                            <span>可線上體驗</span>
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600/90 text-white">
                            軟體作品
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 sm:p-5 space-y-3">
                      <h3 className="font-black text-stone-900 text-base leading-snug line-clamp-2">
                        {displayTitle}
                      </h3>
                      <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                        {displayDesc}
                      </p>

                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {defaultTechTags.map((tech, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-semibold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/80"
                          >
                            #{tech}
                          </span>
                        ))}
                      </div>

                      {effectivePainPoint && (
                        <div className="p-2 rounded-xl bg-rose-50/80 border border-rose-200 text-xs text-rose-900 flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span className="truncate font-medium">
                            解決痛點：{effectivePainPoint}
                          </span>
                        </div>
                      )}

                      <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={displayAvatar}
                            alt={authorName}
                            className="w-6 h-6 rounded-full object-cover border border-stone-200 shrink-0"
                          />
                          <span className="text-xs font-bold text-stone-800 truncate">
                            {authorName}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 text-stone-500 text-xs font-mono shrink-0">
                          <span className="flex items-center gap-1 text-rose-600 font-bold">
                            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                            <span>{previewLiked ? 1 : 0}</span>
                          </span>
                          <span className="flex items-center gap-1 text-amber-700 font-bold">
                            <Coins className="w-3.5 h-3.5 text-amber-500" />
                            <span>{previewSupportPoints}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3.5 h-3.5 text-indigo-500" />
                            <span>2</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 創點子 (創新提案) 專區焦點卡片 */
                  <div className="max-w-lg mx-auto bg-white rounded-3xl border-2 border-emerald-200 hover:border-emerald-400 shadow-md overflow-hidden transition-all duration-300">
                    {coverImage && (
                      <div className="relative h-44 bg-stone-900 overflow-hidden border-b border-emerald-100">
                        <img
                          src={coverImage}
                          alt={displayTitle}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <span className="absolute bottom-2.5 left-3 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                          💡 創點子 (創新提案)
                        </span>
                      </div>
                    )}

                    <div className="p-4 sm:p-5 space-y-3.5">
                      {/* Top Row: Track Badge + Icon-only ⭐ & ❤️ */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                            💡 創新提案
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                            {displayCategory} · {displaySubcategory}
                          </span>
                        </div>

                        {/* 卡片上僅顯示圖示 ⭐ + ❤️ */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewBookmarked(!previewBookmarked)}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              previewBookmarked
                                ? 'bg-amber-50 text-amber-600 border-amber-300 shadow-2xs'
                                : 'bg-stone-50 text-stone-400 border-stone-200 hover:text-amber-500'
                            }`}
                            title="⭐ 收藏"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                previewBookmarked ? 'fill-amber-400 text-amber-500' : ''
                              }`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewLiked(!previewLiked)}
                            className={`px-2 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                              previewLiked
                                ? 'bg-rose-500 text-white border-rose-500 shadow-2xs'
                                : 'bg-rose-50/70 text-rose-600 border-rose-200 hover:bg-rose-100'
                            }`}
                            title="❤️ Like（創新提案）"
                          >
                            <Heart
                              className={`w-4 h-4 ${
                                previewLiked
                                  ? 'fill-white text-white'
                                  : 'fill-rose-500 text-rose-500'
                              }`}
                            />
                            {previewLiked && (
                              <span className="text-xs font-mono font-black">1</span>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Title & Summary */}
                      <div>
                        <h3 className="font-black text-stone-900 text-base sm:text-lg leading-snug line-clamp-2">
                          {displayTitle}
                        </h3>
                        <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed mt-1.5">
                          {displayDesc}
                        </p>
                      </div>

                      {/* Referenced Pain Point & Target Goal */}
                      <div className="space-y-1.5">
                        {effectivePainPoint && (
                          <div className="p-2.5 rounded-xl bg-rose-50/80 border border-rose-200/90 text-xs text-rose-950 flex items-center gap-2">
                            <Flame className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span className="truncate font-bold">
                              解決痛點：{effectivePainPoint}
                            </span>
                          </div>
                        )}
                        {effectiveTargetGoal && (
                          <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/90 text-xs text-emerald-950 flex items-center gap-2">
                            <Trophy className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate font-bold">
                              預期目標：{effectiveTargetGoal}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {effectiveTags.map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>

                      {/* Footer */}
                      <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={displayAvatar}
                            alt={authorName}
                            className="w-6 h-6 rounded-full object-cover border border-stone-200 shrink-0"
                          />
                          <span className="text-xs font-bold text-stone-800 truncate">
                            {authorName}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                            ♾️ 永久刊登
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs font-mono shrink-0">
                          <span className="flex items-center gap-1 text-amber-700 font-black">
                            <Coins className="w-3.5 h-3.5 text-amber-500" />
                            <span>{previewSupportPoints} 點</span>
                          </span>
                          <span className="flex items-center gap-1 text-stone-500">
                            <MessageCircle className="w-3.5 h-3.5 text-stone-400" />
                            <span>2</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ========================================================
               TAB 2: DETAIL VIEW PREVIEW (完整內頁效果：依兩種類型提案自適應)
               ======================================================== */
            <div className="max-w-4xl mx-auto space-y-5">
              {isVibeApp ? (
                /* --------------------------------------------------------
                   TYPE A DETAIL: 程式或網站 (VibeCoding 軟體與網站作品牆 完整內頁)
                   -------------------------------------------------------- */
                <div className="space-y-5">
                  {/* Top Bar */}
                  <div className="bg-white rounded-2xl px-4 py-3 border border-indigo-200 shadow-2xs flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-stone-600">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 font-black flex items-center gap-1">
                        <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                        <span>VibeCoding 作品牆</span>
                      </span>
                      <span>/</span>
                      <span className="text-stone-900 font-black truncate max-w-[200px]">
                        {effectiveAppName}
                      </span>
                    </div>

                    {/* 互動按鈕列：⭐ 收藏 + ❤️ Like + 🪙 點數支持 + 分享 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setPreviewBookmarked(!previewBookmarked)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          previewBookmarked
                            ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-amber-50'
                        }`}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            previewBookmarked ? 'fill-amber-400 text-amber-500' : 'text-stone-400'
                          }`}
                        />
                        <span>{previewBookmarked ? '已收藏' : '收藏'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewLiked(!previewLiked)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                          previewLiked
                            ? 'bg-rose-500 text-white border-rose-500 shadow-2xs'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            previewLiked ? 'fill-white text-white' : 'fill-rose-500 text-rose-500'
                          }`}
                        />
                        <span>Like</span>
                        <span className="font-mono">({previewLiked ? 1 : 0})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewSupportPoints((p) => p + 100)}
                        className="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Coins className="w-3.5 h-3.5 text-amber-600" />
                        <span>點數支持 ({previewSupportPoints})</span>
                      </button>

                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center gap-1 shadow-2xs"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>分享作品</span>
                      </button>
                    </div>
                  </div>

                  {/* Hero Showcase Section */}
                  <div className="bg-gradient-to-br from-indigo-950 via-stone-900 to-purple-950 text-white rounded-3xl p-5 sm:p-8 border border-indigo-500/40 shadow-xl space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-600 text-white text-xs font-black border border-blue-400 shadow-xs">
                          <Code2 className="w-3.5 h-3.5" />
                          <span>{effectiveAppName}</span>
                        </span>
                        {effectiveVibeCategories.map((cat) => (
                          <span
                            key={cat}
                            className="px-2.5 py-1 rounded-xl bg-white/10 text-indigo-100 border border-white/15 text-xs font-bold"
                          >
                            {cat}
                          </span>
                        ))}
                        {currentVersion && (
                          <span className="px-2.5 py-1 rounded-xl bg-purple-500/20 text-purple-200 border border-purple-400/30 font-mono text-xs font-bold">
                            {currentVersion}
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                        ♾️ 預設永久刊登
                      </span>
                    </div>

                    <h1 className="text-xl sm:text-3xl font-black tracking-tight leading-snug text-white">
                      {displayTitle}
                    </h1>

                    {/* Author & Demo CTA Row */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/10">
                      <div className="flex items-center gap-3">
                        <img
                          src={displayAvatar}
                          alt={authorName}
                          className="w-10 h-10 rounded-full object-cover border-2 border-indigo-400/60"
                        />
                        <div>
                          <div className="text-sm font-black text-white flex items-center gap-2">
                            <span>{authorName}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                              軟體創作者
                            </span>
                          </div>
                          <div className="text-xs text-stone-400">
                            {authorTitle || 'VibeCoding 開發者'} · 剛剛發布
                          </div>
                        </div>
                      </div>

                      {demoUrl ? (
                        <a
                          href={demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all"
                        >
                          <Globe className="w-4 h-4" />
                          <span>立即開啟網站 / 體驗作品</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="px-4 py-2 rounded-xl bg-white/10 text-stone-300 text-xs font-bold border border-white/15">
                          （填寫 Demo 連結後將在此顯示「立即開啟網站」按鈕）
                        </span>
                      )}
                    </div>

                    {/* Interactive Cover & Gallery Viewer */}
                    {allPreviewImages.length > 0 ? (
                      <div className="space-y-3 pt-2">
                        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black/50 border border-white/15 shadow-lg">
                          <img
                            src={allPreviewImages[activeMediaIndex] || allPreviewImages[0]}
                            alt="作品畫面預覽"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 text-white text-xs font-mono">
                            畫面預覽 {activeMediaIndex + 1} / {allPreviewImages.length}
                          </span>
                        </div>

                        {allPreviewImages.length > 1 && (
                          <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {allPreviewImages.map((img, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setActiveMediaIndex(i)}
                                className={`relative w-24 aspect-video rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer transition-all ${
                                  activeMediaIndex === i
                                    ? 'border-amber-400 scale-105'
                                    : 'border-white/20 opacity-60 hover:opacity-100'
                                }`}
                              >
                                <img src={img} alt="" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {/* Description & Tech Stack Cards */}
                  <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-7 space-y-5 shadow-2xs">
                    <div className="space-y-2">
                      <h3 className="text-sm sm:text-base font-black text-stone-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        <span>作品詳細介紹與核心亮點</span>
                      </h3>
                      <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 text-stone-800 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-medium">
                        {displayDesc}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-2">
                        <div className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                          <Cpu className="w-4 h-4 text-indigo-600" />
                          <span>技術架構與開發模型</span>
                        </div>
                        <p className="text-xs text-stone-700 font-mono leading-relaxed">
                          {techArchitecture || 'React + TypeScript + Tailwind CSS + Gemini API'}
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {effectiveTags.map((t, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-indigo-800 border border-indigo-200"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                        <div className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                          <Trophy className="w-4 h-4 text-emerald-600" />
                          <span>希望達成的目標（下載量 / 里程碑）</span>
                        </div>
                        <p className="text-xs text-stone-800 font-medium leading-relaxed">
                          {effectiveTargetGoal}
                        </p>
                      </div>
                    </div>

                    {/* Referenced Pain Point */}
                    <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                          <Flame className="w-4 h-4 text-rose-600" />
                          <span>此作品解決之真實痛點（雙向互聯）</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                          痛點許願池
                        </span>
                      </div>
                      <p className="text-xs text-stone-800 font-bold">{effectivePainPoint}</p>
                    </div>

                    {/* Version Changelog Preview */}
                    <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200/80 space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-purple-600" />
                          <span>版本更新紀錄 (Changelog)</span>
                        </span>
                        <span className="text-[11px] font-mono font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                          {currentVersion || 'v1.0.0'}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-purple-200/80 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-mono text-[11px] font-bold">
                              {currentVersion || 'v1.0.0'}
                            </span>
                            <span className="text-[11px] font-bold text-emerald-700">最新</span>
                            <span className="text-xs font-bold text-stone-900">
                              首次於 VibeCoding 作品牆 發布上架
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPreviewChangelogExpanded(!previewChangelogExpanded)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-50 hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 text-[11px] font-bold text-emerald-700 transition-colors cursor-pointer"
                          >
                            <span>{previewChangelogExpanded ? '收合內容詳述' : '展開內容詳述'}</span>
                          </button>
                        </div>
                        {previewChangelogExpanded && (
                          <div className="pt-2 border-t border-stone-100 text-xs text-stone-600 leading-relaxed">
                            已完成核心功能架構與線上 Demo 部署，開放全站會員試用、留言回饋與點數支持（往後更新版本時，更新摘要將直接顯示於上方標題列，內容詳述則預設收合於此處供點擊展開）。
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* --------------------------------------------------------
                   TYPE B DETAIL: 創新提案 (創點子 創新提案專頁 完整內頁)
                   -------------------------------------------------------- */
                <div className="space-y-5">
                  {/* Top Navigation & Actions Bar */}
                  <div className="bg-white rounded-2xl px-4 py-3 border border-emerald-200 shadow-2xs flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-stone-600">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-black flex items-center gap-1">
                        <Lightbulb className="w-3.5 h-3.5 text-emerald-600" />
                        <span>創點子 (創新提案)</span>
                      </span>
                      <span>/</span>
                      <span className="text-stone-900 font-black truncate max-w-[220px]">
                        {displayTitle}
                      </span>
                    </div>

                    {/* 互動按鈕列：⭐ 收藏 + ❤️ Like + 🪙 打賞支持 + 分享提案 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setPreviewBookmarked(!previewBookmarked)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          previewBookmarked
                            ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-amber-50'
                        }`}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            previewBookmarked ? 'fill-amber-400 text-amber-500' : 'text-stone-400'
                          }`}
                        />
                        <span>{previewBookmarked ? '已收藏' : '收藏'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewLiked(!previewLiked)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                          previewLiked
                            ? 'bg-rose-500 text-white border-rose-500 shadow-2xs'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            previewLiked ? 'fill-white text-white' : 'fill-rose-500 text-rose-500'
                          }`}
                        />
                        <span>Like</span>
                        <span className="font-mono">({previewLiked ? 1 : 0})</span>
                      </button>

                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-xl bg-amber-400 text-stone-950 text-xs font-black flex items-center gap-1 shadow-2xs"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>分享提案</span>
                      </button>
                    </div>
                  </div>

                  {/* 1. 提案主標題與作者資訊卡 */}
                  <div className="bg-white rounded-3xl p-5 sm:p-7 border border-stone-200 shadow-2xs space-y-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black">
                        💡 創新提案
                      </span>
                      <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold">
                        {displayCategory} · {displaySubcategory}
                      </span>
                      {bounty > 0 && (
                        <span className="px-3 py-1 rounded-full bg-amber-500 text-stone-950 text-xs font-mono font-black">
                          懸賞 NT$ {bounty.toLocaleString()}
                        </span>
                      )}
                      <span className="ml-auto text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                        ♾️ 預設永久刊登
                      </span>
                    </div>

                    <h1 className="text-xl sm:text-3xl font-black text-stone-900 leading-snug tracking-tight">
                      {displayTitle}
                    </h1>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-100">
                      <div className="flex items-center gap-3">
                        <img
                          src={displayAvatar}
                          alt={authorName}
                          className="w-10 h-10 rounded-full object-cover border border-stone-200"
                        />
                        <div>
                          <div className="text-sm font-black text-stone-900 flex items-center gap-2">
                            <span>{authorName}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                              創新提案人
                            </span>
                          </div>
                          <div className="text-xs text-stone-400">
                            {authorTitle || '領域創新者'} · 剛剛發布
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono text-stone-500">
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4 text-rose-500 fill-rose-500/30" />
                          <strong className="text-stone-800">{previewLiked ? 1 : 0}</strong> Like
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4 text-amber-600" />
                          <strong className="text-stone-800">2</strong> 則留言
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. ［點數支持］橫條 (與 ProposalDetailFullPage 完全同步) */}
                  <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 rounded-3xl p-5 sm:p-6 border-2 border-amber-300 shadow-xs space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <div className="font-black text-stone-900 text-sm sm:text-base flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-600" />
                          <span>點數支持你認同的創新提案</span>
                        </div>
                        <div className="text-xs text-stone-600 mt-0.5">
                          為優質創新提案表達認同與期待，推升點子排名與人氣指數
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-amber-900 text-xl sm:text-2xl">
                          {previewSupportPoints.toLocaleString()}
                        </span>
                        <span className="text-xs text-amber-950 font-bold ml-1.5">點支持</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-stone-600 bg-white/80 px-3.5 py-2 rounded-xl border border-amber-200/70">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-stone-500" />
                        <span>
                          支持人次：
                          <strong className="text-stone-900 font-mono">
                            {previewSupportPoints > 0 ? 1 : 0}
                          </strong>{' '}
                          人
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewSupportPoints((p) => p + 100)}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                      >
                        <Coins className="w-3.5 h-3.5 text-stone-950" />
                        <span>給予點數支持 (+100預覽)</span>
                      </button>
                    </div>
                  </div>

                  {/* 3. 引用痛點洞察 & 希望達成的目標 雙欄重點卡 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-3xl bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-white border border-amber-300/90 shadow-2xs">
                    <div className="p-3.5 rounded-2xl bg-white border border-rose-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                          <Flame className="w-4 h-4 text-rose-600" />
                          <span>此提案針對之痛點洞察（引用痛點）</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                          痛點許願池
                        </span>
                      </div>
                      <p className="text-xs text-stone-800 font-bold leading-relaxed">
                        {effectivePainPoint}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white border border-emerald-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                          <Trophy className="w-4 h-4 text-emerald-600" />
                          <span>［希望達成的目標］</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          驗證指標
                        </span>
                      </div>
                      <p className="text-xs text-stone-800 font-bold leading-relaxed">
                        {effectiveTargetGoal}
                      </p>
                    </div>
                  </div>

                  {/* 4. 封面與圖片圖集展示 (若有上傳圖片) */}
                  {allPreviewImages.length > 0 && (
                    <div className="bg-white rounded-3xl p-5 border border-stone-200 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-black text-stone-900 flex items-center gap-1.5">
                          <ImageIcon className="w-4 h-4 text-emerald-600" />
                          <span>提案架構圖與視覺展示 ({allPreviewImages.length} 張)</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {allPreviewImages.map((img, i) => (
                          <div
                            key={i}
                            className="aspect-video rounded-2xl overflow-hidden border border-stone-200 bg-stone-100"
                          >
                            <img src={img} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5. 提案核心摘要與企劃詳細說明 */}
                  <div className="bg-white rounded-3xl p-5 sm:p-7 border border-stone-200 space-y-4 shadow-2xs">
                    <h3 className="text-sm sm:text-base font-black text-stone-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span>提案核心摘要與創新解方說明</span>
                    </h3>
                    <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 text-stone-800 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-medium">
                      {displayDesc}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <Tag className="w-3.5 h-3.5 text-stone-400 mr-1" />
                      {effectiveTags.map((t, i) => (
                        <span
                          key={i}
                          className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>

                    {demoUrl && (
                      <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="text-xs font-bold text-stone-800 truncate">
                            補充參考資料 / 外部連結：{demoUrl}
                          </span>
                        </div>
                        <a
                          href={demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold shrink-0 flex items-center gap-1"
                        >
                          <span>開啟連結</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 留言與討論預覽區塊 (共通：展示留言採用 👍 大拇指按讚) */}
              <div className="bg-white rounded-3xl p-5 border border-stone-200 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-black text-stone-900 flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-blue-600" />
                    <span>留言與討論區效果預覽（留言統一採用 👍 大拇指按讚）</span>
                  </h4>
                  <span className="text-[11px] text-stone-400 font-mono">預覽範例留言</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 font-black text-xs flex items-center justify-center shrink-0 border border-amber-300">
                      陳
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-900">陳顧問 · 產品架構師</span>
                        <span className="text-[10px] text-stone-400">1 分鐘前</span>
                      </div>
                      <p className="text-xs text-stone-700 leading-relaxed">
                        {isVibeApp
                          ? '介面設計非常直覺！期待後續版本加入匯出報表與 API Webhook 串接功能！'
                          : '這個切入點非常有商業可行性，特別是針對痛點的自動化媒合機制，很值得進一步實證！'}
                      </p>
                    </div>
                  </div>

                  {/* 留言回饋：統一使用大拇指 👍 按讚 */}
                  <button
                    type="button"
                    onClick={() => setPreviewCommentLiked(!previewCommentLiked)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 shrink-0 transition-all cursor-pointer ${
                      previewCommentLiked
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white text-stone-600 border-stone-200 hover:bg-blue-50'
                    }`}
                    title="👍 按讚（留言與 L0 討論）"
                  >
                    <ThumbsUp
                      className={`w-3.5 h-3.5 ${
                        previewCommentLiked ? 'fill-white text-white' : 'text-blue-600'
                      }`}
                    />
                    <span className="font-mono">{previewCommentLiked ? 6 : 5}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-5 border-t border-stone-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
          >
            ← 返回修改內容
          </button>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={() => setPreviewTab(previewTab === 'card' ? 'detail' : 'card')}
              className="px-4 py-2.5 rounded-xl border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs sm:text-sm font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Eye className="w-4 h-4 text-indigo-600" />
              <span>{previewTab === 'card' ? '切換看完整內頁效果' : '切換看 3 種卡片效果'}</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={onConfirmPublish}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 text-xs sm:text-sm font-black shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
                  <span>正在刊登發布中...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-stone-950" />
                  <span>確認效果無誤，正式送出刊登</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
