import * as XLSX from 'xlsx';
import { User } from '../types';

export const GENDER_MAP: Record<string, string> = {
  male: '男',
  female: '女',
  other: '其他',
  undisclosed: '不便透露',
};

export const AGE_MAP: Record<string, string> = {
  under_18: '18 歲以下',
  '18_24': '18 ~ 24 歲',
  '25_34': '25 ~ 34 歲',
  '35_44': '35 ~ 44 歲',
  '45_54': '45 ~ 54 歲',
  '55_above': '55 歲以上',
};

export const BUDGET_MAP: Record<string, string> = {
  under_500: 'NT$ 500 以下',
  '500_2000': 'NT$ 500 ~ 2,000',
  '2000_5000': 'NT$ 2,000 ~ 5,000',
  '5000_20000': 'NT$ 5,000 ~ 20,000',
  above_20000: 'NT$ 20,000 以上',
  none: '尚未有付費意願',
};

export const WILLING_SOLVE_MAP: Record<string, string> = {
  very_willing: '非常願意（積極解答接案）',
  depends_bounty: '視題目難度與報酬而定',
  not_willing: '暫無意願（目前僅想提問）',
};

export const FREQ_MAP: Record<string, string> = {
  multiple_daily: '每天數次',
  daily: '每天至少 1 次',
  few_times_weekly: '每週 2~3 次',
  weekly: '每週 1 次',
  on_demand: '偶爾或有特定需求才開',
};

export const SIDE_HUSTLE_MAP: Record<string, string> = {
  very_willing: '非常願意（發展為主力副業）',
  considering: '考慮中（有空檔兼職嘗試）',
  open_minded: '不排斥但目前無規劃',
  not_interested: '目前不考慮',
};

export const SALARY_MAP: Record<string, string> = {
  under_500k: '未滿 50 萬',
  '500k_1000k': '50 萬 - 100 萬',
  '1000k_2000k': '100 萬 - 200 萬',
  '2000k_3000k': '200 萬 - 300 萬',
  above_3000k: '300 萬以上',
  undisclosed: '不方便透露',
};

export const SUBSCRIBE_MAP: Record<string, string> = {
  willing: '願意（年繳或月繳訂閱以降低手續費）',
  depends_profit: '視接案獲利情況而定',
  free_tier_first: '先體驗免費版',
  not_willing: '暫不考慮',
};

/**
 * 完整匯出為標準 Microsoft Excel (.xlsx) 檔案
 * 包含：
 * Sheet 1:「全體用戶詳細名冊與問卷結果」
 * Sheet 2:「總體數據統計與光譜摘要」
 */
