import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Headphones,
  X,
  Mail,
  Clock,
  Shield,
  Send,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Bot,
  HelpCircle,
  FileText,
  Search,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Coins,
  Briefcase,
  Layers,
  RefreshCw,
} from 'lucide-react';
import {
  CustomerSupportMessage,
  CustomerSupportConversation,
  CustomerSupportTicket,
  FaqItem,
} from '../types';
import {
  sendCustomerSupportMessage,
  saveConversationToStorage,
  getPlatformFaqs,
  savePlatformFaqs,
  saveTicketToStorage,
  recordCollectedQuestion,
  consultFaqWithAiAgent,
  FaqAgentConsultResult,
} from '../services/customerSupportService';
import { searchFaqs } from '../data/faqData';
import { CopyableUserId } from './CopyableUserId';
import { duohuiHoot, duohuiSpeak } from './agents/agentVoices';

/** 官方客服 Agent「多慧」的各種表情與姿勢 */
const DUOHUI = {
  happy: '/agents/duohui/happy.webp',
  focus: '/agents/duohui/focus.webp',
  answer: '/agents/duohui/answer.webp',
  guide: '/agents/duohui/guide.webp',
  support: '/agents/duohui/support.webp',
  warm: '/agents/duohui/warm.webp',
};

type ServiceCategory =
  | 'delivery_dispute'
  | 'payment'
  | 'payout'
  | 'account'
  | 'feature'
  | 'bug'
  | 'suggestion'
  | 'other';

