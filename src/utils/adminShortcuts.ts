/**
 * 管理儀表板的捷徑：從統計區直接跳到「小燈泡互動統計」
 * 小燈泡統計放在「AI-CRM 與 Agent 測試」分頁的小燈泡設定區塊裡（預設收合），
 * 所以先記一個旗標，分頁打開後由該區塊自己展開並捲動到統計。
 */
export const FOCUS_MASCOT_STATS_EVENT = 'ideax:focus-mascot-stats';
export const OPEN_DASHBOARD_TAB_EVENT = 'ideax:open-dashboard-tab';
const FLAG = 'ideax_focus_mascot_stats';

export function requestFocusMascotStats() {
  try { sessionStorage.setItem(FLAG, '1'); } catch {}
  try { window.dispatchEvent(new CustomEvent(FOCUS_MASCOT_STATS_EVENT)); } catch {}
}

/** 讀一次就清掉 */
export function takeFocusMascotStatsFlag(): boolean {
  try {
    const v = sessionStorage.getItem(FLAG) === '1';
    if (v) sessionStorage.removeItem(FLAG);
    return v;
  } catch {
    return false;
  }
}

/** 從獨立的管理員頁面，請 App 打開會員後台的某個管理分頁 */
export function openDashboardTab(tab: 'admin_aicrm') {
  try { window.dispatchEvent(new CustomEvent(OPEN_DASHBOARD_TAB_EVENT, { detail: { tab } })); } catch {}
}
