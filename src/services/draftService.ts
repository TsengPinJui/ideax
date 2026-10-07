import { Category, ProblemLevel, PostType } from '../types';
import { StarSeasonStage, StarSeasonTrack } from '../types/competition';

export interface QuestionDraft {
  id: string;
  userId: string;
  postType: PostType;
  title: string;
  description: string;
  category: Category | '';
  subcategory: string;
  tagsInput: string;
  level: ProblemLevel;
  bounty: number;
  deadlineDays: number;
  paymentMethod?: string;
  externalLink?: string;
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
    title: draftData.title || '',
    description: draftData.description || '',
    category: draftData.category || '創新創業',
    subcategory: draftData.subcategory || '資訊科技',
    tagsInput: draftData.tagsInput || '',
    level: draftData.level || 'L2',
    bounty: draftData.bounty !== undefined ? draftData.bounty : 500,
    deadlineDays: draftData.deadlineDays || 14,
    paymentMethod: draftData.paymentMethod || '信用卡',
    externalLink: draftData.externalLink || '',
    enablePhasedDelivery: draftData.enablePhasedDelivery || false,
    phase1Points: draftData.phase1Points || 200,
    phase2Points: draftData.phase2Points || 300,
    isPromotedWithMegaphone: draftData.isPromotedWithMegaphone || false,
    updatedAt: now,
    createdAt: existingIndex >= 0 ? all[existingIndex].createdAt : now,
  };

  if (existingIndex >= 0) {
    all[existingIndex] = draft;
  } else {
    all.unshift(draft);
  }

  try {
    localStorage.setItem(STORAGE_QUESTION_DRAFTS_KEY, JSON.stringify(all));
    notifyDraftsUpdated();
  } catch (err) {
    console.error('Failed to save question draft', err);
  }

  return draft;
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
    sourcePainPointId: draftData.sourcePainPointId || '',
    images: draftData.images || [],
    externalLink: draftData.externalLink || '',
    technicalFeasibility: draftData.technicalFeasibility || '',
    marketAnalysis: draftData.marketAnalysis || '',
    businessModelFinancials: draftData.businessModelFinancials || '',
    ambassadorCode: draftData.ambassadorCode || '',
    attachment: draftData.attachment || null,
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
