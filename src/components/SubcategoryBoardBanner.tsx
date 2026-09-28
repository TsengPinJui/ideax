import React, { useState } from 'react';
import { Category, Subcategory, CATEGORY_HIERARCHY, Solver, Question } from '../types';
import { HelpTooltip } from './HelpTooltip';
import {
  Rocket,
  Briefcase,
  GraduationCap,
  LifeBuoy,
  Tag,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  Award,
  Users,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  Pin,
} from 'lucide-react';

interface SubcategoryBoardBannerProps {
  category: Category;
  subcategory: string;
  totalQuestionsCount: number;
  totalBountyAmount: number;
  featuredSolvers?: Solver[];
  onOpenCreateQuestion: () => void;
  onSelectCategory: (cat: Category | '全部', sub?: string | '全部') => void;
  onFilterSolver?: (sub: string) => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
  onSearchTag?: (tag: string) => void;
}

// 次分類元數據：自訂描述、特色標籤、熱門痛點方向
export const SUBCATEGORY_DETAILS: Record<
  string,
  {
    tagline: string;
    description: string;
    trendingTopics: string[];
    recommendedSkills: string[];
    bountyLevelHint: string;
  }
> = {
  // 創新創業
  資訊科技: {
    tagline: '軟體架構、AI 大模型落地、高併發與雲端資安',
    description:
      '聚焦 Generative AI 應用開發、企業內部知識庫 RAG 隔離、微服務架構降本與雲端 DevOps 自動化實務難題。',
    trendingTopics: ['LLM Token 降本', 'RAG 向量權限隔離', '高併發資料庫', 'API 整合架構'],
    recommendedSkills: ['系統架構師', 'GenAI 工程師', '資深全端工程師', '雲端 DevOps 顧問'],
    bountyLevelHint: 'L2 ~ L4（常見懸賞 NT$ 2,500 ~ 120,000）',
  },
  生醫材料: {
    tagline: '醫材認證、臨床前期驗證、生化感測與材料改質',
    description:
      '串接生醫實驗室前瞻成果、生醫晶片技術移轉、ISO 13485 醫療器材認證與生質材料量產技術突破。',
    trendingTopics: ['生醫晶片技轉', '醫材法規認證', '材料量產製程', '產學合作合規'],
    recommendedSkills: ['生醫工程博士', '專利技轉律師', '醫材法規顧問', '生技創投顧問'],
    bountyLevelHint: 'L3 ~ L4（常見懸賞 NT$ 5,000 ~ 80,000）',
  },
  機械工業: {
    tagline: '精密機械、自動化硬體、機器人扭矩與物聯網感知',
    description:
      '深入智慧製造機電整合、機器人關節與減速機自主研發、工業物聯網（IIoT）與實體空間邊界防護。',
    trendingTopics: ['關節力矩回授補償', '自走車導航控制', 'IIoT 工業協定', '安防尾隨辨識'],
    recommendedSkills: ['自動控制博士', '機電整合顧問', '工業物聯網架構師', '智慧硬體設計師'],
    bountyLevelHint: 'L2 ~ L4（常見懸賞 NT$ 2,000 ~ 25,000）',
  },
  服務餐飲: {
    tagline: '生活服務 O2O、門市獲客、私域社群與加盟商務分成',
    description:
      '專注校園商圈異業聯盟、無人餐飲零售、外送平台抽成分成重塑、訂閱制續約留存及 D2C 品牌裂變。',
    trendingTopics: ['校園商圈異業結盟', '借傘/充電寶廣告轉換', '外送平台毛利重塑', '訂閱制斷訂挽回'],
    recommendedSkills: ['雙邊市場顧問', '生活服務產品總監', '餐飲連鎖營運操盤手', '私域增長專家'],
    bountyLevelHint: 'L1 ~ L3（常見懸賞 NT$ 500 ~ 3,000）',
  },
  文創工藝: {
    tagline: '群眾募資、IP 授權、視覺內容矩陣與文化創意產業化',
    description:
      '聚焦原創品牌從 0 到 1 破圈、群募預購飛輪建立、創作者經濟分潤機制與文化資產數位轉型。',
    trendingTopics: ['群眾募資冷啟動', 'KOL 種草帶貨矩陣', 'IP 授權衍生品', '文化品牌跨界聯名'],
    recommendedSkills: ['群募操盤手', '品牌策略師', '文創 IP 經紀人', '集客式行銷總監'],
    bountyLevelHint: 'L1 ~ L3（常見懸賞 NT$ 500 ~ 5,000）',
  },

  // 專業問題
  水電: {
    tagline: '建築機電、老屋配管、跳電抓漏、加壓馬達與智慧家庭',
    description:
      '專解老舊住宅管線重拉、水壓忽大忽小與溫差排查、暗管漏水紅外線探測及用電負載迴路安全規劃。',
    trendingTopics: ['老屋電線抽換法規', '熱水器忽冷忽熱', '隱匿性暗管抓漏', '變頻加壓馬達水錘'],
    recommendedSkills: ['甲級水電技師', '建築機電整合顧問', '防水抓漏工程師', '智慧家庭弱電技師'],
    bountyLevelHint: 'L1 ~ L2（常見懸賞 NT$ 300 ~ 1,500）',
  },
  室內裝修: {
    tagline: '空間坪效優化、裝修工法估價、綠建材審查與施工監理',
    description:
      '商業空間與住宅動線規劃、老屋翻修預算拆解、統包工班工程驗收點排查及室內裝修審查法規實戰。',
    trendingTopics: ['老屋翻修估價陷阱', '商業空間消防審查', '隔音減噪工法', '軟裝色彩與採光配置'],
    recommendedSkills: ['室內建築師', '裝修工程監理師', '空間規劃顧問', '統包專案經理'],
    bountyLevelHint: 'L1 ~ L3（常見懸賞 NT$ 500 ~ 3,000）',
  },
  法律智財: {
    tagline: '新創融資 SAFE、股權架構、專利規避、競業條款與跨國合規',
    description:
      '涵蓋天使輪特別股設計、外資投審會審查、公司法閉鎖性章程、營業秘密防禦及商標專利爭議評估。',
    trendingTopics: ['美台跨國 SAFE 協議', '閉鎖性公司特別股設計', '專利侵權 FTO 檢索', '核心技術競業禁止'],
    recommendedSkills: ['新創專精律師', '專利代理人 / 智財顧問', '早期融資法律顧問', '企業合規長'],
    bountyLevelHint: 'L2 ~ L4（常見懸賞 NT$ 2,000 ~ 15,000）',
  },
  會計稅務: {
    tagline: '財稅申報、股權價值評估、跨境移轉訂價與研發投抵',
    description:
      '輔導企業稅務合規、中小企業研發投資抵減申報、跨國電商扣繳申報與投資人 Cap Table 估值建模。',
    trendingTopics: ['研發投資稅額抵減', '跨境電商稅務合規', '股權激勵員工課稅', '營所稅未分配盈餘'],
    recommendedSkills: ['執業會計師 (CPA)', '稅務規劃顧問', '財務估值分析師', '新創 CFO 顧問'],
    bountyLevelHint: 'L1 ~ L3（常見懸賞 NT$ 1,000 ~ 8,000）',
  },
  企業管理: {
    tagline: 'SaaS 定價、Unit Economics、組織績效 OKR 與供應鏈庫存',
    description:
      '專門診斷軟體產品 Freemium 向席次計費過渡、客戶生命週期價值（LTV/CAC）槓桿與連鎖零售動態定價。',
    trendingTopics: ['B2B SaaS 席次定價', '剩食零售動態降價', 'PLG 增長漏斗', '組織敏捷轉型'],
    recommendedSkills: ['B2B 商業架構師', '前矽谷增長負責人', '連鎖零售營運協理', '供應鏈大數據科學家'],
    bountyLevelHint: 'L2 ~ L4（常見懸賞 NT$ 1,500 ~ 12,000）',
  },

  // 學術探討
  生技醫療: {
    tagline: '生醫感測微流體、臨床前試驗設計與產學科研專利授權',
    description:
      '探討尖端生醫檢測、微流體晶片製程、學術技轉 Spin-off 權益分配與國科會/生技產業研發補助案規劃。',
    trendingTopics: ['微流體光學檢測', '學術技轉股權分成', '臨床前安全性數據', '生醫專利布局'],
    recommendedSkills: ['生醫產學特聘教授', '科研政策研究員', '生技創投合夥人', '專利技轉律師'],
    bountyLevelHint: 'L3 ~ L4（常見懸賞 NT$ 3,000 ~ 50,000）',
  },
  資訊工程: {
    tagline: '演算法複雜度、分散式共識、編譯技術與底層核心架構',
    description:
      '探討高效能平行計算、非同步架構優化、記憶體安全模型以及前沿密碼學與分散式系統研究。',
    trendingTopics: ['分散式資料庫一致性', 'GPU 叢集推理調度', '核心演算法複雜度', 'WebAssembly 跨端移植'],
    recommendedSkills: ['資工系資深教授', '底層架構首席科學家', '分散式系統工程師', '高效能計算研究員'],
    bountyLevelHint: 'L2 ~ L4（常見懸賞 NT$ 1,500 ~ 20,000）',
  },
  電機: {
    tagline: '半導體製程、射頻電路、高頻通訊與電力電子驅動',
    description:
      '探討寬能隙半導體（SiC/GaN）、RF 射頻電路抗雜訊匹配、電力微網轉換效率與嵌入式訊號處理。',
    trendingTopics: ['GaN 高頻功率轉換', 'RF 匹配網路抗干擾', '微電網逆變器拓撲', '數位訊號處理 DSP'],
    recommendedSkills: ['電機工程博士', '射頻硬體架構師', '電力電子顧問', '半導體研發總監'],
    bountyLevelHint: 'L2 ~ L4（常見懸賞 NT$ 2,000 ~ 30,000）',
  },
  法律政治: {
    tagline: '法理學思辨、憲法公法審查、地緣政治經貿與公共政策',
    description:
      '聚焦國際經貿法規、新興科技立法衝擊、智財法制哲學與公共治理政策利弊評估。',
    trendingTopics: ['AI 生成著作權歸屬', '跨國數位貿易關稅', '隱私法制跨國遵循', '公共政策評估模型'],
    recommendedSkills: ['法學教授', '國際法專家', '政策研究員', '資深公法學者'],
    bountyLevelHint: 'L1 ~ L3（常見懸賞 NT$ 500 ~ 6,000）',
  },
  商管: {
    tagline: '管理科學、計量經濟、雙邊網路效應與公司治理理論',
    description:
      '結合實證研究與商業理論，解析平台經濟學、消費者行為決策偏誤、多角化戰略與資本市場訊號。',
    trendingTopics: ['雙邊市場定價理論', '行為經濟學 nudge', '動態能力框架驗證', 'ESG 與資本成本實證'],
    recommendedSkills: ['商學院教授', '管理科學博士', '戰略諮詢合夥人', '計量經濟分析師'],
    bountyLevelHint: 'L2 ~ L4（常見懸賞 NT$ 1,000 ~ 10,000）',
  },
  文學: {
    tagline: '敘事學結構、古典與當代文學評論、跨文化翻譯與文本分析',
    description:
      '探討虛擬文本敘事理論、跨媒介世界觀建構、文學史思潮考據與跨語際翻譯修辭。',
    trendingTopics: ['跨媒介敘事世界觀', '現代詩韻律與解構', '翻譯本地化對等', '文本情感脈絡探源'],
    recommendedSkills: ['文學評論學者', '資深文學翻譯家', '創意寫作導師', '文化研究博士'],
    bountyLevelHint: 'L0 ~ L2（常見懸賞 NT$ 0 ~ 2,000）',
  },
  社會科學: {
    tagline: '社會學質性研究、虛擬陪伴倫理、人口結構與青年群體行為',
    description:
      '探討生成式 AI 伴侶對青少年情感依賴之倫理防護、高齡化社會照顧網絡、社群極化與文化認同變遷。',
    trendingTopics: ['AI 虛擬陪伴倫理界線', '社群迴音室心理機制', '青少年數位依賴防護', '勞動市場彈性化衝擊'],
    recommendedSkills: ['社會學研究所教授', '臨床心理師', 'AI 科技倫理顧問', '質性研究方法專家'],
    bountyLevelHint: 'L1 ~ L3（常見懸賞 NT$ 1,000 ~ 6,000）',
  },
  藝術設計: {
    tagline: '人機互動介面設計、生成式美學、空間沉浸與品牌識別',
    description:
      '聚焦極簡無障礙設計、次世代人機互動 UI/UX、實體品牌空間展演與跨領域美學實驗。',
    trendingTopics: ['無障礙 Design System', '生成式視覺藝術邊界', '沉浸式展演動線', '品牌動態識別系統'],
    recommendedSkills: ['資深設計總監', '跨領域當代藝術家', 'UI/UX 架構師', '視覺傳達特聘講師'],
    bountyLevelHint: 'L1 ~ L3（常見懸賞 NT$ 800 ~ 5,000）',
  },

  // 日常疑難
  職場: {
    tagline: '跨領域轉職、科技業獵才薪資談判、向上管理與扁平溝通',
    description:
      '協助職涯新人建立提問與對齊期望模板、資深工程跨轉顧問產品經理、遠端工作自律與年薪躍升談判。',
    trendingTopics: ['非同步溝通提問心法', '傳統工程轉職 AIoT', '科技業 Package 談判', '新人 30 分鐘求助原則'],
    recommendedSkills: ['科技業獵才總監', '職涯策略諮詢師', '新創高階主管', '工程團隊 Tech Lead'],
    bountyLevelHint: 'L0 ~ L1（多為免費交流或小額 NT$ 50 ~ 500）',
  },
  家務: {
    tagline: '智慧家電選配、收納系統規劃、居家環境保養與節能',
    description:
      '針對小坪數高效動線收納、除濕防潮防霉技術、洗脫烘家電故障排除與居家生活動線改善。',
    trendingTopics: ['小坪數系統櫃收納', '北部高濕度防霉規劃', '熱泵乾衣機保養', '全屋淨水系統選購'],
    recommendedSkills: ['整理收納諮詢師', '家電維修達人', '居家環境顧問', '節能生活實踐家'],
    bountyLevelHint: 'L0 ~ L1（多為免費交流或 NT$ 50 ~ 300）',
  },
  感情: {
    tagline: '親密關係溝通、遠距離信任維繫、原生家庭界線與情緒價值',
    description:
      '探討伴侶價值觀衝突調解、非暴力溝通模式建立、長距離戀愛互動儀式感與自我依附風格洞察。',
    trendingTopics: ['依附風格與溝通衝突', '遠距離戀愛維繫之道', '婚姻金錢觀共識建立', '非暴力情緒表達'],
    recommendedSkills: ['心理諮商前輩', '情感關係引導師', '家庭系統溝通顧問', '資深心理社群作者'],
    bountyLevelHint: 'L0 ~ L1（多為溫馨互助免費交流或 NT$ 50 ~ 300）',
  },
  時事: {
    tagline: '產業重大併購、公共民生熱點、科技政策趨勢與經濟透視',
    description:
      '多視角剖析即時熱門議題、產業動態變遷、民生經濟指標解讀與公共政策深度對話。',
    trendingTopics: ['央行利率政策對房貸影響', '科技巨頭反壟斷調查', '可再生能源配比爭議', '民生外食通膨趨勢'],
    recommendedSkills: ['總經財經分析師', '資深新聞媒體人', '產業研究員', '政策評論員'],
    bountyLevelHint: 'L0 ~ L1（社群開放式激盪交流）',
  },
  購物: {
    tagline: '高單價商品採購避坑、性價比評測、二手市場驗貨與售後',
    description:
      '大至筆電汽機車小至專業廚電選購、各品牌真實耐用度回饋與跨境海淘稅費驗貨守則。',
    trendingTopics: ['高規工作站筆電橫評', '二手旗艦手機驗機防翻車', '人體工學椅選購避雷', '日本亞馬遜直送保固'],
    recommendedSkills: ['硬體 3C 評測達人', '專業採購經理', '二手重機/汽車檢驗師', '生活選品操盤手'],
    bountyLevelHint: 'L0 ~ L1（社群心得避坑交流）',
  },
  其他: {
    tagline: '開放式探索、小眾趣味愛好與多元奇思妙想交流',
    description:
      '不受限於現有分類的奇特問題、跨界靈感啟發或生活各類冷門知識疑難雜症。',
    trendingTopics: ['冷門樂器自學路徑', '老舊黑膠唱盤修復', '小眾城市漫遊探索', '個人手作工藝嘗試'],
    recommendedSkills: ['多元斜槓達人', '小眾文化收藏家', '好奇心探索家'],
    bountyLevelHint: 'L0 ~ L2（自由懸賞與交流）',
  },
};

