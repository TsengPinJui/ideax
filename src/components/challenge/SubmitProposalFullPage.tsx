import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Send,
  ArrowLeft,
  ArrowRight,
  Upload,
  X,
  FileText,
  AlertCircle,
  CheckCircle2,
  Coins,
  LogIn,
  RefreshCw,
  ShieldCheck,
  Megaphone,
  Flame,
  Trophy,
  Gift,
  BookOpen,
  Users,
  Calendar,
  ChevronRight,
  Image as ImageIcon,
  Link as LinkIcon,
  Bot,
  Globe,
  Save,
  FolderOpen,
  GraduationCap,
  Eye,
  Undo2,
  Paperclip,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PainPointAutocompleteInput } from '../PainPointAutocompleteInput';
import {
  StarSeasonProposal,
  StarSeasonStage,
  StarSeasonTrack,
  STAR_SEASON_TRACKS,
  OFFICIAL_COMPETITION_TRACKS,
  ProposalContentSection,
  ProposalAttachmentItem,
} from '../../types/competition';
import {
  submitProposal,
  uploadProposalAttachment,
} from '../../services/competitionClientService';
import {
  getCompetitionProposalsForAdmin,
  saveAllCompetitionProposals,
  withdrawCompetitionProposal,
} from '../../services/competitionAdminSync';
import { CompetitionTermsModal, CompetitionDocumentKey } from './CompetitionTermsModal';
import { PainPointSelector } from './PainPointSelector';
import { StarSeasonBroadcastBanner } from './StarSeasonBroadcastBanner';
import { PublishingOverlayModal } from '../PublishingOverlayModal';
import { getCompetitionStageInfo } from '../../utils/competitionSchedule';
import { analyzeCompetitionItemWithAgent } from '../../services/competitionAiAgent';
import {
  processUploadedImageFile,
  MAX_IMAGE_FILE_SIZE_MB,
  ACCEPTED_IMAGE_TYPES,
} from '../../utils/imageUploadUtils';
import {
  ProposalDraft,
  saveProposalDraft,
  deleteProposalDraft,
  getProposalDrafts,
} from '../../services/draftService';
import { ProposalSectionsEditor } from './ProposalSectionsEditor';
import { ProposalAttachmentsManager } from './ProposalAttachmentsManager';
import { ProposalPreviewModal } from './ProposalPreviewModal';
import {
  DEFAULT_PROPOSAL_SECTION_TEMPLATES,
  extractProposalSections,
  serializeProposalSections,
  extractProposalAttachments,
} from '../../utils/proposalContentHelper';

interface SubmitProposalFullPageProps {
  onNavigate: (view: 'home' | 'explore' | 'rules' | 'participant' | 'judge' | 'ambassador') => void;
  onBackToOldSite: () => void;
  onOpenAuth: () => void;
  onGoToPainPoints?: () => void;
  painPointProposals: StarSeasonProposal[];
  onSuccess: () => void;
  initialDraftId?: string;
}

