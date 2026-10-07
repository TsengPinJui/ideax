import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles,
  Trophy,
  Award,
  Layers,
  Calendar,
  Share2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Upload,
  ArrowRight,
  TrendingUp,
  Coins,
  ShieldCheck,
  FileText,
  Users,
  ChevronRight,
  ChevronDown,
  Filter,
  ExternalLink,
  Lock,
  Clock,
  X,
  Heart,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Globe,
  BookOpen,
  MessageSquare,
  School,
  Percent,
  LogIn,
  User as UserIcon,
  LogOut,
  Bookmark,
  Star,
  Video,
  Send,
  Briefcase,
  GraduationCap,
  Megaphone,
  ArrowUpDown,
  ArrowLeft,
  Flame,
  Compass,
  Image as ImageIcon,
  Link as LinkIcon,
  Folder,
  Download,
} from 'lucide-react';
import {
  StarSeasonProposal,
  CompetitionAccount,
  StarSeasonStage,
  StarSeasonTrack,
  STAR_SEASON_TRACKS,
  OFFICIAL_COMPETITION_TRACKS,
  COMPETITION_POINTS_CONFIG,
  DEFAULT_COMPETITION_SCHEDULE,
  ParticipantRegistrationData,
  JudgeApplicationData,
  ProposalComment,
  CompetitionHomepageStatsConfig,
  CompetitionAdminMetrics,
} from '../../types/competition';
import {
  getCompetitionHomepageStatsConfig,
  getCompetitionAggregatedMetrics,
} from '../../services/competitionAdminSync';
import {
  fetchProposals,
  fetchMyCompetitionAccount,
  claimShareBonus,
  supportProposal,
  submitProposal,
  uploadProposalAttachment,
  adminReviewProposal,
  adminConfirmAward,
  toggleLikeProposal,
  fetchUserLikedProposalIds,
  fetchProposalComments,
  postProposalComment,
  registerParticipant,
  applyJudge,
  fetchMyAmbassadorData,
  bindAmbassadorReferralCode,
} from '../../services/competitionClientService';
import { useApp } from '../../context/AppContext';
import { auth } from '../../services/firebase';
import { RulesFullPage } from './RulesFullPage';
import { SubmitProposalFullPage } from './SubmitProposalFullPage';
import { ParticipantFullPage } from './ParticipantFullPage';
import { JudgeFullPage } from './JudgeFullPage';
import { AmbassadorFullPage } from './AmbassadorFullPage';
import { ExploreProposalsFullPage } from './ExploreProposalsFullPage';
import { ProposalHeroCarousel } from './ProposalHeroCarousel';
import { CompetitionFooter } from './CompetitionFooter';
import { AdminCompetitionRulesArchiveFolder } from './AdminCompetitionRulesArchiveFolder';
import { MyProposalsAndDraftsModal } from './MyProposalsAndDraftsModal';
import { JudgeEvaluationModal } from './JudgeEvaluationModal';
import { AdminFinalEvaluationManagementModal } from './AdminFinalEvaluationManagementModal';
import { CompetitionTermsModal, CompetitionDocumentKey } from './CompetitionTermsModal';
import {
  getNominatedProposalIds,
  getIsFinalResultsPublished,
  calculateFinalProposalRankings,
  exportFinalRankingsExcel,
} from '../../services/finalEvaluationService';
import { getCompetitionExperts } from '../../services/competitionAdminSync';
import { getProposalDrafts } from '../../services/draftService';
import { getCompetitionStageInfo } from '../../utils/competitionSchedule';

export type ChallengeSubView = 'home' | 'proposal' | 'explore' | 'rules' | 'submit' | 'participant' | 'judge' | 'ambassador';

interface StarSeasonViewProps {
  onBackToOldSite: () => void;
  onGoToPainPoints?: () => void;
  onOpenAuth: () => void;
}

