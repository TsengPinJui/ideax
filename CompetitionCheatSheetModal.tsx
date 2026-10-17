import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  FolderOpen,
  Sparkles,
  Trophy,
  Calendar,
  CheckCircle2,
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
  Users,
  Flame,
  Coins,
  ShieldCheck,
  Download,
  Copy,
  Check,
  Lock,
  Layers,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getCompetitionStageInfo } from '../../utils/competitionSchedule';
import {
  downloadCompetitionPackage,
  downloadCompetitionPdfOnly,
  downloadCompetitionDocOnly,
} from '../../services/competitionCheatSheetService';
import {
  getManagedCheatSheetFiles,
  CheatSheetManagedFile,
} from '../../services/cheatSheetFileManagerService';
import { AdminCheatSheetFileManagerModal } from './AdminCheatSheetFileManagerModal';

interface CompetitionCheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (view: 'home' | 'proposal' | 'explore' | 'rules' | 'submit' | 'participant' | 'judge' | 'ambassador') => void;
  onOpenAuth?: () => void;
}

export const CompetitionCheatSheetModal: React.FC<CompetitionCheatSheetModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenAuth,
}) => {
  const { currentUser } = useApp();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.accountType === 'admin';

  const [activeTab, setActiveTab] = useState<'visual' | 'text' | 'faq'>('visual');
  const [searchFaqQuery, setSearchFaqQuery] = useState('');
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isAdminManagerOpen, setIsAdminManagerOpen] = useState(false);
  const [managedFiles, setManagedFiles] = useState<CheatSheetManagedFile[]>([]);
  const stageInfo = getCompetitionStageInfo();

  useEffect(() => {
    if (isOpen) {
      setManagedFiles(getManagedCheatSheetFiles());
    }
  }, [isOpen]);

  useEffect(() => {
    const handleFilesChanged = () => {
      setManagedFiles(getManagedCheatSheetFiles());
    };
    window.addEventListener('ideax_cheat_sheet_files_changed', handleFilesChanged);
    return () => {
      window.removeEventListener('ideax_cheat_sheet_files_changed', handleFilesChanged);
    };
  }, []);

  if (!isOpen) return null;

  const faqs = [
    {
      q: '1. 如何獲得創星幣？創星幣能否兌換成現金？可自我注資嗎？',
      a: '使用「創星幣」支持您認同的創新提案，模擬市場關注度。競賽期間，新用戶登入創星季即配發 100,000 創星幣；點擊「分享推薦碼」可領取 100 創星幣獎勵（限領一次）。產學研專家則享有專屬 3,000,000 創星幣評選額度。單案支持上限：參賽者與一般用戶對單一解方提案上限為 50,000 創星幣，專家為 2,000,000 創星幣；可以自我注資。創星幣純屬市場模擬關注度驗證，不可購買、轉帳或兌換現金，亦不影響舊站真實錢包餘額。',
      tag: '點數與代幣',
    },
    {
      q: '2. 為什麼前 20 名進入決選？專家如何參與評選？',
      a: '第二階段大眾模擬注資旨在測試市場反應力與社群關注度。募得創星幣總額排名前 20 名之優秀提案將直接取得「入圍決選資格」。第三階段由產學研專家評審團依四大維度指標（創新性 40%、完整度 20%、可行性 20%、商業潛力 20%）進行專業打分與審查，決選出前三名獲獎隊伍（冠軍總值 NT$30,000、亞軍總值 NT$10,000、季軍總值 NT$5,000）。',
      tag: '賽制與決選',
    },
    {
      q: '3. 「痛點提出者」如何獲得 200 點痛點獎勵與採用好禮？',
      a: '只要成功提出痛點（經主辦單位審核通過）即贈送 200 點（價值 $250 的 IdeaX 創點子平台點數，可用於發布懸賞問題、享受付費功能，點數效期 60 日）。此外，若參賽團隊選用並解決該痛點，且該解方最終榮獲決審前三名，原痛點提出者另享價值 NT$1,500 等值好禮（含 1,200 點提問金）；排名前 4~10 名採用享價值 $500 好禮（含 400 點提問金，效期 60 日）。',
      tag: '痛點獎勵',
    },
    {
      q: '4. 推廣大使獎勵 300 點的核發條件是什麼？',
      a: '推廣大使只要分享專屬推薦代碼或連結，邀請個人創客或新創團隊提交提案。每成功推薦 1 案經主辦單位初審通過，推薦人即可獲得 300 點（價值 $400）IdeaX 平台點數獎勵（點數效期 60 日，用於發布提問、享受付費功能）！獎勵無上限，多推多得。',
      tag: '推廣獎勵',
    },
    {
      q: '5. 參賽者有年齡或身分限制嗎？海外人士可以參賽嗎？',
      a: '無年齡或身分限制！本活動開放國內外個人、團隊及法人參與。不論在學學生、社會人士、自由創客均可跨國組隊或獨立參賽；本活動不提供跨國跨境支付，海外獲獎團隊須提供中華民國（臺灣）境內合法金融機構或郵局之新台幣銀行帳戶以供電匯撥發，相關所得稅依法代扣。',
      tag: '海外與參賽資格',
    },
    {
      q: '6. 主辦單位是誰？活動獎金如何提供與發放？',
      a: '主辦單位為「IdeaX 創點子團隊」。活動獎金將由活動發起人/創點子團隊代表人 提供，請得獎團隊留意後續領獎資訊與官方通知。獎金將以新台幣電匯撥付至臺灣銀行帳戶，並依中華民國稅法辦理所得扣繳。',
      tag: '主辦與獎金提供',
    },
    {
      q: '7. 參賽隊伍如何計算？每隊有提案或痛點數量上限嗎？',
      a: '本競賽「以每個帳號算計一隊」，且「每隊不限提案或痛點數量」！不論個人獨立提案或 1-5 人自由組隊，均由該帳號統籌投件。可在痛點徵件階段提出多件切身痛點，在想解方階段亦可針對不同痛點提交多項創新解方。',
      tag: '隊伍限制',
    },
    {
      q: '8. 各項競賽獎勵點數的有效期限是多久？',
      a: '注意點數期限：決選前三名（冠、亞、季軍）獲獎團隊點數效期為 180 日，其餘所有獎勵點數（包含痛點過審 200 點、採用好禮、推廣推薦 300 點等）效期皆為 60 日。點數可用於 IdeaX 創點子平台發布懸賞提問或享受付費功能，請把握時間使用完畢。',
      tag: '點數效期',
    },
    {
      q: '9. 競賽各階段的時程如何安排？',
      a: '• 10/17 00:00 ～ 12/04 16:30：全競賽報名時段（※ 提痛點者請於 11/13 16:30 痛點徵件截止前完成報名）\n• 10/24 00:00 ～ 11/13 16:30：第一階段：痛點徵件（全體用戶發布產業/生活切身痛點，過審送 200 點）\n• 11/14 10:00 ～ 11/15 16:30：第二階段 (一)：預先提案（【關閉募資功能】，僅可註冊報名、在線提案、主辦單位審核及預覽）\n• 11/16 10:00 ～ 12/04 16:30：第二階段 (二)：模擬募資（【全面開放功能】，持續收件至 12/04 16:30 截止，創星幣模擬募資投票，總額前 20 名取得決選資格）\n• 12/05 ～ 12/11：第三階段：進入決選(評審)（由評審團依四大指標專業審查評分）\n• 12/12 ～ 12/16：第四階段：公布結果（首頁盛大公告最終榜單，頒發榮譽與獎勵）',
      tag: '競賽時程',
    },
  ];

  const filteredFaqs = faqs.filter(
    (item) =>
      item.q.toLowerCase().includes(searchFaqQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchFaqQuery.toLowerCase()) ||
      item.tag.toLowerCase().includes(searchFaqQuery.toLowerCase())
  );

  const handleCopyShare = () => {
    try {
      const url = typeof window !== 'undefined' ? `${window.location.origin}/challenge/rules?cheatSheet=open` : 'https://www.ideax.tw/challenge/rules';
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPackage = async () => {
    try {
      setIsDownloading(true);
      await downloadCompetitionPackage();
    } catch (e) {
      console.error('Download package error:', e);
      downloadCompetitionDocOnly();
    } finally {
      setIsDownloading(false);
    }
  };

  const enabledFiles = managedFiles.filter((f) => f.isEnabled);

  const modalContent = (
    <div
      style={{ zIndex: 2147483648 }}
      className="fixed inset-0 bg-stone-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200 text-stone-900 text-left"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl border-2 border-amber-300 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* 頂部雙層資料夾樣式模組 Header */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 p-4 sm:p-5 text-stone-950 relative shrink-0">
          <div className="absolute -top-3 left-6 px-4 py-1 bg-amber-600 text-amber-50 font-mono text-[11px] font-black rounded-t-xl border-t border-x border-amber-400 flex items-center gap-1.5 shadow-xs">
            <FolderOpen className="w-3.5 h-3.5 text-amber-200" />
            <span>OFFICIAL COMPACT FILE PACK</span>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shrink-0 shadow-xs">
                <FolderOpen className="w-7 h-7 text-stone-950 drop-shadow-xs" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-stone-950 text-amber-300 font-mono text-xs font-black">
                    IdeaX 創星季
                  </span>
                  <span className="text-xs font-bold text-amber-950/80">
                    一頁極速搞懂賽制、獎金、時程與問答
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setIsAdminManagerOpen(true)}
                      className="px-2 py-0.5 rounded-full bg-stone-950 hover:bg-stone-900 text-amber-300 text-[10px] font-black flex items-center gap-1 border border-amber-400/40 cursor-pointer shadow-xs"
                      title="開啟管理員專屬檔案管理庫，可直接存入或刪除檔案"
                    >
                      <Lock className="w-2.5 h-2.5" />
                      <span>管理員：存入/刪除檔案</span>
                    </button>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-stone-950 tracking-tight mt-0.5 flex items-center gap-2">
                  <span>競賽懶人包資料夾</span>
                  <Sparkles className="w-5 h-5 text-amber-800 animate-pulse" />
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-stone-950/10 hover:bg-stone-950/20 text-stone-950 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="關閉懶人包"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 三大頁籤導覽 (Visual / Text / FAQ) */}
          <div className="flex items-center gap-1.5 mt-4 bg-stone-950/10 p-1 rounded-2xl border border-stone-950/10 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('visual')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'visual'
                  ? 'bg-stone-950 text-amber-300 shadow-md scale-[1.02]'
                  : 'text-stone-900 hover:bg-white/30'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>📊 圖文視覺視圖</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'text'
                  ? 'bg-stone-950 text-amber-300 shadow-md scale-[1.02]'
                  : 'text-stone-900 hover:bg-white/30'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>📝 文字懶人包說明</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('faq')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'faq'
                  ? 'bg-stone-950 text-amber-300 shadow-md scale-[1.02]'
                  : 'text-stone-900 hover:bg-white/30'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>❓ 熱門 FAQ 對照表</span>
            </button>
          </div>
        </div>

        {/* 懶人包主要內容區 (Scrollable Body) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-stone-50/50">
          {/* ==================== TAB 1: 圖文視覺視圖 ==================== */}
          {activeTab === 'visual' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* 1. 賽程 4 大階段流程圖文卡片 */}
              <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                      1
                    </div>
                    <h3 className="font-black text-stone-900 text-base">
                      賽事 4 大關鍵階段流程 (Visual Roadmap)
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    目前階段：{stageInfo.stageTitle}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Phase 1 */}
                  <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-200/80 relative space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-amber-800">
                      <span>PHASE 1</span>
                      <span className="px-2 py-0.5 rounded bg-amber-200/60 text-amber-900">10/17 ~ 12/04</span>
                    </div>
                    <h4 className="font-black text-stone-900 text-sm flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>線上即刻報名</span>
                    </h4>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      大專學生、社會創客免費報名。以帳號算計一隊，個人或 1-5 人自由組隊投件！
                    </p>
                  </div>

                  {/* Phase 2 */}
                  <div className="bg-rose-50/40 p-4 rounded-2xl border border-rose-200/80 relative space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-rose-800">
                      <span>PHASE 2</span>
                      <span className="px-2 py-0.5 rounded bg-rose-200/60 text-rose-900">10/24 ~ 11/13</span>
                    </div>
                    <h4 className="font-black text-stone-900 text-sm flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-rose-600" />
                      <span>痛點許願徵件</span>
                    </h4>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      發表日常生活或產業真實痛點。痛點過審即送 <b>200 點</b>，被採納獲選前三名再拿 <b>NT$1,500</b> 好禮！
                    </p>
                  </div>

                  {/* Phase 3 */}
                  <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-200/80 relative space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-800">
                      <span>PHASE 3</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-200/60 text-emerald-900">11/16 ~ 12/04</span>
                    </div>
                    <h4 className="font-black text-stone-900 text-sm flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-emerald-600" />
                      <span>解方與模擬募資</span>
                    </h4>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      提交解方企劃！持續收件至 12/04。全民創星幣注資投票，募資總額前 20 名直通決選！
                    </p>
                  </div>

                  {/* Phase 4 */}
                  <div className="bg-purple-50/40 p-4 rounded-2xl border border-purple-200/80 relative space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-purple-800">
                      <span>PHASE 4</span>
                      <span className="px-2 py-0.5 rounded bg-purple-200/60 text-purple-900">12/05 ~ 12/16</span>
                    </div>
                    <h4 className="font-black text-stone-900 text-sm flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-purple-600" />
                      <span>專家決選與公布</span>
                    </h4>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      產學評審團四大指標專業打分。首頁盛大公告得獎榜單，頒發現金大獎與榮譽徽章！
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. 三大角色參賽權益卡 (Role Privilege Cards) */}
              <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                    2
                  </div>
                  <h3 className="font-black text-stone-900 text-base">
                    三大角色權益與獎勵制度 (Role Privileges)
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Role 1 */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-stone-950 font-black text-xs">
                        🙋‍♂️ 提案參賽者
                      </span>
                      <Sparkles className="w-4 h-4 text-amber-600" />
                    </div>
                    <ul className="text-xs text-stone-700 space-y-1.5 leading-relaxed font-medium">
                      <li className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>角逐<b>冠軍總值 NT$30,000</b>（現金2萬+8,000點）、亞軍 $10,000、季軍 $5,000 大獎</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>前三名獲贈平台點數（效期長達 180 日）及官方「創之星」榮譽徽章</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>以帳號計為一隊，每隊不限提案與痛點數量，各案獨立受評</span>
                      </li>
                    </ul>
                  </div>

                  {/* Role 2 */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50/50 border border-rose-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-black text-xs">
                        💡 痛點許願者
                      </span>
                      <Flame className="w-4 h-4 text-rose-600" />
                    </div>
                    <ul className="text-xs text-stone-700 space-y-1.5 leading-relaxed font-medium">
                      <li className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <span>發表生活或產業切身痛點，審核過審即送 <b>200 點</b>（價值 $250，60天有效）</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <span>解方獲選前 1~3 名，痛點者另獲 <b>NT$1,500</b> 好禮；前 4~10 名獲 <b>$500</b> 好禮</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <span>集結全台青年創客的智慧，為您的問題量身打造實戰解法</span>
                      </li>
                    </ul>
                  </div>

                  {/* Role 3 */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50/50 border border-purple-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg bg-purple-700 text-white font-black text-xs">
                        🎓 產學研專家
                      </span>
                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                    </div>
                    <ul className="text-xs text-stone-700 space-y-1.5 leading-relaxed font-medium">
                      <li className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                        <span>實名審核通過，配發 <b>3,000,000 創星幣</b> 專屬評選注資額度</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                        <span>頒發官方「創星專家導師」勳章與專案評審權利</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                        <span>利益迴避：專家不可兼任參賽者，以維護評審客觀公正</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 3. 獎項金榜與四大評審維度 (Awards & Criteria Visual) */}
              <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 p-5 rounded-3xl text-white space-y-4 border border-amber-400/30">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <h3 className="font-black text-white text-base">
                      官方大獎配額與評審四大維度 (Prizes & Evaluation)
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-amber-300">真金白銀獎勵</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white/5 p-4 rounded-2xl border border-amber-400/40 text-center space-y-1">
                    <div className="text-2xl">🥇</div>
                    <div className="font-mono text-xs font-bold text-amber-300">第一名 (冠軍大獎)</div>
                    <div className="text-lg sm:text-xl font-black text-white">總價值 NT$ 30,000</div>
                    <div className="text-xs text-amber-200/90 font-medium">NT$ 20,000 現金 ＋ 8,000 點 (180日)</div>
                  </div>

                  <div className="bg-white/5 p-4 rounded-2xl border border-stone-400/40 text-center space-y-1">
                    <div className="text-2xl">🥈</div>
                    <div className="font-mono text-xs font-bold text-stone-300">第二名 (亞軍殊榮)</div>
                    <div className="text-lg sm:text-xl font-black text-white">總價值 NT$ 10,000</div>
                    <div className="text-xs text-stone-300/90 font-medium">NT$ 6,000 現金 ＋ 3,200 點 (180日)</div>
                  </div>

                  <div className="bg-white/5 p-4 rounded-2xl border border-amber-600/40 text-center space-y-1">
                    <div className="text-2xl">🥉</div>
                    <div className="font-mono text-xs font-bold text-amber-400">第三名 (季軍殊榮)</div>
                    <div className="text-lg sm:text-xl font-black text-white">總價值 NT$ 5,000</div>
                    <div className="text-xs text-amber-300/90 font-medium">NT$ 3,000 現金 ＋ 1,600 點 (180日)</div>
                  </div>
                </div>

                {/* 決審四大指標 */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="text-xs font-bold text-amber-300">專家決選 4 大評審指標維度：</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-stone-300">
                    <div className="p-2 rounded-xl bg-white/5">
                      <strong className="text-white">創新性 (40%)</strong>
                      <div className="text-[10px] text-stone-400">技術突破與差異優勢</div>
                    </div>
                    <div className="p-2 rounded-xl bg-white/5">
                      <strong className="text-white">完整度 (20%)</strong>
                      <div className="text-[10px] text-stone-400">企劃架構與邏輯清晰</div>
                    </div>
                    <div className="p-2 rounded-xl bg-white/5">
                      <strong className="text-white">可行性 (20%)</strong>
                      <div className="text-[10px] text-stone-400">落地實施與原型成熟</div>
                    </div>
                    <div className="p-2 rounded-xl bg-white/5">
                      <strong className="text-white">商業潛力 (20%)</strong>
                      <div className="text-[10px] text-stone-400">市場需求與模式前景</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 2: 文字懶人包說明 ==================== */}
          {activeTab === 'text' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-white p-5 rounded-3xl border border-stone-200 space-y-4">
                <h3 className="font-black text-stone-900 text-lg flex items-center gap-2 border-b border-stone-100 pb-3">
                  <FileText className="w-5 h-5 text-amber-600" />
                  <span>競賽核心規則文字摘要 (Executive Summary)</span>
                </h3>

                <div className="space-y-4 text-xs sm:text-sm text-stone-700 leading-relaxed font-medium">
                  <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80">
                    <h4 className="font-black text-amber-950 text-sm mb-1">🎯 競賽宗旨與特色</h4>
                    <p className="text-stone-700">
                      IdeaX 創星季是全台首創結合「痛點許願」與「解方共創」的全國創新提案挑戰賽。透過全民提出日常生活與產業痛點，引導青年創客與專業團隊提出落地解法；並搭配「創星幣模擬募資」與「產學智庫評選」，打造最具實戰意義的創新孵化舞台。
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                      <h4 className="font-black text-stone-900 text-xs sm:text-sm mb-1">👥 參賽資格與境外撥款條款</h4>
                      <p className="text-xs text-stone-600">
                        開放國內外個人、團隊及法人參與。以<b>「一個帳號代表一隊」</b>，且<b>每隊不限提案或痛點數量</b>；<b>不支援跨國跨境支付</b>，海外團隊獲獎須提供<b>臺灣境內銀行帳戶</b>供電匯撥發。
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
                      <h4 className="font-black text-amber-950 text-xs sm:text-sm mb-1">🏢 主辦單位與活動獎金提供</h4>
                      <p className="text-xs text-stone-700">
                        主辦單位為 <b>IdeaX 創點子團隊</b>。活動獎金由<b>活動發起人/創點子團隊代表人 提供</b>，新台幣電匯撥入隊長指定之臺灣銀行帳戶，依法代扣所得稅。
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                    <h4 className="font-black text-stone-900 text-xs sm:text-sm mb-1">📊 決選機制與四大評審佔比</h4>
                    <p className="text-xs text-stone-600">
                      模擬募資排名前 20 名直接入圍決選。第三階段由專家團依四大指標評分：<b>創新性 (40%)</b>、<b>完整度 (20%)</b>、<b>可行性 (20%)</b>、<b>商業潛力 (20%)</b>。
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/80">
                    <h4 className="font-black text-blue-950 text-xs sm:text-sm mb-1">🪙 創星幣與點數期限提醒</h4>
                    <ul className="list-disc list-inside text-xs text-stone-700 space-y-1">
                      <li>登入即配發 100,000 創星幣，僅作市場關注度模擬投票，不可兌換現金。</li>
                      <li>單案支持上限：參賽者與一般用戶 50,000、專家 2,000,000 創星幣；可以自我注資。</li>
                      <li>前三名獲獎團隊點數效期為 <b>180 日</b>，其餘獎勵點數效期均為 <b>60 日</b>。</li>
                      <li>點數可用於 IdeaX 創點子平台發布懸賞提問與享受付費功能。</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 3: FAQ 熱門對照表 ==================== */}
          {activeTab === 'faq' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFaqQuery}
                  onChange={(e) => setSearchFaqQuery(e.target.value)}
                  placeholder="搜尋 FAQ 常見問題關鍵字（例如：創星幣、點數、痛點、組隊、獎金）..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-stone-200 text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200 transition-all text-stone-900"
                />
              </div>

              <div className="space-y-2.5">
                {filteredFaqs.map((faq, idx) => {
                  const isOpen = openFaqIdx === idx;
                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-2xl border border-stone-200 overflow-hidden transition-all hover:border-amber-300"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                        className="w-full px-4 py-3.5 flex items-start justify-between gap-3 text-left cursor-pointer transition-colors hover:bg-stone-50"
                      >
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                            Q
                          </span>
                          <span className="font-bold text-stone-900 text-xs sm:text-sm flex-1 break-words leading-snug">
                            {faq.q}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 mt-0.5">
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 whitespace-nowrap">
                            {faq.tag}
                          </span>
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4 text-stone-400 shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
                          )}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 pt-1 text-xs text-stone-700 leading-relaxed bg-stone-50/50 border-t border-stone-100 whitespace-pre-line font-medium">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 底部功能與分享按鈕 Footer */}
        <div className="bg-stone-100 p-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-stone-600 font-bold">
            <FolderOpen className="w-4 h-4 text-amber-600 shrink-0" />
            <span>打包下載包含 {enabledFiles.length} 件檔案（最新受管檔案庫）</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <button
              type="button"
              disabled={isDownloading}
              onClick={handleDownloadPackage}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs active:scale-95 border border-amber-600/30 disabled:opacity-50"
              title="打包下載包含 PDF 圖文簡報、Docs 完整文字說明與管理員自訂檔案的 ZIP 壓縮包"
            >
              <Download className="w-3.5 h-3.5 text-stone-950" />
              <span>{isDownloading ? '打包下載中...' : '打包下載資料夾 (.zip)'}</span>
            </button>

            <button
              type="button"
              onClick={downloadCompetitionPdfOnly}
              className="hidden sm:inline-flex px-3 py-2 rounded-xl bg-white hover:bg-stone-200 text-stone-800 border border-stone-300 text-xs font-bold transition-all cursor-pointer items-center justify-center gap-1 shadow-2xs active:scale-95"
              title="單獨下載 PDF 圖文說明簡報"
            >
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              <span>下載 PDF</span>
            </button>

            <button
              type="button"
              onClick={downloadCompetitionDocOnly}
              className="hidden sm:inline-flex px-3 py-2 rounded-xl bg-white hover:bg-stone-200 text-stone-800 border border-stone-300 text-xs font-bold transition-all cursor-pointer items-center justify-center gap-1 shadow-2xs active:scale-95"
              title="單獨下載 Docs 完整文字說明文件 (.doc)"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>下載 Docs</span>
            </button>

            <button
              type="button"
              onClick={handleCopyShare}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white hover:bg-stone-200 text-stone-800 border border-stone-300 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? '已複製連結' : '複製懶人包連結'}</span>
            </button>

            {onNavigate && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigate('submit');
                }}
                className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>立即參賽/提痛點</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 管理員專屬：存入/刪除檔案庫 Modal */}
      {isAdminManagerOpen && isAdmin && (
        <AdminCheatSheetFileManagerModal
          isOpen={isAdminManagerOpen}
          onClose={() => setIsAdminManagerOpen(false)}
        />
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};
