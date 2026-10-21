import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { duohuiHoot } from './agentVoices';

/**
 * 官方客服多慧：在點數、儲值、驗收這些容易卡住的頁面，從左下角探頭問「有問題嗎？交給我！」
 * - 每個頁面每次瀏覽（分頁開著期間）只出現一次，避免一直打擾
 * - 放在左下角，和右下角的小燈泡錯開；手機上避開底部導覽列
 * - 點「問多慧」打開客服視窗
 */
type Props = {
  /** 用來記錄這一頁已經探頭過（同一個分頁期間不再出現） */
  pageKey: string;
  message: string;
  delayMs?: number;
};

const SHOW_MS = 14000;

export const DuohuiPeek: React.FC<Props> = ({ pageKey, message, delayMs = 6000 }) => {
  const { openCustomerService, mascotConfig, isCustomerServiceOpen } = useApp();
  const [shown, setShown] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const key = `ideax_duohui_peek_${pageKey}`;

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(key) === '1'; } catch {}
    if (seen) return;
    const t = window.setTimeout(() => {
      try { sessionStorage.setItem(key, '1'); } catch {}
      setShown(true);
      if (mascotConfig?.soundEnabled !== false) duohuiHoot(); // 操作引導：出聲提醒一次
    }, delayMs);
    return () => window.clearTimeout(t);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const hide = () => {
    setLeaving(true);
    window.setTimeout(() => setShown(false), 320);
  };

  useEffect(() => {
    if (!shown) return;
    const t = window.setTimeout(hide, SHOW_MS);
    return () => window.clearTimeout(t);
  }, [shown]);

  // 客服視窗打開了就不用再探頭
  useEffect(() => { if (shown && isCustomerServiceOpen) hide(); }, [isCustomerServiceOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!shown) return null;
  return (
    <div
      className={`fixed left-2 sm:left-5 bottom-[76px] sm:bottom-5 z-[65] flex items-end gap-1 pointer-events-none transition-all duration-300 ease-out ${
        leaving ? 'translate-y-6 opacity-0' : 'translate-y-0 opacity-100 animate-in slide-in-from-bottom-8 fade-in duration-500'
      }`}
      role="status"
    >
      <img src="/agents/duohui/question.webp" alt="多慧" className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-md pointer-events-auto" />
      <div className="relative mb-8 sm:mb-10 max-w-[10.5rem] sm:max-w-[15rem] rounded-2xl rounded-bl-sm bg-white border border-emerald-200 shadow-lg px-3 py-2.5 pointer-events-auto">
        <button type="button" onClick={hide} aria-label="關閉" className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-stone-800 text-white flex items-center justify-center cursor-pointer hover:bg-stone-700">
          <X className="w-3 h-3" />
        </button>
        <p className="text-xs font-bold text-stone-800 leading-relaxed">{message}</p>
        <button
          type="button"
          onClick={() => { hide(); openCustomerService(); }}
          className="mt-2 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black cursor-pointer"
        >
          問多慧
        </button>
      </div>
    </div>
  );
};

export default DuohuiPeek;
