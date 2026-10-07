import React, { useState, useEffect } from 'react';
import { Category, ProblemLevel, Question, CATEGORY_HIERARCHY, PostType, DeliveryPhase } from '../types';
import { useApp } from '../context/AppContext';
import { LEVEL_CONFIGS } from '../data/mockData';
import { AIAnalysisResult } from '../services/aiService';
import { marketAdvisorAgent } from '../services/marketAdvisorAgent';
import { IdeaXLogo } from './IdeaXLogo';
import { HelpTooltip } from './HelpTooltip';
import {
  X,
  Sparkles,
  Lightbulb,
  AlertCircle,
  Clock,
  Coins,
  CheckCircle2,
  Tag,
  Loader2,
  ArrowLeft,
  Layers,
  ShieldCheck,
  Flame,
  MessageCircle,
  Target,
  CreditCard,
  Gift,
  Megaphone,
} from 'lucide-react';

interface CreateQuestionModalProps {
  onClose: () => void;
  onSuccess: (created: Question) => void;
  isFullPage?: boolean;
  initialCategory?: Category;
  initialSubcategory?: string;
  initialPostType?: PostType;
  initialPublishIdentity?: 'admin' | 'platform';
}

const CATEGORIES: Category[] = [
  '創新創業',
  '專業問題',
  '學術探討',
  '日常疑難',
];

