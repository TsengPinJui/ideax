import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyableUserIdProps {
  userId: string;
  prefix?: string;
  className?: string;
  showPrefix?: boolean;
}

export const CopyableUserId: React.FC<CopyableUserIdProps> = ({
  userId,
  prefix = 'ID: ',
  className = '',
  showPrefix = true,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!userId) return;
    try {
      navigator.clipboard.writeText(userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  if (!userId) return null;

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`點擊複製用戶 ID: ${userId}`}
      className={`inline-flex items-center gap-1.5 font-mono text-[10.5px] text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 px-2 py-0.5 rounded-md border border-stone-200/80 transition-all cursor-pointer group active:scale-95 ${className}`}
    >
      <span className="truncate">
        {showPrefix ? prefix : ''}#{userId}
      </span>
      {copied ? (
        <span className="inline-flex items-center gap-0.5 text-emerald-600 font-bold text-[9.5px]">
          <Check className="w-3 h-3 text-emerald-600" />
          <span>已複製</span>
        </span>
      ) : (
        <Copy className="w-2.5 h-2.5 text-stone-400 group-hover:text-amber-700 shrink-0 transition-colors" />
      )}
    </button>
  );
};
