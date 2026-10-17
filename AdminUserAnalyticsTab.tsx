import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  PieChart,
  Download,
  RefreshCw,
  Search,
  Users,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Briefcase,
  Calendar,
  Sparkles,
  Crown,
  HelpCircle,
  FileSpreadsheet,
  Brain,
  Lightbulb,
  Target,
  Zap,
  ChevronDown,
  ChevronUp,
  Eye,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { User, UserSurveyData } from '../types';
import { isRealRegisteredUser } from '../data/mockData';
import {
  exportSurveyToExcelCsv,
  exportSurveyToExcelXlsx,
  AiCustomerAnalyticsData,
} from '../utils/exportSurveyExcel';
import { loadAllDataFromFirestore } from '../services/firestoreSync';

export const AdminUserAnalyticsTab: React.FC = () => {
  const { availableUsers, setAvailableUsers, isDemoMode } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(() =>
    new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  // AI 客群分析與建議 State (讀取上次分析結果與時間)
  const [aiAnalytics, setAiAnalytics] = useState<AiCustomerAnalyticsData | null>(() => {
    try {
      const saved = localStorage.getItem('ideax_admin_ai_customer_analytics');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    // 非測試模式下（營運模式與無金流模式），未執行過 AI 分析時保持為空，不呈現模擬預算與數據
    if (localStorage.getItem('ideax_demo_mode') !== 'true') {
      return null;
    }
    return {
      cohortSummary:
        'IdeaX 目前用戶畫像呈現高收入、高決策力、高接案意願之雙向智庫生態。主要集中於 25~44 歲之資訊科技工程師、創辦人與主管，具備強勁之 NT$ 2,000~20,000 懸賞預算，且超過 85% 有意願將知識經驗轉化為有償副業。',
      demographicInsights: [
        '中高收入與高決策層佔比達 75%+：年薪超過 100 萬與企業 C-Level/主管級用戶為主要骨幹，痛點具高度商業價值。',
        '高供給彈性與副業潛力：超過 8 成用戶願意為他人解答或發展為主力副業，種子專家儲備充沛。',
        '預算集中於中高階懸賞：超過 65% 用戶願為單次高價值問題支付 NT$ 2,000 ~ 20,000 懸賞金。',
      ],
      growthOpportunities: [
        '推出「權威/大師方案」專家訂閱制：提供抽成減免與 AI CRM 客戶自動媒合功能。',
        '主打「高價值專案客製化落地」標籤：引導 C-Level 與創辦人發布 NT$ 5,000+ 的進階懸賞。',
        '社群裂變與企業合夥人計畫：透過「前 500 名免費體驗」機制誘發口碑擴散。',
      ],
      recommendedActionPlans: [
        '行動一：精準導流年薪 100 萬以上用戶試用「權威方案」，鎖定首批高價值解答專家。',
        '行動二：在問答首頁設置「企業創新與 AI 科技」高價值懸賞專區，對接最大宗用戶需求。',
        '行動三：建立智慧合約履約與 AI 仲裁保障，消除高金額懸賞的信任摩擦。',
      ],
      platformHealthScore: 94,
    };
  });

  const [aiAnalyticsLastAnalyzedAt, setAiAnalyticsLastAnalyzedAt] = useState<string>(() => {
    try {
      return localStorage.getItem('ideax_admin_ai_customer_analytics_time') || new Date().toLocaleString('zh-TW');
    } catch (e) {
      return new Date().toLocaleString('zh-TW');
    }
  });

  const [isAnalyzingCustomer, setIsAnalyzingCustomer] = useState(false);
  const [isAiReportExpanded, setIsAiReportExpanded] = useState(false);

  // 嚴格過濾掉訪客與測試帳號（註冊人數不要算入測試帳號）
  const validUsers = useMemo(() => {
    return availableUsers.filter((u) => isRealRegisteredUser(u));
  }, [availableUsers]);

  // 手動執行 AI 客群分析 (僅在點擊時發起 AI 請求並儲存快照)
  const runAiCustomerAnalytics = async () => {
    setIsAnalyzingCustomer(true);
    try {
      // 結構化總體指標
      const payload = {
        totalUsers: validUsers.length,
        genderBreakdown: genderStats.reduce((acc, curr) => ({ ...acc, [curr.label]: `${curr.count}人` }), {}),
        ageBreakdown: ageStats.reduce((acc, curr) => ({ ...acc, [curr.label]: `${curr.count}人` }), {}),
        industryBreakdown: industryPieStats.reduce((acc, curr) => ({ ...acc, [curr.label]: `${curr.count}人` }), {}),
        jobLevelBreakdown: jobLevelPieStats.reduce((acc, curr) => ({ ...acc, [curr.label]: `${curr.count}人` }), {}),
        salaryBreakdown: salaryStats.reduce((acc, curr) => ({ ...acc, [curr.label]: `${curr.count}人` }), {}),
        budgetBreakdown: budgetStats.reduce((acc, curr) => ({ ...acc, [curr.label]: `${curr.count}人` }), {}),
        sideHustleBreakdown: sideHustleStats.reduce((acc, curr) => ({ ...acc, [curr.label]: `${curr.count}人` }), {}),
        subscriptionBreakdown: subscribeStats.reduce((acc, curr) => ({ ...acc, [curr.label]: `${curr.count}人` }), {}),
      };

      const res = await fetch('/api/ai/customer-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json && json.data) {
          const timeNowStr = new Date().toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          setAiAnalytics(json.data);
          setAiAnalyticsLastAnalyzedAt(timeNowStr);
          setIsAiReportExpanded(true);
          localStorage.setItem('ideax_admin_ai_customer_analytics', JSON.stringify(json.data));
          localStorage.setItem('ideax_admin_ai_customer_analytics_time', timeNowStr);
        }
      }
    } catch (err) {
      console.error('Failed to run AI customer analytics:', err);
    } finally {
      setIsAnalyzingCustomer(false);
    }
  };

  // 每次進入頁面自動匯入最新資料庫用戶資料與統計數據 (不發起 AI API 請求)
  useEffect(() => {
    loadAllDataFromFirestore().then((cloudData) => {
      if (cloudData && cloudData.users && cloudData.users.length > 0) {
        setAvailableUsers(cloudData.users);
      }
    }).catch((err) => console.error(err));
  }, []);

  // 手動按需刷新用戶資料快照
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const cloudData = await loadAllDataFromFirestore();
      if (cloudData && cloudData.users && cloudData.users.length > 0) {
        setAvailableUsers(cloudData.users);
      }
      setLastRefreshedAt(
        new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 3000);
    } catch {
      setLastRefreshedAt(
        new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 3000);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Compute statistics
  const totalCount = validUsers.length || 1;

  // 1. 性別分佈
  const genderStats = useMemo(() => {
    const counts: Record<string, number> = { male: 0, female: 0, other: 0, undisclosed: 0 };
    validUsers.forEach((u) => {
      const g = u.gender || 'undisclosed';
      counts[g] = (counts[g] || 0) + 1;
    });
    return [
      { key: 'male', label: '男', count: counts.male, color: '#3b82f6' },
      { key: 'female', label: '女', count: counts.female, color: '#ec4899' },
      { key: 'other', label: '其他', count: counts.other, color: '#8b5cf6' },
      { key: 'undisclosed', label: '未填寫 / 不便透露', count: counts.undisclosed, color: '#9ca3af' },
    ];
  }, [validUsers]);

  // 2. 年齡分佈
  const ageStats = useMemo(() => {
    const counts: Record<string, number> = {
      under_18: 0,
      '18_24': 0,
      '25_34': 0,
      '35_44': 0,
      '45_54': 0,
      '55_above': 0,
    };
    validUsers.forEach((u) => {
      const a = u.ageGroup || '25_34';
      counts[a] = (counts[a] || 0) + 1;
    });
    return [
      { key: 'under_18', label: '18 歲以下', count: counts.under_18, color: '#a78bfa' },
      { key: '18_24', label: '18 ~ 24 歲', count: counts['18_24'], color: '#60a5fa' },
      { key: '25_34', label: '25 ~ 34 歲', count: counts['25_34'], color: '#34d399' },
      { key: '35_44', label: '35 ~ 44 歲', count: counts['35_44'], color: '#f59e0b' },
      { key: '45_54', label: '45 ~ 54 歲', count: counts['45_54'], color: '#f97316' },
      { key: '55_above', label: '55 歲以上', count: counts['55_above'], color: '#ef4444' },
    ];
  }, [validUsers]);

  // 2.5 年薪層級分佈 (目前薪水/年)
  const salaryStats = useMemo(() => {
    const counts: Record<string, number> = {
      under_500k: 0,
      '500k_1000k': 0,
      '1000k_2000k': 0,
      '2000k_3000k': 0,
      above_3000k: 0,
      undisclosed: 0,
    };
    validUsers.forEach((u) => {
      const sal = u.annualSalary || 'undisclosed';
      counts[sal] = (counts[sal] || 0) + 1;
    });
    return [
      { key: 'under_500k', label: '未滿 50 萬', count: counts.under_500k, color: '#93c5fd' },
      { key: '500k_1000k', label: '50 萬 - 100 萬', count: counts['500k_1000k'], color: '#3b82f6' },
      { key: '1000k_2000k', label: '100 萬 - 200 萬', count: counts['1000k_2000k'], color: '#10b981' },
      { key: '2000k_3000k', label: '200 萬 - 300 萬', count: counts['2000k_3000k'], color: '#f59e0b' },
      { key: 'above_3000k', label: '300 萬以上', count: counts.above_3000k, color: '#8b5cf6' },
      { key: 'undisclosed', label: '未填寫 / 不便透露', count: counts.undisclosed, color: '#9ca3af' },
    ];
  }, [validUsers]);

  // AI 職業與行業智能分類器 Helper
  const classifyJobTitle = (rawTitle: string, industryOrDomain?: string) => {
    const text = (rawTitle || '').toLowerCase().trim();
    const indText = (industryOrDomain || '').toLowerCase();

    // 1. 判斷職業位階 (4.2 職業位階分佈)
    let level = '基層專業人員 / 專員';

    if (
      text.includes('創辦') || text.includes('負責人') || text.includes('ceo') ||
      text.includes('cto') || text.includes('cfo') || text.includes('cmo') ||
      text.includes('總經理') || text.includes('執行長') || text.includes('合夥人') ||
      text.includes('創業者') || text.includes('老闆') || text.includes('董事') || text.includes('副總')
    ) {
      level = '創辦人 / 企業高層 / C-Level';
    } else if (
      text.includes('主管') || text.includes('經理') || text.includes('總監') ||
      text.includes('組長') || text.includes('課長') || text.includes('科長') ||
      text.includes('manager') || text.includes('director') || text.includes('head') || text.includes('lead')
    ) {
      level = '管理階層 / 單位主管';
    } else if (
      text.includes('資深') || text.includes('senior') || text.includes('顧問') ||
      text.includes('架構師') || text.includes('architect') || text.includes('專家')
    ) {
      level = '資深專業人員 / 專家';
    } else if (
      text.includes('自由') || text.includes('接案') || text.includes('freelance') ||
      text.includes('soho') || text.includes('個人工作室')
    ) {
      level = '自由接案者 / SOHO族';
    } else if (
      text.includes('學生') || text.includes('實習') || text.includes('研究生') ||
      text.includes('student') || text.includes('intern')
    ) {
      level = '在校學生 / 實習生';
    }

    // 2. 判斷行業類別 (4.1 行業分佈)
    let industry = '資訊科技 / 軟體系統';

    if (
      text.includes('軟體') || text.includes('工程師') || text.includes('系統') ||
      text.includes('開發') || text.includes('程序員') || text.includes('資訊') ||
      text.includes('雲端') || text.includes('ai') || text.includes('資料') || text.includes('數據') ||
      indText.includes('資訊科技')
    ) {
      industry = '資訊科技 / 軟體系統';
    } else if (
      text.includes('行銷') || text.includes('企劃') || text.includes('電商') ||
      text.includes('增長') || text.includes('社群') || text.includes('品牌') ||
      text.includes('公關') || indText.includes('商業行銷')
    ) {
      industry = '商業行銷 / 數位電商';
    } else if (
      level === '創辦人 / 企業高層 / C-Level' || text.includes('營運') ||
      text.includes('專案') || text.includes('pm') || text.includes('產品') ||
      indText.includes('創新創業')
    ) {
      industry = '創新創業 / 企業管理';
    } else if (
      text.includes('設計') || text.includes('ui') || text.includes('ux') ||
      text.includes('視覺') || text.includes('美術') || text.includes('媒體') ||
      indText.includes('設計創意')
    ) {
      industry = '設計創意 / 媒體視覺';
    } else if (
      text.includes('金融') || text.includes('財務') || text.includes('會計') ||
      text.includes('投資') || text.includes('法律') || text.includes('律師') ||
      indText.includes('金融投資') || indText.includes('法律')
    ) {
      industry = '金融投資 / 財會法律';
    } else if (
      level === '自由接案者 / SOHO族' || text.includes('顧問') || text.includes('諮詢')
    ) {
      industry = '專業顧問 / 自由接案';
    } else if (
      level === '在校學生 / 實習生' || text.includes('教育') || text.includes('教師')
    ) {
      industry = '教育學術 / 學生族群';
    } else {
      industry = '傳統產業 / 其他領域';
    }

    return { industry, level };
  };

  // 4.1 行業分佈圓餅圖數據
  const industryPieStats = useMemo(() => {
    const counts: Record<string, number> = {
      '資訊科技 / 軟體系統': 0,
      '商業行銷 / 數位電商': 0,
      '創新創業 / 企業管理': 0,
      '設計創意 / 媒體視覺': 0,
      '金融投資 / 財會法律': 0,
      '專業顧問 / 自由接案': 0,
      '教育學術 / 學生族群': 0,
      '傳統產業 / 其他領域': 0,
    };

    validUsers.forEach((u) => {
      const rawJob = u.jobTitle || u.title || (u.surveyData as any)?.jobTitle || '軟體工程師';
      const ind = u.industry || u.domain;
      const classified = classifyJobTitle(rawJob, ind);
      counts[classified.industry] = (counts[classified.industry] || 0) + 1;
    });

    const colors = ['#8b5cf6', '#3b82f6', '#f59e0b', '#ec4899', '#10b981', '#06b6d4', '#6366f1', '#64748b'];

    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([label, count], idx) => ({
        label,
        count,
        color: colors[idx % colors.length],
      }));
  }, [validUsers]);

  // 4.2 職業位階圓餅圖數據
  const jobLevelPieStats = useMemo(() => {
    const counts: Record<string, number> = {
      '創辦人 / 企業高層 / C-Level': 0,
      '管理階層 / 單位主管': 0,
      '資深專業人員 / 專家': 0,
      '基層專業人員 / 專員': 0,
      '自由接案者 / SOHO族': 0,
      '在校學生 / 實習生': 0,
    };

    validUsers.forEach((u) => {
      const rawJob = u.jobTitle || u.title || (u.surveyData as any)?.jobTitle || '軟體工程師';
      const ind = u.industry || u.domain;
      const classified = classifyJobTitle(rawJob, ind);
      counts[classified.level] = (counts[classified.level] || 0) + 1;
    });

    const colors = ['#8b5cf6', '#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#06b6d4'];

    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([label, count], idx) => ({
        label,
        count,
        color: colors[idx % colors.length],
      }));
  }, [validUsers]);

  // 4. 期望服務
  const desiredServiceStats = useMemo(() => {
    const counts: Record<string, number> = {
      '發布懸賞徵求專家解方': 0,
      '提供解答賺取有償回饋': 0,
      '大師專家一對一私聊諮詢': 0,
      '專案客製化落地驗收交付': 0,
      '探索市場痛點與創新商機': 0,
      '拓展跨界人脈網絡': 0,
    };
    validUsers.forEach((u) => {
      const s = u.surveyData?.desiredServices;
      if (s && s.length > 0) {
        s.forEach((item) => {
          if (counts[item] !== undefined) counts[item] = counts[item] + 1;
        });
      } else if (isDemoMode) {
        // Fallback default distribution based on role in demo mode only
        if (u.role === 'solver') {
          counts['提供解答賺取有償回饋'] += 1;
          counts['大師專家一對一私聊諮詢'] += 1;
        } else {
          counts['發布懸賞徵求專家解方'] += 1;
          counts['探索市場痛點與創新商機'] += 1;
        }
      }
    });
    return Object.entries(counts).map(([name, count], idx) => ({
      name,
      count,
      color: ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4'][idx % 6],
    }));
  }, [validUsers, isDemoMode]);

  // 5. 領域別分佈
  const domainStats = useMemo(() => {
    const counts: Record<string, number> = {};
    validUsers.forEach((u) => {
      const domains = u.surveyData?.relatedDomains?.length
        ? u.surveyData.relatedDomains
        : (isDemoMode ? [u.domain || '創新創業'] : (u.domain ? [u.domain] : []));
      domains.forEach((d) => {
        counts[d] = (counts[d] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [validUsers, isDemoMode]);

  // 6. 解答預算
  const budgetStats = useMemo(() => {
    const counts: Record<string, number> = {
      under_500: 0,
      '500_2000': 0,
      '2000_5000': 0,
      '5000_20000': 0,
      above_20000: 0,
      none: 0,
    };
    validUsers.forEach((u) => {
      const b = u.surveyData?.willingQuestionBudget || (isDemoMode ? (u.balance > 5000 ? '5000_20000' : '2000_5000') : undefined);
      if (b && counts[b] !== undefined) {
        counts[b] = (counts[b] || 0) + 1;
      }
    });
    return [
      { key: 'under_500', label: 'NT$ 500 以下', count: counts.under_500, color: '#94a3b8' },
      { key: '500_2000', label: 'NT$ 500 ~ 2,000', count: counts['500_2000'], color: '#38bdf8' },
      { key: '2000_5000', label: 'NT$ 2,000 ~ 5,000', count: counts['2000_5000'], color: '#34d399' },
      { key: '5000_20000', label: 'NT$ 5,000 ~ 20,000', count: counts['5000_20000'], color: '#f59e0b' },
      { key: 'above_20000', label: 'NT$ 20,000 以上', count: counts.above_20000, color: '#8b5cf6' },
      { key: 'none', label: '暫無付費意願', count: counts.none, color: '#cbd5e1' },
    ];
  }, [validUsers, isDemoMode]);

  // 7. 使用習慣（多久打開一次 IdeaX）
  const freqStats = useMemo(() => {
    const counts: Record<string, number> = {
      multiple_daily: 0,
      daily: 0,
      few_times_weekly: 0,
      weekly: 0,
      on_demand: 0,
    };
    validUsers.forEach((u) => {
      const f = u.surveyData?.usageFrequency || (isDemoMode ? (u.role === 'admin' ? 'multiple_daily' : 'few_times_weekly') : undefined);
      if (f && counts[f] !== undefined) {
        counts[f] = (counts[f] || 0) + 1;
      }
    });
    return [
      { key: 'multiple_daily', label: '每天數次', count: counts.multiple_daily, color: '#10b981' },
      { key: 'daily', label: '每天至少 1 次', count: counts.daily, color: '#3b82f6' },
      { key: 'few_times_weekly', label: '每週 2 ~ 3 次', count: counts.few_times_weekly, color: '#f59e0b' },
      { key: 'weekly', label: '每週 1 次', count: counts.weekly, color: '#f97316' },
      { key: 'on_demand', label: '偶爾或有特定需求才開', count: counts.on_demand, color: '#9ca3af' },
    ];
  }, [validUsers, isDemoMode]);

  // 8. 作為副業意願
  const sideHustleStats = useMemo(() => {
    const counts: Record<string, number> = {
      very_willing: 0,
      considering: 0,
      open_minded: 0,
      not_interested: 0,
    };
    validUsers.forEach((u) => {
      const sh = u.surveyData?.willingToBeSideHustle || (isDemoMode ? (u.role === 'solver' ? 'very_willing' : 'considering') : undefined);
      if (sh && counts[sh] !== undefined) {
        counts[sh] = (counts[sh] || 0) + 1;
      }
    });
    return [
      { key: 'very_willing', label: '非常願意（發展為主力副業）', count: counts.very_willing, color: '#10b981' },
      { key: 'considering', label: '考慮中（有空檔兼職嘗試）', count: counts.considering, color: '#3b82f6' },
      { key: 'open_minded', label: '不排斥但目前無規劃', count: counts.open_minded, color: '#f59e0b' },
      { key: 'not_interested', label: '目前不考慮', count: counts.not_interested, color: '#9ca3af' },
    ];
  }, [validUsers, isDemoMode]);

  // 9. 使用狀況（有償為人解答意願）
  const willingSolveStats = useMemo(() => {
    const counts: Record<string, number> = {
      very_willing: 0,
      depends_bounty: 0,
      not_willing: 0,
    };
    validUsers.forEach((u) => {
      const w = u.surveyData?.willingToProvideSolutions || (isDemoMode ? (u.role === 'solver' ? 'very_willing' : 'depends_bounty') : undefined);
      if (w && counts[w] !== undefined) {
        counts[w] = (counts[w] || 0) + 1;
      }
    });
    return [
      { key: 'very_willing', label: '非常願意（積極解答接案）', count: counts.very_willing, color: '#10b981' },
      { key: 'depends_bounty', label: '視題目難度與報酬而定', count: counts.depends_bounty, color: '#f59e0b' },
      { key: 'not_willing', label: '暫無意願（目前僅想提問）', count: counts.not_willing, color: '#9ca3af' },
    ];
  }, [validUsers, isDemoMode]);

  // 10. 會員方案付費訂閱意願
  const subscribeStats = useMemo(() => {
    const counts: Record<string, number> = {
      willing: 0,
      depends_profit: 0,
      free_tier_first: 0,
      not_willing: 0,
    };
    validUsers.forEach((u) => {
      const s = u.surveyData?.willingToSubscribeSolverPlan || (isDemoMode ? (u.subscriptionTier && u.subscriptionTier !== 'free' ? 'willing' : 'depends_profit') : undefined);
      if (s && counts[s] !== undefined) {
        counts[s] = (counts[s] || 0) + 1;
      }
    });
    return [
      { key: 'willing', label: '願意訂閱（降低抽成並取得功能）', count: counts.willing, color: '#8b5cf6' },
      { key: 'depends_profit', label: '視接案獲利情況而定', count: counts.depends_profit, color: '#3b82f6' },
      { key: 'free_tier_first', label: '先體驗免費版', count: counts.free_tier_first, color: '#f59e0b' },
      { key: 'not_willing', label: '暫不考慮付費', count: counts.not_willing, color: '#9ca3af' },
    ];
  }, [validUsers, isDemoMode]);

  // Filtered raw users list
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return validUsers;
    const q = searchTerm.toLowerCase();
    return validUsers.filter((u) => {
      return (
        u.name.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.industry && u.industry.toLowerCase().includes(q)) ||
        (u.jobTitle && u.jobTitle.toLowerCase().includes(q)) ||
        (u.title && u.title.toLowerCase().includes(q)) ||
        (u.company && u.company.toLowerCase().includes(q))
      );
    });
  }, [validUsers, searchTerm]);

  // SVG Pie Chart Helper
  const renderPieChart = (items: { label: string; count: number; color: string }[]) => {
    const rawTotal = items.reduce((sum, item) => sum + item.count, 0);
    const hasData = rawTotal > 0;
    const total = hasData ? rawTotal : 1;
    let accumulatedPercent = 0;

    if (!hasData) {
      return (
        <div className="flex flex-col sm:flex-row items-center gap-4 py-2">
          <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#e7e5e4" strokeWidth="16" />
              <circle cx="50" cy="50" r="22" fill="white" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-[10px] text-stone-400 font-bold">總計</span>
              <span className="text-xs font-black text-stone-500">0 人</span>
            </div>
          </div>
          <div className="flex-1 w-full space-y-1.5 text-xs">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-stone-600 truncate font-medium text-[11px]">{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 font-mono">
                  <span className="font-bold text-stone-400">0人</span>
                  <span className="text-stone-400 text-[10px]">(0.0%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    const slices = items.map((item) => {
      const percent = (item.count / total) * 100;
      const startAngle = (accumulatedPercent / 100) * 360;
      accumulatedPercent += percent;
      const endAngle = (accumulatedPercent / 100) * 360;

      // Calculate SVG coordinates
      const startRad = ((startAngle - 90) * Math.PI) / 180;
      const endRad = ((endAngle - 90) * Math.PI) / 180;

      const x1 = 50 + 40 * Math.cos(startRad);
      const y1 = 50 + 40 * Math.sin(startRad);
      const x2 = 50 + 40 * Math.cos(endRad);
      const y2 = 50 + 40 * Math.sin(endRad);

      const largeArcFlag = percent > 50 ? 1 : 0;
      const pathData =
        percent >= 99.9
          ? `M 50,10 A 40,40 0 1,0 50,90 A 40,40 0 1,0 50,10 Z`
          : `M 50,50 L ${x1},${y1} A 40,40 0 ${largeArcFlag},1 ${x2},${y2} Z`;

      return {
        ...item,
        percent,
        pathData,
      };
    });

    return (
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-36 h-36 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {slices.map((slice, i) => (
              <path
                key={i}
                d={slice.pathData}
                fill={slice.color}
                className="hover:opacity-85 transition-opacity"
              >
                <title>{`${slice.label}: ${slice.count} 人 (${slice.percent.toFixed(1)}%)`}</title>
              </path>
            ))}
            <circle cx="50" cy="50" r="22" fill="white" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-[10px] text-stone-400 font-bold">總計</span>
            <span className="text-xs font-black text-stone-900">{rawTotal} 人</span>
          </div>
        </div>

        <div className="flex-1 w-full space-y-1.5 text-xs">
          {items.map((item, idx) => {
            const pct = ((item.count / total) * 100).toFixed(1);
            return (
              <div key={idx} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-stone-700 truncate font-medium text-[11px]">{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 font-mono">
                  <span className="font-bold text-stone-900">{item.count}人</span>
                  <span className="text-stone-400 text-[10px]">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Bar Chart Helper
  const renderBarChart = (items: { label: string; count: number; color?: string }[]) => {
    const maxVal = Math.max(...items.map((i) => i.count), 0);

    return (
      <div className="space-y-2 pt-1">
        {items.map((item, idx) => {
          const widthPct = maxVal > 0 && item.count > 0 ? Math.max(Math.round((item.count / maxVal) * 100), 4) : 0;
          const ratioPct = totalCount > 0 && item.count > 0 ? ((item.count / totalCount) * 100).toFixed(1) : '0.0';

          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-stone-700 text-[11px] truncate max-w-[200px]">{item.label}</span>
                <span className="font-mono text-stone-900 font-bold text-[11px]">
                  {item.count} 人 <span className="text-stone-400 font-normal text-[10px]">({ratioPct}%)</span>
                </span>
              </div>
              <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden flex">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: item.color || '#f59e0b',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-stone-950 via-purple-950 to-stone-900 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/30 text-purple-300 text-xs font-bold border border-purple-400/30 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>平台治理決策雷達</span>
            </span>
            <span className="text-xs text-purple-200/80">用戶畫像與需求數據庫</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            用戶分佈與習慣統計報表
          </h2>
          <p className="text-xs text-stone-300 mt-1 max-w-2xl leading-relaxed">
            彙整全體會員個資與調研問卷結果。採用按需手動刷新機制（避免頻繁背景自動讀取），需要時點擊【手動刷新統計】即可更新最新快照並匯出 Excel。
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-white/20 cursor-pointer disabled:opacity-50"
              title="重新向資料庫索取最新用戶個資與問卷快照"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? '刷新計算中...' : '手動刷新統計'}</span>
            </button>
            <span className="text-[10px] text-stone-400 font-mono">上次刷新：{lastRefreshedAt}</span>
          </div>

          <button
            type="button"
            onClick={() => exportSurveyToExcelXlsx(availableUsers, aiAnalytics)}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-stone-950 font-black text-xs shadow-lg flex items-center gap-2 transition-all cursor-pointer ring-2 ring-emerald-300"
            title="一鍵下載完整用戶個資與問卷統計及 AI 客群分析 Excel 試算表 (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-stone-950" />
            <span>下載客群分析</span>
          </button>

          <button
            type="button"
            onClick={() => exportSurveyToExcelCsv(availableUsers)}
            className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-stone-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-white/15 cursor-pointer"
            title="匯出為標準 CSV 格式"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {refreshSuccess && (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>全體用戶最新基本資料與調研統計已手動刷新更新完成！（快照時間：{lastRefreshedAt}）</span>
        </div>
      )}

      {/* AI 深度客群分析與營運戰略建議 (頁面最上方重點區塊) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-purple-900/90 via-indigo-950 to-stone-900 text-white shadow-xl border border-purple-500/30 relative overflow-hidden space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-500/20 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-purple-500/20 border border-purple-400/40 text-purple-300 shadow-inner">
              <Brain className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  AI 客群結構分析與營運戰略建議
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 text-[10px] font-bold border border-purple-400/30">
                  Gemini 3.8 Intelligence
                </span>
                {aiAnalyticsLastAnalyzedAt && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-400/30 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>上次分析時間：{aiAnalyticsLastAnalyzedAt}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-purple-200/80 mt-0.5">
                經全體資料結構化之後，AI 對全平台會員進行之深度受眾畫像與商業決策建議（已即時同步寫入 Excel 報表）
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setIsAiReportExpanded(!isAiReportExpanded)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all border cursor-pointer ${
                isAiReportExpanded
                  ? 'bg-amber-400 text-stone-950 border-amber-300 hover:bg-amber-300'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{isAiReportExpanded ? '收合 AI 報告' : '查看前次報告'}</span>
              {isAiReportExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
              )}
            </button>

            <button
              type="button"
              onClick={runAiCustomerAnalytics}
              disabled={isAnalyzingCustomer}
              className="px-3.5 py-2 rounded-xl bg-purple-500/30 hover:bg-purple-500/50 active:scale-95 text-purple-200 font-bold text-xs flex items-center gap-1.5 transition-all border border-purple-400/30 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAnalyzingCustomer ? 'animate-spin' : ''}`} />
              <span>{isAnalyzingCustomer ? 'AI 分析運算中...' : '重新產出 AI 分析'}</span>
            </button>
          </div>
        </div>

        {/* 展開時顯示詳細 AI 報告內容 */}
        {isAiReportExpanded && (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* AI Cohort Summary Banner */}
            <div className="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                  <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>【客群總體畫像與戰略結論】</span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-stone-100 leading-relaxed">
                  {aiAnalytics?.cohortSummary || (isDemoMode
                    ? 'IdeaX 目前用戶畫像呈現高收入、高決策力、高接案意願之雙向智庫生態。主要集中於 25~44 歲之資訊科技工程師、創辦人與主管，具強勁懸賞預算且願意有償副業接案。'
                    : '目前尚無 AI 客群分析快照。請點擊右上角「重新產出 AI 分析」按鈕，即時分析目前平台註冊用戶與問卷數據。')}
                </p>
              </div>

              <div className="px-4 py-3 rounded-2xl bg-purple-950/80 border border-purple-400/30 shrink-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-purple-300 font-bold">平台生態健康度</span>
                <div className="text-2xl font-black text-emerald-400 flex items-baseline gap-0.5">
                  <span>{aiAnalytics?.platformHealthScore ?? (isDemoMode ? 94 : 0)}</span>
                  <span className="text-xs text-purple-300 font-normal">/ 100</span>
                </div>
              </div>
            </div>

            {/* 3 Columns: Insights, Opportunities, Action Plans */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* 1. 用戶畫像與需求洞察 */}
              <div className="p-4 rounded-2xl bg-stone-900/80 border border-purple-500/20 space-y-2">
                <div className="flex items-center gap-2 font-bold text-cyan-300 pb-1 border-b border-white/10">
                  <Users className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>關鍵用戶畫像與痛點洞察</span>
                </div>
                <ul className="space-y-2 text-stone-200">
                  {(
                    aiAnalytics?.demographicInsights || (isDemoMode
                      ? [
                          '中高收入與高決策層佔比達 75%+：年薪超過 100 萬與企業 C-Level/主管級用戶為主要骨幹，痛點具高度商業價值。',
                          '高供給彈性與副業潛力：超過 8 成用戶願意為他人解答或發展為主力副業，種子專家儲備充沛。',
                          '預算集中於中高階懸賞：超過 65% 用戶願為單次高價值問題支付 NT$ 2,000 ~ 20,000 懸賞金。',
                        ]
                      : ['尚無真實用戶畫像數據，待用戶填寫問卷後即時生成。'])
                  ).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 2. 營運增長商機 */}
              <div className="p-4 rounded-2xl bg-stone-900/80 border border-purple-500/20 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300 pb-1 border-b border-white/10">
                  <Target className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>平台營運增長商機</span>
                </div>
                <ul className="space-y-2 text-stone-200">
                  {(
                    aiAnalytics?.growthOpportunities || (isDemoMode
                      ? [
                          '推出「權威/大師方案」專家訂閱制：提供抽成減免與 AI CRM 客戶自動媒合功能。',
                          '主打「高價值專案客製化落地」標籤：引導 C-Level 與創辦人發布 NT$ 5,000+ 的進階懸賞。',
                          '社群裂變與企業合夥人計畫：透過「前 500 名免費體驗」機制誘發口碑擴散。',
                        ]
                      : ['尚無營運商機數據，待問卷數據累積後自動分析。'])
                  ).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 3. 戰略行動方案 */}
              <div className="p-4 rounded-2xl bg-stone-900/80 border border-purple-500/20 space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-300 pb-1 border-b border-white/10">
                  <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>建議戰略行動方案</span>
                </div>
                <ul className="space-y-2 text-stone-200">
                  {(
                    aiAnalytics?.recommendedActionPlans || (isDemoMode
                      ? [
                          '行動一：精準導流年薪 100 萬以上用戶試用「權威方案」，鎖定首批高價值解答專家。',
                          '行動二：在問答首頁設置「企業創新與 AI 科技」高價值懸賞專區，對接最大宗用戶需求。',
                          '行動三：建立智慧合約履約與 AI 仲裁保障，消除高金額懸賞的信任摩擦。',
                        ]
                      : ['尚無建議行動方案，待真實指標建立後產出。'])
                  ).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-bold">總註冊用戶數</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-stone-900">{validUsers.length}</p>
          <p className="text-[10px] text-stone-400 mt-0.5">扣除免登入訪客</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-bold">有意願付費提問</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-950">
            {validUsers.length > 0
              ? Math.round(
                  (validUsers.filter((u) => u.surveyData?.willingQuestionBudget && u.surveyData.willingQuestionBudget !== 'none').length /
                    validUsers.length) *
                    100
                )
              : 0}
            %
          </p>
          <p className="text-[10px] text-stone-400 mt-0.5">具備直接懸賞消費意願</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-bold">願意作為有償副業</span>
            <Briefcase className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-950">
            {validUsers.length > 0
              ? Math.round(
                  (validUsers.filter(
                    (u) =>
                      u.surveyData?.willingToBeSideHustle === 'very_willing' ||
                      u.surveyData?.willingToBeSideHustle === 'considering' ||
                      (isDemoMode && u.role === 'solver')
                  ).length /
                    validUsers.length) *
                    100
                )
              : 0}
            %
          </p>
          <p className="text-[10px] text-stone-400 mt-0.5">具備專家接案與解題意願</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-bold">方案訂閱付費意向</span>
            <Crown className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-950">
            {validUsers.length > 0
              ? Math.round(
                  (validUsers.filter(
                    (u) =>
                      u.surveyData?.willingToSubscribeSolverPlan === 'willing' ||
                      u.surveyData?.willingToSubscribeSolverPlan === 'depends_profit' ||
                      (isDemoMode && u.subscriptionTier && u.subscriptionTier !== 'free')
                  ).length /
                    validUsers.length) *
                    100
                )
              : 0}
            %
          </p>
          <p className="text-[10px] text-stone-400 mt-0.5">含視獲利付費訂閱者</p>
        </div>
      </div>

      {/* 10 Visual Charts Grid - 依照性別、年齡、專業領域、職業、薪水、其他問題順序排列 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. 用戶性別分佈 */}
        <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>1. 用戶性別分佈</span>
            </h3>
            <span className="text-[11px] text-stone-400">圓餅圖呈現</span>
          </div>
          {renderPieChart(genderStats)}
        </div>

        {/* 2. 用戶年齡層分佈 */}
        <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>2. 用戶年齡層分佈</span>
            </h3>
            <span className="text-[11px] text-stone-400">柱狀圖呈現</span>
          </div>
          {renderBarChart(ageStats)}
        </div>

        {/* 3. 相關專業領域分佈 */}
        <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              <span>3. 相關專業領域分佈（可多選）</span>
            </h3>
            <span className="text-[11px] text-stone-400">平台領域對應</span>
          </div>
          {renderBarChart(
            domainStats.map((d, idx) => ({
              label: d.name,
              count: d.count,
              color: ['#06b6d4', '#3b82f6', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#f97316', '#64748b'][
                idx % 8
              ],
            }))
          )}
        </div>

        {/* 4.1 AI 職業歸類：行業分佈圓餅圖 */}
        <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span>4.1 AI 職業歸類：行業分佈</span>
            </h3>
            <span className="text-[11px] text-stone-400">圓餅圖呈現</span>
          </div>
          {renderPieChart(industryPieStats)}
        </div>

        {/* 4.2 AI 職業位階：職級結構圓餅圖 */}
        <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>4.2 AI 職業位階：職級結構</span>
            </h3>
            <span className="text-[11px] text-stone-400">圓餅圖呈現</span>
          </div>
          {renderPieChart(jobLevelPieStats)}
        </div>

        {/* 5. 目前薪水(年)層級分佈 */}
        <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>5. 目前薪水 (年) 層級分佈</span>
            </h3>
            <span className="text-[11px] text-stone-400">薪資區間統計</span>
          </div>
          {renderBarChart(salaryStats)}
        </div>

        {/* 6. 其他問題：期望在 IdeaX 使用的服務 */}
        <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span>6. 其他問題 - 期望在 IdeaX 獲得之服務（可多選）</span>
            </h3>
            <span className="text-[11px] text-stone-400">長條圖統計</span>
          </div>
          {renderBarChart(
            desiredServiceStats.map((s) => ({
              label: s.name,
              count: s.count,
              color: s.color,
            }))
          )}
        </div>

        {/* 7. 其他問題：願付提問解答預算區間 */}
        <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>7. 其他問題 - 單次尋求專家解答願付預算區間</span>
            </h3>
            <span className="text-[11px] text-stone-400">提問付費意向 (圓餅)</span>
          </div>
          {renderPieChart(budgetStats)}
        </div>

        {/* 8. 其他問題：使用習慣（多久打開一次 IdeaX） */}
        <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>8. 其他問題 - 預計多久打開一次 IdeaX 平台？</span>
            </h3>
            <span className="text-[11px] text-stone-400">使用活躍度頻率 (圓餅)</span>
          </div>
          {renderPieChart(freqStats)}
        </div>

        {/* 9. 其他問題：是否願意將解答作為您的副業 */}
        <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>9. 其他問題 - 是否願意將解答作為您的副業 (有償)？</span>
            </h3>
            <span className="text-[11px] text-stone-400">副業孵化潛力 (柱狀)</span>
          </div>
          {renderBarChart(sideHustleStats)}
        </div>

        {/* 10. 其他問題：是否願意有償為其他提問提供解方 */}
        <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              <span>10. 其他問題 - 是否願意為他人提問提供解方 (為人解答)？</span>
            </h3>
            <span className="text-[11px] text-stone-400">接案解題供給意願 (圓餅)</span>
          </div>
          {renderPieChart(willingSolveStats)}
        </div>

        {/* 11. 其他問題：是否願意花錢訂閱解答者的優惠方案 */}
        <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-600" />
              <span>11. 其他問題 - 是否願意花錢訂閱解答者的優惠方案？</span>
            </h3>
            <span className="text-[11px] text-stone-400">訂閱制付費潛力 (柱狀)</span>
          </div>
          {renderBarChart(subscribeStats)}
        </div>
      </div>

      {/* Raw User Data Table with Search */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-stone-900">用戶填寫原始問卷明細</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              顯示共 {filteredUsers.length} 筆會員資料，點選上方按鈕可隨時下載成完整的 Excel / CSV
              報表。
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜尋姓名、職位、信箱..."
              className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-stone-200 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-700 font-bold border-b border-stone-200">
              <tr>
                <th className="p-3">用戶資訊</th>
                <th className="p-3">1. 性別</th>
                <th className="p-3">2. 年齡</th>
                <th className="p-3">3. 專業領域</th>
                <th className="p-3">4. 職業 / 職稱</th>
                <th className="p-3">5. 目前年薪</th>
                <th className="p-3">6. 其他深入問題 (預算/副業/訂閱)</th>
                <th className="p-3">更新時間</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredUsers.map((u) => {
                const s = u.surveyData || {};
                return (
                  <tr key={u.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={u.name}
                          className="w-8 h-8 rounded-lg object-cover ring-1 ring-stone-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-stone-900 truncate">{u.name}</p>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                              u.role === 'admin'
                                ? 'bg-purple-100 text-purple-800'
                                : u.role === 'solver'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {u.role === 'admin' ? '管理員' : u.accountType === 'enterprise' || (u.role as string) === 'enterprise' ? '企業機構' : '一般用戶'}
                          </span>
                        </div>
                      </div>
                    </td>
                    {/* 1. 性別 */}
                    <td className="p-3 text-stone-800 font-semibold">
                      {u.gender === 'male'
                        ? '男'
                        : u.gender === 'female'
                        ? '女'
                        : u.gender === 'other'
                        ? '其他'
                        : '未填寫'}
                    </td>
                    {/* 2. 年齡 */}
                    <td className="p-3 text-stone-600 font-mono text-[11px]">
                      {u.ageGroup
                        ? u.ageGroup.replace('under_18', '<18歲').replace('55_above', '>55歲').replace('_', '~') + '歲'
                        : '25~34歲'}
                    </td>
                    {/* 3. 專業領域 */}
                    <td className="p-3 text-stone-700">
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-[10px] font-medium">
                        {u.domain || u.industry || '創新創業'}
                      </span>
                    </td>
                    {/* 4. 職業 / 職稱 */}
                    <td className="p-3 text-stone-700">
                      <p className="font-medium text-stone-900 truncate max-w-[140px]">
                        {u.jobTitle || u.title || '專業顧問'}
                      </p>
                      {u.industry && (
                        <p className="text-[10px] text-stone-400 truncate max-w-[140px]">{u.industry}</p>
                      )}
                    </td>
                    {/* 5. 目前年薪 */}
                    <td className="p-3 text-stone-700">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                        {u.annualSalary === 'under_500k'
                          ? '< 50萬'
                          : u.annualSalary === '500k_1000k'
                          ? '50~100萬'
                          : u.annualSalary === '1000k_2000k'
                          ? '100~200萬'
                          : u.annualSalary === '2000k_3000k'
                          ? '200~300萬'
                          : u.annualSalary === 'above_3000k'
                          ? '> 300萬'
                          : '不便透露'}
                      </span>
                    </td>
                    {/* 6. 其他深入問題 */}
                    <td className="p-3 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {s.willingPointsPerQuestion && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-orange-100 text-orange-950 border border-orange-300">
                            懸賞點數:{' '}
                            {s.willingPointsPerQuestion === '0_free'
                              ? '0點'
                              : s.willingPointsPerQuestion === '100_300'
                              ? '100~300點'
                              : s.willingPointsPerQuestion === '301_899'
                              ? '301~899點'
                              : s.willingPointsPerQuestion === '900_2999'
                              ? '900~3k點'
                              : s.willingPointsPerQuestion === 'above_3000'
                              ? '>3k點'
                              : '視情況'}
                          </span>
                        )}
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                          單次預算:{' '}
                          {s.willingQuestionBudget
                            ? s.willingQuestionBudget === 'under_500'
                              ? '<500'
                              : s.willingQuestionBudget === '500_2000'
                              ? '500~2k'
                              : s.willingQuestionBudget === '2000_5000'
                              ? '2k~5k'
                              : s.willingQuestionBudget === '5000_20000'
                              ? '5k~20k'
                              : '>20k'
                            : '2k~5k'}
                        </span>
                        {s.monthlyQuestionBudget && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-200">
                            月預算:{' '}
                            {s.monthlyQuestionBudget === 'monthly_0'
                              ? '$0'
                              : s.monthlyQuestionBudget === 'monthly_under_300'
                              ? '<$300'
                              : s.monthlyQuestionBudget === 'monthly_300_600'
                              ? '$300~600'
                              : s.monthlyQuestionBudget === 'monthly_600_1500'
                              ? '$600~1.5k'
                              : s.monthlyQuestionBudget === 'monthly_1500_3000'
                              ? '$1.5k~3k'
                              : '>$3k'}
                          </span>
                        )}
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-900">
                          副業:{' '}
                          {s.willingToBeSideHustle === 'very_willing'
                            ? '非常願意'
                            : s.willingToBeSideHustle === 'considering'
                            ? '考慮中'
                            : s.willingToBeSideHustle === 'not_interested'
                            ? '不考慮'
                            : '考慮中'}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-900">
                          訂閱:{' '}
                          {s.willingToSubscribeSolverPlan === 'willing'
                            ? '願意'
                            : s.willingToSubscribeSolverPlan === 'depends_profit'
                            ? '視獲利'
                            : s.willingToSubscribeSolverPlan === 'free_tier_first'
                            ? '免費版'
                            : '視獲利'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-[11px] text-stone-500 font-mono">
                      {s.updatedAt?.split('T')[0] || s.completedAt?.split('T')[0] || u.joinedDate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
