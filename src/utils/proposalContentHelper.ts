import {
  ProposalContentSection,
  ProposalAttachmentItem,
  StarSeasonProposal,
} from '../types/competition';

/**
 * 預設色彩調色盤（提供給提案詳細內容各段落的文字顏色自訂）
 */
export const PROPOSAL_TEXT_COLOR_PALETTE = [
  { label: '經典炭黑', value: '#1c1917', bgClass: 'bg-stone-900', textClass: 'text-stone-900' },
  { label: '琥珀金星', value: '#b45309', bgClass: 'bg-amber-700', textClass: 'text-amber-700' },
  { label: '翡翠創綠', value: '#047857', bgClass: 'bg-emerald-700', textClass: 'text-emerald-700' },
  { label: '科技湛藍', value: '#1d4ed8', bgClass: 'bg-blue-700', textClass: 'text-blue-700' },
  { label: '頂尖星紫', value: '#7e22ce', bgClass: 'bg-purple-700', textClass: 'text-purple-700' },
  { label: '熱忱烈紅', value: '#be123c', bgClass: 'bg-rose-700', textClass: 'text-rose-700' },
  { label: '深邃石板', value: '#334155', bgClass: 'bg-slate-700', textClass: 'text-slate-700' },
];

/**
 * 預設提案企畫書標準段落模板
 */
export const DEFAULT_PROPOSAL_SECTION_TEMPLATES: ProposalContentSection[] = [
  {
    id: 'sec-1',
    title: '一、核心技術架構與產品創新解方',
    titleSize: 'xl',
    titleBold: true,
    content: '詳細說明核心演算法架構、產品軟硬體整合模組、關鍵技術突破點與創新機制運作流程...',
    textColor: '#1c1917',
    isBold: false,
    images: [],
  },
  {
    id: 'sec-2',
    title: '二、目標客群痛點洞察與獨特價值主張 (UVP)',
    titleSize: 'xl',
    titleBold: true,
    content: '針對目標用戶群（TAM / SAM / SOM）的生活切身困難或產業營運痛點，陳述本解方相比市場現存競品之壓倒性優勢與創新價值...',
    textColor: '#1c1917',
    isBold: false,
    images: [],
  },
  {
    id: 'sec-3',
    title: '三、商業落地規劃、財務預估與實施時程',
    titleSize: 'xl',
    titleBold: true,
    content: '列出營運模式（如 B2B 授權 / B2C 訂閱服務）、三階段里程碑、損益平衡預測以及未來的市場推廣實踐路徑...',
    textColor: '#1c1917',
    isBold: false,
    images: [],
  },
];

/**
 * 從提案中安全解析段落結構（若 proposal.sections 存在則優先使用；否則嘗試由 description JSON 或純文字自動轉換）
 */
export function extractProposalSections(
  proposal: Partial<StarSeasonProposal> | { description?: string; sections?: ProposalContentSection[] } | null | undefined
): ProposalContentSection[] {
  if (!proposal) return [];

  // 1. 若已經有 sections 物件陣列
  if (Array.isArray((proposal as any).sections) && (proposal as any).sections.length > 0) {
    return (proposal as any).sections;
  }

  const rawDesc = proposal.description || '';
  if (!rawDesc.trim()) return [];

  // 2. 檢查是否以 JSON 格式打包
  if (rawDesc.trim().startsWith('{') && rawDesc.includes('"sections"')) {
    try {
      const parsed = JSON.parse(rawDesc);
      if (Array.isArray(parsed.sections) && parsed.sections.length > 0) {
        return parsed.sections;
      }
    } catch {}
  }

  // 3. 舊版純文字提案相容解析：依雙換行或標題分段
  const paragraphs = rawDesc.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  if (paragraphs.length <= 1) {
    return [
      {
        id: 'sec-legacy-1',
        title: '詳細內容或企畫書',
        titleSize: 'xl',
        titleBold: true,
        content: rawDesc,
        textColor: '#1c1917',
        isBold: false,
        images: [],
      },
    ];
  }

  return paragraphs.map((para, index) => {
    const lines = para.split('\n');
    const firstLine = lines[0].trim();
    const isHeadingLike =
      firstLine.startsWith('#') ||
      /^[一二三四五六七八九十0-9]+[、.．]/.test(firstLine) ||
      firstLine.length < 35;

    if (isHeadingLike && lines.length > 1) {
      return {
        id: `sec-auto-${index + 1}`,
        title: firstLine.replace(/^#+\s*/, ''),
        titleSize: 'xl',
        titleBold: true,
        content: lines.slice(1).join('\n').trim(),
        textColor: '#1c1917',
        isBold: false,
        images: [],
      };
    }

    return {
      id: `sec-auto-${index + 1}`,
      title: `段落 ${index + 1}`,
      titleSize: 'lg',
      titleBold: true,
      content: para.trim(),
      textColor: '#1c1917',
      isBold: false,
      images: [],
    };
  });
}

/**
 * 將段落資料序列化為安全且兼顧純文字預覽的字串
 */
export function serializeProposalSections(sections: ProposalContentSection[]): {
  serializedJson: string;
  plainTextSummary: string;
} {
  const plainTextSummary = sections
    .map((s) => `${s.title}\n${s.content}`)
    .join('\n\n')
    .trim();

  const serializedJson = JSON.stringify({
    version: '2.0',
    plainText: plainTextSummary,
    sections,
  });

  return { serializedJson, plainTextSummary };
}

/**
 * 解析提案所有資料附件清單（相容單一 attachmentUrl 與多檔案 attachments 清單）
 */
export function extractProposalAttachments(
  proposal: Partial<StarSeasonProposal> | any
): ProposalAttachmentItem[] {
  if (!proposal) return [];

  const list: ProposalAttachmentItem[] = [];

  // 1. 多附件清單
  if (Array.isArray(proposal.attachments) && proposal.attachments.length > 0) {
    list.push(...proposal.attachments);
  }

  // 2. 單一附件相容
  if (proposal.attachmentUrl && !list.some((a) => a.url === proposal.attachmentUrl)) {
    list.unshift({
      id: 'att-primary',
      name: proposal.attachmentName || '企劃書簡報附件',
      url: proposal.attachmentUrl,
      size: proposal.attachmentSize,
      mime: proposal.attachmentMime,
      uploadedAt: proposal.createdAt,
    });
  }

  return list;
}

/**
 * 格式化檔案大小 (位元組 -> KB / MB)
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '檔案';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