export const StarSeasonView: React.FC<StarSeasonViewProps> = ({
  onBackToOldSite,
  onGoToPainPoints,
  onOpenAuth,
}) => {
  const {
    currentUser,
    setCurrentUser,
    setQuestions,
    setAnswers,
    setSolvers,
    setAvailableUsers,
    addNotification,
    logoutAccount,
    openAboutModal,
  } = useApp();
  const [competitionTermsDoc, setCompetitionTermsDoc] = useState<CompetitionDocumentKey | null>(null);
  const isLoggedIn = Boolean(auth.currentUser || (currentUser && currentUser.id && currentUser.id !== 'user-guest'));
  const [proposals, setProposals] = useState<StarSeasonProposal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [account, setAccount] = useState<CompetitionAccount | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  // 首頁公開展示數據開關與即時聚合數據
  const [statsConfig, setStatsConfig] = useState<CompetitionHomepageStatsConfig>(() => getCompetitionHomepageStatsConfig());
  const [adminMetrics, setAdminMetrics] = useState<CompetitionAdminMetrics>(() => getCompetitionAggregatedMetrics());

  useEffect(() => {
    const handleConfigUpdate = (e: any) => {
      setStatsConfig(e.detail || getCompetitionHomepageStatsConfig());
      setAdminMetrics(getCompetitionAggregatedMetrics());
    };
    window.addEventListener('ideax_competition_stats_config_updated', handleConfigUpdate);
    return () => window.removeEventListener('ideax_competition_stats_config_updated', handleConfigUpdate);
  }, []);

  // 子網址滿版網頁狀態：home (總覽), proposal (探索提案), rules (競賽辦法), submit (投稿創新idea), participant (申請參賽者), judge (申請專家), ambassador (推廣大使)
  const [currentSubView, setCurrentSubView] = useState<ChallengeSubView>(() => {
    try {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname.toLowerCase();
        const search = window.location.search.toLowerCase();
        const hash = window.location.hash.toLowerCase();

        if (path.includes('/proposal') || path.includes('/proposals') || path.includes('/explore') || path.includes('/cases') || search.includes('view=proposal') || search.includes('view=explore') || search.includes('view=cases') || hash === '#proposal' || hash === '#proposals' || hash === '#explore' || hash === '#cases') return 'proposal';
        if (path.includes('/rules') || search.includes('view=rules') || hash === '#rules') return 'rules';
        if (path.includes('/submit') || search.includes('view=submit') || hash === '#submit') return 'submit';
        if (path.includes('/participant') || search.includes('view=participant') || hash === '#participant') return 'participant';
        if (path.includes('/judge') || search.includes('view=judge') || hash === '#judge') return 'judge';
        if (path.includes('/ambassador') || search.includes('view=ambassador') || hash === '#ambassador') return 'ambassador';
      }
    } catch {}
    return 'home';
  });

  const navigateToSubView = (view: ChallengeSubView) => {
    const normalizedView = view === 'explore' ? 'proposal' : view;
    setCurrentSubView(normalizedView);
    try {
      if (typeof window !== 'undefined') {
        const targetPath = normalizedView === 'home' ? '/challenge' : `/challenge/${normalizedView}`;
        window.history.pushState({ subView: normalizedView }, '', targetPath);
      }
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = () => {
      try {
        const path = window.location.pathname.toLowerCase();
        const search = window.location.search.toLowerCase();
        const hash = window.location.hash.toLowerCase();
        if (path.includes('/proposal') || path.includes('/proposals') || path.includes('/explore') || path.includes('/cases') || search.includes('view=proposal') || search.includes('view=explore') || search.includes('view=cases') || hash === '#proposal' || hash === '#proposals' || hash === '#explore' || hash === '#cases') {
          setCurrentSubView('proposal');
        } else if (path.includes('/rules') || search.includes('view=rules') || hash === '#rules') {
          setCurrentSubView('rules');
        } else if (path.includes('/submit') || search.includes('view=submit') || hash === '#submit') {
          setCurrentSubView('submit');
        } else if (path.includes('/participant') || search.includes('view=participant') || hash === '#participant') {
          setCurrentSubView('participant');
        } else if (path.includes('/judge') || search.includes('view=judge') || hash === '#judge') {
          setCurrentSubView('judge');
        } else if (path.includes('/ambassador') || search.includes('view=ambassador') || hash === '#ambassador') {
          setCurrentSubView('ambassador');
        } else {
          setCurrentSubView('home');
        }
      } catch {}
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 未登入點擊提案或成為專家等需登入功能連結到登入頁面
  useEffect(() => {
    if (
      (currentSubView === 'submit' || currentSubView === 'participant' || currentSubView === 'judge') &&
      !isLoggedIn
    ) {
      onOpenAuth();
    }
  }, [currentSubView, isLoggedIn]);

  // 排序方式：依募資額 (funding)、按讚數 (likes)、討論數 (comments)
  const [sortBy, setSortBy] = useState<'funding' | 'likes' | 'comments'>('funding');

  // 個人列表與頭像選單狀態
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState<boolean>(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // 專屬報名頁面 (可切換「參賽者」與「評審團」)
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState<boolean>(false);
  const [regModalTab, setRegModalTab] = useState<'participant' | 'judge'>('participant');

  // 管理員專屬：創星季全套規章條款與辦法封存資料夾 Modal (僅管理員可見)
  const [isAdminRulesFolderOpen, setIsAdminRulesFolderOpen] = useState<boolean>(false);

  // 決審評審專屬評分 Modal
  const [isJudgeEvaluationModalOpen, setIsJudgeEvaluationModalOpen] = useState<boolean>(false);
  const [evaluatingJudgeUser, setEvaluatingJudgeUser] = useState<{ id: string; name: string } | null>(null);

  // 管理員專屬：決選評分與全體獎勵統計總控制台
  const [isAdminFinalEvaluationHubOpen, setIsAdminFinalEvaluationHubOpen] = useState<boolean>(false);

  // 專家名單與評審身分判定 (評審身分為專家，由管理員在後台指派 isJudgeSelected = true)
  const expertsList = useMemo(() => getCompetitionExperts(), [isAdminFinalEvaluationHubOpen, isJudgeEvaluationModalOpen]);
  const isCurrentUserAppointedJudge = useMemo(() => {
    if (!currentUser || currentUser.id === 'user-guest') return false;
    const expertRec = expertsList.find(
      (e) => e.userId === currentUser.id || e.id === currentUser.id || e.expertEmail === currentUser.email
    );
    if (expertRec && expertRec.isJudgeSelected) return true;
    if ((currentUser as any).isJudgeSelected || (currentUser as any).isJudge) return true;
    return false;
  }, [currentUser, expertsList]);

  // 入選提案清單（管理員勾選後自動匯入決選評分區）
  const nominatedProposalIds = useMemo(
    () => getNominatedProposalIds(),
    [isJudgeEvaluationModalOpen, isAdminFinalEvaluationHubOpen]
  );
  const nominatedProposals = useMemo(() => {
    return proposals.filter((p) => nominatedProposalIds.includes(p.id) || p.rankQualifiedForFinal);
  }, [proposals, nominatedProposalIds]);

  // 前台是否已盛大公布榜單
  const [isFinalResultsPublishedState, setIsFinalResultsPublishedState] = useState<boolean>(() => getIsFinalResultsPublished());
  const finalRankings = useMemo(() => {
    return calculateFinalProposalRankings(proposals);
  }, [proposals, nominatedProposalIds, isAdminFinalEvaluationHubOpen, isFinalResultsPublishedState]);

  // 個人提案與草稿箱 Modal
  const [isMyProposalsModalOpen, setIsMyProposalsModalOpen] = useState<boolean>(false);
  const [proposalDraftsCount, setProposalDraftsCount] = useState<number>(0);

  useEffect(() => {
    const updateDraftsCount = () => {
      const drafts = getProposalDrafts(currentUser?.id);
      setProposalDraftsCount(drafts.length);
    };
    updateDraftsCount();
    window.addEventListener('ideax_drafts_updated', updateDraftsCount);
    return () => {
      window.removeEventListener('ideax_drafts_updated', updateDraftsCount);
    };
  }, [currentUser]);

  // 點擊痛點捷徑直接平滑滑動至痛點主題看板
  const scrollToPainPointsBoard = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (currentSubView !== 'home') {
      navigateToSubView('home');
    }
    setTimeout(() => {
      const el = document.getElementById('painpoints-board-section') || document.getElementById('cases-overview-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (onGoToPainPoints) {
        onGoToPainPoints();
      } else {
        onBackToOldSite();
      }
    }, 60);
  };

  // 創星季當前競賽階段 (痛點徵件 10/31~11/13、模擬募資與提案 11/14~12/04、決選 12/05~12/11、公布 12/16 前)
  const stageInfo = useMemo(() => getCompetitionStageInfo(), []);

  // 綠色膠囊標籤第二行：日期+XXX(階段名稱)中!
  const stageBadgeSubtitle = useMemo(() => {
    if (stageInfo.isPainPointStage) return '10/31~11/13 痛點徵件中!';
    if (stageInfo.isPreProposalStage) return '11/14~11/15 預先提案中!';
    if (stageInfo.isCrowdfundingActiveStage) return '11/16~12/04 模擬募資中!';
    if (stageInfo.isExpertReviewStage) return '12/05~12/11 進入決選(評審)中!';
    return '12/16前 公布結果中!';
  }, [stageInfo]);

  // 痛點徵件階段：點擊提出痛點
  const handleOpenPainPointSubmission = () => {
    if (!isLoggedIn) {
      onOpenAuth();
      return;
    }
    setFormStage('pain_point');
    setIsSubmitModalOpen(true);
  };

  // 個人收藏名單 (已按讚提案)
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState<boolean>(false);
  const [likedProposalIds, setLikedProposalIds] = useState<string[]>([]);

  // 提案討論留言狀態
  const [activeComments, setActiveComments] = useState<ProposalComment[]>([]);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);
  const [isLoadingComments, setIsLoadingComments] = useState<boolean>(false);

  // 參賽者報名表單（大專校院募資實戰模擬學習平台體驗規格）
  const [teamName, setTeamName] = useState<string>('');
  const [leaderName, setLeaderName] = useState<string>('');
  const [leaderPhone, setLeaderPhone] = useState<string>('');
  const [leaderEmail, setLeaderEmail] = useState<string>('');
  const [schoolName, setSchoolName] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [advisorName, setAdvisorName] = useState<string>('');
  const [teamMembersInput, setTeamMembersInput] = useState<string>('');
  const [participantTrack, setParticipantTrack] = useState<StarSeasonTrack>('ai_applications');
  const [projectTitle, setProjectTitle] = useState<string>('');
  const [participantSummary, setParticipantSummary] = useState<string>('');
  const [participantDescription, setParticipantDescription] = useState<string>('');
  const [participantSourcePainPointId, setParticipantSourcePainPointId] = useState<string>('');
  const [bpFile, setBpFile] = useState<{ url: string; name: string; size: number } | null>(null);
  const [prototypeImgFile, setPrototypeImgFile] = useState<{ url: string; name: string } | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [targetFundingAmount, setTargetFundingAmount] = useState<number>(300000);
  const [rewardPlanDescription, setRewardPlanDescription] = useState<string>('搶先體驗資格、限量特製紀念徽章、技術感謝白皮書');
  const [participantPledgeAgreed, setParticipantPledgeAgreed] = useState<boolean>(false);
  const [isSubmittingParticipant, setIsSubmittingParticipant] = useState<boolean>(false);

  // 評審團申請表單（專業評審審查）
  const [judgeName, setJudgeName] = useState<string>('');
  const [judgePhone, setJudgePhone] = useState<string>('');
  const [judgeEmail, setJudgeEmail] = useState<string>('');
  const [judgeOrg, setJudgeOrg] = useState<string>('');
  const [judgeJobTitle, setJudgeJobTitle] = useState<string>('');
  const [judgeDomain, setJudgeDomain] = useState<string>('AI 智慧與科技創新');
  const [judgeExperienceYears, setJudgeExperienceYears] = useState<number>(5);
  const [judgeCredentialsNote, setJudgeCredentialsNote] = useState<string>('');
  const [judgeProofFile, setJudgeProofFile] = useState<{ url: string; name: string } | null>(null);
  const [judgeBio, setJudgeBio] = useState<string>('');
  const [judgePledgeAgreed, setJudgePledgeAgreed] = useState<boolean>(false);
  const [isSubmittingJudge, setIsSubmittingJudge] = useState<boolean>(false);

  // 投稿創新idea 教學視窗狀態
  const [isProposalTutorialModalOpen, setIsProposalTutorialModalOpen] = useState<boolean>(false);
  const [quickPainPointSerial, setQuickPainPointSerial] = useState<string>('');
  const [selectedPainPointTopic, setSelectedPainPointTopic] = useState<{ id: string; title: string; serial?: string } | null>(null);

  const showToast = (message: string) => {
    addNotification({
      title: '創星季',
      message,
      type: 'system',
    });
  };

  // 關閉點擊外部選單
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 載入當前使用者收藏名單
  useEffect(() => {
    if (isLoggedIn) {
      fetchUserLikedProposalIds().then((ids) => {
        if (Array.isArray(ids)) setLikedProposalIds(ids);
      }).catch(() => {});
    } else {
      setLikedProposalIds([]);
    }
  }, [isLoggedIn, currentUser?.id]);

  // 篩選狀態 (預設在提案總覽全部)
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // 推廣大使推薦碼專區狀態
  const [isAmbassadorModalOpen, setIsAmbassadorModalOpen] = useState<boolean>(false);
  const [ambassadorData, setAmbassadorData] = useState<{
    referralCode?: string;
    totalReferred?: number;
    approvedCount?: number;
    commissionPending?: number;
    referrals?: Array<{
      id: string;
      proposalId: string;
      proposalTitle: string;
      authorName: string;
      status: string;
      rewardAmount: number;
      createdAt: string;
    }>;
  } | null>(null);
  const [inputReferralCode, setInputReferralCode] = useState<string>('');
  const [isBindingReferral, setIsBindingReferral] = useState<boolean>(false);
  const [isLoadingAmbassador, setIsLoadingAmbassador] = useState<boolean>(false);
  const [copiedAmbassadorCode, setCopiedAmbassadorCode] = useState<boolean>(false);
  const [copiedAmbassadorLink, setCopiedAmbassadorLink] = useState<boolean>(false);

  // 開啟推廣大使推薦碼頁面
  const handleOpenAmbassadorModal = async () => {
    setIsProfileMenuOpen(false);
    if (!isLoggedIn) {
      onOpenAuth();
      return;
    }
    setIsAmbassadorModalOpen(true);
    setIsLoadingAmbassador(true);
    try {
      const data = await fetchMyAmbassadorData();
      if (data.success) {
        setAmbassadorData(data);
      }
    } catch {}
    finally {
      setIsLoadingAmbassador(false);
    }
  };

  // 綁定輸入之推薦碼
  const handleBindReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputReferralCode.trim()) {
      showToast('請輸入推薦碼');
      return;
    }
    setIsBindingReferral(true);
    try {
      const res = await bindAmbassadorReferralCode(inputReferralCode.trim());
      if (res.success) {
        showToast(res.message);
        setInputReferralCode('');
        const data = await fetchMyAmbassadorData();
        if (data.success) setAmbassadorData(data);
      } else {
        showToast(res.message);
      }
    } catch (err: any) {
      showToast(err.message || '綁定失敗');
    } finally {
      setIsBindingReferral(false);
    }
  };

  // 彈窗狀態
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState<boolean>(false);
  const [selectedProposalForSupport, setSelectedProposalForSupport] = useState<StarSeasonProposal | null>(null);
  const [selectedProposalForDetail, setSelectedProposalForDetail] = useState<StarSeasonProposal | null>(null);
  const [supportAmount, setSupportAmount] = useState<number>(1000);
  const [isSubmittingSupport, setIsSubmittingSupport] = useState<boolean>(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0); // 預設展開第一條

  // 提案表單狀態
  const [formStage, setFormStage] = useState<StarSeasonStage>('pain_point');
  const [formTrack, setFormTrack] = useState<StarSeasonTrack>('ai_applications');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formSummary, setFormSummary] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formSourcePainPointId, setFormSourcePainPointId] = useState<string>('');
  const [formAmbassadorCode, setFormAmbassadorCode] = useState<string>('');
  const [formAttachment, setFormAttachment] = useState<{ url: string; name: string; size: number; mime: string } | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);

  // 敏感資料隔離欄位
  const [contactName, setContactName] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [schoolOrOrg, setSchoolOrOrg] = useState<string>('');
  const [bankCode, setBankCode] = useState<string>('');
  const [bankAccount, setBankAccount] = useState<string>('');
  const [idNumber, setIdNumber] = useState<string>('');
  const [isSubmittingProposal, setIsSubmittingProposal] = useState<boolean>(false);

  // 管理員後台彈窗
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState<boolean>(false);
  const [adminReviewingProposal, setAdminReviewingProposal] = useState<StarSeasonProposal | null>(null);
  const [adminReviewNote, setAdminReviewNote] = useState<string>('');
  const [adminFinalRankInput, setAdminFinalRankInput] = useState<number>(1);
  const [adminAdoptedApproved, setAdminAdoptedApproved] = useState<boolean>(true);

  // 載入資料
  const loadData = async () => {
    setLoading(true);
    try {
      const list = await fetchProposals();
      setProposals(list);
      if (auth.currentUser) {
        const accRes = await fetchMyCompetitionAccount();
        if (accRes.account) setAccount(accRes.account);
      }
    } catch (err) {
      console.warn('loadData failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.id]);

  // 第一階段痛點清單 (供第二階段解法引用)
  const painPointProposals = useMemo(() => {
    return proposals.filter((p) => p.stage === 'pain_point' && p.status === 'approved');
  }, [proposals]);

  // 全站統計指標（參賽件數、全網虛擬支持金池、社群支持熱度人次）
  const competitionStats = useMemo(() => {
    const totalCount = proposals.length;
    const totalPoints = proposals.reduce((acc, p) => acc + (p.supportPoints || 0), 0);
    const totalSupporters = proposals.reduce((acc, p) => acc + (p.supporterCount || 0), 0);
    return {
      totalCount,
      totalPoints,
      totalSupporters,
    };
  }, [proposals]);

  // 過濾後的提案列表
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      if (selectedTrack !== 'all' && p.track !== selectedTrack) return false;
      if (selectedStage !== 'all' && p.stage !== selectedStage) return false;
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(kw);
        const matchSummary = p.summary.toLowerCase().includes(kw);
        const matchAuthor = p.authorName.toLowerCase().includes(kw);
        if (!matchTitle && !matchSummary && !matchAuthor) return false;
      }
      return true;
    });
  }, [proposals, selectedTrack, selectedStage, searchKeyword]);

  // 依募資額、按讚數或討論數排序
  const sortedProposals = useMemo(() => {
    const list = [...filteredProposals];
    if (sortBy === 'funding') {
      return list.sort((a, b) => (b.supportPoints || 0) - (a.supportPoints || 0));
    } else if (sortBy === 'likes') {
      return list.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    } else if (sortBy === 'comments') {
      return list.sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0));
    }
    return list;
  }, [filteredProposals, sortBy]);

  // 愛心按讚 / 取消按讚
  const handleToggleLike = async (proposalId: string) => {
    if (!isLoggedIn) {
      onOpenAuth();
      return;
    }
    try {
      const res = await toggleLikeProposal(proposalId);
      if (res.success) {
        setLikedProposalIds(res.likedProposalIds);
        setProposals((prev) =>
          prev.map((p) =>
            p.id === proposalId ? { ...p, likeCount: res.likeCount } : p
          )
        );
        if (selectedProposalForDetail?.id === proposalId) {
          setSelectedProposalForDetail((prev) =>
            prev ? { ...prev, likeCount: res.likeCount } : null
          );
        }
        showToast(res.liked ? '❤️ 已按讚並加入您的個人收藏名單！' : '已取消按讚與收藏');
      }
    } catch (err: any) {
      showToast(err.message || '操作失敗');
    }
  };

  // 開啟提案詳情並載入討論留言
  const handleOpenProposalDetail = async (proposal: StarSeasonProposal) => {
    setSelectedProposalForDetail(proposal);
    setIsLoadingComments(true);
    try {
      const comms = await fetchProposalComments(proposal.id);
      setActiveComments(comms);
    } catch {
      setActiveComments([]);
    } finally {
      setIsLoadingComments(false);
    }
  };

  // 發表討論留言
  const handleAddComment = async () => {
    if (!selectedProposalForDetail) return;
    if (!isLoggedIn) {
      onOpenAuth();
      return;
    }
    if (!newCommentText.trim()) {
      showToast('請輸入留言討論內容');
      return;
    }
    setIsSubmittingComment(true);
    try {
      const res = await postProposalComment(selectedProposalForDetail.id, newCommentText.trim());
      if (res.success && res.comment) {
        setActiveComments((prev) => [...prev, res.comment!]);
        setNewCommentText('');
        setProposals((prev) =>
          prev.map((p) =>
            p.id === selectedProposalForDetail.id
              ? { ...p, commentsCount: (p.commentsCount || 0) + 1 }
              : p
          )
        );
        setSelectedProposalForDetail((prev) =>
          prev ? { ...prev, commentsCount: (prev.commentsCount || 0) + 1 } : null
        );
        showToast('留言發表成功！');
      } else {
        showToast(res.error || '發表失敗');
      }
    } catch (err: any) {
      showToast(err.message || '發表失敗');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // 打開報名頁 (若未登入先連到登入頁)
  const handleOpenRegistration = (tab: 'participant' | 'judge') => {
    setIsProfileMenuOpen(false);
    if (!isLoggedIn) {
      onOpenAuth();
      return;
    }
    setRegModalTab(tab);
    setIsRegistrationModalOpen(true);
  };

  // 參賽者報名提交（大專校院募資模擬學習平台體驗規格）
  const handleSubmitParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !leaderName.trim() || !leaderPhone.trim() || !projectTitle.trim() || !participantSummary.trim()) {
      showToast('請完整填寫團隊名稱、負責人、電話、提案主題與構想摘要');
      return;
    }
    if (!participantPledgeAgreed) {
      showToast('請先勾選同意 <<IdeaX一般條款>> 與 <<創星季參賽者條款>>');
      return;
    }

    setIsSubmittingParticipant(true);
    try {
      const sourcePainPoint = painPointProposals.find((p) => p.id === participantSourcePainPointId);
      const res = await registerParticipant({
        teamName,
        leaderName,
        leaderPhone,
        leaderEmail: leaderEmail || currentUser.email || '',
        schoolName: schoolName || '學校/機構',
        department: department || '創新學程',
        advisorName,
        track: participantTrack,
        projectTitle,
        summary: participantSummary,
        description: participantDescription || participantSummary,
        sourcePainPointId: participantSourcePainPointId || undefined,
        sourcePainPointTitle: sourcePainPoint?.title,
        bpDocumentUrl: bpFile?.url,
        bpDocumentName: bpFile?.name,
        bpDocumentSize: bpFile?.size,
        prototypeImageUrl: prototypeImgFile?.url,
        prototypeImageName: prototypeImgFile?.name,
        videoUrl,
        targetFundingAmount: Number(targetFundingAmount) || 300000,
        rewardPlanDescription: rewardPlanDescription || '搶先體驗資格、限量特製紀念徽章、技術感謝白皮書',
        pledgeAgreed: true,
      });

      if (res.success) {
        showToast(res.message);
        // 舊站用戶新增「創星季」徽章
        const currentBadges = currentUser.competitionBadges || [];
        const nextBadges = Array.from(new Set([...currentBadges, '創星季' as const]));
        const updatedUser = {
          ...currentUser,
          competitionBadges: nextBadges,
        };
        setCurrentUser(updatedUser);
        setAvailableUsers((prev) => prev.map((u) => u.id === currentUser.id ? updatedUser : u));

        // 同步寫入舊站痛點專區之下 answers
        const exclusiveChallengeUrl = `https://ideax.tw/challenge?proposalId=${res.proposalId || 'new'}`;
        if (participantSourcePainPointId) {
          const newAns = {
            id: `ans-${res.proposalId || Date.now()}`,
            questionId: participantSourcePainPointId,
            solverId: currentUser.id,
            solverName: currentUser.name || leaderName,
            solverAvatar: currentUser.avatar || '',
            title: projectTitle.trim(),
            content: `💡【創星季提案解方】${projectTitle.trim()}\n\n${participantSummary.trim()}\n\n🔗 參賽網站專屬專案連結：${exclusiveChallengeUrl}`,
            exclusiveChallengeUrl,
            isStarSeasonSolution: true,
            starSeasonProposalId: res.proposalId,
            sourcePainPointProposalId: participantSourcePainPointId,
            price: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setAnswers((prev: any) => [newAns, ...prev]);
          setQuestions((prev: any) =>
            prev.map((q: any) =>
              q.id === participantSourcePainPointId
                ? { ...q, answersCount: (q.answersCount || 0) + 1 }
                : q
            )
          );
        }

        setIsRegistrationModalOpen(false);
        await loadData();
      } else {
        showToast(res.message);
      }
    } catch (err: any) {
      showToast(err.message || '報名失敗');
    } finally {
      setIsSubmittingParticipant(false);
    }
  };

  // 評審團申請提交（同步錄入舊站認證專家身分與名單）
  const handleSubmitJudge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judgeName.trim() || !judgeOrg.trim() || !judgeJobTitle.trim() || !judgeCredentialsNote.trim()) {
      showToast('請完整填寫姓名、任職單位、職稱與證照或專業證明說明');
      return;
    }
    if (!judgePledgeAgreed) {
      showToast('請先勾選同意 <<IdeaX一般條款>> 與 <<創星季專家評審條款>>');
      return;
    }

    setIsSubmittingJudge(true);
    try {
      const res = await applyJudge({
        name: judgeName,
        phone: judgePhone,
        email: judgeEmail || currentUser.email || '',
        organization: judgeOrg,
        jobTitle: judgeJobTitle,
        domain: judgeDomain,
        experienceYears: Number(judgeExperienceYears) || 5,
        credentialsNote: judgeCredentialsNote,
        credentialProofUrl: judgeProofFile?.url,
        credentialProofName: judgeProofFile?.name,
        bio: judgeBio || `${judgeOrg} ${judgeJobTitle}，創星季專業評審團委員。`,
        reviewPledgeAgreed: true,
      });

      if (res.success) {
        showToast(res.message);
        // 申請評審的用戶會同時錄入舊站的認證專家身份與專家名單
        const updatedUser = {
          ...currentUser,
          role: 'solver' as const,
          verifiedExpert: true,
          verifiedBadge: '創星季專家',
          title: `${judgeOrg} ${judgeJobTitle}`,
          domain: judgeDomain as any,
          domains: [judgeDomain as any],
          expertApplicationStatus: 'approved' as const,
        };
        setCurrentUser(updatedUser);
        setAvailableUsers((prev) => prev.map((u) => u.id === currentUser.id ? updatedUser : u));

        // 同步新增/更新舊站 solvers 列表
        const solverId = res.solverId || `solver-${currentUser.id}`;
        setSolvers((prev) => {
          const existingIdx = prev.findIndex((s) => s.id === solverId || s.userId === currentUser.id);
          const newSolverRecord = {
            id: solverId,
            userId: currentUser.id,
            name: judgeName || currentUser.name,
            title: `${judgeOrg} ${judgeJobTitle}`,
            avatar: currentUser.avatar,
            domain: judgeDomain as any,
            domains: [judgeDomain as any],
            skills: ['產學創新', '技術審查', '新創輔導', '投資評估'],
            rating: 5.0,
            reviewCount: 1,
            answerCount: 0,
            acceptedRate: 100,
            tier: '認證專家' as const,
            bio: `${judgeOrg} ${judgeJobTitle}。創星季專業評審團成員。${judgeBio}`,
            earnings: 0,
            verifiedBadge: true,
            verified: true,
            verifiedExpert: true,
            featuredCase: {
              title: '創星季創新創業與產學審查',
              description: '受邀擔任創星季與各項青年創新創業競賽專業評審委員。',
              outcome: '提供專業商業模式驗證、產業對接建議與技術可行性評估。',
            },
          };
          if (existingIdx >= 0) {
            const clone = [...prev];
            clone[existingIdx] = newSolverRecord;
            return clone;
          } else {
            return [newSolverRecord, ...prev];
          }
        });

        // 升級競賽點數帳戶為專家 3,000,000 點
        setAccount((prev) =>
          prev
            ? {
                ...prev,
                role: 'solver',
                availablePoints: 3000000,
                initialPoints: 3000000,
              }
            : null
        );

        setIsRegistrationModalOpen(false);
        await loadData();
      } else {
        showToast(res.message);
      }
    } catch (err: any) {
      showToast(err.message || '申請失敗');
    } finally {
      setIsSubmittingJudge(false);
    }
  };

  // 複製獨立網址
  const handleCopyUrl = () => {
    const fullUrl = 'https://ideax.tw/challenge';
    navigator.clipboard?.writeText(fullUrl).then(() => {
      setCopiedUrl(true);
      showToast('已複製獨立網址：https://ideax.tw/challenge');
      setTimeout(() => setCopiedUrl(false), 2000);
    });
  };

  // 領取分享獎勵 100 點
  const handleClaimShareBonus = async () => {
    if (!auth.currentUser) {
      onOpenAuth();
      return;
    }
    const res = await claimShareBonus();
    if (res.success) {
      showToast(res.message);
      if (res.account) setAccount(res.account);
    } else {
      showToast(res.message);
    }
  };

  // 支持投點提交 (按照時程開放與封鎖)
  const handleConfirmSupport = async () => {
    if (!selectedProposalForSupport) return;
    if (stageInfo.isPainPointStage) {
      showToast('ℹ️ 創星幣模擬募資將於 11/16 ~ 12/04 正式開跑！目前為第一階段「痛點徵件」期，歡迎先提出痛點或探索題目。');
      return;
    }
    if (stageInfo.isPreProposalStage) {
      showToast('ℹ️ 11/14 ~ 11/15 為「預先提案期」，暫時關閉募資(投資)功能，僅供提案審核與預覽！模擬募資注資將於 11/16 正式開跑。');
      return;
    }
    if (stageInfo.isCrowdfundingClosed) {
      showToast('⚠️ 創星季模擬募資已於 12/04 截止注資！感謝全體會員支持，前 20 名提案已進入決選評選。');
      return;
    }
    if (!stageInfo.isInvestmentEnabled) {
      showToast('ℹ️ 模擬募資(投資)功能僅於 11/16 ~ 12/04 開放！');
      return;
    }
    setIsSubmittingSupport(true);
    try {
      const res = await supportProposal({
        proposalId: selectedProposalForSupport.id,
        points: supportAmount,
      });
      if (res.success) {
        showToast(res.message);
        setIsSupportModalOpen(false);
        setSelectedProposalForSupport(null);
        await loadData();
      } else {
        showToast(res.message);
      }
    } catch (err: any) {
      showToast(err.message || '支持失敗');
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  // 附件上傳處理
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    try {
      const uploaded = await uploadProposalAttachment(file);
      setFormAttachment(uploaded);
      showToast(`附件 ${file.name} 上傳成功！`);
    } catch (err: any) {
      showToast(err.message || '上傳失敗');
    } finally {
      setIsUploadingFile(false);
    }
  };

  // 提交提案
  const handleSubmitProposalForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      onOpenAuth();
      return;
    }

    if (!formTitle.trim() || !formSummary.trim() || !formDescription.trim()) {
      showToast('請完整填寫提案標題、摘要與說明');
      return;
    }
    if (!contactName.trim() || !contactPhone.trim() || !contactEmail.trim()) {
      showToast('請填寫主要聯絡人姓名、電話與 Email（此敏感資料將受安全隔離保護）');
      return;
    }

    // 依競賽時程嚴格開放與封鎖對應階段
    if (formStage === 'solution' && stageInfo.isPainPointStage) {
      showToast('ℹ️ 目前為第一階段「痛點徵件」期（至 11/13 截止）。「想解方/提案」將於 11/14 ~ 12/04 正式開跑，目前優先開放提出痛點！');
      setFormStage('pain_point');
      return;
    }
    if (formStage === 'pain_point' && stageInfo.isProposalStage) {
      showToast('ℹ️ 第一階段「痛點徵件」已於 11/13 截止！現正進行第二階段「想解方」提案（開放至 12/04），歡迎針對現有痛點提出完整方案！');
      setFormStage('solution');
      return;
    }
    if (stageInfo.isProposalClosed) {
      showToast('⚠️ 創星季提案已於 12/04 23:59 截止收件！目前已進入決選評審階段。');
      return;
    }

    setIsSubmittingProposal(true);
    try {
      const sourcePainPoint = painPointProposals.find((p) => p.id === formSourcePainPointId);

      const res = await submitProposal({
        title: formTitle,
        stage: formStage,
        track: formTrack,
        summary: formSummary,
        description: formDescription,
        sourcePainPointProposalId: formStage === 'solution' ? formSourcePainPointId : undefined,
        sourcePainPointTitle: formStage === 'solution' ? sourcePainPoint?.title : undefined,
        attachmentUrl: formAttachment?.url,
        attachmentName: formAttachment?.name,
        attachmentSize: formAttachment?.size,
        attachmentMime: formAttachment?.mime,
        referredByAmbassadorCode: formAmbassadorCode,
        contactName,
        contactPhone,
        contactEmail,
        schoolOrOrg,
        bankCode,
        bankAccount,
        idNumber,
      });

      if (res.success) {
        showToast(res.message);

        // 同步寫入舊站痛點專區與對應提案
        const exclusiveChallengeUrl = `https://ideax.tw/challenge?proposalId=${res.proposalId || 'new'}`;
        if (formStage === 'pain_point') {
          const newQ = {
            id: res.proposalId || `star-pain-${Date.now()}`,
            title: `【痛點】${formTitle.trim()}`,
            description: `${formSummary.trim()}\n\n${formDescription.trim()}\n\n🏆 創星季競賽痛點專屬連結：${exclusiveChallengeUrl}`,
            category: '創新創業' as any,
            tags: ['創點子', '痛點', '創星季', STAR_SEASON_TRACKS[formTrack]?.tag || '創新痛點'],
            postType: 'pain_point' as const,
            bounty: 0,
            authorId: currentUser.id,
            authorName: currentUser.name || contactName,
            authorAvatar: currentUser.avatar,
            authorRole: currentUser.role,
            status: 'open' as const,
            answersCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            exclusiveChallengeUrl,
            isStarSeason: true,
            starSeasonProposalId: res.proposalId,
          };
          setQuestions((prev: any) => [newQ, ...prev]);
        } else if (formStage === 'solution' && formSourcePainPointId) {
          const newAns = {
            id: `ans-${res.proposalId || Date.now()}`,
            questionId: formSourcePainPointId,
            solverId: currentUser.id,
            solverName: currentUser.name || contactName,
            solverAvatar: currentUser.avatar,
            title: formTitle.trim(),
            content: `💡【創星季提案解方】${formTitle.trim()}\n\n${formSummary.trim()}\n\n${formDescription.trim()}\n\n🔗 參賽網站專屬專案連結：${exclusiveChallengeUrl}`,
            exclusiveChallengeUrl,
            isStarSeasonSolution: true,
            starSeasonProposalId: res.proposalId,
            sourcePainPointProposalId: formSourcePainPointId,
            price: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setAnswers((prev: any) => [newAns, ...prev]);
          setQuestions((prev: any) =>
            prev.map((q: any) =>
              q.id === formSourcePainPointId
                ? { ...q, answersCount: (q.answersCount || 0) + 1 }
                : q
            )
          );
        }

        setIsSubmitModalOpen(false);
        // 清空表單
        setFormTitle('');
        setFormSummary('');
        setFormDescription('');
        setFormSourcePainPointId('');
        setFormAmbassadorCode('');
        setFormAttachment(null);
        setContactName('');
        setContactPhone('');
        setContactEmail('');
        setSchoolOrOrg('');
        setBankCode('');
        setBankAccount('');
        setIdNumber('');
        await loadData();
      } else {
        showToast(res.message);
      }
    } catch (err: any) {
      showToast(err.message || '提交失敗');
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  // 管理員審核提交
  const handleAdminReview = async (status: 'approved' | 'rejected') => {
    if (!adminReviewingProposal) return;
    try {
      const res = await adminReviewProposal({
        proposalId: adminReviewingProposal.id,
        status,
        reviewNote: adminReviewNote,
      });
      if (res.success) {
        showToast(res.message);
        setAdminReviewingProposal(null);
        await loadData();
      } else {
        showToast(res.message);
      }
    } catch (err: any) {
      showToast(err.message || '審核失敗');
    }
  };

  // 管理員最終頒獎確認
  const handleAdminConfirmAward = async () => {
    if (!adminReviewingProposal) return;
    try {
      const res = await adminConfirmAward({
        proposalId: adminReviewingProposal.id,
        finalRank: Number(adminFinalRankInput),
        awardConfirmed: true,
        adoptedSourceApproved: adminAdoptedApproved,
      });
      if (res.success) {
        showToast(res.message);
        setAdminReviewingProposal(null);
        await loadData();
      } else {
        showToast(res.message);
      }
    } catch (err: any) {
      showToast(err.message || '操作失敗');
    }
  };

  // 競賽 FAQ 說明資料 (統一所有官方數字與規則文案)
  const faqList = [
    {
      q: '什麼是「IdeaX 創星季」兩階段競賽？痛點獎勵與採用獎勵是如何運作的？',
      a: 'IdeaX 創星季分為兩階段：第一階段「徵點子」由提案者發布真實痛點，只要成功提出痛點（需過審）即送 200 點（價值 $250 的 IdeaX 創點子平台點數，可用於發布懸賞問題、享受付費功能，點數效期 60 日）。第二階段「想解方」由團隊針對痛點提出具體落地架構；若前十名得獎提案採用了第一階段的痛點，原痛點提出者另享等值好禮（點數效期 60 日）：創新提案排名前 1~3 名採用獲價值 $1,000 好禮（800 點 IdeaX 平台提問金，效期 60 日）；排名前 4~10 名採用獲價值 $500 好禮（400 點 IdeaX 平台提問金，效期 60 日），經官方管理員核准後發放，建立正向良性的創新激勵生態！',
    },
    {
      q: '模擬募資前 20 名與最終得獎名次（冠、亞、季軍）如何評定？獎勵內容為何？',
      a: '全體大眾與專家的虛擬募資投票排名「前 20 名」代表獲得「入圍決選」資格，並非最終得獎！最終得獎名次由評審團進行專業審查與評分，決選出：冠軍價值 $30,000（NT$20,000 現金 ＋ 8,000 點（價值 $10,000，點數效期 180 日）＋ 官方「創之星」最高榮譽徽章）、亞軍價值 $10,000（NT$6,000 現金 ＋ 3,200 點（價值 NT$4,000，點數效期 180 日）＋ 官方「創之星」最高榮譽徽章）、季軍價值 $5,000（NT$3,000 現金 ＋ 1,600 點（價值 NT$2,000，點數效期 180 日）＋ 官方「創之星」最高榮譽徽章）。獲獎團隊由系統授予「創之星」最高榮譽徽章！',
    },
    {
      q: '創星幣是多少？可以兌現或投資自己嗎？',
      a: '使用 創星幣 支持你認同的創新提案，模擬市場關注度。一般用戶與提案者初始各享有 100,000 創星幣，專家享有 3,000,000 創星幣。1 創星幣 = NT$1 僅作為模擬市場驗證投票權益，非真實現金或法定投資，不可購買、轉帳或兌現。單案支持上限：一般用戶 50,000 創星幣、提案者 30,000 創星幣、專家 2,000,000 創星幣。系統強制「防自投」機制，嚴禁投點支持自己發起的提案！',
    },
    {
      q: '各項競賽獎勵點數的有效期限是多久？',
      a: '重要規範：除了前三名（冠、亞、季軍）獲獎團隊所獲得之獎勵點數效期為 180 日以外，其餘所有的獎勵點數（包含提出痛點過審獎 200 點、痛點採用好禮、推廣大使推薦獎勵 300 點等）效期皆為 60 日。點數可用於 IdeaX 創點子平台提問與付費服務。',
    },
    {
      q: '參賽單位如何計算？每隊有投件數量或痛點數量上限嗎？',
      a: '本競賽「以每個帳號算計一隊」，且「每隊不限提案或痛點數量」！目標不限於青年或學生，亦不一定要團隊，個人獨立參賽或自由組隊皆可。在痛點徵件階段可提交多筆切身痛點，在想解方階段亦可提出多件解方提案。',
    },
    {
      q: '推廣大使獎勵是如何核發的？',
      a: '推廣大使每推薦 1 案審核通過，即享 300 點（價值 $400）（IdeaX 平台點數，用於提問、享受付費服務），多推多得無上限。',
    },
    {
      q: '分享推薦碼如何領取 100 創星幣？有次數限制嗎？',
      a: '每位登入用戶點擊「分享推薦碼領 100 創星幣」，系統將為您的競賽錢包增加 100 創星幣。為維護競賽公平，每個帳號限領一次，創星幣獨立於舊站真實 Balance，不影響舊站任何帳戶資產。',
    },
    {
      q: '創星季的活動各階段時程如何安排？',
      a: '競賽各階段日程如下：\n• 10/24 00:00 ～ 12/04 16:30：報名時段（※ 提痛點之參賽者請於 11/13 16:30 痛點徵件截止前完成報名）\n• 10/31 ～ 11/13：第一階段：痛點徵件（提出痛點過審即送 200 點，價值 $250，效期 60 日）\n• 11/14 ～ 11/15：第二階段 (一)：預先提案（【關閉募資(投資)功能】，僅可註冊報名、在線提案、主辦單位審核及預覽）\n• 11/16 ～ 12/04：第二階段 (二)：模擬募資與提案（【全面開放功能】，可報名、提案、創星幣模擬募資(投資)注資投票、主辦單位審核，募資總額前 20 名取得決選資格）\n• 12/05 ～ 12/11：第三階段：進入決選（由評審團進行專業審查與評分）\n• 12/16 前公布：第四階段：公布結果（於首頁盛大公告最終榜單，頒發榮譽與獎勵）',
    },
  ];

  // 滿版子網址獨立網頁渲染 (探索提案、競賽辦法、投稿、申請參賽者、申請專家、推廣大使推薦碼)
  if (currentSubView === 'proposal' || currentSubView === 'explore') {
    return (
      <ExploreProposalsFullPage
        onNavigate={navigateToSubView}
        onBackToOldSite={onBackToOldSite}
        onOpenAuth={onOpenAuth}
        proposals={proposals}
        onRefreshProposals={loadData}
        account={account}
        onRefreshAccount={loadData}
      />
    );
  }

  if (currentSubView === 'rules') {
    return (
      <RulesFullPage
        onNavigate={navigateToSubView}
        onBackToOldSite={onBackToOldSite}
        onOpenAuth={onOpenAuth}
        onOpenAmbassadorModal={() => navigateToSubView('ambassador')}
      />
    );
  }

  if (currentSubView === 'submit') {
    return (
      <SubmitProposalFullPage
        onNavigate={navigateToSubView}
        onBackToOldSite={onBackToOldSite}
        onOpenAuth={onOpenAuth}
        painPointProposals={painPointProposals}
        onSuccess={loadData}
      />
    );
  }

  if (currentSubView === 'participant') {
    return (
      <ParticipantFullPage
        onNavigate={navigateToSubView}
        onBackToOldSite={onBackToOldSite}
        onOpenAuth={onOpenAuth}
        painPointProposals={painPointProposals}
        onSuccess={loadData}
      />
    );
  }

  if (currentSubView === 'judge') {
    return (
      <JudgeFullPage
        onNavigate={navigateToSubView}
        onBackToOldSite={onBackToOldSite}
        onOpenAuth={onOpenAuth}
        onSuccess={loadData}
      />
    );
  }

  if (currentSubView === 'ambassador') {
    return (
      <AmbassadorFullPage
        onNavigate={navigateToSubView}
        onBackToOldSite={onBackToOldSite}
        onOpenAuth={onOpenAuth}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-20 selection:bg-amber-300 selection:text-stone-950 font-sans">
      {/* 頂部全站提示列與導覽 */}
      <div className="bg-white/95 border-b border-amber-200 sticky top-0 z-40 backdrop-blur-md shadow-xs">
        {/* 導覽列核心主行 */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-2">
          {/* 左側：品牌 Logo (點燈泡回舊站首頁，點創星季回競賽首頁) */}
          <div className="flex items-center gap-1.5 shrink-0 -ml-1 sm:-ml-3">
            {/* 1. 點左上燈泡圖片回到舊站首頁 (依指示大一點點) */}
            <button
              type="button"
              onClick={() => {
                onBackToOldSite();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="p-1 -m-1 rounded-xl hover:bg-amber-100/60 active:scale-95 transition-all cursor-pointer flex items-center justify-center group"
              title="點擊回到 IdeaX 舊站首頁"
              aria-label="回到舊站首頁"
            >
              <img
                src="/logo-bulb.png"
                alt="IdeaX 創點子 - 點擊回舊站首頁"
                className="w-10.5 h-10.5 sm:w-12 sm:h-12 md:w-14 md:h-14 object-contain shrink-0 drop-shadow-xs group-hover:drop-shadow-md transition-all group-hover:scale-105"
              />
            </button>

            {/* 2. 點創星季則回競賽網站首頁 */}
            <button
              type="button"
              onClick={() => {
                navigateToSubView('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="p-1 -m-1 rounded-xl hover:bg-amber-100/60 active:scale-95 transition-all cursor-pointer flex items-center group -ml-1"
              title="點擊返回創星季競賽首頁"
              aria-label="回創星季競賽首頁"
            >
              <img
                src="/logo-chuangxingji-text.png"
                alt="創星季 - 點擊回競賽首頁"
                className="h-7.5 sm:h-9 md:h-10.5 w-auto object-contain shrink-0 group-hover:opacity-90 group-hover:scale-102 transition-all"
              />
            </button>
          </div>

          {/* 中間：核心導覽列 (風格統一、簡潔俐落) */}
          <nav className="hidden lg:flex items-center gap-1.5 text-xs font-bold text-stone-700 bg-stone-100/80 p-1 rounded-2xl border border-stone-200/80">
            {/* 1. 痛點徵件階段為「提出痛點」，11/14~12/04 轉為「我想提案!」，12/04後截止 */}
            {stageInfo.isPainPointStage ? (
              <button
                type="button"
                onClick={handleOpenPainPointSubmission}
                className="px-3.5 py-1.5 rounded-xl text-white bg-rose-600 hover:bg-rose-500 transition-all cursor-pointer font-black shadow-2xs active:scale-98 flex items-center gap-1.5"
                title="第一階段痛點徵件中：立即提出生活或產業痛點（過審送200點）"
              >
                <Flame className="w-3.5 h-3.5 text-white" />
                <span>提出痛點</span>
              </button>
            ) : stageInfo.isProposalStage ? (
              <button
                type="button"
                onClick={() => setIsProposalTutorialModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl text-stone-950 bg-amber-400 hover:bg-amber-300 transition-all cursor-pointer font-black shadow-2xs active:scale-98 flex items-center gap-1.5"
                title="點擊查看提案教學與開始提案（提案開放至 12/04 截止）"
              >
                <Send className="w-3.5 h-3.5 text-stone-950" />
                <span>我想提案!</span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="px-3.5 py-1.5 rounded-xl text-stone-400 bg-stone-200 cursor-not-allowed font-bold flex items-center gap-1.5"
                title="創星季提案已於 12/04 截止收件"
              >
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span>提案已截止</span>
              </button>
            )}

            <div className="h-4 w-px bg-stone-300/80 mx-0.5" />

            {/* 2. 探索Idea (前三項目之二：有色鮮明膠囊) */}
            <button
              type="button"
              onClick={() => navigateToSubView('proposal')}
              className="px-3 py-1.5 rounded-xl text-amber-950 bg-amber-200/90 hover:bg-amber-300 border border-amber-300/80 transition-all cursor-pointer font-black flex items-center gap-1.5 shadow-2xs active:scale-98"
            >
              <Compass className="w-3.5 h-3.5 text-amber-700" />
              <span>探索Idea</span>
            </button>

            {/* 3. 先看痛點 (前三項目之三：有色鮮明膠囊) */}
            <button
              type="button"
              onClick={onGoToPainPoints || onBackToOldSite}
              className="px-3 py-1.5 rounded-xl text-orange-950 bg-orange-200/90 hover:bg-orange-300 border border-orange-300/80 transition-all cursor-pointer font-black flex items-center gap-1.5 shadow-2xs active:scale-98"
              title="前往 IdeaX創點子 痛點專區"
            >
              <Layers className="w-3.5 h-3.5 text-orange-700" />
              <span>先看痛點</span>
            </button>

            {/* 競賽辦法 (直接前往專門競賽辦法頁) */}
            <button
              type="button"
              onClick={() => navigateToSubView('rules')}
              className="px-3 py-1.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-white transition-all cursor-pointer font-bold flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-stone-500" />
              <span>競賽辦法</span>
            </button>

            {/* 4. 申請參賽者 */}
            <button
              type="button"
              onClick={() => {
                if (!isLoggedIn) {
                  onOpenAuth();
                  return;
                }
                navigateToSubView('participant');
              }}
              className="px-3 py-1.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-white transition-all cursor-pointer font-bold flex items-center gap-1.5"
            >
              <GraduationCap className="w-3.5 h-3.5 text-stone-500" />
              <span>申請參賽者</span>
            </button>

            {/* 5. 成為專家 */}
            <button
              type="button"
              onClick={() => {
                if (!isLoggedIn) {
                  onOpenAuth();
                  return;
                }
                navigateToSubView('judge');
              }}
              className="px-3 py-1.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-white transition-all cursor-pointer font-bold flex items-center gap-1.5"
              title="點擊進入成為專家"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-stone-500" />
              <span>成為專家</span>
            </button>

            {/* 6. 推廣大使 */}
            <button
              type="button"
              onClick={() => navigateToSubView('ambassador')}
              className="px-3 py-1.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-white transition-all cursor-pointer font-bold flex items-center gap-1.5"
            >
              <Megaphone className="w-3.5 h-3.5 text-stone-500" />
              <span>推廣大使</span>
            </button>
          </nav>

          {/* 右側：創星幣錢包 + 頭像/身分控制選單 + 痛點快捷鍵 */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {account && (
              <div className="hidden md:flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-amber-300 text-xs shadow-2xs">
                <Coins className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-stone-500 text-[11px]">創星幣：</span>
                <span className="font-mono font-black text-amber-700 text-sm">
                  {account.availablePoints.toLocaleString()}
                </span>
              </div>
            )}

            {/* 右側個人頭像與帳號控制 (主登入/會員中心入口) */}
            <div className="relative shrink-0" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => {
                  if (!isLoggedIn) {
                    onOpenAuth();
                  } else {
                    setIsProfileMenuOpen(!isProfileMenuOpen);
                  }
                }}
                className="inline-flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1.5 rounded-2xl bg-white hover:bg-amber-50 border border-amber-300 text-xs shadow-2xs text-stone-800 transition-all cursor-pointer active:scale-98"
                title={isLoggedIn ? '點擊展開個人列表選單' : '點擊登入 / 註冊 IdeaX 帳號'}
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-stone-950 flex items-center justify-center font-black text-xs shrink-0 shadow-2xs border border-amber-300 overflow-hidden">
                  {isLoggedIn && currentUser.avatar ? (
                    <img src={currentUser.avatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : isLoggedIn && currentUser.name ? (
                    currentUser.name.charAt(0).toUpperCase()
                  ) : (
                    <UserIcon className="w-4 h-4 text-stone-800" />
                  )}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="font-bold text-stone-900 leading-tight max-w-[105px] truncate">
                    {isLoggedIn ? currentUser.name || '會員' : '登入 / 註冊'}
                  </div>
                  <div className="text-[10px] font-semibold flex items-center gap-1">
                    {isLoggedIn ? (
                      currentUser.role === 'admin' ? (
                        <span className="text-rose-700 font-black">👑 平台管理員</span>
                      ) : currentUser.verifiedExpert || currentUser.role === 'solver' ? (
                        <span className="text-purple-700 font-black">👑 專家</span>
                      ) : currentUser.competitionBadges?.includes('創星季') ? (
                        <span className="text-emerald-700 font-black">★ 創星季參賽者</span>
                      ) : (
                        <span className="text-stone-500">一般會員</span>
                      )
                    ) : (
                      <span className="text-amber-800 font-bold">點此登入</span>
                    )}
                  </div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${isProfileMenuOpen ? 'rotate-180 text-amber-600' : ''}`} />
              </button>

              {/* 個人列表下拉浮層 (Profile Dropdown Menu) */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-3xl border border-amber-300 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-2.5">
                  {/* 會員身分卡片 */}
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-amber-400 text-stone-950 font-black text-sm flex items-center justify-center shrink-0 border border-amber-300 shadow-2xs overflow-hidden">
                        {isLoggedIn && currentUser.avatar ? (
                          <img src={currentUser.avatar} alt="avatar" className="w-full h-full object-cover" />
                        ) : isLoggedIn && currentUser.name ? (
                          currentUser.name.charAt(0).toUpperCase()
                        ) : (
                          'U'
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-black text-stone-900 text-sm truncate">
                          {isLoggedIn ? currentUser.name || '會員' : '訪客創友'}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          {currentUser.role === 'admin' ? (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-200">
                              👑 平台管理員
                            </span>
                          ) : (
                            <>
                              {currentUser.verifiedExpert || currentUser.role === 'solver' ? (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                                  👑 認證專家
                                </span>
                              ) : null}
                              {currentUser.competitionBadges?.includes('創星季') ? (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-stone-950 shadow-2xs">
                                  ✨ 創星季參賽者
                                </span>
                              ) : null}
                              {(!currentUser.verifiedExpert && currentUser.role !== 'solver' && !currentUser.competitionBadges?.includes('創星季')) ? (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                                  一般會員用戶
                                </span>
                              ) : null}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {account && (
                      <div className="mt-2.5 pt-2 border-t border-amber-200/80 flex items-center justify-between text-xs">
                        <span className="text-stone-500 font-bold">競賽可用創星幣：</span>
                        <span className="font-mono font-black text-amber-700">
                          {account.availablePoints.toLocaleString()} 創星幣
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 核心功能選單列表 */}
                  <div className="space-y-1 text-xs font-bold text-stone-700">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (!isLoggedIn) {
                          onOpenAuth();
                          return;
                        }
                        navigateToSubView('participant');
                      }}
                      className="w-full px-3 py-2.5 rounded-xl hover:bg-amber-100/70 text-stone-900 flex items-center justify-between transition-colors cursor-pointer text-left group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                          <GraduationCap className="w-4 h-4 text-amber-700" />
                        </div>
                        <div>
                          <div className="font-black text-stone-900">提案參賽</div>
                          <div className="text-[10px] text-stone-500 font-normal">填寫團隊資料與創星季募資計畫滿版報名</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (!isLoggedIn) {
                          onOpenAuth();
                          return;
                        }
                        navigateToSubView('judge');
                      }}
                      className="w-full px-3 py-2.5 rounded-xl hover:bg-purple-50 text-stone-900 flex items-center justify-between transition-colors cursor-pointer text-left group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                          <ShieldCheck className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <div className="font-black text-stone-900">成為專家</div>
                          <div className="text-[10px] text-stone-500 font-normal">認證專家身分，享有 300 萬創星幣評選額度</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        setIsFavoritesModalOpen(true);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl hover:bg-rose-50 text-stone-900 flex items-center justify-between transition-colors cursor-pointer text-left group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                          <Heart className="w-4 h-4 text-rose-600 fill-rose-600/30" />
                        </div>
                        <div>
                          <div className="font-black text-stone-900">我的收藏</div>
                          <div className="text-[10px] text-stone-500 font-normal">已按讚的提案名單</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-black text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full shrink-0">
                        {likedProposalIds.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        navigateToSubView('ambassador');
                      }}
                      className="w-full px-3 py-2.5 rounded-xl hover:bg-amber-100/70 text-stone-900 flex items-center justify-between transition-colors cursor-pointer text-left group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                          <Megaphone className="w-4 h-4 text-amber-700" />
                        </div>
                        <div>
                          <div className="font-black text-stone-900">推廣大使推薦碼</div>
                          <div className="text-[10px] text-stone-500 font-normal">專屬推薦碼、輸入綁定與推薦名單滿版專區</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </button>

                    {(isCurrentUserAppointedJudge || currentUser.role === 'admin') && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setEvaluatingJudgeUser({
                            id: currentUser?.id || 'user-expert-1',
                            name: currentUser?.name || '柯育任 院長/特聘教授',
                          });
                          setIsJudgeEvaluationModalOpen(true);
                        }}
                        className="w-full px-3 py-2.5 rounded-xl hover:bg-purple-100/70 text-stone-900 flex items-center justify-between transition-colors cursor-pointer text-left group bg-purple-50/50"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-purple-200 text-purple-900 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                            <Award className="w-4 h-4 text-purple-700" />
                          </div>
                          <div>
                            <div className="font-black text-stone-900 flex items-center gap-1.5">
                              <span>決選評分區</span>
                              <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-purple-700 text-white">
                                評審專屬
                              </span>
                            </div>
                            <div className="text-[10px] text-stone-500 font-normal">邊看提案企劃詳情邊評分，暫存或統一送出</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </button>
                    )}

                    {currentUser.role === 'admin' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            setIsAdminFinalEvaluationHubOpen(true);
                          }}
                          className="w-full px-3 py-2.5 rounded-xl hover:bg-amber-100/80 text-stone-900 flex items-center justify-between transition-colors cursor-pointer text-left group bg-amber-50/70 border border-amber-300"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-400 text-stone-950 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 shadow-2xs font-black">
                              <Trophy className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-black text-stone-900 flex items-center gap-1.5">
                                <span>決審評分＆獎勵統計</span>
                                <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-rose-600 text-white">
                                  管理員
                                </span>
                              </div>
                              <div className="text-[10px] text-stone-500 font-normal">入選勾選、算術平均名次、前台發布與Excel匯出</div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            setIsAdminPanelOpen(true);
                          }}
                          className="w-full px-3 py-2.5 rounded-xl hover:bg-purple-50 text-stone-900 flex items-center justify-between transition-colors cursor-pointer text-left group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                              <ShieldCheck className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                              <div className="font-black text-stone-900">管理審核與頒獎</div>
                              <div className="text-[10px] text-stone-500 font-normal">管理員專屬提案審查與獎項核定</div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            setIsAdminRulesFolderOpen(true);
                          }}
                          className="w-full px-3 py-2.5 rounded-xl hover:bg-amber-50 text-stone-900 flex items-center justify-between transition-colors cursor-pointer text-left group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                              <Folder className="w-4 h-4 text-amber-700" />
                            </div>
                            <div>
                              <div className="font-black text-stone-900 flex items-center gap-1.5">
                                <span>規章條款存檔資料夾</span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-stone-950 text-amber-300 font-mono font-black">
                                  機密
                                </span>
                              </div>
                              <div className="text-[10px] text-stone-500 font-normal">官方全套章程與辦法歸檔（管理員限定）</div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* 底部輔助按鍵 */}
                  <div className="pt-2 border-t border-stone-100 space-y-1">
                    {!isLoggedIn ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onOpenAuth();
                        }}
                        className="w-full py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs text-center cursor-pointer transition-colors"
                      >
                        登入 / 註冊 IdeaX 帳號
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          setIsProfileMenuOpen(false);
                          try {
                            await auth.signOut();
                          } catch {}
                          logoutAccount();
                          showToast('已登出目前帳號');
                        }}
                        className="w-full py-2 px-3 rounded-xl hover:bg-stone-100 text-stone-600 hover:text-stone-900 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5 text-stone-500" />
                        <span>登出目前帳號</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 先看痛點 (行動版快捷鍵，風格與全站一致) */}
            <button
              type="button"
              onClick={onBackToOldSite}
              className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 hover:border-amber-300 text-stone-800 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-98 shrink-0"
              title="連結到舊站 創點子/痛點專區"
            >
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              <span>先看痛點</span>
            </button>
          </div>
        </div>
      </div>

      {/* 創星季 主視覺 Banner：主色調黃色，上方淡黃漸層到綠色漸層，白色基底，無黑色 */}
      <div className="relative overflow-hidden bg-gradient-to-b from-amber-100/80 via-amber-50/40 via-emerald-50/60 to-emerald-100/70 border-b border-emerald-200/80 pt-6 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* 右上角空白區塊放上提案上傳的圖片輪播 */}
          <div className="hidden xl:block absolute right-4 lg:right-6 top-0 z-20">
            <ProposalHeroCarousel
              proposals={proposals}
              onSelectProposal={(p) => setSelectedProposalForDetail(p)}
            />
          </div>

          <div className="text-center max-w-3xl mx-auto space-y-4">
            
            {/* 1. 綠色活動圓角膠囊標籤（第一行：活動名稱，第二行：日期+階段名稱中!） */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-emerald-50/90 border border-emerald-300 text-emerald-900 text-xs sm:text-sm font-bold shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="leading-snug text-center">
                <div>【11月創新月】IdeaX 創星季・創新挑戰賽</div>
                <div className="text-emerald-700 font-extrabold tracking-wide">{stageBadgeSubtitle}</div>
              </div>
            </div>

            {/* 3. 大標語：你的 創新點子，\n    值得被世界看見（階梯向右縮排排版，附璀璨金芒閃爍與流光特效） */}
            <div className="pt-2">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-stone-900 tracking-tight leading-tight inline-block text-left">
                <span className="block">
                  你的{' '}
                  <span className="relative inline-block px-1">
                    {/* 周圍環境金色輝光光暈 (擴大範圍至外圍，柔和氛圍) */}
                    <span
                      aria-hidden="true"
                      className="absolute -inset-x-6 sm:-inset-x-10 -inset-y-3 sm:-inset-y-5 bg-gradient-to-r from-amber-300/15 via-yellow-200/25 to-amber-400/15 blur-xl sm:blur-2xl rounded-3xl animate-ambient-glow pointer-events-none"
                    />

                    {/* 閃爍星芒 1：右上角主星芒 (散佈範圍更寬廣，光芒柔和不刺眼) */}
                    <span
                      aria-hidden="true"
                      className="absolute -top-5 sm:-top-7 -right-6 sm:-right-9 text-amber-400/90 animate-sparkle-burst-1 pointer-events-none select-none z-10"
                    >
                      <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-amber-400/80 fill-amber-300/60 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]" />
                    </span>

                    {/* 閃爍星芒 2：左上角星芒 (散佈範圍更寬廣) */}
                    <span
                      aria-hidden="true"
                      className="absolute -top-4 sm:-top-6 -left-6 sm:-left-8 text-yellow-400/85 animate-sparkle-burst-2 pointer-events-none select-none z-10"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="w-4 h-4 sm:w-5 sm:h-5 md:w-5.5 md:h-5.5 fill-yellow-400/70 text-yellow-400/70 drop-shadow-[0_0_8px_rgba(253,224,71,0.4)]"
                      >
                        <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                      </svg>
                    </span>

                    {/* 閃爍星芒 3：右下角微星芒 (擴大至右外側下方) */}
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-4 sm:-bottom-6 -right-3 sm:-right-5 text-amber-400/80 animate-sparkle-burst-3 pointer-events-none select-none z-10"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400/60 text-amber-400/60 drop-shadow-[0_0_6px_rgba(252,211,77,0.35)]"
                      >
                        <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                      </svg>
                    </span>

                    {/* 閃爍星芒 4：左下側飄逸微光 (擴大散佈至左側遠處) */}
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-3 sm:-bottom-5 -left-5 sm:-left-7 text-yellow-300/80 animate-sparkle-burst-4 pointer-events-none select-none z-10"
                    >
                      <span className="block w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-yellow-300/75 shadow-[0_0_8px_rgba(253,224,71,0.5)]" />
                    </span>

                    {/* 核心字體：「創新點子」具備金黃漸層流光，柔化過度刺眼的 drop-shadow */}
                    <span className="relative z-10 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 bg-clip-text text-transparent font-black animate-gold-sweep drop-shadow-[0_1px_4px_rgba(245,158,11,0.25)]">
                      創新點子
                    </span>
                  </span>
                  ，
                </span>
                <span className="block pl-6 sm:pl-10 md:pl-14 text-stone-900">
                  值得被世界看見
                </span>
              </h1>
            </div>

            {/* 4. 副標題說明文字 */}
            <div className="space-y-1.5 text-xs sm:text-sm md:text-base text-stone-700 max-w-xl mx-auto font-medium leading-relaxed">
              <p>加入 IdeaX 創星季，提出創新 idea，獲得市場支持與專業回饋。</p>
              <p className="text-amber-700 font-bold">
                提出你的創新想法，讓市場與專業者共同驗證。
              </p>
            </div>

            {/* 5. 核心 CTA 按鍵組：風格高度統一，具備一致的圓角、邊框、圖示與視覺層次 */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3 max-w-lg mx-auto">
              {/* 主行動：在痛點徵件階段為「提出痛點」，痛點徵件後轉為「我想提案」直到 12/04，12/04後截止 */}
              {stageInfo.isPainPointStage ? (
                <button
                  type="button"
                  onClick={handleOpenPainPointSubmission}
                  className="w-full sm:w-auto flex-1 py-3 px-6 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm sm:text-base shadow-sm border border-rose-600 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                  title="第一階段痛點徵件中：立即提出產業或生活痛點（過審即送 200 點）"
                >
                  <Flame className="w-4 h-4 text-white" />
                  <span>提出痛點</span>
                </button>
              ) : stageInfo.isProposalStage ? (
                <button
                  type="button"
                  onClick={() => setIsProposalTutorialModalOpen(true)}
                  className="w-full sm:w-auto flex-1 py-3 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-sm sm:text-base shadow-sm border border-amber-400 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                  title="點擊查看提案流程教學（提案開放至 12/04 截止）"
                >
                  <Send className="w-4 h-4 text-stone-950" />
                  <span>我想提案!</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full sm:w-auto flex-1 py-3 px-6 rounded-2xl bg-stone-200 text-stone-500 font-bold text-sm sm:text-base border border-stone-300 flex items-center justify-center gap-2 cursor-not-allowed"
                  title="創星季提案已於 12/04 截止收件，現正進行決選評審"
                >
                  <Clock className="w-4 h-4 text-stone-400" />
                  <span>提案已截止 (12/04截止)</span>
                </button>
              )}

              {/* 次行動 1：探索Idea (高雅白底微邊框卡片，圖示文字一致) */}
              <button
                type="button"
                onClick={() => navigateToSubView('proposal')}
                className="w-full sm:w-auto flex-1 py-3 px-6 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 hover:text-stone-950 font-bold text-sm sm:text-base shadow-2xs border border-stone-200/90 hover:border-amber-300 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                title="進入滿版獨立探索提案頁面"
              >
                <Compass className="w-4 h-4 text-amber-500" />
                <span>探索Idea</span>
              </button>

              {/* 次行動 2：先看痛點 (同風格白底微邊框卡片，統一圖示與圓角尺寸) */}
              <button
                type="button"
                onClick={onGoToPainPoints || onBackToOldSite}
                className="w-full sm:w-auto flex-1 py-3 px-6 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 hover:text-stone-950 font-bold text-sm sm:text-base shadow-2xs border border-stone-200/90 hover:border-amber-300 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                title="前往舊站 創點子/痛點專區"
              >
                <Flame className="w-4 h-4 text-rose-500" />
                <span>先看痛點</span>
              </button>
            </div>

            {/* 6. 次要身分入口：統一边框粗細 (1px)、背景與圖示間距，整齊乾淨 */}
            <div className="mt-6 space-y-4 max-w-5xl mx-auto">
              <div className="flex items-center justify-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => navigateToSubView('ambassador')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 hover:text-stone-950 border border-stone-200/90 hover:border-stone-300 text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer active:scale-98"
                  title="點擊進入推廣大使專區：每推薦一案過審即獲 300 點（價值 $400）IdeaX 平台點數（用於提問、享受付費服務）"
                >
                  <Megaphone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>推廣大使 (300點/過審)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!isLoggedIn) {
                      onOpenAuth();
                      return;
                    }
                    navigateToSubView('participant');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 hover:text-stone-950 border border-stone-200/90 hover:border-stone-300 text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer active:scale-98"
                >
                  <GraduationCap className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>申請參賽者</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!isLoggedIn) {
                      onOpenAuth();
                      return;
                    }
                    navigateToSubView('judge');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 hover:text-stone-950 border border-stone-200/90 hover:border-stone-300 text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer active:scale-98"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>成為專家</span>
                </button>
              </div>

              {/* 獎勵簡述 */}
              <div className="pt-2 flex items-center justify-center gap-3 sm:gap-6 flex-wrap text-xs text-stone-600">
                <span className="flex items-center gap-1 font-medium">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>冠軍價值 <strong>$30,000</strong>（亞軍 $10,000 / 季軍 $5,000）</span>
                </span>
                <span className="text-stone-300">•</span>
                <span className="flex items-center gap-1 font-medium">
                  <Flame className="w-3.5 h-3.5 text-rose-500" />
                  <span>提出痛點過審即送 <strong>200 點</strong>（價值 $250，效期 60 日）</span>
                </span>
                <span className="text-stone-300">•</span>
                <span className="flex items-center gap-1 font-medium">
                  <Heart className="w-3.5 h-3.5 text-emerald-500" />
                  <span>痛點獲前十名採用享 <strong>等值好禮</strong>（最高 $1,000）</span>
                </span>
                <span className="text-stone-300">•</span>
                <span className="flex items-center gap-1 font-medium">
                  <TrendingUp className="w-3.5 h-3.5 text-yellow-600" />
                  <span>模擬募資前 20 名 <strong>取得入圍決選資格</strong></span>
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 競賽四階段時程進度條 (10/31~11/13 痛點徵件、11/14~12/04 模擬募資、12/05~12/11 進入決選、12/16前公布結果) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="bg-white/90 backdrop-blur-xs p-5 rounded-3xl border border-stone-200/90 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-600" />
              <h2 className="text-sm sm:text-base font-black text-stone-900">
                IdeaX 創星季 賽程時程表
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-stone-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>當前進行：<strong className="text-emerald-800 font-black">{stageInfo.stageTitle}</strong>（{stageInfo.stagePeriod}）</span>
            </div>
          </div>

          {/* 報名時段特別公告標籤 */}
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-stone-950 font-black text-[11px] shrink-0 shadow-2xs">
                📝 報名時段
              </span>
              <span className="font-black text-stone-900 font-mono text-sm">
                10/24 00:00 ～ 12/04 16:30
              </span>
            </div>
            <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
              <span>提痛點之參賽者請於 <strong className="font-black text-stone-900 underline underline-offset-2">11/13 16:30</strong> 痛點徵件截止前完成報名</span>
            </div>
          </div>

          {(() => {
            const activeStage = stageInfo.activeStage;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* 階段 1: 痛點徵件 */}
                <div
                  className={`p-4 rounded-2xl space-y-1.5 relative overflow-hidden transition-all ${
                    activeStage === 1
                      ? 'bg-white border-2 border-emerald-500 ring-2 ring-emerald-400/20 shadow-md'
                      : 'bg-stone-50 border border-stone-200 text-stone-500 shadow-none'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        activeStage === 1
                          ? 'bg-emerald-500 text-white'
                          : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      第一階段
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1 ${
                        activeStage === 1
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-stone-200/70 text-stone-500 border border-stone-200'
                      }`}
                    >
                      {activeStage === 1 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                      <span>{activeStage === 1 ? '徵件中（當前）' : '已截止'}</span>
                    </span>
                  </div>
                  <div className={`text-sm ${activeStage === 1 ? 'font-black text-stone-950' : 'font-bold text-stone-700'}`}>
                    痛點徵件
                  </div>
                  <div className={`text-xs font-mono ${activeStage === 1 ? 'font-black text-emerald-700' : 'font-medium text-stone-400'}`}>
                    10/31 00:00 ~ 11/13 16:30
                  </div>
                  <p className={`text-[11px] leading-relaxed pt-0.5 ${activeStage === 1 ? 'text-stone-600' : 'text-stone-400'}`}>
                    提出生活與產業切身痛點（過審即送 200 點），開放各隊選題解題。
                  </p>
                </div>

                {/* 階段 2A: 預先提案 (11/14 10:00 ~ 11/15 16:30) */}
                <div
                  className={`p-4 rounded-2xl space-y-1.5 relative overflow-hidden transition-all ${
                    activeStage === 2
                      ? 'bg-white border-2 border-amber-500 ring-2 ring-amber-400/20 shadow-md'
                      : 'bg-stone-50 border border-stone-200 text-stone-500 shadow-none'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        activeStage === 2
                          ? 'bg-amber-500 text-stone-950 font-bold'
                          : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      第二階段 (一)
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1 ${
                        activeStage === 2
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-stone-200/70 text-stone-500 border border-stone-200'
                      }`}
                    >
                      {activeStage === 2 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                      <span>{activeStage === 2 ? '預先提案中（當前）' : activeStage > 2 ? '已結束' : '即將開放'}</span>
                    </span>
                  </div>
                  <div className={`text-sm ${activeStage === 2 ? 'font-black text-stone-950' : 'font-bold text-stone-700'}`}>
                    預先提案
                  </div>
                  <div className={`text-xs font-mono ${activeStage === 2 ? 'font-black text-amber-700' : 'font-medium text-stone-400'}`}>
                    11/14 10:00 ~ 11/15 16:30
                  </div>
                  <p className={`text-[11px] leading-relaxed pt-0.5 ${activeStage === 2 ? 'text-stone-700 font-medium' : 'text-stone-400'}`}>
                    關閉募資(投資)功能。開放報名、線上提案、主辦審核與預覽。
                  </p>
                </div>

                {/* 階段 2B: 模擬募資與提案 (11/16 10:00 ~ 12/04 16:30) */}
                <div
                  className={`p-4 rounded-2xl space-y-1.5 relative overflow-hidden transition-all ${
                    activeStage === 3
                      ? 'bg-white border-2 border-emerald-500 ring-2 ring-emerald-400/20 shadow-md'
                      : 'bg-stone-50 border border-stone-200 text-stone-500 shadow-none'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        activeStage === 3
                          ? 'bg-emerald-500 text-white'
                          : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      第二階段 (二)
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1 ${
                        activeStage === 3
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-stone-200/70 text-stone-500 border border-stone-200'
                      }`}
                    >
                      {activeStage === 3 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                      <span>{activeStage === 3 ? '募資與提案中（當前）' : activeStage > 3 ? '已截止 (12/04 16:30)' : '即將開跑 (11/16 10:00)'}</span>
                    </span>
                  </div>
                  <div className={`text-sm ${activeStage === 3 ? 'font-black text-stone-950' : 'font-bold text-stone-700'}`}>
                    模擬募資與提案
                  </div>
                  <div className={`text-xs font-mono ${activeStage === 3 ? 'font-black text-emerald-700' : 'font-medium text-stone-400'}`}>
                    11/16 10:00 ~ 12/04 16:30
                  </div>
                  <p className={`text-[11px] leading-relaxed pt-0.5 ${activeStage === 3 ? 'text-stone-600' : 'text-stone-400'}`}>
                    開放報名、提案、創星幣注資與審核！總額前 20 名取得決選資格。
                  </p>
                </div>

                {/* 階段 3: 進入決選(評審) */}
                <div
                  className={`p-4 rounded-2xl space-y-1.5 relative overflow-hidden transition-all ${
                    activeStage === 4
                      ? 'bg-white border-2 border-emerald-500 ring-2 ring-emerald-400/20 shadow-md'
                      : 'bg-stone-50 border border-stone-200 text-stone-500 shadow-none'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        activeStage === 4
                          ? 'bg-emerald-500 text-white'
                          : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      第三階段
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1 ${
                        activeStage === 4
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-stone-200/70 text-stone-500 border border-stone-200'
                      }`}
                    >
                      {activeStage === 4 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                      <span>{activeStage === 4 ? '決選審查中（當前）' : activeStage > 4 ? '已結束' : '專家審查'}</span>
                    </span>
                  </div>
                  <div className={`text-sm ${activeStage === 4 ? 'font-black text-stone-950' : 'font-bold text-stone-700'}`}>
                    進入決選(評審)
                  </div>
                  <div className={`text-xs font-mono ${activeStage === 4 ? 'font-black text-emerald-700' : 'font-medium text-stone-400'}`}>
                    12/05 ~ 12/11
                  </div>
                  <p className={`text-[11px] leading-relaxed pt-0.5 ${activeStage === 4 ? 'text-stone-600' : 'text-stone-400'}`}>
                    由評審團進行專業審查與評分。
                  </p>
                </div>

                {/* 階段 4: 公布結果 */}
                <div
                  className={`p-4 rounded-2xl space-y-1.5 relative overflow-hidden transition-all ${
                    activeStage === 5
                      ? 'bg-white border-2 border-emerald-500 ring-2 ring-emerald-400/20 shadow-md'
                      : 'bg-stone-50 border border-stone-200 text-stone-500 shadow-none'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        activeStage === 5
                          ? 'bg-emerald-500 text-white'
                          : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      第四階段
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1 ${
                        activeStage === 5
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-stone-200/70 text-stone-500 border border-stone-200'
                      }`}
                    >
                      {activeStage === 5 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                      <span>{activeStage === 5 ? '已公布榜單（當前）' : '大會榮耀'}</span>
                    </span>
                  </div>
                  <div className={`text-sm ${activeStage === 5 ? 'font-black text-stone-950' : 'font-bold text-stone-700'}`}>
                    公布結果
                  </div>
                  <div className={`text-xs font-mono ${activeStage === 5 ? 'font-black text-emerald-700' : 'font-medium text-stone-400'}`}>
                    12/16 前公布
                  </div>
                  <p className={`text-[11px] leading-relaxed pt-0.5 ${activeStage === 5 ? 'text-stone-600' : 'text-stone-400'}`}>
                    於首頁盛大公告最終榜單，頒發榮譽與獎勵。
                  </p>
                </div>
              </div>
            );
          })()}

          {/* 賽程表區塊右下：完整競賽辦法-> */}
          <div className="pt-3 border-t border-stone-100 flex items-center justify-end mt-3">
            <button
              type="button"
              onClick={() => navigateToSubView('rules')}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline transition-colors cursor-pointer group"
              title="前往閱讀完整競賽辦法與規章章程"
            >
              <span>完整競賽辦法</span>
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* 主體內容：探索提案獨立專區 Spotlight (獨立子網址: ideax.tw/challenge/proposal) */}
      <div id="cases-overview-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">

        {/* 🎉 前台盛大公布：創星季決選獲獎榜單 Banner */}
        {isFinalResultsPublishedState && finalRankings.length > 0 && (
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-stone-950 via-stone-900 to-amber-950 text-white border-2 border-amber-400 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-500/40 pb-5">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400 text-stone-950 text-xs font-black">
                  <Trophy className="w-4 h-4" />
                  <span>2026 IdeaX 創星季 • 決選得獎榜單盛大揭曉</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight">
                  🎉 決選最終評定名次榜單
                </h2>
                <p className="text-xs sm:text-sm text-stone-300">
                  依競賽辦法標準（創新性 40%、完整度 20%、可行性 20%、商業潛力 20%），經評審團審查並採算術平均計算核定。
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => exportFinalRankingsExcel(finalRankings)}
                  className="px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs flex items-center gap-2 shadow-md cursor-pointer transition-transform active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>匯出決選榜單 Excel (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* 冠亞季軍頒獎台卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {finalRankings.slice(0, 3).map((winner) => (
                <div
                  key={winner.proposalId}
                  className={`p-5 rounded-2xl border transition-all ${
                    winner.rank === 1
                      ? 'bg-gradient-to-b from-amber-900/60 to-stone-900 border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                      : winner.rank === 2
                      ? 'bg-gradient-to-b from-stone-800 to-stone-900 border-stone-400'
                      : 'bg-gradient-to-b from-amber-950/60 to-stone-900 border-amber-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">
                      {winner.rank === 1 ? '🥇' : winner.rank === 2 ? '🥈' : '🥉'}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-300">
                      評審平均分: {winner.averageFinalScore.toFixed(2)} 分
                    </span>
                  </div>
                  <div className="font-mono text-xs font-bold text-amber-400 mt-2">
                    {winner.rank === 1 ? '第一名 (冠軍大獎)' : winner.rank === 2 ? '第二名 (亞軍殊榮)' : '第三名 (季軍殊榮)'}
                  </div>
                  <h3 className="text-base font-black text-white mt-1 line-clamp-1">
                    {winner.proposalTitle}
                  </h3>
                  <div className="text-xs text-stone-300 mt-0.5">
                    團隊：<strong>{winner.authorName}</strong> · 賽道：{winner.trackName}
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10 text-xs font-bold text-amber-200">
                    獲得 {winner.rank === 1 ? 'NT$20,000' : winner.rank === 2 ? 'NT$6,000' : 'NT$3,000'} 現金 ＋ {winner.pointsReward.toLocaleString()} 點平台點數
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-amber-50/80 via-white to-stone-50 rounded-3xl border border-amber-300/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-200/60 pb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-stone-950 tracking-tight">
                當前提案
              </h2>
              <p className="text-stone-600 text-xs sm:text-sm mt-1 max-w-2xl font-medium leading-relaxed">
                本屆創星季提案庫已全面獨立至專屬滿版網頁！匯聚青年原創解法，支援依賽道篩選、按讚收藏、模擬注資投點與特聘評審深度交流。
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => navigateToSubView('proposal')}
                className="px-5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs sm:text-sm shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                <Compass className="w-4 h-4" />
                <span>進入總覽</span>
              </button>
            </div>
          </div>

          {/* 領域探索標籤（四大領域分類：機電運輸、資通訊、生醫化材、服務文創） */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] font-bold text-stone-500 shrink-0">領域標注探索：</span>
            {OFFICIAL_COMPETITION_TRACKS.map((tr) => (
              <button
                key={tr.id}
                type="button"
                onClick={() => navigateToSubView('proposal')}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 text-stone-700 border border-stone-200 text-xs font-bold whitespace-nowrap cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5"
              >
                <span>{tr.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                  {tr.tag}
                </span>
              </button>
            ))}
          </div>

          {/* 精選前 3 件提案預覽卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {(proposals.slice(0, 3).length > 0 ? proposals.slice(0, 3) : [
              {
                id: 'demo-1',
                title: '智農 AI 蔬果病蟲害即時預警無人機',
                authorName: '臺大智慧農創隊',
                track: 'ai_applications' as StarSeasonTrack,
                stage: 'solution' as StarSeasonStage,
                summary: '結合輕量邊緣運算無人機與近紅外光譜分析，於田間即時偵測早期病蟲害，減少 60% 農藥使用量。',
                supportPoints: 128000,
                likeCount: 42,
                commentsCount: 9,
              },
              {
                id: 'demo-2',
                title: '全齡永續健康守護手環與居家照護雲',
                authorName: '陽明交大銀髮智慧生技',
                track: 'social_innovation' as StarSeasonTrack,
                stage: 'solution' as StarSeasonStage,
                summary: '無感配戴之毫米波跌倒偵測與心律異步回報系統，串連社區照護據點與家屬即時告警通知。',
                supportPoints: 86000,
                likeCount: 31,
                commentsCount: 6,
              },
              {
                id: 'demo-3',
                title: '大學校園循環包材共享快遞站系統',
                authorName: '成功大學淨零綠生活專案組',
                track: 'green_tech' as StarSeasonTrack,
                stage: 'pain_point' as StarSeasonStage,
                summary: '解決大專校園網購快遞包裝垃圾堆積成災問題，建置模組化循環包裝回收與點數回饋站。',
                supportPoints: 45000,
                likeCount: 28,
                commentsCount: 4,
              },
            ]).map((p) => {
              const trackInfo = STAR_SEASON_TRACKS[p.track] || STAR_SEASON_TRACKS.ai_applications;
              return (
                <div
                  key={p.id}
                  onClick={() => navigateToSubView('proposal')}
                  className="bg-white rounded-2xl border border-stone-200 hover:border-amber-400 p-4 flex flex-col justify-between transition-all hover:shadow-md cursor-pointer group shadow-2xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                        {trackInfo.tag}
                      </span>
                      <span className="text-[10px] font-bold text-stone-400">
                        {p.stage === 'pain_point' ? '痛點徵件' : '解法提案'}
                      </span>
                    </div>
                    <h3 className="font-black text-stone-900 group-hover:text-amber-600 transition-colors line-clamp-1 text-sm">
                      {p.title}
                    </h3>
                    <p className="text-stone-600 text-xs line-clamp-2 leading-relaxed">
                      {p.summary}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                    <div className="font-mono font-bold text-amber-700">
                      ${(p.supportPoints || 0).toLocaleString()} 點支持
                    </div>
                    <div className="flex items-center gap-2 text-stone-400 text-[11px]">
                      <span className="flex items-center gap-0.5">
                        <Heart className="w-3 h-3 text-rose-500 fill-rose-500/20" />
                        {p.likeCount || 0}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <MessageSquare className="w-3 h-3 text-amber-500" />
                        {p.commentsCount || 0}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 底部醒目 CTA 橫幅 */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 bg-amber-100/60 p-4 rounded-2xl border border-amber-300/80">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
              <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
              <span>探索全部參賽隊伍、完整計畫簡報、模擬注資與特聘專家回饋</span>
            </div>
            <button
              type="button"
              onClick={() => navigateToSubView('proposal')}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-stone-950 hover:bg-stone-800 text-amber-300 hover:text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-98"
            >
              <span>進入總覽</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 首頁資訊：活動獎項、大略規則與前往專門競賽辦法頁之文字連結 */}
        <div className="mt-16 pt-10 border-t border-stone-200 space-y-12">
          {/* 1. 活動獎項專區 */}
          <section id="homepage-awards-section" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Trophy className="w-4.5 h-4.5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-stone-900">
                    活動獎項
                  </h2>
                  <p className="text-xs text-stone-500 font-medium">總獎金回饋、官方「創之星」最高榮譽與雙向共創好禮</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigateToSubView('rules')}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer transition-colors self-start sm:self-auto"
              >
                <span>完整競賽辦法</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 前三名大獎卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 冠軍 */}
              <div className="bg-gradient-to-b from-amber-50/80 via-white to-stone-50 p-5 rounded-2xl border-2 border-amber-300 shadow-xs relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-stone-950" />
                      <span>第一名</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">
                      First Prize
                    </span>
                  </div>
                  <h3 className="text-base font-black text-stone-900">🏆 冠軍大獎</h3>
                  <div className="text-2xl sm:text-3xl font-black text-amber-700 font-mono tracking-tight">
                    NT$30,000 <span className="text-xs text-stone-500 font-normal">等值獎勵</span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed pt-1">
                    <b>NT$20,000 現金</b> ＋ <b>8,000 點</b> IdeaX 平台點數（點數效期 180 日）＋ 官方「創之星」最高榮譽徽章。
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-amber-200/60 text-[11px] font-bold text-amber-900 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>官方最高榮耀認證與社群推薦</span>
                </div>
              </div>

              {/* 亞軍 */}
              <div className="bg-gradient-to-b from-stone-50 via-white to-stone-50 p-5 rounded-2xl border border-stone-200 shadow-2xs flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-stone-200 text-stone-800 flex items-center gap-1">
                      <Award className="w-3 h-3 text-stone-700" />
                      <span>第二名</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                      Second Prize
                    </span>
                  </div>
                  <h3 className="text-base font-black text-stone-900">🥈 亞軍殊榮</h3>
                  <div className="text-2xl sm:text-3xl font-black text-stone-900 font-mono tracking-tight">
                    NT$10,000 <span className="text-xs text-stone-500 font-normal">等值獎勵</span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed pt-1">
                    <b>NT$6,000 現金</b> ＋ <b>3,200 點</b> IdeaX 平台點數（點數效期 180 日）＋ 官方「創之星」榮譽徽章。
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-stone-100 text-[11px] font-bold text-stone-600 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-stone-400" />
                  <span>官方重點孵化推薦方案</span>
                </div>
              </div>

              {/* 季軍 */}
              <div className="bg-gradient-to-b from-stone-50 via-white to-stone-50 p-5 rounded-2xl border border-stone-200 shadow-2xs flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-stone-200 text-stone-800 flex items-center gap-1">
                      <Award className="w-3 h-3 text-stone-700" />
                      <span>第三名</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                      Third Prize
                    </span>
                  </div>
                  <h3 className="text-base font-black text-stone-900">🥉 季軍殊榮</h3>
                  <div className="text-2xl sm:text-3xl font-black text-stone-900 font-mono tracking-tight">
                    NT$5,000 <span className="text-xs text-stone-500 font-normal">等值獎勵</span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed pt-1">
                    <b>NT$3,000 現金</b> ＋ <b>1,600 點</b> IdeaX 平台點數（點數效期 180 日）＋ 官方「創之星」榮譽徽章。
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-stone-100 text-[11px] font-bold text-stone-600 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-stone-400" />
                  <span>社群高人氣創客推薦</span>
                </div>
              </div>
            </div>

            {/* 人人有獎痛點提出獎、痛點採用獎與推廣大使卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 space-y-1.5 text-xs text-stone-700">
                <div className="font-bold text-stone-900 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <span>痛點提出獎（人人有獎）</span>
                </div>
                <p className="leading-relaxed text-stone-600">
                  只要成功提出生活或產業痛點（需過審），即送 <b>200 點</b>（價值 $250 的 IdeaX 創點子平台點數，效期 60 日）。
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5 text-xs text-stone-700">
                <div className="font-bold text-stone-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-700" />
                  <span>痛點採用好禮</span>
                </div>
                <p className="leading-relaxed text-stone-600">
                  獲獎提案採用您的痛點：前 1~3 名享價值 <b>NT$1,500</b> 等值好禮（含 1,200 點提問金）；前 4~10 名享價值 <b>$500</b> 好禮（效期 60 日）。
                </p>
              </div>

              <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-1.5 text-xs text-stone-700">
                <div className="font-bold text-stone-900 flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-purple-600" />
                  <span>推廣大使推薦獎</span>
                </div>
                <p className="leading-relaxed text-stone-600">
                  每成功推薦 1 案審核通過，推薦人享 <b>300 點</b>（價值 $400）IdeaX 平台點數（效期 60 日，多推多得無上限）。
                </p>
              </div>
            </div>

            {/* 點數效期規範提醒 */}
            <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-stone-700 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <b>點數有效期限特別說明：</b>前三名（冠、亞、季軍）獲獎團隊點數效期為 <b>180 日</b>，其餘所有獎勵點數（痛點獎、採用好禮、大使獎）效期皆為 <b>60 日</b>。
              </span>
            </div>
          </section>

          {/* 2. 競賽辦法專區 */}
          <section id="homepage-brief-rules-section" className="space-y-6 pt-6 border-t border-stone-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4.5 h-4.5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-stone-900">
                    競賽辦法
                  </h2>
                  <p className="text-xs text-stone-500 font-medium">免預先報名、題目設定、模擬募資與特聘專家評審機制</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigateToSubView('rules')}
                className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors self-start sm:self-auto"
              >
                <span>完整競賽辦法</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 大略規則四大核心卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 規則 1: 參加資格與報名方式 */}
              <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-stone-900 text-white font-mono text-xs flex items-center justify-center font-bold">1</span>
                  <h3 className="font-black text-stone-900 text-sm">參加資格與報名方式</h3>
                </div>
                <ul className="text-xs text-stone-600 leading-relaxed space-y-1.5 list-disc list-inside">
                  <li><b>身分不限：</b>不限在學學生或社會人士，個人獨立或 1~5 人自由組隊皆可參加。</li>
                  <li><b>不可兼任：</b><b>不可兼任參賽者與專家</b>，為維護評選公正與利益迴避，身分嚴格互斥。</li>
                  <li><b>隊伍計算：</b>以每個帳號算計一隊，每隊不限提案或痛點數量。</li>
                  <li><b>報名時段：</b>10/24 00:00 ~ 12/04 16:30（提痛點請於 11/13 16:30 前報名）。</li>
                </ul>
              </div>

              {/* 規則 2: 競賽主題與交稿方式 */}
              <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-stone-900 text-white font-mono text-xs flex items-center justify-center font-bold">2</span>
                  <h3 className="font-black text-stone-900 text-sm">競賽主題與交稿方式</h3>
                </div>
                <ul className="text-xs text-stone-600 leading-relaxed space-y-1.5 list-disc list-inside">
                  <li><b>雙軌並行：</b><b>可以同時提出痛點與解決方案</b>，提痛點過審即享 200 點，亦可提方案角逐大獎。</li>
                  <li><b>提痛點：</b>提出生活中感到煩惱困擾的地方共同腦力激盪（過審送 200 點）。</li>
                  <li><b>提方案：</b>從痛點庫選題，尋找能解決問題的「創新方法」或「創新事物」。</li>
                  <li><b>線上交稿：</b>至提案專頁填寫標題、領域分類、摘要、企劃四部曲與 BP 簡報附件。</li>
                </ul>
              </div>

              {/* 規則 3: 評審機制與評分比重 */}
              <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-stone-900 text-white font-mono text-xs flex items-center justify-center font-bold">3</span>
                  <h3 className="font-black text-stone-900 text-sm">評審機制與指標比重</h3>
                </div>
                <ul className="text-xs text-stone-600 leading-relaxed space-y-1.5 list-disc list-inside">
                  <li><b>初審入圍：</b>第二階段大眾模擬注資總額排名前 20 名晉級決審。</li>
                  <li><b>專家評審：</b>由評審團審查（名單暫不公布以維持公正）。</li>
                  <li><b>四大維度比重：</b><b>創新性 40%</b>、<b>完整度 20%</b>、<b>可行性 20%</b>、<b>商業潛力 20%</b>。</li>
                </ul>
              </div>

              {/* 規則 4: 核心注意事項與權益 */}
              <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-stone-900 text-white font-mono text-xs flex items-center justify-center font-bold">4</span>
                  <h3 className="font-black text-stone-900 text-sm">核心注意事項與權益</h3>
                </div>
                <ul className="text-xs text-stone-600 leading-relaxed space-y-1.5 list-disc list-inside">
                  <li><b>原創保證：</b>嚴禁抄襲剽竊或冒名侵權，違者取消資格並追回全數獎勵。</li>
                  <li><b>幣別性質：</b>創星幣純屬大賽模擬驗證，非真實法幣，禁止私下兌現買賣。</li>
                  <li><b>防刷反作弊：</b>嚴禁分身機器人灌票洗幣，經查違規直接取消評選資格。</li>
                  <li><b>獎金與點數：</b>獎金依法申報代扣稅額，前三名點數效期 180 日，其餘 60 日。</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3. 專屬文字連結卡片：引導進入專門的競賽辦法頁 */}
          <section className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-md border border-stone-700/80">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  想深入瞭解完整競賽章程、報名細節與常見問答？
                </h3>
                <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
                  包含：壹、競賽緣起 ｜ 貳、報名時間 ｜ 參、參賽資格 ｜ 肆、報名方式 ｜ 伍、競賽主題設定 ｜ 陸、交稿方式 ｜ 柒、活動獎項 ｜ 捌、評審機制 ｜ 玖、活動時程 ｜ 拾、其他注意事項與詳細常見問答 FAQ。
                </p>
              </div>

              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    navigateToSubView('rules');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 group"
                >
                  <BookOpen className="w-4 h-4 text-stone-950" />
                  <span>前往［競賽辦法］</span>
                  <span className="transition-transform group-hover:translate-x-1 font-bold">→</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* 創星季獨立站頁尾 (主辦單位: IdeaX團隊 / logo-6-trans-dark / ideax.office@gmail.com / 造訪IdeaX創點子平台) */}
      <CompetitionFooter onBackToOldSite={onBackToOldSite} onNavigate={navigateToSubView} />

      {/* 提案詳情 Modal (教育部大專校院募資實戰模擬學習平台 cases 詳情與回饋風格) */}
      {selectedProposalForDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-amber-300 rounded-3xl max-w-2xl w-full p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto shadow-2xl text-stone-900">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <img src="/logo-bulb.png" alt="黃色正向去背燈泡" className="w-5 h-5 object-contain shrink-0" />
                <img src="/logo-chuangxingji-text.png" alt="創星季去背" className="h-5 w-auto object-contain shrink-0" />
                <h3 className="text-base font-black text-stone-900 ml-1">提案詳情 — 創新提案</h3>
              </div>
              <button
                onClick={() => setSelectedProposalForDetail(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* 賽道與階段標籤 */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                  {selectedProposalForDetail.stage === 'pain_point' ? '第一階段：徵點子（痛點）' : '第二階段：想解方（解法）'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200 font-bold">
                  {STAR_SEASON_TRACKS[selectedProposalForDetail.track]?.name}
                </span>
                {selectedProposalForDetail.finalRank && selectedProposalForDetail.finalRank <= 3 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 font-black">
                    第 {selectedProposalForDetail.finalRank} 名獲獎
                  </span>
                )}
              </div>

              {/* 標題 */}
              <h2 className="text-lg font-black text-stone-900 leading-snug">
                {selectedProposalForDetail.title}
              </h2>

              {/* 提案人與學校資訊 */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50/60 border border-amber-200">
                <div className="w-9 h-9 rounded-full bg-amber-200 text-amber-950 font-black flex items-center justify-center text-sm border border-amber-300 shrink-0">
                  {selectedProposalForDetail.authorName.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                    <span>{selectedProposalForDetail.authorName}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                      創新盃
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    提交時間：{new Date(selectedProposalForDetail.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* 關聯痛點資訊 */}
              {selectedProposalForDetail.sourcePainPointTitle && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                  <span className="font-black text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    本解方提案採用的來源痛點：
                  </span>
                  <p className="text-stone-800 font-bold italic">
                    {selectedProposalForDetail.sourcePainPointTitle}
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    若獲特聘專家評審為前三名獲獎解方，獲獎提案使用之痛點提出者可獲獎勵：價值$1500好禮（1200點提問金,用於IdeaX平台提問或使用特色功能）！
                  </p>
                </div>
              )}

              {/* 提案摘要 */}
              <div>
                <h4 className="font-black text-stone-900 mb-1">提案摘要</h4>
                <p className="text-stone-700 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200">
                  {selectedProposalForDetail.summary}
                </p>
              </div>

              {/* 詳細說明 */}
              <div>
                <h4 className="font-black text-stone-900 mb-1">
                  {selectedProposalForDetail.stage === 'pain_point' ? '痛點詳述說明' : '詳細執行方案與創新價值'}
                </h4>
                <div className="text-stone-700 leading-relaxed bg-stone-50 p-3.5 rounded-xl border border-stone-200 whitespace-pre-line">
                  {selectedProposalForDetail.description || selectedProposalForDetail.summary}
                </div>
              </div>

              {/* 照片 / 圖片展示區 */}
              {selectedProposalForDetail.images && selectedProposalForDetail.images.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-black text-stone-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-amber-600" />
                      <span>{selectedProposalForDetail.stage === 'pain_point' ? '痛點照片/圖片' : '提案相片展示'}</span>
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      共 {selectedProposalForDetail.images.length} 張
                    </span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {selectedProposalForDetail.images.map((img, idx) => (
                      <div key={idx} className="rounded-2xl overflow-hidden border border-amber-200 bg-white aspect-video shadow-2xs group relative">
                        <img src={img} alt={`img-${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 補充資料區塊 (技術可行性、市場分析與定位、商業模式與財務預測、外部連結) */}
              {(selectedProposalForDetail.technicalFeasibility || selectedProposalForDetail.marketAnalysis || selectedProposalForDetail.businessModelFinancials || selectedProposalForDetail.externalLink) && (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2.5">
                  <h4 className="font-black text-amber-950 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-700" />
                    <span>提案補充資料與延伸連結</span>
                  </h4>

                  {selectedProposalForDetail.technicalFeasibility && (
                    <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                      <div className="font-bold text-stone-900 text-[11px] mb-0.5">• 技術可行性說明</div>
                      <p className="text-stone-700 whitespace-pre-line leading-relaxed">{selectedProposalForDetail.technicalFeasibility}</p>
                    </div>
                  )}

                  {selectedProposalForDetail.marketAnalysis && (
                    <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                      <div className="font-bold text-stone-900 text-[11px] mb-0.5">• 市場分析與定位</div>
                      <p className="text-stone-700 whitespace-pre-line leading-relaxed">{selectedProposalForDetail.marketAnalysis}</p>
                    </div>
                  )}

                  {selectedProposalForDetail.businessModelFinancials && (
                    <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                      <div className="font-bold text-stone-900 text-[11px] mb-0.5">• 商業模式與財務預測</div>
                      <p className="text-stone-700 whitespace-pre-line leading-relaxed">{selectedProposalForDetail.businessModelFinancials}</p>
                    </div>
                  )}

                  {selectedProposalForDetail.externalLink && (
                    <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60 flex items-center justify-between gap-2">
                      <div className="truncate text-stone-700">
                        <span className="font-bold text-stone-900 mr-1.5">• 外部連結:</span>
                        <a href={selectedProposalForDetail.externalLink} target="_blank" rel="noreferrer" className="text-amber-700 underline font-mono text-[11px]">
                          {selectedProposalForDetail.externalLink}
                        </a>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    </div>
                  )}
                </div>
              )}

              {/* 標籤列展示 (含 AI 市場顧問 Agent 自動賦予標籤) */}
              {selectedProposalForDetail.tags && selectedProposalForDetail.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] text-stone-500 font-bold">標籤：</span>
                  {selectedProposalForDetail.tags.map((tg, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200 text-[10px] font-bold">
                      #{tg}
                    </span>
                  ))}
                  {selectedProposalForDetail.aiCategorized && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                      🤖 AI市場顧問智慧領域
                    </span>
                  )}
                </div>
              )}

              {/* 若為痛點專頁：直接在此提出方案（直用提案頁） */}
              {selectedProposalForDetail.stage === 'pain_point' && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100/90 border-2 border-amber-400 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-amber-400 text-stone-950 font-black flex items-center justify-center text-xs shadow-2xs">
                        💡
                      </div>
                      <span className="font-black text-stone-950 text-sm">針對此痛點提出創新方案</span>
                    </div>
                    <span className="text-[11px] font-bold text-amber-900 bg-amber-200 px-2.5 py-0.5 rounded-full border border-amber-300">
                      直用提案頁
                    </span>
                  </div>
                  <p className="text-stone-700 text-xs leading-relaxed">
                    你有解決此痛點的創新產品、商業模式或技術架構嗎？直接點擊下方按鈕提出解方，系統將自動預選帶入此痛點，填寫資料與規格完全比照大賽提案頁！
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        sessionStorage.setItem(
                          'ideax_challenge_prefill_topic',
                          JSON.stringify({
                            id: selectedProposalForDetail.id,
                            title: selectedProposalForDetail.title,
                            serial: selectedProposalForDetail.id,
                            summary: selectedProposalForDetail.summary,
                            track: selectedProposalForDetail.track,
                          })
                        );
                      } catch {}
                      setSelectedProposalForDetail(null);
                      if (!isLoggedIn) {
                        onOpenAuth();
                        return;
                      }
                      navigateToSubView('submit');
                    }}
                    className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-stone-950" />
                    <span>針對此痛點提出方案（直用提案頁）</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              )}

              {/* 附件檔案 */}
              {selectedProposalForDetail.attachmentUrl && (
                <div className="p-3 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="truncate font-bold text-stone-800">
                      {selectedProposalForDetail.attachmentName || '提案簡報與計畫附件'}
                    </span>
                  </div>
                  <a
                    href={selectedProposalForDetail.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 rounded-lg bg-amber-400 text-stone-950 font-black text-xs hover:bg-amber-300 cursor-pointer shrink-0"
                  >
                    下載附件
                  </a>
                </div>
              )}

              {/* 創星幣募資進度 */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-stone-800">使用 創星幣 支持你認同的創新提案</span>
                  <span className="font-mono font-black text-amber-800 text-sm">
                    {selectedProposalForDetail.supportPoints.toLocaleString()} 創星幣（
                    {Math.min(Math.round(((selectedProposalForDetail.supportPoints || 0) / 100000) * 100), 1000)}%）
                  </span>
                </div>
                <div className="w-full bg-white h-2.5 rounded-full overflow-hidden border border-amber-200">
                  <div
                    className="bg-gradient-to-r from-amber-400 to-yellow-500 h-full rounded-full"
                    style={{
                      width: `${Math.min(
                        Math.round(((selectedProposalForDetail.supportPoints || 0) / 100000) * 100),
                        100
                      )}%`,
                    }}
                  />
                </div>
                <div className="text-[11px] text-stone-500 flex justify-between">
                  <span>支持人次：{selectedProposalForDetail.supporterCount || 0} 人</span>
                  <span>目標額度：100,000 創星幣</span>
                </div>
              </div>

              {/* 專家評審與教練輔導回饋專區 (教育部 SSP 專屬特色) */}
              <div className="p-3.5 rounded-2xl bg-white border border-stone-200 space-y-2 shadow-2xs">
                <div className="flex items-center gap-1.5 font-black text-stone-900">
                  <MessageSquare className="w-4 h-4 text-amber-500" />
                  <span>特聘專家評審與業師教練回饋</span>
                </div>
                {selectedProposalForDetail.reviewNote ? (
                  <p className="text-stone-700 bg-stone-50 p-2.5 rounded-xl border border-stone-200 italic">
                    「{selectedProposalForDetail.reviewNote}」
                  </p>
                ) : (
                  <p className="text-stone-400 italic text-[11px]">
                    目前該提案已通過初審，正在進行全體模擬募資中；募資前 20 名將由特聘專家小組於 12/01–12/06 決審階段給予深度輔導回饋。
                  </p>
                )}
              </div>

              {/* 愛心按讚收藏條 (參賽者、專家、用戶皆可按讚並收入個人收藏) */}
              <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleLike(selectedProposalForDetail.id)}
                    className={`p-2 rounded-xl border text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                      likedProposalIds.includes(selectedProposalForDetail.id)
                        ? 'bg-rose-500 text-white border-rose-500 shadow-2xs'
                        : 'bg-white text-rose-600 border-rose-300 hover:bg-rose-100/50'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${likedProposalIds.includes(selectedProposalForDetail.id) ? 'fill-white text-white' : 'fill-rose-500 text-rose-500'}`} />
                    <span>{likedProposalIds.includes(selectedProposalForDetail.id) ? '已按讚收藏' : '按讚收藏提案'}</span>
                  </button>
                  <span className="text-xs text-rose-900 font-bold">
                    累計 {selectedProposalForDetail.likeCount || 0} 個愛心
                  </span>
                </div>
                <span className="text-[11px] text-stone-500 hidden sm:inline">
                  按讚後將自動收錄於右側個人列表「我的收藏」
                </span>
              </div>

              {/* 社群討論串 (交流互動、參賽者與專家討論) */}
              <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <div className="flex items-center gap-2 font-black text-stone-900 text-xs">
                    <MessageSquare className="w-4 h-4 text-amber-500" />
                    <span>社群討論與評審交流區</span>
                    <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold">
                      {activeComments.length} 則留言
                    </span>
                  </div>
                  {isLoadingComments && (
                    <span className="text-[10px] text-amber-600 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>載入留言中...</span>
                    </span>
                  )}
                </div>

                {/* 留言列表 */}
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {activeComments.length === 0 ? (
                    <div className="py-6 text-center text-stone-400 space-y-1">
                      <MessageSquare className="w-8 h-8 mx-auto text-stone-300 stroke-1" />
                      <p className="text-xs">目前尚無討論留言</p>
                      <p className="text-[10px] text-stone-400">歡迎參賽者、特聘評審與會員提出建議、提問或交流！</p>
                    </div>
                  ) : (
                    activeComments.map((cm) => (
                      <div key={cm.id} className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-stone-800">
                            <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-[10px] font-black shrink-0">
                              {cm.authorName.charAt(0)}
                            </div>
                            <span>{cm.authorName}</span>
                            {cm.authorRole === 'expert' ? (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-200">
                                {cm.roleBadgeText || '評審專家'}
                              </span>
                            ) : cm.authorRole === 'participant' ? (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                {cm.roleBadgeText || '創星季參賽者'}
                              </span>
                            ) : null}
                          </div>
                          <span className="text-[10px] text-stone-400">
                            {new Date(cm.createdAt).toLocaleDateString()} {new Date(cm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-stone-700 whitespace-pre-line pl-6.5 leading-relaxed text-[11px]">
                          {cm.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* 留言輸入框 */}
                <div className="pt-2 border-t border-stone-100 space-y-2">
                  <div className="relative">
                    <textarea
                      rows={2}
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder={
                        isLoggedIn
                          ? '留下您對此提案的提問、建議或鼓勵...'
                          : '請先登入後發表討論留言...'
                      }
                      disabled={!isLoggedIn || isSubmittingComment}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-400 resize-none disabled:bg-stone-100"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-stone-400">
                      支持友善交流，嚴禁廣告或不當言論
                    </span>
                    <button
                      type="button"
                      onClick={handleAddComment}
                      disabled={!isLoggedIn || isSubmittingComment || !newCommentText.trim()}
                      className="px-4 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      {isSubmittingComment ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>送出留言</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 底部投點與提案操作按鈕 */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                {selectedProposalForDetail.stage === 'pain_point' && (
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        sessionStorage.setItem(
                          'ideax_challenge_prefill_topic',
                          JSON.stringify({
                            id: selectedProposalForDetail.id,
                            title: selectedProposalForDetail.title,
                            serial: selectedProposalForDetail.id,
                            summary: selectedProposalForDetail.summary,
                            track: selectedProposalForDetail.track,
                          })
                        );
                      } catch {}
                      setSelectedProposalForDetail(null);
                      if (!isLoggedIn) {
                        onOpenAuth();
                        return;
                      }
                      navigateToSubView('submit');
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4 text-stone-950" />
                    <span>針對此痛點提出方案（直用提案頁）</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (stageInfo.isPreProposalStage) {
                      showToast('ℹ️ 11/14 ~ 11/15 為預先提案期，募資(投資)功能暫時關閉，僅供提案審核與預覽！11/16 起正式開放注資。');
                      return;
                    }
                    if (!stageInfo.isInvestmentEnabled) {
                      showToast('ℹ️ 創星幣模擬募資將於 11/16 ~ 12/04 開放！');
                      return;
                    }
                    setSelectedProposalForSupport(selectedProposalForDetail);
                    setSelectedProposalForDetail(null);
                    setIsSupportModalOpen(true);
                  }}
                  className={`py-2.5 rounded-xl border border-amber-300 text-stone-950 font-black text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 ${
                    !stageInfo.isInvestmentEnabled
                      ? 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'
                      : selectedProposalForDetail.stage === 'pain_point'
                      ? 'bg-amber-100 hover:bg-amber-200 px-4'
                      : 'flex-1 bg-amber-400 hover:bg-amber-300'
                  }`}
                  title={!stageInfo.isInvestmentEnabled ? '預先提案期（11/14~11/15）募資功能關閉，11/16 正式開放' : undefined}
                >
                  <Heart className={`w-4 h-4 ${stageInfo.isInvestmentEnabled ? 'fill-current text-rose-500' : 'text-stone-400'}`} />
                  <span>
                    {stageInfo.isPreProposalStage
                      ? '預先提案期（募資暫未開放）'
                      : `使用創星幣支持${selectedProposalForDetail.stage === 'pain_point' ? '痛點' : '提案'}`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProposalForDetail(null)}
                  className="px-5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs cursor-pointer"
                >
                  關閉
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 提交新提案 Modal (純白背景，金黃標籤，無黑色) */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-amber-300 rounded-3xl max-w-2xl w-full p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto shadow-2xl text-stone-900">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <img src="/logo-bulb.png" alt="黃色正向去背燈泡" className="w-5 h-5 object-contain shrink-0" />
                <img src="/logo-chuangxingji-text.png" alt="創星季去背" className="h-5 w-auto object-contain shrink-0" />
                <h3 className="text-base font-black text-stone-900 ml-1">投件參賽 — IdeaX 創星季</h3>
              </div>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitProposalForm} className="space-y-4 text-xs">
              {/* 選擇階段 */}
              <div>
                <label className="block text-stone-800 font-bold mb-1.5">參賽階段</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormStage('pain_point')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      formStage === 'pain_point'
                        ? 'bg-rose-50 border-rose-400 text-rose-950 font-black shadow-xs'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <div className="font-black text-xs">第一階段：徵點子</div>
                    <div className="text-[10px] text-stone-500 mt-0.5">提出生活或校園的真實痛點問題</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormStage('solution')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      formStage === 'solution'
                        ? 'bg-amber-50 border-amber-400 text-amber-950 font-black shadow-xs'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <div className="font-black text-xs">第二階段：想解方</div>
                    <div className="text-[10px] text-stone-500 mt-0.5">針對痛點提出完整可行落地解法</div>
                  </button>
                </div>
              </div>

              {/* 第二階段可選擇引用之來源痛點 */}
              {formStage === 'solution' && (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                  <label className="block font-bold text-amber-900">
                    採用之來源痛點提案（獲獎提案使用之痛點提出者可獲獎勵：價值$1500好禮，含1200點提問金）
                  </label>
                  <select
                    value={formSourcePainPointId}
                    onChange={(e) => setFormSourcePainPointId(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-xl p-2 text-stone-900 text-xs focus:outline-none focus:border-amber-400"
                  >
                    <option value="">-- 自主原創解法（未採用特定痛點） --</option>
                    {painPointProposals.map((pp) => (
                      <option key={pp.id} value={pp.id}>
                        【{STAR_SEASON_TRACKS[pp.track]?.tag}】{pp.title} (by {pp.authorName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 賽道選擇 */}
              <div>
                <label className="block text-stone-800 font-bold mb-1.5">專題賽道</label>
                <select
                  value={formTrack}
                  onChange={(e) => setFormTrack(e.target.value as StarSeasonTrack)}
                  className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 text-xs focus:outline-none focus:border-amber-400"
                >
                  {OFFICIAL_COMPETITION_TRACKS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 標題 */}
              <div>
                <label className="block text-stone-800 font-bold mb-1">
                  提案標題 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="簡明扼要點出痛點或解法核心（20字內佳）"
                  className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* 摘要 */}
              <div>
                <label className="block text-stone-800 font-bold mb-1">
                  提案摘要 (100–200字) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  placeholder="簡單說明痛點受眾、場景，或解方核心運作邏輯..."
                  className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* 詳細說明 */}
              <div>
                <label className="block text-stone-800 font-bold mb-1">
                  詳細說明與執行架構 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="具體描述背景調查、技術構想、資源需求或預期成效..."
                  className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* 附件上傳 (PDF/ZIP/簡報) */}
              <div>
                <label className="block text-stone-800 font-bold mb-1">提案企劃簡報或附件 (選填，限 20MB)</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center gap-1.5 border border-stone-200">
                    <Upload className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isUploadingFile ? '上傳中...' : '選擇檔案'}</span>
                    <input
                      type="file"
                      accept=".pdf,.zip,.docx,.pptx"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploadingFile}
                    />
                  </label>
                  {formAttachment && (
                    <span className="text-emerald-700 font-bold text-xs truncate max-w-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {formAttachment.name}
                    </span>
                  )}
                </div>
              </div>

              {/* 校園大使推薦碼 */}
              <div>
                <label className="block text-stone-800 font-bold mb-1">校園大使推薦碼 (選填)</label>
                <input
                  type="text"
                  value={formAmbassadorCode}
                  onChange={(e) => setFormAmbassadorCode(e.target.value)}
                  placeholder="例如：AMB-TAIWAN888（提案過審將為推薦大使記錄 300 點（價值 $400）IdeaX 平台點數，用於提問、享受付費服務）"
                  className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* 敏感資料隔離區塊 (電話/身分證/銀行帳號，保證隔離) */}
              <div className="pt-3 border-t border-stone-200 space-y-3">
                <div className="flex items-center gap-1.5 text-stone-800 font-black text-xs">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>領獎與聯絡資料（安全私有隔離，絕對不公開）</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-stone-600 mb-1">
                      聯絡人姓名 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="真實姓名"
                      className="w-full bg-white border border-stone-300 rounded-xl p-2 text-stone-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-600 mb-1">
                      聯絡電話 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="09xx-xxx-xxx"
                      className="w-full bg-white border border-stone-300 rounded-xl p-2 text-stone-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-600 mb-1">
                      電子信箱 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full bg-white border border-stone-300 rounded-xl p-2 text-stone-900 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-stone-600 mb-1">學校 / 機構</label>
                    <input
                      type="text"
                      value={schoolOrOrg}
                      onChange={(e) => setSchoolOrOrg(e.target.value)}
                      placeholder="例如：國立臺灣大學"
                      className="w-full bg-white border border-stone-300 rounded-xl p-2 text-stone-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-600 mb-1">銀行代號 (選填)</label>
                    <input
                      type="text"
                      value={bankCode}
                      onChange={(e) => setBankCode(e.target.value)}
                      placeholder="例如：822 (中國信託)"
                      className="w-full bg-white border border-stone-300 rounded-xl p-2 text-stone-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-600 mb-1">撥款帳號 (選填)</label>
                    <input
                      type="text"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      placeholder="獲獎撥款用"
                      className="w-full bg-white border border-stone-300 rounded-xl p-2 text-stone-900 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 規章與平台註冊提醒 */}
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-stone-600 leading-relaxed">
                📌 提交提醒：同意此競賽規章即同意註冊 IdeaX 創點子平台（ideax.tw），並同意由系統自動刊登與存取競賽期間提出的痛點或提案和討論內容。
              </div>

              {/* 提交按鈕 */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmittingProposal}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-stone-950 font-black text-xs transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmittingProposal ? '提案加密提交中...' : '確認提交提案（待官方初審後公開）'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 支持投點 Modal (純白卡片，金黃邊框，無黑色) */}
      {isSupportModalOpen && selectedProposalForSupport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-amber-300 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-stone-900">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-black text-stone-900 flex items-center gap-1.5">
                <Coins className="w-5 h-5 text-amber-500" />
                <span>模擬募資支持投點</span>
              </h3>
              <button
                onClick={() => setIsSupportModalOpen(false)}
                className="text-stone-400 hover:text-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200">
                <div className="font-bold text-stone-900 line-clamp-1">
                  {selectedProposalForSupport.title}
                </div>
                <div className="text-stone-500 text-[11px] mt-0.5">
                  提案人：{selectedProposalForSupport.authorName}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-500">可用創星幣：</span>
                  <span className="font-mono font-bold text-amber-700">
                    {account?.availablePoints.toLocaleString() || 0} 創星幣
                  </span>
                </div>
                <div className="flex justify-between text-stone-500 text-[11px]">
                  <span>單案支持上限：</span>
                  <span className="text-stone-700 font-bold">一般用戶 50,000 / 專家 2,000,000 創星幣</span>
                </div>
              </div>

              <div>
                <label className="block text-stone-800 font-bold mb-1.5">支持額度 (創星幣)</label>
                <input
                  type="number"
                  min={100}
                  step={100}
                  value={supportAmount}
                  onChange={(e) => setSupportAmount(Number(e.target.value))}
                  className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 font-mono font-bold text-base focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                {[1000, 5000, 10000, 30000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setSupportAmount(amt)}
                    className="flex-1 py-1.5 rounded-lg bg-stone-100 hover:bg-amber-100 border border-stone-200 text-[11px] font-bold text-stone-700 cursor-pointer"
                  >
                    +{amt.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleConfirmSupport}
                  disabled={isSubmittingSupport}
                  className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmittingSupport ? '處理投點中...' : `確認支持 ${supportAmount.toLocaleString()} 點`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 管理員審核與頒獎 Modal (純白背景，紫色點綴) */}
      {adminReviewingProposal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-purple-300 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-stone-900">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-black text-purple-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                <span>管理員提案審核與頒獎核定</span>
              </h3>
              <button
                onClick={() => setAdminReviewingProposal(null)}
                className="text-stone-400 hover:text-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-purple-50 p-3 rounded-2xl border border-purple-200">
                <div className="font-bold text-stone-900">{adminReviewingProposal.title}</div>
                <div className="text-stone-500 text-[11px] mt-1">目前狀態：{adminReviewingProposal.status}</div>
                <div className="text-stone-500 text-[11px]">
                  支持點數：{adminReviewingProposal.supportPoints.toLocaleString()} 點
                </div>
              </div>

              <div>
                <label className="block text-stone-800 font-bold mb-1">審核備註</label>
                <textarea
                  rows={2}
                  value={adminReviewNote}
                  onChange={(e) => setAdminReviewNote(e.target.value)}
                  placeholder="審核意見或審查紀錄..."
                  className="w-full bg-white border border-stone-300 rounded-xl p-2 text-stone-900"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleAdminReview('approved')}
                  className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black cursor-pointer shadow-xs"
                >
                  審核通過 (Approved)
                </button>
                <button
                  type="button"
                  onClick={() => handleAdminReview('rejected')}
                  className="flex-1 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black cursor-pointer shadow-xs"
                >
                  駁回 (Reject)
                </button>
              </div>

              {/* 最終得獎核定 */}
              <div className="pt-3 border-t border-stone-200 space-y-2">
                <div className="font-bold text-amber-800">特聘專家評審核定得獎名次 (決選)</div>
                <div className="flex items-center gap-2">
                  <select
                    value={adminFinalRankInput}
                    onChange={(e) => setAdminFinalRankInput(Number(e.target.value))}
                    className="flex-1 bg-white border border-stone-300 rounded-xl p-2 text-stone-900 font-bold"
                  >
                    <option value={1}>冠軍 (價值 $30,000：現金 NT$20,000 + 8,000 點)</option>
                    <option value={2}>亞軍 (價值 $10,000：現金 NT$6,000 + 3,200 點)</option>
                    <option value={3}>季軍 (價值 $5,000：現金 NT$3,000 + 1,600 點)</option>
                    <option value={4}>入圍決選前 10 名 (授予創之星)</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAdminConfirmAward}
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black cursor-pointer shadow-xs"
                  >
                    確認頒獎
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 推廣大使推薦碼與名單專區 Modal */}
      {isAmbassadorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-amber-300 rounded-3xl max-w-2xl w-full p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto shadow-2xl text-stone-900">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                  <Megaphone className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">推廣大使推薦碼專區</h3>
                  <p className="text-[11px] text-stone-500">推薦夥伴參賽享 300 點（價值 $400）推廣獎勵（IdeaX平台點數，用於提問、享受付費服務）</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAmbassadorModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingAmbassador ? (
              <div className="py-12 text-center text-stone-500 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-500 mx-auto" />
                <p className="text-xs">載入推廣大使資料中...</p>
              </div>
            ) : (
              <div className="space-y-5 text-xs">
                {/* 1. 自己的推薦碼與專屬推廣分享 */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100/60 border border-amber-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>您的專屬推廣大使代碼</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                      官方認證大使
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-amber-200">
                    <div className="font-mono font-black text-2xl text-stone-900 tracking-wider">
                      {ambassadorData?.referralCode || 'AMB-' + currentUser.id.toUpperCase().slice(-6)}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const code = ambassadorData?.referralCode || 'AMB-' + currentUser.id.toUpperCase().slice(-6);
                          navigator.clipboard?.writeText(code).then(() => {
                            setCopiedAmbassadorCode(true);
                            showToast('已複製專屬推薦碼！');
                            setTimeout(() => setCopiedAmbassadorCode(false), 2000);
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        {copiedAmbassadorCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedAmbassadorCode ? '已複製' : '複製代碼'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const code = ambassadorData?.referralCode || 'AMB-' + currentUser.id.toUpperCase().slice(-6);
                          const link = `https://ideax.tw/challenge?ref=${code}`;
                          navigator.clipboard?.writeText(link).then(() => {
                            setCopiedAmbassadorLink(true);
                            showToast('已複製專屬推廣連結！');
                            setTimeout(() => setCopiedAmbassadorLink(false), 2000);
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        {copiedAmbassadorLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                        <span>{copiedAmbassadorLink ? '已複製連結' : '複製推薦連結'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 獎勵政策提示 */}
                  <div className="p-3 rounded-xl bg-white/80 border border-amber-200 text-stone-700 space-y-1">
                    <div className="font-black text-emerald-800 flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-emerald-600" />
                      <span>每推薦 1 案審核通過，即享 300 點（價值 $400）推廣獎勵（IdeaX平台點數，用於提問、享受付費服務）！</span>
                    </div>
                    <p className="text-[11px] text-stone-600 leading-relaxed">
                      邀請創客、個人或團隊於提案時填入您的推薦碼，或透過您的專屬連結投件，初審過審後獎勵自動計入結算名單。多推多得無上限！
                    </p>
                  </div>
                </div>

                {/* 2. 推廣績效儀表板 */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-center">
                    <div className="text-[10px] text-stone-500 font-bold">累計推薦提案</div>
                    <div className="font-mono font-black text-lg text-stone-900 mt-0.5">
                      {ambassadorData?.totalReferred || 0} <span className="text-xs font-normal">件</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                    <div className="text-[10px] text-emerald-700 font-bold">審核通過件數</div>
                    <div className="font-mono font-black text-lg text-emerald-900 mt-0.5">
                      {ambassadorData?.approvedCount || 0} <span className="text-xs font-normal">件</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                    <div className="text-[10px] text-amber-800 font-bold">累計推廣點數</div>
                    <div className="font-mono font-black text-lg text-amber-900 mt-0.5">
                      {((ambassadorData?.approvedCount || 0) * 300).toLocaleString()} <span className="text-xs font-normal">點</span>
                    </div>
                  </div>
                </div>

                {/* 3. 輸入推薦碼 (綁定推薦人) */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
                  <div className="font-black text-stone-900 flex items-center gap-1.5">
                    <LogIn className="w-3.5 h-3.5 text-amber-600" />
                    <span>輸入推薦碼（綁定您的推薦人）</span>
                  </div>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    若您是由特定推廣大使或夥伴推薦前來參賽，可在此輸入對方的推薦碼。提案通過初審時，對方將獲得 300 點（價值 $400）推薦獎勵（IdeaX平台點數，用於提問、享受付費服務）！
                  </p>
                  <form onSubmit={handleBindReferral} className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={inputReferralCode}
                      onChange={(e) => setInputReferralCode(e.target.value.toUpperCase())}
                      placeholder="請輸入推薦碼 (例如: AMB-USER-XXXX)"
                      className="flex-1 bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-400 font-mono uppercase"
                    />
                    <button
                      type="submit"
                      disabled={isBindingReferral || !inputReferralCode.trim()}
                      className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-stone-950 font-black text-xs transition-all cursor-pointer shadow-2xs shrink-0"
                    >
                      {isBindingReferral ? '綁定中...' : '確認綁定'}
                    </button>
                  </form>
                </div>

                {/* 4. 推薦名單 (我的推薦過審清單) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="font-black text-stone-900 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-amber-600" />
                      <span>推薦名單與審核進度</span>
                    </div>
                    <span className="text-[10px] text-stone-500">
                      共 {ambassadorData?.referrals?.length || 0} 筆推薦紀錄
                    </span>
                  </div>

                  {!ambassadorData?.referrals || ambassadorData.referrals.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-1 text-stone-400">
                      <Users className="w-8 h-8 mx-auto text-stone-300 stroke-1" />
                      <p className="text-xs">目前尚無被推薦之提案紀錄</p>
                      <p className="text-[10px] text-stone-400">
                        趕快複製上方專屬推薦碼或分享連結，邀請身邊的創業團隊與同學投件吧！
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {ambassadorData.referrals.map((ref) => (
                        <div
                          key={ref.id}
                          className="p-3 rounded-xl bg-white border border-stone-200 flex items-center justify-between gap-3 text-xs shadow-2xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-stone-900 truncate">
                              {ref.proposalTitle}
                            </div>
                            <div className="text-[10px] text-stone-500 mt-0.5 flex items-center gap-2">
                              <span>提案人：{ref.authorName}</span>
                              <span>•</span>
                              <span>{new Date(ref.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {ref.status === 'approved' ? (
                              <div className="space-y-0.5">
                                <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px]">
                                  審核通過
                                </span>
                                <div className="font-mono font-black text-emerald-700 text-xs">
                                  +300 點
                                </div>
                              </div>
                            ) : ref.status === 'rejected' ? (
                              <span className="inline-block px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200 font-bold text-[10px]">
                                未通過
                              </span>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[10px]">
                                  審核中
                                </span>
                                <div className="text-[10px] text-stone-400 font-medium">
                                  待核發
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 專屬報名中心 Modal (大專校院青年創新創業實戰模擬學習平台體驗規格：可選「參賽者」與「評審團」) */}
      {isRegistrationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-amber-300 rounded-3xl max-w-2xl w-full p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto shadow-2xl text-stone-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">創星季 報名與申請中心</h3>
                  <p className="text-[11px] text-stone-500">參賽提案與評審團資格申請</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRegistrationModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab 切換：參賽者 vs 評審團 */}
            <div className="grid grid-cols-2 gap-2 bg-stone-100 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => setRegModalTab('participant')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  regModalTab === 'participant'
                    ? 'bg-amber-400 text-stone-950 font-black shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>參賽者報名</span>
              </button>
              <button
                type="button"
                onClick={() => setRegModalTab('judge')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  regModalTab === 'judge'
                    ? 'bg-purple-600 text-white font-black shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>成為專家 (專業專家團)</span>
              </button>
            </div>

            {/* Tab 1: 參賽者報名表單 */}
            {regModalTab === 'participant' && (
              <form onSubmit={handleSubmitParticipant} className="space-y-4 text-xs">
                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-stone-700 leading-relaxed text-[11px]">
                  🌟 <b>參賽身分說明：</b>完成報名後，您的帳號將在舊站獲得「<b>創星季</b>」專屬榮譽徽章！提案將同步納入舊站「創點子/痛點」對應專區，並享有參賽專屬連結。
                </div>

                {/* 團隊與負責人基本資料 */}
                <div className="space-y-3 p-4 rounded-2xl bg-stone-50 border border-stone-200">
                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-600" />
                    <span>參賽者 / 團隊成員資料</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">團隊或個人名稱 *</label>
                      <input
                        type="text"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="例如: 智創綠能隊 (個人可填姓名或稱號)"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">主要聯絡人 / 提案人姓名 *</label>
                      <input
                        type="text"
                        value={leaderName}
                        onChange={(e) => setLeaderName(e.target.value)}
                        placeholder="請填寫聯絡人姓名"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">聯絡電話 / 手機 *</label>
                      <input
                        type="tel"
                        value={leaderPhone}
                        onChange={(e) => setLeaderPhone(e.target.value)}
                        placeholder="0912-345-678"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">聯絡電子信箱</label>
                      <input
                        type="email"
                        value={leaderEmail}
                        onChange={(e) => setLeaderEmail(e.target.value)}
                        placeholder="team@example.com"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">就讀學校 / 任職單位 (選填)</label>
                      <input
                        type="text"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        placeholder="例如: 國立臺灣科技大學、XX科技公司或自由創客"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">系所 / 職稱 (選填)</label>
                      <input
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="例如: 資訊工程系、產品經理或工程師"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">指導顧問 / 業師 (選填)</label>
                      <input
                        type="text"
                        value={advisorName}
                        onChange={(e) => setAdvisorName(e.target.value)}
                        placeholder="例如: 林顧問 / 王業師 (無則免填)"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">團隊其他核心成員 (個人參賽免填)</label>
                      <input
                        type="text"
                        value={teamMembersInput}
                        onChange={(e) => setTeamMembersInput(e.target.value)}
                        placeholder="陳小明(UI設計), 李大華(技術開發)"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>

                {/* 提案內容與對接痛點 */}
                <div className="space-y-3 p-4 rounded-2xl bg-stone-50 border border-stone-200">
                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>提案主題與創新解方構想</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">參賽專案賽道 *</label>
                      <select
                        value={participantTrack}
                        onChange={(e) => setParticipantTrack(e.target.value as StarSeasonTrack)}
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 font-bold"
                      >
                        {OFFICIAL_COMPETITION_TRACKS.map((tr) => (
                          <option key={tr.id} value={tr.id}>
                            {tr.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">提案主題名稱 *</label>
                      <input
                        type="text"
                        value={projectTitle}
                        onChange={(e) => setProjectTitle(e.target.value)}
                        placeholder="提案名稱 (例: 智農 AI 蔬果病蟲害即時預警無人機)"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 font-bold focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>
                  </div>

                  {/* 選擇採用來源痛點 */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      採用的來源痛點（解方發想基準，若無可自訂）
                    </label>
                    <select
                      value={participantSourcePainPointId}
                      onChange={(e) => setParticipantSourcePainPointId(e.target.value)}
                      className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900"
                    >
                      <option value="">-- 發想全新解方或自定痛點 --</option>
                      {painPointProposals.map((pp) => (
                        <option key={pp.id} value={pp.id}>
                          【{STAR_SEASON_TRACKS[pp.track]?.tag}】{pp.title} ({pp.authorName})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-emerald-700 mt-1">
                      💡 採用平台痛點並獲評審前十名者，該痛點提出者將共享等值好禮獎勵（最高 $1,000）！
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">構想摘要 * (300字以內)</label>
                    <textarea
                      rows={2}
                      value={participantSummary}
                      onChange={(e) => setParticipantSummary(e.target.value)}
                      placeholder="簡述本提案欲解決之核心問題、目標客群與創新切入點..."
                      className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">詳細執行方案與創新價值</label>
                    <textarea
                      rows={3}
                      value={participantDescription}
                      onChange={(e) => setParticipantDescription(e.target.value)}
                      placeholder="詳細說明產品功能、技術架構、市場競爭優勢與商業化落地計畫..."
                      className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* 實戰模擬檔案與募資目標 */}
                <div className="space-y-3 p-4 rounded-2xl bg-stone-50 border border-stone-200">
                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    <span>實戰募資模擬與佐證檔案</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">模擬目標募資額度 (創星幣)</label>
                      <input
                        type="number"
                        step={10000}
                        value={targetFundingAmount}
                        onChange={(e) => setTargetFundingAmount(Number(e.target.value))}
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Demo展示影片連結 (YouTube / Drive)</label>
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="https://youtu.be/..."
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">贊助者回饋方案規劃</label>
                    <input
                      type="text"
                      value={rewardPlanDescription}
                      onChange={(e) => setRewardPlanDescription(e.target.value)}
                      placeholder="搶先體驗名額、限量紀念品、感謝白皮書"
                      className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900"
                    />
                  </div>

                  {/* 模擬檔案上傳 (BP 與 原型) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-white rounded-xl border border-stone-300 space-y-2">
                      <div className="font-bold text-stone-800 text-[11px] flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-amber-600" />
                        <span>營運計畫簡報 (BP/Pitch Deck)</span>
                      </div>
                      {bpFile ? (
                        <div className="flex items-center justify-between bg-amber-50 p-2 rounded-lg text-[10px] text-amber-900">
                          <span className="truncate">{bpFile.name}</span>
                          <button
                            type="button"
                            onClick={() => setBpFile(null)}
                            className="text-stone-400 hover:text-stone-700 ml-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setBpFile({ url: 'https://example.com/bp.pdf', name: '創新提案計畫書.pdf', size: 2450000 })}
                          className="w-full py-2 border border-dashed border-stone-300 rounded-lg text-stone-500 hover:text-amber-700 hover:border-amber-400 text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Upload className="w-3 h-3" />
                          <span>上傳簡報 PDF/PPT</span>
                        </button>
                      )}
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-stone-300 space-y-2">
                      <div className="font-bold text-stone-800 text-[11px] flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>產品原型 / 成果圖片</span>
                      </div>
                      {prototypeImgFile ? (
                        <div className="flex items-center justify-between bg-emerald-50 p-2 rounded-lg text-[10px] text-emerald-900">
                          <span className="truncate">{prototypeImgFile.name}</span>
                          <button
                            type="button"
                            onClick={() => setPrototypeImgFile(null)}
                            className="text-stone-400 hover:text-stone-700 ml-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPrototypeImgFile({ url: 'https://example.com/prototype.jpg', name: '系統原型展示圖.png' })}
                          className="w-full py-2 border border-dashed border-stone-300 rounded-lg text-stone-500 hover:text-emerald-700 hover:border-emerald-400 text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Upload className="w-3 h-3" />
                          <span>上傳成果展示圖</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 原創性承諾 */}
                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="participantPledge"
                    checked={participantPledgeAgreed}
                    onChange={(e) => setParticipantPledgeAgreed(e.target.checked)}
                    className="mt-0.5 rounded text-amber-500 focus:ring-amber-400"
                    required
                  />
                  <label htmlFor="participantPledge" className="text-[11px] text-stone-600 cursor-pointer leading-relaxed">
                    我已閱讀並同意{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openAboutModal('general_terms');
                      }}
                      className="text-amber-800 font-bold underline hover:text-amber-950 cursor-pointer"
                    >
                      &lt;&lt;IdeaX一般條款&gt;&gt;
                    </button>
                    {' '}與{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCompetitionTermsDoc('C');
                      }}
                      className="text-amber-800 font-bold underline hover:text-amber-950 cursor-pointer"
                    >
                      &lt;&lt;創星季參賽者條款&gt;&gt;
                    </button>
                    。
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingParticipant}
                    className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-sm transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSubmittingParticipant ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>提交參賽資料中...</span>
                      </>
                    ) : (
                      <>
                        <GraduationCap className="w-4 h-4" />
                        <span>確認送出報名提案（獲得創星季徽章）</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: 評審團申請表單 (提供單位、相關證明或專業證件，同步錄入舊站認證專家身分與名單) */}
            {regModalTab === 'judge' && (
              <form onSubmit={handleSubmitJudge} className="space-y-4 text-xs">
                <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 leading-relaxed text-[11px]">
                  👑 <b>評審資格權益：</b>審核通過轉為專家帳號，享有 <b>3,000,000 點</b>投資額度（單案上限 2,000,000），並同步錄入舊站認證專家名單！
                </div>

                {/* 評審基本資料 */}
                <div className="space-y-3 p-4 rounded-2xl bg-stone-50 border border-stone-200">
                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                    <UserIcon className="w-4 h-4 text-purple-600" />
                    <span>評審基本資訊</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">評審姓名 *</label>
                      <input
                        type="text"
                        value={judgeName}
                        onChange={(e) => setJudgeName(e.target.value)}
                        placeholder="請填寫真實中文姓名"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-purple-400 font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">聯絡電話 / 手機</label>
                      <input
                        type="tel"
                        value={judgePhone}
                        onChange={(e) => setJudgePhone(e.target.value)}
                        placeholder="0912-345-678"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-purple-400"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">公務 / 聯絡信箱</label>
                      <input
                        type="email"
                        value={judgeEmail}
                        onChange={(e) => setJudgeEmail(e.target.value)}
                        placeholder="judge@institution.org.tw"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-purple-400"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">專業審查領域</label>
                      <select
                        value={judgeDomain}
                        onChange={(e) => setJudgeDomain(e.target.value)}
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 font-bold"
                      >
                        <option value="AI 智慧與科技創新">AI 智慧與科技創新</option>
                        <option value="智慧物聯與硬體整合">智慧物聯與硬體整合</option>
                        <option value="永續綠能與循環經濟">永續綠能與循環經濟</option>
                        <option value="生活創新與商業模式">生活創新與商業模式</option>
                        <option value="新創早期投資與募資">新創早期投資與募資</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 服務單位、專業職稱與資格證明 (必要規範) */}
                <div className="space-y-3 p-4 rounded-2xl bg-purple-50/50 border border-purple-200">
                  <div className="font-bold text-purple-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>任職單位與專業證件證明 *</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">任職機構 / 服務單位 *</label>
                      <input
                        type="text"
                        value={judgeOrg}
                        onChange={(e) => setJudgeOrg(e.target.value)}
                        placeholder="例如: 國立臺灣大學 / 工研院 / 創投基金"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-purple-400 font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">現任職稱 *</label>
                      <input
                        type="text"
                        value={judgeJobTitle}
                        onChange={(e) => setJudgeJobTitle(e.target.value)}
                        placeholder="例如: 教授 / 研發總監 / 投資合夥人"
                        className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-purple-400 font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">專業年資</label>
                    <input
                      type="number"
                      min={1}
                      max={40}
                      value={judgeExperienceYears}
                      onChange={(e) => setJudgeExperienceYears(Number(e.target.value))}
                      className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      專業證件、證照或相關專業證明說明 *
                    </label>
                    <textarea
                      rows={2}
                      value={judgeCredentialsNote}
                      onChange={(e) => setJudgeCredentialsNote(e.target.value)}
                      placeholder="請說明您的專業證書、部定教師證照、專利師/律師證照、創業輔導獲獎紀錄或相關機構聘任證明..."
                      className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-purple-400"
                      required
                    />
                  </div>

                  {/* 證件檔案模擬上傳 */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">上傳專業證件 / 單位在職證明圖檔</label>
                    {judgeProofFile ? (
                      <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-purple-300 text-purple-900">
                        <span className="font-bold">{judgeProofFile.name}</span>
                        <button
                          type="button"
                          onClick={() => setJudgeProofFile(null)}
                          className="text-stone-400 hover:text-stone-700 ml-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setJudgeProofFile({ url: 'https://example.com/proof.pdf', name: '專業證件與在職證明文件.pdf' })}
                        className="w-full py-2.5 border border-dashed border-purple-300 bg-white rounded-xl text-purple-700 hover:bg-purple-50 text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>上傳證件 / 證明文件 (PDF/JPG)</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">評審自介與審查輔導經歷</label>
                    <textarea
                      rows={2}
                      value={judgeBio}
                      onChange={(e) => setJudgeBio(e.target.value)}
                      placeholder="簡要自介，將顯示於舊站專家名單與創星季決選評審介紹..."
                      className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-stone-900 focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                {/* 公正保密承諾 */}
                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="judgePledge"
                    checked={judgePledgeAgreed}
                    onChange={(e) => setJudgePledgeAgreed(e.target.checked)}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-400"
                    required
                  />
                  <label htmlFor="judgePledge" className="text-[11px] text-stone-600 cursor-pointer leading-relaxed">
                    我已閱讀並同意{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openAboutModal('general_terms');
                      }}
                      className="text-purple-800 font-bold underline hover:text-purple-950 cursor-pointer"
                    >
                      &lt;&lt;IdeaX一般條款&gt;&gt;
                    </button>
                    {' '}與{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCompetitionTermsDoc('D');
                      }}
                      className="text-purple-800 font-bold underline hover:text-purple-950 cursor-pointer"
                    >
                      &lt;&lt;創星季專家評審條款&gt;&gt;
                    </button>
                    。
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingJudge}
                    className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSubmittingJudge ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>審核申請資料中...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>提交評審申請（同步錄入舊站認證專家身分）</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 個人按讚收藏名單 Modal */}
      {isFavoritesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-amber-300 rounded-3xl max-w-xl w-full p-6 space-y-4 my-8 max-h-[85vh] overflow-y-auto shadow-2xl text-stone-900">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">我的個人收藏提案清單</h3>
                  <p className="text-[11px] text-stone-500">按過愛心的參賽作品，隨時掌握募資進度</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFavoritesModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {proposals.filter((p) => likedProposalIds.includes(p.id)).length === 0 ? (
                <div className="py-12 text-center text-stone-400 space-y-2">
                  <Heart className="w-10 h-10 mx-auto text-stone-300 stroke-1" />
                  <p className="text-sm font-bold text-stone-600">目前尚無收藏的提案</p>
                  <p className="text-[11px] text-stone-400 max-w-xs mx-auto">
                    在競賽提案列表點擊愛心圖示，即可將優秀的創意作品收錄至此，方便隨時追蹤與投點！
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                  {proposals
                    .filter((p) => likedProposalIds.includes(p.id))
                    .map((prop) => (
                      <div
                        key={prop.id}
                        className="p-3.5 rounded-2xl bg-stone-50 hover:bg-amber-50/40 border border-stone-200 hover:border-amber-300 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                              {STAR_SEASON_TRACKS[prop.track]?.tag}
                            </span>
                            <span className="text-[10px] font-bold text-stone-500">
                              {prop.authorName}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleLike(prop.id)}
                            className="text-rose-500 hover:text-stone-400 p-1 cursor-pointer"
                            title="取消收藏"
                          >
                            <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                          </button>
                        </div>

                        <h4 className="font-bold text-stone-900 text-xs line-clamp-1">
                          {prop.title}
                        </h4>

                        <div className="flex items-center justify-between pt-1 border-t border-stone-200/60 text-[11px]">
                          <span className="font-mono font-bold text-amber-700">
                            {prop.supportPoints?.toLocaleString() || 0} 點支持
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsFavoritesModalOpen(false);
                                handleOpenProposalDetail(prop);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 font-bold hover:bg-stone-100 cursor-pointer"
                            >
                              詳情
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsFavoritesModalOpen(false);
                                setSelectedProposalForSupport(prop);
                                setIsSupportModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-400 text-stone-950 font-black hover:bg-amber-300 cursor-pointer"
                            >
                              支持投點
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* 投稿創新idea 教學視窗 Modal */}
      {isProposalTutorialModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-amber-300 rounded-3xl max-w-xl w-full p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto shadow-2xl text-stone-900">
            {/* 標題列 */}
            <div className="flex items-center justify-between border-b border-amber-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-black shadow-2xs shrink-0">
                  <Send className="w-5 h-5 text-stone-950" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-stone-950">
                    「我想提案!」參賽教學指南
                  </h3>
                  <p className="text-[11px] text-amber-800 font-bold">
                    快速完成提案，讓你的創新點子被市場看見
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProposalTutorialModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 獨立網址公告提示 */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-300 flex items-center gap-2.5 text-xs text-amber-950">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="font-bold">
                提案是在獨立網址專屬頁面進行：
                <span className="font-mono font-black text-amber-800 ml-1">ideax.tw/challenge/submit</span>
              </div>
            </div>

            {/* 教學流程卡片 */}
            <div className="space-y-4 text-xs">
              {/* 步驟 1 */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-amber-400 text-stone-950 font-black text-xs flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    1
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-stone-950 text-sm">
                      進入痛點區查看痛點，或是直接輸入「問題序號」開始提案
                    </h4>
                    <p className="text-stone-600 text-[11px] mt-1 leading-relaxed">
                      你可以前往「創點子/痛點專區」探索大眾生活與產業目前尚未解決之真實問題；若已知題目序號，可直接在下方輸入快速啟動提案。
                    </p>
                  </div>
                </div>

                {/* 步驟 1 操作快捷按鍵 */}
                <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProposalTutorialModalOpen(false);
                      onBackToOldSite();
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  >
                    <Flame className="w-3.5 h-3.5 text-white" />
                    <span>進入痛點區查看痛點清單</span>
                  </button>

                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      type="text"
                      value={quickPainPointSerial}
                      onChange={(e) => setQuickPainPointSerial(e.target.value)}
                      placeholder="輸入序號或痛點 (例: #01, q-1)"
                      className="flex-1 bg-white border border-stone-300 rounded-xl px-2.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsProposalTutorialModalOpen(false);
                        if (quickPainPointSerial.trim()) {
                          try {
                            sessionStorage.setItem('ideax_challenge_prefill_topic', JSON.stringify({
                              id: quickPainPointSerial.trim(),
                              title: `針對問題 ${quickPainPointSerial.trim()} 之解方`,
                              serial: quickPainPointSerial.trim(),
                            }));
                          } catch {}
                        }
                        if (!isLoggedIn) {
                          onOpenAuth();
                          return;
                        }
                        navigateToSubView('submit');
                      }}
                      className="py-2 px-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs cursor-pointer shadow-2xs shrink-0 transition-colors"
                    >
                      前往提案
                    </button>
                  </div>
                </div>

                {/* 前往提案主按鈕 */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProposalTutorialModalOpen(false);
                      if (quickPainPointSerial.trim()) {
                        try {
                          sessionStorage.setItem('ideax_challenge_prefill_topic', JSON.stringify({
                            id: quickPainPointSerial.trim(),
                            title: `針對問題 ${quickPainPointSerial.trim()} 之解方`,
                            serial: quickPainPointSerial.trim(),
                          }));
                        } catch {}
                      }
                      if (!isLoggedIn) {
                        onOpenAuth();
                        return;
                      }
                      navigateToSubView('submit');
                    }}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-stone-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-98"
                  >
                    <span>前往提案</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              </div>
            </div>

            {/* 底部按鈕 */}
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-stone-500">
                提示：每案通過審核享 100,000 創星幣模擬募資起始金
              </span>
              <button
                type="button"
                onClick={() => setIsProposalTutorialModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold cursor-pointer transition-colors"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 管理員專用：規章條款封存資料夾 Modal (僅管理員可見) */}
      {isAdminRulesFolderOpen && (currentUser?.role === 'admin' || currentUser?.accountType === 'admin') && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
          <div className="max-w-5xl w-full max-h-[92vh] overflow-y-auto my-6 rounded-3xl shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsAdminRulesFolderOpen(false)}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-stone-950/80 hover:bg-stone-950 text-white flex items-center justify-center cursor-pointer shadow-md transition-all"
              title="關閉資料夾"
            >
              <X className="w-4 h-4" />
            </button>
            <AdminCompetitionRulesArchiveFolder />
          </div>
        </div>
      )}

      {/* 決選評審專家工作台 Modal (邊看提案企劃詳情邊評分，暫存或統一送出) */}
      {isJudgeEvaluationModalOpen && evaluatingJudgeUser && (
        <JudgeEvaluationModal
          isOpen={isJudgeEvaluationModalOpen}
          onClose={() => setIsJudgeEvaluationModalOpen(false)}
          judgeUser={evaluatingJudgeUser}
          nominatedProposals={nominatedProposals}
          onScoresUpdated={() => {
            setIsFinalResultsPublishedState(getIsFinalResultsPublished());
          }}
        />
      )}

      {/* 管理員專用：決選評分與全體獎勵統計總控制台 Modal */}
      {isAdminFinalEvaluationHubOpen && (currentUser?.role === 'admin' || currentUser?.accountType === 'admin') && (
        <AdminFinalEvaluationManagementModal
          isOpen={isAdminFinalEvaluationHubOpen}
          onClose={() => {
            setIsAdminFinalEvaluationHubOpen(false);
            setIsFinalResultsPublishedState(getIsFinalResultsPublished());
          }}
          proposals={proposals}
          onProposalsUpdated={() => {
            setIsFinalResultsPublishedState(getIsFinalResultsPublished());
          }}
          onOpenJudgeEvaluationAsUser={(judge) => {
            setEvaluatingJudgeUser(judge);
            setIsJudgeEvaluationModalOpen(true);
          }}
        />
      )}
      {/* 創星季競賽規章與條款說明彈窗 */}
      {competitionTermsDoc && (
        <CompetitionTermsModal
          isOpen={Boolean(competitionTermsDoc)}
          onClose={() => setCompetitionTermsDoc(null)}
          initialDoc={competitionTermsDoc}
        />
      )}
    </div>
  );
};
