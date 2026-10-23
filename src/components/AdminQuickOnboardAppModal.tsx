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
  Upload,
  Lightbulb,
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

export type PublishDestination = 'vibecoding_app' | 'innovation_proposal';

export const DESTINATION_OPTIONS = [
  {
    id: 'vibecoding_app' as const,
    label: '軟體作品專區',
    shortLabel: '軟體作品',
    badge: 'Vibe Coding',
    desc: '刊登至「軟體作品」專區，支援全螢幕/內嵌試玩體驗與多平台載點',
    icon: Gamepad2,
    colorClass: 'text-indigo-600 border-indigo-500 bg-indigo-50/50',
    activeBadgeClass: 'bg-indigo-600 text-white',
  },
  {
    id: 'innovation_proposal' as const,
    label: '創新提案專區',
    shortLabel: '創新提案',
    badge: '創點子孵化',
    desc: '刊登至「創新提案」專區，完整記錄問題痛點、預期效益目標與落地進度',
    icon: Lightbulb,
    colorClass: 'text-amber-600 border-amber-500 bg-amber-50/50',
    activeBadgeClass: 'bg-amber-600 text-white',
  },
] as const;

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
  targetGoal?: string;
  referencedPainPoint?: string;
  proposalProgressStage?: string;
  coverImage: string;
  screenshotUrl: string;
  ogImage: string | null;
  previewMode?: 'embed' | 'external';
  authorName?: string;
  authorTitle?: string;
  rawMeta?: {
    title?: string;
    description?: string;
    siteName?: string;
  };
}

