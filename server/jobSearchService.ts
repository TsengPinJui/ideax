import { GoogleGenAI } from '@google/genai';
import { buildJobSearchLinks, JobSearchSourceLink } from './jobSearchLinks';
import { verifyJobUrls, groundingFrom, GroundingInfo } from './jobUrlVerify';
import { seenJobBefore } from '../src/utils/jobDedupe';
import { jobSiteOptions, ALL_JOB_SITES } from '../src/data/jobSites';

export interface RawJobData {
  title: string;
  company: string;
  location?: string;
  city?: string;
  salaryText?: string;
  salaryMin?: number;
  salaryMax?: number;
  experience?: string;
  experienceYears?: number;
  education?: string;
  educationLevel?: number;
  sourcePlatform?: string;
  url?: string;
  description?: string;
  industry?: string;
  workEnvironment?: string;
  benefits?: string;
  postedAtText?: string;
  postedAt?: string;
  aiScore?: number;
}

export interface VerifiedJobListing extends RawJobData {
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
  urlKind: 'direct' | 'search';
  urlVerified: boolean;
  aiScore: number;
  sourcePlatform: string;
  postedAtText: string;
  postedAt: string;
}

export interface JobSearchFilters {
  keyword?: string;
  city?: string;
  category?: string;
  jobType?: string;
  minSalary?: number;
  region?: '全部' | '台灣' | '國外' | '台灣與國外';
  countries?: string[];
  sites?: string[];
  company?: string;
}

export interface JobSearchResult {
  success: boolean;
  jobs: VerifiedJobListing[];
  sources: JobSearchSourceLink[];
  reply: string;
  error?: string;
}

function extractJson(text: string): any {
  if (!text) return null;
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch {}
  }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.substring(firstBrace, lastBrace + 1));
    } catch {}
  }
  return null;
}

