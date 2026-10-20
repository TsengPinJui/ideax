import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CURRENCIES, CurrencyCode, FALLBACK_USD_RATES, convert, detectCurrency, formatMoney } from '../data/currency';
import { jobSiteOptions, MAJOR_CITIES_BY_COUNTRY, formatCountryScope, citiesForCountries, abroadSalaryOptions } from '../data/jobSites';
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
  Plus,
  Trash2,
  Edit2,
  Building,
  Briefcase,
  DollarSign,
  MapPin,
  Calendar,
  GraduationCap,
  Info,
} from 'lucide-react';
import { SousouFlyer } from './sousou/SousouFlyer';
import { useApp } from '../context/AppContext';
import { InlineConditionTag } from './jobExplorer/InlineConditionTag';
import { seenJobBefore } from '../utils/jobDedupe';
import { accompanyDuringSearch, cheerMascot } from './mascot/mascotConfig';

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

export type QuickConditionKey = 'jobType' | 'region' | 'company' | 'education' | 'experience' | 'location' | 'salary' | 'priority';

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
/** 這則對話是不是只找國外（薪水就不用台灣的最低工資與月薪級距） */
const isAbroadOnlyContext = (m: { selectedConditionMap?: Partial<Record<string, string>>; baseBrief?: string; pendingBrief?: string }) => {
  const region = m.selectedConditionMap?.region;
  if (region) return region === REGION_ABROAD_VALUE;
  const text = `${m.baseBrief || ''} ${m.pendingBrief || ''}`;
  return /工作範圍：國外/.test(text) || (!/台灣|臺灣|國內/.test(text) && JOB_COUNTRIES.some((c) => text.includes(c)));
};
const countriesInContext = (m: { selectedCountries?: string[]; baseBrief?: string; pendingBrief?: string }) =>
  m.selectedCountries && m.selectedCountries.length ? m.selectedCountries : JOB_COUNTRIES.filter((c) => `${m.baseBrief || ''} ${m.pendingBrief || ''}`.includes(c));
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
      { label: '範圍不限（預設台灣）', value: '工作範圍：不限' },
      { label: '台灣', value: '工作範圍：台灣' },
      { label: '國外', value: REGION_ABROAD_VALUE },
      { label: '台灣＋國外皆可', value: REGION_BOTH_VALUE },
      { label: '跳過', value: '跳過', isSkip: true },
    ],
  },
  {
    key: 'company',
    label: '限定公司',
    question: '請問您有無限定目標公司？（沒有的話點「不限公司」，有的話可自填公司名稱）',
    options: [
      { label: '不限公司', value: '目標公司：不拘' },
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
      { label: '國立大學', value: '學歷：國立大學' },
      { label: '公立頂大背景', value: '學歷：公立頂大背景' },
      { label: '私立大學', value: '學歷：私立大學' },
      { label: '技職科大背景', value: '學歷：技職科大背景' },
      { label: '碩士以上', value: '學歷：碩士以上' },
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
  {
    key: 'priority',
    label: '優先顯示',
    question: '最後，您最在意哪幾項？依序點選排出優先順序（可選 1～3 項）',
    options: [],
  },
];

export interface DimensionGroup {
  dimension: string;
  title: string;
  question: string;
  isHighlighted: boolean;
  chips: Array<{ label: string; value: string; type: string }>;
}

export type ConditionTagType =
  | 'jobType'
  | 'role'
  | 'salary'
  | 'company'
  | 'location'
  | 'experience'
  | 'education'
  | 'carePoint'
  | 'custom';

export interface ConditionTag {
  id: string;
  type: ConditionTagType;
  label: string; // e.g. "工作型態", "職務", "薪資", "限定公司", "地區", "年資", "學歷"
  value: string; // display value e.g. "正職", "高級工程師", "月薪 8,000,000 TWD 以上", "Google"
  numValue?: number; // numeric value for salary or years of exp
  salaryCurrency?: CurrencyCode; // e.g. 'TWD', 'USD', 'JPY', 'EUR', 'CNY', 'GBP', 'SGD', etc.
  salaryPeriod?: '月薪' | '年薪' | '時薪';
  experienceYears?: number; // numeric years
}

export type AiIntakeStatus = 'idle' | 'received' | 'understanding' | 'typing';

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
  selectedCities?: string[];
  conditionTags?: ConditionTag[];
  /** 搜尋過程中要使用者決定的選項（繼續等搜搜、派小燈泡、重新搜尋…） */
  searchActions?: SearchActionKey[];
  /** 這則訊息對應的搜尋條件（頁面重開後還能「重新搜尋」） */
  retryBrief?: string;
}

type SearchActionKey = 'wait' | 'bulb' | 'retry' | 'dismiss';
const SEARCH_ACTION_LABEL: Record<SearchActionKey, string> = {
  wait: '繼續等待',
  bulb: '💡 派小燈泡前去看看',
  retry: '重新搜尋',
  dismiss: '先不用',
};
/** 搜搜（Dify）等多久沒消息就問使用者、等多久就暫停 */
const DIFY_ASK_MS = 50000;
const DIFY_PAUSE_MS = 80000;
const MAX_JOBS = 100;

export function parseConditionTags(brief: string, intakeData?: any): ConditionTag[] {
  if (Array.isArray(intakeData?.conditionTags) && intakeData.conditionTags.length > 0) {
    return intakeData.conditionTags.map((t: any, idx: number) => ({
      id: t.id || `tag-${Date.now()}-${idx}`,
      type: (t.type || 'custom') as ConditionTagType,
      label: t.label || '條件',
      value: String(t.value || '').trim(),
      numValue: typeof t.numValue === 'number' ? t.numValue : undefined,
      salaryCurrency: (t.salaryCurrency as CurrencyCode) || undefined,
      salaryPeriod: t.salaryPeriod,
      experienceYears: typeof t.experienceYears === 'number' ? t.experienceYears : undefined,
    }));
  }

  const tags: ConditionTag[] = [];
  const text = `${brief || ''} ${intakeData?.reply || ''}`.trim();

  // 1. 工作型態
  const jobTypeMatch = text.match(/工作型態[：:]\s*(正職|兼職工讀|兼職|工讀|打工|實習|皆可|正職兼職皆可)/i) ||
    (intakeData?.jobType ? [null, intakeData.jobType] : null);
  if (jobTypeMatch && jobTypeMatch[1]) {
    tags.push({
      id: `tag-jobType-${Date.now()}`,
      type: 'jobType',
      label: '工作型態',
      value: jobTypeMatch[1].replace(/兼職工讀/, '兼職'),
    });
  }

  // 2. 職務
  let extractedRoles: string[] = [];
  if (Array.isArray(intakeData?.roles) && intakeData.roles.length > 0) {
    extractedRoles = intakeData.roles;
  } else {
    const roleMatch = text.match(/職務[：:]\s*([^、,，\n]+)/);
    if (roleMatch && roleMatch[1]) {
      extractedRoles = roleMatch[1].split(/[、,，]+/).map((s) => s.trim()).filter(Boolean);
    }
  }
  extractedRoles = extractedRoles
    .map((r) => r.replace(/月新台幣|新台幣|台幣|美元|美金|日圓|港幣|人民幣|歐元|英鎊|twd|usd|\d+元|\d+k|\d+萬/gi, '').trim())
    .filter(Boolean);
  if (extractedRoles.length > 0) {
    tags.push({
      id: `tag-role-${Date.now()}`,
      type: 'role',
      label: '職務',
      value: extractedRoles.join('、'),
    });
  }

  // 3. 限定公司
  let companyVal = '';
  if (Array.isArray(intakeData?.companies) && intakeData.companies.length > 0) {
    companyVal = intakeData.companies.join('、');
  } else {
    const compMatch = text.match(/(?:目標公司|限定公司|指定公司)[：:]\s*([^、,，\n]+)/);
    if (compMatch && compMatch[1]) companyVal = compMatch[1].trim();
  }
  if (companyVal && !/^(不限|不拘|無)$/.test(companyVal)) {
    tags.push({
      id: `tag-company-${Date.now()}`,
      type: 'company',
      label: '限定公司',
      value: companyVal,
    });
  }

  // 4. 薪資
  let numSalary = Number(intakeData?.minSalary) || 0;
  let curr: CurrencyCode = (intakeData?.salaryCurrency as CurrencyCode) || 'TWD';
  let period: '月薪' | '年薪' | '時薪' = intakeData?.salaryPeriod || '月薪';
  const salaryMatch = text.match(/(?:薪水|薪資)[：:]\s*(時薪|月薪|年薪)?\s*([^\d\s]*)\s*([\d,]+)\s*(?:元|萬|k)?\s*([A-Za-z$¥€£]+)?/i);
  if (salaryMatch) {
    if (salaryMatch[1]) period = salaryMatch[1] as any;
    const rawDigits = salaryMatch[3].replace(/,/g, '');
    const parsed = parseInt(rawDigits, 10);
    if (!isNaN(parsed) && parsed > 0) numSalary = parsed;
    if (salaryMatch[4] || salaryMatch[2]) {
      const codeOrSymbol = (salaryMatch[4] || salaryMatch[2]).toUpperCase();
      const found = CURRENCIES.find((c) => c.code === codeOrSymbol || c.symbol === codeOrSymbol);
      if (found) curr = found.code;
    }
  }
  if (/美金|美元|usd/i.test(text)) curr = 'USD';
  else if (/日幣|日圓|jpy/i.test(text)) curr = 'JPY';
  else if (/歐元|eur/i.test(text)) curr = 'EUR';
  else if (/英鎊|gbp/i.test(text)) curr = 'GBP';
  else if (/人民幣|cny/i.test(text)) curr = 'CNY';

  if (numSalary > 0) {
    tags.push({
      id: `tag-salary-${Date.now()}`,
      type: 'salary',
      label: '薪資',
      value: `${period} ${numSalary.toLocaleString('en-US')} ${curr} 以上`,
      numValue: numSalary,
      salaryCurrency: curr,
      salaryPeriod: period,
    });
  } else if (/薪資待遇不拘|不拘薪資/.test(text)) {
    tags.push({
      id: `tag-salary-${Date.now()}`,
      type: 'salary',
      label: '薪資',
      value: '薪資不拘',
      numValue: 0,
      salaryCurrency: curr,
      salaryPeriod: period,
    });
  }

  // 5. 地區
  const locMatch = text.match(/地區[：:]\s*([^、,，\n]+)/) || (intakeData?.location ? [null, intakeData.location] : null);
  if (locMatch && locMatch[1]) {
    tags.push({
      id: `tag-location-${Date.now()}`,
      type: 'location',
      label: '地區',
      value: locMatch[1].trim(),
    });
  }

  // 6. 年資 / 經歷
  const expMatch = text.match(/經歷[：:]\s*([^、,，\n]+)/) || (intakeData?.experience ? [null, intakeData.experience] : null);
  if (expMatch && expMatch[1]) {
    const yearsMatch = expMatch[1].match(/(\d+)\s*年/);
    const yrs = yearsMatch ? parseInt(yearsMatch[1], 10) : 0;
    tags.push({
      id: `tag-exp-${Date.now()}`,
      type: 'experience',
      label: '年資',
      value: expMatch[1].trim(),
      numValue: yrs,
      experienceYears: yrs,
    });
  }

  // 7. 學歷
  const eduMatch = text.match(/學歷[：:]\s*([^、,，\n]+)/) || (intakeData?.education ? [null, intakeData.education] : null);
  if (eduMatch && eduMatch[1]) {
    tags.push({
      id: `tag-edu-${Date.now()}`,
      type: 'education',
      label: '學歷',
      value: eduMatch[1].trim(),
    });
  }

  return tags;
}