export const CustomerServiceModal: React.FC = () => {
  const {
    isCustomerServiceOpen,
    customerServiceContext,
    closeCustomerService,
    currentUser,
    transactions,
    questions,
    answers,
    mascotConfig,
  } = useApp();
  const soundOn = mascotConfig?.soundEnabled !== false;

  const [activeTab, setActiveTab] = useState<'ai_agent' | 'faq' | 'ticket'>('ai_agent');

  // AI Agent Chat State
  const [messages, setMessages] = useState<CustomerSupportMessage[]>([]);
  // 多慧回答使用者的問題（操作引導）才出聲；開場打招呼不出聲
  const spokenIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role === 'user' || spokenIds.current.has(last.id)) return;
    spokenIds.current.add(last.id);
    if (last.id.startsWith('msg-welcome') || messages.length < 2) return;
    if (soundOn) duohuiSpeak(last.text);
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps
  const [inputMessage, setInputMessage] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>('');
  const [difyConversationId, setDifyConversationId] = useState<string | undefined>(undefined);
  const [satisfaction, setSatisfaction] = useState<'positive' | 'negative' | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // FAQ State
  const [faqList, setFaqList] = useState<FaqItem[]>([]);
  const [faqSearch, setFaqSearch] = useState('');
  const [selectedFaqCategory, setSelectedFaqCategory] = useState<string>('all');
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  // FAQ AI Agent Deep Consult State (實體 Agent 接入)
  const [consultingFaqId, setConsultingFaqId] = useState<string | null>(null);
  const [faqConsultResults, setFaqConsultResults] = useState<Record<string, FaqAgentConsultResult>>({});
  const [faqCustomQuery, setFaqCustomQuery] = useState('');
  const [isConsultingCustom, setIsConsultingCustom] = useState(false);
  const [customConsultResult, setCustomConsultResult] = useState<FaqAgentConsultResult | null>(null);

  // Ticket Form State
  const [ticketCategory, setTicketCategory] = useState<ServiceCategory>('delivery_dispute');
  const [ticketName, setTicketName] = useState('');
  const [ticketEmail, setTicketEmail] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState<CustomerSupportTicket | null>(null);

  // Initialize or reset session
  useEffect(() => {
    const handleFaqsUpdated = () => {
      setFaqList(getPlatformFaqs());
    };
    window.addEventListener('customer_faqs_updated', handleFaqsUpdated);
    return () => window.removeEventListener('customer_faqs_updated', handleFaqsUpdated);
  }, []);

  useEffect(() => {
    if (isCustomerServiceOpen) {
      setSubmittedTicket(null);
      setSatisfaction(null);
      setDifyConversationId(undefined);
      setFaqList(getPlatformFaqs());
      setTicketName(currentUser?.name || '');
      setTicketEmail(currentUser?.email || '');

      const newConvId = `conv-${Date.now().toString(36)}`;
      setConversationId(newConvId);

      // If invoked with a specific context/subject
      const initialSubject = customerServiceContext?.subject || customerServiceContext?.message;
      const initialMessages: CustomerSupportMessage[] = [
        {
          id: `msg-welcome-${Date.now()}`,
          role: 'assistant',
          text: currentUser && currentUser.id !== 'user-guest'
            ? `嗨，${currentUser.name}！我是多慧，IdeaX 的官方客服（25hr 超時工作中…）🦉\n\n平台操作、點數託管、驗收撥款、爭議退款都可以問我；也可以點下方按鈕，我帶你去查點數、訂單與成案進度！`
            : `嗨！我是多慧，IdeaX 的官方客服 🦉\n平台怎麼用、收費方案、發案規則，都可以問我喔！`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          quickOptions: [
            '查詢我的點數餘額',
            '查詢我的交易紀錄',
            '查詢我的成案進度',
            '申請爭議仲裁工單',
          ],
        },
      ];

      if (initialSubject) {
        initialMessages.push({
          id: `msg-context-${Date.now()}`,
          role: 'user',
          text: `我需要協助：${initialSubject}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }

      setMessages(initialMessages);
    }
  }, [isCustomerServiceOpen, customerServiceContext, currentUser]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiLoading]);

  if (!isCustomerServiceOpen) return null;

  // Compute accepted deals for this user
  const userDealsCount =
    (questions || []).filter((q) => q.authorId === currentUser?.id && q.status === 'solved').length +
    (answers || []).filter((a) => a.solverId === currentUser?.id && a.isAccepted).length;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isAiLoading) return;

    setInputMessage('');
    const userMsg: CustomerSupportMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setIsAiLoading(true);

    try {
      const response = await sendCustomerSupportMessage(text, nextMessages, {
        currentUser,
        userTransactions: transactions?.filter(
          (t) => t.fromUserId === currentUser?.id || t.toUserId === currentUser?.id
        ),
        userQuestions: questions?.filter((q) => q.authorId === currentUser?.id),
        acceptedDealsCount: userDealsCount,
        difyConversationId,
      });

      if (response.difyConversationId) {
        setDifyConversationId(response.difyConversationId);
      }

      const assistantMsg: CustomerSupportMessage = {
        id: `msg-ai-${Date.now()}`,
        role: 'assistant',
        text: response.replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolUsed: response.toolUsed,
        dataCard: response.dataCard,
        quickOptions: response.quickOptions,
        isEscalated: response.isEscalated,
        ticketId: response.ticket?.id,
      };

      const finalMessages = [...nextMessages, assistantMsg];
      setMessages(finalMessages);

      // Save conversation for Admin Review
      const convRecord: CustomerSupportConversation = {
        id: conversationId,
        userId: currentUser?.id || 'guest',
        userName: currentUser?.name || '訪客用戶',
        userAvatar: currentUser?.avatar,
        userRole: currentUser?.role || 'visitor',
        startedAt: new Date().toISOString(),
        summary: text.slice(0, 40),
        category: response.isEscalated ? 'dispute' : text.includes('點數') ? 'billing' : 'general',
        messages: finalMessages,
        status: response.isEscalated ? 'escalated' : 'resolved',
        satisfaction: satisfaction || undefined,
        ticketId: response.ticket?.id,
        extractedFaqCandidate: response.extractedFaqCandidate || undefined,
      };
      saveConversationToStorage(convRecord);

      // Record collected user question for Admin AI FAQ Mining
      recordCollectedQuestion({
        conversationId,
        userId: currentUser?.id || 'guest',
        userName: currentUser?.name || '訪客用戶',
        userAvatar: currentUser?.avatar,
        question: text.trim(),
        category:
          text.includes('點數') || text.includes('款') || text.includes('費')
            ? '金流與點數'
            : text.includes('提問') || text.includes('懸賞') || text.includes('痛點')
            ? '提問與媒合'
            : text.includes('爭議') || text.includes('退款') || text.includes('申訴')
            ? '爭議與仲裁'
            : text.includes('身分') || text.includes('UID') || text.includes('專家')
            ? '身分與認證'
            : '平台操作',
        aiAnswerSnippet: response.replyText ? response.replyText.slice(0, 100) : undefined,
        resolvedByAi: !response.isEscalated,
      });
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          role: 'assistant',
          text: '抱歉，連線至 AI 助理時發生暫時性延遲。您可以切換至「常見問題 FAQ」自主查詢，或直接「開立客服工單」由專員處理！',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          quickOptions: ['常見問題 FAQ', '開立專人工單'],
        },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleFeedback = (isPositive: boolean) => {
    const val = isPositive ? 'positive' : 'negative';
    setSatisfaction(val);

    const convRecord: CustomerSupportConversation = {
      id: conversationId,
      userId: currentUser?.id || 'guest',
      userName: currentUser?.name || '訪客用戶',
      userAvatar: currentUser?.avatar,
      userRole: currentUser?.role || 'visitor',
      startedAt: new Date().toISOString(),
      summary: messages[1]?.text?.slice(0, 40) || '用戶客服諮詢',
      category: 'general',
      messages,
      status: 'resolved',
      satisfaction: val,
    };
    saveConversationToStorage(convRecord);
  };

  // 實體 FAQ AI Agent 深入諮詢
  const handleConsultFaqWithAgent = async (faq: FaqItem) => {
    if (consultingFaqId === faq.id) return;
    setConsultingFaqId(faq.id);
    try {
      const result = await consultFaqWithAiAgent({
        faqId: faq.id,
        question: faq.question,
        category: faq.category,
        answer: faq.answer,
        userContext: currentUser ? { userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role } : null,
      });
      setFaqConsultResults((prev) => ({ ...prev, [faq.id]: result }));
    } catch (e) {
      console.warn('FAQ Agent consult error:', e);
    } finally {
      setConsultingFaqId(null);
    }
  };

  // 在 FAQ 區向 AI Agent 提出自訂問題
  const handleAskAgentCustomFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = faqCustomQuery.trim();
    if (!query || isConsultingCustom) return;

    setIsConsultingCustom(true);
    setCustomConsultResult(null);

    try {
      const result = await consultFaqWithAiAgent({
        question: query,
        userQuery: query,
        category: 'FAQ延伸發問',
        userContext: currentUser ? { userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role } : null,
      });
      setCustomConsultResult(result);

      // 自動記錄至後台收集池供管理員 AI 聚類彙整
      recordCollectedQuestion({
        conversationId,
        userId: currentUser?.id || 'guest',
        userName: currentUser?.name || '訪客用戶',
        userAvatar: currentUser?.avatar,
        question: query,
        category: 'FAQ延伸發問',
        aiAnswerSnippet: result.explanation ? result.explanation.slice(0, 100) : undefined,
        resolvedByAi: true,
      });
    } catch (e) {
      console.warn('Custom FAQ consult error:', e);
    } finally {
      setIsConsultingCustom(false);
    }
  };

  // 自 FAQ 轉入 24hr AI 智能客服對話
  const handleTransferToChat = (text: string) => {
    setActiveTab('ai_agent');
    handleSendMessage(text);
  };

  // Manual ticket submission
  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketMessage.trim()) return;

    const ticketId = `TK-${Date.now().toString(36).toUpperCase()}`;
    const newTicket: CustomerSupportTicket = {
      id: ticketId,
      userId: currentUser?.id || 'guest',
      userName: ticketName.trim() || '用戶',
      userEmail: ticketEmail.trim() || '未填寫',
      title: ticketMessage.slice(0, 30),
      category: ticketCategory,
      description: ticketMessage.trim(),
      priority: ticketCategory === 'payment' || ticketCategory === 'delivery_dispute' ? 'urgent' : 'normal',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    saveTicketToStorage(newTicket);
    setSubmittedTicket(newTicket);
    if (soundOn) duohuiHoot(); // 重要提示：工單已受理
  };

  const filteredFaqs = searchFaqs(faqSearch, faqList).filter((item) =>
    selectedFaqCategory === 'all' ? true : item.category === selectedFaqCategory
  );

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150 text-stone-800">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-2xl w-full h-[90vh] max-h-[820px] flex flex-col overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-3.5 sm:p-4.5 border-b border-stone-100 flex items-center justify-between bg-stone-50/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 border border-emerald-200 flex items-center justify-center shadow-2xs overflow-hidden shrink-0">
              <img src={DUOHUI.happy} alt="官方客服 Agent 多慧" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-stone-900">客服與回報</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>多慧 25hr 在線</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5">
                <span>交易安全託管・專屬資料庫查詢・爭議調處</span>
                {currentUser && (
                  <CopyableUserId userId={currentUser.id} prefix="UID: " className="text-[9.5px] py-0 px-1 bg-stone-100" />
                )}
              </div>
            </div>
          </div>
          <button
            onClick={closeCustomerService}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer transition-colors"
            title="關閉客服視窗"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 pt-2.5 pb-2 bg-stone-50/50 border-b border-stone-200/80 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('ai_agent')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ai_agent'
                ? 'bg-amber-500 text-stone-950 shadow-2xs font-black'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>24hr 智能客服</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('faq')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'faq'
                ? 'bg-amber-500 text-stone-950 shadow-2xs font-black'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>常見問題 FAQ ({faqList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ticket')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ml-auto ${
              activeTab === 'ticket'
                ? 'bg-amber-500 text-stone-950 shadow-2xs font-black'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-700" />
            <span>專人回報工單</span>
          </button>
        </div>

        {/* Tab 1: AI Agent Chat Interface */}
        {activeTab === 'ai_agent' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-stone-50/30">
            {/* Messages Scroll Area */}
            <div className="flex-1 p-3.5 sm:p-5 overflow-y-auto space-y-4">
              {/* 多慧在這裡回答問題 */}
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 px-3 py-2">
                <img src={DUOHUI.answer} alt="" className="w-16 h-16 object-contain shrink-0" />
                <div className="text-[11px] sm:text-xs text-emerald-900 leading-relaxed">
                  <div className="font-black text-sm text-emerald-950">多慧・官方客服 Agent</div>
                  看起來聰明、喜歡和不同的人交流。有問題就交給我！
                </div>
              </div>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'flex-col items-end' : 'items-start gap-2'}`}
                >
                  {msg.role !== 'user' && (
                    <img src={DUOHUI.happy} alt="多慧" className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 object-contain shrink-0 mt-0.5" />
                  )}
                  <div className={msg.role === 'user' ? 'contents' : 'flex flex-col items-start min-w-0 max-w-[88%] sm:max-w-[80%]'}>
                  {msg.role !== 'user' && <span className="text-[10px] font-black text-emerald-800 mb-0.5 px-1">多慧</span>}
                  <div
                    className={`${msg.role === 'user' ? 'max-w-[88%] sm:max-w-[80%]' : 'max-w-full'} rounded-2xl px-3.5 py-3 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                      msg.role === 'user'
                        ? 'bg-stone-900 text-white rounded-br-xs'
                        : 'bg-white border border-stone-200/90 text-stone-850 rounded-bl-xs'
                    }`}
                  >
                    {/* Tool Used Badge */}
                    {msg.toolUsed && (
                      <div className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-200/80 text-[10px] font-mono font-bold mb-2">
                        <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                        <span>已調用資料庫: {msg.toolUsed}</span>
                      </div>
                    )}

                    {/* Message Body */}
                    <div className="whitespace-pre-line font-normal">{msg.text}</div>

                    {/* Data Card (Account Balance / Orders / Proposals / Ticket) */}
                    {msg.dataCard && (
                      <div className="mt-3 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-stone-900 text-xs space-y-1.5">
                        <div className="flex items-center justify-between font-bold border-b border-amber-200/80 pb-1 text-amber-950">
                          <span className="flex items-center gap-1">
                            {msg.dataCard.type === 'balance' && <Coins className="w-3.5 h-3.5 text-amber-600" />}
                            {msg.dataCard.type === 'orders' && <FileText className="w-3.5 h-3.5 text-amber-600" />}
                            {msg.dataCard.type === 'proposals' && <Briefcase className="w-3.5 h-3.5 text-amber-600" />}
                            {msg.dataCard.type === 'ticket' && <Shield className="w-3.5 h-3.5 text-emerald-600" />}
                            <span>{msg.dataCard.title}</span>
                          </span>
                          <span className="text-[10px] font-mono text-amber-800">即時數據</span>
                        </div>
                        <div className="space-y-1 pt-0.5">
                          {msg.dataCard.details.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[11px]">
                              <span className="text-stone-500">{item.label}</span>
                              <span className="font-bold font-mono text-stone-900">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick Follow-up Action Buttons */}
                    {msg.quickOptions && msg.quickOptions.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center gap-1.5 flex-wrap">
                        {msg.quickOptions.map((opt, oIdx) => (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => handleSendMessage(opt)}
                            className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-amber-100 active:bg-amber-200 text-stone-700 hover:text-amber-950 text-[11px] font-medium transition-colors cursor-pointer border border-stone-200/70"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-stone-400 mt-1 px-1">{msg.timestamp}</span>
                  </div>
                </div>
              ))}

              {isAiLoading && (
                <div className="flex items-start gap-2">
                  <img src={DUOHUI.focus} alt="" className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 object-contain shrink-0" />
                  <div className="px-3 py-2 rounded-2xl bg-white border border-stone-200 text-xs text-stone-500 flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />
                    <span>多慧正在翻資料…</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Satisfaction Feedback Bar */}
            <div className="px-4 py-1.5 bg-white border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>由官方客服 Agent 多慧為你服務</span>
              </span>
              <div className="flex items-center gap-2">
                <span>這回答有幫助嗎？</span>
                <button
                  type="button"
                  onClick={() => handleFeedback(true)}
                  className={`p-1 rounded-md transition-colors ${
                    satisfaction === 'positive'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'hover:bg-stone-100 text-stone-400 hover:text-stone-700'
                  }`}
                  title="很有幫助"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleFeedback(false)}
                  className={`p-1 rounded-md transition-colors ${
                    satisfaction === 'negative'
                      ? 'bg-rose-100 text-rose-800'
                      : 'hover:bg-stone-100 text-stone-400 hover:text-stone-700'
                  }`}
                  title="尚需改進"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Input Bar */}
            <div className="p-3 sm:p-3.5 bg-white border-t border-stone-200 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="輸入您的問題（例如：我的帳戶餘額、如何確認驗收、申請爭議退款...）"
                  className="flex-1 px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:border-amber-500 outline-none"
                  disabled={isAiLoading}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isAiLoading}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">發送</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 2: FAQ Knowledge Base (實體 AI Agent 深度接入) */}
        {activeTab === 'faq' && (
          <div className="flex-1 flex flex-col overflow-hidden p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-2.5 -mb-1">
              <img src={DUOHUI.guide} alt="" className="w-12 h-12 object-contain shrink-0" />
              <p className="text-xs text-emerald-900 font-bold leading-relaxed">多慧把大家最常問的整理好了，先搜搜看；找不到再直接問我！</p>
            </div>
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                placeholder="搜尋平台常見問題（例如：點數、退款、成案、UID、手續費...）"
                className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-amber-500 outline-none"
              />
            </div>

            {/* AI Agent Ask Anything in FAQ (實體 Agent 檢索發問區) */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-purple-500/10 border border-amber-300/80 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>找不到想查的問題？讓 24hr AI 客服 Agent 即時解答</span>
                </span>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200">
                  ⚡ Dify Live Agent
                </span>
              </div>
              <form onSubmit={handleAskAgentCustomFaq} className="flex items-center gap-2">
                <input
                  type="text"
                  value={faqCustomQuery}
                  onChange={(e) => setFaqCustomQuery(e.target.value)}
                  placeholder="輸入您的任何問題（例如：如果發案逾期沒有專家投標，託管點數何時自動退回錢包？）"
                  className="flex-1 px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-xs outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={isConsultingCustom || !faqCustomQuery.trim()}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-50 text-stone-950 text-xs font-black flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs transition-all"
                >
                  {isConsultingCustom ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>AI解答中...</span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-3.5 h-3.5" />
                      <span>問問 Agent</span>
                    </>
                  )}
                </button>
              </form>

              {customConsultResult && (
                <div className="p-3 rounded-xl bg-white border border-amber-300 text-xs space-y-2 animate-in fade-in shadow-2xs">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-1.5">
                    <span className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>{customConsultResult.agentName}</span>
                      {customConsultResult.latencyMs && (
                        <span className="font-mono text-[9.5px] text-stone-400">
                          ({customConsultResult.latencyMs}ms)
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleTransferToChat(faqCustomQuery)}
                      className="text-[11px] font-bold text-amber-700 hover:text-amber-900 cursor-pointer flex items-center gap-1"
                    >
                      <span>轉入完整交談視窗</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-stone-700 whitespace-pre-line leading-relaxed text-[11.5px] font-sans">
                    {customConsultResult.explanation}
                  </p>
                </div>
              )}
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0">
              {['all', '帳戶與身分', '金流與點數', '提問與媒合', '爭議與仲裁'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedFaqCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedFaqCategory === cat
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                  }`}
                >
                  {cat === 'all' ? '全部類別' : cat}
                </button>
              ))}
            </div>

            {/* FAQ List Accordion */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {filteredFaqs.length === 0 ? (
                <div className="py-12 text-center text-stone-400 text-xs">
                  查無相關常見問題，您可以點擊上方「問問 Agent」由專屬客服特助為您即時解答！
                </div>
              ) : (
                filteredFaqs.map((faq, idx) => {
                  const isOpen = openFaqId === faq.id;
                  const consultData = faqConsultResults[faq.id];
                  const isConsultingThis = consultingFaqId === faq.id;

                  return (
                    <div
                      key={faq.id}
                      className="rounded-2xl border border-stone-200/90 overflow-hidden bg-white shadow-2xs transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                        className="w-full p-3.5 text-left flex items-center justify-between gap-3 hover:bg-stone-50/80 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-900 font-bold font-mono text-[10px] flex items-center justify-center shrink-0">
                            Q{idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-xs sm:text-sm text-stone-900 block">{faq.question}</span>
                            <span className="text-[10px] text-stone-400 font-medium">{faq.category}</span>
                          </div>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-stone-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
                        )}
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 pt-1 text-xs text-stone-600 leading-relaxed border-t border-stone-100 bg-stone-50/40 space-y-2.5">
                          <p className="whitespace-pre-line leading-relaxed">{faq.answer}</p>
                          {faq.tags && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              {faq.tags.map((t, tIdx) => (
                                <span key={tIdx} className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-100 text-stone-500 border border-stone-200/80">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Agent Deep Consult Button & Panel */}
                          <div className="pt-2 border-t border-stone-200/60 space-y-2">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleConsultFaqWithAgent(faq)}
                                disabled={isConsultingThis}
                                className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200/90 active:scale-95 text-amber-950 font-black text-[11px] flex items-center gap-1.5 cursor-pointer border border-amber-300 transition-all disabled:opacity-50"
                              >
                                {isConsultingThis ? (
                                  <>
                                    <RefreshCw className="w-3 h-3 animate-spin text-amber-700" />
                                    <span>AI 客服 Agent 正在即時深度調閱智庫...</span>
                                  </>
                                ) : (
                                  <>
                                    <Bot className="w-3.5 h-3.5 text-amber-700" />
                                    <span>🤖 讓 AI 客服 Agent 深入解答此問題</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleTransferToChat(`我想深入諮詢常見問題：【${faq.question}】`)}
                                className="text-[11px] font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
                              >
                                <span>💬 轉入 24hr 客服交談</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Rendered Agent Deep Consultation Result */}
                            {consultData && (
                              <div className="p-3.5 rounded-xl bg-white border border-amber-300 shadow-2xs space-y-2 animate-in fade-in">
                                <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 border-b border-amber-100 pb-1.5">
                                  <span className="flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                    <span>{consultData.agentName}</span>
                                  </span>
                                  {consultData.latencyMs && (
                                    <span className="font-mono text-[10px] text-stone-400">
                                      {consultData.latencyMs} ms
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11.5px] text-stone-700 whitespace-pre-line leading-relaxed font-sans">
                                  {consultData.explanation}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Official Support Ticket */}
        {activeTab === 'ticket' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {submittedTicket ? (
              <div className="py-10 text-center space-y-3">
                <img src={DUOHUI.warm} alt="多慧" className="w-24 h-24 object-contain mx-auto animate-in zoom-in-75 duration-200" />
                <h4 className="font-black text-lg text-stone-900">客服工單已成功受理！</h4>
                <p className="text-xs font-bold text-emerald-800">多慧收到你的回報囉，會盯著直到處理好！</p>
                <div className="inline-block p-2 rounded-xl bg-amber-50 border border-amber-200 font-mono text-xs font-bold text-amber-900">
                  工單單號：#{submittedTicket.id}
                </div>
                <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
                  IdeaX 官方審查小組已收到您的排查案件，我們將儘速調閱後台資料並透過 Email 與站內信件聯繫您。
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedTicket(null);
                      setActiveTab('ai_agent');
                    }}
                    className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black shadow-xs cursor-pointer"
                  >
                    返回 24hr 智能客服交談
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleTicketSubmit} className="space-y-4">
                <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 flex items-center gap-2.5">
                  <img src={DUOHUI.support} alt="多慧" className="w-12 h-12 object-contain shrink-0" />
                  <span>
                    提交官方工單後，系統將自動分派至爭議調解委員會，並於 1 個工作天內聯繫您。
                  </span>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    諮詢或申訴類別 <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { id: 'delivery_dispute', label: '交付內容異議' },
                      { id: 'payment', label: '支付與扣款' },
                      { id: 'payout', label: '撥款與提領' },
                      { id: 'account', label: '帳號與認證' },
                      { id: 'feature', label: '功能諮詢' },
                      { id: 'bug', label: '系統異常(Bug)' },
                      { id: 'suggestion', label: '平台建議' },
                      { id: 'other', label: '其他事項' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTicketCategory(item.id as ServiceCategory)}
                        className={`px-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                          ticketCategory === item.id
                            ? 'bg-amber-500 text-stone-950 shadow-2xs font-black'
                            : 'bg-stone-50 border border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name & Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      您的姓名 / 稱呼 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={ticketName}
                      onChange={(e) => setTicketName(e.target.value)}
                      placeholder="王大明"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      聯絡 Email / 電話 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={ticketEmail}
                      onChange={(e) => setTicketEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    問題描述與佐證說明 <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    placeholder="請詳細敘述您遇到的問題、相關單號、希望平台專員協助的事項..."
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-amber-500 outline-none leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>送出專人工單</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
