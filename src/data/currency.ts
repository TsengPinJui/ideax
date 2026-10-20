/**
 * 匯職缺的幣別：選擇顯示幣別後，職缺薪資依當前匯率自動換算。
 * 匯率由後端 /api/fx 提供（以美元為基準，取不到時用備用匯率）。
 */
export type CurrencyCode = 'TWD' | 'USD' | 'JPY' | 'CNY' | 'HKD' | 'SGD' | 'KRW' | 'MYR' | 'VND' | 'AUD' | 'NZD' | 'CAD' | 'GBP' | 'EUR';

export const CURRENCIES: Array<{ code: CurrencyCode; symbol: string; name: string }> = [
  { code: 'TWD', symbol: 'NT$', name: '新台幣' },
  { code: 'USD', symbol: 'US$', name: '美元' },
  { code: 'JPY', symbol: '¥', name: '日圓' },
  { code: 'CNY', symbol: 'CN¥', name: '人民幣' },
  { code: 'HKD', symbol: 'HK$', name: '港幣' },
  { code: 'SGD', symbol: 'S$', name: '新加坡幣' },
  { code: 'KRW', symbol: '₩', name: '韓元' },
  { code: 'MYR', symbol: 'RM', name: '馬來西亞令吉' },
  { code: 'VND', symbol: '₫', name: '越南盾' },
  { code: 'AUD', symbol: 'A$', name: '澳幣' },
  { code: 'NZD', symbol: 'NZ$', name: '紐幣' },
  { code: 'CAD', symbol: 'C$', name: '加幣' },
  { code: 'GBP', symbol: '£', name: '英鎊' },
  { code: 'EUR', symbol: '€', name: '歐元' },
];

/** 備用匯率（1 美元可換多少），取不到即時匯率時使用 */
export const FALLBACK_USD_RATES: Record<CurrencyCode, number> = {
  USD: 1, TWD: 32.5, JPY: 150, CNY: 7.2, HKD: 7.8, SGD: 1.35, KRW: 1380, MYR: 4.6, VND: 25000,
  AUD: 1.52, NZD: 1.66, CAD: 1.37, GBP: 0.79, EUR: 0.92,
};

const COUNTRY_CURRENCY: Array<[RegExp, CurrencyCode]> = [
  [/日本|東京|大阪|名古屋|福岡|京都|橫濱/, 'JPY'],
  [/中國大陸|大陸|上海|北京|深圳|廣州|杭州|蘇州/, 'CNY'],
  [/香港|澳門/, 'HKD'],
  [/新加坡/, 'SGD'],
  [/韓國|首爾|釜山|仁川/, 'KRW'],
  [/馬來西亞|吉隆坡|檳城|新山/, 'MYR'],
  [/越南|胡志明|河內/, 'VND'],
  [/澳洲|雪梨|墨爾本|布里斯本|伯斯/, 'AUD'],
  [/紐西蘭|奧克蘭|威靈頓/, 'NZD'],
  [/加拿大|多倫多|溫哥華|蒙特婁/, 'CAD'],
  [/英國|倫敦|曼徹斯特|愛丁堡/, 'GBP'],
  [/德國|柏林|慕尼黑|法蘭克福|漢堡|法國|巴黎|荷蘭|歐洲/, 'EUR'],
  [/美國|紐約|舊金山|矽谷|西雅圖|洛杉磯|波士頓|奧斯汀/, 'USD'],
];

/** 判斷一筆薪資是什麼幣別：先看薪資文字裡的符號，再看工作地點 */
export function detectCurrency(salaryText: string, location = ''): CurrencyCode {
  const t = salaryText || '';
  if (/NT\$|新台幣|台幣/i.test(t)) return 'TWD';
  if (/US\$|USD|美元|美金/i.test(t)) return 'USD';
  if (/HK\$|HKD|港幣/i.test(t)) return 'HKD';
  if (/S\$|SGD|新幣|新加坡幣/i.test(t)) return 'SGD';
  if (/NZ\$|NZD|紐幣/i.test(t)) return 'NZD';
  if (/A\$|AUD|澳幣/i.test(t)) return 'AUD';
  if (/C\$|CAD|加幣/i.test(t)) return 'CAD';
  if (/£|GBP|英鎊/i.test(t)) return 'GBP';
  if (/€|EUR|歐元/i.test(t)) return 'EUR';
  if (/₩|KRW|韓元|원/i.test(t)) return 'KRW';
  if (/RM|MYR|令吉/i.test(t)) return 'MYR';
  if (/₫|VND|越南盾/i.test(t)) return 'VND';
  if (/CN¥|RMB|CNY|人民幣/i.test(t)) return 'CNY';
  if (/円|JPY|日圓|日幣/i.test(t)) return 'JPY';
  for (const [re, c] of COUNTRY_CURRENCY) if (re.test(location) || re.test(t)) return c;
  return 'TWD';
}

export function convert(amount: number, from: CurrencyCode, to: CurrencyCode, usdRates: Partial<Record<CurrencyCode, number>>): number {
  if (from === to) return amount;
  const rf = usdRates[from] || FALLBACK_USD_RATES[from];
  const rt = usdRates[to] || FALLBACK_USD_RATES[to];
  return (amount / rf) * rt;
}

/** 依大小四捨五入成好讀的數字（例如 63,800、1.2 萬不用，直接寫數字） */
export function roundNice(v: number): number {
  if (v >= 100000) return Math.round(v / 1000) * 1000;
  if (v >= 10000) return Math.round(v / 100) * 100;
  if (v >= 1000) return Math.round(v / 10) * 10;
  if (v >= 100) return Math.round(v);
  return Math.round(v * 10) / 10;
}

export function symbolOf(c: CurrencyCode): string {
  return CURRENCIES.find((x) => x.code === c)?.symbol || c;
}

export function formatMoney(v: number, c: CurrencyCode): string {
  return `${symbolOf(c)}${roundNice(v).toLocaleString('en-US')}`;
}
