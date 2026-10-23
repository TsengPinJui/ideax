import React, { useState } from 'react';
import {
  X,
  Globe,
  Cpu,
  Gamepad2,
  Workflow,
  Puzzle,
  Sparkles,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Image as ImageIcon,
  Tag as TagIcon,
  HelpCircle,
  Eye,
  Check,
  Send,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Question } from '../types';
import { getAuthHeaders } from '../services/authHeader';
import { PLATFORM_CURATED_NAME, PLATFORM_CURATED_AVATAR } from '../utils/userDisplay';

interface AdminQuickOnboardAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdQuestion: Question) => void;
}

const CATEGORY_OPTIONS = [
  { id: '網站程式', label: '網站程式', icon: Globe, desc: 'Web SaaS、線上平台、社群或實用資訊站' },
  { id: 'AI工具', label: 'AI工具', icon: Cpu, desc: '大模型、AI助理、文字/圖像生成應用' },
  { id: '小遊戲', label: '小遊戲', icon: Gamepad2, desc: '休閒益智、網頁遊戲、互動娛樂' },
  { id: '自動化', label: '自動化', icon: Workflow, desc: '工作流自動化、爬蟲、API串接工具' },
  { id: '擴充功能', label: '擴充功能', icon: Puzzle, desc: 'Chrome/Edge 擴充外掛、VSCode 插件' },
] as const;

type SoftwareCategory = (typeof CATEGORY_OPTIONS)[number]['id'];

interface ScrapedData {
  websiteUrl: string;
  appName: string;
  title: string;
  description: string;
  category: SoftwareCategory;
  tags: string[];
  techArchitecture: string;
  coverImage: string;
  screenshotUrl: string;
  ogImage: string | null;
  rawMeta?: {
    title?: string;
    description?: string;
    siteName?: string;
  };
}

const QUICK_EXAMPLES = [
  { label: '2048 益智遊戲', url: 'https://play2048.co', category: '小遊戲' },
  { label: 'Excalidraw 線上手繪白板', url: 'https://excalidraw.com', category: '網站程式' },
  { label: 'v0 by Vercel AI', url: 'https://v0.dev', category: 'AI工具' },
  { label: 'Hugging Face 開源模型庫', url: 'https://huggingface.co', category: 'AI工具' },
];

