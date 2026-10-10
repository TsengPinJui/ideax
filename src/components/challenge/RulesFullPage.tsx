import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Trophy,
  Award,
  Layers,
  Calendar,
  Share2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Coins,
  ShieldCheck,
  FileText,
  Users,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  LogIn,
  User as UserIcon,
  ExternalLink,
  GraduationCap,
  Megaphone,
  Flame,
  UserCheck,
  Clock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { STAR_SEASON_TRACKS, OFFICIAL_COMPETITION_TRACKS } from '../../types/competition';
import { getCompetitionStageInfo } from '../../utils/competitionSchedule';
import {
  COMPETITION_RULES_A,
  GENERAL_USER_TERMS_B,
  PARTICIPANT_TERMS_C,
  EXPERT_JUDGE_TERMS_D,
  PLATFORM_GUIDE_E,
} from '../../data/competitionTermsData';
import { CompetitionTermsModal, CompetitionDocumentKey } from './CompetitionTermsModal';
import { StarSeasonBroadcastBanner } from './StarSeasonBroadcastBanner';

interface RulesFullPageProps {
  onNavigate: (view: 'home' | 'proposal' | 'explore' | 'rules' | 'submit' | 'participant' | 'judge' | 'ambassador') => void;
  onBackToOldSite: () => void;
  onOpenAuth: () => void;
  onGoToPainPoints?: () => void;
  onOpenAmbassadorModal?: () => void;
}

