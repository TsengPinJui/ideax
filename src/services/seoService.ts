import { Question, Answer, PostType } from '../types';
import { StarSeasonProposal, STAR_SEASON_TRACKS } from '../types/competition';

const DEFAULT_TITLE = 'IdeaX 創點子 — 讓想法發光 • IDEAS CONNECT POSSIBILITIES';
const DEFAULT_DESC =
  'IdeaX 創點子 — 讓想法發光！高價值問題與解決方案交易市場，提供懸賞、深度解鎖、AI 智能媒合與專家變現，Ideas Connect Possibilities。';
const DEFAULT_IMAGE = '/圓角正向黃底燈泡.png';

/**
 * 取得當前網域 Base URL
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return 'https://www.ideax.tw';
}

/**
 * 取得問題、痛點或討論之公開且搜尋引擎友善的分享網址
 * 支援三種形式：
 * 1. 簡潔語意路由：/question/:id, /pain-point/:id, /discussion/:id
 * 2. 泛用查詢路由：/?q=:id (保證 SPA 任何環境 100% 直連)
 */
export function getQuestionShareUrl(questionOrId: Question | string, postType?: PostType): string {
  const base = getBaseUrl();
  const id = typeof questionOrId === 'string' ? questionOrId : questionOrId.id;
  const type = typeof questionOrId === 'object' ? questionOrId.postType : postType;

  if (type === 'pain_point') {
    return `${base}/pain-point/${id}`;
  }
  if ((type as string) === 'discussion' || type === 'chat_discussion') {
    return `${base}/discussion/${id}`;
  }
  return `${base}/question/${id}`;
}

/**
 * 取得相容性最高、搜尋引擎易抓取的正規查詢網址
 */
export function getQuestionQueryUrl(questionId: string): string {
  const base = getBaseUrl();
  return `${base}/?q=${questionId}`;
}

/**
 * 取得創星季挑戰賽提案之公開獨立專屬網址
 */
export function getProposalShareUrl(proposalOrId: StarSeasonProposal | string): string {
  const base = getBaseUrl();
  const id = typeof proposalOrId === 'string' ? proposalOrId : proposalOrId.id;
  return `${base}/challenge/proposal?proposalId=${id}`;
}

/**
 * 取得提案路徑路由網址
 */
export function getProposalPathUrl(proposalId: string): string {
  const base = getBaseUrl();
  return `${base}/proposal/${proposalId}`;
}

/**
 * 更新文件 Meta 標籤、標題、OpenGraph、Twitter 卡片與 Schema.org 結構化資料
 * 讓舊站每個問題、痛點、討論均具備獨立且可在 Google / Bing 索引的公開頁面
 */
