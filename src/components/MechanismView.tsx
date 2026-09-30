import React, { useState } from 'react';
import { LEVEL_CONFIGS } from '../data/mockData';
import { ProblemLevel } from '../types';
import { IdeaXLogo } from './IdeaXLogo';
import { PlatformRolesSpectrumView } from './PlatformRolesSpectrumView';
import { TERMS_DATA, TermItem, CURRENT_TERMS_VERSION } from '../data/termsData';
import {
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Scale,
  CreditCard,
  FileText,
  ChevronRight,
  ArrowLeft,
  Flame,
  Award,
  AlertCircle,
  Clock,
  Lock,
  ChevronDown,
  Check,
  AlertTriangle,
  Send,
  HelpCircle,
  BookOpen,
  UserCheck,
  Building2,
  Settings2,
  Users,
  Info,
  MessageSquare,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';

type MechanismTab = 'architecture' | 'contract' | 'tiers';
type ContractSubTab =
  | 'general_terms'
  | 'questioner_terms'
  | 'solver_terms'
  | 'recharge_subscription_terms'
  | 'copyright_policy'
  | 'disclaimer'
  | 'privacy_policy'
  | 'anti_fraud_aml_policy'
  | 'refund_dispute_policy'
  | 'community_guidelines'
  | 'about_ideax';

export const MechanismView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MechanismTab>('architecture');
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedOtherChapterId, setSelectedOtherChapterId] = useState<string | null>(null);
  const [activeTimelineStep, setActiveTimelineStep] = useState<number>(3); // 預設 D0 採納與核銷
  const [activeContractSubTab, setActiveContractSubTab] =
    useState<ContractSubTab>('general_terms');

  // 章節定義列表（平台金流運作條列式頁）
  const CHAPTERS = [
    {
      id: 'ch_1',
      num: '一',
      title: '設計目標與非電支執照合規策略',
      summary:
        '在不需要申請電子支付機構執照門檻的前提下，完整保留「懸賞預扣、即時鎖定預算、事後核算撥款」的最佳產品體驗，將資金流拆成兩段互不相通的獨立交易。',
      badge: '合規策略',
    },
    {
      id: 'ch_2',
      num: '二',
      title: '點數與收益架構',
      summary:
        '提問者付現取得閉路點數、採納時點數核銷轉化為平台對解答者之應付服務報酬，以及最終由平台自有資金撥付解答者之完整流程與點數隔離說明。',
      badge: '核心資金架構',
    },
    {
      id: 'ch_3',
      num: '三',
      title: '懸賞生命週期與撥款時間軸（最長不超過 D0+21 日）',
      summary:
        '從發布懸賞預扣點數、提交解答、D0採納核銷、7日猶豫期、核算緩衝到每週批次撥款實際入帳之完整 8 步驟時間軸與規則。',
      badge: '生命週期與時間軸',
    },
    {
      id: 'ch_4',
      num: '四',
      title: '解答者應收帳款介面規範與異議分流',
      summary:
        '解答者個人中心「獲得懸賞點數、平台應撥款、累計撥款」三欄位設計規範，以及以 7 日猶豫期為分水嶺之異議分流處理機制。',
      badge: '帳款介面與異議',
    },
    {
      id: 'ch_5',
      num: '五',
      title: '事後查核與追回機制（猶豫期外適用）',
      summary:
        '暫停通知申覆、批次扣抵、無足額款項書面催告、30 日追回除斥期間與全天候在途餘額合規監控。',
      badge: '查核與風控',
    },
  ];

  // 章節定義列表（其他說明條列式目錄）
  const OTHER_CHAPTERS = [
    {
      id: 'ch_other_4',
      num: '一',
      title: '平台用戶與社群規範',
      summary:
        '企業機構、提問者、平台管理、解答者、認證專家與一般討論之身分定位、權能規範與各角色專屬守則。',
      badge: '用戶角色與社群',
    },
    {
      id: 'ch_other_2',
      num: '二',
      title: '痛點免費提出與專家解鎖機制',
      summary:
        '提問者可 NT$ 0 元免費上架生活與產業痛點，各界認證專家針對痛點自訂金額提供落地解法，兼顧無門檻發問與專家合理收益。',
      badge: '痛點與解鎖',
    },
    {
      id: 'ch_other_1',
      num: '三',
      title: '五級問題分級體系（L0 ~ L4）',
      summary:
        '從 L0 免費閒聊經驗分享、L1 小問題輕量破局，到 L4 企業級深度顧問方案之五級題型規格與懸賞金額範圍。',
      badge: '問題分級體系',
    },
    {
      id: 'ch_other_3',
      num: '四',
      title: '會員訂閱方案與服務費減免（最高實收 102%）',
      summary:
        '達人方案、權威方案與大師方案之服務費減免優惠，解答者享免服務費甚至額外 2% 平台補貼回饋。',
      badge: '會員與費率',
    },
    {
      id: 'ch_other_5',
      num: '五',
      title: 'AI 功能介紹與智慧賦能',
      summary:
        'AI 題目自動標籤與建議、AI 專家智慧媒合推播、AI-CRM 客戶作戰藍圖、AI 爭議調解報告與商業企劃書生成。',
      badge: 'AI 智慧功能',
    },
  ];

  // 條款與聲明分類定案列表（依邏輯層級排序）
  const CONTRACT_SUB_TABS: { id: ContractSubTab; label: string; icon: any }[] = [
    { id: 'general_terms', label: '一般條款', icon: FileText },
    { id: 'questioner_terms', label: '提問者條款', icon: Scale },
    { id: 'solver_terms', label: '解答者條款', icon: Award },
    { id: 'recharge_subscription_terms', label: '儲值與訂閱條款', icon: CreditCard },
    { id: 'community_guidelines', label: '［社群守則］', icon: MessageSquare },
    { id: 'copyright_policy', label: '著作權政策', icon: ShieldCheck },
    { id: 'refund_dispute_policy', label: '退款與爭議調解', icon: RotateCcw },
    { id: 'anti_fraud_aml_policy', label: '反詐騙與洗錢防制', icon: ShieldAlert },
    { id: 'privacy_policy', label: '隱私權聲明', icon: ShieldCheck },
    { id: 'disclaimer', label: '免責聲明', icon: AlertCircle },
    { id: 'about_ideax', label: '關於我們', icon: Info },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="flex justify-center mb-1">
          <IdeaXLogo variant="compact" size="lg" showSlogan={true} />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200">
          <Scale className="w-4 h-4 text-amber-600" />
          <span>平台金流運作・條款與聲明・其他說明</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          創點子 IdeaX 平台運作機制與合規條款
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 max-w-2xl mx-auto leading-relaxed">
          採用「閉路點數與代理收付」兩段式合規架構，徹底切斷使用者間資金移轉，保障提問者與解答者雙方信賴；條款公開透明，貫徹智慧財產與價金安全。
        </p>

        {/* Tab Switcher */}
        <div className="flex items-center justify-center gap-2 pt-3">
          <div className="inline-flex p-1 rounded-2xl bg-stone-100 border border-stone-200">
            <button
              onClick={() => {
                setActiveTab('architecture');
                setSelectedChapterId(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'architecture'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>平台金流運作</span>
            </button>

            <button
              onClick={() => setActiveTab('contract')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'contract'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>條款與聲明</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('tiers');
                setSelectedOtherChapterId(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'tiers'
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

      {/* ========================================================================= */}
      {/* TAB 1: 平台金流運作 (條列式章節列表 + 章節分頁詳查) */}
      {/* ========================================================================= */}
      {activeTab === 'architecture' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {selectedChapterId === null ? (
            /* 章節條列式首頁 */
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-600" />
                  <h2 className="text-xl font-black text-stone-900">
                    平台金流運作 — 章節總覽
                  </h2>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  點擊下方任一章節卡片，即可進入該章節詳查完整的架構說明、資金流程圖、時間軸及合規標準。
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {CHAPTERS.map((ch) => (
                  <div
                    key={ch.id}
                    onClick={() => setSelectedChapterId(ch.id)}
                    className="p-5 sm:p-6 rounded-3xl bg-white border border-stone-200 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center font-black text-xs shrink-0">
                          {ch.num}
                        </span>
                        <h3 className="text-base sm:text-lg font-black text-stone-900 group-hover:text-amber-800 transition-colors">
                          {ch.title}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 hidden sm:inline-block">
                          {ch.badge}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 leading-relaxed pl-0 sm:pl-10">
                        {ch.summary}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5 text-xs font-extrabold text-amber-800 group-hover:translate-x-1 transition-transform self-end sm:self-center bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-200">
                      <span>詳查內容</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* 章節分頁詳查頁面 */
            <div className="space-y-6">
              {/* Back Button Header */}
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
                <button
                  onClick={() => setSelectedChapterId(null)}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>返回平台金流運作章節列表</span>
                </button>
                <span className="text-xs font-bold text-amber-900 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  {CHAPTERS.find((c) => c.id === selectedChapterId)?.badge}
                </span>
              </div>

              {/* CHAPTER 1 DETAIL */}
              {selectedChapterId === 'ch_1' && (
                <div className="p-6 sm:p-8 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-6 animate-in fade-in">
                  <div className="flex items-center gap-2.5 border-b border-stone-100 pb-4">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center font-black text-sm">
                      一
                    </div>
                    <h2 className="text-xl font-black text-stone-900">
                      設計目標與非電支執照合規策略
                    </h2>
                  </div>

                  <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs sm:text-sm text-stone-800 leading-relaxed space-y-3">
                    <p className="font-semibold text-stone-900">
                      <strong>核心策略：</strong>在不需要申請電子支付機構執照（最低資本額 5 億元門檻）的前提下，完整保留<strong>「發布保留點數、即時鎖定預算、驗收核算安全撥付」</strong>的最佳產品體驗。
                    </p>
                    <p className="text-amber-950 font-bold bg-white/80 p-3 rounded-xl border border-amber-200">
                      關鍵做法：<strong>把資金流拆成兩段互不相通的獨立交易，徹底切斷與避免出現「使用者對使用者（P2P）」的直接資金移轉。</strong>
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                      <h4 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>提問階段（閉路服務對價）</span>
                      </h4>
                      <p className="text-stone-600 leading-relaxed">
                        提問者購買點數為單一目的使用權憑證，點數不可提現、不可轉讓給其他使用者，屬於「預付服務點數」對價。
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                      <h4 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>撥款階段（代理收付與服務報酬）</span>
                      </h4>
                      <p className="text-stone-600 leading-relaxed">
                        提問採納後點數消滅；平台對解答者產生獨立之應付服務報酬帳款，透過第三方金流於試審期後以銀行轉帳發放現金。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* CHAPTER 2 DETAIL */}
              {selectedChapterId === 'ch_2' && (
                <div className="p-6 sm:p-8 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-6 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center font-black text-sm">
                        二
                      </div>
                      <h2 className="text-xl font-black text-stone-900">
                        點數與收益架構
                      </h2>
                    </div>
                    <span className="text-xs font-bold text-rose-800 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                      ⚠️ 採納時點為資金定性轉換分界點
                    </span>
                  </div>

                  {/* Visual Process Flow */}
                  <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* 階段 1 */}
                      <div className="p-4 rounded-2xl bg-white border border-amber-300 shadow-xs space-y-2 relative">
                        <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                          ① 提問者階段（付現金買點數）
                        </span>
                        <h4 className="font-extrabold text-sm text-stone-900">付現取得閉路點數</h4>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          提問者透過 Apple/Google IAP 或藍新/綠界刷卡，取得<strong>單一目的、閉路、不可轉讓、不可提現</strong>的平台點數。
                        </p>
                        <div className="pt-1 text-[11px] font-bold text-amber-900 flex items-center gap-1">
                          <span>發布懸賞：系統保留指定點數</span>
                        </div>
                      </div>

                      {/* 分流點 */}
                      <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-50 to-rose-50 border-2 border-rose-300 shadow-xs space-y-2 relative">
                        <span className="text-[10px] font-black text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md">
                          分界點：採納解答即核銷
                        </span>
                        <h4 className="font-extrabold text-sm text-stone-900">點數核銷 ➔ 應付報酬</h4>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          提問者採納那一刻，<strong>提問者的點數消耗到此為止</strong>！之後平台欠解答者的，是<strong>平台對解答者的服務報酬應付帳款</strong>。
                        </p>
                        <div className="p-1.5 rounded-lg bg-rose-100/80 text-[10px] text-rose-900 font-bold">
                          * 未被採納/逾期：保留點數全額退回提問者帳戶
                        </div>
                      </div>

                      {/* 階段 2 */}
                      <div className="p-4 rounded-2xl bg-white border border-emerald-300 shadow-xs space-y-2 relative">
                        <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                          ② 解答者階段（收到現金）
                        </span>
                        <h4 className="font-extrabold text-sm text-stone-900">平台自有資金撥款</h4>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          經 7 日猶豫期與核算覆核後，由<strong>平台自有營運帳戶以銀行轉帳</strong>批次撥給解答者，解答者收到法定貨幣現金。
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-stone-200 text-xs text-stone-700 leading-relaxed">
                      <span className="font-black text-stone-900">💡 關鍵點數與收益隔離說明：</span>
                      提問者的「點數」在被採納那一刻即消耗殆盡。解答者收到的是平台依據實質委託結果撥出的<strong>自有現金</strong>，不持有亦不兌現點數，徹底隔離 P2P 直接資金移轉。
                    </div>
                  </div>
                </div>
              )}

              {/* CHAPTER 3 DETAIL */}
              {selectedChapterId === 'ch_3' && (
                <div className="p-6 sm:p-8 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-6 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center font-black text-sm">
                        三
                      </div>
                      <h2 className="text-xl font-black text-stone-900">
                        懸賞生命週期與撥款時間軸（最長不超過 D0+21 日）
                      </h2>
                    </div>
                    <span className="text-xs font-mono font-bold text-stone-500">
                      日曆日計算 • 銀行營業日撥款
                    </span>
                  </div>

                  {/* Timeline Steps Interactive */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-center text-xs">
                    {[
                      { step: 1, title: '發布懸賞', time: 'T+0', desc: '保留點數' },
                      { step: 2, title: '提交解答', time: 'T+n', desc: '專家提交' },
                      { step: 3, title: '採納解答', time: 'D0 採納日', desc: '點數核銷★', highlight: true },
                      { step: 4, title: '猶豫期', time: 'D0 ~ D0+7', desc: '提問者異議' },
                      { step: 5, title: '核算緩衝', time: 'D0+7 ~ +9', desc: '內部覆核' },
                      { step: 6, title: '可撥款', time: 'D0+9 起', desc: '入排程' },
                      { step: 7, title: '批次撥款', time: '每週一', desc: '遇假日順延' },
                      { step: 8, title: '實際入帳', time: '≤ D0+21日', desc: '轉入解答者銀行', highlight: true },
                    ].map((item) => (
                      <div
                        key={item.step}
                        onClick={() => setActiveTimelineStep(item.step)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          activeTimelineStep === item.step
                            ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-300/40 shadow-xs'
                            : item.highlight
                            ? 'border-amber-300 bg-white'
                            : 'border-stone-200 bg-stone-50/70 hover:bg-white'
                        }`}
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono font-bold text-stone-400 block">
                            步驟 {item.step}
                          </span>
                          <span className="font-extrabold text-stone-900 block">{item.title}</span>
                        </div>
                        <div className="pt-2">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white border border-stone-200 text-amber-900 block mb-1">
                            {item.time}
                          </span>
                          <span className="text-[11px] text-stone-500 block">{item.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600 leading-relaxed">
                    <strong>未被採納 / 逾期未處理之懸賞：</strong>系統保留之點數於期限屆滿後自動全額退回提問者帳戶，不進入撥款核算流程。提問者可無損重新利用點數發問。
                  </div>
                </div>
              )}

              {/* CHAPTER 4 DETAIL */}
              {selectedChapterId === 'ch_4' && (
                <div className="p-6 sm:p-8 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-6 animate-in fade-in">
                  <div className="flex items-center gap-2.5 border-b border-stone-100 pb-4">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center font-black text-sm">
                      四
                    </div>
                    <h2 className="text-xl font-black text-stone-900">
                      解答者應收帳款介面規範與異議分流
                    </h2>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-xs text-stone-900">
                      解答者個人中心三欄位設計（嚴格消除「餘額」「可用額度」等敏感字眼）：
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                        <span className="font-mono text-[10px] text-stone-400 block">欄位 1</span>
                        <h5 className="font-black text-stone-900 text-sm">獲得懸賞點數</h5>
                        <p className="text-stone-500 leading-relaxed">
                          各筆懸賞被採納後顯示解答者「賺取」的點數。<strong>僅為計分／榮譽參考顯示，不是解答者持有的可提領資產</strong>。
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                        <span className="font-mono text-[10px] text-amber-600 block">欄位 2</span>
                        <h5 className="font-black text-amber-950 text-sm">平台應撥款</h5>
                        <p className="text-stone-600 leading-relaxed">
                          已核算、尚未撥出的應付服務報酬。性質為平台對解答者的應付帳款，排程於每週批次撥出。
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                        <span className="font-mono text-[10px] text-emerald-600 block">欄位 3</span>
                        <h5 className="font-black text-emerald-950 text-sm">累計撥款（歷史撥款統計）</h5>
                        <p className="text-stone-600 leading-relaxed">
                          已實際撥款完成的金額統計報表。純歷史報表性質，確保解答者在平台內無任何儲值帳戶。
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-bold text-xs text-stone-900">
                      異議分流處理機制（以 7 日猶豫期為分水嶺）
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                      <div className="p-4 rounded-2xl bg-white border border-stone-300 space-y-2">
                        <span className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          <span>猶豫期內（採納日起 7 日內）</span>
                        </span>
                        <p className="text-stone-600 leading-relaxed">
                          款項尚未進入「可撥款」狀態。若提問者異議成立，<strong>直接自「平台應撥款」欄位扣除／取消該筆</strong>，不涉及事後追回程序。
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-stone-300 space-y-2">
                        <span className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>猶豫期外（已進入可撥款或已撥款）</span>
                        </span>
                        <p className="text-stone-600 leading-relaxed">
                          款項已核算或已撥出。經查核屬實者，<strong>自解答者下一次應撥款批次中扣抵</strong>；若無後續款項則另行依催告程序處理。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CHAPTER 5 DETAIL */}
              {selectedChapterId === 'ch_5' && (
                <div className="p-6 sm:p-8 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-6 animate-in fade-in">
                  <div className="flex items-center gap-2.5 border-b border-stone-100 pb-4">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center font-black text-sm">
                      五
                    </div>
                    <h2 className="text-xl font-black text-stone-900">
                      事後查核與追回機制（猶豫期外適用）
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                      <span className="font-bold text-stone-900 block">1. 暫停與通知申覆（7日內）</span>
                      <span className="text-stone-500">
                        接獲檢舉或異常時先暫停撥款或標記待扣抵，通知解答者於 7 日內提出說明。
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                      <span className="font-bold text-stone-900 block">2. 查核扣抵或撤銷標記</span>
                      <span className="text-stone-500">
                        查核屬實自下次批次扣抵；查核不成立立即恢復原撥款排程。
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                      <span className="font-bold text-stone-900 block">3. 無足額款項書面催告（14日內）</span>
                      <span className="text-stone-500">
                        若解答者後續無足額款項供扣抵，平台以書面通知解答者於 14 日內另行返還。
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                      <span className="font-bold text-stone-900 block">4. 追回除斥期間（30日為限）</span>
                      <span className="text-stone-500">
                        平台行使追回權利，以原定撥款日起算 30 日內為限，逾期不得再行追回。
                      </span>
                    </div>
                  </div>

                  {/* 日均餘額監控 */}
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>合規風控與日均餘額監控：</strong>
                      平台設置內部日均在途餘額警戒線（新臺幣 15 億元），遠低於法定 20 億元免牌照豁免門檻；確保營運百分之百合法合規。
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Return Button */}
              <div className="pt-2 flex justify-center">
                <button
                  onClick={() => setSelectedChapterId(null)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-colors shadow-xs cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>返回平台金流運作章節列表</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 條款與聲明 (採分頁制包含一般條款、提問者條款、解答者條款、免責聲明、隱私權聲明、關於我們) */}
      {/* ========================================================================= */}
      {activeTab === 'contract' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-6">
            <div className="border-b border-stone-200 pb-4">
              <h2 className="text-xl sm:text-2xl font-black text-stone-900">
                條款與聲明
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                版本號：2026-v3.0（AI-CRM 專屬巡航與智能溝通升級版） • 最近更新日：2026 年 10 月
              </p>
            </div>

            {/* Sub-tabs Nav */}
            <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-3">
              {CONTRACT_SUB_TABS.map((sub) => {
                const IconComponent = sub.icon;
                const isActive = activeContractSubTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setActiveContractSubTab(sub.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-stone-950 shadow-2xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{sub.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Content for the Selected Sub-tab */}
            {(() => {
              const item: TermItem | undefined = TERMS_DATA[activeContractSubTab];
              if (!item) return null;

              return (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between gap-2 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                        {item.badge}
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-stone-900 mt-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-stone-500 mt-0.5">{item.subtitle}</p>
                    </div>
                    <span className="text-[11px] font-mono text-stone-400 shrink-0">
                      v{item.version}
                    </span>
                  </div>

                  {/* Summary Box */}
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 leading-relaxed font-medium">
                    <strong>摘要說明：</strong> {item.summary}
                  </div>

                  {/* Detailed Clauses List */}
                  <div className="p-5 rounded-2xl bg-stone-50/80 border border-stone-200 space-y-4 text-xs text-stone-700 leading-relaxed max-h-[600px] overflow-y-auto">
                    {item.content.map((paragraph, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1"
                      >
                        {paragraph.split('\n').map((line, lIdx) => (
                          <p
                            key={lIdx}
                            className={
                              lIdx === 0
                                ? 'font-bold text-stone-900 text-xs mb-1'
                                : 'text-stone-600'
                            }
                          >
                            {line}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: 其他說明 (條列式目錄 + 章節分頁詳查) */}
      {/* ========================================================================= */}
      {activeTab === 'tiers' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {selectedOtherChapterId === null ? (
            /* 其他說明 — 條列式目錄頁 */
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-600" />
                  <h2 className="text-xl font-black text-stone-900">
                    其他說明 — 目錄總覽
                  </h2>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  點擊下方任一主題，即可進入詳查五級問題分級體系、痛點免費提出與專家解鎖機制，以及最新會員方案費率對照。
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {OTHER_CHAPTERS.map((ch) => (
                  <div
                    key={ch.id}
                    onClick={() => setSelectedOtherChapterId(ch.id)}
                    className="p-5 sm:p-6 rounded-3xl bg-white border border-stone-200 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center font-black text-xs shrink-0">
                          {ch.num}
                        </span>
                        <h3 className="text-base sm:text-lg font-black text-stone-900 group-hover:text-amber-800 transition-colors">
                          {ch.title}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 hidden sm:inline-block">
                          {ch.badge}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 leading-relaxed pl-0 sm:pl-10">
                        {ch.summary}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5 text-xs font-extrabold text-amber-800 group-hover:translate-x-1 transition-transform self-end sm:self-center bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-200">
                      <span>詳查內容</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* 其他說明 — 章節分頁詳查頁面 */
            <div className="space-y-6">
              {/* Back Button Header */}
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
                <button
                  onClick={() => setSelectedOtherChapterId(null)}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>返回其他說明目錄列表</span>
                </button>
                <span className="text-xs font-bold text-amber-900 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  {OTHER_CHAPTERS.find((c) => c.id === selectedOtherChapterId)?.badge}
                </span>
              </div>

              {/* OTHER CHAPTER 1: 五級問題分級體系 */}
              {selectedOtherChapterId === 'ch_other_1' && (
                <div className="p-6 sm:p-8 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-6 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center font-black text-sm">
                        一
                      </div>
                      <h2 className="text-xl font-black text-stone-900">
                        五級問題分級體系（L0 ~ L4）
                      </h2>
                    </div>
                    <span className="text-xs text-amber-800 font-bold bg-amber-50 px-3 py-1 rounded-full border border-amber-200 hidden sm:inline-block">
                      痛點免費提出 • 懸賞越高吸引高階顧問
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                    {(['L0', 'L1', 'L2', 'L3', 'L4'] as ProblemLevel[]).map((lvl) => {
                      const cfg = LEVEL_CONFIGS[lvl];
                      return (
                        <div
                          key={lvl}
                          className={`p-4 rounded-2xl border transition-all space-y-2.5 flex flex-col justify-between ${
                            lvl === 'L4'
                              ? 'bg-gradient-to-b from-amber-50/80 to-white border-amber-300 ring-2 ring-amber-300/30'
                              : 'bg-white border-stone-200 hover:border-amber-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-black text-lg text-stone-900">{lvl}</span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${cfg.badgeClass}`}
                              >
                                {cfg.name}
                              </span>
                            </div>
                            <div className="text-xs font-black text-amber-800 font-mono bg-amber-50/90 px-2 py-1 rounded-lg border border-amber-200 mb-2">
                              {cfg.rangeText}
                            </div>
                            <p className="text-xs text-stone-600 leading-relaxed line-clamp-3">
                              {cfg.description}
                            </p>
                          </div>

                          <div className="p-2 rounded-xl bg-stone-50 border border-stone-100 text-[11px] text-stone-600">
                            <span className="font-bold text-stone-900">典型：</span>
                            <span className="line-clamp-2">{cfg.example}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* OTHER CHAPTER 2: 痛點免費提出與專家解鎖機制 */}
              {selectedOtherChapterId === 'ch_other_2' && (
                <div className="p-6 sm:p-8 rounded-3xl bg-rose-50/50 border border-rose-200 space-y-6 animate-in fade-in">
                  <div className="flex items-center gap-2.5 border-b border-rose-200/80 pb-4">
                    <Flame className="w-6 h-6 text-rose-600" />
                    <h2 className="text-xl font-black text-stone-900">
                      痛點免費提出・專家自訂方案解鎖機制
                    </h2>
                  </div>

                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                    生活與產業痛點是商業創新的起點。在 IdeaX 上，
                    <strong>提問者可 NT$ 0 元免費提出痛點</strong>，無任何門檻或預先扣款；各路認證專家與產業顧問可在下方提交專屬的落地解決方案，並
                    <strong>由解答者自行設定解鎖金額</strong>，提問者或有興趣的買方付費解鎖後查閱全文與獲取交付檔案/線上會談權利。
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                    <div className="p-4 bg-white rounded-2xl border border-rose-200 space-y-1.5">
                      <span className="font-black text-rose-900 block text-sm">1. 痛點 0 元提出</span>
                      <span className="text-stone-500 leading-relaxed block">
                        發布者無需支付懸賞金，隨時分享產業瓶頸、經營痛點或生活難題。
                      </span>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-rose-200 space-y-1.5">
                      <span className="font-black text-rose-900 block text-sm">2. 專家自訂解鎖價</span>
                      <span className="text-stone-500 leading-relaxed block">
                        解答者針對痛點提交深度方案、實操架構或附件，自行定價解鎖。
                      </span>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-rose-200 space-y-1.5">
                      <span className="font-black text-rose-900 block text-sm">3. 代理收付批次撥付</span>
                      <span className="text-stone-500 leading-relaxed block">
                        買方付費解鎖後，平台依服務費率核算應付服務報酬，排程撥入解答者帳戶。
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* OTHER CHAPTER 3: 新版會員方案與服務費減免 */}
              {selectedOtherChapterId === 'ch_other_3' && (
                <div className="p-6 sm:p-8 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-6 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-4">
                    <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-600" />
                      <span>新版會員方案（服務費減免與最高實收 102%）</span>
                    </h2>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      服務費直接折抵 • 自動撥款結算
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                    {/* 達人方案 */}
                    <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-blue-900">達人方案</span>
                        <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                          半價 5%
                        </span>
                      </div>
                      <p className="font-mono text-blue-950 font-extrabold text-sm">
                        6 個月 $1,499（$249/月）
                      </p>
                      <p className="text-[11px] text-blue-800 leading-relaxed">
                        服務費直接減半 -5%（僅抽取 5% 服務費，<strong>解答者實收 95%</strong>）。
                      </p>
                    </div>

                    {/* 權威方案 */}
                    <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-purple-900">權威方案</span>
                        <span className="text-[10px] font-bold bg-purple-600 text-white px-2 py-0.5 rounded-full">
                          免服務費 0%
                        </span>
                      </div>
                      <p className="font-mono text-purple-950 font-extrabold text-sm">
                        $1,490/月 或 $14,900/年
                      </p>
                      <p className="text-[11px] text-purple-800 leading-relaxed">
                        服務費 -10%（<strong>免服務費，解答者 100% 全額入帳</strong>），年繳現省 NT$ 2,980。
                      </p>
                    </div>

                    {/* 大師方案 */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-stone-950">大師方案</span>
                        <span className="text-[10px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 px-2 py-0.5 rounded-full">
                          實收 102%
                        </span>
                      </div>
                      <p className="font-mono text-stone-950 font-extrabold text-sm">
                        $3,990/月 或 $43,990/年
                      </p>
                      <p className="text-[11px] text-stone-700 leading-relaxed">
                        <strong>免服務費 ＋ 平台額外補貼 2% BONUS</strong>（每筆交易實收高達 102%！）。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* OTHER CHAPTER 4: 平台用戶角色與社群 */}
              {selectedOtherChapterId === 'ch_other_4' && (
                <div className="p-6 sm:p-8 rounded-3xl bg-white border border-stone-200 shadow-xs">
                  <PlatformRolesSpectrumView
                    showBackToList={true}
                    onBack={() => setSelectedOtherChapterId(null)}
                    onOpenCommunityGuidelines={() => {
                      setSelectedOtherChapterId(null);
                      setActiveTab('contract');
                      setActiveContractSubTab('community_guidelines');
                    }}
                  />
                </div>
              )}

              {/* OTHER CHAPTER 5: AI 功能介紹與智慧賦能 */}
              {selectedOtherChapterId === 'ch_other_5' && (
                <div className="p-6 sm:p-8 rounded-3xl bg-purple-50/60 border border-purple-200 space-y-6 animate-in fade-in">
                  <div className="flex items-center gap-2.5 border-b border-purple-200 pb-4">
                    <Sparkles className="w-6 h-6 text-purple-700" />
                    <h2 className="text-xl font-black text-stone-900">
                      AI 智慧引擎賦能與高效溝通工具
                    </h2>
                  </div>

                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                    IdeaX 整合最前沿 AI 語意與專家大語言模型，全面賦能提問者、解答者與平台營運管理，打造無縫高效的知識與解決方案交易生態：
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                    <div className="p-4 bg-white rounded-2xl border border-purple-200 space-y-2 shadow-2xs">
                      <span className="font-extrabold text-purple-900 block text-sm flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <span>AI 題目自動標籤與建議</span>
                      </span>
                      <p className="text-stone-600 leading-relaxed">
                        提問發布時，系統自動分析痛點語意，生成精準主題 Hashtag 與推薦懸賞級別。
                      </p>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-purple-200 space-y-2 shadow-2xs">
                      <span className="font-extrabold text-purple-900 block text-sm flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-purple-600" />
                        <span>AI 專家智慧媒合推播</span>
                      </span>
                      <p className="text-stone-600 leading-relaxed">
                        即時分析專家領域、認證資歷與歷史評價，主動推播高適配度問題給專屬專家。
                      </p>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-purple-200 space-y-2 shadow-2xs">
                      <span className="font-extrabold text-purple-900 block text-sm flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-purple-600" />
                        <span>AI-CRM 客戶作戰藍圖</span>
                      </span>
                      <p className="text-stone-600 leading-relaxed">
                        為專家拆解潛在客戶痛點、決策因子與跟進時機，生成 3 階段促成策略與對話建議。
                      </p>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-purple-200 space-y-2 shadow-2xs">
                      <span className="font-extrabold text-purple-900 block text-sm flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-purple-600" />
                        <span>AI 智慧爭議調解報告</span>
                      </span>
                      <p className="text-stone-600 leading-relaxed">
                        爭議發生時，調閱聊天室對話與交付紀錄，生成中立客觀的調解報告與和解協議。
                      </p>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-purple-200 space-y-2 shadow-2xs">
                      <span className="font-extrabold text-purple-900 block text-sm flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-purple-600" />
                        <span>AI 商業企劃與合規生成</span>
                      </span>
                      <p className="text-stone-600 leading-relaxed">
                        一鍵自動產出正規商業企劃書、電子和解協議與專案進度試算，提升履約保障。
                      </p>
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