export const AdminQuickOnboardAppModal: React.FC<AdminQuickOnboardAppModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { createQuestion, showCenterToast, addNotification, currentUser } = useApp();

  const [inputUrl, setInputUrl] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SoftwareCategory | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');

  // 待上架審核卡片資料（讀取成功後進入審核階段）
  const [reviewedData, setReviewedData] = useState<ScrapedData | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [activeImageTab, setActiveImageTab] = useState<'screenshot' | 'og' | 'custom'>('screenshot');
  const [customImageUrl, setCustomImageUrl] = useState('');

  if (!isOpen) return null;

  const handleReset = () => {
    setInputUrl('');
    setSelectedCategory('');
    setReviewedData(null);
    setErrorMessage('');
    setIsLoading(false);
    setLoadingStep(1);
  };

  const handleSelectExample = (url: string, cat?: string) => {
    setInputUrl(url);
    if (cat && CATEGORY_OPTIONS.some((c) => c.id === cat)) {
      setSelectedCategory(cat as SoftwareCategory);
    }
    setErrorMessage('');
  };

  const handleStartScrape = async () => {
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      setErrorMessage('請輸入或貼上網站網址');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    setLoadingStep(1);

    const stepTimer1 = setTimeout(() => setLoadingStep(2), 1500);
    const stepTimer2 = setTimeout(() => setLoadingStep(3), 3200);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/ai/scrape-website', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url: trimmed,
          preferredCategory: selectedCategory || undefined,
        }),
      });

      const resData = await response.json().catch(() => null);

      if (!response.ok || !resData?.success || !resData?.data) {
        throw new Error(resData?.error || `讀取失敗 (HTTP ${response.status})`);
      }

      const data: ScrapedData = resData.data;
      setReviewedData(data);
      setActiveImageTab('screenshot');
      setCustomImageUrl(data.coverImage);
    } catch (err: any) {
      console.error('[Admin Quick Onboard Scrape Error]', err);
      setErrorMessage(err?.message || '讀取網站內容失敗，請確認網址是否可公開存取');
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsLoading(false);
    }
  };

  const handleAddTag = () => {
    if (!newTagInput.trim() || !reviewedData) return;
    const tag = newTagInput.trim().replace(/^#/, '');
    if (!reviewedData.tags.includes(tag)) {
      setReviewedData({
        ...reviewedData,
        tags: [...reviewedData.tags, tag],
      });
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!reviewedData) return;
    setReviewedData({
      ...reviewedData,
      tags: reviewedData.tags.filter((t) => t !== tagToRemove),
    });
  };

  const handleConfirmPublish = async () => {
    if (!reviewedData) return;

    if (!reviewedData.appName.trim()) {
      setErrorMessage('軟體名稱不可為空');
      return;
    }
    if (!reviewedData.title.trim()) {
      setErrorMessage('作品標題不可為空');
      return;
    }

    setIsPublishing(true);

    try {
      const cleanUrl = reviewedData.websiteUrl;
      const finalCategory = reviewedData.category || '網站程式';

      const newQ = createQuestion({
        appName: reviewedData.appName.trim(),
        title: reviewedData.title.trim(),
        description: reviewedData.description.trim(),
        postType: 'vibecoding_app',
        specialZone: 'vibecoding',
        category: '網站程式',
        subcategory: finalCategory,
        subcategories: [finalCategory],
        tags: reviewedData.tags.length > 0 ? reviewedData.tags : [finalCategory, '網站程式', '軟體作品'],
        coverImage: reviewedData.coverImage,
        showCardImage: true,
        cardDisplayImage: reviewedData.coverImage,
        demoUrl: cleanUrl,
        externalLink: cleanUrl,
        previewMode: 'embed', // 預設試玩體驗模式
        techArchitecture: reviewedData.techArchitecture || 'Web 網頁應用程式',
        publishedPlatforms: [
          {
            name: 'Web 網頁版',
            url: cleanUrl,
          },
        ],
        publishIdentity: 'platform',
        isOfficial: true,
        authorId: 'platform',
        authorName: PLATFORM_CURATED_NAME,
        authorTitle: '官方審核精選',
        authorAvatar: PLATFORM_CURATED_AVATAR,
        bounty: 0,
        level: 'L1',
        status: 'open',
      });

      if (!newQ) {
        throw new Error('刊登失敗，請確認目前權限');
      }

      showCenterToast('🎉 軟體網站已成功刊登！', `《${newQ.appName || newQ.title}》已發布至「軟體作品」專區`, {
        type: 'success',
        duration: 3500,
      });

      addNotification({
        title: '🚀 軟體網站快速上架成功',
        message: `管理員已成功上架軟體《${newQ.appName || newQ.title}》，分類為【${finalCategory}】，首頁封面截圖已生效！`,
        type: 'system',
      });

      if (onSuccess) {
        onSuccess(newQ);
      }

      handleReset();
      onClose();
    } catch (e: any) {
      console.error('[Admin Quick Onboard Publish Error]', e);
      setErrorMessage(e?.message || '發布失敗，請稍後再試');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal 頂部 Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-4.5 bg-gradient-to-r from-purple-700 via-indigo-600 to-indigo-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs border border-white/20">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>後台快速上架軟體網站</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/20">
                  AI + 首頁快照爬蟲
                </span>
              </h2>
              <p className="text-xs text-purple-100/90 mt-0.5">
                貼上網站網址，自動抓取名稱、標題、簡述並以首頁為封面，審核後一鍵刊登至「軟體作品」專區
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            aria-label="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal 內容區 */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* 錯誤訊息 */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-stone-200 text-rose-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 階段 1：尚未爬取或想重新讀取網址 */}
          {!reviewedData && (
            <div className="space-y-5">
              {/* 網址輸入框 */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-stone-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-indigo-600" />
                    <span>貼上欲上架的軟體或網站網址（必填）</span>
                  </span>
                  <span className="text-[11px] text-stone-400 font-normal">支援任何公開可存取之 Web 應用</span>
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isLoading) {
                        e.preventDefault();
                        handleStartScrape();
                      }
                    }}
                    placeholder="https://example.com 或直接輸入網址..."
                    className="w-full pl-3.5 pr-28 py-3 rounded-2xl border border-stone-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-stone-900 placeholder:text-stone-400 transition-all outline-hidden bg-stone-50/50"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {inputUrl && (
                      <button
                        type="button"
                        onClick={() => setInputUrl('')}
                        className="p-1 rounded-full text-stone-400 hover:text-stone-600 text-xs"
                        title="清空"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isLoading || !inputUrl.trim()}
                      onClick={handleStartScrape}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-stone-300 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shrink-0"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>讀取中...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>開始解析</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* 軟體分類勾選區（可選，未選由 AI 自動判定） */}
              <div className="space-y-2.5 rounded-2xl bg-stone-50 border border-stone-200 p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-black text-stone-800">預先勾選軟體分類</span>
                    <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-stone-200">
                      選填：若未勾選則由 AI 自動判定
                    </span>
                  </div>
                  {selectedCategory ? (
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('')}
                      className="text-[11px] text-stone-500 hover:text-stone-800 underline cursor-pointer"
                    >
                      取消勾選（改由 AI 自動分類）
                    </button>
                  ) : (
                    <span className="text-[11px] text-stone-500 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>目前由 AI 依網頁內容自動歸類</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  {CATEGORY_OPTIONS.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          // 若點擊已選則取消（變回未勾選由AI判定）
                          setSelectedCategory(isSelected ? '' : cat.id);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-200 shadow-2xs'
                            : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Icon
                            className={`w-4 h-4 ${
                              isSelected ? 'text-purple-600' : 'text-stone-500'
                            }`}
                          />
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                              isSelected
                                ? 'bg-purple-600 border-purple-600 text-white'
                                : 'border-stone-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>
                        <span
                          className={`text-xs font-black ${
                            isSelected ? 'text-purple-900' : 'text-stone-800'
                          }`}
                        >
                          {cat.label}
                        </span>
                        <span className="text-[10px] text-stone-400 line-clamp-1 mt-0.5">
                          {cat.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 快速示範與常用網站 */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-stone-500 flex items-center gap-1">
                  <span>💡 快速測試範例（點擊直接帶入測試）：</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {QUICK_EXAMPLES.map((ex) => (
                    <button
                      key={ex.label}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleSelectExample(ex.url, ex.category)}
                      className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold border border-stone-200 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <span>{ex.label}</span>
                      <span className="text-[10px] text-stone-400">({ex.category})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Loading 動態進度狀態 */}
              {isLoading && (
                <div className="p-5 rounded-2xl bg-indigo-50/70 border border-stone-200 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600 shrink-0" />
                    <div>
                      <h4 className="text-xs font-black text-indigo-950">
                        正在讀取並分析網站內容...
                      </h4>
                      <p className="text-[11px] text-indigo-700 mt-0.5">
                        {loadingStep === 1 && '🌐 步驟 1/3：爬取目標網頁 HTML 結構與中繼資料...'}
                        {loadingStep === 2 && '📸 步驟 2/3：產生高畫質首頁封面快照並讀取網站名稱...'}
                        {loadingStep === 3 && '🧠 步驟 3/3：Gemini 3.8 Flash 智慧生成標題、簡述與軟體分類...'}
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-indigo-200/60 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${(loadingStep / 3) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 階段 2：爬取成功，整理成「待上架卡片審核」表單 */}
          {reviewedData && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-stone-200 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs font-black text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>網站資料解析完成！已整理成「待上架卡片」，請審核下方內容並可自由微調：</span>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 text-stone-500" />
                  <span>重新輸入網址</span>
                </button>
              </div>

              {/* 兩欄排版：左邊為待上架預覽卡片，右邊為欄位編輯 */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* 左側：即時卡片外觀預覽 */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-stone-700 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-indigo-600" />
                      <span>專區卡片即時預覽 (Live Preview)</span>
                    </span>
                    <span className="text-[11px] font-bold text-stone-400">點擊直接全螢幕試玩</span>
                  </div>

                  {/* 待上架卡片容器 */}
                  <div className="rounded-2xl border-2 border-indigo-200 bg-white overflow-hidden shadow-lg transition-all hover:shadow-xl">
                    {/* 封面圖片 */}
                    <div className="relative aspect-video w-full bg-stone-900 overflow-hidden group">
                      {reviewedData.coverImage ? (
                        <img
                          src={reviewedData.coverImage}
                          alt={reviewedData.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1280&auto=format&fit=crop&q=80';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 gap-1 bg-stone-800">
                          <ImageIcon className="w-8 h-8" />
                          <span className="text-xs">尚無封面圖片</span>
                        </div>
                      )}

                      {/* 試玩體驗標籤 */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-600/90 backdrop-blur-xs text-white text-[11px] font-black shadow-sm">
                        <Play className="w-3 h-3 fill-current" />
                        <span>試玩體驗</span>
                      </div>

                      {/* 軟體分類標籤 */}
                      <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-stone-900/80 backdrop-blur-xs text-amber-300 text-[11px] font-black border border-amber-300/30">
                        {reviewedData.category || '網站程式'}
                      </div>

                      {/* 藍色作品名稱 badge (位於左下角) */}
                      <div className="absolute bottom-2.5 left-2.5 max-w-[85%]">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-black tracking-wide shadow-md truncate block">
                          {reviewedData.appName || '軟體名稱'}
                        </span>
                      </div>
                    </div>

                    {/* 卡片文字與描述 */}
                    <div className="p-4 space-y-2.5">
                      <h4 className="text-sm font-black text-stone-900 line-clamp-2 leading-snug">
                        {reviewedData.title || '無標題'}
                      </h4>

                      <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed">
                        {reviewedData.description || '無描述內容'}
                      </p>

                      {/* 標籤群 */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {reviewedData.tags.slice(0, 4).map((t) => (
                          <span
                            key={t}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>

                      {/* 作者（用戶）位置：平台嚴選 */}
                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <img
                            src={PLATFORM_CURATED_AVATAR}
                            alt="平台嚴選"
                            className="w-4 h-4 rounded-full object-cover ring-1 ring-amber-400 shrink-0"
                          />
                          <span className="font-bold text-amber-800 text-xs truncate">
                            平台嚴選
                          </span>
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-300/80">
                            精選刊登
                          </span>
                        </div>
                        <span className="text-[10px] text-stone-400 font-medium">官方審核</span>
                      </div>

                      {/* 底部按鈕列預覽 */}
                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                        <span className="truncate max-w-[140px] text-stone-400 font-mono text-[10px]">
                          {reviewedData.websiteUrl}
                        </span>
                        <span className="font-bold text-indigo-600 flex items-center gap-1">
                          <span>到網站支持</span>
                          <ExternalLink className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 封面來源切換器 */}
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                    <span className="text-[11px] font-black text-stone-700 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3 text-purple-600" />
                      <span>切換卡片封面圖片來源：</span>
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveImageTab('screenshot');
                          setReviewedData({
                            ...reviewedData,
                            coverImage: reviewedData.screenshotUrl,
                          });
                        }}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                          activeImageTab === 'screenshot'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <span>📸 首頁快照</span>
                      </button>

                      <button
                        type="button"
                        disabled={!reviewedData.ogImage}
                        onClick={() => {
                          if (!reviewedData.ogImage) return;
                          setActiveImageTab('og');
                          setReviewedData({
                            ...reviewedData,
                            coverImage: reviewedData.ogImage,
                          });
                        }}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                          activeImageTab === 'og'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                            : !reviewedData.ogImage
                            ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed opacity-60'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <span>🖼️ 網頁 og:image</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveImageTab('custom');
                        }}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                          activeImageTab === 'custom'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <span>🔗 自訂網址</span>
                      </button>
                    </div>

                    {activeImageTab === 'custom' && (
                      <div className="pt-1 flex gap-1.5">
                        <input
                          type="url"
                          value={customImageUrl}
                          onChange={(e) => setCustomImageUrl(e.target.value)}
                          placeholder="輸入圖片網址 (https://...)"
                          className="w-full px-2.5 py-1 rounded-lg border border-stone-300 text-xs outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customImageUrl.trim()) {
                              setReviewedData({
                                ...reviewedData,
                                coverImage: customImageUrl.trim(),
                              });
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-stone-800 text-white text-xs font-bold shrink-0 cursor-pointer"
                        >
                          套用
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 右側：欄位審核與編輯表單 */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                    <span className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>審核並微調欄位內容</span>
                    </span>
                    <span className="text-[11px] text-stone-400">所有欄位均可直接點擊編輯</span>
                  </div>

                  {/* 軟體名稱 (appName) */}
                  <div className="space-y-1">
                    <label className="block text-xs font-black text-stone-800">
                      軟體/網站名稱 (appName)
                      <span className="text-[11px] font-normal text-stone-400 ml-1.5">
                        顯示於卡片左下角藍色標籤
                      </span>
                    </label>
                    <input
                      type="text"
                      value={reviewedData.appName}
                      onChange={(e) =>
                        setReviewedData({ ...reviewedData, appName: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-xs font-bold text-stone-900 outline-hidden"
                      placeholder="例如：Cursor、Notion、2048..."
                    />
                  </div>

                  {/* 標題 (title) */}
                  <div className="space-y-1">
                    <label className="block text-xs font-black text-stone-800">
                      作品完整標題 (title)
                    </label>
                    <input
                      type="text"
                      value={reviewedData.title}
                      onChange={(e) => setReviewedData({ ...reviewedData, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-xs font-bold text-stone-900 outline-hidden"
                      placeholder="簡潔有吸引力的主要展示標題..."
                    />
                  </div>

                  {/* 軟體分類 (category) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-stone-800 flex items-center justify-between">
                      <span>軟體專區分類</span>
                      <span className="text-[11px] text-purple-700 font-bold">
                        AI 分類：{reviewedData.category}
                      </span>
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                      {CATEGORY_OPTIONS.map((cat) => {
                        const isSelected = reviewedData.category === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() =>
                              setReviewedData({ ...reviewedData, category: cat.id })
                            }
                            className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                              isSelected
                                ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                                : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                            }`}
                          >
                            <span>{cat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 作品簡述 (description) */}
                  <div className="space-y-1">
                    <label className="block text-xs font-black text-stone-800">
                      作品專業簡述 (description)
                    </label>
                    <textarea
                      rows={4}
                      value={reviewedData.description}
                      onChange={(e) =>
                        setReviewedData({ ...reviewedData, description: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-xs font-medium text-stone-900 outline-hidden leading-relaxed resize-none"
                      placeholder="輸入軟體的功能、特色與痛點..."
                    />
                  </div>

                  {/* 體驗網址 (demoUrl) */}
                  <div className="space-y-1">
                    <label className="block text-xs font-black text-stone-800 flex items-center justify-between">
                      <span>線上體驗/試玩網址 (demoUrl)</span>
                      <a
                        href={reviewedData.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-indigo-600 hover:underline flex items-center gap-0.5"
                      >
                        <span>新分頁測試開啟</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </label>
                    <input
                      type="url"
                      value={reviewedData.websiteUrl}
                      onChange={(e) =>
                        setReviewedData({ ...reviewedData, websiteUrl: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-xs font-mono text-stone-800 outline-hidden bg-stone-50/50"
                    />
                  </div>

                  {/* 標籤管理 (tags) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-stone-800 flex items-center gap-1.5">
                      <TagIcon className="w-3.5 h-3.5 text-stone-500" />
                      <span>關鍵字標籤</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {reviewedData.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-stone-200 text-xs font-semibold text-indigo-900"
                        >
                          <span>#{tag}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="text-indigo-400 hover:text-indigo-700 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}

                      {/* 新增標籤輸入 */}
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="text"
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                          placeholder="+ 新增標籤"
                          className="px-2.5 py-1 rounded-lg border border-stone-300 text-xs outline-hidden w-24 focus:w-32 transition-all"
                        />
                        {newTagInput.trim() && (
                          <button
                            type="button"
                            onClick={handleAddTag}
                            className="px-2 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold cursor-pointer"
                          >
                            新增
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal 底部操作按鈕列 */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-stone-500 font-medium hidden sm:block">
            {reviewedData ? (
              <span>✓ 審核無誤後，點擊右方按鈕即可正式刊登至軟體作品專區</span>
            ) : (
              <span>💡 貼上網址即可由爬蟲與 AI 快速為您完成整套上架準備</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              disabled={isPublishing}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-all cursor-pointer"
            >
              取消
            </button>

            {reviewedData ? (
              <button
                type="button"
                disabled={isPublishing}
                onClick={handleConfirmPublish}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>刊登發布中...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>確認刊登至軟體作品專區 🚀</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled={isLoading || !inputUrl.trim()}
                onClick={handleStartScrape}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-stone-300 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>智慧讀取中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>開始讀取與分析</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
