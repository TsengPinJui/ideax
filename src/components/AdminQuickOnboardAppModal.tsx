import React, { useState, useMemo } from 'react';
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
  Eye,
  Check,
  Send,
  Upload,
  Lightbulb,
  List,
  Trash2,
  CheckSquare,
  Square,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Question } from '../types';
import { getAuthHeaders } from '../services/authHeader';
import { PLATFORM_CURATED_NAME, PLATFORM_CURATED_AVATAR } from '../utils/userDisplay';
import { stripAppNameFromTitle } from '../utils/titleFormat';

interface AdminQuickOnboardAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdQuestion: Question) => void;
}

export type PublishDestination = 'vibecoding_app' | 'innovation_proposal';

export const DESTINATION_OPTIONS = [
  {
    id: 'vibecoding_app' as const,
    label: '軟體作品',
    desc: '可線上試玩體驗',
    icon: Gamepad2,
    badge: 'Vibe Coding',
    activeClass: 'border-indigo-500 bg-indigo-50/60 text-indigo-900',
  },
  {
    id: 'innovation_proposal' as const,
    label: '創新提案',
    desc: '記錄痛點與預期效益',
    icon: Lightbulb,
    badge: '創點子孵化',
    activeClass: 'border-amber-500 bg-amber-50/60 text-amber-900',
  },
] as const;

export const CATEGORY_OPTIONS = [
  { id: '網站程式', label: '網站程式', icon: Globe },
  { id: 'AI工具', label: 'AI工具', icon: Cpu },
  { id: '遊戲', label: '遊戲', icon: Gamepad2 },
  { id: '自動化', label: '自動化', icon: Workflow },
  { id: '擴充功能', label: '擴充功能', icon: Puzzle },
] as const;

type SoftwareCategory = (typeof CATEGORY_OPTIONS)[number]['id'];

export interface ScrapedAppItem {
  id: string;
  websiteUrl: string;
  status: 'pending' | 'scraping' | 'success' | 'error';
  errorMessage?: string;
  destinations: PublishDestination[];
  selectedForPublish: boolean;
  appName: string;
  title: string;
  description: string;
  category: SoftwareCategory;
  categories?: SoftwareCategory[];
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
}

function extractUrls(text: string): string[] {
  const parts = text.split(/[\n\r,;\s]+/);
  const urls: string[] = [];
  const seen = new Set<string>();
  for (let raw of parts) {
    let u = raw.trim();
    if (!u) continue;
    if (!/^https?:\/\//i.test(u) && u.includes('.') && !u.startsWith('#')) {
      u = 'https://' + u;
    }
    try {
      const parsed = new URL(u);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        if (!seen.has(parsed.href)) {
          seen.add(parsed.href);
          urls.push(parsed.href);
        }
      }
    } catch {
      // ignore invalid URL string
    }
  }
  return urls;
}

function normalizeWebUrl(u: string): string {
  try {
    let raw = u.trim();
    if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    const pathname = parsed.pathname.replace(/\/+$/, '').toLowerCase();
    return `${host}${pathname}`;
  } catch {
    return u.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '').toLowerCase();
  }
}

