import React, { useState } from 'react';
import { Question, Answer } from '../types';
import { getQuestionVibeCategories } from './VibeCodingExhibitionView';
import { ProposalChangelogSection } from './ProposalChangelogSection';
import {
  ExternalLink,
  Code2,
  CheckCircle2,
  Cpu,
  Target,
  Image as ImageIcon,
  ZoomIn,
  X,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  Coins,
  Eye,
  MessageCircle,
  GitBranch,
  Flame,
  Calendar,
  Share2,
  Check,
  FileEdit,
  ArrowLeft,
  Bookmark,
  Star,
  Heart,
  Send,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface VibeCodingCaseDetailContentProps {
  question: Question;
  isFullPage?: boolean;
  onClose?: () => void;
  authorDisplayName: string;
  authorDisplayAvatar: string;
  authorColorClass: string;
  referencedPainPointObj?: Question | null;
  onSelectReferencedPainPoint?: (q: Question) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  isLiked: boolean;
  likesCount: number;
  onToggleLike: () => void;
  onOpenTipModal: () => void;
  onOpenUpdateModal?: () => void;
  canUpdateProposal?: boolean;
  onShare?: () => void;
  isShareCopied?: boolean;
  discussionsCount: number;
  discussionAnswers?: Answer[];
  quickComment?: string;
  setQuickComment?: (val: string) => void;
  onQuickCommentSubmit?: (e: React.FormEvent) => void;
}

interface CaseRichMeta {
  subtitle: string;
  backgroundParagraphs: string[];
  features: Array<{
    title: string;
    desc: string;
  }>;
  workflowSteps: Array<{
    step: string;
    title: string;
    detail: string;
  }>;
  architectureLayers: Array<{
    layer: string;
    items: string[];
  }>;
  captions: string[];
}

function getCaseRichMeta(q: Question): CaseRichMeta {
  const id = q.id;
  const appName = q.appName || q.vibeCodingData?.appName || q.title.split('：')[0];

  if (id === 'q-vp-vibe-deeperdigger') {
    return {
      subtitle: '打開瀏覽器就能連線的線上派對遊戲網站，收錄知識問答、猜詞、AI偽人殺與迷宮戰爭。',
      backgroundParagraphs: [
        '朋友聚會、排隊等待或遠距視訊時，想一起玩個小遊戲往往得先下載 App、註冊帳號，等大家弄好熱度都冷掉了。',
        'DeeperDigger 把多款派對遊戲整合在同一個網站裡，房主開房後分享連結或房號，其他人用手機或電腦點開就能直接加入對戰。',
      ],
      features: [
        {
          title: '多主題知識問答與挖礦對決',
          desc: '涵蓋歷史、科學、流行文化與冷知識題庫，答對可獲得鑽石與道具，支援雙人單挑與多人積分賽。',
        },
        {
          title: '限時猜詞解謎',
          desc: '出題者用精簡線索提示，其他玩家限時搶答，節奏明快適合暖場。',
        },
        {
          title: '收錄《AI偽人殺》與《迷宮戰爭》',
          desc: '同一個房間大廳就能直接切換到 AI 推理桌遊或 2~4 人迷宮射擊對戰，不用重新加房。',
        },
        {
          title: '手機與電腦跨裝置同步',
          desc: '透過 WebSockets 低延遲同步每回合倒數、得分與房間狀態，免安裝打開即玩。',
        },
      ],
      workflowSteps: [
        { step: '01', title: '進入大廳選遊戲', detail: '打開 deeperdigger.online 選擇知識問答、AI偽人殺或迷宮戰爭。' },
        { step: '02', title: '建立房間邀朋友', detail: '設定人數與模式後，把房號傳給朋友即可跨裝置連線。' },
        { step: '03', title: '即時互動與結算', detail: '每局約 3~8 分鐘，結束後立即查看排行與戰績統計。' },
      ],
      architectureLayers: [
        { layer: '前端介面', items: ['React 19', 'TypeScript', 'Tailwind CSS', 'HTML5 Canvas'] },
        { layer: '連線同步', items: ['WebSockets 即時房間同步', '低延遲狀態廣播'] },
        { layer: 'AI 模型', items: ['Gemini API', 'ChatGPT API'] },
      ],
      captions: [
        'DeeperDigger 主視覺與多遊戲入口',
        '多人連線遊戲大廳與房間設定',
        '挖礦知識對決即時作答畫面',
        '雙人 PvP 限時搶答對決',
        '多領域學科與知識主題題庫選擇',
        '多種派對遊戲模式切換選單',
      ],
    };
  }

  if (id === 'q-vp-vibe-aiwolf') {
    return {
      subtitle: '混入 Gemini 與 ChatGPT 的多人推理桌遊，找出誰是混在玩家裡的 AI。',
      backgroundParagraphs: [
        '傳統狼人殺需要湊滿較多人數，而且新手常不知道第一輪該說什麼。AI偽人殺把電腦對手變成「會裝成人類聊天的 AI 玩家」，4 到 6 人就能隨時開局。',
        '遊戲裡每回合會給出生活化的破冰題目（例如「最近遇到的小確幸」），AI 不只會模仿人類語氣回答，還會在專屬的「AI 私聊頻道」裡互相串通、栽贓給真人玩家。',
      ],
      features: [
        {
          title: '4 人局與 6 人局配置',
          desc: '支援 4 人局（3 人類 + 1 AI）與 6 人局（4 人類 + 2 AI），可選單一模型或雙模型混戰。',
        },
        {
          title: 'AI 幕後密謀私聊',
          desc: '兩個 AI 會在私下頻道討論怎麼配合發言、要把風向帶給哪位真人背鍋，賽後復盤可完整查看。',
        },
        {
          title: '頭像標記與懷疑筆記',
          desc: '發言過程中可隨時在可疑玩家頭像旁標記「偏人類 / 偏AI」並記下疑點，投票時一目了然。',
        },
        {
          title: '6 人局暗殺與投票統計',
          desc: '夜晚階段支援暗殺投票，結算時公布每位玩家的投票對象與識破率。',
        },
      ],
      workflowSteps: [
        { step: '01', title: '抽題並輪流發言', detail: '根據當局抽出的生活題目，真人與 AI 輪流用文字發言。' },
        { step: '02', title: '自由討論抓破綻', detail: '觀察誰講話太官方、太快或前後矛盾，並用筆記標記。' },
        { step: '03', title: '投票處決與揭曉', detail: '投票抓出 AI，賽後公開 AI 私下串通的完整對話紀錄。' },
      ],
      architectureLayers: [
        { layer: '前端介面', items: ['React', 'TypeScript', 'Tailwind CSS'] },
        { layer: 'AI 偽裝引擎', items: ['Gemini API', 'ChatGPT API', '口語化去 AI 味提示詞控制'] },
        { layer: '多人連線', items: ['WebSockets 回合制狀態機', '私聊與公頻分流'] },
      ],
      captions: [
        'AI偽人殺主視覺',
        '第一回合破冰話題與發言介面',
        'AI 幕後私聊密謀畫面',
        '公開討論區玩家交鋒與頭像筆記',
        '投票意向與放逐結果公布',
        '陣營勝利結算與模型揭曉',
      ],
    };
  }

  if (id === 'q-vp-vibe-mazewar') {
    return {
      subtitle: '支援 2~4 人即時連線的迷宮走位與開闊地圖射擊對戰小遊戲。',
      backgroundParagraphs: [
        '想在開會前或朋友聚會時來一場 3 分鐘的快節奏對決？迷宮戰爭 Maze Wars 提供直覺的方向與射擊操作，點開網頁就能直接開打。',
        '遊戲內建「經典迷宮」與「開闊競技場」兩種地形，支援 2 人單挑、3 人混戰與 4 人大亂鬥，考驗走位預判與轉角卡位。',
      ],
      features: [
        {
          title: '2~4 人彈性開局',
          desc: '支援 2 人、3 人、4 人房型，人少能單挑練技術，人多能打混戰。',
        },
        {
          title: '迷宮地形與開闊地圖切換',
          desc: '迷宮模式著重轉角視野與掩護；開闊模式考驗走位閃避與正面對槍。',
        },
        {
          title: '零安裝跨裝置即玩',
          desc: '直接整合在 DeeperDigger 平台內，電腦鍵盤與手機觸控都能流暢操作。',
        },
      ],
      workflowSteps: [
        { step: '01', title: '選擇地圖與人數', detail: '在大廳選擇迷宮或開闊地圖，設定 2~4 人對戰。' },
        { step: '02', title: '即時走位與射擊', detail: '利用牆體掩護與走位擊敗對手。' },
        { step: '03', title: '回合比分結算', detail: '即時統計擊殺數與勝場排名。' },
      ],
      architectureLayers: [
        { layer: '遊戲畫面', items: ['HTML5 Canvas 2D', 'React', 'TypeScript'] },
        { layer: '連線同步', items: ['WebSockets 座標與彈道同步', '碰撞偵測'] },
      ],
      captions: [
        '迷宮戰爭 Maze Wars 封面',
        '房間大廳與地圖模式選擇',
        '4 人開闊地圖混戰畫面',
        '3 人開闊競技場對決',
        '4 人經典迷宮走位戰',
        '2 人迷宮單挑對決',
      ],
    };
  }

  if (id === 'q-vp-vibe-nexsight') {
    return {
      subtitle: '結合歷史 K 線走勢比對與多因素回歸模型的股市回測分析網站。',
      backgroundParagraphs: [
        '一般看盤軟體大多只給均線、KD、MACD 等單一指標，投資人很難驗證「如果同時考慮財報基本面、法人籌碼與總經利率，過去十年的勝率到底有多少」。',
        'NexSight 洞鑑把歷史趨勢比對與多因素回歸預測做成視覺化網頁，使用者可以自己調整各因子權重，直接跑歷史回測看勝率、年化報酬與最大回撤（Max Drawdown）。',
      ],
      features: [
        {
          title: '歷史相似走勢比對',
          desc: '比對歷史 K 線與成交量型態，找出過去相似時期的後續漲跌分布。',
        },
        {
          title: '多因素回歸權重調整',
          desc: '可自由勾選並調整基本面、籌碼面、技術面與總經指標權重，即時計算回歸預測曲線。',
        },
        {
          title: '信賴區間與走勢推演',
          desc: '在圖表上標示 68% 與 95% 信賴區間通道，評估潛在上檔空間與下檔風險。',
        },
        {
          title: '歷史回測驗證圖表',
          desc: '完整呈現策略勝率、夏普值與最大回撤，避免憑感覺盲目進出。',
        },
      ],
      workflowSteps: [
        { step: '01', title: '輸入股票代號與區間', detail: '選擇標的與想要回測的歷史時間範圍。' },
        { step: '02', title: '調整回歸模型因子', detail: '設定基本面、籌碼與技術指標的因子權重。' },
        { step: '03', title: '查看預測區間與回測報告', detail: '檢視預測走勢圖與歷史勝率數據。' },
      ],
      architectureLayers: [
        { layer: '前端圖表', items: ['React', 'TypeScript', 'Lightweight Charts', 'Tailwind CSS'] },
        { layer: '量化計算', items: ['Python FastAPI', 'Statsmodels / Scikit-Learn 多因素回歸'] },
      ],
      captions: [
        'NexSight 股市趨勢與回歸分析總覽',
        '多因素回歸預測走勢與信賴區間圖',
        '因子權重配置與相關性分析',
        '歷史回測勝率與最大回撤驗證',
        '模型參數設定介面',
      ],
    };
  }

  if (id === 'q-vp-vibe-ideax') {
    return {
      subtitle: '結合痛點許願池、創星季模擬注資與軟體作品展場的共創平台。',
      backgroundParagraphs: [
        '許多好點子或真實痛點常散落在各個社群討論串裡，缺乏後續整理與實際做成產品的媒合機制；而獨立開發者做出了好用的小工具或網站，也常缺少一個能直接展示、收集回饋與獲得打賞的地方。',
        'IdeaX 創點子把「提出痛點 → 提案解題 → 創星季模擬注資 → 軟體作品上架展示」串在同一套平台裡，讓問題發起人、領域專家與軟體創作者能直接交流合作。',
      ],
      features: [
        {
          title: '痛點許願池與分級懸賞',
          desc: '支援 L0 免費交流到 L1~L4 正式懸賞，並可將痛點與解決提案雙向關聯。',
        },
        {
          title: '創星季競賽與模擬注資',
          desc: '每位會員皆可使用創星幣支持看好的提案與作品，即時更新人氣排行榜。',
        },
        {
          title: '軟體作品展場與版本紀錄',
          desc: '支援網站程式、AI工具、小遊戲、自動化與擴充功能上架，內建試玩連結、點數支持與版本更新日誌。',
        },
        {
          title: '兩階段資金代管機制',
          desc: '正式懸賞案件採 30% 啟動金 + 70% 驗收尾款分階段撥付，保障雙方權益。',
        },
      ],
      workflowSteps: [
        { step: '01', title: '提出痛點或瀏覽需求', detail: '在許願池發布日常與產業痛點，或挑選題目解題。' },
        { step: '02', title: '提交提案或上架作品', detail: '發布具體解決方案或軟體作品，並綁定對應痛點。' },
        { step: '03', title: '獲得回饋與點數支持', detail: '透過留言互動、點數支持與版本更新持續改進作品。' },
      ],
      architectureLayers: [
        { layer: '前端架構', items: ['React 19', 'TypeScript', 'Vite', 'Tailwind CSS'] },
        { layer: '後端與資料庫', items: ['Express', 'Firebase Firestore', 'Firebase Auth'] },
        { layer: 'AI 輔助', items: ['Gemini API', '市場評估報告生成'] },
      ],
      captions: [
        'IdeaX 創點子平台首頁預覽',
        '品牌識別卡片',
        '創星季專區標誌',
        '創點子圖示',
      ],
    };
  }

  // Default concise generator for other apps
  const techList =
    q.vibeCodingData?.techStack ||
    (q.techArchitecture ? q.techArchitecture.split(/\s*\+\s*|\s*,\s*/) : ['React', 'TypeScript', 'Tailwind CSS']);

  return {
    subtitle: q.vibeCodingData?.oneLinePitch || q.title,
    backgroundParagraphs: [q.description],
    features: [
      {
        title: '核心功能操作',
        desc: q.vibeCodingData?.oneLinePitch || q.title,
      },
      {
        title: '解決的實際問題',
        desc: q.referencedPainPoint
          ? q.referencedPainPoint.replace(/^\[[^\]]+\]\s*/, '')
          : '簡化原本繁瑣的人工操作流程，打開網頁就能直接使用。',
      },
    ],
    workflowSteps: [
      { step: '01', title: '開啟網頁', detail: `前往 ${appName} 線上網址，免安裝即可使用。` },
      { step: '02', title: '輸入資料或開始互動', detail: '依照畫面提示輸入內容或選擇模式。' },
      { step: '03', title: '查看結果或匯出', detail: '即時取得處理結果，支援分享或下載。' },
    ],
    architectureLayers: [
      { layer: '使用技術', items: techList },
      { layer: '開發工具', items: q.vibeCodingData?.aiToolsUsed || ['Google AI Studio', 'Cursor'] },
    ],
    captions: (q.galleryImages || []).map((_, idx) => `${appName} 畫面截圖 ${idx + 1}`),
  };
}

