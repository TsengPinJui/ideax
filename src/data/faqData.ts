import { FaqItem } from '../types';

export const INITIAL_FAQS: FaqItem[] = [
  {
    id: 'faq-01',
    category: '帳戶與身分',
    question: '會員專屬 ID (UID) 是什麼？如何查詢與使用？',
    answer: '每位用戶註冊時系統會自動賦予一組全站獨一無二的專屬會員編號（例如 ID: user-xxx 或 Google 專屬 UID），存於雲端資料庫。您可以在「個人中心」頂部與「個人資料頁」查看，並點擊一鍵複製。此編號可用於客服快速諮詢對帳、好友私訊媒合以及爭議申訴報單。',
    tags: ['UID', '會員編號', '個人中心'],
    helpfulCount: 48,
    source: 'system',
  },
  {
    id: 'faq-02',
    category: '帳戶與身分',
    question: '如何切換「提問者」與「解答者」身分？',
    answer: 'IdeaX 支援雙身分自由切換。請點擊右上角「個人中心」，在頂部個人姓名旁點選「切換身分」按鈕即可在 1 秒內無縫轉換。若想接案賺取收益，建議前往「個人資料」補齊專長與實名認證，即可解鎖認證專家接案權限。',
    tags: ['身分切換', '專家接案', '角色'],
    helpfulCount: 62,
    source: 'system',
  },
  {
    id: 'faq-03',
    category: '金流與點數',
    question: '平台點數如何計算？是否支援第三方支付？',
    answer: '平台的點數與新台幣為 1:1 等值（1 點 = NT$ 1）。支援信用卡、ATM 虛擬帳號以及各大第三方金流直接付款。在免金流測試環境下，可自由免點數體驗完整提案與解鎖流程；在正式環境下，款項會由平台進行託管保護，保障交易安全。',
    tags: ['點數', '匯率', '付款方式', '金流'],
    helpfulCount: 75,
    source: 'system',
  },
  {
    id: 'faq-04',
    category: '金流與點數',
    question: '解答者完成案體驗收後，收益款項何時入帳與提領？',
    answer: '當委託人確認驗收後，該筆懸賞款項會立即撥入解答者的「平台帳戶餘額」。解答者可於個人中心「帳務管理」綁定銀行帳戶並申請提領。申請後系統將於 1~3 個工作天內由合作銀行匯入您的指定帳戶。',
    tags: ['撥款', '結算', '提領', '工作天'],
    helpfulCount: 89,
    source: 'system',
  },
  {
    id: 'faq-05',
    category: '提問與媒合',
    question: '發布問題後如果沒有滿意的解答，懸賞金會退還嗎？',
    answer: '若問題在指定期限內無人解答，或解答內容均未達驗收標準，提問方可申請「未採納關閉」或「爭議調解仲裁」。經平台客服確認無有效成果交付後，託管的懸賞金將全額或按仲裁比例退還至您的帳戶餘額中。',
    tags: ['退款', '未滿意', '懸賞保障', '仲裁'],
    helpfulCount: 54,
    source: 'system',
  },
  {
    id: 'faq-06',
    category: '提問與媒合',
    question: '聊天室中的「自訂提案 (Custom Offer)」如何運作？',
    answer: '專家可以在與委託人的私訊聊天室中，針對客製化需求發送「自訂報價提案」。委託人在聊天室點擊「接受提案並付款」後，款項即由平台託管啟動專案；待專家完成成果交付並由委託人驗收後，款項方會結算撥出。',
    tags: ['自訂提案', '聊天室', '報價', '客製化'],
    helpfulCount: 41,
    source: 'system',
  },
  {
    id: 'faq-07',
    category: '爭議與仲裁',
    question: '遭遇專案成果爭議或惡意拖延時，如何申請仲裁？',
    answer: '若雙方在專案履約或成果驗收上產生認知分歧，提問方或解答方皆可在專案頁面或透過「客服與回報」點擊「申請爭議仲裁與開立工單」。平台仲裁委員會將調閱聊天室對話與交付檔案，依合約原則判定退款或按比例劃撥。',
    tags: ['爭議申訴', '仲裁調解', '工單', '合約保護'],
    helpfulCount: 66,
    source: 'system',
  },
];

export function searchFaqs(query: string, faqs: FaqItem[] = INITIAL_FAQS): FaqItem[] {
  if (!query || !query.trim()) return faqs;
  const q = query.toLowerCase().trim();
  return faqs.filter(
    (item) =>
      item.question.toLowerCase().includes(q) ||
      item.answer.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.tags?.some((t) => t.toLowerCase().includes(q))
  );
}
