/**
 * 匯職缺可以指定的求職網（前端篩選選單與後端搜尋共用）。
 * 名稱要和 server/jobUrlVerify.ts 的平台名稱一致，後端才能用來過濾結果。
 */
export const COMPANY_SITE = '企業官網';

export const TAIWAN_JOB_SITES: string[] = [
  '104人力銀行', '1111人力銀行', 'Yes123', '518熊班', 'Cake', 'Yourator', 'Meet.jobs', 'Glints',
  'LinkedIn', 'Indeed', '台灣就業通', '事求人', '小雞上工', 'Worky', 'Tasker出任務', COMPANY_SITE,
];

/** 國外：通用平台＋各國在地平台 */
export const ABROAD_GENERAL_SITES: string[] = ['LinkedIn', 'Indeed', 'Glassdoor', COMPANY_SITE];
export const ABROAD_SITES_BY_COUNTRY: Record<string, string[]> = {
  日本: ['doda', 'Green', 'Daijob', 'リクナビNEXT'],
  新加坡: ['MyCareersFuture', 'JobStreet'],
  香港: ['JobsDB', 'CTgoodjobs'],
  中國大陸: ['BOSS直聘', '前程無憂'],
  韓國: ['Saramin', 'JobKorea'],
  馬來西亞: ['JobStreet'],
  越南: [],
  澳洲: ['SEEK'],
  紐西蘭: ['SEEK'],
  美國: ['ZipRecruiter', 'Wellfound'],
  加拿大: ['Job Bank'],
  英國: ['Reed'],
  德國: ['StepStone'],
  全球遠端: ['We Work Remotely', 'Remote OK', 'Wellfound'],
};

/** 依「台灣／國外」與勾選的國家，列出可選的求職網 */
export function jobSiteOptions(region: '全部' | '台灣' | '國外' | '台灣與國外', countries: string[]): { domestic: string[]; abroad: string[] } {
  const domestic = region === '國外' ? [] : TAIWAN_JOB_SITES;
  let abroad: string[] = [];
  if (region !== '台灣') {
    const list = countries.length ? countries : Object.keys(ABROAD_SITES_BY_COUNTRY);
    abroad = Array.from(new Set([...ABROAD_GENERAL_SITES, ...list.flatMap((c) => ABROAD_SITES_BY_COUNTRY[c] || [])]));
    // 國內外都要時，通用平台已經在國內那排出現就不重複列
    if (region === '台灣與國外' || region === '全部') abroad = abroad.filter((s) => !domestic.includes(s));
  }
  return { domestic, abroad };
}

export const ALL_JOB_SITES: string[] = Array.from(
  new Set([...TAIWAN_JOB_SITES, ...ABROAD_GENERAL_SITES, ...Object.values(ABROAD_SITES_BY_COUNTRY).flat()]),
);

/** 國外各國的主要城市（選了國家後可再選城市） */
export const MAJOR_CITIES_BY_COUNTRY: Record<string, string[]> = {
  日本: ['東京', '大阪', '名古屋', '福岡', '京都', '橫濱'],
  中國大陸: ['上海', '北京', '深圳', '廣州', '杭州', '蘇州'],
  韓國: ['首爾', '釜山', '仁川'],
  馬來西亞: ['吉隆坡', '檳城', '新山'],
  越南: ['胡志明市', '河內'],
  澳洲: ['雪梨', '墨爾本', '布里斯本', '伯斯'],
  紐西蘭: ['奧克蘭', '威靈頓'],
  美國: ['紐約', '舊金山灣區', '西雅圖', '洛杉磯', '波士頓', '奧斯汀'],
  加拿大: ['多倫多', '溫哥華', '蒙特婁'],
  英國: ['倫敦', '曼徹斯特', '愛丁堡'],
  德國: ['柏林', '慕尼黑', '法蘭克福', '漢堡'],
};

/** 「日本：東京、大阪；新加坡」：國家後面接選到的城市 */
export function formatCountryScope(countries: string[], cities: string[]): string {
  return countries
    .map((c) => {
      const cs = (MAJOR_CITIES_BY_COUNTRY[c] || []).filter((x) => cities.includes(x));
      return cs.length ? `${c}：${cs.join('、')}` : c;
    })
    .join('；');
}

