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
    console.warn('AI Support Agent call failed, falling back to local handlers:', err);
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
