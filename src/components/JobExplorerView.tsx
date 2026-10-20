import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Rows3,
  Star,
  Send,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Check,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { SousouFlyer } from './sousou/SousouFlyer';
import { accompanyDuringSearch } from './mascot/mascotConfig';

export type JobViewMode = 'large_card' | 'list' | 'small_card';
export type JobSortKey =
  | 'recommended'
  | 'latest_posted'
  | 'salary_min'
  | 'salary_max'
  | 'experience'
  | 'education'
  | 'distance';
export type CarePointKey = 'industry' | 'workEnvironment' | 'benefits' | 'salary' | 'distance';

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  city: string;
  distanceKm: number;
  experience: string;
  experienceYears: number;
  education: string;
  educationLevel: number;
  salaryText: string;
  salaryMin: number;
  salaryMax: number;
  industry: string;
  category: string;
  workEnvironment: string;
  benefits: string;
  description: string;
  url: string;
  urlKind?: 'direct' | 'search'; // direct：連到職缺頁；search：找不到原始職缺頁，改連到搜尋
  urlVerified?: boolean;
  aiScore: number;
  sourcePlatform?: string;
  postedAt?: string; // 刊登時間/日期 (ISO 或 日期字串)
  postedAtText?: string; // 刊登時間顯示文字（如：今日、3天前、10/18）
}

const EXPLORER_QUICK_PRESETS = [
  {
    badge: '💬 口語情境',
    label: '台南餐飲門市 (32K+ / 排班環境)',
    query: '我想在台南市東區找一份連鎖餐飲或零售門市正職人員工作，月薪希望在 32,000 元以上，我很在意店內工作環境與是否有好的排班制度，有哪些現正招募中的真實職缺？',
  },
  {
    badge: '🌐 跨平台來源',
    label: '跨平台求職 (Yes123 / Cake / 1111 / 104)',
    query: '請幫我全網搜尋「數位行銷企劃」或「前端工程師」真實職缺。來源平台要求多元化：請列出來自 Yes123、Cake、Yourator、1111人力銀行、104 等各大求職站當下開放應徵的職缺，附上真實直接連結。',
  },
  {
    badge: '🎯 嚴格門檻',
    label: '雙北雲端架構師 (90K+ / 5年+ / 嚴禁已下架)',
    query: '請搜尋台北市或新北市的「資深雲端架構師／DevOps 工程師」真實職缺。嚴格條件：月薪 90,000 元以上、經歷 5 年以上、具備 Kubernetes 與 AWS。嚴厲要求：絕對不可包含已關閉或已下架職缺，並列出各大求職網真實網址。',
  },
  {
    badge: '🌱 新鮮人友善',
    label: '新鮮人友善 (無經驗可 / 不拘學歷 / 今日刊登)',
    query: '全台灣地區皆可，搜尋適合社會新鮮人、無經驗可、學歷不拘的行政助理或客服人員職缺，月薪 30,000 元以上，請列出當下開放應徵中的最新職缺。',
  },
  {
    badge: '🌫️ 模糊探索',
    label: '內向文職探索 (不面對客人 / 安靜資料整理)',
    query: '我個性比較內向，不想要一直面對陌生客人或打電話業務，想在台中找安靜整理資料、後台打字或系統處理的正職工作，有什麼適合我且現在正在招募的職缺？',
  },
  {
    badge: '💰 薪資非面議',
    label: '桃竹倉儲主管 (45K~65K / 拒絕純面議)',
    query: '搜尋桃園市或新竹縣的倉儲物流主管或供應鏈管理職缺。薪資嚴格限制：必須有明確公開之月薪數字，且月薪介於 45,000 至 65,000 元之間，請勿列出僅標示「待遇面議」而無具體金額的職缺。',
  },
  {
    badge: '⏰ 彈性工讀',
    label: '台南門市彈性兼職 (時薪200+ / 學生或二度就業)',
    query: '搜尋台南市東區或中西區的餐飲或超商門市兼職／工讀人員職缺。條件：時薪 200 元以上、排班彈性、歡迎學生或二度就業。請列出當下正在開放應徵中的真實職缺，包含 Yes123 或 518 等平台真實網址。',
  },
  {
    badge: '📍 籠統位置排查',
    label: '附近工作 (籠統位置向用戶確認)',
    query: '我想要找我家附近的工作，請推薦現正招募中的熱門職缺。',
  },
  {
    badge: '🎓 籠統指涉排查',
    label: '我的大學與專業 (不清不楚向用戶確認)',
    query: '我想依我的大學跟我的專業，找適合我的性格的工作，有什麼好推薦？',
  },
];

export type QuickConditionKey = 'jobType' | 'region' | 'education' | 'experience' | 'location' | 'salary';

/** 選「國外」或「不限」時可以勾選的國家／地區 */
export const JOB_COUNTRIES = ['日本', '新加坡', '香港', '中國大陸', '韓國', '馬來西亞', '越南', '澳洲', '紐西蘭', '美國', '加拿大', '英國', '德國', '全球遠端'];
const REGION_ABROAD_VALUE = '工作範圍：國外';

/** 台灣最低工資（勞動部公告）：2026 年月薪 29,500、時薪 196；2027/1/1 起月薪 30,900、時薪 205 */
export function currentMinimumWage(now = Date.now()): { monthly: number; hourly: number } {
  return now >= Date.parse('2027-01-01T00:00:00+08:00') ? { monthly: 30900, hourly: 205 } : { monthly: 29500, hourly: 196 };
}
const fmt = (n: number) => n.toLocaleString('en-US');

/** 薪水選項：正職用月薪、兼職／計時用時薪，最低一檔就是法定最低工資 */
function salaryOptionsFor(isHourly: boolean): Array<{ label: string; value: string; isSkip?: boolean }> {
  const w = currentMinimumWage();
  if (isHourly) {
    const steps = [w.hourly, 220, 250, 300, 400].filter((v, i, a) => a.indexOf(v) === i && v >= w.hourly);
    return [
      ...steps.map((v, i) => ({
        label: i === 0 ? `時薪 ${v} 元以上（最低工資）` : `時薪 ${v} 元以上`,
        value: `薪水：時薪 ${v} 元以上`,
      })),
      { label: '薪資不拘', value: '薪資待遇不拘' },
      { label: '跳過', value: '跳過', isSkip: true },
    ];
  }
  const steps = [w.monthly, 35000, 45000, 60000, 80000].filter((v, i, a) => a.indexOf(v) === i && v >= w.monthly);
  return [
    ...steps.map((v, i) => ({
      label: i === 0 ? `月薪 ${fmt(v)} 元以上（最低工資）` : `月薪 ${fmt(v)} 元以上`,
      value: `薪水：月薪 ${fmt(v)} 元以上`,
    })),
    { label: '薪資不拘', value: '薪資待遇不拘' },
    { label: '跳過', value: '跳過', isSkip: true },
  ];
}

/** 這則對話的條件是不是兼職／計時（薪水改用時薪） */
const isHourlyContext = (text: string) => /兼職|工讀|打工|計時|part[\s-]?time/i.test(text);
const REGION_BOTH_VALUE = '工作範圍：台灣與國外皆可';
const regionIncludesAbroad = (v?: string) => v === REGION_ABROAD_VALUE || v === REGION_BOTH_VALUE;

/** 匯職缺會搜尋的平台（說明面板用；和後端搜尋分組一致） */
const JOB_SOURCE_GROUPS: Array<{ title: string; sites: string }> = [
  { title: '人力銀行', sites: '104人力銀行、1111人力銀行、Yes123、518熊班' },
  { title: '新創與外商平台', sites: 'Cake、Yourator、Meet.jobs、Glints、LinkedIn、Indeed' },
  { title: '企業官網', sites: '上市櫃公司、外商與中小企業的徵才頁' },
  { title: '公部門與產業平台', sites: '台灣就業通、事求人（公職）、國營事業招考、各縣市就業服務站、各產業專業求職網站' },
  { title: '兼職與接案', sites: '小雞上工、Worky、518熊班兼職、Yes123 打工、1111 兼職、Tasker 出任務' },
  { title: '國外與遠端', sites: 'LinkedIn、Indeed、Glassdoor；日本 doda、Green、Daijob、リクナビNEXT；香港 JobsDB、CTgoodjobs；新加坡 MyCareersFuture、JobStreet；中國大陸 BOSS直聘、51job；韓國 Saramin、JobKorea；美加 ZipRecruiter、Wellfound、Job Bank；英德 Reed、StepStone；澳紐 SEEK；遠端 We Work Remotely、Remote OK' },
];

