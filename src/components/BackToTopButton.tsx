import React, { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { useMascotExpanded } from './mascot/mascotPresence';

/**
 * 瀏覽卡片的頁面：往下捲超過約一個半螢幕後，右下角出現「回到頂部」
 * - 小燈泡展開時放在它左邊；小燈泡收合（或沒顯示）時靠右（手機在底部導覽列上方）
 */
export const BackToTopButton: React.FC = () => {
  const [show, setShow] = useState(false);
  const mascotExpanded = useMascotExpanded();
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; setShow(window.scrollY > Math.max(600, window.innerHeight * 1.5)); });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  const toTop = () => {
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="回到頂部"
      title="回到頂部"
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
      className={`fixed z-40 ${mascotExpanded ? 'right-28 lg:right-48' : 'right-3 lg:right-6'} bottom-[calc(4.6rem+env(safe-area-inset-bottom))] lg:bottom-6 w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-white/95 border border-stone-200 text-stone-700 hover:text-stone-950 hover:border-stone-400 shadow-md flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
      }`}
    >
      <ArrowUp className="w-4 h-4 stroke-[2.5]" />
      <span className="text-[9px] font-black leading-none mt-0.5">頂部</span>
    </button>
  );
};

export default BackToTopButton;
