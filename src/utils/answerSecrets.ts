import type { Answer, SolutionAttachment, SolutionMeetingDetails } from '../types';

/**
 * 付費解答內容的拆分：
 * - 公開欄位（answers 集合）：預覽、價格、附件名稱與大小、會談時長與形式
 * - 私密欄位（answer_secrets 集合）：完整內容、附件連結/檔案、會談時段與大綱
 * 私密內容只有回答者、管理員，以及已付款／已解鎖的會員能透過伺服器取得。
 */
export interface AnswerSecret {
  fullContent?: string;
  attachments?: SolutionAttachment[];
  meetingDetails?: SolutionMeetingDetails;
}

/** 這則解答是否有需要保護的內容（討論留言、免費內容不需要） */
export function isProtectedAnswer(a: Partial<Answer>): boolean {
  if (!a) return false;
  if (a.type === 'discussion') return false;
  return a.isPaid !== false && Number(a.price || 0) > 0;
}

function sanitizeAttachment(att: SolutionAttachment): SolutionAttachment {
  const { url, dataUrl, ...meta } = att || ({} as SolutionAttachment);
  return meta as SolutionAttachment;
}

function sanitizeMeeting(m: SolutionMeetingDetails): Partial<SolutionMeetingDetails> {
  return { durationMinutes: m?.durationMinutes, platform: m?.platform };
}

/** 拆成「公開版解答」與「私密內容」；不需保護的解答原樣回傳、secret 為 null */
export function splitAnswerForStorage<T extends Partial<Answer>>(a: T): { publicAnswer: T; secret: AnswerSecret | null } {
  const { isUnlockedByCurrentUser, ...rest } = a as any;
  if (!isProtectedAnswer(a)) return { publicAnswer: rest as T, secret: null };
  const secret: AnswerSecret = {};
  const pub: any = { ...rest };
  if (typeof a.fullContent === 'string' && a.fullContent) secret.fullContent = a.fullContent;
  delete pub.fullContent;
  if (Array.isArray(a.attachments) && a.attachments.length > 0) {
    secret.attachments = a.attachments;
    pub.attachments = a.attachments.map(sanitizeAttachment);
  }
  if (a.meetingDetails) {
    secret.meetingDetails = a.meetingDetails;
    pub.meetingDetails = sanitizeMeeting(a.meetingDetails);
  }
  pub.hasProtectedContent = Boolean(secret.fullContent || secret.attachments || secret.meetingDetails);
  return { publicAnswer: pub as T, secret: pub.hasProtectedContent ? secret : null };
}