// 分類主題色系與圖標映射
const CATEGORY_STYLE: Record<
  Category,
  {
    themeBg: string;
    themeBorder: string;
    themeBadge: string;
    accentText: string;
    icon: React.FC<{ className?: string }>;
  }
> = {
  創新創業: {
    themeBg: 'bg-gradient-to-br from-amber-500/10 via-amber-100/40 to-white',
    themeBorder: 'border-amber-300',
    themeBadge: 'bg-amber-100 text-amber-950 border-amber-300',
    accentText: 'text-amber-800',
    icon: Rocket,
  },
  專業問題: {
    themeBg: 'bg-gradient-to-br from-blue-500/10 via-blue-100/40 to-white',
    themeBorder: 'border-blue-300',
    themeBadge: 'bg-blue-100 text-blue-950 border-blue-300',
    accentText: 'text-blue-800',
    icon: Briefcase,
  },
  學術探討: {
    themeBg: 'bg-gradient-to-br from-purple-500/10 via-purple-100/40 to-white',
    themeBorder: 'border-purple-300',
    themeBadge: 'bg-purple-100 text-purple-950 border-purple-300',
    accentText: 'text-purple-800',
    icon: GraduationCap,
  },
  日常疑難: {
    themeBg: 'bg-gradient-to-br from-emerald-500/10 via-emerald-100/40 to-white',
    themeBorder: 'border-emerald-300',
    themeBadge: 'bg-emerald-100 text-emerald-950 border-emerald-300',
    accentText: 'text-emerald-800',
    icon: LifeBuoy,
  },
};

