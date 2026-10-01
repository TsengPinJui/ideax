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
  Flame,
  AlertTriangle,
  Info,
  BookOpen,
  Headphones,
  ShieldAlert,
  RotateCcw,
  MessageSquare,
  Building2,
  Users,
  Settings2,
} from 'lucide-react';
import { TERMS_DATA, TermItem } from '../data/termsData';
import { AboutSection, ProblemLevel } from '../types';
import { LEVEL_CONFIGS } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { IdeaXLogo } from './IdeaXLogo';
import { PlatformRolesSpectrumView } from './PlatformRolesSpectrumView';

interface AboutUsViewProps {
  initialSection?: AboutSection | string;
  onBack?: () => void;
  isModal?: boolean;
}

type MainTab = 'terms' | 'finance' | 'others' | 'story';

export const AboutUsView: React.FC<AboutUsViewProps> = ({
  initialSection = 'list',
  onBack,
  isModal = false,
}) => {
  const { currentUser, openCustomerService } = useApp();

  // Determine initial state based on initialSection prop
  const [activeTab, setActiveTab] = useState<MainTab>(() => {
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

  // Sync if initialSection changes externally
  useEffect(() => {
    if (initialSection === 'finance' || initialSection === 'architecture') {
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

  // 條款與聲明清單（重新整理排序）
  const TERMS_LIST = [
    {
      key: 'general_terms',
      title: '一般條款',
      subtitle: '通用基本協議、帳號規範、閉路點數與平台服務原則',
      badge: '全站通用',
      icon: FileText,
    },
    {
      key: 'questioner_terms',
      title: '提問者條款',
      subtitle: '懸賞發布、痛點提出、款項託管、採納驗收與商用授權',
      badge: '提問規範',
      icon: Scale,
    },
    {
      key: 'solver_terms',
      title: '解答者條款',
      subtitle: '方案交付、實名認證、銀行自動撥付與原創擔保',
      badge: '接案規範',
      icon: Award,
    },
    {
      key: 'recharge_subscription_terms',
      title: '儲值與訂閱條款',
      subtitle: '點數購買折抵、會員方案週期訂閱、自動續約管理與款項原則',
      badge: '儲值與訂閱',
      icon: CreditCard,
    },
    {
      key: 'community_guidelines',
      title: '社群守則與內容管理規範',
      subtitle: '文明問答交流、各角色專屬守則、專家執業倫理與檢舉機制',
      badge: '［社群守則］',
      icon: MessageSquare,
    },
    {
      key: 'copyright_policy',
      title: '著作權保護政策',
      subtitle: '智慧財產權歸屬、採納商用實施授權與檢舉下架程序',
      badge: '智財政策',
      icon: ShieldCheck,
    },
    {
      key: 'refund_dispute_policy',
      title: '退款政策與爭議調解辦法',
      subtitle: '懸賞未採納退還規則、方案解鎖爭議審議與原路退款路徑',
      badge: '交易保障',
      icon: RotateCcw,
    },
    {
      key: 'anti_fraud_aml_policy',
      title: '反詐騙與洗錢防制政策',
      subtitle: '洗錢防制合規、異常交易即時風控與可疑帳號通報機制',
      badge: '法規與資安',
      icon: ShieldAlert,
    },
    {
      key: 'privacy_policy',
      title: '隱私權聲明',
      subtitle: '個人資料保護法合規、會員隱私專屬顯示與資料加密防護',
      badge: '隱私保護',
      icon: ShieldCheck,
    },
    {
      key: 'disclaimer',
      title: '免責聲明',
      subtitle: '資料檔案免保管聲明、商業決策風險告知、非特許顧問聲明與系統不可抗力',
      badge: '法律免責',
      icon: AlertCircle,
    },
  ];

  // 平台金流運作章節
  const FINANCE_CHAPTERS = [
    {
      id: 'fin_1',
      num: '一',
      title: '設計目標與非電支執照合規策略',
      summary: '切斷使用者間直接資金移轉，以「兩段式獨立交易」架構符合法規要求並保留即時託管體驗。',
      badge: '合規策略',
    },
    {
      id: 'fin_2',
      num: '二',
      title: '點數與收益架構',
      summary: '提問者付現取得閉路點數、採納時點數核銷轉化為應付報酬，平台自有資金直接撥付解答者。',
      badge: '資金流向',
    },
    {
      id: 'fin_3',
      num: '三',
      title: '懸賞與自訂專案生命週期與每月撥款時間軸',
      summary: '從 T+0 託管預扣、D0 採納核銷、7 日猶豫期到每月 5 號合併定期撥款。',
      badge: '時間軸',
    },
    {
      id: 'fin_4',
      num: '四',
      title: '解答者應收帳款介面規範與異議分流',
      summary: '獲得懸賞點數、平台應撥款與累計撥款三欄位設計，並以 7 日猶豫期為分水嶺之異議處理。',
      badge: '帳款與異議',
    },
    {
      id: 'fin_5',
      num: '五',
      title: '事後查核與追回機制',
      summary: '暫停申覆、批次扣抵、無足額催告與 30 日追回除斥期間之風控規範。',
      badge: '風控查核',
    },
  ];

  // 其他說明章節
  const OTHER_CHAPTERS = [
    {
      id: 'other_4',
      num: '一',
      title: '平台用戶與社群規範',
      summary: '企業機構、提問者、平台管理、解答者、認證專家與一般討論之身分定位、權能規範與各角色專屬守則。',
      badge: '用戶角色與社群',
    },
    {
      id: 'other_2',
      num: '二',
      title: '痛點免費提出與專家解鎖機制',
      summary: '提問者 NT$ 0 元免費上架痛點，專家自訂解鎖定價交付落地解法，兼顧無門檻與合理收益。',
      badge: '痛點機制',
    },
    {
      id: 'other_1',
      num: '三',
      title: '五級問題分級體系（L0 ~ L4）',
      summary: '由 L0 免費閒聊激盪到 L4 深度商業顧問方案之各級定位與懸賞建議範圍。',
      badge: '問題分級',
    },
    {
      id: 'other_3',
      num: '四',
      title: '會員訂閱方案與服務費減免',
      summary: '達人方案（5% 半價）、權威方案（0% 免服務費）與大師方案（最高實收 102%）。',
      badge: '會員權益',
    },
    {
      id: 'other_5',
      num: '五',
      title: 'AI 功能介紹與智慧賦能',
      summary: 'AI 題目自動標籤與建議、AI 專家智慧媒合推播、AI-CRM 客戶作戰藍圖、AI 爭議調解報告與商業企劃書生成。',
      badge: 'AI 智慧功能',
    },
  ];

  const activeTerm: TermItem | undefined = selectedTermKey
    ? TERMS_DATA[selectedTermKey]
    : undefined;

  return (
    <div
      className={`w-full max-w-4xl mx-auto font-sans ${
        isModal ? 'p-2 sm:p-4' : 'py-6 px-4 sm:px-6'
      }`}
    >
      {/* 頂部極簡 Header 列 */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs mb-5 sticky top-2 z-20 overflow-hidden">
        <div className="px-4 py-3 sm:py-3.5 flex items-center justify-between">
          <button
            onClick={() => {
              if (selectedTermKey) {
                setSelectedTermKey(null);
              } else if (selectedFinanceChapterId) {
                setSelectedFinanceChapterId(null);
              } else if (selectedOtherChapterId) {
                setSelectedOtherChapterId(null);
              } else if (onBack) {
                onBack();
              }
            }}
            className="flex items-center gap-1.5 text-stone-700 hover:text-stone-950 font-bold text-xs sm:text-sm cursor-pointer transition-colors group"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-stone-500 group-hover:-translate-x-0.5 transition-transform" />
            <span>
              {selectedTermKey || selectedFinanceChapterId || selectedOtherChapterId
                ? '返回目錄'
                : '返回'}
            </span>
          </button>

          <h1 className="text-sm sm:text-base font-black text-stone-900 tracking-tight text-center">
            {selectedTermKey
              ? activeTerm?.title || '條款內容'
              : selectedFinanceChapterId
              ? '平台金流運作詳查'
              : selectedOtherChapterId
              ? '說明詳查'
              : '關於我們'}
          </h1>

          <div className="w-16 flex justify-end">
            <span className="text-[10px] font-mono text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md">
              v2.1
            </span>
          </div>
        </div>
      </div>

      {/* 若未進入任何子詳查頁，顯示乾淨分頁導覽列 (Segmented Control) */}
      {!selectedTermKey && !selectedFinanceChapterId && !selectedOtherChapterId && (
        <div className="mb-6">
          <div className="flex justify-center mb-4">
            <IdeaXLogo variant="compact" size="md" showSlogan={false} />
          </div>

          <div className="flex items-center justify-center">
            <div className="inline-flex p-1 rounded-2xl bg-stone-100 border border-stone-200 max-w-full overflow-x-auto">
              <button
                onClick={() => setActiveTab('story')}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'story'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Info className="w-4 h-4" />
                <span>IdeaX 平台理念</span>
              </button>

              <button
                onClick={() => setActiveTab('terms')}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'terms'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>條款與聲明</span>
              </button>

              <button
                onClick={() => setActiveTab('finance')}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'finance'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>平台金流運作</span>
              </button>

              <button
                onClick={() => setActiveTab('others')}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'others'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>其他說明</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. IdeaX 平台理念 (關於我們 / IdeaX 初衷與使命) */}
      {/* ========================================================================= */}
      {activeTab === 'story' && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden p-6 sm:p-8 space-y-6 animate-in fade-in duration-150">
          {/* 品牌視覺 Banner & Logo */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 border-b border-stone-100 pb-5">
            <div className="space-y-2 text-center sm:text-left flex-1">
              <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200 inline-flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>IdeaX 平台理念</span>
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 mt-1">
                關於創點子（IdeaX 平台理念與願景）
              </h2>
              <p className="text-xs sm:text-sm text-stone-600">
                一個問題，找到更多可能・全台灣最具實戰力的新型態問題解決市集
              </p>
            </div>

            {/* 合適且精緻的 IdeaX 品牌 Logo 展示 */}
            <div className="shrink-0 p-3 sm:p-3.5 bg-gradient-to-br from-amber-50/70 via-stone-50 to-stone-100/60 rounded-2xl border border-stone-200/80 flex items-center justify-center shadow-2xs">
              <IdeaXLogo variant="chuangdianzi" size="md" className="h-12 sm:h-14 w-auto object-contain" />
            </div>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-stone-700 leading-relaxed">
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
              <h3 className="font-black text-stone-900 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>我們的核心使命</span>
              </h3>
              <p>
                在傳統顧問高門檻、搜尋引擎資訊雜亂的時代，創業者與各行各業實作者每天都在面對真實又棘手的未知難題。「創點子 IdeaX」應運而生——讓每一個痛點都能自由提出，讓每一份具備實戰智慧的破局方案都能獲得應有的實質回報。
              </p>
            </div>

            {/* 三大機制 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs pt-1">
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
                <span className="font-black text-stone-900 block text-sm">💡 痛點免費提出</span>
                <p className="text-stone-500">
                  好點子不受資金門檻限制，專家在下方自訂解鎖金額，提問者與社群皆可付費取得落地解法。
                </p>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
                <span className="font-black text-stone-900 block text-sm">🎯 分級精準對接</span>
                <p className="text-stone-500">
                  從免費社群閒聊激盪到 L4 深度顧問方案，以明確的分級標準媒合最合適的解答專家。
                </p>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
                <span className="font-black text-stone-900 block text-sm">🛡️ 合規金流與信賴</span>
                <p className="text-stone-500">
                  採用兩段式閉路點數與第三方代理收付，款項安全託管，採納驗收後直匯專家帳戶。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. 條款與聲明 (乾淨列表 & 點擊閱讀) */}
      {/* ========================================================================= */}
      {activeTab === 'terms' && (
        <div className="space-y-4">
          {/* 核心名詞觀念指引：用戶 vs 會員 */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50 via-white to-amber-50/40 border border-amber-200/90 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-stone-950 font-black flex items-center justify-center shrink-0 shadow-2xs">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="text-xs sm:text-sm font-black text-amber-950">
                  條款重要名詞指引：用戶與會員之概念區別
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-950 border border-amber-300">
                權益保障須知
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-white border border-stone-200/90 space-y-1">
                <div className="flex items-center gap-1.5 font-black text-stone-900">
                  <span className="w-2 h-2 rounded-full bg-stone-500" />
                  <span>「用戶」＝ 註冊的帳號（基礎免費）</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed pl-3.5">
                  完成註冊即為平台用戶，享有全站問題瀏覽、免費提出痛點、發布懸賞、社群討論與自由接案等完整功能。<strong>完全免收月費、無定期扣款</strong>。
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-300/80 space-y-1">
                <div className="flex items-center gap-1.5 font-black text-amber-950">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>「會員」＝ 購買訂閱方案的用戶（付費特權）</span>
                </div>
                <p className="text-[11px] text-amber-900/90 leading-relaxed pl-3.5">
                  用戶自主選購定期會員方案（如達人、權威、大師方案），享有<strong>平台服務費抽成減免（實收 95%～102%）與 AI 進階工具</strong>。取消訂閱僅回歸一般用戶，帳號永久保留。
                </p>
              </div>
            </div>
          </div>

          {!selectedTermKey ? (
            /* 條款目錄清單 */
            <div className="bg-white rounded-3xl border border-stone-200 shadow-xs divide-y divide-stone-100 overflow-hidden">
              {TERMS_LIST.map((term) => {
                const Icon = term.icon;
                return (
                  <button
                    key={term.key}
                    onClick={() => setSelectedTermKey(term.key)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-stone-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-3">
                      <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800 group-hover:bg-amber-100 transition-colors shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm sm:text-base font-black text-stone-900 group-hover:text-amber-900 transition-colors">
                            {term.title}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                            {term.badge}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-1 line-clamp-1">
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
            <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden animate-in fade-in duration-150">
              <div className="p-5 sm:p-7 border-b border-stone-100 bg-stone-50/50">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-200">
                    {activeTerm?.badge}
                  </span>
                  <span className="text-xs font-mono text-stone-400">
                    v{activeTerm?.version}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-stone-900">
                  {activeTerm?.title}
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 mt-1">
                  {activeTerm?.subtitle}
                </p>

                {/* 簡明摘要 */}
                <div className="mt-3 p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 leading-relaxed font-medium">
                  {activeTerm?.summary}
                </div>
              </div>

              {/* 條款本文 */}
              <div className="p-5 sm:p-7 space-y-4 text-xs text-stone-700 leading-relaxed max-h-[600px] overflow-y-auto">
                {activeTerm?.content.map((paragraph, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1"
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
              <div className="p-4 border-t border-stone-100 bg-stone-50/50 flex justify-center">
                <button
                  onClick={() => setSelectedTermKey(null)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-colors cursor-pointer"
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
      {/* 2. 平台金流運作 (條列式目錄 + 章節詳查) */}
      {/* ========================================================================= */}
      {activeTab === 'finance' && (
        <div className="space-y-4">
          {!selectedFinanceChapterId ? (
            /* 金流運作目錄 */
            <div className="bg-white rounded-3xl border border-stone-200 shadow-xs divide-y divide-stone-100 overflow-hidden">
              {FINANCE_CHAPTERS.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setSelectedFinanceChapterId(ch.id)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-stone-50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-3">
                    <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center font-black text-xs shrink-0">
                      {ch.num}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-black text-stone-900 group-hover:text-amber-900 transition-colors">
                          {ch.title}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                          {ch.badge}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-1 line-clamp-1">
                        {ch.summary}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-stone-700 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            /* 金流章節詳查頁 */
            <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden animate-in fade-in duration-150">
              {/* 章節一 */}
              {selectedFinanceChapterId === 'fin_1' && (
                <div className="p-6 sm:p-7 space-y-5">
                  <div className="border-b border-stone-100 pb-3">
                    <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                      第一章 • 合規策略
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-stone-900 mt-1.5">
                      設計目標與非電支執照合規策略
                    </h3>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-stone-800 leading-relaxed space-y-2">
                    <p className="font-bold text-stone-900">
                      切斷使用者對使用者（P2P）直接資金移轉，以兩段獨立交易架構符合法規：
                    </p>
                    <p>
                      在無需申請電子支付機構執照門檻下，保留「懸賞預扣、即時鎖定預算、事後核算撥款」的使用體驗。
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
                      <h4 className="font-black text-stone-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>提問階段（購買預付服務點數）</span>
                      </h4>
                      <p className="text-stone-600 leading-relaxed">
                        提問者透過信用卡或 IAP 取得閉路點數，為單一目的服務對價，不可折現、不可轉讓。
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
                      <h4 className="font-black text-stone-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>撥款階段（平台應付勞務報酬）</span>
                      </h4>
                      <p className="text-stone-600 leading-relaxed">
                        採納後點數核銷消滅；平台以自有營運資金透過第三方金流電匯直接撥付解答者法定貨幣現金。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 章節二 */}
              {selectedFinanceChapterId === 'fin_2' && (
                <div className="p-6 sm:p-7 space-y-5">
                  <div className="border-b border-stone-100 pb-3">
                    <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                      第二章 • 資金流向
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-stone-900 mt-1.5">
                      點數與收益架構
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                      <span className="font-mono text-[10px] text-amber-700 font-bold block">
                        步驟 1 • 提問付現買點
                      </span>
                      <h5 className="font-black text-stone-900">閉路點數預扣</h5>
                      <p className="text-stone-600 leading-relaxed">
                        提問者付現取得平台閉路點數，發布懸賞時系統預扣點數鎖定預算。
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-300 space-y-1.5">
                      <span className="font-mono text-[10px] text-rose-700 font-bold block">
                        分界點 • 採納即核銷
                      </span>
                      <h5 className="font-black text-stone-900">點數核銷 ➔ 應付帳款</h5>
                      <p className="text-stone-600 leading-relaxed">
                        採納當下點數全數核銷消滅，轉化為平台對解答者之應付服務報酬。未採納點數原路退回。
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                      <span className="font-mono text-[10px] text-emerald-700 font-bold block">
                        步驟 2 • 解答領現金
                      </span>
                      <h5 className="font-black text-stone-900">平台自有資金撥款</h5>
                      <p className="text-stone-600 leading-relaxed">
                        經猶豫期核算後，由平台自有營運帳戶以銀行轉帳批次撥付解答者法定貨幣現金。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 章節三 */}
              {selectedFinanceChapterId === 'fin_3' && (
                <div className="p-6 sm:p-7 space-y-5">
                  <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                        第三章 • 時間軸
                      </span>
                      <h3 className="text-lg sm:text-xl font-black text-stone-900 mt-1.5">
                        懸賞生命週期與撥款時間軸
                      </h3>
                    </div>
                    <span className="text-xs font-mono font-bold text-stone-500">
                      ≤ D0+21 日入帳
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
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
                            ? 'border-amber-500 bg-amber-50 font-bold'
                            : 'border-stone-200 bg-stone-50/50'
                        }`}
                      >
                        <span className="text-[10px] text-stone-400 block font-mono">
                          階段 {item.step}
                        </span>
                        <span className="text-stone-900 block mt-0.5">{item.title}</span>
                        <span className="text-[10px] text-amber-800 font-mono block mt-1">
                          {item.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 章節四 */}
              {selectedFinanceChapterId === 'fin_4' && (
                <div className="p-6 sm:p-7 space-y-5">
                  <div className="border-b border-stone-100 pb-3">
                    <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                      第四章 • 帳款與異議
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-stone-900 mt-1.5">
                      解答者應收帳款介面規範與異議分流
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                      <span className="font-bold text-stone-900 block">1. 獲得懸賞點數</span>
                      <p className="text-stone-500">
                        各筆採納獲得之點數統計，純為平台計分與榮譽參考，非可提領資產。
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1">
                      <span className="font-bold text-amber-950 block">2. 平台應撥款</span>
                      <p className="text-stone-600">
                        已核算之應付服務報酬帳款，排程於每月 5 號合併定期撥出。
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                      <span className="font-bold text-stone-900 block">3. 累計撥款</span>
                      <p className="text-stone-500">
                        歷史已實際撥付之金額報表，解答者在平台無儲值帳戶。
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl border border-stone-200 bg-white space-y-1">
                      <span className="font-bold text-stone-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>猶豫期內（D0 ~ D0+7）</span>
                      </span>
                      <p className="text-stone-600">
                        若異議成立直接自「平台應撥款」欄位扣除，不涉及事後追回程序。
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-stone-200 bg-white space-y-1">
                      <span className="font-bold text-stone-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>猶豫期外（已核算撥出）</span>
                      </span>
                      <p className="text-stone-600">
                        查核屬實者自解答者下一次批次撥款中扣抵，無款項則依催告程序處理。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 章節五 */}
              {selectedFinanceChapterId === 'fin_5' && (
                <div className="p-6 sm:p-7 space-y-5">
                  <div className="border-b border-stone-100 pb-3">
                    <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                      第五章 • 風控查核
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-stone-900 mt-1.5">
                      事後查核與追回機制
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                      <span className="font-bold text-stone-900 block">1. 暫停與 7 日申覆</span>
                      <p className="text-stone-500">
                        接獲檢舉或異常時先暫停撥款，通知解答者於 7 日內提出申覆說明。
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                      <span className="font-bold text-stone-900 block">2. 批次扣抵機制</span>
                      <p className="text-stone-500">
                        查核屬實者自後續應撥款批次抵扣，不成立則立即恢復撥款排程。
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                      <span className="font-bold text-stone-900 block">3. 14 日書面催告</span>
                      <p className="text-stone-500">
                        若解答者無足額款項供扣抵，平台以書面通知於 14 日內返還。
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                      <span className="font-bold text-stone-900 block">4. 30 日除斥期間</span>
                      <p className="text-stone-500">
                        平台追回權利以原定撥款日起算 30 日內為限，逾期不得再行追回。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 底部返回按鈕 */}
              <div className="p-4 border-t border-stone-100 bg-stone-50/50 flex justify-center">
                <button
                  onClick={() => setSelectedFinanceChapterId(null)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-colors cursor-pointer"
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
      {/* 3. 其他說明 (條列式目錄 + 章節詳查) */}
      {/* ========================================================================= */}
      {activeTab === 'others' && (
        <div className="space-y-4">
          {!selectedOtherChapterId ? (
            /* 其他說明目錄 */
            <div className="bg-white rounded-3xl border border-stone-200 shadow-xs divide-y divide-stone-100 overflow-hidden">
              {OTHER_CHAPTERS.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setSelectedOtherChapterId(ch.id)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-stone-50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-3">
                    <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center font-black text-xs shrink-0">
                      {ch.num}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-black text-stone-900 group-hover:text-amber-900 transition-colors">
                          {ch.title}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                          {ch.badge}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-1 line-clamp-1">
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
            <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden animate-in fade-in duration-150">
              {/* 其他說明 1: 五級問題分級體系 */}
              {selectedOtherChapterId === 'other_1' && (
                <div className="p-6 sm:p-7 space-y-4">
                  <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                        說明一 • 問題分級
                      </span>
                      <h3 className="text-lg sm:text-xl font-black text-stone-900 mt-1.5">
                        五級問題分級體系（L0 ~ L4）
                      </h3>
                    </div>
                    <span className="text-xs text-stone-500">痛點免費提出 • 懸賞自訂</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs">
                    {(['L0', 'L1', 'L2', 'L3', 'L4'] as ProblemLevel[]).map((lvl) => {
                      const cfg = LEVEL_CONFIGS[lvl];
                      return (
                        <div
                          key={lvl}
                          className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-black text-stone-900">{lvl}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.badgeClass}`}>
                              {cfg.name}
                            </span>
                          </div>
                          <div className="font-mono text-amber-800 font-bold text-[11px]">
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

              {/* 其他說明 2: 痛點免費提出與專家解鎖 */}
              {selectedOtherChapterId === 'other_2' && (
                <div className="p-6 sm:p-7 space-y-4">
                  <div className="border-b border-stone-100 pb-3">
                    <span className="text-xs font-bold text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200">
                      說明二 • 痛點機制
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-stone-900 mt-1.5">
                      痛點免費提出與專家解鎖機制
                    </h3>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">
                    在 IdeaX 上，<strong>提問者可 NT$ 0 元免費上架生活與產業痛點</strong>，無預扣款項；各領域專家在下方提交專屬落地解法，並<strong>自訂解鎖金額</strong>，提問者或社群付費解鎖查閱完整方案。
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                      <span className="font-black text-stone-900 block">1. 痛點 0 元提出</span>
                      <p className="text-stone-500">零門檻快速提出瓶頸難題，吸引多方專家關注。</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                      <span className="font-black text-stone-900 block">2. 專家自訂解鎖價</span>
                      <p className="text-stone-500">針對痛點提出深度方案，自訂合理定價解鎖。</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                      <span className="font-black text-stone-900 block">3. 批次安全撥款</span>
                      <p className="text-stone-500">買方付費解鎖後，平台扣除服務費後批次撥入專家帳戶。</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 其他說明 3: 會員方案費率 */}
              {selectedOtherChapterId === 'other_3' && (
                <div className="p-6 sm:p-7 space-y-4">
                  <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                        說明三 • 會員方案
                      </span>
                      <h3 className="text-lg sm:text-xl font-black text-stone-900 mt-1.5">
                        會員訂閱方案與服務費減免
                      </h3>
                    </div>
                    <span className="text-xs text-amber-900 font-bold">最高實收 102%</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-stone-900 text-sm">達人方案</span>
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                          半價 5%
                        </span>
                      </div>
                      <p className="font-mono font-bold text-stone-900">半年 $1,499</p>
                      <p className="text-stone-500">抽取 5% 服務費，實收 95%。</p>
                    </div>

                    <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-stone-900 text-sm">權威方案</span>
                        <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                          免服務費 0%
                        </span>
                      </div>
                      <p className="font-mono font-bold text-stone-900">$1,490/月</p>
                      <p className="text-stone-500">免服務費，100% 全額入帳。</p>
                    </div>

                    <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-amber-950 text-sm">大師方案</span>
                        <span className="text-[10px] font-black bg-amber-500 text-stone-950 px-2 py-0.5 rounded-full">
                          實收 102%
                        </span>
                      </div>
                      <p className="font-mono font-bold text-stone-900">$3,990/月</p>
                      <p className="text-stone-600">免服務費 ＋ 平台額外補貼 2% BONUS。</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 其他說明 4: 平台用戶角色與社群 */}
              {selectedOtherChapterId === 'other_4' && (
                <div className="p-6 sm:p-7">
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

              {/* 其他說明 5: AI 功能介紹與智慧賦能 */}
              {selectedOtherChapterId === 'other_5' && (
                <div className="p-6 sm:p-7 space-y-4 bg-purple-50/40">
                  <div className="border-b border-purple-100 pb-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-purple-900 bg-purple-100 px-2.5 py-0.5 rounded-md border border-purple-200">
                        說明五 • AI 智慧功能
                      </span>
                      <h3 className="text-lg sm:text-xl font-black text-stone-900 mt-1.5 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        <span>AI 智慧引擎賦能與高效溝通工具</span>
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">
                    IdeaX 整合最前沿 AI 語意與專家大語言模型，全面賦能提問者、解答者與平台營運管理：
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 bg-white rounded-xl border border-purple-200 space-y-1">
                      <span className="font-extrabold text-purple-900 block">1. AI 題目自動標籤與建議</span>
                      <p className="text-stone-500">自動分析痛點語意，生成 Hashtag 與推薦懸賞級別。</p>
                    </div>

                    <div className="p-3.5 bg-white rounded-xl border border-purple-200 space-y-1">
                      <span className="font-extrabold text-purple-900 block">2. AI 專家智慧媒合推播</span>
                      <p className="text-stone-500">主動將高適配度問題推播給專屬專家。</p>
                    </div>

                    <div className="p-3.5 bg-white rounded-xl border border-purple-200 space-y-1">
                      <span className="font-extrabold text-purple-900 block">3. AI-CRM 客戶作戰藍圖</span>
                      <p className="text-stone-500">為專家拆解潛在客戶痛點與 3 階段促成策略。</p>
                    </div>

                    <div className="p-3.5 bg-white rounded-xl border border-purple-200 space-y-1">
                      <span className="font-extrabold text-purple-900 block">4. AI 智慧爭議調解報告</span>
                      <p className="text-stone-500">調閱對話與交付紀錄，生成中立調解報告與和解協議。</p>
                    </div>

                    <div className="p-3.5 bg-white rounded-xl border border-purple-200 space-y-1">
                      <span className="font-extrabold text-purple-900 block">5. AI 商業企劃與合規生成</span>
                      <p className="text-stone-500">一鍵產出正規商業企劃書、電子協議與進度試算。</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