export const RulesFullPage: React.FC<RulesFullPageProps> = ({
  onNavigate,
  onBackToOldSite,
  onOpenAuth,
  onGoToPainPoints,
  onOpenAmbassadorModal,
}) => {
  const { currentUser } = useApp();
  const [stageInfo, setStageInfo] = useState(() => getCompetitionStageInfo());

  React.useEffect(() => {
    const handleStageChange = () => {
      setStageInfo(getCompetitionStageInfo());
    };
    window.addEventListener('ideax_competition_stage_changed', handleStageChange);
    return () => window.removeEventListener('ideax_competition_stage_changed', handleStageChange);
  }, []);
  const [activeMainTab, setActiveMainTab] = useState<'A_rules' | 'E_guide'>('A_rules');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [termsModalKey, setTermsModalKey] = useState<CompetitionDocumentKey | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  const faqs = [
    {
      q: '如何獲得創星幣？創星幣能否兌換成現金？',
      a: '使用 創星幣 支持你認同的創新提案，模擬市場關注度。競賽期間，新用戶登入創星季即配發 100,000 創星幣；點擊「分享推薦碼」可額外領取 100 創星幣獎勵。產學研專家則享有專屬 3,000,000 創星幣評選額度。創星幣純屬市場模擬關注度驗證，不可購買、轉帳或兌換現金，亦不影響舊站真實錢包餘額。',
    },
    {
      q: '為什麼前 20 名進入決選？專家如何參與評選？',
      a: '第二階段大眾注資模擬（11/16 ~ 12/04）旨在測試市場反應力與社群關注度（11/14 ~ 11/15 預先提案期間暫關閉注資，僅開放提案審核與預覽）。募得創星幣總額排名前 20 名之優秀提案將直接取得「入圍決選資格」。第三階段（12/05 ~ 12/11）由主辦方產學研專家進行專業審查與評分（創新突破性 40%、商業可行性 35%、社會與產業價值 25%），決選出前三名獲獎隊伍（冠軍 NT$30,000、亞軍 NT$10,000、季軍 NT$4,000）。',
    },
    {
      q: '「痛點提出者」如何獲得 200 點痛點獎勵與價值 NT$1,500 採用好禮？',
      a: '只要成功提出痛點（需過審）即送 200 點（價值 $250 的 IdeaX 創點子平台點數，可用於發布懸賞問題、享受付費功能，點數效期 60 日）。此外，若參賽團隊選用並解決該痛點，且該解方提案最終經專家評審評定為前三名（冠、亞、季軍），原痛點之提出者即可另獲價值 NT$1,500 等值好禮（含 1,200 點 IdeaX 平台提問金），共同共享創新成果！',
    },
    {
      q: '推廣大使獎勵 400 點的核發條件是什麼？',
      a: '推廣大使只要分享專屬推薦代碼或連結，邀請個人創客或新創團隊提交提案。被推薦之專案經主辦單位初審通過，推薦人即可獲得 400 點 IdeaX 平台點數獎勵（用於發布提問、享受付費功能）！獎勵無上限，多推多得。',
    },
    {
      q: '參賽者有年齡或身分限制嗎？非學生或個人可以參賽嗎？',
      a: '無年齡或身分限制！不論是在學學生、社會人士、自由創客均可參賽。亦不限團隊或個人，個人可獨立提案投件，亦歡迎 1–5 人自由組隊報名。',
    },
    {
      q: '參賽隊伍如何計算？每隊有提案或痛點上限嗎？',
      a: '本競賽「以每個帳號算計一隊」，且「每隊不限提案或痛點數量」！不論個人獨立提案或團隊代表，均由該帳號代表一隊。可在痛點徵件階段提出多件生活與產業痛點，在想解方階段亦可針對不同痛點提交多項創新解方。',
    },
    {
      q: '同一團隊可以投稿多個提案嗎？有類別或賽道限制嗎？',
      a: '可以！本競賽「以每個帳號算計一隊」，且「每隊不限提案或痛點數量」。此競賽不另設類別限制，只要是解決所提痛點且需求獲市場認同、技術受專家認可即可。提案時仍可自由標注相關領域（分類僅作為方便識別不作為競賽依據）。同一團隊可針對不同痛點提交多項獨立提案。',
    },
    {
      q: '分享推薦碼領取 100 創星幣的防刷機制如何運作？',
      a: '每位登入用戶點擊「分享推薦碼領 100 創星幣」，系統將由可信後端為您的競賽錢包增加 100 創星幣。為維護競賽公平，每個帳號終身嚴格限領一次，創星幣獨立於舊站真實 Balance，不影響舊站任何帳戶資產。',
    },
    {
      q: '各項競賽獎勵點數的有效期限是多久？',
      a: (
        <span>
          注意點數期限：前三名獲獎團隊點數效期為 <b>180 日</b>，其餘所有獎勵點數效期皆為 <b>60 日</b>。請把握提問機會，盡快使用完畢 <span className="inline-block animate-exclamation-action text-amber-600 font-black text-sm origin-bottom select-none" title="把握提問機會！">!</span> 點數可用於 IdeaX 創點子平台發布懸賞提問或享受付費功能。
        </span>
      ),
    },
    {
      q: '創星季的活動時程如何安排？',
      a: '競賽各階段明確時程如下：\n• 10/17 00:00 ～ 12/04 16:30：報名時段（※ 提痛點之參賽者請於 11/13 16:30 痛點徵件截止前完成報名）\n• 10/24 00:00 ～ 11/13 16:30：第一階段：痛點徵件（全體用戶發布產業/生活切身痛點）\n• 11/14 10:00 ～ 11/15 16:30：第二階段 (一)：預先提案（【關閉募資(投資)功能】，僅可註冊報名、在線提案、主辦單位審核及預覽）\n• 11/16 10:00 ～ 12/04 16:30：第二階段 (二)：模擬募資（【全面開放功能】，可報名、提案、創星幣模擬募資(投資)注資投票、主辦單位審核，募資總額前 20 名取得決選資格）\n• 12/05 ～ 12/11：第三階段：進入決選(評審)（由評審團進行專業審查與評分）\n• 12/12 ～ 12/16：第四階段：公布結果（於首頁盛大公告最終榜單，頒發榮譽徽章與獎勵）',
    },
  ];

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-24 font-sans">
      {/* 獨立頂部導覽列 */}
      <header className="bg-white/95 border-b border-amber-200 sticky top-0 z-40 backdrop-blur-md shadow-xs">
        {/* 創星季廣播橫幅：誠徵各行業專家參與注資，注資額300萬（點擊申請） */}
        <StarSeasonBroadcastBanner onApply={() => onNavigate('judge')} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 shrink-0 -ml-1 sm:-ml-2">
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
                <img src="/logo-bulb.png" alt="IdeaX - 點擊回舊站首頁" className="w-10.5 h-10.5 sm:w-12 sm:h-12 md:w-14 md:h-14 object-contain shrink-0 drop-shadow-xs group-hover:scale-105 transition-all" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onNavigate('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="p-1 -m-1 rounded-xl hover:bg-amber-100/60 active:scale-95 transition-all cursor-pointer flex items-center group -ml-1"
                title="點擊返回創星季首頁"
                aria-label="回創星季競賽首頁"
              >
                <img src="/logo-chuangxingji-text.png" alt="創星季 - 點擊回競賽首頁" className="h-7.5 sm:h-9 md:h-10.5 w-auto object-contain shrink-0 group-hover:opacity-90 transition-all" />
              </button>
            </div>

            <span className="text-stone-300 hidden sm:inline">|</span>

            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="inline-flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-amber-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回提案總覽</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700 bg-stone-100/80 p-1 rounded-2xl border border-stone-200/80">
            {/* 1. 依時程切換：籌備預熱為「即將開跑」；10/17報名開跑為「即將徵件」；10/24痛點徵件為「提出痛點」；11/14~12/04 轉為「我想提案!」；12/04後截止 */}
            {stageInfo.isRegistrationOnlyStage ? (
              <button
                type="button"
                onClick={() => onNavigate('participant')}
                className="px-3.5 py-1.5 rounded-xl text-stone-950 bg-amber-400 hover:bg-amber-300 transition-all cursor-pointer font-black shadow-2xs active:scale-98 flex items-center gap-1.5"
                title="線上報名已開跑！點擊前往報名參賽（第一階段痛點徵件將於 10/24 00:00 正式開放）"
              >
                <Sparkles className="w-3.5 h-3.5 text-stone-950" />
                <span>即將徵件 (10/24)</span>
              </button>
            ) : stageInfo.isBeforeStart ? (
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="px-3.5 py-1.5 rounded-xl text-stone-950 bg-amber-400 hover:bg-amber-300 transition-all cursor-pointer font-black shadow-2xs active:scale-98 flex items-center gap-1.5"
                title="創星季籌備中：10/17 開放報名、10/24 00:00 痛點徵件正式開跑！點擊查看賽程"
              >
                <Sparkles className="w-3.5 h-3.5 text-stone-950" />
                <span>即將開跑 (10/24)</span>
              </button>
            ) : stageInfo.isPainPointStage ? (
              <button
                type="button"
                onClick={() => {
                  if (!currentUser || currentUser.id === 'user-guest') {
                    onOpenAuth();
                    return;
                  }
                  onNavigate('submit');
                }}
                className="px-3.5 py-1.5 rounded-xl text-white bg-rose-600 hover:bg-rose-500 transition-all cursor-pointer font-black shadow-2xs active:scale-98 flex items-center gap-1.5"
                title="第一階段痛點徵件中：立即提出痛點（過審送200點）"
              >
                <Flame className="w-3.5 h-3.5 text-white" />
                <span>提出痛點</span>
              </button>
            ) : stageInfo.isProposalStage ? (
              <button
                type="button"
                onClick={() => {
                  if (!currentUser || currentUser.id === 'user-guest') {
                    onOpenAuth();
                    return;
                  }
                  onNavigate('submit');
                }}
                className="px-3.5 py-1.5 rounded-xl text-stone-950 bg-amber-400 hover:bg-amber-300 transition-all cursor-pointer font-black shadow-2xs active:scale-98 flex items-center gap-1.5"
                title="我想提案!（提案開放至 12/04 截止）"
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

            {/* 2. 探索Idea */}
            <button
              type="button"
              onClick={() => onNavigate('proposal')}
              className="hidden sm:inline-flex px-3 py-1.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-white transition-all cursor-pointer font-bold"
            >
              探索Idea
            </button>

            {/* 3. 痛點 → */}
            <button
              type="button"
              onClick={onGoToPainPoints || onBackToOldSite}
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-white transition-all cursor-pointer font-bold group"
              title="前往 IdeaX創點子 創點子/痛點集並自動滾動至痛點區域"
            >
              <span>痛點</span>
              <ArrowRight className="w-3.5 h-3.5 text-stone-500 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* 4. 報名參賽 */}
            <button
              type="button"
              onClick={() => {
                if (!currentUser || currentUser.id === 'user-guest') {
                  onOpenAuth();
                  return;
                }
                onNavigate('participant');
              }}
              className="hidden md:inline-flex px-3 py-1.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-white transition-all cursor-pointer font-bold"
            >
              報名參賽
            </button>

            {/* 5. 成為專家 */}
            <button
              type="button"
              onClick={() => {
                if (!currentUser || currentUser.id === 'user-guest') {
                  onOpenAuth();
                  return;
                }
                onNavigate('judge');
              }}
              className="hidden md:inline-flex px-3 py-1.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-white transition-all cursor-pointer font-bold"
              title="點擊進入成為專家"
            >
              成為專家
            </button>

            {/* 6. 推廣大使 */}
            <button
              type="button"
              onClick={() => onNavigate('ambassador')}
              className="hidden lg:inline-flex px-3 py-1.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-white transition-all cursor-pointer font-bold"
            >
              推廣大使
            </button>

            {/* 行動版：優先保留痛點（隨著賽程變動，若換至提案階段則自動變換為提案捷徑），移除競賽辦法 */}
            {stageInfo.isProposalStage ? (
              <button
                type="button"
                onClick={() => onNavigate('submit')}
                className="sm:hidden inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-black transition-all shadow-2xs cursor-pointer active:scale-98"
                title="進入創星季提案"
              >
                <Send className="w-3.5 h-3.5 text-stone-950" />
                <span>提案</span>
                <ArrowRight className="w-3.5 h-3.5 text-stone-950" />
              </button>
            ) : (
              <button
                onClick={onGoToPainPoints || onBackToOldSite}
                className="sm:hidden inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-98 group"
                title="前往 IdeaX創點子 創點子/痛點集並自動滾動至痛點區域"
              >
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                <span>痛點</span>
                <ArrowRight className="w-3.5 h-3.5 text-stone-500 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 滿版 Hero 標題區 (顏色簡單點顯得正式：沉穩白色背景、淺灰線條、清晰階層) */}
      <section className="bg-white border-b border-stone-200 pt-10 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-stone-700 text-xs font-semibold">
            <BookOpen className="w-3.5 h-3.5 text-stone-600" />
            <span>【正式官方規章】IdeaX 創星季 實戰手冊與平台使用方法</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-stone-900 tracking-tight leading-snug">
            競賽辦法 • 平台使用方法
          </h1>

          <p className="text-xs sm:text-sm text-stone-600 max-w-2xl mx-auto leading-relaxed">
            完整掌握兩階段遞進機制、四大階段時程規劃、創星幣模擬募資、專家決選維度、痛點提出者獎勵與平台操作步驟。
          </p>

          {/* A / E 兩大核心切換分頁標籤 (正式 Segmented Control) */}
          <div className="inline-flex items-center p-1 bg-stone-100 border border-stone-200 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveMainTab('A_rules')}
              className={`px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeMainTab === 'A_rules'
                  ? 'bg-white text-stone-900 shadow-2xs border border-stone-200/80 font-black'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              <BookOpen className="w-4 h-4 text-stone-600" />
              <span>A. 競賽辦法規章</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMainTab('E_guide')}
              className={`px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeMainTab === 'E_guide'
                  ? 'bg-white text-stone-900 shadow-2xs border border-stone-200/80 font-black'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              <HelpCircle className="w-4 h-4 text-stone-600" />
              <span>E. 平台使用方法（操作指南）</span>
            </button>
          </div>

          {/* 規章條款快速閱覽捷徑列 (B, C, D) - 正式簡潔風格 */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-stone-400 font-medium">查看其他規範：</span>
            <button
              type="button"
              onClick={() => setTermsModalKey('B')}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 font-medium transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-stone-500" />
              <span>B. 一般用戶條款</span>
            </button>
            <button
              type="button"
              onClick={() => setTermsModalKey('C')}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 font-medium transition-all cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-stone-500" />
              <span>C. 參賽者條款</span>
            </button>
            <button
              type="button"
              onClick={() => setTermsModalKey('D')}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 font-medium transition-all cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-stone-500" />
              <span>D. 專家評審條款</span>
            </button>
          </div>
        </div>
      </section>

      {/* 滿版主體內容區塊 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* ========================================================================= */}
        {/* VIEW A: 競賽辦法 (Official Rules) - 商用正式規章白底黑字連續文件 */}
        {/* ========================================================================= */}
        {activeMainTab === 'A_rules' && (
          <article className="bg-white border border-stone-300 rounded-2xl p-6 sm:p-10 md:p-12 shadow-xs text-stone-900 leading-relaxed font-sans space-y-8">
            {/* 正式文件標頭資訊 */}
            <div className="border-b border-stone-200 pb-6 space-y-2">
              <div className="text-[11px] font-mono tracking-widest text-stone-500 uppercase">
                Official Competition Regulations & Guidelines
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-stone-950 tracking-tight">
                IdeaX 創星季 • 官方競賽章程與辦法規章
              </h1>
              <p className="text-xs sm:text-sm text-stone-600">
                主辦單位：IdeaX 創星季競賽籌備處 • 最後修訂日期：2026 年 10 月 07 日
              </p>
              <div className="pt-2 text-xs text-stone-700 bg-stone-50 p-3 rounded-lg border border-stone-200">
                <b>【前言與約束力說明】</b>
                本競賽規章依誠信、公開、市場實戰原則制定。凡參與「IdeaX 創星季」之全體參賽團隊、提痛點者、會員注資者及專家評審，均受本競賽辦法各項條款之約束與保護。
              </div>
            </div>

            {/* 壹、競賽緣起 */}
            <section id="rules-origin" className="space-y-3">
              <h2 className="text-base sm:text-lg font-black text-stone-950 border-b border-stone-200 pb-2">
                壹、競賽緣起
              </h2>
              <div className="text-xs sm:text-sm text-stone-800 leading-relaxed space-y-2">
                <p>
                  一、11 月為全球與國內蓬勃推動創新創業能量之「國際創新月」，匯聚各界創意思維與跨領域探索熱忱。
                </p>
                <p>
                  二、IdeaX 創星季鼓勵每一位擁有創新思維的人大膽提出假設、勇於挑戰現狀；同時，任何在日常生活中碰到不便、煩惱、困擾或產業難題的朋友，亦能自由提出。
                </p>
                <p>
                  三、本競賽建立「先有痛點、後有解方」的共創實戰舞台，讓痛點發起者與各領域解題高手在此相互腦力激盪，結合大眾模擬注資驗證與產學專家評選，提供機會讓大眾能將靈感與點子，化為具體落地回報與實質商業成果！
                </p>
              </div>
            </section>

            {/* 貳、報名時間 */}
            <section id="rules-registration-time" className="space-y-3 pt-6 border-t border-stone-200">
              <h2 className="text-base sm:text-lg font-black text-stone-950 border-b border-stone-200 pb-2">
                貳、報名時間
              </h2>
              <div className="text-xs sm:text-sm text-stone-800 leading-relaxed space-y-2">
                <p>
                  一、無須事先繁複報名：本競賽打破傳統預審報名流程，無需事先繳交紙本或預報表單。
                </p>
                <p>
                  二、網站開放隨時註冊登入：創星季競賽網站開放期間，全體用戶均可隨時在線上完成註冊與登入。
                </p>
                <p>
                  三、報名時段規範（線上即刻投件）：
                </p>
                <div className="pl-4 space-y-1.5 py-1 text-stone-700">
                  <p>
                    • <b>全競賽報名時段：</b><b>10/17 00:00 ～ 12/04 16:30</b>（提痛點之參賽者請於 11/13 16:30 痛點徵件截止前完成報名）。
                  </p>
                  <p>
                    • <b>提案可報名與投件期間：</b><b>10/17 00:00 ～ 12/04 16:30</b>（含 11/14~11/15 預先提案及 11/16~12/04 模擬募資提案，收件至 12/04 16:30 截止）。
                  </p>
                </div>
                <p className="text-stone-600 text-xs">
                  ※ 各階段徵件時間一到（第一階段痛點徵件 10/24 00:00~11/13 16:30、第二階段預先提案 11/14 10:00~11/15 16:30 開放提案/審核/預覽、模擬募資 11/16 10:00~12/04 16:30 開放注資投票），登入即可即時於系統線上提交痛點或創新企劃。
                </p>
              </div>
            </section>

            {/* 參、參賽資格 */}
            <section id="rules-eligibility" className="space-y-3 pt-6 border-t border-stone-200">
              <h2 className="text-base sm:text-lg font-black text-stone-950 border-b border-stone-200 pb-2">
                參、參賽資格
              </h2>
              <div className="text-xs sm:text-sm text-stone-800 leading-relaxed space-y-2">
                <p>
                  一、參賽資格完全不限：不限青年或在學學生身分，社會人士、自由創客、新創團隊皆可自由參賽。
                </p>
                <p>
                  二、參賽者自選「提出痛點」與「提出解方」，同帳號可以同時提出多個痛點或解方，鼓勵提出多案增加獲獎機率 !
                </p>
                <p>
                  三、需登入 IdeaX 用戶帳號：所有參賽者須完成註冊並登入 IdeaX 創點子平台帳號，方能啟動競賽權限、提交提案、發布痛點與操作創星幣。
                </p>
                <p>
                  四、隊伍計算基準：本競賽「以每個帳號算計一隊」。個人可獨立報名提案，亦歡迎 1 至 5 人組隊，均由該登入帳號統籌代表投件。
                </p>
                <p>
                  五、提案數量不設限：「每隊不限提案或痛點數量」，各隊可針對不同生活難題發布多件痛點，亦可在想解方階段投稿多件解方提案。
                </p>
                <p>
                  六、申請專家資格：若愈申請專家資格，需額外提供相關證明供審核。專家不得兼任參賽者。
                </p>
              </div>
            </section>

            {/* 肆、報名方式 */}
            <section id="rules-registration-method" className="space-y-3 pt-6 border-t border-stone-200">
              <h2 className="text-base sm:text-lg font-black text-stone-950 border-b border-stone-200 pb-2">
                肆、報名方式
              </h2>
              <div className="text-xs sm:text-sm text-stone-800 leading-relaxed space-y-2">
                <p>
                  一、註冊與登入：註冊為 IdeaX 創點子用戶帳號並完成登入，系統即自動配發 100,000 創星幣模擬額度。
                </p>
                <p>
                  二、選擇身分角色：進入競賽專區，依意願點選「報名參賽」（填寫團隊名稱與基本資料）或「成為專家」（填寫專業背景與資歷）。<b>【特別提醒：不可兼任參賽者與專家】</b>，為維持評審客觀與利益迴避，請依實際角色擇一申請。
                </p>
                <p>
                  三、送出申請與審核：線上送出申請後等待主辦方管理員審核。審核通過之專家享有專屬 3,000,000 創星幣投資評選額度。
                </p>
              </div>
            </section>

            {/* 伍、競賽主題設定 */}
            <section id="rules-topics" className="space-y-3 pt-6 border-t border-stone-200">
              <h2 className="text-base sm:text-lg font-black text-stone-950 border-b border-stone-200 pb-2">
                伍、競賽主題設定
              </h2>
              <div className="text-xs sm:text-sm text-stone-800 leading-relaxed space-y-2">
                <p>
                  一、提痛點：任何日常生活中碰到讓你感到煩惱、不便或困擾的地方，也許你已經想到解方了，也許目前還在困擾著，都沒關係！在「痛點徵件」專區大膽提出來，讓大家一起腦力激盪。成功提出痛點且過審即送 200 點 IdeaX 平台點數（價值 $250，點數效期 60 日）。
                </p>
                <p>
                  二、提方案：依據競賽期間大家所提出的真實痛點庫，從中選出一個作為主題，尋找能解決這件事的「創新方法」或「創新事物」（產品、軟體、商業模式、永續服務等），撰寫解方企劃線上投件。
                </p>
              </div>
            </section>

            {/* 陸、交稿方式 */}
            <section id="rules-submission" className="space-y-3 pt-6 border-t border-stone-200">
              <h2 className="text-base sm:text-lg font-black text-stone-950 border-b border-stone-200 pb-2">
                陸、交稿方式（按照提案頁規範）
              </h2>
              <div className="text-xs sm:text-sm text-stone-800 leading-relaxed space-y-2">
                <p>
                  提案一律於競賽網「我想提案 / 提案投稿專頁」線上填寫繳交，必備與選填欄位規範如下：
                </p>
                <p>
                  一、提案基本資料：填寫提案標題（扼要精準，15~40 字）、標注領域賽道（機電運輸、資通訊、生醫化材、服務文創，分類僅供方便識別不作為競賽依據）、選填對應之第一階段痛點。
                </p>
                <p>
                  二、核心解方摘要：撰寫約 100~200 字精煉核心解方論述，清楚說明痛點本質、解方核心特色與預期改變。
                </p>
                <p>
                  三、詳細解方企劃內容（決審關鍵項目）：
                  <br />
                  &emsp;（一）詳細方案說明：產品/服務功能架構、運作流程與使用者情境。
                  <br />
                  &emsp;（二）技術與執行可行性：關鍵技術難度、實施步驟、原型驗證規劃。
                  <br />
                  &emsp;（三）市場需求與競品分析：目標客群、需求急迫性與差異化競爭優勢。
                  <br />
                  &emsp;（四）商業模式與財務規劃：營運模式、成本估算與未來推進期程。
                </p>
                <p>
                  四、補充附件與展示支援：支援上傳商業計劃書（BP 企劃簡報，PDF/PPT 格式，上限 25MB）、展示圖片（最多 3 張）、外部 Demo 或示範影片連結；如有推廣大使推薦碼亦可於交稿時選填。
                </p>
              </div>
            </section>

            {/* 柒、活動獎項 */}
            <section id="rules-awards" className="space-y-3 pt-6 border-t border-stone-200">
              <h2 className="text-base sm:text-lg font-black text-stone-950 border-b border-stone-200 pb-2">
                柒、活動獎項
              </h2>
              <div className="text-xs sm:text-sm text-stone-800 leading-relaxed space-y-2">
                <p>
                  一、決審獲獎團隊榮譽與獎勵：
                  <br />
                  &emsp;• 冠軍（First Prize）：總價值 NT$30,000（NT$20,000 現金 ＋ 8,000 點平台點數，點數效期 180 日 ＋ 官方「創之星」最高榮譽徽章）。
                  <br />
                  &emsp;• 亞軍（Second Prize）：總價值 NT$10,000（NT$6,000 現金 ＋ 3,200 點平台點數，點數效期 180 日 ＋ 官方「創之星」榮譽徽章）。
                  <br />
                  &emsp;• 季軍（Third Prize）：總價值 NT$5,000（NT$3,000 現金 ＋ 1,600 點平台點數，點數效期 180 日 ＋ 官方「創之星」榮譽徽章）。
                </p>
                <p>
                  二、痛點提出獎（人人有獎）：成功提出生活或產業切身痛點（需過審），即送 200 點 IdeaX 創點子平台點數（價值 $250，效期 60 日）。
                </p>
                <p>
                  三、痛點採用好禮：若前十名得獎提案採用了第一階段的痛點，原痛點提出者另享成果回饋：前 1~3 名採用享價值 NT$1,500 等值好禮（含 1,200 點提問金）；前 4~10 名採用享價值 $500 好禮（含 400 點提問金，效期 60 日）。
                </p>
                <p>
                  四、推廣大使推薦獎勵：每成功推薦 1 案審核通過，推薦人享 300 點（價值 $400）IdeaX 平台點數（效期 60 日，多推多得無上限）。
                </p>
                <p>
                  五、注意點數期限：前三名獲獎團隊點數效期為 180 日，其餘所有獎勵點數效期皆為 60 日。請把握提問機會，盡快使用完畢 <span className="inline-block animate-exclamation-action text-amber-600 font-black text-sm origin-bottom select-none" title="把握提問機會！">!</span> 點數皆可用於 IdeaX 創點子平台提問與付費服務。
                </p>
              </div>
            </section>

            {/* 捌、評審機制 */}
            <section id="rules-judging" className="space-y-3 pt-6 border-t border-stone-200">
              <h2 className="text-base sm:text-lg font-black text-stone-950 border-b border-stone-200 pb-2">
                捌、評審機制
              </h2>
              <div className="text-xs sm:text-sm text-stone-800 leading-relaxed space-y-2">
                <p>
                  一、評審遴選與名單保密：評審團由產學研專家名單中遴選組成，為確保評選公正客觀、杜絕人情干擾，評審委員名單暫不對外公布。
                </p>
                <p>
                  二、初審入圍資格：第二階段大眾模擬注資募得創星幣總額排名前 20 名之優秀提案，直接取得進入第三階段決審複審資格。
                </p>
                <p>
                  三、決審四大維度與評分比重：
                  <br />
                  &emsp;（一）創新性（40%）：技術突破、創意思維、獨特性與市場差異化競爭優勢。
                  <br />
                  &emsp;（二）完整度（20%）：提案企劃架構完整度、邏輯嚴密性與文字陳述清晰度。
                  <br />
                  &emsp;（三）可行性（20%）：落地實施路徑、原型製作技術成熟度與成本結構合理性。
                  <br />
                  &emsp;（四）商業潛力（20%）：目標市場規模、客戶需求深度、營運模式與商業化發展潛力。
                </p>
              </div>
            </section>

            {/* 玖、活動時程 */}
            <section id="rules-schedule" className="space-y-3 pt-6 border-t border-stone-200">
              <h2 className="text-base sm:text-lg font-black text-stone-950 border-b border-stone-200 pb-2">
                玖、活動時程
              </h2>
              <div className="text-xs sm:text-sm text-stone-800 leading-relaxed space-y-2">
                <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300 text-stone-900 font-bold mb-3 flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-stone-950 font-black">【報名時段】：10/17 00:00 ～ 12/04 16:30</div>
                    <div className="text-xs text-amber-900 font-medium pt-0.5">※ 提痛點之參賽者請於 11/13 16:30 痛點徵件截止前完成報名。</div>
                  </div>
                </div>
                <p>
                  一、第一階段 • 痛點徵件（10/24 00:00 – 11/13 16:30）：全體會員發布生活不便與產業切身痛點，過審即送 200 點，建立題庫供各隊選題解題。
                </p>
                <p>
                  二、第二階段 (一) • 預先提案（11/14 10:00 – 11/15 16:30）：【關閉募資(投資)功能】，開放用戶註冊報名、報名參賽/專家身分、線上投件提案、主辦單位進行審核與提案預覽。
                </p>
                <p>
                  三、第二階段 (二) • 模擬募資（11/16 10:00 – 12/04 16:30）：【全面開放功能】，期間持續開放報名與提案（至 12/04 16:30 截止收件）！全體會員使用創星幣模擬注資投票，主辦單位持續審核，總額前 20 名晉級決審。
                </p>
                <p>
                  四、第三階段 • 進入決選(評審)（12/05 – 12/11）：提案與募資收件截止，由評審團依四大維度指標進行專業審查與評分。
                </p>
                <p>
                  五、第四階段 • 公布結果（12/12 ～ 12/16）：於創星季競賽網首頁盛大公告最終得獎榜單，發放獎金與點數獎勵並授予榮譽徽章。
                </p>
              </div>
            </section>

            {/* 拾、其他注意事項 */}
            <section id="rules-notices" className="space-y-4 pt-6 border-t border-stone-200">
              <div className="border-b border-stone-200 pb-2">
                <h2 className="text-base sm:text-lg font-black text-stone-950">
                  拾、其他注意事項
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  請參賽團隊與全體會員務必詳閱以下完整權利義務、法律責任與平台規章
                </p>
              </div>

              <div className="text-xs sm:text-sm text-stone-800 leading-relaxed space-y-3">
                <p>
                  一、帳號註冊連動與內容自動刊登存取約定：參與創星季競賽即同意註冊 IdeaX 創點子平台（ideax.tw），並同意由系統自動刊登與存取競賽期間所提出的痛點、提案內容、企劃簡報及社群討論內容，以利產學對接、資源媒合與成果展現。
                </p>
                <p>
                  二、原創性保證與智慧財產權聲明：參賽作品必須為團隊或個人原創，嚴禁抄襲、剽竊、冒名頂替或侵犯他人專利權、著作權、商標權或營業秘密。若經查證屬實或第三方檢舉侵權成立，主辦單位將立即撤銷其參賽及獲獎資格，並追回全數發放之獎金、點數與榮譽徽章，衍生之一切法律與賠償責任由參賽者自行承擔。
                </p>
                <p>
                  三、身分利益迴避與嚴格不可兼任原則：為維持競賽之客觀公正與公信力，參賽者與專家評審身分嚴格互斥，<b>不可兼任參賽者與專家</b>。若經查獲同時具備參賽者與專家雙重身分或未主動揭露利害關係者，主辦單位得主動取消該團隊之評選資格。
                </p>
                <p>
                  四、多件提案與雙軌並行權利：參賽團隊可以同時提出痛點與創新解方，提案件數不設上限。若同一團隊有多件作品入圍，決選時各專案將獨立受評；但若獲獎名次重複，各項獎項與獎勵均獨立計算享有。
                </p>
                <p>
                  五、流通幣別「創星幣」性質與禁止兌現買賣：創星幣純屬競賽市場模擬關注度驗證權益，非真實法幣亦不具實體財產價值，嚴禁私下以現金或任何對價進行買賣、轉讓、質押或兌現；競賽錢包獨立隔離，絕不影響主站真實錢包資產與餘額。
                </p>
                <p>
                  六、誠信原則、防洗票與系統反作弊機制：嚴禁利用多重分身帳號、自動化腳本機器人、代理伺服器或漏洞進行灌票、洗幣、自我注資或干擾正常營運秩序。系統全天候啟動可信後端簽章查核與防刷監控，經查有惡意刷票情事者，主辦單位有權扣除違規票數並直接取消參賽資格。
                </p>
                <p>
                  七、獲獎獎金發放與依法代扣所得稅規範：
                  <br />
                  &emsp;（一）依中華民國稅法相關規定，得獎獎金及等值獎品價值若達法定申報門檻，得獎者須依法配合填具個人領據、提供身分證正反面影本、存摺影本等資料，主辦單位將依法開立所得稅扣繳憑單。
                  <br />
                  &emsp;（二）若得獎者為中華民國境內居住之個人，單次獎金價值超過新台幣 20,000 元（含）者，主辦單位依法代扣 10% 機會中獎所得稅；若得獎者非中華民國境內居住之個人（在台居留未滿 183 天之外籍人士），不限中獎金額一律由主辦單位依法代扣 20% 機會中獎所得稅。
                  <br />
                  &emsp;（三）獎金將以電匯方式匯入獲獎團隊隊長指定之帳戶；團隊內部之獎金分配與相關權利義務由團隊成員自行協調處理，主辦單位不涉入團隊內部協議。
                </p>
                <p>
                  八、注意點數期限：前三名獲獎團隊點數效期為 180 日，其餘所有獎勵點數效期皆為 60 日。請把握提問機會，盡快使用完畢 <span className="inline-block animate-exclamation-action text-amber-600 font-black text-sm origin-bottom select-none" title="把握提問機會！">!</span> 點數皆可用於 IdeaX 創點子平台提問與付費服務，不得轉讓他人、拍賣或要求折換等值現金。
                </p>
                <p>
                  九、成果展示、肖像權與影音素材宣傳授權：參賽者同意無償授權主辦單位於非營利、競賽推廣及成果展示之目的下，得公開使用、重製、改作、公開傳輸、公開播送參賽團隊所繳交之提案資料、簡報、影片、照片及隊員肖像，並於相關媒體報導與成果手冊中刊載。
                </p>
                <p>
                  十、個人資料保護與隱私權聲明：主辦單位為辦理本競賽活動，需蒐集、處理及利用參賽者之個人資料（包括姓名、電話、電子郵件、學校或任職單位等）。蒐集之個資僅供本競賽活動之身分確認、賽程聯繫、獲獎公告與稅務申報等法定行政用途使用，主辦單位嚴格恪守個人資料保護法規定。
                </p>
                <p>
                  十一、不可抗力因素與系統免責聲明：因地震、颱風等天災不可抗力因素，或因網際網路骨幹壅塞、電力中斷、重大駭客攻擊等不可歸責於主辦單位之事由，致使參賽者投件傳輸延誤、投票數據中斷或無法如期完成評選時，主辦單位得視情況調整、延後賽程或採取相應補救措施，不對參賽者承擔損害賠償責任。
                </p>
                <p>
                  十二、主辦單位保留修改權與準據法管轄：主辦單位保留隨時調整、修正、暫停或終止本競賽活動辦法、獎項與時程之權利；若有未盡事宜，得隨時於創星季競賽官網補充公告，並享有最終解釋權。本辦法之解釋與適用均依中華民國法律，若因本競賽衍生爭議，雙方同意以台灣台北地方法院為第一審管轄法院。
                </p>
              </div>
            </section>
          </article>
        )}

        {/* ========================================================================= */}
        {/* VIEW E: 平台使用方法 (Platform Usage Guide) - 商用白底黑字連續文件 */}
        {/* ========================================================================= */}
        {activeMainTab === 'E_guide' && (
          <article className="bg-white border border-stone-300 rounded-2xl p-6 sm:p-10 md:p-12 shadow-xs text-stone-900 leading-relaxed font-sans space-y-8">
            <div className="border-b border-stone-200 pb-4">
              <h2 className="text-xl sm:text-2xl font-black text-stone-950">
                {PLATFORM_GUIDE_E.title}
              </h2>
              <p className="text-xs text-stone-600 mt-1">{PLATFORM_GUIDE_E.subtitle}</p>
              <div className="text-[11px] font-mono text-stone-500 mt-2">
                操作流程規範 • 發布痛點、投件提案與創星幣注資完整說明
              </div>
            </div>

            <div className="space-y-6 text-xs sm:text-sm text-stone-800 leading-relaxed">
              {PLATFORM_GUIDE_E.steps.map((step) => (
                <div key={step.stepNumber} className="space-y-1.5 pt-4 first:pt-0 border-t first:border-t-0 border-stone-200">
                  <h3 className="font-black text-stone-950 text-sm sm:text-base flex items-center justify-between">
                    <span>步驟 {step.stepNumber}：{step.title}</span>
                    <span className="text-[11px] font-normal text-stone-500 font-mono">[{step.badge}]</span>
                  </h3>
                  <p className="text-stone-700">{step.description}</p>
                  <p className="text-stone-500 text-xs">實戰提示：{step.tips}</p>
                </div>
              ))}
            </div>
          </article>
        )}

        {/* 章節 7: 常見問題 FAQ (可展開閱讀) */}
        <section id="rules-faqs" className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-7 space-y-3.5 shadow-2xs">
          <div className="flex items-center gap-2 text-stone-500 font-bold text-xs uppercase tracking-wider">
            <HelpCircle className="w-4 h-4 text-stone-500" />
            <span>常見問題解答 (FAQ)</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-stone-900">規則詳解與參賽疑難排解</h2>

          <div className="space-y-2.5 pt-1">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-stone-200 overflow-hidden bg-stone-50/50 transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-3.5 text-left font-semibold text-xs sm:text-sm text-stone-800 flex items-center justify-between gap-3 cursor-pointer hover:bg-stone-100/70"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-stone-200 text-stone-700 text-xs font-bold flex items-center justify-center shrink-0">
                      Q
                    </span>
                    <span>{faq.q}</span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-stone-400 transition-transform shrink-0 ${
                      openFaqIndex === idx ? 'rotate-180 text-stone-700' : ''
                    }`}
                  />
                </button>
                {openFaqIndex === idx && (
                  <div className="px-4 pb-4 pt-1 text-xs text-stone-600 leading-relaxed border-t border-stone-200 bg-white">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 底部導覽捷徑行動卡片 (簡約正式深色商務卡片) */}
        <div className="p-7 sm:p-8 rounded-2xl bg-stone-900 border border-stone-800 text-white space-y-3.5 shadow-sm text-center">
          <h3 className="text-lg sm:text-xl font-bold">準備好踏出新創實戰驗證的第一步了嗎？</h3>
          <p className="text-xs sm:text-sm text-stone-300 max-w-lg mx-auto leading-relaxed">
            無論是個人獨立創客、創新團隊、手握真實產業痛點的創作者，或是產學專業人士，創星季皆為您量身打造專屬舞台！
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('submit')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white text-stone-950 hover:bg-stone-100 font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-2"
            >
              <span>立即投稿提案</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('participant')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white border border-stone-700 font-bold text-xs sm:text-sm shadow-2xs transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4 text-stone-300" />
              <span>參賽者 / 團隊報名</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('judge')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white border border-stone-700 font-bold text-xs sm:text-sm shadow-2xs transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-stone-300" />
              <span>成為專家評審</span>
            </button>
          </div>
        </div>
      </main>

      {/* 規章條款彈跳視窗 Modal */}
      {termsModalKey && (
        <CompetitionTermsModal
          isOpen={true}
          initialDoc={termsModalKey}
          onClose={() => setTermsModalKey(null)}
        />
      )}
    </div>
  );
};

