import React, { useState, useRef } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  Download,
  Share2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Lightbulb,
  Award,
  Flame,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Smartphone,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import JSZip from 'jszip';
import { APP_VERSION } from '../data/versionData';

interface CarouselSlide {
  cardIndex: number;
  badge: string;
  hook: string;
  title: string;
  body: string[];
  highlight?: string;
  footerHint: string;
}

interface CampaignData {
  id: string;
  title: string;
  tag: string;
  targetAudience: string;
  summary: string;
  captionText: string;
  hashtags: string[];
  slides: CarouselSlide[];
}

export const CAMPAIGNS: CampaignData[] = [
  {
    id: 'pain-point-viral',
    title: '企劃一：【痛點共鳴爆款】',
    tag: '生活發明 / 抱怨變現',
    targetAudience: '大學生、租屋族、通勤族、對生活產品有抱怨的普羅大眾',
    summary: '以「日常抱怨居然能換錢」為反直覺 Hook，吸引生活中有滿腹苦水卻不知能變現的潛在創作者。',
    captionText: `【你平常抱怨的那些爛事，在 IdeaX 居然有人出錢買？】💡

每次遇到不好用的東西、不合理的流程，你是不是也只會發限動發牢騷？
但你知道嗎？「抱怨」其實就是最值錢的市場需求！

在【IdeaX 創點子】，你不需要懂寫程式、不需要成立公司。
只要你把日常生活遇到的「真實痛點」寫出來：
✅ 讀者覺得心有戚戚焉 👉 直接打賞你支持點數（週週結算撥款至帳戶！）
✅ 專家看到解題商機 👉 採納你的痛點提案落地，共享專案分潤！
✅ 投稿「創星季」競賽 👉 零門檻角逐生活創新大獎與萬元現金！

滑動圖片看 3 個真實被買單的抱怨範例 👉
別再只跟朋友抱怨了，現在就來把日常痛點換成現金！

🔗 立即點擊個人檔案連結免費註冊，發布你的第一個痛點！
💬 留言告訴我：你今天最想抱怨生活中的哪一件事？抽 3 位贈送 100 點支持金！`,
    hashtags: ['#IdeaX創點子', '#生活痛點', '#抱怨變現', '#創星季', '#副業靈感', '#大學生日常', '#零門檻副業', '#創新創業'],
    slides: [
      {
        cardIndex: 1,
        badge: '生活發明 • 抱怨變現',
        hook: '日常爛事也能換錢？',
        title: '你平常抱怨的那些爛事，\n在 IdeaX 居然有人出錢買？',
        body: [
          '不用寫程式，不用開公司',
          '把「這東西好難用」寫出來，就能變現！',
          '全台首創「痛點打賞」與「提案採納」媒合平台'
        ],
        highlight: '💡 抱怨不是負能量，而是價值百萬的市場真實需求！',
        footerHint: '👉 滑動看 3 個真實被買單的日常抱怨',
      },
      {
        cardIndex: 2,
        badge: '真實痛點案例 ①',
        hook: '租屋族的洗衣服地獄',
        title: '「為什麼房東附的洗衣機，\n永遠有上一位房客的毛屑？」',
        body: [
          '買洗脫烘搬家帶不走，投幣式又怕衛生問題',
          '到底有沒有適合租屋族的「模組化迷你洗烘機」？'
        ],
        highlight: '🔥 結果：獲得 148 人附議 • 3 位家電工程師提案 • 累積讀者支持打賞 850 點！',
        footerHint: '👉 滑動看下一個案例',
      },
      {
        cardIndex: 3,
        badge: '真實痛點案例 ②',
        hook: '下班去全聯買菜的焦慮',
        title: '「每次買一把青菜吃不完爛掉，\n到底誰能發明單身即煮包？」',
        body: [
          '買半份被當盤子，買整份最後都進垃圾桶',
          '想要 10 分鐘一人份洗切好真空配方包！'
        ],
        highlight: '🔥 結果：登上當週討論榜首 • 獲選「創星季生活洞察優選」！',
        footerHint: '👉 滑動看如何變現',
      },
      {
        cardIndex: 4,
        badge: 'IdeaX 雙重變現機制',
        hook: '提痛點如何獲得真實收入？',
        title: '不是畫大餅！\n提痛點的 3 大實質收益途徑',
        body: [
          '🪙 讀者打賞支持：產生共鳴立即獲賞，週結撥款至銀行帳戶',
          '💼 專家懸賞採納：解題者引用你的題目立項，享有專案分潤',
          '🏆 創星季賽事獎：痛點直接自動計入參賽積分，角逐年度獎金'
        ],
        highlight: '✨ 真正做到「人人都有發言權，好點子即刻有收益」！',
        footerHint: '👉 滑動領取新手獎勵',
      },
      {
        cardIndex: 5,
        badge: '即刻行動 • 領取獎勵',
        hook: '別再只跟朋友抱怨了！',
        title: '現在就到 IdeaX，\n把你今天的抱怨變成現金！',
        body: [
          '🔗 點擊個人檔案 (Bio) 連結免費註冊',
          '📝 3 分鐘寫下你今天最受不了的一件事',
          '🎁 新戶完成註冊即贈探索體驗點數！'
        ],
        highlight: '💬 留言分享你今天最受不了的爛事，抽 3 位送 100 點支持金！',
        footerHint: '追蹤 @ideax_tw • 解鎖更多生活變現密技',
      },
    ],
  },
  {
    id: 'star-season-entry',
    title: '企劃二：【創星季極低門檻專題】',
    tag: '多元獎項 / 人人有獎 / 零門檻',
    targetAudience: '大專院校學生、青年創業家、初入職場新鮮人、跨領域斜槓者',
    summary: '強調創星季多元獎項配置，打破傳統黑客松或商業競賽的高門檻偏見，激勵人人勇敢參賽。',
    captionText: `【大學生、上班族都衝了！IdeaX 創星季到底有多好拿獎？】🏆

以為辦比賽一定要有專業背景、厚厚一份 PPT 簡報才能得獎？
IdeaX 首屆【創星季】直接把門檻打到地表最低！

為什麼說人人都能拿獎？
🌟 賽道 ①【生活痛點洞察獎】：完全不用提供解方！只要把你發現的問題寫具體，按讚打賞高就獲獎。
🌟 賽道 ②【微型解方落地獎】：不需整套技術系統！三步驟流程或手繪草圖，專家幫你落地。
🌟 賽道 ③【人氣共鳴＆讀者打賞獎】：每獲 1 位讀者打賞支持，賽事積分 1:1 加碼現金獎勵！
🌟 參賽即享【官方電子榮譽參賽證書】與【平台認證徽章】，豐富履歷與作品集！

零報名費、不限科系、不限年齡。
給自己的靈感一次被看見的機會！

🔗 點擊個人檔案連結立即免費報名參賽
👥 標記身邊鬼點子最多的朋友，一起組隊搶拿多元大獎！`,
    hashtags: ['#IdeaX創星季', '#大學生比賽', '#零門檻競賽', '#人人有獎', '#創新創業', '#痛點洞察', '#商業競賽', '#履歷加分'],
    slides: [
      {
        cardIndex: 1,
        badge: '首屆年度大賽 • 零門檻',
        hook: '大學生、上班族都在衝！',
        title: '【IdeaX 創星季】\n到底有多好拿獎？',
        body: [
          '零報名費 • 不看學歷 • 不需厚重商業簡報',
          '只要有一點想法，就能站上舞台拿獎金！',
          '打破傳統競賽高門檻，人人都有專屬發光賽道'
        ],
        highlight: '🌟 平台全額獎勵池開放，設立超過 8 種超親民獎項！',
        footerHint: '👉 滑動看 3 大親民獲獎賽道',
      },
      {
        cardIndex: 2,
        badge: '賽道 ① • 門檻指數 0 顆星',
        hook: '不用解方也能得獎！',
        title: '【生活痛點洞察獎】\n把你的日常牢騷寫清楚就贏！',
        body: [
          '你不需要知道怎麼做產品或寫程式',
          '只要把租屋、校園、交通、生活中的痛點說清楚',
          '引起大眾共鳴附議或讀者打賞，直接獲頒洞察大獎！'
        ],
        highlight: '🎯 評選核心：問題夠真實、痛感夠強烈！',
        footerHint: '👉 滑動看下一個賽道',
      },
      {
        cardIndex: 3,
        badge: '賽道 ② • 門檻指數 1 顆星',
        hook: '草圖流程也能參賽！',
        title: '【微型解方落地獎】\n不需要做出整套軟硬體！',
        body: [
          '寫下一個簡單概念、一張手繪草圖、三步驟解法',
          '平台超過 500 位認證專家為你完善落地',
          '只要想法具備啟發性，就能贏得專業導師評選！'
        ],
        highlight: '💡 創意第一，執行有專家與你攜手並肩！',
        footerHint: '👉 滑動看人氣賽道',
      },
      {
        cardIndex: 4,
        badge: '賽道 ③ • 人氣直接變現',
        hook: '打賞越多，獎勵越大！',
        title: '【人氣共鳴＆讀者打賞獎】\n每筆支持直接 1:1 加碼！',
        body: [
          '社群轉發好友支持，獲得讀者打賞點數',
          '平台同步 1:1 注入創星季積分池',
          '參賽者享有週結撥款 ＋ 賽事額外加碼獎金！'
        ],
        highlight: '💰 自己的獎金自己賺，全網支持為你加分！',
        footerHint: '👉 滑動立即免費報名',
      },
      {
        cardIndex: 5,
        badge: '3 分鐘免費報名',
        hook: '你的點子比你想的更有價值！',
        title: '現在就報名【IdeaX 創星季】\n人人皆獲參賽證書＋官方徽章！',
        body: [
          '🔗 點擊個人檔案 (Bio) 連結進入賽事專區',
          '🚀 填寫題目，3 分鐘完成線上投稿',
          '🎓 履歷與作品集瞬間升級，讓成果被全台看見！'
        ],
        highlight: '👥 標記你身邊鬼點子最多的朋友，一起來拿獎！',
        footerHint: '追蹤 @ideax_tw • 創星季持續熱烈收件中',
      },
    ],
  },
];

