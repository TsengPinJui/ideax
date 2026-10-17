import React, { useState } from 'react';
import { Question } from '../types';
import { GitBranch, Clock, ChevronDown, ChevronUp, FileEdit } from 'lucide-react';

interface ProposalChangelogSectionProps {
  question: Question;
  canEdit?: boolean;
  canUpdate?: boolean;
  onOpenUpdateModal?: () => void;
}

export const ProposalChangelogSection: React.FC<ProposalChangelogSectionProps> = ({
  question,
  canEdit = false,
  canUpdate = false,
  onOpenUpdateModal,
}) => {
  const rawLogs = question.updateLogs || [];
  const [expanded, setExpanded] = useState(true);
  const [expandedNoteIds, setExpandedNoteIds] = useState<Record<string, boolean>>({});
  const allowEdit = Boolean(canEdit || canUpdate);

  const toggleNoteExpand = (key: string) => {
    setExpandedNoteIds((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const displayLogs =
    rawLogs.length > 0
      ? rawLogs
      : [
          {
            id: `init-${question.id}`,
            version: question.currentVersion || (question.postType === 'vibecoding_app' ? 'v1.0.0' : 'v1.0'),
            timestamp: (question.createdAt || '').split('T')[0] || '初版發布',
            content: question.postType === 'vibecoding_app' ? '初版作品發布上架' : '初版提案內容發布',
            updatedFields: ['初版發布'],
            note: undefined,
          },
        ];

  return (
    <div className="mt-5 rounded-xl border border-stone-200 bg-white overflow-hidden">
      {/* Header Bar */}
      <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-xs sm:text-sm font-bold text-stone-900">
              版本更新紀錄
            </h4>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[11px] font-bold">
              {question.currentVersion || displayLogs[0]?.version || 'v1.0.0'}
            </span>
            <span className="text-xs text-stone-500">
              ({displayLogs.length} 筆)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {allowEdit && onOpenUpdateModal && (
            <button
              type="button"
              onClick={onOpenUpdateModal}
              className="px-3 py-1.5 rounded-lg border border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-600 hover:text-white active:bg-emerald-700 active:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>發布新版本</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded-md text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 transition-colors cursor-pointer"
            title={expanded ? '收合紀錄' : '展開紀錄'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Body Timeline */}
      {expanded && (
        <div className="p-4">
          <div className="relative pl-4 border-l border-stone-200 space-y-4">
            {displayLogs.map((log, index) => {
              const isLatest = index === 0;
              const logKey = String(log.id || index);
              const isNoteExpanded = Boolean(expandedNoteIds[logKey]);
              const hasNote = Boolean(log.note && log.note.trim());

              return (
                <div key={logKey} className="relative">
                  <div
                    className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 ${
                      isLatest
                        ? 'bg-emerald-600 border-emerald-200'
                        : 'bg-stone-300 border-white'
                    }`}
                  />

                  <div className="p-3 rounded-lg border border-stone-200 bg-stone-50/60 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {log.version && (
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono text-[11px] font-bold ${
                              isLatest
                                ? 'bg-emerald-600 text-white'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}
                          >
                            {log.version}
                          </span>
                        )}
                        {isLatest && (
                          <span className="text-[11px] font-bold text-emerald-700">
                            最新
                          </span>
                        )}
                        {/* 更新摘要：直接顯示在版本紀錄主列 */}
                        <span className="text-xs sm:text-sm font-bold text-stone-900">
                          {log.content}
                        </span>
                        {log.updatedFields && log.updatedFields.length > 0 && (
                          <span className="text-[11px] text-stone-500">
                            （更新項目：{log.updatedFields.join('、')}）
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-[11px] text-stone-400 font-mono">
                          <Clock className="w-3 h-3" />
                          <span>{log.timestamp}</span>
                        </div>

                        {hasNote && (
                          <button
                            type="button"
                            onClick={() => toggleNoteExpand(logKey)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 text-[11px] font-bold text-emerald-700 transition-colors cursor-pointer"
                          >
                            <span>{isNoteExpanded ? '收合內容詳述' : '展開內容詳述'}</span>
                            {isNoteExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 內容詳述：於版本下以預設收合、點擊展開的方式顯示 */}
                    {hasNote && isNoteExpanded && (
                      <div className="pt-2 mt-1 border-t border-stone-200/80">
                        <div className="p-2.5 rounded-lg bg-white border border-stone-200 text-xs text-stone-700 leading-relaxed whitespace-pre-line">
                          {log.note}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
