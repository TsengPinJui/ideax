import React from 'react';
import {
  X,
  Sparkles,
  Eye,
  FileText,
  Send,
  Save,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
  Tag,
  Paperclip,
  Image as ImageIcon,
} from 'lucide-react';
import {
  StarSeasonStage,
  StarSeasonTrack,
  STAR_SEASON_TRACKS,
  ProposalContentSection,
  ProposalAttachmentItem,
} from '../../types/competition';
import { ProposalRichContentDisplay } from './ProposalRichContentDisplay';

interface ProposalPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  stage: StarSeasonStage;
  track: StarSeasonTrack;
  summary: string;
  sections: ProposalContentSection[];
  plainDescription?: string;
  images: string[];
  attachments: ProposalAttachmentItem[];
  externalLink?: string;
  technicalFeasibility?: string;
  marketAnalysis?: string;
  businessModelFinancials?: string;
  teamName?: string;
  authorName?: string;
  schoolOrOrg?: string;
  onConfirmPublish: () => void;
  onSaveDraft: () => void;
  isPublishing?: boolean;
}

export const ProposalPreviewModal: React.FC<ProposalPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  stage,
  track,
  summary,
  sections,
  plainDescription,
  images,
  attachments,
  externalLink,
  technicalFeasibility,
  marketAnalysis,
  businessModelFinancials,
  teamName,
  authorName,
  schoolOrOrg,
  onConfirmPublish,
  onSaveDraft,
  isPublishing = false,
}) => {
  if (!isOpen) return null;

  const trackInfo = STAR_SEASON_TRACKS[track] || STAR_SEASON_TRACKS.ai_applications;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white border border-amber-300 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto text-stone-900">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-amber-50/70 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center shadow-2xs font-black">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-950">
                  即時預覽模式
                </span>
                <span className="text-xs text-stone-500 font-medium">
                  {stage === 'pain_point' ? '痛點需求預覽' : '創新解方提案預覽'}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-stone-950">
                提案發布效果預覽（前台展示樣式）
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
            title="關閉預覽"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Preview Body */}
        <div className="p-5 sm:p-8 overflow-y-auto space-y-6 bg-stone-50/50 flex-1">
          {/* 提案標題與賽道橫幅 */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-xl bg-amber-400 text-stone-950 text-xs font-black shadow-2xs">
                {stage === 'pain_point' ? '🔥 第一階段：痛點需求' : '💡 第二階段：創新解方'}
              </span>
              <span className="px-3 py-1 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold border border-stone-200">
                {trackInfo.name}
              </span>
              <span className="text-xs text-stone-400">
                團隊：<b>{teamName || authorName || '創星提案隊'}</b>
                {schoolOrOrg ? ` (${schoolOrOrg})` : ''}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-stone-900 tracking-tight leading-snug">
              {title || '(尚未輸入提案標題)'}
            </h1>
          </div>

          {/* 核心摘要與創新價值 */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 text-stone-900">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <h3 className="text-base sm:text-lg font-black">
                {stage === 'pain_point' ? '痛點簡述' : '核心摘要與創新價值'}
              </h3>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-stone-800 text-sm leading-relaxed font-medium">
              {summary || '(尚未填寫核心摘要與創新價值...)'}
            </div>
          </div>

          {/* 詳細內容或企畫書（多段落展示） */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-stone-900">
                <FileText className="w-5 h-5 text-amber-600" />
                <h3 className="text-base sm:text-lg font-black">
                  {stage === 'pain_point' ? '痛點深入說明' : '詳細內容或企畫書'}
                </h3>
              </div>
              <span className="text-xs text-stone-400 font-mono">
                {sections.length > 0 ? `共 ${sections.length} 個段落` : ''}
              </span>
            </div>

            {sections && sections.length > 0 ? (
              <ProposalRichContentDisplay
                sections={sections}
                attachments={attachments}
              />
            ) : (
              <div className="text-stone-700 text-sm leading-relaxed whitespace-pre-line p-4 rounded-2xl bg-stone-50">
                {plainDescription || '(尚未填寫詳細內容或企畫書)'}
              </div>
            )}
          </div>

          {/* 圖片展示區塊 (下方圖片區) */}
          {images && images.length > 0 && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2 text-stone-900">
                  <ImageIcon className="w-5 h-5 text-amber-600" />
                  <h3 className="text-base sm:text-lg font-black">圖片展示</h3>
                </div>
                <span className="text-xs text-stone-400 font-mono">共 {images.length} 張</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-video rounded-2xl overflow-hidden border border-amber-200 bg-stone-100 shadow-2xs group"
                  >
                    <img
                      src={img}
                      alt={`展示圖片 ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-mono">
                      圖片展示 #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 資料附件區展示 */}
          {attachments && attachments.length > 0 && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2 text-stone-900">
                  <Paperclip className="w-5 h-5 text-amber-600" />
                  <h3 className="text-base sm:text-lg font-black">資料附件區</h3>
                </div>
                <span className="text-xs text-stone-400 font-mono">共 {attachments.length} 個附件</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachments.map((att) => (
                  <div
                    key={att.id || att.url}
                    className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="w-5 h-5 text-amber-600 shrink-0" />
                      <span className="truncate font-bold text-xs sm:text-sm text-stone-800">
                        {att.name}
                      </span>
                    </div>
                    <span className="text-xs text-emerald-700 font-bold shrink-0">
                      ✓ 已就緒
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 補充資料區 */}
          {(technicalFeasibility || marketAnalysis || businessModelFinancials || externalLink) && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 space-y-3 shadow-xs">
              <h3 className="text-base font-black text-stone-900">補充佐證資料</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {technicalFeasibility && (
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="font-bold text-stone-700">• 技術可行性說明：</span>
                    <p className="text-stone-600 mt-1 whitespace-pre-line">{technicalFeasibility}</p>
                  </div>
                )}
                {marketAnalysis && (
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="font-bold text-stone-700">• 市場分析與定位：</span>
                    <p className="text-stone-600 mt-1 whitespace-pre-line">{marketAnalysis}</p>
                  </div>
                )}
                {businessModelFinancials && (
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 sm:col-span-2">
                    <span className="font-bold text-stone-700">• 商業模式與財務預測：</span>
                    <p className="text-stone-600 mt-1 whitespace-pre-line">{businessModelFinancials}</p>
                  </div>
                )}
                {externalLink && (
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 sm:col-span-2 flex items-center gap-2">
                    <span className="font-bold text-stone-700">• 外部專屬連結：</span>
                    <a href={externalLink} target="_blank" rel="noreferrer" className="text-amber-700 underline truncate">
                      {externalLink}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-stone-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs transition-colors cursor-pointer"
          >
            ← 返回修改表單
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                onSaveDraft();
                onClose();
              }}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4 text-amber-600" />
              <span>儲存為草稿</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onConfirmPublish();
              }}
              disabled={isPublishing}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4 text-stone-950" />
              <span>確認送出發布 →</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
