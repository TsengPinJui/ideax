import {
  ALL_JOB_SITES,
  COMPANY_SITE,
  jobSiteOptions,
} from '../src/data/jobSites';

export interface JobSearchSourceLink {
  id: string;
  site: string;
  url: string;
  actionLabel: string;
  destination: 'platform' | 'web-search';
}

const SITE_DOMAINS: Record<string, string> = {
  '104人力銀行': '104.com.tw',
  '1111人力銀行': '1111.com.tw',
  Yes123: 'yes123.com.tw',
  '518熊班': '518.com.tw',
  Cake: 'cake.me',
  Yourator: 'yourator.co',
  'Meet.jobs': 'meet.jobs',
  Glints: 'glints.com',
  LinkedIn: 'linkedin.com/jobs',
  Indeed: 'indeed.com',
  '台灣就業通': 'taiwanjobs.gov.tw',
  事求人: 'dgpa.gov.tw',
  小雞上工: 'chickpt.com.tw',
  Worky: 'worky.com.tw',
  Tasker出任務: 'tasker.com.tw',
  Glassdoor: 'glassdoor.com',
  JobStreet: 'jobstreet.com',
  JobsDB: 'jobsdb.com',
  CTgoodjobs: 'ctgoodjobs.hk',
  MyCareersFuture: 'mycareersfuture.gov.sg',
  doda: 'doda.jp',
  Green: 'green-japan.com',
  Daijob: 'daijob.com',
  リクナビNEXT: 'next.rikunabi.com',
  'BOSS直聘': 'zhipin.com',
  前程無憂: '51job.com',
  Saramin: 'saramin.co.kr',
  JobKorea: 'jobkorea.co.kr',
  ZipRecruiter: 'ziprecruiter.com',
  Wellfound: 'wellfound.com',
  'Job Bank': 'jobbank.gc.ca',
  Reed: 'reed.co.uk',
  StepStone: 'stepstone.de',
  SEEK: 'seek.com.au',
  'Remote OK': 'remoteok.com',
  'We Work Remotely': 'weworkremotely.com',
};

const PLATFORM_SEARCH_URLS: Partial<Record<string, (terms: string) => string>> = {
  '104人力銀行': (terms) => `https://www.104.com.tw/jobs/search/?keyword=${encodeURIComponent(terms)}`,
  '1111人力銀行': (terms) => `https://www.1111.com.tw/search/job?ks=${encodeURIComponent(terms)}`,
  Yes123: (terms) => `https://www.yes123.com.tw/admin/job_refer_comp_job.asp?key_word=${encodeURIComponent(terms)}`,
  '518熊班': (terms) => `https://www.518.com.tw/job-index.html?key=${encodeURIComponent(terms)}`,
  Cake: (terms) => `https://www.cake.me/jobs?q=${encodeURIComponent(terms)}`,
  Yourator: (terms) => `https://www.yourator.co/jobs?term=${encodeURIComponent(terms)}`,
  LinkedIn: (terms) => `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(terms)}`,
  Indeed: (terms) => `https://www.indeed.com/jobs?q=${encodeURIComponent(terms)}`,
};

function safeTerms(query: string, filters: Record<string, unknown>): string {
  const useful = (value: unknown) => {
    const normalized = String(value || '').trim();
    return /^(全部|不限|不拘|無)$/i.test(normalized) ? '' : normalized;
  };
  const cleanQuery = useful(query)
    .replace(/(?:工作型態|地區|工作範圍|國家|職務(?:（複選）)?|目標公司|限定公司|指定公司|學歷|經歷|年資|薪資|薪水|班別工時|工作環境|工作方式|福利|技能證照|個人背景|其他偏好|產業|類別)[：:]\s*/g, ' ')
    .replace(/（(?:台灣|臺灣|不限縣市|依[月年時日]薪判斷)）/g, ' ')
    .replace(/\b(?:月薪|年薪|時薪|日薪)?\s*[\d,]+\s*(?:元|萬|k|twd|usd)?\s*以上\b/gi, ' ')
    .replace(/(?:經歷|學歷|薪資|待遇|地區|地點|公司)?不拘|正職兼職皆可|最新在招職缺|最新招募職缺/g, ' ')
    .replace(/[、,，。；;]+/g, ' ');

  const parts = [
    useful(filters.keyword),
    useful(filters.company),
    cleanQuery,
    useful(filters.city),
    useful(filters.category),
    useful(filters.jobType),
  ].filter(Boolean);

  let value = Array.from(new Set(parts.join(' ').split(/\s+/).filter(Boolean))).join(' ');
  value = value
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, ' ')
    .replace(/\b[A-Z][12]\d{8}\b/gi, ' ')
    .replace(/(?:\+?886[-\s]?)?0?9\d{2}[-\s]?\d{3}[-\s]?\d{3}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return (value || '最新職缺').slice(0, 120);
}

function safeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Build outbound search URLs only. This module never requests a job site,
 * extracts listing text, stores job records, or verifies a listing page.
 */
export function buildJobSearchLinks(query: string, inputFilters: unknown): JobSearchSourceLink[] {
  const filters = inputFilters && typeof inputFilters === 'object'
    ? inputFilters as Record<string, unknown>
    : {};
  const terms = safeTerms(query, filters);
  const picked = Array.isArray(filters.sites)
    ? Array.from(new Set(filters.sites.map((site) => String(site || '').trim()).filter((site) => ALL_JOB_SITES.includes(site))))
    : [];

  const region = ['全部', '台灣', '國外', '台灣與國外'].includes(String(filters.region || '全部'))
    ? String(filters.region || '全部') as '全部' | '台灣' | '國外' | '台灣與國外'
    : '全部';
  const countries = Array.isArray(filters.countries)
    ? filters.countries.map((country) => String(country || '').trim()).filter(Boolean)
    : [];
  const available = jobSiteOptions(region, countries);
  const defaultSites = [...available.domestic, ...available.abroad];
  const sites = (picked.length ? picked : defaultSites).slice(0, 24);

  return sites.map((site): JobSearchSourceLink => {
    const platformSearch = PLATFORM_SEARCH_URLS[site];
    const url = platformSearch
      ? platformSearch(terms)
      : (() => {
          const search = new URL('https://www.google.com/search');
          const domain = SITE_DOMAINS[site];
          const queryText = site === COMPANY_SITE
            ? `${terms} 職缺 招募 careers 官方`
            : domain
              ? `site:${domain} ${terms}`
              : `${site} ${terms} 職缺`;
          search.searchParams.set('q', queryText);
          return search.toString();
        })();

    return {
      id: `source-${safeId(site)}`,
      site,
      url,
      actionLabel: platformSearch ? `前往 ${site} 搜尋` : `用 Google 搜尋 ${site}`,
      destination: platformSearch ? 'platform' : 'web-search',
    };
  });
}
