import React, { useEffect, useState } from 'react';

/** 長清單分批顯示：一次 pageSize 筆，底下「顯示更多」。清單內容變了（搜尋、篩選）就回到第一批。 */
export function usePagedList<T>(list: T[], pageSize = 20, resetKey?: unknown) {
  const [count, setCount] = useState(pageSize);
  useEffect(() => { setCount(pageSize); }, [pageSize, resetKey, list.length]);
  return { visible: list.slice(0, count), hasMore: list.length > count, remaining: Math.max(0, list.length - count), showMore: () => setCount((c) => c + pageSize) };
}

export const ShowMoreButton: React.FC<{ remaining: number; onClick: () => void; pageSize?: number }> = ({ remaining, onClick, pageSize = 20 }) =>
  remaining > 0 ? (
    <div className="flex justify-center pt-2">
      <button
        type="button"
        onClick={onClick}
        className="h-9 px-4 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-[13px] text-stone-700 cursor-pointer"
      >
        顯示更多（還有 {remaining} 筆，每次 {pageSize} 筆）
      </button>
    </div>
  ) : null;