export async function executeJobSearch(
  query: string,
  inputFilters: unknown,
  options?: {
    onProgress?: (text: string) => void;
    onBatch?: (batchJobs: VerifiedJobListing[], accumulated: number) => void;
  }
): Promise<JobSearchResult> {
  const filters: JobSearchFilters =
    inputFilters && typeof inputFilters === 'object'
      ? (inputFilters as JobSearchFilters)
      : {};

  const sources = buildJobSearchLinks(query, filters);
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

  if (!apiKey) {
    return {
      success: true,
      jobs: [],
      sources,
      reply: `已整理 ${sources.length} 個求職網站搜尋入口。`,
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  // 決定目標求職網站
  const pickedSites = Array.isArray(filters.sites)
    ? filters.sites.filter((s) => ALL_JOB_SITES.includes(s))
    : [];

  const region = filters.region || '全部';
  const available = jobSiteOptions(region, filters.countries || []);
  const defaultSites = [...available.domestic, ...available.abroad];
  const targetSitesList = pickedSites.length ? pickedSites : defaultSites.slice(0, 10);
  const targetSitesStr = targetSitesList.join('、');

  options?.onProgress?.('探索者搜搜正在跨平台檢索最新在招職缺…');

  const prompt = `你是「創點子 IdeaX」匯職缺跨海內外全網求職 AI 助手。
請使用 Google 搜尋目前在招募的真實職缺資訊，搜尋來源包含但不限於以下求職平台：
${targetSitesStr}

【使用者求職條件】：
${query}
${filters.keyword ? `職位/關鍵字：${filters.keyword}` : ''}
${filters.city ? `工作地點：${filters.city}` : ''}
${filters.category ? `職能分類：${filters.category}` : ''}
${filters.jobType ? `工作型態：${filters.jobType}` : ''}
${Number(filters.minSalary) > 0 ? `薪資門檻：${filters.minSalary}` : ''}
${filters.company ? `指定公司：${filters.company}` : ''}
${filters.region ? `區域範圍：${filters.region}` : ''}
${filters.countries?.length ? `指定國家：${filters.countries.join('、')}` : ''}

【任務要求】：
1. 檢索真實、正在招募且在各求職平台（104、1111、Cake、Yourator、Yes123、518熊班、LinkedIn、Indeed等）有刊登的職缺。
2. 來源必須跨不同求職網站分散（各求職網均衡分佈），同一家公司最多 2 筆，請找出 8 至 15 筆符合條件的職缺。
3. 每一筆必須給出在該平台的真實網址（若無單一職缺頁網址，可給該職缺在該求職網的搜尋或列表頁網址）。
4. 輸出格式必須是純 JSON 物件（請用 \`\`\`json 包住），結構如下：
\`\`\`json
{
  "jobs": [
    {
      "title": "精確職缺職稱",
      "company": "招募公司全名或品牌名",
      "location": "工作地點（例如：台北市內湖區、新北市板橋區、遠端工作）",
      "city": "縣市（例如：台北市、新北市）",
      "salaryText": "薪資待遇（例如：月薪 50,000~75,000元 或 時薪 220元）",
      "salaryMin": 50000,
      "salaryMax": 75000,
      "experience": "經歷需求（例如：1年以上、經歷不拘）",
      "experienceYears": 1,
      "education": "學歷需求（例如：大學以上、高中職以上、不拘）",
      "educationLevel": 3,
      "sourcePlatform": "來源平台名稱（例如：104人力銀行、Cake、Yourator、1111人力銀行、Yes123、518熊班、Indeed、LinkedIn）",
      "url": "該職缺在來源求職網站的完整網址",
      "description": "職缺重點與職責摘要（約40~80字）",
      "industry": "所屬行業類別",
      "workEnvironment": "工作環境或型態（例如：辦公室環境、彈性上下班、週休二日、WFH混合辦公）",
      "benefits": "福利項目（例如：員工餐、年終獎金、三節禮品、進修補助）",
      "postedAtText": "刊登時間提示（例如：今日、3天前、近期）",
      "aiScore": 92
    }
  ]
}
\`\`\``;

  try {
    const response: any = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
      },
    });

    const grounding: GroundingInfo = groundingFrom(response);
    const parsed = extractJson(response?.text || '');
    const rawJobs: RawJobData[] = Array.isArray(parsed?.jobs) ? parsed.jobs : [];

    if (!rawJobs.length) {
      return {
        success: true,
        jobs: [],
        sources,
        reply: `已整理 ${sources.length} 個求職網站搜尋入口，建議可點選直接前往來源網站查看。`,
      };
    }

    // 去重複：同一個職缺在不同求職網出現時合併
    const seen = new Set<string>();
    const uniqueRawJobs: RawJobData[] = [];
    for (const j of rawJobs) {
      if (!j.title || !j.company) continue;
      if (!seenJobBefore(seen, { title: j.title, company: j.company, url: j.url })) {
        uniqueRawJobs.push(j);
      }
    }

    options?.onProgress?.(`已初篩出 ${uniqueRawJobs.length} 筆跨平台職缺，正在驗證網址與招募狀態…`);

    // 驗證職缺連結（開啟驗證、過濾關閉職缺、產生安全備援搜尋連結）
    const verifiedUrls = await verifyJobUrls(
      uniqueRawJobs.map((j) => ({
        title: j.title,
        company: j.company,
        url: j.url,
        sourcePlatform: j.sourcePlatform,
      })),
      grounding,
      12000,
      6
    );

    const verifiedJobs: VerifiedJobListing[] = [];
    const nowIso = new Date().toISOString();

    for (let i = 0; i < uniqueRawJobs.length; i++) {
      const raw = uniqueRawJobs[i];
      const v = verifiedUrls[i];
      if (v?.drop) continue; // 確定已下架或關閉的職缺不顯示

      const finalUrl = v?.url || raw.url || '';
      const finalKind = v?.urlKind || 'direct';
      const isVerified = Boolean(v?.verified);
      const platform = v?.platform || raw.sourcePlatform || '全網求職';

      const jobItem: VerifiedJobListing = {
        id: `job-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        title: raw.title.trim(),
        company: raw.company.trim(),
        location: raw.location || filters.city || '台灣',
        city: raw.city || filters.city || '台灣',
        distanceKm: 0,
        experience: raw.experience || '經歷不拘',
        experienceYears: Number(raw.experienceYears) || 0,
        education: raw.education || '學歷不拘',
        educationLevel: Number(raw.educationLevel) || 0,
        salaryText: raw.salaryText || '待遇面議',
        salaryMin: Number(raw.salaryMin) || 0,
        salaryMax: Number(raw.salaryMax) || 0,
        industry: raw.industry || '',
        category: raw.industry || filters.category || '',
        workEnvironment: raw.workEnvironment || '',
        benefits: raw.benefits || '',
        description: raw.description || '',
        url: finalUrl,
        urlKind: finalKind,
        urlVerified: isVerified,
        aiScore: Math.min(99, Math.max(75, Number(raw.aiScore) || 88)),
        sourcePlatform: platform,
        postedAtText: raw.postedAtText || '近期',
        postedAt: raw.postedAt || nowIso,
      };

      verifiedJobs.push(jobItem);

      // 分批即時送出回呼（例如每湊滿 2~3 筆就送給監聽端）
      if (options?.onBatch && (verifiedJobs.length % 3 === 0 || i === uniqueRawJobs.length - 1)) {
        options.onBatch([...verifiedJobs], verifiedJobs.length);
      }
    }

    return {
      success: true,
      jobs: verifiedJobs,
      sources,
      reply: verifiedJobs.length
        ? `已為您跨平台精選 ${verifiedJobs.length} 個在招職缺。`
        : `已整理 ${sources.length} 個求職網站搜尋入口。`,
    };
  } catch (err: any) {
    console.error('[Job Search Execution Error]', err?.message || err);
    return {
      success: true,
      jobs: [],
      sources,
      reply: `已整理 ${sources.length} 個求職網站搜尋入口，點選即可前往查看。`,
    };
  }
}