export function exportSurveyToExcelXlsx(users: User[], customFilename?: string) {
  const validUsers = users.filter((u) => u.id !== 'user-guest');
  const total = validUsers.length || 1;

  // 1. 建立 Sheet 1: 用戶詳細名冊與問卷記錄
  const detailRows = validUsers.map((u) => {
    const s = u.surveyData || {};
    const desiredServices = [
      ...(s.desiredServices || []),
      ...(s.desiredServicesCustom ? [`自填：${s.desiredServicesCustom}`] : []),
    ].join('；') || '未填寫';

    const relatedDomains = [
      ...(s.relatedDomains || (u.domain ? [u.domain] : [])),
      ...(s.relatedDomainsCustom ? [`自填：${s.relatedDomainsCustom}`] : []),
    ].join('；') || '未填寫';

    return {
      '用戶編號 (ID)': u.id,
      '稱呼/姓名': u.name,
      '身分角色': u.role === 'admin' ? '平台管理員' : u.role === 'solver' ? '解答者/專家' : '提問者',
      '電子信箱': u.email || '未填寫',
      '聯絡電話': u.phone || '未填寫',
      '性別': u.gender ? (GENDER_MAP[u.gender] || u.gender) : '未填寫',
      '年齡層': u.ageGroup ? (AGE_MAP[u.ageGroup] || u.ageGroup) : '未填寫',
      '行業': u.industry || '未填寫',
      '職位/頭銜': u.jobTitle || u.title || '未填寫',
      '目前薪水(年)': u.annualSalary ? (SALARY_MAP[u.annualSalary] || u.annualSalary) : '未填寫 / 不方便透露',
      '任職公司': u.company || '無',
      '註冊日期': u.joinedDate,
      '期望在IdeaX使用的服務': desiredServices,
      '相關專業領域': relatedDomains,
      '提問解答預算': s.willingQuestionBudget ? (BUDGET_MAP[s.willingQuestionBudget] || s.willingQuestionBudget) : '未填寫',
      '是否願意有償為其他提問提供解方': s.willingToProvideSolutions ? (WILLING_SOLVE_MAP[s.willingToProvideSolutions] || s.willingToProvideSolutions) : '未填寫',
      '打開 IdeaX 頻率': s.usageFrequency ? (FREQ_MAP[s.usageFrequency] || s.usageFrequency) : '未填寫',
      '是否願意將解答作為副業': s.willingToBeSideHustle ? (SIDE_HUSTLE_MAP[s.willingToBeSideHustle] || s.willingToBeSideHustle) : '未填寫',
      '是否願意訂閱解答者優惠方案': s.willingToSubscribeSolverPlan ? (SUBSCRIBE_MAP[s.willingToSubscribeSolverPlan] || s.willingToSubscribeSolverPlan) : '未填寫',
      '給我們的建議 (自由填寫)': s.feedbackSuggestions || '無',
      '問卷最後更新時間': s.updatedAt || s.completedAt || u.joinedDate,
    };
  });

  const wsDetails = XLSX.utils.json_to_sheet(detailRows);

  // 設定詳細資料欄寬
  wsDetails['!cols'] = [
    { wch: 18 }, // ID
    { wch: 15 }, // 姓名
    { wch: 14 }, // 角色
    { wch: 25 }, // Email
    { wch: 15 }, // 電話
    { wch: 10 }, // 性別
    { wch: 14 }, // 年齡層
    { wch: 18 }, // 行業
    { wch: 18 }, // 職位
    { wch: 18 }, // 公司
    { wch: 14 }, // 註冊日期
    { wch: 32 }, // 期望服務
    { wch: 28 }, // 相關領域
    { wch: 20 }, // 預算
    { wch: 25 }, // 為人解答意願
    { wch: 16 }, // 打開頻率
    { wch: 25 }, // 副業意願
    { wch: 32 }, // 方案訂閱意願
    { wch: 22 }, // 更新時間
  ];

  // 2. 建立 Sheet 2: 各題統計匯總表
  const summaryRows: any[] = [];
  summaryRows.push({ '統計維度': '=== IdeaX 平台註冊用戶調研統計總覽 ===', '分類項目': `統計總用戶數：${validUsers.length} 人`, '人數/票數': '', '百分比': `匯出時間：${new Date().toLocaleString()}` });
  summaryRows.push({});

  // 性別統計
  summaryRows.push({ '統計維度': '【1. 性別分佈統計】', '分類項目': '', '人數/票數': '', '百分比': '' });
  const genderCounts: Record<string, number> = { male: 0, female: 0, other: 0, undisclosed: 0 };
  validUsers.forEach((u) => {
    const g = u.gender || 'undisclosed';
    genderCounts[g] = (genderCounts[g] || 0) + 1;
  });
  Object.entries(GENDER_MAP).forEach(([key, label]) => {
    const c = genderCounts[key] || 0;
    summaryRows.push({ '統計維度': '', '分類項目': label, '人數/票數': c, '百分比': `${((c / total) * 100).toFixed(1)}%` });
  });
  summaryRows.push({});

  // 年齡統計
  summaryRows.push({ '統計維度': '【2. 年齡層分佈統計】', '分類項目': '', '人數/票數': '', '百分比': '' });
  const ageCounts: Record<string, number> = {};
  validUsers.forEach((u) => {
    const a = u.ageGroup || '25_34';
    ageCounts[a] = (ageCounts[a] || 0) + 1;
  });
  Object.entries(AGE_MAP).forEach(([key, label]) => {
    const c = ageCounts[key] || 0;
    summaryRows.push({ '統計維度': '', '分類項目': label, '人數/票數': c, '百分比': `${((c / total) * 100).toFixed(1)}%` });
  });
  summaryRows.push({});

  // 尋求解答預算統計
  summaryRows.push({ '統計維度': '【3. 尋求解答預算區間】', '分類項目': '', '人數/票數': '', '百分比': '' });
  const budgetCounts: Record<string, number> = {};
  validUsers.forEach((u) => {
    const b = u.surveyData?.willingQuestionBudget || '2000_5000';
    budgetCounts[b] = (budgetCounts[b] || 0) + 1;
  });
  Object.entries(BUDGET_MAP).forEach(([key, label]) => {
    const c = budgetCounts[key] || 0;
    summaryRows.push({ '統計維度': '', '分類項目': label, '人數/票數': c, '百分比': `${((c / total) * 100).toFixed(1)}%` });
  });
  summaryRows.push({});

  // 為人解答意願
  summaryRows.push({ '統計維度': '【4. 為他人提供有償解方意願】', '分類項目': '', '人數/票數': '', '百分比': '' });
  const solveCounts: Record<string, number> = {};
  validUsers.forEach((u) => {
    const w = u.surveyData?.willingToProvideSolutions || (u.role === 'solver' ? 'very_willing' : 'depends_bounty');
    solveCounts[w] = (solveCounts[w] || 0) + 1;
  });
  Object.entries(WILLING_SOLVE_MAP).forEach(([key, label]) => {
    const c = solveCounts[key] || 0;
    summaryRows.push({ '統計維度': '', '分類項目': label, '人數/票數': c, '百分比': `${((c / total) * 100).toFixed(1)}%` });
  });
  summaryRows.push({});

  // 打開頻率
  summaryRows.push({ '統計維度': '【5. 打開 IdeaX 頻率習慣】', '分類項目': '', '人數/票數': '', '百分比': '' });
  const freqCounts: Record<string, number> = {};
  validUsers.forEach((u) => {
    const f = u.surveyData?.usageFrequency || 'few_times_weekly';
    freqCounts[f] = (freqCounts[f] || 0) + 1;
  });
  Object.entries(FREQ_MAP).forEach(([key, label]) => {
    const c = freqCounts[key] || 0;
    summaryRows.push({ '統計維度': '', '分類項目': label, '人數/票數': c, '百分比': `${((c / total) * 100).toFixed(1)}%` });
  });
  summaryRows.push({});

  // 副業意願
  summaryRows.push({ '統計維度': '【6. 將解答作為有償副業意願】', '分類項目': '', '人數/票數': '', '百分比': '' });
  const sideCounts: Record<string, number> = {};
  validUsers.forEach((u) => {
    const sh = u.surveyData?.willingToBeSideHustle || 'considering';
    sideCounts[sh] = (sideCounts[sh] || 0) + 1;
  });
  Object.entries(SIDE_HUSTLE_MAP).forEach(([key, label]) => {
    const c = sideCounts[key] || 0;
    summaryRows.push({ '統計維度': '', '分類項目': label, '人數/票數': c, '百分比': `${((c / total) * 100).toFixed(1)}%` });
  });
  summaryRows.push({});

  // 會員方案付費意願
  summaryRows.push({ '統計維度': '【7. 解答者優惠方案付費意願】', '分類項目': '', '人數/票數': '', '百分比': '' });
  const subCounts: Record<string, number> = {};
  validUsers.forEach((u) => {
    const sp = u.surveyData?.willingToSubscribeSolverPlan || 'depends_profit';
    subCounts[sp] = (subCounts[sp] || 0) + 1;
  });
  Object.entries(SUBSCRIBE_MAP).forEach(([key, label]) => {
    const c = subCounts[key] || 0;
    summaryRows.push({ '統計維度': '', '分類項目': label, '人數/票數': c, '百分比': `${((c / total) * 100).toFixed(1)}%` });
  });

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 30 },
    { wch: 35 },
    { wch: 14 },
    { wch: 25 },
  ];

  // 3. 封裝 Workbook 並觸發下載
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsDetails, '用戶名冊與問卷記錄');
  XLSX.utils.book_append_sheet(wb, wsSummary, '統計分佈彙總表');

  const filename = customFilename || `IdeaX_用戶分佈與習慣統計報表_${new Date().toISOString().split('T')[0]}.xlsx`;

  // 產生二進位 Blob 確保瀏覽器直接觸發標準 Excel 檔案下載
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 相容性匯出 CSV 函式（帶 UTF-8 BOM）
 */
