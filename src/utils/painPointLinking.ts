import { Question } from '../types';
import { DEFAULT_DEMO_PROPOSALS } from '../data/competitionProposals';
import { DEFAULT_VIBECODING_APPS } from '../data/vibeCodingData';

/**
 * 從引用文字中萃取痛點 ID（例如 "[q-vp-pain-01] 獨立餐飲..." -> "q-vp-pain-01"）
 */
export function extractPainPointId(referencedStr?: string): string | null {
  if (!referencedStr) return null;
  const trimmed = referencedStr.trim();
  // 匹配 [q-xxx] 或 q-xxx 格式
  const bracketMatch = trimmed.match(/\[([a-zA-Z0-9_\-]+)\]/);
  if (bracketMatch && bracketMatch[1]) {
    return bracketMatch[1];
  }
  const directIdMatch = trimmed.match(/^(q-[a-zA-Z0-9_\-]+)$/);
  if (directIdMatch && directIdMatch[1]) {
    return directIdMatch[1];
  }
  return null;
}

/**
 * 依據提案之 referencedPainPoint 或 sourcePainPointTitle 欄位，在全站問題清單中找出對應之痛點物件
 */
export function findReferencedPainPoint(
  proposal: Partial<Question> & { sourcePainPointTitle?: string; sourcePainPointProposalId?: string },
  allQuestions: Question[]
): Question | undefined {
  if (!proposal || !Array.isArray(allQuestions)) {
    return undefined;
  }

  const rawRef = proposal.referencedPainPoint || proposal.sourcePainPointTitle || proposal.sourcePainPointProposalId || '';
  const refStr = rawRef.trim();
  if (!refStr) return undefined;

  // 1. 優先從文字中提取標準 ID (如 [q-vp-pain-01] 或 q-xxx)
  const extractedId = extractPainPointId(refStr);
  if (extractedId) {
    const matchedById = allQuestions.find(
      (q) => q.id === extractedId && (q.postType === 'pain_point' || q.id.includes('pain'))
    );
    if (matchedById) return matchedById;
    // 若該 ID 存在於任何非下架問題
    const fallbackById = allQuestions.find((q) => q.id === extractedId && q.status !== 'delisted');
    if (fallbackById) return fallbackById;
  }

  // 2. 比對 ID 字串直接包含
  const matchedByContainsId = allQuestions.find((q) => {
    if (q.status === 'delisted') return false;
    if (q.postType === 'pain_point' || q.id.includes('pain')) {
      return refStr.includes(q.id);
    }
    return false;
  });
  if (matchedByContainsId) return matchedByContainsId;

  // 3. 比對標題完全一致或相互包含
  const cleanRef = refStr.replace(/^\[[^\]]+\]\s*/, '').trim().toLowerCase();
  if (!cleanRef) return undefined;

  const matchedByTitle = allQuestions.find((q) => {
    if (q.status === 'delisted') return false;
    if (q.id === proposal.id) return false;
    const isPain = q.postType === 'pain_point' || q.id.includes('pain');
    if (!isPain) return false;

    const qTitle = (q.title || '').trim().toLowerCase();
    if (!qTitle) return false;

    return (
      qTitle === cleanRef ||
      cleanRef.includes(qTitle) ||
      (qTitle.length > 8 && cleanRef.length > 8 && (qTitle.includes(cleanRef) || cleanRef.includes(qTitle)))
    );
  });

  return matchedByTitle;
}

/**
 * 找出所有引用此痛點之提案（包含創新提案 innovation_proposal、創星季提案與 VibeCoding 軟體提案 vibecoding_app 等）
 */
export function findProposalsReferencingPainPoint(
  painPoint: Question,
  allQuestions: Question[]
): Question[] {
  if (!painPoint || !Array.isArray(allQuestions)) return [];

  const painId = painPoint.id;
  const painTitle = (painPoint.title || '').trim();

  // 將 DEFAULT_DEMO_PROPOSALS 轉換為相容 Question 結構一併納入關聯檢索
  const demoAsQuestions: Question[] = DEFAULT_DEMO_PROPOSALS.filter((dp) => dp.stage !== 'pain_point').map((dp) => ({
    id: dp.id,
    title: dp.title,
    description: dp.description || dp.summary,
    category: '創新創業',
    subcategory: '新創孵化',
    tags: dp.tags || ['創星季', '創新提案'],
    level: 'L0',
    bounty: 0,
    status: 'open',
    authorId: dp.authorId,
    authorName: dp.authorName,
    authorAvatar: dp.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    authorTitle: dp.teamName || dp.organizationName,
    createdAt: dp.createdAt,
    deadline: '2026-12-31',
    views: dp.viewsCount || 320,
    likes: dp.likeCount || 35,
    answersCount: dp.commentsCount || 5,
    postType: 'innovation_proposal',
    specialZone: 'create_ideas',
    referencedPainPoint: dp.referencedPainPoint || dp.sourcePainPointTitle,
    coverImage: dp.images && dp.images.length > 0 ? dp.images[0] : undefined,
    supportPoints: dp.supportPoints ? Math.round(dp.supportPoints / 100) : 500,
    supporterCount: dp.supporterCount || 30,
  }));

  const combinedPool = [...allQuestions, ...DEFAULT_VIBECODING_APPS, ...demoAsQuestions];

  const results = combinedPool.filter((q) => {
    if (!q || q.id === painId || q.status === 'delisted') return false;
    const rawRef = q.referencedPainPoint || (q as any).sourcePainPointTitle || '';
    if (!rawRef) return false;

    // 必須為提案類型或作品展示
    const isProposalType =
      q.postType === 'innovation_proposal' ||
      q.postType === 'vibecoding_app' ||
      q.postType === 'seek_solution' ||
      q.specialZone === 'vibecoding' ||
      q.specialZone === 'create_ideas' ||
      q.category === '網站程式';

    if (!isProposalType) return false;

    const refStr = rawRef.trim();

    // 1. 包含痛點 ID (如 [q-vp-pain-01] 或 q-vp-pain-01)
    if (refStr.includes(painId)) return true;

    const extractedId = extractPainPointId(refStr);
    if (extractedId && extractedId === painId) return true;

    // 2. 標題相符
    if (painTitle && painTitle.length >= 6) {
      const cleanRef = refStr.replace(/^\[[^\]]+\]\s*/, '').trim();
      if (cleanRef === painTitle) return true;
      if (cleanRef.includes(painTitle) || painTitle.includes(cleanRef)) return true;
    }

    return false;
  });

  // 去除重複 ID，並優先排列創新提案與軟體提案
  const seenIds = new Set<string>();
  return results.filter((item) => {
    if (seenIds.has(item.id)) return false;
    seenIds.add(item.id);
    return true;
  });
}

/**
 * 取得全站所有有效痛點列表（用於發布表單時快速選取引用）
 */
export function getAllPainPoints(allQuestions: Question[]): Question[] {
  if (!Array.isArray(allQuestions)) return [];
  return allQuestions
    .filter((q) => q.postType === 'pain_point' && q.status !== 'delisted')
    .sort((a, b) => {
      const scoreA = (a.secondedCount || 0) + (a.likes || 0);
      const scoreB = (b.secondedCount || 0) + (b.likes || 0);
      return scoreB - scoreA;
    });
}

