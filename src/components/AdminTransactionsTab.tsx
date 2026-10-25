import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { isMockTransactionId } from '../data/mockData';
import { Transaction } from '../types';
import { TransactionCertificateModal } from './TransactionCertificateModal';
import { ConsolidatedStatementModal } from './ConsolidatedStatementModal';
import { resolveUserDisplayName } from '../utils/userDisplay';
import {
  Clock,
  Search,
  Filter,
  User as UserIcon,
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  FileEdit,
  Layers,
  Coins,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Tag,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

export interface TransactionCategoryDef {
  key: string;
  label: string;
  shortLabel: string;
  badge: {
    bg: string;
    text: string;
  };
  types: string[];
}

export const TRANSACTION_CATEGORIES: TransactionCategoryDef[] = [
  {
    key: 'custom_payment',
    label: ' 自訂提案支付',
    shortLabel: '提案支付',
    badge: {
      bg: 'bg-blue-100 text-blue-900 border-stone-200',
      text: '自訂提案支付',
    },
    types: ['自訂提案支付', '自訂專案支付', '私聊專案支付', '自訂方案支付', '委託提案付款'],
  },
  {
    key: 'custom_income',
    label: ' 自訂提案收入',
    shortLabel: '提案收入',
    badge: {
      bg: 'bg-emerald-100 text-emerald-900 border-stone-200',
      text: '自訂提案收入',
    },
    types: ['自訂提案收入', '自訂專案收入', '自訂接案收入', '私聊專案收益', '階段交付驗收收益'],
  },
  {
    key: 'payout',
    label: ' 解答採納與拆款收入',
    shortLabel: '採納收入',
    badge: {
      bg: 'bg-emerald-100 text-emerald-900 border-stone-200',
      text: '解答者收益',
    },
    types: ['第三方採納拆款撥付', '階段交付拆款撥付', '解答者收益', '解答採納撥付', '解答採納收益', '解答採納收入', '階段交付收入', '解答收益'],
  },
  {
    key: 'escrow',
    label: ' 階段方案預扣與託管',
    shortLabel: '託管預扣',
    badge: {
      bg: 'bg-amber-100 text-amber-900 border-stone-200',
      text: '託管預扣',
    },
    types: ['階段方案預扣', '階段履約預扣', '第三方階段託管', '委託問題懸賞金託管'],
  },
  {
    key: 'refund',
    label: ' 款項退款返還',
    shortLabel: '交易退款',
    badge: {
      bg: 'bg-rose-100 text-rose-900 border-stone-200',
      text: '款項退款',
    },
    types: [
      '退款',
      '懸賞逾期退款',
      '階段專案退款',
      '自訂提案退款',
      '爭議調解退款',
      '點數儲值退款',
      '解鎖未成案退款',
      '爭議審查退款',
      '爭議申訴退還預扣',
    ],
  },
  {
    key: 'unlock',
    label: ' 方案解鎖與私聊交易',
    shortLabel: '方案解鎖',
    badge: {
      bg: 'bg-indigo-100 text-indigo-900 border-stone-200',
      text: '方案解鎖',
    },
    types: ['方案解鎖', '第三方方案解鎖', '私聊自訂方案交易', '付費解鎖方案'],
  },
  {
    key: 'subscription',
    label: ' 會員訂閱',
    shortLabel: '會員訂閱',
    badge: {
      bg: 'bg-purple-100 text-purple-900 border-stone-200',
      text: '會員訂閱',
    },
    types: ['會員訂閱', '會員方案訂閱', '訂閱會員方案'],
  },
  {
    key: 'deposit',
    label: ' 點數儲值與充值入金',
    shortLabel: '點數儲值',
    badge: {
      bg: 'bg-teal-100 text-teal-900 border-stone-200',
      text: '點數儲值',
    },
    types: ['點數儲值', '錢包儲值', '儲值'],
  },
  {
    key: 'deduction',
    label: ' 點數消費與服務扣抵',
    shortLabel: '點數扣抵',
    badge: {
      bg: 'bg-orange-100 text-orange-900 border-stone-200',
      text: '點數扣抵',
    },
    types: ['點數扣抵', '預扣額折抵解鎖'],
  },
  {
    key: 'withdrawal',
    label: ' 銀行提領出金',
    shortLabel: '銀行提領',
    badge: {
      bg: 'bg-stone-200 text-stone-800 border-stone-300',
      text: '帳戶提領',
    },
    types: ['提領申請', '提現申請', '提領出金'],
  },
  {
    key: 'admin_transfer',
    label: ' 管理員獎勵與系統調度',
    shortLabel: '管理調度',
    badge: {
      bg: 'bg-purple-100 text-purple-900 border-stone-200',
      text: '管理員調度',
    },
    types: ['管理員獎勵轉入', '管理轉入', '系統補償', '平台調度', '獎勵轉入'],
  },
  {
    key: 'rebate',
    label: ' 平台抽成返還與費用減免',
    shortLabel: '抽成返還',
    badge: {
      bg: 'bg-emerald-100 text-emerald-900 border-stone-200',
      text: '抽成返還',
    },
    types: ['抽成返還', '手續費減免返還', '平台服務費返還', '服務費返還'],
  },
  {
    key: 'promotion',
    label: ' 置頂廣告與行銷推播',
    shortLabel: '行銷推播',
    badge: {
      bg: 'bg-pink-100 text-pink-900 border-stone-200',
      text: '行銷推播',
    },
    types: ['置頂廣告', '首頁推播', '全站推播廣告', '行銷曝光宣傳', '推播廣告'],
  },
  {
    key: 'other',
    label: ' 其他雜項收支',
    shortLabel: '其他收支',
    badge: {
      bg: 'bg-stone-100 text-stone-800 border-stone-200',
      text: '其他收支',
    },
    types: ['其他', '雜項收支', '一般收支'],
  },
];

/**
 * 核心分類對應函數：
 * 採用優先級比對，確保精確性（如含有「退款」或「退還」一律歸入爭議審查，不被「預扣」誤攔）
 */
export const getTransactionCategory = (rawType: string): TransactionCategoryDef => {
  const fallback =
    TRANSACTION_CATEGORIES.find((c) => c.key === 'other') ||
    TRANSACTION_CATEGORIES[0];
  const type = (rawType || '').trim();
  if (!type) {
    return fallback;
  }

  // 1. 完全比對已定義類型清單
  for (const cat of TRANSACTION_CATEGORIES) {
    if (cat.types.includes(type)) {
      return cat;
    }
  }

  // 2. 關鍵字優先級比對（順序極關鍵：退款/自訂提案優先於一般收支）
  if (type.includes('自訂提案支付') || type.includes('自訂專案支付') || type.includes('私聊專案支付') || type.includes('委託提案付款')) {
    return TRANSACTION_CATEGORIES.find((c) => c.key === 'custom_payment') || fallback;
  }
  if (type.includes('自訂提案收入') || type.includes('自訂專案收入') || type.includes('自訂接案收入') || type.includes('私聊專案收益') || type.includes('階段交付驗收收益')) {
    return TRANSACTION_CATEGORIES.find((c) => c.key === 'custom_income') || fallback;
  }
  if (type.includes('退款') || type.includes('退還') || type.includes('爭議')) {
    return TRANSACTION_CATEGORIES.find((c) => c.key === 'refund') || fallback;
  }
  if (type.includes('託管') || type.includes('懸賞') || (type.includes('預扣') && !type.includes('折抵'))) {
    return TRANSACTION_CATEGORIES.find((c) => c.key === 'escrow') || fallback;
  }
  if (type.includes('採納') || type.includes('拆款') || type.includes('收益') || type.includes('結算')) {
    return TRANSACTION_CATEGORIES.find((c) => c.key === 'payout') || fallback;
  }
  if (type.includes('解鎖') || type.includes('私聊') || type.includes('方案交易')) {
    return TRANSACTION_CATEGORIES.find((c) => c.key === 'unlock') || fallback;
  }
  if (type.includes('訂閱') || type.includes('會員方案') || type.includes('會員等級')) {
    return TRANSACTION_CATEGORIES.find((c) => c.key === 'subscription') || fallback;
  }
  if (type.includes('儲值') || type.includes('充值') || type.includes('入金')) {
    return TRANSACTION_CATEGORIES.find((c) => c.key === 'deposit') || fallback;
  }
  if (type.includes('扣抵') || type.includes('折抵') || type.includes('消費') || type.includes('支出')) {
    return TRANSACTION_CATEGORIES.find((c) => c.key === 'deduction') || fallback;
  }
  if (type.includes('管理員') || type.includes('調度') || type.includes('管理轉入') || type.includes('獎勵轉入')) {
    return TRANSACTION_CATEGORIES.find((c) => c.key === 'admin_transfer') || fallback;
  }
  if (type.includes('提領') || type.includes('提現') || type.includes('出金')) {
    return TRANSACTION_CATEGORIES.find((c) => c.key === 'withdrawal') || fallback;
  }
  if (type.includes('返還') || type.includes('抽成') || type.includes('手續費')) {
    return TRANSACTION_CATEGORIES.find((c) => c.key === 'rebate') || fallback;
  }
  if (type.includes('推播') || type.includes('置頂') || type.includes('廣告') || type.includes('廣播')) {
    return TRANSACTION_CATEGORIES.find((c) => c.key === 'promotion') || fallback;
  }

  return fallback;
};

export const getTransactionBadge = (type: string) => {
  const cat = getTransactionCategory(type);
  return {
    bg: cat.badge.bg,
    category: cat.badge.text,
    categoryLabel: cat.label,
    groupKey: cat.key,
  };
};

export interface FormattedTransactionItem {
  isIncome: boolean;
  flowType: '收入' | '支出';
  categoryLabel: string;
  cleanTitle: string;
  displayAmount: number;
  amountFormatted: string;
  feeFormatted?: string;
  flowBadgeClass: string;
  categoryBadgeClass: string;
}

export const formatTransactionItem = (tx: Transaction, viewerName?: string): FormattedTransactionItem => {
  const type = (tx.type || '').trim();
  let isIncome = false;
  let categoryLabel = '帳務操作';
  let cleanTitle = tx.relatedQuestionTitle || tx.note || '平台帳務款項';
  let displayAmount = tx.amount || 0;
  let feeFormatted = tx.platformFee > 0 ? `平台服務費 NT$ ${tx.platformFee.toLocaleString()}` : undefined;

  // 1. 判斷收入 vs 支出
  if (type.includes('自訂提案支付') || type.includes('自訂專案支付') || type.includes('私聊專案支付') || type.includes('委託提案付款')) {
    isIncome = false;
    displayAmount = tx.amount || 0;
  } else if (type.includes('自訂提案收入') || type.includes('自訂專案收入') || type.includes('自訂接案收入') || type.includes('私聊專案收益') || type.includes('階段交付驗收收益')) {
    isIncome = true;
    displayAmount = tx.netAmount && tx.netAmount > 0 ? tx.netAmount : Math.max(0, tx.amount - (tx.platformFee || 0));
  } else if (type.includes('儲值')) {
    // 點數儲值是用戶支付現金購買點數，屬於現金支出 (-)
    isIncome = false;
    displayAmount = tx.amount || 0;
  } else if (
    type.includes('退款') ||
    type.includes('退還') ||
    type.includes('轉入') ||
    type.includes('返還')
  ) {
    isIncome = true;
    displayAmount = tx.netAmount && tx.netAmount > 0 ? tx.netAmount : tx.amount;
  } else if (
    type.includes('採納') ||
    type.includes('拆款') ||
    type.includes('收益') ||
    type.includes('結算')
  ) {
    isIncome = true;
    displayAmount = tx.netAmount && tx.netAmount > 0 ? tx.netAmount : Math.max(0, tx.amount - (tx.platformFee || 0));
  } else if (type.includes('方案解鎖') || type.includes('解鎖') || type.includes('自訂方案')) {
    if (viewerName && tx.toUserName === viewerName) {
      isIncome = true;
      displayAmount = tx.netAmount && tx.netAmount > 0 ? tx.netAmount : Math.max(0, tx.amount - (tx.platformFee || 0));
    } else {
      isIncome = false;
      displayAmount = tx.amount;
    }
  } else {
    isIncome = false;
    displayAmount = tx.amount;
  }

  // 2. 項目名稱標準化 (去蕪存菁、階段明確化與退款前綴清晰化)
  const isStaged =
    type.includes('階段') ||
    (tx.relatedQuestionTitle && (tx.relatedQuestionTitle.includes('階段') || tx.relatedQuestionTitle.includes('期') || tx.relatedQuestionTitle.includes('里程碑'))) ||
    (tx.note && (tx.note.includes('階段') || tx.note.includes('期') || tx.note.includes('里程碑')));

  const extractStageInfo = (): string => {
    const rawAll = `${type} ${tx.relatedQuestionTitle || ''} ${tx.note || ''}`;
    const match = rawAll.match(/(第\s*[0-9一二三四五六七八九十]+\s*[期階段步次]|階段\s*[0-9一二三四五六七八九十]+|里程碑\s*[0-9一二三四五六七八九十]+|首期款|中期款|尾款|結案款)/i);
    return match ? match[0].replace(/\s+/g, '') : '分階段';
  };

  if (type.includes('自訂提案支付') || type.includes('自訂專案支付') || type.includes('私聊專案支付') || type.includes('委託提案付款')) {
    categoryLabel = '自訂提案支付';
    const stageTag = isStaged ? `【${extractStageInfo()}支付】` : '支付';
    cleanTitle = tx.relatedQuestionTitle ? `自訂提案${stageTag}：「${tx.relatedQuestionTitle}」` : (tx.note || `委託自訂專案提案${stageTag}`);
  } else if (type.includes('自訂提案收入') || type.includes('自訂專案收入') || type.includes('自訂接案收入') || type.includes('私聊專案收益') || type.includes('階段交付驗收收益')) {
    categoryLabel = '自訂提案收入';
    const stageTag = isStaged ? `【${extractStageInfo()}驗收收入】` : '驗收收益';
    cleanTitle = tx.relatedQuestionTitle ? `自訂提案${stageTag}：「${tx.relatedQuestionTitle}」` : (tx.note || `自訂專案${stageTag}`);
  } else if (type.includes('階段方案預扣') || type.includes('階段履約預扣') || type.includes('第三方階段託管')) {
    categoryLabel = '階段預扣';
    const stageTag = `【${extractStageInfo()}預扣託管】`;
    cleanTitle = tx.relatedQuestionTitle ? `階段專案${stageTag}：「${tx.relatedQuestionTitle}」` : '階段專案履約預扣款項';
  } else if (type.includes('階段交付') || type.includes('階段款項結算')) {
    categoryLabel = '階段收入';
    const stageTag = `【${extractStageInfo()}交付收入】`;
    cleanTitle = tx.relatedQuestionTitle ? `階段專案${stageTag}：「${tx.relatedQuestionTitle}」` : '階段專案驗收交付收入';
  } else if (type.includes('退款') || type.includes('退還') || type.includes('爭議')) {
    categoryLabel = '款項退款';
    const rawContext = `${type} ${tx.relatedQuestionTitle || ''} ${tx.note || ''}`;
    let refundPrefix = '【交易退款】';
    if (rawContext.includes('懸賞') || rawContext.includes('逾期') || rawContext.includes('未採納') || rawContext.includes('痛點')) {
      refundPrefix = '【懸賞逾期退款】';
      categoryLabel = '懸賞逾期退款';
    } else if (rawContext.includes('自訂') || rawContext.includes('私聊') || rawContext.includes('客製') || rawContext.includes('提案')) {
      refundPrefix = '【自訂提案退款】';
      categoryLabel = '自訂提案退款';
    } else if (rawContext.includes('階段') || rawContext.includes('履約') || rawContext.includes('里程碑')) {
      refundPrefix = `【${extractStageInfo()}專案退款】`;
      categoryLabel = '階段專案退款';
    } else if (rawContext.includes('儲值') || rawContext.includes('點數') || rawContext.includes('錢包')) {
      refundPrefix = '【點數儲值退款】';
      categoryLabel = '點數儲值退款';
    } else if (rawContext.includes('爭議') || rawContext.includes('調解') || rawContext.includes('仲裁') || rawContext.includes('和解')) {
      refundPrefix = '【爭議調解退款】';
      categoryLabel = '爭議調解退款';
    } else if (rawContext.includes('解鎖') || rawContext.includes('未成案')) {
      refundPrefix = '【解鎖未成案退款】';
      categoryLabel = '解鎖未成案退款';
    }

    const rawTitle = (tx.relatedQuestionTitle || tx.note || '款項原路返還').replace(/^【[^】]+】\s*/, '');
    cleanTitle = `${refundPrefix} ${rawTitle}`;
  } else if (type.includes('儲值')) {
    categoryLabel = '點數儲值';
    const matchedPrice = (tx.note || tx.relatedQuestionTitle || '').match(/\$(\d+)/);
    const price = matchedPrice ? matchedPrice[1] : tx.amount;
    cleanTitle = `$${price} 點數儲值方案`;
  } else if (type.includes('會員訂閱') || type.includes('會員方案') || type === '會員訂閱' || type === '會員方案訂閱') {
    categoryLabel = '會員訂閱';
    const raw = tx.relatedQuestionTitle || tx.note || '';
    const matchPlan = raw.match(/「([^」]+)」/);
    if (matchPlan) {
      const inner = matchPlan[1].replace(/NT\$\s*/g, '$').replace(/\/月/g, '');
      cleanTitle = `訂閱會員方案「${inner}」`;
    } else {
      cleanTitle = '訂閱會員方案';
    }
  } else if (type.includes('提案懸賞') || type.includes('懸賞託管') || type.includes('懸賞')) {
    categoryLabel = '提案懸賞';
    cleanTitle = tx.relatedQuestionTitle ? `懸賞委託：「${tx.relatedQuestionTitle}」` : '委託問題懸賞金託管';
  } else if (type.includes('採納') || type.includes('拆款') || type.includes('收益')) {
    categoryLabel = '解答收益';
    cleanTitle = tx.relatedQuestionTitle ? `解答採納收益：「${tx.relatedQuestionTitle}」` : '專業解答採納收益拆款';
  } else if (type.includes('解鎖')) {
    if (isIncome) {
      categoryLabel = '方案收益';
      cleanTitle = tx.relatedQuestionTitle ? `方案解鎖收益：「${tx.relatedQuestionTitle}」` : '專案方案解鎖收益';
    } else {
      categoryLabel = '方案解鎖';
      cleanTitle = tx.relatedQuestionTitle ? `購買解鎖方案：「${tx.relatedQuestionTitle}」` : '付費解鎖專案方案';
    }
  } else if (type.includes('提領') || type.includes('提現')) {
    categoryLabel = '銀行提領';
    cleanTitle = tx.bankAccountSnapshot ? `提領至銀行帳戶 (${tx.bankAccountSnapshot})` : '申請提領至銀行帳戶';
  } else if (type.includes('扣抵') || type.includes('折抵')) {
    categoryLabel = '點數扣抵';
    cleanTitle = tx.relatedQuestionTitle ? `點數折抵：「${tx.relatedQuestionTitle}」` : '點數折抵消費';
  } else if (type.includes('轉入')) {
    categoryLabel = '獎勵轉入';
    cleanTitle = tx.note || '管理員獎勵點數轉入';
  } else if (type.includes('返還')) {
    categoryLabel = '抽成返還';
    cleanTitle = tx.note || '平台服務費減免返還（舊紀錄）';
  }

  const amountFormatted = isIncome
    ? `+ NT$ ${(displayAmount || 0).toLocaleString()}`
    : `- NT$ ${(displayAmount || 0).toLocaleString()}`;

  const flowBadgeClass = isIncome
    ? 'bg-emerald-100 text-emerald-800 border-stone-200'
    : 'bg-rose-100 text-rose-800 border-stone-200';

  const categoryBadgeClass = isIncome
    ? 'bg-emerald-50 text-emerald-900 border-stone-200'
    : 'bg-rose-50 text-rose-900 border-stone-200';

  return {
    isIncome,
    flowType: isIncome ? '收入' : '支出',
    categoryLabel,
    cleanTitle,
    displayAmount,
    amountFormatted,
    feeFormatted,
    flowBadgeClass,
    categoryBadgeClass,
  };
};

export const AdminTransactionsTab: React.FC = () => {
  const { transactions, availableUsers, currentUser, isDemoMode, isNoPaymentMode, updateTransactionNote } = useApp();

  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [isStatementSelectMode, setIsStatementSelectMode] = useState(false);
  const [isConsolidatedModalOpen, setIsConsolidatedModalOpen] = useState(false);

  const selectedUser = availableUsers.find((u) => u.id === selectedUserId);

  // 1. 動態搜集並將全站每一筆交易的標註類型歸入所屬大類，確保 100% 呈現在分類名單中，絕無遺漏
  const dynamicCategories = useMemo(() => {
    const map = new Map<string, { cat: TransactionCategoryDef; types: Set<string> }>();
    TRANSACTION_CATEGORIES.forEach((c) => {
      map.set(c.key, { cat: c, types: new Set(c.types) });
    });

    transactions.forEach((tx) => {
      if (!tx || !tx.type || !tx.type.trim()) return;
      const cleanType = tx.type.trim();
      const matchedCat = getTransactionCategory(cleanType);
      if (!matchedCat || !matchedCat.key) return;
      const entry = map.get(matchedCat.key);
      if (entry) {
        entry.types.add(cleanType);
      }
    });

    return Array.from(map.values()).map(({ cat, types }) => ({
      ...cat,
      types: Array.from(types),
    }));
  }, [transactions]);

  // 全站出現過的所有不重複類型集合
  const allUniqueTypes = useMemo(() => {
    const set = new Set<string>();
    dynamicCategories.forEach((cat) => {
      cat.types.forEach((t) => set.add(t));
    });
    return Array.from(set);
  }, [dynamicCategories]);

  // 2. 統計各單項具體類型的交易筆數
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.forEach((tx) => {
      if (!tx) return;
      if ((isNoPaymentMode || !isDemoMode) && isMockTransactionId(tx.id)) return;
      const t = tx.type ? tx.type.trim() : '其他';
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [transactions, isNoPaymentMode, isDemoMode]);

  // 3. 統計各大類群組中現有交易筆數（嚴格按照 getTransactionCategory 映射，無重複計算）
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    dynamicCategories.forEach((c) => {
      counts[c.key] = 0;
    });

    transactions.forEach((tx) => {
      if (!tx) return;
      if ((isNoPaymentMode || !isDemoMode) && isMockTransactionId(tx.id)) return;
      counts.all += 1;
      const cat = getTransactionCategory(tx.type || '');
      if (cat && cat.key) {
        counts[cat.key] = (counts[cat.key] || 0) + 1;
      }
    });

    return counts;
  }, [transactions, dynamicCategories, isNoPaymentMode, isDemoMode]);

  // 4. 複合篩選
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (!tx) return false;
      if ((isNoPaymentMode || !isDemoMode) && isMockTransactionId(tx.id)) {
        return false;
      }
      // 依個別用戶篩選
      if (selectedUserId !== 'all') {
        const matchParty =
          (selectedUser && (tx.fromUserName === selectedUser.name || tx.toUserName === selectedUser.name)) ||
          (tx as any).userId === selectedUserId;
        if (!matchParty) return false;
      }

      // 依交易類型分類篩選（支援大類群組與精準單項篩選）
      if (selectedType !== 'all') {
        if (selectedType.startsWith('group:')) {
          const groupKey = selectedType.replace('group:', '');
          const cat = getTransactionCategory(tx.type || '');
          if (!cat || cat.key !== groupKey) return false;
        } else {
          // 精準單一類型比對
          if (tx.type !== selectedType) return false;
        }
      }

      // 關鍵字搜尋
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = (tx.id || '').toLowerCase().includes(q);
        const matchType = (tx.type || '').toLowerCase().includes(q);
        const matchQTitle = (tx.relatedQuestionTitle || '').toLowerCase().includes(q);
        const matchFrom = (tx.fromUserName || '').toLowerCase().includes(q);
        const matchTo = (tx.toUserName || '').toLowerCase().includes(q);
        const matchNote = (tx.note || '').toLowerCase().includes(q);
        return matchId || matchType || matchQTitle || matchFrom || matchTo || matchNote;
      }

      return true;
    }).sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [transactions, selectedUserId, selectedUser, selectedType, searchQuery, isNoPaymentMode, isDemoMode]);

  const totalFilteredVolume = filteredTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);
  
  // 計算平台收入（平台服務費 + 其他該用戶支付給平台的費用，如會員訂閱、點數儲值等）
  const totalPlatformRevenue = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      if (!t) return acc;
      const typeStr = (t.type || '');
      // 1. 若該筆交易是直接支付給平台（如會員訂閱、點數儲值、付費推播等）
      const isDirectToPlatform =
        typeStr.includes('會員訂閱') ||
        typeStr.includes('會員方案') ||
        typeStr.includes('儲值') ||
        typeStr.includes('推播') ||
        (t.toUserName && (t.toUserName.includes('平台') || t.toUserName.includes('IdeaX') || t.toUserName.includes('金流中心')));

      if (isDirectToPlatform) {
        return acc + (t.amount || 0);
      }

      // 2. 一般懸賞/解答/階段交易中的平台抽成服務費
      if (t.platformFee && t.platformFee > 0) {
        return acc + t.platformFee;
      }

      return acc;
    }, 0);
  }, [filteredTransactions]);

  // 取得目前選取的分類標籤文字
  const currentFilterLabel = useMemo(() => {
    if (selectedType === 'all') return '全部類型 (全選)';
    if (selectedType.startsWith('group:')) {
      const gKey = selectedType.replace('group:', '');
      return dynamicCategories.find((c) => c.key === gKey)?.label || gKey;
    }
    return selectedType;
  }, [selectedType, dynamicCategories]);

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
      {/* 標題與說明 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3.5">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-stone-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600" />
            <span>交易管理</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900">
              全站共 {transactions.length} 筆交易 · {allUniqueTypes.length} 種分類標籤
            </span>
          </h3>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">
            全站各單交易金流稽核紀錄（含懸賞託管、階段拆款、方案解鎖、會員訂閱、點數儲值扣抵、爭議退款與服務費明細），所有已標註類型均按標準大類嚴格歸類，支援一鍵點擊穿透篩選。
          </p>
        </div>

        {selectedType !== 'all' && (
          <button
            type="button"
            onClick={() => setSelectedType('all')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重置分類篩選</span>
          </button>
        )}
      </div>

      {/* 快速大類選取標籤列（支援手機橫向順暢滑動） */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-stone-500 px-0.5">
          <span className="text-[11px] font-bold flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            <span>依大類快速篩選：</span>
          </span>
          <span className="text-[11px] text-stone-400">可左右橫向滑動查閱全部分類</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            type="button"
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              selectedType === 'all'
                ? 'bg-purple-700 text-white shadow-2xs font-semibold ring-2 ring-purple-300'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <span>全部交易</span>
            <span
              className={`text-[11px] tabular-nums px-1.5 py-0.2 rounded-full ${
                selectedType === 'all' ? 'bg-purple-800 text-white' : 'bg-stone-200 text-stone-600'
              }`}
            >
              {categoryCounts.all}
            </span>
          </button>

          {dynamicCategories.map((cat) => {
            const isSelected = selectedType === `group:${cat.key}`;
            const count = categoryCounts[cat.key] || 0;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedType(isSelected ? 'all' : `group:${cat.key}`)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-purple-700 text-white shadow-2xs font-semibold ring-2 ring-purple-300'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[11px] tabular-nums px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-purple-800 text-white' : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 篩選控制器 */}
      <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. 選擇個別用戶 */}
          <div>
            <label className="text-[11px] font-bold text-stone-700 block mb-1">
              查閱指定個別用戶交易：
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 outline-none focus:border-purple-600 cursor-pointer shadow-2xs"
            >
              <option value="all">全站所有用戶交易</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role === 'admin' ? '管理員' : u.accountType === 'enterprise' || (u.role as string) === 'enterprise' ? '企業機構' : '一般用戶'})
                </option>
              ))}
            </select>
          </div>

          {/* 2. 交易類型分類選單（完整涵蓋所有已標註類型，結構化 optgroup） */}
          <div>
            <label className="text-[11px] font-bold text-stone-700 block mb-1 flex items-center justify-between">
              <span>交易類型分類名單：</span>
              <span className="text-[11px] text-purple-700 tabular-nums">共 {allUniqueTypes.length} 種已標註標籤</span>
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 outline-none focus:border-purple-600 cursor-pointer shadow-2xs"
            >
              <option value="all">全選：所有交易類型 ({categoryCounts.all} 筆)</option>

              {/* 依結構化大類排列，每一大類均提供大類彙整全選與旗下具體細分單項 */}
              {dynamicCategories.map((cat) => {
                const groupCount = categoryCounts[cat.key] || 0;
                return (
                  <optgroup key={cat.key} label={`── ${cat.label} (${groupCount} 筆) ──`}>
                    <option value={`group:${cat.key}`}>
                      【大類彙整】{cat.label} (全選 · {groupCount} 筆)
                    </option>
                    {cat.types.map((subType) => {
                      const count = typeCounts[subType] || 0;
                      return (
                        <option key={subType} value={subType}>
                          &nbsp;&nbsp;• {subType} ({count} 筆)
                        </option>
                      );
                    })}
                  </optgroup>
                );
              })}
            </select>
          </div>

          {/* 3. 關鍵字搜尋 */}
          <div>
            <label className="text-[11px] font-bold text-stone-700 block mb-1">
              關鍵字搜尋：
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜尋問題標題、交易類型、ID 或對手方..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-purple-600"
              />
            </div>
          </div>
        </div>

        {/* 統計摘要列 */}
        <div className="pt-2.5 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-stone-600 gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>目前檢視：<strong className="text-stone-900">{selectedUserId === 'all' ? '全站用戶' : selectedUser?.name}</strong></span>
            <span>·</span>
            <span>分類篩選：<strong className="text-purple-900">{currentFilterLabel}</strong></span>
            <span>·</span>
            <span>符合 <strong className="text-purple-700 tabular-nums text-sm">{filteredTransactions.length}</strong> 筆</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 tabular-nums font-bold">
            <span>流水總額：<strong className="text-purple-950 font-semibold">NT$ {totalFilteredVolume.toLocaleString()}</strong></span>
            <span title="平台收入 = 平台抽成服務費 + 該用戶支付給平台的會員訂閱/點數儲值等費用">
              平台收入：<strong className="text-amber-800 font-semibold">NT$ {totalPlatformRevenue.toLocaleString()}</strong>
            </span>
            {!isStatementSelectMode && (
              <button
                type="button"
                onClick={() => setIsStatementSelectMode(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0 ml-1 font-sans"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>整合產出對帳單</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. 多選數筆交易對帳單操作列 (僅在點擊整合產出對帳單後展開) */}
      {isStatementSelectMode && (
        <div className="p-3.5 bg-stone-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm border border-stone-800 animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-stone-50 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-stone-100">多選交易對帳單模式</span>
                <span className="text-[11px] tabular-nums px-2 py-0.5 rounded-full bg-stone-50 text-amber-300 font-bold border border-amber-400/30">
                  已勾選 {selectedTxIds.size} / {filteredTransactions.length} 筆
                </span>
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">勾選下方交易，即可一鍵匯出彙總統計、報稅抬頭與官方審計章的統一對帳單</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (selectedTxIds.size === filteredTransactions.length && filteredTransactions.length > 0) {
                  setSelectedTxIds(new Set());
                } else {
                  setSelectedTxIds(new Set(filteredTransactions.map((t) => t.id)));
                }
              }}
              className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs transition-colors cursor-pointer border border-stone-700 active:scale-95"
            >
              {selectedTxIds.size === filteredTransactions.length && filteredTransactions.length > 0
                ? '取消全選'
                : '全選目前交易'}
            </button>

            <button
              type="button"
              disabled={selectedTxIds.size === 0}
              onClick={() => setIsConsolidatedModalOpen(true)}
              className={`px-4 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
                selectedTxIds.size > 0
                  ? 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 cursor-pointer active:scale-95'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700 opacity-60'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>整合產出對帳單 {selectedTxIds.size > 0 ? `(${selectedTxIds.size} 筆)` : ''}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsStatementSelectMode(false);
                setSelectedTxIds(new Set());
              }}
              className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs transition-colors cursor-pointer border border-stone-700"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 交易紀錄清單 */}
      <div className="space-y-2.5">
        {filteredTransactions.length === 0 ? (
          <div className="p-10 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-2">
            <Clock className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-xs font-bold text-stone-600">無相符交易紀錄</p>
            <p className="text-[11px] text-stone-400">目前選擇的分類條件未包含任何交易，可點擊上方「全部交易」或「重置分類篩選」。</p>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const isSelected = selectedTxIds.has(tx.id);
            const badge = getTransactionBadge(tx.type);
            const isTypeActive = selectedType === tx.type;
            const isGroupActive = selectedType === `group:${badge.groupKey}`;
            const itemInfo = formatTransactionItem(tx, currentUser?.name);

            return (
              <div
                key={tx.id}
                onClick={() => {
                  if (isStatementSelectMode) {
                    setSelectedTxIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(tx.id)) next.delete(tx.id);
                      else next.add(tx.id);
                      return next;
                    });
                  }
                }}
                className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border transition-all space-y-2 ${
                  isStatementSelectMode && isSelected
                    ? 'border-amber-400 ring-2 ring-amber-300 shadow-xs bg-stone-50 cursor-pointer'
                    : isStatementSelectMode
                    ? 'border-stone-200 hover:border-stone-200 cursor-pointer shadow-2xs'
                    : 'border-stone-200 hover:border-stone-200 shadow-2xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* 多選勾選框 (僅在對帳模式開啟時顯示) */}
                    {isStatementSelectMode && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          setSelectedTxIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(tx.id)) next.delete(tx.id);
                            else next.add(tx.id);
                            return next;
                          });
                        }}
                        title="勾選此筆交易納入統一對帳單"
                        className="w-4 h-4 text-amber-600 rounded border-stone-300 focus:ring-amber-500 cursor-pointer shrink-0"
                      />
                    )}

                    {/* 左上角項目分類標籤（依收入綠色、支出紅色區分） */}
                    <button
                      type="button"
                      onClick={() => setSelectedType(isTypeActive ? 'all' : tx.type)}
                      title="點擊依此交易類型篩選"
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                        itemInfo.isIncome
                          ? 'bg-emerald-100 text-emerald-800 border-stone-200'
                          : 'bg-rose-100 text-rose-800 border-stone-200'
                      } ${
                        isTypeActive ? 'ring-2 ring-purple-600 font-semibold' : 'hover:opacity-80'
                      }`}
                    >
                      {tx.type === '錢包儲值'
                        ? '點數儲值'
                        : tx.type === '會員方案訂閱' || tx.type === '訂閱會員方案'
                        ? '會員訂閱'
                        : tx.type.includes('第三方') || tx.type.includes('拆款') || tx.type.includes('撥付') || tx.type.includes('撥款')
                        ? itemInfo.categoryLabel
                        : tx.type}
                    </button>

                    {/* 所屬大類徽章（點擊可快速依該大類群組篩選） */}
                    <button
                      type="button"
                      onClick={() => setSelectedType(isGroupActive ? 'all' : `group:${badge.groupKey}`)}
                      title={`歸類大類：${badge.categoryLabel}（點擊依此大類篩選）`}
                      className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                        isGroupActive
                          ? 'bg-purple-100 text-purple-900 border-stone-200 font-semibold'
                          : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                      }`}
                    >
                      {badge.category}
                    </button>

                    <span className="font-semibold text-stone-900" title={itemInfo.cleanTitle}>
                      <span className="sm:hidden">
                        {itemInfo.cleanTitle.length > 24
                          ? `${itemInfo.cleanTitle.slice(0, 24)}...`
                          : itemInfo.cleanTitle}
                      </span>
                      <span className="hidden sm:inline">
                        {itemInfo.cleanTitle}
                      </span>
                    </span>
                    <span className="text-[11px] tabular-nums text-stone-400">ID: {tx.id}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-left sm:text-right">
                      <span className={`text-base font-semibold tabular-nums block ${itemInfo.isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {itemInfo.amountFormatted}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 交易對手方與狀態 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-stone-500 pt-1.5 border-t border-stone-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>付款方：<strong className="text-stone-700">{resolveUserDisplayName(tx.fromUserId, tx.fromUserName, availableUsers) || '委託提問者'}</strong></span>
                    <span className="text-stone-400">→</span>
                    <span>收款方：<strong className="text-stone-700">{resolveUserDisplayName(tx.toUserId, tx.toUserName, availableUsers) || '受款專家'}</strong></span>
                    {tx.paymentMethod && <span className="text-stone-400">· 方式：{tx.paymentMethod}</span>}
                    {tx.bankAccountSnapshot && (
                      <span className="text-stone-400 tabular-nums text-[11px]">· 帳戶：{tx.bankAccountSnapshot}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded border border-stone-200">
                      {tx.status || '已完成'}
                    </span>
                    {tx.payoutStatus && (
                      <span className="text-[11px] font-bold text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded">
                        {tx.payoutStatus}
                      </span>
                    )}
                    <span className="tabular-nums text-stone-400">{tx.createdAt ? tx.createdAt.split('T')[0] : ''}</span>
                  </div>
                </div>

                {/* 管理員專屬明細備註欄位（可隨時填寫/修改，並可透過上方搜尋框即時搜尋） */}
                <div className="pt-2 border-t border-stone-100 flex items-center gap-2 text-xs">
                  <span className="text-[11px] font-bold text-stone-500 shrink-0 flex items-center gap-1">
                    <FileEdit className="w-3.5 h-3.5 text-purple-600" />
                    <span>明細備註：</span>
                  </span>
                  <input
                    type="text"
                    value={tx.note || ''}
                    onChange={(e) => updateTransactionNote(tx.id, e.target.value)}
                    placeholder="點擊填寫管理員明細備註（填寫後可直接在上方搜尋框搜尋）..."
                    className="w-full bg-stone-50 hover:bg-white focus:bg-white border border-stone-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-200 rounded-xl px-3 py-1.5 text-xs text-stone-800 placeholder:text-stone-400 outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 多筆交易統一對帳單 Modal */}
      {isConsolidatedModalOpen && currentUser && (
        <ConsolidatedStatementModal
          transactions={transactions.filter((t) => selectedTxIds.has(t.id))}
          currentUser={currentUser}
          onClose={() => setIsConsolidatedModalOpen(false)}
        />
      )}
    </div>
  );
};
