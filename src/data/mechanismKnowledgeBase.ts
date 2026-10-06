export interface MechanismArticle {
  id: string;
  badge: string;
  title: string;
  summary: string;
  content?: string;
}

export const MECHANISM_ARTICLES: MechanismArticle[] = [
  {
    id: 'mech-1',
    badge: '第三方安全託管',
    title: '懸賞託管與履約驗收制度',
    summary: '提問者發布高額懸賞時，款項暫託管於第三方金流與平台保障帳戶；方案經採納驗收後，系統即刻發動自動拆款撥付。',
  },
  {
    id: 'mech-2',
    badge: '雙向智慧配對',
    title: 'AI 軍師與專家精準觸達',
    summary: '藉由語意分析與技能標籤，系統即時通知最合適之認證專家與解答者，大幅提升解題效率與專業滿意度。',
  },
  {
    id: 'mech-3',
    badge: '爭議調解機制',
    title: '公正第三方爭議申訴處置',
    summary: '針對交付品質或未成案之爭議，設立專業審查委員會與退款調解標準SOP，保障買賣雙方智慧財產與資金安全。',
  },
];