interface MarketingAssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const MarketingAssetsModal: React.FC<MarketingAssetsModalProps> = ({
  isOpen,
  onClose,
  showToast,
}) => {
  const [activeCampaignId, setActiveCampaignId] = useState<string>('pain-point-viral');
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [themeMode, setThemeMode] = useState<'amber-black' | 'minimal-light' | 'neon-dark'>('amber-black');
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);
  const [copiedSlideText, setCopiedSlideText] = useState<boolean>(false);
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'carousel' | 'threads' | 'guidelines'>('carousel');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  if (!isOpen) return null;

  const currentCampaign = CAMPAIGNS.find((c) => c.id === activeCampaignId) || CAMPAIGNS[0];
  const currentSlide = currentCampaign.slides[activeSlideIndex] || currentCampaign.slides[0];

  const handleCopyCaption = () => {
    const fullText = `${currentCampaign.captionText}\n\n${currentCampaign.hashtags.join(' ')}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullText).then(() => {
        setCopiedCaption(true);
        if (showToast) showToast('已成功複製完整社群貼文文案 (含 Hashtags)！', 'success');
        setTimeout(() => setCopiedCaption(false), 2000);
      });
    }
  };

  const handleCopySlideText = () => {
    const text = `【Card ${currentSlide.cardIndex}/5】${currentSlide.badge}\n大標：${currentSlide.title}\n副標：${currentSlide.hook}\n內文：\n${currentSlide.body.map((b) => `• ${b}`).join('\n')}\n亮點：${currentSlide.highlight || ''}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedSlideText(true);
        if (showToast) showToast(`已複製 Card ${currentSlide.cardIndex} 的卡片文字！`, 'success');
        setTimeout(() => setCopiedSlideText(false), 2000);
      });
    }
  };

  // Draw card onto HTML5 Canvas for high-res 1080x1350 PNG export
  const renderCardToCanvas = (slide: CarouselSlide, theme: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Backgrounds based on theme
    if (theme === 'amber-black') {
      const grad = ctx.createLinearGradient(0, 0, 1080, 1350);
      grad.addColorStop(0, '#1c1917');
      grad.addColorStop(0.7, '#0c0a09');
      grad.addColorStop(1, '#292524');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1350);

      // Top glowing orb
      const orb = ctx.createRadialGradient(540, 200, 50, 540, 200, 500);
      orb.addColorStop(0, 'rgba(245, 158, 11, 0.15)');
      orb.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = orb;
      ctx.fillRect(0, 0, 1080, 700);
    } else if (theme === 'neon-dark') {
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, 1080, 1350);
      const orb = ctx.createRadialGradient(200, 200, 30, 200, 200, 600);
      orb.addColorStop(0, 'rgba(168, 85, 247, 0.25)');
      orb.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = orb;
      ctx.fillRect(0, 0, 1080, 800);
    } else {
      ctx.fillStyle = '#fbfbfb';
      ctx.fillRect(0, 0, 1080, 1350);
    }

    // Top Header: Branding + Slide Number
    ctx.textAlign = 'left';
    ctx.font = 'bold 36px "PingFang TC", "Noto Sans TC", sans-serif';
    ctx.fillStyle = theme === 'minimal-light' ? '#09090b' : '#f59e0b';
    ctx.fillText('💡 IdeaX 創點子', 80, 110);

    ctx.font = '500 28px sans-serif';
    ctx.fillStyle = theme === 'minimal-light' ? '#71717a' : '#a8a29e';
    ctx.fillText('@ideax_tw', 340, 110);

    ctx.textAlign = 'right';
    ctx.font = 'bold 32px monospace';
    ctx.fillStyle = theme === 'minimal-light' ? '#52525b' : '#fcd34d';
    ctx.fillText(`${slide.cardIndex} / 5`, 1000, 110);

    // Top Divider Line
    ctx.strokeStyle = theme === 'minimal-light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, 150);
    ctx.lineTo(1000, 150);
    ctx.stroke();

    // Badge Pill
    ctx.textAlign = 'left';
    const badgeText = slide.badge;
    ctx.font = 'bold 28px "PingFang TC", sans-serif';
    const badgeWidth = ctx.measureText(badgeText).width + 50;
    
    // Draw badge background
    ctx.fillStyle = theme === 'minimal-light' ? '#fef3c7' : '#f59e0b';
    ctx.beginPath();
    ctx.roundRect(80, 220, badgeWidth, 54, 27);
    ctx.fill();

    ctx.fillStyle = '#09090b';
    ctx.fillText(badgeText, 105, 258);

    // Hook Subtitle
    ctx.font = 'bold 36px "PingFang TC", sans-serif';
    ctx.fillStyle = theme === 'minimal-light' ? '#d97706' : '#fbbf24';
    ctx.fillText(slide.hook, 80, 340);

    // Main Title (Multi-line)
    ctx.font = '900 64px "PingFang TC", sans-serif';
    ctx.fillStyle = theme === 'minimal-light' ? '#18181b' : '#ffffff';
    const lines = slide.title.split('\n');
    let currentY = 440;
    for (const line of lines) {
      ctx.fillText(line, 80, currentY);
      currentY += 85;
    }

    // Body items box
    currentY += 40;
    for (const item of slide.body) {
      // Checkmark icon background
      ctx.fillStyle = theme === 'minimal-light' ? '#e4e4e7' : 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.roundRect(80, currentY - 38, 48, 48, 12);
      ctx.fill();

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText('✓', 93, currentY - 2);

      // Item text
      ctx.font = '500 36px "PingFang TC", sans-serif';
      ctx.fillStyle = theme === 'minimal-light' ? '#27272a' : '#e7e5e4';
      ctx.fillText(item, 150, currentY);
      currentY += 75;
    }

    // Highlight Box
    if (slide.highlight) {
      currentY += 40;
      ctx.fillStyle = theme === 'minimal-light' ? '#fffbeb' : 'rgba(245, 158, 11, 0.12)';
      ctx.strokeStyle = theme === 'minimal-light' ? '#fde68a' : '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(80, currentY - 20, 920, 120, 24);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = theme === 'minimal-light' ? '#92400e' : '#fef08a';
      ctx.font = 'bold 32px "PingFang TC", sans-serif';
      ctx.fillText(slide.highlight, 120, currentY + 45);
    }

    // Footer Hint with Arrow
    ctx.fillStyle = theme === 'minimal-light' ? '#52525b' : '#a8a29e';
    ctx.font = 'bold 32px "PingFang TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(slide.footerHint, 540, 1260);

    return canvas.toDataURL('image/png');
  };

  const handleDownloadSingleCard = () => {
    const dataUrl = renderCardToCanvas(currentSlide, themeMode);
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `ideax_carousel_card_${currentSlide.cardIndex}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (showToast) showToast(`已下載 Card ${currentSlide.cardIndex} 圖片 (1080×1350)！`, 'success');
  };

  const handleDownloadAllCardsZip = async () => {
    setIsExportingZip(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(`ideax_${currentCampaign.id}_cards`);

      for (const slide of currentCampaign.slides) {
        const dataUrl = renderCardToCanvas(slide, themeMode);
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
        folder?.file(`Card_${slide.cardIndex}_1080x1350.png`, base64Data, { base64: true });
      }

      // Also include copy caption text file
      folder?.file(
        'IG_Caption_貼文文案.txt',
        `${currentCampaign.title}\n\n${currentCampaign.captionText}\n\n${currentCampaign.hashtags.join(' ')}`
      );

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ideax_${currentCampaign.id}_5cards_bundle.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (showToast) showToast('已成功打包下載 5 張圖卡 (ZIP) 與文案檔案！', 'success');
    } catch (err) {
      console.error(err);
      if (showToast) showToast('下載失敗，請稍後重試', 'error');
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl bg-stone-900 text-stone-100 rounded-3xl shadow-2xl border border-stone-800 overflow-hidden flex flex-col h-[94vh] max-h-[94vh]">
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950/50 border-b border-stone-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center shadow-lg font-black shrink-0">
              <Sparkles className="w-6 h-6 fill-stone-950" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  行銷素材庫 • 社群輪播圖卡工作室
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 font-black text-xs">
                  社群媒體專用
                </span>
                <span className="px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 font-mono text-xs">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                為創星季與生活痛點打造的高點擊率 4:5 輪播圖卡（Carousel）與爆款社群文案
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
            title="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Campaign Switcher Bar */}
        <div className="px-4 sm:px-6 py-3 bg-stone-950/90 border-b border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto">
            {CAMPAIGNS.map((c) => {
              const isSelected = activeCampaignId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setActiveCampaignId(c.id);
                    setActiveSlideIndex(0);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-500 text-stone-950 shadow-xs'
                      : 'bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>{c.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
                    isSelected ? 'bg-amber-600 text-stone-950' : 'bg-stone-900 text-stone-400'
                  }`}>
                    {c.tag}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sub Navigation */}
          <div className="flex items-center gap-1.5 bg-stone-900 p-1 rounded-xl border border-stone-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('carousel')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'carousel' ? 'bg-stone-800 text-white' : 'text-stone-400 hover:text-white'
              }`}
            >
              4:5 輪播圖卡
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('threads')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'threads' ? 'bg-stone-800 text-white' : 'text-stone-400 hover:text-white'
              }`}
            >
              Threads 文案
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('guidelines')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'guidelines' ? 'bg-stone-800 text-white' : 'text-stone-400 hover:text-white'
              }`}
            >
              排版指引
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {activeTab === 'carousel' && (
            <>
              {/* Left Column: Interactive 4:5 Card Visual Preview (5 cols) */}
              <div className="lg:col-span-5 flex flex-col items-center justify-start space-y-4">
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-stone-300">
                      社群手機螢幕視覺預覽 (4:5 比例)
                    </span>
                  </div>

                  {/* Theme Switcher */}
                  <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setThemeMode('amber-black')}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                        themeMode === 'amber-black' ? 'bg-amber-500 text-stone-950' : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      黑金
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemeMode('minimal-light')}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                        themeMode === 'minimal-light' ? 'bg-white text-stone-950' : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      極簡白
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemeMode('neon-dark')}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                        themeMode === 'neon-dark' ? 'bg-purple-600 text-white' : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      霓虹紫
                    </button>
                  </div>
                </div>

                {/* The 4:5 Card Container (Aspect Ratio 4/5) */}
                <div
                  className={`w-full max-w-[360px] aspect-[4/5] rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col justify-between border relative overflow-hidden transition-all select-none ${
                    themeMode === 'amber-black'
                      ? 'bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 border-amber-500/30 text-white'
                      : themeMode === 'neon-dark'
                      ? 'bg-stone-950 border-purple-500/40 text-white shadow-purple-950/50'
                      : 'bg-white border-stone-300 text-stone-900 shadow-stone-400/20'
                  }`}
                >
                  {/* Subtle Glow */}
                  {themeMode === 'amber-black' && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                  )}
                  {themeMode === 'neon-dark' && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
                  )}

                  {/* Card Header */}
                  <div className="relative z-10">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-md bg-amber-500 text-stone-950 font-black text-[11px] flex items-center justify-center">
                          💡
                        </div>
                        <span className="font-black text-xs tracking-tight">IdeaX 創點子</span>
                        <span className="text-[10px] text-stone-400 font-mono">@ideax_tw</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                        {currentSlide.cardIndex} / 5
                      </span>
                    </div>

                    {/* Badge */}
                    <div className="mt-4">
                      <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black bg-amber-500 text-stone-950 shadow-xs">
                        {currentSlide.badge}
                      </span>
                    </div>

                    {/* Hook */}
                    <p className="text-xs font-bold text-amber-400 mt-2">
                      {currentSlide.hook}
                    </p>

                    {/* Main Title */}
                    <h3 className="text-base sm:text-lg font-black tracking-tight mt-1.5 leading-snug whitespace-pre-line">
                      {currentSlide.title}
                    </h3>
                  </div>

                  {/* Card Body Bullet Points */}
                  <div className="relative z-10 space-y-2 my-auto">
                    {currentSlide.body.map((b, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded bg-amber-500/20 text-amber-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          ✓
                        </span>
                        <span className="text-xs leading-relaxed opacity-90 font-medium">
                          {b}
                        </span>
                      </div>
                    ))}

                    {currentSlide.highlight && (
                      <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold mt-2 leading-relaxed">
                        {currentSlide.highlight}
                      </div>
                    )}
                  </div>

                  {/* Card Footer Hint */}
                  <div className="relative z-10 pt-3 border-t border-white/10 text-center">
                    <span className="text-[11px] font-bold text-stone-400 flex items-center justify-center gap-1">
                      <span>{currentSlide.footerHint}</span>
                    </span>
                  </div>
                </div>

                {/* Card Slide Selector (1 to 5) */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={activeSlideIndex === 0}
                    onClick={() => setActiveSlideIndex((prev) => Math.max(0, prev - 1))}
                    className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed text-white cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1.5">
                    {currentCampaign.slides.map((s, idx) => (
                      <button
                        key={s.cardIndex}
                        type="button"
                        onClick={() => setActiveSlideIndex(idx)}
                        className={`w-8 h-8 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                          activeSlideIndex === idx
                            ? 'bg-amber-500 text-stone-950 font-black shadow-md scale-105'
                            : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-white'
                        }`}
                      >
                        {s.cardIndex}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={activeSlideIndex === currentCampaign.slides.length - 1}
                    onClick={() => setActiveSlideIndex((prev) => Math.min(currentCampaign.slides.length - 1, prev + 1))}
                    className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed text-white cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick Card Export Buttons */}
                <div className="flex items-center gap-2 flex-wrap justify-center w-full">
                  <button
                    type="button"
                    onClick={handleDownloadSingleCard}
                    className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>下載當前圖卡 PNG (1080×1350)</span>
                  </button>

                  <button
                    type="button"
                    disabled={isExportingZip}
                    onClick={handleDownloadAllCardsZip}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isExportingZip ? '打包中...' : '一鍵下載整套 5 張圖卡 (ZIP)'}</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Copyable IG Captions & Slide Breakdown (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {/* Campaign Strategy Info */}
                <div className="p-4 rounded-2xl bg-stone-800/80 border border-stone-700/80 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span>{currentCampaign.title}</span>
                    </span>
                    <span className="text-[11px] text-stone-400">
                      目標受眾：<strong className="text-stone-300">{currentCampaign.targetAudience}</strong>
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    {currentCampaign.summary}
                  </p>
                </div>

                {/* Complete IG Caption Box */}
                <div className="p-4 sm:p-5 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-stone-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-400" />
                      <h4 className="font-extrabold text-xs sm:text-sm text-white">
                        完整 Instagram 貼文文案 (可直接發布)
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyCaption}
                      className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                    >
                      {copiedCaption ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-stone-950" />
                          <span>已複製文案！</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>複製完整貼文文案</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Caption Text Viewer */}
                  <div className="p-3.5 rounded-xl bg-stone-900 border border-stone-800/80 text-stone-200 text-xs font-mono whitespace-pre-line leading-relaxed max-h-52 overflow-y-auto">
                    {currentCampaign.captionText}
                  </div>

                  {/* Hashtags */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[11px] font-bold text-stone-400">標籤：</span>
                    {currentCampaign.hashtags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-stone-800 text-amber-300 border border-stone-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 5 Cards Breakdown Checklist */}
                <div className="p-4 rounded-2xl bg-stone-800/60 border border-stone-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-xs text-stone-200 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-amber-400" />
                      <span>輪播 5 張卡片圖文拆解</span>
                    </h5>
                    <button
                      type="button"
                      onClick={handleCopySlideText}
                      className="text-xs text-amber-400 hover:underline font-bold cursor-pointer flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>複製當前 Card {currentSlide.cardIndex} 文字</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {currentCampaign.slides.map((s, idx) => {
                      const isCur = activeSlideIndex === idx;
                      return (
                        <div
                          key={s.cardIndex}
                          onClick={() => setActiveSlideIndex(idx)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 text-xs ${
                            isCur
                              ? 'bg-stone-900 border-amber-500/80 ring-1 ring-amber-500'
                              : 'bg-stone-900/60 border-stone-800 hover:border-stone-700'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-amber-400">
                                Card {s.cardIndex}
                              </span>
                              <span className="font-bold text-white">
                                {s.badge}
                              </span>
                            </div>
                            <p className="text-stone-300 font-medium">
                              {s.title.replace('\n', ' ')}
                            </p>
                          </div>
                          <span className="text-[10px] text-stone-400 shrink-0">
                            {isCur ? '檢視中' : '點擊切換'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Threads Tab */}
          {activeTab === 'threads' && (
            <div className="lg:col-span-12 space-y-4">
              <div className="p-4 rounded-2xl bg-stone-800 border border-stone-700 space-y-2">
                <h4 className="font-black text-sm text-white flex items-center gap-2">
                  <span>🧵 Threads 脆的精準破圈短文案庫</span>
                </h4>
                <p className="text-xs text-stone-300">
                  Threads 平台喜愛「簡短、第一人稱、反思真實感、不假修飾」的對話口吻。以下提供 3 種不同調性的爆款短貼文：
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    title: '痛點共鳴型（最高觸及）',
                    copy: `真的受不了每次外宿房東附的洗衣機永遠卡著前房客的毛屑...\n買洗脫烘搬家又帶不走，到底有沒有人能發明模組化微型洗脫烘？\n\n昨天在 IdeaX 寫下這個痛點，居然直接收到了 6 位讀者打賞支持點數，還有 2 位硬體工程師在底下討論要怎麼做出來。\n\n原來把生活中討厭的爛事寫出來，也是能變現的。\n有人也有同感嗎？留言告訴我`,
                  },
                  {
                    title: '創星季零門檻衝刺型',
                    copy: `以為商業競賽都要懂寫程式、寫 50 頁 PPT 才能參加？\n【IdeaX 創星季】直接把門檻打到地表：\n\n1. 痛點洞察獎：只寫問題不用解法就能得獎\n2. 微型解方獎：手繪一張草圖也算數\n3. 讀者打賞獎：有人支持平台 1:1 加碼獎金\n\n零報名費，大學生上班族都能投。\n連結放在主頁，這年頭能躺著拿證書的比賽不多了，衝一波吧！`,
                  },
                  {
                    title: '副業反思型（創作者最愛）',
                    copy: `不要再只把你的好點子悶在心裡發霉了。\n\n在 IdeaX 上，一個平凡的大學生寫下「買青菜一人吃不完」的生活困擾，結果登上全站熱議榜，還拿到了創星季生活洞察獎金。\n\n世界不需要更多完美的空想，世界需要你點出那件「大家都覺得很煩但沒人解決」的小事。\n\n今天下班前，去 IdeaX 寫下你最受不了的事吧。`,
                  },
                ].map((th, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {th.title}
                      </span>
                      <p className="mt-3 text-xs text-stone-200 font-mono whitespace-pre-line leading-relaxed">
                        {th.copy}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(th.copy);
                          if (showToast) showToast(`已複製「${th.title}」貼文！`, 'success');
                        }
                      }}
                      className="w-full py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-amber-400" />
                      <span>複製此則文案</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Guidelines Tab */}
          {activeTab === 'guidelines' && (
            <div className="lg:col-span-12 space-y-4">
              <div className="p-5 rounded-2xl bg-stone-800 border border-stone-700 space-y-3 text-xs leading-relaxed">
                <h4 className="font-black text-sm text-white flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <span>Instagram 4:5 輪播貼文高成效排版指南</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
                    <strong className="text-amber-400 block font-bold text-xs">
                      1. 尺寸堅持 4:5（1080 × 1350 px）
                    </strong>
                    <p className="text-stone-300">
                      不要使用 1:1 正方形！4:5 比例在手機直式瀑布流中佔據最多版面（螢幕涵蓋率高出 25%），使用者滑過去時不易被忽略，能大幅提升停留意願。
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
                    <strong className="text-amber-400 block font-bold text-xs">
                      2. 單張卡片文字不超過 5 行
                    </strong>
                    <p className="text-stone-300">
                      每張卡片只傳達一個核心重點！字體放大、重點字詞用亮黃色底或醒目框標註，確保在小手機螢幕上也能一秒辨識。
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
                    <strong className="text-amber-400 block font-bold text-xs">
                      3. 右下角滑動指引（👉）不可少
                    </strong>
                    <p className="text-stone-300">
                      在 Card 1 到 Card 4 的右下角加註「👉 滑動看更多」或指示箭頭，平均能提升 25% ~ 35% 的連續翻閱率與演算法權重。
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
                    <strong className="text-amber-400 block font-bold text-xs">
                      4. Card 5 必放明確行動呼籲 (CTA)
                    </strong>
                    <p className="text-stone-300">
                      最後一張卡片引導使用者「點擊 Bio 連結註冊」或「在留言區分享你的痛點抽支持金」，創造高留言互動率。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-stone-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>素材庫狀態就緒 • 支援高畫質 PNG 匯出與 ZIP 打包下載</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold cursor-pointer transition-colors"
            >
              關閉素材庫
            </button>
            <button
              type="button"
              disabled={isExportingZip}
              onClick={handleDownloadAllCardsZip}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 text-xs font-black shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingZip ? '打包中...' : '下載整套 5 張圖卡 (ZIP)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
