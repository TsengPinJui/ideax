import React, { useState, useEffect } from 'react';
import { Category, ProblemLevel, Question, CATEGORY_HIERARCHY, VIBECODING_CATEGORIES, PostType, DeliveryPhase } from '../types';
import { useApp } from '../context/AppContext';
import { LEVEL_CONFIGS } from '../data/mockData';
import { AIAnalysisResult } from '../services/aiService';
import { marketAdvisorAgent } from '../services/marketAdvisorAgent';
import { resolveUserDisplayName, getUserNameColorClass } from '../utils/userDisplay';
import { IdeaXLogo } from './IdeaXLogo';
import { HelpTooltip } from './HelpTooltip';
import { PainPointAutocompleteInput } from './PainPointAutocompleteInput';
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
  Plus,
  Trash2,
  Trophy,
  Terminal,
  Image as ImageIcon,
  Globe,
  Cpu,
  Code2,
  Eye,
  Upload,
} from 'lucide-react';
import { PublishEffectPreviewModal } from './PublishEffectPreviewModal';
import {
  processUploadedImageFile,
  MAX_IMAGE_FILE_SIZE_MB,
  ACCEPTED_IMAGE_TYPES,
} from '../utils/imageUploadUtils';

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

const getPostTypeName = (type: PostType): string => {
  switch (type) {
    case 'seek_solution':
      return '尋求解答';
    case 'innovation_proposal':
      return '創新提案';
    case 'pain_point':
      return '提出痛點';
    case 'vibecoding_app':
      return '程式或網站';
    case 'chat_discussion':
      return '閒聊討論';
    default:
      return '提問發布';
  }
};

const getTitleLabel = (type: PostType): string => {
  switch (type) {
    case 'pain_point':
      return '痛點標題 *';
    case 'seek_solution':
      return '問題標題 / 核心需求 *';
    case 'innovation_proposal':
      return '提案標題 / 創新主題 *';
    case 'vibecoding_app':
      return '應用標題 / 核心功能亮點 *';
    case 'chat_discussion':
      return '討論主題 / 標題 *';
    default:
      return '標題 *';
  }
};

const getTitlePlaceholder = (type: PostType): string => {
  switch (type) {
    case 'pain_point':
      return '例如：傳統實體早餐店上班尖峰排隊流失與備料浪費嚴重';
    case 'seek_solution':
      return '例如：傳統實體早餐店如何解決上班尖峰排隊流失與備料浪費？';
    case 'innovation_proposal':
      return '例如：基於 AI 的智慧早餐店預訂與動態備料系統提案';
    case 'vibecoding_app':
      return '例如：10分鐘用 AI 生成的早餐店預訂與動態備料 Line Web App';
    case 'chat_discussion':
      return '例如：大家在進行 VibeCoding 時最常遇到的 Prompt 瓶頸是什麼？';
    default:
      return '請輸入標題...';
  }
};

const getDescriptionLabel = (type: PostType): string => {
  switch (type) {
    case 'pain_point':
      return '痛點背景與情境需求 *';
    case 'seek_solution':
      return '問題背景與具體情境需求 *';
    case 'innovation_proposal':
      return '提案內容與創新亮點說明 *';
    case 'vibecoding_app':
      return '作品簡介與特色說明 *';
    case 'chat_discussion':
      return '討論內容與交流背景 *';
    default:
      return '內容說明 *';
  }
};

const getDescriptionPlaceholder = (type: PostType): string => {
  switch (type) {
    case 'pain_point':
      return '詳細描述您在日常工作、生活或商業運營中發現的真實痛點與困境，讓專業解答者能看清癥結，為您提供專屬落地解法...';
    case 'seek_solution':
      return '詳述您的團隊現況、試過的方法、面臨的瓶頸，以及希望解答者提供的方案維度（如財務模型、合作條款、執行步驟等）...';
    case 'innovation_proposal':
      return '詳述您的創新提案內容、核心理念、欲解決的目標問題、技術或商業模式亮點，吸引社群與合作夥伴關注...';
    case 'vibecoding_app':
      return '介紹您的作品核心功能、開發動機、解決的痛點、使用到的工具（如 Cursor, Claude, Bolt）及成果亮點...';
    case 'chat_discussion':
      return '簡述您想與大家交流的生活經驗、職場觀察或看法探討，邀請社群成員一起交流討論（20 ~ 300 字）...';
    default:
      return '請輸入詳細說明...';
  }
};