export function updateSEOForQuestion(question: Question | null, answers: Answer[] = []) {
  if (typeof document === 'undefined') return;

  if (!question) {
    resetSEOToDefault();
    return;
  }

  const titleTag = document.querySelector('title');
  const metaDesc = document.querySelector('meta[name="description"]');
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDesc = document.querySelector('meta[property="og:description"]');
  const ogUrl = document.querySelector('meta[property="og:url"]');
  const ogType = document.querySelector('meta[property="og:type"]');
  const ogImage = document.querySelector('meta[property="og:image"]');
  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  const twitterDesc = document.querySelector('meta[name="twitter:description"]');
  const twitterImage = document.querySelector('meta[name="twitter:image"]');
  let canonicalLink = document.querySelector('link[rel="canonical"]');

  // 1. 根據 postType 產出最適 SEO 標題與語意說明
  const isPainPoint = question.postType === 'pain_point' || question.tags?.includes('痛點');
  const isDiscussion = (question.postType as string) === 'discussion' || question.postType === 'chat_discussion';

  let typePrefix = '';
  if (isPainPoint) {
    typePrefix = '【痛點探索】';
  } else if (isDiscussion) {
    typePrefix = '【深度探討】';
  } else {
    typePrefix = (question.bounty || 0) > 0 ? `【懸賞 NT$ ${(question.bounty || 0).toLocaleString()}】` : '【知識探討】';
  }

  const pageTitle = `${typePrefix} ${question.title} - IdeaX 創點子知識問答市場`;
  const cleanDesc = (question.description || '')
    .replace(/\n+/g, ' ')
    .replace(/[#*`]/g, '')
    .trim();
  const metaDescription = cleanDesc.length > 0 ? cleanDesc.slice(0, 155) : DEFAULT_DESC;

  const canonicalUrl = getQuestionShareUrl(question);
  const qImages = (question as any).images || (question as any).imageUrls || [];
  const imageUrl = qImages && qImages.length > 0 ? qImages[0] : (question.authorAvatar || DEFAULT_IMAGE);

  // 2. 更新 DOM 標籤
  if (titleTag) titleTag.innerText = pageTitle;
  if (metaDesc) metaDesc.setAttribute('content', metaDescription);
  if (ogTitle) ogTitle.setAttribute('content', pageTitle);
  if (ogDesc) ogDesc.setAttribute('content', metaDescription);
  if (ogUrl) ogUrl.setAttribute('content', canonicalUrl);
  if (ogType) ogType.setAttribute('content', 'article');
  if (ogImage) ogImage.setAttribute('content', imageUrl);
  if (twitterTitle) twitterTitle.setAttribute('content', pageTitle);
  if (twitterDesc) twitterDesc.setAttribute('content', metaDescription);
  if (twitterImage) twitterImage.setAttribute('content', imageUrl);

  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', canonicalUrl);

  // 3. Schema.org 結構化資料：依類別自動配置 QAPage 或 DiscussionForumPosting
  const questionAnswers = answers.filter((a) => a.questionId === question.id);
  const acceptedAnswer = questionAnswers.find((a) => a.isAccepted);

  let schemaData: any;

  if (isDiscussion || isPainPoint) {
    schemaData = {
      '@context': 'https://schema.org',
      '@type': 'DiscussionForumPosting',
      '@id': canonicalUrl,
      headline: question.title,
      articleBody: question.description || question.title,
      url: canonicalUrl,
      dateCreated: question.createdAt,
      datePublished: question.createdAt,
      dateModified: (question as any).updatedAt || question.createdAt,
      interactionStatistic: [
        {
          '@type': 'InteractionCounter',
          interactionType: 'https://schema.org/ViewAction',
          userInteractionCount: question.views || 0,
        },
        {
          '@type': 'InteractionCounter',
          interactionType: 'https://schema.org/CommentAction',
          userInteractionCount: questionAnswers.length,
        },
      ],
      author: {
        '@type': 'Person',
        name: question.authorName || 'IdeaX 用戶',
      },
      publisher: {
        '@type': 'Organization',
        name: 'IdeaX 創點子',
        url: getBaseUrl(),
        logo: {
          '@type': 'ImageObject',
          url: `${getBaseUrl()}/圓角正向黃底燈泡.png`,
        },
      },
    };
  } else {
    // 預設為 Google Search 認可之 QAPage 結構化問答
    schemaData = {
      '@context': 'https://schema.org',
      '@type': 'QAPage',
      '@id': canonicalUrl,
      mainEntity: {
        '@type': 'Question',
        name: question.title,
        text: question.description || question.title,
        answerCount: questionAnswers.length,
        upvoteCount: question.views || 0,
        dateCreated: question.createdAt,
        author: {
          '@type': 'Person',
          name: question.authorName || 'IdeaX 用戶',
        },
        acceptedAnswer: acceptedAnswer
          ? {
              '@type': 'Answer',
              text: acceptedAnswer.freePreview || acceptedAnswer.fullContent || '已採納解決方案',
              dateCreated: acceptedAnswer.createdAt,
              upvoteCount: acceptedAnswer.likes || 0,
              url: `${canonicalUrl}#answer-${acceptedAnswer.id}`,
              author: {
                '@type': 'Person',
                name: acceptedAnswer.solverName,
              },
            }
          : undefined,
        suggestedAnswer: questionAnswers
          .filter((a) => !a.isAccepted)
          .slice(0, 5)
          .map((ans) => ({
            '@type': 'Answer',
            text: ans.freePreview || '提供專業解方',
            dateCreated: ans.createdAt,
            upvoteCount: ans.likes || 0,
            url: `${canonicalUrl}#answer-${ans.id}`,
            author: {
              '@type': 'Person',
              name: ans.solverName,
            },
          })),
      },
    };
  }

  // 移除既有標籤並寫入最新 JSON-LD
  removeElementById('ideax-schema-qapage');
  removeElementById('ideax-schema-proposal');

  const jsonLdScript = document.createElement('script');
  jsonLdScript.id = 'ideax-schema-qapage';
  jsonLdScript.type = 'application/ld+json';
  jsonLdScript.text = JSON.stringify(schemaData, null, 2);
  document.head.appendChild(jsonLdScript);
}

/**
 * 更新新站「創星季繁星挑戰賽」提案專屬之 Meta 標籤與結構化資料
 * 讓每個提案具備獨立、可被 Google / 社群預覽爬取的公開網址
 */
export function updateSEOForProposal(proposal: StarSeasonProposal | null) {
  if (typeof document === 'undefined') return;

  if (!proposal) {
    resetSEOToDefault();
    return;
  }

  const titleTag = document.querySelector('title');
  const metaDesc = document.querySelector('meta[name="description"]');
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDesc = document.querySelector('meta[property="og:description"]');
  const ogUrl = document.querySelector('meta[property="og:url"]');
  const ogType = document.querySelector('meta[property="og:type"]');
  const ogImage = document.querySelector('meta[property="og:image"]');
  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  const twitterDesc = document.querySelector('meta[name="twitter:description"]');
  const twitterImage = document.querySelector('meta[name="twitter:image"]');
  let canonicalLink = document.querySelector('link[rel="canonical"]');

  const trackMeta = STAR_SEASON_TRACKS[proposal.track] || STAR_SEASON_TRACKS.ai_applications;
  const isPainPoint = proposal.stage === 'pain_point';

  const stagePrefix = isPainPoint ? '【創星痛點徵件】' : '【創星創新提案】';
  const pageTitle = `${stagePrefix} ${proposal.title} · ${trackMeta?.name || '跨領域'} - IdeaX 繁星季挑戰賽`;

  const cleanDesc = (proposal.summary || proposal.description || '')
    .replace(/\n+/g, ' ')
    .replace(/[#*`]/g, '')
    .trim();
  const metaDescription = cleanDesc.length > 0 ? cleanDesc.slice(0, 155) : 'IdeaX 創星季競賽提案，讓校園與青年創新想法獲得真實市場驗證！';

  const canonicalUrl = getProposalShareUrl(proposal);
  const imageUrl = proposal.images && proposal.images.length > 0 ? proposal.images[0] : `${getBaseUrl()}/去背創星季.png`;

  // 更新 DOM
  if (titleTag) titleTag.innerText = pageTitle;
  if (metaDesc) metaDesc.setAttribute('content', metaDescription);
  if (ogTitle) ogTitle.setAttribute('content', pageTitle);
  if (ogDesc) ogDesc.setAttribute('content', metaDescription);
  if (ogUrl) ogUrl.setAttribute('content', canonicalUrl);
  if (ogType) ogType.setAttribute('content', 'article');
  if (ogImage) ogImage.setAttribute('content', imageUrl);
  if (twitterTitle) twitterTitle.setAttribute('content', pageTitle);
  if (twitterDesc) twitterDesc.setAttribute('content', metaDescription);
  if (twitterImage) twitterImage.setAttribute('content', imageUrl);

  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', canonicalUrl);

  // Schema.org 結構化資料：CreativeWork / InnovationProject
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': canonicalUrl,
    name: proposal.title,
    headline: proposal.title,
    description: proposal.summary,
    url: canonicalUrl,
    image: imageUrl,
    dateCreated: proposal.createdAt,
    datePublished: proposal.createdAt,
    dateModified: proposal.updatedAt || proposal.createdAt,
    author: {
      '@type': 'Person',
      name: proposal.authorName || '創星季參賽者',
    },
    genre: trackMeta?.name || '科技創新',
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: proposal.likeCount || 0,
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/CommentAction',
        userInteractionCount: proposal.commentsCount || 0,
      },
    ],
    publisher: {
      '@type': 'Organization',
      name: 'IdeaX 創星季',
      url: `${getBaseUrl()}/challenge`,
      logo: {
        '@type': 'ImageObject',
        url: `${getBaseUrl()}/去背創星季.png`,
      },
    },
  };

  removeElementById('ideax-schema-qapage');
  removeElementById('ideax-schema-proposal');

  const jsonLdScript = document.createElement('script');
  jsonLdScript.id = 'ideax-schema-proposal';
  jsonLdScript.type = 'application/ld+json';
  jsonLdScript.text = JSON.stringify(schemaData, null, 2);
  document.head.appendChild(jsonLdScript);
}

/**
 * Google 搜尋引擎多個分頁捷徑 (Sitelinks) 定義與獨立子網址配置
 * 對應使用者指定：
 * 1. IdeaX 創點子：探索問題、發布懸賞、創點子/痛點集、找專家
 * 2. 創星季：我要參賽、專家申請、提案總覽、活動辦法
 */
export interface GoogleSitelinkItem {
  id: string;
  name: string;
  category: 'ideax' | 'star_season';
  categoryLabel: string;
  path: string;
  queryParam: string;
  title: string;
  description: string;
  keywords: string[];
  icon: string;
}

export const GOOGLE_SITELINKS: GoogleSitelinkItem[] = [
  // --- IdeaX 創點子 ---
  {
    id: 'explore',
    name: '探索問題',
    category: 'ideax',
    categoryLabel: 'IdeaX 創點子',
    path: '/explore',
    queryParam: '?tab=explore',
    title: '探索問題 — IdeaX 創點子 高價值問題懸賞與創新解題市場',
    description: '瀏覽各領域高額懸賞問題、市場落地提案與最新發案討論，串聯專家智庫提供專業解方。',
    keywords: ['探索問題', '懸賞問題', '發案市場', '問題解答', '創新創業', 'IdeaX'],
    icon: 'Compass',
  },
  {
    id: 'create',
    name: '發布懸賞',
    category: 'ideax',
    categoryLabel: 'IdeaX 創點子',
    path: '/create',
    queryParam: '?action=create',
    title: '發布懸賞 — IdeaX 創點子 刊登商業/技術難題，尋求頂尖專家提案',
    description: '一鍵刊登高價值難題懸賞，自訂報酬與三階段驗收機制，吸引全台認證專家顧問提交落地方案。',
    keywords: ['發布懸賞', '刊登問題', '企業發案', '三階段驗收', '懸賞獎金', '難題懸賞'],
    icon: 'PlusCircle',
  },
  {
    id: 'painpoints',
    name: '痛點許願池',
    category: 'ideax',
    categoryLabel: 'IdeaX 創點子',
    path: '/painpoints',
    queryParam: '?zone=pain_points',
    title: '痛點許願池 — IdeaX 創點子 挖掘真實大眾與企業痛點，孵化商業點子',
    description: '大眾生活日常與企業營運真實痛點募集平台，從真實痛點發掘未被滿足的高潛力創新需求與商業藍海。',
    keywords: ['痛點許願池', '痛點集', '痛點專區', '市場痛點', '真實需求', '商業點子', '痛點許願', '新創題目'],
    icon: 'AlertCircle',
  },
  {
    id: 'solvers',
    name: '找專家',
    category: 'ideax',
    categoryLabel: 'IdeaX 創點子',
    path: '/solvers',
    queryParam: '?tab=solvers',
    title: '找專家 — IdeaX 創點子 認證專家智庫顧問名冊與解答者排行榜',
    description: '匯聚創新創業、技術研發、品牌策略、AI 應用等跨領域官方認證專家與專業解題顧問。',
    keywords: ['找專家', '認證專家', '顧問諮詢', '解題高手', '專家智庫', '接案專家'],
    icon: 'GraduationCap',
  },
  {
    id: 'membership',
    name: '會員方案',
    category: 'ideax',
    categoryLabel: 'IdeaX 創點子',
    path: '/membership',
    queryParam: '?tab=membership',
    title: '會員方案 — IdeaX 創點子 訂閱尊榮專家與團隊特權方案，享有最高免服務費優惠',
    description: '查看 IdeaX 全站會員方案：一般會員、達人方案、權威方案與大師方案，享有各級服務費大幅減免、AI CRM 智能工具與專屬標籤特權。',
    keywords: ['會員方案', '訂閱方案', '服務費減免', '達人方案', '權威方案', '大師方案', 'IdeaX 會員'],
    icon: 'Crown',
  },
  {
    id: 'topup',
    name: '點數儲值',
    category: 'ideax',
    categoryLabel: 'IdeaX 創點子',
    path: '/topup',
    queryParam: '?tab=topup',
    title: '點數儲值 — IdeaX 創點子 安全第三方代管金流與點數儲值中心',
    description: 'IdeaX 點數儲值與錢包中心：支援線上刷卡、LINE Pay、ATM 虛擬帳號與超商條碼，自動帶入用戶身份與合規發票開立。',
    keywords: ['點數儲值', '儲值中心', '錢包儲值', '儲值優惠', '第三方支付', 'IdeaX 點數'],
    icon: 'CreditCard',
  },
  // --- 創星季 ---
  {
    id: 'challenge',
    name: '創星季',
    category: 'star_season',
    categoryLabel: '創星季',
    path: '/challenge',
    queryParam: '?tab=challenge',
    title: '創星季 — 全國創新提案挑戰賽 讓校園與青年創新想法獲得真實市場驗證 | IdeaX 創點子',
    description: '創星季全國創新提案挑戰賽官方專區：豐厚競賽大獎、真實痛點徵件、跨領域創新提案與校園青年商業落地競賽。',
    keywords: ['創星季', '創新提案挑戰賽', '商業競賽', '校園競賽', '青年創業', '創星幣', 'IdeaX'],
    icon: 'Trophy',
  },
  {
    id: 'challenge_join',
    name: '我要參賽',
    category: 'star_season',
    categoryLabel: '創星季',
    path: '/challenge/join',
    queryParam: '?tab=challenge&view=submit',
    title: '我要參賽 — 創星季 全國創新提案挑戰賽 線上報名與作品投件',
    description: '創星季全國創新提案挑戰賽報名入口：線上提交商業提案與專案作品，角逐競賽大獎與落地資源。',
    keywords: ['我要參賽', '創星季', '提案競賽', '商業競賽', '線上投件', '參賽報名'],
    icon: 'Flame',
  },
  {
    id: 'challenge_expert',
    name: '專家申請',
    category: 'star_season',
    categoryLabel: '創星季',
    path: '/challenge/expert',
    queryParam: '?tab=challenge&view=judge',
    title: '專家申請 — 創星季 評審委員與導師智庫認證入駐申請',
    description: '創星季官方專家顧問與評審委員認證通道，審核專業資歷並賦予專家徽章與專案審查權益。',
    keywords: ['專家申請', '評審申請', '創星季導師', '專家認證', '顧問入駐'],
    icon: 'ShieldCheck',
  },
  {
    id: 'challenge_proposals',
    name: '提案總覽',
    category: 'star_season',
    categoryLabel: '創星季',
    path: '/challenge/proposals',
    queryParam: '?tab=challenge&view=proposal',
    title: '提案總覽 — 創星季 精選參賽創新提案、案例落地成果與評選動態',
    description: '查閱創星季所有精選參賽提案與商業案例，探索涵蓋 AI 應用、永續轉型與青年創新的落地成果。',
    keywords: ['提案總覽', '精選提案', '參賽案例', '商業計劃書', '創星成果', '評選榜單'],
    icon: 'Layers',
  },
  {
    id: 'challenge_rules',
    name: '活動辦法',
    category: 'star_season',
    categoryLabel: '創星季',
    path: '/challenge/rules',
    queryParam: '?tab=challenge&view=rules',
    title: '活動辦法 — 創星季 挑戰賽賽程時程、評審規約、獎項與參賽須知',
    description: '創星季競賽完整規章：競賽日程、賽制階段、評分佔比、智慧財產權授權規約與獎項獎勵說明。',
    keywords: ['活動辦法', '賽事規程', '競賽時程', '評審規約', '參賽須知', '獎金規則'],
    icon: 'FileText',
  },
];

/**
 * 取得指定捷徑之完整公開 URL
 */
export function getSitelinkFullUrl(item: GoogleSitelinkItem): string {
  const base = getBaseUrl();
  return `${base}${item.path}`;
}

/**
 * 更新指定分頁捷徑之 Meta / OpenGraph / Twitter 與 BreadcrumbList
 */
export function updateSEOForSubpage(subpageId: string) {
  if (typeof document === 'undefined') return;

  const sitelink = GOOGLE_SITELINKS.find((s) => s.id === subpageId || s.path === subpageId);
  if (!sitelink) {
    resetSEOToDefault();
    return;
  }

  const titleTag = document.querySelector('title');
  const metaDesc = document.querySelector('meta[name="description"]');
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDesc = document.querySelector('meta[property="og:description"]');
  const ogUrl = document.querySelector('meta[property="og:url"]');
  const ogType = document.querySelector('meta[property="og:type"]');
  const ogImage = document.querySelector('meta[property="og:image"]');
  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  const twitterDesc = document.querySelector('meta[name="twitter:description"]');
  const twitterImage = document.querySelector('meta[name="twitter:image"]');
  let canonicalLink = document.querySelector('link[rel="canonical"]');

  const fullUrl = getSitelinkFullUrl(sitelink);
  const imageUrl = sitelink.category === 'star_season' ? `${getBaseUrl()}/去背創星季.png` : `${getBaseUrl()}/圓角正向黃底燈泡.png`;

  if (titleTag) titleTag.innerText = sitelink.title;
  if (metaDesc) metaDesc.setAttribute('content', sitelink.description);
  if (ogTitle) ogTitle.setAttribute('content', sitelink.title);
  if (ogDesc) ogDesc.setAttribute('content', sitelink.description);
  if (ogUrl) ogUrl.setAttribute('content', fullUrl);
  if (ogType) ogType.setAttribute('content', 'website');
  if (ogImage) ogImage.setAttribute('content', imageUrl);
  if (twitterTitle) twitterTitle.setAttribute('content', sitelink.title);
  if (twitterDesc) twitterDesc.setAttribute('content', sitelink.description);
  if (twitterImage) twitterImage.setAttribute('content', imageUrl);

  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', fullUrl);

  // 注入 BreadcrumbList 麵包屑結構化資料，提升 Google 搜尋結果路徑層級解析
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${fullUrl}#breadcrumb`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: sitelink.categoryLabel,
        item: sitelink.category === 'star_season' ? `${getBaseUrl()}/challenge` : `${getBaseUrl()}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: sitelink.name,
        item: fullUrl,
      },
    ],
  };

  removeElementById('ideax-schema-qapage');
  removeElementById('ideax-schema-proposal');
  removeElementById('ideax-schema-breadcrumb');

  const jsonLdScript = document.createElement('script');
  jsonLdScript.id = 'ideax-schema-breadcrumb';
  jsonLdScript.type = 'application/ld+json';
  jsonLdScript.text = JSON.stringify(breadcrumbSchema, null, 2);
  document.head.appendChild(jsonLdScript);
}

/**
 * 重設 SEO 資訊為平台全域預設值
 */
export function resetSEOToDefault() {
  if (typeof document === 'undefined') return;

  // 若當前在創星季專區，重設時應指向創星季 SEO，避免覆蓋標準網址 (Canonical)
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname.toLowerCase();
    if (currentPath === '/challenge' || currentPath === '/challenge/') {
      updateSEOForSubpage('challenge');
      return;
    }
  }

  const titleTag = document.querySelector('title');
  const metaDesc = document.querySelector('meta[name="description"]');
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDesc = document.querySelector('meta[property="og:description"]');
  const ogUrl = document.querySelector('meta[property="og:url"]');
  const ogType = document.querySelector('meta[property="og:type"]');
  const ogImage = document.querySelector('meta[property="og:image"]');
  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  const twitterDesc = document.querySelector('meta[name="twitter:description"]');
  const twitterImage = document.querySelector('meta[name="twitter:image"]');
  const canonicalLink = document.querySelector('link[rel="canonical"]');

  if (titleTag) titleTag.innerText = DEFAULT_TITLE;
  if (metaDesc) metaDesc.setAttribute('content', DEFAULT_DESC);
  if (ogTitle) ogTitle.setAttribute('content', DEFAULT_TITLE);
  if (ogDesc) ogDesc.setAttribute('content', DEFAULT_DESC);
  if (ogUrl) ogUrl.setAttribute('content', `${getBaseUrl()}/`);
  if (ogType) ogType.setAttribute('content', 'website');
  if (ogImage) ogImage.setAttribute('content', `${getBaseUrl()}${DEFAULT_IMAGE}`);
  if (twitterTitle) twitterTitle.setAttribute('content', DEFAULT_TITLE);
  if (twitterDesc) twitterDesc.setAttribute('content', DEFAULT_DESC);
  if (twitterImage) twitterImage.setAttribute('content', `${getBaseUrl()}${DEFAULT_IMAGE}`);
  if (canonicalLink) canonicalLink.setAttribute('href', `${getBaseUrl()}/`);

  removeElementById('ideax-schema-qapage');
  removeElementById('ideax-schema-proposal');
  removeElementById('ideax-schema-breadcrumb');
}

function removeElementById(id: string) {
  const el = document.getElementById(id);
  if (el) el.remove();
}


