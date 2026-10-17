import {
  CustomerSupportConversation,
  CustomerSupportMessage,
  CustomerSupportTicket,
  FaqItem,
  User,
  Transaction,
  Question,
  CollectedUserQuestion,
  DraftFaqItem,
} from '../types';
import { INITIAL_FAQS, searchFaqs } from '../data/faqData';
import {
  syncAuditLogsToFirestore,
  syncTicketToFirestore,
  syncCustomerSupportConversationToFirestore,
  getTicketsFromFirestore,
} from './firestoreSync';
import { callDifyClientDirect } from './difyClientService';
import { getAuthHeaders } from './authHeader';

const STORAGE_CONVERSATIONS_KEY = 'ideax_cs_conversations';
const STORAGE_TICKETS_KEY = 'ideax_cs_tickets';
const STORAGE_FAQS_KEY = 'ideax_cs_faqs';
const STORAGE_COLLECTED_QUESTIONS_KEY = 'ideax_collected_cs_questions';
const STORAGE_DRAFT_FAQS_KEY = 'ideax_draft_faqs';

export interface CustomerSupportContext {
  currentUser: User | null;
  userTransactions?: Transaction[];
  userQuestions?: Question[];
  acceptedDealsCount?: number;
  conversationId?: string;
  difyConversationId?: string;
}

export function getStoredConversations(): CustomerSupportConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_CONVERSATIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export function saveConversationToStorage(conv: CustomerSupportConversation) {
  try {
    const list = getStoredConversations();
    const updated = [conv, ...list.filter((c) => c.id !== conv.id)];
    localStorage.setItem(STORAGE_CONVERSATIONS_KEY, JSON.stringify(updated.slice(0, 50)));

    // Push conversation to Firestore
    syncCustomerSupportConversationToFirestore(conv);
    
    // Also push to Firestore audit log for admin review
    syncAuditLogsToFirestore([
      {
        id: `audit-cs-${conv.id}`,
        adminId: 'system-ai-cs',
        action: `AI客服對話審計: ${conv.summary || '用戶諮詢'}`,
        targetUserId: conv.userId,
        details: {
          conversationId: conv.id,
          status: conv.status,
          satisfaction: conv.satisfaction,
          messageCount: conv.messages.length,
          extractedFaq: conv.extractedFaqCandidate,
        },
        createdAt: new Date().toISOString(),
      },
    ]);
  } catch (e) {
    console.warn('Failed to save cs conversation:', e);
  }
}

export function getStoredTickets(): CustomerSupportTicket[] {
  try {
    const raw = localStorage.getItem(STORAGE_TICKETS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export function saveTicketToStorage(ticket: CustomerSupportTicket) {
  try {
    const list = getStoredTickets();
    const updated = [ticket, ...list.filter((t) => t.id !== ticket.id)];
    localStorage.setItem(STORAGE_TICKETS_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('customer_tickets_updated'));
    }

    // Real-time sync to Firestore so all admins receive it across sessions & devices
    syncTicketToFirestore(ticket);

    // Also push to Audit Logs for admin dispute dashboard
    syncAuditLogsToFirestore([
      {
        id: `audit-tk-${ticket.id}`,
        adminId: 'system-ticket',
        action: `用戶提報客服工單: #${ticket.id} (${ticket.title})`,
        targetUserId: ticket.userId,
        details: {
          ticketId: ticket.id,
          userName: ticket.userName,
          userEmail: ticket.userEmail,
          category: ticket.category,
          priority: ticket.priority,
          status: ticket.status,
          description: ticket.description,
        },
        createdAt: new Date().toISOString(),
      },
    ]);
  } catch (e) {
    console.warn('Failed to save ticket:', e);
  }
}

export function getPlatformFaqs(): FaqItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_FAQS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return INITIAL_FAQS;
}

export function savePlatformFaqs(faqs: FaqItem[]) {
  try {
    localStorage.setItem(STORAGE_FAQS_KEY, JSON.stringify(faqs));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('customer_faqs_updated'));
    }
  } catch (e) {}
}