export const QUICK_CONDITION_STEPS: Array<{
  key: QuickConditionKey;
  label: string;
  question: string;
  options: Array<{ label: string; value: string; isSkip?: boolean }>;
}> = [
  {
    key: 'jobType',
    label: '正職／兼職',
    question: '請問您要找正職還是兼職？',
    options: [
      { label: '正職', value: '工作型態：正職' },
      { label: '兼職／工讀', value: '工作型態：兼職工讀' },
      { label: '實習', value: '工作型態：實習' },
      { label: '正職兼職都可以', value: '工作型態：正職兼職皆可' },
      { label: '跳過', value: '跳過', isSkip: true },
    ],
  },
  {
    key: 'region',
    label: '台灣／國外',
    question: '要找台灣還是國外的工作？（選國外或不限，可以再勾選國家）',
    options: [
      { label: '台灣', value: '工作範圍：台灣' },
      { label: '國外', value: REGION_ABROAD_VALUE },
      { label: '不限（台灣＋國外）', value: REGION_BOTH_VALUE },
      { label: '跳過', value: '跳過', isSkip: true },
    ],
  },
  {
    key: 'education',
    label: '學歷',
    question: '請問您的學歷條件是？',
    options: [
      { label: '高中職以下', value: '學歷：高中職以下' },
      { label: '專科', value: '學歷：專科' },
      { label: '大學', value: '學歷：大學' },
      { label: '碩士以上', value: '學歷：碩士以上' },
      { label: '公立頂大背景', value: '學歷：公立頂大背景' },
      { label: '技職科大背景', value: '學歷：技職科大背景' },
      { label: '私立綜合大學', value: '學歷：私立綜合大學' },
      { label: '學歷不拘', value: '學歷不拘' },
      { label: '跳過', value: '跳過', isSkip: true },
    ],
  },
  {
    key: 'experience',
    label: '經歷',
    question: '請問您的工作經歷條件是？',
    options: [
      { label: '無經驗／新鮮人', value: '經歷：無經驗可、社會新鮮人' },
      { label: '1 年以下', value: '經歷：1 年以下' },
      { label: '1~3 年', value: '經歷：1~3 年工作經驗' },
      { label: '3~5 年', value: '經歷：3~5 年工作經驗' },
      { label: '5 年以上', value: '經歷：5 年以上資深經驗' },
      { label: '學生／新手可', value: '經歷：學生或新手可、排班彈性' },
      { label: '跨領域轉職', value: '經歷：跨領域轉職可' },
      { label: '經歷不拘', value: '經歷不拘' },
      { label: '跳過', value: '跳過', isSkip: true },
    ],
  },
  {
    key: 'location',
    label: '地區',
    question: '請問您希望的工作地區是？',
    options: [
      { label: '台北市', value: '地區：台北市' },
      { label: '新北市', value: '地區：新北市' },
      { label: '桃園市', value: '地區：桃園市' },
      { label: '新竹市', value: '地區：新竹市' },
      { label: '台中市', value: '地區：台中市' },
      { label: '台南市', value: '地區：台南市' },
      { label: '高雄市', value: '地區：高雄市' },
      { label: '遠端工作', value: '地區：遠端工作' },
      { label: '地區不拘', value: '地區不拘' },
      { label: '跳過', value: '跳過', isSkip: true },
    ],
  },
  {
    key: 'salary',
    label: '薪水',
    question: '請問您期望的薪水待遇是？',
    options: salaryOptionsFor(false),
  },
];

export interface DimensionGroup {
  dimension: string;
  title: string;
  question: string;
  isHighlighted: boolean;
  chips: Array<{ label: string; value: string; type: string }>;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  baseBrief?: string;
  pendingBrief?: string;
  searchBriefIfSkipped?: string;
  fallbackBrief?: string;
  confirmed?: boolean;
  isAmbiguous?: boolean;
  hasMoreQuestions?: boolean;
  currentDimension?: string | null;
  dimensionGroups?: DimensionGroup[];
  ambiguousTypes?: string[];
  suggestedChips?: Array<{ label: string; value: string; type: string }>;
  clarificationQuestion?: string;
  activeConditionKey?: QuickConditionKey | null;
  completedConditionKeys?: QuickConditionKey[];
  selectedConditionMap?: Partial<Record<QuickConditionKey, string>>;
  selectedCountries?: string[];
}

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  台北市: { lat: 25.033, lng: 121.5654 },
  新北市: { lat: 25.012, lng: 121.4657 },
  桃園市: { lat: 24.9936, lng: 121.301 },
  新竹市: { lat: 24.8138, lng: 120.9675 },
  台中市: { lat: 24.1477, lng: 120.6736 },
  台南市: { lat: 22.9997, lng: 120.227 },
  高雄市: { lat: 22.6273, lng: 120.3014 },
};

const CARE_POINT_META: Record<CarePointKey, { fieldLabel: string }> = {
  industry: { fieldLabel: '行業' },
  workEnvironment: { fieldLabel: '工作環境' },
  benefits: { fieldLabel: '其他待遇' },
  salary: { fieldLabel: '薪水' },
  distance: { fieldLabel: '距離' },
};

