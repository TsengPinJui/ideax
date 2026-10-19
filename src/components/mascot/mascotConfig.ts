/** 燈泡吉祥物全站設定（存於 platform_settings/global.mascotConfig，僅管理員可寫入） */
export interface MascotConfig {
  /** 全站顯示吉祥物 */
  enabled: boolean;
  /** 手機版也顯示 */
  showOnMobile: boolean;
  /** 開啟提問對話（轉給三位 Dify 助理） */
  chatEnabled: boolean;
  /** 音效（發亮叮鈴聲、說話聲） */
  soundEnabled: boolean;
  /** 對話泡泡預設文字 */
  bubbleText: string;
  /** 多日未上線：超過幾天沒來會傷心哭泣 */
  sadAfterDays: number;
  /** 想你時說的話 */
  sadText: string;
  /** 果凍彈性（越高越結實） */
  firmness: number;
  /** 阻尼（越高越快停） */
  damping: number;
  /** 晃動幅度 */
  wobble: number;
}

export const DEFAULT_MASCOT_CONFIG: MascotConfig = {
  enabled: true,
  showOnMobile: true,
  chatEnabled: true,
  soundEnabled: true,
  bubbleText: '對什麼主題有興趣呢？客服問題也可以問我~',
  sadAfterDays: 3,
  sadText: '好久沒上來找我玩，有點想你...',
  firmness: 120,
  damping: 2.6,
  wobble: 0.9,
};

export const MASCOT_LIMITS = {
  firmness: { min: 50, max: 280, step: 5 },
  damping: { min: 0.6, max: 9, step: 0.1 },
  wobble: { min: 0.2, max: 1.8, step: 0.05 },
  sadAfterDays: { min: 1, max: 60, step: 1 },
} as const;

const clampNum = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

const cleanText = (v: unknown, fallback: string, max = 60) => {
  const s = typeof v === 'string' ? v.trim().slice(0, max) : '';
  return s || fallback;
};

/** 把任何來源（雲端、localStorage、表單）的設定整理成合法值 */
export function normalizeMascotConfig(raw: unknown): MascotConfig {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_MASCOT_CONFIG;
  return {
    enabled: typeof r.enabled === 'boolean' ? r.enabled : d.enabled,
    showOnMobile: typeof r.showOnMobile === 'boolean' ? r.showOnMobile : d.showOnMobile,
    chatEnabled: typeof r.chatEnabled === 'boolean' ? r.chatEnabled : d.chatEnabled,
    soundEnabled: typeof r.soundEnabled === 'boolean' ? r.soundEnabled : d.soundEnabled,
    bubbleText: cleanText(r.bubbleText, d.bubbleText),
    sadAfterDays: Math.round(clampNum(r.sadAfterDays, MASCOT_LIMITS.sadAfterDays.min, MASCOT_LIMITS.sadAfterDays.max, d.sadAfterDays)),
    sadText: cleanText(r.sadText, d.sadText),
    firmness: clampNum(r.firmness, MASCOT_LIMITS.firmness.min, MASCOT_LIMITS.firmness.max, d.firmness),
    damping: clampNum(r.damping, MASCOT_LIMITS.damping.min, MASCOT_LIMITS.damping.max, d.damping),
    wobble: clampNum(r.wobble, MASCOT_LIMITS.wobble.min, MASCOT_LIMITS.wobble.max, d.wobble),
  };
}

/** 管理員調整滑桿時即時預覽（尚未儲存），吉祥物會監聽這個事件 */
export const MASCOT_PREVIEW_EVENT = 'ideax:mascot-preview';
/** 小燈泡對話框的功能捷徑：只允許這些網站內的目的地（伺服器送來其他值會被忽略） */
export const MASCOT_NAVIGATE_EVENT = 'ideax:mascot-navigate';
export const MASCOT_NAV_TARGETS = new Set([
  'explore', 'solvers', 'headhunter', 'membership', 'my_projects', 'ai_crm', 'mailto',
  'dash:points_receivables', 'dash:subscriptions', 'dash:profile', 'dash:real_name_auth', 'dash:expert_certification', 'dash:customer_service_report',
]);

/** 其他地方要讓吉祥物開心（登入、發布成功等） */
export const MASCOT_CHEER_EVENT = 'ideax:mascot-cheer';

export function cheerMascot(text?: string) {
  try {
    window.dispatchEvent(new CustomEvent(MASCOT_CHEER_EVENT, { detail: { text } }));
  } catch {}
}
