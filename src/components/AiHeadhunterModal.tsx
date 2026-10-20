import React, { useState } from 'react';
import { BaiMiao } from './baimiao/BaiMiao';
import { useApp } from '../context/AppContext';
import { Solver } from '../types';
import { marketAdvisorAgent } from '../services/marketAdvisorAgent';
import { HelpTooltip } from './HelpTooltip';
import { GuestBoardGateBlurOverlay } from './GuestBoardGateBlurOverlay';
import { isGuestUser } from '../utils/userDisplay';
import {
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  Coins,
  ShieldCheck,
  Star,
  MessageSquare,
  X,
  Zap,
  RefreshCw,
  RotateCw,
  Gift,
} from 'lucide-react';

interface AiHeadhunterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSolver: (solver: Solver) => void;
  onOpenChat?: (solver: Solver) => void;
}

interface HeadhunterRecommendation {
  solver: Solver;
  matchScore: number;
  matchReason: string;
  keyStrengths: string[];
  recommendedRole: string;
}

const POPULAR_HEADHUNTER_PROMPTS = [
  '生醫醫療器材 FDA 認證與專利法規資深顧問',
  '大型語言模型微調（Fine-tuning）與本地私有化部署架構師',
  '跨境電商獨立站流量投放與品牌出海操盤手',
  '新創商業計畫書（BP）審查與股權融資談判專家',
  '產品工業設計與 3D 結構模具開模資深工程師',
];