/** 取消某個國家時，順便拿掉該國的城市 */
export function citiesForCountries(countries: string[], cities: string[]): string[] {
  const allowed = new Set(countries.flatMap((c) => MAJOR_CITIES_BY_COUNTRY[c] || []));
  return cities.filter((x) => allowed.has(x));
}

/**
 * 國外薪資選項：用當地幣別與當地習慣（年薪或月薪），不套台灣的最低工資與月薪級距。
 * 只有選一個國家時才列具體金額；多國或沒選國家時只給「依當地行情」。
 */
const ABROAD_SALARY: Record<string, { cur: string; period: '年薪' | '月薪'; steps: number[]; hourly: number[]; unit?: string }> = {
  日本: { cur: '¥', period: '年薪', steps: [4000000, 6000000, 8000000, 10000000], hourly: [1100, 1300, 1500] },
  新加坡: { cur: 'S$', period: '月薪', steps: [4000, 6000, 8000, 10000], hourly: [12, 15, 20] },
  香港: { cur: 'HK$', period: '月薪', steps: [20000, 30000, 45000, 60000], hourly: [50, 70, 90] },
  中國大陸: { cur: '¥', period: '月薪', steps: [10000, 15000, 25000, 35000], hourly: [25, 35, 50], unit: '人民幣' },
  韓國: { cur: '₩', period: '年薪', steps: [35000000, 50000000, 70000000], hourly: [10000, 12000, 15000] },
  馬來西亞: { cur: 'RM', period: '月薪', steps: [3000, 5000, 8000, 12000], hourly: [10, 15, 20] },
  越南: { cur: 'US$', period: '月薪', steps: [800, 1500, 2500], hourly: [5, 8, 12] },
  澳洲: { cur: 'A$', period: '年薪', steps: [70000, 90000, 120000, 150000], hourly: [25, 30, 40] },
  紐西蘭: { cur: 'NZ$', period: '年薪', steps: [60000, 80000, 100000], hourly: [24, 28, 35] },
  美國: { cur: 'US$', period: '年薪', steps: [60000, 100000, 150000, 200000], hourly: [15, 20, 30] },
  加拿大: { cur: 'C$', period: '年薪', steps: [60000, 80000, 110000], hourly: [17, 22, 30] },
  英國: { cur: '£', period: '年薪', steps: [30000, 45000, 65000, 90000], hourly: [12, 15, 20] },
  德國: { cur: '€', period: '年薪', steps: [45000, 60000, 80000, 100000], hourly: [13, 16, 20] },
  全球遠端: { cur: 'US$', period: '年薪', steps: [40000, 80000, 120000], hourly: [20, 30, 50] },
};

// 各國薪資用的幣別代碼（換算顯示用）
const COUNTRY_CODE: Record<string, string> = {
  日本: 'JPY', 新加坡: 'SGD', 香港: 'HKD', 中國大陸: 'CNY', 韓國: 'KRW', 馬來西亞: 'MYR', 越南: 'USD',
  澳洲: 'AUD', 紐西蘭: 'NZD', 美國: 'USD', 加拿大: 'CAD', 英國: 'GBP', 德國: 'EUR', 全球遠端: 'USD',
};
const money = (cur: string, v: number) => `${cur}${v.toLocaleString('en-US')}`;

export function abroadSalaryOptions(countries: string[], isHourly: boolean): Array<{ label: string; value: string; isSkip?: boolean; amount?: number; cur?: string }> {
  const tail = [
    { label: '依當地行情', value: '薪水：依當地行情' },
    { label: '薪資不拘', value: '薪資待遇不拘' },
    { label: '跳過', value: '跳過', isSkip: true },
  ];
  const info = countries.length === 1 ? ABROAD_SALARY[countries[0]] : undefined;
  if (!info) return tail;
  const country = countries[0];
  const list = isHourly
    ? info.hourly.map((v) => ({ label: `時薪 ${money(info.cur, v)} 以上`, value: `薪水：時薪 ${money(info.cur, v)} 以上（${country}）`, amount: v, cur: COUNTRY_CODE[country] }))
    : info.steps.map((v) => ({ label: `${info.period} ${money(info.cur, v)} 以上`, value: `薪水：${info.period} ${money(info.cur, v)} 以上（${country}${info.unit ? `，${info.unit}` : ''}）`, amount: v, cur: COUNTRY_CODE[country] }));
  return [...list, ...tail];
}
