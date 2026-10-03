import { CustomerSupportConversation, CustomerSupportMessage, CustomerSupportTicket, FaqItem, User, Transaction, Question } from '../types';
import { INITIAL_FAQS, searchFaqs } from '../data/faqData';
import {
  syncAuditLogsToFirestore,
  syncTicketToFirestore,
  syncCustomerSupportConversationToFirestore,
  getTicketsFromFirestore,
} from './firestoreSync';

const STORAGE_CONVERSATIONS_KEY = 'ideax_cs_conversations';
const STORAGE_TICKETS_KEY = 'ideax_cs_tickets';
const STORAGE_FAQS_KEY = 'ideax_cs_faqs';

export interface CustomerSupportContext {
  currentUser: User | null;
  userTransactions?: Transaction[];
  userQuestions?: Question[];
  acceptedDealsCount?: number;
  openTickets?: CustomerSupportTicket[];
  difyConversationId?: string;
}

// Read/Write Local Storage helpers
export function getStoredConversations(): CustomerSupportConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_CONVERSATIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse stored cs conversations:', err);
  }
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
  } catch (e) {}
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
 * Sends a message to the AI Customer Service Agent with contextual database querying.
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

  // 1. Check for Direct Tool Calls based on user intent (Personal queries)
  // Tool A: Check Balance / Points
  if (lower.includes('餘額') || lower.includes('點數') || lower.includes('查點數') || lower.includes('我的錢')) {
    if (!user) {
      return {
        replyText: '您好！查詢個人點數餘額需先登入您的 IdeaX 帳號。請先點擊右上角登入後再進行查詢。',
        quickOptions: ['點擊登入帳號', '常見問題 FAQ', '平台收費標準'],
      };
    }
    const balance = user.balance || 0;
    const withheld = user.withheldPoints || 0;
    return {
      replyText: `已為您查詢到專屬帳號資料！\n\n您目前的可用點數餘額為 **NT$ ${balance.toLocaleString()} 點**。\n託管中待結算金額為 **NT$ ${withheld.toLocaleString()} 點**。點數可直接用於問題懸賞發案或聊天室專家客製化委託。`,
      toolUsed: 'getUserProfile(balance)',
      dataCard: {
        type: 'balance',
        title: '帳戶點數即時明細',
        details: [
          { label: '會員名稱', value: user.name },
          { label: '專屬 UID', value: `#${user.id}` },
          { label: '可用餘額', value: `NT$ ${balance.toLocaleString()} 點` },
          { label: '託管中收益', value: `NT$ ${withheld.toLocaleString()} 點` },
        ],
      },
      quickOptions: ['如何申請提領？', '查詢最近交易紀錄', '查詢成案紀錄', '開立客服工單'],
    };
  }

  // Tool B: Check Orders / Transactions
  if (lower.includes('訂單') || lower.includes('交易') || lower.includes('扣款') || lower.includes('發票') || lower.includes('明細')) {
    if (!user) {
      return {
        replyText: '您好！查詢交易與訂單紀錄需先登入您的帳號以保護隱私。請先登入後由我為您查詢。',
        quickOptions: ['點擊登入帳號', '金流交易規則', '發票開立說明'],
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
      replyText: `已為您檢索帳戶近期的交易紀錄！\n\n您的帳號累計共有 **${count}** 筆交易紀錄。平台所有交易皆由託管金流保護，若有扣款異常或發票疑問，可隨時點擊下方開立排查工單。`,
      toolUsed: 'getUserOrders',
      dataCard: {
        type: 'orders',
        title: `最近交易紀錄 (${count} 筆)`,
        details: details.length > 0 ? details : [{ label: '最新狀態', value: '近期尚無交易明細' }],
      },
      quickOptions: ['查詢點數餘額', '申請爭議退款', '聯絡人工客服'],
    };
  }

  // Tool C: Check Proposals & Answers
  if (lower.includes('提案') || lower.includes('成案') || lower.includes('接案') || lower.includes('問題進度')) {
    if (!user) {
      return {
        replyText: '您好！查詢提案與問題成案進度請先登入帳號。',
        quickOptions: ['登入帳號', '提案流程介紹'],
      };
    }
    const deals = ctx.acceptedDealsCount || 0;
    const questions = ctx.userQuestions?.length || 0;
    return {
      replyText: `已為您查詢到專屬專案履約數據：\n\n您目前累計發布/參與的問題共 **${questions}** 則，已驗收成案之方案共 **${deals}** 筆。\n所有成案項目皆享有平台合約與驗收保證！`,
      toolUsed: 'getUserProposals',
      dataCard: {
        type: 'proposals',
        title: '專案與成案進度總覽',
        details: [
          { label: '會員名稱', value: user.name },
          { label: '身分角色', value: user.role === 'solver' ? '解答者' : user.role === 'admin' ? '管理員' : '提問者' },
          { label: '發布問題數', value: `${questions} 則` },
          { label: '已驗收成交數', value: `${deals} 筆` },
        ],
      },
      quickOptions: ['如何確認驗收？', '申請爭議仲裁', '查詢點數餘額'],
    };
  }

  // Tool D: Escalate to Support Ticket
  if (lower.includes('退款') || lower.includes('申訴') || lower.includes('工單') || lower.includes('真人') || lower.includes('人工') || lower.includes('被騙') || lower.includes('糾紛') || lower.includes('詐騙') || lower.includes('bug')) {
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

  // 2. Try Calling Backend Dify / Gemini API
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
          difyConversationId: data.conversationId,
          quickOptions: data.quickOptions || ['查詢點數餘額', '查詢交易紀錄', '常見問題 FAQ', '轉交專人工單'],
          extractedFaqCandidate: data.extractedFaqCandidate,
        };
      }
    }
  } catch (err) {
    // Fall back to local intelligent matcher
  }

  // 3. Local Intelligent Matcher (FAQ Search & Fallback)
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

  // General helpful fallback response
  return {
    replyText: `您好！我是 IdeaX 平台官方 AI 客服助理。\n\n我能直接為您查詢：\n1. 💰 **帳戶點數與餘額**\n2. 📦 **訂單扣款與交易紀錄**\n3. 🤝 **提案驗收成案進度**\n4. ⚖️ **開立爭議仲裁與專人工單**\n\n請問有什麼具體問題我可以協助您？您也可以點選下方快捷按鈕快速查詢。`,
    quickOptions: ['查詢我的點數餘額', '查詢我的訂單紀錄', '平台收費與金流規則', '常見問題 FAQ', '轉交人工工單'],
  };
}
