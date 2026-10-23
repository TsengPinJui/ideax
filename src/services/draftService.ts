import { Category, ProblemLevel, PostType } from '../types';
import {
  StarSeasonStage,
  StarSeasonTrack,
  ProposalContentSection,
  ProposalAttachmentItem,
} from '../types/competition';

export interface QuestionDraft {
  id: string;
  userId: string;
  postType: PostType;
  appName?: string;
  title: string;
  description: string;
  category: Category | '';
  subcategory: string;
  subcategories?: string[];
  selectedVibeCategories?: string[];
  tagsInput: string;
  level: ProblemLevel;
  bounty: number;
  deadlineDays: number;
  paymentMethod?: string;
  externalLink?: string;
  demoUrl?: string;
  previewMode?: 'embed' | 'external';
  techArchitecture?: string;
  publishedPlatforms?: any[];
  referencedPainPoint?: string;
  targetGoal?: string;
  proposalProgressStage?: string;
  currentVersion?: string;
  coverImage?: string;
  galleryImages?: string[];
  youtubeUrl?: string;
  coverMode?: 'custom_image' | 'youtube_video';
  cardHoverMode?: 'video_autoplay' | 'image_carousel';
  showCardImage?: boolean;
  selectedCardImage?: string;
  mindMap?: any;
  enablePhasedDelivery?: boolean;
  phase1Points?: number;
  phase2Points?: number;
  isPromotedWithMegaphone?: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface ProposalDraft {
  id: string;
  userId: string;
  stage: StarSeasonStage;
  track: StarSeasonTrack;
  painPointTrackChoice?: string;
  title: string;
  summary: string;
  description: string;
  sections?: ProposalContentSection[];
  sourcePainPointId?: string;
  images: string[];
  externalLink?: string;
  technicalFeasibility?: string;
  marketAnalysis?: string;
  businessModelFinancials?: string;
  ambassadorCode?: string;
  attachment?: {
    url: string;
    name: string;
    size: number;
    mime: string;
  } | null;
  attachments?: ProposalAttachmentItem[];
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  schoolOrOrg?: string;
  bankCode?: string;
  bankAccount?: string;
  idNumber?: string;
  updatedAt: string;
  createdAt: string;
}

const STORAGE_QUESTION_DRAFTS_KEY = 'ideax_question_drafts_v1';
const STORAGE_PROPOSAL_DRAFTS_KEY = 'ideax_competition_proposal_drafts_v1';

function notifyDraftsUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ideax_drafts_updated'));
  }
}

// ----------------- 痛點 / 提問草稿 -----------------

export function getQuestionDrafts(userId?: string): QuestionDraft[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_QUESTION_DRAFTS_KEY);
    if (!raw) return [];
    const parsed: QuestionDraft[] = JSON.parse(raw);
    if (!userId) return parsed;
    return parsed.filter((d) => !d.userId || d.userId === userId || d.userId === 'user-guest');
  } catch (err) {
    console.error('Failed to load question drafts', err);
    return [];
  }
}