export const AdminQuickOnboardAppModal: React.FC<AdminQuickOnboardAppModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { createQuestion, showCenterToast, addNotification, currentUser } = useApp();

  const [inputUrl, setInputUrl] = useState('');
  const [selectedDestinations, setSelectedDestinations] = useState<PublishDestination[]>([
    'vibecoding_app',
    'innovation_proposal',
  ]);
  const [selectedCategory, setSelectedCategory] = useState<SoftwareCategory | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');

  // 待上架審核卡片資料（讀取成功後進入審核階段）
  const [reviewedData, setReviewedData] = useState<ScrapedData | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [activeImageTab, setActiveImageTab] = useState<'screenshot' | 'og' | 'upload'>('screenshot');

  if (!isOpen) return null;

  const toggleDestination = (dest: PublishDestination) => {
    setSelectedDestinations((prev) => {
      if (prev.includes(dest)) {
        if (prev.length === 1) {
          setErrorMessage('請至少保留一個刊登目標專區（可勾選「軟體作品」或「創新提案」）');
          return prev;
        }
        setErrorMessage('');
        return prev.filter((d) => d !== dest);
      } else {
        setErrorMessage('');
        return [...prev, dest];
      }
    });
  };

  const handleReset = () => {
    setInputUrl('');
    setSelectedCategory('');
    setReviewedData(null);
    setErrorMessage('');
    setIsLoading(false);
    setLoadingStep(1);
  };

  const handleCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('請選擇有效的圖片檔案 (JPG、PNG、WebP 等)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      if (dataUrl && reviewedData) {
        setReviewedData({
          ...reviewedData,
          coverImage: dataUrl,
        });
        setActiveImageTab('upload');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStartScrape = async () => {
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      setErrorMessage('請輸入或貼上網站網址');
      return;
    }

    if (selectedDestinations.length === 0) {
      setErrorMessage('請至少勾選一個刊登目標專區（軟體作品或創新提案）');
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

      const raw = resData.data;
      const data: ScrapedData = {
        ...raw,
        targetGoal: raw.targetGoal || '打造高可用性、流暢直覺且能解決真實痛點的數位服務體驗',
        referencedPainPoint: raw.referencedPainPoint || '傳統流程繁瑣、缺乏直覺操作介面與即時回饋機制',
        proposalProgressStage: raw.proposalProgressStage || 'prototype',
      };
      setReviewedData(data);
      setActiveImageTab('screenshot');
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

    if (selectedDestinations.length === 0) {
      setErrorMessage('請至少勾選一個刊登目標專區（軟體作品或創新提案）');
      return;
    }

    if (!reviewedData.appName.trim()) {
      setErrorMessage('軟體/專案名稱不可為空');
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
      const authorName = (reviewedData.authorName && reviewedData.authorName.trim()) || PLATFORM_CURATED_NAME;
      const authorTitle = (reviewedData.authorTitle && reviewedData.authorTitle.trim()) || '官方審核精選';

      let createdAppQ: Question | null = null;
      let createdPropQ: Question | null = null;

      // 1. 若勾選「軟體作品專區」
      if (selectedDestinations.includes('vibecoding_app')) {
        createdAppQ = createQuestion({
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
          previewMode: reviewedData.previewMode || 'embed',
          techArchitecture: (reviewedData.techArchitecture && reviewedData.techArchitecture.trim()) || 'Web 網頁應用程式',
          publishedPlatforms: [
            {
              name: 'Web 網頁版',
              url: cleanUrl,
            },
          ],
          publishIdentity: 'platform',
          isOfficial: true,
          authorId: 'platform',
          authorName,
          authorTitle,
          authorAvatar: PLATFORM_CURATED_AVATAR,
          bounty: 0,
          level: 'L1',
          status: 'open',
        });
      }

      // 2. 若勾選「創新提案專區」
      if (selectedDestinations.includes('innovation_proposal')) {
        createdPropQ = createQuestion({
          appName: reviewedData.appName.trim(),
          title: reviewedData.title.trim(),
          description: reviewedData.description.trim(),
          postType: 'innovation_proposal',
          specialZone: 'create_ideas',
          category: '創新創業',
          subcategory: finalCategory,
          subcategories: [finalCategory],
          tags: reviewedData.tags.length > 0
            ? Array.from(new Set([...reviewedData.tags, '創新提案']))
            : [finalCategory, '創新提案', '精選'],
          coverImage: reviewedData.coverImage,
          showCardImage: true,
          cardDisplayImage: reviewedData.coverImage,
          demoUrl: cleanUrl,
          externalLink: cleanUrl,
          previewMode: reviewedData.previewMode || 'embed',
          techArchitecture: (reviewedData.techArchitecture && reviewedData.techArchitecture.trim()) || 'Web 網頁應用程式',
          targetGoal: (reviewedData.targetGoal && reviewedData.targetGoal.trim()) || '打造高可用性、流暢直覺且能解決真實痛點的數位服務體驗',
          referencedPainPoint: (reviewedData.referencedPainPoint && reviewedData.referencedPainPoint.trim()) || '傳統流程繁瑣、缺乏直覺操作介面與即時回饋機制',
          proposalProgressStage: reviewedData.proposalProgressStage || 'prototype',
          publishedPlatforms: [
            {
              name: 'Web 網頁版',
              url: cleanUrl,
            },
          ],
          publishIdentity: 'platform',
          isOfficial: true,
          authorId: 'platform',
          authorName,
          authorTitle,
          authorAvatar: PLATFORM_CURATED_AVATAR,
          bounty: 0,
          level: 'L1',
          status: 'open',
        });
      }

      const isBoth = selectedDestinations.includes('vibecoding_app') && selectedDestinations.includes('innovation_proposal');
      const targetName = reviewedData.appName.trim() || reviewedData.title.trim();

      if (isBoth) {
        showCenterToast('🎉 軟體與提案同步刊登成功！', `《${targetName}》已同時發布至「軟體作品」與「創新提案」專區`, {
          type: 'success',
          duration: 4000,
        });
        addNotification({
          title: '🚀 軟體與創新提案雙專區快速上架成功',
          message: `管理員已成功將《${targetName}》上架至【軟體作品】與【創新提案】專區，首頁封面截圖與解決痛點均已生效！`,
          type: 'system',
        });
      } else if (selectedDestinations.includes('vibecoding_app')) {
        showCenterToast('🎉 軟體網站已成功刊登！', `《${targetName}》已發布至「軟體作品」專區`, {
          type: 'success',
          duration: 3500,
        });
        addNotification({
          title: '🚀 軟體網站快速上架成功',
          message: `管理員已成功上架軟體《${targetName}》，分類為【${finalCategory}】，首頁封面截圖已生效！`,
          type: 'system',
        });
      } else {
        showCenterToast('🎉 創新提案已成功刊登！', `《${targetName}》已發布至「創新提案」專區`, {
          type: 'success',
          duration: 3500,
        });
        addNotification({
          title: '🚀 創新提案快速上架成功',
          message: `管理員已成功上架創新提案《${targetName}》，已載入對應痛點與目標效益！`,
          type: 'system',
        });
      }

      if (onSuccess) {
        const resultQ = createdAppQ || createdPropQ;
        if (resultQ) {
          onSuccess(resultQ);
        }
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
                <span>後台快速上架軟體網站與創新提案</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/20">
                  AI + 首頁快照爬蟲
                </span>
              </h2>
              <p className="text-xs text-purple-100/90 mt-0.5">
                貼上網站網址，自動抓取名稱、標題、簡述與痛點目標，審核後刊登至「軟體作品」或「創新提案」專區（支援複選）
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
              {/* 刊登發布目標專區（可單選或複選） */}
              <div className="space-y-2 rounded-2xl bg-gradient-to-br from-indigo-50/60 via-purple-50/40 to-amber-50/50 border border-stone-200 p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-black text-stone-800">刊登發布目標專區（可單選或複選）</span>
                    <span className="text-[11px] font-bold text-indigo-700 bg-white/80 px-2 py-0.5 rounded-full border border-indigo-200 shadow-2xs">
                      支援複選
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-500 font-medium">
                    已選：{selectedDestinations.length === 2 ? '軟體作品 ＋ 創新提案（雙專區同步）' : selectedDestinations.includes('vibecoding_app') ? '軟體作品專區' : '創新提案專區'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {DESTINATION_OPTIONS.map((dest) => {
                    const Icon = dest.icon;
                    const isChecked = selectedDestinations.includes(dest.id);
                    return (
                      <button
                        key={dest.id}
                        type="button"
                        onClick={() => toggleDestination(dest.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                          isChecked
                            ? 'bg-white border-indigo-500 ring-2 ring-indigo-200 shadow-sm'
                            : 'bg-white/60 border-stone-200 hover:border-stone-300 hover:bg-white'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-lg border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                            isChecked
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'border-stone-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                              <Icon className={`w-3.5 h-3.5 ${isChecked ? 'text-indigo-600' : 'text-stone-400'}`} />
                              <span>{dest.label}</span>
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${isChecked ? dest.activeBadgeClass : 'bg-stone-100 text-stone-500'}`}>
                              {dest.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                            {dest.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

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

                      {/* 目標專區標籤 */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                        {selectedDestinations.includes('vibecoding_app') && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-black shadow-sm">
                            <Play className="w-2.5 h-2.5 fill-current" />
                            <span>試玩體驗</span>
                          </div>
                        )}
                        {selectedDestinations.includes('innovation_proposal') && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/90 backdrop-blur-xs text-white text-[10px] font-black shadow-sm">
                            <Lightbulb className="w-2.5 h-2.5" />
                            <span>創新提案</span>
                          </div>
                        )}
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
                          setActiveImageTab('upload');
                        }}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                          activeImageTab === 'upload'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>📤 上傳圖片</span>
                      </button>
                    </div>

                    {activeImageTab === 'upload' && (
                      <div className="pt-2">
                        <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-purple-300 hover:border-purple-500 rounded-xl bg-purple-50/50 hover:bg-purple-50 transition-colors cursor-pointer group">
                          <Upload className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform mb-1" />
                          <span className="text-xs font-bold text-stone-800">點擊選擇圖片檔案上傳</span>
                          <span className="text-[10px] text-stone-500 mt-0.5">支援 JPG、PNG、WebP 等圖檔</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCoverImageUpload}
                            className="hidden"
                          />
                        </label>
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
                    <button
                      type="button"
                      onClick={() => setReviewedData(null)}
                      className="text-[11px] text-stone-500 hover:text-indigo-600 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="返回輸入框更換網址重新抓取"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>更換網址重新擷取</span>
                    </button>
                  </div>

                  {/* 刊登目標專區快速勾選（支援單選或複選） */}
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-indigo-50/70 to-purple-50/70 border border-indigo-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>刊登目標專區（可單選或複選）</span>
                      </label>
                      <span className="text-[11px] text-indigo-700 font-bold">
                        {selectedDestinations.length === 2 ? '雙專區同步發布' : selectedDestinations.includes('vibecoding_app') ? '僅刊登至「軟體作品」' : '僅刊登至「創新提案」'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {DESTINATION_OPTIONS.map((dest) => {
                        const Icon = dest.icon;
                        const isChecked = selectedDestinations.includes(dest.id);
                        return (
                          <button
                            key={dest.id}
                            type="button"
                            onClick={() => toggleDestination(dest.id)}
                            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-white border-indigo-500 ring-2 ring-indigo-200 text-stone-900 shadow-2xs'
                                : 'bg-white/60 border-stone-200 text-stone-500 hover:bg-white'
                            }`}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <Icon className={`w-3.5 h-3.5 ${isChecked ? 'text-indigo-600' : 'text-stone-400'}`} />
                              <span>{dest.label}</span>
                            </span>
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] shrink-0 ${
                              isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-stone-300 bg-white'
                            }`}>
                              {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 軟體名稱 (appName) */}
                  <div className="space-y-1">
                    <label className="block text-xs font-black text-stone-800">
                      軟體/專案名稱 (appName)
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
                      作品/提案完整標題 (title)
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
                      <span>專區分類</span>
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

                  {/* 若選擇刊登至「創新提案」，顯示提案專屬審核欄位 */}
                  {selectedDestinations.includes('innovation_proposal') && (
                    <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3 animate-in fade-in">
                      <div className="flex items-center gap-1.5 border-b border-amber-200/80 pb-2">
                        <Lightbulb className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-black text-amber-950">
                          創新提案專屬欄位（AI 已自動分析生成，請審核編輯）
                        </span>
                      </div>

                      {/* 對應解決之用戶痛點 (referencedPainPoint) */}
                      <div className="space-y-1">
                        <label className="block text-xs font-black text-stone-800 flex items-center justify-between">
                          <span>對應解決之用戶痛點 / 市場需求</span>
                          <span className="text-[10px] text-amber-700 font-bold">AI 智慧分析生成</span>
                        </label>
                        <textarea
                          rows={2}
                          value={reviewedData.referencedPainPoint || ''}
                          onChange={(e) =>
                            setReviewedData({ ...reviewedData, referencedPainPoint: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-amber-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-100 text-xs font-medium text-stone-900 outline-hidden bg-white leading-relaxed resize-none"
                          placeholder="描述此提案所針對解決之痛點..."
                        />
                      </div>

                      {/* 提案目標與預期效益 (targetGoal) */}
                      <div className="space-y-1">
                        <label className="block text-xs font-black text-stone-800 flex items-center justify-between">
                          <span>提案目標與預期效益</span>
                          <span className="text-[10px] text-amber-700 font-bold">AI 智慧分析生成</span>
                        </label>
                        <textarea
                          rows={2}
                          value={reviewedData.targetGoal || ''}
                          onChange={(e) =>
                            setReviewedData({ ...reviewedData, targetGoal: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-amber-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-100 text-xs font-medium text-stone-900 outline-hidden bg-white leading-relaxed resize-none"
                          placeholder="描述此提案欲達成之目標效益..."
                        />
                      </div>

                      {/* 提案進度階段 (proposalProgressStage) */}
                      <div className="space-y-1">
                        <label className="block text-xs font-black text-stone-800">
                          提案孵化階段 (proposalProgressStage)
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {[
                            { id: 'prototype', label: '雛型展示', desc: 'Prototype' },
                            { id: 'mvp', label: '已上線 MVP', desc: '已具備基本功能' },
                            { id: 'concept', label: '概念驗證', desc: 'PoC' },
                            { id: 'growth', label: '營運成長', desc: '商業化營運中' },
                          ].map((stage) => {
                            const isCurrent = (reviewedData.proposalProgressStage || 'prototype') === stage.id;
                            return (
                              <button
                                key={stage.id}
                                type="button"
                                onClick={() => setReviewedData({ ...reviewedData, proposalProgressStage: stage.id })}
                                className={`py-1.5 px-2 rounded-xl text-xs font-black border transition-all cursor-pointer flex flex-col items-center justify-center ${
                                  isCurrent
                                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                                    : 'bg-white text-stone-700 border-amber-200 hover:bg-amber-100/50'
                                }`}
                              >
                                <span>{stage.label}</span>
                                <span className={`text-[9px] ${isCurrent ? 'text-amber-100' : 'text-stone-400'}`}>
                                  {stage.desc}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

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

                  {/* 技術架構 (techArchitecture) */}
                  <div className="space-y-1">
                    <label className="block text-xs font-black text-stone-800 flex items-center justify-between">
                      <span>技術架構 / 開發環境 (techArchitecture)</span>
                      <span className="text-[11px] font-normal text-stone-400">
                        例如：React + TypeScript、Next.js、AI 演算法
                      </span>
                    </label>
                    <input
                      type="text"
                      value={reviewedData.techArchitecture || ''}
                      onChange={(e) =>
                        setReviewedData({ ...reviewedData, techArchitecture: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-xs font-bold text-stone-900 outline-hidden"
                      placeholder="例如：Web 網頁應用程式、React + Tailwind CSS"
                    />
                  </div>

                  {/* 體驗預覽模式 (previewMode) */}
                  <div className="space-y-1">
                    <label className="block text-xs font-black text-stone-800">
                      作品體驗模式 (previewMode)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setReviewedData({ ...reviewedData, previewMode: 'embed' })}
                        className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          reviewedData.previewMode !== 'external'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                            : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current text-emerald-600" />
                        <span>🎮 內嵌網頁試玩體驗 (預設)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewedData({ ...reviewedData, previewMode: 'external' })}
                        className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          reviewedData.previewMode === 'external'
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-300 shadow-2xs'
                            : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                        <span>🔗 開啟外部專屬網站</span>
                      </button>
                    </div>
                  </div>

                  {/* 作者/刊登者標示 (authorName) */}
                  <div className="space-y-1">
                    <label className="block text-xs font-black text-stone-800 flex items-center justify-between">
                      <span>作者/刊登者標示 (authorName)</span>
                      <span className="text-[11px] text-amber-700 font-bold">
                        預設：平台嚴選（可自由自訂或指定）
                      </span>
                    </label>
                    <input
                      type="text"
                      value={reviewedData.authorName !== undefined ? reviewedData.authorName : '平台嚴選'}
                      onChange={(e) =>
                        setReviewedData({ ...reviewedData, authorName: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-xs font-bold text-amber-900 outline-hidden bg-amber-50/20"
                      placeholder="平台嚴選"
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
              <span>✓ 審核無誤後，點擊右方按鈕即可正式刊登至指定專區（軟體作品 / 創新提案）</span>
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
                disabled={isPublishing || selectedDestinations.length === 0}
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
                    <span>
                      {selectedDestinations.length === 2
                        ? '雙專區同步刊登（軟體 ＋ 提案）🚀'
                        : selectedDestinations.includes('vibecoding_app')
                        ? '確認刊登至「軟體作品」專區 🚀'
                        : '確認刊登至「創新提案」專區 💡'}
                    </span>
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
