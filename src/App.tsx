import React, { useState, useMemo, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { CategoryFilter } from './components/CategoryFilter';
import { SubcategoryBoardBanner } from './components/SubcategoryBoardBanner';
import { QuestionCard } from './components/QuestionCard';
import { QuestionDetailModal } from './components/QuestionDetailModal';
import { CreateQuestionModal } from './components/CreateQuestionModal';
import { SubmitAnswerModal } from './components/SubmitAnswerModal';
import { UnlockPaywallModal } from './components/UnlockPaywallModal';
import { SolversView } from './components/SolversView';
import { SolverProfileModal } from './components/SolverProfileModal';
import { MechanismView } from './components/MechanismView';
import { LeaderboardView } from './components/LeaderboardView';
import { AboutUsView } from './components/AboutUsView';
import { AboutUsModal } from './components/AboutUsModal';
import { MyProjectsView } from './components/MyProjectsView';
import { CustomerServiceModal } from './components/CustomerServiceModal';
import { UserDashboardModal } from './components/UserDashboardModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { AiCrmView } from './components/AiCrmView';
import { ChatView } from './components/ChatView';
import { Footer } from './components/Footer';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobilePwaDownloadWidget } from './components/MobilePwaDownloadWidget';
import { PwaInstallModal } from './components/PwaInstallModal';
import { HelpTooltip } from './components/HelpTooltip';
import { Category, ProblemLevel, Question, Solver, AppTab, QuestionSortOption, PostType, SpecialZone, UserDashboardTab } from './types';
import { isMockQuestionId } from './data/mockData';
import { updateSEOForQuestion } from './services/seoService';
import {
  recordUserSearchKeyword,
  recordUserBoard,
  recordUserSpecialZone,
  recordUserViewedQuestion,
  getUserInterestProfile,
  computeQuestionRecommendationScore,
  isUserInterestedInQuestionTopic,
  isQuestionExpired,
} from './services/recommendationService';
import { MessageSquarePlus, Sparkles, Filter, AlertCircle, Flame, MessageCircle, X, Users, ArrowRight, Pin, ShieldAlert } from 'lucide-react';

const CATEGORIES: Category[] = [
  '創新創業',
  '專業問題',
  '學術探討',
  '日常疑難',
];

