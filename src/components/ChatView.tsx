import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { ChatConversation, ChatMessage, Question, Answer } from '../types';
import { mediateDisputeWithAI } from '../services/aiService';
import { marketAdvisorAgent } from '../services/marketAdvisorAgent';
import { downloadMediationContractMarkdown } from '../services/proposalService';
import { SubmitAnswerModal } from './SubmitAnswerModal';
import { HelpTooltip } from './HelpTooltip';
import { ContractPreviewModal } from './ContractPreviewModal';
import { ChatOnboardingGuide, CHAT_ONBOARDING_STORAGE_KEY } from './ChatOnboardingGuide';
import { 
  ContractData, 
  buildContractFromOffer, 
  buildContractFromMediation, 
  downloadContractFile 
} from '../utils/contractGenerator';
import { resolveUserDisplayName, getUserNameColorClass } from '../utils/userDisplay';
import { isTestAccountUserId } from '../data/mockData';
import {
  MessageSquare,
  Send,
  Lock,
  Plus,
  X,
  ShieldCheck,
  Award,
  HelpCircle,
  Briefcase,
  ArrowLeft,
  PanelLeftClose,
  PanelLeft,
  Search,
  Image as ImageIcon,
  Paperclip,
  CheckCircle2,
  Clock,
  Sparkles,
  CreditCard,
  Wallet,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  FileCheck,
  FileText,
  Scale,
  Loader2,
  Check,
  Download,
  Bell,
  Mail,
  AlertTriangle,
  Info,
  Crown,
  Contact,
  Copy,
  MessageSquareQuote,
  Bookmark,
  Bot,
} from 'lucide-react';

interface CannedMessage {
  id: string;
  category: 'rules' | 'disputes' | 'verification' | 'system' | 'custom';
  categoryLabel: string;
  title: string;
  content: string;
}

const DEFAULT_ADMIN_CANNED_MESSAGES: CannedMessage[] = [
  {
    id: 'canned-1',
    category: 'rules',
    categoryLabel: '社群與規範',
    title: '官方社群守則與友善交流提醒',
    content: '【官方提醒】您好，請務必維護健康友善的溝通環境，尊重雙方專業。平台嚴格禁止廣告騷擾、辱罵或違法內容，若有違規情形系統將依法執行停權處分。如有疑問請向管理員諮詢。',
  },
  {
    id: 'canned-2',
    category: 'rules',
    categoryLabel: '社群與規範',
    title: '第三方官方價金保管警示',
    content: '【安全交易警示】平台提供第三方全額價金託管與交付驗收保障，嚴禁任何脫離平台私下轉帳之行為。私下交易將無法享有官方爭議仲裁與退款保障，請雙方務必於平台內發送方案並進行託管。',
  },
  {
    id: 'canned-3',
    category: 'disputes',
    categoryLabel: '申訴與調解',
    title: '管理員已受理申訴案通知',
    content: '【申訴仲裁受理通知】您好，管理員已接獲並正式受理本案件之爭議調解申請。目前正在調閱雙方通訊記錄、交付歷程與方案約定條款進行審查，預計於 1-2 個工作天內提供裁決或調解建議。',
  },
  {
    id: 'canned-4',
    category: 'disputes',
    categoryLabel: '申訴與調解',
    title: '催請檢視並簽署和解協議',
    content: '【調解協議簽署催告】雙方您好，管理員已指派 AI 與仲裁專家擬定和解條款，請雙方進入聊天室檢視協議明細（折讓退款或延長驗收）。確認同意後請點擊簽署，系統將立即執行點數結算與託管放款。',
  },
  {
    id: 'canned-5',
    category: 'verification',
    categoryLabel: '身分與認證',
    title: '實名身分認證審核中通知',
    content: '【實名認證通知】您好，您提交的實名認證與證明文件已進入人工複審階段。審核人員將核對您的身分資料，審核完成後系統將自動為您頒發官方實名徽章並開啟提領功能。',
  },
  {
    id: 'canned-6',
    category: 'verification',
    categoryLabel: '身分與認證',
    title: '智庫專家資格審核通過恭賀',
    content: '【專家資格認證通過】恭喜您！您的智庫專家資格已通過管理團隊審查。您的帳號現已獲得官方「智庫專家」認證徽章，並已為您開通優先推薦曝光與專屬客製化接案服務。',
  },
  {
    id: 'canned-7',
    category: 'system',
    categoryLabel: '系統維護與帳號',
    title: '平台例行維護與升級提醒',
    content: '【系統維護公告】為提供更穩定的諮詢與託管服務，平台預計於今日深夜 02:00-03:00 進行伺服器維護與功能升級。維護期間訊息發送可能有短暫延遲，造成不便敬請見諒。',
  },
  {
    id: 'canned-8',
    category: 'system',
    categoryLabel: '系統維護與帳號',
    title: '帳號權益恢復正常公告',
    content: '【帳號權限恢復通知】經管理團隊重新覆核您的申覆資料，您的帳號限制與停權處分現已全數解除，平台所有發問、提案、私聊與提領功能均已恢復正常運作。',
  },
];

interface ChatViewProps {
  onOpenAiCrm?: () => void;
  onOpenAdminMailDisputes?: () => void;
}

