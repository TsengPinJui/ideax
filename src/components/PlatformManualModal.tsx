import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  Download,
  Upload,
  Plus,
  X,
  FileText,
  Copy,
  Check,
  Trash2,
  Sparkles,
  UserCheck,
  Sparkle,
  Scale,
  Cpu,
  Wrench,
  ArrowLeft,
  Calendar,
  Layers,
  ChevronRight,
  ShieldAlert,
  Info,
  ExternalLink,
} from 'lucide-react';
import {
  PlatformDocument,
  PlatformDocumentModule,
  DEFAULT_PLATFORM_DOCUMENTS,
} from '../data/platformManualData';
import {
  getPlatformDocuments,
  savePlatformDocuments,
  getCalculatedVersionState,
  getStandardFolderName,
  formatDocumentToMarkdown,
  downloadAllDocumentsZip,
  downloadDocumentAsWord,
  downloadDocumentAsPdf,
  VersionState,
} from '../services/platformManualService';

interface PlatformManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const PlatformManualModal: React.FC<PlatformManualModalProps> = ({
  isOpen,
  onClose,
  showToast,
}) => {
  const [documents, setDocuments] = useState<PlatformDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [versionState, setVersionState] = useState<VersionState>(getCalculatedVersionState());
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocSubtitle, setNewDocSubtitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const docs = getPlatformDocuments();
      setDocuments(docs);
      setVersionState(getCalculatedVersionState());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentDoc = documents.find((d) => d.id === selectedDocId);
  const folderName = getStandardFolderName(versionState);

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      await downloadAllDocumentsZip(documents, versionState);
      if (showToast) showToast(`已成功打包下載「${folderName}.zip」！`, 'success');
    } catch (e) {
      console.error(e);
      if (showToast) showToast('ZIP 打包失敗，請重試', 'error');
    } finally {
      setIsZipping(false);
    }
  };

  const handleCopyText = (doc: PlatformDocument) => {
    const md = formatDocumentToMarkdown(doc, versionState);
    navigator.clipboard.writeText(md);
    setCopiedDocId(doc.id);
    if (showToast) showToast(`已複製【${doc.title}】全文 Markdown`, 'success');
    setTimeout(() => setCopiedDocId(null), 2000);
  };

  const handleDownloadWord = (doc: PlatformDocument) => {
    downloadDocumentAsWord(doc, versionState);
    if (showToast) showToast(`已下載【${doc.title}】Word 格式檔案`, 'success');
  };

  const handleDownloadPdf = (doc: PlatformDocument) => {
    downloadDocumentAsPdf(doc, versionState);
    if (showToast) showToast(`已下載【${doc.title}】PDF 格式檔案`, 'success');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      const codeNumber = String(documents.length).padStart(2, '0');

      const newDoc: PlatformDocument = {
        id: `custom-doc-${Date.now()}`,
        code: `${codeNumber}_${cleanName}`,
        title: cleanName,
        subtitle: `自訂上傳檔案 (${file.name})`,
        category: 'custom',
        icon: 'FileText',
        color: 'amber',
        moduleCount: 1,
        isCustom: true,
        fileType: ext,
        fileSize: `${(file.size / 1024).toFixed(1)} KB`,
        fileData: content,
        createdAt: versionState.lastReleaseDate,
        updatedAt: `${versionState.lastReleaseDate} ${versionState.lastReleaseTime}`,
        modules: [
          {
            id: `m-${Date.now()}-1`,
            title: `上傳文件內容：${file.name}`,
            summary: `檔案格式：${ext.toUpperCase()}，大小：${(file.size / 1024).toFixed(1)} KB`,
            content: typeof content === 'string' && !content.startsWith('data:') ? content : `[二進位或附件檔案已安全存儲，支援隨時打包下載]`,
          },
        ],
      };

      const updated = [...documents, newDoc];
      setDocuments(updated);
      savePlatformDocuments(updated);
      if (showToast) showToast(`成功上傳檔案「${file.name}」至內部清單！`, 'success');
    };

    if (file.name.match(/\.(txt|md|json|csv|html)$/i)) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;

    const codeNumber = String(documents.length).padStart(2, '0');
    const newDoc: PlatformDocument = {
      id: `custom-doc-${Date.now()}`,
      code: `${codeNumber}_${newDocTitle.trim()}`,
      title: `${codeNumber}_${newDocTitle.trim()}`,
      subtitle: newDocSubtitle.trim() || '自訂內部規格與管理模組',
      category: 'custom',
      icon: 'FileText',
      color: 'blue',
      moduleCount: 1,
      isCustom: true,
      createdAt: versionState.lastReleaseDate,
      updatedAt: `${versionState.lastReleaseDate} ${versionState.lastReleaseTime}`,
      modules: [
        {
          id: `m-${Date.now()}-1`,
          title: newDocTitle.trim(),
          summary: newDocSubtitle.trim(),
          content: newDocContent.trim() || '暫無詳細內容。',
        },
      ],
    };

    const updated = [...documents, newDoc];
    setDocuments(updated);
    savePlatformDocuments(updated);
    setIsCreateModalOpen(false);
    setNewDocTitle('');
    setNewDocSubtitle('');
    setNewDocContent('');
    if (showToast) showToast(`成功建立文件「${newDoc.title}」！`, 'success');
  };

  const handleDeleteDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = documents.find((d) => d.id === id);
    if (!target) return;
    if (window.confirm(`確定要刪除「${target.title}」嗎？`)) {
      const updated = documents.filter((d) => d.id !== id);
      setDocuments(updated);
      savePlatformDocuments(updated);
      if (selectedDocId === id) setSelectedDocId(null);
      if (showToast) showToast(`已刪除「${target.title}」`, 'info');
    }
  };

  const renderIcon = (iconName: string, color: string) => {
    const iconClass = `w-5 h-5 ${
      color === 'amber'
        ? 'text-amber-600'
        : color === 'blue'
        ? 'text-blue-600'
        : color === 'emerald'
        ? 'text-emerald-600'
        : color === 'purple'
        ? 'text-purple-600'
        : color === 'rose'
        ? 'text-rose-600'
        : 'text-stone-600'
    }`;

    switch (iconName) {
      case 'Sparkles':
        return <Sparkles className={iconClass} />;
      case 'UserCheck':
        return <UserCheck className={iconClass} />;
      case 'Sparkle':
        return <Sparkle className={iconClass} />;
      case 'Scale':
        return <Scale className={iconClass} />;
      case 'Cpu':
        return <Cpu className={iconClass} />;
      case 'Wrench':
        return <Wrench className={iconClass} />;
      default:
        return <FileText className={iconClass} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Hidden File Input for Upload */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".docx,.doc,.md,.txt,.pdf,.csv,.json,.xlsx"
          onChange={handleFileUpload}
        />

        {/* Header Section */}
        <div className="p-4 sm:p-6 border-b border-stone-100 bg-gradient-to-b from-amber-50/50 to-white flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <Folder className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                  平台內部清單
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-stone-900 text-amber-400 font-mono text-xs font-bold shadow-2xs">
                  {versionState.currentVersion}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-stone-500 font-medium flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-amber-100/80 text-amber-900 font-bold">
                  {versionState.lastReleaseDate}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                  共 {documents.length} 份文件檔案
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-stone-600">
                <span className="text-stone-400">資料夾名稱：</span>
                <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 select-all">
                  {folderName}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                可自由在線查閱、上傳新增檔案、手動建立文件或刪除不需要的檔案。
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
            title="關閉清單"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Actions Bar (Zip / Upload / New Doc) */}
        <div className="px-4 sm:px-6 py-3 bg-stone-50/80 border-b border-stone-200/80 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isZipping ? '打包中...' : '下載整個資料夾 (.zip)'}</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-stone-50 text-stone-800 font-bold text-xs border border-stone-200 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-stone-500" />
              <span>上傳檔案</span>
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增文件</span>
            </button>
          </div>

          {selectedDocId && (
            <button
              onClick={() => setSelectedDocId(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-stone-600 hover:bg-stone-200/70 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回目錄</span>
            </button>
          )}
        </div>

        {/* Content Body: Catalog View vs Detail View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {!selectedDocId ? (
            /* Catalog List View */
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1 text-xs font-bold text-stone-500">
                <span className="flex items-center gap-1.5">
                  <Folder className="w-4 h-4 text-amber-500" />
                  檔案目錄（點擊切換查閱）
                </span>
                <span
                  onClick={() => fileInputRef.current?.click()}
                  className="text-amber-600 hover:text-amber-700 cursor-pointer flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  快速上傳
                </span>
              </div>

              <div className="grid gap-2.5">
                {documents.map((doc) => {
                  const isSelected = selectedDocId === doc.id;
                  const isSpecialVersion = doc.code === '00_版本資訊';

                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDocId(doc.id)}
                      className={`group p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSpecialVersion
                          ? 'bg-amber-50/60 hover:bg-amber-50 border-amber-300 ring-1 ring-amber-300/40'
                          : 'bg-white hover:bg-stone-50 border-stone-200 hover:border-stone-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isSpecialVersion
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-stone-100 group-hover:bg-stone-200/80 transition-colors'
                          }`}
                        >
                          {renderIcon(doc.icon, doc.color)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm sm:text-base font-bold text-stone-900 truncate">
                              {doc.code}
                            </h3>
                            {doc.isCustom && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                自訂
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-500 truncate mt-0.5">
                            {doc.modules.length} 個模組 • {doc.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {doc.isCustom && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteDoc(doc.id, e)}
                            className="p-2 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="刪除此檔案"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Document Detail View */
            currentDoc && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Document Top Header & Action Controls */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                      {currentDoc.code.slice(0, 2)} • 規格模組
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-stone-900 mt-0.5">
                      【{currentDoc.title.replace(/^[0-9]+_/, '')}】 與維護規則
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {currentDoc.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleCopyText(currentDoc)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-200 font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                      title="複製全文 Markdown"
                    >
                      {copiedDocId === currentDoc.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-stone-500" />
                      )}
                      <span>{copiedDocId === currentDoc.id ? '已複製' : '複製文字'}</span>
                    </button>

                    <button
                      onClick={() => handleDownloadWord(currentDoc)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                      title="下載 Word (.doc) 檔"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>下載 Word 檔</span>
                    </button>

                    <button
                      onClick={() => handleDownloadPdf(currentDoc)}
                      className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                      title="下載 PDF 檔"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>下載 PDF 檔</span>
                    </button>

                    {currentDoc.isCustom && (
                      <button
                        onClick={(e) => handleDeleteDoc(currentDoc.id, e)}
                        className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                        title="刪除此檔案"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Special Production Version Card for 00_版本資訊 */}
                {currentDoc.code === '00_版本資訊' && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                    <span className="text-xs font-bold text-amber-900 block">
                      當前運行版本 (Production)
                    </span>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="px-3 py-1 rounded-xl bg-stone-900 text-amber-400 font-mono font-black text-sm shadow-xs">
                        序號 {versionState.seqNumber}
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-stone-950 font-mono">
                        {versionState.currentVersion}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-xs text-stone-600 font-medium">
                        最後更新：{versionState.lastReleaseDate} {versionState.lastReleaseTime}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-amber-200/60 flex items-center gap-2 text-xs text-emerald-800 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>單日 0.2.0 與字母單獨記數規範運作中</span>
                    </div>
                  </div>
                )}

                {/* Modules List */}
                <div className="space-y-4">
                  {currentDoc.modules.map((mod, idx) => (
                    <div
                      key={mod.id}
                      className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-amber-500 text-stone-950 font-black text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <h4 className="text-base font-bold text-stone-900">
                          {mod.title}
                        </h4>
                      </div>

                      {mod.summary && (
                        <p className="text-xs text-stone-500 italic pl-8">
                          {mod.summary}
                        </p>
                      )}

                      <div className="pl-8 pt-2 text-xs sm:text-sm text-stone-700 leading-relaxed space-y-2 border-t border-stone-100 whitespace-pre-line font-sans">
                        {mod.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-stone-800">
              {versionState.currentVersion} ({versionState.seqNumber})
            </span>
            <span>• {versionState.lastReleaseDate}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-900 text-white hover:bg-stone-800 font-bold transition-all cursor-pointer"
          >
            關閉
          </button>
        </div>
      </div>

      {/* Manual Create Document Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-60 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-stone-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-500" />
                新增內部文件
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  文件標題
                </label>
                <input
                  type="text"
                  required
                  placeholder="例：06_行銷推廣策略指引"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  文件摘要或副標題
                </label>
                <input
                  type="text"
                  placeholder="例：涵蓋社群裂變、KOL 合作與大使方案"
                  value={newDocSubtitle}
                  onChange={(e) => setNewDocSubtitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  詳細內容 (支援 Markdown)
                </label>
                <textarea
                  rows={5}
                  placeholder="請輸入模組章節與規範內容..."
                  value={newDocContent}
                  onChange={(e) => setNewDocContent(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold hover:bg-stone-200 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black shadow-xs cursor-pointer"
                >
                  儲存並建立
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