function MainContent() {
  const {
    currentUser,
    openCustomerService,
    incrementQuestionViews,
    questions,
    solvers,
    answers,
    selectedQuestion,
    setSelectedQuestion,
    selectedSolver,
    setSelectedSolver,
    targetAnswerToUnlock,
    setTargetAnswerToUnlock,
    isAboutModalOpen,
    aboutModalInitialSection,
    isPwaInstallModalOpen,
    closePwaInstallModal,
    closeAboutModal,
    searchQuery,
    setSearchQuery,
    searchMode,
    setSearchMode,
    availableUsers,
    startDirectChat,
    openAuthModal,
    isDemoMode,
    isNoPaymentMode,
  } = useApp();

  const [activeTab, setActiveTab] = useState<AppTab>('explore');
  const [userDashboardTab, setUserDashboardTab] = useState<UserDashboardTab>('overview');
  const [dashboardResetCount, setDashboardResetCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<Category | '全部'>('全部');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | '全部'>('全部');
  const [selectedLevel, setSelectedLevel] = useState<ProblemLevel | '全部'>('全部');
  const [specialZone, setSpecialZone] = useState<SpecialZone>('all');
  const [initialPostType, setInitialPostType] = useState<PostType>('seek_solution');
  const [initialPublishIdentity, setInitialPublishIdentity] = useState<'admin' | 'platform'>('admin');
  const [sortBy, setSortBy] = useState<QuestionSortOption>('recruiting_promoted');
  const [userProfileVersion, setUserProfileVersion] = useState(0);

  // 監聽並自動記錄個別用戶最近搜尋的關鍵字（防抖 600ms）
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length >= 2) {
      const timer = setTimeout(() => {
        recordUserSearchKeyword(currentUser.id, trimmed);
        setUserProfileVersion((v) => v + 1);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, currentUser.id]);

  const [pinnedBoard, setPinnedBoard] = useState<{ type: 'special_zone' | 'subcategory'; id: string; categoryName?: string } | null>(null);
  const [unpinConfirmOpen, setUnpinConfirmOpen] = useState(false);

  const handleSearchTag = (tag: string) => {
    setSearchQuery(tag);
    setActiveTab('explore');
    setSelectedQuestion(null);
    setSelectedSolver(null);
    setSelectedCategory('全部');
    setSelectedSubcategory('全部');
    setSpecialZone('all');
    recordUserSearchKeyword(currentUser.id, tag);
    setUserProfileVersion((v) => v + 1);
    setTimeout(() => {
      const el = document.getElementById('market-grid');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 60);
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ideax_pinned_board');
      if (saved) {
        const board = JSON.parse(saved);
        setPinnedBoard(board);
        if (board.type === 'special_zone') {
          setSpecialZone(board.id as SpecialZone);
          setSelectedCategory('全部');
          setSelectedSubcategory('全部');
        } else if (board.type === 'subcategory') {
          setSelectedCategory((board.categoryName as Category) || '全部');
          setSelectedSubcategory(board.id);
          setSpecialZone('all');
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const performUnpin = () => {
    localStorage.removeItem('ideax_pinned_board');
    setPinnedBoard(null);
  };

  const handleTogglePin = (type: 'special_zone' | 'subcategory', id: string, categoryName?: string) => {
    if (pinnedBoard && pinnedBoard.type === type && pinnedBoard.id === id) {
      const skipPrompt = localStorage.getItem('ideax_unpin_skip_prompt') === 'true';
      if (skipPrompt) {
        performUnpin();
      } else {
        setUnpinConfirmOpen(true);
      }
    } else {
      const board = { type, id, categoryName };
      localStorage.setItem('ideax_pinned_board', JSON.stringify(board));
      setPinnedBoard(board);
      if (type === 'special_zone') {
        setSpecialZone(id as SpecialZone);
        setSelectedSubcategory('全部');
        recordUserSpecialZone(currentUser.id, id);
      } else {
        setSelectedCategory((categoryName as Category) || '全部');
        setSelectedSubcategory(id);
        setSpecialZone('all');
        recordUserBoard(currentUser.id, categoryName || '', id);
      }
      setUserProfileVersion((v) => v + 1);
    }
  };

  // 點選看板就要先關閉既有已經開啟的主題專區，並記錄至該用戶之看板瀏覽偏好
  const handleSelectCategory = (cat: Category | '全部') => {
    setSelectedCategory(cat);
    if (cat === '全部') {
      setSelectedSubcategory('全部');
    } else {
      recordUserBoard(currentUser.id, cat, '全部');
      setUserProfileVersion((v) => v + 1);
    }
    setSpecialZone('all');
  };

  const handleSelectSubcategory = (sub: string | '全部') => {
    setSelectedSubcategory(sub);
    if (sub !== '全部') {
      recordUserBoard(currentUser.id, selectedCategory, sub);
      setUserProfileVersion((v) => v + 1);
    }
    setSpecialZone('all');
  };

  const handleSelectSpecialZone = (zone: SpecialZone) => {
    setSpecialZone(zone);
    if (zone !== 'all') {
      recordUserSpecialZone(currentUser.id, zone);
      setUserProfileVersion((v) => v + 1);
    }
  };

  // 手機app模式，開啟後會自動滾動到探索市場位置
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      const timer = setTimeout(() => {
        const el = document.getElementById('market-grid');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Specific sub-view flag when submitting answer to a question in full page mode
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [submitInitialType, setSubmitInitialType] = useState<'discussion' | 'solution'>('solution');
  const [aboutPageSection, setAboutPageSection] = useState<string>('story');

  // Scroll to top when switching activeTab
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // Guest intercept: if guest tries to view personal center or my projects, redirect to login
  useEffect(() => {
    if (currentUser.id === 'user-guest' && (activeTab === 'user_dashboard' || activeTab === 'my_projects')) {
      setActiveTab('explore');
      openAuthModal('login');
    }
  }, [currentUser.id, activeTab, openAuthModal]);

  // Read URL query parameter ?q= or ?questionId= or #q= on load/change to support direct links
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const parseAndOpenQuestion = () => {
      let targetQId: string | null = null;
      
      // 1. Check search params: ?q=xxx or ?questionId=xxx
      const params = new URLSearchParams(window.location.search);
      targetQId = params.get('q') || params.get('questionId');

      // 2. Check hash: #q=xxx or #/question/xxx
      if (!targetQId && window.location.hash) {
        const hashStr = window.location.hash.replace(/^#/, '');
        const hashParams = new URLSearchParams(hashStr.startsWith('?') ? hashStr.slice(1) : hashStr);
        targetQId = hashParams.get('q') || hashParams.get('questionId');

        if (!targetQId && hashStr.startsWith('/question/')) {
          targetQId = hashStr.replace('/question/', '').split('?')[0];
        }
      }

      if (targetQId && questions.length > 0) {
        const found = questions.find((q) => q.id === targetQId);
        if (found) {
          setSelectedQuestion(found);
          setActiveTab('question_detail');
          setIsSubmittingAnswer(false);
        }
      }
    };

    parseAndOpenQuestion();

    window.addEventListener('popstate', parseAndOpenQuestion);
    window.addEventListener('hashchange', parseAndOpenQuestion);

    return () => {
      window.removeEventListener('popstate', parseAndOpenQuestion);
      window.removeEventListener('hashchange', parseAndOpenQuestion);
    };
  }, [questions]);

  // Synchronize browser URL & dynamic SEO (Title, Description, Schema.org QAPage)
  useEffect(() => {
    updateSEOForQuestion(selectedQuestion, answers);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (selectedQuestion) {
        url.searchParams.set('q', selectedQuestion.id);
      } else {
        url.searchParams.delete('q');
        url.searchParams.delete('questionId');
      }
      window.history.replaceState({}, '', url.toString());
    }
  }, [selectedQuestion, answers]);

  // Filter & Sort questions with comprehensive search covering:
  // - 內文 (Question description, AI analysis, all answer freePreview / fullContent, meeting agendas, phase deliverables)
  // - 標題 (Question title, proposal titles)
  // - 問題 (Categories, subcategories, tags, problem levels, postTypes: 痛點/討論/解答, status)
  // - 人物帳號 (Author name, author ID/account, author title, answer solver name, solver ID, solver title, solvers directory)
  // 基礎有效問題池：已排除管理員下架、已過期之案件；若非測試環境（正式營運模式）則排除模擬數據
  const baseQuestions = useMemo(() => {
    return (isDemoMode
      ? questions
      : questions.filter((q) => !isMockQuestionId(q.id, q.authorId))
    ).filter((q) => {
      // 1. 排除已被管理員下架的問題
      if (q.status === 'delisted') return false;

      // 2. 顯示出來的問題不包含過期的（以截止日當日 23:59:59 為最終截止線，過期不顯示）
      if (isQuestionExpired(q.deadline)) {
        return false;
      }

      // 3. 已有人提案或接案的問題，只要期限還沒過一樣顯示
      return true;
    });
  }, [questions, isDemoMode]);

  // 各主分類看板之真實問題總數計算（解決非測試環境總題數是零但個別看板錯誤顯示數字之問題）
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      創新創業: 0,
      專業問題: 0,
      學術探討: 0,
      日常疑難: 0,
    };
    baseQuestions.forEach((q) => {
      if (counts[q.category] !== undefined) {
        counts[q.category]++;
      }
    });
    return counts;
  }, [baseQuestions]);

  const filteredQuestions = useMemo(() => {
    const qTerm = searchQuery.trim().toLowerCase();

    return baseQuestions
      .filter((q) => {
        const matchesCategory = selectedCategory === '全部' || q.category === selectedCategory;
        const matchesSubcategory =
          selectedSubcategory === '全部' ||
          q.subcategory === selectedSubcategory ||
          q.tags.includes(selectedSubcategory);
        const matchesLevel = selectedLevel === '全部' || q.level === selectedLevel;

        // Special zone filtering (此二分類與看板類型不衝突)
        let matchesSpecialZone = true;
        if (specialZone === 'pain_points') {
          // 痛點專區：透過提出痛點提出的問題和標註痛點/創點子的問題
          matchesSpecialZone =
            q.postType === 'pain_point' ||
            q.tags.some((t) => t.includes('痛點') || t.includes('創點子')) ||
            q.title.includes('痛點') ||
            q.description.includes('痛點');
        } else if (specialZone === 'l0_discussion') {
          // L0問題討論專區：包含所有L0的問題和點選閒聊討論提出的問題
          matchesSpecialZone =
            q.level === 'L0' ||
            q.postType === 'chat_discussion' ||
            q.tags.some((t) => t.includes('L0') || t.includes('閒聊') || t.includes('討論'));
        }

        if (!matchesSpecialZone) return false;

        // 核心規則：推播的問題必須在其對應的主題出現，如果某位用戶不關注這個推播問題的主題那就不要把這個問題放在這位用戶的推薦推播名單
        const isPromoted = q.status === 'open' && q.isFeatured;
        if (sortBy === 'recruiting_promoted' && isPromoted) {
          const profile = getUserInterestProfile(currentUser.id);
          const hasInterestHistory =
            profile.categories.length > 0 ||
            profile.subcategories.length > 0 ||
            profile.keywords.length > 0 ||
            profile.tags.length > 0 ||
            profile.specialZones.length > 0;

          if (hasInterestHistory) {
            const isInterested = isUserInterestedInQuestionTopic(q, profile);
            if (!isInterested) {
              return false;
            }
          }
        }

        if (!qTerm) {
          return matchesCategory && matchesSubcategory && matchesLevel;
        }

        // 1. 標題 (問題標題)
        const matchTitle = q.title.toLowerCase().includes(qTerm);

        // 2. 內文 (問題詳細背景說明與描述)
        const matchDescription = q.description.toLowerCase().includes(qTerm);

        // 3. 內文 (所有關聯解答方案與留言之內文、完整內容、交付大綱、附件名稱、多階段說明)
        const questionAnswers = answers.filter((a) => a.questionId === q.id);
        const matchAnswersContent = questionAnswers.some((a) => {
          const matchPreview = a.freePreview && a.freePreview.toLowerCase().includes(qTerm);
          const matchFull = a.fullContent && a.fullContent.toLowerCase().includes(qTerm);
          const matchDelivery = a.deliveryType && a.deliveryType.toLowerCase().includes(qTerm);
          const matchMeeting = a.meetingDetails && (
            a.meetingDetails.meetingAgenda.toLowerCase().includes(qTerm) ||
            a.meetingDetails.availableTimeSlots.toLowerCase().includes(qTerm)
          );
          const matchAtt = a.attachments && a.attachments.some((att) => att.name.toLowerCase().includes(qTerm));
          const matchPhases = a.phases && a.phases.some((ph) =>
            ph.title.toLowerCase().includes(qTerm) ||
            ph.description.toLowerCase().includes(qTerm) ||
            (ph.submittedContent && ph.submittedContent.toLowerCase().includes(qTerm))
          );
          return matchPreview || matchFull || matchDelivery || matchMeeting || matchAtt || matchPhases;
        });

        // 4. 問題 (主分類、次分類、標籤、問題等級、問題類型)
        const matchCategory =
          q.category.toLowerCase().includes(qTerm) ||
          (q.subcategory && q.subcategory.toLowerCase().includes(qTerm));
        const matchTags = q.tags.some((t) => t.toLowerCase().includes(qTerm));
        const matchLevel =
          q.level.toLowerCase().includes(qTerm) ||
          (qTerm === 'l0' && q.level === 'L0') ||
          (qTerm === 'l1' && q.level === 'L1') ||
          (qTerm === 'l2' && q.level === 'L2') ||
          (qTerm === 'l3' && q.level === 'L3') ||
          (qTerm === 'l4' && q.level === 'L4');
        const matchPostType =
          (q.postType === 'pain_point' && (qTerm.includes('痛點') || '痛點'.includes(qTerm))) ||
          (q.postType === 'chat_discussion' && (qTerm.includes('討論') || qTerm.includes('閒聊') || '閒聊'.includes(qTerm))) ||
          (q.postType === 'seek_solution' && (qTerm.includes('解答') || qTerm.includes('懸賞') || '懸賞'.includes(qTerm)));
        const matchStatus =
          (q.status === 'open' && (qTerm.includes('招募中') || qTerm.includes('進行中') || qTerm.includes('待解'))) ||
          (q.status === 'solved' && (qTerm.includes('已解決') || qTerm.includes('已採納')));

        // 5. 人物帳號 (提問者姓名、帳號 ID、頭銜)
        const matchAuthor =
          q.authorName.toLowerCase().includes(qTerm) ||
          q.authorId.toLowerCase().includes(qTerm) ||
          (q.authorTitle && q.authorTitle.toLowerCase().includes(qTerm));

        // 6. 人物帳號 (解答專家姓名、專家帳號 ID、專家職稱頭銜)
        const matchAnswerers = questionAnswers.some(
          (a) =>
            a.solverName.toLowerCase().includes(qTerm) ||
            a.solverId.toLowerCase().includes(qTerm) ||
            a.solverTitle.toLowerCase().includes(qTerm)
        );

        // 7. AI 分析內文與專家畫像維度
        const matchAI =
          q.aiAnalysis &&
          (q.aiAnalysis.summary.toLowerCase().includes(qTerm) ||
            q.aiAnalysis.solverProfileAdvice.toLowerCase().includes(qTerm) ||
            q.aiAnalysis.structuredNeed.some((n) => n.toLowerCase().includes(qTerm)));

        // 8. 智庫人物帳號連動（若搜尋某專家之帳號 ID、姓名、技能或簡介，關聯適配該領域問題）
        const matchedSolvers = solvers.filter((s) =>
          s.name.toLowerCase().includes(qTerm) ||
          s.id.toLowerCase().includes(qTerm) ||
          s.title.toLowerCase().includes(qTerm) ||
          (s.bio && s.bio.toLowerCase().includes(qTerm)) ||
          s.skills.some((sk) => sk.toLowerCase().includes(qTerm))
        );
        const matchSolverDomain = matchedSolvers.some(
          (s) =>
            s.id === q.authorId ||
            questionAnswers.some((a) => a.solverId === s.id) ||
            s.domain === q.category ||
            s.subcategory === q.subcategory
        );

        const matchesSearch =
          matchTitle ||
          matchDescription ||
          matchAnswersContent ||
          matchCategory ||
          matchTags ||
          matchLevel ||
          matchPostType ||
          matchStatus ||
          matchAuthor ||
          matchAnswerers ||
          matchAI ||
          matchSolverDomain;

        return matchesCategory && matchesSubcategory && matchesLevel && matchesSearch;
      })
      .sort((a, b) => {
        // 1. 推薦（推播問題置頂並注明「招募中」，推播問題與其餘問題一律嚴格按照時間由新到舊排序）
        if (sortBy === 'recruiting_promoted') {
          const isPromotedA = a.status === 'open' && a.isFeatured;
          const isPromotedB = b.status === 'open' && b.isFeatured;

          // 1. 推播問題優先排在推薦的最上面
          if (isPromotedA && !isPromotedB) {
            return -1;
          }
          if (!isPromotedA && isPromotedB) {
            return 1;
          }

          // 2. 若皆為推播問題（推播問題群內部），或皆為其餘問題，一律按照時間由新到舊（最新發布排最前）排序
          const timeA = new Date(a.createdAt).getTime();
          const timeB = new Date(b.createdAt).getTime();
          if (timeB !== timeA) {
            return timeB - timeA;
          }
          return b.id.localeCompare(a.id);
        }

        // 2. 最多解答（方案數最多）
        if (sortBy === 'most_solutions') {
          const aSolutions = answers.filter((ans) => ans.questionId === a.id && (ans.type === 'solution' || !ans.type)).length;
          const bSolutions = answers.filter((ans) => ans.questionId === b.id && (ans.type === 'solution' || !ans.type)).length;
          if (bSolutions !== aSolutions) {
            return bSolutions - aSolutions;
          }
          return b.answersCount - a.answersCount;
        }

        // 3. 熱烈討論（討論數）
        if (sortBy === 'most_discussions') {
          const aDiscussions = answers.filter((ans) => ans.questionId === a.id && ans.type === 'discussion').length;
          const bDiscussions = answers.filter((ans) => ans.questionId === b.id && ans.type === 'discussion').length;
          if (bDiscussions !== aDiscussions) {
            return bDiscussions - aDiscussions;
          }
          return b.views - a.views;
        }

        // 4. 最高懸賞
        if (sortBy === 'highest_bounty') {
          if (b.bounty !== a.bounty) {
            return b.bounty - a.bounty;
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [
    questions,
    answers,
    solvers,
    selectedCategory,
    selectedSubcategory,
    selectedLevel,
    specialZone,
    sortBy,
    searchQuery,
    currentUser.id,
    userProfileVersion,
    isDemoMode,
  ]);

  // 搜尋專用：匹配專家智庫與全站人物帳號清單 (支援 ID 與姓名搜尋)
  const matchingSolvers = useMemo(() => {
    const qTerm = searchQuery.trim().toLowerCase();
    if (!qTerm) return [];

    const userMap = new Map<string, {
      id: string;
      name: string;
      avatar: string;
      title: string;
      domain?: string;
      role?: string;
      rating?: number;
      skills?: string[];
      bio?: string;
      isSolver?: boolean;
      solverObj?: any;
    }>();

    availableUsers.forEach((u) => {
      userMap.set(u.id, {
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        title: u.title || (u.role === 'admin' ? '平台管理員' : u.role === 'solver' ? '解答專家' : '提問者'),
        domain: u.domain,
        role: u.role,
        skills: u.skills || [],
        bio: u.bio,
      });
    });

    solvers.forEach((s) => {
      const existing = userMap.get(s.id);
      if (existing) {
        existing.isSolver = true;
        existing.solverObj = s;
        if (s.title) existing.title = s.title;
        if (s.domain) existing.domain = s.domain;
        if (s.rating) existing.rating = s.rating;
        if (s.skills) existing.skills = s.skills;
      } else {
        userMap.set(s.id, {
          id: s.id,
          name: s.name,
          avatar: s.avatar,
          title: s.title || '智庫專家',
          domain: s.domain,
          role: 'solver',
          rating: s.rating,
          skills: s.skills || [],
          bio: s.bio,
          isSolver: true,
          solverObj: s,
        });
      }
    });

    return Array.from(userMap.values()).filter((s) => {
      const matchName = s.name.toLowerCase().includes(qTerm);
      const matchId = s.id.toLowerCase().includes(qTerm);
      const matchTitle = s.title.toLowerCase().includes(qTerm);
      const matchBio = s.bio && s.bio.toLowerCase().includes(qTerm);
      const matchSkills = s.skills && s.skills.some((sk) => sk.toLowerCase().includes(qTerm));
      const matchDomain = s.domain && s.domain.toLowerCase().includes(qTerm);
      return (
        matchName ||
        matchId ||
        matchTitle ||
        matchBio ||
        matchSkills ||
        matchDomain
      );
    });
  }, [availableUsers, solvers, searchQuery]);

  const handleOpenCreateWithType = (type: PostType = 'seek_solution', identity?: 'admin' | 'platform') => {
    if (currentUser.isBlocked) {
      alert(`⚠️ 您的帳號已被管理員執行停權處分（原因：${currentUser.blockedReason || '違反平台規範'}），在解封前無法發布新問題或痛點！如有疑問請聯繫客服。`);
      return;
    }
    setInitialPostType(type);
    if (identity) {
      setInitialPublishIdentity(identity);
    }
    setActiveTab('create_question');
  };

  return (
    <div className="min-h-screen bg-stone-50/50 flex flex-col font-['Noto_Sans_TC',sans-serif] text-stone-900 selection:bg-amber-200">
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedCategory={selectedCategory}
        setSelectedCategory={handleSelectCategory}
        selectedSubcategory={selectedSubcategory}
        setSelectedSubcategory={handleSelectSubcategory}
        specialZone={specialZone}
        setSpecialZone={handleSelectSpecialZone}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSelectSort={setSortBy}
        onOpenCreateQuestion={() => handleOpenCreateWithType('seek_solution')}
        onOpenCreateQuestionWithType={handleOpenCreateWithType}
        onOpenUserDashboardTab={(tab, scrollSection) => {
          setUserDashboardTab(tab);
          setActiveTab('user_dashboard');
          if (tab === 'overview') {
            setDashboardResetCount((prev) => prev + 1);
          }
          if (scrollSection) {
            setTimeout(() => {
              const el = document.getElementById(scrollSection);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }, 180);
          }
        }}
        onOpenAiCrm={() => setActiveTab('ai_crm')}
      />

      {/* 帳號停權警告橫幅 */}
      {currentUser.isBlocked && (
        <div className="bg-rose-600 text-white px-4 py-3 shadow-md animate-in slide-in-from-top-2 z-30">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-700 text-amber-300 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm">您的帳號已被平台管理員執行停權處分（封鎖中）</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-800 text-rose-100">限制操作</span>
                </div>
                <p className="text-rose-100 mt-0.5">
                  封鎖原因：<strong>{currentUser.blockedReason || '違反平台規範'}</strong>
                  {currentUser.blockedUntil && (
                    <span className="ml-2">
                      · 期限：<strong>{currentUser.blockedUntil === 'permanent' ? '永久封鎖' : `至 ${new Date(currentUser.blockedUntil).toLocaleString('zh-TW')}`}</strong>
                    </span>
                  )}
                  <span className="ml-2">· 停權期間無法發布問題、提交方案或發送私聊</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => openCustomerService({ subject: '帳號停權處分申訴' })}
              className="px-3.5 py-1.5 bg-white hover:bg-rose-50 text-rose-900 font-bold rounded-xl transition-colors shrink-0 text-center cursor-pointer shadow-xs"
            >
              聯繫客服申訴
            </button>
          </div>
        </div>
      )}

      {/* Main Full-Page Views */}
      <main className="flex-1 pb-16 lg:pb-0">
        {/* 1. Explore Tab: Market Grid & Hero */}
        {activeTab === 'explore' && (
          <div>
            {/* Hero Section */}
            <HeroSection
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              onPostClick={() => handleOpenCreateWithType('seek_solution')}
              onPostPainPointClick={() => handleOpenCreateWithType('pain_point')}
              onExploreClick={() => {
                const el = document.getElementById('market-grid');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              onLeaderboardClick={() => {
                setSortBy('highest_bounty');
                const el = document.getElementById('market-grid');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            {/* Questions Market Grid Section */}
            <div id="market-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              <div className="space-y-6">
                {/* Special Zone Banners */}
                {specialZone === 'pain_points' && (
                  <div className="p-4 rounded-3xl bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 border border-rose-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-xs shrink-0">
                        <Flame className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
                          <span>創點子 / 痛點專區</span>
                          <button
                            onClick={() => handleTogglePin('special_zone', 'pain_points')}
                            className={`p-1 rounded-lg transition-all cursor-pointer ${
                              pinnedBoard?.type === 'special_zone' && pinnedBoard?.id === 'pain_points'
                                ? 'bg-rose-100 text-rose-700 border border-rose-300'
                                : 'bg-white hover:bg-stone-50 text-stone-400 hover:text-stone-600 border border-stone-200 shadow-2xs'
                            }`}
                            title={pinnedBoard?.type === 'special_zone' && pinnedBoard?.id === 'pain_points' ? '取消釘選此專區' : '將此專區設為起始畫面'}
                          >
                            <Pin className={`w-3.5 h-3.5 ${pinnedBoard?.type === 'special_zone' && pinnedBoard?.id === 'pain_points' ? 'fill-rose-500' : ''}`} />
                          </button>
                          <span className="text-xs font-mono font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                            {filteredQuestions.length} 則
                          </span>
                        </h3>
                        <HelpTooltip
                          title="創點子 / 痛點專區說明"
                          content="匯集真實生活與產業未解痛點。發布痛點 0 元免費上架，各界專家可自訂解鎖金額提供落地解法，由第三方金流安全託管拆款。"
                          onLearnMore={() => setActiveTab('about')}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenCreateWithType('pain_point')}
                        className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Flame className="w-3.5 h-3.5" />
                        <span>提出新痛點</span>
                      </button>
                      <button
                        onClick={() => setSpecialZone('all')}
                        className="p-2 rounded-xl bg-white hover:bg-stone-100 text-stone-600 border border-stone-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        title="離開專區，返回問題市場"
                      >
                        <X className="w-4 h-4" />
                        <span className="hidden sm:inline">返回問題市場</span>
                      </button>
                    </div>
                  </div>
                )}

                {specialZone === 'l0_discussion' && (
                  <div className="p-4 rounded-3xl bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50 border border-blue-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                        <MessageCircle className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
                          <span>L0問題討論專區</span>
                          <button
                            onClick={() => handleTogglePin('special_zone', 'l0_discussion')}
                            className={`p-1 rounded-lg transition-all cursor-pointer ${
                              pinnedBoard?.type === 'special_zone' && pinnedBoard?.id === 'l0_discussion'
                                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                : 'bg-white hover:bg-stone-50 text-stone-400 hover:text-stone-600 border border-stone-200 shadow-2xs'
                            }`}
                            title={pinnedBoard?.type === 'special_zone' && pinnedBoard?.id === 'l0_discussion' ? '取消釘選此專區' : '將此專區設為起始畫面'}
                          >
                            <Pin className={`w-3.5 h-3.5 ${pinnedBoard?.type === 'special_zone' && pinnedBoard?.id === 'l0_discussion' ? 'fill-blue-500' : ''}`} />
                          </button>
                          <span className="text-xs font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                            {filteredQuestions.length} 則
                          </span>
                        </h3>
                        <HelpTooltip
                          title="L0問題討論專區說明"
                          content="無門檻日常交流、閒聊討論、觀點碰撞與輕量求助。完全免費公開，適合社群激盪與早期方向探索。"
                          onLearnMore={() => setActiveTab('about')}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenCreateWithType('chat_discussion')}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>發布閒聊討論</span>
                      </button>
                      <button
                        onClick={() => setSpecialZone('all')}
                        className="p-2 rounded-xl bg-white hover:bg-stone-100 text-stone-600 border border-stone-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        title="離開專區，返回問題市場"
                      >
                        <X className="w-4 h-4" />
                        <span className="hidden sm:inline">返回問題市場</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Section Header & Filters */}
                {!(specialZone !== 'all' || (selectedCategory !== '全部' && selectedSubcategory !== '全部')) && (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
                          <span>探索問題市場</span>
                          <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200 font-mono">
                            {filteredQuestions.length} 則待解
                          </span>
                        </h2>
                        <HelpTooltip
                          title="問題市場運作說明"
                          content="瀏覽來自創業家、企業負責人與各界團隊提出的真實難題。買方懸賞金額由第三方支付獨立託管，提問者驗收採納後系統自動拆款撥付至專家銀行帳戶。"
                          onLearnMore={() => setActiveTab('about')}
                        />
                      </div>

                      <button
                        onClick={() => handleOpenCreateWithType('seek_solution')}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer self-start sm:self-auto"
                      >
                        <MessageSquarePlus className="w-4 h-4" />
                        <span>我有新難題，立即發布</span>
                      </button>
                    </div>

                    {/* Filter controls */}
                    <CategoryFilter
                      categories={CATEGORIES}
                      selectedCategory={selectedCategory}
                      setSelectedCategory={handleSelectCategory}
                      selectedSubcategory={selectedSubcategory}
                      setSelectedSubcategory={handleSelectSubcategory}
                      searchQuery={searchQuery}
                      setSearchQuery={setSearchQuery}
                      selectedLevel={selectedLevel}
                      setSelectedLevel={setSelectedLevel}
                      sortBy={sortBy}
                      setSortBy={setSortBy}
                      totalCount={filteredQuestions.length}
                      categoryCounts={categoryCounts}
                    />
                  </>
                )}

                {/* 相符人物與專家帳號 (搜尋時即時展示相符的人物帳號) */}
                {searchQuery.trim() && matchingSolvers.length > 0 && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-2xs space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-amber-700" />
                        <h3 className="text-xs sm:text-sm font-black text-amber-950">
                          相符人物與專家帳號 ({matchingSolvers.length})
                        </h3>
                        <span className="text-[11px] text-amber-800 hidden sm:inline">
                          含帳號 ID、姓名、頭銜或專長標籤符合「{searchQuery}」
                        </span>
                      </div>
                      <button
                        onClick={() => setActiveTab('solvers')}
                        className="text-xs font-bold text-amber-800 hover:text-amber-950 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>查看全部專家名冊</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {matchingSolvers.slice(0, 4).map((solver) => (
                        <div
                          key={solver.id}
                          className="p-3 bg-white rounded-xl border border-amber-200/90 hover:border-amber-400 hover:shadow-sm transition-all flex flex-col justify-between gap-2 group"
                        >
                          <div
                            onClick={() => {
                              if (solver.solverObj) {
                                setSelectedSolver(solver.solverObj);
                                setActiveTab('solver_profile');
                              } else {
                                setSearchQuery(solver.id);
                              }
                            }}
                            className="flex items-center gap-2.5 cursor-pointer"
                          >
                            <img
                              src={solver.avatar}
                              alt={solver.name}
                              className="w-10 h-10 rounded-full object-cover border border-stone-200 group-hover:scale-105 transition-transform shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-xs text-stone-900 group-hover:text-amber-900 truncate">
                                  {solver.name}
                                </span>
                                <span className="text-[10px] text-stone-400 font-mono">
                                  @{solver.id}
                                </span>
                              </div>
                              <p className="text-[11px] text-stone-500 truncate mt-0.5">
                                {solver.title}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1">
                                {solver.domain && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-semibold">
                                    {solver.domain}
                                  </span>
                                )}
                                {solver.rating && (
                                  <span className="text-[10px] text-amber-600 font-bold">
                                    ★ {solver.rating.toFixed(1)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between gap-1">
                            <span className="text-[10px] text-stone-400 font-mono truncate">
                              ID: {solver.id}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (currentUser.id === solver.id) {
                                  alert('這是您自己的帳號！');
                                  return;
                                }
                                startDirectChat({
                                  id: solver.id,
                                  name: solver.name,
                                  avatar: solver.avatar,
                                  title: solver.title,
                                });
                                setActiveTab('chat');
                              }}
                              className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-95 text-stone-950 font-bold text-[10px] shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <MessageCircle className="w-2.5 h-2.5" />
                              <span>私聊</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 子領域專屬版面看板 (當選中特定子領域時顯示) */}
                {selectedCategory !== '全部' && selectedSubcategory !== '全部' && (
                  <SubcategoryBoardBanner
                    category={selectedCategory}
                    subcategory={selectedSubcategory}
                    totalQuestionsCount={filteredQuestions.length}
                    totalBountyAmount={isNoPaymentMode || !isDemoMode ? 0 : filteredQuestions.reduce((acc, q) => acc + q.bounty, 0)}
                    onOpenCreateQuestion={() => setActiveTab('create_question')}
                    onSelectCategory={(cat, sub = '全部') => {
                      handleSelectCategory(cat);
                      handleSelectSubcategory(sub);
                    }}
                    isPinned={pinnedBoard?.type === 'subcategory' && pinnedBoard?.id === selectedSubcategory}
                    onTogglePin={() => handleTogglePin('subcategory', selectedSubcategory, selectedCategory)}
                    onSearchTag={handleSearchTag}
                  />
                )}

                {/* Questions Grid */}
                {filteredQuestions.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-stone-300 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 mx-auto flex items-center justify-center">
                      <Filter className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-base text-stone-900">沒有找到相符的問題</h3>
                    <p className="text-xs text-stone-500 max-w-sm mx-auto">
                      試著放寬篩選條件或切換分類，或是成為第一個針對此主題提出懸賞提問的人！
                    </p>
                    <button
                      onClick={() => {
                        setSelectedCategory('全部');
                        setSelectedSubcategory('全部');
                        setSelectedLevel('全部');
                        setSearchQuery('');
                        setSortBy('recruiting_promoted');
                      }}
                      className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors cursor-pointer"
                    >
                      重置所有篩選
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredQuestions.map((q) => {
                      const questionAnswers = answers.filter((a) => a.questionId === q.id);
                      const solutionsCount = questionAnswers.filter((a) => a.type === 'solution' || !a.type).length;
                      const discussionsCount = questionAnswers.filter((a) => a.type === 'discussion').length;

                      return (
                        <QuestionCard
                          key={q.id}
                          question={q}
                          solutionsCount={solutionsCount}
                          discussionsCount={discussionsCount}
                          onSelectCategory={(cat, sub) => {
                            setSelectedCategory(cat);
                            if (sub) setSelectedSubcategory(sub);
                          }}
                          onSearchTag={handleSearchTag}
                          onClick={() => {
                            incrementQuestionViews(q.id, 1);
                            recordUserViewedQuestion(currentUser.id, q);
                            setUserProfileVersion((v) => v + 1);
                            setSelectedQuestion(q);
                            setActiveTab('question_detail');
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. Solvers Tab: Certified Experts */}
        {activeTab === 'solvers' && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-2 sm:pt-6 pb-8 sm:pb-10">
            <SolversView
              onSelectSolver={(solver) => {
                setSelectedSolver(solver);
                setActiveTab('solver_profile');
              }}
              onPostQuestionForSolver={(solver) => {
                setSelectedSolver(solver);
                setActiveTab('create_question');
              }}
              onOpenChat={() => {
                setActiveTab('chat');
              }}
              onNavigateToLeaderboard={() => {
                setActiveTab('leaderboard');
              }}
              onPostQuestion={() => handleOpenCreateWithType('seek_solution')}
            />
          </div>
        )}

        {/* 3. Mechanism Tab (轉向關於我們金流運作) */}
        {activeTab === 'mechanism' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <AboutUsView onBack={() => setActiveTab('explore')} initialSection="finance" />
          </div>
        )}

        {/* 3.1 Leaderboard Tab: 交易榮譽榜 & 數據化激勵 */}
        {activeTab === 'leaderboard' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <LeaderboardView
              onSelectSolver={(solver) => {
                setSelectedSolver(solver);
                setActiveTab('solver_profile');
              }}
              onSelectQuestion={(qId: string) => {
                const found = questions.find((q) => q.id === qId);
                if (found) {
                  setSelectedQuestion(found);
                  setActiveTab('question_detail');
                }
              }}
              onNavigateToSolvers={() => {
                setActiveTab('solvers');
                setSelectedQuestion(null);
                setSelectedSolver(null);
              }}
            />
          </div>
        )}

        {/* 3.2 About Us Tab: 關於我們與條款三大項 */}
        {activeTab === 'about' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <AboutUsView key={aboutPageSection} initialSection={aboutPageSection} onBack={() => setActiveTab('explore')} />
          </div>
        )}

        {/* 3.3 My Projects Tab: 我的案件專屬獨立頁面 */}
        {activeTab === 'my_projects' && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3.5 sm:pt-6 pb-6 sm:py-8">
            <MyProjectsView
              onOpenQuestion={(qId: string) => {
                const found = questions.find((q) => q.id === qId);
                if (found) {
                  setSelectedQuestion(found);
                  setActiveTab('question_detail');
                }
              }}
            />
          </div>
        )}

        {/* 4. Question Detail Full Page */}
        {activeTab === 'question_detail' && selectedQuestion && !isSubmittingAnswer && (
          <QuestionDetailModal
            isFullPage={true}
            question={selectedQuestion}
            onClose={() => {
              setSelectedQuestion(null);
              setActiveTab('explore');
            }}
            onOpenSubmitAnswer={(initialType) => {
              setSubmitInitialType(initialType || 'solution');
              setIsSubmittingAnswer(true);
            }}
            onSelectSolver={(solver) => {
              setSelectedSolver(solver);
              setActiveTab('solver_profile');
            }}
            onOpenChatWithUser={() => {
              setActiveTab('chat');
            }}
            onSelectCategory={(cat, sub = '全部') => {
              setSelectedCategory(cat);
              setSelectedSubcategory(sub);
              setSelectedQuestion(null);
              setActiveTab('explore');
            }}
            onSearchTag={handleSearchTag}
          />
        )}

        {/* 4.1 Submit Answer Full Page (under question) */}
        {activeTab === 'question_detail' && selectedQuestion && isSubmittingAnswer && (
          <SubmitAnswerModal
            isFullPage={true}
            question={selectedQuestion}
            initialType={submitInitialType}
            onClose={() => setIsSubmittingAnswer(false)}
            onSuccess={() => setIsSubmittingAnswer(false)}
          />
        )}

        {/* 5. Create Question Full Page */}
        {activeTab === 'create_question' && (
          <CreateQuestionModal
            isFullPage={true}
            initialPostType={initialPostType}
            initialPublishIdentity={initialPublishIdentity}
            initialCategory={selectedCategory !== '全部' ? selectedCategory : undefined}
            initialSubcategory={selectedSubcategory !== '全部' ? selectedSubcategory : undefined}
            onClose={() => setActiveTab('explore')}
            onSuccess={(newQ) => {
              setSelectedQuestion(newQ);
              setActiveTab('question_detail');
            }}
          />
        )}

        {/* 6. Solver Profile Full Page */}
        {activeTab === 'solver_profile' && selectedSolver && (
          <SolverProfileModal
            isFullPage={true}
            solver={selectedSolver}
            onClose={() => {
              setSelectedSolver(null);
              setActiveTab('solvers');
            }}
            onPostQuestion={(s) => {
              setSelectedSolver(s);
              setActiveTab('create_question');
            }}
            onOpenChat={() => {
              setActiveTab('chat');
            }}
          />
        )}

        {/* 7. User Dashboard & Personal Center Full Page */}
        {activeTab === 'user_dashboard' && (
          <UserDashboardModal
            key={`dashboard_${userDashboardTab}_${dashboardResetCount}`}
            initialTab={userDashboardTab}
            isFullPage={true}
            onClose={() => setActiveTab('explore')}
            onNavigateToTerms={() => setActiveTab('about')}
            onOpenAiCrm={() => setActiveTab('ai_crm')}
            onOpenQuestion={(qId) => {
              const found = questions.find((q) => q.id === qId);
              if (found) {
                setSelectedQuestion(found);
                setActiveTab('question_detail');
              }
            }}
          />
        )}

        {/* 8. Admin Dashboard & Commission Settings Full Page */}
        {activeTab === 'admin_dashboard' && (
          <AdminDashboardModal
            isFullPage={true}
            onClose={() => setActiveTab('explore')}
          />
        )}

        {/* 9. Chat & Direct Transaction Room Full Page */}
        {activeTab === 'chat' && (
          <ChatView
            onOpenAiCrm={() => setActiveTab('ai_crm')}
            onOpenAdminMailDisputes={() => {
              setUserDashboardTab('admin_mail_disputes');
              setActiveTab('user_dashboard');
            }}
          />
        )}

        {/* 10. AI-CRM Full Page (大師方案專屬主動客戶關係管理系統) */}
        {activeTab === 'ai_crm' && (
          <AiCrmView
            onBack={() => {
              if (currentUser.role === 'admin') {
                setUserDashboardTab('admin_aicrm');
                setActiveTab('user_dashboard');
              } else {
                setActiveTab('explore');
              }
            }}
            onOpenDirectChat={() => {
              setActiveTab('chat');
            }}
          />
        )}

        {/* Fallback if question_detail or solver_profile has no item selected */}
        {((activeTab === 'question_detail' && !selectedQuestion) ||
          (activeTab === 'solver_profile' && !selectedSolver)) && (
          <div className="max-w-md mx-auto my-16 text-center p-8 bg-white rounded-3xl border border-stone-200">
            <p className="text-sm font-bold text-stone-700 mb-4">查無此內容或尚未選擇項目</p>
            <button
              onClick={() => setActiveTab('explore')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-900 rounded-xl text-xs font-bold cursor-pointer"
            >
              返回問題市場
            </button>
          </div>
        )}
      </main>

      {/* Paywall Unlock Full Page Overlay / Modal */}
      {targetAnswerToUnlock && (
        <UnlockPaywallModal
          isFullPage={true}
          answer={targetAnswerToUnlock}
          onClose={() => setTargetAnswerToUnlock(null)}
          onSuccess={() => setTargetAnswerToUnlock(null)}
        />
      )}

      {/* 關於我們與條款彈窗 */}
      <AboutUsModal
        isOpen={isAboutModalOpen}
        onClose={closeAboutModal}
        initialSection={aboutModalInitialSection}
      />

      {/* 官方客服與爭議仲裁中心彈窗 */}
      <CustomerServiceModal />

      {/* 取消釘選看板提示彈窗 */}
      {unpinConfirmOpen && (
        <div
          onClick={() => setUnpinConfirmOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-stone-200 p-6 space-y-4 animate-in zoom-in-95 duration-150 text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-2xs">
              <Pin className="w-6 h-6 text-amber-700" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-stone-900">取消預設看板</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                若取消釘選將不會將此主題作為預設看板。您確定取消釘選嗎？
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    performUnpin();
                    setUnpinConfirmOpen(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-black text-xs shadow-xs transition-colors cursor-pointer"
                >
                  是
                </button>
                <button
                  type="button"
                  onClick={() => setUnpinConfirmOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  否
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('ideax_unpin_skip_prompt', 'true');
                  performUnpin();
                  setUnpinConfirmOpen(false);
                }}
                className="w-full py-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-50 text-[11px] font-medium transition-colors cursor-pointer"
              >
                不再提醒
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer
        onNavClick={(tab, section) => {
          if (section) {
            setAboutPageSection(section);
          } else if (tab === 'about') {
            setAboutPageSection('story');
          }
          setActiveTab(tab);
        }}
        onPostClick={() => setActiveTab('create_question')}
        onSearchTag={(tag) => setSearchQuery(tag)}
      />

      {/* 手機行動裝置專屬底部導覽列 (僅限移動裝置版，電腦桌面版完全隱藏) */}
      <MobileBottomNav
        activeTab={activeTab}
        userDashboardTab={userDashboardTab}
        onNavigate={(tab) => {
          setSelectedQuestion(null);
          setSelectedSolver(null);
          if (currentUser.id === 'user-guest' && (tab === 'user_dashboard' || tab === 'my_projects')) {
            openAuthModal('login');
            return;
          }
          if (tab === 'user_dashboard') {
            setUserDashboardTab('overview');
            setActiveTab('user_dashboard');
            setDashboardResetCount((prev) => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
          }
          if (tab === 'my_projects') {
            setActiveTab('my_projects');
            return;
          }
          setActiveTab(tab);
          if (tab === 'explore') {
            setTimeout(() => {
              const el = document.getElementById('market-grid');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              }
            }, 60);
          }
        }}
        onOpenCreateQuestion={() => handleOpenCreateWithType('seek_solution')}
      />

      {/* 右側浮動下載提示插件 */}
      <MobilePwaDownloadWidget />

      {/* PWA 安裝與下載指引彈窗 */}
      <PwaInstallModal
        isOpen={isPwaInstallModalOpen}
        onClose={closePwaInstallModal}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
