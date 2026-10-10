import React, { useState } from 'react';
import { ProposalAttachmentItem } from '../../types/competition';
import {
  Paperclip,
  Upload,
  FileText,
  FileArchive,
  FileSpreadsheet,
  Download,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  FilePlus,
} from 'lucide-react';
import { formatFileSize } from '../../utils/proposalContentHelper';
import { uploadProposalAttachment } from '../../services/competitionClientService';

interface ProposalAttachmentsManagerProps {
  attachments: ProposalAttachmentItem[];
  onChange: (attachments: ProposalAttachmentItem[]) => void;
  showToast?: (msg: string) => void;
}

export const ProposalAttachmentsManager: React.FC<ProposalAttachmentsManagerProps> = ({
  attachments,
  onChange,
  showToast,
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newItems: ProposalAttachmentItem[] = [];

    try {
      for (const file of Array.from(files)) {
        if (file.size > 25 * 1024 * 1024) {
          showToast?.(`檔案「${file.name}」超過 25MB 上限`);
          continue;
        }

        try {
          const res = await uploadProposalAttachment(file);
          if (res && res.url) {
            newItems.push({
              id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: file.name,
              url: res.url,
              size: file.size,
              mime: file.type || 'application/octet-stream',
              uploadedAt: new Date().toISOString(),
            });
          }
        } catch {
          // 本地降級方案：透過 FileReader 產生本地下載 URL
          const reader = new FileReader();
          await new Promise<void>((resolve) => {
            reader.onload = (ev) => {
              if (ev.target?.result) {
                newItems.push({
                  id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  name: file.name,
                  url: ev.target.result as string,
                  size: file.size,
                  mime: file.type || 'application/octet-stream',
                  uploadedAt: new Date().toISOString(),
                });
              }
              resolve();
            };
            reader.onerror = () => resolve();
            reader.readAsDataURL(file);
          });
        }
      }

      if (newItems.length > 0) {
        onChange([...attachments, ...newItems]);
        showToast?.(`已成功加入 ${newItems.length} 個企劃書與資料附件`);
      }
    } catch (err: any) {
      showToast?.(err.message || '上傳附件失敗');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemove = (id: string) => {
    onChange(attachments.filter((a) => a.id !== id));
    showToast?.('已移除此資料附件');
  };

  const handleInsertSampleDoc = () => {
    const sampleItem: ProposalAttachmentItem = {
      id: `att-sample-${Date.now()}`,
      name: 'IdeaX創星季_完整創新解方企劃書_v1.0.pdf',
      url: 'https://raw.githubusercontent.com/mozilla/pdf.js/master/examples/learning/helloworld.pdf',
      size: 1420000,
      mime: 'application/pdf',
      uploadedAt: new Date().toISOString(),
    };
    onChange([...attachments, sampleItem]);
    showToast?.('已加入示範企劃書 PDF 附件');
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      return <FileText className="w-5 h-5 text-rose-600" />;
    }
    if (ext === 'ppt' || ext === 'pptx') {
      return <FileText className="w-5 h-5 text-amber-600" />;
    }
    if (ext === 'zip' || ext === 'rar' || ext === '7z') {
      return <FileArchive className="w-5 h-5 text-purple-600" />;
    }
    if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    }
    return <FileText className="w-5 h-5 text-blue-600" />;
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/50 border border-amber-300 space-y-3.5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="font-black text-stone-900 text-sm flex items-center gap-1.5">
            <Paperclip className="w-4 h-4 text-amber-600" />
            <span>資料附件區（提案完整企劃書、簡報、規格書與補充檔案）</span>
          </h4>
          <p className="text-[11px] text-stone-600 mt-0.5">
            除了下方「圖片展示」照片區外，您可在此上傳多個文件檔案（PDF、PPT/PPTX、DOC/DOCX、ZIP，單檔限 25MB），供評審團深入檢閱。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleInsertSampleDoc}
            className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-stone-700 text-[11px] font-bold cursor-pointer transition-colors"
          >
            帶入範例企劃書 PDF
          </button>
          <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-amber-200 text-amber-950">
            {attachments.length} 個附件
          </span>
        </div>
      </div>

      {/* 已上傳附件清單 */}
      {attachments.length > 0 && (
        <div className="space-y-2 pt-1">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="p-3 rounded-xl bg-white border border-amber-200 shadow-2xs flex items-center justify-between gap-3 group hover:border-amber-400 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-center shrink-0">
                  {getFileIcon(att.name)}
                </div>
                <div className="truncate">
                  <div className="font-bold text-xs sm:text-sm text-stone-900 truncate">
                    {att.name}
                  </div>
                  <div className="text-[10px] text-stone-400 flex items-center gap-2 font-mono">
                    <span>{formatFileSize(att.size)}</span>
                    {att.uploadedAt && (
                      <span>· {new Date(att.uploadedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={att.url}
                  download={att.name}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-950 transition-colors cursor-pointer"
                  title="下載檢視此附件"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => handleRemove(att.id)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="刪除此附件"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 上傳觸發區 */}
      <div>
        <label className="flex items-center justify-center gap-2 p-3.5 border-2 border-dashed border-amber-300 hover:border-amber-500 rounded-xl bg-white hover:bg-amber-100/40 text-stone-700 cursor-pointer transition-all">
          <Upload className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-bold">
            {isUploading
              ? '處理上傳中...'
              : '選擇電腦或手機中的企劃書、簡報或佐證附件（可多選上傳）'}
          </span>
          <input
            type="file"
            multiple
            accept=".pdf,.ppt,.pptx,.doc,.docx,.zip,.rar,.xlsx"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
};