export const SubcategoryBoardBanner: React.FC<SubcategoryBoardBannerProps> = ({
  category,
  subcategory,
  totalQuestionsCount,
  totalBountyAmount,
  featuredSolvers = [],
  onOpenCreateQuestion,
  onSelectCategory,
  onFilterSolver,
  isPinned,
  onTogglePin,
  onSearchTag,
}) => {
  const [isExpandedOnMobile, setIsExpandedOnMobile] = useState(false);
  const style = CATEGORY_STYLE[category] || CATEGORY_STYLE['創新創業'];
  const MainIcon = style.icon;

  const details = SUBCATEGORY_DETAILS[subcategory] || {
    tagline: `聚焦「${subcategory}」領域真實實戰挑戰`,
    description: `探索「${category} · ${subcategory}」版面的待解懸賞與討論交流，連接各界專家與提問團隊。`,
    trendingTopics: ['深度痛點拆解', '解決方案評估', '同業實戰經驗'],
    recommendedSkills: ['領域認證專家', '資深實務顧問'],
    bountyLevelHint: '全系列懸賞階梯均有分佈',
  };

  const peerSubcategories = (CATEGORY_HIERARCHY[category] || []).filter((s) => s !== subcategory);

  return (
    <div
      className={`rounded-3xl border ${style.themeBorder} ${style.themeBg} p-5 sm:p-7 shadow-xs relative overflow-hidden transition-all`}
    >
      {/* Background soft decorative shapes */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/40 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-amber-200/20 blur-xl pointer-events-none" />

      <div className="relative z-10 space-y-5">
        {/* 1. Breadcrumb navigation */}
        <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium flex-wrap">
          <button
            onClick={() => onSelectCategory('全部', '全部')}
            className="hover:text-stone-900 transition-colors cursor-pointer"
          >
            首頁
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          <button
            onClick={() => onSelectCategory(category, '全部')}
            className="hover:text-stone-900 font-bold transition-colors cursor-pointer flex items-center gap-1"
          >
            <MainIcon className="w-3.5 h-3.5" />
            <span>{category}</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          <span className="font-black text-stone-900 bg-white/80 px-2 py-0.5 rounded-md border border-stone-200 shadow-2xs">
            {subcategory} 子領域看板
          </span>
        </div>

        {/* 2. Board Main Header Info */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`text-xs font-black px-2.5 py-1 rounded-xl border ${style.themeBadge} flex items-center gap-1`}>
                <Tag className="w-3.5 h-3.5" />
                <span>子領域看板</span>
              </span>
              <span className="text-xs font-bold text-stone-600 bg-white/90 px-2.5 py-1 rounded-xl border border-stone-200">
                主分類：{category}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-stone-950 tracking-tight flex items-center gap-2.5 flex-wrap">
              <span className="flex items-center gap-2">
                <span>{subcategory}</span>
                {onTogglePin && (
                  <button
                    onClick={onTogglePin}
                    className={`p-1 rounded-lg transition-all cursor-pointer ${
                      isPinned
                        ? 'bg-amber-100 text-amber-700 border border-amber-300'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-400 hover:text-stone-600 border border-stone-200'
                    }`}
                    title={isPinned ? '取消釘選此看板' : '將此看板設為起始畫面'}
                  >
                    <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-500' : ''}`} />
                  </button>
                )}
              </span>
              <span className="text-base sm:text-lg font-bold text-stone-600">
                · {details.tagline}
              </span>
              <HelpTooltip
                title={`${subcategory} 看板介紹`}
                content={details.description}
              />
            </h1>
          </div>

          {/* Quick CTA and Stats Box */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="bg-white/90 border border-stone-200 rounded-2xl p-2.5 sm:px-4 sm:py-2 text-center shadow-2xs">
                <div className="text-[10px] text-stone-500 font-bold">待解問題</div>
                <div className="text-base sm:text-lg font-black text-stone-900 font-mono">
                  {totalQuestionsCount} <span className="text-xs font-normal text-stone-500">則</span>
                </div>
              </div>

              {totalBountyAmount > 0 && (
                <div className="bg-white/90 border border-amber-300 rounded-2xl p-2.5 sm:px-4 sm:py-2 text-center shadow-2xs">
                  <div className="text-[10px] text-amber-800 font-bold">版面積累懸賞</div>
                  <div className="text-base sm:text-lg font-black text-amber-900 font-mono">
                    NT$ {totalBountyAmount.toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={onOpenCreateQuestion}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-black text-xs sm:text-sm shadow-sm transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Lightbulb className="w-4 h-4 text-stone-950" />
              <span>在看板發布懸賞</span>
            </button>
          </div>
        </div>

        {/* Mobile Expand / Collapse Toggle Button */}
        <div className="sm:hidden pt-1">
          <button
            type="button"
            onClick={() => setIsExpandedOnMobile(!isExpandedOnMobile)}
            className="w-full py-2 px-3 rounded-xl bg-white/80 hover:bg-white text-stone-700 font-bold text-xs border border-stone-200/80 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>{isExpandedOnMobile ? '收合看板詳細資訊' : '展開熱門探討與推薦專業'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpandedOnMobile ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* 3. Trending topics & Expert matching advice (Collapsible on mobile) */}
        <div className={`${isExpandedOnMobile ? 'grid' : 'hidden'} sm:grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-stone-200/70`}>
          {/* 热門探討方向 */}
          <div className="bg-white/70 backdrop-blur-xs rounded-2xl p-3 border border-stone-200/80 space-y-1.5">
            <div className="text-xs font-black text-stone-800 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
              <span>此版面熱門痛點方向：</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {details.trendingTopics.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => {
                    if (onSearchTag) {
                      onSearchTag(topic);
                    }
                  }}
                  className="text-[11px] font-semibold text-stone-700 bg-stone-100 hover:bg-amber-100 hover:text-amber-950 hover:border-amber-300 px-2 py-0.5 rounded-lg border border-stone-200/60 transition-colors cursor-pointer"
                  title={`點擊搜尋「#${topic}」`}
                >
                  #{topic}
                </button>
              ))}
            </div>
          </div>

          {/* 推薦專家畫像 & 賞金常態 */}
          <div className="bg-white/70 backdrop-blur-xs rounded-2xl p-3 border border-stone-200/80 space-y-1.5">
            <div className="text-xs font-black text-stone-800 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>推薦專業</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-700">
              {details.recommendedSkills.map((skill) => (
                <span
                  key={skill}
                  className="text-[11px] font-medium text-blue-900 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200"
                >
                  {skill}
                </span>
              ))}
              <span className="text-[10px] text-stone-500 font-mono ml-auto">
                {details.bountyLevelHint}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Peer subcategories quick navigation (Collapsible on mobile) */}
        {peerSubcategories.length > 0 && (
          <div className={`${isExpandedOnMobile ? 'flex' : 'hidden'} sm:flex pt-2 border-t border-stone-200/60 items-center gap-2 overflow-x-auto scrollbar-none text-xs`}>
            <span className="text-stone-500 font-bold shrink-0 text-[11px]">
              切換「{category}」其他子領域看板：
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {peerSubcategories.map((peer) => (
                <button
                  key={peer}
                  onClick={() => onSelectCategory(category, peer)}
                  className="px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white text-stone-700 hover:text-stone-950 font-medium border border-stone-200/80 hover:border-amber-400 transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>{peer}</span>
                  <ArrowRight className="w-3 h-3 text-stone-400" />
                </button>
              ))}
              <button
                onClick={() => onSelectCategory(category, '全部')}
                className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold transition-colors cursor-pointer"
              >
                看該主分類全部
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