export const CreateQuestionModal: React.FC<CreateQuestionModalProps> = ({
  onClose,
  onSuccess,
  isFullPage = false,
  initialCategory,
  initialSubcategory,
  initialPostType = 'seek_solution',
  initialPublishIdentity = 'admin',
}) => {
  const { currentUser, createQuestion, hasAgreedTerms, recordTermsAgreement, openAboutModal, isNoPaymentMode, isRaceMode } = useApp();

  const [publishIdentity, setPublishIdentity] = useState<'admin' | 'platform'>(initialPublishIdentity || 'admin');

  const hasAgreedQuestioner = hasAgreedTerms('questioner');
  const [agreeQuestionerTerms, setAgreeQuestionerTerms] = useState(hasAgreedQuestioner);
  const [termsError, setTermsError] = useState<string | null>(null);

  const [postType, setPostType] = useState<PostType>(initialPostType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category | ''>(initialCategory || '創新創業');
  const [subcategory, setSubcategory] = useState<string>(
    initialSubcategory && initialSubcategory !== '全部' ? initialSubcategory : '資訊科技'
  );
  const [tagsInput, setTagsInput] = useState('');
  const isPainPoint = initialPostType === 'pain_point' || postType === 'pain_point';
  const lockToL0 = (isRaceMode && isPainPoint) || isPainPoint || initialPostType === 'chat_discussion';
  const [level, setLevel] = useState<ProblemLevel>(
    lockToL0 ? 'L0' : 'L2'
  );
  const [bounty, setBounty] = useState<number>(
    lockToL0 ? 0 : 500
  );
  const [deadlineDays, setDeadlineDays] = useState<number>(14);
  const [paymentMethod, setPaymentMethod] = useState<'信用卡' | 'LINE Pay' | 'Apple Pay' | 'ATM 轉帳'>('信用卡');

  // 多階段交付設定
  const [enablePhasedDelivery, setEnablePhasedDelivery] = useState(false);
  const [phase1Points, setPhase1Points] = useState<number>(200);
  const [phase2Points, setPhase2Points] = useState<number>(300);

  // 招募中置頂推播 (每次推播 $50)
  const [isPromotedWithMegaphone, setIsPromotedWithMegaphone] = useState(false);
  // 外部雲端工具連結 (Google Drive, Dropbox, Figma 等)
  const [externalLink, setExternalLink] = useState('');

  // AI Agent 市場顧問 智慧分析與分類標籤狀態
  const [isAnalyzingWithAi, setIsAnalyzingWithAi] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<AIAnalysisResult | null>(null);

  const handleAutoAnalyzeWithAi = async () => {
    if (title.trim().length < 5 && description.trim().length < 10) {
      setTermsError('請先輸入至少 5 個字的問題標題或部分描述，讓市場顧問為您精準分析！');
      return;
    }
    setIsAnalyzingWithAi(true);
    setTermsError(null);
    try {
      const res = await marketAdvisorAgent.classifyAndTagQuestion(
        title.trim() || '專案商業模式與痛點分析',
        description.trim() || title.trim()
      );
      if (res) {
        setAiAnalysisResult(res);
        if (res.category) {
          setCategory(res.category as Category);
        }
        if (res.subcategory) {
          setSubcategory(res.subcategory);
        }
        if (res.tags && res.tags.length > 0) {
          setTagsInput(res.tags.map((t) => `#${t}`).join(' '));
        }
        if (postType === 'seek_solution' && res.level) {
          setLevel(res.level);
          if (res.suggestedBounty && (bounty === 500 || bounty === 0)) {
            setBounty(res.suggestedBounty);
          }
        }
      }
    } catch (err) {
      console.warn('Manual AI auto-analyze failed:', err);
    } finally {
      setIsAnalyzingWithAi(false);
    }
  };

  // Sync postType selection with default level & bounty
  const handlePostTypeChange = (type: PostType) => {
    setPostType(type);
    if (type === 'chat_discussion') {
      setLevel('L0');
      setBounty(0);
    } else if (type === 'pain_point') {
      // 痛點免費提出：預設 L0，0 懸賞
      setLevel('L0');
      setBounty(0);
    } else {
      if (bounty === 0) setBounty(500);
      if (level === 'L0') setLevel('L2');
    }
  };

  useEffect(() => {
    if (initialPublishIdentity) {
      setPublishIdentity(initialPublishIdentity);
    }
  }, [initialPublishIdentity]);

  useEffect(() => {
    if (initialPostType) {
      handlePostTypeChange(initialPostType);
    }
  }, [initialPostType]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const effectiveBounty = isNoPaymentMode ? 0 : (enablePhasedDelivery && bounty > 0 ? (phase1Points + phase2Points) : bounty);
  const currentBounty = isNoPaymentMode ? 0 : (Number(effectiveBounty) || 0);

  // Update subcategory whenever category changes
  const handleCategoryChange = (newCat: Category | '') => {
    setCategory(newCat);
    setSubcategory('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentUser.id === 'user-guest') {
      setTermsError('登錄帳號及個人資料為提問之必要條件，請先登入會員帳號（登入即代表同意全站一般服務條款）');
      return;
    }

    const isProfileComplete = Boolean(
      currentUser.hasCompletedProfile !== false &&
      (currentUser.phone || currentUser.email) &&
      (currentUser.industry || currentUser.jobTitle || currentUser.title)
    );
    if (!isProfileComplete || currentUser.hasCompletedProfile === false) {
      setTermsError('⚠️ 個人資料為發布問題之必要條件！您在註冊時跳過了個人資料填寫，發布問題涉及履約通知，請先前往「會員中心 → 基本資料」補填完整個人資料。');
      return;
    }

    const isL0OrChatType = postType === 'chat_discussion';
    const titleMin = isL0OrChatType ? 8 : 10;
    const titleMax = isL0OrChatType ? 30 : 50;
    const descMin = isL0OrChatType ? 20 : 30;
    const descMax = isL0OrChatType ? 300 : 3000;

    const titleLen = title.trim().length;
    if (titleLen < titleMin || titleLen > titleMax) {
      setTermsError(
        isL0OrChatType
          ? `【閒聊討論/L0】問題標題需介於 8 ~ 30 個字（目前已輸入 ${titleLen} 字）`
          : `問題標題需介於 10 ~ 50 個字（目前已輸入 ${titleLen} 字）`
      );
      return;
    }

    const descLen = description.trim().length;
    if (descLen < descMin || descLen > descMax) {
      setTermsError(
        isL0OrChatType
          ? `【閒聊討論/L0】問題內容需介於 20 ~ 300 個字（目前已輸入 ${descLen} 字）`
          : `問題內容需介於 30 ~ 3000 個字（目前已輸入 ${descLen} 字）`
      );
      return;
    }

    if (postType === 'seek_solution' && !agreeQuestionerTerms) {
      setTermsError('發布問題前，請先勾選確認已閱讀並同意 <<提問會員服務條款>> 與 <<一般服務條款>>');
      return;
    }

    setTermsError(null);
    setIsSubmitting(true);

    try {
      let finalCategory: Category = (category || '創新創業') as Category;
      let finalSubcategory = subcategory;
      let finalTags = tagsInput
        .split(/[#,\s，、]+/)
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      // 一律確保調用 AI Agent「市場顧問」進行深度分類、標籤萃取與解題維度歸納
      let finalAiResult: AIAnalysisResult | null = aiAnalysisResult;
      if (!finalAiResult) {
        try {
          const res = await marketAdvisorAgent.classifyAndTagQuestion(title.trim(), description.trim());
          if (res) {
            finalAiResult = res;
          }
        } catch (err) {
          console.warn('Market Advisor Agent classification fallback:', err);
        }
      }

      if (finalAiResult) {
        if (!category && finalAiResult.category) {
          finalCategory = finalAiResult.category as Category;
        }
        if (!subcategory) {
          finalSubcategory = finalAiResult.subcategory || (CATEGORY_HIERARCHY[finalCategory]?.[0] || '一般專案');
        }
        if (finalTags.length < 2 && finalAiResult.tags && finalAiResult.tags.length > 0) {
          finalTags = Array.from(new Set([...finalTags, ...finalAiResult.tags])).filter(Boolean).slice(0, 5);
        }
      }

      if (!finalCategory) finalCategory = '創新創業';
      if (!finalSubcategory) finalSubcategory = CATEGORY_HIERARCHY[finalCategory]?.[0] || '一般專案';
      if (finalTags.length === 0) {
        finalTags = [finalCategory, finalSubcategory].filter(Boolean);
      }
      if (finalTags.length > 5) {
        finalTags = finalTags.slice(0, 5);
      }

      const deadline = new Date(Date.now() + deadlineDays * 86400000).toISOString().split('T')[0];

      const phases: DeliveryPhase[] | undefined = enablePhasedDelivery && currentBounty > 0
        ? [
            {
              id: `phase-${Date.now()}-1`,
              phaseNumber: 1,
              title: '第 1 階段：架構診斷與方向大綱',
              description: '提出問題核心排查、初步分析與可行解題架構',
              points: phase1Points,
              status: 'in_progress',
            },
            {
              id: `phase-${Date.now()}-2`,
              phaseNumber: 2,
              title: '第 2 階段：深度落地方案與交付',
              description: '完整模型、詳細實操指引或檔案技術報告',
              points: phase2Points,
              status: 'pending_acceptance',
            },
          ]
        : undefined;

      const isPlatformOfficial = currentUser.role === 'admin' && publishIdentity === 'platform';
      const authorId = isPlatformOfficial ? 'platform-ideax-official' : currentUser.id;
      const authorName = isPlatformOfficial ? '💡IdeaX 官方帳號💡' : currentUser.name;
      const authorAvatar = isPlatformOfficial
        ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150'
        : currentUser.avatar;
      const authorTitle = isPlatformOfficial
        ? 'IdeaX 官方營運團隊'
        : (currentUser.role === 'questioner' && !currentUser.showQuestionerTitle)
        ? undefined
        : (currentUser.title || (currentUser.role === 'admin' ? '平台管理員' : undefined));

      const finalDescription = externalLink.trim()
        ? `${description.trim()}\n\n【外部雲端參考資料 (Google Drive / Dropbox / Figma)】\n${externalLink.trim()}`
        : description.trim();

      const newQuestion = createQuestion({
        title,
        description: finalDescription,
        category: finalCategory,
        subcategory: finalSubcategory,
        tags: finalTags,
        level,
        bounty: currentBounty,
        deadline,
        postType,
        isFeatured: isPromotedWithMegaphone,
        authorId,
        authorName,
        authorAvatar,
        authorTitle,
        isOfficial: isPlatformOfficial,
        publishIdentity,
        phases,
        aiAnalysis: finalAiResult
          ? {
              summary: finalAiResult.summary,
              structuredNeed: finalAiResult.structuredNeed,
              solverProfileAdvice: finalAiResult.solverProfileAdvice,
              marketFitRating: '高商業價值',
            }
          : undefined,
        aiPreliminaryReport: undefined, // 關鍵規則：報告未有首位解鎖前不預先生成，待首位點擊解鎖再即時呼叫 AI 生成並存入資料庫
      });

      if (agreeQuestionerTerms) {
        recordTermsAgreement('questioner');
      }

      onSuccess(newQuestion);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentSubcategories = category ? (CATEGORY_HIERARCHY[category] || []) : [];
  const levelConfig = LEVEL_CONFIGS[level] || LEVEL_CONFIGS.L2;

  const content = (
    <div className={`bg-white rounded-2xl sm:rounded-3xl border border-stone-200 shadow-sm w-full ${isFullPage ? 'max-w-3xl mx-auto my-2' : 'max-w-2xl max-h-[96vh] sm:max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150'}`}>
      {/* Header */}
      <div className="p-3 sm:p-6 border-b border-stone-200 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {isFullPage && (
            <button
              onClick={onClose}
              className="p-2 -ml-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="返回問題市場"
            >
              <ArrowLeft className="w-5 h-5 text-amber-600" />
              <span className="hidden sm:inline">返回問題市場</span>
            </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shadow-xs shrink-0">
            <IdeaXLogo variant="bulb" size="xs" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900">提出問題或痛點 Idea</h2>
            <p className="text-xs text-stone-500">痛點免費提出 • 專家自訂解鎖金額 • 第三方支付安全拆款</p>
          </div>
        </div>
        {!isFullPage && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className={`p-2.5 sm:p-6 space-y-4 sm:space-y-5 ${!isFullPage ? 'overflow-y-auto' : ''}`}>
        {/* 管理員專用：發布身分切換（管理員身分 vs 平台身分） */}
        {currentUser.role === 'admin' && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-amber-50/60 to-purple-50 border border-purple-200 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>發布身分選擇（管理員專屬）*</span>
              </label>
              <span className="text-[11px] font-bold text-purple-800">
                {publishIdentity === 'platform' ? '目前為【💡IdeaX 官方帳號💡】' : '目前為【管理員個人身分】'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: 管理員身分 */}
              <button
                type="button"
                onClick={() => setPublishIdentity('admin')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  publishIdentity === 'admin'
                    ? 'bg-white border-purple-600 ring-2 ring-purple-300 shadow-xs'
                    : 'bg-white/70 hover:bg-white border-stone-200 opacity-75'
                }`}
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-10 h-10 rounded-full object-cover border border-stone-200 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs text-stone-900 truncate">
                      {currentUser.name}
                    </span>
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-100 text-purple-900 border border-purple-300 shrink-0">
                      管理員身分
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-500 mt-0.5 leading-tight">
                    以管理員名義發布，與社群成員親切互動交流
                  </p>
                </div>
              </button>

              {/* Option 2: 平台身分 */}
              <button
                type="button"
                onClick={() => setPublishIdentity('platform')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  publishIdentity === 'platform'
                    ? 'bg-amber-500 text-stone-950 border-amber-600 ring-2 ring-amber-300 shadow-xs'
                    : 'bg-white/70 hover:bg-white border-stone-200 opacity-75'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-stone-950 text-amber-400 flex items-center justify-center font-black shrink-0 border border-amber-400 shadow-2xs text-lg">
                  💡
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-black text-xs truncate ${publishIdentity === 'platform' ? 'text-stone-950' : 'text-stone-900'}`}>
                      💡IdeaX 官方帳號💡
                    </span>
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-stone-950 text-amber-300 shrink-0">
                      官方帳號
                    </span>
                  </div>
                  <p className={`text-[10px] mt-0.5 leading-tight ${publishIdentity === 'platform' ? 'text-stone-900 font-medium' : 'text-stone-500'}`}>
                    以平台官方頭像與名義發布全站公告與活動
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 1. 發布類型選擇（尋求解答 / 提出痛點 / 閒聊討論） */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-amber-600" />
            <span>提問類型 *</span>
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {/* 尋求解答 */}
            <button
              type="button"
              onClick={() => handlePostTypeChange('seek_solution')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                postType === 'seek_solution'
                  ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-300 shadow-2xs'
                  : 'bg-white hover:bg-stone-50 border-stone-200'
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center font-black">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-stone-900">尋求解答</h4>
                <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                  自訂懸賞尋找破局方案
                </p>
              </div>
            </button>

            {/* 提出痛點 (免費提出，下方可留方案解鎖) */}
            <button
              type="button"
              onClick={() => handlePostTypeChange('pain_point')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                postType === 'pain_point'
                  ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-300 shadow-2xs'
                  : 'bg-white hover:bg-stone-50 border-stone-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-800 flex items-center justify-center font-black">
                  <Flame className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black bg-rose-600 text-white px-1.5 py-0.2 rounded-md shadow-2xs">
                  免費提出
                </span>
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-stone-900">提出痛點</h4>
                <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                  0元免費提痛點・專家留方案
                </p>
              </div>
            </button>

            {/* 閒聊討論 */}
            <button
              type="button"
              onClick={() => handlePostTypeChange('chat_discussion')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                postType === 'chat_discussion'
                  ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-300 shadow-2xs'
                  : 'bg-white hover:bg-stone-50 border-stone-200'
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-800 flex items-center justify-center font-black">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-stone-900">閒聊討論</h4>
                <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                  L0 交流無門檻探討
                </p>
              </div>
            </button>
          </div>

          {/* 痛點免費提出特別提示 */}
          {postType === 'pain_point' && (
            <div className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-950 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-extrabold text-rose-900 text-xs">痛點免服務費 0 元發布</span>
              </div>
              <HelpTooltip
                title="痛點免費提出機制"
                content="發布痛點完全免服務費、免付懸賞金額（NT$ 0 免費上架）。各領域專家可在下方提交落地解決方案並自訂解鎖金額，提問者或其他人需透過第三方支付解鎖後查閱。"
              />
            </div>
          )}
        </div>

        {/* Question Title */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <span>{postType === 'chat_discussion' ? '討論標題 *' : '問題標題 / 核心痛點 *'}</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                postType === 'chat_discussion' 
                  ? 'text-blue-800 bg-blue-100/70 border-blue-300/80' 
                  : 'text-amber-800 bg-amber-100/70 border-amber-300/80'
              }`}>
                {postType === 'chat_discussion' ? '8 ~ 30 字' : '10 ~ 50 字'}
              </span>
            </label>
            <span className={`text-[11px] font-mono ${
              title.trim().length < (postType === 'chat_discussion' ? 8 : 10) || title.trim().length > (postType === 'chat_discussion' ? 30 : 50)
                ? 'text-amber-600 font-bold' 
                : 'text-stone-400'
            }`}>
              {title.trim().length} / {postType === 'chat_discussion' ? 30 : 50} 字
            </span>
          </div>
          <input
            type="text"
            required
            minLength={postType === 'chat_discussion' ? 8 : 10}
            maxLength={postType === 'chat_discussion' ? 30 : 50}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (termsError) setTermsError(null);
            }}
            placeholder={
              postType === 'chat_discussion'
                ? '例如：大家對於遠距辦公溝通效率有什麼看法？'
                : postType === 'pain_point'
                ? '例如：傳統實體早餐店如何解決上班尖峰排隊流失與備料浪費？'
                : '例如：校園共享雨傘如何從租借收入轉向商家合作模式？'
            }
            className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-stone-900 text-sm font-medium outline-none transition-all"
          />
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <span>{postType === 'chat_discussion' ? '討論內容與交流背景 *' : '問題背景與具體情境需求 *'}</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                postType === 'chat_discussion' 
                  ? 'text-blue-800 bg-blue-100/70 border-blue-300/80' 
                  : 'text-amber-800 bg-amber-100/70 border-amber-300/80'
              }`}>
                {postType === 'chat_discussion' ? '20 ~ 300 字' : '30 ~ 3000 字'}
              </span>
            </label>
            <span className={`text-[11px] font-mono ${
              description.trim().length < (postType === 'chat_discussion' ? 20 : 30) || description.trim().length > (postType === 'chat_discussion' ? 300 : 3000)
                ? 'text-amber-600 font-bold' 
                : 'text-stone-400'
            }`}>
              {description.trim().length} / {postType === 'chat_discussion' ? 300 : 3000} 字
            </span>
          </div>
          <textarea
            required
            minLength={postType === 'chat_discussion' ? 20 : 30}
            maxLength={postType === 'chat_discussion' ? 300 : 3000}
            rows={postType === 'chat_discussion' ? 3 : 4}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (termsError) setTermsError(null);
            }}
            placeholder={
              postType === 'chat_discussion'
                ? '簡述您想與大家交流的生活經驗、職場觀察或看法探討（20 ~ 300 字）...'
                : postType === 'pain_point'
                ? '詳述您在日常工作、生活或商業運營中發現的真實痛點與困境，讓專業解題者能看清癥結，為您提供專屬落地解法...'
                : '詳述您的團隊現況、試過的方法、面臨的瓶頸，以及希望解答者提供的方案維度（如財務模型、合作條款、執行步驟等）...'
            }
            className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-stone-900 text-sm font-normal outline-none transition-all leading-relaxed"
          />
        </div>

        {/* 檔案資料儲存規則與外部雲端工具連結（Google Drive、Dropbox、Figma） */}
        <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
              <span>補充參考資料 / 外部雲端共享連結（選填）</span>
            </span>
            <span className="text-[10px] text-stone-400">支援 Google Drive / Dropbox / Figma</span>
          </div>

          <input
            type="url"
            value={externalLink}
            onChange={(e) => setExternalLink(e.target.value)}
            placeholder="例如：https://drive.google.com/... 或 https://www.figma.com/file/..."
            className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 text-xs text-stone-800 outline-none bg-white font-mono"
          />

          <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-950 space-y-0.5 leading-relaxed">
            <div className="font-bold flex items-center gap-1 text-amber-900">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>【檔案儲存與安全規則・請用戶自行備份】</span>
            </div>
            <p className="text-stone-600 font-normal">
              平台支援情境圖片與輕量參考檔案；<strong>平台不對用戶上傳之資料、檔案負保管責任，請用戶務必自行妥善留存原始備份</strong>。大型檔案（如高解析影音、規格書、設計原始檔）<strong>請善用 Google Drive、Dropbox、Figma 等外部雲端工具之共享連結</strong>。
            </p>
          </div>
        </div>

        {/* AI Agent「市場顧問」一鍵智慧分析與標籤帶入工具列 */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-100/40 to-stone-50 border border-amber-300/80 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-400 text-stone-950 flex items-center justify-center font-black shadow-xs shrink-0">
                <Sparkles className="w-3.5 h-3.5 fill-stone-950" />
              </div>
              <div>
                <h4 className="text-xs font-black text-stone-900">AI Agent「市場顧問」自動分析</h4>
                <p className="text-[10px] text-stone-500">依題意深度剖析痛點，自動帶入最佳領域、標籤與建議解題維度</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAutoAnalyzeWithAi}
              disabled={isAnalyzingWithAi}
              className="px-3.5 py-1.5 rounded-xl text-xs font-black text-stone-950 bg-amber-400 hover:bg-amber-300 active:scale-95 transition-all cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {isAnalyzingWithAi ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>市場顧問分析中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 fill-stone-950" />
                  <span>一鍵自動分析與自動標籤</span>
                </>
              )}
            </button>
          </div>

          {/* AI 即時分析結果預覽卡片 */}
          {aiAnalysisResult && (
            <div className="p-3 rounded-xl bg-white/90 border border-amber-200 text-xs space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-300">
                    建議領域：{aiAnalysisResult.category} › {aiAnalysisResult.subcategory}
                  </span>
                  <span className="text-[10px] font-bold bg-stone-100 text-stone-800 px-2 py-0.5 rounded-md">
                    等級建議：{aiAnalysisResult.level}（NT$ {aiAnalysisResult.suggestedBounty?.toLocaleString()}）
                  </span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  已自動適配領域與標籤
                </span>
              </div>

              <p className="text-[11px] text-stone-700 leading-relaxed font-normal bg-stone-50/80 p-2 rounded-lg border border-stone-200/60">
                <strong>痛點診斷：</strong>{aiAnalysisResult.summary}
              </p>

              {aiAnalysisResult.structuredNeed && aiAnalysisResult.structuredNeed.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-stone-600 block">建議解答者應涵蓋之 3 大關鍵維度：</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    {aiAnalysisResult.structuredNeed.map((need, i) => (
                      <div key={i} className="text-[10px] p-1.5 bg-amber-50 text-amber-950 rounded-md border border-amber-200/60 flex items-center gap-1 font-medium">
                        <span className="w-3.5 h-3.5 rounded-full bg-amber-200 text-amber-900 text-[9px] font-black flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="truncate">{need}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Category & Subcategory */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-stone-700">主領域</label>
              <span className="text-[10px] text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded font-bold">
                未選將由「市場顧問」自動判定
              </span>
            </div>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value as Category | '')}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs font-semibold text-stone-800 outline-none focus:border-amber-500"
            >
              <option value="">請選擇主領域（未選由「市場顧問」自動判定）</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-stone-700">子領域</label>
              <span className="text-[10px] text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded font-bold">
                未選將由「市場顧問」自動判定
              </span>
            </div>
            <select
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs font-semibold text-stone-800 outline-none focus:border-amber-500"
            >
              <option value="">
                {category ? '請選擇子領域（未選由「市場顧問」自動判定）' : '請先選主領域（未選由「市場顧問」自動判定）'}
              </option>
              {currentSubcategories.map((sc) => (
                <option key={sc} value={sc}>
                  {sc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tags */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-stone-400" />
              <span>關鍵字標籤 (2~5 個)</span>
            </label>
            <span className="text-[11px] text-stone-400">留空時由 AI 自動適配生成</span>
          </div>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="例如：#商業模式 #市場驗證 #產品策略（留空將由 AI 自動適配生成）"
            className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:border-amber-500 text-xs font-medium outline-none placeholder:text-stone-400"
          />
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-[10px] text-stone-400 font-bold">推薦標籤：</span>
            {[
              '團隊協作',
              '解題黑客松',
              '商業模式',
              'AI應用',
              '創業痛點',
              '行銷增長',
              '系統架構',
              '合約法律',
            ].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  const currentTags = tagsInput.split(/[\s,，#]+/).filter(Boolean);
                  if (!currentTags.includes(tag)) {
                    setTagsInput(tagsInput ? `${tagsInput} #${tag}` : `#${tag}`);
                  }
                }}
                className="px-2 py-0.5 rounded-lg bg-stone-100 hover:bg-amber-100 hover:text-amber-950 text-stone-600 text-[10px] font-bold transition-colors cursor-pointer border border-stone-200/80"
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Problem Level & Bounty Configuration (無金流模式下全站免費提問) */}
        {isNoPaymentMode ? (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 text-xs font-bold text-amber-950 flex items-center gap-2.5 shadow-2xs">
            <Coins className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <div className="font-black text-amber-900">【⚡ 無金流模式運作中】：全站免費提問與深度交流</div>
              <div className="text-[11px] text-amber-800/80 font-normal mt-0.5">
                此模式下所有會員均可免費發布問題與提供解答，無須設定點數、支付懸賞金或負擔金流服務費。
              </div>
            </div>
          </div>
        ) : postType !== 'chat_discussion' && (
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-600" />
              <h3 className="font-extrabold text-sm text-stone-900">
                {postType === 'pain_point' ? '痛點懸賞設定（可免費提出）' : '問題分級與懸賞金額'}
              </h3>
            </div>
            <span className="text-[11px] text-amber-700 font-semibold">
              {postType === 'pain_point'
                ? '可選 NT$ 0 免費提出，也可額外加碼懸賞'
                : '等級越高，吸引愈高階的產業專家解答'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {(['L0', 'L1', 'L2', 'L3', 'L4'] as ProblemLevel[]).map((lvl) => {
              const cfg = LEVEL_CONFIGS[lvl];
              const isSelected = level === lvl;
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => {
                    setLevel(lvl);
                    if (lvl === 'L0') setBounty(0);
                    else if (lvl === 'L1') setBounty(100);
                    else if (lvl === 'L2') setBounty(500);
                    else if (lvl === 'L3') setBounty(1500);
                    else if (lvl === 'L4') setBounty(3000);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-300/50 shadow-2xs'
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-xs text-stone-900">{lvl}</span>
                    <span className="text-[10px] text-stone-500 truncate">{cfg.name}</span>
                  </div>
                  <div className="text-[11px] font-bold text-amber-700 font-mono truncate">
                    {cfg.rangeText}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bounty Input or Free Notice */}
          {level !== 'L0' ? (
            <div className="mt-3 p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-xs font-bold text-stone-800">
                  【{level} {levelConfig.name}】懸賞金額（{levelConfig.rangeText}）：
                </span>
                <HelpTooltip
                  title="懸賞資金託管說明"
                  content="買方透過第三方支付安全託管，採納時自動拆款撥付至解答者帳戶（服務費由解答者吸收，提問者不另加收服務費）。"
                />
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-xs text-stone-400 font-mono">NT$</span>
                <input
                  type="number"
                  min={levelConfig.minPrice}
                  max={levelConfig.maxPrice}
                  step="any"
                  value={bounty}
                  onChange={(e) => setBounty(Number(e.target.value))}
                  className="w-32 px-2.5 py-1.5 rounded-lg border border-amber-400 text-sm font-black text-amber-900 text-right font-mono outline-none focus:border-amber-600 bg-white shadow-2xs"
                />
              </div>
            </div>
          ) : (
            <div className="mt-2.5 px-3.5 py-2.5 rounded-xl bg-white border border-stone-200 text-xs text-stone-600 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-stone-800">L0 免費提出（NT$ 0）</span>
                <HelpTooltip
                  title="免費提出說明"
                  content="無門檻免費發布痛點或討論，專家仍可在下方提交付費落地方案！"
                />
              </div>
              <span className="text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                免付懸賞金
              </span>
            </div>
          )}

          {/* 多階段交付設定開關 */}
          {level !== 'L0' && (
            <div className="mt-3 p-3.5 rounded-xl bg-white border border-stone-200 space-y-2.5">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-stone-900">開啟分階段交付計畫（Phased Delivery）</span>
                  <HelpTooltip
                    title="分階段交付說明"
                    content="按階段進行驗收放款，第三方金流分批自動撥款，降低交付風險。"
                  />
                </div>
                <input
                  type="checkbox"
                  checked={enablePhasedDelivery}
                  onChange={(e) => setEnablePhasedDelivery(e.target.checked)}
                  className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                />
              </label>

              {enablePhasedDelivery && (
                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-stone-700 font-semibold">
                    <span>第 1 階段（架構診斷與核心大綱）：</span>
                    <div className="flex items-center gap-1 font-mono">
                      <span className="text-stone-400">NT$</span>
                      <input
                        type="number"
                        value={phase1Points}
                        onChange={(e) => setPhase1Points(Math.max(50, Number(e.target.value)))}
                        className="w-24 px-2 py-0.5 border border-stone-300 rounded text-right font-bold bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-stone-700 font-semibold">
                    <span>第 2 階段（深度落地實操與驗收）：</span>
                    <div className="flex items-center gap-1 font-mono">
                      <span className="text-stone-400">NT$</span>
                      <input
                        type="number"
                        value={phase2Points}
                        onChange={(e) => setPhase2Points(Math.max(50, Number(e.target.value)))}
                        className="w-24 px-2 py-0.5 border border-stone-300 rounded text-right font-bold bg-white"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-stone-500 pt-1 border-t border-stone-200">
                    總懸賞金額將依兩階段合計：NT$ {(phase1Points + phase2Points).toLocaleString()} 元
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 招募中置頂推播 (每次推播 $50) */}
          <div className="mt-3 p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/5 border border-amber-300 space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-black shrink-0 shadow-2xs">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-stone-900">啟用招募中置頂推播</span>
                  <span className="px-1.5 py-0.2 rounded-md bg-amber-500 text-stone-950 font-black text-[10px]">
                    +NT$ 50
                  </span>
                  <HelpTooltip
                    title="置頂推播說明"
                    content="放入首頁「✨推薦」最頂端優先置頂並標記「招募中」，大幅提升曝光與專家方案解答率。"
                  />
                </div>
              </div>
              <input
                type="checkbox"
                checked={isPromotedWithMegaphone}
                onChange={(e) => setIsPromotedWithMegaphone(e.target.checked)}
                className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
              />
            </label>
          </div>

          {/* 第三方金流支付選擇 (若 bounty > 0 或有勾選推播) */}
          {(currentBounty > 0 || isPromotedWithMegaphone) && (
            <div className="mt-3 p-3.5 rounded-xl bg-white border border-stone-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-amber-600" />
                  <span>第三方支付方式（發布時由金流安全託管）：</span>
                </span>
                <span className="text-xs font-black font-mono text-amber-700">
                  應付總計 NT$ {(currentBounty + (isPromotedWithMegaphone ? 50 : 0)).toLocaleString()} 元
                  {isPromotedWithMegaphone && currentBounty > 0 && (
                    <span className="text-[10px] text-stone-400 font-normal block text-right">
                      (懸賞 NT$ {currentBounty.toLocaleString()} + 推播 NT$ 50)
                    </span>
                  )}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['信用卡', 'LINE Pay', 'Apple Pay', 'ATM 轉帳'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                      paymentMethod === method
                        ? 'border-amber-500 bg-amber-50 text-amber-950 ring-1 ring-amber-300'
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

        {/* Deadline */}
        <div className="flex items-center justify-between text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-200">
          <div className="flex items-center gap-2 font-medium">
            <Clock className="w-4 h-4 text-stone-400" />
            <span>徵求截止時間：</span>
          </div>
          <select
            value={deadlineDays}
            onChange={(e) => setDeadlineDays(Number(e.target.value))}
            className="px-2 py-1 rounded-lg border border-stone-200 bg-white font-semibold text-stone-800 text-xs"
          >
            <option value={7}>7 天後截止</option>
            <option value={14}>14 天後截止（推薦）</option>
            <option value={30}>30 天後截止</option>
          </select>
        </div>

        {/* Platform Escrow & Fee Disclaimer */}
        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-extrabold text-amber-950">交易安全保障：</span>
            {currentBounty > 0 ? (
              <span>
                懸賞金由第三方安全託管，您滿意確認採納後才撥款給專家；若招募期滿未採納可全額退回。
              </span>
            ) : (
              <span>
                痛點提出完全免費。專家提交的專屬方案可自訂解鎖金額，您可自由評估後付費解鎖。
              </span>
            )}
          </div>
        </div>

        {/* Terms Confirmation (尋求解答發布問題前確認同意條款) */}
        {postType === 'seek_solution' ? (
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/90 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreeQuestionerTerms}
                onChange={(e) => {
                  setAgreeQuestionerTerms(e.target.checked);
                  if (e.target.checked) setTermsError(null);
                }}
                className="mt-0.5 w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <div className="text-xs text-stone-700 leading-relaxed">
                <span className="font-bold text-stone-900">我已閱讀並同意</span>{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openAboutModal('questioner_terms');
                  }}
                  className="text-blue-700 hover:text-blue-800 font-bold underline cursor-pointer"
                >
                  &lt;&lt;提問會員服務條款&gt;&gt;
                </button>
                {' '}與{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openAboutModal('general_terms');
                  }}
                  className="text-blue-700 hover:text-blue-800 font-bold underline cursor-pointer"
                >
                  &lt;&lt;一般服務條款&gt;&gt;
                </button>
                。
              </div>
            </label>

            {termsError && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 pl-6 animate-in fade-in duration-150">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{termsError}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 text-xs text-stone-600 flex items-center justify-between">
            <span className="leading-relaxed">
              痛點提出與社群交流受
              <button
                type="button"
                onClick={() => openAboutModal('general_terms')}
                className="text-stone-800 font-bold underline mx-1 cursor-pointer"
              >
                &lt;&lt;一般服務條款&gt;&gt;
              </button>
              規範，發布即代表同意平台服務規範。
            </span>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
          >
            取消返回
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-1.5 cursor-pointer bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>「市場顧問」正在判斷領域並標注標籤...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {currentBounty === 0 && !isPromotedWithMegaphone
                    ? '確認免費發布'
                    : `預扣 ${(currentBounty + (isPromotedWithMegaphone ? 50 : 0)).toLocaleString()} 點懸賞金 並發布`}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  if (isFullPage) {
    return <div className="max-w-4xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8">{content}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-1.5 sm:p-4 overflow-y-auto">
      {content}
    </div>
  );
};
