import React, { useState } from 'react';
import { Coins, FileDown, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { exportProjectPlan, ProjectPlanExportError } from '../services/projectPlanExport';
import type { ProjectPlanSource } from '../services/projectPlanExport';

interface ProjectPlanExportButtonProps {
  project: ProjectPlanSource;
  compact?: boolean;
}

export const ProjectPlanExportButton: React.FC<ProjectPlanExportButtonProps> = ({ project, compact = false }) => {
  const { currentUser, setCurrentUser, setAvailableUsers, openAuthModal } = useApp();
  const [isExporting, setIsExporting] = useState(false);

  const updateBalance = (balance: number) => {
    setCurrentUser((prev) => prev.id === currentUser.id ? { ...prev, balance } : prev);
    setAvailableUsers((prev) => prev.map((user) => user.id === currentUser.id ? { ...user, balance } : user));
  };

  const handleExport = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (currentUser.id === 'user-guest') {
      openAuthModal('register', 'email');
      return;
    }
    const confirmed = window.confirm(
      '本次匯出將扣除 50 平台點，並把此專案資料送交 IdeaX 內建 Gemini 3.8 Flash 整理。企劃書只供這次下載，IdeaX 不會保存生成文件。確定匯出嗎？'
    );
    if (!confirmed) return;
    setIsExporting(true);
    try {
      const result = await exportProjectPlan(project);
      updateBalance(result.balance);
      window.alert(`企劃書已下載，剩餘 ${result.balance.toLocaleString()} 平台點。`);
    } catch (error) {
      if (error instanceof ProjectPlanExportError && typeof error.balance === 'number') updateBalance(error.balance);
      window.alert(error instanceof Error ? error.message : '企劃書匯出失敗，請稍後再試。');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isExporting}
      aria-busy={isExporting}
      className={compact
        ? 'inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-900 hover:bg-amber-100 disabled:cursor-wait disabled:opacity-60'
        : 'inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 active:bg-amber-200 disabled:cursor-wait disabled:opacity-60'}
      title="匯出專案企劃書，每次 50 平台點"
    >
      {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      <span aria-live="polite">{isExporting ? '企劃書生成中…' : '匯出企劃書'}</span>
      <span className="inline-flex items-center gap-0.5 text-amber-700"><Coins className="h-3.5 w-3.5" />50 點</span>
    </button>
  );
};