export function exportSurveyToExcelCsv(users: User[], filename = 'IdeaX_用戶分佈與習慣統計報表.csv') {
  const headers = [
    '用戶編號 (ID)',
    '稱呼/姓名',
    '身分角色',
    '電子信箱',
    '聯絡電話',
    '性別',
    '年齡層',
    '行業',
    '職位',
    '公司名稱',
    '註冊日期',
    '期望在IdeaX使用的服務',
    '相關專業領域',
    '願意一次花多少錢尋求解答(提問預算)',
    '是否願意有償為其他提問提供解方',
    '您多久打開一次 IdeaX',
    '是否願意將解答作為您的副業(有償)',
    '是否願意花錢訂閱解答者優惠方案',
    '給我們的建議(自由填寫)',
    '問卷填寫/更新時間',
  ];

  const escapeCsv = (val: any) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = users
    .filter((u) => u.id !== 'user-guest')
    .map((u) => {
      const s = u.surveyData || {};
      const desiredServices = [
        ...(s.desiredServices || []),
        ...(s.desiredServicesCustom ? [`自填：${s.desiredServicesCustom}`] : []),
      ].join('；') || '未填寫';

      const relatedDomains = [
        ...(s.relatedDomains || (u.domain ? [u.domain] : [])),
        ...(s.relatedDomainsCustom ? [`自填：${s.relatedDomainsCustom}`] : []),
      ].join('；') || '未填寫';

      return [
        escapeCsv(u.id),
        escapeCsv(u.name),
        escapeCsv(u.role === 'admin' ? '管理員' : u.role === 'solver' ? '解答者' : '提問者'),
        escapeCsv(u.email || '未填寫'),
        escapeCsv(u.phone || '未填寫'),
        escapeCsv(u.gender ? (GENDER_MAP[u.gender] || u.gender) : '未填寫'),
        escapeCsv(u.ageGroup ? (AGE_MAP[u.ageGroup] || u.ageGroup) : '未填寫'),
        escapeCsv(u.industry || '未填寫'),
        escapeCsv(u.jobTitle || u.title || '未填寫'),
        escapeCsv(u.company || '無'),
        escapeCsv(u.joinedDate),
        escapeCsv(desiredServices),
        escapeCsv(relatedDomains),
        escapeCsv(s.willingQuestionBudget ? (BUDGET_MAP[s.willingQuestionBudget] || s.willingQuestionBudget) : '未填寫'),
        escapeCsv(s.willingToProvideSolutions ? (WILLING_SOLVE_MAP[s.willingToProvideSolutions] || s.willingToProvideSolutions) : '未填寫'),
        escapeCsv(s.usageFrequency ? (FREQ_MAP[s.usageFrequency] || s.usageFrequency) : '未填寫'),
        escapeCsv(s.willingToBeSideHustle ? (SIDE_HUSTLE_MAP[s.willingToBeSideHustle] || s.willingToBeSideHustle) : '未填寫'),
        escapeCsv(s.willingToSubscribeSolverPlan ? (SUBSCRIBE_MAP[s.willingToSubscribeSolverPlan] || s.willingToSubscribeSolverPlan) : '未填寫'),
        escapeCsv(s.feedbackSuggestions || '無'),
        escapeCsv(s.updatedAt || s.completedAt || u.joinedDate),
      ].join(',');
    });

  // UTF-8 BOM (\uFEFF)
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
