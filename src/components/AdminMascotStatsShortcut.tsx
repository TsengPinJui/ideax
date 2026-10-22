import React from 'react';
import { Sparkles, ChevronRight } from 'lucide-react';
import { requestFocusMascotStats } from '../utils/adminShortcuts';

/** 儀表板統計區的捷徑：跳到「AI-CRM 與 Agent 測試」裡的小燈泡互動統計 */
export const AdminMascotStatsShortcut: React.FC<{ onGo: () => void }> = ({ onGo }) => (
  <button
    type="button"
    onClick={() => { requestFocusMascotStats(); onGo(); }}
    className="w-full p-3.5 sm:p-4 rounded-2xl bg-stone-50 border border-stone-200 hover:border-amber-400 hover:shadow-xs text-left transition-all cursor-pointer flex items-center gap-3 group"
  >
    <span className="w-9 h-9 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center shrink-0">
      <Sparkles className="w-5 h-5" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-semibold text-stone-900">小燈泡互動統計</span>
      <span className="block text-[11px] text-stone-600 mt-0.5">曝光、點擊率、提問、轉介到各功能的比例</span>
    </span>
    <ChevronRight className="w-5 h-5 text-amber-700 shrink-0 transition-transform group-hover:translate-x-0.5" />
  </button>
);

export default AdminMascotStatsShortcut;