export const VibeCodingCaseDetailContent: React.FC<VibeCodingCaseDetailContentProps> = ({
  question,
  isFullPage = false,
  onClose,
  authorDisplayName,
  authorDisplayAvatar,
  authorColorClass,
  referencedPainPointObj,
  onSelectReferencedPainPoint,
  isBookmarked = false,
  onToggleBookmark,
  isLiked,
  likesCount,
  onToggleLike,
  onOpenTipModal,
  onOpenUpdateModal,
  canUpdateProposal,
  onShare,
  isShareCopied,
  discussionsCount,
  discussionAnswers = [],
  quickComment = '',
  setQuickComment,
  onQuickCommentSubmit,
}) => {
  const { toggleLikeDiscussionAnswer, isDiscussionAnswerLiked, getDiscussionAnswerLikesCount } = useApp();
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const meta = getCaseRichMeta(question);
  const vibeCategories = getQuestionVibeCategories(question);

  const allImages: string[] = React.useMemo(() => {
    const raw = [
      ...(question.galleryImages || []),
      ...(question.vibeCodingData?.screenshots || []),
      ...(question.coverImage ? [question.coverImage] : []),
    ].filter(Boolean);
    return Array.from(new Set(raw));
  }, [question.galleryImages, question.vibeCodingData?.screenshots, question.coverImage]);

  const currentImage = allImages[activeImageIdx] || question.coverImage || '';
  const currentCaption =
    meta.captions[activeImageIdx] ||
    `${question.appName || question.title.split('：')[0]} 畫面 ${activeImageIdx + 1}`;

  const demoUrl = question.demoUrl || question.vibeCodingData?.demoUrl || '';
  const versionLabel = question.currentVersion || question.version || 'v1.0.0';
  const appName = question.appName || question.vibeCodingData?.appName || '';

  const handlePrevImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveImageIdx((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  const handleNextImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveImageIdx((prev) => (prev + 1) % allImages.length);
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-stone-200 shadow-sm w-full ${
        isFullPage ? 'p-4 sm:p-6 space-y-5' : 'max-w-5xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 space-y-5'
      }`}
    >
      {/* Top Header Bar */}
      <div className="pb-4 border-b border-stone-200 flex items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold transition-colors cursor-pointer mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-indigo-600" />
              <span>返回作品列表</span>
            </button>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {vibeCategories.map((cat) => (
              <span
                key={cat}
                className="px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs"
              >
                {cat}
              </span>
            ))}
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono font-bold text-xs">
              {versionLabel}
            </span>
          </div>
          <h1 className="text-lg sm:text-2xl font-black text-stone-900 leading-snug">
            {appName ? `${appName} — ${question.title}` : question.title}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500">{meta.subtitle}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onToggleBookmark && (
            <button
              type="button"
              onClick={onToggleBookmark}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isBookmarked
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-white hover:bg-amber-50/60 border-stone-200 text-stone-700 hover:text-amber-700'
              }`}
              title="⭐ 收藏此作品"
            >
              <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400 text-amber-500' : 'text-stone-400'}`} />
              <span>{isBookmarked ? '已收藏' : '收藏'}</span>
            </button>
          )}
          {!isFullPage && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="關閉視窗"
              className="p-2 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 1. Screenshot Gallery */}
      {allImages.length > 0 && (
        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
          <div
            onClick={() => setLightboxOpen(true)}
            className="relative aspect-16/10 sm:aspect-16/9 w-full bg-stone-900 flex items-center justify-center overflow-hidden cursor-zoom-in group"
          >
            <img
              src={currentImage}
              alt={currentCaption}
              className="relative z-10 w-full h-full object-contain"
            />

            <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-md bg-black/70 text-white text-xs font-mono">
              {activeImageIdx + 1} / {allImages.length}
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(true);
              }}
              className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-md bg-black/70 hover:bg-black/85 text-white text-xs flex items-center gap-1 cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>放大</span>
            </button>

            {allImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="上一張"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="下一張"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            <div className="absolute bottom-0 inset-x-0 z-20 bg-black/65 px-4 py-2 flex items-center justify-between gap-3">
              <p className="text-xs text-stone-100 truncate">{currentCaption}</p>
              {demoUrl && (
                <a
                  href={demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1 transition-colors"
                >
                  <span>開啟網站</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {allImages.length > 1 && (
            <div className="p-2.5 bg-stone-50 border-t border-stone-200 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {allImages.map((imgUrl, idx) => {
                const isSelected = idx === activeImageIdx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    className={`relative shrink-0 w-20 sm:w-24 aspect-16/10 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-stone-900 opacity-100'
                        : 'border-transparent opacity-60 hover:opacity-90'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`縮圖 ${idx + 1}`}
                      className="w-full h-full object-cover bg-stone-200"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. Quick Action & Stats Bar */}
      <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4 flex-wrap text-xs text-stone-600">
          <div className="flex items-center gap-1.5">
            <span className="text-stone-400">分類：</span>
            <div className="flex items-center gap-1 flex-wrap">
              {vibeCategories.map((cat) => (
                <span
                  key={cat}
                  className="px-2 py-0.5 rounded bg-white border border-stone-200 text-stone-800 font-bold text-xs"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <GitBranch className="w-3.5 h-3.5 text-purple-600" />
            <span>版本：</span>
            <strong className="font-mono text-stone-900">{versionLabel}</strong>
          </div>

          <div className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-sky-600" />
            <span className="font-mono font-bold text-stone-800">{(question.views || 0).toLocaleString()}</span>
            <span>次瀏覽</span>
          </div>

          <div className="flex items-center gap-1">
            <MessageCircle className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-mono font-bold text-stone-800">{discussionsCount}</span>
            <span>則留言</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {demoUrl && (
            <a
              href={demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-lg border border-indigo-600 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <span>前往網站體驗</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            type="button"
            onClick={onToggleLike}
            className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 border transition-colors cursor-pointer ${
              isLiked
                ? 'bg-rose-500 text-white border-rose-500 shadow-2xs'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
            }`}
            title="❤️ Like（軟體刊登）"
          >
            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-white text-white' : 'fill-rose-500 text-rose-500'}`} />
            <span>Like ({likesCount})</span>
          </button>

          <button
            type="button"
            onClick={onOpenTipModal}
            className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Coins className="w-3.5 h-3.5" />
            <span>點數支持 ({(question.supportPoints || 0).toLocaleString()})</span>
          </button>

          {canUpdateProposal && onOpenUpdateModal && (
            <button
              type="button"
              onClick={onOpenUpdateModal}
              className="px-3 py-2 rounded-lg border border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-600 hover:text-white active:bg-emerald-700 active:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>更新作品</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Main Two-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* 作品介紹 */}
          <section className="p-5 rounded-xl bg-white border border-stone-200 space-y-3">
            <h3 className="text-base font-bold text-stone-900">
              作品介紹
            </h3>
            <div className="space-y-2.5 text-sm text-stone-700 leading-relaxed">
              {meta.backgroundParagraphs.map((para, i) => (
                <p key={i} className="whitespace-pre-line">
                  {para}
                </p>
              ))}
            </div>

            {(referencedPainPointObj || question.referencedPainPoint) && (
              <div
                onClick={() => {
                  if (referencedPainPointObj && onSelectReferencedPainPoint) {
                    onSelectReferencedPainPoint(referencedPainPointObj);
                  }
                }}
                className={`mt-3 p-3 rounded-lg bg-rose-50/70 border border-rose-200 flex items-center justify-between gap-3 ${
                  referencedPainPointObj ? 'hover:bg-rose-100/70 cursor-pointer transition-colors' : ''
                }`}
              >
                <div className="flex items-start gap-2 min-w-0">
                  <Flame className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-rose-700 block">
                      解決的痛點問題
                    </span>
                    <p className="text-xs font-bold text-stone-900 truncate">
                      {referencedPainPointObj
                        ? referencedPainPointObj.title
                        : question.referencedPainPoint?.replace(/^\[[^\]]+\]\s*/, '')}
                    </p>
                  </div>
                </div>
                {referencedPainPointObj && (
                  <span className="shrink-0 text-xs font-bold text-rose-700">
                    查看痛點 →
                  </span>
                )}
              </div>
            )}
          </section>

          {/* 主要功能 */}
          <section className="p-5 rounded-xl bg-white border border-stone-200 space-y-3">
            <h3 className="text-base font-bold text-stone-900">
              主要功能
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {meta.features.map((feat, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg bg-stone-50 border border-stone-200/80 space-y-1"
                >
                  <h4 className="text-xs sm:text-sm font-bold text-stone-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{feat.title}</span>
                  </h4>
                  <p className="text-xs text-stone-600 leading-relaxed pl-5.5">
                    {feat.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 使用方式 */}
          <section className="p-5 rounded-xl bg-white border border-stone-200 space-y-3">
            <h3 className="text-base font-bold text-stone-900">
              使用方式
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {meta.workflowSteps.map((ws, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg bg-stone-50 border border-stone-200/80 space-y-1"
                >
                  <div className="text-xs font-mono font-bold text-stone-400">
                    步驟 {ws.step}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-stone-900">
                    {ws.title}
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {ws.detail}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* 作者與作品資訊 */}
          <section className="p-5 rounded-xl bg-white border border-stone-200 space-y-4">
            <h3 className="text-sm font-bold text-stone-900">
              作品資訊
            </h3>

            <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
              <img
                src={authorDisplayAvatar}
                alt={authorDisplayName}
                className="w-10 h-10 rounded-full object-cover border border-stone-200 shrink-0"
              />
              <div className="min-w-0">
                <div className={`text-sm font-bold truncate ${authorColorClass}`}>
                  {authorDisplayName}
                </div>
                <div className="text-xs text-stone-500 truncate">
                  {question.authorTitle || '作品開發者'}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500">分類</span>
                <span className="font-bold text-stone-800">
                  {vibeCategories.join('、')}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500">目前版本</span>
                <span className="font-mono font-bold text-stone-800">{versionLabel}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  發布日期
                </span>
                <span className="font-mono text-stone-700">{question.createdAt}</span>
              </div>
            </div>

            {onShare && (
              <button
                type="button"
                onClick={onShare}
                className="w-full py-2 px-3 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {isShareCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">已複製分享連結</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>分享作品連結</span>
                  </>
                )}
              </button>
            )}
          </section>

          {/* 技術與工具 */}
          <section className="p-5 rounded-xl bg-white border border-stone-200 space-y-3">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-indigo-600" />
              <span>技術架構</span>
            </h3>

            {question.techArchitecture && (
              <p className="text-xs font-mono text-stone-700 bg-stone-50 p-2.5 rounded-lg border border-stone-200 leading-relaxed">
                {question.techArchitecture}
              </p>
            )}

            <div className="space-y-2.5">
              {meta.architectureLayers.map((layer, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="text-[11px] font-bold text-stone-500">
                    {layer.layer}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {layer.items.map((item, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-xs font-medium"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 目標 */}
          {question.targetGoal && (
            <section className="p-5 rounded-xl bg-white border border-stone-200 space-y-2">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-600" />
                <span>近期目標</span>
              </h3>
              <p className="text-xs text-stone-700 leading-relaxed">
                {question.targetGoal}
              </p>
            </section>
          )}
        </div>
      </div>

      {/* 4. 社群留言與回饋 */}
      <section className="p-5 rounded-xl bg-white border border-stone-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-stone-900 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-indigo-600" />
            <span>作品討論與使用回饋 ({discussionAnswers.length})</span>
          </h3>
        </div>

        {onQuickCommentSubmit && setQuickComment && (
          <form onSubmit={onQuickCommentSubmit} className="flex gap-2">
            <input
              type="text"
              value={quickComment}
              onChange={(e) => setQuickComment(e.target.value)}
              placeholder="分享你的試用心得、功能建議或提問..."
              className="flex-1 px-3.5 py-2 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:border-indigo-500 text-xs sm:text-sm text-stone-800 outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!quickComment.trim()}
              className="px-4 py-2 rounded-lg border border-indigo-600 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>送出</span>
            </button>
          </form>
        )}

        {discussionAnswers.length === 0 ? (
          <p className="text-xs text-stone-500 py-3 text-center">
            目前還沒有留言，歡迎成為第一個試用並留下回饋的人！
          </p>
        ) : (
          <div className="space-y-2.5">
            {discussionAnswers.map((ans) => {
              const isAnsLiked = isDiscussionAnswerLiked(ans.id);
              const ansLikes = getDiscussionAnswerLikesCount(ans.id);
              return (
                <div key={ans.id} className="p-3 rounded-lg bg-stone-50 border border-stone-200/80 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <img
                        src={ans.solverAvatar}
                        alt={ans.solverName}
                        className="w-6 h-6 rounded-full object-cover border border-stone-200"
                      />
                      <span className="font-bold text-stone-900">{ans.solverName}</span>
                      {ans.solverTitle && (
                        <span className="text-stone-400 text-[11px]">{ans.solverTitle}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleLikeDiscussionAnswer(ans.id)}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 border transition-colors cursor-pointer ${
                          isAnsLiked
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-stone-600 border-stone-200 hover:bg-blue-50 hover:text-blue-600'
                        }`}
                        title="👍 按讚此留言"
                      >
                        <ThumbsUp className={`w-3 h-3 ${isAnsLiked ? 'fill-white text-white' : ''}`} />
                        <span>{ansLikes || 0}</span>
                      </button>
                      <span className="text-[11px] text-stone-400 font-mono">{ans.createdAt}</span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-700 leading-relaxed pl-8 whitespace-pre-line">
                    {ans.freePreview || ans.fullContent}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. 頁尾：版本更新紀錄（僅發布者本人顯示編輯按鈕，其餘人僅顯示歷史紀錄） */}
      <ProposalChangelogSection
        question={question}
        canUpdate={canUpdateProposal}
        onOpenUpdateModal={onOpenUpdateModal}
      />

      {/* Lightbox Modal */}
      {lightboxOpen && allImages.length > 0 && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4"
        >
          <div className="w-full max-w-5xl flex items-center justify-between text-white mb-3 px-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 rounded bg-white/15 text-xs font-mono">
                {activeImageIdx + 1} / {allImages.length}
              </span>
              <span className="text-sm font-bold truncate">{currentCaption}</span>
            </div>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl max-h-[78vh] flex items-center justify-center"
          >
            <img
              src={currentImage}
              alt={currentCaption}
              className="max-w-full max-h-[78vh] object-contain rounded-lg"
            />

            {allImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
