import React, { useState, useRef } from 'react';
import { Question, Answer, AnswerType, DeliveryFormat, SolutionAttachment, SolutionMeetingDetails, DeliveryPhase, SUBSCRIPTION_PLANS } from '../types';
import { useApp } from '../context/AppContext';
import { restructureSolutionWithAI } from '../services/aiService';
import { HelpTooltip } from './HelpTooltip';
import {
  X,
  Send,
  Lock,
  Unlock,
  ShieldCheck,
  FileText,
  CheckCircle2,
  DollarSign,
  ArrowLeft,
  MessageSquare,
  Award,
  UploadCloud,
  FileSpreadsheet,
  Paperclip,
  Video,
  Calendar,
  Clock,
  Trash2,
  Info,
  Layers,
  Coins,
  AlertCircle,
  Sparkles,
  Crown,
  Sliders,
  Wand2,
  Copy,
  Check,
  ChevronDown,
} from 'lucide-react';

interface SubmitAnswerModalProps {
  question: Question;
  onClose: () => void;
  onSuccess: (ans: Answer) => void;
  initialType?: AnswerType;
  isFullPage?: boolean;
}

export const SubmitAnswerModal: React.FC<SubmitAnswerModalProps> = ({
  question,
  onClose,
  onSuccess,
  initialType = 'solution',
  isFullPage = false,
}) => {
  const { currentUser, submitAnswer, commissionRate, hasAgreedTerms, recordTermsAgreement, openAboutModal, subscribePlan, calculateSplitPayout } = useApp();

  const hasAgreedSolver = hasAgreedTerms('solver');
  const [agreeSolverTerms, setAgreeSolverTerms] = useState(hasAgreedSolver);
  const [termsError, setTermsError] = useState<string | null>(null);

  // Mode: 討論 (留言式無賞金) vs 方案 (文字建議、檔案、線上會談 - 可複選)
  const [answerType, setAnswerType] = useState<AnswerType>(initialType);
  const [deliveryFormats, setDeliveryFormats] = useState<DeliveryFormat[]>(['text']);

  // 1. 文字建議（免費公開 + 付費解鎖）
  const [freePreview, setFreePreview] = useState('');
  const [fullContent, setFullContent] = useState('');
  const [isPaid, setIsPaid] = useState(true);

  // 2. 檔案交付 (最多 3 個，單檔 200MB 內)
  const [attachments, setAttachments] = useState<SolutionAttachment[]>([]);
  const [externalStorageLink, setExternalStorageLink] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 3. 線上會談
  const [meetingDuration, setMeetingDuration] = useState<number>(30);
  const [meetingPlatform, setMeetingPlatform] = useState<SolutionMeetingDetails['platform']>('Google Meet');
  const [meetingTimeSlots, setMeetingTimeSlots] = useState<string>('平日晚上 19:30 - 22:00 或週末全天（預約後協調）');
  const [meetingAgenda, setMeetingAgenda] = useState<string>('');

  // 默認為該題懸賞金額才可解鎖，也可由回答者自訂編輯金額
  const defaultQuestionBounty = (question.bounty || 0) > 0 ? question.bounty : 300;
  const [price, setPrice] = useState<number>(defaultQuestionBounty);

  // 4. 多階段交付設定
  const [isPhasedDelivery, setIsPhasedDelivery] = useState<boolean>(Boolean(question.isPhasedDelivery));
  const [phase1Points, setPhase1Points] = useState<number>(
    question.phases && question.phases[0] ? question.phases[0].points : Math.round(defaultQuestionBounty * 0.4)
  );
  const [phase2Points, setPhase2Points] = useState<number>(
    question.phases && question.phases[1] ? question.phases[1].points : Math.round(defaultQuestionBounty * 0.6)
  );

  // Subscription tier access check
  const userTier = currentUser?.subscriptionTier || 'free';
  const isProOrHigher = ['pro', 'expert', 'authority', 'master'].includes(userTier);
  const isAuthorityOrHigher = ['authority', 'master'].includes(userTier);

  // AI Editing States
  const [isRestructuring, setIsRestructuring] = useState(false);
  const [tierGateNotice, setTierGateNotice] = useState<{
    feature: string;
    requiredTier: string;
    requiredTierId: 'expert' | 'authority';
    desc: string;
  } | null>(null);

  const [aiPreviewData, setAiPreviewData] = useState<{
    type: 'restructure';
    title: string;
    previewText: string;
    improvements?: string[];
  } | null>(null);

  const handleAiRestructure = async () => {
    if (!isProOrHigher) {
      setTierGateNotice({
        feature: 'AI 整理架構',
        requiredTier: '達人方案',
        requiredTierId: 'expert',
        desc: '自動將解題者輸入的草稿與零散文字，整理成具備「核心診斷、三階段 SOP 落地、量化 KPI、風險防護」更完整有邏輯的專業架構，大幅提升方案採納率！',
      });
      return;
    }

    setIsRestructuring(true);
    try {
      const raw = fullContent.trim() || freePreview.trim();
      const res = await restructureSolutionWithAI(raw, question.title);
      setAiPreviewData({
        type: 'restructure',
        title: 'AI 智慧整理架構成果預覽',
        previewText: res.structuredText,
        improvements: res.improvements,
      });
    } finally {
      setIsRestructuring(false);
    }
  };

  const handleApplyAiText = (target: 'full' | 'preview') => {
    if (!aiPreviewData) return;
    if (target === 'full') {
      setFullContent(aiPreviewData.previewText);
    } else {
      setFreePreview(aiPreviewData.previewText.slice(0, 300));
    }
    setAiPreviewData(null);
  };

  // Toggle delivery format checkbox (可複選，至少選一項)
  const toggleDeliveryFormat = (format: DeliveryFormat) => {
    setDeliveryFormats((prev) => {
      if (prev.includes(format)) {
        if (prev.length === 1) return prev; // 至少保留一項
        return prev.filter((f) => f !== format);
      } else {
        return [...prev, format];
      }
    });
  };

  // Handle File Upload Simulation (最多 3 個，總容量 ≤ 15MB)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxAllowedFiles = 3;
    const maxTotalSizeBytes = 15 * 1024 * 1024; // 15 MB total

    if (attachments.length + files.length > maxAllowedFiles) {
      setFileError(`最多僅能上傳 ${maxAllowedFiles} 個交付檔案（目前已上傳 ${attachments.length} 個）`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    let currentTotalBytes = attachments.reduce((sum, f) => sum + (f.sizeBytes || 0), 0);
    for (let i = 0; i < files.length; i++) {
      currentTotalBytes += files[i].size;
    }

    if (currentTotalBytes > maxTotalSizeBytes) {
      setFileError(`上傳檔案總容量超過 15MB 上限（所有檔案總和：${(currentTotalBytes / (1024 * 1024)).toFixed(1)}MB）`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const newFiles: SolutionAttachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      const sizeKb = (file.size / 1024).toFixed(0);
      const sizeText = file.size >= 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;

      newFiles.push({
        name: file.name,
        size: sizeText,
        sizeBytes: file.size,
        type: file.type || 'application/octet-stream',
        url: URL.createObjectURL(file),
      });
    }

    setAttachments((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    setFileError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!freePreview.trim()) return;

    if (freePreview.trim().length < 30) {
      setTermsError(`方案內容敘述至少需要 30 個字（目前已輸入 ${freePreview.trim().length} 字）`);
      return;
    }

    if (currentUser.id === 'user-guest') {
      setTermsError('請先登入會員帳號以參與' + (answerType === 'discussion' ? '社群討論' : '方案接案') + '（登入帳號即代表同意全站一般服務條款）');
      return;
    }

    // 提交落地方案 (提案) 檢核：個人資料與實名認證為必要條件
    if (answerType === 'solution') {
      const isProfileComplete = Boolean(
        currentUser.gender &&
        currentUser.ageGroup &&
        (currentUser.industry || currentUser.jobTitle || currentUser.title)
      );
      if (!isProfileComplete) {
        setTermsError('⚠️ 個人資料為提案之必要條件！請先前往「帳號設定 → 基本資料」填寫完成個人資料。');
        return;
      }
      if (currentUser.realNameAuthStatus !== 'verified') {
        setTermsError('⚠️ 實名認證為提案之必要條件！請先前往「帳號設定 → 實名認證」通過審核。');
        return;
      }

      if (!hasAgreedSolver) {
        if (!agreeSolverTerms) {
          setTermsError('提出方案前，請先勾選確認已詳閱並同意接案會員服務條款與一般服務條款');
          return;
        }
        recordTermsAgreement('solver');
      }
    }
    setTermsError(null);

    // Delivery Format validations
    if (answerType === 'solution') {
      if (deliveryFormats.includes('text') && isPaid && !fullContent.trim()) {
        return;
      }
      if (deliveryFormats.includes('file') && attachments.length === 0 && !fullContent.trim()) {
        setFileError('請至少上傳 1 個檔案或在下方填寫檔案說明');
        return;
      }
      if (deliveryFormats.includes('meeting') && !meetingAgenda.trim()) {
        return;
      }
    }

    const meetingDetails: SolutionMeetingDetails | undefined =
      deliveryFormats.includes('meeting')
        ? {
            durationMinutes: meetingDuration,
            platform: meetingPlatform,
            availableTimeSlots: meetingTimeSlots,
            meetingAgenda: meetingAgenda,
          }
        : undefined;

    // Determine descriptive tag
    const deliveryTypeLabel =
      deliveryFormats.length > 1
        ? '多維度整合方案'
        : deliveryFormats.includes('meeting')
        ? '線上諮詢會談'
        : deliveryFormats.includes('file')
        ? '檔案模型交付'
        : '文字落地建議';

    let phases: DeliveryPhase[] | undefined = undefined;
    if (isPhasedDelivery && answerType === 'solution') {
      phases = [
        {
          id: `phase-1-${Date.now()}`,
          phaseNumber: 1,
          title: '第 1 階段：架構脈絡與核心大綱診斷',
          description: freePreview.slice(0, 100) || '提供問題本質剖析與第一階段落地方向',
          points: phase1Points,
          status: 'pending_acceptance',
          submittedContent: freePreview,
        },
        {
          id: `phase-2-${Date.now()}`,
          phaseNumber: 2,
          title: '第 2 階段：深度落地實施與專屬交付驗收',
          description: '包含完整操作手冊、檔案附件交付或線上走查會談',
          points: phase2Points,
          status: 'pending_acceptance',
          submittedContent: fullContent,
        },
      ];
    }

    const finalAttachments: SolutionAttachment[] = [...attachments];
    if (externalStorageLink.trim()) {
      finalAttachments.push({
        name: `外部雲端共享連結 (Google Drive / Dropbox / Figma)`,
        size: '雲端連結',
        type: 'external_link',
        url: externalStorageLink.trim(),
      });
    }

    const finalFullContent =
      answerType === 'solution'
        ? externalStorageLink.trim()
          ? `${fullContent ? `${fullContent}\n\n` : ''}【外部雲端交付共享連結 (Google Drive / Dropbox / Figma)】\n${externalStorageLink.trim()}`
          : fullContent
        : undefined;

    const newAnswer = submitAnswer({
      questionId: question.id,
      type: answerType,
      deliveryFormat: answerType === 'discussion' ? 'text' : deliveryFormats[0],
      deliveryFormats: answerType === 'discussion' ? ['text'] : deliveryFormats,
      deliveryType: answerType === 'discussion' ? '交流探討' : deliveryTypeLabel,
      freePreview,
      fullContent: finalFullContent,
      attachments: deliveryFormats.includes('file') ? finalAttachments : undefined,
      meetingDetails: meetingDetails,
      isPaid: answerType === 'discussion' ? false : isPaid,
      price: answerType === 'discussion' ? 0 : (isPaid ? (isPhasedDelivery ? phase1Points + phase2Points : price) : 0),
      isPhasedDelivery: isPhasedDelivery && answerType === 'solution',
      phases,
    });

    onSuccess(newAnswer);
  };

  const netEarnings = answerType === 'solution' && isPaid ? price : 0;

  const content = (
    <div className={`bg-white rounded-2xl sm:rounded-3xl border border-stone-200 shadow-sm w-full ${isFullPage ? 'max-w-3xl mx-auto my-2' : 'max-w-2xl max-h-[96vh] sm:max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150'}`}>
      {/* Header */}
      <div className="p-3 sm:p-6 border-b border-stone-200 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          {isFullPage && (
            <button
              onClick={onClose}
              className="p-2 -ml-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="返回問題"
            >
              <ArrowLeft className="w-5 h-5 text-amber-600" />
              <span className="hidden sm:inline">返回問題</span>
            </button>
          )}
          <div className="w-9 h-9 rounded-xl bg-amber-400 text-stone-900 flex items-center justify-center shadow-xs font-bold">
            {answerType === 'solution' ? <Award className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900">
              {answerType === 'solution' ? '提出方案（付費解鎖）' : '公開討論（無賞金留言）'}
            </h2>
            <p className="text-xs text-stone-500 truncate max-w-md">針對「{question.title}」</p>
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
        {/* Answer Type Selector: 討論 vs 方案 */}
        <div className="p-1 rounded-2xl bg-stone-100 border border-stone-200 grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setAnswerType('solution')}
            className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              answerType === 'solution'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Award className="w-4 h-4 text-amber-600" />
            <span>提出方案（可付費、可附件）</span>
          </button>
          <button
            type="button"
            onClick={() => setAnswerType('discussion')}
            className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              answerType === 'discussion'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-stone-600" />
            <span>公開討論（無賞金留言）</span>
          </button>
        </div>

        {answerType === 'discussion' ? (
          /* Discussion Mode Form */
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-stone-700">留言討論內容 *</label>
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/70 border border-amber-300/80 px-1.5 py-0.2 rounded">
                    至少 30 字
                  </span>
                  <HelpTooltip
                    title="公開討論說明"
                    content="像留言一樣無賞金，適合提問者與社群針對問題背景、延伸疑難或經驗反饋進行公開交流。"
                  />
                </div>
                <span className={`text-[11px] font-mono ${freePreview.trim().length < 30 ? 'text-amber-600 font-bold' : 'text-stone-400'}`}>
                  {freePreview.trim().length} / 30 字
                </span>
              </div>
              <textarea
                required
                minLength={30}
                rows={5}
                value={freePreview}
                onChange={(e) => {
                  setFreePreview(e.target.value);
                  if (termsError) setTermsError(null);
                }}
                placeholder="輸入您的觀點、問題追問、相關背景經驗或與提問者展開討論..."
                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-stone-900 text-sm outline-none leading-relaxed"
              />
            </div>
          </div>
        ) : (
          /* Solution Mode Form */
          <div className="space-y-5">
            {/* 方案交付形式選擇：文字建議 | 檔案 | 線上會談（可複選） */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-bold text-stone-700">方案交付形式</label>
                  <HelpTooltip
                    title="方案交付形式說明"
                    content="可複選組合交付，例如：文字架構＋檔案模型＋線上會談，滿足不同提問者的驗收需求。"
                  />
                </div>
                <span className="text-[11px] text-stone-400">已選 {deliveryFormats.length} 種形式</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <button
                  key="text"
                  type="button"
                  onClick={() => toggleDeliveryFormat('text')}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer relative ${
                    deliveryFormats.includes('text')
                      ? 'border-amber-500 bg-amber-50/80 text-stone-950 ring-2 ring-amber-300/60 shadow-2xs font-bold'
                      : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {deliveryFormats.includes('text') && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-[10px] font-black">
                      ✓
                    </div>
                  )}
                  <FileText className={`w-5 h-5 ${deliveryFormats.includes('text') ? 'text-amber-600' : 'text-stone-400'}`} />
                  <span className="text-xs sm:text-sm font-bold">文字建議</span>
                  <span className="text-[10px] text-stone-400 font-normal hidden sm:inline">付費專屬全文</span>
                </button>

                <button
                  key="file"
                  type="button"
                  onClick={() => toggleDeliveryFormat('file')}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer relative ${
                    deliveryFormats.includes('file')
                      ? 'border-amber-500 bg-amber-50/80 text-stone-950 ring-2 ring-amber-300/60 shadow-2xs font-bold'
                      : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {deliveryFormats.includes('file') && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-[10px] font-black">
                      ✓
                    </div>
                  )}
                  <UploadCloud className={`w-5 h-5 ${deliveryFormats.includes('file') ? 'text-amber-600' : 'text-stone-400'}`} />
                  <span className="text-xs sm:text-sm font-bold">檔案交付</span>
                  <span className="text-[10px] text-stone-400 font-normal hidden sm:inline">最多3個 (總和≤15MB)</span>
                </button>

                <button
                  key="meeting"
                  type="button"
                  onClick={() => toggleDeliveryFormat('meeting')}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer relative ${
                    deliveryFormats.includes('meeting')
                      ? 'border-amber-500 bg-amber-50/80 text-stone-950 ring-2 ring-amber-300/60 shadow-2xs font-bold'
                      : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {deliveryFormats.includes('meeting') && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-[10px] font-black">
                      ✓
                    </div>
                  )}
                  <Video className={`w-5 h-5 ${deliveryFormats.includes('meeting') ? 'text-amber-600' : 'text-stone-400'}`} />
                  <span className="text-xs sm:text-sm font-bold">線上會談</span>
                  <span className="text-[10px] text-stone-400 font-normal hidden sm:inline">1對1 即時諮詢診斷</span>
                </button>
              </div>
            </div>

            {/* AI Assistant Writing Toolbar (整理架構 - 達人方案以上特權) */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-stone-100 border border-stone-200 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center shrink-0 shadow-2xs font-bold">
                  <Sparkles className="w-4 h-4 fill-stone-950" />
                </div>
                <div>
                  <span className="text-xs font-bold text-stone-900 block leading-tight">
                    AI潤飾
                  </span>
                  <span className="text-[10px] text-stone-500">
                    一鍵整理高階顧問架構・核心診斷、SOP步驟與KPI量化
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap relative">
                {/* Button: AI 整理架構 (達人方案以上解鎖) */}
                <button
                  type="button"
                  disabled={isRestructuring}
                  onClick={handleAiRestructure}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                    isProOrHigher
                      ? 'bg-amber-500 hover:bg-amber-600 text-stone-950 border border-amber-400'
                      : 'bg-white hover:bg-stone-50 text-stone-700 border border-stone-300'
                  }`}
                  title={isProOrHigher ? '將文字整理為具備核心診斷、SOP步驟、KPI的專業架構' : '此功能需訂閱達人方案以上解鎖'}
                >
                  <Wand2 className="w-3.5 h-3.5 text-amber-700" />
                  <span>{isRestructuring ? '架構整理中...' : 'AI 整理架構'}</span>
                  {!isProOrHigher ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 border border-stone-300 flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" /> 達人解鎖
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900">
                      達人特權
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* 公開精華摘要 (Free Preview) - 所有形式共通 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>公開顯示部分（免費精華預覽 / 診斷思路）*</span>
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/70 border border-amber-300/80 px-1.5 py-0.2 rounded">
                    至少 30 字
                  </span>
                </label>
                <span className={`text-[11px] font-mono ${freePreview.trim().length < 30 ? 'text-amber-600 font-bold' : 'text-stone-400'}`}>
                  {freePreview.trim().length} / 30 字
                </span>
              </div>
              <textarea
                required
                minLength={30}
                rows={3}
                value={freePreview}
                onChange={(e) => {
                  setFreePreview(e.target.value);
                  if (termsError) setTermsError(null);
                }}
                placeholder="請條列核心洞察、問題癥結與初步解方架構，讓提問者與潛在購買者確認您的專業價值..."
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-stone-900 text-sm outline-none leading-relaxed"
              />
            </div>

            {/* 1. 文字交付：付費解鎖內容 */}
            {deliveryFormats.includes('text') && (
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    <span>【文字建議】付費專屬完整落地內容 *</span>
                  </label>
                  <span className="text-[11px] text-amber-700 font-semibold">付費解鎖後方可閱讀完整文字</span>
                </div>
                <textarea
                  required={isPaid && deliveryFormats.includes('text')}
                  rows={5}
                  value={fullContent}
                  onChange={(e) => setFullContent(e.target.value)}
                  placeholder="提供完整執行落地步驟、話術、財務模型、合約條款、避坑指南與關鍵資源聯繫方式..."
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-stone-900 text-sm outline-none leading-relaxed font-mono text-xs bg-white"
                />
              </div>
            )}

            {/* 2. 檔案交付：上傳檔案 (最多3個，單檔50MB) + 檔案說明 */}
            {deliveryFormats.includes('file') && (
              <div className="space-y-3.5 p-4 rounded-2xl bg-stone-50 border border-stone-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-stone-800">
                      【檔案交付】上傳交付檔案（可上傳 3 個 50MB 內檔案）
                    </span>
                  </div>
                  <span className="text-[11px] text-amber-700 font-semibold">解鎖後方可下載完整檔案</span>
                </div>

                {/* 檔案儲存規則與外部雲端工具指引橫幅 */}
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1 leading-relaxed">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>檔案交付與備份提醒</span>
                  </div>
                  <p className="text-[11px] text-stone-600 font-normal">
                    可上傳 3 個 50MB 內檔案（請自行妥善備份原始檔）；大型檔案建議提供 Google Drive 或 Dropbox 共享連結。
                  </p>
                </div>

                {/* Error Banner */}
                {fileError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                    ⚠️ {fileError}
                  </div>
                )}

                {/* Upload Trigger Area */}
                {attachments.length < 3 ? (
                  <>
                    <input
                      type="file"
                      multiple
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      id="solution-file-upload"
                    />
                    <label
                      htmlFor="solution-file-upload"
                      className="p-4 rounded-xl border-2 border-dashed border-stone-300 hover:border-amber-500 bg-white hover:bg-amber-50/30 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center"
                    >
                      <UploadCloud className="w-6 h-6 text-stone-400 group-hover:text-amber-500" />
                      <span className="text-xs font-bold text-stone-700">
                        點擊此處選取檔案（還可上傳 {3 - attachments.length} 個檔案）
                      </span>
                      <span className="text-[11px] text-stone-400">
                        支援 PDF、PPT、XLSX、DOCX、ZIP、PNG、JSON 等（上限：最多 3 個檔案，所有檔案總和容量 ≤ 15MB）
                      </span>
                      <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mt-0.5">
                        ※ 提醒：請務必自行留存原始備份；大型檔案請使用外部雲端共享連結
                      </span>
                    </label>
                  </>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 font-semibold text-center">
                    ✓ 已達上傳上限（3 個檔案）。如需更換請先刪除下方檔案。
                  </div>
                )}

                {/* Uploaded Files List */}
                {attachments.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-stone-600">已選取檔案 ({attachments.length} / 3)：</span>
                    {attachments.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-stone-200 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileSpreadsheet className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="font-semibold text-stone-800 truncate">{file.name}</span>
                          <span className="text-[10px] text-stone-400 shrink-0 font-mono">({file.size})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(idx)}
                          className="text-stone-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 大型檔案外部雲端共享連結（Google Drive、Dropbox、Figma 等） */}
                <div className="pt-1">
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">
                    大型檔案外部雲端工具共享連結（Google Drive / Dropbox / Figma 等・選填）
                  </label>
                  <input
                    type="url"
                    value={externalStorageLink}
                    onChange={(e) => setExternalStorageLink(e.target.value)}
                    placeholder="例如：https://drive.google.com/file/... 或 https://www.figma.com/file/..."
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 text-xs text-stone-800 outline-none bg-white font-mono"
                  />
                  <span className="text-[10px] text-stone-400 mt-0.5 block">
                    解鎖後提問者可直接取得此連結下載原始大檔，權限請確保設定為「知道連結的使用者可檢視/下載」。
                  </span>
                </div>

                {/* Optional Supplementary Text when text mode not chosen */}
                {!deliveryFormats.includes('text') && (
                  <div className="pt-1">
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">
                      檔案說明與解鎖後查看指南（選填）
                    </label>
                    <textarea
                      rows={2}
                      value={fullContent}
                      onChange={(e) => setFullContent(e.target.value)}
                      placeholder="請簡述檔案包含的內容、版本號、使用說明或解壓密碼等..."
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 text-xs text-stone-800 outline-none bg-white"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 3. 線上會談：輸入時間、形式、內容 */}
            {deliveryFormats.includes('meeting') && (
              <div className="space-y-4 p-4 rounded-2xl bg-stone-50 border border-stone-200">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
                  <Video className="w-4 h-4 text-amber-600" />
                  <span>線上會談設定（時間、形式、內容）</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 會談時長 */}
                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">
                      1. 會談時長（時間）*
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[30, 45, 60].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setMeetingDuration(mins)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            meetingDuration === mins
                              ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-2xs'
                              : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                          }`}
                        >
                          {mins} 分鐘
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 會議形式 / 軟體 */}
                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">
                      2. 會談形式（線上軟體 / 工具）*
                    </label>
                    <select
                      value={meetingPlatform}
                      onChange={(e) => setMeetingPlatform(e.target.value as SolutionMeetingDetails['platform'])}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-semibold bg-white outline-none focus:border-amber-500 text-stone-800"
                    >
                      <option value="Google Meet">Google Meet 線上會議</option>
                      <option value="Zoom">Zoom 視訊會議</option>
                      <option value="Teams">Microsoft Teams</option>
                      <option value="LINE 語音 / 電話">LINE 語音 / 電話會議</option>
                      <option value="其他線上會議">其他線上會議（預約後提供連結）</option>
                    </select>
                  </div>
                </div>

                {/* 可預約時段說明 */}
                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">
                    3. 可約時段說明 *
                  </label>
                  <input
                    type="text"
                    required
                    value={meetingTimeSlots}
                    onChange={(e) => setMeetingTimeSlots(e.target.value)}
                    placeholder="例：平日晚上 19:30 - 22:00 或週末下午，解鎖後於站內私聊確認精確時間"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs text-stone-800 outline-none bg-white focus:border-amber-500"
                  />
                </div>

                {/* 會談內容大綱 */}
                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">
                    4. 會談內容大綱與諮詢範疇 *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={meetingAgenda}
                    onChange={(e) => setMeetingAgenda(e.target.value)}
                    placeholder="條列線上會談將涵蓋的診斷項目、互動形式（如簡報檢視、代碼線上走查、商業模式診斷、Q&A 問答等）..."
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs text-stone-800 outline-none bg-white focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            {/* Pricing settings - 默認為該題懸賞金額，也可由回答者自訂編輯金額 */}
            {/* Pricing settings - 默認為該題懸賞金額，也可由回答者自訂編輯金額 */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-stone-800 block">解鎖價格設定</label>
                  <span className="text-[11px] text-stone-500">
                    默認為該題懸賞金額（NT$ {defaultQuestionBounty.toLocaleString()}），亦可自訂；提問者或其他有興趣者皆可付此價格解鎖
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPaid(false)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      !isPaid ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    完全免費
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPaid(true)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      isPaid ? 'bg-amber-500 text-stone-950' : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    付費解鎖
                  </button>
                </div>
              </div>

              {/* 多階段交付方案設定 */}
              {isPaid && (
                <div className="p-3 bg-white rounded-xl border border-amber-200/80 space-y-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-600" />
                      <div>
                        <span className="text-xs font-bold text-stone-900">分多個階段交付方案（Phased Delivery）</span>
                        <p className="text-[11px] text-stone-500">
                          提問者接受此方案後將預扣點數；按階段推進並完成各階段驗收放款
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isPhasedDelivery}
                      onChange={(e) => setIsPhasedDelivery(e.target.checked)}
                      className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                    />
                  </label>

                  {isPhasedDelivery && (
                    <div className="pt-2 border-t border-stone-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-stone-700">第 1 階段（核心診斷脈絡）：</span>
                        <div className="flex items-center gap-1 font-mono">
                          <input
                            type="number"
                            value={phase1Points}
                            onChange={(e) => setPhase1Points(Math.max(50, Number(e.target.value)))}
                            className="w-20 px-2 py-0.5 border border-stone-300 rounded text-right font-bold"
                          />
                          <span className="text-stone-500">點</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-stone-700">第 2 階段（實操交付驗收）：</span>
                        <div className="flex items-center gap-1 font-mono">
                          <input
                            type="number"
                            value={phase2Points}
                            onChange={(e) => setPhase2Points(Math.max(50, Number(e.target.value)))}
                            className="w-20 px-2 py-0.5 border border-stone-300 rounded text-right font-bold"
                          />
                          <span className="text-stone-500">點</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-amber-800 font-medium">
                        兩階段合計：{phase1Points + phase2Points} 點
                      </p>
                    </div>
                  )}
                </div>
              )}

              {isPaid && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-stone-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-700 font-semibold">自訂解鎖價格：</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-stone-400 font-mono">NT$</span>
                      <input
                        type="number"
                        min={50}
                        step="any"
                        value={isPhasedDelivery ? phase1Points + phase2Points : price}
                        disabled={isPhasedDelivery}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        className={`w-28 px-2.5 py-1 rounded-lg border border-stone-300 text-sm font-bold text-right font-mono bg-white outline-none focus:border-amber-500 ${
                          isPhasedDelivery ? 'opacity-70 bg-stone-100 cursor-not-allowed' : ''
                        }`}
                      />
                    </div>
                    {(question.bounty || 0) > 0 && price !== question.bounty && !isPhasedDelivery && (
                      <button
                        type="button"
                        onClick={() => setPrice(question.bounty)}
                        className="text-[11px] text-amber-700 underline font-semibold cursor-pointer"
                      >
                        恢復題目的懸賞額 (NT${(question.bounty || 0).toLocaleString()})
                      </button>
                    )}
                  </div>

                  {(() => {
                    const activeAmount = isPhasedDelivery ? (phase1Points + phase2Points) : price;
                    const split = calculateSplitPayout(activeAmount, currentUser.id);
                    return (
                      <div className="text-xs text-stone-500 text-right space-y-1">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-bold text-stone-700">
                            預估實收撥款（{split.planName}・實收 {split.sellerPayoutText}）：
                          </span>
                          <span className="font-black text-emerald-700 font-mono text-sm sm:text-base">
                            NT$ {split.netPayout.toLocaleString()} 元
                          </span>
                        </div>
                        <span className="text-[10px] text-stone-500 block">
                          第三方金流自動拆款撥付・目前會員資格享【{split.planName}】{split.feeDiscountText}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 條款同意規範：提出方案需同意解答者條款（首次勾選後記錄，下次免再問）；單純討論免勾選 */}
        {answerType === 'solution' ? (
          !hasAgreedSolver ? (
            <div className={`p-3.5 rounded-2xl border transition-all ${termsError ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-200' : 'bg-blue-50/80 border-blue-300'}`}>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={agreeSolverTerms}
                  onChange={(e) => {
                    setAgreeSolverTerms(e.target.checked);
                    if (termsError) setTermsError(null);
                  }}
                  className="mt-0.5 w-4 h-4 accent-blue-600 rounded cursor-pointer shrink-0"
                />
                <div className="text-xs text-stone-800 leading-relaxed select-none">
                  <span className="font-bold text-stone-900">我已閱讀並同意</span>{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      openAboutModal('solver_terms');
                    }}
                    className="font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                  >
                    &lt;&lt;接案會員服務條款&gt;&gt;
                  </button>
                  {' '}與{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      openAboutModal('general_terms');
                    }}
                    className="font-bold text-stone-700 hover:text-stone-900 underline cursor-pointer"
                  >
                    &lt;&lt;一般服務條款&gt;&gt;
                  </button>
                  。
                </div>
              </label>
              {termsError && (
                <p className="text-[11px] text-rose-700 font-bold mt-1.5 pl-6 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{termsError}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>您已同意 &lt;&lt;接案會員服務條款&gt;&gt;（v2.1）</span>
              </span>
              <button
                type="button"
                onClick={() => openAboutModal('solver_terms')}
                className="text-blue-700 hover:underline font-bold text-[11px] cursor-pointer"
              >
                查閱條款全文
              </button>
            </div>
          )
        ) : (
          <div className="px-3.5 py-1.5 rounded-xl bg-stone-50 text-[11px] text-stone-500 flex items-center justify-between border border-stone-150">
            <span>社群討論交流受
              <button
                type="button"
                onClick={() => openAboutModal('general_terms')}
                className="text-stone-700 underline font-semibold mx-1 cursor-pointer"
              >
                &lt;&lt;一般服務條款&gt;&gt;
              </button>
              規範，無須另外簽署接案條款。
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-bold cursor-pointer"
          >
            取消
          </button>
          <button
            type="submit"
            className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-black text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{answerType === 'solution' ? '確認提出方案' : '發布討論留言'}</span>
          </button>
        </div>
      </form>

      {/* AI Tier Gate Notice Modal */}
      {tierGateNotice && (
        <div className="fixed inset-0 z-60 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Crown className="w-5 h-5 fill-amber-500 text-amber-600" />
              </div>
              <button
                type="button"
                onClick={() => setTierGateNotice(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full inline-block">
                需升級【{tierGateNotice.requiredTier}】以上
              </span>
              <h4 className="text-base font-black text-stone-900">
                解鎖「{tierGateNotice.feature}」專屬特權
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                {tierGateNotice.desc}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 space-y-1">
              <span className="font-bold block text-stone-900">
                訂閱方案特權包含：
              </span>
              {tierGateNotice.requiredTierId === 'expert' ? (
                <>
                  <div>• 平台服務費減半 -5%（僅收 5%，實收 95%）</div>
                  <div>• 全站懸賞「AI 初步問題分析報告」享免費 50 次解鎖</div>
                  <div>• AI 整理架構：一鍵將口語草稿整理為 4 層顧問架構</div>
                </>
              ) : (
                <>
                  <div>• 平台服務費降至 2%（極低服務費，實收 98% 撥款到帳）</div>
                  <div>• 全站懸賞「AI 初步問題分析報告」享免費無限次查看及下載報告</div>
                  <div>• 優先向高價值商業大案發問者推薦您的個人檔案</div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTierGateNotice(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                稍後再說
              </button>
              <button
                type="button"
                onClick={() => {
                  subscribePlan(tierGateNotice.requiredTierId);
                  setTierGateNotice(null);
                }}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Crown className="w-3.5 h-3.5 fill-stone-950" />
                <span>立即升級 {tierGateNotice.requiredTier}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Restructure & Adapt Result Comparison Preview Modal */}
      {aiPreviewData && (
        <div className="fixed inset-0 z-60 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95 my-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4 fill-stone-950" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-stone-900">
                    {aiPreviewData.title}
                  </h4>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiPreviewData(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {aiPreviewData.improvements && aiPreviewData.improvements.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
                <span className="font-bold block text-stone-900">✨ AI 結構化優化亮點：</span>
                <div className="space-y-0.5">
                  {aiPreviewData.improvements.map((imp, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-stone-800">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>{imp}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <span className="text-xs font-bold text-stone-700 block">生成文字成果：</span>
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 text-xs leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap font-mono">
                {aiPreviewData.previewText}
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setAiPreviewData(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                捨棄並關閉
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyAiText('preview')}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 font-bold text-xs cursor-pointer"
                >
                  套用至公開精華預覽
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyAiText('full')}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>套用至付費專屬完整內容</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isFullPage) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      {content}
    </div>
  );
};