export function deletePlatformFaq(faqId: string): void {
  const list = getPlatformFaqs();
  const updated = list.filter((f) => f.id !== faqId);
  savePlatformFaqs(updated);
}

const INITIAL_COLLECTED_QUESTIONS: CollectedUserQuestion[] = [
  {
    id: 'q-seed-01',
    userId: 'user-02',
    userName: '林彥廷 (創業者)',
    question: '請問我購買的點數發案如果沒有專家被採納，懸賞點數會不會全額退款？',
    category: '金流與點數',
    timestamp: '2026-10-02 14:20',
    aiAnswerSnippet: '發案若招募期滿未採納，託管之點數將全額返還至帳戶餘額，可再次發案或申請退款。',
    status: 'collected',
    resolvedByAi: true,
  },
  {
    id: 'q-seed-02',
    userId: 'user-03',
    userName: '陳美玲 (企業採購)',
    question: 'L0 痛點免費提出與懸賞發案有什麼差別？提問需要事先簽 NDA 保密合約嗎？',
    category: '提問與媒合',
    timestamp: '2026-10-02 16:45',
    aiAnswerSnippet: 'L0 痛點完全免費提出，專家主動報價；若需商業保密可於企業專區簽署雙向 NDA。',
    status: 'collected',
    resolvedByAi: true,
  },
  {
    id: 'q-seed-03',
    userId: 'user-04',
    userName: '張家瑋 (AI 技術顧問)',
    question: '專家接案完成成果交付後，收益什麼時候會撥款到我的銀行帳戶？手續費是多少？',
    category: '金流與點數',
    timestamp: '2026-10-03 09:12',
    aiAnswerSnippet: '委託人確認驗收並經過 7 日猶豫期後，平台於每月 5 號由合作銀行電匯撥付至實名綁定帳戶。',
    status: 'collected',
    resolvedByAi: true,
  },
  {
    id: 'q-seed-04',
    userId: 'user-05',
    userName: '趙偉倫 (獨立開發者)',
    question: 'AI 獵頭智慧找專家是怎麼收費的？如果推薦的名單都不符合需求會扣點數嗎？',
    category: '提問與媒合',
    timestamp: '2026-10-03 11:30',
    aiAnswerSnippet: '首次 30 點、後續每次 40 點，推薦 4 位頂尖人選不重複；若智庫符合條件不足 4 位則完全不扣點。',
    status: 'collected',
    resolvedByAi: true,
  },
  {
    id: 'q-seed-05',
    userId: 'user-06',
    userName: '李欣穎 (品牌總監)',
    question: '如果解答方交付的內容與原本約定嚴重不符，平台有爭議仲裁與退款保障機制嗎？',
    category: '爭議與仲裁',
    timestamp: '2026-10-03 12:05',
    aiAnswerSnippet: '可透過專人工單申請爭議仲裁，款項將立即凍結，由平台法務與仲裁委員調閱紀錄公正裁決。',
    status: 'collected',
    resolvedByAi: true,
  },
];

export function getCollectedQuestions(): CollectedUserQuestion[] {
  try {
    const raw = localStorage.getItem(STORAGE_COLLECTED_QUESTIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return INITIAL_COLLECTED_QUESTIONS;
}

export function saveCollectedQuestions(questions: CollectedUserQuestion[]): void {
  try {
    localStorage.setItem(STORAGE_COLLECTED_QUESTIONS_KEY, JSON.stringify(questions.slice(0, 150)));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('collected_questions_updated'));
    }
  } catch (e) {}
}

