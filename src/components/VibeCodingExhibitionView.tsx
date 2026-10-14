import React, { useState, useMemo } from 'react';
import { Question } from '../types';
import { useApp } from '../context/AppContext';
import { shareOrCopyUrl } from '../utils/shareUtils';
import {
  Terminal,
  Sparkles,
  ExternalLink,
  Code2,
  Bookmark,
  Share2,
  ThumbsUp,
  Coins,
  Pin,
  X,
  Search,
  Layers,
  Flame,
  Plus,
  Image as ImageIcon,
  CheckCircle2,
  Eye,
  MessageCircle,
  FolderGit2,
  Cpu
} from 'lucide-react';

interface VibeCodingExhibitionViewProps {
  onSelectApp: (app: Question) => void;
  onOpenCreateApp: () => void;
  onCloseZone: () => void;
  onTogglePin: () => void;
  isPinned: boolean;
}

export const VibeCodingExhibitionView: React.FC<VibeCodingExhibitionViewProps> = ({
  onSelectApp,
  onOpenCreateApp,
  onCloseZone,
  onTogglePin,
  isPinned,
}) => {
  const { questions, toggleBookmarkQuestion, bookmarkedQuestionIds } = useApp();

  const [selectedSubCat, setSelectedSubCat] = useState<string>('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'highest_tips' | 'most_liked' | 'most_views'>('newest');

  // Filter VibeCoding exhibition items
  const vibeCodingApps = useMemo(() => {
    return questions.filter((q) => {
      const isType =
        q.postType === 'vibecoding_app' ||
        q.specialZone === 'vibecoding' ||
        q.tags?.includes('VibeCoding') ||
        q.category === '網站程式';
      return isType;
    });
  }, [questions]);

  // Apply subcategory & search query filtering
  const filteredApps = useMemo(() => {
    return vibeCodingApps.filter((app) => {
      // Subcategory filter
      if (selectedSubCat !== '全部') {
        const matchesCat =
          app.subcategory === selectedSubCat ||
          app.tags?.includes(selectedSubCat) ||
          (selectedSubCat === '網站程式' && (app.category === '網站程式' || app.tags?.includes('網站程式')));
        if (!matchesCat) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchTitle = app.title.toLowerCase().includes(q);
        const matchDesc = app.description.toLowerCase().includes(q);
        const matchTech = app.techArchitecture?.toLowerCase().includes(q) || false;
        const matchPain = app.referencedPainPoint?.toLowerCase().includes(q) || false;
        const matchTags = app.tags?.some((t) => t.toLowerCase().includes(q)) || false;
        if (!matchTitle && !matchDesc && !matchTech && !matchPain && !matchTags) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'highest_tips') {
        return (b.supportPoints || 0) - (a.supportPoints || 0);
      }
      if (sortBy === 'most_liked') {
        return (b.likes || 0) - (a.likes || 0);
      }
      if (sortBy === 'most_views') {
        return (b.views || 0) - (a.views || 0);
      }
      // default newest
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [vibeCodingApps, selectedSubCat, searchQuery, sortBy]);

  const handleShareApp = async (e: React.MouseEvent, app: Question) => {
    e.stopPropagation();
    const url = `${window.location.origin}/question/${app.id}`;
    await shareOrCopyUrl({
      title: app.title,
      text: `來 IdeaX 查看「${app.title}」VibeCoding 創新應用作品！`,
      url,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner Container */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-purple-500/30">
        {/* Background Decorative Glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md flex items-center gap-1.5 border border-purple-300/40">
                <Terminal className="w-3.5 h-3.5 text-purple-200" />
                <span>AI VibeCoding 專屬展場</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 text-purple-200 border border-white/10 backdrop-blur-md">
                獨立分類：網站程式
              </span>
              <button
                onClick={onTogglePin}
                className={`p-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold ${
                  isPinned
                    ? 'bg-purple-500 text-white border border-purple-400'
                    : 'bg-white/10 hover:bg-white/20 text-purple-200 border border-white/10'
                }`}
                title={isPinned ? '取消釘選此展場' : '釘選至首頁主畫面'}
              >
                <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-white' : ''}`} />
                <span>{isPinned ? '已釘選' : '釘選'}</span>
              </button>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5 flex-wrap">
              <span>VibeCoding 創新應用展示場</span>
              <Sparkles className="w-6 h-6 text-purple-300 animate-pulse" />
            </h2>

            <p className="text-xs sm:text-sm text-purple-100/90 leading-relaxed">
              專門展示運用 Vibe Coding 理念與 AI 打造的網站程式、Web 應用、自動化工具與原型作品！歡迎上傳作品封面大圖、0~6 張功能畫面截圖、分享欲解決痛點、技術架構與線上試用網址，獲得社群收藏與點數打賞支持！
            </p>

            <div className="pt-1 flex items-center gap-4 text-xs font-semibold text-purple-200 flex-wrap">
              <span className="flex items-center gap-1">
                <ImageIcon className="w-4 h-4 text-purple-300" />
                <span>封面大圖 + 0~6 張截圖</span>
              </span>
              <span className="flex items-center gap-1">
                <Flame className="w-4 h-4 text-rose-300" />
                <span>引用/解決痛點</span>
              </span>
              <span className="flex items-center gap-1">
                <Cpu className="w-4 h-4 text-indigo-300" />
                <span>技術架構展示</span>
              </span>
              <span className="flex items-center gap-1">
                <Coins className="w-4 h-4 text-amber-300" />
                <span>雙幣點數打賞支持</span>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            <button
              onClick={onOpenCreateApp}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 hover:from-purple-400 hover:to-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-purple-950/40 hover:shadow-purple-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 border border-purple-300/40"
            >
              <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
              <span>發布 VibeCoding 應用</span>
            </button>

            <button
              onClick={onCloseZone}
              className="px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-purple-200 font-bold text-xs backdrop-blur-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>退出展場</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Subcategory Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            {['全部', '網站程式', 'AI 智慧工具', 'Web 應用程式', '自動化工作流', '擴充功能插件'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedSubCat(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedSubCat === cat
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-stone-500">排序：</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs font-bold bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
            >
              <option value="newest">最新發表</option>
              <option value="highest_tips">最高打賞</option>
              <option value="most_liked">最多按讚</option>
              <option value="most_views">最多瀏覽</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋 VibeCoding 作品名稱、技術架構、欲解決痛點或關鍵字..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 text-xs text-stone-800 placeholder-stone-400 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs font-bold cursor-pointer"
            >
              清除
            </button>
          )}
        </div>
      </div>

      {/* App Cards Grid */}
      {filteredApps.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-stone-300 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto">
            <Code2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900">尚無符合條件的 VibeCoding 應用作品</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
              快來發布第一個基於 Vibe Coding 開發的創新應用吧！上傳作品大圖與網站連結，獲得讀者點數支持！
            </p>
          </div>
          <button
            onClick={onOpenCreateApp}
            className="px-4 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs shadow-md hover:bg-purple-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>立即發表 VibeCoding 應用</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredApps.map((app) => {
            const isBookmarked = bookmarkedQuestionIds.includes(app.id);
            const totalTips = app.supportPoints || 0;
            const galleryCount = app.galleryImages?.length || 0;

            return (
              <div
                key={app.id}
                onClick={() => onSelectApp(app)}
                className="group bg-white rounded-2xl border border-stone-200 hover:border-purple-400 p-4 transition-all duration-200 hover:shadow-lg cursor-pointer flex flex-col justify-between relative overflow-hidden space-y-3"
              >
                {/* Hero Cover Image Preview */}
                <div className="relative w-full h-44 rounded-xl overflow-hidden bg-stone-900 border border-stone-100 shrink-0">
                  <img
                    src={app.coverImage || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80'}
                    alt={app.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-black/20" />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-purple-600 text-white shadow-md flex items-center gap-1 border border-purple-400/50">
                      <Terminal className="w-3 h-3 text-purple-200" />
                      <span>{app.subcategory || '網站程式'}</span>
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmarkQuestion(app.id);
                      }}
                      className={`p-1.5 rounded-xl backdrop-blur-md border transition-all cursor-pointer ${
                        isBookmarked
                          ? 'bg-purple-500/90 border-purple-400 text-white shadow-xs'
                          : 'bg-black/40 hover:bg-black/60 border-white/20 text-white'
                      }`}
                      title={isBookmarked ? '取消收藏' : '收藏作品'}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-white' : ''}`} />
                    </button>
                  </div>

                  {/* Bottom Gallery Pill & Demo URL Button */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 text-white">
                    {galleryCount > 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/20 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3 text-purple-300" />
                        <span>{galleryCount} 張圖</span>
                      </span>
                    ) : (
                      <span />
                    )}

                    {app.demoUrl && (
                      <a
                        href={app.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 shadow-md transition-colors flex items-center gap-1 active:scale-95 cursor-pointer"
                        title="開啟線上成果網址"
                      >
                        <ExternalLink className="w-3 h-3 stroke-[2.5]" />
                        <span>前往網址</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Content Details */}
                <div className="space-y-2 flex-1">
                  <h3 className="text-sm sm:text-base font-extrabold text-stone-900 group-hover:text-purple-600 transition-colors line-clamp-2 leading-snug">
                    {app.title}
                  </h3>

                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {app.description}
                  </p>

                  {/* Pain point solved link */}
                  {app.referencedPainPoint && (
                    <div className="p-2 rounded-xl bg-rose-50/80 border border-rose-200/80 text-[11px] text-rose-900 flex items-start gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-1 font-semibold">
                        欲解決痛點：{app.referencedPainPoint}
                      </span>
                    </div>
                  )}

                  {/* Tech Architecture badge */}
                  {app.techArchitecture && (
                    <div className="p-2 rounded-xl bg-purple-50/80 border border-purple-200/80 text-[11px] text-purple-950 flex items-start gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-1 font-mono font-medium">
                        技術架構：{app.techArchitecture}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Bar: Author, Support Points & Share */}
                <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2 text-xs">
                  {/* Author */}
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={app.authorAvatar}
                      alt={app.authorName}
                      className="w-6 h-6 rounded-full object-cover ring-1 ring-stone-200 shrink-0"
                    />
                    <span className="font-bold text-stone-700 text-xs truncate">
                      {app.authorName}
                    </span>
                  </div>

                  {/* Tips & Share */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="px-2 py-0.5 rounded-lg bg-amber-100/90 text-amber-950 border border-amber-300 font-extrabold text-[11px] shadow-2xs flex items-center gap-1"
                      title="打賞支持點數 (雙幣：🪙 點數 / NT$ 現金)"
                    >
                      <Coins className="w-3 h-3 text-amber-600" />
                      <span>🪙 {(totalTips * 10).toLocaleString()} 點</span>
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleShareApp(e, app)}
                      className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                      title="分享作品連結"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