export const SubmitProposalFullPage: React.FC<SubmitProposalFullPageProps> = ({
  onNavigate,
  onBackToOldSite,
  onOpenAuth,
  onGoToPainPoints,
  painPointProposals,
  onSuccess,
  initialDraftId,
}) => {
  const {
    currentUser,
    setCurrentUser,
    questions,
    setQuestions,
    setAnswers,
    setAvailableUsers,
    addNotification,
    showCenterToast,
    openAboutModal,
  } = useApp();

  const [stageInfo, setStageInfo] = useState(() => getCompetitionStageInfo());

  useEffect(() => {
    const handleStageChange = () => {
      setStageInfo(getCompetitionStageInfo());
    };
    window.addEventListener('ideax_competition_stage_changed', handleStageChange);
    return () => window.removeEventListener('ideax_competition_stage_changed', handleStageChange);
  }, []);

  const [termsDoc, setTermsDoc] = useState<CompetitionDocumentKey | null>(null);

  const [editingDraftId, setEditingDraftId] = useState<string | null>(initialDraftId || null);
  const [availableDrafts, setAvailableDrafts] = useState<ProposalDraft[]>([]);
  const [isDraftDropdownOpen, setIsDraftDropdownOpen] = useState<boolean>(false);
  const [isDraftSaving, setIsDraftSaving] = useState<boolean>(false);

  const [formStage, setFormStage] = useState<StarSeasonStage>(() => {
    const info = getCompetitionStageInfo();
    return info.isPainPointStage ? 'pain_point' : 'solution';
  });
  const [formTrack, setFormTrack] = useState<StarSeasonTrack>('ict');
  const [painPointTrackChoice, setPainPointTrackChoice] = useState<string>('auto'); // 痛點選填，未選由 AI 市場顧問 Agent 自動賦予
  const [formTitle, setFormTitle] = useState<string>('');
  const [formSummary, setFormSummary] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formSections, setFormSections] = useState<ProposalContentSection[]>(() =>
    JSON.parse(JSON.stringify(DEFAULT_PROPOSAL_SECTION_TEMPLATES))
  );
  const [formAttachments, setFormAttachments] = useState<ProposalAttachmentItem[]>([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [editingPublishedProposalId, setEditingPublishedProposalId] = useState<string | null>(null);

  const [formSourcePainPointId, setFormSourcePainPointId] = useState<string>('');
  const [formReferencedPainPoint, setFormReferencedPainPoint] = useState<string>('');
  const [formTargetGoal, setFormTargetGoal] = useState<string>('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [showCardImage, setShowCardImage] = useState<boolean>(true);
  const [selectedCardImage, setSelectedCardImage] = useState<string>('');
  const [formExternalLink, setFormExternalLink] = useState<string>('');
  const [formTechnicalFeasibility, setFormTechnicalFeasibility] = useState<string>('');
  const [formMarketAnalysis, setFormMarketAnalysis] = useState<string>('');
  const [formBusinessModelFinancials, setFormBusinessModelFinancials] = useState<string>('');
  const [formAmbassadorCode, setFormAmbassadorCode] = useState<string>('');
  const [formAttachment, setFormAttachment] = useState<{
    url: string;
    name: string;
    size: number;
    mime: string;
  } | null>(null);

  // 聯絡個資與撥款資料 (隔離保存)
  const [teamName, setTeamName] = useState<string>('');
  const [showOrganizationOnCard, setShowOrganizationOnCard] = useState<boolean>(false);
  const [contactName, setContactName] = useState<string>(currentUser?.name || '');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>(currentUser?.email || '');
  const [schoolOrOrg, setSchoolOrOrg] = useState<string>('');
  const [bankCode, setBankCode] = useState<string>('');
  const [bankAccount, setBankAccount] = useState<string>('');
  const [idNumber, setIdNumber] = useState<string>('');

  const [pledgeAgreed, setPledgeAgreed] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);
  const [isProcessingImages, setIsProcessingImages] = useState<boolean>(false);

  // 載入使用者草稿列表
  const refreshDrafts = () => {
    if (currentUser) {
      setAvailableDrafts(getProposalDrafts(currentUser.id));
    } else {
      setAvailableDrafts(getProposalDrafts());
    }
  };

  useEffect(() => {
    refreshDrafts();
  }, [currentUser?.id]);

  // 載入已正式發布之提案至編輯表單（支援修改、預覽與撤回）
  const applyProposalToForm = (prop: StarSeasonProposal) => {
    setEditingPublishedProposalId(prop.id);
    setEditingDraftId(null);
    setFormStage(prop.stage || 'solution');
    setFormTrack(prop.track || 'ict');
    setFormTitle(prop.title || '');
    setFormSummary(prop.summary || '');
    setFormDescription(prop.description || '');
    const parsedSections = extractProposalSections(prop);
    if (parsedSections.length > 0) {
      setFormSections(parsedSections);
    }
    const parsedAtts = extractProposalAttachments(prop);
    setFormAttachments(parsedAtts);
    setFormSourcePainPointId(prop.sourcePainPointProposalId || '');
    setFormImages(prop.images || []);
    setFormExternalLink(prop.externalLink || '');
    setFormTechnicalFeasibility(prop.technicalFeasibility || '');
    setFormMarketAnalysis(prop.marketAnalysis || '');
    setFormBusinessModelFinancials(prop.businessModelFinancials || '');
    setFormAmbassadorCode(prop.referredByAmbassadorCode || '');
    if (prop.teamName) setTeamName(prop.teamName);
    if (prop.schoolName || prop.organizationName) setSchoolOrOrg(prop.schoolName || prop.organizationName || '');
    if (prop.showOrganization) setShowOrganizationOnCard(true);
    showToast(`已載入提案「${prop.title}」，您可以預覽、修改、儲存草稿或進行撤回。`);
  };

  // 讀取教學彈窗、痛點專區預選、已送出提案或指定草稿
  useEffect(() => {
    try {
      // 1. 指定已送出之提案 ID（編輯或撤回）
      const loadPropId = sessionStorage.getItem('ideax_challenge_load_proposal_id');
      if (loadPropId) {
        sessionStorage.removeItem('ideax_challenge_load_proposal_id');
        const allProps = getCompetitionProposalsForAdmin();
        const foundProp = allProps.find((p) => p.id === loadPropId);
        if (foundProp) {
          applyProposalToForm(foundProp);
          return;
        }
      }

      // 2. 指定草稿 ID
      const targetDraftId = initialDraftId || sessionStorage.getItem('ideax_challenge_load_draft_id');
      if (targetDraftId) {
        sessionStorage.removeItem('ideax_challenge_load_draft_id');
        const draftsList = getProposalDrafts(currentUser?.id);
        const target = draftsList.find((d) => d.id === targetDraftId);
        if (target) {
          applyDraftToForm(target);
          return;
        }
      }

      // 3. 預選主題
      const stored = sessionStorage.getItem('ideax_challenge_prefill_topic');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.title) {
          setFormTitle((prev) => prev || `針對「${parsed.title}」之創新解方`);
          setFormSummary((prev) => prev || `針對痛點「${parsed.title}」所提出之具體創新落地解決方案。`);
        }
        if (parsed.id) {
          setFormSourcePainPointId(parsed.id);
        }
        sessionStorage.removeItem('ideax_challenge_prefill_topic');
      } else if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const titleParam = params.get('title');
        const painPointIdParam = params.get('sourcePainPointId');
        if (titleParam) {
          setFormTitle((prev) => prev || `針對「${decodeURIComponent(titleParam)}」之創新解方`);
        }
        if (painPointIdParam) {
          setFormSourcePainPointId(painPointIdParam);
        }
      }
    } catch {}
  }, [initialDraftId, currentUser?.id]);

  const applyDraftToForm = (draft: ProposalDraft) => {
    setEditingDraftId(draft.id);
    setEditingPublishedProposalId(null);
    setFormStage(draft.stage || 'solution');
    setFormTrack(draft.track || 'ict');
    setPainPointTrackChoice(draft.painPointTrackChoice || 'auto');
    setFormTitle(draft.title || '');
    setFormSummary(draft.summary || '');
    setFormDescription(draft.description || '');

    // 恢復多段落與附件
    if (draft.sections && draft.sections.length > 0) {
      setFormSections(draft.sections);
    } else if (draft.description) {
      const parsed = extractProposalSections({ description: draft.description });
      if (parsed.length > 0) setFormSections(parsed);
    }

    if (draft.attachments && draft.attachments.length > 0) {
      setFormAttachments(draft.attachments);
    } else if (draft.attachment) {
      setFormAttachments([
        {
          id: 'att-draft',
          name: draft.attachment.name,
          url: draft.attachment.url,
          size: draft.attachment.size,
          mime: draft.attachment.mime,
        },
      ]);
    }

    setFormSourcePainPointId(draft.sourcePainPointId || '');
    setFormImages(draft.images || []);
    setFormExternalLink(draft.externalLink || '');
    setFormTechnicalFeasibility(draft.technicalFeasibility || '');
    setFormMarketAnalysis(draft.marketAnalysis || '');
    setFormBusinessModelFinancials(draft.businessModelFinancials || '');
    setFormAmbassadorCode(draft.ambassadorCode || '');
    setFormAttachment(draft.attachment || null);
    if (draft.contactName) setContactName(draft.contactName);
    if (draft.contactPhone) setContactPhone(draft.contactPhone);
    if (draft.contactEmail) setContactEmail(draft.contactEmail);
    if (draft.schoolOrOrg) setSchoolOrOrg(draft.schoolOrOrg);
    if (draft.bankCode) setBankCode(draft.bankCode);
    if (draft.bankAccount) setBankAccount(draft.bankAccount);
    if (draft.idNumber) setIdNumber(draft.idNumber);
    showToast(`已載入草稿「${draft.title || '未命名草稿'}」`);
  };

  // 儲存草稿 (含多段落與資料附件)
  const handleSaveDraft = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!formTitle.trim() && !formSummary.trim() && !formDescription.trim() && formSections.length === 0) {
      showToast('請至少輸入標題或構想簡述再儲存草稿');
      return;
    }

    setIsDraftSaving(true);
    try {
      const { serializedJson, plainTextSummary } = serializeProposalSections(formSections);
      const effectiveDesc = formStage === 'solution' ? serializedJson : (formDescription || plainTextSummary);

      const saved = saveProposalDraft(
        {
          id: editingDraftId || undefined,
          stage: formStage,
          track: formTrack,
          painPointTrackChoice,
          title: formTitle,
          summary: formSummary,
          description: effectiveDesc,
          sections: formSections,
          attachments: formAttachments,
          sourcePainPointId: formSourcePainPointId,
          images: formImages,
          externalLink: formExternalLink,
          technicalFeasibility: formTechnicalFeasibility,
          marketAnalysis: formMarketAnalysis,
          businessModelFinancials: formBusinessModelFinancials,
          ambassadorCode: formAmbassadorCode,
          attachment: formAttachments[0]
            ? {
                url: formAttachments[0].url,
                name: formAttachments[0].name,
                size: formAttachments[0].size || 0,
                mime: formAttachments[0].mime || 'application/octet-stream',
              }
            : formAttachment,
          contactName,
          contactPhone,
          contactEmail,
          schoolOrOrg,
          bankCode,
          bankAccount,
          idNumber,
        },
        currentUser?.id || 'user-guest'
      );
      setEditingDraftId(saved.id);
      refreshDrafts();
      showToast('提案草稿已暫存！您可隨時至個人列表或草稿箱繼續編輯');
    } catch (err) {
      console.error(err);
      showToast('暫存草稿失敗，請重試');
    } finally {
      setIsDraftSaving(false);
    }
  };

  // 撤回提案至草稿
  const handleWithdrawProposal = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const targetPropId = editingPublishedProposalId;
    if (!targetPropId) {
      // 若非編輯現有已送審提案，檢查是否有已儲存草稿
      if (editingDraftId) {
        showToast('目前編輯中的內容本就為草稿狀態，尚未發布。');
        return;
      }
      showToast('目前尚無已送審提案可供撤回');
      return;
    }

    if (
      !window.confirm(
        '確定要撤回此提案嗎？\n\n撤回後本提案將自官方審核清單與公開展示中移除，並保留完整資料轉為「暫存草稿」，您可以隨時修改後重新發布！'
      )
    ) {
      return;
    }

    try {
      const res = withdrawCompetitionProposal(targetPropId, currentUser?.id);
      if (res.success) {
        // 同步保存至草稿箱
        const { serializedJson } = serializeProposalSections(formSections);
        const draft = saveProposalDraft(
          {
            stage: formStage,
            track: formTrack,
            painPointTrackChoice,
            title: formTitle,
            summary: formSummary,
            description: formStage === 'solution' ? serializedJson : formDescription,
            sections: formSections,
            attachments: formAttachments,
            sourcePainPointId: formSourcePainPointId,
            images: formImages,
            externalLink: formExternalLink,
            technicalFeasibility: formTechnicalFeasibility,
            marketAnalysis: formMarketAnalysis,
            businessModelFinancials: formBusinessModelFinancials,
            ambassadorCode: formAmbassadorCode,
            contactName,
            contactPhone,
            contactEmail,
            schoolOrOrg,
            bankCode,
            bankAccount,
            idNumber,
          },
          currentUser?.id || 'user-guest'
        );

        setEditingDraftId(draft.id);
        setEditingPublishedProposalId(null);
        refreshDrafts();
        showToast(res.message, true);
      } else {
        showToast(res.message);
      }
    } catch (err: any) {
      showToast(err.message || '撤回出錯');
    }
  };

  const showToast = (message: string, isSuccess = false) => {
    addNotification({
      title: '創星季',
      message,
      type: 'system',
    });
    showCenterToast(
      isSuccess || message.includes('成功') ? '發布成功！' : '創星季提醒',
      message,
      {
        type: isSuccess || message.includes('成功') ? 'success' : 'info',
        duration: 2500,
      }
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      showToast('附件檔案請勿超過 20MB');
      return;
    }

    setIsUploadingFile(true);
    try {
      const res = await uploadProposalAttachment(file);
      if (res && res.url) {
        setFormAttachment(res);
        showToast('附件上傳完成！');
      }
    } catch (err: any) {
      showToast(err.message || '上傳出錯');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleImageFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (formImages.length + files.length > 3) {
      showToast('最多上傳 3 張照片/圖片');
      return;
    }

    setIsProcessingImages(true);
    const newImages: string[] = [];

    for (const file of Array.from(files)) {
      const res = await processUploadedImageFile(file, MAX_IMAGE_FILE_SIZE_MB);
      if (!res.ok || !res.dataUrl) {
        showToast(res.error || `檔案「${file.name}」上傳失敗`);
      } else {
        newImages.push(res.dataUrl);
      }
    }

    if (newImages.length > 0) {
      setFormImages((prev) => [...prev, ...newImages].slice(0, 3));
      showToast(`已成功上傳 ${newImages.length} 張圖片`);
    }
    setIsProcessingImages(false);
    e.target.value = '';
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setFormImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleInsertDemoImages = () => {
    const demoPresets = [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    ];
    setFormImages(demoPresets.slice(0, formStage === 'solution' ? 2 : 1));
    showToast('已帶入展示示範照片');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser || currentUser.id === 'user-guest') {
      onOpenAuth();
      return;
    }

    const isRegisteredParticipant = Boolean(
      currentUser?.competitionBadges?.includes('創星季') ||
      (currentUser as any)?.isCompetitionRegistered ||
      (typeof window !== 'undefined' && currentUser?.id && localStorage.getItem(`ideax_participant_registered_${currentUser.id}`))
    );

    if (!isRegisteredParticipant) {
      showToast('【尚未完成報名】提案參賽前須先完成「報名參賽」團隊資料登錄！系統將為您導向報名頁。');
      onNavigate('participant');
      return;
    }

    const currentStageInfo = getCompetitionStageInfo();
    if (formStage === 'pain_point') {
      if (!currentStageInfo.isPainPointStage) {
        if (currentStageInfo.isBeforeStart || currentStageInfo.isRegistrationOnlyStage) {
          showToast('痛點徵件功能將於 10/24 00:00 正式開放！目前尚未開跑。');
          return;
        } else {
          showToast('第一階段「痛點徵件」已於 11/13 16:30 截止！目前開放「想解方提案」。');
          return;
        }
      }
    } else {
      // 提案 (solution)
      if (!currentStageInfo.isProposalStage) {
        if (currentStageInfo.isBeforeStart || currentStageInfo.isRegistrationOnlyStage || currentStageInfo.isPainPointStage) {
          showToast('提案功能將於 11/14 10:00 正式開放！目前為痛點徵件階段。');
          return;
        } else {
          showToast('創星季提案已於 12/04 16:30 截止收件！目前已進入決選評審階段。');
          return;
        }
      }
    }

    if (!formTitle.trim() || !formSummary.trim() || !contactName.trim() || !contactPhone.trim()) {
      showToast('請完整填寫標題、簡述/概述、聯絡人姓名與手機');
      return;
    }

    const { serializedJson, plainTextSummary } = serializeProposalSections(formSections);
    const effectiveDescription = formStage === 'solution' ? serializedJson : formDescription.trim();

    if (formStage === 'solution') {
      const hasContent = formSections.some(
        (s) => s.title.trim() || s.content.trim() || (s.images && s.images.length > 0)
      );
      if (!hasContent && !formDescription.trim()) {
        showToast('提案需填寫詳細內容或企畫書（至少一個段落）');
        return;
      }
      if (formImages.length === 0) {
        showToast('提案需包含 1~3 張圖片展示照片（會顯示於提案區），請上傳照片或點選帶入展示範例照');
        return;
      }
    }

    if (!pledgeAgreed) {
      showToast('請先勾選同意 《IdeaX一般條款》 與 《創星季參賽者條款》');
      return;
    }

    setIsSubmitting(true);
    try {
      // AI 市場顧問 Agent 自動分析：痛點未填領域則自動賦予四大分類，並自動賦予 3~5 個標籤
      const aiAnalysis = await analyzeCompetitionItemWithAgent({
        title: formTitle.trim(),
        summary: formSummary.trim(),
        description: effectiveDescription,
        stage: formStage,
        userTrack: formStage === 'solution' ? formTrack : (painPointTrackChoice === 'auto' ? undefined : painPointTrackChoice),
      });

      const effectiveTrack: StarSeasonTrack = formStage === 'solution' ? formTrack : aiAnalysis.track;
      const effectiveTags = aiAnalysis.tags;
      const aiCategorized = formStage === 'pain_point' && painPointTrackChoice === 'auto';

      const sourcePainPoint =
        painPointProposals.find((p) => p.id === formSourcePainPointId) ||
        questions.find((q) => q.id === formSourcePainPointId);

      const primaryAtt = formAttachments[0] || formAttachment;

      const res = await submitProposal({
        stage: formStage,
        track: effectiveTrack,
        title: formTitle.trim(),
        summary: formSummary.trim(),
        description: effectiveDescription,
        sourcePainPointProposalId: formStage === 'solution' ? formSourcePainPointId : undefined,
        sourcePainPointTitle: formStage === 'solution' ? sourcePainPoint?.title : undefined,
        images: formImages,
        externalLink: formExternalLink.trim() || undefined,
        technicalFeasibility: formTechnicalFeasibility.trim() || undefined,
        marketAnalysis: formMarketAnalysis.trim() || undefined,
        businessModelFinancials: formBusinessModelFinancials.trim() || undefined,
        tags: effectiveTags,
        aiCategorized,
        attachmentUrl: primaryAtt?.url,
        attachmentName: primaryAtt?.name,
        attachmentSize: primaryAtt?.size,
        attachmentMime: primaryAtt?.mime,
        referredByAmbassadorCode: formAmbassadorCode,
        contactName,
        contactPhone,
        contactEmail,
        schoolOrOrg,
        bankCode,
        bankAccount,
        idNumber,
      });

      if (res.success) {
        showToast(res.message);

        // 同步錄入管理員後台審核資料庫
        try {
          const newPropId = res.proposalId || editingPublishedProposalId || `prop-sub-${Date.now()}`;
          const currentProps = getCompetitionProposalsForAdmin();
          const existingProp = currentProps.find((p) => p.id === (editingPublishedProposalId || newPropId));
          const painPointObj =
            painPointProposals.find((p) => p.id === formSourcePainPointId) ||
            questions.find((q) => q.id === formSourcePainPointId);
          const updatedPropItem = {
            id: existingProp?.id || newPropId,
            title: formTitle.trim(),
            stage: formStage,
            track: effectiveTrack,
            summary: formSummary.trim(),
            description: effectiveDescription,
            sections: formSections,
            attachments: formAttachments,
            authorId: existingProp?.authorId || currentUser.id,
            authorName: showOrganizationOnCard && schoolOrOrg.trim()
              ? `${schoolOrOrg.trim()} ｜ ${(teamName.trim() || currentUser.name || contactName)}`
              : (teamName.trim() || currentUser.name || contactName),
            teamName: teamName.trim() || currentUser.name || contactName,
            schoolName: schoolOrOrg.trim() || undefined,
            organizationName: schoolOrOrg.trim() || undefined,
            showOrganization: showOrganizationOnCard,
            authorAvatar: existingProp?.authorAvatar || currentUser.avatar,
            authorRole: existingProp?.authorRole || (currentUser.role as any) || 'user',
            sourcePainPointProposalId: formSourcePainPointId || undefined,
            sourcePainPointTitle: painPointObj?.title || undefined,
            images: formImages,
            showCardImage: formImages.length > 0 ? showCardImage : undefined,
            cardDisplayImage: (showCardImage && formImages.length > 0)
              ? (selectedCardImage || formImages[0] || undefined)
              : undefined,
            externalLink: formExternalLink.trim() || undefined,
            referencedPainPoint: formReferencedPainPoint.trim() || undefined,
            targetGoal: formTargetGoal.trim() || undefined,
            technicalFeasibility: formTechnicalFeasibility.trim() || undefined,
            marketAnalysis: formMarketAnalysis.trim() || undefined,
            businessModelFinancials: formBusinessModelFinancials.trim() || undefined,
            tags: effectiveTags,
            aiCategorized,
            status: existingProp?.status || 'pending_review',
            supportPoints: existingProp?.supportPoints ?? 0,
            supporterCount: existingProp?.supporterCount ?? 0,
            targetFundingAmount: existingProp?.targetFundingAmount ?? 100000,
            likeCount: existingProp?.likeCount ?? 0,
            commentsCount: existingProp?.commentsCount ?? 0,
            attachmentUrl: primaryAtt?.url,
            attachmentName: primaryAtt?.name,
            attachmentSize: primaryAtt?.size,
            attachmentMime: primaryAtt?.mime,
            createdAt: existingProp?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          saveAllCompetitionProposals(
            existingProp
              ? currentProps.map((p) => (p.id === existingProp.id ? updatedPropItem : p))
              : [updatedPropItem, ...currentProps.filter((p) => p.id !== newPropId)]
          );
        } catch {}

        // 同步寫入舊站痛點專區與對應提案
        const exclusiveChallengeUrl = `https://ideax.tw/challenge?proposalId=${res.proposalId || 'new'}`;
        if (formStage === 'pain_point') {
          const newQ = {
            id: res.proposalId || `star-pain-${Date.now()}`,
            title: `【痛點】${formTitle.trim()}`,
            description: `${formSummary.trim()}\n\n${formDescription.trim()}\n\n🏆 創星季競賽痛點專屬連結：${exclusiveChallengeUrl}`,
            category: (STAR_SEASON_TRACKS[effectiveTrack]?.name || '創新創業') as any,
            tags: ['創點子', '痛點', '創星季', STAR_SEASON_TRACKS[effectiveTrack]?.tag || '創新痛點', ...effectiveTags],
            postType: 'pain_point' as const,
            images: formImages,
            bounty: 0,
            authorId: currentUser.id,
            authorName: currentUser.name || contactName,
            authorAvatar: currentUser.avatar,
            authorRole: currentUser.role,
            status: 'open' as const,
            answersCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            exclusiveChallengeUrl,
            isStarSeason: true,
            starSeasonProposalId: res.proposalId,
          };
          setQuestions((prev: any) => [newQ, ...prev]);
        } else if (formStage === 'solution' && formSourcePainPointId) {
          const newAns = {
            id: `ans-${res.proposalId || Date.now()}`,
            questionId: formSourcePainPointId,
            solverId: currentUser.id,
            solverName: currentUser.name || contactName,
            solverAvatar: currentUser.avatar,
            title: formTitle.trim(),
            content: `💡【創星季提案解方】${formTitle.trim()}\n\n${formSummary.trim()}\n\n${formDescription.trim()}\n\n🔗 參賽網站專屬專案連結：${exclusiveChallengeUrl}`,
            exclusiveChallengeUrl,
            isStarSeasonSolution: true,
            starSeasonProposalId: res.proposalId,
            sourcePainPointProposalId: formSourcePainPointId,
            images: formImages,
            price: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setAnswers((prev: any) => [newAns, ...prev]);
          setQuestions((prev: any) =>
            prev.map((q: any) =>
              q.id === formSourcePainPointId
                ? { ...q, answersCount: (q.answersCount || 0) + 1 }
                : q
            )
          );
        }

        // 若有綁定草稿，發布成功後自動清除該草稿
        if (editingDraftId) {
          deleteProposalDraft(editingDraftId);
          setEditingDraftId(null);
          refreshDrafts();
        }

        showToast(
          formStage === 'pain_point'
            ? '痛點發布成功！已成功上架至創星季痛點專區！'
            : '提案發布成功！您的創新方案已成功送出！',
          true
        );

        onSuccess();
        onNavigate('home');
      } else {
        showToast(res.message);
      }
    } catch (err: any) {
      showToast(err.message || '提交失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-24 font-sans">
      {/* 獨立頂部導覽列 */}
      <header className="bg-white/95 border-b border-amber-200 sticky top-0 z-40 backdrop-blur-md shadow-xs">
        {/* 創星季廣播橫幅：誠徵各行業專家參與注資，注資額300萬（點擊申請） */}
        <StarSeasonBroadcastBanner onApply={() => onNavigate('judge')} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 shrink-0 -ml-1 sm:-ml-2">
              <button
                type="button"
                onClick={() => {
                  onBackToOldSite();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="p-1 -m-1 rounded-xl hover:bg-amber-100/60 active:scale-95 transition-all cursor-pointer flex items-center justify-center group"
                title="點擊回到 IdeaX 創點子平台首頁"
                aria-label="回到 IdeaX 創點子平台首頁"
              >
                <img src="/logo-bulb.png" alt="IdeaX 創點子平台 - 點擊回首頁" className="w-10.5 h-10.5 sm:w-12 sm:h-12 md:w-14 md:h-14 object-contain shrink-0 drop-shadow-xs group-hover:scale-105 transition-all" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onNavigate('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="p-1 -m-1 rounded-xl hover:bg-amber-100/60 active:scale-95 transition-all cursor-pointer flex items-center group -ml-1"
                title="點擊返回創星季首頁"
                aria-label="回創星季競賽首頁"
              >
                <img src="/logo-chuangxingji-text.png" alt="創星季 - 點擊回競賽首頁" className="h-7.5 sm:h-9 md:h-10.5 w-auto object-contain shrink-0 group-hover:opacity-90 transition-all" />
              </button>
            </div>

            <span className="text-stone-300 hidden sm:inline">|</span>

            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="inline-flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-amber-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回提案總覽</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700 bg-stone-100/80 p-1 rounded-2xl border border-stone-200/80">
            {/* 1. 我想提案! (當前頁) */}
            <span className="px-3.5 py-1.5 rounded-xl text-stone-950 bg-amber-400 font-black shadow-2xs flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-stone-950" />
              <span>我想提案!</span>
            </span>

            <div className="h-4 w-px bg-stone-300/80 mx-0.5" />

            {/* 2. 探索Idea */}
            <button
              type="button"
              onClick={() => onNavigate('explore')}
              className="px-3 py-1.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-white transition-all cursor-pointer font-bold"
            >
              探索Idea
            </button>

            {/* 3. 痛點 → */}
            <button
              type="button"
              onClick={onGoToPainPoints || onBackToOldSite}
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-white transition-all cursor-pointer font-bold group"
              title="前往 IdeaX 創點子平台 痛點許願池並自動滾動至痛點區域"
            >
              <span>痛點</span>
              <ArrowRight className="w-3.5 h-3.5 text-stone-500 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* 4. 報名參賽 */}
            <button
              type="button"
              onClick={() => {
                if (!currentUser || currentUser.id === 'user-guest') {
                  onOpenAuth();
                  return;
                }
                onNavigate('participant');
              }}
              className="hidden md:inline-flex px-3 py-1.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-white transition-all cursor-pointer font-bold"
            >
              報名參賽
            </button>

            {/* 5. 成為專家 */}
            <button
              type="button"
              onClick={() => {
                if (!currentUser || currentUser.id === 'user-guest') {
                  onOpenAuth();
                  return;
                }
                onNavigate('judge');
              }}
              className="hidden md:inline-flex px-3 py-1.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-white transition-all cursor-pointer font-bold"
              title="點擊進入成為專家"
            >
              成為專家
            </button>

            {/* 6. 推廣大使 */}
            <button
              type="button"
              onClick={() => onNavigate('ambassador')}
              className="hidden lg:inline-flex px-3 py-1.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-white transition-all cursor-pointer font-bold"
            >
              推廣大使
            </button>

            {/* 行動版：優先保留痛點（隨著賽程變動，若換至提案階段則自動變換為提案捷徑），移除競賽辦法 */}
            {stageInfo.isProposalStage ? (
              <span className="sm:hidden inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-400 text-stone-950 text-xs font-black shadow-2xs">
                <Send className="w-3.5 h-3.5 text-stone-950" />
                <span>提案中</span>
              </span>
            ) : (
              <button
                onClick={onGoToPainPoints || onBackToOldSite}
                className="sm:hidden inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-98 group"
                title="前往 IdeaX創點子 創點子/痛點集並自動滾動至痛點區域"
              >
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                <span>痛點</span>
                <ArrowRight className="w-3.5 h-3.5 text-stone-500 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 滿版標題與簡介 */}
      <section className="bg-gradient-to-b from-amber-100/70 via-yellow-50/50 to-stone-50 border-b border-amber-200/70 pt-10 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-3">
          <h1 className="text-2xl sm:text-4xl font-black text-stone-950 tracking-tight">
            投稿參賽 — IdeaX 創星季
          </h1>

          <p className="text-xs sm:text-sm text-stone-700 max-w-xl mx-auto leading-relaxed">
            提出您的真實痛點洞察或創新落地解方。通過初審後即進入全體大眾模擬注資與專家評審！
          </p>
        </div>
      </section>

      {/* 滿版表單區域 */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {(!currentUser || currentUser.id === 'user-guest') && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-stone-800 font-bold">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>您目前尚未登入。提交提案前請先登入或註冊 IdeaX 帳號。</span>
            </div>
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-4 py-2 rounded-xl bg-stone-900 text-white font-bold hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
            >
              立即登入
            </button>
          </div>
        )}

        {/* 未完成報名參賽之導引卡片 */}
        {currentUser && currentUser.id !== 'user-guest' && !currentUser.competitionBadges?.includes('創星季') && !(currentUser as any)?.isCompetitionRegistered && !(typeof window !== 'undefined' && localStorage.getItem(`ideax_participant_registered_${currentUser.id}`)) && (
          <div className="mb-6 p-5 rounded-2xl bg-amber-50 border-2 border-amber-400 space-y-3 shadow-xs">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <h4 className="font-black text-amber-950 text-sm">【尚未完成報名】提案前請先登錄「報名參賽」團隊資料</h4>
                <p className="text-stone-700 leading-relaxed">
                  依創星季競賽規定，提交創新解方提案前，須先完成「報名參賽」團隊基本資料登錄。完成登錄後即可正式投件！
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('participant')}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <GraduationCap className="w-4 h-4" />
                <span>立即前往填寫「報名參賽」團隊資料 →</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 font-bold text-xs cursor-pointer"
              >
                返回競賽首頁
              </button>
            </div>
          </div>
        )}

        {/* 草稿提示與切換列 */}
        {availableDrafts.length > 0 && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-300 flex items-center justify-between gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-2 text-stone-800">
              <FolderOpen className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                {editingDraftId ? (
                  <>
                    正在編輯草稿：<b className="text-amber-900 font-black">{formTitle || '(未命名草稿)'}</b>
                  </>
                ) : (
                  <>
                    您有 <b className="text-amber-900 font-mono font-black">{availableDrafts.length}</b> 筆暫存提案草稿
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDraftDropdownOpen(!isDraftDropdownOpen)}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100/60 border border-amber-300 text-stone-800 font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  <span>載入其他草稿 ({availableDrafts.length})</span>
                </button>

                {isDraftDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-stone-200 rounded-2xl shadow-xl p-2 z-50 space-y-1">
                    <div className="text-[11px] font-bold text-stone-500 px-2 py-1">
                      選擇要載入的草稿：
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1">
                      {availableDrafts.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            applyDraftToForm(d);
                            setIsDraftDropdownOpen(false);
                          }}
                          className={`w-full text-left p-2 rounded-xl transition-colors cursor-pointer flex flex-col gap-0.5 ${
                            editingDraftId === d.id
                              ? 'bg-amber-100/80 text-amber-950 font-black'
                              : 'hover:bg-stone-100 text-stone-800'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold truncate">
                            <span className="truncate">{d.title || '(未命名草稿)'}</span>
                            <span className="text-[10px] text-stone-400 font-mono shrink-0 ml-1">
                              {new Date(d.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-[10px] text-stone-500 truncate">
                            {d.stage === 'solution' ? '創新解方' : '痛點需求'} · {d.summary || '無摘要'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {editingDraftId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingDraftId(null);
                    setFormTitle('');
                    setFormSummary('');
                    setFormDescription('');
                    setFormImages([]);
                    showToast('已切換為全新空白提案');
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 font-medium transition-colors cursor-pointer text-[11px]"
                >
                  開新提案
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} id="star-tour-proposal-editor" className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-xs text-xs">
          {/* 1. 提案階段選擇（嚴格依照競賽時程開放與關閉） */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-stone-800 font-black text-sm">
                1. 投件參賽階段 *
              </label>
              <span className="text-[11px] font-bold text-stone-500">
                {stageInfo.isPainPointStage
                  ? '🔥 目前開放：第一階段「痛點徵件」(10/24~11/13)'
                  : stageInfo.isProposalStage
                  ? '💡 目前開放：第二階段「創新提案」(11/14~12/04)'
                  : '🔒 非開放投稿時段'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* 第一階段：徵點子（痛點）- 僅在 10/24 00:00 ~ 11/13 16:30 開放 */}
              <button
                type="button"
                disabled={!stageInfo.isPainPointStage}
                onClick={() => {
                  if (!stageInfo.isPainPointStage) {
                    if (stageInfo.isBeforeStart || stageInfo.isRegistrationOnlyStage) {
                      showToast('痛點徵件功能將於 10/24 00:00 正式開放！');
                    } else {
                      showToast('第一階段「痛點徵件」已於 11/13 16:30 截止！目前開放第二階段「創新提案」。');
                    }
                    return;
                  }
                  setFormStage('pain_point');
                }}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  !stageInfo.isPainPointStage
                    ? 'border-stone-200 bg-stone-100/80 text-stone-400 opacity-60 cursor-not-allowed'
                    : formStage === 'pain_point'
                    ? 'border-rose-400 bg-rose-50/70 shadow-xs ring-2 ring-rose-300 cursor-pointer'
                    : 'border-stone-200 bg-white hover:bg-stone-50 cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`font-black text-sm ${!stageInfo.isPainPointStage ? 'text-stone-500' : 'text-rose-800'}`}>
                    第一階段：徵點子（痛點）
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    stageInfo.isPainPointStage
                      ? 'bg-rose-100 text-rose-700'
                      : stageInfo.isBeforeStart || stageInfo.isRegistrationOnlyStage
                      ? 'bg-stone-200 text-stone-600'
                      : 'bg-stone-200 text-stone-500'
                  }`}>
                    {stageInfo.isPainPointStage
                      ? '開放徵件中'
                      : stageInfo.isBeforeStart || stageInfo.isRegistrationOnlyStage
                      ? '10/24 開放'
                      : '已截止'}
                  </span>
                </div>
                <div className="text-[11px] text-stone-600 mt-1">
                  提出各領域未被滿足的真實需求或產業痛點（<b>過審即送 200 點</b>，價值 $250，效期 60 日）。
                </div>
              </button>

              {/* 第二階段：想解方（解法提案）- 僅在 11/14 10:00 ~ 12/04 16:30 開放 */}
              <button
                type="button"
                disabled={!stageInfo.isProposalStage}
                onClick={() => {
                  if (!stageInfo.isProposalStage) {
                    if (stageInfo.isBeforeStart || stageInfo.isRegistrationOnlyStage || stageInfo.isPainPointStage) {
                      showToast('提案功能將於 11/14 10:00 正式開放！目前為痛點徵件階段。');
                    } else {
                      showToast('創星季提案已於 12/04 16:30 截止收件！目前已進入決選評審階段。');
                    }
                    return;
                  }
                  setFormStage('solution');
                }}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  !stageInfo.isProposalStage
                    ? 'border-stone-200 bg-stone-100/80 text-stone-400 opacity-60 cursor-not-allowed'
                    : formStage === 'solution'
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-300 cursor-pointer'
                    : 'border-stone-200 bg-white hover:bg-stone-50 cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`font-black text-sm ${!stageInfo.isProposalStage ? 'text-stone-500' : 'text-emerald-900'}`}>
                    第二階段：想解方［創新提案］
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    stageInfo.isProposalStage
                      ? 'bg-emerald-100 text-emerald-800'
                      : stageInfo.isBeforeStart || stageInfo.isRegistrationOnlyStage || stageInfo.isPainPointStage
                      ? 'bg-stone-200 text-stone-600'
                      : 'bg-stone-200 text-stone-500'
                  }`}>
                    {stageInfo.isProposalStage
                      ? '開放提案中'
                      : stageInfo.isProposalClosed
                      ? '已截止'
                      : '11/14 開放'}
                  </span>
                </div>
                <div className="text-[11px] text-stone-500 mt-1">
                  針對產業痛點提出完整技術或商業模式解法，進行實戰模擬。
                </div>
              </button>
            </div>
          </div>

          {/* 2. 相關領域標注與標題 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {formStage === 'pain_point' ? (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-stone-800 font-bold">
                    2. 痛點所屬領域（選填）
                  </label>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                    選填 · AI市場顧問自動賦予
                  </span>
                </div>
                <select
                  value={painPointTrackChoice}
                  onChange={(e) => setPainPointTrackChoice(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-stone-900 font-bold focus:outline-none focus:border-amber-400"
                >
                  <option value="auto">🤖 由 AI 市場顧問 Agent 自動分析分類（未填選填）</option>
                  <option value="mechanical_transport">機電運輸</option>
                  <option value="ict">資通訊</option>
                  <option value="biomedical">生醫化材</option>
                  <option value="cultural_services">服務文創</option>
                </select>
                <p className="text-[10px] text-stone-500 mt-1">
                  若未填寫，發布時將由 AI 市場顧問 Agent 依題意自動賦予領域分類與標籤。
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-stone-800 font-bold">
                    2. 提案所屬領域 *（必填）
                  </label>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                    參賽者必填
                  </span>
                </div>
                <select
                  value={formTrack}
                  onChange={(e) => setFormTrack(e.target.value as StarSeasonTrack)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-stone-900 font-bold focus:outline-none focus:border-amber-400"
                  required
                >
                  {OFFICIAL_COMPETITION_TRACKS.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {tr.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-stone-500 mt-1">
                  四大領域分類為提案參賽者必填；AI 市場顧問 Agent 發布時將自動賦予精準標籤。
                </p>
              </div>
            )}

            <div>
              <label className="block text-stone-800 font-bold mb-1">
                3. {formStage === 'pain_point' ? '痛點標題名稱 *' : '提案標題名稱 *'}
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={formStage === 'pain_point' ? '例如: 智慧微電網動態需量預測不足導致用電尖峰斷電' : '例如: 智慧微電網動態需量反應預測系統'}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-stone-900 font-bold focus:outline-none focus:border-amber-400"
                required
              />
            </div>
          </div>

          {/* 3. 若為解方，選擇採用來源痛點 (支援輸入序號/名稱查詢與痛點捷徑) */}
          {formStage === 'solution' && (
            <PainPointSelector
              value={formSourcePainPointId}
              onChange={(id, pp) => {
                setFormSourcePainPointId(id);
                if (pp?.trackId) {
                  setFormTrack(pp.trackId);
                }
              }}
              painPointProposals={painPointProposals}
              onApplySuggestedTitle={(suggestedTitle, suggestedSummary) => {
                setFormTitle(suggestedTitle);
                setFormSummary(suggestedSummary);
              }}
            />
          )}

          {/* 4. 痛點簡述 / 核心摘要與創新價值 */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-stone-800 font-bold">
                  4. {formStage === 'pain_point' ? '痛點簡述 * (300字以內)' : '核心摘要與創新價值 * (300字以內)'}
                </label>
                <span className="text-[10px] text-stone-500">
                  用於瀏覽多題時的卡片模式展示
                </span>
              </div>
              <textarea
                rows={3}
                value={formSummary}
                onChange={(e) => setFormSummary(e.target.value)}
                placeholder={formStage === 'pain_point' ? '簡明扼要陳述生活或產業中所面臨之實際困難、尚未被滿足之需求...' : '簡明扼要介紹本提案之核心重點、創新價值主張、欲解決之關鍵痛點與預期成效...'}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-stone-900 focus:outline-none focus:border-amber-400 font-medium leading-relaxed"
                required
              />
            </div>

            {/* 5. 詳細內容或企畫書 (支援自訂多段落、大字粗體標題、文字顏色、插入大圖) */}
            <div>
              <label className="block text-stone-800 font-bold mb-2">
                5. {formStage === 'pain_point' ? '痛點深入說明 (選填)' : '詳細內容或企畫書 *'}
              </label>

              {formStage === 'solution' ? (
                <ProposalSectionsEditor
                  sections={formSections}
                  onChange={setFormSections}
                  showToast={showToast}
                />
              ) : (
                <textarea
                  rows={4}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="詳細說明痛點發生情境、關鍵瓶頸、對大眾或產業造成的具體損失與迫切性..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-stone-900 focus:outline-none focus:border-amber-400"
                />
              )}
            </div>
          </div>

          {/* 6. 資料附件區（企劃書完整檔案、簡報、規格書與壓縮包，選填） */}
          <ProposalAttachmentsManager
            attachments={formAttachments}
            onChange={setFormAttachments}
            showToast={showToast}
          />

          {/* 7. 圖片展示區塊 (僅創新提案支援圖片上傳，痛點不傳圖片卡片一律文字顯示) */}
          {formStage === 'solution' && (
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/90 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-bold text-stone-900 flex items-center gap-1.5 text-xs sm:text-sm">
                    <ImageIcon className="w-4 h-4 text-amber-600" />
                    <span>圖片展示 (1~3張，必填)</span>
                  </div>
                  <p className="text-[11px] text-stone-600 mt-0.5">
                    會顯示於提案專區圖片展示，展示核心產品、原型、團隊或架構照片；大卡片模式瀏覽時顯示。
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleInsertDemoImages}
                    className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-stone-700 text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    帶入展示範例照
                  </button>
                  <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-amber-200 text-amber-950">
                    {formImages.length}/3 張
                  </span>
                </div>
              </div>

              {/* 縮圖預覽列 */}
              {formImages.length > 0 && (
                <div className="grid grid-cols-3 gap-3 pt-1">
                  {formImages.map((img, idx) => (
                    <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-amber-300 bg-white shadow-2xs group">
                      <img src={img} alt={`upload-${idx}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-stone-900/80 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                        title="移除此圖片"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded bg-black/70 text-white text-[9px] font-mono">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {formImages.length < 3 && (
                <div>
                  <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-amber-300 rounded-xl hover:border-amber-500 bg-white hover:bg-amber-100/50 text-stone-800 font-bold cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-amber-600" />
                    <span>
                      {isProcessingImages
                        ? '圖片處理中...'
                        : `選擇電腦或手機圖片上傳（還可上傳 ${3 - formImages.length} 張 · 單張上限 ${MAX_IMAGE_FILE_SIZE_MB}MB）`}
                    </span>
                    <input
                      type="file"
                      accept={ACCEPTED_IMAGE_TYPES}
                      multiple
                      onChange={handleImageFilesUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* 可以選擇是否顯示圖片在卡片，可選擇一張 */}
              {formImages.length > 0 && (
                <div className="p-3.5 rounded-xl bg-white/95 border border-amber-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs font-black text-stone-900 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showCardImage}
                        onChange={(e) => setShowCardImage(e.target.checked)}
                        className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <span>在卡片模式顯示展示照片（勾選啟用）</span>
                    </label>
                    <span className="text-[11px] text-stone-500">
                      {showCardImage ? '已啟用：可於下方點選 1 張作為卡片展示封面' : '已關閉：卡片將以文字詳述/AI摘要/熱門留言呈現'}
                    </span>
                  </div>

                  {showCardImage && (
                    <div>
                      <p className="text-[11px] text-stone-600 font-medium mb-1.5">
                        👉 點擊選擇其中 1 張照片展示於卡片：
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {formImages.map((img, idx) => {
                          const isChosen = (selectedCardImage ? selectedCardImage === img : idx === 0);
                          return (
                            <div
                              key={idx}
                              onClick={() => setSelectedCardImage(img)}
                              className={`relative aspect-video rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                                isChosen
                                  ? 'border-amber-500 ring-2 ring-amber-400/50 shadow-md scale-102'
                                  : 'border-stone-200 opacity-70 hover:opacity-100 hover:border-amber-300'
                              }`}
                              title="點擊選定為卡片展示照"
                            >
                              <img src={img} alt={`展示圖 ${idx + 1}`} className="w-full h-full object-cover" />
                              {isChosen && (
                                <span className="absolute bottom-1 inset-x-1 py-0.5 rounded bg-amber-500 text-stone-950 font-black text-[9px] text-center shadow-xs">
                                  ★ 卡片展示
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 6. 若為提案：補充資料 (技術可行性、市場分析與定位、商業模式與財務預測...) */}
          {formStage === 'solution' && (
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
              <div className="font-bold text-stone-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>補充資料（加強專家評審與市場模擬募資評估）</span>
                </span>
                <span className="text-[10px] text-stone-500">選填推薦</span>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">
                    • 技術可行性說明 (選填)
                  </label>
                  <textarea
                    rows={2}
                    value={formTechnicalFeasibility}
                    onChange={(e) => setFormTechnicalFeasibility(e.target.value)}
                    placeholder="說明技術成熟度（TRL）、核心演算法、原型實測數據或已驗證指標..."
                    className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-bold mb-1">
                    • 市場分析與定位 (選填)
                  </label>
                  <textarea
                    rows={2}
                    value={formMarketAnalysis}
                    onChange={(e) => setFormMarketAnalysis(e.target.value)}
                    placeholder="目標客群（TAM/SAM/SOM）、主要競爭對手比較、獨特價值主張（UVP）..."
                    className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-bold mb-1">
                    • 商業模式與財務預測 (選填)
                  </label>
                  <textarea
                    rows={2}
                    value={formBusinessModelFinancials}
                    onChange={(e) => setFormBusinessModelFinancials(e.target.value)}
                    placeholder="獲利模式（訂閱/分潤/販售）、成本結構、損益平衡點或 1~3 年營收預估..."
                    className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>
          )}
          {/* 7.5 ［創新提案］專屬：引用相關痛點與希望達成的目標 (選填) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-amber-50/50 border border-amber-200">
            <div>
              <label className="block text-stone-800 font-bold mb-1 flex items-center gap-1.5 text-xs sm:text-sm">
                <Flame className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>引用相關痛點 (選填)</span>
              </label>
              <PainPointAutocompleteInput
                value={formReferencedPainPoint}
                onChange={(val) => setFormReferencedPainPoint(val)}
                questions={questions}
                placeholder="輸入關鍵字自動搜尋公開痛點，或直接填寫提案者自述痛點"
              />
            </div>

            <div>
              <label className="block text-stone-800 font-bold mb-1 flex items-center justify-between text-xs sm:text-sm">
                <span className="flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>［期望目標 / 欲達到的改善效果］ (選填)</span>
                </span>
                <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-1.5 py-0.2 rounded">
                  {formStage === 'pain_point' ? '改善效果 / 欲解決地方' : '里程碑目標'}
                </span>
              </label>
              <input
                type="text"
                value={formTargetGoal}
                onChange={(e) => setFormTargetGoal(e.target.value)}
                placeholder={
                  formStage === 'pain_point'
                    ? '例如：希望能解決人工流程繁瑣漏單問題，達到現場等待時間縮短 50% 與零出錯改善效果'
                    : '例如：希望 6 個月內達成 50,000 次下載量與 5,000 位活躍用戶，或完成 POC 企業付費驗證'
                }
                className="w-full bg-white border border-stone-200 rounded-xl p-2.5 text-stone-900 text-xs font-medium focus:outline-none focus:border-amber-400"
              />
              <p className="text-[11px] text-stone-500 mt-1">
                {formStage === 'pain_point'
                  ? '💡 目標說明：提痛點時的期望目標通常是以欲達到的改善效果、要解決的地方與預期衡量指標。'
                  : '💡 目標說明：例如「希望 6 個月達成 ××× 下載次數」或累積活躍用戶數、產品留存率等具體可衡量成果。'}
              </p>
            </div>
          </div>

          {/* 網站連結 / Demo 網址 / 外部資料 (選填) */}
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
            <label className="block text-stone-800 font-bold flex items-center justify-between text-xs sm:text-sm">
              <span className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>專屬網站連結 / Demo 體驗網址 / 外部參考資料 (選填)</span>
              </span>
              <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                卡片與內頁展示一鍵前往
              </span>
            </label>
            <input
              type="url"
              value={formExternalLink}
              onChange={(e) => setFormExternalLink(e.target.value)}
              placeholder="例如：https://ideax.tw 或 https://deeperdigger.online/"
              className="w-full bg-white border border-stone-200 rounded-xl p-2.5 text-stone-900 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-500 font-mono"
            />
            <p className="text-[11px] text-stone-500">
              💡 填寫後將於創星季提案總覽卡片與預覽卡片上顯示「前往連結」快捷按鈕，方便評審與讀者直接點擊造訪。
            </p>
          </div>

          {/* 8. 簡報附件與推廣大使推薦碼 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-stone-800 font-bold mb-1">
                提案簡報 / 計畫附件 (PDF/PPT, 20MB以內，選填)
              </label>
              {formAttachment ? (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-amber-700 shrink-0" />
                    <span className="truncate font-bold text-stone-800">{formAttachment.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormAttachment(null)}
                    className="text-stone-400 hover:text-stone-700 ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-stone-300 rounded-xl hover:border-amber-400 bg-stone-50 hover:bg-amber-50/40 text-stone-600 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4 text-amber-600" />
                  <span>{isUploadingFile ? '上傳中...' : '選擇檔案上傳'}</span>
                  <input
                    type="file"
                    accept=".pdf,.ppt,.pptx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div>
              <label className="block text-stone-800 font-bold mb-1">
                推廣大使推薦碼 (選填)
              </label>
              <input
                type="text"
                value={formAmbassadorCode}
                onChange={(e) => setFormAmbassadorCode(e.target.value.toUpperCase())}
                placeholder="輸入推薦碼 (如: AMB-USER-XXXX)"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-stone-900 font-mono focus:outline-none focus:border-amber-400 uppercase"
              />
              <p className="text-[10px] text-stone-400 mt-1">
                若通過初審，推薦您的推廣大使將獲得 400 點推廣獎勵（IdeaX平台點數，用於提問、享受付費服務）。
              </p>
            </div>
          </div>

          {/* 6. 聯絡人個資與撥款資訊 (隔離保存) */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
            <div className="font-bold text-stone-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>聯絡人資訊與獲獎撥款帳戶（僅供主辦單位核銷聯繫，不對外公開）</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-600 font-bold mb-1">團隊名稱 *（卡片固定公開顯示）</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="例如: 智創綠能隊"
                  className="w-full bg-white border border-stone-300 rounded-xl p-2 text-stone-900"
                  required
                />
              </div>
              <div>
                <label className="block text-stone-600 font-bold mb-1">學校 / 機構單位（選填）</label>
                <input
                  type="text"
                  value={schoolOrOrg}
                  onChange={(e) => setSchoolOrOrg(e.target.value)}
                  placeholder="例如: 國立臺灣大學"
                  className="w-full bg-white border border-stone-300 rounded-xl p-2 text-stone-900"
                />
                <div className="mt-1.5 flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    id="submit-show-org-checkbox"
                    checked={showOrganizationOnCard}
                    onChange={(e) => setShowOrganizationOnCard(e.target.checked)}
                    className="rounded border-stone-300 text-amber-600 focus:ring-amber-400"
                  />
                  <label htmlFor="submit-show-org-checkbox" className="text-xs text-stone-600 cursor-pointer select-none">
                    <span className="font-bold text-stone-800">在卡片上顯示機構名稱</span>
                    <span className="text-[10px] text-stone-500 ml-1">（未勾選則卡片僅顯示團隊名稱）</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-stone-600 font-bold mb-1">聯絡人真實姓名 *</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="姓名"
                  className="w-full bg-white border border-stone-300 rounded-xl p-2 text-stone-900"
                  required
                />
              </div>
              <div>
                <label className="block text-stone-600 font-bold mb-1">聯絡人手機電話 *</label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="0912-345-678"
                  className="w-full bg-white border border-stone-300 rounded-xl p-2 text-stone-900"
                  required
                />
              </div>
              <div>
                <label className="block text-stone-600 font-bold mb-1">電子信箱</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full bg-white border border-stone-300 rounded-xl p-2 text-stone-900"
                />
              </div>
              <div>
                <label className="block text-stone-600 font-bold mb-1">銀行代碼 (3碼)</label>
                <input
                  type="text"
                  maxLength={3}
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  placeholder="例如: 004"
                  className="w-full bg-white border border-stone-300 rounded-xl p-2 text-stone-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-stone-600 font-bold mb-1">銀行帳號 (入圍獎金撥付)</label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  placeholder="帳號"
                  className="w-full bg-white border border-stone-300 rounded-xl p-2 text-stone-900 font-mono"
                />
              </div>
              <div className="sm:col-span-2 text-[11px] text-amber-800 bg-amber-50/80 border border-amber-200/90 rounded-xl p-2.5 flex items-start gap-1.5 leading-relaxed">
                <span className="shrink-0 font-bold">⚠️ 撥款特別說明：</span>
                <span>本競賽活動<strong>不支援跨國跨境支付</strong>。海外參賽團隊或外籍得獎者如獲獎，須提供中華民國（臺灣）境內合法金融機構或郵局之新台幣銀行帳戶以供電匯撥發獎金。</span>
              </div>
            </div>
          </div>

          {/* 7. 原創性承諾與送出 */}
          <div className="flex items-start gap-2 pt-2">
            <input
              type="checkbox"
              id="submitPledge"
              checked={pledgeAgreed}
              onChange={(e) => setPledgeAgreed(e.target.checked)}
              className="mt-0.5 rounded text-amber-500 focus:ring-amber-400"
              required
            />
            <label htmlFor="submitPledge" className="text-[11px] text-stone-600 cursor-pointer leading-relaxed">
              我已閱讀並同意{' '}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openAboutModal('general_terms');
                }}
                className="text-amber-800 font-bold underline hover:text-amber-950 cursor-pointer"
              >
                《IdeaX一般條款》
              </button>
              {' '}與{' '}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTermsDoc('C');
                }}
                className="text-amber-800 font-bold underline hover:text-amber-950 cursor-pointer"
              >
                《創星季參賽者條款》
              </button>
              。
            </label>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row items-center gap-2.5 flex-wrap">
            {/* 1. 即時預覽按鈕 */}
            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(true)}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white hover:bg-amber-50 border-2 border-stone-200 hover:border-amber-400 text-stone-900 font-bold text-xs shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
              title="在發布前預覽提案之完整呈現效果"
            >
              <Eye className="w-4 h-4 text-amber-600" />
              <span>即時預覽</span>
            </button>

            {/* 2. 存為草稿按鈕 */}
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isDraftSaving || isSubmitting}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white hover:bg-stone-50 border-2 border-stone-200 hover:border-amber-400 text-stone-800 font-bold text-xs shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-50"
              title="將目前填寫的提案內容保存為草稿，隨時回個人列表繼續編輯"
            >
              <Save className="w-4 h-4 text-amber-600" />
              <span>{isDraftSaving ? '儲存中...' : editingDraftId ? '更新草稿' : '存為草稿'}</span>
            </button>

            {/* 3. 撤回提案按鈕 (當前處於編輯已送審提案或已發布提案時顯示) */}
            {(editingPublishedProposalId || editingDraftId) && (
              <button
                type="button"
                onClick={handleWithdrawProposal}
                className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-900 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
                title="將本提案撤回為草稿狀態，暫自公開展示與審查隊列中移除"
              >
                <Undo2 className="w-4 h-4 text-rose-700" />
                <span>撤回為草稿</span>
              </button>
            )}

            {/* 4. 正式送審 / 發布按鈕 */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex-1 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-sm transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center justify-center gap-2 active:scale-98"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>提交提案中...</span>
                </>
              ) : (
                <>
                  <span>確認送出提案（正式發布）</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </main>

      {/* 提案即時預覽彈窗 */}
      <ProposalPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title={formTitle}
        stage={formStage}
        track={formTrack}
        summary={formSummary}
        sections={formSections}
        plainDescription={formDescription}
        images={formImages}
        attachments={formAttachments}
        externalLink={formExternalLink}
        technicalFeasibility={formTechnicalFeasibility}
        marketAnalysis={formMarketAnalysis}
        businessModelFinancials={formBusinessModelFinancials}
        teamName={teamName}
        authorName={contactName || currentUser?.name}
        schoolOrOrg={schoolOrOrg}
        onConfirmPublish={() => {
          // 透過表單提交
          const formElement = document.getElementById('star-tour-proposal-editor') as HTMLFormElement;
          if (formElement) {
            formElement.requestSubmit();
          }
        }}
        onSaveDraft={handleSaveDraft}
        isPublishing={isSubmitting}
      />

      {/* 創星季規章與條款說明彈窗 */}
      {termsDoc && (
        <CompetitionTermsModal
          isOpen={Boolean(termsDoc)}
          onClose={() => setTermsDoc(null)}
          initialDoc={termsDoc}
        />
      )}

      {/* AI 發布中彈窗 */}
      <PublishingOverlayModal isSubmitting={isSubmitting} />
    </div>
  );
};

