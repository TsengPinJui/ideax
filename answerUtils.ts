import { Answer } from '../types';

export interface AnswerSpecification {
  items: Array<{ label: string; iconType: 'text' | 'file' | 'link' | 'meeting' }>;
  itemStrings: string[];
  deliveryMethod: string;
  isPhased: boolean;
  phasesCount: number;
  summaryText: string;
}

/**
 * 依提案所含內容萃取方案規格與交付方式：
 * - 內容類型與數量（例如：1 個文字建議、5 個檔案、1 個外部連結、1 場線上會談）
 * - 交付方式（一次交付 或 分 X 個階段交付）
 * 不再使用抽象的「多維度整合方案」等標籤。
 */
export function getAnswerSpecifications(ans: Answer): AnswerSpecification {
  const items: Array<{ label: string; iconType: 'text' | 'file' | 'link' | 'meeting' }> = [];

  // 1. 文字建議
  const hasText =
    Boolean(ans.fullContent && ans.fullContent.trim()) ||
    ans.deliveryFormat === 'text' ||
    ans.deliveryFormats?.includes('text') ||
    (!ans.attachments?.length && !ans.meetingDetails);
  if (hasText) {
    items.push({ label: '1 個文字建議', iconType: 'text' });
  }

  // 2. 檔案 vs 外部連結
  const attachments = ans.attachments || [];
  const fileAttachments = attachments.filter(
    (a) => a.type !== 'external_link' && !a.name.includes('連結') && !a.size.includes('連結')
  );
  const linkAttachments = attachments.filter(
    (a) => a.type === 'external_link' || a.name.includes('連結') || a.size.includes('連結')
  );

  let extraLinksCount = 0;
  if (linkAttachments.length === 0 && ans.fullContent) {
    if (
      ans.fullContent.includes('【外部雲端交付共享連結') ||
      ans.fullContent.includes('Google Drive / Dropbox / Figma')
    ) {
      extraLinksCount += 1;
    }
    if (ans.fullContent.includes('【其他連結】')) {
      extraLinksCount += 1;
    }
  }

  if (fileAttachments.length > 0) {
    items.push({ label: `${fileAttachments.length} 個檔案`, iconType: 'file' });
  } else if (ans.deliveryFormat === 'file' || ans.deliveryFormats?.includes('file')) {
    items.push({ label: '1 個檔案', iconType: 'file' });
  }

  const totalLinksCount = linkAttachments.length + extraLinksCount;
  if (totalLinksCount > 0) {
    items.push({ label: `${totalLinksCount} 個外部連結`, iconType: 'link' });
  }

  // 3. 線上會談
  if (
    ans.meetingDetails ||
    ans.deliveryFormat === 'meeting' ||
    ans.deliveryFormats?.includes('meeting')
  ) {
    const mins = ans.meetingDetails?.durationMinutes || 30;
    items.push({ label: `1 場線上會談 (${mins} 分鐘)`, iconType: 'meeting' });
  }

  if (items.length === 0) {
    items.push({ label: '1 個文字建議', iconType: 'text' });
  }

  const isPhased = Boolean(ans.isPhasedDelivery && ans.phases && ans.phases.length > 0);
  const phasesCount = isPhased ? ans.phases!.length : 0;
  const deliveryMethod = isPhased ? `分 ${phasesCount} 個階段交付` : '一次交付';
  const itemStrings = items.map((i) => i.label);

  return {
    items,
    itemStrings,
    deliveryMethod,
    isPhased,
    phasesCount,
    summaryText: `包含：${itemStrings.join('、')} · ${deliveryMethod}`,
  };
}