export const JobExplorerView: React.FC = () => {
  // 電腦默認小卡片、手機默認大卡片
  const [viewMode, setViewMode] = useState<JobViewMode>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? 'large_card' : 'small_card';
    }
    return 'small_card';
  });

  // 默認按照「建議」排序
  const [sortBy, setSortBy] = useState<JobSortKey>('recommended');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // 篩選面板收合狀態（預設收合，保持介面乾淨）
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // 手動篩選條件
  const [keyword, setKeyword] = useState('');
  const [selectedCity, setSelectedCity] = useState('全部');
  const [userBaseCity, setUserBaseCity] = useState('台北市');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [minSalaryFilter, setMinSalaryFilter] = useState<number>(0);
  // 篩選：正職／兼職、台灣／國外（含國家）
  const [jobTypeFilter, setJobTypeFilter] = useState<'全部' | '正職' | '兼職' | '實習'>('全部');
  const [regionFilter, setRegionFilter] = useState<'台灣' | '國外' | '台灣與國外'>('台灣');
  const [countryFilter, setCountryFilter] = useState<string[]>([]);
  const isHourlyFilter = jobTypeFilter === '兼職';
  /** 篩選條件組成的搜尋說明（正職／兼職、範圍、時薪） */
  const filterBriefParts = (): string[] => {
    const parts: string[] = [];
    if (jobTypeFilter !== '全部') parts.push(`工作型態：${jobTypeFilter === '兼職' ? '兼職工讀' : jobTypeFilter}`);
    if (regionFilter !== '台灣') {
      const v = regionFilter === '國外' ? '工作範圍：國外' : '工作範圍：台灣與國外皆可';
      parts.push(countryFilter.length ? `${v}（${countryFilter.join('、')}）` : v);
    }
    if (isHourlyFilter && minSalaryFilter > 0) parts.push(`薪水：時薪 ${minSalaryFilter} 元以上`);
    return parts;
  };
  const [maxExpFilter, setMaxExpFilter] = useState<number | 'all'>('all');
  const [maxEduFilter, setMaxEduFilter] = useState<number | 'all'>('all');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  // 收藏職缺（儲存真實職缺物件與 ID）
  const [savedJobsMap, setSavedJobsMap] = useState<Record<string, JobListing>>(() => {
    try {
      const raw = localStorage.getItem('ideax_saved_jobs_map');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const savedJobIds = useMemo(() => Object.keys(savedJobsMap), [savedJobsMap]);

  // 用戶在意的條件
  const [userCarePoints, setUserCarePoints] = useState<CarePointKey[]>([]);

  // 真實搜尋職缺結果（不預載任何模擬假職缺）
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeminiFallbackSearching, setIsGeminiFallbackSearching] = useState(false);
  const [isRegulating, setIsRegulating] = useState(false);
  const [difyConvId, setDifyConvId] = useState<string>('');
  const [pendingConfirmedBrief, setPendingConfirmedBrief] = useState<string>('');
  const [pendingFallbackBrief, setPendingFallbackBrief] = useState<string>('');
  const [searchProgressText, setSearchProgressText] = useState<string>('');
  const [streamingBatchCount, setStreamingBatchCount] = useState<number>(0);
  const [skippedDimensions, setSkippedDimensions] = useState<string[]>([]);
  const [ambiguousClarification, setAmbiguousClarification] = useState<{
    question: string;
    chips: Array<{ label: string; value: string; type: string }>;
  } | null>(null);

  // 自然語言對話（僅在對話進行時展開，可隨時收合）
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('ideax_saved_jobs_map', JSON.stringify(savedJobsMap));
    } catch {}
  }, [savedJobsMap]);

  const toggleSaveJob = (e: React.MouseEvent, job: JobListing) => {
    e.preventDefault();
    e.stopPropagation();
    setSavedJobsMap((prev) => {
      const next = { ...prev };
      if (next[job.id]) {
        delete next[job.id];
      } else {
        next[job.id] = job;
      }
      return next;
    });
  };

  const toggleCarePoint = (key: CarePointKey) => {
    setUserCarePoints((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const detectCarePointsFromText = (text: string): CarePointKey[] => {
    const found: CarePointKey[] = [];
    if (/環境|遠端|wfh|在家|加班|準時|工時|氣氛|設備|冷氣|排班|彈性/i.test(text)) {
      found.push('workEnvironment');
    }
    if (/福利|待遇|年終|獎金|分紅|配股|特休|補助|津貼|供餐|三節|旅遊/i.test(text)) {
      found.push('benefits');
    }
    if (/行業|產業|領域|科技|電商|餐飲|製造|金融|生醫|新創|門市|團購/i.test(text)) {
      found.push('industry');
    }
    if (/薪水|月薪|年薪|底薪|頂薪|高薪|\d+萬|\d+k/i.test(text)) {
      found.push('salary');
    }
    if (/距離|通勤|附近|離家近|捷運|走路/i.test(text)) {
      found.push('distance');
    }
    return found;
  };

  // 點選需求追問快捷標籤（如：台北市、資訊軟體、內向獨立、或「跳過」），自動補充並進入下一個條件選擇
  const handleSelectClarificationChip = (chip: { label: string; value: string; type: string }) => {
    const skipDim = chip.type?.startsWith('skip:') ? chip.type.replace('skip:', '') : undefined;
    if (skipDim) {
      setSkippedDimensions((prev) => (prev.includes(skipDim) ? prev : [...prev, skipDim]));
    }
    void handleSendInput(chip.value, skipDim);
  };

  // 點擊「學歷、經歷、地區、薪水」條件按鈕，切換該條件的選項面板
  const handleToggleQuickConditionStep = (msgId: string, key: QuickConditionKey) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        return {
          ...m,
          activeConditionKey: m.activeConditionKey === key ? null : key,
        };
      })
    );
  };

  // 條件依固定順序組成搜尋說明；「台灣／國外」選了國外時，把勾選的國家放在括號裡
  const QUICK_STEP_ORDER: QuickConditionKey[] = ['jobType', 'region', 'education', 'experience', 'location', 'salary'];
  const composeConditionBrief = (
    m: ChatMessage,
    map: Partial<Record<QuickConditionKey, string>>,
    countries: string[]
  ) => {
    const base = (m.baseBrief ?? m.pendingBrief ?? '').trim();
    const parts = QUICK_STEP_ORDER.map((k) => {
      const v = map[k];
      if (!v) return '';
      if (k === 'region' && regionIncludesAbroad(v) && countries.length > 0) return `${v}（${countries.join('、')}）`;
      return v;
    }).filter(Boolean);
    return [base, ...parts].filter(Boolean).join('、') || `${userBaseCity} 最新招募職缺`;
  };
  const nextOpenStep = (from: QuickConditionKey, completed: QuickConditionKey[]): QuickConditionKey | null => {
    const idx = QUICK_STEP_ORDER.indexOf(from);
    for (let i = 1; i <= QUICK_STEP_ORDER.length; i++) {
      const c = QUICK_STEP_ORDER[(idx + i) % QUICK_STEP_ORDER.length];
      if (!completed.includes(c)) return c;
    }
    return null;
  };

  // 在各條件中點選某個選項（或「跳過」），更新條件並自動進入下一個條件選擇
  const handleSelectQuickConditionOption = (
    msgId: string,
    stepKey: QuickConditionKey,
    opt: { label: string; value: string; isSkip?: boolean }
  ) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        let nextCompleted = (m.completedConditionKeys || []).includes(stepKey)
          ? [...(m.completedConditionKeys || [])]
          : [...(m.completedConditionKeys || []), stepKey];

        const nextMap: Partial<Record<QuickConditionKey, string>> = { ...(m.selectedConditionMap || {}) };
        if (opt.isSkip) delete nextMap[stepKey];
        else nextMap[stepKey] = opt.value;

        // 只找國外：台灣縣市的「地區」條件就不用問了
        if (stepKey === 'region' && opt.value === REGION_ABROAD_VALUE) {
          delete nextMap.location;
          if (!nextCompleted.includes('location')) nextCompleted = [...nextCompleted, 'location'];
        }

        const countries = m.selectedCountries || [];
        const updatedBrief = composeConditionBrief(m, nextMap, countries);
        setPendingConfirmedBrief(updatedBrief);

        // 選了國外或不限：停在這一步讓使用者勾選國家，按「完成」再到下一個條件
        const stayForCountries = stepKey === 'region' && regionIncludesAbroad(opt.value);

        return {
          ...m,
          pendingBrief: updatedBrief,
          text: `已為您設定搜尋條件：${updatedBrief}。確認依此條件搜尋嗎？`,
          completedConditionKeys: nextCompleted,
          selectedConditionMap: nextMap,
          activeConditionKey: stayForCountries ? 'region' : nextOpenStep(stepKey, nextCompleted),
        };
      })
    );
  };

  // 勾選／取消國家
  const handleToggleCountry = (msgId: string, country: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const cur = m.selectedCountries || [];
        const countries = cur.includes(country) ? cur.filter((c) => c !== country) : [...cur, country];
        const updatedBrief = composeConditionBrief(m, m.selectedConditionMap || {}, countries);
        setPendingConfirmedBrief(updatedBrief);
        return {
          ...m,
          selectedCountries: countries,
          pendingBrief: updatedBrief,
          text: `已為您設定搜尋條件：${updatedBrief}。確認依此條件搜尋嗎？`,
        };
      })
    );
  };

  // 國家勾選完成，前往下一個條件
  const handleFinishCountries = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, activeConditionKey: nextOpenStep('region', m.completedConditionKeys || []) } : m))
    );
  };

  // Stage 2：確認需求後轉交「探險家(搜搜)」Agent 搜尋真實職缺；若斷線或超過 2 分鐘無反應則提示改由內建 Gemini（小燈泡）接手
  const handleForwardToExplorerAgent = async (
    confirmedBriefToUse?: string,
    msgIdToMark?: string,
    useGeminiFallback = false
  ) => {
    const rawBrief = (
      confirmedBriefToUse ||
      pendingFallbackBrief ||
      pendingConfirmedBrief ||
      keyword.trim() ||
      `${selectedCity !== '全部' ? selectedCity : ''}${selectedCategory !== '全部' ? selectedCategory : ''}職缺`
    ).trim();
    if (!rawBrief) return;
    // 篩選裡設定的正職／兼職、台灣／國外，對話裡沒提到的話一併帶入
    const extra = filterBriefParts().filter((p) => {
      const key = p.split('：')[0];
      return !rawBrief.includes(key);
    });
    const brief = [rawBrief, ...extra].join('、');

    if (msgIdToMark) {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgIdToMark ? { ...m, confirmed: true, activeConditionKey: null } : m))
      );
    }

    setIsSearching(true);
    setIsGeminiFallbackSearching(useGeminiFallback);
    setHasSearched(true);
    setSearchProgressText('正在啟動全網分批即時檢索...');
    setStreamingBatchCount(0);

    // 在工作搜索過程，讓右下角小燈泡自動出來並陪伴
    accompanyDuringSearch('搜搜正在忙的時候讓小燈泡來陪你玩吧~ \\(≧▽≦)/');

    const controller = new AbortController();
    // 搜搜（Dify）最久可能要 2 分鐘，前端多留一點時間
    const timeoutId = setTimeout(() => controller.abort(), 150000);

    const botMsgId = `exp-stream-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: botMsgId,
        role: 'bot',
        text: '已確認您的條件！正在分批即時檢索全網在招真實職缺（Yes123、Cake、1111、Yourator、104等），首批職缺即將送達...',
        confirmed: true,
      },
    ]);

    let streamSuccess = false;
    let accumulatedJobs: JobListing[] = [];
    const seenJobKeys = new Set<string>();

    try {
      // 1. 優先透過 /api/job-explorer/search-stream 端點進行多批次回傳、前端逐批整合！
      const res = await fetch('/api/job-explorer/search-stream', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: brief,
          filters: {
            keyword: keyword.trim(),
            city: selectedCity,
            userBaseCity,
            category: selectedCategory,
            minSalary: isHourlyFilter ? 0 : minSalaryFilter,
            maxExperienceYears: maxExpFilter,
            maxEducationLevel: maxEduFilter,
            carePoints: userCarePoints,
          },
        }),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
            const trimmed = part.trim();
            if (!trimmed.startsWith('data: ')) continue;
            try {
              const eventData = JSON.parse(trimmed.slice(6));
              if (eventData.type === 'batch' && Array.isArray(eventData.jobs) && eventData.jobs.length > 0) {
                streamSuccess = true;
                const newItems: JobListing[] = [];
                for (const j of eventData.jobs) {
                  const key = `${String(j.company).trim()}_${String(j.title).trim()}`.toLowerCase();
                  if (!seenJobKeys.has(key)) {
                    seenJobKeys.add(key);
                    newItems.push(j);
                  }
                }
                accumulatedJobs = [...accumulatedJobs, ...newItems];
                setJobs([...accumulatedJobs]);
                setSortBy('recommended');
                setSortOrder('desc');
                setStreamingBatchCount(eventData.batchIndex || 1);
                setSearchProgressText(`已收到第 ${eventData.batchIndex || 1} 批職缺（累計 ${accumulatedJobs.length} 筆）...`);

                if (Array.isArray(eventData.carePoints) && eventData.carePoints.length > 0) {
                  setUserCarePoints(eventData.carePoints);
                }

                if (eventData.reply) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === botMsgId
                        ? { ...m, text: `${eventData.reply}（目前累計已整合 ${accumulatedJobs.length} 筆在招職缺）` }
                        : m
                    )
                  );
                }
              } else if (eventData.type === 'done') {
                streamSuccess = true;
                const finalReply = eventData.reply || `全網職缺檢索完成，共整合 ${accumulatedJobs.length} 筆當下開放應徵之真實職缺！`;
                setSearchProgressText(`檢索整合完成，共 ${accumulatedJobs.length} 筆真實職缺`);
                setMessages((prev) =>
                  prev.map((m) => (m.id === botMsgId ? { ...m, text: finalReply } : m))
                );
              }
            } catch (parseError) {
              console.warn('[SSE Parse Error]', parseError);
            }
          }
        }
      }
    } catch (streamErr) {
      console.warn('[Stream Error]', streamErr);
    } finally {
      clearTimeout(timeoutId);
    }

    // 2. 若串流中斷或取得 0 筆，平滑降級至常規同步端點補位
    if (!streamSuccess || accumulatedJobs.length === 0) {
      try {
        const syncRes = await fetch('/api/job-explorer/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: brief,
            useGeminiFallback: true,
            filters: {
              keyword: keyword.trim(),
              city: selectedCity,
              userBaseCity,
              category: selectedCategory,
              minSalary: isHourlyFilter ? 0 : minSalaryFilter,
              maxExperienceYears: maxExpFilter,
              maxEducationLevel: maxEduFilter,
              carePoints: userCarePoints,
            },
          }),
        });

        const syncData = await syncRes.json().catch(() => null);
        if (syncRes.ok && syncData?.success && Array.isArray(syncData.jobs) && syncData.jobs.length > 0) {
          setJobs(syncData.jobs.slice(0, 100));
          setSortBy('recommended');
          setSortOrder('desc');
          setSearchProgressText(`檢索完成，共 ${syncData.jobs.length} 筆職缺`);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === botMsgId
                ? { ...m, text: syncData.reply || `已為您整合出 ${syncData.jobs.length} 筆當下開放應徵職缺！` }
                : m
            )
          );
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === botMsgId
                ? { ...m, text: '未檢索到符合條件的在招職缺，建議您更換關鍵字或放寬條件再試。' }
                : m
            )
          );
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId
              ? { ...m, text: '連線忙碌中，請點擊上方確認按鈕重新搜尋。' }
              : m
          )
        );
      }
    }

    setPendingConfirmedBrief('');
    setPendingFallbackBrief('');
    setIsSearching(false);
    setIsGeminiFallbackSearching(false);
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 80);
  };

  // Stage 1：自然語言輸入先經系統調節器詢問與收集各維度條件（地點、職務/專業、大學/學歷、年資、性格/環境、薪資），亦支援隨時略過問題直接搜尋
  const handleSendInput = async (customText?: string, newlySkippedDim?: string) => {
    const queryText = (customText !== undefined ? customText : chatInput).trim();
    if (!queryText) {
      if (pendingConfirmedBrief) {
        await handleForwardToExplorerAgent(pendingConfirmedBrief);
      }
      return;
    }

    const lastBotMsg = [...messages].reverse().find((m) => m.role === 'bot');
    const inferredSkipDim =
      newlySkippedDim ||
      (/^(跳過|略過|skip)$/i.test(queryText) && lastBotMsg?.currentDimension
        ? lastBotMsg.currentDimension
        : undefined);

    const userHistory = messages.filter((m) => m.role === 'user').map((m) => m.text);
    const effectiveSkipped = inferredSkipDim
      ? Array.from(new Set([...skippedDimensions, inferredSkipDim]))
      : skippedDimensions;

    setIsChatCollapsed(false);
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        text: queryText,
      },
    ]);
    if (customText === undefined) setChatInput('');

    const isConfirmReply =
      !inferredSkipDim &&
      /^(確認|確定|好|好的|對|沒錯|可以|沒問題|開始|搜尋|搜|要|繼續|直接搜|直接搜尋|ok|yes)$/i.test(
        queryText
      );

    // 若處於「搜搜斷線／逾時」詢問狀態且輸入確認詞，改由內建 Gemini（小燈泡）接手搜尋
    if (isConfirmReply && pendingFallbackBrief) {
      await handleForwardToExplorerAgent(pendingFallbackBrief, undefined, true);
      return;
    }

    // 若使用者輸入「確認 / 直接搜尋」，直接以目前累積條件（或預設城市職缺）開始搜尋
    if (isConfirmReply) {
      const briefToSearch = pendingConfirmedBrief || `${userBaseCity} 最新招募職缺`;
      await handleForwardToExplorerAgent(briefToSearch);
      return;
    }

    const detected = detectCarePointsFromText(queryText);
    if (detected.length > 0) {
      setUserCarePoints((prev) => {
        const merged = [...detected];
        for (const p of prev) {
          if (!merged.includes(p)) merged.push(p);
        }
        return merged;
      });
    }

    setIsRegulating(true);
    const isSkipWord = /^(跳過|略過|skip)$/i.test(queryText);
    let nextBrief = isSkipWord
      ? pendingConfirmedBrief
      : pendingConfirmedBrief
      ? `${pendingConfirmedBrief}、${queryText}`
      : queryText;
    const regMsgId = `reg-${Date.now()}`;
    try {
      const res = await fetch('/api/job-explorer/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: queryText,
          previousBrief: pendingConfirmedBrief,
          conversationHistory: userHistory,
          skippedDimensions: effectiveSkipped,
          filters: {
            keyword: keyword.trim(),
            city: selectedCity,
            userBaseCity,
            category: selectedCategory,
            minSalary: isHourlyFilter ? 0 : minSalaryFilter,
            carePoints: detected.length > 0 ? detected : userCarePoints,
          },
        }),
      });

      const data = await res.json().catch(() => null);
      const isAmb = Boolean(data?.isAmbiguous);
      const hasMoreQ = Boolean(data?.hasMoreQuestions);
      const dimGroups: DimensionGroup[] = Array.isArray(data?.dimensionGroups) ? data.dimensionGroups : [];
      const chips: Array<{ label: string; value: string; type: string }> = Array.isArray(data?.suggestedChips)
        ? data.suggestedChips
        : [];
      const cleanBrief =
        typeof data?.confirmedBrief === 'string' && data.confirmedBrief.trim()
          ? data.confirmedBrief
          : nextBrief || `${userBaseCity} 最新招募職缺`;
      const skipSearchBrief = data?.searchBriefIfSkipped || cleanBrief || `${userBaseCity} 最新招募職缺`;
      const completedKeys: QuickConditionKey[] = Array.isArray(data?.completedConditionKeys)
        ? data.completedConditionKeys
        : [];

      setPendingConfirmedBrief(cleanBrief);
      if (Array.isArray(data?.skippedDimensions)) {
        setSkippedDimensions(data.skippedDimensions);
      }
      setAmbiguousClarification(null);

      if (Array.isArray(data?.carePoints) && data.carePoints.length > 0) {
        setUserCarePoints(data.carePoints);
      }

      // 若是從點選追問選項進入確認階段，自動展開下一個尚未選擇的條件（學歷、經歷、地區、薪水）
      const stepOrder: QuickConditionKey[] = ['jobType', 'region', 'education', 'experience', 'location', 'salary'];
      const nextAutoConditionKey =
        !isAmb && customText !== undefined
          ? stepOrder.find((k) => !completedKeys.includes(k)) || null
          : null;

      setMessages((prev) => [
        ...prev,
        {
          id: regMsgId,
          role: 'bot',
          text:
            data?.reply ||
            `已為您設定搜尋條件：${cleanBrief}。確認依此條件搜尋嗎？`,
          baseBrief: cleanBrief,
          pendingBrief: cleanBrief,
          searchBriefIfSkipped: skipSearchBrief,
          confirmed: false,
          isAmbiguous: isAmb,
          hasMoreQuestions: hasMoreQ,
          currentDimension: data?.currentDimension || null,
          dimensionGroups: dimGroups,
          ambiguousTypes: data?.ambiguousTypes || [],
          suggestedChips: chips,
          clarificationQuestion: data?.clarificationQuestion,
          completedConditionKeys: completedKeys,
          activeConditionKey: nextAutoConditionKey,
          selectedConditionMap: {},
        },
      ]);
    } catch {
      const fallbackText = nextBrief || `${userBaseCity} 最新招募職缺`;
      setPendingConfirmedBrief(fallbackText);
      setAmbiguousClarification(null);
      setMessages((prev) => [
        ...prev,
        {
          id: regMsgId,
          role: 'bot',
          text: `已為您設定搜尋條件：${fallbackText}。確認依此條件搜尋嗎？`,
          baseBrief: fallbackText,
          pendingBrief: fallbackText,
          searchBriefIfSkipped: fallbackText,
          confirmed: false,
          completedConditionKeys: [],
          activeConditionKey: null,
          selectedConditionMap: {},
        },
      ]);
    } finally {
      setIsRegulating(false);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
    }
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (keyword.trim()) count++;
    if (selectedCity !== '全部') count++;
    if (selectedCategory !== '全部') count++;
    if (minSalaryFilter > 0) count++;
    if (jobTypeFilter !== '全部') count++;
    if (regionFilter !== '台灣') count++;
    if (maxExpFilter !== 'all') count++;
    if (maxEduFilter !== 'all') count++;
    if (userCarePoints.length > 0) count++;
    return count;
  }, [keyword, selectedCity, selectedCategory, minSalaryFilter, maxExpFilter, maxEduFilter, userCarePoints, jobTypeFilter, regionFilter]);

  // 合併目前列表（或僅顯示收藏職缺）並進行篩選與排序
  const filteredAndSortedJobs = useMemo(() => {
    const sourceList = showSavedOnly ? Object.values(savedJobsMap) : jobs;
    const baseCoord = CITY_COORDS[userBaseCity];

    const withDynamicDistance = sourceList.map((job) => {
      let dist = job.distanceKm || 0;
      const normalizedJobCity = (job.city || '').replace(/臺/g, '台');
      const jobCoord = CITY_COORDS[normalizedJobCity] || CITY_COORDS[job.city];
      if (baseCoord && jobCoord) {
        if (normalizedJobCity === userBaseCity) {
          dist = dist > 0 ? Math.min(dist, 8.5) : 3.2;
        } else {
          const dLat = (jobCoord.lat - baseCoord.lat) * 111;
          const dLng = (jobCoord.lng - baseCoord.lng) * 102;
          dist = Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 10) / 10;
        }
      }

      let bonus = 0;
      if (userCarePoints.includes('salary') && job.salaryMax > 0) bonus += Math.min(12, Math.floor(job.salaryMax / 12000));
      if (userCarePoints.includes('distance') && dist > 0) bonus += Math.max(0, 10 - dist * 0.5);
      if (userCarePoints.includes('workEnvironment') && job.workEnvironment) bonus += 6;
      if (userCarePoints.includes('benefits') && job.benefits) bonus += 6;
      if (userCarePoints.includes('industry') && job.industry) bonus += 6;

      return {
        ...job,
        distanceKm: dist,
        effectiveAiScore: Math.min(99, Math.round((job.aiScore || 85) + bonus)),
      };
    });

    let filtered = withDynamicDistance.filter((job) => {
      if (selectedCity !== '全部') {
        const normSelected = selectedCity.replace(/臺/g, '台');
        const normLoc = `${job.location || ''} ${job.city || ''}`.replace(/臺/g, '台');
        if (selectedCity === '遠端工作') {
          if (!/遠端|WFH|居家/i.test(`${job.workEnvironment} ${job.title} ${job.description}`)) return false;
        } else if (normLoc.trim() && !normLoc.includes(normSelected) && !normLoc.includes(normSelected.slice(0, 2))) {
          return false;
        }
      }
      if (selectedCategory !== '全部' && job.category && job.category !== selectedCategory && !job.industry.includes(selectedCategory)) {
        return false;
      }
      if (minSalaryFilter > 0 && job.salaryMax > 0 && job.salaryMax < minSalaryFilter) {
        return false;
      }
      if (maxExpFilter !== 'all' && job.experienceYears > maxExpFilter) {
        return false;
      }
      if (maxEduFilter !== 'all' && job.educationLevel > maxEduFilter) {
        return false;
      }
      if (keyword.trim()) {
        const kw = keyword.trim().toLowerCase();
        const haystack = `${job.title} ${job.company} ${job.location} ${job.industry} ${job.workEnvironment} ${job.benefits} ${job.description}`.toLowerCase();
        if (!haystack.includes(kw)) return false;
      }
      return true;
    });

    // 保證在非收藏模式下，若已取得職缺列表，至少顯示 3 筆、最多 100 筆
    if (!showSavedOnly && withDynamicDistance.length > 0 && filtered.length < 3) {
      const existingIds = new Set(filtered.map((j) => j.id));
      for (const item of withDynamicDistance) {
        if (!existingIds.has(item.id)) {
          filtered.push(item);
          existingIds.add(item.id);
        }
        if (filtered.length >= Math.min(withDynamicDistance.length, Math.max(3, filtered.length))) {
          if (filtered.length >= 3) break;
        }
      }
    }
    filtered = filtered.slice(0, 100);

    const parseJobTimestamp = (job: typeof withDynamicDistance[number]): number => {
      if (job.postedAt) {
        const t = new Date(job.postedAt).getTime();
        if (!isNaN(t)) return t;
      }
      if (job.postedAtText) {
        const txt = job.postedAtText;
        if (/今日|今天|剛剛|小時前|分鐘前/.test(txt)) return Date.now();
        if (/昨天/.test(txt)) return Date.now() - 86400000;
        if (/前天/.test(txt)) return Date.now() - 86400000 * 2;
        const daysMatch = txt.match(/(\d+)\s*天前/);
        if (daysMatch) return Date.now() - 86400000 * parseInt(daysMatch[1], 10);
      }
      return 0;
    };

    const dir = sortOrder === 'desc' ? -1 : 1;
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'recommended':
          return (a.effectiveAiScore - b.effectiveAiScore) * dir;
        case 'latest_posted': {
          const tA = parseJobTimestamp(a);
          const tB = parseJobTimestamp(b);
          if (tA !== tB) return (tA - tB) * dir;
          // 若無刊登時間，保持搜尋結果原始排序（先被檢索到的視為最新推薦）
          return (a.effectiveAiScore - b.effectiveAiScore) * dir;
        }
        case 'salary_min':
          return (a.salaryMin - b.salaryMin) * dir;
        case 'salary_max':
          return (a.salaryMax - b.salaryMax) * dir;
        case 'experience':
          return (a.experienceYears - b.experienceYears) * dir;
        case 'education':
          return (a.educationLevel - b.educationLevel) * dir;
        case 'distance':
          return (a.distanceKm - b.distanceKm) * dir;
        default:
          return 0;
      }
    });
  }, [
    jobs,
    savedJobsMap,
    showSavedOnly,
    userBaseCity,
    userCarePoints,
    selectedCity,
    selectedCategory,
    minSalaryFilter,
    maxExpFilter,
    maxEduFilter,
    keyword,
    sortBy,
    sortOrder,
  ]);

  const handleSortClick = (key: JobSortKey) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(key);
      if (key === 'distance' || key === 'experience' || key === 'education') {
        setSortOrder('asc');
      } else {
        setSortOrder('desc');
      }
    }
  };

  const resetAllFilters = () => {
    setKeyword('');
    setSelectedCity('全部');
    setSelectedCategory('全部');
    setMinSalaryFilter(0);
    setJobTypeFilter('全部');
    setRegionFilter('台灣');
    setCountryFilter([]);
    setMaxExpFilter('all');
    setMaxEduFilter('all');
    setUserCarePoints([]);
    setShowSavedOnly(false);
    setSortBy('recommended');
    setSortOrder('desc');
  };

  // 若還有空間：依照用戶在意的點顯示（行業、工作環境、其他待遇），都沒有就顯示工作說明
  const getExtraText = (job: JobListing): string => {
    for (const cp of userCarePoints) {
      if (cp === 'industry' && job.industry) return job.industry;
      if (cp === 'workEnvironment' && job.workEnvironment) return job.workEnvironment;
      if (cp === 'benefits' && job.benefits) return job.benefits;
    }
    return job.description || job.workEnvironment || job.benefits || job.industry || '';
  };

  const latestBotId = [...messages].reverse().find((m) => m.role === 'bot')?.id;

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      {/* 探索者搜搜：平常停在左下角，搜尋時騰雲駕霧飛來飛去 */}
      <SousouFlyer searching={isSearching} resultCount={jobs.length} />
      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 space-y-3.5">
        {/* 頂部主區塊：搜尋輸入框維持在最上方，下方為篩選面板與對話確認區 */}
        <div className="bg-white rounded-2xl border border-stone-200/90 p-2.5 sm:p-3 shadow-2xs space-y-2.5">
          {/* 1. 頂部主操作列：自然語言／關鍵字輸入 ＋ 搜尋鈕 ＋ 篩選收合鈕 ＋ 收藏切換 */}
          <div className="flex items-center gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSendInput();
              }}
              className="flex-1 flex items-center gap-2 min-w-0"
            >
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="輸入想找的職位、地點、薪水或在意的條件..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-100/90 focus:bg-white border border-transparent focus:border-[#1e3a8a]/40 text-xs sm:text-sm text-stone-900 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSearching || isRegulating || (!chatInput.trim() && !pendingConfirmedBrief)}
                className="px-3.5 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] disabled:opacity-40 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
              >
                {isSearching || isRegulating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>搜尋</span>
              </button>
            </form>

            {/* 篩選條件收合按鈕 */}
            <button
              type="button"
              onClick={() => setIsFilterOpen((v) => !v)}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                isFilterOpen || activeFilterCount > 0
                  ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                  : 'bg-white hover:bg-blue-50/50 text-stone-700 border-stone-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">篩選</span>
              {activeFilterCount > 0 && (
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-amber-400 text-stone-950 font-black">
                  {activeFilterCount}
                </span>
              )}
              {isFilterOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* 收藏切換按鈕 */}
            <button
              type="button"
              onClick={() => setShowSavedOnly((v) => !v)}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                showSavedOnly
                  ? 'bg-amber-400 text-stone-950 border-amber-400'
                  : 'bg-white hover:bg-blue-50/50 text-stone-700 border-stone-200'
              }`}
              title="已收藏職缺"
            >
              <Star className={`w-3.5 h-3.5 ${showSavedOnly ? 'fill-stone-950 text-stone-950' : 'text-stone-500'}`} />
              <span className="hidden sm:inline">收藏</span>
              {savedJobIds.length > 0 && <span>({savedJobIds.length})</span>}
            </button>

            {/* 網站說明（問號鍵展開／收合） */}
            <button
              type="button"
              onClick={() => setIsHelpOpen((v) => !v)}
              aria-expanded={isHelpOpen}
              aria-label="匯職缺說明"
              title="匯職缺說明"
              className={`p-2 rounded-xl border shrink-0 transition-colors cursor-pointer ${
                isHelpOpen ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]' : 'bg-white hover:bg-blue-50/50 text-stone-500 border-stone-200'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

          {isHelpOpen && (
            <div className="pt-2.5 border-t border-stone-100 text-xs text-stone-700 leading-relaxed space-y-2.5">
              <p>
                <span className="font-black text-[#1e3a8a]">匯職缺</span>：一鍵彙集跨海內外全網所有職缺。直接輸入想找的職位、地點、薪水，已經講清楚的條件不會再問；沒講的才會請你補充。
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {JOB_SOURCE_GROUPS.map((g) => (
                  <div key={g.title} className="rounded-xl bg-stone-50 border border-stone-200/80 px-3 py-2">
                    <div className="font-bold text-stone-900">{g.title}</div>
                    <div className="text-stone-600">{g.sites}</div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-stone-500">
                職缺會盡量直接連到該職缺的頁面；標示「搜尋職缺」的是暫時確認不了的職缺，會帶你到該平台的搜尋結果。已關閉或下架的職缺不會顯示。
              </p>
            </div>
          )}

          {/* 2. 可收合篩選面板 */}
          {isFilterOpen && (
            <div className="pt-2.5 border-t border-stone-100 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="關鍵字過濾..."
                  className="px-3 py-2 rounded-xl border border-stone-200 text-xs text-stone-800 bg-stone-50/70 focus:bg-white outline-none focus:border-[#1e3a8a]/50"
                />

                <select
                  value={jobTypeFilter}
                  onChange={(e) => {
                    const v = e.target.value as typeof jobTypeFilter;
                    // 正職用月薪、兼職用時薪：切換時清掉薪資門檻
                    if ((v === '兼職') !== isHourlyFilter) setMinSalaryFilter(0);
                    setJobTypeFilter(v);
                  }}
                  className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-800 bg-stone-50/70 focus:bg-white outline-none cursor-pointer"
                >
                  <option value="全部">正職／兼職：不限</option>
                  <option value="正職">正職</option>
                  <option value="兼職">兼職／工讀</option>
                  <option value="實習">實習</option>
                </select>

                <select
                  value={regionFilter}
                  onChange={(e) => {
                    const v = e.target.value as typeof regionFilter;
                    setRegionFilter(v);
                    if (v === '台灣') setCountryFilter([]);
                    if (v === '國外') setSelectedCity('全部');
                  }}
                  className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-800 bg-stone-50/70 focus:bg-white outline-none cursor-pointer"
                >
                  <option value="台灣">範圍：台灣</option>
                  <option value="國外">國外</option>
                  <option value="台灣與國外">台灣＋國外</option>
                </select>

                <select
                  value={selectedCity}
                  disabled={regionFilter === '國外'}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-800 bg-stone-50/70 focus:bg-white outline-none cursor-pointer"
                >
                  <option value="全部">地區：不限</option>
                  <option value="台北市">台北市</option>
                  <option value="新北市">新北市</option>
                  <option value="桃園市">桃園市</option>
                  <option value="新竹市">新竹市</option>
                  <option value="台中市">台中市</option>
                  <option value="台南市">台南市</option>
                  <option value="高雄市">高雄市</option>
                  <option value="遠端工作">遠端工作</option>
                </select>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-800 bg-stone-50/70 focus:bg-white outline-none cursor-pointer"
                >
                  <option value="全部">類別：不限</option>
                  <option value="門市／餐飲／零售">門市／餐飲／零售</option>
                  <option value="軟體／AI工程">軟體／AI工程</option>
                  <option value="產品／專案管理">產品／專案管理</option>
                  <option value="行銷／企劃／社群">行銷／企劃／社群</option>
                  <option value="設計／UIUX">設計／UIUX</option>
                  <option value="業務／商務開發">業務／商務開發</option>
                  <option value="行政／人資／財會">行政／人資／財會</option>
                </select>

                <select
                  value={minSalaryFilter}
                  onChange={(e) => setMinSalaryFilter(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-800 bg-stone-50/70 focus:bg-white outline-none cursor-pointer"
                >
                  <option value={0}>{isHourlyFilter ? '時薪：不限' : '薪資：不限'}</option>
                  {(isHourlyFilter
                    ? [currentMinimumWage().hourly, 220, 250, 300, 400]
                    : [currentMinimumWage().monthly, 35000, 45000, 60000, 80000, 100000]
                  ).map((v, i) => (
                    <option key={v} value={v}>
                      {isHourlyFilter ? `時薪 ${v} 元以上` : `${v.toLocaleString('en-US')} 元以上`}
                      {i === 0 ? '（最低工資）' : ''}
                    </option>
                  ))}
                </select>

                <select
                  value={String(maxExpFilter)}
                  onChange={(e) => setMaxExpFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-800 bg-stone-50/70 focus:bg-white outline-none cursor-pointer"
                >
                  <option value="all">經歷：不限</option>
                  <option value="0">經歷不拘</option>
                  <option value="1">1 年以下</option>
                  <option value="2">2 年以下</option>
                  <option value="3">3 年以下</option>
                  <option value="5">5 年以下</option>
                </select>

                <select
                  value={String(maxEduFilter)}
                  onChange={(e) => setMaxEduFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-800 bg-stone-50/70 focus:bg-white outline-none cursor-pointer"
                >
                  <option value="all">學歷：不限</option>
                  <option value="2">高中職以下</option>
                  <option value="3">專科以下</option>
                  <option value="4">大學以下</option>
                  <option value="5">碩士以下</option>
                </select>
              </div>

              {regionFilter !== '台灣' && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-stone-500">國家／地區（可複選，不選就是全部國外）：</span>
                  {JOB_COUNTRIES.map((c) => {
                    const on = countryFilter.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setCountryFilter((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                          on ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]' : 'bg-white hover:bg-blue-50/50 text-stone-600 border-stone-200'
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-stone-500">優先顯示：</span>
                  {(['industry', 'workEnvironment', 'benefits'] as CarePointKey[]).map((key) => {
                    const active = userCarePoints.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleCarePoint(key)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                            : 'bg-white hover:bg-blue-50/50 text-stone-600 border-stone-200'
                        }`}
                      >
                        {CARE_POINT_META[key].fieldLabel}
                      </button>
                    );
                  })}

                  <span className="text-xs font-semibold text-stone-500 ml-2">距離基準：</span>
                  <select
                    value={userBaseCity}
                    onChange={(e) => setUserBaseCity(e.target.value)}
                    className="px-2 py-1 rounded-lg border border-stone-200 text-xs font-semibold text-stone-800 bg-white outline-none cursor-pointer"
                  >
                    {Object.keys(CITY_COORDS).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-500 hover:text-stone-900 hover:bg-stone-100 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>重設</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSearching || isRegulating}
                    onClick={() => {
                      setIsFilterOpen(false);
                      const baseQuery =
                        keyword.trim() ||
                        `${selectedCity !== '全部' ? selectedCity : ''}${selectedCategory !== '全部' ? selectedCategory : '職缺'}`;
                      void handleForwardToExplorerAgent([baseQuery, ...filterBriefParts()].join('、'));
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    依篩選搜尋
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. 分批即時檢索中進度條 */}
          {isSearching && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#1e3a8a] text-white text-xs flex items-center justify-between gap-3 shadow-sm border border-blue-400/40 animate-pulse">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                <span className="font-bold">{searchProgressText || '正在分批檢索全網在招真實職缺...'}</span>
              </div>
              {streamingBatchCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 text-[10px] font-black">
                  第 {streamingBatchCount} 批已送達（累計 {jobs.length} 筆）
                </span>
              )}
            </div>
          )}

          {/* 4. 對話確認與條件選擇區（位於搜尋框下方，可隨時收合） */}
          {messages.length > 0 && (
            <div className="pt-2 border-t border-stone-100">
              {isChatCollapsed ? (
                <div className="flex items-center justify-between px-2 py-1 text-xs text-stone-500 gap-2">
                  <span className="truncate">{messages[messages.length - 1]?.text}</span>
                  <button
                    type="button"
                    onClick={() => setIsChatCollapsed(false)}
                    className="text-[#1e3a8a] font-bold hover:underline shrink-0 cursor-pointer"
                  >
                    展開對話
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="max-h-72 overflow-y-auto space-y-2 px-1">
                    {messages.map((m) => {
                      // 只有最新一則機器人訊息可以操作；新增條件後，舊的「確認依此條件搜尋嗎？」直接收起來，只留最新的條件組合
                      const isLatestBot = m.id === latestBotId;
                      if (m.role === 'bot' && !isLatestBot && !m.confirmed && !m.hasMoreQuestions && !m.isAmbiguous && m.pendingBrief) return null;
                      const activeStep = m.activeConditionKey
                        ? QUICK_CONDITION_STEPS.find((s) => s.key === m.activeConditionKey) || null
                        : null;

                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[95%] sm:max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                              m.role === 'user'
                                ? 'bg-[#1e3a8a] text-white'
                                : 'bg-blue-50/70 text-stone-800 border border-blue-100'
                            }`}
                          >
                            <p className="whitespace-pre-wrap font-medium">{m.text}</p>

                            {/* 模糊條件追問選項（含「跳過」選項，加上上方補充提示） */}
                            {m.role === 'bot' &&
                              isLatestBot &&
                              !m.confirmed &&
                              (m.hasMoreQuestions || m.isAmbiguous) &&
                              m.suggestedChips &&
                              m.suggestedChips.length > 0 && (
                                <div className="mt-2.5 pt-2 border-t border-amber-200/80 space-y-2">
                                  <div className="flex flex-wrap gap-1.5">
                                    {m.suggestedChips.map((chip, idx) => {
                                      const isSkip =
                                        chip.type?.startsWith('skip:') || chip.label === '跳過';
                                      return (
                                        <button
                                          key={idx}
                                          type="button"
                                          disabled={isSearching || isRegulating}
                                          onClick={() => handleSelectClarificationChip(chip)}
                                          className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer shadow-2xs active:scale-95 ${
                                            isSkip
                                              ? 'bg-stone-100 hover:bg-stone-200 border-stone-300 text-stone-600'
                                              : 'bg-white hover:bg-amber-100 hover:border-amber-400 border-amber-200 text-stone-800'
                                          }`}
                                        >
                                          {chip.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  <p className="text-[11px] text-stone-500 font-medium">
                                    提示：如果沒看到想要的條件，可以於上方對話框/搜尋框補充
                                  </p>
                                </div>
                              )}

                            {/* 確認以此條件搜尋 ＋ 新增其他條件按鍵：學歷、經歷、地區、薪水（點擊後進入下一個條件選擇） */}
                            {m.role === 'bot' &&
                              isLatestBot &&
                              !m.confirmed &&
                              !m.hasMoreQuestions &&
                              !m.isAmbiguous &&
                              m.pendingBrief && (
                                <div className="mt-2.5 pt-2 border-t border-blue-200/70 space-y-2.5">
                                  {/* 當點選「學歷、經歷、地區、薪水」任一條件或自動進入下一條件時，顯示該條件選項與「跳過」 */}
                                  {activeStep && (
                                    <div className="p-2.5 rounded-xl bg-white/95 border border-blue-200/80 space-y-2">
                                      <div className="text-[11px] font-bold text-[#1e3a8a]">
                                        {activeStep.question}
                                      </div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {(activeStep.key === 'salary'
                                          ? salaryOptionsFor(
                                              isHourlyContext(
                                                `${m.selectedConditionMap?.jobType || ''} ${m.baseBrief || ''} ${m.pendingBrief || ''}`
                                              )
                                            )
                                          : activeStep.options
                                        ).map((opt, idx) => (
                                          <button
                                            key={idx}
                                            type="button"
                                            disabled={isSearching || isRegulating}
                                            onClick={() =>
                                              handleSelectQuickConditionOption(
                                                m.id,
                                                activeStep.key,
                                                opt
                                              )
                                            }
                                            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer shadow-2xs active:scale-95 ${
                                              opt.isSkip
                                                ? 'bg-stone-100 hover:bg-stone-200 border-stone-300 text-stone-600'
                                                : m.selectedConditionMap?.[activeStep.key] ===
                                                  opt.value
                                                ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                                                : 'bg-amber-50/70 hover:bg-amber-100 hover:border-amber-400 border-amber-200 text-stone-800'
                                            }`}
                                          >
                                            {opt.label}
                                          </button>
                                        ))}
                                      </div>
                                      {activeStep.key === 'region' &&
                                        regionIncludesAbroad(m.selectedConditionMap?.region) && (
                                          <div className="pt-2 border-t border-blue-100 space-y-1.5">
                                            <div className="text-[11px] font-bold text-[#1e3a8a]">
                                              想找哪些國家或地區？（可複選，不選就是全部國外）
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                              {JOB_COUNTRIES.map((c) => {
                                                const on = (m.selectedCountries || []).includes(c);
                                                return (
                                                  <button
                                                    key={c}
                                                    type="button"
                                                    aria-pressed={on}
                                                    disabled={isSearching || isRegulating}
                                                    onClick={() => handleToggleCountry(m.id, c)}
                                                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1 ${
                                                      on
                                                        ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                                                        : 'bg-white hover:bg-blue-50 border-blue-200 text-stone-800'
                                                    }`}
                                                  >
                                                    {on && <Check className="w-3 h-3 stroke-[3]" />}
                                                    {c}
                                                  </button>
                                                );
                                              })}
                                              <button
                                                type="button"
                                                disabled={isSearching || isRegulating}
                                                onClick={() => handleFinishCountries(m.id)}
                                                className="px-3 py-1.5 rounded-lg text-[11px] font-black bg-amber-400 hover:bg-amber-300 text-stone-950 border border-amber-500 cursor-pointer active:scale-95"
                                              >
                                                完成，下一個條件
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      <p className="text-[11px] text-stone-500 font-medium">
                                        提示：如果沒看到想要的條件，可以於上方對話框/搜尋框補充
                                      </p>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                      type="button"
                                      disabled={isSearching || isRegulating}
                                      onClick={() =>
                                        void handleForwardToExplorerAgent(m.pendingBrief, m.id)
                                      }
                                      className="px-3.5 py-1.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                                    >
                                      <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
                                      <span>確認以此條件搜尋</span>
                                    </button>

                                    {QUICK_CONDITION_STEPS.map((step) => {
                                      const isCurrent = m.activeConditionKey === step.key;
                                      const isSelected = Boolean(
                                        m.selectedConditionMap?.[step.key]
                                      );
                                      const isCompleted = Boolean(
                                        m.completedConditionKeys?.includes(step.key)
                                      );
                                      return (
                                        <button
                                          key={step.key}
                                          type="button"
                                          disabled={isSearching || isRegulating}
                                          onClick={() =>
                                            handleToggleQuickConditionStep(m.id, step.key)
                                          }
                                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer active:scale-95 flex items-center gap-1 ${
                                            isCurrent
                                              ? 'bg-amber-400 text-stone-950 border-amber-500 shadow-2xs'
                                              : isSelected
                                              ? 'bg-blue-100 text-[#1e3a8a] border-blue-300'
                                              : isCompleted
                                              ? 'bg-stone-100 text-stone-500 border-stone-200'
                                              : 'bg-white hover:bg-blue-50 text-stone-700 border-stone-200 shadow-2xs'
                                          }`}
                                        >
                                          <span>{step.label}</span>
                                          {isSelected && (
                                            <Check className="w-3 h-3 text-[#1e3a8a] stroke-[2.5]" />
                                          )}
                                        </button>
                                      );
                                    })}

                                    <span className="text-[11px] text-stone-500 font-medium">
                                      （或直接在上方輸入補充條件，或點右上搜尋開始）
                                    </span>
                                  </div>

                                  {!activeStep && (
                                    <p className="text-[11px] text-stone-500 font-medium">
                                      提示：如果沒看到想要的條件，可以於上方對話框/搜尋框補充
                                    </p>
                                  )}
                                </div>
                              )}

                            {m.role === 'bot' && m.fallbackBrief && !m.confirmed && (
                              <div className="mt-2 pt-2 border-t border-blue-200/70 flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={isSearching || isRegulating}
                                  onClick={() =>
                                    void handleForwardToExplorerAgent(m.fallbackBrief, m.id, true)
                                  }
                                  className="px-3 py-1 rounded-lg bg-[#1e3a8a] hover:bg-[#1e40af] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>改由小燈泡繼續搜尋</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="flex items-center justify-end gap-3 px-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMessages([]);
                        setPendingConfirmedBrief('');
                        setPendingFallbackBrief('');
                        setSkippedDimensions([]);
                        setAmbiguousClarification(null);
                      }}
                      className="text-[11px] text-stone-400 hover:text-stone-600 cursor-pointer"
                    >
                      清除對話
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsChatCollapsed(true)}
                      className="text-[11px] font-bold text-stone-500 hover:text-stone-800 flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>收合</span>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 排序列 ＆ 大卡片／條列式／小卡片切換（手機橫向滑動不擁擠） */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {(
              [
                { key: 'recommended', label: '建議' },
                { key: 'latest_posted', label: '最近刊登' },
                { key: 'salary_min', label: '底薪' },
                { key: 'salary_max', label: '頂薪' },
                { key: 'experience', label: '經歷' },
                { key: 'education', label: '學歷' },
                { key: 'distance', label: '距離' },
              ] as Array<{ key: JobSortKey; label: string }>
            ).map((item) => {
              const isSelected = sortBy === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleSortClick(item.key)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shrink-0 cursor-pointer border ${
                    isSelected
                      ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                      : 'bg-white hover:bg-blue-50/50 text-stone-600 border-stone-200/90'
                  }`}
                >
                  <span>{item.label}</span>
                  {isSelected &&
                    (sortOrder === 'desc' ? (
                      <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUp className="w-3 h-3" />
                    ))}
                </button>
              );
            })}
            {filteredAndSortedJobs.length > 0 && (
              <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-50 text-[#1e3a8a] border border-blue-200 shrink-0">
                共 {filteredAndSortedJobs.length} 筆職缺
              </span>
            )}
          </div>

          <div className="inline-flex items-center rounded-xl bg-white p-0.5 border border-stone-200/90 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('large_card')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'large_card'
                  ? 'bg-[#1e3a8a] text-white'
                  : 'text-stone-500 hover:text-[#1e3a8a]'
              }`}
              title="大卡片"
            >
              <Rows3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">大卡片</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[#1e3a8a] text-white'
                  : 'text-stone-500 hover:text-[#1e3a8a]'
              }`}
              title="條列式"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">條列式</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('small_card')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'small_card'
                  ? 'bg-[#1e3a8a] text-white'
                  : 'text-stone-500 hover:text-[#1e3a8a]'
              }`}
              title="小卡片"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">小卡片</span>
            </button>
          </div>
        </div>

        {/* 分批串流進度提示橫幅（當已有首批職缺送達且仍在背景接收後續批次時顯示） */}
        {isSearching && filteredAndSortedJobs.length > 0 && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-[#1e3a8a] to-indigo-900 text-white text-xs flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-300 shrink-0" />
              <span className="font-bold">
                {searchProgressText || '正在持續分批檢索並統一整合更多跨平台真實職缺...'}
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 text-[10px] font-black shrink-0">
              已統一顯示 {filteredAndSortedJobs.length} 筆
            </span>
          </div>
        )}

        {/* 職缺列表區 */}
        {isSearching && filteredAndSortedJobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200/90 py-16 text-center space-y-2.5">
            <Loader2 className="w-6 h-6 text-[#1e3a8a] animate-spin mx-auto" />
            <p className="text-xs sm:text-sm font-bold text-[#1e3a8a]">
              {searchProgressText || '【IdeaX創點子】全網分批找工作中... 首批真實職缺即將送達'}
            </p>
          </div>
        ) : filteredAndSortedJobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200/90 py-14 px-4 text-center space-y-3">
            <p className="text-sm font-bold text-stone-700">
              {showSavedOnly
                ? '尚無收藏的職缺'
                : pendingFallbackBrief
                ? '搜搜似乎斷線了，要改由小燈泡繼續搜尋嗎?'
                : hasSearched
                ? '沒有符合條件的職缺'
                : '輸入職位條件或展開篩選開始搜尋'}
            </p>
            {pendingFallbackBrief && !showSavedOnly && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => void handleForwardToExplorerAgent(pendingFallbackBrief, undefined, true)}
                  className="px-4 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>改由小燈泡繼續搜尋</span>
                </button>
              </div>
            )}
          </div>
        ) : viewMode === 'small_card' ? (
          /* 小卡片（電腦預設） */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredAndSortedJobs.map((job) => {
              const isSaved = Boolean(savedJobsMap[job.id]);
              const extraText = getExtraText(job);

              return (
                <a
                  key={job.id}
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-2xl border border-stone-200/90 hover:border-stone-400 bg-white p-4 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-50 text-[#1e3a8a] border border-blue-200">
                        {job.sourcePlatform || '全網求職'}
                      </span>
                      {job.urlKind === 'search' ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-0.5" title="找不到這筆職缺的原始頁面，點擊會開啟搜尋結果">
                          搜尋職缺
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                          在招中
                        </span>
                      )}
                    </div>

                    <h3 className="text-[16px] font-bold text-[#165dff] group-hover:underline truncate leading-snug">
                      {job.title}
                    </h3>

                    <p className="text-[14px] font-medium text-[#165dff]/90 truncate mt-1">
                      {job.company}
                    </p>

                    <div className="mt-2 flex items-center flex-wrap gap-y-1 text-[13px] sm:text-[14px] font-bold text-stone-800">
                      <span>{job.location}</span>
                      <span className="mx-2 text-stone-300 font-normal">|</span>
                      <span>{job.experience}</span>
                      <span className="mx-2 text-stone-300 font-normal">|</span>
                      <span>{job.education}</span>
                    </div>

                    {extraText && (
                      <p className="mt-2 text-xs text-stone-500 line-clamp-1">
                        {extraText}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-bold text-[#e87722]">
                        {job.salaryText}
                      </span>
                      {job.postedAtText && (
                        <span className="text-[10px] text-stone-400 font-medium">
                          {job.postedAtText}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => toggleSaveJob(e, job)}
                      className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-amber-500 transition-colors cursor-pointer"
                      aria-label={isSaved ? '取消收藏' : '收藏'}
                    >
                      <Star
                        className={`w-5 h-5 ${
                          isSaved ? 'fill-amber-400 text-amber-500' : 'text-stone-400'
                        }`}
                      />
                    </button>
                  </div>
                </a>
              );
            })}
          </div>
        ) : viewMode === 'large_card' ? (
          /* 大卡片（手機預設，無圖片但顯示完整資訊） */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {filteredAndSortedJobs.map((job) => {
              const isSaved = Boolean(savedJobsMap[job.id]);

              return (
                <a
                  key={job.id}
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-2xl border border-stone-200/90 hover:border-stone-400 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-50 text-[#1e3a8a] border border-blue-200">
                        {job.sourcePlatform || '全網求職'}
                      </span>
                      {job.urlKind === 'search' ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800" title="找不到這筆職缺的原始頁面，點擊會開啟搜尋結果">
                          搜尋職缺
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          在招中
                        </span>
                      )}
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base sm:text-lg font-bold text-[#165dff] group-hover:underline leading-snug">
                          {job.title}
                        </h3>
                        <p className="text-sm font-medium text-[#165dff]/90 mt-1">
                          {job.company}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => toggleSaveJob(e, job)}
                        className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-amber-500 transition-colors shrink-0 cursor-pointer"
                        aria-label={isSaved ? '取消收藏' : '收藏'}
                      >
                        <Star
                          className={`w-5 h-5 ${
                            isSaved ? 'fill-amber-400 text-amber-500' : 'text-stone-400'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center flex-wrap gap-y-1 text-xs sm:text-sm font-bold text-stone-800">
                      <span>{job.location}</span>
                      <span className="mx-2 text-stone-300 font-normal">|</span>
                      <span>{job.experience}</span>
                      <span className="mx-2 text-stone-300 font-normal">|</span>
                      <span>{job.education}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-sm sm:text-base font-bold text-[#e87722]">
                        {job.salaryText}
                      </div>
                      {job.postedAtText && (
                        <span className="text-[11px] text-stone-400 font-medium">
                          {job.postedAtText}
                        </span>
                      )}
                    </div>

                    <div className="pt-2 border-t border-stone-100 space-y-1.5 text-xs text-stone-600 leading-relaxed">
                      {job.industry && (
                        <div>
                          <span className="font-bold text-stone-800">行業：</span>
                          <span>{job.industry}</span>
                        </div>
                      )}
                      {job.workEnvironment && (
                        <div>
                          <span className="font-bold text-stone-800">工作環境：</span>
                          <span>{job.workEnvironment}</span>
                        </div>
                      )}
                      {job.benefits && (
                        <div>
                          <span className="font-bold text-stone-800">其他待遇：</span>
                          <span>{job.benefits}</span>
                        </div>
                      )}
                      {job.description && (
                        <div>
                          <span className="font-bold text-stone-800">工作說明：</span>
                          <span>{job.description}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          /* 條列式 */
          <div className="bg-white rounded-2xl border border-stone-200/90 divide-y divide-stone-200/80 overflow-hidden shadow-2xs">
            {filteredAndSortedJobs.map((job) => {
              const isSaved = Boolean(savedJobsMap[job.id]);
              const extraText = getExtraText(job);

              return (
                <a
                  key={job.id}
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group p-3.5 sm:px-5 hover:bg-stone-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-blue-50 text-[#1e3a8a] border border-blue-200">
                        {job.sourcePlatform || '全網求職'}
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-[#165dff] group-hover:underline truncate">
                        {job.title}
                      </h3>
                      <span className="text-xs sm:text-sm font-medium text-[#165dff]/90 truncate">
                        {job.company}
                      </span>
                      {job.urlKind === 'search' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800" title="找不到這筆職缺的原始頁面，點擊會開啟搜尋結果">
                          搜尋職缺
                        </span>
                      )}
                    </div>

                    <div className="flex items-center flex-wrap gap-y-1 text-xs sm:text-sm font-bold text-stone-800">
                      <span>{job.location}</span>
                      <span className="mx-2 text-stone-300 font-normal">|</span>
                      <span>{job.experience}</span>
                      <span className="mx-2 text-stone-300 font-normal">|</span>
                      <span>{job.education}</span>
                    </div>

                    {extraText && (
                      <p className="text-xs text-stone-500 line-clamp-1">
                        {extraText}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                    <span className="text-sm sm:text-base font-bold text-[#e87722]">
                      {job.salaryText}
                    </span>
                    {job.postedAtText && (
                      <span className="text-[11px] text-stone-400 font-medium">
                        {job.postedAtText}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => toggleSaveJob(e, job)}
                      className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-amber-500 transition-colors cursor-pointer"
                      aria-label={isSaved ? '取消收藏' : '收藏'}
                    >
                      <Star
                        className={`w-5 h-5 ${
                          isSaved ? 'fill-amber-400 text-amber-500' : 'text-stone-400'
                        }`}
                      />
                    </button>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
