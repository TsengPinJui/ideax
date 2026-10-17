import React from 'react';
import {
  ProposalContentSection,
  ProposalAttachmentItem,
} from '../../types/competition';
import {
  FileText,
  Download,
  Paperclip,
  ExternalLink,
  ImageIcon,
  Maximize2,
} from 'lucide-react';
import { formatFileSize } from '../../utils/proposalContentHelper';

interface ProposalRichContentDisplayProps {
  sections: ProposalContentSection[];
  attachments?: ProposalAttachmentItem[];
  className?: string;
  onOpenImageModal?: (url: string) => void;
}

export const ProposalRichContentDisplay: React.FC<ProposalRichContentDisplayProps> = ({
  sections,
  attachments = [],
  className = '',
  onOpenImageModal,
}) => {
  if (!sections || sections.length === 0) {
    return (
      <div className="text-stone-400 text-xs py-4 text-center">
        尚無詳細內容或企畫書說明
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 多段落內容展示 */}
      {sections.map((sec, idx) => {
        const titleSizeClass =
          sec.titleSize === '2xl'
            ? 'text-xl sm:text-2xl font-black'
            : sec.titleSize === 'lg'
            ? 'text-base sm:text-lg font-bold'
            : 'text-lg sm:text-xl font-black'; // default 'xl'

        return (
          <div
            key={sec.id || `sec-${idx}`}
            className="p-5 sm:p-6 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-4 hover:border-amber-300/80 transition-all shadow-2xs"
          >
            {/* 段落標題（大字、粗體） */}
            <div className="flex items-center gap-2 border-b border-stone-200/60 pb-2.5">
              <span className="w-2 h-5 rounded-full bg-amber-500 shrink-0" />
              <h4
                className={`${titleSizeClass} text-stone-900 tracking-tight leading-snug`}
              >
                {sec.title || `段落 ${idx + 1}`}
              </h4>
            </div>

            {/* 段落內文（支援自訂顏色與粗體） */}
            {sec.content && (
              <div
                style={{ color: sec.textColor || '#1c1917' }}
                className={`text-sm sm:text-base leading-relaxed whitespace-pre-line ${
                  sec.isBold ? 'font-bold' : 'font-normal'
                }`}
              >
                {sec.content}
              </div>
            )}

            {/* 段落插入的大圖（投影片、海報、照片與圖片說明） */}
            {sec.images && sec.images.length > 0 && (
              <div className="space-y-4 pt-2">
                {sec.images.map((imgItem, imgIdx) => (
                  <figure
                    key={imgItem.id || `sec-img-${imgIdx}`}
                    className="rounded-2xl overflow-hidden border border-amber-200/70 bg-white shadow-xs group"
                  >
                    <div className="relative bg-stone-900/5 aspect-video sm:aspect-16/10 flex items-center justify-center overflow-hidden">
                      <img
                        src={imgItem.url}
                        alt={imgItem.caption || `段落大圖 ${imgIdx + 1}`}
                        className="w-full h-full object-contain group-hover:scale-102 transition-transform duration-300"
                        loading="lazy"
                      />
                      {onOpenImageModal && (
                        <button
                          type="button"
                          onClick={() => onOpenImageModal(imgItem.url)}
                          className="absolute top-2 right-2 p-2 rounded-xl bg-stone-900/70 hover:bg-stone-900 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
                          title="查看大圖"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {imgItem.caption && (
                      <figcaption className="p-3 bg-amber-50/50 border-t border-amber-100 text-xs sm:text-sm text-stone-700 font-medium flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{imgItem.caption}</span>
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* 資料附件區展示 (若有附件) */}
      {attachments.length > 0 && (
        <div className="p-5 sm:p-6 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-amber-950 text-sm sm:text-base flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-amber-700" />
              <span>企劃書與資料附件清單 ({attachments.length})</span>
            </h4>
            <span className="text-xs text-amber-800 font-bold">點選可即時下載檢閱</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {attachments.map((att) => (
              <a
                key={att.id || att.url}
                href={att.url}
                download={att.name}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl bg-white hover:bg-stone-50 border border-amber-200 text-stone-900 transition-all flex items-center justify-between gap-3 group shadow-2xs hover:shadow-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-xs sm:text-sm truncate text-stone-900 group-hover:text-amber-800 transition-colors">
                      {att.name}
                    </div>
                    <div className="text-[10px] text-stone-400">
                      {formatFileSize(att.size)}
                    </div>
                  </div>
                </div>

                <div className="p-1.5 rounded-lg bg-stone-100 group-hover:bg-amber-400 group-hover:text-stone-950 text-stone-600 transition-colors shrink-0">
                  <Download className="w-3.5 h-3.5" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