const formatDisplayTime = (timeStr?: string) => {
  if (!timeStr) return '';
  if (
    timeStr === '剛剛' ||
    timeStr.includes('前') ||
    timeStr.includes('昨天') ||
    timeStr.includes('天前') ||
    timeStr.includes('分鐘') ||
    timeStr.includes('小時')
  ) {
    return timeStr;
  }
  const d = new Date(timeStr);
  if (isNaN(d.getTime())) return timeStr;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const ChatView: React.FC<ChatViewProps> = ({ onOpenAiCrm, onOpenAdminMailDisputes }) => {
  const {
    currentUser,
    conversations,
    setConversations,
    questions,
    activeConversationId,
    setActiveConversationId,
    sendMessage,
    acceptChatOffer,
    commissionRate,
    calculateSplitPayout,
    depositBalance,
    startDirectChat,
    createGroupConversation,
    availableUsers,
    toggleMediationAgreement,
    notifications,
    isNotificationsSidebarOpen,
    setIsNotificationsSidebarOpen,
    openAuthModal,
    addNotification,
    promptLogin,
  } = useApp();

  // --- 提出方案 (完整提案 Modal，同問題下方提出方案頁面) ---
  const [isSubmitAnswerModalOpen, setIsSubmitAnswerModalOpen] = useState(false);

  // --- AI 智慧調解 Modal 狀態 ---
  const [isMediationModalOpen, setIsMediationModalOpen] = useState(false);
  const [mediationDisputeReason, setMediationDisputeReason] = useState('');
  const [isAnalyzingMediation, setIsAnalyzingMediation] = useState(false);

  // 1. 聊天室列表身份切換狀態 ('questioner' vs 'solver')
  const [listRoleMode, setListRoleMode] = useState<'questioner' | 'solver'>(() => {
    return currentUser.role === 'solver' ? 'solver' : 'questioner';
  });

  // Mobile navigation state: 'chat' (進入特定聊天室) vs 'list' (對話列表)
  const [mobileView, setMobileView] = useState<'chat' | 'list'>('list');

  // Desktop sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Search filter for conversations
  const [searchQuery, setSearchQuery] = useState('');

  const [inputMessage, setInputMessage] = useState('');

  // + (Plus) Action Menu state
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- 報價與方案 (Offer) 流程狀態 ---
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerCategory, setOfferCategory] = useState('1on1 深度諮詢');
  const [offerPrice, setOfferPrice] = useState<number>(1500);
  const [offerEstimatedDays, setOfferEstimatedDays] = useState<number>(3);
  const [offerDeliverables, setOfferDeliverables] = useState('');
  const [offerPaywalledContent, setOfferPaywalledContent] = useState('');

  // --- 買方詢價委託 (Request) 流程狀態 ---
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestRequirement, setRequestRequirement] = useState('');
  const [requestBudget, setRequestBudget] = useState<number>(2000);
  const [requestTimeline, setRequestTimeline] = useState('3-5 天內完成');
  const [editingMediationMsg, setEditingMediationMsg] = useState<ChatMessage | null>(null);
  const [editSettlementAmount, setEditSettlementAmount] = useState<number>(1200);
  const [editEstimatedDays, setEditEstimatedDays] = useState<number>(3);
  const [editRecommendedAction, setEditRecommendedAction] = useState<string>('');
  const [editModificationNotes, setEditModificationNotes] = useState<string>('');

  // --- 簽署和解協議二次確認彈窗狀態 ---
  const [mediationConfirmModal, setMediationConfirmModal] = useState<{
    isOpen: boolean;
    msg: ChatMessage | null;
    role: 'buyer' | 'seller';
  }>({
    isOpen: false,
    msg: null,
    role: 'buyer',
  });
  const [confirmModalChosenOption, setConfirmModalChosenOption] = useState<'optionA' | 'optionB'>('optionA');

  // --- 發送用戶名片 (User Card) Modal 狀態 ---
  const [isSendUserCardModalOpen, setIsSendUserCardModalOpen] = useState(false);
  const [userCardSearchInput, setUserCardSearchInput] = useState('');
  const [selectedUserForCard, setSelectedUserForCard] = useState<any>(null);
  const [userCardNote, setUserCardNote] = useState('');

  // --- 管理員罐頭訊息 (Canned Messages) 狀態 ---
  const [isCannedMessagesModalOpen, setIsCannedMessagesModalOpen] = useState(false);

  // --- 聊天室首次使用步驟式教學狀態（由教學導覽銜接或主動觸發） ---
  const [isChatOnboardingOpen, setIsChatOnboardingOpen] = useState(false);

  // 確保對話清單中有對話可供點選（若無任何對話，則自動準備專屬教學示範虛擬聊天室）
  const ensureDemoConversationAvailable = useCallback(() => {
    if (conversations.length > 0) {
      return conversations[0].id;
    }

    const DEMO_GUIDE_CONV_ID = 'conv-tutorial-demo';
    const demoUser = availableUsers.find(
      (u) => u.id !== currentUser.id && u.role === 'solver'
    ) || {
      id: 'user-solver-demo',
      name: '陳建銘 顧問',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      title: '資深商業架構師・智庫專家',
      role: 'solver',
    };

    const virtualDemoConv: ChatConversation = {
      id: DEMO_GUIDE_CONV_ID,
      participantIds: [currentUser.id, demoUser.id],
      participantDetails: [
        {
          id: currentUser.id,
          name: currentUser.name || '提問者',
          avatar: currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          title: currentUser.title || '提問者',
        },
        {
          id: demoUser.id,
          name: demoUser.name,
          avatar: demoUser.avatar,
          title: demoUser.title || '智庫專家',
        },
      ],
      conversationRole: 'questioner',
      lastMessage: '歡迎進入聊天室！請點選下方「＋」按鈕體驗核心功能。',
      lastMessageTime: '剛剛',
      unreadCount: 0,
      relatedQuestionTitle: '【教學示範】商業模式驗證與專家諮詢服務',
      messages: [
        {
          id: 'msg-demo-1',
          senderId: demoUser.id,
          senderName: demoUser.name,
          senderAvatar: demoUser.avatar,
          text: '您好！我是您的專屬智庫顧問。這是一間為您準備的「教學示範聊天室」。',
          createdAt: '剛剛',
        },
        {
          id: 'msg-demo-2',
          senderId: demoUser.id,
          senderName: demoUser.name,
          senderAvatar: demoUser.avatar,
          text: '在下方輸入框左側點擊「＋」號，即可使用「自訂方案報價」、「詢價委託」、「提出方案」與「申請 AI 調解」等核心交易功能。',
          createdAt: '剛剛',
        },
      ],
    };

    setConversations((prev) => [
      virtualDemoConv,
      ...prev.filter((c) => c.id !== DEMO_GUIDE_CONV_ID),
    ]);
    return virtualDemoConv.id;
  }, [conversations, availableUsers, currentUser, setConversations]);

  // 選擇並進入第一個聊天室
  const handleSelectFirstConversation = useCallback(() => {
    const targetId = ensureDemoConversationAvailable();
    if (targetId) {
      setActiveConversationId(targetId);
      setMobileView('chat');
    }
  }, [ensureDemoConversationAvailable, setActiveConversationId]);

  useEffect(() => {
    try {
      const forceChatOnboarding = sessionStorage.getItem('ideax_force_chat_onboarding') === 'true';
      if (forceChatOnboarding) {
        sessionStorage.removeItem('ideax_force_chat_onboarding');

        // 1. 確保對話清單中有聊天室可供點選
        ensureDemoConversationAvailable();

        // 2. 先呈現列表供用戶點擊體驗 (若無特別選定)
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          setMobileView('list');
        }

        // 3. 啟動聊天室教學引導
        const timer = setTimeout(() => {
          setIsChatOnboardingOpen(true);
        }, 300);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.error(e);
    }
  }, [ensureDemoConversationAvailable]);
  const [cannedMessageCategory, setCannedMessageCategory] = useState<string>('all');
  const [cannedMessageSearch, setCannedMessageSearch] = useState('');
  const [customCannedMessages, setCustomCannedMessages] = useState<CannedMessage[]>(() => {
    try {
      const saved = localStorage.getItem('ideax_admin_canned_messages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newCannedTitle, setNewCannedTitle] = useState('');
  const [newCannedContent, setNewCannedContent] = useState('');
  const [isAddingCustomCanned, setIsAddingCustomCanned] = useState(false);

  const allCannedMessages = [...DEFAULT_ADMIN_CANNED_MESSAGES, ...customCannedMessages];
  const filteredCannedMessages = allCannedMessages.filter((msg) => {
    const matchCat = cannedMessageCategory === 'all' || msg.category === cannedMessageCategory;
    const matchSearch =
      !cannedMessageSearch.trim() ||
      msg.title.toLowerCase().includes(cannedMessageSearch.toLowerCase()) ||
      msg.content.toLowerCase().includes(cannedMessageSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  // --- 點數不足彈窗狀態 ---
  const [insufficientBalanceModal, setInsufficientBalanceModal] = useState<{
    isOpen: boolean;
    requiredAmount: number;
    currentBalance: number;
    targetMsg: ChatMessage;
  } | null>(null);

  // --- 支付與託管結算彈窗狀態 ---
  const [paymentTargetMessage, setPaymentTargetMessage] = useState<ChatMessage | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentAgreementAccepted, setPaymentAgreementAccepted] = useState(true);
  const [previewContract, setPreviewContract] = useState<ContractData | null>(null);

  const isBella = (user?: { name?: string; username?: string; id?: string; email?: string } | null): boolean => {
    if (!user) return false;
    const name = (user.name || '').toLowerCase();
    const username = (user.username || '').toLowerCase();
    const id = (user.id || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    return (
      name.includes('貝拉') ||
      name.includes('bella') ||
      username.includes('bella') ||
      id === 'user-bella' ||
      email.includes('bella')
    );
  };

  const isCoreAdminGroup = (c: ChatConversation) => {
    return c.id === 'group-admin-core' || (c.isGroup && (c.groupName === '平台核心管理群' || c.groupName === '平台管理員核心協作群組'));
  };

  const isQualifiedForCore = currentUser.role === 'admin' || isBella(currentUser);

  // 判定是否為當前用戶自身的 ID (相容 a000000001 與 user-admin)
  const isMe = useCallback(
    (userId?: string) => {
      if (!userId) return false;
      if (userId === currentUser.id) return true;
      if (currentUser.role === 'admin' && (userId === 'user-admin' || userId === 'a000000001')) return true;
      return false;
    },
    [currentUser.id, currentUser.role]
  );

  // 訊息頭像：使用寄件人「目前」的頭像（訊息內存的是傳送當下的頭像，換頭像後會不一致）
  const resolveLiveAvatar = useCallback(
    (senderId?: string, fallback?: string) => {
      if (!senderId) return fallback;
      if (senderId === currentUser.id) return currentUser.avatar || fallback;
      const u = availableUsers.find((user) => user.id === senderId);
      return u?.avatar || fallback;
    },
    [currentUser.id, currentUser.avatar, availableUsers]
  );

  // 取得對話中另一方的詳細資料
  const getOtherParticipant = useCallback(
    (conv: ChatConversation) => {
      if (conv.isGroup) return null;
      if (Array.isArray(conv.participantDetails) && conv.participantDetails.length > 0) {
        const found = conv.participantDetails.find((p) => !isMe(p.id));
        if (found) {
          // 對話裡存的是建立當下的名稱與頭像，改用對方目前的資料
          const live = availableUsers.find((u) => u.id === found.id);
          return live ? { ...found, name: live.name || found.name, avatar: live.avatar || found.avatar } : found;
        }
      }
      if (Array.isArray(conv.participantIds)) {
        const otherId = conv.participantIds.find((id) => !isMe(id));
        if (otherId) {
          const u = availableUsers.find((user) => user.id === otherId);
          if (u) {
            return {
              id: u.id,
              name: u.name,
              avatar: u.avatar,
              title: u.title || (u.accountType === 'enterprise' || (u.role as string) === 'enterprise' ? '企業機構' : '一般用戶'),
            };
          }
          return { id: otherId, name: '對話用戶', avatar: '', title: '一般用戶' };
        }
      }
      return null;
    },
    [isMe, availableUsers]
  );

  // Admin chat categories & Vendor group logic
  const isAdmin = currentUser.role === 'admin';
  const [adminChatTab, setAdminChatTab] = useState<'all' | 'general' | 'vendors' | 'admins'>('all');

  const adminAllConversations = React.useMemo(() => {
    return conversations.filter((c) => {
      if (isCoreAdminGroup(c)) return isQualifiedForCore;
      if (c.isGroup) return true;
      if (c.participantIds?.some((id) => isMe(id))) return true;
      if (c.participantDetails?.some((p) => isMe(p.id))) return true;
      return false;
    });
  }, [conversations, isQualifiedForCore, isMe]);

  const adminGeneralConversations = React.useMemo(() => {
    return adminAllConversations.filter((c) => {
      if (c.isGroup) return false;
      const other = getOtherParticipant(c);
      if (!other) return false;
      const isOtherAdmin = availableUsers.find((u) => u.id === other.id)?.role === 'admin' || other.id.startsWith('a') || other.id === 'user-admin';
      const isOtherVendor = other.title?.includes('廠商') || other.title?.includes('企業') || other.id.startsWith('b');
      return !isOtherAdmin && !isOtherVendor;
    });
  }, [adminAllConversations, getOtherParticipant, availableUsers]);

  const adminVendorConversations = React.useMemo(() => {
    return adminAllConversations.filter((c) => {
      if (c.isGroup) return c.groupName?.includes('廠商') || c.groupName?.includes('企業') || c.participantDetails?.some((p) => p.title?.includes('企業') || p.title?.includes('廠商'));
      const other = getOtherParticipant(c);
      if (!other) return false;
      return other.title?.includes('廠商') || other.title?.includes('企業') || other.id.startsWith('b');
    });
  }, [adminAllConversations, getOtherParticipant]);

  const adminAdminsConversations = React.useMemo(() => {
    return adminAllConversations.filter((c) => {
      if (isCoreAdminGroup(c)) return isQualifiedForCore;
      if (c.isGroup) return true;
      const other = getOtherParticipant(c);
      if (!other) return false;
      const isOtherAdmin = availableUsers.find((u) => u.id === other.id)?.role === 'admin' || other.id.startsWith('a') || other.id === 'user-admin';
      return isOtherAdmin || isBella(other);
    });
  }, [adminAllConversations, getOtherParticipant, isQualifiedForCore, availableUsers, isBella]);

  const activeAdminList = React.useMemo(() => {
    switch (adminChatTab) {
      case 'general': return adminGeneralConversations;
      case 'vendors': return adminVendorConversations;
      case 'admins': return adminAdminsConversations;
      case 'all':
      default:
        return adminAllConversations;
    }
  }, [adminChatTab, adminGeneralConversations, adminVendorConversations, adminAdminsConversations, adminAllConversations]);

  // 一般用戶：全量對話清單（不再區分提問者與解答者）
  const generalUserConversations = React.useMemo(() => {
    return conversations.filter((c) => {
      if (isCoreAdminGroup(c)) return isQualifiedForCore;
      if (c.participantIds?.some((id) => isMe(id))) return true;
      if (c.participantDetails?.some((p) => isMe(p.id))) return true;
      return false;
    });
  }, [conversations, isQualifiedForCore, isMe]);

  const currentConversationsToDisplay = isAdmin ? activeAdminList : generalUserConversations;

  // 當管理員開啟某個私聊時，若當前分類找不到該對話，自動切換至「全部」標籤確保立即可見
  useEffect(() => {
    if (!activeConversationId || !isAdmin) return;
    const isVisibleInCurrent = activeAdminList.some((c) => c.id === activeConversationId);
    if (!isVisibleInCurrent) {
      setAdminChatTab('all');
    }
  }, [activeConversationId, isAdmin, activeAdminList]);

  const filteredConversations = currentConversationsToDisplay.filter((conv) => {
    const other = getOtherParticipant(conv);
    const nameStr = conv.isGroup ? conv.groupName : (other?.name || conv.participantDetails?.find((p) => !isMe(p.id))?.name);
    const matchName = nameStr?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchQuestion = conv.relatedQuestionTitle?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchLast = conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase());
    return !searchQuery.trim() || matchName || matchQuestion || matchLast;
  });

  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // 取得當前用戶所有 1 對 1 私聊對象的 ID 清單（排除群組）
  const privateChatPartnerIds = React.useMemo(() => {
    const ids = new Set<string>();
    conversations.forEach((conv) => {
      if (!conv.isGroup && Array.isArray(conv.participantIds)) {
        conv.participantIds.forEach((pid) => {
          if (pid && pid !== currentUser.id) {
            ids.add(pid);
          }
        });
      }
    });
    return ids;
  }, [conversations, currentUser.id]);

  // 群組成員挑選名單：一般用戶僅能挑選曾私聊過的對象，且不可拉管理員與測試帳號
  const eligibleGroupMembers = React.useMemo(() => {
    return availableUsers.filter((u) => {
      if (!u || u.id === currentUser.id) return false;
      if (currentUser.role !== 'admin') {
        // 1. 嚴格阻擋管理員
        const isAdmin =
          u.role === 'admin' ||
          u.accountType === 'admin' ||
          u.id === 'user-admin' ||
          u.id === 'a000000001' ||
          u.id.startsWith('a') ||
          u.email === 'operations@ideax.io';
        if (isAdmin) return false;

        // 2. 嚴格阻擋測試帳號與模擬創作者
        const isTest =
          u.isTestAccount === true ||
          u.isSimulated === true ||
          u.id.startsWith('test-') ||
          u.id.startsWith('solver-') ||
          u.id.startsWith('user-author-') ||
          u.id === 'user-guest' ||
          u.id === 'c000000000' ||
          u.name?.includes('測試') ||
          u.username?.includes('test') ||
          isTestAccountUserId(u.id);
        if (isTest) return false;

        // 3. 必須是「與自己已有 1 對 1 私聊紀錄」的對象（其他人不可拉）
        if (!privateChatPartnerIds.has(u.id)) {
          return false;
        }
      }
      return true;
    });
  }, [availableUsers, currentUser.id, currentUser.role, privateChatPartnerIds]);

  // 當前選中的對話 (若無選中，則為 null)
  const activeConversation = activeConversationId
    ? conversations.find((c) => c.id === activeConversationId) || null
    : null;

  // 進入對某人的聊天室時「固定單一種身份」
  const lockedConversationRole: 'questioner' | 'solver' =
    activeConversation?.conversationRole || 'questioner';

  // 重新整理時自動還原或保持選中的對話對象，避免對象消失或空白
  useEffect(() => {
    if (!activeConversationId && currentConversationsToDisplay.length > 0) {
      let savedId: string | null = null;
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        savedId = urlParams.get('conv') || urlParams.get('cid') || urlParams.get('chatId');
        if (!savedId) {
          savedId = localStorage.getItem('ideax_mvp_v3_active_conversation_id') || localStorage.getItem('ideax_active_conversation_id');
        }
      }
      const matched = savedId ? currentConversationsToDisplay.find((c) => c.id === savedId) : null;
      if (matched) {
        setActiveConversationId(matched.id);
      } else if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        setActiveConversationId(currentConversationsToDisplay[0].id);
      }
    }
  }, [activeConversationId, currentConversationsToDisplay, setActiveConversationId]);

  // 切換對話時，在手機端直達聊天室並平滑捲到底部
  useEffect(() => {
    if (activeConversationId) {
      setMobileView('chat');
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversationId, activeConversation?.messages.length]);

  // 點擊外部關閉 + 號選單
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setIsPlusMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRunAIMediation = async () => {
    if (!activeConversation) return;
    setIsAnalyzingMediation(true);
    try {
      // 1. 維度一：原始需求目標
      const relatedQ = questions.find((q) => q.id === activeConversation.relatedQuestionId);
      const questionTitle = activeConversation.relatedQuestionTitle || relatedQ?.title || '專案客製諮詢與成果交付';
      const questionDescription = relatedQ?.description || '兩造於平台約定之委託需求、交付規格、驗收標準與完成期限';

      // 2. 維度二：專家實際交付內容（包含方案報價清單、檔案附件與成果文字）
      const deliverableMsgs = activeConversation.messages.filter(
        (m) => m.offer || m.attachment || m.text.includes('交付') || m.text.includes('報告') || m.text.includes('檔案')
      );
      const actualDeliverablesSummary =
        deliverableMsgs.length > 0
          ? deliverableMsgs
              .map((m) => {
                if (m.offer) {
                  return `方案項目: ${m.offer.title} (NT$ ${m.offer.price})，交付清單: ${(m.offer.deliverables || []).join('、')}，說明: ${m.offer.description}`;
                }
                if (m.attachment) {
                  return `已上傳交付檔案: ${m.attachment.name} (${m.attachment.size || '文件'})`;
                }
                return `${m.senderName}: ${m.text}`;
              })
              .join('；\n')
          : '解答者已於聊天室提交初步分析說明與交付檔案成果。';

      // 3. 維度三：雙方通訊記錄日誌
      const convHistory = activeConversation.messages
        .map(
          (m) =>
            `[${new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] ${m.senderName}: ${
              m.text || (m.offer ? `【方案: ${m.offer.title} - NT$ ${m.offer.price}】` : '')
            }`
        )
        .join('\n');

      // 4. 計算爭議案件託管金額
      const latestOffer = [...activeConversation.messages].reverse().find((m) => m.offer)?.offer;
      const escrowTotal = latestOffer?.price || relatedQ?.bounty || 2000;

      const result = await marketAdvisorAgent.mediateDispute(
        questionTitle,
        questionDescription,
        actualDeliverablesSummary,
        mediationDisputeReason.trim() || '提問者主張專家交付內容與原約定有落差，專家主張已達標且有額外追加項目。',
        convHistory,
        escrowTotal
      );

      const newMedMsg: ChatMessage = {
        id: `msg-med-${Date.now()}`,
        senderId: 'system-ai',
        senderName: 'IdeaX 市場顧問',
        senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
        text: 'AI Agent「市場顧問」已產出《履約偏差與和解建議書》（含三方客觀比對與雙軌和解方案）',
        createdAt: new Date().toISOString(),
        aiMediation: {
          ...result,
          settlementAmount: result.options?.optionA.payoutAmount || Math.round(escrowTotal * 0.7),
          estimatedDays: result.options?.optionB.extendedDays || 3,
          selectedOptionByBuyer: 'optionA',
          selectedOptionBySeller: 'optionA',
          agreedOption: undefined,
          version: 1,
        },
      };

      activeConversation.messages.push(newMedMsg);
      activeConversation.lastMessage = '「市場顧問」已產出《履約偏差與和解建議書》';
      activeConversation.lastMessageTime = '剛剛';

      setIsMediationModalOpen(false);
      setMediationDisputeReason('');
    } finally {
      setIsAnalyzingMediation(false);
    }
  };

  const otherParticipant = activeConversation
    ? getOtherParticipant(activeConversation) ||
      activeConversation.participantDetails?.find((p) => !isMe(p.id)) ||
      activeConversation.participantDetails?.find((p) => p.id !== currentUser.id) || {
        id: 'partner',
        name: '諮詢夥伴',
        avatar: '',
        title: lockedConversationRole === 'questioner' ? '平台認證解答專家' : '',
      }
    : null;

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    try {
      localStorage.setItem('ideax_mvp_v3_active_conversation_id', id);
      localStorage.setItem('ideax_active_conversation_id', id);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('conv', id);
        window.history.replaceState(null, '', url.toString());
      }
    } catch {}
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
    setMobileView('chat');
  };

  // 當開啟或點進聊天室時，自動將該對話之未讀計數清零 (點進去即視為已讀)
  useEffect(() => {
    if (activeConversationId) {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeConversationId && (c.unreadCount || 0) > 0) {
            return { ...c, unreadCount: 0 };
          }
          return c;
        })
      );
    }
  }, [activeConversationId, setConversations]);

  const handleSwitchListRole = (newRole: 'questioner' | 'solver') => {
    setListRoleMode(newRole);
    if (generalUserConversations.length > 0) {
      const match = generalUserConversations.find((c: ChatConversation) => c.id === activeConversationId);
      if (!match) {
        setActiveConversationId(generalUserConversations[0].id);
      }
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeConversation) return;
    sendMessage(activeConversation.id, inputMessage.trim());
    setInputMessage('');
    setIsPlusMenuOpen(false);
  };

  // 處理上傳圖片 (Canvas 壓縮確保圖片 DataURL 輕量化)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 800;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedUrl = canvas.toDataURL('image/jpeg', 0.8);
            const sizeStr = `${Math.round(compressedUrl.length / 1024)} KB`;
            sendMessage(
              activeConversation.id,
              `【圖片分享】${file.name}（※ 聊天室照片儲存 7 日，逾期會無法開啟，請務必及時下載備份）`,
              undefined,
              {
                type: 'image',
                url: compressedUrl,
                name: file.name,
                size: sizeStr,
              }
            );
            return;
          }
        } catch {
          // Fallback if canvas compression fails
        }
        const sizeStr = `${Math.round(file.size / 1024)} KB`;
        sendMessage(
          activeConversation.id,
          `【圖片分享】${file.name}（※ 聊天室照片儲存 7 日，逾期會無法開啟，請務必及時下載備份）`,
          undefined,
          {
            type: 'image',
            url: rawUrl,
            name: file.name,
            size: sizeStr,
          }
        );
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
    setIsPlusMenuOpen(false);
    e.target.value = '';
  };

  // 處理上傳檔案 / 附件
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;

    const sizeStr = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    sendMessage(
      activeConversation.id,
      `【附件交付】${file.name}（${sizeStr}，※ 聊天室檔案儲存 7 日，逾期無法下載，請務必及時下載備份）`,
      undefined,
      {
        type: 'file',
        name: file.name,
        size: sizeStr,
      }
    );
    setIsPlusMenuOpen(false);
    e.target.value = '';
  };

  // 解答者發布客製報價/方案
  const handleSubmitOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerTitle.trim() || !activeConversation) return;
    if (offerTitle.trim().length < 10) return;
    if (offerDeliverables.trim().length < 30) return;

    const deliverablesList = offerDeliverables
      .split('\n')
      .map((d) => d.trim())
      .filter((d) => d.length > 0);

    sendMessage(
      activeConversation.id,
      `💼 我為您訂製了專屬方案：【${offerTitle.trim()}】\n報價：NT$ ${offerPrice.toLocaleString()} 元（交付時程：約 ${offerEstimatedDays} 天）`,
      {
        title: offerTitle.trim(),
        description: `【${offerCategory}】${deliverablesList.length > 0 ? deliverablesList[0] : '客製專屬諮詢與方案交付'}`,
        deliveryType: offerCategory,
        price: offerPrice,
        deliverables: deliverablesList.length > 0 ? deliverablesList : ['線上深度諮詢', '交付具體解決方案說明文件'],
        estimatedDays: offerEstimatedDays,
        paywalledContent: offerPaywalledContent.trim() || undefined,
      }
    );

    setIsOfferModalOpen(false);
    setOfferTitle('');
    setOfferDeliverables('');
    setOfferPaywalledContent('');
  };

  // 提問者發送詢價/客製委託需求
  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestRequirement.trim() || !activeConversation) return;
    if (requestRequirement.trim().length < 30) return;

    sendMessage(
      activeConversation.id,
      `📋 我發起了專案詢價委託：【${requestRequirement.trim().slice(0, 30)}...】\n預算上限：NT$ ${requestBudget.toLocaleString()} 元（期望交付時程：${requestTimeline}）`,
      {
        title: '客製專案委託與報價需求',
        description: requestRequirement.trim(),
        deliveryType: '提問委託詢價',
        price: requestBudget,
        deliverables: [`期望交付時程：${requestTimeline}`, `預算上限：NT$ ${requestBudget.toLocaleString()}`],
        estimatedDays: 3,
      }
    );

    setIsRequestModalOpen(false);
    setRequestRequirement('');
  };

  // 1. 開啟編輯 AI 和解調解方案 Modal
  const handleOpenEditMediation = (msg: ChatMessage) => {
    if (!msg.aiMediation) return;
    setEditingMediationMsg(msg);
    setEditSettlementAmount(msg.aiMediation.settlementAmount || 1200);
    setEditEstimatedDays(msg.aiMediation.estimatedDays || 3);
    setEditRecommendedAction(msg.aiMediation.recommendedAction || '');
    setEditModificationNotes('');
  };

  // 2. 提交修改後的 AI 和解調解方案 (發送新版本卡片於聊天室，高亮差異)
  const handleSubmitEditMediation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMediationMsg || !editingMediationMsg.aiMediation || !activeConversation) return;

    const oldMed = editingMediationMsg.aiMediation;
    const nextVer = (oldMed.version || 1) + 1;

    // 計算修改差異 (Diffs)
    const diffs: { label: string; oldVal: string; newVal: string }[] = [];
    if (oldMed.settlementAmount !== editSettlementAmount) {
      diffs.push({
        label: '和解點數/金額',
        oldVal: `NT$ ${(oldMed.settlementAmount || 1200).toLocaleString()}`,
        newVal: `NT$ ${editSettlementAmount.toLocaleString()}`,
      });
    }
    if (oldMed.estimatedDays !== editEstimatedDays) {
      diffs.push({
        label: '履約時間',
        oldVal: `${oldMed.estimatedDays || 3} 天`,
        newVal: `${editEstimatedDays} 天`,
      });
    }
    if (oldMed.recommendedAction.trim() !== editRecommendedAction.trim()) {
      diffs.push({
        label: '和解條款與交付要求',
        oldVal: oldMed.recommendedAction.slice(0, 30) + '...',
        newVal: editRecommendedAction.slice(0, 30) + '...',
      });
    }

    const isQuestioner = lockedConversationRole === 'questioner';

    const newMediationData = {
      ...oldMed,
      version: nextVer,
      settlementAmount: editSettlementAmount,
      previousSettlementAmount: oldMed.settlementAmount || 1200,
      estimatedDays: editEstimatedDays,
      previousEstimatedDays: oldMed.estimatedDays || 3,
      recommendedAction: editRecommendedAction.trim(),
      previousAction: oldMed.recommendedAction,
      lastModifiedByRole: lockedConversationRole,
      lastModifiedByName: currentUser.name,
      modificationNotes: editModificationNotes.trim() || '兩造條款與金額微調修訂',
      modifiedDiffs: diffs,
      agreedByBuyer: isQuestioner, // 修改者自動同意本修訂版
      agreedBySeller: !isQuestioner, // 修改者自動同意本修訂版
      status: 'negotiating' as const,
    };

    const newMsg: ChatMessage = {
      id: `msg-med-v${nextVer}-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      text: `【修訂和解協議條款 v${nextVer}】${currentUser.name} 更新了和解條款與金額。請對手方比對修訂點並進行確認同意。`,
      createdAt: new Date().toISOString(),
      aiMediation: newMediationData,
    };

    activeConversation.messages.push(newMsg);
    activeConversation.lastMessage = `修訂和解協議條款 v${nextVer}`;
    activeConversation.lastMessageTime = '剛剛';

    setEditingMediationMsg(null);
  };

  // 3. 雙方同意和解方案之觸發與二次確認
  const handleToggleMediationAgree = (msg: ChatMessage, clickRole: 'buyer' | 'seller') => {
    if (!activeConversation || !msg.aiMediation) return;

    const currentMed = msg.aiMediation;
    const isBuyer = clickRole === 'buyer';
    const isCurrentlyAgreed = isBuyer ? currentMed.agreedByBuyer : currentMed.agreedBySeller;

    // 若已經同意過，再次點擊為「撤銷簽署同意」
    if (isCurrentlyAgreed) {
      handleRevokeMediationAgree(msg, clickRole);
    } else {
      // 預設選取當前該角色選擇的方案（若無則選 optionA）
      const defaultOpt = isBuyer
        ? currentMed.selectedOptionByBuyer || 'optionA'
        : currentMed.selectedOptionBySeller || 'optionA';
      setConfirmModalChosenOption(defaultOpt);
      setMediationConfirmModal({
        isOpen: true,
        msg,
        role: clickRole,
      });
    }
  };

  // 4. 切換選擇之和解處置方案（方案 A vs 方案 B）
  const handleSelectMediationOption = (
    msg: ChatMessage,
    role: 'buyer' | 'seller',
    option: 'optionA' | 'optionB'
  ) => {
    if (!activeConversation || !msg.aiMediation) return;
    const currentMed = msg.aiMediation;
    if (role === 'buyer') {
      currentMed.selectedOptionByBuyer = option;
    } else {
      currentMed.selectedOptionBySeller = option;
    }

    // 若雙方均已簽署，切換到相同方案時立即觸發共識生效！
    if (currentMed.agreedByBuyer && currentMed.agreedBySeller) {
      executeMediationAgree(msg, role, option);
    } else {
      setConversations((prev) => [...prev]);
    }
  };

  // 執行簽署同意（由二次確認彈窗確認後呼叫）
  const executeMediationAgree = (
    msg: ChatMessage,
    clickRole: 'buyer' | 'seller',
    chosenOption: 'optionA' | 'optionB' = 'optionA'
  ) => {
    if (!activeConversation || !msg.aiMediation) return;

    const currentMed = msg.aiMediation;
    const isBuyerClick = clickRole === 'buyer';

    if (isBuyerClick) {
      currentMed.agreedByBuyer = true;
      currentMed.selectedOptionByBuyer = chosenOption;
    } else {
      currentMed.agreedBySeller = true;
      currentMed.selectedOptionBySeller = chosenOption;
    }

    const optA = currentMed.options?.optionA;
    const optB = currentMed.options?.optionB;
    const totalAmount = currentMed.settlementAmount || 2000;

    // 檢查雙方是否均同意簽署
    if (currentMed.agreedByBuyer && currentMed.agreedBySeller) {
      // 檢查雙方選擇的方案是否一致
      if (currentMed.selectedOptionByBuyer === currentMed.selectedOptionBySeller) {
        const agreed = currentMed.selectedOptionByBuyer || 'optionA';
        currentMed.agreedOption = agreed;

        if (agreed === 'optionA') {
          // 方案 A：按比例折讓退款與劃撥結案
          const payoutAmount = optA?.payoutAmount || Math.round(totalAmount * 0.7);
          const refundAmount = optA?.refundAmount || Math.round(totalAmount * 0.3);

          currentMed.settlementAmount = payoutAmount;
          currentMed.status = 'completed';
          currentMed.completedAt = new Date().toISOString();

          // 模擬劃撥與退款通知
          depositBalance(refundAmount);

          const settlementNotice: ChatMessage = {
            id: `msg-sys-settleA-${Date.now()}`,
            senderId: 'system',
            senderName: 'IdeaX 智慧和解中心',
            senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
            text: `【和解協議正式成立生效・方案 A 比例折讓結案】\n兩造已全數簽署同意採行【方案 A】！\n依客觀履約完成度（${currentMed.fulfillmentScore}%），託管款項 NT$ ${payoutAmount.toLocaleString()} 已劃撥發放予解答者（乙方），折讓退款 NT$ ${refundAmount.toLocaleString()} 已即刻無息退還提問者（甲方）帳戶。雙方後續交付與修改責任即刻終止，專案圓滿結案。`,
            createdAt: new Date().toISOString(),
          };

          activeConversation.messages.push(settlementNotice);
          activeConversation.lastMessage = `和解方案 A 成立：已劃撥 NT$ ${payoutAmount.toLocaleString()}，專案正式結案！`;
          activeConversation.lastMessageTime = '剛剛';
        } else {
          // 方案 B：限期補充交付與延長驗收天數
          const extendedDays = optB?.extendedDays || 3;
          currentMed.status = 'escrowed';
          currentMed.estimatedDays = extendedDays;
          currentMed.escrowedAt = new Date().toISOString();

          const remediationNotice: ChatMessage = {
            id: `msg-sys-settleB-${Date.now()}`,
            senderId: 'system',
            senderName: 'IdeaX 智慧和解中心',
            senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
            text: `【和解協議正式成立生效・方案 B 限期補正與延長驗收】\n兩造已全數簽署同意採行【方案 B】！\n解答者（乙方）承諾於 ${extendedDays} 個工作天內依建議書清單補齊交付成果；提問者（甲方）驗收期同步延長 ${extendedDays} 天。原託管點數將於驗收合格後全額劃撥。`,
            createdAt: new Date().toISOString(),
          };

          activeConversation.messages.push(remediationNotice);
          activeConversation.lastMessage = `和解方案 B 成立：進入 ${extendedDays} 天補正期，驗收期相應延長！`;
          activeConversation.lastMessageTime = '剛剛';
        }
      } else {
        // 雙方選擇之方案尚不一致
        const buyerOptName = currentMed.selectedOptionByBuyer === 'optionA' ? '方案 A (比例折讓)' : '方案 B (補正延長)';
        const solverOptName = currentMed.selectedOptionBySeller === 'optionA' ? '方案 A (比例折讓)' : '方案 B (補正延長)';

        const conflictNotice: ChatMessage = {
          id: `msg-sys-optconflict-${Date.now()}`,
          senderId: 'system',
          senderName: 'IdeaX 智慧和解中心',
          senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
          text: `【方案意向待對齊】提問者（甲方）簽署偏好【${buyerOptName}】，解答者（乙方）簽署偏好【${solverOptName}】。請雙方透過下方卡片對齊共識，任一方切換選擇相同方案時，系統將即刻生效執行！`,
          createdAt: new Date().toISOString(),
        };

        activeConversation.messages.push(conflictNotice);
      }
    } else {
      // 單方簽署同意通知
      const roleName = isBuyerClick ? '提問者（甲方）' : '解答者（乙方）';
      const optName = chosenOption === 'optionA' ? '【方案 A：按比例折讓結案】' : '【方案 B：限期補齊延長驗收】';
      const agreeNotice: ChatMessage = {
        id: `msg-sys-agree-${Date.now()}`,
        senderId: 'system',
        senderName: 'IdeaX 智慧和解中心',
        senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
        text: `${roleName}已簽署同意${optName}。在對手方簽署前可隨時切換方案或撤銷同意，雙方意向一致時系統將即刻生效執行。`,
        createdAt: new Date().toISOString(),
      };
      activeConversation.messages.push(agreeNotice);
    }

    setConversations((prev) => [...prev]);
  };

  // 撤銷簽署同意（在對方同意前可隨時撤銷）
  const handleRevokeMediationAgree = (msg: ChatMessage, clickRole: 'buyer' | 'seller') => {
    if (!activeConversation || !msg.aiMediation) return;

    const currentMed = msg.aiMediation;
    if (currentMed.status === 'escrowed' || currentMed.status === 'completed') return;

    const isBuyerClick = clickRole === 'buyer';
    if (isBuyerClick) {
      currentMed.agreedByBuyer = false;
    } else {
      currentMed.agreedBySeller = false;
    }

    const roleName = isBuyerClick ? '提問者（甲方）' : '解答者（乙方）';
    const revokeNotice: ChatMessage = {
      id: `msg-sys-revoke-${Date.now()}`,
      senderId: 'system',
      senderName: '智慧和解中心',
      senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
      text: `${roleName}已撤銷對第 v${currentMed.version || 1} 版和解協議書之簽署同意。`,
      createdAt: new Date().toISOString(),
    };

    activeConversation.messages.push(revokeNotice);
    setConversations((prev) => [...prev]);
  };

  // 4. 提問方在平台上點擊「確認完成交付與結案撥款」
  const handleConfirmMediationCompletion = (msg: ChatMessage) => {
    if (!activeConversation || !msg.aiMediation) return;

    const med = msg.aiMediation;
    const amount = med.settlementAmount || 1200;

    med.status = 'completed';
    med.completedAt = new Date().toISOString();

    const payoutNotice: ChatMessage = {
      id: `msg-sys-payout-${Date.now()}`,
      senderId: 'system',
      senderName: '✅ 創點子驗收劃撥中心',
      senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
      text: `✅【專案驗收完成與結案】提問者已點擊「確認完成交付」！託管點數 NT$ ${amount.toLocaleString()} 已正式劃撥給解答者，交易圓滿達成！`,
      createdAt: new Date().toISOString(),
    };

    activeConversation.messages.push(payoutNotice);
    activeConversation.lastMessage = `✅ 交易完成，託管點數 NT$ ${amount.toLocaleString()} 已撥付！`;
    activeConversation.lastMessageTime = '剛剛';

    setConversations((prev) => [...prev]);
  };

  // 執行平台點數託管簽約（目前暫時只支援扣點）
  const handleExecutePayment = () => {
    if (!paymentTargetMessage || !paymentTargetMessage.offer || !activeConversation) return;
    const price = paymentTargetMessage.offer.price;

    if ((currentUser.balance || 0) < price) {
      return;
    }

    setIsProcessingPayment(true);

    setTimeout(() => {
      // 呼叫 Context acceptChatOffer 完成點數扣除、拆款與解鎖
      const ok = acceptChatOffer(activeConversation.id, paymentTargetMessage.id);
      if (ok) {
        // 自動在聊天室生成簽約完成系統公告
        sendMessage(
          activeConversation.id,
          `🎉【簽約成功通知】提問者已完成扣抵 ${price.toLocaleString()} 點並由平台點數安全託管！專家即刻開始交付，專屬解鎖內容現已開放閱讀。`
        );
      }

      setIsProcessingPayment(false);
      setPaymentTargetMessage(null);
    }, 600);
  };

  // 預設方案模板
  const offerPresets = [
    { title: '1對1 深度諮詢（60分鐘）＋ 錄音/筆記摘要', price: 1500, days: 2, cat: '線上諮詢', desc: '1. 1對1 視訊或語音深度會談 60 分鐘\n2. 諮詢後提供關鍵架構重點筆記\n3. 7 天內提供後續追蹤答疑' },
    { title: '核心架構診斷與重構方針規劃書', price: 3000, days: 5, cat: '架構規劃', desc: '1. 系統/商業模式盲點深度診斷報告\n2. 具體重構與執行時程規劃 PDF\n3. 附贈可復用評估試算模組' },
    { title: '商業企劃案完整審閱與精修建議', price: 2500, days: 3, cat: '商業顧問', desc: '1. 商業計畫書（BP）全面逐頁審閱\n2. 投資人視角提問模擬與應對方針\n3. 財務預估模型修正建議' },
  ];

  // 若為訪客模式，在所有 Hook 執行完畢後再渲染攔截卡片，避免破壞 React Hook 呼叫順序
  if (currentUser.id === 'user-guest') {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center p-4 bg-stone-50">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200 shadow-xl text-center space-y-6 animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-stone-900">請先登入帳號</h2>
            <p className="text-sm text-stone-600 leading-relaxed">
              聊天室、私訊諮詢與通知功能包含個人隱私與專屬交易訊息。訪客模式請先登入或註冊 IdeaX 帳號後繼續使用。
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <button
              onClick={() => openAuthModal('login')}
              className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-stone-950 font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>立即登入 / 註冊</span>
            </button>
            <button
              onClick={() => {
                window.location.hash = '';
                const searchParams = new URLSearchParams(window.location.search);
                searchParams.delete('tab');
                window.history.pushState({}, '', window.location.pathname);
                window.location.reload();
              }}
              className="w-full py-3 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
            >
              返回探索問題首頁
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-2 sm:py-6">
      {/* Main Container */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs overflow-hidden flex flex-col md:flex-row min-h-[calc(100dvh-7.5rem)] sm:min-h-[700px] relative">
        {/* Left: Conversations Sidebar */}
        <div
          className={`border-r border-stone-200 flex flex-col bg-stone-50/60 transition-all duration-200 ${
            mobileView === 'list' ? 'flex w-full' : 'hidden md:flex'
          } ${
            isSidebarCollapsed ? 'md:w-20' : 'md:w-80 lg:w-96 shrink-0'
          }`}
        >
          {/* Sidebar Header: 列表身份切換器 */}
          <div className="p-3 sm:p-4 border-b border-stone-200 bg-white">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-extrabold text-sm sm:text-base text-stone-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-600 shrink-0" />
                {!isSidebarCollapsed && <span>聊天對話列表</span>}
              </h2>

              <div className="flex items-center gap-1.5">
                {/* AI-CRM button on Desktop & Mobile (僅針對非管理員展示，管理員移除一般用戶 AICRM 入口) */}
                {!isAdmin && (
                  <button
                    type="button"
                    onClick={onOpenAiCrm}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 text-stone-950 font-black text-xs shadow-2xs hover:from-amber-400 hover:to-yellow-300 transition-all cursor-pointer border border-amber-300 active:scale-95 shrink-0"
                    title="主動客戶關係管理系統 (AI-CRM)"
                  >
                    <Crown className="w-3.5 h-3.5 fill-stone-950 shrink-0" />
                    {!isSidebarCollapsed && <span>AI-CRM</span>}
                  </button>
                )}

                {/* Notifications / Admin Mail Icon Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (currentUser.role === 'admin') {
                      if (onOpenAdminMailDisputes) {
                        onOpenAdminMailDisputes();
                      } else {
                        setIsNotificationsSidebarOpen(true);
                      }
                    } else {
                      setIsNotificationsSidebarOpen(true);
                    }
                  }}
                  className="p-1.5 rounded-lg text-stone-500 hover:text-stone-850 hover:bg-stone-100 transition-colors cursor-pointer relative"
                  title={currentUser.role === 'admin' ? "開啟申訴與郵件管理" : "開啟通知中心"}
                >
                  {currentUser.role === 'admin' ? (
                    <Mail className="w-4 h-4 text-purple-700" />
                  ) : (
                    <Bell className="w-4 h-4 text-stone-600" />
                  )}
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white" />
                  )}
                </button>

                {/* Desktop Collapse / Expand toggle button */}
                <button
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="hidden md:flex p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                  title={isSidebarCollapsed ? '展開對話列表' : '收合對話列表至側欄'}
                >
                  {isSidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 身份切換選單 或 管理員分類標籤 */}
            {!isSidebarCollapsed ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  {isAdmin ? (
                    <div className="grid grid-cols-4 p-1 bg-stone-100 rounded-xl gap-1 w-full text-center">
                      <button
                        type="button"
                        onClick={() => setAdminChatTab('all')}
                        className={`py-1.5 px-0.5 rounded-lg text-[10.5px] font-bold transition-all flex items-center justify-center cursor-pointer ${
                          adminChatTab === 'all'
                            ? 'bg-white text-stone-950 shadow-xs ring-1 ring-stone-950/5 font-black'
                            : 'text-stone-500 hover:text-stone-900'
                        }`}
                      >
                        <span>全部 ({adminAllConversations.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminChatTab('general')}
                        className={`py-1.5 px-0.5 rounded-lg text-[10.5px] font-bold transition-all flex items-center justify-center cursor-pointer ${
                          adminChatTab === 'general'
                            ? 'bg-white text-stone-950 shadow-xs ring-1 ring-stone-950/5 font-black'
                            : 'text-stone-500 hover:text-stone-900'
                        }`}
                      >
                        <span>一般 ({adminGeneralConversations.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminChatTab('vendors')}
                        className={`py-1.5 px-0.5 rounded-lg text-[10.5px] font-bold transition-all flex items-center justify-center cursor-pointer ${
                          adminChatTab === 'vendors'
                            ? 'bg-white text-stone-950 shadow-xs ring-1 ring-stone-950/5 font-black'
                            : 'text-stone-500 hover:text-stone-900'
                        }`}
                      >
                        <span>企業 ({adminVendorConversations.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminChatTab('admins')}
                        className={`py-1.5 px-0.5 rounded-lg text-[10.5px] font-bold transition-all flex items-center justify-center cursor-pointer ${
                          adminChatTab === 'admins'
                            ? 'bg-white text-stone-950 shadow-xs ring-1 ring-stone-950/5 font-black'
                            : 'text-stone-500 hover:text-stone-900'
                        }`}
                      >
                        <span>團隊 ({adminAdminsConversations.length})</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-2 py-1 bg-stone-100/70 rounded-xl w-full">
                      <span className="text-xs font-black text-stone-800">全部對話 ({generalUserConversations.length})</span>
                      <span className="text-[10px] text-stone-500 font-medium">即時端到端傳訊</span>
                    </div>
                  )}
                </div>

                {/* 建立群組按鈕（廠商、管理員、用戶皆可建立群組拉人） */}
                <button
                  type="button"
                  onClick={() => setIsCreateGroupModalOpen(true)}
                  className="w-full py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-700" />
                  <span>建立多方協作群組</span>
                </button>

                {/* Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜尋對話、群組或訊息..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 text-xs focus:bg-white focus:border-amber-500 outline-none transition-colors"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="p-2 rounded-lg text-xs font-bold cursor-pointer text-stone-500 hover:bg-stone-100"
                  title={`展開對話列表 (${currentConversationsToDisplay.length})`}
                >
                  <MessageSquare className="w-4 h-4 text-amber-600" />
                </button>
              </div>
            )}
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400">
                {isAdmin ? '此分類目前尚無對話紀錄' : '目前尚無對話紀錄'}
              </div>
            ) : (
              filteredConversations.map((conv, idx) => {
                const other = conv.isGroup
                  ? {
                      name: conv.groupName || '協作群組',
                      avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80',
                      title: `群組・${conv.participantDetails?.length || 2} 位成員`,
                    }
                  : getOtherParticipant(conv) || {
                      name: '諮詢對象',
                      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
                      title: '',
                    };
                const isSelected = conv.id === activeConversation?.id;
                const isConvQuestioner = (conv.conversationRole || 'questioner') === 'questioner';

                return (
                  <button
                    key={conv.id}
                    id={idx === 0 ? 'chat-conversation-item-0' : undefined}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`w-full p-3.5 sm:p-4 text-left transition-colors flex items-start gap-3 cursor-pointer ${
                      isSelected ? 'bg-amber-50/90 border-l-4 border-amber-500' : 'hover:bg-stone-100/80'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={other.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        alt={other.name}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover ring-1 ring-stone-200"
                      />
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <h4 className="text-xs font-bold text-stone-900 truncate">{other.name}</h4>
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-semibold shrink-0 ${
                              isConvQuestioner
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-blue-100 text-blue-900'
                            }`}
                          >
                            {isConvQuestioner ? '提問' : '專家'}
                          </span>
                        </div>
                        <span className="text-[10px] text-stone-400 font-mono shrink-0">
                          {(() => {
                            // 聊天清單時間：今天顯示時刻，其他日子顯示日期；舊資料的文字（如「剛剛」）照原樣
                            const raw = conv.lastMessageTime || conv.messages?.[conv.messages.length - 1]?.createdAt || '';
                            const t = Date.parse(raw);
                            if (!raw) return '';
                            if (Number.isNaN(t)) return raw;
                            const d = new Date(t);
                            return d.toDateString() === new Date().toDateString()
                              ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : `${d.getMonth() + 1}/${d.getDate()}`;
                          })()}
                        </span>
                      </div>

                      {other.title && (
                        <p className="text-[10px] text-stone-500 truncate mt-0.5">{other.title}</p>
                      )}

                      {conv.relatedQuestionTitle && (
                        <div className="text-[10px] text-amber-700 bg-amber-50/80 px-1.5 py-0.5 rounded truncate mt-1 border border-amber-200/60 font-medium">
                          {conv.relatedQuestionTitle}
                        </div>
                      )}

                      <p className="text-xs text-stone-600 truncate mt-1">{conv.lastMessage || '已建立對話'}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Chat Room */}
        <div
          className={`flex-1 flex flex-col bg-white overflow-hidden ${
            mobileView === 'chat' ? 'flex' : 'hidden md:flex'
          }`}
        >
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-3 sm:p-4 border-b border-stone-200 bg-white flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  {/* Mobile Back to List Button */}
                  <button
                    onClick={() => setMobileView('list')}
                    className="md:hidden p-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 flex items-center gap-1 text-xs font-bold cursor-pointer shrink-0"
                    title="返回列表"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-[11px]">列表</span>
                  </button>

                  <img
                    src={otherParticipant?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt={otherParticipant?.name || '夥伴'}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-1 ring-stone-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <h3 className="font-bold text-xs sm:text-sm text-stone-900 truncate">{otherParticipant?.name || '諮詢夥伴'}</h3>

                      {lockedConversationRole === 'questioner' && otherParticipant?.title && (
                        <span className="text-[10px] font-semibold text-stone-600 px-1.5 py-0.5 rounded bg-stone-100 truncate max-w-[120px] sm:max-w-none">
                          {otherParticipant.title}
                        </span>
                      )}

                      <span
                        className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          lockedConversationRole === 'questioner'
                            ? 'bg-amber-100 text-amber-950 border border-amber-300'
                            : 'bg-blue-100 text-blue-950 border border-blue-300'
                        }`}
                      >
                        {lockedConversationRole === 'questioner' ? '提問者' : '解答者'}
                      </span>
                    </div>

                    {activeConversation.relatedQuestionTitle && (
                      <p className="text-[10px] sm:text-[11px] text-amber-800 truncate mt-0.5 font-medium">
                        關聯：{activeConversation.relatedQuestionTitle}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Header Action */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* 管理員身分：僅提供官方罐頭訊息，不提供方案或詢價功能 (手機版右上角不展示，保留畫面簡潔) */}
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => setIsCannedMessagesModalOpen(true)}
                      className="hidden sm:flex px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-black text-xs shadow-2xs items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                      title="發送官方快捷罐頭訊息"
                    >
                      <MessageSquareQuote className="w-3.5 h-3.5 text-amber-300" />
                      <span>罐頭訊息</span>
                    </button>
                  ) : lockedConversationRole === 'solver' ? (
                    <button
                      onClick={() => setIsOfferModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>發起報價</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsRequestModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-400 font-bold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>發起詢價</span>
                    </button>
                  )}

                  {/* 聊天室新手教學重啟按鈕 */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsPlusMenuOpen(true);
                      setIsChatOnboardingOpen(true);
                    }}
                    className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-stone-200 hover:border-amber-400 bg-white hover:bg-amber-50 text-stone-600 hover:text-stone-900 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                    title="開啟聊天室功能使用教學"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span className="hidden sm:inline text-[11px]">功能教學</span>
                  </button>
                </div>
              </div>

              {/* Messages Flow */}
              <div className="flex-1 p-3 sm:p-6 overflow-y-auto space-y-4 bg-stone-50/50">
                {activeConversation.messages.map((msg) => {
                  const isMe = msg.senderId === currentUser.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 sm:gap-3 max-w-2xl ${isMe ? 'ml-auto flex-row-reverse' : ''}`}
                    >
                      <img
                        src={resolveLiveAvatar(msg.senderId, msg.senderAvatar) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        alt={msg.senderName}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-1 ring-stone-200 shrink-0 self-end"
                      />

                      <div className={`space-y-1.5 max-w-[85%] sm:max-w-md ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`flex items-center gap-2 text-[10px] text-stone-400 ${isMe ? 'justify-end' : ''}`}>
                          <span className="font-semibold flex items-center gap-1">
                            <span className={getUserNameColorClass(msg.senderId, availableUsers)}>
                              {resolveUserDisplayName(msg.senderId, msg.senderName, availableUsers)}
                            </span>
                            {(msg.isAiAssistant || msg.senderName.includes('AI軍師') || msg.senderName.includes('AI 軍師') || msg.senderName.includes('AI特助') || msg.senderName.includes('AI 特助')) && (
                              <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[9px] flex items-center gap-0.5 shadow-2xs">
                                <Bot className="w-2.5 h-2.5 text-amber-700" />
                                <span>24hr AI軍師代答</span>
                              </span>
                            )}
                          </span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        {/* Text Message Bubble */}
                        {msg.text && (
                          <div
                            className={`p-3 sm:p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-2xs ${
                              isMe
                                ? 'bg-amber-500 text-stone-950 font-medium rounded-br-xs'
                                : (msg.isAiAssistant || msg.senderName.includes('AI軍師') || msg.senderName.includes('AI 軍師') || msg.senderName.includes('AI特助') || msg.senderName.includes('AI 特助'))
                                ? 'bg-gradient-to-br from-amber-50/90 via-orange-50/60 to-amber-100/70 border-2 border-amber-300/80 text-stone-900 rounded-bl-xs shadow-xs'
                                : 'bg-white border border-stone-200 text-stone-900 rounded-bl-xs'
                            }`}
                          >
                            {msg.text}
                          </div>
                        )}

                        {/* Image Attachment inside chat (儲存 7 日，逾期無法開啟) */}
                        {msg.attachment?.type === 'image' && (() => {
                          const msgTimestamp = new Date(msg.createdAt).getTime();
                          const now = Date.now();
                          const diffMs = !isNaN(msgTimestamp) ? now - msgTimestamp : 0;
                          const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
                          const isExpired = diffMs > SEVEN_DAYS_MS;
                          const remainingDays = Math.max(1, Math.ceil((SEVEN_DAYS_MS - diffMs) / (24 * 60 * 60 * 1000)));

                          if (isExpired) {
                            return (
                              <div className="p-3.5 bg-stone-100 rounded-2xl border border-stone-300 text-stone-600 max-w-sm space-y-1.5 shadow-2xs">
                                <div className="flex items-center gap-1.5 text-stone-800 font-bold text-xs">
                                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                  <span>照片已逾期無法開啟（超過 7 日）</span>
                                </div>
                                <p className="text-[11px] text-stone-500 leading-relaxed font-normal">
                                  ⚠️ 聊天室內照片儲存期限為 7 日，此照片已逾期，系統已自動清除無法開啟檢視。為確保資料不遺失，重要檔案請及時備份或使用 Google Drive、Dropbox 等外部雲端共享連結。
                                </p>
                                <div className="text-[10px] text-stone-400 font-mono truncate pt-1 border-t border-stone-200">
                                  原檔名：{msg.attachment.name}
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div className="p-1 bg-white rounded-2xl border border-stone-200 shadow-2xs max-w-sm space-y-1">
                              {/* 7日逾期標示警示條 */}
                              <div className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-[10px] text-amber-900 font-bold flex items-center justify-between gap-1">
                                <span className="flex items-center gap-1 truncate">
                                  <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>照片儲存 7 日・逾期無法開啟</span>
                                </span>
                                <span className="text-amber-700 font-mono shrink-0">
                                  剩餘 {remainingDays} 天
                                </span>
                              </div>

                              <div className="relative group overflow-hidden rounded-xl">
                                {msg.attachment.url ? (
                                  <img
                                    src={msg.attachment.url}
                                    alt={msg.attachment.name}
                                    className="w-full h-auto object-cover max-h-64"
                                  />
                                ) : (
                                  <div className="p-4 text-xs text-stone-400 bg-stone-100 text-center">圖片網址無效</div>
                                )}
                                {msg.attachment.url && (
                                  <a
                                    href={msg.attachment.url}
                                    download={msg.attachment.name}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-stone-900/80 hover:bg-stone-900 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs shadow-md transition-all cursor-pointer opacity-90 group-hover:opacity-100"
                                    title="下載保存照片（避免逾期無法開啟）"
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>下載備份</span>
                                  </a>
                                )}
                              </div>

                              <div className="p-1.5 flex items-center justify-between text-[10px] text-stone-500 font-mono">
                                <span className="truncate">{msg.attachment.name}</span>
                                {msg.attachment.size && <span>{msg.attachment.size}</span>}
                              </div>
                            </div>
                          );
                        })()}

                        {/* File Attachment Card inside chat (儲存 7 日，逾期無法開啟) */}
                        {msg.attachment?.type === 'file' && (() => {
                          const msgTimestamp = new Date(msg.createdAt).getTime();
                          const now = Date.now();
                          const diffMs = !isNaN(msgTimestamp) ? now - msgTimestamp : 0;
                          const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
                          const isExpired = diffMs > SEVEN_DAYS_MS;
                          const remainingDays = Math.max(1, Math.ceil((SEVEN_DAYS_MS - diffMs) / (24 * 60 * 60 * 1000)));

                          if (isExpired) {
                            return (
                              <div className="p-3.5 bg-stone-100 rounded-2xl border border-stone-300 text-stone-600 max-w-sm space-y-1.5 shadow-2xs">
                                <div className="flex items-center gap-1.5 text-stone-800 font-bold text-xs">
                                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                  <span>檔案已逾期無法下載（超過 7 日）</span>
                                </div>
                                <p className="text-[11px] text-stone-500 leading-relaxed font-normal">
                                  ⚠️ 聊天室內檔案儲存期限為 7 日，此檔案已逾期，系統已自動清除無法開啟下載。重要專案檔案請及時備份或善用 Google Drive、Dropbox、Figma 等外部雲端工具之共享連結。
                                </p>
                                <div className="text-[10px] text-stone-400 font-mono truncate pt-1 border-t border-stone-200">
                                  原檔名：{msg.attachment.name}
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div className="p-3 bg-white rounded-2xl border border-stone-200 shadow-2xs max-w-sm space-y-2">
                              {/* 7日逾期標示警示條 */}
                              <div className="px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-[10px] text-amber-900 font-bold flex items-center justify-between gap-1">
                                <span className="flex items-center gap-1 truncate">
                                  <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>檔案儲存 7 日・逾期無法下載</span>
                                </span>
                                <span className="text-amber-700 font-mono shrink-0">
                                  剩餘 {remainingDays} 天
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-2.5">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                                    <Paperclip className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-xs text-stone-900 truncate">{msg.attachment.name}</p>
                                    <span className="text-[10px] text-stone-400 font-mono">{msg.attachment.size || '文件附件'}</span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    alert(`即將下載檔案「${msg.attachment?.name}」。提醒：聊天室檔案僅保存 7 日，請妥善留存本機備份！`);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 active:scale-95 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs shrink-0 cursor-pointer"
                                  title="下載此檔案（避免逾期無法開啟）"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>下載備份</span>
                                </button>
                              </div>
                            </div>
                          );
                        })()}

                        {/* AI Dispute Mediation Formal Contract Card inside chat */}
                        {msg.aiMediation && (
                          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-xs text-stone-900 space-y-3.5 w-full">
                            {/* Contract Header */}
                            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-800 border border-stone-200 flex items-center justify-center font-bold shrink-0">
                                  <Scale className="w-4 h-4 text-stone-700" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-extrabold text-sm sm:text-base text-stone-900 tracking-tight">
                                      《履約偏差與和解建議書》
                                    </h4>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-mono border border-stone-200">
                                      正式版 v{msg.aiMediation.version || 1}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-stone-500 mt-0.5">
                                    大摩客觀三方比對法理驗證（原始需求目標 vs 專家交付內容 vs 雙方通訊記錄）
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Section 1: Settlement Amount & Timeline Banner */}
                            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs font-mono">
                              <div>
                                <span className="text-[10px] text-stone-500 block font-sans font-bold">和解金額（點數）：</span>
                                <span className="text-base sm:text-lg font-black text-stone-900">
                                  NT$ {(msg.aiMediation.settlementAmount || 1200).toLocaleString()}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-stone-500 block font-sans font-bold">履約完成期限：</span>
                                <span className="text-xs font-bold text-stone-800">
                                  協議生效後 {msg.aiMediation.estimatedDays || 3} 天內
                                </span>
                              </div>
                            </div>

                            {/* Section: Three-Way Discrepancy Matrix (大摩三方客觀比對與偏差驗證) */}
                            {msg.aiMediation.threeWayDiscrepancies && msg.aiMediation.threeWayDiscrepancies.length > 0 && (
                              <div className="p-3.5 bg-stone-50/90 rounded-xl border border-stone-200 text-xs space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-stone-900 flex items-center gap-1.5">
                                    <Scale className="w-3.5 h-3.5 text-stone-700" />
                                    <span>【大摩三方客觀比對與偏差驗證矩陣】</span>
                                  </span>
                                  <span className="text-[10px] text-stone-500">原始約定 vs 實質交付 vs 通訊記錄</span>
                                </div>

                                <div className="space-y-2">
                                  {msg.aiMediation.threeWayDiscrepancies.map((item, idx) => (
                                    <div key={idx} className="p-3 bg-white rounded-xl border border-stone-200 space-y-1.5 text-[11px] shadow-2xs">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-bold text-stone-900 text-xs">項次 {idx + 1}</span>
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            item.status === 'fulfilled'
                                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                              : item.status === 'discrepancy'
                                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                              : 'bg-amber-100 text-amber-900 border border-amber-200'
                                          }`}
                                        >
                                          {item.status === 'fulfilled'
                                            ? '✅ 實質達標'
                                            : item.status === 'discrepancy'
                                            ? '⚠️ 實質偏差（未符標準）'
                                            : '🛡️ 需求追加（專家免除違約）'}
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-stone-700">
                                        <div className="p-2 rounded-lg bg-stone-50 border border-stone-100 space-y-0.5">
                                          <span className="text-[10px] font-bold text-stone-500 block">🎯 原始需求目標：</span>
                                          <p className="leading-snug">{item.targetGoal}</p>
                                        </div>
                                        <div className="p-2 rounded-lg bg-stone-50 border border-stone-100 space-y-0.5">
                                          <span className="text-[10px] font-bold text-stone-500 block">📦 專家實際交付：</span>
                                          <p className="leading-snug">{item.actualDelivery}</p>
                                        </div>
                                        <div className="p-2 rounded-lg bg-stone-50 border border-stone-100 space-y-0.5">
                                          <span className="text-[10px] font-bold text-stone-500 block">💬 通訊記錄佐證：</span>
                                          <p className="leading-snug">{item.communicationLog}</p>
                                        </div>
                                      </div>

                                      {item.notes && (
                                        <div className="text-[10px] text-stone-500 pt-0.5 italic">
                                          法理裁定依據：{item.notes}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Responsibility Breakdown if available */}
                            {msg.aiMediation.responsibilityBreakdown && (
                              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1.5">
                                <div className="flex items-center justify-between text-[11px] font-bold text-stone-800">
                                  <span>【法理責任比重評估】：</span>
                                  <span>
                                    解答者 {msg.aiMediation.responsibilityBreakdown.solverWeight}% / 提問者 {msg.aiMediation.responsibilityBreakdown.buyerWeight}%
                                  </span>
                                </div>
                                <div className="w-full bg-stone-200 rounded-full h-2 flex overflow-hidden">
                                  <div
                                    className="bg-stone-700 h-2"
                                    style={{ width: `${msg.aiMediation.responsibilityBreakdown.solverWeight}%` }}
                                    title={`解答者責任 ${msg.aiMediation.responsibilityBreakdown.solverWeight}%`}
                                  />
                                  <div
                                    className="bg-amber-400 h-2"
                                    style={{ width: `${msg.aiMediation.responsibilityBreakdown.buyerWeight}%` }}
                                    title={`提問者追加/延遲責任 ${msg.aiMediation.responsibilityBreakdown.buyerWeight}%`}
                                  />
                                </div>
                                <p className="text-[10px] text-stone-600 leading-relaxed">
                                  {msg.aiMediation.responsibilityBreakdown.platformAssessment}
                                </p>
                              </div>
                            )}

                            {/* Dual Settlement Options (方案 A vs 方案 B) */}
                            {msg.aiMediation.options && (
                              <div className="space-y-2 pt-1">
                                <span className="font-bold text-xs text-stone-900 block">
                                  【雙軌客觀和解方案選擇（雙方簽署時之法理憑據）】：
                                </span>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                  {/* Option A */}
                                  <div
                                    onClick={() => {
                                      const role = lockedConversationRole === 'questioner' ? 'buyer' : 'seller';
                                      handleSelectMediationOption(msg, role, 'optionA');
                                    }}
                                    className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 relative ${
                                      (lockedConversationRole === 'questioner'
                                        ? msg.aiMediation.selectedOptionByBuyer === 'optionA'
                                        : msg.aiMediation.selectedOptionBySeller === 'optionA')
                                        ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-300'
                                        : 'border-stone-200 bg-white hover:border-stone-300'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-stone-900">
                                        {msg.aiMediation.options.optionA.title}
                                      </span>
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                                        按比例折讓
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-stone-600 leading-relaxed">
                                      {msg.aiMediation.options.optionA.description}
                                    </p>
                                    <div className="text-[10px] font-mono text-stone-500 pt-1 border-t border-stone-100 flex justify-between">
                                      <span>劃撥解答者：NT$ {msg.aiMediation.options.optionA.payoutAmount.toLocaleString()}</span>
                                      <span>退還提問者：NT$ {msg.aiMediation.options.optionA.refundAmount.toLocaleString()}</span>
                                    </div>
                                  </div>

                                  {/* Option B */}
                                  <div
                                    onClick={() => {
                                      const role = lockedConversationRole === 'questioner' ? 'buyer' : 'seller';
                                      handleSelectMediationOption(msg, role, 'optionB');
                                    }}
                                    className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 relative ${
                                      (lockedConversationRole === 'questioner'
                                        ? msg.aiMediation.selectedOptionByBuyer === 'optionB'
                                        : msg.aiMediation.selectedOptionBySeller === 'optionB')
                                        ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-300'
                                        : 'border-stone-200 bg-white hover:border-stone-300'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-stone-900">
                                        {msg.aiMediation.options.optionB.title}
                                      </span>
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-900">
                                        限期補正
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-stone-600 leading-relaxed">
                                      {msg.aiMediation.options.optionB.description}
                                    </p>
                                    <div className="text-[10px] font-mono text-stone-500 pt-1 border-t border-stone-100 flex justify-between">
                                      <span>延長驗收：{msg.aiMediation.options.optionB.extendedDays || 3} 個工作天</span>
                                      <span>驗收後全額：NT$ {msg.aiMediation.options.optionB.payoutAmount.toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Modification Diffs Log if edited */}
                            {msg.aiMediation.modificationNotes && (
                              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5 text-xs text-stone-700">
                                <div className="flex items-center justify-between font-bold text-[11px] text-stone-800">
                                  <span>條款修訂紀錄（由 {msg.aiMediation.lastModifiedByName || '對方'} 修改）：</span>
                                  <span className="text-[10px] text-stone-400 font-mono">第 v{msg.aiMediation.version} 版修訂</span>
                                </div>
                                <p className="text-stone-600 text-[11px] leading-relaxed">{msg.aiMediation.modificationNotes}</p>
                                {msg.aiMediation.modifiedDiffs && msg.aiMediation.modifiedDiffs.length > 0 && (
                                  <div className="pt-1.5 space-y-1 border-t border-stone-200 text-[10px]">
                                    <span className="font-bold text-stone-800 block">修訂對照變更點：</span>
                                    {msg.aiMediation.modifiedDiffs.map((diff, i) => (
                                      <div key={i} className="text-stone-700 flex items-center gap-1.5 font-mono">
                                        <span className="text-stone-900 font-bold">• {diff.label}：</span>
                                        <span className="line-through text-stone-400">{diff.oldVal}</span>
                                        <span className="text-stone-900 font-bold"> 調整為 {diff.newVal}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Section 2: Mediator Legal Opinion */}
                            <div className="p-3.5 bg-stone-50/70 rounded-xl border border-stone-200 text-xs leading-relaxed text-stone-800">
                              <span className="text-stone-900 font-bold block mb-1">【第一條 爭議分析與專家意見】</span>
                              {msg.aiMediation.mediatorOpinion}
                            </div>

                            {/* Section 3: Fulfilled vs Unfulfilled */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                              <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                                <span className="font-bold text-stone-900 block">已履行交件項目：</span>
                                {msg.aiMediation.fulfilledPoints.map((pt, i) => (
                                  <div key={i} className="text-stone-700">• {pt}</div>
                                ))}
                              </div>
                              <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                                <span className="font-bold text-stone-900 block">待補齊與爭議落差點：</span>
                                {msg.aiMediation.unfulfilledPoints.map((pt, i) => (
                                  <div key={i} className="text-stone-700">• {pt}</div>
                                ))}
                              </div>
                            </div>

                            {/* Section 4: Recommended Settlement Clauses with Deletion/Addition Comparison */}
                            <div className="p-3.5 bg-stone-50/80 border border-stone-200 rounded-xl text-xs text-stone-800 space-y-2">
                              <span className="font-bold text-stone-900 block">【第二條 建議和解契約條款】</span>
                              
                              {/* If modified, show explicit clause deletion vs addition breakdown */}
                              {msg.aiMediation.previousAction && msg.aiMediation.previousAction.trim() !== msg.aiMediation.recommendedAction.trim() ? (
                                <div className="space-y-2 font-mono text-[11px] pt-1">
                                  <div className="p-2.5 rounded-lg bg-stone-100 border border-stone-200 text-stone-500 leading-relaxed">
                                    <span className="text-stone-700 font-bold block mb-1">修訂前舊版條款（已被刪除/替代）：</span>
                                    <span className="line-through opacity-80 block whitespace-pre-wrap">{msg.aiMediation.previousAction}</span>
                                  </div>

                                  <div className="p-2.5 rounded-lg bg-white border border-stone-300 text-stone-900 leading-relaxed shadow-2xs">
                                    <span className="text-stone-900 font-bold block mb-1">修訂後最新條款（新增與更新）：</span>
                                    <span className="font-medium block whitespace-pre-wrap">{msg.aiMediation.recommendedAction}</span>
                                  </div>
                                </div>
                              ) : (
                                <p className="leading-relaxed whitespace-pre-wrap text-stone-800">{msg.aiMediation.recommendedAction}</p>
                              )}
                            </div>

                            {/* Section 5: Signature Status & Action Buttons */}
                            <div className="pt-2 border-t border-stone-100 space-y-2.5">
                              {/* Contract Download & Preview Buttons when agreement is formed */}
                              {(msg.aiMediation.status === 'escrowed' || msg.aiMediation.status === 'completed' || (msg.aiMediation.agreedByBuyer && msg.aiMediation.agreedBySeller)) && (
                                <div className="p-3 bg-purple-50/80 rounded-xl border border-purple-200 space-y-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-extrabold text-purple-950 flex items-center gap-1.5">
                                      <Scale className="w-3.5 h-3.5 text-purple-700" />
                                      <span>調解和解協議已依法成立</span>
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-200/70 text-purple-900">
                                      具法定民事和解效力
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const buyerUser = activeConversation?.participantDetails[0] || { id: 'buyer', name: '提問者（甲方）' };
                                        const sellerUser = activeConversation?.participantDetails[1] || { id: 'seller', name: '解答者（乙方）' };
                                        const cData = buildContractFromMediation(
                                          msg.aiMediation!,
                                          buyerUser,
                                          sellerUser,
                                          activeConversation?.relatedQuestionTitle,
                                          msg.createdAt
                                        );
                                        setPreviewContract(cData);
                                      }}
                                      className="py-2 px-3 rounded-xl bg-white hover:bg-stone-50 border border-purple-300 text-purple-950 font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:border-purple-400"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-purple-700" />
                                      <span>檢視和解協議書</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const buyerUser = activeConversation?.participantDetails[0] || { id: 'buyer', name: '提問者（甲方）' };
                                        const sellerUser = activeConversation?.participantDetails[1] || { id: 'seller', name: '解答者（乙方）' };
                                        const cData = buildContractFromMediation(
                                          msg.aiMediation!,
                                          buyerUser,
                                          sellerUser,
                                          activeConversation?.relatedQuestionTitle,
                                          msg.createdAt
                                        );
                                        downloadContractFile(cData);
                                      }}
                                      className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                      <Download className="w-3.5 h-3.5 text-stone-950" />
                                      <span>下載商業契約檔案</span>
                                    </button>
                                  </div>
                                </div>
                              )}

                              {msg.aiMediation.status === 'completed' ? (
                                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-800 space-y-1 text-center font-bold">
                                  <div className="flex items-center justify-center gap-1.5 text-stone-900 text-sm">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span>協議履約完成・點數已撥付結案</span>
                                  </div>
                                  <p className="text-[10px] text-stone-500 font-mono">
                                    提問方（甲方）已點擊確認完成交付，劃撥金額 NT$ {(msg.aiMediation.settlementAmount || 1200).toLocaleString()} 已撥入解答者（乙方）帳戶。
                                  </p>
                                </div>
                              ) : msg.aiMediation.status === 'escrowed' ? (
                                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-800 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 font-bold text-stone-900">
                                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                      <span>協議生效・點數已全額扣除並進入獨立託管</span>
                                    </div>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-200 text-stone-700">
                                      履約期限：{msg.aiMediation.estimatedDays || 3} 天
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-stone-600 leading-relaxed">
                                    請解答者（乙方）依修訂後之和解條款完成補齊交付。交付完畢後由提問者（甲方）點擊下方按鈕驗收結案。
                                  </p>

                                  {/* Buyer confirmation button */}
                                  {lockedConversationRole === 'questioner' ? (
                                    <button
                                      type="button"
                                      onClick={() => handleConfirmMediationCompletion(msg)}
                                      className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
                                    >
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                      <span>確認完成交付驗收與劃撥結案 (NT$ {(msg.aiMediation.settlementAmount || 1200).toLocaleString()})</span>
                                    </button>
                                  ) : (
                                    <div className="p-2.5 rounded-xl bg-stone-100 text-center text-[11px] text-stone-600 font-semibold flex items-center justify-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-stone-500" />
                                      <span>等待提問者（甲方）在平台上點擊「確認完成交付」以劃撥點數</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                /* Negotiating State */
                                <div className="space-y-2.5">
                                  {/* Agreement Sign Status Bar */}
                                  <div className="flex items-center justify-between text-xs bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`w-2.5 h-2.5 rounded-full ${msg.aiMediation.agreedByBuyer ? 'bg-emerald-500' : 'bg-stone-300'}`} />
                                      <span className="text-stone-700 font-medium">
                                        提問者（甲方）：<strong className={msg.aiMediation.agreedByBuyer ? 'text-stone-900 font-bold' : 'text-stone-400'}>
                                          {msg.aiMediation.agreedByBuyer ? '已簽署同意' : '尚未簽署'}
                                        </strong>
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className={`w-2.5 h-2.5 rounded-full ${msg.aiMediation.agreedBySeller ? 'bg-emerald-500' : 'bg-stone-300'}`} />
                                      <span className="text-stone-700 font-medium">
                                        解答者（乙方）：<strong className={msg.aiMediation.agreedBySeller ? 'text-stone-900 font-bold' : 'text-stone-400'}>
                                          {msg.aiMediation.agreedBySeller ? '已簽署同意' : '尚未簽署'}
                                        </strong>
                                      </span>
                                    </div>
                                  </div>

                                  {/* STRICT ROLE ACTION BUTTONS */}
                                  <div className="flex items-center gap-2 pt-1">
                                    {/* Edit button available to both */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditMediation(msg)}
                                      className="py-2.5 px-3.5 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0"
                                    >
                                      <span>編輯條款</span>
                                    </button>

                                    {/* Questioner sees ONLY Questioner Agree button or Revoke button */}
                                    {lockedConversationRole === 'questioner' && (
                                      msg.aiMediation.agreedByBuyer ? (
                                        <div className="flex-1 flex items-center gap-1.5">
                                          <div className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-stone-100 border border-stone-300 text-stone-800 flex items-center justify-center gap-1.5">
                                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                            <span>甲方已簽署同意（等待乙方）</span>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleRevokeMediationAgree(msg, 'buyer')}
                                            className="py-2 px-3 rounded-xl text-xs font-bold bg-white hover:bg-stone-100 text-stone-600 border border-stone-300 transition-colors cursor-pointer shrink-0"
                                          >
                                            <span>撤銷同意</span>
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleToggleMediationAgree(msg, 'buyer')}
                                          className="flex-1 py-2.5 px-4 rounded-xl text-xs font-black bg-stone-900 hover:bg-stone-800 text-white transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                                        >
                                          <span>提問者（甲方）同意簽署本協議</span>
                                        </button>
                                      )
                                    )}

                                    {/* Solver sees ONLY Solver Agree button or Revoke button */}
                                    {lockedConversationRole === 'solver' && (
                                      msg.aiMediation.agreedBySeller ? (
                                        <div className="flex-1 flex items-center gap-1.5">
                                          <div className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-stone-100 border border-stone-300 text-stone-800 flex items-center justify-center gap-1.5">
                                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                            <span>乙方已簽署同意（等待甲方）</span>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleRevokeMediationAgree(msg, 'seller')}
                                            className="py-2 px-3 rounded-xl text-xs font-bold bg-white hover:bg-stone-100 text-stone-600 border border-stone-300 transition-colors cursor-pointer shrink-0"
                                          >
                                            <span>撤銷同意</span>
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleToggleMediationAgree(msg, 'seller')}
                                          className="flex-1 py-2.5 px-4 rounded-xl text-xs font-black bg-stone-900 hover:bg-stone-800 text-white transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                                        >
                                          <span>解答者（乙方）同意簽署本協議</span>
                                        </button>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {/* 用戶名片 (User Card) 捷徑卡片渲染 */}
                        {msg.userCard && (
                          <div className="p-4 rounded-2xl bg-gradient-to-br from-stone-900 via-stone-850 to-stone-950 text-white border-2 border-amber-400/90 shadow-xl space-y-3.5 w-full max-w-md">
                            <div className="flex items-start justify-between gap-3 border-b border-stone-700/80 pb-3">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <img
                                    src={msg.userCard.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                                    alt={msg.userCard.name}
                                    className="w-12 h-12 rounded-xl object-cover ring-2 ring-amber-400/80 shadow-md"
                                  />
                                  {msg.userCard.isVerified && (
                                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] ring-2 ring-stone-900 font-bold" title="官方實名認證">
                                      ✓
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-black text-base text-white">{msg.userCard.name}</h4>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold">
                                      ID: {msg.userCard.id}
                                    </span>
                                  </div>
                                  <p className="text-xs text-stone-300 font-medium mt-0.5">{msg.userCard.title || '平台成員'}</p>
                                </div>
                              </div>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 shrink-0">
                                {msg.userCard.role === 'admin' ? '👑 平台管理員' : msg.userCard.role === 'solver' || msg.userCard.isExpert ? '💼 智庫專家' : msg.userCard.title?.includes('廠商') ? '🏢 企業廠商' : '🙋 提問者'}
                              </span>
                            </div>

                            {msg.userCard.bio && (
                              <p className="text-xs text-stone-300 leading-relaxed bg-stone-800/70 p-2.5 rounded-xl border border-stone-700/60">
                                {msg.userCard.bio}
                              </p>
                            )}

                            {msg.userCard.skills && msg.userCard.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {msg.userCard.skills.map((skill, sIdx) => (
                                  <span key={sIdx} className="text-[10px] px-2 py-0.5 rounded-md bg-stone-800 text-amber-200 border border-stone-700">
                                    #{skill}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Actions: Direct Chat / Copy ID */}
                            <div className="flex items-center gap-2 pt-1 border-t border-stone-700/80">
                              <button
                                type="button"
                                onClick={() => {
                                  const target = availableUsers.find(u => u.id === msg.userCard?.id) || {
                                    id: msg.userCard!.id,
                                    name: msg.userCard!.name,
                                    avatar: msg.userCard!.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                                    title: msg.userCard!.title || '平台成員',
                                  };
                                  startDirectChat(target);
                                }}
                                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                                title="與此用戶聊聊"
                              >
                                <MessageSquare className="w-3.5 h-3.5 fill-stone-950" />
                                <span>與此用戶聊聊</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(msg.userCard!.id);
                                  alert(`已複製用戶 ID: ${msg.userCard!.id}`);
                                }}
                                className="py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors cursor-pointer border border-stone-700 flex items-center gap-1"
                                title="複製用戶 ID"
                              >
                                <Copy className="w-3 h-3" />
                                <span>複製 ID</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {msg.offer && (
                          <div className="p-4 rounded-2xl bg-white border-2 border-amber-400 shadow-md space-y-3 w-full">
                            <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-2.5">
                              <div>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black tracking-wider uppercase inline-block mb-1">
                                  {msg.offer.deliveryType && !msg.offer.deliveryType.includes('多維度') ? msg.offer.deliveryType : '客製專屬方案'}
                                </span>
                                <h4 className="font-black text-sm text-stone-900">{msg.offer.title}</h4>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-black text-base sm:text-lg text-amber-900 font-mono">
                                  NT$ {msg.offer.price.toLocaleString()}
                                </span>
                                <span className="text-[10px] text-stone-400 block font-mono">
                                  預計 {msg.offer.estimatedDays || 3} 天交付
                                </span>
                              </div>
                            </div>

                            <p className="text-xs text-stone-600 leading-relaxed">{msg.offer.description}</p>

                            {msg.offer.deliverables && msg.offer.deliverables.length > 0 && (
                              <div className="space-y-1.5 bg-amber-50/60 p-3 rounded-xl border border-amber-200/70 text-xs">
                                <span className="font-bold text-amber-950 text-[11px] block flex items-center gap-1">
                                  <FileCheck className="w-3.5 h-3.5 text-amber-700" />
                                  <span>預計交付成果項目：</span>
                                </span>
                                {msg.offer.deliverables.map((item, idx) => (
                                  <div key={idx} className="flex items-start gap-2 text-stone-800 text-[11px]">
                                    <span className="text-amber-600 font-bold">•</span>
                                    <span>{item}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Offer Status & Payment Actions */}
                            {msg.offer.status === 'accepted' || msg.offer.status === 'completed' ? (
                              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 font-black text-emerald-800">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                    <span>
                                      {msg.offer.status === 'completed' ? '已完成結案・契約履行完畢' : '已完成簽約・第三方款項託管中'}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                                    {msg.offer.status === 'completed' ? '已結案' : '已解鎖交付'}
                                  </span>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-emerald-200/80 font-mono text-[11px] leading-relaxed text-stone-800 whitespace-pre-line">
                                  {msg.offer.paywalledContent || '方案已完成託管簽約，雙方可直接透過本聊天室交付專案檔案、會議連結與成果確認。'}
                                </div>

                                {/* Formal Contract Download & Preview Button */}
                                <div className="pt-2 border-t border-emerald-200/80 flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-1 text-[11px] text-emerald-900 font-bold">
                                    <FileText className="w-3.5 h-3.5 text-emerald-700" />
                                    <span>正式商業勞務委任契約（已生效）</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const otherParty = activeConversation.participantDetails.find((p) => p.id !== msg.offer?.creatorId);
                                        const creatorUser = activeConversation.participantDetails.find((p) => p.id === msg.offer?.creatorId) || {
                                          id: msg.offer!.creatorId,
                                          name: msg.offer!.creatorName,
                                        };
                                        const buyerUser = msg.offer?.buyerId === currentUser.id ? currentUser : (otherParty || currentUser);
                                        const sellerUser = msg.offer?.creatorId === currentUser.id ? currentUser : creatorUser;
                                        const cData = buildContractFromOffer(
                                          msg.offer!,
                                          buyerUser,
                                          sellerUser,
                                          activeConversation.relatedQuestionTitle,
                                          msg.createdAt
                                        );
                                        setPreviewContract(cData);
                                      }}
                                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all hover:border-emerald-400"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-emerald-700" />
                                      <span>檢視契約</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const otherParty = activeConversation.participantDetails.find((p) => p.id !== msg.offer?.creatorId);
                                        const creatorUser = activeConversation.participantDetails.find((p) => p.id === msg.offer?.creatorId) || {
                                          id: msg.offer!.creatorId,
                                          name: msg.offer!.creatorName,
                                        };
                                        const buyerUser = msg.offer?.buyerId === currentUser.id ? currentUser : (otherParty || currentUser);
                                        const sellerUser = msg.offer?.creatorId === currentUser.id ? currentUser : creatorUser;
                                        const cData = buildContractFromOffer(
                                          msg.offer!,
                                          buyerUser,
                                          sellerUser,
                                          activeConversation.relatedQuestionTitle,
                                          msg.createdAt
                                        );
                                        downloadContractFile(cData);
                                      }}
                                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                                    >
                                      <Download className="w-3.5 h-3.5 text-stone-950" />
                                      <span>下載契約檔案</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="pt-1">
                                {msg.offer.deliveryType === '提問委託詢價' ? (
                                  msg.offer.creatorId !== currentUser.id ? (
                                    /* Expert seeing Buyer's Inquiry */
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOfferTitle(`專屬解答方案：${msg.offer?.title || '客製諮詢'}`);
                                        setOfferPrice(msg.offer?.price || 1500);
                                        setOfferDeliverables(`1. 針對委託需求之專屬架構剖析\n2. 可執行步驟與試算檔案\n3. 視訊或文字即時答疑`);
                                        setIsOfferModalOpen(true);
                                      }}
                                      className="w-full py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                      <Sparkles className="w-4 h-4 fill-stone-950" />
                                      <span>接受委託並為買家發送專屬解答方案 (預算 NT$ {msg.offer.price.toLocaleString()})</span>
                                    </button>
                                  ) : (
                                    /* Buyer seeing their own sent Inquiry */
                                    <div className="p-2.5 rounded-xl bg-stone-100 text-stone-700 text-center text-xs font-semibold flex items-center justify-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                                      <span>您已發送詢價委託，等待專家確認或發送專屬解答方案</span>
                                    </div>
                                  )
                                ) : (
                                  msg.offer.creatorId !== currentUser.id ? (
                                    /* Buyer seeing Expert's Proposal */
                                    <button
                                      type="button"
                                      onClick={() => setPaymentTargetMessage(msg)}
                                      className="w-full py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white font-black text-xs sm:text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                      <ShieldCheck className="w-4 h-4" />
                                      <span>同意採納此方案，立即支付 NT$ {msg.offer.price.toLocaleString()} 託管簽約</span>
                                    </button>
                                  ) : (
                                    /* Expert seeing their own sent Proposal */
                                    <div className="p-2.5 rounded-xl bg-stone-100 text-stone-700 text-center text-xs font-semibold flex items-center justify-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                                      <span>您已發送方案報價，等待提問者確認與第三方託管支付</span>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="border-t border-stone-200 bg-white sticky bottom-0 z-10 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {/* Admin Quick Canned Chips Bar */}
                {isAdmin && (
                  <div className="px-3 py-1.5 bg-purple-50/80 border-b border-purple-100/70 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                    <span className="text-purple-900 font-black shrink-0 flex items-center gap-1">
                      <MessageSquareQuote className="w-3.5 h-3.5 text-purple-700" />
                      <span>官方快捷：</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setInputMessage('【官方提醒】您好，請務必維護健康友善的溝通環境，平台嚴格禁止廣告騷擾或不當內容。')}
                      className="px-2 py-0.5 rounded-md bg-white hover:bg-purple-100 text-purple-950 border border-purple-200/80 shrink-0 cursor-pointer font-medium"
                    >
                      社群規範
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMessage('【安全交易警示】平台提供全額價金託管與交付驗收保障，嚴禁脫離平台私下轉帳交易。')}
                      className="px-2 py-0.5 rounded-md bg-white hover:bg-purple-100 text-purple-950 border border-purple-200/80 shrink-0 cursor-pointer font-medium"
                    >
                      安全託管警示
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMessage('【申訴仲裁受理通知】管理員已正式受理此爭議案件，正在調閱記錄審查中，將於 1-2 工作天內答覆。')}
                      className="px-2 py-0.5 rounded-md bg-white hover:bg-purple-100 text-purple-950 border border-purple-200/80 shrink-0 cursor-pointer font-medium"
                    >
                      申訴受理通知
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMessage('【實名認證通知】您的實名認證與證明文件已提交至管理團隊覆核，審核通過後將自動發送通知。')}
                      className="px-2 py-0.5 rounded-md bg-white hover:bg-purple-100 text-purple-950 border border-purple-200/80 shrink-0 cursor-pointer font-medium"
                    >
                      認證審核
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCannedMessagesModalOpen(true)}
                      className="px-2 py-0.5 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-bold shrink-0 cursor-pointer"
                    >
                      更多範本...
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendText} className="p-2.5 sm:p-4 flex items-center gap-2 relative">
                {/* Hidden File Inputs */}
                <input
                  type="file"
                  ref={imageInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt"
                  className="hidden"
                />

                {/* + (Plus) Action Button & Dropup Menu */}
                <div className="relative" ref={plusMenuRef}>
                  <button
                    id="chat-plus-button"
                    type="button"
                    onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                      isPlusMenuOpen
                        ? 'bg-stone-900 text-white border-stone-900 rotate-45 shadow-sm'
                        : 'bg-stone-100 hover:bg-stone-200 border-stone-200 text-stone-700 active:scale-95'
                    }`}
                    title="功能選單"
                  >
                    <Plus className="w-5 h-5 transition-transform" />
                  </button>

                  {/* + Dropup Menu */}
                  {isPlusMenuOpen && (
                    <div className="absolute bottom-13 left-0 w-64 sm:w-72 bg-white rounded-2xl shadow-2xl border border-stone-200 p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                      <div className="px-2.5 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100 mb-1">
                        {isAdmin ? '平台管理員專屬功能' : lockedConversationRole === 'solver' ? '解答者專屬功能' : '提問者專屬功能'}
                      </div>

                      {/* 管理員專屬功能：罐頭訊息與名片，不展示方案/報價/詢價 */}
                      {isAdmin ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setIsPlusMenuOpen(false);
                              setIsCannedMessagesModalOpen(true);
                            }}
                            className="w-full p-2.5 rounded-xl hover:bg-purple-50 text-left flex items-center gap-3 transition-colors cursor-pointer group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center shrink-0 group-hover:bg-purple-200 font-bold">
                              <MessageSquareQuote className="w-4 h-4 text-purple-700" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                                <span>發送罐頭訊息</span>
                                <span className="text-[9px] px-1 py-0.2 rounded bg-purple-100 text-purple-900 font-bold">官方快捷</span>
                              </div>
                              <p className="text-[10px] text-stone-500 truncate mt-0.5">社群規範、仲裁受理、認證通知等快捷範本</p>
                            </div>
                          </button>
                        </>
                      ) : (
                        <>
                          {/* 1. 發布自訂方案報價 */}
                          <button
                            id="chat-menu-item-offer"
                            type="button"
                            onClick={() => {
                              setIsPlusMenuOpen(false);
                              setIsOfferModalOpen(true);
                            }}
                            className="w-full p-2.5 rounded-xl hover:bg-amber-50/80 text-left flex items-center gap-3 transition-colors cursor-pointer group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 group-hover:bg-amber-200">
                              <Award className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                                <span>發起自訂方案報價</span>
                                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-900 font-bold">履約託管</span>
                              </div>
                              <p className="text-[10px] text-stone-500 truncate mt-0.5">自訂服務項目、交付時程與報價（預先標明平台服務費）</p>
                            </div>
                          </button>

                          {/* 2. 發送詢價委託 */}
                          <button
                            id="chat-menu-item-request"
                            type="button"
                            onClick={() => {
                              setIsPlusMenuOpen(false);
                              setIsRequestModalOpen(true);
                            }}
                            className="w-full p-2.5 rounded-xl hover:bg-stone-50 text-left flex items-center gap-3 transition-colors cursor-pointer group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-stone-900 text-amber-400 flex items-center justify-center shrink-0">
                              <HelpCircle className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                                <span>發起詢價委託</span>
                                <span className="text-[9px] px-1 py-0.2 rounded bg-stone-100 text-stone-700 font-bold">需求提案</span>
                              </div>
                              <p className="text-[10px] text-stone-500 truncate mt-0.5">提出專案痛點、期待交付成果與預算上限</p>
                            </div>
                          </button>

                          {/* 3. 提出方案（同問題下方提出方案頁面） */}
                          <button
                            id="chat-menu-item-submit"
                            type="button"
                            onClick={() => {
                              setIsPlusMenuOpen(false);
                              if (currentUser.id === 'user-guest') {
                                promptLogin('訪客模式請先登入帳號以提出方案');
                                return;
                              }
                              setIsSubmitAnswerModalOpen(true);
                            }}
                            className="w-full p-2.5 rounded-xl hover:bg-amber-50/90 text-left flex items-center gap-3 transition-colors cursor-pointer group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-stone-950 flex items-center justify-center shrink-0 group-hover:from-amber-400 group-hover:to-amber-500 font-bold shadow-2xs">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                                <span>提出方案</span>
                                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-200 text-amber-950 font-bold">完整提案</span>
                              </div>
                              <p className="text-[10px] text-stone-500 truncate mt-0.5">文字建議、檔案交付、線上會談與多階段交付</p>
                            </div>
                          </button>
                        </>
                      )}

                      <div className="h-px bg-stone-100 my-1" />

                      {/* 3. 傳送圖片 */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsPlusMenuOpen(false);
                          imageInputRef.current?.click();
                        }}
                        className="w-full p-2.5 rounded-xl hover:bg-stone-50 text-left flex items-center gap-3 transition-colors cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-100">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h6 className="text-xs font-bold text-stone-900">傳送圖片</h6>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-200">
                              儲存 7 日
                            </span>
                          </div>
                          <p className="text-[10px] text-amber-700 font-medium truncate mt-0.5">
                            ※ 聊天室照片儲存 7 日逾期會無法開啟，請及時下載備份
                          </p>
                        </div>
                      </button>

                      {/* 4. 傳送檔案 / 附件 */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsPlusMenuOpen(false);
                          fileInputRef.current?.click();
                        }}
                        className="w-full p-2.5 rounded-xl hover:bg-stone-50 text-left flex items-center gap-3 transition-colors cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-100">
                          <Paperclip className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h6 className="text-xs font-bold text-stone-900">傳送檔案</h6>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-200">
                              儲存 7 日
                            </span>
                          </div>
                          <p className="text-[10px] text-amber-700 font-medium truncate mt-0.5">
                            ※ 聊天室檔案儲存 7 日逾期會無法下載，請及時備份
                          </p>
                        </div>
                      </button>

                      {/* 5. 🪪 發送用戶名片 (用戶 ID 捷徑) */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsPlusMenuOpen(false);
                          setIsSendUserCardModalOpen(true);
                          setUserCardSearchInput('');
                          setSelectedUserForCard(null);
                          setUserCardNote('');
                        }}
                        className="w-full p-2.5 rounded-xl hover:bg-amber-50 text-left flex items-center gap-3 transition-colors cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 group-hover:bg-amber-200 font-bold">
                          <Contact className="w-4 h-4 text-amber-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                            <span>發送用戶名片</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-900 font-bold">名片捷徑</span>
                          </div>
                          <p className="text-[10px] text-stone-500 truncate mt-0.5">輸入用戶 ID 傳送個人名片與私聊捷徑</p>
                        </div>
                      </button>

                      {/* 6. ✨ AI Agent「市場顧問」爭議調解仲裁 */}
                      <button
                        id="chat-menu-item-mediation"
                        type="button"
                        onClick={() => {
                          setIsPlusMenuOpen(false);
                          setIsMediationModalOpen(true);
                        }}
                        className="w-full p-2.5 rounded-xl hover:bg-amber-50 text-left flex items-center gap-3 transition-colors cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 group-hover:bg-amber-400 font-bold">
                          <Scale className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                            <span>AI 市場顧問調解仲裁</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-200 text-amber-950 font-bold">市場顧問 Agent</span>
                          </div>
                          <p className="text-[10px] text-stone-500 truncate mt-0.5">由 AI Agent「市場顧問」閱讀雙方對話與交付檔案，產出雙軌和解書</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={
                    lockedConversationRole === 'questioner'
                      ? `以提問者身份發送訊息給 ${otherParticipant?.name || '夥伴'}...`
                      : `以解答者身份發送訊息給 ${otherParticipant?.name || '夥伴'}...`
                  }
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-200 text-xs sm:text-sm outline-none bg-white"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim()}
                  className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-bold text-xs sm:text-sm shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">傳送</span>
                </button>
              </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-400">
              <MessageSquare className="w-12 h-12 mb-3 text-stone-300" />
              <p className="text-sm font-semibold text-stone-600">選擇左側對話以開始交流</p>
              <p className="text-xs text-stone-400 mt-1">您可在任何懸賞問題中點擊「訊息」與專家或提問者建立專屬對話。</p>
            </div>
          )}
        </div>
      </div>

      {/* --- Modal 1: 解答者「發起報價」彈窗 --- */}
      {isOfferModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-stone-900">發起報價</h3>
                  <p className="text-[11px] text-stone-500">向提問客戶提供明確的交付項目、時程與報價</p>
                </div>
              </div>
              <button
                onClick={() => setIsOfferModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Templates */}
            <div>
              <span className="text-[11px] font-bold text-stone-600 block mb-1.5">⚡ 快速套用範本</span>
              <div className="grid grid-cols-3 gap-1.5">
                {offerPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setOfferTitle(preset.title);
                      setOfferPrice(preset.price);
                      setOfferEstimatedDays(preset.days);
                      setOfferCategory(preset.cat);
                      setOfferDeliverables(preset.desc);
                    }}
                    className="p-2 rounded-xl border border-stone-200 hover:border-amber-400 hover:bg-amber-50/50 text-left transition-all cursor-pointer text-[10px]"
                  >
                    <span className="font-bold text-stone-900 block truncate">{preset.cat}</span>
                    <span className="text-amber-800 font-mono font-bold">NT$ {preset.price.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmitOffer} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                    <span>方案名稱 *</span>
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/70 border border-amber-300/80 px-1.5 py-0.2 rounded">
                      至少 10 字
                    </span>
                  </label>
                  <span className={`text-[11px] font-mono ${offerTitle.trim().length < 10 ? 'text-amber-600 font-bold' : 'text-stone-400'}`}>
                    {offerTitle.trim().length} / 10 字
                  </span>
                </div>
                <input
                  type="text"
                  required
                  minLength={10}
                  value={offerTitle}
                  onChange={(e) => setOfferTitle(e.target.value)}
                  placeholder="例如：1on1 架構拆解諮詢 1 小時 + 落地範本"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs sm:text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">報價金額（NT$）*</label>
                  <input
                    type="number"
                    min={100}
                    step="any"
                    required
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs sm:text-sm font-bold text-right font-mono outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">預估交付時程</label>
                  <select
                    value={offerEstimatedDays}
                    onChange={(e) => setOfferEstimatedDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs sm:text-sm bg-white outline-none focus:border-amber-500"
                  >
                    <option value={1}>1 天內交付</option>
                    <option value={2}>2 天內交付</option>
                    <option value={3}>3 天內交付</option>
                    <option value={5}>5 天內交付</option>
                    <option value={7}>7 天內交付</option>
                    <option value={14}>14 天內交付</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                    <span>預計交付成果與方案說明 *</span>
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/70 border border-amber-300/80 px-1.5 py-0.2 rounded">
                      至少 30 字
                    </span>
                  </label>
                  <span className={`text-[11px] font-mono ${offerDeliverables.trim().length < 30 ? 'text-amber-600 font-bold' : 'text-stone-400'}`}>
                    {offerDeliverables.trim().length} / 30 字
                  </span>
                </div>
                <textarea
                  rows={3}
                  required
                  minLength={30}
                  value={offerDeliverables}
                  onChange={(e) => setOfferDeliverables(e.target.value)}
                  placeholder="詳述預計交付的具體成果內容、檔案形式與服務項目（至少 30 字）..."
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs outline-none focus:border-amber-500 resize-none leading-relaxed"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-stone-700">
                    付款簽約後專屬解鎖內容（選填）
                  </label>
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-bold">
                    🔒 加密保護
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={offerPaywalledContent}
                  onChange={(e) => setOfferPaywalledContent(e.target.value)}
                  placeholder="買家完成託管支付後才會在聊天室即時解鎖。可填寫 Google Meet 會議室、雲端檔案資料夾密碼或專屬交付連結。"
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs outline-none focus:border-amber-500 resize-none font-mono"
                />
              </div>

              {/* Fee & Payout Realtime Breakdown (依照用戶會員資格動態計算) */}
              {(() => {
                const split = calculateSplitPayout(offerPrice, currentUser.id);
                return (
                  <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-stone-700">
                      <span>買方付款金額：</span>
                      <span className="font-mono font-bold">NT$ {offerPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-stone-700">
                      <span>平台託管服務費：</span>
                      <span className="font-mono font-bold text-amber-900">
                        NT$ {split.platformFee.toLocaleString()} ({Math.max(0, Math.round(split.feeRate * 100))}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-amber-950 font-bold">
                      <span>
                        專家預估實收（{split.planName}・實收 {split.sellerPayoutText}）：
                      </span>
                      <span className="font-mono text-sm text-emerald-700 font-black">
                        NT$ {split.netPayout.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[10px] text-stone-500 pt-1 border-t border-amber-200/60 flex items-center justify-between gap-2">
                      <span>第三方金流獨立託管與拆款直撥（已載明平台託管服務費，避免爭議）</span>
                      <span className="text-amber-800 font-bold shrink-0">{split.feeDiscountText}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOfferModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-black text-xs sm:text-sm shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>發起報價</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Modal 2: 提問者「發起詢價」彈窗 --- */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-stone-900">發起詢價</h3>
                  <p className="text-[11px] text-stone-500">向專家說明您的核心問題與期望成果，取得專屬報價</p>
                </div>
              </div>
              <button
                onClick={() => setIsRequestModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">預算上限（NT$）*</label>
                  <input
                    type="number"
                    min={500}
                    step={200}
                    required
                    value={requestBudget}
                    onChange={(e) => setRequestBudget(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs sm:text-sm font-bold text-right font-mono outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">期望完成時程</label>
                  <select
                    value={requestTimeline}
                    onChange={(e) => setRequestTimeline(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs sm:text-sm bg-white outline-none focus:border-amber-500"
                  >
                    <option value="急件（24-48小時內）">急件（24-48小時內）</option>
                    <option value="3-5 天內完成">3-5 天內完成</option>
                    <option value="1 週內完成">1 週內完成</option>
                    <option value="2 週以上中長期專案">2 週以上中長期專案</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">需求具體說明 *</label>
                <textarea
                  rows={4}
                  required
                  value={requestRequirement}
                  onChange={(e) => setRequestRequirement(e.target.value)}
                  placeholder="請簡述您的核心痛點、希望專家提供哪類產出（如 1 對 1 視訊、架構審閱報告、資料庫設計），以及期望的交付標準。"
                  className="w-full p-3 rounded-xl border border-stone-300 text-xs outline-none focus:border-amber-500 resize-none leading-relaxed"
                />
              </div>

              {/* 平台託管服務費與履約機制預先說明（先寫明避免爭議） */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-stone-700">
                  <span className="font-bold">預計委託預算：</span>
                  <span className="font-mono font-bold text-amber-950">NT$ {requestBudget.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-stone-700">
                  <span className="font-bold">第三方價金託管保障：</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>100% 履約驗收保障</span>
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 pt-1.5 border-t border-stone-200/70 leading-relaxed">
                  <span className="font-bold text-stone-700">平台託管服務費說明：</span>
                  買方支付之委託款項將全額暫存於第三方信託專戶。專案交付並經買方滿意驗收後才撥款；平台依規自專家端收益扣取託管服務費，買賣雙方權利義務公開透明，預先寫明避免後續爭議。
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-400 font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>發起詢價</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Modal 3: 買方「平台點數託管支付確認」彈窗 --- */}
      {paymentTargetMessage && paymentTargetMessage.offer && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-stone-900">平台點數安全託管簽約</h3>
                  <p className="text-[11px] text-stone-500">點數託管保障 • 驗收滿意再撥付</p>
                </div>
              </div>
              <button
                onClick={() => setPaymentTargetMessage(null)}
                className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Offer Summary */}
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900">{paymentTargetMessage.offer.title}</span>
                <span className="font-black text-base text-amber-900 font-mono">
                  {paymentTargetMessage.offer.price.toLocaleString()} 點
                </span>
              </div>
              <div className="text-[11px] text-stone-500">
                <span>解答專家：{paymentTargetMessage.senderName} • 交付時程約 {paymentTargetMessage.offer.estimatedDays || 3} 天</span>
              </div>
              <div className="pt-2 border-t border-stone-200/80 text-[11px] space-y-1">
                <div className="flex items-center justify-between text-stone-600">
                  <span>買方應付託管點數：</span>
                  <span className="font-mono font-bold text-stone-900">{paymentTargetMessage.offer.price.toLocaleString()} 點</span>
                </div>
                <div className="flex items-center justify-between text-stone-600">
                  <span>平台履約保障：</span>
                  <span className="text-emerald-700 font-medium">平台點數安全保管，確認驗收後撥付（買方免額外負擔）</span>
                </div>
              </div>
            </div>

            {/* Payment Method / Balance status */}
            <div className="space-y-2 text-xs">
              <label className="font-bold text-stone-700 block">付款方式（目前暫時只支援平台點數扣點）：</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-500 ring-1 ring-amber-300 text-stone-950">
                  <div className="font-black flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5 text-amber-700" />
                    <span>平台點數扣點</span>
                  </div>
                  <div className="text-[10px] text-amber-800 font-mono mt-0.5">
                    餘額 {(currentUser.balance || 0).toLocaleString()} 點
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-400 opacity-60 cursor-not-allowed">
                  <div className="font-bold flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>外部金流支付</span>
                  </div>
                  <div className="text-[10px] mt-0.5">暫不支援 (信用卡/ATM)</div>
                </div>
              </div>

              {(currentUser.balance || 0) < paymentTargetMessage.offer.price && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold">
                  您的平台點數餘額不足（目前餘額 {(currentUser.balance || 0).toLocaleString()} 點 / 需支付 {paymentTargetMessage.offer.price.toLocaleString()} 點）。目前暫時僅支援以平台點數扣點，外部金流暫不支援。
                </div>
              )}
            </div>

            {/* Agreement Check */}
            <label className="flex items-start gap-2 p-2.5 rounded-xl bg-stone-50 border border-stone-200 cursor-pointer">
              <input
                type="checkbox"
                checked={paymentAgreementAccepted}
                onChange={(e) => setPaymentAgreementAccepted(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-stone-600 leading-relaxed">
                我同意將本筆點數支付至 <strong className="text-stone-900">IdeaX 平台點數獨立託管帳戶</strong>。待專家交付成果且經本人驗收完成後，系統方進行拆款撥付。
              </span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPaymentTargetMessage(null)}
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!paymentAgreementAccepted || isProcessingPayment || (currentUser.balance || 0) < paymentTargetMessage.offer.price}
                onClick={handleExecutePayment}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isProcessingPayment ? (
                  <span>正在處理點數託管簽約...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>確認扣點 {(paymentTargetMessage?.offer?.price || 0).toLocaleString()} 點並託管</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* AI Mediation Modal */}
      {isMediationModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 text-stone-800">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base text-stone-900 flex items-center gap-1.5">
                    <span>AI Agent「市場顧問」調解仲裁</span>
                  </h3>
                  <span className="text-[10px] text-stone-500 font-medium">履約偏差分析與雙軌和解</span>
                </div>
              </div>
              <button
                onClick={() => setIsMediationModalOpen(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-stone-600 leading-relaxed">
              <p>
                由 IdeaX 專屬 AI Agent「市場顧問」閱讀雙方歷史對話脈絡、交付附件與履約約定，客觀比對兩造主張與交付品質，判定責任佔比並即時生成雙軌和解協議書。
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-800 block mb-1">
                爭議或主張重點說明 (選填)
              </label>
              <textarea
                rows={3}
                value={mediationDisputeReason}
                disabled={isAnalyzingMediation}
                onChange={(e) => setMediationDisputeReason(e.target.value)}
                placeholder="例如：提問者覺得報告少了一份 SWOT 分析表格；解答者認為已涵蓋核心架構且有追加項目..."
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-normal outline-none focus:border-amber-500 disabled:bg-stone-50 disabled:text-stone-400"
              />
            </div>

            {/* 提示資訊 / 調解進度通知 */}
            {isAnalyzingMediation ? (
              <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300 flex items-start gap-2.5 text-amber-950 text-xs animate-pulse">
                <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-black text-amber-900 block">
                    提示: Agent正在閱讀對話脈絡與調閱交易，請耐心等待約1~3分鐘
                  </span>
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    系統正在深度比對合約規格、已交付檔案與對話紀錄，即將生成具衡平性之雙軌和解協議書...
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80 flex items-center gap-2 text-stone-700 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="font-medium">提示: Agent正在閱讀對話脈絡與調閱交易，請耐心等待約1~3分鐘</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsMediationModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isAnalyzingMediation}
                onClick={handleRunAIMediation}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isAnalyzingMediation ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>市場顧問 Agent 調解中...</span>
                  </>
                ) : (
                  <>
                    <Scale className="w-3.5 h-3.5" />
                    <span>調用市場顧問產出調解協議</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Modal 4: 完整「提出方案」彈窗（同問題下方提出方案頁面） --- */}
      {isSubmitAnswerModalOpen && (
        <SubmitAnswerModal
          question={
            (activeConversation?.relatedQuestionId &&
              questions.find((q) => q.id === activeConversation.relatedQuestionId)) || {
              id: activeConversation?.relatedQuestionId || `q-chat-${activeConversation?.id || 'direct'}`,
              title: activeConversation?.relatedQuestionTitle || '私聊專屬諮詢與客製需求',
              description: '兩造於私聊建立專案需求與交付規劃，設定專屬解鎖方案。',
              category: '創新創業',
              level: 'L2',
              bounty: 1500,
              createdAt: new Date().toISOString(),
              deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
              authorId: otherParticipant?.id || 'partner',
              authorName: otherParticipant?.name || '諮詢夥伴',
              authorAvatar: otherParticipant?.avatar || '',
              views: 0,
              viewsCount: 0,
              answersCount: 0,
              status: 'open',
              tags: ['私聊客製', '專屬方案'],
              isPhasedDelivery: true,
              phases: [
                { id: 'p1', phaseNumber: 1, title: '第一階段：架構初審與核心方針', description: '架構初審與方針建議', points: 600, status: 'pending_acceptance' },
                { id: 'p2', phaseNumber: 2, title: '第二階段：完整交付與會談總結', description: '完整交付與會談總結', points: 900, status: 'pending_acceptance' },
              ],
            }
          }
          onClose={() => setIsSubmitAnswerModalOpen(false)}
          onSuccess={(ans: Answer) => {
            if (activeConversation) {
              const formatLabels: string[] = [];
              if (ans.deliveryFormats?.includes('text')) formatLabels.push('文字建議');
              if (ans.deliveryFormats?.includes('file')) formatLabels.push(`檔案交付 (${ans.attachments?.length || 1} 份)`);
              if (ans.deliveryFormats?.includes('meeting')) formatLabels.push(`線上會談 (${ans.meetingDetails?.durationMinutes || 30} 分鐘)`);

              sendMessage(
                activeConversation.id,
                `💼 我已為您提交完整【${ans.deliveryType && !ans.deliveryType.includes('多維度') ? ans.deliveryType : '客製專屬方案'}】：NT$ ${(ans.price || 1500).toLocaleString()} 元\n\n📝 方案概要：\n${ans.freePreview || '已針對需求規劃具體執行方針與交付成果'}\n\n🔒 完成第三方託管簽約後即可解鎖完整交付內容與附件資源。`,
                {
                  title: `專屬方案：${ans.deliveryType && !ans.deliveryType.includes('多維度') ? ans.deliveryType : '客製解答方案'}`,
                  description: ans.freePreview || '提供完整架構規劃、專屬附件與會談交付',
                  deliveryType: ans.deliveryType && !ans.deliveryType.includes('多維度') ? ans.deliveryType : '完整方案提案',
                  price: ans.price || 1500,
                  deliverables: formatLabels.length > 0 ? formatLabels : ['文字架構剖析', '專屬交付成果'],
                  estimatedDays: 3,
                  paywalledContent:
                    ans.fullContent ||
                    (ans.meetingDetails
                      ? `線上會議平台：${ans.meetingDetails.platform}\n建議預約時段：${ans.meetingDetails.availableTimeSlots}`
                      : undefined),
                }
              );
            }
            setIsSubmitAnswerModalOpen(false);
          }}
        />
      )}
      {/* --- Modal 5: 編輯 AI 調解方案 Modal (修訂版本與差異標示) --- */}
      {editingMediationMsg && editingMediationMsg.aiMediation && (
        <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-stone-900">
                    編輯和解協議條款 (第 v{(editingMediationMsg.aiMediation.version || 1) + 1} 版)
                  </h3>
                  <p className="text-[11px] text-stone-500">修改和解金額、履約期限或條款內容，對手方可比對並確認同意</p>
                </div>
              </div>
              <button
                onClick={() => setEditingMediationMsg(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEditMediation} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">和解點數/金額（NT$）*</label>
                  <input
                    type="number"
                    min={100}
                    step={100}
                    required
                    value={editSettlementAmount}
                    onChange={(e) => setEditSettlementAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs sm:text-sm font-bold text-right font-mono outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">履約完成期限（天數）*</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    required
                    value={editEstimatedDays}
                    onChange={(e) => setEditEstimatedDays(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs sm:text-sm font-bold text-right font-mono outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">修訂後之和解方案與交付條款 *</label>
                <textarea
                  rows={4}
                  required
                  value={editRecommendedAction}
                  onChange={(e) => setEditRecommendedAction(e.target.value)}
                  placeholder="請明確寫出雙方修訂後之和解約定，例如：解答者需於 3 天內補充 PDF 架構報告與錄音筆記，提問者同意劃撥 NT$ 1,200。"
                  className="w-full p-3 rounded-xl border border-stone-300 text-xs leading-relaxed outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">本版修改備註與說明 (選填)</label>
                <textarea
                  rows={2}
                  value={editModificationNotes}
                  onChange={(e) => setEditModificationNotes(e.target.value)}
                  placeholder="說明本次修訂重點，例如：將和解金額調降 NT$ 300，並增加 2 天修訂期。"
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-stone-700 space-y-1">
                <span className="font-bold text-amber-900 block">💡 修訂生效規則：</span>
                <p className="text-[11px] leading-relaxed">
                  送出後聊天室將生成全新修訂卡片，並高亮顯示修改點。送出者預設自動同意，待對手方點擊同意後，將自動進行提問方點數預扣託管。
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMediationMsg(null)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-black text-xs sm:text-sm shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>送出修訂版和解條款</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Modal 6: 點數不足擋下成案 Modal --- */}
      {insufficientBalanceModal && insufficientBalanceModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-black">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-stone-900">提問方點數不足・無法成案託管</h3>
                  <p className="text-[11px] text-stone-500">成案前需確保提問方點數足夠劃撥託管</p>
                </div>
              </div>
              <button
                onClick={() => setInsufficientBalanceModal(null)}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200 space-y-2 text-xs text-rose-950">
              <div className="flex items-center justify-between font-bold">
                <span>和解所需託管金額：</span>
                <span className="font-mono text-sm text-rose-700">NT$ {(insufficientBalanceModal.requiredAmount || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>提問方當前點數餘額：</span>
                <span className="font-mono font-bold text-stone-800">NT$ {(insufficientBalanceModal.currentBalance || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-rose-700 font-black border-t border-rose-200/80 pt-1.5">
                <span>尚差金額：</span>
                <span className="font-mono">NT$ {((insufficientBalanceModal.requiredAmount || 0) - (insufficientBalanceModal.currentBalance || 0)).toLocaleString()}</span>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              依創點子交易保障機制，雙方同意調解前必須由提問方全額扣除並進行獨立託管。點數不足則無法完成成案，請提問方先儲值點數後再進行同意。
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInsufficientBalanceModal(null)}
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
              >
                稍後再試
              </button>
              <button
                type="button"
                onClick={() => {
                  const diff = insufficientBalanceModal.requiredAmount - insufficientBalanceModal.currentBalance;
                  depositBalance(diff + 500); // 一鍵快速儲值點數
                  setInsufficientBalanceModal(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-black text-xs sm:text-sm shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Wallet className="w-4 h-4" />
                <span>一鍵快速儲值點數</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Modal 7: 簽署和解協議書二次確認彈窗 (Clean White Style) --- */}
      {mediationConfirmModal.isOpen && mediationConfirmModal.msg && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-md w-full p-5 text-stone-900 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b border-stone-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-800 border border-stone-200 flex items-center justify-center font-bold shrink-0">
                <Scale className="w-5 h-5 text-stone-700" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-stone-900">確認簽署商務和解協議書</h3>
                <p className="text-xs text-stone-500">請再次確認協議條款與履約劃撥金額</p>
              </div>
            </div>

            <div className="space-y-2 bg-stone-50 p-3.5 rounded-2xl border border-stone-200 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-stone-500 font-sans font-medium">專案主題：</span>
                <span className="text-stone-900 font-bold truncate max-w-[200px]">
                  {activeConversation?.relatedQuestionTitle || '專案諮詢和解'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-sans font-medium">和解金額：</span>
                <span className="text-stone-900 font-black">
                  NT$ {(mediationConfirmModal.msg.aiMediation?.settlementAmount || 1200).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-sans font-medium">履約交付期限：</span>
                <span className="text-stone-800 font-bold">
                  {mediationConfirmModal.msg.aiMediation?.estimatedDays || 3} 天內
                </span>
              </div>
            </div>

            <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-700 leading-relaxed">
              <span className="font-bold text-stone-900 block mb-1">簽署須知與撤銷規則：</span>
              <p>
                點擊簽署同意後，在對手方尚未簽署前，您可以隨時點擊「撤銷同意」。<strong>一旦雙方皆完成簽署，本協議即刻達成生效</strong>，系統將自動執行提問方點數預扣託管。
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMediationConfirmModal({ isOpen: false, msg: null, role: 'buyer' })}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-bold text-xs transition-colors cursor-pointer"
              >
                再考慮一下
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetMsg = mediationConfirmModal.msg!;
                  const targetRole = mediationConfirmModal.role;
                  setMediationConfirmModal({ isOpen: false, msg: null, role: 'buyer' });
                  executeMediationAgree(targetMsg, targetRole);
                }}
                className="flex-1 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-black text-xs shadow-xs transition-colors cursor-pointer"
              >
                確定簽署同意
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Modal 8: 建立群組 Modal（支援廠商、管理員、用戶建立多方協作群組） --- */}
      {isCreateGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-xs">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-stone-900">建立多方協作群組</h3>
                  <p className="text-xs text-stone-500">將其他管理員、用戶或廠商拉入同一個群組對話</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateGroupModalOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-800 block mb-1">群組名稱</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="例如：跨境專案聯合攻堅群組"
                  className="w-full p-3 rounded-xl border border-stone-200 bg-stone-50 text-xs focus:bg-white focus:border-amber-500 outline-none font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-800 block mb-1.5 flex items-center justify-between">
                  <span>選擇群組成員 ({selectedMemberIds.length} 位已選)</span>
                  {currentUser.role !== 'admin' && (
                    <span className="text-[10px] text-amber-700 font-normal">
                      僅限曾私聊過的對象（無法拉管理員與測試帳號）
                    </span>
                  )}
                </label>
                <div className="max-h-60 overflow-y-auto space-y-1.5 p-2 rounded-2xl border border-stone-200 bg-stone-50">
                  {eligibleGroupMembers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-stone-500 space-y-1">
                      <p className="font-bold text-stone-700">目前尚無可加入群組的私聊夥伴</p>
                      <p className="text-[11px] text-stone-400 leading-relaxed">
                        為維護社群隱私，一般用戶僅能邀請曾進行過 1 對 1 私聊的夥伴加入群組，無法拉入管理員與測試帳號。
                      </p>
                    </div>
                  ) : (
                    eligibleGroupMembers.map((u) => {
                      const isChecked = selectedMemberIds.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => {
                            setSelectedMemberIds((prev) =>
                              isChecked ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                            );
                          }}
                          className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                            isChecked ? 'bg-amber-100/70 border border-amber-300 font-bold' : 'bg-white hover:bg-stone-100 border border-stone-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <img
                              src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                              alt={u.name}
                              className="w-8 h-8 rounded-full object-cover border"
                            />
                            <div>
                              <span className="text-xs font-bold text-stone-900 block">{u.name}</span>
                              <span className="text-[10px] text-stone-500 block">
                                {u.accountType === 'enterprise' || (u.role as string) === 'enterprise' ? '企業機構' : '一般用戶'}
                              </span>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded text-amber-500 focus:ring-amber-400"
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsCreateGroupModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!newGroupName.trim() || selectedMemberIds.length === 0}
                onClick={() => {
                  createGroupConversation(newGroupName.trim(), selectedMemberIds);
                  setIsCreateGroupModalOpen(false);
                  setNewGroupName('');
                  setSelectedMemberIds([]);
                }}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-xs shadow-xs cursor-pointer transition-all disabled:opacity-50"
              >
                立即建立群組
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 發送用戶名片 (User Card) Modal */}
      {isSendUserCardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-stone-950 flex items-center justify-center font-bold shadow-xs">
                  <Contact className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-stone-900">發送用戶名片捷徑</h3>
                  <p className="text-xs text-stone-500">輸入用戶 ID 或由清單挑選，傳送專屬個人名片與私聊捷徑</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSendUserCardModalOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-3.5 overflow-y-auto pr-1 flex-1">
              {/* Step 1: Input or Search User ID */}
              <div>
                <label className="text-xs font-bold text-stone-800 block mb-1">
                  1. 輸入用戶 ID 或姓名檢索 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={userCardSearchInput}
                    onChange={(e) => {
                      setUserCardSearchInput(e.target.value);
                      const matched = availableUsers.find(
                        (u) =>
                          u.id.toLowerCase() === e.target.value.trim().toLowerCase() ||
                          u.name.toLowerCase() === e.target.value.trim().toLowerCase()
                      );
                      setSelectedUserForCard(matched || null);
                    }}
                    placeholder="輸入用戶 ID（例如：user-chen, user-1, user-admin-1）或關鍵字..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs focus:bg-white focus:border-amber-500 outline-none font-medium transition-colors"
                  />
                </div>
              </div>

              {/* Quick User List Pick */}
              <div>
                <label className="text-[11px] font-bold text-stone-600 block mb-1">
                  或從平台成員名冊快速點選：
                </label>
                <div className="max-h-40 overflow-y-auto space-y-1 p-1.5 rounded-xl border border-stone-200 bg-stone-50">
                  {availableUsers
                    .filter((u) => {
                      if (!userCardSearchInput.trim()) return true;
                      const q = userCardSearchInput.toLowerCase();
                      return (
                        u.id.toLowerCase().includes(q) ||
                        u.name.toLowerCase().includes(q) ||
                        (u.title && u.title.toLowerCase().includes(q))
                      );
                    })
                    .map((u) => {
                      const isSelected = selectedUserForCard?.id === u.id || userCardSearchInput.trim() === u.id;
                      return (
                        <div
                          key={u.id}
                          onClick={() => {
                            setSelectedUserForCard(u);
                            setUserCardSearchInput(u.id);
                          }}
                          className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-amber-100/90 border border-amber-400 shadow-2xs font-bold'
                              : 'bg-white hover:bg-stone-100 border border-stone-200/80'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                              alt={u.name}
                              className="w-7 h-7 rounded-full object-cover border shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-stone-900 truncate">{u.name}</span>
                                <span className="text-[10px] font-mono text-stone-500 px-1.5 py-0.2 rounded bg-stone-100 border">
                                  ID: {u.id}
                                </span>
                              </div>
                              <span className="text-[10px] text-stone-500 block truncate">{u.title || u.role}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 shrink-0">
                            {u.role === 'admin' ? '👑 管理員' : u.role === 'solver' ? '💼 專家' : u.title?.includes('廠商') ? '🏢 廠商' : '🙋 用戶'}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Step 2: Live Card Preview */}
              {(selectedUserForCard || userCardSearchInput.trim()) && (
                <div>
                  <label className="text-xs font-bold text-stone-800 block mb-1">
                    2. 名片即時預覽效果
                  </label>
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-stone-900 via-stone-850 to-stone-950 text-white border border-amber-400/80 shadow-md space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={
                            selectedUserForCard?.avatar ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                          }
                          alt="avatar"
                          className="w-10 h-10 rounded-xl object-cover ring-2 ring-amber-400 shadow-xs"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-sm text-white">
                              {selectedUserForCard?.name || userCardSearchInput.trim()}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                              ID: {selectedUserForCard?.id || userCardSearchInput.trim()}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-300">
                            {selectedUserForCard?.title || '平台認證成員'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 shrink-0">
                        {selectedUserForCard?.role === 'admin'
                          ? '👑 管理員'
                          : selectedUserForCard?.role === 'solver'
                          ? '💼 專家'
                          : '平台成員'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-[11px] text-amber-300/90 font-medium">
                      <span>✓ 接收對象可點擊捷徑與此用戶聊聊</span>
                      <span>✓ 支援快速複製 ID</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Optional Message Note */}
              <div>
                <label className="text-xs font-bold text-stone-800 block mb-1">
                  3. 附加留言（可選）
                </label>
                <input
                  type="text"
                  value={userCardNote}
                  onChange={(e) => setUserCardNote(e.target.value)}
                  placeholder="例如：向您推薦這位專案顧問，您可點擊下方名片直接發起對話..."
                  className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs focus:bg-white focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsSendUserCardModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!selectedUserForCard && !userCardSearchInput.trim()}
                onClick={() => {
                  if (!activeConversation) return;
                  const target =
                    selectedUserForCard ||
                    availableUsers.find(
                      (u) => u.id.toLowerCase() === userCardSearchInput.trim().toLowerCase()
                    );
                  const userCardData = target
                    ? {
                        id: target.id,
                        name: target.name,
                        avatar: target.avatar,
                        title:
                          target.title ||
                          (target.role === 'admin'
                            ? '平台管理員'
                            : target.role === 'solver'
                            ? '智庫專家'
                            : '平台成員'),
                        role: target.role,
                        isVerified: true,
                        isExpert: target.role === 'solver' || !!target.isOfficialExpert,
                        bio:
                          target.bio ||
                          `${target.name} 是平台優秀成員，歡迎點擊名片發起對話交流。`,
                        skills: target.skills || ['商業諮詢', '方案諮詢'],
                      }
                    : {
                        id: userCardSearchInput.trim(),
                        name: userCardSearchInput.trim(),
                        avatar:
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                        title: '平台認證成員',
                        role: 'solver',
                        isVerified: true,
                        bio: `用戶 ID: ${userCardSearchInput.trim()}，點擊捷徑與此用戶聊聊。`,
                      };

                  const textMsg =
                    userCardNote.trim() ||
                    `發送用戶名片捷徑：【${userCardData.name}】（ID: ${userCardData.id}）`;
                  sendMessage(
                    activeConversation.id,
                    textMsg,
                    undefined,
                    undefined,
                    userCardData
                  );
                  setIsSendUserCardModalOpen(false);
                  setUserCardSearchInput('');
                  setSelectedUserForCard(null);
                  setUserCardNote('');
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-stone-950 font-black text-xs shadow-xs cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>發送名片至聊天室</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 管理員罐頭訊息 (Canned Messages) Modal */}
      {isCannedMessagesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-700 to-indigo-700 text-white flex items-center justify-center font-bold shadow-xs">
                  <MessageSquareQuote className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-stone-900">官方罐頭訊息與快捷範本</h3>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                      管理員專屬
                    </span>
                  </div>
                  <p className="text-xs text-stone-500">標準化官方回覆、社群規範宣導、申訴處理與認證通知</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCannedMessagesModalOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Filter & Search */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { id: 'all', label: `全部 (${allCannedMessages.length})` },
                  { id: 'rules', label: '社群與規範' },
                  { id: 'disputes', label: '申訴與調解' },
                  { id: 'verification', label: '身分與認證' },
                  { id: 'system', label: '系統與帳號' },
                  { id: 'custom', label: `自訂範本 (${customCannedMessages.length})` },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCannedMessageCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                      cannedMessageCategory === cat.id
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={cannedMessageSearch}
                    onChange={(e) => setCannedMessageSearch(e.target.value)}
                    placeholder="搜尋罐頭訊息標題或內容關鍵字..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs focus:bg-white focus:border-purple-500 outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingCustomCanned(!isAddingCustomCanned)}
                  className="px-3 py-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingCustomCanned ? '收合新增' : '新增自訂範本'}</span>
                </button>
              </div>
            </div>

            {/* Custom Canned Input Panel */}
            {isAddingCustomCanned && (
              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-2.5 animate-in fade-in duration-150">
                <h4 className="text-xs font-black text-purple-950 flex items-center gap-1">
                  <Bookmark className="w-3.5 h-3.5 text-purple-700" />
                  <span>新增自訂官方快捷訊息範本</span>
                </h4>
                <input
                  type="text"
                  value={newCannedTitle}
                  onChange={(e) => setNewCannedTitle(e.target.value)}
                  placeholder="範本標題（如：專案進度超時提醒）..."
                  className="w-full p-2.5 rounded-xl border border-stone-200 bg-white text-xs font-bold focus:border-purple-500 outline-none"
                />
                <textarea
                  rows={3}
                  value={newCannedContent}
                  onChange={(e) => setNewCannedContent(e.target.value)}
                  placeholder="輸入罐頭訊息內容完整文字..."
                  className="w-full p-2.5 rounded-xl border border-stone-200 bg-white text-xs focus:border-purple-500 outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCustomCanned(false);
                      setNewCannedTitle('');
                      setNewCannedContent('');
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    disabled={!newCannedTitle.trim() || !newCannedContent.trim()}
                    onClick={() => {
                      const newMsg: CannedMessage = {
                        id: `custom-canned-${Date.now()}`,
                        category: 'custom',
                        categoryLabel: '自訂範本',
                        title: newCannedTitle.trim(),
                        content: newCannedContent.trim(),
                      };
                      const updated = [newMsg, ...customCannedMessages];
                      setCustomCannedMessages(updated);
                      try {
                        localStorage.setItem('ideax_admin_canned_messages', JSON.stringify(updated));
                      } catch {}
                      setNewCannedTitle('');
                      setNewCannedContent('');
                      setIsAddingCustomCanned(false);
                    }}
                    className="px-4 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-black text-xs shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    儲存範本
                  </button>
                </div>
              </div>
            )}

            {/* Canned Messages List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredCannedMessages.length === 0 ? (
                <div className="p-8 text-center text-stone-400 text-xs">
                  查無符合條件的罐頭訊息，您可以點擊上方「新增自訂範本」。
                </div>
              ) : (
                filteredCannedMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-3.5 sm:p-4 rounded-2xl border border-stone-200 hover:border-purple-300 bg-stone-50/50 hover:bg-white transition-all space-y-2.5 shadow-2xs group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-200">
                            {msg.categoryLabel}
                          </span>
                          <h4 className="font-extrabold text-xs sm:text-sm text-stone-900">{msg.title}</h4>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-stone-700 leading-relaxed bg-white p-3 rounded-xl border border-stone-200/90 whitespace-pre-line font-normal">
                      {msg.content}
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setInputMessage(msg.content);
                          setIsCannedMessagesModalOpen(false);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-stone-300 hover:border-purple-400 bg-white hover:bg-purple-50 text-stone-700 hover:text-purple-950 text-xs font-bold transition-colors cursor-pointer"
                        title="將此內容填入下方輸入框，方便微調後再送出"
                      >
                        填入輸入框
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (activeConversation) {
                            sendMessage(activeConversation.id, msg.content);
                            setIsCannedMessagesModalOpen(false);
                          }
                        }}
                        className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 active:scale-95 text-white font-black text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>立即發送</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsCannedMessagesModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 cursor-pointer"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Modal 7: 商業契約與和解協議書檢視與下載 Modal --- */}
      {previewContract && (
        <ContractPreviewModal
          contract={previewContract}
          onClose={() => setPreviewContract(null)}
        />
      )}

      {/* 聊天室首次使用步驟式互動引導教學 */}
      <ChatOnboardingGuide
        isOpen={isChatOnboardingOpen}
        onClose={() => setIsChatOnboardingOpen(false)}
        activeConversationId={activeConversation?.id || null}
        isOfferModalOpen={isOfferModalOpen}
        isRequestModalOpen={isRequestModalOpen}
        isSubmitAnswerModalOpen={isSubmitAnswerModalOpen}
        isPlusMenuOpen={isPlusMenuOpen}
        onSelectFirstConversation={handleSelectFirstConversation}
        onOpenPlusMenu={() => setIsPlusMenuOpen(true)}
        onOpenOfferModal={() => setIsOfferModalOpen(true)}
        onOpenRequestModal={() => setIsRequestModalOpen(true)}
        onOpenSubmitAnswerModal={() => setIsSubmitAnswerModalOpen(true)}
      />
    </div>
  );
};
