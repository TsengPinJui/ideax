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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { STAR_SEASON_TRACKS } from '../../types/competition';
import {
  COMPETITION_RULES_A,
  GENERAL_USER_TERMS_B,
  PARTICIPANT_TERMS_C,
  EXPERT_JUDGE_TERMS_D,
  PLATFORM_GUIDE_E,
} from '../../data/competitionTermsData';
import { CompetitionTermsModal, CompetitionDocumentKey } from './CompetitionTermsModal';

interface RulesFullPageProps {
  onNavigate: (view: 'home' | 'proposal' | 'explore' | 'rules' | 'submit' | 'participant' | 'judge' | 'ambassador') => void;
  onBackToOldSite: () => void;
  onOpenAuth: () => void;
  onOpenAmbassadorModal?: () => void;
}

export const RulesFullPage: React.FC<RulesFullPageProps> = ({
  onNavigate,
  onBackToOldSite,
  onOpenAuth,
  onOpenAmbassadorModal,
}) => {
  const { currentUser } = useApp();
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
      a: '第二階段大眾注資模擬旨在測試市場反應力與社群關注度。模擬募資達成度前 20 名之優秀提案將直接取得「入圍決選資格」。第三階段由大會產學研專家與導師進行專業審查、深度指導與評分（創新突破性 40%、商業可行性 35%、社會與產業價值 25%），決選出前三名獲獎隊伍（冠軍 NT$30,000、亞軍 NT$10,000、季軍 NT$4,000）。',
    },
    {
      q: '「痛點提出者」如何獲得 100 點痛點獎勵與價值 NT$1,500 採用好禮？',
      a: '只要成功提出痛點（需過審）即送 100 點（價值 $125 的 IdeaX 創點子平台點數，可用於發布懸賞問題、享受付費功能，點數效期 60 日）。此外，若參賽團隊選用並解決該痛點，且該解方提案最終經特聘專家評審評定為前三名（冠、亞、季軍），原痛點之提出者即可另獲價值 NT$1,500 等值好禮（含 1,200 點 IdeaX 平台提問金），共同共享創新成果！',
    },
    {
      q: '校園推廣大使獎勵 400 點的核發條件是什麼？',
      a: '校園推廣大使只要分享專屬推薦代碼或連結，邀請新創團隊提交提案。被推薦之專案經主辦單位初審通過，推薦人即可獲得 400 點 IdeaX 平台點數獎勵（用於發布提問、享受付費功能）！獎勵無上限，多推多得。',
    },
    {
      q: '參賽隊伍有年齡或身分限制嗎？非在學生可以參賽嗎？',
      a: 'IdeaX 創星季參賽者體驗機制主要鼓勵在學生、碩博士生及青年創業團隊投件；亦開放社會青年創客與跨校跨界團隊組隊報名。每隊人數建議 1–5 人，可配置 1 名指導老師或業界業師。',
    },
    {
      q: '同一團隊可以投稿多個提案嗎？有類別或賽道限制嗎？',
      a: '可以！此競賽不另設類別限制，只要是解決所提痛點且需求獲市場認同、技術受專家認可即可。提案時仍可自由標注相關領域（分類僅作為方便識別不作為競賽依據）。同一團隊可針對不同痛點提交多項獨立提案。',
    },
    {
      q: '分享推薦碼領取 100 創星幣的防刷機制如何運作？',
      a: '每位登入用戶點擊「分享推薦碼領 100 創星幣」，系統將由可信後端為您的競賽錢包增加 100 創星幣。為維護競賽公平，每個帳號終身嚴格限領一次，創星幣獨立於舊站真實 Balance，不影響舊站任何帳戶資產。',
    },
    {
      q: '創星季的活動時程如何安排？',
      a: '競賽各階段明確時程如下：\n• 10/31 ～ 11/13：第一階段：痛點徵件（全體用戶發布產業/生活切身痛點）\n• 11/14 ～ 12/04：第二階段：模擬募資（全體會員使用創星幣進行模擬注資與投票。募資總額前 20 名 取得入圍決選資格）\n• 12/05 ～ 12/11：第三階段：進入決選（由大會產學研專家與導師進行專業審查、深度指導與評分）\n• 12/16 前公布：第四階段：公布結果（於首頁盛大公告最終榜單，頒發榮譽與獎勵）',
    },
  ];

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-24 font-sans">
      {/* 獨立頂部導覽列 */}
      <header className="bg-white/95 border-b border-amber-200 sticky top-0 z-40 backdrop-blur-md shadow-xs">
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
                <img src="/logo-bulb.png" alt="IdeaX - 點擊回舊站首頁" className="w-8.5 h-8.5 sm:w-10 sm:h-10 md:w-12 md:h-12 object-contain shrink-0 drop-shadow-xs group-hover:scale-105 transition-all" />
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
            {/* 1. 我想提案! */}
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
            >
              <Send className="w-3.5 h-3.5 text-stone-950" />
              <span>我想提案!</span>
            </button>

            <div className="h-4 w-px bg-stone-300/80 mx-0.5" />

            {/* 2. 探索Idea */}
            <button
              type="button"
              onClick={() => onNavigate('proposal')}
              className="hidden sm:inline-flex px-3 py-1.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-white transition-all cursor-pointer font-bold"
            >
              探索Idea
            </button>

            {/* 3. 先看痛點 */}
            <button
              type="button"
              onClick={onBackToOldSite}
              className="hidden sm:inline-flex px-3 py-1.5 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-white transition-all cursor-pointer font-bold"
              title="前往舊站 創點子/痛點專區"
            >
              先看痛點
            </button>

            {/* 4. 申請參賽者 */}
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
              申請參賽者
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

            {/* 行動版先看痛點 (風格一致) */}
            <button
              onClick={onBackToOldSite}
              className="sm:hidden inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-98"
              title="前往舊站 創點子/痛點專區"
            >
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              <span>先看痛點</span>
            </button>
          </div>
        </div>
      </header>

      {/* 滿版 Hero 標題區 */}
      <section className="bg-gradient-to-b from-amber-100/70 via-yellow-50/50 to-stone-50 border-b border-amber-200/70 pt-10 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold shadow-2xs">
            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
            <span>【正式官方規章】IdeaX 創星季 實戰手冊與平台使用方法</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-stone-950 tracking-tight leading-snug">
            競賽辦法 • 平台使用方法
          </h1>

          <p className="text-xs sm:text-sm text-stone-700 max-w-2xl mx-auto leading-relaxed">
            完整掌握兩階段遞進機制、四大階段時程規劃、創星幣模擬募資、專家決選維度、痛點提出者獎勵與平台操作步驟。
          </p>

          {/* A / E 兩大核心切換分頁標籤 */}
          <div className="inline-flex items-center gap-2 p-1.5 bg-white border border-amber-300 rounded-2xl shadow-xs">
            <button
              type="button"
              onClick={() => setActiveMainTab('A_rules')}
              className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeMainTab === 'A_rules'
                  ? 'bg-amber-400 text-stone-950 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>A. 競賽辦法規章</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMainTab('E_guide')}
              className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeMainTab === 'E_guide'
                  ? 'bg-amber-400 text-stone-950 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>E. 平台使用方法（操作指南）</span>
            </button>
          </div>

          {/* 規章條款快速閱覽捷徑列 (B, C, D) */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-stone-500 font-bold">查看其他規範：</span>
            <button
              type="button"
              onClick={() => setTermsModalKey('B')}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold transition-all cursor-pointer shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>B. 一般用戶條款</span>
            </button>
            <button
              type="button"
              onClick={() => setTermsModalKey('C')}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white hover:bg-blue-50 border border-blue-300 text-blue-800 font-bold transition-all cursor-pointer shadow-2xs"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>C. 參賽者條款</span>
            </button>
            <button
              type="button"
              onClick={() => setTermsModalKey('D')}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white hover:bg-purple-50 border border-purple-300 text-purple-800 font-bold transition-all cursor-pointer shadow-2xs"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>D. 專家評審條款</span>
            </button>
          </div>
        </div>
      </section>

      {/* 滿版主體內容區塊 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10">
        {/* ========================================================================= */}
        {/* VIEW A: 競賽辦法 (Official Rules) */}
        {/* ========================================================================= */}
        {activeMainTab === 'A_rules' && (
          <div className="space-y-10">
            {/* 章節 1: 活動宗旨與平台定位 */}
            <section id="rules-mission" className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex items-center gap-2.5 text-amber-700 font-black text-sm">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>第一章 • 活動宗旨與平台定位</span>
              </div>
              <h2 className="text-xl font-black text-stone-900">推動青年真實痛點發掘與解方驗證</h2>
              <div className="space-y-3 text-xs sm:text-sm text-stone-700 leading-relaxed">
                <p>
                  IdeaX 創星季建立真實市場驗證與產學業師對接機制。
                </p>
                <p>
                  本競賽強調「<b>先有痛點、後有解方</b>」的核心理念，旨在培育青年創客深度扎根產業與生活痛點，並透過廣大社群創星幣注資與專業專家深度評選，完成從「創新點子」到「原型落地」的第一哩路。
                </p>
                <div className="mt-3 p-4 rounded-2xl bg-amber-50/90 border border-amber-300 text-stone-800 space-y-1.5">
                  <div className="font-black text-amber-950 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>平台帳號整合與內容刊登存取約定</span>
                  </div>
                  <p className="text-xs text-stone-700 leading-relaxed">
                    同意此競賽規章條款即同意註冊 <b>IdeaX 創點子平台（ideax.tw）</b>，並同意由系統自動刊登與存取競賽期間於競賽網所提出的痛點、提案內容、解方計畫及社群討論內容，以利後續產學對接、資源媒合與成果展現。
                  </p>
                </div>
              </div>
            </section>

            {/* 章節 2: 競賽重要時程規劃 */}
            <section id="rules-stages" className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-5 shadow-xs">
              <div className="flex items-center gap-2.5 text-amber-700 font-black text-sm">
                <Calendar className="w-5 h-5 text-amber-500" />
                <span>第二章 • 競賽重要時程規劃（四階段進行）</span>
              </div>
              <h2 className="text-xl font-black text-stone-900">徵點子發掘問題，想解方商業落地</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950 font-black text-xs">
                    第一階段
                  </div>
                  <div className="text-sm font-black text-stone-950">痛點徵件</div>
                  <div className="text-xs font-bold text-amber-700 font-mono">10/31 – 11/13</div>
                  <p className="text-xs text-stone-700 leading-relaxed">
                    全體用戶提出產業難題、生活不便或切身痛點。<b>只要成功提出痛點（需過審）即送 100 點（價值 $125 點數，效期 60 日）</b>，開放各隊選題解題。
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-950 font-black text-xs">
                    第二階段
                  </div>
                  <div className="text-sm font-black text-stone-950">模擬募資</div>
                  <div className="text-xs font-bold text-emerald-700 font-mono">11/14 – 12/04</div>
                  <p className="text-xs text-stone-700 leading-relaxed">
                    全體會員使用創星幣進行模擬注資與投票。募資總額前 20 名 取得入圍決選資格。
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-2">
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-purple-200 text-purple-950 font-black text-xs">
                    第三階段
                  </div>
                  <div className="text-sm font-black text-stone-950">進入決選</div>
                  <div className="text-xs font-bold text-purple-700 font-mono">12/05 – 12/11</div>
                  <p className="text-xs text-stone-700 leading-relaxed">
                    由大會產學研專家與導師進行專業審查、深度指導與評分。
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-yellow-50/60 border border-yellow-200 space-y-2">
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-yellow-300 text-yellow-950 font-black text-xs">
                    第四階段
                  </div>
                  <div className="text-sm font-black text-stone-950">公布結果</div>
                  <div className="text-xs font-bold text-yellow-800 font-mono">12/16 前公布</div>
                  <p className="text-xs text-stone-700 leading-relaxed">
                    於首頁盛大公告最終榜單，頒發榮譽與獎勵
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-600 space-y-1">
                <div className="font-bold text-stone-800 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>重要時程規劃一覽：</span>
                </div>
                <p>• <b>痛點徵件：</b>10/31 – 11/13（開放大眾發布痛點與選題提案）</p>
                <p>• <b>模擬募資：</b>11/14 – 12/04（全體會員使用創星幣進行模擬注資與投票。募資總額前 20 名 取得入圍決選資格）</p>
                <p>• <b>進入決選：</b>12/05 – 12/11（由大會產學研專家與導師進行專業審查、深度指導與評分）</p>
                <p>• <b>公布結果：</b>12/16 前於首頁盛大公告最終榜單，頒發榮譽與獎勵</p>
              </div>
            </section>

            {/* 章節 3: 競賽分類與專案領域標注 */}
            <section id="rules-tracks" className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-5 shadow-xs">
              <div className="flex items-center gap-2.5 text-amber-700 font-black text-sm">
                <Layers className="w-5 h-5 text-amber-500" />
                <span>第三章 • 競賽分類與領域標注規範</span>
              </div>
              <div>
                <h2 className="text-xl font-black text-stone-900">不另設競賽類別，專注解決真實痛點</h2>
                <p className="text-xs sm:text-sm text-amber-800 font-bold mt-1 bg-amber-50/80 p-3 rounded-2xl border border-amber-200 leading-relaxed">
                  💡 <b>競賽分類原則：</b>此競賽不另設類別，只要是解決所提痛點且需求獲市場認同、技術受專家認可即可。提案時仍可自由標注相關領域。（分類僅作為方便識別不作為競賽依據）
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.values(STAR_SEASON_TRACKS).map((tr) => (
                  <div key={tr.id} className="p-5 rounded-2xl bg-stone-50 border border-stone-200 hover:border-amber-300 transition-all space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-stone-900 text-sm">{tr.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        {tr.tag}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      {tr.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* 章節 4: 模擬募資與大眾參與 */}
            <section id="rules-crowdfunding" className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex items-center gap-2.5 text-amber-700 font-black text-sm">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                <span>第四章 • 模擬募資機制與創星幣規範</span>
              </div>
              <h2 className="text-xl font-black text-stone-900">使用 創星幣 支持你認同的創新提案，模擬市場關注度</h2>
              <div className="space-y-3 text-xs sm:text-sm text-stone-700 leading-relaxed">
                <p>
                  1. <b>使用 創星幣 支持：</b>使用 創星幣 支持你認同的創新提案，模擬市場關注度。每件解方提案基準募資目標為 100,000 創星幣（達成率以實獲創星幣百分比計算）。
                </p>
                <p>
                  2. <b>創星幣配發額度：</b>新進註冊用戶與一般參賽者享 100,000 創星幣；點擊分享推廣推薦碼領 100 創星幣。特聘評審團專享 3,000,000 創星幣專業額度。
                </p>
                <p>
                  3. <b>公正防弊防刷：</b>禁止自投本人提案，一般用戶單案上限 50,000 創星幣、提案者單案 30,000 創星幣、專家單案 2,000,000 創星幣。創星幣僅供模擬市場關注度，不具法幣價值、禁止兌現與購買。
                </p>
              </div>
            </section>

            {/* 章節 5: 特聘專家決選維度 */}
            <section id="rules-judging" className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex items-center gap-2.5 text-purple-800 font-black text-sm">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                <span>第五章 • 特聘專家評審團決選維度</span>
              </div>
              <h2 className="text-xl font-black text-stone-900">募資前 20 名入圍複審，產學業師深度評比</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 text-center space-y-1">
                  <div className="text-xs font-bold text-purple-900">創新突破性</div>
                  <div className="font-mono font-black text-2xl text-purple-700">40%</div>
                  <p className="text-[11px] text-stone-500">技術門檻、創意思維與差異化優勢</p>
                </div>
                <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 text-center space-y-1">
                  <div className="text-xs font-bold text-purple-900">商業可行性</div>
                  <div className="font-mono font-black text-2xl text-purple-700">35%</div>
                  <p className="text-[11px] text-stone-500">營運模式、成本規劃與落地可行度</p>
                </div>
                <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 text-center space-y-1">
                  <div className="text-xs font-bold text-purple-900">產業與社會價值</div>
                  <div className="font-mono font-black text-2xl text-purple-700">25%</div>
                  <p className="text-[11px] text-stone-500">痛點解決深度與永續影響力</p>
                </div>
              </div>
            </section>

            {/* 章節 6: 獎項制度與痛點採用獎勵 */}
            <section id="rules-awards" className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex items-center gap-2.5 text-amber-700 font-black text-sm">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span>第六章 • 獎項榮譽與痛點採用回饋</span>
              </div>
              <h2 className="text-xl font-black text-stone-900">高額獎金、創之星徽章與雙向獎勵機制</h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-100 to-yellow-50 border border-amber-300 text-center space-y-1">
                  <div className="text-xs font-black text-amber-900">冠軍 (First Prize)</div>
                  <div className="font-mono font-black text-xl text-stone-900">NT$30,000</div>
                  <div className="text-[11px] text-amber-800 font-bold">官方「創之星」徽章 + 證書</div>
                </div>
                <div className="p-4 rounded-2xl bg-stone-100 border border-stone-300 text-center space-y-1">
                  <div className="text-xs font-black text-stone-800">亞軍 (Second Prize)</div>
                  <div className="font-mono font-black text-xl text-stone-900">NT$10,000</div>
                  <div className="text-[11px] text-stone-600 font-bold">官方「創之星」徽章 + 證書</div>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-1">
                  <div className="text-xs font-black text-amber-900">季軍 (Third Prize)</div>
                  <div className="font-mono font-black text-xl text-stone-900">NT$4,000</div>
                  <div className="text-[11px] text-amber-800 font-bold">官方「創之星」徽章 + 證書</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-1.5 text-xs text-stone-700">
                  <div className="font-black text-rose-900 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-rose-600" />
                    <span>痛點提出獎：成功提出痛點（需過審）即送 100 點！</span>
                  </div>
                  <p className="leading-relaxed">
                    只要成功提出痛點（需過審）即送 100 點（價值 $125 的 IdeaX 創點子平台點數，可用於發布懸賞問題、享受付費功能，點數效期 60 日）。
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1.5 text-xs text-stone-700">
                  <div className="font-black text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>痛點採用獎：獲獎提案所引用的痛點享 $1,500 好禮！</span>
                  </div>
                  <p className="leading-relaxed">
                    若參賽解方提案經專家評審核定為前三名，原痛點之提出者將獲得價值 NT$1,500 好禮（含 1,200 點 IdeaX 提問金），肯定提出精準好問題的關鍵貢獻！
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW E: 平台使用方法 (Platform Usage Guide) */}
        {/* ========================================================================= */}
        {activeMainTab === 'E_guide' && (
          <div className="space-y-8">
            <section className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex items-center gap-2.5 text-amber-700 font-black text-sm">
                <HelpCircle className="w-5 h-5 text-amber-500" />
                <span>IdeaX 創星季 • 平台使用方法與 7 大操作實戰教學</span>
              </div>
              <h2 className="text-xl font-black text-stone-900">輕鬆上手創星季競賽</h2>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                遵循以下標準流程，無論您是想要發布痛點賺取點數、帶領團隊投件角逐 3 萬元大獎，或是參與模擬募資注資，均能迅速熟悉各項功能。
              </p>

              <div className="space-y-4 pt-2">
                {PLATFORM_GUIDE_E.steps.map((step) => (
                  <div
                    key={step.stepNumber}
                    className="p-5 rounded-2xl bg-stone-50 border border-stone-200 hover:border-amber-300 transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-full bg-amber-400 text-stone-950 font-black text-sm flex items-center justify-center font-mono shadow-2xs">
                          {step.stepNumber}
                        </span>
                        <h3 className="font-black text-stone-900 text-sm sm:text-base">
                          {step.title}
                        </h3>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-stone-200 text-stone-800">
                        {step.badge}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-stone-700 leading-relaxed pl-9">
                      {step.description}
                    </p>

                    <div className="ml-9 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 font-bold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>實戰小撇步：{step.tips}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* 章節 7: 常見問題 FAQ (可展開閱讀) */}
        <section id="rules-faqs" className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 text-amber-700 font-black text-sm">
            <HelpCircle className="w-5 h-5 text-amber-500" />
            <span>常見問題解答 (FAQ)</span>
          </div>
          <h2 className="text-xl font-black text-stone-900">規則詳解與參賽疑難排解</h2>

          <div className="space-y-3 pt-2">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-stone-200 overflow-hidden bg-stone-50/60 transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 text-left font-bold text-xs sm:text-sm text-stone-900 flex items-center justify-between gap-3 cursor-pointer hover:bg-stone-100/70"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 text-xs font-black flex items-center justify-center shrink-0">
                      Q
                    </span>
                    <span>{faq.q}</span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-stone-400 transition-transform shrink-0 ${
                      openFaqIndex === idx ? 'rotate-180 text-amber-600' : ''
                    }`}
                  />
                </button>
                {openFaqIndex === idx && (
                  <div className="px-4 pb-4 pt-1 text-xs text-stone-600 leading-relaxed border-t border-stone-200/60 bg-white">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 底部導覽捷徑行動卡片 */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-amber-400 via-amber-400 to-yellow-400 border border-amber-300 text-stone-950 space-y-4 shadow-md text-center">
          <h3 className="text-xl sm:text-2xl font-black">準備好踏出新創實戰驗證的第一步了嗎？</h3>
          <p className="text-xs sm:text-sm text-stone-900 max-w-lg mx-auto leading-relaxed">
            無論是身懷絕技的青年創客團隊、手握真實產業痛點的創作者，或是產學專業人士，創星季皆為您量身打造專屬舞台！
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('submit')}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-stone-950 text-white hover:bg-stone-800 font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-2"
            >
              <span>立即投稿提案</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('participant')}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white text-stone-900 hover:bg-stone-50 font-black text-xs sm:text-sm shadow-sm transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-2"
            >
              <GraduationCap className="w-4 h-4 text-amber-600" />
              <span>團隊參賽報名</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('judge')}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs sm:text-sm shadow-sm transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
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