export const AiHeadhunterModal: React.FC<AiHeadhunterModalProps> = ({
  isOpen,
  onClose,
  onSelectSolver,
  onOpenChat,
}) => {
  const {
    currentUser,
    setCurrentUser,
    solvers,
    startDirectChat,
    addNotification,
    openRechargePage,
    getAdminRemainingDailyQuota,
    openAuthModal,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<HeadhunterRecommendation[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<React.ReactNode | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [searchHistoryCount, setSearchHistoryCount] = useState(0);
  const [seenSolverIds, setSeenSolverIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const adminQuota = getAdminRemainingDailyQuota ? getAdminRemainingDailyQuota(currentUser.id) : 50000;
  const currentBalance = currentUser.role === 'admin'
    ? (typeof currentUser.balance === 'number' && currentUser.balance > 0 ? currentUser.balance : adminQuota)
    : (currentUser.balance || 0);
  // 第一次搜尋 30 點，第二次或之後 40 點
  const isFirstSearch = searchHistoryCount === 0;
  const currentSearchCost = isFirstSearch ? 30 : 40;
  const isInsufficientPoints = currentBalance < currentSearchCost;

  const executeHeadhunterSearch = async () => {
    // 嚴格前置防線：點數不足一律禁止執行任何功能
    if (isInsufficientPoints) {
      setErrorMessage(
        <div className="flex items-center gap-1.5 flex-wrap">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>點數不足！目前可用餘額為 {currentBalance} 點（需 {currentSearchCost} 點），已嚴格阻斷執行。請</span>
          <button
            type="button"
            onClick={() => {
              onClose();
              openRechargePage();
            }}
            className="px-2 py-0.5 rounded-md bg-rose-200 hover:bg-rose-300 text-rose-950 font-black underline cursor-pointer transition-colors"
          >
            ［先去儲值］
          </button>
          <span>後再使用。</span>
        </div>
      );
      return;
    }

    if (!searchQuery.trim()) {
      setErrorMessage('請輸入您想尋找的專家專長、領域或遇到的核心痛點需求！');
      return;
    }

    setErrorMessage(null);
    setSuccessNotice(null);
    setIsSearching(true);

    try {
      // 1. Filter out previously seen solvers (每次都不重複)
      let candidatePool = solvers.filter((s) => !seenSolverIds.includes(s.id));
      if (candidatePool.length === 0) {
        candidatePool = solvers;
        setSeenSolverIds([]);
      }

      let topMatches: HeadhunterRecommendation[] = [];

      // 2. 調用專屬 AI Agent「市場顧問」進行嚴格調查與篩選
      try {
        const agentResult = await marketAdvisorAgent.matchHeadhunter(searchQuery, candidatePool);
        if (agentResult.matches && agentResult.matches.length > 0) {
          topMatches = agentResult.matches.map((m) => ({
            solver: m.solver,
            matchScore: m.matchScore,
            matchReason: m.matchReason,
            keyStrengths: m.keyStrengths,
            recommendedRole: m.recommendedRole,
          }));
        }
      } catch (agentErr) {
        console.warn('Market Advisor Agent headhunter search failed, evaluating with local rules:', agentErr);
      }

      // 3. 嚴格本地調查與語意特徵萃取（不設人為上下限）
      if (topMatches.length === 0) {
        const queryLower = searchQuery.toLowerCase();
        const enTokens = queryLower.match(/[a-zA-Z0-9+#.]{2,}/g) || [];
        const cnChunks = queryLower.replace(/[^\u4e00-\u9fa5]/g, ' ').split(/\s+/).filter(Boolean);
        const cnNgrams: string[] = [];
        cnChunks.forEach((chunk) => {
          if (chunk.length >= 2) {
            for (let i = 0; i <= chunk.length - 2; i++) {
              cnNgrams.push(chunk.slice(i, i + 2));
              if (i <= chunk.length - 3) cnNgrams.push(chunk.slice(i, i + 3));
            }
          }
        });
        const allTokens = Array.from(new Set([...enTokens, ...cnNgrams]));

        const techTokens = ['ai', '軟體', '架構', '程式', '雲端', '資訊', '後端', '前端', '資料庫', '演算法', '系統', 'llm', 'rag', 'saas', 'python', 'node'];
        const bizTokens = ['商業', '市場', '創業', '營運', '模式', '驗證', '產品', '增長', '異業', '分成', '策略', '諮詢'];
        const hydroTokens = ['水電', '漏水', '配電', '抓漏', '馬達', '管線', '修繕', '電線', '弱電', '水管'];
        const legalTokens = ['法律', '合約', '智財', '專利', '股權', '估值', '募資', '投資', '條款', '法規'];
        const medTokens = ['生醫', '生技', '醫療', '臨床', '藥物', '產學', '科研', '生醫材料'];
        const hrTokens = ['求職', '轉職', '薪資', '獵頭', '職涯', '面試', '主管', '領導力', '人資'];
        const marketingTokens = ['行銷', '品牌', '社群', 'kol', '流量', '募資', '文創', '曝光', '數位'];

        const scoredSolvers = candidatePool.map((solver) => {
          let matchedSkills: string[] = [];
          (solver.skills || []).forEach((sk) => {
            const skL = sk.toLowerCase();
            if (queryLower.includes(skL) || allTokens.some((t) => skL.includes(t) || (t.length >= 2 && t.includes(skL)))) {
              matchedSkills.push(sk);
            }
          });

          const sTitle = (solver.title || '').toLowerCase();
          const sDomain = (solver.domain || '').toLowerCase();
          const sSub = (solver.subcategory || solver.subdomain || '').toLowerCase();

          let titleHits = 0;
          allTokens.forEach((t) => {
            if (t.length >= 2 && sTitle.includes(t)) titleHits++;
          });

          // 1. 核心專長技能匹配 (0 ~ 50 pts)
          let skillScore = 0;
          if (matchedSkills.length >= 3) skillScore = 48;
          else if (matchedSkills.length === 2) skillScore = 38;
          else if (matchedSkills.length === 1) skillScore = 26;

          if (titleHits > 0) skillScore = Math.min(50, skillScore + titleHits * 8);

          // 2. 領域意圖與分類深度契合 (0 ~ 30 pts)
          let domainScore = 0;
          const isTech = allTokens.some((t) => techTokens.includes(t));
          const isBiz = allTokens.some((t) => bizTokens.includes(t));
          const isHydro = allTokens.some((t) => hydroTokens.includes(t));
          const isLegal = allTokens.some((t) => legalTokens.includes(t));
          const isMed = allTokens.some((t) => medTokens.includes(t));
          const isHr = allTokens.some((t) => hrTokens.includes(t));
          const isMkt = allTokens.some((t) => marketingTokens.includes(t));

          if (isHydro) {
            if (sSub.includes('水電') || sTitle.includes('水電')) domainScore = 30;
          } else if (isTech) {
            if (sSub.includes('資訊科技') || sTitle.includes('架構') || sTitle.includes('工程師')) domainScore = 30;
            else if (sDomain.includes('創新創業')) domainScore = 15;
          } else if (isBiz) {
            if (sDomain.includes('創新創業') || sSub.includes('服務餐飲') || sSub.includes('企業管理') || sTitle.includes('顧問') || sTitle.includes('產品')) domainScore = 28;
          } else if (isLegal) {
            if (sSub.includes('法律') || sTitle.includes('法')) domainScore = 30;
          } else if (isMed) {
            if (sSub.includes('生技') || sSub.includes('醫療')) domainScore = 30;
          } else if (isHr) {
            if (sSub.includes('職場') || sTitle.includes('獵頭')) domainScore = 30;
          } else if (isMkt) {
            if (sSub.includes('文創') || sTitle.includes('品牌') || sTitle.includes('行銷')) domainScore = 30;
          } else {
            if (sSub && queryLower.includes(sSub)) domainScore = 24;
            else if (sDomain && queryLower.includes(sDomain)) domainScore = 16;
          }

          const hasRelevance = skillScore > 0 || domainScore > 0;

          // 3. 實戰口碑與評價 (0 ~ 12 pts)
          let trackScore = 0;
          if (hasRelevance) {
            trackScore = Math.round(((solver.rating || 4.5) / 5) * 8) + Math.round(((solver.acceptedRate || 80) / 100) * 4);
          }

          // 4. 專家資格認證 (0 ~ 8 pts)
          let credScore = 0;
          if (hasRelevance) {
            credScore = (solver.verifiedBadge ? 5 : 2) + Math.min(3, Math.round(Math.log10(Math.max(1, solver.answerCount || 10))));
          }

          // 契合度不設人為上下限（僅限制有效範圍 0 ~ 100，不設 68 等人為地板或 96 天花板）
          const rawTotal = skillScore + domainScore + trackScore + credScore;
          const finalScore = Math.min(100, Math.max(0, Math.round(rawTotal)));

          const displaySkills = matchedSkills.length > 0 ? matchedSkills : solver.skills.slice(0, 3);
          const reason = hasRelevance
            ? `專精於「${displaySkills.join('、')}」，在 ${solver.domain} 領域擁有高度專業口碑（${solver.rating || 4.9}★），契合您所尋求之解法。`
            : `專業背景為 ${solver.domain}，專長為「${solver.skills.slice(0, 2).join('、')}」。`;

          return {
            solver,
            matchScore: finalScore,
            matchReason: reason,
            keyStrengths: displaySkills.slice(0, 3),
            recommendedRole: solver.title || '特邀認證顧問',
            hasRelevance,
          };
        });

        scoredSolvers.sort((a, b) => b.matchScore - a.matchScore);
        // 嚴格篩選：只保留契合度達標且具實質相關之專家
        const qualifying = scoredSolvers.filter((s) => s.hasRelevance && s.matchScore >= 40);
        topMatches = qualifying.slice(0, 4);
      }

      // 4. 嚴格篩選結果與核心商業規則：
      if (topMatches.length === 0) {
        setErrorMessage('【嚴格篩選通知】目前專家庫中暫無契合此特殊條件之專家，觸發安心保證：本次完全不扣點（點數已原額保留）！建議調整關鍵字重新搜尋。');
        setResults([]);
        setIsSearching(false);
        return;
      }

      if (topMatches.length < 4) {
        setSuccessNotice(`💡 嚴格篩選出 ${topMatches.length} 位高度契合專家（未滿 4 位觸發安心保證：本次完全不扣點，點數已原額保留！）`);
        addNotification({
          title: '🎯 AI 獵頭搜尋完成（未滿 4 位免扣點）',
          message: `為您的需求「${searchQuery}」嚴格篩選出 ${topMatches.length} 位專家。因未達 4 位標準，本次搜尋完全免費不扣點！`,
          type: 'system',
        });
        setResults(topMatches);
        setIsSearching(false);
        return;
      }

      // 5. 搜出滿 4 位，正常扣點（首搜 30 點，之後 40 點）
      setCurrentUser((prev) => ({
        ...prev,
        balance: Math.max(0, (prev.balance || 0) - currentSearchCost),
      }));

      addNotification({
        title: `🎯 AI Agent「市場顧問」專家推薦完成（${isFirstSearch ? '首搜優惠 -30 點' : '-40 點'}）`,
        message: `已為您的需求「${searchQuery}」精準推薦 4 位全新頂尖專家，扣除 ${currentSearchCost} 點！`,
        type: 'system',
      });

      // 記錄已推薦的專家 ID，確保下次「再搜一次」不會重複
      const newSeenIds = topMatches.map((m) => m.solver.id);
      setSeenSolverIds((prev) => [...prev, ...newSeenIds]);
      setSearchHistoryCount((prev) => prev + 1);
      setResults(topMatches);
      setIsSearching(false);
    } catch (err) {
      console.error('Headhunter search error:', err);
      setIsSearching(false);
    }
  };

  const handleStartChat = (solver: Solver) => {
    startDirectChat({
      id: solver.id,
      name: solver.name,
      avatar: solver.avatar,
      title: solver.title,
    });
    if (onOpenChat) {
      onOpenChat(solver);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-7 max-w-2xl w-full shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 text-[11px] font-black inline-flex items-center gap-1 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 fill-stone-950" />
                <span>AI Agent「市場顧問」智慧獵頭</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200 inline-flex items-center gap-1">
                <Gift className="w-3 h-3 text-amber-700" />
                <span>{isFirstSearch ? '首搜特惠 30 點 • 次回 40 點' : '每次 40 點 • 推薦不重複'}</span>
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">
              精準延攬各領域頂尖智庫專家
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              輸入您的特定痛點或專業條件，AI Agent「市場顧問」即刻深入調查並嚴格篩選全站專家庫，契合度真實評估，精準推薦人選（未滿 4 位不扣點）。
            </p>
          </div>

          <div className="flex items-start gap-1 shrink-0">
            {/* 市場顧問白喵拿望遠鏡幫你找人 */}
            <BaiMiao
              action={results && results.length > 0 && !isSearching ? 'cheer' : 'binoculars'}
              size={84}
              bubbleSide="left"
              bubble={
                isSearching
                  ? { text: '白喵正在幫你找專家', busy: true }
                  : results && results.length > 0
                  ? { text: `找到 ${results.length} 位人選！` }
                  : null
              }
              className="-my-2 hidden min-[380px]:block"
            />
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Input Box */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-stone-850">
              描述您想找的專家條件或問題需求：
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') executeHeadhunterSearch();
                }}
                placeholder="例如：生醫醫療器材 FDA 認證專家、跨境獨立站行銷操盤手..."
                className="w-full p-3.5 pr-10 rounded-2xl border border-stone-200 bg-stone-50 text-xs font-medium text-stone-900 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-hidden transition-all shadow-2xs"
              />
              <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Quick Preset Pills */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-stone-500">熱門延攬方向：</span>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_HEADHUNTER_PROMPTS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSearchQuery(preset);
                    if (isInsufficientPoints) {
                      setErrorMessage(
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>點數不足！目前可用餘額為 {currentBalance} 點（需 {currentSearchCost} 點），已嚴格阻斷執行。請</span>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              openRechargePage();
                            }}
                            className="px-2 py-0.5 rounded-md bg-rose-200 hover:bg-rose-300 text-rose-950 font-black underline cursor-pointer transition-colors"
                          >
                            ［先去儲值］
                          </button>
                          <span>後再使用。</span>
                        </div>
                      );
                    } else if (errorMessage) {
                      setErrorMessage(null);
                    }
                  }}
                  className="px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-amber-100 hover:text-amber-950 text-stone-700 text-[11px] font-bold transition-all cursor-pointer border border-stone-200/70"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Points Status & Action Button */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
            {/* Top row: [左: 深度媒合4位專家 + ?鍵詳細說明]  [右上角小小的: 餘額: 1000點] */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-black text-stone-850 text-xs sm:text-sm">
                <Zap className="w-4 h-4 text-amber-600 fill-amber-500 shrink-0" />
                <span>深度媒合 4 位專家</span>
                <HelpTooltip
                  title="AI 獵頭計費與安心保證規則"
                  content={
                    <div className="space-y-2 text-[11px] text-stone-600">
                      <div className="p-2 rounded-xl bg-amber-50/80 border border-amber-200/80 space-y-1">
                        <span className="font-bold text-amber-950 flex items-center gap-1">
                          🪙 計費規則
                        </span>
                        <p className="leading-relaxed">
                          • <strong>首次搜尋</strong>：特惠 <strong>30 點</strong><br />
                          • <strong>第二回起</strong>：每次 <strong>40 點</strong>
                        </p>
                      </div>

                      <div className="p-2 rounded-xl bg-emerald-50/80 border border-emerald-200/80 space-y-1">
                        <span className="font-bold text-emerald-950 flex items-center gap-1">
                          🛡️ 安心雙重保證
                        </span>
                        <p className="leading-relaxed">
                          1. <strong>推薦絕不重複</strong>：點擊「再搜一次」自動排除已推薦人選，每次皆推薦全新 4 位頂尖專家。<br />
                          2. <strong>未滿 4 位不扣點</strong>：若智庫中符合條件之專家不足 4 位，本次搜尋<strong>完全免費（不扣點）</strong>！
                        </p>
                      </div>

                      <p className="text-[10px] text-stone-400">
                        💡 提示：帳戶餘額需達搜尋低標門檻方可啟動；若餘額不足將嚴格阻斷執行並引導先去儲值。
                      </p>
                    </div>
                  }
                />
              </div>

              <div className="flex items-center gap-1 text-[11px] font-bold text-stone-600 bg-white/90 px-2 py-0.5 rounded-lg border border-amber-200/80 shadow-2xs shrink-0">
                <Coins className="w-3 h-3 text-amber-600 shrink-0" />
                <span>餘額: <strong className={`font-mono ${isInsufficientPoints ? 'text-rose-600' : 'text-stone-900'}`}>{currentBalance.toLocaleString()} 點</strong></span>
              </div>
            </div>

            {/* Bottom row: Action Buttons */}
            <div className="flex items-center gap-2">
              {isInsufficientPoints ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    openRechargePage();
                  }}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-yellow-200 active:scale-95 text-stone-950 font-black text-xs sm:text-sm cursor-pointer flex items-center justify-center gap-1.5 shadow-xs transition-all border border-amber-400 group animate-pulse"
                  title="點數不足，點擊前往儲值頁面"
                >
                  <Coins className="w-4 h-4 text-amber-900 group-hover:scale-110 transition-transform shrink-0" />
                  <span>點數不足（目前 {currentBalance} 點 / 需 {currentSearchCost} 點），已阻斷執行，點此［先去儲值］➔</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={executeHeadhunterSearch}
                  disabled={isSearching}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 active:scale-95 disabled:opacity-50 text-stone-950 font-black text-sm cursor-pointer flex items-center justify-center gap-1.5 shadow-xs transition-all"
                >
                  {isSearching ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-stone-950" />
                      <span>AI 獵頭全庫掃描中...</span>
                    </>
                  ) : results ? (
                    <>
                      <RotateCw className="w-4 h-4 text-stone-950 stroke-[2.5]" />
                      <span>再搜一次（精選另外 4 位專家，-{currentSearchCost} 點）</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-stone-950" />
                      <span>啟動 AI 獵頭（{isFirstSearch ? '首搜特惠 -30 點' : `-${currentSearchCost} 點`}）</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {successNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}
        </div>

        {/* Results Section */}
        {results && (
          <div className="space-y-4 pt-2 border-t border-stone-100 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <h4 className="font-black text-xs sm:text-sm text-stone-900">
                  AI 獵頭精選推薦報告（已精準匹配 {results.length} 位顧問，名單不重複）
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-stone-500 font-mono">
                  已搜尋 {searchHistoryCount} 次（累計篩選 {seenSolverIds.length} 位）
                </span>
              </div>
            </div>

            {(() => {
              const isGuest = isGuestUser(currentUser);
              const visibleResults = isGuest ? results.slice(0, 3) : results;

              const renderMatchCard = (rec: HeadhunterRecommendation, isBlurred = false) => (
                <div
                  key={rec.solver.id}
                  className="p-4 rounded-2xl border border-amber-200/90 bg-gradient-to-b from-white to-stone-50/50 hover:border-amber-400 hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2.5">
                    {/* Top match score & rating */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-stone-950 font-black text-[10px] shadow-2xs">
                        契合度 {rec.matchScore}%
                      </span>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-stone-700">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        <span>{rec.solver.rating || 5.0}</span>
                        <span className="text-stone-400 text-[10px]">({rec.solver.answerCount || 12} 次解答)</span>
                      </div>
                    </div>

                    {/* Solver Profile Snapshot */}
                    <div
                      onClick={() => {
                        if (isBlurred || isGuest) {
                          onClose();
                          openAuthModal('login');
                          return;
                        }
                        onSelectSolver(rec.solver);
                      }}
                      className="flex items-center gap-2.5 cursor-pointer group"
                    >
                      <img
                        src={rec.solver.avatar}
                        alt={rec.solver.name}
                        className="w-10 h-10 rounded-xl object-cover ring-2 ring-amber-300 shadow-2xs"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <h5 className="font-black text-xs text-stone-900 group-hover:text-amber-700 transition-colors truncate">
                            {rec.solver.name}
                          </h5>
                          {rec.solver.verifiedExpert && (
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-stone-500 truncate">{rec.recommendedRole}</p>
                      </div>
                    </div>

                    {/* AI Headhunter Insight */}
                    <p className="text-[11px] text-stone-600 bg-amber-50/60 p-2.5 rounded-xl border border-amber-100 leading-relaxed">
                      💡 <strong>推薦理由：</strong>{rec.matchReason}
                    </p>

                    {/* Skills pills */}
                    <div className="flex flex-wrap gap-1">
                      {rec.keyStrengths.map((skill, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-stone-200 text-stone-700"
                        >
                          #{skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (isBlurred || isGuest) {
                          onClose();
                          openAuthModal('login');
                          return;
                        }
                        onSelectSolver(rec.solver);
                      }}
                      className="text-xs font-bold text-stone-600 hover:text-stone-900 underline cursor-pointer"
                    >
                      檢視專家檔案
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (isBlurred || isGuest) {
                          onClose();
                          openAuthModal('login');
                          return;
                        }
                        handleStartChat(rec.solver);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-95 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                      <span>發起私訊洽談</span>
                    </button>
                  </div>
                </div>
              );

              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {visibleResults.map((rec) => renderMatchCard(rec))}
                  </div>

                  {isGuest && results.length > 3 && (
                    <GuestBoardGateBlurOverlay
                      remainingCount={results.length - 3}
                      totalCount={results.length}
                      boardName="AI 獵頭專家媒合名單"
                      onOpenAuth={() => {
                        onClose();
                        openAuthModal('login');
                      }}
                    />
                  )}
                </>
              );
            })()}

            {/* Bottom "再搜一次" Action Bar */}
            <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80">
              <div className="text-xs text-stone-700">
                <span className="font-bold text-stone-900">想查看其他方向的頂尖顧問？</span>
                <p className="text-[11px] text-stone-500">點擊再搜一次將為您即時篩選另外 4 位全新專家（保證不重複，未滿 4 位不扣點）。</p>
              </div>

              {isInsufficientPoints ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    openRechargePage();
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-xs transition-all shrink-0 active:scale-95"
                >
                  <Coins className="w-3.5 h-3.5 text-stone-950" />
                  <span>點數不足，［先去儲值］➔</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={executeHeadhunterSearch}
                  disabled={isSearching}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-stone-900 to-stone-800 hover:from-stone-850 hover:to-stone-750 text-amber-300 font-black text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-xs transition-all shrink-0 active:scale-95 disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 text-amber-400 ${isSearching ? 'animate-spin' : ''}`} />
                  <span>再搜一次（-{currentSearchCost} 點）</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
