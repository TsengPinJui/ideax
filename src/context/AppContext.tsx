import React, { createContext, useContext, useState } from 'react';
import { DirectConversation, Question, Solution, Solver, User } from '../types';
import { INITIAL_CURRENT_USER, INITIAL_QUESTIONS, INITIAL_SOLUTIONS, INITIAL_SOLVERS } from '../data/mockData';
import { CURRENT_TERMS_VERSION } from '../data/termsData';

interface AppContextType {
  currentUser: User;
  setCurrentUser: React.Dispatch<React.SetStateAction<User>>;
  questions: Question[];
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  solutions: Solution[];
  setSolutions: React.Dispatch<React.SetStateAction<Solution[]>>;
  solvers: Solver[];
  setSolvers: React.Dispatch<React.SetStateAction<Solver[]>>;
  conversations: DirectConversation[];
  setConversations: React.Dispatch<React.SetStateAction<DirectConversation[]>>;
  activeTab: 'questions' | 'pain_points' | 'solvers' | 'aicrm' | 'about' | 'mechanism';
  setActiveTab: (tab: 'questions' | 'pain_points' | 'solvers' | 'aicrm' | 'about' | 'mechanism') => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isCreateQuestionModalOpen: boolean;
  setIsCreateQuestionModalOpen: (open: boolean) => void;
  isHeadhunterModalOpen: boolean;
  setIsHeadhunterModalOpen: (open: boolean) => void;
  isUserDashboardOpen: boolean;
  setIsUserDashboardOpen: (open: boolean) => void;
  selectedQuestion: Question | null;
  setSelectedQuestion: (q: Question | null) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  startDirectChat: (targetUser: { id: string; name: string; avatar: string; title?: string }, question?: Question) => string;
  sendMessage: (conversationId: string, text: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_CURRENT_USER);
  const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
  const [solutions, setSolutions] = useState<Solution[]>(INITIAL_SOLUTIONS);
  const [solvers, setSolvers] = useState<Solver[]>(INITIAL_SOLVERS);
  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [activeTab, setActiveTab] = useState<'questions' | 'pain_points' | 'solvers' | 'aicrm' | 'about' | 'mechanism'>('questions');

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCreateQuestionModalOpen, setIsCreateQuestionModalOpen] = useState(false);
  const [isHeadhunterModalOpen, setIsHeadhunterModalOpen] = useState(false);
  const [isUserDashboardOpen, setIsUserDashboardOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const startDirectChat = (
    targetUser: { id: string; name: string; avatar: string; title?: string },
    question?: Question
  ): string => {
    const existing = conversations.find((c) => c.participantUser.id === targetUser.id);
    if (existing) {
      return existing.id;
    }
    const newConvId = `conv-${Date.now()}`;
    const newConv: DirectConversation = {
      id: newConvId,
      participantUser: targetUser,
      question,
      messages: [
        {
          id: `msg-${Date.now()}`,
          conversationId: newConvId,
          senderId: 'system',
          senderName: '系統安全通道',
          senderAvatar: '',
          text: `您已開啟與「${targetUser.name}」的安全私訊洽談通道，對話內容受第三方價金託管與隱私保護。`,
          createdAt: new Date().toISOString(),
          isSystem: true,
        },
      ],
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
    };
    setConversations((prev) => [newConv, ...prev]);
    return newConvId;
  };

  const sendMessage = (conversationId: string, text: string) => {
    if (!text.trim()) return;
    const newMsg = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      text,
      createdAt: new Date().toISOString(),
    };
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              messages: [...c.messages, newMsg],
              lastMessageAt: new Date().toISOString(),
            }
          : c
      )
    );
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        questions,
        setQuestions,
        solutions,
        setSolutions,
        solvers,
        setSolvers,
        conversations,
        setConversations,
        activeTab,
        setActiveTab,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isCreateQuestionModalOpen,
        setIsCreateQuestionModalOpen,
        isHeadhunterModalOpen,
        setIsHeadhunterModalOpen,
        isUserDashboardOpen,
        setIsUserDashboardOpen,
        selectedQuestion,
        setSelectedQuestion,
        toastMessage,
        showToast,
        startDirectChat,
        sendMessage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