export function recordCollectedQuestion(
  item: Omit<CollectedUserQuestion, 'id' | 'timestamp' | 'status'>
): CollectedUserQuestion {
  const questions = getCollectedQuestions();
  const newQuestion: CollectedUserQuestion = {
    ...item,
    id: `cq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toLocaleString([], {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    status: 'collected',
  };
  saveCollectedQuestions([newQuestion, ...questions]);
  return newQuestion;
}

export function getDraftFaqs(): DraftFaqItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_DRAFT_FAQS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

export function saveDraftFaqs(drafts: DraftFaqItem[]): void {
  try {
    localStorage.setItem(STORAGE_DRAFT_FAQS_KEY, JSON.stringify(drafts));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('draft_faqs_updated'));
    }
  } catch (e) {}
}

export async function aggregateQuestionsWithAi(
  questions: CollectedUserQuestion[]
): Promise<DraftFaqItem[]> {
  const payloadQuestions = (questions.length > 0 ? questions : getCollectedQuestions()).map((q) => ({
    id: q.id,
    question: q.question,
    category: q.category,
    userName: q.userName,
    aiAnswerSnippet: q.aiAnswerSnippet,
  }));

  try {
    const res = await fetch('/api/admin/aggregate-faqs', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ questions: payloadQuestions }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.faqs) && data.faqs.length > 0) {
        const currentDrafts = getDraftFaqs();
        const newDrafts: DraftFaqItem[] = data.faqs.map((f: any, idx: number) => ({
          id: `draft-faq-${Date.now()}-${idx}`,
          category: f.category || '一般諮詢',
          question: f.question,
          answer: f.answer,
          tags: Array.isArray(f.tags) ? f.tags : ['AI彙整', '常見問題'],
          status: 'pending_review' as const,
          createdAt: new Date().toISOString(),
          sourceQuestions: Array.isArray(f.sourceQuestions) ? f.sourceQuestions : [],
          isAiGenerated: true,
        }));

        const merged = [...newDrafts, ...currentDrafts];
        saveDraftFaqs(merged);

        // Mark questions as aggregated
        const currentQuestions = getCollectedQuestions();
        const updatedQuestions = currentQuestions.map((cq) => ({
          ...cq,
          status: 'aggregated' as const,
        }));
        saveCollectedQuestions(updatedQuestions);

        return newDrafts;
      }
    }
  } catch (err) {
    console.warn('aggregateQuestionsWithAi API failed, creating fallback draft FAQs:', err);
  }

  // Fallback generation if backend API is offline
  const fallbackDrafts: DraftFaqItem[] = [
    {
      id: `draft-faq-${Date.now()}-1`,
      category: '金流與點數',
      question: '平台發案若無滿意解答或未採納，託管之懸賞點數會如何退還？',
      answer: 'IdeaX 採全額託管防護機制。提問者發案後款項安全託管；招募期滿若未採納合意方案，點數將 100% 全額返還至帳戶餘額，可再次發案或申請退款。',
      tags: ['點數退款', '未成案保障', '金流託管'],
      status: 'pending_review',
      createdAt: new Date().toISOString(),
      sourceQuestions: questions.slice(0, 2).map((q) => q.question),
      isAiGenerated: true,
    },
    {
      id: `draft-faq-${Date.now()}-2`,
      category: '提問與媒合',
      question: '「L0 痛點 0 元提出」如何運作？專家如何提供客製報價？',
      answer: '「L0 痛點提出」完全免費（0 點），提問者可無負擔拋出真實問題，由感興趣的專家自行評估並提供客製報價與解法；雙方確認後再委託成案。',
      tags: ['L0免費', '痛點提出', '客製報價'],
      status: 'pending_review',
      createdAt: new Date().toISOString(),
      sourceQuestions: questions.slice(2, 4).map((q) => q.question),
      isAiGenerated: true,
    },
  ];

  const currentDrafts = getDraftFaqs();
  saveDraftFaqs([...fallbackDrafts, ...currentDrafts]);
  return fallbackDrafts;
}

export function approveDraftFaq(draftId: string): FaqItem | null {
  const drafts = getDraftFaqs();
  const target = drafts.find((d) => d.id === draftId);
  if (!target) return null;

  // 1. Mark draft as approved
  const updatedDrafts = drafts.map((d) =>
    d.id === draftId ? { ...d, status: 'approved' as const, updatedAt: new Date().toISOString() } : d
  );
  saveDraftFaqs(updatedDrafts);

  // 2. Publish directly into platform FAQs
  const currentFaqs = getPlatformFaqs();
  const newFaq: FaqItem = {
    id: `faq-appr-${Date.now()}`,
    category: target.category || '一般諮詢',
    question: target.question,
    answer: target.answer,
    tags: target.tags || ['審核發布'],
    helpfulCount: 1,
    source: 'auto_mined',
    recommendedByAdmin: true,
  };

  const updatedFaqs = [newFaq, ...currentFaqs];
  savePlatformFaqs(updatedFaqs);
  return newFaq;
}

export function rejectDraftFaq(draftId: string): void {
  const drafts = getDraftFaqs();
  const updatedDrafts = drafts.filter((d) => d.id !== draftId);
  saveDraftFaqs(updatedDrafts);
}

export function updateDraftFaq(updated: DraftFaqItem): void {
  const drafts = getDraftFaqs();
  const next = drafts.map((d) => (d.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : d));
  saveDraftFaqs(next);
}

export interface FaqAgentConsultResult {
  success: boolean;
  source: string;
  agentName: string;
  explanation: string;
  conversationId?: string;
  messageId?: string;
  latencyMs?: number;
  quickOptions?: string[];
}

export async function consultFaqWithAiAgent(params: {
  faqId?: string;
  question: string;
  category?: string;
  answer?: string;
  userQuery?: string;
  userContext?: any;
}): Promise<FaqAgentConsultResult> {
  try {
    const res = await fetch('/api/ai/faq-agent-consult', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    console.warn('consultFaqWithAiAgent error:', e);
  }

  return {
    success: true,
    source: 'inhouse_agent',
    agentName: 'IdeaX 官方客服 Agent',
    explanation:
      params.answer ||
      '已為您調閱智庫相關條款，若需了解細節可隨時點選下方按鈕轉入 AI 對話。',
    quickOptions: ['轉入 24hr AI 智能客服深度對話', '開立專屬客服工單'],
  };
}

export function addManualDraftFaq(item: {
  category: string;
  question: string;
  answer: string;
  tags?: string[];
}): DraftFaqItem {
  const currentDrafts = getDraftFaqs();
  const newDraft: DraftFaqItem = {
    id: `draft-manual-${Date.now()}`,
    category: item.category || '一般諮詢',
    question: item.question.trim(),
    answer: item.answer.trim(),
    tags: item.tags || ['管理員自訂'],
    status: 'pending_review',
    createdAt: new Date().toISOString(),
    isAiGenerated: false,
  };
  saveDraftFaqs([newDraft, ...currentDrafts]);
  return newDraft;
}

export function approveFaqCandidate(candidate: { question: string; answer: string; category: string }): FaqItem {
  const currentFaqs = getPlatformFaqs();
  const newFaq: FaqItem = {
    id: `faq-mined-${Date.now()}`,
    category: candidate.category || '一般諮詢',
    question: candidate.question,
    answer: candidate.answer,
    helpfulCount: 1,
    source: 'auto_mined',
    recommendedByAdmin: true,
  };
  const updated = [newFaq, ...currentFaqs];
  savePlatformFaqs(updated);
  return newFaq;
}

/**
 * Sends a message to the AI Customer Service with native internal intelligence & context.
 */
export async function sendCustomerSupportMessage(
  inputText: string,
  history: CustomerSupportMessage[],
  ctx: CustomerSupportContext
): Promise<{
  replyText: string;
  dataCard?: CustomerSupportMessage['dataCard'];
  quickOptions?: string[];
  toolUsed?: string;
  isEscalated?: boolean;
  ticket?: CustomerSupportTicket;
  extractedFaqCandidate?: CustomerSupportConversation['extractedFaqCandidate'];
  difyConversationId?: string;
}> {
  const query = inputText.trim();
  const lower = query.toLowerCase();
  const user = ctx.currentUser;

  // 1. Prioritize Dify AI Customer Support Agent via Backend
  try {
    const res = await fetch('/api/ai/customer-support-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: query,
        conversationId: ctx.difyConversationId || undefined,
        history: history.slice(-6).map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          text: m.text,
        })),
        userContext: user
          ? {
              userId: user.id,
              userName: user.name,
              userEmail: user.email,
              userRole: user.role,
              balance: user.balance || 0,
              withheldPoints: user.withheldPoints || 0,
              dealsCount: ctx.acceptedDealsCount || 0,
            }
          : null,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.reply) {
        return {
          replyText: data.reply,
          difyConversationId: data.difyConversationId || ctx.difyConversationId,
          quickOptions: data.quickOptions || ['查詢點數餘額', '提問分級說明', 'AI 獵頭找專家', '常見問題 FAQ'],
          extractedFaqCandidate: data.extractedFaqCandidate,
        };
      }
    }
  } catch (err) {
    console.warn('Backend AI Support API unreachable, attempting browser direct Dify connection:', err);
  }

  // 1.1 瀏覽器 CORS 直連 Dify CS Agent（解決靜態部屬環境如 www.ideax.tw 無後端時的客服通訊）
  try {
    const directResult = await callDifyClientDirect({
      agentType: 'cs_agent',
      query,
      conversationId: ctx.difyConversationId || undefined,
      user: user?.id ? `usr_${String(user.id).replace(/[^a-zA-Z0-9_-]/g, '_')}` : 'guest_visitor',
      timeoutMs: 25000,
    });
    if (directResult && directResult.rawOutput) {
      return {
        replyText: directResult.rawOutput,
        difyConversationId: directResult.conversationId || ctx.difyConversationId,
        quickOptions: ['查詢點數餘額', '提問分級說明', 'AI 獵頭找專家', '常見問題 FAQ'],
      };
    }
  } catch (directErr) {
    console.warn('Browser direct Dify call failed, falling back to local intent parser:', directErr);
  }

  // 2. Fallback: Direct Intent for Balance / Points Query (Offline / Failover only)
  if (lower.includes('餘額') || lower.includes('點數') || lower.includes('查點數') || lower.includes('我的錢') || lower.includes('點數餘額')) {
    if (!user || user.id === 'user-guest') {
      return {
        replyText: '您好！查詢個人點數餘額需先登入您的 IdeaX 帳號。請先點擊右上角登入後再進行查詢。',
        quickOptions: ['前往登入帳號', '常見問題 FAQ', '平台收費標準'],
      };
    }
    const balance = user.balance || 0;
    const withheld = user.withheldPoints || 0;
    return {
      replyText: `已為您查詢到最新帳號數據！\n\n• **可用點數餘額**：**${balance.toLocaleString()} 點**\n• **託管中待結算**：**NT$ ${withheld.toLocaleString()}**\n\n點數可用於問題懸賞、AI 獵頭專家延攬或客製化委託。若需補足點數，可隨時點擊會員中心進行儲值！`,
      toolUsed: 'getUserProfile(balance)',
      dataCard: {
        type: 'balance',
        title: '帳戶點數即時明細',
        details: [
          { label: '會員名稱', value: user.name },
          { label: '專屬 UID', value: `#${user.id}` },
          { label: '可用餘額', value: `${balance.toLocaleString()} 點` },
          { label: '託管中款項', value: `NT$ ${withheld.toLocaleString()}` },
        ],
      },
      quickOptions: ['如何申請提領？', '查詢最近交易紀錄', '查詢成案紀錄', '開立客服工單'],
    };
  }

  // 2. Direct Intent: Orders / Transactions
  if (lower.includes('訂單') || lower.includes('交易') || lower.includes('扣款') || lower.includes('發票') || lower.includes('明細')) {
    if (!user || user.id === 'user-guest') {
      return {
        replyText: '您好！查詢交易與訂單紀錄需先登入您的帳號以保護隱私。請先登入後由我為您查詢。',
        quickOptions: ['前往登入帳號', '金流交易規則', '發票開立說明'],
      };
    }
    const txs = ctx.userTransactions || [];
    const count = txs.length;
    const recent = txs.slice(0, 3);
    const details = recent.map((t, idx) => ({
      label: `紀錄 #${idx + 1}`,
      value: `${t.relatedQuestionTitle || t.note || t.type} · NT$ ${(t.amount || 0).toLocaleString()} (${t.type || '扣款'})`,
    }));

    return {
      replyText: `已為您檢索帳戶近期的交易紀錄！\n\n您的帳號累計共有 **${count}** 筆交易明細。平台所有委託款項均享有第三方金流代管保障，保障雙方交付與驗收安全。`,
      toolUsed: 'getUserOrders',
      dataCard: {
        type: 'orders',
        title: `最近交易紀錄 (${count} 筆)`,
        details: details.length > 0 ? details : [{ label: '最新狀態', value: '近期尚無交易明細' }],
      },
      quickOptions: ['查詢點數餘額', '申請爭議退款', '聯絡人工客服'],
    };
  }

  // 3. Direct Intent: Question Levels & Pricing (L0 ~ L4)
  if (lower.includes('分級') || lower.includes('提問收費') || lower.includes('多少點') || lower.includes('l0') || lower.includes('l1') || lower.includes('l2') || lower.includes('l3') || lower.includes('l4') || lower.includes('扣點規則')) {
    const userBalance = user?.balance || 0;
    return {
      replyText: `【IdeaX 平台懸賞提問分級與點數折抵標準】：\n\n• **L0 免費交流（0 點）**：完全免費，開放社群公開交流與初步探討。\n• **L1 基礎懸賞（100 ~ 300 點）**：實務建議、痛點排查與基礎診斷。\n• **L2 進階懸賞（301 ~ 899 點）**：商業架構、產品驗證與增長模型。\n• **L3 高階挑戰（900 ~ 2,499 點）**：深度顧問報告、破局方案與專家會談。\n• **L4 企業級顧問（2,500 點以上）**：產業級關鍵技術與重磅專案交付。\n\n您目前帳戶餘額為 **${userBalance.toLocaleString()} 點**，可直接發布相應等級之問題或直接委託專家！`,
      quickOptions: ['查詢點數餘額', '如何儲值點數', 'AI 獵頭找專家規則', '開立客服工單'],
    };
  }

  // 4. Direct Intent: AI Headhunter Rules
  if (lower.includes('獵頭') || lower.includes('找專家') || lower.includes('深度媒合')) {
    return {
      replyText: `【AI 獵頭智慧找專家機制說明】：\n\n• **計費標準**：首次搜尋特惠 **30 點**，第二回起每次 **40 點**。\n• **推薦不重複**：每次搜尋自動排除已推薦人選，確保推薦 4 位全新頂尖專家。\n• **未滿 4 位不扣點**：若智庫中符合條件之專家不足 4 位，本次搜尋**完全免費（不扣點）**。\n• **安心防護**：若餘額不足將嚴格阻斷執行，並可直接點擊「［先去儲值］」前往儲值。`,
      quickOptions: ['前往認證專家智庫', '查詢點數餘額', '如何成為認證專家'],
    };
  }

  // 5. Direct Intent: Dispute & Human Support Escalation
  if (lower.includes('退款') || lower.includes('申訴') || lower.includes('工單') || lower.includes('真人') || lower.includes('人工') || lower.includes('被騙') || lower.includes('糾紛') || lower.includes('詐騙') || lower.includes('bug') || lower.includes('客服')) {
    const ticketId = `TK-${Date.now().toString(36).toUpperCase()}`;
    const newTicket: CustomerSupportTicket = {
      id: ticketId,
      userId: user?.id || 'guest',
      userName: user?.name || '訪客用戶',
      userEmail: user?.email || '無提供信箱',
      title: query.slice(0, 30),
      category: lower.includes('退款') ? 'payment' : lower.includes('糾紛') ? 'delivery_dispute' : 'bug',
      description: `【用戶對話自動升級】\n發問內容：${query}\n用戶UID：${user?.id || '未登入'}\n對話紀錄輪數：${history.length + 1}`,
      priority: lower.includes('詐騙') || lower.includes('被騙') || lower.includes('大量扣款') ? 'urgent' : 'normal',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    saveTicketToStorage(newTicket);

    return {
      replyText: `理解您遇到的狀況！為確保您的權益不受影響，我已自動為您開立專屬**官方客服調查工單 #${ticketId}**。\n\nIdeaX 審查專員將在 1 個工作天內依據您的對話脈絡調閱合約與金流記錄進行排查。款項爭議期間平台將啟動防護凍結，請您放心！`,
      toolUsed: 'createSupportTicket',
      isEscalated: true,
      ticket: newTicket,
      dataCard: {
        type: 'ticket',
        title: `已開立工單 #${ticketId}`,
        details: [
          { label: '工單編號', value: ticketId },
          { label: '問題類別', value: newTicket.category === 'payment' ? '金流與退款爭議' : '專案履約申訴' },
          { label: '處理進度', value: '待專員排查審核中' },
          { label: '預計回覆', value: '1 個工作天內' },
        ],
      },
      quickOptions: ['查看常見問題 FAQ', '查詢我的帳戶餘額', '結束對話'],
    };
  }

  // 6. Call Backend Native Gemini AI Support Agent for Natural Language understanding
  try {
    const res = await fetch('/api/ai/customer-support-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: query,
        conversationId: ctx.difyConversationId || undefined,
        history: history.slice(-6).map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          text: m.text,
        })),
        userContext: user
          ? {
              userId: user.id,
              userName: user.name,
              userEmail: user.email,
              userRole: user.role,
              balance: user.balance || 0,
              withheldPoints: user.withheldPoints || 0,
              dealsCount: ctx.acceptedDealsCount || 0,
            }
          : null,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.reply) {
        return {
          replyText: data.reply,
          quickOptions: data.quickOptions || ['查詢點數餘額', '提問分級說明', 'AI 獵頭找專家', '常見問題 FAQ'],
          extractedFaqCandidate: data.extractedFaqCandidate,
        };
      }
    }
  } catch (err) {
    console.warn('Native Gemini CS chat error, falling back to local matcher:', err);
  }

  // 7. Local Intelligent Matcher (FAQ Search Fallback)
  const matchedFaqs = searchFaqs(query);
  if (matchedFaqs.length > 0) {
    const topFaq = matchedFaqs[0];
    return {
      replyText: `關於「${topFaq.question}」：\n\n${topFaq.answer}\n\n若此解答尚未完全解決您的疑惑，您也可以點擊下方快速查詢個人帳務或建立專人工單！`,
      quickOptions: ['這解答很有幫助 👍', '查詢我的帳戶資料', '申請專人排查工單'],
      dataCard: {
        type: 'faq',
        title: `相關知識庫：${topFaq.category}`,
        details: [
          { label: '標準問題', value: topFaq.question },
          { label: '所屬分類', value: topFaq.category },
        ],
      },
    };
  }

  // 8. Conversational Fallback
  if (lower.includes('愛') || lower.includes('喜歡') || lower.includes('你好') || lower.includes('哈囉') || lower.includes('hi') || lower.includes('hello')) {
    return {
      replyText: `謝謝您的溫暖心意！🥰\n\n我是 IdeaX 平台 AI 客服特助，隨時都在這裡為您服務。無論您是想發案找專家、解答疑難雜症、或是查詢帳戶點數與金流，我都能竭誠為您解答！\n\n請問今天有什麼我可以協助您的嗎？`,
      quickOptions: ['查詢我的點數餘額', '如何發布問題懸賞', 'AI 獵頭找專家', '常見問題 FAQ'],
    };
  }

  // General helpful internal AI assistant response
  return {
    replyText: `您好！我是 IdeaX 平台原生 AI 智能客服特助。\n\n我能直接為您服務：\n1. 💰 **帳戶點數與餘額即時查詢**\n2. 📦 **訂單明細與金流紀錄**\n3. 🎯 **提問分級（L0~L4）與 AI 獵頭找專家規則**\n4. 🛡️ **專家認證資格與會員分潤**\n5. ⚖️ **開立爭議仲裁與專人工單**\n\n請問有什麼我可以為您解答的？`,
    quickOptions: ['查詢我的點數餘額', '提問分級與點數標準', 'AI 獵頭找專家規則', '常見問題 FAQ', '開立專人工單'],
  };
}
