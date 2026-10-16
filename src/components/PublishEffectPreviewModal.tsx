import React, { useState } from 'react';
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
  ArrowRight,
  ShieldCheck,
  Tag,
  Loader2,
  User,
  Globe,
  ChevronRight,
  Smartphone,
  Laptop,
} from 'lucide-react';
import { Category } from '../types';

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
  subcategory = '一般專案',
  tags = [],
  authorName,
  authorAvatar,
  authorTitle,
  bounty = 0,
  coverImage,
  galleryImages = [],
  appName = '',
  demoUrl,
  techArchitecture,
  referencedPainPoint,
  targetGoal,
  currentVersion = 'v1.0.0',
  selectedVibeCategories = [],
  domainTrack = '資通訊',
  milestones = [],
}) => {
  const [previewTab, setPreviewTab] = useState<'card' | 'detail'>('card');
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');

  if (!isOpen) return null;

  const isVibeApp = postType === 'vibecoding_app';
  const effectiveAppName = appName.trim() || (isVibeApp ? '我的作品' : '');
  const displayTitle = title.trim() || '（尚未填寫標題）';
  const displayDesc = description.trim() || '（尚未填寫詳細內容說明）';
  const displayAvatar = authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

  const defaultTechTags = techArchitecture
    ? techArchitecture.split(/[,、\s]+/).filter(Boolean).slice(0, 5)
    : isVibeApp ? ['React', 'TypeScript', 'TailwindCSS', 'AI Agent'] : ['AI應用', '市場創新'];

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border-2 border-indigo-400/80 rounded-3xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto text-stone-900">
        
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-amber-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs font-black shrink-0">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-2xs">
                  {isVibeApp ? '🚀 軟體程式展場預覽' : '💡 創新解方提案預覽'}
                </span>
                <span className="text-xs font-bold text-stone-600">
                  前台即時效果確認
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-stone-900 truncate mt-0.5">
                刊登送出前效果預覽
              </h2>
            </div>
          </div>

          {/* View Mode Switchers & Close */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Card vs Detail Tab */}
            <div className="inline-flex rounded-xl bg-white/90 p-1 border border-stone-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setPreviewTab('card')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                  previewTab === 'card'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>卡片效果</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('detail')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                  previewTab === 'detail'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>內頁效果</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
              title="關閉預覽"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notice strip */}
        <div className="px-4 py-2 bg-amber-50/80 border-b border-amber-200 text-xs text-amber-900 font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              {isVibeApp
                ? '此為軟體程式刊登於「VibeCoding專區」與列表的實際呈現樣式，作品名稱將以藍色徽章固定於卡片左下角。'
                : '此為創新提案刊登後的實際展示外觀，包含領域標籤、核心摘要與懸賞支持資訊。'}
            </span>
          </div>
          <span className="text-[11px] font-bold text-amber-700 shrink-0">
            確認無誤後點選右下角「確認刊登」
          </span>
        </div>

        {/* Scrollable Preview Body */}
        <div className="p-4 sm:p-7 overflow-y-auto space-y-6 bg-stone-100/70 flex-1">
          {previewTab === 'card' ? (
            /* ========================================================
               TAB 1: CARD VIEW PREVIEW (卡片展示效果)
               ======================================================== */
            <div className="max-w-md mx-auto space-y-4">
              <div className="text-center">
                <span className="text-xs font-bold text-stone-500">
                  ── 列表大卡片展示樣式 ──
                </span>
              </div>

              {/* The Actual Card Replica */}
              <div className="bg-white rounded-3xl border border-stone-200 hover:border-indigo-400 shadow-md overflow-hidden transition-all duration-300">
                {/* Card Cover */}
                <div className="relative h-48 sm:h-52 bg-gradient-to-tr from-indigo-900 via-indigo-700 to-purple-800 overflow-hidden">
                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt={displayTitle}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white/90 p-4 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-2 shadow-xs border border-white/20">
                        {isVibeApp ? (
                          <Code2 className="w-7 h-7 text-indigo-200" />
                        ) : (
                          <Lightbulb className="w-7 h-7 text-amber-300" />
                        )}
                      </div>
                      <div className="font-black text-sm text-white/95">{effectiveAppName || displayTitle}</div>
                      <div className="text-[11px] text-white/70 mt-0.5">點擊上傳封面可自訂視覺圖</div>
                    </div>
                  )}

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-white/95 text-stone-900 border border-white/40 shadow-xs">
                        {isVibeApp ? (selectedVibeCategories[0] || '網站程式') : domainTrack}
                      </span>
                      {isVibeApp && currentVersion && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-purple-200 border border-purple-300/40">
                          {currentVersion}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full backdrop-blur-md shadow-xs ${
                        isVibeApp ? 'bg-indigo-600/90 text-white' : 'bg-emerald-600/90 text-white'
                      }`}>
                        {isVibeApp ? 'VibeCoding' : '創點子提案'}
                      </span>
                    </div>
                  </div>

                  {/* Bottom-left App Name tag (藍色底色突出展示) */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white drop-shadow-sm">
                    {isVibeApp && effectiveAppName ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-lg bg-blue-600 text-white border border-blue-400/80 shadow-md">
                        <Code2 className="w-3.5 h-3.5 text-blue-100" />
                        <span>{effectiveAppName}</span>
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-300">
                        {domainTrack} 創新解方
                      </span>
                    )}

                    {demoUrl && (
                      <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-xs">
                        <span>可線上體驗</span>
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 sm:p-5 space-y-3">
                  {/* Title */}
                  <h3 className="font-black text-stone-900 text-base leading-snug line-clamp-2">
                    {displayTitle}
                  </h3>

                  {/* One-line pitch / short desc */}
                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {displayDesc}
                  </p>

                  {/* Tech stack / Tags pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {defaultTechTags.map((tech, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  {/* Solved Pain Point Tag */}
                  {referencedPainPoint && (
                    <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span className="truncate">解決痛點：{referencedPainPoint}</span>
                    </div>
                  )}

                  {/* Author & Interactions Footer */}
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
                      {authorTitle && (
                        <span className="text-[10px] text-stone-400 truncate hidden xs:inline">
                          · {authorTitle}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 text-stone-400 text-xs font-mono shrink-0">
                      <span className="flex items-center gap-1 hover:text-rose-500">
                        <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                        <span>0</span>
                      </span>
                      <span className="flex items-center gap-1 hover:text-amber-500">
                        <Coins className="w-3.5 h-3.5 text-amber-500" />
                        <span>0</span>
                      </span>
                      <span className="flex items-center gap-1 hover:text-indigo-500">
                        <MessageCircle className="w-3.5 h-3.5 text-indigo-500" />
                        <span>0</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================
               TAB 2: DETAIL VIEW PREVIEW (完整內頁效果)
               ======================================================== */
            <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-8 space-y-6 shadow-sm">
              {/* Header Box */}
              <div className="space-y-3 pb-5 border-b border-stone-100">
                <div className="flex items-center gap-2 flex-wrap">
                  {isVibeApp ? (
                    <span className="inline-flex items-center gap-1 text-xs font-black px-3 py-1 rounded-xl bg-blue-600 text-white shadow-2xs">
                      <Code2 className="w-3.5 h-3.5" />
                      <span>{effectiveAppName || '網站程式'}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-black px-3 py-1 rounded-xl bg-emerald-600 text-white shadow-2xs">
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>創新提案</span>
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold border border-stone-200">
                    {isVibeApp ? (selectedVibeCategories.join('、') || 'AI Agent 助手') : domainTrack}
                  </span>
                  {currentVersion && isVibeApp && (
                    <span className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 font-mono text-xs font-bold">
                      版本：{currentVersion}
                    </span>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-stone-900 leading-snug">
                  {displayTitle}
                </h1>

                {/* Author row */}
                <div className="flex items-center gap-3 pt-1">
                  <img
                    src={displayAvatar}
                    alt={authorName}
                    className="w-8 h-8 rounded-full object-cover border border-stone-200"
                  />
                  <div>
                    <div className="text-xs font-black text-stone-900">{authorName}</div>
                    <div className="text-[10px] text-stone-400">{authorTitle || '創作者'} · 剛剛發布</div>
                  </div>

                  {demoUrl && (
                    <a
                      href={demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                    >
                      <span>前往體驗</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Gallery Screenshots Preview */}
              {galleryImages.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-stone-700">作品畫面截圖</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {galleryImages.map((img, i) => (
                      <div key={i} className="aspect-video rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description Section */}
              <div className="space-y-2">
                <h3 className="text-sm font-black text-stone-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>{isVibeApp ? '作品詳細介紹與核心功能' : '提案核心摘要與創新價值'}</span>
                </h3>
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 text-stone-800 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-medium">
                  {displayDesc}
                </div>
              </div>

              {/* Tech Architecture & Target Goal */}
              {(techArchitecture || targetGoal) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {techArchitecture && (
                    <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-200/80 space-y-1">
                      <div className="text-xs font-bold text-indigo-950 flex items-center gap-1">
                        <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                        <span>技術架構與工具</span>
                      </div>
                      <p className="text-xs text-stone-700 font-mono">{techArchitecture}</p>
                    </div>
                  )}
                  {targetGoal && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-1">
                      <div className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>近期目標與預期成果</span>
                      </div>
                      <p className="text-xs text-stone-700">{targetGoal}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Solved Pain Point reference */}
              {referencedPainPoint && (
                <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-1">
                  <div className="text-xs font-bold text-rose-950 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-rose-600" />
                    <span>關聯與解決之生活/產業痛點</span>
                  </div>
                  <p className="text-xs text-stone-700 font-medium">{referencedPainPoint}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-5 border-t border-stone-200 bg-white flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
          >
            返回修改內容
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
  );
};