export const AdminQuickOnboardAppModal: React.FC<AdminQuickOnboardAppModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { questions, createQuestion, showCenterToast, addNotification } = useApp();

  // 模式：單一網址 vs. 批量網址
  const [inputMode, setInputMode] = useState<'single' | 'batch'>('single');
  const [singleUrl, setSingleUrl] = useState('');
  const [batchUrlsText, setBatchUrlsText] = useState('');

  // 整理全站現有已發布之網址來源（排除下架項目），用於防止重複來源交給 AI 分析
  const existingPublishedUrls = useMemo(() => {
    const map = new Map<string, { id: string; title: string; appName?: string }>();
    for (const q of questions || []) {
      if (q.status === 'delisted') continue;
      const candidateUrls = [
        q.demoUrl,
        q.externalLink,
        q.vibeCodingData?.demoUrl,
        q.vibeCodingData?.externalLink,
        ...(q.publishedPlatforms || []).map((p) => p?.url),
      ].filter((s): s is string => typeof s === 'string' && s.trim().length > 0);

      for (const u of candidateUrls) {
        const norm = normalizeWebUrl(u);
        if (norm && !map.has(norm)) {
          map.set(norm, { id: q.id, title: q.title, appName: q.appName });
        }
      }
    }
    return map;
  }, [questions]);

  // 預設刊登專區（默認不勾選，由管理員依需求選取）
  const [defaultDestinations, setDefaultDestinations] = useState<PublishDestination[]>([]);
  // 偏好分類（支援複選，若為空則全由 AI 研判）
  const [preferredCategories, setPreferredCategories] = useState<SoftwareCategory[]>([]);

  const togglePreferredCategory = (catId: SoftwareCategory) => {
    setPreferredCategories((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    );
  };

  // 執行解析狀態
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  // 審核列表與當前選取的項目
  const [reviewedItems, setReviewedItems] = useState<ScrapedAppItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  // 取得當前選取的審核項目
  const activeItem = useMemo(
    () => reviewedItems.find((item) => item.id === activeItemId) || reviewedItems[0] || null,
    [reviewedItems, activeItemId]
  );

  // 提取批量模式辨識出的網址列表
  const parsedBatchUrls = useMemo(() => extractUrls(batchUrlsText), [batchUrlsText]);

  // 單一網址與批量網址重複檢查
  const singleUrlDuplicate = useMemo(() => {
    if (!singleUrl.trim()) return null;
    const norm = normalizeWebUrl(singleUrl);
    return existingPublishedUrls.get(norm) || null;
  }, [singleUrl, existingPublishedUrls]);

  const batchDuplicateCount = useMemo(() => {
    if (parsedBatchUrls.length === 0) return 0;
    const seen = new Set<string>();
    let count = 0;
    for (const u of parsedBatchUrls) {
      const norm = normalizeWebUrl(u);
      if (seen.has(norm) || existingPublishedUrls.has(norm)) {
        count++;
      }
      seen.add(norm);
    }
    return count;
  }, [parsedBatchUrls, existingPublishedUrls]);

  if (!isOpen) return null;

  const toggleDefaultDestination = (dest: PublishDestination) => {
    setDefaultDestinations((prev) =>
      prev.includes(dest) ? prev.filter((d) => d !== dest) : [...prev, dest]
    );
  };

  const handleReset = () => {
    setSingleUrl('');
    setBatchUrlsText('');
    setReviewedItems([]);
    setActiveItemId('');
    setErrorMessage('');
    setIsProcessing(false);
    setIsPublishing(false);
    setPreferredCategories([]);
  };

  // 執行單筆網址爬取與 AI 結構化分析
  const scrapeSingleUrl = async (url: string): Promise<Partial<ScrapedAppItem>> => {
    const headers = await getAuthHeaders();
    const response = await fetch('/api/ai/scrape-website', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        url,
        preferredCategories: preferredCategories.length > 0 ? preferredCategories : undefined,
        preferredCategory: preferredCategories[0] || undefined,
      }),
    });

    const resData = await response.json().catch(() => null);
    if (!response.ok || !resData?.success || !resData?.data) {
      throw new Error(resData?.error || `讀取失敗 (HTTP ${response.status})`);
    }

    const raw = resData.data;
    const cleanAppName = raw.appName || '未命名軟體';

    const rawCats: SoftwareCategory[] = Array.isArray(raw.categories) && raw.categories.length > 0
      ? raw.categories.filter((c: any) => CATEGORY_OPTIONS.some((o) => o.id === c))
      : (preferredCategories.length > 0
          ? [...preferredCategories]
          : [raw.category || '網站程式']);
    const primaryCat: SoftwareCategory = rawCats[0] || raw.category || '網站程式';
    const finalCats = rawCats.length > 0 ? rawCats : [primaryCat];

    return {
      appName: cleanAppName,
      title: stripAppNameFromTitle(raw.title || '無標題', cleanAppName),
      description: raw.description || '',
      category: primaryCat,
      categories: finalCats,
      tags: Array.isArray(raw.tags) && raw.tags.length > 0
        ? Array.from(new Set([...finalCats, ...raw.tags]))
        : [...finalCats, '軟體作品'],
      techArchitecture: raw.techArchitecture || 'Web 網頁應用程式',
      targetGoal: raw.targetGoal || '打造流暢直覺且能解決真實痛點的數位體驗',
      referencedPainPoint: raw.referencedPainPoint || '傳統流程繁瑣、缺乏直覺操作介面',
      proposalProgressStage: raw.proposalProgressStage || 'prototype',
      coverImage: raw.coverImage || raw.screenshotUrl || '',
      screenshotUrl: raw.screenshotUrl || '',
      ogImage: raw.ogImage || null,
      previewMode: raw.previewMode || 'embed',
      authorName: PLATFORM_CURATED_NAME,
      authorTitle: '官方審核精選',
    };
  };

  // 開始解析（單筆或批量）
  const handleStartScraping = async () => {
    setErrorMessage('');
    const targetUrls =
      inputMode === 'single'
        ? extractUrls(singleUrl)
        : parsedBatchUrls;

    if (targetUrls.length === 0) {
      setErrorMessage(inputMode === 'single' ? '請輸入有效的網址' : '請至少輸入一個有效網址（每行一個）');
      return;
    }

    // 若單一網址與平台現有作品重複，直接阻擋且不交給 AI 分析
    if (inputMode === 'single') {
      const norm = normalizeWebUrl(targetUrls[0]);
      const match = existingPublishedUrls.get(norm);
      if (match) {
        setErrorMessage(
          `此網址來源已在平台發布過（與《${match.appName || match.title}》重複），依社群規範不交給 AI 分析。`
        );
        return;
      }
    }

    setIsProcessing(true);
    setCurrentProcessingIndex(0);
    setTotalToProcess(targetUrls.length);

    const initialItems: ScrapedAppItem[] = targetUrls.map((url, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      websiteUrl: url,
      status: 'pending',
      destinations: [...defaultDestinations],
      selectedForPublish: true,
      appName: '',
      title: '',
      description: '',
      category: preferredCategories[0] || '網站程式',
      categories: preferredCategories.length > 0 ? [...preferredCategories] : ['網站程式'],
      tags: [],
      techArchitecture: 'Web 網頁應用程式',
      targetGoal: '',
      referencedPainPoint: '',
      proposalProgressStage: 'prototype',
      coverImage: '',
      screenshotUrl: '',
      ogImage: null,
      previewMode: 'embed',
      authorName: PLATFORM_CURATED_NAME,
      authorTitle: '官方審核精選',
    }));

    setReviewedItems(initialItems);

    const updated = [...initialItems];
    const seenInBatch = new Set<string>();

    for (let i = 0; i < targetUrls.length; i++) {
      setCurrentProcessingIndex(i + 1);
      const url = targetUrls[i];
      const norm = normalizeWebUrl(url);

      // 檢查 1：是否與全站現有已發布作品重複
      const existingMatch = existingPublishedUrls.get(norm);
      if (existingMatch) {
        updated[i] = {
          ...updated[i],
          status: 'error',
          errorMessage: `此網址來源已在平台發布過（與《${(existingMatch.appName || existingMatch.title).slice(0, 20)}》重複），已略過 AI 分析`,
          selectedForPublish: false,
        };
        setReviewedItems([...updated]);
        continue; // 不交給 AI 分析！
      }

      // 檢查 2：是否在當前批量輸入中重複
      if (seenInBatch.has(norm)) {
        updated[i] = {
          ...updated[i],
          status: 'error',
          errorMessage: '此網址來源在批次清單中重複，已略過 AI 分析',
          selectedForPublish: false,
        };
        setReviewedItems([...updated]);
        continue; // 不交給 AI 分析！
      }
      seenInBatch.add(norm);

      updated[i] = { ...updated[i], status: 'scraping' };
      setReviewedItems([...updated]);

      try {
        const scraped = await scrapeSingleUrl(url);
        updated[i] = {
          ...updated[i],
          ...scraped,
          status: 'success',
        };
      } catch (err: any) {
        console.error(`Scrape failed for ${url}:`, err);
        updated[i] = {
          ...updated[i],
          status: 'error',
          errorMessage: err?.message || '讀取失敗',
          selectedForPublish: false, // 失敗項目預設不勾選發布
        };
      }
      setReviewedItems([...updated]);
    }

    setIsProcessing(false);

    // 設定第一個成功項目為預設編輯項
    const firstSuccess = updated.find((it) => it.status === 'success');
    if (firstSuccess) {
      setActiveItemId(firstSuccess.id);
    } else if (updated[0]) {
      setActiveItemId(updated[0].id);
    }
  };

  // 審核項微調修改
  const updateActiveItem = (patch: Partial<ScrapedAppItem>) => {
    if (!activeItem) return;
    setReviewedItems((prev) =>
      prev.map((it) => (it.id === activeItem.id ? { ...it, ...patch } : it))
    );
  };

  // 標籤增刪
  const handleAddTag = () => {
    if (!newTagInput.trim() || !activeItem) return;
    const tag = newTagInput.trim().replace(/^#/, '');
    if (!activeItem.tags.includes(tag)) {
      updateActiveItem({ tags: [...activeItem.tags, tag] });
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!activeItem) return;
    updateActiveItem({ tags: activeItem.tags.filter((t) => t !== tagToRemove) });
  };

  // 圖片上傳覆蓋
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeItem) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) {
        updateActiveItem({ coverImage: dataUrl });
      }
    };
    reader.readAsDataURL(file);
  };

  // 移除項目
  const handleRemoveItem = (id: string) => {
    setReviewedItems((prev) => {
      const filtered = prev.filter((it) => it.id !== id);
      if (activeItemId === id && filtered.length > 0) {
        setActiveItemId(filtered[0].id);
      }
      return filtered;
    });
  };

  // 全選 / 全取消
  const toggleSelectAll = () => {
    const allSelected = reviewedItems.filter((i) => i.status === 'success').every((i) => i.selectedForPublish);
    setReviewedItems((prev) =>
      prev.map((it) => (it.status === 'success' ? { ...it, selectedForPublish: !allSelected } : it))
    );
  };

  // 執行刊登發布
  const handlePublishAll = async () => {
    const toPublish = reviewedItems.filter((it) => it.selectedForPublish && it.status === 'success');
    if (toPublish.length === 0) {
      setErrorMessage('請至少選取一個成功解析的項目進行刊登');
      return;
    }

    const withoutDest = toPublish.filter((it) => it.destinations.length === 0);
    if (withoutDest.length === toPublish.length) {
      setErrorMessage('請為欲刊登之項目至少勾選一個刊登專區（軟體作品或創新提案）');
      return;
    }

    setIsPublishing(true);
    let publishedCount = 0;
    let lastCreated: Question | null = null;

    try {
      for (const item of toPublish) {
        const cleanUrl = item.websiteUrl;
        const finalCategories: SoftwareCategory[] = (item.categories && item.categories.length > 0)
          ? item.categories
          : (item.category ? [item.category] : ['網站程式']);
        const primaryCategory = finalCategories[0] || '網站程式';
        const finalAuthorName = (item.authorName && item.authorName.trim()) || PLATFORM_CURATED_NAME;
        const finalAuthorTitle = (item.authorTitle && item.authorTitle.trim()) || '官方審核精選';

        const finalAppName = item.appName.trim() || item.title.trim();
        const finalTitle = stripAppNameFromTitle(item.title.trim(), finalAppName) || item.title.trim();

        // 1. 若刊登至軟體作品
        if (item.destinations.includes('vibecoding_app')) {
          const appQ = createQuestion({
            appName: finalAppName,
            title: finalTitle,
            description: item.description.trim(),
            postType: 'vibecoding_app',
            specialZone: 'vibecoding',
            category: '網站程式',
            subcategory: primaryCategory,
            subcategories: finalCategories,
            tags: item.tags.length > 0
              ? Array.from(new Set([...finalCategories, ...item.tags, '網站程式', '軟體作品']))
              : [...finalCategories, '網站程式', '軟體作品'],
            coverImage: item.coverImage,
            showCardImage: true,
            cardDisplayImage: item.coverImage,
            demoUrl: cleanUrl,
            externalLink: cleanUrl,
            previewMode: item.previewMode || 'embed',
            techArchitecture: item.techArchitecture || 'Web 網頁應用程式',
            publishedPlatforms: [{ name: 'Web 網頁版', url: cleanUrl }],
            publishIdentity: 'platform',
            isOfficial: true,
            authorId: 'platform',
            authorName: finalAuthorName,
            authorTitle: finalAuthorTitle,
            authorAvatar: PLATFORM_CURATED_AVATAR,
            bounty: 0,
            level: 'L1',
            status: 'open',
          });
          lastCreated = appQ;
        }

        // 2. 若刊登至創新提案
        if (item.destinations.includes('innovation_proposal')) {
          const propQ = createQuestion({
            appName: finalAppName,
            title: finalTitle,
            description: item.description.trim(),
            postType: 'innovation_proposal',
            specialZone: 'create_ideas',
            category: '創新創業',
            subcategory: primaryCategory,
            subcategories: finalCategories,
            tags: item.tags.length > 0
              ? Array.from(new Set([...finalCategories, ...item.tags, '創新提案']))
              : [...finalCategories, '創新提案'],
            coverImage: item.coverImage,
            showCardImage: true,
            cardDisplayImage: item.coverImage,
            demoUrl: cleanUrl,
            externalLink: cleanUrl,
            previewMode: item.previewMode || 'embed',
            techArchitecture: item.techArchitecture || 'Web 網頁應用程式',
            targetGoal: item.targetGoal || '打造流暢直覺且能解決真實痛點的數位體驗',
            referencedPainPoint: item.referencedPainPoint || '傳統流程繁瑣、缺乏直覺操作介面',
            proposalProgressStage: item.proposalProgressStage || 'prototype',
            publishedPlatforms: [{ name: 'Web 網頁版', url: cleanUrl }],
            publishIdentity: 'platform',
            isOfficial: true,
            authorId: 'platform',
            authorName: finalAuthorName,
            authorTitle: finalAuthorTitle,
            authorAvatar: PLATFORM_CURATED_AVATAR,
            bounty: 0,
            level: 'L1',
            status: 'open',
          });
          if (!lastCreated) lastCreated = propQ;
        }

        publishedCount++;
      }

      showCenterToast('🎉 刊登成功！', `已成功上架 ${publishedCount} 件作品/提案`, {
        type: 'success',
        duration: 3500,
      });

      addNotification({
        title: '🚀 快速批量上架成功',
        message: `管理員已成功批量刊登 ${publishedCount} 件作品至指定專區！`,
        type: 'system',
      });

      if (onSuccess && lastCreated) {
        onSuccess(lastCreated);
      }

      handleReset();
      onClose();
    } catch (e: any) {
      console.error('[Publish Error]', e);
      setErrorMessage(e?.message || '刊登發布時發生錯誤，請稍後再試');
    } finally {
      setIsPublishing(false);
    }
  };

  const hasReviewedResults = reviewedItems.length > 0 && !isProcessing;
  const successItems = reviewedItems.filter((i) => i.status === 'success');
  const selectedCount = successItems.filter((i) => i.selectedForPublish).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* 頂部 Header */}
        <div className="px-5 py-3.5 bg-stone-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-black">
              <Sparkles className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2">
                <span>快速上架軟體作品與提案</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-800 text-amber-300 border border-stone-700">
                  AI 智慧抓取
                </span>
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 內容區塊 */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* 錯誤提示 */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage('')}
                className="text-rose-500 hover:text-rose-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 階段 1：輸入網址與參數（尚未解析完成） */}
          {!hasReviewedResults && (
            <div className="space-y-4 max-w-3xl mx-auto py-2">
              {/* 模式切換 Tabs */}
              <div className="flex items-center justify-between gap-3 border-b border-stone-200 pb-3">
                <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setInputMode('single')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      inputMode === 'single'
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    單一網址
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('batch')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      inputMode === 'batch'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>一次多個網址（批量）</span>
                    {parsedBatchUrls.length > 0 && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded-full font-mono">
                        {parsedBatchUrls.length}
                      </span>
                    )}
                  </button>
                </div>

                <div className="text-xs text-stone-500 font-medium">
                  {inputMode === 'single' ? '貼上網址即可自動抓取' : '每行一個網址，自動依序分析'}
                </div>
              </div>

              {/* 刊登目標專區（簡約雙核勾選） */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-black text-stone-700">刊登專區：</span>
                <div className="flex items-center gap-2">
                  {DESTINATION_OPTIONS.map((dest) => {
                    const isChecked = defaultDestinations.includes(dest.id);
                    const Icon = dest.icon;
                    return (
                      <button
                        key={dest.id}
                        type="button"
                        onClick={() => toggleDefaultDestination(dest.id)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                          isChecked
                            ? dest.activeClass
                            : 'border-stone-200 text-stone-400 bg-white hover:border-stone-300'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                            isChecked ? 'bg-current border-transparent' : 'border-stone-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 text-white stroke-[3]" />}
                        </div>
                        <Icon className="w-3.5 h-3.5" />
                        <span>{dest.label}</span>
                      </button>
                    );
                  })}
                </div>
                <span className="text-[11px] text-stone-400">（可複選，同時發布至雙專區）</span>
              </div>

              {/* 分類指定（選填，支援複選） */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-stone-700">分類偏好：</span>
                <button
                  type="button"
                  onClick={() => setPreferredCategories([])}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    preferredCategories.length === 0
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  ✨ AI 自動判定
                </button>
                {CATEGORY_OPTIONS.map((cat) => {
                  const isSelected = preferredCategories.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => togglePreferredCategory(cat.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
                <span className="text-[11px] text-stone-400">（可複選分類，留空則全由 AI 研判）</span>
              </div>

              {/* 網址輸入框 */}
              {inputMode === 'single' ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-stone-700">網站網址</label>
                    {singleUrl && (
                      <button
                        type="button"
                        onClick={() => setSingleUrl('')}
                        className="text-[11px] text-stone-400 hover:text-stone-700 cursor-pointer"
                      >
                        清空
                      </button>
                    )}
                  </div>
                  <input
                    type="url"
                    value={singleUrl}
                    onChange={(e) => setSingleUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isProcessing && singleUrl.trim()) {
                        e.preventDefault();
                        handleStartScraping();
                      }
                    }}
                    placeholder="https://example.com"
                    className={`w-full px-3.5 py-2.5 rounded-xl border focus:ring-2 text-xs font-medium text-stone-900 outline-hidden bg-stone-50/50 ${
                      singleUrlDuplicate
                        ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-100 bg-amber-50/30'
                        : 'border-stone-300 focus:border-indigo-600 focus:ring-indigo-100'
                    }`}
                  />
                  {singleUrlDuplicate ? (
                    <p className="text-[11px] text-amber-800 font-bold flex items-center gap-1.5 bg-amber-50 p-2 rounded-xl border border-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>此網址來源已在平台發布過（與《{singleUrlDuplicate.appName || singleUrlDuplicate.title}》重複），系統將不會交由 AI 分析。</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-stone-400">
                      貼上網址後點擊下方「開始分析」或按 Enter 鍵
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-stone-700">
                      批量網址列表（每行一個網址）
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                        已辨識：{parsedBatchUrls.length} 個網址
                      </span>
                      {batchDuplicateCount > 0 && (
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>含 {batchDuplicateCount} 個重複來源（將自動略過 AI 分析）</span>
                        </span>
                      )}
                      {batchUrlsText && (
                        <button
                          type="button"
                          onClick={() => setBatchUrlsText('')}
                          className="text-[11px] text-stone-400 hover:text-stone-700 cursor-pointer"
                        >
                          清空
                        </button>
                      )}
                    </div>
                  </div>
                  <textarea
                    rows={6}
                    value={batchUrlsText}
                    onChange={(e) => setBatchUrlsText(e.target.value)}
                    placeholder={`https://cursor.com\nhttps://linear.app\nhttps://notion.so`}
                    className="w-full p-3 rounded-2xl border border-stone-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-xs font-mono text-stone-900 outline-hidden bg-stone-50/50 resize-y leading-relaxed"
                  />
                  <p className="text-[11px] text-stone-400">
                    貼上多個網址後，點擊下方「開始批量分析」即可由 AI 自動爬取各網站封面快照並解析資訊（若有重複來源將自動略過）
                  </p>
                </div>
              )}

              {/* 批量處理即時進度清單 */}
              {isProcessing && (
                <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      <span className="text-xs font-black text-indigo-950">
                        正在解析第 {currentProcessingIndex} / {totalToProcess} 個網站...
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-indigo-700">
                      {Math.round((currentProcessingIndex / Math.max(1, totalToProcess)) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-indigo-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                      style={{
                        width: `${(currentProcessingIndex / Math.max(1, totalToProcess)) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 text-[11px]">
                    {reviewedItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-1.5 rounded-lg bg-white/70 border border-indigo-100"
                      >
                        <span className="truncate max-w-[70%] font-mono text-stone-700">
                          {idx + 1}. {item.websiteUrl}
                        </span>
                        {item.status === 'scraping' && (
                          <span className="text-indigo-600 font-bold flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> 分析中
                          </span>
                        )}
                        {item.status === 'success' && (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> 完成
                          </span>
                        )}
                        {item.status === 'error' && (
                          <span className="text-rose-600 font-bold truncate max-w-[120px]">
                            ❌ 失敗
                          </span>
                        )}
                        {item.status === 'pending' && (
                          <span className="text-stone-400 font-medium">排隊中</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 階段 2：解析完成，人工審核與編輯 */}
          {hasReviewedResults && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* 頂部快速工具列 */}
              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>解析完成（共 {reviewedItems.length} 項，成功 {successItems.length} 項）</span>
                  </span>
                  {reviewedItems.length > 1 && (
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {successItems.every((i) => i.selectedForPublish) ? (
                        <>
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>取消全選</span>
                        </>
                      ) : (
                        <>
                          <Square className="w-3.5 h-3.5" />
                          <span>全選待刊登</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 text-stone-400" />
                  <span>重新輸入網址</span>
                </button>
              </div>

              {/* 雙欄：左側列表清單，右側編輯面板 */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* 左側：項目列表（若單項則簡化顯示） */}
                <div className="lg:col-span-4 space-y-2">
                  <div className="text-xs font-black text-stone-600 flex items-center justify-between px-1">
                    <span>待審核清單（點選切換）</span>
                    <span className="text-[11px] text-stone-400 font-medium">已勾選 {selectedCount} 項</span>
                  </div>

                  <div className="max-h-[58vh] overflow-y-auto space-y-2 pr-1">
                    {reviewedItems.map((item, idx) => {
                      const isActive = item.id === (activeItem?.id || '');
                      const isSuccess = item.status === 'success';
                      return (
                        <div
                          key={item.id}
                          onClick={() => isSuccess && setActiveItemId(item.id)}
                          className={`p-2.5 rounded-2xl border transition-all cursor-pointer relative ${
                            isActive
                              ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-200 shadow-xs'
                              : 'bg-white border-stone-200 hover:border-stone-300'
                          } ${!isSuccess ? 'opacity-60 bg-stone-50' : ''}`}
                        >
                          <div className="flex items-start gap-2.5">
                            {/* 發布勾選 Checkbox */}
                            <button
                              type="button"
                              disabled={!isSuccess}
                              onClick={(e) => {
                                e.stopPropagation();
                                setReviewedItems((prev) =>
                                  prev.map((it) =>
                                    it.id === item.id ? { ...it, selectedForPublish: !it.selectedForPublish } : it
                                  )
                                );
                              }}
                              className="mt-0.5 text-stone-400 hover:text-stone-700 shrink-0"
                            >
                              {item.selectedForPublish ? (
                                <CheckSquare className="w-4 h-4 text-indigo-600" />
                              ) : (
                                <Square className="w-4 h-4 text-stone-300" />
                              )}
                            </button>

                            {/* 封面縮圖 */}
                            <div className="w-14 h-10 rounded-lg bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
                              {item.coverImage ? (
                                <img
                                  src={item.coverImage}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-stone-400">
                                  <ImageIcon className="w-4 h-4" />
                                </div>
                              )}
                            </div>

                            {/* 文字資訊 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-black text-stone-900 truncate">
                                  {item.appName || item.title || `第 ${idx + 1} 項`}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveItem(item.id);
                                  }}
                                  className="text-stone-300 hover:text-rose-600 p-0.5"
                                  title="移除此項"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <p className="text-[11px] text-stone-500 truncate mt-0.5">
                                {item.title || item.websiteUrl}
                              </p>

                              {/* 專區與分類標籤 */}
                              <div className="flex items-center gap-1 mt-1 flex-wrap">
                                {(item.categories && item.categories.length > 0 ? item.categories : [item.category]).map((c) => (
                                  <span key={c} className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200/60">
                                    {c}
                                  </span>
                                ))}
                                {item.destinations.includes('vibecoding_app') && (
                                  <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-indigo-100 text-indigo-700">
                                    作品
                                  </span>
                                )}
                                {item.destinations.includes('innovation_proposal') && (
                                  <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-800">
                                    提案
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 右側：選取項目的詳細審核與編輯 */}
                {activeItem && (
                  <div className="lg:col-span-8 space-y-3.5 bg-stone-50/60 p-4 rounded-2xl border border-stone-200">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-black text-stone-900 truncate">
                          審核編輯：{activeItem.appName || activeItem.title}
                        </span>
                        <a
                          href={activeItem.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-indigo-600 hover:underline flex items-center gap-0.5 shrink-0"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>開啟網站</span>
                        </a>
                      </div>

                      {/* 目標專區單項勾選 */}
                      <div className="flex items-center gap-1.5">
                        {DESTINATION_OPTIONS.map((dest) => {
                          const isChecked = activeItem.destinations.includes(dest.id);
                          return (
                            <button
                              key={dest.id}
                              type="button"
                              onClick={() => {
                                const cur = activeItem.destinations;
                                updateActiveItem({
                                  destinations: cur.includes(dest.id)
                                    ? cur.filter((d) => d !== dest.id)
                                    : [...cur, dest.id],
                                });
                              }}
                              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                isChecked
                                  ? 'bg-white border-indigo-500 text-indigo-700 shadow-2xs'
                                  : 'bg-stone-100 text-stone-400 border-stone-200'
                              }`}
                            >
                              {dest.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 兩欄網格：名稱與標題 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-black text-stone-700">
                          軟體名稱 (原語言，例如 Notion, Cursor)
                        </label>
                        <input
                          type="text"
                          value={activeItem.appName}
                          onChange={(e) => updateActiveItem({ appName: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-900 bg-white outline-hidden focus:border-indigo-600"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-black text-stone-700">
                          作品展示標題 (繁體中文，避免出現作品名稱)
                        </label>
                        <input
                          type="text"
                          value={activeItem.title}
                          onChange={(e) => updateActiveItem({ title: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-900 bg-white outline-hidden focus:border-indigo-600"
                        />
                      </div>
                    </div>

                    {/* 描述說明 */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-black text-stone-700">
                        作品簡述 (繁體中文)
                      </label>
                      <textarea
                        rows={3}
                        value={activeItem.description}
                        onChange={(e) => updateActiveItem({ description: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-stone-300 text-xs text-stone-800 bg-white outline-hidden focus:border-indigo-600 resize-none leading-relaxed"
                      />
                    </div>

                    {/* 若勾選創新提案，呈現痛點與目標 */}
                    {activeItem.destinations.includes('innovation_proposal') && (
                      <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-black text-amber-900">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                          <span>創新提案痛點與效益（AI 已自動生成中文）</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-stone-600 block mb-0.5">解決之用戶痛點</span>
                            <input
                              type="text"
                              value={activeItem.referencedPainPoint || ''}
                              onChange={(e) => updateActiveItem({ referencedPainPoint: e.target.value })}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 text-xs text-stone-900 bg-white outline-hidden"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-stone-600 block mb-0.5">提案目標與效益</span>
                            <input
                              type="text"
                              value={activeItem.targetGoal || ''}
                              onChange={(e) => updateActiveItem({ targetGoal: e.target.value })}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 text-xs text-stone-900 bg-white outline-hidden"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 分類與封面微調 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-black text-stone-700 flex items-center justify-between">
                          <span>分類（可複選）</span>
                          {(activeItem.categories?.length || 0) > 1 && (
                            <span className="text-[10px] text-purple-600 font-bold">已選 {activeItem.categories?.length} 個分類</span>
                          )}
                        </label>
                        <div className="flex gap-1 flex-wrap">
                          {CATEGORY_OPTIONS.map((cat) => {
                            const currentCats = activeItem.categories && activeItem.categories.length > 0
                              ? activeItem.categories
                              : [activeItem.category || '網站程式'];
                            const isSelected = currentCats.includes(cat.id);
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                  let next: SoftwareCategory[];
                                  if (currentCats.includes(cat.id)) {
                                    // 至少保留一個分類
                                    next = currentCats.length > 1 ? currentCats.filter((c) => c !== cat.id) : currentCats;
                                  } else {
                                    next = [...currentCats, cat.id];
                                  }
                                  updateActiveItem({
                                    categories: next,
                                    category: next[0] || '網站程式',
                                  });
                                }}
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                  isSelected
                                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                                <span>{cat.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-black text-stone-700 flex items-center justify-between">
                          <span>卡片封面來源</span>
                          <label className="text-[10px] text-indigo-600 hover:underline cursor-pointer flex items-center gap-0.5">
                            <Upload className="w-2.5 h-2.5" />
                            <span>上傳新封面</span>
                            <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                          </label>
                        </label>
                        <div className="flex gap-1.5">
                          {activeItem.screenshotUrl && (
                            <button
                              type="button"
                              onClick={() => updateActiveItem({ coverImage: activeItem.screenshotUrl })}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                                activeItem.coverImage === activeItem.screenshotUrl
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-white border-stone-200 text-stone-600'
                              }`}
                            >
                              📸 首頁截圖
                            </button>
                          )}
                          {activeItem.ogImage && (
                            <button
                              type="button"
                              onClick={() => updateActiveItem({ coverImage: activeItem.ogImage! })}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                                activeItem.coverImage === activeItem.ogImage
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-white border-stone-200 text-stone-600'
                              }`}
                            >
                              🖼️ 網頁 og:image
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 標籤 */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-black text-stone-700">標籤</label>
                      <div className="flex flex-wrap gap-1 items-center">
                        {activeItem.tags.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-200/80 text-[11px] font-semibold text-stone-700"
                          >
                            <span>#{t}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(t)}
                              className="text-stone-400 hover:text-stone-700"
                            >
                              ×
                            </button>
                          </span>
                        ))}
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
                          placeholder="+ 標籤"
                          className="px-2 py-0.5 text-[11px] rounded-md border border-stone-300 w-16 focus:w-24 outline-hidden bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 底部按鈕列 */}
        <div className="px-5 py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-stone-500 font-medium">
            {hasReviewedResults ? (
              <span>已勾選 {selectedCount} 件作品/提案準備發布</span>
            ) : (
              <span>支援批量輸入多個網址，AI 自動解析後由人工快速審核</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isPublishing}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold cursor-pointer"
            >
              取消
            </button>

            {hasReviewedResults ? (
              <button
                type="button"
                disabled={isPublishing || selectedCount === 0}
                onClick={handlePublishAll}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-300 text-white text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>刊登發布中...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>確認刊登已選項目 ({selectedCount} 件) 🚀</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled={isProcessing || (inputMode === 'single' ? !singleUrl.trim() : parsedBatchUrls.length === 0)}
                onClick={handleStartScraping}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-stone-300 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>分析中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>
                      {inputMode === 'single' ? '開始分析' : `開始批量分析 (${parsedBatchUrls.length})`}
                    </span>
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

export default AdminQuickOnboardAppModal;