export const CreateQuestionModal: React.FC<CreateQuestionModalProps> = ({
  onClose,
  onSuccess,
  isFullPage = false,
  initialCategory,
  initialSubcategory,
  initialPostType = 'seek_solution',
  initialPublishIdentity = 'admin',
}) => {
  const { currentUser, createQuestion, hasAgreedTerms, recordTermsAgreement, openAboutModal, isNoPaymentMode, isRaceMode, questions } = useApp();

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
  const [selectedVibeCategories, setSelectedVibeCategories] = useState<string[]>(
    initialSubcategory && (VIBECODING_CATEGORIES as readonly string[]).includes(initialSubcategory)
      ? [initialSubcategory]
      : ['網站程式']
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
  const [paymentMethod, setPaymentMethod] = useState<'帳戶點數付點' | '信用卡' | 'LINE Pay' | 'Apple Pay' | 'ATM 轉帳'>('帳戶點數付點');
  const [referencedPainPoint, setReferencedPainPoint] = useState('');
  const [targetGoal, setTargetGoal] = useState('');

  // VibeCoding 與創新提案專屬欄位狀態
  const [appName, setAppName] = useState<string>('');
  const [coverImage, setCoverImage] = useState<string>('');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [techArchitecture, setTechArchitecture] = useState<string>('');
  const [demoUrl, setDemoUrl] = useState<string>('');
  const [currentVersion, setCurrentVersion] = useState<string>('v1.0.0');

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImageUploadError(null);
    setIsUploadingImage(true);
    const res = await processUploadedImageFile(file, MAX_IMAGE_FILE_SIZE_MB);
    setIsUploadingImage(false);
    if (!res.ok || !res.dataUrl) {
      setImageUploadError(res.error || '圖片上傳失敗');
      return;
    }
    setCoverImage(res.dataUrl);
  };

  const handleGalleryFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = '';
    if (!files || files.length === 0) return;
    setImageUploadError(null);
    const remainingSlots = 6 - galleryImages.length;
    if (remainingSlots <= 0) {
      setImageUploadError('展示圖集最多可上傳 6 張圖片');
      return;
    }
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    setIsUploadingImage(true);
    const uploadedList: string[] = [];
    for (const file of filesToProcess) {
      const res = await processUploadedImageFile(file, MAX_IMAGE_FILE_SIZE_MB);
      if (!res.ok || !res.dataUrl) {
        setImageUploadError(res.error || '圖片上傳失敗');
      } else {
        uploadedList.push(res.dataUrl);
      }
    }
    setIsUploadingImage(false);
    if (uploadedList.length > 0) {
      setGalleryImages((prev) => [...prev, ...uploadedList].slice(0, 6));
    }
  };

  // 多階段交付設定（支援自訂階段數量、名稱、目標、預計交付與價格）
  const [enablePhasedDelivery, setEnablePhasedDelivery] = useState(false);
  const [customPhases, setCustomPhases] = useState<Array<{
    id: string;
    phaseNumber: number;
    title: string;
    target: string;
    deliverables: string;
    points: number;
  }>>([
    {
      id: `phase-${Date.now()}-1`,
      phaseNumber: 1,
      title: '第 1 階段：架構診斷與方向大綱',
      target: '剖析核心問題痛點與提出可行解決架構',
      deliverables: '診斷報告大綱與系統架構圖',
      points: 200,
    },
    {
      id: `phase-${Date.now()}-2`,
      phaseNumber: 2,
      title: '第 2 階段：深度落地方案與交付驗收',
      target: '產出可直接應用的具體成果與完整操作手冊',
      deliverables: '完整解決方案說明文件、檔案交付或諮詢會談',
      points: 300,
    },
  ]);

  const totalPhasesBounty = customPhases.reduce((acc, p) => acc + (Number(p.points) || 0), 0);

  const handleAddPhase = () => {
    const nextNum = customPhases.length + 1;
    setCustomPhases((prev) => [
      ...prev,
      {
        id: `phase-${Date.now()}-${nextNum}`,
        phaseNumber: nextNum,
        title: `第 ${nextNum} 階段：成果優化與交付驗收`,
        target: '',
        deliverables: '',
        points: 200,
      },
    ]);
  };

  const handleRemovePhase = (indexToRemove: number) => {
    if (customPhases.length <= 1) return;
    setCustomPhases((prev) =>
      prev
        .filter((_, idx) => idx !== indexToRemove)
        .map((p, idx) => ({
          ...p,
          phaseNumber: idx + 1,
        }))
    );
  };

  const handleUpdatePhase = (index: number, field: 'title' | 'target' | 'deliverables' | 'points', value: any) => {
    setCustomPhases((prev) =>
      prev.map((p, idx) => {
        if (idx === index) {
          return { ...p, [field]: value };
        }
        return p;
      })
    );
  };

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
    } else if (type === 'innovation_proposal') {
      // 創新提案：預設 L0，0 懸賞
      setLevel('L0');
      setBounty(0);
    } else if (type === 'vibecoding_app') {
      // VibeCoding 網站程式/應用展示：預設 L0，0 懸賞
      setLevel('L0');
      setBounty(0);
      setCategory('網站程式');
      setSubcategory(selectedVibeCategories[0] || '網站程式');
      if (selectedVibeCategories.length === 0) {
        setSelectedVibeCategories(['網站程式']);
      }
    } else {
      if (bounty === 0) setBounty(500);
      if (level === 'L0') setLevel('L2');
    }

    try {
      if (isFullPage && typeof window !== 'undefined') {
        let path = '/create';
        if (type === 'vibecoding_app') path = '/vibecoding/publish';
        else if (type === 'pain_point') path = '/painpoint/publish';
        else if (type === 'innovation_proposal') path = '/proposal/publish';
        else if (type === 'chat_discussion') path = '/discussion/publish';
        window.history.pushState({ tab: 'create_question', postType: type }, '', path);
      }
    } catch {}
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
  const [showPublishPreview, setShowPublishPreview] = useState(false);
  const [hasConfirmedViaPreview, setHasConfirmedViaPreview] = useState(false);

  const effectiveBounty = isNoPaymentMode ? 0 : (enablePhasedDelivery && bounty > 0 ? totalPhasesBounty : bounty);
  const currentBounty = isNoPaymentMode ? 0 : (Number(effectiveBounty) || 0);

  // Update subcategory whenever category changes
  const handleCategoryChange = (newCat: Category | '') => {
    setCategory(newCat);
    setSubcategory('');
  };

  const validateFormForPreview = () => {
    if (!currentUser || currentUser.id === 'user-guest') {
      setTermsError('登錄帳號及個人資料為提問之必要條件，請先登入會員帳號（登入即代表同意全站一般服務條款）');
      return false;
    }

    const isProfileComplete = Boolean(
      currentUser.hasCompletedProfile !== false &&
      (currentUser.phone || currentUser.email) &&
      (currentUser.industry || currentUser.jobTitle || currentUser.title)
    );
    if (!isProfileComplete || currentUser.hasCompletedProfile === false) {
      setTermsError('⚠️ 個人資料為發布問題之必要條件！您在註冊時跳過了個人資料填寫，發布問題涉及履約通知，請先前往「會員中心 → 基本資料」補填完整個人資料。');
      return false;
    }

    const isL0OrChatType = postType === 'chat_discussion';
    const titleMin = isL0OrChatType ? 8 : 10;
    const titleMax = isL0OrChatType ? 30 : 50;
    const descMin = isL0OrChatType ? 20 : 30;
    const descMax = isL0OrChatType ? 300 : 3000;

    if (postType === 'vibecoding_app' && !appName.trim()) {
      setTermsError('【程式或網站】請輸入「作品名稱（軟體或網站名稱）」（必填）！');
      return false;
    }

    const titleLen = title.trim().length;
    if (titleLen < titleMin || titleLen > titleMax) {
      const cleanTitleLabel = getTitleLabel(postType).replace(' *', '');
      setTermsError(
        isL0OrChatType
          ? `【閒聊討論/L0】${cleanTitleLabel}需介於 8 ~ 30 個字（目前已輸入 ${titleLen} 字）`
          : `【${getPostTypeName(postType)}】${cleanTitleLabel}需介於 10 ~ 50 個字（目前已輸入 ${titleLen} 字）`
      );
      return false;
    }

    const descLen = description.trim().length;
    if (descLen < descMin || descLen > descMax) {
      const cleanDescLabel = getDescriptionLabel(postType).replace(' *', '');
      setTermsError(
        isL0OrChatType
          ? `【閒聊討論/L0】${cleanDescLabel}需介於 20 ~ 300 個字（目前已輸入 ${descLen} 字）`
          : `【${getPostTypeName(postType)}】${cleanDescLabel}需介於 30 ~ 3000 個字（目前已輸入 ${descLen} 字）`
      );
      return false;
    }

    if (postType === 'seek_solution' && !agreeQuestionerTerms) {
      setTermsError('發布問題前，請先勾選確認已閱讀並同意 《提問會員服務條款》 與 《一般服務條款》');
      return false;
    }

    const totalRequiredPoints = currentBounty + (isPromotedWithMegaphone ? 50 : 0);
    if (totalRequiredPoints > 0 && (currentUser?.balance || 0) < totalRequiredPoints) {
      setTermsError(`您的帳戶點數餘額不足（目前餘額 ${(currentUser?.balance || 0).toLocaleString()} 點 / 需支付 ${totalRequiredPoints.toLocaleString()} 點）。目前暫時僅支援以平台點數扣點，請調整點數設定。`);
      return false;
    }

    setTermsError(null);
    return true;
  };

  const handleOpenPreview = () => {
    setTermsError(null);
    setShowPublishPreview(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateFormForPreview()) {
      return;
    }

    // 若發布類型為創新提案或軟體程式，送出前若尚未確認預覽效果，主動跳出預覽確認視窗
    if ((postType === 'innovation_proposal' || postType === 'vibecoding_app') && !hasConfirmedViaPreview) {
      setShowPublishPreview(true);
      return;
    }

    await executeFinalSubmit();
  };

  const handleConfirmFromPreview = async () => {
    setShowPublishPreview(false);
    if (!validateFormForPreview()) {
      return;
    }
    setHasConfirmedViaPreview(true);
    await executeFinalSubmit();
  };

  const executeFinalSubmit = async () => {
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

      if (postType === 'vibecoding_app') {
        if (!finalCategory) finalCategory = 'vibecoding' as any;
        if (!finalSubcategory) finalSubcategory = 'AI Agent 助手';
      } else {
        if (!finalCategory) finalCategory = '創新創業';
        if (!finalSubcategory) finalSubcategory = CATEGORY_HIERARCHY[finalCategory]?.[0] || '一般專案';
      }
      if (finalTags.length === 0) {
        finalTags = postType === 'vibecoding_app'
          ? [finalSubcategory, 'VibeCoding', 'AI 實戰應用'].filter(Boolean)
          : [finalCategory, finalSubcategory].filter(Boolean);
      }
      if (finalTags.length > 5) {
        finalTags = finalTags.slice(0, 5);
      }

      const deadline = deadlineDays === 0
        ? '永久'
        : new Date(Date.now() + deadlineDays * 86400000).toISOString().split('T')[0];

      const phases: DeliveryPhase[] | undefined = enablePhasedDelivery && currentBounty > 0
        ? customPhases.map((cp, idx) => ({
            id: cp.id || `phase-${Date.now()}-${idx + 1}`,
            phaseNumber: idx + 1,
            title: cp.title.trim() || `第 ${idx + 1} 階段`,
            target: cp.target.trim(),
            deliverables: cp.deliverables.trim(),
            description: cp.target.trim()
              ? `${cp.target.trim()}${cp.deliverables.trim() ? `（預計交付：${cp.deliverables.trim()}）` : ''}`
              : (cp.deliverables.trim() || `第 ${idx + 1} 階段交付`),
            points: Number(cp.points) || 0,
            price: Number(cp.points) || 0,
            status: idx === 0 ? 'in_progress' : 'pending_acceptance',
          }))
        : undefined;

      const isPlatformOfficial = currentUser?.role === 'admin' && publishIdentity === 'platform';
      const authorId = isPlatformOfficial ? 'platform-ideax-official' : (currentUser?.id || 'guest');
      const authorName = isPlatformOfficial ? '💡IdeaX 官方帳號💡' : resolveUserDisplayName(currentUser?.id || 'guest', currentUser?.name || '訪客');
      const authorAvatar = isPlatformOfficial
        ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150'
        : (currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150');
      const authorTitle = isPlatformOfficial
        ? 'IdeaX 官方營運團隊'
        : (currentUser?.role === 'questioner' && !currentUser?.showQuestionerTitle)
        ? undefined
        : (currentUser?.title || (currentUser?.role === 'admin' ? '平台管理員' : undefined));

      const finalDescription = externalLink.trim()
        ? `${description.trim()}\n\n【外部雲端參考資料 (Google Drive / Dropbox / Figma)】\n${externalLink.trim()}`
        : description.trim();

      const newQuestion = createQuestion({
        appName: postType === 'vibecoding_app' ? appName.trim() : undefined,
        title,
        description: finalDescription,
        category: postType === 'vibecoding_app' ? '網站程式' : finalCategory,
        subcategory: postType === 'vibecoding_app' ? (selectedVibeCategories[0] || subcategory || '網站程式') : finalSubcategory,
        subcategories: postType === 'vibecoding_app' ? (selectedVibeCategories.length > 0 ? selectedVibeCategories : ['網站程式']) : undefined,
        tags: postType === 'vibecoding_app' ? Array.from(new Set(['網站程式', ...selectedVibeCategories, ...finalTags])) : finalTags,
        level,
        bounty: currentBounty,
        deadline,
        postType,
        specialZone: postType === 'vibecoding_app' ? 'vibecoding' : undefined,
        referencedPainPoint: referencedPainPoint.trim() || undefined,
        targetGoal: targetGoal.trim() || undefined,
        currentVersion: postType === 'vibecoding_app' ? (currentVersion.trim() || undefined) : undefined,
        updateLogs: (postType === 'vibecoding_app' && currentVersion.trim()) ? [{
          id: `log-init-${Date.now()}`,
          timestamp: `${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getDate()).padStart(2, '0')} ${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
          version: currentVersion.trim(),
          content: '首次發布軟體程式作品與上架展場',
          note: '初始版本發布上線',
          authorId,
          authorName,
          authorAvatar,
          updatedFields: ['初始建立'],
        }] : undefined,
        coverImage: coverImage.trim() || undefined,
        galleryImages: galleryImages.length > 0 ? galleryImages : undefined,
        techArchitecture: techArchitecture.trim() || undefined,
        demoUrl: demoUrl.trim() || externalLink.trim() || undefined,
        fileUrl: externalLink.trim() || undefined,
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
            <p className="text-xs text-stone-500">
              {isRaceMode ? '競賽期間免費 • 第三方安全防護' : '痛點提出 • 落地解法 • 第三方支付安全拆款'}
            </p>
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
        {currentUser?.role === 'admin' && (
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
                  src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt={currentUser?.name || ''}
                  className="w-10 h-10 rounded-full object-cover border border-stone-200 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs truncate ${getUserNameColorClass(currentUser?.id, undefined, currentUser)}`}>
                      {resolveUserDisplayName(currentUser?.id, currentUser?.name)}
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {/* 1. 尋求解答 */}
            <button
              type="button"
              onClick={() => handlePostTypeChange('seek_solution')}
              className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                postType === 'seek_solution'
                  ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-300 shadow-2xs'
                  : 'bg-white hover:bg-stone-50 border-stone-200'
              }`}
            >
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center font-black">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-stone-900">尋求解答</h4>
                <p className="text-[10px] text-stone-500 line-clamp-1 mt-0.5">
                  懸賞破局方案
                </p>
              </div>
            </button>

            {/* 2. 創新提案 */}
            <button
              type="button"
              onClick={() => handlePostTypeChange('innovation_proposal')}
              className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                postType === 'innovation_proposal'
                  ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-300 shadow-2xs'
                  : 'bg-white hover:bg-stone-50 border-stone-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-500/20 text-emerald-800 flex items-center justify-center font-black">
                  <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                </div>
                <span className="text-[9px] font-black bg-emerald-600 text-white px-1 py-0.2 rounded shadow-2xs">
                  創點子
                </span>
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-stone-900">創新提案</h4>
                <p className="text-[10px] text-stone-500 line-clamp-1 mt-0.5">
                  創新解方發表
                </p>
              </div>
            </button>

            {/* 3. 提出痛點 */}
            <button
              type="button"
              onClick={() => handlePostTypeChange('pain_point')}
              className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                postType === 'pain_point'
                  ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-300 shadow-2xs'
                  : 'bg-white hover:bg-stone-50 border-stone-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-rose-500/20 text-rose-800 flex items-center justify-center font-black">
                  <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span className="text-[9px] font-black bg-rose-600 text-white px-1 py-0.2 rounded shadow-2xs">
                  {isRaceMode ? '免費' : '痛點'}
                </span>
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-stone-900">提出痛點</h4>
                <p className="text-[10px] text-stone-500 line-clamp-1 mt-0.5">
                  生活產業痛點
                </p>
              </div>
            </button>

            {/* 4. 程式或網站 (VibeCoding展場) */}
            <button
              type="button"
              onClick={() => handlePostTypeChange('vibecoding_app')}
              className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                postType === 'vibecoding_app'
                  ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-300 shadow-2xs'
                  : 'bg-white hover:bg-stone-50 border-stone-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-purple-500/20 text-purple-800 flex items-center justify-center font-black">
                  <Terminal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" />
                </div>
                <span className="text-[9px] font-black bg-purple-600 text-white px-1 py-0.2 rounded shadow-2xs">
                  展場
                </span>
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-stone-900">程式或網站</h4>
                <p className="text-[10px] text-stone-500 line-clamp-1 mt-0.5">
                  網站、APP、遊戲、小程序 軟體皆可刊登
                </p>
              </div>
            </button>

            {/* 5. 閒聊討論 */}
            <button
              type="button"
              onClick={() => handlePostTypeChange('chat_discussion')}
              className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                postType === 'chat_discussion'
                  ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-300 shadow-2xs'
                  : 'bg-white hover:bg-stone-50 border-stone-200'
              }`}
            >
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-500/20 text-blue-800 flex items-center justify-center font-black">
                <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-stone-900">閒聊討論</h4>
                <p className="text-[10px] text-stone-500 line-clamp-1 mt-0.5">
                  L0 交流無門檻
                </p>
              </div>
            </button>
          </div>

          {/* 痛點發布提示 */}
          {postType === 'pain_point' && (
            <div className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-950 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-extrabold text-rose-900 text-xs">
                  {isRaceMode ? '競賽期間免費' : '痛點發布'}
                </span>
              </div>
              <HelpTooltip
                title={isRaceMode ? '競賽期間免費' : '痛點發布機制'}
                content={
                  isRaceMode
                    ? '創星季競賽期間免費。匯集生活與產業真實痛點，開放給參賽團隊作為解題題目與共創解方。'
                    : '發布生活或產業痛點無須懸賞，各領域人才可在下方提交落地解決方案，提問者或其他人需透過第三方支付解鎖後查閱。'
                }
              />
            </div>
          )}
        </div>

        {/* 軟體或網站名稱（作品名稱） - 程式或網站必填，藍色顯示於卡片左下角 */}
        {postType === 'vibecoding_app' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-blue-600" />
                <span>作品名稱（軟體或網站名稱） *</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded border text-blue-800 bg-blue-100/80 border-blue-300/80">
                  必填 · 以藍色顯示於卡片左下角
                </span>
              </label>
              <span className="text-[11px] font-mono text-stone-400">
                {appName.trim().length} / 40 字
              </span>
            </div>
            <input
              type="text"
              required
              maxLength={40}
              value={appName}
              onChange={(e) => {
                setAppName(e.target.value);
                if (termsError) setTermsError(null);
              }}
              placeholder="例如：ReceiptSnap AI、VibeForm AI、MythWeaver 織夢島..."
              className="w-full px-4 py-2.5 rounded-xl border border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-stone-900 text-sm font-bold outline-none transition-all bg-blue-50/20"
            />
          </div>
        )}

        {/* Question Title */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <span>{getTitleLabel(postType)}</span>
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
            placeholder={getTitlePlaceholder(postType)}
            className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-stone-900 text-sm font-medium outline-none transition-all"
          />
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <span>{getDescriptionLabel(postType)}</span>
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
            placeholder={getDescriptionPlaceholder(postType)}
            className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-stone-900 text-sm font-normal outline-none transition-all leading-relaxed"
          />
        </div>

        {/* 創新提案 / 程式或網站：引用相關痛點與希望達成的目標 (選填) */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl ${
          postType === 'vibecoding_app'
            ? 'bg-purple-50/60 border border-purple-200'
            : 'bg-emerald-50/60 border border-emerald-200'
        }`}>
          <div>
            <label className="block text-stone-800 font-bold mb-1 flex items-center gap-1.5 text-xs">
              <Flame className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>引用相關痛點 (選填)</span>
            </label>
            <PainPointAutocompleteInput
              value={referencedPainPoint}
              onChange={(val) => setReferencedPainPoint(val)}
              questions={questions}
              placeholder="輸入關鍵字自動搜尋公開痛點，或直接填寫提案者自述痛點"
            />
          </div>

          <div>
            <label className="block text-stone-800 font-bold mb-1 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>［希望達成的目標］ (選填)</span>
              </span>
              {postType === 'vibecoding_app' && (
                <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-1.5 py-0.2 rounded">
                  下載量 / 里程碑
                </span>
              )}
            </label>
            <input
              type="text"
              value={targetGoal}
              onChange={(e) => setTargetGoal(e.target.value)}
              placeholder={
                postType === 'vibecoding_app'
                  ? '例如：希望 6 個月內達成 50,000 次下載量，並累積 5,000 位活躍用戶'
                  : '例: 於 6 個月內完成 POC 實證並獲得 100 位企業付費用戶'
              }
              className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-stone-900 text-xs outline-none bg-white font-medium"
            />
            <p className="text-[11px] text-stone-500 mt-1">
              {postType === 'vibecoding_app'
                ? '💡 目標說明：例如「希望 6 個月達成 ××× 下載次數」或累積活躍用戶數、產品留存率等具體可衡量成果。'
                : '💡 目標說明：填寫短期至中期預期驗證成果、商業合作或驗證指標。'}
            </p>
          </div>
        </div>

        {/* 創新提案 & VibeCoding 軟體刊登：封面大圖、0~6張圖片圖集、以及 VibeCoding 專屬架構與網址 */}
        {(postType === 'vibecoding_app' || postType === 'innovation_proposal') && (
          <div
            className={`p-4 rounded-2xl border space-y-3.5 animate-in fade-in duration-200 ${
              postType === 'vibecoding_app'
                ? 'bg-gradient-to-br from-purple-50 via-indigo-50/50 to-purple-50/30 border-purple-200/90'
                : 'bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-emerald-50/30 border-emerald-200/90'
            }`}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-lg text-white flex items-center justify-center font-bold ${
                    postType === 'vibecoding_app' ? 'bg-purple-600' : 'bg-emerald-600'
                  }`}
                >
                  {postType === 'vibecoding_app' ? (
                    <Terminal className="w-3.5 h-3.5" />
                  ) : (
                    <Lightbulb className="w-3.5 h-3.5" />
                  )}
                </div>
                <h4
                  className={`text-xs font-black ${
                    postType === 'vibecoding_app' ? 'text-purple-950' : 'text-emerald-950'
                  }`}
                >
                  {postType === 'vibecoding_app'
                    ? 'VibeCoding 應用多媒體與架構展示'
                    : '創新提案視覺圖集與多媒體展示（選填）'}
                </h4>
              </div>

              <button
                type="button"
                onClick={handleOpenPreview}
                className={`px-3 py-1 rounded-xl text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs border ${
                  postType === 'vibecoding_app'
                    ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-700'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-700'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>即時預覽兩種類型提案效果</span>
              </button>
            </div>

            {imageUploadError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{imageUploadError}</span>
              </div>
            )}

            {/* 封面大圖 (檔案上傳，單張限 2MB) */}
            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <ImageIcon
                    className={`w-3.5 h-3.5 ${
                      postType === 'vibecoding_app' ? 'text-purple-600' : 'text-emerald-600'
                    }`}
                  />
                  <span>
                    {postType === 'vibecoding_app'
                      ? '作品封面大圖上傳 (選填/建議)'
                      : '提案主視覺封面圖上傳 (選填/建議)'}
                  </span>
                </label>
                <span
                  className={`text-[10px] font-semibold ${
                    postType === 'vibecoding_app' ? 'text-purple-700' : 'text-emerald-700'
                  }`}
                >
                  支援 JPG / PNG / WebP · 單張檔案大小上限 {MAX_IMAGE_FILE_SIZE_MB}MB
                </span>
              </div>

              {!coverImage.trim() ? (
                <label
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all bg-white text-xs font-bold ${
                    postType === 'vibecoding_app'
                      ? 'border-purple-300 hover:border-purple-500 text-purple-800 hover:bg-purple-50/60'
                      : 'border-emerald-300 hover:border-emerald-500 text-emerald-800 hover:bg-emerald-50/60'
                  }`}
                >
                  <Upload className="w-4 h-4 shrink-0" />
                  <span>
                    {isUploadingImage
                      ? '圖片處理中...'
                      : `點擊選擇電腦或手機圖片上傳封面（單張限 ${MAX_IMAGE_FILE_SIZE_MB}MB 以內）`}
                  </span>
                  <input
                    type="file"
                    accept={ACCEPTED_IMAGE_TYPES}
                    onChange={handleCoverFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="relative w-full h-40 rounded-xl overflow-hidden border border-stone-300 bg-stone-900 group">
                  <img src={coverImage} alt="封面預覽" className="w-full h-full object-cover" />
                  <span className="absolute bottom-2 left-2 bg-black/70 text-white px-2.5 py-0.5 rounded-lg text-[10px] font-bold">
                    封面大圖預覽
                  </span>
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    <label className="px-2.5 py-1 rounded-lg bg-black/75 hover:bg-black text-white text-[11px] font-bold cursor-pointer flex items-center gap-1 transition-colors">
                      <Upload className="w-3 h-3" />
                      <span>更換封面</span>
                      <input
                        type="file"
                        accept={ACCEPTED_IMAGE_TYPES}
                        onChange={handleCoverFileChange}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setCoverImage('')}
                      className="p-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                      title="移除封面圖片"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 0~6 張截圖圖集 (檔案上傳，單張限 2MB) */}
            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <ImageIcon
                    className={`w-3.5 h-3.5 ${
                      postType === 'vibecoding_app' ? 'text-indigo-600' : 'text-teal-600'
                    }`}
                  />
                  <span>
                    {postType === 'vibecoding_app'
                      ? `功能介面與展示截圖 (${galleryImages.length} / 6 張)`
                      : `提案架構圖與補充圖集 (${galleryImages.length} / 6 張)`}
                  </span>
                </label>
                <span className="text-[10px] text-stone-500 font-semibold">
                  最多 6 張 · 每張上限 {MAX_IMAGE_FILE_SIZE_MB}MB
                </span>
              </div>

              {galleryImages.length < 6 && (
                <label
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed cursor-pointer transition-all bg-white text-xs font-bold ${
                    postType === 'vibecoding_app'
                      ? 'border-indigo-300 hover:border-indigo-500 text-indigo-800 hover:bg-indigo-50/50'
                      : 'border-teal-300 hover:border-teal-500 text-teal-800 hover:bg-teal-50/50'
                  }`}
                >
                  <Upload className="w-4 h-4 shrink-0" />
                  <span>
                    {isUploadingImage
                      ? '圖片處理中...'
                      : `點擊上傳展示圖片（還可上傳 ${6 - galleryImages.length} 張，單張限 ${MAX_IMAGE_FILE_SIZE_MB}MB）`}
                  </span>
                  <input
                    type="file"
                    accept={ACCEPTED_IMAGE_TYPES}
                    multiple
                    onChange={handleGalleryFilesChange}
                    className="hidden"
                  />
                </label>
              )}

              {galleryImages.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-2">
                  {galleryImages.map((img, idx) => (
                    <div key={idx} className="relative group h-16 rounded-lg overflow-hidden border border-stone-200 bg-stone-900">
                      <img src={img} alt={`截圖 ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setGalleryImages(galleryImages.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-rose-600 text-white opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
                        title="刪除此圖片"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {postType === 'vibecoding_app' && (
              <>
                {/* 技術架構 */}
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-purple-600" />
                    <span>技術架構 (Front-end / Back-end / AI 模型套件)</span>
                  </label>
                  <input
                    type="text"
                    value={techArchitecture}
                    onChange={(e) => setTechArchitecture(e.target.value)}
                    placeholder="例如：React + Vite + Tailwind CSS + Node.js + Firebase + Gemini API"
                    className="w-full px-3 py-2 rounded-xl border border-purple-200 focus:border-purple-500 text-xs text-stone-900 outline-none bg-white font-mono"
                  />
                </div>

                {/* 網站網址或檔案連結 */}
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    <span>網站網址或線上體驗 Demo 連結</span>
                  </label>
                  <input
                    type="url"
                    value={demoUrl}
                    onChange={(e) => setDemoUrl(e.target.value)}
                    placeholder="例如：https://my-vibecoding-app.vercel.app 或 GitHub 專案連結"
                    className="w-full px-3 py-2 rounded-xl border border-emerald-200 focus:border-emerald-500 text-xs text-stone-900 outline-none bg-white font-mono"
                  />
                </div>

                {/* 版本號碼 (選填) */}
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-purple-600" />
                      <span>版本號碼 (選填)</span>
                    </span>
                    <span className="text-[10px] text-purple-700">例如：v1.0.0、v2.0.0</span>
                  </label>
                  <input
                    type="text"
                    value={currentVersion}
                    onChange={(e) => setCurrentVersion(e.target.value)}
                    placeholder="例如：v1.0.0 (初版發布)"
                    className="w-full px-3 py-2 rounded-xl border border-purple-200 focus:border-purple-500 text-xs text-stone-900 outline-none bg-white font-mono"
                  />
                </div>
              </>
            )}
          </div>
        )}

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
              平台支援情境圖片與輕量參考檔案；<strong>平台不對用戶上傳之資料、檔案負保管責任，請用戶務必自行妥善留存原始備份</strong>。第三方外部連結與檔案概由發布當事人自負相關法律責任；若發現其他用戶有涉嫌侵權、惡意軟體或不當行為，可隨時向平台檢舉舉報。
            </p>
          </div>
        </div>

        {/* AI Agent「市場顧問」一鍵智慧分析與標籤帶入工具列（VibeCoding 作品展示不套用商業懸賞顧問分析） */}
        {postType !== 'vibecoding_app' && (
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
                    等級建議：{aiAnalysisResult.level}（{aiAnalysisResult.suggestedBounty?.toLocaleString()} 點）
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
        )}

        {/* Category & Subcategory */}
        {postType === 'vibecoding_app' ? (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-stone-700">軟體提案分類（最多選 3 個）*</label>
              <span className="text-[11px] text-stone-500 font-medium">
                已選 {selectedVibeCategories.length} / 3
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {VIBECODING_CATEGORIES.map((sc) => {
                const isSelected = selectedVibeCategories.includes(sc);
                return (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => {
                      setCategory('網站程式');
                      setSelectedVibeCategories((prev) => {
                        if (prev.includes(sc)) {
                          if (prev.length <= 1) return prev; // keep at least 1
                          const next = prev.filter((item) => item !== sc);
                          setSubcategory(next[0] || '網站程式');
                          return next;
                        }
                        if (prev.length >= 3) return prev;
                        const next = [...prev, sc];
                        setSubcategory(next[0] || '網站程式');
                        return next;
                      });
                    }}
                    className={`px-2.5 py-2 rounded-lg border text-xs font-bold transition-colors cursor-pointer text-center ${
                      isSelected
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 hover:border-stone-300 bg-white text-stone-700'
                    }`}
                  >
                    {sc}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
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
        )}

        {/* Tags */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-stone-400" />
              <span>關鍵字標籤 (2~5 個)</span>
            </label>
            <span className="text-[11px] text-stone-400">
              {postType === 'vibecoding_app' ? '標記核心技術或應用場景' : '留空時由 AI 自動適配生成'}
            </span>
          </div>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder={
              postType === 'vibecoding_app'
                ? '例如：#AI_Agent #NextJS #自動化工作流 #RAG知識庫'
                : '例如：#商業模式 #市場驗證 #產品策略（留空將由 AI 自動適配生成）'
            }
            className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:border-amber-500 text-xs font-medium outline-none placeholder:text-stone-400"
          />
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-[10px] text-stone-400 font-bold">推薦標籤：</span>
            {(postType === 'vibecoding_app'
              ? [
                  'AI Agent',
                  'LLM應用',
                  'Next.js',
                  '自動化工作流',
                  'RAG知識庫',
                  'SaaS工具',
                  '資料視覺化',
                  'Prompt工程',
                ]
              : [
                  '團隊協作',
                  '解題黑客松',
                  '商業模式',
                  'AI應用',
                  '創業痛點',
                  '行銷增長',
                  '系統架構',
                  '合約法律',
                ]
            ).map((tag) => (
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

        {/* Problem Level & Bounty Configuration (痛點與 VibeCoding 作品無須選擇賞金；無金流模式與正常懸賞處理) */}
        {(postType === 'pain_point' || postType === 'vibecoding_app') ? null : isNoPaymentMode ? (
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
                問題分級與懸賞點數
              </h3>
            </div>
            <span className="text-[11px] text-amber-700 font-semibold">
              等級越高，吸引愈高階的產業專家解答
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
                <Coins className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-xs font-bold text-stone-800">
                  【{level} {levelConfig.name}】懸賞點數（{levelConfig.rangeText}）：
                </span>
                <HelpTooltip
                  title="懸賞點數託管說明"
                  content="發布時由平台點數安全預扣託管，採納驗收時由系統依約撥付，確保買賣雙方履約保障。"
                />
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <input
                  type="number"
                  min={levelConfig.minPrice}
                  max={levelConfig.maxPrice}
                  step="any"
                  value={bounty}
                  onChange={(e) => setBounty(Number(e.target.value))}
                  className="w-32 px-2.5 py-1.5 rounded-lg border border-amber-400 text-sm font-black text-amber-900 text-right font-mono outline-none focus:border-amber-600 bg-white shadow-2xs"
                />
                <span className="text-xs text-stone-600 font-bold">點</span>
              </div>
            </div>
          ) : (
            <div className="mt-2.5 px-3.5 py-2.5 rounded-xl bg-white border border-stone-200 text-xs text-stone-600 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-stone-800">
                  {isRaceMode ? '競賽期間免費' : 'L0 發布（0 點）'}
                </span>
                <HelpTooltip
                  title={isRaceMode ? '競賽期間免費說明' : '痛點與討論發布說明'}
                  content={
                    isRaceMode
                      ? '創星季競賽期間免費！匯集生活與產業真實痛點，開放給參賽團隊作為解題題目與共創解方。'
                      : '無門檻發布痛點或討論，各領域人才可在下方提交落地方案！'
                  }
                />
              </div>
              <span className="text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {isRaceMode ? '競賽期間免費' : '免付懸賞點數'}
              </span>
            </div>
          )}

          {/* 多階段交付設定開關 */}
          {level !== 'L0' && (
            <div className="mt-3 p-3.5 rounded-xl bg-white border border-stone-200 space-y-2.5">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-stone-900">開啟分階段交付計畫（自訂階段、目標、預計交付與價格）</span>
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
                <div className="pt-2 border-t border-stone-100 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-800 text-[11px] flex items-center gap-1">
                      <span>階段清單與交付里程碑設定</span>
                      <span className="text-stone-400 font-normal">（共 {customPhases.length} 個階段）</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleAddPhase}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>新增階段</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {customPhases.map((phase, pIdx) => (
                      <div
                        key={phase.id}
                        className="p-3 rounded-xl bg-amber-50/40 border border-amber-200 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="px-2 py-0.5 rounded-md bg-stone-800 text-white font-mono font-bold text-[10px] shrink-0">
                              第 {phase.phaseNumber} 階段
                            </span>
                            <input
                              type="text"
                              value={phase.title}
                              onChange={(e) => handleUpdatePhase(pIdx, 'title', e.target.value)}
                              placeholder={`第 ${phase.phaseNumber} 階段名稱與主題...`}
                              className="w-full px-2.5 py-1 rounded-lg border border-stone-300 focus:border-amber-500 text-xs font-bold text-stone-900 bg-white outline-none"
                            />
                          </div>
                          {customPhases.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemovePhase(pIdx)}
                              className="text-stone-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer shrink-0"
                              title="刪除此階段"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* 目標 Target */}
                        <div>
                          <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
                            🎯 階段目標：
                          </label>
                          <input
                            type="text"
                            value={phase.target}
                            onChange={(e) => handleUpdatePhase(pIdx, 'target', e.target.value)}
                            placeholder="例如：釐清核心痛點、完成訪談調研並擬定可行性架構..."
                            className="w-full px-2.5 py-1 rounded-lg border border-stone-300 focus:border-amber-500 text-xs text-stone-800 bg-white outline-none"
                          />
                        </div>

                        {/* 預計交付 Deliverables */}
                        <div>
                          <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
                            📦 預計交付成果：
                          </label>
                          <input
                            type="text"
                            value={phase.deliverables}
                            onChange={(e) => handleUpdatePhase(pIdx, 'deliverables', e.target.value)}
                            placeholder="例如：診斷評估報告 PDF、架構圖、原型連結、或 1 對 1 會談諮詢..."
                            className="w-full px-2.5 py-1 rounded-lg border border-stone-300 focus:border-amber-500 text-xs text-stone-800 bg-white outline-none"
                          />
                        </div>

                        {/* 階段點數 Points */}
                        <div className="flex items-center justify-between pt-1 border-t border-amber-200/60">
                          <span className="text-[11px] font-bold text-stone-700">
                            💰 階段懸賞點數：
                          </span>
                          <div className="flex items-center gap-1.5 font-mono">
                            <input
                              type="number"
                              min={50}
                              value={phase.points}
                              onChange={(e) => handleUpdatePhase(pIdx, 'points', Math.max(50, Number(e.target.value)))}
                              className="w-24 px-2 py-0.5 border border-stone-300 rounded-lg text-right font-bold text-xs bg-white outline-none focus:border-amber-500"
                            />
                            <span className="text-xs text-stone-500 font-semibold">點</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
                    <span className="text-amber-950 font-bold">
                      各階段合計總懸賞點數（共 {customPhases.length} 個階段）：
                    </span>
                    <div className="flex items-center gap-1 font-mono font-black text-amber-900 text-sm">
                      <span>{totalPhasesBounty.toLocaleString()}</span>
                      <span className="text-xs font-sans">點</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 招募中置頂推播 (每次推播 50 點) */}
          <div className="mt-3 p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/5 border border-amber-300 space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-black shrink-0 shadow-2xs">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-stone-900">啟用招募中置頂推播</span>
                  <span className="px-1.5 py-0.2 rounded-md bg-amber-500 text-stone-950 font-black text-[10px]">
                    +50 點
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

          {/* 懸賞付點選擇 (目前暫時只支援平台點數扣點) */}
          {(currentBounty > 0 || isPromotedWithMegaphone) && (
            <div className="mt-3 p-3.5 rounded-xl bg-white border border-stone-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-600" />
                  <span>支付方式（目前暫時只支援平台點數扣點）：</span>
                </span>
                <span className="text-xs font-black font-mono text-amber-700">
                  應付總計 {(currentBounty + (isPromotedWithMegaphone ? 50 : 0)).toLocaleString()} 點
                  {isPromotedWithMegaphone && currentBounty > 0 && (
                    <span className="text-[10px] text-stone-400 font-normal block text-right">
                      (懸賞 {currentBounty.toLocaleString()} 點 + 推播 50 點)
                    </span>
                  )}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(['帳戶點數付點', '信用卡', 'LINE Pay', 'Apple Pay', 'ATM 轉帳'] as const).map((method) => {
                  const isPoints = method === '帳戶點數付點';
                  return (
                    <button
                      key={method}
                      type="button"
                      disabled={!isPoints}
                      onClick={() => {
                        if (isPoints) setPaymentMethod('帳戶點數付點');
                      }}
                      className={`py-2 px-2 rounded-xl border text-xs font-bold text-center transition-all ${
                        isPoints
                          ? 'border-amber-500 bg-amber-50 text-amber-950 ring-1 ring-amber-300 font-black shadow-2xs cursor-pointer'
                          : 'border-stone-200 bg-stone-50 text-stone-400 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      {isPoints ? (
                        <div className="truncate">
                          <div>🪙 平台點數扣點</div>
                          <div className="text-[10px] text-amber-700 font-normal">
                            餘額 {(currentUser?.balance || 0).toLocaleString()} 點
                          </div>
                        </div>
                      ) : (
                        <div className="truncate">
                          <div>{method}</div>
                          <div className="text-[10px] text-stone-400 font-normal">暫不支援</div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

        {/* 刊登時間 (原徵求截止時間) */}
        <div className="flex items-center justify-between text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-200">
          <div className="flex items-center gap-2 font-medium">
            <Clock className="w-4 h-4 text-stone-400" />
            <span>刊登時間：</span>
          </div>
          <select
            value={deadlineDays}
            onChange={(e) => setDeadlineDays(Number(e.target.value))}
            className="px-2.5 py-1 rounded-lg border border-stone-200 bg-white font-semibold text-stone-800 text-xs cursor-pointer"
          >
            <option value={7}>7 天</option>
            <option value={14}>14 天（推薦）</option>
            <option value={30}>30 天</option>
            <option value={60}>60 天</option>
            <option value={0}>永久</option>
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
                {isRaceMode ? '痛點提出競賽期間免費，開放給參賽團隊作為解題題目與共創解方。' : '痛點提出無門檻發布，各領域人才提供落地解法，您可自由評估後付費解鎖。'}
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
                  《提問會員服務條款》
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
                  《一般服務條款》
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
                《一般服務條款》
              </button>
              規範，發布即代表同意平台服務規範。
            </span>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2.5 sm:gap-3 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
          >
            取消返回
          </button>

          {/* 創新提案或軟體程式：專屬預覽效果按鈕 */}
          {(postType === 'innovation_proposal' || postType === 'vibecoding_app') && (
            <button
              type="button"
              onClick={handleOpenPreview}
              className="px-4 py-2.5 rounded-xl border-2 border-indigo-500 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs sm:text-sm font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="送出前預覽前台卡片與內頁展示效果"
            >
              <Eye className="w-4 h-4 text-indigo-600" />
              <span>預覽效果</span>
            </button>
          )}

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
                    ? (isRaceMode ? '確認發布（競賽期間免費）' : '確認發布')
                    : `預扣 ${(currentBounty + (isPromotedWithMegaphone ? 50 : 0)).toLocaleString()} 點懸賞金 並發布`}
                </span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* 創新提案或軟體程式：刊登前效果即時預覽彈窗 */}
      {showPublishPreview && (postType === 'innovation_proposal' || postType === 'vibecoding_app') && (
        <PublishEffectPreviewModal
          isOpen={showPublishPreview}
          onClose={() => setShowPublishPreview(false)}
          onConfirmPublish={handleConfirmFromPreview}
          isSubmitting={isSubmitting}
          postType={postType}
          title={title}
          description={description}
          category={category}
          subcategory={subcategory}
          tags={tagsInput.split(/[#,\s，、]+/).map((t) => t.trim().replace(/^#/, '')).filter(Boolean)}
          authorName={publishIdentity === 'platform' ? '💡IdeaX 官方帳號💡' : resolveUserDisplayName(currentUser?.id || 'guest', currentUser?.name || '訪客')}
          authorAvatar={currentUser?.avatar}
          authorTitle={currentUser?.title}
          bounty={currentBounty}
          coverImage={coverImage}
          galleryImages={galleryImages}
          appName={appName}
          demoUrl={demoUrl || externalLink}
          techArchitecture={techArchitecture}
          referencedPainPoint={referencedPainPoint}
          targetGoal={targetGoal}
          currentVersion={currentVersion}
          selectedVibeCategories={selectedVibeCategories}
          domainTrack={category || '資通訊'}
        />
      )}
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