export function tagsToBrief(tags: ConditionTag[]): string {
  if (!tags.length) return '';
  return tags
    .filter((t) => String(t.value || '').trim()) // 還沒填的新標籤不算進條件
    .map((t) => {
      if (t.type === 'company') return `限定公司：${t.value}`;
      if (t.type === 'role') return `職務：${t.value}`;
      if (t.type === 'salary') return `薪資：${t.value}`;
      if (t.type === 'jobType') return `工作型態：${t.value}`;
      if (t.type === 'location') return `地區：${t.value}`;
      if (t.type === 'experience') return `經歷：${t.value}`;
      if (t.type === 'education') return `學歷：${t.value}`;
      return `${t.label}：${t.value}`;
    })
    .join('、');
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
  // 篩選：正職／兼職、台灣／國外（含國家，預設不限、先不預設台灣）
  const [jobTypeFilter, setJobTypeFilter] = useState<'全部' | '正職' | '兼職' | '實習'>('全部');
  const [regionFilter, setRegionFilter] = useState<'全部' | '台灣' | '國外' | '台灣與國外'>('全部');
  const [countryFilter, setCountryFilter] = useState<string[]>([]);
  const [abroadCityFilter, setAbroadCityFilter] = useState<string[]>([]);
  const [companyFilter, setCompanyFilter] = useState<string>('');
  const [customCompanyInput, setCustomCompanyInput] = useState<string>('');
  // 只找國外：薪資用當地幣別（存選項文字），不套台灣的月薪門檻
  const [abroadSalaryFilter, setAbroadSalaryFilter] = useState('');
  // 顯示幣別：職缺薪資依當前匯率換算（記在這台裝置）
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>(() => {
    try {
      const v = localStorage.getItem('ideax_job_currency') as CurrencyCode | null;
      if (v && CURRENCIES.some((c) => c.code === v)) return v;
    } catch {}
    return 'TWD';
  });
  const [fxRates, setFxRates] = useState<Partial<Record<CurrencyCode, number>>>(FALLBACK_USD_RATES);
  const [fxUpdatedAt, setFxUpdatedAt] = useState('');
  useEffect(() => {
    try { localStorage.setItem('ideax_job_currency', displayCurrency); } catch {}
  }, [displayCurrency]);
  useEffect(() => {
    let alive = true;
    fetch('/api/fx')
      .then((r) => r.json())
      .then((d) => { if (alive && d?.rates) { setFxRates(d.rates); setFxUpdatedAt(d.source === 'live' ? String(d.updatedAt || '') : ''); } })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  /** 職缺薪資換成顯示幣別（跟原幣別一樣就不顯示換算） */
  const convertedSalary = (job: { salaryText: string; salaryMin: number; salaryMax: number; location?: string }) => {
    const from = detectCurrency(job.salaryText, job.location || '');
    if (from === displayCurrency) return '';
    const lo = job.salaryMin > 0 ? job.salaryMin : 0, hi = job.salaryMax > 0 ? job.salaryMax : 0;
    if (!lo && !hi) return '';
    const a = formatMoney(convert(lo || hi, from, displayCurrency, fxRates), displayCurrency);
    const b = hi && lo && hi !== lo ? formatMoney(convert(hi, from, displayCurrency, fxRates), displayCurrency) : '';
    return `約 ${a}${b ? `～${b}` : ''}`;
  };
  /** 薪資選項旁邊加上換算金額 */
  const approxIn = (amount: number, from: CurrencyCode) =>
    from === displayCurrency ? '' : `（約 ${formatMoney(convert(amount, from, displayCurrency, fxRates), displayCurrency)}）`;
  // 求職網：預設全選；這裡只記使用者取消勾選的
  const [excludedSites, setExcludedSites] = useState<string[]>([]);
  const siteOptions = useMemo(() => jobSiteOptions(regionFilter, countryFilter), [regionFilter, countryFilter]);
  const allSiteOptions = useMemo(() => Array.from(new Set([...siteOptions.domestic, ...siteOptions.abroad])), [siteOptions]);
  const chosenSites = allSiteOptions.filter((x) => !excludedSites.includes(x));
  const isSiteFiltered = chosenSites.length > 0 && chosenSites.length < allSiteOptions.length;
  const isHourlyFilter = jobTypeFilter === '兼職';
  /** 篩選條件組成的搜尋說明（正職／兼職、範圍、時薪） */
  const filterBriefParts = (): string[] => {
    const parts: string[] = [];
    if (jobTypeFilter !== '全部') parts.push(`工作型態：${jobTypeFilter === '兼職' ? '兼職工讀' : jobTypeFilter}`);
    if (regionFilter !== '全部' && regionFilter !== '台灣') {
      const v = regionFilter === '國外' ? '工作範圍：國外' : '工作範圍：台灣與國外皆可';
      parts.push(countryFilter.length ? `${v}（${formatCountryScope(countryFilter, abroadCityFilter)}）` : v);
    } else if (regionFilter === '台灣') {
      parts.push('工作範圍：台灣');
    }
    if (regionFilter === '國外') { if (abroadSalaryFilter) parts.push(abroadSalaryFilter); }
    else if (isHourlyFilter && minSalaryFilter > 0) parts.push(`薪水：時薪 ${minSalaryFilter} 元以上`);
    if (companyFilter.trim()) parts.push(`目標公司：${companyFilter.trim()}`);
    if (isSiteFiltered) parts.push(`求職網：${chosenSites.join('、')}`);
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
  // 管理員：職缺卡片上多一顆「檢查連結」，看這個連結每一步的檢查結果
  const { currentUser: appUser } = useApp();
  const isAdminViewer = appUser?.role === 'admin' || appUser?.id === 'user-admin';
  const checkLinkButton = (job: JobListing) =>
    isAdminViewer && job.url ? (
      <span
        role="button"
        tabIndex={0}
        title="（管理員）檢查這個連結為什麼會被選中"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const q = new URLSearchParams({ url: job.url, title: job.title || '', company: job.company || '' });
          window.open(`/api/job-explorer/check-link?${q.toString()}`, '_blank', 'noopener');
        }}
        className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-600 hover:bg-stone-200 cursor-pointer"
      >
        檢查連結
      </span>
    ) : null;

  // ─── 保留這次的搜尋結果：點職缺連結出去、頁面被重新整理或 APP 重開，回來時結果還在（存在這台裝置，6 小時內有效） ───
  const PERSIST_KEY = 'ideax_job_explorer_session_v1';
  const PERSIST_TTL = 6 * 60 * 60 * 1000;
  const restoredRef = useRef(false);
  const restoreScrollRef = useRef<number | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PERSIST_KEY);
      const saved = raw ? JSON.parse(raw) : null;
      if (saved && Date.now() - Number(saved.at || 0) < PERSIST_TTL && (saved.jobs?.length || saved.messages?.length)) {
        // 上次還在搜尋中就離開了：結果保留，訊息改成可以重新搜尋
        const msgs: ChatMessage[] = (saved.messages || []).map((m: ChatMessage) =>
          m.id === saved.searchingMsgId
            ? { ...m, text: saved.jobs?.length ? `上次的搜尋在找到 ${saved.jobs.length} 筆後中斷了，結果都保留著。` : '上次的搜尋中斷了，要再搜一次嗎？', searchActions: saved.searchingBrief ? ['retry'] : undefined, retryBrief: saved.searchingBrief || undefined }
            : { ...m, searchActions: m.searchActions?.filter((a) => a === 'retry') }
        );
        setMessages(msgs);
        if (Array.isArray(saved.jobs)) setJobs(saved.jobs);
        setHasSearched(Boolean(saved.hasSearched || saved.jobs?.length));
        if (typeof saved.keyword === 'string') setKeyword(saved.keyword);
        if (saved.selectedCity) setSelectedCity(saved.selectedCity);
        if (saved.selectedCategory) setSelectedCategory(saved.selectedCategory);
        if (saved.sortBy) setSortBy(saved.sortBy);
        if (saved.sortOrder) setSortOrder(saved.sortOrder);
        if (Array.isArray(saved.userCarePoints)) setUserCarePoints(saved.userCarePoints);
        if (typeof saved.scrollY === 'number') restoreScrollRef.current = saved.scrollY;
      }
    } catch {}
    restoredRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);

  // AI 對話處理狀態（已收到、理解中、打字中）
  const [aiStatus, setAiStatus] = useState<AiIntakeStatus>('idle');

  // 條件標籤編輯狀態（依標籤形式，可刪除、新增、編輯文字或數字與幣別）
  const [isAddTagOpen, setIsAddTagOpen] = useState(false);
  // 剛新增的標籤：一出現就直接在標籤上輸入
  const [newTagId, setNewTagId] = useState<string | null>(null);

  // 同步確定與整理後的條件標籤至篩選面板，搜尋過後仍可修改再次搜尋
  const syncConditionsToFilters = (tags: ConditionTag[]) => {
    for (const t of tags) {
      if (t.type === 'role' && t.value) {
        setKeyword(t.value);
      } else if (t.type === 'company') {
        const co = t.value.replace(/^(目標公司[：:]\s*|限定公司[：:]\s*)/, '').trim();
        if (co && co !== '不拘' && co !== '不限' && co !== '不限公司') {
          setCompanyFilter(co);
        } else {
          setCompanyFilter('');
        }
      } else if (t.type === 'location' && t.value) {
        const cityList = [
          '台北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣', '苗栗縣', '台中市',
          '彰化縣', '南投縣', '雲林縣', '嘉義市', '嘉義縣', '台南市', '高雄市', '屏東縣',
          '宜蘭縣', '花蓮縣', '台東縣', '澎湖縣', '金門縣', '連江縣', '遠端工作'
        ];
        const match = cityList.find((c) => t.value.includes(c) || c.includes(t.value));
        if (match) setSelectedCity(match);
      } else if (t.type === 'jobType' && t.value) {
        if (/兼職|工讀|打工/.test(t.value)) setJobTypeFilter('兼職');
        else if (/實習/.test(t.value)) setJobTypeFilter('實習');
        else if (/正職/.test(t.value)) setJobTypeFilter('正職');
      } else if (t.type === 'salary') {
        if (typeof t.numValue === 'number' && t.numValue > 0) {
          setMinSalaryFilter(t.numValue);
        }
      } else if (t.type === 'experience') {
        if (typeof t.experienceYears === 'number') {
          setMaxExpFilter(t.experienceYears);
        }
      } else if (t.type === 'education') {
        if (/高中職/.test(t.value)) setMaxEduFilter(2);
        else if (/專科/.test(t.value)) setMaxEduFilter(3);
        else if (/大學/.test(t.value)) setMaxEduFilter(4);
        else if (/碩士/.test(t.value)) setMaxEduFilter(5);
      }
    }
  };

  const handleDeleteConditionTag = (msgId: string, tagId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const currentTags = m.conditionTags || parseConditionTags(m.pendingBrief || m.text);
        const nextTags = currentTags.filter((t) => t.id !== tagId);
        const newBrief = tagsToBrief(nextTags);
        setPendingConfirmedBrief(newBrief);
        syncConditionsToFilters(nextTags);
        return {
          ...m,
          conditionTags: nextTags,
          pendingBrief: newBrief,
          confirmed: false,
          text: `已為您更新搜尋條件：\n確認依此條件搜尋嗎？`,
        };
      })
    );
  };

  /** 在標籤上直接改完：整顆標籤換成新的值，並同步到搜尋條件與篩選 */
  const handleUpdateConditionTag = (msgId: string, updated: ConditionTag) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const currentTags = m.conditionTags || parseConditionTags(m.pendingBrief || m.text);
        const nextTags = currentTags.map((t) => (t.id === updated.id ? updated : t));
        const newBrief = tagsToBrief(nextTags);
        setPendingConfirmedBrief(newBrief);
        syncConditionsToFilters(nextTags);
        return { ...m, conditionTags: nextTags, pendingBrief: newBrief, confirmed: false };
      })
    );
    if (newTagId === updated.id) setNewTagId(null);
  };

  const handleAddConditionTag = (msgId: string, type: ConditionTagType) => {
    const newId = `tag-${type}-${Date.now()}`;
    // 新標籤先留空，直接在標籤上填；沒填就自動移除（不要預先塞「台積電」「工程師」之類的值）
    const LABELS: Record<string, string> = { company: '限定公司', salary: '薪資', experience: '年資', location: '地區', role: '職務', jobType: '工作型態', education: '學歷', custom: '自訂條件' };
    const newTag: ConditionTag =
      type === 'salary'
        ? { id: newId, type: 'salary', label: '薪資', value: '', numValue: 0, salaryCurrency: displayCurrency || 'TWD', salaryPeriod: '月薪' }
        : type === 'experience'
        ? { id: newId, type: 'experience', label: '年資', value: '', numValue: 0, experienceYears: 0 }
        : { id: newId, type, label: LABELS[type] || '條件', value: '' };
    setNewTagId(newId);

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const currentTags = m.conditionTags || parseConditionTags(m.pendingBrief || m.text);
        const nextTags = [...currentTags.filter((t) => t.type !== type), newTag];
        const newBrief = tagsToBrief(nextTags);
        setPendingConfirmedBrief(newBrief);
        syncConditionsToFilters(nextTags);
        return {
          ...m,
          conditionTags: nextTags,
          pendingBrief: newBrief,
          confirmed: false,
        };
      })
    );
    setIsAddTagOpen(false);
  };

  const chatEndRef = useRef<HTMLDivElement>(null);

  // 結果有變就存一份（稍等一下再存，避免每來一筆就寫一次）
  useEffect(() => {
    if (!restoredRef.current) return;
    const t = window.setTimeout(() => {
      try {
        if (!messages.length && !jobs.length) { localStorage.removeItem(PERSIST_KEY); return; }
        const sess = searchSessionRef.current;
        localStorage.setItem(PERSIST_KEY, JSON.stringify({
          at: Date.now(),
          messages: messages.slice(-40),
          jobs: jobs.slice(0, 100),
          hasSearched,
          keyword, selectedCity, selectedCategory, sortBy, sortOrder, userCarePoints,
          searchingMsgId: isSearching && sess ? sess.botMsgId : null,
          searchingBrief: isSearching && sess ? sess.brief : null,
          scrollY: window.scrollY,
        }));
      } catch {}
    }, 500);
    return () => window.clearTimeout(t);
  }, [messages, jobs, hasSearched, keyword, selectedCity, selectedCategory, sortBy, sortOrder, userCarePoints, isSearching]); // eslint-disable-line react-hooks/exhaustive-deps

  // 點出去前記下捲到哪裡，回來時捲回原位
  useEffect(() => {
    const save = () => {
      if (document.visibilityState !== 'hidden') return;
      try {
        const raw = localStorage.getItem(PERSIST_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        saved.scrollY = window.scrollY;
        localStorage.setItem(PERSIST_KEY, JSON.stringify(saved));
      } catch {}
    };
    document.addEventListener('visibilitychange', save);
    window.addEventListener('pagehide', save);
    return () => { document.removeEventListener('visibilitychange', save); window.removeEventListener('pagehide', save); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (restoreScrollRef.current == null || !jobs.length) return;
    const y = restoreScrollRef.current;
    restoreScrollRef.current = null;
    window.setTimeout(() => window.scrollTo({ top: y }), 120);
  }, [jobs.length]);

  useEffect(() => {
    try {
      localStorage.setItem('ideax_saved_jobs_map', JSON.stringify(savedJobsMap));
    } catch {}
  }, [savedJobsMap]);

  const toggleSaveJob = (e: React.MouseEvent, job: JobListing) => {
    if (arrivalOrder) userBrowsingRef.current = true;
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

  // 點選需求追問快捷標籤（如：正職、兼職、台北市、或「跳過」）
  // 依指示：只有在用戶另外輸入時才需要調用 gemini 理解，若是選擇選項則不用，直接在前端結構化處理
  const handleSelectClarificationChip = (chip: { label: string; value: string; type: string }) => {
    const isSkip = chip.type?.startsWith('skip:') || chip.label === '跳過';
    const dim = (chip.type?.replace(/^skip:/, '') || 'jobType') as QuickConditionKey;
    if (isSkip && dim) {
      setSkippedDimensions((prev) => (prev.includes(dim) ? prev : [...prev, dim]));
    }

    const lastBot = [...messages].reverse().find((m) => m.role === 'bot');
    const userMsgId = `user-${Date.now()}`;
    const nextCompleted = Array.from(new Set([...(lastBot?.completedConditionKeys || []), dim]));
    const nextMap: Partial<Record<QuickConditionKey, string>> = { ...(lastBot?.selectedConditionMap || {}) };
    if (!isSkip && chip.value) {
      nextMap[dim] = chip.value;
    }

    const currentBrief = pendingConfirmedBrief || lastBot?.pendingBrief || '';
    let updatedBrief = currentBrief;
    if (!isSkip && chip.value && !currentBrief.includes(chip.value)) {
      updatedBrief = currentBrief ? `${currentBrief}、${chip.value}` : chip.value;
    }
    setPendingConfirmedBrief(updatedBrief);

    const stepOrder: QuickConditionKey[] = ['jobType', 'region', 'company', 'education', 'experience', 'location', 'salary', 'priority'];
    const nextStep = stepOrder.find((k) => !nextCompleted.includes(k)) || null;

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: 'user',
        text: chip.label,
      },
      {
        id: `bot-opt-${Date.now()}`,
        role: 'bot',
        text: `已為您設定搜尋條件：${updatedBrief}。確認依此條件搜尋嗎？`,
        baseBrief: updatedBrief,
        pendingBrief: updatedBrief,
        searchBriefIfSkipped: updatedBrief,
        confirmed: false,
        isAmbiguous: false,
        hasMoreQuestions: false,
        completedConditionKeys: nextCompleted,
        activeConditionKey: nextStep,
        selectedConditionMap: nextMap,
      },
    ]);
  };

  // 點擊「學歷、經歷、地區、薪水、限定公司」條件按鈕，切換該條件的選項面板
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
  const QUICK_STEP_ORDER: QuickConditionKey[] = ['jobType', 'region', 'company', 'education', 'experience', 'location', 'salary', 'priority'];
  const composeConditionBrief = (
    m: ChatMessage,
    map: Partial<Record<QuickConditionKey, string>>,
    countries: string[],
    cities: string[] = m.selectedCities || []
  ) => {
    const base = (m.baseBrief ?? m.pendingBrief ?? '').trim();
    const parts = QUICK_STEP_ORDER.map((k) => {
      const v = map[k];
      if (!v) return '';
      const prefix = v.split('：')[0];
      if (prefix && base.includes(prefix + '：')) return '';
      if (k === 'region' && regionIncludesAbroad(v) && countries.length > 0) return `${v}（${formatCountryScope(countries, cities)}）`;
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
        const cities = citiesForCountries(countries, m.selectedCities || []);
        const updatedBrief = composeConditionBrief(m, m.selectedConditionMap || {}, countries, cities);
        setPendingConfirmedBrief(updatedBrief);
        return {
          ...m,
          selectedCountries: countries,
          selectedCities: cities,
          pendingBrief: updatedBrief,
          text: `已為您設定搜尋條件：${updatedBrief}。確認依此條件搜尋嗎？`,
        };
      })
    );
  };

  // 國外城市（依勾選的國家）
  const handleToggleAbroadCity = (msgId: string, city: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const cur = m.selectedCities || [];
        const cities = cur.includes(city) ? cur.filter((c) => c !== city) : [...cur, city];
        const updatedBrief = composeConditionBrief(m, m.selectedConditionMap || {}, m.selectedCountries || [], cities);
        setPendingConfirmedBrief(updatedBrief);
        return { ...m, selectedCities: cities, pendingBrief: updatedBrief, text: `已為您設定搜尋條件：${updatedBrief}。確認依此條件搜尋嗎？` };
      })
    );
  };

  // 優先顯示排好了（或跳過）：收起來
  const handleFinishPriority = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const done = (m.completedConditionKeys || []).includes('priority') ? m.completedConditionKeys || [] : [...(m.completedConditionKeys || []), 'priority' as QuickConditionKey];
        return { ...m, completedConditionKeys: done, activeConditionKey: null };
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
    let brief = [rawBrief, ...extra].join('、');

    // 當用戶並未特別說要國外或是某個台灣以外的國家時才預設台灣去搜索
    const mentionsAbroad = /國外|海外|出國|外派|日本|東京|大阪|新加坡|香港|澳門|中國大陸|美國|紐約|矽谷|舊金山|西雅圖|加拿大|溫哥華|多倫多|英國|倫敦|德國|柏林|法國|澳洲|雪梨|墨爾本|紐西蘭|韓國|首爾|馬來西亞|吉隆坡|越南|泰國|曼谷|菲律賓|印尼|荷蘭|歐洲|北美|東南亞|全球遠端/i.test(brief);
    const mentionsTaiwan = /台灣|臺灣|全台|台北|新北|基隆|桃園|新竹|苗栗|台中|彰化|南投|雲林|嘉義|台南|高雄|屏東|宜蘭|花蓮|台東|澎湖|金門|連江/i.test(brief);
    if (!mentionsAbroad && !mentionsTaiwan && regionFilter !== '國外' && regionFilter !== '台灣與國外') {
      brief = `${brief}（台灣）`;
    }

    // 同步確定的條件至篩選面板，並確保搜尋過後仍可在篩選或標籤中修改再次搜尋
    syncConditionsToFilters(parseConditionTags(brief));

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

    // 在工作搜索過程，讓右下角小燈泡自動出來陪伴（想看跳舞可以點小燈泡訊息框裡的跳舞鍵）
    accompanyDuringSearch('搜搜正在幫你找好工作，先來跟我玩吧 !');

    const botMsgId = `exp-stream-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: botMsgId,
        role: 'bot',
        text: useGeminiFallback ? '小燈泡出發去全網找職缺了，找到就會陸續送上來…' : '已確認您的條件！搜搜駕著筋斗雲出發了，找到的職缺會每 4 筆陸續送上來…',
        confirmed: true,
      },
    ]);
    setPendingConfirmedBrief('');
    setPendingFallbackBrief('');

    startSearchSession({
      brief,
      botMsgId,
      startWith: useGeminiFallback ? 'gemini' : 'dify',
      filters: {
        keyword: keyword.trim(),
        city: selectedCity,
        userBaseCity,
        category: selectedCategory,
        minSalary: isHourlyFilter || regionFilter === '國外' ? 0 : minSalaryFilter,
        maxExperienceYears: maxExpFilter,
        maxEducationLevel: maxEduFilter,
        carePoints: userCarePoints,
        // 全選時不限制（搜最廣）；有取消勾選才只搜選到的求職網
        sites: isSiteFiltered ? chosenSites : [],
      },
    });
  };

  // ─── 搜尋流程：先派搜搜（Dify）；50 秒沒消息就問要繼續等還是派小燈泡（本地 Gemini）；80 秒還沒消息就暫停 ───
  type SearchSession = {
    id: number;
    brief: string;
    botMsgId: string;
    filters: any;
    jobs: JobListing[];
    seen: Set<string>;
    controllers: AbortController[];
    timers: number[];
    difyGot: boolean;
    difyDone: boolean;
    difyRunning: boolean;
    geminiStarted: boolean;
    geminiDone: boolean;
    paused: boolean;
    finished: boolean;
    /** 各自找到幾筆（去掉重複後） */
    found: { dify: number; gemini: number };
  };
  const searchSessionRef = useRef<SearchSession | null>(null);
  const [arrivalOrder, setArrivalOrder] = useState(false); // 搜尋中照抵達順序顯示，全部跑完再排序
  // 搜尋中使用者已經在看結果（捲動、收藏、點職缺、自己選排序）：跑完就不自動重排，改成讓他自己點
  const userBrowsingRef = useRef(false);
  const [readyToSort, setReadyToSort] = useState(false);
  useEffect(() => {
    if (!arrivalOrder) return;
    const mark = () => { if (searchSessionRef.current && searchSessionRef.current.jobs.length > 0) userBrowsingRef.current = true; };
    const onKey = (e: KeyboardEvent) => { if (/^(PageDown|PageUp|ArrowDown|ArrowUp|End|Home| )$/.test(e.key)) mark(); };
    const onDown = (e: PointerEvent) => { if ((e.target as HTMLElement | null)?.closest?.('a[href^="http"]')) mark(); };
    window.addEventListener('wheel', mark, { passive: true });
    window.addEventListener('touchmove', mark, { passive: true });
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown, true);
    return () => {
      window.removeEventListener('wheel', mark);
      window.removeEventListener('touchmove', mark);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown, true);
    };
  }, [arrivalOrder]);
  const applyFinalSort = () => {
    setArrivalOrder(false);
    setReadyToSort(false);
    setSortBy('recommended');
    setSortOrder('desc');
  };

  const updateBotMsg = (sess: SearchSession, patch: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === sess.botMsgId ? { ...m, ...patch } : m)));
  };

  const stopSearchSession = (sess: SearchSession | null) => {
    if (!sess) return;
    sess.timers.forEach((t) => window.clearTimeout(t));
    sess.timers = [];
    sess.controllers.forEach((c) => { try { c.abort(); } catch {} });
    sess.controllers = [];
  };
  useEffect(() => () => stopSearchSession(searchSessionRef.current), []);

  /** 「搜搜找到 8 筆、小燈泡找到 4 筆職缺」 */
  const foundSummary = (sess: SearchSession) => {
    const parts: string[] = [];
    if (sess.found.dify > 0) parts.push(`搜搜找到 ${sess.found.dify} 筆`);
    if (sess.found.gemini > 0) parts.push(`小燈泡找到 ${sess.found.gemini} 筆`);
    return parts.length ? `${parts.join('、')}職缺` : `找到 ${sess.jobs.length} 筆職缺`;
  };

  const finishSearchSession = (sess: SearchSession, note?: string) => {
    if (sess.finished) return;
    sess.finished = true;
    sess.timers.forEach((t) => window.clearTimeout(t));
    // 全部跑完：使用者還沒動就直接整理排序；已經在看了就不打斷，讓他自己點「依推薦排序」
    if (!userBrowsingRef.current || sess.jobs.length === 0) applyFinalSort();
    else setReadyToSort(true);
    setIsSearching(false);
    setIsGeminiFallbackSearching(false);
    const n = sess.jobs.length;
    setSearchProgressText(n ? `${foundSummary(sess)}，共 ${n} 筆` : '');
    if (note !== undefined) updateBotMsg(sess, { text: note });
    else if (n) updateBotMsg(sess, { text: `找好了！${foundSummary(sess)}${userBrowsingRef.current ? '。' : '，已依推薦程度排序。'}`, searchActions: undefined });
    window.setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
  };

  /** 兩邊都跑完了嗎（搜搜結束或暫停，小燈泡沒派或也跑完） */
  const maybeFinish = (sess: SearchSession) => {
    if (sess.finished || searchSessionRef.current !== sess) return;
    const difySettled = sess.difyDone || sess.paused;
    const geminiSettled = !sess.geminiStarted || sess.geminiDone;
    if (!difySettled || !geminiSettled) return;
    if (sess.jobs.length > 0) { finishSearchSession(sess); return; }
    // 沒找到：小燈泡也去過了就結束；還沒派過就問要不要派
    if (sess.geminiStarted) {
      finishSearchSession(sess, '這次沒有找到符合條件、正在招募的職缺，可以放寬一些條件再試試。');
    } else if (!sess.paused) {
      sess.finished = true;
      setIsSearching(false);
      setArrivalOrder(false);
      updateBotMsg(sess, { text: '搜搜這趟沒帶回符合條件的職缺，要派小燈泡去看看嗎？', searchActions: ['bulb', 'dismiss'] });
    }
  };

  const addSessionJobs = (sess: SearchSession, list: JobListing[], src: 'dify' | 'gemini') => {
    if (searchSessionRef.current !== sess) return;
    const fresh: JobListing[] = [];
    for (const j of list) {
      if (sess.jobs.length + fresh.length >= MAX_JOBS) break;
      // 搜搜和小燈泡找到同一筆（網址相同，或公司＋職稱整理後相同）就只留一筆
      if (seenJobBefore(sess.seen, j)) continue;
      fresh.push(j);
    }
    if (!fresh.length) return;
    if (src === 'dify') sess.difyGot = true;
    sess.jobs = [...sess.jobs, ...fresh];
    sess.found[src] += fresh.length;
    setJobs([...sess.jobs]);
    setStreamingBatchCount((c) => c + 1);
    const who = src === 'dify' ? '搜搜' : '小燈泡';
    setSearchProgressText(`${who}又帶回 ${fresh.length} 筆（${foundSummary(sess)}）…`);
    // 有消息了：收起「要不要繼續等」的詢問
    updateBotMsg(sess, { text: `${foundSummary(sess)}，還在繼續找…`, searchActions: undefined });
  };

  const runSearchStream = async (sess: SearchSession, src: 'dify' | 'gemini') => {
    const controller = new AbortController();
    sess.controllers.push(controller);
    const safety = window.setTimeout(() => controller.abort(), 150000);
    let difyUnavailable = false;
    try {
      const res = await fetch('/api/job-explorer/search-stream', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sess.brief, filters: sess.filters, source: src }),
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
              const ev = JSON.parse(trimmed.slice(6));
              if (ev.type === 'batch' && Array.isArray(ev.jobs)) {
                addSessionJobs(sess, ev.jobs, src);
                if (Array.isArray(ev.carePoints) && ev.carePoints.length > 0) setUserCarePoints(ev.carePoints);
              } else if (ev.type === 'done' && ev.difyUnavailable) {
                difyUnavailable = true;
              }
            } catch (parseError) {
              console.warn('[SSE Parse Error]', parseError);
            }
          }
        }
      }
    } catch (err) {
      if ((err as any)?.name !== 'AbortError') console.warn('[Stream Error]', err);
    } finally {
      window.clearTimeout(safety);
    }
    if (searchSessionRef.current !== sess) return;
    if (src === 'dify') {
      sess.difyDone = true;
      sess.difyRunning = false;
      // 搜搜沒開（沒設定）：直接改派小燈泡，不用讓使用者等
      if (difyUnavailable && !sess.geminiStarted && !sess.finished) { dispatchBulb(sess, '搜搜今天不在，小燈泡代班出發去找了！'); return; }
    } else {
      sess.geminiDone = true;
    }
    maybeFinish(sess);
  };

  const dispatchBulb = (sess: SearchSession, text = '小燈泡出發去看看了！找到的職缺會每 2 筆陸續送上來…') => {
    if (sess.geminiStarted) return;
    sess.geminiStarted = true;
    sess.finished = false;
    setIsSearching(true);
    setIsGeminiFallbackSearching(true);
    setArrivalOrder(true);
    cheerMascot('小燈泡出發！');
    updateBotMsg(sess, { text, searchActions: undefined });
    void runSearchStream(sess, 'gemini');
  };

  const startSearchSession = (opts: { brief: string; botMsgId: string; filters: any; startWith: 'dify' | 'gemini' }) => {
    stopSearchSession(searchSessionRef.current);
    const sess: SearchSession = {
      id: Date.now(), brief: opts.brief, botMsgId: opts.botMsgId, filters: opts.filters,
      jobs: [], seen: new Set(), controllers: [], timers: [],
      difyGot: false, difyDone: false, difyRunning: false, geminiStarted: false, geminiDone: false, paused: false, finished: false,
      found: { dify: 0, gemini: 0 },
    };
    searchSessionRef.current = sess;
    userBrowsingRef.current = false;
    setReadyToSort(false);
    setJobs([]);
    setStreamingBatchCount(0);
    setArrivalOrder(true);
    if (opts.startWith === 'gemini') {
      sess.difyDone = true; // 使用者直接指定小燈泡：不派搜搜
      dispatchBulb(sess, '小燈泡出發去全網找職缺了，找到就會每 2 筆陸續送上來…');
      return;
    }
    sess.difyRunning = true;
    void runSearchStream(sess, 'dify');
    // 50 秒都沒有任何職缺：問使用者要繼續等，還是派小燈泡
    sess.timers.push(window.setTimeout(() => {
      if (searchSessionRef.current !== sess || sess.difyGot || sess.difyDone || sess.geminiStarted) return;
      updateBotMsg(sess, { text: '搜搜似乎正經歷九九八十一難，是否繼續等待？或是派小燈泡前去看看？', searchActions: ['wait', 'bulb'] });
      setSearchProgressText('搜搜還在路上…');
    }, DIFY_ASK_MS));
    // 80 秒還是沒消息（也沒派小燈泡）：主動暫停這次任務
    sess.timers.push(window.setTimeout(() => {
      if (searchSessionRef.current !== sess || sess.difyGot || sess.difyDone || sess.geminiStarted) return;
      sess.paused = true;
      sess.controllers.forEach((c) => { try { c.abort(); } catch {} });
      sess.finished = true;
      setIsSearching(false);
      setArrivalOrder(false);
      setSearchProgressText('');
      updateBotMsg(sess, { text: '搜搜這趟遲遲沒有回音，這次任務先暫停了。要重新搜尋，或派小燈泡去看看？', searchActions: ['retry', 'bulb'], retryBrief: sess.brief });
    }, DIFY_PAUSE_MS));
  };

  const handleSearchAction = (msgId: string, action: SearchActionKey) => {
    const sess = searchSessionRef.current;
    if (!sess || sess.botMsgId !== msgId) {
      // 舊的訊息（例如頁面重開後）：只能重新搜尋
      const msg = messages.find((m) => m.id === msgId);
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, searchActions: undefined } : m)));
      if (action === 'retry' && msg?.retryBrief) void handleForwardToExplorerAgent(msg.retryBrief);
      return;
    }
    if (action === 'wait') {
      updateBotMsg(sess, { text: '好，繼續等搜搜回來…', searchActions: undefined });
      setSearchProgressText('繼續等搜搜…');
    } else if (action === 'bulb') {
      dispatchBulb(sess);
    } else if (action === 'retry') {
      updateBotMsg(sess, { searchActions: undefined });
      void handleForwardToExplorerAgent(sess.brief);
    } else {
      updateBotMsg(sess, { text: '好的，可以調整條件後再搜尋一次。', searchActions: undefined });
    }
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
    setAiStatus('received');
    await new Promise((r) => setTimeout(r, 200));
    setAiStatus('understanding');

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
      setAiStatus('typing');
      await new Promise((r) => setTimeout(r, 250));

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

      const initialTags = parseConditionTags(cleanBrief, data);

      const RANKABLE: CarePointKey[] = ['industry', 'workEnvironment', 'benefits'];
      const hasPriority = [...(Array.isArray(data?.carePoints) ? data.carePoints : []), ...detected, ...userCarePoints].some((k: CarePointKey) => RANKABLE.includes(k));
      if (hasPriority && !completedKeys.includes('priority')) completedKeys.push('priority');
      const stepOrder: QuickConditionKey[] = ['jobType', 'region', 'company', 'education', 'experience', 'location', 'salary', 'priority'];
      const nextAutoConditionKey = isAmb
        ? null
        : customText !== undefined
        ? stepOrder.find((k) => !completedKeys.includes(k)) || null
        : null;

      setMessages((prev) => [
        ...prev,
        {
          id: regMsgId,
          role: 'bot',
          text:
            data?.reply ||
            `已為您整理好搜尋條件：\n確認依此條件搜尋嗎？`,
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
          conditionTags: initialTags,
        },
      ]);
    } catch {
      const fallbackText = nextBrief || `${userBaseCity} 最新招募職缺`;
      const fallbackTags = parseConditionTags(fallbackText);
      setPendingConfirmedBrief(fallbackText);
      setAmbiguousClarification(null);
      setMessages((prev) => [
        ...prev,
        {
          id: regMsgId,
          role: 'bot',
          text: `已為您整理好搜尋條件：\n確認依此條件搜尋嗎？`,
          baseBrief: fallbackText,
          pendingBrief: fallbackText,
          searchBriefIfSkipped: fallbackText,
          confirmed: false,
          completedConditionKeys: [],
          activeConditionKey: null,
          selectedConditionMap: {},
          conditionTags: fallbackTags,
        },
      ]);
    } finally {
      setIsRegulating(false);
      setAiStatus('idle');
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
    }
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (keyword.trim()) count++;
    if (companyFilter.trim()) count++;
    if (selectedCity !== '全部') count++;
    if (selectedCategory !== '全部') count++;
    if (minSalaryFilter > 0 || abroadSalaryFilter) count++;
    if (jobTypeFilter !== '全部') count++;
    if (regionFilter !== '全部') count++;
    if (isSiteFiltered) count++;
    if (maxExpFilter !== 'all') count++;
    if (maxEduFilter !== 'all') count++;
    if (userCarePoints.length > 0) count++;
    return count;
  }, [keyword, companyFilter, selectedCity, selectedCategory, minSalaryFilter, maxExpFilter, maxEduFilter, userCarePoints, jobTypeFilter, regionFilter, isSiteFiltered, abroadSalaryFilter]);

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
      // 依使用者排的順序加權：第 1 順位 ×3、第 2 順位 ×2、第 3 順位 ×1
      const w = (k: CarePointKey) => { const i = userCarePoints.indexOf(k); return i < 0 ? 0 : Math.max(1, 3 - i); };
      if (w('salary') && job.salaryMax > 0) bonus += Math.min(12, Math.floor(job.salaryMax / 12000)) * w('salary') / 2;
      if (w('distance') && dist > 0) bonus += Math.max(0, 10 - dist * 0.5) * w('distance') / 2;
      if (w('workEnvironment') && job.workEnvironment) bonus += 4 * w('workEnvironment');
      if (w('benefits') && job.benefits) bonus += 4 * w('benefits');
      if (w('industry') && job.industry) bonus += 4 * w('industry');

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
      const jobCur = detectCurrency(job.salaryText, job.location || '');
      const maxInTwd = jobCur === 'TWD' ? job.salaryMax : convert(job.salaryMax, jobCur, 'TWD', fxRates);
      if (minSalaryFilter > 0 && job.salaryMax > 0 && maxInTwd < minSalaryFilter) {
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

    // 搜尋中照抵達順序顯示（不會一直跳位置），全部跑完再依排序方式整理
    if (arrivalOrder && !showSavedOnly) return filtered;
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
    fxRates,
    arrivalOrder,
  ]);

  const handleSortClick = (key: JobSortKey) => {
    // 使用者自己選了排序：馬上照他選的排，之後也不再自動重排
    if (arrivalOrder) userBrowsingRef.current = true;
    setArrivalOrder(false);
    setReadyToSort(false);
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
    setCompanyFilter('');
    setSelectedCity('全部');
    setSelectedCategory('全部');
    setMinSalaryFilter(0);
    setJobTypeFilter('全部');
    setRegionFilter('台灣');
    setExcludedSites([]);
    setCountryFilter([]);
    setAbroadCityFilter([]);
    setAbroadSalaryFilter('');
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
                  placeholder="職務／關鍵字過濾..."
                  className="px-3 py-2 rounded-xl border border-stone-200 text-xs text-stone-800 bg-stone-50/70 focus:bg-white outline-none focus:border-[#1e3a8a]/50"
                />

                <input
                  type="text"
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  placeholder="限定公司（如：台積電、Google）..."
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
                    // 只找國外：薪資改用當地幣別，台幣門檻清掉；回到台灣則清掉國外薪資
                    if (v === '國外') setMinSalaryFilter(0); else setAbroadSalaryFilter('');
                    setRegionFilter(v);
                    if (v === '台灣' || v === '全部') setCountryFilter([]);
                    if (v === '國外') setSelectedCity('全部');
                  }}
                  className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-800 bg-stone-50/70 focus:bg-white outline-none cursor-pointer"
                >
                  <option value="全部">範圍：不限（預設）</option>
                  <option value="台灣">台灣</option>
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

                {regionFilter === '國外' ? (
                  <select
                    value={abroadSalaryFilter}
                    onChange={(e) => setAbroadSalaryFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-800 bg-stone-50/70 focus:bg-white outline-none cursor-pointer"
                    title="國外職缺用當地幣別；選一個國家時會列出當地常見的薪資級距"
                  >
                    <option value="">薪資：不限（當地幣別）</option>
                    {abroadSalaryOptions(countryFilter, isHourlyFilter)
                      .filter((o) => !o.isSkip && o.value !== '薪資待遇不拘')
                      .map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                          {o.amount && o.cur ? approxIn(o.amount, o.cur as CurrencyCode) : ''}
                        </option>
                      ))}
                  </select>
                ) : (
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
                      {approxIn(v, 'TWD')}
                    </option>
                  ))}
                </select>
                )}

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

              {regionFilter !== '台灣' && regionFilter !== '全部' && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-stone-500">國家／地區（可複選，不選就是全部國外）：</span>
                  {JOB_COUNTRIES.map((c) => {
                    const on = countryFilter.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={on}
                        onClick={() => {
                          const next = countryFilter.includes(c) ? countryFilter.filter((x) => x !== c) : [...countryFilter, c];
                          setCountryFilter(next);
                          setAbroadCityFilter((prev) => citiesForCountries(next, prev));
                          setAbroadSalaryFilter('');
                        }}
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

              {/* 國外：依勾選的國家列出主要城市（可複選，不選就是全國） */}
              {regionFilter !== '台灣' && regionFilter !== '全部' && countryFilter.some((c) => (MAJOR_CITIES_BY_COUNTRY[c] || []).length > 0) && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-stone-500">城市（可複選，不選就是全國）：</span>
                  {countryFilter.filter((c) => (MAJOR_CITIES_BY_COUNTRY[c] || []).length > 0).map((c) => (
                    <div key={c} className="flex items-start gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-stone-400 pt-1 min-w-[3.5rem] shrink-0">{c}</span>
                      {MAJOR_CITIES_BY_COUNTRY[c].map((city) => {
                        const on = abroadCityFilter.includes(city);
                        return (
                          <button
                            key={city}
                            type="button"
                            aria-pressed={on}
                            onClick={() => setAbroadCityFilter((prev) => (prev.includes(city) ? prev.filter((x) => x !== city) : [...prev, city]))}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                              on ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]' : 'bg-white hover:bg-blue-50/50 text-stone-600 border-stone-200'
                            }`}
                          >
                            {city}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}

              {/* 顯示幣別：職缺薪資依當前匯率換算 */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-stone-500">顯示幣別：</span>
                <select
                  value={displayCurrency}
                  onChange={(e) => setDisplayCurrency(e.target.value as CurrencyCode)}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-800 bg-stone-50/70 focus:bg-white outline-none cursor-pointer"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}（{c.code}）</option>
                  ))}
                </select>
                <span className="text-[11px] text-stone-400">
                  不同幣別的薪資會依{fxUpdatedAt ? '當前' : '參考'}匯率換算成{CURRENCIES.find((c) => c.code === displayCurrency)?.name}，僅供參考
                </span>
              </div>

              {/* 求職網：國內、國外各一排，可複選，預設全選 */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-stone-500">求職網（可複選，預設全選）：</span>
                  <button
                    type="button"
                    onClick={() => setExcludedSites([])}
                    className="text-[11px] font-bold text-[#1e3a8a] hover:underline cursor-pointer"
                  >
                    全選
                  </button>
                  <button
                    type="button"
                    onClick={() => setExcludedSites(allSiteOptions)}
                    className="text-[11px] font-bold text-stone-500 hover:underline cursor-pointer"
                  >
                    全不選
                  </button>
                  {chosenSites.length === 0 && <span className="text-[11px] text-amber-700">（都沒選時會搜尋全部求職網）</span>}
                </div>
                {([['國內', siteOptions.domestic], ['國外', siteOptions.abroad]] as Array<[string, string[]]>)
                  .filter(([, list]) => list.length > 0)
                  .map(([label, list]) => (
                    <div key={label} className="flex items-start gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-stone-400 pt-1 w-7 shrink-0">{label}</span>
                      {list.map((site) => {
                        const on = !excludedSites.includes(site);
                        return (
                          <button
                            key={site}
                            type="button"
                            aria-pressed={on}
                            onClick={() => setExcludedSites((prev) => (prev.includes(site) ? prev.filter((x) => x !== site) : [...prev, site]))}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                              on ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]' : 'bg-white hover:bg-blue-50/50 text-stone-500 border-stone-200'
                            }`}
                          >
                            {site}
                          </button>
                        );
                      })}
                    </div>
                  ))}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-stone-500">優先顯示（依點選順序排序）：</span>
                  {(['industry', 'workEnvironment', 'benefits'] as CarePointKey[]).map((key) => {
                    const rank = (userCarePoints.filter((k) => k === 'industry' || k === 'workEnvironment' || k === 'benefits') as CarePointKey[]).indexOf(key);
                    const active = rank >= 0;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleCarePoint(key)}
                        title="依點選順序排出優先順位"
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                          active
                            ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                            : 'bg-white hover:bg-blue-50/50 text-stone-600 border-stone-200'
                        }`}
                      >
                        {active && <span className="w-4 h-4 rounded-full bg-amber-400 text-stone-950 text-[10px] font-black flex items-center justify-center">{rank + 1}</span>}
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
                            {/* 結構化條件標籤（依標籤形式，可刪除、新增、編輯文字或數字與幣別） */}
                            {m.role === 'bot' && m.conditionTags && m.conditionTags.length > 0 ? (
                              <div className="space-y-2.5">
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className="font-bold text-stone-900 text-xs">搜尋條件</span>
                                  <span className="text-[10px] text-stone-400 font-medium">點標籤就能直接修改</span>
                                </div>

                                {/* 標籤群組 */}
                                <div className="flex flex-wrap gap-1.5 items-center">
                                  {m.conditionTags.map((tag) => {
                                                                        const tagColors = 'bg-white border-stone-200 text-stone-900';

                                    const tagIcons = {
                                      role: <Briefcase className="w-3.5 h-3.5 text-indigo-600 shrink-0" />,
                                      company: <Building className="w-3.5 h-3.5 text-purple-600 shrink-0" />,
                                      salary: <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
                                      location: <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />,
                                      jobType: <Briefcase className="w-3.5 h-3.5 text-cyan-600 shrink-0" />,
                                      experience: <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
                                      education: <GraduationCap className="w-3.5 h-3.5 text-rose-600 shrink-0" />,
                                      carePoint: <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />,
                                      custom: <Sparkles className="w-3.5 h-3.5 text-stone-600 shrink-0" />,
                                    }[tag.type];

                                    return (
                                      <InlineConditionTag
                                        key={tag.id}
                                        tag={tag}
                                        colors={tagColors}
                                        icon={tagIcons}
                                        autoEdit={newTagId === tag.id}
                                        onSave={(next) => handleUpdateConditionTag(m.id, next)}
                                        onDelete={() => { if (newTagId === tag.id) setNewTagId(null); handleDeleteConditionTag(m.id, tag.id); }}
                                      />
                                    );
                                  })}

                                  {/* 新增條件標籤按鈕 */}
                                  <div className="relative inline-block">
                                    <button
                                      type="button"
                                      onClick={() => setIsAddTagOpen((v) => !v)}
                                      className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg border border-dashed border-stone-300 text-stone-500 hover:border-blue-400 hover:text-[#1e3a8a] hover:bg-blue-50/60 text-xs font-bold transition-all cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                      <span>新增條件</span>
                                    </button>

                                    {isAddTagOpen && (
                                      <div className="absolute left-0 top-full mt-1.5 z-30 w-48 rounded-xl bg-white border border-stone-200 shadow-xl p-1.5 space-y-0.5 text-xs">
                                        <div className="px-2 py-1 text-[10px] font-black text-stone-400 uppercase tracking-wider">
                                          選擇新增維度
                                        </div>
                                        {[
                                          { type: 'company', label: '🏢 限定公司（自填）' },
                                          { type: 'salary', label: '💰 期望薪資（幣別/數字）' },
                                          { type: 'experience', label: '⏳ 工作年資（數字）' },
                                          { type: 'role', label: '💼 職務名稱' },
                                          { type: 'location', label: '📍 工作地區' },
                                          { type: 'jobType', label: '⏱️ 正職／兼職' },
                                          { type: 'education', label: '🎓 學歷要求' },
                                        ].map((item) => (
                                          <button
                                            key={item.type}
                                            type="button"
                                            onClick={() => handleAddConditionTag(m.id, item.type as ConditionTagType)}
                                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 font-bold text-stone-700 transition-colors flex items-center justify-between cursor-pointer"
                                          >
                                            <span>{item.label}</span>
                                            <Plus className="w-3 h-3 text-stone-400" />
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* 搜尋或再次送出按鈕 */}
                                <div className="flex items-center gap-2 pt-1 flex-wrap">
                                  <button
                                    type="button"
                                    disabled={isSearching || isRegulating}
                                    onClick={() => {
                                      const currentTags = m.conditionTags || [];
                                      syncConditionsToFilters(currentTags);
                                      void handleForwardToExplorerAgent(m.pendingBrief, m.id);
                                    }}
                                    className="px-3.5 py-1.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                                  >
                                    <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
                                    <span>{m.confirmed ? '用新條件再搜一次' : '確認搜尋'}</span>
                                  </button>
                                  {m.confirmed ? (
                                    <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>已搜尋</span>
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap font-medium">{m.text}</p>
                            )}

                            {/* 搜尋中要使用者決定：繼續等搜搜／派小燈泡／重新搜尋 */}
                            {m.role === 'bot' && m.searchActions && m.searchActions.length > 0 && (
                              <div className="mt-2.5 flex flex-wrap gap-2">
                                {m.searchActions.map((act) => (
                                  <button
                                    key={act}
                                    type="button"
                                    onClick={() => handleSearchAction(m.id, act)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 ${
                                      act === 'bulb'
                                        ? 'bg-amber-400 hover:bg-amber-300 text-stone-950 shadow-xs'
                                        : act === 'retry'
                                        ? 'bg-[#1e3a8a] hover:bg-[#1e40af] text-white'
                                        : 'bg-white hover:bg-stone-50 border border-stone-200 text-stone-700'
                                    }`}
                                  >
                                    {SEARCH_ACTION_LABEL[act]}
                                  </button>
                                ))}
                              </div>
                            )}

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
                                  {activeStep && activeStep.key === 'priority' && (
                                    <div className="p-2.5 rounded-xl bg-white/95 border border-blue-200/80 space-y-2">
                                      <div className="text-[11px] font-bold text-[#1e3a8a]">{activeStep.question}</div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {(['industry', 'workEnvironment', 'benefits'] as CarePointKey[]).map((key) => {
                                          const rank = (userCarePoints.filter((k) => k === 'industry' || k === 'workEnvironment' || k === 'benefits') as CarePointKey[]).indexOf(key);
                                          return (
                                            <button
                                              key={key}
                                              type="button"
                                              aria-pressed={rank >= 0}
                                              disabled={isSearching || isRegulating}
                                              onClick={() => toggleCarePoint(key)}
                                              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer active:scale-95 inline-flex items-center gap-1 ${
                                                rank >= 0 ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]' : 'bg-amber-50/70 hover:bg-amber-100 border-amber-200 text-stone-800'
                                              }`}
                                            >
                                              {rank >= 0 && <span className="w-4 h-4 rounded-full bg-amber-400 text-stone-950 text-[10px] font-black flex items-center justify-center">{rank + 1}</span>}
                                              {CARE_POINT_META[key].fieldLabel}
                                            </button>
                                          );
                                        })}
                                        <button
                                          type="button"
                                          disabled={isSearching || isRegulating}
                                          onClick={() => handleFinishPriority(m.id)}
                                          className="px-3 py-1.5 rounded-lg text-[11px] font-black bg-amber-400 hover:bg-amber-300 text-stone-950 border border-amber-500 cursor-pointer active:scale-95"
                                        >
                                          {userCarePoints.some((k) => k === 'industry' || k === 'workEnvironment' || k === 'benefits') ? '完成' : '跳過'}
                                        </button>
                                      </div>
                                      {userCarePoints.some((k) => k === 'industry' || k === 'workEnvironment' || k === 'benefits') && (
                                        <p className="text-[11px] text-stone-500">
                                          優先順序：{userCarePoints.filter((k) => k === 'industry' || k === 'workEnvironment' || k === 'benefits').map((k) => CARE_POINT_META[k]?.fieldLabel || k).join(' ＞ ')}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  {activeStep && activeStep.key !== 'priority' && (
                                    <div className="p-2.5 rounded-xl bg-white/95 border border-blue-200/80 space-y-2">
                                      <div className="text-[11px] font-bold text-[#1e3a8a]">
                                        {activeStep.question}
                                      </div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {(activeStep.key === 'salary'
                                          ? isAbroadOnlyContext(m)
                                            ? abroadSalaryOptions(
                                                countriesInContext(m),
                                                isHourlyContext(`${m.selectedConditionMap?.jobType || ''} ${m.baseBrief || ''} ${m.pendingBrief || ''}`)
                                              )
                                            : salaryOptionsFor(
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
                                      {activeStep.key === 'company' && (
                                        <div className="pt-2 border-t border-blue-100 flex items-center gap-2">
                                          <input
                                            type="text"
                                            value={customCompanyInput}
                                            onChange={(e) => setCustomCompanyInput(e.target.value)}
                                            placeholder="自填目標公司名稱（如：台積電、Google、星巴克）..."
                                            className="flex-1 px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-bold text-stone-900 bg-white"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (customCompanyInput.trim()) {
                                                handleSelectQuickConditionOption(m.id, 'company', {
                                                  label: customCompanyInput.trim(),
                                                  value: `目標公司：${customCompanyInput.trim()}`,
                                                });
                                                setCustomCompanyInput('');
                                              }
                                            }}
                                            disabled={!customCompanyInput.trim()}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1e3a8a] text-white disabled:opacity-40 cursor-pointer"
                                          >
                                            確定
                                          </button>
                                        </div>
                                      )}
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
                                            </div>
                                            {(m.selectedCountries || []).some((c) => (MAJOR_CITIES_BY_COUNTRY[c] || []).length > 0) && (
                                              <div className="space-y-1">
                                                <div className="text-[11px] font-bold text-[#1e3a8a]">主要城市（可複選，不選就是全國）</div>
                                                {(m.selectedCountries || []).filter((c) => (MAJOR_CITIES_BY_COUNTRY[c] || []).length > 0).map((c) => (
                                                  <div key={c} className="flex flex-wrap items-center gap-1.5">
                                                    <span className="text-[11px] font-bold text-stone-500 min-w-[3.5rem]">{c}</span>
                                                    {MAJOR_CITIES_BY_COUNTRY[c].map((city) => {
                                                      const on = (m.selectedCities || []).includes(city);
                                                      return (
                                                        <button
                                                          key={city}
                                                          type="button"
                                                          aria-pressed={on}
                                                          disabled={isSearching || isRegulating}
                                                          onClick={() => handleToggleAbroadCity(m.id, city)}
                                                          className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1 ${
                                                            on ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]' : 'bg-white hover:bg-blue-50 border-blue-200 text-stone-800'
                                                          }`}
                                                        >
                                                          {on && <Check className="w-3 h-3 stroke-[3]" />}
                                                          {city}
                                                        </button>
                                                      );
                                                    })}
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                            <div className="flex flex-wrap gap-1.5">
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
                    {/* AI 即時狀態指示器（已收到、理解中、打字中） */}
                    {aiStatus !== 'idle' && (
                      <div className="flex flex-col items-start animate-fade-in">
                        <div className="max-w-[95%] sm:max-w-[88%] rounded-xl px-3.5 py-2 text-xs leading-relaxed bg-blue-50/90 text-stone-800 border border-blue-200 shadow-2xs flex items-center gap-2">
                          {aiStatus === 'received' && (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-blue-600 animate-bounce shrink-0" />
                              <div className="flex items-center gap-1.5 font-bold text-blue-900">
                                <span>已收到</span>
                                <span className="text-[11px] text-blue-600 font-normal">（準備進行語意分析）</span>
                              </div>
                            </>
                          )}
                          {aiStatus === 'understanding' && (
                            <>
                              <Sparkles className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                              <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                                <span>AI正在整理語義…</span>
                              </div>
                            </>
                          )}
                          {aiStatus === 'typing' && (
                            <>
                              <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                              <div className="flex items-center gap-1.5 font-bold text-stone-900">
                                <span>打字中...</span>
                                <span className="text-[11px] text-amber-700 font-normal">（正在生成結構化條件標籤）</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="flex items-center justify-end gap-3 px-1">
                    <div className="flex items-center gap-3">
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

        {/* 全部找齊了，但使用者正在看結果：不自動重排，讓他自己點 */}
        {!isSearching && readyToSort && arrivalOrder && filteredAndSortedJobs.length > 0 && (
          <button
            type="button"
            onClick={applyFinalSort}
            className="w-full p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between gap-3 hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              已全部找齊（共 {filteredAndSortedJobs.length} 筆），目前照找到的順序排列
            </span>
            <span className="shrink-0 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-black">點這裡依推薦排序</span>
          </button>
        )}

        {/* 提示：部分求職網沒辦法附上正確網址 */}
        {filteredAndSortedJobs.length > 0 && !showSavedOnly && (
          <div role="note" className="flex items-start gap-2.5 rounded-2xl border-2 border-amber-300 bg-amber-50 px-3.5 py-3 shadow-2xs">
            <span className="shrink-0 w-7 h-7 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center">
              <Info className="w-4 h-4 stroke-[2.5]" />
            </span>
            <p className="text-xs sm:text-sm leading-relaxed text-amber-950">
              <span className="font-black">提示：</span>
              <span className="font-bold">部分求職網站可能無法附上正確網址，建議以關鍵字再到該網站搜索一次，就能找到該職缺啦！</span>
            </p>
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
                      {checkLinkButton(job)}
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
                        {convertedSalary(job) && <span className="ml-1 text-[11px] font-semibold text-stone-500">（{convertedSalary(job)}）</span>}
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
                      {checkLinkButton(job)}
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
                        {convertedSalary(job) && <span className="ml-1 text-[11px] font-semibold text-stone-500">（{convertedSalary(job)}）</span>}
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
                      {convertedSalary(job) && <span className="ml-1 text-[11px] font-semibold text-stone-500">（{convertedSalary(job)}）</span>}
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
