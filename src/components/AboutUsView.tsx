import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  ShieldCheck,
  Scale,
  Award,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  CreditCard,
  Layers,
  AlertTriangle,
  Info,
  BookOpen,
  Headphones,
  ShieldAlert,
  RotateCcw,
  MessageSquare,
  Building2,
  Mail,
  Clock,
  MapPin,
  Copy,
  Check,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Shield,
  Send,
  Compass,
  Download,
  Smartphone,
  Laptop,
  Zap,
} from 'lucide-react';
import { TERMS_DATA, TermItem } from '../data/termsData';
import { AboutSection, ProblemLevel } from '../types';
import { LEVEL_CONFIGS } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { IdeaXLogo } from './IdeaXLogo';
import { PlatformRolesSpectrumView } from './PlatformRolesSpectrumView';
import { APP_VERSION } from '../data/versionData';
import { triggerDirectAppDownloadOrInstall, downloadAppLauncherFile } from '../services/pwaInstaller';

interface AboutUsViewProps {
  initialSection?: AboutSection | string;
  onBack?: () => void;
  isModal?: boolean;
  onStartOnboarding?: () => void;
}

type MainTab = 'story' | 'download_app' | 'contact' | 'terms' | 'finance' | 'others';

export const AboutUsView: React.FC<AboutUsViewProps> = ({
  initialSection = 'list',
  onBack,
  isModal = false,
  onStartOnboarding,
}) => {
  const { currentUser, openCustomerService, addNotification, openPwaInstallModal } = useApp();
  const [copiedAppUrl, setCopiedAppUrl] = useState(false);
  const [selectedAppGuide, setSelectedAppGuide] = useState<'all' | 'android' | 'ios' | 'desktop'>('all');

  // Determine initial state based on initialSection prop
  const [activeTab, setActiveTab] = useState<MainTab>(() => {
    if (initialSection === 'download_app' || initialSection === 'app' || initialSection === 'pwa') return 'download_app';
    if (initialSection === 'contact') return 'contact';
    if (initialSection === 'finance' || initialSection === 'architecture') return 'finance';
    if (
      initialSection === 'others' ||
      initialSection === 'tiers' ||
      initialSection === 'other_1' ||
      initialSection === 'other_2' ||
      initialSection === 'other_3' ||
      initialSection === 'other_4' ||
      initialSection === 'other_5'
    ) return 'others';
    if (
      initialSection === 'terms' ||
      initialSection === 'general_terms' ||
      initialSection === 'privacy_policy' ||
      initialSection === 'disclaimer' ||
      initialSection === 'questioner_terms' ||
      initialSection === 'solver_terms'
    ) return 'terms';
    if (initialSection === 'about_ideax' || initialSection === 'story' || initialSection === 'about') return 'story';
    return 'story';
  });

  const [selectedTermKey, setSelectedTermKey] = useState<string | null>(() => {
    if (
      initialSection &&
      initialSection !== 'list' &&
      initialSection !== 'contact' &&
      initialSection !== 'finance' &&
      initialSection !== 'others' &&
      initialSection !== 'story' &&
      !initialSection.startsWith('other_') &&
      TERMS_DATA[initialSection]
    ) {
      return initialSection;
    }
    return null;
  });

  const [selectedFinanceChapterId, setSelectedFinanceChapterId] = useState<string | null>(null);
  const [selectedOtherChapterId, setSelectedOtherChapterId] = useState<string | null>(() => {
    if (
      initialSection === 'other_1' ||
      initialSection === 'other_2' ||
      initialSection === 'other_3' ||
      initialSection === 'other_4' ||
      initialSection === 'other_5'
    ) {
      return initialSection;
    }
    return null;
  });
  const [activeTimelineStep, setActiveTimelineStep] = useState<number>(3);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Sync if initialSection changes externally
  useEffect(() => {
    if (initialSection === 'contact') {
      setActiveTab('contact');
      setSelectedTermKey(null);
      setSelectedFinanceChapterId(null);
      setSelectedOtherChapterId(null);
    } else if (initialSection === 'finance' || initialSection === 'architecture') {
      setActiveTab('finance');
      setSelectedTermKey(null);
      setSelectedFinanceChapterId(null);
      setSelectedOtherChapterId(null);
    } else if (
      initialSection === 'other_1' ||
      initialSection === 'other_2' ||
      initialSection === 'other_3' ||
      initialSection === 'other_4' ||
      initialSection === 'other_5'
    ) {
      setActiveTab('others');
      setSelectedOtherChapterId(initialSection);
      setSelectedTermKey(null);
      setSelectedFinanceChapterId(null);
    } else if (initialSection === 'others' || initialSection === 'tiers') {
      setActiveTab('others');
      setSelectedOtherChapterId(null);
      setSelectedTermKey(null);
    } else if (initialSection === 'about_ideax' || initialSection === 'story') {
      setActiveTab('story');
      setSelectedTermKey(null);
      setSelectedOtherChapterId(null);
    } else if (initialSection && initialSection !== 'list' && TERMS_DATA[initialSection]) {
      setActiveTab('terms');
      setSelectedTermKey(initialSection);
      setSelectedOtherChapterId(null);
    }
  }, [initialSection]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(label);
    if (addNotification) {
      addNotification(`已複製 ${label} (${text}) 至剪貼簿`, 'success');
    }
    setTimeout(() => setCopiedEmail(null), 2500);
  };

  // 條款與聲明清單
  const TERMS_LIST = [
    {
      key: 'general_terms',
      title: '一般條款',
      subtitle: '通用基本協議、帳號規範、閉路點數與平台服務原則',
      badge: '全站通用',
      icon: FileText,
      tagColor: 'bg-stone-100 text-stone-700',
    },
    {
      key: 'questioner_terms',
      title: '提問者條款',
      subtitle: '懸賞發布、痛點提出、款項託管、採納驗收與商用授權',
      badge: '提問規範',
      icon: Scale,
      tagColor: 'bg-indigo-50 text-indigo-700',
    },
    {
      key: 'solver_terms',
      title: '解答者條款',
      subtitle: '方案交付、實名認證、銀行自動撥付與原創擔保',
      badge: '接案規範',
      icon: Award,
      tagColor: 'bg-emerald-50 text-emerald-700',
    },
    {
      key: 'recharge_subscription_terms',
      title: '儲值與訂閱條款',
      subtitle: '點數購買折抵、會員方案週期訂閱、自動續約管理與款項原則',
      badge: '儲值與訂閱',
      icon: CreditCard,
      tagColor: 'bg-amber-50 text-amber-700',
    },
    {
      key: 'community_guidelines',
      title: '社群守則與內容管理規範',
      subtitle: '文明問答交流、各角色專屬守則、專家執業倫理與檢舉機制',
      badge: '社群守則',
      icon: MessageSquare,
      tagColor: 'bg-purple-50 text-purple-700',
    },
    {
      key: 'copyright_policy',
      title: '著作權保護政策',
      subtitle: '智慧財產權歸屬、採納商用實施授權與檢舉下架程序',
      badge: '智財政策',
      icon: ShieldCheck,
      tagColor: 'bg-blue-50 text-blue-700',
    },
    {
      key: 'refund_dispute_policy',
      title: '退款政策與爭議調解辦法',
      subtitle: '懸賞未採納退還規則、方案解鎖爭議審議與原路退款路徑',
      badge: '交易保障',
      icon: RotateCcw,
      tagColor: 'bg-rose-50 text-rose-700',
    },
    {
      key: 'anti_fraud_aml_policy',
      title: '反詐騙與洗錢防制政策',
      subtitle: '洗錢防制合規、異常交易即時風控與可疑帳號通報機制',
      badge: '法規與資安',
      icon: ShieldAlert,
      tagColor: 'bg-red-50 text-red-700',
    },
    {
      key: 'privacy_policy',
      title: '隱私權聲明',
      subtitle: '個人資料保護法合規、會員隱私專屬顯示與資料加密防護',
      badge: '隱私保護',
      icon: ShieldCheck,
      tagColor: 'bg-cyan-50 text-cyan-700',
    },
    {
      key: 'disclaimer',
      title: '免責聲明',
      subtitle: '資料檔案免保管聲明、商業決策風險告知、非特許顧問聲明與系統不可抗力',
      badge: '法律免責',
      icon: AlertCircle,
      tagColor: 'bg-stone-100 text-stone-600',
    },
  ];

  // 平台金流運作章節
  const FINANCE_CHAPTERS = [
    {
      id: 'fin_1',
      num: '01',
      title: '設計目標與非電支執照合規策略',
      summary: '切斷使用者間直接資金移轉，以「兩段式獨立交易」架構符合法規要求並保留即時託管體驗。',
      badge: '合規策略',
    },
    {
      id: 'fin_2',
      num: '02',
      title: '點數與收益架構',
      summary: '提問者付現取得閉路點數、採納時點數核銷轉化為應付報酬，平台自有資金直接撥付解答者。',
      badge: '資金流向',
    },
    {
      id: 'fin_3',
      num: '03',
      title: '懸賞生命週期與每月撥款時間軸',
      summary: '從 T+0 託管預扣、D0 採納核銷、7 日猶豫期到每月 5 號合併定期撥款。',
      badge: '時間軸',
    },
    {
      id: 'fin_4',
      num: '04',
      title: '解答者應收帳款介面規範與異議分流',
      summary: '獲得懸賞點數、平台應撥款與累計撥款三欄位設計，並以 7 日猶豫期為分水嶺之異議處理。',
      badge: '帳款與異議',
    },
    {
      id: 'fin_5',
      num: '05',
      title: '事後查核與追回機制',
      summary: '暫停申覆、批次扣抵、無足額催告與 30 日追回除斥期間之風控規範。',
      badge: '風控查核',
    },
  ];

  // 其他說明章節
  const OTHER_CHAPTERS = [
    {
      id: 'other_4',
      num: '01',
      title: '平台用戶與社群規範',
      summary: '企業機構、提問者、平台管理、解答者、認證專家與一般討論之身分定位、權能規範與各角色專屬守則。',
      badge: '用戶角色與社群',
    },
    {
      id: 'other_2',
      num: '02',
      title: '痛點免費提出與專家解鎖機制',
      summary: '提問者 NT$ 0 元免費上架痛點，專家自訂解鎖定價交付落地解法，兼顧無門檻與合理收益。',
      badge: '痛點機制',
    },
    {
      id: 'other_1',
      num: '03',
      title: '五級問題分級體系（L0 ~ L4）',
      summary: '由 L0 免費閒聊激盪到 L4 深度商業顧問方案之各級定位與懸賞建議範圍。',
      badge: '問題分級',
    },
    {
      id: 'other_3',
      num: '04',
      title: '會員訂閱方案與費率減免',
      summary: '達人方案（8% 費率）、權威方案（5% 費率＋高賞提案優先推薦）與大師方案（0% 免服務費）。',
      badge: '會員權益',
    },
    {
      id: 'other_5',
      num: '05',
      title: 'AI 功能介紹與智慧賦能',
      summary: 'AI 題目自動標籤與建議、AI 專家智慧媒合推播、AI-CRM 客戶作戰藍圖、AI 爭議調解報告與商業企劃書生成。',
      badge: 'AI 智慧功能',
    },
  ];

  const FAQ_LIST = [
    {
      q: '註冊後會被自動扣款或訂閱嗎？',
      a: '完全不會。註冊完成即為一般「用戶」，全站瀏覽、免費提出痛點、發布懸賞均無任何強制月費或綁約。只有當您主動選購「會員方案」時才會開通訂閱特權。',
    },
    {
      q: '懸賞金如何託管？方案未獲採納會退費嗎？',
      a: '提問發布時款項由第三方金流安全託管，提問者驗收滿意採納後始直撥專家帳戶。若招募期滿未收到合適方案，可依退款規範全額返還點數至帳戶，可用於下次發問或申請退款。',
    },
    {
      q: '「痛點 0 元提出」與「懸賞問題」有什麼不同？',
      a: '「痛點提出」完全免費（NT$ 0 元），提問者無須預付資金即可上架真實痛點，吸引專家自訂定價交付解法；「懸賞問題」則由提問者自訂明確懸賞金（L1~L4），在招募期限內徵集各方解法並採納最佳方案。',
    },
    {
      q: '解答者如何收到款項？每個月何時撥款？',
      a: '當提問者採納您的方案並經過 7 日猶豫期確認後，平台會在每月 5 號將累積的應撥款項，透過銀行電匯轉帳直接匯入您於實名認證中綁定的金融機構帳戶。',
    },
    {
      q: '平台服務費抽成是多少？如何享有服務費減免？',
      a: '一般用戶解答收益扣除標準平台服務費（10%）；若您訂閱「達人方案」享有費率 8%（實收 92%）、「權威方案」享有費率 5%（實收 95% ＋ 高賞提案優先推薦）、「大師方案」更可獲得 0% 免服務費（100% 全額入帳 ＋ 24hr AI客服特助與 AI-CRM）。',
    },
    {
      q: '方案採納後的著作權與商業使用授權如何歸屬？',
      a: '提問者於點選「採納並撥付」後，即取得該獲採納方案之完整商業實施授權與使用權限；未獲採納之其他方案，其智慧財產權與專屬著作權仍完整歸屬於原解答專家所有，嚴禁未經授權任意抄襲或使用。',
    },
    {
      q: '實名認證與專家大師認證需要多久審核？',
      a: '實名認證通常於 1~2 個工作天內由系統與專員覆核完成；專家認證身分（官方專業徽章）於 2~3 個工作天內完成實質專業背景、學經歷查驗與資格審核。',
    },
    {
      q: '企業機構可以開立統一編號發票報帳或簽訂保密合約（NDA）嗎？',
      a: '可以。企業機構用戶在發布 L3/L4 專案或購買儲值方案時，系統均支援填寫統一編號並開立合規電子發票；針對高度機密之研發與商業專案，亦可透過「企業專區」簽署具法律效力之雙向保密協議（NDA）。',
    },
    {
      q: '若遇到交付內容不符、惡意抄襲或爭議時該如何申訴？',
      a: '您可以點擊本頁上方的「客服與回報」按鈕，平台客服與法務審查專員將儘速啟動爭議調解程序，調閱雙方交付紀錄、啟動 AI 爭議報告分析，並在調查期間立即凍結爭議款項，確保雙方權益不受侵害。',
    },
    {
      q: '如何修改個人資料、綁定銀行帳戶或更換收款資訊？',
      a: '登入後進入「個人中心」點選「帳號與基本資料」或「實名認證」，即可隨時更新個人簡介、技能標籤、聯絡方式與金融機構收款帳號。更新銀行帳號後將於次期撥款時生效。',
    },
  ];

  const activeTerm: TermItem | undefined = selectedTermKey
    ? TERMS_DATA[selectedTermKey]
    : undefined;

  const isSubPage = Boolean(selectedTermKey || selectedFinanceChapterId || selectedOtherChapterId);

  const getSubPageTitle = () => {
    if (selectedTermKey) return activeTerm?.title || '條款詳查';
    if (selectedFinanceChapterId) {
      const ch = FINANCE_CHAPTERS.find((c) => c.id === selectedFinanceChapterId);
      return ch ? `${ch.num}. ${ch.title}` : '金流運作詳查';
    }
    if (selectedOtherChapterId) {
      const ch = OTHER_CHAPTERS.find((c) => c.id === selectedOtherChapterId);
      return ch ? `${ch.num}. ${ch.title}` : '說明詳查';
    }
    return currentUser?.role === 'admin' ? '關於 IdeaX' : '平台資訊';
  };

  const handleBackToRoot = () => {
    if (selectedTermKey) setSelectedTermKey(null);
    else if (selectedFinanceChapterId) setSelectedFinanceChapterId(null);
    else if (selectedOtherChapterId) setSelectedOtherChapterId(null);
    else if (onBack) onBack();
  };

  return (
    <div
      className={`w-full max-w-4xl mx-auto font-sans ${
        isModal ? 'p-1 sm:p-3' : 'py-4 px-3 sm:px-6'
      }`}
    >
      {/* 📱 頂部 Sticky Mobile App Bar (輕量磨砂玻璃、清爽圓角) */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200/80 shadow-2xs mb-4 sticky top-1 z-30 overflow-hidden">
        <div className="px-3.5 py-2.5 sm:py-3 flex items-center justify-between">
          <button
            onClick={handleBackToRoot}
            className="min-h-[40px] px-2 rounded-xl text-stone-600 hover:text-stone-950 hover:bg-stone-100 flex items-center gap-1 font-bold text-xs sm:text-sm cursor-pointer transition-colors active:scale-95"
            aria-label="返回"
          >
            <ChevronLeft className="w-5 h-5 text-stone-500" />
            <span>{isSubPage ? '返回目錄' : '返回'}</span>
          </button>

          <h1 className="text-sm sm:text-base font-bold text-stone-900 tracking-tight text-center truncate max-w-[200px] sm:max-w-md px-2">
            {getSubPageTitle()}
          </h1>

          <div className="w-16 flex justify-end">
            <span className="text-[10px] font-mono font-medium text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200/60">
              v{APP_VERSION}
            </span>
          </div>
        </div>
      </div>

      {/* 📱 輕量 Segmented Control 分頁導覽列（滑動橫列、極簡優雅、點擊無負擔） */}
      {!isSubPage && (
        <div className="mb-4">
          <div className="flex items-center justify-start sm:justify-center overflow-x-auto scrollbar-none pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
            <div className="inline-flex p-1 rounded-2xl bg-stone-100/90 border border-stone-200/70 min-w-max gap-1 shadow-2xs">
              {/* 1. 平台介紹 */}
              <button
                onClick={() => setActiveTab('story')}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  activeTab === 'story'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/50'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Info className="w-4 h-4 text-stone-700" />
                <span>平台介紹</span>
              </button>

              {/* 2. 下載 APP (位於平台介紹與聯絡我們之間) */}
              <button
                onClick={() => setActiveTab('download_app')}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  activeTab === 'download_app'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/50'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Download className="w-4 h-4 text-amber-600" />
                <span>下載 APP</span>
              </button>

              {/* 3. 聯絡我們 & 常見問題 */}
              <button
                onClick={() => setActiveTab('contact')}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  activeTab === 'contact'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/50'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Headphones className="w-4 h-4 text-emerald-600" />
                <span>聯絡我們 & 常見問題</span>
              </button>

              {/* 3. 條款與聲明 */}
              <button
                onClick={() => setActiveTab('terms')}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  activeTab === 'terms'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/50'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>條款與聲明</span>
              </button>

              {/* 4. 平台金流運作 */}
              <button
                onClick={() => setActiveTab('finance')}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  activeTab === 'finance'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/50'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <CreditCard className="w-4 h-4 text-amber-600" />
                <span>平台金流運作</span>
              </button>

              {/* 5. 其他說明 */}
              <button
                onClick={() => setActiveTab('others')}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  activeTab === 'others'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/50'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Layers className="w-4 h-4 text-purple-600" />
                <span>其他說明</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. 平台介紹 (Clean Modern Card & Hero) */}
      {/* ========================================================================= */}
      {activeTab === 'story' && !isSubPage && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* 品牌視覺頂部卡片 (改為純白極簡現代卡片) */}
          <div className="bg-white text-stone-900 rounded-3xl p-5 sm:p-7 shadow-xs border border-stone-200/80 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>IdeaX 平台介紹與願景</span>
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-stone-900">
                  關於創點子（IdeaX）
                </h2>
                <p className="text-xs sm:text-sm text-stone-500 leading-relaxed max-w-xl">
                  一個問題，找到更多可能・全台灣最具實戰力的新型態問題解決市集
                </p>
              </div>

              <div className="shrink-0 p-3 bg-stone-50 rounded-2xl border border-stone-200/70 flex items-center justify-center shadow-2xs">
                <IdeaXLogo variant="chuangdianzi" size="md" className="h-10 sm:h-12 w-auto object-contain" />
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-stone-100 text-xs text-stone-600 leading-relaxed">
              在傳統顧問高門檻、搜尋引擎資訊雜亂的時代，創業者與各領域實作者每天都在面對真實又棘手的未知難題。「創點子 IdeaX」應運而生——讓每一個痛點都能自由提出，讓每一份具備實戰智慧的破局方案都能獲得應有的實質回報。
            </div>
          </div>

          {/* 三大核心運作機制 */}
          <div className="bg-white rounded-3xl border border-stone-200/80 p-5 sm:p-6 shadow-xs space-y-3.5">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-stone-700" />
              <span>三大核心機制</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-stone-50/80 border border-stone-200/70 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                    💡
                  </div>
                  <span className="font-bold text-stone-900 text-xs sm:text-sm">痛點免費提出</span>
                </div>
                <p className="text-stone-600 leading-relaxed text-[11px] sm:text-xs">
                  $0 元零門檻上架真實難題，各界專家自由提案並自訂解鎖定價，隨時探索落地解法。
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50/80 border border-stone-200/70 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-black">
                    🎯
                  </div>
                  <span className="font-bold text-stone-900 text-xs sm:text-sm">分級精準對接</span>
                </div>
                <p className="text-stone-600 leading-relaxed text-[11px] sm:text-xs">
                  從社群靈感激盪到深度商業顧問方案，透過 L0～L4 分級體系精準媒合專業人才。
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50/80 border border-stone-200/70 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                    🛡️
                  </div>
                  <span className="font-bold text-stone-900 text-xs sm:text-sm">安全履約與託管</span>
                </div>
                <p className="text-stone-600 leading-relaxed text-[11px] sm:text-xs">
                  兩段式獨立交易與閉路點數託管，提問者採納滿意始直匯解答者，保障買賣雙方。
                </p>
              </div>
            </div>
          </div>

          {/* 快捷導覽入口按鈕群 */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (onStartOnboarding) {
                  onStartOnboarding();
                } else if (onBack) {
                  onBack();
                }
              }}
              className="p-3.5 rounded-2xl bg-white border border-stone-200/80 hover:border-stone-400 hover:shadow-xs flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Compass className="w-5 h-5 text-amber-600" />
              <span className="text-xs font-bold text-stone-800">使用教學導覽</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('download_app')}
              className="p-3.5 rounded-2xl bg-white border border-stone-200/80 hover:border-amber-400 hover:shadow-xs flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Download className="w-5 h-5 text-amber-600" />
              <span className="text-xs font-bold text-stone-800">下載 APP</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('contact')}
              className="p-3.5 rounded-2xl bg-white border border-stone-200/80 hover:border-stone-400 hover:shadow-xs flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Headphones className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-bold text-stone-800">聯絡我們 & 常見問題</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('terms')}
              className="p-3.5 rounded-2xl bg-white border border-stone-200/80 hover:border-stone-400 hover:shadow-xs flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <FileText className="w-5 h-5 text-indigo-600" />
              <span className="text-xs font-bold text-stone-800">條款與聲明</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('finance')}
              className="p-3.5 rounded-2xl bg-white border border-stone-200/80 hover:border-stone-400 hover:shadow-xs flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <CreditCard className="w-5 h-5 text-amber-600" />
              <span className="text-xs font-bold text-stone-800">平台金流運作</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('others');
                setSelectedOtherChapterId('other_4');
              }}
              className="p-3.5 rounded-2xl bg-white border border-stone-200/80 hover:border-stone-400 hover:shadow-xs flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Layers className="w-5 h-5 text-purple-600" />
              <span className="text-xs font-bold text-stone-800">平台用戶光譜</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. 下載 APP (直接下載鍵與安裝教學卡片) */}
      {/* ========================================================================= */}
      {activeTab === 'download_app' && !isSubPage && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* 主下載卡片 (Hero Direct Download Card) */}
          <div className="bg-gradient-to-br from-stone-900 via-stone-950 to-amber-950 rounded-3xl p-6 sm:p-8 text-white border border-amber-500/20 shadow-xl relative overflow-hidden">
            {/* 背景科技光暈裝飾 */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-purple-500/10 rounded-full blur-2xl pointer-events-none -ml-20 -mb-20" />

            <div className="relative z-10 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-amber-400/50 bg-white p-1.5 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                    <img
                      src="/pwa-192x192.png"
                      alt="IdeaX創點子"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <IdeaXLogo variant="ideax-6" size="sm" theme="dark" />
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        官方原生 PWA 應用程式
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                      下載 IdeaX 創點子 App
                    </h2>
                  </div>
                </div>

                {/* 平台版本與即時更新標籤 */}
                <div className="hidden sm:flex flex-col items-end text-xs text-stone-400">
                  <span className="font-mono text-stone-300 font-bold">版本 v{APP_VERSION}</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[11px] mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                    即時雲端版本・免繁瑣審核
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-2xl">
                將「創點子 IdeaX」安裝至您的手機或電腦桌面，享有獨立無網址列全螢幕視窗、毫秒級極速快開、即時懸賞通知與安全金流託管保護。無論 iOS、Android、Windows 或 Mac 均全面支援！
              </p>

              {/* 特色亮點標籤 */}
              <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold">
                <span className="px-2.5 py-1 rounded-xl bg-white/10 text-amber-300 border border-amber-400/20 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  秒速極速啟動
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-white/10 text-emerald-300 border border-emerald-400/20 flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  全螢幕無干擾視窗
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-white/10 text-blue-300 border border-blue-400/20 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  案件與聊天即時通知
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-white/10 text-purple-300 border border-purple-400/20 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  銀行級 SSL 託管安全
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-white/10 text-stone-300 border border-white/15">
                  極小體積 &lt; 5MB
                </span>
              </div>

              {/* 直接下載鍵核心區 */}
              <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* 1. 主按鈕：直接下載 / 安裝 App */}
                <button
                  type="button"
                  onClick={async () => {
                    await triggerDirectAppDownloadOrInstall(openPwaInstallModal);
                  }}
                  className="px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 active:scale-95 text-stone-950 font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-amber-500/30 transition-all cursor-pointer group"
                  title="直接喚起瀏覽器原生安裝程序"
                >
                  <Download className="w-5 h-5 stroke-[2.5] text-stone-950 group-hover:translate-y-0.5 transition-transform" />
                  <span>直接下載 / 安裝 IdeaX App</span>
                </button>

                {/* 2. 電腦桌面捷徑下載 */}
                <button
                  type="button"
                  onClick={() => {
                    const ok = downloadAppLauncherFile();
                    if (ok) {
                      addNotification({
                        title: '捷徑下載成功',
                        message: '已為您下載桌面快速啟動捷徑檔，點擊即可一秒直達平台！',
                        type: 'system',
                      });
                    }
                  }}
                  className="px-4 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/20 transition-all cursor-pointer"
                  title="下載電腦桌面一鍵啟動捷徑檔 (.url / .html)"
                >
                  <Laptop className="w-4 h-4 text-amber-300" />
                  <span>下載電腦桌面捷徑檔</span>
                </button>

                {/* 3. 複製平台網址 */}
                <button
                  type="button"
                  onClick={() => {
                    try {
                      navigator.clipboard.writeText(window.location.origin);
                      setCopiedAppUrl(true);
                      setTimeout(() => setCopiedAppUrl(false), 2500);
                      addNotification({
                        title: '連結複製成功',
                        message: '已複製平台網址，您可貼至手機或電腦瀏覽器進行加入主畫面！',
                        type: 'system',
                      });
                    } catch {}
                  }}
                  className="px-4 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/20 transition-all cursor-pointer"
                  title="複製平台網址"
                >
                  {copiedAppUrl ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300">網址已複製！</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-stone-300" />
                      <span>複製 App 網址</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-stone-400 font-medium">
                💡 提示：點擊「直接下載 / 安裝」鍵，系統將自動偵測設備呼叫專屬安裝程序。若您的瀏覽器已安裝過或未自動跳出，請參考下方對應裝置教學卡片。
              </p>
            </div>
          </div>

          {/* 教學卡片群標題 */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm sm:text-base font-extrabold text-stone-900">
                各裝置手動加入主畫面教學卡片
              </h3>
            </div>
            <span className="text-xs text-stone-500 font-medium">
              30 秒快速設定即可完成
            </span>
          </div>

          {/* 教學卡片 Grid (3 大主流設備 + 1 應用優勢卡片) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 教學卡片 1：Android 手機 */}
            <div className="bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-400 transition-colors">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Smartphone className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-stone-900">Android 安裝教學</h4>
                      <p className="text-[10px] text-stone-500">Chrome / Edge / 三星瀏覽器</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    推薦
                  </span>
                </div>

                <ol className="space-y-2.5 text-xs text-stone-700 leading-relaxed font-medium">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</span>
                    <span>使用手機 Chrome 或 Edge 開啟 IdeaX 平台</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</span>
                    <span>點選瀏覽器右上角的<strong>「⋮ 選單（三個點）」</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</span>
                    <span>選擇<strong>「安裝應用程式」</strong>或<strong>「加到主畫面」</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">4</span>
                    <span>點擊「安裝」確認，App 圖示即自動加入手機桌面</span>
                  </li>
                </ol>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-[11px] text-emerald-900 font-medium">
                ✨ 安裝後點擊桌面圖示，即享獨立全螢幕無網址列操作！
              </div>
            </div>

            {/* 教學卡片 2：iPhone / iPad (iOS) */}
            <div className="bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-400 transition-colors">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Smartphone className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-stone-900">iPhone / iPad 安裝</h4>
                      <p className="text-[10px] text-stone-500">iOS Safari 專屬安裝管道</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    iOS 必備
                  </span>
                </div>

                <ol className="space-y-2.5 text-xs text-stone-700 leading-relaxed font-medium">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</span>
                    <span>使用 iPhone 內建 <strong>Safari 瀏覽器</strong>開啟 IdeaX</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</span>
                    <span>點選螢幕底部中間的<strong>「分享按鈕（⎋ 向上箭頭）」</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</span>
                    <span>在選單中向下滑動，點選<strong>「加入主畫面（＋）」</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">4</span>
                    <span>確認名稱後點右上角「新增」，App 即可在桌面秒開</span>
                  </li>
                </ol>
              </div>

              <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-[11px] text-blue-900 font-medium">
                💡 iOS 請務必使用 Safari 瀏覽器方能啟動「加入主畫面」。
              </div>
            </div>

            {/* 教學卡片 3：電腦桌面版 (Windows / macOS) */}
            <div className="bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-purple-400 transition-colors">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                      <Laptop className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-stone-900">電腦桌面版安裝</h4>
                      <p className="text-[10px] text-stone-500">Windows / macOS / Chrome / Edge</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    獨立視窗
                  </span>
                </div>

                <ol className="space-y-2.5 text-xs text-stone-700 leading-relaxed font-medium">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</span>
                    <span>使用電腦版 Chrome 或 Edge 開啟 IdeaX 平台</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</span>
                    <span>注意網址列最右側出現的<strong>「安裝應用程式」</strong>圖示</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</span>
                    <span>點擊「安裝」，自動在工作列與桌面建立專屬圖示</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">4</span>
                    <span>亦可點擊上方「下載電腦桌面捷徑檔」一秒下載啟動檔</span>
                  </li>
                </ol>
              </div>

              <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/80 text-[11px] text-purple-900 font-medium">
                ⚡ 獨立桌面視窗完全不受其他分頁干擾，操作流暢十倍！
              </div>
            </div>
          </div>

          {/* 教學卡片 4：常見問答 Q&A */}
          <div className="bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-6 shadow-xs space-y-3.5">
            <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-600" />
              <span>PWA 應用程式常見問題與特色</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-1.5">
                <span className="font-bold text-stone-900 text-xs sm:text-sm">Q: 需要到 Google Play 或 App Store 搜尋嗎？</span>
                <p className="text-stone-600 leading-relaxed text-[11px] sm:text-xs">
                  完全不需要！IdeaX 採用國際 W3C 標準 PWA 架構，直接由官方雲端發布，省去商店搜尋與漫長審核，永遠使用最新修正版。
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-1.5">
                <span className="font-bold text-stone-900 text-xs sm:text-sm">Q: 安裝會佔用很多手機空間嗎？</span>
                <p className="text-stone-600 leading-relaxed text-[11px] sm:text-xs">
                  不會！核心體積僅小於 5MB，比傳統 Native App 省下 90% 以上儲存空間，運行輕巧省電且支援極速快取。
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-1.5">
                <span className="font-bold text-stone-900 text-xs sm:text-sm">Q: 電腦與手機資料會即時同步嗎？</span>
                <p className="text-stone-600 leading-relaxed text-[11px] sm:text-xs">
                  全平台 100% 雲端同步！無論您從手機 App 提案、或在電腦版查看分析，所有資料、聊天與錢包點數皆即時無縫連動。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. 聯絡我們 (直接套用原則申訴頁面 & 官方客服管道) */}
      {/* ========================================================================= */}
      {activeTab === 'contact' && !isSubPage && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* 客服核心行動卡片 (直接套用線上客服與爭議仲裁窗口) */}
          <div className="bg-white rounded-3xl border border-stone-200/80 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                    <Headphones className="w-3 h-3 text-emerald-600" />
                    <span>官方客服與申訴通道</span>
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-stone-900 mt-1">
                  官方客服與爭議調解服務
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  點擊立即開啟標準客服與爭議仲裁申訴窗口，由專員直接受理與保全調查。
                </p>
              </div>

              {/* 客服與回報按鈕 */}
              <button
                type="button"
                onClick={() => openCustomerService({ subject: '來自平台資訊之客服與回報' })}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
              >
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span>客服與回報</span>
              </button>
            </div>
          </div>

          {/* 官方聯絡資訊卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 客服信箱 */}
            <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center font-bold">
                  <Mail className="w-4 h-4" />
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('support@ideax.tw', '客服信箱')}
                  className="text-[11px] font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/70 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedEmail === '客服信箱' ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedEmail === '客服信箱' ? '已複製' : '複製'}</span>
                </button>
              </div>
              <div>
                <span className="text-xs font-bold text-stone-900 block">客服支援信箱</span>
                <a
                  href="mailto:support@ideax.tw"
                  className="text-xs font-mono font-bold text-indigo-600 hover:underline block mt-0.5"
                >
                  support@ideax.tw
                </a>
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                受理帳號、訂閱方案、儲值點數、案件履約與申訴調解事宜。
              </p>
            </div>

            {/* 商務信箱 */}
            <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('business@ideax.tw', '商務信箱')}
                  className="text-[11px] font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/70 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedEmail === '商務信箱' ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedEmail === '商務信箱' ? '已複製' : '複製'}</span>
                </button>
              </div>
              <div>
                <span className="text-xs font-bold text-stone-900 block">商務與企業合作</span>
                <a
                  href="mailto:business@ideax.tw"
                  className="text-xs font-mono font-bold text-indigo-600 hover:underline block mt-0.5"
                >
                  business@ideax.tw
                </a>
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                企業難題專區、機構團體方案、API 整合與公關洽詢。
              </p>
            </div>

            {/* 服務時間 */}
            <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-2 sm:col-span-3 lg:col-span-1">
              <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-stone-900 block">服務時間</span>
                <span className="text-xs font-bold text-stone-800 block mt-0.5">
                  週一至週日 09:00 - 22:00
                </span>
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                線上客服專人受理；各類爭議案件依序進行調查審議與處理。
              </p>
            </div>
          </div>

          {/* 常見問題自主排查 (FAQ Accordion) */}
          <div className="bg-white rounded-3xl border border-stone-200/80 p-5 sm:p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-stone-700" />
              <span>常見問題 FAQ</span>
            </h3>

            <div className="space-y-2">
              {FAQ_LIST.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-stone-200/70 overflow-hidden transition-all bg-stone-50/50"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full p-3.5 text-left flex items-center justify-between gap-2 font-bold text-xs text-stone-900 hover:bg-stone-100/60 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-stone-400 font-mono text-[11px]">Q{idx + 1}.</span>
                        <span>{faq.q}</span>
                      </span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-stone-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-3.5 pb-3.5 pt-1 text-[11px] text-stone-600 leading-relaxed border-t border-stone-200/50 bg-white">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. 條款與聲明 (Clean List & Modern Detail View) */}
      {/* ========================================================================= */}
      {activeTab === 'terms' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {!selectedTermKey ? (
            /* 條款目錄清單 (Mobile-friendly rows) */
            <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs divide-y divide-stone-100 overflow-hidden">
              {TERMS_LIST.map((term) => {
                const Icon = term.icon;
                return (
                  <button
                    key={term.key}
                    onClick={() => setSelectedTermKey(term.key)}
                    className="w-full min-h-[60px] p-4 sm:p-5 flex items-center justify-between text-left hover:bg-stone-50/80 transition-colors cursor-pointer group active:bg-stone-100/70"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-3">
                      <div className="p-2.5 rounded-xl bg-stone-100 text-stone-700 group-hover:bg-stone-200/70 transition-colors shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-stone-950 transition-colors">
                            {term.title}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border border-stone-200/60 ${term.tagColor}`}>
                            {term.badge}
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5 line-clamp-1">
                          {term.subtitle}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-stone-700 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                );
              })}
            </div>
          ) : (
            /* 條款內容詳讀頁 */
            <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden animate-in fade-in duration-150">
              <div className="p-5 sm:p-7 border-b border-stone-100 bg-stone-50/60">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-stone-200 text-stone-800">
                    {activeTerm?.badge}
                  </span>
                  <span className="text-xs font-mono text-stone-400">
                    v{activeTerm?.version}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-stone-900">
                  {activeTerm?.title}
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 mt-1">
                  {activeTerm?.subtitle}
                </p>

                {/* 簡明摘要 */}
                <div className="mt-3 p-3.5 rounded-xl bg-white border border-stone-200 text-xs text-stone-800 leading-relaxed font-medium">
                  {activeTerm?.summary}
                </div>
              </div>

              {/* 條款本文 */}
              <div className="p-5 sm:p-7 space-y-3.5 text-xs text-stone-700 leading-relaxed max-h-[600px] overflow-y-auto">
                {activeTerm?.content.map((paragraph, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-stone-50/80 border border-stone-200/70 space-y-1"
                  >
                    {paragraph.split('\n').map((line, lIdx) => (
                      <p
                        key={lIdx}
                        className={
                          lIdx === 0
                            ? 'font-bold text-stone-900 text-xs mb-1'
                            : 'text-stone-600 leading-relaxed'
                        }
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                ))}
              </div>

              {/* 底部返回按鈕 */}
              <div className="p-3.5 border-t border-stone-100 bg-stone-50/50 flex justify-center">
                <button
                  onClick={() => setSelectedTermKey(null)}
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-colors cursor-pointer active:scale-95"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>返回條款列表</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. 平台金流運作 (Timeline & Clean Chapters) */}
      {/* ========================================================================= */}
      {activeTab === 'finance' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {!selectedFinanceChapterId ? (
            <div className="space-y-4">
              {/* 金流生命週期時間軸卡片 */}
              <div className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>四階段金流生命週期（非電支執照合規設計）</span>
                  </h3>
                  <span className="text-[11px] font-mono font-bold text-stone-400">
                    ≤ D0+21 日入帳
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  {[
                    { step: '1', title: 'T+0 預扣託管', desc: '發布時扣除閉路點數' },
                    { step: '2', title: 'D0 採納核銷', desc: '點數消滅轉為應付報酬' },
                    { step: '3', title: '7 日猶豫期', desc: '提問者異議調解期' },
                    { step: '4', title: '每月 5 號撥款', desc: '電匯轉入銀行帳戶' },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-0.5"
                    >
                      <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-800 text-[10px] font-bold mx-auto flex items-center justify-center font-mono">
                        {item.step}
                      </span>
                      <span className="font-bold text-stone-900 block text-xs mt-1">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-stone-500 block leading-tight">
                        {item.desc}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 金流運作目錄清單 */}
              <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs divide-y divide-stone-100 overflow-hidden">
                {FINANCE_CHAPTERS.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => setSelectedFinanceChapterId(ch.id)}
                    className="w-full min-h-[60px] p-4 sm:p-5 flex items-center justify-between text-left hover:bg-stone-50/80 transition-colors cursor-pointer group active:bg-stone-100/70"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-3">
                      <span className="w-8 h-8 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                        {ch.num}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-stone-950 transition-colors">
                            {ch.title}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200/60">
                            {ch.badge}
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5 line-clamp-1">
                          {ch.summary}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-stone-700 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* 金流章節詳查頁 */
            <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden animate-in fade-in duration-150">
              {/* 章節一 */}
              {selectedFinanceChapterId === 'fin_1' && (
                <div className="p-5 sm:p-7 space-y-4">
                  <div className="border-b border-stone-100 pb-3">
                    <span className="text-xs font-bold text-stone-700 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">
                      第一章 • 合規策略
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-stone-900 mt-1.5">
                      設計目標與非電支執照合規策略
                    </h3>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-800 leading-relaxed space-y-1.5">
                    <p className="font-bold text-stone-900">
                      切斷使用者對使用者（P2P）直接資金移轉，以兩段獨立交易架構符合法規：
                    </p>
                    <p className="text-stone-600">
                      在無需申請電子支付機構執照門檻下，保留「懸賞預扣、即時鎖定預算、事後核算撥款」的使用體驗。
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 space-y-1">
                      <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>提問階段（購買預付服務點數）</span>
                      </h4>
                      <p className="text-stone-600 leading-relaxed text-[11px]">
                        提問者透過信用卡或 IAP 取得閉路點數，為單一目的服務對價，不可折現、不可轉讓。
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 space-y-1">
                      <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>撥款階段（平台應付勞務報酬）</span>
                      </h4>
                      <p className="text-stone-600 leading-relaxed text-[11px]">
                        採納後點數核銷消滅；平台以自有營運資金透過第三方金流電匯直接撥付解答者法定貨幣現金。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 章節二 */}
              {selectedFinanceChapterId === 'fin_2' && (
                <div className="p-5 sm:p-7 space-y-4">
                  <div className="border-b border-stone-100 pb-3">
                    <span className="text-xs font-bold text-stone-700 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">
                      第二章 • 資金流向
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-stone-900 mt-1.5">
                      點數與收益架構
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                      <span className="font-mono text-[10px] text-amber-700 font-bold block">
                        步驟 1 • 提問付現買點
                      </span>
                      <h5 className="font-bold text-stone-900">閉路點數預扣</h5>
                      <p className="text-stone-600 text-[11px] leading-relaxed">
                        提問者付現取得平台閉路點數，發布懸賞時系統預扣點數鎖定預算。
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
                      <span className="font-mono text-[10px] text-rose-700 font-bold block">
                        分界點 • 採納即核銷
                      </span>
                      <h5 className="font-bold text-stone-900">點數核銷 ➔ 應付帳款</h5>
                      <p className="text-stone-600 text-[11px] leading-relaxed">
                        採納當下點數全數核銷消滅，轉化為平台對解答者之應付服務報酬。未採納點數原路退回。
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                      <span className="font-mono text-[10px] text-emerald-700 font-bold block">
                        步驟 2 • 解答領現金
                      </span>
                      <h5 className="font-bold text-stone-900">平台自有資金撥款</h5>
                      <p className="text-stone-600 text-[11px] leading-relaxed">
                        經猶豫期核算後，由平台自有營運帳戶以銀行轉帳批次撥付解答者法定貨幣現金。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 章節三 */}
              {selectedFinanceChapterId === 'fin_3' && (
                <div className="p-5 sm:p-7 space-y-4">
                  <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-stone-700 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">
                        第三章 • 時間軸
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-stone-900 mt-1.5">
                        懸賞生命週期與撥款時間軸
                      </h3>
                    </div>
                    <span className="text-xs font-mono font-bold text-stone-500">
                      ≤ D0+21 日入帳
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    {[
                      { step: 1, title: '發布懸賞', time: 'T+0', desc: '預扣點數' },
                      { step: 2, title: '提交解答', time: 'T+n', desc: '專家提交方案' },
                      { step: 3, title: '採納解答', time: 'D0 採納日', desc: '點數核銷' },
                      { step: 4, title: '猶豫期', time: 'D0 ~ +7', desc: '提問者異議' },
                      { step: 5, title: '核算緩衝', time: 'D0+7 ~ +9', desc: '系統覆核' },
                      { step: 6, title: '進入排程', time: 'D0+9 起', desc: '撥款排程' },
                      { step: 7, title: '定期撥款', time: '每月 5 號', desc: '固定結算' },
                      { step: 8, title: '實際入帳', time: '每月 5 號', desc: '電匯轉入銀行' },
                    ].map((item) => (
                      <div
                        key={item.step}
                        onClick={() => setActiveTimelineStep(item.step)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          activeTimelineStep === item.step
                            ? 'border-stone-900 bg-stone-100 font-bold'
                            : 'border-stone-200 bg-stone-50/50'
                        }`}
                      >
                        <span className="text-[10px] text-stone-400 block font-mono">
                          階段 {item.step}
                        </span>
                        <span className="text-stone-900 block mt-0.5 text-xs">{item.title}</span>
                        <span className="text-[10px] text-stone-500 font-mono block mt-0.5">
                          {item.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 章節四 */}
              {selectedFinanceChapterId === 'fin_4' && (
                <div className="p-5 sm:p-7 space-y-4">
                  <div className="border-b border-stone-100 pb-3">
                    <span className="text-xs font-bold text-stone-700 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">
                      第四章 • 帳款與異議
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-stone-900 mt-1.5">
                      解答者應收帳款介面規範與異議分流
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                      <span className="font-bold text-stone-900 block">1. 獲得懸賞點數</span>
                      <p className="text-stone-500 text-[11px]">
                        各筆採納獲得之點數統計，純為平台計分與榮譽參考，非可提領資產。
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                      <span className="font-bold text-stone-900 block">2. 平台應撥款</span>
                      <p className="text-stone-600 text-[11px]">
                        已核算之應付服務報酬帳款，排程於每月 5 號合併定期撥出。
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                      <span className="font-bold text-stone-900 block">3. 累計撥款</span>
                      <p className="text-stone-500 text-[11px]">
                        歷史已實際撥付之金額報表，解答者在平台無儲值帳戶。
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 space-y-1">
                      <span className="font-bold text-stone-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>猶豫期內（D0 ~ D0+7）</span>
                      </span>
                      <p className="text-stone-600 text-[11px]">
                        若異議成立直接自「平台應撥款」欄位扣除，不涉及事後追回程序。
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 space-y-1">
                      <span className="font-bold text-stone-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>猶豫期外（已核算撥出）</span>
                      </span>
                      <p className="text-stone-600 text-[11px]">
                        查核屬實者自解答者下一次批次撥款中扣抵，無款項則依催告程序處理。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 章節五 */}
              {selectedFinanceChapterId === 'fin_5' && (
                <div className="p-5 sm:p-7 space-y-4">
                  <div className="border-b border-stone-100 pb-3">
                    <span className="text-xs font-bold text-stone-700 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">
                      第五章 • 風控查核
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-stone-900 mt-1.5">
                      事後查核與追回機制
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                      <span className="font-bold text-stone-900 block">1. 暫停與 7 日申覆</span>
                      <p className="text-stone-500 text-[11px]">
                        接獲檢舉或異常時先暫停撥款，通知解答者於 7 日內提出申覆說明。
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                      <span className="font-bold text-stone-900 block">2. 批次扣抵機制</span>
                      <p className="text-stone-500 text-[11px]">
                        查核屬實者自後續應撥款批次抵扣，不成立則立即恢復撥款排程。
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                      <span className="font-bold text-stone-900 block">3. 14 日書面催告</span>
                      <p className="text-stone-500 text-[11px]">
                        若解答者無足額款項供扣抵，平台以書面通知於 14 日內返還。
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                      <span className="font-bold text-stone-900 block">4. 30 日除斥期間</span>
                      <p className="text-stone-500 text-[11px]">
                        平台追回權利以原定撥款日起算 30 日內為限，逾期不得再行追回。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 底部返回按鈕 */}
              <div className="p-3.5 border-t border-stone-100 bg-stone-50/50 flex justify-center">
                <button
                  onClick={() => setSelectedFinanceChapterId(null)}
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-colors cursor-pointer active:scale-95"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>返回金流章節目錄</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. 其他說明 (Clean Chapter Index & Sub-Views) */}
      {/* ========================================================================= */}
      {activeTab === 'others' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {!selectedOtherChapterId ? (
            /* 其他說明目錄清單 */
            <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs divide-y divide-stone-100 overflow-hidden">
              {OTHER_CHAPTERS.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setSelectedOtherChapterId(ch.id)}
                  className="w-full min-h-[60px] p-4 sm:p-5 flex items-center justify-between text-left hover:bg-stone-50/80 transition-colors cursor-pointer group active:bg-stone-100/70"
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-3">
                    <span className="w-8 h-8 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                      {ch.num}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-stone-950 transition-colors">
                          {ch.title}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200/60">
                          {ch.badge}
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5 line-clamp-1">
                        {ch.summary}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-stone-700 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            /* 其他說明詳查頁 */
            <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden animate-in fade-in duration-150">
              {/* 說明 1: 五級問題分級體系 */}
              {selectedOtherChapterId === 'other_1' && (
                <div className="p-5 sm:p-7 space-y-4">
                  <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-stone-700 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">
                        說明一 • 問題分級
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-stone-900 mt-1.5">
                        五級問題分級體系（L0 ~ L4）
                      </h3>
                    </div>
                    <span className="text-xs text-stone-500 font-medium">痛點免費提出 • 懸賞自訂</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
                    {(['L0', 'L1', 'L2', 'L3', 'L4'] as ProblemLevel[]).map((lvl) => {
                      const cfg = LEVEL_CONFIGS[lvl];
                      return (
                        <div
                          key={lvl}
                          className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/60 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-stone-900">{lvl}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.badgeClass}`}>
                              {cfg.name}
                            </span>
                          </div>
                          <div className="font-mono text-stone-800 font-bold text-[11px]">
                            {cfg.rangeText}
                          </div>
                          <p className="text-[11px] text-stone-500 line-clamp-3 leading-relaxed">
                            {cfg.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 說明 2: 痛點免費提出與專家解鎖 */}
              {selectedOtherChapterId === 'other_2' && (
                <div className="p-5 sm:p-7 space-y-4">
                  <div className="border-b border-stone-100 pb-3">
                    <span className="text-xs font-bold text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                      說明二 • 痛點機制
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-stone-900 mt-1.5">
                      痛點免費提出與專家解鎖機制
                    </h3>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">
                    在 IdeaX 上，<strong>提問者可 NT$ 0 元免費上架生活與產業痛點</strong>，無預扣款項；各領域專家在下方提交專屬落地解法，並<strong>自訂解鎖金額</strong>，提問者或社群付費解鎖查閱完整方案。
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 space-y-1">
                      <span className="font-bold text-stone-900 block">1. 痛點 0 元提出</span>
                      <p className="text-stone-500 text-[11px]">零門檻快速提出瓶頸難題，吸引多方專家關注。</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 space-y-1">
                      <span className="font-bold text-stone-900 block">2. 專家自訂解鎖價</span>
                      <p className="text-stone-500 text-[11px]">針對痛點提出深度方案，自訂合理定價解鎖。</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 space-y-1">
                      <span className="font-bold text-stone-900 block">3. 批次安全撥款</span>
                      <p className="text-stone-500 text-[11px]">買方付費解鎖後，平台扣除服務費後批次撥入專家帳戶。</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 說明 3: 會員方案費率 */}
              {selectedOtherChapterId === 'other_3' && (
                <div className="p-5 sm:p-7 space-y-4">
                  <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-stone-800 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">
                        說明三 • 會員方案
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-stone-900 mt-1.5">
                        會員訂閱方案與費率減免
                      </h3>
                    </div>
                    <span className="text-xs text-stone-900 font-bold">最高 100% 全額入帳</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-stone-900 text-sm">達人方案</span>
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                          費率 8%
                        </span>
                      </div>
                      <p className="font-mono font-bold text-stone-900">半年 $1,499</p>
                      <p className="text-stone-500 text-[11px]">費率僅 8%，實收 92%。</p>
                    </div>

                    <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-stone-900 text-sm">權威方案</span>
                        <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                          費率 5%
                        </span>
                      </div>
                      <p className="font-mono font-bold text-stone-900">$599/月 或 $5,990/年</p>
                      <p className="text-stone-500 text-[11px]">費率 5%（實收 95%）＋ 高賞提案優先推薦。</p>
                    </div>

                    <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-stone-900 text-sm">大師方案</span>
                        <span className="text-[10px] font-bold bg-amber-200 text-stone-900 px-2 py-0.5 rounded-full">
                          0% 免服務費
                        </span>
                      </div>
                      <p className="font-mono font-bold text-stone-900">$1,490/月 或 $14,900/年</p>
                      <p className="text-stone-600 text-[11px]">0% 免服務費，100% 全額入帳 ＋ 24hr AI客服特助與 AI-CRM。</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 說明 4: 平台用戶角色與社群 */}
              {selectedOtherChapterId === 'other_4' && (
                <div className="p-4 sm:p-6">
                  <PlatformRolesSpectrumView
                    showBackToList={true}
                    onBack={() => setSelectedOtherChapterId(null)}
                    onOpenCommunityGuidelines={() => {
                      setSelectedOtherChapterId(null);
                      setActiveTab('terms');
                      setSelectedTermKey('community_guidelines');
                    }}
                  />
                </div>
              )}

              {/* 說明 5: AI 功能介紹與智慧賦能 */}
              {selectedOtherChapterId === 'other_5' && (
                <div className="p-5 sm:p-7 space-y-4">
                  <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-purple-900 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
                        說明五 • AI 智慧功能
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-stone-900 mt-1.5 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        <span>AI 智慧引擎賦能與高效溝通工具</span>
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">
                    IdeaX 整合最前沿 AI 語意與專家大語言模型，全面賦能提問者、解答者與平台營運管理：
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                      <span className="font-bold text-stone-900 block">1. AI 題目自動標籤與建議</span>
                      <p className="text-stone-500 text-[11px]">自動分析痛點語意，生成 Hashtag 與推薦懸賞級別。</p>
                    </div>

                    <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                      <span className="font-bold text-stone-900 block">2. AI 專家智慧媒合推播</span>
                      <p className="text-stone-500 text-[11px]">主動將高適配度問題推播給專屬專家。</p>
                    </div>

                    <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                      <span className="font-bold text-stone-900 block">3. AI-CRM 客戶作戰藍圖</span>
                      <p className="text-stone-500 text-[11px]">為專家拆解潛在客戶痛點與 3 階段促成策略。</p>
                    </div>

                    <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                      <span className="font-bold text-stone-900 block">4. AI 智慧爭議調解報告</span>
                      <p className="text-stone-500 text-[11px]">調閱對話與交付紀錄，生成中立調解報告與和解協議。</p>
                    </div>

                    <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                      <span className="font-bold text-stone-900 block">5. AI 商業企劃與合規生成</span>
                      <p className="text-stone-500 text-[11px]">一鍵產出正規商業企劃書、電子協議與進度試算。</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 底部返回按鈕 */}
              <div className="p-3.5 border-t border-stone-100 bg-stone-50/50 flex justify-center">
                <button
                  onClick={() => setSelectedOtherChapterId(null)}
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-colors cursor-pointer active:scale-95"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>返回說明目錄</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
