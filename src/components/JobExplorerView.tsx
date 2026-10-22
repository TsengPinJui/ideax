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
  Paperclip,
} from 'lucide-react';
import { SousouFlyer } from './sousou/SousouFlyer';
import { CityMultiSelect, CategoryMultiSelect } from './jobExplorer/CityMultiSelect';
import { ChipMultiSelect } from './jobExplorer/ChipMultiSelect';
import { JobsInstallPrompt } from './jobExplorer/JobsInstallPrompt';
import { InlineConditionTag } from './jobExplorer/InlineConditionTag';
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

interface JobSearchSourceLink {
  id: string;
  site: string;
  url: string;
  actionLabel: string;
  destination: 'platform' | 'web-search';
}

const EXPLORER_QUICK_PRESETS = [
  {
    badge: '💬 口語情境',
    label: '台南餐飲門市 (32K+ / 排班環境)',
    query: '我想在台南市東區找連鎖餐飲或零售門市正職，月薪希望 32,000 元以上，在意工作環境與排班制度。',
  },
  {
    badge: '🌐 跨平台來源',
    label: '跨平台求職 (Yes123 / Cake / 1111 / 104)',
    query: '請找台北市或新北市的數位行銷企劃或前端工程師，全職，優先看 Yes123、Cake、Yourator、1111、104。',
  },
  {
    badge: '🎯 嚴格門檻',
    label: '雙北雲端架構師（90K+／5年以上）',
    query: '請找台北市或新北市的資深雲端架構師或 DevOps 工程師，月薪 90,000 元以上、5 年以上經驗，熟悉 Kubernetes 與 AWS。',
  },
  {
    badge: '🌱 新鮮人友善',
    label: '新鮮人友善 (無經驗可 / 不拘學歷 / 今日刊登)',
    query: '全台灣皆可，找適合社會新鮮人的行政助理或客服工作，無經驗可、學歷不拘，月薪 30,000 元以上。',
  },
  {
    badge: '🌫️ 模糊探索',
    label: '內向文職探索 (不面對客人 / 安靜資料整理)',
    query: '我個性比較內向，不想面對陌生客人或做電話業務，想在台中找安靜整理資料、後台打字或系統處理的正職工作。',
  },
  {
    badge: '💰 薪資非面議',
    label: '桃竹倉儲主管 (45K~65K / 拒絕純面議)',
    query: '找桃園市或新竹縣的倉儲物流主管或供應鏈管理工作，月薪 45,000 至 65,000 元，希望薪資有明確標示。',
  },
  {
    badge: '⏰ 彈性工讀',
    label: '台南門市彈性兼職 (時薪200+ / 學生或二度就業)',
    query: '找台南市東區或中西區餐飲或超商門市兼職／工讀，時薪 200 元以上、排班彈性，優先看 Yes123 或 518。',
  },
  {
    badge: '📍 籠統位置排查',
    label: '附近工作 (籠統位置向用戶確認)',
    query: '我想找家附近的工作，請先問我希望的縣市或行政區。',
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

/** 匯職缺會提供搜尋入口的平台（說明面板用；和後端搜尋分組一致） */
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

export type AiIntakeStatus = 'idle' | 'received' | 'understanding' | 'typing' | 'reading';

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
  /** 使用者這次講的是另一個不同的職務：提醒先清除對話 */
  roleSwitched?: boolean;
  /** 觸發這則回覆的使用者原話（清除對話後可以直接帶回輸入框） */
  sourceText?: string;
  /** 搜尋完成：開頭顯示「以下為您精選 N 個職缺」，N 跟下方實際列出的筆數一致（篩選改了也會跟著變） */
  showPicked?: boolean;
}

type SearchActionKey = 'wait' | 'bulb' | 'retry' | 'dismiss';
const SEARCH_ACTION_LABEL: Record<SearchActionKey, string> = {
  wait: '繼續等待',
  bulb: '💡 派小燈泡前去看看',
  retry: '重新搜尋',
  dismiss: '先不用',
};
/**
 * 從「工作型態：正職、兼職、地區：台北市、新北市、職務：服務生」這種條件文字裡，
 * 取出某個欄位的值：一直取到下一個「xx：」之前（所以「台北市、新北市」兩個都會留下）
 */
function fieldValue(text: string, label: RegExp): string {
  const m = text.match(new RegExp(`(?:${label.source})(?:（複選）)?[：:]\\s*([^\\n•]*)`));
  if (!m) return '';
  return m[1].split(/[、,，;；]?\s*(?=[^、,，;；：:\s]{1,6}[：:])/)[0].replace(/[、,，;；\s]+$/, '').trim();
}

/** 工作型態文字 → 正職／兼職／實習（可以好幾個；「皆可」「都可以」＝正職＋兼職） */
export function parseJobTypes(v: string): Array<'正職' | '兼職' | '實習'> {
  const s = String(v || '');
  const out = new Set<'正職' | '兼職' | '實習'>();
  if (/皆可|都可以|都行|不拘|都好/.test(s) && !/實習/.test(s)) { out.add('正職'); out.add('兼職'); }
  if (/正職|全職|約聘|派遣/.test(s)) out.add('正職');
  if (/兼職|工讀|打工|計時/.test(s)) out.add('兼職');
  if (/實習/.test(s)) out.add('實習');
  return (['正職', '兼職', '實習'] as const).filter((x) => out.has(x));
}

/** 職務 → 職務類別（AI 整理好職務後，自動勾好篩選面板的職務類別；可以好幾個） */
const ROLE_CATEGORY_RULES: Array<[RegExp, string]> = [
  [/服務生|服務員|外場|內場|餐飲|廚|吧台|咖啡|門市|店員|店長|收銀|零售|飲料|手搖|烘焙|麵包|洗碗|早餐店|超商|便利商店|餐廳/i, '門市／餐飲／零售'],
  [/軟體|程式|前端|後端|全端|工程師|開發|devops|qa|測試|資料科學|機器學習|ai\b|app/i, '軟體／AI工程'],
  [/產品經理|專案|pm\b|產品企劃|pmo/i, '產品／專案管理'],
  [/行銷|企劃|社群|小編|廣告|公關|品牌|文案|內容/i, '行銷／企劃／社群'],
  [/設計|ui|ux|美編|視覺|平面/i, '設計／UIUX'],
  [/業務|銷售|商務開發|bd\b|電銷|客戶經理/i, '業務／商務開發'],
  [/行政|助理|人資|hr\b|人事|會計|財務|出納|總務|秘書|櫃台|櫃檯/i, '行政／人資／財會'],
];
export function rolesToCategories(roles: string[]): string[] {
  const out: string[] = [];
  for (const r of roles) {
    for (const [re, c] of ROLE_CATEGORY_RULES) {
      if (re.test(r) && !out.includes(c)) out.push(c);
    }
  }
  return out;
}

/** 職務標籤的值拆成多個職務（「服務生、行政」→ ['服務生','行政']） */
export function splitRoles(v: string): string[] {
  return Array.from(new Set(String(v || '').split(/[、,，/／;；]|\s+或\s*|\s*和\s*/).map((s) => s.trim()).filter(Boolean)));
}

/** 最近一則有條件標籤的回覆裡，目前的職務（可能好幾個） */
function currentRolesFrom(msgs: Array<{ role: string; conditionTags?: ConditionTag[] }>): string[] {
  for (let i = msgs.length - 1; i >= 0; i--) {
    const tags = msgs[i].role === 'bot' ? msgs[i].conditionTags : undefined;
    if (tags && tags.length) {
      const r = tags.find((t) => t.type === 'role');
      return r ? splitRoles(r.value) : [];
    }
  }
  return [];
}

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
  // 可以有好幾個（「正職、兼職」「正職兼職都可以」）：只看「工作型態：」後面到下一個「xx：」之前的字
  const jtHead = fieldValue(text, /工作型態/) || String(intakeData?.jobType || '');
  const jobTypeList = parseJobTypes(jtHead);
  if (jobTypeList.length) {
    tags.push({
      id: `tag-jobType-${Date.now()}`,
      type: 'jobType',
      label: '工作型態',
      value: jobTypeList.join('、'),
    });
  }

  // 2. 職務
  let extractedRoles: string[] = [];
  if (Array.isArray(intakeData?.roles) && intakeData.roles.length > 0) {
    extractedRoles = intakeData.roles;
  } else {
    const roleV = fieldValue(text, /職務/);
    const roleMatch = roleV ? [null, roleV] : null;
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
    const compV = fieldValue(text, /目標公司|限定公司|指定公司/);
    const compMatch = compV ? [null, compV] : null;
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
  const locV = fieldValue(text, /地區/);
  const locMatch = locV ? [null, locV] : intakeData?.location ? [null, intakeData.location] : null;
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

  // 8. 其他面向（產業、班別工時、工作方式、福利、工作環境、技能證照、個人背景、其他偏好）
  if (Array.isArray(intakeData?.preferences)) {
    intakeData.preferences.forEach((p: any, idx: number) => {
      const value = String(p?.value || '').trim();
      const label = String(p?.label || '其他偏好').trim();
      if (!value || tags.some((t) => t.label === label && t.value === value)) return;
      tags.push({ id: `tag-pref-${p?.dimension || 'other'}-${Date.now()}-${idx}`, type: 'carePoint', label, value });
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

/** 「你可能也關注的職缺」分隔線：上面完全符合條件，下面是不完全符合、依符合程度排序的職缺 */
const PartialDivider: React.FC<{ variant: 'grid' | 'row'; fullCount: number }> = ({ variant, fullCount }) => (
  <div className={variant === 'grid' ? 'col-span-full pt-3 pb-1' : 'px-3.5 sm:px-5 py-3 bg-stone-50'} role="separator" aria-label="你可能也關注的職缺">
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-stone-300" />
      <span className="text-xs sm:text-sm font-black text-stone-700 shrink-0">你可能也關注的職缺</span>
      <span className="h-px flex-1 bg-stone-300" />
    </div>
    <p className="mt-1 text-center text-[11px] text-stone-500">
      {fullCount === 0 ? '目前沒有完全符合所有條件的職缺，' : ''}以下職缺不完全符合條件，依符合程度與你在意的項目排序
    </p>
  </div>
);

/** 卡片上的「不符：地區、薪資」 */
const MissedBadge: React.FC<{ missed: string[]; inCardHeader?: boolean }> = ({ missed, inCardHeader }) => (
  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0 ${inCardHeader ? 'mr-auto' : ''}`} title="這筆職缺沒有符合的條件">
    不符：{missed.join('、')}
  </span>
);

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
  // 地區可以多選：空陣列＝不限；selectedCity 是給搜尋條件文字用的合併字串
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const selectedCity = selectedCities.length ? selectedCities.join('、') : '全部';
  const [userBaseCity, setUserBaseCity] = useState('台北市');
  // 職務類別：可複選（空陣列＝不限）；送到後端與文字摘要時合併成「A、B」
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const selectedCategory = selectedCategories.length ? selectedCategories.join('、') : '全部';
  const [minSalaryFilter, setMinSalaryFilter] = useState<number>(0);
  // 篩選：正職／兼職、台灣／國外（含國家，預設不限、先不預設台灣）
  // 工作型態：可複選（空＝不限）。只選了兼職時，薪資門檻用時薪
  const [jobTypes, setJobTypes] = useState<Array<'正職' | '兼職' | '實習'>>([]);
  const jobTypeFilter = jobTypes.length ? jobTypes.join('、') : '全部';
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
  const isHourlyFilter = jobTypes.length === 1 && jobTypes[0] === '兼職';
  /** 篩選條件組成的搜尋說明（正職／兼職、範圍、時薪） */
  const filterBriefParts = (): string[] => {
    const parts: string[] = [];
    if (jobTypes.length) parts.push(`工作型態：${jobTypes.map((t) => (t === '兼職' ? '兼職工讀' : t)).join('、')}`);
    if (regionFilter !== '全部' && regionFilter !== '台灣') {
      const v = regionFilter === '國外' ? '工作範圍：國外' : '工作範圍：台灣與國外皆可';
      parts.push(countryFilter.length ? `${v}（${formatCountryScope(countryFilter, abroadCityFilter)}）` : v);
    } else if (regionFilter === '台灣') {
      parts.push('工作範圍：台灣');
    }
    if (regionFilter === '國外') { if (abroadSalaryFilter) parts.push(abroadSalaryFilter); }
    else if (isHourlyFilter && minSalaryFilter > 0) parts.push(`薪水：時薪 ${minSalaryFilter} 元以上`);
    if (maxExpFilter !== 'all') parts.push(maxExpFilter === 0 ? '經驗不拘' : `年資：${maxExpFilter} 年以下`);
    if (maxEduFilter !== 'all') {
      const educationLabel = maxEduFilter <= 2 ? '高中職以下' : maxEduFilter === 3 ? '專科以下' : maxEduFilter === 4 ? '大學以下' : '碩士以下';
      parts.push(`學歷：${educationLabel}`);
    }
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
  const [searchSourceLinks, setSearchSourceLinks] = useState<JobSearchSourceLink[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
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
  // ─── 保留這次的搜尋結果：離開匯職缺頁（換到網站其他頁、關閉、重新整理）5 分鐘內回來，結果和條件還在；
  //     超過 5 分鐘就一律重新設定條件。停在匯職缺頁上（包含點職缺連結到新分頁看）不會過期。 ───
  const PERSIST_KEY = 'ideax_job_explorer_session_v2';
  const PERSIST_TTL = 5 * 60 * 1000;
  /** 離開的時間：明確離開 > 最後一次切到背景（手機直接關掉 APP 時記不到離開） > 最後一次存檔 */
  const leftAtOf = (saved: any) => Number(saved?.leftAt || saved?.hiddenAt || saved?.at || 0);
  const restoredRef = useRef(false);
  const restoreScrollRef = useRef<number | null>(null);
  useEffect(() => {
    try {
      // 清除舊版保存的第三方職缺明細；新版本只保留來源搜尋入口。
      localStorage.removeItem('ideax_job_explorer_session_v1');
      const raw = localStorage.getItem(PERSIST_KEY);
      const saved = raw ? JSON.parse(raw) : null;
      if (saved && Date.now() - leftAtOf(saved) >= PERSIST_TTL) localStorage.removeItem(PERSIST_KEY);
      else if (saved && saved.schemaVersion === 2 && (saved.sources?.length || saved.messages?.length)) {
        // 上次還在搜尋中就離開了：結果保留，訊息改成可以重新搜尋
        const msgs: ChatMessage[] = (saved.messages || []).map((m: ChatMessage) =>
          m.id === saved.searchingMsgId
            ? { ...m, text: saved.sources?.length ? `上次的搜尋已整理 ${saved.sources.length} 個來源入口。` : '上次的搜尋中斷了，要再搜一次嗎？', searchActions: saved.searchingBrief ? ['retry'] : undefined, retryBrief: saved.searchingBrief || undefined }
            : { ...m, searchActions: m.searchActions?.filter((a) => a === 'retry') }
        );
        setMessages(msgs);
        if (Array.isArray(saved.sources)) setSearchSourceLinks(saved.sources);
        setHasSearched(Boolean(saved.hasSearched || saved.sources?.length));
        if (typeof saved.keyword === 'string') setKeyword(saved.keyword);
        if (Array.isArray(saved.selectedCities)) setSelectedCities(saved.selectedCities.filter((c: unknown) => typeof c === 'string'));
        else if (saved.selectedCity && saved.selectedCity !== '全部') setSelectedCities(String(saved.selectedCity).split('、').filter(Boolean));
        if (Array.isArray(saved.selectedCategories)) setSelectedCategories(saved.selectedCategories.filter((c: unknown) => typeof c === 'string'));
        else if (saved.selectedCategory && saved.selectedCategory !== '全部') setSelectedCategories(String(saved.selectedCategory).split('、').filter(Boolean));
        if (saved.sortBy) setSortBy(saved.sortBy);
        if (saved.sortOrder) setSortOrder(saved.sortOrder);
        if (Array.isArray(saved.userCarePoints)) setUserCarePoints(saved.userCarePoints);
        if (typeof saved.scrollY === 'number') restoreScrollRef.current = saved.scrollY;
        // 回到匯職缺頁了：離開時間歸零，之後停多久都不會過期
        saved.leftAt = null; saved.hiddenAt = null;
        localStorage.setItem(PERSIST_KEY, JSON.stringify(saved));
      }
    } catch {}
    restoredRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);

  // AI 對話處理狀態（已收到、理解中、打字中）
  const [aiStatus, setAiStatus] = useState<AiIntakeStatus>('idle');

  // 條件標籤編輯狀態（依標籤形式，可刪除、新增、編輯文字或數字與幣別）
  // 新增條件選單：記住是哪一則訊息打開的（不然每則訊息的選單會一起打開）
  const [addTagOpenFor, setAddTagOpenFor] = useState<string | null>(null);
  useEffect(() => {
    if (!addTagOpenFor) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement | null)?.closest?.('[data-add-tag-menu]')) setAddTagOpenFor(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [addTagOpenFor]);
  // 剛新增的標籤：一出現就直接在標籤上輸入
  const [newTagId, setNewTagId] = useState<string | null>(null);

  /** 清除對話：條件從頭開始（換找其他職務前要先清除） */
  const clearJobChat = () => {
    setMessages([]);
    setPendingConfirmedBrief('');
    setPendingFallbackBrief('');
    setSkippedDimensions([]);
    setAmbiguousClarification(null);
  };

  // 同步確定與整理後的條件標籤至篩選面板，搜尋過後仍可修改再次搜尋
  const syncConditionsToFilters = (tags: ConditionTag[]) => {
    for (const t of tags) {
      if (t.type === 'role' && t.value) {
        setKeyword(t.value);
        // 職務類別跟著職務自動勾（好幾個職務就勾好幾個類別）
        setSelectedCategories(rolesToCategories(splitRoles(t.value)));
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
        // 條件裡提到幾個縣市就選幾個（例如「台北市、新北市」；「台北」也算台北市；「北北基桃」展開成四個）
        const v = t.value
          .replace(/北北基桃/g, '台北市新北市基隆市桃園市').replace(/北北桃/g, '台北市新北市桃園市').replace(/北北基/g, '台北市新北市基隆市')
          .replace(/雙北/g, '台北市新北市').replace(/桃竹苗/g, '桃園市新竹市新竹縣苗栗縣').replace(/桃竹竹/g, '桃園市新竹市新竹縣')
          .replace(/中彰投/g, '台中市彰化縣南投縣').replace(/雲嘉南/g, '雲林縣嘉義市嘉義縣台南市').replace(/高屏/g, '高雄市屏東縣').replace(/花東/g, '花蓮縣台東縣');
        const matches = cityList.filter((c) => v.includes(c) || (c !== '遠端工作' && v.includes(c.replace(/[市縣]$/, ''))) || (c === '遠端工作' && /遠端|在家工作/.test(v)));
        if (matches.length) setSelectedCities(matches);
      } else if (t.type === 'jobType' && t.value) {
        const list = parseJobTypes(t.value);
        if (list.length) {
          // 只選兼職（時薪）和其他（月薪）切換時，薪資門檻的單位不同：清掉
          const hourlyNow = list.length === 1 && list[0] === '兼職';
          if (hourlyNow !== isHourlyFilter) setMinSalaryFilter(0);
          setJobTypes(list);
        }
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
    setAddTagOpenFor(null);
  };

  const chatEndRef = useRef<HTMLDivElement>(null);

  // 結果有變就存一份（稍等一下再存，避免每來一筆就寫一次）
  useEffect(() => {
    if (!restoredRef.current) return;
    const t = window.setTimeout(() => {
      try {
        if (!messages.length && !searchSourceLinks.length) { localStorage.removeItem(PERSIST_KEY); return; }
        const sess = searchSessionRef.current;
        localStorage.setItem(PERSIST_KEY, JSON.stringify({
          schemaVersion: 2,
          at: Date.now(),
          leftAt: null,
          hiddenAt: document.visibilityState === 'hidden' ? Date.now() : null,
          messages: messages.slice(-40),
          sources: searchSourceLinks.slice(0, 24),
          hasSearched,
          keyword, selectedCity, selectedCities, selectedCategory, selectedCategories, sortBy, sortOrder, userCarePoints,
          searchingMsgId: isSearching && sess ? sess.botMsgId : null,
          searchingBrief: isSearching && sess ? sess.brief : null,
          scrollY: window.scrollY,
        }));
      } catch {}
    }, 500);
    return () => window.clearTimeout(t);
  }, [messages, searchSourceLinks, hasSearched, keyword, selectedCity, selectedCategory, sortBy, sortOrder, userCarePoints, isSearching]); // eslint-disable-line react-hooks/exhaustive-deps

  // 記下離開時間與捲動位置：切到背景只記「最後在背景的時間」（回來就清掉），真正離開匯職缺頁或關閉才算離開
  useEffect(() => {
    const patch = (fn: (saved: any) => void) => {
      try {
        const raw = localStorage.getItem(PERSIST_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        fn(saved);
        localStorage.setItem(PERSIST_KEY, JSON.stringify(saved));
      } catch {}
    };
    const markLeft = () => patch((saved) => { saved.scrollY = window.scrollY; saved.leftAt = Date.now(); });
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') patch((saved) => { saved.scrollY = window.scrollY; saved.hiddenAt = Date.now(); });
      else patch((saved) => { saved.hiddenAt = null; });
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', markLeft);
    return () => {
      // 換到網站的其他頁面也算離開
      markLeft();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', markLeft);
    };
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

  // 確認需求後只整理來源網站搜尋入口；IdeaX 不擷取或保存職缺內容。
  const handleForwardToExplorerAgent = async (
    confirmedBriefToUse?: string,
    msgIdToMark?: string,
    useGeminiFallback = false
  ) => {
    void useGeminiFallback;
    const rawBrief = (
      confirmedBriefToUse || pendingFallbackBrief || pendingConfirmedBrief || keyword.trim() ||
      `${selectedCity !== '全部' ? selectedCity : ''}${selectedCategory !== '全部' ? selectedCategory : ''}職缺`
    ).trim();
    if (!rawBrief) return;
    const extra = filterBriefParts().filter((part) => !rawBrief.includes(part.split('：')[0]));
    let brief = [rawBrief, ...extra].join('、');
    const mentionsAbroad = /國外|海外|出國|外派|日本|東京|大阪|新加坡|香港|澳門|中國大陸|美國|紐約|矽谷|舊金山|西雅圖|加拿大|溫哥華|多倫多|英國|倫敦|德國|柏林|法國|澳洲|雪梨|墨爾本|紐西蘭|韓國|首爾|馬來西亞|吉隆坡|越南|泰國|曼谷|菲律賓|印尼|荷蘭|歐洲|北美|東南亞|全球遠端/i.test(brief);
    const mentionsTaiwan = /台灣|臺灣|全台|台北|新北|基隆|桃園|新竹|苗栗|台中|彰化|南投|雲林|嘉義|台南|高雄|屏東|宜蘭|花蓮|台東|澎湖|金門|連江/i.test(brief);
    if (!mentionsAbroad && !mentionsTaiwan && regionFilter !== '國外' && regionFilter !== '台灣與國外') brief = `${brief}（台灣）`;
    syncConditionsToFilters(parseConditionTags(brief));
    if (msgIdToMark) setMessages((prev) => prev.map((m) => (m.id === msgIdToMark ? { ...m, confirmed: true, activeConditionKey: null } : m)));

    setIsSearching(true);
    setHasSearched(true);
    setShowSavedOnly(false);
    setSearchSourceLinks([]);
    setJobs([]);
    setReadyToSort(false);
    setArrivalOrder(false);
    setSearchProgressText('正在整理來源網站搜尋入口…');
    setStreamingBatchCount(0);
    accompanyDuringSearch('正在依照你的條件整理求職網站入口。');

    const botMsgId = `exp-links-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: botMsgId,
      role: 'bot',
      text: '已確認搜尋條件，正在整理求職網站搜尋入口…',
      confirmed: true,
    }]);
    setPendingConfirmedBrief('');
    setPendingFallbackBrief('');
    startSearchSession({
      brief,
      botMsgId,
      filters: {
        keyword: [keyword.trim(), companyFilter.trim()].filter(Boolean).join(' '),
        city: selectedCities.length ? selectedCities.join(' ') : selectedCity,
        category: selectedCategories.length ? selectedCategories.join(' ') : selectedCategory,
        jobType: jobTypes.join(' '),
        minSalary: isHourlyFilter || regionFilter === '國外' ? 0 : minSalaryFilter,
        region: regionFilter,
        countries: countryFilter,
        sites: isSiteFiltered ? chosenSites : [],
      },
    });
  };

  type SearchSession = {
    id: number;
    brief: string;
    botMsgId: string;
    filters: Record<string, unknown>;
    controller: AbortController;
  };
  const searchSessionRef = useRef<SearchSession | null>(null);
  const [arrivalOrder, setArrivalOrder] = useState(false);
  const userBrowsingRef = useRef(false);
  const [readyToSort, setReadyToSort] = useState(false);
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
    if (sess) sess.controller.abort();
  };
  useEffect(() => () => stopSearchSession(searchSessionRef.current), []);

  const startSearchSession = (opts: { brief: string; botMsgId: string; filters: Record<string, unknown> }) => {
    stopSearchSession(searchSessionRef.current);
    const sess: SearchSession = { id: Date.now(), brief: opts.brief, botMsgId: opts.botMsgId, filters: opts.filters, controller: new AbortController() };
    searchSessionRef.current = sess;
    userBrowsingRef.current = false;
    void (async () => {
      try {
        const response = await fetch('/api/job-explorer/search', {
          method: 'POST',
          signal: sess.controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: sess.brief, filters: sess.filters }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.success) throw new Error(data?.error || '整理搜尋入口失敗');
        if (searchSessionRef.current !== sess) return;
        const sources = Array.isArray(data.sources) ? data.sources.filter((source: any) => source && typeof source.url === 'string' && /^https:\/\//.test(source.url)) : [];
        setSearchSourceLinks(sources);
        setSearchProgressText(sources.length ? `已整理 ${sources.length} 個來源網站搜尋入口。` : '沒有可用的來源網站入口，請調整條件後再試。');
        updateBotMsg(sess, {
          text: sources.length
            ? `已整理 ${sources.length} 個求職網站搜尋入口。點選後會前往來源網站查看職缺內容、薪資與最新招募狀態。IdeaX 不會匯入或保存職缺明細。`
            : '這次沒有可用的來源網站入口，請調整搜尋條件或選擇其他求職網站再試。',
          searchActions: undefined,
          showPicked: false,
        });
      } catch (error: any) {
        if (error?.name === 'AbortError' || searchSessionRef.current !== sess) return;
        console.warn('[Job Search Links]', error);
        setSearchSourceLinks([]);
        setSearchProgressText('');
        updateBotMsg(sess, { text: error?.message || '整理來源網站搜尋入口時發生錯誤，請稍後再試。', searchActions: undefined, showPicked: false });
      } finally {
        if (searchSessionRef.current === sess) {
          setIsSearching(false);
        }
      }
    })();
  };

  const handleSearchAction = (msgId: string, action: SearchActionKey) => {
    const msg = messages.find((item) => item.id === msgId);
    setMessages((prev) => prev.map((item) => (item.id === msgId ? { ...item, searchActions: undefined } : item)));
    if (action === 'retry' && msg?.retryBrief) void handleForwardToExplorerAgent(msg.retryBrief);
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
          // 目前條件裡的職務（使用者說「也想看…」時，後端會和新職務合併成複選）
          previousRoles: currentRolesFrom(messages),
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
          roleSwitched: Boolean(data?.roleSwitched),
          sourceText: queryText,
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

  // 上傳履歷／求職需求（PDF、Word、常見圖檔）：檔案本體只送本次記憶體分析，不寫入 IdeaX 資料庫。
  const docInputRef = useRef<HTMLInputElement>(null);
  const [isReadingDoc, setIsReadingDoc] = useState(false);
  const handleUploadDoc = async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const isImage = /^(png|jpe?g|webp)$/.test(extension);
    const uploadLabel = isImage ? '🖼️ 上傳圖片' : '📎 上傳求職檔案';
    const pushBot = (text: string) =>
      setMessages((prev) => [...prev, { id: `doc-bot-${Date.now()}`, role: 'bot', text }]);
    setIsChatCollapsed(false);
    setMessages((prev) => [...prev, { id: `doc-user-${Date.now()}`, role: 'user', text: uploadLabel }]);
    if (!/\.(pdf|docx?|png|jpe?g|webp)$/i.test(file.name)) {
      pushBot('目前支援 PDF、Word（.docx）、PNG、JPG／JPEG、WebP，請換個檔案再試一次。');
      return;
    }
    if (/\.doc$/i.test(file.name)) {
      pushBot('舊版 Word（.doc）無法讀取，請在 Word 裡「另存新檔」成 .docx 或 PDF 再上傳。');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      pushBot('檔案太大了（上限 4MB），可以把圖片拿掉或另存成較小的 PDF 再上傳。');
      return;
    }
    setIsReadingDoc(true);
    setAiStatus('reading');
    try {
      const res = await fetch('/api/job-explorer/parse-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent(`upload.${extension}`) },
        body: file,
      });
      const data = await res.json().catch(() => null);
      if (res.status === 429) {
        pushBot('上傳分析太頻繁了，請過幾分鐘再試，或直接用文字描述想找的工作。');
        return;
      }
      if (!data?.ok || !data.brief) {
        pushBot(data?.error || '這次沒能讀懂檔案，請稍後再試，或直接用文字描述想找的工作。');
        return;
      }
      const lines = [
        `已讀完這份${isImage ? '圖片' : '檔案'}${data.docType && data.docType !== '其他' ? `（${data.docType}）` : ''}${data.summary ? `：${data.summary}` : ''}`,
        data.roles?.length ? `・推薦職務：${data.roles.join('、')}` : '',
        data.regions?.length ? `・希望地區：${data.regions.join('、')}` : '',
        data.education ? `・學歷：${data.education}` : '',
        data.experienceYears != null ? `・相關經驗：約 ${data.experienceYears} 年` : '',
        data.skills?.length ? `・技能：${data.skills.join('、')}` : '',
        '接著幫您整理成搜尋條件，之後都可以再調整。',
      ].filter(Boolean);
      pushBot(lines.join('\n'));
      setAiStatus('idle');
      setIsReadingDoc(false);
      await handleSendInput(data.brief);
    } catch {
      pushBot('上傳時連線中斷了，請再試一次。');
    } finally {
      setIsReadingDoc(false);
      setAiStatus((s) => (s === 'reading' ? 'idle' : s));
      if (docInputRef.current) docInputRef.current.value = '';
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
    }
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (keyword.trim()) count++;
    if (companyFilter.trim()) count++;
    if (selectedCities.length) count++;
    if (selectedCategories.length) count++;
    if (minSalaryFilter > 0 || abroadSalaryFilter) count++;
    if (jobTypes.length) count++;
    if (regionFilter !== '全部') count++;
    if (isSiteFiltered) count++;
    if (maxExpFilter !== 'all') count++;
    if (maxEduFilter !== 'all') count++;
    if (userCarePoints.length > 0) count++;
    return count;
  }, [keyword, companyFilter, selectedCity, selectedCategory, minSalaryFilter, maxExpFilter, maxEduFilter, userCarePoints, jobTypeFilter, regionFilter, isSiteFiltered, abroadSalaryFilter]);

  // 合併目前列表（或僅顯示收藏職缺）並進行篩選與排序
  // 不嚴格篩選：完全符合條件的排前面，不完全符合的列在「你可能也關注的職缺」下面
  const filterStatsRef = useRef({ total: 0, full: 0 });

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

    // 職務關鍵字拆成多個詞（「服務生（外場）、行政」→ 服務生、外場、行政），符合任何一個就算
    const kwTokens = Array.from(new Set(
      keyword.trim().toLowerCase()
        .split(/[、,，/／;；()（）\[\]「」\s]+|或|和/)
        .map((t) => t.replace(/^(職務|工作型態|地區)[：:]/, '').trim())
        .filter((t) => t.length >= 2 && !/^(兼職|正職|工讀|打工|實習|全職)$/.test(t)),
    ));
    // 薪資換算成「月」比較：時薪 ×176、日薪 ×22、年薪 ÷12（兼職的時薪職缺不會被月薪條件誤刪）
    const toMonthly = (amount: number, text: string) => {
      const t = text || '';
      if (/時薪|\/\s*h(ou)?r|per hour|hourly/i.test(t) || (amount > 0 && amount < 1000)) return amount * 176;
      if (/日薪|\/\s*day|per day|daily/i.test(t) || (amount >= 1000 && amount < 5000)) return amount * 22;
      if (/年薪|\/\s*y(ea)?r|per year|annual/i.test(t) || amount >= 300000) return amount / 12;
      return amount;
    };
    // 篩選條件的薪水：兼職時填的是時薪（小於 1000），其他是月薪
    const minMonthly = minSalaryFilter > 0 ? (minSalaryFilter < 1000 ? minSalaryFilter * 176 : minSalaryFilter) : 0;

    // 每個條件各自檢查；沒全部符合也不會被刪掉，只是排到「你可能也關注的職缺」
    // 權重＝條件重要性，使用者在意的項目（優先顯示的順序）再加重
    const careW = (k: CarePointKey) => { const i = userCarePoints.indexOf(k); return i < 0 ? 0 : Math.max(1, 3 - i); };
    const scored = withDynamicDistance.map((job) => {
      const checks: Array<{ name: string; ok: boolean; w: number }> = [];
      if (kwTokens.length) {
        const haystack = `${job.title} ${job.company} ${job.location} ${job.industry} ${job.category || ''} ${job.workEnvironment} ${job.benefits} ${job.description}`.toLowerCase();
        // 每個詞也試前兩個字（「服務生」對得到「外場服務人員」）
        const ok = kwTokens.some((t) => haystack.includes(t) || (t.length >= 3 && /^[\u4e00-\u9fff]{2}/.test(t) && haystack.includes(t.slice(0, 2))));
        checks.push({ name: '職務', ok, w: 4 });
      }
      if (selectedCities.length) {
        const normLoc = `${job.location || ''} ${job.city || ''}`.replace(/臺/g, '台');
        const isRemote = /遠端|WFH|居家/i.test(`${job.workEnvironment} ${job.title} ${job.description}`);
        const anywhere = /全台|全省|不限|多個地點|多地|各地|各縣市|台灣/.test(normLoc) && !/[市縣]/.test(normLoc.replace(/台灣/g, ''));
        const ok = anywhere || !normLoc.trim() || selectedCities.some((c) => {
          if (c === '遠端工作') return isRemote;
          const norm = c.replace(/臺/g, '台');
          return normLoc.includes(norm) || normLoc.includes(norm.slice(0, 2));
        });
        checks.push({ name: '地區', ok, w: 3 + careW('distance') });
      }
      if (selectedCategories.length && job.category) {
        const titleHitsRole = kwTokens.some((t) => String(job.title || '').toLowerCase().includes(t));
        const hay = `${job.category} ${job.industry || ''} ${job.title || ''}`;
        const ok = titleHitsRole || selectedCategories.some((c) => job.category === c || c.split(/[／/]/).some((w) => w && hay.includes(w.replace(/工程$/, ''))));
        checks.push({ name: '職務類別', ok, w: 1 + careW('industry') });
      }
      if (minMonthly > 0 && job.salaryMax > 0) {
        const jobCur = detectCurrency(job.salaryText, job.location || '');
        const maxInTwd = jobCur === 'TWD' ? job.salaryMax : convert(job.salaryMax, jobCur, 'TWD', fxRates);
        checks.push({ name: '薪資', ok: toMonthly(maxInTwd, job.salaryText) >= minMonthly * 0.95, w: 2 + careW('salary') });
      }
      if (maxExpFilter !== 'all') checks.push({ name: '經歷', ok: !(job.experienceYears > maxExpFilter), w: 1 });
      if (maxEduFilter !== 'all') checks.push({ name: '學歷', ok: !(job.educationLevel > maxEduFilter), w: 1 });
      const total = checks.reduce((n, c) => n + c.w, 0);
      const got = checks.reduce((n, c) => n + (c.ok ? c.w : 0), 0);
      return { ...job, fullMatch: checks.every((c) => c.ok), relevance: total ? got / total : 1, missed: checks.filter((c) => !c.ok).map((c) => c.name) };
    });
    let filtered = scored;
    filterStatsRef.current = { total: scored.length, full: scored.filter((j) => j.fullMatch).length };

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
    const full = filtered.filter((j) => j.fullMatch);
    const partial = filtered.filter((j) => !j.fullMatch);
    // 搜尋中照抵達順序（兩組各自照順序）；不完全符合的一律先比「符合多少條件」
    if (arrivalOrder && !showSavedOnly) return [...full, ...[...partial].sort((a, b) => b.relevance - a.relevance)];
    const dir = sortOrder === 'desc' ? -1 : 1;
    const cmp = (a: typeof filtered[number], b: typeof filtered[number]) => {
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
    };
    return [...[...full].sort(cmp), ...[...partial].sort((a, b) => (b.relevance - a.relevance) || cmp(a, b))];
  }, [
    jobs,
    savedJobsMap,
    showSavedOnly,
    userBaseCity,
    userCarePoints,
    selectedCities,
    selectedCategory,
    minSalaryFilter,
    maxExpFilter,
    maxEduFilter,
    keyword,
    sortBy,
    sortOrder,
    fxRates,
    arrivalOrder, selectedCategories]);

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
    setSelectedCities([]);
    setSelectedCategories([]);
    setMinSalaryFilter(0);
    setJobTypes([]);
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
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSendInput();
              }}
              className="w-full sm:w-auto sm:flex-1 flex items-center gap-2 min-w-0"
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

              <input
                ref={docInputRef}
                type="file"
                accept=".pdf,.docx,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleUploadDoc(f);
                }}
              />
              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                disabled={isSearching || isRegulating || isReadingDoc}
                title="上傳履歷或求職需求（PDF、Word、PNG、JPG、WebP），AI 幫你整理成搜尋條件；檔案不存入資料庫"
                aria-label="上傳履歷、求職需求檔案或圖片"
                className="p-2 rounded-xl bg-white hover:bg-blue-50 disabled:opacity-40 text-[#1e3a8a] border border-stone-200 shrink-0 transition-colors cursor-pointer"
              >
                {isReadingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
              </button>

              <button
                type="submit"
                disabled={isSearching || isRegulating || isReadingDoc || (!chatInput.trim() && !pendingConfirmedBrief)}
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

            {/* 工具按鈕：手機版放第二行靠右，不跟輸入框搶寬度 */}
            <div className="w-full sm:w-auto flex items-center justify-end gap-2 shrink-0">
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
          </div>

          <p className="px-1 text-[10px] sm:text-[11px] text-stone-500">
            上傳支援 PDF、DOCX、PNG、JPG／JPEG、WebP（4MB 內）；檔案會送至 Gemini 整理條件，不寫入 IdeaX 資料庫。
          </p>

          {isHelpOpen && (
            <div className="pt-2.5 border-t border-stone-100 text-xs text-stone-700 leading-relaxed space-y-2.5">
              <p>
                <span className="font-black text-[#1e3a8a]">匯職缺</span>：直接輸入想找的職位、地點、薪水，已經講清楚的條件不會再問；沒講的才會請你補充。確認後會提供各求職網站的搜尋入口，由你在來源網站查看職缺。
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
                IdeaX 不擷取或保存第三方職缺明細。上傳 PDF、DOCX、PNG、JPG／JPEG 或 WebP（單檔 4MB 內）後，檔案會送至 Gemini 供本次條件整理，不寫入 IdeaX 資料庫。
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

                <ChipMultiSelect
                  prefix="工作型態"
                  groups={[{ items: ['正職', '兼職', '實習'] }]}
                  value={jobTypes}
                  onChange={(next) => {
                    const list = (['正職', '兼職', '實習'] as const).filter((x) => next.includes(x));
                    // 正職用月薪、兼職用時薪：切換時清掉薪資門檻
                    if ((list.length === 1 && list[0] === '兼職') !== isHourlyFilter) setMinSalaryFilter(0);
                    setJobTypes(list);
                  }}
                />

                <select
                  value={regionFilter}
                  onChange={(e) => {
                    const v = e.target.value as typeof regionFilter;
                    // 只找國外：薪資改用當地幣別，台幣門檻清掉；回到台灣則清掉國外薪資
                    if (v === '國外') setMinSalaryFilter(0); else setAbroadSalaryFilter('');
                    setRegionFilter(v);
                    if (v === '台灣' || v === '全部') setCountryFilter([]);
                    if (v === '國外') setSelectedCities([]);
                  }}
                  className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-800 bg-stone-50/70 focus:bg-white outline-none cursor-pointer"
                >
                  <option value="全部">範圍：不限（預設）</option>
                  <option value="台灣">台灣</option>
                  <option value="國外">國外</option>
                  <option value="台灣與國外">台灣＋國外</option>
                </select>

                <CityMultiSelect value={selectedCities} onChange={setSelectedCities} disabled={regionFilter === '國外'} />

                <CategoryMultiSelect value={selectedCategories} onChange={setSelectedCategories} />

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

          {/* 3. 整理來源搜尋入口中 */}
          {isSearching && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#1e3a8a] text-white text-xs flex items-center justify-between gap-3 shadow-sm border border-blue-400/40 animate-pulse">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                <span className="font-bold">{searchProgressText || '正在整理來源網站搜尋入口…'}</span>
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
                                  <div className="relative inline-block" data-add-tag-menu>
                                    <button
                                      type="button"
                                      onClick={() => setAddTagOpenFor((v) => (v === m.id ? null : m.id))}
                                      aria-expanded={addTagOpenFor === m.id}
                                      className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg border border-dashed border-stone-300 text-stone-500 hover:border-blue-400 hover:text-[#1e3a8a] hover:bg-blue-50/60 text-xs font-bold transition-all cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                      <span>新增條件</span>
                                    </button>

                                    {addTagOpenFor === m.id && (
                                      <div className="fixed inset-x-3 bottom-24 z-[70] sm:absolute sm:inset-auto sm:left-0 sm:top-full sm:mt-1.5 sm:z-30 sm:w-56 rounded-2xl sm:rounded-xl bg-white border border-stone-200 shadow-2xl sm:shadow-xl p-2 sm:p-1.5 space-y-0.5 text-xs">
                                        <div className="px-2 py-1 flex items-center justify-between">
                                          <span className="text-[11px] sm:text-[10px] font-black text-stone-500 sm:text-stone-400">新增哪一種條件？</span>
                                          <button type="button" onClick={() => setAddTagOpenFor(null)} aria-label="關閉" className="sm:hidden p-1 rounded-md text-stone-400 hover:text-stone-700 cursor-pointer">
                                            <X className="w-4 h-4" />
                                          </button>
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
                                            className="w-full text-left px-3 sm:px-2.5 py-2.5 sm:py-1.5 rounded-lg hover:bg-blue-50 font-bold text-sm sm:text-xs text-stone-700 transition-colors flex items-center justify-between cursor-pointer"
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
                              <p className="whitespace-pre-wrap font-medium">
                                {m.showPicked ? `以下為您精選 ${filteredAndSortedJobs.length} 個職缺${m.text ? `，${m.text}` : '。'}` : m.text}
                              </p>
                            )}

                            {/* 換了不同職務：可以兩個一起搜（職務複選），或清除對話只搜新的 */}
                            {m.role === 'bot' && m.roleSwitched && (() => {
                              const idx = messages.findIndex((x) => x.id === m.id);
                              const prevRoles = currentRolesFrom(messages.slice(0, Math.max(0, idx)));
                              const roleTag = (m.conditionTags || []).find((t) => t.type === 'role');
                              const merged = Array.from(new Set([...prevRoles, ...splitRoles(roleTag?.value || '')]));
                              const canMerge = Boolean(roleTag) && prevRoles.length > 0 && merged.length > splitRoles(roleTag?.value || '').length;
                              return (
                                <div className="mt-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-900 font-medium leading-relaxed">
                                  <div>💡 你換了一個不同的職務。職務可以複選：要和之前的職務一起搜，還是清除對話只搜新的？</div>
                                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {canMerge && roleTag && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleUpdateConditionTag(m.id, { ...roleTag, value: merged.join('、') });
                                          setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, roleSwitched: false } : x)));
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-[11px] font-black cursor-pointer"
                                      >
                                        一起搜：{merged.join('、')}
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        clearJobChat();
                                        if (m.sourceText) setChatInput(m.sourceText);
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-[11px] font-black cursor-pointer"
                                    >
                                      清除對話，只搜新的職務
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}

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
                          {aiStatus === 'reading' && (
                            <>
                              <Sparkles className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                              <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                                <span>AI 正在讀取檔案…</span>
                                <span className="text-[11px] text-indigo-600 font-normal">（約 10–30 秒，檔案只用來整理條件、不會儲存）</span>
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
                  <div className="flex items-center justify-between gap-3 px-1">
                    <span className="text-[11px] text-stone-500 leading-snug">💡 職務可以複選：說「也想看行政」就會一起搜；要整個換掉請先「清除對話」</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={clearJobChat}
                        className="text-[11px] font-bold text-amber-700 hover:text-amber-900 underline underline-offset-2 cursor-pointer"
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

        {/* 找到職缺後：提示把匯職缺加到主畫面／安裝（瀏覽器支援時直接出現「安裝」鍵） */}
        {jobs.length > 0 && <JobsInstallPrompt />}

        {/* 排序列 ＆ 大卡片／條列式／小卡片切換（手機橫向滑動不擁擠） */}
        {(searchSourceLinks.length === 0 || showSavedOnly) && (
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
                {filterStatsRef.current.full < filterStatsRef.current.total ? `（完全符合 ${filterStatsRef.current.full} 筆）` : ''}
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
        )}

        {/* 搜尋入口整理中 */}
        {isSearching && filteredAndSortedJobs.length > 0 && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-[#1e3a8a] to-indigo-900 text-white text-xs flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-300 shrink-0" />
              <span className="font-bold">
                {searchProgressText || '正在整理來源網站搜尋入口…'}
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

        {/* 使用者自行收藏的舊職缺提醒 */}
        {filteredAndSortedJobs.length > 0 && !showSavedOnly && (
          <div role="note" className="flex items-start gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 px-3.5 py-3">
            <span className="shrink-0 w-7 h-7 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center">
              <Info className="w-4 h-4 stroke-[2.5]" />
            </span>
            <p className="text-xs sm:text-sm leading-relaxed text-amber-950">
              <span className="font-medium">此處保留的是您先前收藏的職缺；請前往來源網站確認內容及招募狀態。</span>
            </p>
          </div>
        )}

        {/* 搜尋結果只提供來源網站入口，不匯入職缺明細 */}
        {searchSourceLinks.length > 0 && !showSavedOnly ? (
          <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 space-y-4 shadow-2xs">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#1e3a8a]">求職網站搜尋入口</h2>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">選擇一個網站，在來源網站查看最新職缺、薪資、條件與招募狀態。</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {searchSourceLinks.map((source) => (
                <a
                  key={source.id}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-3 rounded-xl border border-stone-200 px-3.5 py-3 hover:border-[#1e3a8a]/40 hover:bg-blue-50/50 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-stone-800 truncate">{source.site}</span>
                    <span className="block mt-0.5 text-[11px] text-stone-500">{source.actionLabel}</span>
                  </span>
                  <ExternalLink className="w-4 h-4 shrink-0 text-[#1e3a8a] group-hover:translate-x-0.5 transition-transform" />
                </a>
              ))}
            </div>
            <p className="text-[11px] text-stone-500 border-t border-stone-100 pt-3">IdeaX 只整理搜尋連結，不擷取、不暫存或保存第三方職缺明細；職缺資訊以來源網站為準。</p>
          </section>
        ) : isSearching && filteredAndSortedJobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200/90 py-16 text-center space-y-2.5">
            <Loader2 className="w-6 h-6 text-[#1e3a8a] animate-spin mx-auto" />
            <p className="text-xs sm:text-sm font-bold text-[#1e3a8a]">
              {searchProgressText || '【IdeaX創點子】正在整理來源網站搜尋入口…'}
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
            {filteredAndSortedJobs.map((job, idx) => {
              const isSaved = Boolean(savedJobsMap[job.id]);
              const extraText = getExtraText(job);

              return (
                <React.Fragment key={job.id}>
                {idx === filterStatsRef.current.full && idx < filteredAndSortedJobs.length && !showSavedOnly && <PartialDivider variant="grid" fullCount={filterStatsRef.current.full} />}
                <a
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
                      {!job.fullMatch && job.missed.length > 0 && <MissedBadge missed={job.missed}  inCardHeader />}
                      {job.urlKind === 'search' ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-0.5" title="找不到這筆職缺的原始頁面，點擊會開啟搜尋結果">
                          搜尋職缺
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                          需確認招募狀態
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
                </React.Fragment>
              );
            })}
          </div>
        ) : viewMode === 'large_card' ? (
          /* 大卡片（手機預設，無圖片但顯示完整資訊） */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {filteredAndSortedJobs.map((job, idx) => {
              const isSaved = Boolean(savedJobsMap[job.id]);

              return (
                <React.Fragment key={job.id}>
                {idx === filterStatsRef.current.full && idx < filteredAndSortedJobs.length && !showSavedOnly && <PartialDivider variant="grid" fullCount={filterStatsRef.current.full} />}
                <a
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
                      {!job.fullMatch && job.missed.length > 0 && <MissedBadge missed={job.missed}  inCardHeader />}
                      {job.urlKind === 'search' ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800" title="找不到這筆職缺的原始頁面，點擊會開啟搜尋結果">
                          搜尋職缺
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          需確認招募狀態
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
                </React.Fragment>
              );
            })}
          </div>
        ) : (
          /* 條列式 */
          <div className="bg-white rounded-2xl border border-stone-200/90 divide-y divide-stone-200/80 overflow-hidden shadow-2xs">
            {filteredAndSortedJobs.map((job, idx) => {
              const isSaved = Boolean(savedJobsMap[job.id]);
              const extraText = getExtraText(job);

              return (
                <React.Fragment key={job.id}>
                {idx === filterStatsRef.current.full && idx < filteredAndSortedJobs.length && !showSavedOnly && <PartialDivider variant="row" fullCount={filterStatsRef.current.full} />}
                <a
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
                      {!job.fullMatch && job.missed.length > 0 && <MissedBadge missed={job.missed} />}
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
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
