import React from 'react';
import { Question, ProposalUpdateLog } from '../types';
import { History, Tag, Clock, Sparkles, FileEdit, CheckCircle2, MessageSquare, Terminal } from 'lucide-react';

interface ProposalChangelogSectionProps {
  question: Question;
  canUpdate?: boolean;
  onOpenUpdateModal?: () => void;
}

export const ProposalChangelogSection: React.FC<ProposalChangelogSectionProps> = ({
  question,
  canUpdate = false,
  onOpenUpdateModal,
}) => {
  const isVibeCoding = question.postType === 'vibecoding_app' || question.category === '網站程式';
  const logs = question.updateLogs || [];

  return (
    <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-stone-50 via-white to-stone-50 border border-stone-200/90 shadow-2xs space-y-4">
      {/* 區塊標題列 */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
            isVibeCoding ? 'bg-purple-600' : 'bg-emerald-600'
          }`}>
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-sm sm:text-base text-stone-900 tracking-tight">
                📜 提案更新日誌 (Changelog)
              </h4>
              {question.currentVersion && (
                <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  目前版本 {question.currentVersion}
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">
              記載各版本時間、更新內容與提案者註記歷程，公開透明展示提案迭代演進
            </p>
          </div>
        </div>

        {canUpdate && onOpenUpdateModal && (
          <button
            type="button"
            onClick={onOpenUpdateModal}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
              isVibeCoding
                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <FileEdit className="w-3.5 h-3.5" />
            <span>更新內容與註記</span>
          </button>
        )}
      </div>

      {/* 日誌內容列表 */}
      {logs.length > 0 ? (
        <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-stone-200 before:pointer-events-none pl-1">
          {logs.map((log: ProposalUpdateLog, idx: number) => (
            <div
              key={log.id || `log-${idx}`}
              className="relative pl-7 group"
            >
              {/* 時間軸節點圖示 */}
              <div className={`absolute left-2 top-3 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs z-10 ${
                idx === 0
                  ? isVibeCoding ? 'bg-purple-600 ring-2 ring-purple-200' : 'bg-emerald-600 ring-2 ring-emerald-200'
                  : 'bg-stone-400'
              }`} />

              <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-stone-200/80 shadow-2xs space-y-2.5 transition-all hover:border-stone-300">
                {/* 日誌頂部時間、版本與作者欄 */}
                <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1 text-stone-500 font-mono font-medium text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span>{log.timestamp}</span>
                    </span>

                    {/* 版本號碼 (若是 vibecoding) */}
                    {log.version && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-200 font-mono font-black text-[11px] flex items-center gap-1">
                        <Tag className="w-3 h-3 text-purple-600" />
                        <span>{log.version}</span>
                      </span>
                    )}

                    {idx === 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold">
                        最新版本
                      </span>
                    )}
                  </div>

                  {/* 提案者名稱 */}
                  <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
                    {log.authorAvatar && (
                      <img src={log.authorAvatar} alt={log.authorName} className="w-4 h-4 rounded-full object-cover" />
                    )}
                    <span>提案者：<strong className="text-stone-800">{log.authorName}</strong></span>
                  </div>
                </div>

                {/* 更新內容 (必填核心) */}
                <div className="space-y-1">
                  <span className="text-[11px] font-extrabold text-stone-500 block">
                    【更新內容】
                  </span>
                  <p className="text-xs sm:text-sm text-stone-800 leading-relaxed whitespace-pre-line font-medium">
                    {log.content}
                  </p>
                </div>

                {/* 提案者註記 (選填項目，若有填寫則特別醒目標示) */}
                {log.note && (
                  <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950 flex items-start gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="font-bold text-[11px] text-amber-900 block">
                        提案者註記：
                      </span>
                      <p className="text-xs text-amber-900/90 leading-relaxed font-medium">
                        {log.note}
                      </p>
                    </div>
                  </div>
                )}

                {/* 變更欄位標記 */}
                {log.updatedFields && log.updatedFields.length > 0 && (
                  <div className="pt-1 flex items-center gap-1.5 flex-wrap text-[10px] text-stone-400">
                    <span>異動欄位：</span>
                    {log.updatedFields.map((field, fIdx) => (
                      <span key={fIdx} className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-medium">
                        {field}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 無日誌空狀態提示 */
        <div className="p-6 rounded-xl bg-white border border-dashed border-stone-200 text-center space-y-2">
          <div className="w-9 h-9 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-stone-700">目前尚無後續更新日誌</p>
          <p className="text-[11px] text-stone-400 max-w-sm mx-auto leading-relaxed">
            {canUpdate
              ? '身為提案者，您可以隨時點擊上方【更新內容與註記】記錄新功能上線、修復成果或達成階段里程碑！'
              : '提案者後續發布新功能、下載量突破或內容調整時，最新更新歷程將即時紀錄於此。'}
          </p>
          {canUpdate && onOpenUpdateModal && (
            <button
              type="button"
              onClick={onOpenUpdateModal}
              className="mt-2 px-3.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>撰寫第一筆更新日誌</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
