import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { getFormattedPlatformId, getPlatformIdBadge } from '../services/userIdService';

interface CopyableUserIdProps {
  userId: string;
  prefix?: string;
  className?: string;
  showPrefix?: boolean;
  showBadge?: boolean;
}

export const CopyableUserId: React.FC<CopyableUserIdProps> = ({
  userId,
  prefix = 'ID: ',
  className = '',
  showPrefix = true,
  showBadge = false,
}) => {
  const [copied, setCopied] = useState(false);

  // 轉換為標準 10 碼（一般用戶 c / 管理員 a / 企業機構 b + 9 碼亂數，共 10 碼）
  const formattedId = getFormattedPlatformId(userId);
  const badgeInfo = getPlatformIdBadge(formattedId);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!formattedId) return;
    try {
      navigator.clipboard.writeText(formattedId);
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
      title={`點擊複製用戶 ID: ${formattedId}（身分：${badgeInfo.label}，首字 ${badgeInfo.prefix} + 亂數 9 碼，共 10 碼）`}
      className={`inline-flex items-center gap-1.5 font-mono text-[10.5px] text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 px-2 py-0.5 rounded-md border border-stone-200/80 transition-all cursor-pointer group active:scale-95 ${className}`}
    >
      {showBadge && (
        <span className={`text-[9px] font-sans font-bold px-1 py-0.2 rounded ${badgeInfo.badgeClass}`}>
          {badgeInfo.label}
        </span>
      )}
      <span className="truncate">
        {showPrefix ? prefix : ''}#{formattedId}
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