export function saveQuestionDraft(
  draftData: Partial<QuestionDraft> & { title?: string; description?: string },
  userId: string = 'user-guest'
): QuestionDraft {
  const all = getQuestionDrafts();
  const now = new Date().toISOString();
  const existingIndex = draftData.id ? all.findIndex((d) => d.id === draftData.id) : -1;

  const draft: QuestionDraft = {
    id: draftData.id || `draft-q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    userId: userId || draftData.userId || 'user-guest',
    postType: draftData.postType || 'seek_solution',
    appName: draftData.appName,
    title: draftData.title || '',
    description: draftData.description || '',
    category: draftData.category || '創新創業',
    subcategory: draftData.subcategory || '資訊科技',
    subcategories: draftData.subcategories,
    selectedVibeCategories: draftData.selectedVibeCategories,
    tagsInput: draftData.tagsInput || '',
    level: draftData.level || 'L2',
    bounty: draftData.bounty !== undefined ? draftData.bounty : 500,
    deadlineDays: draftData.deadlineDays || 14,
    paymentMethod: draftData.paymentMethod || '信用卡',
    externalLink: draftData.externalLink !== undefined ? draftData.externalLink : '',
    demoUrl: draftData.demoUrl !== undefined ? draftData.demoUrl : '',
    previewMode: draftData.previewMode,
    techArchitecture: draftData.techArchitecture,
    publishedPlatforms: Array.isArray(draftData.publishedPlatforms) ? draftData.publishedPlatforms : (draftData.publishedPlatforms || []),
    referencedPainPoint: draftData.referencedPainPoint,
    targetGoal: draftData.targetGoal,
    proposalProgressStage: draftData.proposalProgressStage,
    currentVersion: draftData.currentVersion,
    coverImage: draftData.coverImage,
    galleryImages: draftData.galleryImages,
    youtubeUrl: draftData.youtubeUrl,
    coverMode: draftData.coverMode,
    cardHoverMode: draftData.cardHoverMode,
    showCardImage: draftData.showCardImage,
    selectedCardImage: draftData.selectedCardImage,
    mindMap: draftData.mindMap,
    enablePhasedDelivery: draftData.enablePhasedDelivery || false,
    phase1Points: draftData.phase1Points || 200,
    phase2Points: draftData.phase2Points || 300,
    isPromotedWithMegaphone: draftData.isPromotedWithMegaphone || false,
    updatedAt: now,
    createdAt: existingIndex >= 0 ? all[existingIndex].createdAt : now,
  };

  // 限制草稿歷史數量（最多保留最新 5 份），防止陣列過大佔用 localStorage 5MB 空間
  const prunedList = all.slice(0, 5);
  if (existingIndex >= 0) {
    prunedList[existingIndex] = draft;
  } else {
    prunedList.unshift(draft);
  }

  let saveSuccess = false;
  let saveError: string | undefined;

  try {
    const serialized = JSON.stringify(prunedList);
    localStorage.setItem(STORAGE_QUESTION_DRAFTS_KEY, serialized);
    const verified = localStorage.getItem(STORAGE_QUESTION_DRAFTS_KEY);
    if (!verified) throw new Error('讀取本機草稿驗證失敗');
    saveSuccess = true;
    notifyDraftsUpdated();
  } catch (err: any) {
    console.warn('[DraftService] Primary save failed, attempting emergency quota recovery:', err);
    try {
      // 空間不足時，實施極限救援：僅保留當前此份草稿
      const emergencyList = [draft];
      localStorage.setItem(STORAGE_QUESTION_DRAFTS_KEY, JSON.stringify(emergencyList));
      const verified = localStorage.getItem(STORAGE_QUESTION_DRAFTS_KEY);
      if (!verified) throw new Error('極限儲存驗證失敗');
      saveSuccess = true;
      notifyDraftsUpdated();
    } catch (rescueErr: any) {
      console.error('[DraftService] Quota exceeded completely, could not write draft:', rescueErr);
      saveSuccess = false;
      saveError = '本機瀏覽器暫存空間不足（可能因圖片過多或檔案過大），草稿未能寫入！請清理快取或移除展示圖片。';
    }
  }

  return Object.assign(draft, {
    __saveSuccess: saveSuccess,
    __saveError: saveError,
  });
}

export function deleteQuestionDraft(draftId: string): void {
  const all = getQuestionDrafts();
  const filtered = all.filter((d) => d.id !== draftId);
  try {
    localStorage.setItem(STORAGE_QUESTION_DRAFTS_KEY, JSON.stringify(filtered));
    notifyDraftsUpdated();
  } catch (err) {
    console.error('Failed to delete question draft', err);
  }
}

// ----------------- 創星季 提案草稿 -----------------

export function getProposalDrafts(userId?: string): ProposalDraft[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_PROPOSAL_DRAFTS_KEY);
    if (!raw) return [];
    const parsed: ProposalDraft[] = JSON.parse(raw);
    if (!userId) return parsed;
    return parsed.filter((d) => !d.userId || d.userId === userId || d.userId === 'user-guest');
  } catch (err) {
    console.error('Failed to load proposal drafts', err);
    return [];
  }
}

export function saveProposalDraft(
  draftData: Partial<ProposalDraft> & { title?: string; summary?: string },
  userId: string = 'user-guest'
): ProposalDraft {
  const all = getProposalDrafts();
  const now = new Date().toISOString();
  const existingIndex = draftData.id ? all.findIndex((d) => d.id === draftData.id) : -1;

  const draft: ProposalDraft = {
    id: draftData.id || `draft-p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    userId: userId || draftData.userId || 'user-guest',
    stage: draftData.stage || 'solution',
    track: draftData.track || 'ict',
    painPointTrackChoice: draftData.painPointTrackChoice || 'auto',
    title: draftData.title || '',
    summary: draftData.summary || '',
    description: draftData.description || '',
    sections: draftData.sections || undefined,
    sourcePainPointId: draftData.sourcePainPointId || '',
    images: draftData.images || [],
    externalLink: draftData.externalLink || '',
    technicalFeasibility: draftData.technicalFeasibility || '',
    marketAnalysis: draftData.marketAnalysis || '',
    businessModelFinancials: draftData.businessModelFinancials || '',
    ambassadorCode: draftData.ambassadorCode || '',
    attachment: draftData.attachment || null,
    attachments: draftData.attachments || undefined,
    contactName: draftData.contactName || '',
    contactPhone: draftData.contactPhone || '',
    contactEmail: draftData.contactEmail || '',
    schoolOrOrg: draftData.schoolOrOrg || '',
    bankCode: draftData.bankCode || '',
    bankAccount: draftData.bankAccount || '',
    idNumber: draftData.idNumber || '',
    updatedAt: now,
    createdAt: existingIndex >= 0 ? all[existingIndex].createdAt : now,
  };

  if (existingIndex >= 0) {
    all[existingIndex] = draft;
  } else {
    all.unshift(draft);
  }

  try {
    localStorage.setItem(STORAGE_PROPOSAL_DRAFTS_KEY, JSON.stringify(all));
    notifyDraftsUpdated();
  } catch (err) {
    console.error('Failed to save proposal draft', err);
  }

  return draft;
}

export function deleteProposalDraft(draftId: string): void {
  const all = getProposalDrafts();
  const filtered = all.filter((d) => d.id !== draftId);
  try {
    localStorage.setItem(STORAGE_PROPOSAL_DRAFTS_KEY, JSON.stringify(filtered));
    notifyDraftsUpdated();
  } catch (err) {
    console.error('Failed to delete proposal draft', err);
  }
}
